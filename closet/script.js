// ==========================================
// CARRINHO - CARREGAR DADOS SALVOS
// ==========================================

let carrinho = JSON.parse(localStorage.getItem("carrinhoLolly")) || [];

// ==========================================
// ELEMENTOS
// ==========================================

const contadorCarrinho = document.querySelector("#contador-carrinho");

const botoesTamanho = document.querySelectorAll(".tamanhos button");

const botaoAdicionar = document.querySelector(".btn-adicionar");

const campoQuantidade = document.querySelector("#quantidade");

const mensagemProduto = document.querySelector("#produto-mensagem");

let tamanhoSelecionado = null;
let corSelecionada = null;

// ==========================================
// ATUALIZAR CONTADOR DO CARRINHO
// ==========================================

function atualizarContadorCarrinho() {
  let quantidadeTotal = 0;

  carrinho.forEach(function (item) {
    quantidadeTotal += item.quantidade;
  });

  if (contadorCarrinho) {
    contadorCarrinho.textContent = quantidadeTotal;
  }
}

// Executa assim que a página abre
atualizarContadorCarrinho();

// ==========================================
// SELEÇÃO DE TAMANHO
// ==========================================

botoesTamanho.forEach(function (botao) {
  botao.addEventListener("click", function () {
    botoesTamanho.forEach(function (outroBotao) {
      outroBotao.classList.remove("selecionado");
    });

    botao.classList.add("selecionado");

    tamanhoSelecionado = botao.textContent.trim();

    console.log("Tamanho selecionado:", tamanhoSelecionado);
  });
});

// ==========================================
// ADICIONAR AO CARRINHO
// ==========================================

if (botaoAdicionar) {
  botaoAdicionar.addEventListener("click", function () {
    // Verifica o tamanho

    if (tamanhoSelecionado === null) {
      mensagemProduto.textContent =
        "Selecione um tamanho antes de adicionar ao carrinho.";
      return;
    }

    if (
      produtoAtual.cores &&
      produtoAtual.cores.length > 0 &&
      corSelecionada === null
    ) {
      mensagemProduto.textContent =
        "Selecione uma cor antes de adicionar ao carrinho.";
      return;
    }

    // Pega a quantidade

    const quantidade = Number(campoQuantidade.value);

    // Verifica a quantidade

    if (quantidade < 1) {
      alert("Escolha uma quantidade válida.");

      return;
    }

    // Verifica se o mesmo produto
    // e tamanho já estão no carrinho

    const itemExistente = carrinho.find(function (item) {
      return (
        item.nome === produtoAtual.nome &&
        item.tamanho === tamanhoSelecionado &&
        item.cor === corSelecionada
      );
    });

    // Se já existir, aumenta a quantidade

    if (itemExistente) {
      itemExistente.quantidade += quantidade;
    } else {
      // Se não existir, cria um novo item

      const produto = {
        nome: produtoAtual.nome,
        preco: produtoAtual.preco,
        imagem: produtoAtual.imagens[0],
        tamanho: tamanhoSelecionado,
        cor: corSelecionada,
        quantidade: quantidade,
      };

      carrinho.push(produto);
    }

    // Salva no navegador

    localStorage.setItem("carrinhoLolly", JSON.stringify(carrinho));
    mensagemProduto.textContent = "Produto adicionado ao carrinho!";
    mensagemProduto.style.color = "green";
    setTimeout(() => {
      mensagemProduto.textContent = "";
    }, 2000); // Limpa a mensagem após 2 segundos

    // Atualiza o número do carrinho

    atualizarContadorCarrinho();

    console.log("Carrinho atualizado:");

    console.table(carrinho);
  });
}

// ==========================================
// PAINEL DO CARRINHO
// ==========================================

const botaoAbrirCarrinho = document.querySelector("#abrir-carrinho");

const botaoFecharCarrinho = document.querySelector("#fechar-carrinho");

const painelCarrinho = document.querySelector("#painel-carrinho");

const fundoCarrinho = document.querySelector("#fundo-carrinho");

const conteudoCarrinho = document.querySelector("#conteudo-carrinho");

const subtotalCarrinho = document.querySelector("#subtotal-carrinho");

// ==========================================
// ABRIR CARRINHO
// ==========================================

