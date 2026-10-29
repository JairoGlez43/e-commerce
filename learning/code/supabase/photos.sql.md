# `supabase/photos.sql`

> **Qué es:** el SQL que deja al dueño, y solo al dueño, subir y borrar fotos en el bucket
> `product-photos`, y que hace que el bucket rechace lo que no sea un JPEG de hasta 2 MB · **Lo
> decidió:** [spec 0017](../../../docs/specs/0017-product-photos-upload.md) (Decision y Design →
> `supabase/photos.sql`) · **Lo usan:** el dueño, **una vez** por tienda, en el
> [editor SQL](../glosario.md#editor-sql) de Supabase, después de [`publish.sql`](publish.sql.md);
> a partir de ahí, Supabase Storage revisa con estas reglas cada subida y cada borrado que hace
> [`src/lib/photos.ts`](../src/lib/photos.ts.md) · **Usa:** el bucket `product-photos` de
> [`schema.sql`](schema.sql.md) y la función `public.is_owner()` de [`auth.sql`](auth.sql.md)

## Para qué sirve

[`schema.sql`](schema.sql.md#5-el-bucket-de-las-fotos) creó el bucket de las fotos como
**público**: cualquiera puede ver una foto por su URL, pero nadie podía subir ni borrar, porque
no había ninguna regla que lo dejara. Con la feature 14, el dueño sube fotos desde `/admin/`.
Este archivo hace dos cosas:

1. **Pone límites al bucket:** solo acepta archivos JPEG, de 2 MB como mucho. La administración
   siempre manda JPEG de unos cientos de KB, así que esto solo frena lo que no debería llegar
   nunca.
2. **Crea las [políticas de Storage](../glosario.md#politicas-de-storage):** subir, ver la fila
   de un archivo y borrar, solo para el dueño (`is_owner()`), solo en este bucket y, al subir,
   solo con un nombre que cumpla la regla `arroz-blanco-3f9a0c7e.jpg`.

Es la protección de verdad. [`photos.ts`](../src/lib/photos.ts.md) reduce y nombra bien las
fotos, pero corre en el navegador: alguien podría cambiarlo. Estas reglas viven en Supabase y no
se pueden saltar desde fuera. Como los otros `.sql`, Astro no lo lee ni lo ejecuta: el dueño lo
pega en el editor SQL y pulsa *Run* una vez.

## El código, por partes

### 1. La cabecera

```sql
-- The owner's photo uploads (spec 0017). Run once in the Supabase dashboard SQL editor, after
-- publish.sql. Public reads stay as they are (schema.sql): the bucket is public, so a photo's
-- public URL needs no policy.
--
-- Check first that the bucket has these columns (spec 0017, T1); if not, stop:
--   select id, file_size_limit, allowed_mime_types from storage.buckets;
```

- "Las subidas de fotos del dueño (spec 0017). Ejecútalo una vez en el editor SQL del panel de
  Supabase, después de `publish.sql`. Las lecturas públicas siguen como estaban (`schema.sql`): el
  bucket es público, así que la URL pública de una foto no necesita política."
- El orden de una tienda nueva queda: `schema.sql` → `seed.sql` → `auth.sql` →
  `products-write.sql` → `publish.sql` → `photos.sql`. Importa porque las políticas usan
  `is_owner()`, que crea `auth.sql`, y el bucket lo crea `schema.sql`.
- "Comprueba primero que el bucket tiene estas columnas (spec 0017, T1); si no, para:" y la
  consulta, comentada con `--` para que no se ejecute con el archivo. `storage.buckets` es la
  tabla donde Supabase guarda sus buckets, una fila por bucket. La consulta solo lee. Por qué
  comprobarlo: los nombres `file_size_limit` y `allowed_mime_types` no salían confirmados en la
  documentación (según la spec), y si no existieran, el `update` de abajo fallaría.

### 2. Los límites del bucket

```sql

-- The bucket refuses what the admin never sends: anything but JPEG, or over 2 MB.
update storage.buckets
  set file_size_limit = 2097152, allowed_mime_types = array['image/jpeg']
  where id = 'product-photos';
```

- El comentario: "El bucket rechaza lo que la administración nunca manda: cualquier cosa que no
  sea JPEG, o de más de 2 MB."
- `update storage.buckets set … where id = 'product-photos'`: cambia la fila de **este** bucket
  en la tabla de buckets. El `where` hace que solo cambie esa fila.
- `file_size_limit = 2097152`: el tamaño máximo de un archivo, en bytes. 2 MB = 2 × 1024 × 1024 =
  2 097 152.
- `allowed_mime_types = array['image/jpeg']`: los tipos de archivo admitidos. `array[…]` es una
  lista en SQL; aquí, de un solo tipo. `image/jpeg` es el nombre estándar del tipo JPEG (el mismo
  que va en la cabecera `Content-Type`).
- Esto no es una [política](../glosario.md#politica): vale para **todos**, también para el dueño.
  Si un día una foto mayor llegara al bucket, Storage la rechazaría y la página diría "Error del
  sistema, no es culpa tuya…" ([`photos.ts.md`](../src/lib/photos.ts.md)).

### 3. La política de subir

```sql

-- Names follow the upload rule <id>-<8 hex>.jpg (seed photos, <id>.jpg, match it too). Nothing
-- is ever overwritten, so there is no update policy.
create policy "owner uploads photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-photos' and public.is_owner()
              and name ~ '^[a-z0-9]+(-[a-z0-9]+)*\.jpg$');
```

- El comentario: "Los nombres siguen la regla de subida `<id>-<8 hex>.jpg` (las fotos de ejemplo,
  `<id>.jpg`, también la cumplen). Nunca se sobrescribe nada, así que no hay política de
  `update`."
- `create policy "owner uploads photos" on storage.objects`: una
  [política](../glosario.md#politica-de-escritura) llamada "el dueño sube fotos" sobre la tabla
  de archivos de Storage ([políticas de Storage](../glosario.md#politicas-de-storage)).
- `for insert to authenticated`: para crear filas, es decir, **subir** un archivo; solo para
  peticiones con sesión ([rol](../glosario.md#rol) `authenticated`). Una subida con solo la
  [clave publishable](../glosario.md#clave-publishable) (rol `anon`) no tiene política y se
  rechaza.
- `with check (…)`: la condición que tiene que cumplir el archivo nuevo. Tres a la vez (`and`):
  - `bucket_id = 'product-photos'`: solo en este bucket.
  - `public.is_owner()`: solo el dueño ([`auth.sql.md`](auth.sql.md#2-la-función-is_owner)). Un
    usuario con sesión pero sin `role: owner` en su [app_metadata](../glosario.md#app-metadata)
    queda fuera.
  - `name ~ '^[a-z0-9]+(-[a-z0-9]+)*\.jpg$'`: `~` compara un texto con una
    [expresión regular](../glosario.md#expresion-regular). Se lee: de principio (`^`) a fin
    (`$`), grupos de letras minúsculas y dígitos (`[a-z0-9]+`) separados por un guion
    (`(-[a-z0-9]+)*`), y al final `.jpg` (`\.` es un punto de verdad, no "cualquier carácter").
- Ejemplos: `arroz-blanco-3f9a0c7e.jpg` y `arroz-blanco.jpg` pasan; `prueba.png`, `Arroz.jpg` y
  `../x.jpg` no. Así nadie puede colar un archivo `.html` o con `/` en el nombre (que lo metería
  en otra carpeta).
- No hay política `for update`: un archivo nunca se reemplaza. Cada foto nueva lleva un nombre
  nuevo ([`photos.ts.md`](../src/lib/photos.ts.md#6-un-nombre-nuevo-en-cada-subida-photopath)).

### 4. Ver la fila y borrar

```sql
-- Storage reads the object row before deleting it.
create policy "owner reads photo rows" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-photos' and public.is_owner());
```

- El comentario: "Storage lee la fila del archivo antes de borrarlo."
- `for select … using (…)`: deja **ver** las filas de este bucket en `storage.objects`, solo al
  dueño. No hace falta para ver las fotos (eso va por la URL pública); hace falta porque, para
  borrar, Storage primero busca la fila del archivo, y una fila que no puedes ver es una fila que
  no encuentra. Según la spec no está confirmado que el borrado lo necesite, y se añade por si
  acaso.

```sql
create policy "owner deletes photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-photos' and public.is_owner());
```

- `for delete … using (…)`: deja **borrar** archivos de este bucket, solo al dueño. `for delete`
  solo lleva `using` (después de borrar no queda fila nueva que revisar;
  [política de escritura](../glosario.md#politica-de-escritura)).
- Lo usan `deletePhoto()` de [`photos.ts`](../src/lib/photos.ts.md) al cambiar o quitar una foto,
  y al borrar un producto.

## Cómo se conecta

- **Orden de montaje de una tienda nueva:** [`schema.sql`](schema.sql.md) →
  [`seed.sql`](seed.sql.md) → [`auth.sql`](auth.sql.md) →
  [`products-write.sql`](products-write.sql.md) → [`publish.sql`](publish.sql.md) → este archivo.
- **Quién sube y borra:** solo [`src/lib/photos.ts`](../src/lib/photos.ts.md), desde `/admin/`,
  con el [access token](../glosario.md#access-token) del dueño a través de `authFetch()`.
- **Quién lee las fotos:** el build, por la URL pública, sin ninguna política
  ([`src/lib/supabase.ts`](../src/lib/supabase.ts.md)); y la vista previa del formulario de
  `/admin/`, por la misma URL pública.
- **Publicar:** cambiar la foto de un producto cambia su columna `photo_path`, y eso dispara el
  [trigger](../glosario.md#trigger) de [`publish.sql`](publish.sql.md). La tarjeta "Publicar"
  dirá "Hay cambios sin publicar." sin ningún código nuevo. Subir o borrar un archivo, en cambio,
  no toca `products` y no lo dispara.

## Prueba tú

Comprueba que el archivo está aplicado, sin cambiar nada. Hazlo después de haber ejecutado
`photos.sql`.

1. En el panel de Supabase, abre *SQL Editor*, pega esto y pulsa *Run*:

   ```sql
   select id, file_size_limit, allowed_mime_types from storage.buckets;
   ```

   **Qué deberías ver:** la fila `product-photos` con `2097152` y `{image/jpeg}` (AC1 de la spec).
2. Ahora esto, también solo lectura:

   ```sql
   select policyname, cmd from pg_policies where tablename = 'objects' and policyname like 'owner%photo%';
   ```

   `pg_policies` es la lista de todas las políticas que guarda Postgres. **Qué deberías ver:**
   tres filas, `owner uploads photos` (`INSERT`), `owner reads photo rows` (`SELECT`) y
   `owner deletes photos` (`DELETE`).
3. No hay nada que deshacer: las dos consultas solo leen.

## Términos

- [politicas-de-storage](../glosario.md#politicas-de-storage) (nuevo)
- [storage-y-bucket](../glosario.md#storage-y-bucket) · [rls](../glosario.md#rls) ·
  [politica](../glosario.md#politica) · [politica-de-escritura](../glosario.md#politica-de-escritura) ·
  [rol](../glosario.md#rol) · [clave-publishable](../glosario.md#clave-publishable) ·
  [app-metadata](../glosario.md#app-metadata) · [access-token](../glosario.md#access-token)
- [expresion-regular](../glosario.md#expresion-regular) · [editor-sql](../glosario.md#editor-sql) ·
  [trigger](../glosario.md#trigger)
