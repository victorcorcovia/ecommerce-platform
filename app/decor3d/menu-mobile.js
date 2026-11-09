document.addEventListener("DOMContentLoaded", () => {
  const botaoMenu = document.getElementById("alternar-menu-mobile");
  const botaoFechar = document.getElementById("fechar-menu-mobile");
  const menu = document.getElementById("menu-principal");

  const acoesCabecalho = document.getElementById("acoes-cabecalho");
  const acoesMenu = document.getElementById("acoes-menu-mobile");

  const conta = document.getElementById("link-minha-conta");
  const carrinho = document.getElementById("abrir-carrinho");

  if (!botaoMenu || !menu) return;

  const telaMobile = window.matchMedia("(max-width: 800px)");

  function fecharMenu() {
    menu.classList.remove("menu-aberto");
    botaoMenu.setAttribute("aria-expanded", "false");
    botaoMenu.setAttribute("aria-label", "Abrir menu de navegação");
  }

  function abrirMenu() {
    menu.classList.add("menu-aberto");
    botaoMenu.setAttribute("aria-expanded", "true");
    botaoMenu.setAttribute("aria-label", "Fechar menu de navegação");
  }

  function atualizarPosicaoAcoes() {
    if (!acoesCabecalho || !conta || !carrinho) {
      return;
    }

    acoesCabecalho.insertBefore(conta, botaoMenu);
    acoesCabecalho.insertBefore(carrinho, botaoMenu);

    if (!telaMobile.matches) {
      fecharMenu();
    }
  }

  botaoMenu.addEventListener("click", (evento) => {
    evento.stopPropagation();

    if (menu.classList.contains("menu-aberto")) {
      fecharMenu();
    } else {
      abrirMenu();
    }
  });

  if (botaoFechar) {
    botaoFechar.addEventListener("click", fecharMenu);
  }

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", fecharMenu);
  });

  document.addEventListener("click", (evento) => {
    if (!menu.contains(evento.target) && !botaoMenu.contains(evento.target)) {
      fecharMenu();
    }
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      fecharMenu();
    }
  });

  telaMobile.addEventListener("change", atualizarPosicaoAcoes);

  atualizarPosicaoAcoes();

  const carrinhoMenu = document.getElementById("abrir-carrinho-menu");
  const carrinhoPrincipal = document.getElementById("abrir-carrinho");

  if (carrinhoMenu && carrinhoPrincipal) {
    carrinhoMenu.addEventListener("click", (evento) => {
      evento.preventDefault();
      fecharMenu();
      carrinhoPrincipal.click();
    });
  }

  const contadorPrincipal = document.getElementById("contador-carrinho");
  const contadorMenu = document.getElementById("contador-carrinho-menu");

  if (contadorPrincipal && contadorMenu) {
    const sincronizarContador = () => {
      contadorMenu.textContent = contadorPrincipal.textContent;
    };

    const observador = new MutationObserver(sincronizarContador);
    observador.observe(contadorPrincipal, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    sincronizarContador();
  }
});