if (botaoAbrirCarrinho) {
  botaoAbrirCarrinho.addEventListener("click", function (event) {
    event.preventDefault();

    atualizarPainelCarrinho();

    painelCarrinho.classList.add("aberto");

    fundoCarrinho.classList.add("aberto");
  });
}

// ==========================================
// FECHAR CARRINHO
// ==========================================

function fecharCarrinho() {
  painelCarrinho.classList.remove("aberto");

  fundoCarrinho.classList.remove("aberto");
}

if (botaoFecharCarrinho) {
  botaoFecharCarrinho.addEventListener("click", fecharCarrinho);
}

if (fundoCarrinho) {
  fundoCarrinho.addEventListener("click", fecharCarrinho);
}

// ==========================================
// MOSTRAR PRODUTOS
// ==========================================

function atualizarPainelCarrinho() {
  if (!conteudoCarrinho || !subtotalCarrinho) {
    return;
  }

  conteudoCarrinho.innerHTML = "";

  let subtotal = 0;

  // CARRINHO VAZIO

  if (carrinho.length === 0) {
    conteudoCarrinho.innerHTML = `
            <p class="carrinho-vazio">
                Seu carrinho está vazio.
            </p>
        `;

    subtotalCarrinho.textContent = "R$ 0,00";

    return;
  }

  // PRODUTOS

  carrinho.forEach(function (item, index) {
    const totalItem = item.preco * item.quantidade;

    subtotal += totalItem;

    conteudoCarrinho.innerHTML += `
        <div class="item-carrinho">

            <h3>${item.nome}</h3>

            <p>
                Tamanho: ${item.tamanho}
            </p>

            ${item.cor ? `<p>Cor: ${item.cor}</p>` : ""}

            <div class="controle-quantidade">

                <button
                    type="button"
                    onclick="diminuirQuantidade(${index})"
                >
                    −
                </button>

                <span>
                    ${item.quantidade}
                </span>

                <button
                    type="button"
                    onclick="aumentarQuantidade(${index})"
                >
                    +
                </button>

            </div>

            <p class="preco-item">
                R$ ${totalItem.toFixed(2).replace(".", ",")}
            </p>

            <button
                type="button"
                class="btn-remover"
                onclick="removerProduto(${index})"
            >
                Remover
            </button>

        </div>
    `;
  });

  // SUBTOTAL

  subtotalCarrinho.textContent = "R$ " + subtotal.toFixed(2).replace(".", ",");
}

// ==========================================
// AUMENTAR QUANTIDADE
// ==========================================

function aumentarQuantidade(index) {
  carrinho[index].quantidade++;

  salvarCarrinho();
}

// ==========================================
// DIMINUIR QUANTIDADE
// ==========================================

function diminuirQuantidade(index) {
  if (carrinho[index].quantidade > 1) {
    carrinho[index].quantidade--;

    salvarCarrinho();
  }
}

// ==========================================
// REMOVER PRODUTO
// ==========================================

function removerProduto(index) {
  carrinho.splice(index, 1);

  if (carrinho.length === 0) {
    localStorage.removeItem("cepCloset");
    localStorage.removeItem("freteCloset");
    valorFreteCarrinho = 0;
  }

  salvarCarrinho();
}

// ==========================================
// SALVAR ALTERAÇÕES DO CARRINHO
// ==========================================

function salvarCarrinho() {
  localStorage.setItem("carrinhoLolly", JSON.stringify(carrinho));

  atualizarContadorCarrinho();

  atualizarPainelCarrinho();

  atualizarPaginaCarrinho();
}

// ==========================================
// CÁLCULO DE FRETE - DEMONSTRAÇÃO
// ==========================================

const campoCep = document.querySelector("#cep-frete");

const botaoCalcularFrete = document.querySelector("#calcular-frete");

const resultadoFrete = document.querySelector("#resultado-frete");

// ==========================================
// FORMATAR CEP
// ==========================================

if (campoCep) {
  campoCep.addEventListener("input", function () {
    let cep = campoCep.value.replace(/\D/g, "");

    cep = cep.substring(0, 8);

    if (cep.length > 5) {
      cep = cep.substring(0, 5) + "-" + cep.substring(5);
    }

    campoCep.value = cep;
  });
}

