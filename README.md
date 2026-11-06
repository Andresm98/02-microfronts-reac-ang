# Portal Comercial: microfrontends con Module Federation

Demo de microfrontends en la que una **shell en React** compone en runtime dos micro-frontends hechos con
frameworks distintos (**Vue 3** y **React**), cada uno con su propio **backend Node/TypeScript** y su propia
**base de datos** (PostgreSQL y MongoDB). La integración usa `@module-federation/vite` y un contrato mínimo
(`mount`/`unmount` + eventos en `window`). Ninguna app importa código de otra; el contrato está en
[`CONTRACTS.md`](./CONTRACTS.md).

## Arquitectura

```
                               Navegador (http://localhost:5000)
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │  shell (React 19, host MF "shell")                                              │
 │  ┌──────────── Header: cliente seleccionado · toasts ──────────────────────┐    │
 │  │   rutas:  /  (dashboard: ambos micros)   /clientes/*   /ventas/*        │    │
 │  └─────────────────────────────────────────────────────────────────────────┘    │
 │        │ import('mf_clientes/mount')               │ import('mf_ventas/mount')  │
 │        ▼ mount(el) / unmount(el)                   ▼ mount(el) / unmount(el)    │
 │  ┌──────────────────────────────┐   window    ┌──────────────────────────────┐  │
 │  │ mf-clientes (Vue 3)          │ CustomEvent │ mf-ventas (React 19)         │  │
 │  │ remote "mf_clientes"         │ ──────────► │ remote "mf_ventas"           │  │
 │  │ emite clientes:seleccionado  │             │ emite ventas:creada ──► shell│  │
 │  └──────────────┬───────────────┘             └───────┬──────────────┬───────┘  │
 └─────────────────┼─────────────────────────────────────┼──────────────┼──────────┘
        remoteEntry.js :5001                  remoteEntry.js :5002      │ (solo lectura:
                   │ HTTP/JSON                          │ HTTP/JSON     │  selector clientes)
                   ▼                                    ▼               │
        ┌─────────────────────┐              ┌─────────────────────┐    │
        │ back-clientes :3001 │◄─────────────┼─────────────────────┼────┘
        │ Express + TS        │              │ back-ventas :3002   │
        └─────────┬───────────┘              │ Express + TS        │
                  ▼                          └─────────┬───────────┘
        ┌─────────────────────┐                        ▼
        │ db-clientes :5432   │              ┌─────────────────────┐
        │ PostgreSQL 17       │              │ db-ventas :27017    │
        └─────────────────────┘              │ MongoDB 8           │
          Adminer :8080                      └─────────────────────┘
                                               mongo-express :8081
```

Puntos clave:

- **Sin frameworks compartidos**: cada remote empaqueta su propio Vue o React y sólo expone `./mount`. La shell
  no sabe con qué framework está hecho cada micro.
- **Aislamiento de fallos**: si un remote o su `remoteEntry.js` cae, la shell muestra un aviso con
  **Reintentar** en su lugar y el resto sigue funcionando.
- **Clean / hexagonal** en todos los proyectos: `domain` → `application` (casos de uso y puertos) →
  `infrastructure` (adaptadores HTTP, BD, Module Federation, eventos) → `presentation`.
- Las URLs (`VITE_*`) se fijan **en build**: en Docker llegan como `ARG` de cada Dockerfile.

## Estructura

```
.
├─ CONTRACTS.md          contrato compartido (puertos, envs, API, MF, eventos)
├─ docs/adrs/           decisiones de arquitectura (ADR-0001 frontend, ADR-0002 backends y plataforma)
├─ docker-compose.dev.yml  SÓLO DESARROLLO: orquesta todo en una máquina (incluye los compose de cada carpeta)
├─ dev.ps1 / dev.sh      script para levantar/parar todo en desarrollo
├─ shell/                host MF: React 19 + Vite 8 + react-router 7   (puerto 5000)
├─ mf-clientes/          remote MF: Vue 3 + Vite                        (puerto 5001)
├─ mf-ventas/            remote MF: React 19 + Vite                     (puerto 5002)
├─ back-clientes/        API Express + TS + PostgreSQL                  (puerto 3001)
│  └─ db/init.sql        crea la tabla clientes (+ datos de ejemplo)
└─ back-ventas/          API Express + TS + MongoDB                     (puerto 3002)
   └─ db/init-mongo.js   inicializa la colección ventas
```

Cada carpeta tiene su `README.md`, `Dockerfile` y `docker-compose.yml` autónomo.

## Puertos

