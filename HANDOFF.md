# EXPLO CONTROL — Documento de passagem do projeto

Situação em **13/11/2026**. Este documento reúne tudo o que foi feito até agora, para que outra pessoa (ou outro Claude) continue o trabalho sem precisar reconstruir o contexto.

> **Segurança:** este documento não contém senhas, endereços de conexão nem chaves. Onde um valor secreto é necessário, ele indica **o nome da variável e onde obtê-la**.

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
tests/estoque.test.ts         17 testes das regras
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
- Quase todas as tabelas têm `demonstracao: Boolean` para marcar dados fictícios.

Restrições no banco (migração inicial): origem ≠ destino; quantidade enviada > 0; recebida ≥ 0; movimento ≠ 0; **sinal do movimento coerente com o tipo**; trigger `auditoria_imutavel`.

## 6. Regras de negócio implementadas (em `src/server/estoque.ts`)

1. **Saldo nunca é digitado:** é a soma dos movimentos `VALIDADO` do vínculo (e do lote, quando há).
2. **Entradas e consumos** são registrados como `PENDENTE` e só contam no saldo após **validação por outra pessoa** (segregação de funções; o ADMIN pode validar o próprio).
3. **Não baixa mais que o saldo.** Toda baixa trava o vínculo com `SELECT … FOR UPDATE` antes de conferir; duas baixas simultâneas não deixam saldo negativo.
4. Bloqueia movimentação de **produto não vinculado**, **produto inativo** (no catálogo ou na unidade) e **unidade inativa**.
5. **Lote:** produto com controle de lote exige lote, e o saldo é conferido por lote; produto sem controle não aceita lote.
6. **Entrada duplicada** (mesmo documento + produto + unidade + lote) é bloqueada.
7. **Transferência:**
   - criar (Rascunho) → solicitar envio (Pendente de envio) → **enviar**: confere vínculo ativo **no destino** e saldo na origem (somando linhas repetidas do mesmo produto), **debita a origem** e o status vira **Em trânsito**;
   - destino registra chegada (Aguardando conferência) → **confirma recebimento** informando a quantidade conferida de **cada** item; **quem enviou não pode confirmar**;
   - o destino recebe crédito do recebido (limitado ao enviado).
8. **Consolidado = disponível nas unidades + em trânsito.** Transferência interna não altera o total do grupo.
9. **Divergências:** qualquer diferença deixa a transferência **Divergente**.
   - **Falta:** continua contada como em trânsito até análise; a análise escolhe **ajuste aprovado** (a perda sai do grupo) ou **retorno à origem** (volta ao saldo da origem).
   - **Sobra:** só entra no estoque do destino após aprovação; não pode ser "retorno à origem".
   - Justificativa obrigatória (mín. 10 caracteres). Quando todos os itens estão resolvidos, vira **Recebida**.
10. **Cancelamento** só antes do envio (Rascunho ou Pendente de envio). Depois de enviada, a correção é via divergência.
11. **Auditoria** em todas as ações.

### Permissões (`src/server/permissoes.ts`)

| Perfil | Pode |
|---|---|
| **ADMIN** | Tudo, em todas as unidades, incluindo cadastros |
| **GESTOR** | Lançar, validar, criar/enviar/receber transferências e analisar divergências **nas suas unidades** |
| **OPERADOR** | Lançar (fica pendente), criar transferência e conferir recebimento **nas suas unidades** |
| **CONSULTA** | Somente leitura |

## 7. Telas

**Prontas (consulta):** Login · Painel (indicadores + filtros por período, CNPJ, unidade, categoria, produto) · Estoque por unidade · Estoque consolidado · Produtos e materiais (matriz Peneirinha × Pico) · Empresas e unidades · Transferências · histórico de Entradas · histórico de Consumo. Menu lateral no computador, menu deslizante no celular; cabeçalho com usuário, seletor de unidade, pesquisa rápida e sino de pendências.

**Placeholders ("em breve"):** Produção, Inventário, Fechamento semanal, Relatórios.

**Ainda não existem:** formulários de **cadastro** (empresas, unidades, produtos, vínculos, usuários) e de **lançamento** (entrada, consumo, transferência, recebimento, análise de divergência), **anexos**, importação de Excel. As **regras** desses lançamentos já existem e estão testadas; falta a interface.

