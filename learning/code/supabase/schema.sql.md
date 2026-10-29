# `supabase/schema.sql`

> **Qué es:** el SQL que crea las dos tablas del catálogo, sus permisos de lectura y el bucket de
> las fotos · **Lo decidió:** [spec 0013](../../../docs/specs/0013-catalog-data-online.md)
> (secciones Tables, Access y Bucket), con las reglas de los datos de la
> [spec 0004](../../../docs/specs/0004-sample-product-data.md) · **Lo usan:** el dueño, **una
> vez**, en el [editor SQL](../glosario.md#editor-sql) de Supabase, antes de
> [`seed.sql`](seed.sql.md); después, [`src/lib/supabase.ts`](../src/lib/supabase.ts.md) lee esas
> tablas en cada build · **Usa:** nada

## Para qué sirve

Hasta la spec 0013, los datos estaban en dos archivos JSON dentro de `src/data/`. Ahora viven en
la base de datos [Postgres](../glosario.md#postgres) de [Supabase](../glosario.md#supabase), para
que el futuro panel del dueño (features 11–15) pueda cambiarlos sin tocar código. Este archivo
prepara ese sitio: crea las [tablas](../glosario.md#tabla-sql) `categories` y `products`, decide
quién puede leerlas y escribirlas, y crea el almacén de las fotos.

No se ejecuta solo ni lo lee Astro: es una receta que el dueño pega en el panel de Supabase y
ejecuta una vez. Está en el repo para que la demo se pueda montar igual en cualquier proyecto
nuevo de Supabase (por ejemplo, el de cada tienda que compre el sitio).

Las reglas de las columnas copian el esquema de zod de
[`content.config.ts`](../src/content.config.ts.md). Así hay dos porteros: la base de datos
rechaza un dato malo **al guardarlo**, y el build lo rechaza **al leerlo**.

## El código, por partes

### 1. El comentario de cabecera

```sql
-- Catalog tables, read access and the photo bucket (spec 0013).
-- Run once in the Supabase dashboard SQL editor, before seed.sql.
-- The column rules mirror the zod schema of spec 0004, so bad data is refused by the database too.
```

- En SQL, `--` empieza un comentario hasta el final de la línea (como `//` en JavaScript).
- "Tablas del catálogo, acceso de lectura y el bucket de fotos (spec 0013). Ejecútalo una vez en
  el editor SQL del panel de Supabase, antes de `seed.sql`. Las reglas de las columnas copian el
  esquema de zod de la spec 0004, así la base de datos también rechaza los datos malos."

### 2. La tabla `categories`

```sql
create table public.categories (
  id         text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null check (char_length(name) between 1 and 30),
  -- "order" is an SQL keyword; the build maps sort_order back to `order`.
  sort_order integer not null check (sort_order >= 0)
);
```

- `create table public.categories (`: crea la tabla `categories` dentro del
  [esquema](../glosario.md#esquema-sql) `public`, el que Supabase expone en su
  [API REST](../glosario.md#api-rest). Entre los paréntesis va una columna por línea, separadas
  por comas (la última no lleva). Los espacios que alinean las columnas son solo para leer mejor.
- `id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),`:
  - `id text`: la columna `id`, de tipo texto.
  - `primary key`: es la [clave primaria](../glosario.md#clave-primaria): obligatoria y sin
    repetirse. Dos categorías no pueden tener el mismo `id`.
  - `check (id ~ '…')`: una [restricción CHECK](../glosario.md#restriccion-check). En Postgres,
    `~` significa "encaja con esta [expresión regular](../glosario.md#expresion-regular)". Es la
    **misma** expresión del [slug](../glosario.md#slug) que usa zod: `granos-y-pastas` entra,
    `Granos Y Pastas` no.
- `name text not null check (char_length(name) between 1 and 30),`:
  - `not null`: obligatoria; una fila sin nombre se rechaza.
  - `char_length(name)`: cuántos caracteres tiene el texto. `between 1 and 30` = de 1 a 30,
    ambos incluidos. Igual que `z.string().min(1).max(30)`.
- El comentario: "`order` es una palabra reservada de SQL; el build traduce `sort_order` de
  vuelta a `order`." `order` ya significa algo en SQL (`order by` = ordenar), así que usarlo como
  nombre de columna obliga a escribirlo siempre entre comillas. Es más sencillo llamarlo de otra
  forma; el loader de `content.config.ts` le devuelve su nombre.
- `sort_order integer not null check (sort_order >= 0)`: un número entero (`integer`),
  obligatorio y 0 o más. Igual que `z.number().int().nonnegative()`. Sin coma: es la última
  columna.
- `);`: cierra la lista de columnas y termina la orden.

### 3. La tabla `products`

```sql
create table public.products (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 1 and 60),
  -- A category that still has products cannot be deleted.
  category_id text not null references public.categories (id) on delete restrict,
```

- `create table public.products (`: la segunda tabla, también en `public`.
- `id …`: igual que en `categories`: texto, clave primaria, formato slug.
- `name …`: obligatorio, de 1 a 60 caracteres (los nombres de producto pueden ser más largos que
  los de categoría).
- El comentario: "No se puede borrar una categoría que todavía tiene productos."
- `category_id text not null references public.categories (id) on delete restrict,`:
  - `category_id text not null`: el id de la categoría del producto; obligatorio. Se llama
    `category_id` (en [snake_case](../glosario.md#snake-case)) porque guarda un id; el loader lo
    entrega como `category`.
  - `references public.categories (id)`: es una [clave foránea](../glosario.md#clave-foranea).
    El valor tiene que existir en la columna `id` de `categories`. Un producto con
    `category_id = 'verduras'` se rechaza, porque esa categoría no existe.
  - `on delete restrict`: si alguien intenta borrar una categoría que aún tiene productos, Postgres
    lo impide. La feature 15 (editar categorías) se apoya en esto.

```sql
  price       integer not null check (price > 0),
  unit        text not null check (char_length(unit) between 1 and 30),
  in_stock    boolean not null default true,
  description text not null check (char_length(description) between 1 and 300),
  -- Object path inside the product-photos bucket, e.g. "arroz-blanco.jpg".
  photo_path  text not null check (char_length(photo_path) > 0)
);
```

- `price integer not null check (price > 0),`: el precio en CUP, entero, obligatorio y mayor que
  0. Igual que `z.number().int().positive()`.
- `unit text not null check (… between 1 and 30),`: la presentación ("1 lb"), de 1 a 30
  caracteres.
- `in_stock boolean not null default true,`: `true` o `false`, obligatorio. `default true` = si
  al insertar una fila no se dice nada, el producto queda disponible. (`seed.sql` lo da siempre,
  así que allí no se usa el valor por defecto.)
- `description text not null check (… between 1 and 300),`: la descripción, de 1 a 300
  caracteres.
- El comentario: "Ruta del objeto dentro del bucket `product-photos`, por ejemplo
  `arroz-blanco.jpg`."
- `photo_path text not null check (char_length(photo_path) > 0)`: el **nombre del archivo** de la
  foto, no la URL entera. La URL depende del proyecto de Supabase (`https://<ref>.supabase.co/…`);
  guardando solo el nombre, el mismo `seed.sql` sirve para el proyecto de cualquier tienda. La URL
  la arma `photoUrl()` en [`supabase.ts`](../src/lib/supabase.ts.md). Desde la spec 0015, el
  `not null` se quita en [`products-write.sql`](products-write.sql.md): un producto puede no tener
  foto (`null`), y el `check` sigue rechazando un texto vacío.
- `);`: cierra la tabla.

Fíjate en lo que **no** hay: ni fecha de creación ni marca de "borrador". La spec 0013 lo deja
para la feature 13, si publicar lo necesita.

### 4. Quién puede leer y escribir

```sql
-- Everyone may read the catalog. There are no write policies, so with RLS on every write
-- through the public key is refused (the owner's write policies come with features 11/12).
-- The grants are explicit because new Supabase projects may not expose tables by default.
```

- "Todo el mundo puede leer el catálogo. No hay políticas de escritura, así que, con RLS
  activo, cualquier escritura con la clave pública se rechaza (las políticas de escritura del
  dueño llegan con las features 11 y 12). Los `grant` están escritos a mano porque los proyectos
  nuevos de Supabase pueden no exponer las tablas por defecto."
- ¿Por qué importa? La [clave publishable](../glosario.md#clave-publishable) que usa el build es
  pública. Si esa clave pudiera escribir, cualquiera podría cambiar precios. Las tres líneas
  siguientes, repetidas para cada tabla, lo impiden.

```sql
alter table public.categories enable row level security;
grant select on table public.categories to anon, authenticated;
create policy "categories are public to read" on public.categories
  for select to anon, authenticated using (true);
```

- `alter table public.categories enable row level security;`: `alter table` cambia una tabla que
  ya existe. Aquí activa [RLS](../glosario.md#rls): desde ahora, a través de la API no se ve ni
  se cambia ninguna fila salvo lo que permita una política.
- `grant select on table public.categories to anon, authenticated;`: el [grant](../glosario.md#grant)
  da permiso de **leer** (`select`) la tabla a los dos [roles](../glosario.md#rol) de la API:
  `anon` (cualquiera con la clave publishable, como nuestro build) y `authenticated` (un usuario
  con sesión iniciada, como será el dueño). No da permiso de escribir.
- `create policy "categories are public to read" on public.categories`: crea una
  [política](../glosario.md#politica) con ese nombre ("las categorías se pueden leer
  públicamente") sobre la tabla. El nombre es solo una etiqueta para reconocerla en el panel.
- `for select to anon, authenticated using (true);`: la regla: para **leer**, a esos dos roles,
  enseña las filas en las que `using (…)` sea verdadero. `true` lo es siempre, así que se ven
  todas. Ocupa dos líneas, pero es una sola orden: termina en el `;`.
- Lo que falta a propósito: no hay políticas `for insert`, `for update` ni `for delete`. Con RLS
  activo, una acción sin política está prohibida. Por eso un `POST`, `PATCH` o `DELETE` a la API
  con la clave publishable se rechaza (spec 0013, AC1). Desde la spec 0015, la tabla `products`
  sí tiene políticas de escritura, pero solo para el dueño con sesión; están en
  [`products-write.sql`](products-write.sql.md). Con la clave publishable sola, escribir sigue
  prohibido.

Hacen falta las dos puertas: sin el `grant`, Postgres rechaza la lectura con el error `42501`;
sin la política, la lectura funciona pero devuelve una lista vacía. Las dos cosas pararían el
build (ver el bloque 5 de [`supabase.ts.md`](../src/lib/supabase.ts.md)).

```sql
alter table public.products enable row level security;
grant select on table public.products to anon, authenticated;
create policy "products are public to read" on public.products
  for select to anon, authenticated using (true);
```

- Exactamente lo mismo para la tabla `products`: RLS activo, permiso de lectura y una política
  que deja leer todas las filas ("los productos se pueden leer públicamente").

### 5. El bucket de las fotos

```sql
-- Public bucket: anyone can read a photo by its URL. No upload policies yet (feature 14).
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true);
```

- El comentario: "Bucket público: cualquiera puede ver una foto por su URL. Todavía no hay
  políticas de subida (feature 14)." Esas políticas llegaron con la spec 0017, en
  [`photos.sql`](photos.sql.md).
- `insert into storage.buckets (id, name, public)`: Supabase guarda la lista de
  [buckets](../glosario.md#storage-y-bucket) en una tabla suya, `buckets`, del esquema
  `storage`. Crear un bucket es tan simple como añadirle una fila. `insert into tabla (columnas)`
  dice en qué tabla y qué columnas se van a rellenar, en ese orden.
- `values ('product-photos', 'product-photos', true);`: los valores, en el mismo orden que las
  columnas: `id` y `name` son los dos `'product-photos'`, y `public` es `true`: cualquiera puede
  descargar una foto por su URL, sin clave. Hace falta para que el build las descargue, y no
  expone nada privado: son fotos de un catálogo público.
- Sin políticas de subida, la clave publishable no puede subir ni borrar fotos. El dueño subió
  las 18 fotos de ejemplo desde el panel de Supabase, que trabaja con permisos de dueño del
  proyecto (spec 0013).

## Cómo se conecta

- **Orden de montaje** (spec 0013, tarea T2): 1) este archivo en el editor SQL; 2)
  [`seed.sql`](seed.sql.md), que llena las tablas; 3) subir las fotos de
  `supabase/seed-photos/` al bucket `product-photos`, con el mismo nombre de archivo. Después
  vienen [`auth.sql`](auth.sql.md) (spec 0014) y [`products-write.sql`](products-write.sql.md)
  (spec 0015).
- **Lo lee** [`src/lib/supabase.ts`](../src/lib/supabase.ts.md) en cada build, a través de la API
  REST: `select` de las dos tablas con la clave publishable, y las URLs públicas del bucket.
- **Las fotos** solo se pueden descargar y optimizar porque
  [`astro.config.mjs`](../astro.config.mjs.md) permite la ruta
  `/storage/v1/object/public/product-photos/**`.
- **Las reglas** son un espejo del esquema de zod de
  [`src/content.config.ts`](../src/content.config.ts.md). Si algún día cambia una (por ejemplo,
  nombres de hasta 80 caracteres), hay que cambiar las dos, y eso lo decide una spec nueva.

## Prueba tú

Comprueba que la base de datos rechaza un dato malo, sin cambiar nada:

1. En el panel de Supabase, abre *SQL Editor* y pega esta orden, que intenta guardar un producto
   con precio 0:

   ```sql
   insert into public.products (id, name, category_id, price, unit, description, photo_path)
   values ('prueba', 'Prueba', 'aseo', 0, '1 u', 'Producto de prueba.', 'prueba.jpg');
   ```

2. Pulsa *Run*. **Qué deberías ver:** un error que dice que la nueva fila viola la restricción
   `products_price_check` (el nombre que Postgres le puso al `check (price > 0)`). No se guarda
   nada.
3. Cambia el `0` por `100` y `'aseo'` por `'verduras'`, y vuelve a ejecutar. Ahora el error es de
   la clave foránea, `products_category_id_fkey`: la categoría `verduras` no existe.
4. No hay nada que deshacer: las dos órdenes fallaron, así que la tabla no cambió. **No**
   ejecutes `schema.sql` otra vez: fallaría porque las tablas ya existen.

## Términos

- [supabase](../glosario.md#supabase) · [postgres](../glosario.md#postgres) ·
  [editor-sql](../glosario.md#editor-sql) · [tabla-sql](../glosario.md#tabla-sql) ·
  [esquema-sql](../glosario.md#esquema-sql) · [snake-case](../glosario.md#snake-case) (nuevos)
- [clave-primaria](../glosario.md#clave-primaria) ·
  [restriccion-check](../glosario.md#restriccion-check) ·
  [clave-foranea](../glosario.md#clave-foranea) (nuevos)
- [api-rest](../glosario.md#api-rest) · [clave-publishable](../glosario.md#clave-publishable) ·
  [rol](../glosario.md#rol) · [grant](../glosario.md#grant) · [rls](../glosario.md#rls) ·
  [politica](../glosario.md#politica) · [storage-y-bucket](../glosario.md#storage-y-bucket) (nuevos)
- [expresion-regular](../glosario.md#expresion-regular) · [slug](../glosario.md#slug) ·
  [esquema](../glosario.md#esquema) · [zod](../glosario.md#zod)
