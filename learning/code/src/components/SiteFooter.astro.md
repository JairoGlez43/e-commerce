# `src/components/SiteFooter.astro`

> **Qué es:** el pie de página oscuro: nombre de la tienda, municipio, horario y el enlace "Escríbenos por WhatsApp" con su icono · **Lo decidió:** [spec 0010](../../../../docs/specs/0010-shop-information.md) (AC6 y Design → Footer); el fondo oscuro y el icono, [spec 0011](../../../../docs/specs/0011-visual-polish.md) (AC2, AC4 y Design → Footer); y [`design.md`](../../../../design.md) (SiteFooter) · **Lo usan:** [`src/pages/index.astro`](../pages/index.astro.md), [`src/pages/categoria/[id].astro`](../pages/categoria/%5Bid%5D.astro.md), [`src/pages/producto/[id].astro`](../pages/producto/%5Bid%5D.astro.md) y [`src/pages/estilo.astro`](../pages/estilo.astro.md) (como muestra) · **Usa:** [`src/lib/site.ts`](../lib/site.ts.md) (`name`, `location`, `hours`), `contactLink()` de [`src/lib/whatsapp.ts`](../lib/whatsapp.ts.md), [`WhatsAppIcon.astro`](WhatsAppIcon.astro.md) (el icono) y los tokens de [`src/styles/global.css`](../styles/global.css.md)

## Para qué sirve

Es el último sitio donde busca quien ha bajado hasta el final y no encontró lo que quería:
dónde está la tienda, cuándo abre y cómo escribirle. Sale igual en todas las páginas de
clientes, también en las de categoría y de producto, que no tienen la sección "Cómo comprar".
Solo habla de la tienda: no lleva el nombre de quien hizo la web (AC6 de la spec 0010).

Desde la spec 0011 es **oscuro** (elección del dueño): fondo marrón casi negro (`ink`) y texto
crema. Así cierra la página con un bloque que se distingue del resto, y su enlace a WhatsApp
lleva el icono oficial.

## El código, por partes

```astro
---
import { site } from '../lib/site';
import { contactLink } from '../lib/whatsapp';
import WhatsAppIcon from './WhatsAppIcon.astro';

// Footer on every customer page (spec 0010). About the shop only: no developer credit.
// Dark since spec 0011: ink background, cream text; the default accent focus ring is too faint
// on ink (2.60:1), so the link uses a cream one.
---
```

