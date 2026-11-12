
import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";

import { doc, getDoc, setDoc } from "firebase/firestore";

let ambiente;

before(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: "lojas-lolly",
    firestore: {
      host: "127.0.0.1",
      port: 8081,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });

  await ambiente.withSecurityRulesDisabled(async (contexto) => {
    const db = contexto.firestore();

    await setDoc(doc(db, "catalogoPublico", "teste-seguranca-closet"), {
      loja: "closet",
      nome: "Produto de teste",
    });
  });
});

after(async () => {
  if (ambiente) await ambiente.cleanup();
});

test("Visitante pode consultar catálogo público", async () => {
  const db = ambiente.unauthenticatedContext().firestore();

  await assertSucceeds(
    getDoc(doc(db, "catalogoPublico", "teste-seguranca-closet"))
  );
});

test("Visitante não pode alterar catálogo público", async () => {
  const db = ambiente.unauthenticatedContext().firestore();

  await assertFails(
    setDoc(doc(db, "catalogoPublico", "teste-seguranca-closet"), {
      loja: "closet",
      nome: "Alteração indevida",
    })
  );
});

test("Visitante não pode cadastrar produto administrativo", async () => {
  const db = ambiente.unauthenticatedContext().firestore();

  await assertFails(
    setDoc(doc(db, "produtos", "teste-produto-nao-autorizado"), {
      loja: "closet",
      nome: "Produto indevido",
    })
  );
});

test("Visitante não pode consultar dados de clientes", async () => {
  const db = ambiente.unauthenticatedContext().firestore();

  await assertFails(
    getDoc(doc(db, "clientes", "teste-cliente-privado"))
  );
});
