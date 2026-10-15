
/* ==========================================
   CONTROLE DE TEMA DO PAINEL
========================================== */

const CHAVE_TEMA = "temaAdmin";

// Aplicar tema
function aplicarTema(tema) {
  const temaAtual = tema === "escuro" ? "escuro" : "claro";

  document.body.classList.toggle(
    "dark-mode",
    temaAtual === "escuro"
  );

  // Atualizar cartões da página Aparência
  document.querySelectorAll(".opcao-tema").forEach((cartao) => {
    const selecionado = cartao.dataset.tema === temaAtual;

    cartao.classList.toggle("selecionado", selecionado);
    cartao.setAttribute("aria-pressed", String(selecionado));
  });
}

// Carregar tema salvo
function iniciarTema() {
  const temaSalvo = localStorage.getItem(CHAVE_TEMA);

  aplicarTema(temaSalvo === "escuro" ? "escuro" : "claro");

  // Permitir alteração somente na página Aparência
  document.querySelectorAll(".opcao-tema").forEach((cartao) => {
    cartao.addEventListener("click", () => {
      const novoTema = cartao.dataset.tema;

      if (novoTema !== "claro" && novoTema !== "escuro") return;

      localStorage.setItem(CHAVE_TEMA, novoTema);
      aplicarTema(novoTema);
    });
  });
}

// Aguardar carregamento do HTML
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarTema);
} else {
  iniciarTema();
}