// ==========================================
// CALCULAR FRETE
// ==========================================

if (botaoCalcularFrete) {
  botaoCalcularFrete.addEventListener("click", function () {
    const cep = campoCep.value.replace(/\D/g, "");

    // VERIFICA CEP

    if (cep.length !== 8) {
      resultadoFrete.innerHTML = `
                    <p class="erro-frete">
                        Digite um CEP válido.
                    </p>
                `;

      return;
    }

    localStorage.setItem("cepCloset", cep);

    // FRETE SIMULADO PARA DEMONSTRAÇÃO

    resultadoFrete.innerHTML = `
                <div class="opcao-frete">

                    <strong>
                        Entrega padrão
                    </strong>

                    <span>
                        R$ 18,90 • 5 a 8 dias úteis
                    </span>

                </div>
            `;
  });
}

// ========================================
// FILTRO DE PRODUTOS
// ========================================

const botoesFiltro = document.querySelectorAll(".filtro-produto");
const produtosCatalogo = document.querySelectorAll(".produto[data-categoria]");

if (botoesFiltro.length > 0 && produtosCatalogo.length > 0) {
  botoesFiltro.forEach((botao) => {
    botao.addEventListener("click", () => {
      const filtro = botao.dataset.filtro;

      // Remove o ativo de todos os botões
      botoesFiltro.forEach((item) => {
        item.classList.remove("ativo");
      });

      // Deixa o botão clicado ativo
      botao.classList.add("ativo");

      // Filtra os produtos
      produtosCatalogo.forEach((produto) => {
        const categoria = produto.dataset.categoria;

        if (filtro === "todos" || categoria === filtro) {
          produto.style.display = "";
        } else {
          produto.style.display = "none";
        }
      });
    });
  });
}

const produtos = {
  blusa: {
    nome: "Blusa Feminina",
    preco: 79.9,
    descricao:
      "Blusa feminina confortável e versátil, perfeita para compor diferentes looks.",

    imagens: [
      "https://placehold.co/600x750?text=Blusa+Frente",
      "https://placehold.co/600x750?text=Blusa+Costas",
      "https://placehold.co/600x750?text=Blusa+Detalhe",
    ],

    tamanhos: ["P", "M", "G", "GG"],

    cores: [
      { nome: "Preto", codigo: "#222222" },
      { nome: "Branco", codigo: "#F5F5F5" },
      { nome: "Rosa", codigo: "#DFA6B3" },
    ],
  },

  vestido: {
    nome: "Vestido Feminino",
    preco: 129.9,
    descricao:
      "Vestido feminino elegante e confortável, perfeito para diferentes ocasiões.",

    imagens: [
      "https://placehold.co/600x750?text=Vestido+Frente",
      "https://placehold.co/600x750?text=Vestido+Costas",
      "https://placehold.co/600x750?text=Vestido+Detalhe",
    ],

    tamanhos: ["P", "M", "G", "GG"],

    cores: [
      { nome: "Preto", codigo: "#222222" },
      { nome: "Branco", codigo: "#F5F5F5" },
      { nome: "Rosa", codigo: "#DFA6B3" },
    ],
  },

  calca: {
    nome: "Calça Feminina",
    preco: 149.9,
    descricao:
      "Calça feminina moderna e versátil, ideal para compor diversos looks.",

    imagens: [
      "https://placehold.co/600x750?text=Calca+Frente",
      "https://placehold.co/600x750?text=Calca+Costas",
      "https://placehold.co/600x750?text=Calca+Detalhe",
    ],

    tamanhos: ["36", "38", "40", "42", "44"],

    cores: [
      { nome: "Preto", codigo: "#222222" },
      { nome: "Branco", codigo: "#F5F5F5" },
      { nome: "Rosa", codigo: "#DFA6B3" },
    ],
  },
};

const parametros = new URLSearchParams(window.location.search);
const idProduto = parametros.get("id");

const produtoAtual = produtos[idProduto];

