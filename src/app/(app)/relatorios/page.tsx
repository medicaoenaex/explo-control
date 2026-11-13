import { Construction } from "lucide-react";
import { contexto } from "@/server/contexto";
import { Cabecalho, Cartao } from "@/components/ui";

export const metadata = { title: "Relatórios" };

export default async function Pagina() {
  await contexto();
  return (
    <>
      <Cabecalho titulo="Relatórios" />
      <Cartao className="flex flex-col items-center gap-2 p-10 text-center">
        <Construction className="text-acento-500 size-8" />
        <p className="font-medium">Módulo previsto para uma próxima etapa</p>
        <p className="texto-suave max-w-md text-sm">O modelo de dados já reserva o espaço para este módulo. Ele será construído e validado com você antes de entrar em uso.</p>
      </Cartao>
    </>
  );
}
