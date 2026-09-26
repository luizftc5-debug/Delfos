import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import worker from "../src/index.js";
import { limpar } from "../src/limpeza.js";
import { dividir, TAMANHO_PEDACO } from "../src/textos.js";
import { criarD1 } from "./d1-falso.mjs";

const ORIGEM = "https://luizftc5-debug.github.io";

function ambiente(extra = {}) {
  return { DB: criarD1(), ORIGENS: `${ORIGEM},http://localhost:8000`, ...extra };
}

// No painel a chave sai de PBKDF2 com 600 mil iterações; para o servidor
// basta ser 32 bytes em base64url, então aqui um SHA-256 rápido serve.
const chave = (senha) => createHash("sha256").update(senha).digest("base64url");

let ipSeq = 0;
async function chamar(env, metodo, caminho, { corpo, token, tipo, origem = ORIGEM, ip } = {}) {
  const headers = { Origin: origem, "CF-Connecting-IP": ip || `10.0.0.${++ipSeq % 250}` };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tipo) headers["Content-Type"] = tipo;
  if (corpo && typeof corpo === "object" && !(corpo instanceof Uint8Array)) corpo = JSON.stringify(corpo);
  const r = await worker.fetch(new Request(`https://api.teste${caminho}`, { method: metodo, headers, body: corpo }), env);
  const texto = r.headers.get("content-type")?.includes("json") ? await r.text() : null;
  return { status: r.status, headers: r.headers, dados: texto ? JSON.parse(texto) : null, resposta: r };
}

async function criarConta(env, email = "luiz@exemplo.com", senha = "senha-boa-123") {
  const r = await chamar(env, "POST", "/api/cadastro", { corpo: { email, chave: chave(senha) } });
  assert.equal(r.status, 201, JSON.stringify(r.dados));
  return r.dados;
}

const estado = (extra = {}) => JSON.stringify({ versao: 9, perfil: { nome: "Luiz" }, ...extra });

/* -------------------------------- Contas ---------------------------------- */

test("saúde diz se o cadastro pede convite", async () => {
  assert.equal((await chamar(ambiente(), "GET", "/api/saude")).dados.cadastro, "aberto");
  assert.equal((await chamar(ambiente({ CODIGO_CONVITE: "x" }), "GET", "/api/saude")).dados.cadastro, "convite");
});

test("cadastro cria conta e sessão; e-mail repetido (em qualquer caixa) é recusado", async () => {
  const env = ambiente();
  const conta = await criarConta(env, "Luiz@Exemplo.com ");
  assert.equal(conta.usuario.email, "luiz@exemplo.com");
  assert.match(conta.token, /^[A-Za-z0-9_-]{43}$/);
  const dup = await chamar(env, "POST", "/api/cadastro", { corpo: { email: "LUIZ@exemplo.com", chave: chave("outra-senha") } });
  assert.equal(dup.status, 409);
  assert.equal((await chamar(env, "POST", "/api/cadastro", { corpo: { email: "sem-arroba", chave: chave("x") } })).status, 400);
  assert.equal((await chamar(env, "POST", "/api/cadastro", { corpo: { email: "a@b.co", chave: "senha-em-texto" } })).status, 400);
});

test("o banco não guarda a chave nem o token em claro", async () => {
  const env = ambiente();
  const senha = "senha-boa-123";
  const { token } = await criarConta(env, "a@b.co", senha);
  const tudo = JSON.stringify([
    env.DB.sqlite.prepare("SELECT * FROM usuarios").all(),
    env.DB.sqlite.prepare("SELECT * FROM sessoes").all(),
  ]);
  assert.ok(!tudo.includes(chave(senha)), "chave em claro no banco");
  assert.ok(!tudo.includes(token), "token em claro no banco");
  assert.ok(!tudo.includes(senha));
  const u = env.DB.sqlite.prepare("SELECT senha_sal, senha_hash FROM usuarios").get();
  assert.ok(u.senha_sal && u.senha_hash);
});

