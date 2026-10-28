"use strict";

const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const { v2: cloudinary } = require("cloudinary");
const crypto = require("node:crypto");

// ==========================================
// IDENTIFICADOR DO CONTROLE DE IMAGENS
// ==========================================

function obterIdControleImagem(publicId) {
  if (typeof publicId !== "string" || !publicId.trim()) {
    throw new HttpsError(
      "invalid-argument",
      "Identificador da imagem inválido.",
    );
  }

  return crypto.createHash("sha256").update(publicId, "utf8").digest("hex");
}

function referenciaControleImagem(publicId) {
  return db
    .collection("controleImagensProdutos")
    .doc(obterIdControleImagem(publicId));
}

// ==========================================
// VALIDAR CONTROLE DE IMAGEM
// ==========================================

function verificarControleImagemDisponivel(documento, publicId) {
  if (!documento.exists) {
    return;
  }

  const controle = documento.data();

  if (controle.publicId !== publicId || controle.status !== "ativa") {
    throw new HttpsError(
      "failed-precondition",
      "Esta imagem está bloqueada ou reservada para exclusão.",
    );
  }
}

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

const PASTAS_BANNERS = Object.freeze({
  closet: "Lojas-Lolly/Closet/banners",
  "3d": "Lojas-Lolly/Decor3D/banners",
});
// ==========================================
// FUNÇÃO AUXILIAR: VALIDAR ADMINISTRADOR
// ==========================================

async function validarAdministrador(request, loja) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Você precisa estar autenticado.");
  }

  if (typeof loja !== "string" || !Object.hasOwn(PASTAS_PRODUTOS, loja)) {
    throw new HttpsError(
      "invalid-argument",
      "Loja inválida. Utilize closet ou 3d.",
    );
  }

  let usuarioDoc;

  try {
    usuarioDoc = await db.collection("usuarios").doc(request.auth.uid).get();
  } catch (erro) {
    console.error("Erro ao consultar usuário:", erro);

    throw new HttpsError("internal", "Não foi possível validar as permissões.");
  }

  if (!usuarioDoc.exists) {
    throw new HttpsError(
      "permission-denied",
      "Usuário não cadastrado no sistema.",
    );
  }

  const usuario = usuarioDoc.data();

  if (usuario.ativo !== true) {
    throw new HttpsError("permission-denied", "Usuário desativado.");
  }

  if (usuario.funcao !== "administrador") {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem gerenciar produtos e imagens.",
    );
  }

  if (usuario.lojas?.[loja] !== true) {
    throw new HttpsError(
      "permission-denied",
      "Você não possui acesso a esta loja.",
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

    throw new HttpsError("internal", "Serviço de imagens indisponível.");
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
    const { cloudName, apiKey, apiSecret } = configurarCloudinary();

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
      apiSecret,
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
  },
);

// ==========================================
// AUTORIZAR UPLOAD DE BANNER
// ==========================================

exports.autorizarUploadBanner = onCall(
  {
    secrets: [cloudinaryApiSecret],
    enforceAppCheck: false,
    maxInstances: 5,
  },
  async (request) => {
    const loja = request.data?.loja;

    // Validar administrador e acesso à loja
    await validarAdministrador(request, loja);

    // Configurar Cloudinary
    const { cloudName, apiKey, apiSecret } = configurarCloudinary();

    // Pasta específica dos banners
    const pastaDestino = PASTAS_BANNERS[loja];

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = crypto.randomUUID();

    const parametrosUpload = {
      timestamp,
      folder: pastaDestino,
      public_id: publicId,
      overwrite: false,
    };

    const signature = cloudinary.utils.api_sign_request(
      parametrosUpload,
      apiSecret,
    );

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
  },
);

// ==========================================
// SALVAR BANNER COM HISTÓRICO
// ==========================================

