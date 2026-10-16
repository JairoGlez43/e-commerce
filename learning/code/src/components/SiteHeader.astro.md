# `src/components/SiteHeader.astro`

> **Qué es:** la cabecera del sitio: el toldo de rayas, el nombre de la tienda como enlace a la portada y el enlace "Escríbenos" a WhatsApp · **Lo decidió:** [spec 0005](../../../../docs/specs/0005-catalog-page.md) (Design → Components → SiteHeader, AC7) sobre el patrón Header de [spec 0002](../../../../docs/specs/0002-design-base.md) y [`design.md`](../../../../design.md); el enlace "Escríbenos", [spec 0010](../../../../docs/specs/0010-shop-information.md) (AC3) · **Lo usan:** [`src/pages/index.astro`](../pages/index.astro.md), [`src/pages/categoria/[id].astro`](../pages/categoria/%5Bid%5D.astro.md) y [`src/pages/producto/[id].astro`](../pages/producto/%5Bid%5D.astro.md) · **Usa:** [`src/lib/site.ts`](../lib/site.ts.md) (el nombre), `contactLink()` de [`src/lib/whatsapp.ts`](../lib/whatsapp.ts.md) y las clases de [`src/styles/global.css`](../styles/global.css.md) (`awning` y los tokens)

## Para qué sirve

