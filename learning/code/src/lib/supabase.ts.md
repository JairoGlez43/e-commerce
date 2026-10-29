# `src/lib/supabase.ts`

> **Qué es:** las funciones que leen el catálogo de Supabase durante el build: la hora del último
> cambio, las categorías, los productos y la URL de cada foto · **Lo decidió:**
> [spec 0013](../../../../docs/specs/0013-catalog-data-online.md) (sección Design → Reading) y,
> la hora del último cambio, [spec 0016](../../../../docs/specs/0016-publish-changes.md) ·
> **Lo usan:** [`src/content.config.ts`](../content.config.ts.md) (sus tres loaders) y, solo
> `supabaseConfig()`, [`src/pages/admin/index.astro`](../pages/admin/index.astro.md) (spec
> [0014](../../../../docs/specs/0014-owner-login.md)); solo los tipos `CategoryRow` y
> `ProductRow`, [`src/lib/products.ts`](products.ts.md) (spec 0015). El nombre del bucket tiene
> una segunda copia, para el navegador, en [`src/lib/photos.ts`](photos.ts.md) (spec 0017) ·
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
	// null until feature 14 uploads a photo (spec 0015).
	photo_path: string | null;
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
- El comentario de `photo_path`: "`null` hasta que la feature 14 suba una foto (spec 0015)".
  `string | null` es una [unión](../../glosario.md#union): el nombre del archivo, o `null` si el
  producto no tiene foto. Desde la spec 0015 la columna admite `null`
  ([`products-write.sql`](../../supabase/products-write.sql.md)), porque un producto añadido
  desde `/admin/` puede no tener foto. La feature 14 ya llegó (spec 0017): el dueño puede subir
  una foto, o quitarla y volver a `null`, desde el formulario de `/admin/`. Gracias a esta unión, TypeScript obliga a quien use
  `photo_path` a comprobar antes que no es `null` (lo hace
  [`content.config.ts`](../content.config.ts.md)).
- Estas dos interfaces también las usa [`products.ts`](products.ts.md), el código del
  navegador que lee y escribe productos desde `/admin/`. Las importa con `import type`, así que
  nada de este archivo (que es código del build) llega al navegador.
- Ojo: estas interfaces son una **promesa**, no una comprobación. TypeScript no puede ver qué
  manda Supabase de verdad. Quien comprueba los datos de verdad es el esquema de zod en
  `content.config.ts`.

### 3. Dos constantes

```ts
// The build's copy of the bucket name. src/lib/photos.ts keeps the browser's copy (spec 0017).
const PHOTO_BUCKET = 'product-photos';
// PostgREST's default limit per request; a full page could mean the catalog was cut off.
const MAX_ROWS = 1000;
```

- El comentario: "La copia del build del nombre del bucket. `src/lib/photos.ts` guarda la copia
  del navegador (spec 0017)." El mismo nombre está escrito dos veces a propósito: este archivo
  solo corre en el build y [`photos.ts`](photos.ts.md#3-las-constantes) solo en el navegador, y
  si uno importara del otro arrastraría código que en ese lado no funciona. El comentario
  recuerda que, si cambia uno, hay que cambiar el otro.
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

### 5b. El sello del catálogo, antes que nada

Nuevo con la spec 0016 (feature 13, publicar). En Supabase, la tabla `catalog_state` guarda una
sola hora, `changed_at`: la del último cambio en `products` o `categories`, que apunta sola un
[trigger](../../glosario.md#trigger) ([`publish.sql.md`](../../supabase/publish.sql.md)). El build
la copia en [`/build.json`](../pages/build.json.ts.md), y la administración la compara con la que
hay en Supabase para decir "Hay cambios sin publicar.".

```ts
// When the catalog last changed, stamped by a trigger in Supabase (spec 0016). Kept exactly as
// PostgREST returned it: the admin compares it as a string with the one in /build.json.
// Read once per build, and always before the tables below, so the stamp is never newer than the
// data in the build. An edit made during a build then still shows as pending.
let catalogChangedAt: Promise<string> | undefined;
export function readCatalogChangedAt(): Promise<string> {
	// readTable() already refused an empty answer, so the one row is there.
	catalogChangedAt ??= readTable<{ changed_at: string }>('catalog_state', 'changed_at').then(
		([row]) => row!.changed_at,
	);
	return catalogChangedAt;
}
```

- El comentario: "Cuándo cambió el catálogo por última vez, sellado por un trigger en Supabase
  (spec 0016). Se guarda exactamente como lo devolvió PostgREST: la administración lo compara como
  texto con el de `/build.json`. Se lee una vez por build, y siempre antes que las tablas de abajo,
  así el sello nunca es más nuevo que los datos del build. Un cambio hecho durante un build sigue
  saliendo entonces como pendiente."
- `let catalogChangedAt: Promise<string> | undefined;`: una variable del archivo (fuera de
  cualquier función, así que conserva su valor entre llamadas) que guarda la **promesa** de la
  lectura: la petición en marcha, no su resultado. Empieza vacía (`undefined`).
- `catalogChangedAt ??= …`: [asignación nullish](../../glosario.md#asignacion-nullish). La primera
  llamada la encuentra vacía, empieza la lectura y guarda su promesa; las siguientes ya la
  encuentran llena y no piden nada: todas esperan la misma petición. Así la hora se lee **una sola
  vez** por build aunque la pidan tres funciones. (El bloque 6 usa el mismo truco con las
  categorías.)
- `export function readCatalogChangedAt()`: la usan el loader de `catalogState` en
  [`content.config.ts`](../content.config.ts.md) y, por dentro, `readCategories()` y
  `readProducts()` (bloques 6 y 7).
- `readTable<{ changed_at: string }>('catalog_state', 'changed_at')`: la lectura del bloque 5:
  `GET /rest/v1/catalog_state?select=changed_at`. El tipo de la fila se escribe en el sitio, sin
  ponerle nombre: un objeto con un `changed_at` de texto. Si la tabla no existe o llega vacía,
  `readTable` lanza su error y el build se para (AC3).
- `.then(([row]) => row!.changed_at)`: cuando lleguen las filas, se queda con la hora de la
  primera ([promesa-then](../../glosario.md#promesa-then)). `([row])` saca el primer elemento de la
  lista ([desestructuración](../../glosario.md#desestructuracion)). El `!` le dice a TypeScript que
  `row` existe ([afirmación de no nulo](../../glosario.md#afirmacion-no-nulo)), y el comentario
  explica por qué es cierto: "`readTable()` ya rechazó una respuesta vacía, así que la fila está".
- Devuelve el texto tal cual, por ejemplo `"2026-10-28T10:00:00.123456+00:00"`
  ([timestamptz](../../glosario.md#timestamptz), [fecha ISO](../../glosario.md#fecha-iso)). No se
  convierte en fecha: la administración lo compara con el que lee después de Supabase, carácter a
  carácter, y los dos tienen que tener el mismo formato.

**¿Por qué "antes que las tablas"?** Imagina que el build leyera primero los productos y después
la hora:

1. 10:01:30: el build lee los productos (con el arroz a 280 CUP).
2. 10:01:40: el dueño cambia el arroz a 300 CUP. El trigger apunta `changed_at = 10:01:40`.
3. 10:01:50: el build lee la hora: 10:01:40, y la escribe en `/build.json`.

La web diría "tengo el catálogo de las 10:01:40", pero enseñaría el arroz a 280. La administración
vería la misma hora en los dos sitios y diría "La web está al día.": una mentira. Leyendo la hora
**primero**, `/build.json` diría 10:00 (la hora anterior), el dueño vería "Hay cambios sin
publicar." y podría publicar otra vez (spec 0016, AC7). Al revés no hay problema: si un cambio
llega entre la hora y las tablas, el build lo incluye pero la hora es la vieja, y como mucho la
tarjeta pide publicar algo que ya está.

### 6. Las categorías, una sola vez por build

```ts
// Shared by both loaders, so categories are fetched once per build.
let categoryRows: Promise<CategoryRow[]> | undefined;
export function readCategories(): Promise<CategoryRow[]> {
	categoryRows ??= readCatalogChangedAt().then(() => readTable<CategoryRow>('categories', 'id,name,sort_order'));
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
- `categoryRows ??= …;`: [asignación nullish](../../glosario.md#asignacion-nullish).
  La primera vez, `categoryRows` está vacía, así que se empieza la lectura y se guarda la
  **promesa** (la petición en marcha, no el resultado). La segunda vez ya tiene valor y no se
  pide nada: las dos llamadas esperan la misma petición.
- `readCatalogChangedAt().then(() => readTable<CategoryRow>(…))`: desde la spec 0016, la lectura
  de las categorías **espera** primero a la hora del último cambio (bloque 5b) y solo entonces
  empieza ([promesa-then](../../glosario.md#promesa-then)). `() =>` no usa la hora: solo importa
  que ya llegó. La promesa que se guarda da las categorías, como antes. Si la hora no se puede
  leer, las categorías ni se piden y el error pasa a quien espera.
- `return categoryRows;`: devuelve esa promesa compartida.

### 7. Los productos, con su categoría comprobada

```ts
// reference() alone only logs an unknown category and the build still exits 0 (spec 0004),
// so every product's category is checked here, where a throw fails the build.
export async function readProducts(): Promise<ProductRow[]> {
	await readCatalogChangedAt();
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
- `await readCatalogChangedAt();`: nuevo con la spec 0016. Antes de pedir los productos, espera a
  la hora del último cambio (bloque 5b), por la misma razón que las categorías: la hora se lee
  **antes** que el catálogo. Si ya se leyó, la promesa guardada ya está resuelta y no se espera
  nada. El resultado no se guarda: solo importa el orden.
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
  (`'arroz-blanco.jpg'`, la columna `photo_path`) y devuelve su URL completa. Recibe un `string`,
  nunca `null`: un producto sin foto no llega a llamarla (lo comprueba el loader de
  [`content.config.ts`](../content.config.ts.md)).
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
  [`schema.sql`](../../supabase/schema.sql.md) y llena [`seed.sql`](../../supabase/seed.sql.md);
  y la fila de `catalog_state`, que crea y mantiene al día
  [`publish.sql`](../../supabase/publish.sql.md) (spec 0016).
- **Sale:** `readCatalogChangedAt()`, `readCategories()`, `readProducts()` y `photoUrl()` hacia
  los loaders de [`src/content.config.ts`](../content.config.ts.md). De ahí, a todas las páginas,
  que no saben nada de Supabase, y la hora del último cambio a
  [`/build.json`](../pages/build.json.ts.md). Y `supabaseConfig()` hacia
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
- [promesa-then](../../glosario.md#promesa-then) · [trigger](../../glosario.md#trigger) ·
  [timestamptz](../../glosario.md#timestamptz) · [fecha-iso](../../glosario.md#fecha-iso) (nuevos,
  spec 0016) · [desestructuracion](../../glosario.md#desestructuracion) ·
  [afirmacion-no-nulo](../../glosario.md#afirmacion-no-nulo)
