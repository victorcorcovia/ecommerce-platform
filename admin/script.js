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

// ==========================================
// ELEMENTOS - PRODUTOS
// ==========================================

const btnNovoProduto = document.getElementById("btnNovoProduto");
const btnFecharProduto = document.getElementById("btnFecharProduto");
const btnCancelarProduto = document.getElementById("btnCancelarProduto");

const formProduto = document.getElementById("formProduto");
const cadastroProduto = document.getElementById("cadastroProduto");

const lojaProduto = document.getElementById("lojaProduto");
const nomeProduto = document.getElementById("nomeProduto");
const categoriaProduto = document.getElementById("categoriaProduto");
const precoProduto = document.getElementById("precoProduto");
const estoqueProduto = document.getElementById("estoqueProduto");
const statusProduto = document.getElementById("statusProduto");
const descricaoProduto = document.getElementById("descricaoProduto");

const fotosProduto = document.getElementById("fotosProduto");
const previewFotosProduto = document.getElementById("previewFotosProduto");

const tabelaProdutos = document.getElementById("tabelaProdutos");
const filtroLoja = document.getElementById("filtroLoja");
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

let imagensMantidasProduto = [];
let imagensOriginaisProduto = [];

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function obterNomeLoja(loja) {
  if (loja === "closet") return "Closet";
  if (loja === "3d") return "Decor 3D";
  return loja;
}

function limparFotosProduto() {
  if (fotosProduto) {
    fotosProduto.value = "";
  }

  if (previewFotosProduto) {
    previewFotosProduto.innerHTML = "";
  }
}

function limparEstadoImagens() {
  imagensMantidasProduto = [];
  imagensOriginaisProduto = [];
}

function fecharFormularioProduto() {
  if (salvandoProduto) return;

  produtoEmEdicao = null;
  limparEstadoImagens();

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
    if (salvandoProduto) return;

    produtoEmEdicao = null;
    limparEstadoImagens();

    if (estoqueProduto) {
      estoqueProduto.disabled = false;
    }

    if (cadastroProduto) {
      cadastroProduto.reset();
    }

    limparFotosProduto();
    atualizarCategoriasProduto();

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

    const loja = lojaProduto.value;
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

    if (!["closet", "3d"].includes(loja)) {
      alert("Selecione uma loja válida.");
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

      alert(
        `Não foi possível salvar o produto.\n\n${
          erro.message || "Erro desconhecido."
        }`,
      );
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

  const lojaSelecionada = filtroLoja ? filtroLoja.value : "todas";

  const busca = buscarProduto ? buscarProduto.value.trim().toLowerCase() : "";

  const produtosFiltrados = produtos.filter((produto) => {
    const correspondeLoja =
      lojaSelecionada === "todas" || produto.loja === lojaSelecionada;

    const nomeProdutoBusca = String(produto.nome || "").toLowerCase();

    const correspondeBusca = nomeProdutoBusca.includes(busca);

    return correspondeLoja && correspondeBusca;
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
// PRODUTOS - FILTROS
// ==========================================

if (filtroLoja) {
  filtroLoja.addEventListener("change", () => {
    renderizarProdutos();
    renderizarCategorias();
  });
}

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
      if (salvandoProduto) return;

      const id = botaoEditar.dataset.id;

      const produto = produtos.find((produto) => produto.id === id);

      if (!produto) return;

      produtoEmEdicao = id;

      lojaProduto.value = produto.loja;

      atualizarCategoriasProduto();

      nomeProduto.value = produto.nome;
      categoriaProduto.value = produto.categoriaId;
      precoProduto.value = produto.preco;

      estoqueProduto.value = produto.estoque;
      estoqueProduto.disabled = true;

      statusProduto.value = produto.status;
      descricaoProduto.value = produto.descricao || "";

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
        await excluirProduto(id);

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

  const categoriasFiltradas = categorias.filter((categoria) => {
    if (!filtroLoja || filtroLoja.value === "todas") {
      return true;
    }

    return categoria.loja === filtroLoja.value;
  });

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

    const loja = lojaCategoria.value;
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

if (lojaProduto) {
  lojaProduto.addEventListener("change", atualizarCategoriasProduto);
}

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
      if (salvandoProduto) {
        return;
      }

      const transferencia = new DataTransfer();

      arquivos.forEach((item, posicao) => {
        if (posicao !== indice) {
          transferencia.items.add(item);
        }
      });

      fotosProduto.files = transferencia.files;

      atualizarPreviewFotos();
    });

    container.appendChild(imagem);
    container.appendChild(botaoRemover);

    previewFotosProduto.appendChild(container);
  });
}

if (fotosProduto) {
  fotosProduto.addEventListener("change", atualizarPreviewFotos);
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
