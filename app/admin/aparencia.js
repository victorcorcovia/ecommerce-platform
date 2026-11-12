import { db, functions } from "./firebase-config.js";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { httpsCallable } from "firebase/functions";
import { abrirEditorImagem } from "./componentes/editor-imagem.js";

const autorizarUploadBanner = httpsCallable(functions, "autorizarUploadBanner");

const salvarBannerLoja = httpsCallable(functions, "salvarBannerLoja");
const removerBannerLoja = httpsCallable(functions, "removerBannerLoja");
const TAMANHO_MAXIMO_BANNER = 5 * 1024 * 1024;

async function enviarImagemBanner(arquivo, loja) {
  const autorizacao = await autorizarUploadBanner({ loja });
  const dados = autorizacao.data;

  if (!dados.autorizado) {
    throw new Error("Upload não autorizado.");
  }

  const formulario = new FormData();

  formulario.append("file", arquivo);
  formulario.append("api_key", dados.apiKey);
  formulario.append("timestamp", String(dados.timestamp));
  formulario.append("signature", dados.signature);
  formulario.append("folder", dados.folder);
  formulario.append("public_id", dados.publicId);
  formulario.append("overwrite", "false");

  const resposta = await fetch(
    `https://api.cloudinary.com/v1_1/${dados.cloudName}/image/upload`,
    {
      method: "POST",
      body: formulario,
    },
  );

  const resultado = await resposta.json();

  if (!resposta.ok) {
    throw new Error(resultado.error?.message || "Erro ao enviar imagem.");
  }

  return {
    url: resultado.secure_url,
    publicId: resultado.public_id,
  };
}

/* ==========================================
   APARÊNCIA - BANNERS DA CLOSET
========================================== */

const LOJA = "closet";
const bannerPrincipal = document.getElementById("bannerPrincipal");

let versaoSelecaoBanner = 0;
let editandoBanner = false;

const previewBanner = document.getElementById("previewBanner");
const containerPreviewBanner = document.getElementById(
  "containerPreviewBanner",
);

const removerPreviewBanner = document.getElementById("removerPreviewBanner");

let imagemBannerSalva = null;
const formAparencia = document.getElementById("formAparencia");
const corFundoBanner = document.getElementById("corFundoBanner");

let urlPreview = null;

function limparPreviewBanner() {
  if (urlPreview) {
    URL.revokeObjectURL(urlPreview);
    urlPreview = null;
  }

  previewBanner.removeAttribute("src");
  previewBanner.style.display = "none";

  containerPreviewBanner.style.display = "none";
  removerPreviewBanner.style.display = "none";
}

function mostrarPreviewBanner(url, temporaria = false) {
  if (!url) return;

  previewBanner.src = url;
  previewBanner.style.display = "block";

  containerPreviewBanner.style.display = "inline-block";

  removerPreviewBanner.style.display = "flex";
}

/* Pré-visualização do banner com editor de recorte */
bannerPrincipal.addEventListener("change", async () => {
  const arquivo = bannerPrincipal.files[0];

  // Identifica a seleção atual do arquivo
  const versaoAtual = ++versaoSelecaoBanner;

  limparPreviewBanner();

  if (!arquivo) {
    mostrarPreviewBanner(imagemBannerSalva?.url);
    return;
  }

  if (arquivo.size > TAMANHO_MAXIMO_BANNER) {
    alert("A imagem deve ter no máximo 5 MB.");
    bannerPrincipal.value = "";
    mostrarPreviewBanner(imagemBannerSalva?.url);
    return;
  }

  const formatosPermitidos = ["image/jpeg", "image/png", "image/webp"];

  if (!formatosPermitidos.includes(arquivo.type)) {
    alert("Selecione uma imagem JPG, PNG ou WebP.");
    bannerPrincipal.value = "";
    mostrarPreviewBanner(imagemBannerSalva?.url);
    return;
  }

  editandoBanner = true;

  try {
    const recortado = await abrirEditorImagem(arquivo, {
      proporcao: 3 / 1,
      largura: 1920,
      altura: 640,
    });

    // Impede aplicar o recorte de uma seleção anterior.
    if (versaoAtual !== versaoSelecaoBanner) {
      return;
    }

    if (!recortado) {
      bannerPrincipal.value = "";
      mostrarPreviewBanner(imagemBannerSalva?.url);
      return;
    }

    if (recortado.size > TAMANHO_MAXIMO_BANNER) {
      alert("A imagem recortada ultrapassou 5 MB.");
      bannerPrincipal.value = "";
      mostrarPreviewBanner(imagemBannerSalva?.url);
      return;
    }

    const transferencia = new DataTransfer();
    transferencia.items.add(recortado);
    bannerPrincipal.files = transferencia.files;

    urlPreview = URL.createObjectURL(recortado);
    mostrarPreviewBanner(urlPreview, true);
  } catch (erro) {
    console.error("Erro ao editar banner:", erro);

    bannerPrincipal.value = "";
    mostrarPreviewBanner(imagemBannerSalva?.url);

    alert("Não foi possível editar a imagem do banner.");
  } finally {
    editandoBanner = false;
  }
});