Capturas de tela da Etapa 1 estão na pasta `etapa1-telas/` (login, painel, consolidado, produtos, transferências, celular).

## 8. Testes

`npm test` roda **17 testes** (Vitest), todos passando na entrega da Etapa 1. Usam um banco separado (`TEST_DATABASE_URL`, padrão `postgresql://…@localhost:5432/explo_control_test`); o setup aplica as migrações e limpa as tabelas.

Cobrem: entrada pendente não altera saldo; segregação na validação; consumo acima do saldo; duas baixas simultâneas; produto não vinculado; produto inativo numa unidade; controle por lote; entrada duplicada; permissões por perfil e unidade; envio → trânsito → recebimento sem mudar o total; envio sem vínculo no destino; envio acima do saldo somando linhas; envio duplo e segregação no recebimento; falta com ajuste aprovado; falta com retorno à origem; sobra só após aprovação; transferência no sentido inverso.

Observação: o Prisma bloqueia `migrate reset` quando executado por agentes de IA; por isso os testes usam `migrate deploy` + `TRUNCATE`.

## 9. Pontos de regra pendentes de validação pelo Rodrigo

Ainda **sem resposta**:

1. **Validação por outra pessoa:** quem lança uma entrada ou consumo não pode validá-lo (o administrador pode). Isso atende a rotina dos paióis?
2. **Quem confere o recebimento:** hoje operador e gestor do destino podem conferir. Deve ficar só com o gestor?
3. **Sobra no recebimento:** pode acontecer na prática, ou deve ser bloqueada de vez?
4. **Cancelamento:** só antes do envio; depois, a correção é pela análise de divergência. Está de acordo?

## 10. Infraestrutura e publicação (demonstração)

### Repositório
- GitHub: **`medicaoenaex/explo-control`** (privado), branch `main`.

### Banco de dados (Supabase, plano gratuito)
- O Supabase do Rodrigo já estava no limite de 2 projetos gratuitos. Por escolha dele, o banco do EXPLO CONTROL fica **dentro do projeto Supabase `paiol-desmonte`**, num **schema separado chamado `explo`**, com uma **role própria `explo_app`** (dona do schema). As tabelas que já existiam nesse projeto **não foram tocadas**.
- A senha do `explo_app` **não está neste documento**. Para obtê-la ou trocá-la: painel do Supabase → projeto `paiol-desmonte` → SQL Editor (`ALTER ROLE explo_app WITH PASSWORD '…'`), ou peça ao Rodrigo. O host do pooler aparece em **Connect** no topo do projeto (o que funcionou foi **`aws-0-sa-east-1.pooler.supabase.com`**; `aws-1` deu "tenant not found").
- ⚠️ **Recomendação:** a senha atual do `explo_app` chegou a ser enviada em texto numa conversa. **Troque-a** (e atualize as variáveis na Vercel) antes de usar dados reais.

### Hospedagem (Vercel, plano Hobby gratuito)
- Projeto Vercel `explo-control`, conta pessoal do Rodrigo, importado do GitHub. Cada merge na `main` dispara um deploy.
- O script `vercel-build` roda: `prisma migrate deploy` → seed de demonstração **se `SEED_DEMO=1`** → `next build`.
- `vercel.json` define a região das funções como `gru1` (São Paulo), perto do banco. O **build** em si continua rodando em `iad1` (EUA), o que é normal.

### Variáveis de ambiente (somente os nomes)

| Nome | O que é | Onde obter |
|---|---|---|
| `DATABASE_URL` | Conexão com **pool** (porta 6543), com `?pgbouncer=true&connection_limit=1&schema=explo` | Supabase → Connect → Transaction pooler (usuário `explo_app.<ref do projeto>`), senha do `explo_app` |
| `DIRECT_URL` | Conexão **direta/sessão** (porta 5432), com `?schema=explo`; usada pelas migrações | Supabase → Connect → Session pooler, mesmo usuário e senha |
| `SEED_DEMO` | `1` cria os dados fictícios no build se o banco estiver vazio; `0` desliga | Definir na Vercel → Settings → Environment Variables |
| `TEST_DATABASE_URL` | (opcional, só local) banco de testes | Postgres local |

