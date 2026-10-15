import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
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

  // Categorias da Decor 3D
  const consulta3D = query(
    collection(db, "categorias"),
    where("loja", "==", "3d"),
  );

  const resultado3D = await getDocs(consulta3D);

  resultado3D.forEach((documento) => {
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
  if (!["closet", "3d"].includes(loja) || !nome?.trim()) {
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
  if (!id || !["closet", "3d"].includes(loja) || !nome?.trim()) {
    throw new Error("Dados da categoria inválidos.");
  }

  const referencia = doc(db, "categorias", id);

  await updateDoc(referencia, {
    loja,
    nome: nome.trim(),
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

  await deleteDoc(referencia);
}