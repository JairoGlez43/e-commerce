# `supabase/publish.sql`

> **Qué es:** el SQL de "publicar": una tabla con la hora del último cambio del catálogo (que
> apunta un [trigger](../glosario.md#trigger)) y una tabla con cada petición de publicar, que
> solo el dueño puede crear · **Lo decidió:**
> [spec 0016](../../../docs/specs/0016-publish-changes.md) (Decision y Design →
> `supabase/publish.sql`) · **Lo usan:** el dueño, **una vez** por tienda, en el
> [editor SQL](../glosario.md#editor-sql) de Supabase, después de
> [`products-write.sql`](products-write.sql.md); a partir de ahí, la
> [Edge Function `publish`](functions/publish/index.ts.md) (inserta y lee `publishes`), el build
> ([`src/lib/supabase.ts`](../src/lib/supabase.ts.md), lee `catalog_state`) y la administración
> ([`src/lib/publish.ts`](../src/lib/publish.ts.md), lee las dos) · **Usa:** las tablas
> `products` y `categories` de [`schema.sql`](schema.sql.md) y la función `public.is_owner()` de
> [`auth.sql`](auth.sql.md)

## Para qué sirve

Desde la feature 12, lo que el dueño guarda en `/admin/` llega a Supabase al momento, pero la web
pública no cambia hasta el siguiente [build](../glosario.md#build). La feature 13 añade un botón
"Publicar cambios" y una línea que dice si hay algo pendiente. Para eso, la base de datos tiene
que saber dos cosas, y este archivo crea una tabla para cada una:

1. **`catalog_state`: ¿cuándo cambió el catálogo por última vez?** Una tabla con una sola fila y
   una sola hora, `changed_at`. Nadie la escribe a mano: un [trigger](../glosario.md#trigger) la
   pone al día después de **cualquier** cambio en `products` o `categories`, venga de `/admin/`
   o del panel de Supabase. El build copia esa hora en `/build.json`, y la administración compara
   las dos: si son distintas, "Hay cambios sin publicar."
2. **`publishes`: ¿cuándo se pidió publicar, y lo pidió el dueño?** Una fila por cada toque al
   botón. Su [política](../glosario.md#politica-de-escritura) de `insert` es `is_owner()`, así que
   **crear la fila es la comprobación de "¿eres el dueño?"**: la
   [Edge Function](../glosario.md#edge-function) (el pequeño programa que Supabase ejecuta
   cuando el dueño pulsa el botón) solo pide a Vercel un [despliegue](../glosario.md#despliegue)
   nuevo si Postgres la dejó crear.

Como los otros `.sql`, Astro no lo lee ni lo ejecuta: el dueño lo pega en el editor SQL y pulsa
*Run* una vez.

## El código, por partes

### 1. La cabecera

```sql
-- Publishing (spec 0016): when the catalog last changed, and each publish request.
-- Run once in the Supabase dashboard SQL editor, after products-write.sql. Order for every new
-- shop: schema.sql → seed.sql → auth.sql → products-write.sql → publish.sql.
```

- "Publicar (spec 0016): cuándo cambió el catálogo por última vez, y cada petición de publicar.
  Ejecútalo una vez en el editor SQL del panel de Supabase, después de `products-write.sql`.
  Orden para cada tienda nueva: `schema.sql` → `seed.sql` → `auth.sql` → `products-write.sql` →
  `publish.sql`."
- El orden importa: los triggers se ponen sobre tablas que crea `schema.sql`, y las políticas
  usan `is_owner()`, que crea `auth.sql`. Si se ejecuta antes, Postgres no las encuentra y da
  error.

### 2. La tabla `catalog_state`: una sola fila

```sql

-- One row: the time of the last change to the catalog. Only the trigger writes it.
create table public.catalog_state (
  id         boolean primary key default true check (id),
  changed_at timestamptz not null default now()
);
```

- El comentario: "Una fila: la hora del último cambio del catálogo. Solo la escribe el trigger."
- `create table public.catalog_state (…)`: una [tabla](../glosario.md#tabla-sql) nueva con dos
  columnas.
- `id boolean primary key default true check (id)`: un truco para que la tabla **no pueda tener
  más de una fila**. Pieza por pieza:
  - `boolean`: el `id` solo puede ser `true` o `false`.
  - `check (id)`: la [restricción check](../glosario.md#restriccion-check) exige que `id` sea
    verdadero, así que `false` queda prohibido. Solo queda `true`.
  - `primary key`: la [clave primaria](../glosario.md#clave-primaria) no admite repetidos ni
    `null`. Como el único valor posible es `true`, solo cabe **una** fila.
  - `default true`: si nadie da un `id`, se pone `true`.
- `changed_at timestamptz not null default now()`: la hora del último cambio, como
  [timestamptz](../glosario.md#timestamptz) (un instante con zona horaria). `default now()`: al
  crear la fila, la hora del servidor de la base de datos.

```sql
insert into public.catalog_state default values;
```

- Crea la única fila. `default values` = "una fila nueva con el valor por defecto de cada
  columna": `id = true` y `changed_at` = ahora. Desde aquí, nadie añade más filas (no se podría)
  y solo el trigger la cambia.

### 3. `catalog_state` se puede leer sin sesión

```sql
alter table public.catalog_state enable row level security;
grant select on table public.catalog_state to anon, authenticated;
create policy "catalog state is public to read" on public.catalog_state
  for select to anon, authenticated using (true);
```

- `enable row level security`: activa [RLS](../glosario.md#rls) en la tabla. Desde aquí, sin una
  política, nadie podría ver la fila a través de la API.
- `grant select … to anon, authenticated`: la primera puerta ([grant](../glosario.md#grant)):
  leer, para los dos [roles](../glosario.md#rol), con o sin sesión.
- `create policy "catalog state is public to read" …`: la segunda puerta
  ([política](../glosario.md#politica)), "el estado del catálogo es público para leer": todas las
  filas (`using (true)`) para los dos roles.
- Lo lee el **build**, que solo tiene la [clave publishable](../glosario.md#clave-publishable)
  (rol `anon`), y la administración, con la sesión del dueño (rol `authenticated`). No hay ningún
  secreto en una hora, así que ser pública no es un problema (spec 0016, Security).
- Fíjate en lo que **no** hay: ni `grant insert`, ni `update`, ni `delete`. Ningún rol de la API
  puede escribir aquí, ni siquiera el dueño. Entonces, ¿cómo la cambia el trigger? Con el
  bloque 4.

### 4. La función que apunta la hora

```sql

-- security definer: the owner's role has no write grant on catalog_state.
create or replace function public.touch_catalog() returns trigger
  language plpgsql security definer set search_path = ''
  as $$ begin update public.catalog_state set changed_at = now(); return null; end $$;
```

- El comentario: "`security definer`: el rol del dueño no tiene permiso de escritura en
  `catalog_state`."
- `create or replace function public.touch_catalog()`: una [función SQL](../glosario.md#funcion-sql)
  nueva, "toca el catálogo", sin argumentos. `create or replace` la crea o la sustituye.
- `returns trigger`: no devuelve un dato normal; es una función **para un trigger**
  ([trigger](../glosario.md#trigger)). Postgres solo deja usar en un trigger las funciones
  declaradas así.
- `language plpgsql`: el cuerpo está escrito en PL/pgSQL, el lenguaje de programación de
  Postgres (SQL con `begin … end` y `return`). Las funciones de trigger no pueden escribirse en
  `language sql` a secas, como `is_owner()`.
- `security definer`: la clave de este bloque ([security definer](../glosario.md#security-definer)).
  Cuando el dueño guarda un producto, su petición corre con el rol `authenticated`, que **no**
  tiene permiso de escribir en `catalog_state` (bloque 3). Sin `security definer`, el trigger
  correría con ese rol, el `update` fallaría y, con él, ¡fallaría también el guardado del
  producto! Con `security definer`, la función corre con los permisos de quien la creó (el
  administrador del proyecto, en el editor SQL), y puede escribir. Así el dueño puede mover la
  hora **solo** a través de esta función, que hace una única cosa.
- `set search_path = ''`: obliga a escribir los nombres completos (`public.catalog_state`), para
  que nadie pueda colarle otra tabla con el mismo nombre. Es la costumbre segura en toda función
  `security definer`.
- `as $$ … $$`: el cuerpo, entre los dos `$$`:
  - `begin … end`: el principio y el final del bloque de PL/pgSQL.
  - `update public.catalog_state set changed_at = now();`: pone la hora del servidor
    ([timestamptz](../glosario.md#timestamptz)) en `changed_at`. No lleva `where`, así que cambia
    **todas** las filas de la tabla, que son una sola.
  - `return null;`: una función de trigger tiene que devolver algo. En un trigger `after … for
    each statement` (bloque 5), Postgres ignora lo que devuelve; `null` es lo habitual.

### 5. Los dos triggers

```sql
create trigger products_touch_catalog after insert or update or delete on public.products
  for each statement execute function public.touch_catalog();
```

- Un [trigger](../glosario.md#trigger) llamado `products_touch_catalog`. Se lee: "después
  (`after`) de cada orden que cree, cambie o borre filas de `public.products`, ejecuta
  `public.touch_catalog()` una vez (`for each statement`)".
- Resultado: cada vez que el dueño guarda un producto, cambia su disponibilidad o lo borra desde
  `/admin/`, `changed_at` pasa a ser la hora de ese cambio. Y lo mismo si alguien edita la tabla
  en el panel de Supabase: el trigger está dentro de Postgres y no le importa de dónde viene la
  orden (spec 0016, AC1).
- `after`: la hora se apunta **después** de que la orden haya funcionado. Si Postgres rechaza la
  orden (un precio negativo, o alguien que no es el dueño), no hay nada que apuntar: la orden y el
  trigger se deshacen juntos.
- `for each statement`: una vez por orden, no por fila. Si en el panel se cambian 18 filas con
  una sola orden, se apunta la hora una vez. Un detalle: también salta con una orden que no
  encuentra ninguna fila (un `PATCH` a un producto que ya no existe). Como mucho, la tarjeta
  dirá "Hay cambios sin publicar." sin necesidad, y publicar de más no rompe nada.

```sql
create trigger categories_touch_catalog after insert or update or delete on public.categories
  for each statement execute function public.touch_catalog();
```

- El mismo trigger para `categories`. Hoy las categorías solo se cambian desde el panel; cuando
  la feature 15 deje editarlas desde `/admin/`, este trigger ya estará puesto.

### 6. La tabla `publishes`: una fila por petición

```sql

-- One row per publish request. The function inserts it with the caller's JWT, so this policy
-- is the owner check.
create table public.publishes (
  id           bigint generated always as identity primary key,
  requested_at timestamptz not null default now(),
  requested_by uuid not null default auth.uid()
);
```

- El comentario: "Una fila por cada petición de publicar. La función la inserta con el JWT de quien
  llama, así que esta política es la comprobación del dueño."
- Tres columnas, y **las tres se rellenan solas**: la Edge Function manda un cuerpo vacío, `{}`,
  y Postgres pone los valores por defecto.
  - `id bigint generated always as identity primary key`: un número que Postgres pone solo, 1, 2,
    3… ([columna identity](../glosario.md#columna-identity)). La Edge Function lo usa si tiene que
    borrar esta fila (bloque 7).
  - `requested_at timestamptz not null default now()`: la hora de la petición, **del servidor**.
    La administración la compara con la hora del build para saber si la publicación ya está en
    la web; ninguna de las dos sale del reloj del móvil, que puede estar mal puesto.
  - `requested_by uuid not null default auth.uid()`: quién la pidió, el id del usuario de la
    sesión ([auth.uid()](../glosario.md#auth-uid)). Hoy solo puede ser el dueño; queda apuntado
    por si algún día hay más cuentas.

### 7. Solo el dueño lee, crea y borra

```sql
alter table public.publishes enable row level security;
grant select, insert, delete on table public.publishes to authenticated;
```

- RLS activo y un `grant` de leer, crear y borrar **solo** para `authenticated`. El rol `anon`
  (solo la clave publishable) no recibe nada: sin sesión, no se ve ni se crea ninguna fila.
- No hay `update`: una petición de publicar, una vez apuntada, no se cambia.

```sql
create policy "owner reads publishes" on public.publishes
  for select to authenticated using (public.is_owner());
```

- "El dueño lee las publicaciones": solo con el JWT del dueño se ven las filas
  ([`is_owner()`](auth.sql.md#2-la-función-is_owner)). Con otra sesión, la lectura no da error:
  devuelve `[]`, como si no hubiera ninguna.
- La usan la Edge Function (para la pausa de 60 segundos entre publicaciones) y la
  administración (para saber si hay una publicación en marcha al abrir la página).

```sql
create policy "owner adds publishes" on public.publishes
  for insert to authenticated with check (public.is_owner());
```

- "El dueño añade publicaciones": **la comprobación de verdad de toda la feature 13**. Si quien
  llama no es el dueño, `with check` da falso y Postgres rechaza el `insert` con `42501`
  ([código de error](../glosario.md#codigo-de-error-postgres)), que llega a la Edge Function como
  un `403`. Y la Edge Function solo llama a Vercel **después** de un `insert` que funcionó.
- ¿Por qué así y no comprobando el rol en el código de la función? Porque así la regla vive en un
  solo sitio, `is_owner()`, el mismo que protege los productos, y la función nunca necesita una
  clave que se salte RLS (spec 0016, Security).

```sql
create policy "owner removes publishes" on public.publishes
  for delete to authenticated using (public.is_owner());
```

- "El dueño quita publicaciones": si Vercel no contesta bien, la Edge Function borra la fila que
  acaba de crear. Si no la borrara, la pausa de 60 segundos impediría reintentar en seguida una
  publicación que en realidad no empezó.

### 8. La prueba de AC1, comentada

```sql

-- AC1 check (run, read the result, nothing is kept):
-- select count(*) from public.catalog_state;  -- expect 1
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000000","app_metadata":{}}';
--   insert into public.publishes default values;  -- expect 42501
-- rollback;
-- Repeat with '{"sub":"00000000-0000-0000-0000-000000000000","app_metadata":{"role":"owner"}}':
-- the insert works, then rollback.
```

- "Comprobación de AC1 (ejecútala, lee el resultado; no se guarda nada)". Todo va comentado con
  `--`, así que no se ejecuta con el archivo: es una receta para copiar aparte, quitando los `--`.
- `select count(*) from public.catalog_state;  -- expect 1`: cuenta las filas; debe dar `1`.
- `begin;` … `rollback;`: una [transacción](../glosario.md#transaccion-sql) que se deshace al
  final. Es la misma prueba que en [`products-write.sql`](products-write.sql.md#4-la-prueba-de-ac1-comentada):
  - `set local role authenticated;`: actuar como una petición con sesión, para que RLS se
    aplique (el editor SQL normalmente se lo salta).
  - `set local request.jwt.claims = '…';`: fingir los datos del JWT de esa petición. Esta vez
    llevan un `sub` inventado (un [uuid](../glosario.md#auth-uid) de ceros) además del
    `app_metadata` vacío. ¿Por qué el `sub`? Porque `requested_by` toma su valor de
    `auth.uid()`, que lee justo ese `sub`. Sin él, `requested_by` sería `null`, Postgres
    rechazaría la fila por el `not null` (otro error, `23502`) y la prueba no estaría probando
    la política.
  - `insert into public.publishes default values;  -- expect 42501`: intenta crear una petición
    de publicar con todos los valores por defecto. Con un `app_metadata` sin `role`,
    `is_owner()` da falso: error `42501`.
- La última línea: "Repítelo con `'{"sub":"…","app_metadata":{"role":"owner"}}'`: el `insert`
  funciona, y luego `rollback`." Con los datos del dueño, la misma orden pasa; el `rollback` la
  deshace.

## Cómo se conecta

- **Orden de montaje de una tienda nueva:** [`schema.sql`](schema.sql.md) →
  [`seed.sql`](seed.sql.md) → [`auth.sql`](auth.sql.md) →
  [`products-write.sql`](products-write.sql.md) → este archivo.
- **Quién mueve `changed_at`:** nadie directamente. Lo mueven los triggers después de cada
  escritura en `products` o `categories`, por ejemplo las de
  [`src/lib/products.ts`](../src/lib/products.ts.md).
- **Quién lee `catalog_state`:** el build, con `readCatalogChangedAt()` de
  [`src/lib/supabase.ts`](../src/lib/supabase.ts.md), que lo copia en
  [`/build.json`](../src/pages/build.json.ts.md); y la administración, con `catalogChangedAt()` de
  [`src/lib/publish.ts`](../src/lib/publish.ts.md).
- **Quién usa `publishes`:** la [Edge Function `publish`](functions/publish/index.ts.md) (lee la
  última, inserta una, y la borra si Vercel falla) y `lastPublish()` de `publish.ts`, siempre con
  el [access token](../glosario.md#access-token) del dueño.

## Prueba tú

Comprueba que el archivo está aplicado y que el trigger funciona. Hazlo después de haber ejecutado
`publish.sql`.

1. En el panel de Supabase, abre *SQL Editor*, pega esto y pulsa *Run*:

   ```sql
   select changed_at from public.catalog_state;
   ```

   **Qué deberías ver:** una sola fila con una fecha y hora. Apúntala.
2. Ahora esto, también solo lectura:

   ```sql
   select tgname from pg_trigger where tgname like '%touch_catalog';
   ```

   `pg_trigger` es la lista de todos los triggers que guarda Postgres. **Qué deberías ver:** dos
   filas, `products_touch_catalog` y `categories_touch_catalog`.
3. En `/admin/`, desmarca la casilla "Disponible" de un producto y vuelve a marcarla (dos
   cambios que se anulan entre sí). Repite el paso 1. **Qué deberías ver:** una hora más nueva
   que la apuntada: el trigger saltó.
4. Deshacer: el producto ya está como antes. La tarjeta "Publicar" dirá "Hay cambios sin
   publicar." porque la hora cambió; puedes dejarlo así (publicar no cambiaría nada visible) o
   pulsar "Publicar cambios" para que vuelva a "La web está al día.".

## Términos

- [trigger](../glosario.md#trigger) · [security-definer](../glosario.md#security-definer) ·
  [timestamptz](../glosario.md#timestamptz) · [columna-identity](../glosario.md#columna-identity) ·
  [auth-uid](../glosario.md#auth-uid) (nuevos)
- [tabla-sql](../glosario.md#tabla-sql) · [restriccion-check](../glosario.md#restriccion-check) ·
  [clave-primaria](../glosario.md#clave-primaria) · [funcion-sql](../glosario.md#funcion-sql) ·
  [esquema-sql](../glosario.md#esquema-sql) · [editor-sql](../glosario.md#editor-sql) ·
  [transaccion-sql](../glosario.md#transaccion-sql) ·
  [codigo-de-error-postgres](../glosario.md#codigo-de-error-postgres)
- [rls](../glosario.md#rls) · [grant](../glosario.md#grant) · [rol](../glosario.md#rol) ·
  [politica](../glosario.md#politica) · [politica-de-escritura](../glosario.md#politica-de-escritura) ·
  [clave-publishable](../glosario.md#clave-publishable)
- [jwt](../glosario.md#jwt) · [app-metadata](../glosario.md#app-metadata) ·
  [access-token](../glosario.md#access-token) · [edge-function](../glosario.md#edge-function) ·
  [build](../glosario.md#build)
