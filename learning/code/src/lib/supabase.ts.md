# `src/lib/supabase.ts`

> **Qué es:** las funciones que leen el catálogo de Supabase durante el build: las categorías, los
> productos y la URL de cada foto · **Lo decidió:**
> [spec 0013](../../../../docs/specs/0013-catalog-data-online.md) (sección Design → Reading) ·
> **Lo usan:** [`src/content.config.ts`](../content.config.ts.md) (sus dos loaders) y, solo
> `supabaseConfig()`, [`src/pages/admin/index.astro`](../pages/admin/index.astro.md) (spec
> [0014](../../../../docs/specs/0014-owner-login.md)) ·
> **Usa:** las variables de entorno `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`, y la
> [API REST](../../glosario.md#api-rest) de Supabase con `fetch`

## Para qué sirve

Desde la spec 0013, el catálogo vive en dos tablas de [Supabase](../../glosario.md#supabase)
(las crea [`supabase/schema.sql`](../../supabase/schema.sql.md)). Este archivo es **el único
sitio del código que sabe leer el catálogo de Supabase**: arma las peticiones, comprueba las
respuestas y devuelve las filas. Si mañana cambia la forma de leer Supabase, se toca solo aquí.
(El login del dueño también habla con Supabase, pero desde el navegador y con su propio archivo,
[`auth.ts`](auth.ts.md).)

Corre **solo en el build** (en tu PC o en Vercel), nunca en el navegador: el cliente recibe
páginas estáticas ya hechas y no llama nunca a Supabase. Y sigue una regla de la spec 0013,
*fail closed* ("fallar cerrado"): ante cualquier duda (falta una variable, Supabase no contesta,
una tabla llega vacía…), lanza un error y el build se para. Vercel sigue sirviendo entonces la
última versión buena del sitio, así que los clientes nunca ven una tienda vacía o rota.

No usa ninguna librería de Supabase: solo [`fetch`](../../glosario.md#fetch), que ya viene con
Node (la spec 0013 decidió no añadir paquetes).

## El código, por partes

### 1. El comentario de cabecera

```ts
// The only place that knows how to read the catalog from Supabase (spec 0013).
// It runs at build time only: visitors get static pages and never call Supabase.
```

- "El único sitio que sabe leer el catálogo de Supabase (spec 0013). Corre solo en el build: los
  visitantes reciben páginas estáticas y nunca llaman a Supabase."

### 2. La forma de las filas

```ts
export interface CategoryRow {
	id: string;
	name: string;
	sort_order: number;
}

export interface ProductRow {
	id: string;
	name: string;
	category_id: string;
	price: number;
	unit: string;
	in_stock: boolean;
	description: string;
	photo_path: string;
}
```

- Dos [interfaces](../../glosario.md#interface) que describen una fila de cada tabla, tal como
  llega de Supabase. Los nombres de los campos son los de las columnas de
  [`schema.sql`](../../supabase/schema.sql.md), en [snake_case](../../glosario.md#snake-case)
  (`sort_order`, `in_stock`, `photo_path`), no los de la colección de Astro (`order`,
  `inStock`, `photo`). La traducción de unos a otros la hacen los loaders de
  [`content.config.ts`](../content.config.ts.md).
- `export`: se pueden importar desde otros archivos
  ([import-export](../../glosario.md#import-export)). Solo existen para el
  [typecheck](../../glosario.md#typecheck); no generan código.
- Los [tipos](../../glosario.md#tipo) siguen a los de SQL: `text` → `string`, `integer` →
  `number`, `boolean` → `boolean`.
- Ojo: estas interfaces son una **promesa**, no una comprobación. TypeScript no puede ver qué
  manda Supabase de verdad. Quien comprueba los datos de verdad es el esquema de zod en
  `content.config.ts`.

### 3. Dos constantes

```ts
const PHOTO_BUCKET = 'product-photos';
// PostgREST's default limit per request; a full page could mean the catalog was cut off.
const MAX_ROWS = 1000;
```

- `const PHOTO_BUCKET = 'product-photos';`: el nombre del bucket donde están las fotos
  ([Storage y bucket](../../glosario.md#storage-y-bucket)). Lo crea `schema.sql`. Va en
  mayúsculas por costumbre: es un valor fijo que no cambia nunca.
- El comentario: "El límite por defecto de PostgREST por petición; una página llena podría
  significar que el catálogo llegó cortado." PostgREST es la pieza de Supabase que crea la
  [API REST](../../glosario.md#api-rest).
- `const MAX_ROWS = 1000;`: una petición devuelve como mucho 1000 filas. Si llegan exactamente
  1000, puede que hubiera más y se quedaran fuera sin aviso. Se usa en el bloque 5.

### 4. Leer y validar la configuración

```ts
// Both values are public by design but kept out of the repo, like WHATSAPP_NUMBER.
// Errors name the variable, never its value. A bad value stops the build.
// The admin page also calls it at build to hand both values to its script (spec 0014).
export function supabaseConfig(): { url: string; key: string } {
	const url = import.meta.env.SUPABASE_URL;
	const key = import.meta.env.SUPABASE_PUBLISHABLE_KEY;
```

- El comentario: "Los dos valores son públicos por diseño, pero se guardan fuera del repo, como
  `WHATSAPP_NUMBER`. Los errores nombran la variable, nunca su valor. Un valor malo para el
  build." Nombrar solo la variable evita que la clave acabe impresa en los registros (*logs*)
  de Vercel.
- La tercera línea del comentario, nueva con la spec 0014: "La página de administración también
  la llama en el build, para pasar los dos valores a su script." Esa página los escribe en su
  HTML, y su script, que corre en el navegador, los lee de ahí
  ([`admin/index.astro.md`](../pages/admin/index.astro.md)).
- `export function supabaseConfig(): { url: string; key: string }`: devuelve un objeto con dos
  textos, `url` y `key`. Hasta la spec 0014 se llamaba `getConfig` y no tenía `export`, porque
  solo la usaba este archivo; ahora lleva `export`
  ([import-export](../../glosario.md#import-export)) para que la página de administración la
  importe, y un nombre que dice qué configuración da. Las comprobaciones y los mensajes no
  cambiaron.
- `const url = import.meta.env.SUPABASE_URL;` y la línea de `key`: leen las dos
  [variables de entorno](../../glosario.md#variable-de-entorno) con
  [import.meta.env](../../glosario.md#import-meta-env), igual que `whatsapp.ts` lee el número.
  Sus tipos los declara [`src/env.d.ts`](../env.d.ts.md).

```ts
	if (!url || !/^https:\/\/[^/\s]+$/.test(url)) {
		throw new Error(
			'SUPABASE_URL must be the project URL only, like https://<ref>.supabase.co (no /rest/v1, no trailing slash). See .env.example.',
		);
	}
```

- `if (!url || ...)`: si la variable falta (`undefined`) **o** no encaja con el patrón, lanza un
  error ([throw](../../glosario.md#throw)).
- `/^https:\/\/[^/\s]+$/` es una [expresión regular](../../glosario.md#expresion-regular):
  - `^https:\/\/`: empieza por `https://` (cada `/` lleva delante `\` porque, sin ella, `/`
    cerraría la expresión).
  - `[^/\s]+`: después, uno o más caracteres que **no** sean `/` ni un espacio (`\s`).
  - `$`: y ahí termina.
  - `https://abcd.supabase.co` pasa. `https://abcd.supabase.co/` (barra final) o
    `https://abcd.supabase.co/rest/v1` no pasan, porque llevan otra `/`. Así las URLs de los
    bloques 5 y 8 nunca salen con `//` doble.
- El mensaje: "`SUPABASE_URL` debe ser solo la URL del proyecto, como
  `https://<ref>.supabase.co` (sin `/rest/v1`, sin barra final). Ver `.env.example`."

```ts
	if (key?.startsWith('sb_secret_')) {
		throw new Error('SUPABASE_PUBLISHABLE_KEY holds a secret key. Use the publishable key (sb_publishable_…).');
	}
	if (!key?.startsWith('sb_publishable_')) {
		throw new Error('SUPABASE_PUBLISHABLE_KEY must be the project publishable key (sb_publishable_…). See .env.example.');
	}
	return { url, key };
}
```

- `key?.startsWith('sb_secret_')`: si la clave empieza por `sb_secret_`, es la **clave
  secreta**, la que puede hacerlo todo ([clave publishable](../../glosario.md#clave-publishable)).
  El build la rechaza con un mensaje propio: "`SUPABASE_PUBLISHABLE_KEY` contiene una clave
  secreta. Usa la clave publishable." Así, si alguien pega la clave equivocada, se entera en
  seguida y la secreta no se usa. El `?.` ([encadenamiento opcional](../../glosario.md#encadenamiento-opcional))
  evita un error si `key` es `undefined`: entonces da `undefined`, que cuenta como falso.
- `!key?.startsWith('sb_publishable_')`: si no empieza por `sb_publishable_` (o falta), otro
  error: "debe ser la clave publishable del proyecto". Va después del anterior para que una
  clave secreta reciba el mensaje más claro de los dos.
- `return { url, key };`: si todo está bien, devuelve los dos valores (forma corta de
  `{ url: url, key: key }`).

### 5. Leer una tabla entera

```ts
// Reads every row of a table through the REST API. Fails on anything but a full, non-empty
// answer: a missing grant or policy returns [] with status 200, which would publish an empty shop.
async function readTable<Row>(table: string, columns: string): Promise<Row[]> {
	const { url, key } = supabaseConfig();
```

- El comentario: "Lee todas las filas de una tabla a través de la API REST. Falla ante cualquier
  cosa que no sea una respuesta completa y no vacía: si falta un permiso o una política, la
  respuesta puede ser `[]` con estado 200, y eso publicaría una tienda vacía."
  ([grant](../../glosario.md#grant), [política](../../glosario.md#politica)).
- `async function readTable<Row>(table: string, columns: string): Promise<Row[]>`:
  - `async`: espera respuestas lentas por dentro ([async-await](../../glosario.md#async-await)).
  - `<Row>`: un [genérico](../../glosario.md#generico). Quien la llama dice qué forma tienen las
    filas: `readTable<CategoryRow>(…)` devuelve `CategoryRow[]`. Así la misma función sirve para
    las dos tablas.
  - `table` y `columns`: el nombre de la tabla y las columnas a pedir, separadas por comas.
  - `Promise<Row[]>`: devuelve, más tarde, una lista de filas.
- `const { url, key } = supabaseConfig();`: lee y valida la configuración del bloque 4. Si algo está
  mal, el error sale aquí y no se llega a llamar a Supabase.

```ts
	let response: Response;
	try {
		response = await fetch(`${url}/rest/v1/${table}?select=${columns}`, { headers: { apikey: key } });
	} catch (error) {
		throw new Error(`Supabase: could not reach the project to read "${table}".`, { cause: error });
	}
```

- `let response: Response;`: declara la variable antes del `try` para poder usarla también
  después. `Response` es el tipo de lo que devuelve [`fetch`](../../glosario.md#fetch).
- `fetch(...)`: la petición a la [API REST](../../glosario.md#api-rest). Para las categorías, la
  URL queda `https://<ref>.supabase.co/rest/v1/categories?select=id,name,sort_order`: "dame estas
  tres columnas de cada fila de `categories`". Es un `GET`, el método por defecto de `fetch`.
- `{ headers: { apikey: key } }`: manda la [clave publishable](../../glosario.md#clave-publishable)
  en la cabecera `apikey`. Con ella Supabase sabe de qué proyecto se trata y trata la petición
  con el [rol](../../glosario.md#rol) `anon`. La spec 0013 comprobó (tarea T3) que esta cabecera
  sola basta.
- `try { ... } catch (error) { ... }`: como en Express. `fetch` lanza un error si no puede ni
  conectar (sin internet, dirección inexistente). Lo capturamos para lanzar otro más claro:
  "Supabase: no se pudo contactar con el proyecto para leer `categories`."
- `{ cause: error }`: guarda el error original dentro del nuevo, como "causa". El mensaje sale
  claro y, si hace falta, el detalle técnico sigue disponible.

```ts
	if (!response.ok) {
		throw new Error(`Supabase: reading "${table}" failed with status ${response.status}.`);
	}
	const rows = (await response.json()) as Row[];
```

- `if (!response.ok)`: Supabase contestó, pero con un código de estado de error (fuera de
  200–299). Pasa con una clave equivocada o si falta el `grant`. El mensaje dice qué tabla y qué
  código: "Supabase: la lectura de `products` falló con estado …" y el número que haya devuelto
  Supabase (por ejemplo un 401, "no autorizado"). No incluye la clave.
- `const rows = (await response.json()) as Row[];`: convierte el cuerpo JSON en una lista de
  objetos, por ejemplo
  `[{ "id": "granos-y-pastas", "name": "Granos y pastas", "sort_order": 1 }, …]`.
  `as Row[]` es una [afirmación de tipo](../../glosario.md#afirmacion-de-tipo): TypeScript no
  puede saber qué hay en ese JSON, así que le decimos que confíe. La comprobación real llega
  después, con zod.

```ts
	if (rows.length === 0) {
		throw new Error(`Supabase: "${table}" returned no rows. Check the data and its read policy.`);
	}
	if (rows.length >= MAX_ROWS) {
		throw new Error(`Supabase: "${table}" returned ${rows.length} rows, the most one request allows.`);
	}
	return rows;
}
```

- `rows.length === 0`: la respuesta es correcta (200) pero vacía. Puede que la tabla esté vacía
  de verdad, o que falte la política de lectura: con [RLS](../../glosario.md#rls) activo y sin
  política, Supabase no da error, devuelve `[]`. Las dos cosas publicarían una tienda sin
  productos, así que se para el build: "`categories` no devolvió filas. Revisa los datos y su
  política de lectura."
- `rows.length >= MAX_ROWS`: llegaron 1000 filas o más, el máximo de una petición. Puede que
  falten algunas, así que también se para (paginar, pedir de 1000 en 1000, quedó fuera de la
  spec 0013).
- `return rows;`: si pasa todo, devuelve las filas.

### 6. Las categorías, una sola vez por build

```ts
// Shared by both loaders, so categories are fetched once per build.
let categoryRows: Promise<CategoryRow[]> | undefined;
export function readCategories(): Promise<CategoryRow[]> {
	categoryRows ??= readTable<CategoryRow>('categories', 'id,name,sort_order');
	return categoryRows;
}
```

- El comentario: "La comparten los dos loaders, así las categorías se piden una sola vez por
  build."
- `let categoryRows: Promise<CategoryRow[]> | undefined;`: una variable del archivo (fuera de
  cualquier función), así que conserva su valor entre llamadas. Puede guardar una promesa de
  categorías, o nada (`undefined`, al principio) ([unión](../../glosario.md#union)).
- `export function readCategories()`: la usa el loader de `categories` en `content.config.ts`, y
  también `readProducts()` (bloque 7) para comprobar las categorías de los productos.
- `categoryRows ??= readTable<CategoryRow>(…);`: [asignación nullish](../../glosario.md#asignacion-nullish).
  La primera vez, `categoryRows` está vacía, así que se llama a `readTable` y se guarda la
  **promesa** (la petición en marcha, no el resultado). La segunda vez ya tiene valor y no se
  pide nada: las dos llamadas esperan la misma petición.
- `return categoryRows;`: devuelve esa promesa compartida.

### 7. Los productos, con su categoría comprobada

```ts
// reference() alone only logs an unknown category and the build still exits 0 (spec 0004),
// so every product's category is checked here, where a throw fails the build.
export async function readProducts(): Promise<ProductRow[]> {
	const [categories, products] = await Promise.all([
		readCategories(),
		readTable<ProductRow>('products', 'id,name,category_id,price,unit,in_stock,description,photo_path'),
	]);
```

- El comentario: "`reference()` por sí solo solo anota una categoría desconocida y el build
  termina igualmente con código 0 (spec 0004), así que la categoría de cada producto se comprueba
  aquí, donde un `throw` hace fallar el build." Antes de la spec 0013 esta comprobación estaba en
  `content.config.ts`; la explicación completa está en
  [`content.config.ts.md`](../content.config.ts.md).
- `export async function readProducts()`: la usa el loader de `products`.
- `await Promise.all([ … ])` ([promise-all](../../glosario.md#promise-all)): pide categorías y
  productos **a la vez**, y espera las dos respuestas.
  - `readCategories()`: si el loader de `categories` ya la llamó, reutiliza esa petición
    (bloque 6).
  - `readTable<ProductRow>('products', '…')`: los 8 campos de cada producto.
- `const [categories, products] = …`: guarda el primer resultado en `categories` y el segundo en
  `products`.

```ts
	const categoryIds = new Set(categories.map((category) => category.id));
	for (const product of products) {
		if (!categoryIds.has(product.category_id)) {
			throw new Error(`Supabase: product "${product.id}" has unknown category id "${product.category_id}".`);
		}
	}
	return products;
}
```

- `new Set(categories.map((category) => category.id))`: la lista de ids de categorías
  (`'granos-y-pastas'`, `'carnicos'`…) metida en un [Set](../../glosario.md#set). Un `Set` sirve
  aquí porque `.has()` responde muy rápido si un valor está dentro.
- `for (const product of products)`: recorre los productos uno a uno.
- `if (!categoryIds.has(product.category_id))`: si la categoría del producto no está en la lista,
  lanza un error con el producto y el id culpables: "el producto `arroz-blanco` tiene un id de
  categoría desconocido `granos`". El build se para.
- `return products;`: si todos están bien, devuelve los productos.

En la práctica, este error no debería salir nunca: la base de datos ya impide guardar una
categoría inexistente con su [clave foránea](../../glosario.md#clave-foranea). Es una segunda red
de seguridad, por si algún día los datos llegan de otro sitio.

### 8. La URL pública de una foto

```ts
// Public URL of a photo in the bucket; astro:assets downloads and optimizes it at build.
export function photoUrl(path: string): string {
	return `${supabaseConfig().url}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}
```

- El comentario: "URL pública de una foto del bucket; `astro:assets` la descarga y la optimiza en
  el build."
- `export function photoUrl(path: string): string`: recibe el nombre del archivo
  (`'arroz-blanco.jpg'`, la columna `photo_path`) y devuelve su URL completa.
- El resultado es `https://<ref>.supabase.co/storage/v1/object/public/product-photos/arroz-blanco.jpg`.
  `public` en la ruta significa "bucket público": se descarga sin clave
  ([Storage y bucket](../../glosario.md#storage-y-bucket)).
- `supabaseConfig().url`: vuelve a leer y validar la configuración y se queda solo con la URL.
- Esta URL **no** llega a las páginas: el componente `<Image>` la descarga en el build y escribe
  en el HTML la copia optimizada de `dist/_astro/` ([imagen remota](../../glosario.md#imagen-remota)).
  Para que Astro acepte descargarla, la dirección tiene que estar permitida en
  [`astro.config.mjs`](../../astro.config.mjs.md).

## Cómo se conecta

- **Entra:** `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`, del archivo `.env` o de Vercel
  (plantilla en [`.env.example`](../../.env.example.md), tipos en [`src/env.d.ts`](../env.d.ts.md));
  y las filas de las tablas `categories` y `products`, que crean
  [`schema.sql`](../../supabase/schema.sql.md) y llena [`seed.sql`](../../supabase/seed.sql.md).
- **Sale:** `readCategories()`, `readProducts()` y `photoUrl()` hacia los loaders de
  [`src/content.config.ts`](../content.config.ts.md). De ahí, a todas las páginas, que no saben
  nada de Supabase. Y `supabaseConfig()` hacia
  [`src/pages/admin/index.astro`](../pages/admin/index.astro.md), que escribe los dos valores en
  su HTML para el login del dueño (spec 0014).
- **No sale:** ni la clave ni la dirección de Supabase llegan a las páginas de clientes. La spec
  0013 lo comprueba buscando `supabase.co` y `sb_publishable_` en los archivos del build (AC7).
  Desde la spec 0014, la única excepción permitida es `/admin/`: los dos valores son públicos
  por diseño y su script los necesita.

## Prueba tú

Mira el error que protege contra la clave equivocada, sin tocar código ni tu `.env`:

1. En la terminal de VS Code (Git Bash), ejecuta
   `SUPABASE_PUBLISHABLE_KEY=sb_secret_prueba WHATSAPP_NUMBER=5355555555 pnpm build`. El valor
   del comando gana al de `.env`, y `sb_secret_prueba` es inventado.
2. **Qué deberías ver:** el build se para con
   `SUPABASE_PUBLISHABLE_KEY holds a secret key. Use the publishable key (sb_publishable_…).`
   El mensaje no repite la clave. En Windows puede salir después una línea
   `Assertion failed: …`: es un fallo de Node al cerrarse, no el error real (ver `AGENTS.md`,
   *Known pitfalls*). `echo $?` da un número distinto de 0.
3. No hay nada que deshacer: el valor del comando solo vale para ese comando. Un `pnpm build`
   normal vuelve a usar tu `.env`.

## Términos

- [supabase](../../glosario.md#supabase) · [api-rest](../../glosario.md#api-rest) ·
  [clave-publishable](../../glosario.md#clave-publishable) · [rol](../../glosario.md#rol) ·
  [grant](../../glosario.md#grant) · [rls](../../glosario.md#rls) ·
  [politica](../../glosario.md#politica) · [storage-y-bucket](../../glosario.md#storage-y-bucket) ·
  [clave-foranea](../../glosario.md#clave-foranea) · [snake-case](../../glosario.md#snake-case)
  (todos nuevos)
- [fetch](../../glosario.md#fetch) · [promise-all](../../glosario.md#promise-all) ·
  [asignacion-nullish](../../glosario.md#asignacion-nullish) ·
  [afirmacion-de-tipo](../../glosario.md#afirmacion-de-tipo) (nuevos)
- [variable-de-entorno](../../glosario.md#variable-de-entorno) ·
  [import-meta-env](../../glosario.md#import-meta-env) · [throw](../../glosario.md#throw) ·
  [expresion-regular](../../glosario.md#expresion-regular) ·
  [encadenamiento-opcional](../../glosario.md#encadenamiento-opcional)
- [interface](../../glosario.md#interface) · [tipo](../../glosario.md#tipo) ·
  [generico](../../glosario.md#generico) · [union](../../glosario.md#union) ·
  [typecheck](../../glosario.md#typecheck) · [import-export](../../glosario.md#import-export)
- [async-await](../../glosario.md#async-await) · [set](../../glosario.md#set) ·
  [imagen-remota](../../glosario.md#imagen-remota)