exports.salvarBannerLoja = onCall(
  {
    secrets: [cloudinaryApiSecret],
    enforceAppCheck: false,
    maxInstances: 5,
  },
  async (request) => {
    const { loja, tipo, cor, imagem } = request.data || {};

    await validarAdministrador(request, loja);

    if (!["imagem", "cor"].includes(tipo)) {
      throw new HttpsError("invalid-argument", "Tipo de banner inválido.");
    }

    let novoBanner;

    if (tipo === "cor") {
      if (typeof cor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(cor)) {
        throw new HttpsError("invalid-argument", "Cor inválida.");
      }

      novoBanner = { tipo: "cor", cor: cor.toLowerCase() };
    } else {
      if (
        !imagem ||
        typeof imagem.url !== "string" ||
        typeof imagem.publicId !== "string" ||
        !imagem.publicId.startsWith(PASTAS_BANNERS[loja] + "/")
      ) {
        throw new HttpsError("invalid-argument", "Imagem inválida.");
      }

      const { cloudName } = configurarCloudinary();

      let recurso;

      try {
        recurso = await cloudinary.api.resource(imagem.publicId, {
          resource_type: "image",
        });
      } catch (erro) {
        console.error("Erro ao verificar banner:", erro);
        throw new HttpsError(
          "failed-precondition",
          "Não foi possível verificar a imagem no Cloudinary.",
        );
      }

      if (
        recurso.public_id !== imagem.publicId ||
        recurso.secure_url !== imagem.url ||
        !recurso.secure_url.startsWith(
          `https://res.cloudinary.com/${cloudName}/image/upload/`,
        )
      ) {
        throw new HttpsError("invalid-argument", "Imagem não autorizada.");
      }

      novoBanner = {
        tipo: "imagem",
        imagem: {
          url: imagem.url,
          publicId: imagem.publicId,
        },
      };
    }

    const referenciaBanner = db.collection("aparenciaLojas").doc(loja);
    const referenciaHistorico = db.collection("historicoBanners").doc();

    await db.runTransaction(async (transacao) => {
      const documentoAtual = await transacao.get(referenciaBanner);

      const bannerAnterior = documentoAtual.exists
        ? documentoAtual.data()
        : null;

      transacao.set(referenciaHistorico, {
        loja,
        anterior: bannerAnterior
          ? {
              tipo: bannerAnterior.tipo,
              cor: bannerAnterior.cor || null,
              imagem: bannerAnterior.imagem || null,
            }
          : null,
        novo: novoBanner,
        administradorUid: request.auth.uid,
        dataHora: FieldValue.serverTimestamp(),
        acao: "alteracao",
      });

      transacao.set(
        referenciaBanner,
        {
          ...novoBanner,
          atualizadoPor: request.auth.uid,
          atualizadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    return { sucesso: true };
  },
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
      "Exclusão direta desativada. Utilize o processo seguro de exclusão.",
    );
  },
);

// ==========================================
// FUNÇÃO AUXILIAR:
// REGISTRAR EXCLUSÃO PENDENTE
// ==========================================

function registrarExclusaoPendente(transacao, { loja, produtoId, publicId }) {
  const referencia = db.collection("exclusoesImagensPendentes").doc();

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
    const { loja, produtoId, imagens, dadosProduto, imagensOriginaisIds } =
      request.data || {};

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
        "Os dados do produto são inválidos.",
      );
    }

    const { nome, categoriaId, preco, status, descricao } = dadosProduto;
    const cores = validarCoresProduto(dadosProduto.cores);
    const tamanhos = validarTamanhosProduto(dadosProduto.tamanhos);

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
        "Preencha corretamente os dados do produto.",
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
        "Identificador do produto inválido.",
      );
    }

    // --------------------------------------
    // 4. Validar lista de imagens
    // --------------------------------------

    if (!Array.isArray(imagens) || imagens.length > 30) {
      throw new HttpsError("invalid-argument", "Lista de imagens inválida.");
    }

    const { cloudName } = configurarCloudinary();

    const pastaAutorizada = PASTAS_PRODUTOS[loja] + "/";

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
          "Uma das imagens é inválida ou está duplicada.",
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
        resultado = await cloudinary.api.resource(imagem.publicId, {
          resource_type: "image",
        });
      } catch (erro) {
        if (erro.http_code === 404) {
          throw new HttpsError(
            "invalid-argument",
            "Uma das imagens informadas não existe no Cloudinary.",
          );
        }

        console.error("Erro ao consultar imagem no Cloudinary:", erro);

        throw new HttpsError(
          "internal",
          "Não foi possível verificar as imagens no Cloudinary.",
        );
      }

      if (
        resultado.public_id !== imagem.publicId ||
        resultado.secure_url !== imagem.url
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Os dados de uma imagem não correspondem ao arquivo no Cloudinary.",
        );
      }

      if (
        !resultado.secure_url.startsWith(
          `https://res.cloudinary.com/${cloudName}/image/upload/`,
        )
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Uma das imagens pertence a uma conta inválida.",
        );
      }
    }

    // --------------------------------------
    // 6. Preparar referências Firestore
    // --------------------------------------

    const referenciaProduto = db.collection("produtos").doc(produtoId);

    const referenciaCategoria = db
      .collection("categorias")
      .doc(categoriaId.trim());

    // --------------------------------------
    // 7. Atualizar produto em transação
    // --------------------------------------

    const resultado = await db.runTransaction(async (transacao) => {
      // 1. Ler produto e categoria
      const documento = await transacao.get(referenciaProduto);
      const documentoCategoria = await transacao.get(referenciaCategoria);

      if (!documentoCategoria.exists) {
        throw new HttpsError(
          "failed-precondition",
          "A categoria selecionada não existe.",
        );
      }

      if (documentoCategoria.data().loja !== loja) {
        throw new HttpsError(
          "permission-denied",
          "A categoria não pertence a esta loja.",
        );
      }

      if (!documento.exists) {
        throw new HttpsError("not-found", "Produto não encontrado.");
      }

      const produto = documento.data();

      if (produto.loja !== loja) {
        throw new HttpsError(
          "permission-denied",
          "Produto não pertence à loja informada.",
        );
      }

      // 2. Conferir imagens anteriores
      const imagensAnteriores = Array.isArray(produto.imagens)
        ? produto.imagens
        : [];

      const idsAnteriores = imagensAnteriores
        .map((imagem) => imagem?.publicId)
        .filter((id) => typeof id === "string");

      if (
        !Array.isArray(imagensOriginaisIds) ||
        imagensOriginaisIds.length !== idsAnteriores.length ||
        imagensOriginaisIds.some((id, indice) => id !== idsAnteriores[indice])
      ) {
        throw new HttpsError(
          "aborted",
          "As imagens deste produto foram alteradas. Atualize a página.",
        );
      }

      // 3. Identificar imagens removidas
      const imagensRemovidas = imagensAnteriores.filter(
        (imagem) => !ids.has(imagem.publicId),
      );

      // 4. Validar imagens antigas
      for (const imagem of imagensAnteriores) {
        const publicId = imagem?.publicId;

        if (
          typeof publicId !== "string" ||
          !publicId.startsWith(pastaAutorizada) ||
          !/^[a-zA-Z0-9/_-]+$/.test(publicId)
        ) {
          throw new HttpsError(
            "failed-precondition",
            "O produto contém uma imagem com identificador inválido.",
          );
        }
      }

      // 5. Consultar todos os controles antes das escritas
      const idsParaConsultar = new Set([
        ...idsAnteriores,
        ...imagens.map((imagem) => imagem.publicId),
      ]);

      const controles = new Map();

      for (const publicId of idsParaConsultar) {
        const referencia = referenciaControleImagem(publicId);
        const documentoControle = await transacao.get(referencia);

        controles.set(publicId, {
          referencia,
          documento: documentoControle,
        });
      }

      // 6. Validar vínculos existentes
      for (const publicId of idsParaConsultar) {
        const controle = controles.get(publicId);

        if (!controle.documento.exists) {
          continue;
        }

        const dadosControle = controle.documento.data();

        if (
          dadosControle.publicId !== publicId ||
          dadosControle.produtoId !== produtoId ||
          dadosControle.loja !== loja ||
          dadosControle.status !== "ativa"
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Uma imagem está vinculada a outro produto ou bloqueada.",
          );
        }
      }

      // 7. Registrar imagens mantidas e adicionadas
      for (const imagem of imagens) {
        const publicId = imagem.publicId;
        const controle = controles.get(publicId);

        if (!controle.documento.exists) {
          transacao.create(controle.referencia, {
            publicId,
            loja,
            produtoId,
            status: "ativa",
            criadoEm: FieldValue.serverTimestamp(),
          });
        }
      }

      // 8. Bloquear imagens removidas
      for (const imagem of imagensRemovidas) {
        const publicId = imagem.publicId;
        const controle = controles.get(publicId);

        if (controle.documento.exists) {
          transacao.update(controle.referencia, {
            status: "excluindo",
            atualizadoEm: FieldValue.serverTimestamp(),
          });
        } else {
          transacao.create(controle.referencia, {
            publicId,
            loja,
            produtoId,
            status: "excluindo",
            criadoEm: FieldValue.serverTimestamp(),
          });
        }

        registrarExclusaoPendente(transacao, {
          loja,
          produtoId,
          publicId,
        });
      }

      // 9. Atualizar produto
      transacao.update(referenciaProduto, {
        nome: nome.trim(),
        categoriaId: categoriaId.trim(),
        preco,
        status: status.trim(),
        descricao: descricao.trim(),
        imagens,
        cores,
        tamanhos,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      return {
        imagensRemovidas: imagensRemovidas.length,
      };
    });

    // --------------------------------------
    // 12. Retornar resultado
    // --------------------------------------

    return {
      sucesso: true,
      ...resultado,
    };
  },
);

