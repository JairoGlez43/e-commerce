# `src/data/categories.json`

> **Qué es:** la lista de las 6 categorías de la tienda · **Lo decidió:** [spec 0004](../../../../docs/specs/0004-sample-product-data.md) · **Lo usan:** `src/content.config.ts` (dos veces: como datos de la colección `categories` y para comprobar la categoría de cada producto) · **Usa:** nada

## Para qué sirve

Guarda las categorías (Cárnicos, Bebidas…) como **datos**, no como código. Así el nombre que ve
el cliente y el orden de las secciones se cambian aquí, sin tocar ninguna página. Es la única
lista de categorías del proyecto: si una categoría no está aquí, no existe.

Piensa en él como una tabla `categories` de una base de datos hecha a mano: cada objeto es una
fila y `id` es su clave primaria. Los productos apuntan a una de estas filas por su `id`, como
una clave foránea (ver [reference](../../glosario.md#reference)).

## El código, por partes

```json
[
```

- `[` abre una lista (un *array* de JSON). Cada elemento de la lista es una categoría.

```json
	{ "id": "granos-y-pastas", "name": "Granos y pastas", "order": 1 },
	{ "id": "carnicos", "name": "Cárnicos", "order": 2 },
	{ "id": "despensa", "name": "Despensa", "order": 3 },
	{ "id": "lacteos-y-huevos", "name": "Lácteos y huevos", "order": 4 },
	{ "id": "bebidas", "name": "Bebidas", "order": 5 },
	{ "id": "aseo", "name": "Aseo", "order": 6 }
```

Las 6 líneas siguen el mismo patrón: un objeto por categoría, con tres campos.

- `"id"`: el identificador de la categoría, escrito como [slug](../../glosario.md#slug)
  (minúsculas, sin acentos, palabras unidas con guiones). Sirve para tres cosas:
  - Astro lo usa como `id` de la [entrada](../../glosario.md#entrada) de la colección.
  - Cada producto de `products.json` lo repite en su campo `"category"` para decir a qué
    categoría pertenece (por eso `"carnicos"` va sin tilde: es una clave, no un texto para
    leer).
  - Forma la URL de la página de esa categoría: `/categoria/carnicos`.
- `"name"`: el texto que ve el cliente, con tildes y mayúscula inicial (`"Cárnicos"`). Sale en
  los chips de categoría y en el título de cada sección.
- `"order"`: un número entero que fija en qué posición se muestra la categoría, de menor a
  mayor. Granos y pastas (1) va primero; Aseo (6), último. El orden en que están escritas las
  líneas en el archivo no importa: manda este número (lo aplica `src/lib/catalog.ts`).

```json
]
```

- `]` cierra la lista.

Las reglas que debe cumplir cada campo (por ejemplo, que `name` tenga como máximo 30 letras)
no están aquí: están en el [esquema](../../glosario.md#esquema) de
[`src/content.config.ts`](../content.config.ts.md). Si escribes una categoría que las rompe,
el [build](../../glosario.md#build) falla.

## Cómo se conecta

- **Entra:** nada; lo escribe una persona a mano.
- **Sale hacia** [`src/content.config.ts`](../content.config.ts.md), de dos formas:
  1. El [loader](../../glosario.md#loader) `file('src/data/categories.json')` lo lee y crea
     la [colección](../../glosario.md#content-collection) `categories`.
  2. Un `import categoryData from './data/categories.json'` lo lee **otra vez** para sacar la
     lista de `id` válidos y rechazar productos con una categoría que no existe (el porqué
     está explicado en ese archivo).
- Después, [`src/lib/catalog.ts`](../lib/catalog.ts.md) pide la colección con
  [getCollection](../../glosario.md#getcollection), la ordena por `order` y la entrega a las
  páginas `src/pages/index.astro` y `src/pages/categoria/[id].astro`, y al componente
  `src/components/CategoryNav.astro`. La guía de estilo `src/pages/estilo.astro` también la
  lee directamente con `getCollection`.
- Ninguna página importa este JSON directamente (regla de la spec 0001; ver la lección
  [01 · Astro](../../../01-astro.md)).

## Prueba tú

Cambia el orden de una categoría y mira cómo se mueve en la portada.

1. En la línea de `"aseo"`, cambia `"order": 6` por `"order": 0`.
2. Ejecuta `pnpm dev` y abre `http://localhost:4321`.
3. **Qué deberías ver:** la sección "Aseo" aparece la primera, y su chip va justo después de
   "Todos". El `0` es válido porque el esquema pide un entero **no negativo** (0 o más).
4. **Deshacer:** vuelve a poner `"order": 6` y guarda.

## Términos

- [slug](../../glosario.md#slug)
- [entrada](../../glosario.md#entrada)
- [reference](../../glosario.md#reference)
- [esquema](../../glosario.md#esquema)
- [build](../../glosario.md#build)
- [loader](../../glosario.md#loader)
- [content-collection](../../glosario.md#content-collection)
- [getcollection](../../glosario.md#getcollection)
