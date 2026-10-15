import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const btnNovoCusto = document.getElementById("btnNovoCusto");
const formularioCusto = document.getElementById("formularioCusto");
const fecharFormularioCusto = document.getElementById("fecharFormularioCusto");
const btnCancelarCusto = document.getElementById("btnCancelarCusto");
const formCusto = document.getElementById("formCusto");

const custoLoja = document.getElementById("custoLoja");
const custoDescricao = document.getElementById("custoDescricao");
const custoCategoria = document.getElementById("custoCategoria");
const custoValor = document.getElementById("custoValor");
const custoData = document.getElementById("custoData");
const custoObservacao = document.getElementById("custoObservacao");
const tabelaCustos = document.getElementById("tabelaCustos");

const filtroLojaCustos = document.getElementById("filtroLojaCustos");
const filtroPeriodoCustos = document.getElementById("filtroPeriodoCustos");
const buscarCusto = document.getElementById("buscarCusto");

const totalCustos = document.getElementById("totalCustos");
const quantidadeCustos = document.getElementById("quantidadeCustos");

function abrirFormularioCusto() {
  custoEmEdicao = null;
  formCusto.reset();

  formularioCusto.style.display = "block";

  formularioCusto.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function fecharFormulario() {
  formularioCusto.style.display = "none";
}

btnNovoCusto.addEventListener("click", abrirFormularioCusto);

fecharFormularioCusto.addEventListener("click", fecharFormulario);

btnCancelarCusto.addEventListener("click", fecharFormulario);

formCusto.addEventListener("submit", async (event) => {
  event.preventDefault();

  const dadosCusto = {
    loja: custoLoja.value,
    descricao: custoDescricao.value.trim(),
    categoria: custoCategoria.value,
    valor: Number(custoValor.value),
    data: custoData.value,
    observacao: custoObservacao.value.trim(),
    atualizadoEm: serverTimestamp(),
  };

  try {
    if (custoEmEdicao) {
      await updateDoc(doc(db, "custos", custoEmEdicao), dadosCusto);

      alert("Custo atualizado com sucesso!");
    } else {
      await addDoc(collection(db, "custos"), {
        ...dadosCusto,
        criadoEm: serverTimestamp(),
      });

      alert("Custo cadastrado com sucesso!");
    }

    custoEmEdicao = null;

    formCusto.reset();
    fecharFormulario();

    await carregarCustos();
  } catch (erro) {
    console.error("Erro ao salvar custo:", erro);

    alert("Não foi possível salvar o custo.");
  }
});

let custos = [];
let custoEmEdicao = null;

async function carregarCustos() {
  try {
    const consultaCloset = query(
      collection(db, "custos"),
      where("loja", "==", "closet"),
    );

    const consultaDecor3D = query(
      collection(db, "custos"),
      where("loja", "==", "3d"),
    );

    const [resultadoCloset, resultadoDecor3D] = await Promise.all([
      getDocs(consultaCloset),
      getDocs(consultaDecor3D),
    ]);

    custos = [];

    resultadoCloset.forEach((documento) => {
      custos.push({
        id: documento.id,
        ...documento.data(),
      });
    });

    resultadoDecor3D.forEach((documento) => {
      custos.push({
        id: documento.id,
        ...documento.data(),
      });
    });

    custos.sort((a, b) => {
      return new Date(b.data) - new Date(a.data);
    });

    renderizarCustos();
  } catch (erro) {
    console.error("Erro ao carregar custos:", erro);
  }
}

function obterCustosFiltrados() {
  const lojaSelecionada = filtroLojaCustos.value;
  const periodoSelecionado = filtroPeriodoCustos.value;
  const busca = buscarCusto.value.trim().toLowerCase();

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return custos.filter((custo) => {
    const correspondeLoja =
      lojaSelecionada === "todas" || custo.loja === lojaSelecionada;

    const textoCusto = `
      ${custo.descricao || ""}
      ${custo.categoria || ""}
      ${custo.observacao || ""}
    `.toLowerCase();

    const correspondeBusca = busca === "" || textoCusto.includes(busca);

    let correspondePeriodo = true;

    if (periodoSelecionado !== "todos" && custo.data) {
      const [ano, mes, dia] = custo.data.split("-").map(Number);

      const dataCusto = new Date(ano, mes - 1, dia);
      dataCusto.setHours(0, 0, 0, 0);

      if (periodoSelecionado === "hoje") {
        correspondePeriodo = dataCusto.getTime() === hoje.getTime();
      }

      if (periodoSelecionado === "7dias") {
        const inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() - 6);

        correspondePeriodo = dataCusto >= inicio && dataCusto <= hoje;
      }

      if (periodoSelecionado === "30dias") {
        const inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() - 29);

        correspondePeriodo = dataCusto >= inicio && dataCusto <= hoje;
      }

      if (periodoSelecionado === "mes") {
        correspondePeriodo =
          dataCusto.getMonth() === hoje.getMonth() &&
          dataCusto.getFullYear() === hoje.getFullYear();
      }

      if (periodoSelecionado === "ano") {
        correspondePeriodo = dataCusto.getFullYear() === hoje.getFullYear();
      }
    }

    return correspondeLoja && correspondeBusca && correspondePeriodo;
  });
}

