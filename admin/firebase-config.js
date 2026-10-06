// ==========================================
// FIREBASE - CONFIGURAÇÃO
// ==========================================

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";


// Configuração do projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAh60FCexFry1q3o2Ba0hzJ0EY7cWC-HbU",
  authDomain: "lojas-lolly.firebaseapp.com",
  projectId: "lojas-lolly",
  storageBucket: "lojas-lolly.firebasestorage.app",
  messagingSenderId: "839120440809",
  appId: "1:839120440809:web:dd484410d70212318b0f78",
  measurementId: "G-6QHYSPZJ19"
};


// Inicializar Firebase
const app = initializeApp(firebaseConfig);


// Inicializar Authentication
const auth = getAuth(app);


// Exportar para outros arquivos
export { app, auth };