# `src/pages/build.json.ts`

> **Qué es:** el archivo `/build.json` de la web: cuándo se hizo este build y qué versión del
> catálogo enseña · **Lo decidió:** [spec 0016](../../../../docs/specs/0016-publish-changes.md)
> (Design → "Build: the catalog stamp and `/build.json`") · **Lo usan:** `readBuild()` de
> [`src/lib/publish.ts`](../lib/publish.ts.md), desde la administración del dueño, cada vez que
> comprueba si una publicación ya está en la web · **Usa:** la colección `catalogState` de
> [`src/content.config.ts`](../content.config.ts.md), con `getEntry` de `astro:content`

## Para qué sirve

Cuando el dueño pulsa "Publicar cambios", Vercel tarda unos minutos en construir y servir la web
nueva. ¿Cómo sabe la administración que ya terminó? Podría preguntarle a Vercel, pero eso exigiría
una clave de su API. La spec 0016 eligió algo más sencillo: **que la propia web lo diga**. Cada
build escribe un archivo pequeño, `dist/build.json`, con dos horas:

```json
{"builtAt":"2026-10-28T10:02:30.123Z","catalogChangedAt":"2026-10-28T10:00:00.123456+00:00"}
```

- `builtAt`: cuándo corrió este build.
- `catalogChangedAt`: la hora del último cambio del catálogo **que este build leyó** de Supabase
  (la columna `changed_at` de `catalog_state`, ver [`publish.sql`](../../supabase/publish.sql.md)).

