import { db, functions } from "./firebase-config.js";

import { httpsCallable } from "firebase/functions";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";

// ==========================================
// CLOUD FUNCTIONS - PRODUTOS
// ==========================================

const atualizarImagensProdutoCallable = httpsCallable(
  functions,
  "atualizarImagensProduto"
);

// ==========================================
// PRODUTOS - CARREGAR DO FIRESTORE
// ==========================================

export async function buscarProdutos() {
  const produtos = [];

  // CLOSET
  const consultaCloset = query(
    collection(db, "produtos"),
    where("loja", "==", "closet"),
  );

  const resultadoCloset = await getDocs(consultaCloset);

  resultadoCloset.forEach((documento) => {
    produtos.push({
      id: documento.id,
      ...documento.data(),
    });
  });

  // DECOR 3D
  const consulta3D = query(
    collection(db, "produtos"),
    where("loja", "==", "3d"),
  );

  const resultado3D = await getDocs(consulta3D);

  resultado3D.forEach((documento) => {
    produtos.push({
      id: documento.id,
      ...documento.data(),
    });
  });

  return produtos;
}

// ==========================================
// PRODUTOS - EDITAR NO FIRESTORE
// ==========================================

// ==========================================
// PRODUTOS - EDITAR VIA CLOUD FUNCTION
// ==========================================

export async function editarProduto(
  id,
  dadosProduto,
  imagensOriginaisIds
) {
  if (!id || typeof id !== "string") {
    throw new Error("ID do produto não informado.");
  }

  if (!dadosProduto || typeof dadosProduto !== "object") {
    throw new Error("Dados do produto inválidos.");
  }

  if (!Array.isArray(imagensOriginaisIds)) {
    throw new Error("Lista original de imagens inválida.");
  }

  const { loja, imagens, ...outrosDados } = dadosProduto;

  if (!["closet", "3d"].includes(loja)) {
    throw new Error("Loja inválida.");
  }

  if (!Array.isArray(imagens)) {
    throw new Error("Lista de imagens inválida.");
  }

  const resultado = await atualizarImagensProdutoCallable({
    loja,
    produtoId: id,
    imagens,
    dadosProduto: {
      nome: outrosDados.nome,
      categoriaId: outrosDados.categoriaId,
      preco: outrosDados.preco,
      status: outrosDados.status,
      descricao: outrosDados.descricao,
    },
    imagensOriginaisIds,
  });

  if (resultado.data?.sucesso !== true) {
    throw new Error("A atualização do produto não foi confirmada.");
  }

  return resultado.data;
}

// ==========================================
// PRODUTOS - CADASTRAR NO FIRESTORE
// ==========================================

export async function cadastrarProduto(dadosProduto) {
  if (!dadosProduto || typeof dadosProduto !== "object") {
    throw new Error("Dados do produto inválidos.");
  }

  const estoque = Number(dadosProduto.estoque);

  if (!Number.isSafeInteger(estoque) || estoque < 0) {
    throw new Error("Estoque inicial inválido.");
  }

  const lote = writeBatch(db);

  const referenciaProduto = doc(collection(db, "produtos"));

  lote.set(referenciaProduto, dadosProduto);

  // Registrar a entrada inicial no histórico de estoque
  if (estoque > 0) {
    const referenciaMovimentacao = doc(collection(db, "movimentacoesEstoque"));

    lote.set(referenciaMovimentacao, {
      produtoId: referenciaProduto.id,
      produtoNome: dadosProduto.nome,
      loja: dadosProduto.loja,
      tipo: "entrada",
      quantidade: estoque,
      estoqueAnterior: 0,
      estoqueNovo: estoque,
      criadoEm: serverTimestamp(),
    });
  }

  // Salvar produto e movimentação na mesma operação
  await lote.commit();

  return referenciaProduto.id;
}

// ==========================================
// PRODUTOS - EXCLUIR DO FIRESTORE
// ==========================================

export async function excluirProduto(id) {
  if (!id) {
    throw new Error("ID do produto não informado.");
  }

  const referencia = doc(db, "produtos", id);

  await deleteDoc(referencia);
}
