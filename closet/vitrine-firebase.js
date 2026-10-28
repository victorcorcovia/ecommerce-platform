import { buscarProdutosCloset } from "./produtos-firebase.js";
import { buscarCategoriasCloset } from "./categorias-firebase.js";

const lista = document.querySelector(".lista-produtos");

function formatarPreco(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function criarCard(produto) {
  const card = document.createElement("div");
  card.className = "produto";
  card.dataset.categoria = produto.categoriaId || "";

  const imagemContainer = document.createElement("div");
  imagemContainer.className = "produto-imagem";

  const imagem = document.createElement("img");
  imagem.src =
    produto.imagens?.[0] || "https://placehold.co/350x450?text=Sem+Imagem";
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
  link.className = "btn-carrinho";
  link.href = `produto.html?id=${encodeURIComponent(produto.id)}`;
  link.textContent = "Ver produto";

  informacoes.append(nome, preco, link);
  card.append(imagemContainer, informacoes);

  return card;
}

async function carregarVitrine() {
  if (!lista) return;

  try {
    const produtos = await buscarProdutosCloset();

    const disponiveis = produtos.filter(
      (produto) => produto.disponivel === true,
    );

    const cards = disponiveis.map(criarCard);

    lista.replaceChildren(...cards);

    if (cards.length === 0) {
      const mensagem = document.createElement("p");
      mensagem.textContent = "Nenhum produto disponível no momento.";
      lista.appendChild(mensagem);
    }
  } catch (erro) {
    console.error("Erro ao carregar produtos da Closet:", erro);
  }
}

async function carregarFiltrosCategorias() {
  const container = document.querySelector(".filtros-produtos");
  const listaProdutos = document.querySelector(".lista-produtos");

  if (!container || !listaProdutos) return;

  try {
    const categorias = await buscarCategoriasCloset();

    // Agrupa categorias com o mesmo nome, preservando todos os IDs.
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

    // Remove filtros antigos, mantendo apenas "Todos".
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

      botao.dataset.filtro = ids.length === 0 ? "todos" : identificador;

      botao.addEventListener("click", () => {
        container
          .querySelectorAll(".filtro-produto")
          .forEach((item) => item.classList.remove("ativo"));

        botao.classList.add("ativo");

        // Consulta os produtos atuais, carregados pelo Firebase.
        listaProdutos.querySelectorAll(".produto").forEach((produto) => {
          const mostrar =
            ids.length === 0 || ids.includes(produto.dataset.categoria);

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

    // Seleciona automaticamente a categoria informada na URL.
    const parametrosURL = new URLSearchParams(window.location.search);
    const categoriaURL = parametrosURL.get("categoria");

    if (categoriaURL) {
      const botaoCategoria = [
        ...container.querySelectorAll(".filtro-produto"),
      ].find((botao) => botao.dataset.filtro === categoriaURL);

      if (botaoCategoria) {
        botaoCategoria.click();
      }
    }
  } catch (erro) {
    console.error("Erro ao carregar categorias da Closet:", erro);
  }
}
async function inicializarCatalogo() {
  await carregarVitrine();
  await carregarFiltrosCategorias();
}

inicializarCatalogo();