if (produtoAtual) {
  const imagemProduto = document.querySelector("#produto-imagem");
  const nomeProduto = document.querySelector("#produto-nome");
  const precoProduto = document.querySelector("#produto-preco");
  const descricaoProduto = document.querySelector("#produto-descricao");
  const tamanhosProduto = document.querySelector("#produto-tamanhos .tamanhos");
  const coresProduto = document.querySelector("#produto-cores .cores");

  if (imagemProduto && produtoAtual.imagens) {
    imagemProduto.src = produtoAtual.imagens[0];
    imagemProduto.alt = produtoAtual.nome;
  }

  // ========================================
  // GALERIA DE FOTOS DO PRODUTO
  // ========================================

  const galeriaMiniaturas = document.querySelector("#galeria-miniaturas");

  if (galeriaMiniaturas && produtoAtual.imagens) {
    galeriaMiniaturas.innerHTML = "";

    produtoAtual.imagens.forEach(function (imagem, index) {
      const miniatura = document.createElement("img");

      miniatura.src = imagem;
      miniatura.alt = `${produtoAtual.nome} - foto ${index + 1}`;
      miniatura.classList.add("miniatura-produto");

      if (index === 0) {
        miniatura.classList.add("ativa");
      }

      miniatura.addEventListener("click", function () {
        imagemProduto.src = imagem;

        document
          .querySelectorAll(".miniatura-produto")
          .forEach(function (item) {
            item.classList.remove("ativa");
          });

        miniatura.classList.add("ativa");
      });

      galeriaMiniaturas.appendChild(miniatura);
    });
  }

  // ========================================
  // SETAS DA GALERIA
  // ========================================

  const botaoFotoAnterior = document.querySelector("#foto-anterior");
  const botaoFotoProxima = document.querySelector("#foto-proxima");

  let indiceFotoAtual = 0;

  function trocarFoto(indice) {
    if (!produtoAtual || !produtoAtual.imagens || !imagemProduto) {
      return;
    }

    indiceFotoAtual = indice;

    imagemProduto.src = produtoAtual.imagens[indiceFotoAtual];

    document
      .querySelectorAll(".miniatura-produto")
      .forEach(function (miniatura, index) {
        miniatura.classList.toggle("ativa", index === indiceFotoAtual);
      });
  }

  if (botaoFotoProxima && produtoAtual && produtoAtual.imagens) {
    botaoFotoProxima.addEventListener("click", function () {
      indiceFotoAtual++;

      if (indiceFotoAtual >= produtoAtual.imagens.length) {
        indiceFotoAtual = 0;
      }

      trocarFoto(indiceFotoAtual);
    });
  }

  if (botaoFotoAnterior && produtoAtual && produtoAtual.imagens) {
    botaoFotoAnterior.addEventListener("click", function () {
      indiceFotoAtual--;

      if (indiceFotoAtual < 0) {
        indiceFotoAtual = produtoAtual.imagens.length - 1;
      }

      trocarFoto(indiceFotoAtual);
    });
  }

  if (nomeProduto) {
    nomeProduto.textContent = produtoAtual.nome;
  }

  if (precoProduto) {
    precoProduto.textContent =
      "R$ " + produtoAtual.preco.toFixed(2).replace(".", ",");
  }

  if (descricaoProduto) {
    descricaoProduto.textContent = produtoAtual.descricao;
  }

  if (tamanhosProduto) {
    tamanhosProduto.innerHTML = "";
    produtoAtual.tamanhos.forEach((tamanho) => {
      const botaoTamanho = document.createElement("button");
      botaoTamanho.addEventListener("click", function () {
        tamanhosProduto.querySelectorAll("button").forEach((outroBotao) => {
          outroBotao.classList.remove("selecionado");
        });

        this.classList.add("selecionado");
        tamanhoSelecionado = tamanho;
      });

      botaoTamanho.type = "button";
      botaoTamanho.textContent = tamanho;
      tamanhosProduto.appendChild(botaoTamanho);
    });
  }

  const secaoCores = document.querySelector("#produto-cores");

  if (coresProduto) {
    if (produtoAtual.cores && produtoAtual.cores.length > 0) {
      secaoCores.style.display = "";

      coresProduto.innerHTML = "";

      produtoAtual.cores.forEach(function (cor) {
        const botaoCor = document.createElement("button");

        botaoCor.type = "button";
        botaoCor.className = "cor-produto";
        botaoCor.title = cor.nome;
        botaoCor.setAttribute("aria-label", cor.nome);

        botaoCor.style.backgroundColor = cor.codigo;

        botaoCor.addEventListener("click", function () {
          coresProduto
            .querySelectorAll(".cor-produto")
            .forEach(function (botao) {
              botao.classList.remove("selecionada");
            });

          botaoCor.classList.add("selecionada");
          corSelecionada = cor.nome;
        });

        coresProduto.appendChild(botaoCor);
      });
    } else {
      secaoCores.style.display = "none";
    }
  }

  document.title = produtoAtual.nome + " | Lolly Closet";
}