removerPreviewBanner.addEventListener("click", async () => {
  // Se a imagem ainda não foi salva, apenas cancelar a seleção.
  if (bannerPrincipal.files.length > 0) {
    bannerPrincipal.value = "";
    limparPreviewBanner();

    if (imagemBannerSalva?.url) {
      mostrarPreviewBanner(imagemBannerSalva.url);
    }

    return;
  }

  // Se não existe imagem salva, não há nada para remover.
  if (!imagemBannerSalva?.publicId) return;

  const loja = LOJA;
  const publicId = imagemBannerSalva.publicId;

  const confirmou = confirm("Deseja remover o banner cadastrado desta loja?");

  if (!confirmou) return;

  const botaoSalvar = formAparencia.querySelector('button[type="submit"]');

  removerPreviewBanner.disabled = true;
  if (botaoSalvar) botaoSalvar.disabled = true;

  try {
    await removerBannerLoja({
      loja,
      publicId,
    });

    // Atualizar a tela com os dados salvos no Firebase.
    await carregarAparenciaLoja();

    alert("Banner removido com sucesso!");
  } catch (erro) {
    console.error("Erro ao remover banner:", erro);
    alert("Não foi possível remover o banner: " + erro.message);
  } finally {
    removerPreviewBanner.disabled = false;
    if (botaoSalvar) botaoSalvar.disabled = false;
  }
});

// Carregar configurações da Closet
async function carregarAparenciaLoja() {
  const loja = LOJA;

  bannerPrincipal.value = "";
  imagemBannerSalva = null;
  limparPreviewBanner();

  corFundoBanner.value = "#ffffff";

  try {
    const referencia = doc(db, "aparenciaLojas", loja);
    const resultado = await getDoc(referencia);

    if (resultado.exists()) {
      const configuracao = resultado.data();

      if (configuracao.tipo === "cor" && configuracao.cor) {
        corFundoBanner.value = configuracao.cor;
      }

      if (configuracao.tipo === "imagem") {
        const opcaoImagem = document.querySelector(
          'input[name="tipoBanner"][value="imagem"]',
        );

        if (opcaoImagem) opcaoImagem.checked = true;

        if (configuracao.imagem?.url) {
          imagemBannerSalva = configuracao.imagem;
          mostrarPreviewBanner(imagemBannerSalva.url);
        }
      } else {
        const opcaoCor = document.querySelector(
          'input[name="tipoBanner"][value="cor"]',
        );

        if (opcaoCor) opcaoCor.checked = true;
      }
    } else {
      const opcaoCor = document.querySelector(
        'input[name="tipoBanner"][value="cor"]',
      );

      if (opcaoCor) opcaoCor.checked = true;
    }

    atualizarPreviewCorBanner();
    atualizarTipoBanner();
  } catch (erro) {
    console.error("Erro ao carregar aparência:", erro);
  }
}

// Carregar a Closet
carregarAparenciaLoja();

// Salvamento será implementado com Firebase
formAparencia.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (editandoBanner) {
    alert("Conclua ou cancele o recorte antes de salvar o banner.");
    return;
  }

  const loja = LOJA;
  const tipo = document.querySelector(
    'input[name="tipoBanner"]:checked',
  )?.value;

  if (!["cor", "imagem"].includes(tipo)) {
    alert("Selecione o tipo de banner.");
    return;
  }

  const botaoSalvar = formAparencia.querySelector('button[type="submit"]');

  if (botaoSalvar) botaoSalvar.disabled = true;

  try {
    if (tipo === "cor") {
      await salvarBannerLoja({
        loja,
        tipo: "cor",
        cor: corFundoBanner.value,
      });
    } else {
      const arquivo = bannerPrincipal.files[0];

      if (!arquivo) {
        if (!imagemBannerSalva?.url) {
          alert("Selecione uma imagem para o banner.");
          return;
        }

        await salvarBannerLoja({
          loja,
          tipo: "imagem",
          imagem: imagemBannerSalva,
        });

        alert("Banner salvo com sucesso!");
        await carregarAparenciaLoja();
        return;
      }

      if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
        alert("Selecione uma imagem JPG, PNG ou WebP.");
        return;
      }

      if (arquivo.size > TAMANHO_MAXIMO_BANNER) {
        alert("A imagem deve ter no máximo 5 MB.");
        return;
      }

      const imagem = await enviarImagemBanner(arquivo, loja);

      await salvarBannerLoja({
        loja,
        tipo: "imagem",
        imagem,
      });
    }

    alert("Banner salvo com sucesso!");
    await carregarAparenciaLoja();
  } catch (erro) {
    console.error("Erro ao salvar banner:", erro);
    alert("Não foi possível salvar o banner: " + erro.message);
  } finally {
    if (botaoSalvar) botaoSalvar.disabled = false;
  }
});

// ==========================================
// PRÉ-VISUALIZAÇÃO DA COR DO BANNER
// ==========================================

const previewCorBanner = document.createElement("div");

previewCorBanner.style.width = "100%";
previewCorBanner.style.height = "120px";
previewCorBanner.style.borderRadius = "8px";
previewCorBanner.style.marginTop = "12px";
previewCorBanner.style.border = "1px solid #ddd";

corFundoBanner.insertAdjacentElement("afterend", previewCorBanner);

function atualizarPreviewCorBanner() {
  previewCorBanner.style.backgroundColor = corFundoBanner.value;
}

corFundoBanner.addEventListener("input", atualizarPreviewCorBanner);

atualizarPreviewCorBanner();

// ==========================================
// ALTERNAR ENTRE IMAGEM E COR
// ==========================================

const opcoesTipoBanner = document.querySelectorAll('input[name="tipoBanner"]');

const campoImagemBanner = document.getElementById("campoImagemBanner");
const campoCorBanner = document.getElementById("campoCorBanner");

function atualizarTipoBanner() {
  const tipoSelecionado = document.querySelector(
    'input[name="tipoBanner"]:checked',
  )?.value;

  campoImagemBanner.style.display = tipoSelecionado === "imagem" ? "" : "none";

  campoCorBanner.style.display = tipoSelecionado === "cor" ? "" : "none";
}

opcoesTipoBanner.forEach((opcao) => {
  opcao.addEventListener("change", atualizarTipoBanner);
});

atualizarTipoBanner();
