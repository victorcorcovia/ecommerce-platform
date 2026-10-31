
import { db } from "./firebase-config.js";
import { buscarProdutoDecor3DPorId } from "./produtos-firebase.js";
import { doc, getDoc } from "firebase/firestore";

const listaNovidades = document.getElementById("lista-novidades");

function obterImagem(produto) {
  const imagem = Array.isArray(produto.imagens)
    ? produto.imagens[0]
    : null;

  if (typeof imagem === "string" && imagem.trim()) {
    return imagem;
  }

  if (imagem && typeof imagem.url === "string") {
    return imagem.url;
  }

  return "https://placehold.co/350x350?text=Sem+Imagem";
}

function criarCard(produto) {
  const card = document.createElement("div");
  card.className = "produto";

  const imagemContainer = document.createElement("div");
  imagemContainer.className = "produto-imagem";

  const imagem = document.createElement("img");
  imagem.src = obterImagem(produto);
  imagem.alt = produto.nome || "Produto";
  imagem.loading = "lazy";
  imagemContainer.appendChild(imagem);

  const informacoes = document.createElement("div");
  informacoes.className = "produto-info";

  const nome = document.createElement("h3");
  nome.textContent = produto.nome || "Produto";

  const preco = document.createElement("p");
  preco.className = "preco";
  preco.textContent = Number(produto.preco).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const link = document.createElement("a");
  link.className = "btn-ver-produto";
  link.href = `produto.html?id=${encodeURIComponent(produto.id)}`;
  link.textContent = "Ver Produto";

  informacoes.append(nome, preco, link);
  card.append(imagemContainer, informacoes);

  return card;
}

async function carregarNovidades() {
  if (!listaNovidades) return;

  try {
    const referencia = doc(db, "aparenciaLojas", "3d");
    const resultado = await getDoc(referencia);

    const produtosIds = resultado.exists()
      ? resultado.data().novidades?.produtosIds
      : [];

    listaNovidades.replaceChildren();

    if (!Array.isArray(produtosIds) || produtosIds.length === 0) {
      listaNovidades.textContent =
        "Nenhuma novidade cadastrada no momento.";
      return;
    }

    const produtos = await Promise.all(
      produtosIds
        .slice(0, 3)
        .map((id) => buscarProdutoDecor3DPorId(id))
    );

    const disponiveis = produtos.filter(Boolean);

    if (disponiveis.length === 0) {
      listaNovidades.textContent =
        "Nenhuma novidade disponível no momento.";
      return;
    }

    disponiveis.forEach((produto) => {
      listaNovidades.appendChild(criarCard(produto));
    });
  } catch (erro) {
    console.error("Erro ao carregar novidades da Decor 3D:", erro);
    listaNovidades.textContent =
      "Não foi possível carregar as novidades no momento.";
  }
}

carregarNovidades();
