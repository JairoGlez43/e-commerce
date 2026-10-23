# Glosario del código

Cada término nuevo que aparece en el código del proyecto, explicado desde lo que ya sabes
(HTML, CSS, JavaScript, Node + Express). Las explicaciones de cada archivo enlazan aquí en vez
de repetir la definición. Si un término necesita una lección entera, lo indica con `/learn <tema>`.

Índice: [Proceso y herramientas](#proceso-y-herramientas) · [Astro](#astro) ·
[TypeScript y JavaScript moderno](#typescript-y-javascript-moderno) · [Datos](#datos) ·
[Supabase y SQL](#supabase-y-sql) · [Imágenes](#imágenes) · [Tailwind y CSS](#tailwind-y-css) ·
[HTML y accesibilidad](#html-y-accesibilidad) · [Web y rendimiento](#web-y-rendimiento) ·
[Autenticación y sesiones](#autenticación-y-sesiones)

---

## Proceso y herramientas

### pnpm
Un gestor de paquetes como `npm`: instala las librerías que el proyecto necesita en
`node_modules/`. Es más rápido y ocupa menos disco porque guarda cada versión de una librería
una sola vez en tu PC y la enlaza desde cada proyecto. Se usa igual: `pnpm install`,
`pnpm dev`, `pnpm build`.

### lockfile
`pnpm-lock.yaml`. Anota la versión **exacta** instalada de cada librería (y de las librerías
de esas librerías). Gracias a él, tu PC y Vercel instalan exactamente lo mismo. No se edita a
mano; lo escribe `pnpm install`.

### build
El paso que convierte el código fuente (`src/`) en el sitio terminado (`dist/`). Lo lanzas con
`pnpm build`. Astro ejecuta tus componentes **una vez**, en tu PC, y escribe archivos `.html`,
`.css` e imágenes optimizadas. Lo que se sube al hosting es solo `dist/`.

### dist
La carpeta que produce el [build](#build): el sitio listo para subir. Se regenera entera en
cada build, por eso nunca se edita a mano y está en `.gitignore`.

### servidor-de-desarrollo
`pnpm dev`. Sirve el sitio en `http://localhost:4321` y lo recalcula cada vez que guardas un
archivo. Sirve para trabajar; no es lo que ven los clientes. `pnpm preview` sirve en cambio
el contenido real de `dist/`, tal como quedará en el hosting.

### vite
La herramienta que Astro usa por dentro para empaquetar el código y para el servidor de
desarrollo. Tú casi nunca la tocas; solo aparece en `astro.config.mjs` para añadirle un
*plugin* (una extensión), el de Tailwind.

### typecheck
`pnpm typecheck` (que ejecuta `astro check`). Lee todo el código TypeScript y los `.astro` y
avisa si algo no encaja con su [tipo](#tipo), por ejemplo pasar un texto donde se espera un
número. No ejecuta nada; solo revisa. Junto con `pnpm build` es el "check limpio" del proyecto.

### variable-css
Ya conoces `--mi-color: red;` y `var(--mi-color)` de CSS. Aquí se usan igual: Tailwind guarda
los colores del diseño como variables CSS (`--color-accent`), y la fuente de títulos se
publica como `--font-fraunces`.

### cli
Un programa que se usa escribiendo comandos en la terminal (*Command Line Interface*). La
librería `astro` instala el suyo en `node_modules/.bin/astro`; los scripts de `package.json`
lo llaman (`astro dev`, `astro build`).

### codigo-de-salida
El número que devuelve un comando al terminar: `0` = todo bien, cualquier otro = falló.
Scripts y hostings miran este número, no los mensajes, así que un error que solo se escribe en
la terminal pero sale con `0` pasa desapercibido. Se ve con `$LASTEXITCODE` (PowerShell) o
`echo $?` (Git Bash).

### rango-de-versiones
En `package.json`, `^4.3.3` significa "4.3.3 o cualquier 4.x posterior, nunca la 5". Si la
versión empieza por 0 (`^0.35.5`), solo acepta 0.35.x. La versión exacta instalada la fija el
[lockfile](#lockfile).

### devdependencies
`dependencies` y `devDependencies` son dos listas de librerías en `package.json`.
`dependencies`: las que hacen falta para construir el sitio. `devDependencies`: herramientas
para quien programa (por ejemplo, el [typecheck](#typecheck)). `pnpm install` instala las dos;
la separación indica para qué sirve cada una.

### script-de-instalacion
Un programa que una librería ejecuta en tu PC justo después de descargarse, por ejemplo para
preparar una parte escrita en otro lenguaje. Puede ejecutar cualquier cosa, así que pnpm 10 lo
bloquea salvo para las librerías listadas en `onlyBuiltDependencies` (`pnpm-workspace.yaml`).

### sharp
Librería de Node para procesar imágenes (por dentro usa una librería escrita en C). Astro la
usa en el build para convertir las fotos a [WebP](#webp) y generar los tamaños del
[srcset](#srcset).

### esbuild
Herramienta muy rápida, escrita en Go, que convierte TypeScript en JavaScript y empaqueta
código. Astro y [Vite](#vite) la usan por dentro; tú no la usas directamente.

### yaml
Formato de texto para configuración, como JSON pero sin llaves ni comillas. La sangría marca
la estructura, `clave:` da un valor, `- elemento` añade un elemento a una lista y `#` empieza
un comentario.

### variable-de-entorno
Un valor que se define **fuera del código**, en el sistema donde se ejecuta: en un archivo
`.env` (que git ignora) o en el propio comando (`WHATSAPP_NUMBER=5355555555 pnpm build`). Sirve
para datos que cambian según dónde corre el proyecto o que no deben quedar en el repo. Es lo
mismo que `process.env.PORT` en Express.

### patron-glob
Una forma corta de nombrar muchos archivos a la vez. `*` = cualquier nombre de archivo;
`**` = cualquier carpeta, a cualquier profundidad. `**/*` = todos los archivos del proyecto;
`src/**/*.astro` = todos los `.astro` de `src/`.

---

## Astro

### componente-astro
Un archivo `.astro`. Tiene dos partes: arriba, entre dos líneas `---`, el
[frontmatter](#frontmatter) (JavaScript/TypeScript); abajo, la plantilla (HTML con
expresiones `{...}`). Se ejecuta **solo durante el build**, nunca en el navegador; el resultado
es HTML plano. Lección: [`../01-astro.md`](../01-astro.md).

### frontmatter
El bloque entre las dos líneas `---` al inicio de un `.astro`. Es código que corre en el
[build](#build): importa cosas, lee datos, prepara variables. Un `console.log` aquí sale en la
terminal, no en el navegador.

### expresion-en-plantilla
Dentro del HTML de un `.astro`, `{algo}` inserta el valor de `algo`. Como en JSX:
`{producto.nombre}` escribe el nombre; `{lista.map((x) => <li>{x}</li>)}` genera un `<li>`
por elemento; `{condicion ? <a/> : <b/>}` elige uno de dos trozos de HTML.

### props
Los datos que un componente recibe de quien lo usa, como los argumentos de una función.
`<ProductCard product={p} eager={true} />` pasa dos props; dentro del componente se leen con
`Astro.props`. La [interface](#interface) `Props` declara cuáles hay y de qué tipo.

### astro-props
El objeto con las [props](#props) que recibió el componente. Se suele
[desestructurar](#desestructuracion): `const { title, description } = Astro.props;`.

### slot
`<slot />` marca el hueco donde se inserta el contenido que va "entre las etiquetas" del
componente. En `<BaseLayout>…contenido…</BaseLayout>`, el contenido aparece donde el layout
tiene su `<slot />`. Equivale a `children` en React.

### layout
Un componente que envuelve páginas enteras: pone `<html>`, `<head>`, metadatos y estilos
comunes, y deja un [slot](#slot) para el contenido. Aquí es `src/layouts/BaseLayout.astro`.

### ruta-por-archivo
En Astro, la URL sale de la ruta del archivo dentro de `src/pages/`:
`src/pages/index.astro` → `/`, `src/pages/estilo.astro` → `/estilo`. Un nombre entre
corchetes, como `src/pages/categoria/[id].astro`, es una **ruta dinámica**: una sola plantilla
que produce muchas páginas (`/categoria/aseo`, `/categoria/bebidas`…).

### getStaticPaths
Función que exporta una [ruta dinámica](#ruta-por-archivo). Devuelve una lista; cada elemento
dice qué valor toma el trozo entre corchetes (`params`) y qué datos recibe esa página
(`props`). Astro genera un HTML por elemento durante el build.

### modulo-virtual
Un `import` que no apunta a un archivo tuyo sino a algo que Astro crea al vuelo, como
`astro:content` (leer tus datos) o `astro:assets` (imágenes y fuentes). Se reconoce por el
prefijo `astro:`.

### class-list
`class:list={[...]}` es un atajo de Astro para construir el atributo `class`. Acepta textos y
objetos: `class:list={['a', { b: condicion }]}` da `class="a b"` si `condicion` es verdadera,
o `class="a"` si es falsa.

### comentario-en-plantilla
En la plantilla de un `.astro` (debajo del segundo `---`), `{/* texto */}` es un comentario: una
[expresión](#expresion-en-plantilla) que solo contiene un comentario de JavaScript, así que no
escribe nada. No llega al HTML final: el cliente no lo descarga.

### condicional-con-and
En una plantilla, `{condicion && <etiqueta />}` escribe la etiqueta si la condición es
verdadera, y nada si es falsa.

### import-de-css
`import '../styles/global.css';` en un `.astro` no trae ninguna variable: le dice a Astro "esta
página usa este CSS", y Astro lo incluye en el HTML final.

### astro-url-y-site
`Astro.url` es la URL de la página que se está generando, como objeto `URL` (`.pathname` = la
ruta, por ejemplo `/categoria/aseo/`). `Astro.site` es el dominio público, sacado de la opción
`site` de `astro.config.mjs` (en este proyecto, `https://tienda-demo-cuba.vercel.app`, spec
0008); valdría `undefined` si esa opción se quitara.

### fonts-api
La forma de Astro de servir [fuentes web](#fuente-web). Se declaran en `astro.config.mjs`
(archivo, grosor, nombre de variable). El componente `<Font cssVariable="--font-fraunces" />` de
`astro:assets` escribe en el `<head>` el CSS que la carga y crea esa [variable CSS](#variable-css).

### script-en-astro
Una etiqueta `<script>` escrita en la plantilla de un `.astro` **sin ningún atributo**. Es la
única parte de un `.astro` que se ejecuta **en el navegador** del visitante, no en el build.
Astro la procesa al construir el sitio: acepta TypeScript e `import`, la junta con todo lo que
importa en un solo archivo `.js` dentro de `dist/_astro/` y escribe en la página un
`<script type="module" src="/_astro/….js">`. Si le pones cualquier atributo (por ejemplo
`is:inline`), Astro deja de procesarla y la copia tal cual. El [frontmatter](#frontmatter) no
puede pasarle variables directamente, porque corre en otro momento (el build) y en otro sitio
(tu PC o Vercel); se le pasan escribiéndolas en el HTML con [atributos data](#atributo-data).
En este proyecto solo la usa la página `/admin/` (specs 0012 y 0014); las páginas de clientes
no llevan ninguna.

---

## TypeScript y JavaScript moderno

### typescript
JavaScript con **tipos**: anotas qué clase de valor guarda cada variable o recibe cada
función, y el [typecheck](#typecheck) te avisa de errores antes de ejecutar nada. En el build,
los tipos se borran y queda JavaScript normal. Este proyecto usa el modo *strict* (estricto):
el más exigente.

### tipo
La "forma" de un valor: `string` (texto), `number`, `boolean` (`true`/`false`), un objeto con
ciertos campos, una lista (`string[]` = lista de textos)… Se escribe tras dos puntos:
`price: number`.

### interface
Declara la forma de un objeto con nombre propio:
`interface Props { title: string; image?: string }`. El `?` significa "opcional".

### union
`2 | 3` significa "o 2 o 3, nada más". `string | null` significa "un texto, o `null`"
(`null` = "no hay valor").

### generico
Un tipo con un parámetro entre `< >`. `CollectionEntry<'products'>` se lee "una entrada de la
colección `products`"; `Promise<CatalogSection[]>` es "una promesa que, al resolverse, da una
lista de `CatalogSection`". Una función también puede tener uno: `readTable<Row>(…)` recibe
un tipo `Row` al llamarla (`readTable<ProductRow>(…)`) y lo usa en lo que devuelve.

<a id="modulos-es"></a>
### import-export
`export` deja que una función, variable o tipo de un archivo se use desde otros archivos;
`import { x } from './archivo'` lo trae. Cada archivo es un "módulo" (*módulos ES*). Es el
equivalente moderno de `module.exports` / `require()` de Node. `"type": "module"` en
`package.json` hace que Node use esta forma en los `.js`; los `.mjs` siempre la usan.

### import-type
`import type { X } from '...'` importa **solo** un [tipo](#tipo). Desaparece del JavaScript
final; sirve solo para el [typecheck](#typecheck). Dentro de un import normal se puede marcar
uno solo: `import { getCatalog, type CatalogSection } from '...'`.

### importar-json
`import datos from './data/categories.json'` da el contenido del JSON ya convertido en objeto o
lista de JavaScript, como `JSON.parse(fs.readFileSync(...))`, pero lo hace la herramienta
([Vite](#vite)) al construir el sitio. El proyecto lo usó en `content.config.ts` hasta la spec
0013, cuando los datos pasaron a [Supabase](#supabase).

### ts-check
`// @ts-check` en la primera línea de un archivo JavaScript pide a TypeScript que lo revise
como si fuera TypeScript. Así un error en un `.js`/`.mjs` (como `astro.config.mjs`) se subraya
en VS Code y hace fallar el [typecheck](#typecheck).

### archivo-de-declaracion
Un archivo `.d.ts`: TypeScript que solo describe [tipos](#tipo), sin código que se ejecute.
Astro genera varios en `.astro/` para que TypeScript conozca tus colecciones, tus fuentes y
los [módulos virtuales](#modulo-virtual) `astro:*`.

<a id="comentario-jsdoc"></a>
### jsdoc
Un comentario que empieza por `/**` justo encima de algo (una prop, una función) y lo
describe. VS Code lo muestra al pasar el ratón sobre ese nombre; no cambia el código.

### valor-por-defecto
Al [desestructurar](#desestructuracion), `const { image = '/og-default.png' } = Astro.props;`
da a `image` ese valor si la prop no llegó (`undefined`).

### constructor-url
`new URL('/foto.png', 'https://tienda.com').href` da `'https://tienda.com/foto.png'`: une una
ruta con una base. Si la ruta ya es una URL completa, ignora la base.

### array-map
`lista.map((x, i) => …)` crea una lista **nueva** del mismo tamaño: llama a la función con cada
elemento (`x`) y su posición (`i`, que empieza en 0) y guarda lo que la función devuelve. En
una plantilla de Astro se usa para escribir un trozo de HTML por elemento (ver
[expresión en plantilla](#expresion-en-plantilla)). La lista original no cambia.

### reduce
`lista.reduce((acum, x) => acum + x, 0)` recorre una lista llevando un valor acumulado que
empieza en el segundo argumento (aquí `0`) y devuelve el resultado final. En `index.astro`
suma cuántos productos tienen las secciones anteriores.

### array-join
`['a', 'b', 'c'].join(' · ')` une los elementos de una lista en **un solo texto**, poniendo el
separador entre cada dos: `'a · b · c'`. No añade separador ni al principio ni al final.

### import-meta-env
`import.meta.env.NOMBRE` lee una [variable de entorno](#variable-de-entorno) en un proyecto de
Astro o Vite; es el equivalente de `process.env.NOMBRE` en Node. En el código que corre en el
build se puede leer cualquiera; en el navegador, solo las que empiezan por `PUBLIC_`. Si la
variable no existe, vale `undefined`.

### throw
`throw new Error('mensaje')` **lanza un error**: corta la función en ese punto y el error sube
hasta que alguien lo captura. Si nadie lo captura durante el build, Astro muestra el mensaje y
el build falla. Es lo mismo que en Express cuando lanzas un error en una ruta.

### encodeuricomponent
`encodeURIComponent('Hola, ¿qué tal?')` da `'Hola%2C%20%C2%BFqu%C3%A9%20tal%3F'`: convierte un
texto para poder meterlo dentro de una URL sin romperla. Los espacios, `?`, `&`, acentos y saltos
de línea (`%0A`) pasan a códigos `%XX`.

### process-argv
`process.argv` es la lista de palabras con las que se lanzó un programa de Node. Con
`node script.mjs dist-copia`, la posición 0 es la ruta de `node`, la 1 la del script y la 2
`'dist-copia'`, el primer argumento tuyo.

### buffer
Un `Buffer` es el contenido de un archivo (o de un texto) como bytes, tal cual. `fs.readFileSync`
sin codificación devuelve uno, y `Buffer.from('texto')` convierte un texto. Funciones como la
compresión de `zlib` trabajan con bytes, no con texto.

### set
`new Set(lista)` crea una colección que **no admite repetidos**. `[...new Set(['a', 'a', 'b'])]`
da `['a', 'b']`: es la forma corta de quitar duplicados de una lista.

### console-table
`console.table(lista)` imprime una lista de objetos como una tabla con bordes en la terminal:
una fila por objeto y una columna por clave.

### encadenamiento-opcional
`a?.b` lee `b` solo si `a` existe; si `a` es `null` o `undefined`, da `undefined` en vez de
lanzar un error. Ejemplo: `categories[0]?.id` con una lista vacía.

### satisfies
`valor satisfies Tipo` pide al typecheck que confirme que `valor` cumple `Tipo`, sin cambiar
el tipo más preciso que TypeScript ya dedujo. Se usa en `getStaticPaths` para que Astro sepa
qué [props](#props) recibe la página.

### afirmacion-de-tipo
`valor as Tipo` le dice al [typecheck](#typecheck): "confía en mí, esto es de este tipo". No
comprueba nada, ni al revisar ni al ejecutar: si te equivocas, TypeScript no se entera. Se usa
cuando el valor llega de fuera y TypeScript no puede conocer su forma, como el JSON que
devuelve un [fetch](#fetch). Es lo contrario de [satisfies](#satisfies), que sí comprueba.

### afirmacion-no-nulo
Un `!` **detrás** de un valor, como `document.getElementById('admin')!`, le dice al
[typecheck](#typecheck): "confía en mí, esto no es `null` ni `undefined`". Igual que la
[afirmación de tipo](#afirmacion-de-tipo), no comprueba nada al ejecutar: si te equivocas, el
error sale más tarde, al usar el valor. Se usa cuando sabes que algo existe, por ejemplo un
elemento que está en tu propio HTML.

### alias-de-tipo
`type View = 'sign-in' | 'recover';` da un nombre a un [tipo](#tipo), aquí una
[unión](#union) de textos exactos: una variable de tipo `View` solo puede valer uno de ellos.
Se parece a una [interface](#interface), pero sirve para cualquier tipo, no solo para objetos.
Con `export type` se puede usar desde otros archivos.

### record-y-unknown
`unknown` es el [tipo](#tipo) de un valor del que no se sabe nada: TypeScript no deja usarlo
hasta comprobar qué es (`typeof x === 'string'`). `Record<Clave, Valor>` es el tipo de un objeto
cuyas claves son los valores de `Clave` y que guarda un `Valor` en cada una.
`Record<string, unknown>` = un objeto con cualquier clave y valores desconocidos. Si `Clave` es
una [unión](#union), como en `Record<AuthErrorKind, string>`, el objeto tiene que tener **todas**
las claves: si falta una, el [typecheck](#typecheck) avisa.

### clase
`class AuthError extends Error { … }` crea un tipo de objeto propio a partir de otro: `extends
Error` = "es un `Error` de JavaScript, con algo más". Dentro, el `constructor(…)` se ejecuta al
hacer `new AuthError('rate')`, y `super(…)` llama antes al constructor de `Error` (con el
mensaje). En TypeScript, `constructor(readonly kind: …)` crea a la vez un campo `kind` que ya
no se puede cambiar (`readonly` = solo lectura).

### instanceof
`error instanceof AuthError` es `true` si `error` se creó con `new AuthError(…)`. Sirve dentro
de un `catch` para saber qué clase de error ha llegado ([clase](#clase)).

### finally
En `try { … } catch { … } finally { … }`, el bloque `finally` se ejecuta **siempre** al final:
si todo fue bien, si hubo un error y también si el `try` hizo `return`. Sirve para dejar las
cosas en orden (reactivar un botón, borrar una variable). Una promesa tiene lo mismo:
`promesa.finally(() => …)` se ejecuta cuando la promesa termina, bien o mal. Por cierto,
`catch { … }` sin `(error)` captura el error sin darle nombre, cuando no hace falta mirarlo.

### operador-void
`void tarea()` ejecuta `tarea()` y tira lo que devuelve. Con una función
[async](#async-await), que devuelve una promesa, significa "la lanzo y, a propósito, no espero a
que termine". Es una forma de dejarlo claro para quien lee el código y para las herramientas que
avisan de promesas olvidadas.

### async-await
Una función `async` puede esperar resultados lentos con `await` (leer datos, por ejemplo)
sin bloquearse. `const datos = await getCollection('products');` espera a tener los datos y
luego sigue. Siempre devuelve una *Promise* (promesa): un valor que llegará más tarde.

### fetch
`await fetch(url, { headers: { … } })` hace una petición HTTP desde el código, como hace el
navegador al abrir una URL; `headers` son las cabeceras que se envían con ella. Viene incluida
en Node (desde la versión 18) y en los navegadores. Devuelve un objeto `Response` (la
respuesta): `response.ok` es `true` si el código de estado está entre 200 y 299,
`response.status` es ese código (`200`, `401`…) y `await response.json()` convierte el cuerpo
JSON en objetos de JavaScript. Si no hay red o la dirección no existe, `fetch` lanza un error
([throw](#throw)); una respuesta con error (un 401, un 500) **no** lo lanza: hay que mirar `ok`.

### promise-all
`await Promise.all([tareaA(), tareaB()])` lanza dos tareas lentas **a la vez** y espera a que
terminen las dos. Da una lista con los resultados, en el mismo orden. Si una falla, falla todo.
Se suele leer con `const [a, b] = await Promise.all([…]);`: la misma
[desestructuración](#desestructuracion), con corchetes porque es una lista (`a` = el primer
elemento, `b` = el segundo).

### desestructuracion
Sacar campos de un objeto en variables, en una línea:
`const { name, price } = product.data;` equivale a
`const name = product.data.name; const price = product.data.price;`.

### spread
`...` "esparce" una lista u objeto dentro de otro: `[a, ...otros]` crea una lista con `a`
seguido de todos los `otros`; `{ ...section, cardsBefore }` copia los campos de `section` y
añade `cardsBefore`.

### template-literal
Texto entre comillas invertidas con huecos: `` `/producto/${id}` `` mete el valor de `id`
dentro del texto.

### nullish
`a ?? b` da `a`, salvo que `a` sea `null` o `undefined`; entonces da `b`. Sirve para valores
por defecto.

### asignacion-nullish
`a ??= b` significa "si `a` es `null` o `undefined`, guarda `b` en `a`; si ya tiene valor, no
hagas nada". Es la forma corta de `a = a ?? b` ([nullish](#nullish)). Sirve para calcular algo
solo la primera vez y reutilizarlo después: `b` ni siquiera se evalúa si `a` ya tiene valor.

### ordenar-con-sort
`lista.sort((a, b) => …)` ordena comparando pares. Si la función devuelve un número negativo,
`a` va antes; si es positivo, `b` va antes; `0` = empate. `x || y` en una comparación
significa "si `x` no decide (es 0), usa `y`": así se ordena por un criterio y luego por otro.

### localeCompare
`'Azúcar'.localeCompare('Arroz', 'es')` compara textos con las reglas del español
(acentos, ñ), para ordenar alfabéticamente bien.

### intl-numberformat
`new Intl.NumberFormat('es-ES').format(12500)` da `"12.500"`: formatea números con las
convenciones de un idioma. Ojo: en `es-ES` los números de 4 cifras no se agrupan (`3400`).

### zona-horaria
La hora oficial de un lugar. Un mismo instante tiene fecha y hora distintas según dónde lo
mires: la 01:08 del 16 de octubre en UTC (la hora de referencia mundial) son las 21:08 del
**15** de octubre en La Habana. Cada zona tiene un nombre estándar: `America/Havana`,
`Europe/Madrid`, `UTC`. Si no indicas ninguna, JavaScript usa la del ordenador donde corre.

### intl-datetimeformat
`new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' })` crea un formateador de
fechas, como [Intl.NumberFormat](#intl-numberformat) pero para fechas; su método
`.format(fecha)` devuelve el texto, por ejemplo `"16 de octubre"`. Las opciones dicen qué
partes salen y cómo: `day: 'numeric'` = el día en número, `month: 'long'` = el nombre completo
del mes; lo que no se pide (año, hora) no sale. `timeZone: 'America/Havana'` elige la
[zona horaria](#zona-horaria) con la que se calcula la fecha.

### expresion-regular
Un patrón para validar texto. `/^[a-z0-9]+(-[a-z0-9]+)*$/` acepta palabras en minúsculas y
números separados por guiones (`arroz-blanco`) y rechaza `Arroz_Blanco`.

---

## Datos

### content-collection
La forma de Astro de cargar datos con orden: dices "estos datos están en tal archivo y cada
elemento tiene esta forma". Las páginas los piden con [getCollection](#getcollection) y el
build falla si un dato no cumple la forma. Aquí hay dos: `products` y `categories`.

### definecollection
`defineCollection({ loader, schema })`, de `astro:content`, crea una
[colección](#content-collection): de dónde salen los datos y qué forma deben tener.
`src/content.config.ts` debe exportar un objeto `collections`; cada clave es el nombre que
luego usa `getCollection('...')`.

### loader
La pieza que trae los datos de una colección. Puede ser uno que trae Astro, como
`file('datos.json')`, que lee un archivo JSON, o una función propia (un *loader en línea*):
`loader: async () => [ … ]`, que devuelve la lista de elementos, cada uno con su `id`. Astro la
llama en cada build y luego valida cada elemento con el [esquema](#esquema). El proyecto usó
`file()` hasta la spec 0013; desde entonces usa dos funciones propias que leen de
[Supabase](#supabase), y las páginas no se tocaron.

### esquema
La descripción de la forma de cada dato: qué campos tiene y qué reglas cumple (texto de
1 a 60 letras, número entero positivo…). Se escribe con [zod](#zod).

### zod
La librería de esquemas que usa Astro. Se importa de `astro/zod`. Ejemplos:
`z.string().min(1)` = texto no vacío; `z.number().int().positive()` = entero mayor que 0;
`z.boolean()` = verdadero/falso; `z.object({...})` = objeto con esos campos; `z.url()` = texto
con forma de URL (`https://…`).
`.refine(fn, { message })` añade una regla propia; `.pipe(otro)` pasa el valor ya validado a
otro esquema.

### entrada
Cada elemento de una colección, tal como lo da Astro: `{ id, data, ... }`. `id` es su
identificador y `data` sus campos ya validados (`product.data.price`).

### getcollection
`await getCollection('products')` devuelve todas las [entradas](#entrada) de esa colección.

### getentry
`await getEntry(referencia)` devuelve **una** [entrada](#entrada) concreta. Con la
[referencia](#reference) de un producto (`{ collection: 'categories', id: 'carnicos' }`)
devuelve la categoría completa, con su nombre. Es como buscar una fila por su clave en una base
de datos.

### reference
`reference('categories')` en un esquema dice "este campo apunta a una entrada de la colección
`categories`". El valor guardado queda como `{ collection: 'categories', id: 'carnicos' }`.

### slug
Un identificador apto para URL: minúsculas, sin acentos ni espacios, con guiones
(`picadillo-de-res`). Aquí el `id` de cada producto y categoría es su slug.

---

## Supabase y SQL

### backend-como-servicio
Un servicio en internet que te da hecha la parte de servidor que en Express montarías a mano:
la base de datos, una API para leerla y escribirla, un almacén de archivos, los usuarios. En
inglés, *Backend as a Service* (BaaS). No escribes ni mantienes ese servidor: lo configuras en
un panel web (*dashboard*) y lo usas desde tu código. Aquí es [Supabase](#supabase).

### supabase
El [backend como servicio](#backend-como-servicio) del proyecto (elegido en la spec 0012; el
catálogo vive ahí desde la spec 0013). Cada proyecto de Supabase trae una base de datos
[Postgres](#postgres), una [API REST](#api-rest) que se genera sola a partir de sus tablas y un
almacén de archivos ([Storage](#storage-y-bucket)). Su dirección es
`https://<ref>.supabase.co`, donde `<ref>` es un código único del proyecto. El catálogo solo lo
lee el [build](#build): los clientes reciben páginas estáticas y nunca hablan con Supabase. La
única excepción es la página del dueño, `/admin/`, cuyo navegador habla con
[Supabase Auth](#supabase-auth) para iniciar sesión (spec 0014).

### postgres
PostgreSQL: una base de datos que guarda los datos en [tablas](#tabla-sql) y se maneja con SQL.
Es la base de datos de cada proyecto de Supabase.

### tabla-sql
SQL es el lenguaje para crear tablas y leer o escribir sus datos. Cada orden termina en `;`, las
palabras clave (`create table`, `insert into`) dan igual en mayúsculas o minúsculas, los textos
van entre comillas simples (`'Aseo'`) y `--` empieza un comentario. Una **tabla** guarda los datos
en filas y columnas, como una hoja de cálculo: cada columna tiene un nombre y un tipo fijo
(`text` = texto, `integer` = número entero, `boolean` = `true`/`false`), y cada fila es un
registro (un producto). Una columna puede llevar reglas: `not null` (obligatoria),
`default true` (el valor si no se da ninguno), [check](#restriccion-check)…

### esquema-sql
En Postgres, un esquema es como una carpeta con nombre que agrupa tablas: `public.products` es
la tabla `products` del esquema `public`. Supabase pone tus tablas en `public` y las suyas en
otros, como `storage` (los archivos). No confundir con el [esquema de zod](#esquema), que
describe la forma de un dato.

### snake-case
Escribir nombres en minúsculas unidos por guiones bajos: `in_stock`, `category_id`. Es la
costumbre en SQL; en JavaScript se usa *camelCase* (`inStock`, `categoryId`).

### clave-primaria
`primary key`: la columna que identifica cada fila de una [tabla](#tabla-sql). Es obligatoria y
no puede repetirse: insertar otra fila con un `id` que ya existe da error. Aquí es `id`
(`arroz-blanco`), el mismo [slug](#slug) de la URL.

### restriccion-check
`check (condición)` en una columna: Postgres rechaza cualquier fila que no la cumpla, venga de
donde venga, y no guarda nada. `check (price > 0)` impide guardar un precio de 0. Junto con
`not null` son las reglas que la base de datos hace cumplir por sí sola, igual que el
[esquema](#esquema) de zod en el build. Postgres les pone nombre solo: `products_price_check`.

### clave-foranea
`references otra_tabla (columna)`: el valor de esta columna tiene que existir en la otra tabla.
`category_id … references public.categories (id)` impide guardar un producto con una categoría
que no existe. `on delete restrict` impide además borrar una categoría que todavía tiene
productos.

### editor-sql
La página *SQL Editor* del panel de Supabase: pegas un archivo `.sql`, pulsas *Run* y Postgres
ejecuta sus órdenes una tras otra. El proyecto la usa en vez de la herramienta de comandos de
Supabase (spec 0013).

### datos-semilla
En inglés, *seed*: los datos iniciales que se cargan **una vez** en una base de datos vacía para
que la aplicación tenga algo que mostrar. Aquí, las 6 categorías y los 18 productos de la demo,
en `supabase/seed.sql`.

### api-rest
Lo que harías en Express con `app.get('/products', …)`: URLs que devuelven o cambian datos en
JSON según el método HTTP (`GET` leer, `POST` crear, `PATCH` cambiar, `DELETE` borrar).
Supabase crea una, sin escribir código, para cada tabla del esquema `public` (lo hace una pieza
suya llamada PostgREST). Por ejemplo,
`GET https://<ref>.supabase.co/rest/v1/categories?select=id,name` devuelve una lista JSON con
esas dos columnas de cada fila. Cada petición lleva una [clave](#clave-publishable) en la
cabecera `apikey`. Por defecto, una petición devuelve como mucho 1000 filas (spec 0013).

### clave-publishable
La clave que identifica tu proyecto ante la [API REST](#api-rest) de Supabase; empieza por
`sb_publishable_`. Es **pública por diseño**: se puede ver sin peligro, porque solo permite lo
que dejan las [políticas](#politica) de [RLS](#rls). Su opuesta es la clave secreta
(`sb_secret_…`), que se salta RLS y lo puede todo: nunca debe salir de un servidor de confianza.
Sustituye a la antigua clave `anon`, que Supabase está retirando.

### rol
En Postgres, un rol es un "usuario" de la base de datos con sus permisos. Supabase elige el rol
de cada petición a la API: `anon` si llega solo con la [clave publishable](#clave-publishable)
(un visitante sin sesión, como nuestro build) y `authenticated` si además lleva la sesión de un
usuario que ha iniciado sesión (lo usará la administración del dueño desde la feature 12, cuando
lea y escriba el catálogo con su [access token](#access-token)).

### grant
`grant select on table public.products to anon, authenticated;` da a esos [roles](#rol) permiso
para **leer** (`select`) esa tabla. Es la primera puerta: sin `grant`, Postgres rechaza la
lectura con el error `42501`. La segunda puerta es [RLS](#rls), que decide qué filas.

### rls
*Row Level Security*, seguridad por fila. Con `alter table … enable row level security`,
Postgres no deja ver ni cambiar **ninguna** fila a través de la API salvo las que permita alguna
[política](#politica). Una lectura sin política no da error: devuelve una lista vacía. Es lo que
hace segura una clave pública: aunque cualquiera tenga la
[clave publishable](#clave-publishable), solo puede hacer lo que digan las políticas.

### politica
En inglés, *policy*. Una regla de [RLS](#rls):
`create policy "nombre" on tabla for select to anon, authenticated using (true);` se lee "para
leer (`for select`), a estos [roles](#rol), deja ver las filas en las que la condición de
`using` sea verdadera". `using (true)` = todas las filas. Cada acción (`select`, `insert`,
`update`, `delete`) necesita su propia política; una acción sin política queda prohibida.

### funcion-sql
Postgres también tiene funciones, como JavaScript. `create function public.nombre() returns
boolean language sql as $$ select … $$` crea una, en el [esquema](#esquema-sql) `public`, que no
recibe nada y devuelve verdadero o falso (`boolean`). `language sql` dice que el cuerpo está
escrito en SQL; el cuerpo va entre los dos `$$`, que hacen de comillas (así dentro se pueden usar
comillas simples sin problema). `create or replace` la crea, o la sustituye si ya existe, así que
el archivo se puede ejecutar otra vez sin error. Se llama igual que en JavaScript:
`select public.nombre();`. Una [política](#politica) puede usarla dentro de su `using (…)`.

### storage-y-bucket
Supabase Storage es el almacén de archivos de Supabase, como la carpeta de subidas que montarías
a mano en un servidor Express, pero en el suyo. Los archivos se agrupan en *buckets* (cubos):
carpetas con nombre y sus propias reglas. De un bucket **público** cualquiera puede descargar un
archivo por su URL, sin clave:
`https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<archivo>`. Subir o borrar sigue
necesitando permiso. Aquí el bucket es `product-photos`.

---

## Imágenes

### image-component
`<Image>` de `astro:assets`. Recibe una foto de `src/assets/` y en el build genera versiones
más pequeñas en formato [WebP](#webp), con su [srcset](#srcset), y escribe la etiqueta `<img>`
final.

### getimage
`await getImage({ src: foto, width: 600, format: 'jpg' })`, de `astro:assets`, hace en el build
la misma optimización que [`<Image>`](#image-component), pero en vez de escribir un `<img>`
devuelve un objeto cuyo `.src` es la ruta del archivo generado. Sirve cuando necesitas la URL
de la imagen en otro sitio, como una etiqueta [Open Graph](#open-graph).

### image-en-esquema
`image()` es un ayudante que Astro pasa a la función del [esquema](#esquema)
(`schema: ({ image }) => ...`). Marca un campo como ruta a una imagen local, relativa al
archivo de datos, para que Astro la procese y `<Image>` pueda optimizarla. El proyecto lo usó
hasta la spec 0013; desde entonces `photo` es una [imagen remota](#imagen-remota).

### imagen-remota
Una imagen que no está en tu proyecto sino en otro servidor, y se da por su URL
(`https://…/arroz-blanco.jpg`). [`<Image>`](#image-component) también las optimiza: en el build,
Astro la descarga, genera las versiones [WebP](#webp) y las guarda en `dist/_astro/`, así que la
página final apunta a tu propio sitio y no al servidor original. Solo lo hace con las
direcciones permitidas en [`remotePatterns`](#remote-patterns). Guarda las descargas en
`node_modules/.astro` para no repetirlas en cada build.

### remote-patterns
`image.remotePatterns` en `astro.config.mjs`: la lista de direcciones de las que Astro acepta
descargar y optimizar [imágenes remotas](#imagen-remota). Cada patrón fija `protocol` (`https`),
`hostname` (el dominio; `*.supabase.co` = cualquier subdominio de un nivel, como
`abcd.supabase.co`) y `pathname` (la ruta; `/**` al final = cualquier cosa debajo, como en un
[patrón glob](#patron-glob)). Una URL que no encaja con ningún patrón no se optimiza.

### infersize
Una foto importada de `src/assets/` ya trae su ancho y alto, pero una
[imagen remota](#imagen-remota) es solo un texto con una URL. `<Image>` necesita esas medidas
(para el `width` y `height` del `<img>`, y para no generar versiones más grandes que el
original). `inferSize` en `<Image>`, o `inferSize: true` en [`getImage()`](#getimage), le dice a
Astro "descárgala y mídela tú". En la página del arroz da `width="1067" height="1067"`.

### webp
Un formato de imagen más ligero que JPG con la misma calidad aparente. Todos los navegadores
actuales lo leen.

### srcset
Atributo de `<img>` con varias versiones de la misma foto y su ancho
(`foto-200.webp 200w, foto-400.webp 400w`). El navegador elige la más pequeña que se vea
nítida en esa pantalla. `sizes` le dice cuánto ocupará la imagen en la página para que elija
bien.

### lazy-loading
`loading="lazy"`: el navegador no descarga la imagen hasta que está cerca de verse al hacer
scroll. Ahorra datos. `loading="eager"` la descarga ya; se usa para las primeras fotos, las
que se ven sin hacer scroll.

### svg
Un formato de imagen escrito como texto, con etiquetas parecidas a HTML (`<svg>`, `<path>`):
describe formas y colores en vez de guardar puntos de color uno a uno, así que se ve nítido a
cualquier tamaño y suele pesar poco. Se puede usar de dos formas: como archivo en un
`<img src="icono.svg">`, y el navegador lo pinta aparte, como una foto; o pegando su código
dentro del HTML (*SVG en línea*), y entonces lo que lleva dentro, como un `<style>` o un `id`,
pasa a formar parte de la página.

### importar-imagen
`import icono from '../assets/icons/x.svg'` en el [frontmatter](#frontmatter) no trae el dibujo:
trae un objeto con sus datos (`src`, `width`, `height`, `format`). `src` es la dirección donde
quedará el archivo publicado: en el build, [Vite](#vite) lo copia a la carpeta `_astro/` de
[`dist/`](#dist) con un *hash* en el nombre (unas letras que cambian si cambia el archivo, para que el navegador no
use una copia vieja). Con un [SVG](#svg), Astro deja usar además ese objeto como componente que
pega el SVG en línea; este proyecto solo usa su `.src`.

---

## Tailwind y CSS

### tailwind
Un sistema de CSS por **clases de utilidad**: en vez de escribir una regla CSS para cada
cosa, pones clases pequeñas en el HTML, cada una con una sola propiedad (`p-4` = padding,
`rounded-full` = bordes redondos). En el build, Tailwind lee tus archivos y genera solo el CSS
de las clases que usas. Por eso las clases se escriben completas, nunca armadas con
[template literals](#template-literal).

### token
Un valor de diseño con nombre (`accent` = el rojo de los precios). Se define una sola vez en
`src/styles/global.css` y se usa por nombre: `text-accent`, `bg-accent`. Si cambias el
valor, cambia en todo el sitio.

### theme
`@theme { --color-accent: #B03A24; }` en `global.css` crea el [token](#token) `accent` y con
él las clases `bg-accent`, `text-accent`, `border-accent`… `--color-*: initial` borra la paleta
que trae Tailwind, para que solo existan los colores del proyecto.

### variante
Un prefijo que aplica la clase solo en un caso: `sm:` desde 640 px de ancho, `md:` desde
768 px, `lg:` desde 1024 px, `hover:` al pasar el ratón, `active:` mientras se pulsa, `placeholder:` al texto de
ejemplo de un input, `after:` al pseudo-elemento `::after`, `disabled:` mientras un botón está
desactivado (`:disabled`), `empty:` cuando el elemento no tiene nada dentro (`:empty`; así
`empty:hidden` lo oculta mientras está vacío).

### preflight
El "reset" que Tailwind trae con `@import "tailwindcss"`: limpia los estilos que el navegador
pone por defecto. Por ejemplo, quita las viñetas de `<ul>` y deja los bordes en estilo sólido
con 0 px, así la clase `border` solo tiene que poner el ancho (1 px).

### theme-inline
`@theme inline { --font-display: var(--font-fraunces); }`. Igual que [`@theme`](#theme), pero
la clase generada lleva el valor directamente (`font-family: var(--font-fraunces)`) en vez de
apuntar a una variable que a su vez apunta a otra. Se usa cuando un token apunta a otra
variable.

### layer-components
`@layer components { ... }` es la capa para clases propias reutilizables (`.price`, `.awning`).
Gana a la capa `base` pero pierde ante las clases de utilidad: en `class="price text-ink"`
gana `text-ink`. (Ver [layer-y-apply](#layer-y-apply).)

### escala-de-texto
Los tamaños y pesos de texto de Tailwind: `text-xs` 12 px, `text-sm` 14 px, `text-base` 16 px,
`text-xl` 20 px, `text-2xl` 24 px, `text-3xl` 30 px (cada uno con su altura de línea);
`font-medium` = peso 500, `font-semibold` = 600.

### fuente-web
Un archivo de tipografía (aquí WOFF2, el formato más comprimido) que el navegador descarga
para pintar el texto. "Autoalojada" significa que se sirve desde el mismo dominio del sitio,
no desde Google Fonts. Aquí solo hay una: Fraunces 600, para títulos y precios.

### pila-de-fuentes-del-sistema
La lista de fuentes que ya trae el dispositivo (la de Android, la de iPhone…). Es lo que usa
`font-sans` de Tailwind. No descarga nada, por eso el texto normal sale al instante.

### fuente-de-respaldo
La fuente que se usa mientras la [fuente web](#fuente-web) no ha llegado, o si falla. Astro
ajusta sus medidas para que ocupe casi el mismo espacio y el texto no salte al cambiar.

### font-display
Propiedad de `@font-face` que decide qué ve el usuario mientras se descarga la fuente. `swap`
muestra el texto en seguida con la [fuente de respaldo](#fuente-de-respaldo) y la cambia al
llegar; `block` lo deja invisible un momento.

### layer-y-apply
`@layer base { ... }` agrupa estilos por prioridad: la capa `base` pone estilos por defecto a
etiquetas (`h1`, `body`), y las clases de utilidad siempre le ganan. `@apply bg-cream` dentro
de una regla CSS copia ahí el CSS de esa clase.

### stretched-link
Truco para que toda una tarjeta sea clicable con un solo enlace: la tarjeta lleva `relative` y
el enlace un `::after` con `absolute inset-0`, que se estira sobre toda la tarjeta. Un clic en
cualquier punto cae en ese `::after`, que pertenece al enlace.

### unidades-tailwind
Los números de Tailwind son múltiplos de 0,25 rem (4 px): `p-4` = 16 px, `min-h-11` = 44 px,
`gap-12` = 48 px. `max-w-5xl` = 64 rem (1024 px) de ancho máximo.

### flex-wrap
`flex-wrap` = `flex-wrap: wrap`. En una fila `flex`, los hijos que ya no caben en el ancho
**bajan a una línea nueva**, en vez de apretarse o salirse por el borde (que daría scroll
horizontal). Suele ir con `justify-between` (`justify-content: space-between`: el primero a la
izquierda, el último a la derecha) y con `gap-*`, que también separa las líneas entre sí.

<a id="full-bleed"></a>
### banda-a-todo-el-ancho
Un bloque que va **fuera** del contenedor de página (`mx-auto max-w-5xl`: centrado y como mucho
1024 px), así que su fondo llega de un borde de la pantalla al otro. Dentro lleva otra vez ese
contenedor, para que su texto quede alineado con el resto de la página. En inglés se llama
*full-bleed*. Aquí: la banda de información de la portada y el pie de página oscuro.

### outline
`outline` es una línea que el navegador dibuja alrededor de un elemento, por fuera de su caja:
no ocupa sitio ni mueve nada. El contorno de [foco](#focus-visible) es un `outline`; en este
proyecto, 2 px en `accent` (`global.css`). La clase `outline-cream` de Tailwind cambia solo su
color (`outline-color: var(--color-cream)`), y con la [variante](#variante) `focus-visible:`
(`focus-visible:outline-cream`) solo mientras se ve ese contorno.

---

## HTML y accesibilidad

### accesibilidad
Que el sitio funcione para todo el mundo: con lector de pantalla (un programa que lee la
página en voz alta), solo con teclado o con poca vista. Se cuida con HTML correcto y
atributos `aria-*`.

### aria-label
Da un nombre a un elemento para el lector de pantalla:
`<nav aria-label="Categorías">` se anuncia como "navegación Categorías".
`aria-labelledby="carnicos"` hace lo mismo tomando el texto de otro elemento por su `id`.

### nombre-accesible
El texto con el que el lector de pantalla anuncia un elemento: en un enlace, normalmente su
texto; en una imagen, su `alt`. Se puede cambiar con [`aria-label`](#aria-label).

<a id="alt-vacio"></a>
### imagen-decorativa
Una imagen que no añade información, como un icono junto a una palabra que ya dice lo mismo.
Se marca con `alt=""` (texto alternativo vacío, no ausente): el lector de pantalla la salta, y
el [nombre accesible](#nombre-accesible) del enlace que la contiene sigue siendo solo su texto.

<a id="noindex"></a>
### meta-robots
`<meta name="robots" content="noindex">` pide a los buscadores (Google…) que no muestren esa
página en sus resultados. Aquí lo usa la página interna `/estilo`, a través de la prop
`noindex` de `BaseLayout`.

### contraste-wcag
La diferencia de luminosidad entre texto y fondo, medida como proporción (por ejemplo 6,04 a
1). La norma WCAG nivel AA pide al menos 4,5 a 1 para texto normal, para que se lea con poca
vista o con sol en la pantalla.

### aria-current
`aria-current="page"` marca el enlace que lleva a la página donde ya estás. El lector de
pantalla dice "página actual".

### aria-hidden
`aria-hidden="true"` oculta un elemento decorativo al lector de pantalla (el toldo, un punto
de color).

### sr-only
Clase de Tailwind que oculta un elemento a la vista pero lo deja para el lector de pantalla
(*screen reader only*). Se usa en etiquetas `<label>` que no hace falta ver.

### jerarquia-de-titulos
`h1` → `h2` → `h3`, sin saltos. El lector de pantalla permite saltar de título en título,
así que el orden importa: un `h1` por página, `h2` por sección, `h3` dentro.

### focus-visible
`:focus-visible` es el contorno que aparece cuando llegas a un enlace o botón con el teclado
(Tab). Nunca se quita: es como se orienta quien no usa ratón.

### area-tactil
El tamaño mínimo de algo que se toca con el dedo: 44 × 44 px en este proyecto
(`min-h-11`).

### details-summary
`<details>` es un bloque plegable que trae HTML: al principio solo se ve su `<summary>` (el
título), con un triangulito delante que pinta el navegador. Al tocar el título se despliega el
resto del contenido, y al tocarlo otra vez se pliega. Funciona **sin JavaScript** y con teclado
(Tab hasta el título, Enter para abrir). Con el atributo `open` empieza desplegado.

### atributo-data
`data-algo="valor"` en cualquier etiqueta: un atributo con nombre inventado por ti para guardar
datos en el HTML. No cambia cómo se ve nada. Desde JavaScript se lee con
`elemento.dataset.algo`; los guiones pasan a *camelCase*: `data-supabase-url` →
`dataset.supabaseUrl`. También sirve para encontrar elementos sin usar clases ni `id`:
`querySelector('[data-view="recover"]')`.

### atributo-hidden
`<section hidden>` oculta el elemento, como `display: none`: no se ve, no ocupa sitio y el
lector de pantalla lo salta. Desde JavaScript se pone y se quita con `elemento.hidden = true` o
`false`. El [preflight](#preflight) de Tailwind lo refuerza con `display: none !important`, para
que una clase como `flex` no lo vuelva a mostrar.

### validacion-de-formularios
HTML trae comprobaciones propias en los campos: `required` (obligatorio), `type="email"` (con
forma de email), `minlength="8"` (al menos 8 caracteres). Normalmente el navegador las revisa al
enviar el formulario y, si algo falla, muestra un aviso junto al campo y no lo envía.
`novalidate` en el `<form>` apaga esa revisión automática, y `form.reportValidity()` la lanza a
mano cuando tú quieras: revisa los campos, muestra el aviso del primero que falla y devuelve
`true` si todo está bien o `false` si no.

### autocomplete
`autocomplete="email"`, `"current-password"` (la contraseña de siempre) o `"new-password"` (una
contraseña nueva) en un `<input>` le dice al navegador y al gestor de contraseñas qué va en ese
campo, para que lo rellene solo o proponga una contraseña segura.

### noscript
`<noscript>…</noscript>`: su contenido solo se muestra si el navegador **no** ejecuta
JavaScript (porque está desactivado o bloqueado). Si JavaScript funciona, se ignora.

### role-alert-status
`role="alert"` y `role="status"` marcan una zona cuyo texto va a cambiar. Cuando JavaScript
escribe en ella, el lector de pantalla lo lee en voz alta sin que el usuario tenga que ir hasta
allí: `alert` interrumpe en el momento (para errores), `status` espera a que termine lo que está
leyendo (para avisos tranquilos).

---

## Web y rendimiento

### open-graph
Etiquetas `<meta property="og:...">` en el `<head>` (título, descripción, imagen, URL). Son
las que lee WhatsApp para armar la vista previa cuando pegas un enlace.

### preload
`<link rel="preload" as="font">` pide al navegador que descargue un archivo cuanto antes, sin
esperar a encontrarlo dentro del CSS. Aquí se usa con la fuente de títulos.

### click-to-chat
El enlace oficial de WhatsApp para abrir un chat: `https://wa.me/<número>?text=<mensaje>`. El
número va en formato internacional, solo dígitos y sin `+`; el mensaje, pasado por
[encodeURIComponent](#encodeuricomponent). En el móvil abre la app y en el ordenador WhatsApp
Web, con el mensaje ya escrito; el usuario solo pulsa enviar.

### url-absoluta
Una URL completa con dominio (`https://tienda.com/foto.png`) en vez de una relativa
(`/foto.png`). Open Graph las exige.

### gzip
Compresión que el servidor aplica a HTML, CSS y JS antes de enviarlos; el navegador los
descomprime. Por eso el presupuesto de peso se mide "gzipped": es lo que viaja por la red.

### presupuesto-de-peso
Los límites de KB por página que fija la spec 0001 (HTML + CSS ≤ 50 KB, imágenes de la
primera vista ≤ 150 KB…), pensados para conexiones lentas en Cuba. La página del dueño,
`/admin/`, tiene uno propio (spec 0014): el mismo, pero con hasta 15 KB de JavaScript en vez
de 5.

### codigo-de-estado-http
El número con el que un servidor dice cómo fue una petición (en Express lo eliges con
`res.status(404)`). [fetch](#fetch) lo da en `response.status`. Los que aparecen en este
proyecto: `200` = todo bien; `400` = la petición no vale (por ejemplo, una contraseña incorrecta);
`401` = "no sé quién eres" (falta la identificación o no sirve); `403` = "no te dejo" (sé lo que
pides y lo rechazo); `422` = "te entiendo, pero el dato no vale" (una contraseña demasiado
corta); `429` = "demasiadas peticiones, espera un poco"; `5xx` (`500`, `503`…) = falló el
propio servidor. Supabase añade a sus respuestas de error un **código de error** en texto
(`invalid_credentials`, `bad_jwt`…) que precisa qué pasó, y no siempre usa el número que
esperarías: por ejemplo, contesta con `403` a un [token de sesión](#jwt) que no vale.

### fragmento-de-url
La parte de una dirección que va detrás de `#`. En
`https://tienda.com/admin/#access_token=abc`, el fragmento es `access_token=abc`. Lo normal es
usarlo para saltar a un `id` de la página (`#contacto`). Dos cosas importantes: el navegador
**nunca lo envía al servidor** (Vercel recibe solo `/admin/`), y JavaScript lo lee con
`location.hash` (que incluye el `#` del principio).

### url-search-params
`new URLSearchParams('a=1&b=dos')` convierte un texto con la forma `clave=valor&clave=valor` en
un objeto que se consulta con `.get('a')` (da el texto `'1'`, o `null` si no está) y `.has('b')`
(`true` o `false`). Deshace solo los códigos `%XX` de [encodeURIComponent](#encodeuricomponent).
Es lo que Express te da hecho en `req.query`.

### history-replacestate
`history.replaceState(null, '', nuevaDireccion)` cambia la dirección que se ve en la barra **sin
recargar la página** y **sin añadir** una entrada al historial: sustituye la actual. Así, el
botón "atrás" ya no puede volver a la dirección vieja. (`location.pathname` es la ruta de la
dirección, `/admin/`, y `location.search` la parte `?…`, si la hay.)

### localstorage
Un pequeño almacén de textos que el navegador guarda **para cada sitio web** y que sobrevive a
cerrar la pestaña y el navegador. `localStorage.setItem('clave', 'texto')` guarda,
`localStorage.getItem('clave')` lee (o da `null` si no hay nada) y
`localStorage.removeItem('clave')` borra. Solo guarda texto, así que un objeto se convierte antes
con `JSON.stringify(objeto)` y se recupera con `JSON.parse(texto)`. Cualquier script de ese
mismo sitio puede leerlo. En modo privado o con el almacenamiento bloqueado, usarlo puede lanzar
un error. Se ve en las herramientas del navegador (F12 → *Application* → *Local storage*).

---

## Autenticación y sesiones

### autenticacion
Comprobar **quién** es alguien (en inglés, *authentication*, abreviado *auth*). En la web, lo
normal es pedir email y contraseña una vez y, si son correctos, darle al navegador una prueba de
que ya entró, para no pedírselos en cada petición. Esa prueba es la [sesión](#sesion). Decidir
**qué puede hacer** quien ya entró es otra cosa, la autorización; en Supabase la hacen el
[rol](#rol), las [políticas](#politica) y [`app_metadata`](#app-metadata).

### sesion
El estado "ya entraste", que dura de una petición a la siguiente. Si has usado
`express-session`, allí el servidor guarda la sesión y el navegador solo lleva una cookie con un
número. Con [Supabase Auth](#supabase-auth) es al revés: el navegador guarda la sesión entera,
que son dos tokens (un [access token](#access-token) y un [refresh token](#refresh-token)) y la
hora a la que caduca el primero, y manda el access token en cada petición. Aquí se guarda en
[localStorage](#localstorage). "Cerrar sesión" = borrarla del navegador y pedir al servidor que
no acepte más sus tokens.

### jwt
*JSON Web Token* (se pronuncia "jot"). Un texto largo en tres partes separadas por puntos
(`xxxxx.yyyyy.zzzzz`): una cabecera, los datos y una **firma**. Los datos (en inglés, *claims*)
son un pequeño objeto JSON: quién es el usuario (su `email`), su [`app_metadata`](#app-metadata)
y cuándo caduca. La firma la calcula Supabase con una clave que solo él conoce: cualquiera puede
leer los datos, pero si alguien cambia una letra, la firma deja de cuadrar y Supabase lo rechaza.
Por eso Supabase puede fiarse de lo que dice un JWT sin buscarlo en ninguna parte. Viaja en la
cabecera HTTP `Authorization: Bearer <jwt>` (*bearer* = "portador": entra quien lo lleva). No
confundir con un [token de diseño](#token), que es otra cosa.

### access-token
El [JWT](#jwt) que demuestra que tienes una [sesión](#sesion) abierta. Va en cada petición que
necesita saber quién eres. Caduca pronto (con la configuración por defecto de Supabase, que es
la del proyecto, a la hora), para que, si alguien lo roba, le sirva poco tiempo. Al entregarlo,
Supabase dice cuántos segundos le quedan: `expires_in: 3600`.

### refresh-token
El segundo token de la [sesión](#sesion). Solo sirve para una cosa: pedir a
[Supabase Auth](#supabase-auth) un [access token](#access-token) nuevo cuando el actual va a
caducar, sin volver a escribir la contraseña. Supabase contesta con una pareja nueva (access +
refresh) y el refresh token usado queda **gastado**: es de un solo uso (en inglés, *rotation*;
Supabase acepta repetirlo solo durante 10 segundos). En el plan gratuito de Supabase no caduca,
así que la sesión dura hasta que el dueño la cierra (según la spec 0014).

### supabase-auth
La parte de [Supabase](#supabase) que maneja usuarios: guarda sus emails y contraseñas, comprueba
un inicio de sesión, envía el correo para recuperar la contraseña y entrega los tokens de la
[sesión](#sesion). Tiene su propia API, cuyas direcciones empiezan por
`https://<ref>.supabase.co/auth/v1/`: por ejemplo `/auth/v1/token` (entrar o renovar) y
`/auth/v1/user` ("¿quién soy?"). Como en la [API REST](#api-rest), cada petición lleva la
[clave publishable](#clave-publishable) en la cabecera `apikey`.

### app-metadata
Un objeto JSON que [Supabase Auth](#supabase-auth) guarda con cada usuario y copia dentro de su
[JWT](#jwt). El propio usuario **no** puede cambiarlo, aunque tenga sesión; solo quien administra
el proyecto (desde el panel o el [editor SQL](#editor-sql)). Por eso es el sitio seguro para
marcar permisos: aquí, `{ "role": "owner" }` significa "este usuario es el dueño de la tienda".
Su pareja, `user_metadata`, sí la puede cambiar el usuario, así que nunca sirve para permisos.
En la tabla de usuarios de Supabase (`auth.users`) la columna se llama `raw_app_meta_data`. No
confundir este `role` con el [rol](#rol) de Postgres: son dos cosas distintas con el mismo nombre.

### flujo-implicito
Una de las dos formas en que [Supabase Auth](#supabase-auth) entrega una sesión a través de un
enlace de correo (en inglés, *implicit flow*). El enlace pasa primero por Supabase, que lo
comprueba y luego manda al navegador a tu página con los tokens pegados en el
[fragmento](#fragmento-de-url): `…/admin/#access_token=…&expires_in=3600&refresh_token=…&type=recovery`.
Tu página los lee de ahí. Si el enlace ya se usó o caducó, el fragmento trae un error
(`#error=…&error_code=…`). La otra forma (*PKCE*) manda solo un código que hay que canjear desde
el **mismo navegador** que pidió el correo; la spec 0014 eligió la implícita porque en el móvil
la app de correo suele abrir el enlace en su propio navegador.
