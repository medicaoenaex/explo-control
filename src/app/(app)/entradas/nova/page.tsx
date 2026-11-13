import { prisma } from "@/lib/db";
import { contexto } from "@/server/contexto";
import { pode } from "@/server/permissoes";
import { Botao, Cabecalho } from "@/components/ui";
import { FormEntrada } from "./FormEntrada";

export const metadata = { title: "Nova entrada" };

export default async function NovaEntrada() {
  const ctx = await contexto();
  const unidadeIds = ctx.unidadeIds.filter((id) => pode(ctx.usuario.ator, "lancamento.registrar", id));
  const vinculos = await prisma.produtoUnidade.findMany({
    where: { unidadeId: { in: unidadeIds }, situacao: "ATIVO", produto: { situacao: "ATIVO" } },
    include: { produto: { include: { unidadeMedida: true } }, unidade: true },
    orderBy: [{ unidade: { nome: "asc" } }, { produto: { descricao: "asc" } }],
  });
  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
  return (
    <>
      <Cabecalho titulo="Nova entrada" descricao="Registre o recebimento de material no paiol." acoes={<Botao href="/entradas" variante="secundario">Voltar</Botao>} />
      {vinculos.length === 0 ? (
        <p className="texto-suave text-sm">Você não tem permissão para registrar entradas, ou não há produtos cadastrados nas suas unidades.</p>
      ) : (
        <FormEntrada
          hoje={hoje}
          opcoes={vinculos.map((v) => ({
            valor: `${v.unidadeId}|${v.produtoId}`,
            unidade: v.unidade.nome,
            rotulo: `${v.produto.codigo} · ${v.produto.descricao} (${v.produto.unidadeMedida.sigla})`,
            lote: v.produto.controlaLote,
          }))}
        />
      )}
    </>
  );
}
