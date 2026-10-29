# `src/pages/admin/index.astro`

> **Qué es:** la página de administración del dueño, `/admin/`: entrar, recuperar la contraseña,
> cerrar sesión, gestionar los productos (listar, añadir, editar, borrar y cambiar la
> disponibilidad) y publicar los cambios en la web · **Lo decidió:**
> [spec 0014](../../../../../docs/specs/0014-owner-login.md) (Design →
> `src/pages/admin/index.astro`),
> [spec 0015](../../../../../docs/specs/0015-manage-products.md) (Design →
> `src/pages/admin/index.astro`) y [spec 0016](../../../../../docs/specs/0016-publish-changes.md)
> (Design → `src/pages/admin/index.astro`) y [spec 0017](../../../../../docs/specs/0017-product-photos-upload.md)
> (Design → `src/pages/admin/index.astro`), con la regla de la
> [spec 0012](../../../../../docs/specs/0012-admin-backend.md) de que `/admin/` es la única ruta
> con JavaScript · **Lo usan:** nadie lo importa; es una página propia por
> [ruta por archivo](../../../glosario.md#ruta-por-archivo). Ninguna página de clientes enlaza
> aquí · **Usa:** `BaseLayout`, [`NoPhoto`](../../components/NoPhoto.astro.md), `site` de `src/lib/site.ts`, `supabaseConfig()` de
> [`src/lib/supabase.ts`](../../lib/supabase.ts.md) (en el build), y en el navegador
> [`src/lib/auth.ts`](../../lib/auth.ts.md), [`src/lib/products.ts`](../../lib/products.ts.md),
> [`src/lib/publish.ts`](../../lib/publish.ts.md), [`src/lib/photos.ts`](../../lib/photos.ts.md) y `formatPrice()` de
> [`src/lib/price.ts`](../../lib/price.ts.md)

## Para qué sirve

Es la administración del catálogo: hoy, el login (spec 0014), los productos (spec 0015, feature
12), publicar los cambios en la web (spec 0016, feature 13) y las fotos de los productos (spec
0017, feature 14); la feature 15 añadirá las categorías. Enseña una de cinco **vistas**, según
el momento:

| Vista | Cuándo sale |
|---|---|
| Entrar (`sign-in`) | no hay sesión, o la sesión se acabó |
| Recuperar la contraseña (`recover`) | el dueño pulsa "¿Olvidaste tu contraseña?", o el enlace del correo no vale |
| Nueva contraseña (`new-password`) | el dueño llega desde el enlace del correo |
| Sesión iniciada (`signed-in`) | el dueño ya entró: su cuenta, la tarjeta "Publicar" y la lista de productos |
| Producto (`product`) | el dueño pulsa "Añadir producto" o el nombre de un producto de la lista |

**Es la única página del sitio con JavaScript.** Las páginas de clientes no llevan ni una línea
(spec 0001: tienen que ser ligeras para las conexiones de Cuba). Pero un login necesita hablar
con Supabase **después** del build, cuando el dueño escribe su contraseña, y en un sitio
estático eso solo lo puede hacer el navegador. La spec 0012 permitió esa excepción solo para
`/admin/`, y la spec 0014 le dio su propio presupuesto de peso
([`check-weight.mjs.md`](../../../scripts/check-weight.mjs.md)).

La página tiene dos partes que corren en momentos distintos:

1. El [frontmatter](../../../glosario.md#frontmatter) y el HTML: corren **en el build**, como en
   cualquier otra página. Producen `dist/admin/index.html` con las cinco vistas escondidas y dos moldes
   (`<template>`) para las filas de la lista.
2. El `<script>` del final: corre **en el navegador** del dueño. Decide qué vista enseñar y
   reacciona a los formularios. Toda la lógica de sesión vive en
   [`auth.ts`](../../lib/auth.ts.md), la de productos en
   [`products.ts`](../../lib/products.ts.md), la de las fotos en
   [`photos.ts`](../../lib/photos.ts.md) y la de publicar en
   [`publish.ts`](../../lib/publish.ts.md); el script solo lee formularios, cambia de vista,
   dibuja la lista y pone mensajes en español.

## El código, por partes

### 1. El frontmatter

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import NoPhoto from '../../components/NoPhoto.astro';
import { site } from '../../lib/site';
import { supabaseConfig } from '../../lib/supabase';
```

- `---`: abre el [frontmatter](../../../glosario.md#frontmatter).
- `import BaseLayout …`: el [layout](../../../glosario.md#layout) común
  ([explicación](../../layouts/BaseLayout.astro.md)). Las rutas empiezan por `../../` porque esta
  página está una carpeta más abajo que las demás (`src/pages/admin/`).
- `import NoPhoto …` (spec 0017): la caja "Sin foto" de la tienda
  ([explicación](../../components/NoPhoto.astro.md)). El formulario de producto la enseña
  cuando el producto no tiene foto (bloque 9).
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
    (`max-w-md`), más estrecho que el catálogo porque es una sola columna pensada para el
    móvil; 16 px a los lados y 12 px arriba y abajo.
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
  ([noscript](../../../glosario.md#noscript)). Sin JavaScript, las cinco vistas siguen
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
    (bloque 19) (AC9).
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
  - `data-label`: guarda el texto original, para que `whileBusy()` (bloque 17) lo pueda cambiar a
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
  es `type="button"`). `data-go="recover"` le dice al script a qué vista ir (bloque 23).
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
  el script lo enseña y esconde el formulario cuando Supabase contesta 200 (bloque 21).
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
  Pide otro." cuando el dueño abre un enlace gastado (bloque 40).
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
    script lo vuelve a comprobar (bloque 22).
- No hay botón "Volver" (spec 0014): salir significa cerrar la página.

### 7. La vista "Sesión iniciada": la tarjeta de la cuenta

```astro

		<div data-view="signed-in" hidden class="flex flex-col gap-6">
			<section class="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
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
				<p class="text-sm text-muted">Los cambios se guardan al momento. La web pública los mostrará después de publicar.</p>
			</section>
```

- Desde la spec 0015, esta vista ya no es una sola tarjeta sino un `<div>` con varias; desde la
  spec 0016, **tres**: la de la cuenta (este bloque), la de publicar (bloque 7b) y la de los
  productos (bloque 8). `data-view="signed-in"` y `hidden` van en el `<div>`, así que el script
  las enseña o esconde juntas. `flex flex-col gap-6`: las tarjetas en columna, a 24 px.
- `<section class="… rounded-card border border-border bg-surface p-4">`: la tarjeta de la
  cuenta, con las mismas clases que las otras vistas.
- `<strong data-email></strong>`: vacío en el HTML; el script escribe ahí el email del dueño.
- `<p data-status role="status" …>`: avisos tranquilos, en gris: "Contraseña cambiada."
- `<p data-alert role="alert" …>`: errores de la sesión; por ejemplo, "Sin conexión…" cuando se
  abre sin red.
- El botón "Cerrar sesión": `type="button"` (no hay formulario), `data-sign-out` para que el
  script lo encuentre, y las clases del botón secundario (blanco con borde beige que se vuelve
  rojo al pasar el ratón).
- La última línea, en gris: "Los cambios se guardan al momento. La web pública los mostrará
  después de publicar." Avisa de algo que el dueño no podría adivinar: lo que guarda llega a
  Supabase en el acto, pero las páginas de clientes se generan en el build, así que no cambian
  hasta publicar con la tarjeta de debajo (bloque 7b).

### 7b. La vista "Sesión iniciada": la tarjeta "Publicar"

Nueva con la spec 0016 (feature 13). Antes de leer este bloque y los del script que la manejan
(39b a 39k), lee la historia completa de una publicación en
[`publish.ts.md`](../../lib/publish.ts.md#el-viaje-completo-de-una-publicación): qué pasa entre el
toque al botón y la web nueva.

```astro

			<!-- Publish (spec 0016): one tap starts one build of the public site. -->
			<section class="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
				<h2>Publicar</h2>
				<p data-publish-status role="status" class="text-ink empty:hidden"></p>
				<p data-publish-alert role="alert" class="font-medium text-accent empty:hidden"></p>
				<button
					type="button"
					data-publish
					data-label="Publicar cambios"
					class="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover disabled:opacity-50"
				>
					Publicar cambios
				</button>
			</section>
```

- `<!-- … -->`: "Publicar (spec 0016): un toque empieza un build de la web pública." Uno solo,
  aunque el dueño haya cambiado diez productos: por eso publicar es un botón y no algo que pase
  solo después de cada cambio.
- `<section class="…">`: una tarjeta más, con las mismas clases que la de la cuenta. Va **entre**
  la cuenta y los productos (AC4).
- `<h2>Publicar</h2>`: el título de la tarjeta.
- `<p data-publish-status role="status" class="text-ink empty:hidden">`: **la línea de estado**,
  el mensaje principal de la tarjeta. Empieza vacía; el script escribe en ella uno de estos
  textos: "Comprobando…", "Hay cambios sin publicar.", "Publicando… La web se actualiza en unos
  minutos.", "Publicado. La web ya muestra los cambios." o "La web está al día.".
  - `role="status"`: el lector de pantalla la lee cuando cambia, sin interrumpir
    ([role-alert-status](../../../glosario.md#role-alert-status)).
  - `text-ink`: en el color normal del texto, no en gris pequeño como los avisos de las otras
    tarjetas (`text-sm text-muted`), porque aquí es lo más importante de la tarjeta (spec 0016).
  - `empty:hidden`: escondida mientras está vacía.
- `<p data-publish-alert role="alert" …>`: los errores, en rojo, como en las otras tarjetas:
  "Acabas de publicar. Espera un minuto…", "Sin conexión…" o el aviso de que una publicación no
  terminó.
- El botón "Publicar cambios": las clases del botón principal (rojo, como "Añadir producto") y
  `min-h-11`, 44 px de alto ([área táctil](../../../glosario.md#area-tactil)). `data-publish` para
  que el script lo encuentre, y `data-label` con su texto, para que `whileBusy()` (bloque 17) lo
  cambie a "Publicar cambios…" mientras espera.

### 8. La vista "Sesión iniciada": la tarjeta de productos

```astro

			<!-- Products (spec 0015): rows are cloned from the templates below and filled with textContent. -->
			<section class="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 data-list-title tabindex="-1">Productos</h2>
					<button
						type="button"
						data-add
						class="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover disabled:opacity-50"
					>
						Añadir producto
					</button>
				</div>
				<p data-list-status role="status" class="text-sm text-muted empty:hidden"></p>
				<p data-list-alert role="alert" class="font-medium text-accent empty:hidden"></p>
				<button
					type="button"
					data-retry
					hidden
					class="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-border bg-surface px-6 font-medium text-ink hover:border-accent disabled:opacity-50"
				>
					Reintentar
				</button>
				<p data-empty hidden class="text-muted">Todavía no hay productos.</p>
				<div data-list class="flex flex-col gap-6"></div>
			</section>
		</div>
```

- `<!-- … -->`: "Productos (spec 0015): las filas se clonan de las plantillas de abajo y se
  rellenan con `textContent`." (Detalle en los bloques 11 y 28.)
- `<div class="flex flex-wrap items-center justify-between gap-2">`: el título a la izquierda y
  el botón a la derecha; si no caben en una línea, el botón baja
  ([flex-wrap](../../../glosario.md#flex-wrap)).
- `<h2 data-list-title tabindex="-1">Productos</h2>`: el título de la lista.
  `tabindex="-1"` deja que el script le dé el foco al volver del formulario, para que el lector
  de pantalla sepa dónde está ([tabindex-menos-uno](../../../glosario.md#tabindex-menos-uno)).
- `<button … data-add>Añadir producto</button>`: el botón principal, que abre el formulario
  vacío (bloque 38).
- `<p data-list-status role="status" …>` y `<p data-list-alert role="alert" …>`: los mensajes de
  la lista, separados de los de la cuenta: "Cargando productos…" o "Producto guardado." en gris,
  y los errores en rojo ([role-alert-status](../../../glosario.md#role-alert-status)). Los dos
  empiezan vacíos y `empty:hidden` los esconde.
- `<button … data-retry hidden>Reintentar</button>`: escondido; solo sale si la carga de la
  lista falla (bloque 30). Clases del botón secundario.
- `<p data-empty hidden …>Todavía no hay productos.</p>`: solo puede salir si alguien vació la
  tabla desde el panel de Supabase (desde aquí no se puede borrar el último producto).
- `<div data-list class="flex flex-col gap-6"></div>`: vacío en el HTML. El script lo llena con
  un grupo por categoría, a 24 px uno de otro.
- `</div>`: cierra la vista "Sesión iniciada".

### 9. La vista "Producto": el formulario

```astro

		<section data-view="product" hidden class="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
			<h2 data-product-title tabindex="-1">Añadir producto</h2>
			<p data-product-link class="text-sm text-muted empty:hidden"></p>
			<form data-form="product" method="post" novalidate class="flex flex-col gap-4">
```

- Una vista nueva, la quinta (spec 0015): la misma tarjeta escondida, con
  `data-view="product"`. Sirve para añadir y para editar.
- `<h2 data-product-title tabindex="-1">`: el script escribe "Añadir producto" o "Editar
  producto" y le da el foco al abrir el formulario.
- `<p data-product-link …>`: al editar, "Enlace: /producto/<id>", en gris. Al añadir queda vacío
  y `empty:hidden` lo esconde (el id todavía no existe: sale del nombre al guardar).
- `<form data-form="product" method="post" novalidate …>`: como los otros formularios: nunca se
  envía solo y el script decide cuándo enseñar los avisos (bloque 35).

```astro
				<!-- Photo (spec 0017): shrunk on the phone when chosen, uploaded by "Guardar". -->
				<div class="flex flex-col gap-2">
					<p class="font-medium">Foto</p>
					<img
						data-photo-preview
						alt=""
						hidden
						class="aspect-square w-full max-w-60 rounded-card border border-border object-cover"
					/>
					<div data-photo-none class="w-full max-w-60">
						<NoPhoto framed />
					</div>
```

- El comentario ([comentario en plantilla](../../../glosario.md#comentario-en-plantilla)): "Foto
  (spec 0017): se reduce en el móvil al elegirla y se sube con 'Guardar'." La foto es un campo más
  del formulario, el primero, encima de "Nombre".
- `<p class="font-medium">Foto</p>`: el título del bloque, con el mismo aspecto que las etiquetas
  de los otros campos. Es un `<p>` y no un `<label>` porque no nombra un solo campo: debajo hay
  una imagen y dos botones.
- La vista previa, dos piezas de las que solo se ve una a la vez (el script cambia su
  [`hidden`](../../../glosario.md#atributo-hidden), bloque 26c):
  - `<img data-photo-preview alt="" hidden …>`: la foto, cuando hay una. Empieza escondida y
    **sin `src`**: el script se lo pone al abrir un producto con foto o al elegir una. Así la
    página no descarga ninguna foto al cargarse. `alt=""` la marca como
    [imagen decorativa](../../../glosario.md#imagen-decorativa): el producto ya lo nombra el campo
    "Nombre".
  - Sus clases: `aspect-square` (cuadrada), `w-full max-w-60` (todo el ancho, pero como mucho
    15 rem; ver [unidades de Tailwind](../../../glosario.md#unidades-tailwind)),
    `rounded-card border border-border` (el marco de las fotos de la tienda) y `object-cover`
    (recorta la foto para llenar el cuadrado sin deformarla). Es el mismo recorte cuadrado que
    verán los clientes.
  - `<div data-photo-none …><NoPhoto framed /></div>`: la caja "Sin foto" de la tienda, con su
    marco ([`NoPhoto.astro.md`](../../components/NoPhoto.astro.md)), del mismo ancho. Es la que se
    ve al empezar.

```astro
					<div class="flex flex-wrap items-center gap-3">
						<input id="product-photo" data-photo-input type="file" accept="image/*" class="peer sr-only" />
						<label
							for="product-photo"
							data-photo-pick
							class="inline-flex min-h-11 w-fit cursor-pointer items-center justify-center rounded-full border border-border bg-surface px-6 font-medium text-ink hover:border-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:opacity-50"
						>
							Añadir foto
						</label>
```

- Una fila de botones que pasa a la línea siguiente si no cabe
  ([flex-wrap](../../../glosario.md#flex-wrap)).
- `<input … type="file" accept="image/*" …>`: el campo para elegir una foto
  ([input-file](../../../glosario.md#input-file)). En el móvil ofrece la cámara y la galería (sin
  `capture`, que obligaría a usar la cámara). No lleva `name`: el script lo lee aparte, nunca
  viaja con el formulario.
  - `class="peer sr-only"`: está escondido a la vista ([sr-only](../../../glosario.md#sr-only)),
    pero sigue recibiendo el foco del teclado. `peer` lo marca para que la etiqueta de al lado
    pueda reaccionar a él ([variante peer](../../../glosario.md#variante-peer)).
- `<label for="product-photo" …>`: lo que el dueño ve y toca. Por el `for`, tocarla abre el
  selector de archivos igual que el campo. El script cambia su texto entre "Añadir foto" y
  "Cambiar foto".
  - Sus clases son las del botón secundario de `design.md` (blanco, borde beige, redondo, de al
    menos 44 px de alto con `inline-flex min-h-11 items-center`;
    [área táctil](../../../glosario.md#area-tactil)), más `cursor-pointer` (la mano del ratón al
    pasar por encima, como en un botón).
  - `peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent`:
    cuando el campo escondido tiene el foco del teclado, la etiqueta dibuja el
    [contorno](../../../glosario.md#outline) naranja. Sin esto, quien usa el teclado no vería
    dónde está.
  - `peer-disabled:opacity-50`: mientras el campo está desactivado (durante un guardado,
    bloque 34), la etiqueta se ve pálida.

```astro
						<button
							type="button"
							data-photo-remove
							hidden
							class="inline-flex min-h-11 w-fit items-center text-accent underline underline-offset-4 disabled:opacity-50"
						>
							Quitar foto
						</button>
					</div>
					<p data-photo-status role="status" class="text-sm text-muted empty:hidden"></p>
				</div>
```

- `<button type="button" data-photo-remove hidden …>Quitar foto</button>`: un botón con aspecto
  de enlace (naranja y subrayado), de 44 px de alto. `type="button"`: no envía el formulario.
  Empieza escondido; el script lo enseña solo mientras se ve una foto. `disabled:opacity-50`:
  pálido mientras se guarda.
- `<p data-photo-status role="status" …>`: la línea de estado de la foto, en gris y pequeña:
  "Preparando foto…", "La foto nueva se subirá al guardar." o "La foto se quitará al guardar.".
  `role="status"` hace que el lector de pantalla la lea cuando cambia, sin interrumpir
  ([role alert y status](../../../glosario.md#role-alert-status)); vacía, `empty:hidden` la
  esconde.

```astro
				<div class="flex flex-col gap-1">
					<label for="product-name" class="font-medium">Nombre</label>
					<input
						id="product-name"
						name="name"
						type="text"
						maxlength="60"
						autocomplete="off"
						required
						class="min-h-11 w-full rounded-card border border-muted bg-surface px-4 text-ink"
					/>
				</div>
```

- El campo "Nombre", con la etiqueta siempre visible y las clases de los campos de "Entrar".
  - `type="text"` y `name="name"`.
  - `maxlength="60"`: el navegador no deja escribir más de 60 caracteres, el límite de la tabla.
  - `autocomplete="off"`: que el móvil no proponga textos guardados; un nombre de producto es
    nuevo cada vez ([autocomplete](../../../glosario.md#autocomplete)).
  - `required`: no puede ir vacío.

```astro
				<div class="flex flex-col gap-1">
					<label for="product-category" class="font-medium">Categoría</label>
					<select
						id="product-category"
						name="category_id"
						required
						class="min-h-11 w-full rounded-card border border-muted bg-surface px-4 text-ink"
					>
						<option value="">Elige una categoría</option>
					</select>
				</div>
```

- El desplegable "Categoría". `<select>` lleva las mismas clases que los campos.
- `<option value="">Elige una categoría</option>`: la única opción del HTML, con valor vacío.
  El script añade las categorías cuando las carga (bloque 29). Si el dueño no elige ninguna, el
  valor es `''` y `checkFields()` lo rechaza.

```astro
				<div class="flex flex-col gap-1">
					<label for="product-price" class="font-medium">Precio en CUP</label>
					<input
						id="product-price"
						name="price"
						type="text"
						inputmode="numeric"
						autocomplete="off"
						required
						aria-describedby="product-price-hint"
						class="min-h-11 w-full rounded-card border border-muted bg-surface px-4 text-ink"
					/>
					<p id="product-price-hint" class="text-sm text-muted">Solo el número, sin decimales. Ej.: 12500</p>
				</div>
```

- El campo "Precio en CUP".
  - `type="text"` con `inputmode="numeric"`: en el móvil sale el teclado de números, pero el
    campo acepta cualquier texto, y el script recibe exactamente lo que se escribió (por
    ejemplo `12.500`, con punto). Lo revisa y lo convierte `checkFields()`
    ([`products.ts.md`](../../lib/products.ts.md#6-comprobar-el-formulario-checkfields)).
  - `aria-describedby="product-price-hint"`: une el campo con la pista de debajo
    ([aria-describedby](../../../glosario.md#aria-describedby)).
- `<p id="product-price-hint" …>Solo el número, sin decimales. Ej.: 12500</p>`: la pista, en
  gris y a 14 px. Su `id` es el que nombra `aria-describedby`.

```astro
				<div class="flex flex-col gap-1">
					<label for="product-unit" class="font-medium">Unidad</label>
					<input
						id="product-unit"
						name="unit"
						type="text"
						maxlength="30"
						autocomplete="off"
						required
						aria-describedby="product-unit-hint"
						class="min-h-11 w-full rounded-card border border-muted bg-surface px-4 text-ink"
					/>
					<p id="product-unit-hint" class="text-sm text-muted">Ej.: paquete de 1 kg</p>
				</div>
```

- El campo "Unidad", igual: `maxlength="30"` y una pista, "Ej.: paquete de 1 kg", unida con
  `aria-describedby`.

```astro
				<div class="flex flex-col gap-1">
					<label for="product-description" class="font-medium">Descripción</label>
					<textarea
						id="product-description"
						name="description"
						maxlength="300"
						rows="4"
						required
						class="min-h-11 w-full rounded-card border border-muted bg-surface px-4 py-2 text-ink"></textarea>
				</div>
```

- La "Descripción" es un `<textarea>`: un campo de varias líneas. `rows="4"` le da 4 líneas de
  alto; `maxlength="300"`, el límite de la tabla. Mismas clases que los campos, más `py-2` (8 px
  arriba y abajo), porque el texto empieza arriba y no centrado.
- Fíjate en `…text-ink"></textarea>`: el cierre va pegado. Lo que haya entre `<textarea>` y
  `</textarea>` es su valor inicial, así que un salto de línea ahí dentro aparecería escrito en
  el campo.

```astro
				<label class="inline-flex min-h-11 w-fit items-center gap-2 font-medium">
					<input name="in_stock" type="checkbox" checked class="size-5 accent-accent" />
					Disponible
				</label>
```

- La casilla "Disponible". El `<input>` va **dentro** del `<label>`, así que tocar la palabra
  también marca la casilla, sin `for` ni `id`.
- `inline-flex min-h-11 w-fit items-center gap-2 font-medium`: 44 px de alto
  ([área táctil](../../../glosario.md#area-tactil)), solo el ancho de su contenido, casilla y
  texto centrados y a 8 px.
- `checked`: marcada por defecto, así un producto nuevo empieza disponible (AC3).
- `size-5 accent-accent`: la casilla mide 20 px; `accent-accent` pinta su marca con el rojo
  `accent` (la propiedad CSS `accent-color` con el [token](../../../glosario.md#token)).

```astro
				<p data-alert role="alert" class="font-medium text-accent empty:hidden"></p>
				<button
					type="submit"
					data-label="Guardar"
					class="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover disabled:opacity-50"
				>
					Guardar
				</button>
			</form>
```

- `<p data-alert role="alert" …>`: los errores al guardar, por ejemplo "Sin conexión…".
- El botón principal "Guardar", con `data-label` para `whileBusy()` (bloque 17).

### 10. Cancelar y borrar

```astro
			<button type="button" data-cancel class="inline-flex min-h-11 w-fit items-center text-accent underline underline-offset-4">
				Cancelar
			</button>
			<div data-delete-area class="flex flex-col gap-4 border-t border-border pt-4">
				<button type="button" data-delete class="inline-flex min-h-11 w-fit items-center text-accent underline underline-offset-4">
					Borrar producto
				</button>
				<p data-last-product class="text-sm text-muted">No puedes borrar el último producto: la tienda quedaría vacía.</p>
```

- "Cancelar": con aspecto de enlace; vuelve a la lista sin guardar (bloque 38).
- `<div data-delete-area class="flex flex-col gap-4 border-t border-border pt-4">`: la zona de
  borrar, separada del resto por una línea beige arriba (`border-t`) y 16 px de aire. Al añadir
  un producto se esconde entera (no hay nada que borrar).
- "Borrar producto": también con aspecto de enlace y en rojo. No borra: abre la confirmación.
- `<p data-last-product …>`: "No puedes borrar el último producto: la tienda quedaría vacía."
  El script enseña o el botón o esta frase, nunca los dos (bloque 32). El build se niega a
  publicar una tabla vacía (spec 0013), así que borrar el último producto nunca llegaría a la web.

```astro
				<div data-confirm hidden class="flex flex-col gap-3">
					<p data-confirm-text class="font-medium"></p>
					<div class="flex flex-wrap gap-3">
						<button
							type="button"
							data-confirm-yes
							data-label="Sí, borrar"
							class="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-hover active:bg-accent-hover disabled:opacity-50"
						>
							Sí, borrar
						</button>
						<button
							type="button"
							data-confirm-no
							class="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-border bg-surface px-6 font-medium text-ink hover:border-accent disabled:opacity-50"
						>
							No, volver
						</button>
					</div>
				</div>
			</div>
		</section>
```

- `<div data-confirm hidden …>`: la confirmación, escondida hasta pulsar "Borrar producto". Va
  dentro de la página y no con `confirm()` del navegador, porque algunos navegadores dentro de
  apps lo bloquean (spec 0015).
- `<p data-confirm-text …>`: el script escribe "¿Borrar «<nombre>»? No se puede deshacer."
- "Sí, borrar": botón principal, con `data-label`, que borra de verdad. "No, volver": botón
  secundario, que cierra la confirmación sin hacer nada.
- `flex flex-wrap gap-3`: los dos botones en fila, a 12 px, y uno debajo del otro si no caben.
- `</section>`: cierra la vista "Producto".

### 11. Los moldes (`<template>`)

```astro

		<template data-template="group">
			<div class="flex flex-col gap-2">
				<h3 data-group-name></h3>
				<ul class="flex flex-col divide-y divide-border"></ul>
			</div>
		</template>
		<template data-template="row">
			<li class="flex items-center justify-between gap-3 py-2">
				<div class="flex min-w-0 flex-col">
					<button
						type="button"
						data-edit
						class="inline-flex min-h-11 w-fit items-center text-left text-accent underline underline-offset-4"
					></button>
					<p data-detail class="text-sm text-muted"></p>
				</div>
				<label class="inline-flex min-h-11 shrink-0 items-center gap-2">
					<input data-stock type="checkbox" class="size-5 accent-accent" />
					<span data-stock-name class="sr-only"></span>Disponible
				</label>
			</li>
		</template>
	</main>
</BaseLayout>
```

- Dos [`<template>`](../../../glosario.md#template-html): moldes que el navegador no pinta. El
  script los copia una vez por categoría y una vez por producto, y rellena las copias. Así el
  HTML de una fila, con sus clases enteras, se escribe aquí una sola vez (spec 0015).
- `data-template="group"`: un grupo de la lista.
  - `<h3 data-group-name>`: el nombre de la categoría (los grupos están bajo el `h2` "Productos";
    [jerarquía de títulos](../../../glosario.md#jerarquia-de-titulos)).
  - `<ul class="flex flex-col divide-y divide-border">`: la lista de filas. `divide-y` pone una
    línea de 1 px **entre** cada fila (no encima de la primera ni debajo de la última), y
    `divide-border` le da el color beige.
- `data-template="row"`: una fila.
  - `<li class="flex items-center justify-between gap-3 py-2">`: a la izquierda el nombre y los
    datos, a la derecha la casilla; 12 px entre ellos y 8 px arriba y abajo.
  - `<div class="flex min-w-0 flex-col">`: `min-w-0` deja que esta columna se estreche y un
    nombre largo salte de línea, en vez de empujar la casilla fuera de la pantalla.
  - `<button type="button" data-edit …>`: el nombre del producto, con aspecto de enlace y 44 px
    de alto. Al tocarlo se abre el formulario de edición. `text-left`: si el nombre ocupa dos
    líneas, se alinean a la izquierda.
  - `<p data-detail …>`: "1 lb · 280 CUP" en gris.
  - `<label class="inline-flex min-h-11 shrink-0 items-center gap-2">`: la casilla "Disponible"
    de la fila. `shrink-0`: nunca se estrecha.
  - `<span data-stock-name class="sr-only"></span>Disponible`: en pantalla solo se ve
    "Disponible", pero el script escribe el nombre del producto en el `<span>`
    [`sr-only`](../../../glosario.md#sr-only), así el lector de pantalla dice "Arroz blanco:
    Disponible" y no veinte veces "Disponible" a secas.
- `</main>` y `</BaseLayout>`: cierran el contenedor y el layout. Aquí acaba todo lo que se
  ejecuta en el build.

### 12. El script: qué es y qué importa

```astro

<script>
	// The admin's views (specs 0014–0017). Every Auth rule lives in src/lib/auth.ts, every product
	// rule in src/lib/products.ts, every photo rule in src/lib/photos.ts and every publish rule in
	// src/lib/publish.ts; this script only reads the forms, shows one view at a time, draws the list
	// and turns errors into Spanish messages.
```

- `<script>`: sin ningún atributo, así que Astro lo **procesa**: entiende TypeScript y los
  `import`, lo junta con `auth.ts`, `products.ts`, `photos.ts`, `publish.ts` y `price.ts` en un solo archivo
  de `dist/_astro/` y escribe en la página un `<script type="module" src="/_astro/….js">`
  ([script en Astro](../../../glosario.md#script-en-astro)). En el build del 2026-10-27, con la
  feature 12 ya hecha y antes de la 13, ese archivo pesaba 5,2 KB comprimido con gzip, medido
  como lo mide `pnpm check:weight`: lejos del límite de 15 KB de esta página. La feature 13 le
  añade el código de publicar y la 14 el de las fotos; las specs 0016 (AC10) y 0017 (AC9) exigen
  que siga por debajo de ese límite.
- El comentario: "Las vistas de la administración (specs 0014–0017). Todas las reglas de Auth
  viven en `src/lib/auth.ts`, todas las de productos en `src/lib/products.ts`, todas las de las
  fotos en `src/lib/photos.ts` y todas las de publicar en `src/lib/publish.ts`; este script solo lee los formularios, enseña una vista cada
  vez, dibuja la lista y convierte los errores en mensajes en español."

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
  [import-type](../../../glosario.md#import-type)) y todas las acciones de la sesión. Cada una
  está explicada allí.

```astro
	import { preparePhoto, publicPhotoUrl } from '../../lib/photos';
	import { formatPrice } from '../../lib/price';
	import {
		ProductError,
		type FieldName,
		type PhotoChange,
		type ProductErrorKind,
		type ProductFields,
		checkFields,
		groupProducts,
		listCategories,
		listProducts,
		removeProduct,
		saveProduct,
		setStock,
	} from '../../lib/products';
	import {
		PublishError,
		type Build,
		type PublishErrorKind,
		type PublishState,
		catalogChangedAt,
		lastPublish,
		publishState,
		readBuild,
		requestPublish,
	} from '../../lib/publish';
	import type { CategoryRow, ProductRow } from '../../lib/supabase';
```

- De [`photos.ts`](../../lib/photos.ts.md) (spec 0017): `preparePhoto`, que reduce en el móvil la
  foto elegida, y `publicPhotoUrl`, la dirección pública de la foto que un producto ya tiene. La
  subida y el borrado de fotos no se importan aquí: los hace `saveProduct()` por dentro.
- `formatPrice`: el mismo formato de precio que la tienda, `280 CUP`
  ([`price.ts.md`](../../lib/price.ts.md)).
- De [`products.ts`](../../lib/products.ts.md): la clase `ProductError`, cuatro tipos (entre
  ellos `PhotoChange`, qué hacer con la foto al guardar) y las funciones de productos: leer,
  revisar el formulario, agrupar la lista, cambiar la casilla "Disponible", guardar con su foto
  (`saveProduct`) y borrar con su foto (`removeProduct`). Desde la spec 0017, añadir y editar
  pasan las dos por `saveProduct`. Cada una está explicada allí.
- De [`publish.ts`](../../lib/publish.ts.md) (spec 0016): la clase `PublishError`, tres tipos
  (`Build`, la forma de `/build.json`; `PublishErrorKind`, los tipos de error; `PublishState`, el
  estado calculado) y cinco funciones: leer la hora del último cambio (`catalogChangedAt`), la
  última publicación (`lastPublish`) y `/build.json` (`readBuild`), calcular el estado
  (`publishState`) y pedir una publicación (`requestPublish`). Cada una está explicada allí.
- `import type { CategoryRow, ProductRow } from '../../lib/supabase';`: solo los tipos de las
  filas. Con `import type` no llega al navegador nada de `supabase.ts`, que es código del build.

### 13. Los textos

```astro

	type View = 'sign-in' | 'recover' | 'new-password' | 'signed-in' | 'product';
```

- `type View`: los cinco nombres de vista ([alias de tipo](../../../glosario.md#alias-de-tipo)),
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
```

- Tres mensajes que no vienen de un `AuthError`: cuenta sin permiso (AC4), contraseñas distintas
  (AC8) y contraseña cambiada (AC7 c) de la spec 0014.

```astro
	const PRODUCT_MESSAGES: Record<ProductErrorKind, string> = {
		exists: 'Ya existe un producto con ese enlace. La lista se ha actualizado.',
		noCategory: 'Esa categoría ya no existe. La lista se ha actualizado.',
		invalid: 'Algún dato no es válido. Revisa el formulario.',
		forbidden: 'Esta cuenta no puede cambiar el catálogo.',
		gone: 'Este producto ya no existe. La lista se ha actualizado.',
		system: 'Error del sistema, no es culpa tuya. Avisa a quien mantiene la web.',
		unknown: 'Algo salió mal. Inténtalo otra vez.',
	};
```

- `PRODUCT_MESSAGES`: lo mismo para cada tipo de `ProductError`, con los textos de la tabla de
  errores de la spec 0015. También es un `Record`, así que no puede faltar ninguno.
- `system` (añadido el 2026-10-28) dice claramente que el fallo no es del dueño y a quién avisar,
  porque reintentar o revisar el formulario no lo arreglaría.

```astro
	// These errors mean the loaded list is out of date, so it loads again.
	const RELOAD_KINDS = new Set<ProductErrorKind>(['exists', 'noCategory', 'gone']);
	const LOADING = 'Cargando productos…';
	const SAVED = 'Producto guardado.';
	const DELETED = 'Producto borrado.';
	// The photo block and the save button's steps (spec 0017).
	const PREPARING = 'Preparando foto…';
	const PHOTO_NEW = 'La foto nueva se subirá al guardar.';
	const PHOTO_REMOVE = 'La foto se quitará al guardar.';
	const UNREADABLE = 'No se pudo abrir esta foto. Prueba con otra.';
	const UPLOADING = 'Subiendo foto…';
	const SAVING = 'Guardando…';
	// The project's minimum password length, set in the Supabase dashboard (spec 0014).
	const MIN_PASSWORD = 8;
```

- El comentario: "Estos errores significan que la lista cargada está anticuada, así que se carga
  otra vez." `RELOAD_KINDS` es un [Set](../../../glosario.md#set) con los tres: alguien ya usó
  ese id (`exists`), borró la categoría (`noCategory`) o borró el producto (`gone`) desde otro
  sitio. `new Set<ProductErrorKind>(…)` dice a TypeScript qué puede guardar
  ([genérico](../../../glosario.md#generico)).
- `LOADING`, `SAVED` y `DELETED`: los avisos de la lista: "Cargando productos…", "Producto
  guardado." y "Producto borrado."
- El comentario: "El bloque de la foto y los pasos del botón de guardar (spec 0017)." Los textos de
  la spec 0017:
  - `PREPARING`: mientras se reduce la foto elegida.
  - `PHOTO_NEW` y `PHOTO_REMOVE`: la línea de estado de la foto cuando hay un cambio pendiente,
    que se hará al pulsar "Guardar".
  - `UNREADABLE`: el mensaje de un `PhotoError` (la foto no se pudo abrir), en la zona de errores
    del formulario.
  - `UPLOADING` y `SAVING`: el texto del botón "Guardar" en cada paso de `saveProduct()`
    (bloque 34).
- El comentario: "La longitud mínima de contraseña del proyecto, configurada en el panel de
  Supabase (spec 0014)." Tiene que coincidir con ese ajuste y con el `minlength="8"` del HTML.

```astro
	const PUBLISH_MESSAGES: Record<PublishErrorKind, string> = {
		tooSoon: 'Acabas de publicar. Espera un minuto y vuelve a intentarlo.',
		forbidden: 'Esta cuenta no puede publicar.',
		unknown: 'No se pudo publicar. Tus cambios siguen guardados. Inténtalo otra vez.',
	};
```

- `PUBLISH_MESSAGES` (spec 0016): un mensaje en español para cada tipo de `PublishError`. Como los
  otros, un `Record`, así que no puede faltar ninguno. "Tus cambios siguen guardados" tranquiliza
  al dueño: lo que falló es publicar, no guardar.

```astro
	const CHECKING = 'Comprobando…';
	const PUBLISHING = 'Publicando… La web se actualiza en unos minutos.';
	const PENDING = 'Hay cambios sin publicar.';
	const UP_TO_DATE = 'La web está al día.';
	const PUBLISHED = 'Publicado. La web ya muestra los cambios.';
	const PUBLISH_FAILED =
		'La publicación no terminó. Tus cambios siguen guardados. Vuelve a publicar y, si vuelve a pasar, avisa a quien te hizo la web.';
```

- Los textos de la tarjeta "Publicar" (bloque 7b), los de la spec 0016:
  - `CHECKING`: mientras se cargan los datos al abrir la vista.
  - `PUBLISHING`: hay una publicación en marcha.
  - `PENDING`: hay cambios guardados que la web todavía no enseña.
  - `UP_TO_DATE`: la web enseña lo último.
  - `PUBLISHED`: sale una sola vez, cuando termina una publicación que se estaba vigilando.
  - `PUBLISH_FAILED`: en la zona de errores, si en 10 minutos no llega el build nuevo (AC9).

```astro
	// How often a watched publish reads /build.json, and when it gives up (spec 0016).
	const POLL_MS = 15_000;
	const WATCH_LIMIT_MS = 10 * 60_000;
	// How long "Publicado…" stays before the state line.
	const PUBLISHED_MS = 5_000;
```

- El comentario: "Cada cuánto lee `/build.json` una publicación vigilada, y cuándo se rinde
  (spec 0016)."
  - `POLL_MS = 15_000`: cada 15 segundos ([polling](../../../glosario.md#polling)). Bastante para
    enterarse pronto, sin gastar los datos del móvil: `/build.json` pesa unos 100 bytes.
  - `WATCH_LIMIT_MS = 10 * 60_000`: 10 minutos. Un build normal tarda unos pocos; si en 10 no ha
    llegado, casi seguro falló.
- El comentario: "Cuánto se queda 'Publicado…' antes de la línea de estado."
  `PUBLISHED_MS = 5_000`: 5 segundos.
- Todos en milisegundos; el `_` solo separa cifras.

### 14. Encontrar las piezas de la página

```astro

	const root = document.getElementById('admin')!;
	initAuth({ url: root.dataset.supabaseUrl!, key: root.dataset.supabaseKey! });
```

- `document.getElementById('admin')!`: el `<main>`. El `!` dice "seguro que existe"
  ([afirmación de no nulo](../../../glosario.md#afirmacion-no-nulo)): está en el HTML de esta misma
  página.
- `root.dataset.supabaseUrl`: el atributo `data-supabase-url` del bloque 3
  ([atributo data](../../../glosario.md#atributo-data)). Lo mismo con la clave.
- `initAuth({ url, key })`: se los entrega a `auth.ts`, que ya puede hacer peticiones. Las de
  `products.ts` también los usan, porque pasan por `authFetch()`.

```astro

	const section = (view: View) => root.querySelector<HTMLElement>(`[data-view="${view}"]`)!;
	const form = (view: View) => section(view).querySelector<HTMLFormElement>('[data-form]')!;
	const requested = root.querySelector<HTMLElement>('[data-requested]')!;
```

- `section('recover')`: devuelve el elemento con `data-view="recover"`. `querySelector<HTMLElement>`
  le dice a TypeScript qué tipo de elemento se espera (un [genérico](../../../glosario.md#generico)).
- `form('recover')`: el `<form>` de esa vista.
- `requested`: el mensaje "pedido" de la vista de recuperar.

### 15. El tipo de un error

```astro

	function kindOf(error: unknown): AuthErrorKind {
		return error instanceof AuthError ? error.kind : 'unknown';
	}
```

- Un `catch` puede recibir cualquier cosa (`unknown`). Si es un `AuthError`
  ([instanceof](../../../glosario.md#instanceof)), devuelve su `kind`; si no, `'unknown'`, que
  también tiene mensaje. (Para los `ProductError` está `messageOf()`, bloque 27.)

### 16. Enseñar una vista

```astro

	// Shows one view, with an optional error message in its alert area.
	function show(view: View, alert = '') {
		// Leaving the signed-in views (sign-out, a refused session) stops the publish watch.
		if (view !== 'signed-in' && view !== 'product') stopPublish();
		// Leaving the form drops a photo that was not saved.
		if (view !== 'product') resetPhoto();
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
- El comentario nuevo (spec 0016): "Salir de las vistas con sesión (cerrar sesión, una sesión
  rechazada) para la vigilancia de la publicación." Si la vista pedida no es "Sesión iniciada" ni
  "Producto", llama a `stopPublish()` (bloque 39d): si el dueño estaba esperando un build, la
  página deja de preguntar por `/build.json`. Ir al formulario de un producto **no** la para: el
  dueño puede editar mientras Vercel construye.
- El comentario de la spec 0017: "Salir del formulario descarta una foto que no se guardó." Con
  cualquier vista que no sea "Producto" (volver a la lista con "Cancelar", después de guardar,
  una sesión acabada…), `resetPhoto()` (bloque 26c) olvida la foto elegida y libera su memoria.
  Así "Cancelar" no cambia nada, y la próxima vez que se abra el formulario empieza limpio.
- El `for`: recorre las cinco vistas. `element.hidden = element.dataset.view !== view;` esconde
  todas menos la pedida. Y vacía el mensaje de error (`[data-alert]`) de cada una, para que no
  quede uno viejo. Cada vista tiene uno; en "Sesión iniciada" es el de la tarjeta de la cuenta.
- `…textContent = alert;`: escribe el mensaje en la vista pedida. Como ese `<p>` tiene
  `role="alert"`, el lector de pantalla lo lee; si es `''`, `empty:hidden` lo esconde.
  `textContent` escribe texto tal cual, nunca HTML
  ([textContent e innerHTML](../../../glosario.md#textcontent-e-innerhtml)).
- `if (view === 'recover')`: cada vez que se vuelve a esa vista, deja el formulario visible y el
  mensaje "pedido" escondido, por si quedó así de una vez anterior.

```astro

	// Opening the signed-in view always loads the products (spec 0015) and the publish state
	// (spec 0016).
	function showSignedIn(user: AuthUser, status = '', alert = '') {
		root.querySelector('[data-email]')!.textContent = user.email;
		root.querySelector('[data-status]')!.textContent = status;
		show('signed-in', alert);
		void loadCatalog();
		void loadPublish();
	}
```

- El comentario: "Abrir la vista de sesión iniciada siempre carga los productos (spec 0015) y el
  estado de la publicación (spec 0016)."
- `showSignedIn()`: rellena el email y el aviso (`status`, por ejemplo "Contraseña cambiada."),
  enseña la vista con un error opcional y lanza `loadCatalog()` (bloque 30) sin esperarla
  ([operador void](../../../glosario.md#operador-void)): la vista sale en seguida con
  "Cargando productos…" y la lista llega cuando contesta Supabase.
- `void loadPublish();`: igual, sin esperar, carga el estado de la tarjeta "Publicar" (bloque
  39g). Las dos cargas van a la vez y cada una escribe en su tarjeta.

### 17. El botón mientras espera

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
  ([finally](../../../glosario.md#finally)). Lo usan "Entrar", "Enviarme un enlace", "Cambiar
  contraseña", "Cerrar sesión", "Guardar", "Sí, borrar" y "Publicar cambios".

### 18. Solo el dueño puede pasar

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
- Esto es solo para la pantalla. Lo que de verdad protege los datos es
  [`is_owner()`](../../../supabase/auth.sql.md) dentro de las políticas de
  [`products-write.sql`](../../../supabase/products-write.sql.md) (feature 12).

### 19. Escuchar un formulario

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
  Los tres formularios de la sesión hacen lo mismo al enviarse, así que el código común vive aquí
  una sola vez. (El de productos tiene el suyo, bloque 35, porque revisa los campos de otra
  forma.)
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

### 20. Formulario "Entrar"

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
  contraseña mal: "Email o contraseña incorrectos." (AC3 de la spec 0014).

### 21. Formulario "Recuperar"

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

### 22. Formulario "Nueva contraseña"

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

### 23. Los botones que cambian de vista

```astro

	for (const button of root.querySelectorAll<HTMLButtonElement>('[data-go]')) {
		button.addEventListener('click', () => show(button.dataset.go as View));
	}
```

- Busca los botones con `data-go` ("¿Olvidaste tu contraseña?" y "Volver") y, al pulsarlos,
  enseña la vista que dice su `data-go`. `as View`: confía en que el texto del HTML es un nombre
  de vista válido ([afirmación de tipo](../../../glosario.md#afirmacion-de-tipo)).

### 24. El botón "Cerrar sesión"

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
  de este, incluso sin conexión) y vuelta a "Entrar" (AC6 de la spec 0014).

### 25. Productos: el estado

```astro

	// --- Products (spec 0015) ----------------------------------------------------------------

	const FIELD_NAMES: FieldName[] = ['name', 'category_id', 'price', 'unit', 'description'];

	let categories: CategoryRow[] = [];
	let products: ProductRow[] = [];
	// False until a load succeeds: the list is never drawn from partial data.
	let loaded = false;
	// Only the latest load may draw the list.
	let loadRun = 0;
	// The product open in the form; null while adding one.
	let editing: ProductRow | null = null;
```

- `// --- Products (spec 0015) ---`: separador. Desde aquí, todo es de la feature 12.
- `FIELD_NAMES`: los cinco campos que pueden tener un error, para recorrerlos con un `for`. Su
  tipo, `FieldName[]`, viene de [`products.ts`](../../lib/products.ts.md#2-los-tipos-del-formulario).
- Cinco variables del script que guardan el estado de la página mientras está abierta:
  - `categories` y `products`: las filas cargadas de Supabase. La lista se dibuja siempre desde
    aquí.
  - `loaded`: "Falso hasta que una carga sale bien: la lista nunca se dibuja con datos a
    medias."
  - `loadRun`: "Solo la última carga puede dibujar la lista." Un contador; el porqué, en el
    bloque 30.
  - `editing`: "El producto abierto en el formulario; `null` mientras se añade uno."
    `ProductRow | null` es una [unión](../../../glosario.md#union).

### 26. Productos: las piezas de la página

```astro

	const listTitle = root.querySelector<HTMLElement>('[data-list-title]')!;
	const listStatus = root.querySelector<HTMLElement>('[data-list-status]')!;
	const listAlert = root.querySelector<HTMLElement>('[data-list-alert]')!;
	const retryButton = root.querySelector<HTMLButtonElement>('[data-retry]')!;
	const emptyNote = root.querySelector<HTMLElement>('[data-empty]')!;
	const list = root.querySelector<HTMLElement>('[data-list]')!;
	const productForm = form('product');
	const productAlert = productForm.querySelector<HTMLElement>('[data-alert]')!;
	const saveButton = productForm.querySelector<HTMLButtonElement>('button[type="submit"]')!;
	const stockBox = productForm.querySelector<HTMLInputElement>('[name="in_stock"]')!;
	const productTitle = root.querySelector<HTMLElement>('[data-product-title]')!;
	const productLink = root.querySelector<HTMLElement>('[data-product-link]')!;
	const deleteArea = root.querySelector<HTMLElement>('[data-delete-area]')!;
	const deleteButton = root.querySelector<HTMLButtonElement>('[data-delete]')!;
	const lastProductNote = root.querySelector<HTMLElement>('[data-last-product]')!;
	const confirmBlock = root.querySelector<HTMLElement>('[data-confirm]')!;
	const confirmYes = root.querySelector<HTMLButtonElement>('[data-confirm-yes]')!;
	const confirmNo = root.querySelector<HTMLButtonElement>('[data-confirm-no]')!;
	const photoPreview = root.querySelector<HTMLImageElement>('[data-photo-preview]')!;
	const photoNone = root.querySelector<HTMLElement>('[data-photo-none]')!;
	const photoInput = root.querySelector<HTMLInputElement>('[data-photo-input]')!;
	const photoPick = root.querySelector<HTMLElement>('[data-photo-pick]')!;
	const photoRemove = root.querySelector<HTMLButtonElement>('[data-photo-remove]')!;
	const photoStatus = root.querySelector<HTMLElement>('[data-photo-status]')!;
```

- Una constante por cada pieza del HTML que el script toca, buscadas una vez al cargar: los
  mensajes y el botón "Reintentar" de la lista, la lista, el formulario de producto con su zona
  de errores, su botón "Guardar" y su casilla `in_stock`, el título y el enlace del formulario,
  las piezas de borrar y, desde la spec 0017, las seis piezas del bloque "Foto" (bloque 9): la
  vista previa, la caja "Sin foto", el campo de archivo, su etiqueta, "Quitar foto" y la línea de
  estado. `form('product')` es el formulario de la vista `product` (bloque 14).

### 26b. Foto: el estado

```astro

	// --- Photo (spec 0017) ---------------------------------------------------------------------

	// What "Guardar" will do with the photo; `keep` whenever the form opens.
	let photoChange: PhotoChange = { kind: 'keep' };
	// The blob: URL of the new photo's preview, revoked when replaced or when the form closes.
	let previewUrl: string | undefined;
	// Only the latest choice may set the photo: a slow preparation must not undo a later tap.
	let photoRun = 0;
```

- `// --- Photo (spec 0017) ---`: separador. Desde aquí, todo es de la feature 14.
- Tres variables con el estado de la foto mientras el formulario está abierto:
  - `photoChange`: "Lo que 'Guardar' hará con la foto; `keep` cada vez que se abre el
    formulario." Es un `PhotoChange` de [`products.ts`](../../lib/products.ts.md#2-los-tipos-del-formulario):
    dejarla (`keep`), poner una nueva (`new`, con la foto ya reducida) o quitarla (`remove`).
    **Nada se manda a Supabase hasta "Guardar"**: elegir o quitar una foto solo cambia esta
    variable.
  - `previewUrl`: "La URL `blob:` de la vista previa de la foto nueva, que se revoca cuando se
    sustituye o cuando se cierra el formulario." La foto nueva todavía no está en ningún servidor;
    para enseñarla en el `<img>` se usa una [URL de objeto](../../../glosario.md#url-de-objeto),
    que apunta a la foto en la memoria de la pestaña.
  - `photoRun`: "Solo la última elección puede poner la foto: una preparación lenta no debe
    deshacer un toque posterior." Un contador, como `loadRun` (bloque 30): reducir una foto grande
    puede tardar un poco; si entretanto el dueño elige otra o pulsa "Quitar foto", el resultado
    de la primera llega tarde y ya no debe valer.

### 26c. Foto: dibujar el bloque

```astro

	function dropPreviewUrl() {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = undefined;
	}
```

- `dropPreviewUrl()`: si hay una URL de vista previa, la revoca (`URL.revokeObjectURL`), así el
  navegador libera la foto de su memoria, y la olvida. Se llama cada vez que esa foto deja de
  hacer falta.

```astro

	// Draws the block from the state: the new photo, the current one, or the "Sin foto" box.
	function drawPhoto() {
		let src = '';
		if (photoChange.kind === 'new' && previewUrl) src = previewUrl;
		else if (photoChange.kind === 'keep' && editing?.photo_path) {
			src = publicPhotoUrl(root.dataset.supabaseUrl!, editing.photo_path);
		}
```

- El comentario: "Dibuja el bloque a partir del estado: la foto nueva, la actual o la caja 'Sin
  foto'." Igual que la lista, el bloque nunca se cambia a trozos: se vuelve a pintar entero desde
  las variables del bloque 26b.
- `src`: qué foto enseñar, o `''` para ninguna.
  - Con una foto nueva (`new`), su URL `blob:`.
  - Si no hay cambio (`keep`) y el producto que se edita tiene foto, su dirección pública en el
    bucket: `publicPhotoUrl()` ([`photos.ts.md`](../../lib/photos.ts.md#10-la-dirección-pública-de-la-foto-actual))
    con la dirección de Supabase del atributo `data-supabase-url` (bloque 3) y el `photo_path`
    del producto. `editing?.photo_path`: al añadir, `editing` es `null` y esto da `undefined`
    ([encadenamiento opcional](../../../glosario.md#encadenamiento-opcional)).
  - Con `remove`, o al añadir sin foto: `''`.

```astro
		if (src) {
			if (photoPreview.getAttribute('src') !== src) photoPreview.src = src;
		} else {
			photoPreview.removeAttribute('src');
		}
```

- Si hay foto: le pone el `src` al `<img>`, pero solo si es distinto del que ya tiene. Así, al
  redibujar sin cambios, el navegador no vuelve a cargar la misma foto.
  `getAttribute('src')` lee el atributo tal como se escribió.
- Si no: le quita el `src`, para que el `<img>` escondido no siga guardando ni pidiendo una foto.

```astro
		photoPreview.hidden = !src;
		photoNone.hidden = Boolean(src);
		photoPick.textContent = src ? 'Cambiar foto' : 'Añadir foto';
		photoRemove.hidden = !src;
		photoStatus.textContent = photoChange.kind === 'new' ? PHOTO_NEW : photoChange.kind === 'remove' ? PHOTO_REMOVE : '';
	}
```

- Con foto: se ve la foto y se esconde "Sin foto"; sin foto, al revés. `Boolean(src)` convierte
  el texto en `true` (si tiene algo) o `false` (si es `''`).
- La etiqueta dice "Cambiar foto" si hay foto y "Añadir foto" si no (spec 0017, AC2).
- "Quitar foto" solo se ve si hay una foto que quitar.
- La línea de estado: "La foto nueva se subirá al guardar." con `new`, "La foto se quitará al
  guardar." con `remove`, y vacía con `keep` (y entonces `empty:hidden` la esconde). Son dos
  `? :` seguidos: si es `new`, el primero; si no, mira si es `remove`.

```astro

	function resetPhoto() {
		photoRun++;
		dropPreviewUrl();
		photoChange = { kind: 'keep' };
		photoInput.value = '';
		saveButton.disabled = false;
	}
```

- `resetPhoto()`: vuelve al estado de partida. La llaman `show()` al salir del formulario
  (bloque 16) y `openForm()` al abrirlo (bloque 32).
  - `photoRun++`: si una foto se estaba preparando, su resultado ya no valdrá (bloque 26d).
  - Libera la vista previa, vuelve a `keep` y vacía el campo de archivo.
  - `saveButton.disabled = false`: por si se salió del formulario mientras una foto se preparaba
    (en ese momento "Guardar" está desactivado).

### 26d. Foto: elegir una

```astro

	// The photo is shrunk as soon as it is chosen, so the preview shows what will be uploaded.
	// "Guardar" waits until it is ready.
	async function choosePhoto(file: File) {
		const run = ++photoRun;
		productAlert.textContent = '';
		photoStatus.textContent = PREPARING;
		saveButton.disabled = true;
```

- El comentario: "La foto se reduce en cuanto se elige, así la vista previa enseña lo que se va a
  subir. 'Guardar' espera a que esté lista."
- `choosePhoto(file)`: recibe el [File](../../../glosario.md#blob) elegido.
- `const run = ++photoRun;`: suma uno al contador y se queda con el número nuevo. Es "el número
  de esta elección". (`++` delante suma **antes** de leer el valor.)
- Borra el error anterior del formulario, pone "Preparando foto…" en la línea de estado y
  desactiva "Guardar": no se puede guardar una foto que aún no está lista.

```astro
		try {
			const photo = await preparePhoto(file);
			if (run !== photoRun) return;
			dropPreviewUrl();
			previewUrl = URL.createObjectURL(photo);
			photoChange = { kind: 'new', photo };
```

- `await preparePhoto(file)`: la reduce y la convierte en JPEG en el propio móvil
  ([`photos.ts.md`](../../lib/photos.ts.md#5-reducir-la-foto-preparephoto)).
- `if (run !== photoRun) return;`: si mientras tanto pasó otra cosa (otra foto elegida, "Quitar
  foto", salir del formulario), el contador ya no es el mismo y este resultado se tira. Esa otra
  acción ya dejó el bloque como debe estar, botón incluido.
- Si sigue siendo la última: suelta la vista previa anterior, si había, y crea una nueva con la
  foto reducida (`URL.createObjectURL`, [URL de objeto](../../../glosario.md#url-de-objeto)). El
  dueño ve **la foto que se va a subir**, no la original.
- `photoChange = { kind: 'new', photo }`: al guardar, se subirá esta foto. `{ kind: 'new', photo }`
  es la forma corta de `{ kind: 'new', photo: photo }`.

```astro
		} catch {
			// preparePhoto() throws only PhotoError('unreadable'); the state stays as it was.
			if (run !== photoRun) return;
			productAlert.textContent = UNREADABLE;
		}
		saveButton.disabled = false;
		drawPhoto();
	}
```

- El comentario: "`preparePhoto()` solo lanza `PhotoError('unreadable')`; el estado se queda
  como estaba." Si la foto no se pudo abrir (un HEIC en Android, un archivo que no es una
  imagen), sale "No se pudo abrir esta foto. Prueba con otra." en la zona de errores, y
  `photoChange` no se toca: si había una foto, sigue ahí (spec 0017, AC6).
- Las dos últimas líneas valen para los dos casos: "Guardar" vuelve a funcionar y el bloque se
  redibuja (bloque 26c). Con éxito, se ve la foto nueva con "La foto nueva se subirá al
  guardar."; con error, el bloque como estaba antes, y la línea "Preparando foto…" desaparece.

```astro

	photoInput.addEventListener('change', () => {
		const file = photoInput.files?.[0];
		// Reset, so choosing the same file again still fires "change".
		photoInput.value = '';
		if (file) void choosePhoto(file);
	});
```

- El evento `change` del campo de archivo salta cuando el dueño elige una foto
  ([input-file](../../../glosario.md#input-file)).
- `photoInput.files?.[0]`: el primer archivo elegido, o `undefined`. `?.[0]` es el
  [encadenamiento opcional](../../../glosario.md#encadenamiento-opcional) con corchetes.
- El comentario: "Se vacía, para que elegir otra vez el mismo archivo siga disparando `change`."
  Sin esto, si el dueño quita una foto y vuelve a elegir la misma, no pasaría nada. El archivo
  ya está guardado en `file`, así que vaciar el campo no lo pierde.
- `void choosePhoto(file)`: la lanza sin esperarla ([operador void](../../../glosario.md#operador-void)).

### 26e. Foto: "Quitar foto"

```astro

	// A photo the product had is removed on save; a new one not saved yet is only dropped.
	photoRemove.addEventListener('click', () => {
		photoRun++;
		dropPreviewUrl();
		photoChange = editing?.photo_path ? { kind: 'remove' } : { kind: 'keep' };
		saveButton.disabled = false;
		drawPhoto();
		// The button just hid itself; focus moves to the photo control.
		photoInput.focus();
	});
```

- El comentario: "Una foto que el producto tenía se quita al guardar; una nueva que aún no se ha
  guardado solo se descarta."
- `photoRun++`: si una foto se estaba preparando, su resultado ya no vale.
- `dropPreviewUrl()`: suelta la vista previa de la foto nueva, si la había.
- Dos casos:
  - Si el producto tenía una foto guardada: `remove`. Al guardar, se pondrá `photo_path` a `null`
    y se borrará el archivo.
  - Si no (al añadir, o si solo había una foto nueva sin guardar): `keep`. No hay nada que
    quitar en Supabase; basta con olvidar la foto elegida.
- Redibuja el bloque: con `remove`, la caja "Sin foto" y "La foto se quitará al guardar." (AC5).
- El comentario: "El botón se acaba de esconder a sí mismo; el foco pasa al control de la foto."
  "Quitar foto" ya no se ve (no hay foto), y un elemento escondido no puede tener el foco. Sin
  esta línea, quien usa el teclado se quedaría sin saber dónde está. `photoInput.focus()` lo
  lleva al campo de archivo, y la etiqueta "Añadir foto" dibuja su contorno (bloque 9).

### 26f. Un campo por su nombre

```astro

	function field(name: FieldName) {
		return productForm.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
	}
```

- `field(name)`: el campo del formulario de producto con ese `name`.
  `productForm.elements.namedItem(name)` busca entre los campos del formulario por su `name`.
  `as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement`: le dice a TypeScript que será
  un campo de texto, un desplegable o un área de texto
  ([afirmación de tipo](../../../glosario.md#afirmacion-de-tipo)); los tres tienen `.value` y
  `.setCustomValidity()`.

### 27. Moldes y errores

```astro

	function fromTemplate(name: 'group' | 'row'): HTMLElement {
		const template = root.querySelector<HTMLTemplateElement>(`[data-template="${name}"]`)!;
		return template.content.firstElementChild!.cloneNode(true) as HTMLElement;
	}

	function isSignedOut(error: unknown): boolean {
		return error instanceof AuthError && error.kind === 'signedOut';
	}

	function needsReload(error: unknown): boolean {
		return error instanceof ProductError && RELOAD_KINDS.has(error.kind);
	}

	function messageOf(error: unknown): string {
		return error instanceof ProductError ? PRODUCT_MESSAGES[error.kind] : MESSAGES[kindOf(error)];
	}
```

- `fromTemplate(name)`: busca el `<template>` del bloque 11 por su `data-template` y devuelve
  una copia de su primer elemento con todo lo de dentro
  ([template-html](../../../glosario.md#template-html)). `cloneNode` devuelve un `Node`
  genérico; `as HTMLElement` dice qué es en realidad. El tipo del argumento,
  `'group' | 'row'`, solo deja pedir uno de los dos moldes.
- `isSignedOut(error)`: `true` si es un `AuthError` de sesión acabada. Ese caso siempre lleva a
  "Entrar".
- `needsReload(error)`: `true` si es un `ProductError` de los que piden recargar la lista
  (`RELOAD_KINDS`, bloque 13).
- `messageOf(error)`: el mensaje en español de cualquier error: el de `PRODUCT_MESSAGES` si es un
  `ProductError`, y si no el de `MESSAGES` (sin red, demasiados intentos…).

### 28. Dibujar una fila y la lista

```astro

	// Owner text reaches the page through textContent only, never innerHTML.
	function drawRow(product: ProductRow): HTMLElement {
		const row = fromTemplate('row');
		row.dataset.id = product.id;
		row.querySelector('[data-edit]')!.textContent = product.name;
		row.querySelector('[data-detail]')!.textContent = `${product.unit} · ${formatPrice(product.price)}`;
		row.querySelector('[data-stock-name]')!.textContent = `${product.name}: `;
		row.querySelector<HTMLInputElement>('[data-stock]')!.checked = product.in_stock;
		return row;
	}
```

- El comentario: "El texto del dueño llega a la página solo con `textContent`, nunca con
  `innerHTML`." Es una regla de seguridad de la spec 0015: si un nombre de producto contuviera
  HTML con código, `textContent` lo escribe como letras y nunca lo ejecuta
  ([textContent e innerHTML](../../../glosario.md#textcontent-e-innerhtml)).
- `drawRow(product)`: copia el molde de fila y lo rellena:
  - `row.dataset.id = product.id`: escribe `data-id="arroz-blanco"` en el `<li>`, para saber
    luego de qué producto es cada fila ([atributo data](../../../glosario.md#atributo-data)).
  - El botón de editar recibe el nombre.
  - `data-detail`: "1 lb · 280 CUP", con el precio siempre a través de `formatPrice()`.
  - `data-stock-name`: el nombre seguido de `: `, solo para el lector de pantalla (bloque 11).
  - `.checked = product.in_stock`: la casilla, marcada si está disponible.

```astro

	function drawList() {
		const groups = groupProducts(categories, products);
		list.replaceChildren(
			...groups.map((group) => {
				const element = fromTemplate('group');
				element.querySelector('[data-group-name]')!.textContent = group.category.name;
				element.querySelector('ul')!.replaceChildren(...group.products.map(drawRow));
				return element;
			}),
		);
		// Only possible if the table was emptied in the dashboard.
		emptyNote.hidden = groups.length > 0;
	}
```

- `drawList()`: vuelve a dibujar la lista entera desde `categories` y `products`.
- `groupProducts(…)`: los grupos ya ordenados y sin categorías vacías
  ([`products.ts.md`](../../lib/products.ts.md#9-la-lista-agrupada-groupproducts)).
- `list.replaceChildren(...)`: sustituye **todo** lo que había dentro de la lista por los
  elementos que recibe (con nada, la vacía). Recibe un grupo por categoría
  ([spread](../../../glosario.md#spread)): cada uno es una copia del molde `group` con el nombre
  de la categoría en su `h3` y sus filas dentro del `<ul>`.
- `emptyNote.hidden = groups.length > 0`: "Todavía no hay productos." solo sale si no hay ningún
  grupo, lo que solo puede pasar si la tabla se vació desde el panel.

### 29. El desplegable de categorías

```astro

	// The category select keeps its choice while that category still exists.
	function fillCategories(selected: string) {
		const select = field('category_id');
		select.replaceChildren(
			new Option('Elige una categoría', ''),
			...categories.map((category) => new Option(category.name, category.id)),
		);
		select.value = categories.some((category) => category.id === selected) ? selected : '';
	}
```

- El comentario: "El desplegable de categorías conserva su elección mientras esa categoría siga
  existiendo."
- `select.replaceChildren(…)`: rehace todas las opciones: primero "Elige una categoría" con
  valor `''` y después una por categoría. `new Option(texto, valor)` crea un `<option>`: se ve
  el nombre ("Aseo") y su valor es el id (`aseo`).
- `select.value = …`: vuelve a elegir `selected` si esa categoría sigue en la lista; si no, `''`
  (ninguna). Así una recarga no le cambia al dueño la categoría que tenía puesta, salvo que
  alguien la haya borrado.

### 30. Cargar el catálogo

```astro

	// Loads categories and products, then draws the list. `alert` says why it loaded again.
	async function loadCatalog(alert = '') {
		const run = ++loadRun;
		loaded = false;
		listStatus.textContent = LOADING;
		listAlert.textContent = '';
		retryButton.hidden = true;
		emptyNote.hidden = true;
		list.replaceChildren();
```

- El comentario: "Carga las categorías y los productos, y luego dibuja la lista. `alert` dice
  por qué se cargó otra vez."
- `const run = ++loadRun;`: suma 1 al contador y se queda con su número. Es la protección
  contra respuestas que llegan **desordenadas**: si el dueño pulsa "Reintentar" dos veces, o un
  error pide recargar mientras otra carga sigue en marcha, hay dos cargas a la vez, y con una
  conexión lenta la más vieja puede contestar la última. Cada carga recuerda su número y, al
  volver, solo dibuja si sigue siendo la última.
- Antes de pedir nada, deja la lista en su estado "cargando": `loaded = false`, "Cargando
  productos…" en la zona de avisos, sin error, sin "Reintentar", sin "Todavía no hay
  productos." y con la lista vacía (`replaceChildren()` sin nada) (AC2).

```astro
		try {
			const [loadedCategories, loadedProducts] = await Promise.all([listCategories(), listProducts()]);
			if (run !== loadRun) return;
			categories = loadedCategories;
			products = loadedProducts;
			loaded = true;
			listStatus.textContent = '';
			listAlert.textContent = alert;
			fillCategories(field('category_id').value);
			drawList();
```

- `Promise.all([listCategories(), listProducts()])`: pide las dos tablas a la vez y espera a las
  dos ([promise-all](../../../glosario.md#promise-all)).
- `if (run !== loadRun) return;`: si mientras tanto empezó otra carga, esta se descarta sin
  tocar nada.
- Si sigue siendo la última: guarda las filas, marca `loaded`, quita "Cargando…", enseña el
  `alert` que se le pasó (por ejemplo "Este producto ya no existe. La lista se ha actualizado.")
  o nada, rehace el desplegable conservando la categoría elegida (bloque 29) y dibuja la lista.

```astro
		} catch (error) {
			if (run !== loadRun) return;
			listStatus.textContent = '';
			if (isSignedOut(error)) return show('sign-in', MESSAGES.signedOut);
			listAlert.textContent = messageOf(error);
			retryButton.hidden = false;
		}
	}
```

- Si la carga falla, y sigue siendo la última:
  - quita "Cargando…";
  - si la sesión se acabó → "Entrar" con "Tu sesión terminó. Entra de nuevo." (AC8);
  - si no, el mensaje del error en rojo (por ejemplo "Sin conexión…") y el botón "Reintentar"
    (AC2).

### 31. Después de guardar

```astro

	// After a successful write the list updates from the row PostgREST returned, without
	// loading everything again.
	function putProduct(row: ProductRow) {
		products = [...products.filter((product) => product.id !== row.id), row];
	}
```

- El comentario: "Después de una escritura que sale bien, la lista se actualiza con la fila que
  devolvió PostgREST, sin volver a cargarlo todo."
- `putProduct(row)`: quita de `products` la fila con ese id, si estaba, y añade la nueva. Sirve
  para añadir y para cambiar. El orden de la lista da igual: `groupProducts()` ordena al dibujar.
  Ahorra una carga completa por cada guardado, algo que se nota con la conexión de Cuba.

```astro

	// Back from the form to the list, with an optional status line.
	function showList(status = '') {
		show('signed-in');
		listTitle.focus();
		if (!loaded) return void loadCatalog();
		drawList();
		listStatus.textContent = status;
		listAlert.textContent = '';
	}
```

- El comentario: "Del formulario de vuelta a la lista, con una línea de aviso opcional."
- `show('signed-in')` y `listTitle.focus()`: enseña la lista y pone el foco en su título
  ([tabindex-menos-uno](../../../glosario.md#tabindex-menos-uno)).
- `if (!loaded) return void loadCatalog();`: si la lista nunca llegó a cargarse bien, la carga
  ahora en vez de dibujar datos a medias.
- Si estaba cargada: la dibuja con los cambios y enseña el aviso, por ejemplo "Producto
  guardado.", borrando cualquier error anterior de la lista.

### 32. Abrir el formulario

```astro

	function openForm(product: ProductRow | null) {
		editing = product;
		productForm.reset();
		resetPhoto();
		drawPhoto();
		for (const name of FIELD_NAMES) field(name).setCustomValidity('');
		fillCategories(product?.category_id ?? '');
		productTitle.textContent = product ? 'Editar producto' : 'Añadir producto';
		productLink.textContent = product ? `Enlace: /producto/${product.id}` : '';
```

- `openForm(product)`: con un producto, el formulario para editarlo; con `null`, uno vacío para
  añadir (AC3, AC4).
- `productForm.reset()`: vuelve a dejar los campos como en el HTML: vacíos y "Disponible"
  marcado.
- `resetPhoto()` y `drawPhoto()` (spec 0017, bloque 26c): la foto empieza en `keep` y el bloque
  "Foto" enseña la foto actual del producto (cargada de su dirección pública en ese momento, no
  antes) o, al añadir o si no tiene, la caja "Sin foto". `drawPhoto()` lee `editing`, que se
  acaba de poner en la primera línea.
- Borra los mensajes que hubieran quedado en los campos de una vez anterior
  ([setcustomvalidity](../../../glosario.md#setcustomvalidity)).
- `fillCategories(product?.category_id ?? '')`: rehace el desplegable y elige la categoría del
  producto, o ninguna al añadir ([encadenamiento opcional](../../../glosario.md#encadenamiento-opcional),
  [nullish](../../../glosario.md#nullish)).
- El título ("Editar producto" o "Añadir producto") y la línea "Enlace: /producto/<id>", que al
  añadir queda vacía.

```astro
		if (product) {
			field('name').value = product.name;
			field('price').value = String(product.price);
			field('unit').value = product.unit;
			field('description').value = product.description;
			stockBox.checked = product.in_stock;
		}
```

- Al editar, rellena cada campo con el valor guardado. `String(product.price)`: el precio es un
  número y el campo necesita texto (`12500` → `"12500"`).

```astro
		// The build refuses an empty table (spec 0013), so the last product stays.
		deleteArea.hidden = !product;
		deleteButton.hidden = products.length <= 1;
		lastProductNote.hidden = products.length > 1;
		confirmBlock.hidden = true;
		show('product');
		productTitle.focus();
	}
```

- El comentario: "El build rechaza una tabla vacía (spec 0013), así que el último producto se
  queda."
- `deleteArea.hidden = !product`: al añadir, sin zona de borrar.
- Si queda un solo producto, en vez del botón "Borrar producto" sale la frase "No puedes borrar
  el último producto…" (AC6). Las dos líneas se complementan: una se enseña cuando la otra se
  esconde.
- La confirmación empieza cerrada.
- `show('product')` y `productTitle.focus()`: enseña el formulario y pone el foco en su título.

### 33. Cuando falla una escritura

```astro

	// A failed write keeps the form and every value, except when the product no longer exists.
	function failForm(error: unknown) {
		if (isSignedOut(error)) return show('sign-in', MESSAGES.signedOut);
		const message = messageOf(error);
		if (error instanceof ProductError && error.kind === 'gone') {
			show('signed-in');
			listTitle.focus();
			return void loadCatalog(message);
		}
		productAlert.textContent = message;
		if (needsReload(error)) void loadCatalog();
	}
```

- El comentario: "Una escritura que falla conserva el formulario y todos sus valores, salvo
  cuando el producto ya no existe." (AC8.)
- Sesión acabada → "Entrar" con su mensaje.
- `gone` (el producto se borró desde otro sitio): ya no tiene sentido seguir en el formulario.
  Vuelve a la lista, le da el foco a su título y la recarga con el mensaje "Este producto ya no
  existe. La lista se ha actualizado.".
- Cualquier otro error: el mensaje en la zona de errores del formulario, y los campos se quedan
  como estaban, para que el dueño no tenga que escribirlo todo otra vez. Con "Sin conexión.
  Revisa tus datos e inténtalo otra vez." puede pulsar "Guardar" de nuevo cuando vuelva la red.
- `if (needsReload(error)) void loadCatalog();`: con `exists` o `noCategory`, además recarga la
  lista por detrás, sin salir del formulario.

### 34. Guardar

```astro

	// The save order and its cleanup live in saveProduct(); the button's label follows its steps.
	// The photo controls are locked meanwhile, so the photo cannot change under the save.
	async function save(fields: ProductFields) {
		photoInput.disabled = true;
		photoRemove.disabled = true;
```

- El comentario: "El orden de guardar y su limpieza viven en `saveProduct()`; el texto del botón
  sigue sus pasos. Mientras tanto, los controles de la foto se bloquean, para que la foto no
  pueda cambiar en mitad del guardado."
- `save(fields)`: recibe los campos ya revisados.
- `photoInput.disabled = true` y `photoRemove.disabled = true`: ni elegir otra foto ni quitarla
  mientras se sube la elegida. Con el campo desactivado, la etiqueta "Cambiar foto" se ve pálida
  (`peer-disabled:opacity-50`, bloque 9).

```astro
		try {
			const takenIds = products.map((product) => product.id);
			putProduct(
				await saveProduct(editing, fields, photoChange, takenIds, (step) => {
					saveButton.textContent = step === 'uploading' ? UPLOADING : SAVING;
				}),
			);
			markPending();
			showList(SAVED);
```

- `takenIds`: los ids de todos los productos cargados, para que el id de uno nuevo no choque con
  ninguno (`-2`, `-3`…).
- `saveProduct(editing, fields, photoChange, takenIds, …)`
  ([`products.ts.md`](../../lib/products.ts.md#18-guardar-un-producto-con-su-foto-saveproduct)):
  una sola llamada para añadir y para editar. Le pasa el producto que se edita (o `null` al
  añadir), los campos, qué hacer con la foto y los ids usados. Por dentro sube la foto nueva si la
  hay, guarda la fila con un solo `POST` o `PATCH` (o ninguno, si no cambió nada) y borra la foto
  vieja si se cambió o se quitó.
- El último argumento es una función, `(step) => { … }`, que `saveProduct` llama al empezar cada
  paso: pone en el botón "Subiendo foto…" mientras sube la foto y
  "Guardando…" mientras guarda la fila (spec 0017, AC5). Sin foto nueva, el botón pasa directo a
  "Guardando…". Al terminar, el `finally` de `whileBusy()` (bloque 17) le devuelve su texto
  "Guardar".
- `putProduct(…)` guarda en la lista la fila que devolvió Supabase (bloque 31).
- Si va bien: `markPending()` (spec 0016, bloque 39f) pone en la tarjeta "Publicar" "Hay cambios
  sin publicar." sin hacer ninguna petición, y vuelta a la lista con "Producto guardado.". (Si no
  cambió nada, también lo dice: es una línea de más, no un error.) Al salir del formulario,
  `show()` llama a `resetPhoto()` (bloque 16).

```astro
		} catch (error) {
			failForm(error);
		} finally {
			photoInput.disabled = false;
			photoRemove.disabled = false;
		}
	}
```

- Si falla: `failForm()` (bloque 33). El formulario se queda con todos sus valores **y con la
  foto elegida** (`photoChange` no se toca), así el dueño puede pulsar "Guardar" otra vez cuando
  vuelva la red (AC6). Un fallo de la subida llega como `ProductError` o `AuthError`, con los
  mismos mensajes que el resto.
- `finally` ([finally](../../../glosario.md#finally)): haya ido bien o mal, los controles de la
  foto vuelven a funcionar.

### 35. Enviar el formulario de producto

```astro

	// The checks run here, before any request is sent; the database checks again.
	productForm.addEventListener('submit', (event) => {
		event.preventDefault();
		const result = checkFields(
			{
				name: field('name').value,
				category_id: field('category_id').value,
				price: field('price').value,
				unit: field('unit').value,
				description: field('description').value,
				in_stock: stockBox.checked,
			},
			categories.map((category) => category.id),
		);
```

- El comentario: "Las comprobaciones se hacen aquí, antes de mandar ninguna petición; la base de
  datos vuelve a comprobar."
- `event.preventDefault()`: el formulario nunca se envía solo.
- `checkFields({ … }, …)`: le pasa lo escrito en cada campo y los ids de las categorías cargadas
  ([`products.ts.md`](../../lib/products.ts.md#6-comprobar-el-formulario-checkfields)).

```astro
		const problems = 'problems' in result ? result.problems : [];
		for (const name of FIELD_NAMES) {
			field(name).setCustomValidity(problems.find((problem) => problem.field === name)?.message ?? '');
		}
		productAlert.textContent = '';
		if ('problems' in result) {
			productForm.reportValidity();
			return;
		}
		void whileBusy(saveButton, () => save(result.fields));
	});
```

- `'problems' in result`: el operador `in` pregunta si el objeto tiene ese campo. Así se sabe
  cuál de las dos formas devolvió `checkFields()`, y TypeScript también lo entiende: dentro del
  `if`, `result.problems` existe, y fuera, `result.fields`.
- El `for`: a cada campo le pone su mensaje con `setCustomValidity()`, o `''` si está bien
  ([setcustomvalidity](../../../glosario.md#setcustomvalidity)). `problems.find(…)?.message ?? ''`:
  busca el error de ese campo; si no hay, `''`.
- Borra el error anterior del formulario.
- Si hay errores: `productForm.reportValidity()` enseña el aviso del navegador junto al primer
  campo malo, con el mensaje en español, y no se manda nada (AC7). Los demás campos marcados
  enseñan el suyo cuando el dueño llega a ellos.
- Si todo está bien: guarda con el botón ocupado (`whileBusy`, bloque 17).

### 36. Quitar el aviso al corregir

```astro

	// A field's message goes as soon as the owner changes that field.
	productForm.addEventListener('input', (event) => {
		const target = event.target;
		if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
			target.setCustomValidity('');
		}
	});
```

- El comentario: "El mensaje de un campo se va en cuanto el dueño cambia ese campo."
- El evento `input` salta cada vez que cambia el valor de un campo del formulario. Se escucha en
  el formulario entero, no en cada campo ([delegación de eventos](../../../glosario.md#delegacion-de-eventos)).
- `instanceof …`: comprueba que el elemento es un campo, y así TypeScript sabe que tiene
  `setCustomValidity` ([instanceof](../../../glosario.md#instanceof)).
- `setCustomValidity('')`: el campo vuelve a contar como bueno. Si no se borrara, el campo seguiría
  marcado como malo aunque el dueño ya lo hubiera corregido.

### 37. Borrar con confirmación

```astro

	// Delete asks inside the page: some in-app browsers block confirm().
	deleteButton.addEventListener('click', () => {
		if (!editing || products.length <= 1) return;
		root.querySelector('[data-confirm-text]')!.textContent = `¿Borrar «${editing.name}»? No se puede deshacer.`;
		deleteButton.hidden = true;
		confirmBlock.hidden = false;
		confirmNo.focus();
	});
```

- El comentario: "Borrar pregunta dentro de la página: algunos navegadores dentro de apps
  bloquean `confirm()`."
- Al pulsar "Borrar producto": si no hay producto abierto o es el último, no hace nada (una
  segunda red: el botón ya está escondido en ese caso).
- Escribe la pregunta con el nombre: "¿Borrar «Arroz blanco»? No se puede deshacer." (AC6).
- Esconde el botón, enseña la confirmación y pone el foco en "No, volver": si el dueño pulsa
  Enter sin pensar, elige la opción que no borra nada.

```astro

	confirmNo.addEventListener('click', () => {
		confirmBlock.hidden = true;
		deleteButton.hidden = false;
		deleteButton.focus();
	});
```

- "No, volver": cierra la confirmación, vuelve a enseñar "Borrar producto" y le devuelve el foco.
  No cambia nada.

```astro

	confirmYes.addEventListener('click', () => {
		const product = editing;
		if (!product) return;
		void whileBusy(confirmYes, async () => {
			try {
				await removeProduct(product.id);
				products = products.filter((item) => item.id !== product.id);
				markPending();
				showList(DELETED);
			} catch (error) {
				failForm(error);
			}
		});
	});
```

- "Sí, borrar": `const product = editing;` guarda el producto en una constante antes de esperar
  a la red, por si `editing` cambiara mientras tanto.
- Con el botón ocupado, `removeProduct(product.id)`
  ([`products.ts.md`](../../lib/products.ts.md#19-borrar-un-producto-y-su-foto-removeproduct)):
  borra la fila y, desde la spec 0017, también su foto del bucket. Si va bien, lo quita de
  `products`, marca la tarjeta "Publicar" con "Hay cambios sin publicar." (`markPending()`,
  bloque 39f) y vuelve a la lista con "Producto borrado.". Si lo único que falla es borrar el
  archivo de la foto, el producto ya está borrado y el mensaje es el mismo; el fallo solo queda en
  la consola. Si falla borrar el producto, `failForm()` (bloque 33).

### 38. Los demás botones y la lista

```astro

	root.querySelector('[data-cancel]')!.addEventListener('click', () => showList());
	root.querySelector('[data-add]')!.addEventListener('click', () => openForm(null));
	retryButton.addEventListener('click', () => void loadCatalog());
```

- "Cancelar" → vuelve a la lista sin guardar. "Añadir producto" → formulario vacío.
  "Reintentar" → vuelve a cargar. `root.querySelector('[data-cancel]')!` se usa una sola vez, así
  que no necesita constante.

```astro

	list.addEventListener('click', (event) => {
		const button = (event.target as Element).closest('[data-edit]');
		if (!button) return;
		const product = products.find((item) => item.id === button.closest('li')!.dataset.id);
		if (product) openForm(product);
	});
```

- Un solo `click` para **todos** los nombres de la lista, puesto en el contenedor
  ([delegación de eventos](../../../glosario.md#delegacion-de-eventos)). Las filas se borran y se
  vuelven a crear cada vez que se dibuja la lista; así no hace falta volver a conectar cada botón.
- `(event.target as Element).closest('[data-edit]')`: el botón de nombre que se tocó, o `null`
  si el toque fue en otro sitio (entonces no hace nada).
- `button.closest('li')!.dataset.id`: el id de la fila de ese botón (bloque 28).
  `products.find(…)` busca el producto con ese id y, si está, abre su formulario (AC4).

### 39. La casilla "Disponible" de cada fila

```astro

	// One tap saves the stock state. The box is locked until the answer, and undone on failure.
	async function switchStock(box: HTMLInputElement) {
		const id = box.closest('li')!.dataset.id!;
		box.disabled = true;
		listStatus.textContent = '';
		listAlert.textContent = '';
		try {
			putProduct(await setStock(id, box.checked));
			markPending();
		} catch (error) {
			box.checked = !box.checked;
			if (isSignedOut(error)) return show('sign-in', MESSAGES.signedOut);
			if (needsReload(error)) return void loadCatalog(messageOf(error));
			listAlert.textContent = messageOf(error);
		} finally {
			box.disabled = false;
		}
	}
```

- El comentario: "Un toque guarda la disponibilidad. La casilla se bloquea hasta la respuesta, y
  se deshace si falla." (AC5.)
- `box.closest('li')!.dataset.id!`: el id del producto de esa fila.
- `box.disabled = true`: mientras llega la respuesta, la casilla no se puede volver a tocar.
- Borra los avisos de la lista y llama a `setStock(id, box.checked)`: `box.checked` ya es el
  valor **nuevo**, porque el navegador cambia la casilla antes de avisar del cambio.
- Si va bien: `putProduct` guarda la fila que devolvió Supabase. No hace falta redibujar: la
  casilla ya enseña el valor correcto. Y `markPending()` (spec 0016, bloque 39f): "Hay cambios
  sin publicar." en la tarjeta "Publicar".
- Si falla: `box.checked = !box.checked` la devuelve a como estaba. Después: sesión acabada →
  "Entrar"; un error que pide recargar → recarga con su mensaje; cualquier otro → el mensaje en
  la zona de errores de la lista.
- `finally`: la casilla se vuelve a poder tocar, haya ido bien o mal.

```astro

	list.addEventListener('change', (event) => {
		const box = event.target;
		if (box instanceof HTMLInputElement && box.matches('[data-stock]')) void switchStock(box);
	});
```

- El evento `change` de una casilla salta cuando se marca o desmarca. Otra vez un solo oyente en
  la lista: `box.matches('[data-stock]')` comprueba que el cambio vino de una casilla de
  disponibilidad, y entonces llama a `switchStock`.

### 39b. Publicar: las piezas y el estado

Desde aquí, todo es de la feature 13 (spec 0016). La idea en una frase: la tarjeta "Publicar"
**deduce** su estado comparando tres horas (la del último cambio en Supabase, las de
`/build.json` y la de la última publicación) con `publishState()` de
[`publish.ts`](../../lib/publish.ts.md#9-la-regla-publishstate), y mientras espera un build lo
vigila leyendo `/build.json` cada 15 segundos.

```astro

	// --- Publish (spec 0016) -----------------------------------------------------------------

	const publishStatus = root.querySelector<HTMLElement>('[data-publish-status]')!;
	const publishAlert = root.querySelector<HTMLElement>('[data-publish-alert]')!;
	const publishButton = root.querySelector<HTMLButtonElement>('[data-publish]')!;
```

- `// --- Publish (spec 0016) ---`: separador, "Publicar".
- Las tres piezas de la tarjeta del bloque 7b: la línea de estado, la zona de errores y el botón.

```astro

	// Only the latest load or watch may write the card; stopPublish() moves it on.
	let publishRun = 0;
	// True while a publish is being watched: the card then keeps "Publicando…".
	let watching = false;
	let publishTimer: number | undefined;
```

- `publishRun`: "Solo la última carga o vigilancia puede escribir en la tarjeta; `stopPublish()`
  lo hace avanzar." Es el mismo truco que `loadRun` en el bloque 30: cada carga o vigilancia
  recuerda el número que tenía `publishRun` al empezar. Cuando llega su respuesta (a veces
  minutos después), compara: si el número cambió, es que empezó otra cosa o se paró todo, y esa
  respuesta vieja se tira sin tocar la tarjeta.
- `watching`: "Verdadero mientras se vigila una publicación: la tarjeta mantiene entonces
  'Publicando…'." Lo mira `markPending()` (bloque 39f).
- `publishTimer`: el número que devuelve `setTimeout` para la próxima pregunta a `/build.json`
  ([setTimeout](../../../glosario.md#settimeout)), o `undefined` si no hay ninguna programada.
  Guardarlo permite cancelarla.

### 39c. Publicar: el mensaje de un error y la línea de estado

```astro

	function publishMessage(error: unknown): string {
		return error instanceof PublishError ? PUBLISH_MESSAGES[error.kind] : MESSAGES[kindOf(error)];
	}
```

- Como `messageOf()` del bloque 27, pero para publicar: si es un `PublishError`, su mensaje de
  `PUBLISH_MESSAGES` (bloque 13); si no, el de `MESSAGES` ("Sin conexión…", "Demasiados
  intentos…").

```astro

	function stateLine(state: PublishState): string {
		if (state.publishing) return PUBLISHING;
		return state.pending ? PENDING : UP_TO_DATE;
	}
```

- Convierte el estado calculado en la frase de la tarjeta:
  - si hay una publicación en marcha → "Publicando… La web se actualiza en unos minutos.";
  - si no, y hay cambios pendientes → "Hay cambios sin publicar.";
  - si no → "La web está al día.".
- "Publicando" va primero: mientras se construye, lo importante es que ya viene algo.

### 39d. Publicar: parar todo

```astro

	function stopPublish() {
		publishRun++;
		watching = false;
		window.clearTimeout(publishTimer);
	}
```

- `publishRun++`: el contador avanza, así que cualquier carga o pregunta que esté en camino, al
  volver, verá otro número y no escribirá nada (bloque 39b).
- `watching = false`: ya no se vigila nada.
- `window.clearTimeout(publishTimer)`: cancela la próxima pregunta programada, si la hay
  ([setTimeout](../../../glosario.md#settimeout)).
- La llaman `show()` al salir de las vistas con sesión (bloque 16), y `loadPublish()` y `watch()`
  antes de empezar, para que nunca haya dos vigilancias a la vez.

### 39e. Publicar: cuando falla una carga

```astro

	// A load that fails shows its message, an empty status line and a usable button.
	function failPublish(run: number, error: unknown) {
		if (run !== publishRun) return;
		watching = false;
		publishStatus.textContent = '';
		if (isSignedOut(error)) return show('sign-in', MESSAGES.signedOut);
		publishAlert.textContent = publishMessage(error);
	}
```

- El comentario: "Una carga que falla enseña su mensaje, una línea de estado vacía y un botón que
  se puede usar." (Spec 0016: si no se sabe el estado, mejor no decir nada que decir algo falso.)
- `run !== publishRun`: si es de una carga vieja, nada.
- Deja de vigilar y vacía la línea de estado.
- Sesión acabada → "Entrar" con "Tu sesión terminó. Entra de nuevo." (AC9). Si no, el mensaje en
  rojo. El botón no se toca: el dueño puede intentar publicar igualmente.

### 39f. Publicar: marcar cambios pendientes

```astro

	// After a product write the catalog differs from the live site, with no request needed.
	function markPending() {
		if (!watching) publishStatus.textContent = PENDING;
	}
```

- El comentario: "Después de escribir un producto, el catálogo es distinto del de la web, sin
  necesidad de preguntar." Si el dueño acaba de guardar, cambiar la disponibilidad o borrar
  (bloques 34, 37 y 39), Supabase ya tiene algo que la web no enseña. No hace falta pedir las
  horas para saberlo: se escribe "Hay cambios sin publicar." directamente (AC4).
- `if (!watching)`: salvo mientras se vigila una publicación, que conserva "Publicando…". Ese
  cambio no se pierde: cuando el build llegue, `finishWatch()` (bloque 39h) vuelve a leer la hora
  de Supabase y verá que hay algo pendiente (AC7).

### 39g. Publicar: cargar el estado al abrir la vista

```astro

	// The three values load together when the signed-in view opens. A publish whose build is not
	// live yet (after a reload, or from another device) is watched from here.
	async function loadPublish() {
		stopPublish();
		const run = publishRun;
		publishStatus.textContent = CHECKING;
		publishAlert.textContent = '';
```

- El comentario: "Los tres valores se cargan juntos cuando se abre la vista de sesión iniciada.
  Una publicación cuyo build todavía no está en la web (tras recargar, o desde otro dispositivo)
  se vigila desde aquí."
- `stopPublish()` y `const run = publishRun;`: para lo que hubiera en marcha y se queda con el
  número nuevo.
- La línea dice "Comprobando…" y la zona de errores se vacía.

```astro
		try {
			const [build, changedAt, requestedAt] = await Promise.all([readBuild(), catalogChangedAt(), lastPublish()]);
			if (run !== publishRun) return;
			const state = publishState(build, changedAt, requestedAt);
```

- `Promise.all([…])`: las tres lecturas **a la vez** ([promise-all](../../../glosario.md#promise-all)):
  `/build.json` de la web, la hora del último cambio y la de la última publicación (ver
  [`publish.ts.md`](../../lib/publish.ts.md)). Si una falla, falla todo y se va al `catch`.
- `if (run !== publishRun) return;`: si mientras tanto empezó otra cosa, esta respuesta se tira.
- `publishState(…)`: el estado, `{ pending, publishing }`.

```astro
			if (state.publishing && requestedAt !== null) watch(requestedAt);
			else publishStatus.textContent = stateLine(state);
		} catch (error) {
			failPublish(run, error);
		}
	}
```

- Si hay una publicación en marcha, se empieza a vigilarla con `watch()` (bloque 39j). Es lo que
  hace que, si el dueño **recarga** la página mientras Vercel construye, o la abre en otro móvil,
  siga viendo "Publicando…" y luego "Publicado…" (AC6). `requestedAt !== null` ya es cierto si
  `publishing` lo es, pero así TypeScript sabe que es un texto.
- Si no, la línea del estado: "Hay cambios sin publicar." o "La web está al día.".
- Si algo falla, `failPublish()` (bloque 39e).

### 39h. Publicar: el build vigilado ya está en la web

```astro

	// The watched build is live: "Publicado…" once, then the state with the database's latest
	// stamp, so an edit made during the build still shows as pending.
	async function finishWatch(run: number, build: Build, requestedAt: string) {
		try {
			const changedAt = await catalogChangedAt();
			if (run !== publishRun) return;
			watching = false;
			publishStatus.textContent = PUBLISHED;
```

- El comentario: "El build vigilado está en la web: 'Publicado…' una vez, y luego el estado con
  el sello más reciente de la base de datos, así un cambio hecho durante el build sigue saliendo
  como pendiente."
- `await catalogChangedAt()`: vuelve a leer la hora del último cambio. No sirve la del principio:
  el dueño pudo cambiar algo mientras Vercel construía.
- Si sigue siendo la vigilancia actual: deja de vigilar y escribe "Publicado. La web ya muestra
  los cambios." (AC5).

```astro
			const line = stateLine(publishState(build, changedAt, requestedAt));
			publishTimer = window.setTimeout(() => {
				// A product write in the meantime already set its own line.
				if (run === publishRun && publishStatus.textContent === PUBLISHED) publishStatus.textContent = line;
			}, PUBLISHED_MS);
		} catch (error) {
			failPublish(run, error);
		}
	}
```

- `line`: la línea que vendrá después. Con el build nuevo, `publishing` es falso (el build es
  posterior a la petición), así que será "La web está al día." o, si el dueño cambió algo durante
  el build, "Hay cambios sin publicar." (AC7). Nunca "al día" para un catálogo que la web no
  enseña.
- `window.setTimeout(() => { … }, PUBLISHED_MS)`: 5 segundos después
  ([setTimeout](../../../glosario.md#settimeout)), cambia "Publicado…" por esa línea. Se guarda
  en `publishTimer` para que `stopPublish()` pueda cancelarlo.
- La condición: "Una escritura de producto en este tiempo ya puso su propia línea." Solo cambia la
  línea si sigue siendo la misma vigilancia **y** la línea sigue diciendo "Publicado…". Si el
  dueño guardó algo en esos 5 segundos, `markPending()` ya escribió "Hay cambios sin publicar." y
  no hay que pisarlo.

### 39i. Publicar: rendirse a los 10 minutos

```astro

	// No new build after the time limit: the failure message, and the state as the live site
	// shows it. The publish itself is not "still running" any more.
	async function giveUp(run: number) {
		watching = false;
		publishAlert.textContent = PUBLISH_FAILED;
		publishStatus.textContent = '';
```

- El comentario: "Ningún build nuevo después del límite de tiempo: el mensaje de fallo, y el
  estado tal como lo enseña la web. La publicación ya no cuenta como 'en marcha'."
- Pasa cuando el build de Vercel falló (por ejemplo, una variable de entorno mal puesta): Vercel
  sigue sirviendo la web anterior y `/build.json` no cambia nunca.
- Deja de vigilar, pone en rojo "La publicación no terminó. Tus cambios siguen guardados. Vuelve a
  publicar y, si vuelve a pasar, avisa a quien te hizo la web." (AC9) y vacía la línea mientras
  calcula la nueva.

```astro
		try {
			const [build, changedAt] = await Promise.all([readBuild(), catalogChangedAt()]);
			if (run !== publishRun) return;
			publishStatus.textContent = stateLine(publishState(build, changedAt, null));
		} catch (error) {
			if (run === publishRun && isSignedOut(error)) show('sign-in', MESSAGES.signedOut);
		}
	}
```

- Lee otra vez `/build.json` y la hora del último cambio, y calcula el estado pasando `null` como
  última publicación: así `publishing` es falso. Si no, la publicación fallida, posterior al
  build de la web, haría salir "Publicando…" para siempre. El resultado normal: "Hay cambios sin
  publicar." (AC9).
- Si falla: solo se hace algo con una sesión acabada ("Entrar"). Cualquier otro error se ignora:
  el aviso rojo ya está puesto y la línea se queda vacía.

### 39j. Publicar: vigilar el build

```astro

	// Reads /build.json every 15 s until a build newer than the request is live. The limit is
	// counted with performance.now(), never the phone's clock. A failed poll (offline) is skipped.
	function watch(requestedAt: string) {
		stopPublish();
		const run = publishRun;
		const started = performance.now();
		watching = true;
		publishStatus.textContent = PUBLISHING;
```

- El comentario: "Lee `/build.json` cada 15 s hasta que esté en la web un build más nuevo que la
  petición. El límite se cuenta con `performance.now()`, nunca con el reloj del móvil. Una
  pregunta que falla (sin conexión) se salta."
- `watch(requestedAt)`: recibe la hora **del servidor** a la que se pidió la publicación.
- `stopPublish()` y `const run = publishRun;`: solo una vigilancia a la vez.
- `const started = performance.now();`: pone en marcha el cronómetro
  ([performance.now()](../../../glosario.md#performance-now)). Si el dueño tuviera la hora del
  móvil mal puesta, o la cambiara, un cálculo con `Date.now()` daría tiempos absurdos; el
  cronómetro no. Los 10 minutos cuentan desde que **esta** página empezó a vigilar: si el dueño
  recarga, empiezan de nuevo.
- `watching = true;` y "Publicando… La web se actualiza en unos minutos." (AC5).

```astro
		const poll = async () => {
			const build = await readBuild().catch(() => null);
			if (run !== publishRun) return;
```

- `poll`: una pregunta a `/build.json` ([polling](../../../glosario.md#polling)). Es una función
  guardada en una constante para poder programarla una y otra vez.
- `readBuild().catch(() => null)`: si la lectura falla (sin conexión, o un `/build.json` raro), en
  vez de un error da `null` ([promesa-then](../../../glosario.md#promesa-then)). Una pregunta
  fallida no para la vigilancia: la siguiente lo vuelve a intentar.
- Si la vigilancia ya no es la actual (se paró o empezó otra), no hace nada más y no programa
  ninguna pregunta: así se apaga.

```astro
			if (build && Date.parse(build.builtAt) > Date.parse(requestedAt)) return void finishWatch(run, build, requestedAt);
			if (performance.now() - started >= WATCH_LIMIT_MS) return void giveUp(run);
			publishTimer = window.setTimeout(poll, POLL_MS);
		};
		publishTimer = window.setTimeout(poll, POLL_MS);
	}
```

- Primera condición: si llegó un `/build.json` y su `builtAt` es **posterior** a la petición
  ([fecha ISO](../../../glosario.md#fecha-iso)), el build pedido ya está en la web: `finishWatch()`
  (bloque 39h). `return void finishWatch(…)` la lanza sin esperarla y termina `poll` en la misma
  línea ([operador void](../../../glosario.md#operador-void)).
- Segunda: si el cronómetro pasa de 10 minutos, `giveUp()` (bloque 39i).
- Si no, programa la siguiente pregunta dentro de 15 s.
- La última línea, fuera de `poll`: programa la **primera** pregunta, también a los 15 s. No se
  pregunta en el acto porque un build no termina en un segundo.

### 39k. Publicar: el botón

```astro

	// Always usable except while its own request runs: the server's 60 s gap handles repeats.
	publishButton.addEventListener('click', () => {
		publishAlert.textContent = '';
		void whileBusy(publishButton, async () => {
			try {
				watch(await requestPublish());
			} catch (error) {
				if (isSignedOut(error)) return show('sign-in', MESSAGES.signedOut);
				publishAlert.textContent = publishMessage(error);
			}
		});
	});
```

- El comentario: "Siempre se puede usar, salvo mientras corre su propia petición: la pausa de 60 s
  del servidor se encarga de las repeticiones." No se desactiva mientras se vigila: si el dueño
  cambia otro precio durante un build, puede volver a publicar. Si lo hace antes de un minuto,
  la Edge Function contesta "demasiado pronto".
- Al pulsar: borra el error anterior y, con el botón ocupado ("Publicar cambios…",
  `whileBusy()`, bloque 17), llama a `requestPublish()`
  ([`publish.ts.md`](../../lib/publish.ts.md#5-pedir-una-publicación-requestpublish)).
- Si va bien: `watch(…)` con la hora que devolvió el servidor. La línea pasa a "Publicando…".
- Si falla: sesión acabada → "Entrar". Si no, el mensaje en rojo: "Acabas de publicar. Espera un
  minuto…", "Sin conexión…", "Esta cuenta no puede publicar." o "No se pudo publicar…". La
  línea de estado no se toca: lo que decía sigue siendo verdad (AC9).

### 40. Al abrir la página

```astro

	async function start() {
		// The recovery link is read first, before anything else looks at the session.
		const link = readRecoveryLink();
		if (link === 'linkError') return show('recover', MESSAGES.linkError);
		if (!hasSession()) return show('sign-in');
```

- `start()`: decide qué vista enseñar al cargar. Hasta que termina, las cinco siguen escondidas.
- El comentario: "El enlace de recuperación se lee lo primero, antes de que nada mire la sesión."
  Si el dueño llega desde el correo, `readRecoveryLink()` guarda la sesión del enlace; así lo que
  viene después ya la encuentra.
- Enlace gastado o caducado → vista "Recuperar" con "El enlace no es válido o ya caducó. Pide
  otro." (AC7 d de la spec 0014).
- Sin sesión guardada → "Entrar". No se hace ninguna petición.

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
- Si llegó desde el correo → "Nueva contraseña". Si no → "Sesión iniciada", que además carga la
  lista de productos (bloque 16).

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
  mala conexión. La lista intentará cargar igualmente y, sin red, enseñará su propio error con
  "Reintentar".
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
  con Supabase Auth y guarda la sesión en `localStorage`. Los productos los lee y escribe
  [`products.ts`](../../lib/products.ts.md), a través de `authFetch()` de `auth.ts`. Las fotos
  las reduce en el móvil [`photos.ts`](../../lib/photos.ts.md), que también las sube y las borra
  en el bucket cuando `saveProduct()` o `removeProduct()` se lo piden. Publicar lo
  hace [`publish.ts`](../../lib/publish.ts.md): pide la publicación a la
  [Edge Function `publish`](../../../supabase/functions/publish/index.ts.md), lee las tablas de
  [`publish.sql`](../../../supabase/publish.sql.md) y el archivo
  [`/build.json`](../build.json.ts.md) de la propia web.
- **Supabase:** los ajustes del panel (registro cerrado, contraseña mínima de 8, *Redirect URLs*
  con `/admin/`) y la función `is_owner()` están en [`supabase/auth.sql`](../../../supabase/auth.sql.md);
  las políticas que dejan escribir solo al dueño, en
  [`supabase/products-write.sql`](../../../supabase/products-write.sql.md); las que dejan subir
  y borrar fotos solo al dueño, en [`supabase/photos.sql`](../../../supabase/photos.sql.md).
- **La web pública:** lo que se guarda aquí llega a Supabase al instante, pero las páginas de
  clientes cambian en el siguiente build, el que empieza el botón "Publicar cambios" (feature
  13). Un producto sin foto (añadido sin ella, o con "Quitar foto") sale en la tienda con la
  caja [`NoPhoto`](../../components/NoPhoto.astro.md); con foto, el build la descarga del bucket
  y la reduce para las páginas.
- **Peso:** `pnpm check:weight` mide `/admin/` con su propio presupuesto (JS ≤ 15 KB);
  ver [`check-weight.mjs.md`](../../../scripts/check-weight.mjs.md).
- **Aislada:** ninguna página de clientes enlaza aquí, y ninguna otra página tiene `<script>` ni
  la dirección o la clave de Supabase (spec 0014, AC11; spec 0015, AC10).

## Prueba tú

**1. Sin cuenta:** comprueba que el formulario de entrar no manda nada si está incompleto.

1. Ejecuta `pnpm dev` y abre `http://localhost:4321/admin/`. Sin sesión guardada, ves solo la
   tarjeta "Entrar".
2. Abre las herramientas del navegador (F12) → *Elements* y busca los cinco elementos con
   `data-view="…"` (cuatro `<section>` y un `<div>`): el de `sign-in` ya no tiene `hidden` (se lo
   quitó el script) y los otros cuatro sí.
3. Pasa a la pestaña *Network* y pulsa "Entrar" con los dos campos vacíos. **Qué deberías ver:**
   el aviso propio del navegador junto al campo Email (el texto depende del navegador), y
   ninguna petición nueva a `supabase.co`: `reportValidity()` frenó el envío.
4. No hay nada que deshacer: no se ha mandado ni guardado nada.

**2. Con la cuenta del dueño:** comprueba que el formulario de producto tampoco manda nada si
está mal, sin escribir en la base de datos.

1. Entra con el email y la contraseña del dueño. Abre *Network* (F12) y pulsa "Añadir
   producto".
2. Escribe `!!!` en "Nombre", deja lo demás vacío y pulsa "Guardar". **Qué deberías ver:** junto
   al campo "Nombre", el aviso del navegador con "El nombre necesita al menos una letra o un
   número.", y ninguna petición nueva a `supabase.co` (bloque 35).
3. Escribe una letra más en "Nombre": su aviso se borra (bloque 36). Pulsa "Guardar" otra vez:
   ahora el aviso sale junto a "Categoría", el primer campo que sigue mal, y tampoco hay
   ninguna petición nueva.
4. Pulsa "Cancelar". No hay nada que deshacer: no se mandó ninguna petición de escritura.

**3. Elegir una foto sin guardarla:** comprueba que la foto se prepara en el móvil y que no se
manda nada hasta "Guardar".

1. Con `pnpm dev` en marcha y la sesión del dueño abierta, abre F12 → *Network* y pulsa "Añadir
   producto". El bloque "Foto" enseña la caja "Sin foto" y el botón "Añadir foto".
2. Pulsa "Añadir foto" y elige cualquier foto de tu ordenador. **Qué deberías ver:** un momento
   "Preparando foto…", y luego la foto en cuadrado, el botón "Cambiar foto", el enlace "Quitar
   foto" y la línea "La foto nueva se subirá al guardar." (bloque 26d). En *Network*, ninguna
   petición nueva a `supabase.co`: la foto solo está en la memoria de la pestaña.
3. Pulsa "Quitar foto". **Qué deberías ver:** vuelve la caja "Sin foto", y la línea de estado
   desaparece (al añadir no hay nada guardado que quitar, bloque 26e).
4. Pulsa "Cancelar". No hay nada que deshacer: no se mandó ninguna petición de escritura.

**4. La tarjeta "Publicar", sin publicar nada:** mira las tres lecturas que hace al abrir la
vista.

1. Con `pnpm dev` en marcha y la sesión del dueño abierta, abre F12 → *Network* y recarga
   `http://localhost:4321/admin/`.
2. **Qué deberías ver:** entre las peticiones, `build.json` (a `localhost`), `catalog_state` y
   `publishes` (a `supabase.co`), que salen casi a la vez (bloque 39g). La tarjeta dice un
   momento "Comprobando…" y luego "La web está al día." o "Hay cambios sin publicar.", pero
   nunca "Publicando…": en `pnpm dev`, `/build.json` se calcula en cada petición con la hora de
   ese momento, así que una publicación siempre parece terminada
   ([`build.json.ts.md`](../build.json.ts.md)). El estado de verdad se ve en la web publicada.
3. Haz clic en la petición `build.json` → *Response*: verás `builtAt` y `catalogChangedAt`.
4. **No pulses "Publicar cambios"** en esta prueba: aunque estés en tu PC, la Edge Function es la
   de verdad y lanzaría un despliegue real en Vercel. No hay nada que deshacer: solo se ha leído.

## Términos

- [polling](../../../glosario.md#polling) · [settimeout](../../../glosario.md#settimeout) ·
  [performance-now](../../../glosario.md#performance-now) · [fecha-iso](../../../glosario.md#fecha-iso) ·
  [promesa-then](../../../glosario.md#promesa-then) · [edge-function](../../../glosario.md#edge-function) ·
  [despliegue](../../../glosario.md#despliegue) · [endpoint](../../../glosario.md#endpoint) (nuevos,
  spec 0016)
- [url-de-objeto](../../../glosario.md#url-de-objeto) · [input-file](../../../glosario.md#input-file) ·
  [variante-peer](../../../glosario.md#variante-peer) · [blob](../../../glosario.md#blob) (nuevos,
  spec 0017) · [imagen-decorativa](../../../glosario.md#imagen-decorativa) ·
  [outline](../../../glosario.md#outline) · [unidades-tailwind](../../../glosario.md#unidades-tailwind)
- [template-html](../../../glosario.md#template-html) ·
  [textcontent-e-innerhtml](../../../glosario.md#textcontent-e-innerhtml) ·
  [setcustomvalidity](../../../glosario.md#setcustomvalidity) ·
  [delegacion-de-eventos](../../../glosario.md#delegacion-de-eventos) ·
  [tabindex-menos-uno](../../../glosario.md#tabindex-menos-uno) ·
  [aria-describedby](../../../glosario.md#aria-describedby) (nuevos)
- [script-en-astro](../../../glosario.md#script-en-astro) ·
  [atributo-data](../../../glosario.md#atributo-data) ·
  [atributo-hidden](../../../glosario.md#atributo-hidden) ·
  [validacion-de-formularios](../../../glosario.md#validacion-de-formularios) ·
  [autocomplete](../../../glosario.md#autocomplete) · [noscript](../../../glosario.md#noscript) ·
  [role-alert-status](../../../glosario.md#role-alert-status) · [sr-only](../../../glosario.md#sr-only)
- [afirmacion-no-nulo](../../../glosario.md#afirmacion-no-nulo) ·
  [alias-de-tipo](../../../glosario.md#alias-de-tipo) ·
  [record-y-unknown](../../../glosario.md#record-y-unknown) ·
  [instanceof](../../../glosario.md#instanceof) · [finally](../../../glosario.md#finally) ·
  [operador-void](../../../glosario.md#operador-void) · [union](../../../glosario.md#union) ·
  [set](../../../glosario.md#set) · [promise-all](../../../glosario.md#promise-all)
- [app-metadata](../../../glosario.md#app-metadata) · [sesion](../../../glosario.md#sesion) ·
  [supabase-auth](../../../glosario.md#supabase-auth) ·
  [clave-publishable](../../../glosario.md#clave-publishable) · [rls](../../../glosario.md#rls) ·
  [politica](../../../glosario.md#politica)
- [frontmatter](../../../glosario.md#frontmatter) · [layout](../../../glosario.md#layout) ·
  [ruta-por-archivo](../../../glosario.md#ruta-por-archivo) · [noindex](../../../glosario.md#noindex) ·
  [comentario-en-plantilla](../../../glosario.md#comentario-en-plantilla) ·
  [variante](../../../glosario.md#variante) · [area-tactil](../../../glosario.md#area-tactil) ·
  [aria-hidden](../../../glosario.md#aria-hidden) · [flex-wrap](../../../glosario.md#flex-wrap) ·
  [token](../../../glosario.md#token) ·
  [jerarquia-de-titulos](../../../glosario.md#jerarquia-de-titulos)
- [desestructuracion](../../../glosario.md#desestructuracion) ·
  [template-literal](../../../glosario.md#template-literal) ·
  [import-type](../../../glosario.md#import-type) · [generico](../../../glosario.md#generico) ·
  [afirmacion-de-tipo](../../../glosario.md#afirmacion-de-tipo) ·
  [encadenamiento-opcional](../../../glosario.md#encadenamiento-opcional) ·
  [nullish](../../../glosario.md#nullish) · [spread](../../../glosario.md#spread) ·
  [typecheck](../../../glosario.md#typecheck)
