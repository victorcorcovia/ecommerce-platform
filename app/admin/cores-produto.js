const seletorCor = document.getElementById("codigoCorProduto");
const campoNomeCor = document.getElementById("nomeCorProduto");

const coresConhecidas = [
  { nome: "Branco", hex: "#ffffff" },
  { nome: "Preto", hex: "#000000" },
  { nome: "Cinza", hex: "#808080" },
  { nome: "Vermelho", hex: "#ff0000" },
  { nome: "Vinho", hex: "#800020" },
  { nome: "Rosa", hex: "#ff69b4" },
  { nome: "Rosa bebê", hex: "#f4c2c2" },
  { nome: "Laranja", hex: "#ffa500" },
  { nome: "Amarelo", hex: "#ffff00" },
  { nome: "Verde", hex: "#008000" },
  { nome: "Verde claro", hex: "#90ee90" },
  { nome: "Azul", hex: "#0000ff" },
  { nome: "Azul bebê", hex: "#89cff0" },
  { nome: "Azul marinho", hex: "#000080" },
  { nome: "Roxo", hex: "#800080" },
  { nome: "Lilás", hex: "#c8a2c8" },
  { nome: "Marrom", hex: "#8b4513" },
  { nome: "Bege", hex: "#f5f5dc" },
];

function converterRGB(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function identificarNomeCor(hex) {
  const [r, g, b] = converterRGB(hex);

  let nomeMaisProximo = "Cor personalizada";
  let menorDistancia = Infinity;

  coresConhecidas.forEach((cor) => {
    const [cr, cg, cb] = converterRGB(cor.hex);

    const distancia =
      (r - cr) ** 2 +
      (g - cg) ** 2 +
      (b - cb) ** 2;

    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      nomeMaisProximo = cor.nome;
    }
  });

  return nomeMaisProximo;
}

if (seletorCor && campoNomeCor) {
  seletorCor.addEventListener("input", () => {
    campoNomeCor.value = identificarNomeCor(seletorCor.value);
  });

  campoNomeCor.value = identificarNomeCor(seletorCor.value);
}