| Servicio      | URL                                   | Tecnología                 |
|---------------|---------------------------------------|----------------------------|
| shell         | http://localhost:5000                 | React + Vite (nginx en Docker) |
| mf-clientes   | http://localhost:5001/remoteEntry.js  | Vue 3 + Vite (remote)      |
| mf-ventas     | http://localhost:5002/remoteEntry.js  | React + Vite (remote)      |
| back-clientes | http://localhost:3001/api/clientes    | Node/TS/Express            |
| back-ventas   | http://localhost:3002/api/ventas      | Node/TS/Express            |
| db-clientes   | localhost:5432 (`clientes`/`clientes`, BD `clientes`) | PostgreSQL 17 |
| db-ventas     | localhost:27017 (BD `ventas`)         | MongoDB 8                  |
| adminer       | http://localhost:8080                 | UI para PostgreSQL         |
| mongo-express | http://localhost:8081                 | UI para MongoDB            |

## Desarrollo: levantar todo con un comando

> ⚠ **Sólo para desarrollo.** En producción cada pieza (shell, mf-clientes, mf-ventas, back-clientes, back-ventas)
> se despliega **por separado** con el `docker-compose.yml` de su carpeta (o su propio pipeline), con su propio
> ciclo de vida y versionado. `docker-compose.dev.yml` y los scripts `dev.*` sólo existen para trabajar en local.

| Windows (PowerShell)        | bash (Git Bash / Linux / macOS) | Qué hace |
|-----------------------------|---------------------------------|----------|
| `./dev.ps1` o `./dev.ps1 up` | `./dev.sh` o `./dev.sh up`      | Construye y levanta los 9 contenedores y espera a que todas las URLs respondan |
| `./dev.ps1 local`           | `./dev.sh local`                | BDs + UIs en Docker; backs y fronts con `npm run dev` (hot reload). PowerShell abre una ventana por app; bash los deja en segundo plano con logs en `.dev/logs/` |
| `./dev.ps1 status`          | `./dev.sh status`               | Estado de contenedores y de cada URL |
| `./dev.ps1 logs -Service shell` | `./dev.sh logs shell`       | Sigue los logs (todos o de un servicio) |
| `./dev.ps1 down` (`-Volumes`) | `./dev.sh down` (`-v`)        | Para todo (y opcionalmente borra los datos de las BDs) |

Si PowerShell bloquea el script: `powershell -ExecutionPolicy Bypass -File .\dev.ps1 up`.

Equivalente manual: `docker compose -f docker-compose.dev.yml up -d --build`. Abre http://localhost:5000.

> Los compose de cada carpeta definen `container_name` fijos (`db-clientes`, `shell`, …). No levantes a la vez el
> stack de desarrollo y los stacks individuales: el segundo fallará por conflicto de nombres. Para pasar de uno a otro,
> para primero el que esté levantado (`./dev.ps1 down` o `docker compose down` en la carpeta).

Comprobación rápida:

```bash
curl http://localhost:3001/health            # {"status":"ok"}
curl http://localhost:3002/health            # {"status":"ok"}
curl -I http://localhost:5001/remoteEntry.js # 200
curl -I http://localhost:5002/remoteEntry.js # 200
curl http://localhost:5000/clientes          # HTML de la SPA (fallback de nginx)
```

## Ejecutar cada pieza por separado (Docker)

Es el modo que refleja producción: cada pieza es autónoma. Todos los compose declaran la misma red con nombre
fijo `mf-net`, así que en una misma máquina se pueden combinar:

```bash
cd back-clientes && docker compose up -d --build   # db-clientes + back-clientes + adminer
cd back-ventas   && docker compose up -d --build   # db-ventas + back-ventas + mongo-express
cd mf-clientes   && docker compose up -d --build   # remote Vue en :5001
cd mf-ventas     && docker compose up -d --build   # remote React en :5002
cd shell         && docker compose up -d --build   # host en :5000
```

Los remotes también funcionan **standalone** (sin shell): abre http://localhost:5001 o http://localhost:5002.

## Desarrollo local sin Docker (o sólo con las BDs en Docker)

Requisitos: Node 24 y npm. Levanta sólo las bases de datos (y sus UIs) con Docker:

```bash
./dev.ps1 local    # o ./dev.sh local: hace todo lo de abajo automáticamente
# manual:
docker compose -f docker-compose.dev.yml up -d db-clientes db-ventas adminer mongo-express
```

Después, en una terminal por proyecto (`npm install` la primera vez):

```bash
# back-clientes (por defecto usa postgres://clientes:clientes@localhost:5432/clientes)
cd back-clientes && npm run dev
# back-ventas (por defecto usa mongodb://localhost:27017, BD ventas)
cd back-ventas && npm run dev
# remotes (dev server con CORS y strictPort)
cd mf-clientes && npm run dev     # :5001
cd mf-ventas   && npm run dev     # :5002
# host
cd shell && npm run dev           # :5000
```

