# 01 · Astro

> Versión de referencia: **Astro 7.3** (octubre 2026) · Decisión del proyecto: [`docs/specs/0001-stack.md`](../docs/specs/0001-stack.md)

## 1. El problema

Imagina que haces esta tienda como has trabajado hasta ahora, con **React + Vite** o con **Next.js**.

Un cliente en La Habana abre el link que el dueño compartió en WhatsApp, con una conexión 3G que va y viene.

- **Con React + Vite (una SPA, *Single Page Application*):** el servidor le manda un `index.html` casi vacío (`<div id="root"></div>`) y un archivo JavaScript grande. Hasta que ese JS no se descarga **y se ejecuta**, el cliente ve una pantalla en blanco. Si la conexión se corta a mitad, no ve nada.
- **Con Next.js:** mejora, porque el HTML ya llega con los productos dibujados. Pero detrás llega igual el runtime de React y de Next (decenas de KB de JS) para **hidratar** la página.

**Hidratar** quiere decir que React vuelve a recorrer en el navegador el HTML que ya llegó, para "engancharle" los eventos y el estado. Es trabajo útil si la página tiene mucha interactividad. Nuestro catálogo casi no la tiene: es una lista de productos, una página de detalle y un enlace a WhatsApp.

Hay un segundo problema. Cuando pegas un link en WhatsApp, WhatsApp lee el HTML para armar la vista previa (foto y título). Una SPA le entrega un HTML vacío, así que no hay vista previa del producto.

**En resumen:** pagas en KB y en tiempo de carga por una interactividad que no usas.

## 2. La solución

**Astro** es un framework para construir sitios que, por defecto, **genera HTML y CSS y no manda nada de JavaScript al navegador**.

Funciona como un **generador de sitios estáticos** (SSG, *Static Site Generation*). En tu PC, un comando llamado **build** lee tus componentes y tus datos, y produce archivos `.html` terminados dentro de una carpeta `dist/`. Esa carpeta es lo único que se sube al hosting. Cuando el cliente pide una página, recibe el HTML ya hecho: no hay servidor calculando nada ni JS dibujando la página.

Lo que ya sabes de React y Next se traslada casi directo:

| Lo que conoces | En Astro |
|---|---|
| Componente `.jsx` | Componente `.astro` |
| JSX: `{producto.nombre}` | Igual: `{producto.nombre}` |
| `props` | `Astro.props` |
| `children` | `<slot />` |
| Rutas por archivos en `app/` o `pages/` de Next | Rutas por archivos en `src/pages/` |
| `generateStaticParams` (Next) | `getStaticPaths` |
| `useState`, `onClick` | ❌ No existen en `.astro`, porque el componente se ejecuta **solo en el build**, nunca en el navegador |

**La diferencia clave:** un componente React se ejecuta en el navegador. Un componente Astro se ejecuta **una sola vez, durante el build**, en tu PC o en Vercel. Su resultado es HTML plano. Por eso no tiene estado ni eventos.

¿Y si necesitas algo de interactividad, como un filtro? Tienes dos opciones:
- **Un `<script>` normal** dentro del componente. Astro lo empaqueta y lo manda como `type="module"`. Es lo que usaremos aquí, con JavaScript sin librerías (*vanilla*).
- **Islas:** un componente React metido dentro de una página Astro, con una directiva como `client:visible`. Solo ese trocito carga React. El spec lo deja **fuera de v1**, pero es bueno saber que existe. Si te interesa: `/learn astro-islands`.

## 3. Cómo encaja en este proyecto

Todavía no hay código: lo creará `/develop scaffold`. Esto es lo que dice el spec y cómo viajan los datos:

```
src/data/products.json          ← los productos (datos de ejemplo de la demo)
        │
        ▼
src/content.config.ts           ← define la "colección" products y su esquema
        │  (getCollection('products'))
        ▼
src/pages/index.astro           ← catálogo: recorre los productos
src/pages/producto/[slug].astro ← una página por producto
        │  usan
        ▼
src/layouts/BaseLayout.astro    ← <html lang="es">, <head>, etiquetas para WhatsApp
src/components/ProductCard.astro← tarjeta de producto reutilizable
        │
        ▼  pnpm run build
dist/index.html, dist/producto/arroz-1kg/index.html, …  →  Vercel
```

Tres conceptos nuevos de esta parte:

