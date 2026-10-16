# `src/pages/categoria/[id].astro`

> **Qué es:** la plantilla de las páginas `/categoria/<id>`, una por categoría ·
> **Lo decidió:** [spec 0005](../../../../../docs/specs/0005-catalog-page.md) (el relleno de
> abajo, `pb-12`, [spec 0011](../../../../../docs/specs/0011-visual-polish.md)) ·
> **Lo usan:** nadie lo importa; Astro genera `dist/categoria/<id>/index.html` por cada
> categoría ([ruta dinámica](../../../glosario.md#ruta-por-archivo)) ·
> **Usa:** `BaseLayout`, `SiteHeader`, `CategoryNav`, `ProductCard`, `SiteFooter`, `getCatalog()` y
> el tipo `CatalogSection` (`src/lib/catalog.ts`), `site` (`src/lib/site.ts`)

## Para qué sirve

Es el filtro por categoría. En vez de ocultar productos con JavaScript, el sitio tiene una
página estática por categoría: `/categoria/carnicos` muestra solo los cárnicos. El dueño eligió
esta opción (spec 0005): no hace falta JS y cada categoría tiene un enlace propio que se puede
compartir en WhatsApp. Un solo archivo produce las 6 páginas.

## El código, por partes

### 1. Imports

```astro
---
import type { GetStaticPaths } from 'astro';
import BaseLayout from '../../layouts/BaseLayout.astro';
import SiteHeader from '../../components/SiteHeader.astro';
import CategoryNav from '../../components/CategoryNav.astro';
import ProductCard from '../../components/ProductCard.astro';
import SiteFooter from '../../components/SiteFooter.astro';
import { getCatalog, type CatalogSection } from '../../lib/catalog';
import { site } from '../../lib/site';
```

- `---`: abre el [frontmatter](../../../glosario.md#frontmatter).
- `import type { GetStaticPaths } from 'astro';`: trae solo un [tipo](../../../glosario.md#tipo)
  ([import type](../../../glosario.md#import-type)). `GetStaticPaths` describe lo que debe
  devolver una función [`getStaticPaths`](../../../glosario.md#getstaticpaths). Se usa en el
  bloque 2.
- Las rutas empiezan por `../../` (y no `../` como en `index.astro`) porque este archivo está
  una carpeta más adentro: `src/pages/categoria/`. Hay que subir dos niveles para llegar a
  `src/`.
- `BaseLayout`, `SiteHeader`, `CategoryNav`, `ProductCard`, `SiteFooter`: los mismos componentes
  que usa la portada (ver [`index.astro.md`](../index.astro.md)). Lo que no trae son `ShopInfo` y
  `Faq`: "Cómo comprar" y las preguntas frecuentes solo salen en la portada (spec 0010).
- `import { getCatalog, type CatalogSection } from '../../lib/catalog';`: importa la función
  `getCatalog` y, en la misma línea, el tipo `CatalogSection`. La palabra `type` delante de un
  nombre dentro de las llaves hace lo mismo que `import type`, pero solo para ese nombre.
  `CatalogSection` es la forma de una sección: `{ category, products }`
  ([explicación](../../lib/catalog.ts.md)).
- `import { site } from '../../lib/site';`: el nombre de la tienda, para el título de la
  pestaña ([explicación](../../lib/site.ts.md)).

### 2. Qué páginas generar

```astro
// One static page per category (spec 0005). Empty categories get no page.
export const getStaticPaths = (async () => {
	const catalog = await getCatalog();
	return catalog.map((section) => ({
		params: { id: section.category.id },
		props: { section, catalog },
	}));
}) satisfies GetStaticPaths;
```

- El comentario dice: "Una página estática por categoría (spec 0005). Las categorías vacías no
  tienen página". Eso ocurre solo: `getCatalog()` ya quita las categorías sin productos.
- `export const getStaticPaths = (async () => { ... })`: una función
  [async](../../../glosario.md#async-await) que Astro busca por su nombre exacto. Lleva
  `export` porque Astro la llama desde fuera del archivo, durante el build, **antes** de
  generar ninguna página. Está entre paréntesis para poder ponerle `satisfies` detrás.
- `const catalog = await getCatalog();`: lee el catálogo una vez (6 secciones con los datos de
  ejemplo).
- `return catalog.map((section) => ({ ... }));`: devuelve una lista con un elemento por
  sección. Astro genera **una página por elemento**.
- `params: { id: section.category.id },`: el valor que toma `[id]` en la URL. Para la sección
  Cárnicos, `id` vale `carnicos` y la página sale en `/categoria/carnicos`.
- `props: { section, catalog },`: los datos que recibe esa página: su propia sección y el
  catálogo entero (los chips necesitan todas las categorías).
- `}) satisfies GetStaticPaths;`: [satisfies](../../../glosario.md#satisfies) pide al
  [typecheck](../../../glosario.md#typecheck) que confirme que la función cumple la forma que
  Astro espera, sin perder el detalle de qué props devuelve.

### 3. Las props de cada página

```astro
interface Props {
	section: CatalogSection;
	catalog: CatalogSection[];
}

const { section, catalog } = Astro.props;
const { category, products } = section;
```

- `interface Props { ... }`: la [interface](../../../glosario.md#interface) con lo que recibe
  cada página, que es justo lo que puso `props` en el bloque 2.
- `section: CatalogSection;`: una sección.
- `catalog: CatalogSection[];`: una lista de secciones (`[]` = lista).
- `const { section, catalog } = Astro.props;`: las saca de
  [`Astro.props`](../../../glosario.md#astro-props) con
  [desestructuración](../../../glosario.md#desestructuracion).
- `const { category, products } = section;`: separa la categoría y sus productos (ya ordenados:
  primero los disponibles, luego A–Z).

### 4. Fotos inmediatas, título y descripción

```astro
// The first 4 cards in page order load their photo eagerly.
const EAGER_CARDS = 4;
const title = `${category.data.name} · ${site.name}`;
const description = `${category.data.name}: precios y disponibilidad en ${site.name}.`;
---
```

- El comentario dice: "Las 4 primeras tarjetas en el orden de la página cargan su foto de
  inmediato".
- `const EAGER_CARDS = 4;`: el mismo límite que en la portada. Aquí no hace falta calcular
  tarjetas anteriores: hay una sola lista, así que la posición en la página es el propio
  `index` (bloque 6). Ver [lazy loading](../../../glosario.md#lazy-loading).
- ``const title = `${category.data.name} · ${site.name}`;``: el `<title>` de la pestaña, con un
  [template literal](../../../glosario.md#template-literal). Por ejemplo:
  `Cárnicos · Tienda de alimentos (demo)`.
- ``const description = `...`;``: la meta descripción, propia de cada categoría. Por ejemplo:
  `Cárnicos: precios y disponibilidad en Tienda de alimentos (demo).` La lee WhatsApp para la
  vista previa ([Open Graph](../../../glosario.md#open-graph)).
- `---`: cierra el frontmatter.

### 5. Layout, cabecera, título y chips

```astro
<BaseLayout title={title} description={description}>
	<SiteHeader />
	<main class="mx-auto flex max-w-5xl flex-col gap-12 px-4 pt-8 pb-12">
		<div class="flex flex-col gap-4">
			<h1>{category.data.name}</h1>
			<CategoryNav categories={catalog} currentId={category.id} />
		</div>
```

- `<BaseLayout title={title} description={description}>`: el [layout](../../../glosario.md#layout)
  con el título y la descripción de esta categoría.
- `<SiteHeader />`: la cabecera, igual que en la portada.
- `<main class="mx-auto flex max-w-5xl flex-col gap-12 px-4 pt-8 pb-12">`: el mismo contenedor
  que el catálogo de la portada: centrado (`mx-auto` → márgenes laterales `auto`), máximo
  1024 px de ancho (`max-w-5xl`), en columna (`flex flex-col`), 48 px entre bloques (`gap-12`) y
  16 px de margen lateral (`px-4`). Explicado clase a clase en
  [`index.astro.md`](../index.astro.md#4-layout-cabecera-y-contenedor). Aquí las clases van en el
  propio `<main>` porque esta página no tiene banda de información a todo el ancho.
  - `pt-8` → `padding-top: 32px`, y `pb-12` → `padding-bottom: 48px`. Hasta la spec 0011 era
    `py-8` (32 px arriba y abajo) y el pie de página traía su propio margen de 48 px arriba. El
    pie perdió ese margen para pegarse a la banda de la portada (spec 0011), así que esta página
    pone ahora el aire debajo de los productos con `pb-12`, antes del pie oscuro.
- `<div class="flex flex-col gap-4">`: título y chips juntos, en columna, con 16 px entre ellos.
- `<h1>{category.data.name}</h1>`: el título de la página es el nombre de la categoría
  (`Cárnicos`). Su estilo viene de la capa base de `global.css`.
- `<CategoryNav categories={catalog} currentId={category.id} />`: los chips. Ahora `currentId`
  es el `id` de esta categoría, así que su chip sale seleccionado (con
  [`aria-current="page"`](../../../glosario.md#aria-current)) y "Todos" sale normal.

### 6. La rejilla de productos

```astro
		<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{
				products.map((product, index) => (
					<li>
						<ProductCard product={product} headingLevel={2} eager={index < EAGER_CARDS} />
					</li>
				))
			}
		</ul>
	</main>
	<SiteFooter />
</BaseLayout>
```

- `<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">`: la misma rejilla que en
  la portada: `display: grid` con 2 columnas iguales, 16 px de separación, 3 columnas desde
  640 px ([variante](../../../glosario.md#variante) `sm:`) y 4 desde 1024 px (`lg:`).
  Diferencia con la portada: aquí no hay `<section>` ni `h2` de categoría, porque la página
  entera ya es la categoría.
- `{ products.map((product, index) => ( ... )) }`: una tarjeta por producto
  ([expresión en la plantilla](../../../glosario.md#expresion-en-plantilla)).
- `<li>`: cada tarjeta, un elemento de la lista.
- `<ProductCard product={product} headingLevel={2} eager={index < EAGER_CARDS} />`:
  - `headingLevel={2}`: el nombre del producto será `h2`. Como no hay `h2` de categoría, los
    nombres cuelgan directamente del `h1`; si fueran `h3` se saltaría un nivel
    ([jerarquía de títulos](../../../glosario.md#jerarquia-de-titulos)).
  - `eager={index < EAGER_CARDS}`: `true` para las tarjetas 0, 1, 2 y 3; `false` desde la 4.
    Con 3 productos por categoría, hoy todas las fotos de estas páginas son *eager*. La página
    de categoría más pesada suma unos 60 KB de fotos inmediatas, dentro del límite de 150 KB
    ([presupuesto de peso](../../../glosario.md#presupuesto-de-peso)).
- `</ul>`, `</main>`: cierran la rejilla y el contenido.
- `<SiteFooter />`: el pie de página oscuro con el nombre, el municipio, el horario y el enlace
  a WhatsApp, el mismo que en la portada ([explicación](../../components/SiteFooter.astro.md)). Va
  fuera del `<main>`, como la cabecera, porque es común a todas las páginas.
- `</BaseLayout>`: cierra el layout.

## Cómo se conecta

- **Datos:** `getCatalog()` (`src/lib/catalog.ts`), que lee las colecciones de
  `src/content.config.ts`, alimentadas por `src/data/categories.json` y
  `src/data/products.json`.
- **Componentes:** [`BaseLayout`](../../layouts/BaseLayout.astro.md),
  [`SiteHeader`](../../components/SiteHeader.astro.md),
  [`CategoryNav`](../../components/CategoryNav.astro.md),
  [`ProductCard`](../../components/ProductCard.astro.md),
  [`SiteFooter`](../../components/SiteFooter.astro.md).
- **Quién llega aquí:** los chips de `CategoryNav`, que enlazan a `/categoria/<id>` desde la
  portada y desde las otras categorías.
- **Resultado del build:** 6 archivos, `dist/categoria/<id>/index.html`, uno por categoría con
  productos. Una categoría vacía no tiene página.
- **Enlaza a:** `/` (chip "Todos" y nombre de la tienda), `/producto/<id>` (tarjetas; la página de detalle,
  [explicación](../producto/%5Bid%5D.astro.md)) y WhatsApp ("Escríbenos" en la cabecera y en el pie).

## Prueba tú

Comprueba que `getStaticPaths` corre en el build, en tu terminal, y no en el navegador.

1. En `src/pages/categoria/[id].astro`, justo debajo de `const catalog = await getCatalog();`
   (dentro de `getStaticPaths`), añade esta línea:
   `console.log('Páginas de categoría:', catalog.map((s) => s.category.id));`
2. Ejecuta `pnpm build`.
3. En la terminal verás la lista de los 6 ids (`granos-y-pastas`, `carnicos`, …). En el
   navegador no aparece nada: ese código nunca llega a él. En `dist/categoria/` hay 6
   carpetas, una por id.
4. Deshaz: borra la línea del `console.log` (con `Ctrl+Z` o a mano)
   y vuelve a ejecutar `pnpm build`.

## Términos

- [ruta-por-archivo](../../../glosario.md#ruta-por-archivo) · [getStaticPaths](../../../glosario.md#getstaticpaths) · [frontmatter](../../../glosario.md#frontmatter) · [layout](../../../glosario.md#layout) · [astro-props](../../../glosario.md#astro-props)
- [tipo](../../../glosario.md#tipo) · [import-type](../../../glosario.md#import-type) · [interface](../../../glosario.md#interface) · [satisfies](../../../glosario.md#satisfies) · [typecheck](../../../glosario.md#typecheck)
- [async-await](../../../glosario.md#async-await) · [desestructuracion](../../../glosario.md#desestructuracion) · [template-literal](../../../glosario.md#template-literal) · [expresion-en-plantilla](../../../glosario.md#expresion-en-plantilla)
- [variante](../../../glosario.md#variante) · [aria-current](../../../glosario.md#aria-current) · [jerarquia-de-titulos](../../../glosario.md#jerarquia-de-titulos)
- [lazy-loading](../../../glosario.md#lazy-loading) · [presupuesto-de-peso](../../../glosario.md#presupuesto-de-peso) · [open-graph](../../../glosario.md#open-graph)
