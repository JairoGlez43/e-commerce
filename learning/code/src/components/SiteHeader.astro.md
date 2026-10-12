# `src/components/SiteHeader.astro`

> **Qué es:** la cabecera del sitio: el toldo de rayas y el nombre de la tienda como enlace a la portada · **Lo decidió:** [spec 0005](../../../../docs/specs/0005-catalog-page.md) (Design → Components → SiteHeader, AC7) sobre el patrón Header de [spec 0002](../../../../docs/specs/0002-design-base.md) y [`design.md`](../../../../design.md) · **Lo usan:** [`src/pages/index.astro`](../pages/index.astro.md) y [`src/pages/categoria/[id].astro`](../pages/categoria/[id].astro.md) · **Usa:** [`src/lib/site.ts`](../lib/site.ts.md) (el nombre) y las clases de [`src/styles/global.css`](../styles/global.css.md) (`awning` y los tokens)

## Para qué sirve

Pinta la misma cabecera arriba de cada página del catálogo: una franja de toldo (el "puesto
de mercado" de la tienda) y el nombre de la tienda, que lleva a la portada `/`. No recibe
[props](../../glosario.md#props): el nombre lo lee de `src/lib/site.ts`, el único sitio donde
está escrito (AC7 de la spec 0005).

## El código, por partes

```astro
---
import { site } from '../lib/site';
---
```

- `---` abre y cierra el [frontmatter](../../glosario.md#frontmatter), el código que corre en
  el [build](../../glosario.md#build).
- `import { site } from '../lib/site';` trae el objeto `site` (con `name` y `description`) de
  [`src/lib/site.ts`](../lib/site.ts.md). Las llaves sacan solo `site` de lo que exporta ese
  archivo. La ruta no lleva `.ts`: se puede omitir.
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
	<div class="mx-auto max-w-5xl px-4 py-3">
```

- Un contenedor que alinea el nombre con el contenido de la página. Es el mismo "contenedor de
  página" que usa `<main>` (`design.md` → Layout). Sus clases:
  - `mx-auto` = `margin-left: auto; margin-right: auto`: centra la caja horizontalmente.
  - `max-w-5xl` = `max-width: 64rem` (1024 px): en pantallas anchas no crece más (ver
    [unidades de Tailwind](../../glosario.md#unidades-tailwind)).
  - `px-4` = `padding-left` y `padding-right` de 16 px: aire a los lados, para que en el móvil
    el texto no toque el borde de la pantalla.
  - `py-3` = `padding-top` y `padding-bottom` de 12 px.
- La spec 0005 aclara que aquí no hace falta `flex`: en `/estilo`, la cabecera de muestra pone
  el nombre y un buscador en fila, pero esta cabecera no tiene buscador.

```astro
		<a href="/" class="inline-flex min-h-11 items-center font-display text-2xl font-semibold">{site.name}</a>
```

- `<a href="/">`: un enlace a la portada. Es costumbre en la web que el nombre de la tienda
  lleve al inicio.
- `{site.name}` es una [expresión en plantilla](../../glosario.md#expresion-en-plantilla):
  escribe el nombre, hoy `Tienda de alimentos (demo)` (genérico a propósito, ver la
  [spec 0009](../../../../docs/specs/0009-site-identity.md)).
- No es un `h1`: cada página ya tiene su propio `h1` ("Productos" en la portada, el nombre de
  la categoría en `/categoria/<id>`), y debe haber uno solo (ver
  [jerarquía de títulos](../../glosario.md#jerarquia-de-titulos)).
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
	</div>
</header>
```

- Cierran el contenedor y la cabecera.

## Cómo se conecta

- **Entra:** `site.name` de [`src/lib/site.ts`](../lib/site.ts.md); las clases salen de los
  tokens de [`src/styles/global.css`](../styles/global.css.md).
- **Sale:** se usa como `<SiteHeader />` (sin props), la primera cosa dentro de `<BaseLayout>`,
  en [`src/pages/index.astro`](../pages/index.astro.md) y
  [`src/pages/categoria/[id].astro`](../pages/categoria/[id].astro.md). `/estilo` no lo usa:
  tiene su propia cabecera de muestra, con buscador.

## Prueba tú

Comprueba por qué hacía falta `min-h-11`.

1. `pnpm dev` y abre `http://localhost:4321/`.
2. Abre DevTools (F12), pulsa el icono de seleccionar elemento y haz clic en el nombre de la
   tienda. En la pestaña **Computed**, mira `height`: unos 44 px.
3. Borra ` min-h-11` del `class` del enlace y guarda.
4. **Qué verás:** la altura baja a unos 29 px, la medida que encontró `/check verify`. Prueba
   también a quitar solo `inline-flex` (dejando `min-h-11`): la altura tampoco llega a 44 px,
   porque un elemento en línea ignora `min-height`.
5. **Deshacer:** vuelve a dejar la clase exactamente así y guarda:
   `inline-flex min-h-11 items-center font-display text-2xl font-semibold`.

## Términos

- [props](../../glosario.md#props)
- [frontmatter](../../glosario.md#frontmatter)
- [build](../../glosario.md#build)
- [accesibilidad](../../glosario.md#accesibilidad)
- [tailwind](../../glosario.md#tailwind)
- [preflight](../../glosario.md#preflight) *(nuevo)*
- [aria-hidden](../../glosario.md#aria-hidden)
- [unidades-tailwind](../../glosario.md#unidades-tailwind)
- [expresion-en-plantilla](../../glosario.md#expresion-en-plantilla)
- [jerarquia-de-titulos](../../glosario.md#jerarquia-de-titulos)
- [area-tactil](../../glosario.md#area-tactil)
- [focus-visible](../../glosario.md#focus-visible)