test("mesma senha em duas contas gera hashes diferentes (sal por conta)", async () => {
  const env = ambiente();
  await criarConta(env, "a@b.co", "igual-igual-1");
  await criarConta(env, "c@d.co", "igual-igual-1");
  const [x, y] = env.DB.sqlite.prepare("SELECT senha_hash FROM usuarios").all();
  assert.notEqual(x.senha_hash, y.senha_hash);
});

test("entrar: certo dá sessão; errado e inexistente dão a mesma resposta", async () => {
  const env = ambiente();
  await criarConta(env, "a@b.co", "senha-certa-1");
  const ok = await chamar(env, "POST", "/api/entrar", { corpo: { email: "A@B.co", chave: chave("senha-certa-1") } });
  assert.equal(ok.status, 200);
  assert.equal(ok.dados.usuario.email, "a@b.co");
  const errada = await chamar(env, "POST", "/api/entrar", { corpo: { email: "a@b.co", chave: chave("errada") } });
  const inexistente = await chamar(env, "POST", "/api/entrar", { corpo: { email: "zz@b.co", chave: chave("errada") } });
  assert.equal(errada.status, 401);
  assert.equal(inexistente.status, 401);
  assert.equal(errada.dados.erro, inexistente.dados.erro);
});

test("10 senhas erradas para o mesmo e-mail travam o login, mesmo vindo de IPs diferentes", async () => {
  const env = ambiente();
  await criarConta(env, "a@b.co", "senha-certa-1");
  for (let i = 0; i < 10; i++) {
    assert.equal((await chamar(env, "POST", "/api/entrar", { corpo: { email: "a@b.co", chave: chave(`e${i}`) } })).status, 401);
  }
  const travado = await chamar(env, "POST", "/api/entrar", { corpo: { email: "a@b.co", chave: chave("senha-certa-1") } });
  assert.equal(travado.status, 429);
});

test("cadastro limitado a 5 por hora por IP", async () => {
  const env = ambiente();
  for (let i = 0; i < 5; i++) {
    assert.equal((await chamar(env, "POST", "/api/cadastro", { ip: "9.9.9.9", corpo: { email: `u${i}@b.co`, chave: chave("x") } })).status, 201);
  }
  assert.equal((await chamar(env, "POST", "/api/cadastro", { ip: "9.9.9.9", corpo: { email: "u9@b.co", chave: chave("x") } })).status, 429);
});

test("com CODIGO_CONVITE, cadastro exige o código certo", async () => {
  const env = ambiente({ CODIGO_CONVITE: "turma-2026" });
  const sem = await chamar(env, "POST", "/api/cadastro", { corpo: { email: "a@b.co", chave: chave("x") } });
  assert.equal(sem.status, 403);
  const errado = await chamar(env, "POST", "/api/cadastro", { corpo: { email: "a@b.co", chave: chave("x"), convite: "turma-2025" } });
  assert.equal(errado.status, 403);
  const certo = await chamar(env, "POST", "/api/cadastro", { corpo: { email: "a@b.co", chave: chave("x"), convite: " turma-2026 " } });
  assert.equal(certo.status, 201);
});

test("sessão: sem token, token inventado, depois de sair e vencida dão 401", async () => {
  const env = ambiente();
  const { token } = await criarConta(env);
  assert.equal((await chamar(env, "GET", "/api/conta", { token })).status, 200);
  assert.equal((await chamar(env, "GET", "/api/estado")).status, 401);
  assert.equal((await chamar(env, "GET", "/api/estado", { token: "A".repeat(43) })).status, 401);

  const outra = (await chamar(env, "POST", "/api/entrar", { corpo: { email: "luiz@exemplo.com", chave: chave("senha-boa-123") } })).dados.token;
  env.DB.sqlite.exec("UPDATE sessoes SET expira_em = 1");
  assert.equal((await chamar(env, "GET", "/api/conta", { token: outra })).status, 401);

  const nova = (await chamar(env, "POST", "/api/entrar", { corpo: { email: "luiz@exemplo.com", chave: chave("senha-boa-123") } })).dados.token;
  assert.equal((await chamar(env, "POST", "/api/sair", { token: nova })).status, 200);
  assert.equal((await chamar(env, "GET", "/api/conta", { token: nova })).status, 401);
});

