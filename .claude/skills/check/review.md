# Review — a fresh model reads the diff

A model reviewing its own work tends to agree with itself. The review runs on a different model.

## 1. What to review
Default: the uncommitted changes plus the commits on this branch that aren't on the main branch.
Respect steering in the input: "uncommitted", a commit range, a folder, "with <model>".

## 2. Delegate to the `reviewer` subagent
- Pass: the diff range, the feature's spec path, and any specific concern from the input.
- **Model:** if the owner named one, pass it. Otherwise make sure the reviewer runs on a
  different model than this session (for example opus ↔ sonnet): pass that model explicitly if
  the reviewer's default is the same as yours.

## 3. Save the report
Write the reviewer's report to `docs/reviews/<YYYY-MM-DD>-<feature-slug>.md`, worst first:
🔴 Critical · 🟡 Important · 🟢 Minor — then **Done well** and **What was checked**.
Note at the top which model reviewed and which wrote the code.

## 4. Status lines
Tick **Review it** in the scope. If it was the last required check (GA, with Document also
done) and the spec isn't Assumed: feature → `done`, spec → `Accepted`.

## Hand off
"Findings saved to `docs/reviews/…`. You decide what to fix (`/develop` or `/debug`).
Next: `/document`. Then `/clear`."
