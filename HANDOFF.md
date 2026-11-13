# EXPLO CONTROL — Documento de passagem do projeto

Situação em **13/11/2026, fim da tarde** (atualizado depois dos PRs 7 a 11). Este documento reúne tudo o que foi feito até agora, para que outra pessoa (ou outro Claude) continue o trabalho sem precisar reconstruir o contexto.

> **Segurança:** este documento não contém senhas, endereços de conexão nem chaves. Onde um valor secreto é necessário, ele indica **o nome da variável e onde obtê-la**.

---

## Resumo do que foi feito (13/11/2026)

1. **Etapa 1 (manhã):** arquitetura, modelo de dados, regras de estoque e transferência com testes, login com perfis, painel e telas de consulta, com dados fictícios.
2. **Código no GitHub** (`medicaoenaex/explo-control`) e **publicação gratuita**: banco no Supabase (schema `explo` dentro do projeto `paiol-desmonte`) e site na Vercel.
3. **Correções de publicação (PRs 1 a 5):** variáveis de conexão, região São Paulo, pool de conexões, seed resistente à lentidão e página de autodiagnóstico.
4. **Documento de passagem (PR 6)** para levar o projeto a outra conta.
5. **Dados de demonstração zerados** e **tela Nova entrada** com validação (PR 7).
6. **Transferência direta** entre paióis, que entra no destino na hora, a pedido do Rodrigo (PR 8), e que aparece também em Entradas do destino (PR 9).
7. **Linha do tempo das notas fiscais** com pesquisa (PR 10).
8. **Novo consumo** e **aba Sicoex** para conferir o saldo do Sicoex com o saldo diário (PR 11).
9. **Pendente:** destravar a produção na Vercel (Promote/Undo Rollback), trocar senhas, cadastrar os dados reais e receber o restante da especificação.

---

## 1. Objetivo do sistema

O EXPLO CONTROL é um sistema web para gestão administrativa de **estoques, produtos, entradas, transferências, consumo, produção e rastreabilidade de materiais controlados** (explosivos, acessórios e insumos) de uma operação de mineração.

Hoje o controle é feito em planilhas Excel separadas. O objetivo é centralizar tudo numa aplicação **funcional de verdade** (banco de dados, login, permissões, histórico, relatórios), não só um protótipo visual. O desenvolvimento é **por etapas**, e o dono do projeto (Rodrigo, que não é técnico) valida cada etapa antes de avançar.

## 2. Contexto operacional

O grupo tem **duas unidades com CNPJs diferentes**, do mesmo grupo empresarial:

| Unidade | O que faz |
|---|---|
| **Paiol Peneirinha** | Produz emulsão. Controla acessórios explosivos e outros materiais. Recebe materiais, tem estoque próprio e transfere materiais para o Paiol Pico. |
| **Paiol Pico** | Não produz. Recebe materiais da Peneirinha, tem estoque próprio, registra o consumo administrativo na Mina Pico e também transfere emulsão e nitrato para a Peneirinha. |

O sistema precisa:

- mostrar o estoque **de cada unidade** e o **consolidado do grupo**;
- manter os CNPJs **separados jurídica e documentalmente**;
- controlar entradas e saídas de cada unidade e **rastrear transferências** entre os paióis;
- identificar **pendências e divergências**;
- gerar relatórios individuais e consolidados.

**Regra fundamental:** a visão consolidada **não pode duplicar** materiais transferidos entre unidades. O sistema distingue **estoque disponível**, **estoque em trânsito** e **estoque total do grupo**.

## 3. Especificação original (prompt mestre)

O Rodrigo enviou um "prompt mestre" com a especificação. **Ele chegou cortado no item 12 (Módulo de Produção)**; o restante (item 12 em diante: produção, e provavelmente inventário, fechamento semanal, relatórios, importação de Excel, anexos, produção/hospedagem etc.) **ainda não foi recebido**. Peça ao Rodrigo o texto completo.

Resumo dos itens recebidos (1 a 11):

