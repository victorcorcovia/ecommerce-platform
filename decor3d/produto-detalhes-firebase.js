import { buscarProdutoDecor3DPorId } from "./produtos-firebase.js";

async function carregarProdutoFirebase() {
  const parametros = new URLSearchParams(window.location.search);
  const idProduto = parametros.get("id");

  const botaoAdicionar = document.querySelector("#adicionar-produto");
  const mensagem = document.querySelector("#mensagem-produto");

  // Evita adicionar produtos antes do carregamento.
  if (botaoAdicionar) {
    botaoAdicionar.disabled = true;
  }

  if (!idProduto) {
    if (mensagem) {
      mensagem.textContent = "Produto não informado.";
    }
    return;
  }

  try {
    const produto = await buscarProdutoDecor3DPorId(idProduto);

    if (!produto) {
      // ==========================================
      // ADICIONAR PRODUTO FIREBASE AO CARRINHO
      // ==========================================

      const campoQuantidade = document.querySelector("#quantidade-produto");
      const campoEstoque = document.querySelector("#produto-estoque");

      // Não considerar estoque ausente como zero válido.
      const estoqueValido =
        produto.estoque !== undefined &&
        produto.estoque !== null &&
        Number.isInteger(Number(produto.estoque)) &&
        Number(produto.estoque) >= 0;

      const estoque = estoqueValido ? Number(produto.estoque) : 0;

      if (campoEstoque) {
        campoEstoque.textContent = estoqueValido
          ? `Estoque disponível: ${estoque} unidades`
          : "Estoque indisponível para consulta";
      }

      if (campoQuantidade) {
        campoQuantidade.min = 1;
        campoQuantidade.max = estoque;
      }

      if (botaoAdicionar) {
        botaoAdicionar.disabled =
          !estoqueValido ||
          estoque <= 0 ||
          imagens.length === 0 ||
          typeof window.adicionarProdutoFirebaseAoCarrinho !== "function";

        botaoAdicionar.addEventListener("click", function () {
          const quantidade = Number(campoQuantidade?.value);

          if (!Number.isInteger(quantidade) || quantidade < 1) {
            if (mensagem) {
              mensagem.textContent = "Informe uma quantidade válida.";
            }
            return;
          }

          if (quantidade > estoque) {
            if (mensagem) {
              mensagem.textContent = `Quantidade máxima disponível: ${estoque}.`;
            }
            return;
          }

          // Validar cor selecionada
          const corSelecionada = window.corSelecionadaFirebase ?? null;

          if (cores.length > 0) {
            const corValida = cores.some(function (cor) {
              return (
                (cor.nome || cor.codigo) === corSelecionada &&
                typeof cor.codigo === "string" &&
                /^#[0-9a-fA-F]{6}$/.test(cor.codigo)
              );
            });

            if (!corValida) {
              if (mensagem) {
                mensagem.textContent = "Selecione uma cor.";
              }
              return;
            }
          }

          // Validar personalização com nome
          const nomeConfirmado =
            window.nomePersonalizadoConfirmadoFirebase || "";

          if (permitePersonalizacao && !nomeConfirmado.trim()) {
            if (mensagem) {
              mensagem.textContent =
                "Confirme o nome personalizado antes de adicionar.";
            }
            return;
          }

          if (permitePersonalizacao && nomeConfirmado.length > 60) {
            if (mensagem) {
              mensagem.textContent =
                "O nome personalizado deve ter no máximo 60 caracteres.";
            }
            return;
          }

          // Enviar produto para o carrinho existente
          const adicionado = window.adicionarProdutoFirebaseAoCarrinho({
            id: idProduto,
            nome: produto.nome,
            preco: produto.preco,
            imagem: imagens[0],
            cor: corSelecionada,
            personalizacao: permitePersonalizacao
              ? nomeConfirmado.trim()
              : null,
            quantidade: quantidade,
            estoque: estoque,
          });

          if (mensagem) {
            mensagem.textContent = adicionado
              ? "Produto adicionado ao carrinho!"
              : "Não foi possível adicionar. Verifique o estoque disponível.";
          }
        });
      }

      if (mensagem) {
        mensagem.textContent = "";
      }
      return;
    }
    // Disponibiliza os dados para a integração com o carrinho.
    window.produtoAtualFirebase = produto;

    // Identificador exclusivo do produto no Firebase.
    window.produtoIdFirebase = produto.id;

    // Atualiza as informações básicas da página.
    document.querySelector("#produto-nome").textContent =
      produto.nome || "Produto";

    document.querySelector("#produto-preco").textContent = Number(
      produto.preco,
    ).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    document.querySelector("#produto-descricao").textContent =
      produto.descricao || "";

    document.title = `${produto.nome} | Lolly Decor 3D`;

    // ==========================================
    // PERSONALIZAÇÃO COM NOME - FIREBASE
    // ==========================================

    const secaoPersonalizacao = document.querySelector(
      "#personalizacao-produto",
    );

    const campoNomePersonalizado = document.querySelector(
      "#nome-personalizado",
    );

    const permitePersonalizacao = produto.permitePersonalizacao === true;

    if (secaoPersonalizacao) {
      secaoPersonalizacao.style.display = permitePersonalizacao
        ? "block"
        : "none";
    }

    if (campoNomePersonalizado && !permitePersonalizacao) {
      campoNomePersonalizado.value = "";
    }

    // ==========================================
    // CORES DO PRODUTO - FIREBASE
    // ==========================================

    const secaoCores = document.querySelector("#produto-cores");
    const containerCores = document.querySelector("#produto-cores .cores");

    const cores = Array.isArray(produto.cores) ? produto.cores : [];

    window.corSelecionadaFirebase = null;

    if (secaoCores && containerCores) {
      containerCores.innerHTML = "";

      if (cores.length === 0) {
        secaoCores.style.display = "none";
      } else {
        secaoCores.style.display = "";

        cores.forEach((cor) => {
          if (
            !cor ||
            typeof cor.codigo !== "string" ||
            !/^#[0-9a-fA-F]{6}$/.test(cor.codigo)
          ) {
            return;
          }

          const botaoCor = document.createElement("button");

          botaoCor.type = "button";
          botaoCor.className = "cor-produto";
          botaoCor.style.backgroundColor = cor.codigo;
          botaoCor.title = cor.nome || cor.codigo;
          botaoCor.setAttribute("aria-label", cor.nome || cor.codigo);
          botaoCor.setAttribute("aria-pressed", "false");

          botaoCor.addEventListener("click", () => {
            containerCores.querySelectorAll(".cor-produto").forEach((botao) => {
              botao.classList.remove("selecionada");
              botao.setAttribute("aria-pressed", "false");
            });

            botaoCor.classList.add("selecionada");
            botaoCor.setAttribute("aria-pressed", "true");

            window.corSelecionadaFirebase = cor.nome || cor.codigo;
          });

          containerCores.appendChild(botaoCor);
        });

        if (!containerCores.children.length) {
          secaoCores.style.display = "none";
        }
      }
    }
    // ==========================================
    // GALERIA DE IMAGENS DO FIREBASE
    // ==========================================

    const imagemPrincipal = document.querySelector("#produto-imagem");
    const galeriaMiniaturas = document.querySelector("#galeria-miniaturas");
    const botaoAnterior = document.querySelector("#foto-anterior");
    const botaoProximo = document.querySelector("#foto-proxima");

    const imagens = Array.isArray(produto.imagens)
      ? produto.imagens
          .map((imagem) => (typeof imagem === "string" ? imagem : imagem?.url))
          .filter((url) => typeof url === "string" && url.trim())
      : [];

    let indiceAtual = 0;

    function mostrarImagem(indice) {
      if (!imagens.length) return;

      indiceAtual = indice;

      if (imagemPrincipal) {
        imagemPrincipal.src = imagens[indiceAtual];
        imagemPrincipal.alt = `${produto.nome} - foto ${indiceAtual + 1}`;
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

      imagens.forEach((url, indice) => {
        const miniatura = document.createElement("img");

        miniatura.src = url;
        miniatura.alt = `${produto.nome} - foto ${indice + 1}`;
        miniatura.className = "miniatura-produto";

        miniatura.addEventListener("click", () => {
          mostrarImagem(indice);
        });

        galeriaMiniaturas.appendChild(miniatura);
      });
    }

    if (botaoAnterior) {
      botaoAnterior.disabled = imagens.length <= 1;

      botaoAnterior.addEventListener("click", () => {
        mostrarImagem((indiceAtual - 1 + imagens.length) % imagens.length);
      });
    }

    if (botaoProximo) {
      botaoProximo.disabled = imagens.length <= 1;

      botaoProximo.addEventListener("click", () => {
        mostrarImagem((indiceAtual + 1) % imagens.length);
      });
    }

    if (imagens.length > 0) {
      mostrarImagem(0);
    } else if (imagemPrincipal) {
      imagemPrincipal.src = "https://placehold.co/600x600?text=Sem+Imagem";
      imagemPrincipal.alt = "Produto sem imagem";
    }

    // A galeria, as cores e o carrinho serão integrados
    // nas próximas etapas.

    if (mensagem) {
      mensagem.textContent = "";
    }
  } catch (erro) {
    console.error("Erro ao carregar produto da Decor 3D:", erro);

    if (mensagem) {
      mensagem.textContent = "Erro ao carregar o produto.";
    }
  }
}

carregarProdutoFirebase();