Los tres fronts funcionan con `npm run dev` y también con `npm run build && npm run preview` en los mismos
puertos. Arranca los remotes antes de abrir la shell; si alguno no está, la shell muestra su aviso de
"no disponible" y se recupera con **Reintentar**.

Variables de entorno principales (todas tienen valores por defecto para local; ver `.env.example` de cada carpeta):

| Proyecto      | Variables |
|---------------|-----------|
| back-clientes | `PORT=3001`, `DATABASE_URL`, `CORS_ORIGINS` |
| back-ventas   | `PORT=3002`, `MONGO_URL`, `MONGO_DB=ventas`, `CORS_ORIGINS` |
| mf-clientes   | `VITE_API_URL=http://localhost:3001` |
| mf-ventas     | `VITE_API_URL=http://localhost:3002`, `VITE_CLIENTES_API_URL=http://localhost:3001` |
| shell         | `VITE_MF_CLIENTES_URL=http://localhost:5001/remoteEntry.js`, `VITE_MF_VENTAS_URL=http://localhost:5002/remoteEntry.js` |

## UIs de base de datos

- **Adminer**: http://localhost:8080 → Sistema *PostgreSQL*, servidor `db-clientes`, usuario `clientes`,
  contraseña `clientes`, base de datos `clientes`.
- **mongo-express**: http://localhost:8081 → base de datos `ventas`, colección `ventas` (sin autenticación).

## Contrato entre micros

Cada remote expone `./mount` (en `remoteEntry.js`):

```ts
export function mount(el: HTMLElement, props?: { basePath?: string }): void;
export function unmount(el: HTMLElement): void;
```

Eventos en `window` (`CustomEvent`):

| Evento                  | `detail`                                   | Emite        | Escuchan |
|-------------------------|--------------------------------------------|--------------|----------|
| `clientes:seleccionado` | `{ id: string; nombre: string }`           | mf-clientes  | mf-ventas (filtra y precarga el formulario), shell (cabecera) |
| `ventas:creada`         | `{ id: string; clienteId: string; total: number }` | mf-ventas | shell (notificación) |

Flujo típico: en el dashboard pulsas **Seleccionar** en un cliente → la cabecera de la shell muestra
"Cliente: …" y mf-ventas filtra su historial y preselecciona ese cliente → registras una venta → la shell
muestra un toast "Venta registrada por …".

## APIs

- **back-clientes**: `GET/POST /api/clientes`, `GET/PUT/DELETE /api/clientes/:id`, `GET /health`
  (409 si el email ya existe).
- **back-ventas**: `GET /api/ventas?clienteId=`, `GET /api/ventas/:id`, `POST /api/ventas`, `GET /health`
  (`subtotal` y `total` los calcula el dominio).

Detalle de tipos y códigos de error en [`CONTRACTS.md`](./CONTRACTS.md).

## Tests

Todos los proyectos usan Vitest (`npm test` = `vitest run`):

```bash
for d in shell mf-clientes mf-ventas back-clientes back-ventas; do (cd $d && npm install && npm test); done
```

| Proyecto      | Qué cubre |
|---------------|-----------|
| shell         | `RemoteMount` con un loader falso (loading, mount/unmount, fallback y reintento), bus de eventos, loader con caché, cabecera |
| mf-clientes   | casos de uso, eventos, gateway HTTP, componentes Vue |
| mf-ventas     | casos de uso, infraestructura (HTTP, eventos), componentes React |
| back-clientes | dominio, casos de uso, HTTP e infraestructura (sin BD real) |
| back-ventas   | dominio, casos de uso, HTTP e infraestructura (sin BD real) |

Los tests no necesitan las bases de datos ni Docker.

## Estilos (Tailwind CSS v4)

- **shell**: Tailwind completo, incluido el *preflight* (reset global), tipografía Inter y modo oscuro automático (`prefers-color-scheme`).
- **mf-clientes / mf-ventas**: Tailwind con **prefijo propio** (`mfc:` / `mfv:`) y **sin preflight**. Sus utilidades y variables (`--mfc-*`, `--mfv-*`) no pueden colisionar con la shell ni entre sí, y cada micro sigue viéndose bien en modo standalone.
- **Responsive por contenedor**: los micros usan *container queries* (`@container`), no el ancho de la ventana. Así, la misma tabla se muestra como tarjetas en el panel estrecho del dashboard o en móvil, y como tabla a pantalla completa.

## Decisiones de arquitectura

- [ADR-0001 · Microfrontends con Module Federation, una shell agnóstica y remotes Vue y React](docs/adrs/0001-microfrontends-module-federation.md)
- [ADR-0002 · Backends hexagonales por dominio, una base de datos por servicio y despliegue independiente con Docker](docs/adrs/0002-backends-hexagonales-y-plataforma.md)
