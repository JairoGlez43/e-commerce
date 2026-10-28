# 0014 · Owner login

**Status:** Accepted
**Date:** 2026-10-22
**Scope:** `docs/scope/scope.md` → feature 11
**Supersedes:** — (narrows spec 0013 AC7 and the AGENTS.md "Client JS: none" rule to public
routes, as spec 0012 allowed for `/admin/`)

## Context
Features 12–15 let the shop owner change the catalog from a phone, so the admin needs a login
first. Spec 0012 already chose Supabase Auth with one email + password user and a static
`/admin` route as the only route with client JS. This spec decides how that page talks to
Supabase Auth, how the session lives on the phone, how a forgotten password is recovered
without the developer, and how the database knows that a signed-in user is the owner.

## Decision
- **Plain `fetch` to the Supabase Auth REST API, no SDK** (owner's choice). This follows the
  no-SDK rule of specs 0012 and 0013. A new browser module `src/lib/auth.ts` is the single
  home of every Auth call and of the stored session.
- **One page, `/admin/`** (`src/pages/admin/index.astro`). It shows one view at a time:
  sign in, forgot password, set new password, signed in. The signed-in view is a placeholder
  that feature 12 fills.
- **The session stays open until the owner signs out** (owner's choice). The session is kept
  in `localStorage` and the access token is renewed with the refresh token. On the Free plan,
  refresh tokens do not expire.
- **"Cerrar sesión" signs out everywhere** (`scope=global`). If a phone is lost, the owner
  signs in on another device and signs out, which ends every session.
- **Password recovery by the link in Supabase's default email** (owner's choice, 2026-10-23;
  it replaces the 6-digit code). Editing the email template needs custom SMTP, which this
  spec does not add. The admin asks Supabase for a recovery email that points back to
  `/admin/`. The link uses the implicit flow, without PKCE: Supabase verifies it and opens
  `/admin/` with the session in the URL fragment (`#access_token=…`). The page reads the
  session, removes it from the address bar and asks for the new password. The session travels
  inside the link, so it works in any browser, including the mail app's own. Afterwards the
  owner signs in with the new password from their usual browser.
- **The owner is marked in `app_metadata`** with `role: "owner"`. A SQL function
  `public.is_owner()` reads that claim from the JWT. Feature 12's write policies and feature
  13's Edge Function use it. `app_metadata` cannot be changed by the user (Supabase RLS docs).
- **Sign-ups are off.** The developer creates the only user in the dashboard. Nobody can
  create an account from outside.
- **No custom SMTP.** Supabase's default sender only delivers to members of the project's
  organization, so the owner's admin email must be one of them. That is already true by
  design: for the demo it is the developer's Supabase email, and for a sold shop it is the
  shop's own Supabase account email (spec 0012). The limit is 2 emails an hour. The email
  templates stay Supabase's defaults, so the recovery email is in English. The page warns
  the owner about that in Spanish.
- **Config reaches the browser through `data-*` attributes.** The page's frontmatter reads
  `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` with the existing validation in
  `src/lib/supabase.ts`, and renders them on the admin root element. No `PUBLIC_` env vars
  and no renames. Both values are public by design (spec 0012). As a result, `/admin/` is the
  one route allowed to contain them (narrows 0013 AC7).

## Acceptance criteria
- **AC1:** In the Supabase project: sign-ups are off, the minimum password length is 8, and
  exactly one user exists, with `app_metadata.role = "owner"`. `supabase/auth.sql` creates
  `public.is_owner()`. In the SQL editor, the function returns `false` when there is no JWT.
- **AC2:** On a phone-width screen (360 px), `/admin/` with no stored session shows only the
  sign-in form (email, password, "Entrar" button) and a "¿Olvidaste tu contraseña?" link. No
  catalog data or admin controls are visible. The page has `noindex`, and no public page links
  to it.
- **AC3:** The right email and password open the signed-in view, which shows "Sesión iniciada
  como <email>" and a "Cerrar sesión" button. A wrong password shows "Email o contraseña
  incorrectos." and stays on sign in. A request to `/auth/v1/signup` with the publishable key
  is refused (422 `signup_disabled`).
- **AC4:** A user whose `app_metadata.role` is not `"owner"` (tested by removing the role
  temporarily) is signed out right after sign-in and sees "Esta cuenta no tiene acceso a la
  administración." A `PUT /auth/v1/user` with the owner's token and body
  `{"app_metadata":{"role":"x"}}` leaves the role unchanged.
- **AC5:** The session survives:
  (a) closing and reopening the browser;
  (b) an access token that has expired. Test by editing the stored `expires_at` to the past
  and reloading. The page refreshes the token and shows the signed-in view without asking for
  the password.
  (c) a phone clock set 2 hours behind or 2 hours ahead. Sign in, then reload after changing
  the clock. The signed-in view appears. The network panel shows at most one refresh per
  reload, never one before every request;
  (d) an access token that Supabase refuses while the stored expiry says it is valid. Test by
  replacing the stored `access_token` with `x` and reloading. The network panel shows
  `GET /auth/v1/user` → 403 `bad_jwt`, one refresh, then the same call → 200, and the
  signed-in view appears.
  With the network off, reloading a signed-in page keeps the session and shows "Sin conexión.
  Revisa tus datos e inténtalo otra vez." It does not sign the owner out.
- **AC6:** "Cerrar sesión" returns to the sign-in view and clears the stored session. A second
  browser that was signed in before also lands on sign in at its next token refresh (forced as
  in AC5 b), because sign-out is global.
- **AC7:** Recovery by link:
  (a) Entering the owner's email under "¿Olvidaste tu contraseña?" sends Supabase's default
  English recovery email. Any email address gets the same answer on the page, the
  "requested" message in Design.
  (b) Tapping the link in the email opens `/admin/` on the new-password view, also when the
  phone's mail app opens it in its own browser. The address bar shows `/admin/` with no
  `#access_token` and no tokens. Browser history keeps no entry with the tokens.
  (c) A new password typed twice is saved and the signed-in view shows "Contraseña cambiada."
  Signing in elsewhere with the old password then fails, and with the new one it works.
  (d) Opening the same link a second time, or after it expired, opens `/admin/` on the
  recovery view with "El enlace no es válido o ya caducó. Pide otro."
- **AC8:** The form refuses, before any request is sent, a new password shorter than 8
  characters ("La contraseña debe tener al menos 8 caracteres.") and two passwords that differ
  ("Las contraseñas no coinciden."). A 429 answer from any call shows "Demasiados intentos.
  Espera unos minutos y vuelve a intentarlo."
- **AC9:** If the script does not run, the forms stay hidden and a `<noscript>` message
  explains that the admin needs JavaScript. No form can send a password in a URL.
- **AC10:** Sign-in, recovery and sign-out work from `https://tienda-demo-cuba.vercel.app/admin/`
  and from `http://localhost:4321/admin/`, with no CORS errors in the console. A recovery
  requested from one of them sends a link that opens that same one.
- **AC11:** Public routes are unchanged:
  - No public route has a `<script>` tag.
  - No public route contains `supabase.co` or `sb_publishable_` (0013 AC7 now covers every
    route except `/admin/`).
  - `pnpm check:weight` measures public routes against spec 0001 unchanged, and `/admin/`
    against the admin budget in Design.
  - `pnpm typecheck` and `pnpm build` pass.

## Design

**Supabase settings** (dashboard, by hand, recorded in `supabase/auth.sql` as comments so a new
shop's setup repeats them)
| Setting | Value |
|---|---|
| Auth → Allow new users to sign up | off |
| Auth → Minimum password length | 8 |
| Auth → Email OTP expiration | 3600 s (default, 1 hour; the recovery link lasts this long) |
| Auth → Email templates | untouched (defaults; editing needs custom SMTP) |
| Auth → URL Configuration → Site URL | the site's `/admin/` URL: `https://tienda-demo-cuba.vercel.app/admin/` for the demo, `https://<shop domain>/admin/` for a sold shop |
| Auth → URL Configuration → Redirect URLs | the same `/admin/` URL, plus `http://localhost:4321/admin/` (exact entries, trailing slash included) |
| Auth → Users → Add user → Create new user | owner's email + a first password, auto-confirm on |
| JWT expiry, refresh token rotation | defaults (1 h; rotation on, 10 s reuse interval) |

If the dashboard has no "Create new user" with auto-confirm, `/develop` stops and reports. It
does not work around the problem with a secret key.

**`supabase/auth.sql`** (new file, run once in the SQL editor, after `schema.sql`)
```sql
-- True only for the shop owner's JWT (spec 0014). Used by write policies (feature 12) and
-- the publish Edge Function (feature 13).
create or replace function public.is_owner() returns boolean
  language sql stable
  as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner', false) $$;

-- Run once per shop after creating the owner user in the dashboard (replace the email):
-- update auth.users
--   set raw_app_meta_data = raw_app_meta_data || '{"role":"owner"}'
--   where email = 'owner@example.com';
```
A role change only reaches the JWT at the next refresh or sign-in (Supabase RLS docs).

**`src/lib/supabase.ts` change:** export the existing config check as `supabaseConfig()` (the
same validation and messages, renamed from `getConfig`). The admin page calls it at build
time. Nothing else in that file changes.

**`src/lib/auth.ts`** (browser module, imported only by the admin page's script)
- `initAuth({ url, key })` stores the config read from the page's `data-*` attributes.
- Every request: `fetch(`${url}/auth/v1/…`)` with headers `apikey: <key>` and
  `Content-Type: application/json`. Authenticated calls add
  `Authorization: Bearer <access_token>`. The publishable key never goes in `Authorization`.

| Function | Request | Result |
|---|---|---|
| `signIn(email, password)` | `POST /auth/v1/token?grant_type=password` `{email, password}` | stores session, returns user |
| `refresh()` (internal) | `POST /auth/v1/token?grant_type=refresh_token` `{refresh_token}` | stores the new session (the old refresh token is now used up) |
| `getSession()` | refreshes first if `expires_at` is less than 60 s away | `{ user, accessToken }` or `null` |
| `authFetch(path, init)` | any authenticated call to `${url}${path}`, with the token from `getSession()`; see "Expired token" | `Response`; used by `getUser`, `setPassword` and features 12–14 |
| `getUser()` | `GET /auth/v1/user` through `authFetch` | user; stores its `email` and `app_metadata` |
| `signOut()` | `POST /auth/v1/logout?scope=global` | clears the stored session even if the call fails |
| `requestRecovery(email)` | `POST /auth/v1/recover?redirect_to=<encoded location.origin + "/admin/">` `{email}`, no `code_challenge` (implicit flow) | always resolves the same way when the answer is 200 |
| `readRecoveryLink()` | no request; reads `location.hash` once on page load | `"recovery"`, `"linkError"` or `null`; see "Recovery link" |
| `setPassword(password)` | `PUT /auth/v1/user` `{password}` through `authFetch` | user |

- **Stored session:** `localStorage` key `admin-session`, JSON
  `{ access_token, refresh_token, expires_at, user: { email, app_metadata } }`. Reads and
  writes are wrapped in try/catch. If storage is unavailable, the session lasts only while the
  page is open.
- **Expired token, two layers** (AC5 c, d):
  1. **Main: expiry measured on the phone's own clock.** On every stored session (sign-in,
     refresh, recovery link), `expires_at = Date.now() + expires_in × 1000`. The `expires_at` that
     Supabase returns is ignored, because it comes from the server's clock. A phone whose
     clock is wrong still counts the hour correctly from when it received the token.
     `getSession()` compares against `Date.now()`, so a token is renewed before it is sent.
  2. **Backup: one retry after a rejected token.** A *rejected token* is any 401, or a 403
     whose error code is `bad_jwt` or `session_not_found`. Supabase Auth answers a malformed
     or invalid access token with 403 `bad_jwt`, and a closed session with 403
     `session_not_found`, not with 401 (Auth source). If a call made by `authFetch` gets a
     rejected token, `authFetch` refreshes once and repeats the same request once.
     - Any other 403 is a real refusal and is never retried, for example an RLS denial in
       feature 12.
     - If the refresh is refused, or the repeated request gets a rejected token again,
       `authFetch` clears the session and throws `AuthError { kind: "signedOut" }`.
     - It never retries more than once, so it cannot loop.
     - Requests that send a body keep it so they can be repeated, and features 12–14 do the
       same. If Storage or Edge Functions reject tokens with other codes, features 13–14 add
       those codes here.
- **Recovery link** (`readRecoveryLink()`, AC7). It runs first on page load, before anything
  else reads the session:
  - **Success fragment** (`#access_token=…&expires_in=…&refresh_token=…&token_type=bearer&type=recovery`):
    if `type` is `recovery` and the three token fields are present, store the session.
    `expires_at` comes from `expires_in` on the local clock, as always. `user` is filled by
    the `getUser()` that follows. Return `"recovery"`.
  - **Error fragment** (`#error=…&error_code=…&error_description=…`, for example
    `otp_expired` for a used or expired link): store nothing and return `"linkError"`.
  - **Either way, before returning:** remove the fragment with
    `history.replaceState(null, "", location.pathname + location.search)`. The tokens leave
    the address bar and are not kept in history. Any other fragment returns `null` untouched.
  - The fragment never reaches a server: browsers do not send it, so Vercel never sees the
    tokens.
- **On page load:** if a session is stored, the page calls `getUser()`. This checks the
  session with Supabase (it exercises both layers) and refreshes the `app_metadata` that the
  owner check reads. If `getUser()` fails with `offline`, the page shows the signed-in view
  from the stored user, plus the offline message.
- **Refresh failure:** any 400 or 401 answer clears the session and shows sign in. Supabase
  uses 400 for every refused refresh token: `refresh_token_not_found`,
  `refresh_token_already_used`, `session_not_found`, `session_expired` and
  `validation_failed`. A 429, a 5xx or a network error keeps the session. A network error also
  shows the offline message (AC5). The owner must not lose the
  session on Cuba's unreliable connections.
- **Owner check in the page:** after `signIn`, and after `getUser()` on a session that came
  from a recovery link, if
  `user.app_metadata.role !== "owner"`, call `signOut()` and show the no-access message (AC4).
  This is only for the UI. The real protection is `is_owner()` in RLS (feature 12).
- **Errors:** each function throws `AuthError { kind }`. The page maps `kind` to Spanish:

| `kind` | Comes from | Message |
|---|---|---|
| `credentials` | 400 `invalid_credentials` (same answer for an unknown email and a wrong password) | Email o contraseña incorrectos. |
| `linkError` | an error fragment from a recovery link (`readRecoveryLink()`); a used and an expired link look alike | El enlace no es válido o ya caducó. Pide otro. (shown on the recovery view) |
| `weak` | 422 `weak_password` | La contraseña debe tener al menos 8 caracteres. |
| `same` | 422 `same_password` | La nueva contraseña debe ser distinta de la anterior. |
| `rate` | HTTP 429 (any code, for example `over_request_rate_limit`, `over_email_send_rate_limit`) | Demasiados intentos. Espera unos minutos y vuelve a intentarlo. |
| `signedOut` | refresh refused, or a token rejected again after the one retry (`authFetch`) | Tu sesión terminó. Entra de nuevo. (shown on the sign-in view) |
| `offline` | `fetch` throws | Sin conexión. Revisa tus datos e inténtalo otra vez. |
| `unknown` | anything else | Algo salió mal. Inténtalo otra vez. |

  The code maps the error code, never `msg`, and checks `Content-Type` before parsing JSON
  (Auth openapi). It reads the error code from the body's `error_code`, or else from `code`
  when that is a string, or else from the `x-sb-error-code` response header. Newer Auth API
  versions moved the string from `error_code` to `code`. In the old shape, `code` is the HTTP
  status as a number.

**`src/pages/admin/index.astro`**
- Uses `BaseLayout` with `noindex`, title "Administración · <site.name>". There is no
  `SiteHeader`, `CategoryNav` or `SiteFooter`. A small admin header shows `site.name`.
- The root element carries `data-supabase-url` and `data-supabase-key` from
  `supabaseConfig()`.
- One processed `<script>` with no attributes. It imports `src/lib/auth.ts`, and Astro bundles
  it. No `define:vars`, no `is:inline`, no UI framework.
- Views are `<section>`s toggled with `hidden`. All of them start `hidden`, and the script
  shows the right one. A `<noscript>` holds "La administración necesita JavaScript activado."
  Forms have `method="post"` and the script calls `preventDefault`, so a form can never send a
  password in a URL (AC9).
- Views and fields (labels always visible, 44 px targets, design tokens only, as `design.md`):
  - **Entrar:** Email (`type=email`, `autocomplete=email`), Contraseña
    (`autocomplete=current-password`), button "Entrar", link-button
    "¿Olvidaste tu contraseña?".
  - **Recuperar:**
    - intro "Te enviaremos un enlace a tu email para crear una contraseña nueva.";
    - Email, button "Enviarme un enlace", back link "Volver";
    - after a 200, the form is replaced by the "requested" message: "Si el email es correcto,
      te enviamos un enlace. El correo llega en inglés, con el asunto «Reset your password».
      Ábrelo y toca el enlace. Caduca en 1 hora." The quoted subject must match the real
      email: AC7 (a) checks it, and if it differs, the real subject is used.
  - **Nueva contraseña:**
    - shown only after a successful recovery link;
    - Nueva contraseña and Repite la contraseña (`autocomplete=new-password`,
      `minlength=8`), button "Cambiar contraseña";
    - there is no code field and no back link: leaving means signing out or closing the page.
  - **Sesión iniciada:**
    - "Sesión iniciada como <email>", a `role="status"` line ("Contraseña cambiada." after a
      recovery), and the button "Cerrar sesión";
    - feature 12 adds its content here.
- While a request runs, its button is disabled and its label ends in "…". Messages go in one
  `role="status"` area per view (`role="alert"` for errors).
- Links to the admin use `/admin/`, with a trailing slash, the form that `dist/admin/index.html`
  serves.

**Weight** (`scripts/check-weight.mjs`): routes starting `/admin/` are measured against an
admin budget instead of the public one:
- HTML+CSS ≤ 50 KB gzipped;
- JS ≤ 15 KB gzipped (provisional, feature 12 may raise it with a measured reason);
- fonts, as public.

Every other route keeps spec 0001's budget, including JS ≤ 5 KB, which today is 0 B.

**Security**
- The admin's HTML and JS are public static files that hold no secret. Only the publishable
  key and project URL appear, and both are public by design. What protects the data is RLS
  with `is_owner()` (feature 12) and sign-ups being off.
- Brute force: Supabase limits `/token` to 150 requests per 5 min per IP and `/verify` to
  30. No captcha.
- The password and tokens are never logged. Our code never puts them in a URL. The only
  tokens in a URL are the ones Supabase places in the recovery link's fragment, and
  `readRecoveryLink()` removes them at once.
- The link's `redirect_to` is accepted only if it is in the Redirect URLs allow list.
  Otherwise Supabase falls back to the Site URL, so a recovery email can never send the
  session to another site.
- `localStorage` can be read by any script on the same origin. Public pages ship no JS, and
  the admin page loads only its own bundle, with no third-party scripts.

## Build plan
- [x] **T1** (AC1, AC7, AC10) Guide the owner through the dashboard settings table:
  - sign-ups off;
  - password length 8;
  - Site URL and Redirect URLs;
  - create the owner user.
  Stop and report if a setting is missing. The email templates stay untouched.
- [x] **T2** (AC1, AC4) Write `supabase/auth.sql` (function plus the commented setup steps).
  The owner runs it and sets the role. Check `is_owner()` in the SQL editor.
- [x] **T3** (AC3, AC5, AC6, AC7, AC8) `src/lib/auth.ts`: session store, the calls in the
  table, the two expired-token layers (local-clock expiry, one retry after a rejected token),
  the recovery-link reader and error mapping.
- [x] **T4** (AC11) Export `supabaseConfig()` from `src/lib/supabase.ts`.
- [x] **T5** (AC2, AC3, AC4, AC7, AC8, AC9) `src/pages/admin/index.astro`: four views,
  `noindex`, data attributes, processed script.
- [x] **T6** (AC11) `check-weight.mjs`: admin budget for `/admin/`, public budget unchanged.
- [x] **T7** (AC10, AC11) `pnpm typecheck`, build, `check:weight`. Then deploy and run the
  flows on the live demo and on localhost.
- [x] **T8** Update `learning/code/` walkthroughs for every new or changed file.

## Out of scope
- Any catalog editing, write policies, the publish button, photo upload (features 12–15).
- Several admin users, roles beyond `owner`, inviting staff.
- Custom SMTP, captcha, leaked-password protection, session time limits (Pro plan only).
- Changing the email or password from inside the admin, except through recovery.
- Offline editing or a service worker.

## Sources
- `docs/scope/scope.md` → feature 11. Specs 0001, 0012, 0013. `src/lib/supabase.ts`,
  `scripts/check-weight.mjs`, `src/layouts/BaseLayout.astro`.
- Owner answers, 2026-10-22: plain `fetch`, no SDK; recovery by email code (replaced on
  2026-10-23); session open until the owner signs out; online research allowed.
- Owner finding and answer, 2026-10-23: the dashboard requires custom SMTP to edit the Reset
  Password template, so recovery uses the default email's link.
- `researcher`, 2026-10-22, Supabase:
  - Auth REST API: `raw.githubusercontent.com/supabase/auth/master/openapi.yaml` (token,
    logout scopes, user, recover, verify, error schema with `error_code`).
  - supabase.com/docs:
    - guides/api/api-keys (publishable key in `apikey`, not `Authorization`);
    - guides/auth/sessions (1 h JWT, refresh tokens do not expire, 10 s reuse, time-box Pro
      only);
    - guides/auth/auth-smtp (default sender only to organization members);
    - guides/auth/rate-limits (2 emails an hour; `/token` 150 and `/verify` 30 per 5 min per
      IP);
    - guides/auth/auth-email-templates (`{{ .Token }}` 6-digit OTP);
    - guides/auth/general-configuration (sign-ups toggle);
    - guides/auth/password-security (≥ 8 recommended; leaked-password check Pro only);
    - guides/database/postgres/row-level-security (`app_metadata` not user-editable, claims
      update on refresh);
    - guides/auth/users.
- `researcher`, 2026-10-22, Astro 7.3.5 (installed):
  - docs.astro.build guides/client-side-scripts (processed `<script>` bundles TS and imports;
    any attribute disables processing);
  - guides/environment-variables (only `PUBLIC_` vars reach client code; `data-*` pattern);
  - reference/directives-reference (`define:vars` implies `is:inline`);
  - reference/configuration-reference (`trailingSlash: 'ignore'`, `build.format: 'directory'`).
- `researcher`, 2026-10-23, Supabase Auth error codes and statuses. Read from the `supabase/auth`
  source (`master`) and supabase.com/docs/guides/auth/debugging/error-codes:
  - files under `internal/api/`: `apierrors/apierrors.go`, `apierrors/errorcode.go`,
    `token.go`, `token_refresh.go`, `verify.go`, `user.go`, `errors.go`, `auth.go`,
    `signup.go`, `middleware.go`, `mail.go`;
  - also `internal/tokens/service.go`;
  - findings:
    - `invalid_credentials` 400;
    - `otp_expired` 403 for a wrong or an expired code;
    - `weak_password` and `same_password` 422;
    - 429 for rate limits;
    - refused refresh: 400;
    - a bad JWT on `/user`: 403 `bad_jwt`, and a closed session: 403 `session_not_found`;
    - a missing `Authorization` header: 401 `no_authorization`;
    - `signup_disabled` 422.
  - Nothing was run against a live project.
- `researcher`, 2026-10-23, the recovery link:
  - auth source `internal/api/recover.go`: the `/recover` body is only `email`,
    `code_challenge` and `code_challenge_method`, and the redirect is read from the request.
  - auth source `verify.go`: an error goes to the fragment in the implicit flow, with fields
    `error`, `error_code` and `error_description`, and `type` is added on success.
  - `openapi.yaml` (`AccessRefreshTokenRedirectResponse`): the success fragment holds
    `access_token`, `refresh_token` and `expires_in`; a disallowed redirect falls back to the
    Site URL.
  - supabase-js `GoTrueClient.ts` (fragment fields it reads).
  - supabase.com/docs:
    - guides/auth/redirect-urls (allow list, `*` and `**` rules, exact paths in production);
    - guides/auth/auth-email-templates (link prefetching by mail scanners can use up the link);
    - guides/auth/auth-smtp (default sender to team members only, 2 an hour);
    - guides/local-development/customizing-email-templates (default subject "Reset your
      password").
  - Secondary sources only, dated June 2026: dreamlit.ai and brevo.com blogs on template
    editing needing custom SMTP on new Free projects (it matches the dashboard).
- **Not confirmed, tested by the ACs:**
  - the query parameter name `redirect_to` on `POST /recover` (AC7 b, AC10);
  - the exact success fragment fields beyond the three in `openapi.yaml`, and the literal
    `error_code` of a used or expired link (AC7 b, d). The reader needs only the three token
    fields plus `type`, and treats any `error_code` as a link error;
  - the default email's real subject and body on the hosted project (AC7 a);
  - that a session from a recovery link can call `PUT /user` and refresh like any other
    (AC7 c);
  - that an *expired* JWT, and not only a malformed one, also answers 403 `bad_jwt` (AC5 b, d).
    Any 401 is retried as well, so either answer works;
  - the dashboard's "Create new user" with auto-confirm (T1);
  - that `PUT /user` ignores `app_metadata` (AC4);
  - that `scope=global` revokes other devices' refresh tokens (AC6);
  - CORS from the site's origin (AC10);
  - Auth endpoints working without an `Authorization` header (AC3).

---
## Rationale
<!-- History, not build input. /develop does not read below this line. -->
**Options considered:**
- Plain `fetch` (chosen, owner) vs `@supabase/supabase-js`: the runner-up handles refresh and
  recovery for us, but adds a package, more admin JS on Cuban mobile data, and breaks the
  no-SDK rule. Plain `fetch` needs about 100 lines that the learner can read.
- Recovery, first version (2026-10-22): an email code (chosen then) vs an email link. The
  worry was that a link opens in the mail app's own browser.
- Recovery, amended 2026-10-23 (owner): the default email's link (chosen) vs custom SMTP to
  keep the code. Editing the template turned out to need custom SMTP. That would mean one
  external email account per shop, its credentials in Supabase, sender verification at each
  sale, and a silent failure if that account is ever suspended.
  - The link needs no new service. The implicit flow carries the session inside the link, so
    opening it in the mail app's browser is fine, and the original worry does not apply.
  - The costs: an English email, which the page explains in Spanish, and a one-time link that
    a mail scanner could use up first. The owner then asks for another one.
  - Custom SMTP stays a possible paid extra at a sale (Spanish emails), and would need a new
    decision.
- Session until sign-out (chosen, owner) vs a daily re-login: session time-boxes are Pro-only
  anyway, and the owner updates prices often.
- Global sign-out (chosen) vs local: with one owner, "sign out" meaning "everywhere" also
  covers a lost phone without SQL on `auth.sessions` (not documented).
- `app_metadata.role` + `is_owner()` (chosen) vs an `admins` table: there is no extra table
  or join, and the claim is in every JWT, so the Edge Function can read it too. The table
  would have let the role change without a token refresh, which one owner never needs.
- `data-*` attributes (chosen) vs renaming to `PUBLIC_SUPABASE_*` or `astro:env`: no rename
  across specs 0013 and Vercel. The validation stays in one place.
- One page with views (chosen) vs separate `/admin/recuperar`: one script and one URL to hand
  the owner.
- Expired token: local-clock expiry plus one retry after a 401 (chosen, owner, 2026-10-22).
  The alternatives were the server's `expires_at` alone, which breaks on a phone with a wrong
  clock (behind: it sends expired tokens; ahead: it refreshes before every request), and a 401
  retry alone, which wastes one failed request every hour on slow connections. The local
  clock prevents the problem, and the retry is the safety net.
- Retry trigger: any 401, or a 403 with `bad_jwt` or `session_not_found` (amended 2026-10-23,
  before building). The first version said "401" only, but Supabase Auth answers bad tokens
  with 403, so the backup would never have run. The runner-up was retrying on every 403. It
  was rejected because a 403 can also be a real refusal (RLS in feature 12), and retrying
  that only hides the error and wastes a refresh.

**Assumptions and risks:**
- Emails go out only to organization members, 2 an hour. A sold shop whose admin email is not
  its Supabase account email needs custom SMTP (a new decision).
- Some mail services open links to scan them, which can use up the one-time recovery link
  before the owner taps it (Supabase email-templates docs). The fix the docs suggest needs an
  edited template, so this spec has none. The owner sees "El enlace no es válido o ya caducó"
  and asks again. Only 2 emails an hour are allowed.
- Rate limits are per IP. Many Cuban users share a carrier NAT IP, so a burst from others
  could block sign-in for some minutes. The owner then sees the 429 message.
- A free project pauses after 7 days without activity (spec 0012), and login fails until it
  is restored. The fetch error then shows as "Algo salió mal" or the offline message.
- `localStorage` tokens are exposed to any script on the origin. This is acceptable while
  the site ships no third-party JS. Revisit if analytics or widgets are ever added.
