
import { db } from "./firebase-config.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export async function buscarProdutosDecor3D() {
  const consulta = query(
    collection(db, "catalogoPublico"),
    where("loja", "==", "3d")
  );

  const resultado = await getDocs(consulta);

  return resultado.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }))
    .filter(
      (produto) =>
        produto.loja === "3d" &&
        produto.disponivel === true
    );
}

export async function buscarProdutoDecor3DPorId(id) {
  if (!id || typeof id !== "string" || id.includes("/")) {
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

  if (produto.loja !== "3d" || produto.disponivel !== true) {
    return null;
  }

  return produto;
}
