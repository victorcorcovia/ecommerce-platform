import { db, functions } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { abrirEditorImagem } from "./componentes/editor-imagem.js";

const autorizarUpload = httpsCallable(
  functions,
  "autorizarUploadImagemCategoria",
);

const salvarImagem = httpsCallable(functions, "salvarImagemCategoria");
const removerImagem = httpsCallable(functions, "removerImagemCategoria");
const lojaAparencia = document.getElementById("lojaAparencia");
const secao = document.getElementById("secaoImagensCategorias");
const formulario = document.getElementById("formImagemCategoria");
const seletor = document.getElementById("categoriaAparencia");
const campoImagem = document.getElementById("imagemCategoria");
const preview = document.getElementById("previewImagemCategoria");
const botaoRemoverPreview = document.getElementById("removerPreviewCategoria");
const botaoSalvar = document.getElementById("salvarImagemCategoria");
const mensagem = document.getElementById("mensagemImagemCategoria");
const containerPreview = document.getElementById("containerPreviewCategoria");

const MAXIMO_BYTES = 5 * 1024 * 1024;
const FORMATOS = ["image/jpeg", "image/png", "image/webp"];

let imagensSalvas = {};
let urlTemporaria = null;
let versaoCarregamento = 0;
let salvando = false;

function mostrarMensagem(texto) {
  mensagem.textContent = texto;
}

function limparPreview() {
  if (urlTemporaria) {
    URL.revokeObjectURL(urlTemporaria);
    urlTemporaria = null;
  }

  preview.removeAttribute("src");
  containerPreview.style.display = "none";
  botaoRemoverPreview.style.display = "none";
}

function mostrarImagem(url, imagemTemporaria = false) {
  if (!url) return;

  preview.src = url;
  containerPreview.style.display = "inline-block";

  botaoRemoverPreview.style.display = "grid";
}

botaoRemoverPreview.addEventListener("click", async () => {
  // Se existe uma imagem nova selecionada,
  // apenas cancela a seleção.
  if (campoImagem.files.length > 0) {
    campoImagem.value = "";
    limparPreview();

    const categoriaId = seletor.value;
    const imagemSalva = imagensSalvas[categoriaId]?.url;

    if (imagemSalva) {
      mostrarImagem(imagemSalva);
    }

    mostrarMensagem("Seleção de imagem cancelada.");
    return;
  }

  // Se a imagem já está salva, solicita confirmação.
  const categoriaId = seletor.value;
  const imagemSalva = imagensSalvas[categoriaId];

  if (!categoriaId || !imagemSalva?.publicId) return;

  const confirmou = confirm(
    "Deseja remover a imagem cadastrada desta categoria?",
  );

  if (!confirmou) return;

  botaoRemoverPreview.disabled = true;
  botaoSalvar.disabled = true;

  try {
    mostrarMensagem("Removendo imagem...");

    await removerImagem({
      loja: "closet",
      categoriaId,
      publicId: imagemSalva.publicId,
    });

    delete imagensSalvas[categoriaId];
    campoImagem.value = "";
    limparPreview();

    mostrarMensagem("Imagem removida com sucesso!");
  } catch (erro) {
    console.error("Erro ao remover imagem:", erro);
    mostrarMensagem("Não foi possível remover a imagem: " + erro.message);
  } finally {
    botaoRemoverPreview.disabled = false;
    botaoSalvar.disabled = false;
  }
});

function atualizarPreviewCategoria() {
  limparPreview();

  const arquivo = campoImagem.files[0];

  if (arquivo) {
    if (!FORMATOS.includes(arquivo.type) || arquivo.size > MAXIMO_BYTES) {
      mostrarMensagem("Selecione JPG, PNG ou WebP de até 5 MB.");
      campoImagem.value = "";
      return;
    }

    urlTemporaria = URL.createObjectURL(arquivo);
    mostrarImagem(urlTemporaria, true);
    mostrarMensagem("");
    return;
  }

  const categoriaId = seletor.value;
  mostrarImagem(imagensSalvas[categoriaId]?.url);
}

