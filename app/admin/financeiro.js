import { db } from "./firebase-config.js";

import { collection, getDocs, query, where } from "firebase/firestore";

// ==========================================
// ELEMENTOS DA PÁGINA
// ==========================================

const faturamentoFinanceiro = document.getElementById("faturamentoFinanceiro");

const lucroFinanceiro = document.getElementById("lucroFinanceiro");

const pedidosPagosFinanceiro = document.getElementById(
  "pedidosPagosFinanceiro",
);

const ticketMedioFinanceiro = document.getElementById("ticketMedioFinanceiro");

const pedidosCanceladosFinanceiro = document.getElementById(
  "pedidosCanceladosFinanceiro",
);

const tabelaFinanceiro = document.getElementById("tabelaFinanceiro");

const filtroPeriodoFinanceiro = document.getElementById(
  "filtroPeriodoFinanceiro",
);

let pedidos = [];
let custos = [];

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function formatarValor(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function pedidoEstaFaturado(pedido) {
  return pedido.statusPagamento === "Aprovado" && pedido.status !== "cancelado";
}

function obterDataCriacaoPedido(pedido) {
  return pedido.criadoEm?.toDate?.() || null;
}

function obterDataPagamentoPedido(pedido) {
  // Compatibilidade com pedidos antigos:
  // caso não exista a data de aprovação,
  // utiliza a data de criação.
  return (
    pedido.pagamentoAprovadoEm?.toDate?.() || obterDataCriacaoPedido(pedido)
  );
}

function dataEstaNoPeriodo(data) {
  const periodoSelecionado = filtroPeriodoFinanceiro?.value || "todos";

  if (periodoSelecionado === "todos") {
    return true;
  }

  if (!(data instanceof Date) || Number.isNaN(data.getTime())) {
    return false;
  }

  const agora = new Date();

  const inicioHoje = new Date(agora);
  inicioHoje.setHours(0, 0, 0, 0);

  const fimHoje = new Date(agora);
  fimHoje.setHours(23, 59, 59, 999);

  if (periodoSelecionado === "hoje") {
    return data >= inicioHoje && data <= fimHoje;
  }

  if (periodoSelecionado === "7dias") {
    const limite = new Date(inicioHoje);
    limite.setDate(limite.getDate() - 6);

    return data >= limite && data <= fimHoje;
  }

  if (periodoSelecionado === "30dias") {
    const limite = new Date(inicioHoje);
    limite.setDate(limite.getDate() - 29);

    return data >= limite && data <= fimHoje;
  }

  if (periodoSelecionado === "mes") {
    return (
      data.getMonth() === agora.getMonth() &&
      data.getFullYear() === agora.getFullYear()
    );
  }

  if (periodoSelecionado === "ano") {
    return data.getFullYear() === agora.getFullYear();
  }

  return true;
}

// ==========================================
// FILTRAR PEDIDOS POR PERÍODO
// ==========================================

function obterPedidosFiltradosPorPeriodo(
  pedidosParaFiltrar,
  tipoData = "criacao",
) {
  return pedidosParaFiltrar.filter((pedido) => {
    const dataPedido =
      tipoData === "pagamento"
        ? obterDataPagamentoPedido(pedido)
        : obterDataCriacaoPedido(pedido);

    return dataEstaNoPeriodo(dataPedido);
  });
}

function obterPedidosFiltrados(tipoData = "criacao") {
  return obterPedidosFiltradosPorPeriodo(pedidos, tipoData);
}

// ==========================================
// FILTRAR CUSTOS
// ==========================================

function obterCustosFiltrados() {
  const periodoSelecionado = filtroPeriodoFinanceiro?.value || "todos";

  return custos.filter((custo) => {
    if (periodoSelecionado === "todos") {
      return true;
    }

    if (!custo.data || typeof custo.data !== "string") {
      return false;
    }

    const [ano, mes, dia] = custo.data.split("-").map(Number);

    const dataCusto = new Date(ano, mes - 1, dia);
    dataCusto.setHours(0, 0, 0, 0);

    return dataEstaNoPeriodo(dataCusto);
  });
}

// ==========================================
// PEDIDOS FATURADOS
// ==========================================

function obterPedidosFaturados() {
  return obterPedidosFiltrados("pagamento").filter(pedidoEstaFaturado);
}

// ==========================================
// CALCULAR FATURAMENTO
// ==========================================

function calcularFaturamento() {
  const pedidosFaturados = obterPedidosFaturados();

  const faturamento = pedidosFaturados.reduce(
    (total, pedido) => total + Number(pedido.total || 0),
    0,
  );

  if (faturamentoFinanceiro) {
    faturamentoFinanceiro.textContent = formatarValor(faturamento);
  }
}

// ==========================================
// CALCULAR LUCRO
// ==========================================

function calcularLucro() {
  const pedidosFaturados = obterPedidosFaturados();

  const faturamento = pedidosFaturados.reduce(
    (total, pedido) => total + Number(pedido.total || 0),
    0,
  );

  const custosFiltrados = obterCustosFiltrados();

  const totalCustos = custosFiltrados.reduce(
    (total, custo) => total + Number(custo.valor || 0),
    0,
  );

  const lucro = faturamento - totalCustos;

  if (lucroFinanceiro) {
    lucroFinanceiro.textContent = formatarValor(lucro);
  }
}

// ==========================================
// PEDIDOS PAGOS E TICKET MÉDIO
// ==========================================

function calcularPedidosPagosETicketMedio() {
  const pedidosPagos = obterPedidosFaturados();

  const quantidadePedidosPagos = pedidosPagos.length;

  const faturamento = pedidosPagos.reduce(
    (total, pedido) => total + Number(pedido.total || 0),
    0,
  );

  const ticketMedio =
    quantidadePedidosPagos > 0 ? faturamento / quantidadePedidosPagos : 0;

  if (pedidosPagosFinanceiro) {
    pedidosPagosFinanceiro.textContent = quantidadePedidosPagos;
  }

  if (ticketMedioFinanceiro) {
    ticketMedioFinanceiro.textContent = formatarValor(ticketMedio);
  }
}

// ==========================================
// PEDIDOS CANCELADOS
// ==========================================

function calcularPedidosCancelados() {
  const pedidosFiltrados = obterPedidosFiltrados("criacao");

  const pedidosCancelados = pedidosFiltrados.filter(
    (pedido) => pedido.status === "cancelado",
  );

  if (pedidosCanceladosFinanceiro) {
    pedidosCanceladosFinanceiro.textContent = pedidosCancelados.length;
  }
}

// ==========================================
// CARREGAR PEDIDOS
// ==========================================

async function carregarPedidosFinanceiro() {
  try {
    const resultado = await getDocs(query(
      collection(db, "pedidos"),
      where("loja", "==", "closet"),
    ));
    pedidos = resultado.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));
  } catch (erro) {
    console.error("Erro ao carregar dados financeiros:", erro);
    throw erro;
  }
}

