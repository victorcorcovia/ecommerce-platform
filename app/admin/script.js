import {
  carregarCategorias as buscarCategorias,
  cadastrarCategoria,
  editarCategoria,
  excluirCategoria,
} from "./categorias.js";

import {
  buscarProdutos,
  editarProduto,
  cadastrarProduto,
  excluirProduto,
} from "./produtos.js";

import { enviarImagemProduto } from "./cloudinary-upload.js";

import { abrirEditorImagem } from "./componentes/editor-imagem.js";

// ==========================================
// ELEMENTOS - PRODUTOS
// ==========================================

const btnNovoProduto = document.getElementById("btnNovoProduto");
const btnFecharProduto = document.getElementById("btnFecharProduto");
const btnCancelarProduto = document.getElementById("btnCancelarProduto");

const formProduto = document.getElementById("formProduto");
const cadastroProduto = document.getElementById("cadastroProduto");

const lojaProduto = document.getElementById("lojaProduto");
const campoTamanhosProduto = document.getElementById("campoTamanhosProduto");
const nomeProduto = document.getElementById("nomeProduto");
const categoriaProduto = document.getElementById("categoriaProduto");
const precoProduto = document.getElementById("precoProduto");
const estoqueProduto = document.getElementById("estoqueProduto");
const statusProduto = document.getElementById("statusProduto");
const descricaoProduto = document.getElementById("descricaoProduto");

const nomeCorProduto = document.getElementById("nomeCorProduto");
const codigoCorProduto = document.getElementById("codigoCorProduto");
const btnAdicionarCorProduto = document.getElementById(
  "btnAdicionarCorProduto",
);
const listaCoresProduto = document.getElementById("listaCoresProduto");

const fotosProduto = document.getElementById("fotosProduto");
const previewFotosProduto = document.getElementById("previewFotosProduto");

const tabelaProdutos = document.getElementById("tabelaProdutos");
const buscarProduto = document.getElementById("buscarProduto");

// ==========================================
// ELEMENTOS - CATEGORIAS
// ==========================================

const btnNovaCategoria = document.getElementById("btnNovaCategoria");
const btnCancelarCategoria = document.getElementById("btnCancelarCategoria");

const cadastroCategoria = document.getElementById("cadastroCategoria");
const lojaCategoria = document.getElementById("lojaCategoria");
const nomeCategoria = document.getElementById("nomeCategoria");
const tabelaCategorias = document.getElementById("tabelaCategorias");

// ==========================================
// DADOS LOCAIS
// ==========================================

let produtos = [];
let categorias = [];

let produtoEmEdicao = null;
let categoriaEmEdicao = null;
let salvandoProduto = false;
let editandoFotosProduto = false;
let fotosEditadasProduto = [];
let lojaEdicaoFotosProduto = null;
let coresProduto = [];

// ==========================================
// RENDERIZAR CORES DO PRODUTO
// ==========================================

function renderizarCoresProduto() {
  if (!listaCoresProduto) return;

  listaCoresProduto.innerHTML = "";

  listaCoresProduto.style.display = "flex";
  listaCoresProduto.style.flexWrap = "wrap";
  listaCoresProduto.style.gap = "12px";
  listaCoresProduto.style.marginTop = "12px";

  coresProduto.forEach((cor, indice) => {
    const container = document.createElement("div");

    container.style.position = "relative";
    container.style.width = "42px";
    container.style.height = "42px";

    const circulo = document.createElement("div");

    circulo.style.width = "100%";
    circulo.style.height = "100%";
    circulo.style.borderRadius = "50%";
    circulo.style.backgroundColor = cor.codigo;
    circulo.style.border = "2px solid #ccc";
    circulo.title = cor.nome || cor.codigo;

    const remover = document.createElement("button");

    remover.type = "button";
    remover.textContent = "×";
    remover.title = "Remover cor";
    remover.setAttribute("aria-label", "Remover cor");

    remover.style.position = "absolute";
    remover.style.top = "-8px";
    remover.style.right = "-8px";
    remover.style.width = "20px";
    remover.style.height = "20px";
    remover.style.borderRadius = "50%";
    remover.style.border = "none";
    remover.style.backgroundColor = "#dc3545";
    remover.style.color = "#fff";
    remover.style.cursor = "pointer";

    remover.addEventListener("click", () => {
      if (salvandoProduto) return;

      coresProduto.splice(indice, 1);
      renderizarCoresProduto();
    });

    container.appendChild(circulo);
    container.appendChild(remover);

    listaCoresProduto.appendChild(container);
  });
}

let imagensMantidasProduto = [];
let imagensOriginaisProduto = [];

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function obterNomeLoja(loja) {
  if (loja === "closet") return "Closet";
  return loja;
}

