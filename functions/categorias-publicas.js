"use strict";

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");

// Prepara apenas os dados que podem ser públicos.
function prepararCategoriaPublica(categoria) {
  if (!categoria || typeof categoria.loja !== "string") {
    return null;
  }

  const loja = categoria.loja.trim().toLowerCase();

  if (!["closet", "3d"].includes(loja)) {
    return null;
  }

  if (typeof categoria.nome !== "string" || !categoria.nome.trim()) {
    return null;
  }

  return {
    loja,
    nome: categoria.nome.trim(),
  };
}

exports.sincronizarCategoriasPublicas = onDocumentWritten(
  {
    document: "categorias/{categoriaId}",
    region: "us-central1",
  },
  async (event) => {
    const db = getFirestore();
    const categoriaId = event.params.categoriaId;

    const referenciaCategoria = db.collection("categorias").doc(categoriaId);
    const referenciaPublica = db
      .collection("categoriasPublicas")
      .doc(categoriaId);

    await db.runTransaction(async (transacao) => {
      const documentoAtual = await transacao.get(referenciaCategoria);

      if (!documentoAtual.exists) {
        transacao.delete(referenciaPublica);
        return;
      }

      const categoriaPublica = prepararCategoriaPublica(documentoAtual.data());

      if (!categoriaPublica) {
        transacao.delete(referenciaPublica);
        return;
      }

      transacao.set(referenciaPublica, categoriaPublica);
    });
  },
);

module.exports.prepararCategoriaPublica = prepararCategoriaPublica;
