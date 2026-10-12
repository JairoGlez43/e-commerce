# `src/lib/site.ts`

> **Qué es:** el nombre y la descripción de la tienda, y si los buscadores pueden indexarla, en un solo objeto `site` · **Lo decidió:** [spec 0005](../../../../docs/specs/0005-catalog-page.md) (dónde viven), [spec 0009](../../../../docs/specs/0009-site-identity.md) (los valores, genéricos a propósito) y [spec 0008](../../../../docs/specs/0008-demo-online.md) (`indexable`) · **Lo usan:** `src/components/SiteHeader.astro`, `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/pages/categoria/[id].astro`, `src/pages/producto/[id].astro` · **Usa:** nada

## Para qué sirve

El nombre de la tienda sale en la cabecera, en el título de la pestaña de la portada y en el
título de cada página de categoría. En vez de escribirlo en cada sitio, se escribe una vez
aquí y todos lo importan. Cuando el dueño decida el nombre real, se cambia en este archivo y
en ningún otro.

## El código, por partes

```ts
// Shop identity, the one place to change it (spec 0005).
// Generic on purpose: the demo is shown to one business after another (spec 0009).
```

- Línea 1: "Identidad de la tienda, el único sitio donde cambiarla (spec 0005)." Avisa de que
  el nombre no debe escribirse a mano en otros archivos.
- Línea 2: "Genérica a propósito: la demo se enseña a un negocio tras otro (spec 0009)." La
  web es una propuesta: si un negocio no la acepta, se le enseña a otro, así que no lleva el
  nombre de ninguno. Cuando uno acepte, este archivo es lo primero que se personaliza (la
  [spec 0009](../../../../docs/specs/0009-site-identity.md) tiene la lista completa). Antes
  este comentario apuntaba a la spec 0003, que era *Assumed* (supuesta, sin aprobar) y la 0009
  la sustituyó.

```ts
export const site = {
```

- `export` deja que otros archivos lo importen con `import { site } from '../lib/site'` (ver
  [import-export](../../glosario.md#import-export)).
- `const site = { ... }`: un objeto JavaScript normal con tres campos. Se agrupan en un objeto
  para importarlos juntos y leerlos como `site.name`, `site.description` y `site.indexable`.

```ts
	name: 'Tienda de alimentos (demo)',
```

- `name`: el nombre de la tienda. Lleva "(demo)" para que nadie lo confunda con una tienda
  real mientras sea una demostración.

```ts
	description:
		'Productos en existencia y precios, siempre al día. Catálogo de demostración de una tienda local de alimentos.',
```

- `description:`: la descripción de la portada. El texto va en la línea siguiente solo porque
  es largo; sigue siendo un único texto.
- Ese texto acaba en la etiqueta `<meta name="description">` de la portada y en la vista
  previa al compartir el enlace (ver [open-graph](../../glosario.md#open-graph)), a través de
  `BaseLayout`. Resume lo que la web aporta frente a WhatsApp: existencias y precios al día.

```ts
	// While this is a demo, every page asks search engines not to index it (spec 0008).
	// Set to true when the shop owner buys the site and wants it on Google.
	indexable: false,
};
```

- El comentario: "Mientras sea una demo, cada página pide a los buscadores que no la indexen
  (spec 0008). Ponlo a `true` cuando el dueño compre el sitio y lo quiera en Google."
- `indexable: false,`: el interruptor. `BaseLayout` lo lee y, mientras sea `false`, escribe en
  todas las páginas la etiqueta [meta robots](../../glosario.md#meta-robots) con `noindex`. Así
  la demo, con productos inventados y tu número de WhatsApp, no sale en Google; quien tenga el
  enlace la ve igual, y las vistas previas de WhatsApp no cambian.
- `};`: cierra el objeto.

## Cómo se conecta

- **Entra:** nada; son textos fijos.
- **Sale hacia:**
  - `src/components/SiteHeader.astro`: escribe `{site.name}` como enlace a `/` en la
    cabecera de todas las páginas del catálogo.
  - `src/pages/index.astro`: pasa `title={site.name}` y `description={site.description}` al
    [layout](../../glosario.md#layout) `BaseLayout` (título de la pestaña y metadatos de la
    portada).
  - `src/pages/categoria/[id].astro`: lo usa dentro de dos
    [template literals](../../glosario.md#template-literal) para el título
    (`Aseo · Tienda de alimentos (demo)`) y la descripción de cada página de categoría.
  - `src/layouts/BaseLayout.astro`: lee `site.indexable` para decidir si escribe `noindex`.
  - `src/pages/producto/[id].astro`: usa `site.name` en el título de cada producto.
- La imagen de la vista previa no está aquí: es `public/og-default.png` (spec 0009).

## Prueba tú

Cambia el nombre de la tienda y mira en cuántos sitios cambia a la vez.

1. Cambia la línea `name: 'Tienda de alimentos (demo)',` por
   `name: 'Bodega La Esquina (demo)',`.
2. Ejecuta `pnpm dev` y abre `http://localhost:4321`.
3. **Qué deberías ver:** el nuevo nombre en la cabecera y en el título de la pestaña del
   navegador. Abre `http://localhost:4321/categoria/aseo`: la pestaña dice
   `Aseo · Bodega La Esquina (demo)`. Un solo cambio, tres sitios.
4. **Deshacer:** vuelve a poner `name: 'Tienda de alimentos (demo)',` y guarda.

## Términos

- [import-export](../../glosario.md#import-export)
- [open-graph](../../glosario.md#open-graph)
- [meta-robots](../../glosario.md#meta-robots)
- [layout](../../glosario.md#layout)
- [template-literal](../../glosario.md#template-literal)
