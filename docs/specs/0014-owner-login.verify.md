# 0014 · Owner login — manual check steps

Run from the project root. "Clean" means `pnpm typecheck` and `pnpm build` exit 0. `pnpm build`
reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `.env` by itself; never open or print
`.env`. Keep passing the fake WhatsApp number inline: `WHATSAPP_NUMBER=5355555555 pnpm build`.

**Places:**
- Local: `pnpm dev` (or `pnpm preview` after a build), then `http://localhost:4321/admin/`.
- Live: `https://tienda-demo-cuba.vercel.app/admin/` after the owner pushes `main` (git
  integration is off, so `/develop` does not push).

**Phone width:** use DevTools device emulation at 360 px. Headless windows cannot go that narrow
(Known pitfalls).

**Variables in the `curl` commands:** `$URL` is the project URL and `$KEY` the publishable key.
Both are public by design. `$TOKEN` is an access token copied from the stored session
(DevTools → Application → Local Storage → `admin-session` → `access_token`). Never paste a
token or password into a file or a chat.

**Sending limit:** recovery emails are capped at 2 an hour and go only to members of the
project's team. Plan AC7 (a) and AC10 so they need at most 2 emails.

- **AC1 (Supabase settings and is_owner):**
  - In the dashboard:
    - Authentication: sign-ups off;
    - minimum password length 8;
    - Site URL `https://tienda-demo-cuba.vercel.app/admin/`;
    - Redirect URLs holding that URL and `http://localhost:4321/admin/`;
    - Users: exactly one user.
  - In the SQL editor:
    - `select raw_app_meta_data from auth.users;` → one row containing `"role": "owner"`;
    - `select public.is_owner();` → `false`.
  - Owner-confirmed on 2026-10-23 while building. Re-check here.
- **AC2 (signed out, 360 px):**
  - `/admin/` with no `admin-session` in Local Storage shows only the "Entrar" card: Email,
    Contraseña, the "Entrar" button and "¿Olvidaste tu contraseña?". There are no catalog data
    or admin controls.
  - `grep -c 'name="robots" content="noindex"' dist/admin/index.html` → `1`.
  - `grep -rl 'href="/admin' dist --include=*.html` → nothing.
- **AC3 (sign in, wrong password, sign-ups closed):**
  - The right email and password → "Sesión iniciada como <email>" and "Cerrar sesión".
  - A wrong password → "Email o contraseña incorrectos." and the page stays on Entrar.
  - `curl -s -X POST "$URL/auth/v1/signup" -H "apikey: $KEY" -H "Content-Type: application/json" -d '{"email":"prueba@example.com","password":"prueba1234"}'`
    → status 422, `signup_disabled`.
- **AC4 (only the owner; role not user-editable):**
  1. In the SQL editor, remove the role:
     `update auth.users set raw_app_meta_data = raw_app_meta_data - 'role';`
  2. Sign in → "Esta cuenta no tiene acceso a la administración." and you stay on Entrar.
  3. Restore the role with the commented `update` in `supabase/auth.sql`.
  4. Sign in again, then run:
     `curl -s -X PUT "$URL/auth/v1/user" -H "apikey: $KEY" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"app_metadata":{"role":"x"}}'`
  5. `select raw_app_meta_data from auth.users;` still shows `"role": "owner"`.
- **AC5 (session survives):** sign in first, and keep DevTools → Network open.
  - (a) Close the browser completely, reopen `/admin/` → signed-in view, no password asked.
  - (b) In Local Storage, set `admin-session.expires_at` to `0` and reload → one
    `token?grant_type=refresh_token` request (200), then the signed-in view.
  - (c) Set the computer clock 2 hours behind, sign in, then reload → signed-in view. Repeat with
    the clock 2 hours ahead. In both cases there is at most one refresh per reload, never one
    before every request. Restore the clock.
  - (d) In Local Storage, set `admin-session.access_token` to `x` (keep `expires_at`) and reload:
    - `GET /auth/v1/user` → 403 `bad_jwt` (a 401 is also handled; note which one appeared);
    - then one refresh (200);
    - then `GET /auth/v1/user` → 200;
    - then the signed-in view.
  - Offline: while signed in, DevTools → Network → Offline, then reload. You see the signed-in
    view plus "Sin conexión. Revisa tus datos e inténtalo otra vez." `admin-session` is still in
    Local Storage.
- **AC6 (global sign-out):**
  1. Sign in on two browsers (for example Edge and Chrome).
  2. Tap "Cerrar sesión" in one → Entrar view, and `admin-session` is gone.
  3. In the other browser, reload, or force a refresh as in AC5 (b) → Entrar view with "Tu
     sesión terminó. Entra de nuevo."
- **AC7 (recovery by link):** sign out first.
  - (a) Under "¿Olvidaste tu contraseña?", enter the owner's email and tap "Enviarme un enlace".
    The form is replaced by the "requested" message. An unknown address gives the same message.
    The email arrives in English. Its subject must match the quoted «Reset your password»; if it
    differs, report the real subject.
  - (b) Open the email on the phone and tap the link from the mail app:
    - `/admin/` opens on "Nueva contraseña";
    - the address bar shows `/admin/` with no `#access_token`;
    - Back does not return to a URL with tokens;
    - in the network panel, the request to `/auth/v1/recover` carries `redirect_to`.
  - (c) Type a new password twice → signed-in view with "Contraseña cambiada." Then, in another
    browser, the old password → "Email o contraseña incorrectos.", and the new one → signed in.
  - (d) Tap the same link again → "Recuperar la contraseña" view with "El enlace no es válido o
    ya caducó. Pide otro."
- **AC8 (client validation and 429):**
  - On "Nueva contraseña" (reached as in AC7 b):
    - 7 characters → "La contraseña debe tener al menos 8 caracteres.";
    - two different passwords → "Las contraseñas no coinciden.";
    - neither case sends a request in the network panel.
  - 429: request recovery twice within 60 seconds. The second gets 429 → "Demasiados intentos.
    Espera unos minutos y vuelve a intentarlo." This uses a recovery email; skip it if the hourly
    cap is reached, and note that.
- **AC9 (no JavaScript):**
  - With JavaScript disabled (DevTools → Settings → Debugger → Disable JavaScript), `/admin/`
    shows only "La administración necesita JavaScript activado.", and no form is visible.
  - Every `<form` in `dist/admin/index.html` has `method="post"`:
    `grep -o '<form[^>]*>' dist/admin/index.html`.
- **AC10 (both origins):**
  - Sign in, recovery and sign-out run on localhost and on the live URL with no CORS errors in
    the console.
  - A recovery requested from localhost sends a link that opens localhost.
- **AC11 (public routes unchanged):**
  - Clean build, then `pnpm check:weight` → all pages ok. `/admin/` is measured against
    JS ≤ 15 KB, and every other route against the public budget.
  - `grep -rl "<script" dist --include=*.html | grep -v "dist/admin/"` → nothing.
  - `grep -rlE "supabase\.co|sb_publishable_" dist | grep -v "dist/admin/"` → nothing.
  - Measured 2026-10-23 at build time:
    - typecheck 0 errors;
    - 27 pages built;
    - `/admin/` HTML+CSS 5.8 KB, JS 2.6 KB (external `/_astro/` file);
    - all within budget;
    - no public route with `<script>`, `supabase.co` or `sb_publishable_`.
