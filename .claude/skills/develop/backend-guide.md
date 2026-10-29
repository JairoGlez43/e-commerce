# Backend track — fixed phases, a senior rule in each

Work in this order. Skip a phase only if the feature truly has nothing for it.

## 1. Data layer
- Write the schema or migration exactly as the spec's data model says.
- **Actually run it**, then confirm the tables/columns exist with a read-only query.
- Destructive changes (drop, rename, delete data): stop, use plan mode, get explicit confirmation.
- Access rules (for example row-level security) are part of the data layer, not an afterthought.

## 2. Core logic
- Lives in the logic layer named in AGENTS.md, never in a handler or a component.
- Validate every external input at the boundary (requests, forms, third-party and AI responses).
- **Make repeated requests safe:** a double click or a retry must not create two records.

## 3. Endpoints and actions
- Check authentication **and** authorization: not just "is someone logged in" but
  "may this user touch this particular record".
- Return the project's standard result shape. Handlers delegate; they hold no business logic.
- Errors: log with a context prefix; send the user a human-readable message, never internals.

## 4. External services
- Secrets come from the environment only. Never send a secret to the browser.
- Create each client in one place and import it from there.
- Handle timeouts and failures; one failing call must not crash the whole operation.
- Close what you open (sessions, connections).
- Use the current API for the installed version (bundled docs or `researcher`), not memory.

## 5. Clean up
- Delete the code this replaces, so two versions never sit side by side.
- No dead paths, no commented-out code, no TODOs.

## 6. Safety pass
Re-read the diff for: secrets in client code · queries not scoped to the user · missing
validation · error messages that leak internals · logs containing personal data.
