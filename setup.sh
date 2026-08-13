#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/venus-frontend"
REPO_URL=https://github.com/yrpCODEmaker/frontend-venus.git
BRANCH="${BRANCH:-main}"
IMAGE_NAME="venus-frontend"
CONTAINER_NAME="venus-frontend"
HOST_PORT="${HOST_PORT:-8080}"
CONTAINER_PORT="${CONTAINER_PORT:-80}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://api.venusmuebles.com/api/v1}"

echo "[1/6] Instalando dependencias del sistema..."
apt-get update
apt-get install -y ca-certificates curl git docker.io >/dev/null 2>&1 || true

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker no quedó instalado correctamente."
  exit 1
fi

systemctl enable --now docker >/dev/null 2>&1 || true

echo "[2/6] Preparando directorio de la app..."
mkdir -p "$(dirname "$APP_DIR")"

if [ -d "$APP_DIR/.git" ]; then
  echo "Repo existente encontrado. Actualizando..."
  git -C "$APP_DIR" fetch --all --tags
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  echo "Clonando repositorio..."
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

echo "[3/6] Generando configuración de producción..."
cat > .env.production <<EOF
VITE_API_BASE_URL=${VITE_API_BASE_URL}
EOF

echo "[4/6] Construyendo imagen Docker..."
docker build \
  --build-arg VITE_API_BASE_URL="${VITE_API_BASE_URL}" \
  -t "$IMAGE_NAME" \
  .

echo "[5/6] Reiniciando contenedor..."
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d \
  --restart unless-stopped \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  "$IMAGE_NAME"

echo "[6/6] Verificando estado..."
docker ps --filter "name=$CONTAINER_NAME"

echo ""
echo "✅ Frontend desplegado correctamente."
echo "Acceso local del VPS: http://localhost:${HOST_PORT}"
echo "API configurada: ${VITE_API_BASE_URL}"
