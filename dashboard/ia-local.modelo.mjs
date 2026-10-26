/* Contrato fechado: o modelo propõe dados, nunca HTML, scripts ou ações. */
export const TIPOS = ['text','textarea','date','number','dinheiro','select','simNao','estrelas','link','time'];
export const ESQUEMA_ABA = {
  type:'object', additionalProperties:false,
  required:['icone','cor','especial','descricao','rotuloItem','naAgenda','checkin','campos','agruparPor','vista','meta'],
  properties:{
    icone:{type:'string',enum:['svg:livro','svg:haltere','svg:coracao','svg:estetoscopio','svg:cruz','svg:folha','svg:carro','svg:aviao','svg:prato','svg:cafe','svg:estrela','svg:casa','svg:musica','svg:bola','svg:maleta','svg:calendario','svg:alvo','svg:cofre','svg:lampada','svg:lapis']},
    cor:{type:'string',enum:['#d6398a','#0d95b5','#b57d0a','#5a4fd4','#6e8f22','#5b6b7d','#8e5bd0','#178f6c','#1f7a8c']},
    especial:{type:'string',enum:['','academia']},
    descricao:{type:'string'}, rotuloItem:{type:'string'}, naAgenda:{type:'boolean'},checkin:{type:'boolean'},
    campos:{type:'array',maxItems:8,items:{type:'object',additionalProperties:false,
      required:['id','rotulo','tipo','opcoes','naLista','obrigatorio'],properties:{
        id:{type:'string'},rotulo:{type:'string'},tipo:{type:'string',enum:TIPOS},
        opcoes:{type:'array',maxItems:8,items:{type:'string'}},naLista:{type:'boolean'},obrigatorio:{type:'boolean'}
      }}},
    agruparPor:{type:'string'},vista:{type:'string',enum:['lista','cartoes','quadro','tabela','calendario']},
    meta:{type:'object',additionalProperties:false,required:['tipo','campoId','alvo','periodo'],properties:{
      tipo:{type:'string',enum:['nenhuma','concluidos','soma','checkins']},campoId:{type:'string'},alvo:{type:'number'},periodo:{type:'string',enum:['semana','mes','ano']}
    }}
  }
};
const reservados = new Set(['id','descricao','data','concluido','extras','feitos','criadoEm','concluidoEm','__proto__','constructor','prototype']);
const texto = (s,n) => typeof s === 'string' && s.length <= n;
export function validarResposta(raw) {
  if (typeof raw !== 'string' || raw.length > 32000) throw new Error('A estrutura gerada ficou grande demais. Tente um pedido mais objetivo.');
  let s;
  try { s=JSON.parse(raw); } catch { throw new Error('A IA não concluiu uma estrutura válida. Tente novamente ou monte manualmente.'); }
  const invalida = () => { throw new Error('A IA gerou uma estrutura incompatível. Tente novamente ou monte manualmente.'); };
  if (!s || Array.isArray(s) || !texto(s.descricao,160) || !texto(s.rotuloItem,30) || !s.rotuloItem.trim() || typeof s.naAgenda !== 'boolean' || typeof s.checkin !== 'boolean' || !Array.isArray(s.campos) || s.campos.length > 8) invalida();
  if (!ESQUEMA_ABA.properties.icone.enum.includes(s.icone) || !ESQUEMA_ABA.properties.cor.enum.includes(s.cor) || !['','academia'].includes(s.especial)) invalida();
  const ids=new Set();
  for (const c of s.campos) {
    if (!c || !texto(c.id,24) || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(c.id) || reservados.has(c.id) || ids.has(c.id) || !texto(c.rotulo,40) || !c.rotulo.trim() || !TIPOS.includes(c.tipo) || !Array.isArray(c.opcoes) || c.opcoes.length > 8 || !c.opcoes.every(o=>texto(o,40) && o.trim()) || typeof c.naLista !== 'boolean' || typeof c.obrigatorio !== 'boolean') invalida();
    if (c.tipo==='select' && new Set(c.opcoes).size<2) invalida();
    ids.add(c.id);
  }
  if (!['lista','cartoes','quadro','tabela','calendario'].includes(s.vista) || !texto(s.agruparPor,24)) invalida();
  if (s.agruparPor && !s.campos.some(c=>c.id===s.agruparPor && c.tipo==='select')) invalida();
  if (s.vista==='calendario' && !s.naAgenda) invalida();
  if (s.checkin && !['lista','cartoes'].includes(s.vista)) invalida();
  const m=s.meta;
  if (!m || !['nenhuma','concluidos','soma','checkins'].includes(m.tipo) || !texto(m.campoId,24) || !Number.isFinite(m.alvo) || m.alvo<0 || m.alvo>100000 || !['semana','mes','ano'].includes(m.periodo)) invalida();
  if (m.tipo!=='nenhuma' && !(m.alvo>0)) invalida();
  if (m.tipo==='soma' && !s.campos.some(c=>c.id===m.campoId && ['number','dinheiro'].includes(c.tipo))) invalida();
  if (m.tipo==='checkins' && !s.checkin) invalida();
  // Copia somente as propriedades de dados reconhecidas pelo painel.
  return { icone:s.icone,cor:s.cor,especial:s.especial,descricao:s.descricao,rotuloItem:s.rotuloItem,naAgenda:s.naAgenda,checkin:s.checkin,
    campos:s.campos.map(({id,rotulo,tipo,opcoes,naLista,obrigatorio})=>({id,rotulo,tipo,opcoes,naLista,obrigatorio})),
    agruparPor:s.agruparPor,visual:{vista:s.vista,ordem:'auto'},meta:{tipo:m.tipo,campoId:m.campoId,alvo:m.alvo,periodo:m.periodo},origem:'ia',exemplos:[] };
}
