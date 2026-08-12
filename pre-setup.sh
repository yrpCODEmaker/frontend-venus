#!/usr/bin/env bash
set -euo pipefail

echo "[1/5] Actualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  build-essential \
  gnupg \
  software-properties-common

if ! command -v node >/dev/null 2>&1; then
  echo "[2/5] Instalando Node.js 20 LTS..."
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  apt-get install -y nodejs
else
  echo "[2/5] Node.js ya está instalado."
fi

echo "[3/5] Verificando versiones..."
node -v
npm -v

echo "[4/5] Instalando Docker CE (si no existe)..."
if ! command -v docker >/dev/null 2>&1; then
  apt-get install -y --no-install-recommends docker.io
  systemctl enable --now docker
else
  echo "Docker ya está instalado."
fi

echo "[5/5] Instalando dependencias globales necesarias..."
npm install -g npm@latest

printf "\n✅ Entorno de servidor listo.\n"
printf "Ahora puedes clonar el repo y ejecutar:\n"
printf "  npm install\n"
printf "  npm run build\n"
printf "  ./setup.sh\n"
