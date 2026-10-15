
"use strict";

const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const { v2: cloudinary } = require("cloudinary");
const crypto = require("node:crypto");

// ==========================================
// FIREBASE ADMIN
// ==========================================

initializeApp();

const db = getFirestore();

// ==========================================
// SEGREDO DO CLOUDINARY
// ==========================================

const cloudinaryApiSecret = defineSecret("CLOUDINARY_API_SECRET");

// ==========================================
// CONFIGURAÇÕES GERAIS
// ==========================================

setGlobalOptions({
  maxInstances: 10,
  memory: "256MiB",
  timeoutSeconds: 30,
});

// ==========================================
// CONFIGURAÇÕES DAS LOJAS
// ==========================================

const PASTAS_PRODUTOS = Object.freeze({
  closet: "Lojas-Lolly/Closet/produtos",
  "3d": "Lojas-Lolly/Decor3D/produtos",
});

// ==========================================
// FUNÇÃO AUXILIAR: VALIDAR ADMINISTRADOR
// ==========================================

async function validarAdministrador(request, loja) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Você precisa estar autenticado."
    );
  }

  if (
    typeof loja !== "string" ||
    !Object.hasOwn(PASTAS_PRODUTOS, loja)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Loja inválida. Utilize closet ou 3d."
    );
  }

  let usuarioDoc;

  try {
    usuarioDoc = await db
      .collection("usuarios")
      .doc(request.auth.uid)
      .get();
  } catch (erro) {
    console.error("Erro ao consultar usuário:", erro);

    throw new HttpsError(
      "internal",
      "Não foi possível validar as permissões."
    );
  }

  if (!usuarioDoc.exists) {
    throw new HttpsError(
      "permission-denied",
      "Usuário não cadastrado no sistema."
    );
  }

  const usuario = usuarioDoc.data();

  if (usuario.ativo !== true) {
    throw new HttpsError(
      "permission-denied",
      "Usuário desativado."
    );
  }

  if (usuario.funcao !== "administrador") {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem gerenciar produtos e imagens."
    );
  }

  if (usuario.lojas?.[loja] !== true) {
    throw new HttpsError(
      "permission-denied",
      "Você não possui acesso a esta loja."
    );
  }
}

// ==========================================
// FUNÇÃO AUXILIAR: CONFIGURAR CLOUDINARY
// ==========================================

function configurarCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = cloudinaryApiSecret.value();

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("Configuração do Cloudinary incompleta.");

    throw new HttpsError(
      "internal",
      "Serviço de imagens indisponível."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return { cloudName, apiKey, apiSecret };
}

// ==========================================
// FUNÇÃO: AUTORIZAR UPLOAD DE PRODUTO
// ==========================================

exports.autorizarUploadProduto = onCall(
  {
    secrets: [cloudinaryApiSecret],
    enforceAppCheck: false,
    maxInstances: 5,
  },
  async (request) => {
    const loja = request.data?.loja;

    // 1. Validar usuário e loja
    await validarAdministrador(request, loja);

    // 2. Configurar Cloudinary
    const { cloudName, apiKey, apiSecret } =
      configurarCloudinary();

    // 3. Preparar upload
    const pastaDestino = PASTAS_PRODUTOS[loja];

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = crypto.randomUUID();

    const parametrosUpload = {
      timestamp,
      folder: pastaDestino,
      public_id: publicId,
      overwrite: false,
    };

    // 4. Gerar assinatura
    const signature = cloudinary.utils.api_sign_request(
      parametrosUpload,
      apiSecret
    );

    // 5. Retornar autorização
    return {
      autorizado: true,
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder: pastaDestino,
      publicId,
      overwrite: false,
    };
  }
);

// ==========================================
// FUNÇÃO: EXCLUIR IMAGEM DE PRODUTO
// BLOQUEADA TEMPORARIAMENTE
// ==========================================

