# `pnpm-workspace.yaml`

> **Qué es:** ajustes de [pnpm](glosario.md#pnpm); hoy solo uno: a qué librerías se les permite
> ejecutar su script de instalación · **Lo decidió:**
> [spec 0001 · Stack](../../docs/specs/0001-stack.md) ("pnpm gotcha", tarea T1) ·
> **Lo usan:** pnpm, cada vez que ejecutas `pnpm install` · **Usa:** los nombres de dos
> librerías que trae el proyecto, `esbuild` y `sharp`.

## Para qué sirve

Algunas librerías ejecutan un pequeño programa al instalarse. pnpm 10, por seguridad, no los
ejecuta salvo que tú lo autorices. Dos librerías de este proyecto lo necesitan para funcionar,
y este archivo es la lista de autorizadas. Sin él, la optimización de imágenes del build
podría fallar (según la spec 0001).

## El código, por partes

El archivo está escrito en [YAML](glosario.md#yaml), un formato de configuración como JSON
pero sin llaves ni comillas: la estructura la marcan la sangría y los guiones.

```yaml
# pnpm 10 skips dependency install scripts unless they are listed here.
# esbuild (used by Astro) and sharp (Astro image optimization) need theirs to work.
```

- En YAML, `#` empieza un comentario: pnpm lo ignora.
- Línea 1: "pnpm 10 se salta los scripts de instalación de las dependencias, salvo los de las
  que aparecen aquí". Un [script de instalación](glosario.md#script-de-instalacion) es código
  que una librería ejecuta en tu PC justo después de descargarse. Como ese código puede hacer
  cualquier cosa, pnpm 10 lo bloquea por defecto.
- Línea 2: "esbuild (que usa Astro) y sharp (la optimización de imágenes de Astro) necesitan el
  suyo para funcionar". Las dos tienen una parte que no es JavaScript (esbuild está escrito en
  Go; sharp usa una librería de imágenes escrita en C) y su script prepara esa parte para tu
  sistema operativo.

```yaml
onlyBuiltDependencies:
  - esbuild
  - sharp
```

- `onlyBuiltDependencies:` es el nombre del ajuste de pnpm. Se lee "solo estas dependencias
  pueden ejecutar su script de instalación". Los dos puntos dicen que lo que sigue es su valor.
- `  - esbuild`: el guion (con sangría) añade un elemento a una lista. En JSON sería
  `"onlyBuiltDependencies": ["esbuild", "sharp"]`.
  [esbuild](glosario.md#esbuild) es la herramienta que convierte TypeScript en JavaScript muy
  rápido; [Vite](glosario.md#vite) y Astro la usan por dentro.
- `  - sharp`: segundo elemento. [sharp](glosario.md#sharp) es la librería que convierte las
  fotos a [WebP](glosario.md#webp) y genera los tamaños del
  [`srcset`](glosario.md#srcset) durante el build.

Sobre el nombre del archivo: *workspace* viene de una función de pnpm para tener varios
proyectos en un mismo repositorio. Aquí solo hay un proyecto; el archivo se usa únicamente
para guardar este ajuste.

## Cómo se conecta

- **Lo lee:** `pnpm install`, antes de instalar lo que pide
  [`package.json`](package.json.md).
- **`esbuild`** no aparece en `package.json`: llega como dependencia de otras librerías.
  `pnpm why esbuild` muestra la cadena: la piden `astro` directamente, y también `vite`, que
  a su vez la piden `astro` y `@tailwindcss/vite`.
- **`sharp`** sí está en `package.json` (y además `astro` también la pide). La usa el
  [componente `<Image>`](glosario.md#image-component) en `src/components/ProductCard.astro`,
  `src/pages/producto/[id].astro` y `src/pages/estilo.astro`, cuando el build optimiza las fotos
  de los productos, que descarga de Supabase ([imagen remota](glosario.md#imagen-remota)).
- **Si faltara este archivo** (según la spec 0001): `pnpm install` avisaría con
  `ERR_PNPM_IGNORED_BUILDS` y la optimización de imágenes podría fallar en el build.

## Prueba tú

Un experimento que solo mira, sin cambiar nada.

1. En la terminal de VS Code ejecuta `pnpm why esbuild`.
2. **Qué esperar:** un árbol que empieza por `dependencies:` y muestra quién pide esbuild:
   `astro 7.3.5` (directamente y a través de `vite`) y `@tailwindcss/vite` (a través de
   `vite`). Así compruebas que esbuild es "usada por Astro", como dice el comentario, aunque
   tú nunca la instalaste.
3. Ahora ejecuta `pnpm why sharp`: aparece dos veces, como dependencia directa del proyecto y
   como dependencia de `astro`.
4. **Deshacer:** no hay nada que deshacer; `pnpm why` solo lee.

## Términos

- [pnpm](glosario.md#pnpm)
- [vite](glosario.md#vite)
- [webp](glosario.md#webp)
- [srcset](glosario.md#srcset)
- [componente `<Image>`](glosario.md#image-component)
- [YAML](glosario.md#yaml)
- [script de instalación](glosario.md#script-de-instalacion)
- [esbuild](glosario.md#esbuild)
- [sharp](glosario.md#sharp)
