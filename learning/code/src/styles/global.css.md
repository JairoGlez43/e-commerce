# `src/styles/global.css`

> **Qué es:** la hoja de estilos única del sitio · **Lo decidió:** [spec 0002](../../../../docs/specs/0002-design-base.md) (tokens, fuente, contraste) y [`design.md`](../../../../design.md) (reglas de uso) · **Lo usan:** [`src/layouts/BaseLayout.astro`](../layouts/BaseLayout.astro.md) (la importa una sola vez) y, a través de él, todas las páginas y componentes · **Usa:** [Tailwind](../../glosario.md#tailwind) v4 y la variable `--font-fraunces` que crea la fuente configurada en [`astro.config.mjs`](../../astro.config.mjs.md)

## Para qué sirve

Es el **único sitio donde viven los valores de diseño**: los colores, el radio de las esquinas,
la sombra y la fuente de títulos. El resto del proyecto los usa por nombre (`bg-accent`,
`text-ink`). Además pone los estilos por defecto de `body`, los títulos y el contorno de foco,
y define dos clases propias: `.price` y `.awning` (el toldo).

## El código, por partes

```css
@import "tailwindcss";
```

- Trae todo Tailwind a este archivo. Es un `@import` de CSS normal, pero el plugin de Tailwind
  (conectado en `astro.config.mjs` a través de [Vite](../../glosario.md#vite)) lo intercepta
  durante el [build](../../glosario.md#build): en vez de copiar un CSS enorme, mira qué clases
  aparecen en tus archivos y genera solo esas.
- Este `@import` también trae el **reset** de Tailwind, unos estilos que "limpian" lo que el
  navegador pone por defecto (ver [preflight](../../glosario.md#preflight)). Por eso, por ejemplo,
  las listas `<ul>` del proyecto no muestran viñetas.

```css
/* Design tokens (spec 0002). The only place raw values live; everything else uses token names. */
@theme {
  --color-*: initial;
```

- El comentario dice: "Tokens de diseño (spec 0002). El único sitio donde viven los valores
  crudos; todo lo demás usa los nombres de los tokens". Un [token](../../glosario.md#token) es un
  valor de diseño con nombre. "Valor crudo" es el valor escrito tal cual, como `#B03A24`.
- `@theme {` abre el bloque de [theme](../../glosario.md#theme): cada variable que se declara
  dentro crea **dos cosas a la vez**: una [variable CSS](../../glosario.md#variable-css) normal
  (`var(--color-accent)`) y las clases de Tailwind con ese nombre (`bg-accent`, `text-accent`,
  `border-accent`…).
- `--color-*: initial;` borra **toda** la paleta de colores que trae Tailwind (`red-500`,
  `blue-200`…). El `*` significa "todas las variables que empiezan por `--color-`". Desde aquí,
  solo existen los colores de este archivo: si alguien escribe `bg-red-500`, no genera nada
  (AC1 de la spec 0002). Así nadie puede salirse de la paleta sin querer.

```css
  --color-cream: #FBF6EE;        /* page background */
  --color-surface: #FFFFFF;      /* cards, chips, inputs */
  --color-ink: #2B211C;          /* main text */
  --color-muted: #6A5B50;        /* secondary text, format line */
  --color-border: #E6DACB;       /* card borders, dividers (decorative) */
  --color-accent: #B03A24;       /* prices, primary button, selected chip, focus ring */
  --color-accent-hover: #8E2E1C; /* primary button hover/active */
  --color-olive: #4D6A26;        /* "available" text and dot */
  --color-olive-soft: #EEF2E3;   /* "available" badge background */
  --color-unavailable: #7A6D64;  /* "unavailable" text */
  --color-awning: #F4E3D3;       /* light stripe of the awning */
```

Las 11 líneas siguen el mismo patrón: `--color-<nombre>: <valor>;` crea el color `<nombre>` y
con él las clases `bg-<nombre>` (fondo), `text-<nombre>` (color de letra) y
`border-<nombre>` (color de borde). El comentario de cada línea dice dónde se usa:

- `cream` (`#FBF6EE`): "fondo de la página". Un crema claro en vez de blanco; es uno de los
  toques propios que pide la spec 0002 para no parecer una copia de Mercadona.
- `surface` (`#FFFFFF`, blanco): "tarjetas, chips, campos de texto". También es el color del
  texto sobre fondo `accent` (el chip seleccionado).
- `ink` (`#2B211C`, marrón casi negro): "texto principal".
- `muted` (`#6A5B50`): "texto secundario, línea de formato" (por ejemplo "Paquete 500 g").
- `border` (`#E6DACB`): "bordes de tarjetas, separadores (decorativo)". *Decorativo* porque
  contrasta poco con el blanco (1,38 a 1, según la tabla de la spec): nunca puede ser lo único
  que indique que algo es un botón o un enlace.
- `accent` (`#B03A24`, rojo teja): "precios, botón principal, chip seleccionado, anillo de
  foco".
- `accent-hover` (`#8E2E1C`): "botón principal al pasar el ratón / al pulsarlo", un tono más
  oscuro del anterior.
- `olive` (`#4D6A26`): "texto y punto de 'disponible'".
- `olive-soft` (`#EEF2E3`): "fondo de la etiqueta 'disponible'".
- `unavailable` (`#7A6D64`): "texto de 'agotado'".
- `awning` (`#F4E3D3`): "franja clara del toldo".

Estos valores no son al azar: la spec 0002 comprobó que cada par texto/fondo que se usa cumple
el [contraste WCAG AA](../../glosario.md#contraste-wcag) (al menos 4,5 a 1), para que se lea
bien incluso con poca vista o con el sol en la pantalla del móvil.

```css

  --radius-card: 0.75rem;
  --shadow-card: 0 1px 2px rgb(43 33 28 / 0.06), 0 2px 8px rgb(43 33 28 / 0.06);
}
```

- La línea en blanco solo separa los colores del resto, para leer mejor.
- `--radius-card: 0.75rem;` crea el token de radio `card` y la clase `rounded-card`
  (`border-radius: 0.75rem`, es decir 12 px, porque 1 rem = 16 px). Lo usan las tarjetas de
  producto.
- `--shadow-card: …;` crea la clase `shadow-card`. Son **dos sombras** separadas por coma: una
  corta y pegada (baja 1 px, difumina 2 px) y otra más amplia (baja 2 px, difumina 8 px). Las
  dos usan `rgb(43 33 28 / 0.06)`: el mismo marrón que `ink` (`#2B211C` = 43, 33, 28) con solo un
  6 % de opacidad (lo que va tras la `/`). Resultado: una sombra muy suave y cálida, no gris.
- `}` cierra el bloque `@theme`.

```css
@theme inline {
  --font-display: var(--font-fraunces);
}
```

- Un segundo bloque, esta vez con [`@theme inline`](../../glosario.md#theme-inline). Crea el
  token de fuente `display` y la clase `font-display`.
- `--font-display: var(--font-fraunces);` dice "la fuente `display` es la que haya en la
  variable `--font-fraunces`". Esa variable no la escribimos nosotros: la crea Astro a partir
  de la fuente Fraunces configurada en `astro.config.mjs` (ver
  [Fonts API](../../glosario.md#fonts-api)).
- ¿Por qué `inline`? La spec 0002 lo pide cuando un token **apunta a otra variable**, como
  aquí. Con `inline`, Tailwind escribe el valor directamente dentro de la clase
  (`font-family: var(--font-fraunces)`) en lugar de una variable que apunta a otra variable.
- La fuente normal del texto, `font-sans`, no aparece en este archivo: se queda con la de
  Tailwind, que es la [pila de fuentes del sistema](../../glosario.md#pila-de-fuentes-del-sistema).
  No descarga nada.

```css
@layer base {
  body {
    @apply bg-cream text-ink font-sans;
  }
```

- `@layer base {` abre la capa `base` (ver [layer y apply](../../glosario.md#layer-y-apply)):
  estilos por defecto para etiquetas. Cualquier clase de utilidad que pongas en el HTML les
  gana.
- `body { … }` es una regla CSS normal para la etiqueta `<body>`.
- `@apply bg-cream text-ink font-sans;` copia aquí el CSS de esas tres clases. En CSS plano
  equivale a: `background-color: var(--color-cream); color: var(--color-ink);` y `font-family`
  con la pila de fuentes del sistema. Como el color y la fuente se heredan, todo el texto de la
  página sale en `ink` y en fuente del sistema salvo que algo diga lo contrario.
- `}` cierra la regla de `body` (la capa sigue abierta).

```css

  h1,
  h2,
  h3 {
    @apply font-display font-semibold;
  }

  h1 {
    @apply text-3xl;
  }

  h2 {
    @apply text-2xl;
  }

  h3 {
    @apply text-xl;
  }
```

- `h1, h2, h3 { @apply font-display font-semibold; }`: los tres niveles de título usan la fuente
  Fraunces (`font-display` = `font-family: var(--font-fraunces)`) con grosor 600
  (`font-semibold` = `font-weight: 600`). Solo existe el archivo de Fraunces en grosor 600, por
  eso nunca se usa otro grosor con esta fuente (`design.md`: "una sola fuente, un solo
  archivo").
- `h1 { @apply text-3xl; }`: tamaño de letra 30 px (1,875 rem), con un interlineado a juego.
- `h2 { @apply text-2xl; }`: 24 px (1,5 rem).
- `h3 { @apply text-xl; }`: 20 px (1,25 rem).
- Son tamaños pensados para móvil primero (spec 0002). Como están en la capa `base`, un título
  concreto puede cambiarlos con una clase: la tarjeta de producto lo hace para que el nombre
  salga en letra normal (excepción del AC2 de la spec 0002).

```css

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}
```

- `:focus-visible { … }`: el contorno que aparece cuando llegas a un enlace con el teclado
  (ver [focus-visible](../../glosario.md#focus-visible)). Sin etiqueta delante, vale para
  **cualquier** elemento.
- `outline: 2px solid var(--color-accent);`: una línea de 2 px, continua, en el rojo `accent`.
  Aquí se usa CSS puro con `var(...)` en vez de `@apply`; el efecto es el mismo: usa el token.
- `outline-offset: 2px;`: separa ese contorno 2 px del borde del elemento, para que no se pegue
  al texto y se vea claro.
- El primer `}` cierra la regla; el segundo cierra `@layer base`.

```css

@layer components {
  .price {
    @apply font-display font-semibold text-xl text-accent;
  }
```

- `@layer components {` abre otra capa, para **clases propias reutilizables** (ver
  [layer components](../../glosario.md#layer-components)). Va por encima de `base` pero por
  debajo de las clases de utilidad: si escribes `class="price text-ink"`, gana `text-ink`.
- `.price { … }`: la clase de los precios. `@apply font-display font-semibold text-xl
  text-accent` = fuente Fraunces, grosor 600, 20 px, color rojo `accent`. Se crea como clase
  porque todos los precios deben verse iguales y así se escribe una sola palabra en el HTML.
  El número en sí lo formatea `formatPrice()` de [`src/lib/price.ts`](../lib/price.ts.md).

```css

  /* Market-stall awning strip. Decorative: the element carries aria-hidden="true". */
  .awning {
    @apply h-2;
    background: repeating-linear-gradient(
      90deg,
      var(--color-accent) 0 16px,
      var(--color-awning) 16px 32px
    );
  }
}
```

- El comentario dice: "Franja de toldo de puesto de mercado. Decorativa: el elemento lleva
  `aria-hidden="true"`". Es un recordatorio para quien la use: el `<div>` del toldo debe ocultarse
  al lector de pantalla (ver [aria-hidden](../../glosario.md#aria-hidden)), porque no transmite
  información. [`SiteHeader.astro`](../components/SiteHeader.astro.md) lo cumple, y también la
  franja que abre la banda de información de [`index.astro`](../pages/index.astro.md) (spec 0011).
- `.awning {`: la clase del toldo. Es el "toque propio" que representa el puesto de mercado
  de la tienda (spec 0002).
- `@apply h-2;`: `height: 0.5rem` = 8 px de alto (ver
  [unidades de Tailwind](../../glosario.md#unidades-tailwind)).
- `background: repeating-linear-gradient(` … `);`: CSS puro. Un *degradado lineal que se
  repite*. Se lee así:
  - `90deg`: avanza de izquierda a derecha.
  - `var(--color-accent) 0 16px`: de 0 a 16 px, rojo `accent`.
  - `var(--color-awning) 16px 32px`: de 16 a 32 px, el crema `awning`.
  - Como cada color empieza justo donde acaba el otro, no hay mezcla: salen rayas nítidas de
    16 px. Al llegar a 32 px el patrón se repite hasta llenar todo el ancho. Son rayas hechas
    solo con CSS: ninguna imagen que descargar.
- El primer `}` cierra `.awning`; el último cierra `@layer components`.

## Cómo se conecta

- **Entra:** Tailwind (vía `@import`) y la variable `--font-fraunces`, que Astro crea con la
  fuente declarada en [`astro.config.mjs`](../../astro.config.mjs.md) y que
  [`BaseLayout.astro`](../layouts/BaseLayout.astro.md) publica con `<Font … />`.
- **Sale:** [`BaseLayout.astro`](../layouts/BaseLayout.astro.md) lo importa una sola vez
  (`import '../styles/global.css';`), así que llega a todas las páginas que usan ese layout.
  Las clases que genera (`bg-surface`, `border-border`, `bg-accent`, `font-display`,
  `rounded-card`, `shadow-card`, `price`, `awning`…) las usan
  [`SiteHeader.astro`](../components/SiteHeader.astro.md),
  [`CategoryNav.astro`](../components/CategoryNav.astro.md),
  [`ProductCard.astro`](../components/ProductCard.astro.md) y las páginas de `src/pages/`.
- **La regla:** [`design.md`](../../../../design.md) prohíbe colores, fuentes o sombras fuera de
  este archivo. La página `/estilo` ([`src/pages/estilo.astro`](../pages/estilo.astro.md))
  muestra todos estos tokens en vivo.

## Prueba tú

Cambia el color de acento y mira cuántas cosas cambian a la vez.

1. Arranca el [servidor de desarrollo](../../glosario.md#servidor-de-desarrollo): `pnpm dev`, y
   abre `http://localhost:4321/estilo`.
2. En este archivo, cambia la línea
   `--color-accent: #B03A24;` por `--color-accent: #1F5FAD;` (un azul) y guarda.
3. **Qué verás:** sin recargar, los precios, el chip seleccionado, el botón principal, las
   rayas del toldo y el contorno de foco (pulsa Tab) pasan a azul. Un solo cambio, todo el
   sitio: para eso sirven los tokens.
4. **Deshacer:** vuelve a escribir `#B03A24` y guarda. (Este archivo aún no está en un commit de
   git, así que no confíes en `git checkout` para restaurarlo: escribe el valor a mano o usa
   Ctrl+Z en el editor.)

## Términos

- [tailwind](../../glosario.md#tailwind)
- [vite](../../glosario.md#vite)
- [build](../../glosario.md#build)
- [preflight](../../glosario.md#preflight) *(nuevo)*
- [token](../../glosario.md#token)
- [theme](../../glosario.md#theme)
- [theme-inline](../../glosario.md#theme-inline) *(nuevo)*
- [variable-css](../../glosario.md#variable-css)
- [fonts-api](../../glosario.md#fonts-api) *(nuevo)*
- [pila-de-fuentes-del-sistema](../../glosario.md#pila-de-fuentes-del-sistema) *(nuevo)*
- [contraste-wcag](../../glosario.md#contraste-wcag) *(nuevo)*
- [layer-y-apply](../../glosario.md#layer-y-apply)
- [layer-components](../../glosario.md#layer-components) *(nuevo)*
- [focus-visible](../../glosario.md#focus-visible)
- [aria-hidden](../../glosario.md#aria-hidden)
- [unidades-tailwind](../../glosario.md#unidades-tailwind)
- [servidor-de-desarrollo](../../glosario.md#servidor-de-desarrollo)
