// ==========================================
// LOGIN - PAINEL ADMINISTRATIVO
// ==========================================

import { auth } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "firebase/auth";


// ==========================================
// ELEMENTOS
// ==========================================

const formLogin = document.getElementById("formLogin");
const emailLogin = document.getElementById("emailLogin");
const senhaLogin = document.getElementById("senhaLogin");
const mensagemLogin = document.getElementById("mensagemLogin");

// ==========================================
// USUÁRIO JÁ ESTÁ LOGADO?
// ==========================================

onAuthStateChanged(auth, (usuario) => {
  if (usuario) {
    window.location.replace("./dashboard.html");
  }
});


// ==========================================
// REALIZAR LOGIN
// ==========================================

if (formLogin) {
  formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailLogin.value.trim();
    const senha = senhaLogin.value;

    mensagemLogin.textContent = "Entrando...";

    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        senha
      );

      // Login realizado
      window.location.href = "./dashboard.html";

    } catch (erro) {

      console.error("Erro no login:", erro);

      mensagemLogin.textContent =
        "E-mail ou senha incorretos.";
    }
  });
}