const { test } = require('node:test');
const assert = require('node:assert/strict');
const A = require('../acompanhamento.js');
const modelos = require('../modelos-abas.js');
const hoje = '2026-10-28';
const aba = (id, registros) => ({ ...modelos.obter(id), modeloOrigem: id, itens: registros.map(extras => ({ descricao: 'Registro', data: hoje, extras })) });

test('ritmo pondera a distância e ignora futuro, zero e campos não preenchidos', () => {
  const p = aba('corrida', [{ distanciaKm: 5, duracaoMin: 30 }, { distanciaKm: 10, duracaoMin: 50 }, { distanciaKm: 0, duracaoMin: 1 }, { distanciaKm: 4 }]);
  p.itens.push({ data: '2026-11-01', extras: { distanciaKm: 40, duracaoMin: 300 } });
  const r = A.analisar(p, hoje).indicadores;
  assert.equal(r[0].valor, 15);
  assert.equal(r[1].valor, 80 / 15);
  assert.ok(r.every(i => Number.isFinite(i.valor)));
});
test('sono atravessa meia-noite sem confundir intervalo com sono efetivo', () => {
  assert.equal(A.intervaloHoras('23:30', '07:00'), 7.5);
  for (const par of [['', '07:00'], ['25:00', '07:00'], ['07:00', '07:00']]) assert.equal(A.intervaloHoras(...par), null);
  assert.match(A.analisar(aba('sono', [{ deitar: '23:30', acordar: '07:00' }]), hoje).indicadores[0].rotulo, /Intervalo/);
});
test('custos vazios não são tratados como custo zero nem como lucro', () => {
  assert.equal(A.analisar(aba('taxi', [{ receita: 300, combustivel: 80 }]), hoje).indicadores.length, 0);
  const r = A.analisar(aba('taxi', [{ receita: 300, combustivel: 80, outrosCustos: 0, horasTrabalhadas: 4 }]), hoje).indicadores;
  assert.equal(r[0].valor, 220); assert.equal(r[1].valor, 55);
});
test('questões incompletas não entram na taxa e acertos impossíveis pedem correção', () => {
  const p = aba('concursos', [{ questoes: 10, acertos: 8 }, { questoes: 90 }]);
  assert.equal(A.analisar(p, hoje).indicadores[0].valor, 80);
  assert.equal(A.validar(p, { questoes: 10, acertos: 11 }).campo, 'acertos');
  assert.equal(A.validar(p, { questoes: 10, acertos: 0 }), null);
});
test('alimentos antigos conservam ids, campos personalizados e dados; apresentação não grava', () => {
  const p = { modeloOrigem: 'alimentacao', campos: [{ id: 'ingredientes', rotulo: 'Ingredientes', tipo: 'textarea' }, { id: 'meuCampo', rotulo: 'Meu campo', tipo: 'text' }], itens: [{ extras: { ingredientes: 'Mamão', meuCampo: 'Fresco' } }] };
  const antes = JSON.stringify(p);
  const campos = A.camposAlimentacao(p);
  assert.equal(campos[0].id, 'ingredientes'); assert.equal(campos[0].rotulo, 'Alimento');
  assert.ok(campos.some(c => c.id === 'calorias')); assert.ok(campos.some(c => c.id === 'rotina'));
  assert.ok(campos.some(c => c.id === 'meuCampo'));
  assert.equal(JSON.stringify(p), antes);
});
test('cada modelo tem orientação útil e devolve dados finitos sem modificar o cadastro', () => {
  for (const m of modelos.listar()) {
    assert.ok(m.orientacao.length > 30, m.nome);
    const p = { ...m, modeloOrigem: m.id, itens: [{ descricao: 'Teste', data: hoje, extras: {} }] };
    const antes = JSON.stringify(p);
    const resultado = A.analisar(p, hoje);
    assert.ok(resultado.indicadores.every(i => Number.isFinite(i.valor)), m.nome);
    assert.equal(JSON.stringify(p), antes);
  }
});
test('calorias desconhecidas ou zero em um check não são substituídas por edições posteriores', () => {
  const item = { descricao: 'Café', extras: { ingredientes: 'Mamão', calorias: 300 }, registrosRotina: { '2026-10-26': { alimento: 'Uva', calorias: null }, '2026-10-27': { alimento: 'Água', calorias: 0 } } };
  assert.equal(A.registroAlimentar(item, '2026-10-26').calorias, null);
  assert.equal(A.registroAlimentar(item, '2026-10-27').calorias, 0);
  assert.equal(A.registroAlimentar(item, '2026-10-28').calorias, 300);
});
