import type { Perfil } from "@prisma/client";
import { RegraNegocioError } from "@/lib/erros";

/** Quem está executando a ação. unidadeIds = unidades que o usuário pode operar. */
export type Ator = { id: string; perfil: Perfil; unidadeIds: string[] };

export type Acao =
  | "cadastro.gerenciar" // empresas, unidades, catálogo, vínculos
  | "lancamento.registrar" // entradas e consumo (ficam pendentes)
  | "lancamento.validar" // valida e passa a compor o saldo
  | "transferencia.criar"
  | "transferencia.enviar"
  | "transferencia.receber"
  | "divergencia.resolver";

const MATRIZ: Record<Perfil, Acao[]> = {
  ADMIN: [
    "cadastro.gerenciar",
    "lancamento.registrar",
    "lancamento.validar",
    "transferencia.criar",
    "transferencia.enviar",
    "transferencia.receber",
    "divergencia.resolver",
  ],
  GESTOR: [
    "lancamento.registrar",
    "lancamento.validar",
    "transferencia.criar",
    "transferencia.enviar",
    "transferencia.receber",
    "divergencia.resolver",
  ],
  OPERADOR: ["lancamento.registrar", "transferencia.criar", "transferencia.receber"],
  CONSULTA: [],
};

export function pode(ator: Ator, acao: Acao, unidadeId?: string): boolean {
  if (!MATRIZ[ator.perfil].includes(acao)) return false;
  if (ator.perfil === "ADMIN" || !unidadeId) return true;
  return ator.unidadeIds.includes(unidadeId);
}

export function exigir(ator: Ator, acao: Acao, unidadeId?: string): void {
  if (!pode(ator, acao, unidadeId)) {
    throw new RegraNegocioError("Você não tem permissão para esta ação nesta unidade.", "SEM_PERMISSAO");
  }
}
