# learning/code — local rules

Line-by-line walkthroughs of every source file, for the project owner, who is learning. These
rules apply only inside this folder and add to the root `AGENTS.md`.

- **Language:** walkthroughs and the glossary are written in Spanish; code blocks are copied from
  the source exactly as they are (English code and comments).
- **Location:** one file per source file, mirroring the repo tree:
  `src/lib/price.ts` → `learning/code/src/lib/price.ts.md`. Link targets with brackets use
  `%5B` / `%5D` (`producto/%5Bid%5D.astro.md`).
- **When:** any change that creates or edits a source file creates or updates its walkthrough in
  the same change, adds new terms to `glosario.md`, and adds new files to the table in
  `README.md`. Stale sentences elsewhere (e.g. "until feature NN") are fixed too.
- **Format** (as in `README.md`): header card (Qué es · Lo decidió · Lo usan · Usa) → Para qué
  sirve → El código, por partes (the whole file, verbatim, in blocks; every line explained) →
  Cómo se conecta → Prueba tú (a small, reversible experiment with the exact command and the
  expected result) → Términos (glossary links).
- **Glossary:** each term is defined once in `glosario.md` under a `### ascii-kebab-slug` heading
  (aliases via `<a id="…"></a>`); walkthroughs link to it instead of redefining. Never explain a
  term with another term that has not been explained.
- **Accuracy:** explain only what the code and specs show; mark anything taken from a spec and
  not verified as "(según la spec)". A "Prueba tú" must state only results that were observed or
  are certain.
- **Checks before finishing:** every relative link and `glosario.md#anchor` resolves, and the
  code blocks joined in order equal the source file (ignoring blank lines).
- Never quote the content of `.env`; `.env.example` is the documented stand-in.
