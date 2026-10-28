// ==========================================
// CARRINHO - CARREGAR DADOS SALVOS
// ==========================================

let carrinho = JSON.parse(localStorage.getItem("carrinhoLolly3D")) || [];

// ==========================================
// ELEMENTOS
// ==========================================

const contadorCarrinho = document.querySelector("#contador-carrinho");

const botaoAbrirCarrinho = document.querySelector("#abrir-carrinho");

const botaoFecharCarrinho = document.querySelector("#fechar-carrinho");

const painelCarrinho = document.querySelector("#painel-carrinho");

const conteudoCarrinho = document.querySelector("#conteudo-carrinho");

// ==========================================
// ATUALIZAR CONTADOR
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

function atualizarEstoqueHome() {
  const estoqueGuitarra = document.querySelector("#estoque-guitarra");
  const estoqueCopo = document.querySelector("#estoque-copo");

  let guitarraNoCarrinho = 0;
  let copoNoCarrinho = 0;

  carrinho.forEach(function (item) {
    if (item.nome === "Chaveiro Guitarra") {
      guitarraNoCarrinho += item.quantidade;
    }

    if (item.nome === "Chaveiro Copo") {
      copoNoCarrinho += item.quantidade;
    }
  });

  if (estoqueGuitarra) {
    const restanteGuitarra = Math.max(
      0,
      produtos.guitarra.estoque - guitarraNoCarrinho,
    );

    estoqueGuitarra.textContent = `${restanteGuitarra} unidades em estoque`;
  }
  if (estoqueCopo) {
    const restanteCopo = Math.max(0, produtos.copo.estoque - copoNoCarrinho);

    estoqueCopo.textContent = `${restanteCopo} unidades em estoque`;
  }
}

// Executa quando a página abre
atualizarContadorCarrinho();

// ==========================================
// ABRIR CARRINHO
// ==========================================

if (botaoAbrirCarrinho && painelCarrinho) {
  botaoAbrirCarrinho.addEventListener("click", function (event) {
    event.preventDefault();

    atualizarCarrinho();

    painelCarrinho.classList.add("aberto");
  });
}

// ==========================================
// FECHAR CARRINHO
// ==========================================

if (botaoFecharCarrinho && painelCarrinho) {
  botaoFecharCarrinho.addEventListener("click", function () {
    painelCarrinho.classList.remove("aberto");
  });
}

// ==========================================
// MOSTRAR PRODUTOS
// ==========================================

