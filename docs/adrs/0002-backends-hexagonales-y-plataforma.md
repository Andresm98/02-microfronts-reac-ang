# ADR-0002: Backends hexagonales por dominio, una base de datos por servicio y despliegue independiente con Docker

- **Estado:** Aceptado
- **Fecha:** 2026-11-01
- **Ámbito:** `back-clientes/`, `back-ventas/`, contenedores y orquestación de todo el repositorio
- **Relacionado:** [ADR-0001](0001-microfrontends-module-federation.md) (frontend), [CONTRACTS.md](../../CONTRACTS.md)

## Contexto

Cada microfrontend (ver ADR-0001) necesita un backend sencillo con su propia base de datos. Requisitos:

- **Un backend por dominio** (clientes y ventas), cada uno en su propia carpeta y sin compartir código.
- **Clean y Hexagonal Architecture**, con una división clara de responsabilidades.
- **Su propio `docker-compose.yml` en cada pieza.**
- **En producción, cada elemento se despliega por separado.** Solo en desarrollo interesa levantarlo todo junto.
- **Una herramienta visual para inspeccionar las bases de datos.**

## Vista del sistema: cómo se conectan los componentes

La vista global (navegador, shell, remotes y APIs) está en [ADR-0001 › Vista del sistema](0001-microfrontends-module-federation.md#vista-del-sistema-cómo-se-conectan-los-componentes). Aquí se detalla la parte de backends, datos y contenedores.

### El hexágono de cada backend

```
                    Adaptadores de entrada (driving)                     Adaptadores de salida (driven)
                    ────────────────────────────────                     ──────────────────────────────
  HTTP/JSON ──► Express 5 ─► routes ─► schemas (zod) ─► Controller ─┐
  (navegador)        ▲                                              │
                     │ errorHandler: ZodError/ValidationError→400   │
                     │ NotFoundError→404 · ConflictError→409 · →500 │
                     │                                              ▼
                     │                ┌───────────── application ────────────┐
                     │                │  Casos de uso (1 clase = 1 acción)   │
                     │                │  CrearCliente · RegistrarVenta · …   │
                     │                └──────────────┬──────────────┬────────┘
                     │                               │ usa          │ usa
                     │                ┌──────────────▼──── domain ──▼────────┐
                     │                │ Entidades: Cliente, Venta(+Lineas)   │
                     │                │ Value objects: Email, Documento,     │
                     │                │   Money · Errores de dominio         │
                     │                │ PUERTOS: ClienteRepository,          │
                     │                │   VentaRepository, IdGenerator, Clock│
                     │                └──────────────▲───────────────────────┘
                     │                               │ implementan
                     │      ┌────────────────────────┴───────────────────────────┐
                     │      │ PostgresClienteRepository (pg.Pool, max 10)         │──► db-clientes:5432
                     │      │ MongoVentaRepository (MongoClient, timeout 5 s)     │──► db-ventas:27017
                     │      │ InMemory*Repository (tests)  · crypto.randomUUID    │
                     │      └─────────────────────────────────────────────────────┘
  main.ts (composition root): lee env → crea pool/cliente → repositorios → casos de uso → app.ts(express) → listen
```

**Regla de dependencias:**
- Las flechas de código apuntan siempre hacia dentro: `infrastructure → application → domain`.
- El dominio no importa nada de Express, `pg`, `mongodb` ni `zod`.
- Los adaptadores implementan los puertos que define el dominio (**inversión de dependencias**).

### Flujo: `POST /api/ventas`

1. Express recibe el JSON. Si está mal formado, el `errorHandler` responde 400 "JSON inválido".
2. El esquema `zod` comprueba la forma: `clienteId` y `lineas[]` con `producto`, `cantidad` y `precioUnitario`. Si no la cumple, responde 400 con `details: [{path, message}]`.
3. `VentasController` llama a `RegistrarVenta.execute(input)`.
4. El caso de uso pide un id y la fecha a los puertos `IdGenerator.next()` y `Clock.now()`, y llama a `Venta.registrar(id, datos, fecha)`. La entidad hace cumplir los invariantes: al menos una línea, cantidad entera > 0 y precio ≥ 0. Calcula el `subtotal` de cada línea y el `total` con `Money`, redondeados a 2 decimales. Si algo falla, lanza `ValidationError` (400).
5. El caso de uso llama a `VentaRepository.save(venta)`. En producción es `MongoVentaRepository.replaceOne({_id}, doc, {upsert: true})`, que convierte la entidad en documento.
6. La venta se convierte en `VentaDTO` (con `id` y `fecha` ISO) y se responde 201.

`back-clientes` sigue el mismo flujo con `CrearCliente`. El email duplicado se detecta en el caso de uso o, si dos peticiones compiten, por la violación `23505` de Postgres en el adaptador. En ambos casos se traduce a `EmailDuplicadoError` (un `ConflictError`), es decir, 409.

### Conexiones en ejecución (Docker)

| Origen → destino | Mecanismo | Configuración | Notas |
|---|---|---|---|
| Navegador → `back-clientes` / `back-ventas` | HTTP en `localhost:3001` / `:3002` (puertos publicados) | `CORS_ORIGINS` (por defecto :5000, :5001, :5002) | Sin gateway (ADR-0001 D8) |
| `back-clientes` → `db-clientes` | Protocolo Postgres, red `mf-net` | `DATABASE_URL=postgres://clientes:clientes@db-clientes:5432/clientes` | Pool de 10 conexiones |
| `back-ventas` → `db-ventas` | Protocolo Mongo, red `mf-net` | `MONGO_URL=mongodb://db-ventas:27017`, `MONGO_DB=ventas` | Crea índices al arrancar |
| `adminer` → `db-clientes` | Red `mf-net` | `ADMINER_DEFAULT_SERVER=db-clientes` | UI en :8080 |
| `mongo-express` → `db-ventas` | Red `mf-net` | `ME_CONFIG_MONGODB_URL` | UI en :8081 |
| Docker → cada contenedor | `HEALTHCHECK` | `/health` (APIs), `pg_isready`, `mongosh ping`, `wget` a nginx | Alimenta `depends_on: service_healthy` |
| Primer arranque de cada BD | Scripts en `/docker-entrypoint-initdb.d` | `db/init.sql`, `db/init-mongo.js` | Solo se ejecutan con el volumen vacío |
| `back-ventas` → `back-clientes` | **No existe** | — | Independencia deliberada (B5) |

**Orden de arranque con Compose:** `db-*` (*healthy*) → `back-*` (*healthy*). Los fronts no dependen de los backends al arrancar: son estáticos y llaman a las APIs desde el navegador.

## Conceptos clave

| Concepto | Significado en este sistema |
|---|---|
| **Arquitectura hexagonal (puertos y adaptadores)** | El núcleo (dominio + aplicación) se comunica con el exterior solo a través de puertos (interfaces). La tecnología concreta vive en adaptadores intercambiables. |
| **Puerto de entrada / salida** (*driving / driven*) | Entrada: lo que el mundo pide al sistema (los casos de uso, invocados por HTTP). Salida: lo que el sistema necesita del mundo (`ClienteRepository`, `IdGenerator`, `Clock`). |
| **Adaptador** | Implementación de un puerto para una tecnología: controlador Express (entrada); `PostgresClienteRepository`, `MongoVentaRepository`, `InMemory*` (salida). |
| **Clean Architecture / regla de dependencias** | Las dependencias de código solo apuntan hacia las capas internas; las políticas de negocio no dependen de los detalles. |
| **Caso de uso** (*application service*) | Orquesta una acción del negocio: coordina entidades y puertos y no contiene reglas de dominio. |
| **Entidad** | Objeto con identidad y ciclo de vida (`Cliente`, `Venta`) que protege sus invariantes. |
| **Value object** | Objeto definido por su valor, inmutable y que se valida a sí mismo (`Email`, `Documento`, `Money`). |
| **Agregado** | Grupo de objetos que se guarda como una unidad con una raíz (`Venta` con sus `LineaVenta`). Encaja de forma natural con un documento de Mongo. |
| **Repositorio** | Puerto que simula una colección de agregados; esconde la persistencia. |
| **DTO** | Objeto plano para cruzar fronteras (de HTTP a la aplicación y vuelta); separa el contrato externo del modelo interno. |
| **Composition root / DI manual** | Único lugar (`main.ts`) donde se instancian y conectan las implementaciones, sin contenedor de DI. |
| **Database per service** | Cada servicio es dueño exclusivo de su BD; nadie más la lee ni la escribe. |
| **Persistencia políglota** | Cada servicio elige el almacenamiento que mejor encaja con su modelo (relacional y documental). |
| **Referencia lógica** | `clienteId` en una venta: un identificador sin clave foránea física, porque pertenece a otro servicio. |
| **Consistencia eventual** | Se acepta que los datos entre servicios estén desincronizados un tiempo (o, aquí, que no se validen) a cambio de autonomía. |
| **Liveness vs readiness** | *Liveness*: el proceso está vivo (`/health` actual). *Readiness*: puede atender peticiones (BD accesible); hoy no existe. |
| **Imagen en varias etapas** (*multi-stage build*) | El Dockerfile compila en una etapa y copia solo lo necesario a la final: imagen pequeña y sin herramientas de build. |
| **`include` de Compose** | Compone varios archivos compose en un proyecto sin duplicarlos (`docker-compose.dev.yml`). |
| **Red con nombre** | `mf-net` con `name:` fijo: permite que stacks de compose distintos se encuentren por nombre de servicio. |
| **Twelve-Factor** | Principios para servicios cloud-native: configuración por entorno, procesos sin estado, paridad entre entornos, apagado limpio. |

## Principios de arquitectura aplicados

| Principio | Cómo se aplica |
|---|---|
| **Regla de dependencias / DIP** | El dominio define los puertos y la infraestructura los implementa; `main.ts` invierte el control. |
| **SRP (responsabilidad única)** | Un caso de uso por clase; controladores sin lógica de negocio; un repositorio por agregado. |
| **Testabilidad por diseño** | `app.ts` recibe los casos de uso ya construidos. Los tests de dominio, aplicación y HTTP usan repositorios en memoria (88 tests, sin BD). |
| **DDD táctico** | Entidades, value objects, agregado `Venta`, repositorios y errores de dominio con significado de negocio. |
| **Fail fast en la frontera** | Validación sintáctica con `zod` en la entrada y semántica en el dominio. Doble barrera; el dominio nunca confía en el adaptador. |
| **Autonomía antes que consistencia** | Ventas no llama a clientes para registrar: se prioriza disponibilidad e independencia (en términos del teorema CAP, se elige A sobre C entre servicios). |
| **Twelve-Factor** | Configuración por variables de entorno; procesos sin estado; *disposability* (apagado limpio con SIGTERM); logs por stdout; paridad dev/prod parcial (mismas imágenes; las URLs de los fronts se fijan al compilar). |
| **Mínimo privilegio** | Los contenedores corren con el usuario `node`, no root; la imagen final no lleva herramientas de build. |
| **Artefactos inmutables** | Cada servicio se publica como imagen versionable; las BDs persisten en volúmenes externos al contenedor. |
| **Despliegue independiente** | Un compose por pieza. El compose agregado existe solo para desarrollo. |

## Decisión

### 1. Stack de los backends

| | back-clientes | back-ventas |
|---|---|---|
| Runtime | Node.js 24, TypeScript 5.9 (ESM, `module: NodeNext`) | igual |
| HTTP | Express 5 + `cors` + validación con `zod` 4 | igual |
| Persistencia | **PostgreSQL 17** con `pg` 8 | **MongoDB 8** con el driver oficial `mongodb` 7 |
| Puerto | 3001 | 3002 |
| Tests | Vitest + Supertest (48 tests) | Vitest + Supertest (40 tests) |

**TypeScript 5.x y no 7:** la versión 7 era la más reciente, pero se fijó la 5.9 por compatibilidad con `tsx`, `vue-tsc` y el resto de herramientas.

### 2. Arquitectura hexagonal (puertos y adaptadores)

La regla de dependencias es estricta: `domain ← application ← infrastructure`, y `main.ts` es el *composition root*.

```
src/
├─ domain/            sin dependencias externas
│  ├─ entities/       Cliente | Venta + LineaVenta
│  ├─ value-objects/  Email, Documento | Money
│  ├─ errors.ts       errores de dominio (validación, no encontrado, conflicto)
│  └─ ports/          ClienteRepository | VentaRepository, más IdGenerator y Clock en ambos
├─ application/       un caso de uso por clase + DTOs
│  └─ use-cases/      Crear/Listar/Obtener/Actualizar/EliminarCliente | RegistrarVenta, ListarVentas, ObtenerVenta
├─ infrastructure/
│  ├─ persistence/    PostgresClienteRepository | MongoVentaRepository, más InMemory*Repository para tests
│  ├─ http/           rutas, controladores, esquemas zod, errorHandler (error de dominio → 400/404/409)
│  └─ config/env.ts   variables de entorno con valores por defecto para desarrollo local
├─ app.ts             construye Express a partir de los casos de uso inyectados
└─ main.ts            conecta los adaptadores reales, arranca el servidor y lo cierra limpio con SIGTERM/SIGINT
```

- **`app.ts` separado de `main.ts`:** así los tests HTTP montan la app con repositorios en memoria, sin base de datos.
- **Reglas de negocio en el dominio:**
  - El email se normaliza (minúsculas y sin espacios) y es único.
  - El documento tiene entre 3 y 30 caracteres.
  - Una venta tiene al menos una línea, con cantidad entera positiva y precio ≥ 0.
  - El `subtotal` y el `total` los calcula el dominio, redondeados a 2 decimales con `Money`. Por ejemplo, 3 × 0,1 da 0,30.

### 3. API

Definida en `CONTRACTS.md`. Resumen:

- **back-clientes:** `GET/POST /api/clientes`, `GET/PUT/DELETE /api/clientes/:id`.
- **back-ventas:** `GET /api/ventas?clienteId=`, `GET /api/ventas/:id`, `POST /api/ventas`.
- **Errores:** siempre como `{ error, details? }`. En los 400, `details` es `[{ path, message }]`.

Decisiones que el contrato dejaba abiertas:

| Caso | Decisión |
|---|---|
| `PUT` con un email que ya usa otro cliente | 409, para mantener la unicidad |
| Id de cliente que no es UUID | 404, sin consultar Postgres |
| Orden de los listados | Más reciente primero |
| `GET /health` | Devuelve `{status:"ok"}` **sin consultar la BD**: indica que el proceso está vivo, no que esté listo |
| Arranque sin BD disponible | El proceso arranca igual; el pool de `pg` y el driver de Mongo conectan en la primera consulta, y mientras tanto las peticiones devuelven 500 |

### 4. Una base de datos por servicio (persistencia políglota)

- **Clientes en PostgreSQL:**
  - Datos relacionales con una restricción de unicidad natural (email).
  - Tabla `clientes(id uuid pk default gen_random_uuid(), nombre, email unique, documento, telefono null, creado_en timestamptz)`.
  - La crea `back-clientes/db/init.sql`, que también inserta 3 clientes de ejemplo.
- **Ventas en MongoDB:**
  - Una venta es un **agregado** con sus líneas embebidas, así que se lee y escribe como un documento.
  - Forma: `{ _id: uuid string, clienteId, lineas[], total, fecha: Date }`, con los índices `idx_clienteId` e `idx_fecha`.
  - `back-ventas/db/init-mongo.js` crea los índices e inserta 2 ventas de ejemplo. El repositorio crea los mismos índices al arrancar, con el mismo nombre.
- **Sin acoplamiento entre BDs:**
  - Ningún servicio lee la base de datos del otro.
  - La venta guarda `clienteId` como **referencia lógica**, y back-ventas **no comprueba** que el cliente exista llamando a back-clientes. Así los servicios siguen siendo independientes en disponibilidad y despliegue.
  - El selector de clientes de mf-ventas consulta directamente `GET /api/clientes`, solo para leer.

### 5. Contenedores

- **Backends:** `Dockerfile` en varias etapas sobre `node:24-alpine`:
  1. `npm ci` y `npm run build`;
  2. solo las dependencias de producción;
  3. imagen final con `dist/` y `node_modules`, usuario no root `node`, `HEALTHCHECK` con `wget` contra `/health` y `CMD ["node","dist/main.js"]`.
- **Frontends:** compilan en `node:24-alpine`, recibiendo las `VITE_*` como `ARG`, y sirven `dist/` con `nginx:alpine`. El `nginx.conf`:
  - devuelve `index.html` para cualquier ruta (fallback de SPA);
  - envía `Access-Control-Allow-Origin *`;
  - sirve `remoteEntry.js` sin caché y `/assets` con caché larga;
  - usa el tipo MIME JS correcto y gzip.
- **Bases de datos:** `postgres:17-alpine` (healthcheck con `pg_isready`) y `mongo:8` (healthcheck con `mongosh ping`), con volúmenes con nombre `mf-db-clientes-data` y `mf-db-ventas-data`. Cada API arranca con `depends_on: condition: service_healthy`.
- **Interfaces para las BDs** (en lugar de Supabase Studio, que exigiría levantar todo el stack de Supabase):
  - **Adminer**, en el puerto 8080, con `db-clientes` preconfigurado (usuario, clave y BD `clientes`);
  - **mongo-express**, en el puerto 8081, sin autenticación básica en desarrollo.

### 6. Orquestación: separada en producción, agregada solo en desarrollo

| Carpeta | Su `docker-compose.yml` levanta |
|---|---|
| `back-clientes/` | `db-clientes` + `back-clientes` + `adminer` |
| `back-ventas/` | `db-ventas` + `back-ventas` + `mongo-express` |
| `mf-clientes/`, `mf-ventas/`, `shell/` | su único servicio nginx |

- **Red común:** todos declaran la red `mf-net` con `name: mf-net`, así que funcionan solos o combinados en la misma máquina.
- **Producción:** cada pieza se despliega con **su propio compose o pipeline**, con su propio ciclo de vida y versión.
- **Desarrollo:**
  - `docker-compose.dev.yml` en la raíz, marcado como *solo desarrollo*, agrega los cinco compose con `include:`.
  - Los scripts `dev.ps1` (PowerShell) y `dev.sh` (bash) lo envuelven, con estos comandos:

| Comando | Qué hace |
|---|---|
| `up` | Construye y levanta los 9 contenedores y espera a que las 7 URLs respondan |
| `local` | Solo las BDs y sus UIs en Docker; backs y fronts con `npm run dev` y recarga en caliente |
| `status` | Estado de los contenedores y de cada URL |
| `logs` | Sigue los logs |
| `down` | Para todo; opcionalmente borra los volúmenes |

## Alternativas y trade-offs

Cada punto de decisión lista las opciones del mercado, qué se gana y qué se paga con cada una, cuál se eligió (✅) y cuándo convendría reconsiderarla.

### Matriz de atributos de calidad (decisión principal: estrategia de datos)

Escala: `++` muy bien · `+` bien · `0` neutro · `−` mal · `−−` muy mal.

| Atributo | ✅ BD por servicio, políglota | BD por servicio, mismo motor | Esquema por servicio en una BD | BD compartida |
|---|---|---|---|---|
| Autonomía y despliegue independiente | ++ | ++ | + | −− |
| Aislamiento de fallos y de carga | ++ | ++ | − | −− |
| Ajuste del modelo de datos al dominio | ++ | + | + | 0 |
| Integridad referencial entre dominios | −− | −− | − | ++ |
| Consultas entre dominios (joins, informes) | −− | −− | − | ++ |
| Coste y simplicidad operativa | − (2 motores) | + | ++ | ++ |
| Habilidades que necesita el equipo | − | + | + | ++ |

**Lectura:**
- **Lo que se gana:** autonomía y ajuste del modelo de datos a cada dominio.
- **Lo que se paga:** integridad entre dominios, consultas transversales y operar dos motores distintos.
- **Alternativa más pragmática:** si el coste operativo pesa más que demostrar la persistencia políglota, *BD por servicio con el mismo motor* (Postgres para ambos) conserva la autonomía y simplifica la operación.

### B1. Estilo de arquitectura interna del backend

| Opción | A favor | En contra |
|---|---|---|
| ✅ **Hexagonal (puertos y adaptadores) + capas de Clean** | Dominio independiente de la tecnología; adaptadores intercambiables; tests sin infraestructura | Más archivos e indirección para un CRUD sencillo (DTOs, mappers, puertos) |
| Capas clásicas (controller → service → repository) | Simple y conocido | La lógica tiende a acoplarse al ORM o al framework; el dominio queda anémico |
| Onion architecture | Muy parecida a la hexagonal (anillos concéntricos) | Diferencia sobre todo de nomenclatura |
| Vertical slice (una carpeta por feature) | Cambios localizados por caso de uso; menos capas | Las reglas comunes pueden duplicarse entre slices |
| Transaction script | Mínimo código para CRUD | No escala cuando crece la lógica de negocio |
| CQRS (separar lecturas y escrituras) | Optimiza lecturas y modelos de consulta | Excesivo para el volumen actual; más piezas |

**Cuándo reconsiderar:** si los servicios se quedan en CRUD puro durante mucho tiempo, *vertical slice* o *transaction script* reducen la ceremonia. Si aparecen listados o informes pesados, CQRS para el lado de lectura.

### B2. Lenguaje y framework HTTP

| Opción | A favor | En contra |
|---|---|---|
| ✅ **Node 24 + TypeScript + Express 5** | Mismo lenguaje que los fronts; ecosistema enorme; mínimo y sin opinión, ideal para un hexágono explícito | Express es minimalista: validación, DI y OpenAPI se añaden a mano |
| Fastify | Más rápido; esquemas JSON y OpenAPI integrados | Ecosistema de plugins distinto |
| Hono | Ligero; corre en edge, Bun y Node | Menos maduro para servicios tradicionales |
| NestJS | Módulos, DI, decoradores y OpenAPI de serie | Boilerplate; el framework tiende a invadir el dominio (decoradores) |
| Spring Boot (Java/Kotlin) | Muy robusto; gran tradición hexagonal | Otro lenguaje; más memoria y arranque más lento |
| .NET (ASP.NET Core) | Rendimiento y herramientas excelentes | Otro lenguaje y runtime |
| Go (net/http, chi, gin) | Binarios pequeños; muy eficiente | Otro lenguaje; menos expresivo para modelar el dominio |
| Python (FastAPI) | Rápido de escribir; OpenAPI automática | Otro lenguaje; tipado opcional |

### B3. Acceso a datos

| Opción | A favor | En contra |
|---|---|---|
| ✅ **Driver nativo (`pg`, `mongodb`) dentro del adaptador** | Control total del SQL y las consultas; sin magia; el mapeo vive en el adaptador | SQL y mapeo escritos a mano; sin migraciones automáticas |
| ORM (Prisma, TypeORM, MikroORM) | Productividad; migraciones; tipos generados | Riesgo de que el modelo del ORM sustituya al de dominio; consultas menos predecibles |
| Query builder (Knex, Kysely, Drizzle) | SQL tipado sin ORM completo | Una dependencia más |
| ODM para Mongo (Mongoose) | Esquemas y validación en Mongo | Duplica la validación del dominio; acopla a Mongoose |

**Riesgo asociado:** el esquema se crea con `init.sql` **solo en el primer arranque**. Para evolucionarlo hará falta una herramienta de migraciones (node-pg-migrate, Flyway, Prisma Migrate, migrate-mongo).

### B4. Estrategia de datos

Ver la matriz anterior.
- **Elegida:** BD por servicio, políglota.
- **Otras opciones:** BD compartida; esquema por servicio; BD por servicio con el mismo motor.

### B5. Integridad y consistencia entre servicios (`clienteId` en ventas)

| Opción | A favor | En contra |
|---|---|---|
| ✅ **Referencia lógica sin validar** | Máxima autonomía; ventas funciona aunque clientes esté caído | Puede haber ventas de clientes inexistentes o borrados |
| Validación síncrona (ventas → `GET /api/clientes/:id`) | Integridad al registrar | Acoplamiento temporal: si clientes cae, ventas también; más latencia; fallos en cascada (habría que añadir *circuit breaker*) |
| Réplica local por eventos (`cliente.creado/eliminado` + broker) | Validación local, sin acoplamiento temporal; ventas puede mostrar nombres | Requiere broker (RabbitMQ, Kafka, NATS), *outbox* e idempotencia: consistencia eventual |
| CDC (Debezium) desde Postgres | No toca el código de clientes | Infraestructura pesada; acopla al esquema interno |
| Saga / compensaciones | Consistencia de negocio en procesos de varios pasos | Excesivo para una sola escritura |
| Prohibir borrar clientes con ventas | Simple | Clientes debería conocer las ventas (acoplamiento inverso) |

**Cuándo reconsiderar:** si la integridad pasa a ser un requisito de negocio, la evolución natural es **eventos de dominio con *transactional outbox*** y réplica local en ventas, no la llamada síncrona.

### B6. Estilo y exposición de la API

| Opción | A favor | En contra |
|---|---|---|
| ✅ **REST/JSON con el contrato documentado en `CONTRACTS.md`** | Universal; fácil de depurar con curl | El contrato en Markdown no es ejecutable: no genera clientes ni valida |
| REST + **OpenAPI** generada desde `zod` | Contrato ejecutable; clientes tipados; contract testing | Más herramientas |
| GraphQL (o federation) | El cliente pide exactamente lo que necesita; agrega servicios | Complejidad (caché, N+1, seguridad) para dos CRUD |
| gRPC | Contratos fuertes, rendimiento | No es nativo en el navegador (necesita gRPC-Web o un proxy) |
| tRPC | Tipos de extremo a extremo | Solo entre TypeScript; acopla cliente y servidor |

Que el navegador acceda directamente a las APIs, en lugar de pasar por un gateway o un BFF, se analiza en ADR-0001 › D8.

### B7. Generación de identificadores

| Opción | A favor | En contra |
|---|---|---|
| ✅ **UUID v4 generado en la aplicación** (`crypto.randomUUID`, puerto `IdGenerator`) | El dominio crea entidades válidas sin la BD; ids globales entre servicios; el formato es el mismo en Postgres y Mongo | Índices menos eficientes que los secuenciales; ids largos |
| `serial` / `identity` de la BD | Compactos y ordenados | El id depende de la BD (hay que insertar para conocerlo); revela volumen |
| `ObjectId` de Mongo | Nativo, ordenable | Específico de Mongo; inconsistente con clientes |
| UUID v7 / ULID | Ordenables por tiempo y mejores para índices | Soporte de librerías algo menor |

**Cuándo reconsiderar:** con volúmenes altos de escritura, UUID v7 sin cambiar el contrato (sigue siendo UUID).

### B8. Health checks

| Opción | A favor | En contra |
|---|---|---|
| ✅ **Solo liveness (`/health` sin BD)** | Un fallo de la BD no hace que el orquestador reinicie la API sin necesidad | El contenedor aparece *healthy* aunque no pueda atender peticiones |
| Liveness + **readiness** (`/ready` con ping a la BD) | El balanceador deja de enviar tráfico a instancias sin BD | Un endpoint más; hay que ajustar los timeouts |
| Un único `/health` que consulta la BD | Un solo endpoint | Riesgo de reinicios en cascada si la BD falla |

### B9. Empaquetado y despliegue

| Opción | A favor | En contra |
|---|---|---|
| ✅ **Imagen Docker por servicio + un compose por carpeta** | Portable; desarrollo y producción con las mismas imágenes; simple | Compose no es un orquestador de producción completo (sin autoescalado, despliegues progresivos limitados) |
| Kubernetes (Helm/Kustomize) | Escalado, *rolling updates*, readiness, secretos | Complejidad operativa alta |
| Contenedores gestionados (ECS/Fargate, Cloud Run, Azure Container Apps) | Escalado gestionado sin operar un clúster | Dependencia del proveedor |
| Serverless (Lambda, Cloud Functions) | Pago por uso; escala a cero | Arranques en frío; las conexiones a Postgres necesitan un proxy |
| PaaS (Render, Fly.io, Railway, Heroku) | Muy rápido de poner en marcha | Menos control; coste a escala |
| Fronts en CDN u object storage (S3 + CloudFront) | Ideal para estáticos: barato, global | Configurar CORS y caché de `remoteEntry.js` |

**Recomendación para producción:** APIs en contenedores gestionados o Kubernetes; fronts en CDN; BDs gestionadas (RDS/Cloud SQL, MongoDB Atlas). El compose por carpeta sigue sirviendo como especificación y para entornos efímeros.

### B10. Entorno de desarrollo integrado

| Opción | A favor | En contra |
|---|---|---|
| ✅ **`docker-compose.dev.yml` con `include` + scripts `dev.ps1` y `dev.sh`** | Un comando; reutiliza los compose de cada pieza sin duplicarlos; modo `local` con recarga en caliente | Los `container_name` fijos impiden coexistir con los stacks por carpeta; dos scripts que mantener |
| Un compose raíz con todo copiado | Un solo archivo | Duplicación que diverge de los compose de cada pieza |
| Compose `profiles` | Activar grupos (`--profile backend`) | Mezcla desarrollo y producción en el mismo archivo |
| Tilt / Skaffold / Garden | Recarga en caliente sobre Kubernetes; paridad con producción | Requiere Kubernetes local |
| Dev Containers | Entorno reproducible en el IDE | No resuelve por sí solo la orquestación de varios servicios |
| `concurrently` / `npm-run-all` en un `package.json` raíz | Muy ligero | Solo procesos Node; las BDs aparte |

### B11. Interfaz para las bases de datos

| Opción | A favor | En contra |
|---|---|---|
| ✅ **Adminer + mongo-express** | Ligeras, un contenedor cada una, listas en `localhost` | Funcionalidad básica; no deben exponerse en producción |
| Supabase Studio | UI moderna para Postgres | Requiere el stack de Supabase (Kong, GoTrue, PostgREST, Realtime, …); solo Postgres |
| pgAdmin | Muy completo para Postgres | Pesado; solo Postgres |
| Mongo Compass, DBeaver, DataGrip | Muy completos; multi-motor (DBeaver/DataGrip) | Aplicaciones de escritorio, fuera del stack |

**Resumen de los trade-offs asumidos:** **autonomía, testabilidad e independencia tecnológica** a cambio de **más código de infraestructura (mapeos, DTOs, puertos), sin integridad entre servicios, con dos motores que operar y con controles de seguridad y readiness de nivel desarrollo**. Para producción, lo primero a revisar es B5 (eventos/outbox), B8 (`/ready`), B3 (migraciones) y la seguridad descrita en *Consecuencias*.

## Consecuencias

**Positivas**

- Cada servicio se compila, prueba, despliega y escala por separado, y su BD está aislada.
- El dominio y los casos de uso se prueban sin infraestructura (repositorios en memoria). Los adaptadores se pueden sustituir, por ejemplo cambiar de Postgres a otra BD, sin tocar el dominio.
- Las imágenes son pequeñas, no corren como root y tienen healthchecks. El orden de arranque depende de que las BDs estén sanas.
- Un comando levanta todo para desarrollar (`./dev.ps1 up`) sin comprometer el modelo de despliegue de producción.

**Negativas y riesgos**

- **Sin integridad referencial entre servicios:** puede haber ventas con un `clienteId` que ya no existe (por ejemplo, tras borrar un cliente). Se acepta como consistencia eventual. Si hiciera falta, se resolvería con eventos de dominio (`cliente.eliminado`) y una política explícita.
- **`/health` no comprueba la BD:** el contenedor puede figurar *healthy* con la BD caída. Conviene añadir un `/ready` que sí la compruebe antes de usar orquestadores con readiness probes.
- **Arranque sin BD:** como el arranque no espera a la BD, las primeras peticiones pueden fallar con 500 si la BD tarda. En Compose lo mitiga `service_healthy`.
- **`container_name` fijos:** el stack de desarrollo y los stacks por carpeta no pueden coexistir en la misma máquina (documentado en el README).
- **Seguridad pensada solo para desarrollo:**
  - credenciales `clientes/clientes`;
  - mongo-express sin autenticación;
  - CORS con orígenes `localhost`;
  - puertos de las BDs publicados en el host.

  En producción hacen falta secretos gestionados, BDs sin exponer, UIs de BD deshabilitadas o protegidas, TLS y CORS restringido.
- **Tipos replicados a mano:** el contrato de API está duplicado en backends y frontends, y su evolución exige disciplina de versionado en `CONTRACTS.md`. Una mejora natural es publicar OpenAPI y generar los clientes.

## Verificación

- **Sin Docker:** `npm run build`, `npm test` y `npm run typecheck` en `back-clientes/` y `back-ventas/`.
- **Con Docker:** `./dev.ps1 up` (o `./dev.sh up`), y luego:
  - `curl localhost:3001/health` y `curl localhost:3002/health` devuelven `{"status":"ok"}`;
  - crear un cliente da 201, y repetirlo con el mismo email da 409;
  - crear una venta da 201, con el total calculado por el dominio;
  - Adminer (http://localhost:8080) y mongo-express (http://localhost:8081) muestran los datos de ejemplo.
