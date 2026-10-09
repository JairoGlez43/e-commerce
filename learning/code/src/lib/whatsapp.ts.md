# `src/lib/whatsapp.ts`

> **Qué es:** las dos funciones del botón de WhatsApp: leer el número y armar el enlace con el
> mensaje · **Lo decidió:** [spec 0007](../../../../docs/specs/0007-whatsapp-order.md) ·
> **Lo usan:** [`src/pages/producto/[id].astro`](../pages/producto/%5Bid%5D.astro.md) ·
> **Usa:** la variable de entorno `WHATSAPP_NUMBER`, [`formatPrice()`](price.ts.md) y el tipo de
> producto de `astro:content`

## Para qué sirve

Hoy los clientes piden por WhatsApp. Este archivo convierte un producto en un enlace que, al
tocarlo, abre WhatsApp con un chat a la tienda y el mensaje ya escrito ("Hola, quiero pedir:
Arroz blanco (1 lb) – 280 CUP." + el enlace del producto). Es el único archivo que sabe algo de
WhatsApp: si mañana cambia el formato del mensaje o del enlace, se toca solo aquí.

El número **no está escrito en el código**: llega desde una
[variable de entorno](../../glosario.md#variable-de-entorno), para que no quede publicado en
GitHub. Si falta, el build se para con un error claro en vez de publicar un botón roto.

## El código, por partes

### 1. Imports

```ts
import type { CollectionEntry } from 'astro:content';
import { formatPrice } from './price';
```

- `import type { CollectionEntry } from 'astro:content';`: solo el [tipo](../../glosario.md#tipo)
  "una entrada de una colección" ([import type](../../glosario.md#import-type),
  [genérico](../../glosario.md#generico)). Sirve para declarar qué recibe `orderLink()`.
- `import { formatPrice } from './price';`: la función que escribe el precio como `280 CUP`
  ([`price.ts.md`](price.ts.md)). El mensaje usa el mismo formato que la página.

### 2. El comentario de cabecera

```ts
// The only place that knows about WhatsApp (spec 0007).
```

- "El único sitio que sabe de WhatsApp (spec 0007)."

### 3. Leer y validar el número

```ts
// The number comes only from the environment (.env or the build command), never from code,
// so it is not published in the repo. A missing or malformed number stops the build.
export function getWhatsAppNumber(): string {
	const number = import.meta.env.WHATSAPP_NUMBER;
	if (!number || !/^\d{8,15}$/.test(number)) {
		throw new Error(
			'WHATSAPP_NUMBER must be set to 8–15 digits (international format, no +). See .env.example.',
		);
	}
	return number;
}
```

- El comentario: "El número viene solo del entorno (`.env` o el comando del build), nunca del
  código, así que no se publica en el repo. Un número que falta o está mal formado para el
  build."
- `export function getWhatsAppNumber(): string`: una función exportada
  ([import-export](../../glosario.md#import-export)) que devuelve un texto (`: string`).
- `const number = import.meta.env.WHATSAPP_NUMBER;`: lee la variable de entorno
  `WHATSAPP_NUMBER` ([import.meta.env](../../glosario.md#import-meta-env)). Su valor sale del
  archivo `.env` o del propio comando (`WHATSAPP_NUMBER=5355555555 pnpm build`); si están los
  dos, gana el del comando. Este código corre solo en el build, en tu PC o en Vercel; el
  navegador del cliente nunca lo ejecuta, por eso la variable no necesita el prefijo `PUBLIC_`.
- `if (!number || !/^\d{8,15}$/.test(number))`: comprueba dos cosas:
  - `!number`: que exista (si no hay variable, vale `undefined`, y `!undefined` es `true`).
  - `!/^\d{8,15}$/.test(number)`: que sea **solo dígitos, entre 8 y 15**
    ([expresión regular](../../glosario.md#expresion-regular)): `^` = empieza aquí, `\d` = un
    dígito, `{8,15}` = de 8 a 15 veces, `$` = termina aquí. `5355555555` pasa;
    `+53 5555-5555` no (tiene `+`, espacio y guion). Es el formato que pide WhatsApp: el número
    internacional completo, sin `+`, espacios ni guiones.
- `throw new Error('…')`: si falla cualquiera de las dos, **lanza un error**
  ([throw](../../glosario.md#throw)). Como esta función se ejecuta mientras Astro genera las
  páginas, el error para el build entero: sale el mensaje en la terminal y el comando termina
  con un [código de salida](../../glosario.md#codigo-de-salida) distinto de 0. El mensaje dice
  qué falta y dónde mirar (`.env.example`).
- `return number;`: si todo está bien, devuelve el número.

### 4. Armar el enlace con el mensaje

```ts
// Click-to-chat link with the message already typed: https://wa.me/<number>?text=<message>.
export function orderLink(product: CollectionEntry<'products'>, pageUrl: string): string {
	const { name, unit, price, inStock } = product.data;
	const message = inStock
		? `Hola, quiero pedir: ${name} (${unit}) – ${formatPrice(price)}.\n${pageUrl}`
		: `Hola, ¿cuándo vuelve a haber ${name} (${unit})?\n${pageUrl}`;
	return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}
```

- El comentario: "Enlace de *click to chat* con el mensaje ya escrito:
  `https://wa.me/<número>?text=<mensaje>`" ([click-to-chat](../../glosario.md#click-to-chat)).
- `export function orderLink(product: CollectionEntry<'products'>, pageUrl: string): string`:
  recibe un producto y la URL completa de su página, y devuelve el enlace (un texto).
- `const { name, unit, price, inStock } = product.data;`: saca los cuatro campos que necesita
  el mensaje ([desestructuración](../../glosario.md#desestructuracion)).
- `const message = inStock ? … : …;`: elige el mensaje con un ternario (`condición ? si : no`):
  - **Disponible:** `Hola, quiero pedir: Arroz blanco (1 lb) – 280 CUP.` y, en otra línea, el
    enlace de la página.
  - **Agotado:** `Hola, ¿cuándo vuelve a haber Salchichas (Paquete 10 u)?` y el enlace.
  - Los textos van entre comillas invertidas para meter valores con `${…}`
    ([template literal](../../glosario.md#template-literal)). `\n` es un salto de línea: el
    enlace queda en su propia línea dentro de WhatsApp.
- `return \`https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}\`;`:
  arma el enlace final:
  - `getWhatsAppNumber()`: el número validado del bloque 3 (si falta, aquí se para el build).
  - `encodeURIComponent(message)`: convierte el mensaje en texto seguro para una URL
    ([encodeURIComponent](../../glosario.md#encodeuricomponent)): los espacios pasan a `%20`, el
    salto de línea a `%0A`, la `¿` a `%C2%BF`… Sin esto, el primer espacio o `?` del mensaje
    rompería la URL.

## Cómo se conecta

- **Entra:** `WHATSAPP_NUMBER` desde el entorno (archivo [`.env`](../../.env.example.md), que
  creas tú, o el comando del build); el producto y la URL de la página, desde
  [`src/pages/producto/[id].astro`](../pages/producto/%5Bid%5D.astro.md).
- **Sale:** un texto como
  `https://wa.me/5355555555?text=Hola%2C%20quiero%20pedir%3A%20Arroz%20blanco%20(1%20lb)%20%E2%80%93%20280%20CUP.%0Ahttp%3A%2F%2F…`,
  que la página pone en el `href` del botón.
- **Tipos:** TypeScript sabe que existe `import.meta.env.WHATSAPP_NUMBER` gracias a
  [`src/env.d.ts`](../env.d.ts.md).

## Prueba tú

Mira el error que protege el build, sin tocar código:

1. En la terminal de VS Code (Git Bash), ejecuta `WHATSAPP_NUMBER=123 pnpm build`.
2. **Qué deberías ver:** el build se para al generar la primera página de producto, con el
   mensaje `WHATSAPP_NUMBER must be set to 8–15 digits (international format, no +). See
   .env.example.` (`123` tiene solo 3 dígitos).
3. Ahora `WHATSAPP_NUMBER=5355555555 pnpm build`: termina bien. Abre
   `dist/producto/arroz-blanco/index.html` y busca `wa.me`: verás el enlace con el número falso.
4. No hay nada que deshacer: el número del comando solo vale para ese comando. Vuelve a ejecutar
   `pnpm build` (que usará tu `.env`) si quieres el `dist/` con tu número.

## Términos

- [variable-de-entorno](../../glosario.md#variable-de-entorno) ·
  [import-meta-env](../../glosario.md#import-meta-env) · [throw](../../glosario.md#throw) ·
  [codigo-de-salida](../../glosario.md#codigo-de-salida)
- [click-to-chat](../../glosario.md#click-to-chat) ·
  [encodeuricomponent](../../glosario.md#encodeuricomponent) ·
  [expresion-regular](../../glosario.md#expresion-regular)
- [import-export](../../glosario.md#import-export) · [import-type](../../glosario.md#import-type) ·
  [tipo](../../glosario.md#tipo) · [generico](../../glosario.md#generico) ·
  [desestructuracion](../../glosario.md#desestructuracion) ·
  [template-literal](../../glosario.md#template-literal)
