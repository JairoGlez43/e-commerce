# `src/lib/publish.ts`

> **Qué es:** el botón "Publicar cambios" y el estado de la publicación vistos desde el navegador
> del dueño: pedir una publicación, leer las tres horas que hacen falta y convertirlas en un
> estado · **Lo decidió:** [spec 0016](../../../../docs/specs/0016-publish-changes.md) (Design →
> `src/lib/publish.ts`) · **Lo usan:** solo el `<script>` de
> [`src/pages/admin/index.astro`](../pages/admin/index.astro.md) · **Usa:** `authFetch()` y
> `AuthError` de [`auth.ts`](auth.ts.md), la [Edge Function `publish`](../../supabase/functions/publish/index.ts.md),
> las tablas `publishes` y `catalog_state` de [`publish.sql`](../../supabase/publish.sql.md) y el
> archivo [`/build.json`](../pages/build.json.ts.md) de la web publicada

## Para qué sirve

La web pública es estática: sus páginas se generan en el [build](../../glosario.md#build), así que
lo que el dueño guarda en `/admin/` no se ve hasta el siguiente. La feature 13 le da un botón para
pedir ese build y una línea que le dice en qué punto está. Este archivo es **el único sitio que
sabe hacer las peticiones de publicar y la regla que convierte tres horas en un estado**. Como
[`products.ts`](products.ts.md), corre en el navegador del dueño y solo lo importa el script de
`/admin/`.

### El viaje completo de una publicación

Publicar tiene cinco piezas. Aquí va la historia completa, con una persona de verdad (las horas
son un ejemplo; las de verdad llevan segundos y decimales):

1. **10:00.** El dueño cambia el precio del arroz y pulsa "Guardar". Supabase lo guarda y un
   [trigger](../../glosario.md#trigger) de [`publish.sql`](../../supabase/publish.sql.md) apunta
   la hora del cambio: `catalog_state.changed_at = 10:00`.
2. **10:01.** Pulsa "Publicar cambios". `requestPublish()` (de este archivo) manda un `POST` a la
   [Edge Function](../../glosario.md#edge-function) `publish`, un pequeño programa que corre en los
   servidores de Supabase.
3. **10:01.** La función comprueba que es el dueño (creando una fila en `publishes`, que solo el
   dueño puede crear), llama a la dirección secreta de Vercel que empieza un
   [despliegue](../../glosario.md#despliegue) (el [deploy hook](../../glosario.md#deploy-hook)) y
   contesta con la hora de la petición: `requested_at = 10:01`.
4. **10:01–10:03.** Vercel ejecuta `pnpm build`. El build lee `changed_at` (10:00), lee el
   catálogo, genera las páginas y escribe [`/build.json`](../pages/build.json.ts.md):
   `{ "builtAt": "10:02", "catalogChangedAt": "10:00" }`. Cuando termina, sirve la versión nueva.
5. **10:01:15, 10:01:30…** Mientras, la administración pregunta por `/build.json` cada 15
   segundos ([polling](../../glosario.md#polling)). A las 10:03 ve un `builtAt` (10:02) posterior a
   su `requested_at` (10:01): el build pedido ya está en la web. Enseña "Publicado. La web ya
   muestra los cambios.".

En un servidor Express, el servidor podría guardar "estoy publicando" en una variable y
contestártelo. Aquí no hay servidor propio: la administración **deduce** el estado comparando
tres horas, y todas salen de un servidor (Postgres o la máquina de Vercel), nunca del reloj del
móvil:

| Hora | Se lee de | Qué dice |
|---|---|---|
| `changed_at` | `catalog_state`, en Supabase | cuándo cambió el catálogo por última vez |
| `builtAt` y `catalogChangedAt` | `/build.json`, en la web publicada | cuándo se hizo el build que está en la web, y qué `changed_at` leyó |
| `requested_at` | la última fila de `publishes` | cuándo se pidió la última publicación |

Con ellas, dos preguntas (`publishState()`, bloque 9):

- **¿Hay cambios sin publicar?** Sí, si `changed_at` (lo que hay en la base de datos) es distinto
  del `catalogChangedAt` de la web (lo que leyó su build).
- **¿Hay una publicación en marcha?** Sí, si `requested_at` es **posterior** a `builtAt`: se pidió
  un build después del que está en la web, y todavía no ha llegado.

Así va la tarjeta "Publicar" a lo largo de la historia:

| Momento | `changed_at` | `/build.json` | `requested_at` | Línea |
|---|---|---|---|---|
| 09:30, abre `/admin/` | 08:55 | built 09:00, catalog 08:55 | 08:58 | "La web está al día." |
| 10:00, guarda el precio | 10:00 | built 09:00, catalog 08:55 | 08:58 | "Hay cambios sin publicar." |
| 10:01, pulsa "Publicar cambios" | 10:00 | built 09:00, catalog 08:55 | 10:01 | "Publicando… La web se actualiza en unos minutos." |
| 10:02, recarga la página | 10:00 | built 09:00, catalog 08:55 | 10:01 | "Publicando…" (10:01 es posterior a 09:00) |
| 10:03, el build nuevo está en la web | 10:00 | built 10:02, catalog 10:00 | 10:01 | "Publicado…" y luego "La web está al día." |

Y si el dueño cambia **otro** precio a las 10:02, mientras Vercel construye: `changed_at` pasa a
10:02, pero el build ya había leído 10:00. Cuando ese build llega, `10:02 ≠ 10:00` y la tarjeta
dice "Hay cambios sin publicar.", que es la verdad (spec 0016, AC7).

## El código, por partes

### 1. El comentario de cabecera y el import

```ts
// The owner's "Publicar cambios" and the publish status, with plain fetch and no SDK
// (spec 0016). Browser only: imported by the admin page's script. The single home of the
// publish requests and of the rule that turns three timestamps into a state. Every compared time
// comes from a server (Supabase or the build), never from the phone's clock.
import { AuthError, authFetch } from './auth';
```

- El comentario: "El 'Publicar cambios' del dueño y el estado de la publicación, con `fetch` a
  secas y sin SDK (spec 0016). Solo navegador: lo importa el script de la página de
  administración. El único sitio de las peticiones de publicar y de la regla que convierte tres
  horas en un estado. Cada hora que se compara viene de un servidor (Supabase o el build), nunca
  del reloj del móvil."
- `import { AuthError, authFetch } from './auth';`:
  - `authFetch`: manda una petición a Supabase con la sesión del dueño y la renueva si hace falta
    ([`auth.ts.md`](auth.ts.md#18-capa-2-un-reintento-si-supabase-rechaza-el-token)).
  - `AuthError`: la clase de error de la sesión. Este archivo la usa para el caso "sin conexión"
    de `/build.json` (bloque 8), para que la página enseñe el mismo mensaje que en el resto.

### 2. Los tipos

```ts

export interface Build {
	builtAt: string;
	catalogChangedAt: string;
}
```

- `Build`: la forma de `/build.json` ([interface](../../glosario.md#interface)). Las dos horas son
  textos en [formato ISO](../../glosario.md#fecha-iso); se convierten en números solo para
  compararlas.

```ts

export interface PublishState {
	// The database holds a catalog the live site does not show yet.
	pending: boolean;
	// The last publish was asked for after the live build ran, so its build is still to come.
	publishing: boolean;
}
```

- `PublishState`: las respuestas a las dos preguntas de arriba.
  - `pending`: "La base de datos tiene un catálogo que la web todavía no enseña."
  - `publishing`: "La última publicación se pidió después de que corriera el build que está en la
    web, así que su build aún está por llegar."

### 3. Los errores

```ts

export type PublishErrorKind = 'tooSoon' | 'forbidden' | 'unknown';
```

- Los tres tipos de error propios ([alias de tipo](../../glosario.md#alias-de-tipo)), cada uno con
  su mensaje en la página:
  - `tooSoon`: ya se publicó hace menos de un minuto (la Edge Function contestó `429`).
  - `forbidden`: esta cuenta no es la del dueño (`403`).
  - `unknown`: cualquier otra cosa (`500`, `502`, un `/build.json` raro…).

```ts

// Every function here throws only this or an AuthError (from authFetch(), passed through
// unchanged, or `offline` from readBuild()). The page turns `kind` into a Spanish message.
export class PublishError extends Error {
	constructor(readonly kind: PublishErrorKind) {
		super(`Publish: ${kind}`);
		this.name = 'PublishError';
	}
}
```

- El comentario: "Todas las funciones de aquí lanzan solo esto o un `AuthError` (de `authFetch()`,
  tal cual llega, o `offline` desde `readBuild()`). La página convierte `kind` en un mensaje en
  español."
- La misma idea que `ProductError` en [`products.ts.md`](products.ts.md#3-los-errores): una
  [clase](../../glosario.md#clase) de error propia con su `kind`. Si la sesión se acabó, no hay red
  o hay demasiadas peticiones, llega un `AuthError` (`signedOut`, `offline`, `rate`) que este
  archivo no toca.

### 4. Convertir una respuesta mala en un `PublishError`

```ts

function failure(path: string, response: Response): PublishError {
	if (response.status === 429) return new PublishError('tooSoon');
	if (response.status === 403) return new PublishError('forbidden');
	console.error(`[publish] ${path.split('?')[0]} failed with status ${response.status}`);
	return new PublishError('unknown');
}
```

- `failure()` **devuelve** el error; quien la llama escribe `throw failure(…)`.
- `429` → `tooSoon`; `403` → `forbidden` ([códigos de estado](../../glosario.md#codigo-de-estado-http)).
- Todo lo demás: una línea en la consola del navegador para quien programa, por ejemplo
  `[publish] /functions/v1/publish failed with status 502`, y `unknown`. `path.split('?')[0]`
  quita la parte `?…` de la ruta.
- ¿Y el `401`? Nunca llega aquí: `authFetch()` renueva el token y repite la petición; si sigue
  siendo `401`, lanza un `AuthError('signedOut')` antes de devolver nada.

### 5. Pedir una publicación: `requestPublish()`

```ts

// Starts one build of the public site through the Edge Function `publish`
// (supabase/functions/publish/index.ts). Returns when the request was recorded.
export async function requestPublish(): Promise<string> {
	const path = '/functions/v1/publish';
	const response = await authFetch(path, { method: 'POST', body: '{}' });
```

- El comentario: "Empieza un build de la web pública a través de la Edge Function `publish`.
  Vuelve cuando la petición quedó apuntada." Es decir, **no** espera al build: vuelve en cuanto la
  función contesta, en uno o dos segundos.
- `authFetch(path, { method: 'POST', body: '{}' })`: `POST` a
  `https://<ref>.supabase.co/functions/v1/publish`. `authFetch` pone delante la dirección del
  proyecto y añade tres cabeceras: `apikey` (la clave publishable), `Content-Type` y
  `Authorization: Bearer <token del dueño>`. Por eso la Edge Function permite justo esas en
  [CORS](../../glosario.md#cors).
- `body: '{}'`: un cuerpo vacío, ya como texto. La función no lo lee, pero un `POST` con cuerpo
  JSON es la forma normal, y `authFetch` necesita el cuerpo en texto para poder mandar la petición
  dos veces si tiene que renovar el token.

```ts
	if (response.status !== 200) throw failure(path, response);
	const body = (await response.json()) as { requested_at?: unknown };
	if (typeof body.requested_at !== 'string') throw new PublishError('unknown');
	return body.requested_at;
}
```

- Cualquier estado distinto de `200` → el error del bloque 4.
- `as { requested_at?: unknown }`: no nos fiamos de la forma del cuerpo
  ([record-y-unknown](../../glosario.md#record-y-unknown)). `typeof … !== 'string'` lo comprueba:
  si no hay un texto, `unknown`.
- Devuelve la hora **del servidor** a la que se pidió la publicación, por ejemplo
  `"2026-10-28T10:01:00.123456+00:00"`. La página la usa para saber cuándo llega su build.

### 6. La última publicación: `lastPublish()`

```ts

// The time of the last publish request, or null if there was never one. Only the owner can read it.
export async function lastPublish(): Promise<string | null> {
	const path = '/rest/v1/publishes?select=requested_at&order=requested_at.desc&limit=1';
	const response = await authFetch(path);
	if (response.status !== 200) throw failure(path, response);
	const [row] = (await response.json()) as { requested_at: string }[];
	return row?.requested_at ?? null;
}
```

- El comentario: "La hora de la última petición de publicar, o `null` si nunca hubo ninguna. Solo
  el dueño puede leerla."
- La petición a [PostgREST](../../glosario.md#postgrest): de `publishes`, la columna
  `requested_at`, de la más nueva a la más vieja, solo una. La misma que hace la Edge Function en
  su paso 2.
- `const [row] = …`: la primera fila, o `undefined` si la lista llegó vacía
  ([desestructuración](../../glosario.md#desestructuracion)).
- `row?.requested_at ?? null`: su hora, o `null` si no hay fila
  ([encadenamiento opcional](../../glosario.md#encadenamiento-opcional), [nullish](../../glosario.md#nullish)).
- Sirve para lo que no sabe la página por sí sola: si el dueño **recarga** `/admin/` mientras se
  construye, o la abre en otro móvil, no recuerda que pulsó el botón. Esta hora se lo dice
  (spec 0016, AC6).

### 7. La hora del último cambio: `catalogChangedAt()`

```ts

// When the catalog last changed in the database (the trigger's stamp).
export async function catalogChangedAt(): Promise<string> {
	const path = '/rest/v1/catalog_state?select=changed_at';
	const response = await authFetch(path);
	if (response.status !== 200) throw failure(path, response);
	const [row] = (await response.json()) as { changed_at: string }[];
	if (row === undefined) throw new PublishError('unknown');
	return row.changed_at;
}
```

- El comentario: "Cuándo cambió el catálogo en la base de datos (el sello del trigger)."
- Lee la única fila de `catalog_state`. Esa tabla se puede leer sin sesión, pero pasa igualmente
  por `authFetch()`: es la única puerta de este archivo a Supabase y ya conoce la dirección y la
  clave del proyecto.
- Si la lista llega vacía (la tabla no existe o algo raro), `unknown`.
- Devuelve el texto **tal cual** lo escribió PostgREST. No se convierte en fecha, porque el
  bloque 9 lo compara como texto con el que copió el build.

### 8. Lo que hay en la web: `readBuild()`

```ts

// The live site's /build.json, same origin, never from the browser's cache.
export async function readBuild(): Promise<Build> {
	let response: Response;
	try {
		response = await fetch('/build.json', { cache: 'no-store' });
	} catch {
		throw new AuthError('offline');
	}
```

- El comentario: "El `/build.json` de la web publicada, del mismo origen, nunca de la caché del
  navegador."
- `fetch('/build.json', …)`: una dirección **relativa**: el mismo sitio que la página. Si el dueño
  está en `https://tienda-demo-cuba.vercel.app/admin/`, pide
  `https://tienda-demo-cuba.vercel.app/build.json`. Por eso no hace falta ni sesión ni
  [CORS](../../glosario.md#cors), y no pasa por `authFetch`: no es Supabase, es la propia web.
- `{ cache: 'no-store' }`: que el navegador no use una copia guardada
  ([cache-no-store](../../glosario.md#cache-no-store)). Sin esto, podría contestar con el
  `/build.json` de hace un minuto y la página no vería nunca el build nuevo.
- `catch { throw new AuthError('offline'); }`: `fetch` solo lanza un error cuando no puede ni
  conectar ([fetch](../../glosario.md#fetch)). Se convierte en el mismo `offline` que usa
  `auth.ts`, así la página enseña el mismo "Sin conexión…".

```ts
	if (!response.ok) {
		console.error(`[publish] /build.json failed with status ${response.status}`);
		throw new PublishError('unknown');
	}
```

- Si el servidor contesta con un error (por ejemplo un `404`, si la web publicada es anterior a
  la feature 13 y no tiene `/build.json`), una línea en la consola y `unknown`.

```ts
	try {
		const body = (await response.json()) as Partial<Build>;
		if (typeof body.builtAt === 'string' && typeof body.catalogChangedAt === 'string') {
			return { builtAt: body.builtAt, catalogChangedAt: body.catalogChangedAt };
		}
	} catch {
		// Not JSON: refused below.
	}
	throw new PublishError('unknown');
}
```

- `as Partial<Build>`: un `Build` en el que cada campo puede faltar
  ([tipos utilitarios](../../glosario.md#tipos-utilitarios)). Así TypeScript obliga a comprobar
  cada uno.
- Si los dos campos son textos, devuelve un objeto **nuevo** solo con ellos (si el archivo trajera
  algo más, se ignora).
- El `catch` vacío: "No es JSON: se rechaza abajo." Si `.json()` falla, no se hace nada y se sigue.
- `throw new PublishError('unknown')`: se llega aquí si el cuerpo no era JSON o le faltaba un
  campo.

### 9. La regla: `publishState()`

```ts

// The stamps are compared as PostgREST wrote them, so equal strings mean the same catalog.
export function publishState(build: Build, changedAt: string, requestedAt: string | null): PublishState {
	return {
		pending: changedAt !== build.catalogChangedAt,
		publishing: requestedAt !== null && Date.parse(requestedAt) > Date.parse(build.builtAt),
	};
}
```

- El comentario: "Los sellos se comparan tal como los escribió PostgREST, así que dos textos
  iguales significan el mismo catálogo."
- Una función **pura**: no hace peticiones ni toca la página; recibe tres valores y devuelve un
  resultado. Con los mismos datos, siempre la misma respuesta. Es toda la lógica de la tabla de
  arriba.
- `pending: changedAt !== build.catalogChangedAt`: ¿la hora de la base de datos es distinta de la
  que leyó el build de la web? Las dos salen del mismo sitio (PostgREST, como texto), así que se
  comparan como texto, carácter a carácter. Si el dueño no ha cambiado nada desde ese build, son
  idénticas.
- `publishing: requestedAt !== null && …`: si nunca se publicó, no hay nada en marcha. Si no:
  - `Date.parse(requestedAt) > Date.parse(build.builtAt)`: las dos horas pasadas a milisegundos
    ([fecha ISO](../../glosario.md#fecha-iso)) y comparadas. Aquí no basta con comparar textos,
    porque vienen de sitios distintos y con formatos distintos: `requested_at` de Postgres
    (`…10:01:00.123456+00:00`) y `builtAt` de la máquina de Vercel (`…10:02:30.123Z`). Como
    número, los dos dicen el mismo tipo de cosa.
  - Si la petición es **posterior** al build que está en la web, ese build no puede incluirla:
    todavía se está construyendo.

## Cómo se conecta

- **Entra:** las llamadas del script de [`admin/index.astro`](../pages/admin/index.astro.md):
  `readBuild()`, `catalogChangedAt()` y `lastPublish()` a la vez al abrir la vista; luego
  `readBuild()` cada 15 s mientras vigila una publicación, y `requestPublish()` al pulsar el botón.
- **Habla con:**
  - la [Edge Function `publish`](../../supabase/functions/publish/index.ts.md) y las tablas de
    [`publish.sql`](../../supabase/publish.sql.md), siempre a través de `authFetch()` de
    [`auth.ts`](auth.ts.md);
  - el archivo `/build.json` de la propia web, que escribe [`build.json.ts`](../pages/build.json.ts.md)
    en cada build, con `fetch` a secas.
- **Sale:** textos de hora, objetos `Build` y `PublishState`, y errores (`PublishError` o
  `AuthError`) hacia la página, que decide qué línea enseñar y cuándo volver a preguntar.

## Prueba tú

Prueba la regla de `publishState()` en la terminal, sin tocar nada del proyecto. Es la misma
comparación, copiada en un comando, con las horas de la segunda tabla de arriba.

1. En la terminal de VS Code (Git Bash), ejecuta:

   ```bash
   node -e 'const s = (b, c, r) => ({ pending: c !== b.catalogChangedAt, publishing: r !== null && Date.parse(r) > Date.parse(b.builtAt) }); const viejo = { builtAt: "2026-10-28T09:00:00Z", catalogChangedAt: "2026-10-28T08:55:00+00:00" }; const nuevo = { builtAt: "2026-10-28T10:02:00Z", catalogChangedAt: "2026-10-28T10:00:00+00:00" }; console.log(s(viejo, "2026-10-28T10:00:00+00:00", "2026-10-28T08:58:00+00:00")); console.log(s(viejo, "2026-10-28T10:00:00+00:00", "2026-10-28T10:01:00+00:00")); console.log(s(nuevo, "2026-10-28T10:00:00+00:00", "2026-10-28T10:01:00+00:00"));'
   ```

   **Qué deberías ver:** tres líneas:
   `{ pending: true, publishing: false }` ("Hay cambios sin publicar."),
   `{ pending: true, publishing: true }` ("Publicando…") y
   `{ pending: false, publishing: false }` ("La web está al día.").
2. Cambia en la última llamada `"2026-10-28T10:00:00+00:00"` (el primero de los dos textos) por
   `"2026-10-28T10:02:30+00:00"`, como si el dueño hubiera cambiado otro precio durante el build,
   y vuelve a ejecutar. **Qué deberías ver:** la última línea pasa a `pending: true`.
3. No hay nada que deshacer: el comando no toca ningún archivo.

## Términos

- [polling](../../glosario.md#polling) · [cache-no-store](../../glosario.md#cache-no-store) ·
  [fecha-iso](../../glosario.md#fecha-iso) · [edge-function](../../glosario.md#edge-function) ·
  [deploy-hook](../../glosario.md#deploy-hook) · [despliegue](../../glosario.md#despliegue) ·
  [cors](../../glosario.md#cors) · [trigger](../../glosario.md#trigger) (nuevos)
- [fetch](../../glosario.md#fetch) · [postgrest](../../glosario.md#postgrest) ·
  [codigo-de-estado-http](../../glosario.md#codigo-de-estado-http) · [build](../../glosario.md#build)
- [interface](../../glosario.md#interface) · [alias-de-tipo](../../glosario.md#alias-de-tipo) ·
  [clase](../../glosario.md#clase) · [record-y-unknown](../../glosario.md#record-y-unknown) ·
  [tipos-utilitarios](../../glosario.md#tipos-utilitarios) ·
  [desestructuracion](../../glosario.md#desestructuracion) ·
  [encadenamiento-opcional](../../glosario.md#encadenamiento-opcional) ·
  [nullish](../../glosario.md#nullish)