function atualizarResumoCustos(custosFiltrados) {
  const valorTotal = custosFiltrados.reduce(
    (total, custo) => total + Number(custo.valor || 0),
    0,
  );

  totalCustos.textContent = formatarValor(valorTotal);
  quantidadeCustos.textContent = custosFiltrados.length;
}

function renderizarCustos() {
  const custosFiltrados = obterCustosFiltrados();

  tabelaCustos.innerHTML = "";

  atualizarResumoCustos(custosFiltrados);

  if (custosFiltrados.length === 0) {
    tabelaCustos.innerHTML = `
      <tr>
        <td colspan="7" class="sem-dados">
          Nenhum custo cadastrado.
        </td>
      </tr>
    `;

    return;
  }

  custosFiltrados.forEach((custo) => {
    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${formatarData(custo.data)}</td>
      <td>${obterNomeLoja(custo.loja)}</td>
      <td>${custo.descricao}</td>
      <td>${obterNomeCategoria(custo.categoria)}</td>
      <td>${formatarValor(custo.valor)}</td>
      <td>${custo.observacao || "—"}</td>
      <td>
  <button
    type="button"
    class="btn-editar-custo"
    data-id="${custo.id}"
  >
    Editar
  </button>

  <button
    type="button"
    class="btn-excluir-custo"
    data-id="${custo.id}"
  >
    Excluir
  </button>
</td>
    `;

    tabelaCustos.appendChild(linha);
  });

  document.querySelectorAll(".btn-editar-custo").forEach((botao) => {
    botao.addEventListener("click", () => {
      editarCusto(botao.dataset.id);
    });
  });

  document.querySelectorAll(".btn-excluir-custo").forEach((botao) => {
    botao.addEventListener("click", () => {
      excluirCusto(botao.dataset.id);
    });
  });
}

function obterNomeLoja(loja) {
  if (loja === "closet") return "Closet";
  if (loja === "3d") return "Decor 3D";

  return "—";
}

function obterNomeCategoria(categoria) {
  const categorias = {
    mercadoria: "Produtos / Mercadoria",
    embalagens: "Embalagens",
    frete: "Frete",
    marketing: "Marketing",
    taxas: "Taxas",
    servicos: "Serviços",
    manutencao: "Manutenção",
    outros: "Outros",
  };

  return categorias[categoria] || categoria;
}

function formatarValor(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data) {
  if (!data) return "—";

  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

function editarCusto(id) {
  const custo = custos.find((item) => item.id === id);

  if (!custo) return;

  custoEmEdicao = id;

  custoLoja.value = custo.loja;
  custoDescricao.value = custo.descricao;
  custoCategoria.value = custo.categoria;
  custoValor.value = custo.valor;
  custoData.value = custo.data;
  custoObservacao.value = custo.observacao || "";

  formularioCusto.style.display = "block";

  formularioCusto.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

async function excluirCusto(id) {
  const custo = custos.find((item) => item.id === id);

  if (!custo) return;

  const confirmar = confirm(
    `Deseja realmente excluir o custo "${custo.descricao}"?`,
  );

  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "custos", id));

    await carregarCustos();
  } catch (erro) {
    console.error("Erro ao excluir custo:", erro);

    alert("Não foi possível excluir o custo.");
  }
}

filtroLojaCustos.addEventListener("change", renderizarCustos);

filtroPeriodoCustos.addEventListener("change", renderizarCustos);

buscarCusto.addEventListener("input", renderizarCustos);

carregarCustos();
