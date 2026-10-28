// ==========================================
// PROTEÇÃO DO PAINEL ADMINISTRATIVO
// ==========================================

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import {
  doc,
  getDoc
} from "firebase/firestore";


// ==========================================
// VERIFICAR USUÁRIO
// ==========================================

onAuthStateChanged(auth, async (usuario) => {

  // Não está autenticado
  if (!usuario) {
    window.location.replace("./index.html");
    return;
  }

  try {

    // Buscar cadastro administrativo usando o UID
    const referenciaUsuario = doc(db, "usuarios", usuario.uid);

    const documentoUsuario = await getDoc(referenciaUsuario);


    // Usuário autenticado, mas sem cadastro administrativo
    if (!documentoUsuario.exists()) {

      console.error("Usuário não possui cadastro administrativo.");

      await signOut(auth);

      window.location.replace("./index.html");

      return;
    }


    // Dados salvos no Firestore
    const dadosUsuario = documentoUsuario.data();


    // Verificar se o usuário está ativo
    if (dadosUsuario.ativo !== true) {

      console.error("Usuário administrativo desativado.");

      await signOut(auth);

      window.location.replace("./index.html");

      return;
    }


    // ==========================================
    // DADOS DO USUÁRIO
    // ==========================================

    console.log("Usuário autenticado:", {
      nome: dadosUsuario.nome,
      funcao: dadosUsuario.funcao,
      lojas: dadosUsuario.lojas
    });


    // Mostrar e-mail no painel
    const usuarioEmail = document.getElementById("usuarioEmail");

    if (usuarioEmail) {
      usuarioEmail.textContent = usuario.email;
    }


} catch (erro) {
  console.error("Erro ao verificar usuário:", erro);

  // TEMPORÁRIO: manter a sessão para investigar o problema.
  const aviso = document.createElement("pre");
  aviso.style.cssText =
    "margin:20px;padding:16px;background:#fee;color:#900;white-space:pre-wrap;";

  aviso.textContent =
    "Falha ao verificar o administrador:\n" +
    (erro?.code || "") +
    "\n" +
    (erro?.message || String(erro));

  document.body.prepend(aviso);
}

});


// ==========================================
// SAIR DO PAINEL
// ==========================================

const btnSair = document.getElementById("btnSair");

if (btnSair) {

  btnSair.addEventListener("click", async () => {

    try {

      await signOut(auth);

      window.location.replace("./index.html");

    } catch (erro) {

      console.error("Erro ao sair:", erro);

    }

  });

}