# `src/lib/price.ts`

> **Qué es:** la función `formatPrice()`, que convierte un precio en el texto que ve el cliente (`12500` → `12.500 CUP`) · **Lo decidió:** [spec 0004](../../../../docs/specs/0004-sample-product-data.md) (AC5 y "Price display") · **Lo usan:** `src/components/ProductCard.astro`, `src/pages/estilo.astro` · **Usa:** `Intl.NumberFormat`, que viene incluido en JavaScript

## Para qué sirve

En los datos, el precio es un número pelado (`280`). En la web tiene que verse con separador
de miles y con la moneda (`280 CUP`). Este archivo es el **único** sitio del código donde
aparece la moneda: si un día cambia el formato o la moneda, se toca aquí y nada más. Las
páginas nunca escriben `CUP` a mano; siempre llaman a `formatPrice()`.

## El código, por partes

```ts
// The one place the currency appears in code (spec 0004). Prices are integers in CUP.
```

- Comentario: "El único sitio donde aparece la moneda en el código (spec 0004). Los precios
  son enteros en CUP." Es un aviso para quien llegue después: no escribas `CUP` en otro sitio,
  y no esperes decimales (el [esquema](../../glosario.md#esquema) de
  [`src/content.config.ts`](../content.config.ts.md) ya obliga a que `price` sea un entero
  positivo).

```ts
const formatter = new Intl.NumberFormat('es-ES');
```

- Crea un formateador de números con las convenciones del español de España (`'es-ES'`):
  punto para separar miles. Ver [intl-numberformat](../../glosario.md#intl-numberformat).
- Está **fuera** de la función, así que se crea una sola vez, cuando se carga el archivo, y
  después se reutiliza en cada llamada a `formatPrice()` en vez de crear uno nuevo para cada
  precio.
- No lleva `export`: solo se usa dentro de este archivo.

```ts
export function formatPrice(price: number): string {
```

- `export` permite que otros archivos la importen con
  `import { formatPrice } from '../lib/price'` (ver [import-export](../../glosario.md#import-export)).
- `function formatPrice(price: number)`: una función normal de JavaScript con un parámetro,
  `price`. El `: number` es su [tipo](../../glosario.md#tipo): solo acepta números. Si alguien
  le pasa un texto como `'280'`, el [typecheck](../../glosario.md#typecheck) avisa antes de
  ejecutar nada.
- `: string` después del paréntesis es el tipo de lo que **devuelve**: siempre un texto.

```ts
	return `${formatter.format(price)} CUP`;
}
```

- `formatter.format(price)` convierte el número en texto con el formato de `es-ES`.
- Lo de alrededor es un [template literal](../../glosario.md#template-literal): mete ese texto
  dentro de `` `… CUP` ``, con un espacio antes de `CUP`.
- `}` cierra la función.

**Ojo con los números de 4 cifras.** `Intl.NumberFormat('es-ES')` **no** agrupa los números
de 4 cifras; solo pone el punto a partir de 5 cifras. Resultados comprobados con Node
(2026-10-06):

| Llamada | Resultado |
|---|---|
| `formatPrice(280)` | `"280 CUP"` |
| `formatPrice(3400)` | `"3400 CUP"` (sin punto) |
| `formatPrice(12500)` | `"12.500 CUP"` |

No es un error del código: es la regla de ese idioma. En los datos de ejemplo el precio más
alto es 3400 (Muslos de pollo), así que en el catálogo no verás ningún punto; el ejemplo
`12.500 CUP` solo aparece en la guía de estilo `/estilo`. La spec 0004 da por hecho que el
formato `es-ES` se lee con naturalidad en Cuba, y si no, se cambia aquí, en una sola línea.

## Cómo se conecta

- **Entra:** un número, el `price` de un producto (que viene de la tabla `products` de
  Supabase, cargada con [`supabase/seed.sql`](../../supabase/seed.sql.md), ya validado por
  [`src/content.config.ts`](../content.config.ts.md)).
- **Sale hacia:**
  - `src/components/ProductCard.astro`: `{formatPrice(price)}` en cada tarjeta del catálogo.
  - `src/pages/estilo.astro`: en los ejemplos de la guía de estilo, incluido
    `formatPrice(12500)`.
- La spec 0005 exige que el catálogo muestre los precios **solo** a través de esta función.

## Prueba tú

Comprueba tú mismo la regla de las 4 cifras, sin tocar ningún archivo.

1. En la terminal de VS Code, ejecuta:
   ```
   node -e "const f = new Intl.NumberFormat('es-ES'); console.log(f.format(3400), f.format(12500))"
   ```
2. **Qué deberías ver:** `3400 12.500`.
3. Cambia `'es-ES'` por `'en-US'` en el comando y vuelve a ejecutarlo: verás `3,400 12,500`
   (en inglés de EE. UU. la coma separa miles y sí se agrupan las 4 cifras).
4. **Deshacer:** nada; no has cambiado ningún archivo.

## Términos

- [intl-numberformat](../../glosario.md#intl-numberformat)
- [import-export](../../glosario.md#import-export)
- [tipo](../../glosario.md#tipo)
- [typecheck](../../glosario.md#typecheck)
- [template-literal](../../glosario.md#template-literal)
- [esquema](../../glosario.md#esquema)
