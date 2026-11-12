
const { defineConfig } = require("vite");
const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "app");
const distRoot = path.resolve(__dirname, "dist");

const paginas = ["admin", "closet"];
const entradas = {};

for (const pasta of paginas) {
  const dir = path.resolve(appRoot, pasta);

  for (const arquivo of fs
    .readdirSync(dir)
    .filter((nome) => nome.endsWith(".html"))) {
    const caminho = path.resolve(dir, arquivo);

    const chave = path
      .relative(appRoot, caminho)
      .replace(/\\/g, "/")
      .replace(/\.html$/, "");

    entradas[chave] = caminho;
  }
}

module.exports = defineConfig({
  root: appRoot,

  plugins: [
    {
      name: "lolly-closet-pagina-inicial",

      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split("?")[0];

          if (url === "/") {
            res.writeHead(302, {
              Location: "/closet/",
            });
            res.end();
            return;
          }

          next();
        });
      },


      closeBundle() {
        const arquivos = [
          "admin/cabecalho-mobile.js",
          "closet/script.js",
          "closet/menu-mobile.js",
        ];

        for (const arquivo of arquivos) {
          const origem = path.join(appRoot, arquivo);
          const destino = path.join(distRoot, arquivo);

          if (!fs.existsSync(origem)) {
            throw new Error(
              `Script nao encontrado: ${arquivo}`
            );
          }

          fs.mkdirSync(path.dirname(destino), {
            recursive: true,
          });

          fs.copyFileSync(origem, destino);
        }

        // Página inicial do site publicado.
        const indexHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lolly Closet</title>
  <meta http-equiv="refresh" content="0;url=./closet/">
  <script>
    window.location.replace("./closet/");
  </script>
</head>
<body>
  <p>
    Abrindo a Lolly Closet...
    <a href="./closet/">Entrar na loja</a>
  </p>
</body>
</html>`;

        fs.writeFileSync(
          path.join(distRoot, "index.html"),
          indexHtml,
          "utf8"
        );

        console.log(
          "Scripts copiados e pagina inicial criada em dist/"
        );
      },
    },
  ],

  server: {
    watch: {
      ignored: [
        "**/backups/**",
        "**/firebase-export-*/**",
        "**/teste-*/**",
      ],
    },
  },

  build: {
    outDir: distRoot,
    emptyOutDir: true,

    rollupOptions: {
      input: entradas,
    },
  },
});
