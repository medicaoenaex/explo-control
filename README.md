# EXPLO CONTROL

Gestão de estoques, transferências, consumo e rastreabilidade de materiais controlados
para o grupo com duas unidades (Paiol Peneirinha e Paiol Pico), com CNPJs separados.

> **Etapa 1 — Arquitetura e fundação.** Modelo de dados, regras de estoque com testes,
> autenticação, layout responsivo, painel e telas de consulta com dados de demonstração.

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| App | Next.js 15 (App Router) + React 19 + TypeScript | Front e back no mesmo projeto, Server Components e Server Actions |
| Banco | PostgreSQL 16 | Transações, travas de linha e restrições CHECK para as regras de estoque |
| ORM | Prisma 6 | Migrações versionadas e tipagem do banco |
| UI | Tailwind CSS 4 + componentes próprios + ícones Lucide | Sem dependência paga; visual consistente |
| Validação | Zod | Mesmas regras no formulário e no servidor |
| Auth | Sessão própria no banco (cookie httpOnly, token com hash SHA-256, bcrypt) | Sem serviço externo; funciona em servidor interno |
| Testes | Vitest contra PostgreSQL real | Testa as travas e restrições de verdade |

Nenhum serviço pago é necessário. Roda em qualquer servidor com Node 20+ e PostgreSQL 14+.

## Como rodar

```bash
cp .env.example .env            # ajuste DATABASE_URL e SESSION_SECRET
npm install
npx prisma migrate deploy        # cria as tabelas
npm run db:seed                  # dados FICTÍCIOS de demonstração
npm run dev                      # http://localhost:3000
```

Usuários de demonstração (senha `Demo@2026`): `admin@demo.explo`, `gestor.peneirinha@demo.explo`,
`gestor.pico@demo.explo`, `operador.peneirinha@demo.explo`, `operador.pico@demo.explo`, `consulta@demo.explo`.

Testes (usam um banco separado, `explo_control_test`, ou `TEST_DATABASE_URL`):

```bash
npm test
```

## Regras centrais de estoque

- **Saldo nunca é digitado.** É a soma das movimentações `VALIDADO` do vínculo produto × unidade (livro-razão em `Movimento`).
- **Catálogo central + vínculo por unidade.** `Produto` identifica o material; `ProdutoUnidade` habilita o produto em cada paiol, com código local e situação próprios. Estoques nunca se misturam.
- **Lançamentos passam por validação**, feita por outra pessoa (segregação de funções).
- **Baixas travam o vínculo** (`SELECT … FOR UPDATE`) antes de conferir o saldo: dois lançamentos simultâneos não deixam saldo negativo.
- **Transferência:** ao enviar, debita a origem e o material fica *em trânsito*; o destino só recebe o saldo após a conferência. Exige vínculo ativo no destino.
- **Consolidado = disponível nas unidades + em trânsito.** Transferência interna não altera o total do grupo.
- **Divergências** (falta ou sobra) ficam pendentes até análise formal com justificativa: a falta segue em trânsito até ser aprovada como perda ou devolvida à origem; a sobra só entra no estoque após aprovação.
- **Auditoria** em todas as ações; a tabela é somente-inserção (trigger no banco).

## Estrutura

```
prisma/schema.prisma        modelo de dados comentado
prisma/migrations/          migrações (inclui CHECKs e trigger de auditoria)
prisma/seed.ts              demonstração fictícia
src/server/estoque.ts       regras de estoque e transferências (único ponto que cria movimentações)
src/server/permissoes.ts    matriz perfil × ação × unidade
src/server/auth.ts          login, sessão e logout
src/app/(app)/              telas autenticadas
tests/estoque.test.ts       testes das regras
```
