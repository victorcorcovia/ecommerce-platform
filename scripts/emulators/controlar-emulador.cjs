const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const raiz = path.resolve(__dirname, "..", "..");
const backups = path.join(raiz, "backups");
const indicador = path.join(backups, "backup-ativo.txt");
const sinal = path.join(backups, "encerrar-emulador.sinal");
const arquivoHistorico = path.join(backups, "arquivo", "emuladores-antigos");

const firebaseJs = path.join(
  process.env.APPDATA,
  "npm/node_modules/firebase-tools/lib/bin/firebase.js"
);

const arquivos = [
  "firebase-export-metadata.json",
  "firestore_export/firestore_export.overall_export_metadata",
  "firestore_export/all_namespaces/all_kinds/output-0",
  "auth_export/accounts.json"
];

function validarBackup(diretorio) {
  for (const arquivo of arquivos) {
    if (!fs.existsSync(path.join(diretorio, arquivo))) {
      throw new Error(`Backup incompleto: ${arquivo}`);
    }
  }

  const metadata = JSON.parse(
    fs.readFileSync(
      path.join(diretorio, "firebase-export-metadata.json"),
      "utf8"
    )
  );

  if (!metadata.firestore || !metadata.auth) {
    throw new Error("Metadados do backup incompletos.");
  }
}

function executar(argumentos, stdio = "inherit") {
  return spawn(process.execPath, [firebaseJs, ...argumentos], {
    cwd: raiz,
    stdio,
    windowsHide: true
  });
}

function aguardar(processo) {
  return new Promise((resolve, reject) => {
    processo.once("error", reject);
    processo.once("exit", (codigo) => {
      codigo === 0
        ? resolve()
        : reject(new Error(`Processo terminou com codigo ${codigo}`));
    });
  });
}

function dataAtual() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");

  return [
    d.getFullYear(),
    p(d.getMonth() + 1),
    p(d.getDate())
  ].join("-") + "_" + [
    p(d.getHours()),
    p(d.getMinutes()),
    p(d.getSeconds())
  ].join("-");
}

function arquivarBackupAnterior(nomeAnterior, novoNome) {
  const nomeAtivo = fs.readFileSync(indicador, "utf8").trim();
  if (nomeAtivo !== novoNome) {
    throw new Error("Backup ativo mudou durante o encerramento. Arquivamento cancelado.");
  }
  if (nomeAnterior === novoNome) {
    throw new Error("Backup anterior e novo possuem o mesmo nome.");
  }
  if (!/^automatico-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/.test(nomeAnterior)) {
    throw new Error("Nome do backup anterior invalido.");
  }

  const origem = path.join(backups, nomeAnterior);
  const destino = path.join(arquivoHistorico, nomeAnterior);
  if (!fs.existsSync(origem)) {
    throw new Error("Backup anterior nao encontrado; nada foi movido.");
  }
  if (fs.existsSync(destino)) {
    throw new Error("Destino historico ja existe; nada foi sobrescrito.");
  }
  validarBackup(origem);
  validarBackup(path.join(backups, novoNome));
  fs.mkdirSync(arquivoHistorico, { recursive: true });
  fs.renameSync(origem, destino);
  console.log("Backup anterior arquivado:", nomeAnterior);
}

async function main() {
  if (!fs.existsSync(firebaseJs)) {
    throw new Error("Firebase CLI nao encontrado.");
  }

  if (fs.existsSync(sinal)) {
    throw new Error("Existe um sinal de parada antigo. Verifique antes de iniciar.");
  }

  const nome = fs.readFileSync(indicador, "utf8").trim();

  if (!/^automatico-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/.test(nome)) {
    throw new Error("Nome do backup ativo invalido.");
  }

  const origem = path.join(backups, nome);
  validarBackup(origem);

  console.log("Importando backup:", nome);

  const emulador = executar([
    "emulators:start",
    "--project", "lojas-lolly",
    "--import", origem
  ]);

  process.on("SIGINT", () => {
    console.log("\nCtrl+C detectado. Solicitando encerramento seguro...");
    try {
      fs.writeFileSync(sinal, "encerrar\n", { flag: "wx" });
    } catch (erro) {
      if (erro.code !== "EEXIST") {
        console.error(erro.message);
      }
    }
  });

  let ativo = true;
  emulador.once("exit", () => { ativo = false; });

  console.log("Aguardando solicitacao de encerramento...");

  while (ativo && !fs.existsSync(sinal)) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!ativo) {
    throw new Error("Firebase encerrou antes da solicitacao de parada.");
  }

  fs.unlinkSync(sinal);

  const novoNome = `automatico-${dataAtual()}`;
  const destino = path.join(backups, novoNome);

  if (fs.existsSync(destino)) {
    throw new Error("Destino do backup ja existe.");
  }

  console.log("Exportando backup:", novoNome);

  await aguardar(executar([
    "emulators:export",
    destino,
    "--project", "lojas-lolly"
  ]));

  validarBackup(destino);

  const temporario = `${indicador}.tmp`;
  fs.writeFileSync(temporario, novoNome + "\n", "utf8");
  fs.renameSync(temporario, indicador);

  console.log("Backup ativo atualizado:", novoNome);
  console.log("Exportacao validada. Encerrando Firebase...");

  const encerramento = spawn("taskkill.exe", [
    "/PID",
    String(emulador.pid),
    "/T",
    "/F"
  ], {
    stdio: "inherit",
    windowsHide: true
  });

  await aguardar(encerramento);
  console.log("Solicitacao de encerramento enviada.");

  try {
    arquivarBackupAnterior(nome, novoNome);
  } catch (erro) {
    console.warn("AVISO: Nao foi possivel arquivar o backup anterior:", erro.message);
    console.warn("O novo backup ativo foi preservado. Revise o backup antigo manualmente.");
  }
}

main().catch((erro) => {
  console.error("ERRO:", erro.message);
  process.exitCode = 1;
});
