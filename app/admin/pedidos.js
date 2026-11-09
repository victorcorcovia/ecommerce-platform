import { db } from "./firebase-config.js";
import { getAuth } from "firebase/auth";

import {
  collection,
  getDoc,
  getDocs,
  query,
  where,
  doc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";

// ==========================================
// ELEMENTOS DA PÁGINA
// ==========================================

const $ = (id) => document.getElementById(id);

const tabelaPedidos = $("tabelaPedidos");
const filtroLojaPedidos = $("filtroLojaPedidos");
const filtroStatusPedidos = $("filtroStatusPedidos");
const buscarPedido = $("buscarPedido");

const detalhesPedido = $("detalhesPedido");
const numeroPedidoDetalhes = $("numeroPedidoDetalhes");
const detalheCliente = $("detalheCliente");
const detalheEmail = $("detalheEmail");
const detalheLoja = $("detalheLoja");
const detalhePagamento = $("detalhePagamento");
const detalheSubtotal = $("detalheSubtotal");
const detalheFrete = $("detalheFrete");
const detalheTotal = $("detalheTotal");
const alterarStatusPedido = $("alterarStatusPedido");
const btnFecharPedido = $("btnFecharPedido");
const tabelaItensPedido = $("tabelaItensPedido");

const detalheCep = $("detalheCep");
const detalheRua = $("detalheRua");
const detalheNumeroEndereco = $("detalheNumeroEndereco");
const detalheComplemento = $("detalheComplemento");
const detalheBairro = $("detalheBairro");
const detalheCidade = $("detalheCidade");
const detalheEstado = $("detalheEstado");

const situacaoEstoque = $("situacaoEstoqueCancelamento");
const textoSituacaoEstoque = $("textoSituacaoEstoque");
const descricaoSituacaoEstoque = $("descricaoSituacaoEstoque");
const iconeSituacaoEstoque = $("iconeSituacaoEstoque");
const acoesReintegracao = $("acoesReintegracaoEstoque");
const btnReintegrarEstoque = $("btnReintegrarEstoque");

const btnNovoPedido = $("btnNovoPedido");
const formNovoPedido = $("formNovoPedido");
const btnFecharNovoPedido = $("btnFecharNovoPedido");
const btnCancelarNovoPedido = $("btnCancelarNovoPedido");

const pedidoLoja = $("pedidoLoja");
const pedidoProduto = $("pedidoProduto");
const pedidoQuantidade = $("pedidoQuantidade");
const pedidoFrete = $("pedidoFrete");
const tabelaItensNovoPedido = $("itensNovoPedido");
const totalNovoPedido = $("totalNovoPedido");
const btnAdicionarItemPedido = $("btnAdicionarItemPedido");

let pedidos = [];
const auth = getAuth();
let pedidoSelecionado = null;
let produtosPedido = [];
let itensPedidoManual = [];

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function obterNomeLoja(loja) {
  if (loja === "closet") return "Closet";
  if (loja === "3d") return "Decor 3D";
  return loja || "—";
}

function obterNomeStatus(status) {
  const nomes = {
    aguardando_pagamento: "Aguardando pagamento",
    pago: "Pago",
    preparando: "Em preparação",
    enviado: "Enviado",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  return nomes[status] || status || "—";
}

function formatarValor(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(timestamp) {
  return timestamp?.toDate ? timestamp.toDate().toLocaleString("pt-BR") : "—";
}

function normalizarEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizarTelefone(telefone) {
  return String(telefone || "").replace(/\D/g, "");
}

async function buscarClientesExistentes(email, telefone) {
  const emailNormalizado = normalizarEmail(email);
  const telefoneNormalizado = normalizarTelefone(telefone);

  const encontrados = new Map();
  const colecaoClientes = collection(db, "clientes");

  if (emailNormalizado) {
    const consultaEmail = query(
      colecaoClientes,
      where("emailNormalizado", "==", emailNormalizado),
    );

    const resultado = await getDocs(consultaEmail);

    resultado.forEach((documento) => {
      encontrados.set(documento.id, {
        id: documento.id,
        ...documento.data(),
      });
    });
  }

  if (telefoneNormalizado) {
    const consultaTelefone = query(
      colecaoClientes,
      where("telefoneNormalizado", "==", telefoneNormalizado),
    );

    const resultado = await getDocs(consultaTelefone);

    resultado.forEach((documento) => {
      encontrados.set(documento.id, {
        id: documento.id,
        ...documento.data(),
      });
    });
  }

  return Array.from(encontrados.values());
}

function escrever(id, valor) {
  const elemento = $(id);
  if (elemento) elemento.textContent = valor;
}

function ocultar(elemento) {
  if (elemento) elemento.style.display = "none";
}

function mostrar(elemento, tipo = "block") {
  if (elemento) elemento.style.display = tipo;
}

function adicionarCelula(linha, valor) {
  const celula = document.createElement("td");
  celula.textContent = String(valor ?? "—");
  linha.appendChild(celula);
  return celula;
}

function registrarHistoricoPedido(transacao, pedidoId, loja, tipo, descricao) {
  const usuarioId = auth.currentUser?.uid;

  if (!usuarioId) {
    throw new Error("Usuário não autenticado.");
  }

  const referenciaHistorico = doc(collection(db, "historicoPedidos"));

  transacao.set(referenciaHistorico, {
    pedidoId,
    loja,
    tipo,
    descricao,
    criadoEm: serverTimestamp(),
    usuarioId,
  });
}

async function carregarHistoricoPedido(pedidoId, loja) {
  const container = document.getElementById("historicoPedido");

  if (!container) return;

  container.textContent = "Carregando histórico...";

  try {
    const consulta = query(
      collection(db, "historicoPedidos"),
      where("loja", "==", loja),
      where("pedidoId", "==", pedidoId),
    );

    const resultado = await getDocs(consulta);

    // Evita exibir o histórico de outro pedido
    if (pedidoSelecionado?.id !== pedidoId) return;

    const historico = resultado.docs
      .map((documento) => documento.data())
      .sort((a, b) => {
        const dataA = a.criadoEm?.toMillis?.() || 0;
        const dataB = b.criadoEm?.toMillis?.() || 0;
        return dataB - dataA;
      });

    container.replaceChildren();

    if (historico.length === 0) {
      container.textContent = "Nenhuma atividade registrada.";
      return;
    }

    historico.forEach((atividade) => {
      const item = document.createElement("div");
      item.className = "historico-pedido-item";

      const descricao = document.createElement("p");
      descricao.textContent = atividade.descricao || "Atividade registrada.";

      const data = document.createElement("small");
      data.textContent = formatarData(atividade.criadoEm);

      item.append(descricao, data);
      container.appendChild(item);
    });
  } catch (erro) {
    console.error("Erro ao carregar histórico:", erro);

    if (pedidoSelecionado?.id === pedidoId) {
      container.textContent = "Não foi possível carregar o histórico.";
    }
  }
}

// ==========================================
// CARREGAR PEDIDOS
// ==========================================

async function carregarPedidos() {
  try {
    const colecao = collection(db, "pedidos");

    const [resultadoCloset, resultado3D] = await Promise.all([
      getDocs(query(colecao, where("loja", "==", "closet"))),
      getDocs(query(colecao, where("loja", "==", "3d"))),
    ]);

    pedidos = [];

    for (const resultado of [resultadoCloset, resultado3D]) {
      resultado.forEach((documento) => {
        pedidos.push({
          id: documento.id,
          ...documento.data(),
        });
      });
    }

    pedidos.sort((a, b) => {
      const dataA = a.criadoEm?.toMillis?.() || 0;
      const dataB = b.criadoEm?.toMillis?.() || 0;
      return dataB - dataA;
    });

    renderizarPedidos();
  } catch (erro) {
    console.error("Erro ao carregar pedidos:", erro);

    if (tabelaPedidos) {
      tabelaPedidos.innerHTML =
        '<tr><td colspan="8" class="sem-dados">Erro ao carregar os pedidos.</td></tr>';
    }
  }
}

// ==========================================
// LISTAGEM E FILTROS
// ==========================================

function renderizarPedidos() {
  if (!tabelaPedidos) return;

  const loja = filtroLojaPedidos?.value || "todas";
  const status = filtroStatusPedidos?.value || "todos";
  const busca = (buscarPedido?.value || "").toLowerCase().trim();

  const filtrados = pedidos.filter((pedido) => {
    if (loja !== "todas" && pedido.loja !== loja) return false;
    if (status !== "todos" && pedido.status !== status) return false;

    if (busca) {
      const numero = String(pedido.numero || "").toLowerCase();
      const cliente = String(pedido.clienteNome || "").toLowerCase();

      if (!numero.includes(busca) && !cliente.includes(busca)) {
        return false;
      }
    }

    return true;
  });

  tabelaPedidos.innerHTML = "";

  if (filtrados.length === 0) {
    tabelaPedidos.innerHTML =
      '<tr><td colspan="8" class="sem-dados">Nenhum pedido encontrado.</td></tr>';
    return;
  }

  filtrados.forEach((pedido) => {
    const linha = document.createElement("tr");

    adicionarCelula(linha, pedido.numero || "—");
    adicionarCelula(linha, pedido.clienteNome || "—");
    adicionarCelula(linha, obterNomeLoja(pedido.loja));
    adicionarCelula(linha, formatarData(pedido.criadoEm));
    adicionarCelula(linha, pedido.statusPagamento || "—");
    adicionarCelula(linha, formatarValor(pedido.total));

    const celulaStatus = document.createElement("td");
    const statusVisual = document.createElement("span");

    statusVisual.className = `status-pedido status-${pedido.status}`;
    statusVisual.textContent = obterNomeStatus(pedido.status);

    celulaStatus.appendChild(statusVisual);
    linha.appendChild(celulaStatus);

    const celulaAcoes = document.createElement("td");
    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "btn-editar btn-ver-pedido";
    botao.dataset.id = pedido.id;
    botao.textContent = "Ver pedido";

    celulaAcoes.appendChild(botao);
    linha.appendChild(celulaAcoes);
    tabelaPedidos.appendChild(linha);
  });
}

filtroLojaPedidos?.addEventListener("change", renderizarPedidos);
filtroStatusPedidos?.addEventListener("change", renderizarPedidos);
buscarPedido?.addEventListener("input", renderizarPedidos);

// ==========================================
// SITUAÇÃO DO ESTOQUE
// ==========================================

function atualizarSituacaoEstoque(pedido) {
  // Remove a aparência verde do pedido anterior
  situacaoEstoque?.classList.remove("estoque-devolvido");

  ocultar(situacaoEstoque);
  ocultar(acoesReintegracao);
  ocultar(btnReintegrarEstoque);

  if (!pedido || pedido.status !== "cancelado") return;

  if (!situacaoEstoque) {
    console.warn("Cartão de estoque não encontrado no HTML.");
    return;
  }

  mostrar(situacaoEstoque);

  if (pedido.estoqueBaixado !== true) {
    escrever("iconeSituacaoEstoque", "—");
    escrever("textoSituacaoEstoque", "Sem baixa de estoque");
    escrever(
      "descricaoSituacaoEstoque",
      "O pedido foi cancelado antes da retirada dos produtos do estoque.",
    );
    return;
  }

  if (pedido.estoqueDevolvido === true) {
    // Aplica o fundo verde quando o estoque foi devolvido
    situacaoEstoque.classList.add("estoque-devolvido");

    escrever("iconeSituacaoEstoque", "✓");
    escrever("textoSituacaoEstoque", "Devolvido ao estoque");
    escrever(
      "descricaoSituacaoEstoque",
      "Os produtos foram reintegrados ao estoque.",
    );
    return;
  }

  escrever("iconeSituacaoEstoque", "!");
  escrever("textoSituacaoEstoque", "Não devolvido ao estoque");
  escrever(
    "descricaoSituacaoEstoque",
    "Os produtos continuam descontados do estoque.",
  );

  mostrar(acoesReintegracao);
  mostrar(btnReintegrarEstoque);
}

// ==========================================
// ABRIR DETALHES DO PEDIDO
// ==========================================

function abrirDetalhesPedido(pedido) {
  if (!detalhesPedido) {
    console.error('Não foi encontrado id="detalhesPedido" no pedidos.html.');
    alert("A seção de detalhes do pedido não foi encontrada no HTML.");
    return;
  }

  pedidoSelecionado = pedido;

  atualizarSituacaoEstoque(pedido);
  carregarHistoricoPedido(pedido.id, pedido.loja);

  escrever("numeroPedidoDetalhes", pedido.numero || "Pedido");
  escrever("detalheCliente", pedido.clienteNome || "—");
  escrever("detalheEmail", pedido.clienteEmail || "—");
  escrever("detalheLoja", obterNomeLoja(pedido.loja));
  escrever("detalhePagamento", pedido.statusPagamento || "—");
  escrever("detalheSubtotal", formatarValor(pedido.subtotal));
  escrever("detalheFrete", formatarValor(pedido.frete));
  escrever("detalheTotal", formatarValor(pedido.total));

  if (alterarStatusPedido) {
    alterarStatusPedido.value = pedido.status;
    alterarStatusPedido.disabled = pedido.status === "cancelado";
  }

  // ITENS
  if (tabelaItensPedido) {
    tabelaItensPedido.innerHTML = "";

    if (Array.isArray(pedido.itens) && pedido.itens.length > 0) {
      pedido.itens.forEach((item) => {
        const linha = document.createElement("tr");

        adicionarCelula(linha, item.nome || "—");
        adicionarCelula(linha, item.quantidade || 0);
        adicionarCelula(linha, formatarValor(item.precoUnitario));
        adicionarCelula(linha, formatarValor(item.subtotal));

        tabelaItensPedido.appendChild(linha);
      });
    } else {
      tabelaItensPedido.innerHTML =
        '<tr><td colspan="4" class="sem-dados">Nenhum item encontrado.</td></tr>';
    }
  }

  // ENDEREÇO
  const endereco = pedido.endereco || {};

  escrever("detalheCep", endereco.cep || "—");
  escrever("detalheRua", endereco.rua || "—");
  escrever("detalheNumeroEndereco", endereco.numero || "—");
  escrever("detalheComplemento", endereco.complemento || "—");
  escrever("detalheBairro", endereco.bairro || "—");
  escrever("detalheCidade", endereco.cidade || "—");
  escrever("detalheEstado", endereco.estado || "—");

  ocultar(formNovoPedido);
  mostrar(detalhesPedido);

  detalhesPedido.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

tabelaPedidos?.addEventListener("click", (evento) => {
  const botao = evento.target.closest(".btn-ver-pedido");
  if (!botao) return;

  const pedido = pedidos.find((p) => p.id === botao.dataset.id);
  if (!pedido) return;

  abrirDetalhesPedido(pedido);
});

btnFecharPedido?.addEventListener("click", () => {
  ocultar(detalhesPedido);
});

// ==========================================
// AUXILIAR DE MOVIMENTAÇÃO DE ESTOQUE
// ==========================================

// Esta função é usada somente dentro de uma
// transação Firestore, após todas as leituras.

function registrarMovimentacoes(
  transacao,
  produtos,
  dadosPedido,
  idPedido,
  tipo,
  origem,
) {
  for (const produto of produtos) {
    const estoqueNovo =
      tipo === "entrada"
        ? produto.estoqueAtual + produto.quantidade
        : produto.estoqueAtual - produto.quantidade;

    transacao.update(produto.referenciaProduto, {
      estoque: estoqueNovo,
    });

    const referenciaMovimentacao = doc(collection(db, "movimentacoesEstoque"));

    transacao.set(referenciaMovimentacao, {
      produtoId: produto.produtoId,
      produtoNome: produto.nome,
      loja: dadosPedido.loja,
      tipo,
      quantidade: produto.quantidade,
      estoqueAnterior: produto.estoqueAtual,
      estoqueNovo,
      origem,
      pedidoId: idPedido,
      pedidoNumero: dadosPedido.numero || "",
      criadoEm: serverTimestamp(),
    });
  }
}

// ==========================================
// VALIDAR PRODUTOS NA TRANSAÇÃO
// ==========================================

async function lerProdutosDaTransacao(transacao, dadosPedido, tipo) {
  const itens = dadosPedido.itens;

  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error("O pedido não possui produtos válidos.");
  }

  const produtos = [];
  const idsEncontrados = new Set();

  for (const item of itens) {
    if (!item.produtoId || idsEncontrados.has(item.produtoId)) {
      throw new Error("O pedido contém produtos inválidos ou duplicados.");
    }

    idsEncontrados.add(item.produtoId);

    const referenciaProduto = doc(db, "produtos", item.produtoId);

    const snapshot = await transacao.get(referenciaProduto);

    if (!snapshot.exists()) {
      throw new Error(
        `Produto "${item.nome || item.produtoId}" não encontrado.`,
      );
    }

    const produto = snapshot.data();
    const quantidade = Number(item.quantidade);
    const estoqueAtual = Number(produto.estoque);

    if (produto.loja !== dadosPedido.loja) {
      throw new Error(`O produto "${item.nome}" pertence a outra loja.`);
    }

    if (
      !Number.isInteger(quantidade) ||
      quantidade <= 0 ||
      !Number.isInteger(estoqueAtual) ||
      estoqueAtual < 0
    ) {
      throw new Error(`Dados de estoque inválidos para "${item.nome}".`);
    }

    if (tipo === "saida" && estoqueAtual < quantidade) {
      throw new Error(`Estoque insuficiente para "${item.nome}".`);
    }

    produtos.push({
      referenciaProduto,
      produtoId: item.produtoId,
      nome: item.nome || produto.nome,
      quantidade,
      estoqueAtual,
    });
  }

  return produtos;
}

// ==========================================
// REINTEGRAR ESTOQUE DE PEDIDO CANCELADO
// ==========================================

btnReintegrarEstoque?.addEventListener("click", async () => {
  const pedido = pedidoSelecionado;

  if (!pedido || btnReintegrarEstoque.disabled) return;

  if (
    pedido.status !== "cancelado" ||
    pedido.estoqueBaixado !== true ||
    pedido.estoqueDevolvido === true
  ) {
    alert("Este pedido não possui estoque pendente de reintegração.");
    return;
  }

  const confirmar = confirm(
    "Deseja reintegrar os produtos ao estoque?\n\n" +
      "As quantidades serão adicionadas novamente ao estoque e " +
      "a movimentação será registrada no histórico.\n\n" +
      "O pedido continuará cancelado.",
  );

  if (!confirmar) return;

  const idPedido = pedido.id;
  const referenciaPedido = doc(db, "pedidos", idPedido);

  btnReintegrarEstoque.disabled = true;

  try {
    await runTransaction(db, async (transacao) => {
      const snapshot = await transacao.get(referenciaPedido);

      if (!snapshot.exists()) {
        throw new Error("Pedido não encontrado.");
      }

      const dados = snapshot.data();

      if (
        dados.status !== "cancelado" ||
        dados.estoqueBaixado !== true ||
        dados.estoqueDevolvido === true
      ) {
        throw new Error("Este pedido não está elegível para reintegração.");
      }

      const produtos = await lerProdutosDaTransacao(
        transacao,
        dados,
        "entrada",
      );

      registrarMovimentacoes(
        transacao,
        produtos,
        dados,
        idPedido,
        "entrada",
        "reintegracao_pedido_cancelado",
      );

      transacao.update(referenciaPedido, {
        estoqueDevolvido: true,
        devolucaoEstoqueCancelamento: "devolvido",
        estoqueReintegradoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });

      registrarHistoricoPedido(
        transacao,
        idPedido,
        dados.loja,
        "estoque_reintegrado",
        "Produtos reintegrados ao estoque após o cancelamento do pedido.",
      );
    });

    await carregarPedidos();

    if (pedidoSelecionado?.id === idPedido) {
      const atualizado = pedidos.find((p) => p.id === idPedido);

      if (atualizado) {
        pedidoSelecionado = atualizado;
        atualizarSituacaoEstoque(atualizado);
      }
    }

    alert("Produtos reintegrados ao estoque com sucesso!");
  } catch (erro) {
    console.error("Erro ao reintegrar estoque:", erro);
    alert(erro.message || "Não foi possível reintegrar o estoque.");
  } finally {
    btnReintegrarEstoque.disabled = false;
  }
});

// ==========================================
// ALTERAR STATUS DO PEDIDO
// ==========================================

alterarStatusPedido?.addEventListener("change", async () => {
  if (!pedidoSelecionado) return;

  const pedido = pedidoSelecionado;
  const idPedido = pedido.id;
  const novoStatus = alterarStatusPedido.value;
  const statusAnterior = pedido.status;

  if (novoStatus === statusAnterior) return;

  if (statusAnterior === "cancelado") {
    alert("Um pedido cancelado não pode ser reativado.");
    alterarStatusPedido.value = statusAnterior;
    return;
  }

  let devolverAoEstoque = false;

  if (novoStatus === "cancelado") {
    const confirmarCancelamento = confirm(
      "Tem certeza que deseja cancelar este pedido?\n\n" +
        "O pedido será marcado como CANCELADO.\n\n" +
        "Atenção: o cancelamento não realiza reembolso financeiro.",
    );

    if (!confirmarCancelamento) {
      alterarStatusPedido.value = statusAnterior;
      return;
    }

    if (pedido.estoqueBaixado === true) {
      devolverAoEstoque = confirm(
        "Deseja devolver os produtos ao estoque?\n\n" +
          "OK = Sim, devolver os produtos.\n" +
          "Cancelar = Não devolver os produtos.\n\n" +
          "O pedido será cancelado em ambas as opções.",
      );
    }
  }

  const referenciaPedido = doc(db, "pedidos", idPedido);
  alterarStatusPedido.disabled = true;

  try {
    await runTransaction(db, async (transacao) => {
      const snapshot = await transacao.get(referenciaPedido);

      if (!snapshot.exists()) {
        throw new Error("Pedido não encontrado no Firestore.");
      }

      const dados = snapshot.data();

      if (dados.status === "cancelado") {
        throw new Error(
          "Este pedido já está cancelado e não pode ser reativado.",
        );
      }

      // CANCELAMENTO
      if (novoStatus === "cancelado") {
        const deveDevolver =
          devolverAoEstoque &&
          dados.estoqueBaixado === true &&
          dados.estoqueDevolvido !== true;

        let produtos = [];

        if (deveDevolver) {
          produtos = await lerProdutosDaTransacao(transacao, dados, "entrada");
        }

        if (deveDevolver) {
          registrarMovimentacoes(
            transacao,
            produtos,
            dados,
            idPedido,
            "entrada",
            "cancelamento_pedido",
          );
        }

        transacao.update(referenciaPedido, {
          status: "cancelado",
          estoqueDevolvido: deveDevolver,
          devolucaoEstoqueCancelamento: deveDevolver
            ? "devolvido"
            : "nao_devolvido",
          atualizadoEm: serverTimestamp(),
        });

        registrarHistoricoPedido(
          transacao,
          idPedido,
          dados.loja,
          "pedido_cancelado",
          dados.estoqueBaixado !== true
            ? "Pedido cancelado. Não houve baixa de estoque."
            : deveDevolver
              ? "Pedido cancelado. Produtos devolvidos ao estoque."
              : "Pedido cancelado. Produtos não devolvidos ao estoque.",
        );

        return;
      }

      // CONFIRMAÇÃO DE PAGAMENTO
      if (novoStatus === "pago" && dados.estoqueBaixado !== true) {
        const produtos = await lerProdutosDaTransacao(
          transacao,
          dados,
          "saida",
        );

        registrarMovimentacoes(
          transacao,
          produtos,
          dados,
          idPedido,
          "saida",
          "pedido",
        );
      }

      const atualizacao = {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
      };

      if (novoStatus === "pago") {
        atualizacao.statusPagamento = "Aprovado";
        atualizacao.estoqueBaixado = true;

        if (
          dados.statusPagamento !== "Aprovado" &&
          !dados.pagamentoAprovadoEm
        ) {
          atualizacao.pagamentoAprovadoEm = serverTimestamp();
        }
      }
      transacao.update(referenciaPedido, atualizacao);

      registrarHistoricoPedido(
        transacao,
        idPedido,
        dados.loja,
        novoStatus === "pago" ? "pagamento_aprovado" : "status_alterado",
        `Status alterado de ${obterNomeStatus(dados.status)} para ${obterNomeStatus(novoStatus)}.`,
      );
    });

    await carregarPedidos();

    const atualizado = pedidos.find((p) => p.id === idPedido);

    if (pedidoSelecionado?.id === idPedido && atualizado) {
      pedidoSelecionado = atualizado;
      atualizarSituacaoEstoque(atualizado);

      if (alterarStatusPedido) {
        alterarStatusPedido.value = atualizado.status;
      }

      escrever("detalhePagamento", atualizado.statusPagamento || "—");
    }

    alert("Status do pedido atualizado com sucesso!");
  } catch (erro) {
    console.error("Erro ao atualizar pedido:", erro);

    if (pedidoSelecionado?.id === idPedido) {
      alterarStatusPedido.value = statusAnterior;
    }

    alert(erro.message || "Não foi possível atualizar o pedido.");
  } finally {
    if (pedidoSelecionado?.id === idPedido) {
      alterarStatusPedido.disabled = pedidoSelecionado.status === "cancelado";
    }
  }
});

// ==========================================
// FORMULÁRIO DE NOVO PEDIDO
// ==========================================

function abrirFormularioNovoPedido() {
  ocultar(detalhesPedido);
  mostrar(formNovoPedido);

  formNovoPedido?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function fecharFormularioNovoPedido() {
  ocultar(formNovoPedido);
}

btnNovoPedido?.addEventListener("click", abrirFormularioNovoPedido);
btnFecharNovoPedido?.addEventListener("click", fecharFormularioNovoPedido);
btnCancelarNovoPedido?.addEventListener("click", fecharFormularioNovoPedido);

// ==========================================
// CARREGAR PRODUTOS PARA PEDIDO MANUAL
// ==========================================

async function carregarProdutosPedido() {
  const loja = pedidoLoja?.value;

  produtosPedido = [];
  itensPedidoManual = [];
  atualizarTabelaNovoPedido();

  if (!pedidoProduto) return;

  pedidoProduto.innerHTML = '<option value="">Selecione um produto</option>';

  if (!loja) {
    pedidoProduto.innerHTML =
      '<option value="">Selecione uma loja primeiro</option>';
    return;
  }

  pedidoProduto.disabled = true;

  try {
    const consulta = query(
      collection(db, "produtos"),
      where("loja", "==", loja),
    );

    const resultado = await getDocs(consulta);

    resultado.forEach((documento) => {
      produtosPedido.push({
        id: documento.id,
        ...documento.data(),
      });
    });

    produtosPedido.forEach((produto) => {
      const opcao = document.createElement("option");

      opcao.value = produto.id;
      opcao.textContent =
        `${produto.nome} — ${formatarValor(produto.preco)} ` +
        `(${Number(produto.estoque || 0)} em estoque)`;

      pedidoProduto.appendChild(opcao);
    });

    if (produtosPedido.length === 0) {
      pedidoProduto.innerHTML =
        '<option value="">Nenhum produto cadastrado</option>';
    }
  } catch (erro) {
    console.error("Erro ao carregar produtos:", erro);

    pedidoProduto.innerHTML =
      '<option value="">Erro ao carregar produtos</option>';
  } finally {
    pedidoProduto.disabled = false;
  }
}

pedidoLoja?.addEventListener("change", carregarProdutosPedido);

// ==========================================
// ATUALIZAR ITENS DO NOVO PEDIDO
// ==========================================

function atualizarTabelaNovoPedido() {
  if (!tabelaItensNovoPedido) return;

  tabelaItensNovoPedido.innerHTML = "";

  let subtotalPedido = 0;

  if (itensPedidoManual.length === 0) {
    tabelaItensNovoPedido.innerHTML =
      '<tr><td colspan="5" class="sem-dados">Nenhum produto adicionado.</td></tr>';
  }

  itensPedidoManual.forEach((item, indice) => {
    const subtotal = item.precoUnitario * item.quantidade;
    subtotalPedido += subtotal;

    const linha = document.createElement("tr");

    adicionarCelula(linha, item.nome);
    adicionarCelula(linha, item.quantidade);
    adicionarCelula(linha, formatarValor(item.precoUnitario));
    adicionarCelula(linha, formatarValor(subtotal));

    const celulaAcoes = document.createElement("td");
    const botaoRemover = document.createElement("button");

    botaoRemover.type = "button";
    botaoRemover.className = "btn-excluir";
    botaoRemover.textContent = "Remover";

    botaoRemover.addEventListener("click", () => {
      itensPedidoManual.splice(indice, 1);
      atualizarTabelaNovoPedido();
    });

    celulaAcoes.appendChild(botaoRemover);
    linha.appendChild(celulaAcoes);
    tabelaItensNovoPedido.appendChild(linha);
  });

  const frete = Number(pedidoFrete?.value || 0);

  if (totalNovoPedido) {
    totalNovoPedido.textContent = formatarValor(subtotalPedido + frete);
  }
}

// ==========================================
// ADICIONAR PRODUTO AO PEDIDO
// ==========================================

btnAdicionarItemPedido?.addEventListener("click", () => {
  const produto = produtosPedido.find(
    (item) => item.id === pedidoProduto?.value,
  );

  const quantidade = Number(pedidoQuantidade?.value);

  if (!produto) {
    alert("Selecione um produto.");
    return;
  }

  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    alert("Informe uma quantidade válida.");
    return;
  }

  const estoqueDisponivel = Number(produto.estoque || 0);

  const itemExistente = itensPedidoManual.find(
    (item) => item.produtoId === produto.id,
  );

  const quantidadeAtual = itemExistente?.quantidade || 0;

  if (quantidadeAtual + quantidade > estoqueDisponivel) {
    alert("Quantidade superior ao estoque disponível.");
    return;
  }

  if (itemExistente) {
    itemExistente.quantidade += quantidade;
  } else {
    itensPedidoManual.push({
      produtoId: produto.id,
      nome: produto.nome,
      quantidade,
      precoUnitario: Number(produto.preco || 0),
    });
  }

  atualizarTabelaNovoPedido();

  if (pedidoQuantidade) pedidoQuantidade.value = 1;
});

pedidoFrete?.addEventListener("input", atualizarTabelaNovoPedido);

// ==========================================
// SALVAR NOVO PEDIDO
// ==========================================

$("cadastroPedido")?.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const botaoSalvar = $("btnSalvarNovoPedido");

  if (!botaoSalvar || botaoSalvar.disabled) return;

  const loja = pedidoLoja?.value;
  const clienteNome = $("pedidoClienteNome")?.value.trim() || "";
  const clienteEmail = $("pedidoClienteEmail")?.value.trim() || "";
  const clienteTelefone = $("pedidoClienteTelefone")?.value.trim() || "";
  const origem = $("pedidoOrigem")?.value;
  const formaPagamento = $("pedidoFormaPagamento")?.value;
  const status = $("pedidoStatusInicial")?.value;
  const frete = Number(pedidoFrete?.value);

  // ==========================================
  // VALIDAÇÕES
  // ==========================================

  if (!["closet", "3d"].includes(loja)) {
    alert("Selecione uma loja válida.");
    return;
  }

  if (!clienteNome) {
    alert("Informe o nome do cliente.");
    return;
  }

  if (!origem || !formaPagamento) {
    alert("Informe a origem da venda e a forma de pagamento.");
    return;
  }

  if (!["aguardando_pagamento", "pago"].includes(status)) {
    alert("Selecione um status válido.");
    return;
  }

  if (!Number.isFinite(frete) || frete < 0) {
    alert("Informe um valor de frete válido.");
    return;
  }

  if (itensPedidoManual.length === 0) {
    alert("Adicione pelo menos um produto ao pedido.");
    return;
  }

  const itensSelecionados = itensPedidoManual.map((item) => ({
    produtoId: item.produtoId,
    quantidade: Number(item.quantidade),
  }));

  if (
    itensSelecionados.some(
      (item) => !Number.isInteger(item.quantidade) || item.quantidade <= 0,
    )
  ) {
    alert("Há quantidades inválidas no pedido.");
    return;
  }

  const ids = itensSelecionados.map((item) => item.produtoId);

  if (new Set(ids).size !== ids.length) {
    alert("Existem produtos duplicados no pedido.");
    return;
  }

  // ==========================================
  // REFERÊNCIAS E IDENTIFICAÇÃO
  // ==========================================

  const referenciaPedido = doc(collection(db, "pedidos"));

  const numeroPedido = `MAN-${referenciaPedido.id.slice(0, 12).toUpperCase()}`;

  const freteArredondado = Math.round(frete * 100) / 100;

  const emailNormalizado = normalizarEmail(clienteEmail);
  const telefoneNormalizado = normalizarTelefone(clienteTelefone);

  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando...";

  try {
    // ==========================================
    // 1. LOCALIZAR CLIENTES EXISTENTES
    // ==========================================

    const clientesEncontrados = await buscarClientesExistentes(
      clienteEmail,
      clienteTelefone,
    );

    let clienteSelecionado = null;

    if (clientesEncontrados.length === 1) {
      const encontrado = clientesEncontrados[0];

      const confirmar = confirm(
        "Encontramos um cliente cadastrado:\n\n" +
          `Nome: ${encontrado.nome || "—"}\n` +
          `E-mail: ${encontrado.email || "—"}\n` +
          `Telefone: ${encontrado.telefone || "—"}\n\n` +
          "Confira se é realmente a mesma pessoa.\n\n" +
          "OK = Vincular o pedido a esse cliente.\n" +
          "Cancelar = Criar um novo cadastro.",
      );

      if (confirmar) {
        clienteSelecionado = encontrado;
      }
    }

    if (clientesEncontrados.length > 1) {
      const opcoes = clientesEncontrados
        .map((cliente, indice) => {
          return (
            `${indice + 1} - ${cliente.nome || "—"}\n` +
            `E-mail: ${cliente.email || "—"}\n` +
            `Telefone: ${cliente.telefone || "—"}`
          );
        })
        .join("\n\n");

      const resposta = prompt(
        "Encontramos mais de um cadastro correspondente.\n\n" +
          opcoes +
          "\n\nDigite o número do cliente correto.\n" +
          "Digite 0 para criar um novo cadastro.\n" +
          "Clique em Cancelar para interromper a venda.",
      );

      if (resposta === null) {
        return;
      }

      const escolha = Number(resposta.trim());

      if (
        !Number.isInteger(escolha) ||
        escolha < 0 ||
        escolha > clientesEncontrados.length
      ) {
        throw new Error("Seleção de cliente inválida.");
      }

      if (escolha > 0) {
        clienteSelecionado = clientesEncontrados[escolha - 1];
      }
    }

    // ==========================================
    // 2. DEFINIR O CADASTRO DO CLIENTE
    // ==========================================

    const novoCliente = clienteSelecionado === null;

    const referenciaCliente = novoCliente
      ? doc(collection(db, "clientes"))
      : doc(db, "clientes", clienteSelecionado.id);

    const clienteId = referenciaCliente.id;

    // ==========================================
    // 3. TRANSAÇÃO DO PEDIDO
    // ==========================================

    await runTransaction(db, async (transacao) => {
      const produtosValidados = [];

      // Todas as leituras devem acontecer
      // antes das escritas da transação.

      if (!novoCliente) {
        const cadastroExistente = await transacao.get(referenciaCliente);

        if (!cadastroExistente.exists()) {
          throw new Error(
            "O cadastro selecionado não existe mais. Tente novamente.",
          );
        }
      }

      for (const item of itensSelecionados) {
        const referenciaProduto = doc(db, "produtos", item.produtoId);

        const snapshot = await transacao.get(referenciaProduto);

        if (!snapshot.exists()) {
          throw new Error("Um dos produtos não foi encontrado.");
        }

        const produto = snapshot.data();

        if (produto.loja !== loja) {
          throw new Error("Um produto não pertence à loja selecionada.");
        }

        const estoqueAtual = Number(produto.estoque);
        const precoUnitario = Number(produto.preco);

        if (
          !Number.isInteger(estoqueAtual) ||
          estoqueAtual < 0 ||
          !Number.isFinite(precoUnitario) ||
          precoUnitario < 0
        ) {
          throw new Error(`Dados inválidos no produto "${produto.nome}".`);
        }

        if (estoqueAtual < item.quantidade) {
          throw new Error(`Estoque insuficiente para "${produto.nome}".`);
        }

        produtosValidados.push({
          referenciaProduto,
          produtoId: item.produtoId,
          nome: produto.nome,
          quantidade: item.quantidade,
          precoUnitario,
          estoqueAtual,
        });
      }

      // ==========================================
      // 4. CALCULAR VALORES
      // ==========================================

      const itens = produtosValidados.map((produto) => {
        const subtotal =
          Math.round(produto.precoUnitario * produto.quantidade * 100) / 100;

        return {
          produtoId: produto.produtoId,
          nome: produto.nome,
          quantidade: produto.quantidade,
          precoUnitario: produto.precoUnitario,
          subtotal,
        };
      });

      const subtotal =
        Math.round(
          itens.reduce((soma, item) => soma + item.subtotal, 0) * 100,
        ) / 100;

      const total = Math.round((subtotal + freteArredondado) * 100) / 100;

      // ==========================================
      // 5. CRIAR CADASTRO, SE NECESSÁRIO
      // ==========================================

      if (novoCliente) {
        transacao.set(referenciaCliente, {
          nome: clienteNome,
          email: clienteEmail,
          telefone: clienteTelefone,
          emailNormalizado,
          telefoneNormalizado,
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
        });
      }

      // ==========================================
      // 6. SALVAR O PEDIDO
      // ==========================================

      transacao.set(referenciaPedido, {
        numero: numeroPedido,
        loja,
        origem: "manual",
        canalVenda: origem,

        clienteId,
        clienteNome,
        clienteEmail,
        clienteTelefone,

        formaPagamento,
        statusPagamento: status === "pago" ? "Aprovado" : "Pendente",

        status,
        itens,
        subtotal,
        frete: freteArredondado,
        total,

        estoqueBaixado: status === "pago",
        endereco: {},

        criadoEm: serverTimestamp(),

        ...(status === "pago"
          ? { pagamentoAprovadoEm: serverTimestamp() }
          : {}),

        atualizadoEm: serverTimestamp(),
      });

      // ==========================================
      // 7. MOVIMENTAÇÃO DE ESTOQUE
      // ==========================================

      if (status === "pago") {
        registrarMovimentacoes(
          transacao,
          produtosValidados,
          {
            loja,
            numero: numeroPedido,
          },
          referenciaPedido.id,
          "saida",
          "pedido",
        );
      }

      // ==========================================
      // 8. HISTÓRICO DO PEDIDO
      // ==========================================

      registrarHistoricoPedido(
        transacao,
        referenciaPedido.id,
        loja,
        "pedido_criado",
        `Pedido ${numeroPedido} criado manualmente com status ${obterNomeStatus(status)}.`,
      );
    });

    // ==========================================
    // 9. FINALIZAÇÃO
    // ==========================================

    alert(`Pedido ${numeroPedido} cadastrado com sucesso!`);

    $("cadastroPedido").reset();

    itensPedidoManual = [];
    produtosPedido = [];

    atualizarTabelaNovoPedido();

    if (pedidoProduto) {
      pedidoProduto.innerHTML =
        '<option value="">Selecione uma loja primeiro</option>';
    }

    fecharFormularioNovoPedido();

    await carregarPedidos();
  } catch (erro) {
    console.error("Erro ao salvar pedido:", erro);

    alert(erro.message || "Não foi possível salvar o pedido.");
  } finally {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = "Salvar pedido";
  }
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================

carregarPedidos();
