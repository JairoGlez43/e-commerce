# `src/content.config.ts`

> **Qué es:** la definición de las dos colecciones de datos (`categories` y `products`) y la forma obligatoria de cada elemento · **Lo decidió:** [spec 0004](../../../docs/specs/0004-sample-product-data.md) (forma de los datos) y [spec 0001](../../../docs/specs/0001-stack.md) (usar colecciones) · **Lo usan:** Astro (lo lee solo, por su nombre), y a través de él `src/lib/catalog.ts`, `src/pages/estilo.astro` y `src/components/ProductCard.astro` · **Usa:** `astro:content`, `astro/zod`, `astro/loaders`, [`src/data/categories.json`](data/categories.json.md), [`src/data/products.json`](data/products.json.md)

## Para qué sirve

Es el "portero" de los datos. Antes de que ninguna página vea un producto, Astro lo compara
con las reglas de este archivo: si falta un campo, si el precio es un texto o si la categoría
no existe, el [build](../glosario.md#build) se para con un error. Es lo mismo que validar el
`req.body` en una ruta de Express antes de guardarlo en la base de datos, pero aquí se hace
una vez, en el build, con todos los datos a la vez.

Astro busca este archivo por su nombre y su sitio exactos (`src/content.config.ts`); no hace
falta importarlo en ninguna parte.

## El código, por partes

### Las importaciones

```ts
import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { file } from 'astro/loaders';
import categoryData from './data/categories.json';
```

Las cuatro líneas son [importaciones](../glosario.md#import-export): traen a este archivo
cosas que están definidas en otro (como `require` en Node).

- Línea 1: trae dos funciones del [módulo virtual](../glosario.md#modulo-virtual)
  `astro:content` (el que Astro crea para manejar tus datos):
  - `defineCollection`: crea una [colección](../glosario.md#definecollection). Se usa más
    abajo.
  - `reference`: marca un campo como "apunta a otra colección" (ver
    [reference](../glosario.md#reference)). Se usa en el campo `category`.
- Línea 2: trae `z`, el objeto con el que se escriben los [esquemas](../glosario.md#esquema)
  de [zod](../glosario.md#zod). Viene de `astro/zod`, es decir, la copia de zod que trae el
  propio Astro, así que no hay que instalarla aparte.
- Línea 3: trae `file`, un [loader](../glosario.md#loader) que lee un archivo JSON. Viene del
  paquete `astro` (la ruta `astro/loaders`), no es un módulo virtual: no lleva el prefijo
  `astro:`.
- Línea 4: [importa el JSON](../glosario.md#importar-json) de categorías directamente. En
  `categoryData` queda la lista de 6 objetos ya convertida a JavaScript, como si hubieras
  hecho `JSON.parse` del archivo. Más abajo se explica por qué se lee este archivo aquí
  además de con el loader.

### Una regla que se usa dos veces: el slug

```ts
// Shapes decided in spec 0004. Real owner-editable data must match them later.
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be lowercase kebab-case');
```

- El comentario dice: "Formas decididas en la spec 0004. Los datos reales que edite el dueño
  tendrán que cumplirlas después." Recuerda que este archivo es un contrato: cuando los datos
  vengan de otro sitio, tendrán que tener esta misma forma.
- `const slug = ...` guarda en una variable una regla de zod, para no escribirla dos veces
  (la usan los `id` de categorías y de productos).
- `z.string()`: el valor tiene que ser un texto.
- `.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, '...')`: además, tiene que encajar con esta
  [expresión regular](../glosario.md#expresion-regular): palabras de minúsculas y números,
  unidas por guiones. `muslos-de-pollo` pasa; `Muslos_De_Pollo` o `azúcar` no. Es el formato
  [slug](../glosario.md#slug).
- El segundo argumento es el mensaje de error si no encaja: "el id debe estar en kebab-case
  en minúsculas" (*kebab-case* es el nombre en inglés de este formato con guiones). Está en
  inglés porque todo el código del proyecto lo está.

### La lista de categorías válidas

```ts
// reference() alone only logs an unknown id and the build still exits 0,
// so the id is checked here first, where a schema error fails the build.
const categoryIds = categoryData.map((category) => category.id);
```

- El comentario de dos líneas dice: "`reference()` por sí solo, ante un id desconocido, solo
  escribe un aviso, y el build termina igualmente con código 0; por eso el id se comprueba
  aquí primero, donde un error de esquema sí hace fallar el build." Lo explicamos con calma
  en el campo `category`, más abajo.
- `categoryData.map((category) => category.id)` recorre las 6 categorías del JSON y se queda
  solo con su `id`. El resultado es:
  `['granos-y-pastas', 'carnicos', 'despensa', 'lacteos-y-huevos', 'bebidas', 'aseo']`.
- La lista sale **del mismo JSON**, no está copiada a mano en el código. Así
  `categories.json` sigue siendo la única lista de categorías (spec 0004): si añades una allí,
  queda permitida aquí sin tocar nada.

### La colección `categories`

```ts
const categories = defineCollection({
	loader: file('src/data/categories.json'),
	schema: z.object({
		id: slug,
		name: z.string().min(1).max(30),
		order: z.number().int().nonnegative(),
	}),
});
```

- `const categories = defineCollection({ ... })`: crea la colección de categorías. Recibe un
  objeto con dos piezas: de dónde salen los datos (`loader`) y qué forma deben tener
  (`schema`).
- `loader: file('src/data/categories.json')`: los datos salen de ese archivo. Cada objeto de
  la lista se convierte en una [entrada](../glosario.md#entrada), y su campo `id` pasa a ser
  el `id` de la entrada. Esta ruta se escribe desde la raíz del proyecto.
- `schema: z.object({ ... })`: cada categoría tiene que ser un objeto con estos campos:
  - `id: slug`: el `id` cumple la regla de slug de arriba.
  - `name: z.string().min(1).max(30)`: un texto de entre 1 y 30 caracteres (no vacío, y
    corto para que quepa en un chip).
  - `order: z.number().int().nonnegative()`: un número (`number`), entero (`int`, sin
    decimales) y no negativo (`nonnegative`: 0 o más).
- `});`: cierra el objeto y la llamada a `defineCollection`.

### La colección `products`

```ts
const products = defineCollection({
	loader: file('src/data/products.json'),
	schema: ({ image }) =>
		z.object({
			id: slug,
			name: z.string().min(1).max(60),
```

- `const products = defineCollection({`: igual que arriba, ahora para los productos.
- `loader: file('src/data/products.json')`: los datos salen del JSON de productos; cada
  producto será una entrada con su `id` (por ejemplo `arroz-blanco`).
- `schema: ({ image }) =>`: aquí el esquema no es un objeto directamente, sino una **función
  que devuelve** el esquema. Astro la llama y le pasa un objeto con ayudantes; con
  [desestructuración](../glosario.md#desestructuracion) nos quedamos con uno: `image`. Hace
  falta esta forma solo porque el campo `photo` necesita ese ayudante.
- `z.object({`: lo que devuelve la función: cada producto es un objeto con estos campos.
- `id: slug,`: misma regla de slug que en las categorías.
- `name: z.string().min(1).max(60),`: el nombre, de 1 a 60 caracteres.

```ts
			category: z
				.string()
				.refine((id) => categoryIds.includes(id), { message: 'unknown category id' })
				.pipe(reference('categories')),
```

Este es el campo más interesante. Se lee como una cadena de pasos, de arriba abajo; cada
paso solo se ejecuta si el anterior pasó.

- `category: z`: empieza la regla del campo `category`. Está partida en varias líneas solo
  para leerla mejor; es una sola expresión.
- `.string()`: paso 1, tiene que ser un texto.
- `.refine((id) => categoryIds.includes(id), { message: 'unknown category id' })`: paso 2, una
  regla propia. La función recibe el texto (`id`) y devuelve `true` si está en la lista
  `categoryIds` (`includes` comprueba si un elemento está en una lista). Si devuelve `false`,
  zod da un error con el mensaje "id de categoría desconocido".
- `.pipe(reference('categories'))`: paso 3. El texto ya validado se pasa ("por una tubería",
  *pipe*) a `reference('categories')`, que lo convierte en un enlace a la categoría. Tras
  este paso, el campo ya no es el texto `'carnicos'`, sino el objeto
  `{ collection: 'categories', id: 'carnicos' }`.

**Ejemplo con dos valores:**

| Valor en el JSON | Paso 1 | Paso 2 | Paso 3 | Resultado |
|---|---|---|---|---|
| `"carnicos"` | es texto ✓ | está en la lista ✓ | se convierte | `{ collection: 'categories', id: 'carnicos' }` |
| `"verduras"` | es texto ✓ | no está ✗ | no llega | error `unknown category id`, el build falla |

**¿Por qué no basta con `reference('categories')` solo?** Porque, según midió la spec 0004
en Astro 7.3.5, un `id` desconocido en un campo `reference()` solo escribe en la terminal
`[ERROR] Invalid content reference …`, y aun así `pnpm build` termina con
[código de salida](../glosario.md#codigo-de-salida) 0, es decir, "todo bien". Quien lanza el build (tú, un script o el hosting) decide si
siguió bien mirando ese código, no leyendo los mensajes, así que el sitio se publicaría con un
producto roto. En cambio, un error de esquema de zod (el que lanza `.refine`) sí hace que el build
termine con un código distinto de 0 y se pare. Por eso se comprueba primero con `.refine` y
después se pasa a `reference()`: se gana el fallo seguro y se conserva la forma
`{ collection, id }`, que es la que usa `src/lib/catalog.ts` (`product.data.category.id`).

Es como una clave foránea en una base de datos: no te deja guardar un producto que apunte a
una categoría que no existe.

```ts
			price: z.number().int().positive(),
			unit: z.string().min(1).max(30),
			inStock: z.boolean(),
			description: z.string().min(1).max(300),
			photo: image(),
		}),
});
```

- `price: z.number().int().positive(),`: un número entero mayor que 0. Un precio `"280"`
  (texto), `280.5` (decimal) o `0` rompe el build.
- `unit: z.string().min(1).max(30),`: la presentación (`"1 lb"`), de 1 a 30 caracteres.
- `inStock: z.boolean(),`: solo `true` o `false`.
- `description: z.string().min(1).max(300),`: la descripción, no vacía y de 300 caracteres
  como mucho.
- `photo: image(),`: el campo es la ruta a una [imagen local](../glosario.md#image-en-esquema).
  La ruta se escribe relativa al JSON (`../assets/products/arroz-blanco.jpg`). Astro procesa
  esa foto en el build para que el componente `<Image>` pueda optimizarla
  ([image-component](../glosario.md#image-component)).
- `}),`: cierra el `z.object` (y con él lo que devuelve la función del esquema).
- `});`: cierra la llamada a `defineCollection`.

Ningún campo lleva `.optional()`: los 8 son obligatorios (spec 0004).

### La exportación

```ts
export const collections = { categories, products };
```

- `export` hace que Astro pueda leer esta variable desde fuera del archivo. Astro busca
  exactamente el nombre `collections`.
- `{ categories, products }` es una forma corta de escribir
  `{ categories: categories, products: products }` (cuando la clave y la variable se llaman
  igual, basta con escribirlo una vez).
- Las claves de este objeto son los nombres de las colecciones. Por eso en otros archivos se
  escribe `getCollection('products')` o el [genérico](../glosario.md#generico)
  `CollectionEntry<'categories'>`: ese texto tiene que coincidir con una de estas claves.

## Cómo se conecta

- **Entra:** [`src/data/categories.json`](data/categories.json.md) (por el loader y por el
  `import`) y [`src/data/products.json`](data/products.json.md) (por el loader); las fotos de
  `src/assets/products/` (por `image()`).
- **Lo usa Astro** en cada `pnpm dev`, `pnpm build` y `pnpm typecheck`: valida los datos y
  genera los [tipos](../glosario.md#tipo) de cada colección.
- **Sale hacia:**
  - [`src/lib/catalog.ts`](lib/catalog.ts.md): lee las dos colecciones con
    [getCollection](../glosario.md#getcollection) y usa el tipo `CollectionEntry`.
  - `src/pages/estilo.astro`: también lee las dos colecciones con `getCollection`.
  - `src/components/ProductCard.astro`: recibe un producto ya validado y usa
    `CollectionEntry<'products'>` como tipo de su prop.

## Prueba tú

Comprueba que una categoría inventada detiene el build.

1. En [`src/data/products.json`](data/products.json.md), en el producto `"arroz-blanco"`,
   cambia `"category": "granos-y-pastas"` por `"category": "granos"`.
2. Ejecuta `pnpm build`.
3. **Qué deberías ver:** el build se para con un error de esquema que nombra el campo
   `category` y el mensaje `unknown category id` (spec 0004, AC2). Para ver el código de
   salida justo después: en PowerShell, `$LASTEXITCODE`; en Git Bash, `echo $?`. Debe ser
   distinto de `0`.
4. **Deshacer:** vuelve a poner `"category": "granos-y-pastas"` y ejecuta `pnpm build` otra
   vez para confirmar que termina bien.

## Términos

- [import-export](../glosario.md#import-export)
- [importar-json](../glosario.md#importar-json)
- [definecollection](../glosario.md#definecollection)
- [image-en-esquema](../glosario.md#image-en-esquema)
- [codigo-de-salida](../glosario.md#codigo-de-salida)
- [modulo-virtual](../glosario.md#modulo-virtual)
- [content-collection](../glosario.md#content-collection)
- [loader](../glosario.md#loader)
- [esquema](../glosario.md#esquema)
- [zod](../glosario.md#zod)
- [expresion-regular](../glosario.md#expresion-regular)
- [slug](../glosario.md#slug)
- [entrada](../glosario.md#entrada)
- [reference](../glosario.md#reference)
- [desestructuracion](../glosario.md#desestructuracion)
- [image-component](../glosario.md#image-component)
- [getcollection](../glosario.md#getcollection)
- [generico](../glosario.md#generico)
- [tipo](../glosario.md#tipo)
- [build](../glosario.md#build)
