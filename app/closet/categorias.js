import { db } from "./firebase-config.js";
import { doc, getDoc } from "firebase/firestore";
import { buscarCategoriasCloset } from "./categorias-firebase.js";

async function carregarCategorias() {
  const secao = document.getElementById("categorias");
  const lista = document.getElementById("lista-categorias");

  if (!secao || !lista) return;

  secao.hidden = true;
  lista.replaceChildren();

  try {
    const [categoriasPublicas, resultadoAparencia] = await Promise.all([
      buscarCategoriasCloset(),
      getDoc(doc(db, "aparenciaLojas", "closet")),
    ]);

    const imagens = resultadoAparencia.data()?.imagensCategorias || {};

    const categorias = categoriasPublicas
      .map((categoria) => ({
        id: categoria.id,
        nome: categoria.nome || categoria.id,
        imagem: imagens[categoria.id]?.url,
      }))
      .filter((categoria) => categoria.imagem)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    for (const categoria of categorias) {
      const card = document.createElement("a");
      card.className = "categoria";
      card.href = `produtos.html?categoria=${encodeURIComponent(categoria.id)}`;

      const visual = document.createElement("div");
      visual.className = "categoria-visual";

      const imagem = document.createElement("img");
      imagem.className = "imagem-categoria";
      imagem.src = categoria.imagem;
      imagem.alt = categoria.nome;
      imagem.loading = "lazy";

      visual.appendChild(imagem);

      const conteudo = document.createElement("div");
      conteudo.className = "categoria-conteudo";

      const titulo = document.createElement("h3");
      titulo.textContent = categoria.nome;

      const link = document.createElement("span");
      link.textContent = "Ver coleção ";

      const seta = document.createElement("b");
      seta.textContent = "→";
      link.appendChild(seta);

      conteudo.append(titulo, link);
      card.append(visual, conteudo);
      lista.appendChild(card);
    }

    if (categorias.length > 0) {
      secao.hidden = false;
    }
  } catch (erro) {
    console.error("Erro ao carregar categorias:", erro);
  }
}

carregarCategorias();
