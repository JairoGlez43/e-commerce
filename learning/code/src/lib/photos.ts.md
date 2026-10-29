# `src/lib/photos.ts`

> **Qué es:** las fotos de los productos vistas desde el navegador del dueño: reducir en el móvil
> la foto que elige, darle un nombre nuevo, subirla al bucket de Supabase y borrarla · **Lo
> decidió:** [spec 0017](../../../../docs/specs/0017-product-photos-upload.md) (Decision y Design
> → `src/lib/photos.ts`) · **Lo usan:** el `<script>` de
> [`src/pages/admin/index.astro`](../pages/admin/index.astro.md) (`preparePhoto()` y
> `publicPhotoUrl()`) y [`products.ts`](products.ts.md) (`uploadPhoto()` y `deletePhoto()`) ·
> **Usa:** `authFetch()` y `AuthError` de [`auth.ts`](auth.ts.md), la clase `ProductError` de
> [`products.ts`](products.ts.md), el bucket `product-photos` y sus políticas de
> [`photos.sql`](../../supabase/photos.sql.md)

## Para qué sirve

Con la feature 14, el dueño le pone foto a un producto desde `/admin/`. El problema: una foto de
móvil pesa de 3 a 12 MB, a veces viene en [HEIC](../../glosario.md#heic) (el formato del
iPhone) y lleva dentro el lugar GPS donde se hizo ([EXIF](../../glosario.md#exif)). El dueño la
sube con datos móviles de Cuba, lentos y caros, y desde su casa. Este archivo es **el único sitio
que sabe las reglas de las fotos**:

1. **Reducirla en el móvil antes de mandarla** (`preparePhoto()`): la dibuja más pequeña en un
   [canvas](../../glosario.md#canvas) y saca un JPEG nuevo. Unos cientos de KB en vez de varios
   MB, sin GPS y siempre en JPEG.
2. **Darle un nombre nuevo cada vez** (`photoPath()`): `arroz-blanco-3f9a0c7e.jpg`. Nunca se
   sobrescribe un archivo, así que nadie puede enseñar por error la foto vieja guardada.
3. **Subirla y borrarla** (`uploadPhoto()`, `deletePhoto()`): peticiones a Supabase Storage
   ([Storage y bucket](../../glosario.md#storage-y-bucket)) con la sesión del dueño, a través de
   `authFetch()`.
4. **La dirección pública de una foto** (`publicPhotoUrl()`), para que el formulario enseñe la
   que el producto ya tiene.

En qué orden se hacen esos pasos al guardar (subir primero, luego guardar la fila, luego borrar
la vieja) no lo decide este archivo, sino `saveProduct()` de
[`products.ts`](products.ts.md#18-guardar-un-producto-con-su-foto-saveproduct).

Como `products.ts`, **corre en el navegador del dueño, no en el build**. Y no protege nada por sí
solo: quien decide quién puede subir o borrar son las
[políticas de Storage](../../glosario.md#politicas-de-storage) de
[`photos.sql`](../../supabase/photos.sql.md), y los límites del propio bucket (solo JPEG, como
mucho 2 MB).

## El código, por partes

### 1. El comentario de cabecera y los imports

```ts
// The owner's product photos in Supabase Storage, with plain fetch and no SDK (spec 0017).
// Browser only: imported by src/lib/products.ts and the admin page's script. The single home of
// the photo rules: how a phone photo is shrunk, how its file is named, and how it is uploaded
// and deleted. What really protects the bucket is RLS with public.is_owner() and the bucket's own
// limits (supabase/photos.sql).
import { AuthError, authFetch } from './auth';
import { ProductError } from './products';
```

- El comentario: "Las fotos de los productos del dueño en Supabase Storage, con `fetch` a secas y
  sin SDK (spec 0017). Solo navegador: lo importan `src/lib/products.ts` y el script de la página
  de administración. El único sitio de las reglas de las fotos: cómo se reduce una foto de móvil,
  cómo se llama su archivo y cómo se sube y se borra. Lo que de verdad protege el bucket es RLS
  con `public.is_owner()` y los límites del propio bucket (`supabase/photos.sql`)."
- `import { AuthError, authFetch } from './auth';`:
  - `authFetch`: manda una petición a Supabase con la sesión del dueño y la renueva si hace falta
    ([`auth.ts.md`](auth.ts.md#18-capa-2-un-reintento-si-supabase-rechaza-el-token)).
  - `AuthError`: la clase de error de la sesión. Aquí solo se usa para escribir bien un fallo en
    la consola (bloque 9).
- `import { ProductError } from './products';`: la clase de error de los productos
  ([`products.ts.md`](products.ts.md#3-los-errores)). Una subida que falla se convierte en un
  `ProductError` (bloque 8), así la página usa la misma tabla de mensajes que para guardar un
  producto. `products.ts` también importa de este archivo; por qué eso funciona está en su
  bloque 1.

### 2. El error propio

```ts

// Thrown only by preparePhoto(); the page turns it into a Spanish message.
export class PhotoError extends Error {
	constructor(readonly kind: 'unreadable') {
		super(`Photos: ${kind}`);
		this.name = 'PhotoError';
	}
}
```

- El comentario: "Solo lo lanza `preparePhoto()`; la página lo convierte en un mensaje en
  español."
- La misma forma que `AuthError` ([`auth.ts.md`](auth.ts.md#3-los-errores)): una
  [clase](../../glosario.md#clase) de error que lleva su `kind`. Aquí solo hay uno posible,
  `'unreadable'` ("no se puede leer"): la foto no se pudo abrir. La página lo enseña como "No se
  pudo abrir esta foto. Prueba con otra.".

### 3. Las constantes

```ts

// The browser's copy of the bucket name. src/lib/supabase.ts keeps the build's copy: importing
// either way would drag build-only or browser-only code across.
const BUCKET = 'product-photos';
```

- El comentario: "La copia del navegador del nombre del bucket. `src/lib/supabase.ts` guarda la
  copia del build: importarlo en cualquiera de los dos sentidos arrastraría código que solo vale
  para el build, o solo para el navegador, al otro lado."
- Normalmente un valor vive en un solo sitio. Aquí hay dos copias a propósito:
  [`supabase.ts`](supabase.ts.md#3-dos-constantes) lee
  [variables de entorno](../../glosario.md#variable-de-entorno) que solo existen en el build, y
  este archivo usa `document` y `canvas`, que solo existen en el navegador. Cada copia lleva un
  comentario que nombra a la otra, para que quien cambie una cambie las dos.

```ts
// The largest public rendition is 800 px square (product page), so 1000 keeps a margin for the
// square crop. The long side limit keeps panoramas small.
const MAX_SHORT_SIDE = 1000;
const MAX_LONG_SIDE = 2000;
const JPEG_QUALITY = 0.8;
```

- El comentario: "La versión pública más grande es un cuadrado de 800 px (la página de producto),
  así que 1000 deja margen para el recorte cuadrado. El límite del lado largo mantiene pequeñas
  las panorámicas."
- `MAX_SHORT_SIDE = 1000`: el lado corto de la foto se queda en 1000 px como mucho. La web
  pública recorta cada foto en cuadrado, y el cuadrado sale del lado corto: con 1000 px hay de
  sobra para el de 800 px.
- `MAX_LONG_SIDE = 2000`: el lado largo, como mucho 2000 px. Una foto normal (4:3) no llega a ese
  límite; una panorámica muy alargada sí, y así no sale enorme.
- `JPEG_QUALITY = 0.8`: la calidad del JPEG, de 0 a 1 ([canvas](../../glosario.md#canvas)).

### 4. Las direcciones y el JPEG

```ts

// Paths follow the rule a-z0-9-. only (supabase/photos.sql), so they need no encoding.
function objectPath(path: string): string {
	return `/storage/v1/object/${BUCKET}/${path}`;
}
```

- El comentario: "Los nombres siguen la regla 'solo `a-z0-9-.`' (`supabase/photos.sql`), así que
  no hace falta codificarlos."
- `objectPath('arroz-blanco-3f9a0c7e.jpg')` da
  `/storage/v1/object/product-photos/arroz-blanco-3f9a0c7e.jpg`: la ruta de Supabase Storage para
  subir (`POST`) o borrar (`DELETE`) ese archivo. `authFetch` le pone delante la dirección del
  proyecto.
- Sin [encodeURIComponent](../../glosario.md#encodeuricomponent): los nombres solo tienen letras
  minúsculas, dígitos, guiones y el punto, que nunca rompen una dirección.

```ts

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
	return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
}
```

- `canvas.toBlob(…)` saca un JPEG de lo dibujado en el [canvas](../../glosario.md#canvas), pero
  avisa llamando a una función (un *callback*), no con una promesa, así que no se puede esperar
  con `await`.
- `new Promise((resolve) => …)`: crea una promesa a mano ([async-await](../../glosario.md#async-await)).
  `resolve` es la función que la cumple con un valor. Se le pasa a `toBlob` como callback: cuando
  el JPEG está listo, `toBlob` llama a `resolve(blob)` y la promesa se cumple con ese
  [Blob](../../glosario.md#blob), o con `null` si no pudo. Ahora sí: `await toBlob(canvas)`.

### 5. Reducir la foto: `preparePhoto()`

```ts

// Shrinks a phone photo before it travels: shorter side at most 1000 px, never enlarged, as
// JPEG. Re-encoding drops the EXIF metadata (the GPS location too) and turns HEIC into JPEG.
export async function preparePhoto(file: File): Promise<Blob> {
	let bitmap: ImageBitmap | undefined;
	try {
		// Applies the EXIF orientation by default (imageOrientation: "from-image").
		bitmap = await createImageBitmap(file);
```

- El comentario: "Reduce una foto de móvil antes de que viaje: lado corto de 1000 px como mucho,
  nunca agrandada, en JPEG. Volver a codificarla quita los metadatos EXIF (también el lugar GPS)
  y convierte HEIC en JPEG."
- `file: File`: el archivo que eligió el dueño en el [`<input type="file">`](../../glosario.md#input-file),
  un [File](../../glosario.md#blob). Devuelve la foto reducida como `Blob`.
- `let bitmap: ImageBitmap | undefined;`: se declara fuera del `try` para poder cerrarla en el
  `finally` del final, haya ido bien o mal.
- `await createImageBitmap(file)`: abre el archivo y lo convierte en píxeles
  ([ImageBitmap](../../glosario.md#imagebitmap)). El comentario: "Aplica la orientación del EXIF
  por defecto (`imageOrientation: "from-image"`)". Una foto hecha con el móvil de lado sale
  derecha (según la spec, que lo sacó de la documentación de MDN; la AC3 lo comprueba).
- Si el navegador no sabe abrir el archivo (un HEIC en Chrome de Android, un `.txt` con nombre
  `.jpg`), esta línea lanza un error y se salta al `catch`.

```ts
		const shortSide = Math.min(bitmap.width, bitmap.height);
		const longSide = Math.max(bitmap.width, bitmap.height);
		if (shortSide === 0) throw new PhotoError('unreadable');
		const scale = Math.min(1, MAX_SHORT_SIDE / shortSide, MAX_LONG_SIDE / longSide);
```

- `shortSide` y `longSide`: el lado corto y el largo de la foto, en píxeles. Con una foto de
  4000 × 3000: 3000 y 4000.
- Una imagen de 0 px de lado no se puede reducir (y dividir entre 0 da `Infinity`): `unreadable`.
- `scale`: cuánto se encoge, el **menor** de tres números:
  - `1`: nunca agrandar. Una foto pequeña se queda como está.
  - `1000 / shortSide`: lo que hace falta para que el lado corto quede en 1000.
  - `2000 / longSide`: lo que hace falta para que el lado largo quede en 2000.
- Con 4000 × 3000: `min(1, 0,333…, 0,5)` = 0,333…: sale de 1333 × 1000. Con 800 × 600:
  `min(1, 1,67, 2,5)` = 1: se queda en 800 × 600. Con una panorámica de 9000 × 1000:
  `min(1, 1, 0,222…)` = 0,222…: sale de 2000 × 222.

```ts
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, Math.round(bitmap.width * scale));
		canvas.height = Math.max(1, Math.round(bitmap.height * scale));
		const context = canvas.getContext('2d');
		if (!context) throw new PhotoError('unreadable');
```

- Crea un [canvas](../../glosario.md#canvas) del tamaño final. `Math.round` redondea al píxel
  entero más cercano; `Math.max(1, …)` evita un lado de 0 px en una imagen muy alargada.
- `canvas.getContext('2d')`: el objeto que dibuja. Puede dar `null` (por ejemplo si al navegador
  le falta memoria): entonces, `unreadable`.

```ts
		// White first, so a transparent PNG does not turn black as JPEG.
		context.fillStyle = 'white';
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.imageSmoothingQuality = 'high';
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
```

- El comentario: "Primero blanco, para que un PNG transparente no se vuelva negro en JPEG." JPEG
  no sabe guardar transparencia; sin un fondo, las partes transparentes saldrían negras.
- `fillRect(…)`: pinta todo el lienzo de blanco.
- `imageSmoothingQuality = 'high'`: al encoger, que el navegador use su forma más cuidadosa de
  mezclar los píxeles, para que la foto no salga dentada.
- `drawImage(bitmap, 0, 0, ancho, alto)`: dibuja la foto entera encogida al tamaño del lienzo.

```ts
		const photo = await toBlob(canvas);
		if (!photo) throw new PhotoError('unreadable');
		return photo;
```

- Saca el JPEG (bloque 4). Es un archivo **nuevo** hecho solo con los píxeles del lienzo, así
  que el [EXIF](../../glosario.md#exif) de la foto original, con su GPS, no pasa (la AC3 de la
  spec lo comprueba en el archivo subido). Y aunque el original fuera HEIC o PNG, el resultado es
  JPEG.
- Si `toBlob` dio `null`: `unreadable`. Si no, devuelve la foto lista para subir.

```ts
	} catch {
		// A format this browser cannot decode (for example HEIC on Android), or too little memory.
		throw new PhotoError('unreadable');
	} finally {
		bitmap?.close();
	}
}
```

- El comentario: "Un formato que este navegador no sabe abrir (por ejemplo HEIC en Android), o
  falta de memoria."
- `catch`: **cualquier** fallo de arriba, incluidos los `PhotoError` que se lanzaron a propósito,
  sale como un único `PhotoError('unreadable')`. A la página le basta con saber "esta foto no
  vale, prueba con otra".
- `finally { bitmap?.close(); }`: pase lo que pase ([finally](../../glosario.md#finally)), libera
  la memoria de los píxeles. `?.` porque si `createImageBitmap` falló, `bitmap` sigue siendo
  `undefined` ([encadenamiento opcional](../../glosario.md#encadenamiento-opcional)).

### 6. Un nombre nuevo en cada subida: `photoPath()`

```ts

// A new name for every upload, so no cache can ever serve an old photo. Never from the clock.
export function photoPath(id: string): string {
	const bytes = crypto.getRandomValues(new Uint8Array(4));
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${id}-${hex}.jpg`;
}
```

- El comentario: "Un nombre nuevo en cada subida, para que ninguna caché pueda servir nunca una
  foto vieja. Nunca a partir del reloj."
- El problema que resuelve: muchas piezas guardan copias de lo que descargan (su caché; ver
  [cache-no-store](../../glosario.md#cache-no-store)): el navegador, los servidores de Supabase
  repartidos por el mundo que sirven los archivos (su *CDN*), y el build de Astro, que guarda las
  fotos ya descargadas ([imagen remota](../../glosario.md#imagen-remota)). Si la foto nueva se
  llamara igual que la vieja, cualquiera de ellos podría seguir dando la vieja. Con un nombre que
  nadie ha usado antes, no hay ninguna copia guardada que confundir.
- `crypto.getRandomValues(new Uint8Array(4))`: 4 bytes al azar
  ([crypto-getrandomvalues](../../glosario.md#crypto-getrandomvalues)).
- `Array.from(bytes, (byte) => …)`: convierte la lista de bytes en una lista normal, pasando cada
  byte por la función. `byte.toString(16).padStart(2, '0')`: el byte en hexadecimal, siempre con
  dos caracteres. `.join('')`: los cuatro pegados, por ejemplo `'3f9a0c7e'`.
- Devuelve `` `${id}-${hex}.jpg` ``: `arroz-blanco-3f9a0c7e.jpg`
  ([template literal](../../glosario.md#template-literal)). Cumple la regla de nombres que exige
  [`photos.sql`](../../supabase/photos.sql.md).
- "Nunca a partir del reloj": la hora del móvil puede estar mal o repetirse entre dos subidas; el
  azar no depende de eso.

### 7. Leer el cuerpo de un error de Storage

```ts

// Storage answers errors as JSON { statusCode, error, message }. Older versions answer an RLS
// refusal with 400 and statusCode "403".
async function errorBody(response: Response): Promise<{ statusCode?: unknown; error?: unknown }> {
	if (!response.headers.get('Content-Type')?.includes('application/json')) return {};
	try {
		return (await response.json()) as { statusCode?: unknown; error?: unknown };
	} catch {
		return {};
	}
}
```

- El comentario: "Storage contesta los errores con un JSON `{ statusCode, error, message }`. Las
  versiones antiguas contestan un rechazo de RLS con `400` y `statusCode` `"403"`." (Según la
  spec, que lo sacó del código de Supabase Storage; la tarea T1 apunta qué contesta de verdad
  este proyecto.)
- La misma idea que `errorCode()` de [`products.ts.md`](products.ts.md#10-leer-el-código-de-error):
  solo intenta leer JSON si la respuesta dice que lo es, y si no se puede leer, devuelve un objeto
  vacío. Los dos campos son `unknown` ([record-y-unknown](../../glosario.md#record-y-unknown)):
  hay que comprobar qué son antes de usarlos.

### 8. Convertir una respuesta mala en un error: `photoFailure()`

```ts

// The same kinds as a product write, so the page keeps one table of messages.
async function photoFailure(method: string, path: string, response: Response): Promise<ProductError> {
	const body = await errorBody(response);
	if (response.status === 403 || String(body.statusCode) === '403') return new ProductError('forbidden');
```

- El comentario: "Los mismos tipos que una escritura de producto, para que la página tenga una
  sola tabla de mensajes."
- Como `failure()` de [`products.ts.md`](products.ts.md#11-convertir-una-respuesta-mala-en-un-producterror),
  **devuelve** el error y quien la llama escribe `throw await photoFailure(…)`.
- Un `403` ([código de estado HTTP](../../glosario.md#codigo-de-estado-http)), o un cuerpo con
  `statusCode` `"403"`, es un rechazo de las políticas: esta cuenta no puede subir fotos →
  `forbidden`, "Esta cuenta no puede cambiar el catálogo.". `String(…)` convierte el valor en
  texto, así sirve tanto si llega como número `403` como si llega como texto `"403"`.

```ts
	const error = typeof body.error === 'string' ? body.error : 'no error';
	console.error(`[photos] ${method} ${path} failed with status ${response.status} (${error})`);
	if (response.status >= 400 && response.status < 500) return new ProductError('system');
	return new ProductError('unknown');
}
```

- `error`: el nombre del error que trae Storage (por ejemplo `EntityTooLarge`, según la spec), o
  `'no error'` si no trae ninguno.
- `console.error(…)`: una línea en la consola para quien mantiene la web, por ejemplo
  `[photos] POST arroz-blanco-3f9a0c7e.jpg failed with status 413 (EntityTooLarge)`. Lleva el
  nombre del archivo, que no es ningún secreto.
- Cualquier otro `4xx` → `system`, "Error del sistema, no es culpa tuya…". Según la spec, `413`
  (archivo demasiado grande) y `415` (tipo no admitido) son de este grupo: la página siempre manda
  JPEG pequeños, así que si el bucket los rechaza, algo está mal configurado, no es culpa del
  dueño.
- Lo demás (sobre todo un `5xx`, fallo del servidor) → `unknown`, "Algo salió mal. Inténtalo
  otra vez.".

### 9. Subir y borrar

```ts

// Uploads the prepared photo under a new path and returns that path. Never overwrites.
export async function uploadPhoto(id: string, photo: Blob): Promise<string> {
	const path = photoPath(id);
	const body = new FormData();
	body.append('file', photo, path);
	const response = await authFetch(objectPath(path), { method: 'POST', body });
	if (response.status !== 200) throw await photoFailure('POST', path, response);
	return path;
}
```

- El comentario: "Sube la foto ya preparada con un nombre nuevo y devuelve ese nombre. Nunca
  sobrescribe."
- `photoPath(id)`: el nombre nuevo (bloque 6).
- `new FormData()` y `body.append('file', photo, path)`: el cuerpo de la petición, con la foto
  como un archivo llamado `path` ([FormData](../../glosario.md#formdata)). Es la forma de
  mandar un archivo que acepta Storage (según la spec).
- `authFetch(objectPath(path), { method: 'POST', body })`: `POST` a
  `/storage/v1/object/product-photos/<nombre>`, con la sesión del dueño. `authFetch` no le pone
  `Content-Type: application/json` a un `FormData`: deja que el navegador escriba la cabecera
  correcta ([`auth.ts.md`](auth.ts.md#11-mandar-una-petición)).
- "Nunca sobrescribe": la petición no pide reemplazar un archivo que ya exista, y
  [`photos.sql`](../../supabase/photos.sql.md) tampoco tiene política para cambiarlo. Como el
  nombre es nuevo, no debería existir.
- Si la respuesta no es `200`, lanza el error de `photoFailure()` (bloque 8). Si no hay red o la
  sesión se acabó, lo que llega es un `AuthError` de `authFetch`, que pasa tal cual.
- Si va bien, devuelve el nombre, que `saveProduct()` guarda en la columna `photo_path`.

```ts

// Cleanup only: it never throws. A file left behind harms nobody, because visitors never load
// photos from Supabase (spec 0013), so a failure is only logged.
export async function deletePhoto(path: string): Promise<void> {
	try {
		const response = await authFetch(objectPath(path), { method: 'DELETE' });
		if (response.ok || response.status === 404) return;
		console.error(`[photos] DELETE ${path} failed with status ${response.status}`);
	} catch (error) {
		console.error(`[photos] DELETE ${path} failed (${error instanceof AuthError ? error.kind : 'unknown'})`);
	}
}
```

- El comentario: "Solo para limpiar: nunca lanza un error. Un archivo que se queda atrás no hace
  daño a nadie, porque los clientes nunca cargan fotos de Supabase (spec 0013), así que un fallo
  solo se apunta."
- `DELETE` a la ruta del archivo, con la sesión del dueño.
- `response.ok` (cualquier `2xx`) o `404` (ese archivo ya no existe): las dos cuentan como
  "borrado", porque lo que se quería era que no estuviera.
- Cualquier otra respuesta: una línea en la consola y nada más.
- `catch (error)`: si `authFetch` lanzó (sin red, sesión acabada…), también solo una línea en la
  consola, con el `kind` del `AuthError` si lo es ([instanceof](../../glosario.md#instanceof)), o
  `unknown`.
- Por qué nunca lanza: se llama **después** de que lo importante ya pasó (la fila ya se guardó o
  se borró). Si lanzara, la página diría "Algo salió mal" sobre algo que sí salió bien.

### 10. La dirección pública de la foto actual

```ts

// The current photo for the admin preview. The page passes its configured Supabase URL.
export function publicPhotoUrl(supabaseUrl: string, path: string): string {
	return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}
```

- El comentario: "La foto actual, para la vista previa de la administración. La página pasa la
  dirección de Supabase que tiene configurada."
- Devuelve la URL pública de un archivo del bucket
  ([Storage y bucket](../../glosario.md#storage-y-bucket)), la misma forma que `photoUrl()` de
  [`supabase.ts`](supabase.ts.md#8-la-url-pública-de-una-foto) en el build. Como el bucket es
  público, un `<img>` la puede cargar sin sesión.
- `supabaseUrl` llega de la página (su atributo `data-supabase-url`), porque en el navegador no
  hay variables de entorno.
- Solo la usa el formulario de `/admin/`, para enseñar la foto que el producto ya tiene. Los
  clientes nunca la ven: sus páginas usan la copia que hizo el build.

## Cómo se conecta

- **Entra:** el `File` que elige el dueño (lo pasa el script de
  [`admin/index.astro`](../pages/admin/index.astro.md) a `preparePhoto()`), y la foto preparada y
  el id (los pasa `saveProduct()` de [`products.ts`](products.ts.md) a `uploadPhoto()`).
- **Habla con:** Supabase Storage, rutas `/storage/v1/object/product-photos/<nombre>`, siempre a
  través de `authFetch()` de [`auth.ts`](auth.ts.md), que pone el
  [access token](../../glosario.md#access-token) del dueño.
- **La protección:** las [políticas de Storage](../../glosario.md#politicas-de-storage) y los
  límites del bucket de [`photos.sql`](../../supabase/photos.sql.md). Si este código cambiara en
  el navegador de alguien, Supabase seguiría rechazando lo que no sea del dueño, no sea JPEG o
  pase de 2 MB.
- **Sale:** un `Blob` JPEG reducido hacia la página (que lo enseña con una
  [URL de objeto](../../glosario.md#url-de-objeto)), un nombre de archivo hacia `saveProduct()`,
  y errores (`PhotoError`, `ProductError` o `AuthError`) que la página convierte en mensajes.
- **La web pública:** no usa este archivo. Después de publicar, el build descarga cada foto por
  su `photo_path` y la reduce otra vez a WebP para las páginas
  ([`supabase.ts.md`](supabase.ts.md)).

## Prueba tú

Prueba las dos reglas de números de este archivo en la terminal, sin tocar el proyecto ni
Supabase. Son las mismas cuentas que `preparePhoto()` y `photoPath()`, copiadas en un comando.

1. La reducción. En la terminal de VS Code (Git Bash), ejecuta:

   ```bash
   node -e 'for (const [w, h] of [[4000, 3000], [800, 600], [9000, 1000]]) { const s = Math.min(1, 1000 / Math.min(w, h), 2000 / Math.max(w, h)); console.log(`${w}x${h} -> ${Math.max(1, Math.round(w * s))}x${Math.max(1, Math.round(h * s))}`); }'
   ```

   **Qué deberías ver:** `4000x3000 -> 1333x1000` (una foto de móvil de 12 MP), `800x600 ->
   800x600` (no se agranda) y `9000x1000 -> 2000x222` (la panorámica, frenada por el lado largo).
2. El nombre:

   ```bash
   node -e 'const b = crypto.getRandomValues(new Uint8Array(4)); console.log(`arroz-blanco-${Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")}.jpg`)'
   ```

   **Qué deberías ver:** algo como `arroz-blanco-cf233d3d.jpg`: siempre 8 caracteres de `0-9` y
   `a-f`, y distintos cada vez que lo ejecutas.
3. Cambia los tamaños de la lista del paso 1 por los de una foto tuya y vuelve a ejecutar. No hay
   nada que deshacer: los comandos no tocan ningún archivo.

## Términos

- [blob](../../glosario.md#blob) · [canvas](../../glosario.md#canvas) ·
  [imagebitmap](../../glosario.md#imagebitmap) · [exif](../../glosario.md#exif) ·
  [heic](../../glosario.md#heic) · [formdata](../../glosario.md#formdata) ·
  [url-de-objeto](../../glosario.md#url-de-objeto) · [input-file](../../glosario.md#input-file) ·
  [crypto-getrandomvalues](../../glosario.md#crypto-getrandomvalues) ·
  [politicas-de-storage](../../glosario.md#politicas-de-storage) (nuevos)
- [storage-y-bucket](../../glosario.md#storage-y-bucket) ·
  [imagen-remota](../../glosario.md#imagen-remota) ·
  [cache-no-store](../../glosario.md#cache-no-store) ·
  [codigo-de-estado-http](../../glosario.md#codigo-de-estado-http) ·
  [access-token](../../glosario.md#access-token) ·
  [variable-de-entorno](../../glosario.md#variable-de-entorno)
- [clase](../../glosario.md#clase) · [async-await](../../glosario.md#async-await) ·
  [finally](../../glosario.md#finally) · [instanceof](../../glosario.md#instanceof) ·
  [encadenamiento-opcional](../../glosario.md#encadenamiento-opcional) ·
  [record-y-unknown](../../glosario.md#record-y-unknown) ·
  [template-literal](../../glosario.md#template-literal) ·
  [encodeuricomponent](../../glosario.md#encodeuricomponent)
