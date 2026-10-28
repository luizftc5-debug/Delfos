const {test}=require('node:test');
const assert=require('node:assert/strict');
const modulo=import('../agenda-arquivo.mjs');
// Data fixa: as datas sem ano dependem de "hoje".
const o={hoje:'2026-10-27'};
const resumo=x=>[x.titulo,x.data||x.dias.join(','),x.hora,x.horaFim,x.local||''].join('|');

test('texto corrido: data no cabeçalho do dia, horários embaixo, rotina por dia da semana',async()=>{
  const {analisarLinhas}=await modulo;
  const r=analisarLinhas([
    'Agenda de novembro',
    'Segunda, 3 de novembro',
    '08:00 Anatomia - prova',
    '14h às 16h Consulta dermatologista',
    '05/11 Plantão UPA 19h',
    '10/11 e 12/11: Seminário de farmacologia',
    '15 Aniversário da vó',
    'Quarta-feira 14:00 - 15:40 Fisiologia',
    'Terça',
    '07:00 Academia',
    'Seg a sex 18h Inglês',
  ],o);
  assert.deepEqual(r.eventos.map(resumo),[
    'Anatomia - prova|2026-11-03|08:00||',
    'Consulta dermatologista|2026-11-03|14:00|16:00|',
    'Plantão UPA|2026-11-05|19:00||',
    'Seminário de farmacologia|2026-11-10|||',
    'Seminário de farmacologia|2026-11-12|||',
    'Aniversário da vó|2026-11-15|||',
  ]);
  assert.deepEqual(r.rotina.map(resumo),['Fisiologia|3|14:00|15:40|','Academia|2|07:00||','Inglês|1,2,3,4,5|18:00||']);
});

test('um horário no começo da linha nunca vira dia do mês; "1 hora" também não',async()=>{
  const {analisarLinhas}=await modulo;
  const r=analisarLinhas(['Novembro 2026','08:00 Aula de anatomia','1 hora de leitura','20 Prova'],o);
  assert.deepEqual(r.eventos.map(resumo),['Prova|2026-11-20|||']);
});

test('data sem ano que já passou há mais de dois meses é do ano seguinte',async()=>{
  const {datasEm}=await modulo;
  assert.equal(datasEm('15/01 Volta às aulas',{ano:2026,hoje:'2026-10-27'})[0].data,'2027-01-15');
  assert.equal(datasEm('15/10 Prova',{ano:2026,hoje:'2026-10-27'})[0].data,'2026-10-15');
  assert.equal(datasEm('3 de março de 2027',{ano:2026,hoje:'2026-10-27'})[0].data,'2027-03-03');
});

test('grade de horário: dias no cabeçalho, horário na primeira coluna, aulas seguidas juntas e sala embaixo',async()=>{
  const {analisarTabela}=await modulo;
  const r=analisarTabela([
    ['Horário','Segunda','Terça','Quarta','Quinta','Sexta'],
    ['07:00 - 07:50','Anatomia','Fisiologia','','Anatomia','Bioquímica'],
    ['07:50 - 08:40','Anatomia','Fisiologia','Histologia','Anatomia',''],
    ['','Sala 12','Lab 3','','',''],
    ['13:30-15:10','','Semiologia','','Semiologia','—'],
  ],o);
  assert.deepEqual(r.rotina.map(resumo),[
    'Anatomia|1|07:00|08:40|Sala 12','Fisiologia|2|07:00|08:40|Lab 3','Semiologia|2|13:30|15:10|',
    'Histologia|3|07:50|08:40|','Anatomia|4|07:00|08:40|','Semiologia|4|13:30|15:10|','Bioquímica|5|07:00|07:50|',
  ]);
  assert.equal(r.eventos.length,0);
});

test('grade de mês: o número do dia e o que vem embaixo dele, ignorando os dias do mês anterior',async()=>{
  const {analisarTabela,trocarMesDaGrade}=await modulo;
  const r=analisarTabela([
    ['Novembro 2026'],
    ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
    ['26','27','28','29','30','31','1'],
    ['Reunião','','','','','','Feriado'],
    ['2','3','4 Prova anatomia','5','6','7','8'],
    ['','Consulta 14h','','','Plantão','',''],
  ],o);
  assert.deepEqual(r.eventos.map(resumo),['Feriado|2026-11-01|||','Consulta|2026-11-03|14:00||','Prova anatomia|2026-11-04|||','Plantão|2026-11-06|||']);
  assert.deepEqual(r.mesGrade,{mes:11,ano:2026,inferido:false});
  assert.equal(trocarMesDaGrade(r.eventos,2026,12)[0].data,'2026-12-01');
});

test('grade de mês sem o nome do mês: usa o mês atual e avisa para conferir',async()=>{
  const {analisarTabela}=await modulo;
  const r=analisarTabela([['Seg','Ter','Qua','Qui','Sex'],['1','2','3','4','5'],['','Prova','','',''],['8','9','10','11','12']],o);
  assert.equal(r.mesGrade.inferido,true);
  assert.equal(r.eventos[0].data,'2026-10-02');
  assert.match(r.avisos[0],/Escolha o mês/);
});