1. **Papel e objetivo:** arquiteto/dev full stack; sistema profissional, seguro, responsivo; por etapas.
2. **Contexto operacional:** descrito na seção 2 acima.
3. **Tecnologias recomendadas:** Next.js + React + TypeScript, PostgreSQL, Prisma, Tailwind, Zod, autenticação segura com sessão e permissões, Git/GitHub, testes. **Evitar dependências pagas**; antes de qualquer serviço com custo, explicar e pedir aprovação.
4. **Identidade visual:** corporativa, moderna, minimalista, cores sóbrias, boas tabelas; barra lateral no computador e navegação adaptada no celular; cabeçalho com usuário e unidade selecionada; pesquisa rápida; filtros; notificações de pendências; uso sem conhecimento técnico.
5. **Painel (dashboard):** indicadores (unidades, produtos, movimentações, entradas, saídas, transferências pendentes, divergências, situação do fechamento semanal); filtros (período, CNPJ, unidade, produto, categoria); atalhos para os módulos. Dados reais do banco; **durante o desenvolvimento, só dados fictícios claramente marcados como demonstração**.
6. **Empresas e unidades:** empresa (razão social, nome fantasia, CNPJ, situação, data); unidade (nome do paiol, empresa, CNPJ, descrição, situação, responsável). Novas unidades sem reconstruir o sistema.
7. **Produtos e materiais (prioritário):** catálogo central (código, descrição, categoria, unidade de medida, classificação, controle de lote, situação, data, usuário) + **cadastro individual por unidade** (vínculo com código local, situação própria, data, responsável). Produto pode existir só numa unidade ou nas duas; cadastrar numa não habilita na outra; inativar numa só; estoques independentes; sem duplicidades; inativo não recebe movimentação; histórico preservado; **transferência exige vínculo no destino** (se não houver, pedir vínculo autorizado antes de confirmar o recebimento).
8. **Estoque:** baseado em movimentações; consultas por produto, unidade, CNPJ, consolidado, categoria, lote, histórico, sem movimentação no período. **Saldo nunca editado à mão.** Impedir movimentação inválida, duplicidade, inconsistência de unidade de medida, baixa acima do saldo, produto não vinculado.
9. **Entradas:** data, empresa/CNPJ, unidade de destino, nº do documento, produto, quantidade, unidade de medida, lote, fornecedor, observações, responsável, **anexo documental**. Atualiza estoque após validação/aprovação. Histórico por produto, documento, unidade e período.
10. **Transferências (muito importante):** campos (id único, data, origem, destino, CNPJs, documento, produto, quantidade enviada, responsáveis pelo envio e recebimento, observações); fluxo (registra → verifica vínculo no destino → verifica saldo → enviada → em trânsito → pendência no destino → conferência → recebida → estoques atualizados); status (Rascunho, Pendente de envio, Em trânsito, Aguardando conferência, Recebida, Divergente, Cancelada); regras (sem quantidade acima do saldo, sem produto sem vínculo no destino, **nunca confirmar recebimento automaticamente**, registrar diferenças, exigir análise de divergências, preservar histórico); em trânsito conta **uma vez só** no consolidado.
11. **Consumo:** data, empresa, unidade, produto, quantidade, unidade de medida, referência documental, responsável, observações. Gera saída após validação. Consultas por período, unidade, CNPJ, produto, responsável.
12. **Produção:** "A Peneirinha possui atividade de produção de emulsão. Criar um mód…" — **texto cortado aqui.**

## 4. Arquitetura e stack

| Camada | Escolha | Motivo |
|---|---|---|
| Aplicação | **Next.js 15** (App Router) + **React 19** + **TypeScript** | Front e back no mesmo projeto; Server Components e Server Actions |
| Banco | **PostgreSQL** (16 local; Supabase em produção de demonstração) | Transações, travas de linha (`FOR UPDATE`), restrições `CHECK`, trigger |
| ORM | **Prisma 6** | Migrações versionadas e tipagem |
| Interface | **Tailwind CSS 4**, componentes próprios (`src/components/ui.tsx`), ícones **Lucide** | Sem custo, visual consistente |
| Validação | **Zod** (`src/lib/validacao.ts`) | Mesmas regras no formulário e no servidor |
| Login | **Sessão própria no banco**: cookie `explo_sessao` httpOnly com token aleatório; no banco só o hash SHA-256; senha com bcrypt; sessão de 8 h; bloqueio simples após 5 tentativas | Sem serviço externo; funciona em servidor interno |
| Testes | **Vitest** contra PostgreSQL real | Testa travas e restrições de verdade |

