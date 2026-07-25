# Monitoramento Clínico de Tabagistas — APS/SUS

Sistema web para acompanhamento de pacientes tabagistas na Atenção Primária à Saúde (SUS), com foco em busca ativa, monitoramento de lesões bucais e análise por equipes de saúde.

## Run & Operate

- `npm run dev --workspace=@workspace/api-server` — API server (porta 8080, exposta em /api)
- `npm run dev --workspace=@workspace/sus-tabagismo` — Frontend React (porta 25447, exposta em /)
- `npm run typecheck` — typecheck completo
- `npm run build` — typecheck + build
- `npm run codegen --workspace=@workspace/api-spec` — regenera hooks e schemas do OpenAPI
- `npm run push --workspace=@workspace/db` — aplica mudanças de schema no DB (dev)
- Required env: `DATABASE_URL` (Postgres), `SESSION_SECRET`

## Stack

- npm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + Recharts + Framer Motion + Wouter
- API: Express 5 + express-session + bcryptjs
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — fonte de verdade do contrato da API
- `lib/db/src/schema/` — schema Drizzle (teams, patients, users)
- `artifacts/api-server/src/routes/` — rotas Express (auth, teams, patients, dashboard, charts)
- `artifacts/api-server/src/lib/auth.ts` — middlewares requireAuth/requireAdmin + computeAlertLevel
- `artifacts/sus-tabagismo/src/` — frontend React

## Product

- Login com controle de acesso (admin vs usuário)
- Dashboard com indicadores em tempo real (filtrável por equipe)
- Gestão completa de equipes (CRUD com transferência de pacientes)
- Cadastro e gestão de pacientes com identificação anônima (iniciais + ano + microárea)
- Alertas automáticos: 🔴 lesão sem diagnóstico, 🟡 avaliação vencida (+365 dias), 🟢 sem alerta
- Painel de gráficos: distribuição por sexo, faixa etária, situação, evolução mensal (12 meses)
- Interface responsiva mobile-first (otimizada para uso em UBS)

## Credenciais de acesso

- **Admin** — usuário: `admin` | senha: `admin123`
- **Usuário comum** — usuário: `usuario` | senha: `user123`

## Alert Logic

- **Vermelho**: tem lesão bucal (`has_oral_lesion = true`) E diagnóstico = `nenhum`
- **Amarelo**: última avaliação há mais de 365 dias OU sem data de avaliação
- **Verde/Sem alerta**: demais casos
- Pacientes inativos não entram nos alertas nem nos gráficos

## Architecture decisions

- Identificação do paciente sem dados sensíveis (sem nome completo, CPF ou endereço)
- Alert level computado no servidor (`computeAlertLevel` em `lib/auth.ts`), não no banco
- Sessões em memória com `express-session` (para persistência em produção, considerar `connect-pg-simple`)
- Datas de calendário usam `date(..., { mode: "string" })` no Drizzle para evitar conversões de timezone
- Orval gera hooks React Query e schemas Zod a partir de um único YAML OpenAPI

## User preferences

_Adicione aqui preferências confirmadas pelo usuário._

## Gotchas

- Ao alterar o schema do DB, rodar `npm run typecheck:libs` antes do typecheck dos artifacts
- `zod.coerce.date()` nos schemas Zod converte para `Date`; converter para string ISO antes de inserir no DB com `date({ mode: "string" })`
- Nunca usar `console.log` no servidor — usar `req.log` (handlers) ou `logger` (fora de request)
- Não usar `return res.json(...)` no Express 5 — usar `res.json(...); return;`
