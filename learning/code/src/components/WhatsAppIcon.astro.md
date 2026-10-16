# `src/components/WhatsAppIcon.astro`

> **Qué es:** el icono oficial de WhatsApp (el "glifo": el bocadillo con el teléfono dentro), como una imagen de 20 px, en verde o en blanco · **Lo decidió:** [spec 0011](../../../../docs/specs/0011-visual-polish.md) (Decision, Design → Files y SVG import; AC1, AC2 y AC8) y [`design.md`](../../../../design.md) (WhatsAppIcon) · **Lo usan:** [`SiteHeader.astro`](SiteHeader.astro.md) ("Escríbenos"), [`SiteFooter.astro`](SiteFooter.astro.md) ("Escríbenos por WhatsApp"), [`src/pages/producto/[id].astro`](../pages/producto/%5Bid%5D.astro.md) (el botón de pedido, en blanco) y [`src/pages/estilo.astro`](../pages/estilo.astro.md) (la muestra del enlace de contacto) · **Usa:** los dos archivos [SVG](../../glosario.md#svg) de `src/assets/icons/` (de dónde salen lo dice [`SOURCE.md`](../../../../src/assets/icons/SOURCE.md)) y dos clases de [Tailwind](../../glosario.md#tailwind)

## Para qué sirve

Los enlaces que abren WhatsApp son el único canal de pedido de la tienda, y hasta la spec 0011
eran solo texto. Este componente pone delante del texto el logo que todo el mundo reconoce.
Las normas de marca de Meta (la empresa dueña de WhatsApp) permiten usarlo en una web solo si
es el archivo oficial **sin modificar** (solo se puede cambiar su tamaño), si no es lo más
destacado de la página y si nunca sustituye a la palabra "WhatsApp" (según la spec 0011, que
cita la página de marca de Meta). Por eso este componente no dibuja nada: muestra el archivo
oficial tal cual, como imagen, y siempre va al lado de palabras.

Es el **único** archivo del proyecto que importa esos SVG. Las páginas y los otros componentes
escriben `<WhatsAppIcon />` y no saben nada de archivos.

## El código, por partes

### 1. Importar los dos archivos

```astro
---
import whatsAppGreen from '../assets/icons/Digital_Glyph_Green_RGB_2026.svg';
import whatsAppWhite from '../assets/icons/Digital_Glyph_White_RGB_2026.svg';
```

- `---` abre el [frontmatter](../../glosario.md#frontmatter), el código que corre en el
  [build](../../glosario.md#build).
- `import whatsAppGreen from '../assets/icons/Digital_Glyph_Green_RGB_2026.svg';`: importa el
  glifo verde. Importar una imagen **no** trae el dibujo: trae un objeto con sus datos
  ([importar una imagen](../../glosario.md#importar-imagen)). De ese objeto solo se usa `.src`,
  la dirección donde Astro publica el archivo. En el build, Astro copia el archivo a
  `dist/_astro/` con un *hash* en el nombre (unas letras que cambian si cambia el archivo), y
  `whatsAppGreen.src` vale
  `/_astro/Digital_Glyph_Green_RGB_2026.DhgQ9P1i.svg`.
- `import whatsAppWhite from '../assets/icons/Digital_Glyph_White_RGB_2026.svg';`: lo mismo con
  el glifo blanco (`/_astro/Digital_Glyph_White_RGB_2026.C8MSTDHk.svg`).
- `../` sube de `src/components/` a `src/`, y de ahí baja a `assets/icons/`.
- Los nombres de los archivos son los del ZIP oficial de Meta, sin tocar (`Digital_Glyph`: el
  glifo para pantallas; `RGB`: colores de pantalla; `2026`: la edición del kit).
  [`SOURCE.md`](../../../../src/assets/icons/SOURCE.md), en la misma carpeta, apunta la página de
  descarga, la fecha (2026-10-16), que fue el dueño quien aceptó las condiciones de Meta, y que los
  dos archivos son idénticos byte a byte a los del ZIP (mismo contenido exacto, comprobado con el
  comando `cmp`, que compara dos archivos y no dice nada si son iguales). Verde: 1181 bytes;
  blanco: 1168.
- ¿Cómo sabe TypeScript qué es `whatsAppGreen`? Por `node_modules/astro/client.d.ts`, un
  [archivo de declaración](../../glosario.md#archivo-de-declaracion) que dice que todo `.svg`
  importado es a la vez un componente y un objeto de imagen con `src`, `width`, `height` y
  `format`. Aquí solo se usa la segunda parte (bloque 2).

### 2. Por qué `<img>` y no el dibujo pegado en la página

```astro

// Official WhatsApp glyph, unmodified (spec 0011; source in src/assets/icons/SOURCE.md).
// An <img>, never inline: the official files carry their own <style> and id, which would clash
// between the green and white variants on one page. Decorative: the link text names the link.
```

- El comentario dice: "Glifo oficial de WhatsApp, sin modificar (spec 0011; origen en
  `src/assets/icons/SOURCE.md`). Un `<img>`, nunca en línea: los archivos oficiales llevan su
  propio `<style>` y su propio `id`, que chocarían entre la variante verde y la blanca en una
  misma página. Decorativo: el texto del enlace es el que da nombre al enlace."
- **El problema.** Si abres el archivo verde en VS Code, empieza así: `<svg id="Layer_1" …>`, y
  dentro lleva `<style> .cls-1 { fill: #25d366; } </style>` (el color de cada forma). El blanco
  es igual pero con `fill: #fff`. Un [SVG](../../glosario.md#svg) se puede usar de dos formas:
  - **Pegado en el HTML** (*en línea*): su código pasa a ser parte de la página. Su `<style>`
    deja de ser suyo y se aplica a **toda** la página. En la página de un producto, con el icono
    verde en la cabecera y el blanco en el botón, habría dos reglas `.cls-1` con distinto color:
    gana la última que aparece, y los dos iconos saldrían del mismo color. Además
    `id="Layer_1"` se repetiría, y en una página cada `id` debe ser único.
  - **Como archivo en un `<img>`**: el navegador lo pinta aparte, como una foto. Su `<style>`
    solo afecta a ese dibujo. No hay choque.
- Astro permitiría la primera forma escribiendo `<whatsAppGreen />` como si fuera un componente.
  Su código (`createSvgComponent`, en `node_modules/astro/dist/assets/runtime.js`) copia el
  contenido del archivo tal cual dentro de un `<svg>` en la página, con su `<style>` incluido.
  Arreglarlo editando los archivos está prohibido por las normas de marca. Por eso el `<img>`.
- **El coste:** el navegador pide un archivo pequeño por variante (unos 1,2 KB) y lo guarda para
  las demás páginas (según la spec). En el HTML construido no queda ningún `<svg>` ni ningún
  `Layer_1` (AC8).

### 3. Las props

```astro

interface Props {
	/** White on the terracotta order button; green everywhere else. */
	variant?: 'green' | 'white';
}
```

- `interface Props { … }`: las [props](../../glosario.md#props) que acepta el componente
  ([interface](../../glosario.md#interface)). Solo una.
- `/** … */`: un [comentario JSDoc](../../glosario.md#jsdoc): "Blanco en el botón de pedido
  terracota; verde en todos los demás sitios". VS Code lo enseña al pasar el ratón sobre
  `variant`.
- `variant?: 'green' | 'white';`: la prop `variant` puede ser solo el texto `'green'` o el texto
  `'white'` ([unión](../../glosario.md#union)). El `?` la hace opcional: se puede escribir
  `<WhatsAppIcon />` sin nada. Si alguien escribe `variant="red"`, el
  [typecheck](../../glosario.md#typecheck) da error.
- Por qué blanco en el botón: el botón es rojo terracota (`accent`), y el verde de WhatsApp sobre
  ese rojo se distingue poco (3,05 a 1, según la spec); el blanco oficial, mucho más (6,04 a 1,
  `design.md`). Ver [contraste](../../glosario.md#contraste-wcag).

### 4. Elegir el archivo

```astro

const { variant = 'green' } = Astro.props;
const file = variant === 'white' ? whatsAppWhite : whatsAppGreen;
---
```

- `const { variant = 'green' } = Astro.props;`: saca la prop de
  [`Astro.props`](../../glosario.md#astro-props). Si no llegó, vale `'green'`
  ([valor por defecto](../../glosario.md#valor-por-defecto)).
- `const file = variant === 'white' ? whatsAppWhite : whatsAppGreen;`: un ternario. Si pidieron
  `'white'`, `file` es el objeto del glifo blanco; si no, el del verde.
- `---`: cierra el frontmatter.

### 5. La imagen

```astro

<img src={file.src} width="20" height="20" alt="" class="size-5 shrink-0" />
```

Es todo el HTML del componente: un solo `<img>`. En la página construida queda así:
`<img src="/_astro/Digital_Glyph_Green_RGB_2026.DhgQ9P1i.svg" width="20" height="20" alt="" class="size-5 shrink-0">`.

- `src={file.src}`: la dirección del archivo elegido en el bloque 4
  ([expresión en plantilla](../../glosario.md#expresion-en-plantilla)).
- `width="20" height="20"`: el tamaño, en píxeles. Con ellos el navegador reserva el hueco de
  20 × 20 antes de que llegue el archivo, y el texto de al lado no salta. El dibujo original mide
  720 × 720 unidades; mostrarlo más pequeño es el único cambio que permiten las normas de marca,
  y como es un SVG se ve nítido a cualquier tamaño.
- `alt=""`: texto alternativo **vacío**, a propósito. Dice al lector de pantalla que la imagen es
  decoración y que la salte ([imagen decorativa](../../glosario.md#imagen-decorativa)). Así el
  [nombre accesible](../../glosario.md#nombre-accesible) del enlace sigue siendo solo su texto,
  "Escríbenos", y no "WhatsApp Escríbenos" (AC2).
- `class="size-5 shrink-0"`:
  - `size-5` = `width: 1.25rem; height: 1.25rem` (20 px): el mismo tamaño también en CSS
    ([unidades](../../glosario.md#unidades-tailwind)).
  - `shrink-0` = `flex-shrink: 0`. Los enlaces que lo usan son cajas `flex`; si les falta
    espacio, el navegador puede encoger a sus hijos. Con `shrink-0` el icono nunca se aplasta.
- No usa `<Image />` de Astro ([image-component](../../glosario.md#image-component)): esa
  herramienta sirve para hacer versiones más pequeñas o en otro formato, y un SVG de 1 KB no lo
  necesita (spec 0011). Tampoco lleva `loading`: el icono de la cabecera se ve nada más abrir la
  página, así que debe descargarse ya, que es lo que hace un `<img>` sin ese atributo
  ([lazy loading](../../glosario.md#lazy-loading)).
- El hueco entre icono y texto no lo pone este componente: lo pone el enlace que lo contiene, con
  `gap-2` (8 px), como pide `design.md`.

## Cómo se conecta

- **Entra:** los dos archivos de `src/assets/icons/` y, opcionalmente, la prop `variant`.
- **Sale:** un `<img>` dentro de cada enlace que abre WhatsApp:
  - [`SiteHeader.astro`](SiteHeader.astro.md): `<WhatsAppIcon />`, verde, antes de "Escríbenos".
  - [`SiteFooter.astro`](SiteFooter.astro.md): `<WhatsAppIcon />`, verde sobre el pie oscuro,
    antes de "Escríbenos por WhatsApp".
  - [`src/pages/producto/[id].astro`](../pages/producto/%5Bid%5D.astro.md):
    `<WhatsAppIcon variant="white" />` en el botón "Pedir / Preguntar por WhatsApp".
  - [`src/pages/estilo.astro`](../pages/estilo.astro.md): en la muestra del enlace de contacto.
- **En `dist/`:** Astro escribe una copia de cada SVG en `dist/_astro/`, idéntica byte a byte a
  la de `src/assets/icons/` (AC8, comprobado con `cmp` el 2026-10-16).

## Prueba tú

Mira qué icono lleva cada enlace en la página de un producto, sin tocar código.

1. En la terminal de VS Code (Git Bash), ejecuta `WHATSAPP_NUMBER=5355555555 pnpm build`.
2. Ejecuta `grep -o "Digital_Glyph_[A-Za-z]*" dist/producto/arroz-blanco/index.html`.
   `grep -o` imprime solo el trozo que coincide, una vez por cada aparición.
3. **Qué verás**, en este orden (cabecera, botón, pie):
   ```text
   Digital_Glyph_Green
   Digital_Glyph_White
   Digital_Glyph_Green
   ```
   Con `dist/index.html` en vez de la página del producto salen solo dos `Digital_Glyph_Green`:
   la portada no tiene botón de pedido.
4. Comprueba que Astro no tocó el archivo:
   `cmp src/assets/icons/Digital_Glyph_Green_RGB_2026.svg dist/_astro/Digital_Glyph_Green_RGB_2026.*.svg`.
   No imprime nada: son iguales.
5. No hay nada que deshacer: el número del comando solo vale para ese comando. Vuelve a ejecutar
   `pnpm build` (que usará tu `.env`) si quieres el `dist/` con tu número.

## Términos

- [svg](../../glosario.md#svg) *(nuevo)* · [importar-imagen](../../glosario.md#importar-imagen)
  *(nuevo)* · [imagen-decorativa](../../glosario.md#imagen-decorativa) *(nuevo)*
- [frontmatter](../../glosario.md#frontmatter) · [build](../../glosario.md#build) ·
  [archivo-de-declaracion](../../glosario.md#archivo-de-declaracion)
- [props](../../glosario.md#props) · [astro-props](../../glosario.md#astro-props) ·
  [interface](../../glosario.md#interface) · [union](../../glosario.md#union) ·
  [jsdoc](../../glosario.md#jsdoc) · [valor-por-defecto](../../glosario.md#valor-por-defecto) ·
  [typecheck](../../glosario.md#typecheck)
- [expresion-en-plantilla](../../glosario.md#expresion-en-plantilla) ·
  [tailwind](../../glosario.md#tailwind) · [unidades-tailwind](../../glosario.md#unidades-tailwind)
- [image-component](../../glosario.md#image-component) ·
  [lazy-loading](../../glosario.md#lazy-loading)
- [nombre-accesible](../../glosario.md#nombre-accesible) ·
  [contraste-wcag](../../glosario.md#contraste-wcag)
