# vue-performance-test

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

```
vue-performance-test
├─ .editorconfig
├─ .prettierrc.json
├─ docker-compose.yml
├─ Dockerfile
├─ eslint.config.js
├─ index.html
├─ jsconfig.json
├─ package-lock.json
├─ package.json
├─ README.md
├─ src
│  ├─ App.vue
│  ├─ components
│  │  ├─ InteractionTest.vue
│  │  ├─ RenderTest.vue
│  │  └─ UpdateTest.vue
│  ├─ main.js
│  └─ utils
│     └─ perf.js
├─ tests
│  └─ e2e
│     ├─ chartGenerator.js
│     ├─ reportGenerator.js
│     └─ runner.js
└─ vite.config.js

```