// ========================================
// FILTRO PELA CATEGORIA DA URL
// ========================================

const parametrosURL = new URLSearchParams(window.location.search);
const categoriaURL = parametrosURL.get("categoria");

if (categoriaURL && botoesFiltro.length > 0) {
  const botaoCategoria = document.querySelector(
    `.filtro-produto[data-filtro="${categoriaURL}"]`,
  );

  if (botaoCategoria) {
    botaoCategoria.click();
  }
}

// ========================================
// PÁGINA COMPLETA DO CARRINHO
// ========================================

const carrinhoPagina = document.querySelector("#carrinho-pagina");

function atualizarPaginaCarrinho() {
  if (!carrinhoPagina) {
    return;
  }

  carrinhoPagina.innerHTML = "";

  if (carrinho.length === 0) {
    carrinhoPagina.innerHTML = `
      <p>Seu carrinho está vazio.</p>
    `;
    return;
  }

  let subtotal = 0;

  carrinho.forEach(function (item, index) {
    const totalItem = item.preco * item.quantidade;

    subtotal += totalItem;

    carrinhoPagina.innerHTML += `
  <div class="item-carrinho-pagina">

    <div class="info-item-carrinho">

      <h3>${item.nome}</h3>

      <p>Tamanho: ${item.tamanho}</p>

      ${item.cor ? `<p>Cor: ${item.cor}</p>` : ""}

      <div class="controle-quantidade">
        <button
          type="button"
          onclick="diminuirQuantidade(${index})"
        >
          −
        </button>

        <span>${item.quantidade}</span>

        <button
          type="button"
          onclick="aumentarQuantidade(${index})"
        >
          +
        </button>
      </div>

      <button
        type="button"
        class="btn-remover"
        onclick="removerProduto(${index})"
      >
        Remover
      </button>

      <p>
        R$ ${totalItem.toFixed(2).replace(".", ",")}
      </p>

    </div>

    <div class="imagem-item-carrinho">
      <img
        src="${item.imagem}"
        alt="${item.nome}"
      >
    </div>

  </div>
`;
  });

  // SUBTOTAL + FRETE
  carrinhoPagina.innerHTML += `
  <div class="resumo-carrinho-pagina">

    <div class="subtotal-pagina-carrinho">
      <span>Subtotal:</span>
      <strong>R$ ${subtotal.toFixed(2).replace(".", ",")}</strong>
    </div>

    <div class="calculo-frete">

      <label for="cep-carrinho">
        Calcular frete
      </label>

      <div class="campo-frete">
        <input
          type="text"
          id="cep-carrinho"
          placeholder="Digite seu CEP"
          maxlength="9"
          value="${
            localStorage.getItem("cepCloset")
              ? localStorage.getItem("cepCloset").substring(0, 5) +
                "-" +
                localStorage.getItem("cepCloset").substring(5)
              : ""
          }"
        />

        <button
          type="button"
          id="calcular-frete-carrinho"
        >
          Calcular
        </button>
      </div>

      <div id="resultado-frete-carrinho"></div>

    </div>

  </div>
`;

  // TOTAL COM FRETE
  const totalCarrinho = subtotal + valorFreteCarrinho;

  carrinhoPagina.innerHTML += `
    <div class="total-pagina-carrinho">
      <span>Total:</span>
      <strong>R$ ${totalCarrinho.toFixed(2).replace(".", ",")}</strong>
    </div>
  `;

  carrinhoPagina.innerHTML += `
  <a href="checkout.html" class="btn-finalizar-compra">
    Finalizar compra
  </a>
`;
}

let valorFreteCarrinho = Number(localStorage.getItem("freteCloset")) || 0;

atualizarPaginaCarrinho();

