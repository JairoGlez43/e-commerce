# `src/lib/date.ts`

> **Qué es:** la función `formatDay()`, que convierte una fecha en el texto que ve el cliente (`16 de octubre`) · **Lo decidió:** [spec 0010](../../../../docs/specs/0010-shop-information.md) (Design → "Last updated date", AC2) · **Lo usan:** [`src/pages/index.astro`](../pages/index.astro.md) (la línea "Actualizado el …") · **Usa:** `Intl.DateTimeFormat`, que viene incluido en JavaScript

## Para qué sirve

La portada dice "Actualizado el 15 de octubre" para que el cliente sepa que los precios son de
hace poco. Esa fecha hay que escribirla en español y **con la hora de Cuba**, no con la del
ordenador que construye el sitio. Este archivo es el único sitio del proyecto que formatea
fechas (como `price.ts` lo es para los precios): si mañana se quiere otro formato, se cambia
aquí.

## El código, por partes

```ts
// Date formatting, the one place it lives (spec 0010).
```

- "El formato de fechas, el único sitio donde vive (spec 0010)." Avisa de que ningún otro
  archivo debe formatear fechas por su cuenta.

```ts

// Cuba's time zone, not the build machine's: Vercel builds in UTC, so without it a build
// after 8 p.m. in Cuba would show the next day.
const dayFormat = new Intl.DateTimeFormat('es-ES', {
	day: 'numeric',
	month: 'long',
	timeZone: 'America/Havana',
});
```

- El comentario: "La zona horaria de Cuba, no la de la máquina que construye: Vercel construye
  en UTC, así que sin ella un build después de las 8 de la noche en Cuba mostraría el día
  siguiente." (Ver [zona horaria](../../glosario.md#zona-horaria).) Cuba va 4 horas por detrás
  de UTC en octubre: a las 20:00 de Cuba en UTC ya son las 00:00 del día siguiente.
- `const dayFormat = new Intl.DateTimeFormat('es-ES', { ... });`: crea **una vez** un
  formateador de fechas ([Intl.DateTimeFormat](../../glosario.md#intl-datetimeformat)) y lo
  guarda en `dayFormat`. Está fuera de la función para no crearlo de nuevo en cada llamada. No
  lleva `export`: solo lo usa este archivo.
  - `'es-ES'`: las reglas del español: los meses en minúscula y la palabra "de" entre día y mes.
  - `day: 'numeric'`: el día como número sin cero delante (`5`, no `05`).
  - `month: 'long'`: el nombre completo del mes (`octubre`, no `oct`).
  - No pide año ni hora, así que no salen.
  - `timeZone: 'America/Havana'`: calcula el día con el reloj de La Habana, sea cual sea el
    ordenador donde corre el [build](../../glosario.md#build).
- **Un caso real:** el 2026-10-16 se construyó el sitio a la 01:08 UTC. En La Habana eran las
  21:08 del 15 de octubre, y la portada dijo "Actualizado el **15** de octubre". El ordenador
  de ese build estaba en la zona `Europe/Madrid`, donde ya era día 16: sin `timeZone`, la
  portada habría dicho "16 de octubre", un día que en Cuba aún no había llegado.

```ts

// 2026-10-16 → "16 de octubre".
export function formatDay(date: Date): string {
	return dayFormat.format(date);
}
```

- El comentario es un ejemplo: la fecha 2026-10-16 da el texto `"16 de octubre"`.
- `export function formatDay(date: Date): string`: una función exportada
  ([import-export](../../glosario.md#import-export)) que recibe un `Date` (el objeto de fecha de
  JavaScript, como el de `new Date()`) y devuelve un texto (`: string`, ver
  [tipo](../../glosario.md#tipo)).
- `return dayFormat.format(date);`: usa el formateador de arriba y devuelve el resultado.

## Cómo se conecta

- **Entra:** una fecha. Hoy la única que recibe es `new Date()` ("ahora"), escrita en el
  [frontmatter](../../glosario.md#frontmatter) de [`src/pages/index.astro`](../pages/index.astro.md).
  Como ese código corre una sola vez, en el build, "ahora" es el momento del build: la última
  vez que se publicó el catálogo.
- **Sale:** un texto como `15 de octubre`, que la portada pone en
  `<p class="text-sm text-muted">Actualizado el 15 de octubre</p>`.
- La fecha no cambia sola con los días: solo cambia cuando se vuelve a construir el sitio (cada
  vez que se sube un cambio a `main`, Vercel construye de nuevo).

## Prueba tú

Mira el mismo instante en tres zonas horarias, sin tocar ningún archivo.

1. En la terminal de VS Code (Git Bash), en la carpeta del proyecto, ejecuta:
   `node -e "const f=(z)=>new Intl.DateTimeFormat('es-ES',{day:'numeric',month:'long',timeZone:z}).format(new Date('2026-10-16T01:08:00Z'));console.log(f('America/Havana'),'|',f('Europe/Madrid'),'|',f('UTC'))"`
2. **Qué deberías ver:** `15 de octubre | 16 de octubre | 16 de octubre`. Es el instante del
   build real de arriba (`Z` al final de la fecha = UTC): en La Habana aún era día 15.
3. No hay nada que deshacer: el comando no cambia ningún archivo.

## Términos

- [zona-horaria](../../glosario.md#zona-horaria) *(nuevo)* ·
  [intl-datetimeformat](../../glosario.md#intl-datetimeformat) *(nuevo)* ·
  [intl-numberformat](../../glosario.md#intl-numberformat)
- [build](../../glosario.md#build) · [frontmatter](../../glosario.md#frontmatter)
- [import-export](../../glosario.md#import-export) · [tipo](../../glosario.md#tipo)
