# `src/pages/producto/[id].astro`

> **Qué es:** la plantilla de las páginas `/producto/<id>`, una por producto ·
> **Lo decidió:** [spec 0006](../../../../../docs/specs/0006-product-detail-page.md) (y la
> ruta, en la [spec 0001](../../../../../docs/specs/0001-stack.md); el botón de WhatsApp, en la
> [spec 0007](../../../../../docs/specs/0007-whatsapp-order.md), y su icono y el relleno de abajo,
> en la [spec 0011](../../../../../docs/specs/0011-visual-polish.md)) ·
> **Lo usan:** nadie lo importa; Astro genera `dist/producto/<id>/index.html` por cada producto
> ([ruta dinámica](../../../glosario.md#ruta-por-archivo)). Las tarjetas del catálogo enlazan
> aquí ([`ProductCard.astro`](../../components/ProductCard.astro.md)) ·
> **Usa:** `BaseLayout`, `SiteHeader`, `SiteFooter`, `WhatsAppIcon`, `formatPrice()` (`src/lib/price.ts`), `site`
> (`src/lib/site.ts`), `orderLink()` (`src/lib/whatsapp.ts`), las colecciones `products` y
> `categories`

## Para qué sirve

Es la página que abre un cliente al tocar un producto, o, más a menudo, al tocar un enlace que
el dueño compartió en WhatsApp. Muestra la foto, el nombre, el precio, si está disponible y la
descripción, y ofrece el camino de vuelta al catálogo. Además prepara la **vista previa** que
WhatsApp muestra al pegar el enlace: foto, nombre y precio. Un solo archivo produce las 18
páginas, incluidas las de productos agotados, para que un enlace compartido nunca acabe en un
error 404.

## El código, por partes

### 1. Imports

```astro
---
import type { GetStaticPaths } from 'astro';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { Image, getImage } from 'astro:assets';
import BaseLayout from '../../layouts/BaseLayout.astro';
import SiteHeader from '../../components/SiteHeader.astro';
import SiteFooter from '../../components/SiteFooter.astro';
import WhatsAppIcon from '../../components/WhatsAppIcon.astro';
import { formatPrice } from '../../lib/price';
import { site } from '../../lib/site';
import { orderLink } from '../../lib/whatsapp';
```

- `---`: abre el [frontmatter](../../../glosario.md#frontmatter), el código que corre en el
  [build](../../../glosario.md#build).
- `import type { GetStaticPaths } from 'astro';`: solo un [tipo](../../../glosario.md#tipo)
  ([import type](../../../glosario.md#import-type)) que describe lo que debe devolver
  [`getStaticPaths`](../../../glosario.md#getstaticpaths). Se usa en el bloque 2.
- `import { getCollection, getEntry, type CollectionEntry } from 'astro:content';`: del
  [módulo virtual](../../../glosario.md#modulo-virtual) de datos trae:
  - `getCollection`: todas las [entradas](../../../glosario.md#entrada) de una colección
    ([getcollection](../../../glosario.md#getcollection)).
  - `getEntry`: **una** entrada concreta ([getentry](../../../glosario.md#getentry)). Aquí
    sirve para encontrar la categoría del producto.
  - `type CollectionEntry`: el tipo "una entrada de la colección X"
    ([genérico](../../../glosario.md#generico)). El `type` delante hace que solo exista para el
    [typecheck](../../../glosario.md#typecheck).
- `import { Image, getImage } from 'astro:assets';`: dos herramientas de imágenes:
  - `Image`: el componente que escribe la etiqueta `<img>` optimizada
    ([image-component](../../../glosario.md#image-component)).
  - `getImage`: la misma optimización, pero en vez de una etiqueta devuelve la **URL** del
    archivo generado ([getimage](../../../glosario.md#getimage)). La necesitamos para la vista
    previa de WhatsApp, que va en una etiqueta `<meta>`, no en un `<img>`.
- `BaseLayout`, `SiteHeader` y `SiteFooter`: el esqueleto de la página, la cabecera y el pie,
  los mismos que usa el catálogo ([`BaseLayout.astro.md`](../../layouts/BaseLayout.astro.md),
  [`SiteHeader.astro.md`](../../components/SiteHeader.astro.md),
  [`SiteFooter.astro.md`](../../components/SiteFooter.astro.md)).
- `WhatsAppIcon`: el icono oficial de WhatsApp, que va dentro del botón de pedido
  ([`WhatsAppIcon.astro.md`](../../components/WhatsAppIcon.astro.md)). Se usa en el bloque 9.
- `formatPrice` y `site`: el formato `280 CUP` ([`price.ts.md`](../../lib/price.ts.md)) y el
  nombre de la tienda ([`site.ts.md`](../../lib/site.ts.md)).
- `orderLink`: arma el enlace del botón de WhatsApp (feature 07,
  [`whatsapp.ts.md`](../../lib/whatsapp.ts.md)). Se usa en los bloques 4 y 9.
- Las rutas empiezan por `../../` porque el archivo está en `src/pages/producto/`: hay que subir
  dos carpetas para llegar a `src/`.

### 2. Qué páginas generar

```astro
// One static page per product, out-of-stock ones included so shared links never break (spec 0006).
export const getStaticPaths = (async () => {
	const products = await getCollection('products');
	return products.map((product) => ({
		params: { id: product.id },
		props: { product },
	}));
}) satisfies GetStaticPaths;
```

- El comentario: "Una página estática por producto, incluidos los agotados, para que los
  enlaces compartidos nunca se rompan (spec 0006)."
- `export const getStaticPaths = (async () => { ... })`: la función que Astro llama en el build
  para saber **cuántas páginas** generar con esta plantilla. Es
  [`async`](../../../glosario.md#async-await) porque espera los datos.
- `const products = await getCollection('products');`: los 18 productos, sin filtrar. Fíjate en
  la diferencia con la página de categoría, que usa `getCatalog()`: aquí no hace falta agrupar
  ni ordenar, solo una página por producto.
- `return products.map((product) => ({ ... }))`: convierte cada producto en una "orden de
  página":
  - `params: { id: product.id }`: el valor que toma `[id]` en el nombre del archivo. Para el
    arroz, `id` = `arroz-blanco`, así que Astro escribe `dist/producto/arroz-blanco/index.html`.
  - `props: { product }`: los datos que recibe esa página (la entrada completa del producto).
    `{ product }` es la forma corta de `{ product: product }`.
- `satisfies GetStaticPaths`: pide al typecheck que confirme que la función tiene la forma que
  Astro espera ([satisfies](../../../glosario.md#satisfies)).

### 3. Los datos de esta página

```astro
interface Props {
	product: CollectionEntry<'products'>;
}

const { product } = Astro.props;
const { name, unit, price, inStock, description, photo } = product.data;
const category = await getEntry(product.data.category);
```

- `interface Props { product: ... }`: declara que esta página recibe una
  [prop](../../../glosario.md#props) `product`, una entrada de la colección `products`
  ([interface](../../../glosario.md#interface)).
- `const { product } = Astro.props;`: saca esa prop
  ([Astro.props](../../../glosario.md#astro-props),
  [desestructuración](../../../glosario.md#desestructuracion)). Este código se ejecuta **una
  vez por página**: en la página del arroz, `product` es el arroz; en la de los huevos, los
  huevos.
- `const { name, unit, price, inStock, description, photo } = product.data;`: saca los seis
  campos del producto en variables cortas, para no escribir `product.data.` cada vez. `photo` es,
  desde la spec 0013, la URL de la foto en Supabase
  ([imagen remota](../../../glosario.md#imagen-remota)).
- `const category = await getEntry(product.data.category);`: busca la categoría del producto.
  `product.data.category` no es el nombre de la categoría sino una
  [referencia](../../../glosario.md#reference), `{ collection: 'categories', id: 'granos-y-pastas' }`
  (como una clave foránea en una base de datos). `getEntry` recibe esa referencia y devuelve la
  entrada completa de la categoría, con su `id` y su `data.name` ("Granos y pastas"). Se usa en
  la ruta de navegación del bloque 6.

### 4. La vista previa de WhatsApp

```astro
// WhatsApp link preview: the price leads the description (owner's choice), and the image is a
// JPG because WebP previews are not guaranteed.
const availability = inStock ? 'Disponible' : 'Agotado';
const title = `${name} · ${site.name}`;
const metaDescription = `${formatPrice(price)} · ${unit} · ${availability}. ${description}`;
const previewImage = await getImage({ src: photo, inferSize: true, width: 600, format: 'jpg' });

// The same absolute page URL as og:url, so the shop sees which product the message is about.
const pageUrl = new URL(Astro.url.pathname, Astro.site ?? Astro.url).href;
const orderHref = orderLink(product, pageUrl);
---
```

- El comentario: "Vista previa del enlace en WhatsApp: el precio va al principio de la
  descripción (elección del dueño), y la imagen es un JPG porque no está garantizado que
  WhatsApp muestre WebP."
- `const availability = inStock ? 'Disponible' : 'Agotado';`: un ternario. Si `inStock` es
  `true`, vale "Disponible"; si no, "Agotado".
- `const title = \`${name} · ${site.name}\`;`: el título de la pestaña y de la vista previa,
  por ejemplo "Arroz blanco · Tienda de alimentos (demo)"
  ([template literal](../../../glosario.md#template-literal)).
- `const metaDescription = ...`: la descripción para la vista previa. Para el arroz da
  "280 CUP · 1 lb · Disponible. Arroz blanco de grano largo, vendido por libra. …". El precio va
  primero para que se lea aunque WhatsApp corte el texto.
- `const previewImage = await getImage({ src: photo, inferSize: true, width: 600, format: 'jpg' });`:
  en el build, descarga la foto de Supabase, crea una copia de 600 px de ancho en formato JPG y
  devuelve, entre otras cosas, su ruta en `previewImage.src` (por ejemplo
  `/_astro/arroz-blanco_182Kbk.jpg`). El nombre lleva letras que parecen al azar (un *hash*) para
  que, si la foto cambia, el archivo nuevo tenga otro nombre y nadie vea una copia vieja guardada.
  - `inferSize: true` (spec 0013): como `photo` es una URL, Astro no sabe cuánto mide la foto;
    con esta opción la descarga y la mide antes de reducirla
    ([inferSize](../../../glosario.md#infersize)). Es lo mismo que el `inferSize` del `<Image>` del
    bloque 7, escrito como propiedad de un objeto.
  - La vista previa apunta a esa copia de `dist/`, no a Supabase: WhatsApp nunca pide nada a
    Supabase.
- El comentario siguiente: "La misma URL absoluta de la página que `og:url`, para que la tienda
  vea de qué producto habla el mensaje."
- `const pageUrl = new URL(Astro.url.pathname, Astro.site ?? Astro.url).href;`: la dirección
  completa de esta página, por ejemplo `https://…/producto/arroz-blanco/`
  ([constructor URL](../../../glosario.md#constructor-url)). Toma la ruta de la página
  (`Astro.url.pathname`) y le pone delante el dominio público (`Astro.site`,
  `https://tienda-demo-cuba.vercel.app`) o, si algún día faltara, el de la página que se está
  generando, que en el build es `localhost`
  ([Astro.url y Astro.site](../../../glosario.md#astro-url-y-site),
  [`??`](../../../glosario.md#nullish)). Es el mismo cálculo que hace `BaseLayout` para `og:url`.
- `const orderHref = orderLink(product, pageUrl);`: el enlace de WhatsApp con el mensaje ya
  escrito, por ejemplo `https://wa.me/5355555555?text=Hola%2C%20quiero%20pedir…`. Si la
  [variable de entorno](../../../glosario.md#variable-de-entorno) `WHATSAPP_NUMBER` falta o está
  mal, esta línea lanza un error y **el build se para** (ver
  [`whatsapp.ts.md`](../../lib/whatsapp.ts.md)).
- `---`: cierra el frontmatter. Lo que sigue es la plantilla HTML.

### 5. El layout y la cabecera

```astro
<BaseLayout title={title} description={metaDescription} image={previewImage.src}>
	<SiteHeader />
	<main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 pt-8 pb-12">
```

- `<BaseLayout title=… description=… image=…>`: el [layout](../../../glosario.md#layout) pone
  `<title>`, la meta descripción y las etiquetas [Open Graph](../../../glosario.md#open-graph)
  con estos tres valores. `BaseLayout` convierte la ruta de la imagen en una
  [URL absoluta](../../../glosario.md#url-absoluta), que es lo que exige Open Graph. Todo lo que
  va dentro de `<BaseLayout>` cae en su [slot](../../../glosario.md#slot).
- `<SiteHeader />`: la cabecera con el toldo, el nombre de la tienda, que enlaza a `/`, y el
  enlace "Escríbenos" a WhatsApp.
- `<main class="…">`: el contenido principal. Clases
  ([unidades](../../../glosario.md#unidades-tailwind)):
  - `mx-auto`: margen izquierdo y derecho automáticos, para centrar.
  - `flex flex-col`: los hijos van en columna.
  - `gap-6`: 24 px entre la ruta de navegación y el artículo (en el catálogo es `gap-12`; aquí hay
    menos bloques y se ven mejor más juntos).
  - `max-w-5xl`: como mucho 1024 px de ancho.
  - `px-4`: 16 px de relleno a los lados.
  - `pt-8 pb-12`: 32 px de relleno arriba y 48 px abajo. Hasta la spec 0011 era `py-8` (32 px
    arriba y abajo) y el pie de página traía 48 px de margen propio. El pie lo perdió para
    pegarse a la banda de información de la portada, así que esta página pone ahora ese aire
    con `pb-12`, antes del pie oscuro.

### 6. La ruta de navegación (*breadcrumb*)

```astro
		<nav aria-label="Ruta">
			<ol class="flex flex-wrap items-center gap-2 text-sm text-muted">
				<li><a href="/" class="inline-flex min-h-11 items-center hover:text-accent">Productos</a></li>
				<li aria-hidden="true">›</li>
				<li>
					<a href={`/categoria/${category.id}`} class="inline-flex min-h-11 items-center hover:text-accent">
						{category.data.name}
					</a>
				</li>
			</ol>
		</nav>
```

Se ve así: **Productos › Granos y pastas**. Es el camino de vuelta al catálogo, y funciona
aunque el cliente haya llegado directo desde WhatsApp y no tenga historial para "volver atrás".

- `<nav aria-label="Ruta">`: un bloque de navegación; el lector de pantalla lo anuncia como
  "navegación Ruta" ([aria-label](../../../glosario.md#aria-label)).
- `<ol>`: una lista **ordenada**, porque los pasos de una ruta tienen orden. Clases:
  - `flex flex-wrap items-center`: los elementos en fila, que saltan de línea si no caben, y
    centrados en vertical.
  - `gap-2`: 8 px entre elementos.
  - `text-sm text-muted`: texto de 14 px en el color secundario
    ([escala de texto](../../../glosario.md#escala-de-texto), [token](../../../glosario.md#token)).
- Primer `<li>`: el enlace "Productos" a la portada `/`. Clases del enlace:
  - `inline-flex min-h-11 items-center`: al menos 44 px de alto, con el texto centrado en vertical
    ([área táctil](../../../glosario.md#area-tactil)). Hace falta `inline-flex` porque `min-height`
    no afecta a un enlace normal (que es *inline*).
  - `hover:text-accent`: al pasar el ratón, el texto se pone rojo
    ([variante](../../../glosario.md#variante)).
- `<li aria-hidden="true">›</li>`: el separador. Es solo decoración, así que se oculta al lector
  de pantalla ([aria-hidden](../../../glosario.md#aria-hidden)).
- Tercer `<li>`: el enlace a la página de la categoría. `href={\`/categoria/${category.id}\`}`
  arma la URL con el id (`/categoria/granos-y-pastas`) y el texto es el nombre
  (`category.data.name`), ambos del bloque 3.

### 7. La foto

```astro
		<article class="grid gap-6 md:grid-cols-2 md:items-start">
			<Image
				src={photo}
				alt={name}
				inferSize
				widths={[400, 800]}
				sizes="(min-width: 768px) 480px, 100vw"
				loading="eager"
				class:list={[
					'aspect-square w-full rounded-card border border-border object-cover',
					{ 'opacity-50': !inStock },
				]}
			/>
```

- `<article class="…">`: agrupa todo lo del producto. Clases:
  - `grid gap-6`: una rejilla con 24 px entre celdas. Sin más clases tiene una sola columna:
    en el móvil, la foto arriba y los datos debajo.
  - `md:grid-cols-2`: desde 768 px de ancho, dos columnas: foto a la izquierda, datos a la
    derecha. `md:` es la variante de 768 px (como `sm:` es la de 640 px).
  - `md:items-start`: en dos columnas, cada celda se pega arriba en vez de estirarse.
- `<Image …>` ([image-component](../../../glosario.md#image-component)):
  - `src={photo}`: la URL de la foto original en Supabase. Astro la descarga en el build (lo
    permite `remotePatterns` en [`astro.config.mjs`](../../../astro.config.mjs.md)) y el `<img>`
    final apunta a las copias de `dist/_astro/`.
  - `alt={name}`: el texto alternativo es el nombre del producto, que es lo que lee el lector de
    pantalla ([nombre accesible](../../../glosario.md#nombre-accesible)).
  - `inferSize` (spec 0013): Astro descarga la foto y la mide, porque una URL no trae sus medidas
    ([inferSize](../../../glosario.md#infersize)). En la página del arroz, el `<img>` sale con
    `width="1067" height="1067"`, las medidas de la foto original. Escrito sin `={…}` equivale a
    `inferSize={true}`.
  - `widths={[400, 800]}`: genera dos versiones, de 400 y 800 px, en
    [WebP](../../../glosario.md#webp), y las pone en el [srcset](../../../glosario.md#srcset).
  - `sizes="(min-width: 768px) 480px, 100vw"`: le dice al navegador cuánto ocupará la foto:
    unos 480 px desde 768 px de ancho, y todo el ancho de la pantalla por debajo. En un móvil de
    360 px con pantalla de doble densidad, la foto ocupa 720 píxeles reales, así que el navegador
    elige la de 800.
  - `loading="eager"`: se descarga en seguida, porque es lo primero que se ve
    ([lazy-loading](../../../glosario.md#lazy-loading)).
  - `class:list={[…]}` ([class-list](../../../glosario.md#class-list)): siempre
    `aspect-square` (cuadrada), `w-full` (todo el ancho de su celda), `rounded-card` (esquinas
    redondeadas con el token del proyecto), `border border-border` (borde de 1 px en el color
    `border`) y `object-cover` (la foto rellena el cuadrado recortando lo que sobre). Y, si el
    producto está agotado (`!inStock`), `opacity-50`: la foto se ve atenuada, igual que en el
    catálogo.

### 8. Los datos del producto

```astro
			<div class="flex flex-col gap-3">
				<h1>{name}</h1>
				<p class="text-muted">{unit}</p>
				<p class="price">{formatPrice(price)}</p>
```

- `<div class="flex flex-col gap-3">`: la segunda celda de la rejilla. Sus hijos van en
  columna, con 12 px entre ellos.
- `<h1>{name}</h1>`: el título de la página, el nombre del producto. No lleva clases: el estilo
  base de `global.css` ya le pone la fuente Fraunces a 30 px
  ([jerarquía de títulos](../../../glosario.md#jerarquia-de-titulos)).
- `<p class="text-muted">{unit}</p>`: el formato ("1 lb", "Cartón 30 u") en color secundario.
- `<p class="price">{formatPrice(price)}</p>`: el precio, siempre a través de `formatPrice()`
  (`280` → `280 CUP`). La clase `price` (definida en `global.css`) lo pone en Fraunces, rojo y
  a 20 px.

### 9. La etiqueta de disponibilidad y la descripción

```astro
				{
					inStock ? (
						<p class="inline-flex w-fit items-center gap-1.5 rounded-full bg-olive-soft px-2 py-0.5 text-xs font-medium text-olive">
							<span class="size-1.5 rounded-full bg-olive" aria-hidden="true" />
							Disponible
						</p>
					) : (
						<p class="inline-flex w-fit items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-unavailable">
							Agotado
						</p>
					)
				}
				<a
					href={orderHref}
					class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover md:w-fit"
				>
					<WhatsAppIcon variant="white" />
					{inStock ? 'Pedir por WhatsApp' : 'Preguntar por WhatsApp'}
				</a>
				<p>{description}</p>
			</div>
		</article>
	</main>
	<SiteFooter />
</BaseLayout>
```

- `{ inStock ? (…) : (…) }`: elige una de dos etiquetas
  ([expresión en plantilla](../../../glosario.md#expresion-en-plantilla)). Son las mismas que la
  tarjeta del catálogo ([`ProductCard.astro.md`](../../components/ProductCard.astro.md)), con una
  diferencia: aquí no llevan `mt-auto`. En la tarjeta, `mt-auto` empuja la etiqueta al fondo
  para que todas las tarjetas queden alineadas; aquí no hay nada que alinear.
- **Disponible:** `inline-flex w-fit items-center gap-1.5` (en fila, solo tan ancha como su
  contenido, con 6 px entre el punto y el texto), `rounded-full` (forma de píldora),
  `bg-olive-soft` (fondo verde claro), `px-2 py-0.5` (8 px de relleno a los lados, 2 px arriba
  y abajo), `text-xs font-medium text-olive` (texto de 12 px, peso 500, verde). Dentro, un punto
  verde de 6 px (`size-1.5 rounded-full bg-olive`) que es solo decoración (`aria-hidden`).
- **Agotado:** la misma forma, pero sin fondo, con un borde `border-border` y el texto en color
  `unavailable`. La palabra "Agotado" lleva el significado, no el color
  ([accesibilidad](../../../glosario.md#accesibilidad)).
- `<a href={orderHref} …>`: el botón de WhatsApp (feature 07). Es un **enlace** con aspecto de
  botón, no un `<button>`, porque lo que hace es llevarte a otra dirección (`wa.me`), y eso es
  justo lo que hace un enlace. Va en la misma pestaña (sin `target`), así que el botón "atrás"
  del móvil vuelve al producto. Clases (el "Primary button" de `design.md`):
  - `inline-flex items-center justify-center`: el icono y el texto, centrados en horizontal y
    en vertical.
  - `gap-2`: 8 px entre el icono y el texto (spec 0011).
  - `min-h-11`: al menos 44 px de alto ([área táctil](../../../glosario.md#area-tactil)).
  - `w-full md:w-fit`: ocupa todo el ancho en el móvil (fácil de tocar con el pulgar) y, desde
    768 px, solo lo que mide su texto.
  - `rounded-full`: forma de píldora. `px-6`: 24 px de relleno a los lados.
  - `bg-accent text-surface font-medium`: fondo rojo, texto blanco, peso 500.
  - `hover:bg-accent-hover active:bg-accent-hover`: un rojo más oscuro al pasar el ratón o
    mientras se pulsa.
- `<WhatsAppIcon variant="white" />`: el icono oficial de WhatsApp en su versión **blanca**
  ([explicación](../../components/WhatsAppIcon.astro.md)). Sobre el fondo rojo del botón, el
  verde de WhatsApp apenas se distinguiría; el blanco se ve como el texto. Lleva `alt=""`, así
  que el lector de pantalla sigue leyendo solo el texto del botón
  ([imagen decorativa](../../../glosario.md#imagen-decorativa)). La spec 0007 decía "sin logo";
  la spec 0011 cambió esa línea: el logo va, pero siempre junto a la palabra "WhatsApp".
- `{inStock ? 'Pedir por WhatsApp' : 'Preguntar por WhatsApp'}`: el texto cambia según la
  disponibilidad (el dueño eligió que los agotados también tengan botón, para preguntar).
  El mensaje que se escribe en WhatsApp también cambia; eso lo decide `orderLink()`.
- `<p>{description}</p>`: la descripción completa, en texto normal.
- `</div>`, `</article>`, `</main>`: cierran la columna de datos, el artículo y el contenido.
- `<SiteFooter />`: el pie de página oscuro, igual que en el catálogo
  ([`SiteFooter.astro.md`](../../components/SiteFooter.astro.md)). Va fuera del `<main>`.
- `</BaseLayout>`: cierra el layout.

## Cómo se conecta

- **Entra:** la colección `products` y, para cada producto, su categoría de la colección
  `categories`, ambas definidas en [`content.config.ts`](../../content.config.ts.md) con datos
  leídos de Supabase en el build ([`supabase.ts`](../../lib/supabase.ts.md)). La foto viene del
  bucket `product-photos` de Supabase.
- **Sale:** 18 archivos `dist/producto/<id>/index.html`, sus fotos WebP de 400 y 800 px y un JPG
  de 600 px por producto para la vista previa.
- **Quién llega aquí:** las tarjetas de la portada y de las páginas de categoría (cada una
  enlaza a `/producto/<id>`) y cualquiera que abra un enlace compartido en WhatsApp.
- **A dónde se va desde aquí:** a `/` (el nombre de la tienda en la cabecera, o "Productos") y a
  `/categoria/<id>` (el segundo paso de la ruta).
- **A WhatsApp:** el botón abre `wa.me` con el número de `WHATSAPP_NUMBER` y el mensaje del
  producto ([`whatsapp.ts.md`](../../lib/whatsapp.ts.md)). "Escríbenos" (cabecera) y
  "Escríbenos por WhatsApp" (pie) abren el mismo chat con un mensaje general, sin producto.

## Prueba tú

Cambia el orden de la descripción de la vista previa y míralo en el HTML generado.

1. En la línea `const metaDescription = …`, quita `${formatPrice(price)} · ` del principio.
2. Ejecuta `pnpm build`.
3. Abre `dist/producto/arroz-blanco/index.html` en VS Code y busca `og:description`.
   **Qué deberías ver:** `1 lb · Disponible. Arroz blanco de grano largo…`, ya sin el precio.
4. **Deshacer:** vuelve a poner `${formatPrice(price)} · ` al principio del texto y ejecuta
   `pnpm build` otra vez (deshazlo a mano o con Ctrl+Z).

## Términos

- [frontmatter](../../../glosario.md#frontmatter) · [build](../../../glosario.md#build)
- [tipo](../../../glosario.md#tipo) · [import-type](../../../glosario.md#import-type) ·
  [generico](../../../glosario.md#generico) · [interface](../../../glosario.md#interface) ·
  [satisfies](../../../glosario.md#satisfies) · [typecheck](../../../glosario.md#typecheck)
- [modulo-virtual](../../../glosario.md#modulo-virtual) ·
  [getcollection](../../../glosario.md#getcollection) · [getentry](../../../glosario.md#getentry) ·
  [entrada](../../../glosario.md#entrada) · [reference](../../../glosario.md#reference)
- [getStaticPaths](../../../glosario.md#getstaticpaths) ·
  [ruta-por-archivo](../../../glosario.md#ruta-por-archivo) · [props](../../../glosario.md#props) ·
  [astro-props](../../../glosario.md#astro-props) · [layout](../../../glosario.md#layout) ·
  [slot](../../../glosario.md#slot)
- [image-component](../../../glosario.md#image-component) · [getimage](../../../glosario.md#getimage) ·
  [webp](../../../glosario.md#webp) · [srcset](../../../glosario.md#srcset) ·
  [lazy-loading](../../../glosario.md#lazy-loading) ·
  [imagen-remota](../../../glosario.md#imagen-remota) · [infersize](../../../glosario.md#infersize)
  (nuevos)
- [open-graph](../../../glosario.md#open-graph) · [url-absoluta](../../../glosario.md#url-absoluta) ·
  [constructor-url](../../../glosario.md#constructor-url) ·
  [astro-url-y-site](../../../glosario.md#astro-url-y-site) · [nullish](../../../glosario.md#nullish)
- [variable-de-entorno](../../../glosario.md#variable-de-entorno) ·
  [click-to-chat](../../../glosario.md#click-to-chat) ·
  [imagen-decorativa](../../../glosario.md#imagen-decorativa) (nuevo)
- [async-await](../../../glosario.md#async-await) ·
  [desestructuracion](../../../glosario.md#desestructuracion) ·
  [template-literal](../../../glosario.md#template-literal) ·
  [expresion-en-plantilla](../../../glosario.md#expresion-en-plantilla) ·
  [class-list](../../../glosario.md#class-list)
- [unidades-tailwind](../../../glosario.md#unidades-tailwind) · [token](../../../glosario.md#token) ·
  [variante](../../../glosario.md#variante) · [escala-de-texto](../../../glosario.md#escala-de-texto)
- [aria-label](../../../glosario.md#aria-label) · [aria-hidden](../../../glosario.md#aria-hidden) ·
  [nombre-accesible](../../../glosario.md#nombre-accesible) ·
  [area-tactil](../../../glosario.md#area-tactil) ·
  [jerarquia-de-titulos](../../../glosario.md#jerarquia-de-titulos) ·
  [accesibilidad](../../../glosario.md#accesibilidad)
