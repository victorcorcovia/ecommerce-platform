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
  "atualizarImagensProduto",
);

const excluirProdutoSeguroCallable = httpsCallable(
  functions,
  "excluirProdutoSeguro",
);

const cadastrarProdutoSeguroCallable = httpsCallable(
  functions,
  "cadastrarProdutoSeguro",
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

export async function editarProduto(id, dadosProduto, imagensOriginaisIds) {
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
      cores: outrosDados.cores,
      tamanhos: outrosDados.tamanhos,
      permitePersonalizacao: outrosDados.permitePersonalizacao,
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
  if (
    !dadosProduto ||
    typeof dadosProduto !== "object" ||
    Array.isArray(dadosProduto)
  ) {
    throw new Error("Dados do produto inválidos.");
  }

  const resultado = await cadastrarProdutoSeguroCallable({
    dadosProduto,
  });

  if (!resultado.data?.sucesso || !resultado.data?.produtoId) {
    throw new Error("Não foi possível confirmar o cadastro do produto.");
  }

  return resultado.data.produtoId;
}

// ==========================================
// PRODUTOS - EXCLUIR DO FIRESTORE
// ==========================================

export async function excluirProduto(id, loja) {
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("ID do produto não informado.");
  }

  if (!["closet", "3d"].includes(loja)) {
    throw new Error("Loja do produto inválida.");
  }

  const resultado = await excluirProdutoSeguroCallable({
    produtoId: id,
    loja,
  });

  return resultado.data;
}
