const {test}=require('node:test');
const assert=require('node:assert/strict');
const contrato=import('../ia-local.modelo.mjs');
const exemplo=()=>({
  icone:'svg:alvo',cor:'#1f7a8c',especial:'',descricao:'Treinos e provas de corrida.',rotuloItem:'treino',
  naAgenda:true,checkin:false,campos:[
    {id:'distanciaKm',rotulo:'Distância (km)',tipo:'number',opcoes:[],naLista:true,obrigatorio:false},
    {id:'situacao',rotulo:'Situação',tipo:'select',opcoes:['Planejado','Feito'],naLista:true,obrigatorio:false}
  ],agruparPor:'situacao',vista:'calendario',meta:{tipo:'soma',campoId:'distanciaKm',alvo:30,periodo:'semana'}
});
test('resposta local preserva campos, agrupamento, calendário e meta personalizados',async()=>{
 const {validarResposta}=await contrato;
 const s=validarResposta(JSON.stringify(exemplo()));
 assert.equal(s.meta.campoId,'distanciaKm');assert.equal(s.visual.vista,'calendario');assert.equal(s.origem,'ia');assert.equal(s.campos.length,2);
});
test('saída local inválida ou incompatível não vira uma aba',async()=>{
 const {validarResposta}=await contrato;
 for(const alterar of [s=>s.campos[0].id='constructor',s=>s.campos[1].id='distanciaKm',s=>s.meta.campoId='naoExiste',s=>s.campos[1].opcoes=['Uma'],s=>s.vista='executarScript',s=>s.campos=Array(9).fill(s.campos[0]),s=>s.campos[0].tipo='html',s=>s.agruparPor='distanciaKm',s=>s.naAgenda=false,s=>s.checkin=true,s=>s.meta.alvo=0,s=>s.campos[0].rotulo='x'.repeat(41)]){
  const s=exemplo();alterar(s);assert.throws(()=>validarResposta(JSON.stringify(s)));
 }
 assert.throws(()=>validarResposta('{incompleto'));
 assert.throws(()=>validarResposta('x'.repeat(33000)));
});
test('o contrato retorna apenas dados reconhecidos, sem ações do modelo',async()=>{
 const {validarResposta}=await contrato;const s=exemplo();s.executar='alert(1)';s.campos[0].script='apagarDados()';
 const r=validarResposta(JSON.stringify(s));assert.ok(!('executar'in r));assert.ok(!('script'in r.campos[0]));
});
test('runtime empacotado contém os modelos WebGPU usados no worker',async()=>{
 const m=await import('../vendor/webllm/webllm.js');
 assert.equal(typeof m.CreateMLCEngine,'function');
 for(const id of ['Qwen2.5-0.5B-Instruct-q4f16_1-MLC','Qwen2.5-0.5B-Instruct-q4f32_1-MLC']) assert.ok(m.prebuiltAppConfig.model_list.some(x=>x.model_id===id));
});
