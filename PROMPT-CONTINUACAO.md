# Prompt de continuação — EXPLO CONTROL

Copie todo o texto abaixo da linha e cole no Claude, junto com o arquivo `explo-control-codigo.zip` (que já contém o `HANDOFF.md`).

---

Você vai **continuar** o desenvolvimento de um sistema chamado **EXPLO CONTROL**, que já tem uma primeira etapa pronta. Atue como arquiteto de software sênior e desenvolvedor full stack.

**Antes de qualquer coisa, leia o arquivo `HANDOFF.md` na raiz do código anexado.** Ele traz o objetivo, o contexto operacional, a especificação recebida até agora, a arquitetura, o modelo de dados, as regras já implementadas, os testes, a infraestrutura, o histórico de mudanças, o problema em aberto e os próximos passos. Depois leia `prisma/schema.prisma`, `src/server/estoque.ts`, `src/server/permissoes.ts` e `tests/estoque.test.ts`.

**Resumo em uma linha:** sistema web (Next.js 15 + TypeScript + PostgreSQL + Prisma + Tailwind + Zod, login próprio com sessão no banco) para controlar estoque, entradas, transferências e consumo de materiais controlados de mineração em duas unidades com CNPJs diferentes (Paiol Peneirinha, que produz emulsão, e Paiol Pico, que consome na Mina Pico), com estoque por unidade e consolidado **sem duplicar transferências** (consolidado = disponível + em trânsito).

**Onde paramos:**
- Etapa 1 pronta (modelo de dados, regras de estoque com testes, login com 4 perfis, painel e consultas). Depois vieram as telas de **Nova entrada** (com validação por outra pessoa), **Nova transferência** (direta: sai da origem e entra no destino na hora, regra mudada a meu pedido), **Novo consumo**, **Notas fiscais** (linha do tempo com pesquisa) e **Sicoex** (confronto do saldo do Sicoex com o saldo diário). São 20 testes.
- Os dados de demonstração foram zerados; já há lançamentos reais (a primeira entrada foi de 500 kg no Paiol Pico). Usuários, empresas e produtos ainda têm nomes e senhas de demonstração.
- Site: **https://explo-control.vercel.app** (Vercel grátis) com banco no Supabase grátis (schema `explo` dentro do projeto `paiol-desmonte`). A produção da Vercel estava **travada numa versão antiga** (precisa de Promote / Undo Rollback; seção 12 do HANDOFF). As versões de teste dos pedidos de alteração usam o mesmo banco real.
- A especificação original foi recebida **só até o item 12 (Produção), cortada**. Peça o restante ao dono.
- Há **perguntas de regra** esperando a resposta do dono (seção 9 do HANDOFF).

**Como trabalhar comigo (o dono do projeto):**
- Fale em **português** e de forma simples: **não sou técnico**. Quando eu precisar fazer algo, diga exatamente onde clicar, um passo de cada vez.
- Resolva com o **mínimo de idas e vindas**. Se puder diagnosticar sozinho, diagnostique antes de me pedir logs.
- Trabalhe **por etapas** e me mostre cada uma para eu validar antes de avançar.
- **Não contrate nem ative nada pago** sem me explicar e pedir aprovação.
- **Nunca** coloque senhas ou endereços de conexão em arquivos do código ou do repositório. As variáveis necessárias são `DATABASE_URL`, `DIRECT_URL` e `SEED_DEMO` (o HANDOFF explica onde obter cada uma). Eu passo os valores quando for preciso.
- Não apague dados do banco nem publique nada sem me avisar antes o que vai acontecer.

**Acessos:** o código está no GitHub em `medicaoenaex/explo-control` (privado); se você não tiver acesso, trabalhe a partir do zip anexado e me diga o que precisa. O banco (Supabase) e a hospedagem (Vercel) estão na conta do dono original; se você não tiver acesso a eles, me diga e eu decido se compartilho o acesso ou se criamos um ambiente novo.

**Primeira tarefa:** depois de ler o HANDOFF e o código, me responda com:
1. um resumo curto, em linguagem simples, do que o sistema já faz e do que falta;
2. o que você precisa de mim para (a) garantir que o site principal mostra a versão mais nova e (b) trocar as senhas e cadastrar os dados reais (telas de cadastro de produtos, empresas e usuários);
3. as perguntas de regra pendentes, para eu responder.
