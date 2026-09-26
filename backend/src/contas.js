/* ===========================================================================
   Contas e sessões.

   Como a senha é guardada (o mesmo esquema do Bitwarden):

   1. No navegador, a senha passa por PBKDF2-SHA256 com 600.000 iterações
      (o mínimo que a OWASP recomenda desde 2023), usando o e-mail como sal.
      O resultado — a "chave", 32 bytes — é o que viaja. A senha em si nunca
      sai do aparelho: nem este servidor a conhece.
   2. Aqui, a chave passa por HMAC-SHA256 com um sal aleatório por conta, e só
      esse resultado vai para o banco.

   Quem roubar o banco tem, por conta, um sal e um hash. Para testar cada
   palpite de senha precisa refazer as 600 mil iterações — é isso que torna
   o ataque caro. As iterações ficam no navegador porque o plano gratuito da
   Cloudflare dá ~10 ms de CPU por requisição, e PBKDF2 desse tamanho levaria
   centenas de milissegundos aqui.

   Sessões: token aleatório de 32 bytes entregue ao navegador; no banco fica
   só o SHA-256 dele. Com "manter conectado" vale 30 dias; sem, 12 horas (e o
   navegador ainda o esquece ao fechar). Sair ou trocar a senha apaga na hora.

   Esqueceu a senha: o código de recuperação, gerado no cadastro e mostrado
   uma única vez, redefine a senha sem depender de e-mail. No banco fica só o
   SHA-256 dele; usá-lo gera outro e derruba todas as sessões.
   =========================================================================== */

import { ErroHttp, agora, json, textoCurto } from "./respostas.js";

const enc = new TextEncoder();

export const ALGORITMO_SENHA = "cliente:pbkdf2-sha256-600000/servidor:hmac-sha256";
const DIA = 24 * 60 * 60 * 1000;
const VALIDADE_MANTER_MS = 30 * DIA;
const VALIDADE_CURTA_MS = 12 * 60 * 60 * 1000;
// Sem letras e números que se confundem (0/O, 1/I/L): o código é copiado à mão.
const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MINUTO = 60 * 1000;

// [janela, máximo] por tipo de tentativa.
const LIMITES = {
  "entrar-email": [15 * MINUTO, 10],
  "entrar-ip": [15 * MINUTO, 30],
  "cadastro-ip": [60 * MINUTO, 5],
};

/* ------------------------------ Utilidades -------------------------------- */

