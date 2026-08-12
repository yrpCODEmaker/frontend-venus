# Frontend Venus 🚀

Un proyecto frontend moderno construido con **React** y **Vite**, enfocado en proporcionar una experiencia de desarrollo rápida y eficiente.

## 📋 Descripción

Este proyecto utiliza las tecnologías más modernas para crear aplicaciones web de alto rendimiento:
- **React**: Biblioteca JavaScript para construir interfaces de usuario
- **Vite**: Herramienta de construcción rápida y moderna
- **HMR (Hot Module Replacement)**: Recarga en caliente durante el desarrollo

## 🛠️ Composición del Proyecto

- **JavaScript**: 73.1%
- **CSS**: 26.8%
- **HTML**: 0.1%

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js (versión 16 o superior)
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/yrpCODEmaker/frontend-venus.git
cd frontend-venus

# Instalar dependencias
npm install
```

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev
```

El servidor estará disponible en `http://localhost:5173` con HMR habilitado.

### Construcción para Producción

```bash
# Crear build optimizado
npm run build

# Previsualizar build
npm run preview
```

## 📦 Plugins Disponibles

El proyecto incluye dos opciones de plugins oficiales de Vite:

- **[@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)** - Utiliza [Oxc](https://oxc.rs) (configuración por defecto)
- **[@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc)** - Utiliza [SWC](https://swc.rs/)

## ⚙️ Configuración de Oxlint

El proyecto incluye reglas de linting con Oxlint para garantizar la calidad del código. Para expandir la configuración:

```bash
# Ejecutar linter
npm run lint
```

Para aplicaciones en producción, se recomienda usar **TypeScript** con reglas de linting conscientes de tipos.

## 📚 Estructura del Proyecto

```
frontend-venus/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── components/
├── public/
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## 🔄 React Compiler

El React Compiler no está habilitado por defecto en esta plantilla debido a su impacto en el rendimiento de desarrollo y construcción. Para agregarlo, consulta la [documentación oficial](https://react.dev/learn/react-compiler/installation).

## 📖 Recursos Útiles

- [Documentación de React](https://react.dev)
- [Documentación de Vite](https://vitejs.dev)
- [Guía de Oxc](https://oxc.rs)

## 👤 Autor

[yrpCODEmaker](https://github.com/yrpCODEmaker)

## 📄 Licencia

Este proyecto está disponible bajo la licencia MIT.

---

**¡Feliz codificación!** 💻✨
