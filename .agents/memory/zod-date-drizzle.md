---
name: Zod date coercion vs Drizzle string columns
description: Zod coerce.date() produz Date objects; colunas Drizzle com mode:"string" esperam strings — é preciso converter antes de inserir/atualizar
---

## Regra
Ao usar `zod.coerce.date()` (gerado pelo Orval a partir de campos `date` no OpenAPI) junto com colunas Drizzle `date({ mode: "string" })`, converter o Date para string ISO antes de inserir no banco.

**Why:** Orval gera `zod.coerce.date()` para campos de tipo `date` no OpenAPI spec. Isso faz o Zod converter a string da request em um objeto `Date`. Mas o Drizzle com `mode: "string"` espera uma string `"YYYY-MM-DD"`. TypeScript detecta a incompatibilidade; o banco pode rejeitar ou comportar de forma inesperada.

**How to apply:** Usar uma função helper antes de inserir/atualizar:
```typescript
function toDateString(d: Date | string | null | undefined) {
  if (d == null) return d;
  if (typeof d === "string") return d;
  return d.toISOString().split("T")[0];
}
```
Aplicar o cast com `as any` no valor passado para `.values()` ou `.set()` do Drizzle, já que o TypeScript não consegue inferir o tipo correto após a conversão.

Campos afetados em patients: `registrationDate`, `lastEvaluationDate`.
