# `src/lib/site.ts`

> **Qué es:** el nombre y la descripción de la tienda, en un solo objeto `site` · **Lo decidió:** [spec 0005](../../../../docs/specs/0005-catalog-page.md) (dónde viven) y [spec 0003](../../../../docs/specs/0003-site-identity.md) (los valores, provisionales) · **Lo usan:** `src/components/SiteHeader.astro`, `src/pages/index.astro`, `src/pages/categoria/[id].astro` · **Usa:** nada

## Para qué sirve

El nombre de la tienda sale en la cabecera, en el título de la pestaña de la portada y en el
título de cada página de categoría. En vez de escribirlo en cada sitio, se escribe una vez
aquí y todos lo importan. Cuando el dueño decida el nombre real, se cambia en este archivo y
en ningún otro.

## El código, por partes

```ts
// Shop identity, the one place to change it (spec 0005).
// Placeholder values, see docs/specs/0003-site-identity.md (Assumed).
```

- Línea 1: "Identidad de la tienda, el único sitio donde cambiarla (spec 0005)." Avisa de que
  el nombre no debe escribirse a mano en otros archivos.
- Línea 2: "Valores provisionales, ver la spec 0003 (Assumed)." *Assumed* ("supuesta")
  significa que estos textos se inventaron para poder construir la demo, pero el dueño todavía
  no los ha aprobado. Según la [spec 0003](../../../../docs/specs/0003-site-identity.md), hay
  que confirmarlos con `/architect` antes de dar la funcionalidad por terminada.

```ts
export const site = {
```

- `export` deja que otros archivos lo importen con `import { site } from '../lib/site'` (ver
  [import-export](../../glosario.md#import-export)).
- `const site = { ... }`: un objeto JavaScript normal con dos campos. Se agrupan en un objeto
  para importarlos juntos y leerlos como `site.name` y `site.description`.

```ts
	name: 'Tienda de alimentos (demo)',
```

- `name`: el nombre de la tienda. Lleva "(demo)" para que nadie lo confunda con una tienda
  real mientras sea una demostración.

```ts
	description:
		'Productos en existencia y precios, siempre al día. Catálogo de demostración de una tienda local de alimentos.',
};
```

- `description:`: la descripción de la portada. El texto va en la línea siguiente solo porque
  es largo; sigue siendo un único texto.
- Ese texto acaba en la etiqueta `<meta name="description">` de la portada y en la vista
  previa al compartir el enlace (ver [open-graph](../../glosario.md#open-graph)), a través de
  `BaseLayout`. Resume lo que la web aporta frente a WhatsApp: existencias y precios al día.
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
- La imagen de la vista previa no está aquí: es `public/og-default.png` (spec 0003).

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
- [layout](../../glosario.md#layout)
- [template-literal](../../glosario.md#template-literal)