// ==========================================
// CARREGAR CUSTOS
// ==========================================

async function carregarCustosFinanceiro() {
  try {
    const resultado = await getDocs(query(
      collection(db, "custos"),
      where("loja", "==", "closet"),
    ));
    custos = resultado.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));
  } catch (erro) {
    console.error("Erro ao carregar custos no Financeiro:", erro);
    throw erro;
  }
}

// ==========================================
// DADOS FINANCEIROS POR LOJA
// ==========================================

function calcularDadosCloset() {
  // Pedidos realizados no período de criação.
  const pedidosDoPeriodo = obterPedidosFiltrados("criacao");
  // Faturamento considera a data de aprovação do pagamento.
  const pedidosPagos = obterPedidosFaturados();
  const faturamento = pedidosPagos.reduce(
    (total, pedido) => total + Number(pedido.total || 0), 0,
  );
  const totalCustos = obterCustosFiltrados().reduce(
    (total, custo) => total + Number(custo.valor || 0), 0,
  );
  return {
    pedidos: pedidosDoPeriodo.length,
    pedidosPagos: pedidosPagos.length,
    faturamento,
    custos: totalCustos,
    lucro: faturamento - totalCustos,
    ticketMedio: pedidosPagos.length ? faturamento / pedidosPagos.length : 0,
  };
}

// ==========================================
// TABELA FINANCEIRA
// ==========================================

function renderizarTabelaFinanceiro() {
  if (!tabelaFinanceiro) return;
  const dados = calcularDadosCloset();
  const linha = document.createElement("tr");
  const valores = [
    dados.pedidos,
    dados.pedidosPagos,
    formatarValor(dados.faturamento),
    formatarValor(dados.custos),
    formatarValor(dados.lucro),
    formatarValor(dados.ticketMedio),
  ];
  for (const valor of valores) {
    const celula = document.createElement("td");
    celula.textContent = String(valor);
    linha.appendChild(celula);
  }
  tabelaFinanceiro.replaceChildren(linha);
}

// ==========================================
// ATUALIZAR INDICADORES
// ==========================================

function atualizarFinanceiro() {
  calcularFaturamento();
  calcularLucro();
  calcularPedidosPagosETicketMedio();
  calcularPedidosCancelados();
  renderizarTabelaFinanceiro();
}

// ==========================================
// EVENTOS DOS FILTROS
// ==========================================

filtroPeriodoFinanceiro?.addEventListener("change", atualizarFinanceiro);

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function iniciarFinanceiro() {
  try {
    await Promise.all([
      carregarPedidosFinanceiro(),
      carregarCustosFinanceiro(),
    ]);

    atualizarFinanceiro();
  } catch (erro) {
    console.error("Erro ao iniciar o Financeiro:", erro);
  }
}

iniciarFinanceiro();
