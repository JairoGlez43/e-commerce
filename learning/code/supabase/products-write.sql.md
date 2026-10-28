# `supabase/products-write.sql`

> **Qué es:** el SQL que deja al dueño, y solo al dueño, crear, cambiar y borrar productos, y que
> permite un producto sin foto · **Lo decidió:**
> [spec 0015](../../../docs/specs/0015-manage-products.md) (Decision y Design →
> `supabase/products-write.sql`) · **Lo usan:** el dueño, **una vez** por tienda, en el
> [editor SQL](../glosario.md#editor-sql) de Supabase, después de [`auth.sql`](auth.sql.md); a
> partir de ahí, Postgres lo aplica a cada escritura que manda
> [`src/lib/products.ts`](../src/lib/products.ts.md) · **Usa:** la tabla `products` de
> [`schema.sql`](schema.sql.md) y la función `public.is_owner()` de [`auth.sql`](auth.sql.md)

## Para qué sirve

Hasta la feature 12, la tabla `products` solo se podía **leer** a través de la API:
[`schema.sql`](schema.sql.md) no puso ninguna política de escritura, así que cualquier
escritura se rechazaba. Ahora el dueño gestiona los productos desde `/admin/`, y la base de
datos tiene que dejarle escribir **a él y a nadie más**. Este archivo hace dos cosas:

1. **Permite un producto sin foto.** La subida de fotos llega con la feature 14; mientras tanto,
   un producto añadido desde `/admin/` no tiene foto, así que la columna `photo_path` tiene que
   aceptar `null` (el "no hay valor" de SQL).
2. **Abre la escritura solo al dueño**, con un [grant](../glosario.md#grant) y tres
   [políticas de escritura](../glosario.md#politica-de-escritura) que preguntan a
   `public.is_owner()` si el [JWT](../glosario.md#jwt) de la petición es el del dueño.

Esta es **la protección de verdad** de los datos (spec 0015). El formulario de `/admin/` repite
las reglas solo para dar mensajes en español antes de mandar nada; pero el JavaScript de un
navegador se puede cambiar, y Postgres no. Como los otros archivos `.sql`, no lo ejecuta ni lo
lee Astro: el dueño lo pega en el editor SQL y lo ejecuta una vez.

## El código, por partes

### 1. La cabecera

```sql
-- The owner's writes on products (spec 0015). Reads stay public (schema.sql).
-- Run once in the Supabase dashboard SQL editor, after auth.sql. Order for every new shop:
-- schema.sql → seed.sql → auth.sql → products-write.sql.
```

- "Las escrituras del dueño en `products` (spec 0015). Las lecturas siguen siendo públicas
  (`schema.sql`). Ejecútalo una vez en el editor SQL del panel de Supabase, después de
  `auth.sql`. Orden para cada tienda nueva: `schema.sql` → `seed.sql` → `auth.sql` →
  `products-write.sql`."
- El orden importa: este archivo cambia una tabla que crea `schema.sql` y usa una función que
  crea `auth.sql`. Si se ejecuta antes, Postgres da error porque no las encuentra.

### 2. La foto pasa a ser opcional

```sql

-- A product may have no photo until feature 14 uploads one. The existing check still refuses
-- an empty string, and a check passes on null.
alter table public.products alter column photo_path drop not null;
```

- El comentario: "Un producto puede no tener foto hasta que la feature 14 suba una. El check que
  ya existe sigue rechazando un texto vacío, y un check deja pasar `null`."
- `alter table public.products alter column photo_path drop not null;`: `alter table` cambia una
  tabla que ya existe; `alter column photo_path` elige la columna, y `drop not null` le quita la
  regla "obligatoria". Desde ahora, una fila puede tener `photo_path` vacío (`null`). Las filas
  que ya existen no cambian: las 18 de ejemplo conservan su foto.
- ¿Y el `check (char_length(photo_path) > 0)` que puso `schema.sql`
  ([restricción check](../glosario.md#restriccion-check))? Se queda, y sigue rechazando un texto
  vacío `''`. Con `null` no molesta: en SQL, `char_length(null) > 0` no da ni verdadero ni falso
  sino `null` ("no se sabe"), y un check solo rechaza la fila cuando su condición da **falso**.
  Así, "sin foto" se guarda siempre de una sola forma, `null`, nunca como `''`.
- Lo que hace después el resto del proyecto con ese `null`: el build lo convierte en "sin foto"
  ([`content.config.ts.md`](../src/content.config.ts.md)) y las páginas enseñan la caja
  [`NoPhoto`](../src/components/NoPhoto.astro.md).

### 3. Solo el dueño escribe

```sql

-- Only the owner may write. The grant opens the door to signed-in users; each policy then lets
-- through only a JWT whose app_metadata.role is "owner" (public.is_owner(), auth.sql).
grant insert, update, delete on table public.products to authenticated;
```

- El comentario: "Solo el dueño puede escribir. El `grant` abre la puerta a los usuarios con
  sesión; después, cada política deja pasar solo un JWT cuyo `app_metadata.role` sea `"owner"`
  (`public.is_owner()`, `auth.sql`)."
- `grant insert, update, delete on table public.products to authenticated;`: la **primera
  puerta** ([grant](../glosario.md#grant)). Da permiso de crear (`insert`), cambiar (`update`)
  y borrar (`delete`) filas de `products` al [rol](../glosario.md#rol) `authenticated`: las
  peticiones que llevan la sesión de un usuario. El rol `anon` (solo la
  [clave publishable](../glosario.md#clave-publishable), sin sesión, como el build o cualquier
  visitante) no recibe nada: para él, escribir sigue prohibido desde el principio (spec 0015,
  AC1).
- Un `grant` no mira **qué** usuario es. Si no hubiera nada más, cualquier cuenta de Supabase
  del proyecto podría escribir. Por eso hace falta la segunda puerta, [RLS](../glosario.md#rls),
  que `schema.sql` ya activó en esta tabla: con RLS activo, una acción sin política sigue
  prohibida aunque tenga el `grant`.

```sql
create policy "owner inserts products" on public.products
  for insert to authenticated with check (public.is_owner());
```

- La segunda puerta, para **crear**: una [política de escritura](../glosario.md#politica-de-escritura)
  llamada "el dueño inserta productos" (el nombre es solo una etiqueta para reconocerla en el
  panel).
- `for insert to authenticated`: vale para crear filas, y solo para el rol `authenticated`.
- `with check (public.is_owner())`: la fila nueva solo se acepta si `is_owner()` da `true`, es
  decir, si el JWT de la petición dice `app_metadata.role = "owner"`
  ([`auth.sql.md`](auth.sql.md#2-la-función-is_owner)). Si da `false`, Postgres rechaza el
  `insert` con el error `42501` ([código de error](../glosario.md#codigo-de-error-postgres)).
- Fíjate en que la condición no mira la fila: no le importa qué producto es, solo quién lo
  manda. O eres el dueño y puedes todo, o no puedes nada.

```sql
create policy "owner updates products" on public.products
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
```

- Para **cambiar**, las dos condiciones:
  - `using (public.is_owner())`: qué filas que ya existen puede tocar la petición. Si no es el
    dueño, ninguna: para él, todas las filas son invisibles.
  - `with check (public.is_owner())`: si la fila tal como quedaría se puede guardar. Repite la
    misma pregunta.
- Qué ve quien no es el dueño: como no "ve" ninguna fila, su `update` no da error, simplemente
  no cambia nada. A través de la API eso llega como una respuesta buena con una lista vacía
  `[]` (según la spec 0015, que lo da por confirmar). Por eso
  [`products.ts`](../src/lib/products.ts.md#13-una-sola-fila-o-nada-onlyrow) comprueba que vuelva
  **exactamente una** fila.

```sql
create policy "owner deletes products" on public.products
  for delete to authenticated using (public.is_owner());
```

- Para **borrar**, solo `using`: después de borrar no queda fila nueva que comprobar. Igual que
  al cambiar, si no es el dueño no ve ninguna fila y no se borra nada.
- La tabla `categories` no recibe nada: sigue siendo de solo lectura hasta la feature 15
  (spec 0015).

### 4. La prueba de AC1, comentada

```sql

-- AC1 check (run, read the result, nothing is kept):
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"app_metadata":{}}';
--   insert into public.products (id, name, category_id, price, unit, description)
--     values ('prueba', 'Prueba', '<a category id>', 1, 'u', 'd');  -- expect 42501
-- rollback;
-- Repeat with '{"app_metadata":{"role":"owner"}}': the insert works, then rollback.
```

- "Comprobación de AC1 (ejecútala, lee el resultado; no se guarda nada)". Todas las líneas
  empiezan por `--`, así que al ejecutar el archivo entero no hacen nada. Es una receta para
  copiar, quitar los `--` y ejecutar aparte. Sirve para probar las políticas **sin** necesitar
  el móvil del dueño ni la página `/admin/`.
- `begin;` … `rollback;`: una [transacción](../glosario.md#transaccion-sql). Todo lo de dentro
  se deshace al final, pase lo que pase. Por eso la prueba no deja rastro en la tabla.
- `set local role authenticated;`: el editor SQL trabaja con permisos de dueño **del proyecto**,
  que se salta RLS. Esta línea dice "hasta el final de la transacción, actúa como el rol
  `authenticated`", el mismo que tiene una petición de la API con sesión. Así RLS vuelve a
  aplicarse.
- `set local request.jwt.claims = '{"app_metadata":{}}';`: los *claims* son los datos que lleva
  dentro un [JWT](../glosario.md#jwt). Cuando llega una petición de verdad, Supabase guarda los
  del JWT en este ajuste, `request.jwt.claims`, y de ahí los lee `auth.jwt()`, la función que
  usa `is_owner()`. Escribirlo a mano es fingir una petición cuyo JWT tiene un `app_metadata`
  vacío: un usuario con sesión que **no** es el dueño.
- `insert into public.products (…) values (…)`: intenta crear un producto de prueba. No da
  `in_stock` (su `default` es `true`) ni `photo_path` (queda `null`, que ahora se admite).
  `'<a category id>'` hay que cambiarlo por un id de categoría que exista, por ejemplo `'aseo'`;
  si no, fallaría por la [clave foránea](../glosario.md#clave-foranea) y no probaría la política.
- `-- expect 42501`: "espera el error `42501`": `is_owner()` da `false` y la política lo
  rechaza.
- La última línea: "Repítelo con `'{"app_metadata":{"role":"owner"}}'`: el `insert` funciona, y
  luego `rollback`." Con los claims del dueño, la misma orden se acepta; el `rollback` la
  deshace.

## Cómo se conecta

- **Orden de montaje de una tienda nueva:** [`schema.sql`](schema.sql.md) →
  [`seed.sql`](seed.sql.md) y las fotos → [`auth.sql`](auth.sql.md) (ajustes del panel, usuario
  del dueño, `is_owner()`) → este archivo.
- **Quién escribe:** [`src/lib/products.ts`](../src/lib/products.ts.md), desde el navegador del
  dueño, con `POST`, `PATCH` y `DELETE` a `/rest/v1/products` y su
  [access token](../glosario.md#access-token). El token dice "rol `authenticated`" y lleva el
  `app_metadata` del dueño; Postgres pasa las dos puertas y escribe.
- **Qué devuelve un rechazo:** un `insert` de alguien que no es el dueño falla con `42501`, que
  `products.ts` convierte en "Esta cuenta no puede cambiar el catálogo."; un `update` o `delete`
  no cambia nada y `products.ts` lo trata como "el producto ya no existe".
- **Quién lee:** nadie más que antes. El build sigue leyendo con la clave publishable
  ([`supabase.ts`](../src/lib/supabase.ts.md)), y ahora acepta filas con `photo_path` `null`.

## Prueba tú

Comprueba que el archivo está aplicado, **solo leyendo** (no cambia nada). Hazlo después de haber
ejecutado `products-write.sql`; si aún no se ha ejecutado, verás menos filas.

1. En el panel de Supabase, abre *SQL Editor*, pega esto y pulsa *Run*:

   ```sql
   select policyname, cmd from pg_policies where tablename = 'products';
   ```

   `pg_policies` es la lista de todas las políticas que guarda Postgres; se consulta como una
   tabla más (`policyname` = el nombre, `cmd` = la acción). **Qué deberías ver:** cuatro
   filas: la de lectura de `schema.sql` (`products are public to read`, `SELECT`) y las tres de
   este archivo (`owner inserts products`, `INSERT`; `owner updates products`, `UPDATE`;
   `owner deletes products`, `DELETE`).
2. Ahora pega esto y pulsa *Run*:

   ```sql
   select is_nullable from information_schema.columns where table_name = 'products' and column_name = 'photo_path';
   ```

   `information_schema.columns` es, igual, la lista de las columnas de todas las tablas, y
   `is_nullable` dice si una admite `null`. **Qué deberías ver:** `YES`: la columna admite
   `null`. (Antes de este archivo decía `NO`.)
3. No hay nada que deshacer: las dos órdenes solo leen. Si quieres ver la política en acción,
   la prueba del bloque 4 también es segura, porque termina en `rollback`; no la ejecutes sin el
   `begin;` del principio.

## Términos

- [politica-de-escritura](../glosario.md#politica-de-escritura) ·
  [transaccion-sql](../glosario.md#transaccion-sql) ·
  [codigo-de-error-postgres](../glosario.md#codigo-de-error-postgres) (nuevos)
- [grant](../glosario.md#grant) · [rls](../glosario.md#rls) · [politica](../glosario.md#politica) ·
  [rol](../glosario.md#rol) · [funcion-sql](../glosario.md#funcion-sql) ·
  [restriccion-check](../glosario.md#restriccion-check) ·
  [clave-foranea](../glosario.md#clave-foranea) · [editor-sql](../glosario.md#editor-sql) ·
  [tabla-sql](../glosario.md#tabla-sql)
- [jwt](../glosario.md#jwt) · [app-metadata](../glosario.md#app-metadata) ·
  [access-token](../glosario.md#access-token) ·
  [clave-publishable](../glosario.md#clave-publishable)