// ========================================
// FRETE - PÁGINA COMPLETA DO CARRINHO
// ========================================

const campoCepCarrinho = document.querySelector("#cep-carrinho");

const botaoFreteCarrinho = document.querySelector("#calcular-frete-carrinho");
const resultadoFreteCarrinho = document.querySelector(
  "#resultado-frete-carrinho",
);

function calcularFretePaginaCarrinho() {
  const campoCepCarrinho = document.querySelector("#cep-carrinho");
  const resultadoFreteCarrinho = document.querySelector(
    "#resultado-frete-carrinho",
  );

  if (!campoCepCarrinho || !resultadoFreteCarrinho) {
    return;
  }

  const cep = campoCepCarrinho.value.replace(/\D/g, "");

  if (cep.length !== 8) {
    resultadoFreteCarrinho.innerHTML = `
      <p class="erro-frete">
        Digite um CEP válido.
      </p>
    `;
    return;
  }

  localStorage.setItem("cepCloset", cep);

  valorFreteCarrinho = 18.9;

  localStorage.setItem("freteCloset", valorFreteCarrinho);

  atualizarPaginaCarrinho();

  const novoResultadoFrete = document.querySelector(
    "#resultado-frete-carrinho",
  );

  if (novoResultadoFrete) {
    novoResultadoFrete.innerHTML = `
      <div class="opcao-frete">
        <strong>Entrega padrão</strong>
        <span>R$ 18,90 • 5 a 8 dias úteis</span>
      </div>
    `;
  }
}

if (botaoFreteCarrinho) {
  botaoFreteCarrinho.addEventListener("click", calcularFretePaginaCarrinho);
}

const cepSalvoPaginaCarrinho = localStorage.getItem("cepCloset");

if (carrinhoPagina && cepSalvoPaginaCarrinho) {
  calcularFretePaginaCarrinho();
}

function mostrarErroCampo(campo, mensagem) {
  if (!campo) return;

  campo.classList.add("campo-invalido");

  const erroAnterior = campo.parentElement.querySelector(".erro-campo");

  if (erroAnterior) {
    erroAnterior.remove();
  }

  const erro = document.createElement("p");
  erro.className = "erro-campo";
  erro.textContent = mensagem;

  campo.insertAdjacentElement("afterend", erro);
}

function limparErrosCheckout() {
  document.querySelectorAll(".campo-invalido").forEach(function (campo) {
    campo.classList.remove("campo-invalido");
  });

  document.querySelectorAll(".erro-campo").forEach(function (erro) {
    erro.remove();
  });
}

/* ========================================
   CHECKOUT - RESUMO DO PEDIDO
======================================== */

const resumoPedidoCheckout = document.querySelector("#resumo-pedido-checkout");

function atualizarResumoCheckout() {
  if (!resumoPedidoCheckout) {
    return;
  }

  resumoPedidoCheckout.innerHTML = "";

  if (carrinho.length === 0) {
    resumoPedidoCheckout.innerHTML = `
            <p>Seu carrinho está vazio.</p>
        `;

    return;
  }

  let subtotalCheckout = 0;

  carrinho.forEach(function (item) {
    const totalItem = item.preco * item.quantidade;

    subtotalCheckout += totalItem;

    resumoPedidoCheckout.innerHTML += `
            <div class="item-resumo-checkout">

                <div class="info-resumo-checkout">
                    <h3>${item.nome}</h3>

                    <p>Tamanho: ${item.tamanho}</p>

                    ${item.cor ? `<p>Cor: ${item.cor}</p>` : ""}

                    <p>Quantidade: ${item.quantidade}</p>
                </div>

                <strong>
                    R$ ${totalItem.toFixed(2).replace(".", ",")}
                </strong>

            </div>
        `;
  });

  const freteCheckout = Number(localStorage.getItem("freteCloset")) || 0;

  const totalCheckout = subtotalCheckout + freteCheckout;

  resumoPedidoCheckout.innerHTML += `
    <div class="valores-checkout">

        <div class="linha-valor-checkout">
            <span>Subtotal</span>

            <strong>
                R$ ${subtotalCheckout.toFixed(2).replace(".", ",")}
            </strong>
        </div>

        <div class="linha-valor-checkout">
            <span>Frete</span>

            <strong>
                ${
                  freteCheckout > 0
                    ? `R$ ${freteCheckout.toFixed(2).replace(".", ",")}`
                    : "Não calculado"
                }
            </strong>
        </div>

        <div class="total-checkout">
            <span>Total</span>

            <strong>
                R$ ${totalCheckout.toFixed(2).replace(".", ",")}
            </strong>
        </div>

    </div>
`;
}

