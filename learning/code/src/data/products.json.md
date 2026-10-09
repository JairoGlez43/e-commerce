# `src/data/products.json`

> **Qué es:** los 18 productos de ejemplo de la demo · **Lo decidió:** [spec 0004](../../../../docs/specs/0004-sample-product-data.md) · **Lo usan:** `src/content.config.ts` (lo carga como la colección `products`) · **Usa:** los `id` de [`categories.json`](categories.json.md) y las fotos de `src/assets/products/`

## Para qué sirve

Es el "inventario" de la demo: qué se vende, a qué precio, en qué presentación y si hay
existencias. Los productos son inventados pero realistas para una tienda de alimentos en
Cuba (decisión del dueño, spec 0004). Cuando el dueño compre el sitio, estos datos vendrán de
otro sitio, pero tendrán que tener **esta misma forma**.

## El código, por partes

El archivo es una lista de 18 objetos, todos con los mismos 8 campos. Aquí van dos de ellos,
copiados tal cual: un producto **disponible** (el primero del archivo) y uno **agotado**. El
resto sigue exactamente el mismo patrón y se resume en una tabla al final.

### Un producto disponible

```json
[
	{
		"id": "arroz-blanco",
		"name": "Arroz blanco",
		"category": "granos-y-pastas",
		"price": 280,
		"unit": "1 lb",
		"inStock": true,
		"description": "Arroz blanco de grano largo, vendido por libra. Guárdelo en un recipiente cerrado, en un lugar fresco y seco.",
		"photo": "../assets/products/arroz-blanco.jpg"
	},
```

