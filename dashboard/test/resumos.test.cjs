const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const Resumos = require('../resumos.js');
const Modelos = require('../modelos-abas.js');

function ambiente() {
  const dados = new Map();
  const contexto = vm.createContext({ localStorage: { getItem: k => dados.get(k) || null, setItem: (k,v) => dados.set(k,v), removeItem: k => dados.delete(k) }, console, window: { dispatchEvent() {} }, CustomEvent: class {} });
  for (const file of ['data.js','store.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), contexto);
  return { store: vm.runInContext('Store', contexto), dados };
}
test('resolução de contexto não cria cadernos nem altera os registros existentes', () => {
  const { store } = ambiente();
  const p = store.inserir('pilares', { nome:'Concurso',modeloOrigem:'concursos',campos:[],itens:[{id:'questao',descricao:'Estudar'}] });
  const antes = JSON.stringify(store.estado());
  const c = Resumos.resolver({ pilar:p.id },store), fixo = Resumos.resolver({ aba:'pessoal' },store);
  assert.equal(c.ativo(),true); assert.equal(fixo.ativo(),false);
  assert.equal(c.caminho,'pilares'); assert.equal(fixo.nome,'Pessoal');
  assert.equal(JSON.stringify(store.estado()),antes);
  assert.equal(Resumos.resolver({ pilar:'inexistente' },store),null);
  assert.equal(Resumos.resolver({ aba:'__proto__' },store),null);
});
test('disciplina e aba própria usam a mesma estrutura, sem misturar os resumos', () => {
  const { store } = ambiente();
  const d=store.inserir('faculdade.disciplinas',{nome:'Clínica',resumos:[{id:'r',titulo:'Original',conteudo:'<p>Texto</p>',conteudoFormato:'html'}]});
  const p=store.inserir('pilares',{nome:'Escola',campos:[{id:'materia'}],itens:[]});
  const disciplina=Resumos.resolver({disciplina:d.id},store), aba=Resumos.resolver({pilar:p.id},store);
  assert.equal(aba.ativo(),true); assert.equal(disciplina.lista()[0].titulo,'Original'); assert.equal(aba.lista().length,0);
  store.subInserir(aba.caminho,aba.id,'resumos',{id:'p',titulo:'Resumo da escola',conteudo:'<p>Aula</p>',conteudoFormato:'html'});
  assert.equal(aba.lista().length,1); assert.equal(disciplina.lista().length,1);
  assert.match(disciplina.endereco('r'),/^resumo.html\?disciplina=/); assert.match(aba.endereco('p'),/\?pilar=/);
});
test('ocultar e reativar preserva textos, imagens e preferências, inclusive no backup', async () => {
  const { store }=ambiente();
  const c=Resumos.resolver({aba:'financeiro'},store); c.definirAtivo(true);
  store.subInserir(c.caminho,c.id,'resumos',{id:'r',titulo:'Planejamento',conteudo:'<p>Orçamento</p><img data-anexo-id="arq-abc-def">',conteudoFormato:'html',folha:{largura:'ampla'},anexos:[{id:'arq-xyz-def'}]});
  c.definirAtivo(false); assert.equal(c.ativo(),false); assert.equal(c.lista().length,1);
  const backup=await store.exportar(); await store.importar(backup);
  const novamente=Resumos.resolver({aba:'financeiro'},store); assert.equal(novamente.ativo(),false);
  novamente.definirAtivo(true); assert.equal(novamente.lista()[0].titulo,'Planejamento');
  assert.match(novamente.lista()[0].conteudo,/arq-abc-def/); assert.equal(novamente.lista()[0].anexos[0].id,'arq-xyz-def');
  assert.equal(novamente.lista()[0].folha.largura,'ampla'); assert.equal(store.lista('cadernos').length,1);
});
test('notas de conta e cartão ficam vinculadas ao registro correto', () => {
  const { store }=ambiente();
  store.inserir('financeiro.contas',{id:'conta-1',nome:'Reserva'});
  store.inserir('financeiro.cartoes',{id:'cartao-1',nome:'Cartão'});
  const conta=Resumos.resolver({conta:'conta-1'},store), cartao=Resumos.resolver({cartao:'cartao-1'},store);
  store.subInserir(conta.caminho,conta.id,'resumos',{id:'r',titulo:'Minha reserva'});
  assert.equal(conta.lista().length,1); assert.equal(cartao.lista().length,0);
  assert.equal(conta.href,'conta.html?tipo=conta&id=conta-1#resumos-editor');
  assert.equal(cartao.endereco('r'),'resumo.html?cartao=cartao-1&id=r');
});
test('escola e cursinho encontram modelos com editor recomendado, independente do nome da aba', () => {
  for (const [busca,id] of [['escola','estudos'],['cursinho','concursos'],['pré-vestibular','concursos']]) {
    const m=Modelos.buscar(busca).find(m=>m.id===id);
    assert.ok(m,busca); assert.equal(Resumos.recomendado({...m,nome:'Minha preparação',modeloOrigem:m.id}),true);
  }
  assert.equal(Resumos.recomendado({nome:'Cursinho',campos:[]}),false);
  assert.equal(Resumos.recomendado({nome:'Minha aba',campos:[{id:'disciplina'}]}),true);
});
