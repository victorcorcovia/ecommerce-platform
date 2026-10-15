// ==========================================
// FIREBASE - CONFIGURAÇÃO
// ==========================================

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

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


// Inicializar Cloud Firestore
const db = getFirestore(app);

// Inicializar Firebase Functions
const functions = getFunctions(app, "us-central1");

// Conectar aos emuladores somente no ambiente local
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });

  connectFirestoreEmulator(db, "127.0.0.1", 8080);

  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

// Exportar para outros arquivos
export { app, auth, db, functions };