# `src/lib/catalog.ts`

> **Qué es:** la función `getCatalog()`, que agrupa los productos por categoría y los ordena · **Lo decidió:** [spec 0005](../../../../docs/specs/0005-catalog-page.md) (sección Design, "`getCatalog()`") · **Lo usan:** `src/pages/index.astro`, `src/pages/categoria/[id].astro`, `src/components/CategoryNav.astro` (solo el tipo) · **Usa:** `astro:content` y las colecciones de [`src/content.config.ts`](../content.config.ts.md)

## Para qué sirve

La portada y las páginas de categoría necesitan los productos ya **agrupados** (una sección
por categoría) y **ordenados** (categorías por su `order`; dentro de cada una, primero los
disponibles y luego por nombre de la A a la Z). Esas reglas viven solo aquí. Si mañana el
dueño quiere otro orden, se cambia en este archivo y todas las páginas lo heredan.

Es como una consulta SQL con `JOIN`, `GROUP BY` y `ORDER BY`, pero hecha con métodos de
listas de JavaScript sobre datos que ya están en memoria.

## El código, por partes

### La importación

```ts
import { getCollection, type CollectionEntry } from 'astro:content';
```

- Trae dos cosas del [módulo virtual](../../glosario.md#modulo-virtual) `astro:content` (ver
  [import-export](../../glosario.md#import-export)):
  - `getCollection`: la función que devuelve todas las entradas de una colección (ver
    [getcollection](../../glosario.md#getcollection)).
  - `type CollectionEntry`: un [tipo](../../glosario.md#tipo), no una función. El `type`
    delante, dentro de las llaves, hace lo mismo que [`import type`](../../glosario.md#import-type)
    pero solo para ese nombre: desaparece del JavaScript final y solo sirve para el
    [typecheck](../../glosario.md#typecheck).

### La forma de una sección

```ts
export interface CatalogSection {
	category: CollectionEntry<'categories'>;
	products: CollectionEntry<'products'>[];
}
```

- `export interface CatalogSection { ... }`: declara (con una
  [interface](../../glosario.md#interface)) la forma de **una sección** del catálogo, y la
  exporta para que otros archivos puedan usar ese nombre. No genera código; solo describe.
- `category: CollectionEntry<'categories'>;`: el campo `category` es una
  [entrada](../../glosario.md#entrada) de la colección `categories`, es decir,
  `{ id, data: { id, name, order }, ... }`. `CollectionEntry<'categories'>` es un
  [genérico](../../glosario.md#generico): "una entrada de la colección `categories`".
- `products: CollectionEntry<'products'>[];`: el campo `products` es una lista (`[]` al final)
  de entradas de la colección `products`.
- Una sección queda, por ejemplo, así:
  `{ category: <entrada Cárnicos>, products: [<Muslos de pollo>, <Picadillo de res>, <Salchichas>] }`.

### El comentario con las reglas

```ts
// The only place the catalog grouping and sort rules live (spec 0005):
// categories by `order`, empty categories dropped; in-stock products first, then A–Z.
```

- "El único sitio donde viven las reglas de agrupar y ordenar el catálogo (spec 0005):
  categorías por `order`, las categorías vacías se quitan; primero los productos disponibles,
  luego de la A a la Z." Es el resumen de lo que hace la función de abajo, paso a paso.

### La función: leer los datos

```ts
export async function getCatalog(): Promise<CatalogSection[]> {
	const categories = await getCollection('categories');
	const products = await getCollection('products');
```

- `export async function getCatalog()`: una función exportada, sin parámetros, y `async`
  porque dentro espera datos (ver [async-await](../../glosario.md#async-await)).
- `: Promise<CatalogSection[]>`: lo que devuelve. Como es `async`, devuelve una promesa que,
  al resolverse, da una lista de secciones. Por eso quien la usa escribe
  `const catalog = await getCatalog();`.
- `const categories = await getCollection('categories');`: espera y guarda las 6 entradas de
  categorías, ya validadas por el esquema.
- `const products = await getCollection('products');`: lo mismo con los 18 productos.
- Fíjate en que no importa ningún JSON: pide los datos a la colección. Así, si mañana los
  datos vienen de un servidor, esta función no cambia (spec 0001; ver la lección
  [01 · Astro](../../../01-astro.md)).

### La función: ordenar las categorías

```ts
	return categories
		.sort((a, b) => a.data.order - b.data.order)
```

- `return categories`: empieza una cadena de métodos sobre la lista de categorías; cada línea
  que empieza por `.` actúa sobre el resultado de la anterior, y lo que salga al final es lo
  que devuelve la función.
- `.sort((a, b) => a.data.order - b.data.order)`: ordena las categorías por su `order`, de
  menor a mayor (ver [ordenar con sort](../../glosario.md#ordenar-con-sort)). `sort` reordena
  la propia lista y la devuelve.
  - Ejemplo: `a` = Cárnicos (`order` 2) y `b` = Granos y pastas (`order` 1). `2 - 1 = 1`,
    positivo, así que `b` va antes: Granos y pastas sale primero.
  - Restar los dos números es el truco habitual: da negativo, positivo o 0 según cuál sea
    menor.

### La función: una sección por categoría

```ts
		.map((category) => ({
			category,
			products: products
				.filter((product) => product.data.category.id === category.id)
```

- `.map((category) => ({ ... }))`: recorre las categorías ya ordenadas y convierte cada una en
  un objeto sección. Los paréntesis alrededor de las llaves `({ ... })` hacen que la flecha
  devuelva ese objeto (sin ellos, JavaScript leería las llaves como el cuerpo de la función).
- `category,`: forma corta de `category: category` (cuando la clave y la variable se llaman
  igual, basta con escribirlo una vez). Guarda la entrada de la categoría en la sección.
- `products: products`: el campo `products` de la sección se calcula a partir de la lista
  completa `products` (los 18). Las líneas siguientes la filtran y la ordenan.
- `.filter((product) => product.data.category.id === category.id)`: se queda solo con los
  productos de **esta** categoría. Recuerda que en
  [`src/content.config.ts`](../content.config.ts.md) el campo `category` de un producto pasó
  por [reference](../../glosario.md#reference) y quedó como
  `{ collection: 'categories', id: 'carnicos' }`; por eso se compara su `.id` con el `id` de
  la categoría. Es el "JOIN" de la consulta: unir cada producto con su categoría por la clave.
  `filter` crea una lista nueva; la lista completa no se toca.

### La función: ordenar los productos de cada sección

```ts
				.sort(
					(a, b) =>
						Number(b.data.inStock) - Number(a.data.inStock) ||
						a.data.name.localeCompare(b.data.name, 'es'),
				),
		}))
```

- `.sort(...)`: ordena los productos de la sección con una función que compara dos
  productos, `a` y `b`. Tiene dos criterios unidos por `||` (ver
  [ordenar con sort](../../glosario.md#ordenar-con-sort)): si el primero empata, decide el
  segundo.
- `Number(b.data.inStock) - Number(a.data.inStock)`: criterio 1, la disponibilidad.
  `Number(true)` es `1` y `Number(false)` es `0`, así que esta resta convierte "disponible o
  no" en un número. Está escrita **al revés** (`b` menos `a`) para que los `true` vayan
  primero.
- `||`: si la resta da `0` (los dos disponibles, o los dos agotados), el `0` cuenta como
  "falso" y se usa lo de la derecha.
- `a.data.name.localeCompare(b.data.name, 'es')`: criterio 2, el nombre de la A a la Z con las
  reglas del español (ver [localeCompare](../../glosario.md#localecompare)). Según la spec
  0005, esto se apoya en los datos de idiomas que trae Node, y se calcula en el build.
- `),`: cierra el `sort`; `}))` cierra el objeto sección y el `map`.

**Ejemplo concreto, la sección Cárnicos.** Llegan tres productos: Muslos de pollo
(`inStock: true`), Picadillo de res (`true`) y Salchichas (`false`).

1. `a` = Salchichas, `b` = Muslos de pollo.
   Criterio 1: `Number(true) - Number(false)` = `1 - 0` = `1`. Es positivo, así que `b`
   (Muslos de pollo) va antes. No hace falta mirar el nombre.
2. `a` = Muslos de pollo, `b` = Picadillo de res.
   Criterio 1: `1 - 1` = `0`, empate. Criterio 2:
   `'Muslos de pollo'.localeCompare('Picadillo de res', 'es')` da un número negativo (la M va
   antes que la P), así que `a` (Muslos de pollo) va antes.

Resultado: **Muslos de pollo, Picadillo de res, Salchichas.** Salchichas va la última aunque
la S esté después de la P por casualidad: aunque se llamara "Albóndigas", seguiría al final
por estar agotada.

### La función: quitar las secciones vacías

```ts
		.filter((section) => section.products.length > 0);
}
```

- `.filter((section) => section.products.length > 0)`: quita las secciones sin productos. Así
  una categoría vacía no tiene sección, ni chip, ni página (spec 0005, AC11). Con los datos
  de ejemplo no se quita ninguna, porque las 6 tienen 3 productos.
- `;` termina la cadena (y el `return`); `}` cierra la función.

El resultado final es una lista de 6 secciones, en orden: Granos y pastas, Cárnicos,
Despensa, Lácteos y huevos, Bebidas, Aseo.

## Cómo se conecta

- **Entra:** las colecciones `categories` y `products` que define
  [`src/content.config.ts`](../content.config.ts.md) a partir de
  [`categories.json`](../data/categories.json.md) y [`products.json`](../data/products.json.md).
- **Sale hacia:**
  - `src/pages/index.astro`: `const catalog = await getCatalog();` y dibuja una sección por
    elemento. También cuenta cuántas tarjetas van antes de cada sección para decidir qué
    fotos cargan sin esperar ([lazy-loading](../../glosario.md#lazy-loading)).
  - `src/pages/categoria/[id].astro`: en su [getStaticPaths](../../glosario.md#getstaticpaths)
    crea una página por sección, con `params: { id: section.category.id }`. Como las
    secciones vacías ya se quitaron aquí, una categoría vacía no tiene página.
  - `src/components/CategoryNav.astro`: recibe la misma lista para dibujar un chip por
    categoría; importa solo el tipo `CatalogSection` para declarar su prop.

## Prueba tú

Invierte el primer criterio y mira cómo los agotados pasan delante.

1. En la línea `Number(b.data.inStock) - Number(a.data.inStock) ||`, intercambia `a` y `b`:
   `Number(a.data.inStock) - Number(b.data.inStock) ||`.
2. Ejecuta `pnpm dev` y abre `http://localhost:4321`.
3. **Qué deberías ver:** en Cárnicos, Salchichas sale **la primera**; en Lácteos y huevos, lo
   mismo con Leche en polvo. El resto de secciones no cambia (no tienen productos agotados).
   Abre también `http://localhost:4321/categoria/carnicos`: pasa lo mismo, porque las dos
   páginas usan esta función.
4. **Deshacer:** vuelve a poner `Number(b.data.inStock) - Number(a.data.inStock) ||` y guarda.

## Términos

- [import-export](../../glosario.md#import-export)
- [modulo-virtual](../../glosario.md#modulo-virtual)
- [getcollection](../../glosario.md#getcollection)
- [import-type](../../glosario.md#import-type)
- [tipo](../../glosario.md#tipo)
- [typecheck](../../glosario.md#typecheck)
- [interface](../../glosario.md#interface)
- [entrada](../../glosario.md#entrada)
- [generico](../../glosario.md#generico)
- [async-await](../../glosario.md#async-await)
- [ordenar-con-sort](../../glosario.md#ordenar-con-sort)
- [reference](../../glosario.md#reference)
- [localeCompare](../../glosario.md#localecompare)
- [lazy-loading](../../glosario.md#lazy-loading)
- [getStaticPaths](../../glosario.md#getstaticpaths)