Nenhum serviço pago. Roda em qualquer servidor com Node 20+ e PostgreSQL 14+.

### Estrutura de pastas

```
prisma/schema.prisma          modelo de dados comentado
prisma/migrations/            migração inicial (inclui CHECKs e trigger de auditoria)
prisma/seed.ts                dados FICTÍCIOS de demonstração
src/server/estoque.ts         regras de estoque e transferências (ÚNICO ponto que cria movimentações)
src/server/permissoes.ts      matriz perfil × ação × unidade
src/server/auth.ts            login, sessão e logout
src/server/contexto.ts        usuário logado + unidade selecionada (cookie)
src/lib/db.ts                 cliente Prisma (ajusta pool: connection_limit ≥ 5, pool_timeout 20 s)
src/lib/validacao.ts          schemas Zod
src/lib/navegacao.ts          itens do menu (flag "pronto" marca telas ainda não feitas)
src/instrumentation.ts        grava erros de servidor na Auditoria (acao = ERRO_SERVIDOR)
src/middleware.ts             sem cookie de sessão → /login (exceto /login e /diagnostico)
src/app/(app)/                telas autenticadas
src/app/login/                tela de login
src/app/diagnostico/          autoteste do ambiente (ver seção 10)
src/server/sicoex.ts          confronto com o Sicoex
src/app/(app)/entradas/nova   Nova entrada (consumo usa o mesmo formulário em consumo/novo)
src/app/(app)/transferencias/nova   Nova transferência (direta)
src/app/(app)/notas/          linha do tempo das notas fiscais
src/app/(app)/sicoex/         aba Sicoex
tests/estoque.test.ts         20 testes das regras
vercel.json                   região das funções: gru1 (São Paulo)
```

## 5. Modelo de dados (Prisma)

- **Usuario** (nome, e-mail, senhaHash, perfil, situação) · **Sessao** (tokenHash, expiração) · **AcessoUnidade** (quais unidades cada usuário opera; ADMIN acessa todas).
- **Empresa** (razão social, nome fantasia, CNPJ só dígitos e único, situação) → **Unidade** (nome, sigla, descrição, situação, `realizaProducao`, responsável).
- **Categoria**, **UnidadeMedida** (sigla, casas decimais).
- **Produto** = catálogo central (código único, descrição, categoria, unidade de medida, classificação `EXPLOSIVO | ACESSORIO_EXPLOSIVO | INSUMO_PRODUCAO | MATERIAL_GERAL`, `controlaLote`, situação, criado por). **Não guarda saldo.**
- **ProdutoUnidade** = vínculo do produto com a unidade (código local, situação própria, associado por/em). Únicos: `(produtoId, unidadeId)` e `(unidadeId, codigoLocal)`. **Estoque é sempre por vínculo.**
- **Lote** por produto (número único por produto, fabricação, validade).
- **Movimento** = livro-razão. Quantidade **com sinal** (+ entra, − sai), na unidade de medida do produto. Tipos: `ENTRADA, CONSUMO, TRANSFERENCIA_SAIDA, TRANSFERENCIA_ENTRADA, TRANSFERENCIA_RETORNO, TRANSFERENCIA_SOBRA, PRODUCAO_ENTRADA, PRODUCAO_CONSUMO, AJUSTE_INVENTARIO`. Status: `PENDENTE, VALIDADO, REJEITADO, ESTORNADO`. `chaveIdempotencia` única impede lançar o mesmo evento duas vezes.
- **Transferencia** (código `TRF-AAAA-000001`, status, origem/destino, **CNPJs gravados no envio**, documento, responsáveis e datas de criação/envio/recebimento/cancelamento) + **TransferenciaItem** (produto, lote, enviada, recebida, resolução de divergência, justificativa, aprovado por).
- **FechamentoSemanal** (unidade, semana, status `ABERTO | EM_CONFERENCIA | FECHADO`) — só o modelo; a tela ainda não existe.
- **Auditoria** (usuário, ação, entidade, dados JSON) — **somente inserção**: um trigger no banco bloqueia UPDATE e DELETE.
- **SaldoSicoex** (PR 11): saldo informado no Sicoex por paiol × produto × data (único por essa combinação), com observações e quem registrou. Serve só para confronto; não altera o estoque.
- Quase todas as tabelas têm `demonstracao: Boolean` para marcar dados fictícios.

