import { db } from "./firebase-config.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

const $ = (id) => document.getElementById(id);

const tabelaClientes = $("tabelaClientes");
const filtroLojaClientes = $("filtroLojaClientes");
const buscarCliente = $("buscarCliente");
const detalhesCliente = $("detalhesCliente");
const tabelaPedidosCliente = $("tabelaPedidosCliente");

let clientes = [];
let clientesCadastrados = [];
let clienteSelecionado = null;
let salvandoCliente = false;

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function obterNomeLoja(loja) {
  if (loja === "closet") return "Closet";
  if (loja === "3d") return "Decor 3D";
  return loja || "—";
}

function obterLojasCliente(lojas) {
  if (!lojas?.length) return "—";

  if (lojas.includes("closet") && lojas.includes("3d")) {
    return "Closet e Decor 3D";
  }

  return lojas.map(obterNomeLoja).join(", ");
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

function escrever(id, valor) {
  const elemento = $(id);

  if (elemento) {
    elemento.textContent = String(valor ?? "—");
  }
}

function adicionarCelula(linha, valor) {
  const celula = document.createElement("td");
  celula.textContent = String(valor ?? "—");
  linha.appendChild(celula);
  return celula;
}

function criarBotao(texto, classe, acao) {
  const botao = document.createElement("button");

  botao.type = "button";
  botao.className = classe;
  botao.textContent = texto;
  botao.addEventListener("click", acao);

  return botao;
}

function mostrarMensagemTabela(tabela, mensagem) {
  if (!tabela) return;

  tabela.replaceChildren();

  const linha = document.createElement("tr");
  const celula = adicionarCelula(linha, mensagem);

  celula.colSpan = 7;
  celula.className = "sem-dados";

  tabela.appendChild(linha);
}

// ==========================================
// CARREGAR CLIENTES E PEDIDOS
// ==========================================

async function carregarClientes() {
  try {
    const colecaoPedidos = collection(db, "pedidos");

    const [resultadoClientes, resultadoCloset, resultadoDecor3D] =
      await Promise.all([
        getDocs(collection(db, "clientes")),
        getDocs(query(colecaoPedidos, where("loja", "==", "closet"))),
        getDocs(query(colecaoPedidos, where("loja", "==", "3d"))),
      ]);

    clientesCadastrados = resultadoClientes.docs.map((documento) => ({
      ...documento.data(),
      id: documento.id,
    }));

    const pedidos = [...resultadoCloset.docs, ...resultadoDecor3D.docs].map(
      (documento) => ({
        ...documento.data(),
        id: documento.id,
      }),
    );

    montarClientes(pedidos);
    renderizarClientes();
  } catch (erro) {
    console.error("Erro ao carregar clientes:", erro);

    mostrarMensagemTabela(tabelaClientes, "Erro ao carregar os clientes.");
  }
}

// ==========================================
// AGRUPAR CLIENTES
// ==========================================

function montarClientes(pedidos) {
  const mapaClientes = new Map();

  clientesCadastrados.forEach((cadastro) => {
    mapaClientes.set(`cadastro:${cadastro.id}`, {
      id: cadastro.id,
      clienteId: cadastro.id,
      cadastrado: true,
      nome: cadastro.nome || "—",
      email: cadastro.email || "—",
      telefone: cadastro.telefone || "",
      lojas: [],
      quantidadePedidos: 0,
      totalGasto: 0,
      ultimoPedido: null,
      ultimoEndereco: null,
      pedidos: [],
    });
  });

  pedidos.forEach((pedido) => {
    const email = normalizarEmail(pedido.clienteEmail);
    const clienteId = String(pedido.clienteId || "").trim();

    let chave;

    if (clienteId) {
      chave = `cadastro:${clienteId}`;
    } else if (email) {
      chave = `email:${email}`;
    } else {
      chave = `pedido:${pedido.id}`;
    }

    if (!mapaClientes.has(chave)) {
      mapaClientes.set(chave, {
        id: clienteId || null,
        clienteId: clienteId || null,
        cadastrado: false,
        nome: pedido.clienteNome || "—",
        email: pedido.clienteEmail || "—",
        telefone: pedido.clienteTelefone || "",
        lojas: [],
        quantidadePedidos: 0,
        totalGasto: 0,
        ultimoPedido: null,
        ultimoEndereco: null,
        pedidos: [],
      });
    }

    const cliente = mapaClientes.get(chave);

    if (!cliente.nome || cliente.nome === "—") {
      cliente.nome = pedido.clienteNome || "—";
    }

    if (!cliente.email || cliente.email === "—") {
      cliente.email = pedido.clienteEmail || "—";
    }

    if (!cliente.telefone) {
      cliente.telefone = pedido.clienteTelefone || "";
    }

    if (pedido.loja && !cliente.lojas.includes(pedido.loja)) {
      cliente.lojas.push(pedido.loja);
    }

    cliente.pedidos.push(pedido);
    cliente.quantidadePedidos += 1;

    if (
      pedido.status !== "cancelado" &&
      pedido.statusPagamento === "Aprovado"
    ) {
      cliente.totalGasto += Number(pedido.total || 0);
    }

    const dataPedido = pedido.criadoEm?.toMillis?.() || 0;

    const dataAnterior = cliente.ultimoPedido?.toMillis?.() || 0;

    if (dataPedido > dataAnterior) {
      cliente.ultimoPedido = pedido.criadoEm;
      cliente.ultimoEndereco = pedido.endereco || null;
    }
  });

  clientes = Array.from(mapaClientes.values());

  clientes.sort((a, b) => {
    const dataA = a.ultimoPedido?.toMillis?.() || 0;
    const dataB = b.ultimoPedido?.toMillis?.() || 0;

    return dataB - dataA;
  });
}

// ==========================================
// RENDERIZAR LISTA
// ==========================================

function renderizarClientes() {
  if (!tabelaClientes) return;

  const loja = filtroLojaClientes?.value || "todas";
  const busca = String(buscarCliente?.value || "")
    .trim()
    .toLowerCase();

  const filtrados = clientes.filter((cliente) => {
    if (loja !== "todas" && !cliente.lojas.includes(loja)) {
      return false;
    }

    if (!busca) return true;

    return (
      String(cliente.nome).toLowerCase().includes(busca) ||
      String(cliente.email).toLowerCase().includes(busca) ||
      String(cliente.telefone).toLowerCase().includes(busca)
    );
  });

  tabelaClientes.replaceChildren();

  if (!filtrados.length) {
    mostrarMensagemTabela(tabelaClientes, "Nenhum cliente encontrado.");
    return;
  }

  filtrados.forEach((cliente) => {
    const linha = document.createElement("tr");

    adicionarCelula(linha, cliente.nome);
    adicionarCelula(linha, cliente.email);
    adicionarCelula(linha, obterLojasCliente(cliente.lojas));
    adicionarCelula(linha, cliente.quantidadePedidos);
    adicionarCelula(linha, formatarValor(cliente.totalGasto));
    adicionarCelula(linha, formatarData(cliente.ultimoPedido));

    const celulaAcoes = document.createElement("td");

    celulaAcoes.appendChild(
      criarBotao("Ver cliente", "btn-editar btn-ver-cliente", () =>
        abrirDetalhesCliente(cliente),
      ),
    );

    linha.appendChild(celulaAcoes);
    tabelaClientes.appendChild(linha);
  });
}

// ==========================================
// HISTÓRICO: EXPANDIR ITENS
// ==========================================

function mostrarItensPedido(pedido, linhaPedido) {
  const botao = linhaPedido.querySelector(".btn-ver-itens");

  const proximaLinha = linhaPedido.nextElementSibling;

  if (proximaLinha?.classList.contains("linha-itens-pedido")) {
    proximaLinha.remove();
    if (botao) botao.textContent = "Ver itens";
    return;
  }

  document.querySelectorAll(".linha-itens-pedido").forEach((linha) => {
    const anterior = linha.previousElementSibling;
    const botaoAnterior = anterior?.querySelector(".btn-ver-itens");

    if (botaoAnterior) {
      botaoAnterior.textContent = "Ver itens";
    }

    linha.remove();
  });

  if (botao) botao.textContent = "Fechar itens";

  const linhaItens = document.createElement("tr");
  linhaItens.className = "linha-itens-pedido";

  const celula = document.createElement("td");
  celula.colSpan = 7;

  const container = document.createElement("div");
  container.className = "itens-pedido-cliente";

  const titulo = document.createElement("strong");
  titulo.textContent = `Itens do ${pedido.numero || "pedido"}`;

  container.appendChild(titulo);

  const itens = Array.isArray(pedido.itens) ? pedido.itens : [];

  if (!itens.length) {
    const mensagem = document.createElement("p");
    mensagem.textContent = "Nenhum item encontrado neste pedido.";

    container.appendChild(mensagem);
  } else {
    const envoltorio = document.createElement("div");
    envoltorio.className = "tabela-container";

    const tabela = document.createElement("table");
    const cabecalho = document.createElement("thead");
    const linhaCabecalho = document.createElement("tr");

    ["Produto", "Quantidade", "Preço unitário", "Subtotal"].forEach(
      (tituloColuna) => {
        const th = document.createElement("th");
        th.textContent = tituloColuna;
        linhaCabecalho.appendChild(th);
      },
    );

    cabecalho.appendChild(linhaCabecalho);
    tabela.appendChild(cabecalho);

    const corpo = document.createElement("tbody");

    itens.forEach((item) => {
      const linha = document.createElement("tr");

      adicionarCelula(linha, item.nome || "—");
      adicionarCelula(linha, item.quantidade || 0);
      adicionarCelula(linha, formatarValor(item.precoUnitario));
      adicionarCelula(linha, formatarValor(item.subtotal));

      corpo.appendChild(linha);
    });

    tabela.appendChild(corpo);
    envoltorio.appendChild(tabela);
    container.appendChild(envoltorio);
  }

  celula.appendChild(container);
  linhaItens.appendChild(celula);
  linhaPedido.after(linhaItens);
}

// ==========================================
// DETALHES DO CLIENTE
// ==========================================

function abrirDetalhesCliente(cliente) {
  clienteSelecionado = cliente;

  fecharFormularioEdicao();

  const endereco = cliente.ultimoEndereco || {};

  escrever("nomeClienteDetalhes", cliente.nome);
  escrever("detalheClienteNome", cliente.nome);
  escrever("detalheClienteEmail", cliente.email);
  escrever("detalheClienteTelefone", cliente.telefone || "—");
  escrever("detalheClienteLoja", obterLojasCliente(cliente.lojas));
  escrever("detalheClientePedidos", cliente.quantidadePedidos);
  escrever("detalheClienteTotal", formatarValor(cliente.totalGasto));
  escrever("detalheClienteUltimoPedido", formatarData(cliente.ultimoPedido));

  escrever("detalheClienteCep", endereco.cep || "—");
  escrever("detalheClienteRua", endereco.rua || "—");
  escrever("detalheClienteNumero", endereco.numero || "—");
  escrever("detalheClienteComplemento", endereco.complemento || "—");
  escrever("detalheClienteBairro", endereco.bairro || "—");
  escrever("detalheClienteCidade", endereco.cidade || "—");
  escrever("detalheClienteEstado", endereco.estado || "—");

  const botaoEditar = $("btnEditarCliente");

  if (botaoEditar) {
    botaoEditar.style.display = cliente.cadastrado ? "inline-block" : "none";
  }

  renderizarHistoricoCliente(cliente);

  if (detalhesCliente) {
    detalhesCliente.style.display = "block";

    detalhesCliente.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

// ==========================================
// RENDERIZAR HISTÓRICO
// ==========================================

function renderizarHistoricoCliente(cliente) {
  if (!tabelaPedidosCliente) return;

  const pedidosOrdenados = [...cliente.pedidos].sort((a, b) => {
    const dataA = a.criadoEm?.toMillis?.() || 0;
    const dataB = b.criadoEm?.toMillis?.() || 0;

    return dataB - dataA;
  });

  tabelaPedidosCliente.replaceChildren();

  if (!pedidosOrdenados.length) {
    mostrarMensagemTabela(tabelaPedidosCliente, "Nenhum pedido encontrado.");
    return;
  }

  pedidosOrdenados.forEach((pedido) => {
    const linha = document.createElement("tr");

    adicionarCelula(linha, pedido.numero || "—");
    adicionarCelula(linha, obterNomeLoja(pedido.loja));
    adicionarCelula(linha, formatarData(pedido.criadoEm));
    adicionarCelula(linha, pedido.statusPagamento || "—");
    adicionarCelula(linha, formatarValor(pedido.total));

    const celulaStatus = document.createElement("td");
    const statusVisual = document.createElement("span");

    const statusPermitidos = [
      "aguardando_pagamento",
      "pago",
      "preparando",
      "enviado",
      "concluido",
      "cancelado",
    ];

    const classeStatus = statusPermitidos.includes(pedido.status)
      ? pedido.status
      : "desconhecido";

    statusVisual.className = `status-pedido status-${classeStatus}`;

    statusVisual.textContent = obterNomeStatus(pedido.status);

    celulaStatus.appendChild(statusVisual);
    linha.appendChild(celulaStatus);

    const celulaItens = document.createElement("td");

    celulaItens.appendChild(
      criarBotao("Ver itens", "btn-editar btn-ver-itens", () =>
        mostrarItensPedido(pedido, linha),
      ),
    );

    linha.appendChild(celulaItens);
    tabelaPedidosCliente.appendChild(linha);
  });
}

// ==========================================
// ABRIR / FECHAR EDIÇÃO
// ==========================================

function abrirFormularioEdicao() {
  if (!clienteSelecionado?.cadastrado) {
    alert("Este cliente ainda não possui cadastro no Firestore.");
    return;
  }

  $("editarClienteNome").value =
    clienteSelecionado.nome === "—" ? "" : clienteSelecionado.nome;

  $("editarClienteEmail").value =
    clienteSelecionado.email === "—" ? "" : clienteSelecionado.email;

  $("editarClienteTelefone").value = clienteSelecionado.telefone || "";

  escrever("mensagemEdicaoCliente", "");

  $("formEditarCliente").style.display = "block";

  $("formEditarCliente").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function fecharFormularioEdicao() {
  const formulario = $("formEditarCliente");

  if (formulario) {
    formulario.style.display = "none";
  }

  escrever("mensagemEdicaoCliente", "");
}

// ==========================================
// VALIDAÇÃO DE CADASTROS DUPLICADOS
// ==========================================

async function verificarDuplicidade(
  clienteId,
  emailNormalizado,
  telefoneNormalizado,
) {
  const encontrados = new Map();
  const colecaoClientes = collection(db, "clientes");

  if (emailNormalizado) {
    const resultado = await getDocs(
      query(colecaoClientes, where("emailNormalizado", "==", emailNormalizado)),
    );

    resultado.forEach((documento) => {
      encontrados.set(documento.id, documento.data());
    });
  }

  if (telefoneNormalizado) {
    const resultado = await getDocs(
      query(
        colecaoClientes,
        where("telefoneNormalizado", "==", telefoneNormalizado),
      ),
    );

    resultado.forEach((documento) => {
      encontrados.set(documento.id, documento.data());
    });
  }

  encontrados.delete(clienteId);

  if (encontrados.size > 0) {
    throw new Error(
      "Já existe outro cadastro com esse e-mail ou telefone. " +
        "Verifique os dados antes de salvar.",
    );
  }
}

// ==========================================
// SALVAR EDIÇÃO DO CLIENTE
// ==========================================

$("formEditarCliente")?.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (salvandoCliente) return;

  const cliente = clienteSelecionado;

  if (!cliente?.cadastrado || !cliente.clienteId) {
    alert("Selecione um cliente cadastrado.");
    return;
  }

  const nome = $("editarClienteNome").value.trim();
  const email = $("editarClienteEmail").value.trim();
  const telefone = $("editarClienteTelefone").value.trim();

  const emailNormalizado = normalizarEmail(email);
  const telefoneNormalizado = normalizarTelefone(telefone);

  if (!nome) {
    alert("Informe o nome do cliente.");
    return;
  }

  if (email && !$("editarClienteEmail").checkValidity()) {
    alert("Informe um e-mail válido.");
    return;
  }

  if (
    telefoneNormalizado &&
    (telefoneNormalizado.length < 10 || telefoneNormalizado.length > 13)
  ) {
    alert("Informe um telefone válido.");
    return;
  }

  const botaoSalvar = $("btnSalvarEdicaoCliente");

  salvandoCliente = true;
  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando...";

  escrever("mensagemEdicaoCliente", "Verificando os dados...");

  try {
    await verificarDuplicidade(
      cliente.clienteId,
      emailNormalizado,
      telefoneNormalizado,
    );

    const referenciaCliente = doc(db, "clientes", cliente.clienteId);

    await runTransaction(db, async (transacao) => {
      const snapshot = await transacao.get(referenciaCliente);

      if (!snapshot.exists()) {
        throw new Error("O cadastro não foi encontrado no Firestore.");
      }

      transacao.update(referenciaCliente, {
        nome,
        email,
        telefone,
        emailNormalizado,
        telefoneNormalizado,
        atualizadoEm: serverTimestamp(),
      });
    });

    // Atualizar a listagem e os detalhes
    await carregarClientes();

    const atualizado = clientes.find(
      (item) => item.cadastrado && item.clienteId === cliente.clienteId,
    );

    if (atualizado) {
      abrirDetalhesCliente(atualizado);
    } else {
      fecharFormularioEdicao();
    }

    alert("Cliente atualizado com sucesso!");
  } catch (erro) {
    console.error("Erro ao atualizar cliente:", erro);

    escrever(
      "mensagemEdicaoCliente",
      erro.message || "Não foi possível atualizar o cliente.",
    );
  } finally {
    salvandoCliente = false;
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = "Salvar alterações";
  }
});

// ==========================================
// EVENTOS
// ==========================================

$("btnEditarCliente")?.addEventListener("click", abrirFormularioEdicao);

$("btnCancelarEdicaoCliente")?.addEventListener(
  "click",
  fecharFormularioEdicao,
);

$("fecharDetalhesCliente")?.addEventListener("click", () => {
  fecharFormularioEdicao();

  if (detalhesCliente) {
    detalhesCliente.style.display = "none";
  }

  clienteSelecionado = null;
});

filtroLojaClientes?.addEventListener("change", renderizarClientes);

buscarCliente?.addEventListener("input", renderizarClientes);

// ==========================================
// INICIALIZAÇÃO
// ==========================================

carregarClientes();
