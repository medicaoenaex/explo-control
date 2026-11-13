import { Plus } from "lucide-react";
import { contexto } from "@/server/contexto";
import { pode } from "@/server/permissoes";
import { Botao, Cabecalho } from "@/components/ui";
import { ListaMovimentos } from "@/components/ListaMovimentos";
import { validarAction } from "./acoes";

export const metadata = { title: "Entradas" };

export default async function PaginaEntradas({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await contexto();
  const f = await searchParams;
  const ator = ctx.usuario.ator;
  const podeRegistrar = ctx.unidadeIds.some((id) => pode(ator, "lancamento.registrar", id));
  const aviso = f.registrada ? "Entrada registrada. Ela soma no estoque depois de validada." : f.validada ? "Entrada validada e somada ao estoque." : undefined;
  return (
    <>
      <Cabecalho
        titulo="Entradas"
        descricao="Recebimentos de material. Cada entrada fica pendente até ser validada."
        acoes={podeRegistrar ? <Botao href="/entradas/nova"><Plus size={16} /> Nova entrada</Botao> : undefined}
      />
      {aviso && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{aviso}</p>}
      {f.erro && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{f.erro}</p>}
      <ListaMovimentos
        tipos={["ENTRADA"]}
        unidadeIds={ctx.unidadeIds}
        f={f}
        validar={{
          action: validarAction,
          pode: (unidadeId, criadoPorId) =>
            pode(ator, "lancamento.validar", unidadeId) && (criadoPorId !== ator.id || ator.perfil === "ADMIN"),
        }}
      />
    </>
  );
}
