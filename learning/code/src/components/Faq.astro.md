# `src/components/Faq.astro`

> **Qué es:** la sección "Preguntas frecuentes": 5 preguntas que se abren y se cierran al tocarlas, sin JavaScript · **Lo decidió:** [spec 0010](../../../../docs/specs/0010-shop-information.md) (AC5 y Design → Faq) y [`design.md`](../../../../design.md) (Faq) · **Lo usan:** [`src/pages/index.astro`](../pages/index.astro.md) (al final de la portada) y [`src/pages/estilo.astro`](../pages/estilo.astro.md) (como muestra) · **Usa:** `site.faq` de [`src/lib/site.ts`](../lib/site.ts.md) y los tokens de [`src/styles/global.css`](../styles/global.css.md)

## Para qué sirve

Junta las dudas que más se repiten (si los precios están al día, cómo pedir, cómo pagar, si hay
entregas, qué hacer si algo está agotado) con su respuesta. Para que la portada no se alargue,
cada respuesta está plegada y solo se ve la pregunta; el cliente toca la que le interesa. El
plegado lo hace el propio HTML con [`<details>`](../../glosario.md#details-summary), así que no
añade ni un byte de JavaScript (regla del proyecto: conexiones lentas en Cuba).

## El código, por partes

```astro
---
import { site } from '../lib/site';

// Frequently asked questions on / (spec 0010). Native <details>: opens and closes with no JS.
---
```

- `---` abre y cierra el [frontmatter](../../glosario.md#frontmatter).
- `import { site } from '../lib/site';` trae el objeto `site`; de él solo se usa `site.faq`, la
  lista de preguntas y respuestas ([explicación](../lib/site.ts.md)).
- El comentario: "Preguntas frecuentes en `/` (spec 0010). `<details>` nativo: se abre y se
  cierra sin JS."
- No recibe [props](../../glosario.md#props).

```astro

<section aria-labelledby="preguntas" class="flex flex-col gap-4">
	<h2 id="preguntas">Preguntas frecuentes</h2>
	<div class="flex flex-col gap-2">
```

- `<section aria-labelledby="preguntas" class="flex flex-col gap-4">`: la sección, en columna
  con 16 px entre el título y las preguntas. [`aria-labelledby`](../../glosario.md#aria-label)
  le da el nombre del `h2` con `id="preguntas"`.
- `<h2 id="preguntas">Preguntas frecuentes</h2>`: el título, al mismo nivel que "Cómo comprar"
  ([jerarquía de títulos](../../glosario.md#jerarquia-de-titulos)).
- `<div class="flex flex-col gap-2">`: agrupa las 5 preguntas en columna, con 8 px entre ellas.
  Así quedan más juntas entre sí que con el título.

```astro
		{
			site.faq.map(({ question, answer }) => (
				<details class="rounded-card border border-border bg-surface">
```

- `site.faq.map(({ question, answer }) => ( ... ))`: un bloque por cada pregunta de
  `site.faq` ([map](../../glosario.md#array-map)). Los dos campos de cada objeto se sacan al
  recibirlos ([desestructuración](../../glosario.md#desestructuracion)).
- `<details class="rounded-card border border-border bg-surface">`: el bloque plegable
  ([details-summary](../../glosario.md#details-summary)). Sin el atributo `open`, empieza
  cerrado (lo pide el AC5). Tiene el aspecto de recuadro del proyecto: esquinas
  `rounded-card`, borde beige de 1 px, fondo blanco.
- No hay atributo `name`: cada pregunta se abre por su cuenta, y abrir una no cierra las demás
  (según la spec).

```astro
					<summary class="min-h-11 cursor-pointer px-4 py-3 font-medium">{question}</summary>
```

- `<summary>`: la parte que siempre se ve y que se toca para abrir o cerrar. Su texto es la
  pregunta, `{question}`. El triangulito de delante lo pone el navegador.
- Las clases:
  - `min-h-11` = `min-height: 2.75rem` (44 px): el [área táctil](../../glosario.md#area-tactil)
    mínima (AC5). Aquí basta con `min-h-11` sola: un `<summary>` no es un elemento en línea
    como un `<a>`, así que el navegador sí le aplica la altura mínima.
  - `cursor-pointer`: en el ordenador, el ratón se convierte en la manita de los enlaces al
    pasar por encima, para que se note que se puede pulsar.
  - `px-4`: 16 px a los lados. `py-3`: 12 px arriba y abajo, que es lo que separa el texto de
    los bordes del recuadro.
  - `font-medium`: peso 500, para distinguir la pregunta de la respuesta.
- **Historia:** la spec 0010 pedía
  `flex min-h-11 cursor-pointer items-center px-4 font-medium`, el mismo truco de
  `inline-flex … items-center` que usan los enlaces (ver
  [`SiteHeader.astro.md`](SiteHeader.astro.md)). Pero en una captura de Chromium (el motor de
  Chrome) el triangulito había **desaparecido**: el navegador solo lo pinta mientras el
  `<summary>` conserva su `display` de fábrica, y `flex` lo cambia. Por eso se quitaron `flex`
  e `items-center` y se añadió `py-3`, que da el aire de arriba y abajo. `design.md` ya recoge
  la versión corregida y avisa: nunca `flex` en un `<summary>`.

```astro
					<p class="px-4 pb-4">{answer}</p>
				</details>
			))
		}
	</div>
</section>
```

- `<p class="px-4 pb-4">{answer}</p>`: la respuesta, el resto del contenido del `<details>`:
  solo se ve cuando está abierto. `px-4` la alinea con la pregunta (16 px a los lados) y
  `pb-4` deja 16 px abajo. No necesita relleno arriba: el `py-3` del `<summary>` ya lo separa.
- `</details>`, `))`, `}`, `</div>`, `</section>`: cierran el bloque, el `map`, la expresión, el
  grupo y la sección.

## Cómo se conecta

- **Entra:** `site.faq` de [`src/lib/site.ts`](../lib/site.ts.md): 5 objetos
  `{ question, answer }`. No recibe props.
- **Sale:** se usa como `<Faq />`, lo último dentro del `<main>` de
  [`src/pages/index.astro`](../pages/index.astro.md), justo después de
  [`<ShopInfo />`](ShopInfo.astro.md). [`/estilo`](../pages/estilo.astro.md) lo muestra tal
  cual.
- La primera respuesta dice "Arriba ves la fecha de la última actualización": se refiere a la
  línea "Actualizado el …" de la portada, que calcula [`src/lib/date.ts`](../lib/date.ts.md).

## Prueba tú

Comprueba por qué no se usó `flex` en el `<summary>`. Hazlo en Chrome o Edge (los dos usan
Chromium, donde se vio el problema).

1. `pnpm dev` y abre `http://localhost:4321/`. Baja hasta "Preguntas frecuentes": cada pregunta
   lleva un triangulito delante. Toca una: se abre y se ve la respuesta.
2. En `src/components/Faq.astro`, en el `class` del `<summary>`, añade ` flex items-center`
   al final y guarda.
3. **Qué verás:** los triangulitos desaparecen. Las preguntas se siguen abriendo al tocarlas,
   pero ya no hay ninguna pista visual de que se puedan abrir.
4. **Deshacer:** deja el `class` exactamente así y guarda:
   `min-h-11 cursor-pointer px-4 py-3 font-medium`.

## Términos

- [details-summary](../../glosario.md#details-summary) *(nuevo)* ·
  [area-tactil](../../glosario.md#area-tactil)
- [frontmatter](../../glosario.md#frontmatter) · [props](../../glosario.md#props)
- [array-map](../../glosario.md#array-map) · [desestructuracion](../../glosario.md#desestructuracion)
- [aria-label](../../glosario.md#aria-label) · [jerarquia-de-titulos](../../glosario.md#jerarquia-de-titulos)
