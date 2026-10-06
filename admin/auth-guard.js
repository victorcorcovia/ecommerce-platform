// ==========================================
// PROTEÇÃO DO PAINEL ADMINISTRATIVO
// ==========================================

import { auth } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "firebase/auth";


// ==========================================
// VERIFICAR USUÁRIO
// ==========================================

onAuthStateChanged(auth, (usuario) => {

  if (!usuario) {
    window.location.replace("./index.html");
    return;
  }

  // Mostrar e-mail do usuário no painel
  const usuarioEmail = document.getElementById("usuarioEmail");

  if (usuarioEmail) {
    usuarioEmail.textContent = usuario.email;
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