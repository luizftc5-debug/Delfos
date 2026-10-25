const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function ambiente(arquivos) {
  const dados = new Map();
  const eventos = [];
  const storage = { getItem: (k) => dados.get(k) || null, removeItem: (k) => dados.delete(k), setItem: (k, v) => dados.set(k, v) };
  const contexto = vm.createContext({
    localStorage: storage, console: { error() {}, warn() {} },
    window: { dispatchEvent: (e) => eventos.push(e.type) },
    CustomEvent: class { constructor(type) { this.type = type; } },
    ...(arquivos ? { Arquivos: arquivos } : {}),
  });
  for (const arquivo of ["data.js", "store.js"]) vm.runInContext(readFileSync(path.join(__dirname, "..", arquivo), "utf8"), contexto);
  return { store: vm.runInContext("Store", contexto), storage, dados, eventos };
}

test("falha de armazenamento não retorna sucesso e permite tentar novamente", () => {
  const { store, storage, dados, eventos } = ambiente();
  store.estado();
  const original = dados.get("organizador.estado.v2");
  const salvar = storage.setItem;
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  assert.throws(() => store.inserir("pessoal.compromissos", { descricao: "Consulta", data: "2026-10-25" }), /ainda não foi salva/);
  assert.equal(dados.get("organizador.estado.v2"), original);
  assert.equal(eventos.at(-1), "delfos:falha-ao-salvar");
  storage.setItem = salvar;
  store.tentarSalvar();
  assert.equal(JSON.parse(dados.get("organizador.estado.v2")).pessoal.compromissos[0].descricao, "Consulta");
  assert.equal(eventos.at(-1), "delfos:salvo");
});

test("migração com falha de gravação preserva os dados lidos", () => {
  const { store, storage, dados } = ambiente();
  dados.set("organizador.estado.v2", JSON.stringify({ versao: 12, perfil: { nome: "Luiz" } }));
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  assert.equal(store.estado().perfil.nome, "Luiz");
});

test("backup recusa exportação silenciosa sem os anexos", async () => {
  const { store } = ambiente({ disponivel: true, exportarTodos: async () => { throw new Error("IndexedDB indisponível"); } });
  await assert.rejects(store.exportar(), /backup completo/);
});
