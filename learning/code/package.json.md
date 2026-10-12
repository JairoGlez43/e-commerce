# `package.json`

> **Qué es:** la ficha del proyecto: nombre, versión de Node y de pnpm, comandos y librerías ·
> **Lo decidió:** [spec 0001 · Stack](../../docs/specs/0001-stack.md) (Astro, pnpm, Node,
> Tailwind) · **Lo usan:** [pnpm](glosario.md#pnpm) al instalar (`pnpm install`) y al lanzar
> comandos (`pnpm dev`, `pnpm build`…); Vercel cuando haga el [build](glosario.md#build) del
> sitio · **Usa:** nada; es el punto de partida.

## Para qué sirve

Ya lo conoces de Node + Express: es el archivo que dice qué librerías necesita el proyecto y
qué comandos tiene. Aquí hace lo mismo, pero los comandos no arrancan un servidor Express:
llaman a Astro para trabajar en local, construir el sitio o revisar los tipos.

## El código, por partes

```json
{
  "name": "e-commerce",
  "type": "module",
  "version": "0.0.1",
```

- `{` abre el objeto JSON que ocupa todo el archivo.
- `"name": "e-commerce"`: el nombre del proyecto. Solo sirve de etiqueta (aparece, por ejemplo,
  cuando pnpm lanza un comando). No se publica en ningún sitio.
- `"type": "module"`: le dice a Node que los archivos `.js` del proyecto usan
  [módulos ES](glosario.md#modulos-es), es decir, `import` / `export`, y no `require()` /
  `module.exports`. Todo el código del proyecto usa `import`.
- `"version": "0.0.1"`: la versión del proyecto. Como no es una librería que se publique, nadie
  la lee; es el valor que trae la plantilla inicial.

```json
  "packageManager": "pnpm@10.13.1",
```

- Deja escrito qué gestor de paquetes usa el proyecto y su versión exacta: pnpm 10.13.1. Así
  cualquier persona o herramienta sabe que no debe usar `npm` ni otra versión de pnpm. La
  spec 0001 lo llama "fijar pnpm" (*pinned*).

```json
  "engines": {
    "node": ">=22.12.0"
  },
```

- `"engines"` declara en qué versiones de Node funciona el proyecto.
- `"node": ">=22.12.0"`: Node 22.12 o superior. Es lo que exige Astro 7 (lo explica la
  [lección de Astro](../01-astro.md), en "Si algo falla"). Tú tienes Node 24, así que cumples.
- `},` cierra `engines`.

```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "typecheck": "astro check",
    "check:weight": "node scripts/check-weight.mjs",
    "astro": "astro"
  },
```

- `"scripts"`: los comandos del proyecto, como en Express (`"start": "node server.js"`). Se
  lanzan con `pnpm <nombre>`: `pnpm dev`, `pnpm build`…
- Casi todos llaman a `astro`, la [CLI](glosario.md#cli) de Astro: un programa de terminal que
  se instala junto con la librería `astro`, dentro de `node_modules/.bin/`.
- `"dev": "astro dev"`: arranca el [servidor de desarrollo](glosario.md#servidor-de-desarrollo)
  en `http://localhost:4321`.
- `"build": "astro build"`: hace el [build](glosario.md#build) y deja el sitio en
  [`dist/`](glosario.md#dist).
- `"preview": "astro preview"`: sirve lo que hay en `dist/`, tal como lo verá un cliente.
- `"typecheck": "astro check"`: el [typecheck](glosario.md#typecheck). Revisa los tipos de los
  `.ts` y de los `.astro`. El nombre `typecheck` es del proyecto; Astro lo llama `check`.
- `"check:weight": "node scripts/check-weight.mjs"`: el único que no usa Astro. Ejecuta con
  Node nuestro propio script, que mide cada página de `dist/` contra el
  [presupuesto de peso](glosario.md#presupuesto-de-peso) y falla si alguna se pasa (spec 0001,
  AC7). Se lanza **después** de `pnpm build`: `pnpm check:weight`
  ([explicación](scripts/check-weight.mjs.md)). Los dos puntos del nombre son solo una
  costumbre para agrupar comandos parecidos.
- `"astro": "astro"`: un atajo para usar cualquier otro comando de la CLI. Lo que escribas
  detrás pasa tal cual: `pnpm astro --version` ejecuta `astro --version`.
- `},` cierra `scripts`.

```json
  "dependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "astro": "^7.3.5",
    "sharp": "^0.35.5",
    "tailwindcss": "^4.3.3"
  },
```

- `"dependencies"`: las librerías que hacen falta para construir el sitio. (La diferencia con
  el bloque siguiente está en [dependencies y devDependencies](glosario.md#devdependencies).)
- El número de cada una es un [rango de versiones](glosario.md#rango-de-versiones): `^4.3.3`
  acepta cualquier 4.x igual o mayor que 4.3.3, pero nunca la 5. La versión exacta instalada
  la anota el [lockfile](glosario.md#lockfile).
- `"@tailwindcss/vite"`: el *plugin* (extensión) que conecta [Tailwind](glosario.md#tailwind)
  con [Vite](glosario.md#vite). Se activa en `astro.config.mjs`. El `@tailwindcss/` delante
  significa que el paquete pertenece a la "organización" de Tailwind en el registro de npm.
- `"astro"`: el framework. Trae la CLI, los componentes `.astro` y los
  [módulos virtuales](glosario.md#modulo-virtual) como `astro:content`.
- `"sharp"`: la librería que optimiza imágenes (ver [sharp](glosario.md#sharp)). Con ella el
  [componente `<Image>`](glosario.md#image-component) genera las fotos en
  [WebP](glosario.md#webp). Ojo con el rango `^0.35.5`: cuando la versión empieza por `0`, el
  `^` solo acepta 0.35.x (nunca 0.36).
- `"tailwindcss"`: el motor de Tailwind, el que lee tus clases y genera el CSS.
- `},` cierra `dependencies`.

```json
  "devDependencies": {
    "@astrojs/check": "^0.9.10",
    "typescript": "^6.0.3"
  }
}
```

- `"devDependencies"`: herramientas para quien desarrolla, no piezas del sitio.
- `"@astrojs/check"`: lo que hace funcionar `astro check` (el script `typecheck`). Sin él,
  Astro te pide instalarlo (lo cuenta la [lección de Astro](../01-astro.md), en la tabla de
  comandos).
- `"typescript"`: [TypeScript](glosario.md#typescript). `astro check` lo usa para revisar los
  tipos. Su configuración está en `tsconfig.json`.
- `}` cierra `devDependencies` y la última `}` cierra el objeto entero.

## Cómo se conecta

- **Entrada:** lo escribes tú (o `pnpm add` cuando instalas una librería). La spec 0001 dice
  que cada librería nueva se pregunta antes de instalarla.
- **`pnpm install`** lee `dependencies` y `devDependencies`, descarga las librerías en
  `node_modules/` y anota las versiones exactas en `pnpm-lock.yaml`. Antes mira
  [`pnpm-workspace.yaml`](pnpm-workspace.yaml.md) para saber a qué librerías deja ejecutar su
  script de instalación.
- **Los scripts** ponen en marcha a Astro, que lee
  [`astro.config.mjs`](astro.config.mjs.md); `typecheck` además lee
  [`tsconfig.json`](tsconfig.json.md).
- **Vercel** (feature 08, según la spec 0001) ejecutará `pnpm install` y `pnpm run build` con
  este mismo archivo, y publicará `dist/`.
- La spec 0001 prevé un script más, `"check:weight"`, para medir el
  [presupuesto de peso](glosario.md#presupuesto-de-peso). Aún no existe (tarea T6 sin hacer).

## Prueba tú

Vas a añadir tu propio script.

1. En `package.json`, cambia la línea `"astro": "astro"` por estas dos (fíjate en la coma
   nueva al final de la primera):
   ```json
       "astro": "astro",
       "hola": "echo Hola desde un script de pnpm"
   ```
2. En la terminal de VS Code ejecuta `pnpm hola`.
3. **Qué esperar:** pnpm escribe una línea con el nombre del proyecto y el script
   (`> e-commerce@0.0.1 hola …`) y debajo `Hola desde un script de pnpm`.
4. Ya que estás, prueba el atajo que existía: `pnpm astro --version` imprime la versión de
   Astro instalada.
5. **Deshacer:** borra la línea `"hola"` y la coma que añadiste después de `"astro": "astro"`.
   Si dejas una coma sobrante, pnpm se queja de que el JSON no es válido.

## Términos

- [pnpm](glosario.md#pnpm)
- [lockfile](glosario.md#lockfile)
- [build](glosario.md#build)
- [dist](glosario.md#dist)
- [servidor de desarrollo](glosario.md#servidor-de-desarrollo)
- [typecheck](glosario.md#typecheck)
- [vite](glosario.md#vite)
- [tailwind](glosario.md#tailwind)
- [typescript](glosario.md#typescript)
- [módulo virtual](glosario.md#modulo-virtual)
- [componente `<Image>`](glosario.md#image-component)
- [webp](glosario.md#webp)
- [presupuesto de peso](glosario.md#presupuesto-de-peso)
- [módulos ES](glosario.md#modulos-es)
- [CLI](glosario.md#cli)
- [rango de versiones](glosario.md#rango-de-versiones)
- [dependencies y devDependencies](glosario.md#devdependencies)
- [sharp](glosario.md#sharp)
