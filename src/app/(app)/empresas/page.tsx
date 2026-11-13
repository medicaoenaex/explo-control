import { Building2, MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { contexto } from "@/server/contexto";
import { formatarCnpj, formatarData } from "@/lib/formato";
import { Cabecalho, Cartao, Selo } from "@/components/ui";

export const metadata = { title: "Empresas e unidades" };

export default async function PaginaEmpresas() {
  await contexto();
  const empresas = await prisma.empresa.findMany({
    include: { unidades: { include: { responsavel: true, _count: { select: { produtos: true } } }, orderBy: { nome: "asc" } } },
    orderBy: { razaoSocial: "asc" },
  });
  return (
    <>
      <Cabecalho titulo="Empresas e unidades" descricao="Cada CNPJ é mantido separado jurídica e documentalmente. Novas unidades podem ser incluídas sem alterar o sistema." />
      <div className="grid gap-4 md:grid-cols-2">
        {empresas.map((e) => (
          <Cartao key={e.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <span className="bg-marca-100 text-marca-700 dark:bg-marca-800 dark:text-marca-100 grid size-10 shrink-0 place-items-center rounded-lg"><Building2 className="size-5" /></span>
                <div>
                  <p className="font-semibold">{e.razaoSocial}</p>
                  <p className="texto-suave text-sm">{e.nomeFantasia} · CNPJ {formatarCnpj(e.cnpj)}</p>
                </div>
              </div>
              <Selo tom={e.situacao === "ATIVO" ? "sucesso" : "neutro"}>{e.situacao === "ATIVO" ? "Ativa" : "Inativa"}</Selo>
            </div>
            <p className="texto-suave mt-2 text-xs">Cadastrada em {formatarData(e.criadoEm)}{e.demonstracao && " · dados de demonstração"}</p>
            <div className="mt-4 flex flex-col gap-2">
              {e.unidades.map((u) => (
                <div key={u.id} className="borda rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 font-medium"><MapPin className="text-acento-500 size-4" />{u.nome} <span className="texto-suave text-xs">({u.sigla})</span></p>
                    <Selo tom={u.situacao === "ATIVO" ? "sucesso" : "neutro"}>{u.situacao === "ATIVO" ? "Ativa" : "Inativa"}</Selo>
                  </div>
                  {u.descricao && <p className="texto-suave mt-1 text-sm">{u.descricao}</p>}
                  <p className="texto-suave mt-1 text-xs">
                    Responsável: {u.responsavel?.nome ?? "—"} · {u._count.produtos} produtos vinculados{u.realizaProducao && " · realiza produção"}
                  </p>
                </div>
              ))}
            </div>
          </Cartao>
        ))}
      </div>
    </>
  );
}
