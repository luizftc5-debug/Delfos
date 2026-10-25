import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { criarD1 } from "./d1-falso.mjs";
import { lerCorpoLimitado } from "../src/respostas.js";

async function conta() {
  const env = { DB: criarD1() };
  const r = await worker.fetch(new Request("https://teste/api/cadastro", {
    method: "POST", body: JSON.stringify({ email: "revisao@exemplo.com", chave: "A".repeat(43) }),
  }), env);
  assert.equal(r.status, 201);
  const { token } = await r.json();
  return { env, headers: { Authorization: `Bearer ${token}` } };
}

test("estado inválido não substitui dados válidos nem cria uma versão", async () => {
  const { env, headers } = await conta();
  const original = { versao: 13, perfil: { nome: "Luiz" } };
  const salvar = (body, base) => worker.fetch(new Request(`https://teste/api/estado?base=${base}`, { method: "PUT", headers, body }), env);
  assert.equal((await salvar(JSON.stringify(original), 0)).status, 200);
  for (const body of ['{"versao": invalid}', '{"versao":0}', '{"versao":"13"}', '[{"versao":13}]', 'null']) {
    assert.equal((await salvar(body, 1)).status, 400);
  }
  const atual = await worker.fetch(new Request("https://teste/api/estado", { headers }), env);
  const dados = await atual.json();
  assert.equal(dados.revisao, 1);
  assert.deepEqual(dados.estado, original);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM versoes").get().n, 0);
  const copia = await worker.fetch(new Request("https://teste/api/versoes", { method: "POST", headers, body: '{"versao":bad}' }), env);
  assert.equal(copia.status, 400);
});

test("leitura sem Content-Length cancela o stream ao exceder o limite", async () => {
  let cancelado = false;
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(4)); controller.enqueue(new Uint8Array(4)); },
    cancel() { cancelado = true; },
  });
  const request = new Request("https://teste/arquivo", { method: "PUT", body, duplex: "half" });
  await assert.rejects(lerCorpoLimitado(request, 5, "Acima do limite"), (e) => e.status === 413);
  assert.equal(cancelado, true);
  const bytes = await lerCorpoLimitado(new Request("https://teste/arquivo", { method: "PUT", body: "ação" }), 6, "Limite");
  assert.equal(bytes.byteLength, 6);
});

test("anexo ativo baixa como arquivo e imagens conhecidas preservam visualização", async () => {
  const { env, headers } = await conta();
  for (const [tipo, disposition, id] of [["text/html", "attachment", "arq-a-html"], ["image/svg+xml", "attachment", "arq-a-svg"], ["image/png", "inline", "arq-a-png"]]) {
    const url = `https://teste/api/arquivos/${id}`;
    const put = await worker.fetch(new Request(url, { method: "PUT", headers: { ...headers, "content-type": tipo }, body: "conteudo" }), env);
    assert.equal(put.status, 201);
    const get = await worker.fetch(new Request(url, { headers }), env);
    assert.equal(get.status, 200);
    assert.equal(get.headers.get("x-content-type-options"), "nosniff");
    assert.equal(get.headers.get("content-disposition"), disposition);
    await get.arrayBuffer();
  }
});
