
import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export async function buscarCategoriasDecor3D() {
  const consulta = query(
    collection(db, "categoriasPublicas"),
    where("loja", "==", "3d")
  );

  const resultado = await getDocs(consulta);

  return resultado.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
}
