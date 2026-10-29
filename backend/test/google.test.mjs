import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import worker from "../src/index.js";
import { limpar } from "../src/limpeza.js";
import { criarD1 } from "./d1-falso.mjs";

const CLIENT = "123456789-teste.apps.googleusercontent.com", ORIGEM = "https://luizftc5-debug.github.io";
const chaves = await generateKeyPair("RS256"), outra = await generateKeyPair("RS256");
const publica = { ...(await exportJWK(chaves.publicKey)), kid: "google-teste", alg: "RS256", use: "sig" };
// Somente o transporte das chaves públicas é simulado. Tokens são assinados e
// verificados criptograficamente pela mesma implementação usada no Worker.
let buscas = 0;
globalThis.fetch = async url => {
  assert.equal(String(url), "https://www.googleapis.com/oauth2/v3/certs");
  buscas++;
  return new Response(JSON.stringify({ keys: [publica] }), { headers: { "content-type": "application/json", "cache-control": "public,max-age=1" } });
};
const ambiente = extra => ({ DB: criarD1(), ORIGENS: ORIGEM, GOOGLE_CLIENT_ID: CLIENT, ...extra });
const chave = senha => createHash("sha256").update(senha).digest("base64url");
let ipSeq = 0;
async function chamar(env, caminho, corpo, extra = {}) {
  const { origem = ORIGEM, ip = `10.0.0.${++ipSeq % 250}`, metodo = "POST" } = extra;
  const r = await worker.fetch(new Request("https://api.teste" + caminho, {
    method: metodo, headers: { "Origin": origem, "Content-Type": "application/json", "CF-Connecting-IP": ip },
    ...(metodo !== "GET" ? { body: JSON.stringify(corpo || {}) } : {}),
  }), env);
  return { status: r.status, dados: await r.json() };
}
async function nonce(env) {
  const r = await chamar(env, "/api/google/desafio");
  assert.equal(r.status, 200, JSON.stringify(r.dados));
  return r.dados.nonce;
}
async function token(n, patch = {}, op = {}) {
  const agora = Math.floor(Date.now() / 1000);
  const dados = { iss: "https://accounts.google.com", aud: CLIENT, sub: "google-usuario-1", email: "luiz@gmail.com", email_verified: true, nonce: n,
    iat: agora, exp: agora + 3600, given_name: "Luiz", ...patch };
  for (const k of op.omitir || []) delete dados[k];
  return new SignJWT(dados).setProtectedHeader({ alg: "RS256", kid: "google-teste", ...op.header }).sign(op.key || chaves.privateKey);
}

test("saúde só anuncia Google configurado; autenticação recusa origem estranha ou configuração ausente", async () => {
  const env = ambiente();
  assert.equal((await chamar(env, "/api/saude", null, { metodo: "GET" })).dados.google.clientId, CLIENT);
  for (const id of ["", "id-invalido"]) {
    const sem = ambiente({ GOOGLE_CLIENT_ID: id });
    assert.equal((await chamar(sem, "/api/saude", null, { metodo: "GET" })).dados.google.clientId, "");
    assert.equal((await chamar(sem, "/api/google/desafio")).status, 503);
  }
  assert.equal((await chamar(env, "/api/google/desafio", {}, { origem: "https://invasor.test" })).status, 403);
  assert.equal((await chamar(env, "/api/google/desafio", {}, { origem: "" })).status, 403);
});

test("nova conta Google respeita modo criar, convite e sessão normal; token e nonce não ficam em claro no banco", async () => {
  const env = ambiente({ CODIGO_CONVITE: "minha-turma" }), n = await nonce(env), credencial = await token(n);
  assert.match(n, /^[A-Za-z0-9_-]{43}$/);
  const corpo = { credencial, nonce: n, manter: true };
  const criar = await chamar(env, "/api/google", corpo);
  assert.equal(criar.status, 409); assert.equal(criar.dados.criarContaGoogle, true);
  assert.equal((await chamar(env, "/api/google", { ...corpo, criarConta: true })).status, 403);
  const r = await chamar(env, "/api/google", { ...corpo, criarConta: true, convite: "minha-turma" });
  assert.equal(r.status, 201, JSON.stringify(r.dados)); assert.equal(r.dados.novaConta, true);
  assert.equal(r.dados.nome, "Luiz"); assert.equal(r.dados.usuario.email, "luiz@gmail.com");
  assert.match(r.dados.codigoRecuperacao, /^([A-Z2-9]{4}-){4}[A-Z2-9]{4}$/);
  assert.ok(Date.parse(r.dados.expiraEm) - Date.now() > 29 * 86400000);
  const seguro = await worker.fetch(new Request("https://api.teste/api/estado", { headers: { Authorization: `Bearer ${r.dados.token}` } }), env);
  assert.equal(seguro.status, 200);
  const banco = JSON.stringify([env.DB.sqlite.prepare("SELECT * FROM sessoes").all(), env.DB.sqlite.prepare("SELECT * FROM google_desafios").all()]);
  assert.ok(!banco.includes(r.dados.token)); assert.ok(!banco.includes(n)); assert.ok(!banco.includes(credencial));
  assert.equal((await chamar(env, "/api/google", { ...corpo, criarConta: true, convite: "minha-turma" })).status, 410);
});