function limparFotosProduto() {
  // Limpar as fotografias editadas
  fotosEditadasProduto = [];

  // Limpar o campo de seleção
  if (fotosProduto) {
    fotosProduto.value = "";
  }

  // Limpar as prévias
  if (previewFotosProduto) {
    previewFotosProduto.innerHTML = "";
  }
}
function limparEstadoImagens() {
  imagensMantidasProduto = [];
  imagensOriginaisProduto = [];
}

function fecharFormularioProduto() {
  if (salvandoProduto || editandoFotosProduto) return;

  produtoEmEdicao = null;
  limparEstadoImagens();

  coresProduto = [];
  renderizarCoresProduto();

  tamanhosProduto = [];
  renderizarTamanhosProduto();

  if (cadastroProduto) {
    cadastroProduto.reset();
  }

  if (estoqueProduto) {
    estoqueProduto.disabled = false;
  }

  limparFotosProduto();

  if (formProduto) {
    formProduto.classList.remove("aberto");
  }
}

// ==========================================
// PRODUTOS - ABRIR FORMULÁRIO
// ==========================================

if (btnNovoProduto && formProduto) {
  btnNovoProduto.addEventListener("click", () => {
    if (salvandoProduto || editandoFotosProduto) return;

    produtoEmEdicao = null;
    limparEstadoImagens();

    coresProduto = [];
    renderizarCoresProduto();

    tamanhosProduto = [];
    renderizarTamanhosProduto();

    if (estoqueProduto) {
      estoqueProduto.disabled = false;
    }

    if (cadastroProduto) {
      cadastroProduto.reset();
    }

    limparFotosProduto();
    atualizarCategoriasProduto();
    atualizarVisibilidadeTamanhos();

    formProduto.classList.add("aberto");

    formProduto.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

// ==========================================
// PRODUTOS - FECHAR / CANCELAR
// ==========================================

if (btnFecharProduto) {
  btnFecharProduto.addEventListener("click", fecharFormularioProduto);
}

if (btnCancelarProduto) {
  btnCancelarProduto.addEventListener("click", fecharFormularioProduto);
}

// ==========================================
// PRODUTOS - CADASTRAR / EDITAR
// ==========================================

if (cadastroProduto) {
  cadastroProduto.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (salvandoProduto) return;

    if (editandoFotosProduto) {
      alert(
        "Aguarde a conclusão da edição das fotografias antes de salvar o produto.",
      );
      return;
    }
    const loja = "closet";
    const nome = nomeProduto.value.trim();
    const categoriaId = categoriaProduto.value;
    const preco = Number(precoProduto.value);
    const estoque = Number(estoqueProduto.value);
    const status = statusProduto.value;
    const descricao = descricaoProduto.value.trim();

    const imagensSelecionadas = Array.from(fotosProduto?.files || []);

    // ======================================
    // VALIDAÇÕES
    // ======================================

    if (!loja || !nome || !categoriaId) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    if (!Number.isFinite(preco) || preco < 0) {
      alert("Informe um preço válido.");
      return;
    }

    if (!produtoEmEdicao && (!Number.isSafeInteger(estoque) || estoque < 0)) {
      alert(
        "O estoque inicial deve ser um número inteiro igual ou maior que zero.",
      );
      return;
    }

    for (const arquivo of imagensSelecionadas) {
      if (!arquivo.type.startsWith("image/")) {
        alert(`O arquivo "${arquivo.name}" não é uma imagem válida.`);
        return;
      }

      if (arquivo.size > 10 * 1024 * 1024) {
        alert(`A imagem "${arquivo.name}" ultrapassa o limite de 10 MB.`);
        return;
      }
    }

    // ======================================
    // BLOQUEAR SALVAMENTO DUPLICADO
    // ======================================

    const botaoSalvar = cadastroProduto.querySelector('button[type="submit"]');

    const textoOriginalBotao = botaoSalvar?.textContent || "Salvar produto";

    salvandoProduto = true;

    if (botaoSalvar) {
      botaoSalvar.disabled = true;
      botaoSalvar.textContent = "Salvando produto...";
    }

    try {
      const idProdutoEmEdicao = produtoEmEdicao;

      const dadosProduto = {
        loja,
        nome,
        categoriaId,
        preco,
        status,
        descricao,
        cores: coresProduto.map((cor) => ({
          nome: cor.nome,
          codigo: cor.codigo,
        })),
        tamanhos: [...tamanhosProduto],
        permitePersonalizacao: false,
      };

      // ======================================
      // PRESERVAR FOTOS EXISTENTES
      // ======================================

      let imagensExistentes = [];

      if (idProdutoEmEdicao) {
        const produtoAtual = produtos.find(
          (produto) => produto.id === idProdutoEmEdicao,
        );

        if (!produtoAtual) {
          throw new Error("Produto em edição não encontrado.");
        }

        if (produtoAtual.loja !== loja) {
          throw new Error(
            "Não é permitido alterar a loja de um produto existente.",
          );
        }

        imagensExistentes = [...imagensMantidasProduto];
      }

      // ======================================
      // UPLOAD DAS NOVAS IMAGENS
      // ======================================

      const novasImagens = [];

      for (const arquivo of imagensSelecionadas) {
        if (botaoSalvar) {
          botaoSalvar.textContent = `Enviando foto ${novasImagens.length + 1}/${imagensSelecionadas.length}...`;
        }

        const imagem = await enviarImagemProduto(arquivo, loja);

        novasImagens.push({
          url: imagem.url,
          publicId: imagem.publicId,
        });
      }

      dadosProduto.imagens = [...imagensExistentes, ...novasImagens];

      // ======================================
      // ESTOQUE SOMENTE NO CADASTRO
      // ======================================

      if (!idProdutoEmEdicao) {
        dadosProduto.estoque = estoque;
      }

      if (botaoSalvar) {
        botaoSalvar.textContent = "Salvando produto...";
      }

      // ======================================
      // EDITAR PRODUTO
      // ======================================

      if (idProdutoEmEdicao) {
        await editarProduto(
          idProdutoEmEdicao,
          dadosProduto,
          imagensOriginaisProduto.map((imagem) => imagem.publicId),
        );

        produtoEmEdicao = null;

        alert("Produto atualizado com sucesso!");
      } else {
        // ====================================
        // CADASTRAR PRODUTO
        // ====================================

        await cadastrarProduto(dadosProduto);

        alert("Produto cadastrado com sucesso!");
      }

      // ======================================
      // LIMPAR FORMULÁRIO
      // ======================================

      cadastroProduto.reset();

      coresProduto = [];
      renderizarCoresProduto();

      tamanhosProduto = [];
      // Escolher a grade que melhor corresponde aos tamanhos já salvos.
      if (padraoTamanhosProduto && tamanhosProduto.length > 0) {
        const correspondencias = Object.entries(PADROES_TAMANHOS).map(([chave, padrao]) => ({
          chave,
          quantidade: tamanhosProduto.filter((tamanho) => padrao.tamanhos.includes(tamanho)).length,
        }));
        correspondencias.sort((a, b) => b.quantidade - a.quantidade);
        if (correspondencias[0]?.quantidade > 0) {
          padraoTamanhosProduto.value = correspondencias[0].chave;
        }
      }
      renderizarTamanhosProduto();

      limparFotosProduto();
      limparEstadoImagens();

      if (estoqueProduto) {
        estoqueProduto.disabled = false;
      }

      if (formProduto) {
        formProduto.classList.remove("aberto");
      }

      // ======================================
      // ATUALIZAR LISTAGEM
      // ======================================

      await carregarProdutos();
    } catch (erro) {
      console.error("Erro ao salvar produto:", erro);
      console.error("Código Firebase:", erro?.code);
      console.error("Mensagem Firebase:", erro?.message);

      alert("Não foi possível salvar o produto.");
    } finally {
      salvandoProduto = false;

      if (botaoSalvar) {
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = textoOriginalBotao;
      }
    }
  });
}

// ==========================================
// PRODUTOS - CARREGAR DO FIRESTORE
// ==========================================

async function carregarProdutos() {
  try {
    produtos = await buscarProdutos();

    renderizarProdutos();
    renderizarCategorias();
  } catch (erro) {
    console.error("Erro ao carregar produtos:", erro);
  }
}

// ==========================================
// PRODUTOS - RENDERIZAR
// ==========================================

function renderizarProdutos() {
  if (!tabelaProdutos) return;

  const busca = buscarProduto ? buscarProduto.value.trim().toLowerCase() : "";

  const produtosFiltrados = produtos.filter((produto) => {
    const nomeProdutoBusca = String(produto.nome || "").toLowerCase();

    const correspondeBusca = nomeProdutoBusca.includes(busca);

    return produto.loja === "closet" && correspondeBusca;
  });

  if (produtosFiltrados.length === 0) {
    tabelaProdutos.innerHTML = `
      <tr>
        <td colspan="7" class="sem-dados">
          Nenhum produto encontrado.
        </td>
      </tr>
    `;

    return;
  }

  tabelaProdutos.innerHTML = "";

  produtosFiltrados.forEach((produto) => {
    const categoria = categorias.find(
      (categoria) => categoria.id === produto.categoriaId,
    );

    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${produto.nome}</td>
      <td>${obterNomeLoja(produto.loja)}</td>
      <td>${categoria ? categoria.nome : "-"}</td>
      <td>
        R$ ${Number(produto.preco).toFixed(2).replace(".", ",")}
      </td>
      <td>${produto.estoque}</td>
      <td>${produto.status}</td>
      <td>
        <button
          type="button"
          class="btn-editar btn-editar-produto"
          data-id="${produto.id}"
        >
          Editar
        </button>

        <button
          type="button"
          class="btn-excluir btn-excluir-produto"
          data-id="${produto.id}"
        >
          Excluir
        </button>
      </td>
    `;

    tabelaProdutos.appendChild(linha);
  });
}

// ==========================================
// ADICIONAR CORES AO PRODUTO
// ==========================================

if (btnAdicionarCorProduto) {
  btnAdicionarCorProduto.addEventListener("click", () => {
    if (salvandoProduto) return;

    const codigo = codigoCorProduto.value.toLowerCase();
    const nome = codigo;

    // Evitar cores duplicadas
    const corExistente = coresProduto.some(
      (cor) => cor.codigo.toLowerCase() === codigo,
    );

    if (corExistente) {
      alert("Esta cor já foi adicionada ao produto.");
      return;
    }

    // Adicionar cor à lista
    coresProduto.push({
      nome: nome || codigo,
      codigo,
    });

    // Atualizar círculos na tela
    renderizarCoresProduto();
  });
}

// ==========================================
// PRODUTOS - FILTROS
// ==========================================

if (buscarProduto) {
  buscarProduto.addEventListener("input", renderizarProdutos);
}

// ==========================================
// PRODUTOS - EDITAR / EXCLUIR
// ==========================================

if (tabelaProdutos) {
  tabelaProdutos.addEventListener("click", async (event) => {
    const botaoEditar = event.target.closest(".btn-editar-produto");

    const botaoExcluir = event.target.closest(".btn-excluir-produto");

    // ======================================
    // EDITAR PRODUTO
    // ======================================

    if (botaoEditar) {
      if (salvandoProduto || editandoFotosProduto) return;

      const id = botaoEditar.dataset.id;

      const produto = produtos.find((produto) => produto.id === id);

      if (!produto) return;
      produtoEmEdicao = id;

      lojaProduto.value = produto.loja;

      atualizarCategoriasProduto();
      atualizarVisibilidadeTamanhos();

      nomeProduto.value = produto.nome;
      categoriaProduto.value = produto.categoriaId;
      precoProduto.value = produto.preco;

      estoqueProduto.value = produto.estoque;
      estoqueProduto.disabled = true;

      statusProduto.value = produto.status;
      descricaoProduto.value = produto.descricao || "";

      coresProduto = Array.isArray(produto.cores)
        ? produto.cores.map((cor) => ({ ...cor }))
        : [];

      renderizarCoresProduto();

      // Carregar tamanhos do produto em edição
      tamanhosProduto = Array.isArray(produto.tamanhos)
        ? [...produto.tamanhos]
        : [];

      renderizarTamanhosProduto();

      limparFotosProduto();

      // Guardar imagens existentes
      imagensMantidasProduto = Array.isArray(produto.imagens)
        ? [...produto.imagens]
        : [];

      // Guardar imagens originais separadamente
      imagensOriginaisProduto = [...imagensMantidasProduto];

      // ====================================
      // RENDERIZAR IMAGENS EXISTENTES
      // ====================================

      function renderizarImagensExistentes() {
        // Remove apenas fotos antigas da tela.
        // Preserva previews de novas fotos.
        previewFotosProduto
          .querySelectorAll(".preview-imagem-existente")
          .forEach((elemento) => elemento.remove());

        imagensMantidasProduto.forEach((foto, indice) => {
          const container = document.createElement("div");

          container.classList.add("preview-imagem-existente");

          container.style.display = "inline-block";
          container.style.position = "relative";
          container.style.margin = "8px";

          const imagem = document.createElement("img");

          imagem.src = foto.url;
          imagem.alt = `Foto ${indice + 1}`;
          imagem.style.width = "100px";
          imagem.style.height = "100px";
          imagem.style.objectFit = "cover";
          imagem.style.borderRadius = "8px";

          const botaoRemover = document.createElement("button");

          botaoRemover.type = "button";
          botaoRemover.textContent = "×";
          botaoRemover.title = "Remover esta foto";

          botaoRemover.style.position = "absolute";
          botaoRemover.style.top = "0";
          botaoRemover.style.right = "0";
          botaoRemover.style.background = "#dc3545";
          botaoRemover.style.color = "#fff";
          botaoRemover.style.border = "none";
          botaoRemover.style.borderRadius = "50%";
          botaoRemover.style.width = "24px";
          botaoRemover.style.height = "24px";
          botaoRemover.style.cursor = "pointer";

          botaoRemover.addEventListener("click", () => {
            if (salvandoProduto) return;

            imagensMantidasProduto.splice(indice, 1);

            renderizarImagensExistentes();
          });

          container.appendChild(imagem);
          container.appendChild(botaoRemover);

          previewFotosProduto.appendChild(container);
        });
      }

      renderizarImagensExistentes();

      formProduto.classList.add("aberto");

      formProduto.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    // ======================================
    // EXCLUIR PRODUTO
    // ======================================

    if (botaoExcluir) {
      if (salvandoProduto) return;

      const id = botaoExcluir.dataset.id;

      const produto = produtos.find((produto) => produto.id === id);

      if (!produto) return;

      const confirmar = confirm(`Deseja excluir o produto "${produto.nome}"?`);

      if (!confirmar) return;

      try {
        // Exclusão atual: apenas Firestore.
        // Limpeza do Cloudinary será integrada depois.
        await excluirProduto(id, produto.loja);

        await carregarProdutos();
      } catch (erro) {
        console.error("Erro ao excluir produto:", erro);

        alert("Não foi possível excluir o produto.");
      }
    }
  });
}

// ==========================================
// CATEGORIAS - CARREGAR DO FIRESTORE
// ==========================================

async function carregarCategorias() {
  try {
    categorias = await buscarCategorias();

    renderizarCategorias();
    atualizarCategoriasProduto();
  } catch (erro) {
    console.error("Erro ao carregar categorias:", erro);
  }
}

// ==========================================
// CATEGORIAS - ABRIR FORMULÁRIO
// ==========================================

if (btnNovaCategoria && cadastroCategoria) {
  btnNovaCategoria.addEventListener("click", () => {
    categoriaEmEdicao = null;

    cadastroCategoria.reset();
    cadastroCategoria.classList.add("aberto");
  });
}

// ==========================================
// CATEGORIAS - CANCELAR
// ==========================================

if (btnCancelarCategoria && cadastroCategoria) {
  btnCancelarCategoria.addEventListener("click", () => {
    categoriaEmEdicao = null;

    cadastroCategoria.reset();
    cadastroCategoria.classList.remove("aberto");
  });
}

// ==========================================
// CATEGORIAS - RENDERIZAR
// ==========================================

function renderizarCategorias() {
  if (!tabelaCategorias) return;

  const categoriasFiltradas = categorias.filter(
    (categoria) => categoria.loja === "closet",
  );

  if (categoriasFiltradas.length === 0) {
    tabelaCategorias.innerHTML = `
      <tr>
        <td colspan="4" class="sem-dados">
          Nenhuma categoria encontrada.
        </td>
      </tr>
    `;

    return;
  }

  tabelaCategorias.innerHTML = "";

  categoriasFiltradas.forEach((categoria) => {
    const linha = document.createElement("tr");

    const quantidadeProdutos = produtos.filter(
      (produto) => produto.categoriaId === categoria.id,
    ).length;

    linha.innerHTML = `
        <td>${categoria.nome}</td>
        <td>${obterNomeLoja(categoria.loja)}</td>
        <td>${quantidadeProdutos}</td>
        <td>
          <button
            type="button"
            class="btn-editar btn-editar-categoria"
            data-id="${categoria.id}"
          >
            Editar
          </button>

          <button
            type="button"
            class="btn-excluir btn-excluir-categoria"
            data-id="${categoria.id}"
          >
            Excluir
          </button>
        </td>
      `;

    tabelaCategorias.appendChild(linha);
  });
}

// ==========================================
// CATEGORIAS - CADASTRAR / EDITAR
// ==========================================

if (cadastroCategoria) {
  cadastroCategoria.addEventListener("submit", async (event) => {
    event.preventDefault();

    const loja = "closet";
    const nome = nomeCategoria.value.trim();

    if (!loja || !nome) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    try {
      if (categoriaEmEdicao) {
        await editarCategoria(categoriaEmEdicao, loja, nome);

        categoriaEmEdicao = null;
      } else {
        await cadastrarCategoria(loja, nome);
      }

      cadastroCategoria.reset();

      cadastroCategoria.classList.remove("aberto");

      await carregarCategorias();
    } catch (erro) {
      console.error("Erro ao salvar categoria:", erro);

      alert("Não foi possível salvar a categoria.");
    }
  });
}

// ==========================================
// CATEGORIAS - EDITAR / EXCLUIR
// ==========================================

if (tabelaCategorias) {
  tabelaCategorias.addEventListener("click", async (event) => {
    const botaoEditar = event.target.closest(".btn-editar-categoria");

    const botaoExcluir = event.target.closest(".btn-excluir-categoria");

    // ======================================
    // EDITAR CATEGORIA
    // ======================================

    if (botaoEditar) {
      const id = botaoEditar.dataset.id;

      const categoria = categorias.find((categoria) => categoria.id === id);

      if (!categoria) return;

      categoriaEmEdicao = id;

      lojaCategoria.value = categoria.loja;

      nomeCategoria.value = categoria.nome;

      cadastroCategoria.classList.add("aberto");

      cadastroCategoria.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      return;
    }

    // ======================================
    // EXCLUIR CATEGORIA
    // ======================================

    if (botaoExcluir) {
      const id = botaoExcluir.dataset.id;

      const categoria = categorias.find((categoria) => categoria.id === id);

      if (!categoria) return;

      const produtosDaCategoria = produtos.filter(
        (produto) => produto.categoriaId === id,
      );

      if (produtosDaCategoria.length > 0) {
        alert(
          `Esta categoria possui ${produtosDaCategoria.length} produto(s). Altere a categoria desses produtos antes de excluí-la.`,
        );

        return;
      }

      const confirmar = confirm(
        `Deseja excluir a categoria "${categoria.nome}"?`,
      );

      if (!confirmar) return;

      try {
        await excluirCategoria(id);

        await carregarCategorias();

        alert("Categoria excluída com sucesso!");
      } catch (erro) {
        console.error("Erro ao excluir categoria:", erro);

        alert("Não foi possível excluir a categoria.");
      }
    }
  });
}

// ==========================================
// CATEGORIAS NO CADASTRO DE PRODUTO
// ==========================================

function atualizarCategoriasProduto() {
  if (!lojaProduto || !categoriaProduto) {
    return;
  }

  const lojaSelecionada = lojaProduto.value;

  categoriaProduto.innerHTML = `
    <option value="">
      Selecione uma categoria
    </option>
  `;

  if (!lojaSelecionada) {
    categoriaProduto.disabled = true;
    return;
  }

  const categoriasDaLoja = categorias.filter(
    (categoria) => categoria.loja === lojaSelecionada,
  );

  if (categoriasDaLoja.length === 0) {
    categoriaProduto.innerHTML = `
      <option value="">
        Nenhuma categoria cadastrada
      </option>
    `;

    categoriaProduto.disabled = true;
    return;
  }

  categoriasDaLoja.forEach((categoria) => {
    const option = document.createElement("option");

    option.value = categoria.id;
    option.textContent = categoria.nome;

    categoriaProduto.appendChild(option);
  });

  categoriaProduto.disabled = false;
}

// ==========================================
// ALTERAR LOJA NO CADASTRO DE PRODUTO
// ==========================================

// ==========================================
// ALTERAR LOJA NO CADASTRO DE PRODUTO
// ==========================================

function atualizarVisibilidadeTamanhos() {
  if (!campoTamanhosProduto) return;
  campoTamanhosProduto.style.display = "block";
}

atualizarVisibilidadeTamanhos();

// ==========================================
// PRODUTOS - PRÉ-VISUALIZAÇÃO DAS FOTOS
// ==========================================

function atualizarPreviewFotos() {
  if (!previewFotosProduto || !fotosProduto) {
    return;
  }

  // Remove apenas miniaturas novas.
  // Mantém as fotos antigas visíveis.
  previewFotosProduto
    .querySelectorAll(".preview-imagem-nova")
    .forEach((elemento) => elemento.remove());

  const arquivos = Array.from(fotosProduto.files || []);

  arquivos.forEach((arquivo, indice) => {
    if (!arquivo.type.startsWith("image/")) {
      return;
    }

    const container = document.createElement("div");

    container.classList.add("preview-imagem-nova");

    container.style.position = "relative";
    container.style.display = "inline-block";
    container.style.margin = "8px";

    const imagem = document.createElement("img");

    const urlTemporaria = URL.createObjectURL(arquivo);

    imagem.src = urlTemporaria;
    imagem.alt = arquivo.name;
    imagem.style.width = "100px";
    imagem.style.height = "100px";
    imagem.style.objectFit = "cover";
    imagem.style.borderRadius = "8px";

    imagem.addEventListener("load", () => URL.revokeObjectURL(urlTemporaria), {
      once: true,
    });

    const botaoRemover = document.createElement("button");

    botaoRemover.type = "button";
    botaoRemover.textContent = "×";
    botaoRemover.title = "Remover imagem";

    botaoRemover.style.position = "absolute";
    botaoRemover.style.top = "0";
    botaoRemover.style.right = "0";
    botaoRemover.style.background = "#dc3545";
    botaoRemover.style.color = "#fff";
    botaoRemover.style.border = "none";
    botaoRemover.style.borderRadius = "50%";
    botaoRemover.style.width = "24px";
    botaoRemover.style.height = "24px";
    botaoRemover.style.cursor = "pointer";

    botaoRemover.addEventListener("click", () => {
      if (salvandoProduto || editandoFotosProduto) return;

      const transferencia = new DataTransfer();

      arquivos.forEach((item, posicao) => {
        if (posicao !== indice) {
          transferencia.items.add(item);
        }
      });

      fotosEditadasProduto = Array.from(transferencia.files);
      fotosProduto.files = transferencia.files;

      atualizarPreviewFotos();
    });

    container.appendChild(imagem);
    container.appendChild(botaoRemover);

    previewFotosProduto.appendChild(container);
  });
}

if (fotosProduto) {
  fotosProduto.addEventListener("change", async () => {
    if (editandoFotosProduto || salvandoProduto) return;

    const arquivos = Array.from(fotosProduto.files || []);
    if (arquivos.length === 0) return;

    const loja = "closet";

    editandoFotosProduto = true;
    lojaEdicaoFotosProduto = loja;
    fotosProduto.disabled = true;

    const transferencia = new DataTransfer();

    try {
      // Preservar somente as fotografias editadas anteriormente
      for (const arquivoAnterior of fotosEditadasProduto) {
        transferencia.items.add(arquivoAnterior);
      }
      for (const arquivo of arquivos) {
        if (!arquivo.type.startsWith("image/")) {
          alert(`O arquivo "${arquivo.name}" não é uma imagem válida.`);
          continue;
        }

        if (arquivo.size > 10 * 1024 * 1024) {
          alert(`A imagem "${arquivo.name}" ultrapassa 10 MB.`);
          continue;
        }

        const proporcao = 3 / 4;

        const imagemEditada = await abrirEditorImagem(arquivo, {
          loja,
          proporcao,
          largura: 900,
          altura: 1200,
        });

        if (imagemEditada) {
          transferencia.items.add(imagemEditada);
        }
      }

      fotosEditadasProduto = Array.from(transferencia.files);

      fotosProduto.files = transferencia.files;
      atualizarPreviewFotos();
    } catch (erro) {
      console.error("Erro ao editar fotografias:", erro);
      alert("Não foi possível editar uma das fotografias.");

      // Preservar todas as fotografias editadas até o momento
      fotosEditadasProduto = Array.from(transferencia.files);
      fotosProduto.files = transferencia.files;

      atualizarPreviewFotos();
    } finally {
      editandoFotosProduto = false;
      lojaEdicaoFotosProduto = null;
      fotosProduto.disabled = false;
    }
  });
}

// ==========================================
// INICIAR PAINEL
// ==========================================

async function iniciarPainel() {
  await carregarCategorias();
  await carregarProdutos();

  renderizarCategorias();
}

iniciarPainel();

// ===============================
// TAMANHOS DOS PRODUTOS
// ===============================

let tamanhosProduto = [];

const PADROES_TAMANHOS = {
  alfabeticos: {
    descricao: "Tamanhos em letras para roupas e vestuário.",
    tamanhos: ["PP", "P", "M", "G", "GG", "XG", "XGG", "G1", "G2", "G3", "G4", "G5"],
  },
  "vestuario-numerico": {
    descricao: "Numeração brasileira de roupas (confirme a grade do fabricante).",
    tamanhos: Array.from({ length: 17 }, (_, indice) => String(32 + indice * 2)),
  },
  infantil: {
    descricao: "Numeração de roupas infantis.",
    tamanhos: ["1", "2", "3", "4", "6", "8", "10", "12", "14", "16"],
  },
  calcados: {
    descricao: "Numeração brasileira de calçados.",
    tamanhos: Array.from({ length: 19 }, (_, indice) => String(27 + indice)),
  },
  bebe: {
    descricao: "Faixas etárias para roupas de bebê.",
    tamanhos: ["RN", "0–3 meses", "3–6 meses", "6–9 meses", "9–12 meses", "12–18 meses", "18–24 meses"],
  },
};

const padraoTamanhosProduto = document.getElementById("padraoTamanhosProduto");
const descricaoPadraoTamanhosProduto = document.getElementById("descricaoPadraoTamanhosProduto");
const opcoesTamanhosProduto = document.getElementById("opcoesTamanhosProduto");
const resumoTamanhosProduto = document.getElementById("resumoTamanhosProduto");
const contadorTamanhosProduto = document.getElementById("contadorTamanhosProduto");
const listaTamanhosSelecionadosProduto = document.getElementById("listaTamanhosSelecionadosProduto");
const limparTamanhosProduto = document.getElementById("limparTamanhosProduto");

function renderizarTamanhosProduto() {
  if (!opcoesTamanhosProduto || !padraoTamanhosProduto) return;

  const padrao = PADROES_TAMANHOS[padraoTamanhosProduto.value] || PADROES_TAMANHOS.alfabeticos;
  if (descricaoPadraoTamanhosProduto) descricaoPadraoTamanhosProduto.textContent = padrao.descricao;
  if (contadorTamanhosProduto) contadorTamanhosProduto.textContent = `${tamanhosProduto.length} selecionados`;

  opcoesTamanhosProduto.replaceChildren();
  padrao.tamanhos.forEach((tamanho) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "grade-tamanhos-opcao";
    botao.textContent = tamanho;
    botao.setAttribute("aria-pressed", String(tamanhosProduto.includes(tamanho)));
    botao.addEventListener("click", () => {
      if (salvandoProduto) return;
      if (tamanhosProduto.includes(tamanho)) {
        tamanhosProduto = tamanhosProduto.filter((item) => item !== tamanho);
      } else {
        tamanhosProduto.push(tamanho);
      }
      renderizarTamanhosProduto();
    });
    opcoesTamanhosProduto.appendChild(botao);
  });

  if (listaTamanhosSelecionadosProduto) {
    listaTamanhosSelecionadosProduto.replaceChildren();
    if (tamanhosProduto.length === 0) {
      const vazio = document.createElement("span");
      vazio.className = "grade-tamanhos-vazio";
      vazio.textContent = "Nenhum tamanho selecionado.";
      listaTamanhosSelecionadosProduto.appendChild(vazio);
    } else {
      tamanhosProduto.forEach((tamanho) => {
        const chip = document.createElement("span");
        chip.className = "grade-tamanhos-chip";
        chip.textContent = tamanho;
        listaTamanhosSelecionadosProduto.appendChild(chip);
      });
    }
  }
  if (resumoTamanhosProduto) {
    resumoTamanhosProduto.textContent = tamanhosProduto.length === 0
      ? "Selecione os tamanhos para disponibilizar na loja"
      : `${tamanhosProduto.length} tamanho(s) disponível(is) para venda`;
  }
}

padraoTamanhosProduto?.addEventListener("change", renderizarTamanhosProduto);
limparTamanhosProduto?.addEventListener("click", () => {
  if (salvandoProduto) return;
  tamanhosProduto = [];
  renderizarTamanhosProduto();
});
renderizarTamanhosProduto();


/* ==========================================
   LOLLY - FORMULÁRIO DE EMBALAGENS
========================================== */

const btnNovaEmbalagem = document.getElementById("btnNovaEmbalagem");
const btnCancelarEmbalagem = document.getElementById("btnCancelarEmbalagem");
const cadastroEmbalagem = document.getElementById("cadastroEmbalagem");

if (btnNovaEmbalagem && btnCancelarEmbalagem && cadastroEmbalagem) {
  btnNovaEmbalagem.addEventListener("click", () => {
    cadastroEmbalagem.reset();
    cadastroEmbalagem.classList.add("aberto");
    document.getElementById("nomeEmbalagem")?.focus();
  });

  btnCancelarEmbalagem.addEventListener("click", () => {
    cadastroEmbalagem.reset();
    cadastroEmbalagem.classList.remove("aberto");
  });
}

// Harmoniza o menu nativo da grade de tamanhos com o tema ativo do painel.
// Observa mudanças de tema sem alterar as preferências salvas do usuário.
function atualizarTemaSeletorTamanhos() {
  if (!padraoTamanhosProduto) return;
  const cor = getComputedStyle(padraoTamanhosProduto).color;
  const valores = cor.match(/[\d.]+/g);
  if (!valores || valores.length < 3) return;
  const [r, g, b] = valores.slice(0, 3).map(Number);
  const textoClaro = (r * 0.2126 + g * 0.7152 + b * 0.0722) > 145;
  padraoTamanhosProduto.style.setProperty('--lolly-esquema-select', textoClaro ? 'dark' : 'light');
  padraoTamanhosProduto.style.setProperty('--lolly-opcao-fundo', textoClaro ? '#252932' : '#ffffff');
  padraoTamanhosProduto.style.setProperty('--lolly-opcao-texto', textoClaro ? '#f5f6f8' : '#20242c');
}

atualizarTemaSeletorTamanhos();
const observadorTemaTamanhos = new MutationObserver(atualizarTemaSeletorTamanhos);
observadorTemaTamanhos.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-tema', 'style'] });
observadorTemaTamanhos.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-tema', 'style'] });