exports.excluirImagemProduto = onCall(
  {
    secrets: [cloudinaryApiSecret],
    enforceAppCheck: false,
    maxInstances: 5,
  },
  async (request) => {
    await validarAdministrador(request, request.data?.loja);

    throw new HttpsError(
      "failed-precondition",
      "Exclusão direta desativada. Utilize o processo seguro de exclusão."
    );
  }
);

// ==========================================
// FUNÇÃO AUXILIAR:
// REGISTRAR EXCLUSÃO PENDENTE
// ==========================================

function registrarExclusaoPendente(
  transacao,
  { loja, produtoId, publicId }
) {
  const referencia = db
    .collection("exclusoesImagensPendentes")
    .doc();

  transacao.set(referencia, {
    loja,
    produtoId,
    publicId,
    status: "pendente",
    tentativas: 0,
    criadoEm: FieldValue.serverTimestamp(),
  });

  return referencia.id;
}

// ==========================================
// FUNÇÃO: ATUALIZAR PRODUTO E IMAGENS
// ==========================================

exports.atualizarImagensProduto = onCall(
  {
    secrets: [cloudinaryApiSecret],
    enforceAppCheck: false,
    maxInstances: 5,
  },
  async (request) => {
    const {
      loja,
      produtoId,
      imagens,
      dadosProduto,
      imagensOriginaisIds,
    } = request.data || {};

    // --------------------------------------
    // 1. Validar administrador
    // --------------------------------------

    await validarAdministrador(request, loja);

    // --------------------------------------
    // 2. Validar dados do produto
    // --------------------------------------

    if (
      !dadosProduto ||
      typeof dadosProduto !== "object" ||
      Array.isArray(dadosProduto)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Os dados do produto são inválidos."
      );
    }

    const {
      nome,
      categoriaId,
      preco,
      status,
      descricao,
    } = dadosProduto;

    if (
      typeof nome !== "string" ||
      !nome.trim() ||
      typeof categoriaId !== "string" ||
      !categoriaId.trim() ||
      categoriaId.includes("/") ||
      typeof preco !== "number" ||
      !Number.isFinite(preco) ||
      preco < 0 ||
      typeof status !== "string" ||
      !status.trim() ||
      typeof descricao !== "string"
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Preencha corretamente os dados do produto."
      );
    }

    // --------------------------------------
    // 3. Validar identificador do produto
    // --------------------------------------

    if (
      typeof produtoId !== "string" ||
      !produtoId.trim() ||
      produtoId.includes("/")
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Identificador do produto inválido."
      );
    }

    // --------------------------------------
    // 4. Validar lista de imagens
    // --------------------------------------

    if (
      !Array.isArray(imagens) ||
      imagens.length > 30
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Lista de imagens inválida."
      );
    }

    const { cloudName } = configurarCloudinary();

    const pastaAutorizada =
      PASTAS_PRODUTOS[loja] + "/";

    const ids = new Set();

    for (const imagem of imagens) {
      if (
        !imagem ||
        typeof imagem.url !== "string" ||
        typeof imagem.publicId !== "string" ||
        !imagem.publicId.startsWith(pastaAutorizada) ||
        !/^[a-zA-Z0-9/_-]+$/.test(imagem.publicId) ||
        ids.has(imagem.publicId)
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Uma das imagens é inválida ou está duplicada."
        );
      }

      ids.add(imagem.publicId);
    }

    // --------------------------------------
    // 5. Verificar imagens no Cloudinary
    // --------------------------------------

    for (const imagem of imagens) {
      let resultado;

      try {
        resultado = await cloudinary.api.resource(
          imagem.publicId,
          { resource_type: "image" }
        );
      } catch (erro) {
        if (erro.http_code === 404) {
          throw new HttpsError(
            "invalid-argument",
            "Uma das imagens informadas não existe no Cloudinary."
          );
        }

        console.error(
          "Erro ao consultar imagem no Cloudinary:",
          erro
        );

        throw new HttpsError(
          "internal",
          "Não foi possível verificar as imagens no Cloudinary."
        );
      }

      if (
        resultado.public_id !== imagem.publicId ||
        resultado.secure_url !== imagem.url
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Os dados de uma imagem não correspondem ao arquivo no Cloudinary."
        );
      }

      if (
        !resultado.secure_url.startsWith(
          `https://res.cloudinary.com/${cloudName}/image/upload/`
        )
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Uma das imagens pertence a uma conta inválida."
        );
      }
    }

    // --------------------------------------
    // 6. Preparar referências Firestore
    // --------------------------------------

    const referenciaProduto = db
      .collection("produtos")
      .doc(produtoId);

    const referenciaCategoria = db
      .collection("categorias")
      .doc(categoriaId.trim());

    // --------------------------------------
    // 7. Atualizar produto em transação
    // --------------------------------------

    const resultado = await db.runTransaction(
      async (transacao) => {
        const documento = await transacao.get(
          referenciaProduto
        );

        const documentoCategoria = await transacao.get(
          referenciaCategoria
        );

        // Validar categoria
        if (!documentoCategoria.exists) {
          throw new HttpsError(
            "failed-precondition",
            "A categoria selecionada não existe."
          );
        }

        if (
          documentoCategoria.data().loja !== loja
        ) {
          throw new HttpsError(
            "permission-denied",
            "A categoria selecionada não pertence a esta loja."
          );
        }

        // Validar produto
        if (!documento.exists) {
          throw new HttpsError(
            "not-found",
            "Produto não encontrado."
          );
        }

        const produto = documento.data();

        if (produto.loja !== loja) {
          throw new HttpsError(
            "permission-denied",
            "Produto não pertence à loja informada."
          );
        }

        // ----------------------------------
        // 8. Conferir imagens anteriores
        // ----------------------------------

        const imagensAnteriores =
          Array.isArray(produto.imagens)
            ? produto.imagens
            : [];

        const idsAnteriores = imagensAnteriores
          .map((imagem) => imagem?.publicId)
          .filter((id) => typeof id === "string");

        if (
          !Array.isArray(imagensOriginaisIds) ||
          imagensOriginaisIds.length !==
            idsAnteriores.length ||
          imagensOriginaisIds.some(
            (id, indice) =>
              id !== idsAnteriores[indice]
          )
        ) {
          throw new HttpsError(
            "aborted",
            "As imagens deste produto foram alteradas. Atualize a página antes de salvar."
          );
        }

        // ----------------------------------
        // 9. Identificar imagens removidas
        // ----------------------------------

        const imagensRemovidas =
          imagensAnteriores.filter(
            (imagem) =>
              !ids.has(imagem.publicId)
          );

        // ----------------------------------
        // 10. Registrar exclusões pendentes
        // ----------------------------------

        for (const imagem of imagensRemovidas) {
          const publicId = imagem?.publicId;

          if (
            typeof publicId !== "string" ||
            !publicId.startsWith(
              pastaAutorizada
            ) ||
            !/^[a-zA-Z0-9/_-]+$/.test(publicId)
          ) {
            throw new HttpsError(
              "failed-precondition",
              "O produto contém uma imagem com identificador inválido."
            );
          }

          registrarExclusaoPendente(
            transacao,
            {
              loja,
              produtoId,
              publicId,
            }
          );
        }

        // ----------------------------------
        // 11. Salvar dados e imagens
        // ----------------------------------

        transacao.update(
          referenciaProduto,
          {
            nome: nome.trim(),
            categoriaId: categoriaId.trim(),
            preco,
            status: status.trim(),
            descricao: descricao.trim(),
            imagens,
            atualizadoEm:
              FieldValue.serverTimestamp(),
          }
        );

        return {
          imagensRemovidas:
            imagensRemovidas.length,
        };
      }
    );

    // --------------------------------------
    // 12. Retornar resultado
    // --------------------------------------

    return {
      sucesso: true,
      ...resultado,
    };
  }
);