async function carregarCategorias() {
  const versao = ++versaoCarregamento;
  const loja = lojaAparencia.value;

  secao.style.display = loja === "closet" ? "" : "none";

  seletor.replaceChildren();
  campoImagem.value = "";
  limparPreview();
  imagensSalvas = {};
  mostrarMensagem("");

  if (loja !== "closet") return;

  seletor.disabled = true;
  botaoSalvar.disabled = true;

  try {
    const [resultadoCategorias, resultadoAparencia] = await Promise.all([
      getDocs(
        query(collection(db, "categorias"), where("loja", "==", "closet")),
      ),
      getDoc(doc(db, "aparenciaLojas", "closet")),
    ]);

    if (versao !== versaoCarregamento) return;

    imagensSalvas = resultadoAparencia.exists()
      ? resultadoAparencia.data().imagensCategorias || {}
      : {};

    const categorias = resultadoCategorias.docs
      .map((documento) => ({
        id: documento.id,
        nome: documento.data().nome || documento.id,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    seletor.add(new Option("Selecione uma categoria", ""));

    for (const categoria of categorias) {
      seletor.add(new Option(categoria.nome, categoria.id));
    }

    mostrarMensagem(
      categorias.length ? "" : "Nenhuma categoria cadastrada para a Closet.",
    );
  } catch (erro) {
    console.error("Erro ao carregar categorias:", erro);
    mostrarMensagem("Não foi possível carregar as categorias.");
  } finally {
    if (versao === versaoCarregamento) {
      seletor.disabled = false;
      botaoSalvar.disabled = salvando;
    }
  }
}

seletor.addEventListener("change", () => {
  campoImagem.value = "";
  atualizarPreviewCategoria();
  mostrarMensagem("");
});


campoImagem.addEventListener("change", async () => {
  const arquivo = campoImagem.files[0];

  if (!arquivo) return;

  if (!FORMATOS.includes(arquivo.type) || arquivo.size > MAXIMO_BYTES) {
    atualizarPreviewCategoria();
    return;
  }

  try {
    const recortado = await abrirEditorImagem(arquivo, {
      proporcao: 3 / 4,
      largura: 900,
      altura: 1200,
    });

    if (!recortado) {
      campoImagem.value = "";
      atualizarPreviewCategoria();
      return;
    }

    if (recortado.size > MAXIMO_BYTES) {
      campoImagem.value = "";
      atualizarPreviewCategoria();
      mostrarMensagem("A imagem recortada ultrapassou 5 MB.");
      return;
    }

    const transferencia = new DataTransfer();
    transferencia.items.add(recortado);
    campoImagem.files = transferencia.files;

    atualizarPreviewCategoria();
  } catch (erro) {
    console.error("Erro ao abrir editor:", erro);
    campoImagem.value = "";
    atualizarPreviewCategoria();
    mostrarMensagem("Não foi possível editar a fotografia.");
  }
});


lojaAparencia.addEventListener("change", carregarCategorias);

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (salvando) return;

  const categoriaId = seletor.value;
  const arquivo = campoImagem.files[0];

  if (lojaAparencia.value !== "closet" || !categoriaId) {
    mostrarMensagem("Selecione uma categoria da Closet.");
    return;
  }

  if (!arquivo) {
    mostrarMensagem("Selecione uma fotografia para salvar.");
    return;
  }

  if (!FORMATOS.includes(arquivo.type) || arquivo.size > MAXIMO_BYTES) {
    mostrarMensagem("Selecione JPG, PNG ou WebP de até 5 MB.");
    return;
  }

  salvando = true;
  botaoSalvar.disabled = true;
  seletor.disabled = true;
  lojaAparencia.disabled = true;

  try {
    mostrarMensagem("Enviando fotografia...");

    const resposta = await autorizarUpload({ loja: "closet" });
    const dados = resposta.data;

    if (!dados.autorizado) {
      throw new Error("Upload não autorizado.");
    }

    const corpo = new FormData();
    corpo.append("file", arquivo);
    corpo.append("api_key", dados.apiKey);
    corpo.append("timestamp", String(dados.timestamp));
    corpo.append("signature", dados.signature);
    corpo.append("folder", dados.folder);
    corpo.append("public_id", dados.publicId);
    corpo.append("overwrite", "false");

    const respostaUpload = await fetch(
      `https://api.cloudinary.com/v1_1/${dados.cloudName}/image/upload`,
      { method: "POST", body: corpo },
    );

    const resultadoUpload = await respostaUpload.json();

    if (!respostaUpload.ok) {
      throw new Error(
        resultadoUpload.error?.message || "Falha no upload da imagem.",
      );
    }

    mostrarMensagem("Salvando configuração...");

    await salvarImagem({
      loja: "closet",
      categoriaId,
      imagem: {
        url: resultadoUpload.secure_url,
        publicId: resultadoUpload.public_id,
      },
    });

    mostrarMensagem("Imagem salva com sucesso!");
    campoImagem.value = "";
    limparPreview();
    imagensSalvas[categoriaId] = {
      url: resultadoUpload.secure_url,
      publicId: resultadoUpload.public_id,
    };
    mostrarImagem(resultadoUpload.secure_url);
  } catch (erro) {
    console.error("Erro ao salvar imagem da categoria:", erro);
    mostrarMensagem("Erro ao salvar: " + (erro.message || "Tente novamente."));
  } finally {
    salvando = false;
    botaoSalvar.disabled = false;
    seletor.disabled = false;
    lojaAparencia.disabled = false;
  }
});

carregarCategorias();