exports.sincronizarCatalogoPublico =
  require("./catalogo-publico.js").sincronizarCatalogoPublico;

exports.sincronizarCategoriasPublicas =
  require("./categorias-publicas.js").sincronizarCategoriasPublicas;

// ==========================================
// FUNÇÃO: EXCLUIR PRODUTO COM SEGURANÇA
// ==========================================

exports.excluirProdutoSeguro = onCall(
  {
    maxInstances: 5,
    enforceAppCheck: false,
  },
  async (request) => {
    const { loja, produtoId } = request.data || {};

    // 1. Validar administrador e acesso à loja
    await validarAdministrador(request, loja);

    // 2. Validar identificador
    if (
      typeof produtoId !== "string" ||
      !produtoId.trim() ||
      produtoId.includes("/")
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Identificador do produto inválido.",
      );
    }

    const referenciaProduto = db.collection("produtos").doc(produtoId);

    const pastaAutorizada = PASTAS_PRODUTOS[loja] + "/";

    // 3. Excluir produto e reservar suas imagens em uma transação
    const resultado = await db.runTransaction(async (transacao) => {
      const documento = await transacao.get(referenciaProduto);

      if (!documento.exists) {
        throw new HttpsError("not-found", "Produto não encontrado.");
      }

      const produto = documento.data();

      if (produto.loja !== loja) {
        throw new HttpsError(
          "permission-denied",
          "O produto não pertence à loja informada.",
        );
      }

      const imagens = Array.isArray(produto.imagens) ? produto.imagens : [];

      // Validar identificadores e impedir imagens duplicadas
      const publicIds = new Set();

      for (const imagem of imagens) {
        const publicId = imagem?.publicId;

        if (
          typeof publicId !== "string" ||
          !publicId.startsWith(pastaAutorizada) ||
          !/^[a-zA-Z0-9/_-]+$/.test(publicId) ||
          publicIds.has(publicId)
        ) {
          throw new HttpsError(
            "failed-precondition",
            "O produto possui imagens inválidas ou duplicadas.",
          );
        }

        publicIds.add(publicId);
      }

      // Ler todos os controles antes de realizar escritas
      const controles = [];

      for (const publicId of publicIds) {
        const referencia = referenciaControleImagem(publicId);
        const documentoControle = await transacao.get(referencia);

        controles.push({
          publicId,
          referencia,
          documento: documentoControle,
        });
      }

      // Validar que nenhum controle pertence a outro produto
      // ou está reservado para exclusão
      for (const controle of controles) {
        if (!controle.documento.exists) {
          continue;
        }

        const dados = controle.documento.data();

        if (
          dados.publicId !== controle.publicId ||
          dados.produtoId !== produtoId ||
          dados.loja !== loja ||
          dados.status !== "ativa"
        ) {
          throw new HttpsError(
            "failed-precondition",
            "Uma imagem está vinculada a outro produto ou bloqueada.",
          );
        }
      }

      // Bloquear as imagens e registrar a limpeza pendente
      for (const controle of controles) {
        if (controle.documento.exists) {
          transacao.update(controle.referencia, {
            status: "excluindo",
            atualizadoEm: FieldValue.serverTimestamp(),
          });
        } else {
          transacao.create(controle.referencia, {
            publicId: controle.publicId,
            loja,
            produtoId,
            status: "excluindo",
            criadoEm: FieldValue.serverTimestamp(),
          });
        }

        registrarExclusaoPendente(transacao, {
          loja,
          produtoId,
          publicId: controle.publicId,
        });
      }

      // Excluir o documento do produto na mesma transação
      transacao.delete(referenciaProduto);

      return {
        imagensPendentes: controles.length,
      };
    });

    return {
      sucesso: true,
      ...resultado,
    };
  },
);