Não há outras variáveis secretas (o login não usa `AUTH_SECRET`; é sessão própria no banco).

### Usuários de demonstração (dados fictícios)
Senha de demonstração `Demo@2026` (é fictícia e pública no código do seed): `admin@demo.explo`, `gestor.peneirinha@demo.explo`, `gestor.pico@demo.explo`, `operador.peneirinha@demo.explo`, `operador.pico@demo.explo`, `consulta@demo.explo`. Empresas, CNPJs e produtos da demonstração são inventados e marcados com "(demo)".

## 11. Histórico de PRs

| # | Branch | O que fez |
|---|---|---|
| — | `main` (commit inicial) | **Etapa 1**: arquitetura, modelo de dados, regras de estoque com 17 testes, login, layout responsivo, painel e telas de consulta, seed de demonstração |
| 1 | `preparar-publicacao` | `DIRECT_URL` para bancos com pool; `prisma generate` no install; script `vercel-build` que aplica migrações e roda o seed opcionalmente |
| 2 | `seed-falha-visivel` | Build falha se o seed falhar (antes o erro era engolido); região `gru1`; pool com folga (mín. 5 conexões, 20 s de espera) para o painel |
| 3 | `seed-lento` | Seed resiste à latência do banco remoto (transações com timeout maior) e **recria a demonstração se estiver incompleta** (só apaga se tudo no banco for de demonstração) |
| 4 | `painel-diagnostico` | Painel faz as consultas **em sequência** (antes 13 em paralelo) e mostra o erro técnico na tela em vez do erro genérico |
| 5 | `autodiagnostico` | Página **`/diagnostico`** (testa o banco item a item, sem login) e registro de erros de servidor na Auditoria (`instrumentation.ts`) |

Todos os 5 foram mesclados na `main` em 13/11/2026.

## 12. Problema em aberto: site em produção com "Application error"

**Sintoma:** ao abrir o site publicado, aparece "Application error: a server-side exception has occurred" (vários digests diferentes ao longo do dia: 3241491760, 2829780947, 1979312599).

**O que já se sabe:**
- O build passa: as migrações são aplicadas e o deploy conclui.
- Logs iniciais mostraram erros `PrismaClientKnownRequestError` em várias consultas diferentes, compatíveis com **fila de conexões** (pool com 1 conexão) e com **dados de demonstração pela metade** (o primeiro seed estourou o tempo com `P2028 Transaction not found`). Os PRs 2 a 4 atacaram isso.
- Uma réplica do ambiente da Vercel montada pelo Claude (build + start contra um Postgres) **abriu todas as telas normalmente**.
- No build do PR 5 o seed disse **"O banco já possui dados. Nada a fazer."** Pela lógica do seed, isso significa que já existe um fechamento semanal (última etapa do seed), ou seja, uma execução anterior provavelmente completou a demonstração. Não foi confirmado olhando o banco.
- Depois do PR 5, **`/diagnostico` deu 404** no endereço testado, mesmo com o log do build mostrando que a rota existe. Como o middleware libera `/diagnostico`, um 404 indica que **aquele endereço não está servindo o deploy mais novo**.

**Suspeita principal:** o endereço **`explo-control-rodrigo-050b.vercel.app` foi um palpite** do Claude, não o domínio de produção confirmado. O endereço `explo-control-4mtjg6qzy-rodrigo-050b.vercel.app` é a URL fixa de um deploy **antigo**. Isso explicaria os PRs 2 a 5 "sem efeito".

**Próximo passo para fechar o diagnóstico:**
1. Na Vercel, abrir o projeto `explo-control` → aba **Overview** → ver o domínio em **Domains** (ou clicar em **Visit**). Esse é o endereço real.
2. Abrir `<domínio real>/diagnostico` e ler a tabela. Atenção: a página só funciona enquanto `SEED_DEMO=1`; com `SEED_DEMO=0` em produção ela mostra apenas "Diagnóstico disponível apenas no ambiente de demonstração".
3. Se tudo estiver ✅ e o site abrir, o problema era o endereço. Se houver ❌, a mensagem diz o que corrigir.
4. Alternativa: Deployments → confirmar que o deploy mais recente (commit `cda045c`, "Merge pull request #5") está marcado como **Production** e **Ready**.

