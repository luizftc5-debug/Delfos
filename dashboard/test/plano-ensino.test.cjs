const {test}=require('node:test');
const assert=require('node:assert/strict');
const modelo=import('../plano-ensino.modelo.mjs');
const texto=`Período letivo: 26/10/2026 a 31/10/2026
Aulas: segunda e quarta, das 08h às 10h
Ementa:
Introdução à clínica
Semiologia
Avaliações
Prova 1: 29/10/2026 às 08h30
Entrega de trabalho: 30/10/2026
Bibliografia
Teste de ensino. Editora 2020.`;
test('plano separa assuntos, horários semanais, provas e entregas; ignora bibliografia',async()=>{
  const {analisarDocumentos,expandirAulas}=await modelo;
  const r=analisarDocumentos([{nome:'Plano.docx',texto}]);
  assert.deepEqual(r.assuntos.map(x=>x.texto),['Introdução à clínica','Semiologia']);
  assert.equal(r.avaliacoes.length,1);assert.equal(r.avaliacoes[0].nome,'Prova 1');assert.equal(r.avaliacoes[0].hora,'08:30');
  assert.equal(r.prazos[0].data,'2026-10-30');
  const aulas=expandirAulas(r.aulas,r.inicio,r.fim);
  assert.deepEqual(aulas.map(x=>x.data),['2026-10-26','2026-10-28']);
  assert.ok(aulas.every(x=>x.hora==='08:00' && x.horaFim==='10:00'));
});
test('datas por extenso, sem ano e incompletas continuam revisáveis',async()=>{
  const {analisarDocumentos}=await modelo;
  const r=analisarDocumentos([{nome:'Edital.pdf',texto:'Prova final: 15 de novembro de 2026 às 14:00\nProva 2: 20/12\nProva 3: 31/02/2026'}],{ano:2027});
  assert.equal(r.avaliacoes[0].data,'2026-11-15');
  assert.equal(r.avaliacoes[1].data,'2027-12-20');
  assert.equal(r.avaliacoes[2].data,'');
  assert.ok(r.avisos.length);
});
test('repetições só expandem em período válido, com início e fim de horário coerentes',async()=>{
  const {expandirAulas}=await modelo;
  const aula={nome:'Aula',diaSemana:1,hora:'08:00',horaFim:'10:00'};
  assert.throws(()=>expandirAulas([aula],'',''));
  assert.throws(()=>expandirAulas([aula],'2026-01-01','2028-01-01'));
  assert.throws(()=>expandirAulas([{...aula,horaFim:'07:00'}],'2026-10-26','2026-10-31'));
  assert.throws(()=>expandirAulas([{...aula,diaSemana:9}],'2026-10-26','2026-10-31'));
});
test('aula com assunto datado prevalece sobre ocorrência genérica do mesmo horário',async()=>{
  const {analisarDocumentos,expandirAulas}=await modelo;
  const r=analisarDocumentos([{nome:'Plano',texto:texto+'\nCronograma\n28/10/2026 | Aula: Semiologia'}]);
  const aulas=expandirAulas(r.aulas,r.inicio,r.fim);
  assert.equal(aulas.length,2);assert.ok(aulas.some(x=>x.nome.includes('Semiologia') && x.hora==='08:00'));
});
test('horários diferentes na mesma linha e dias sem aula mantêm o calendário coerente',async()=>{
  const {analisarDocumentos,expandirAulas}=await modelo;
  const r=analisarDocumentos([{nome:'Cronograma',texto:'Cronograma\nPeríodo letivo: 26/10/2026 a 06/11/2026\nAulas: segunda 08h às 10h; quarta 14h às 16h\n02/11/2026: Feriado\nRecesso: 04/11/2026 a 06/11/2026'}]);
  assert.deepEqual(r.aulas.map(x=>x.hora),['08:00','14:00']);
  const aulas=expandirAulas(r.aulas,r.inicio,r.fim,r.excecoes);
  assert.deepEqual(aulas.map(x=>x.data),['2026-10-26','2026-10-28']);
  assert.ok(!r.aulas.some(x=>x.nome.includes('Período')));
});
