import type { StatusTransferencia, TipoMovimento, StatusMovimento, Perfil } from "@prisma/client";
import type { Tom } from "@/components/ui";

export const STATUS_TRF: Record<StatusTransferencia, { rotulo: string; tom: Tom }> = {
  RASCUNHO: { rotulo: "Rascunho", tom: "neutro" },
  PENDENTE_ENVIO: { rotulo: "Pendente de envio", tom: "alerta" },
  EM_TRANSITO: { rotulo: "Em trânsito", tom: "info" },
  AGUARDANDO_CONFERENCIA: { rotulo: "Aguardando conferência", tom: "alerta" },
  RECEBIDA: { rotulo: "Recebida", tom: "sucesso" },
  DIVERGENTE: { rotulo: "Divergente", tom: "perigo" },
  CANCELADA: { rotulo: "Cancelada", tom: "neutro" },
};

export const TIPO_MOV: Record<TipoMovimento, string> = {
  ENTRADA: "Entrada",
  CONSUMO: "Consumo",
  TRANSFERENCIA_SAIDA: "Transferência (saída)",
  TRANSFERENCIA_ENTRADA: "Transferência (entrada)",
  TRANSFERENCIA_RETORNO: "Retorno de transferência",
  TRANSFERENCIA_SOBRA: "Sobra de transferência",
  PRODUCAO_ENTRADA: "Produção (entrada)",
  PRODUCAO_CONSUMO: "Produção (insumo)",
  AJUSTE_INVENTARIO: "Ajuste de inventário",
};

export const STATUS_MOV: Record<StatusMovimento, { rotulo: string; tom: Tom }> = {
  PENDENTE: { rotulo: "Pendente", tom: "alerta" },
  VALIDADO: { rotulo: "Validado", tom: "sucesso" },
  REJEITADO: { rotulo: "Rejeitado", tom: "perigo" },
  ESTORNADO: { rotulo: "Estornado", tom: "neutro" },
};

export const PERFIL: Record<Perfil, string> = { ADMIN: "Administrador", GESTOR: "Gestor", OPERADOR: "Operador", CONSULTA: "Consulta" };
