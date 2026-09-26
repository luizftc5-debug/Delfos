import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { limpar } from "../src/limpeza.js";
import { dividir, TAMANHO_PEDACO } from "../src/textos.js";
import { criarD1 } from "./d1-falso.mjs";

const SENHA = "senha-de-teste-123";
const ORIGEM = "https://luizftc5-debug.github.io";

function ambiente() {
  return { DB: criarD1(), SENHA, ORIGENS: `${ORIGEM},http://localhost:8000` };
}

async function chamar(env, metodo, caminho, { corpo, token, tipo, origem = ORIGEM } = {}) {
  const headers = { Origin: origem };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tipo) headers["Content-Type"] = tipo;
  const r = await worker.fetch(new Request(`https://api.teste${caminho}`, { method: metodo, headers, body: corpo }), env);
  const texto = r.headers.get("content-type")?.includes("json") ? await r.text() : null;
  return { status: r.status, headers: r.headers, dados: texto ? JSON.parse(texto) : null, resposta: r };
}

async function entrar(env) {
  const r = await chamar(env, "POST", "/api/entrar", { corpo: JSON.stringify({ senha: SENHA }), tipo: "application/json" });
  assert.equal(r.status, 200);
  return r.dados.token;
}

const estado = (extra = {}) => JSON.stringify({ versao: 9, perfil: { nome: "Luiz" }, ...extra });

test("saúde responde sem token e diz se há senha", async () => {
  const env = ambiente();
  const r = await chamar(env, "GET", "/api/saude");
  assert.equal(r.status, 200);
  assert.equal(r.dados.senhaConfigurada, true);
  const semSenha = await chamar({ ...env, SENHA: "" }, "GET", "/api/saude");
  assert.equal(semSenha.dados.senhaConfigurada, false);
});

test("CORS: libera só as origens da lista", async () => {
  const env = ambiente();
  const ok = await chamar(env, "OPTIONS", "/api/estado");
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get("Access-Control-Allow-Origin"), ORIGEM);
  const fora = await chamar(env, "GET", "/api/saude", { origem: "https://site-estranho.com" });
  assert.equal(fora.headers.get("Access-Control-Allow-Origin"), null);
});

test("sem token (ou com token adulterado) não entra", async () => {
  const env = ambiente();
  assert.equal((await chamar(env, "GET", "/api/estado")).status, 401);
  const token = await entrar(env);
  const adulterado = token.slice(0, -2) + (token.endsWith("AA") ? "BB" : "AA");
  assert.equal((await chamar(env, "GET", "/api/estado", { token: adulterado })).status, 401);
  // Trocar a senha invalida os tokens antigos.
  assert.equal((await chamar({ ...env, SENHA: "outra-senha-longa" }, "GET", "/api/estado", { token })).status, 401);
});

test("senha errada conta tentativa e trava depois de 10", async () => {
  const env = ambiente();
  for (let i = 0; i < 10; i++) {
    const r = await chamar(env, "POST", "/api/entrar", { corpo: JSON.stringify({ senha: "errada" }) });
    assert.equal(r.status, 401);
  }
  const travado = await chamar(env, "POST", "/api/entrar", { corpo: JSON.stringify({ senha: SENHA }) });
  assert.equal(travado.status, 429);
});

test("fluxo de sincronização: grava, lê, detecta conflito, força", async () => {
  const env = ambiente();
  const token = await entrar(env);

  const vazio = await chamar(env, "GET", "/api/estado", { token });
  assert.deepEqual([vazio.dados.revisao, vazio.dados.estado], [0, null]);

  const g1 = await chamar(env, "PUT", "/api/estado?base=0&dispositivo=Notebook", { token, corpo: estado({ n: 1 }) });
  assert.equal(g1.status, 200);
  assert.equal(g1.dados.revisao, 1);

  const lido = await chamar(env, "GET", "/api/estado", { token });
  assert.equal(lido.dados.revisao, 1);
  assert.equal(lido.dados.estado.n, 1);
  assert.equal(lido.dados.dispositivo, "Notebook");

  const inalterado = await chamar(env, "GET", "/api/estado?desde=1", { token });
  assert.equal(inalterado.dados.inalterado, true);
  assert.equal(inalterado.dados.estado, undefined);

  // Celular grava em cima da revisão 1…
  assert.equal((await chamar(env, "PUT", "/api/estado?base=1&dispositivo=Celular", { token, corpo: estado({ n: 2 }) })).dados.revisao, 2);
  // …e o notebook, ainda na 1, leva 409 em vez de apagar o que o celular fez.
  const c = await chamar(env, "PUT", "/api/estado?base=1&dispositivo=Notebook", { token, corpo: estado({ n: 3 }) });
  assert.equal(c.status, 409);
  assert.equal(c.dados.conflito, true);
  assert.equal(c.dados.dispositivo, "Celular");

  // Usuário escolhe ficar com a do notebook: força, e a do celular vira cópia.
  const f = await chamar(env, "PUT", "/api/estado?base=1&forcar=1&motivo=Conflito&dispositivo=Notebook", { token, corpo: estado({ n: 3 }) });
  assert.equal(f.dados.revisao, 3);
  const versoes = (await chamar(env, "GET", "/api/versoes", { token })).dados.versoes;
  assert.equal(versoes[0].motivo, "Conflito");
  assert.equal(versoes[0].dispositivo, "Celular");
  const antiga = await chamar(env, "GET", `/api/versoes/${versoes[0].id}`, { token });
  assert.equal(antiga.dados.estado.n, 2);
});

