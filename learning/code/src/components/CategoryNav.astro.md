# `src/components/CategoryNav.astro`

> **Qué es:** la fila de chips de categorías ("Todos", "Cárnicos", "Bebidas"…) que filtra el catálogo · **Lo decidió:** [spec 0005](../../../../docs/specs/0005-catalog-page.md) (AC4, AC6 y Design → Components → CategoryNav) sobre el patrón Category chip de [spec 0002](../../../../docs/specs/0002-design-base.md) y [`design.md`](../../../../design.md) · **Lo usan:** [`src/pages/index.astro`](../pages/index.astro.md) y [`src/pages/categoria/[id].astro`](../pages/categoria/[id].astro.md) · **Usa:** el tipo `CatalogSection` de [`src/lib/catalog.ts`](../lib/catalog.ts.md) y los tokens de [`src/styles/global.css`](../styles/global.css.md)

## Para qué sirve

Muestra una fila de "chips" (botoncitos redondeados) con las categorías. Cada chip es un
**enlace normal** a otra página: "Todos" lleva a `/` y cada categoría a `/categoria/<id>`. No
hay JavaScript: filtrar es simplemente ir a otra página ya construida (decisión de la spec
0005). El chip de la página donde estás se pinta en rojo y se marca para el lector de
pantalla.

## El código, por partes

```astro
---
import type { CatalogSection } from '../lib/catalog';
```

