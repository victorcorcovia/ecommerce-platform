document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".sidebar");
  const logo = sidebar?.querySelector(".logo");
  const topo = document.querySelector(".topo");

  if (!sidebar || !logo || !topo) return;

  let usuario = topo.querySelector(".usuario");

  // Cria o bloco apenas nas páginas que não possuem.
  if (!usuario) {
    usuario = document.createElement("div");
    usuario.className = "usuario";

    usuario.innerHTML = `
      <div class="dados-usuario">
        <span>Administrador</span>
        <small id="usuarioEmail"></small>
      </div>
      <button type="button" id="btnSair" class="btn-sair">Sair</button>
    `;

    topo.appendChild(usuario);
  }

  // Guarda a posição original para restaurar no desktop.
  const marcador = document.createComment("Posição original do usuário");
  usuario.parentNode.insertBefore(marcador, usuario);

  const cabecalho = document.createElement("div");
  cabecalho.className = "cabecalho-mobile";

  const logoMobile = logo.cloneNode(true);
  logoMobile.className = "logo-mobile";

  cabecalho.appendChild(logoMobile);
  sidebar.prepend(cabecalho);

  const mediaQuery = window.matchMedia("(max-width: 700px)");

  function ajustarCabecalho() {
    if (mediaQuery.matches) {
      cabecalho.appendChild(usuario);
    } else {
      marcador.parentNode.insertBefore(usuario, marcador.nextSibling);
    }
  }

  ajustarCabecalho();
  mediaQuery.addEventListener("change", ajustarCabecalho);
});