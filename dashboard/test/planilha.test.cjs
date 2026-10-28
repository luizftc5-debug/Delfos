const {test}=require('node:test');
const assert=require('node:assert/strict');
const modulo=import('../planilha.mjs');
const fflate=import('../vendor/fflate/fflate.mjs');

async function abrir(bytes){
  const {unzipSync,strFromU8}=await fflate;
  const z=unzipSync(bytes);
  return Object.fromEntries(Object.entries(z).map(([k,v])=>[k,strFromU8(v)]));
}

test('rotina vira quadro de horário de segunda a domingo, com lista e horas por tipo',async()=>{
  const {planilhaRotina}=await modulo;
  const x=await abrir(planilhaRotina([
    {titulo:'Clínica Médica',dias:[1,4],hora:'07:00',horaFim:'08:40',categoria:'aula',local:'Sala 12'},
    {titulo:'Plantão & <HGE>',dias:[6],hora:'19:00',horaFim:'07:00',categoria:'trabalho'},
  ],{hoje:'2026-10-28'}));
  assert.ok(x['[Content_Types].xml'].includes('sheet2.xml'));
  assert.match(x['xl/workbook.xml'],/name="Rotina da semana".*name="Lista"/);
  const f1=x['xl/worksheets/sheet1.xml'];
  assert.match(f1,/<t xml:space="preserve">Segunda<\/t>.*<t xml:space="preserve">Domingo<\/t>/);
  assert.ok(f1.includes('Plantão &amp; &lt;HGE&gt;'));
  assert.ok(f1.includes('<pane ySplit="4"'));
  assert.ok(f1.includes('<mergeCell ref="A1:H1"/>'));
  // 12 h de plantão (vira a noite) e 1 h 40 de aula, duas vezes (3 h 20, 3,3 h).
  assert.ok(x['xl/worksheets/sheet2.xml'].includes('<v>12</v>'));
  assert.ok(x['xl/worksheets/sheet2.xml'].includes('<v>3.3</v>'));
  assert.ok(x['xl/styles.xml'].includes('FFDCE7F4'));
});

test('mês vira calendário com o dia em negrito e lista com data de verdade',async()=>{
  const {planilhaMes,serialDaData}=await modulo;
  const x=await abrir(planilhaMes({'2026-11-03':[{titulo:'Prova',hora:'08:00',areaRotulo:'Faculdade'}]},2026,10,{hoje:'2026-10-28'}));
  assert.match(x['xl/workbook.xml'],/name="Nov 2026"/);
  assert.ok(x['xl/worksheets/sheet1.xml'].includes('<b/><sz val="11"/><color rgb="FF1F1F1F"/><rFont val="Calibri"/></rPr><t xml:space="preserve">3</t>'));
  assert.ok(x['xl/worksheets/sheet2.xml'].includes(`<v>${serialDaData('2026-11-03')}</v>`));
  assert.equal(serialDaData('2026-11-03'),46329);
  assert.ok(x['xl/styles.xml'].includes('formatCode="dd/mm/yyyy"'));
});
