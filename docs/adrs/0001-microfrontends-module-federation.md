# ADR-0001: Microfrontends con Module Federation, una shell agnóstica y remotes Vue y React

- **Estado:** Aceptado
- **Fecha:** 2026-11-01
- **Ámbito:** `shell/`, `mf-clientes/`, `mf-ventas/`
- **Relacionado:** [ADR-0002](0002-backends-hexagonales-y-plataforma.md) (backends, datos y despliegue), [CONTRACTS.md](../../CONTRACTS.md)

## Contexto

El "Portal Comercial" reúne dos dominios de negocio, **clientes** y **ventas**, que deben poder evolucionar, desplegarse y escalar de forma independiente, idealmente con equipos distintos. Hay además dos requisitos explícitos:

1. Cada dominio tiene su propio frontend, y **con frameworks distintos**: clientes en **Vue 3** y ventas en **React 19**.
2. Una **shell** debe integrar ambos frontends en una sola experiencia: navegación común, dashboard con los dos módulos a la vez e información compartida (el cliente seleccionado y las ventas recién creadas).

Restricciones y fuerzas en juego:

- Integrar en **runtime** y no en build: desplegar un micro no debe obligar a recompilar ni redesplegar la shell.
- Mezclar frameworks impide compartir una única instancia de React o Vue entre todas las aplicaciones.
- La caída de un micro no debe tumbar la shell ni al otro micro.
- Los estilos de un micro no deben filtrarse a la shell ni al otro micro.
- Cada micro debe poder desarrollarse y ejecutarse **solo** (standalone), sin la shell.
- Dentro de cada aplicación se exige **Clean Architecture**, con una división clara de responsabilidades.

## Vista del sistema: cómo se conectan los componentes

### Diagrama de contenedores

```
┌───────────────────────────────────────── Navegador del usuario ─────────────────────────────────────────┐
│                                                                                                         │
│  shell (host MF · React 19)                                                                             │
│  ├─ Header  ◄────────── escucha ─────────┐                                                              │
│  ├─ Router: /  /clientes/*  /ventas/*    │      bus de eventos del navegador (window + CustomEvent)     │
│  └─ RemoteMount ──mount(el)/unmount(el)──┼──► mf_clientes (Vue 3)  ── emite  clientes:seleccionado ──┐  │
│                 ──mount(el)/unmount(el)──┼──► mf_ventas   (React)  ── escucha clientes:seleccionado ◄┘  │
│                                          └───────────────────────────── emite  ventas:creada            │
│                                                                                                         │
│          (1) HTML+JS            (2) remoteEntry.js + chunks + CSS          (3) REST/JSON (fetch + CORS)  │
└───────────────┬──────────────────────────────┬─────────────────────────────────────┬────────────────────┘
                ▼                              ▼                                     ▼
       nginx · shell :5000         nginx · mf-clientes :5001            back-clientes :3001 ──pg──► db-clientes :5432 (PostgreSQL 17)
                                   nginx · mf-ventas   :5002            back-ventas   :3002 ─mongo─► db-ventas  :27017 (MongoDB 8)
                                                                        adminer :8080 ─────────► db-clientes
                                                                        mongo-express :8081 ───► db-ventas
                                                                        └──────────── red Docker mf-net ────────────┘
```

Puntos clave del diagrama:
- **Composición en el cliente:** el HTML no se ensambla en ningún servidor. Es el navegador quien descarga la shell y, después, el código de cada remote.
- **Sin servidor intermedio:** no hay API gateway ni BFF. Cada micro llama **directamente** a su backend con CORS; mf-ventas llama además a `back-clientes` solo para leer.
- **La red Docker `mf-net` solo se usa entre servidores:** API → BD y UIs de BD → BD, mediante el nombre del servicio (`db-clientes`, `db-ventas`). El navegador entra siempre por los puertos publicados en `localhost`.

### Tabla de conexiones

