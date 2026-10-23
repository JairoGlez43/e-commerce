# `src/env.d.ts`

> **Qué es:** la declaración de tipos de las variables de entorno · **Lo decidió:**
> [spec 0007](../../../docs/specs/0007-whatsapp-order.md) (sección Design; `WHATSAPP_NUMBER`) y
> [spec 0013](../../../docs/specs/0013-catalog-data-online.md) (las dos de Supabase) · **Lo
> usan:** el [typecheck](../glosario.md#typecheck) y VS Code, al revisar
> [`src/lib/whatsapp.ts`](lib/whatsapp.ts.md) y [`src/lib/supabase.ts`](lib/supabase.ts.md) ·
> **Usa:** nada

## Para qué sirve

`import.meta.env` es un objeto que llena Astro con las
[variables de entorno](../glosario.md#variable-de-entorno). TypeScript no puede saber qué
variables pondrás en tu `.env`, así que este archivo se lo dice: "existen `WHATSAPP_NUMBER`,
`SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` y, si están, son textos". Con eso, VS Code
autocompleta los nombres y el typecheck avisa si te equivocas al escribir uno. Es un
[archivo de declaración](../glosario.md#archivo-de-declaracion): no tiene código que se ejecute,
solo describe tipos.

## El código, por partes

```ts
// Types for the environment variables read through import.meta.env (see .env.example).
interface ImportMetaEnv {
	readonly WHATSAPP_NUMBER?: string;
	readonly SUPABASE_URL?: string;
	readonly SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
```

- El comentario: "Tipos de las variables de entorno que se leen con `import.meta.env` (ver
  `.env.example`)."
- `interface ImportMetaEnv { … }`: describe la forma del objeto `import.meta.env`
  ([interface](../glosario.md#interface)). El nombre no es inventado: es el que usan Vite y Astro,
  y TypeScript **junta** esta declaración con la que ya traen ellos (no la reemplaza).
- `readonly WHATSAPP_NUMBER?: string;`:
  - `readonly`: el código puede leerla pero no cambiarla.
  - `?`: es opcional. Puede no estar (si falta `.env`). Por eso `getWhatsAppNumber()` comprueba
    que exista antes de usarla.
  - `: string`: cuando está, es un texto. Aunque sean dígitos, todo lo que llega del entorno es
    texto.
- `readonly SUPABASE_URL?: string;`: la dirección del proyecto de
  [Supabase](../glosario.md#supabase) (`https://<ref>.supabase.co`). Misma forma: solo lectura,
  opcional y texto. Añadida en la spec 0013.
- `readonly SUPABASE_PUBLISHABLE_KEY?: string;`: la
  [clave publishable](../glosario.md#clave-publishable) del proyecto (`sb_publishable_…`). También
  opcional: por eso `supabaseConfig()`, en `supabase.ts`, comprueba las dos antes de usarlas y para el
  build si falta alguna.
- `interface ImportMeta { readonly env: ImportMetaEnv; }`: dice que `import.meta.env` tiene la
  forma de arriba. Es el patrón que indica la guía de variables de entorno de Astro.

## Cómo se conecta

- **Lo lee:** TypeScript, cuando revisa `src/lib/whatsapp.ts` y `src/lib/supabase.ts`
  (`pnpm typecheck` y VS Code).
- **No llega al sitio:** en el build desaparece, como todo lo que es solo de tipos.
- **Si añades otra variable al proyecto:** se declara aquí y se documenta en
  [`.env.example`](../.env.example.md), como se hizo con las dos de Supabase.

## Prueba tú

Comprueba que TypeScript usa de verdad esta declaración:

1. En este archivo, cambia `readonly WHATSAPP_NUMBER?: string;` por
   `readonly WHATSAPP_NUMBER?: number;` y guarda.
2. Ejecuta `pnpm typecheck`.
3. **Qué deberías ver:** errores en `src/lib/whatsapp.ts`. Por ejemplo, que `.test(number)` espera
   un `string` y recibe un `number`, y que la función promete devolver un `string`. TypeScript
   se fía de lo que dice este archivo, aunque sea mentira.
4. **Deshacer:** vuelve a poner `string` y ejecuta `pnpm typecheck` otra vez: 0 errores.

## Términos

- [variable-de-entorno](../glosario.md#variable-de-entorno) ·
  [import-meta-env](../glosario.md#import-meta-env)
- [archivo-de-declaracion](../glosario.md#archivo-de-declaracion) ·
  [interface](../glosario.md#interface) · [typecheck](../glosario.md#typecheck)
- [supabase](../glosario.md#supabase) · [clave-publishable](../glosario.md#clave-publishable)
  (nuevos)