function b64url(bytes) {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deB64url(texto) {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((texto.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function aleatorio(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

async function sha256Hex(texto) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(texto)));
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function iguaisTempoConstante(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validarEmail(email) {
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ErroHttp(400, "E-mail inválido.");
  }
}

/** A chave derivada no navegador: 32 bytes em base64url = 43 caracteres. */
function validarChave(chave, nome = "chave") {
  if (typeof chave !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(chave)) {
    throw new ErroHttp(400, `Campo "${nome}" inválido — a senha deve ser processada pelo painel antes de enviar.`);
  }
}

async function hashDaChave(chave, salB64) {
  const k = await crypto.subtle.importKey("raw", deB64url(salB64), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", k, deB64url(chave)));
}

async function lerJson(request) {
  try { return (await request.json()) || {}; }
  catch { throw new ErroHttp(400, "Corpo da requisição não é JSON."); }
}

function ipDe(request) {
  return request.headers.get("CF-Connecting-IP") || "local";
}

/* ---------------------------- Limite de abuso ------------------------------ */

async function conferirLimite(db, tipo, valor) {
  const [janela, maximo] = LIMITES[tipo];
  const r = await db
    .prepare("SELECT COUNT(*) AS n FROM tentativas WHERE chave = ? AND em > ?")
    .bind(`${tipo}:${valor}`, Date.now() - janela)
    .first();
  if ((r?.n || 0) >= maximo) {
    const minutos = Math.round(janela / MINUTO);
    throw new ErroHttp(429, `Muitas tentativas seguidas. Espere ${minutos} minutos e tente de novo.`);
  }
}

function registrarTentativa(db, tipo, valor) {
  return db.prepare("INSERT INTO tentativas (chave, em) VALUES (?, ?)").bind(`${tipo}:${valor}`, Date.now());
}

/* -------------------------------- Sessões --------------------------------- */

async function criarSessao(db, usuarioId, dispositivo, manter) {
  const token = b64url(aleatorio(32));
  const expira = Date.now() + (manter === true ? VALIDADE_MANTER_MS : VALIDADE_CURTA_MS);
  await db
    .prepare("INSERT INTO sessoes (token_hash, usuario_id, criada_em, expira_em, dispositivo) VALUES (?, ?, ?, ?, ?)")
    .bind(await sha256Hex(token), usuarioId, agora(), expira, textoCurto(dispositivo))
    .run();
  return { token, expiraEm: new Date(expira).toISOString(), manter: manter === true };
}

/* -------------------------- Código de recuperação -------------------------- */

/** 20 caracteres em 5 grupos (ex.: K7QP-2MXA-…): ~98 bits de acaso. */
function novoCodigo() {
  // Descarta bytes acima do maior múltiplo de 31 para cada letra ser igualmente provável.
  const teto = 256 - (256 % ALFABETO_CODIGO.length);
  let letras = "";
  while (letras.length < 20) {
    for (const b of aleatorio(32)) {
      if (b < teto && letras.length < 20) letras += ALFABETO_CODIGO[b % ALFABETO_CODIGO.length];
    }
  }
  return letras.match(/.{4}/g).join("-");
}

function normalizarCodigo(codigo) {
  return String(codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function hashCodigo(codigo) {
  return sha256Hex(`delfos:recuperacao:${normalizarCodigo(codigo)}`);
}

async function gravarCodigo(db, usuarioId) {
  const codigo = novoCodigo();
  return {
    codigo,
    comando: db.prepare("UPDATE usuarios SET recuperacao_hash = ?, recuperacao_gerada_em = ? WHERE id = ?")
      .bind(await hashCodigo(codigo), agora(), usuarioId),
  };
}

function tokenDe(request) {
  const m = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("Authorization") || "");
  return m ? m[1] : null;
}

/**
 * Devolve { id, email, tokenHash } do dono do token, ou lança 401.
 * É a única porta para as rotas de dados: todo acesso a estado, versões e
 * anexos usa o id que sai daqui, nunca um id vindo da requisição.
 */
export async function exigirSessao(request, env) {
  const expirada = new ErroHttp(401, "Sessão expirada. Entre de novo.", { sessao: false });
  const token = tokenDe(request);
  if (!token) throw expirada;
  const tokenHash = await sha256Hex(token);
  const s = await env.DB
    .prepare(
      `SELECT u.id, u.email, s.expira_em FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token_hash = ?`
    )
    .bind(tokenHash)
    .first();
  if (!s || s.expira_em <= Date.now()) throw expirada;
  return { id: s.id, email: s.email, tokenHash, expiraEm: s.expira_em };
}

/* --------------------------------- Rotas ---------------------------------- */

/** POST /api/cadastro { email, chave, convite?, dispositivo? } */
export async function cadastrar(request, env) {
  const db = env.DB;
  const ip = ipDe(request);
  await conferirLimite(db, "cadastro-ip", ip);

  const corpo = await lerJson(request);
  const email = normalizarEmail(corpo.email);
  validarEmail(email);
  validarChave(corpo.chave);

  if (env.CODIGO_CONVITE) {
    const convite = String(corpo.convite || "").trim();
    if (!iguaisTempoConstante(convite, String(env.CODIGO_CONVITE).trim())) {
      await registrarTentativa(db, "cadastro-ip", ip).run();
      throw new ErroHttp(403, "Código de convite inválido.");
    }
  }

  const id = crypto.randomUUID();
  const sal = b64url(aleatorio(16));
  const quando = agora();
  const codigo = novoCodigo();
  try {
    await db.batch([
      db.prepare(
        `INSERT INTO usuarios (id, email, senha_sal, senha_hash, senha_algoritmo, criado_em, senha_trocada_em,
                               recuperacao_hash, recuperacao_gerada_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, email, sal, await hashDaChave(corpo.chave, sal), ALGORITMO_SENHA, quando, quando,
        await hashCodigo(codigo), quando),
      registrarTentativa(db, "cadastro-ip", ip),
    ]);
  } catch (e) {
    if (/UNIQUE/i.test(String(e?.message || e))) {
      throw new ErroHttp(409, "Já existe uma conta com este e-mail. Use \"Entrar\".");
    }
    throw e;
  }

  const sessao = await criarSessao(db, id, corpo.dispositivo, corpo.manter);
  return json({ ...sessao, usuario: { id, email }, codigoRecuperacao: codigo }, 201);
}

/** POST /api/entrar { email, chave, dispositivo? } */
export async function entrar(request, env) {
  const db = env.DB;
  const ip = ipDe(request);
  const corpo = await lerJson(request);
  const email = normalizarEmail(corpo.email);
  validarChave(corpo.chave);

  await conferirLimite(db, "entrar-ip", ip);
  await conferirLimite(db, "entrar-email", email);

  const u = await db.prepare("SELECT id, email, senha_sal, senha_hash FROM usuarios WHERE email = ?").bind(email).first();
  // Sem conta, calcula um hash do mesmo jeito: a resposta leva o mesmo tempo
  // e não entrega quais e-mails têm conta.
  const calculado = await hashDaChave(corpo.chave, u?.senha_sal || "AAAAAAAAAAAAAAAAAAAAAA");
  if (!u || !iguaisTempoConstante(calculado, u.senha_hash)) {
    await db.batch([registrarTentativa(db, "entrar-ip", ip), registrarTentativa(db, "entrar-email", email)]);
    throw new ErroHttp(401, "E-mail ou senha incorretos.");
  }

  await db.prepare("DELETE FROM tentativas WHERE chave = ?").bind(`entrar-email:${email}`).run();
  const sessao = await criarSessao(db, u.id, corpo.dispositivo, corpo.manter);
  return json({ ...sessao, usuario: { id: u.id, email: u.email } });
}

/**
 * POST /api/recuperar { email, codigo, chaveNova, manter? }
 * Esqueceu a senha: o código de recuperação troca a senha, é consumido (vem
 * outro na resposta) e todas as sessões abertas caem. Conta os erros junto
 * com os de senha — o código não vira um segundo jeito de chutar.
 */
export async function recuperar(request, env) {
  const db = env.DB;
  const ip = ipDe(request);
  const corpo = await lerJson(request);
  const email = normalizarEmail(corpo.email);
  validarChave(corpo.chaveNova, "chaveNova");

  await conferirLimite(db, "entrar-ip", ip);
  await conferirLimite(db, "entrar-email", email);

  const u = await db.prepare("SELECT id, email, recuperacao_hash FROM usuarios WHERE email = ?").bind(email).first();
  const calculado = await hashCodigo(corpo.codigo);
  if (!u || !u.recuperacao_hash || !iguaisTempoConstante(calculado, u.recuperacao_hash)) {
    await db.batch([registrarTentativa(db, "entrar-ip", ip), registrarTentativa(db, "entrar-email", email)]);
    throw new ErroHttp(401, "E-mail ou código de recuperação incorretos.");
  }

  const sal = b64url(aleatorio(16));
  const novo = await gravarCodigo(db, u.id);
  await db.batch([
    db.prepare("UPDATE usuarios SET senha_sal = ?, senha_hash = ?, senha_algoritmo = ?, senha_trocada_em = ? WHERE id = ?")
      .bind(sal, await hashDaChave(corpo.chaveNova, sal), ALGORITMO_SENHA, agora(), u.id),
    novo.comando,
    db.prepare("DELETE FROM sessoes WHERE usuario_id = ?").bind(u.id),
    db.prepare("DELETE FROM tentativas WHERE chave = ?").bind(`entrar-email:${email}`),
  ]);
  const sessao = await criarSessao(db, u.id, corpo.dispositivo, corpo.manter);
  return json({ ...sessao, usuario: { id: u.id, email: u.email }, codigoRecuperacao: novo.codigo });
}

/** POST /api/conta/codigo-recuperacao { chave } — gera um código novo (o anterior deixa de valer). */
export async function novoCodigoRecuperacao(request, env, usuario) {
  const db = env.DB;
  const corpo = await lerJson(request);
  await conferirSenha(db, usuario, corpo.chave, request);
  const novo = await gravarCodigo(db, usuario.id);
  await novo.comando.run();
  return json({ codigoRecuperacao: novo.codigo });
}

/** POST /api/sair — encerra só a sessão deste aparelho. */
export async function sair(env, usuario) {
  await env.DB.prepare("DELETE FROM sessoes WHERE token_hash = ?").bind(usuario.tokenHash).run();
  return json({ ok: true });
}

/** POST /api/conta/sair-dos-outros — encerra as sessões dos outros aparelhos. */
export async function sairDosOutros(env, usuario) {
  const r = await env.DB
    .prepare("DELETE FROM sessoes WHERE usuario_id = ? AND token_hash != ?")
    .bind(usuario.id, usuario.tokenHash)
    .run();
  return json({ ok: true, encerradas: r.meta?.changes ?? null });
}

/** GET /api/conta → { usuario, anexos: { usadoBytes, limiteBytes } } */
export async function obterConta(env, usuario) {
  const db = env.DB;
  const [u, uso] = await Promise.all([
    db.prepare("SELECT criado_em, senha_trocada_em, recuperacao_gerada_em FROM usuarios WHERE id = ?").bind(usuario.id).first(),
    db.prepare("SELECT COALESCE(SUM(tamanho), 0) AS bytes FROM arquivos WHERE usuario_id = ?").bind(usuario.id).first(),
  ]);
  return json({
    usuario: {
      id: usuario.id, email: usuario.email, criadoEm: u?.criado_em, senhaTrocadaEm: u?.senha_trocada_em,
      codigoRecuperacaoGeradoEm: u?.recuperacao_gerada_em || "",
    },
    sessao: { expiraEm: new Date(usuario.expiraEm).toISOString() },
    anexos: { usadoBytes: uso?.bytes || 0, limiteBytes: cotaAnexosBytes(env) },
  });
}

export function cotaAnexosBytes(env) {
  return (Number(env.COTA_ANEXOS_MB) || 100) * 1024 * 1024;
}

async function conferirSenha(db, usuario, chave, request) {
  validarChave(chave);
  await conferirLimite(db, "entrar-email", usuario.email);
  const u = await db.prepare("SELECT senha_sal, senha_hash FROM usuarios WHERE id = ?").bind(usuario.id).first();
  if (!u || !iguaisTempoConstante(await hashDaChave(chave, u.senha_sal), u.senha_hash)) {
    await db.batch([
      registrarTentativa(db, "entrar-email", usuario.email),
      registrarTentativa(db, "entrar-ip", ipDe(request)),
    ]);
    throw new ErroHttp(403, "Senha atual incorreta.");
  }
}

/**
 * POST /api/conta/senha { chaveAtual, chaveNova }
 * Troca o sal junto e encerra as sessões dos outros aparelhos: quem tinha a
 * senha antiga não continua dentro.
 */
export async function trocarSenha(request, env, usuario) {
  const db = env.DB;
  const corpo = await lerJson(request);
  await conferirSenha(db, usuario, corpo.chaveAtual, request);
  validarChave(corpo.chaveNova, "chaveNova");

  const sal = b64url(aleatorio(16));
  await db.batch([
    db.prepare("UPDATE usuarios SET senha_sal = ?, senha_hash = ?, senha_algoritmo = ?, senha_trocada_em = ? WHERE id = ?")
      .bind(sal, await hashDaChave(corpo.chaveNova, sal), ALGORITMO_SENHA, agora(), usuario.id),
    db.prepare("DELETE FROM sessoes WHERE usuario_id = ? AND token_hash != ?").bind(usuario.id, usuario.tokenHash),
  ]);
  return json({ ok: true });
}

/**
 * POST /api/conta/excluir { chave }
 * Apaga a conta e tudo dela — estado, versões, anexos, sessões. Pede a senha
 * de novo: um token esquecido num aparelho não basta para destruir a conta.
 */
export async function excluirConta(request, env, usuario) {
  const db = env.DB;
  const corpo = await lerJson(request);
  await conferirSenha(db, usuario, corpo.chave, request);

  const uid = usuario.id;
  await db.batch([
    db.prepare("DELETE FROM textos WHERE chave IN (SELECT 'v:' || id FROM versoes WHERE usuario_id = ?)").bind(uid),
    db.prepare("DELETE FROM textos WHERE chave = ? OR chave = ?").bind(`atual:${uid}`, `nova:${uid}`),
    db.prepare("DELETE FROM versoes WHERE usuario_id = ?").bind(uid),
    db.prepare("DELETE FROM estado_atual WHERE usuario_id = ?").bind(uid),
    db.prepare("DELETE FROM arquivo_partes WHERE usuario_id = ?").bind(uid),
    db.prepare("DELETE FROM arquivos WHERE usuario_id = ?").bind(uid),
    db.prepare("DELETE FROM sessoes WHERE usuario_id = ?").bind(uid),
    db.prepare("DELETE FROM tentativas WHERE chave = ?").bind(`entrar-email:${usuario.email}`),
    db.prepare("DELETE FROM usuarios WHERE id = ?").bind(uid),
  ]);
  return json({ ok: true });
}
