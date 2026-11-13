/**
 * Seed de DEMONSTRAÇÃO — todos os dados aqui são fictícios.
 * Empresas, CNPJs, pessoas, documentos e quantidades foram inventados para teste.
 * Os registros ficam marcados com demonstracao = true e a interface exibe um aviso.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  confirmarRecebimento,
  criarTransferencia,
  enviarTransferencia,
  registrarChegada,
  registrarLancamento,
  validarLancamento,
} from "../src/server/estoque";
import type { Ator } from "../src/server/permissoes";

const prisma = new PrismaClient();
const SENHA_DEMO = "Demo@2026";

async function main() {
  if ((await prisma.empresa.count()) > 0) {
    console.log("O banco já possui dados. Use `npm run db:reset` para recriar a demonstração.");
    return;
  }
  const senhaHash = await bcrypt.hash(SENHA_DEMO, 12);

  // ── Empresas e unidades (fictícias; CNPJs com dígitos válidos, inexistentes) ──
  const empPen = await prisma.empresa.create({
    data: { razaoSocial: "DEMO Mineração Peneirinha Ltda", nomeFantasia: "DEMO Peneirinha", cnpj: "90000001000129", demonstracao: true },
  });
  const empPic = await prisma.empresa.create({
    data: { razaoSocial: "DEMO Mineração Pico Ltda", nomeFantasia: "DEMO Pico", cnpj: "90000002000173", demonstracao: true },
  });

  const mkUser = (nome: string, email: string, perfil: "ADMIN" | "GESTOR" | "OPERADOR" | "CONSULTA") =>
    prisma.usuario.create({ data: { nome, email, perfil, senhaHash } });
  const admin = await mkUser("Administrador Demo", "admin@demo.explo", "ADMIN");
  const gPen = await mkUser("Gestora Peneirinha (demo)", "gestor.peneirinha@demo.explo", "GESTOR");
  const gPic = await mkUser("Gestor Pico (demo)", "gestor.pico@demo.explo", "GESTOR");
  const oPen = await mkUser("Operador Peneirinha (demo)", "operador.peneirinha@demo.explo", "OPERADOR");
  const oPic = await mkUser("Operador Pico (demo)", "operador.pico@demo.explo", "OPERADOR");
  const cons = await mkUser("Consulta Diretoria (demo)", "consulta@demo.explo", "CONSULTA");

  const pen = await prisma.unidade.create({
    data: {
      nome: "Paiol Peneirinha",
      sigla: "PEN",
      descricao: "Produz emulsão, controla acessórios e transfere materiais ao Paiol Pico.",
      realizaProducao: true,
      empresaId: empPen.id,
      responsavelId: gPen.id,
      demonstracao: true,
    },
  });
  const pic = await prisma.unidade.create({
    data: {
      nome: "Paiol Pico",
      sigla: "PIC",
      descricao: "Recebe materiais da Peneirinha e registra o consumo na Mina Pico.",
      empresaId: empPic.id,
      responsavelId: gPic.id,
      demonstracao: true,
    },
  });
  await prisma.acessoUnidade.createMany({
    data: [
      { usuarioId: gPen.id, unidadeId: pen.id },
      { usuarioId: oPen.id, unidadeId: pen.id },
      { usuarioId: gPic.id, unidadeId: pic.id },
      { usuarioId: oPic.id, unidadeId: pic.id },
      { usuarioId: cons.id, unidadeId: pen.id },
      { usuarioId: cons.id, unidadeId: pic.id },
    ],
  });

  // ── Catálogo central ──
  const cat = Object.fromEntries(
    await Promise.all(
      ["Explosivos", "Acessórios explosivos", "Insumos de produção", "Materiais gerais"].map(async (nome) => [
        nome,
        (await prisma.categoria.create({ data: { nome } })).id,
      ]),
    ),
  ) as Record<string, string>;
  const um = Object.fromEntries(
    await Promise.all(
      [
        ["kg", "Quilograma", 3],
        ["un", "Unidade", 0],
        ["m", "Metro", 2],
        ["L", "Litro", 3],
        ["par", "Par", 0],
        ["rl", "Rolo", 0],
      ].map(async ([sigla, descricao, casas]) => [
        sigla,
        (await prisma.unidadeMedida.create({ data: { sigla: sigla as string, descricao: descricao as string, casasDecimais: casas as number } })).id,
      ]),
    ),
  ) as Record<string, string>;

  type P = [codigo: string, descricao: string, categoria: string, um: string, classe: "EXPLOSIVO" | "ACESSORIO_EXPLOSIVO" | "INSUMO_PRODUCAO" | "MATERIAL_GERAL", lote: boolean, pen?: string, pic?: string];
  const catalogo: P[] = [
    ["EMU-001", "Emulsão encartuchada 2\" (demo)", "Explosivos", "kg", "EXPLOSIVO", true, "PEN-1001", "PIC-501"],
    ["NIT-001", "Nitrato de amônio (demo)", "Insumos de produção", "kg", "INSUMO_PRODUCAO", true, "PEN-2001", "PIC-610"],
    ["ACE-001", "Espoleta não elétrica 6 m (demo)", "Acessórios explosivos", "un", "ACESSORIO_EXPLOSIVO", true, "PEN-3001", "PIC-701"],
    ["ACE-002", "Cordel detonante 5 g/m (demo)", "Acessórios explosivos", "m", "ACESSORIO_EXPLOSIVO", false, "PEN-3002", "PIC-702"],
    ["ACE-003", "Reforçador cilíndrico 450 g (demo)", "Acessórios explosivos", "un", "ACESSORIO_EXPLOSIVO", true, "PEN-3003"],
    ["INS-001", "Óleo combustível para emulsão (demo)", "Insumos de produção", "L", "INSUMO_PRODUCAO", false, "PEN-2002"],
    ["MAT-001", "Luva de proteção (demo)", "Materiais gerais", "par", "MATERIAL_GERAL", false, undefined, "PIC-901"],
    ["MAT-002", "Fita de sinalização (demo)", "Materiais gerais", "rl", "MATERIAL_GERAL", false, "PEN-9001", "PIC-902"],
  ];
  const prod: Record<string, string> = {};
  for (const [codigo, descricao, c, u, classificacao, controlaLote, cPen, cPic] of catalogo) {
    const p = await prisma.produto.create({
      data: { codigo, descricao, categoriaId: cat[c], unidadeMedidaId: um[u], classificacao, controlaLote, criadoPorId: admin.id, demonstracao: true },
    });
    prod[codigo] = p.id;
    if (cPen) await prisma.produtoUnidade.create({ data: { produtoId: p.id, unidadeId: pen.id, codigoLocal: cPen, associadoPorId: admin.id } });
    if (cPic) await prisma.produtoUnidade.create({ data: { produtoId: p.id, unidadeId: pic.id, codigoLocal: cPic, associadoPorId: admin.id } });
  }
  // exemplo de inativação somente em uma unidade
  await prisma.produtoUnidade.update({
    where: { produtoId_unidadeId: { produtoId: prod["MAT-002"], unidadeId: pic.id } },
    data: { situacao: "INATIVO" },
  });

  // ── Atores para os serviços ──
  const A = (u: { id: string; perfil: Ator["perfil"] }, unidades: string[]): Ator => ({ id: u.id, perfil: u.perfil, unidadeIds: unidades });
  const aOPen = A(oPen, [pen.id]);
  const aGPen = A(gPen, [pen.id]);
  const aOPic = A(oPic, [pic.id]);
  const aGPic = A(gPic, [pic.id]);
  const d = (s: string) => new Date(`${s}T10:00:00-03:00`);

  const entrada = async (unidadeId: string, op: Ator, gestor: Ator, codigo: string, qtd: number, data: string, doc: string, lote?: string, validar = true) => {
    const m = await registrarLancamento(
      { tipo: "ENTRADA", unidadeId, produtoId: prod[codigo], quantidade: qtd, dataMovimento: d(data), documento: doc, loteNumero: lote, fornecedor: "Fornecedor Exemplo S.A. (demo)" },
      op,
      prisma,
    );
    if (validar) await validarLancamento(m.id, gestor, prisma);
  };
  const consumo = async (unidadeId: string, op: Ator, gestor: Ator, codigo: string, qtd: number, data: string, doc: string, lote?: string, validar = true) => {
    const m = await registrarLancamento(
      { tipo: "CONSUMO", unidadeId, produtoId: prod[codigo], quantidade: qtd, dataMovimento: d(data), documento: doc, loteNumero: lote, observacoes: "Consumo administrativo — Mina Pico (demo)" },
      op,
      prisma,
    );
    if (validar) await validarLancamento(m.id, gestor, prisma);
  };

  // Entradas na Peneirinha
  await entrada(pen.id, aOPen, aGPen, "NIT-001", 8000, "2026-11-02", "NF-DEMO-1001", "NIT-L2610");
  await entrada(pen.id, aOPen, aGPen, "INS-001", 600, "2026-11-02", "NF-DEMO-1002");
  await entrada(pen.id, aOPen, aGPen, "EMU-001", 2500, "2026-11-03", "PROD-DEMO-0001", "EMU-L2611A"); // produção administrativa virá em etapa própria
  await entrada(pen.id, aOPen, aGPen, "ACE-001", 1200, "2026-11-03", "NF-DEMO-1003", "ESP-L77");
  await entrada(pen.id, aOPen, aGPen, "ACE-002", 2000, "2026-11-04", "NF-DEMO-1004");
  await entrada(pen.id, aOPen, aGPen, "ACE-003", 400, "2026-11-04", "NF-DEMO-1005", "REF-L12");
  await entrada(pen.id, aOPen, aGPen, "MAT-002", 30, "2026-11-04", "NF-DEMO-1006");
  // Entradas no Pico
  await entrada(pic.id, aOPic, aGPic, "MAT-001", 150, "2026-11-05", "NF-DEMO-2001");
  await entrada(pic.id, aOPic, aGPic, "NIT-001", 1500, "2026-11-05", "NF-DEMO-2002", "NIT-L2609");

  // T1: Peneirinha → Pico, emulsão, recebida sem divergência
  const t1 = await criarTransferencia(
    { origemId: pen.id, destinoId: pic.id, dataTransferencia: d("2026-11-06"), documento: "GT-DEMO-0001", itens: [{ produtoId: prod["EMU-001"], loteNumero: "EMU-L2611A", quantidade: 800 }, { produtoId: prod["ACE-002"], quantidade: 600 }] },
    aOPen,
    prisma,
  );
  await enviarTransferencia(t1.id, aGPen, prisma);
  await registrarChegada(t1.id, aOPic, prisma);
  await confirmarRecebimento({ transferenciaId: t1.id, itens: t1.itens.map((i) => ({ itemId: i.id, quantidadeRecebida: Number(i.quantidadeEnviada) })) }, aOPic, prisma);

  // Consumo no Pico
  await consumo(pic.id, aOPic, aGPic, "EMU-001", 320, "2026-11-09", "RC-DEMO-0101", "EMU-L2611A");
  await consumo(pic.id, aOPic, aGPic, "ACE-002", 180, "2026-11-09", "RC-DEMO-0101");
  await consumo(pic.id, aOPic, aGPic, "MAT-001", 20, "2026-11-10", "RC-DEMO-0102");
  await consumo(pic.id, aOPic, aGPic, "EMU-001", 150, "2026-11-12", "RC-DEMO-0103", "EMU-L2611A", false); // pendente de validação

  // T2: Peneirinha → Pico, espoletas, EM TRÂNSITO
  const t2 = await criarTransferencia(
    { origemId: pen.id, destinoId: pic.id, dataTransferencia: d("2026-11-12"), documento: "GT-DEMO-0002", itens: [{ produtoId: prod["ACE-001"], loteNumero: "ESP-L77", quantidade: 300 }] },
    aOPen,
    prisma,
  );
  await enviarTransferencia(t2.id, aGPen, prisma);

  // T3: Pico → Peneirinha, nitrato, DIVERGENTE (enviado 1.000 kg, conferido 985 kg)
  const t3 = await criarTransferencia(
    { origemId: pic.id, destinoId: pen.id, dataTransferencia: d("2026-11-11"), documento: "GT-DEMO-0003", itens: [{ produtoId: prod["NIT-001"], loteNumero: "NIT-L2609", quantidade: 1000 }] },
    aOPic,
    prisma,
  );
  await enviarTransferencia(t3.id, aGPic, prisma);
  await confirmarRecebimento({ transferenciaId: t3.id, itens: [{ itemId: t3.itens[0].id, quantidadeRecebida: 985 }] }, aOPen, prisma);

  // T4: rascunho
  await criarTransferencia(
    { origemId: pen.id, destinoId: pic.id, dataTransferencia: d("2026-11-13"), documento: "GT-DEMO-0004", itens: [{ produtoId: prod["ACE-002"], quantidade: 400 }] },
    aOPen,
    prisma,
  );

  // Fechamento semanal (exemplo)
  await prisma.fechamentoSemanal.createMany({
    data: [
      { unidadeId: pen.id, semanaInicio: new Date("2026-11-02"), semanaFim: new Date("2026-11-08"), status: "FECHADO", fechadoEm: d("2026-11-09"), fechadoPorId: gPen.id },
      { unidadeId: pic.id, semanaInicio: new Date("2026-11-02"), semanaFim: new Date("2026-11-08"), status: "EM_CONFERENCIA" },
      { unidadeId: pen.id, semanaInicio: new Date("2026-11-09"), semanaFim: new Date("2026-11-15"), status: "ABERTO" },
      { unidadeId: pic.id, semanaInicio: new Date("2026-11-09"), semanaFim: new Date("2026-11-15"), status: "ABERTO" },
    ],
  });

  await prisma.movimento.updateMany({ data: { demonstracao: true } });
  await prisma.transferencia.updateMany({ data: { demonstracao: true } });

  console.log("Demonstração criada. Usuários (senha para todos: %s):", SENHA_DEMO);
  for (const u of [admin, gPen, gPic, oPen, oPic, cons]) console.log(`  ${u.perfil.padEnd(8)} ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
