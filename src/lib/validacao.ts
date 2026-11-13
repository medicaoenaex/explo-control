import { z } from "zod";
import { cnpjValido } from "./formato";

const quantidade = z.coerce
  .number({ invalid_type_error: "Informe uma quantidade numérica" })
  .positive("A quantidade deve ser maior que zero")
  .max(1e12)
  .refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6, "Use no máximo 3 casas decimais");

export const empresaSchema = z.object({
  razaoSocial: z.string().trim().min(3),
  nomeFantasia: z.string().trim().min(2),
  cnpj: z.string().transform((v) => v.replace(/\D/g, "")).refine(cnpjValido, "CNPJ inválido"),
});

export const produtoSchema = z.object({
  codigo: z.string().trim().min(1).max(30).transform((v) => v.toUpperCase()),
  descricao: z.string().trim().min(3).max(200),
  categoriaId: z.string().min(1),
  unidadeMedidaId: z.string().min(1),
  classificacao: z.enum(["EXPLOSIVO", "ACESSORIO_EXPLOSIVO", "INSUMO_PRODUCAO", "MATERIAL_GERAL"]),
  controlaLote: z.boolean(),
});

export const vinculoSchema = z.object({
  produtoId: z.string().min(1),
  unidadeId: z.string().min(1),
  codigoLocal: z.string().trim().min(1).max(30),
});

export const lancamentoSchema = z.object({
  tipo: z.enum(["ENTRADA", "CONSUMO"]),
  unidadeId: z.string().min(1),
  produtoId: z.string().min(1),
  loteNumero: z.string().trim().max(40).optional(),
  quantidade,
  dataMovimento: z.coerce.date(),
  documento: z.string().trim().max(60).optional(),
  fornecedor: z.string().trim().max(120).optional(),
  observacoes: z.string().trim().max(1000).optional(),
});

export const transferenciaSchema = z
  .object({
    origemId: z.string().min(1),
    destinoId: z.string().min(1),
    dataTransferencia: z.coerce.date(),
    documento: z.string().trim().max(60).optional(),
    observacoes: z.string().trim().max(1000).optional(),
    itens: z
      .array(z.object({ produtoId: z.string().min(1), loteNumero: z.string().trim().optional(), quantidade }))
      .min(1, "Inclua ao menos um item"),
  })
  .refine((t) => t.origemId !== t.destinoId, { message: "Origem e destino devem ser diferentes", path: ["destinoId"] });

export const recebimentoSchema = z.object({
  transferenciaId: z.string().min(1),
  itens: z.array(z.object({ itemId: z.string().min(1), quantidadeRecebida: z.coerce.number().min(0) })).min(1),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
});
