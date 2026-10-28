# `src/lib/products.ts`

> **Qué es:** las lecturas y escrituras de productos que hace el dueño desde `/admin/`, más las
> reglas del formulario y la regla del id, hablando con Supabase con `fetch` · **Lo decidió:**
> [spec 0015](../../../../docs/specs/0015-manage-products.md) (Decision y Design →
> `src/lib/products.ts`) · **Lo usan:** solo el `<script>` de
> [`src/pages/admin/index.astro`](../pages/admin/index.astro.md) · **Usa:** `authFetch()` de
> [`auth.ts`](auth.ts.md), los tipos `CategoryRow` y `ProductRow` de
> [`supabase.ts`](supabase.ts.md) y la API de [PostgREST](../../glosario.md#postgrest)

## Para qué sirve

Con la feature 12, el dueño puede listar, añadir, cambiar y borrar productos desde el móvil. La
página `/admin/` es estática, así que, como el login, todo eso lo hace **el navegador** hablando
directamente con Supabase, a través de la [API REST](../../glosario.md#api-rest) que crea
[PostgREST](../../glosario.md#postgrest). Este archivo es el único sitio que sabe cómo:

1. **Las peticiones:** leer las categorías y los productos, y crear, cambiar o borrar un
   producto. Todas pasan por `authFetch()` de [`auth.ts`](auth.ts.md), que pone el token del
   dueño y lo renueva si hace falta.
2. **Las reglas del formulario** (`checkFields()`): las mismas que la base de datos, para dar un
   mensaje en español **antes** de mandar nada.
3. **La regla del id** (`productId()`): el `id` de un producto nuevo, que es su
   [slug](../../glosario.md#slug) en la URL, sale de su nombre: "Café Cubano 250 g" →
   `cafe-cubano-250-g`.

Como `auth.ts`, **corre en el navegador del dueño, no en el build**: solo lo importa el script
de `/admin/`. Y no protege nada por sí solo: lo que de verdad decide quién puede escribir es
[RLS](../../glosario.md#rls) con `is_owner()`, en
[`products-write.sql`](../../supabase/products-write.sql.md). Si alguien cambiara este código en
su navegador, Postgres seguiría diciendo que no.

## El código, por partes

### 1. El comentario de cabecera y los imports

```ts
// The owner's product reads and writes through the Supabase REST API (PostgREST), with plain
// fetch and no SDK (spec 0015). Browser only: imported by the admin page's script. The single
// home of the form's field rules and of the id rule. What really protects the data is RLS with
// public.is_owner() (supabase/products-write.sql); these rules only give Spanish messages first.
import { authFetch } from './auth';
// Type-only: nothing from supabase.ts (build-time code) reaches the browser bundle.
import type { CategoryRow, ProductRow } from './supabase';
```

- El comentario: "Las lecturas y escrituras de productos del dueño a través de la API REST de
  Supabase (PostgREST), con `fetch` a secas y sin SDK (spec 0015). Solo navegador: lo importa el
  script de la página de administración. El único sitio de las reglas de los campos del
  formulario y de la regla del id. Lo que de verdad protege los datos es RLS con
  `public.is_owner()` (`supabase/products-write.sql`); estas reglas solo dan antes mensajes en
  español."
- `import { authFetch } from './auth';`: la función que manda una petición con la sesión del
  dueño ([`auth.ts.md`](auth.ts.md#18-capa-2-un-reintento-si-supabase-rechaza-el-token)).
- El comentario: "Solo tipos: nada de `supabase.ts` (código del build) llega al archivo del
  navegador."
- `import type { CategoryRow, ProductRow } from './supabase';`: las formas de una fila de cada
  tabla ([`supabase.ts.md`](supabase.ts.md#2-la-forma-de-las-filas)). Con `import type`
  ([import-type](../../glosario.md#import-type)) solo se traen los tipos, que se borran al
  compilar. Sin el `type`, el navegador podría acabar descargando código de `supabase.ts`, que
  lee [variables de entorno](../../glosario.md#variable-de-entorno) y solo tiene sentido en el
  build.

### 2. Los tipos del formulario

```ts

// What the form edits. Never `id` (fixed once added) and never `photo_path` (feature 14).
export type ProductFields = Pick<ProductRow, 'name' | 'category_id' | 'price' | 'unit' | 'in_stock' | 'description'>;
```

- El comentario: "Lo que edita el formulario. Nunca `id` (fijo una vez añadido) ni `photo_path`
  (feature 14)."
- `ProductFields`: una fila de producto, pero solo con los seis campos que el dueño puede
  cambiar. `Pick<ProductRow, …>` se queda con esos campos de `ProductRow`
  ([tipos utilitarios](../../glosario.md#tipos-utilitarios)). Si un día `ProductRow` cambiara el
  tipo de un campo, este tipo cambiaría con él.

```ts

// The form's values as typed, before checkFields().
export interface RawFields {
	name: string;
	category_id: string;
	price: string;
	unit: string;
	description: string;
	in_stock: boolean;
}
```

- El comentario: "Los valores del formulario tal como se escribieron, antes de `checkFields()`."
- `RawFields`: lo que llega de los campos del formulario **sin revisar**. Fíjate en
  `price: string`: un `<input>` siempre da texto (`"12.500"`), y convertirlo en número es trabajo
  de `checkFields()`. `in_stock` ya es `boolean` porque sale de una casilla marcada o no.

```ts

export type FieldName = Exclude<keyof RawFields, 'in_stock'>;
```

- `FieldName`: los nombres de los campos que pueden tener un error:
  `'name' | 'category_id' | 'price' | 'unit' | 'description'`. `keyof RawFields` da los seis
  nombres y `Exclude<…, 'in_stock'>` quita la casilla, que no puede estar mal
  ([tipos utilitarios](../../glosario.md#tipos-utilitarios)).

```ts

export interface FieldProblem {
	field: FieldName;
	message: string;
}
```

- `FieldProblem`: un error de un campo: qué campo y qué mensaje en español. La página lo usa
  para enseñar el mensaje junto a ese campo.

### 3. Los errores

```ts

export type ProductErrorKind = 'exists' | 'noCategory' | 'invalid' | 'forbidden' | 'gone' | 'unknown';
```

- Los 6 tipos de error ([alias de tipo](../../glosario.md#alias-de-tipo)). Cada uno acaba siendo
  un mensaje en español en la página:
  - `exists`: ya hay un producto con ese `id`.
  - `noCategory`: la categoría elegida ya no existe.
  - `invalid`: Supabase rechazó algún dato.
  - `forbidden`: esta cuenta no puede escribir (no es el dueño).
  - `gone`: el producto que se quería cambiar o borrar ya no existe.
  - `unknown`: cualquier otra cosa.

```ts

// Every function here throws only this or an AuthError from authFetch(), passed through
// unchanged. The page turns `kind` into a Spanish message.
export class ProductError extends Error {
	constructor(readonly kind: ProductErrorKind) {
		super(`Products: ${kind}`);
		this.name = 'ProductError';
	}
}
```

- El comentario: "Todas las funciones de aquí lanzan solo esto, o un `AuthError` de
  `authFetch()` tal cual llega. La página convierte `kind` en un mensaje en español."
- La misma idea que `AuthError` en [`auth.ts.md`](auth.ts.md#3-los-errores): una
  [clase](../../glosario.md#clase) de error propia que lleva su `kind`. Si falla la sesión o no
  hay red, lo que llega es un `AuthError` (`signedOut`, `offline`…), que este archivo no toca;
  la página sabe tratar los dos.

### 4. Las constantes

```ts

// The limits mirror supabase/schema.sql and spec 0004.
const MAX_NAME = 60;
const MAX_UNIT = 30;
const MAX_DESCRIPTION = 300;
const MAX_ID = 60;
// The largest Postgres integer.
const MAX_PRICE = 2_147_483_647;
```

- El comentario: "Los límites copian los de `supabase/schema.sql` y la spec 0004." Son los mismos
  números que los `check` de la tabla ([`schema.sql.md`](../../supabase/schema.sql.md)): nombre de
  hasta 60 caracteres, unidad de hasta 30 y descripción de hasta 300.
- `MAX_ID = 60`: hasta dónde se corta el `id` que sale del nombre (bloque 7).
- "El mayor entero de Postgres": la columna `price` es `integer`, que llega hasta 2 147 483 647.
  Un precio mayor no cabría y Postgres lo rechazaría. El `_` solo separa las cifras para leerlas.

```ts

const HEADERS = { 'Content-Type': 'application/json', Prefer: 'return=representation' };
const PRODUCT_COLUMNS = 'id,name,category_id,price,unit,in_stock,description,photo_path';
```

- `HEADERS`: las cabeceras de **todas** las peticiones de este archivo:
  - `Content-Type: application/json`: los cuerpos que mandamos son JSON.
  - `Prefer: return=representation`: "devuélveme las filas tal como quedaron"
    ([prefer-return-representation](../../glosario.md#prefer-return-representation)). Gracias a
    ella, después de guardar, la página actualiza la lista con la fila que contesta Supabase, sin
    volver a pedirlo todo; y se puede contar cuántas filas se tocaron (bloque 13).
  - Las otras dos cabeceras, `apikey` y `Authorization`, las añade `authFetch()`.
- `PRODUCT_COLUMNS`: las ocho columnas de la tabla `products`, para el `select=` del bloque 15.

### 5. Contar caracteres como Postgres

```ts

// --- Rules ------------------------------------------------------------------------------

// Postgres char_length counts code points, not UTF-16 units like String.length.
function length(text: string): number {
	return [...text].length;
}
```

- `// --- Rules ---`: un separador visual, "Reglas".
- El comentario: "`char_length` de Postgres cuenta puntos de código, no unidades UTF-16 como
  `String.length`."
- ¿Qué significa? JavaScript guarda el texto en trozos de 16 bits. Casi todos los caracteres
  ocupan uno, pero algunos, como muchos emojis, ocupan **dos**: `"🍚".length` da `2`. Postgres,
  en cambio, cuenta caracteres de verdad (puntos de código): para él `🍚` es `1`.
- `[...text]`: el [spread](../../glosario.md#spread) de un texto lo parte en caracteres de
  verdad, así que `[..."🍚"].length` da `1`, como Postgres. Con esto, el límite de 60 del
  formulario cuenta igual que el `check` de la base de datos.

### 6. Comprobar el formulario: `checkFields()`

```ts

// Every text value is trimmed first. Returns the clean fields or one message per bad field.
export function checkFields(
	raw: RawFields,
	categoryIds: readonly string[],
): { fields: ProductFields } | { problems: FieldProblem[] } {
```

- El comentario: "Cada texto se recorta primero. Devuelve los campos limpios o un mensaje por
  cada campo malo."
- Recibe lo que escribió el dueño (`raw`) y los ids de las categorías cargadas.
  `readonly string[]`: una lista que esta función promete no cambiar.
- Devuelve una de dos formas ([unión](../../glosario.md#union)): `{ fields }` si todo está bien,
  o `{ problems }` con la lista de errores. Quien la llama pregunta cuál es con
  `'problems' in result` (ver [`index.astro.md`](../pages/admin/index.astro.md)).

```ts
	const name = raw.name.trim();
	const categoryId = raw.category_id.trim();
	const unit = raw.unit.trim();
	const description = raw.description.trim();
	// es-ES writes thousands with a dot ("12.500 CUP"), so dots are dropped. A comma is never a
	// decimal here, so "12,5" stays refused.
	const priceText = raw.price.replace(/[\s.]/g, '');
	const price = Number(priceText);
```

- `.trim()`: quita los espacios del principio y del final de cada texto (AC7). `"  Arroz "` →
  `"Arroz"`.
- El comentario: "`es-ES` escribe los miles con un punto (`12.500 CUP`), así que los puntos se
  quitan. Aquí una coma nunca es un decimal, así que `12,5` sigue rechazado."
- `raw.price.replace(/[\s.]/g, '')`: borra todos los espacios y puntos del precio
  ([expresión regular](../../glosario.md#expresion-regular): `[\s.]` = "un espacio o un punto",
  `g` = todos). El dueño ve los precios como `12.500 CUP` en la tienda, así que es natural que
  escriba `12.500`: queda `"12500"`.
- `Number(priceText)`: el texto pasado a número. Si no es un número, da `NaN` ("no es un
  número"); la comprobación de abajo lo rechaza igual.

```ts

	const problems: FieldProblem[] = [];
	if (length(name) < 1 || length(name) > MAX_NAME) {
		problems.push({ field: 'name', message: 'Escribe el nombre del producto.' });
	} else if (!/[\p{L}\p{N}]/u.test(name)) {
		problems.push({ field: 'name', message: 'El nombre necesita al menos una letra o un número.' });
	}
```

- `problems`: la lista de errores, vacía al principio. Cada regla que falla añade uno.
- Nombre vacío o de más de 60 caracteres (contados como Postgres, bloque 5) → "Escribe el
  nombre del producto."
- `else if (!/[\p{L}\p{N}]/u.test(name))`: si el largo está bien, comprueba que haya **al
  menos una letra o un número** de cualquier idioma (`\p{L}`, `\p{N}`; la bandera `u` los
  permite). Un nombre como `"!!!"` no tiene ninguno y daría un `id` vacío (bloque 7); por eso se
  rechaza: "El nombre necesita al menos una letra o un número."

```ts
	if (!categoryIds.includes(categoryId)) {
		problems.push({ field: 'category_id', message: 'Elige una categoría.' });
	}
```

- La categoría tiene que ser una de las cargadas. La primera opción del desplegable, "Elige una
  categoría", tiene el valor `''`, que no está en la lista → "Elige una categoría."

```ts
	if (!/^\d+$/.test(priceText) || price < 1 || price > MAX_PRICE) {
		problems.push({ field: 'price', message: 'El precio debe ser un número entero mayor que 0, sin decimales.' });
	}
```

- `/^\d+$/`: de principio (`^`) a fin (`$`), solo dígitos (`\d+`). Así se rechazan el signo
  menos (`-5`), las letras (`abc`), la coma (`12,5`) y el texto vacío (`""`, que no tiene ni un
  dígito).
- `price < 1`: rechaza `0`. `price > MAX_PRICE`: rechaza lo que no cabe en la columna.
- Son los precios de AC7: `-5`, `0`, `abc`, `12,5` y `""` se rechazan; `12.500` se guarda como
  `12500`.

```ts
	if (length(unit) < 1 || length(unit) > MAX_UNIT) {
		problems.push({ field: 'unit', message: 'Escribe la unidad, por ejemplo «paquete de 1 kg».' });
	}
	if (length(description) < 1 || length(description) > MAX_DESCRIPTION) {
		problems.push({ field: 'description', message: 'Escribe una descripción corta.' });
	}
```

- Unidad de 1 a 30 caracteres y descripción de 1 a 300, con sus mensajes.

```ts
	if (problems.length > 0) return { problems };
	return { fields: { name, category_id: categoryId, price, unit, in_stock: raw.in_stock, description } };
}
```

- Si hay algún error, devuelve la lista entera (así la página puede marcar **todos** los campos
  malos a la vez, no solo el primero).
- Si no, devuelve los campos limpios: los textos recortados y el precio ya como número entero.
  Es la forma `ProductFields` del bloque 2, lista para mandar a Supabase.

### 7. El id a partir del nombre: `productId()`

```ts

// The URL slug, from the name when the product is added. It never changes afterwards, so links
// already shared in WhatsApp keep working after a rename.
export function productId(name: string, takenIds: Iterable<string>): string {
```

- El comentario: "El slug de la URL, sacado del nombre al añadir el producto. Después no cambia
  nunca, así los enlaces ya compartidos en WhatsApp siguen funcionando aunque se cambie el
  nombre."
- `takenIds`: los ids que ya están usados. `Iterable<string>` = cualquier cosa que se pueda
  recorrer con `for…of` y dé textos (una lista, un [Set](../../glosario.md#set)…).

```ts
	const base = name
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, MAX_ID)
		.replace(/-+$/, '');
```

Una cadena de pasos, cada uno sobre el resultado del anterior. Con "Café Cubano 250 g":

1. `.normalize('NFD')` y `.replace(/\p{M}/gu, '')`: quita tildes y virgulillas
   ([normalización NFD](../../glosario.md#normalizacion-nfd)): `"Cafe Cubano 250 g"`. La `ñ` pasa
   a `n`.
2. `.toLowerCase()`: todo en minúsculas: `"cafe cubano 250 g"`.
3. `.replace(/[^a-z0-9]+/g, '-')`: cada grupo de caracteres que **no** sean letras `a-z` o
   dígitos (espacios, signos, emojis…) se convierte en un solo guion: `"cafe-cubano-250-g"`.
4. `.replace(/^-+|-+$/g, '')`: quita los guiones del principio y del final (`|` = "o"). Por
   ejemplo, `"¡Ñame fresco!"` daría `"-name-fresco-"` y queda `"name-fresco"`.
5. `.slice(0, MAX_ID)`: corta a 60 caracteres, para que la URL no sea enorme.
6. `.replace(/-+$/, '')`: si el corte cayó justo después de un guion, lo quita.

El resultado cumple siempre la regla de slug que exigen la tabla y el build (letras minúsculas y
dígitos separados por un guion). Nunca sale vacío, porque `checkFields()` ya exigió al menos una
letra o un número.

```ts
	const taken = new Set(takenIds);
	let id = base;
	for (let suffix = 2; taken.has(id); suffix++) id = `${base}-${suffix}`;
	return id;
}
```

- `new Set(takenIds)`: los ids usados en un [Set](../../glosario.md#set), para preguntar rápido
  con `.has()`.
- El `for`: mientras el id esté usado, prueba con `-2`, `-3`…: si `cafe-cubano-250-g` ya existe,
  el nuevo será `cafe-cubano-250-g-2` (AC3). El sufijo va después del corte, así que un id con
  sufijo puede pasar un poco de 60; ni la tabla ni el build limitan su largo, solo su forma.
- Los ids usados son los de la lista que la página tiene cargada. Si otro dispositivo añadiera
  un producto con el mismo id entretanto, Postgres lo rechazaría (clave primaria repetida) y
  llegaría el error `exists` (bloque 11).

### 8. Solo lo que cambió: `changedFields()`

```ts

// Only what differs from the stored row goes in a PATCH.
export function changedFields(row: ProductRow, fields: ProductFields): Partial<ProductFields> {
	const changes: Partial<ProductFields> = {};
	for (const key of Object.keys(fields) as (keyof ProductFields)[]) {
		if (fields[key] !== row[key]) Object.assign(changes, { [key]: fields[key] });
	}
	return changes;
}
```

- El comentario: "En un `PATCH` va solo lo que es distinto de la fila guardada."
- Recibe el producto tal como estaba (`row`) y los campos del formulario (`fields`). Devuelve un
  objeto con **solo** los campos que cambiaron. `Partial<ProductFields>`: un `ProductFields` en el
  que cada campo puede faltar ([tipos utilitarios](../../glosario.md#tipos-utilitarios)).
- `Object.keys(fields)`: los nombres de los seis campos. `as (keyof ProductFields)[]` es una
  [afirmación de tipo](../../glosario.md#afirmacion-de-tipo): `Object.keys` siempre dice "lista de
  textos", y aquí le decimos a TypeScript que son exactamente esos seis nombres.
- `if (fields[key] !== row[key])`: si el valor nuevo es distinto del guardado…
- `Object.assign(changes, { [key]: fields[key] })`: …lo copia en `changes`. `{ [key]: valor }` crea
  un objeto cuyo campo se llama como diga `key` (con `key = 'price'`, `{ price: 12500 }`).
  `Object.assign(destino, origen)` copia los campos del origen en el destino. Se escribe así, y no
  `changes[key] = fields[key]`, porque con `key` siendo una [unión](../../glosario.md#union) de
  nombres TypeScript no puede comprobar que el valor encaja en ese campo concreto y rechaza la
  asignación.
- Si el dueño cambia solo el precio, se manda `{ "price": 12500 }` y nada más. Si no cambió
  nada, `{}`, y la página ni siquiera manda la petición.

### 9. La lista agrupada: `groupProducts()`

```ts

// The admin list: categories in sort_order, products A–Z by name inside each, empty categories
// skipped. Not the catalog's "in stock first": a row must not jump when its stock is switched.
export function groupProducts(
	categories: readonly CategoryRow[],
	products: readonly ProductRow[],
): { category: CategoryRow; products: ProductRow[] }[] {
```

- El comentario: "La lista de la administración: categorías en su `sort_order`, y dentro de cada
  una los productos de la A a la Z, saltando las categorías vacías. No el 'disponibles primero'
  del catálogo: una fila no debe saltar de sitio cuando se cambia su disponibilidad."
- Por qué distinto del catálogo: la tienda pone los agotados al final
  ([`catalog.ts.md`](catalog.ts.md)). Si la administración hiciera lo mismo, al desmarcar
  "Disponible" la fila se iría al fondo de la lista justo cuando el dueño la está tocando.
- Devuelve una lista de grupos, cada uno con su categoría y sus productos.

```ts
	return [...categories]
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((category) => ({
			category,
			products: products
				.filter((product) => product.category_id === category.id)
				.sort((a, b) => a.name.localeCompare(b.name, 'es')),
		}))
		.filter((group) => group.products.length > 0);
}
```

- `[...categories]`: una copia de la lista ([spread](../../glosario.md#spread)). `.sort()`
  cambia la lista sobre la que se llama, y la original es `readonly`: se ordena la copia.
- `.sort((a, b) => a.sort_order - b.sort_order)`: categorías por su número de orden
  ([ordenar con sort](../../glosario.md#ordenar-con-sort)).
- `.map((category) => ({ … }))`: para cada categoría, un grupo
  ([array-map](../../glosario.md#array-map)):
  - `.filter(…)`: sus productos (los que tienen su `category_id`).
  - `.sort((a, b) => a.name.localeCompare(b.name, 'es'))`: de la A a la Z con las reglas del
    español ([localeCompare](../../glosario.md#localecompare)).
- `.filter((group) => group.products.length > 0)`: quita las categorías sin productos (AC2).

### 10. Leer el código de error

```ts

// --- Requests ---------------------------------------------------------------------------

// Reads the JSON body's code only when the answer says it is JSON.
async function errorCode(response: Response): Promise<string | undefined> {
	if (!response.headers.get('Content-Type')?.includes('application/json')) return undefined;
	try {
		const body = (await response.json()) as { code?: unknown };
		return typeof body.code === 'string' ? body.code : undefined;
	} catch {
		return undefined;
	}
}
```

- `// --- Requests ---`: separador, "Peticiones".
- El comentario: "Lee el `code` del cuerpo JSON solo cuando la respuesta dice que es JSON."
- Cuando Postgres rechaza algo, PostgREST contesta con un JSON que trae un `code`: el
  [código de error de Postgres](../../glosario.md#codigo-de-error-postgres), como `"23505"`.
  Esta función lo saca, o da `undefined`.
- Si la respuesta no dice `application/json`, ni lo intenta. Si dice JSON pero no lo es, el
  `catch` lo atrapa. Si `code` no es un texto, `undefined` (`unknown` obliga a comprobarlo;
  [record-y-unknown](../../glosario.md#record-y-unknown)).
- A diferencia de la de `auth.ts`, no usa `.clone()`: aquí nadie vuelve a leer el cuerpo después.

### 11. Convertir una respuesta mala en un `ProductError`

```ts

async function failure(method: string, path: string, response: Response): Promise<ProductError> {
	const code = await errorCode(response);
	if (response.status === 409 && code === '23505') return new ProductError('exists');
	if (response.status === 409 && code === '23503') return new ProductError('noCategory');
```

- `failure()` **devuelve** el error; quien la llama escribe `throw await failure(…)`.
- `409` + `23505` → `exists`: ya hay un producto con ese `id` (la
  [clave primaria](../../glosario.md#clave-primaria) no admite repetidos).
- `409` + `23503` → `noCategory`: la [clave foránea](../../glosario.md#clave-foranea) no
  encuentra la categoría (alguien la borró en el panel).
- La relación entre códigos de Postgres y números HTTP es la de la spec 0015 (sacada de la
  documentación de PostgREST).

```ts
	// A real refusal by RLS. authFetch() already refreshed and retried an expired token (401).
	if (response.status === 403 && code === '42501') return new ProductError('forbidden');
	console.error(`[products] ${method} ${path.split('?')[0]} failed with status ${response.status} (${code ?? 'no code'})`);
	return new ProductError(response.status === 400 ? 'invalid' : 'unknown');
}
```

- El comentario: "Un rechazo de verdad de RLS. `authFetch()` ya renovó y reintentó un token
  caducado (401)."
- `403` + `42501` → `forbidden`: el usuario tiene sesión pero no es el dueño, y la
  [política](../../glosario.md#politica-de-escritura) lo rechaza. No se reintenta: renovar el
  token no le daría permiso. (Un token caducado llega como `401`, y ese ya lo arregló
  `authFetch()` antes de llegar aquí.)
- Todo lo demás: una línea en la consola del navegador para quien programa, por ejemplo
  `[products] PATCH /rest/v1/products failed with status 400 (23514)`. `path.split('?')[0]`
  quita la parte `?id=eq.…`, así que el mensaje no lleva datos del producto.
- Un `400` → `invalid` (un dato que Postgres no acepta, como un `check` que no se cumple);
  cualquier otro estado → `unknown`.

### 12. Mandar una petición: `send()`

```ts

async function send<Row>(path: string, init: RequestInit = {}, expected = 200): Promise<Row[]> {
	const response = await authFetch(path, { ...init, headers: HEADERS });
	if (response.status !== expected) throw await failure(init.method ?? 'GET', path, response);
	return (await response.json()) as Row[];
}
```

- `send<Row>(…)`: la única función de este archivo que hace peticiones. `<Row>` es un
  [genérico](../../glosario.md#generico): quien la llama dice qué tipo de filas espera
  (`send<ProductRow>(…)`).
- `init: RequestInit = {}`: las opciones de `fetch` (método y cuerpo); por defecto, ninguna, que
  es un `GET` ([valor por defecto](../../glosario.md#valor-por-defecto)).
- `expected = 200`: el estado que cuenta como éxito. Crear un producto contesta `201` y lo
  pide así (bloque 16).
- `authFetch(path, { ...init, headers: HEADERS })`: la petición con la sesión del dueño, con las
  opciones y las cabeceras del bloque 4 ([spread](../../glosario.md#spread)). Si no hay sesión o
  no hay red, `authFetch` lanza un `AuthError` y este archivo lo deja pasar.
- Cualquier estado distinto del esperado → `throw await failure(…)`. `init.method ?? 'GET'`: el
  método para el mensaje de la consola ([nullish](../../glosario.md#nullish)).
- Si va bien: el cuerpo es una lista JSON de filas. Siempre una lista, también cuando se tocó
  una sola fila, gracias a `Prefer: return=representation`.

### 13. Una sola fila o nada: `onlyRow()`

```ts

// A PATCH or DELETE that matches no row answers 200 with [] (also when RLS hides the row), so
// every one checks that exactly one row came back.
function onlyRow<Row>(rows: Row[]): Row {
	const [row] = rows;
	if (rows.length !== 1 || row === undefined) throw new ProductError('gone');
	return row;
}
```

- El comentario: "Un `PATCH` o `DELETE` que no encuentra ninguna fila contesta `200` con `[]`
  (también cuando RLS esconde la fila), así que cada uno comprueba que haya vuelto exactamente
  una fila."
- Es la trampa más importante de este archivo. Para [PostgREST](../../glosario.md#postgrest),
  "cambia el producto `arroz-blanco`" cuando ese producto ya no existe **no es un error**: cambia
  cero filas y contesta `200` con `[]` (comprobado en una prueba real el 2026-10-28, tarea T3
  de la spec 0015). Lo mismo si RLS esconde la fila a quien no es el dueño
  ([política de escritura](../../glosario.md#politica-de-escritura)). Sin esta comprobación, la
  página diría "Producto guardado." sin haber guardado nada.
- `const [row] = rows;`: el primer elemento ([desestructuración](../../glosario.md#desestructuracion)
  de una lista).
- `rows.length !== 1` → `gone`: "Este producto ya no existe." El `row === undefined` es una
  segunda red: con `length` 1, `row` ya existe.

### 14. La dirección de una fila

```ts

function rowPath(id: string): string {
	return `/rest/v1/products?id=eq.${encodeURIComponent(id)}`;
}
```

- La ruta de **un** producto: `/rest/v1/products?id=eq.arroz-blanco`, "las filas de `products`
  cuyo `id` es igual a `arroz-blanco`" ([PostgREST](../../glosario.md#postgrest)).
- `encodeURIComponent(id)`: el id va dentro de una dirección, así que se codifica
  ([encodeURIComponent](../../glosario.md#encodeuricomponent)). Un id correcto solo tiene letras,
  dígitos y guiones y no cambia, pero así ningún carácter raro puede romper la dirección o añadir
  otro filtro.

### 15. Leer categorías y productos

```ts

export function listCategories(): Promise<CategoryRow[]> {
	return send<CategoryRow>('/rest/v1/categories?select=id,name,sort_order&order=sort_order.asc');
}
```

- `GET` de la tabla `categories`: las columnas `id`, `name` y `sort_order`, ordenadas por
  `sort_order` de menor a mayor. Sirve para el desplegable "Categoría" y los títulos de la lista.

```ts

export function listProducts(): Promise<ProductRow[]> {
	return send<ProductRow>(`/rest/v1/products?select=${PRODUCT_COLUMNS}&order=name.asc`);
}
```

- `GET` de **todos** los productos, disponibles o no, con sus ocho columnas, por nombre.
  Lee con el token del dueño, aunque leer es público: la política de lectura de
  [`schema.sql`](../../supabase/schema.sql.md) deja leer también al rol `authenticated`.

### 16. Añadir un producto

```ts

// The id is the only thing the admin ever sets besides the fields; photo_path stays null.
export async function addProduct(fields: ProductFields, takenIds: Iterable<string>): Promise<ProductRow> {
	const body = { id: productId(fields.name, takenIds), ...fields };
	const rows = await send<ProductRow>('/rest/v1/products', { method: 'POST', body: JSON.stringify(body) }, 201);
	const [row] = rows;
	if (row === undefined) throw new ProductError('unknown');
	return row;
}
```

- El comentario: "El id es lo único que la administración pone además de los campos;
  `photo_path` se queda en `null`."
- `body`: el `id` calculado del nombre (bloque 7) más los seis campos ya revisados. No lleva
  `photo_path`, así que Postgres lo deja vacío (`null`), que desde
  [`products-write.sql`](../../supabase/products-write.sql.md) se admite.
- `POST /rest/v1/products` con ese cuerpo, esperando `201` (creado).
- `JSON.stringify(body)`: el cuerpo va como texto. `authFetch` lo exige así para poder mandar la
  petición dos veces si tiene que renovar el token.
- Devuelve la fila creada, tal como la guardó Postgres. Si la lista llegara vacía, `unknown`.

### 17. Cambiar y borrar

```ts

export async function updateProduct(id: string, fields: Partial<ProductFields>): Promise<ProductRow> {
	return onlyRow(await send<ProductRow>(rowPath(id), { method: 'PATCH', body: JSON.stringify(fields) }));
}
```

- `PATCH /rest/v1/products?id=eq.<id>` con solo los campos que cambiaron (bloque 8). `PATCH`
  cambia esos campos y deja los demás como estaban. Nunca manda `id` ni `photo_path`.
- `onlyRow(…)`: exige que haya vuelto exactamente una fila (bloque 13), y la devuelve.

```ts

export function setStock(id: string, inStock: boolean): Promise<ProductRow> {
	return updateProduct(id, { in_stock: inStock });
}
```

- La casilla "Disponible" de cada fila de la lista: un `PATCH` con un solo campo,
  `{ "in_stock": true }` o `false`.

```ts

export async function deleteProduct(id: string): Promise<void> {
	onlyRow(await send<ProductRow>(rowPath(id), { method: 'DELETE' }));
}
```

- `DELETE /rest/v1/products?id=eq.<id>`. Gracias a `Prefer: return=representation`, la
  respuesta trae la fila borrada; `onlyRow` comprueba que se borró exactamente una. No devuelve
  nada (`void`).
- La foto del producto borrado, si la tuviera, se queda en el bucket: borrarla es cosa de la
  feature 14 (spec 0015, *Out of scope*).

## Cómo se conecta

- **Entra:** los valores del formulario y la lista cargada, que le pasa el script de
  [`admin/index.astro`](../pages/admin/index.astro.md).
- **Habla con:** la API de [PostgREST](../../glosario.md#postgrest) de Supabase,
  `/rest/v1/categories` y `/rest/v1/products`, siempre a través de `authFetch()` de
  [`auth.ts`](auth.ts.md), que pone el [access token](../../glosario.md#access-token) del dueño
  y lo renueva si hace falta.
- **La protección:** cada escritura la revisa Postgres con las políticas de
  [`products-write.sql`](../../supabase/products-write.sql.md) y los `check` de
  [`schema.sql`](../../supabase/schema.sql.md). Las reglas de `checkFields()` son una copia para
  dar mensajes antes.
- **Sale:** filas (`ProductRow`, `CategoryRow`) y errores (`ProductError` o `AuthError`) hacia
  la página, que dibuja la lista y convierte cada `kind` en un mensaje en español.
- **El sitio público no cambia al momento:** se guarda en Supabase al instante, pero las páginas
  de clientes se generan en el build. Lo verán después de publicar (feature 13).

## Prueba tú

Prueba la regla del id y la del precio en la terminal, sin tocar la base de datos ni el código.
Son las mismas cadenas de pasos que `productId()` y `checkFields()`, copiadas en un comando.

1. En la terminal de VS Code (Git Bash), ejecuta:

   ```bash
   node -e 'for (const n of ["Café Cubano 250 g", "¡Ñame fresco!", "Pan  de   molde (500 g)"]) console.log(n.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, ""))'
   ```

   **Qué deberías ver:** tres líneas, `cafe-cubano-250-g`, `name-fresco` y `pan-de-molde-500-g`.
   Fíjate en que los espacios repetidos y los paréntesis dan un solo guion.
2. Ahora la regla del precio:

   ```bash
   node -e 'for (const p of ["12.500", "12,5", "-5", "0", " 1 000 "]) { const t = p.replace(/[\s.]/g, ""); console.log(JSON.stringify(p), /^\d+$/.test(t) && Number(t) >= 1 ? Number(t) : "rechazado"); }'
   ```

   **Qué deberías ver:** `"12.500" 12500`, `"12,5" rechazado`, `"-5" rechazado`,
   `"0" rechazado` y `" 1 000 " 1000`.
3. Cambia los textos de las listas por otros nombres o precios y vuelve a ejecutar. No hay nada
   que deshacer: los comandos no tocan ningún archivo.

## Términos

- [postgrest](../../glosario.md#postgrest) ·
  [prefer-return-representation](../../glosario.md#prefer-return-representation) ·
  [codigo-de-error-postgres](../../glosario.md#codigo-de-error-postgres) ·
  [politica-de-escritura](../../glosario.md#politica-de-escritura) ·
  [tipos-utilitarios](../../glosario.md#tipos-utilitarios) ·
  [normalizacion-nfd](../../glosario.md#normalizacion-nfd) (nuevos)
- [api-rest](../../glosario.md#api-rest) · [rls](../../glosario.md#rls) ·
  [clave-primaria](../../glosario.md#clave-primaria) · [clave-foranea](../../glosario.md#clave-foranea) ·
  [access-token](../../glosario.md#access-token) · [slug](../../glosario.md#slug) ·
  [variable-de-entorno](../../glosario.md#variable-de-entorno)
- [import-type](../../glosario.md#import-type) · [alias-de-tipo](../../glosario.md#alias-de-tipo) ·
  [union](../../glosario.md#union) · [generico](../../glosario.md#generico) ·
  [clase](../../glosario.md#clase) · [record-y-unknown](../../glosario.md#record-y-unknown) ·
  [afirmacion-de-tipo](../../glosario.md#afirmacion-de-tipo)
- [expresion-regular](../../glosario.md#expresion-regular) · [spread](../../glosario.md#spread) ·
  [desestructuracion](../../glosario.md#desestructuracion) · [set](../../glosario.md#set) ·
  [array-map](../../glosario.md#array-map) · [ordenar-con-sort](../../glosario.md#ordenar-con-sort) ·
  [localeCompare](../../glosario.md#localecompare) · [nullish](../../glosario.md#nullish) ·
  [valor-por-defecto](../../glosario.md#valor-por-defecto) ·
  [encodeuricomponent](../../glosario.md#encodeuricomponent)