| # | Origen → destino | Protocolo / mecanismo | Contrato | Cuándo se fija | Acoplamiento |
|---|---|---|---|---|---|
| 1 | Navegador → nginx shell | HTTP | `index.html` + assets; cualquier ruta devuelve `index.html` | — | — |
| 2 | Shell → nginx de cada remote | HTTP GET de un módulo ESM (`remoteEntry.js`) y de sus chunks y CSS | `name` + `exposes['./mount']` | **URL al compilar la shell**; código en **ejecución** | URL estable y nombre del remote |
| 3 | Shell → micro | Llamada JS en el mismo documento | `mount(el, {basePath})` / `unmount(el)` | Ejecución | Mínimo: 2 funciones |
| 4 | Micro ↔ micro / shell | `window.dispatchEvent(new CustomEvent(...))` | `clientes:seleccionado`, `ventas:creada` | Ejecución | Nombre del evento + forma del `detail` |
| 5 | mf-clientes → back-clientes | `fetch` REST/JSON, CORS | `/api/clientes` (CONTRACTS.md) | **URL al compilar** (`VITE_API_URL`) | Contrato HTTP |
| 6 | mf-ventas → back-ventas | `fetch` REST/JSON, CORS | `/api/ventas` | **URL al compilar** (`VITE_API_URL`) | Contrato HTTP |
| 7 | mf-ventas → back-clientes | `fetch` GET, solo lectura | `GET /api/clientes` | **URL al compilar** (`VITE_CLIENTES_API_URL`) | Lectura entre dominios (ver trade-off D8) |
| 8 | Backends → BDs | Protocolo nativo `pg` / `mongodb` por `mf-net` | `DATABASE_URL`, `MONGO_URL` | Ejecución (variables de entorno) | Privado de cada servicio |

Los detalles de las conexiones 5 a 8 están en ADR-0002.

### Flujos de punta a punta

**A. Abrir `http://localhost:5000/clientes`**
1. nginx de la shell responde con `index.html` gracias al fallback de SPA. Se cargan `main.ts` y, de forma asíncrona, `bootstrap.tsx`, que inicializa Module Federation.
2. El router pinta `RemotePage` → `RemoteMount`, que muestra un placeholder de carga y llama a `RemoteLoader.load('mf_clientes')`.
3. El runtime de Module Federation descarga `http://localhost:5001/remoteEntry.js` y luego el chunk de `./mount`. Ese chunk inyecta su CSS (`<link>` absoluto contra :5001).
4. `RemoteMount` llama a `mount(div)`. Vue crea su app en ese `div` y `useClientes` ejecuta `ListarClientes` → `HttpClienteGateway` → `GET http://localhost:3001/api/clientes`.
5. back-clientes consulta Postgres por `mf-net` y devuelve JSON. Vue lo pinta como tabla o tarjetas, según el ancho del contenedor.

**B. Seleccionar un cliente en el dashboard**
1. En mf-clientes, el botón "Seleccionar" publica `clientes:seleccionado {id, nombre}` en `window`.
2. La shell (`WindowEventBus` → `useClienteSeleccionado`) actualiza la etiqueta de la cabecera.
3. mf-ventas (`useClienteSeleccionado`):
   - aplica el filtro `clienteId`, lo que lanza `GET /api/ventas?clienteId=…`;
   - preselecciona el cliente en el formulario;
   - si el cliente no estaba en su selector, lo recarga con `GET /api/clientes`.

**C. Registrar una venta**
1. mf-ventas valida en el cliente (`validarVenta`) y muestra el total en vivo con `CalcularTotalPreview`.
2. Envía `POST http://localhost:3002/api/ventas`. El backend vuelve a validar y calcula el total de forma autoritativa (ADR-0002).
3. Si la respuesta es 201, mf-ventas refresca la lista y publica `ventas:creada {id, clienteId, total}`, y la shell muestra la notificación.

**D. Un remote no está disponible**
1. La descarga de `remoteEntry.js` falla, o `mount()` lanza una excepción.
2. `RemoteMount` o el `ErrorBoundary` lo capturan y pintan `RemoteFallback`. El otro panel y la shell siguen funcionando.
3. Al pulsar "Reintentar", se descarta la caché del loader y se vuelve a intentar la carga.

## Conceptos clave