- `[`: abre la lista de productos (se cierra con `]` al final del archivo).
- `{` … `},`: un producto. La coma separa este objeto del siguiente.
- `"id": "arroz-blanco"`: el identificador del producto, en formato
  [slug](../../glosario.md#slug). Astro lo usa como `id` de la
  [entrada](../../glosario.md#entrada), y forma la URL de su página: `/producto/arroz-blanco`.
  También da nombre a la foto (`arroz-blanco.jpg`). No puede repetirse.
- `"name": "Arroz blanco"`: el nombre que ve el cliente, en español. También es el texto
  alternativo (`alt`) de la foto, así que no hay un campo aparte para eso (spec 0004).
- `"category": "granos-y-pastas"`: a qué categoría pertenece. Debe ser uno de los `id` de
  [`categories.json`](categories.json.md), igual que una clave foránea apunta a una fila que
  existe. Si escribes uno que no existe, el [build](../../glosario.md#build) falla (lo
  comprueba [`src/content.config.ts`](../content.config.ts.md)).
- `"price": 280`: el precio en CUP (pesos cubanos) por una `unit`. Es un número entero, sin
  comillas y sin decimales. Fíjate en que aquí **no** aparece la moneda: el texto `CUP` lo
  añade solo `formatPrice()` en [`src/lib/price.ts`](../lib/price.ts.md), el único sitio del
  código donde aparece la moneda.
- `"unit": "1 lb"`: lo que compra ese precio (una libra). Es texto libre corto: `"1 L"`,
  `"Caja 10 lb"`, `"Unidad"`…
- `"inStock": true`: si hay existencias. Solo dos valores posibles: `true` (disponible) o
  `false` (agotado). No se guardan cantidades: el dueño lo actualizará a mano, y con menos
  estados hay menos cosas que se quedan desactualizadas (spec 0004).
- `"description": "…"`: de una a tres frases cortas en texto plano (sin HTML) con qué es, su
  presentación y un consejo de uso o conservación. Máximo 300 caracteres.
- `"photo": "../assets/products/arroz-blanco.jpg"`: la ruta a la foto. Es **relativa a este
  JSON**: desde `src/data/`, `../` sube a `src/` y luego entra en `assets/products/`. Así que
  apunta a `src/assets/products/arroz-blanco.jpg`. La foto no está en `public/` porque Astro
  la optimiza en el build (spec 0001).

### Un producto agotado

```json
	{
		"id": "salchichas",
		"name": "Salchichas",
		"category": "carnicos",
		"price": 650,
		"unit": "Paquete 10 u",
		"inStock": false,
		"description": "Paquete de 10 salchichas. Listas para hervir, freír o asar. Manténgalas refrigeradas.",
		"photo": "../assets/products/salchichas.jpg"
	},
```

- Mismos 8 campos, mismo orden. Lo único distinto en significado es `"inStock": false`: en el
  catálogo, esta tarjeta muestra la etiqueta "Agotado", la foto más clara y se coloca después
  de los productos disponibles de su categoría (spec 0005).
- `"unit": "Paquete 10 u"`: la `u` significa "unidades".
- Todos los campos son **obligatorios**: ninguno se puede omitir, tampoco en un producto
  agotado.

### El resto del archivo

Los 18 productos, en el orden en que aparecen en el archivo (3 por categoría). La columna
`price` es el número tal cual está en el JSON; en la web se ve con
[`formatPrice()`](../lib/price.ts.md).

| id | category | price | unit | inStock |
|---|---|---|---|---|
| `arroz-blanco` | `granos-y-pastas` | 280 | 1 lb | `true` |
| `frijoles-negros` | `granos-y-pastas` | 380 | 1 lb | `true` |
| `espaguetis` | `granos-y-pastas` | 320 | Paquete 500 g | `true` |
| `muslos-de-pollo` | `carnicos` | 3400 | Caja 10 lb | `true` |
| `picadillo-de-res` | `carnicos` | 450 | 1 lb | `true` |
| `salchichas` | `carnicos` | 650 | Paquete 10 u | `false` |
| `aceite-de-girasol` | `despensa` | 950 | 1 L | `true` |
| `azucar-blanca` | `despensa` | 250 | 1 lb | `true` |
| `pure-de-tomate` | `despensa` | 300 | Lata 400 g | `true` |
| `huevos` | `lacteos-y-huevos` | 3000 | Cartón 30 u | `true` |
| `leche-en-polvo` | `lacteos-y-huevos` | 2800 | Bolsa 1 kg | `false` |
| `queso-gouda` | `lacteos-y-huevos` | 1500 | 1 lb | `true` |
| `refresco-de-cola` | `bebidas` | 200 | Lata 355 ml | `true` |
| `cerveza-clara` | `bebidas` | 240 | Lata 355 ml | `true` |
| `malta` | `bebidas` | 220 | Lata 355 ml | `true` |
| `jabon-de-bano` | `aseo` | 180 | Unidad | `true` |
| `detergente-en-polvo` | `aseo` | 900 | Bolsa 1 kg | `true` |
| `papel-higienico` | `aseo` | 600 | Paquete 4 u | `true` |

Cosas que fija la spec 0004 y puedes comprobar en la tabla:

- Exactamente 2 productos agotados, y en categorías distintas (`salchichas` en Cárnicos,
  `leche-en-polvo` en Lácteos y huevos).
- Cada `photo` es `../assets/products/<id>.jpg`, siempre con el mismo nombre que el `id`.
- Los precios son ilustrativos (valores plausibles, no un estudio de mercado).
- El archivo termina con `]`, que cierra la lista abierta en la primera línea.

El orden en el archivo no es el orden en la web: las categorías se ordenan por su `order` y,
dentro de cada una, los productos por disponibilidad y luego por nombre (lo hace
[`src/lib/catalog.ts`](../lib/catalog.ts.md)).

## Cómo se conecta

- **Entra:** los `id` de [`categories.json`](categories.json.md) (en el campo `category`) y
  las fotos de `src/assets/products/` (en el campo `photo`).
- **Lo lee** [`src/content.config.ts`](../content.config.ts.md) con el
  [loader](../../glosario.md#loader) `file('src/data/products.json')`, que comprueba cada
  producto contra el [esquema](../../glosario.md#esquema) y crea la
  [colección](../../glosario.md#content-collection) `products`.
- **Sale hacia** [`src/lib/catalog.ts`](../lib/catalog.ts.md) (agrupa y ordena), que alimenta
  `src/pages/index.astro` y `src/pages/categoria/[id].astro`; cada producto se dibuja con
  `src/components/ProductCard.astro`. La guía `src/pages/estilo.astro` también lo lee con
  [getCollection](../../glosario.md#getcollection).
- Ninguna página importa este JSON directamente: siempre pasan por la colección (ver la
  lección [01 · Astro](../../../01-astro.md)).

## Prueba tú

Marca un producto como agotado y mira cómo cambia de sitio.

1. En el producto `"arroz-blanco"`, cambia `"inStock": true` por `"inStock": false`.
2. Ejecuta `pnpm dev` y abre `http://localhost:4321`.
3. **Qué deberías ver:** en "Granos y pastas", Arroz blanco pasa de ser el primero a ser el
   último (después de Espaguetis y Frijoles negros), con la etiqueta "Agotado" y la foto más
   clara.
4. **Deshacer:** vuelve a poner `"inStock": true` y guarda.

## Términos

- [slug](../../glosario.md#slug)
- [entrada](../../glosario.md#entrada)
- [build](../../glosario.md#build)
- [loader](../../glosario.md#loader)
- [esquema](../../glosario.md#esquema)
- [content-collection](../../glosario.md#content-collection)
- [getcollection](../../glosario.md#getcollection)
