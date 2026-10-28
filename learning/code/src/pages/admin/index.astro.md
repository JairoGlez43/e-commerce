# `src/pages/admin/index.astro`

> **Qué es:** la página de administración del dueño, `/admin/`: entrar, recuperar la contraseña,
> cerrar sesión y gestionar los productos (listar, añadir, editar, borrar y cambiar la
> disponibilidad) · **Lo decidió:** [spec 0014](../../../../../docs/specs/0014-owner-login.md)
> (Design → `src/pages/admin/index.astro`) y
> [spec 0015](../../../../../docs/specs/0015-manage-products.md) (Design →
> `src/pages/admin/index.astro`), con la regla de la
> [spec 0012](../../../../../docs/specs/0012-admin-backend.md) de que `/admin/` es la única ruta
> con JavaScript · **Lo usan:** nadie lo importa; es una página propia por
> [ruta por archivo](../../../glosario.md#ruta-por-archivo). Ninguna página de clientes enlaza
> aquí · **Usa:** `BaseLayout`, `site` de `src/lib/site.ts`, `supabaseConfig()` de
> [`src/lib/supabase.ts`](../../lib/supabase.ts.md) (en el build), y en el navegador
> [`src/lib/auth.ts`](../../lib/auth.ts.md), [`src/lib/products.ts`](../../lib/products.ts.md)
> y `formatPrice()` de [`src/lib/price.ts`](../../lib/price.ts.md)

## Para qué sirve

Es la administración del catálogo: hoy, el login (spec 0014) y los productos (spec 0015, feature
12); las features 13–15 añadirán publicar, las fotos y las categorías. Enseña una de cinco
**vistas**, según el momento:

| Vista | Cuándo sale |
|---|---|
| Entrar (`sign-in`) | no hay sesión, o la sesión se acabó |
| Recuperar la contraseña (`recover`) | el dueño pulsa "¿Olvidaste tu contraseña?", o el enlace del correo no vale |
| Nueva contraseña (`new-password`) | el dueño llega desde el enlace del correo |
| Sesión iniciada (`signed-in`) | el dueño ya entró: su cuenta y la lista de productos |
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
   [`auth.ts`](../../lib/auth.ts.md) y la de productos en
   [`products.ts`](../../lib/products.ts.md); el script solo lee formularios, cambia de vista,
   dibuja la lista y pone mensajes en español.

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

- Desde la spec 0015, esta vista ya no es una sola tarjeta sino un `<div>` con **dos**: la de
  la cuenta (este bloque) y la de los productos (bloque 8). `data-view="signed-in"` y `hidden`
  van en el `<div>`, así que el script las enseña o esconde juntas.
  `flex flex-col gap-6`: las dos tarjetas en columna, a 24 px.
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
  hasta publicar (feature 13).

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
	// The admin's views (specs 0014, 0015). Every Auth rule lives in src/lib/auth.ts and every
	// product rule in src/lib/products.ts; this script only reads the forms, shows one view at a
	// time, draws the list and turns errors into Spanish messages.
```

- `<script>`: sin ningún atributo, así que Astro lo **procesa**: entiende TypeScript y los
  `import`, lo junta con `auth.ts`, `products.ts` y `price.ts` en un solo archivo de
  `dist/_astro/` y escribe en la página un `<script type="module" src="/_astro/….js">`
  ([script en Astro](../../../glosario.md#script-en-astro)). En el build del 2026-10-27, con la
  feature 12 ya hecha, ese archivo pesaba 5,2 KB comprimido con gzip, medido como lo mide
  `pnpm check:weight`: lejos del límite de 15 KB de esta página.
- El comentario: "Las vistas de la administración (specs 0014, 0015). Todas las reglas de Auth
  viven en `src/lib/auth.ts` y todas las de productos en `src/lib/products.ts`; este script solo
  lee los formularios, enseña una vista cada vez, dibuja la lista y convierte los errores en
  mensajes en español."

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
	import { formatPrice } from '../../lib/price';
	import {
		ProductError,
		type FieldName,
		type ProductErrorKind,
		type ProductFields,
		addProduct,
		changedFields,
		checkFields,
		deleteProduct,
		groupProducts,
		listCategories,
		listProducts,
		setStock,
		updateProduct,
	} from '../../lib/products';
	import type { CategoryRow, ProductRow } from '../../lib/supabase';
```

- `formatPrice`: el mismo formato de precio que la tienda, `280 CUP`
  ([`price.ts.md`](../../lib/price.ts.md)).
- De [`products.ts`](../../lib/products.ts.md): la clase `ProductError`, tres tipos y las
  funciones de productos (leer, añadir, cambiar, borrar, revisar el formulario y agrupar la
  lista). Cada una está explicada allí.
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
		unknown: 'Algo salió mal. Inténtalo otra vez.',
	};
