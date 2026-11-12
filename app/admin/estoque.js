import { db } from "./firebase-config.js";

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

const tabelaEstoque = document.getElementById("tabelaEstoque");
const tabelaHistoricoEstoque = document.getElementById( "tabelaHistoricoEstoque",);
const buscarEstoque = document.getElementById("buscarEstoque");
const movimentacaoEstoque = document.getElementById("movimentacaoEstoque");
const produtoMovimentacao = document.getElementById("produtoMovimentacao");
const formMovimentacao = document.getElementById("formMovimentacao");
const tipoMovimentacao = document.getElementById("tipoMovimentacao");
const quantidadeMovimentacao = document.getElementById(
  "quantidadeMovimentacao",
);
const btnCancelarMovimentacao = document.getElementById(
  "btnCancelarMovimentacao",
);

let produtoSelecionado = null;
let produtos = [];

async function carregarEstoque() {
  try {
    produtos = [];

    // Busca os produtos da Closet
    const consultaCloset = query(
      collection(db, "produtos"),
      where("loja", "==", "closet"),
    );

    const resultadoCloset = await getDocs(consultaCloset);

    resultadoCloset.forEach((documento) => {
      produtos.push({
        id: documento.id,
        ...documento.data(),
      });
    });

    renderizarEstoque();
  } catch (erro) {
    console.error("Erro ao carregar estoque:", erro);

    tabelaEstoque.innerHTML = `
      <tr>
        <td colspan="4">Erro ao carregar o estoque.</td>
      </tr>
    `;
  }
}

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[caractere]);
}

