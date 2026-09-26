/* ===========================================================================
   Autenticação — uma pessoa, uma senha.

   A senha fica num segredo do Cloudflare (SENHA), nunca no código. Quem acerta
   a senha recebe um token assinado (HMAC-SHA256) que vale 90 dias; o painel
   guarda o token e manda em toda requisição.

   A chave que assina os tokens é derivada da própria senha: trocar a senha
   invalida na hora todos os aparelhos conectados, sem precisar de um segundo
   segredo para cuidar.
   =========================================================================== */

import { ErroHttp, json } from "./respostas.js";

const enc = new TextEncoder();
const dec = new TextDecoder();

const VALIDADE_DIAS = 90;
const JANELA_MS = 15 * 60 * 1000;
const MAX_FALHAS = 10;
export const TAMANHO_MINIMO_SENHA = 8;

export function senhaConfigurada(env) {
  return typeof env.SENHA === "string" && env.SENHA.length >= TAMANHO_MINIMO_SENHA;
}

function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deB64url(texto) {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((texto.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function chaveAssinatura(env) {
  const base = await crypto.subtle.importKey("raw", enc.encode(env.SENHA), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const derivada = await crypto.subtle.sign("HMAC", base, enc.encode("delfos:token:v1"));
  return crypto.subtle.importKey("raw", derivada, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Compara em tempo constante: os dois lados viram hashes do mesmo tamanho. */
async function iguais(a, b) {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diferenca = 0;
  for (let i = 0; i < x.length; i++) diferenca |= x[i] ^ y[i];
  return diferenca === 0;
}

function ipDe(request) {
  return request.headers.get("CF-Connecting-IP") || "local";
}

/** POST /api/entrar { senha } → { token, expiraEm } */
export async function entrar(request, env) {
  if (!senhaConfigurada(env)) {
    throw new ErroHttp(503, "O servidor ainda não tem senha configurada. Veja backend/README.md, passo da senha.");
  }

  const ip = ipDe(request);
  const falhas = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM tentativas_login WHERE ip = ? AND em > ?")
    .bind(ip, Date.now() - JANELA_MS)
    .first();
  if ((falhas?.n || 0) >= MAX_FALHAS) {
    throw new ErroHttp(429, "Muitas senhas erradas seguidas. Espere 15 minutos e tente de novo.");
  }

  let corpo;
  try { corpo = await request.json(); }
  catch { throw new ErroHttp(400, "Envie a senha em JSON: { \"senha\": \"...\" }."); }
  const senha = typeof corpo?.senha === "string" ? corpo.senha : "";

  if (!(await iguais(senha, env.SENHA))) {
    await env.DB.prepare("INSERT INTO tentativas_login (ip, em) VALUES (?, ?)").bind(ip, Date.now()).run();
    throw new ErroHttp(401, "Senha incorreta.");
  }
  await env.DB.prepare("DELETE FROM tentativas_login WHERE ip = ?").bind(ip).run();

  const exp = Date.now() + VALIDADE_DIAS * 24 * 60 * 60 * 1000;
  const carga = b64url(enc.encode(JSON.stringify({ exp })));
  const assinatura = new Uint8Array(await crypto.subtle.sign("HMAC", await chaveAssinatura(env), enc.encode(carga)));
  return json({ token: `v1.${carga}.${b64url(assinatura)}`, expiraEm: new Date(exp).toISOString() });
}

/** Lança 401 se a requisição não trouxer um token válido e dentro do prazo. */
export async function exigirSessao(request, env) {
  const expirada = new ErroHttp(401, "Sessão expirada ou inválida. Entre de novo com a senha.", { sessao: false });
  if (!senhaConfigurada(env)) throw expirada;

  const m = /^Bearer v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(request.headers.get("Authorization") || "");
  if (!m) throw expirada;

  let valida = false;
  try {
    valida = await crypto.subtle.verify("HMAC", await chaveAssinatura(env), deB64url(m[2]), enc.encode(m[1]));
  } catch {
    valida = false;
  }
  if (!valida) throw expirada;

  let exp = 0;
  try { exp = Number(JSON.parse(dec.decode(deB64url(m[1]))).exp); } catch { /* token malformado */ }
  if (!(exp > Date.now())) throw expirada;
}
