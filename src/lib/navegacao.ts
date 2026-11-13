import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine, ArrowLeftRight, Building2, CalendarCheck, ClipboardList, Factory, FileBarChart,
  FileText, Flame, Layers, LayoutDashboard, Package, Warehouse,
} from "lucide-react";

export type ItemMenu = { href: string; rotulo: string; icone: LucideIcon; pronto: boolean };
export type GrupoMenu = { titulo: string; itens: ItemMenu[] };

export const MENU: GrupoMenu[] = [
  { titulo: "Visão geral", itens: [{ href: "/", rotulo: "Painel", icone: LayoutDashboard, pronto: true }] },
  {
    titulo: "Estoque",
    itens: [
      { href: "/estoque", rotulo: "Estoque por unidade", icone: Warehouse, pronto: true },
      { href: "/estoque/consolidado", rotulo: "Estoque consolidado", icone: Layers, pronto: true },
    ],
  },
  {
    titulo: "Movimentações",
    itens: [
      { href: "/entradas", rotulo: "Entradas", icone: ArrowDownToLine, pronto: true },
      { href: "/transferencias", rotulo: "Transferências", icone: ArrowLeftRight, pronto: true },
      { href: "/consumo", rotulo: "Consumo", icone: Flame, pronto: true },
      { href: "/notas", rotulo: "Notas fiscais", icone: FileText, pronto: true },
      { href: "/producao", rotulo: "Produção", icone: Factory, pronto: false },
    ],
  },
  {
    titulo: "Controle",
    itens: [
      { href: "/inventario", rotulo: "Inventário", icone: ClipboardList, pronto: false },
      { href: "/fechamento", rotulo: "Fechamento semanal", icone: CalendarCheck, pronto: false },
      { href: "/relatorios", rotulo: "Relatórios", icone: FileBarChart, pronto: false },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { href: "/produtos", rotulo: "Produtos e materiais", icone: Package, pronto: true },
      { href: "/empresas", rotulo: "Empresas e unidades", icone: Building2, pronto: true },
    ],
  },
];
