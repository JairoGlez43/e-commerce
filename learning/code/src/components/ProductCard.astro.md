# `src/components/ProductCard.astro`

> **Qué es:** el [componente](../../glosario.md#componente-astro) de la tarjeta de un producto ·
> **Lo decidió:** [spec 0005](../../../../docs/specs/0005-catalog-page.md) (sobre el patrón de
> tarjeta de la [spec 0002](../../../../docs/specs/0002-design-base.md)) ·
> **Lo usan:** `src/pages/index.astro` y `src/pages/categoria/[id].astro` ·
> **Usa:** `astro:content` (solo el tipo), `astro:assets` (`<Image>`), `src/lib/price.ts`

## Para qué sirve

Dibuja una tarjeta de producto: foto cuadrada, nombre, formato ("Paquete 500 g"), precio y una
etiqueta "Disponible" o "Agotado". Toda la tarjeta es un enlace a `/producto/<id>`. Se escribe
una vez aquí y la portada y las páginas de categoría la reutilizan, así las 18 tarjetas son
idénticas en todas partes.

## El código, por partes

### 1. Imports

```astro
---
import type { CollectionEntry } from 'astro:content';
import { Image } from 'astro:assets';
import { formatPrice } from '../lib/price';
```

- `---`: abre el [frontmatter](../../glosario.md#frontmatter), el código que corre solo
  durante el [build](../../glosario.md#build).
- `import type { CollectionEntry } from 'astro:content';`: trae **solo un tipo**
  ([import type](../../glosario.md#import-type)) del [módulo virtual](../../glosario.md#modulo-virtual)
  `astro:content`. `CollectionEntry` describe la forma de una
  [entrada](../../glosario.md#entrada) de una colección. No genera código: sirve para que el
  [typecheck](../../glosario.md#typecheck) sepa qué campos tiene un producto.
- `import { Image } from 'astro:assets';`: el componente [`<Image>`](../../glosario.md#image-component),
  que convierte la foto a [WebP](../../glosario.md#webp) en varios tamaños.
- `import { formatPrice } from '../lib/price';`: la función que convierte `12500` en
  `12.500 CUP` (ver [`price.ts.md`](../lib/price.ts.md)). La spec 0005 exige que el precio se
  formatee **solo** con esta función, para que todo el sitio lo muestre igual.

### 2. Las props que recibe

```astro
interface Props {
	product: CollectionEntry<'products'>;
	/** 3 under a category h2 (home), 2 directly under the h1 (category page). */
	headingLevel: 2 | 3;
	/** Above-the-fold cards load their photo eagerly (spec 0005: the first 4 in page order). */
	eager: boolean;
}
```

- `interface Props { ... }`: la [interface](../../glosario.md#interface) que declara las
  [props](../../glosario.md#props) del componente, es decir, qué datos tiene que pasarle quien
  lo use. Si una página olvida una o pasa un valor de otro [tipo](../../glosario.md#tipo), el
  typecheck falla.
- `product: CollectionEntry<'products'>;`: un producto tal como lo da la colección `products`
  (un [genérico](../../glosario.md#generico): "una entrada de la colección `products`"). Trae
  `product.id` (por ejemplo `arroz-blanco`) y `product.data` con los campos ya validados.
- `/** 3 under a category h2 (home), 2 directly under the h1 (category page). */`: un
  [comentario JSDoc](../../glosario.md#comentario-jsdoc). Dice: "3 debajo del `h2` de una
  categoría (portada); 2 directamente debajo del `h1` (página de categoría)".
- `headingLevel: 2 | 3;`: el nivel de título del nombre. Es una [unión](../../glosario.md#union):
  solo acepta el número 2 o el 3. Así nadie puede pasar un 5 por error.
- `/** Above-the-fold cards load their photo eagerly (spec 0005: the first 4 in page order). */`:
  "Las tarjetas que se ven sin hacer scroll cargan su foto de inmediato (spec 0005: las 4
  primeras en el orden de la página)".
- `eager: boolean;`: `true` si la foto debe descargarse ya, `false` si puede esperar al scroll
  (ver [lazy loading](../../glosario.md#lazy-loading)).

### 3. Preparar los datos

```astro
const { product, headingLevel, eager } = Astro.props;
const { name, unit, price, inStock, photo } = product.data;
const href = `/producto/${product.id}`;
---
```

- `const { product, headingLevel, eager } = Astro.props;`: saca las tres props de
  [`Astro.props`](../../glosario.md#astro-props) con
  [desestructuración](../../glosario.md#desestructuracion).
- `const { name, unit, price, inStock, photo } = product.data;`: lo mismo con los campos del
  producto: nombre, formato, precio (número entero), si hay existencias (`true`/`false`) y la
  foto (ya importada por Astro desde `src/assets/`).
- ``const href = `/producto/${product.id}`;``: arma la URL del producto con un
  [template literal](../../glosario.md#template-literal): `/producto/arroz-blanco`. Esa página
  la genera [`src/pages/producto/[id].astro`](../pages/producto/%5Bid%5D.astro.md) (feature 06).
- `---`: cierra el frontmatter. Lo que sigue es la plantilla HTML.

### 4. La caja de la tarjeta

```astro
<article
	class="relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card hover:border-accent"
>
```

- `<article>`: la etiqueta HTML para un contenido que tiene sentido por sí solo, como una
  tarjeta de producto. Cada clase es una propiedad CSS ([Tailwind](../../glosario.md#tailwind)):
  - `relative` → `position: relative`. Es la mitad del
    [stretched link](../../glosario.md#stretched-link): el `::after` del enlace (bloque 6) se
    estira hasta los bordes de **este** elemento, y no de la página entera.
  - `flex flex-col` → `display: flex; flex-direction: column`: los hijos (foto y bloque de
    texto) se apilan en vertical.
  - `h-full` → `height: 100%`: la tarjeta ocupa todo el alto de su celda en la rejilla, así
    todas las tarjetas de una fila miden lo mismo aunque un nombre ocupe dos líneas.
  - `overflow-hidden` → `overflow: hidden`: recorta lo que sobresale; aquí hace que las
    esquinas de la foto sigan el borde redondeado.
  - `rounded-card` → `border-radius` con el valor del [token](../../glosario.md#token) `card`
    (0,75 rem, definido en `src/styles/global.css`).
  - `border border-border` → `border: 1px solid` con el color del token `border` (un beige
    claro). Ojo: la primera palabra es la clase `border` (grosor), la segunda es el color que
    también se llama `border`.
  - `bg-surface` → `background-color` blanco (token `surface`).
  - `shadow-card` → `box-shadow` suave, definida como token en `global.css`.
  - `hover:border-accent` → al pasar el ratón ([variante](../../glosario.md#variante) `hover:`),
    el borde se vuelve del rojo `accent`. Es la pista visual de que la tarjeta entera es
    clicable.

### 5. La foto

```astro
	<Image
		src={photo}
		alt={name}
		widths={[200, 400]}
		sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw"
		loading={eager ? 'eager' : 'lazy'}
		class:list={['aspect-square w-full object-cover', { 'opacity-50': !inStock }]}
	/>
```

- `<Image`: el componente de `astro:assets`. En el build escribe una etiqueta `<img>` normal.
- `src={photo}`: la foto del producto.
- `alt={name}`: el texto alternativo es el nombre del producto (lo pide la spec 0005, AC2).
  Lo lee el [lector de pantalla](../../glosario.md#accesibilidad) y se muestra si la foto no
  carga.
- `widths={[200, 400]}`: genera dos versiones, de 200 px y 400 px de ancho, y las pone en el
  [srcset](../../glosario.md#srcset). `design.md` prohíbe pedir más de 400 px en tarjetas, por
  el [presupuesto de peso](../../glosario.md#presupuesto-de-peso).
- `sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw"`: le dice al navegador
  cuánto medirá la foto, para que elija la versión más pequeña que se vea nítida. Se lee de
  izquierda a derecha y gana la primera que cumple: con 1024 px de pantalla o más, 240 px; con
  640 px o más, el 30 % del ancho de la ventana (`vw`); si no, el 45 %. Encaja con las 4, 3 y 2
  columnas de la rejilla.
- `loading={eager ? 'eager' : 'lazy'}`: si `eager` es `true`, `loading="eager"` (descargar ya);
  si no, `loading="lazy"` (esperar al scroll). Las páginas pasan `eager` a las **4 primeras
  tarjetas en el orden de la página** y el resto carga en diferido. La spec 0001 limita las
  imágenes de la primera vista a 150 KB; en `/` las 4 fotos *eager* suman unos 55 KB.
- `class:list={['aspect-square w-full object-cover', { 'opacity-50': !inStock }]}`: arma el
  atributo `class` con [`class:list`](../../glosario.md#class-list):
  - `aspect-square` → `aspect-ratio: 1 / 1`: la foto siempre es cuadrada.
  - `w-full` → `width: 100%`: ocupa todo el ancho de la tarjeta.
  - `object-cover` → `object-fit: cover`: si la foto no es cuadrada, se recorta para llenar el
    cuadrado en vez de deformarse.
  - `{ 'opacity-50': !inStock }` → añade `opacity: 0.5` (foto descolorida) **solo** si el
    producto no tiene existencias (`!inStock` = "no hay stock").
- `/>`: cierra el componente (no tiene contenido dentro).

### 6. El nombre, con el enlace estirado

```astro
	<div class="flex flex-1 flex-col gap-1 p-3">
		{
			headingLevel === 2 ? (
				<h2 class="font-sans text-base font-medium">
					<a href={href} class="after:absolute after:inset-0">{name}</a>
				</h2>
			) : (
				<h3 class="font-sans text-base font-medium">
					<a href={href} class="after:absolute after:inset-0">{name}</a>
				</h3>
			)
		}
```

- `<div class="flex flex-1 flex-col gap-1 p-3">`: el bloque de texto bajo la foto.
  - `flex flex-col` → columna vertical, como en el bloque 4.
  - `flex-1` → `flex: 1 1 0%`: este bloque crece y ocupa todo el alto que sobre en la tarjeta.
    Hace falta para que la etiqueta de disponibilidad pueda bajar hasta el fondo (bloque 8).
  - `gap-1` → `gap: 4px` entre los hijos ([unidades de Tailwind](../../glosario.md#unidades-tailwind)).
  - `p-3` → `padding: 12px`.
- `{ headingLevel === 2 ? ( ... ) : ( ... ) }`: una
  [expresión en la plantilla](../../glosario.md#expresion-en-plantilla) que elige uno de dos
  trozos de HTML. Si `headingLevel` es 2 escribe un `<h2>`; si no (es 3), un `<h3>`. Los dos
  trozos son iguales salvo la etiqueta. ¿Por qué cambiar el nivel? Por la
  [jerarquía de títulos](../../glosario.md#jerarquia-de-titulos): en la portada el nombre va
  debajo del `h2` de su categoría, así que es `h3`; en una página de categoría no hay `h2`, el
  nombre va directo bajo el `h1`, así que es `h2` y no se salta ningún nivel.
- `<h2 class="font-sans text-base font-medium">` y `<h3 class="...">`: las clases son iguales en
  los dos casos, así se ven idénticos:
  - `font-sans` → la fuente del sistema (la de texto normal), en vez de la Fraunces que
    `global.css` pone por defecto a todos los títulos.
  - `text-base` → tamaño de texto normal, 16 px ([escala de texto](../../glosario.md#escala-de-texto)).
  - `font-medium` → `font-weight: 500`.
  - Estas clases pueden "pisar" el estilo base de los títulos porque las clases de utilidad
    siempre ganan a la capa `base` (ver [@layer](../../glosario.md#layer-y-apply)). La spec 0002
    lo anota como excepción a propósito: se ve como texto, pero sigue siendo un título para que
    el lector de pantalla pueda saltar de producto en producto.
- `<a href={href} class="after:absolute after:inset-0">{name}</a>`: el enlace al producto, con
  el nombre como texto. Las dos clases usan la variante `after:`, que aplica la propiedad al
  pseudo-elemento `::after` del enlace (Tailwind le añade también el `content: ''` que necesita
  un `::after` para existir):
  - `after:absolute` → `::after { position: absolute }`.
  - `after:inset-0` → `::after { inset: 0 }` (top, right, bottom y left a 0): el `::after` se
    estira hasta los bordes del ancestro `relative` más cercano, que es el `<article>`.
  - Resultado: el [stretched link](../../glosario.md#stretched-link). El `::after` cubre toda
    la tarjeta, invisible, y es parte del enlace: un clic en la foto, el precio o la etiqueta
    abre `/producto/<id>`. Se comprobó en las 18 tarjetas preguntando al navegador qué elemento
    hay bajo cada punto (*hit-testing*): siempre el enlace.
  - ¿Por qué no envolver toda la tarjeta en un `<a>`? La spec 0005 lo descartó: el lector de
    pantalla leería nombre, formato, precio y etiqueta como un solo enlace larguísimo. Así, el
    [nombre accesible](../../glosario.md#nombre-accesible) del enlace (lo que el lector de
    pantalla anuncia al llegar a él) es solo el nombre del producto. El contorno de [foco](../../glosario.md#focus-visible) sigue en el enlace.

### 7. Formato y precio

```astro
		<p class="text-sm text-muted">{unit}</p>
		<p class="price">{formatPrice(price)}</p>
```

- `<p class="text-sm text-muted">{unit}</p>`: el formato ("Caja 10 lb").
  - `text-sm` → texto pequeño, 14 px.
  - `text-muted` → `color` marrón grisáceo (token `muted`), para texto secundario.
- `<p class="price">{formatPrice(price)}</p>`: el precio formateado. `price` no es de Tailwind:
  es una clase propia definida en `src/styles/global.css` (fuente Fraunces, seminegrita, 20 px y
  color rojo `accent`). Así todos los precios del sitio se ven igual con una sola palabra.

### 8. La etiqueta de disponibilidad

```astro
		{
			inStock ? (
				<p class="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-olive-soft px-2 py-0.5 text-xs font-medium text-olive">
					<span class="size-1.5 rounded-full bg-olive" aria-hidden="true" />
					Disponible
				</p>
			) : (
				<p class="mt-auto inline-flex w-fit items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-unavailable">
					Agotado
				</p>
			)
		}
	</div>
</article>
```

- `{ inStock ? ( ... ) : ( ... ) }`: si hay existencias, la etiqueta verde "Disponible"; si
  no, la gris "Agotado". La palabra lleva el significado; el color solo ayuda (regla de
  `design.md`: nunca solo el color).
- Clases comunes a las dos etiquetas:
  - `mt-auto` → `margin-top: auto`: dentro de una columna flex, empuja la etiqueta hasta el
    fondo del bloque. Por eso todas las etiquetas de una fila quedan alineadas abajo.
  - `inline-flex` → `display: inline-flex`: una cajita en línea cuyos hijos (punto y texto) se
    colocan en fila.
  - `w-fit` → `width: fit-content`: tan ancha como su texto, no como toda la tarjeta.
  - `items-center` → `align-items: center`: centra en vertical el punto y el texto.
  - `rounded-full` → un `border-radius` enorme: extremos totalmente redondos (forma de
    píldora).
  - `px-2 py-0.5` → `padding` de 8 px a los lados y 2 px arriba y abajo.
  - `text-xs` → texto muy pequeño, 12 px. `font-medium` → `font-weight: 500`.
- Solo en "Disponible":
  - `gap-1.5` → `gap: 6px` entre el punto y la palabra.
  - `bg-olive-soft` → fondo verde muy claro. `text-olive` → texto verde oliva.
  - `<span class="size-1.5 rounded-full bg-olive" aria-hidden="true" />`: el puntito verde.
    `size-1.5` → `width` y `height` de 6 px; `rounded-full` lo vuelve un círculo; `bg-olive` lo
    pinta de verde. [`aria-hidden="true"`](../../glosario.md#aria-hidden) lo oculta al lector
    de pantalla porque es decoración.
  - `Disponible`: el texto.
- Solo en "Agotado":
  - `border border-border` → borde fino beige en vez de fondo de color.
  - `text-unavailable` → texto gris (token `unavailable`).
  - `Agotado`: el texto.
- `</div>` y `</article>`: cierran el bloque de texto y la tarjeta.

## Cómo se conecta

- **Recibe:** un `product` de la colección `products` (definida en `src/content.config.ts`,
  datos en `src/data/products.json`), ya agrupado y ordenado por `getCatalog()` de
  `src/lib/catalog.ts`; más `headingLevel` y `eager`, que decide cada página.
- **Lo usan:**
  - [`src/pages/index.astro`](../pages/index.astro.md): `headingLevel={3}`, y `eager` para las
    4 primeras tarjetas contando todas las secciones.
  - [`src/pages/categoria/[id].astro`](../pages/categoria/%5Bid%5D.astro.md): `headingLevel={2}`,
    y `eager` para sus 4 primeras.
- **Estilo:** los tokens (`surface`, `border`, `accent`, `olive`…) y la clase `price` salen de
  `src/styles/global.css`. Las clases vienen copiadas del patrón de tarjeta de `design.md`,
  que se ve en vivo en [`/estilo`](../pages/estilo.astro.md).
- **Enlaza a:** `/producto/<id>`, la página de detalle ([explicación](../pages/producto/%5Bid%5D.astro.md)).

## Prueba tú

Comprueba qué hace el enlace estirado quitándolo un momento.

1. En `src/components/ProductCard.astro`, borra `after:absolute after:inset-0` de los **dos**
   `<a>` (deja `class=""`).
2. Ejecuta `pnpm dev` y abre `http://localhost:4321`.
3. Pasa el ratón por la foto o el precio de una tarjeta: el puntero ya no es una mano y el clic
   no hace nada. Solo el nombre es clicable.
4. Deshaz: vuelve a escribir `class="after:absolute after:inset-0"` en los dos enlaces (o
   `Ctrl+Z` en VS Code). `src/` aún no está en git, así que `git checkout` no sirve aquí.

## Términos

- [componente-astro](../../glosario.md#componente-astro) · [frontmatter](../../glosario.md#frontmatter) · [build](../../glosario.md#build)
- [import-type](../../glosario.md#import-type) · [modulo-virtual](../../glosario.md#modulo-virtual) · [entrada](../../glosario.md#entrada) · [typecheck](../../glosario.md#typecheck)
- [props](../../glosario.md#props) · [astro-props](../../glosario.md#astro-props) · [interface](../../glosario.md#interface) · [tipo](../../glosario.md#tipo) · [generico](../../glosario.md#generico) · [union](../../glosario.md#union)
- [comentario-jsdoc](../../glosario.md#comentario-jsdoc) (nuevo)
- [desestructuracion](../../glosario.md#desestructuracion) · [template-literal](../../glosario.md#template-literal) · [expresion-en-plantilla](../../glosario.md#expresion-en-plantilla) · [class-list](../../glosario.md#class-list)
- [image-component](../../glosario.md#image-component) · [webp](../../glosario.md#webp) · [srcset](../../glosario.md#srcset) · [lazy-loading](../../glosario.md#lazy-loading) · [presupuesto-de-peso](../../glosario.md#presupuesto-de-peso)
- [tailwind](../../glosario.md#tailwind) · [token](../../glosario.md#token) · [variante](../../glosario.md#variante) · [unidades-tailwind](../../glosario.md#unidades-tailwind) · [escala-de-texto](../../glosario.md#escala-de-texto) (nuevo) · [layer-y-apply](../../glosario.md#layer-y-apply) · [stretched-link](../../glosario.md#stretched-link)
- [accesibilidad](../../glosario.md#accesibilidad) · [jerarquia-de-titulos](../../glosario.md#jerarquia-de-titulos) · [nombre-accesible](../../glosario.md#nombre-accesible) (nuevo) · [aria-hidden](../../glosario.md#aria-hidden) · [focus-visible](../../glosario.md#focus-visible)
