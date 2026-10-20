# `supabase/seed.sql`

> **Qué es:** los [datos semilla](../glosario.md#datos-semilla) de la demo: 6 categorías y 18
> productos · **Lo decidió:** [spec 0004](../../../docs/specs/0004-sample-product-data.md) (qué
> datos) y [spec 0013](../../../docs/specs/0013-catalog-data-online.md) (moverlos a Supabase) ·
> **Lo usan:** el dueño, **una vez**, en el [editor SQL](../glosario.md#editor-sql) de Supabase,
> después de [`schema.sql`](schema.sql.md) · **Usa:** las tablas que crea `schema.sql`; las fotos
> de `supabase/seed-photos/`

## Para qué sirve

Es el "inventario" de la demo: qué se vende, a qué precio, en qué presentación y si hay
existencias. Los productos son inventados pero realistas para una tienda de alimentos en Cuba
(decisión del dueño, spec 0004).

Hasta la spec 0013 estos datos estaban en `src/data/categories.json` y `src/data/products.json`.
Ahora viven en las tablas de [Supabase](../glosario.md#supabase), y este archivo es la forma de
cargarlos en un proyecto vacío. Se **generó una sola vez a partir de esos JSON**, antes de
borrarlos, para que cada valor fuera una copia exacta y no algo reescrito a mano (spec 0013). Los
textos, precios y ids son los mismos, así que los clientes ven exactamente el mismo catálogo
(AC4).

Después de cargarlo, la copia "de verdad" de los datos es la de Supabase: si el dueño cambia un
precio en el panel, este archivo no se entera. Sirve para montar la demo desde cero en otro
proyecto.

## El código, por partes

### 1. El comentario de cabecera

```sql
-- Sample catalog of spec 0004: 6 categories, 18 products (spec 0013).
-- Run once in the Supabase dashboard SQL editor, after schema.sql. Running it twice fails on the
-- primary keys on purpose: it is a one-time load. Photos: upload supabase/seed-photos/*.jpg to the
-- product-photos bucket with the same file names.
```

- "Catálogo de ejemplo de la spec 0004: 6 categorías, 18 productos (spec 0013). Ejecútalo una vez
  en el editor SQL del panel de Supabase, después de `schema.sql`. Ejecutarlo dos veces falla a
  propósito por las claves primarias: es una carga de una sola vez. Fotos: sube
  `supabase/seed-photos/*.jpg` al bucket `product-photos` con los mismos nombres de archivo."
- ¿Por qué falla la segunda vez? Porque `id` es la [clave primaria](../glosario.md#clave-primaria)
  de las dos tablas: al intentar insertar otra vez `granos-y-pastas`, Postgres responde que ese
  valor ya existe y no guarda nada. Es mejor así que acabar con el catálogo duplicado.
- `*.jpg` es un [patrón glob](../glosario.md#patron-glob): todos los `.jpg` de esa carpeta.

### 2. Las categorías

```sql
insert into public.categories (id, name, sort_order) values
  ('granos-y-pastas', 'Granos y pastas', 1),
  ('carnicos', 'Cárnicos', 2),
  ('despensa', 'Despensa', 3),
  ('lacteos-y-huevos', 'Lácteos y huevos', 4),
  ('bebidas', 'Bebidas', 5),
  ('aseo', 'Aseo', 6);
```

- `insert into public.categories (id, name, sort_order) values`: "añade filas a la
  [tabla](../glosario.md#tabla-sql) `categories`, rellenando estas tres columnas en este orden".
- Cada línea entre paréntesis es **una fila**, con los valores en el mismo orden que las
  columnas. Las filas se separan con comas y la orden entera termina con `;` después de la última.
- `'granos-y-pastas'`: el `id`, un [slug](../glosario.md#slug). Forma la URL de su página
  (`/categoria/granos-y-pastas`). Los textos van entre comillas simples.
- `'Granos y pastas'`: el nombre que ve el cliente, con mayúscula inicial y acentos
  (`'Cárnicos'`).
- `1`: el `sort_order`, sin comillas porque es un número. Decide el orden de las secciones en la
  portada y de los chips de categorías: 1 va primero. Los huecos en la numeración no importarían;
  solo cuenta cuál es menor.

### 3. Los productos

```sql
insert into public.products (id, name, category_id, price, unit, in_stock, description, photo_path) values
  ('arroz-blanco', 'Arroz blanco', 'granos-y-pastas', 280, '1 lb', true, 'Arroz blanco de grano largo, vendido por libra. Guárdelo en un recipiente cerrado, en un lugar fresco y seco.', 'arroz-blanco.jpg'),
```

- La misma forma: la tabla `products` y sus 8 columnas, en este orden. Aquí va la primera fila,
  copiada tal cual; las otras 17 siguen el mismo patrón.
- `'arroz-blanco'` (`id`): el identificador del producto. Forma la URL de su página
  (`/producto/arroz-blanco`) y da nombre a su foto. No puede repetirse.
- `'Arroz blanco'` (`name`): el nombre que ve el cliente. También es el texto alternativo
  (`alt`) de la foto, así que no hay una columna aparte para eso (spec 0004).
- `'granos-y-pastas'` (`category_id`): a qué categoría pertenece. Tiene que ser uno de los `id`
  del bloque 2: lo exige la [clave foránea](../glosario.md#clave-foranea) de `schema.sql`. Por
  eso las categorías se insertan **antes** que los productos.
- `280` (`price`): el precio en CUP (pesos cubanos) por una unidad. Un número entero, sin
  comillas. Fíjate en que aquí no aparece la moneda: el texto `CUP` lo añade solo `formatPrice()`
  en [`src/lib/price.ts`](../src/lib/price.ts.md), el único sitio del código donde aparece.
- `'1 lb'` (`unit`): lo que compra ese precio (una libra). Texto libre corto: `'1 L'`,
  `'Caja 10 lb'`, `'Unidad'`…
- `true` (`in_stock`): hay existencias. Solo dos valores: `true` (disponible) o `false`
  (agotado), sin comillas. No se guardan cantidades: con menos estados, hay menos cosas que se
  quedan desactualizadas (spec 0004).
- `'Arroz blanco de grano largo, …'` (`description`): de una a tres frases cortas en texto plano
  (sin HTML), de 300 caracteres como mucho. Puede llevar comas: como va entre comillas, la coma no
  separa valores.
- `'arroz-blanco.jpg'` (`photo_path`): el nombre del archivo de la foto dentro del bucket
  `product-photos`. Siempre `<id>.jpg`.
- `),`: cierra la fila; la coma dice que viene otra.

```sql
  ('salchichas', 'Salchichas', 'carnicos', 650, 'Paquete 10 u', false, 'Paquete de 10 salchichas. Listas para hervir, freír o asar. Manténgalas refrigeradas.', 'salchichas.jpg'),
```

- Un producto **agotado**: lo único distinto en significado es `false` en `in_stock`. En el
  catálogo, esta tarjeta muestra la etiqueta "Agotado", la foto atenuada, y va después de los
  productos disponibles de su categoría (spec 0005).
- `'Paquete 10 u'`: la `u` significa "unidades".
- Todos los valores son obligatorios, también en un producto agotado: las columnas son
  `not null` (ver [`schema.sql.md`](schema.sql.md)).

La última fila, la de `'papel-higienico'`, termina en `);` en vez de `),`: ahí acaba la orden.

### 4. El resto de las filas

Los 18 productos, en el orden del archivo (3 por categoría). La columna `price` es el número tal
cual está en el SQL; en la web se ve con [`formatPrice()`](../src/lib/price.ts.md).

| id | category_id | price | unit | in_stock |
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
- Cada `photo_path` es `<id>.jpg`.
- Los precios son ilustrativos (valores plausibles, no un estudio de mercado).

El orden en el archivo no es el orden en la web: las categorías se ordenan por `sort_order` y,
dentro de cada una, los productos por disponibilidad y luego por nombre (lo hace
[`src/lib/catalog.ts`](../src/lib/catalog.ts.md)).

### 5. Las fotos

Las fotos no van en el SQL: son archivos. Están en `supabase/seed-photos/` (18 `.jpg` y su
`CREDITS.md`, con el autor y la licencia de cada una), y el dueño las sube una vez al bucket
`product-photos` desde el panel de Supabase, con el mismo nombre (`arroz-blanco.jpg`). Así cada
`photo_path` de la tabla encuentra su archivo
([Storage y bucket](../glosario.md#storage-y-bucket)).

## Cómo se conecta

- **Antes:** [`schema.sql`](schema.sql.md) tiene que haber creado las tablas y el bucket.
- **Lo lee** [`src/lib/supabase.ts`](../src/lib/supabase.ts.md) en cada build, a través de la
  [API REST](../glosario.md#api-rest); los loaders de
  [`src/content.config.ts`](../src/content.config.ts.md) lo convierten en las colecciones
  `categories` y `products`.
- **Sale hacia** [`src/lib/catalog.ts`](../src/lib/catalog.ts.md) (agrupa y ordena), que alimenta
  la portada y las páginas de categoría; cada producto se dibuja con `ProductCard.astro` y tiene
  su página en `src/pages/producto/[id].astro`.
- **Ninguna página** lee Supabase directamente: siempre pasan por las colecciones.

## Prueba tú

Mira los datos donde viven ahora, sin cambiar nada:

1. En el panel de Supabase, abre *SQL Editor* y ejecuta:

   ```sql
   select id, price from public.products order by price desc limit 3;
   ```

   `select` lee columnas, `order by price desc` ordena por precio de mayor a menor y `limit 3` se
   queda con las 3 primeras filas.
2. **Qué deberías ver:** `muslos-de-pollo` (3400), `huevos` (3000) y `leche-en-polvo` (2800), los
   mismos números de la tabla del bloque 4.
3. No hay nada que deshacer: `select` solo lee. (Si además abres *Table Editor* → `products`,
   verás las mismas filas en forma de hoja de cálculo.)

## Términos

- [datos-semilla](../glosario.md#datos-semilla) · [editor-sql](../glosario.md#editor-sql) ·
  [tabla-sql](../glosario.md#tabla-sql) · [clave-primaria](../glosario.md#clave-primaria) ·
  [clave-foranea](../glosario.md#clave-foranea) · [supabase](../glosario.md#supabase) ·
  [storage-y-bucket](../glosario.md#storage-y-bucket) · [api-rest](../glosario.md#api-rest) (nuevos)
- [slug](../glosario.md#slug) · [patron-glob](../glosario.md#patron-glob)
