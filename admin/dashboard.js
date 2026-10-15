import { db } from "./firebase-config.js";

import { collection, getDocs, query, where } from "firebase/firestore";

// ==========================================
// DADOS DO DASHBOARD
// ==========================================

let pedidos = [];
let produtos = [];
let custos = [];

const filtroLoja = document.getElementById("lojaSelecionada");

const filtroPeriodo = document.getElementById("periodoDashboard");

// ==========================================
// FILTRO DE PERÍODO
// ==========================================

function obterDataRegistro(valor) {
  if (!valor) return null;

  if (typeof valor.toDate === "function") {
    return valor.toDate();
  }

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  if (typeof valor === "string") {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);

    if (partes) {
      const ano = Number(partes[1]);
      const mes = Number(partes[2]);
      const dia = Number(partes[3]);

      const data = new Date(ano, mes - 1, dia);

      if (
        data.getFullYear() !== ano ||
        data.getMonth() !== mes - 1 ||
        data.getDate() !== dia
      ) {
        return null;
      }

      return data;
    }
  }

  const data = new Date(valor);

  return Number.isNaN(data.getTime()) ? null : data;
}

function dataDentroDoPeriodo(valor) {
  const periodo = filtroPeriodo?.value || "todos";

  if (periodo === "todos") return true;

  const data = obterDataRegistro(valor);

  if (!data) return false;

  const hoje = new Date();

  const inicioHoje = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
  );

  let inicio;

  switch (periodo) {
    case "hoje":
      inicio = inicioHoje;
      break;

    case "7dias":
      inicio = new Date(inicioHoje);
      inicio.setDate(inicio.getDate() - 6);
      break;

    case "30dias":
      inicio = new Date(inicioHoje);
      inicio.setDate(inicio.getDate() - 29);
      break;

    case "mes":
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      break;

    case "ano":
      inicio = new Date(hoje.getFullYear(), 0, 1);
      break;

    default:
      return true;
  }

  const fim = new Date(inicioHoje);
  fim.setDate(fim.getDate() + 1);

  return data >= inicio && data < fim;
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function atualizarTexto(id, valor) {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.textContent = valor;
  }
}

function obterNomeLoja(loja) {
  if (loja === "closet") return "Closet";
  if (loja === "3d") return "Decor 3D";

  return "—";
}

function pedidoEstaFaturado(pedido) {
  return pedido.statusPagamento === "Aprovado" && pedido.status !== "cancelado";
}

function filtrarPorLoja(registros) {
  const lojaSelecionada = filtroLoja?.value || "todas";

  if (lojaSelecionada === "todas") {
    return registros;
  }

  return registros.filter((registro) => registro.loja === lojaSelecionada);
}

function somarValores(registros, campo) {
  return registros.reduce(
    (total, registro) => total + Number(registro[campo] || 0),
    0,
  );
}

// ==========================================
// CARREGAR COLEÇÕES DO FIRESTORE
// ==========================================

async function carregarColecao(nomeColecao) {
  const colecao = collection(db, nomeColecao);

  const [resultadoCloset, resultado3D] = await Promise.all([
    getDocs(query(colecao, where("loja", "==", "closet"))),
    getDocs(query(colecao, where("loja", "==", "3d"))),
  ]);

  const registros = [];

  for (const resultado of [resultadoCloset, resultado3D]) {
    resultado.forEach((documento) => {
      registros.push({
        id: documento.id,
        ...documento.data(),
      });
    });
  }

  return registros;
}

// ==========================================
// INDICADORES PRINCIPAIS
// ==========================================

