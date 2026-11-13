import { Prisma } from "@prisma/client";

export function formatarCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "").padStart(14, "0");
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Validação de dígitos verificadores do CNPJ. */
export function cnpjValido(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (base: string, pesos: number[]) => {
    const soma = base.split("").reduce((s, n, i) => s + Number(n) * pesos[i], 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv1 = calc(d.slice(0, 12), p1);
  const dv2 = calc(d.slice(0, 12) + dv1, [6, ...p1]);
  return d.endsWith(`${dv1}${dv2}`);
}

export function formatarQtd(v: Prisma.Decimal | number | string, casas = 3): string {
  return Number(v.toString()).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  });
}

/** Para campos somente-data (@db.Date), gravados à meia-noite UTC. */
export function formatarDia(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
}

export function formatarData(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
}
