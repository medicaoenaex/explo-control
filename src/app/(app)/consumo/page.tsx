import { Plus } from "lucide-react";
import { contexto } from "@/server/contexto";
import { pode } from "@/server/permissoes";
import { Botao, Cabecalho } from "@/components/ui";
import { ListaMovimentos } from "@/components/ListaMovimentos";
import { validarAction } from "../entradas/acoes";

export const metadata = { title: "Consumo" };

export default async function PaginaConsumo({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await contexto();
  const f = await searchParams;
  const ator = ctx.usuario.ator;
  const podeRegistrar = ctx.unidadeIds.some((id) => pode(ator, "lancamento.registrar", id));
  const aviso = f.registrada ? "Consumo registrado. Ele baixa do estoque depois de validado." : f.validada ? "Consumo validado e baixado do estoque." : undefined;
  return (
    <>
      <Cabecalho
        titulo="Consumo"
        descricao="Consumo diário de material. No Sicoex o lançamento é feito no dia do desmonte; veja o confronto na aba Sicoex."
        acoes={podeRegistrar ? <Botao href="/consumo/novo"><Plus size={16} /> Novo consumo</Botao> : undefined}
      />
      {aviso && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{aviso}</p>}
      {f.erro && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{f.erro}</p>}
      <ListaMovimentos
        tipos={["CONSUMO"]}
        unidadeIds={ctx.unidadeIds}
        f={f}
        validar={{
          action: validarAction,
          volta: "/consumo",
          pode: (unidadeId, criadoPorId) => pode(ator, "lancamento.validar", unidadeId) && (criadoPorId !== ator.id || ator.perfil === "ADMIN"),
        }}
      />
    </>
  );
}