Restrições no banco (migração inicial): origem ≠ destino; quantidade enviada > 0; recebida ≥ 0; movimento ≠ 0; **sinal do movimento coerente com o tipo**; trigger `auditoria_imutavel`.

## 6. Regras de negócio implementadas (em `src/server/estoque.ts`)

1. **Saldo nunca é digitado:** é a soma dos movimentos `VALIDADO` do vínculo (e do lote, quando há).
2. **Entradas e consumos** são registrados como `PENDENTE` e só contam no saldo após **validação por outra pessoa** (segregação de funções; o ADMIN pode validar o próprio).
3. **Não baixa mais que o saldo.** Toda baixa trava o vínculo com `SELECT … FOR UPDATE` antes de conferir; duas baixas simultâneas não deixam saldo negativo.
4. Bloqueia movimentação de **produto não vinculado**, **produto inativo** (no catálogo ou na unidade) e **unidade inativa**.
5. **Lote:** produto com controle de lote exige lote, e o saldo é conferido por lote; produto sem controle não aceita lote.
6. **Entrada duplicada** (mesmo documento + produto + unidade + lote) é bloqueada.
7. **Transferência direta (regra em uso desde o PR 8, a pedido do Rodrigo):** pela tela, a transferência é feita numa única operação (`transferirDireto`): confere vínculo ativo na origem **e no destino**, trava e confere o saldo da origem (somando linhas repetidas), **debita a origem e credita o destino na mesma hora** e grava a transferência já como **Recebida**, com código, nota fiscal, CNPJs, itens, movimentos de saída e entrada ligados ao item e auditoria (`TRANSFERENCIA_DIRETA`). Não há "em trânsito" nem conferência nesse caminho. Exige permissão `transferencia.enviar` na origem (Admin ou Gestor; o Operador não pode).
   - A transferência também aparece na tela **Entradas** do paiol de destino como "Transferência de <origem>" (PR 9). É só exibição: o saldo entra uma única vez.
8. **Fluxo completo com trânsito (regra original, ainda no código e nos testes, mas sem tela):**
   - criar (Rascunho) → solicitar envio (Pendente de envio) → **enviar**: confere vínculo ativo **no destino** e saldo na origem (somando linhas repetidas do mesmo produto), **debita a origem** e o status vira **Em trânsito**;
   - destino registra chegada (Aguardando conferência) → **confirma recebimento** informando a quantidade conferida de **cada** item; **quem enviou não pode confirmar**;
   - o destino recebe crédito do recebido (limitado ao enviado).
9. **Consolidado = disponível nas unidades + em trânsito.** Transferência interna não altera o total do grupo (com a transferência direta, o trânsito fica sempre zero).
10. **Divergências (só no fluxo com trânsito):** qualquer diferença deixa a transferência **Divergente**.
   - **Falta:** continua contada como em trânsito até análise; a análise escolhe **ajuste aprovado** (a perda sai do grupo) ou **retorno à origem** (volta ao saldo da origem).
   - **Sobra:** só entra no estoque do destino após aprovação; não pode ser "retorno à origem".
   - Justificativa obrigatória (mín. 10 caracteres). Quando todos os itens estão resolvidos, vira **Recebida**.
11. **Cancelamento** (fluxo com trânsito) só antes do envio. Uma transferência direta não tem cancelamento pela tela; a correção seria uma transferência no sentido inverso.
12. **Sicoex (PR 11, `src/server/sicoex.ts`):** no Sicoex (sistema do Exército para produtos controlados) as baixas são lançadas só no dia do desmonte, enquanto no EXPLO CONTROL o consumo é diário. Por isso o saldo Sicoex de uma data é comparado com o **saldo diário do sistema no fim daquele mesmo dia** (horário de Brasília). A tela mostra **Confere** ou a diferença (Sicoex − diário) em vermelho, e também o **consumo diário lançado depois dessa data**, que ainda falta lançar no próximo desmonte. Registrar de novo a mesma data corrige o valor (fica na auditoria como `SICOEX_CORRIGIDO`).
13. **Auditoria** em todas as ações.