test("trocar a senha: exige a atual, derruba os outros aparelhos e mantém este", async () => {
  const env = ambiente();
  const { token: aqui } = await criarConta(env, "a@b.co", "antiga-antiga");
  const { token: celular } = (await chamar(env, "POST", "/api/entrar", { corpo: { email: "a@b.co", chave: chave("antiga-antiga") } })).dados;

  const errada = await chamar(env, "POST", "/api/conta/senha", { token: aqui, corpo: { chaveAtual: chave("chute"), chaveNova: chave("nova-nova-1") } });
  assert.equal(errada.status, 403);

  const ok = await chamar(env, "POST", "/api/conta/senha", { token: aqui, corpo: { chaveAtual: chave("antiga-antiga"), chaveNova: chave("nova-nova-1") } });
  assert.equal(ok.status, 200);
  assert.equal((await chamar(env, "GET", "/api/conta", { token: aqui })).status, 200);
  assert.equal((await chamar(env, "GET", "/api/conta", { token: celular })).status, 401);
  assert.equal((await chamar(env, "POST", "/api/entrar", { corpo: { email: "a@b.co", chave: chave("antiga-antiga") } })).status, 401);
  assert.equal((await chamar(env, "POST", "/api/entrar", { corpo: { email: "a@b.co", chave: chave("nova-nova-1") } })).status, 200);
});

test("sair dos outros aparelhos mantém só a sessão atual", async () => {
  const env = ambiente();
  const { token: aqui } = await criarConta(env, "a@b.co", "senha-senha");
  const { token: la } = (await chamar(env, "POST", "/api/entrar", { corpo: { email: "a@b.co", chave: chave("senha-senha") } })).dados;
  assert.equal((await chamar(env, "POST", "/api/conta/sair-dos-outros", { token: aqui })).status, 200);
  assert.equal((await chamar(env, "GET", "/api/conta", { token: aqui })).status, 200);
  assert.equal((await chamar(env, "GET", "/api/conta", { token: la })).status, 401);
});

/* ------------------------------ Isolamento -------------------------------- */

test("uma conta nunca enxerga estado, versões nem anexos de outra", async () => {
  const env = ambiente();
  const a = (await criarConta(env, "a@b.co")).token;
  const b = (await criarConta(env, "c@d.co")).token;

  await chamar(env, "PUT", "/api/estado?base=0", { token: a, corpo: estado({ dono: "A" }) });
  await chamar(env, "PUT", "/api/estado?base=1&forcar=1&motivo=x", { token: a, corpo: estado({ dono: "A2" }) });
  const lidoB = await chamar(env, "GET", "/api/estado", { token: b });
  assert.equal(lidoB.dados.estado, null);
  assert.equal(lidoB.dados.revisao, 0);

  const [versaoA] = (await chamar(env, "GET", "/api/versoes", { token: a })).dados.versoes;
  assert.equal((await chamar(env, "GET", "/api/versoes", { token: b })).dados.versoes.length, 0);
  assert.equal((await chamar(env, "GET", `/api/versoes/${versaoA.id}`, { token: b })).status, 404);

  const id = "arq-mesmo-id1";
  await chamar(env, "PUT", `/api/arquivos/${id}`, { token: a, corpo: new Uint8Array([1, 1, 1]) });
  assert.equal((await chamar(env, "GET", `/api/arquivos/${id}`, { token: b })).status, 404);
  // B enviando um arquivo com o mesmo id não mexe no de A.
  await chamar(env, "PUT", `/api/arquivos/${id}`, { token: b, corpo: new Uint8Array([2, 2]) });
  const deA = new Uint8Array(await (await chamar(env, "GET", `/api/arquivos/${id}`, { token: a })).resposta.arrayBuffer());
  assert.deepEqual([...deA], [1, 1, 1]);
});

