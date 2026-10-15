
import { functions } from "./firebase-config.js";
import { httpsCallable } from "firebase/functions";

// Solicita autorização ao Firebase e envia uma imagem ao Cloudinary.
export async function enviarImagemProduto(arquivo, loja) {
  if (!(arquivo instanceof File) || !arquivo.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem válido.");
  }

  if (!["closet", "3d"].includes(loja)) {
    throw new Error("Loja inválida.");
  }

  // A assinatura é gerada no servidor, nunca no navegador.
  const autorizarUpload = httpsCallable(
    functions,
    "autorizarUploadProduto"
  );

  const resposta = await autorizarUpload({ loja });
  const autorizacao = resposta.data;

  if (!autorizacao?.autorizado) {
    throw new Error("Upload não autorizado.");
  }

  const formulario = new FormData();

  formulario.append("file", arquivo);
  formulario.append("api_key", autorizacao.apiKey);
  formulario.append("timestamp", String(autorizacao.timestamp));
  formulario.append("signature", autorizacao.signature);
  formulario.append("folder", autorizacao.folder);
  formulario.append("public_id", autorizacao.publicId);
  formulario.append("overwrite", "false");

  const respostaUpload = await fetch(
    `https://api.cloudinary.com/v1_1/${autorizacao.cloudName}/image/upload`,
    {
      method: "POST",
      body: formulario,
    }
  );

  const resultado = await respostaUpload.json();

  if (!respostaUpload.ok) {
    throw new Error(
      resultado.error?.message || "Erro ao enviar imagem ao Cloudinary."
    );
  }

  return {
    url: resultado.secure_url,
    publicId: resultado.public_id,
  };
}