### Permissões (`src/server/permissoes.ts`)

| Perfil | Pode |
|---|---|
| **ADMIN** | Tudo, em todas as unidades, incluindo cadastros |
| **GESTOR** | Lançar, validar, criar/enviar/receber transferências e analisar divergências **nas suas unidades** |
| **OPERADOR** | Lançar (fica pendente), criar transferência e conferir recebimento **nas suas unidades** |
| **CONSULTA** | Somente leitura |

## 7. Telas

**Prontas para uso:**

- **Login** e **Painel** (indicadores + filtros por período, CNPJ, unidade, categoria, produto).
- **Estoque por unidade** e **Estoque consolidado**.
- **Entradas** (PR 7): lista + botão **Nova entrada** (paiol e produto, quantidade em formato brasileiro como `1.250,5`, data, nota fiscal, fornecedor, lote, observações). A entrada fica **pendente** e só soma no estoque depois que alguém clica em **Validar** na lista (quem lançou não valida, exceto o Admin). Também lista as **entradas por transferência** no paiol de destino (PR 9).
- **Transferências** (PR 8): lista + botão **Nova transferência** (paiol de origem e de destino, data, nota fiscal, um ou mais materiais com o saldo visível). Ao clicar em **Transferir**, sai da origem e entra no destino na hora.
- **Consumo** (PR 11): lista + botão **Novo consumo** (mesmo formulário da entrada, tipo consumo). Fica pendente até a validação; a baixa é bloqueada se não houver saldo.
- **Notas fiscais** (PR 10): linha do tempo de cada nota fiscal (entradas, validações, transferências e consumos ligados ao mesmo número de documento), com data, hora e responsável. Pesquisa por número da nota, produto, código, lote ou fornecedor, com filtro por paiol e por período.
- **Sicoex** (PR 11): registro do saldo do Sicoex por paiol, produto e data, e quadro de confronto com o saldo diário (ver regra 12).
- **Produtos e materiais** (matriz Peneirinha × Pico, só consulta) e **Empresas e unidades** (só consulta).

Menu lateral no computador, menu deslizante no celular; cabeçalho com usuário, seletor de unidade, pesquisa rápida e sino de pendências.

**Placeholders ("em breve"):** Produção, Inventário, Fechamento semanal, Relatórios.

**Ainda não existem:** telas de **cadastro** (empresas, unidades, produtos, vínculos, usuários e senhas), **anexo** do documento na entrada, importação de Excel e importação de arquivo do Sicoex. Por isso os produtos e as empresas continuam com os **nomes de demonstração** até alguém ajustar pelo banco ou até a tela de cadastro existir.

Capturas de tela da Etapa 1 estão na pasta `etapa1-telas/` (login, painel, consolidado, produtos, transferências, celular).

## 8. Testes

`npm test` roda **20 testes** (Vitest). Usam um banco separado (`TEST_DATABASE_URL`, padrão `postgresql://…@localhost:5432/explo_control_test`); o setup aplica as migrações e limpa as tabelas.

Cobrem: entrada pendente não altera saldo; segregação na validação; consumo acima do saldo; duas baixas simultâneas; produto não vinculado; produto inativo numa unidade; controle por lote; entrada duplicada; permissões por perfil e unidade; fluxo com trânsito (envio → trânsito → recebimento sem mudar o total; sem vínculo no destino; acima do saldo; envio duplo; falta com ajuste aprovado; falta com retorno à origem; sobra só após aprovação; sentido inverso); **transferência direta** (debita e credita na hora, com rastreio; bloqueia saldo insuficiente, produto sem vínculo no destino e operador sem permissão); **Sicoex** (compara com o saldo diário na mesma data e mostra o consumo a lançar).

Observação: o Prisma bloqueia `migrate reset` quando executado por agentes de IA; por isso os testes usam `migrate deploy` + `TRUNCATE`.

## 9. Pontos de regra pendentes de validação pelo Rodrigo

Perguntas da Etapa 1, ainda **sem resposta formal**:

