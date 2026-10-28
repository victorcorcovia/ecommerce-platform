"use strict";

// Prepara os dados que poderão aparecer na loja.
function prepararProdutoPublico(id, produto) {
  if (!produto || !["closet", "3d"].includes(produto.loja)) {
    return null;
  }

  const preco = Number(produto.preco);

  if (produto.status !== "ativo" || !Number.isFinite(preco) || preco < 0) {
    return null;
  }

  return {
    loja: produto.loja,
    nome: produto.nome,
    categoriaId: produto.categoriaId,
    preco,
    estoque:
      Number.isInteger(Number(produto.estoque)) && Number(produto.estoque) >= 0
        ? Number(produto.estoque)
        : 0,
    descricao: produto.descricao || "",

    // Personalização com nome exclusiva da Decor 3D
    permitePersonalizacao:
      produto.loja === "3d" && produto.permitePersonalizacao === true,

    // Tamanhos disponíveis do produto
    tamanhos: Array.isArray(produto.tamanhos)
      ? produto.tamanhos
          .filter(
            (tamanho) =>
              typeof tamanho === "string" &&
              tamanho.trim().length > 0 &&
              tamanho.trim().length <= 15,
          )
          .map((tamanho) => tamanho.trim().toUpperCase())
          .slice(0, 30)
      : [],

    // Cores disponíveis do produto
    cores: Array.isArray(produto.cores)
      ? produto.cores
          .filter(
            (cor) =>
              cor &&
              typeof cor.codigo === "string" &&
              /^#[0-9a-fA-F]{6}$/.test(cor.codigo),
          )
          .map((cor) => ({
            nome:
              typeof cor.nome === "string" && cor.nome.trim()
                ? cor.nome.trim()
                : cor.codigo.toLowerCase(),
            codigo: cor.codigo.toLowerCase(),
          }))
      : [],

    disponivel: Number(produto.estoque) > 0,
    imagens: Array.isArray(produto.imagens)
      ? produto.imagens
          .filter((imagem) => typeof imagem.url === "string")
          .map((imagem) => imagem.url)
      : [],
  };
}

module.exports = { prepararProdutoPublico };

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");

module.exports.sincronizarCatalogoPublico = onDocumentWritten(
  {
    document: "produtos/{produtoId}",
    region: "us-central1",
  },
  async (event) => {
    const db = getFirestore();
    const produtoId = event.params.produtoId;

    const referenciaProduto = db.collection("produtos").doc(produtoId);
    const referenciaPublica = db.collection("catalogoPublico").doc(produtoId);

    await db.runTransaction(async (transacao) => {
      const documentoAtual = await transacao.get(referenciaProduto);

      if (!documentoAtual.exists) {
        transacao.delete(referenciaPublica);
        return;
      }

      const produtoPublico = prepararProdutoPublico(
        produtoId,
        documentoAtual.data(),
      );

      if (!produtoPublico) {
        transacao.delete(referenciaPublica);
        return;
      }

      transacao.set(referenciaPublica, produtoPublico);
    });
  },
);