Mientras el build nuevo no está en la web, `/build.json` sigue siendo el viejo. En cuanto Vercel
empieza a servir el nuevo, `/build.json` cambia con él. La administración lo lee cada 15 segundos
([polling](../../glosario.md#polling)) y compara (ver [`publish.ts.md`](../lib/publish.ts.md)).
Funciona igual en Vercel que en cualquier otro *hosting* estático, porque solo es un archivo más.

Este archivo no es una página: es un [endpoint](../../glosario.md#endpoint), una ruta que
devuelve datos en vez de HTML. En Express sería:

```js
// Not in the project: the Express version.
app.get('/build.json', (req, res) => res.json({ builtAt: new Date().toISOString(), catalogChangedAt }));
```

La diferencia: aquí la función se ejecuta **una sola vez, en el build**, y lo que devuelve queda
guardado como un archivo en `dist/`. Ningún servidor la vuelve a ejecutar cuando alguien pide
`/build.json`: Vercel entrega el archivo tal cual. Las páginas de clientes no cambian, y siguen
sin una sola línea de JavaScript (spec 0016, AC3).

## El código, por partes

### 1. Los imports

```ts
import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
```

- `import type { APIRoute } from 'astro';`: el [tipo](../../glosario.md#tipo) de la función de un
  endpoint: recibe la petición y devuelve un `Response` (o una promesa de uno). Con `import type`
  solo se trae el tipo ([import-type](../../glosario.md#import-type)).
- `import { getEntry } from 'astro:content';`: la función que lee **una**
  [entrada](../../glosario.md#entrada) de una colección ([getentry](../../glosario.md#getentry)),
  del [módulo virtual](../../glosario.md#modulo-virtual) `astro:content`.

### 2. El comentario

```ts

// /build.json (spec 0016): when this build ran and which catalog it shows. Written once at build,
// like every page. The admin polls it to tell when a publish is live; it holds only these two
// timestamps. In `pnpm dev` it is answered per request, so local status always looks finished.
```

- "`/build.json` (spec 0016): cuándo corrió este build y qué catálogo enseña. Se escribe una vez
  en el build, como cada página. La administración lo consulta una y otra vez para saber cuándo
  una publicación ya está en la web; solo contiene estas dos horas. En `pnpm dev` se contesta en
  cada petición, así que en local el estado siempre parece terminado."
- La última frase avisa de una trampa: con `pnpm dev`, Astro ejecuta el endpoint **cada vez** que
  se pide, así que `builtAt` es siempre "ahora", más nuevo que cualquier publicación. En tu PC, la
  tarjeta "Publicar" nunca se queda en "Publicando…": una publicación siempre parece terminada.
  El estado de verdad solo se ve en la web publicada.
- "Solo contiene estas dos horas": nada del catálogo ni de Supabase (ni su dirección ni su
  clave), así que publicar este archivo no enseña nada privado (AC10).

### 3. La función `GET`

```ts
export const GET = (async () => {
```

- `export const GET = …`: Astro busca en un endpoint una función exportada con el nombre del
  método HTTP. `GET` = la que contesta a `GET /build.json`. El nombre de la URL sale del nombre del
  archivo sin el `.ts`: `src/pages/build.json.ts` → `/build.json`
  ([ruta por archivo](../../glosario.md#ruta-por-archivo)).
- `async () => …`: una función [async](../../glosario.md#async-await), porque tiene que esperar a
  `getEntry`. Va entre paréntesis para poder ponerle `satisfies` al final (bloque 5), como en
  `getStaticPaths` de las páginas de producto.

```ts
	const state = await getEntry('catalogState', 'current');
	if (!state) throw new Error('build.json: the catalogState collection has no "current" entry.');
```

- `getEntry('catalogState', 'current')`: la entrada con id `current` de la colección
  `catalogState`. Es la otra forma de llamar a `getEntry`: con el nombre de la colección y el id
  por separado, en vez de con una [referencia](../../glosario.md#reference). Esa colección tiene una
  sola entrada, que crea [`content.config.ts`](../content.config.ts.md) con la hora que leyó de
  Supabase.
- `getEntry` devuelve `undefined` si no la encuentra. Entonces `throw new Error(…)`
  ([throw](../../glosario.md#throw)): "build.json: la colección `catalogState` no tiene la entrada
  `current`." El build se para. Mejor eso que publicar un `/build.json` sin hora, que dejaría a la
  administración sin saber nada.

```ts
	return Response.json({ builtAt: new Date().toISOString(), catalogChangedAt: state.data.changedAt });
```

- `Response.json({ … })`: crea una respuesta con ese objeto como cuerpo JSON y la cabecera
  `Content-Type: application/json` ([endpoint](../../glosario.md#endpoint)). En el build, Astro
  guarda el cuerpo en `dist/build.json`.
- `builtAt: new Date().toISOString()`: la hora de este momento del build, en
  [formato ISO](../../glosario.md#fecha-iso) y en UTC (`…Z`). Es el reloj de la máquina que
  construye (la de Vercel), no el de ningún móvil.
- `catalogChangedAt: state.data.changedAt`: la hora del último cambio del catálogo, **tal cual**
  la devolvió Supabase (`state.data` son los campos ya validados de la entrada). No se convierte
  en fecha ni se le cambia el formato, porque la administración la compara como texto con la que
  lee de Supabase en ese momento: si fueran textos con formatos distintos, nunca serían iguales.
- El orden de los campos en el objeto es el orden en el archivo:
  `{"builtAt":"…","catalogChangedAt":"…"}`, exactamente lo que pide AC3.

### 4. ¿Por qué `catalogChangedAt` es de fiar?

No es una línea de este archivo, pero es lo que lo hace funcionar. El build lee la hora de
`catalog_state` **antes** que las tablas del catálogo (lo explica
[`supabase.ts.md`](../lib/supabase.ts.md#5b-el-sello-del-catálogo-antes-que-nada)). Así, la hora
de `/build.json` nunca es más nueva que los datos de las páginas. Si el dueño cambia algo mientras
el build corre, ese cambio tiene una hora posterior a la de `/build.json`, y la administración
dice "Hay cambios sin publicar." aunque el build acabe de llegar.

### 5. El cierre

```ts
}) satisfies APIRoute;
```

- `}`: cierra la función; `)`: cierra el paréntesis que la envuelve.
- `satisfies APIRoute`: pide al [typecheck](../../glosario.md#typecheck) que confirme que la
  función tiene la forma de un endpoint ([satisfies](../../glosario.md#satisfies)). Si un día
  devolviera otra cosa que un `Response`, `pnpm typecheck` avisaría.

## Cómo se conecta

- **Entra:** la entrada `current` de la colección `catalogState`
  ([`content.config.ts`](../content.config.ts.md)), que a su vez sale de `readCatalogChangedAt()`
  en [`supabase.ts`](../lib/supabase.ts.md), que lee la tabla `catalog_state` de
  [`publish.sql`](../../supabase/publish.sql.md).
- **Sale:** el archivo `dist/build.json`, que Vercel sirve como `/build.json`.
- **Lo lee:** `readBuild()` de [`publish.ts`](../lib/publish.ts.md), desde `/admin/`, con
  `fetch('/build.json', { cache: 'no-store' })`.
- **Peso:** no es HTML, así que `pnpm check:weight` no lo mide
  ([`check-weight.mjs.md`](../../scripts/check-weight.mjs.md)); pesa unos 100 bytes.

## Prueba tú

Mira el archivo que produce el build y compáralo con Supabase.

1. En la terminal de VS Code (Git Bash), ejecuta `WHATSAPP_NUMBER=5355555555 pnpm build` (el
   número es inventado; las variables de Supabase las lee el build de tu `.env`).
2. Ejecuta `cat dist/build.json`. **Qué deberías ver:** una sola línea con la forma
   `{"builtAt":"…Z","catalogChangedAt":"…+00:00"}`. `builtAt` es la hora de hace un momento, en UTC
   (en Cuba son 4 o 5 horas menos, según la época del año).
3. En el panel de Supabase, *SQL Editor*, ejecuta `select changed_at from public.catalog_state;`.
   **Qué deberías ver:** el mismo instante que `catalogChangedAt`. El editor lo enseña con otro
   formato (un espacio en vez de la `T`, y `+00` en vez de `+00:00`), pero la fecha, la hora y
   los decimales coinciden.
4. No hay nada que deshacer: `dist/` se regenera en cada build y no se sube a git.

## Términos

- [endpoint](../../glosario.md#endpoint) · [polling](../../glosario.md#polling) ·
  [fecha-iso](../../glosario.md#fecha-iso) (nuevos)
- [getentry](../../glosario.md#getentry) · [entrada](../../glosario.md#entrada) ·
  [reference](../../glosario.md#reference) · [modulo-virtual](../../glosario.md#modulo-virtual) ·
  [ruta-por-archivo](../../glosario.md#ruta-por-archivo) · [build](../../glosario.md#build)
- [import-type](../../glosario.md#import-type) · [tipo](../../glosario.md#tipo) ·
  [async-await](../../glosario.md#async-await) · [throw](../../glosario.md#throw) ·
  [satisfies](../../glosario.md#satisfies) · [typecheck](../../glosario.md#typecheck)
