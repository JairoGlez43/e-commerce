# `src/lib/products.ts`

> **Qué es:** las lecturas y escrituras de productos que hace el dueño desde `/admin/`, más las
> reglas del formulario, la regla del id y el orden en que se guarda un producto con su foto,
> hablando con Supabase con `fetch` · **Lo decidió:**
> [spec 0015](../../../../docs/specs/0015-manage-products.md) (Decision y Design →
> `src/lib/products.ts`), con los cambios de la
> [spec 0017](../../../../docs/specs/0017-product-photos-upload.md) (Design → `src/lib/products.ts`)
> · **Lo usan:** solo el `<script>` de
> [`src/pages/admin/index.astro`](../pages/admin/index.astro.md); además,
> [`photos.ts`](photos.ts.md) le toma prestada la clase `ProductError` · **Usa:** `authFetch()` de
> [`auth.ts`](auth.ts.md), `uploadPhoto()` y `deletePhoto()` de [`photos.ts`](photos.ts.md), los
> tipos `CategoryRow` y `ProductRow` de [`supabase.ts`](supabase.ts.md) y la API de
> [PostgREST](../../glosario.md#postgrest)

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
4. **El orden de guardar** (`saveProduct()`, spec 0017, feature 14): desde que el formulario
   tiene foto, guardar son hasta tres pasos (subir la foto nueva, guardar la fila, borrar la
   foto vieja). Este archivo es el único que sabe en qué orden van y qué se limpia si uno falla.
   Las peticiones de la foto en sí las hace [`photos.ts`](photos.ts.md).

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
import { deletePhoto, uploadPhoto } from './photos';
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
- `import { deletePhoto, uploadPhoto } from './photos';` (spec 0017): subir una foto al bucket y
  borrarla ([`photos.ts.md`](photos.ts.md)). Las usa `saveProduct()` (bloque 18) y
  `removeProduct()` (bloque 19).
  - Fíjate en que `photos.ts` también importa de aquí (la clase `ProductError`): cada archivo
    importa del otro. Funciona porque ninguno de los dos **usa** lo importado al cargarse, solo
    dentro de sus funciones, que se ejecutan más tarde, cuando los dos archivos ya están
    cargados.
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

// What the form edits. Never `id` (fixed once added); `photo_path` is sent only by saveProduct()
// (spec 0017).
export type ProductFields = Pick<ProductRow, 'name' | 'category_id' | 'price' | 'unit' | 'in_stock' | 'description'>;
```

- El comentario: "Lo que edita el formulario. Nunca `id` (fijo una vez añadido); `photo_path`
  solo lo manda `saveProduct()` (spec 0017)."
- `ProductFields`: una fila de producto, pero solo con los seis campos de texto, precio y
  casilla que el dueño escribe. `Pick<ProductRow, …>` se queda con esos campos de `ProductRow`
  ([tipos utilitarios](../../glosario.md#tipos-utilitarios)). Si un día `ProductRow` cambiara el
  tipo de un campo, este tipo cambiaría con él.
- La foto no es uno de ellos: no es un texto que se escribe, sino un archivo que hay que subir
  aparte. Va por su propio camino, `PhotoChange`, justo debajo.

```ts

// What happens to the photo when the form is saved (spec 0017).
export type PhotoChange = { kind: 'keep' } | { kind: 'new'; photo: Blob } | { kind: 'remove' };
```

- El comentario: "Qué le pasa a la foto cuando se guarda el formulario (spec 0017)."
- `PhotoChange`: una [unión](../../glosario.md#union) de tres formas, cada una con su `kind`:
  - `{ kind: 'keep' }`: dejar la foto como está (la que tenía, o ninguna). Es lo que vale al
    abrir el formulario.
  - `{ kind: 'new'; photo: Blob }`: poner una foto nueva. `photo` es la foto ya reducida en el
    móvil, como [Blob](../../glosario.md#blob) (un trozo de bytes con su tipo).
  - `{ kind: 'remove' }`: quitar la foto que tenía ("Quitar foto").
- Solo la forma `new` lleva `photo`. Así TypeScript no deja leer `photo.photo` sin haber
  comprobado antes que `photo.kind === 'new'`.

```ts

// The step a save is on, for the button's label.
export type SaveStep = 'uploading' | 'saving';
```

- El comentario: "El paso en que va un guardado, para el texto del botón."
- `SaveStep`: `'uploading'` (subiendo la foto) o `'saving'` (guardando la fila). La página
  pone "Subiendo foto…" o "Guardando…" en el botón según cuál le llegue (bloque 18).

```ts

type ProductChanges = Partial<ProductFields> & { photo_path?: string | null };
```

- `ProductChanges`: lo que puede llevar un `PATCH` (bloque 17). Sin `export`: solo se usa dentro
  de este archivo.
  - `Partial<ProductFields>`: cualquiera de los seis campos, todos opcionales
    ([tipos utilitarios](../../glosario.md#tipos-utilitarios)).
  - `&`: "y además". `A & B` es un objeto que cumple los dos tipos a la vez: tiene los campos de
    `A` y los de `B`.
  - `{ photo_path?: string | null }`: y, si hace falta, `photo_path`: un texto (el nombre de la
    foto nueva) o `null` (sin foto). El `?` lo hace opcional.

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

export type ProductErrorKind = 'exists' | 'noCategory' | 'invalid' | 'forbidden' | 'gone' | 'system' | 'unknown';
```

- Los 7 tipos de error ([alias de tipo](../../glosario.md#alias-de-tipo)). Cada uno acaba siendo
  un mensaje en español en la página:
  - `exists`: ya hay un producto con ese `id`.
  - `noCategory`: la categoría elegida ya no existe.
  - `invalid`: Supabase rechazó algún dato del formulario.
  - `forbidden`: esta cuenta no puede escribir (no es el dueño).
  - `gone`: el producto que se quería cambiar o borrar ya no existe.
  - `system`: Supabase rechazó la petición por un fallo del sistema (la base de datos, su SQL,
    la configuración), no por los datos. El dueño no puede arreglarlo desde el formulario.
  - `unknown`: cualquier otra cosa (por ejemplo, el servidor falló con un `500`).

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
- Desde la spec 0017, [`photos.ts`](photos.ts.md) también lanza `ProductError` cuando falla una
  subida (`forbidden`, `system` o `unknown`). Así la página usa una sola tabla de mensajes para
  todo lo que puede fallar al guardar.

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
  nada, `{}`, y `saveProduct()` (bloque 18) ni siquiera manda la petición.

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

```ts
	// Postgres classes 22 (data) and 23 (rules) mean the data sent was wrong. Any other 4xx is a
	// fault the owner cannot fix from the form (spec 0015, amended 2026-10-28).
	if (response.status === 400 && (code?.startsWith('22') || code?.startsWith('23'))) return new ProductError('invalid');
	if (response.status >= 400 && response.status < 500) return new ProductError('system');
	return new ProductError('unknown');
}
```

- El comentario: "Las clases 22 (datos) y 23 (reglas) de Postgres significan que los datos
  enviados estaban mal. Cualquier otro 4xx es un fallo que el dueño no puede arreglar desde el
  formulario."
- Los dos primeros caracteres de un [código de error](../../glosario.md#codigo-de-error-postgres)
  son su **clase**: `22…` = un valor con forma o tamaño imposible (`22P02`), `23…` = no cumple una
  regla de la tabla (`23514`, `23502`). `400` + una de esas clases → `invalid`.
- `code?.startsWith('22')`: `?.` porque `code` puede ser `undefined` (respuesta sin código). En
  ese caso la expresión da `undefined`, que cuenta como falso, y se sigue a la línea siguiente.
- Cualquier otro estado entre `400` y `499` → `system`. Por ejemplo `400` + `21000`: el
  [trigger](../../glosario.md#trigger) de publicar (spec 0016) chocó con
  [pg_safeupdate](../../glosario.md#pg-safeupdate). Antes ese caso decía "Algún dato no es
  válido" y mandaba al dueño a revisar un formulario que estaba bien.
- Lo que queda (sobre todo un `5xx`, fallo del servidor) → `unknown`, que invita a reintentar.
- `system` y `unknown` pasan por el `console.error` de arriba, así que quien mantiene la web ve el
  estado y el código en la consola.

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

### 16. Crear la fila: `insertProduct()`

```ts

async function insertProduct(body: ProductFields & { id: string; photo_path?: string }): Promise<ProductRow> {
	const rows = await send<ProductRow>('/rest/v1/products', { method: 'POST', body: JSON.stringify(body) }, 201);
	const [row] = rows;
	if (row === undefined) throw new ProductError('unknown');
	return row;
}
```

- Sin `export`: desde la spec 0017 la página ya no la llama; solo `saveProduct()` (bloque 18).
  Así nadie puede crear un producto saltándose el orden de la foto.
- `body`: los seis campos ya revisados, **y** (`&`, como en `ProductChanges`, bloque 2) el `id` y,
  si hay foto, su `photo_path`. Sin foto, el cuerpo no lleva `photo_path` y Postgres lo deja vacío
  (`null`), que desde [`products-write.sql`](../../supabase/products-write.sql.md) se admite.
- `POST /rest/v1/products` con ese cuerpo, esperando `201` (creado).
- `JSON.stringify(body)`: el cuerpo va como texto. `authFetch` necesita un cuerpo que se pueda
  mandar dos veces, por si tiene que renovar el token, y un texto se puede.
- Devuelve la fila creada, tal como la guardó Postgres. Si la lista llegara vacía, `unknown`.

### 17. Cambiar una fila y la casilla "Disponible"

```ts

async function updateProduct(id: string, changes: ProductChanges): Promise<ProductRow> {
	return onlyRow(await send<ProductRow>(rowPath(id), { method: 'PATCH', body: JSON.stringify(changes) }));
}
```

- También sin `export` desde la spec 0017: la usan `saveProduct()` y `setStock()`, de aquí mismo.
- `PATCH /rest/v1/products?id=eq.<id>` con solo lo que cambió (`ProductChanges`, bloque 2): los
  campos distintos (bloque 8) y, si cambió la foto, `photo_path`. `PATCH` cambia esos campos y
  deja los demás como estaban. Nunca manda `id`.
- `onlyRow(…)`: exige que haya vuelto exactamente una fila (bloque 13), y la devuelve.

```ts

export function setStock(id: string, inStock: boolean): Promise<ProductRow> {
	return updateProduct(id, { in_stock: inStock });
}
```

- La casilla "Disponible" de cada fila de la lista: un `PATCH` con un solo campo,
  `{ "in_stock": true }` o `false`. No toca la foto.

### 18. Guardar un producto con su foto: `saveProduct()`

```ts

// The single home of the save order, for adding and editing (spec 0017). The photo goes up
// first, then one write saves the fields and photo_path together: a failed upload saves nothing.
// A failed write deletes the new file; a successful one deletes the old file. deletePhoto()
// never throws, so a cleanup failure is only logged.
export async function saveProduct(
	row: ProductRow | null,
	fields: ProductFields,
	photo: PhotoChange,
	takenIds: Iterable<string>,
	onStep: (step: SaveStep) => void,
): Promise<ProductRow> {
```

- El comentario: "El único sitio del orden de guardar, para añadir y para editar (spec 0017).
  Primero sube la foto; luego una sola escritura guarda los campos y `photo_path` juntos: si la
  subida falla, no se guarda nada. Si la escritura falla, se borra el archivo nuevo; si sale bien,
  se borra el viejo. `deletePhoto()` nunca lanza un error, así que un fallo al limpiar solo se
  apunta en la consola."
- Por qué en este orden, con un ejemplo: el dueño cambia el precio del arroz y le pone una foto
  nueva.
  - Si se guardara **primero** la fila y la subida fallara después, la fila apuntaría a una foto
    que no existe, y el siguiente build no la encontraría.
  - Subiendo primero, lo peor que puede pasar es que quede en el bucket un archivo que nadie usa.
    No molesta a nadie: los clientes nunca piden fotos a Supabase, porque el build las descarga y
    las sirve desde la propia web (spec 0013).
- Lo que recibe:
  - `row`: el producto tal como estaba, o `null` si se está añadiendo uno.
  - `fields`: los seis campos ya revisados por `checkFields()`.
  - `photo`: qué hacer con la foto (`PhotoChange`, bloque 2).
  - `takenIds`: los ids ya usados, para el id de un producto nuevo (bloque 7).
  - `onStep`: una función de la página a la que avisar de cada paso. `(step: SaveStep) => void`
    es el tipo de una función que recibe un `SaveStep` y no devuelve nada.

```ts
	const id = row ? row.id : productId(fields.name, takenIds);
	let uploaded: string | undefined;
	if (photo.kind === 'new') {
		onStep('uploading');
		uploaded = await uploadPhoto(id, photo.photo);
	}
```

- `id`: al editar, el de siempre; al añadir, el que sale del nombre (bloque 7). Se calcula ya
  ahora porque el nombre del archivo de la foto empieza por él (`arroz-blanco-3f9a0c7e.jpg`).
- `uploaded`: el nombre del archivo subido, o `undefined` si no se subió nada.
- **Paso 1, subir** (solo con foto nueva): avisa a la página (`'uploading'`, "Subiendo foto…") y
  sube la foto con `uploadPhoto()` ([`photos.ts.md`](photos.ts.md)), que devuelve el nombre que le
  dio. Si falla, lanza un error y la función se acaba aquí: no se ha guardado nada.

```ts
	onStep('saving');
	let saved: ProductRow;
	try {
		if (row) {
			const changes: ProductChanges = changedFields(row, fields);
			if (uploaded) changes.photo_path = uploaded;
			if (photo.kind === 'remove') changes.photo_path = null;
			saved = Object.keys(changes).length > 0 ? await updateProduct(id, changes) : row;
		} else {
			saved = await insertProduct({ id, ...fields, ...(uploaded ? { photo_path: uploaded } : {}) });
		}
```

- **Paso 2, guardar la fila:** avisa a la página (`'saving'`, "Guardando…").
- Al editar (`row` existe):
  - `changedFields(row, fields)`: solo los campos que cambiaron (bloque 8).
  - Con foto nueva, se añade `photo_path` con el nombre del archivo subido.
  - Con "Quitar foto", `photo_path: null`: el producto vuelve a "Sin foto".
  - Si al final no hay nada que mandar (`Object.keys(changes).length` es `0`), no hay petición:
    se devuelve el producto tal cual. Si hay algo, un solo `PATCH` (bloque 17) con los campos y la
    foto **juntos**: o se guarda todo, o nada.
- Al añadir: un `POST` (bloque 16) con el `id`, los campos y, solo si se subió una foto,
  `photo_path`. `...(uploaded ? { photo_path: uploaded } : {})`: un
  [spread](../../glosario.md#spread) de un objeto que tiene `photo_path` o está vacío; con el
  vacío, no se añade nada.

```ts
	} catch (error) {
		if (uploaded) await deletePhoto(uploaded);
		throw error;
	}
```

- Si el paso 2 falla después de haber subido una foto, se borra ese archivo nuevo (nadie lo va a
  usar) y se vuelve a lanzar **el mismo** error, para que la página enseñe el mensaje de lo que
  falló de verdad (por ejemplo "Algún dato no es válido…"). `deletePhoto()` nunca lanza, así que
  un fallo al borrar no tapa ese error.

```ts
	if (row?.photo_path && photo.kind !== 'keep') await deletePhoto(row.photo_path);
	return saved;
}
```

- **Paso 3, limpiar:** si el producto tenía foto y se cambió o se quitó (`kind` distinto de
  `'keep'`), se borra el archivo viejo del bucket. Solo ahora, cuando la fila ya apunta a la foto
  nueva (o a ninguna). `row?.photo_path`: al añadir, `row` es `null` y esto da `undefined`
  ([encadenamiento opcional](../../glosario.md#encadenamiento-opcional)).
- Devuelve la fila guardada, que la página pone en su lista.

### 19. Borrar un producto y su foto: `removeProduct()`

```ts

// Deletes the product, then its photo. DELETE returns the deleted row, so the photo deleted is
// the one the database held.
export async function removeProduct(id: string): Promise<void> {
	const deleted = onlyRow(await send<ProductRow>(rowPath(id), { method: 'DELETE' }));
	if (deleted.photo_path) await deletePhoto(deleted.photo_path);
}
```

- El comentario: "Borra el producto y después su foto. `DELETE` devuelve la fila borrada, así que
  la foto que se borra es la que tenía la base de datos."
- `DELETE /rest/v1/products?id=eq.<id>`. Gracias a `Prefer: return=representation`, la
  respuesta trae la fila borrada; `onlyRow` comprueba que se borró exactamente una.
- `if (deleted.photo_path) await deletePhoto(…)`: si tenía foto, la borra del bucket. Se usa el
  `photo_path` de la respuesta, no el que tenía la página: si alguien cambió la foto desde otro
  móvil entretanto, la página tendría un nombre viejo, y Postgres sabe el de verdad.
- El orden importa: primero la fila, luego el archivo. Si borrar el archivo falla, el producto ya
  está borrado y la página dice "Producto borrado." igualmente; el fallo solo queda en la consola
  (spec 0017, AC7).
- Sustituye a la `deleteProduct()` de la spec 0015, que dejaba la foto en el bucket. No devuelve
  nada (`void`).

## Cómo se conecta

- **Entra:** los valores del formulario y la lista cargada, que le pasa el script de
  [`admin/index.astro`](../pages/admin/index.astro.md).
- **Habla con:** la API de [PostgREST](../../glosario.md#postgrest) de Supabase,
  `/rest/v1/categories` y `/rest/v1/products`, siempre a través de `authFetch()` de
  [`auth.ts`](auth.ts.md), que pone el [access token](../../glosario.md#access-token) del dueño
  y lo renueva si hace falta. Para las fotos, llama a `uploadPhoto()` y `deletePhoto()` de
  [`photos.ts`](photos.ts.md), que hablan con Supabase Storage.
- **La protección:** cada escritura la revisa Postgres con las políticas de
  [`products-write.sql`](../../supabase/products-write.sql.md) y los `check` de
  [`schema.sql`](../../supabase/schema.sql.md). Las reglas de `checkFields()` son una copia para
  dar mensajes antes. Las subidas y borrados de fotos los revisan las políticas de
  [`photos.sql`](../../supabase/photos.sql.md).
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
- [blob](../../glosario.md#blob) (nuevo, spec 0017) ·
  [encadenamiento-opcional](../../glosario.md#encadenamiento-opcional)
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