test("recusa corpo que não é estado do Delfos e base ausente", async () => {
  const env = ambiente();
  const token = await entrar(env);
  assert.equal((await chamar(env, "PUT", "/api/estado?base=0", { token, corpo: "oi" })).status, 400);
  assert.equal((await chamar(env, "PUT", "/api/estado", { token, corpo: estado() })).status, 400);
});

test("estado grande é cortado em pedaços e volta idêntico, com acento e emoji", async () => {
  const env = ambiente();
  const token = await entrar(env);
  const texto = ("Anotação de fisiologia 🫀 ").repeat(60_000);
  const corpo = estado({ resumo: texto });
  assert.ok(corpo.length > TAMANHO_PEDACO * 3);
  await chamar(env, "PUT", "/api/estado?base=0", { token, corpo });
  const n = env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM textos WHERE chave = 'atual'").get().n;
  assert.ok(n >= 4);
  const lido = await chamar(env, "GET", "/api/estado", { token });
  assert.equal(lido.dados.estado.resumo, texto);
  // Nenhum corte cai no meio de um par substituto.
  for (const p of dividir(corpo)) assert.doesNotMatch(p, /[\uD800-\uDBFF]$/);
});

test("POST /api/versoes guarda cópia sem mexer no estado em vigor", async () => {
  const env = ambiente();
  const token = await entrar(env);
  await chamar(env, "PUT", "/api/estado?base=0", { token, corpo: estado({ n: 1 }) });
  const r = await chamar(env, "POST", "/api/versoes?motivo=Deste%20aparelho", { token, corpo: estado({ n: 99 }) });
  assert.equal(r.status, 201);
  assert.equal((await chamar(env, "GET", "/api/estado", { token })).dados.estado.n, 1);
  const [v] = (await chamar(env, "GET", "/api/versoes", { token })).dados.versoes;
  assert.equal(v.motivo, "Deste aparelho");
  assert.equal((await chamar(env, "GET", `/api/versoes/${v.id}`, { token })).dados.estado.n, 99);
});

test("versões automáticas: no máximo uma a cada 10 minutos", async () => {
  const env = ambiente();
  const token = await entrar(env);
  for (let i = 0; i < 5; i++) {
    await chamar(env, "PUT", `/api/estado?base=${i}`, { token, corpo: estado({ n: i }) });
  }
  assert.equal((await chamar(env, "GET", "/api/versoes", { token })).dados.versoes.length, 1);
});

test("anexos: envia, lista e baixa em partes, byte a byte igual", async () => {
  const env = ambiente();
  const token = await entrar(env);
  const bytes = new Uint8Array(2_500_000).map((_, i) => (i * 31) % 251);
  const id = "arq-abc123-xyz9";
  const put = await chamar(env, "PUT", `/api/arquivos/${id}`, { token, corpo: bytes, tipo: "application/pdf" });
  assert.equal(put.status, 201);
  assert.equal(env.DB.sqlite.prepare("SELECT partes FROM arquivos").get().partes, 3);

  const lista = await chamar(env, "GET", "/api/arquivos", { token });
  assert.deepEqual(lista.dados.arquivos.map((a) => [a.id, a.tamanho, a.tipo]), [[id, bytes.length, "application/pdf"]]);

  const get = await chamar(env, "GET", `/api/arquivos/${id}`, { token });
  assert.equal(get.headers.get("content-type"), "application/pdf");
  const baixado = new Uint8Array(await get.resposta.arrayBuffer());
  assert.deepEqual(baixado, bytes);

  assert.equal((await chamar(env, "GET", "/api/arquivos/arq-nao-existe", { token })).status, 404);
  assert.equal((await chamar(env, "PUT", "/api/arquivos/..%2Fsegredo", { token, corpo: bytes })).status, 400);
});

test("limpeza apaga só anexo antigo que ninguém cita", async () => {
  const env = ambiente();
  const token = await entrar(env);
  for (const id of ["arq-a-1", "arq-b-2", "arq-c-3"]) {
    await chamar(env, "PUT", `/api/arquivos/${id}`, { token, corpo: new Uint8Array([1, 2, 3]) });
  }
  // a: citado no estado em vigor; b: só numa versão antiga; c: órfão.
  await chamar(env, "PUT", "/api/estado?base=0", { token, corpo: estado({ anexos: [{ id: "arq-b-2" }] }) });
  await chamar(env, "PUT", "/api/estado?base=1&forcar=1&motivo=x", { token, corpo: estado({ html: '<img data-anexo-id="arq-a-1">' }) });
  env.DB.sqlite.exec("UPDATE arquivos SET criado_em = '2020-01-01T00:00:00.000Z'");

  const r = await limpar(env);
  assert.equal(r.anexosRemovidos, 1);
  const restantes = env.DB.sqlite.prepare("SELECT id FROM arquivos ORDER BY id").all().map((x) => x.id);
  assert.deepEqual(restantes, ["arq-a-1", "arq-b-2"]);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM arquivo_partes WHERE arquivo_id = 'arq-c-3'").get().n, 0);
});

test("anexo recém-enviado sobrevive à limpeza mesmo sem ser citado ainda", async () => {
  const env = ambiente();
  const token = await entrar(env);
  await chamar(env, "PUT", "/api/arquivos/arq-novo-1", { token, corpo: new Uint8Array([9]) });
  assert.equal((await limpar(env)).anexosRemovidos, 0);
});
