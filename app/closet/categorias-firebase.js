import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export async function buscarCategoriasCloset() {
  const consulta = query(
    collection(db, "categoriasPublicas"),
    where("loja", "==", "closet")
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
}