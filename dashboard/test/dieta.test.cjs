const {test}=require('node:test');
const assert=require('node:assert/strict');
const modulo=import('../dieta.mjs');
const linha=i=>[i.alimento,i.quantidade,i.kcal,i.estimado?'est':''].join('|');

test('dieta em texto: refeições com horário, alimentos, substituição e meta do dia',async()=>{
  const {analisarDietaLinhas}=await modulo;
  const r=analisarDietaLinhas([
    'Paciente: Luiz','Nutricionista: Dra. Ana CRN 1234',
    'CAFÉ DA MANHÃ - 07:00','- 2 fatias de pão integral','- 2 ovos mexidos','- 1 banana prata','ou 1 maçã','- 200 ml de leite desnatado',
    'ALMOÇO (12h30)','• Arroz integral 120g','• Peito de frango grelhado 150g','• Salada à vontade',
    'Lanche da tarde','Iogurte natural 170g + 30g de aveia',
    'Jantar 20:00','Tapioca 60g com 2 ovos',
    'Ceia','Castanha do pará 3 unidades - 90 kcal',
    'Total: 2000 kcal',
  ]);
  assert.deepEqual(r.refeicoes.map(x=>`${x.nome} ${x.hora}`.trim()),['Café da manhã 07:00','Almoço 12:30','Lanche da tarde','Jantar 20:00','Ceia']);
  assert.deepEqual(r.refeicoes[0].itens.map(linha),['Pão integral|2 fatias|127|est','Ovos mexidos|2 ovos|146|est','Banana prata|1 banana|69|est','Leite desnatado|200 ml|70|est']);
  assert.equal(r.refeicoes[0].itens[2].substituicoes,'1 maçã');
  assert.deepEqual(r.refeicoes[1].itens.map(linha),['Arroz integral|120g|149|est','Peito de frango grelhado|150g|239|est','Salada à vontade|||']);
  assert.deepEqual(r.refeicoes[2].itens.map(i=>i.alimento),['Iogurte natural','Aveia']);
  assert.deepEqual(r.refeicoes[3].itens.map(linha),['Tapioca|60g|144|est','Ovos|2 ovos|146|est']);
  assert.deepEqual(r.refeicoes[4].itens.map(linha),['Castanha do pará|3 unidades|90|']);
  assert.equal(r.metaKcal,2000);
  assert.ok(r.avisos.some(a=>/sem calorias/.test(a)));
});

test('dieta em planilha: cabeçalho reconhecido, kcal do arquivo respeitada e as que faltam estimadas',async()=>{
  const {analisarDietaTabela}=await modulo;
  const r=analisarDietaTabela([['Refeição','Alimento','Quantidade','Kcal','Proteína'],['Café da manhã','Pão francês','1 unidade','150','4'],['','Café com leite','200 ml','',''],['Almoço','Arroz','150 g','',''],['Almoço','Patinho grelhado','120 g','','']]);
  assert.deepEqual(r.refeicoes.map(x=>x.nome),['Café da manhã','Almoço']);
  assert.deepEqual(r.refeicoes[0].itens.map(linha),['Pão francês|1 unidade|150|','Café com leite|200 ml|122|est']);
  assert.deepEqual(r.refeicoes[1].itens.map(i=>i.kcal),[192,263]);
});

test('estimativa só com base: gramas, ml ou unidade conhecida; sem base, fica sem kcal',async()=>{
  const {estimar,itemDeTexto}=await modulo;
  assert.equal(estimar('ovos',{unidades:2,medida:'unidade'}).kcal,146);
  assert.equal(estimar('arroz','100 g').kcal,128);
  assert.equal(itemDeTexto('meia xícara de leite').kcal,73);
  assert.equal(itemDeTexto('1 colher de sopa de azeite').kcal,115);
  assert.equal(itemDeTexto('1 xícara de arroz').kcal,null); // xícara de sólido: sem base segura
  assert.equal(itemDeTexto('uma coxinha').kcal,null);       // fora da tabela
  assert.equal(itemDeTexto('1 pão francês').quantidade,'1 pão');
});

test('correção do OCR só troca palavra desconhecida por conhecida',async()=>{
  const {corrigirOCR}=await modulo;
  assert.equal(corrigirOCR('Arroz integral 1209'),'Arroz integral 120g');
  assert.equal(corrigirOCR('Logurte natural 1709'),'Iogurte natural 170g');
  assert.equal(corrigirOCR('E 2 0vos'),'2 ovos');
  assert.equal(corrigirOCR('« 2 fatias de pão'),'2 fatias de pão');
  assert.equal(corrigirOCR('Feijão 100g'),'Feijão 100g');
  assert.equal(corrigirOCR('Lasanha 2019'),'Lasanha 2019'); // ano não vira gramas
});

test('somas e distribuição de macros (4/4/9 kcal por grama)',async()=>{
  const {somar,distribuicao}=await modulo;
  const t=somar([{kcal:100,proteina:10,carbo:10,gordura:2},{kcal:null}]);
  assert.deepEqual(t,{kcal:100,proteina:10,carbo:10,gordura:2,incompletos:1});
  assert.deepEqual(distribuicao({proteina:25,carbo:50,gordura:10}),{proteina:26,carbo:51,gordura:23});
});
