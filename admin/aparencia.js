import { db, functions } from "./firebase-config.js";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { httpsCallable } from "firebase/functions";

const autorizarUploadBanner = httpsCallable(functions, "autorizarUploadBanner");

const salvarBannerLoja = httpsCallable(functions, "salvarBannerLoja");
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
   APARÊNCIA - BANNERS DAS LOJAS
========================================== */

const lojaAparencia = document.getElementById("lojaAparencia");
const bannerPrincipal = document.getElementById("bannerPrincipal");
const previewBanner = document.getElementById("previewBanner");
const formAparencia = document.getElementById("formAparencia");
const corFundoBanner = document.getElementById("corFundoBanner");

let urlPreview = null;

// Mostrar pré-visualização
bannerPrincipal.addEventListener("change", () => {
  const arquivo = bannerPrincipal.files[0];

  if (urlPreview) {
    URL.revokeObjectURL(urlPreview);
    urlPreview = null;
  }

  previewBanner.removeAttribute("src");
  previewBanner.style.display = "none";

  if (!arquivo) return;

  if (arquivo.size > TAMANHO_MAXIMO_BANNER) {
    alert("A imagem deve ter no máximo 5 MB.");
    bannerPrincipal.value = "";
    return;
  }

  const formatosPermitidos = ["image/jpeg", "image/png", "image/webp"];

  if (!formatosPermitidos.includes(arquivo.type)) {
    alert("Selecione uma imagem JPG, PNG ou WebP.");
    bannerPrincipal.value = "";
    return;
  }

  urlPreview = URL.createObjectURL(arquivo);
  previewBanner.src = urlPreview;
  previewBanner.style.display = "block";
});

// Carregar configurações da loja selecionada
async function carregarAparenciaLoja() {
  const loja = lojaAparencia.value;

  bannerPrincipal.value = "";

  if (urlPreview) {
    URL.revokeObjectURL(urlPreview);
    urlPreview = null;
  }

  previewBanner.removeAttribute("src");
  previewBanner.style.display = "none";

  // Cor padrão quando não existe configuração salva
  corFundoBanner.value = "#ffffff";

  try {
    const referencia = doc(db, "aparenciaLojas", loja);
    const resultado = await getDoc(referencia);

    // Evita aplicar dados de outra loja após uma troca rápida
    if (loja !== lojaAparencia.value) return;

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
          previewBanner.src = configuracao.imagem.url;
          previewBanner.style.display = "block";
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

// Atualizar quando trocar de loja
lojaAparencia.addEventListener("change", carregarAparenciaLoja);

// Carregar a loja inicial
carregarAparenciaLoja();

// Salvamento será implementado com Firebase
formAparencia.addEventListener("submit", async (event) => {
  event.preventDefault();

  const loja = lojaAparencia.value;
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
        alert("Selecione uma imagem para o banner.");
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
