# `src/lib/site.ts`

> **Qué es:** toda la información de la tienda en un solo objeto `site`: nombre, descripción, si los buscadores pueden indexarla, y ubicación, horario, formas de pago, recogida, entregas, pasos para comprar y preguntas frecuentes · **Lo decidió:** [spec 0005](../../../../docs/specs/0005-catalog-page.md) (dónde viven), [spec 0009](../../../../docs/specs/0009-site-identity.md) (los valores, genéricos a propósito), [spec 0008](../../../../docs/specs/0008-demo-online.md) (`indexable`) y [spec 0010](../../../../docs/specs/0010-shop-information.md) (la información de la tienda) · **Lo usan:** `src/components/SiteHeader.astro`, `src/components/ShopInfo.astro`, `src/components/Faq.astro`, `src/components/SiteFooter.astro`, `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/pages/categoria/[id].astro`, `src/pages/producto/[id].astro` · **Usa:** nada

## Para qué sirve

El nombre de la tienda sale en la cabecera, en el pie, en el título de la pestaña de la
portada y en el título de cada página de categoría y de producto. En vez de escribirlo en cada
sitio, se escribe una vez aquí y todos lo importan. Lo mismo con el resto de la información
que ve el cliente (horario, pagos, preguntas frecuentes…): ningún componente lleva esos textos
escritos (AC1 de la spec 0010). Adaptar la demo a otra tienda es cambiar este archivo y ningún
otro.

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
- `const site = { ... }`: un objeto JavaScript normal. Los campos se agrupan en un objeto para
  importarlos juntos y leerlos como `site.name`, `site.hours`, `site.faq`…

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
```

- El comentario: "Mientras sea una demo, cada página pide a los buscadores que no la indexen
  (spec 0008). Ponlo a `true` cuando el dueño compre el sitio y lo quiera en Google."
- `indexable: false,`: el interruptor. `BaseLayout` lo lee y, mientras sea `false`, escribe en
  todas las páginas la etiqueta [meta robots](../../glosario.md#meta-robots) con `noindex`. Así
  la demo, con productos inventados y tu número de WhatsApp, no sale en Google; quien tenga el
  enlace la ve igual, y las vistas previas de WhatsApp no cambian.

```ts

	// Shop information shown on the home page, header and footer (spec 0010).
	// Demo values: a municipality, never a street address (spec 0009). A client who delivers
	// changes `delivery`, step 3 of `howToBuy` and the delivery answer in `faq`.
	location: 'La Lisa, La Habana',
```

- La línea en blanco separa la identidad (arriba) de la información de la tienda (abajo), que
  añadió la [spec 0010](../../../../docs/specs/0010-shop-information.md).
- El comentario: "Información de la tienda que se muestra en la portada, la cabecera y el pie
  (spec 0010). Valores de demo: un municipio, nunca una dirección (spec 0009). Un cliente que
  haga entregas cambia `delivery`, el paso 3 de `howToBuy` y la respuesta sobre entregas de
  `faq`." Es la lista de lo que hay que tocar al adaptar la demo a una tienda con entregas.
- `location: 'La Lisa, La Habana',`: dónde está la tienda. Solo el municipio (lo eligió el
  dueño), porque la demo no es de ningún negocio real. Sale en el recuadro "Horario y
  ubicación" y en el pie.

```ts
	hours: [
		{ days: 'Lunes a sábado', time: '9:00 a.m. – 6:00 p.m.' },
		{ days: 'Domingo', time: '9:00 a.m. – 1:00 p.m.' },
	],
```

- `hours`: el horario, como una lista de objetos. Cada objeto es una línea con dos campos:
  `days` (qué días) y `time` (de qué hora a qué hora).
- Se guarda partido en dos campos, y no como un único texto, para que los componentes decidan
  cómo juntarlos; hoy los dos escriben `Lunes a sábado: 9:00 a.m. – 6:00 p.m.`.
- Una tienda con otro horario añade, quita o cambia objetos de la lista: los componentes
  pintan una línea por objeto, sean los que sean.

```ts
	payments: ['Efectivo (CUP)', 'Transfermóvil', 'EnZona', 'USD en efectivo'],
```

- `payments`: las formas de pago, una lista de textos. Transfermóvil y EnZona son pagos por
  transferencia (así lo cuenta la respuesta sobre pagos de `faq`, más abajo).
- La portada las une en una línea: `Aceptamos: Efectivo (CUP) · Transfermóvil · EnZona · USD en
  efectivo` (con [join](../../glosario.md#array-join)). Son texto, sin logos (spec 0010).

```ts
	pickup: 'Recoge tu pedido en la tienda, sin costo adicional.',
	delivery: 'Por ahora no hacemos entregas a domicilio.',
