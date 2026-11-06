# Contratos compartidos

Fuente única de verdad para que shell, microfronts, backends y contenedores encajen.
Nada se importa entre carpetas: cada proyecto replica los tipos que necesita.

## Puertos y servicios Docker (red `mf-net`, `name: mf-net`)

| Servicio compose | Carpeta        | Puerto host | Puerto contenedor | Tecnología                  |
|------------------|----------------|-------------|-------------------|-----------------------------|
| shell            | shell/         | 5000        | 80 (nginx)        | React + Vite (MF host)      |
| mf-clientes      | mf-clientes/   | 5001        | 80 (nginx)        | Vue 3 + Vite (MF remote)    |
| mf-ventas        | mf-ventas/     | 5002        | 80 (nginx)        | React + Vite (MF remote)    |
| back-clientes    | back-clientes/ | 3001        | 3001              | Node/TS/Express             |
| db-clientes      | back-clientes/ | 5432        | 5432              | PostgreSQL 17               |
| adminer          | back-clientes/ | 8080        | 8080              | Adminer (UI Postgres)       |
| back-ventas      | back-ventas/   | 3002        | 3002              | Node/TS/Express             |
| db-ventas        | back-ventas/   | 27017       | 27017             | MongoDB 8                   |
| mongo-express    | back-ventas/   | 8081        | 8081              | UI MongoDB                  |

En desarrollo local (`npm run dev`) los fronts usan los mismos puertos 5000/5001/5002.

## Variables de entorno

back-clientes: `PORT=3001`, `DATABASE_URL=postgres://clientes:clientes@db-clientes:5432/clientes` (local: `localhost`), `CORS_ORIGINS=http://localhost:5000,http://localhost:5001,http://localhost:5002`
back-ventas: `PORT=3002`, `MONGO_URL=mongodb://db-ventas:27017` (local: `localhost`), `MONGO_DB=ventas`, `CORS_ORIGINS=` (igual)
mf-clientes: `VITE_API_URL=http://localhost:3001`
mf-ventas: `VITE_API_URL=http://localhost:3002`, `VITE_CLIENTES_API_URL=http://localhost:3001` (solo lectura, para el selector de clientes)
shell: `VITE_MF_CLIENTES_URL=http://localhost:5001/remoteEntry.js`, `VITE_MF_VENTAS_URL=http://localhost:5002/remoteEntry.js`

Las variables `VITE_*` se resuelven en build: los Dockerfile de los fronts las reciben como `ARG`.

## Scripts npm (todos los proyectos)

`dev`, `build`, `test` (vitest run), `start` solo en backs (`node dist/main.js`). Build de backs → `dist/main.js`. Build de fronts → `dist/` (estático, con `remoteEntry.js` en la raíz de `dist/` para los remotes).

## API back-clientes (`/api/clientes`)

```ts
type Cliente = { id: string /* uuid */; nombre: string; email: string; documento: string; telefono: string | null; creadoEn: string /* ISO */ };
```
- `GET /health` → `{ status: "ok" }`
- `GET /api/clientes` → `Cliente[]`
- `GET /api/clientes/:id` → `Cliente` | 404
- `POST /api/clientes` body `{ nombre, email, documento, telefono? }` → 201 `Cliente` | 400 | 409 (email duplicado)
- `PUT /api/clientes/:id` mismo body → `Cliente` | 400 | 404
- `DELETE /api/clientes/:id` → 204 | 404
- Errores: `{ error: string, details?: unknown }`

Tabla Postgres `clientes(id uuid pk, nombre text, email text unique, documento text, telefono text null, creado_en timestamptz default now())` — creada por `back-clientes/db/init.sql`.

## API back-ventas (`/api/ventas`)

```ts
type LineaVenta = { producto: string; cantidad: number /* int > 0 */; precioUnitario: number /* >= 0 */; subtotal: number };
type Venta = { id: string; clienteId: string; lineas: LineaVenta[]; total: number; fecha: string /* ISO */ };
```
- `GET /health` → `{ status: "ok" }`
- `GET /api/ventas?clienteId=` → `Venta[]` (filtro opcional)
- `GET /api/ventas/:id` → `Venta` | 404
- `POST /api/ventas` body `{ clienteId, lineas: [{ producto, cantidad, precioUnitario }] }` → 201 `Venta` | 400
- `subtotal` y `total` los calcula el dominio. Colección Mongo `ventas`.

## Module Federation (`@module-federation/vite`)

| App         | name          | expone                     | filename        |
|-------------|---------------|----------------------------|-----------------|
| mf-clientes | `mf_clientes` | `./mount` → `src/bootstrap.ts` | `remoteEntry.js` |
| mf-ventas   | `mf_ventas`   | `./mount` → `src/bootstrap.tsx` | `remoteEntry.js` |
| shell       | `shell`       | — (host)                   | —               |

Contrato de `./mount` (agnóstico de framework, NO se comparten vue/react entre apps):
```ts
export function mount(el: HTMLElement, props?: { basePath?: string }): void;
export function unmount(el: HTMLElement): void;
```

## Eventos entre micros (`window` + `CustomEvent`)

- `clientes:seleccionado` → `detail: { id: string; nombre: string }` — emitido por mf-clientes al seleccionar un cliente; mf-ventas lo escucha para filtrar ventas y precargar el formulario.
- `ventas:creada` → `detail: { id: string; clienteId: string; total: number }` — emitido por mf-ventas al crear una venta (la shell puede mostrar notificación).
