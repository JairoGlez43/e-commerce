# `src/pages/index.astro`

> **Qué es:** la portada `/`, el catálogo completo ·
> **Lo decidió:** [spec 0005](../../../../docs/specs/0005-catalog-page.md) (y la información
> de la tienda, [spec 0010](../../../../docs/specs/0010-shop-information.md); la banda de
> información a todo el ancho, [spec 0011](../../../../docs/specs/0011-visual-polish.md), AC3) ·
> **Lo usan:** nadie lo importa; Astro lo convierte en `dist/index.html` por
> [ruta por archivo](../../glosario.md#ruta-por-archivo) ·
> **Usa:** `BaseLayout`, `SiteHeader`, `CategoryNav`, `ProductCard`, `ShopInfo`, `Faq`,
> `SiteFooter`, `getCatalog()` (`src/lib/catalog.ts`), `formatDay()` (`src/lib/date.ts`),
> `site` (`src/lib/site.ts`)

## Para qué sirve

Es la página que abre el cliente desde el enlace de WhatsApp. Muestra **todos** los productos,
en una sección por categoría (en el orden de las categorías), con la fila de chips de
categorías arriba. Encima de los chips dice cuándo se actualizó el catálogo y qué formas de
pago acepta la tienda; debajo de los productos, en una banda de otro color que ocupa todo el
ancho de la pantalla, cómo comprar, recogida, horario y las preguntas frecuentes; y al final, el
pie de página oscuro. Además decide qué fotos se descargan ya y cuáles
esperan al scroll, para cumplir el [presupuesto de peso](../../glosario.md#presupuesto-de-peso).

## El código, por partes

### 1. Imports

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SiteHeader from '../components/SiteHeader.astro';
import CategoryNav from '../components/CategoryNav.astro';
import ProductCard from '../components/ProductCard.astro';
import ShopInfo from '../components/ShopInfo.astro';
import Faq from '../components/Faq.astro';
import SiteFooter from '../components/SiteFooter.astro';
import { getCatalog } from '../lib/catalog';
import { formatDay } from '../lib/date';
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
- `import ShopInfo ...`: "Cómo comprar", recogida y horario
  ([explicación](../components/ShopInfo.astro.md)).
- `import Faq ...`: las preguntas frecuentes ([explicación](../components/Faq.astro.md)).
- `import SiteFooter ...`: el pie de página ([explicación](../components/SiteFooter.astro.md)).
- `import { getCatalog } from '../lib/catalog';`: la función que devuelve las categorías con
  sus productos, ya ordenados. Es el único sitio donde viven las reglas de orden
  ([explicación](../lib/catalog.ts.md)).
- `import { formatDay } from '../lib/date';`: convierte una fecha en `16 de octubre`, con la
  hora de Cuba ([explicación](../lib/date.ts.md)).
- `import { site } from '../lib/site';`: el nombre, la descripción y las formas de pago de la
  tienda ([explicación](../lib/site.ts.md)).

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

### 3b. La fecha de la última actualización

```astro

// The page is built once, so "now" is the build date: the last time the catalog changed (spec 0010).
const updated = formatDay(new Date());
---
```

- El comentario dice: "La página se construye una vez, así que «ahora» es la fecha del build:
  la última vez que cambió el catálogo (spec 0010)".
- `new Date()`: la fecha y hora de este momento. Como el frontmatter corre en el
  [build](../../glosario.md#build) y no en el navegador, "este momento" es cuando se construyó
  el sitio, no cuando el cliente abre la página.
- `formatDay(...)`: la convierte en texto con la hora de Cuba
  ([zona horaria](../../glosario.md#zona-horaria), [`date.ts.md`](../lib/date.ts.md)).
- `const updated = ...`: guarda el texto, por ejemplo `15 de octubre`, para usarlo en el
  bloque 5.
- `---`: cierra el frontmatter.

### 4. Layout, cabecera y contenedor

```astro
<BaseLayout title={site.name} description={site.description}>
	<SiteHeader />
	<main>
		<div class="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-8">
```

- `<BaseLayout title={site.name} description={site.description}>`: envuelve la página con el
  layout y le pasa dos [props](../../glosario.md#props): el `<title>` de la pestaña y la meta
  descripción (también la usa WhatsApp, por [Open Graph](../../glosario.md#open-graph)). Todo
  lo que va dentro acaba en el [slot](../../glosario.md#slot) del layout.
- `<SiteHeader />`: la cabecera. No recibe props.
- `<main>`: el contenido principal. **No lleva clases**: solo marca para el lector de pantalla
  dónde empieza lo propio de esta página. Dentro tiene dos partes: el catálogo (este `<div>`) y
  la banda de información (bloque 9).
- `<div class="...">`: el **contenedor del catálogo**. Hasta la spec 0011 estas clases las
  llevaba el propio `<main>`. Se pasaron a un `<div>` porque el contenedor limita el ancho a
  1024 px, y la banda de información, que también va dentro del `<main>`, tiene que llegar de
  un borde de la pantalla al otro
  ([banda a todo el ancho](../../glosario.md#banda-a-todo-el-ancho)). Clases
  ([Tailwind](../../glosario.md#tailwind)):
  - `mx-auto` → `margin-left: auto; margin-right: auto`: centra el bloque.
  - `max-w-5xl` → `max-width: 64rem` (1024 px): en pantallas grandes no se estira más
    ([unidades](../../glosario.md#unidades-tailwind)).
  - `flex flex-col` → `display: flex; flex-direction: column`: los hijos en columna.
  - `gap-12` → `gap: 48px` entre bloques (el título y cada sección de categoría).
  - `px-4` → `padding` de 16 px a izquierda y derecha (el margen en móvil).
  - `py-8` → `padding` de 32 px arriba y abajo.

### 5. Título, fecha, pagos y chips

```astro
			<div class="flex flex-col gap-4">
				<h1>Productos</h1>
				<div class="flex flex-col gap-1">
					<p class="text-sm text-muted">Actualizado el {updated}</p>
					<p class="text-sm">Aceptamos: {site.payments.join(' · ')}</p>
				</div>
				<CategoryNav categories={catalog} currentId={null} />
			</div>
```

- `<div class="flex flex-col gap-4">`: agrupa título, las dos líneas y los chips en columna con
  `gap: 16px`. Así quedan juntos, sin el hueco grande (`gap-12`) del contenedor.
- `<h1>Productos</h1>`: el único `h1` de la página. No lleva clases: su estilo (Fraunces,
  seminegrita, tamaño grande) viene de la capa base de `src/styles/global.css`
  ([@layer](../../glosario.md#layer-y-apply)).
- `<div class="flex flex-col gap-1">`: las dos líneas de información (AC2 de la spec 0010), en
  columna y muy juntas: solo 4 px entre ellas.
- `<p class="text-sm text-muted">Actualizado el {updated}</p>`: la fecha del bloque 3b, en
  14 px y gris (`text-muted`), porque es un dato secundario. Se ve, por ejemplo,
  `Actualizado el 15 de octubre`.
- `<p class="text-sm">Aceptamos: {site.payments.join(' · ')}</p>`: las formas de pago en una
  línea, en 14 px y en el color normal del texto. `join(' · ')` une la lista de `site.payments`
  con un punto medio entre cada dos ([join](../../glosario.md#array-join)):
  `Aceptamos: Efectivo (CUP) · Transfermóvil · EnZona · USD en efectivo`.
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
		</div>
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
- `</div>`: cierra el contenedor del catálogo (bloque 4). Lo que sigue ya no está limitado a
  1024 px.

### 9. La banda de información de la tienda

```astro
		{/* Info band (spec 0011): the awning stripe, then the shop information edge to edge. */}
		<div class="awning" aria-hidden="true"></div>
		<div class="bg-awning">
			<div class="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12">
				<ShopInfo />
				<Faq />
			</div>
		</div>
```

- `{/* … */}`: un [comentario en la plantilla](../../glosario.md#comentario-en-plantilla); no
  llega al HTML. Dice: "Banda de información (spec 0011): la franja del toldo, y luego la
  información de la tienda de borde a borde".
- `<div class="awning" aria-hidden="true"></div>`: la misma franja de rayas del toldo que lleva
  la [cabecera](../components/SiteHeader.astro.md) arriba del todo (la clase `awning` de
  [`global.css`](../styles/global.css.md): 8 px de alto, rayas de 16 px). Aquí marca el paso
  del catálogo a la información de la tienda.
  [`aria-hidden="true"`](../../glosario.md#aria-hidden) la oculta al lector de pantalla: es solo
  decoración. Como no está dentro del contenedor, ocupa todo el ancho de la pantalla.
- `<div class="bg-awning">`: la banda. `bg-awning` = `background-color: var(--color-awning)`,
  el tono claro del toldo ([token](../../glosario.md#token)), en vez del crema del resto de la
  página. Tampoco tiene límite de ancho, así que el color llega de borde a borde
  ([banda a todo el ancho](../../glosario.md#banda-a-todo-el-ancho)). Sobre este fondo, el texto
  normal (`ink`), el gris (`muted`) y el rojo (`accent`) se siguen leyendo bien: 12,55, 5,20 y
  4,82 a 1 ([contraste](../../glosario.md#contraste-wcag), AC5 de la spec 0011).
- `<div class="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12">`: **dentro** de la banda,
  otra vez el contenedor de página, para que el texto quede alineado con el catálogo de arriba.
  Son las mismas clases que el del bloque 4 salvo `py-12`: 48 px arriba y abajo en vez de 32,
  para que la banda respire.
- `<ShopInfo />`: "Cómo comprar" con sus 3 pasos, y los recuadros "Recogida y entrega" y
  "Horario y ubicación" ([explicación](../components/ShopInfo.astro.md)). Va después de la
  última categoría (AC4 de la spec 0010): primero lo que el cliente vino a ver, los productos.
  Sus recuadros siguen siendo blancos (`bg-surface`): blancos sobre la banda.
- `<Faq />`: las preguntas frecuentes, que se abren al tocarlas
  ([explicación](../components/Faq.astro.md)).
- Ninguno de los dos recibe props: leen sus textos de `src/lib/site.ts`. Los separa el
  `gap-12` (48 px) de su contenedor.
- `</div>`, `</div>`: cierran el contenedor de dentro y la banda.

### 10. Cierre y pie de página

```astro
	</main>
	<SiteFooter />
</BaseLayout>
```

- `</main>`: cierra el contenido principal.
- `<SiteFooter />`: el pie de página oscuro ([explicación](../components/SiteFooter.astro.md)).
  Va **fuera** del `<main>` porque no es contenido de esta página, sino algo común a todas, como
  la cabecera. Queda pegado a la banda, sin hueco crema en medio: el pie ya no lleva margen
  arriba (spec 0011, AC4).
- `</BaseLayout>`: cierra el layout.

## Cómo se conecta

- **Datos:** `src/data/categories.json` y `src/data/products.json` → colecciones de
  `src/content.config.ts` → `getCatalog()` en `src/lib/catalog.ts` → esta página.
- **Textos:** `site.name`, `site.description` y `site.payments` de `src/lib/site.ts`; la fecha,
  de `formatDay()` en [`src/lib/date.ts`](../lib/date.ts.md).
- **Componentes que pinta:** [`BaseLayout`](../layouts/BaseLayout.astro.md),
  [`SiteHeader`](../components/SiteHeader.astro.md),
  [`CategoryNav`](../components/CategoryNav.astro.md),
  [`ProductCard`](../components/ProductCard.astro.md),
  [`ShopInfo`](../components/ShopInfo.astro.md), [`Faq`](../components/Faq.astro.md) y
  [`SiteFooter`](../components/SiteFooter.astro.md).
- **Estilo de la banda:** la clase `awning` (la franja de rayas) y el token `awning` (el fondo),
  los dos de [`src/styles/global.css`](../styles/global.css.md). La misma banda sale en
  [`/estilo`](estilo.astro.md), como muestra.
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
4. Deshaz: vuelve a poner `4` (a mano o con `Ctrl+Z`) y guarda.

## Términos

- [ruta-por-archivo](../../glosario.md#ruta-por-archivo) · [frontmatter](../../glosario.md#frontmatter) · [build](../../glosario.md#build) · [layout](../../glosario.md#layout) · [slot](../../glosario.md#slot) · [props](../../glosario.md#props)
- [zona-horaria](../../glosario.md#zona-horaria) (nuevo) · [array-join](../../glosario.md#array-join) (nuevo) · [array-map](../../glosario.md#array-map) (nuevo)
- [async-await](../../glosario.md#async-await) · [reduce](../../glosario.md#reduce) · [spread](../../glosario.md#spread) · [desestructuracion](../../glosario.md#desestructuracion) · [expresion-en-plantilla](../../glosario.md#expresion-en-plantilla)
- [tailwind](../../glosario.md#tailwind) · [unidades-tailwind](../../glosario.md#unidades-tailwind) · [variante](../../glosario.md#variante) · [layer-y-apply](../../glosario.md#layer-y-apply)
- [aria-label](../../glosario.md#aria-label) · [jerarquia-de-titulos](../../glosario.md#jerarquia-de-titulos) · [slug](../../glosario.md#slug)
- [lazy-loading](../../glosario.md#lazy-loading) · [presupuesto-de-peso](../../glosario.md#presupuesto-de-peso) · [open-graph](../../glosario.md#open-graph)
- [comentario-en-plantilla](../../glosario.md#comentario-en-plantilla) (nuevo) · [banda-a-todo-el-ancho](../../glosario.md#banda-a-todo-el-ancho) (nuevo) · [aria-hidden](../../glosario.md#aria-hidden) · [token](../../glosario.md#token) · [contraste-wcag](../../glosario.md#contraste-wcag)
