---
name: Custom fetch credentials
description: customFetch em lib/api-client-react precisa de credentials:"include" para cookies de sessão funcionarem via Replit proxy
---

## Regra
Sempre manter `credentials: "include"` no `fetch()` dentro de `lib/api-client-react/src/custom-fetch.ts`.

**Why:** O Replit serve o frontend (porta 25447) e a API (porta 8080) pelo mesmo domínio via proxy path-based. O browser trata isso como same-origin, mas sem `credentials: "include"` o `fetch` usa `credentials: "same-origin"` que em alguns contextos de proxy não envia/armazena cookies de sessão. Resultado: login retorna 200 mas o cookie é descartado; `ProtectedRoute` chama `/auth/me` → 401 → redireciona para login em loop.

**How to apply:** A linha correta em `custom-fetch.ts`:
```typescript
const response = await fetch(input, { credentials: "include", ...init, method, headers });
```
O `credentials: "include"` deve vir ANTES de `...init` para que chamadas individuais possam sobrescrever se necessário.