function atualizarCarrinho() {
  if (!conteudoCarrinho) {
    return;
  }

  conteudoCarrinho.innerHTML = "";

  // CARRINHO VAZIO

  if (carrinho.length === 0) {
    conteudoCarrinho.innerHTML = "<p>O carrinho está vazio.</p>";

    return;
  }

  // PRODUTOS

  carrinho.forEach(function (item, index) {
    const totalItem = item.preco * item.quantidade;

    conteudoCarrinho.innerHTML += `
  <div class="item-carrinho">

    <h3>
      ${item.nome}
    </h3>

    ${item.cor ? `<p>Cor: ${item.cor}</p>` : ""}

    ${
      item.personalizacao
        ? `<p class="personalizacao-carrinho">
            Nome: ${item.personalizacao}
           </p>`
        : ""
    }

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
}

// ==========================================
// AUMENTAR QUANTIDADE
// ==========================================

function aumentarQuantidade(index) {
  const item = carrinho[index];
  // Controle de estoque para produtos do Firebase
  if (item.id) {
    const quantidadeTotal = carrinho.reduce(function (total, produto) {
      return produto.id === item.id
        ? total + Number(produto.quantidade || 0)
        : total;
    }, 0);

    if (
      !Number.isInteger(Number(item.estoque)) ||
      quantidadeTotal >= Number(item.estoque)
    ) {
      return;
    }

    item.quantidade++;
    salvarCarrinho();
    return;
  }

  const produtoCorrespondente = Object.values(produtos).find(
    function (produto) {
      return produto.nome === item.nome;
    },
  );

  // Produtos personalizados não possuem limite de estoque
  if (produtoCorrespondente && !produtoCorrespondente.personalizacao) {
    let quantidadeTotalProduto = 0;

    carrinho.forEach(function (itemCarrinho) {
      if (itemCarrinho.nome === item.nome) {
        quantidadeTotalProduto += itemCarrinho.quantidade;
      }
    });

    if (quantidadeTotalProduto >= produtoCorrespondente.estoque) {
      return;
    }
  }

  item.quantidade++;

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
    localStorage.removeItem("cepLolly3D");
    localStorage.removeItem("freteLolly3D");
    valorFreteCarrinho = 0;
  }

  salvarCarrinho();
}

// ==========================================
// INTEGRAÇÃO DO CARRINHO COM O FIREBASE
// ==========================================

window.adicionarProdutoFirebaseAoCarrinho = function (item) {
  if (!item || typeof item.id !== "string" || !item.id.trim()) {
    return false;
  }

  const preco = Number(item.preco);
  const quantidade = Number(item.quantidade);
  const estoque = Number(item.estoque);

  if (
    !Number.isFinite(preco) ||
    preco <= 0 ||
    !Number.isInteger(quantidade) ||
    quantidade < 1 ||
    !Number.isInteger(estoque) ||
    estoque < 0
  ) {
    return false;
  }

  if (
    typeof item.nome !== "string" ||
    !item.nome.trim() ||
    typeof item.imagem !== "string" ||
    !item.imagem.trim()
  ) {
    return false;
  }

  const cor = item.cor ?? null;
  const personalizacao = item.personalizacao ?? null;

  if (cor !== null && (typeof cor !== "string" || !cor.trim())) {
    return false;
  }

  if (
    personalizacao !== null &&
    (typeof personalizacao !== "string" ||
      !personalizacao.trim() ||
      personalizacao.length > 60)
  ) {
    return false;
  }

  // Verifica todas as unidades desse produto no carrinho.
  const quantidadeNoCarrinho = carrinho.reduce(function (total, produto) {
    return produto.id === item.id
      ? total + Number(produto.quantidade || 0)
      : total;
  }, 0);

  if (quantidadeNoCarrinho + quantidade > estoque) {
    return false;
  }

  // Mesmo ID, mesma cor e mesma personalização.
  const itemExistente = carrinho.find(function (produtoCarrinho) {
    return (
      produtoCarrinho.id === item.id &&
      (produtoCarrinho.cor ?? null) === cor &&
      (produtoCarrinho.personalizacao ?? null) === personalizacao
    );
  });

  if (itemExistente) {
    itemExistente.quantidade += quantidade;
    itemExistente.estoque = estoque;
  } else {
    carrinho.push({
      id: item.id,
      nome: item.nome.trim(),
      preco,
      imagem: item.imagem,
      cor,
      personalizacao,
      quantidade,
      estoque,
    });
  }

  salvarCarrinho();

  return true;
};

// ==========================================
// SALVAR CARRINHO
// ==========================================

function salvarCarrinho() {
  localStorage.setItem("carrinhoLolly3D", JSON.stringify(carrinho));

  atualizarContadorCarrinho();
  atualizarCarrinho();
  atualizarEstoqueDisponivel();
  atualizarEstoqueHome();
  atualizarEstoqueCatalogo();
  atualizarPaginaCarrinho();
}

function atualizarEstoqueDisponivel() {
  if (!produtoAtual || !produtoEstoque) {
    return;
  }

  // Produto personalizado não possui estoque limitado
  if (produtoAtual.personalizacao) {
    produtoEstoque.textContent = "Personalizado do seu jeito";

    if (campoQuantidadeProduto) {
      campoQuantidadeProduto.removeAttribute("max");
    }

    return;
  }

  // Produtos de pronta entrega possuem estoque
  let quantidadeNoCarrinho = 0;

  carrinho.forEach(function (item) {
    if (item.nome === produtoAtual.nome) {
      quantidadeNoCarrinho += item.quantidade;
    }
  });

  const estoqueRestante = Math.max(
    0,
    produtoAtual.estoque - quantidadeNoCarrinho,
  );

  produtoEstoque.textContent = `Estoque disponível: ${estoqueRestante} unidades`;

  if (campoQuantidadeProduto) {
    campoQuantidadeProduto.max = estoqueRestante;
  }
}

// ==========================================
// CÁLCULO DE FRETE - DEMONSTRAÇÃO
// ==========================================

const campoCep = document.querySelector("#cep-frete");

const cepSalvoCarrinho3D = localStorage.getItem("cepLolly3D");

if (campoCep && cepSalvoCarrinho3D) {
  campoCep.value =
    cepSalvoCarrinho3D.substring(0, 5) + "-" + cepSalvoCarrinho3D.substring(5);
}

const botaoCalcularFrete = document.querySelector("#calcular-frete");

const resultadoFrete = document.querySelector("#resultado-frete");

// ==========================================
// FORMATAR CEP AUTOMATICAMENTE
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
    // Pega o CEP e deixa somente os números
    const cep = campoCep.value.replace(/\D/g, "");

    // Verifica se possui 8 números
    if (cep.length !== 8) {
      resultadoFrete.innerHTML = `
                    <p class="erro-frete">
                        Digite um CEP válido.
                    </p>
                `;

      return;
    }

    // SALVAR CEP E FRETE
    localStorage.setItem("cepLolly3D", cep);
    localStorage.setItem("freteLolly3D", 18.9);

    // ==================================
    // FRETE SIMULADO
    // ==================================

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

// ==========================================
// PRODUTOS - PÁGINA DE DETALHES
// ==========================================

const produtos = {
  guitarra: {
    nome: "Chaveiro Guitarra",
    preco: 8.0,
    descricao: "Chaveiro produzido em impressão 3D.",

    imagens: [
      "https://placehold.co/600x600?text=Guitarra+Frente",
      "https://placehold.co/600x600?text=Guitarra+Costas",
      "https://placehold.co/600x600?text=Guitarra+Detalhe",
    ],

    cores: [
      { nome: "Preto", codigo: "#222222" },
      { nome: "Vermelho", codigo: "#C0392B" },
      { nome: "Azul", codigo: "#2980B9" },
    ],

    estoque: 20,
  },

  copo: {
    nome: "Chaveiro Copo",
    preco: 8.0,
    descricao: "Chaveiro produzido em impressão 3D.",

    imagens: [
      "https://placehold.co/600x600?text=Copo+Frente",
      "https://placehold.co/600x600?text=Copo+Costas",
      "https://placehold.co/600x600?text=Copo+Detalhe",
    ],

    cores: [
      { nome: "Preto", codigo: "#222222" },
      { nome: "Branco", codigo: "#F5F5F5" },
      { nome: "Verde", codigo: "#789B7A" },
    ],

    estoque: 15,
  },

  nome: {
    nome: "Chaveiro Nome",
    preco: 8.0,
    descricao: "Chaveiro personalizado produzido em impressão 3D.",

    imagens: [
      "https://placehold.co/600x600?text=Nome+Frente",
      "https://placehold.co/600x600?text=Nome+Costas",
      "https://placehold.co/600x600?text=Nome+Detalhe",
    ],

    cores: [
      { nome: "Preto", codigo: "#222222" },
      { nome: "Branco", codigo: "#F5F5F5" },
      { nome: "Rosa", codigo: "#DFA6B3" },
      { nome: "Azul", codigo: "#2980B9" },
    ],

    personalizacao: true,
  },
};

atualizarEstoqueHome();

// ==========================================
// CARREGAR PRODUTO PELA URL
// ==========================================

const parametrosURL = new URLSearchParams(window.location.search);
const idProduto = parametrosURL.get("id");

let produtoAtual = produtos[idProduto] || null;

const produtoNome = document.querySelector("#produto-nome");
const produtoPreco = document.querySelector("#produto-preco");

const produtoDescricao = document.querySelector("#produto-descricao");
const produtoImagem = document.querySelector("#produto-imagem");

const produtoEstoque = document.querySelector("#produto-estoque");
const campoQuantidadeProduto = document.querySelector("#quantidade-produto");

const campoPersonalizacao = document.querySelector("#personalizacao-produto");
const nomePersonalizado = document.querySelector("#nome-personalizado");

const botaoConfirmarPersonalizacao = document.querySelector(
  "#confirmar-personalizacao",
);

const mensagemPersonalizacao = document.querySelector(
  "#personalizacao-confirmada",
);

let nomeConfirmado = "";
let corSelecionada = null;
window.nomePersonalizadoConfirmadoFirebase = "";
if (
  botaoConfirmarPersonalizacao &&
  nomePersonalizado &&
  mensagemPersonalizacao
) {
  botaoConfirmarPersonalizacao.addEventListener("click", function () {
    const nome = nomePersonalizado.value.trim();

    if (nome === "") {
      mensagemPersonalizacao.textContent = "Digite um nome antes de confirmar.";

      mensagemPersonalizacao.className = "mensagem-erro";
      return;
    }

    nomeConfirmado = nome;
    window.nomePersonalizadoConfirmadoFirebase = nome;

    mensagemPersonalizacao.textContent = `Nome confirmado: ${nome}`;

    mensagemPersonalizacao.className = "mensagem-sucesso";
  });
}

if (nomePersonalizado) {
  nomePersonalizado.addEventListener("input", function () {
    nomeConfirmado = "";
    window.nomePersonalizadoConfirmadoFirebase = "";

    if (mensagemPersonalizacao) {
      mensagemPersonalizacao.textContent = "";
    }
  });
}

if (
  produtoAtual &&
  produtoNome &&
  produtoPreco &&
  produtoDescricao &&
  produtoImagem
) {
  produtoNome.textContent = produtoAtual.nome;
  produtoPreco.textContent = `R$ ${produtoAtual.preco.toFixed(2).replace(".", ",")}`;
  produtoDescricao.textContent = produtoAtual.descricao;
  document.title = produtoAtual.nome + " | Lolly Decor 3D";

  if (produtoAtual.personalizacao) {
    produtoEstoque.textContent = "Produto feito sob encomenda";
  } else {
    produtoEstoque.textContent = `Estoque disponível: ${produtoAtual.estoque} unidades`;
  }

  if (campoQuantidadeProduto) {
    if (produtoAtual.personalizacao) {
      campoQuantidadeProduto.removeAttribute("max");
    } else {
      campoQuantidadeProduto.max = produtoAtual.estoque;
    }
  }

  if (campoPersonalizacao) {
    if (produtoAtual.personalizacao) {
      campoPersonalizacao.style.display = "block";
    } else {
      campoPersonalizacao.style.display = "none";
    }

    atualizarEstoqueDisponivel();
  }

  if (produtoAtual.imagens && produtoAtual.imagens.length > 0) {
    produtoImagem.src = produtoAtual.imagens[0];
    produtoImagem.alt = produtoAtual.nome;
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
        produtoImagem.src = imagem;

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
  // CORES DO PRODUTO
  // ========================================

  const secaoCores = document.querySelector("#produto-cores");
  const coresProduto = document.querySelector("#produto-cores .cores");

  if (coresProduto && secaoCores) {
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

  // ========================================
  // SETAS DA GALERIA
  // ========================================

  const botaoFotoAnterior = document.querySelector("#foto-anterior");
  const botaoFotoProxima = document.querySelector("#foto-proxima");

  let indiceFotoAtual = 0;

  function trocarFoto(indice) {
    if (!produtoAtual || !produtoAtual.imagens || !produtoImagem) {
      return;
    }

    indiceFotoAtual = indice;

    produtoImagem.src = produtoAtual.imagens[indiceFotoAtual];

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
}

// ==========================================
// ADICIONAR PRODUTO PELA PÁGINA DE DETALHES
// ==========================================

const botaoAdicionarProduto = document.querySelector("#adicionar-produto");

const mensagemProduto = document.querySelector("#mensagem-produto");

if (botaoAdicionarProduto && campoQuantidadeProduto && produtoAtual) {
  botaoAdicionarProduto.addEventListener("click", function () {
    const quantidade = Number(campoQuantidadeProduto.value);

    if (!produtoAtual.personalizacao) {
      let quantidadeNoCarrinho = 0;

      carrinho.forEach(function (item) {
        if (item.nome === produtoAtual.nome) {
          quantidadeNoCarrinho += item.quantidade;
        }
      });

      const estoqueRestante = produtoAtual.estoque - quantidadeNoCarrinho;

      if (quantidade > estoqueRestante) {
        mensagemProduto.textContent = `Quantidade máxima disponível: ${estoqueRestante} unidades.`;
        return;
      }
    }

    if (quantidade < 1) {
      return;
    }

    if (produtoAtual.personalizacao && nomeConfirmado === "") {
      mensagemProduto.textContent =
        "Confirme o nome da personalização antes de adicionar ao carrinho.";

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

    const itemExistente = carrinho.find(function (item) {
      const mesmoProduto = item.nome === produtoAtual.nome;

      const mesmaCor = item.cor === corSelecionada;

      const mesmaPersonalizacao =
        item.personalizacao ===
        (produtoAtual.personalizacao ? nomeConfirmado : null);

      return mesmoProduto && mesmaCor && mesmaPersonalizacao;
    });

    if (itemExistente) {
      const quantidadeFinal = itemExistente.quantidade + quantidade;

      if (
        !produtoAtual.personalizacao &&
        quantidadeFinal > produtoAtual.estoque
      ) {
        mensagemProduto.textContent = `Você já possui ${itemExistente.quantidade} no carrinho. Estoque máximo: ${produtoAtual.estoque} unidades.`;
        return;
      }

      itemExistente.quantidade += quantidade;
    } else {
      const item = {
        nome: produtoAtual.nome,
        preco: produtoAtual.preco,
        estoque: Number(produto.estoque) || 0,
        imagem: produtoAtual.imagens[0],
        cor: corSelecionada,
        quantidade: quantidade,
        personalizacao: produtoAtual.personalizacao ? nomeConfirmado : null,
      };
      carrinho.push(item);
    }

    salvarCarrinho();

    if (mensagemProduto) {
      mensagemProduto.textContent = "Produto adicionado ao carrinho!";

      setTimeout(function () {
        mensagemProduto.textContent = "";
      }, 2000);
    }
  });
}

// =================================
// FILTROS DO CATÁLOGO
// =================================

const botoesFiltro = document.querySelectorAll(".filtro-produto");
const produtosCatalogo = document.querySelectorAll(".pagina-catalogo .produto");

botoesFiltro.forEach((botao) => {
  botao.addEventListener("click", () => {
    const filtroSelecionado = botao.getAttribute("data-filtro");

    botoesFiltro.forEach((btn) => {
      btn.classList.remove("ativo");
    });

    botao.classList.add("ativo");

    produtosCatalogo.forEach((produto) => {
      const categoriaProduto = produto.getAttribute("data-categoria");

      if (
        filtroSelecionado === "todos" ||
        categoriaProduto === filtroSelecionado
      ) {
        produto.style.display = "block";
      } else {
        produto.style.display = "none";
      }
    });
  });
});

// =================================
// ESTOQUE DO CATÁLOGO
// =================================

function atualizarEstoqueCatalogo() {
  const estoqueGuitarra = document.getElementById("estoque-guitarra");
  const estoqueCopo = document.getElementById("estoque-copo");

  // Quantidades máximas
  const estoqueTotal = {
    guitarra: produtos.guitarra.estoque,
    copo: produtos.copo.estoque,
  };

  // Soma quanto de cada produto está no carrinho
  const quantidadeGuitarra = carrinho
    .filter((item) => item.nome === "Chaveiro Guitarra")
    .reduce((total, item) => total + item.quantidade, 0);

  const quantidadeCopo = carrinho
    .filter((item) => item.nome === "Chaveiro Copo")
    .reduce((total, item) => total + item.quantidade, 0);

  // Atualiza apenas se estivermos na página do catálogo
  if (estoqueGuitarra) {
    const restante = Math.max(0, estoqueTotal.guitarra - quantidadeGuitarra);
    estoqueGuitarra.textContent = `${restante} disponíveis`;
  }

  if (estoqueCopo) {
    const restante = Math.max(0, estoqueTotal.copo - quantidadeCopo);
    estoqueCopo.textContent = `${restante} disponíveis`;
  }
}

atualizarEstoqueCatalogo();

// ==========================================
// PÁGINA COMPLETA DO CARRINHO
// ==========================================

const carrinhoPagina = document.querySelector("#carrinho-pagina");

let valorFreteCarrinho = Number(localStorage.getItem("freteLolly3D")) || 0;

function atualizarPaginaCarrinho() {
  if (!carrinhoPagina) {
    return;
  }

  carrinhoPagina.innerHTML = "";

  // CARRINHO VAZIO
  if (carrinho.length === 0) {
    carrinhoPagina.innerHTML = `
      <p>Seu carrinho está vazio.</p>
    `;

    return;
  }

  let subtotal = 0;

  // PRODUTOS
  carrinho.forEach(function (item, index) {
    const totalItem = item.preco * item.quantidade;

    subtotal += totalItem;

    carrinhoPagina.innerHTML += `
  <div class="item-carrinho-pagina">

    <div class="info-item-carrinho">

      <h3>${item.nome}</h3>

      ${item.cor ? `<p>Cor: ${item.cor}</p>` : ""}

      ${item.personalizacao ? `<p>Nome: ${item.personalizacao}</p>` : ""}

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

      <strong>
        R$ ${subtotal.toFixed(2).replace(".", ",")}
      </strong>
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
          localStorage.getItem("cepLolly3D")
            ? localStorage.getItem("cepLolly3D").substring(0, 5) +
              "-" +
              localStorage.getItem("cepLolly3D").substring(5)
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

  // TOTAL
  const totalCarrinho = subtotal + valorFreteCarrinho;

  carrinhoPagina.innerHTML += `
    <div class="total-pagina-carrinho">
      <span>Total:</span>

      <strong>
        R$ ${totalCarrinho.toFixed(2).replace(".", ",")}
      </strong>
    </div>
  `;

  // FINALIZAR
  carrinhoPagina.innerHTML += `
    <a href="checkout.html" class="btn-finalizar-compra">
      Finalizar compra
    </a>
  `;

  configurarFretePaginaCarrinho();
}

// ==========================================
// FRETE - PÁGINA COMPLETA DO CARRINHO
// ==========================================

function configurarFretePaginaCarrinho() {
  const campoCepCarrinho = document.querySelector("#cep-carrinho");

  const botaoFreteCarrinho = document.querySelector("#calcular-frete-carrinho");

  const resultadoFreteCarrinho = document.querySelector(
    "#resultado-frete-carrinho",
  );

  if (!botaoFreteCarrinho || !campoCepCarrinho) {
    return;
  }

  // FORMATAÇÃO DO CEP
  campoCepCarrinho.addEventListener("input", function () {
    let cep = campoCepCarrinho.value.replace(/\D/g, "");

    cep = cep.substring(0, 8);

    if (cep.length > 5) {
      cep = cep.substring(0, 5) + "-" + cep.substring(5);
    }

    campoCepCarrinho.value = cep;
  });

  // CALCULAR FRETE
  botaoFreteCarrinho.addEventListener("click", function () {
    const cep = campoCepCarrinho.value.replace(/\D/g, "");

    if (cep.length !== 8) {
      resultadoFreteCarrinho.innerHTML = `
        <p class="erro-frete">
          Digite um CEP válido.
        </p>
      `;

      return;
    }

    // FRETE SIMULADO
    valorFreteCarrinho = 18.9;

    localStorage.setItem("cepLolly3D", cep);
    localStorage.setItem("freteLolly3D", valorFreteCarrinho);

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
  });
}

atualizarPaginaCarrinho();

// ==========================================
// RESUMO DO PEDIDO - CHECKOUT
// ==========================================

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

          ${item.cor ? `<p>Cor: ${item.cor}</p>` : ""}
          
          ${item.personalizacao ? `<p>Nome: ${item.personalizacao}</p>` : ""}

          <p>Quantidade: ${item.quantidade}</p>
        </div>

        <strong>
          R$ ${totalItem.toFixed(2).replace(".", ",")}
        </strong>

      </div>
    `;
  });

  const freteCheckout = Number(localStorage.getItem("freteLolly3D")) || 0;

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

// ==========================================
// VALIDAÇÃO DO CHECKOUT
// ==========================================

const formCheckout = document.querySelector(".checkout-conteudo");

if (formCheckout) {
  const campoNome = document.querySelector("#nome");
  const campoEmail = document.querySelector("#email");
  const campoTelefone = document.querySelector("#telefone");
  const campoCepCheckout = document.querySelector("#cep-checkout");
  const cepSalvo3D = localStorage.getItem("cepLolly3D");

  if (campoCepCheckout && cepSalvo3D) {
    campoCepCheckout.value =
      cepSalvo3D.substring(0, 5) + "-" + cepSalvo3D.substring(5);
  }
  const campoRua = document.querySelector("#rua");
  const campoNumero = document.querySelector("#numero");
  const campoBairro = document.querySelector("#bairro");
  const campoCidade = document.querySelector("#cidade");
  const campoEstado = document.querySelector("#estado");
  const opcoesPagamento = document.querySelectorAll('input[name="pagamento"]');
  const botaoFinalizarPedido = document.querySelector("#finalizar-pedido");
  const mensagemCheckout = document.querySelector("#mensagem-checkout");

  // ------------------------------------------
  // MOSTRAR / LIMPAR ERRO EM UM CAMPO
  // ------------------------------------------

  function mostrarErroCampo(campo, mensagem) {
    campo.classList.add("campo-invalido");

    let erro = campo.parentElement.querySelector(".erro-campo");

    if (!erro) {
      erro = document.createElement("p");
      erro.className = "erro-campo";
      campo.parentElement.appendChild(erro);
    }

    erro.textContent = mensagem;
  }

  function limparErroCampo(campo) {
    campo.classList.remove("campo-invalido");

    const erro = campo.parentElement.querySelector(".erro-campo");

    if (erro) {
      erro.remove();
    }
  }

  // ------------------------------------------
  // FORMATAR TELEFONE AUTOMATICAMENTE
  // ------------------------------------------

  if (campoTelefone) {
    campoTelefone.addEventListener("input", function () {
      let telefone = campoTelefone.value.replace(/\D/g, "");
      telefone = telefone.substring(0, 11);

      if (telefone.length > 10) {
        telefone = telefone.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
      } else if (telefone.length > 5) {
        telefone = telefone.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
      } else if (telefone.length > 2) {
        telefone = telefone.replace(/(\d{2})(\d{0,5})/, "($1) $2");
      }

      campoTelefone.value = telefone;
    });
  }

  // ------------------------------------------
  // FORMATAR CEP + BUSCAR ENDEREÇO NA VIACEP
  // ------------------------------------------

  if (campoCepCheckout) {
    campoCepCheckout.addEventListener("input", function () {
      let cep = campoCepCheckout.value.replace(/\D/g, "");
      cep = cep.substring(0, 8);

      if (cep.length > 5) {
        cep = cep.substring(0, 5) + "-" + cep.substring(5);
      }

      campoCepCheckout.value = cep;

      localStorage.removeItem("freteLolly3D");
      atualizarResumoCheckout();
    });

    campoCepCheckout.addEventListener("blur", async function () {
      const cep = campoCepCheckout.value.replace(/\D/g, "");

      if (cep.length === 0) {
        return;
      }

      if (cep.length !== 8) {
        mostrarErroCampo(
          campoCepCheckout,
          "Digite um CEP válido com 8 números.",
        );

        return;
      }

      limparErroCampo(campoCepCheckout);

      campoCepCheckout.disabled = true;

      try {
        const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dados = await resposta.json();

        // A ViaCEP devolve 200 com { erro: true } quando o CEP não existe
        if (dados.erro) {
          mostrarErroCampo(campoCepCheckout, "CEP não encontrado.");
          return;
        }

        if (campoRua) campoRua.value = dados.logradouro || "";
        if (campoBairro) campoBairro.value = dados.bairro || "";
        if (campoCidade) campoCidade.value = dados.localidade || "";
        if (campoEstado) campoEstado.value = dados.uf || "";
        localStorage.setItem("cepLolly3D", cep);
        localStorage.setItem("freteLolly3D", 18.9);

        atualizarResumoCheckout();

        if (campoNumero) {
          campoNumero.focus();
        }
      } catch (erro) {
        mostrarErroCampo(
          campoCepCheckout,
          "Não foi possível buscar o CEP. Tente novamente.",
        );
      } finally {
        campoCepCheckout.disabled = false;
      }
    });

    if (cepSalvo3D && cepSalvo3D.length === 8) {
      campoCepCheckout.dispatchEvent(new Event("blur"));
    }
  }

  // ------------------------------------------
  // VALIDAÇÕES INDIVIDUAIS
  // ------------------------------------------

  function validarNome() {
    const valor = campoNome.value.trim();

    if (valor.length < 3) {
      mostrarErroCampo(campoNome, "Digite seu nome completo.");
      return false;
    }

    if (!valor.includes(" ")) {
      mostrarErroCampo(campoNome, "Digite nome e sobrenome.");
      return false;
    }

    limparErroCampo(campoNome);
    return true;
  }

  function validarEmail() {
    const valor = campoEmail.value.trim();
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regexEmail.test(valor)) {
      mostrarErroCampo(campoEmail, "Digite um e-mail válido.");
      return false;
    }

    limparErroCampo(campoEmail);
    return true;
  }

  function validarTelefone() {
    const valor = campoTelefone.value.replace(/\D/g, "");

    if (valor.length < 10) {
      mostrarErroCampo(campoTelefone, "Digite um telefone válido com DDD.");
      return false;
    }

    limparErroCampo(campoTelefone);
    return true;
  }

  function validarCep() {
    const valor = campoCepCheckout.value.replace(/\D/g, "");

    if (valor.length !== 8) {
      mostrarErroCampo(campoCepCheckout, "Digite um CEP válido.");
      return false;
    }

    // Se a ViaCEP já marcou como não encontrado, continua bloqueando
    const erroAtual =
      campoCepCheckout.parentElement.querySelector(".erro-campo");

    if (erroAtual) {
      return false;
    }

    return true;
  }

  function validarCampoTexto(campo, mensagem) {
    if (campo.value.trim().length === 0) {
      mostrarErroCampo(campo, mensagem);
      return false;
    }

    limparErroCampo(campo);
    return true;
  }

  function validarPagamento() {
    const selecionado = Array.from(opcoesPagamento).some(function (opcao) {
      return opcao.checked;
    });

    if (!selecionado) {
      mensagemCheckout.textContent = "Selecione uma forma de pagamento.";
      mensagemCheckout.className = "mensagem-checkout mensagem-erro";
      return false;
    }

    return true;
  }

  // ------------------------------------------
  // VALIDAÇÃO COMPLETA AO FINALIZAR
  // ------------------------------------------

  if (botaoFinalizarPedido) {
    botaoFinalizarPedido.addEventListener("click", function () {
      // Carrinho vazio não pode finalizar
      if (carrinho.length === 0) {
        mensagemCheckout.textContent = "Seu carrinho está vazio.";
        mensagemCheckout.className = "mensagem-checkout mensagem-erro";
        return;
      }

      const nomeValido = validarNome();
      const emailValido = validarEmail();
      const telefoneValido = validarTelefone();
      const cepValido = validarCep();
      const ruaValida = validarCampoTexto(campoRua, "Digite a rua.");
      const numeroValido = validarCampoTexto(campoNumero, "Digite o número.");
      const bairroValido = validarCampoTexto(campoBairro, "Digite o bairro.");
      const cidadeValida = validarCampoTexto(campoCidade, "Digite a cidade.");
      const estadoValido = validarCampoTexto(campoEstado, "Digite o estado.");
      const pagamentoValido = validarPagamento();
      const freteValido = Number(localStorage.getItem("freteLolly3D")) > 0;

      const tudoValido =
        nomeValido &&
        emailValido &&
        telefoneValido &&
        cepValido &&
        ruaValida &&
        numeroValido &&
        bairroValido &&
        cidadeValida &&
        estadoValido &&
        pagamentoValido &&
        freteValido;

      if (!tudoValido) {
        if (!freteValido) {
          mensagemCheckout.textContent =
            "Calcule o frete antes de finalizar o pedido.";
        } else {
          mensagemCheckout.textContent =
            "Corrija os campos destacados antes de continuar.";
        }

        mensagemCheckout.className = "mensagem-checkout mensagem-erro";
        return;
      }

      mensagemCheckout.textContent = "Pedido confirmado com sucesso!";
      mensagemCheckout.className = "mensagem-checkout mensagem-sucesso";

      // Aqui depois entra o envio real do pedido
    });
  }
}
