# `supabase/auth.sql`

> **Qué es:** el SQL que le enseña a la base de datos quién es el dueño de la tienda, más la
> lista de ajustes de Supabase Auth que hay que poner a mano · **Lo decidió:**
> [spec 0014](../../../docs/specs/0014-owner-login.md) (Decision y Design → "Supabase settings" y
> `supabase/auth.sql`) · **Lo usan:** el dueño, **una vez** por tienda, en el
> [editor SQL](../glosario.md#editor-sql) de Supabase, después de [`schema.sql`](schema.sql.md);
> la función `is_owner()` la usan las políticas de escritura de
> [`products-write.sql`](products-write.sql.md) (feature 12) y la usará la función de publicar
> (feature 13) · **Usa:** `auth.jwt()` y la tabla `auth.users`, que trae Supabase

## Para qué sirve

La página `/admin/` ya deja entrar al dueño ([`auth.ts`](../src/lib/auth.ts.md)), pero eso pasa
en el navegador, y lo que pasa en un navegador se puede manipular. Quien de verdad tiene que
saber "esta petición es del dueño" es la base de datos, para dejarle cambiar precios (feature 12)
y a nadie más. Este archivo prepara eso en tres partes:

1. **Unos comentarios** con los ajustes del panel de [Supabase Auth](../glosario.md#supabase-auth)
   que no se pueden poner con SQL: cerrar el registro, la contraseña mínima, a dónde vuelven los
   enlaces del correo y crear el usuario del dueño. Están aquí para que montar la tienda de otro
   cliente sea repetir la misma lista.
2. **La función `is_owner()`**, que mira el [JWT](../glosario.md#jwt) de cada petición y dice si
   es el del dueño.
3. **Una orden comentada** que marca al usuario del dueño con `role: "owner"`.

Como [`schema.sql`](schema.sql.md), no lo ejecuta ni lo lee Astro: el dueño lo pega en el editor
SQL y lo ejecuta una vez.

## El código, por partes

### 1. La cabecera y los ajustes del panel

```sql
-- Owner login: who counts as the shop owner (spec 0014).
-- Run once in the Supabase dashboard SQL editor, after schema.sql.
--
```

- "Login del dueño: quién cuenta como dueño de la tienda (spec 0014). Ejecútalo una vez en el
  editor SQL del panel de Supabase, después de `schema.sql`."
- El `--` solo de la tercera línea es un comentario vacío: una línea en blanco dentro del bloque
  de comentarios.

```sql
-- Dashboard settings to set by hand first, once per shop (spec 0014, "Supabase settings"):
--   Authentication > Sign In / Providers: "Allow new users to sign up" OFF.
```

- "Ajustes del panel que hay que poner a mano antes, una vez por tienda (spec 0014, 'Supabase
  settings'):". Son menús del panel de Supabase; `>` separa un menú de su submenú.
- *Authentication > Sign In / Providers*: "Permitir que se registren usuarios nuevos" →
  **apagado**. Así nadie puede crearse una cuenta desde fuera: el único usuario lo crea el
  desarrollador (AC1, AC3).

```sql
--   Authentication > Email: minimum password length 8; email OTP expiration 3600 s (default,
--     how long a recovery link lasts). Email templates stay untouched (editing needs custom SMTP).
```

- *Authentication > Email*: contraseña de al menos 8 caracteres, y la caducidad del enlace del
  correo en 3600 segundos (una hora, el valor por defecto). OTP (*one-time password*) es el
  nombre que da Supabase a los códigos y enlaces de un solo uso que manda por correo.
- "Las plantillas de correo no se tocan (editarlas exige un SMTP propio)." SMTP es el sistema que
  envía correos; Supabase usa el suyo, que no deja cambiar el texto. Por eso el correo llega en
  inglés, y la página lo avisa en español.

```sql
--   Authentication > URL Configuration: Site URL = the site's /admin/ URL
--     (demo: https://tienda-demo-cuba.vercel.app/admin/); Redirect URLs = that same URL plus
--     http://localhost:4321/admin/ (exact, with the trailing slash).
```

- *Authentication > URL Configuration*: a dónde puede mandar Supabase al navegador después de
  abrir el enlace del correo.
  - *Site URL*: la dirección por defecto, `/admin/` del sitio publicado.
  - *Redirect URLs*: la lista de direcciones permitidas. La misma, más
    `http://localhost:4321/admin/` para probar con `pnpm dev`. Exactas y con la `/` final.
- Por seguridad, Supabase solo acepta un `redirect_to` que esté en esta lista; si no, usa la
  *Site URL*. Así nadie puede pedir un correo cuyo enlace mande la sesión a otro sitio
  ([flujo implícito](../glosario.md#flujo-implicito)).

```sql
--   Authentication > Users > Add user > Create new user: the owner's email (a member of the
--     project's organization, or the default sender will not deliver to it), a first password,
--     auto-confirm on.
```

- *Authentication > Users > Add user > Create new user*: crear el usuario del dueño con su email
  y una primera contraseña, con *auto-confirm* encendido (así no hace falta confirmar el email).
- "(un miembro de la organización del proyecto, o el remitente por defecto no le enviará
  correos)": el servicio de correo gratuito de Supabase solo escribe a los miembros del equipo
  del proyecto. Para la demo es el email del desarrollador; para una tienda vendida, el de la
  cuenta de Supabase de la propia tienda (spec 0014).

### 2. La función `is_owner()`

```sql

-- True only for the shop owner's JWT. Used by the write policies (feature 12) and the publish
-- Edge Function (feature 13). Without a signed-in user, auth.jwt() is null and this is false.
create or replace function public.is_owner() returns boolean
  language sql stable
  as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner', false) $$;
```

- El comentario: "Verdadero solo con el JWT del dueño de la tienda. La usan las políticas de
  escritura (feature 12) y la función de publicar (feature 13). Sin un usuario con sesión,
  `auth.jwt()` es `null` y esto da falso." Una *Edge Function* es un trozo de código que Supabase
  ejecuta en sus servidores; llegará con la feature 13.
- `create or replace function public.is_owner() returns boolean`: crea (o sustituye) una
  [función SQL](../glosario.md#funcion-sql) llamada `is_owner`, en el esquema `public`, sin
  argumentos, que devuelve `true` o `false`.
- `language sql`: el cuerpo es SQL.
- `stable`: una promesa a Postgres: "dentro de una misma consulta, con los mismos datos, doy
  siempre el mismo resultado y no cambio nada". Con eso, Postgres puede calcularla una vez en vez
  de una por fila.
- `as $$ … $$`: el cuerpo, una sola consulta:
  - `auth.jwt()`: una función que trae Supabase. Devuelve los datos del JWT de **la petición
    que se está atendiendo**, como JSON, o `null` si la petición no trae sesión.
  - `-> 'app_metadata'`: dentro de ese JSON, el campo [`app_metadata`](../glosario.md#app-metadata)
    (como `jwt.app_metadata` en JavaScript).
  - `->> 'role'`: dentro de él, el campo `role`, **como texto** (`->` da JSON, `->>` da texto).
  - `= 'owner'`: compara. Da `true`, `false`, o `null` si no había JWT o no tenía `role` (en SQL,
    comparar con `null` da `null`, no `false`).
  - `coalesce(…, false)`: devuelve el primer valor que no sea `null`. Convierte ese `null` en
    `false`. Resultado: solo hay dos respuestas posibles, y la duda siempre es "no".
- Por qué fiarse del JWT: Supabase lo firmó y el usuario no puede cambiar su `app_metadata`. Si
  alguien edita el JWT en su navegador para ponerse `owner`, la firma deja de cuadrar y Supabase
  rechaza la petición antes de llegar aquí.
- Desde la feature 12 la usan las tres políticas de escritura de
  [`products-write.sql`](products-write.sql.md), en su `using (public.is_owner())` y su
  `with check (public.is_owner())` ([política de escritura](../glosario.md#politica-de-escritura)).

### 3. Marcar al dueño

```sql

-- Run once per shop after creating the owner user (replace the email). app_metadata cannot be
-- changed by the user; the new role reaches the JWT at the next sign-in or token refresh.
-- update auth.users
--   set raw_app_meta_data = raw_app_meta_data || '{"role":"owner"}'
--   where email = 'owner@example.com';
```

- El comentario: "Ejecútalo una vez por tienda después de crear el usuario del dueño (cambia el
  email). El usuario no puede cambiar `app_metadata`; el rol nuevo llega al JWT en el siguiente
  inicio de sesión o renovación del token."
- Las tres líneas siguientes son una orden SQL **comentada**: al ejecutar el archivo entero no
  hacen nada. Hay que copiarlas, quitar los `--`, poner el email real del dueño y ejecutarlas
  aparte. Están comentadas porque llevan un email de ejemplo que hay que cambiar.
- `update auth.users`: cambia filas de la tabla de usuarios que Supabase guarda en su esquema
  `auth` ([esquema SQL](../glosario.md#esquema-sql)).
- `set raw_app_meta_data = raw_app_meta_data || '{"role":"owner"}'`: `raw_app_meta_data` es la
  columna donde vive el `app_metadata`. `||` entre dos objetos JSON los **junta**: conserva lo que
  ya había (Supabase guarda ahí, por ejemplo, con qué método entra el usuario) y añade o cambia
  `"role": "owner"`.
- `where email = 'owner@example.com'`: solo en la fila de ese email. Sin `where`, cambiaría
  **todos** los usuarios.
- "Llega al JWT en el siguiente inicio de sesión o renovación": el JWT que ya tiene el móvil se
  firmó antes del cambio. Hasta que se pide uno nuevo, sigue diciendo lo de antes. La página lo
  tiene en cuenta: al cargar pregunta a Supabase con `getUser()`.

## Cómo se conecta

- **Orden de montaje de una tienda nueva:** [`schema.sql`](schema.sql.md) →
  [`seed.sql`](seed.sql.md) y fotos → los ajustes del panel de este archivo → crear el usuario →
  este archivo (la función) → la orden de marcar al dueño →
  [`products-write.sql`](products-write.sql.md) (las políticas de escritura que usan la función).
- **El rol** viaja dentro del JWT. [`auth.ts`](../src/lib/auth.ts.md) lo lee con `isOwner()`
  para decidir qué enseña la página (solo interfaz); `is_owner()` lo lee en la base de datos
  para decidir qué se puede hacer (protección de verdad, feature 12).
- **Las *Redirect URLs*** tienen que coincidir con la dirección que manda `requestRecovery()` en
  [`auth.ts`](../src/lib/auth.ts.md#22-pedir-el-correo-de-recuperación): el `/admin/` del sitio desde el que se pidió.

## Prueba tú

Comprueba la función y la marca del dueño, solo leyendo:

1. En el panel de Supabase, abre *SQL Editor*, pega `select public.is_owner();` y pulsa *Run*.
   **Qué deberías ver:** `false`. En el editor no hay ninguna sesión de usuario, así que
   `auth.jwt()` es `null` y `coalesce` lo convierte en `false` (spec 0014, AC1).
2. Ahora pega `select email, raw_app_meta_data ->> 'role' as role from auth.users;` y pulsa
   *Run*. **Qué deberías ver:** una sola fila, con el email del dueño y `owner` en la columna
   `role` (AC1: un único usuario, marcado como dueño).
3. No hay nada que deshacer: las dos órdenes solo leen. **No** ejecutes la orden `update` si no
   vas a montar una tienda nueva.

## Términos

- [supabase-auth](../glosario.md#supabase-auth) · [jwt](../glosario.md#jwt) ·
  [app-metadata](../glosario.md#app-metadata) · [funcion-sql](../glosario.md#funcion-sql) ·
  [flujo-implicito](../glosario.md#flujo-implicito) (nuevos)
- [editor-sql](../glosario.md#editor-sql) · [esquema-sql](../glosario.md#esquema-sql) ·
  [politica](../glosario.md#politica) · [rol](../glosario.md#rol) · [rls](../glosario.md#rls)