atualizarResumoCheckout();

// ========================================
// CHECKOUT - CEP E ENDEREÇO
// ========================================

const cepCheckout = document.querySelector("#cep-checkout");
let cepEnderecoValido = false;

function buscarEndereco(cep) {
  fetch(`https://viacep.com.br/ws/${cep}/json/`)
    .then(function (resposta) {
      return resposta.json();
    })
    .then(function (dados) {
      if (dados.erro) {
        cepEnderecoValido = false;

        document.querySelector("#rua").value = "";
        document.querySelector("#bairro").value = "";
        document.querySelector("#cidade").value = "";
        document.querySelector("#estado").value = "";

        return;
      }

      cepEnderecoValido = true;
      document.querySelector("#rua").value = dados.logradouro || "";
      document.querySelector("#bairro").value = dados.bairro || "";
      document.querySelector("#cidade").value = dados.localidade || "";
      document.querySelector("#estado").value = dados.uf || "";

      localStorage.setItem("cepCloset", cep);
      localStorage.setItem("freteCloset", 18.9);
      atualizarResumoCheckout();
    })
    .catch(function (erro) {
      console.error("Erro ao buscar CEP:", erro);
    });
}

if (cepCheckout) {
  // Pega o CEP que veio do carrinho
  const cepSalvo = localStorage.getItem("cepCloset");

  // Se existir CEP salvo, preenche e busca o endereço automaticamente
  if (cepSalvo) {
    cepCheckout.value = cepSalvo.substring(0, 5) + "-" + cepSalvo.substring(5);

    buscarEndereco(cepSalvo);
  }

  // Se o cliente alterar o CEP
  cepCheckout.addEventListener("input", function () {
    let cep = cepCheckout.value.replace(/\D/g, "");

    cep = cep.substring(0, 8);

    if (cep.length > 5) {
      cepCheckout.value = cep.substring(0, 5) + "-" + cep.substring(5);
    } else {
      cepCheckout.value = cep;
    }

    localStorage.removeItem("freteCloset");
    atualizarResumoCheckout();
    cepEnderecoValido = false;

    // Quando completar o CEP, busca novamente
    if (cep.length === 8) {
      localStorage.setItem("cepCloset", cep);
      buscarEndereco(cep);
    }
  });
}

// ========================================
// CHECKOUT - FINALIZAR PEDIDO
// ========================================

const botaoFinalizarPedido = document.querySelector("#finalizar-pedido");
const mensagemCheckout = document.querySelector("#mensagem-checkout");