- **Content collection (colección de contenido):** es la forma que tiene Astro de cargar datos con orden. Le dices "mis productos están en este JSON y cada uno tiene esta forma". Las páginas piden los datos con `getCollection('products')` y nunca importan el JSON directamente. ¿Por qué importa? El día que el dueño compre el sitio, cambiamos *de dónde* vienen los datos (por ejemplo, de una base de datos) en un solo archivo, y las páginas no se tocan.
- **Esquema (con zod):** es una descripción de cómo debe ser cada producto, por ejemplo "`price` es un número y es obligatorio". **zod** es la librería que hace esa validación y viene incluida en Astro (se importa de `astro/zod`). Si un producto del JSON no tiene precio, **el build falla** y te dice cuál es. Así es imposible publicar un producto roto.
- **`getStaticPaths`:** en una ruta dinámica como `[slug].astro`, Astro necesita saber en el build **qué páginas generar**. Esta función le devuelve la lista, una entrada por producto.

```astro
---
// src/pages/producto/[slug].astro (forma general, el código real lo escribe /develop)
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const products = await getCollection('products');
  return products.map((p) => ({ params: { slug: p.id }, props: { product: p } }));
}

const { product } = Astro.props;
---
<h1>{product.data.name}</h1>
```

Los `---` marcan el **frontmatter**: la zona de JavaScript/TypeScript del componente, que se ejecuta en el build. Debajo va la plantilla HTML.

**Estilos:** usaremos **Tailwind CSS v4**, con clases como `p-4` o `text-lg` directamente en el HTML. Al hacer el build, Tailwind genera un CSS que solo contiene las clases que usaste. En v4 ya no hay `tailwind.config.js`: los colores y tamaños del diseño (los **tokens**) se definen en el propio CSS con `@theme`, dentro de `src/styles/global.css`.

**Imágenes:** el componente `<Image>` de Astro (de `astro:assets`) convierte tus fotos a **WebP**, un formato mucho más ligero que JPG. También genera varios tamaños (`srcset`) para que el móvil descargue la versión pequeña, y añade `loading="lazy"` para que las fotos de abajo se carguen solo al hacer scroll. Todo esto ocurre en el build.

## 4. Práctica

Todos estos comandos se ejecutan en la **terminal de VS Code** (`Ctrl+ñ`), dentro de la carpeta del proyecto. Usamos **pnpm**, no npm.

| Comando | Qué hace | Qué deberías ver |
|---|---|---|
| `pnpm create astro@latest` | Crea el proyecto con un asistente interactivo. Lo hará `/develop scaffold`, con tu permiso | Preguntas por consola. Elegiremos la plantilla **minimal** (vacía). TypeScript queda en modo `strict` por defecto |
| `pnpm dev` | Arranca el servidor de desarrollo, que recarga al guardar (como `vite dev` o `next dev`) | `Local: http://localhost:4321/`. Astro usa el puerto **4321**, no 3000 ni 5173 |
| `pnpm build` | Genera el sitio final en `dist/` | Una lista de páginas generadas y `Complete!`. Si un producto no cumple el esquema, verás aquí el error |
| `pnpm preview` | Sirve la carpeta `dist/` tal como quedará en Vercel | Otra vez `localhost:4321`, pero con la versión de producción |
| `pnpm astro check` | Revisa los tipos de TypeScript en archivos `.astro` y `.ts` | `0 errors`. La primera vez puede pedirte instalar `@astrojs/check` y `typescript`: es normal |
| `pnpm astro add tailwind` | Instala Tailwind v4 (`tailwindcss` + `@tailwindcss/vite`) y lo conecta a Astro | Te pide confirmar cambios en archivos. Crea el CSS con `@import "tailwindcss";` |

**Si algo falla:**
- **`Node.js vX is not supported`:** Astro 7 pide Node **22.12 o superior**. Tú tienes v24, así que no deberías verlo.
- **El puerto 4321 está ocupado:** ya tienes otro `pnpm dev` abierto. Ciérralo con `Ctrl+C` o usa `pnpm dev --port 4322`.
- **Aviso de pnpm sobre "ignored builds" al instalar:** pnpm 10 no ejecuta por defecto los scripts de instalación de las dependencias. `sharp`, la librería que optimiza las imágenes, podría necesitar tu aprobación. Esto aún no está verificado en la documentación actual: `/develop` lo comprobará antes.
- **Faltan espacios entre palabras y enlaces:** Astro 7 compacta el HTML y puede quitar espacios entre elementos en línea. Se arregla con `{" "}`.
- **Si el error persiste tras un intento de arreglo:** `/debug`.

## 5. Lo importante

