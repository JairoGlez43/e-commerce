# `src/layouts/BaseLayout.astro`

> **Qué es:** el [layout](../../glosario.md#layout) común, el esqueleto `<html>` de todas las páginas · **Lo decidió:** [spec 0001](../../../../docs/specs/0001-stack.md) (AC8: `lang`, título, descripción y Open Graph), [spec 0002](../../../../docs/specs/0002-design-base.md) (`<Font>` y el CSS global) y [spec 0003](../../../../docs/specs/0003-site-identity.md) (imagen por defecto y URL de respaldo) · **Lo usan:** [`src/pages/index.astro`](../pages/index.astro.md), [`src/pages/categoria/[id].astro`](../pages/categoria/[id].astro.md), [`src/pages/estilo.astro`](../pages/estilo.astro.md) · **Usa:** [`src/styles/global.css`](../styles/global.css.md), `<Font>` de `astro:assets`, `public/og-default.png` y los favicons de `public/`

## Para qué sirve

Cada página necesita lo mismo alrededor de su contenido: `<html lang="es">`, el `<head>` con
título, descripción, iconos, la fuente de títulos, los estilos y las etiquetas que lee WhatsApp
para la vista previa. Este archivo lo escribe **una sola vez**; cada página solo le pasa su
título y su descripción, y pone su contenido dentro.

## El código, por partes

```astro
---
import { Font } from 'astro:assets';
import '../styles/global.css';
import { site } from '../lib/site';
```

- `---` abre el [frontmatter](../../glosario.md#frontmatter): el código que corre en el
  [build](../../glosario.md#build), nunca en el navegador.
- `import { Font } from 'astro:assets';` trae el componente `Font` de un
  [módulo virtual](../../glosario.md#modulo-virtual) de Astro. Sirve para meter en el `<head>`
  la fuente Fraunces (ver [Fonts API](../../glosario.md#fonts-api)).
- `import '../styles/global.css';` es un [import de CSS](../../glosario.md#import-de-css): no
  trae ninguna variable, solo le dice a Astro "esta página usa este CSS". Astro se encarga de
  que el CSS llegue a cada página que use este layout. Por eso `global.css` se importa **solo
  aquí** (spec 0002): todas las páginas pasan por este archivo.
- `import { site } from '../lib/site';` trae el objeto con la identidad de la tienda. Aquí solo
  se usa su interruptor `site.indexable` (ver [`site.ts.md`](../lib/site.ts.md)).

```astro

interface Props {
	title: string;
	description: string;
	/** Path under public/ or absolute URL for the Open Graph image. */
	image?: string;
	/** Keep the page out of search engines (internal pages such as /estilo). */
	noindex?: boolean;
}
```

- `interface Props { … }` es una [interface](../../glosario.md#interface) de
  [TypeScript](../../glosario.md#typescript): declara qué [props](../../glosario.md#props)
  acepta el layout y de qué [tipo](../../glosario.md#tipo) es cada una. Si una página olvida
  `title` o pasa un número, el [typecheck](../../glosario.md#typecheck) avisa.
- `title: string;` el título de la página. Obligatorio (no lleva `?`).
- `description: string;` la descripción corta de la página. Obligatoria.
- `/** Path under public/ or absolute URL for the Open Graph image. */` es un
  [comentario JSDoc](../../glosario.md#jsdoc). Dice: "Ruta dentro de `public/` o URL absoluta de
  la imagen Open Graph". Describe la prop de la línea siguiente.
- `image?: string;` la imagen para la vista previa en WhatsApp. El `?` la hace opcional.
- `/** Keep the page out of search engines (internal pages such as /estilo). */` otro JSDoc:
  "Mantiene la página fuera de los buscadores (páginas internas como `/estilo`)".
- `noindex?: boolean;` verdadero/falso, opcional.
- `}` cierra la interface.

```astro

const { title, description, image = '/og-default.png', noindex = false } = Astro.props;
```

- Saca las cuatro props de [`Astro.props`](../../glosario.md#astro-props) con
  [desestructuración](../../glosario.md#desestructuracion).
- `image = '/og-default.png'` y `noindex = false` son
  [valores por defecto](../../glosario.md#valor-por-defecto): si la página no pasa `image`, vale
  `'/og-default.png'` (la imagen de `public/`, spec 0003); si no pasa `noindex`, vale `false`.
  Así, una página normal solo tiene que pasar `title` y `description`.

```astro

// Open Graph needs absolute URLs. `site` comes from astro.config.mjs (spec 0008); the request
// origin is only a fallback if it is ever removed.
const base = Astro.site ?? Astro.url;
const pageUrl = new URL(Astro.url.pathname, base).href;
const imageUrl = new URL(image, base).href;
---
```

- El comentario dice: "Open Graph necesita URLs absolutas. `site` viene de `astro.config.mjs`
  (spec 0008); el origen de la petición es solo un respaldo, por si algún día se quita".
  [Open Graph](../../glosario.md#open-graph) son las etiquetas que lee WhatsApp, y exigen
  [URLs absolutas](../../glosario.md#url-absoluta).
- `const base = Astro.site ?? Astro.url;` elige el dominio base. Ver
  [Astro.url y Astro.site](../../glosario.md#astro-url-y-site):
  - `Astro.site` es el dominio público del sitio, sacado de la opción `site` de
    `astro.config.mjs`: `https://tienda-demo-cuba.vercel.app` (feature 08).
  - `Astro.url` es la dirección de la página que se está generando.
  - El [`??`](../../glosario.md#nullish) usa `Astro.site` si existe y, si no, `Astro.url`. Es
    el respaldo que anota la spec 0003.
- `const pageUrl = new URL(Astro.url.pathname, base).href;` construye la URL completa de esta
  página con el [constructor URL](../../glosario.md#constructor-url):
  - `Astro.url.pathname` es solo la ruta, por ejemplo `/categoria/carnicos/`.
  - `new URL(ruta, base)` la pega al dominio de `base`.
  - `.href` la convierte en texto: `https://tienda-demo-cuba.vercel.app/categoria/carnicos/`.
  - Antes de la feature 08, `site` no estaba puesto y aquí salía `http://localhost:4321/…`: las
    vistas previas de WhatsApp apuntaban a tu PC. Por eso existe la spec 0008.
- `const imageUrl = new URL(image, base).href;` lo mismo para la imagen:
  `'/og-default.png'` → `https://tienda-demo-cuba.vercel.app/og-default.png`. Si `image` ya fuera una URL
  completa (`https://…`), `new URL` la deja tal cual e ignora la base; por eso el comentario
  JSDoc permite las dos formas.
- `---` cierra el frontmatter. Lo de abajo es la plantilla HTML.

```astro

<!doctype html>
<html lang="es">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width" />
```

- `<!doctype html>`: le dice al navegador que es HTML moderno.
- `<html lang="es">`: el idioma de la página es español. El lector de pantalla lo usa para
  pronunciar bien, y lo exige el AC8 de la spec 0001.
- `<head>`: abre la cabecera invisible del documento.
- `<meta charset="utf-8" />`: la codificación de caracteres. Sin ella, la `ñ`, los acentos o el
  `¿` podrían salir como símbolos raros.
- `<meta name="viewport" content="width=device-width" />`: en el móvil, la página usa el ancho
  real de la pantalla. Sin esta línea, el móvil fingiría ser una pantalla de escritorio y lo
  vería todo diminuto.

```astro
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<link rel="icon" href="/favicon.ico" />
		<Font cssVariable="--font-fraunces" preload />
```

- Las dos `<link rel="icon">` son el icono de la pestaña (favicon). Los archivos están en
  `public/`, que se sirve tal cual, por eso la ruta empieza en `/`. El `.svg` es vectorial y se
  ve nítido a cualquier tamaño; el `.ico` es el formato clásico, como respaldo. Cada navegador
  usa el que sabe leer.
- `<Font cssVariable="--font-fraunces" preload />` (según la spec 0002): el componente `Font`
  busca en `astro.config.mjs` la fuente cuya variable es `--font-fraunces` (Fraunces 600) y
  escribe en el `<head>` el CSS que la declara y crea esa variable. `global.css` la usa en
  `--font-display`.
  - `preload` añade además un [preload](../../glosario.md#preload): pide al navegador que
    descargue el archivo de la fuente cuanto antes, sin esperar a descubrirlo en el CSS. Así
    los títulos aparecen antes con su letra definitiva (AC3 de la spec 0002).

```astro
		<title>{title}</title>
		<meta name="description" content={description} />
		{(noindex || !site.indexable) && <meta name="robots" content="noindex" />}
```

- `<title>{title}</title>`: el texto de la pestaña y el título que muestran Google y WhatsApp.
  `{title}` es una [expresión en plantilla](../../glosario.md#expresion-en-plantilla): inserta
  el valor de la prop.
- `<meta name="description" content={description} />`: el resumen que muestran los buscadores.
  En un atributo, `content={description}` va **sin comillas**: las llaves ya insertan el valor.
- `{(noindex || !site.indexable) && <meta name="robots" content="noindex" />}`: una
  [condición con `&&`](../../glosario.md#condicional-con-and). Si lo de la izquierda es
  verdadero, escribe la etiqueta; si no, nada. La etiqueta es un
  [meta robots](../../glosario.md#meta-robots): pide a Google y compañía que no listen esta
  página. Lo de la izquierda tiene dos casos, unidos por `||` ("o"):
  - `noindex`: la página lo pide ella misma. Solo `/estilo` lo hace, porque es una guía interna.
  - `!site.indexable`: el sitio entero es una demo (`indexable: false` en `src/lib/site.ts`,
    spec 0008). El `!` le da la vuelta: "no indexable" → escribe la etiqueta.
  - Hoy el segundo caso es verdadero, así que **todas** las páginas llevan `noindex`. Si el
    dueño compra el sitio y `indexable` pasa a `true`, la etiqueta desaparece de todas menos de
    `/estilo` (comprobado el 2026-10-10).

```astro
		<meta property="og:type" content="website" />
		<meta property="og:title" content={title} />
		<meta property="og:description" content={description} />
		<meta property="og:image" content={imageUrl} />
		<meta property="og:url" content={pageUrl} />
	</head>
```

Las cinco etiquetas [Open Graph](../../glosario.md#open-graph) que exige el AC8 de la spec 0001.
Con ellas, al pegar un enlace en WhatsApp sale una tarjeta con foto y título:

- `og:type` = `website`: qué clase de cosa es el enlace (un sitio web).
- `og:title` = el mismo `title` de la pestaña.
- `og:description` = la misma `description`.
- `og:image` = `imageUrl`, la URL absoluta calculada en el frontmatter.
- `og:url` = `pageUrl`, la URL absoluta de esta página, con el dominio de `site`
  (`https://tienda-demo-cuba.vercel.app/…`).
- `</head>` cierra la cabecera.

```astro
	<body>
		<slot />
	</body>
</html>
```

- `<body>` no lleva clases: su fondo `cream`, el color `ink` y la fuente del sistema vienen de la
  capa `base` de [`global.css`](../styles/global.css.md).
- `<slot />` es el [slot](../../glosario.md#slot): el hueco donde aparece lo que la página pone
  entre `<BaseLayout>` y `</BaseLayout>` (la cabecera, el `<main>`…).
- `</body>` y `</html>` cierran el documento.

## Cómo se conecta

- **Recibe** de cada página: `title` y `description` (obligatorias), y opcionalmente `image` y
  `noindex`.
  - [`src/pages/index.astro`](../pages/index.astro.md) pasa `title={site.name}` y
    `description={site.description}`, que vienen de [`src/lib/site.ts`](../lib/site.ts.md).
  - [`src/pages/categoria/[id].astro`](../pages/categoria/[id].astro.md) pasa un título como
    `Cárnicos · Tienda de alimentos (demo)` y su propia descripción.
  - [`src/pages/estilo.astro`](../pages/estilo.astro.md) pasa además `noindex`.
- **Usa:** [`src/styles/global.css`](../styles/global.css.md) (estilos de todo el sitio), la
  fuente declarada en [`astro.config.mjs`](../../astro.config.mjs.md), y de `public/`:
  `favicon.svg`, `favicon.ico` y `og-default.png`.
- **Produce:** el `<html>` completo de cada archivo de [`dist/`](../../glosario.md#dist).

## Prueba tú

**Parte 1, sin tocar nada.** Mira la URL absoluta en el sitio construido:

1. `pnpm build`.
2. Abre `dist/categoria/carnicos/index.html` en VS Code y busca (Ctrl+F) `og:url`.
3. **Qué verás:** `content="https://tienda-demo-cuba.vercel.app/categoria/carnicos/"`. El
   dominio sale de `site` en `astro.config.mjs`. Busca también `robots`: verás el `noindex`
   que pone `site.indexable`.

**Parte 2, un cambio que afecta a todas las páginas.**

1. `pnpm dev` y abre `http://localhost:4321/`.
2. Cambia `<title>{title}</title>` por `<title>{title} · prueba</title>` y guarda.
3. **Qué verás:** la pestaña del navegador termina en "· prueba". Abre
   `http://localhost:4321/categoria/carnicos` y `/estilo`: también. Un cambio en el layout
   llega a todas las páginas.
4. **Deshacer:** borra ` · prueba` y guarda.

## Términos

- [layout](../../glosario.md#layout)
- [frontmatter](../../glosario.md#frontmatter)
- [build](../../glosario.md#build)
- [modulo-virtual](../../glosario.md#modulo-virtual)
- [fonts-api](../../glosario.md#fonts-api) *(nuevo)*
- [import-de-css](../../glosario.md#import-de-css) *(nuevo)*
- [typescript](../../glosario.md#typescript)
- [interface](../../glosario.md#interface)
- [props](../../glosario.md#props)
- [tipo](../../glosario.md#tipo)
- [typecheck](../../glosario.md#typecheck)
- [jsdoc](../../glosario.md#jsdoc) *(nuevo)*
- [astro-props](../../glosario.md#astro-props)
- [desestructuracion](../../glosario.md#desestructuracion)
- [valor-por-defecto](../../glosario.md#valor-por-defecto) *(nuevo)*
- [open-graph](../../glosario.md#open-graph)
- [url-absoluta](../../glosario.md#url-absoluta)
- [astro-url-y-site](../../glosario.md#astro-url-y-site) *(nuevo)*
- [nullish](../../glosario.md#nullish)
- [constructor-url](../../glosario.md#constructor-url) *(nuevo)*
- [preload](../../glosario.md#preload) *(nuevo)*
- [expresion-en-plantilla](../../glosario.md#expresion-en-plantilla)
- [condicional-con-and](../../glosario.md#condicional-con-and) *(nuevo)*
- [meta-robots](../../glosario.md#meta-robots) *(nuevo)*
- [slot](../../glosario.md#slot)
- [dist](../../glosario.md#dist)