if (botaoFinalizarPedido) {
  botaoFinalizarPedido.addEventListener("click", function () {
    const nome = document.querySelector("#nome");
    const emailValor = email.value.trim();
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValor);
    const telefoneNumeros = telefone.value.replace(/\D/g, "");
    const cep = document.querySelector("#cep-checkout");
    const cepNumeros = cep.value.replace(/\D/g, "");
    const rua = document.querySelector("#rua");
    const numero = document.querySelector("#numero");
    const bairro = document.querySelector("#bairro");
    const cidade = document.querySelector("#cidade");
    const estado = document.querySelector("#estado");

    // Limpa a mensagem anterior
    mensagemCheckout.textContent = "";
    mensagemCheckout.className = "mensagem-checkout";

    // Limpa as marcações dos campos antes de validar novamente
    limparErrosCheckout();

    let formularioValido = true;
    let primeiroCampoInvalido = null;

    if (!nome.value.trim()) {
      mostrarErroCampo(nome, "Preencha seu nome para continuar.");

      formularioValido = false;

      if (!primeiroCampoInvalido) {
        primeiroCampoInvalido = nome;
      }
    }

    if (!emailValido) {
      mostrarErroCampo(email, "Digite um e-mail válido.");

      formularioValido = false;

      if (!primeiroCampoInvalido) {
        primeiroCampoInvalido = email;
      }
    }

    if (telefoneNumeros.length < 10 || telefoneNumeros.length > 11) {
      mostrarErroCampo(telefone, "Digite um telefone válido com DDD.");

      formularioValido = false;

      if (!primeiroCampoInvalido) {
        primeiroCampoInvalido = telefone;
      }
    }

    if (cepNumeros.length !== 8) {
      mostrarErroCampo(cep, "Digite um CEP válido.");

      formularioValido = false;

      if (!primeiroCampoInvalido) {
        primeiroCampoInvalido = cep;
      }
    } else if (!cepEnderecoValido) {
      mostrarErroCampo(cep, "O CEP informado não foi encontrado.");

      formularioValido = false;

      if (!primeiroCampoInvalido) {
        primeiroCampoInvalido = cep;
      }
    }

    if (!rua.value.trim()) {
      mostrarErroCampo(rua, "Digite a rua.");

      formularioValido = false;

      if (!primeiroCampoInvalido) {
        primeiroCampoInvalido = rua;
      }
    }

    if (!numero.value.trim()) {
      mostrarErroCampo(numero, "Digite o número.");

      formularioValido = false;

      if (!primeiroCampoInvalido) {
        primeiroCampoInvalido = numero;
      }
    }

    if (!bairro.value.trim()) {
      mostrarErroCampo(bairro, "Digite um bairro.");

      formularioValido = false;

      if (!primeiroCampoInvalido) {
        primeiroCampoInvalido = bairro;
      }
    }

    if (!cidade.value.trim()) {
      mostrarErroCampo(cidade, "Digite uma cidade.");

      formularioValido = false;

      if (!primeiroCampoInvalido) {
        primeiroCampoInvalido = cidade;
      }
    }

    if (!estado.value.trim()) {
      mostrarErroCampo(estado, "Digite um estado.");

      formularioValido = false;

      if (!primeiroCampoInvalido) {
        primeiroCampoInvalido = estado;
      }
    }

    if (!formularioValido) {
      mensagemCheckout.textContent = "Verifique os campos destacados acima.";

      mensagemCheckout.classList.add("erro");

      if (primeiroCampoInvalido) {
        primeiroCampoInvalido.focus();
      }

      return;
    }

    // FORMA DE PAGAMENTO
    const pagamentoSelecionado = document.querySelector(
      'input[name="pagamento"]:checked',
    );

    if (!pagamentoSelecionado) {
      mensagemCheckout.textContent =
        "Selecione uma forma de pagamento para continuar.";

      mensagemCheckout.classList.add("erro");
      return;
    }
    const freteValido = Number(localStorage.getItem("freteCloset")) > 0;

    if (!freteValido) {
      mensagemCheckout.textContent =
        "Calcule o frete antes de finalizar o pedido.";

      mensagemCheckout.className = "mensagem-checkout erro";
      return;
    }

    console.log("Checkout preenchido corretamente.");
    console.log("Pagamento:", pagamentoSelecionado.value);

    mensagemCheckout.textContent = "Pedido confirmado com sucesso!";
    mensagemCheckout.className = "mensagem-checkout sucesso";
  });
}

// ========================================
// CHECKOUT - MÁSCARA DO TELEFONE
// ========================================

const telefoneCheckout = document.querySelector("#telefone");

if (telefoneCheckout) {
  telefoneCheckout.addEventListener("input", function () {
    let telefone = telefoneCheckout.value.replace(/\D/g, "");

    telefone = telefone.substring(0, 11);

    if (telefone.length > 10) {
      telefoneCheckout.value =
        "(" +
        telefone.substring(0, 2) +
        ") " +
        telefone.substring(2, 7) +
        "-" +
        telefone.substring(7);
    } else if (telefone.length > 6) {
      telefoneCheckout.value =
        "(" +
        telefone.substring(0, 2) +
        ") " +
        telefone.substring(2, 6) +
        "-" +
        telefone.substring(6);
    } else if (telefone.length > 2) {
      telefoneCheckout.value =
        "(" + telefone.substring(0, 2) + ") " + telefone.substring(2);
    } else if (telefone.length > 0) {
      telefoneCheckout.value = "(" + telefone;
    }
  });
}