- **Cero JS por defecto es la regla de oro de este proyecto.** Cada `<script>` que añadas es peso extra para alguien con mala conexión. El spec pone un tope de **5 KB** de JS por página, y `pnpm run check:weight` lo vigilará.
- **El frontmatter se ejecuta en el build, no en el navegador.** Un `console.log` dentro de `---` aparece en la terminal, no en la consola del navegador. Es el error más típico al venir de React.
- **Nunca importes `products.json` directamente** desde una página. Usa siempre `getCollection`. Si no, el día que cambiemos la fuente de datos habrá que tocar las páginas (criterio AC3 del spec).
- **En Tailwind, escribe las clases completas.** `` `bg-${color}-500` `` no funciona, porque Tailwind busca las clases como texto en tus archivos. Escribe `bg-green-500` entero.
- **No hay secretos en este sitio:** es estático, sin servidor ni base de datos. Si algún día aparece una clave, va en variables de entorno, nunca en el código.
- **Reglas del proyecto que aplican:**
  - Nada de React u otros frameworks de UI, ni plugins de Tailwind, sin una nueva decisión de `/architect`.
  - Nada de fuentes web ni scripts de terceros (analytics, CDNs).

## 6. Autoevaluación

1. Un componente `.astro` tiene un `console.log("hola")` en el frontmatter. ¿Dónde aparece el mensaje y cuándo?
2. ¿Por qué una SPA de Vite no daría vista previa por producto al compartir el link en WhatsApp, y Astro sí?
3. Quieres añadir un botón que filtre por categoría. ¿Qué dos formas tienes en Astro, y cuál usaremos en v1?
4. ¿Para qué sirve `getStaticPaths` en `src/pages/producto/[slug].astro`?
5. Alguien borra el precio de un producto en el JSON y ejecuta `pnpm build`. ¿Qué pasa y por qué es bueno?

<details>
<summary>Respuestas</summary>

1. En la **terminal**, cuando se ejecuta `pnpm dev` o `pnpm build`. Nunca en el navegador, porque el frontmatter solo corre en el build (o en el servidor de desarrollo).
2. WhatsApp lee el HTML que manda el servidor. La SPA manda un HTML vacío y los datos solo aparecen después, con JS. Astro manda el HTML ya completo, con el título, la descripción y la imagen de cada producto en las etiquetas Open Graph.
3. Con un `<script>` de JS vanilla dentro del componente, o con una isla (un componente React con `client:visible`, por ejemplo). En v1 usamos el `<script>` vanilla; las islas necesitan una nueva decisión.
4. Le dice a Astro qué páginas generar en el build: devuelve una entrada `{ params, props }` por cada producto, y Astro crea un HTML por cada una.
5. **El build falla**, porque el esquema (zod) exige `price`, y el error dice qué producto está mal. Es bueno porque nunca se publica un producto roto.
</details>

## 7. Para tu CV y portafolio

- **Astro (SSG):** sitio estático con 0 KB de JavaScript por defecto, rutas dinámicas prerenderizadas con `getStaticPaths`.
- **Rendimiento web:** presupuesto de peso por página medido de forma automática; imágenes optimizadas (WebP, `srcset`, *lazy loading*).
- **Arquitectura de datos tipada:** content collections con validación de esquema (zod) y TypeScript strict, preparadas para cambiar a un backend sin reescribir las páginas.
- **Tailwind CSS v4:** tokens de diseño con `@theme`, CSS generado solo con las clases usadas.
- **Decisiones técnicas documentadas:** comparativa SPA vs Next.js vs Astro con criterios medibles (peso de JS, vista previa al compartir en redes).

> *Proyecto:* catálogo web ultraligero para una tienda de alimentos en Cuba, pensado para conexiones lentas, con páginas de producto que se comparten en WhatsApp con vista previa.

---
**Fuentes:** [Instalación](https://docs.astro.build/en/install-and-setup/) · [CLI](https://docs.astro.build/en/reference/cli-reference/) · [Componentes](https://docs.astro.build/en/basics/astro-components/) · [Rutas](https://docs.astro.build/en/guides/routing/) · [Scripts](https://docs.astro.build/en/guides/client-side-scripts/) · [Directivas](https://docs.astro.build/en/reference/directives-reference/) · [Layouts](https://docs.astro.build/en/basics/layouts/) · [Content collections](https://docs.astro.build/en/guides/content-collections/) · [Imágenes](https://docs.astro.build/en/guides/images/) · [Tailwind + Vite](https://tailwindcss.com/docs/installation/using-vite) · [Tailwind `@theme`](https://tailwindcss.com/docs/theme)

**Siguiente tema natural:** `/learn tailwind-v4`, o `/learn content-collections` si quieres profundizar en los datos antes de la feature 04.
