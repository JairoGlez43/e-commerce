# `src/components/ShopInfo.astro`

> **Qué es:** el bloque "Cómo comprar" con sus 3 pasos, más dos recuadros: "Recogida y entrega" y "Horario y ubicación" · **Lo decidió:** [spec 0010](../../../../docs/specs/0010-shop-information.md) (AC4 y Design → ShopInfo) y [`design.md`](../../../../design.md) (ShopInfo, Info block) · **Lo usan:** [`src/pages/index.astro`](../pages/index.astro.md) (debajo de los productos) y [`src/pages/estilo.astro`](../pages/estilo.astro.md) (como muestra) · **Usa:** [`src/lib/site.ts`](../lib/site.ts.md) (`howToBuy`, `pickup`, `delivery`, `hours`, `location`) y los tokens de [`src/styles/global.css`](../styles/global.css.md)

## Para qué sirve

Responde en la propia web las preguntas que hoy los clientes hacen al dueño por privado: cómo
se pide, si hay que recoger o lo llevan a casa, a qué hora abren y dónde están. Va en la
portada, después de la última categoría. No recibe [props](../../glosario.md#props): todos los
textos los lee de `src/lib/site.ts`, así que adaptar la demo a otra tienda no toca este
archivo (AC1 de la spec 0010).

## El código, por partes

```astro
---
import { site } from '../lib/site';

// "Cómo comprar" plus pickup/delivery and hours/location, below the products on / (spec 0010).
---
```

- `---` abre y cierra el [frontmatter](../../glosario.md#frontmatter), el código que corre en
  el [build](../../glosario.md#build).
- `import { site } from '../lib/site';` trae el objeto `site` con toda la información de la
  tienda ([explicación](../lib/site.ts.md)).
- El comentario: "«Cómo comprar» más recogida/entrega y horario/ubicación, debajo de los
  productos en `/` (spec 0010)."
- No hay `interface Props`: el componente no recibe nada, igual que
  [`SiteHeader`](SiteHeader.astro.md).

```astro

<section aria-labelledby="como-comprar" class="flex flex-col gap-4">
	<h2 id="como-comprar">Cómo comprar</h2>
```

- `<section ... class="flex flex-col gap-4">`: una sección en columna con 16 px entre sus
  partes, la misma forma que las secciones de categoría de la portada.
- `aria-labelledby="como-comprar"` le da a la sección el nombre del elemento con
  `id="como-comprar"`, el `h2` de la línea siguiente ([aria-label](../../glosario.md#aria-label)).
  El lector de pantalla la anuncia como "región Cómo comprar".
- `<h2 id="como-comprar">Cómo comprar</h2>`: el título. Es `h2` porque en la portada cuelga
  del `h1` "Productos", al mismo nivel que los títulos de categoría
  ([jerarquía de títulos](../../glosario.md#jerarquia-de-titulos)). Su estilo (Fraunces, 24 px)
  sale de la capa base de `global.css`. El `id` va sin tilde ni espacios porque es un
  identificador, no texto visible.

```astro
	<ol class="flex flex-col gap-2">
		{
			site.howToBuy.map((step, index) => (
				<li class="flex items-center gap-3">
					<span
						class="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-medium text-surface"
						aria-hidden="true"
					>
						{index + 1}
					</span>
					{step}
				</li>
			))
		}
	</ol>
```

- `<ol class="flex flex-col gap-2">`: una lista **ordenada**, porque los pasos van en orden; es
  la lista la que le dice al lector de pantalla que son pasos numerados (según la spec). El
  reset de Tailwind ([preflight](../../glosario.md#preflight)) le quita los números que pinta el
  navegador; en su lugar se dibujan los círculos de abajo. `flex flex-col gap-2`: en columna,
  8 px entre pasos.
- `{ site.howToBuy.map((step, index) => ( ... )) }`: un `<li>` por cada texto de
  `site.howToBuy` ([map](../../glosario.md#array-map),
  [expresión en plantilla](../../glosario.md#expresion-en-plantilla)). `step` es el texto del
  paso e `index` su posición: 0, 1, 2.
- `<li class="flex items-center gap-3">`: el círculo y el texto en fila, centrados en vertical
  (`items-center`), con 12 px entre ellos.
- `<span ...>{index + 1}</span>`: el círculo con el número. `index + 1` porque las posiciones
  empiezan en 0 y los pasos se cuentan desde 1. Las clases:
  - `inline-flex items-center justify-center`: una caja que centra el número en horizontal y
    en vertical.
  - `size-7`: ancho y alto de 28 px ([unidades](../../glosario.md#unidades-tailwind)).
  - `shrink-0` = `flex-shrink: 0`: si el texto del paso es largo, el círculo no se encoge.
  - `rounded-full`: bordes totalmente redondos; con ancho igual al alto, un círculo.
  - `bg-accent text-surface font-medium`: fondo rojo, número blanco, peso 500.
- `aria-hidden="true"` oculta el número dibujado al lector de pantalla
  ([aria-hidden](../../glosario.md#aria-hidden)): es un dibujo, y la posición ya la da el
  `<ol>`.
- `{step}`: el texto del paso, por ejemplo `Elige lo que quieres en el catálogo.`.
- `</li>`, `))`, `}`, `</ol>`: cierran el elemento, el `map`, la expresión y la lista.

```astro
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
			<h3>Recogida y entrega</h3>
			<p>{site.pickup}</p>
			<p>{site.delivery}</p>
		</div>
```

- `<div class="grid gap-4 sm:grid-cols-2">`: una rejilla (`display: grid`) con 16 px entre
  celdas. Sin más clases tiene una columna: en el móvil, un recuadro debajo del otro. Desde
  640 px ([variante](../../glosario.md#variante) `sm:`), dos columnas iguales: lado a lado
  (AC4).
- `<div class="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">`: el
  primer recuadro (en `design.md` se llama **Info block**). Las clases:
  - `flex flex-col gap-2`: título y líneas en columna, 8 px entre ellos.
  - `rounded-card`: las esquinas redondeadas del [token](../../glosario.md#token) `card`, las
    mismas que la tarjeta de producto.
  - `border border-border`: borde de 1 px en el beige `border`.
  - `bg-surface`: fondo blanco. En la portada va sobre la banda de color `awning` (spec 0011),
    así que destaca como una tarjeta blanca.
  - `p-4`: 16 px de relleno por dentro.
  - No lleva sombra (`shadow-card`), a diferencia de la tarjeta de producto: no se puede tocar,
    y así no parece un botón (`design.md`).
- `<h3>Recogida y entrega</h3>`: subtítulo, un nivel por debajo del `h2` "Cómo comprar". Su
  estilo (Fraunces, 20 px) sale de la capa base de `global.css`.
- `<p>{site.pickup}</p>`: `Recoge tu pedido en la tienda, sin costo adicional.`
- `<p>{site.delivery}</p>`: `Por ahora no hacemos entregas a domicilio.` (la demo ofrece solo
  recogida, elección del dueño en la spec 0010).
- `</div>`: cierra el primer recuadro.

```astro
		<div class="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
			<h3>Horario y ubicación</h3>
			<ul>
				{
					site.hours.map(({ days, time }) => (
						<li>
							{days}: {time}
						</li>
					))
				}
			</ul>
			<p>{site.location}</p>
		</div>
	</div>
</section>
```

- El segundo recuadro, con las mismas clases que el primero.
- `<h3>Horario y ubicación</h3>`: su subtítulo.
- `<ul>`: el horario como lista sin orden. El reset de Tailwind le quita las viñetas, así que
  se ve como dos líneas de texto.
- `site.hours.map(({ days, time }) => ( ... ))`: un `<li>` por cada línea de horario. Los dos
  campos de cada objeto se sacan al recibirlos
  ([desestructuración](../../glosario.md#desestructuracion)).
- `{days}: {time}`: escribe, por ejemplo, `Lunes a sábado: 9:00 a.m. – 6:00 p.m.`. Los dos
  puntos y el espacio son texto normal entre las dos expresiones.
- `<p>{site.location}</p>`: `Municipio, Provincia`, el texto de relleno de la demo. Nunca una calle (spec 0009).
- `</div>`, `</div>`, `</section>`: cierran el segundo recuadro, la rejilla y la sección.

## Cómo se conecta

- **Entra:** los campos `howToBuy`, `pickup`, `delivery`, `hours` y `location` de
  [`src/lib/site.ts`](../lib/site.ts.md). No recibe props.
- **Sale:** se usa como `<ShopInfo />` al final del `<main>` de
  [`src/pages/index.astro`](../pages/index.astro.md), dentro de la banda de información a todo
  el ancho (spec 0011), después de la última categoría y antes de [`<Faq />`](Faq.astro.md). [`/estilo`](../pages/estilo.astro.md) lo muestra tal cual, con los
  mismos datos.
- El horario y la ubicación salen también en el pie de página,
  [`SiteFooter`](SiteFooter.astro.md), leídos del mismo `site.hours` y `site.location`:
  cambiarlos en `site.ts` cambia los dos sitios a la vez.

## Prueba tú

Añade un cuarto paso y mira cómo aparece su círculo con el número.

1. `pnpm dev` y abre `http://localhost:4321/`. Baja hasta "Cómo comprar": hay 3 pasos.
2. En `src/lib/site.ts`, dentro de `howToBuy`, añade una línea después del tercer paso:
   `'Paga al recoger.',` y guarda.
3. **Qué verás:** un cuarto paso con un círculo rojo que dice `4`, sin tocar este componente.
4. **Deshacer:** borra esa línea de `site.ts` y guarda.

## Términos

- [props](../../glosario.md#props) · [frontmatter](../../glosario.md#frontmatter) ·
  [build](../../glosario.md#build)
- [aria-label](../../glosario.md#aria-label) · [aria-hidden](../../glosario.md#aria-hidden) ·
  [jerarquia-de-titulos](../../glosario.md#jerarquia-de-titulos)
- [array-map](../../glosario.md#array-map) *(nuevo)* ·
  [expresion-en-plantilla](../../glosario.md#expresion-en-plantilla) ·
  [desestructuracion](../../glosario.md#desestructuracion)
- [tailwind](../../glosario.md#tailwind) · [preflight](../../glosario.md#preflight) ·
  [unidades-tailwind](../../glosario.md#unidades-tailwind) · [variante](../../glosario.md#variante) ·
  [token](../../glosario.md#token)
