# `src/lib/auth.ts`

> **Qué es:** el login del dueño, entero: entrar, guardar la sesión en el móvil, renovarla,
> cerrarla y recuperar la contraseña, hablando con Supabase Auth con `fetch` · **Lo decidió:**
> [spec 0014](../../../../docs/specs/0014-owner-login.md) (Decision y Design →
> `src/lib/auth.ts`) · **Lo usan:** el `<script>` de
> [`src/pages/admin/index.astro`](../pages/admin/index.astro.md) y, solo `authFetch()`,
> [`src/lib/products.ts`](products.ts.md) (spec 0015) · **Usa:**
> la API de [Supabase Auth](../../glosario.md#supabase-auth) con
> [`fetch`](../../glosario.md#fetch) y el [localStorage](../../glosario.md#localstorage) del
> navegador

## Para qué sirve

Las features 12–15 dejarán al dueño cambiar el catálogo desde el móvil, así que antes hace falta
saber que quien está en `/admin/` es el dueño. Eso es la
[autenticación](../../glosario.md#autenticacion). El sitio es estático: no hay un servidor
Express nuestro que guarde sesiones. Por eso el login lo hace **el navegador** hablando
directamente con [Supabase Auth](../../glosario.md#supabase-auth) (spec 0012), y este archivo es
el único sitio que sabe cómo.

**A diferencia de casi todo lo demás en `src/lib/` (la otra excepción es `products.ts`), este
archivo corre en el navegador del dueño, no en el build.** Usa `localStorage`, `location` e
`history`, que solo existen en un navegador. Por eso solo lo importan el `<script>` de la página de administración y [`products.ts`](products.ts.md),
que también corre en el navegador.

Antes de leer el código, la idea en cinco líneas (cada término enlaza al glosario):

1. El dueño escribe email y contraseña; Supabase contesta con una [sesión](../../glosario.md#sesion):
   un [access token](../../glosario.md#access-token) (un [JWT](../../glosario.md#jwt) que dura una
   hora) y un [refresh token](../../glosario.md#refresh-token) (de un solo uso, para pedir el
   siguiente).
2. El navegador guarda los dos en `localStorage` y manda el access token en cada petición.
3. Antes de que caduque, lo cambia por uno nuevo con el refresh token (**capa 1**).
4. Si aun así Supabase rechaza un token, renueva una vez y repite la petición una vez (**capa 2**).
5. Si la renovación también se rechaza, la sesión se acabó: se borra y se vuelve a pedir la
   contraseña.

La spec 0014 lo quiere así para que la sesión dure **hasta que el dueño la cierre**, y para que
una conexión mala de Cuba nunca le cierre la sesión por error.

## El código, por partes

### 1. El comentario de cabecera

```ts
// The owner's login against Supabase Auth with plain fetch, no SDK (spec 0014).
// Browser only: imported by the admin page's script. The single home of every Auth call and of
// the stored session. Features 12–14 send their own requests through authFetch().
```

- "El login del dueño contra Supabase Auth con `fetch` a secas, sin SDK (spec 0014). Solo para
  el navegador: lo importa el script de la página de administración. El único sitio de cada
  llamada a Auth y de la sesión guardada. Las features 12–14 mandarán sus propias peticiones a
  través de `authFetch()`."
- SDK (*Software Development Kit*): la librería oficial de Supabase para JavaScript. El proyecto
  no la usa (specs 0012, 0013 y 0014): pesa, y con `fetch` basta.

### 2. El usuario

```ts
export interface AuthUser {
	email: string;
	app_metadata: Record<string, unknown>;
}
```

- Una [interface](../../glosario.md#interface) con lo único que la página necesita saber del
  usuario: su `email` (para enseñar "Sesión iniciada como …") y su
  [`app_metadata`](../../glosario.md#app-metadata) (para saber si es el dueño).
- `Record<string, unknown>`: un objeto con cualquier clave y valores de los que no se sabe nada
  ([record-y-unknown](../../glosario.md#record-y-unknown)). Supabase manda muchos más campos del
  usuario; este archivo se queda solo con estos dos (bloque 9).

### 3. Los errores

```ts
export type AuthErrorKind = 'credentials' | 'linkError' | 'weak' | 'same' | 'rate' | 'signedOut' | 'offline' | 'unknown';

// Every function here throws only this; the page turns `kind` into a Spanish message.
export class AuthError extends Error {
	constructor(readonly kind: AuthErrorKind) {
		super(`Auth: ${kind}`);
		this.name = 'AuthError';
	}
}
```

- `export type AuthErrorKind = …`: un [alias de tipo](../../glosario.md#alias-de-tipo) con los 8
  tipos de error posibles. Cada uno acaba siendo un mensaje en español en la página:
  - `credentials`: email o contraseña incorrectos.
  - `linkError`: el enlace de recuperación no vale o caducó.
  - `weak`: contraseña demasiado corta. `same`: la nueva es igual que la anterior.
  - `rate`: demasiados intentos (un [429](../../glosario.md#codigo-de-estado-http)).
  - `signedOut`: la sesión se acabó; hay que entrar otra vez.
  - `offline`: no hay conexión.
  - `unknown`: cualquier otra cosa.
- El comentario: "Todas las funciones de aquí lanzan solo esto; la página convierte `kind` en un
  mensaje en español." Así la página no tiene que entender respuestas de Supabase: solo mira
  `kind`.
- `export class AuthError extends Error`: una [clase](../../glosario.md#clase) de error propia.
  Es un `Error` normal (se lanza con [throw](../../glosario.md#throw)) que además lleva su `kind`.
- `constructor(readonly kind: AuthErrorKind)`: `new AuthError('rate')` guarda `'rate'` en el
  campo `kind`, de solo lectura.
- `super(`Auth: ${kind}`);`: el mensaje del `Error`, por ejemplo `Auth: rate`. Solo lo ve quien
  programa, en la consola.
- `this.name = 'AuthError';`: el nombre que sale delante del mensaje en la consola, en vez de
  `Error`.

### 4. La sesión y la respuesta de Supabase

```ts
interface Session {
	access_token: string;
	refresh_token: string;
	// Milliseconds on this phone's clock (Date.now()), never the server's expires_at.
	expires_at: number;
	user: AuthUser | null;
}
```

- `Session`: lo que se guarda en el móvil (sin `export`: solo lo usa este archivo). Los dos
  tokens, la hora a la que caduca el access token y el usuario, que puede faltar (`null`) un
  momento: la sesión que trae el enlace de recuperación llega sin usuario (bloque 23) hasta que
  se le pregunta a Supabase con `getUser()` (bloque 20).
- El comentario de `expires_at`: "Milisegundos en el reloj **de este móvil** (`Date.now()`), nunca
  el `expires_at` del servidor." `Date.now()` da la hora actual como número de milisegundos
  (desde 1970). El porqué está en el bloque 9.

```ts
interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	user?: AuthUser;
}
```

- `TokenResponse`: la parte que nos interesa de lo que contesta Supabase al entrar o al renovar.
  `expires_in` son los **segundos** que le quedan al access token (`3600` = una hora). `user?`:
  el `?` dice que puede no venir ([interface](../../glosario.md#interface)).

### 5. Tres constantes

```ts
const STORAGE_KEY = 'admin-session';
// Renew the access token when less than this is left, so an expired one is never sent.
const REFRESH_MARGIN_MS = 60_000;
// A 403 with one of these codes means "bad or closed token", not "not allowed" (spec 0014).
const REJECTED_TOKEN_CODES = new Set(['bad_jwt', 'session_not_found']);
```

- `STORAGE_KEY`: el nombre bajo el que se guarda la sesión en `localStorage`.
- El comentario: "Renueva el access token cuando le quede menos que esto, para no mandar nunca
  uno caducado."
- `REFRESH_MARGIN_MS = 60_000`: 60 000 milisegundos, un minuto. El `_` es solo un separador para
  leer mejor el número; JavaScript lo ignora. `MS` al final recuerda la unidad.
- El comentario: "Un 403 con uno de estos códigos significa 'token malo o cerrado', no 'no
  permitido' (spec 0014)." Normalmente un 403 es "no te dejo"
  ([códigos de estado](../../glosario.md#codigo-de-estado-http)), pero Supabase Auth contesta
  también con 403 cuando el token no vale (`bad_jwt`) o su sesión ya se cerró
  (`session_not_found`).
- `new Set([...])`: los dos códigos en un [Set](../../glosario.md#set), para preguntar rápido con
  `.has()` (bloque 14).

### 6. El estado del módulo

```ts
let config: { url: string; key: string } | undefined;
// Mirror of the stored session, used when localStorage is unavailable (private mode, blocked).
let memorySession: Session | null = null;
// One refresh at a time: refresh tokens are single use.
let refreshing: Promise<Session> | undefined;
```

Tres variables del archivo, fuera de cualquier función: conservan su valor mientras la página
está abierta.

- `config`: la dirección del proyecto y la clave publishable. Empieza vacía (`undefined`); la
  rellena `initAuth()` (bloque 7).
- El comentario: "Copia de la sesión guardada, que se usa cuando `localStorage` no está disponible
  (modo privado, bloqueado)."
- `memorySession`: esa copia en memoria. Es el plan B: si el navegador no deja usar
  `localStorage`, la sesión vive aquí, aunque solo mientras la página siga abierta.
- El comentario: "Una renovación cada vez: los refresh tokens son de un solo uso."
- `refreshing`: la renovación que está en marcha, si hay una. El porqué, en el bloque 16.

### 7. Recibir la configuración

```ts
// The page passes the project URL and publishable key read from its data attributes.
export function initAuth(value: { url: string; key: string }): void {
	config = value;
}
```

- El comentario: "La página pasa la URL del proyecto y la clave publishable, que lee de sus
  atributos data."
- Este archivo corre en el navegador, así que no puede leer las
  [variables de entorno](../../glosario.md#variable-de-entorno): esas solo existen en el build.
  La página las escribe en su HTML durante el build y, ya en el navegador, se las pasa aquí
  ([atributo data](../../glosario.md#atributo-data); detalle en
  [`index.astro.md`](../pages/admin/index.astro.md)).
- `: void`: la función no devuelve nada.

### 8. Leer y guardar la sesión

```ts
// --- Stored session ---------------------------------------------------------------------

function readSession(): Session | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return JSON.parse(raw) as Session;
	} catch {
		// Storage unavailable or corrupt: fall back to the in-memory copy.
	}
	return memorySession;
}
```

- `// --- Stored session ---`: "Sesión guardada". Solo un separador visual entre partes del
  archivo.
- `readSession()`: devuelve la sesión guardada, o `null` si no hay.
- `localStorage.getItem(STORAGE_KEY)`: lee el texto guardado bajo `admin-session`
  ([localStorage](../../glosario.md#localstorage)).
- `JSON.parse(raw) as Session`: lo convierte en objeto. `as Session` es una
  [afirmación de tipo](../../glosario.md#afirmacion-de-tipo): lo escribimos nosotros mismos, así
  que confiamos en su forma.
- `catch { … }`: si `localStorage` lanza un error (bloqueado) o el texto no es JSON válido, no se
  rompe nada. El comentario: "Almacenamiento no disponible o estropeado: usa la copia en
  memoria."
- `return memorySession;`: si no había nada en `localStorage` o falló, devuelve la copia en
  memoria (que puede ser `null`).

```ts
function saveSession(session: Session | null): void {
	memorySession = session;
	try {
		if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage unavailable: the session lasts only while the page is open.
	}
}
```

- `saveSession(session)`: guarda una sesión, o la borra si recibe `null`.
- `memorySession = session;`: primero, siempre, la copia en memoria.
- `localStorage.setItem(STORAGE_KEY, JSON.stringify(session))`: guarda el objeto como texto JSON.
  Ahí sobrevive a cerrar el navegador (spec 0014, AC5 a).
- `else localStorage.removeItem(STORAGE_KEY);`: con `null`, borra la sesión guardada.
- El comentario del `catch`: "Almacenamiento no disponible: la sesión dura solo mientras la
  página esté abierta."

### 9. Guardar los tokens que llegan

```ts
function pickUser(user: AuthUser): AuthUser {
	return { email: user.email, app_metadata: user.app_metadata ?? {} };
}
```

- `pickUser()`: de todo lo que manda Supabase sobre el usuario, se queda con `email` y
  `app_metadata`. Así no se guarda en el móvil nada que no haga falta.
- `user.app_metadata ?? {}`: si no viniera, un objeto vacío ([nullish](../../glosario.md#nullish)).

```ts
function storeTokens(tokens: TokenResponse, user: AuthUser | null): Session {
	const session: Session = {
		access_token: tokens.access_token,
		refresh_token: tokens.refresh_token,
		// Counted on this phone's clock, so a phone with the wrong time still counts the hour right.
		expires_at: Date.now() + tokens.expires_in * 1000,
		user: tokens.user ? pickUser(tokens.user) : user,
	};
	saveSession(session);
	return session;
}
```

- `storeTokens()`: convierte una respuesta de Supabase en una `Session`, la guarda y la devuelve.
  La usan entrar (bloque 19), renovar (bloque 15) y el enlace de recuperación (bloque 23).
- El comentario: "Contado con el reloj de este móvil, así un móvil con la hora mal sigue contando
  bien la hora de vida."
- `expires_at: Date.now() + tokens.expires_in * 1000`: **esta es la capa 1 de la spec 0014.**
  "Ahora, en mi reloj, más 3600 segundos pasados a milisegundos." Supabase también manda un
  `expires_at`, pero calculado con el reloj **del servidor**. Si el móvil del dueño tiene la hora
  adelantada dos horas, comparar con la hora del servidor haría creer que el token ya caducó
  (renovaría en cada petición); atrasada, que aún vale cuando no (mandaría tokens caducados). En
  cambio "una hora desde que lo recibí, medida con mi propio reloj" sale bien aunque el reloj
  esté mal, porque se compara siempre con ese mismo reloj (AC5 c).
- `user: tokens.user ? pickUser(tokens.user) : user`: si la respuesta trae el usuario, se usa;
  si no (al renovar no hace falta), se conserva el que se pasó.

### 10. Preguntas rápidas sobre la sesión

```ts
export function hasSession(): boolean {
	return readSession() !== null;
}

// The last user Supabase confirmed, for showing the admin while offline.
export function storedUser(): AuthUser | null {
	return readSession()?.user ?? null;
}
```

- `hasSession()`: `true` si hay una sesión guardada. No pregunta a Supabase si sigue valiendo.
- El comentario: "El último usuario que Supabase confirmó, para enseñar la administración sin
  conexión."
- `storedUser()`: el usuario guardado, o `null`.
  `readSession()?.user` usa el [encadenamiento opcional](../../glosario.md#encadenamiento-opcional)
  por si no hay sesión, y `?? null` convierte `undefined` en `null`.

```ts
// Only for the UI. The real protection is is_owner() in the database (supabase/auth.sql).
export function isOwner(user: AuthUser): boolean {
	return user.app_metadata.role === 'owner';
}
```

- El comentario: "Solo para la interfaz. La protección de verdad es `is_owner()` en la base de
  datos (`supabase/auth.sql`)."
- `isOwner(user)`: `true` si el `app_metadata` del usuario dice `role: 'owner'`.
- ¿Por qué "solo para la interfaz"? Este código corre en el navegador, y cualquiera puede cambiar
  el JavaScript de su propio navegador. Sirve para enseñar el mensaje correcto, no para
  proteger datos. Lo que protege el catálogo es la función
  [`is_owner()`](../../supabase/auth.sql.md), que Supabase comprueba en su servidor con el JWT
  firmado, dentro de las políticas de [`products-write.sql`](../../supabase/products-write.sql.md)
  (feature 12).

### 11. Mandar una petición

```ts
// --- Requests ---------------------------------------------------------------------------

async function send(path: string, init: RequestInit = {}, accessToken?: string): Promise<Response> {
	if (!config) throw new Error('Auth: initAuth() must run before any request.');
	const headers = new Headers(init.headers);
	// The publishable key goes in apikey only, never in Authorization.
	headers.set('apikey', config.key);
	headers.set('Content-Type', 'application/json');
	if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
	try {
		return await fetch(`${config.url}${path}`, { ...init, headers });
	} catch {
		throw new AuthError('offline');
	}
}
```

- `// --- Requests ---`: separador, "Peticiones".
- `send(path, init, accessToken)`: la única función que llama a `fetch`. Todas las demás pasan
  por aquí.
  - `path`: la ruta en Supabase, por ejemplo `/auth/v1/user`.
  - `init: RequestInit = {}`: las opciones de `fetch` (método, cuerpo…). `RequestInit` es el
    tipo de esas opciones; `= {}` es su [valor por defecto](../../glosario.md#valor-por-defecto).
  - `accessToken?`: opcional; solo lo llevan las peticiones de alguien que ya entró.
- `if (!config) throw new Error(…)`: "`initAuth()` debe ejecutarse antes de cualquier petición."
  Un error de programación, no del usuario; por eso es un `Error` normal y no un `AuthError`.
- `new Headers(init.headers)`: un objeto de cabeceras HTTP, que empieza con las que ya traiga
  `init`. `.set(nombre, valor)` añade o cambia una.
- El comentario: "La clave publishable va solo en `apikey`, nunca en `Authorization`." Son dos
  cabeceras distintas: `apikey` dice **qué proyecto** ([clave publishable](../../glosario.md#clave-publishable));
  `Authorization` dice **qué usuario**.
- `Content-Type: application/json`: los cuerpos que mandamos son JSON.
- `Authorization: Bearer <token>`: si hay access token, va aquí ([JWT](../../glosario.md#jwt)).
- `fetch(`${config.url}${path}`, { ...init, headers })`: la petición. `{ ...init, headers }` copia
  las opciones y pone las cabeceras nuevas ([spread](../../glosario.md#spread)).
- `catch { throw new AuthError('offline'); }`: `fetch` solo lanza un error cuando no puede ni
  conectar ([fetch](../../glosario.md#fetch)): eso, en Cuba, casi siempre es "sin datos". Un 400
  o un 500 **no** pasan por aquí: los miran las funciones siguientes.

### 12. Leer el código de error de Supabase

```ts
// Newer Auth API versions moved the string code from error_code to code; the old `code` is the
// HTTP status as a number. The header is the last resort. Never read the human `msg`.
async function errorCode(response: Response): Promise<string | undefined> {
	let body: { error_code?: unknown; code?: unknown } = {};
	if (response.headers.get('Content-Type')?.includes('application/json')) {
		try {
			body = await response.clone().json();
		} catch {
			// Not JSON after all; use the header.
		}
	}
	if (typeof body.error_code === 'string') return body.error_code;
	if (typeof body.code === 'string') return body.code;
	return response.headers.get('x-sb-error-code') ?? undefined;
}
```

- El comentario: "Las versiones nuevas de la API de Auth movieron el código en texto de
  `error_code` a `code`; en la forma vieja, `code` es el estado HTTP como número. La cabecera es
  el último recurso. Nunca leas el `msg` para humanos."
- Qué busca: el **código de error** en texto que Supabase añade a cada error, como
  `invalid_credentials` ([códigos de estado](../../glosario.md#codigo-de-estado-http)). El `msg`
  es una frase en inglés que puede cambiar sin aviso; el código no. Por eso nunca se mira `msg`.
- `let body: { error_code?: unknown; code?: unknown } = {};`: empieza con un objeto vacío. Los
  valores son `unknown` ([record-y-unknown](../../glosario.md#record-y-unknown)) porque no
  sabemos qué traerán.
- `response.headers.get('Content-Type')?.includes('application/json')`: solo intenta leer JSON si
  la respuesta dice que lo es.
- `response.clone().json()`: el cuerpo de una respuesta solo se puede leer **una vez**.
  `.clone()` hace una copia, para que quien llamó pueda leer el original después si quiere.
- `typeof body.error_code === 'string'`: la forma vieja (`error_code: "invalid_credentials"`).
- `typeof body.code === 'string'`: la forma nueva (`code: "invalid_credentials"`). En la vieja,
  `code` era un número (`400`), por eso se comprueba que sea texto.
- `response.headers.get('x-sb-error-code') ?? undefined`: si el cuerpo no lo trae, la cabecera
  `x-sb-error-code`. `get` da `null` si no existe; `?? undefined` lo convierte en `undefined`.

### 13. Convertir una respuesta mala en un `AuthError`

```ts
async function failure(path: string, response: Response): Promise<AuthError> {
	if (response.status === 429) return new AuthError('rate');
	const code = await errorCode(response);
	if (code === 'invalid_credentials') return new AuthError('credentials');
	if (code === 'weak_password') return new AuthError('weak');
	if (code === 'same_password') return new AuthError('same');
	console.error(`[auth] ${path.split('?')[0]} failed with status ${response.status} (${code ?? 'no code'})`);
	return new AuthError('unknown');
}
```

- `failure()` **devuelve** el error, no lo lanza: quien la llama escribe
  `throw await failure(…)`.
- `response.status === 429` → `rate`, sea cual sea el código: cualquier límite de peticiones o
  de correos.
- `invalid_credentials` (400) → `credentials`. Supabase da la misma respuesta a un email que no
  existe y a una contraseña mal, así nadie puede averiguar qué emails tienen cuenta.
- `weak_password` (422) → `weak`; `same_password` (422) → `same`.
- Todo lo demás: escribe una línea en la consola del navegador para quien programa y devuelve
  `unknown`. La línea dice "`[auth] /auth/v1/user` falló con estado 500 (código)". Fíjate en
  `path.split('?')[0]`: quita la parte `?…` de la ruta, y el mensaje no incluye nunca tokens ni
  contraseñas (spec 0014, Security).

### 14. ¿Es un token rechazado?

```ts
async function isRejectedToken(response: Response): Promise<boolean> {
	if (response.status === 401) return true;
	if (response.status !== 403) return false;
	const code = await errorCode(response);
	return code !== undefined && REJECTED_TOKEN_CODES.has(code);
}
```

- La spec 0014 llama **token rechazado** a: cualquier 401, o un 403 con código `bad_jwt` o
  `session_not_found`.
- `401` → sí. `403` → solo si el código es uno de esos dos (bloque 5). Cualquier otro estado →
  no.
- ¿Por qué no todos los 403? Porque un 403 normal es "no te dejo", por ejemplo cuando una
  [política](../../glosario.md#politica) de la feature 12 rechaza una escritura. Renovar el token
  no arreglaría eso, así que no se reintenta.

### 15. Renovar la sesión

```ts
async function refresh(session: Session): Promise<Session> {
	const path = '/auth/v1/token?grant_type=refresh_token';
	const response = await send(path, { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) });
```

- `refresh(session)`: cambia el refresh token por una sesión nueva.
- `POST /auth/v1/token?grant_type=refresh_token` con el cuerpo `{ "refresh_token": "…" }`:
  "toma este [refresh token](../../glosario.md#refresh-token), dame tokens nuevos". `grant_type`
  dice qué tipo de prueba llevamos.
- Sin `accessToken` en `send`: para renovar no hace falta el access token (puede estar caducado).

```ts
	// Supabase answers every refused refresh token with 400. A 429, a 5xx or no network keep the
	// session: the owner must not be signed out by Cuba's unreliable connections.
	if (response.status === 400 || response.status === 401) {
		saveSession(null);
		throw new AuthError('signedOut');
	}
	if (!response.ok) throw await failure(path, response);
	return storeTokens((await response.json()) as TokenResponse, session.user);
}
```

- El comentario: "Supabase contesta con 400 a cualquier refresh token rechazado. Un 429, un 5xx o
  la falta de red mantienen la sesión: al dueño no lo deben echar las conexiones poco fiables de
  Cuba."
- `400` o `401`: el refresh token ya no vale (gastado, sesión cerrada desde otro móvil…). La
  sesión se acabó de verdad: se borra (`saveSession(null)`) y se lanza `signedOut`.
- `if (!response.ok) throw await failure(…)`: cualquier otro error (429, 500…) se lanza **sin
  borrar** la sesión. Lo mismo pasa sin red: `send` lanza `offline` antes de llegar aquí. El
  dueño ve un aviso y puede reintentar más tarde con la misma sesión.
- `storeTokens(…, session.user)`: guarda la sesión nueva con su nuevo `expires_at` y conserva el
  usuario que ya teníamos. Desde aquí, el refresh token viejo queda gastado.

### 16. Una sola renovación a la vez

```ts
function refreshOnce(session: Session): Promise<Session> {
	refreshing ??= refresh(session).finally(() => {
		refreshing = undefined;
	});
	return refreshing;
}
```

- El problema: el refresh token es de **un solo uso**. Si dos peticiones descubren a la vez que
  el token va a caducar y las dos llaman a `refresh()`, la segunda mandaría un refresh token que
  la primera ya gastó, y Supabase podría contestar con un 400… y echar al dueño.
- `refreshing ??= refresh(session)…`: [asignación nullish](../../glosario.md#asignacion-nullish).
  Si no hay ninguna renovación en marcha, la empieza y guarda su **promesa**; si ya hay una, no
  empieza otra. Las dos llamadas reciben la misma promesa y esperan la misma respuesta. Es el
  mismo truco que `readCategories()` en [`supabase.ts`](supabase.ts.md).
- `.finally(() => { refreshing = undefined; })`: cuando la renovación termina, bien o mal, se
  vacía la variable, para que la próxima vez pueda empezar otra
  ([finally](../../glosario.md#finally)).

### 17. Capa 1: renovar antes de mandar

```ts
// Layer 1 of spec 0014: renew before sending when the token is about to expire.
export async function getSession(): Promise<{ user: AuthUser | null; accessToken: string } | null> {
	let session = readSession();
	if (!session) return null;
	if (session.expires_at - Date.now() < REFRESH_MARGIN_MS) session = await refreshOnce(session);
	return { user: session.user, accessToken: session.access_token };
}
```

- El comentario: "Capa 1 de la spec 0014: renovar antes de mandar cuando el token está a punto de
  caducar."
- `getSession()`: devuelve el usuario y un access token **que vale**, o `null` si no hay sesión.
- `session.expires_at - Date.now() < REFRESH_MARGIN_MS`: "¿le queda menos de un minuto?".
  Compara dos horas del **mismo reloj**, el del móvil (bloque 9). Si le queda poco, o ya caducó,
  renueva primero.
- Así, en el caso normal, Supabase nunca recibe un token caducado. La capa 2 es solo la red de
  seguridad.

### 18. Capa 2: un reintento si Supabase rechaza el token

```ts
// Any authenticated call to the project (Auth now; database, Storage, functions in features
// 12–14). Layer 2 of spec 0014: a rejected token gets one refresh and one repeat, never more.
// `init.body` must be a string so the request can be sent twice.
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
	const session = await getSession();
	if (!session) throw new AuthError('signedOut');
	const response = await send(path, init, session.accessToken);
	if (!(await isRejectedToken(response))) return response;
```

- El comentario: "Cualquier llamada con sesión al proyecto (hoy Auth; base de datos, Storage y
  funciones en las features 12–14). Capa 2 de la spec 0014: un token rechazado recibe una
  renovación y una repetición, nunca más. `init.body` tiene que ser un texto para poder mandar la
  petición dos veces." (Hay cuerpos que `fetch` consume al enviarlos y no se pueden reutilizar;
  un texto sí.)
- `authFetch(path, init)`: como `fetch`, pero con la sesión puesta.
- `await getSession()`: pasa por la capa 1. Sin sesión → `signedOut`.
- `send(path, init, session.accessToken)`: la petición, con el token.
- `if (!(await isRejectedToken(response))) return response;`: si Supabase **no** rechazó el
  token, devuelve la respuesta tal cual, sea un 200 o cualquier otro error. Quien llamó decide.

```ts
	const current = readSession();
	if (!current) throw new AuthError('signedOut');
	const renewed = await refreshOnce(current);
	const repeated = await send(path, init, renewed.access_token);
	if (await isRejectedToken(repeated)) {
		saveSession(null);
		throw new AuthError('signedOut');
	}
	return repeated;
}
```

- Si llegamos aquí, Supabase rechazó un token que, según nuestro reloj, aún valía. Puede pasar si
  la sesión se cerró en otro móvil, o si el token guardado está estropeado (spec 0014, AC5 d).
- `const current = readSession();`: vuelve a leer la sesión, por si otra petición ya la renovó
  entretanto.
- `await refreshOnce(current)`: renueva **una** vez. Si Supabase rechaza la renovación, `refresh`
  ya borra la sesión y lanza `signedOut` (bloque 15).
- `send(path, init, renewed.access_token)`: repite **la misma** petición con el token nuevo,
  **una** vez.
- Si el token vuelve a ser rechazado: no hay tercer intento (así nunca entra en un bucle). Borra
  la sesión y lanza `signedOut`.
- `return repeated;`: si no, devuelve la respuesta de la repetición.

### 19. Entrar

```ts
// --- Actions ----------------------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<AuthUser> {
	const path = '/auth/v1/token?grant_type=password';
	const response = await send(path, { method: 'POST', body: JSON.stringify({ email, password }) });
	if (!response.ok) throw await failure(path, response);
	const session = storeTokens((await response.json()) as TokenResponse, null);
	return session.user ?? getUser();
}
```

- `// --- Actions ---`: separador, "Acciones": lo que la página puede pedir.
- `signIn(email, password)`: `POST /auth/v1/token?grant_type=password` con el email y la
  contraseña en el **cuerpo**, nunca en la dirección. Es la misma ruta que renovar, con otro
  `grant_type`.
- `if (!response.ok) throw await failure(…)`: con una contraseña mal, Supabase da 400
  `invalid_credentials` → `credentials` (bloque 13).
- `storeTokens(…, null)`: guarda la sesión nueva. La respuesta trae el usuario, así que no hace
  falta pasar uno.
- `return session.user ?? getUser();`: devuelve el usuario; si por lo que fuera no vino en la
  respuesta, se lo pregunta a Supabase (bloque 20).

### 20. Preguntar "¿quién soy?"

```ts
// Checks the session with Supabase and refreshes the stored email and role.
export async function getUser(): Promise<AuthUser> {
	const path = '/auth/v1/user';
	const response = await authFetch(path);
	if (!response.ok) throw await failure(path, response);
	const user = pickUser((await response.json()) as AuthUser);
	const session = readSession();
	if (session) saveSession({ ...session, user });
	return user;
}
```

- El comentario: "Comprueba la sesión con Supabase y actualiza el email y el rol guardados."
- `GET /auth/v1/user` a través de `authFetch`: pasa por las dos capas. Si el token vale, Supabase
  contesta con el usuario.
- `saveSession({ ...session, user })`: guarda la sesión igual, pero con el usuario recién
  confirmado ([spread](../../glosario.md#spread)). Así, si el dueño cambiara de rol, el móvil lo
  sabría en la siguiente carga. La página llama a esta función al abrirse.

### 21. Cerrar sesión en todas partes

```ts
// Global: every device signed in as the owner is signed out (spec 0014). The stored session is
// cleared even when the call fails, for example offline.
export async function signOut(): Promise<void> {
	try {
		await authFetch('/auth/v1/logout?scope=global', { method: 'POST' });
	} catch {
		// Nothing to undo: the local session goes either way.
	} finally {
		saveSession(null);
	}
}
```

- El comentario: "Global: se cierra la sesión de todos los dispositivos donde entró el dueño
  (spec 0014). La sesión guardada se borra aunque la llamada falle, por ejemplo sin conexión."
- `POST /auth/v1/logout?scope=global`: `scope=global` pide a Supabase que deje de aceptar los
  refresh tokens de **todas** las sesiones de este usuario. Si el dueño pierde el móvil, entra
  desde otro y pulsa "Cerrar sesión": el móvil perdido queda fuera en su próxima renovación
  (spec 0014, AC6).
- `catch { … }`: "Nada que deshacer: la sesión local se va de todas formas."
- `finally { saveSession(null); }`: pase lo que pase, se borra la sesión de este navegador
  ([finally](../../glosario.md#finally)).

### 22. Pedir el correo de recuperación

```ts
// Sends Supabase's default recovery email. Its link comes back to this site's /admin/, which
// must be in the project's Redirect URLs. No code_challenge: the implicit flow puts the session
// in the link itself, so it works in any browser. Any email gets the same 200.
export async function requestRecovery(email: string): Promise<void> {
	const redirectTo = encodeURIComponent(`${location.origin}/admin/`);
	const path = `/auth/v1/recover?redirect_to=${redirectTo}`;
	const response = await send(path, { method: 'POST', body: JSON.stringify({ email }) });
	if (!response.ok) throw await failure(path, response);
}
```

- El comentario: "Envía el correo de recuperación por defecto de Supabase. Su enlace vuelve a
  `/admin/` de este sitio, que tiene que estar en las *Redirect URLs* del proyecto. Sin
  `code_challenge`: el flujo implícito pone la sesión en el propio enlace, así funciona en
  cualquier navegador. Cualquier email recibe el mismo 200."
- `location.origin`: el principio de la dirección actual, `https://tienda-demo-cuba.vercel.app` o
  `http://localhost:4321`. Así el enlace vuelve al mismo sitio desde el que se pidió (AC10).
- `encodeURIComponent(…)`: la dirección va dentro de otra dirección, así que se codifica
  ([encodeURIComponent](../../glosario.md#encodeuricomponent)).
- `POST /auth/v1/recover?redirect_to=…` con `{ "email": "…" }`: Supabase manda el correo. Por
  seguridad, solo acepta un `redirect_to` que esté en su lista de *Redirect URLs*; si no, usa la
  *Site URL* (las configura [`auth.sql`](../../supabase/auth.sql.md)).
- "Sin `code_challenge`": esa es la pieza del método PKCE. Sin ella, Supabase usa el
  [flujo implícito](../../glosario.md#flujo-implicito).
- "El mismo 200 para cualquier email": para no revelar qué emails tienen cuenta. Por eso la
  página dice "*Si* el email es correcto, te enviamos un enlace".

### 23. Leer el enlace de recuperación

```ts
// Runs first on page load. A recovery link lands here with the session, or an error, in the URL
// fragment (#…). Browsers never send the fragment to a server; it is removed from the address
// bar and from history right away.
export function readRecoveryLink(): 'recovery' | 'linkError' | null {
	const params = new URLSearchParams(location.hash.slice(1));
	const isError = params.has('error') || params.has('error_code');
	const accessToken = params.get('access_token');
	const refreshToken = params.get('refresh_token');
	const expiresIn = Number(params.get('expires_in'));
	const isRecovery = params.get('type') === 'recovery' && !!accessToken && !!refreshToken && expiresIn > 0;
	if (!isError && !isRecovery) return null;
```

- El comentario: "Se ejecuta lo primero al cargar la página. Un enlace de recuperación llega aquí
  con la sesión, o con un error, en el fragmento de la URL (`#…`). Los navegadores nunca mandan el
  fragmento a un servidor; se quita de la barra de direcciones y del historial en seguida."
- Devuelve `'recovery'` (llegó un enlace bueno), `'linkError'` (llegó un enlace que no vale) o
  `null` (no hay enlace: una visita normal).
- `location.hash.slice(1)`: el [fragmento](../../glosario.md#fragmento-de-url) sin el `#`, por
  ejemplo `access_token=eyJ…&expires_in=3600&refresh_token=…&token_type=bearer&type=recovery`.
- `new URLSearchParams(…)`: lo trocea para poder preguntar por cada campo
  ([url-search-params](../../glosario.md#url-search-params)).
- `isError`: el fragmento trae `error` o `error_code` (un enlace usado o caducado).
- `Number(params.get('expires_in'))`: el texto `'3600'` pasado a número. Si falta, da `0`.
- `isRecovery`: `type` es `recovery`, hay los dos tokens y una duración positiva. `!!valor`
  convierte un valor en `true`/`false` (un texto vacío o `null` → `false`).
- `if (!isError && !isRecovery) return null;`: ni una cosa ni la otra → no se toca nada.

```ts
	history.replaceState(null, '', location.pathname + location.search);
	if (isError || !accessToken || !refreshToken) return 'linkError';
	storeTokens({ access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn }, null);
	return 'recovery';
}
```

- `history.replaceState(null, '', location.pathname + location.search)`: **lo primero, sea bueno
  o malo el enlace**, quita el fragmento: la barra pasa a mostrar solo `/admin/`, y como
  `replaceState` sustituye la entrada del historial en vez de añadir otra, el botón "atrás" no
  puede volver a la dirección con los tokens
  ([history-replacestate](../../glosario.md#history-replacestate)). Así nadie los ve en la
  pantalla ni los encuentra en el historial (AC7 b).
- `if (isError || !accessToken || !refreshToken) return 'linkError';`: si era un error, se
  termina aquí sin guardar nada. (Las dos comprobaciones de los tokens no pueden cumplirse, porque
  `isRecovery` ya las exige; están para que TypeScript sepa que, debajo, los dos son textos y no
  `null`.)
- `storeTokens(…, null)`: guarda la sesión que traía el enlace, con `expires_at` contado en el
  reloj del móvil, como siempre. El usuario queda `null`; la página lo pregunta justo después con
  `getUser()`.

### 24. Poner una contraseña nueva

```ts
export async function setPassword(password: string): Promise<AuthUser> {
	const path = '/auth/v1/user';
	const response = await authFetch(path, { method: 'PUT', body: JSON.stringify({ password }) });
	if (!response.ok) throw await failure(path, response);
	const user = pickUser((await response.json()) as AuthUser);
	const session = readSession();
	if (session) saveSession({ ...session, user });
	return user;
}
```

- `PUT /auth/v1/user` con `{ "password": "…" }`, a través de `authFetch`: cambia la contraseña del
  usuario de la sesión actual, la que trajo el enlace de recuperación.
- Errores posibles: `weak_password` → `weak`, `same_password` → `same` (bloque 13).
- Si va bien, Supabase devuelve el usuario; se guarda en la sesión igual que en `getUser()`.

## Cómo se conecta

- **Entra:** la dirección del proyecto y la clave publishable, que la página le pasa con
  `initAuth()` (las lee en el build [`supabaseConfig()`](supabase.ts.md), de `SUPABASE_URL` y
  `SUPABASE_PUBLISHABLE_KEY`); lo que el dueño escribe en los formularios; y el fragmento de la
  URL cuando llega desde el correo.
- **Habla con:** la API de [Supabase Auth](../../glosario.md#supabase-auth): `/auth/v1/token`,
  `/auth/v1/user`, `/auth/v1/logout` y `/auth/v1/recover`.
- **Guarda:** la sesión en `localStorage`, bajo `admin-session`, con la forma
  `{ access_token, refresh_token, expires_at, user: { email, app_metadata } }`.
- **Sale:** usuarios y `AuthError` hacia el script de
  [`admin/index.astro`](../pages/admin/index.astro.md), que los convierte en vistas y mensajes en
  español. Y `authFetch()` hacia [`products.ts`](products.ts.md), que manda con él las
  lecturas y escrituras de productos (feature 12); más adelante, también las features 13–14.
- **La protección de verdad no está aquí:** está en Supabase, con
  [`is_owner()`](../../supabase/auth.sql.md) y las políticas de la feature 12
  ([`products-write.sql`](../../supabase/products-write.sql.md)). Este archivo solo
  consigue y cuida el token.

## Prueba tú

Mira la capa 1 en acción: haz que el móvil crea que el token ya caducó. Necesitas la cuenta del
dueño.

1. Ejecuta `pnpm dev`, abre `http://localhost:4321/admin/` y entra con el email y la contraseña
   del dueño.
2. Abre las herramientas del navegador (F12) → *Application* → *Local storage* →
   `http://localhost:4321` → `admin-session`. Verás el JSON de la sesión. `expires_at` es un
   número grande: la hora de caducidad en milisegundos.
3. Cambia ese número por `0` (una hora en el pasado) y pulsa Enter. Abre la pestaña *Network* y
   recarga la página.
4. **Qué deberías ver:** primero un `POST` a `…/auth/v1/token?grant_type=refresh_token` y, después,
   el `GET` a `…/auth/v1/user`; ese orden lo marca el código (bloques 17 y 18). Según la spec
   0014 (AC5 b), los dos contestan 200 y sale la vista "Sesión iniciada" sin pedir la contraseña.
   En *Local storage*, `refresh_token` ha cambiado y `expires_at` vuelve a estar una hora por
   delante.
5. No hay nada que deshacer: la sesión ya se renovó sola. Si algo sale mal, pulsa "Cerrar sesión"
   y entra otra vez.

## Términos

- [autenticacion](../../glosario.md#autenticacion) · [sesion](../../glosario.md#sesion) ·
  [jwt](../../glosario.md#jwt) · [access-token](../../glosario.md#access-token) ·
  [refresh-token](../../glosario.md#refresh-token) · [supabase-auth](../../glosario.md#supabase-auth) ·
  [app-metadata](../../glosario.md#app-metadata) · [flujo-implicito](../../glosario.md#flujo-implicito)
  (todos nuevos)
- [codigo-de-estado-http](../../glosario.md#codigo-de-estado-http) ·
  [fragmento-de-url](../../glosario.md#fragmento-de-url) ·
  [url-search-params](../../glosario.md#url-search-params) ·
  [history-replacestate](../../glosario.md#history-replacestate) ·
  [localstorage](../../glosario.md#localstorage) (nuevos)
- [clase](../../glosario.md#clase) · [alias-de-tipo](../../glosario.md#alias-de-tipo) ·
  [record-y-unknown](../../glosario.md#record-y-unknown) · [finally](../../glosario.md#finally)
  (nuevos)
- [fetch](../../glosario.md#fetch) · [clave-publishable](../../glosario.md#clave-publishable) ·
  [politica](../../glosario.md#politica) · [rol](../../glosario.md#rol) ·
  [encodeuricomponent](../../glosario.md#encodeuricomponent)
- [interface](../../glosario.md#interface) · [afirmacion-de-tipo](../../glosario.md#afirmacion-de-tipo) ·
  [asignacion-nullish](../../glosario.md#asignacion-nullish) · [nullish](../../glosario.md#nullish) ·
  [encadenamiento-opcional](../../glosario.md#encadenamiento-opcional) · [spread](../../glosario.md#spread) ·
  [set](../../glosario.md#set) · [throw](../../glosario.md#throw) ·
  [valor-por-defecto](../../glosario.md#valor-por-defecto) · [async-await](../../glosario.md#async-await)
