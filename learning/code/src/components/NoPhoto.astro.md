# `src/components/NoPhoto.astro`

> **Qué es:** el [componente](../../glosario.md#componente-astro) de la caja "Sin foto", que
> ocupa el sitio de la foto de un producto que aún no tiene una · **Lo decidió:**
> [spec 0015](../../../../docs/specs/0015-manage-products.md) (Design → *Public pages (photo
> optional)*) · **Lo usan:** [`ProductCard.astro`](ProductCard.astro.md),
> [`src/pages/producto/[id].astro`](../pages/producto/%5Bid%5D.astro.md) (con `framed`) y
> [`src/pages/estilo.astro`](../pages/estilo.astro.md) · **Usa:** solo clases de Tailwind con
> los [tokens](../../glosario.md#token) del proyecto

## Para qué sirve

Desde la spec 0015 el dueño puede añadir productos desde `/admin/`, y desde la spec 0017
(feature 14) puede subirles una foto, o quitársela. Un producto sin foto tiene su `photo_path` a
`null` en Supabase. Las páginas públicas no pueden dejar un hueco ni una imagen rota: en su lugar dibujan
este cuadrado crema con el texto "Sin foto". Tiene el mismo tamaño que una foto (cuadrado y a
todo el ancho), así que la tarjeta o la página no cambian de forma.

Es **el único sitio** que define cómo se ve esa caja: las tres páginas que la necesitan la
importan en vez de copiar las clases.

## El código, por partes

### 1. El comentario y las props

```astro
---
// The single home of the "Sin foto" box, shown where a product without a photo would show its
// photo (spec 0015). The visible text names the state, so it needs no alt. No opacity-50: the
// "Agotado" badge already shows the stock.
```

- `---`: abre el [frontmatter](../../glosario.md#frontmatter), el código que corre en el
  [build](../../glosario.md#build).
- El comentario: "El único sitio de la caja 'Sin foto', que se enseña donde un producto sin foto
  enseñaría su foto (spec 0015). El texto visible nombra el estado, así que no necesita `alt`.
  Sin `opacity-50`: la etiqueta 'Agotado' ya enseña las existencias."
  - "No necesita `alt`": el `alt` es el texto que el lector de pantalla lee en lugar de una
    **imagen**. Esto no es una imagen sino un `<div>` con texto, y el lector de pantalla lee
    "Sin foto" tal cual. El nombre del producto ya está en el título de la tarjeta o de la
    página, así que no hace falta repetirlo
    ([accesibilidad](../../glosario.md#accesibilidad)).
  - "Sin `opacity-50`": la foto de un producto agotado se ve atenuada (ver
    [`ProductCard.astro.md`](ProductCard.astro.md)). La caja no, porque la palabra "Agotado" ya
    lo dice, y un texto gris atenuado se leería peor.

```astro
interface Props {
	/** The product page frames it like its photo; cards do not. */
	framed?: boolean;
}

const { framed = false } = Astro.props;
---
```

- `interface Props { … }`: las [props](../../glosario.md#props) que acepta
  ([interface](../../glosario.md#interface)).
- El [comentario JSDoc](../../glosario.md#comentario-jsdoc): "La página de producto la enmarca
  como su foto; las tarjetas no."
- `framed?: boolean;`: una sola prop, `true` o `false`. El `?` la hace opcional: quien no la
  pasa no tiene que escribir nada.
- `const { framed = false } = Astro.props;`: la lee de [`Astro.props`](../../glosario.md#astro-props)
  ([desestructuración](../../glosario.md#desestructuracion)). Si no llegó, vale `false`
  ([valor por defecto](../../glosario.md#valor-por-defecto)).
  - `<NoPhoto />` (tarjetas): `framed` es `false`.
  - `<NoPhoto framed />` (página de producto): un atributo sin `={…}` vale `true`, como
    `disabled` en HTML.
- `---`: cierra el frontmatter.

### 2. La caja

```astro
<div
	class:list={[
		'flex aspect-square w-full items-center justify-center bg-cream text-sm text-muted',
		{ 'rounded-card border border-border': framed },
	]}
>
	Sin foto
</div>
```

- `<div …>Sin foto</div>`: una caja con el texto "Sin foto". No es una imagen, así que no hay
  `<img>` (spec 0015, AC9) y el build no descarga nada.
- `class:list={[ … ]}`: arma el atributo `class` a partir de una lista
  ([class:list](../../glosario.md#class-list)):
  - El primer elemento, un texto, son las clases de siempre:
    - `flex items-center justify-center` → `display: flex` con el texto centrado en vertical y
      en horizontal.
    - `aspect-square` → `aspect-ratio: 1 / 1`: siempre cuadrada, como las fotos.
    - `w-full` → `width: 100%`: todo el ancho de su sitio. Con el `aspect-square`, el alto es
      igual al ancho.
    - `bg-cream` → el fondo crema de la página ([token](../../glosario.md#token) `cream`), que
      dentro de una tarjeta blanca se distingue como un hueco.
    - `text-sm text-muted` → texto de 14 px en el gris `muted`
      ([escala de texto](../../glosario.md#escala-de-texto)).
  - El segundo elemento, un objeto `{ 'clases': condición }`, añade esas clases solo si la
    condición es verdadera. Con `framed`:
    - `rounded-card` → las esquinas redondeadas del token `card`.
    - `border border-border` → un borde de 1 px en el beige `border`.
    - Son las mismas clases que lleva la foto en la página de producto. En una tarjeta del
      catálogo no hacen falta: la propia tarjeta ya tiene borde y esquinas, y recorta lo que
      sobresale.

## Cómo se conecta

- **Recibe:** solo `framed`. No recibe el producto ni lee datos: se limita a dibujarse.
- **La usan:**
  - [`ProductCard.astro`](ProductCard.astro.md): `photo ? <Image … /> : <NoPhoto />`, en la
    portada y en las páginas de categoría.
  - [`producto/[id].astro`](../pages/producto/%5Bid%5D.astro.md): `<NoPhoto framed />`. Esa
    página, sin foto, además deja que la vista previa de WhatsApp use `/og-default.png`.
  - [`estilo.astro`](../pages/estilo.astro.md): en las tarjetas de muestra.
- **Cuándo sale:** cuando `product.data.photo` falta, es decir, cuando la fila de Supabase tiene
  `photo_path` `null` (ver [`content.config.ts.md`](../content.config.ts.md)).

## Prueba tú

Mira cómo cambia la caja con y sin marco, sin tocar Supabase. Con los datos de ejemplo, todos
los productos tienen foto, así que la caja solo aparece si se fuerza.

1. En `src/components/ProductCard.astro`, cambia `photo ? (` por `false ? (`. Así todas las
   tarjetas eligen la rama de `<NoPhoto />`.
2. Ejecuta `pnpm dev` y abre `http://localhost:4321`.
3. **Qué deberías ver:** cada tarjeta enseña un cuadrado crema con "Sin foto" en gris en lugar de
   la foto, con el nombre, el precio y la etiqueta debajo como siempre.
4. Ahora cambia `<NoPhoto />` por `<NoPhoto framed />` en ese mismo archivo y guarda: el dev
   server recarga la página y cada caja gana un borde beige con esquinas redondeadas dentro de
   la tarjeta.
5. **Deshacer:** vuelve a escribir `photo ? (` y `<NoPhoto />` (o `Ctrl+Z` en VS Code hasta
   volver al original). No uses `git checkout`: borraría también cualquier otro cambio de ese
   archivo que aún no esté guardado en git.

## Términos

- [componente-astro](../../glosario.md#componente-astro) · [frontmatter](../../glosario.md#frontmatter) ·
  [build](../../glosario.md#build) · [props](../../glosario.md#props) ·
  [astro-props](../../glosario.md#astro-props) · [interface](../../glosario.md#interface) ·
  [comentario-jsdoc](../../glosario.md#comentario-jsdoc)
- [desestructuracion](../../glosario.md#desestructuracion) ·
  [valor-por-defecto](../../glosario.md#valor-por-defecto) · [class-list](../../glosario.md#class-list)
- [token](../../glosario.md#token) · [escala-de-texto](../../glosario.md#escala-de-texto) ·
  [accesibilidad](../../glosario.md#accesibilidad)
