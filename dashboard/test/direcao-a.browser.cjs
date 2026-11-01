/* Direção A: identidade local, leitura responsiva e planejamento preservado. */
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.DELFOS_PLAYWRIGHT || 'playwright');
const raiz = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const arquivo = path.resolve(raiz, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!arquivo.startsWith(raiz + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.stat(arquivo, (erro, stat) => {
    if (erro || !stat.isFile()) { res.writeHead(404); res.end(); return; }
    const tipo = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }[path.extname(arquivo)];
    res.writeHead(200, { 'Content-Type': tipo || 'application/octet-stream' });
    fs.createReadStream(arquivo).pipe(res);
  });
});
async function estabilizar(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function capturar(page, nome) {
  if (!process.env.DELFOS_QA_DIR) return;
  fs.mkdirSync(process.env.DELFOS_QA_DIR, { recursive: true });
  await page.screenshot({ path: path.join(process.env.DELFOS_QA_DIR, nome + '.png'), fullPage: true });
}
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.DELFOS_BROWSER_PATH ? { executablePath: process.env.DELFOS_BROWSER_PATH } : {}), args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
  const erros = [], fontes = [];
  try {
    await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => erros.push(e.message));
    page.on('response', r => { if (r.request().resourceType() === 'font') fontes.push({ url: r.url(), status: r.status() }); });
    await page.goto(base + '/bemvindo.html');
    await page.evaluate(() => {
      Personalizacao.pular();
      Store.definirPreferencias({ experiencia: { movimento: 'reduzido', lembretes: { resumoDoDia: false } } });
    });
    await page.goto(base + '/index.html');
    await estabilizar(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    assert.ok(await page.getByText('Nada marcado por enquanto.', { exact: true }).isVisible());
    assert.equal(await page.locator('#home-planejar a:visible').count(), 4);
    await capturar(page, 'home-vazia');

    const compromissos = await page.evaluate(() => {
      const prazos = [0, 1, 2, 3, 21, 90];
      return prazos.flatMap(dias => {
        const descricao = dias === 21 ? 'Entrega do próximo mês' : dias === 90 ? 'Plano do próximo trimestre' : `Compromisso em ${dias} dias`;
        const principal = Store.inserir('pessoal.compromissos', { descricao, data: UI.isoMaisDias(dias), tipo: 'tarefa', concluido: false });
        if (dias !== 0) return [principal];
        // Inserção fora da ordem para conferir a leitura cronológica do mesmo dia.
        return [principal,
          Store.inserir('pessoal.compromissos', { descricao: 'Reunião das 15 horas', data: UI.hojeISO(), hora: '15:00', tipo: 'tarefa', concluido: false }),
          Store.inserir('pessoal.compromissos', { descricao: 'Revisão das 9 horas', data: UI.hojeISO(), hora: '09:00', tipo: 'tarefa', concluido: false }),
        ];
      });
    });
    await page.reload();
    assert.match(await page.locator('#leitura').innerText(), /Revisão das 9 horas/);
    assert.equal(await page.locator('#leitura a').getAttribute('href'), 'pessoal.html');
    assert.equal(await page.locator('#agenda .agenda-linha').count(), 6);
    assert.deepEqual(await page.locator('#agenda .agenda-linha .t').allTextContents(), [
      'Revisão das 9 horas', 'Reunião das 15 horas', 'Compromisso em 0 dias',
      'Compromisso em 1 dias', 'Compromisso em 2 dias', 'Compromisso em 3 dias',
    ]);
    const hoje = page.locator('#agenda .agenda-linha');
    assert.ok(await hoje.first().locator('.agenda-dia').isVisible());
    for (let i = 1; i < 3; i++) {
      assert.equal(await hoje.nth(i).locator('.agenda-dia').isVisible(), false);
      assert.equal(await hoje.nth(i).locator('.agenda-dia').getAttribute('aria-hidden'), 'true');
    }
    assert.ok(await hoje.nth(2).locator('.agenda-no.sem-hora').count());
    console.log('OK: compromissos do mesmo dia por horário, sem horário ao final e data apresentada uma única vez.');
    await page.locator('#agenda-periodo').selectOption('30');
    assert.ok(await page.locator('#agenda').getByText('Entrega do próximo mês', { exact: true }).isVisible());
    assert.equal(await page.locator('#agenda .agenda-linha').count(), 7);
    await page.locator('#agenda-periodo').selectOption('7');
    assert.equal(await page.locator('#agenda .agenda-linha').count(), 6);
    assert.equal(await page.evaluate(() => Store.lista('pessoal.compromissos').length), compromissos.length);

    const destinos = {
      'Calendário': 'pessoal.html#calendario',
      'Rotinas': 'pessoal.html#rotina',
      'Projetos': 'projetos.html',
      'Metas financeiras': 'financeiro.html#planejamento',
    };
    for (const [nome, href] of Object.entries(destinos)) {
      const link = page.locator('#home-planejar').getByRole('link', { name: new RegExp('^' + nome) });
      assert.equal(await link.getAttribute('href'), href);
      await link.click();
      assert.ok(page.url().endsWith('/' + href));
      const secao = href.split('#')[1];
      if (secao) await page.waitForFunction(secao => document.querySelector(`[data-secao="${secao}"]`)?.getAttribute('aria-selected') === 'true', secao);
      await page.goto(base + '/index.html');
    }
    console.log('OK: próxima ação, agenda de 7/30 dias e acesso a calendário, rotinas, projetos e metas; plano trimestral preservado.');

    // O teclado alterna as seções e permite retornar sem depender do mouse.
    await page.locator('#secao-meu-dia').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#secao-minhas-abas').getAttribute('aria-selected'), 'true');
    assert.ok(await page.locator('#secao-minhas-abas').evaluate(e => e === document.activeElement));
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#secao-meu-dia').getAttribute('aria-selected'), 'true');
    for (const tema of ['light', 'dark']) {
      await page.evaluate(tema => localStorage.setItem('organizador.tema', tema), tema);
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('data-theme'), tema);
      for (const width of [360, 390, 1440]) {
        await page.setViewportSize({ width, height: width < 700 ? 900 : 1000 });
        await estabilizar(page);
        const medidas = await page.evaluate(() => ({
          excesso: document.documentElement.scrollWidth - innerWidth,
          fontesUI: [...document.querySelectorAll('main h1, main h2, main p, main button, main select')].filter(e => e.getBoundingClientRect().height > 0).map(e => getComputedStyle(e).fontFamily),
          fontePronta: document.fonts.check('16px "Source Sans 3"'),
          dias: [...document.querySelectorAll('.semana-dia')].map(e => ({ largura: e.getBoundingClientRect().width, altura: e.getBoundingClientRect().height })),
        }));
        assert.ok(medidas.excesso <= 1, `${tema}/${width}: excesso horizontal de ${medidas.excesso}px`);
        assert.ok(medidas.fontePronta && medidas.fontesUI.every(f => f.includes('Source Sans 3')), `${tema}/${width}: fonte da interface`);
        assert.ok(medidas.dias.every(d => d.largura >= 44 && d.altura >= 44), `${tema}/${width}: dias precisam de alvo de toque de 44px`);
        assert.ok(await page.locator('#home-planejar').isVisible());
        await capturar(page, `home-${tema}-${width}`);
      }
    }
    assert.ok(fontes.some(f => f.status === 200 && f.url.startsWith(base + '/vendor/source-sans-3/')), 'Fonte precisa funcionar sem serviços externos');
    console.log('OK: tema claro padrão, preferência de tema escuro, fonte local, teclado e layout de 360 a 1440px com dias tocáveis.');

    await page.evaluate(ids => ids.forEach(id => Store.atualizar('pessoal.compromissos', id, { concluido: true })), compromissos.slice(0, -1).map(c => c.id));
    await page.reload();
    assert.equal(await page.locator('#home-proxima-rotulo').innerText(), 'Seu horizonte');
    assert.match(await page.locator('#leitura').innerText(), /Plano do próximo trimestre/);
    console.log('OK: a próxima ação também apresenta planejamento além dos próximos 30 dias.');

    // Os atalhos respeitam a seleção de áreas, sem apagar o planejamento salvo.
    await page.evaluate(() => Store.definirPreferencias({ abasFixas: { pessoal: { ativo: false }, projetos: { ativo: false }, financeiro: { ativo: false } } }));
    await page.reload();
    assert.equal(await page.locator('#home-planejar').isVisible(), false);
    assert.equal(await page.evaluate(() => Store.lista('pessoal.compromissos').length), compromissos.length);
    await page.evaluate(() => Store.definirPreferencias({ abasFixas: { projetos: { ativo: true, rotulo: 'Planos de trabalho' } } }));
    await page.reload();
    assert.equal(await page.locator('#home-planejar a:visible').count(), 1);
    assert.match(await page.locator('#home-planejar a:visible').innerText(), /^Planos de trabalho/);
    assert.deepEqual(erros, []);
    console.log('OK: áreas desativadas deixam de aparecer nos atalhos, rótulos personalizados e registros mantidos.');
  } finally { await ctx.close(); await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