// ==========================================
// FUNÇÃO: PROCESSAR EXCLUSÕES PENDENTES
// ==========================================

exports.processarExclusaoImagemPendente = onDocumentCreated(
  {
    document: "exclusoesImagensPendentes/{exclusaoId}",
    region: "us-central1",
    secrets: [cloudinaryApiSecret],
    maxInstances: 5,
    retry: false,
  },
  async (event) => {
    const exclusaoId = event.params.exclusaoId;

    const referenciaExclusao = db
      .collection("exclusoesImagensPendentes")
      .doc(exclusaoId);

    const processamentoId = crypto.randomUUID();

    let dados;

    // ======================================
    // 1. VALIDAR E RESERVAR A EXCLUSÃO
    // ======================================

    const reservaConfirmada = await db.runTransaction(async (transacao) => {
      const documento = await transacao.get(referenciaExclusao);

      if (!documento.exists) {
        return false;
      }

      const exclusao = documento.data();

      if (exclusao.status !== "pendente") {
        return false;
      }

      const { loja, produtoId, publicId } = exclusao;

      const dadosValidos =
        typeof loja === "string" &&
        Object.hasOwn(PASTAS_PRODUTOS, loja) &&
        typeof produtoId === "string" &&
        produtoId.trim().length > 0 &&
        !produtoId.includes("/") &&
        typeof publicId === "string" &&
        publicId.startsWith(PASTAS_PRODUTOS[loja] + "/") &&
        /^[a-zA-Z0-9/_-]+$/.test(publicId);

      if (!dadosValidos) {
        transacao.update(referenciaExclusao, {
          status: "invalida",
          motivo: "Dados da exclusão inválidos.",
          finalizadoEm: FieldValue.serverTimestamp(),
        });

        return false;
      }

      dados = {
        loja,
        produtoId,
        publicId,
      };

      transacao.update(referenciaExclusao, {
        status: "processando",
        processamentoId,
        iniciadoEm: FieldValue.serverTimestamp(),
        tentativas: FieldValue.increment(1),
      });

      return true;
    });

    if (!reservaConfirmada) {
      console.log("Exclusão indisponível ou já reservada:", exclusaoId);

      return;
    }

    await referenciaExclusao.update({
      status: "aguardando_revisao",
      motivo: "Exclusão automática temporariamente desativada.",
      finalizadoEm: FieldValue.serverTimestamp(),
    });

    console.warn("Exclusão automática suspensa para revisão:", exclusaoId);

    return;
    console.log("Exclusão reservada:", exclusaoId);

    // ======================================
    // 2. PROCESSAR COM TRATAMENTO DE ERROS
    // ======================================

    try {
      const { publicId } = dados;

      // ====================================
      // 3. VERIFICAR IMAGENS EM USO
      // ====================================

      // Consulta produtos das duas lojas.
      // Se a consulta falhar, não exclui a imagem.

      const produtos = await db.collection("produtos").get();

      const imagemEmUso = produtos.docs.some((documento) => {
        const imagens = documento.data().imagens;

        return (
          Array.isArray(imagens) &&
          imagens.some((imagem) => imagem?.publicId === publicId)
        );
      });

      if (imagemEmUso) {
        await db.runTransaction(async (transacao) => {
          const documento = await transacao.get(referenciaExclusao);

          if (
            documento.exists &&
            documento.data().status === "processando" &&
            documento.data().processamentoId === processamentoId
          ) {
            transacao.update(referenciaExclusao, {
              status: "bloqueada",
              motivo: "Imagem ainda vinculada a um produto.",
              finalizadoEm: FieldValue.serverTimestamp(),
            });
          }
        });

        console.warn("Exclusão bloqueada: imagem em uso.", exclusaoId);

        return;
      }

      // ====================================
      // 4. CONFERIR A RESERVA
      // ====================================

      const estadoAtual = await referenciaExclusao.get();

      if (
        !estadoAtual.exists ||
        estadoAtual.data().status !== "processando" ||
        estadoAtual.data().processamentoId !== processamentoId
      ) {
        console.warn("A exclusão não está mais reservada:", exclusaoId);

        return;
      }

      // ====================================
      // 5. EXCLUIR NO CLOUDINARY
      // ====================================

      configurarCloudinary();

      const resultado = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      });

      if (!resultado || !["ok", "not found"].includes(resultado.result)) {
        throw new Error("Cloudinary não confirmou a exclusão.");
      }

      // ====================================
      // 6. REGISTRAR SUCESSO
      // ====================================

      await db.runTransaction(async (transacao) => {
        const documento = await transacao.get(referenciaExclusao);

        if (
          documento.exists &&
          documento.data().status === "processando" &&
          documento.data().processamentoId === processamentoId
        ) {
          transacao.update(referenciaExclusao, {
            status: "concluida",
            resultadoCloudinary: resultado.result,
            finalizadoEm: FieldValue.serverTimestamp(),
            motivo: FieldValue.delete(),
          });
        }
      });

      console.log("Exclusão de imagem concluída:", exclusaoId);
    } catch (erro) {
      // ====================================
      // 7. REGISTRAR FALHAS
      // ====================================

      console.error("Erro ao processar exclusão:", exclusaoId, erro);

      try {
        await db.runTransaction(async (transacao) => {
          const documento = await transacao.get(referenciaExclusao);

          if (
            documento.exists &&
            documento.data().status === "processando" &&
            documento.data().processamentoId === processamentoId
          ) {
            transacao.update(referenciaExclusao, {
              status: "erro",
              motivo: "Falha no processamento. Requer revisão.",
              finalizadoEm: FieldValue.serverTimestamp(),
            });
          }
        });
      } catch (erroRegistro) {
        console.error("Erro ao registrar falha:", exclusaoId, erroRegistro);
      }
    }
  },
);

