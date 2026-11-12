import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  runTransaction,
  query,
  where,
} from "firebase/firestore";

// ==========================================
// CATEGORIAS - CARREGAR DO FIRESTORE
// ==========================================

export async function carregarCategorias() {
  const categorias = [];

  // Categorias da Closet
  const consultaCloset = query(
    collection(db, "categorias"),
    where("loja", "==", "closet"),
  );

  const resultadoCloset = await getDocs(consultaCloset);

  resultadoCloset.forEach((documento) => {
    categorias.push({
      id: documento.id,
      ...documento.data(),
    });
  });

  return categorias;
}

// ==========================================
// CATEGORIAS - CADASTRAR
// ==========================================

export async function cadastrarCategoria(loja, nome) {
  if (loja !== "closet" || !nome?.trim()) {
    throw new Error("Dados da categoria inválidos.");
  }

  return await addDoc(collection(db, "categorias"), {
    loja,
    nome: nome.trim(),
  });
}

// ==========================================
// CATEGORIAS - EDITAR
// ==========================================

export async function editarCategoria(id, loja, nome) {
  if (!id || loja !== "closet" || !nome?.trim()) {
    throw new Error("Dados da categoria inválidos.");
  }

  const referencia = doc(db, "categorias", id);

  await runTransaction(db, async (transacao) => {
    const existente = await transacao.get(referencia);
    if (!existente.exists() || existente.data().loja !== "closet") {
      throw new Error("Categoria da Closet não encontrada.");
    }
    transacao.update(referencia, { nome: nome.trim() });
  });
}

// ==========================================
// CATEGORIAS - EXCLUIR
// ==========================================

export async function excluirCategoria(id) {
  if (!id) {
    throw new Error("ID da categoria não informado.");
  }

  const referencia = doc(db, "categorias", id);

  await runTransaction(db, async (transacao) => {
    const existente = await transacao.get(referencia);
    if (!existente.exists() || existente.data().loja !== "closet") {
      throw new Error("Categoria da Closet não encontrada.");
    }
    transacao.delete(referencia);
  });
}