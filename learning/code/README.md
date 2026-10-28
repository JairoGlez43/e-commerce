# El código, archivo por archivo

Una explicación línea a línea de cada archivo de código del proyecto, en el mismo orden de
carpetas que el repo: la explicación de `src/lib/price.ts` está en
[`src/lib/price.ts.md`](src/lib/price.ts.md).

- Los términos nuevos se definen una sola vez en el [glosario](glosario.md) y cada explicación
  enlaza ahí.
- Se actualiza cada vez que `/develop` o `/debug` crea o cambia un archivo de código.
- Las lecciones de conceptos (por qué Astro, cómo funciona algo) siguen en `learning/NN-*.md`,
  escritas con `/learn <tema>`. Esto es otra cosa: **qué hace cada línea de nuestro código**.

## Orden de lectura recomendado

Sigue el camino de los datos: de la configuración a los datos, luego a la lógica, el estilo y
por último las páginas que ve el cliente.

| # | Archivo | Qué es | Explicación |
|---|---|---|---|
| 1 | `package.json` | Nombre del proyecto, comandos y librerías | [ver](package.json.md) |
| 2 | `pnpm-workspace.yaml` | Permiso para que dos librerías se compilen al instalar | [ver](pnpm-workspace.yaml.md) |
| 3 | `astro.config.mjs` | Configuración de Astro: Tailwind, las fotos remotas de Supabase y la fuente de títulos | [ver](astro.config.mjs.md) |
| 4 | `tsconfig.json` | Configuración de TypeScript | [ver](tsconfig.json.md) |
| 1b | `scripts/check-weight.mjs` | El script `pnpm check:weight`: mide cada página contra el presupuesto de peso | [ver](scripts/check-weight.mjs.md) |
| 4b | `.env.example` | Plantilla de las variables de entorno (el número de WhatsApp y el proyecto de Supabase) | [ver](.env.example.md) |
| 4c | `src/env.d.ts` | Los tipos de esas variables | [ver](src/env.d.ts.md) |
| 5 | `supabase/schema.sql` | Las tablas del catálogo en Supabase, quién puede leerlas y el bucket de fotos | [ver](supabase/schema.sql.md) |
| 6 | `supabase/seed.sql` | Los datos de ejemplo: 6 categorías y 18 productos (viven en Supabase) | [ver](supabase/seed.sql.md) |
| 6a | `supabase/auth.sql` | Quién es el dueño (`is_owner()`) y los ajustes del login en el panel de Supabase | [ver](supabase/auth.sql.md) |
| 6a-bis | `supabase/products-write.sql` | Deja escribir productos solo al dueño (políticas con `is_owner()`) y permite un producto sin foto | [ver](supabase/products-write.sql.md) |
| 6a-ter | `supabase/publish.sql` | Publicar: la hora del último cambio del catálogo (con un trigger) y las peticiones de publicar, que solo puede crear el dueño | [ver](supabase/publish.sql.md) |
| 6a-quater | `supabase/functions/publish/index.ts` | La Edge Function `publish`: comprueba que es el dueño y llama al deploy hook secreto de Vercel | [ver](supabase/functions/publish/index.ts.md) |
| 6b | `src/lib/supabase.ts` | Lee las tablas, las fotos y la hora del último cambio de Supabase durante el build | [ver](src/lib/supabase.ts.md) |
| 7 | `src/content.config.ts` | Las colecciones: traen los datos de Supabase y validan su forma | [ver](src/content.config.ts.md) |
| 8 | `src/lib/price.ts` | Formatea un precio: `12500` → `12.500 CUP` | [ver](src/lib/price.ts.md) |
| 9 | `src/lib/site.ts` | Nombre, descripción e información de la tienda (horario, pagos, preguntas) | [ver](src/lib/site.ts.md) |
| 10 | `src/lib/catalog.ts` | Agrupa productos por categoría y los ordena | [ver](src/lib/catalog.ts.md) |
| 10b | `src/lib/whatsapp.ts` | El número de WhatsApp y los enlaces con el mensaje (pedido y contacto) | [ver](src/lib/whatsapp.ts.md) |
| 10c | `src/lib/date.ts` | Formatea una fecha con la hora de Cuba: `16 de octubre` | [ver](src/lib/date.ts.md) |
| 10d | `src/lib/auth.ts` | El login del dueño en el navegador: entrar, mantener la sesión, cerrarla y recuperar la contraseña | [ver](src/lib/auth.ts.md) |
| 10e | `src/lib/products.ts` | Los productos desde `/admin/`: leer, añadir, editar y borrar; las reglas del formulario y del id | [ver](src/lib/products.ts.md) |
| 10f | `src/lib/publish.ts` | Publicar desde `/admin/`: pedir la publicación, leer las tres horas y convertirlas en un estado | [ver](src/lib/publish.ts.md) |
| 11 | `src/styles/global.css` | Colores, fuentes y estilos base | [ver](src/styles/global.css.md) |
| 12 | `src/layouts/BaseLayout.astro` | El esqueleto `<html>` de todas las páginas | [ver](src/layouts/BaseLayout.astro.md) |
| 13 | `src/components/SiteHeader.astro` | La cabecera con el toldo y el enlace "Escríbenos" con el icono de WhatsApp | [ver](src/components/SiteHeader.astro.md) |
| 14 | `src/components/CategoryNav.astro` | La fila de chips de categorías | [ver](src/components/CategoryNav.astro.md) |
| 14b | `src/components/NoPhoto.astro` | La caja "Sin foto" de un producto que aún no tiene foto | [ver](src/components/NoPhoto.astro.md) |
| 15 | `src/components/ProductCard.astro` | La tarjeta de un producto | [ver](src/components/ProductCard.astro.md) |
| 15b | `src/components/ShopInfo.astro` | "Cómo comprar", recogida y horario, debajo de los productos | [ver](src/components/ShopInfo.astro.md) |
| 15c | `src/components/Faq.astro` | Las preguntas frecuentes, plegables sin JavaScript | [ver](src/components/Faq.astro.md) |
| 15d | `src/components/SiteFooter.astro` | El pie de página oscuro de todas las páginas de clientes | [ver](src/components/SiteFooter.astro.md) |
| 15e | `src/components/WhatsAppIcon.astro` | El icono oficial de WhatsApp (verde o blanco) de los enlaces a WhatsApp | [ver](src/components/WhatsAppIcon.astro.md) |
| 16 | `src/pages/index.astro` | La portada `/` | [ver](src/pages/index.astro.md) |
| 17 | `src/pages/categoria/[id].astro` | Las páginas `/categoria/<id>` | [ver](src/pages/categoria/%5Bid%5D.astro.md) |
| 18 | `src/pages/producto/[id].astro` | Las páginas `/producto/<id>` y su vista previa en WhatsApp | [ver](src/pages/producto/%5Bid%5D.astro.md) |
| 19 | `src/pages/estilo.astro` | La guía de estilo interna `/estilo` | [ver](src/pages/estilo.astro.md) |
| 19b | `src/pages/build.json.ts` | El archivo `/build.json`: cuándo se hizo el build y qué versión del catálogo enseña | [ver](src/pages/build.json.ts.md) |
| 20 | `src/pages/admin/index.astro` | La administración del dueño `/admin/` (login, productos y publicar), la única página con JavaScript | [ver](src/pages/admin/index.astro.md) |

