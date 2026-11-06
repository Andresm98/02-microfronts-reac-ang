# shell — host de Module Federation

Aplicación contenedora (React 19 + TypeScript + Vite 8 + react-router 7) que carga en runtime los micro-frontends
`mf_clientes` (Vue) y `mf_ventas` (React) con `@module-federation/vite`. La shell **no comparte** react/vue con los
remotes: cada remote trae su framework y sólo expone el contrato agnóstico `./mount`:

```ts
mount(el: HTMLElement, props?: { basePath?: string }): void
unmount(el: HTMLElement): void
```

## Rutas

| Ruta          | Contenido                                     |
|---------------|-----------------------------------------------|
| `/`           | Dashboard con ambos micros lado a lado        |
| `/clientes/*` | `mf_clientes` a pantalla completa             |
| `/ventas/*`   | `mf_ventas` a pantalla completa               |
| `*`           | 404                                           |

La cabecera muestra el cliente seleccionado (`clientes:seleccionado`) y un toast al recibir `ventas:creada`.

## Estructura

```
src/
  contracts/events.ts        tipos del contrato de eventos (CONTRACTS.md)
  domain/remote-app.ts       RemoteApp, RemoteModule (mount/unmount), guardas
  application/               puertos (RemoteLoader, EventBus) y registro de remotes
  infrastructure/            adaptadores: loader Module Federation (+ caché/reintento), bus sobre window
  presentation/              Layout, Header, páginas, RemoteMount, ErrorBoundary, fallback
  bootstrap.tsx              composition root (elige adaptadores)
  main.ts                    import('./bootstrap') asíncrono para que MF inicialice antes
```

`RemoteMount` pide el módulo al `RemoteLoader`, llama a `mount(el, { basePath })` en un efecto y a `unmount(el)` en
el cleanup. Si el remote no responde (remoteEntry caído, módulo inválido o `mount` lanza) muestra un fallback
amigable con botón **Reintentar**; el resto de la app sigue funcionando.

## Variables de entorno (se resuelven en dev/build)

| Variable               | Por defecto                              |
|------------------------|------------------------------------------|
| `VITE_MF_CLIENTES_URL` | `http://localhost:5001/remoteEntry.js`   |
| `VITE_MF_VENTAS_URL`   | `http://localhost:5002/remoteEntry.js`   |

Copia `.env.example` a `.env` para cambiarlas. En Docker llegan como `ARG` del Dockerfile (cambiarlas implica rebuild).

## Scripts

```bash
npm install
npm run dev       # http://localhost:5000 (strictPort); los remotes deben estar en 5001/5002
npm run build     # tsc -b + vite build -> dist/
npm run preview   # sirve dist/ en 5000
npm test          # vitest run (RemoteMount con loader falso, bus de eventos, loader, Header)
```

## Docker

```bash
docker compose up -d --build   # http://localhost:5000 (nginx con fallback SPA)
```