1. **Validação por outra pessoa:** quem lança uma entrada ou consumo não pode validá-lo (o administrador pode). Isso atende a rotina dos paióis?
2. **Quem confere o recebimento:** *em parte superada.* Com a transferência direta (PR 8) não há conferência no destino. Falta confirmar se a conferência deve voltar como opção.
3. **Sobra no recebimento:** *superada enquanto a transferência for direta* (não há quantidade recebida diferente da enviada).
4. **Cancelamento:** só antes do envio. Com a transferência direta, desfazer exige uma transferência inversa. Está de acordo?

Novas perguntas abertas:

5. **Sicoex:** o Sicoex permite exportar um arquivo (planilha ou PDF)? Se sim, enviar um exemplo para fazer a importação automática em vez de digitar saldo por saldo.
6. **Dados reais:** lista real de materiais (códigos, descrições, unidade de medida, controle de lote) e dados reais das duas empresas (razão social, CNPJ) para substituir os nomes de demonstração.

## 10. Infraestrutura e publicação

### Repositório
- GitHub: **`medicaoenaex/explo-control`** (privado), branch `main`.

### Banco de dados (Supabase, plano gratuito)
- O Supabase do Rodrigo já estava no limite de 2 projetos gratuitos. Por escolha dele, o banco do EXPLO CONTROL fica **dentro do projeto Supabase `paiol-desmonte`**, num **schema separado chamado `explo`**, com uma **role própria `explo_app`** (dona do schema). As tabelas que já existiam nesse projeto **não foram tocadas**.
- A senha do `explo_app` **não está neste documento**. Para obtê-la ou trocá-la: painel do Supabase → projeto `paiol-desmonte` → SQL Editor (`ALTER ROLE explo_app WITH PASSWORD '…'`), ou peça ao Rodrigo. O host do pooler aparece em **Connect** no topo do projeto (o que funciona é **`aws-0-sa-east-1.pooler.supabase.com`**; `aws-1` dá "tenant not found").
- ⚠️ **Recomendação:** a senha atual do `explo_app` chegou a ser enviada em texto numa conversa. **Troque-a** (e atualize as variáveis na Vercel) agora que há dados reais.

### Hospedagem (Vercel, plano Hobby gratuito)
- Projeto Vercel `explo-control` na conta `rodrigo-050b`, importado do GitHub.
- **Endereço de produção correto: https://explo-control.vercel.app** (o endereço `explo-control-rodrigo-050b.vercel.app`, usado antes, foi um palpite errado e mostrava uma versão antiga).
- Página de deploys: https://vercel.com/rodrigo-050b/explo-control/deployments
- O script `vercel-build` roda: `prisma migrate deploy` → seed de demonstração **se `SEED_DEMO=1`** → `next build`. Desde o PR 7 o seed **só popula um banco totalmente vazio** (sem nenhuma empresa); nunca apaga nem recria nada.
- ⚠️ **Toda versão de teste (Preview) de um pedido de alteração usa o MESMO banco da produção** e roda `prisma migrate deploy` nele. Foi assim que o "zerar" do PR 7 aconteceu antes do merge. Qualquer migração nova num PR vale para o banco real assim que a prévia for publicada. Para evitar isso, configure variáveis diferentes para o ambiente Preview (outro banco) na Vercel.
- `vercel.json` define a região das funções como `gru1` (São Paulo), perto do banco. O **build** roda em `iad1` (EUA), o que é normal.

### Variáveis de ambiente (somente os nomes)

| Nome | O que é | Onde obter |
|---|---|---|
| `DATABASE_URL` | Conexão com **pool** (porta 6543), com `?pgbouncer=true&connection_limit=1&schema=explo` | Supabase → Connect → Transaction pooler (usuário `explo_app.<ref do projeto>`), senha do `explo_app` |
| `DIRECT_URL` | Conexão **direta/sessão** (porta 5432), com `?schema=explo`; usada pelas migrações | Supabase → Connect → Session pooler, mesmo usuário e senha |
| `SEED_DEMO` | `1` popula a demonstração no build **só se o banco estiver vazio**; `0` desliga | Vercel → Settings → Environment Variables |
| `TEST_DATABASE_URL` | (opcional, só local) banco de testes | Postgres local |

Não há outras variáveis secretas (o login não usa `AUTH_SECRET`; é sessão própria no banco). A página `/diagnostico` só funciona enquanto `SEED_DEMO=1`.

