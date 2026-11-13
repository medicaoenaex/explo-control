import { LogOut, Search, FlaskConical } from "lucide-react";
import { contexto, pendencias } from "@/server/contexto";
import { prisma } from "@/lib/db";
import { PERFIL } from "@/lib/rotulos";
import { Marca, Menu } from "@/components/shell/Menu";
import { MenuMovel } from "@/components/shell/MenuMovel";
import { Notificacoes } from "@/components/shell/Notificacoes";
import { SeletorUnidade } from "@/components/shell/SeletorUnidade";
import { sairAction, trocarUnidade } from "./acoes";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { usuario, unidade, unidadeIds } = await contexto();
  const [pend, demo] = await Promise.all([pendencias(unidadeIds), prisma.empresa.count({ where: { demonstracao: true } })]);

  return (
    <div className="lg:pl-64">
      <aside className="bg-marca-900 fixed inset-y-0 left-0 hidden w-64 overflow-y-auto lg:block">
        <div className="border-b border-white/10 px-5 py-5"><Marca /></div>
        <Menu />
      </aside>

      <header className="superficie sticky top-0 z-30 border-b">
        {demo > 0 && (
          <div className="bg-acento-400/20 text-acento-600 flex items-center justify-center gap-2 px-4 py-1 text-xs font-medium dark:text-acento-400">
            <FlaskConical className="size-3.5" /> Ambiente de demonstração — todos os dados exibidos são fictícios
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6">
          <MenuMovel />
          <form action="/produtos" className="relative hidden flex-1 sm:block sm:max-w-sm">
            <Search className="texto-suave pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <input name="q" placeholder="Pesquisar produto ou código…" className="superficie w-full rounded-lg border py-2 pr-3 pl-8 text-sm outline-none focus:ring-2 focus:ring-marca-500/40" />
          </form>
          <div className="flex-1" />
          <SeletorUnidade unidades={usuario.unidades.map((u) => ({ id: u.id, nome: u.nome }))} atual={unidade?.id ?? ""} acao={trocarUnidade} />
          <Notificacoes total={pend.total} itens={pend.itens} />
          <div className="hidden text-right leading-tight md:block">
            <p className="text-sm font-medium">{usuario.nome}</p>
            <p className="texto-suave text-xs">{PERFIL[usuario.perfil]}</p>
          </div>
          <form action={sairAction}>
            <button className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5" title="Sair" aria-label="Sair"><LogOut className="size-5" /></button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
