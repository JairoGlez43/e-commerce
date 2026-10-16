# `src/pages/estilo.astro`

> **Qué es:** la guía de estilo interna, la página `/estilo` ·
> **Lo decidió:** [spec 0002](../../../../docs/specs/0002-design-base.md) (AC5); las muestras de
> la información de la tienda, [spec 0010](../../../../docs/specs/0010-shop-information.md) (AC8) ·
> **Lo usan:** nadie lo importa; es una página propia por
> [ruta por archivo](../../glosario.md#ruta-por-archivo). Las features 05–07 copian de aquí
> las clases exactas, y `design.md` la nombra como "vista en vivo" ·
> **Usa:** `astro:content` (`getCollection`), `astro:assets` (`<Image>`), `BaseLayout`,
> `ShopInfo`, `Faq`, `SiteFooter`, `src/lib/price.ts`

## Para qué sirve

Es un muestrario: enseña en una sola página todos los colores, la tipografía y los componentes
del sitio (cabecera, chips, botón, enlace de contacto, tarjeta en sus dos estados) y, al final,
los componentes reales de información de la tienda: "Cómo comprar", las preguntas frecuentes y
el pie de página. Sirve para revisar el diseño de
un vistazo y para copiar las clases exactas al construir una página nueva. No es para clientes:
lleva [`noindex`](../../glosario.md#noindex) para que los buscadores no la muestren.

Muchas clases de Tailwind de esta página se repiten tal cual en la tarjeta y en los chips. Aquí
se explican en breve y se enlaza a la explicación detallada:
[`ProductCard.astro.md`](../components/ProductCard.astro.md) y
[`CategoryNav.astro.md`](../components/CategoryNav.astro.md).

## El código, por partes

### 1. Imports

```astro
---
import { getCollection } from 'astro:content';
import { Image } from 'astro:assets';
import BaseLayout from '../layouts/BaseLayout.astro';
import ShopInfo from '../components/ShopInfo.astro';
import Faq from '../components/Faq.astro';
import SiteFooter from '../components/SiteFooter.astro';
import { formatPrice } from '../lib/price';
```

- `---`: abre el [frontmatter](../../glosario.md#frontmatter).
- `import { getCollection } from 'astro:content';`: la función
  [getCollection](../../glosario.md#getcollection) para leer colecciones. Esta página la usa
  directamente (no `getCatalog()`) porque no quiere el catálogo entero: solo las categorías y
  4 productos concretos.
- `import { Image } from 'astro:assets';`: el componente [`<Image>`](../../glosario.md#image-component)
  para las fotos de la tarjeta de muestra.
- `import BaseLayout from '../layouts/BaseLayout.astro';`: el [layout](../../glosario.md#layout)
  común ([explicación](../layouts/BaseLayout.astro.md)).
- `import ShopInfo ...`, `import Faq ...`, `import SiteFooter ...`: tres componentes reales, los
  mismos que usa la portada ([`ShopInfo`](../components/ShopInfo.astro.md),
  [`Faq`](../components/Faq.astro.md), [`SiteFooter`](../components/SiteFooter.astro.md)). A
  diferencia del resto de la página, que copia las clases a mano, estos se muestran tal cual
  (bloque 14).
- `import { formatPrice } from '../lib/price';`: formatea precios
  ([explicación](../lib/price.ts.md)).

### 2. La lista de colores

```astro
// Living style guide (spec 0002): every token and pattern features 05–07 build with.
const swatches = [
	{ token: 'cream', use: 'Fondo de página', className: 'bg-cream' },
	{ token: 'surface', use: 'Tarjetas, chips y campos', className: 'bg-surface' },
	{ token: 'ink', use: 'Texto principal', className: 'bg-ink' },
	{ token: 'muted', use: 'Texto secundario', className: 'bg-muted' },
	{ token: 'border', use: 'Bordes y separadores', className: 'bg-border' },
	{ token: 'accent', use: 'Precios, botón y foco', className: 'bg-accent' },
	{ token: 'accent-hover', use: 'Botón al pasar o pulsar', className: 'bg-accent-hover' },
	{ token: 'olive', use: 'Disponible', className: 'bg-olive' },
	{ token: 'olive-soft', use: 'Fondo de «Disponible»', className: 'bg-olive-soft' },
	{ token: 'unavailable', use: 'Agotado', className: 'bg-unavailable' },
	{ token: 'awning', use: 'Franja clara del toldo', className: 'bg-awning' },
];
```

- El comentario dice: "Guía de estilo viva (spec 0002): cada token y patrón con el que
  construyen las features 05–07". "Viva" porque usa las clases reales: si cambias un color en
  `global.css`, esta página cambia sola.
- `const swatches = [ ... ];`: una lista de 11 muestras de color, una por cada
  [token](../../glosario.md#token) de color de `src/styles/global.css`. Cada objeto tiene:
  - `token`: el nombre del token (`cream`), que se muestra como texto.
  - `use`: para qué se usa, en español.
  - `className`: la clase de Tailwind que pinta el fondo con ese color (`bg-cream` →
    `background-color` crema).
- ¿Por qué escribir `className: 'bg-cream'` entero y no armarlo con `` `bg-${token}` ``?
  Porque [Tailwind](../../glosario.md#tailwind) busca las clases como texto en tus archivos.
  Si la clase no aparece escrita completa en algún sitio, no genera su CSS y la muestra saldría
  sin color.

### 3. Las categorías y cuál sale seleccionada

```astro
const categories = (await getCollection('categories')).sort((a, b) => a.data.order - b.data.order);
const selectedCategory = categories[0]?.id;
```

- `(await getCollection('categories'))`: lee las 6 categorías
  ([async/await](../../glosario.md#async-await)). Los paréntesis hacen que primero se espere el
  resultado y luego se le aplique `.sort`.
- `.sort((a, b) => a.data.order - b.data.order)`: [las ordena](../../glosario.md#ordenar-con-sort)
  por su campo `order`, de menor a mayor (Granos y pastas = 1 … Aseo = 6).
- `const selectedCategory = categories[0]?.id;`: el `id` de la primera categoría
  (`granos-y-pastas`); su chip saldrá con el estilo "seleccionado".
  `?.` es [encadenamiento opcional](../../glosario.md#encadenamiento-opcional): si la lista
  estuviera vacía, `categories[0]` sería `undefined` y, en vez de dar un error, el resultado
  sería `undefined`.

### 4. Los 4 productos de muestra

```astro
// Two available and two out-of-stock products from feature 04 show both card states.
const sampleIds = ['arroz-blanco', 'huevos', 'salchichas', 'leche-en-polvo'];
const products = (await getCollection('products'))
	.filter((product) => sampleIds.includes(product.id))
	.sort((a, b) => sampleIds.indexOf(a.id) - sampleIds.indexOf(b.id));
---
```

- El comentario dice: "Dos productos disponibles y dos agotados de la feature 04 muestran los
  dos estados de la tarjeta".
- `const sampleIds = [...]`: los [slugs](../../glosario.md#slug) de los 4 productos elegidos.
  `arroz-blanco` y `huevos` están disponibles; `salchichas` y `leche-en-polvo`, agotados.
- `(await getCollection('products'))`: lee los 18 productos.
- `.filter((product) => sampleIds.includes(product.id))`: se queda solo con los 4 cuyo `id`
  está en la lista.
- `.sort((a, b) => sampleIds.indexOf(a.id) - sampleIds.indexOf(b.id))`: los ordena según su
  posición en `sampleIds` (`indexOf` da 0, 1, 2 o 3). Así salen en el orden escrito arriba:
  primero los dos disponibles, luego los dos agotados.
- `---`: cierra el frontmatter.

### 5. El layout, fuera de los buscadores

```astro
<BaseLayout
	title="Guía de estilo"
	description="Colores, tipografía y componentes de la tienda (uso interno)."
	noindex
>
```

- `<BaseLayout`: envuelve la página con el layout.
- `title="Guía de estilo"`: el `<title>` de la pestaña.
- `description="..."`: la meta descripción ("uso interno").
- `noindex`: una [prop](../../glosario.md#props) sin valor, que vale `true` (como el atributo
  `disabled` en HTML). `BaseLayout` responde añadiendo `<meta name="robots" content="noindex">`
  al `<head>` ([noindex](../../glosario.md#noindex)). Lo pide la spec 0002.
- `>`: cierra la etiqueta de apertura; todo lo que sigue va al [slot](../../glosario.md#slot)
  del layout.

### 6. La cabecera de muestra (con buscador)

```astro
	<header class="border-b border-border bg-surface">
		<div class="awning" aria-hidden="true"></div>
		<div class="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
			<p class="font-display text-2xl font-semibold">Nombre de la tienda</p>
			<div>
				<label for="buscar" class="sr-only">Buscar productos</label>
				<input
					id="buscar"
					type="search"
					placeholder="Buscar productos"
					class="min-h-11 w-full rounded-full border border-border bg-surface px-4 text-ink placeholder:text-muted sm:w-72"
				/>
			</div>
		</div>
	</header>
```

- `<header class="border-b border-border bg-surface">`: la cabecera.
  - `border-b` → `border-bottom: 1px solid`: una línea solo abajo.
  - `border-border` → esa línea con el color beige del token `border`.
  - `bg-surface` → fondo blanco.
- `<div class="awning" aria-hidden="true"></div>`: el toldo de rayas. `awning` es una clase
  propia de `src/styles/global.css` (no de Tailwind): 8 px de alto, rayas verticales de 16 px
  que alternan el rojo `accent` y el tono claro `awning`. [`aria-hidden="true"`](../../glosario.md#aria-hidden) lo oculta al
  lector de pantalla: es pura decoración.
- `<div class="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">`:
  el contenido de la cabecera.
  - `mx-auto` → márgenes laterales `auto` (centrado); `max-w-5xl` → `max-width` de 1024 px.
  - `flex flex-col` → en móvil, nombre y buscador uno encima del otro.
  - `gap-3` → 12 px entre ellos. `px-4` → 16 px a los lados; `py-3` → 12 px arriba y abajo.
  - `sm:flex-row` → desde 640 px ([variante](../../glosario.md#variante) `sm:`),
    `flex-direction: row`: en fila.
  - `sm:items-center` → desde 640 px, `align-items: center`: centrados en vertical.
  - `sm:justify-between` → desde 640 px, `justify-content: space-between`: el nombre a la
    izquierda y el buscador a la derecha.
- `<p class="font-display text-2xl font-semibold">Nombre de la tienda</p>`: el nombre, con
  texto de relleno. `font-display` → la fuente Fraunces; `text-2xl` → 24 px
  ([escala de texto](../../glosario.md#escala-de-texto)); `font-semibold` →
  `font-weight: 600`. El nombre real vive en `src/lib/site.ts`; esta página guarda su propio
  texto de muestra a propósito.
- `<div>`: envuelve etiqueta y campo.
- `<label for="buscar" class="sr-only">Buscar productos</label>`: la etiqueta del campo.
  `for="buscar"` la une al `<input>` con `id="buscar"`. [`sr-only`](../../glosario.md#sr-only)
  la esconde a la vista pero el lector de pantalla la lee.
- `<input id="buscar" type="search" placeholder="Buscar productos" ... />`: un campo de
  búsqueda **de muestra**: no hace nada. La spec 0005 decidió que las páginas reales no llevan
  buscador. Clases:
  - `min-h-11` → `min-height: 44px` ([área táctil](../../glosario.md#area-tactil)).
  - `w-full` → `width: 100%` (en móvil, todo el ancho).
  - `rounded-full` → extremos totalmente redondos (forma de píldora).
  - `border border-border` → borde de 1 px beige.
  - `bg-surface` → fondo blanco. `text-ink` → texto marrón oscuro (token `ink`).
  - `px-4` → 16 px de relleno a los lados.
  - `placeholder:text-muted` → el texto de ejemplo ("Buscar productos") en el gris `muted`.
  - `sm:w-72` → desde 640 px, `width: 18rem` (288 px).

### 7. Contenedor y presentación

```astro
	<main class="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-8">
		<section class="flex flex-col gap-2">
			<h1>Guía de estilo</h1>
			<p class="text-muted">
				Los colores, la tipografía y los componentes que usan todas las páginas de la tienda.
			</p>
		</section>
```

- `<main class="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-8">`: el mismo contenedor que el
  catálogo: centrado, máximo 1024 px, en columna, 48 px entre secciones, 16 px a los lados y
  32 px arriba y abajo (clase a clase en
  [`index.astro.md`](index.astro.md#4-layout-cabecera-y-contenedor)).
- `<section class="flex flex-col gap-2">`: la presentación; columna con 8 px entre título y
  texto.
- `<h1>Guía de estilo</h1>`: el título; su estilo sale de la capa base de `global.css`.
- `<p class="text-muted">...`: la frase de presentación, en gris (`text-muted`).

### 8. Sección "Colores"

```astro
		<section class="flex flex-col gap-4" aria-labelledby="colores">
			<h2 id="colores">Colores</h2>
			<ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{
					swatches.map((swatch) => (
						<li class="flex items-center gap-3">
							<span class:list={['size-12 shrink-0 rounded-card border border-border', swatch.className]} />
							<span>
								<code class="text-sm">{swatch.token}</code>
								<span class="block text-sm text-muted">{swatch.use}</span>
							</span>
						</li>
					))
				}
			</ul>
		</section>
```

- `<section class="flex flex-col gap-4" aria-labelledby="colores">`: columna con 16 px de
  separación. [`aria-labelledby="colores"`](../../glosario.md#aria-label) le da a la sección el
  nombre del `h2` con `id="colores"`. Las demás secciones repiten este patrón.
- `<h2 id="colores">Colores</h2>`: el título de la sección.
- `<ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">`: rejilla (`display: grid`)
  de 1 columna en móvil, 2 desde 640 px y 3 desde 1024 px, con 16 px entre celdas.
- `{ swatches.map((swatch) => ( ... )) }`: una muestra por color
  ([expresión en la plantilla](../../glosario.md#expresion-en-plantilla)).
- `<li class="flex items-center gap-3">`: cuadrado y textos en fila, centrados en vertical, con
  12 px entre ellos.
- `<span class:list={['size-12 shrink-0 rounded-card border border-border', swatch.className]} />`:
  el cuadrado de color. [`class:list`](../../glosario.md#class-list) junta las clases fijas con
  la del color:
  - `size-12` → `width` y `height` de 48 px.
  - `shrink-0` → `flex-shrink: 0`: si falta espacio, el cuadrado no se encoge.
  - `rounded-card` → las esquinas redondeadas de las tarjetas.
  - `border border-border` → borde fino beige (así se ven también los colores claros, como
    `surface`, que es blanco).
  - `swatch.className` → el fondo de ese color (`bg-cream`, `bg-accent`…).
- `<span>`: agrupa los dos textos.
- `<code class="text-sm">{swatch.token}</code>`: el nombre del token en letra de código, 14 px.
- `<span class="block text-sm text-muted">{swatch.use}</span>`: el uso. `block` →
  `display: block`, para que salga en su propia línea, debajo del nombre; 14 px y en gris.

### 9. Sección "Tipografía"

```astro
		<section class="flex flex-col gap-4" aria-labelledby="tipografia">
			<h2 id="tipografia">Tipografía</h2>
			<div class="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
				<p class="font-display text-3xl font-semibold">Título de página (h1)</p>
				<p class="font-display text-2xl font-semibold">Título de sección (h2)</p>
				<p class="font-display text-xl font-semibold">Subtítulo (h3)</p>
				<p>
					Texto normal en la fuente del sistema: ligera, legible y sin descargas. Ñandú, café,
					azúcar, ¿cuánto cuesta? ¡Disponible!
				</p>
				<p class="text-sm text-muted">Texto secundario, como el formato «Paquete 500 g».</p>
				<p class="price">{formatPrice(12500)}</p>
			</div>
		</section>
```

- `<section ... aria-labelledby="tipografia">` y `<h2 id="tipografia">`: la sección y su
  título, como en el bloque 8.
- `<div class="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">`: una
  caja blanca con aspecto de tarjeta (esquinas `rounded-card`, borde beige, fondo `bg-surface`),
  16 px de relleno (`p-4`) y sus líneas en columna con 12 px entre ellas.
- Las tres primeras líneas son `<p>`, no títulos de verdad: solo enseñan el aspecto. Copian lo
  que la capa base de `global.css` da a `h1`, `h2` y `h3`: fuente Fraunces (`font-display`),
  `font-weight: 600` (`font-semibold`) y tamaño 30 px (`text-3xl`), 24 px (`text-2xl`) o 20 px
  (`text-xl`).
- `<p>Texto normal ...</p>`: texto sin clases, en la fuente del sistema (la que pone el `body`).
  Incluye ñ, tildes y signos `¿ ¡` para comprobar que todo se ve bien en español.
- `<p class="text-sm text-muted">`: el estilo de texto secundario: 14 px, gris.
- `<p class="price">{formatPrice(12500)}</p>`: un precio de ejemplo. `price` es la clase propia
  de `global.css` (Fraunces, seminegrita, 20 px, rojo `accent`). Muestra `12.500 CUP`.

### 10. Sección "Categorías" (chips)

```astro
		<section class="flex flex-col gap-4" aria-labelledby="categorias">
			<h2 id="categorias">Categorías</h2>
			<nav aria-label="Categorías de ejemplo">
				<ul class="flex gap-2 overflow-x-auto pb-2">
					{
						categories.map((category) =>
							category.id === selectedCategory ? (
								<li>
									<a
										href="#categorias"
										aria-current="true"
										class="inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-accent px-4 text-surface"
									>
										{category.data.name}
									</a>
								</li>
							) : (
								<li>
									<a
										href="#categorias"
										class="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-border bg-surface px-4 text-ink hover:border-accent"
									>
										{category.data.name}
									</a>
								</li>
							),
						)
					}
				</ul>
			</nav>
		</section>
```

- Sección y `h2` como en el bloque 8.
- `<nav aria-label="Categorías de ejemplo">`: una zona de navegación con nombre propio
  ([aria-label](../../glosario.md#aria-label)). "de ejemplo" la distingue de la real.
- `<ul class="flex gap-2 overflow-x-auto pb-2">`: la fila de chips. Es la misma clase que en
  `CategoryNav`: en fila, 8 px entre chips, scroll horizontal propio si no caben, y 8 px abajo
  para la barra de scroll ([detalle](../components/CategoryNav.astro.md)).
- `categories.map((category) => category.id === selectedCategory ? ( ... ) : ( ... ))`: un chip
  por categoría; si es la seleccionada (la primera, bloque 3) usa una variante, si no, la otra.
- `href="#categorias"`: los chips de muestra apuntan a esta misma sección, así un clic no te
  saca de la página.
- `aria-current="true"`: marca el chip seleccionado. Aquí vale `"true"` porque son chips de
  demostración; en los chips reales la spec 0005 pide `"page"`
  ([aria-current](../../glosario.md#aria-current)), porque enlazan a páginas de verdad.
- Las clases de los dos chips (`inline-flex min-h-11 items-center whitespace-nowrap
  rounded-full …`) son idénticas a las de `CategoryNav`: píldora de al menos 44 px de alto,
  texto en una sola línea; la seleccionada en rojo con texto blanco, la normal en blanco con
  borde beige que se vuelve rojo al pasar el ratón. Explicadas clase a clase en
  [`CategoryNav.astro.md`](../components/CategoryNav.astro.md).
- `{category.data.name}`: el nombre de la categoría dentro del chip.
- `),` y `)`: cierran la segunda rama y el `map`; la coma final es solo estilo de formato.

### 11. Sección "Botón principal"

```astro
		<section class="flex flex-col gap-4" aria-labelledby="boton">
			<h2 id="boton">Botón principal</h2>
			<div>
				<button
					type="button"
					class="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover"
				>
					Ver producto
				</button>
			</div>
		</section>
```

- Sección y `h2` como en el bloque 8.
- `<div>`: envoltorio. Dentro de una columna flex, los hijos directos se estiran a todo el
  ancho; el `div` se estira, pero el botón de dentro solo ocupa lo que mide su texto.
- `<button type="button"`: un botón que no envía ningún formulario; aquí no hace nada, es una
  muestra del patrón que reutilizan las features 05–07 (spec 0002).
- Clases del botón:
  - `inline-flex items-center justify-center` → caja en línea con el texto centrado en
    vertical y en horizontal.
  - `min-h-11` → al menos 44 px de alto ([área táctil](../../glosario.md#area-tactil)).
  - `rounded-full` → forma de píldora.
  - `bg-accent` → fondo rojo. `text-surface` → texto blanco.
  - `px-6` → 24 px de relleno a los lados. `font-medium` → `font-weight: 500`.
  - `hover:bg-accent-hover` → al pasar el ratón, un rojo más oscuro.
  - `active:bg-accent-hover` → lo mismo **mientras se pulsa** (la variante `active:` aplica la
    clase en el estado `:active` de CSS). En móvil no hay ratón, así que esto da la respuesta
    visual al tocar.
- `Ver producto`: el texto del botón.

### 12. Sección "Enlace de contacto"

```astro
		<section class="flex flex-col gap-4" aria-labelledby="contacto">
			<h2 id="contacto">Enlace de contacto</h2>
			<p class="text-muted">En la cabecera, junto al nombre de la tienda (spec 0010).</p>
			<div>
				<a
					href="#contacto"
					class="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-border bg-surface px-4 font-medium text-ink hover:border-accent"
				>
					Escríbenos
				</a>
			</div>
		</section>
```

- Sección y `h2` como en el bloque 8.
- `<p class="text-muted">`: dice dónde se usa este enlace, en gris: "En la cabecera, junto al
  nombre de la tienda (spec 0010)".
- `<div>`: envoltorio, por la misma razón que en el bloque 11: así el enlace solo ocupa lo que
  mide su texto.
- `<a href="#contacto" class="...">Escríbenos</a>`: una copia del enlace "Escríbenos" de
  [`SiteHeader`](../components/SiteHeader.astro.md), con las mismas clases: las del chip de
  categoría sin seleccionar más `font-medium` (píldora blanca con borde beige, al menos 44 px de
  alto, el borde se vuelve rojo al pasar el ratón). Explicadas clase a clase en
  [`SiteHeader.astro.md`](../components/SiteHeader.astro.md).
- `href="#contacto"`: como los chips de muestra, apunta a esta misma sección. La muestra no
  abre WhatsApp: el enlace real usa `contactLink()`.

### 13. Sección "Tarjeta de producto"

```astro
		<section class="flex flex-col gap-4" aria-labelledby="tarjetas">
			<h2 id="tarjetas">Tarjeta de producto</h2>
			<p class="text-muted">
				Rejilla del catálogo: 2 columnas en móvil, 3 en tableta y 4 en escritorio.
			</p>
			<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
```

- Sección y `h2` como en el bloque 8.
- `<p class="text-muted">`: explica la rejilla, en gris.
- `<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">`: la rejilla del catálogo:
  2 columnas, 3 desde 640 px, 4 desde 1024 px, 16 px entre tarjetas. La misma que usa
  [`index.astro`](index.astro.md#7-una-sección-por-categoría).

```astro
				{
					products.map((product) => (
						<li>
							<article class="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
								<Image
									src={product.data.photo}
									alt={product.data.name}
									widths={[200, 400]}
									sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw"
									class:list={['aspect-square w-full object-cover', { 'opacity-50': !product.data.inStock }]}
								/>
```

- `products.map((product) => (`: una tarjeta por cada uno de los 4 productos de muestra.
- `<li>`: un elemento de la lista.
- `<article class="...">`: la caja de la tarjeta, con las mismas clases que en `ProductCard`
  (columna flex, alto completo, esquinas recortadas, borde beige, fondo blanco, sombra suave).
  **Faltan** `relative` y `hover:border-accent`: esta tarjeta no es un enlace, así que no
  necesita el [stretched link](../../glosario.md#stretched-link) ni el cambio de borde.
  Detalle de cada clase en [`ProductCard.astro.md`](../components/ProductCard.astro.md).
- `<Image`: la foto, con los mismos atributos que en `ProductCard`:
  - `src={product.data.photo}` y `alt={product.data.name}`: la foto y su texto alternativo (el
    nombre). Aquí se lee `product.data.x` directamente en vez de desestructurar antes.
  - `widths={[200, 400]}` y `sizes="..."`: dos tamaños y cuánto ocupará la foto en cada ancho
    de pantalla ([srcset](../../glosario.md#srcset)).
  - No lleva `loading`: se queda con el valor por defecto de Astro, que es `lazy` (según la
    spec 0005).
  - `class:list={[...]}`: foto cuadrada, a todo el ancho, recortada para llenar, y a
    `opacity: 0.5` si el producto está agotado.

```astro
								<div class="flex flex-1 flex-col gap-1 p-3">
									<h3 class="font-sans text-base font-medium">{product.data.name}</h3>
									<p class="text-sm text-muted">{product.data.unit}</p>
									<p class="price">{formatPrice(product.data.price)}</p>
									{product.data.inStock ? (
										<p class="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-olive-soft px-2 py-0.5 text-xs font-medium text-olive">
											<span class="size-1.5 rounded-full bg-olive" aria-hidden="true" />
											Disponible
										</p>
									) : (
										<p class="mt-auto inline-flex w-fit items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-unavailable">
											Agotado
										</p>
									)}
								</div>
							</article>
						</li>
					))
				}
			</ul>
		</section>
```

- `<div class="flex flex-1 flex-col gap-1 p-3">`: el bloque de texto (columna que crece, 4 px
  entre líneas, 12 px de relleno), igual que en `ProductCard`.
- `<h3 class="font-sans text-base font-medium">{product.data.name}</h3>`: el nombre. Siempre
  `h3`, porque aquí siempre cuelga del `h2` "Tarjeta de producto". Y **sin enlace**, a diferencia
  de `ProductCard`. Las clases lo devuelven al aspecto de texto normal (fuente del sistema,
  16 px, peso 500).
- `<p class="text-sm text-muted">{product.data.unit}</p>`: el formato, 14 px y gris.
- `<p class="price">{formatPrice(product.data.price)}</p>`: el precio formateado.
- `{product.data.inStock ? ( ... ) : ( ... )}`: la etiqueta "Disponible" (verde, con punto) o
  "Agotado" (gris, con borde). Mismas clases que en `ProductCard`: pegada al fondo con
  `mt-auto`, del ancho de su texto con `w-fit`, en forma de píldora; el punto es un círculo de
  6 px oculto al lector de pantalla. Detalle en
  [`ProductCard.astro.md`](../components/ProductCard.astro.md).
- `</div>`, `</article>`, `</li>`, `))`, `}`, `</ul>`, `</section>`: cierran, en orden, el
  bloque de texto, la tarjeta, el elemento de lista, el `map`, la expresión, la rejilla y la
  sección.

### 14. Los componentes reales de información de la tienda

```astro

		<!-- The real components with the shop's data, as they appear below the products on / (spec 0010). -->
		<ShopInfo />
		<Faq />
	</main>
	<SiteFooter />
</BaseLayout>
```

- `<!-- ... -->`: un comentario HTML; no se ve en la página. Dice: "Los componentes reales con
  los datos de la tienda, tal como aparecen debajo de los productos en `/` (spec 0010)".
- `<ShopInfo />` y `<Faq />`: "Cómo comprar", los recuadros de recogida y horario, y las
  preguntas frecuentes, con los textos de verdad de `src/lib/site.ts`. No son copias: si cambia
  el componente, esta muestra cambia con él.
- `</main>`: cierra el contenido.
- `<SiteFooter />`: el pie de página real, fuera del `<main>` como en las páginas de clientes.
  Su enlace "Escríbenos por WhatsApp" sí es el de verdad: lo arma `contactLink()` con el número
  de `WHATSAPP_NUMBER`.
- `</BaseLayout>`: cierra el layout.

## Cómo se conecta

- **Datos:** las colecciones `categories` y `products` (`src/content.config.ts`, con datos de
  `src/data/categories.json` y `src/data/products.json`), leídas con `getCollection`.
- **Estilo:** todos los tokens y las clases `awning` y `price` de `src/styles/global.css`. Si
  cambias un valor allí, esta página lo refleja.
- **Layout:** [`BaseLayout`](../layouts/BaseLayout.astro.md), con `noindex`.
- **Componentes reales que muestra:** [`ShopInfo`](../components/ShopInfo.astro.md),
  [`Faq`](../components/Faq.astro.md) y [`SiteFooter`](../components/SiteFooter.astro.md), con
  los datos de `src/lib/site.ts`.
- **Quién copia de aquí:** `design.md` apunta a esta página como vista en vivo, y los
  componentes reales partieron de sus clases:
  [`SiteHeader`](../components/SiteHeader.astro.md) (la cabecera sin buscador, más el enlace
  de contacto),
  [`CategoryNav`](../components/CategoryNav.astro.md) (los chips) y
  [`ProductCard`](../components/ProductCard.astro.md) (la tarjeta, más el enlace).
- **Resultado:** `dist/estilo/index.html`, la URL `/estilo`. Ninguna página del catálogo
  enlaza aquí.

## Prueba tú

Cambia qué chip de muestra sale seleccionado.

1. Ejecuta `pnpm dev` y abre `http://localhost:4321/estilo`. En "Categorías", el chip rojo es
   "Granos y pastas".
2. En `src/pages/estilo.astro`, cambia `const selectedCategory = categories[0]?.id;` por
   `const selectedCategory = categories[2]?.id;` y guarda.
3. La página se recarga: ahora el chip rojo es "Despensa" (la tercera categoría, posición 2).
4. Deshaz: vuelve a poner `categories[0]?.id` (a mano o con `Ctrl+Z`) y guarda.

## Términos

- [ruta-por-archivo](../../glosario.md#ruta-por-archivo) · [frontmatter](../../glosario.md#frontmatter) · [layout](../../glosario.md#layout) · [slot](../../glosario.md#slot) · [props](../../glosario.md#props) · [noindex](../../glosario.md#noindex) (nuevo)
- [getcollection](../../glosario.md#getcollection) · [slug](../../glosario.md#slug) · [image-component](../../glosario.md#image-component) · [srcset](../../glosario.md#srcset)
- [async-await](../../glosario.md#async-await) · [ordenar-con-sort](../../glosario.md#ordenar-con-sort) · [encadenamiento-opcional](../../glosario.md#encadenamiento-opcional) (nuevo) · [expresion-en-plantilla](../../glosario.md#expresion-en-plantilla) · [class-list](../../glosario.md#class-list)
- [tailwind](../../glosario.md#tailwind) · [token](../../glosario.md#token) · [variante](../../glosario.md#variante) · [escala-de-texto](../../glosario.md#escala-de-texto) (nuevo) · [stretched-link](../../glosario.md#stretched-link)
- [details-summary](../../glosario.md#details-summary) · [click-to-chat](../../glosario.md#click-to-chat)
- [aria-label](../../glosario.md#aria-label) · [aria-current](../../glosario.md#aria-current) · [aria-hidden](../../glosario.md#aria-hidden) · [sr-only](../../glosario.md#sr-only) · [area-tactil](../../glosario.md#area-tactil)
