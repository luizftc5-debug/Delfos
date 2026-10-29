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

test("preferência da barra recolhida acompanha perfil, backup e restauração sem alterar abas", async () => {
  const { store } = ambiente();
  assert.equal(store.estado().preferencias.experiencia.barraLateralRecolhida, false);
  const p = store.inserir("pilares", { nome: "Meus estudos", campos: [], itens: [{ id: "r", descricao: "Revisar" }] });
  store.definirPreferencias({ experiencia: { barraLateralRecolhida: true } });
  store.definirPerfil({ nome: "Pessoa de teste" });
  const backup = await store.exportar();
  await store.importar(backup);
  assert.equal(store.estado().preferencias.experiencia.barraLateralRecolhida, true);
  assert.equal(store.achar("pilares", p.id).itens[0].descricao, "Revisar");
  store.definirPreferencias({ experiencia: { tamanho: "grande" } });
  assert.equal(store.estado().preferencias.experiencia.barraLateralRecolhida, true);
});

test("plano de ensino preserva dados manuais e não duplica a agenda ao repetir após falha", () => {
  const { store, storage } = ambiente();
  const d = store.inserir("faculdade.disciplinas", { nome:"Clínica",avaliacoes:[{id:"manual",nome:"Prova antiga",data:"2026-10-20",nota:8}],materiais:[],resumos:[] });
  const plano = {aulas:[{nome:"Aula",data:"2026-10-26",hora:"08:00",horaFim:"10:00"}],avaliacoes:[{nome:"Prova 1",data:"2026-10-29",hora:"08:30",nota:"",peso:1,origemPlano:"avaliacoes|Prova 1|2026-10-29"}],prazos:[{descricao:"Trabalho",data:"2026-10-30",concluido:false}],assuntos:[{texto:"Semiologia"}],anexos:[{id:"arq-abc-xyz",nome:"Plano.docx",hash:"123"}]};
  const salvar=storage.setItem;
  storage.setItem=()=>{throw new Error("QuotaExceededError");};
  assert.throws(()=>store.importarPlanoEnsino(d.id,plano),/ainda não foi salva/);
  storage.setItem=salvar;
  store.importarPlanoEnsino(d.id,plano);
  const prova = store.achar("faculdade.disciplinas",d.id).avaliacoes.find(x=>x.origemPlano);
  store.subAtualizar("faculdade.disciplinas",d.id,"avaliacoes",prova.id,{nome:"Prova revisada",data:"2026-10-31"});
  store.importarPlanoEnsino(d.id,plano);
  const atual=store.achar("faculdade.disciplinas",d.id);
  assert.equal(atual.aulas.length,1);assert.equal(atual.avaliacoes.length,2);assert.equal(atual.avaliacoes[0].nota,8);
  assert.equal(atual.avaliacoes[1].nome,"Prova revisada");assert.equal(atual.avaliacoes[1].data,"2026-10-31");
  assert.equal(atual.planoEnsino.anexos.length,1);assert.equal(atual.planoEnsino.assuntos.length,1);
  assert.equal(store.lista("faculdade.prazos").filter(p=>p.disciplinaId===d.id).length,1);
});