### Usuários
Os usuários continuam sendo os da demonstração, com a senha fictícia `Demo@2026` (pública no código do seed): `admin@demo.explo`, `gestor.peneirinha@demo.explo`, `gestor.pico@demo.explo`, `operador.peneirinha@demo.explo`, `operador.pico@demo.explo`, `consulta@demo.explo`. **Como já há lançamentos reais, essas senhas precisam ser trocadas** (ainda não há tela para isso; pode ser feito gerando um hash bcrypt e atualizando `Usuario.senhaHash`, ou criando a tela de usuários).

## 11. Histórico de PRs

| # | Branch | O que fez |
|---|---|---|
| — | `main` (commit inicial) | **Etapa 1**: arquitetura, modelo de dados, regras de estoque com 17 testes, login, layout responsivo, painel e telas de consulta, seed de demonstração |
| 1 | `preparar-publicacao` | `DIRECT_URL` para bancos com pool; `prisma generate` no install; script `vercel-build` que aplica migrações e roda o seed opcionalmente |
| 2 | `seed-falha-visivel` | Build falha se o seed falhar (antes o erro era engolido); região `gru1`; pool com folga (mín. 5 conexões, 20 s de espera) |
| 3 | `seed-lento` | Seed resiste à latência do banco remoto e recria a demonstração se estiver incompleta |
| 4 | `painel-diagnostico` | Painel faz as consultas em sequência e mostra o erro técnico na tela |
| 5 | `autodiagnostico` | Página **`/diagnostico`** (testa o banco item a item, sem login) e registro de erros de servidor na Auditoria |
| 6 | `claude/project-thread-rbmw3e` | Este documento de passagem (`HANDOFF.md`) e o prompt de continuação (`PROMPT-CONTINUACAO.md`); só documentação |
| 7 | `entradas-lancamento` | Tela **Nova entrada** e botão **Validar**; migração `20261113170000_zerar_demonstracao` que **zera** movimentos, transferências, lotes, fechamentos, auditoria e sessões (mantém usuários, empresas, unidades e catálogo); seed passa a rodar só em banco vazio |
| 8 | `transferencia-direta` | **Mudança de regra pedida pelo Rodrigo:** tela **Nova transferência** que debita a origem e credita o destino na hora (sem trânsito nem conferência), mantendo código, nota fiscal, CNPJs e auditoria |
| 9 | `entrada-por-transferencia` | Transferências aparecem também na tela **Entradas** do paiol de destino, como "Transferência de <origem>", sem duplicar saldo |
| 10 | `linha-do-tempo-nf` | Tela **Notas fiscais**: linha do tempo de cada nota com pesquisa por nota, produto, lote, fornecedor, paiol e período |
| 11 | `sicoex` | Tela **Novo consumo** e aba **Sicoex** (tabela `SaldoSicoex`, migração `20261113180000_saldo_sicoex`) para confrontar o saldo do Sicoex com o saldo diário |

Os PRs 1 a 5 e 7 a 11 foram mesclados na `main` em 13/11/2026. O PR 6 (este documento) fica aberto até o Rodrigo aprovar.

## 12. Problema em aberto: produção da Vercel travada numa versão antiga

**Sintoma:** o código novo (PRs 7 a 11) está na `main` e as versões de teste funcionam, mas **https://explo-control.vercel.app** continuava servindo uma versão antiga: a tela Entradas sem o botão **Nova entrada**, `/diagnostico` com 404 (ou seja, anterior ao PR 5) e, às 14:40 (horário de Brasília), "Application error" (digest 752969169).

**Causa provável:** em algum momento um deploy antigo foi **promovido** ou houve um **rollback** manual na Vercel. Depois disso, a Vercel **para de atualizar a produção sozinha** a cada merge, até alguém promover de novo.

**Como resolver (um clique na Vercel):**
1. Abrir https://vercel.com/rodrigo-050b/explo-control/deployments
2. Se aparecer um aviso no topo com **Undo Rollback**, clicar nele. Senão, na **primeira** linha da lista (a mais recente, do commit `4712daa`, "Merge pull request #11"), clicar nos **três pontinhos (…)** → **Promote** (ou **Promote to Production**) e confirmar.
3. Abrir https://explo-control.vercel.app/entradas e conferir o botão **Nova entrada**; abrir `/diagnostico` para ver se o banco responde.