test("excluir a conta exige a senha e apaga tudo dela, sem tocar nas outras", async () => {
  const env = ambiente();
  const a = (await criarConta(env, "a@b.co", "senha-de-a-1")).token;
  const b = (await criarConta(env, "c@d.co", "senha-de-b-1")).token;
  for (const t of [a, b]) {
    await chamar(env, "PUT", "/api/estado?base=0", { token: t, corpo: estado() });
    await chamar(env, "PUT", "/api/estado?base=1&forcar=1&motivo=x", { token: t, corpo: estado() });
    await chamar(env, "PUT", "/api/arquivos/arq-x-1", { token: t, corpo: new Uint8Array([7]) });
  }
  assert.equal((await chamar(env, "POST", "/api/conta/excluir", { token: a, corpo: { chave: chave("chute") } })).status, 403);
  assert.equal((await chamar(env, "POST", "/api/conta/excluir", { token: a, corpo: { chave: chave("senha-de-a-1") } })).status, 200);

  const q = (sql) => env.DB.sqlite.prepare(sql).get().n;
  assert.equal(q("SELECT COUNT(*) AS n FROM usuarios"), 1);
  assert.equal(q("SELECT COUNT(*) AS n FROM estado_atual"), 1);
  assert.equal(q("SELECT COUNT(*) AS n FROM versoes"), 1);
  assert.equal(q("SELECT COUNT(*) AS n FROM arquivos"), 1);
  assert.equal(q("SELECT COUNT(*) AS n FROM arquivo_partes"), 1);
  assert.equal(q("SELECT COUNT(*) AS n FROM sessoes"), 1);
  // Só sobram os textos de B: o atual e o da versão dele.
  assert.equal(q("SELECT COUNT(*) AS n FROM textos"), 2);

  assert.equal((await chamar(env, "GET", "/api/conta", { token: a })).status, 401);
  assert.equal((await chamar(env, "GET", "/api/estado", { token: b })).dados.revisao, 2);
  // O e-mail fica livre para uma conta nova.
  await criarConta(env, "a@b.co", "outra-senha-1");
});

/* ------------------------------ Sincronização ------------------------------ */

test("CORS: libera só as origens da lista", async () => {
  const env = ambiente();
  const ok = await chamar(env, "OPTIONS", "/api/estado");
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get("Access-Control-Allow-Origin"), ORIGEM);
  const fora = await chamar(env, "GET", "/api/saude", { origem: "https://site-estranho.com" });
  assert.equal(fora.headers.get("Access-Control-Allow-Origin"), null);
});

test("fluxo de sincronização: grava, lê, detecta conflito, força", async () => {
  const env = ambiente();
  const { token } = await criarConta(env);

  const vazio = await chamar(env, "GET", "/api/estado", { token });
  assert.deepEqual([vazio.dados.revisao, vazio.dados.estado], [0, null]);

  const g1 = await chamar(env, "PUT", "/api/estado?base=0&dispositivo=Notebook", { token, corpo: estado({ n: 1 }) });
  assert.equal(g1.dados.revisao, 1);

  const lido = await chamar(env, "GET", "/api/estado", { token });
  assert.deepEqual([lido.dados.revisao, lido.dados.estado.n, lido.dados.dispositivo], [1, 1, "Notebook"]);

  const inalterado = await chamar(env, "GET", "/api/estado?desde=1", { token });
  assert.equal(inalterado.dados.inalterado, true);
  assert.equal(inalterado.dados.estado, undefined);

  assert.equal((await chamar(env, "PUT", "/api/estado?base=1&dispositivo=Celular", { token, corpo: estado({ n: 2 }) })).dados.revisao, 2);
  const c = await chamar(env, "PUT", "/api/estado?base=1&dispositivo=Notebook", { token, corpo: estado({ n: 3 }) });
  assert.equal(c.status, 409);
  assert.equal(c.dados.dispositivo, "Celular");

  const f = await chamar(env, "PUT", "/api/estado?base=1&forcar=1&motivo=Conflito&dispositivo=Notebook", { token, corpo: estado({ n: 3 }) });
  assert.equal(f.dados.revisao, 3);
  const versoes = (await chamar(env, "GET", "/api/versoes", { token })).dados.versoes;
  assert.deepEqual([versoes[0].motivo, versoes[0].dispositivo], ["Conflito", "Celular"]);
  assert.equal((await chamar(env, "GET", `/api/versoes/${versoes[0].id}`, { token })).dados.estado.n, 2);
});