## 13. Trabalho que estava em andamento

Pouco antes desta passagem, o Rodrigo pediu para **zerar todas as informações de demonstração** para começar a **lançar entradas reais**. O plano registrado era:

1. Apagar movimentações, transferências, lotes e fechamentos de demonstração (mantendo um usuário admin para login e, se fizer sentido, empresas/unidades/catálogo como estrutura — **confirmar com o Rodrigo o que fica**).
2. Desligar `SEED_DEMO` (pôr `0` na Vercel) para a demonstração não ser recriada no próximo deploy.
3. Criar a **tela de lançamento e validação de entradas** (e de cadastro de produtos/vínculos, se necessário).
4. Testar e publicar.

**Estado:** o primeiro passo estava marcado como "em andamento" quando o trabalho parou. **Não há confirmação de que algum dado foi apagado**, e nenhum código dessa etapa foi enviado ao GitHub. Antes de qualquer coisa, verifique o estado do banco (via `/diagnostico` ou pelo SQL Editor do Supabase, no schema `explo`).

Cuidados para o "zerar":
- A tabela `Auditoria` **não aceita DELETE** (trigger). Para limpá-la seria preciso `TRUNCATE` (que não dispara o trigger de linha) ou desativar o trigger conscientemente; o mais seguro é **manter a auditoria**.
- Os dados reais precisarão de **empresas e CNPJs reais**, unidades reais e usuários reais com senhas próprias. Os usuários `@demo.explo` com a senha pública devem ser **removidos ou desativados** antes do uso real.
- O seed só roda se o banco estiver vazio ou com demonstração incompleta; com `SEED_DEMO=0` ele não roda.

## 14. Próximos passos sugeridos

1. **Resolver o acesso ao site** (seção 12): descobrir o domínio real e ler `/diagnostico`.
2. **Trocar a senha do `explo_app`** e atualizar as variáveis na Vercel.
3. **Obter do Rodrigo**: o restante do prompt mestre (item 12 em diante) e as respostas aos 4 pontos da seção 9.
4. **Etapa 2** (sugerida): telas de cadastro (empresas, unidades, produtos, vínculos, usuários) + **lançamento e validação de entradas com anexo** + consumo + criação/envio/recebimento de transferências e análise de divergências pela tela. As regras de servidor já existem; é ligar formulários (Server Actions) a `registrarLancamento`, `validarLancamento`, `criarTransferencia`, `enviarTransferencia`, `registrarChegada`, `confirmarRecebimento`, `resolverDivergencia`, `cancelarTransferencia`.
5. **Zerar a demonstração** de forma controlada e desligar `SEED_DEMO`.
6. Etapas seguintes: produção de emulsão (movimentos `PRODUCAO_ENTRADA`/`PRODUCAO_CONSUMO` já previstos), inventário (`AJUSTE_INVENTARIO`), fechamento semanal, relatórios, importação de Excel.
7. Para uso real na empresa: hospedagem aprovada pela TI (o plano Hobby da Vercel é para uso não comercial) e proteção contra força bruta persistente (hoje é por processo, em memória).

## 15. Como rodar localmente

```bash
cp .env.example .env            # preencha DATABASE_URL e DIRECT_URL (Postgres local: as duas iguais)
npm install                      # também roda prisma generate
npx prisma migrate deploy        # cria as tabelas
npm run db:seed                  # dados FICTÍCIOS de demonstração (opcional)
npm run dev                      # http://localhost:3000
npm test                         # 17 testes (precisa de um Postgres para testes)
```

## 16. Forma de trabalhar com o Rodrigo

- Fala **português** e **não é técnico**: explicar com passos curtos, dizendo exatamente onde clicar.
- Prefere que o assistente **resolva com o mínimo de idas e vindas**; pedir logs repetidas vezes o cansou.
- Valida cada etapa antes de avançar; **pedir aprovação antes de qualquer custo** ou serviço novo.
- Durante o desenvolvimento, usar apenas dados fictícios marcados como demonstração (até ele decidir começar com dados reais).
- **Nunca** colar senhas ou endereços de conexão em arquivos do repositório.
