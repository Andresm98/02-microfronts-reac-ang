# back-ventas

API REST de ventas: Node.js 24, TypeScript 5, Express 5, MongoDB (driver oficial `mongodb`) y zod. Usa arquitectura Clean/Hexagonal. El contrato está en [`../CONTRACTS.md`](../CONTRACTS.md).

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
| `PORT` | `3002` |
| `MONGO_URL` | `mongodb://localhost:27017` |
| `MONGO_DB` | `ventas` |
| `CORS_ORIGINS` | `http://localhost:5000,http://localhost:5001,http://localhost:5002` |

## Endpoints

- `GET /health` → `{ "status": "ok" }`
- `GET /api/ventas?clienteId=` → `Venta[]` (filtro opcional, más recientes primero)
- `GET /api/ventas/:id` → `Venta` | 404
- `POST /api/ventas` `{ clienteId, lineas: [{ producto, cantidad, precioUnitario }] }` → 201 | 400

Los errores tienen la forma `{ "error": string, "details"?: unknown }`.

## Persistencia

Las ventas se guardan en la colección `ventas`. Es la misma forma de documento que usa `db/init-mongo.js`:

```js
{ _id: "<uuid v4 string>", clienteId, lineas: [{ producto, cantidad, precioUnitario, subtotal }], total, fecha: ISODate }
```

El API devuelve `_id` como `id` y `fecha` como texto ISO. Al arrancar, crea de forma idempotente los índices `idx_clienteId` e `idx_fecha`. El driver conecta en la primera operación, así que el API arranca aunque Mongo aún no esté listo.

## Arquitectura

```
src/
├─ domain/            Venta (agregado), LineaVenta, Money, errores, puertos (VentaRepository, IdGenerator, Clock)
├─ application/       RegistrarVenta, ListarVentas, ObtenerVenta + DTOs
├─ infrastructure/
│  ├─ persistence/    MongoVentaRepository, InMemoryVentaRepository
│  ├─ http/           router, controlador, esquemas zod, middleware de errores
│  └─ config/env.ts
├─ app.ts             crea la app Express a partir de los casos de uso inyectados
└─ main.ts            composition root: MongoClient, UUIDs, servidor y cierre ordenado
```

Reglas de negocio (en el dominio):
- Una venta tiene al menos una línea.
- `cantidad` es un entero positivo.
- `precioUnitario` es mayor o igual que 0.
- `subtotal = cantidad × precioUnitario` y `total = Σ subtotales`, redondeados a 2 decimales. Si el cliente envía `subtotal` o `total`, se ignoran.
- No se comprueba que `clienteId` exista en back-clientes, porque los servicios son independientes.