function atualizarIndicadores() {
  const pedidosFiltrados = filtrarPorLoja(pedidos).filter((pedido) =>
    dataDentroDoPeriodo(pedido.criadoEm),
  );

  const produtosFiltrados = filtrarPorLoja(produtos);
  const custosFiltrados = filtrarPorLoja(custos);

  // Pedidos criados no período selecionado
  const pedidosDoPeriodo = pedidosFiltrados.filter((pedido) =>
    dataDentroDoPeriodo(pedido.criadoEm),
  );

  // Pagamentos aprovados no período selecionado
  const pedidosFaturados = pedidosFiltrados.filter((pedido) => {
    if (!pedidoEstaFaturado(pedido)) {
      return false;
    }

    const dataPagamento = pedido.pagamentoAprovadoEm || pedido.criadoEm;

    return dataDentroDoPeriodo(dataPagamento);
  });


  const custosDoPeriodo = custosFiltrados.filter((custo) =>
    dataDentroDoPeriodo(custo.data),
  );

  const faturamento = somarValores(pedidosFaturados, "total");

  const totalCustos = somarValores(custosDoPeriodo, "valor");

  const lucro = faturamento - totalCustos;


  const totalPedidos = pedidosDoPeriodo.length;
  const totalProdutos = produtosFiltrados.length;
  const totalEstoque = somarValores(produtosFiltrados, "estoque");

  const pedidosPagos = pedidosFaturados.length;


  const pedidosPendentes = pedidosDoPeriodo.filter(
    (pedido) =>
      pedido.status !== "cancelado" &&
      pedido.statusPagamento !== "Aprovado"
  ).length;

  const pedidosCancelados = pedidosDoPeriodo.filter(
    (pedido) => pedido.status === "cancelado"
  ).length;

  atualizarTexto("pedidosPagosDashboard", pedidosPagos);

  atualizarTexto("pedidosPendentesDashboard", pedidosPendentes);

  atualizarTexto("pedidosCanceladosDashboard", pedidosCancelados);


  atualizarTexto("faturamento", formatarMoeda(faturamento));

  atualizarTexto("lucroDashboard", formatarMoeda(lucro));

  atualizarTexto("custosDashboard", formatarMoeda(totalCustos));

  atualizarTexto("totalPedidos", totalPedidos);

  atualizarTexto("totalProdutos", totalProdutos);

  atualizarTexto("totalEstoque", totalEstoque);
}

// ==========================================
// RESULTADOS POR LOJA
// ==========================================

function calcularResultadoLoja(loja) {
  // Pedidos da loja com pagamento aprovado
  const pedidosFaturados = pedidos.filter((pedido) => {
    if (pedido.loja !== loja || !pedidoEstaFaturado(pedido)) {
      return false;
    }

    // Para pedidos antigos, utiliza a data de criação
    const dataPagamento = pedido.pagamentoAprovadoEm || pedido.criadoEm;

    return dataDentroDoPeriodo(dataPagamento);
  });

  // Custos da loja dentro do período selecionado
  const custosLoja = custos.filter(
    (custo) => custo.loja === loja && dataDentroDoPeriodo(custo.data),
  );

  const faturamento = somarValores(pedidosFaturados, "total");

  const totalCustos = somarValores(custosLoja, "valor");

  return {
    faturamento,
    custos: totalCustos,
    lucro: faturamento - totalCustos,
  };
}

function atualizarResultadosLojas() {
  const closet = calcularResultadoLoja("closet");
  const decor3D = calcularResultadoLoja("3d");

  atualizarTexto("faturamentoCloset", formatarMoeda(closet.faturamento));

  atualizarTexto("custosCloset", formatarMoeda(closet.custos));

  atualizarTexto("lucroCloset", formatarMoeda(closet.lucro));

  atualizarTexto("faturamento3D", formatarMoeda(decor3D.faturamento));

  atualizarTexto("custos3D", formatarMoeda(decor3D.custos));

  atualizarTexto("lucro3D", formatarMoeda(decor3D.lucro));
}

// ==========================================
// PEDIDOS RECENTES
// ==========================================

