const { defineConfig } = require('vite');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, 'app');
const paginas = ['.', 'admin', 'closet', 'decor3d'];
const entradas = {};
for (const pasta of paginas) {
  const dir = path.resolve(appRoot, pasta);
  for (const arquivo of fs.readdirSync(dir).filter((nome) => nome.endsWith('.html'))) {
    const caminho = path.resolve(dir, arquivo);
    const chave = path.relative(appRoot, caminho).replace(/\\/g, '/').replace(/\.html$/, '');
    entradas[chave] = caminho;
  }
}

module.exports = defineConfig({
  root: appRoot,
  plugins: [
    {
      name: 'copiar-scripts-tradicionais',
      apply: 'build',
      closeBundle() {
        const arquivos = [
          'admin/cabecalho-mobile.js',
          'closet/script.js',
          'closet/menu-mobile.js',
          'decor3d/script.js',
          'decor3d/menu-mobile.js'
        ];

        for (const arquivo of arquivos) {
          const origem = path.join(appRoot, arquivo);
          const destino = path.resolve(__dirname, 'dist', arquivo);

          if (!fs.existsSync(origem)) {
            throw new Error(`Script nao encontrado: ${arquivo}`);
          }

          fs.mkdirSync(path.dirname(destino), { recursive: true });
          fs.copyFileSync(origem, destino);
        }

        console.log('Scripts tradicionais copiados para dist/');
      }
    }
  ],
  server: {
    watch: { ignored: ['**/backups/**', '**/firebase-export-*/**', '**/teste-*/**'] }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: entradas }
  }
});
