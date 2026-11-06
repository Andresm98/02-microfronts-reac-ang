# back-clientes

API REST de clientes: Node.js 24, TypeScript 5, Express 5, PostgreSQL (`pg`) y zod. Usa arquitectura Clean/Hexagonal. El contrato está en [`../CONTRACTS.md`](../CONTRACTS.md).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca con `tsx watch` (recarga al guardar) |
| `npm run build` | Compila `src/` → `dist/` (entrada `dist/main.js`) |
| `npm start` | `node dist/main.js` |
| `npm test` | Ejecuta los tests con vitest (sin base de datos: usa repos en memoria) |
| `npm run typecheck` | Comprueba los tipos de `src` + `test` |

## Configuración (variables de entorno)

| Variable | Por defecto |
|---|---|
| `PORT` | `3001` |
| `DATABASE_URL` | `postgres://clientes:clientes@localhost:5432/clientes` |
| `CORS_ORIGINS` | `http://localhost:5000,http://localhost:5001,http://localhost:5002` |

Ver `.env.example`. La tabla `clientes` la crea `db/init.sql`.

## Endpoints

- `GET /health` → `{ "status": "ok" }`
- `GET /api/clientes` → `Cliente[]` (más recientes primero)
- `GET /api/clientes/:id` → `Cliente` | 404
- `POST /api/clientes` `{ nombre, email, documento, telefono? }` → 201 | 400 | 409 (email duplicado)
- `PUT /api/clientes/:id` (mismo body) → 200 | 400 | 404 | 409 (email de otro cliente)
- `DELETE /api/clientes/:id` → 204 | 404

Los errores tienen la forma `{ "error": string, "details"?: unknown }`.

## Arquitectura

```
src/
├─ domain/            Cliente, Email, Documento, errores, puertos (ClienteRepository, IdGenerator, Clock)
├─ application/       CrearCliente, ListarClientes, ObtenerCliente, ActualizarCliente, EliminarCliente + DTOs
├─ infrastructure/
│  ├─ persistence/    PostgresClienteRepository, InMemoryClienteRepository
│  ├─ http/           router, controlador, esquemas zod, middleware de errores
│  └─ config/env.ts
├─ app.ts             crea la app Express a partir de los casos de uso inyectados
└─ main.ts            composition root: Pool de pg, UUIDs, servidor y cierre ordenado
```

Las dependencias van en una sola dirección: `domain ← application ← infrastructure`.

Reglas de negocio:
- El email se normaliza a minúsculas y se valida.
- El email es único. El caso de uso lo comprueba, y el repositorio convierte el error `23505` de Postgres en un 409.
- El documento tiene entre 3 y 30 caracteres alfanuméricos. Admite `.`, `-` y espacios.
- Un `:id` que no es UUID devuelve 404 sin consultar la base de datos.