function atualizarPedidosRecentes() {
  const tabela = document.getElementById("listaPedidos");

  if (!tabela) return;

  const pedidosRecentes = filtrarPorLoja(pedidos)
    .slice()
    .sort((a, b) => {
      const dataA = a.criadoEm?.toMillis?.() || 0;
      const dataB = b.criadoEm?.toMillis?.() || 0;

      return dataB - dataA;
    })
    .slice(0, 5);

  tabela.replaceChildren();

  if (pedidosRecentes.length === 0) {
    const linha = document.createElement("tr");
    const celula = document.createElement("td");

    celula.colSpan = 6;
    celula.className = "sem-dados";
    celula.textContent = "Nenhum pedido encontrado.";

    linha.appendChild(celula);
    tabela.appendChild(linha);

    return;
  }

  const nomesStatus = {
    aguardando_pagamento: "Aguardando pagamento",
    pago: "Pago",
    preparando: "Preparando",
    enviado: "Enviado",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  pedidosRecentes.forEach((pedido) => {
    const linha = document.createElement("tr");

    const numeroPedido = pedido.numero || pedido.id;

    const nomeCliente =
      pedido.clienteNome ||
      pedido.cliente?.nome ||
      pedido.nomeCliente ||
      "Não informado";

    const data = pedido.criadoEm?.toDate?.().toLocaleDateString("pt-BR") || "—";

    const status = pedido.status || "aguardando_pagamento";

    const valores = [
      numeroPedido,
      obterNomeLoja(pedido.loja),
      nomeCliente,
      data,
      formatarMoeda(pedido.total),
    ];

    valores.forEach((valor) => {
      const celula = document.createElement("td");

      celula.textContent = valor;

      linha.appendChild(celula);
    });

    const celulaStatus = document.createElement("td");
    const etiqueta = document.createElement("span");

    etiqueta.className = `status-pedido status-${status}`;

    etiqueta.textContent = nomesStatus[status] || status;

    celulaStatus.appendChild(etiqueta);
    linha.appendChild(celulaStatus);

    tabela.appendChild(linha);
  });
}

// ==========================================
// ALERTAS DE ESTOQUE
// ==========================================


function atualizarAlertasEstoque() {

  const produtosFiltrados = filtrarPorLoja(produtos);


  const produtosBaixos = [];
  const produtosEsgotados = [];

  produtosFiltrados.forEach((produto) => {
    const quantidade = Number(produto.estoque ?? 0);

    if (!Number.isFinite(quantidade)) return;

    if (quantidade === 0) {
      produtosEsgotados.push(produto);
    } else if (quantidade > 0 && quantidade <= 5) {
      produtosBaixos.push(produto);
    }
  });

  atualizarTexto(
    "quantidadeEstoqueBaixo",
    produtosBaixos.length
  );

  atualizarTexto(
    "quantidadeEsgotados",
    produtosEsgotados.length
  );



  const tabela = document.getElementById(
    "listaAlertasEstoque"
  );

  if (!tabela) return;

  tabela.replaceChildren();

  const produtosEmAlerta = [
    ...produtosEsgotados,
    ...produtosBaixos,
  ].sort((a, b) => {
    const quantidadeA = Number(a.estoque ?? 0);
    const quantidadeB = Number(b.estoque ?? 0);

    return quantidadeA - quantidadeB;
  });


  if (produtosEmAlerta.length === 0) {
    const linha = document.createElement("tr");
    const celula = document.createElement("td");

    celula.colSpan = 4;
    celula.className = "sem-dados";

    celula.textContent =
      "Nenhum produto com estoque baixo ou esgotado.";

    linha.appendChild(celula);
    tabela.appendChild(linha);

    return;
  }


  produtosEmAlerta.forEach((produto) => {
    const quantidade = Number(produto.estoque ?? 0);

    const esgotado = quantidade === 0;

    const linha = document.createElement("tr");

    const valores = [
      produto.nome || "Produto sem nome",
      obterNomeLoja(produto.loja),
      quantidade,
    ];

    valores.forEach((valor) => {
      const celula = document.createElement("td");

      celula.textContent = String(valor);

      linha.appendChild(celula);
    });

    const celulaStatus = document.createElement("td");
    const etiqueta = document.createElement("span");

    etiqueta.className = esgotado
      ? "dashboard-status-estoque esgotado"
      : "dashboard-status-estoque baixo";

    etiqueta.textContent = esgotado
      ? "Esgotado"
      : "Estoque baixo";

    celulaStatus.appendChild(etiqueta);
    linha.appendChild(celulaStatus);

    tabela.appendChild(linha);
  });
}

function atualizarDashboard() {
  atualizarIndicadores();
  atualizarResultadosLojas();
  atualizarPedidosRecentes();
  atualizarAlertasEstoque();
}

filtroLoja?.addEventListener("change", atualizarDashboard);

filtroPeriodo?.addEventListener("change", atualizarDashboard);


async function iniciarDashboard() {
  try {
    [pedidos, produtos, custos] = await Promise.all([
      carregarColecao("pedidos"),
      carregarColecao("produtos"),
      carregarColecao("custos"),
    ]);

    atualizarDashboard();

    console.log("Dashboard carregado com sucesso!");
  } catch (erro) {
    console.error("Erro ao carregar Dashboard:", erro);
  }
}

iniciarDashboard();
