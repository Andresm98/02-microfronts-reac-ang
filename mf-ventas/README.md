# mf-ventas

Microfrontend **React 19 + TypeScript + Vite** para el registro y consulta de ventas. Se publica como
*remote* de Module Federation (`mf_ventas`) y también funciona de forma aislada (standalone).

## Funcionalidad

- Listado de ventas (más recientes primero) filtrable por cliente, con estados de carga, vacío y error.
- Formulario de venta: selector de cliente (alimentado por `GET /api/clientes` de back-clientes), líneas
  dinámicas (añadir/quitar) y previsualización del total en vivo.
- Escucha `clientes:seleccionado` → aplica el filtro y precarga el cliente en el formulario.
- Emite `ventas:creada` `{ id, clienteId, total }` tras registrar una venta.

## Scripts

| Script            | Descripción                                         |
|-------------------|-----------------------------------------------------|
| `npm run dev`     | Servidor de desarrollo en http://localhost:5002 (strictPort, CORS) |
| `npm run build`   | `tsc -b` + `vite build` → `dist/` con `remoteEntry.js` en la raíz |
| `npm run preview` | Sirve `dist/` en http://localhost:5002              |
| `npm test`        | Vitest (casos de uso, eventos, gateways HTTP, componentes) |

## Variables de entorno (build)

| Variable                | Por defecto              | Uso |
|-------------------------|--------------------------|-----|
| `VITE_API_URL`          | `http://localhost:3002`  | Base del API back-ventas |
| `VITE_CLIENTES_API_URL` | `http://localhost:3001`  | Base del API back-clientes (solo lectura, selector) |
| `MF_PUBLIC_URL`         | `http://localhost:5002/` | (opcional) origen público del remote; se usa como `base` para que los chunks/CSS carguen con URL absoluta desde la shell |

Ver `.env.example`.

## Module Federation

- `name: 'mf_ventas'`, `filename: 'remoteEntry.js'`, `exposes: { './mount': './src/bootstrap.tsx' }`.
- React **no** se comparte: el remote es autocontenido.
- El host lo consume como remote `type: 'module'` e importa `mf_ventas/mount`:

```ts
const { mount, unmount } = await import('mf_ventas/mount');
mount(el, { basePath: '/ventas' });
// ...
unmount(el);
```

## Arquitectura (Clean)

```
src/
├─ domain/          Venta, LineaVenta, cálculo de subtotal/total, validación, puertos VentaGateway y ClientesLookupGateway
├─ application/     ListarVentas, RegistrarVenta, CalcularTotalPreview, ListarClientesLookup
├─ infrastructure/  HttpVentaGateway, HttpClientesLookupGateway (fetch) + events/mfEvents
├─ presentation/    VentasApp, components/ (VentaForm, VentasList), hooks/, UseCasesContext, styles.css
├─ di.ts            composition root (gateways → casos de uso)
├─ bootstrap.tsx    mount/unmount (un root de React por elemento)
└─ main.tsx         entrada standalone (#root)
```

Estilos con Tailwind CSS v4 (`src/presentation/styles.css`) con prefijo `mfv:` y sin preflight: las clases y variables (`--mfv-*`) no se filtran a la shell. El layout se adapta al ancho del contenedor (container queries), no al de la ventana.
