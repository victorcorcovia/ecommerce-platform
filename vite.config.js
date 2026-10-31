const { defineConfig } = require("vite");

module.exports = defineConfig({
  server: {
    watch: {
      ignored: [
        "**/backups/**",
        "**/firebase-export-*/**",
        "**/teste-*/**"
      ]
    }
  }
});