// ==========================================
// VALIDAR TAMANHOS DO PRODUTO
// ==========================================

function validarTamanhosProduto(tamanhos) {
  if (tamanhos === undefined) return [];

  if (!Array.isArray(tamanhos) || tamanhos.length > 30) {
    throw new HttpsError(
      "invalid-argument",
      "A lista de tamanhos do produto é inválida.",
    );
  }

  const tamanhosUnicos = new Set();

  return tamanhos.map((tamanho) => {
    if (
      typeof tamanho !== "string" ||
      !tamanho.trim() ||
      tamanho.trim().length > 15
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Um dos tamanhos do produto é inválido.",
      );
    }

    const tamanhoNormalizado = tamanho.trim().toUpperCase();

    if (tamanhosUnicos.has(tamanhoNormalizado)) {
      throw new HttpsError(
        "invalid-argument",
        "O produto possui tamanhos duplicados.",
      );
    }

    tamanhosUnicos.add(tamanhoNormalizado);

    return tamanhoNormalizado;
  });
}

// ==========================================
// VALIDAR CORES DO PRODUTO
// ==========================================

// ==========================================
// VALIDAR PERSONALIZAÇÃO DO PRODUTO
// ==========================================

function validarPersonalizacaoProduto(valor, loja) {
  if (valor === undefined) {
    return false;
  }

  if (typeof valor !== "boolean") {
    throw new HttpsError(
      "invalid-argument",
      "A configuração de personalização é inválida.",
    );
  }

  // Personalização com nome é exclusiva da Decor 3D.
  if (loja !== "3d" && valor === true) {
    throw new HttpsError(
      "invalid-argument",
      "Personalização com nome disponível apenas na Decor 3D.",
    );
  }

  return valor;
}