- `---` abre el [frontmatter](../../glosario.md#frontmatter).
- `import type { CatalogSection } from '../lib/catalog';` es un
  [import type](../../glosario.md#import-type): trae solo el [tipo](../../glosario.md#tipo)
  `CatalogSection` de [`src/lib/catalog.ts`](../lib/catalog.ts.md), no código. Ese tipo
  describe cada elemento que devuelve `getCatalog()`: un objeto `{ category, products }` con una
  categoría y sus productos.

```astro

interface Props {
	categories: CatalogSection[];
	/** Id of the category page being shown, or null on the home page ("Todos"). */
	currentId: string | null;
}
```

- La [interface](../../glosario.md#interface) `Props` declara las dos
  [props](../../glosario.md#props) que recibe el componente.
- `categories: CatalogSection[];` una lista de secciones del catálogo (los `[]` significan
  "lista de"). Es exactamente lo que devuelve `getCatalog()`, que ya viene ordenado por `order`
  y sin categorías vacías. Por eso aquí no se ordena ni se filtra nada.
- `/** Id of the category page being shown, or null on the home page ("Todos"). */` es un
  [comentario JSDoc](../../glosario.md#jsdoc): "Id de la página de categoría que se está
  mostrando, o `null` en la portada ('Todos')".
- `currentId: string | null;` una [unión](../../glosario.md#union): o un texto (como
  `'carnicos'`) o `null`. Indica qué chip debe salir seleccionado.

```astro

const { categories, currentId } = Astro.props;
```

- Saca las dos props de [`Astro.props`](../../glosario.md#astro-props) con
  [desestructuración](../../glosario.md#desestructuracion).

```astro

const chips = [
	{ id: null, name: 'Todos', href: '/' },
```

- `const chips = [` empieza la lista de chips que se van a pintar. Cada chip es un objeto con
  tres campos: `id` (para saber si es el actual), `name` (el texto visible) y `href` (a dónde
  lleva).
- `{ id: null, name: 'Todos', href: '/' },` el primer chip, siempre "Todos", que lleva a la
  portada. Su `id` es `null`, el mismo valor que la portada pasa como `currentId`: así, en la
  portada, "Todos" sale seleccionado.

```astro
	...categories.map(({ category }) => ({
		id: category.id,
		name: category.data.name,
		href: `/categoria/${category.id}`,
	})),
];
---
```

- `...categories.map(…)` crea un chip por categoría y los mete en la lista detrás de "Todos":
  - `categories.map(fn)` devuelve una lista nueva con el resultado de `fn` para cada sección.
  - El [spread](../../glosario.md#spread) `...` "esparce" esa lista dentro de `chips`. Sin él,
    `chips` tendría "Todos" y, como segundo elemento, una lista entera metida dentro.
- `({ category }) =>` es una función flecha que [desestructura](../../glosario.md#desestructuracion)
  su parámetro: de cada sección `{ category, products }` solo se queda con `category` (aquí no
  hacen falta los productos).
- `=> ({ … })`: los paréntesis alrededor de las llaves son necesarios. Sin ellos, JavaScript
  leería `{` como el inicio del cuerpo de la función y no como un objeto que devolver.
- `id: category.id,` el id de la categoría, que es su [slug](../../glosario.md#slug)
  (`carnicos`).
- `name: category.data.name,` el nombre bonito (`Cárnicos`). Los campos validados de una
  [entrada](../../glosario.md#entrada) están en `.data`.
- ``href: `/categoria/${category.id}`,`` arma la URL con un
  [template literal](../../glosario.md#template-literal): `/categoria/carnicos`. Es la ruta de
  la página que genera [`src/pages/categoria/[id].astro`](../pages/categoria/[id].astro.md).
- `})),` cierra el objeto, la función y el `map`. `];` cierra la lista `chips`.
- `---` cierra el frontmatter.

```astro

<nav aria-label="Categorías">
	<ul class="flex gap-2 overflow-x-auto pb-2">
```

- `<nav>` marca un bloque de navegación. `aria-label="Categorías"` le da nombre (ver
  [aria-label](../../glosario.md#aria-label)): el lector de pantalla anuncia "navegación
  Categorías", y lo distingue de otros `<nav>`.
- `<ul>`: los chips son una lista de enlaces, así que van en una lista. El lector de pantalla
  dice cuántos hay ("lista, 7 elementos"). Las viñetas no se ven porque el
  [reset de Tailwind](../../glosario.md#preflight) las quita.
- Las clases, en CSS plano:
  - `flex` = `display: flex`: los `<li>` se ponen en **una fila**. Por defecto `flex` no salta
    de línea, así que nunca se parten en dos filas.
  - `gap-2` = `gap: 0.5rem` (8 px) de separación entre chips.
  - `overflow-x-auto` = `overflow-x: auto`: si los chips no caben a lo ancho, **la fila hace
    scroll lateral por dentro**, y la página no. Es lo que pide el AC6 (a 360 px de ancho, sin
    scroll horizontal en la página) y la regla "sin cajón lateral, sin JS" de `design.md`.
  - `pb-2` = `padding-bottom: 0.5rem` (8 px): un respiro debajo de la fila de chips.

```astro
		{
			chips.map((chip) =>
				chip.id === currentId ? (
```

- `{ … }` abre una [expresión en plantilla](../../glosario.md#expresion-en-plantilla) que ocupa
  varias líneas.
- `chips.map((chip) =>` genera un `<li>` por cada chip.
- `chip.id === currentId ? (` es un ternario (`condición ? A : B`) que elige entre dos trozos
  de HTML: si el `id` del chip es igual al `currentId` de la página, pinta la versión
  **seleccionada** (A); si no, la **normal** (B). En la portada `null === null` marca "Todos";
  en `/categoria/carnicos`, `'carnicos' === 'carnicos'` marca "Cárnicos".

```astro
					<li>
						<a
							href={chip.href}
							aria-current="page"
							class="inline-flex min-h-11 items-center whitespace-nowrap rounded-full bg-accent px-4 text-surface"
						>
							{chip.name}
						</a>
					</li>
```

**Rama A: el chip de la página actual.**

- `<li>` un elemento de la lista; dentro, el enlace.
- `href={chip.href}` el destino (en atributos, las llaves van sin comillas).
- `aria-current="page"` (ver [aria-current](../../glosario.md#aria-current)): el lector de
  pantalla dice "página actual". Así quien no ve el color rojo también sabe dónde está. Se usa
  `"page"` y no `"true"` (que es lo que muestra `/estilo`) porque estos son enlaces de verdad a
  páginas; en `/estilo` los chips son solo una muestra (spec 0005).
- Las clases (la variante "seleccionado" de `design.md`, copiada tal cual):
  - `inline-flex` = `display: inline-flex`, `min-h-11` = `min-height: 2.75rem` (44 px) e
    `items-center` = `align-items: center`: el mismo trío que el nombre de la tienda en
    [`SiteHeader`](SiteHeader.astro.md). Hace que el enlace mida al menos
    44 px de alto ([área táctil](../../glosario.md#area-tactil)) con el texto centrado.
  - `whitespace-nowrap` = `white-space: nowrap`: el texto no se parte en dos líneas, así
    "Lácteos y huevos" queda en una sola.
  - `rounded-full` = un `border-radius` enorme: las puntas quedan totalmente redondas, forma
    de píldora.
  - `bg-accent` = `background-color: var(--color-accent)`: fondo rojo teja.
  - `px-4` = `padding-left` y `padding-right` de 16 px.
  - `text-surface` = `color: var(--color-surface)`: texto blanco. Blanco sobre `accent` tiene
    un contraste de 6,04 a 1 (tabla de la spec 0002), por encima del 4,5 que pide la
    [norma WCAG](../../glosario.md#contraste-wcag).
- `{chip.name}` escribe el nombre del chip.

```astro
				) : (
					<li>
						<a
							href={chip.href}
							class="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border border-border bg-surface px-4 text-ink hover:border-accent"
						>
							{chip.name}
						</a>
					</li>
				),
```

**Rama B: cualquier otro chip.**

- `) : (` cierra la rama A y abre la B: el "si no" del ternario.
- Mismo `<li>` y `<a>`, pero **sin** `aria-current`: el AC4 pide que solo el chip actual lo
  lleve.
- Las clases (la variante "normal" de `design.md`). Repite `inline-flex min-h-11 items-center
  whitespace-nowrap rounded-full px-4` con el mismo significado que arriba, y cambia el resto:
  - `border` = `border-width: 1px` (el estilo sólido lo pone el reset de Tailwind).
  - `border-border` = `border-color: var(--color-border)`: borde beige suave.
  - `bg-surface` = fondo blanco.
  - `text-ink` = `color: var(--color-ink)`: texto marrón oscuro.
  - `hover:border-accent`: la [variante](../../glosario.md#variante) `hover:` aplica
    `border-color: var(--color-accent)` solo al pasar el ratón. El borde se vuelve rojo como
    pista de que se puede pulsar.
- `),` cierra la rama B. La coma final es la del argumento de `map`: JavaScript permite una
  coma tras el último argumento, y el formateador de código la añade.

```astro
			)
		}
	</ul>
</nav>
```

- `)` cierra la llamada a `chips.map(`; `}` cierra la expresión en plantilla. El resultado es
  una lista de `<li>` que Astro escribe dentro del `<ul>`.
- `</ul>` y `</nav>` cierran la lista y la navegación.

## Cómo se conecta

- **Entra:**
  - `categories`: las páginas llaman a `getCatalog()` de
    [`src/lib/catalog.ts`](../lib/catalog.ts.md) y pasan el resultado tal cual.
  - `currentId`: [`src/pages/index.astro`](../pages/index.astro.md) pasa `null`;
    [`src/pages/categoria/[id].astro`](../pages/categoria/[id].astro.md) pasa `category.id`
    (por ejemplo `'carnicos'`).
  - Ejemplo real: `<CategoryNav categories={catalog} currentId={null} />`.
- **Sale:** HTML puro, `<nav>` con enlaces a `/` y a `/categoria/<id>`. Esas páginas existen
  porque `[id].astro` genera una por cada categoría de `getCatalog()`: la misma lista, así que
  no puede haber un chip que lleve a una página inexistente.
- **Estilo:** las dos variantes del chip están en [`design.md`](../../../../design.md) y se ven
  en `/estilo`; los colores vienen de [`global.css`](../styles/global.css.md).

## Prueba tú

Mira para qué sirve `overflow-x-auto`.

1. `pnpm dev` y abre `http://localhost:4321/`.
2. En DevTools (F12), activa el modo dispositivo (Ctrl+Shift+M) y pon un ancho de 360 px.
   Desliza la fila de chips: hace scroll de lado por sí sola, y la página no se mueve.
3. En el `<ul>`, borra ` overflow-x-auto` y guarda.
4. **Qué verás:** los chips se salen por la derecha y ahora **toda la página** se puede mover de
   lado, justo lo que prohíbe el AC6.
5. **Deshacer:** deja la clase otra vez como `flex gap-2 overflow-x-auto pb-2` y guarda.

## Términos

- [frontmatter](../../glosario.md#frontmatter)
- [import-type](../../glosario.md#import-type)
- [tipo](../../glosario.md#tipo)
- [interface](../../glosario.md#interface)
- [props](../../glosario.md#props)
- [jsdoc](../../glosario.md#jsdoc) *(nuevo)*
- [union](../../glosario.md#union)
- [astro-props](../../glosario.md#astro-props)
- [desestructuracion](../../glosario.md#desestructuracion)
- [spread](../../glosario.md#spread)
- [slug](../../glosario.md#slug)
- [entrada](../../glosario.md#entrada)
- [template-literal](../../glosario.md#template-literal)
- [aria-label](../../glosario.md#aria-label)
- [preflight](../../glosario.md#preflight) *(nuevo)*
- [expresion-en-plantilla](../../glosario.md#expresion-en-plantilla)
- [aria-current](../../glosario.md#aria-current)
- [area-tactil](../../glosario.md#area-tactil)
- [contraste-wcag](../../glosario.md#contraste-wcag) *(nuevo)*
- [variante](../../glosario.md#variante)