test("Google sub mantém a mesma conta mesmo quando o e-mail do Google muda; retorno não exige novo convite", async () => {
  const env = ambiente(), n1 = await nonce(env);
  const a = await chamar(env, "/api/google", { nonce: n1, credencial: await token(n1), criarConta: true });
  env.CODIGO_CONVITE = "somente-novos";
  const n2 = await nonce(env), b = await chamar(env, "/api/google", { nonce: n2, credencial: await token(n2, { email: "outro@gmail.com" }) });
  assert.equal(b.status, 200); assert.equal(b.dados.novaConta, false);
  assert.deepEqual(b.dados.usuario, a.dados.usuario);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM usuarios").get().n, 1);
  assert.ok(Date.parse(b.dados.expiraEm) - Date.now() < 13 * 3600000);
});

test("mesmo e-mail não autoriza vínculo: senha correta mantém id, senha e dados anteriores", async () => {
  const env = ambiente(), senha = "minha-senha-segura";
  const antiga = await chamar(env, "/api/cadastro", { email: "luiz@gmail.com", chave: chave(senha) });
  const uid = antiga.dados.usuario.id;
  env.DB.sqlite.prepare("INSERT INTO estado_atual (usuario_id, revisao, atualizado_em, tamanho) VALUES (?, 7, '2026-10-01', 1)").run(uid);
  const antes = env.DB.sqlite.prepare("SELECT senha_hash FROM usuarios WHERE id = ?").get(uid).senha_hash;
  const n = await nonce(env), credencial = await token(n), corpo = { nonce: n, credencial };
  const r = await chamar(env, "/api/google", corpo);
  assert.equal(r.status, 409); assert.equal(r.dados.vincularGoogle, true);
  assert.equal((await chamar(env, "/api/google", { ...corpo, chaveVinculo: chave("errada") })).status, 403);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM identidades_google").get().n, 0);
  const certo = await chamar(env, "/api/google", { ...corpo, chaveVinculo: chave(senha) });
  assert.equal(certo.status, 200); assert.equal(certo.dados.usuario.id, uid);
  assert.equal(env.DB.sqlite.prepare("SELECT senha_hash FROM usuarios WHERE id = ?").get(uid).senha_hash, antes);
  assert.equal(env.DB.sqlite.prepare("SELECT revisao FROM estado_atual WHERE usuario_id = ?").get(uid).revisao, 7);
  assert.equal((await chamar(env, "/api/entrar", { email: "luiz@gmail.com", chave: chave(senha) })).status, 200);
  const n2 = await nonce(env), outraIdentidade = await chamar(env, "/api/google", { nonce: n2, credencial: await token(n2, { sub: "outro-google" }), chaveVinculo: chave(senha) });
  assert.equal(outraIdentidade.status, 409);
});

