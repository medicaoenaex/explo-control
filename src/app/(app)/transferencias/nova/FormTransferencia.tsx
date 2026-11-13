"use client";
import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { transferirAction } from "../acoes";
import { estiloInput } from "@/components/ui";

type Unidade = { id: string; nome: string };
type Produto = { unidadeId: string; produtoId: string; rotulo: string; saldo: string; lote: boolean };
type Linha = { produtoId: string; loteNumero: string; quantidade: string };

const vazia = (): Linha => ({ produtoId: "", loteNumero: "", quantidade: "" });

export function FormTransferencia({ origens, destinos, produtos, hoje }: { origens: Unidade[]; destinos: Unidade[]; produtos: Produto[]; hoje: string }) {
  const [estado, acao, enviando] = useActionState(transferirAction, undefined);
  const [origemId, setOrigem] = useState(origens[0]?.id ?? "");
  const [destinoId, setDestino] = useState(destinos.find((d) => d.id !== origens[0]?.id)?.id ?? "");
  const [linhas, setLinhas] = useState<Linha[]>([vazia()]);
  const daOrigem = produtos.filter((p) => p.unidadeId === origemId);
  const rotulo = "flex flex-col gap-1.5 text-sm font-medium";
  const input = `${estiloInput} w-full`;
  const mudar = (i: number, campo: keyof Linha, v: string) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: v } : l)));

  return (
    <form action={acao} className="superficie grid gap-4 rounded-xl border p-4 sm:grid-cols-2 sm:p-6">
      <label className={rotulo}>Sai do paiol *
        <select name="origemId" value={origemId} onChange={(e) => { setOrigem(e.target.value); setLinhas([vazia()]); if (e.target.value === destinoId) setDestino(destinos.find((d) => d.id !== e.target.value)?.id ?? ""); }} className={input}>
          {origens.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
      </label>
      <label className={rotulo}>Entra no paiol *
        <select name="destinoId" value={destinoId} onChange={(e) => setDestino(e.target.value)} className={input}>
          {destinos.filter((d) => d.id !== origemId).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
      </label>
      <label className={rotulo}>Data *
        <input name="data" type="date" required defaultValue={hoje} max={hoje} className={input} />
      </label>
      <label className={rotulo}>Nota fiscal / documento
        <input name="documento" maxLength={60} className={input} />
      </label>

      <fieldset className="flex flex-col gap-3 sm:col-span-2">
        <legend className="mb-1 text-sm font-medium">Materiais *</legend>
        {linhas.map((l, i) => {
          const p = daOrigem.find((x) => x.produtoId === l.produtoId);
          return (
            <div key={i} className="borda grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_9rem_9rem_auto] sm:items-end">
              <label className="flex flex-col gap-1 text-xs">Produto
                <select value={l.produtoId} onChange={(e) => mudar(i, "produtoId", e.target.value)} className={input} required>
                  <option value="" disabled>Escolha…</option>
                  {daOrigem.map((x) => <option key={x.produtoId} value={x.produtoId}>{x.rotulo} — saldo {x.saldo}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">Quantidade
                <input value={l.quantidade} onChange={(e) => mudar(i, "quantidade", e.target.value)} inputMode="decimal" required placeholder="Ex.: 500" className={input} />
              </label>
              <label className="flex flex-col gap-1 text-xs">Lote{p?.lote ? " *" : ""}
                <input value={l.loteNumero} onChange={(e) => mudar(i, "loteNumero", e.target.value)} disabled={p ? !p.lote : false} required={p?.lote} className={input} />
              </label>
              <button type="button" aria-label="Remover material" disabled={linhas.length === 1} onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}
                className="texto-suave rounded-lg p-2 hover:bg-black/5 disabled:opacity-30"><Trash2 size={18} /></button>
            </div>
          );
        })}
        <button type="button" onClick={() => setLinhas((ls) => [...ls, vazia()])} className="superficie inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-black/[0.03]">
          <Plus size={16} /> Adicionar material
        </button>
      </fieldset>

      <label className={`${rotulo} sm:col-span-2`}>Observações
        <textarea name="observacoes" rows={2} maxLength={1000} className={input} />
      </label>
      <input type="hidden" name="itens" value={JSON.stringify(linhas)} />
      {estado?.erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 dark:bg-red-950 dark:text-red-300">{estado.erro}</p>}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={enviando || !destinoId} className="bg-marca-700 hover:bg-marca-800 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {enviando ? "Transferindo…" : "Transferir"}
        </button>
        <p className="texto-suave text-xs">O material sai da origem e entra no destino na mesma hora.</p>
      </div>
    </form>
  );
}
