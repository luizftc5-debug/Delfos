/* Execute com Playwright disponível; DELFOS_BROWSER_PATH seleciona um Chromium instalado. */
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.DELFOS_PLAYWRIGHT || 'playwright');
const modelos = require('../modelos-abas.js');
const raiz = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const arquivo = path.resolve(raiz, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!arquivo.startsWith(raiz + path.sep)) { res.writeHead(403); res.end(); return; }
  const tipo = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }[path.extname(arquivo)];
  fs.stat(arquivo, (erro, stat) => {
    if (erro || !stat.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': tipo || 'application/octet-stream' }); fs.createReadStream(arquivo).pipe(res);
  });
});
const existe = async locator => assert.ok(await locator.isVisible(), await locator.toString());
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.DELFOS_BROWSER_PATH ? { executablePath: process.env.DELFOS_BROWSER_PATH } : {}), args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    const page = await ctx.newPage(), erros = [];
    page.setDefaultTimeout(10000);
    page.on('pageerror', e => erros.push(e.message));
    const conferirLargura = async nome => {
      // O produto mantém as transições completas: mede o layout final, sem
      // confundir um quadro intermediário da animação com seu tamanho final.
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || !Number.isFinite(a.effect?.getComputedTiming().endTime)), null, { timeout: 5000 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)) {
        const medidas = await page.evaluate(() => ({ largura: innerWidth, excesso: document.documentElement.scrollWidth, elementos: [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => ({ tag: e.tagName, classe: e.className, texto: e.textContent.slice(0, 60), direita: e.getBoundingClientRect().right })).slice(0, 15) }));
        console.error({ nome, ...medidas });
        if (process.env.DELFOS_QA_DIR) { fs.mkdirSync(process.env.DELFOS_QA_DIR, { recursive: true }); await page.screenshot({ path: path.join(process.env.DELFOS_QA_DIR, 'excesso.png'), fullPage: true }); }
        assert.fail(`Excesso de largura: ${nome}`);
      }
    };
    await page.goto(base + '/bemvindo.html');
    await page.evaluate(() => { Personalizacao.pular(); Store.definirPreferencias({ experiencia: { lembretes: { resumoDoDia: false } } }); });
    const hoje = await page.evaluate(() => UI.hojeISO()), ontem = await page.evaluate(() => UI.isoMaisDias(-1));
    const salvarForm = async () => { await page.locator('.modal.formulario [data-acao="confirmar"]').click(); await page.locator('.modal.formulario').waitFor({ state: 'detached' }); };
    const inserir = async p => page.evaluate(p => Store.inserir('pilares', p).id, p);
    const abrir = async id => page.goto(`${base}/pilar.html?id=${id}`);

    // O modelo da imagem: campos antigos, data preservada e check independente por dia.
    const legado = await inserir({ nome: 'Minhas refeições', modelo: 'personalizado', modeloOrigem: 'alimentacao', rotuloItem: 'refeição', naAgenda: true, campos: modelos.obter('alimentacao').campos.filter(c => !['calorias', 'rotina'].includes(c.id)).map(c => c.id === 'ingredientes' ? { ...c, rotulo: 'Ingredientes' } : c), itens: [] });
    await abrir(legado);
    await page.getByRole('button', { name: 'Abrir o formulário completo', exact: true }).click();
    await page.getByLabel('Nome', { exact: true }).fill('Café da manhã');
    await page.locator('.modal [name="data"]').fill(ontem);
    await page.getByLabel('Alimento', { exact: true }).fill('Pão com ovo, mamão e uva');
    await page.getByLabel('Calorias (kcal)', { exact: true }).fill('350');
    await page.getByLabel('Alimentação de rotina', { exact: true }).check();
    await salvarForm();
    await page.locator('[data-rotina]').check();
    assert.match(await page.locator('#rotina-alimentar').innerText(), /350 kcal/);
    await page.locator('#rotina-data').fill(ontem);
    assert.equal(await page.locator('[data-rotina]').isChecked(), false);
    await page.locator('[data-rotina]').check();
    await page.reload();
    assert.equal(await page.locator('[data-rotina]').isChecked(), true);
    const registro = await page.evaluate(id => Store.achar('pilares', id).itens[0], legado);
    assert.deepEqual(registro.feitos, [ontem, hoje]);
    assert.equal(registro.data, ontem); assert.equal(registro.extras.ingredientes, 'Pão com ovo, mamão e uva');
    assert.equal(await page.evaluate(id => UI.compromissos().filter(c => c.area === `pilar:${id}`).length, legado), 0);
    await page.locator('#lista li').first().hover();
    await page.locator('#lista [data-editar]').first().click();
    await page.getByLabel('Calorias (kcal)', { exact: true }).fill('450'); await salvarForm();
    assert.match(await page.locator('#rotina-alimentar').innerText(), /350 kcal/);
    await page.locator('[data-rotina]').uncheck(); await page.locator('[data-rotina]').check();
    assert.match(await page.locator('#rotina-alimentar').innerText(), /450 kcal/);
    await page.locator('details.filtros-opcoes summary').click();
    await page.locator('#f-periodo').selectOption('hoje');
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    assert.equal(await page.locator('#f-periodo').inputValue(), 'todos');
    await page.locator('[data-secao="ajustes"]').click(); await page.locator('#btn-campos').click();
    assert.match(await page.locator('.modal').innerText(), /Alimento/); assert.doesNotMatch(await page.locator('.modal').innerText(), /Ingredientes/);
    await page.locator('.modal [data-acao="fechar"]').click();
    console.log('OK: modelo antigo, alimento, calorias, data, checks, persistência e histórico.');

    // Tela própria: rotina completa em um cadastro, registro pontual e histórico congelado.
    const dedicado = await inserir({ nome: 'Diário alimentar', modelo: 'alimentacao', rotuloItem: 'refeição', naAgenda: false, campos: [], itens: [], plano: [], diario: {} });
    await abrir(dedicado);
    await page.locator('[data-ali="refeicao"]').click();
    await page.getByLabel('Refeição', { exact: true }).fill('Café da manhã');
    await page.getByLabel('Alimento', { exact: true }).fill('Pão com ovo e mamão');
    await page.getByLabel('Calorias (kcal)', { exact: true }).fill('400');
    await page.locator('[name="inicio"]').fill(ontem);
    await salvarForm();
    await page.locator('[data-ali="hoje"]').click();
    await page.locator('[data-comi]').check();
    assert.equal((await page.locator('.ali-kcal .voz').innerText()).trim(), '400');
    await page.locator('#ali-data').fill(ontem);
    assert.equal(await page.locator('[data-comi]').isChecked(), false);
    await page.locator('[data-comi]').check();
    await page.locator('[data-ali="editar-item"]').click();
    await page.getByLabel('Calorias (kcal)', { exact: true }).fill('500'); await salvarForm();
    assert.equal((await page.locator('.ali-kcal .voz').innerText()).trim(), '400');
    await page.locator('[data-ali="hoje"]').click();
    assert.equal((await page.locator('.ali-kcal .voz').innerText()).trim(), '400');
    await page.locator('[data-comi]').uncheck(); await page.locator('[data-comi]').check();
    assert.equal((await page.locator('.ali-kcal .voz').innerText()).trim(), '500');
    await page.locator('#ali-extra-nome').fill('Uva'); await page.locator('#ali-extra-kcal').fill('70');
    await page.locator('[data-extra] button').click();
    assert.equal((await page.locator('.ali-kcal .voz').innerText()).trim(), '570');
    await page.locator('[data-ali="editar-extra"]').click();
    await page.locator('.modal [name="data"]').fill(ontem); await salvarForm();
    assert.equal((await page.locator('.ali-kcal .voz').innerText()).trim(), '500');
    await page.locator('#ali-data').fill(ontem);
    assert.equal((await page.locator('.ali-kcal .voz').innerText()).trim(), '470');
    await page.locator('[data-ali="editar-refeicao"]').click();
    await page.locator('[data-acao="excluir"]').click();
    await page.locator('.modal.formulario').waitFor({ state: 'detached' });
    assert.equal((await page.locator('.ali-kcal .voz').innerText()).trim(), '470');
    await existe(page.getByRole('heading', { name: 'Refeições do histórico' }));
    await page.locator('[data-ali="refeicao"]').click();
    await page.getByLabel('Refeição', { exact: true }).fill('Lanche');
    await page.getByLabel('Alimento', { exact: true }).fill('Uva');
    await page.getByLabel('Calorias (kcal)', { exact: true }).fill('60');
    await page.getByLabel('Alimentação de rotina', { exact: true }).uncheck();
    await page.locator('[name="inicio"]').fill(hoje); await salvarForm();
    assert.equal((await page.locator('.ali-kcal .voz').innerText()).trim(), '560');
    assert.equal(await page.evaluate(id => Store.achar('pilares', id).plano.length, dedicado), 0);
    console.log('OK: diário com data, cadastro da rotina, edição, calorias congeladas e exclusão preservando histórico.');

    const corridaAntiga = modelos.obter('corrida');
    const antigos = corridaAntiga.campos.filter(c => c.id !== 'esforco').map(c => c.id === 'distanciaKm' ? { ...c, rotulo: 'Minha distância' } : c);
    const existente = await inserir({ ...corridaAntiga, modeloOrigem: 'corrida', nome: 'Corrida antiga', campos: antigos, itens: [{ id: 'manual', descricao: 'Meu treino', data: hoje, extras: { distanciaKm: 5, duracaoMin: 30 } }] });
    await abrir(existente);
    assert.equal(await page.evaluate(id => Store.achar('pilares', id).campos.length, existente), antigos.length);
    await page.locator('[data-secao="ajustes"]').click(); await page.locator('#btn-atualizar-modelo').click();
    const atualizada = await page.evaluate(id => Store.achar('pilares', id), existente);
    assert.equal(atualizada.campos[0].rotulo, 'Minha distância'); assert.ok(atualizada.campos.some(c => c.id === 'esforco'));
    assert.deepEqual(atualizada.itens[0].extras, { distanciaKm: 5, duracaoMin: 30 });
    await page.locator('#btn-editar-aba').click();
    await page.locator('.modal.criacao').waitFor();
    await page.locator('[data-acao="cancelar"]').click();
    console.log('OK: atualização opcional de modelo antigo preserva nomes, ajustes e registros.');

    // Modelos essenciais mantêm seus fluxos próprios e os campos novos são opcionais.
    for (const nome of ['Trabalho', 'Saúde', 'Academia', 'Alimentação', 'Esporte', 'Religião', 'Leituras', 'Aba livre']) {
      await page.goto(base + '/index.html'); await page.locator('#btn-nova-aba').click();
      await page.locator('#cr-busca-modelo').fill(nome);
      await page.getByRole('radio', { name: nome, exact: true }).click();
      await page.locator('[data-acao="avancar"]').click();
      if (nome === 'Aba livre') await page.locator('#cr-nome').fill('Meu espaço');
      await page.locator('[data-acao="avancar"]').click(); await page.locator('[data-acao="criar"]').click();
      await page.waitForURL('**/pilar.html?id=*');
      await existe(page.locator('#titulo'));
      await page.locator('[data-secao="visao-geral"]').click();
      await page.locator('[data-secao="ajustes"]').click();
    }
    console.log('OK: oito pontos de partida essenciais e navegação entre registros, visão geral e ajustes.');

    // Os 32 modelos: criar, preencher todos os campos, persistir e consultar no celular.
    for (const m of process.argv.includes('--sem-catalogo') ? [] : modelos.listar()) {
      await page.goto(base + '/index.html');
      await page.locator('#btn-nova-aba').click();
      await page.locator('#cr-busca-modelo').fill(m.nome);
      await page.getByRole('radio', { name: m.nome, exact: true }).click();
      await page.locator('[data-acao="avancar"]').click(); await page.locator('[data-acao="avancar"]').click();
      await page.locator('[data-acao="criar"]').click(); await page.waitForURL('**/pilar.html?id=*');
      assert.equal(await page.locator('#dica-modelo').innerText(), m.orientacao);
      await page.getByRole('button', { name: 'Abrir o formulário completo', exact: true }).click();
      const form = page.locator('.modal.formulario');
      await form.locator('[name="descricao"]').fill('Registro de teste');
      if (await form.locator('[name="data"]').count()) await form.locator('[name="data"]').fill(hoje);
      for (const c of m.campos) {
        const el = form.locator(`[name="${c.id}"]`);
        if (c.tipo === 'select') { if (await el.evaluate(e => e.tagName) === 'SELECT') await el.selectOption(c.opcoes[0]); else await el.locator('..').locator('button[data-valor]').first().click(); }
        else if (c.tipo === 'simNao') await el.check();
        else if (c.tipo === 'number') await el.fill(c.id === 'distanciaKm' ? '12.5' : '12');
        else if (c.tipo === 'dinheiro') await el.fill('12,50');
        else if (c.tipo === 'time') await el.fill(c.id === 'deitar' ? '23:00' : '08:00');
        else if (c.tipo === 'date') await el.fill(hoje);
        else if (c.tipo === 'link') await el.fill('https://example.com/referencia');
        else await el.fill('Informação de teste');
      }
      await salvarForm(); await page.reload();
      assert.equal(await page.evaluate(() => Store.achar('pilares', UI.parametro('id')).itens.length), 1, m.nome);
      await page.locator('[data-secao="visao-geral"]').click();
      for (const largura of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width: largura, height: 900 });
        await conferirLargura(`${m.nome}: ${largura}`);
      }
    }
    if (!process.argv.includes('--sem-catalogo')) console.log('OK: 32 modelos criados pela interface, todos os campos e datas persistidos, 320–1440 px.');

    const academia = await inserir({ nome: 'Meus treinos', modelo: 'academia', campos: [], itens: [], academia: { configuradoEm: hoje }, dias: [{ id: 'a', nome: 'Treino A', exercicios: [] }, { id: 'b', nome: 'Treino B', exercicios: [] }] });
    await abrir(academia);
    await page.getByRole('button', { name: 'Treinei hoje', exact: true }).first().click();
    await page.reload(); await existe(page.getByRole('button', { name: 'Treino feito hoje', exact: true }));
    await page.locator('[data-secao="visao-geral"]').click();
    assert.match(await page.locator('#bloco-stats').innerText(), /Sessões nos últimos 7 dias\s+1/);
    for (const tema of ['light', 'dark']) {
      await page.evaluate(t => UI.tema.definir(t), tema);
      for (const id of [legado, dedicado, academia]) {
        await abrir(id);
        for (const largura of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width: largura, height: 900 });
          await conferirLargura(`${tema}: ${id}: ${largura}`);
        }
      }
    }
    assert.deepEqual(erros, []);
    if (process.env.DELFOS_QA_DIR) {
      fs.mkdirSync(process.env.DELFOS_QA_DIR, { recursive: true });
      await page.setViewportSize({ width: 1440, height: 1000 }); await abrir(legado);
      await page.screenshot({ path: path.join(process.env.DELFOS_QA_DIR, 'alimentacao-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 900 });
      await page.screenshot({ path: path.join(process.env.DELFOS_QA_DIR, 'alimentacao-celular.png'), fullPage: true });
    }
    console.log('OK: treino diário, histórico, temas, responsividade e nenhum erro de JavaScript.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
