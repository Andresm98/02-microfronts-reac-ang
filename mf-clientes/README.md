# mf-clientes

Microfrontend **Vue 3 + TypeScript + Vite** para la gestión de clientes. Se publica como *remote* de
Module Federation (`mf_clientes`) y también funciona de forma aislada (standalone).

## Funcionalidad

- Tabla de clientes con estados de carga, vacío y error (con reintento).
- Formulario de alta/edición con validación en cliente y errores del backend (409 → "Ya existe un cliente con ese email").
- Eliminación con confirmación en línea.
- Acción **Seleccionar**: resalta la fila y emite `clientes:seleccionado` `{ id, nombre }` en `window`.

## Scripts

| Script            | Descripción                                         |
|-------------------|-----------------------------------------------------|
| `npm run dev`     | Servidor de desarrollo en http://localhost:5001 (strictPort, CORS) |
| `npm run build`   | `vue-tsc -b` + `vite build` → `dist/` con `remoteEntry.js` en la raíz |
| `npm run preview` | Sirve `dist/` en http://localhost:5001              |
| `npm test`        | Vitest (casos de uso, eventos, gateway HTTP, componentes) |

## Variables de entorno (build)

| Variable        | Por defecto              | Uso |
|-----------------|--------------------------|-----|
| `VITE_API_URL`  | `http://localhost:3001`  | Base del API back-clientes |
| `MF_PUBLIC_URL` | `http://localhost:5001/` | (opcional) origen público del remote; se usa como `base` para que los chunks/CSS carguen con URL absoluta desde la shell |

Ver `.env.example`.

## Module Federation

- `name: 'mf_clientes'`, `filename: 'remoteEntry.js'`, `exposes: { './mount': './src/bootstrap.ts' }`.
- Vue **no** se comparte: el remote es autocontenido.
- El host lo consume como remote `type: 'module'` e importa `mf_clientes/mount`:

```ts
const { mount, unmount } = await import('mf_clientes/mount');
mount(el, { basePath: '/clientes' });
// ...
unmount(el);
```

## Arquitectura (Clean)

```
src/
├─ domain/          Cliente, validación, ClienteGateway (puerto), ClienteError
├─ application/     ListarClientes, CrearCliente, ActualizarCliente, EliminarCliente
├─ infrastructure/  HttpClienteGateway (fetch) + events/mfEvents (publish/subscribe tipados)
├─ presentation/    ClientesApp.vue, components/, composables/useClientes
├─ di.ts            composition root (gateway → casos de uso)
├─ bootstrap.ts     mount/unmount (una app Vue por elemento)
└─ main.ts          entrada standalone (#app)
```

Estilos con Tailwind CSS v4 (`src/presentation/styles.css`) con prefijo `mfc:` y sin preflight: las clases y variables (`--mfc-*`) no se filtran a la shell. El layout se adapta al ancho del contenedor (container queries), no al de la ventana.
