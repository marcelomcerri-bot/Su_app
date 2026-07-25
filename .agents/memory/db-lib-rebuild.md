---
name: DB lib rebuild after schema change
description: Após mudar schema Drizzle em lib/db, reconstruir declarações antes de fazer typecheck dos artifacts
---

## Regra
Always run `npm run typecheck:libs` after changing any file in `lib/db/src/schema/` and before running typecheck in artifacts.

**Why:** TypeScript uses pre-compiled `.d.ts` declarations for workspace libs. If the schema changes but the declarations are not rebuilt, the artifact typecheck will report errors like "Module '@workspace/db' has no exported member 'patientsTable'" even though the runtime code is correct.

**How to apply:** Correct sequence when changing schema:
1. Edit `lib/db/src/schema/*.ts`
2. Run `npm run typecheck:libs` (rebuilds all `.d.ts` for libs)
3. Run `npm run typecheck --workspace=@workspace/api-server`
4. Run `npm run push --workspace=@workspace/db` if needed to apply to database