```

- `PRODUCT_MESSAGES`: lo mismo para cada tipo de `ProductError`, con los textos de la tabla de
  errores de la spec 0015. También es un `Record`, así que no puede faltar ninguno.

```astro
	// These errors mean the loaded list is out of date, so it loads again.
	const RELOAD_KINDS = new Set<ProductErrorKind>(['exists', 'noCategory', 'gone']);
	const LOADING = 'Cargando productos…';
	const SAVED = 'Producto guardado.';
	const DELETED = 'Producto borrado.';
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
- El comentario: "La longitud mínima de contraseña del proyecto, configurada en el panel de
  Supabase (spec 0014)." Tiene que coincidir con ese ajuste y con el `minlength="8"` del HTML.

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

	// Opening the signed-in view always loads the products (spec 0015).
	function showSignedIn(user: AuthUser, status = '', alert = '') {
		root.querySelector('[data-email]')!.textContent = user.email;
		root.querySelector('[data-status]')!.textContent = status;
		show('signed-in', alert);
		void loadCatalog();
	}
```

- El comentario: "Abrir la vista de sesión iniciada siempre carga los productos (spec 0015)."
- `showSignedIn()`: rellena el email y el aviso (`status`, por ejemplo "Contraseña cambiada."),
  enseña la vista con un error opcional y lanza `loadCatalog()` (bloque 30) sin esperarla
  ([operador void](../../../glosario.md#operador-void)): la vista sale en seguida con
  "Cargando productos…" y la lista llega cuando contesta Supabase.

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
  contraseña", "Cerrar sesión", "Guardar" y "Sí, borrar".

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

	function field(name: FieldName) {
		return productForm.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
	}
```

- Una constante por cada pieza del HTML que el script toca, buscadas una vez al cargar: los
  mensajes y el botón "Reintentar" de la lista, la lista, el formulario de producto con su zona
  de errores, su botón "Guardar" y su casilla `in_stock`, el título y el enlace del formulario, y
  las piezas de borrar. `form('product')` es el formulario de la vista `product` (bloque 14).
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
		for (const name of FIELD_NAMES) field(name).setCustomValidity('');
		fillCategories(product?.category_id ?? '');
		productTitle.textContent = product ? 'Editar producto' : 'Añadir producto';
		productLink.textContent = product ? `Enlace: /producto/${product.id}` : '';
```

- `openForm(product)`: con un producto, el formulario para editarlo; con `null`, uno vacío para
  añadir (AC3, AC4).
- `productForm.reset()`: vuelve a dejar los campos como en el HTML: vacíos y "Disponible"
  marcado.
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

	async function save(fields: ProductFields) {
		try {
			if (editing) {
				const changes = changedFields(editing, fields);
				putProduct(Object.keys(changes).length > 0 ? await updateProduct(editing.id, changes) : editing);
			} else {
				putProduct(await addProduct(fields, products.map((product) => product.id)));
			}
			showList(SAVED);
		} catch (error) {
			failForm(error);
		}
	}
```

- `save(fields)`: recibe los campos ya revisados.
- Si se está editando: `changedFields()` calcula qué cambió
  ([`products.ts.md`](../../lib/products.ts.md#8-solo-lo-que-cambió-changedfields)). Si cambió
  algo, `updateProduct()` manda un `PATCH` con solo eso y `putProduct` guarda la fila que
  devuelve Supabase; si no cambió nada, no se manda ninguna petición y se usa el producto tal
  cual.
- Si se está añadiendo: `addProduct()` con los ids de todos los productos cargados, para que el
  id nuevo no choque con ninguno (`-2`, `-3`…).
- Si va bien: vuelta a la lista con "Producto guardado.". Si falla: `failForm()`.

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
				await deleteProduct(product.id);
				products = products.filter((item) => item.id !== product.id);
				showList(DELETED);
			} catch (error) {
				failForm(error);
			}
		});
	});
```

- "Sí, borrar": `const product = editing;` guarda el producto en una constante antes de esperar
  a la red, por si `editing` cambiara mientras tanto.
- Con el botón ocupado, `deleteProduct(product.id)`. Si va bien, lo quita de `products` y vuelve
  a la lista con "Producto borrado.". Si falla, `failForm()` (bloque 33).

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
  casilla ya enseña el valor correcto.
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
  [`products.ts`](../../lib/products.ts.md), a través de `authFetch()` de `auth.ts`.
- **Supabase:** los ajustes del panel (registro cerrado, contraseña mínima de 8, *Redirect URLs*
  con `/admin/`) y la función `is_owner()` están en [`supabase/auth.sql`](../../../supabase/auth.sql.md);
  las políticas que dejan escribir solo al dueño, en
  [`supabase/products-write.sql`](../../../supabase/products-write.sql.md).
- **La web pública:** lo que se guarda aquí llega a Supabase al instante, pero las páginas de
  clientes cambian en el siguiente build (feature 13). Un producto añadido aquí no tiene foto, y
  la tienda le pone la caja [`NoPhoto`](../../components/NoPhoto.astro.md).
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

## Términos

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