```

- `pickup`: la frase sobre recoger el pedido.
- `delivery`: la frase sobre entregas a domicilio. La demo ofrece solo recogida, porque el
  primer cliente interesado no hace entregas (elección del dueño en la spec 0010).
- Las dos salen en el recuadro "Recogida y entrega".

```ts
	howToBuy: [
		'Elige lo que quieres en el catálogo.',
		'Toca «Pedir por WhatsApp» y envía el mensaje.',
		'Te confirmamos el pedido y lo recoges en la tienda.',
	],
```

- `howToBuy`: los pasos de "Cómo comprar", en orden. El número de cada paso no está escrito
  aquí: lo pone el componente según la posición en la lista.
- `«…»` son comillas españolas, parte del texto. El paso 2 nombra el botón tal como se llama en
  la página de producto.

```ts
	faq: [
		{
			question: '¿Los precios están actualizados?',
			answer:
				'Sí. Cuando cambia un precio o se agota un producto, el catálogo se actualiza. Arriba ves la fecha de la última actualización.',
		},
		{
			question: '¿Cómo hago un pedido?',
			answer:
				'Abre el producto y toca «Pedir por WhatsApp». El mensaje ya lleva el nombre y el precio: solo tienes que enviarlo y te confirmamos.',
		},
		{
			question: '¿Cómo puedo pagar?',
			answer:
				'En efectivo, en CUP o USD, o por transferencia con Transfermóvil o EnZona, al recoger tu pedido.',
		},
		{
			question: '¿Hacen entregas a domicilio?',
			answer: 'Por ahora no. Puedes recoger tu pedido en la tienda, en La Lisa.',
		},
		{
			question: '¿Qué hago si un producto está agotado?',
			answer:
				'Abre el producto y toca «Preguntar por WhatsApp». Te avisamos cuando vuelva a haber.',
		},
	],
};
```

- `faq`: las preguntas frecuentes, una lista de 5 objetos con dos campos: `question` (la
  pregunta) y `answer` (la respuesta).
- `answer:` con el texto en la línea siguiente: igual que `description`, solo porque es largo.
  La cuarta respuesta es corta y cabe en la misma línea.
- Las respuestas repiten datos de otros campos ("La Lisa", "Transfermóvil"), pero en una frase
  pensada para leerse sola. Por eso, si cambia la ubicación o las formas de pago, hay que
  revisar también estas respuestas.
- `],`: cierra la lista; `};`: cierra el objeto `site`.

## Cómo se conecta

- **Entra:** nada; son textos fijos.
- **Sale hacia:**
  - [`src/components/SiteHeader.astro`](../components/SiteHeader.astro.md): escribe
    `{site.name}` como enlace a `/` en la cabecera de todas las páginas de clientes.
  - [`src/components/SiteFooter.astro`](../components/SiteFooter.astro.md): `name`,
    `location` y `hours`, en el pie de todas las páginas de clientes.
  - [`src/components/ShopInfo.astro`](../components/ShopInfo.astro.md): `howToBuy`, `pickup`,
    `delivery`, `hours` y `location`, debajo de los productos en la portada.
  - [`src/components/Faq.astro`](../components/Faq.astro.md): `faq`, al final de la portada.
  - `src/pages/index.astro`: pasa `title={site.name}` y `description={site.description}` al
    [layout](../../glosario.md#layout) `BaseLayout` (título de la pestaña y metadatos de la
    portada), y escribe la línea `Aceptamos: …` con `site.payments`.
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
3. **Qué deberías ver:** el nuevo nombre en la cabecera, en el pie de página y en el título de
   la pestaña del navegador. Abre `http://localhost:4321/categoria/aseo`: la pestaña dice
   `Aseo · Bodega La Esquina (demo)`. Un solo cambio, muchos sitios.
4. **Deshacer:** vuelve a poner `name: 'Tienda de alimentos (demo)',` y guarda.

## Términos

- [import-export](../../glosario.md#import-export)
- [open-graph](../../glosario.md#open-graph)
- [meta-robots](../../glosario.md#meta-robots)
- [layout](../../glosario.md#layout)
- [template-literal](../../glosario.md#template-literal)
- [array-join](../../glosario.md#array-join) *(nuevo)*
