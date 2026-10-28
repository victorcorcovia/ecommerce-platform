import { db } from "./firebase-config.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export async function buscarProdutosCloset() {
  const consulta = query(
    collection(db, "catalogoPublico"),
    where("loja", "==", "closet")
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
}

export async function buscarProdutoClosetPorId(id) {
  if (!id || typeof id !== "string") {
    return null;
  }

  const referencia = doc(db, "catalogoPublico", id);
  const resultado = await getDoc(referencia);

  if (!resultado.exists()) {
    return null;
  }

  const produto = {
    id: resultado.id,
    ...resultado.data(),
  };

  // Impede exibir produtos de outra loja ou indisponíveis.
  if (produto.loja !== "closet" || produto.disponivel !== true) {
    return null;
  }

  return produto;
}