Até isso ser feito, o Rodrigo pode usar a **versão de teste** do último PR (o link "Preview" que a Vercel publica no pedido de alteração), que usa o mesmo banco. Não foi confirmado, até a escrita deste documento, se o Promote já foi feito.

**Histórico do erro anterior ("Application error" no começo do dia):** o primeiro seed estourou o tempo (`P2028`) e deixou a demonstração pela metade; o pool tinha 1 conexão e o painel fazia 13 consultas em paralelo. Os PRs 2 a 4 corrigiram isso. A maior parte do "vai e volta" seguinte foi causada por endereços errados (`…-4mtjg6qzy-rodrigo-050b.vercel.app` e `explo-control-rodrigo-050b.vercel.app`) que apontavam para deploys antigos.

## 13. Estado dos dados

- **Zerado em 13/11/2026 (~16:52 UTC)** pela migração do PR 7: 0 movimentações e 0 transferências naquele momento; auditoria e sessões também foram limpas.
- **Mantidos:** usuários de demonstração, as duas empresas e unidades (com nomes "DEMO …" e CNPJs fictícios) e o catálogo de produtos de demonstração (descrições terminando em "(demo)").
- **Primeiro lançamento real:** uma entrada **validada de 500 kg no Paiol Pico** (feita pela versão de teste).
- Desde então o Rodrigo pode ter lançado mais entradas, transferências, consumos e saldos Sicoex. Para ver o estado atual: tela Painel/Estoque, `/diagnostico`, ou o SQL Editor do Supabase no schema `explo`.
- A tabela `Auditoria` não aceita UPDATE/DELETE (trigger); só `TRUNCATE` a limpa.

## 14. Próximos passos sugeridos

1. **Destravar a produção na Vercel** (Promote/Undo Rollback, seção 12) e confirmar que https://explo-control.vercel.app mostra as telas novas.
2. **Segurança antes de seguir com dados reais:** trocar a senha do `explo_app` (e atualizar `DATABASE_URL`/`DIRECT_URL` na Vercel), trocar as senhas dos usuários `@demo.explo` ou criar usuários reais, e separar o banco das versões de teste (Preview).
3. **Substituir os dados de demonstração** por empresas, CNPJs e materiais reais (pedir a lista ao Rodrigo) — idealmente já com as **telas de cadastro** (empresas, unidades, produtos, vínculos, usuários).
4. **Obter do Rodrigo:** o restante do prompt mestre (item 12 em diante) e as respostas da seção 9.
5. **Anexo** do documento na entrada (pedido no item 9 da especificação).
6. Importação do arquivo do Sicoex, se ele exportar.
7. Etapas seguintes: produção de emulsão (movimentos `PRODUCAO_ENTRADA`/`PRODUCAO_CONSUMO` já previstos), inventário (`AJUSTE_INVENTARIO`), fechamento semanal, relatórios, importação de Excel.
8. Para uso real na empresa: hospedagem aprovada pela TI (o plano Hobby da Vercel é para uso não comercial) e proteção contra força bruta persistente (hoje é em memória, por processo).

## 15. Como rodar localmente

```bash
cp .env.example .env            # preencha DATABASE_URL e DIRECT_URL (Postgres local: as duas iguais)
npm install                      # também roda prisma generate
npx prisma migrate deploy        # cria as tabelas
npm run db:seed                  # dados FICTÍCIOS de demonstração (opcional)
npm run dev                      # http://localhost:3000
npm test                         # 20 testes (precisa de um Postgres para testes)
```

## 16. Forma de trabalhar com o Rodrigo

- Fala **português** e **não é técnico**: explicar com passos curtos, dizendo exatamente onde clicar.
- Prefere que o assistente **resolva com o mínimo de idas e vindas**; pedir logs repetidas vezes o cansou.
- Valida cada etapa antes de avançar; **pedir aprovação antes de qualquer custo** ou serviço novo.
- Durante o desenvolvimento, usar apenas dados fictícios marcados como demonstração (até ele decidir começar com dados reais).
- **Nunca** colar senhas ou endereços de conexão em arquivos do repositório.
