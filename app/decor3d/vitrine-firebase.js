import { buscarProdutosDecor3D } from "./produtos-firebase.js";
import { buscarCategoriasDecor3D } from "./categorias-firebase.js";

const listaProdutos = document.querySelector(
  ".pagina-catalogo .lista-produtos"
);

function formatarPreco(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

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
  card.dataset.categoria = produto.categoriaId || "";

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
  preco.textContent = formatarPreco(produto.preco);

  const link = document.createElement("a");
  link.className = "btn-ver-produto";
  link.href = `produto.html?id=${encodeURIComponent(produto.id)}`;
  link.textContent = "Ver Produto";

  informacoes.append(nome, preco, link);
  card.append(imagemContainer, informacoes);

  return card;
}

async function carregarVitrine() {
  if (!listaProdutos) return;

  try {
    const produtos = await buscarProdutosDecor3D();
    const cards = produtos.map(criarCard);

    listaProdutos.replaceChildren(...cards);

    if (cards.length === 0) {
      listaProdutos.textContent =
        "Nenhum produto disponível no momento.";
    }
  } catch (erro) {
    console.error("Erro ao carregar produtos da Decor 3D:", erro);

    listaProdutos.textContent =
      "Não foi possível carregar os produtos no momento.";
  }
}


async function carregarFiltrosCategorias() {
  const container = document.querySelector(".filtros-produtos");

  if (!container || !listaProdutos) return;

  try {
    const categorias = await buscarCategoriasDecor3D();

    const grupos = new Map();

    categorias.forEach((categoria) => {
      const nome = categoria.nome?.trim();

      if (!nome) return;

      const chave = nome.toLocaleLowerCase("pt-BR");

      if (!grupos.has(chave)) {
        grupos.set(chave, {
          nome,
          ids: [],
        });
      }

      grupos.get(chave).ids.push(categoria.id);
    });

    container.replaceChildren();

    function criarBotao(nome, ids = []) {
      const botao = document.createElement("button");

      botao.type = "button";
      botao.className = "filtro-produto";
      botao.textContent = nome;

      const identificador = nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-");

      botao.dataset.filtro =
        ids.length === 0 ? "todos" : identificador;

      botao.addEventListener("click", () => {
        container
          .querySelectorAll(".filtro-produto")
          .forEach((item) => item.classList.remove("ativo"));

        botao.classList.add("ativo");

        listaProdutos.querySelectorAll(".produto").forEach((produto) => {
          const mostrar =
            ids.length === 0 ||
            ids.includes(produto.dataset.categoria);

          produto.style.display = mostrar ? "" : "none";
        });
      });

      container.appendChild(botao);

      return botao;
    }

    const botaoTodos = criarBotao("Todos");
    botaoTodos.classList.add("ativo");

    [...grupos.values()]
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .forEach((grupo) => {
        criarBotao(grupo.nome, grupo.ids);
      });

    const parametrosURL = new URLSearchParams(
      window.location.search
    );

    const categoriaURL = parametrosURL.get("categoria");

    if (categoriaURL) {
      const botaoCategoria = [
        ...container.querySelectorAll(".filtro-produto"),
      ].find(
        (botao) => botao.dataset.filtro === categoriaURL
      );

      if (botaoCategoria) {
        botaoCategoria.click();
      }
    }
  } catch (erro) {
    console.error(
      "Erro ao carregar categorias da Decor 3D:",
      erro
    );
  }
}

async function inicializarCatalogo() {
  await carregarVitrine();
  await carregarFiltrosCategorias();
}

inicializarCatalogo();
