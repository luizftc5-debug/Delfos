const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../plano-alimentar.js');

test('quatro refeições vazias e independentes aparecem sem gravar no cadastro', () => {
  const p = { plano: [], diario: {} }, antes = JSON.stringify(p);
  const a = P.preparar(p), b = P.preparar(p);
  assert.deepEqual(a.plano.map(r => r.nome), ['Café da manhã', 'Almoço', 'Lanche da tarde', 'Janta']);
  assert.ok(a.plano.every(r => r.itens.length === 0));
  a.plano[0].itens.push({ alimento: 'Pão' });
  assert.equal(b.plano[0].itens.length, 0); assert.equal(JSON.stringify(p), antes);
});
test('aliases de refeições existentes não criam colunas duplicadas nem perdem alimentos', () => {
  const p = { plano: [{ id: 'j', nome: 'Jantar', itens: [{ id: 'a', alimento: 'Arroz', kcal: 200 }] }, { id: 'l', nome: 'Lanche', itens: [] }] };
  const r = P.preparar(p);
  assert.equal(r.plano.length, 4); assert.equal(r.plano[0].itens[0].kcal, 200);
  assert.equal(r.plano.filter(x => P.chave(x.nome) === 'janta').length, 1);
});
test('refeição removida depois de configurar o plano não reaparece', () => {
  const plano = P.preparar({}).plano.filter(r => r.nome !== 'Almoço');
  assert.equal(P.preparar({ plano, planoDiario: 1 }).plano.length, 3);
});
test('rotinas antigas são agrupadas por refeição e preservam os valores históricos e campos originais', () => {
  const p = { modeloOrigem: 'alimentacao', itens: [
    { id: 'c', descricao: 'Meu café', extras: { refeicao: 'Café da manhã', ingredientes: 'Pão com ovo', calorias: 350, rotina: true, observacoes: 'Minha nota' }, feitos: ['2026-10-27'], registrosRotina: { '2026-10-27': { alimento: 'Pão', calorias: 200 } } },
    { id: 'f', descricao: 'Fruta', extras: { refeicao: 'Café da manhã', ingredientes: 'Mamão', calorias: 50, rotina: true }, feitos: [] },
  ] };
  const antes = JSON.stringify(p), r = P.preparar(p), cafe = r.plano[0];
  assert.equal(cafe.itens.length, 2);
  assert.equal(r.diario['2026-10-27'].registros[cafe.id].itens[0].kcal, 200);
  assert.equal(r.diario['2026-10-27'].registros[cafe.id].itens.length, 1);
  assert.deepEqual(r.diario['2026-10-27'].feitas, [cafe.id]);
  assert.equal(JSON.stringify(p), antes);
  const salvo = { ...p, ...r, planoDiario: 1 };
  assert.equal(P.preparar(salvo).plano[0].itens.length, 2);
});
test('cadastro de refeição vazia não vira um alimento inventado', () => {
  const r = P.preparar({ itens: [{ id: 'c', descricao: 'Café da Manhã', extras: { refeicao: 'Café da manhã', ingredientes: '', calorias: '', rotina: true } }] });
  assert.equal(r.plano[0].itens.length, 0);
});
test('identificadores padrão não colidem com planos existentes', () => {
  const plano = P.comPadroes([{ id: 'refeicao-cafe', nome: 'Pré-treino', itens: [] }]);
  assert.equal(new Set(plano.map(r => r.id)).size, plano.length);
});
