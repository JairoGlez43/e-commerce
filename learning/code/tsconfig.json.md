# `tsconfig.json`

> **Qué es:** la configuración de [TypeScript](glosario.md#typescript): qué reglas aplica y qué
> archivos revisa · **Lo decidió:** [spec 0001 · Stack](../../docs/specs/0001-stack.md)
> ("TypeScript (strict template)"), y la excepción de `supabase/functions`,
> [spec 0016](../../docs/specs/0016-publish-changes.md) · **Lo usan:** `pnpm typecheck` (`astro check`) y VS Code,
> que subraya los errores mientras escribes · **Usa:** el archivo de ajustes que trae Astro,
> `node_modules/astro/tsconfigs/strict.json`, y los tipos que Astro genera en
> `.astro/types.d.ts`.

## Para qué sirve

TypeScript necesita saber dos cosas: qué tan exigente ser y qué archivos mirar. En vez de
escribir aquí decenas de opciones, este archivo hereda las que Astro recomienda en su versión
más estricta, y solo añade la lista de archivos.

## El código, por partes

```json
{
  "extends": "astro/tsconfigs/strict",
```

- `{` abre el objeto JSON.
- `"extends"`: "hereda la configuración de este otro archivo". `astro/tsconfigs/strict` apunta
  a `node_modules/astro/tsconfigs/strict.json`, dentro de la librería `astro`. Es como copiar
  aquí todas sus opciones; lo que escribas en este archivo se suma a ellas o las sustituye.
- Ese archivo, a su vez, hereda de `base.json` (en la misma carpeta) y le añade una sola
  opción: `"strict": true`, el modo estricto de TypeScript. Un ejemplo de lo que hace: con
  `strict`, `let nombre: string = null;` es un error, porque `null` no es un texto. Sin
  `strict`, TypeScript lo deja pasar.
- Algunas opciones que llegan de `base.json` (cada una lleva allí un comentario en inglés que
  la explica):

  | Opción | Qué hace aquí |
  |---|---|
  | `"noEmit": true` | TypeScript solo revisa; no escribe archivos `.js`. Astro ejecuta el TypeScript por su cuenta. |
  | `"allowJs": true` | También mira archivos `.js` y `.mjs`. Por eso revisa `astro.config.mjs`, que pide revisión con `// @ts-check`. |
  | `"resolveJsonModule": true` | Permite importar archivos `.json`. |
  | `"verbatimModuleSyntax": true` | Obliga a escribir [`import type`](glosario.md#import-type) cuando lo que importas es solo un tipo. |
  | `"skipLibCheck": true` | No revisa los tipos de dentro de `node_modules/`; solo tu código. |

```json
  "include": [".astro/types.d.ts", "**/*"],
```

- `"include"`: la lista de archivos que TypeScript tiene en cuenta.
- `".astro/types.d.ts"`: un [archivo de declaración](glosario.md#archivo-de-declaracion) que
  Astro genera solo (la carpeta `.astro/` no se sube a git). No tiene código que se ejecute;
  solo describe tipos. Dentro enlaza otros tres: los tipos generales de Astro,
  `content.d.ts` (la forma de tus [colecciones](glosario.md#content-collection)) y
  `fonts.d.ts` (las fuentes de `astro.config.mjs`). Gracias a él, TypeScript sabe qué
  devuelve [`getCollection('products')`](glosario.md#getcollection) y qué existe en los
  [módulos virtuales](glosario.md#modulo-virtual) `astro:content` y `astro:assets`.
- `"**/*"`: un [patrón glob](glosario.md#patron-glob). `**` = cualquier carpeta, a cualquier
  profundidad; `*` = cualquier archivo. Es decir: todo el proyecto. Hay una excepción: no
  entra en carpetas cuyo nombre empieza por punto, como `.astro/`. Por eso `types.d.ts` se
  nombra aparte en la entrada anterior (el paso 2 de "Prueba tú" lo confirma: de `.astro/`
  solo aparece ese archivo).
- Estas dos entradas son las mismas que ya trae `base.json`. Repetirlas aquí no cambia nada,
  pero deja a la vista qué se revisa.

```json
  "exclude": ["dist", "supabase/functions"]
}
```

- `"exclude"`: de lo que incluyó `**/*`, quita dos carpetas.
  (`node_modules/` no hace falta nombrarlo: TypeScript lo excluye por su cuenta.)
- `"dist"`: la carpeta [`dist/`](glosario.md#dist). Es el resultado del build, no código tuyo,
  así que no tiene sentido revisarlo.
- `"supabase/functions"`: añadida con la spec 0016. Ahí vive el código de la
  [Edge Function](glosario.md#edge-function) `publish`
  ([`index.ts.md`](supabase/functions/publish/index.ts.md)), que no corre con Astro ni con Node
  sino con [Deno](glosario.md#deno), en los servidores de Supabase. Usa cosas que solo existen
  allí, como `Deno.env.get(…)` y `Deno.serve(…)`. Si TypeScript lo revisara con las reglas de
  Astro, no sabría qué es `Deno` y `pnpm typecheck` fallaría con un error del tipo
  `Cannot find name 'Deno'` ("no encuentro el nombre `Deno`"). La contrapartida: el typecheck del
  proyecto ya no revisa ese archivo, así que un error suyo solo saldría al desplegarlo en
  Supabase o al probarlo (spec 0016, T3).
- `}` cierra el objeto.

## Cómo se conecta

- **Entra:** `node_modules/astro/tsconfigs/strict.json` → `base.json` (las opciones), y
  `.astro/types.d.ts`, que Astro reescribe cuando ejecutas `pnpm dev`, `pnpm build` o
  `pnpm typecheck`.
- **Lo lee `pnpm typecheck`** ([typecheck](glosario.md#typecheck)): revisa con estas reglas
  los `.ts` (`src/content.config.ts`, `src/lib/*.ts`), los `.astro` y `astro.config.mjs`.
  Junto con `pnpm build`, es el "check limpio" del proyecto (`AGENTS.md`).
- **Lo lee VS Code:** por eso ves errores subrayados en rojo sin ejecutar nada.
- **No afecta al sitio final:** los [tipos](glosario.md#tipo) se borran en el
  [build](glosario.md#build) y `noEmit` impide que TypeScript escriba nada. Si cambias este
  archivo, el HTML de `dist/` sale igual.

## Prueba tú

Vas a ver la configuración completa que resulta de la herencia, y cómo cambia.

1. En la terminal de VS Code ejecuta `pnpm exec tsc --showConfig`. `tsc` es el comando de
   TypeScript (viene con el paquete `typescript` de [`package.json`](package.json.md)) y
   `pnpm exec` ejecuta un comando instalado en `node_modules/`. `--showConfig` no revisa
   nada: solo imprime la configuración final, ya mezclada.
2. **Qué esperar:** un JSON con todas las opciones de `base.json` más `"strict": true`, una
   lista `"files"` con los archivos que entran (`astro.config.mjs`, `src/content.config.ts`,
   `src/lib/…`), y tu `include` / `exclude`. Los `.astro` no salen en esa lista porque `tsc`
   no sabe leerlos; de ellos se encarga `astro check`.
3. Ahora cambia `"astro/tsconfigs/strict"` por `"astro/tsconfigs/base"` y repite el comando:
   `"strict": true` desaparece de la lista. Ese es todo el trabajo de `strict.json`.
4. **Deshacer:** vuelve a escribir `"extends": "astro/tsconfigs/strict",`. Comprueba que todo
   sigue en orden con `pnpm typecheck` (0 errores).

## Términos

- [typescript](glosario.md#typescript)
- [tipo](glosario.md#tipo)
- [import type](glosario.md#import-type)
- [typecheck](glosario.md#typecheck)
- [build](glosario.md#build)
- [dist](glosario.md#dist)
- [content collection](glosario.md#content-collection)
- [getCollection](glosario.md#getcollection)
- [módulo virtual](glosario.md#modulo-virtual)
- [archivo de declaración](glosario.md#archivo-de-declaracion)
- [patrón glob](glosario.md#patron-glob)
- [edge function](glosario.md#edge-function) (nuevo, spec 0016)
- [deno](glosario.md#deno) (nuevo, spec 0016)
