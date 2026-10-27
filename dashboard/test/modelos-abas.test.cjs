const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const catalogo=require('../modelos-abas.js');

function contratosDoPainel() {
  const contexto=vm.createContext({});
  for(const arq of ['data.js','store.js'])vm.runInContext(readFileSync(path.join(__dirname,'..',arq),'utf8'),contexto);
  const tipos=vm.runInContext('Store.TIPOS_CAMPO.map(t=>t.valor)',contexto);
  const cores=vm.runInContext('Store.PALETA_PILAR.map(c=>c.valor)',contexto);
  const ui=readFileSync(path.join(__dirname,'..','ui.js'),'utf8');
  const icones=JSON.parse(ui.match(/const ICONES_ABA = (\[[\s\S]*?\]);/)[1]);
  return {tipos,cores,icones};
}
test('32 modelos distintos respeitam os recursos e limites reais do painel',()=>{
  const modelos=catalogo.listar();const {tipos,cores,icones}=contratosDoPainel();
  assert.equal(modelos.length,32);
  assert.equal(new Set(modelos.map(m=>m.id)).size,32);assert.equal(new Set(modelos.map(m=>m.nome)).size,32);
  const categorias=new Set(catalogo.categorias().map(c=>c.id));
  for(const m of modelos) {
    assert.ok(categorias.has(m.categoria),m.nome);
    assert.ok(icones.includes(m.icone.slice(4)),m.nome);assert.ok(cores.includes(m.cor),m.nome);
    assert.ok(m.nome.length<=40 && m.descricao.length<=160 && m.proposito.length<=2000,m.nome);
    assert.ok(m.campos.length>=4 && m.campos.length<=8,m.nome);
    assert.equal(new Set(m.campos.map(c=>c.id)).size,m.campos.length,m.nome);
    for(const c of m.campos) {
      assert.match(c.id,/^[a-zA-Z][a-zA-Z0-9_]{0,23}$/);
      assert.ok(!['descricao','data','id','concluido','extras','constructor','prototype','__proto__'].includes(c.id));
      assert.ok(tipos.includes(c.tipo),`${m.nome}: ${c.rotulo}`);assert.ok(c.rotulo.length<=40);
      if(c.tipo==='select')assert.ok(c.opcoes.length>=2 && c.opcoes.length<=8 && new Set(c.opcoes).size===c.opcoes.length && c.opcoes.every(x=>x.length<=40));
    }
    if(m.agruparPor)assert.ok(m.campos.some(c=>c.id===m.agruparPor && c.tipo==='select'),m.nome);
    if(m.visual.vista==='calendario')assert.equal(m.naAgenda,true,m.nome);
    if(m.checkin)assert.ok(['lista','cartoes'].includes(m.visual.vista),m.nome);
    assert.equal(m.meta.tipo,'nenhuma');assert.deepEqual(m.exemplos,[]);
  }
});
test('profissões são encontradas por nomes e marcas sem acento ou correspondência com gastos pessoais',()=>{
  for(const [consulta,id] of [['Uber','motorista-app'],['taxista','taxi'],['MEDICO','medicina'],['engenheiro','engenharia'],['trabalho engenheiro','engenharia'],['advogado','advocacia'],['autônomo','autonomo'],['jiu jitsu','jiu-jitsu'],['familiares','familia'],['TCC','tcc'],['pesquisa cientifica','pesquisa-cientifica']]) {
    assert.ok(catalogo.buscar(consulta).some(m=>m.id===id),consulta);
  }
  assert.deepEqual(catalogo.buscar('Uber','estudos'),[]);
  assert.deepEqual(catalogo.buscar('inexistente qxz'),[]);
});
test('editar uma cópia não altera o modelo nem outras abas criadas dele',()=>{
  const corrida=catalogo.obter('corrida');
  corrida.campos[0].rotulo='Meu campo';corrida.campos.pop();corrida.visual.vista='lista';
  const original=catalogo.obter('corrida');
  assert.equal(original.campos[0].rotulo,'Distância (km)');assert.equal(original.campos.length,5);assert.equal(original.visual.vista,'tabela');
  assert.equal(catalogo.obter('nao-existe'),null);
});
test('estudos e planejamento semanal são encontrados sem duplicar Saúde e Casa',()=>{
  for(const [consulta,id] of [['sessões de estudo','estudos'],['revisao','estudos'],['matéria','estudos'],['agenda semanal','planejamento-semanal'],['organizar semana','planejamento-semanal'],['saude','saude-cuidados'],['casa','casa']]) {
    assert.ok(catalogo.buscar(consulta).some(m=>m.id===id),consulta);
  }
  assert.deepEqual(catalogo.buscar('agenda semanal','estudos'),[]);
  for(const id of ['estudos','planejamento-semanal']) {
    const antes=catalogo.obter(id);
    const editado=catalogo.obter(id);
    editado.campos.find(c=>c.tipo==='select').opcoes.push('Minha opção');
    editado.meta.alvo=42;
    editado.visual.vista='lista';
    assert.deepEqual(catalogo.obter(id),antes,`${id}: os ajustes de uma aba não alteram o catálogo`);
  }
  for(const id of ['saude-cuidados','casa'])assert.equal(catalogo.listar().filter(m=>m.id===id).length,1);
});