function validarCoresProduto(cores) {
  if (cores === undefined) return [];

  if (!Array.isArray(cores) || cores.length > 30) {
    throw new HttpsError(
      "invalid-argument",
      "A lista de cores do produto é inválida.",
    );
  }

  const codigos = new Set();

  return cores.map((cor) => {
    if (
      !cor ||
      typeof cor !== "object" ||
      Array.isArray(cor) ||
      typeof cor.codigo !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(cor.codigo)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Uma das cores do produto é inválida.",
      );
    }

    const codigo = cor.codigo.toLowerCase();

    if (codigos.has(codigo)) {
      throw new HttpsError(
        "invalid-argument",
        "O produto possui cores duplicadas.",
      );
    }

    codigos.add(codigo);

    return {
      nome: codigo,
      codigo,
    };
  });
}

// ==========================================
// FUNÇÃO: CADASTRAR PRODUTO COM SEGURANÇA
// ==========================================

exports.dutoSeguro = onCall(
  {
    secrets: [cloudinaryApiSecret],
    enforceAppCheck: false,
    maxInstances: 5,
  },
  async (request) => {
    const dadosProduto = request.data?.dadosProduto;

    // 1. Validar os dados recebidos
    if (
      !dadosProduto ||
      typeof dadosProduto !== "object" ||
      Array.isArray(dadosProduto)
    ) {
      throw new HttpsError("invalid-argument", "Dados do produto inválidos.");
    }

    const {
      loja,
      nome,
      categoriaId,
      preco,
      estoque,
      status,
      descricao,
      imagens,
    } = dadosProduto;

    const cores = validarCoresProduto(dadosProduto.cores);
    const tamanhos = validarTamanhosProduto(dadosProduto.tamanhos);
    const permitePersonalizacao = validarPersonalizacaoProduto(
      dadosProduto.permitePersonalizacao,
      loja,
    );

    // 2. Validar administrador e loja
    await validarAdministrador(request, loja);

    // 3. Validar campos do produto
    if (
      typeof nome !== "string" ||
      !nome.trim() ||
      typeof categoriaId !== "string" ||
      !categoriaId.trim() ||
      categoriaId.includes("/") ||
      typeof preco !== "number" ||
      !Number.isFinite(preco) ||
      preco < 0 ||
      !Number.isSafeInteger(estoque) ||
      estoque < 0 ||
      typeof status !== "string" ||
      !status.trim() ||
      typeof descricao !== "string" ||
      !Array.isArray(imagens) ||
      imagens.length > 30
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Preencha corretamente os dados do produto.",
      );
    }

    // 4. Validar identificadores das imagens
    const pastaAutorizada = PASTAS_PRODUTOS[loja] + "/";
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
          "Uma das imagens é inválida ou está duplicada.",
        );
      }

      ids.add(imagem.publicId);
    }

    // 5. Conferir as imagens no Cloudinary
    const { cloudName } = configurarCloudinary();

    for (const imagem of imagens) {
      let resultado;

      try {
        resultado = await cloudinary.api.resource(imagem.publicId, {
          resource_type: "image",
        });
      } catch (erro) {
        if (erro.http_code === 404) {
          throw new HttpsError(
            "invalid-argument",
            "Uma das imagens não existe no Cloudinary.",
          );
        }

        console.error("Erro ao consultar imagem no Cloudinary:", erro);

        throw new HttpsError(
          "internal",
          "Não foi possível verificar as imagens.",
        );
      }

      if (
        resultado.public_id !== imagem.publicId ||
        resultado.secure_url !== imagem.url ||
        !resultado.secure_url.startsWith(
          `https://res.cloudinary.com/${cloudName}/image/upload/`,
        )
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Uma das imagens não corresponde ao arquivo autorizado.",
        );
      }
    }

    // 6. Preparar referências
    const referenciaProduto = db.collection("produtos").doc();

    const referenciaCategoria = db
      .collection("categorias")
      .doc(categoriaId.trim());

    // 7. Cadastrar produto, controlar imagens
    // e registrar estoque na mesma transação
    await db.runTransaction(async (transacao) => {
      // Todas as leituras devem acontecer antes das escritas.
      const documentoCategoria = await transacao.get(referenciaCategoria);

      const controles = [];

      for (const imagem of imagens) {
        const referencia = referenciaControleImagem(imagem.publicId);

        const documento = await transacao.get(referencia);

        controles.push({
          referencia,
          documento,
          publicId: imagem.publicId,
        });
      }

      // Validar categoria
      if (!documentoCategoria.exists) {
        throw new HttpsError(
          "failed-precondition",
          "A categoria selecionada não existe.",
        );
      }

      if (documentoCategoria.data().loja !== loja) {
        throw new HttpsError(
          "permission-denied",
          "A categoria não pertence à loja informada.",
        );
      }

      // Validar controles e impedir reutilização indevida
      for (const controle of controles) {
        verificarControleImagemDisponivel(
          controle.documento,
          controle.publicId,
        );

        if (controle.documento.exists) {
          throw new HttpsError(
            "failed-precondition",
            "Esta imagem já possui um registro de controle. Atualize a página e tente novamente.",
          );
        }
      }

      // Registrar as imagens vinculadas ao produto
      for (const controle of controles) {
        transacao.create(controle.referencia, {
          publicId: controle.publicId,
          loja,
          produtoId: referenciaProduto.id,
          status: "ativa",
          criadoEm: FieldValue.serverTimestamp(),
        });
      }

      // Cadastrar produto
      transacao.set(referenciaProduto, {
        loja,
        nome: nome.trim(),
        categoriaId: categoriaId.trim(),
        preco,
        estoque,
        status: status.trim(),
        descricao: descricao.trim(),
        imagens,
        cores,
        tamanhos,
        imagens,
        cores,
        tamanhos,
        permitePersonalizacao,
        criadoEm: FieldValue.serverTimestamp(),
      });

      // Registrar entrada inicial no estoque
      if (estoque > 0) {
        const referenciaMovimentacao = db
          .collection("movimentacoesEstoque")
          .doc();

        transacao.set(referenciaMovimentacao, {
          produtoId: referenciaProduto.id,
          produtoNome: nome.trim(),
          loja,
          tipo: "entrada",
          quantidade: estoque,
          estoqueAnterior: 0,
          estoqueNovo: estoque,
          criadoEm: FieldValue.serverTimestamp(),
        });
      }
    });

    return {
      sucesso: true,
      produtoId: referenciaProduto.id,
    };
  },
);

