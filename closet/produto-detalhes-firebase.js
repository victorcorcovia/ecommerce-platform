import { buscarProdutoClosetPorId } from "./produtos-firebase.js";

async function carregarDetalhesProduto() {
  const parametros = new URLSearchParams(window.location.search);
  const idProduto = parametros.get("id");

  const nomeElemento = document.querySelector("#produto-nome");
  const precoElemento = document.querySelector("#produto-preco");
  const descricaoElemento = document.querySelector("#produto-descricao");
  const imagemElemento = document.querySelector("#produto-imagem");
  const mensagemElemento = document.querySelector("#produto-mensagem");
  const botaoAdicionar = document.querySelector(".btn-adicionar");

  // Impede compras enquanto os dados ainda não foram carregados.
  if (botaoAdicionar) {
    botaoAdicionar.disabled = true;
  }

  if (!idProduto) {
    if (mensagemElemento) {
      mensagemElemento.textContent = "Produto não informado.";
    }
    return;
  }

  try {
    const produto = await buscarProdutoClosetPorId(idProduto);

    window.produtoAtualFirebase = produto;
    window.tamanhoSelecionadoFirebase = null;
    window.corSelecionadaFirebase = null;

    if (!produto) {
      if (nomeElemento) nomeElemento.textContent = "Produto não encontrado";
      if (mensagemElemento) {
        mensagemElemento.textContent =
          "Este produto não está disponível no momento.";
      }
      return;
    }

    if (nomeElemento) {
      nomeElemento.textContent = produto.nome || "Produto";
    }

    if (precoElemento) {
      precoElemento.textContent = Number(produto.preco).toLocaleString(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL",
        },
      );
    }

    if (descricaoElemento) {
      descricaoElemento.textContent = produto.descricao || "";
    }

    // Exibir cores disponíveis do produto
    const containerCores = document.querySelector("#produto-cores .cores");

    // Exibir tamanhos disponíveis do produto
    const containerTamanhos = document.getElementById("lista-tamanhos-produto");

    if (containerTamanhos) {
      containerTamanhos.innerHTML = "";

      const tamanhos = Array.isArray(produto.tamanhos) ? produto.tamanhos : [];

      tamanhos.forEach((tamanho) => {
        const botao = document.createElement("button");

        botao.type = "button";
        botao.textContent = tamanho;

        botao.addEventListener("click", () => {
          containerTamanhos
            .querySelectorAll("button")
            .forEach((item) => item.classList.remove("selecionado"));

          botao.classList.add("selecionado");

          window.tamanhoSelecionadoFirebase = tamanho;
          window.dispatchEvent(
            new CustomEvent("tamanhoProdutoSelecionado", {
              detail: { tamanho },
            }),
          );
        });

        containerTamanhos.appendChild(botao);
      });
    }

    if (containerCores) {
      containerCores.innerHTML = "";

      const cores = Array.isArray(produto.cores) ? produto.cores : [];

      cores.forEach((cor) => {
        if (
          !cor ||
          typeof cor.codigo !== "string" ||
          !/^#[0-9a-fA-F]{6}$/.test(cor.codigo)
        ) {
          return;
        }

        const circulo = document.createElement("button");

        circulo.type = "button";
        circulo.className = "cor-produto";

        circulo.addEventListener("click", () => {
          containerCores.querySelectorAll(".cor-produto").forEach((botao) => {
            botao.classList.remove("selecionada");
            botao.setAttribute("aria-pressed", "false");
          });

          circulo.classList.add("selecionada");
          circulo.setAttribute("aria-pressed", "true");

          // Disponibiliza a cor selecionada para o carrinho
          window.corSelecionadaFirebase = cor.codigo;
        });

        circulo.setAttribute("aria-pressed", "false");
        circulo.style.backgroundColor = cor.codigo;
        circulo.title = cor.nome || cor.codigo;
        circulo.setAttribute("aria-label", cor.nome || cor.codigo);

        containerCores.appendChild(circulo);
      });
    }

    const imagens = Array.isArray(produto.imagens)
      ? produto.imagens.filter((url) => typeof url === "string" && url.trim())
      : [];

    const fotos =
      imagens.length > 0
        ? imagens
        : ["https://placehold.co/600x750?text=Sem+Imagem"];

    const galeriaMiniaturas = document.querySelector("#galeria-miniaturas");
    const botaoAnterior = document.querySelector("#foto-anterior");
    const botaoProximo = document.querySelector("#foto-proxima");

    let indiceAtual = 0;

    function mostrarFoto(indice) {
      indiceAtual = indice;

      if (imagemElemento) {
        imagemElemento.src = fotos[indiceAtual];
        imagemElemento.alt = `${produto.nome} - foto ${indiceAtual + 1}`;
      }

      if (galeriaMiniaturas) {
        galeriaMiniaturas
          .querySelectorAll(".miniatura-produto")
          .forEach((miniatura, posicao) => {
            miniatura.classList.toggle("ativa", posicao === indiceAtual);
          });
      }
    }

    if (galeriaMiniaturas) {
      galeriaMiniaturas.innerHTML = "";

      fotos.forEach((url, indice) => {
        const miniatura = document.createElement("img");

        miniatura.src = url;
        miniatura.alt = `${produto.nome} - miniatura ${indice + 1}`;
        miniatura.className = "miniatura-produto";

        miniatura.addEventListener("click", () => {
          mostrarFoto(indice);
        });

        galeriaMiniaturas.appendChild(miniatura);
      });
    }

    if (botaoAnterior) {
      botaoAnterior.disabled = fotos.length <= 1;

      botaoAnterior.addEventListener("click", () => {
        mostrarFoto((indiceAtual - 1 + fotos.length) % fotos.length);
      });
    }

    if (botaoProximo) {
      botaoProximo.disabled = fotos.length <= 1;

      botaoProximo.addEventListener("click", () => {
        mostrarFoto((indiceAtual + 1) % fotos.length);
      });
    }

    mostrarFoto(0);

    document.title = `${produto.nome} | Closet`;

    if (botaoAdicionar) {
      botaoAdicionar.disabled = false;
    }

    // A integração do carrinho será feita na próxima etapa.
  } catch (erro) {
    console.error("Erro ao carregar produto:", erro);

    if (mensagemElemento) {
      mensagemElemento.textContent =
        "Não foi possível carregar o produto. Tente novamente.";
    }
  }
}

carregarDetalhesProduto();
