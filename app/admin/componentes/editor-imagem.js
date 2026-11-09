import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
import "./editor-imagem.css";

/**
 * Abre o editor e devolve um File recortado.
 *
 * @param {File} arquivo
 * @param {{ proporcao?: number, largura?: number, altura?: number }} opcoes
 * @returns {Promise<File|null>}
 */
export function abrirEditorImagem(arquivo, opcoes = {}) {
  const {
    proporcao = 3 / 4,
    largura = 900,
    altura = 1200,
    loja = null,
  } = opcoes;

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);

    const overlay = document.createElement("div");
    overlay.className = "editor-imagem-overlay";

    if (loja === "closet" || loja === "3d") {
      overlay.dataset.loja = loja;
    }

    overlay.innerHTML = `
      <div class="editor-imagem-modal"
           role="dialog"
           aria-modal="true"
           aria-label="Editor de imagem">
        <h2>Ajustar fotografia</h2>
        <p>Arraste e ajuste a área de recorte.</p>

        <div class="editor-imagem-area">
          <img alt="Fotografia para recortar">
        </div>

        <div class="editor-imagem-acoes">
          <button type="button" data-acao="cancelar">
            Cancelar
          </button>
          <button type="button" data-acao="redefinir">
            Redefinir
          </button>
          <button type="button"
                  class="editor-imagem-confirmar"
                  data-acao="confirmar">
            Aplicar recorte
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const imagem = overlay.querySelector("img");
    const confirmar = overlay.querySelector('[data-acao="confirmar"]');

    let cropper = null;
    let finalizado = false;

    function finalizar(resultado) {
      if (finalizado) return;
      finalizado = true;

      cropper?.destroy();
      URL.revokeObjectURL(url);
      overlay.remove();
      resolve(resultado);
    }

    overlay
      .querySelector('[data-acao="cancelar"]')
      .addEventListener("click", () => finalizar(null));

    overlay
      .querySelector('[data-acao="redefinir"]')
      .addEventListener("click", () => cropper?.reset());

    confirmar.addEventListener("click", async () => {
      if (!cropper) return;

      confirmar.disabled = true;

      try {
        const canvas = cropper.getCroppedCanvas({
          width: largura,
          height: altura,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: "high",
        });

        if (!canvas) {
          throw new Error("Não foi possível recortar a imagem.");
        }

        const blob = await new Promise((res, rej) => {
          canvas.toBlob(
            (resultado) =>
              resultado
                ? res(resultado)
                : rej(new Error("Falha ao gerar fotografia.")),
            "image/jpeg",
            0.9,
          );
        });

        const nome = arquivo.name.replace(/\.[^.]+$/, "");

        const recortado = new File([blob], `${nome}-recortado.jpg`, {
          type: "image/jpeg",
        });

        finalizar(recortado);
      } catch (erro) {
        console.error("Erro no recorte:", erro);
        alert("Não foi possível recortar a fotografia.");
        confirmar.disabled = false;
      }
    });

    imagem.addEventListener(
      "load",
      () => {
        try {
          cropper = new Cropper(imagem, {
            aspectRatio: proporcao,
            viewMode: 1,
            dragMode: "move",
            autoCropArea: 0.9,

            cropBoxMovable: false,
            cropBoxResizable: false,

            movable: true,
            zoomable: true,
            scalable: false,
            rotatable: false,

            responsive: true,
            background: false,
          });
        } catch (erro) {
          overlay.remove();
          URL.revokeObjectURL(url);
          reject(erro);
        }
      },
      { once: true },
    );

    imagem.addEventListener(
      "error",
      () => {
        finalizar(null);
        alert("Não foi possível abrir a fotografia.");
      },
      { once: true },
    );

    imagem.src = url;
  });
}
