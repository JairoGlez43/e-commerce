# `src/pages/index.astro`

> **Qué es:** la portada `/`, el catálogo completo ·
> **Lo decidió:** [spec 0005](../../../../docs/specs/0005-catalog-page.md) ·
> **Lo usan:** nadie lo importa; Astro lo convierte en `dist/index.html` por
> [ruta por archivo](../../glosario.md#ruta-por-archivo) ·
> **Usa:** `BaseLayout`, `SiteHeader`, `CategoryNav`, `ProductCard`, `getCatalog()`
> (`src/lib/catalog.ts`), `site` (`src/lib/site.ts`)

## Para qué sirve

Es la página que abre el cliente desde el enlace de WhatsApp. Muestra **todos** los productos,
en una sección por categoría (en el orden de las categorías), con la fila de chips de
categorías arriba. Además decide qué fotos se descargan ya y cuáles esperan al scroll, para
cumplir el [presupuesto de peso](../../glosario.md#presupuesto-de-peso).

## El código, por partes

### 1. Imports

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SiteHeader from '../components/SiteHeader.astro';
import CategoryNav from '../components/CategoryNav.astro';
import ProductCard from '../components/ProductCard.astro';
import { getCatalog } from '../lib/catalog';
import { site } from '../lib/site';
```

- `---`: abre el [frontmatter](../../glosario.md#frontmatter) (código que corre en el
  [build](../../glosario.md#build)).
- `import BaseLayout from '../layouts/BaseLayout.astro';`: el [layout](../../glosario.md#layout)
  que pone `<html>`, `<head>` y los metadatos ([explicación](../layouts/BaseLayout.astro.md)).
- `import SiteHeader ...`: la cabecera con el toldo y el nombre de la tienda
  ([explicación](../components/SiteHeader.astro.md)).
- `import CategoryNav ...`: la fila de chips de categorías
  ([explicación](../components/CategoryNav.astro.md)).
- `import ProductCard ...`: la tarjeta de producto
  ([explicación](../components/ProductCard.astro.md)).
- `import { getCatalog } from '../lib/catalog';`: la función que devuelve las categorías con
  sus productos, ya ordenados. Es el único sitio donde viven las reglas de orden
  ([explicación](../lib/catalog.ts.md)).
- `import { site } from '../lib/site';`: el nombre y la descripción de la tienda
  ([explicación](../lib/site.ts.md)).

### 2. Leer el catálogo

```astro
// Home catalog (spec 0005): every product, one section per category.
const catalog = await getCatalog();
```

- El comentario dice: "Catálogo de la portada (spec 0005): todos los productos, una sección por
  categoría".
- `const catalog = await getCatalog();`: pide el catálogo y espera a tenerlo
  ([async/await](../../glosario.md#async-await)). `catalog` es una lista de secciones; cada
  sección es `{ category, products }`. Con los datos de ejemplo hay 6 secciones de 3 productos.
  Las categorías sin productos ya vienen quitadas.

### 3. Cuántas tarjetas hay antes de cada sección

```astro
// The first 4 cards in page order load their photo eagerly, across sections.
const EAGER_CARDS = 4;
const sections = catalog.map((section, sectionIndex) => {
	const cardsBefore = catalog
		.slice(0, sectionIndex)
		.reduce((count, previous) => count + previous.products.length, 0);
	return { ...section, cardsBefore };
});
---
```

- El comentario dice: "Las 4 primeras tarjetas en el orden de la página cargan su foto de
  inmediato, contando a través de las secciones".
- `const EAGER_CARDS = 4;`: el número 4 con nombre. Escribirlo en MAYÚSCULAS es la costumbre
  para una constante fija. Las 4 primeras fotos son las que se ven sin hacer scroll en un
  móvil; la spec 0005 calcula 4 × ≤ 25 KB para no pasar de 150 KB en la primera vista (en la
  práctica suman unos 55 KB).
- `const sections = catalog.map((section, sectionIndex) => { ... });`: crea una lista nueva,
  una entrada por sección. `map` pasa cada sección y su posición (`sectionIndex`: 0, 1, 2…).
- `catalog.slice(0, sectionIndex)`: las secciones que van **antes** de esta. `slice(0, n)`
  copia los `n` primeros elementos.
- `.reduce((count, previous) => count + previous.products.length, 0)`: suma cuántos productos
  tienen esas secciones anteriores. [`reduce`](../../glosario.md#reduce) recorre la lista
  llevando un acumulado (`count`), que empieza en `0` (el último argumento).
- `return { ...section, cardsBefore };`: devuelve la misma sección con un campo más,
  `cardsBefore` ("tarjetas antes"), usando [spread](../../glosario.md#spread).
- `---`: cierra el frontmatter.

**Ejemplo con los datos reales** (cada sección tiene 3 productos):

| Sección | `sectionIndex` | Secciones antes | `cardsBefore` |
|---|---|---|---|
| Granos y pastas | 0 | ninguna | 0 |
| Cárnicos | 1 | Granos y pastas (3) | 3 |
| Despensa | 2 | Granos y pastas + Cárnicos (3 + 3) | 6 |

¿Para qué sirve? Cada tarjeta necesita saber su posición **en toda la página**, no solo dentro
de su sección. La sección 2 (Cárnicos) empieza después de 3 tarjetas. Su primera tarjeta,
Muslos de pollo, tiene posición `3 + 0 = 3`, menor que 4 → **eager**. La segunda, Picadillo de
res, tiene `3 + 1 = 4`, que ya no es menor que 4 → **lazy**. Todo Despensa empieza en 6 →
lazy. Total: 3 fotos eager en Granos y pastas + 1 en Cárnicos = 4.

### 4. Layout, cabecera y contenedor

```astro
<BaseLayout title={site.name} description={site.description}>
	<SiteHeader />
	<main class="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-8">
```

- `<BaseLayout title={site.name} description={site.description}>`: envuelve la página con el
  layout y le pasa dos [props](../../glosario.md#props): el `<title>` de la pestaña y la meta
  descripción (también la usa WhatsApp, por [Open Graph](../../glosario.md#open-graph)). Todo
  lo que va dentro acaba en el [slot](../../glosario.md#slot) del layout.
- `<SiteHeader />`: la cabecera. No recibe props.
- `<main class="...">`: el contenido principal. Clases ([Tailwind](../../glosario.md#tailwind)):
  - `mx-auto` → `margin-left: auto; margin-right: auto`: centra el bloque.
  - `max-w-5xl` → `max-width: 64rem` (1024 px): en pantallas grandes no se estira más
    ([unidades](../../glosario.md#unidades-tailwind)).
  - `flex flex-col` → `display: flex; flex-direction: column`: los hijos en columna.
  - `gap-12` → `gap: 48px` entre bloques (título, cada sección).
  - `px-4` → `padding` de 16 px a izquierda y derecha (el margen en móvil).
  - `py-8` → `padding` de 32 px arriba y abajo.

### 5. Título y chips

```astro
		<div class="flex flex-col gap-4">
			<h1>Productos</h1>
			<CategoryNav categories={catalog} currentId={null} />
		</div>
```

- `<div class="flex flex-col gap-4">`: agrupa título y chips en columna con `gap: 16px`. Así
  quedan juntos, sin el hueco grande (`gap-12`) del `<main>`.
- `<h1>Productos</h1>`: el único `h1` de la página. No lleva clases: su estilo (Fraunces,
  seminegrita, tamaño grande) viene de la capa base de `src/styles/global.css`
  ([@layer](../../glosario.md#layer-y-apply)).
- `<CategoryNav categories={catalog} currentId={null} />`: los chips. Recibe el mismo
  `catalog`, así solo hay chip para las categorías con productos. `currentId={null}` significa
  "estamos en la portada": el chip "Todos" sale seleccionado.

### 6. Estado vacío o secciones

```astro
		{
			sections.length === 0 ? (
				<p class="text-muted">Todavía no hay productos.</p>
			) : (
				sections.map(({ category, products, cardsBefore }) => (
```

- `{ sections.length === 0 ? ( ... ) : ( ... ) }`: una
  [expresión en la plantilla](../../glosario.md#expresion-en-plantilla) que elige entre dos
  trozos de HTML.
- `<p class="text-muted">Todavía no hay productos.</p>`: si no hay ninguna sección (ningún
  producto), un aviso en gris (`text-muted` → `color` del token `muted`). Lo pide la spec 0005
  (AC11).
- `sections.map(({ category, products, cardsBefore }) => (`: si hay secciones, genera HTML
  por cada una. Los parámetros se [desestructuran](../../glosario.md#desestructuracion) al
  recibirlos: `category`, `products` y el `cardsBefore` calculado en el bloque 3.

### 7. Una sección por categoría

```astro
					<section class="flex flex-col gap-4" aria-labelledby={category.id}>
						<h2 id={category.id}>{category.data.name}</h2>
						<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
```

- `<section class="flex flex-col gap-4" aria-labelledby={category.id}>`: la sección de una
  categoría. `flex flex-col gap-4` → columna con 16 px entre el título y la rejilla.
  [`aria-labelledby`](../../glosario.md#aria-label) le da a la sección el nombre del elemento
  cuyo `id` coincide: el `h2` de la línea siguiente. El lector de pantalla anuncia "región
  Cárnicos".
- `<h2 id={category.id}>{category.data.name}</h2>`: el título de la categoría. Su `id` es el
  [slug](../../glosario.md#slug) de la categoría (`carnicos`) y el texto, su nombre
  (`Cárnicos`). Es `h2` porque cuelga del `h1` "Productos"
  ([jerarquía de títulos](../../glosario.md#jerarquia-de-titulos)).
- `<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">`: la rejilla de tarjetas,
  como lista (el lector de pantalla dice "lista, 3 elementos"). Tailwind trae un reset de
  estilos que quita las viñetas a `<ul>`, por eso no se ven.
  - `grid` → `display: grid`.
  - `grid-cols-2` → `grid-template-columns: repeat(2, minmax(0, 1fr))`: 2 columnas iguales.
  - `gap-4` → 16 px entre tarjetas.
  - `sm:grid-cols-3` → desde 640 px de ancho, 3 columnas
    ([variante](../../glosario.md#variante) `sm:`).
  - `lg:grid-cols-4` → desde 1024 px, 4 columnas.

### 8. Una tarjeta por producto

```astro
							{products.map((product, index) => (
								<li>
									<ProductCard
										product={product}
										headingLevel={3}
										eager={cardsBefore + index < EAGER_CARDS}
									/>
								</li>
							))}
						</ul>
					</section>
				))
			)
		}
	</main>
</BaseLayout>
```

- `{products.map((product, index) => (`: una tarjeta por producto de la sección. `index` es la
  posición **dentro de la sección** (0, 1, 2).
- `<li>`: cada tarjeta es un elemento de la lista.
- `<ProductCard`: la tarjeta, con tres props:
  - `product={product}`: el producto.
  - `headingLevel={3}`: el nombre será un `h3`, porque va debajo del `h2` de la categoría.
  - `eager={cardsBefore + index < EAGER_CARDS}`: la posición en toda la página
    (`cardsBefore + index`) comparada con 4. Da `true` para las 4 primeras tarjetas de la
    página y `false` para el resto (ver el ejemplo del bloque 3).
- `/>`: cierra la tarjeta.
- `</li>`, `))}`, `</ul>`, `</section>`, `))`, `)`, `}`: cierran, en orden, el elemento de
  lista, el `map` de productos, la rejilla, la sección, el `map` de secciones, la rama del `? :`
  y la expresión.
- `</main>` y `</BaseLayout>`: cierran el contenido y el layout.

## Cómo se conecta

- **Datos:** `src/data/categories.json` y `src/data/products.json` → colecciones de
  `src/content.config.ts` → `getCatalog()` en `src/lib/catalog.ts` → esta página.
- **Textos:** `site.name` y `site.description` de `src/lib/site.ts`.
- **Componentes que pinta:** [`BaseLayout`](../layouts/BaseLayout.astro.md),
  [`SiteHeader`](../components/SiteHeader.astro.md),
  [`CategoryNav`](../components/CategoryNav.astro.md) y
  [`ProductCard`](../components/ProductCard.astro.md).
- **Resultado:** `dist/index.html`, la URL `/`. Sus tarjetas enlazan a `/producto/<id>`
  ([`src/pages/producto/[id].astro`](producto/%5Bid%5D.astro.md)) y sus chips a `/categoria/<id>`, que genera
  [`src/pages/categoria/[id].astro`](categoria/%5Bid%5D.astro.md).

## Prueba tú

Mira cómo `EAGER_CARDS` decide qué fotos se descargan ya.

1. Ejecuta `pnpm dev` y abre `view-source:http://localhost:4321/` en Chrome. Busca
   (`Ctrl+F`) `loading="eager"`: hay 4 resultados.
2. En `src/pages/index.astro`, cambia `const EAGER_CARDS = 4;` por `const EAGER_CARDS = 2;` y
   guarda.
3. Recarga el código fuente: ahora hay 2 `loading="eager"` (Arroz blanco y Espaguetis) y el
   resto dice `loading="lazy"`.
4. Deshaz: vuelve a poner `4`. `src/` aún no está en git, así que deshazlo a mano o con
   `Ctrl+Z`.

## Términos

- [ruta-por-archivo](../../glosario.md#ruta-por-archivo) · [frontmatter](../../glosario.md#frontmatter) · [build](../../glosario.md#build) · [layout](../../glosario.md#layout) · [slot](../../glosario.md#slot) · [props](../../glosario.md#props)
- [async-await](../../glosario.md#async-await) · [reduce](../../glosario.md#reduce) (nuevo) · [spread](../../glosario.md#spread) · [desestructuracion](../../glosario.md#desestructuracion) · [expresion-en-plantilla](../../glosario.md#expresion-en-plantilla)
- [tailwind](../../glosario.md#tailwind) · [unidades-tailwind](../../glosario.md#unidades-tailwind) · [variante](../../glosario.md#variante) · [layer-y-apply](../../glosario.md#layer-y-apply)
- [aria-label](../../glosario.md#aria-label) · [jerarquia-de-titulos](../../glosario.md#jerarquia-de-titulos) · [slug](../../glosario.md#slug)
- [lazy-loading](../../glosario.md#lazy-loading) · [presupuesto-de-peso](../../glosario.md#presupuesto-de-peso) · [open-graph](../../glosario.md#open-graph)