Archivos que no son código y no tienen explicación: `src/assets/` (la fuente y, en
`src/assets/icons/`, los dos iconos oficiales de WhatsApp con su `SOURCE.md`: de dónde salen y
por qué no se editan; ver [`WhatsAppIcon.astro.md`](src/components/WhatsAppIcon.astro.md)),
`supabase/seed-photos/` (las 18 fotos de ejemplo y su `CREDITS.md`, que se suben a mano al bucket
de Supabase; ver [`seed.sql.md`](supabase/seed.sql.md)),
`public/` (favicon e imagen para WhatsApp), `pnpm-lock.yaml` (ver
[lockfile](glosario.md#lockfile)), `dist/` y `.astro/` (generados por Astro).

## Cómo está hecha cada explicación

1. **Ficha:** qué es, qué spec lo decidió, quién lo usa y qué usa.
2. **Para qué sirve:** el problema que resuelve, en 2-4 líneas.
3. **El código, por partes:** el archivo copiado tal cual, en bloques; debajo de cada bloque,
   qué hace cada línea.
4. **Cómo se conecta:** de dónde le llegan los datos y a dónde van.
5. **Prueba tú:** un cambio pequeño y seguro para ver el efecto (y cómo deshacerlo).
6. **Términos:** enlaces al glosario.
