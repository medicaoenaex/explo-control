import { prisma } from "@/lib/db";
import { contexto } from "@/server/contexto";
import { pode } from "@/server/permissoes";
import { saldosPorUnidade } from "@/server/estoque";
import { formatarQtd } from "@/lib/formato";
import { Botao, Cabecalho } from "@/components/ui";
import { FormTransferencia } from "./FormTransferencia";

export const metadata = { title: "Nova transferência" };

export default async function NovaTransferencia() {
  const ctx = await contexto();
  const ator = ctx.usuario.ator;
  const origens = ctx.usuario.unidades.filter((u) => pode(ator, "transferencia.enviar", u.id));
  const destinos = await prisma.unidade.findMany({ where: { situacao: "ATIVO" }, orderBy: { nome: "asc" }, select: { id: true, nome: true } });
  const linhas = (await saldosPorUnidade({}, prisma)).filter((l) => origens.some((o) => o.id === l.unidadeId) && l.situacaoVinculo === "ATIVO");
  const comLote = new Set((await prisma.produto.findMany({ where: { controlaLote: true }, select: { id: true } })).map((p) => p.id));
  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
  return (
    <>
      <Cabecalho titulo="Nova transferência" descricao="Envie material de um paiol para o outro. O saldo entra no destino imediatamente." acoes={<Botao href="/transferencias" variante="secundario">Voltar</Botao>} />
      {origens.length === 0 ? (
        <p className="texto-suave text-sm">Você não tem permissão para transferir material.</p>
      ) : (
        <FormTransferencia
          hoje={hoje}
          origens={origens.map((u) => ({ id: u.id, nome: u.nome }))}
          destinos={destinos}
          produtos={linhas.map((l) => ({
            unidadeId: l.unidadeId,
            produtoId: l.produtoId,
            rotulo: `${l.codigo} · ${l.descricao}`,
            saldo: `${formatarQtd(l.disponivel)} ${l.unidadeMedida}`,
            lote: comLote.has(l.produtoId),
          }))}
        />
      )}
    </>
  );
}
