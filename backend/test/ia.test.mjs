import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import worker from "../src/index.js";
import { criarD1 } from "./d1-falso.mjs";

const ORIGEM = "https://luizftc5-debug.github.io";
const chave = (s) => createHash("sha256").update(s).digest("base64url");
let ip = 0;

async function chamar(env, metodo, caminho, { corpo, token } = {}) {
  const headers = { Origin: ORIGEM, "CF-Connecting-IP": `10.9.0.${++ip % 250}`, "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await worker.fetch(new Request(`https://api.teste${caminho}`, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined }), env);
  return { status: r.status, dados: await r.json() };
}

const SUGESTAO = {
  icone: "svg:estetoscopio", cor: "#1f7a8c", descricao: "Plantões com setor e horas.", rotuloItem: "plantão",
  naAgenda: true, checkin: false, especial: "",
  campos: [{ id: "setor", rotulo: "Setor", tipo: "select", opcoes: ["UTI", "emergência"], naLista: true, obrigatorio: false }],
  agruparPor: "setor", meta: { tipo: "nenhuma", campoId: "", alvo: 0, periodo: "mes" }, exemplos: ["Plantão de sábado"],
};

// Cliente falso: guarda o pedido e devolve o que o teste mandar.
function clienteFalso(resposta) {
  const pedidos = [];
  return {
    pedidos,
    beta: { messages: { create: async (p) => { pedidos.push(p); if (resposta instanceof Error) throw resposta; return resposta; } } },
  };
}
const ok = (obj = SUGESTAO) => ({ model: "claude-opus-5", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(obj) }] });

async function comConta(extra = {}) {
  const env = { DB: criarD1(), ORIGENS: ORIGEM, ...extra };
  const r = await chamar(env, "POST", "/api/cadastro", { corpo: { email: `ia${++ip}@teste.com`, chave: chave("senha-boa-123") } });
  return { env, token: r.dados.token };
}

test("saúde diz se a IA está ligada", async () => {
  const sem = await chamar({ DB: criarD1(), ORIGENS: ORIGEM }, "GET", "/api/saude");
  assert.equal(sem.dados.ia, false);
  const com = await chamar({ DB: criarD1(), ORIGENS: ORIGEM, ANTHROPIC_API_KEY: "sk-teste" }, "GET", "/api/saude");
  assert.equal(com.dados.ia, true);
});

test("sem chave configurada a rota responde 503", async () => {
  const { env, token } = await comConta();
  const r = await chamar(env, "POST", "/api/ia/aba", { token, corpo: { nome: "Plantões" } });
  assert.equal(r.status, 503);
});

test("exige sessão", async () => {
  const r = await chamar({ DB: criarD1(), ORIGENS: ORIGEM, CLIENTE_IA: clienteFalso(ok()) }, "POST", "/api/ia/aba", { corpo: { nome: "Plantões" } });
  assert.equal(r.status, 401);
});

test("pede ao Claude com esquema, esforço baixo e fallbacks, e devolve a sugestão", async () => {
  const cliente = clienteFalso(ok());
  const { env, token } = await comConta({ CLIENTE_IA: cliente });
  const r = await chamar(env, "POST", "/api/ia/aba", { token, corpo: { nome: "Tricô da vovó", contexto: "Estudante de Medicina, Salvador", existentes: ["Local"] } });
  assert.equal(r.status, 200, JSON.stringify(r.dados));
  assert.equal(r.dados.sugestao.rotuloItem, "plantão");
  const p = cliente.pedidos[0];
  assert.equal(p.model, "claude-opus-5");
  assert.equal(p.output_config.format.type, "json_schema");
  assert.equal(p.output_config.effort, "low");
  assert.equal(p.fallbacks, "default");
  assert.deepEqual(p.betas, ["server-side-fallback-2026-07-01"]);
  assert.ok(!("thinking" in p));
  // O que a pessoa digitou vai como dado no JSON da mensagem, não no sistema.
  assert.ok(p.messages[0].content.includes('"nomeDaAba":"Tricô da vovó"'));
  assert.ok(p.messages[0].content.includes("sem repeti-los"));
  assert.ok(p.messages[0].content.includes("Estudante de Medicina, Salvador"));
  assert.ok(!p.system.includes("Tricô") && !p.system.includes("Salvador"));
});

test("nome vazio é 400; recusa é 422; JSON quebrado é 502", async () => {
  const { env, token } = await comConta({ CLIENTE_IA: clienteFalso(ok()) });
  assert.equal((await chamar(env, "POST", "/api/ia/aba", { token, corpo: { nome: " " } })).status, 400);
  env.CLIENTE_IA = clienteFalso({ stop_reason: "refusal", content: [] });
  assert.equal((await chamar(env, "POST", "/api/ia/aba", { token, corpo: { nome: "Algo" } })).status, 422);
  env.CLIENTE_IA = clienteFalso({ stop_reason: "end_turn", content: [{ type: "text", text: "{quebrado" }] });
  assert.equal((await chamar(env, "POST", "/api/ia/aba", { token, corpo: { nome: "Algo" } })).status, 502);
});

test("erro de limite da API vira 503 com mensagem amigável", async () => {
  const erro = new Anthropic.RateLimitError(429, { error: { message: "rate" } }, "rate", new Headers());
  const { env, token } = await comConta({ CLIENTE_IA: clienteFalso(erro) });
  const r = await chamar(env, "POST", "/api/ia/aba", { token, corpo: { nome: "Leituras" } });
  assert.equal(r.status, 503);
  assert.match(r.dados.erro, /ocupada/);
});

test("limite de pedidos por conta por hora", async () => {
  const { env, token } = await comConta({ CLIENTE_IA: clienteFalso(ok()) });
  let ultimo;
  for (let i = 0; i < 41; i++) ultimo = await chamar(env, "POST", "/api/ia/aba", { token, corpo: { nome: `Aba ${i}` } });
  assert.equal(ultimo.status, 429);
});