test("recusa corpo que não é estado do Delfos e base ausente", async () => {
  const env = ambiente();
  const { token } = await criarConta(env);
  assert.equal((await chamar(env, "PUT", "/api/estado?base=0", { token, corpo: "oi" })).status, 400);
  assert.equal((await chamar(env, "PUT", "/api/estado", { token, corpo: estado() })).status, 400);
});

test("estado grande é cortado em pedaços e volta idêntico, com acento e emoji", async () => {
  const env = ambiente();
  const { token } = await criarConta(env);
  const texto = "Anotação de fisiologia 🫀 ".repeat(60_000);
  const corpo = estado({ resumo: texto });
  assert.ok(corpo.length > TAMANHO_PEDACO * 3);
  await chamar(env, "PUT", "/api/estado?base=0", { token, corpo });
  assert.ok(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM textos WHERE chave LIKE 'atual:%'").get().n >= 4);
  assert.equal((await chamar(env, "GET", "/api/estado", { token })).dados.estado.resumo, texto);
  for (const p of dividir(corpo)) assert.doesNotMatch(p, /[\uD800-\uDBFF]$/);
});

test("POST /api/versoes guarda cópia sem mexer no estado em vigor", async () => {
  const env = ambiente();
  const { token } = await criarConta(env);
  await chamar(env, "PUT", "/api/estado?base=0", { token, corpo: estado({ n: 1 }) });
  assert.equal((await chamar(env, "POST", "/api/versoes?motivo=Deste%20aparelho", { token, corpo: estado({ n: 99 }) })).status, 201);
  assert.equal((await chamar(env, "GET", "/api/estado", { token })).dados.estado.n, 1);
  const [v] = (await chamar(env, "GET", "/api/versoes", { token })).dados.versoes;
  assert.equal(v.motivo, "Deste aparelho");
  assert.equal((await chamar(env, "GET", `/api/versoes/${v.id}`, { token })).dados.estado.n, 99);
});

test("versões automáticas: no máximo uma a cada 10 minutos", async () => {
  const env = ambiente();
  const { token } = await criarConta(env);
  for (let i = 0; i < 5; i++) await chamar(env, "PUT", `/api/estado?base=${i}`, { token, corpo: estado({ n: i }) });
  assert.equal((await chamar(env, "GET", "/api/versoes", { token })).dados.versoes.length, 1);
});

test("guarda no máximo 60 versões por conta", async () => {
  const env = ambiente();
  const { token } = await criarConta(env);
  for (let i = 0; i < 65; i++) {
    await chamar(env, "PUT", `/api/estado?base=${i}&forcar=1&motivo=v${i}`, { token, corpo: estado({ n: i }) });
  }
  assert.equal((await chamar(env, "GET", "/api/versoes", { token })).dados.versoes.length, 60);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM textos WHERE chave LIKE 'v:%'").get().n, 60);
});

/* -------------------------------- Anexos ---------------------------------- */

test("anexos: envia, lista e baixa em partes, byte a byte igual", async () => {
  const env = ambiente();
  const { token } = await criarConta(env);
  const bytes = new Uint8Array(2_500_000).map((_, i) => (i * 31) % 251);
  const id = "arq-abc123-xyz9";
  assert.equal((await chamar(env, "PUT", `/api/arquivos/${id}`, { token, corpo: bytes, tipo: "application/pdf" })).status, 201);
  assert.equal(env.DB.sqlite.prepare("SELECT partes FROM arquivos").get().partes, 3);

  const lista = await chamar(env, "GET", "/api/arquivos", { token });
  assert.deepEqual(lista.dados.arquivos.map((a) => [a.id, a.tamanho, a.tipo]), [[id, bytes.length, "application/pdf"]]);

  const get = await chamar(env, "GET", `/api/arquivos/${id}`, { token });
  assert.equal(get.headers.get("content-type"), "application/pdf");
  assert.deepEqual(new Uint8Array(await get.resposta.arrayBuffer()), bytes);

  assert.equal((await chamar(env, "GET", "/api/arquivos/arq-nao-existe", { token })).status, 404);
  assert.equal((await chamar(env, "PUT", "/api/arquivos/..%2Fsegredo", { token, corpo: bytes })).status, 400);
  assert.equal((await chamar(env, "GET", "/api/conta", { token })).dados.anexos.usadoBytes, bytes.length);
});

test("cota de anexos por conta", async () => {
  const env = ambiente({ COTA_ANEXOS_MB: "2" });
  const { token } = await criarConta(env);
  const mb = new Uint8Array(1024 * 1024);
  assert.equal((await chamar(env, "PUT", "/api/arquivos/arq-a-1", { token, corpo: mb })).status, 201);
  // Reenviar o mesmo arquivo não conta duas vezes.
  assert.equal((await chamar(env, "PUT", "/api/arquivos/arq-a-1", { token, corpo: mb })).status, 201);
  assert.equal((await chamar(env, "PUT", "/api/arquivos/arq-b-2", { token, corpo: mb })).status, 201);
  const cheio = await chamar(env, "PUT", "/api/arquivos/arq-c-3", { token, corpo: new Uint8Array(10) });
  assert.equal(cheio.status, 413);
  assert.equal(cheio.dados.cota, true);
});

/* -------------------------------- Limpeza --------------------------------- */

test("limpeza apaga só anexo antigo que ninguém da mesma conta cita", async () => {
  const env = ambiente();
  const a = (await criarConta(env, "a@b.co")).token;
  const b = (await criarConta(env, "c@d.co")).token;
  for (const id of ["arq-a-1", "arq-b-2", "arq-c-3"]) {
    await chamar(env, "PUT", `/api/arquivos/${id}`, { token: a, corpo: new Uint8Array([1, 2, 3]) });
  }
  // B tem um arquivo com o id que A cita — citação de A não protege o de B.
  await chamar(env, "PUT", "/api/arquivos/arq-a-1", { token: b, corpo: new Uint8Array([9]) });

  // Em A: a citado no estado em vigor; b só numa versão antiga; c órfão.
  await chamar(env, "PUT", "/api/estado?base=0", { token: a, corpo: estado({ anexos: [{ id: "arq-b-2" }] }) });
  await chamar(env, "PUT", "/api/estado?base=1&forcar=1&motivo=x", { token: a, corpo: estado({ html: '<img data-anexo-id="arq-a-1">' }) });
  env.DB.sqlite.exec("UPDATE arquivos SET criado_em = '2020-01-01T00:00:00.000Z'");

  assert.equal((await limpar(env)).anexosRemovidos, 2);
  const restantes = env.DB.sqlite.prepare("SELECT usuario_id AS u, id FROM arquivos ORDER BY id").all().map((x) => x.id);
  assert.deepEqual(restantes, ["arq-a-1", "arq-b-2"]);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM arquivo_partes").get().n, 2);
});

test("limpeza: anexo recém-enviado sobrevive, sessões vencidas somem", async () => {
  const env = ambiente();
  const { token } = await criarConta(env);
  await chamar(env, "PUT", "/api/arquivos/arq-novo-1", { token, corpo: new Uint8Array([9]) });
  env.DB.sqlite.exec("INSERT INTO sessoes VALUES ('velha', 'x', '2020', 1, '')");
  assert.equal((await limpar(env)).anexosRemovidos, 0);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM sessoes").get().n, 1);
});

test("migração 0002 preserva as tabelas da versão de senha única como legado_*", async () => {
  const env = ambiente();
  const nomes = env.DB.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name);
  for (const t of ["legado_estado_atual", "legado_versoes", "legado_textos", "legado_arquivos", "legado_arquivo_partes"]) {
    assert.ok(nomes.includes(t), t);
  }
});