// ==========================================
// SALVAR PRODUTOS EM NOVIDADES
// ==========================================

exports.salvarNovidadesLoja = onCall(
  {
    enforceAppCheck: false,
    maxInstances: 5,
  },
  async (request) => {
    const { loja, produtosIds } = request.data || {};

    // Validar administrador e acesso à loja
    await validarAdministrador(request, loja);

    // Validar a seleção
    if (
      !Array.isArray(produtosIds) ||
      produtosIds.length > 3 ||
      produtosIds.some(
        (id) => typeof id !== "string" || !id.trim() || id.includes("/"),
      ) ||
      new Set(produtosIds).size !== produtosIds.length
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Selecione até 3 produtos válidos, sem duplicações.",
      );
    }

    // Confirmar que os produtos pertencem à loja
    // e estão disponíveis no catálogo público.
    for (const produtoId of produtosIds) {
      const documento = await db
        .collection("catalogoPublico")
        .doc(produtoId)
        .get();

      if (!documento.exists || documento.data().loja !== loja) {
        throw new HttpsError(
          "failed-precondition",
          "Um dos produtos não está publicado nesta loja.",
        );
      }
    }

    // Salvar sem sobrescrever o banner
    await db.collection("aparenciaLojas").doc(loja).set(
      {
        novidades: {
          produtosIds,
        },
        novidadesAtualizadasPor: request.auth.uid,
        novidadesAtualizadasEm: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { sucesso: true };
  },
);
