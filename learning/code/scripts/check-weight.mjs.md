# `scripts/check-weight.mjs`

> **Qué es:** el script que mide cada página construida contra el presupuesto de peso ·
> **Lo decidió:** [spec 0001](../../../docs/specs/0001-stack.md) (AC7, tabla "Weight budget");
> el presupuesto de `/admin/`, [spec 0014](../../../docs/specs/0014-owner-login.md) (Design →
> Weight) ·
> **Lo usan:** el comando `pnpm check:weight` ([`package.json`](../package.json.md)) ·
> **Usa:** solo módulos que trae Node: `fs`, `path`, `zlib`

## Para qué sirve

La regla que no se puede romper en este proyecto es que el sitio sea ligero, porque en Cuba las
conexiones son lentas. La spec 0001 la convirtió en números: por ejemplo, el HTML + CSS de cada
página no puede pasar de 50 KB comprimidos. Este script lo comprueba solo: recorre `dist/`, mide
las 27 páginas, imprime una tabla y **sale con error** si alguna se pasa. Así nadie tiene que
acordarse de medir a mano, y una página que engorda se detecta en cuanto se ejecuta. Es un
script de Node normal, como los que ya conoces, sin librerías.

Desde la spec 0014 hay una página con reglas propias: la administración del dueño, `/admin/`, la
única con JavaScript. Se mide con su propio presupuesto, que solo cambia el límite de JavaScript
(bloque 2).

## El código, por partes

### 1. Cabecera e imports

```js
// Weight budget check (spec 0001 AC7): measures every built page in dist/ and exits 1 when one
// is over budget. Node built-ins only. Run after `pnpm build`: `pnpm check:weight [distDir]`.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
```

- El comentario: "Comprobación del presupuesto de peso (spec 0001 AC7): mide cada página
  construida en `dist/` y sale con 1 cuando una se pasa. Solo módulos de Node. Se ejecuta
  después de `pnpm build`: `pnpm check:weight [carpeta]`." Los corchetes indican un argumento
  opcional (bloque 3).
