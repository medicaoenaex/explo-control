import { contexto } from "@/server/contexto";
import { Cabecalho } from "@/components/ui";
import { ListaMovimentos } from "@/components/ListaMovimentos";

export const metadata = { title: "Consumo" };

export default async function PaginaConsumo({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = await contexto();
  return (
    <>
      <Cabecalho titulo="Consumo" descricao="Baixas administrativas de consumo (ex.: Mina Pico). O lançamento pela tela chega na próxima etapa." />
      <ListaMovimentos tipos={["CONSUMO"]} unidadeIds={ctx.unidadeIds} f={await searchParams} />
    </>
  );
}