function renderizarEstoque() {
  const busca = buscarEstoque.value.toLowerCase().trim();

  let produtosFiltrados = produtos;

  // Buscar pelo nome
  if (busca) {
    produtosFiltrados = produtosFiltrados.filter((produto) =>
      String(produto.nome || "").toLowerCase().includes(busca),
    );
  }

  if (produtosFiltrados.length === 0) {
    tabelaEstoque.innerHTML = `
      <tr>
        <td colspan="4">Nenhum produto encontrado.</td>
      </tr>
    `;

    return;
  }

  tabelaEstoque.innerHTML = "";

  produtosFiltrados.forEach((produto) => {
    const estoqueAtual = Number(produto.estoque) || 0;

    let statusEstoque = "Em estoque";

    if (estoqueAtual === 0) {
      statusEstoque = "Sem estoque";
    } else if (estoqueAtual <= 5) {
      statusEstoque = "Estoque baixo";
    }

    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${escaparHtml(produto.nome)}</td>

      <td>
        ${estoqueAtual}
      </td>

      <td>
        ${statusEstoque}
      </td>

      <td>
        <button
          class="btn-editar btn-movimentar"
          data-id="${produto.id}"
        >
          Movimentar
        </button>
      </td>
    `;

    tabelaEstoque.appendChild(linha);
  });
}

buscarEstoque.addEventListener("input", () => {
  renderizarEstoque();
});

// Abrir formulário de movimentação
tabelaEstoque.addEventListener("click", (evento) => {
  const botao = evento.target.closest(".btn-movimentar");

  if (!botao) return;

  const idProduto = botao.dataset.id;

  produtoSelecionado = produtos.find((produto) => produto.id === idProduto);

  if (!produtoSelecionado) return;

  produtoMovimentacao.textContent = `${produtoSelecionado.nome} — Estoque atual: ${produtoSelecionado.estoque || 0}`;

  tipoMovimentacao.value = "entrada";
  quantidadeMovimentacao.value = "";

  movimentacaoEstoque.style.display = "block";

  movimentacaoEstoque.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

// Cancelar movimentação
btnCancelarMovimentacao.addEventListener("click", () => {
  produtoSelecionado = null;

  formMovimentacao.reset();

  movimentacaoEstoque.style.display = "none";
});

// ==========================================
// CONFIRMAR MOVIMENTAÇÃO DE ESTOQUE
// ==========================================

formMovimentacao.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!produtoSelecionado) return;

  const tipo = tipoMovimentacao.value;
  const quantidade = Number(quantidadeMovimentacao.value);
  const idProduto = produtoSelecionado.id;

  if (
    !Number.isSafeInteger(quantidade) ||
    quantidade <= 0 ||
    !["entrada", "saida"].includes(tipo)
  ) {
    alert("Informe um tipo e uma quantidade válidos.");
    return;
  }

  const botaoSalvar = formMovimentacao.querySelector(
    'button[type="submit"]'
  );

  if (botaoSalvar) botaoSalvar.disabled = true;

  try {
    const referenciaProduto = doc(db, "produtos", idProduto);

    const referenciaMovimentacao = doc(
      collection(db, "movimentacoesEstoque")
    );

    await runTransaction(db, async (transacao) => {
      const documentoProduto = await transacao.get(referenciaProduto);

      if (!documentoProduto.exists()) {
        throw new Error("Produto não encontrado.");
      }

      const produto = documentoProduto.data();

      if (produto.loja !== "closet") {
        throw new Error("Movimentação permitida apenas para produtos da Closet.");
      }
      const estoqueAtual = produto.estoque;

      if (
        !Number.isSafeInteger(estoqueAtual) ||
        estoqueAtual < 0
      ) {
        throw new Error("O estoque atual do produto é inválido.");
      }

      let novoEstoque;

      if (tipo === "entrada") {
        novoEstoque = estoqueAtual + quantidade;
      } else {
        if (quantidade > estoqueAtual) {
          throw new Error(
            "A quantidade de saída é maior que o estoque disponível."
          );
        }

        novoEstoque = estoqueAtual - quantidade;
      }

      if (!Number.isSafeInteger(novoEstoque)) {
        throw new Error("A quantidade resultante é inválida.");
      }

      transacao.update(referenciaProduto, {
        estoque: novoEstoque,
      });

      transacao.set(referenciaMovimentacao, {
        produtoId: idProduto,
        produtoNome: produto.nome,
        loja: produto.loja,
        tipo,
        quantidade,
        estoqueAnterior: estoqueAtual,
        estoqueNovo: novoEstoque,
        criadoEm: serverTimestamp(),
      });
    });

    alert("Estoque atualizado com sucesso!");

    produtoSelecionado = null;
    formMovimentacao.reset();
    movimentacaoEstoque.style.display = "none";

    await carregarEstoque();
    await carregarHistoricoEstoque();

  } catch (erro) {
    console.error("Erro ao atualizar estoque:", erro);

    alert(erro.message || "Não foi possível atualizar o estoque.");

  } finally {
    if (botaoSalvar) botaoSalvar.disabled = false;
  }
});

async function carregarHistoricoEstoque() {
  try {
    const movimentacoes = [];

    // Movimentações da Closet
    const consultaCloset = query(
      collection(db, "movimentacoesEstoque"),
      where("loja", "==", "closet"),
    );

    const resultadoCloset = await getDocs(consultaCloset);

    resultadoCloset.forEach((documento) => {
      movimentacoes.push({
        id: documento.id,
        ...documento.data(),
      });
    });

    // Mais recentes primeiro
    movimentacoes.sort((a, b) => {
      const dataA = a.criadoEm?.toMillis?.() || 0;
      const dataB = b.criadoEm?.toMillis?.() || 0;

      return dataB - dataA;
    });

    if (movimentacoes.length === 0) {
      tabelaHistoricoEstoque.innerHTML = `
        <tr>
          <td colspan="6">Nenhuma movimentação registrada.</td>
        </tr>
      `;

      return;
    }

    tabelaHistoricoEstoque.innerHTML = "";

    movimentacoes.forEach((movimentacao) => {
      let dataFormatada = "—";

      if (movimentacao.criadoEm?.toDate) {
        dataFormatada = movimentacao.criadoEm.toDate().toLocaleString("pt-BR");
      }

      const linha = document.createElement("tr");

      linha.innerHTML = `
        <td>${dataFormatada}</td>

        <td>${escaparHtml(movimentacao.produtoNome || "—")}</td>

        <td>${movimentacao.tipo === "entrada" ? "Entrada" : "Saída"}</td>

        <td>${movimentacao.quantidade}</td>

        <td>${movimentacao.estoqueAnterior}</td>

        <td>${movimentacao.estoqueNovo}</td>
      `;

      tabelaHistoricoEstoque.appendChild(linha);
    });
  } catch (erro) {
    console.error("Erro ao carregar histórico de estoque:", erro);

    tabelaHistoricoEstoque.innerHTML = `
      <tr>
        <td colspan="6">Erro ao carregar o histórico.</td>
      </tr>
    `;
  }
}

carregarEstoque();
carregarHistoricoEstoque();