- `import fs from 'node:fs';`: el módulo de archivos de Node (`readFileSync`, `statSync`…), el
  mismo que `require('fs')` ([import-export](../glosario.md#import-export)). El prefijo `node:`
  deja claro que viene con Node y no de `node_modules`.
- `import path from 'node:path';`: para unir rutas de carpetas (`path.join`) sin preocuparse de
  `/` o `\` en Windows.
- `import zlib from 'node:zlib';`: compresión. Aquí se usa para calcular cuánto ocupa algo
  comprimido con [gzip](../glosario.md#gzip), que es lo que viaja por la red.
- El archivo termina en `.mjs`: Node lo trata siempre como módulo ES, por eso puede usar
  `import`.

### 2. El presupuesto

```js
// Budget per page, in KB (spec 0001, "Weight budget"). HTML, CSS and JS are measured gzipped;
// fonts and images are already compressed formats, so their file size is what travels.
const BUDGET = {
	htmlCss: 50,
	js: 5,
	fontFile: 25,
	fontFiles: 1,
	thumbnail: 25,
	detailPhoto: 80,
	firstView: 150,
};
```

- El comentario: "Presupuesto por página, en KB (spec 0001). HTML, CSS y JS se miden
  comprimidos con gzip; las fuentes y las imágenes ya son formatos comprimidos, así que lo que
  viaja es el tamaño del archivo." Comprimir un WebP o un WOFF2 otra vez casi no cambia nada.
- `const BUDGET = { … }`: los límites, copiados de la tabla de la spec 0001
  ([presupuesto de peso](../glosario.md#presupuesto-de-peso)). Escribir el nombre en
  mayúsculas es una costumbre para "constante de configuración".
  - `htmlCss: 50`: HTML + CSS de una página, ≤ 50 KB comprimidos.
  - `js: 5`: JavaScript para el navegador, ≤ 5 KB (las páginas de clientes tienen 0).
  - `fontFile: 25` y `fontFiles: 1`: una sola fuente web, de ≤ 25 KB.
  - `thumbnail: 25`: cada miniatura del catálogo, ≤ 25 KB.
  - `detailPhoto: 80`: la foto de la página de producto, ≤ 80 KB.
  - `firstView: 150`: todas las imágenes de la primera pantalla juntas, ≤ 150 KB.

```js

// The owner's admin (/admin/) is the only route allowed client JS (spec 0012), so it gets its
// own JS limit (spec 0014). HTML+CSS, fonts and images keep the public limits.
const ADMIN_BUDGET = { ...BUDGET, js: 15 };
const isAdminRoute = (route) => route.startsWith('/admin/');
```

- El comentario: "La administración del dueño (`/admin/`) es la única ruta a la que se le
  permite JavaScript en el cliente (spec 0012), así que tiene su propio límite de JS (spec 0014).
  HTML+CSS, fuentes e imágenes mantienen los límites públicos."
- `const ADMIN_BUDGET = { ...BUDGET, js: 15 };`: copia todos los límites de `BUDGET`
  ([spread](../glosario.md#spread)) y cambia solo uno: JavaScript hasta 15 KB comprimidos, en vez
  de 5. La spec 0014 lo llama provisional: la feature 12 lo puede subir si lo justifica con una
  medida. Al copiarlo así, si algún día cambia un límite público, la administración lo hereda.
- `const isAdminRoute = (route) => route.startsWith('/admin/');`: una función flecha que dice si
  una ruta es de la administración. Se usa en el bloque 9.

### 3. Qué carpeta medir

```js
const dist = process.argv[2] ?? 'dist';
if (!fs.existsSync(dist)) {
	console.error(`No ${dist}/ folder. Run \`pnpm build\` first.`);
	process.exit(1);
}
```

- `const dist = process.argv[2] ?? 'dist';`: la carpeta a medir. `process.argv` es la lista de
  palabras del comando ([process.argv](../glosario.md#process-argv)); la posición 2 es el primer
  argumento tuyo. Si no pasas ninguno, vale `undefined` y el [`??`](../glosario.md#nullish) usa
  `'dist'`. El argumento existe para poder medir una copia de `dist/` en una prueba.
- `if (!fs.existsSync(dist)) { … }`: si la carpeta no existe (no has hecho el build), escribe
  un aviso en la salida de errores (`console.error`) y termina con
  `process.exit(1)`: un [código de salida](../glosario.md#codigo-de-salida) distinto de 0, que
  marca el comando como fallido. Las comillas invertidas escapadas `\`` dentro del mensaje solo
  sirven para que se vea `` `pnpm build` `` en el texto.

### 4. Funciones pequeñas de ayuda

```js
const kb = (bytes) => bytes / 1024;
const gzipSize = (buffer) => zlib.gzipSync(buffer).length;
// An <img> with no src yet (the admin's photo preview, filled by its script, spec 0017) loads
// nothing at page load, so it counts 0.
const fileSize = (url) => (url ? fs.statSync(path.join(dist, url)).size : 0);
```

- `kb(bytes)`: pasa bytes a KB (1 KB = 1024 bytes).
- `gzipSize(buffer)`: comprime un contenido con gzip **en memoria** y devuelve cuántos bytes
  ocupa comprimido. `buffer` es un [Buffer](../glosario.md#buffer): el contenido de un archivo
  tal cual, en bytes.
- `fileSize(url)`: el tamaño en disco de un archivo de `dist/`. Recibe la ruta tal como sale
  en el HTML (`/_astro/arroz-blanco….webp`) y `path.join` la convierte en
  `dist\_astro\arroz-blanco….webp`.
- El comentario: "Un `<img>` que todavía no tiene `src` (la vista previa de la foto en la
  administración, que rellena su script, spec 0017) no carga nada al abrir la página, así que
  cuenta 0."
  - `url ? … : 0`: si hay ruta, mide el archivo; si no (`undefined`, porque el `<img>` no tiene
    `src`), devuelve `0` sin tocar el disco.
  - Por qué hace falta: el formulario de `/admin/` lleva un `<img data-photo-preview>` vacío, al
    que el script le pone `src` solo cuando el dueño abre un producto o elige una foto. Para ese
    `<img>`, `largestImage()` (bloque 6) no encuentra ni `srcset` ni `src` y devuelve
    `undefined`. Sin la comprobación, `path.join(dist, undefined)` lanzaría un error y el script
    entero se pararía.

### 5. Encontrar todas las páginas

```js
function findPages(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return findPages(full);
		return entry.name.endsWith('.html') ? [full] : [];
	});
}
```

- Recorre una carpeta y todas sus subcarpetas, y devuelve la lista de archivos `.html`.
- `fs.readdirSync(dir, { withFileTypes: true })`: lista lo que hay dentro, y con
  `withFileTypes` cada elemento sabe si es carpeta o archivo.
- `.flatMap(…)`: como `map`, pero si cada elemento devuelve una lista, las junta todas en una
  sola (en vez de una lista de listas).
- `if (entry.isDirectory()) return findPages(full);`: si es una carpeta, la función **se llama a
  sí misma** con esa carpeta (recursividad), y así baja por `categoria/aseo/`,
  `producto/huevos/`…
- `return entry.name.endsWith('.html') ? [full] : [];`: si es un HTML, lo devuelve en una lista
  de uno; si es otra cosa (una imagen, un CSS), una lista vacía, que `flatMap` hace desaparecer.

### 6. La imagen más grande que puede pedir un `<img>`

```js
// The largest file an <img> can request: the widest srcset candidate, or src if there is none.
function largestImage(imgTag) {
	const srcset = imgTag.match(/srcset="([^"]+)"/)?.[1];
	if (!srcset) return imgTag.match(/src="([^"]+)"/)?.[1];
	const candidates = srcset.split(',').map((part) => {
		const [url, width] = part.trim().split(/\s+/);
		return { url, width: Number.parseInt(width, 10) || 0 };
	});
	return candidates.sort((a, b) => b.width - a.width)[0].url;
}
```

- El comentario: "El archivo más grande que puede pedir un `<img>`: el candidato más ancho del
  `srcset`, o `src` si no hay `srcset`."
- Por qué el más grande: con [srcset](../glosario.md#srcset) el navegador elige versión según
  la pantalla, y en un móvil de doble densidad suele pedir la de 400 px (catálogo) o 800 px
  (producto). Medir la más grande es medir el peor caso.
- `imgTag.match(/srcset="([^"]+)"/)?.[1]`: busca con una
  [expresión regular](../glosario.md#expresion-regular) el texto del atributo `srcset`. `[1]` es
  lo que hay entre los paréntesis del patrón; el `?.`
  ([encadenamiento opcional](../glosario.md#encadenamiento-opcional)) evita un error si no lo
  encuentra.
- `if (!srcset) return …src…`: sin `srcset`, la imagen solo puede pedir su `src`.
- `srcset.split(',')`: el texto `"/a-200.webp 200w, /a-400.webp 400w"` se parte por las comas.
- `part.trim().split(/\s+/)`: cada trozo se parte por los espacios en `[url, '400w']`
  ([desestructuración](../glosario.md#desestructuracion) de una lista).
- `Number.parseInt(width, 10) || 0`: convierte `'400w'` en el número `400` (`parseInt` se para
  en la `w`); si no hubiera número, `0`.
- `candidates.sort((a, b) => b.width - a.width)[0].url`: ordena de más ancho a menos
  ([ordenar con sort](../glosario.md#ordenar-con-sort)) y devuelve la URL del primero.

### 7. Medir una página: HTML, CSS y JavaScript

```js
function measure(file) {
	const html = fs.readFileSync(file, 'utf8');
	const route = '/' + path.relative(dist, file).split(path.sep).join('/').replace(/index\.html$/, '');

	const cssFiles = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
	const htmlCss = gzipSize(Buffer.from(html)) + cssFiles.reduce((sum, url) => sum + gzipSize(fs.readFileSync(path.join(dist, url))), 0);

	const jsFiles = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
	const inlineJs = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('');
	const js =
		jsFiles.reduce((sum, url) => sum + gzipSize(fs.readFileSync(path.join(dist, url))), 0) +
		(inlineJs ? gzipSize(Buffer.from(inlineJs)) : 0);
```

- `const html = fs.readFileSync(file, 'utf8');`: lee la página como texto.
- `const route = …`: convierte la ruta del archivo en la URL que se muestra en la tabla:
  `dist\producto\huevos\index.html` → `producto\huevos\index.html` (`path.relative`) →
  `producto/huevos/index.html` (cambia `\` de Windows por `/`) → `/producto/huevos/` (quita
  `index.html` del final y pone `/` delante).
- `cssFiles`: busca todas las etiquetas `<link rel="stylesheet" href="…">` y se queda con sus
  `href`. `html.matchAll(…)` devuelve **todas** las coincidencias; `[...]` las convierte en lista
  ([spread](../glosario.md#spread)).
- `htmlCss`: el HTML comprimido **más** cada CSS que enlaza, comprimido. `Buffer.from(html)`
  convierte el texto en bytes para poder comprimirlo. `reduce` suma los CSS
  ([reduce](../glosario.md#reduce)). Si Astro metió algún CSS dentro del propio HTML (en una
  etiqueta `<style>`), ya cuenta como parte del HTML.
- `jsFiles`: los `<script src="…">`, archivos de JavaScript aparte.
- `inlineJs`: el JavaScript escrito **dentro** de etiquetas `<script>…</script>` que no tienen
  `src`. La parte `(?![^>]*\bsrc=)` del patrón significa "que no tenga `src=` en la etiqueta".
  `[\s\S]*?` es "cualquier cosa, incluidos saltos de línea, lo mínimo posible".
- `js`: la suma de los dos, comprimidos. Da 0 en todas las páginas de clientes, que no mandan
  JavaScript (spec 0001). Solo `/admin/` tiene: su `<script type="module" src="…">` pesaba 2,6 KB
  comprimido el 2026-10-23, y 5,2 KB el 2026-10-27, con la gestión de productos de la spec 0015.

### 8. Medir una página: fuentes e imágenes

```js
	const fonts = [...new Set([...html.matchAll(/["'(]([^"'()]+\.woff2)["')]/g)].map((m) => m[1]))];
	const fontSizes = fonts.map(fileSize);

	// Product pages show one detail photo; every other page shows catalog thumbnails (spec 0001).
	const isProduct = route.startsWith('/producto/');
	const images = [...html.matchAll(/<img[^>]*>/g)].map((m) => ({
		size: fileSize(largestImage(m[0])),
		eager: /loading="eager"/.test(m[0]),
	}));
	const imageLimit = isProduct ? BUDGET.detailPhoto : BUDGET.thumbnail;
	const largest = Math.max(0, ...images.map((image) => image.size));
	const firstView = images.filter((image) => image.eager).reduce((sum, image) => sum + image.size, 0);
```

- `fonts`: busca cualquier ruta que acabe en `.woff2` entre comillas o paréntesis (aparece en
  el `<link rel="preload">` y en el CSS de la fuente). La misma fuente sale dos veces, así que
  se meten en un [Set](../glosario.md#set), que no admite repetidos, y se vuelven a convertir en
  lista con `[...]`. Resultado: una sola fuente, Fraunces.
- `fontSizes`: el tamaño en disco de cada fuente.
- El comentario: "Las páginas de producto muestran una foto de detalle; el resto, miniaturas
  del catálogo (spec 0001)."
- `isProduct`: si la URL empieza por `/producto/`.
- `images`: por cada `<img>` de la página guarda dos datos: el tamaño de su versión más grande
  (`largestImage`, bloque 6) y si carga en seguida (`loading="eager"`). Las imágenes eager son
  las de la primera pantalla (specs 0005 y 0006, [lazy loading](../glosario.md#lazy-loading)).
- `imageLimit`: 80 KB en productos, 25 KB en el resto.
- `largest`: la imagen más pesada de la página. `Math.max(0, ...lista)` usa el
  [spread](../glosario.md#spread) para pasar la lista como números sueltos; el `0` evita un
  resultado raro si la página no tiene imágenes.
- `firstView`: la suma de las imágenes eager.

### 9. Medir una página: decidir si pasa

```js
	const failures = [];
	const budget = isAdminRoute(route) ? ADMIN_BUDGET : BUDGET;
	if (kb(htmlCss) > budget.htmlCss) failures.push(`HTML+CSS ${kb(htmlCss).toFixed(1)} > ${budget.htmlCss} KB`);
	if (kb(js) > budget.js) failures.push(`JS ${kb(js).toFixed(1)} > ${budget.js} KB`);
	if (fonts.length > BUDGET.fontFiles) failures.push(`${fonts.length} font files > ${BUDGET.fontFiles}`);
	if (fontSizes.some((size) => kb(size) > BUDGET.fontFile)) failures.push(`font file > ${BUDGET.fontFile} KB`);
	if (kb(largest) > imageLimit) failures.push(`image ${kb(largest).toFixed(1)} > ${imageLimit} KB`);
	if (kb(firstView) > BUDGET.firstView) failures.push(`first view ${kb(firstView).toFixed(1)} > ${BUDGET.firstView} KB`);
```

- `failures`: una lista donde se apunta cada límite superado, con su número.
- `const budget = isAdminRoute(route) ? ADMIN_BUDGET : BUDGET;`: elige el presupuesto de esta
  página: el de la administración para `/admin/`, el público para todas las demás. Las dos líneas
  siguientes (HTML+CSS y JS) usan `budget`, en minúscula; el resto sigue usando `BUDGET`, porque
  fuentes e imágenes tienen los mismos límites en las dos.
- Cada `if` compara una medida con su límite y, si se pasa, añade un texto como
  `HTML+CSS 84.2 > 50 KB` ([template literal](../glosario.md#template-literal)).
  `.toFixed(1)` deja un decimal.
- `fontSizes.some(…)`: `some` es verdadero si **al menos uno** de los elementos cumple la
  condición.

### 10. Medir una página: la fila de la tabla

```js
	return {
		page: route,
		'HTML+CSS': kb(htmlCss).toFixed(1),
		JS: kb(js).toFixed(1),
		font: kb(Math.max(0, ...fontSizes)).toFixed(1),
		'max img': `${kb(largest).toFixed(1)} / ${imageLimit}`,
		'1st view': kb(firstView).toFixed(1),
		result: failures.length ? `FAIL: ${failures.join('; ')}` : 'ok',
	};
}
```

- Devuelve un objeto: cada clave será una columna de la tabla. Las claves con espacios o
  símbolos (`'HTML+CSS'`, `'max img'`) van entre comillas.
- `'max img'`: la imagen más pesada y su límite, por ejemplo `22.8 / 25`.
- `result`: `ok`, o `FAIL:` seguido de todo lo que falló, separado por `; `.
- `}` cierra la función `measure`.

### 11. Ejecutar y decidir el resultado

```js
const rows = findPages(dist).sort().map(measure);
console.log(`Weight budget (KB): HTML+CSS ≤ ${BUDGET.htmlCss} gz · JS ≤ ${BUDGET.js} gz · font ≤ ${BUDGET.fontFile} · thumbnail ≤ ${BUDGET.thumbnail} · detail photo ≤ ${BUDGET.detailPhoto} · first view ≤ ${BUDGET.firstView}`);
console.log(`Admin (/admin/): HTML+CSS ≤ ${ADMIN_BUDGET.htmlCss} gz · JS ≤ ${ADMIN_BUDGET.js} gz`);
console.table(rows);

const failed = rows.filter((row) => row.result !== 'ok');
if (failed.length) {
	console.error(`${failed.length} page(s) over budget.`);
	process.exit(1);
}
console.log(`All ${rows.length} pages within budget.`);
```

- `findPages(dist).sort().map(measure)`: encuentra las páginas, las ordena alfabéticamente y
  mide cada una. Resultado: una fila por página.
- El primer `console.log`: una línea con los límites, para leer la tabla sin abrir la spec.
- El segundo: los límites de la administración, `Admin (/admin/): HTML+CSS ≤ 50 gz · JS ≤ 15 gz`.
- `console.table(rows)`: imprime la lista de objetos como una tabla con bordes
  ([console.table](../glosario.md#console-table)).
- `failed`: las filas que no dicen `ok`.
- Si hay alguna: avisa cuántas y termina con `process.exit(1)` → el comando falla.
- Si no: `All 27 pages within budget.` y Node termina solo con código 0 → el comando pasa.

## Cómo se conecta

- **Entra:** la carpeta `dist/` que deja `pnpm build` (o la que pases como argumento).
- **Sale:** una tabla en la terminal y un código de salida: 0 si todo cabe en el presupuesto, 1
  si algo se pasa o si no hay `dist/`.
- **Los límites** salen de la tabla "Weight budget" de la
  [spec 0001](../../../docs/specs/0001-stack.md); qué imagen cuenta como miniatura, foto de
  detalle o primera vista sale de las specs 0005 y 0006. El presupuesto de `/admin/` sale de la
  sección Design → Weight de la [spec 0014](../../../docs/specs/0014-owner-login.md).
- **Mide también** la página [`/admin/`](../src/pages/admin/index.astro.md), con
  `ADMIN_BUDGET`.
- **No forma parte del build:** hoy se ejecuta a mano después de `pnpm build`.

## Prueba tú

1. En la terminal de VS Code: `pnpm build` y luego `pnpm check:weight`.
2. **Qué deberías ver:** las dos líneas de límites, la tabla con 27 filas, todas `ok`, y
   `All 27 pages within budget.`. Medido el 2026-10-23: HTML + CSS entre 5,7 y 7,8 KB por
   página, JS 0 en todas salvo `/admin/` (2,6 KB; 5,2 KB desde la spec 0015), la fuente 17,7 KB, la miniatura más pesada
   22,8 KB y la foto de detalle más pesada 58,5 KB. `/admin/` es la primera fila, porque la tabla
   va en orden alfabético.
3. Ahora haz que falle solo la administración: abre `scripts/check-weight.mjs` y cambia
   `{ ...BUDGET, js: 15 }` por `{ ...BUDGET, js: 2 }`. Ejecuta `pnpm check:weight` otra vez: la
   fila `/admin/` dice `FAIL: JS 2.6 > 2 KB`, las otras 26 siguen `ok`, sale
   `1 page(s) over budget.` y, si escribes `echo $?` (Git Bash) o `$LASTEXITCODE` (PowerShell),
   verás `1`. Las páginas de clientes no se enteran: tienen 0 KB de JavaScript y su límite es
   otro.
4. **Deshacer:** vuelve a poner `js: 15` y guarda.
5. Si quieres ver fallar todas: cambia `htmlCss: 50,` por `htmlCss: 5,` en `BUDGET`. Las 27 filas
   dicen `FAIL: HTML+CSS … > 5 KB` (la más ligera pesa 5,7 KB), también `/admin/`, porque
   `ADMIN_BUDGET` copia ese límite, y sale `27 page(s) over budget.`. **Deshacer:** vuelve a
   poner `htmlCss: 50,` y guarda.

## Términos

- [presupuesto-de-peso](../glosario.md#presupuesto-de-peso) · [gzip](../glosario.md#gzip) ·
  [codigo-de-salida](../glosario.md#codigo-de-salida)
- [process-argv](../glosario.md#process-argv) · [buffer](../glosario.md#buffer) ·
  [set](../glosario.md#set) · [console-table](../glosario.md#console-table)
- [import-export](../glosario.md#import-export) · [nullish](../glosario.md#nullish) ·
  [spread](../glosario.md#spread) · [reduce](../glosario.md#reduce) ·
  [ordenar-con-sort](../glosario.md#ordenar-con-sort) ·
  [desestructuracion](../glosario.md#desestructuracion) ·
  [encadenamiento-opcional](../glosario.md#encadenamiento-opcional) ·
  [template-literal](../glosario.md#template-literal) ·
  [expresion-regular](../glosario.md#expresion-regular)
- [srcset](../glosario.md#srcset) · [lazy-loading](../glosario.md#lazy-loading)
