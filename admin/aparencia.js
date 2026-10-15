
/* ==========================================
   APARÊNCIA - BANNERS DAS LOJAS
========================================== */

const lojaAparencia = document.getElementById("lojaAparencia");
const bannerPrincipal = document.getElementById("bannerPrincipal");
const previewBanner = document.getElementById("previewBanner");
const formAparencia = document.getElementById("formAparencia");

let urlPreview = null;

// Mostrar pré-visualização
bannerPrincipal.addEventListener("change", () => {
  const arquivo = bannerPrincipal.files[0];

  if (urlPreview) {
    URL.revokeObjectURL(urlPreview);
    urlPreview = null;
  }

  previewBanner.removeAttribute("src");
  previewBanner.style.display = "none";

  if (!arquivo) return;

  const formatosPermitidos = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!formatosPermitidos.includes(arquivo.type)) {
    alert("Selecione uma imagem JPG, PNG ou WebP.");
    bannerPrincipal.value = "";
    return;
  }

  urlPreview = URL.createObjectURL(arquivo);
  previewBanner.src = urlPreview;
  previewBanner.style.display = "block";
});

// Trocar de loja
lojaAparencia.addEventListener("change", () => {
  bannerPrincipal.value = "";

  if (urlPreview) {
    URL.revokeObjectURL(urlPreview);
    urlPreview = null;
  }

  previewBanner.removeAttribute("src");
  previewBanner.style.display = "none";
});

// Salvamento será implementado com Firebase
formAparencia.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const arquivo = bannerPrincipal.files[0];

  if (!arquivo) {
    alert("Selecione uma imagem para o banner.");
    return;
  }

  alert(
    `Pré-visualização pronta para ${lojaAparencia.value === "closet" ? "Closet" : "Decor 3D"}. O salvamento no Firebase ainda será configurado.`
  );
});
