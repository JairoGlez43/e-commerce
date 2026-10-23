# `src/pages/admin/index.astro`

> **Qué es:** la página de administración del dueño, `/admin/`: entrar, recuperar la contraseña
> y cerrar sesión · **Lo decidió:** [spec 0014](../../../../../docs/specs/0014-owner-login.md)
> (Design → `src/pages/admin/index.astro`), con la regla de la
> [spec 0012](../../../../../docs/specs/0012-admin-backend.md) de que `/admin/` es la única ruta
> con JavaScript · **Lo usan:** nadie lo importa; es una página propia por
> [ruta por archivo](../../../glosario.md#ruta-por-archivo). Ninguna página de clientes enlaza
> aquí · **Usa:** `BaseLayout`, `site` de `src/lib/site.ts`, `supabaseConfig()` de
> [`src/lib/supabase.ts`](../../lib/supabase.ts.md) (en el build) y
> [`src/lib/auth.ts`](../../lib/auth.ts.md) (en el navegador)

## Para qué sirve

Es la puerta de la futura administración del catálogo (features 12–15). Hoy enseña una de cuatro
**vistas**, según el momento:

| Vista | Cuándo sale |
|---|---|
| Entrar (`sign-in`) | no hay sesión, o la sesión se acabó |
| Recuperar la contraseña (`recover`) | el dueño pulsa "¿Olvidaste tu contraseña?", o el enlace del correo no vale |
| Nueva contraseña (`new-password`) | el dueño llega desde el enlace del correo |
| Sesión iniciada (`signed-in`) | el dueño ya entró; la feature 12 pondrá aquí su contenido |

**Es la única página del sitio con JavaScript.** Las páginas de clientes no llevan ni una línea
(spec 0001: tienen que ser ligeras para las conexiones de Cuba). Pero un login necesita hablar
con Supabase **después** del build, cuando el dueño escribe su contraseña, y en un sitio
estático eso solo lo puede hacer el navegador. La spec 0012 permitió esa excepción solo para
`/admin/`, y la spec 0014 le dio su propio presupuesto de peso
([`check-weight.mjs.md`](../../../scripts/check-weight.mjs.md)).

La página tiene dos partes que corren en momentos distintos:

1. El [frontmatter](../../../glosario.md#frontmatter) y el HTML: corren **en el build**, como en
   cualquier otra página. Producen `dist/admin/index.html` con las cuatro vistas escondidas.
2. El `<script>` del final: corre **en el navegador** del dueño. Decide qué vista enseñar y
   reacciona a los formularios. Toda la lógica de sesión vive en
   [`auth.ts`](../../lib/auth.ts.md); el script solo lee formularios, cambia de vista y pone
   mensajes en español.

## El código, por partes

### 1. El frontmatter

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { site } from '../../lib/site';
import { supabaseConfig } from '../../lib/supabase';
```

- `---`: abre el [frontmatter](../../../glosario.md#frontmatter).
- `import BaseLayout …`: el [layout](../../../glosario.md#layout) común
  ([explicación](../../layouts/BaseLayout.astro.md)). Las rutas empiezan por `../../` porque esta
  página está una carpeta más abajo que las demás (`src/pages/admin/`).
- `import { site } …`: el nombre de la tienda ([explicación](../../lib/site.ts.md)).
- `import { supabaseConfig } …`: la función que lee y valida `SUPABASE_URL` y
  `SUPABASE_PUBLISHABLE_KEY` ([explicación](../../lib/supabase.ts.md#4-leer-y-validar-la-configuración)).

```astro

// The owner's admin (spec 0014): a static page whose script talks to Supabase Auth from the
// browser. The only route allowed client JS (spec 0012). Public pages never link here.
// Both values are public by design; the script reads them from the data attributes below.
const { url, key } = supabaseConfig();
---
```

- El comentario: "La administración del dueño (spec 0014): una página estática cuyo script habla
  con Supabase Auth desde el navegador. La única ruta a la que se le permite JavaScript en el
  cliente (spec 0012). Las páginas públicas nunca enlazan aquí. Los dos valores son públicos por
  diseño; el script los lee de los atributos data de abajo."
- `const { url, key } = supabaseConfig();`: en el build, lee la dirección del proyecto y la
  [clave publishable](../../../glosario.md#clave-publishable)
  ([desestructuración](../../../glosario.md#desestructuracion)). Si falta una o está mal, el build
  se para con el mismo mensaje que el resto del sitio.
- ¿No es peligroso meterlas en el HTML? No: las dos son **públicas por diseño**. La clave
  publishable solo permite lo que dejan las [políticas](../../../glosario.md#politica) de
  [RLS](../../../glosario.md#rls), y sin una sesión de dueño eso es solo leer el catálogo, que ya
  es público. Lo que nunca puede aparecer es la clave secreta, y `supabaseConfig()` la rechaza.
  Desde la spec 0014, `/admin/` es la única página donde está permitido que aparezcan.
- ¿Por qué no leer las variables directamente en el script? Porque el script corre en el
  navegador, donde las variables de entorno no existen (solo las que empiezan por `PUBLIC_`, que
  el proyecto decidió no usar). Se escriben en el HTML y el script las lee de ahí
  ([script en Astro](../../../glosario.md#script-en-astro)).
- `---`: cierra el frontmatter.

### 2. El layout y la cabecera

```astro
<BaseLayout title={`Administración · ${site.name}`} description="Administración del catálogo." noindex>
	<header class="border-b border-border bg-surface">
		<div class="awning" aria-hidden="true"></div>
		<div class="mx-auto flex max-w-md items-center px-4 py-3">
			<p class="font-display text-2xl font-semibold">{site.name}</p>
		</div>
	</header>
```

- `<BaseLayout … noindex>`: el título de la pestaña queda "Administración · Tienda de alimentos
  (demo)" ([template literal](../../../glosario.md#template-literal)), con una descripción y
  [`noindex`](../../../glosario.md#noindex) para que los buscadores no la muestren (AC2).
- Sin `SiteHeader`, `CategoryNav` ni `SiteFooter`: el dueño no necesita el menú de categorías ni
  el WhatsApp de la tienda. En su lugar, una cabecera pequeña:
  - `<header class="border-b border-border bg-surface">`: fondo blanco con una línea beige abajo,
    como la cabecera de la tienda.
  - `<div class="awning" aria-hidden="true">`: el toldo de rayas, decorativo
    ([aria-hidden](../../../glosario.md#aria-hidden)).
  - `mx-auto flex max-w-md items-center px-4 py-3`: centrado, con un ancho máximo de 448 px
    (`max-w-md`), más estrecho que el catálogo porque solo hay un formulario; 16 px a los lados y
    12 px arriba y abajo.
  - `<p class="font-display text-2xl font-semibold">{site.name}</p>`: el nombre de la tienda en
    Fraunces, 24 px.

### 3. El contenedor, con la configuración

```astro
	<main id="admin" data-supabase-url={url} data-supabase-key={key} class="mx-auto flex max-w-md flex-col gap-6 px-4 py-8">
		<h1>Administración</h1>
		<noscript>
			<p class="rounded-card border border-border bg-surface p-4">La administración necesita JavaScript activado.</p>
		</noscript>
```

- `<main id="admin" …>`: el contenedor de todas las vistas. El script lo busca por su `id`.
- `data-supabase-url={url} data-supabase-key={key}`: dos [atributos data](../../../glosario.md#atributo-data)
  con los valores del bloque 1. En el HTML final quedan como
  `data-supabase-url="https://<ref>.supabase.co"` y `data-supabase-key="sb_publishable_…"`. Así
  pasa la configuración del build al navegador.
- `mx-auto flex max-w-md flex-col gap-6 px-4 py-8`: columna centrada de 448 px como máximo, con
  24 px entre bloques, 16 px a los lados y 32 px arriba y abajo.
- `<h1>Administración</h1>`: el título de la página.
- `<noscript>…</noscript>`: si el navegador no ejecuta JavaScript, enseña "La administración
  necesita JavaScript activado." en una caja con aspecto de tarjeta
  ([noscript](../../../glosario.md#noscript)). Sin JavaScript, las cuatro vistas siguen
  escondidas, así que este es lo único que se ve (AC9).

### 4. La vista "Entrar"

```astro

		<!-- Every view starts hidden; the script shows one at a time. -->
		<section data-view="sign-in" hidden class="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
			<h2>Entrar</h2>
			<form data-form="sign-in" method="post" novalidate class="flex flex-col gap-4">
```

- `<!-- … -->`: un comentario HTML: "Todas las vistas empiezan escondidas; el script enseña una
  cada vez." A diferencia de un [comentario en la plantilla](../../../glosario.md#comentario-en-plantilla)
  `{/* */}`, este sí llega al HTML final (es visible con "Ver código fuente").
- `<section data-view="sign-in" hidden …>`: la vista. `data-view` le da un nombre para que el
  script la encuentre; `hidden` la esconde ([atributo hidden](../../../glosario.md#atributo-hidden)).
  Las clases la convierten en una tarjeta: columna con 16 px entre elementos, esquinas
  `rounded-card`, borde beige, fondo blanco y 16 px de relleno. La clase `flex` no la vuelve
  visible: el `hidden` gana.
- `<form data-form="sign-in" method="post" novalidate …>`:
  - `data-form`: para que el script encuentre el formulario.
  - `method="post"`: si por lo que fuera el formulario llegara a enviarse solo, los datos irían en
    el cuerpo y **no** en la dirección. Con el `get` por defecto, la contraseña acabaría en la
    URL (`?password=…`), visible en el historial. Además el script nunca deja que se envíe
    (bloque 15) (AC9).
  - `novalidate`: apaga los avisos automáticos del navegador; el script los lanza él mismo con
    `reportValidity()`, justo antes de hacer la petición
    ([validación de formularios](../../../glosario.md#validacion-de-formularios)).

```astro
				<div class="flex flex-col gap-1">
					<label for="sign-in-email" class="font-medium">Email</label>
					<input
						id="sign-in-email"
						name="email"
						type="email"
						autocomplete="email"
						required
						class="min-h-11 w-full rounded-card border border-muted bg-surface px-4 text-ink"
					/>
				</div>
```

- `<div class="flex flex-col gap-1">`: etiqueta y campo, uno encima del otro, a 4 px.
- `<label for="sign-in-email" class="font-medium">Email</label>`: la etiqueta, **visible** (spec
  0014: etiquetas siempre visibles) y unida al campo por `for` = `id`. Peso 500.
- `<input …>`:
  - `name="email"`: el nombre con el que el script lee el valor (`data.get('email')`).
  - `type="email"` y `required`: tiene que tener forma de email y no puede ir vacío.
  - `autocomplete="email"`: el móvil puede rellenarlo solo ([autocomplete](../../../glosario.md#autocomplete)).
  - Clases: al menos 44 px de alto ([área táctil](../../../glosario.md#area-tactil)), todo el
    ancho, esquinas de tarjeta, borde gris `muted` (más oscuro que el beige, para que el campo se
    vea bien), fondo blanco, 16 px de relleno a los lados y texto `ink`.

```astro
				<div class="flex flex-col gap-1">
					<label for="sign-in-password" class="font-medium">Contraseña</label>
					<input
						id="sign-in-password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
						class="min-h-11 w-full rounded-card border border-muted bg-surface px-4 text-ink"
					/>
				</div>
```

- Igual que el email, para la contraseña. `type="password"` la oculta con puntos.
  `autocomplete="current-password"`: "la contraseña de siempre", para que el gestor de contraseñas
  la ofrezca.

```astro
				<p data-alert role="alert" class="font-medium text-accent empty:hidden"></p>
				<button
					type="submit"
					data-label="Entrar"
					class="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover disabled:opacity-50"
				>
					Entrar
				</button>
			</form>
```

- `<p data-alert role="alert" …></p>`: el sitio de los mensajes de error de esta vista. Empieza
  vacío.
  - `role="alert"`: cuando el script escriba un error, el lector de pantalla lo lee en seguida
    ([role-alert-status](../../../glosario.md#role-alert-status)).
  - `font-medium text-accent`: en rojo, peso 500.
  - `empty:hidden`: mientras está vacío, no ocupa sitio ([variante](../../../glosario.md#variante)
    `empty:`).
- `<button type="submit" data-label="Entrar" …>`: el botón que envía el formulario.
  - `data-label`: guarda el texto original, para que `whileBusy()` (bloque 13) lo pueda cambiar a
    "Entrar…" y luego devolverlo.
  - Las clases son las del botón principal de la [guía de estilo](../estilo.astro.md#11-sección-botón-principal),
    más `disabled:opacity-50`: medio transparente mientras está desactivado.
- `</form>`: cierra el formulario.

```astro
			<button type="button" data-go="recover" class="inline-flex min-h-11 w-fit items-center text-accent underline underline-offset-4">
				¿Olvidaste tu contraseña?
			</button>
		</section>
```

- Un `<button type="button">` con aspecto de enlace: no envía el formulario (está fuera de él y
  es `type="button"`). `data-go="recover"` le dice al script a qué vista ir (bloque 19).
- ¿Por qué un botón y no un `<a>`? Porque no lleva a otra página: cambia de vista dentro de la
  misma.
- Clases: 44 px de alto, solo el ancho del texto (`w-fit`), rojo, subrayado a 4 px del texto
  (`underline underline-offset-4`).
- `</section>`: cierra la vista.

### 5. La vista "Recuperar la contraseña"

```astro

		<section data-view="recover" hidden class="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
			<h2>Recuperar la contraseña</h2>
			<p class="text-sm text-muted">Te enviaremos un enlace a tu email para crear una contraseña nueva.</p>
			<p data-requested role="status" hidden>
				Si el email es correcto, te enviamos un enlace. El correo llega en inglés, con el asunto «Reset your
				password». Ábrelo y toca el enlace. Caduca en 1 hora.
			</p>
```

- La misma tarjeta escondida, ahora con `data-view="recover"`.
- `<p class="text-sm text-muted">`: la explicación, en gris y a 14 px.
- `<p data-requested role="status" hidden>`: el mensaje "pedido" (spec 0014). Empieza escondido;
  el script lo enseña y esconde el formulario cuando Supabase contesta 200 (bloque 17).
  `role="status"` hace que el lector de pantalla lo lea cuando aparece, sin interrumpir.
- El texto avisa de tres cosas que el dueño no sabría: que "si el email es correcto" (Supabase
  contesta igual a cualquier email, para no revelar cuáles existen), que el correo llega **en
  inglés** con el asunto «Reset your password» (el proyecto no cambia la plantilla de Supabase) y
  que el enlace caduca en una hora.

```astro
			<form data-form="recover" method="post" novalidate class="flex flex-col gap-4">
				<div class="flex flex-col gap-1">
					<label for="recover-email" class="font-medium">Email</label>
					<input
						id="recover-email"
						name="email"
						type="email"
						autocomplete="email"
						required
						class="min-h-11 w-full rounded-card border border-muted bg-surface px-4 text-ink"
					/>
				</div>
				<p data-alert role="alert" class="font-medium text-accent empty:hidden"></p>
				<button
					type="submit"
					data-label="Enviarme un enlace"
					class="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover disabled:opacity-50"
				>
					Enviarme un enlace
				</button>
			</form>
			<button type="button" data-go="sign-in" class="inline-flex min-h-11 w-fit items-center text-accent underline underline-offset-4">
				Volver
			</button>
		</section>
```

- El formulario es igual que el de entrar, pero con un solo campo, el email, y el botón "Enviarme
  un enlace".
- `<p data-alert role="alert">`: aquí sale, por ejemplo, "El enlace no es válido o ya caducó.
  Pide otro." cuando el dueño abre un enlace gastado (bloque 21).
- `<button type="button" data-go="sign-in">Volver</button>`: vuelve a la vista de entrar.

### 6. La vista "Nueva contraseña"

```astro

		<section data-view="new-password" hidden class="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
			<h2>Nueva contraseña</h2>
			<form data-form="new-password" method="post" novalidate class="flex flex-col gap-4">
				<div class="flex flex-col gap-1">
					<label for="new-password-password" class="font-medium">Nueva contraseña</label>
					<input
						id="new-password-password"
						name="password"
						type="password"
						autocomplete="new-password"
						minlength="8"
						required
						class="min-h-11 w-full rounded-card border border-muted bg-surface px-4 text-ink"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="new-password-repeat" class="font-medium">Repite la contraseña</label>
					<input
						id="new-password-repeat"
						name="repeat"
						type="password"
						autocomplete="new-password"
						minlength="8"
						required
						class="min-h-11 w-full rounded-card border border-muted bg-surface px-4 text-ink"
					/>
				</div>
				<p data-alert role="alert" class="font-medium text-accent empty:hidden"></p>
				<button
					type="submit"
					data-label="Cambiar contraseña"
					class="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover disabled:opacity-50"
				>
					Cambiar contraseña
				</button>
			</form>
		</section>
```

- Solo aparece cuando el dueño llega desde el enlace del correo.
- Dos campos de contraseña, `password` y `repeat`, los dos con:
  - `autocomplete="new-password"`: el navegador puede proponer una contraseña segura.
  - `minlength="8"`: al menos 8 caracteres, el mínimo configurado en Supabase (spec 0014). El
    script lo vuelve a comprobar (bloque 18).
- No hay botón "Volver" (spec 0014): salir significa cerrar la página.

### 7. La vista "Sesión iniciada"

```astro

		<section data-view="signed-in" hidden class="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
			<p>Sesión iniciada como <strong data-email></strong></p>
			<p data-status role="status" class="text-sm text-muted empty:hidden"></p>
			<p data-alert role="alert" class="font-medium text-accent empty:hidden"></p>
			<button
				type="button"
				data-sign-out
				data-label="Cerrar sesión"
				class="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-border bg-surface px-6 font-medium text-ink hover:border-accent disabled:opacity-50"
			>
				Cerrar sesión
			</button>
		</section>
	</main>
</BaseLayout>
```

- `<strong data-email></strong>`: vacío en el HTML; el script escribe ahí el email del dueño.
- `<p data-status role="status" …>`: avisos tranquilos, en gris: "Contraseña cambiada."
- `<p data-alert role="alert" …>`: errores; por ejemplo, "Sin conexión…" cuando se abre sin red.
- El botón "Cerrar sesión": `type="button"` (no hay formulario), `data-sign-out` para que el
  script lo encuentre, y las clases del botón secundario (blanco con borde beige que se vuelve
  rojo al pasar el ratón).
- La feature 12 añadirá en esta vista la edición del catálogo.
- `</main>` y `</BaseLayout>`: cierran el contenedor y el layout. Aquí acaba todo lo que se
  ejecuta en el build.

### 8. El script: qué es y qué importa

```astro

<script>
	// The admin's views (spec 0014). Every Auth rule lives in src/lib/auth.ts; this script only
	// reads the forms, shows one view at a time and turns errors into Spanish messages.
```

- `<script>`: sin ningún atributo, así que Astro lo **procesa**: entiende TypeScript y los
  `import`, lo junta con `auth.ts` en un solo archivo de `dist/_astro/` y escribe en la página un
  `<script type="module" src="/_astro/….js">` ([script en Astro](../../../glosario.md#script-en-astro)).
  Ese archivo pesaba 2,6 KB comprimido el 2026-10-23.
- El comentario: "Las vistas de la administración (spec 0014). Todas las reglas de Auth viven en
  `src/lib/auth.ts`; este script solo lee los formularios, enseña una vista cada vez y convierte
  los errores en mensajes en español."

```astro
	import {
		AuthError,
		type AuthErrorKind,
		type AuthUser,
		getUser,
		hasSession,
		initAuth,
		isOwner,
		readRecoveryLink,
		requestRecovery,
		setPassword,
		signIn,
		signOut,
		storedUser,
	} from '../../lib/auth';
```

- Trae de [`auth.ts`](../../lib/auth.ts.md) la clase de error, dos tipos (marcados con `type`,
  [import-type](../../../glosario.md#import-type)) y todas las acciones que la página usa. Cada
  una está explicada allí.

### 9. Los textos

```astro

	type View = 'sign-in' | 'recover' | 'new-password' | 'signed-in';
```

- `type View`: los cuatro nombres de vista ([alias de tipo](../../../glosario.md#alias-de-tipo)),
  los mismos que los `data-view` del HTML. Si se escribe uno mal, el
  [typecheck](../../../glosario.md#typecheck) avisa.

```astro

	const MESSAGES: Record<AuthErrorKind, string> = {
		credentials: 'Email o contraseña incorrectos.',
		linkError: 'El enlace no es válido o ya caducó. Pide otro.',
		weak: 'La contraseña debe tener al menos 8 caracteres.',
		same: 'La nueva contraseña debe ser distinta de la anterior.',
		rate: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
		signedOut: 'Tu sesión terminó. Entra de nuevo.',
		offline: 'Sin conexión. Revisa tus datos e inténtalo otra vez.',
		unknown: 'Algo salió mal. Inténtalo otra vez.',
	};
```

- `MESSAGES`: un mensaje en español para **cada** tipo de `AuthError`. El tipo
  `Record<AuthErrorKind, string>` obliga a que estén los 8: si `auth.ts` añadiera un tipo nuevo y
  aquí faltara su mensaje, el typecheck fallaría ([record-y-unknown](../../../glosario.md#record-y-unknown)).
  Son los textos exactos de la tabla de errores de la spec 0014.

```astro
	const NO_ACCESS = 'Esta cuenta no tiene acceso a la administración.';
	const MISMATCH = 'Las contraseñas no coinciden.';
	const PASSWORD_CHANGED = 'Contraseña cambiada.';
	// The project's minimum password length, set in the Supabase dashboard (spec 0014).
	const MIN_PASSWORD = 8;
```

- Tres mensajes que no vienen de un `AuthError`: cuenta sin permiso (AC4), contraseñas distintas
  (AC8) y contraseña cambiada (AC7 c).
- El comentario: "La longitud mínima de contraseña del proyecto, configurada en el panel de
  Supabase (spec 0014)." Tiene que coincidir con ese ajuste y con el `minlength="8"` del HTML.

### 10. Encontrar las piezas de la página

```astro

	const root = document.getElementById('admin')!;
	initAuth({ url: root.dataset.supabaseUrl!, key: root.dataset.supabaseKey! });
```

- `document.getElementById('admin')!`: el `<main>`. El `!` dice "seguro que existe"
  ([afirmación de no nulo](../../../glosario.md#afirmacion-no-nulo)): está en el HTML de esta misma
  página.
- `root.dataset.supabaseUrl`: el atributo `data-supabase-url` del bloque 3
  ([atributo data](../../../glosario.md#atributo-data)). Lo mismo con la clave.
- `initAuth({ url, key })`: se los entrega a `auth.ts`, que ya puede hacer peticiones.

```astro

	const section = (view: View) => root.querySelector<HTMLElement>(`[data-view="${view}"]`)!;
	const form = (view: View) => section(view).querySelector<HTMLFormElement>('[data-form]')!;
	const requested = root.querySelector<HTMLElement>('[data-requested]')!;
```

- `section('recover')`: devuelve la `<section data-view="recover">`. `querySelector<HTMLElement>`
  le dice a TypeScript qué tipo de elemento se espera (un [genérico](../../../glosario.md#generico)).
- `form('recover')`: el `<form>` de esa vista.
- `requested`: el mensaje "pedido" de la vista de recuperar.

### 11. El tipo de un error

```astro

	function kindOf(error: unknown): AuthErrorKind {
		return error instanceof AuthError ? error.kind : 'unknown';
	}
```

- Un `catch` puede recibir cualquier cosa (`unknown`). Si es un `AuthError`
  ([instanceof](../../../glosario.md#instanceof)), devuelve su `kind`; si no (un error inesperado
  de programación), `'unknown'`, que también tiene mensaje.

### 12. Enseñar una vista

```astro

	// Shows one view, with an optional error message in its alert area.
	function show(view: View, alert = '') {
		for (const element of root.querySelectorAll<HTMLElement>('[data-view]')) {
			element.hidden = element.dataset.view !== view;
			element.querySelector('[data-alert]')!.textContent = '';
		}
		section(view).querySelector('[data-alert]')!.textContent = alert;
		if (view === 'recover') {
			form('recover').hidden = false;
			requested.hidden = true;
		}
	}
```

- El comentario: "Enseña una vista, con un mensaje de error opcional en su zona de alertas."
- `alert = ''`: segundo argumento opcional; por defecto, sin mensaje.
- El `for`: recorre las cuatro vistas. `element.hidden = element.dataset.view !== view;` esconde
  todas menos la pedida. Y vacía el mensaje de error de cada una, para que no quede uno viejo.
- `…textContent = alert;`: escribe el mensaje en la vista pedida. Como ese `<p>` tiene
  `role="alert"`, el lector de pantalla lo lee; si es `''`, `empty:hidden` lo esconde.
  `textContent` escribe texto tal cual, nunca HTML.
- `if (view === 'recover')`: cada vez que se vuelve a esa vista, deja el formulario visible y el
  mensaje "pedido" escondido, por si quedó así de una vez anterior.

```astro

	function showSignedIn(user: AuthUser, status = '', alert = '') {
		root.querySelector('[data-email]')!.textContent = user.email;
		root.querySelector('[data-status]')!.textContent = status;
		show('signed-in', alert);
	}
```

- `showSignedIn()`: rellena el email y el aviso (`status`, por ejemplo "Contraseña cambiada.") y
  enseña la vista de sesión iniciada, con un error opcional.

### 13. El botón mientras espera

```astro

	// Disables the button and ends its label in "…" while the request runs.
	async function whileBusy(button: HTMLButtonElement, task: () => Promise<void>) {
		const label = button.dataset.label!;
		button.disabled = true;
		button.textContent = `${label}…`;
		try {
			await task();
		} finally {
			button.disabled = false;
			button.textContent = label;
		}
	}
```

- El comentario: "Desactiva el botón y termina su texto en '…' mientras corre la petición."
- `task: () => Promise<void>`: recibe una función async (la petición) y la espera.
- `button.disabled = true` y `Entrar…`: el dueño ve que algo pasa (con conexiones lentas puede
  tardar) y no puede pulsar dos veces.
- `finally`: haya ido bien o mal, el botón vuelve a estar activo y con su texto
  ([finally](../../../glosario.md#finally)).

### 14. Solo el dueño puede pasar

```astro

	// Only the owner may use the admin; any other account is signed out at once (AC4).
	async function enter(user: AuthUser, status = '') {
		if (!isOwner(user)) {
			await signOut();
			show('sign-in', NO_ACCESS);
			return;
		}
		showSignedIn(user, status);
	}
```

- El comentario: "Solo el dueño puede usar la administración; cualquier otra cuenta sale en el
  acto (AC4)."
- Si el usuario no tiene `role: 'owner'` en su [`app_metadata`](../../../glosario.md#app-metadata):
  cierra su sesión y vuelve a "Entrar" con "Esta cuenta no tiene acceso a la administración."
- Esto es solo para la pantalla. Lo que de verdad protegerá los datos es
  [`is_owner()`](../../../supabase/auth.sql.md) en la base de datos (feature 12).

### 15. Escuchar un formulario

```astro

	function onSubmit(view: View, handler: (data: FormData, button: HTMLButtonElement) => Promise<void>) {
		const element = form(view);
		element.addEventListener('submit', (event) => {
			// Forms never submit themselves, so a password can never end up in a URL (AC9).
			event.preventDefault();
			if (!element.reportValidity()) return;
			const button = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
			section(view).querySelector('[data-alert]')!.textContent = '';
			void whileBusy(button, () => handler(new FormData(element), button));
		});
	}
```

- `onSubmit(view, handler)`: conecta el formulario de una vista con la función que lo atiende.
  Los tres formularios hacen lo mismo al enviarse, así que el código común vive aquí una sola vez.
- `addEventListener('submit', …)`: se ejecuta al pulsar el botón o Enter.
- El comentario: "Los formularios nunca se envían solos, así una contraseña nunca puede acabar en
  una URL (AC9)."
- `event.preventDefault()`: cancela el envío normal del navegador (que recargaría la página).
- `if (!element.reportValidity()) return;`: revisa `required`, `type="email"` y `minlength`, y si
  algo falla enseña el aviso del navegador y no sigue
  ([validación de formularios](../../../glosario.md#validacion-de-formularios)). No se manda
  ninguna petición.
- Borra el error anterior de esa vista.
- `new FormData(element)`: lee todos los campos del formulario por su `name`
  (`data.get('email')`).
- `void whileBusy(…)`: lanza la petición con el botón ocupado. El `void` dice que, a propósito, no
  se espera aquí ([operador void](../../../glosario.md#operador-void)).

### 16. Formulario "Entrar"

```astro

	onSubmit('sign-in', async (data) => {
		try {
			const user = await signIn(String(data.get('email')), String(data.get('password')));
			form('sign-in').reset();
			await enter(user);
		} catch (error) {
			show('sign-in', MESSAGES[kindOf(error)]);
		}
	});
```

- `signIn(email, password)`: pide la sesión a Supabase. `String(…)` asegura que sea texto
  (`data.get` puede devolver otras cosas para campos de archivo).
- `form('sign-in').reset()`: vacía los campos, para que la contraseña no se quede escrita.
- `await enter(user)`: comprueba que es el dueño y enseña la vista de sesión iniciada.
- `catch`: cualquier error → el mensaje en español de su tipo, en la vista de entrar. Con una
  contraseña mal: "Email o contraseña incorrectos." (AC3).

### 17. Formulario "Recuperar"

```astro

	onSubmit('recover', async (data) => {
		try {
			await requestRecovery(String(data.get('email')));
			form('recover').hidden = true;
			requested.hidden = false;
		} catch (error) {
			show('recover', MESSAGES[kindOf(error)]);
		}
	});
```

- `requestRecovery(email)`: pide a Supabase que mande el correo.
- Si contesta bien, esconde el formulario y enseña el mensaje "Si el email es correcto, te
  enviamos un enlace…". Es el mismo para cualquier email.
- Si no, el mensaje del error; por ejemplo, con un 429 (más de 2 correos en una hora), "Demasiados
  intentos…".

### 18. Formulario "Nueva contraseña"

```astro

	onSubmit('new-password', async (data) => {
		const password = String(data.get('password'));
		// Checked here, before any request is sent (AC8).
		if (password.length < MIN_PASSWORD) return show('new-password', MESSAGES.weak);
		if (password !== String(data.get('repeat'))) return show('new-password', MISMATCH);
```

- El comentario: "Se comprueba aquí, antes de mandar ninguna petición (AC8)."
- Menos de 8 caracteres → "La contraseña debe tener al menos 8 caracteres." (El `minlength` del
  HTML ya lo frena en `reportValidity()`; esta es una segunda red, con el mensaje en español.)
- Las dos contraseñas distintas → "Las contraseñas no coinciden."
- `return show(…)`: enseña el error y termina la función en la misma línea.

```astro
		try {
			const user = await setPassword(password);
			form('new-password').reset();
			showSignedIn(user, PASSWORD_CHANGED);
		} catch (error) {
			const kind = kindOf(error);
			show(kind === 'signedOut' ? 'sign-in' : 'new-password', MESSAGES[kind]);
		}
	});
```

- `setPassword(password)`: guarda la contraseña nueva en Supabase.
- Si va bien: vacía los campos y enseña la sesión iniciada con "Contraseña cambiada." (AC7 c).
- Si falla: si la sesión se acabó, a "Entrar" con "Tu sesión terminó. Entra de nuevo."; con
  cualquier otro error (por ejemplo `same`), se queda en esta vista con su mensaje.

### 19. Los botones que cambian de vista

```astro

	for (const button of root.querySelectorAll<HTMLButtonElement>('[data-go]')) {
		button.addEventListener('click', () => show(button.dataset.go as View));
	}
```

- Busca los botones con `data-go` ("¿Olvidaste tu contraseña?" y "Volver") y, al pulsarlos,
  enseña la vista que dice su `data-go`. `as View`: confía en que el texto del HTML es un nombre
  de vista válido ([afirmación de tipo](../../../glosario.md#afirmacion-de-tipo)).

### 20. El botón "Cerrar sesión"

```astro

	const signOutButton = root.querySelector<HTMLButtonElement>('[data-sign-out]')!;
	signOutButton.addEventListener('click', () => {
		void whileBusy(signOutButton, async () => {
			await signOut();
			show('sign-in');
		});
	});
```

- Al pulsarlo: botón ocupado, `signOut()` (cierra la sesión en todos los dispositivos y la borra
  de este, incluso sin conexión) y vuelta a "Entrar" (AC6).

### 21. Al abrir la página

```astro

	async function start() {
		// The recovery link is read first, before anything else looks at the session.
		const link = readRecoveryLink();
		if (link === 'linkError') return show('recover', MESSAGES.linkError);
		if (!hasSession()) return show('sign-in');
```

- `start()`: decide qué vista enseñar al cargar. Hasta que termina, las cuatro siguen escondidas.
- El comentario: "El enlace de recuperación se lee lo primero, antes de que nada mire la sesión."
  Si el dueño llega desde el correo, `readRecoveryLink()` guarda la sesión del enlace; así lo que
  viene después ya la encuentra.
- Enlace gastado o caducado → vista "Recuperar" con "El enlace no es válido o ya caducó. Pide
  otro." (AC7 d).
- Sin sesión guardada → "Entrar" (AC2). No se hace ninguna petición.

```astro
		try {
			// Checks the session with Supabase and the owner role before showing anything.
			const user = await getUser();
			if (!isOwner(user)) {
				await signOut();
				return show('sign-in', NO_ACCESS);
			}
			if (link === 'recovery') show('new-password');
			else showSignedIn(user);
```

- El comentario: "Comprueba la sesión con Supabase y el rol de dueño antes de enseñar nada."
- `getUser()`: pregunta a Supabase con el token guardado. Pasa por las dos capas de
  [`auth.ts`](../../lib/auth.ts.md#17-capa-1-renovar-antes-de-mandar): si el token caducó, lo
  renueva antes.
- Si no es el dueño: fuera, con el mensaje de sin acceso.
- Si llegó desde el correo → "Nueva contraseña". Si no → "Sesión iniciada".

```astro
		} catch (error) {
			const kind = kindOf(error);
			if (kind === 'signedOut') return show('sign-in', MESSAGES.signedOut);
			// Offline, rate-limited or a server error: the session is kept (AC5).
			const user = storedUser();
			if (link === 'recovery') show('new-password', MESSAGES[kind]);
			else if (user) showSignedIn(user, '', MESSAGES[kind]);
			else show('sign-in', MESSAGES[kind]);
		}
	}
```

- Sesión acabada → "Entrar" con "Tu sesión terminó. Entra de nuevo."
- El comentario: "Sin conexión, demasiadas peticiones o un error del servidor: la sesión se
  conserva (AC5)."
- `storedUser()`: el último usuario que Supabase confirmó. Si hay uno, enseña "Sesión iniciada"
  con ese usuario y el error (por ejemplo "Sin conexión…"). El dueño no pierde la sesión por una
  mala conexión.
- Si venía del correo, se queda en "Nueva contraseña" con el error, para que pueda reintentar.
- Si no hay usuario guardado, "Entrar" con el error.

```astro

	void start();
</script>
```

- `void start();`: arranca todo al cargar el script ([operador void](../../../glosario.md#operador-void)).
- `</script>`: cierra el script.

## Cómo se conecta

- **En el build:** `supabaseConfig()` lee `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` (de `.env`
  o de Vercel) y la página los escribe en `data-supabase-url` y `data-supabase-key`. Resultado:
  `dist/admin/index.html` y un archivo `.js` en `dist/_astro/`.
- **En el navegador:** el script pasa esos valores a [`auth.ts`](../../lib/auth.ts.md), que habla
  con Supabase Auth y guarda la sesión en `localStorage`.
- **Supabase:** los ajustes del panel (registro cerrado, contraseña mínima de 8, *Redirect URLs*
  con `/admin/`) y la función `is_owner()` están en [`supabase/auth.sql`](../../../supabase/auth.sql.md).
- **Peso:** `pnpm check:weight` mide `/admin/` con su propio presupuesto (JS ≤ 15 KB);
  ver [`check-weight.mjs.md`](../../../scripts/check-weight.mjs.md).
- **Aislada:** ninguna página de clientes enlaza aquí, y ninguna otra página tiene `<script>` ni
  la dirección o la clave de Supabase (spec 0014, AC11).

## Prueba tú

Comprueba que el formulario no manda nada si está incompleto, sin necesidad de cuenta:

1. Ejecuta `pnpm dev` y abre `http://localhost:4321/admin/`. Sin sesión guardada, ves solo la
   tarjeta "Entrar".
2. Abre las herramientas del navegador (F12) → *Elements* y busca las cuatro
   `<section data-view="…">`: la de `sign-in` ya no tiene `hidden` (se lo quitó el script) y las
   otras tres sí.
3. Pasa a la pestaña *Network* y pulsa "Entrar" con los dos campos vacíos. **Qué deberías ver:**
   el aviso propio del navegador junto al campo Email (el texto depende del navegador), y
   ninguna petición nueva a `supabase.co`: `reportValidity()` frenó el envío.
4. No hay nada que deshacer: no se ha mandado ni guardado nada.

## Términos

- [script-en-astro](../../../glosario.md#script-en-astro) ·
  [atributo-data](../../../glosario.md#atributo-data) ·
  [atributo-hidden](../../../glosario.md#atributo-hidden) ·
  [validacion-de-formularios](../../../glosario.md#validacion-de-formularios) ·
  [autocomplete](../../../glosario.md#autocomplete) · [noscript](../../../glosario.md#noscript) ·
  [role-alert-status](../../../glosario.md#role-alert-status) (todos nuevos)
- [afirmacion-no-nulo](../../../glosario.md#afirmacion-no-nulo) ·
  [alias-de-tipo](../../../glosario.md#alias-de-tipo) ·
  [record-y-unknown](../../../glosario.md#record-y-unknown) ·
  [instanceof](../../../glosario.md#instanceof) · [finally](../../../glosario.md#finally) ·
  [operador-void](../../../glosario.md#operador-void) (nuevos)
- [app-metadata](../../../glosario.md#app-metadata) · [sesion](../../../glosario.md#sesion) ·
  [supabase-auth](../../../glosario.md#supabase-auth) (nuevos) ·
  [clave-publishable](../../../glosario.md#clave-publishable) · [rls](../../../glosario.md#rls) ·
  [politica](../../../glosario.md#politica)
- [frontmatter](../../../glosario.md#frontmatter) · [layout](../../../glosario.md#layout) ·
  [ruta-por-archivo](../../../glosario.md#ruta-por-archivo) · [noindex](../../../glosario.md#noindex) ·
  [comentario-en-plantilla](../../../glosario.md#comentario-en-plantilla) ·
  [variante](../../../glosario.md#variante) · [area-tactil](../../../glosario.md#area-tactil) ·
  [aria-hidden](../../../glosario.md#aria-hidden)
- [desestructuracion](../../../glosario.md#desestructuracion) ·
  [template-literal](../../../glosario.md#template-literal) ·
  [import-type](../../../glosario.md#import-type) · [generico](../../../glosario.md#generico) ·
  [afirmacion-de-tipo](../../../glosario.md#afirmacion-de-tipo) ·
  [typecheck](../../../glosario.md#typecheck)
