import { db } from "./firebase-config.js";
import { doc, getDoc } from "firebase/firestore";

async function carregarBanner() {
  const banner = document.getElementById("banner-principal");

  if (!banner) return;

  try {
    const referencia = doc(db, "aparenciaLojas", "closet");
    const resultado = await getDoc(referencia);

    if (!resultado.exists()) return;

    const configuracao = resultado.data();

    if (configuracao.tipo === "cor") {
      banner.style.backgroundImage = "none";
      banner.style.backgroundColor = configuracao.cor;
    }

    if (configuracao.tipo === "imagem" && configuracao.imagem?.url) {
      banner.style.backgroundImage =
        `url("${configuracao.imagem.url}")`;

      banner.style.backgroundPosition = "center";
      banner.style.backgroundSize = "cover";
      banner.style.backgroundRepeat = "no-repeat";
    }
  } catch (erro) {
    console.error("Erro ao carregar banner:", erro);
  }
}

carregarBanner();