test("assinatura, algoritmo, emissor, público, validade, identidade, e-mail e nonce são obrigatórios e validados", async () => {
  const env = ambiente(), n = await nonce(env), agora = Math.floor(Date.now() / 1000);
  const variacoes = [
    [{ iss: "https://invasor.test" }], [{ aud: "outro.apps.googleusercontent.com" }], [{ aud: [CLIENT, "outro"] }],
    [{ azp: "outro" }], [{ exp: agora - 1 }], [{ iat: agora + 120 }], [{ exp: "futuro" }],
    [{ sub: "" }], [{ sub: 123 }], [{ sub: "a".repeat(256) }], [{ email_verified: false }], [{ email_verified: "true" }],
    [{ nonce: "outro-nonce" }], [{}, { omitir: ["nonce"] }], [{}, { omitir: ["exp"] }], [{}, { omitir: ["iat"] }],
    [{}, { key: outra.privateKey }],
  ];
  for (const [patch, op] of variacoes) {
    const r = await chamar(env, "/api/google", { nonce: n, credencial: await token(n, patch, op), criarConta: true });
    assert.equal(r.status, 401, JSON.stringify({ patch, op, dados: r.dados }));
  }
  const hs = await new SignJWT({ nonce: n }).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("nao-e-uma-chave-google-verdadeira"));
  assert.equal((await chamar(env, "/api/google", { nonce: n, credencial: hs, criarConta: true })).status, 401);
  assert.equal((await chamar(env, "/api/google", { nonce: n, credencial: "sem-assinatura", criarConta: true })).status, 400);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM usuarios").get().n, 0);
  assert.equal(env.DB.sqlite.prepare("SELECT usado FROM google_desafios").get().usado, 0);
});

test("nonce vencido, de outra origem e replay concorrente são recusados", async () => {
  const env = ambiente({ ORIGENS: ORIGEM + ",https://outra.test" });
  const n = await nonce(env), credencial = await token(n);
  assert.equal((await chamar(env, "/api/google", { nonce: n, credencial, criarConta: true }, { origem: "https://outra.test" })).status, 410);
  env.DB.sqlite.prepare("UPDATE google_desafios SET expira_em = 0").run();
  assert.equal((await chamar(env, "/api/google", { nonce: n, credencial, criarConta: true })).status, 410);
  const novo = await nonce(env), corpo = { nonce: novo, credencial: await token(novo), criarConta: true };
  const resultados = await Promise.all([chamar(env, "/api/google", corpo), chamar(env, "/api/google", corpo)]);
  assert.deepEqual(resultados.map(r => r.status).sort(), [201, 410]);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM usuarios").get().n, 1);
});

test("limita emissão de desafios e tentativas; limpeza remove nonces usados ou vencidos", async () => {
  const env = ambiente();
  for (let i = 0; i < 30; i++) assert.equal((await chamar(env, "/api/google/desafio", {}, { ip: "ip-fixo" })).status, 200);
  assert.equal((await chamar(env, "/api/google/desafio", {}, { ip: "ip-fixo" })).status, 429);
  for (let i = 0; i < 30; i++) assert.equal((await chamar(env, "/api/google", {}, { ip: "tentativa-fixa" })).status, 400);
  assert.equal((await chamar(env, "/api/google", {}, { ip: "tentativa-fixa" })).status, 429);
  env.DB.sqlite.prepare("UPDATE google_desafios SET expira_em = 0").run();
  const vivo = await nonce(env);
  const hash = createHash("sha256").update(vivo).digest("hex");
  await limpar(env);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM google_desafios").get().n, 1);
  assert.equal(env.DB.sqlite.prepare("SELECT nonce_hash FROM google_desafios").get().nonce_hash, hash);
});

test("conta criada pelo Google pode definir senha com recuperação e excluir identidade sem órfãos", async () => {
  const env = ambiente(), n = await nonce(env);
  const a = await chamar(env, "/api/google", { nonce: n, credencial: await token(n), criarConta: true });
  const r = await chamar(env, "/api/recuperar", { email: "luiz@gmail.com", codigo: a.dados.codigoRecuperacao, chaveNova: chave("senha-definida") });
  assert.equal(r.status, 200); assert.equal(r.dados.usuario.id, a.dados.usuario.id);
  const del = await worker.fetch(new Request("https://api.teste/api/conta/excluir", {
    method: "POST", headers: { Authorization: `Bearer ${r.dados.token}` }, body: JSON.stringify({ chave: chave("senha-definida") }),
  }), env);
  assert.equal(del.status, 200); assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM identidades_google").get().n, 0);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM usuarios").get().n, 0);
});

test("as chaves públicas são atualizadas quando vence o Cache-Control enviado pelo Google", async () => {
  const env = ambiente(), n = await nonce(env), credencial = await token(n), antes = buscas;
  const relogio = Date.now, futuro = relogio() + 2000;
  Date.now = () => futuro;
  try {
    const r = await chamar(env, "/api/google", { nonce: n, credencial, criarConta: true });
    assert.equal(r.status, 201); assert.ok(buscas > antes);
  } finally { Date.now = relogio; }
});
