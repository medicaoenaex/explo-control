import { contexto } from "@/server/contexto";
import { Cabecalho } from "@/components/ui";
import { ListaMovimentos } from "@/components/ListaMovimentos";

export const metadata = { title: "Entradas" };

export default async function PaginaEntradas({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await contexto();
  return (
    <>
      <Cabecalho titulo="Entradas" descricao="Histórico de entradas. O formulário de lançamento com anexo chega na próxima etapa." />
      <ListaMovimentos tipos={["ENTRADA"]} unidadeIds={ctx.unidadeIds} f={await searchParams} />
    </>
  );
}
