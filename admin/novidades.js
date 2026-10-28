import { db } from "./firebase-config.js";
import { functions } from "./firebase-config.js";
import { httpsCallable } from "firebase/functions";

const salvarNovidadesLoja = httpsCallable(functions, "salvarNovidadesLoja");

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const lojaAparencia = document.getElementById("lojaAparencia");
const listaProdutos = document.getElementById("listaProdutosNovidades");
const botaoSalvarNovidades = document.getElementById("salvarNovidades");

let carregamentoConcluido = false;

async function carregarProdutosNovidades() {
  const loja = lojaAparencia.value;
  carregamentoConcluido = false;
  botaoSalvarNovidades.disabled = true;

  listaProdutos.textContent = "Carregando produtos...";

  try {
    const consulta = query(
      collection(db, "produtos"),
      where("loja", "==", loja),
    );

    const [resultado, documentoAparencia] = await Promise.all([
      getDocs(consulta),
      getDoc(doc(db, "aparenciaLojas", loja)),
    ]);

    const produtosSalvos = documentoAparencia.exists()
      ? documentoAparencia.data().novidades?.produtosIds || []
      : [];

    const idsSalvos = new Set(
      Array.isArray(produtosSalvos) ? produtosSalvos : [],
    );

    // Evita mostrar produtos de outra loja
    if (loja !== lojaAparencia.value) return;

    listaProdutos.replaceChildren();

    carregamentoConcluido = true;
    botaoSalvarNovidades.disabled = false;

    if (resultado.empty) {
      listaProdutos.textContent = "Nenhum produto cadastrado nesta loja.";
      return;
    }

    resultado.forEach((documento) => {
      const produto = documento.data();

      // Card do produto
      const label = document.createElement("label");
      label.className = "produto-novidade-item";

      // Imagem principal
      const imagem = document.createElement("img");
      imagem.className = "produto-novidade-imagem";

      const urlImagem = produto.imagens?.[0]?.url;

      if (typeof urlImagem === "string" && urlImagem.startsWith("https://")) {
        imagem.src = urlImagem;
      } else {
        imagem.src = "https://placehold.co/80x100?text=Sem+foto";
      }

      imagem.alt = produto.nome || "Imagem do produto";
      imagem.loading = "lazy";

      // Informações do produto
      const informacoes = document.createElement("div");
      informacoes.className = "produto-novidade-info";

      const nome = document.createElement("span");
      nome.className = "produto-novidade-nome";
      nome.textContent = produto.nome || "Produto sem nome";

      const preco = document.createElement("span");
      preco.className = "produto-novidade-preco";

      preco.textContent = Number(produto.preco || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      // Nome da loja
      const nomeLoja = document.createElement("span");
      nomeLoja.className = "produto-novidade-loja";

      nomeLoja.textContent =
        produto.loja === "closet" ? "Lolly Closet" : "Lolly Decor 3D";

      informacoes.append(nome, preco, nomeLoja);

      // Checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = documento.id;
      checkbox.name = "produtoNovidade";
      checkbox.checked = idsSalvos.has(documento.id);
      checkbox.addEventListener("change", () => {
        const selecionados = listaProdutos.querySelectorAll(
          'input[name="produtoNovidade"]:checked',
        );

        if (selecionados.length > 3) {
          checkbox.checked = false;
          alert("Você pode selecionar no máximo 3 produtos por loja.");
        }
      });

      // Montar card
      label.append(imagem, informacoes, checkbox);
      listaProdutos.appendChild(label);
    });
  } catch (erro) {
    console.error("Erro ao carregar produtos:", erro);
    listaProdutos.textContent = "Erro ao carregar produtos.";
  }
}

lojaAparencia.addEventListener("change", carregarProdutosNovidades);

carregarProdutosNovidades();

botaoSalvarNovidades.addEventListener("click", async () => {
  if (!carregamentoConcluido) return;

  const loja = lojaAparencia.value;

  const produtosIds = Array.from(
    listaProdutos.querySelectorAll('input[name="produtoNovidade"]:checked'),
  ).map((checkbox) => checkbox.value);

  if (produtosIds.length > 3) {
    alert("Selecione no máximo 3 produtos.");
    return;
  }

  botaoSalvarNovidades.disabled = true;

  try {
    const resultado = await salvarNovidadesLoja({
      loja,
      produtosIds,
    });

    if (resultado.data?.sucesso !== true) {
      throw new Error("O salvamento não foi confirmado.");
    }

    alert("Novidades salvas com sucesso!");
  } catch (erro) {
    console.error("Erro ao salvar Novidades:", erro);
    alert("Não foi possível salvar as Novidades: " + erro.message);
  } finally {
    if (loja === lojaAparencia.value && carregamentoConcluido) {
      botaoSalvarNovidades.disabled = false;
    }
  }
});