Pinta la misma cabecera arriba de cada página de clientes: una franja de toldo (el "puesto
de mercado" de la tienda), el nombre de la tienda, que lleva a la portada `/`, y un enlace
"Escríbenos" para escribir a la tienda por WhatsApp desde cualquier página, sin tener que abrir
un producto. No recibe [props](../../glosario.md#props): el nombre lo lee de
`src/lib/site.ts`, el único sitio donde está escrito (AC7 de la spec 0005).

## El código, por partes

```astro
---
import { site } from '../lib/site';
import { contactLink } from '../lib/whatsapp';
---
```

- `---` abre y cierra el [frontmatter](../../glosario.md#frontmatter), el código que corre en
  el [build](../../glosario.md#build).
- `import { site } from '../lib/site';` trae el objeto `site` (con el nombre y el resto de la
  información de la tienda) de [`src/lib/site.ts`](../lib/site.ts.md). Las llaves sacan solo
  `site` de lo que exporta ese archivo. La ruta no lleva `.ts`: se puede omitir.
- `import { contactLink } from '../lib/whatsapp';` trae la función que arma el enlace de
  WhatsApp con un mensaje general ([explicación](../lib/whatsapp.ts.md)).
- No hay `interface Props` ni `Astro.props`: este componente no recibe nada. Si mañana cambia
  el nombre de la tienda, se cambia en `site.ts` y la cabecera de todas las páginas cambia
  sola.

```astro

<header class="border-b border-border bg-surface">
```

- `<header>` es la etiqueta HTML para la cabecera de la página. El lector de pantalla la
  reconoce como "banner" y permite saltar a ella (ver [accesibilidad](../../glosario.md#accesibilidad)).
- Las clases de [Tailwind](../../glosario.md#tailwind), en CSS plano:
  - `border-b` = `border-bottom-width: 1px` (una línea solo abajo). El estilo sólido ya lo pone
    el [reset de Tailwind](../../glosario.md#preflight).
  - `border-border` = `border-color: var(--color-border)`: esa línea en el beige decorativo. Se
    lee raro porque el token se llama `border`: `border-` (la propiedad) + `border` (el color).
  - `bg-surface` = `background-color: var(--color-surface)`: fondo blanco, que destaca sobre el
    crema de la página.

```astro
	<div class="awning" aria-hidden="true"></div>
```

- Un `<div>` vacío con la clase `awning`, definida en
  [`global.css`](../styles/global.css.md): 8 px de alto con rayas rojas y crema de 16 px. Va
  como primer hijo del `<header>`, así que queda pegado arriba del todo (así lo pide
  `design.md`).
- `aria-hidden="true"` lo oculta al lector de pantalla (ver
  [aria-hidden](../../glosario.md#aria-hidden)): es pura decoración, no hay nada que leer. El
  comentario de `.awning` en `global.css` pide justo esto.

```astro
	<div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
```

- Un contenedor que alinea el nombre con el contenido de la página y pone el nombre y
  "Escríbenos" en una fila. Sus clases, en dos grupos:
  - **Contenedor de página** (el mismo que usa `<main>`, `design.md` → Layout):
    - `mx-auto` = `margin-left: auto; margin-right: auto`: centra la caja horizontalmente.
    - `max-w-5xl` = `max-width: 64rem` (1024 px): en pantallas anchas no crece más (ver
      [unidades de Tailwind](../../glosario.md#unidades-tailwind)).
    - `px-4` = `padding-left` y `padding-right` de 16 px: aire a los lados, para que en el
      móvil el texto no toque el borde de la pantalla.
    - `py-3` = `padding-top` y `padding-bottom` de 12 px.
  - **La fila** (añadido por la spec 0010; antes la cabecera solo tenía el nombre y no le hacía
    falta):
    - `flex` = `display: flex`: los dos enlaces en fila.
    - `flex-wrap` = `flex-wrap: wrap`: si no caben en una fila, "Escríbenos" baja a una línea
      nueva en vez de salirse de la pantalla ([flex-wrap](../../glosario.md#flex-wrap)). Pasa
      en un móvil de 360 px de ancho: el nombre ocupa casi toda la fila y "Escríbenos" queda
      debajo, sin scroll horizontal (AC3).
    - `items-center` = `align-items: center`: los dos centrados en vertical.
    - `justify-between` = `justify-content: space-between`: el nombre a la izquierda y
      "Escríbenos" a la derecha, con el espacio sobrante en medio.
    - `gap-2` = 8 px entre los dos, tanto si están en la misma fila como uno debajo del otro.

```astro
		<a href="/" class="inline-flex min-h-11 items-center font-display text-2xl font-semibold">{site.name}</a>
```

- `<a href="/">`: un enlace a la portada. Es costumbre en la web que el nombre de la tienda
  lleve al inicio.
- `{site.name}` es una [expresión en plantilla](../../glosario.md#expresion-en-plantilla):
  escribe el nombre, hoy `Tienda de alimentos (demo)` (genérico a propósito, ver la
  [spec 0009](../../../../docs/specs/0009-site-identity.md)).
- No es un `h1`: cada página ya tiene su propio `h1` ("Productos" en la portada, el nombre de
  la categoría en `/categoria/<id>`, el del producto en `/producto/<id>`), y debe haber uno
  solo (ver [jerarquía de títulos](../../glosario.md#jerarquia-de-titulos)).
- Las clases, en dos grupos:
  - **Tamaño táctil:**
    - `inline-flex` = `display: inline-flex`. Un `<a>` es por defecto un elemento *en línea*
      (como una palabra dentro de un párrafo), y a esos el navegador **no les aplica** altura
      mínima. Con `inline-flex` se convierte en una caja que sí la acepta, sin dejar de ir en
      línea.
    - `min-h-11` = `min-height: 2.75rem` (44 px): el [área táctil](../../glosario.md#area-tactil)
      mínima del proyecto, para tocarlo con el dedo sin fallar.
    - `items-center` = `align-items: center`: centra el texto en vertical dentro de esos 44 px.
    - **Historia:** estas tres clases se añadieron el 2026-10-07. La spec 0005 pedía solo las
      de letra, y `/check verify` midió el enlace en **29 px** de alto, por debajo de los 44 px
      que exige el AC6. `design.md` ya recoge la versión corregida.
    - Desde la spec 0010 el contenedor es `flex`, y los hijos de un `flex` siempre se tratan
      como cajas, así que `min-h-11` ya se aplicaría sin `inline-flex`. Aun así `inline-flex`
      sigue haciendo falta: convierte el propio enlace en una caja flex, y sin eso
      `items-center` no centraría el texto dentro de él.
  - **Letra:**
    - `font-display` = `font-family: var(--font-fraunces)`: la fuente de títulos. Hay que
      ponerla a mano porque un `<a>` no es un `h1`–`h3`, y la regla de la capa `base` de
      `global.css` solo se aplica a títulos.
    - `text-2xl` = `font-size: 1.5rem` (24 px), con su interlineado.
    - `font-semibold` = `font-weight: 600`, el único grosor de Fraunces que se descarga.
- El color no se pone: el enlace hereda `ink` del `<body>`. Y el contorno de foco al llegar
  con Tab viene de la regla [`:focus-visible`](../../glosario.md#focus-visible) de
  `global.css`.

```astro
		<a
			href={contactLink()}
			class="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-border bg-surface px-4 font-medium text-ink hover:border-accent"
		>
			Escríbenos
		</a>
```

- `<a href={contactLink()}>`: el enlace "Escríbenos". `contactLink()` corre en el build y
  devuelve `https://wa.me/<número>?text=` más el mensaje `Hola, tengo una pregunta sobre la
  tienda.` ya codificado para la URL ([click-to-chat](../../glosario.md#click-to-chat)). Al
  tocarlo se abre WhatsApp con ese mensaje escrito. Va en la misma pestaña, sin `target`, y
  sin logo de WhatsApp (por las mismas razones que el botón de pedido, spec 0007).
- Las clases son las del **chip de categoría** sin seleccionar (ver
  [`CategoryNav.astro.md`](CategoryNav.astro.md)) más `font-medium`, así que parece un botón
  pequeño en forma de píldora:
  - `inline-flex min-h-11 items-center`: al menos 44 px de alto, texto centrado en vertical
    ([área táctil](../../glosario.md#area-tactil)), por la misma razón que el nombre.
  - `whitespace-nowrap` = `white-space: nowrap`: "Escríbenos" nunca se parte en dos líneas;
    si no cabe, baja entero gracias al `flex-wrap` del contenedor.
  - `rounded-full`: extremos totalmente redondos (píldora).
  - `border border-border`: borde de 1 px beige.
  - `bg-surface`: fondo blanco. `text-ink`: texto en el color principal.
  - `px-4`: 16 px de relleno a los lados.
  - `font-medium`: peso 500, un poco más marcado que el texto normal.
  - `hover:border-accent`: al pasar el ratón, el borde se vuelve rojo
    ([variante](../../glosario.md#variante)).
- `Escríbenos`: el texto del enlace, y también su [nombre accesible](../../glosario.md#nombre-accesible).

```astro
	</div>
</header>
```

- Cierran el contenedor y la cabecera.

## Cómo se conecta

- **Entra:** `site.name` de [`src/lib/site.ts`](../lib/site.ts.md); el enlace, de
  `contactLink()` en [`src/lib/whatsapp.ts`](../lib/whatsapp.ts.md), que lee el número de
  WhatsApp del entorno (si falta, el build se para); las clases salen de los tokens de
  [`src/styles/global.css`](../styles/global.css.md).
- **Sale:** se usa como `<SiteHeader />` (sin props), la primera cosa dentro de `<BaseLayout>`,
  en [`src/pages/index.astro`](../pages/index.astro.md),
  [`src/pages/categoria/[id].astro`](../pages/categoria/%5Bid%5D.astro.md) y
  [`src/pages/producto/[id].astro`](../pages/producto/%5Bid%5D.astro.md). `/estilo` no lo usa:
  tiene su propia cabecera de muestra, con buscador.
- El mismo enlace de WhatsApp sale abajo, en el pie de página
  ([`SiteFooter.astro`](SiteFooter.astro.md)), como "Escríbenos por WhatsApp".

## Prueba tú

Mira cómo `flex-wrap` baja "Escríbenos" en un móvil, sin tocar ningún archivo.

1. `pnpm dev` y abre `http://localhost:4321/`. En un ordenador, el nombre está a la izquierda
   y "Escríbenos" a la derecha, en la misma fila.
2. Abre DevTools (F12), pulsa el icono de seleccionar elemento y haz clic en "Escríbenos". En la
   pestaña **Computed**, mira `height`: 44 px, lo que pide `min-h-11`.
3. Activa la barra de dispositivos (`Ctrl+Shift+M`) y pon el ancho en `360`.
4. **Qué verás:** "Escríbenos" baja a una segunda línea, debajo del nombre, y la página no se
   mueve de lado (no hay scroll horizontal). Es el caso que pide el AC3 de la spec 0010.
5. Sube el ancho a `768`: los dos vuelven a la misma fila.
6. No hay nada que deshacer: cierra la barra de dispositivos con `Ctrl+Shift+M`.

## Términos

- [props](../../glosario.md#props)
- [frontmatter](../../glosario.md#frontmatter)
- [build](../../glosario.md#build)
- [accesibilidad](../../glosario.md#accesibilidad)
- [tailwind](../../glosario.md#tailwind)
- [preflight](../../glosario.md#preflight)
- [aria-hidden](../../glosario.md#aria-hidden)
- [unidades-tailwind](../../glosario.md#unidades-tailwind)
- [flex-wrap](../../glosario.md#flex-wrap) *(nuevo)*
- [expresion-en-plantilla](../../glosario.md#expresion-en-plantilla)
- [jerarquia-de-titulos](../../glosario.md#jerarquia-de-titulos)
- [area-tactil](../../glosario.md#area-tactil)
- [focus-visible](../../glosario.md#focus-visible)
- [click-to-chat](../../glosario.md#click-to-chat)
- [variante](../../glosario.md#variante)
- [nombre-accesible](../../glosario.md#nombre-accesible)
