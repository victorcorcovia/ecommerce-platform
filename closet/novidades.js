
import { db } from "./firebase-config.js";
import { buscarProdutoClosetPorId } from "./produtos-firebase.js";
import { doc, getDoc } from "firebase/firestore";

const listaNovidades = document.getElementById("lista-novidades");

function obterImagem(produto) {
  const primeiraImagem = Array.isArray(produto.imagens)
    ? produto.imagens[0]
    : null;

  if (typeof primeiraImagem === "string") {
    return primeiraImagem;
  }

  if (primeiraImagem && typeof primeiraImagem.url === "string") {
    return primeiraImagem.url;
  }

  return "https://placehold.co/350x450?text=Sem+Imagem";
}

function criarCardProduto(produto) {
  const card = document.createElement("div");
  card.className = "produto";

  const imagemContainer = document.createElement("div");
  imagemContainer.className = "produto-imagem";

  const imagem = document.createElement("img");
  imagem.src = obterImagem(produto);
  imagem.alt = produto.nome || "Produto";

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
  link.className = "btn-carrinho";
  link.href = `produto.html?id=${encodeURIComponent(produto.id)}`;
  link.textContent = "Ver produto";

  informacoes.append(nome, preco, link);
  card.append(imagemContainer, informacoes);

  return card;
}

async function carregarNovidades() {
  if (!listaNovidades) return;

  try {
    const referencia = doc(db, "aparenciaLojas", "closet");
    const resultado = await getDoc(referencia);

    const produtosIds = resultado.exists()
      ? resultado.data().novidades?.produtosIds
      : [];

    listaNovidades.replaceChildren();

    if (!Array.isArray(produtosIds) || produtosIds.length === 0) {
      listaNovidades.textContent = "Nenhuma novidade cadastrada no momento.";
      return;
    }

    const produtos = await Promise.all(
      produtosIds.slice(0, 3).map((id) => buscarProdutoClosetPorId(id))
    );

    const produtosDisponiveis = produtos.filter(Boolean);

    if (produtosDisponiveis.length === 0) {
      listaNovidades.textContent = "Nenhuma novidade disponível no momento.";
      return;
    }

    produtosDisponiveis.forEach((produto) => {
      listaNovidades.appendChild(criarCardProduto(produto));
    });
  } catch (erro) {
    console.error("Erro ao carregar novidades:", erro);
    listaNovidades.textContent =
      "Não foi possível carregar as novidades no momento.";
  }
}

carregarNovidades();
