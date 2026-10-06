// ==========================================
// PAINEL ADMINISTRATIVO - LOLLY / 3D
// ==========================================


// ==========================================
// PRODUTOS - ABRIR / FECHAR FORMULÁRIO
// ==========================================

const btnNovoProduto = document.getElementById("btnNovoProduto");
const btnFecharProduto = document.getElementById("btnFecharProduto");
const btnCancelarProduto = document.getElementById("btnCancelarProduto");
const formProduto = document.getElementById("formProduto");

// Abrir formulário de produto
if (btnNovoProduto && formProduto) {
  btnNovoProduto.addEventListener("click", () => {
    formProduto.classList.add("aberto");

    formProduto.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

// Fechar formulário pelo X
if (btnFecharProduto && formProduto) {
  btnFecharProduto.addEventListener("click", () => {
    formProduto.classList.remove("aberto");
  });
}

// Fechar formulário pelo botão Cancelar
if (btnCancelarProduto && formProduto) {
  btnCancelarProduto.addEventListener("click", () => {
    formProduto.classList.remove("aberto");
  });
}


// ==========================================
// CATEGORIAS
// ==========================================

const btnNovaCategoria = document.getElementById("btnNovaCategoria");
const btnCancelarCategoria = document.getElementById("btnCancelarCategoria");

const cadastroCategoria = document.getElementById("cadastroCategoria");
const lojaCategoria = document.getElementById("lojaCategoria");
const nomeCategoria = document.getElementById("nomeCategoria");
const tabelaCategorias = document.getElementById("tabelaCategorias");


// Recuperar categorias salvas
let categorias =
  JSON.parse(localStorage.getItem("categoriasLojasLolly")) || [];


// ==========================================
// SALVAR CATEGORIAS
// ==========================================

function salvarCategorias() {
  localStorage.setItem(
    "categoriasLojasLolly",
    JSON.stringify(categorias)
  );
}


// ==========================================
// NOME DA LOJA
// ==========================================

function obterNomeLoja(loja) {
  if (loja === "lolly") {
    return "Lolly";
  }

  if (loja === "3d") {
    return "3D";
  }

  return loja;
}


// ==========================================
// ABRIR FORMULÁRIO DE CATEGORIA
// ==========================================

if (btnNovaCategoria && cadastroCategoria) {
  btnNovaCategoria.addEventListener("click", () => {
    cadastroCategoria.classList.add("aberto");
  });
}


// ==========================================
// CANCELAR CADASTRO DE CATEGORIA
// ==========================================

if (btnCancelarCategoria && cadastroCategoria) {
  btnCancelarCategoria.addEventListener("click", () => {
    cadastroCategoria.classList.remove("aberto");
    cadastroCategoria.reset();
  });
}


// ==========================================
// MOSTRAR CATEGORIAS NA TABELA
// ==========================================

function renderizarCategorias() {
  if (!tabelaCategorias) {
    return;
  }

  if (categorias.length === 0) {
    tabelaCategorias.innerHTML = `
      <tr>
        <td colspan="4" class="sem-dados">
          Nenhuma categoria cadastrada.
        </td>
      </tr>
    `;

    return;
  }

  tabelaCategorias.innerHTML = "";

  categorias.forEach((categoria) => {
    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${categoria.nome}</td>

      <td>${obterNomeLoja(categoria.loja)}</td>

      <td>0</td>

      <td>
        <button
          type="button"
          class="btn-editar"
          onclick="editarCategoria('${categoria.id}')"
        >
          Editar
        </button>

        <button
          type="button"
          class="btn-excluir"
          onclick="excluirCategoria('${categoria.id}')"
        >
          Excluir
        </button>
      </td>
    `;

    tabelaCategorias.appendChild(linha);
  });
}


// ==========================================
// CADASTRAR NOVA CATEGORIA
// ==========================================

if (cadastroCategoria) {
  cadastroCategoria.addEventListener("submit", (event) => {
    event.preventDefault();

    const loja = lojaCategoria.value;
    const nome = nomeCategoria.value.trim();

    if (!loja || !nome) {
      return;
    }

    const novaCategoria = {
      id: Date.now().toString(),
      loja: loja,
      nome: nome
    };

    categorias.push(novaCategoria);

    salvarCategorias();
    renderizarCategorias();

    cadastroCategoria.reset();
    cadastroCategoria.classList.remove("aberto");
  });
}


// ==========================================
// EDITAR CATEGORIA
// ==========================================

function editarCategoria(id) {
  const categoria = categorias.find(
    (categoria) => categoria.id === id
  );

  if (!categoria) {
    return;
  }

  const novoNome = prompt(
    "Digite o novo nome da categoria:",
    categoria.nome
  );

  if (novoNome === null) {
    return;
  }

  const nomeTratado = novoNome.trim();

  if (!nomeTratado) {
    return;
  }

  categoria.nome = nomeTratado;

  salvarCategorias();
  renderizarCategorias();
}


// ==========================================
// EXCLUIR CATEGORIA
// ==========================================

function excluirCategoria(id) {
  const categoria = categorias.find(
    (categoria) => categoria.id === id
  );

  if (!categoria) {
    return;
  }

  const confirmar = confirm(
    `Deseja excluir a categoria "${categoria.nome}"?`
  );

  if (!confirmar) {
    return;
  }

  categorias = categorias.filter(
    (categoria) => categoria.id !== id
  );

  salvarCategorias();
  renderizarCategorias();
}


// ==========================================
// INICIALIZAÇÃO
// ==========================================

renderizarCategorias();

// ==========================================
// CATEGORIAS NO CADASTRO DE PRODUTO
// ==========================================

const lojaProduto = document.getElementById("lojaProduto");
const categoriaProduto = document.getElementById("categoriaProduto");


// Atualiza as categorias disponíveis
// de acordo com a loja selecionada
function atualizarCategoriasProduto() {
  if (!lojaProduto || !categoriaProduto) {
    return;
  }

  const lojaSelecionada = lojaProduto.value;

  // Limpa as opções atuais
  categoriaProduto.innerHTML = `
    <option value="">Selecione uma categoria</option>
  `;

  // Se nenhuma loja estiver selecionada
  if (!lojaSelecionada) {
    categoriaProduto.disabled = true;
    return;
  }

  // Busca apenas categorias da loja selecionada
  const categoriasDaLoja = categorias.filter(
    (categoria) => categoria.loja === lojaSelecionada
  );

  // Se a loja ainda não tiver categorias
  if (categoriasDaLoja.length === 0) {
    categoriaProduto.innerHTML = `
      <option value="">
        Nenhuma categoria cadastrada
      </option>
    `;

    categoriaProduto.disabled = true;
    return;
  }

  // Adiciona as categorias
  categoriasDaLoja.forEach((categoria) => {
    const option = document.createElement("option");

    option.value = categoria.id;
    option.textContent = categoria.nome;

    categoriaProduto.appendChild(option);
  });

  categoriaProduto.disabled = false;
}


// Quando mudar a loja
if (lojaProduto) {
  lojaProduto.addEventListener("change", () => {
    atualizarCategoriasProduto();
  });
}


// Configuração inicial
atualizarCategoriasProduto();