| Concepto | Significado en este sistema |
|---|---|
| **Microfrontend** | Parte de la UI que pertenece a un dominio y que se construye, prueba y despliega de forma independiente (mf-clientes, mf-ventas). |
| **Shell / host / app container** | Aplicación que compone los microfrontends. Aporta la navegación, el layout y los servicios transversales (cabecera, notificaciones); no implementa lógica de negocio. |
| **Remote** | Aplicación que publica módulos para que otra los cargue en ejecución. |
| **Module Federation (MF)** | Mecanismo de bundler (nacido en Webpack 5; aquí, con el plugin para Vite) para cargar en ejecución módulos compilados por separado y, opcionalmente, compartir dependencias. |
| **`remoteEntry.js`** | Manifiesto/punto de entrada de un remote: dice qué módulos expone y cómo cargar sus chunks. |
| **`exposes` / `remotes` / `shared`** | Qué publica un remote / qué remotes consume el host / qué dependencias se comparten (aquí ninguna). |
| **Composición en el cliente, en ejecución** | La página se ensambla en el navegador al cargar cada remote, no en el servidor ni al compilar. |
| **Contrato de montaje** | Interfaz `mount/unmount` que oculta el framework de cada micro. Patrón *adapter*/*facade* aplicado a la integración. |
| **Bus de eventos (pub/sub)** | Canal de comunicación desacoplado: quien publica no conoce a quien escucha. Aquí es `window` + `CustomEvent`. |
| **Standalone** | Cada remote arranca solo en su puerto con `main.ts(x)`, para desarrollarlo y probarlo de forma aislada. |
| **Error boundary / fallback** | Límite que captura fallos de un subárbol de UI y muestra una alternativa: aislamiento de fallos en el frontend. |
| **`base` / publicPath absoluto** | URL desde la que un remote sirve sus chunks. Debe ser absoluta para que funcionen cuando se cargan desde otro origen. |
| **Configuración al compilar vs en ejecución** | Las `VITE_*` se incrustan al compilar: el artefacto depende del entorno (ver trade-off D7). |
| **Preflight** | Reset CSS global de Tailwind. Solo lo carga la shell. |
| **Prefijo de Tailwind** | `mfc:` / `mfv:` antepuesto a cada utilidad y variable: aísla los estilos sin usar Shadow DOM. |
| **Cascade layers** (`@layer`) | Capas de cascada CSS que fijan la prioridad entre hojas de distintas apps, sea cual sea su orden de carga. |
| **Container queries** | Estilos que dependen del ancho del **contenedor**, no de la ventana. Diseño responsive intrínseco a cada micro. |

## Principios de arquitectura aplicados

| Principio | Cómo se aplica | Dónde |
|---|---|---|
| **Descomposición vertical por dominio** (*bounded context*, DDD estratégico) | Cada dominio es una porción vertical completa: microfront + backend + BD. No se divide por capas técnicas entre equipos. | Estructura del repo |
| **Despliegue independiente** | Cada remote tiene su artefacto, su contenedor y su compose. La shell solo conoce una URL. | §1, ADR-0002 §6 |
| **Ley de Conway / equipos autónomos** | Los límites del sistema coinciden con los posibles equipos (clientes, ventas, plataforma/shell). | Organización |
| **Agnosticismo tecnológico** | El contrato `mount/unmount` permite Vue, React o cualquier otro framework. | §2 |
| **Bajo acoplamiento, alta cohesión** | Entre micros solo hay eventos y contratos HTTP; dentro de cada micro, todo lo de su dominio. | §2, §3 |
| **Contract-first** | `CONTRACTS.md` define puertos, API, nombres de MF y eventos antes de implementar. | CONTRACTS.md |
| **Preferir duplicar a acoplar** (*share nothing*) | Los tipos del contrato se copian en cada app en vez de publicar un paquete común. | §3 |
| **Inversión de dependencias / puertos y adaptadores** | Los casos de uso dependen de puertos (`ClienteGateway`, `RemoteLoader`, `EventBus`), y los adaptadores (fetch, Module Federation, window) se inyectan. | §5 |
| **Composition root** | Un único punto conecta las implementaciones: `di.ts` en los remotes y `bootstrap.tsx` en la shell. | §5 |
| **Aislamiento de fallos (*bulkhead*) y degradación elegante** | Si un panel falla, no arrastra a los demás; hay fallback y reintento. | §4 |
| **Encapsulación** | Los estilos con prefijo y el reset acotado a la raíz del micro evitan efectos laterales globales. | §6 |
| **Diseño responsive intrínseco** | El micro se adapta a su contenedor, sin saber dónde lo ponen. | §6 |

## Decisión

### 1. Integración con Module Federation sobre Vite

Se usa **`@module-federation/vite` 1.23** sobre **Vite 8**, en la shell (host) y en ambos remotes.

| App | Rol | `name` MF | Expone | Puerto |
|---|---|---|---|---|
| `shell` | host | `shell` | — | 5000 |
| `mf-clientes` | remote | `mf_clientes` | `./mount` → `src/bootstrap.ts` | 5001 |
| `mf-ventas` | remote | `mf_ventas` | `./mount` → `src/bootstrap.tsx` | 5002 |

- **Remotes:**
  - Generan `remoteEntry.js` en la raíz de `dist/`, compilan con `build.target: 'esnext'` y tienen `dts: false`.
  - Su `base` es su **origen absoluto** (`MF_PUBLIC_URL`, por defecto `http://localhost:500x/`). Así, los chunks y el CSS se resuelven contra el remote y no contra el origen de la shell.
- **Shell:**
  - Declara los remotes como `type: 'module'`. Las URLs se leen de `VITE_MF_CLIENTES_URL` y `VITE_MF_VENTAS_URL` y se fijan **en build**.
  - Los importa con `import('mf_clientes/mount')` e `import('mf_ventas/mount')`.
  - Arranca de forma asíncrona (`main.ts` → `import('./bootstrap')`) para que Module Federation se inicialice antes que la app.
- **`shared: {}` en las tres apps:** no se comparte ni React ni Vue. Cada remote empaqueta su propio framework.

### 2. Un contrato de montaje agnóstico de framework

La shell no sabe en qué está hecho cada micro. El único contrato es:

```ts
export function mount(el: HTMLElement, props?: { basePath?: string }): void;
export function unmount(el: HTMLElement): void;
```

- **Vue:** `createApp(...).mount(el)`, guardando la instancia en un `WeakMap<HTMLElement, App>`.
- **React:** `createRoot(el).render(...)`, guardando el root en un `WeakMap<HTMLElement, Root>`.
- **Varias instancias:** se pueden montar varias en paralelo, una por elemento. Si se vuelve a montar sobre el mismo elemento, primero se desmonta la instancia anterior.
- **Arranque standalone:** cada remote tiene un `main.ts(x)` que llama a `mount()` sobre `#app`/`#root`.

### 3. Comunicación entre micros con eventos del navegador

No hay estado global ni store compartido. La comunicación usa `CustomEvent` sobre `window`, con un contrato documentado en `CONTRACTS.md`:

| Evento | `detail` | Emite | Escuchan |
|---|---|---|---|
| `clientes:seleccionado` | `{ id, nombre }` | mf-clientes | mf-ventas (filtra y preselecciona el cliente), shell (lo muestra en la cabecera) |
| `ventas:creada` | `{ id, clienteId, total }` | mf-ventas | shell (notificación) |

- **Tipos replicados:** cada app copia los tipos del contrato (`shell/src/contracts/events.ts`, `mf-*/src/infrastructure/events/mfEvents.ts`). **No existe un paquete compartido**, para no acoplar los ciclos de release.
- **Adaptador en la shell:** la shell consume los eventos con un adaptador `WindowEventBus` que implementa el puerto `EventBus`, así que no depende de `window` en su lógica.

### 4. Resiliencia en la shell

- **`RemoteMount`:** es un componente genérico que carga el remote a través del puerto `RemoteLoader`. Muestra un estado de carga, llama a `mount(el)` y llama a `unmount(el)` al desmontarse.
- **Fallos:** un `ErrorBoundary` y un `RemoteFallback` muestran "*X no está disponible ahora mismo*" con un botón **Reintentar**. El fallo queda aislado al panel afectado.
- **Reintento:** `caching-remote-loader` cachea el módulo cargado y **descarta la caché cuando falla**, para que el reintento vuelva a pedir el `remoteEntry.js`.

### 5. Clean Architecture dentro de cada frontend

```
src/
├─ domain/          modelos y puertos (ClienteGateway, VentaGateway, ClientesLookupGateway)
├─ application/     casos de uso; solo dependen de domain
├─ infrastructure/  adaptadores: Http*Gateway (fetch + VITE_API_URL), events/ (CustomEvent)
├─ presentation/    UI: componentes Vue + composables | componentes React + hooks
├─ di.ts            composition root: gateways → casos de uso
├─ bootstrap.ts(x)  mount/unmount (API pública del remote)
└─ main.ts(x)       arranque standalone
```

La shell sigue el mismo patrón:
- **Dominio:** el descriptor `RemoteApp` (`id`, `title`, `basePath`, `description`, `stack`).
- **Aplicación:** los puertos `RemoteLoader` y `EventBus` y el registro de remotes `remote-registry.ts`.
- **Infraestructura:** el loader de Module Federation y `WindowEventBus`.
- **Presentación:** Layout, Header, páginas, `RemoteMount`.
- **Composition root:** `bootstrap.tsx`.

En los tests, los casos de uso se ejercitan con gateways falsos, sin red.

### 6. Estilos aislados con Tailwind CSS v4

- **shell:** Tailwind completo, incluido el *preflight* (reset global). Usa la fuente Inter y modo oscuro por `prefers-color-scheme`.
- **Remotes:** Tailwind con **prefijo propio** (`mfc:` en clientes, `mfv:` en ventas). Las variables de tema llevan el mismo prefijo (`--mfc-*`, `--mfv-*`). Importan solo `theme.css` y `utilities.css`, **sin preflight**, y añaden un reset acotado a su raíz (`.mfc` / `.mfv`). Sus clases de componente (`.mfc-btn`, `.mfv-input`, …) también llevan el prefijo.
- **Diseño responsive por contenedor:** los remotes usan *container queries* (`@container`) y no media queries de ventana. Un micro no sabe si ocupa media pantalla en el dashboard o la pantalla entera. Ejemplo: la tabla de clientes es una lista de tarjetas por debajo de `@4xl` y una tabla a partir de ahí, con un único marcado semántico.
- **Cascade layers:** los niveles `theme, base, components, utilities` de las tres hojas de estilo se fusionan, así que el orden de prioridad es estable sea cual sea el orden de carga.

### 7. Rutas

- **Rutas de la shell** (`react-router-dom` 7): `/` (dashboard con ambos micros), `/clientes/*`, `/ventas/*` y un 404.
- **`basePath`:** la shell se lo pasa al remote en `mount()`. Los remotes actuales no tienen subrutas, pero el contrato ya lo prevé.
- **En producción:** nginx devuelve `index.html` para cualquier ruta (fallback de SPA).

## Alternativas y trade-offs

Cada punto de decisión lista las opciones del mercado, qué se gana y qué se paga con cada una, cuál se eligió (✅) y cuándo convendría reconsiderarla.

### Matriz de atributos de calidad (decisión principal: estrategia de composición)

Escala: `++` muy bien · `+` bien · `0` neutro · `−` mal · `−−` muy mal.

| Atributo de calidad | ✅ MF en cliente | single-spa | Web Components | iframes | Composición en servidor/edge | Paquetes npm al compilar | Apps separadas + proxy |
|---|---|---|---|---|---|---|---|
| Despliegue independiente | ++ | ++ | + | ++ | ++ | −− | ++ |
| Mezclar frameworks | ++ | ++ | ++ | ++ | + | − | ++ |
| UX integrada (una sola página) | ++ | ++ | ++ | −− | + | ++ | − |
| Aislamiento de estilos y errores | + | + | ++ (Shadow DOM) | ++ | + | − | ++ |
| Rendimiento / tamaño | + | + | + | −− | ++ (SSR) | ++ | + |
| SEO / primer render | − | − | − | −− | ++ | + | + |
| Simplicidad operativa | + | 0 | + | + | − (servidor de composición) | ++ | + |
| Madurez y ecosistema | ++ | + | + | ++ | 0 | ++ | ++ |

**Lectura:**
- **Por qué Module Federation:** es la opción con mejor equilibrio entre despliegue independiente, mezcla de frameworks y UX integrada, con la menor complejidad operativa.
- **Qué se sacrifica:** SEO y primer render, que en un back-office interno como este importan poco.
- **Cuándo cambiar:** si el portal pasara a ser público, con SEO crítico, la composición en servidor o edge (D1) ganaría peso.

### D1. Estrategia de composición de la UI

| Opción | A favor | En contra |
|---|---|---|
| ✅ **Composición en el cliente, en ejecución (Module Federation)** | Despliegue independiente; UX de SPA; un mismo documento facilita la comunicación | Depende de que JS cargue bien; render inicial más lento; requiere CORS y URLs estables |
| Composición en el cliente con **single-spa** | Ciclo de vida estándar y maduro; buen soporte multi-framework | Otra capa y otra API que aprender; solapa con MF (a menudo se usan juntos) |
| **Web Components** (custom elements) | Estándar del navegador; Shadow DOM aísla estilos; consumible desde cualquier framework | Estilos y temas compartidos más difíciles; SSR complejo; props por atributos o propiedades |
| **iframes** | Aislamiento total (JS, CSS, fallos y seguridad) | UX pobre (altura, scroll, foco, accesibilidad, deep links); `postMessage`; más peso |
| **Composición en el servidor** (SSI, ESI, Podium, Tailor, Piral SSR) | SEO y primer render excelentes; el HTML llega ensamblado | Requiere un servidor o capa de composición; la hidratación entre frameworks es compleja |
| **Composición en el edge** (CDN workers) | Latencia baja; personalización por petición | Dependencia del proveedor; depuración difícil |
| **Al compilar** (cada micro es un paquete npm) | Lo más simple; bundle optimizado; tipado directo | No hay despliegue independiente: cada cambio exige recompilar y redesplegar la shell |
| **Apps separadas + reverse proxy** (composición por enlaces o rutas) | Lo más desacoplado; cada app es una SPA completa | No se pueden ver dos dominios en la misma pantalla (el dashboard sería imposible); se recarga al navegar |

**Cuándo reconsiderar:** con SEO o primer render críticos (composición en servidor o edge); con requisitos de seguridad que exijan aislamiento fuerte (iframes); si se unifica el framework y el despliegue independiente deja de importar (al compilar).

### D2. Tecnología de carga en ejecución

| Opción | A favor | En contra |
|---|---|---|
| ✅ **`@module-federation/vite`** | Integra con Vite (HMR, velocidad); runtime de MF 2.0 compatible con Webpack/Rspack | Plugin más joven que el de Webpack; arrastra `dts-plugin` con avisos de `npm audit` |
| Webpack 5 Module Federation | El más maduro y documentado | Builds más lentos; abandonar Vite |
| Rspack / Rsbuild + MF 2.0 | Muy rápido; MF nativo y con manifiesto | Otro bundler para todo el equipo |
| **Native Federation** (import maps + ESM) | Basado en estándares, independiente del bundler | Ecosistema menor (centrado en Angular) |
| **Import maps + ESM a mano** (SystemJS, es-module-shims) | Sin plugin; transparente | Hay que gestionar a mano versiones, CSS y dependencias compartidas |
| `@originjs/vite-plugin-federation` | Popular en Vite 4/5 | En dev los remotes deben compilarse; menos mantenido |
| Frameworks de microfrontends (qiankun, Piral, Luigi, Bit) | Lo resuelven todo de serie | Más opinión, más dependencia del proveedor, curva de aprendizaje |

### D3. Compartir dependencias (React/Vue)

| Opción | A favor | En contra |
|---|---|---|
| ✅ **No compartir (`shared: {}`)** | Autonomía total de versiones; sin conflictos de singleton; obligatorio entre Vue y React | Más kB descargados (React viaja dos veces: shell y mf-ventas) |
| Compartir como *singleton* con rango semver | Menos kB; una sola instancia | Acopla versiones entre equipos; un *breaking change* afecta a todos; los errores de versión aparecen en ejecución |
| Compartir solo librerías comunes (fechas, utilidades) | Ahorro parcial | Coordinación de versiones para ganancias pequeñas |

**Cuándo reconsiderar:** si varios remotes usan el mismo framework y el peso pasa a ser un problema. En ese caso, singleton con `requiredVersion` y una política de actualización coordinada.

### D4. Contrato de integración shell ↔ micro

| Opción | A favor | En contra |
|---|---|---|
| ✅ **`mount(el, props)` / `unmount(el)`** | Mínimo y agnóstico; fácil de probar con un loader falso | Las props son estáticas; para actualizarlas habría que añadir `update(props)` |
| Exponer componentes del framework (`<ClientesApp/>`) | Integración natural si todo es React | Obliga a que shell y micro usen el mismo framework y versión |
| Ciclo de vida de single-spa (`bootstrap/mount/unmount`) | Estándar conocido | Dependencia de single-spa |
| Custom element (`<mf-clientes>`) | Estándar; los atributos hacen de props | Hay que registrar el elemento; Shadow DOM opcional |

### D5. Comunicación entre microfrontends

| Opción | A favor | En contra |
|---|---|---|
| ✅ **`CustomEvent` en `window`** | Nativo, sin dependencias, desacoplado | Sin historial: un micro que monta tarde no recibe eventos anteriores; contrato no tipado en ejecución |
| Store global compartido (Redux, Zustand, Pinia, nanostores) | Estado consultable; herramientas de depuración | Acopla a una librería y a un modelo de estado; difícil entre frameworks |
| Props y callbacks desde la shell | Explícito; flujo unidireccional | La shell pasa a conocer el negocio y se vuelve un cuello de botella |
| URL / query string como estado (`?clienteId=`) | Compartible, persistente, enlaces profundos | Solo para estado serializable; cada micro debe vigilar la URL |
| `BroadcastChannel` | Funciona entre pestañas | Excesivo para una sola pestaña |
| Bus con RxJS u observables | Operadores potentes; *replay* del último valor | Otra dependencia compartida |
| `postMessage` | Necesario con iframes | Verboso; hay que validar el origen |

**Riesgo aceptado:** si mf-ventas monta *después* de que se seleccione un cliente, no se entera de la selección. Hoy ambos montan a la vez en el dashboard. **Mitigación posible:** guardar el último valor (`ReplaySubject`, `sessionStorage`) o reflejarlo en la URL.

### D6. Aislamiento de estilos

| Opción | A favor | En contra |
|---|---|---|
| ✅ **Tailwind v4 con prefijo por micro y sin preflight** | Sistema de diseño coherente; aislamiento por nombres; container queries; poco CSS | Clases largas (`mfc:…`); el reset global depende de la shell; se repiten las variables de tema por micro |
| Shadow DOM | Aislamiento real del DOM y del CSS | Fuentes, temas y portales (modales) más difíciles; frameworks con soporte desigual |
| CSS Modules / Vue `scoped` (solución inicial) | Aislamiento automático por hash | Sin sistema de diseño común; responsive a mano |
| CSS-in-JS (styled-components, Emotion) | Estilos junto al componente | Coste en ejecución; no aplica a Vue igual que a React |
| Convenciones (BEM con prefijo) | Sin herramientas | Depende de la disciplina del equipo; nada lo comprueba |
| `@scope` de CSS nativo | Estándar | Soporte de navegadores aún parcial |
| Paquete de design tokens compartido | Una sola fuente de verdad visual | Acopla releases (mitigable con variables CSS en ejecución) |

### D7. Configuración de URLs (remotes y APIs)

| Opción | A favor | En contra |
|---|---|---|
| ✅ **Al compilar (`VITE_*` como `ARG` de Docker)** | Simple; sin peticiones extra | Una imagen por entorno: rompe el principio de "compilar una vez y desplegar en todas partes" |
| `config.json` servido por nginx y leído al arrancar | Una sola imagen para todos los entornos | Una petición más antes de montar |
| `loadRemote` con un manifiesto dinámico (`@module-federation/runtime`) | Remotes descubiertos en ejecución; despliegues canary o A/B | Más complejidad; hay que versionar el manifiesto |
| Rutas relativas detrás de un reverse proxy (`/api/clientes`, `/remotes/clientes`) | Sin CORS ni URLs absolutas; un solo origen | Exige un proxy o ingress como pieza de plataforma |

**Cuándo reconsiderar:** cuando haya más de un entorno (staging, prod). Lo recomendable es mover las URLs a ejecución, con `config.json` o rutas relativas detrás de un ingress.

### D8. Acceso de los micros a los backends

| Opción | A favor | En contra |
|---|---|---|
| ✅ **Directo desde el navegador (CORS)** | Sin piezas extra; latencia mínima | Superficie pública mayor (cada API expuesta); CORS que mantener; mf-ventas conoce la URL de back-clientes |
| **API gateway** (Kong, NGINX, Traefik, cloud) | Un único punto de entrada para autenticación, rate limiting, TLS y observabilidad | Pieza de plataforma más; posible cuello de botella |
| **BFF por microfront** | API a medida de cada UI; agrega datos (p. ej. ventas con el nombre del cliente) | Un servicio más por equipo |
| **GraphQL federation** | Una sola API agregada y tipada | Complejidad alta para dos servicios |

**Cuándo reconsiderar:** al añadir autenticación (un gateway centraliza tokens y CORS), o si mf-ventas necesita más datos de clientes (BFF de ventas).

### D9. Enrutado

| Opción | A favor | En contra |
|---|---|---|
| ✅ **La shell posee las rutas de primer nivel; los micros reciben `basePath`** | Navegación coherente; los micros no chocan entre sí | Las subrutas de un micro necesitarían un router propio sincronizado con la URL |
| Cada micro con su router completo | Autonomía total | Varios routers escuchando el mismo `history`: conflictos |
| Rutas declaradas en un manifiesto que publica cada remote | La shell no se recompila para añadir rutas | Requiere descubrimiento en ejecución (ver D7) |

### D10. Organización del código

| Opción | A favor | En contra |
|---|---|---|
| ✅ **Monorepo de carpetas independientes, sin workspaces** | Una sola vista y un solo PR para cambios transversales; cada carpeta sigue siendo autónoma | Un único historial git; los permisos por equipo requieren CODEOWNERS |
| Polyrepo (un repo por pieza) | Autonomía e historial por equipo | Los cambios de contrato exigen PRs coordinados en varios repos |
| Monorepo con herramientas (Nx, Turborepo, pnpm workspaces) | Caché de builds, grafo de dependencias, paquetes compartidos | Tienta a acoplar mediante paquetes compartidos; más herramientas |

**Resumen de los trade-offs asumidos:** **autonomía y despliegue independiente** a cambio de **más peso, duplicar tipos y configuración fijada al compilar**. Es aceptable para un back-office con pocos equipos; los puntos D7 y D8 son los primeros a revisar al pasar a varios entornos o al añadir autenticación.

## Consecuencias

**Positivas**

- Cada micro se despliega por separado. La shell solo necesita que la URL de su `remoteEntry.js` sea estable.
- Cada equipo puede elegir y actualizar su framework sin coordinarse con los demás.
- Si un remote cae, el resto de la aplicación sigue funcionando y el usuario puede reintentar (comprobado parando el contenedor `mf-ventas`).
- Los estilos no se cruzan entre aplicaciones, y la interfaz se adapta al espacio disponible gracias a las container queries.
- Las capas de Clean Architecture permiten probar los casos de uso sin red: shell 13 tests, mf-clientes 17, mf-ventas 18.

**Negativas y riesgos**

- **Bundles más grandes:** cada remote lleva su framework (≈90 kB JS en mf-clientes, ≈235 kB en mf-ventas, sin comprimir).
- **URLs fijadas en build:** las de los remotes en la shell y `VITE_API_URL` en los remotes. Cambiar de entorno exige recompilar. Si hace falta configurar en runtime, se puede migrar a la API `loadRemote` de `@module-federation/runtime` o a un `config.json` servido por nginx.
- **Contrato de eventos sin validación central:** sus tipos se replican a mano en cada app, así que cambiarlo exige versionarlo en `CONTRACTS.md` y actualizar a los consumidores.
- **Dependencias de desarrollo con avisos:** `@module-federation/dts-plugin` arrastra versiones de `undici` con avisos de `npm audit`. En la shell se corrigió con `overrides`; en los remotes queda pendiente.
- **CORS abierto:** los remotes sirven `Access-Control-Allow-Origin: *`. En producción debería limitarse al origen de la shell.

## Verificación

- **Sin Docker:** `npm run build` (con chequeo de tipos) y `npm test` en `shell/`, `mf-clientes/` y `mf-ventas/`.
- **Con Docker:** `./dev.ps1 up` o `./dev.sh up` levanta todo. Comprobado en navegador headless:
  - ambos remotes renderizan en el dashboard;
  - "Seleccionar" actualiza la cabecera de la shell y preselecciona el cliente en mf-ventas;
  - crear una venta muestra la notificación de la shell;
  - parar `mf-ventas` muestra el fallback y "Reintentar" lo recupera;
  - sin scroll horizontal a 390, 900 y 1440 px, en tema claro y oscuro.
