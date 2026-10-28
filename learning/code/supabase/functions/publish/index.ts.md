# `supabase/functions/publish/index.ts`

> **Qué es:** la [Edge Function](../../../glosario.md#edge-function) `publish`: el pequeño
> programa que Supabase ejecuta cuando el dueño pulsa "Publicar cambios". Comprueba que es el
> dueño y llama al [deploy hook](../../../glosario.md#deploy-hook) secreto de Vercel, que
> reconstruye la web pública · **Lo decidió:**
> [spec 0016](../../../../../docs/specs/0016-publish-changes.md) (Decision y Design →
> `supabase/functions/publish/index.ts`), sobre el camino que eligió la
> [spec 0012](../../../../../docs/specs/0012-admin-backend.md) · **Lo usan:** `requestPublish()`
> de [`src/lib/publish.ts`](../../../src/lib/publish.ts.md), desde el navegador del dueño, con
> `POST https://<ref>.supabase.co/functions/v1/publish` · **Usa:** la tabla `publishes` de
> [`supabase/publish.sql`](../../publish.sql.md) a través de la
> [API REST](../../../glosario.md#api-rest), el secreto `DEPLOY_HOOK_URL` y dos variables que pone
> Supabase (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`)

## Para qué sirve

Hasta ahora, todo el código del proyecto corría **en el build** (en tu PC o en Vercel) o **en el
navegador** del dueño. Este archivo es el primero que corre en un **servidor**: los de Supabase.
Hace falta porque publicar necesita un secreto.

Publicar es pedir a Vercel un [despliegue](../../../glosario.md#despliegue) nuevo: que vuelva a
ejecutar `pnpm build` (que lee el catálogo de Supabase con los cambios del dueño) y sirva el
resultado. Vercel da para eso una dirección, el **deploy hook**, a la que basta con mandar un
`POST`. Pero esa dirección **es la llave**: quien la tenga puede lanzar builds sin límite. No
puede estar en el código del navegador (cualquiera puede leerlo con F12) ni en el repo. Tiene que
vivir en un servidor, y el proyecto no tiene uno propio: la web son archivos estáticos.

Si el proyecto tuviera un servidor Express, lo resolverías así:

```js
// Not in the project: what this function would be in Express.
app.post('/publish', requireOwner, async (req, res) => {
	await fetch(process.env.DEPLOY_HOOK_URL, { method: 'POST' });
	res.json({ requested_at: new Date().toISOString() });
});
```

Una Edge Function es exactamente eso, **una sola ruta**, pero sin tener que mantener un servidor
encendido: Supabase la guarda y la ejecuta solo cuando alguien la llama. Corre con
[Deno](../../../glosario.md#deno), no con Node. Y el `requireOwner` no está en el código: lo hace
Postgres, con la política de la tabla `publishes` (más abajo).

### El viaje completo de una publicación

Este archivo es una pieza de cinco. Así va todo, con una persona de verdad (las horas son un
ejemplo; en la realidad llevan segundos y decimales):

| Hora | Quién | Qué pasa |
|---|---|---|
| 10:00 | El dueño, en `/admin/` | Cambia el precio del arroz y pulsa "Guardar". [`products.ts`](../../../src/lib/products.ts.md) manda un `PATCH` a Supabase. Postgres lo guarda y el [trigger](../../../glosario.md#trigger) de [`publish.sql`](../../publish.sql.md) apunta `catalog_state.changed_at = 10:00`. La tarjeta "Publicar" dice "Hay cambios sin publicar.". La web pública sigue con el precio viejo: se construyó a las 09:00, y su `/build.json` dice `"catalogChangedAt": "08:55"`. |
| 10:01 | El dueño | Pulsa "Publicar cambios". `requestPublish()` de [`publish.ts`](../../../src/lib/publish.ts.md) manda `POST /functions/v1/publish` con su [access token](../../../glosario.md#access-token). |
| 10:01 | **Esta función**, en Supabase | (1) ¿Trae el token? Sí. (2) ¿Hubo otra publicación hace menos de 60 s? No. (3) Crea una fila en `publishes` **con el token del dueño**: la política `is_owner()` la deja pasar, así que es el dueño. (4) Manda `POST` al deploy hook secreto. Vercel contesta "vale". (5) Contesta al móvil: `200` con `{ "requested_at": "10:01" }`. |
| 10:01–10:03 | Vercel | Ejecuta `pnpm build`. El build lee primero `changed_at` (10:00) y después las tablas, genera las páginas con el precio nuevo y escribe `/build.json` = `{ "builtAt": "10:02", "catalogChangedAt": "10:00" }` ([`build.json.ts`](../../../src/pages/build.json.ts.md)). Cuando termina, empieza a servir la versión nueva. |
| 10:01:15, 10:01:30… | La administración | Cada 15 s lee `/build.json` ([polling](../../../glosario.md#polling)): `builtAt` sigue siendo 09:00, anterior a 10:01, así que sigue diciendo "Publicando… La web se actualiza en unos minutos.". |
| 10:03 | La administración | Lee `builtAt: 10:02`, **posterior** a 10:01: el build pedido ya está en la web. Vuelve a leer `changed_at` (10:00), igual al `catalogChangedAt` del build. Enseña "Publicado. La web ya muestra los cambios." y luego "La web está al día.". |

Todas las horas que se comparan salen de un servidor (Postgres o la máquina de Vercel), nunca del
reloj del móvil, que puede estar mal puesto.

## El código, por partes

### 1. El comentario de cabecera

```ts
// Edge Function `publish` (spec 0016): the owner's "Publicar cambios" starts one build of the
// public site. Deno, one file, no imports, no SDK. Pasted into the Supabase dashboard editor;
// this file is the copy kept in the repo.
// The database decides who is the owner: the `publishes` row is inserted with the caller's own
// JWT, and its RLS policy is public.is_owner(). Only after that insert works is the deploy hook
// called. The hook URL is a secret and never leaves this function.
```

- "Edge Function `publish` (spec 0016): el 'Publicar cambios' del dueño empieza un build de la web
  pública. Deno, un archivo, sin imports, sin SDK. Se pega en el editor del panel de Supabase;
  este archivo es la copia que se guarda en el repo."
  - "Sin imports, sin SDK": no usa ninguna librería, ni la de Supabase. Solo `fetch`, como el
    resto del proyecto.
  - "Se pega en el editor del panel": el proyecto no usa la herramienta de comandos de Supabase
    (spec 0013). Para crear o cambiar la función, el dueño abre *Edge Functions* en el panel,
    pega este código y pulsa *Deploy*. Si alguien cambia la función en el panel sin cambiar este
    archivo, el repo deja de decir la verdad: los dos se cambian juntos.
- "La base de datos decide quién es el dueño: la fila de `publishes` se inserta con el propio
  [JWT](../../../glosario.md#jwt) de quien llama, y su política [RLS](../../../glosario.md#rls) es
  `public.is_owner()`. Solo después de que ese insert funcione se llama al deploy hook. La URL
  del hook es un secreto y nunca sale de esta función."

### 2. Las cabeceras CORS y la pausa mínima

```ts

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
```

- El problema: la página `/admin/` vive en `https://tienda-demo-cuba.vercel.app` y la función en
  `https://<ref>.supabase.co`. Son **orígenes distintos**, así que el navegador aplica
  [CORS](../../../glosario.md#cors): antes del `POST` manda solo un `OPTIONS` de prueba (el
  *preflight*), y después solo deja que el JavaScript lea la respuesta si trae el permiso. La API
  REST y la de Auth de Supabase ya contestan esto por su cuenta; una Edge Function es código
  nuestro, así que tiene que hacerlo ella.
- `CORS`: un objeto con las tres cabeceras que irán en **todas** las respuestas (bloque 3):
  - `Access-Control-Allow-Origin: *`: cualquier origen puede leer la respuesta. No es un
    agujero: lo que protege la función es el token del dueño y la política de Postgres, no el
    origen. Una página de otro sitio no puede conseguir el token del dueño, que vive en el
    [localStorage](../../../glosario.md#localstorage) de `/admin/`.
  - `Access-Control-Allow-Headers`: las cabeceras que se pueden mandar. `authorization` (el
    token) y `apikey` y `content-type` (que pone `authFetch()` en cada petición) son las que
    usamos; `x-client-info` la manda la librería oficial de Supabase y la recomienda su
    documentación (spec 0016).
  - `Access-Control-Allow-Methods: POST, OPTIONS`: los dos métodos que acepta.

```ts
// Stops double taps and protects the hook's limit of 60 triggers an hour.
const MIN_GAP_MS = 60_000;
```

- El comentario: "Frena los toques dobles y protege el límite del hook de 60 llamadas por hora."
- `MIN_GAP_MS = 60_000`: 60 000 milisegundos, un minuto. Entre dos publicaciones tiene que pasar
  al menos eso (bloque 7). El `_` solo separa las cifras para leerlas.

### 3. Las dos variables que pone Supabase

```ts

// Injected by Supabase into every function. Never a secret or service-role key: every database
// call below runs as the caller, under RLS.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const PUBLISHABLE_KEY: string = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}').default;
```

- El comentario: "Las pone Supabase en cada función. Nunca una clave secreta ni de *service role*:
  cada llamada a la base de datos de abajo corre como quien llama, bajo RLS." (La clave
  *service role* es otra clave secreta antigua de Supabase, que, como la `sb_secret_`, se salta
  RLS; ver [clave publishable](../../../glosario.md#clave-publishable).)
- `Deno.env.get('SUPABASE_URL')`: lee la [variable de entorno](../../../glosario.md#variable-de-entorno)
  con la dirección del proyecto, `https://<ref>.supabase.co` ([Deno](../../../glosario.md#deno)).
  Nadie la configura: Supabase la pone en cada función.
  - `Deno.env.get` devuelve `string | undefined` (por si no existe). El `!` del final dice "seguro
    que existe" ([afirmación de no nulo](../../../glosario.md#afirmacion-no-nulo)), porque Supabase
    siempre la pone.
- `Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')`: otra variable que pone Supabase, con **todas** las
  claves publishable del proyecto en un texto JSON, algo como
  `{"default":"sb_publishable_…"}`.
  - `?? '{}'`: si no existiera, un objeto vacío en texto ([nullish](../../../glosario.md#nullish)).
  - `JSON.parse(…)`: convierte el texto en un objeto.
  - `.default`: la clave llamada `default`. Si no hay, `undefined`, y las peticiones a la base de
    datos fallarían con un error que la función convierte en `unknown` (bloque 6).
- Estas dos constantes están **fuera** de cualquier función: se leen una vez, cuando Supabase
  arranca la función, y sirven para todas las peticiones.
- Lo importante es lo que **no** hay: ninguna clave que se salte RLS. Toda llamada a la base de
  datos lleva la clave publishable y el token del dueño, así que Postgres la trata exactamente
  igual que si la hiciera el propio navegador del dueño. Si alguien sin permiso llegara a llamar a
  esta función, Postgres le diría que no.

### 4. Contestar: `reply()`

```ts

function reply(status: number, body?: unknown): Response {
	if (body === undefined) return new Response(null, { status, headers: CORS });
	return Response.json(body, { status, headers: CORS });
}
```

- La única forma de contestar de este archivo, así **todas** las respuestas llevan las cabeceras
  `CORS`, también las de error. Sin ellas, el navegador escondería un `401` o un `429` al
  JavaScript y la administración solo vería "algo falló", sin saber qué.
- `body?: unknown`: el cuerpo es opcional ([record-y-unknown](../../../glosario.md#record-y-unknown)).
- Sin cuerpo: `new Response(null, { status, headers: CORS })`, una respuesta vacía con ese
  [código de estado](../../../glosario.md#codigo-de-estado-http) (`204`, `405`).
- Con cuerpo: `Response.json(body, { … })` crea una respuesta cuyo cuerpo es `body` en JSON, con
  `Content-Type: application/json`. Es el `res.status(…).json(…)` de Express, pero en vez de
  enviarla, se **devuelve**.

### 5. Fallar con un registro: `fail()`

```ts

// Logs name the step and the status, never a header, a token or the hook URL.
function fail(step: string, detail: string | number, status: number, error: string): Response {
	console.error(`[publish] ${step} failed (${detail})`);
	return reply(status, { error });
}
```

- El comentario: "Los registros nombran el paso y el estado, nunca una cabecera, un token ni la
  URL del hook."
- `console.error(…)`: en una Edge Function, no sale en ningún navegador; queda en los registros de
  la función en el panel de Supabase (*Edge Functions* → `publish` → *Logs*). Por ejemplo:
  `[publish] deploy hook failed (404)`. Quien programa ve **qué paso** falló y con qué estado,
  pero nunca datos que sirvan para entrar.
- `reply(status, { error })`: contesta con ese estado y un cuerpo como `{ "error": "hook" }`.
  `{ error }` es la forma corta de `{ error: error }`. El texto (`signedOut`, `forbidden`…) es lo
  que mira `publish.ts`.

### 6. Hablar con la base de datos como el dueño: `database()`

```ts

// A PostgREST call made as the caller: their Authorization header goes on unchanged, and the
// apikey is the project's own publishable key, never the one the caller sent.
function database(path: string, authorization: string, init: RequestInit = {}): Promise<Response> {
	return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
		...init,
		headers: {
			apikey: PUBLISHABLE_KEY,
			Authorization: authorization,
			'Content-Type': 'application/json',
			Prefer: 'return=representation',
		},
	});
}
```

- El comentario: "Una llamada a PostgREST hecha como quien llama: su cabecera `Authorization` pasa
  sin cambios, y la `apikey` es la clave publishable del propio proyecto, nunca la que mandó quien
  llama."
- `database(path, authorization, init)`: una petición a la API de
  [PostgREST](../../../glosario.md#postgrest), como las de `products.ts`, pero desde el servidor.
  - `path`: la tabla y el filtro, por ejemplo `publishes?select=requested_at`.
  - `authorization`: la cabecera tal como llegó del navegador, `Bearer <token del dueño>`.
  - `init: RequestInit = {}`: método y cuerpo; por defecto, un `GET`
    ([valor por defecto](../../../glosario.md#valor-por-defecto)).
- `fetch(`${SUPABASE_URL}/rest/v1/${path}`, …)`: la dirección completa,
  `https://<ref>.supabase.co/rest/v1/publishes?…` ([fetch](../../../glosario.md#fetch)).
- `...init`: copia el método y el cuerpo ([spread](../../../glosario.md#spread)); después,
  `headers` pone las cuatro cabeceras:
  - `apikey: PUBLISHABLE_KEY`: la clave del proyecto (bloque 3), no la que traía el navegador. Así
    la función no se fía de nada que mande quien llama, salvo su token.
  - `Authorization: authorization`: el token del dueño, sin tocar. Con él, Postgres usa el rol
    `authenticated` y `is_owner()` puede mirar su `app_metadata`
    ([rol](../../../glosario.md#rol), [app-metadata](../../../glosario.md#app-metadata)).
  - `Content-Type: application/json`: el cuerpo, si hay, es JSON.
  - `Prefer: return=representation`: "devuélveme la fila creada"
    ([prefer-return-representation](../../../glosario.md#prefer-return-representation)); el
    bloque 8 necesita su `id` y su `requested_at`.

### 7. Traducir un rechazo: `refused()`

```ts

// An expired token answers 401, so authFetch() in the admin refreshes it and tries once more.
function refused(step: string, response: Response): Response {
	if (response.status === 401) return fail(step, 401, 401, 'signedOut');
	if (response.status === 403) return fail(step, 403, 403, 'forbidden');
	return fail(step, response.status, 500, 'unknown');
}
```

- El comentario: "Un token caducado contesta `401`, así que `authFetch()` en la administración lo
  renueva y lo intenta una vez más."
- Convierte una respuesta mala de PostgREST en la respuesta de la función:
  - `401` (el token no vale, por ejemplo porque caducó) → `401` `signedOut`. Se devuelve **el
    mismo** `401` a propósito: `authFetch()` de [`auth.ts`](../../../src/lib/auth.ts.md#18-capa-2-un-reintento-si-supabase-rechaza-el-token)
    trata cualquier `401` como "token rechazado", lo renueva y repite la petición una vez. Así,
    una sesión caducada se arregla sola, también al publicar.
  - `403` (el token vale, pero RLS dice que no: no es el dueño) → `403` `forbidden`.
  - Cualquier otra cosa → `500` `unknown`, con el estado real en el registro.

### 8. Publicar, paso a paso: `publish()`

```ts

async function publish(authorization: string): Promise<Response> {
	// Step 2: at most one publish a minute. RLS hides the rows from anyone but the owner.
	const last = await database('publishes?select=requested_at&order=requested_at.desc&limit=1', authorization);
	if (!last.ok) return refused('read last publish', last);
```

- `publish(authorization)`: los pasos 2 a 5 de la tabla de la spec (el paso 1, en el bloque 9).
- El comentario: "Paso 2: como mucho una publicación por minuto. RLS esconde las filas a todos
  menos al dueño."
- La petición: "de `publishes`, la columna `requested_at`, de la más nueva a la más vieja
  (`order=requested_at.desc`), solo una (`limit=1`)". Es decir, la última publicación.
- `if (!last.ok) return refused(…)`: si Supabase no contesta con un 2xx, el rechazo del bloque 7.

```ts
	const [lastRow] = (await last.json()) as { requested_at: string }[];
	if (lastRow && Date.now() - Date.parse(lastRow.requested_at) < MIN_GAP_MS) {
		return reply(429, { error: 'tooSoon' });
	}
```

- `const [lastRow] = …`: el primer elemento de la lista ([desestructuración](../../../glosario.md#desestructuracion)),
  o `undefined` si la lista está vacía (nunca se publicó).
  `as { requested_at: string }[]` dice a TypeScript qué forma tiene
  ([afirmación de tipo](../../../glosario.md#afirmacion-de-tipo)).
- `Date.now() - Date.parse(lastRow.requested_at)`: cuántos milisegundos pasaron desde la última
  petición ([fecha ISO](../../../glosario.md#fecha-iso)). `Date.now()` lee aquí el reloj **del
  servidor de Supabase**, no el del móvil, así que es fiable.
- Si pasaron menos de 60 s → `429` `{ "error": "tooSoon" }`
  ([429](../../../glosario.md#codigo-de-estado-http): "demasiadas peticiones, espera"). La
  administración enseña "Acabas de publicar. Espera un minuto y vuelve a intentarlo." (AC9).
- Fíjate en que si quien llama no es el dueño, RLS le esconde las filas: la lista llega vacía
  y pasa este paso. No importa: el paso siguiente lo para.

```ts

	// Step 3: the owner check. Only is_owner() lets this insert through.
	const insert = await database('publishes', authorization, { method: 'POST', body: '{}' });
	if (insert.status !== 201) return refused('insert publish', insert);
```

- El comentario: "Paso 3: la comprobación del dueño. Solo `is_owner()` deja pasar este insert."
- `POST /rest/v1/publishes` con el cuerpo `{}`: "crea una fila con todos los valores por defecto"
  (número, hora del servidor e id del usuario; ver [`publish.sql.md`](../../publish.sql.md#6-la-tabla-publishes-una-fila-por-petición)).
- Aquí se decide todo. La política "owner adds publishes" mira el JWT: si es el del dueño, la
  fila se crea y PostgREST contesta `201` (creado). Si no, Postgres da `42501` y PostgREST
  contesta `403`, que `refused()` devuelve como `403` `forbidden` (AC2). Vercel ni se entera.
- `insert.status !== 201`: cualquier estado distinto de "creado" es un rechazo.

```ts
	const rows = (await insert.json()) as { id: number; requested_at: string }[];
	const [row] = rows;
	if (rows.length !== 1 || row === undefined) return fail('insert publish', 'no row', 500, 'unknown');
```

- Gracias a `Prefer: return=representation`, la respuesta trae la fila creada, con su `id` y su
  `requested_at`.
- Si no llegara exactamente una fila (no debería pasar), `500` `unknown` con "no row" en el
  registro. Es la misma desconfianza que `onlyRow()` en
  [`products.ts`](../../../src/lib/products.ts.md#13-una-sola-fila-o-nada-onlyrow).

```ts

	// Step 4: the deploy hook. On failure the row goes, so the 60 s gap does not block a retry.
	const hook = Deno.env.get('DEPLOY_HOOK_URL');
	let hookStatus: string | number = 'no secret';
```

- El comentario: "Paso 4: el deploy hook. Si falla, la fila se va, para que la pausa de 60 s no
  impida reintentar."
- `Deno.env.get('DEPLOY_HOOK_URL')`: el **secreto** que el dueño guardó en el panel (*Edge
  Functions* → *Secrets*), con la dirección del [deploy hook](../../../glosario.md#deploy-hook) de
  Vercel. Solo esta función lo puede leer. Se lee aquí dentro, en cada petición, y no arriba con
  las otras: así, si el dueño cambia el secreto, la siguiente publicación ya usa el nuevo.
- `let hookStatus: string | number = 'no secret';`: lo que pasó con el hook, para el registro.
  Empieza como "no hay secreto"; si todo va bien, acabará siendo un número (el estado que contestó
  Vercel). [Unión](../../../glosario.md#union): texto o número.

```ts
	if (hook) {
		try {
			hookStatus = (await fetch(hook, { method: 'POST' })).status;
		} catch {
			hookStatus = 'no answer';
		}
	}
```

- `if (hook)`: solo si el secreto existe.
- `fetch(hook, { method: 'POST' })`: **la llamada a Vercel**. Un `POST` sin cuerpo y sin claves:
  la dirección ya es la llave. Vercel pone en marcha un despliegue y contesta en seguida, sin
  esperar a que termine el build (que tarda minutos).
- `(await …).status`: se queda solo con el [código de estado](../../../glosario.md#codigo-de-estado-http)
  de la respuesta. El cuerpo no se mira.
- `catch { hookStatus = 'no answer'; }`: si ni siquiera se pudo conectar con Vercel.

```ts
	if (typeof hookStatus !== 'number' || hookStatus < 200 || hookStatus > 299) {
		await database(`publishes?id=eq.${row.id}`, authorization, { method: 'DELETE' }).catch(() => undefined);
		return fail('deploy hook', hookStatus, 502, 'hook');
	}
```

- Si `hookStatus` no es un número (no había secreto o no hubo respuesta), o es un número fuera de
  200–299 (Vercel contestó con un error), el hook falló. La spec acepta **cualquier** 2xx como
  éxito porque el número exacto que contesta Vercel no estaba confirmado (T3 de la spec 0016).
- `database(`publishes?id=eq.${row.id}`, …, { method: 'DELETE' })`: borra la fila que se acaba de
  crear (la política "owner removes publishes"). Así no queda apuntada una publicación que nunca
  empezó, y el dueño puede volver a intentarlo sin esperar un minuto.
  - `.catch(() => undefined)`: si borrarla también falla, se ignora ([promesa-then](../../../glosario.md#promesa-then)):
    lo importante es contestar al dueño. Como mucho, tendrá que esperar el minuto.
- `fail('deploy hook', hookStatus, 502, 'hook')`: el registro dice qué pasó (`no secret`,
  `no answer` o el número) y el navegador recibe `502` `{ "error": "hook" }`
  ([502](../../../glosario.md#codigo-de-estado-http): "el otro servidor me falló"). La URL del
  hook no aparece en ninguno de los dos (AC2).

```ts

	// Step 5.
	return reply(200, { requested_at: row.requested_at });
}
```

- Paso 5: todo bien. `200` con `{ "requested_at": "2026-10-28T10:01:00.123456+00:00" }`: la hora
  **del servidor** a la que se pidió esta publicación. La administración la guarda y espera a que
  `/build.json` diga que hay un build **posterior** a esa hora.

### 9. El punto de entrada: `Deno.serve()`

```ts

Deno.serve(async (request) => {
	if (request.method === 'OPTIONS') return reply(204);
	if (request.method !== 'POST') return reply(405);
```

- `Deno.serve(async (request) => …)`: arranca el servidor de la función
  ([Deno](../../../glosario.md#deno)). Cada petición que llega a
  `https://<ref>.supabase.co/functions/v1/publish` llega aquí como `request`, y lo que devuelva
  esta función es la respuesta. Es el `app.all('/publish', (req, res) => …)` de Express.
- Antes de llegar aquí, Supabase ya hizo una comprobación: con la opción **Verify JWT** activa en
  el panel, rechaza cualquier petición sin un JWT válido sin ejecutar este código
  ([edge-function](../../../glosario.md#edge-function)). Es una primera puerta; la de verdad es la
  política del paso 3.
- `OPTIONS` → `204` sin cuerpo, con las cabeceras CORS: la respuesta al *preflight*
  ([CORS](../../../glosario.md#cors)). [204](../../../glosario.md#codigo-de-estado-http) = "bien, y
  no hay nada más que decir". El navegador lee los permisos y manda el `POST` de verdad.
- Cualquier otro método que no sea `POST` (un `GET` al abrir la dirección en el navegador, por
  ejemplo) → `405`, "este método no se acepta aquí".

```ts

	// Step 1.
	const authorization = request.headers.get('Authorization');
	if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'signedOut' });
```

- Paso 1: `request.headers.get('Authorization')`: la cabecera con el token, o `null` si no viene.
- `!authorization?.startsWith('Bearer ')`: si falta o no empieza por `Bearer ` (la forma de un
  [JWT](../../../glosario.md#jwt) en esa cabecera), `401` `signedOut` sin tocar la base de datos.
  El `?.` ([encadenamiento opcional](../../../glosario.md#encadenamiento-opcional)) evita un error
  si es `null`.

```ts

	try {
		return await publish(authorization);
	} catch {
		return fail('request', 'no answer from the database', 500, 'unknown');
	}
});
```

- Llama a `publish()` (bloque 8) con la cabecera y devuelve lo que conteste.
- El `try`/`catch`: `fetch` lanza un error si no puede conectar ([fetch](../../../glosario.md#fetch)),
  y `.json()` lo lanza si el cuerpo no es JSON. Si cualquier cosa de dentro lanza un error, en vez
  de dejar que la función se rompa sin contestar, se registra "no hubo respuesta de la base de
  datos" y se contesta `500` `unknown` con las cabeceras CORS. (La llamada al hook tiene su propio
  `try`, en el bloque 8.)
- `return await publish(…)`: el `await` hace falta para que un error de `publish()` lo atrape
  **este** `catch`. Sin él, la promesa saldría de la función antes de fallar.

## Cómo se conecta

- **Entra:** el `POST` de `requestPublish()` en [`src/lib/publish.ts`](../../../src/lib/publish.ts.md),
  hecho con `authFetch()` de [`auth.ts`](../../../src/lib/auth.ts.md), que pone el token del
  dueño en `Authorization` y la clave publishable en `apikey`.
- **Habla con:** la tabla `publishes` de [`publish.sql`](../../publish.sql.md), a través de la API
  REST, con el token del dueño (Postgres aplica `is_owner()`); y el deploy hook de Vercel.
- **Sale:** `200 { requested_at }`, o un error con su estado: `401 signedOut`, `403 forbidden`,
  `429 tooSoon`, `500 unknown`, `502 hook`. `publish.ts` convierte cada uno en un mensaje en
  español.
- **Después:** Vercel construye la web. El build escribe [`/build.json`](../../../src/pages/build.json.ts.md),
  y la administración lo lee cada 15 s hasta ver un build más nuevo que `requested_at`.
- **Configuración en el panel (no en el repo):** la función se crea pegando este archivo; el
  secreto `DEPLOY_HOOK_URL` se guarda en *Edge Functions* → *Secrets*; "Verify JWT" queda
  activado. El repo no tiene ninguna copia de la URL del hook.
- **No lo revisa el typecheck:** Astro no entiende `Deno`, así que
  [`tsconfig.json`](../../../tsconfig.json.md) excluye `supabase/functions`.

## Prueba tú

Comprueba, sin publicar nada, que la función contesta bien a lo que no es un `POST` del dueño.
Hazlo cuando la función ya esté creada en el panel. Necesitas la dirección de tu proyecto
(`https://<ref>.supabase.co`, la del panel de Supabase, *Project Settings* → *Data API*, sin el
`/rest/v1` del final).

1. En la terminal de VS Code (Git Bash), cambia `<ref>` por el tuyo y ejecuta:

   ```bash
   curl -i -X OPTIONS https://<ref>.supabase.co/functions/v1/publish
   ```

   `-i` enseña también el estado y las cabeceras; `-X OPTIONS` manda un `OPTIONS`, como el
   preflight del navegador. **Qué deberías ver:** una primera línea que termina en `204` (por
   ejemplo `HTTP/2 204`) y, entre las cabeceras, `access-control-allow-methods: POST, OPTIONS`
   (spec 0016, AC2).
2. Ahora un `POST` sin token:

   ```bash
   curl -i -X POST https://<ref>.supabase.co/functions/v1/publish
   ```

   **Qué deberías ver:** un `401`. Con "Verify JWT" activado, quien contesta es Supabase antes de
   ejecutar el código, con su propio mensaje; si estuviera desactivado, contestaría el paso 1 con
   `{"error":"signedOut"}`. En los dos casos, ningún despliegue empieza en Vercel.
3. No hay nada que deshacer: ninguna de las dos peticiones crea una fila ni llama al hook.

## Términos

- [edge-function](../../../glosario.md#edge-function) · [deno](../../../glosario.md#deno) ·
  [cors](../../../glosario.md#cors) · [deploy-hook](../../../glosario.md#deploy-hook) ·
  [despliegue](../../../glosario.md#despliegue) · [polling](../../../glosario.md#polling) ·
  [fecha-iso](../../../glosario.md#fecha-iso) · [promesa-then](../../../glosario.md#promesa-then)
  (nuevos)
- [codigo-de-estado-http](../../../glosario.md#codigo-de-estado-http) (ahora con `204`, `405` y
  `502`) · [fetch](../../../glosario.md#fetch) · [api-rest](../../../glosario.md#api-rest) ·
  [postgrest](../../../glosario.md#postgrest) ·
  [prefer-return-representation](../../../glosario.md#prefer-return-representation)
- [jwt](../../../glosario.md#jwt) · [access-token](../../../glosario.md#access-token) ·
  [app-metadata](../../../glosario.md#app-metadata) · [rls](../../../glosario.md#rls) ·
  [rol](../../../glosario.md#rol) · [clave-publishable](../../../glosario.md#clave-publishable) ·
  [variable-de-entorno](../../../glosario.md#variable-de-entorno) ·
  [localstorage](../../../glosario.md#localstorage) · [trigger](../../../glosario.md#trigger)
- [afirmacion-no-nulo](../../../glosario.md#afirmacion-no-nulo) ·
  [afirmacion-de-tipo](../../../glosario.md#afirmacion-de-tipo) ·
  [record-y-unknown](../../../glosario.md#record-y-unknown) · [union](../../../glosario.md#union) ·
  [nullish](../../../glosario.md#nullish) ·
  [encadenamiento-opcional](../../../glosario.md#encadenamiento-opcional) ·
  [desestructuracion](../../../glosario.md#desestructuracion) · [spread](../../../glosario.md#spread) ·
  [valor-por-defecto](../../../glosario.md#valor-por-defecto)