- `---` abre y cierra el [frontmatter](../../glosario.md#frontmatter), que corre en el
  [build](../../glosario.md#build).
- `import { site } from '../lib/site';`: nombre, municipio y horario
  ([explicación](../lib/site.ts.md)).
- `import { contactLink } from '../lib/whatsapp';`: la función que arma el enlace de WhatsApp
  con un mensaje general ([explicación](../lib/whatsapp.ts.md)).
- `import WhatsAppIcon from './WhatsAppIcon.astro';`: el icono oficial de WhatsApp
  ([explicación](WhatsAppIcon.astro.md)). `./` es "esta misma carpeta", `src/components/`.
- El comentario: "Pie en cada página de clientes (spec 0010). Solo sobre la tienda: sin crédito
  del desarrollador. Oscuro desde la spec 0011: fondo `ink`, texto `cream`; el contorno de foco
  `accent` de siempre se ve demasiado poco sobre `ink` (2,60 a 1), así que el enlace usa uno
  `cream`." Lo de "2,60 a 1" es una medida de [contraste](../../glosario.md#contraste-wcag); se
  explica en el bloque 4.
- No recibe [props](../../glosario.md#props).

```astro

<footer class="bg-ink text-cream">
	<div class="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm">
```

- `<footer>`: la etiqueta HTML del pie de página; el lector de pantalla la reconoce como tal
  ([accesibilidad](../../glosario.md#accesibilidad)). Clases:
  - `bg-ink` = `background-color: var(--color-ink)`: fondo en `ink`, el marrón casi negro que en
    el resto del sitio es el color del texto ([token](../../glosario.md#token)).
  - `text-cream` = `color: var(--color-cream)`: todo el texto de dentro en `cream`, el crema del
    fondo de las páginas. Es el color al revés que en el resto del sitio, y se lee de sobra:
    14,60 a 1 ([contraste](../../glosario.md#contraste-wcag), AC5 de la spec 0011).
  - El `<footer>` no está dentro del contenedor de página, así que su fondo oscuro llega de un
    borde de la pantalla al otro ([banda a todo el ancho](../../glosario.md#banda-a-todo-el-ancho)).
  - **Historia:** hasta la spec 0011 llevaba `mt-12 border-t border-border bg-surface`: 48 px
    de margen arriba, una línea beige y fondo blanco. Se quitó el margen para que el pie quede
    pegado a lo de encima: en la portada, a la banda de información, sin una franja crema en
    medio (AC4). Ese aire lo ponen ahora las páginas de categoría y de producto, que terminan su
    `<main>` con `pb-12` (48 px de relleno abajo). La línea ya no hace falta: el cambio de
    color basta para separar.
- `<div class="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm">`: el contenido,
  alineado con el resto de la página (no cambió con la spec 0011):
  - `mx-auto max-w-5xl px-4`: el mismo "contenedor de página" que `<main>` y la cabecera:
    centrado, como mucho 1024 px, 16 px a los lados.
  - `flex flex-col gap-2`: las líneas en columna, 8 px entre ellas.
  - `py-8`: 32 px arriba y abajo.
  - `text-sm`: todo el texto a 14 px ([escala de texto](../../glosario.md#escala-de-texto)),
    menos lo que diga otra cosa (el nombre, abajo).

```astro
		<p class="font-display text-xl font-semibold">{site.name}</p>
		<p>{site.location}</p>
```

- `<p class="font-display text-xl font-semibold">{site.name}</p>`: el nombre de la tienda en
  Fraunces (`font-display`), 20 px (`text-xl`) y peso 600 (`font-semibold`). Es un `<p>` y no
  un título: la página ya tiene sus títulos y el pie no debe meterse en esa jerarquía
  ([jerarquía de títulos](../../glosario.md#jerarquia-de-titulos)). Por eso las clases de
  letra se ponen a mano.
- `<p>{site.location}</p>`: `La Lisa, La Habana`.

```astro
		<ul>
			{
				site.hours.map(({ days, time }) => (
					<li>
						{days}: {time}
					</li>
				))
			}
		</ul>
```

- El horario, una línea por objeto de `site.hours`
  ([map](../../glosario.md#array-map),
  [desestructuración](../../glosario.md#desestructuracion)). Es el mismo código que en
  [`ShopInfo.astro`](ShopInfo.astro.md): escribe `Lunes a sábado: 9:00 a.m. – 6:00 p.m.` y
  `Domingo: 9:00 a.m. – 1:00 p.m.`. Las viñetas del `<ul>` las quita el
  [reset de Tailwind](../../glosario.md#preflight).

```astro
		<a
			href={contactLink()}
			class="inline-flex min-h-11 w-fit items-center gap-2 font-medium text-cream underline underline-offset-4 hover:text-awning focus-visible:outline-cream"
		>
			<WhatsAppIcon />
			Escríbenos por WhatsApp
		</a>
	</div>
</footer>
```

- `<a href={contactLink()}>`: el enlace a WhatsApp. `contactLink()` se ejecuta en el build y
  devuelve `https://wa.me/<número>?text=Hola%2C%20tengo%20una%20pregunta%20sobre%20la%20tienda.`
  ([click-to-chat](../../glosario.md#click-to-chat)). Es el mismo `href` que el "Escríbenos" de
  la [cabecera](SiteHeader.astro.md). Va en la misma pestaña, sin `target` (spec 0007).
- Las clases:
  - `inline-flex min-h-11 items-center`: el enlace mide al menos 44 px de alto con el icono y
    el texto centrados en vertical ([área táctil](../../glosario.md#area-tactil)). Hace falta
    `inline-flex` porque un `<a>` normal ignora `min-height`.
  - `w-fit` = `width: fit-content`: solo tan ancho como su contenido. Sin esto, dentro de la
    columna flex se estiraría a todo el ancho, y tocar el espacio vacío a su derecha también
    abriría WhatsApp.
  - `gap-2`: 8 px entre el icono y el texto.
  - `font-medium`: peso 500.
  - `text-cream`: el texto en crema, como el resto del pie.
  - `underline` = `text-decoration-line: underline`: subrayado. Antes el enlace se distinguía
    del texto por ser rojo; sobre el fondo oscuro, el rojo `accent` se lee mal, así que ahora se
    distingue por el subrayado (spec 0011).
  - `underline-offset-4` = `text-underline-offset: 4px`: baja el subrayado 4 px, para que no
    toque las letras con rabito (la `p` de "por").
  - `hover:text-awning`: al pasar el ratón, el texto cambia al tono claro del toldo (`awning`)
    ([variante](../../glosario.md#variante)). Sobre `ink` se lee igual de bien: 12,55 a 1.
  - `focus-visible:outline-cream`: cuando llegas al enlace con Tab, su contorno de foco sale en
    crema en vez de en rojo ([outline](../../glosario.md#outline),
    [focus-visible](../../glosario.md#focus-visible)). El contorno rojo `accent` de
    `global.css` tiene sobre `ink` un [contraste](../../glosario.md#contraste-wcag) de solo
    2,60 a 1, y un indicador de foco necesita al menos 3 a 1 (según la spec 0011): quien navega
    con teclado no vería bien dónde está. El crema sí se ve.
- `<WhatsAppIcon />`: el icono oficial, en su variante verde, antes del texto
  ([explicación](WhatsAppIcon.astro.md)). El verde de WhatsApp sobre `ink` tiene 7,92 a 1
  (según la spec). Lleva `alt=""`, así que no cambia el nombre del enlace
  ([imagen decorativa](../../glosario.md#imagen-decorativa)).
- `Escríbenos por WhatsApp`: el texto, que dice a dónde lleva (AC6 de la spec 0010), y el
  [nombre accesible](../../glosario.md#nombre-accesible) del enlace.
- `</div>`, `</footer>`: cierran el contenido y el pie.

## Cómo se conecta

- **Entra:** `site.name`, `site.location` y `site.hours` de [`src/lib/site.ts`](../lib/site.ts.md),
  y el enlace de `contactLink()` ([`src/lib/whatsapp.ts`](../lib/whatsapp.ts.md)), que a su vez
  lee la [variable de entorno](../../glosario.md#variable-de-entorno) `WHATSAPP_NUMBER`. Si
  falta, el build se para. El icono, de [`WhatsAppIcon.astro`](WhatsAppIcon.astro.md).
- **Sale:** se usa como `<SiteFooter />` justo después de `</main>`, la última cosa dentro de
  `<BaseLayout>`, en las tres páginas de clientes:
  [`index.astro`](../pages/index.astro.md),
  [`categoria/[id].astro`](../pages/categoria/%5Bid%5D.astro.md) y
  [`producto/[id].astro`](../pages/producto/%5Bid%5D.astro.md). También en
  [`/estilo`](../pages/estilo.astro.md), como muestra.

## Prueba tú

Mira el pie ya construido en una página de categoría, sin tocar código.

1. En la terminal de VS Code (Git Bash), ejecuta `WHATSAPP_NUMBER=5355555555 pnpm build`.
2. Abre `dist/categoria/aseo/index.html` en VS Code y busca `<footer`.
3. **Qué deberías ver:** la etiqueta de apertura es `<footer class="bg-ink text-cream">`;
   dentro, `La Lisa, La Habana`, las dos líneas de horario y un enlace con
   `href="https://wa.me/5355555555?text=Hola%2C%20tengo%20una%20pregunta%20sobre%20la%20tienda."`.
   Busca ahora `wa.me` en todo el archivo: aparece también en la cabecera, con el mismo
   mensaje.
4. No hay nada que deshacer: el número del comando solo vale para ese comando. Vuelve a ejecutar
   `pnpm build` (que usará tu `.env`) si quieres el `dist/` con tu número.

## Términos

- [frontmatter](../../glosario.md#frontmatter) · [build](../../glosario.md#build) ·
  [props](../../glosario.md#props)
- [click-to-chat](../../glosario.md#click-to-chat) ·
  [variable-de-entorno](../../glosario.md#variable-de-entorno)
- [array-map](../../glosario.md#array-map) · [desestructuracion](../../glosario.md#desestructuracion)
- [unidades-tailwind](../../glosario.md#unidades-tailwind) ·
  [escala-de-texto](../../glosario.md#escala-de-texto) · [variante](../../glosario.md#variante) ·
  [preflight](../../glosario.md#preflight)
- [accesibilidad](../../glosario.md#accesibilidad) · [area-tactil](../../glosario.md#area-tactil) ·
  [jerarquia-de-titulos](../../glosario.md#jerarquia-de-titulos) ·
  [nombre-accesible](../../glosario.md#nombre-accesible)
- [token](../../glosario.md#token) · [contraste-wcag](../../glosario.md#contraste-wcag) ·
  [focus-visible](../../glosario.md#focus-visible) · [outline](../../glosario.md#outline)
  *(nuevo)* · [banda-a-todo-el-ancho](../../glosario.md#banda-a-todo-el-ancho) *(nuevo)* ·
  [imagen-decorativa](../../glosario.md#imagen-decorativa) *(nuevo)*
