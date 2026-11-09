
document.addEventListener("DOMContentLoaded", () => {
  const botaoAbrir = document.getElementById("alternar-menu-mobile");
  const botaoFechar = document.getElementById("fechar-menu-mobile");
  const menu = document.getElementById("menu-principal");

  if (!botaoAbrir || !menu) return;

  function fecharMenu() {
    menu.classList.remove("menu-aberto");
    botaoAbrir.setAttribute("aria-expanded", "false");
    botaoAbrir.setAttribute("aria-label", "Abrir menu de navegação");
  }

  function abrirMenu() {
    menu.classList.add("menu-aberto");
    botaoAbrir.setAttribute("aria-expanded", "true");
    botaoAbrir.setAttribute("aria-label", "Fechar menu de navegação");
  }

  botaoAbrir.addEventListener("click", (evento) => {
    evento.stopPropagation();

    if (menu.classList.contains("menu-aberto")) {
      fecharMenu();
    } else {
      abrirMenu();
    }
  });

  botaoFechar?.addEventListener("click", fecharMenu);

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", fecharMenu);
  });

  document.addEventListener("click", (evento) => {
    if (
      !menu.contains(evento.target) &&
      !botaoAbrir.contains(evento.target)
    ) {
      fecharMenu();
    }
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") fecharMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 800) fecharMenu();
  });

  // Reutiliza a abertura do carrinho existente
  const carrinhoMobile = document.getElementById("abrir-carrinho-mobile");
  const carrinhoPrincipal = document.getElementById("abrir-carrinho");
  const contadorPrincipal = document.getElementById("contador-carrinho");
  const contadorMobile = document.getElementById("contador-carrinho-mobile");

  carrinhoMobile?.addEventListener("click", (evento) => {
    evento.preventDefault();
    fecharMenu();
    carrinhoPrincipal?.click();
  });

  // Mantém o contador do menu lateral sincronizado
  if (contadorPrincipal && contadorMobile) {
    const atualizarContador = () => {
      contadorMobile.textContent = contadorPrincipal.textContent;
    };

    atualizarContador();

    new MutationObserver(atualizarContador).observe(contadorPrincipal, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }
});
