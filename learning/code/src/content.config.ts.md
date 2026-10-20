# `src/content.config.ts`

> **Qué es:** la definición de las dos colecciones de datos (`categories` y `products`): de dónde salen (Supabase) y la forma obligatoria de cada elemento · **Lo decidió:** [spec 0004](../../../docs/specs/0004-sample-product-data.md) (forma de los datos), [spec 0013](../../../docs/specs/0013-catalog-data-online.md) (leerlos de Supabase) y [spec 0001](../../../docs/specs/0001-stack.md) (usar colecciones) · **Lo usan:** Astro (lo lee solo, por su nombre), y a través de él `src/lib/catalog.ts`, `src/pages/producto/[id].astro`, `src/pages/estilo.astro` y `src/components/ProductCard.astro` · **Usa:** `astro:content`, `astro/zod` y tres funciones de [`src/lib/supabase.ts`](lib/supabase.ts.md)

## Para qué sirve

Hace dos trabajos. Primero, dice **de dónde salen** los datos: desde la spec 0013, de dos tablas
de [Supabase](../glosario.md#supabase), leídas durante el [build](../glosario.md#build). Segundo,
es el "portero" de los datos: antes de que ninguna página vea un producto, Astro lo compara con
las reglas de este archivo; si falta un campo o el precio es un texto, el build se para con un
error. Es lo mismo que validar el `req.body` en una ruta de Express antes de guardarlo, pero aquí
se hace una vez, en el build, con todos los datos a la vez.

Las páginas no saben que los datos vienen ahora de Supabase y no de archivos JSON: siguen
pidiendo `getCollection('products')` y reciben lo mismo que antes. Solo cambió este archivo.

Astro busca este archivo por su nombre y su sitio exactos (`src/content.config.ts`); no hace
falta importarlo en ninguna parte.

## El código, por partes

### Las importaciones

```ts
import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { photoUrl, readCategories, readProducts } from './lib/supabase';
```

Las tres líneas son [importaciones](../glosario.md#import-export): traen a este archivo cosas
definidas en otro (como `require` en Node).

- Línea 1: trae dos funciones del [módulo virtual](../glosario.md#modulo-virtual)
  `astro:content` (el que Astro crea para manejar tus datos):
  - `defineCollection`: crea una [colección](../glosario.md#definecollection).
  - `reference`: marca un campo como "apunta a otra colección" (ver
    [reference](../glosario.md#reference)). Se usa en el campo `category`.
- Línea 2: trae `z`, el objeto con el que se escriben los [esquemas](../glosario.md#esquema)
  de [zod](../glosario.md#zod). Viene de `astro/zod`, la copia de zod que trae el propio Astro,
  así que no hay que instalarla aparte.
- Línea 3: trae tres funciones de nuestro archivo [`src/lib/supabase.ts`](lib/supabase.ts.md),
  el único que sabe hablar con Supabase:
  - `readCategories()`: devuelve las filas de la tabla `categories`.
  - `readProducts()`: devuelve las filas de la tabla `products`, ya comprobado que cada una
    apunta a una categoría que existe.
  - `photoUrl()`: convierte el nombre de una foto (`arroz-blanco.jpg`) en su URL pública.

### El comentario y la regla del slug

```ts
// Shapes decided in spec 0004; the data is read from Supabase at build (spec 0013).
// The loaders map the table columns back to that shape, and the schemas still validate every row.
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be lowercase kebab-case');
```

- El comentario dice: "Formas decididas en la spec 0004; los datos se leen de Supabase en el
  build (spec 0013). Los loaders traducen las columnas de las tablas a esa forma, y los esquemas
  siguen validando cada fila." Es decir: la base de datos ya tiene sus propias reglas
  ([`schema.sql`](../supabase/schema.sql.md)), pero el build no se fía y vuelve a comprobar.
- `const slug = ...` guarda en una variable una regla de zod, para no escribirla dos veces
  (la usan los `id` de categorías y de productos).
- `z.string()`: el valor tiene que ser un texto.
- `.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, '...')`: además, tiene que encajar con esta
  [expresión regular](../glosario.md#expresion-regular): palabras de minúsculas y números,
  unidas por guiones. `muslos-de-pollo` pasa; `Muslos_De_Pollo` o `azúcar` no. Es el formato
  [slug](../glosario.md#slug).
- El segundo argumento es el mensaje de error si no encaja: "el id debe estar en kebab-case
  en minúsculas" (*kebab-case* es el nombre en inglés de este formato con guiones).

### La colección `categories`

```ts
const categories = defineCollection({
	loader: async () =>
		(await readCategories()).map((row) => ({ id: row.id, name: row.name, order: row.sort_order })),
	schema: z.object({
		id: slug,
		name: z.string().min(1).max(30),
		order: z.number().int().nonnegative(),
	}),
});
```

- `const categories = defineCollection({ ... })`: crea la colección de categorías. Recibe un
  objeto con dos piezas: de dónde salen los datos (`loader`) y qué forma deben tener (`schema`).
- `loader: async () => ...`: el [loader](../glosario.md#loader) es aquí una función nuestra (un
  *loader en línea*). Astro la llama en cada build, espera su resultado
  ([async-await](../glosario.md#async-await)) y espera recibir una lista de objetos, cada uno con
  su `id`.
- `(await readCategories())`: pide las filas a Supabase. Los paréntesis hacen que primero se
  espere la respuesta y **después** se llame a `.map` sobre la lista que llegó. Cada fila tiene
  la forma de la tabla: `{ id: 'carnicos', name: 'Cárnicos', sort_order: 2 }`.
- `.map((row) => ({ ... }))`: convierte cada fila en una categoría con la forma de la spec 0004
  ([array-map](../glosario.md#array-map)). Los paréntesis alrededor de `{ ... }` hacen falta
  porque, sin ellos, JavaScript leería la llave como el principio del cuerpo de la función y no
  como un objeto.
  - `id: row.id, name: row.name`: se copian igual.
  - `order: row.sort_order`: la columna se llama `sort_order` en la tabla porque `order` es una
    palabra reservada de SQL; aquí se le devuelve su nombre de siempre, `order`, para que
    `catalog.ts` no cambie.
- Cada objeto devuelto se convierte en una [entrada](../glosario.md#entrada), y su `id` pasa a
  ser el `id` de la entrada.
- `schema: z.object({ ... })`: la misma forma que antes de la spec 0013:
  - `id: slug`: el `id` cumple la regla de slug de arriba.
  - `name: z.string().min(1).max(30)`: un texto de entre 1 y 30 caracteres (no vacío, y corto
    para que quepa en un chip).
  - `order: z.number().int().nonnegative()`: un número entero (`int`, sin decimales) y no
    negativo (`nonnegative`: 0 o más).

Un detalle del loader en línea (spec 0013): antes de guardar lo que devuelve, Astro **vacía** lo
que tenía guardado de la colección. Si el dueño borra una fila en Supabase, desaparece en el
siguiente build; y si el loader lanza un error, el build falla en vez de publicar datos viejos.

### La colección `products`: el loader

```ts
const products = defineCollection({
	loader: async () =>
		(await readProducts()).map((row) => ({
			id: row.id,
			name: row.name,
			category: row.category_id,
			price: row.price,
			unit: row.unit,
			inStock: row.in_stock,
			description: row.description,
			photo: photoUrl(row.photo_path),
		})),
```

- La misma idea que en `categories`: pide las filas con `readProducts()` y convierte cada una a
  la forma de la spec 0004.
- La tabla escribe los nombres en [snake_case](../glosario.md#snake-case) y el resto del código
  en camelCase, así que algunos campos cambian de nombre:
  - `category: row.category_id`: el id de la categoría (`'granos-y-pastas'`).
  - `inStock: row.in_stock`: `true` o `false`.
- `id`, `name`, `price`, `unit` y `description` se copian igual.
- `photo: photoUrl(row.photo_path)`: la tabla solo guarda el nombre del archivo
  (`'arroz-blanco.jpg'`), no la URL entera. `photoUrl()` le pone delante la dirección del
  bucket de fotos y da
  `https://<ref>.supabase.co/storage/v1/object/public/product-photos/arroz-blanco.jpg`
  ([Storage y bucket](../glosario.md#storage-y-bucket)). Así el mismo `seed.sql` sirve para el
  proyecto de Supabase de cualquier tienda.

### La colección `products`: el esquema

```ts
	schema: z.object({
		id: slug,
		name: z.string().min(1).max(60),
		// Unknown ids are already refused in readProducts(); reference() alone would only log them.
		category: reference('categories'),
```

- `schema: z.object({`: cada producto es un objeto con estos campos. Antes, el esquema era una
  función que recibía el ayudante `image()`; ya no hace falta (ver `photo`, más abajo).
- `id: slug,`: misma regla de slug que en las categorías.
- `name: z.string().min(1).max(60),`: el nombre, de 1 a 60 caracteres.
- El comentario: "Los ids desconocidos ya se rechazan en `readProducts()`; `reference()` por sí
  solo solo los anotaría en la terminal."
- `category: reference('categories'),`: convierte el texto `'carnicos'` en un enlace a la
  categoría, el objeto `{ collection: 'categories', id: 'carnicos' }`. Esa es la forma que usan
  `src/lib/catalog.ts` (`product.data.category.id`) y la página de producto (`getEntry`).

**¿Por qué la comprobación está en otro archivo?** Según midió la spec 0004 en Astro 7.3.5, un
`id` desconocido en un campo `reference()` solo escribe en la terminal
`[ERROR] Invalid content reference …`, y aun así `pnpm build` termina con
[código de salida](../glosario.md#codigo-de-salida) 0, es decir, "todo bien". Quien lanza el
build (tú, un script o Vercel) decide si salió bien mirando ese código, no leyendo los mensajes,
así que el sitio se publicaría con un producto roto. Antes de la spec 0013, este archivo leía
`categories.json` y comprobaba el id con `.refine()`. Ahora la lista de categorías llega de
Supabase, y la comprobación vive en `readProducts()` ([`supabase.ts.md`](lib/supabase.ts.md)),
que **lanza un error** ([throw](../glosario.md#throw)) si un producto apunta a una categoría que
no existe. Ese error sí para el build.

```ts
		price: z.number().int().positive(),
		unit: z.string().min(1).max(30),
		inStock: z.boolean(),
		description: z.string().min(1).max(300),
		// Remote photo, optimized at build by astro:assets (allowed in astro.config.mjs).
		photo: z.url(),
	}),
});
```

- `price: z.number().int().positive(),`: un número entero mayor que 0.
- `unit: z.string().min(1).max(30),`: la presentación (`"1 lb"`), de 1 a 30 caracteres.
- `inStock: z.boolean(),`: solo `true` o `false`.
- `description: z.string().min(1).max(300),`: la descripción, no vacía y de 300 caracteres
  como mucho.
- El comentario: "Foto remota, optimizada en el build por `astro:assets` (permitida en
  `astro.config.mjs`)."
- `photo: z.url(),`: la foto es ahora un **texto con forma de URL** ([zod](../glosario.md#zod)).
  Es el único campo cuyo tipo cambió en la spec 0013: antes era `image()`, una ruta a una foto de
  `src/assets/`. Ahora es una [imagen remota](../glosario.md#imagen-remota): el componente
  `<Image>` la descarga y la optimiza en el build, siempre que su dirección esté permitida en
  [`astro.config.mjs`](../astro.config.mjs.md) ([remotePatterns](../glosario.md#remote-patterns)).
- `}),`: cierra el `z.object`.
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

### Lo que ya no está

Hasta la spec 0013 este archivo importaba `file` de `astro/loaders` y el JSON de categorías,
usaba `file('src/data/....json')` como loader, comprobaba la categoría con `.refine()` y la foto
con `image()`. Todo eso se quitó; los datos de esos JSON están ahora en
[`supabase/seed.sql`](../supabase/seed.sql.md).

## Cómo se conecta

- **Entra:** las filas de las tablas `categories` y `products` de Supabase, a través de
  [`src/lib/supabase.ts`](lib/supabase.ts.md). Las tablas las crea
  [`supabase/schema.sql`](../supabase/schema.sql.md) y los datos de ejemplo los carga
  [`supabase/seed.sql`](../supabase/seed.sql.md).
- **Lo usa Astro** en cada `pnpm dev`, `pnpm build` y `pnpm typecheck`: llama a los loaders,
  valida los datos y genera los [tipos](../glosario.md#tipo) de cada colección. Por eso esos
  comandos necesitan ahora internet y las dos variables de Supabase (ver
  [`.env.example`](../.env.example.md)).
- **Sale hacia:**
  - [`src/lib/catalog.ts`](lib/catalog.ts.md): lee las dos colecciones con
    [getCollection](../glosario.md#getcollection) y usa el tipo `CollectionEntry`.
  - `src/pages/producto/[id].astro` y `src/pages/estilo.astro`: también leen con
    `getCollection`.
  - `src/components/ProductCard.astro`: recibe un producto ya validado y usa
    `CollectionEntry<'products'>` como tipo de su prop.

## Prueba tú

Comprueba que el esquema sigue validando lo que llega de Supabase.

1. En este archivo, en el loader de `categories`, cambia `order: row.sort_order` por
   `order: row.sort_order - 10`. Las categorías llegan con `order` 1 a 6, así que ahora valdrían
   de -9 a -4.
2. Ejecuta `pnpm build`.
3. **Qué deberías ver:** el build se para con un error de esquema de la colección `categories`
   sobre el campo `order` (la regla `nonnegative` no deja pasar números negativos). Para ver el
   código de salida justo después: en PowerShell, `$LASTEXITCODE`; en Git Bash, `echo $?`. Debe
   ser distinto de `0`.
4. **Deshacer:** vuelve a poner `order: row.sort_order` y ejecuta `pnpm build` otra vez para
   confirmar que termina bien. No has tocado Supabase: el cambio solo existía en el build.

## Términos

- [import-export](../glosario.md#import-export)
- [modulo-virtual](../glosario.md#modulo-virtual)
- [definecollection](../glosario.md#definecollection)
- [content-collection](../glosario.md#content-collection)
- [loader](../glosario.md#loader)
- [async-await](../glosario.md#async-await)
- [array-map](../glosario.md#array-map)
- [esquema](../glosario.md#esquema)
- [zod](../glosario.md#zod)
- [expresion-regular](../glosario.md#expresion-regular)
- [slug](../glosario.md#slug)
- [entrada](../glosario.md#entrada)
- [reference](../glosario.md#reference)
- [throw](../glosario.md#throw)
- [codigo-de-salida](../glosario.md#codigo-de-salida)
- [supabase](../glosario.md#supabase) (nuevo)
- [snake-case](../glosario.md#snake-case) (nuevo)
- [storage-y-bucket](../glosario.md#storage-y-bucket) (nuevo)
- [imagen-remota](../glosario.md#imagen-remota) (nuevo)
- [remote-patterns](../glosario.md#remote-patterns) (nuevo)
- [getcollection](../glosario.md#getcollection)
- [generico](../glosario.md#generico)
- [tipo](../glosario.md#tipo)
- [build](../glosario.md#build)