test('CSV exportado do Google Agenda (mês/dia, dia inteiro) e planilha em português',async()=>{
  const {analisarTabela,lerCSV}=await modulo;
  const g=analisarTabela(lerCSV('Subject,Start Date,Start Time,End Date,End Time,All Day Event,Description,Location\n"Dentista",11/05/2026,2:00 PM,11/05/2026,3:00 PM,False,,"Clínica Sorriso, sala 2"\nAniversário,11/20/2026,,11/20/2026,,True,,\n'),o);
  assert.deepEqual(g.eventos.map(resumo),['Dentista|2026-11-05|14:00|15:00|Clínica Sorriso, sala 2','Aniversário|2026-11-20|||']);
  const p=analisarTabela(lerCSV('Data;Hora;Compromisso;Local\n03/11/2026;08:00;Prova de Anatomia;Sala 4\n04/11;;Entrega relatório;\n'),o);
  assert.deepEqual(p.eventos.map(resumo),['Prova de Anatomia|2026-11-03|08:00||Sala 4','Entrega relatório|2026-11-04|||']);
});

test('planilha com dia da semana vira rotina; número de série e fração de dia do Excel viram data e hora',async()=>{
  const {analisarTabela,lerCSV}=await modulo;
  const r=analisarTabela(lerCSV('Dia da semana;Início;Fim;Atividade\nSegunda;07:00;08:40;Anatomia\nSeg e qua;18:00;19:00;Academia\n'),o);
  assert.deepEqual(r.rotina.map(resumo),['Anatomia|1|07:00|08:40|','Academia|1,3|18:00|19:00|']);
  const x=analisarTabela([['Data','Hora','Evento'],['46331','0.5833333','Reunião TCC']],o);
  assert.deepEqual(x.eventos.map(resumo),['Reunião TCC|2026-11-05|14:00||']);
});

test('palavras com posição (PDF ou foto): cada palavra vai para a coluna do dia mais próximo',async()=>{
  const {analisarPosicionado}=await modulo;
  const p=(texto,x0,x1,y)=>({texto,x0,x1,y0:y,y1:y+10});
  const r=analisarPosicionado([
    p('Seg',100,130,10),p('Ter',200,230,10),p('Qua',300,330,10),p('Qui',400,430,10),p('Sex',500,530,11),
    p('08:00',10,50,40),p('Anatomia',90,150,40),p('Patologia',390,450,41),
    p('10:00',10,50,70),p('Saúde',190,220,70),p('Coletiva',224,260,70),
  ],o);
  assert.deepEqual(r.rotina.map(resumo),['Anatomia|1|08:00||','Saúde Coletiva|2|10:00||','Patologia|4|08:00||']);
});

test('dias da semana, horários e títulos',async()=>{
  const {diasCitados,diaDaSemana,horasEm,tituloDe}=await modulo;
  assert.deepEqual(diasCitados('Seg a sex'),[1,2,3,4,5]);
  assert.deepEqual(diasCitados('sexta e sábado'),[5,6]);
  assert.deepEqual(diasCitados('Quarta-feira'),[3]);
  assert.deepEqual(diasCitados('segue o plano'),[]);
  assert.equal(diaDaSemana('5ª'),4);
  assert.equal(diaDaSemana('Domingo'),0);
  assert.deepEqual(horasEm('das 8 às 10'),{hora:'08:00',horaFim:'10:00'});
  assert.deepEqual(horasEm('2:30 PM'),{hora:'14:30',horaFim:''});
  assert.deepEqual(horasEm('Prova 1: 15/04'),{hora:'',horaFim:''});
  assert.equal(tituloDe('Quinta, 14h às 15h30 - Reunião do TCC'),'Reunião do TCC');
  assert.equal(tituloDe('3 de março: Volta às aulas'),'Volta às aulas');
});

test('arquivo sem nada reconhecível avisa em vez de inventar',async()=>{
  const {analisarLinhas}=await modulo;
  const r=analisarLinhas(['Bibliografia básica','Robbins, Patologia'],o);
  assert.equal(r.eventos.length+r.rotina.length,0);
  assert.match(r.avisos[0],/Não encontrei/);
});

test('quadro de horário em PDF com célula quebrada em linhas e centralizada na altura',async()=>{
  const {analisarPosicionado}=await modulo;
  const p=(texto,x0,y)=>({texto,x0,x1:x0+texto.length*6,y0:y,y1:y+10});
  // Como o pdf.js entrega: "07:00 -" e "08:40" em linhas separadas, o nome em
  // duas linhas e a célula de uma linha só no meio delas.
  const r=analisarPosicionado([
    p('Horário',10,10),p('Segunda',100,10),p('Terça',200,10),p('Quarta',300,10),
    p('07:00',10,40),p('-',45,40),p('Clínica',100,40),
    p('Pediatria',200,52),
    p('08:40',10,64),p('Médica',100,64),
    p('08:50',10,90),p('-',45,90),p('Sala',300,90),p('3',330,90),
    p('Patologia',300,102),
    p('10:30',10,114),
  ],o);
  assert.deepEqual(r.rotina.map(resumo),['Clínica Médica|1|07:00|08:40|','Pediatria|2|07:00|08:40|','Patologia|3|08:50|10:30|Sala 3']);
});
