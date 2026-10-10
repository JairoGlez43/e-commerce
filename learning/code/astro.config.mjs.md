# `astro.config.mjs`

> **Qué es:** la configuración de Astro: activa Tailwind y declara la fuente de los títulos ·
> **Lo decidió:** [spec 0001 · Stack](../../docs/specs/0001-stack.md) (Tailwind, valores por
> defecto) y [spec 0002 · Base de diseño](../../docs/specs/0002-design-base.md) (la fuente
> Fraunces) · **Lo usan:** Astro, cada vez que arranca `pnpm dev`, `pnpm build` o
> `pnpm typecheck` · **Usa:** `astro/config`, `@tailwindcss/vite` y el archivo
> `src/assets/fonts/fraunces-latin-600-normal.woff2`.

## Para qué sirve

Astro funciona sin configuración, pero este proyecto necesita dos cosas más: que
[Tailwind](glosario.md#tailwind) procese el CSS, y una [fuente web](glosario.md#fuente-web)
para títulos y precios que se sirva desde el propio sitio, sin pedir nada a Google Fonts ni a
ningún otro servidor. Las dos se declaran aquí.

## El código, por partes

```js
// @ts-check
```

- Un comentario especial: [`// @ts-check`](glosario.md#ts-check). Pide a TypeScript que
  revise este archivo JavaScript como si fuera TypeScript. Si escribes mal una opción (por
  ejemplo `fallback` en vez de `fallbacks`), VS Code la subraya y `pnpm typecheck` falla.

```js
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
```

- Línea 1: importa dos cosas de `astro/config` (la parte de la librería `astro` dedicada a la
  configuración). Es un `import` de [módulos ES](glosario.md#modulos-es).
  - `defineConfig`: una función que recibe tu objeto de configuración y lo devuelve igual. No
    cambia nada; existe para que TypeScript sepa qué opciones son válidas y te las sugiera.
  - `fontProviders`: los "proveedores" de fuentes, es decir, de dónde puede sacar Astro los
    archivos de una fuente. Abajo se usa el proveedor `local`.
- Línea 2: vacía, solo separa.
- Línea 3: importa `tailwindcss`, la función que crea el *plugin* de Tailwind para
  [Vite](glosario.md#vite). Viene del paquete `@tailwindcss/vite` de
  [`package.json`](package.json.md).

```js
// https://astro.build/config
export default defineConfig({
```

- El comentario es un enlace a la documentación de todas las opciones de configuración. Lo trae
  la plantilla inicial de Astro.
- `export default defineConfig({`: exporta la configuración como export por defecto del
  archivo. Astro importa este archivo al arrancar y lee justo ese valor. La `{` abre el objeto
  de configuración.

```js
  // Public URL of the demo (spec 0008). Absolute links (og:url, og:image, WhatsApp messages) use it.
  site: 'https://tienda-demo-cuba.vercel.app',
```

- El comentario: "URL pública de la demo (spec 0008). Los enlaces absolutos (`og:url`, `og:image`,
  mensajes de WhatsApp) la usan."
- `site: 'https://tienda-demo-cuba.vercel.app',`: la dirección pública del sitio, el subdominio
  que el dueño añadió en Vercel. Astro la pone a disposición del código como `Astro.site`
  ([Astro.url y Astro.site](glosario.md#astro-url-y-site)). `BaseLayout` y la página de producto
  la usan para construir [URLs absolutas](glosario.md#url-absoluta). Sin esta línea, durante el
  build Astro solo conoce `http://localhost:4321`, y la vista previa de WhatsApp y el enlace del
  mensaje de pedido apuntarían a tu PC.

```js
  vite: {
    plugins: [tailwindcss()]
  },
```

- `vite: { ... }`: opciones que Astro pasa tal cual a [Vite](glosario.md#vite), la herramienta
  que usa por dentro para el build y el servidor de desarrollo.
- `plugins: [tailwindcss()]`: la lista de *plugins* (extensiones) de Vite. `tailwindcss()`
  crea el de Tailwind. Gracias a él, cuando Vite procesa `src/styles/global.css` y encuentra
  `@import "tailwindcss";`, Tailwind mira qué clases usas en tus archivos y genera solo ese CSS.
- `},` cierra `vite`.

```js
  // One self-hosted heading font, no network at build or run time (spec 0002).
```

- Comentario: "Una fuente de títulos autoalojada, sin red ni en el build ni al usar el sitio
  (spec 0002)". *Autoalojada* significa que el archivo de la fuente está en este repositorio y
  se sirve desde el mismo dominio que la página. Ni tu PC al hacer el build ni el móvil del
  cliente piden nada a otro servidor. Esto cumple la regla de la spec 0001 de no cargar nada de
  terceros (AC6).

```js
  fonts: [
    {
```

- `fonts: [`: la lista de fuentes que Astro debe gestionar con su
  [API de fuentes](glosario.md#fuente-web). Hay una sola.
- `{`: abre la descripción de esa fuente.

```js
      provider: fontProviders.local(),
```

- De dónde sale el archivo: `local()` = de un archivo que ya está en el proyecto. La spec 0002
  descartó la alternativa (`fontProviders.fontsource()`) porque haría que el build descargara
  la fuente de internet y controlarías menos qué archivo exacto se sirve.

```js
      name: 'Fraunces',
```

- El nombre de la familia tipográfica. En el CSS final Astro le añade un código para que sea
  único: en `dist/index.html` aparece como `Fraunces-6437c3109814a0b9`.

```js
      cssVariable: '--font-fraunces',
```

- La [variable CSS](glosario.md#variable-css) en la que Astro publica la fuente. En el build
  queda así (sacado de `dist/index.html`):
  `--font-fraunces:Fraunces-6437c3109814a0b9,"Fraunces-6437c3109814a0b9 fallback: Times New Roman",serif`.
  Es decir: primero Fraunces, si no, una fuente de respaldo ajustada, y si no, cualquier
  `serif`. Otros archivos usan la fuente solo por este nombre (ver "Cómo se conecta").

```js
      fallbacks: ['serif'],
```

- Las [fuentes de respaldo](glosario.md#fuente-de-respaldo): qué usar mientras Fraunces no ha
  llegado, o si no llega. `serif` es la familia genérica (el navegador elige una de su sistema).
- La spec 0002 explica que poner una familia genérica al final hace que Astro genere un respaldo
  "optimizado". En el build se ve: Astro crea una segunda fuente, `Times New Roman` con medidas
  corregidas (`size-adjust`, `ascent-override`…), para que ocupe casi el mismo espacio que
  Fraunces. Así, cuando Fraunces llega, el texto no salta de sitio.

```js
      display: 'swap',
```

- Se convierte en [`font-display: swap`](glosario.md#font-display) en el CSS: el navegador
  muestra los títulos **en seguida** con la fuente de respaldo y los cambia a Fraunces cuando
  termina de descargarla. Con conexiones lentas, el cliente nunca ve títulos en blanco.

```js
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/fraunces-latin-600-normal.woff2'],
            weight: 600,
            style: 'normal'
          }
        ]
      }
```

- `options: {`: opciones propias del proveedor `local`.
- `variants: [`: la lista de archivos de la fuente, uno por cada grosor y estilo. Aquí hay uno
  solo, porque la spec 0002 permite un único archivo de 25 KB como máximo (este pesa 17,7 KB).
- `{`: abre la única variante.
- `src: [...]`: la ruta del archivo, desde la raíz del proyecto. Es una lista porque una
  variante podría tener varios formatos; aquí solo hay uno, [WOFF2](glosario.md#fuente-web).
  El nombre del archivo lo describe: Fraunces, solo letras latinas (incluye á, ñ, ¿, ¡ y €,
  según la spec), grosor 600, estilo normal. Vive en `src/assets/fonts/`, no en `public/`,
  porque la spec 0002 dice que desde `public/` Astro lo copiaría dos veces.
- `weight: 600`: el grosor que contiene ese archivo (600 = seminegrita). Debe coincidir con el
  `font-weight` que usa el CSS de los títulos.
- `style: 'normal'`: no es cursiva.
- `}` cierra la variante, `]` cierra `variants` y la última `}` cierra `options`.

```js
    }
  ]
});
```

- `}` cierra la descripción de Fraunces y `]` cierra la lista `fonts`.
- `})` cierra el objeto de configuración y la llamada a `defineConfig`; `;` termina la línea.

**Lo que no está:** no hay `output`, porque el valor por defecto de Astro ya es un sitio
estático (spec 0001).

## Cómo se conecta

- **Entra:** el archivo `src/assets/fonts/fraunces-latin-600-normal.woff2` (con su licencia,
  `OFL.txt`, al lado) y el plugin de `@tailwindcss/vite`.
- **Tailwind:** el plugin procesa `src/styles/global.css`, que empieza con
  `@import "tailwindcss";` y define los [tokens](glosario.md#token) con
  [`@theme`](glosario.md#theme).
- **La fuente, en tres sitios:**
  1. `src/layouts/BaseLayout.astro` pone `<Font cssVariable="--font-fraunces" preload />` en
     el `<head>`. `Font` viene del [módulo virtual](glosario.md#modulo-virtual)
     `astro:assets`. Escribe el CSS de la fuente y un
     `<link rel="preload" … as="font">`, que pide al navegador descargar el archivo cuanto
     antes. El valor de `cssVariable` tiene que ser el mismo que aquí: Astro genera
     `.astro/fonts.d.ts` con ese nombre como único [tipo](glosario.md#tipo) válido, así que
     si no coincide, el [typecheck](glosario.md#typecheck) avisa.
  2. `src/styles/global.css` crea el token `--font-display: var(--font-fraunces);`. De ahí
     sale la clase `font-display` de Tailwind, que usan los títulos y los precios.
  3. **En el build**, el archivo se copia a `dist/_astro/fonts/` con un nombre nuevo
     (`27c19caf1fa510c8.woff2`). Ese nombre sale del contenido del archivo: si la fuente
     cambia, el nombre cambia, y el navegador no se queda con una copia vieja.

## Prueba tú

Vas a ver qué cambia en el CSS si la fuente no usa `swap`.

1. Ejecuta `pnpm build`. Abre `dist/index.html` en VS Code y busca (`Ctrl+F`)
   `font-display`. Verás `font-display:swap` dentro de dos reglas `@font-face`: la de
   Fraunces y la del respaldo `Times New Roman`.
2. En `astro.config.mjs`, cambia `display: 'swap',` por `display: 'block',`.
3. Ejecuta otra vez `pnpm build` y repite la búsqueda en `dist/index.html`.
4. **Qué esperar:** ahora pone `font-display:block`. Con `block`, el navegador deja los
   títulos invisibles un momento mientras espera a Fraunces. En una conexión lenta de Cuba,
   eso son títulos y precios en blanco. Por eso la spec eligió `swap`.
5. **Deshacer:** vuelve a escribir `display: 'swap',` y ejecuta `pnpm build` para regenerar
   `dist/`.

## Términos

- [tailwind](glosario.md#tailwind)
- [vite](glosario.md#vite)
- [variable CSS](glosario.md#variable-css)
- [token](glosario.md#token)
- [theme](glosario.md#theme)
- [módulo virtual](glosario.md#modulo-virtual)
- [tipo](glosario.md#tipo)
- [typecheck](glosario.md#typecheck)
- [URL absoluta](glosario.md#url-absoluta)
- [Open Graph](glosario.md#open-graph)
- [módulos ES](glosario.md#modulos-es)
- [// @ts-check](glosario.md#ts-check)
- [fuente web (WOFF2, autoalojada, API de fuentes)](glosario.md#fuente-web)
- [fuente de respaldo](glosario.md#fuente-de-respaldo)
- [font-display](glosario.md#font-display)
