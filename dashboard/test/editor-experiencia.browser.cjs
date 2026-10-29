/* Regressões da área de escrita: controles, teclado e espaço útil em desktop/celular. */
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
    const tipo = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }[path.extname(arquivo)];
    res.writeHead(200, { 'Content-Type': tipo || 'application/octet-stream' });
    fs.createReadStream(arquivo).pipe(res);
  });
});
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.DELFOS_BROWSER_PATH ? { executablePath: process.env.DELFOS_BROWSER_PATH } : {}), args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    const page = await ctx.newPage(), erros = [];
    page.setDefaultTimeout(10000); page.on('pageerror', e => erros.push(e.message));
    const estabilizar = async () => {
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    };
    const salvo = async () => {
      try { await page.waitForFunction(() => document.querySelector('#estado').textContent === 'Salvo'); }
      catch (erro) { console.error({ estado: await page.locator('#estado').innerText(), erros }); throw erro; }
    };
    await page.goto(base + '/bemvindo.html');
    const disciplina = await page.evaluate(() => {
      Personalizacao.pular(); Store.definirPreferencias({ experiencia: { lembretes: { resumoDoDia: false } } });
      return Store.inserir('faculdade.disciplinas', { nome: 'Clínica médica', status: 'ativa', avaliacoes: [], materiais: [], prazos: [], resumos: [] }).id;
    });
    await page.goto(`${base}/resumo.html?disciplina=${disciplina}`);
    await page.locator('#titulo').fill('Litíase biliar');
    await page.locator('#corpo').fill('Resumo curto: conceito e conduta.'); await salvo();
    const endereco = page.url();
    await page.reload();
    assert.equal(await page.locator('#titulo').inputValue(), 'Litíase biliar');
    assert.equal(await page.locator('#corpo').innerText(), 'Resumo curto: conceito e conduta.');
    assert.equal(await page.evaluate(id => Store.achar('faculdade.disciplinas', id).resumos.length, disciplina), 1);

    // Os botões de formatação mantêm a seleção na folha ao receber o clique.
    await page.locator('#corpo').fill('Palavra em destaque e texto normal.');
    await page.evaluate(() => {
      const corpo = document.querySelector('#corpo'); corpo.focus();
      const r = document.createRange(); r.setStart(corpo.firstChild, 0); r.setEnd(corpo.firstChild, 7);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.dispatchEvent(new Event('selectionchange'));
    });
    await page.getByRole('button', { name: 'Negrito', exact: true }).click(); await salvo();
    const destaque = await page.locator('#corpo').evaluate(e => [...e.querySelectorAll('*')].some(n => n.textContent === 'Palavra' && Number(getComputedStyle(n).fontWeight) >= 600));
    assert.ok(destaque, `Seleção não ficou em negrito: ${await page.locator('#corpo').innerHTML()}`);

    // Ctrl+F e substituir funcionam com a barra compacta, inclusive no celular.
    await page.keyboard.press('Control+f');
    await page.getByLabel('Buscar no texto', { exact: true }).fill('normal');
    await page.getByLabel('Substituir por', { exact: true }).fill('revisado');
    await page.locator('#busca-todos').click();
    assert.match(await page.locator('#corpo').innerText(), /texto revisado/);
    await page.locator('#busca-fechar').click(); await salvo();
    await page.reload();
    assert.match(await page.locator('#corpo').innerText(), /texto revisado/);
    assert.equal(page.url(), endereco);
    if (process.env.DELFOS_QA_DIR) {
      fs.mkdirSync(process.env.DELFOS_QA_DIR, { recursive: true });
      for (const [nome, width] of [['desktop', 1440], ['celular', 390]]) {
        await page.setViewportSize({ width, height: 900 }); await estabilizar();
        await page.screenshot({ path: path.join(process.env.DELFOS_QA_DIR, `editor-curto-${nome}.png`) });
      }
    }

    const rodapeFixo = async (largura, tamanho) => {
      const d = await page.locator('.editor-rodape').evaluate(e => ({ top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom, height: e.getBoundingClientRect().height, position: getComputedStyle(e).position, viewport: innerHeight }));
      assert.equal(d.position, 'fixed', `Rodapé ${largura}px/${tamanho}`);
      assert.ok(Math.abs(d.bottom - d.viewport) <= 1, JSON.stringify(d));
      assert.ok(d.height <= (largura <= 760 ? 52 : 44), `Rodapé ocupa ${d.height}px em ${largura}px`);
      assert.ok(await page.locator('.editor-rodape .marca').isVisible());
      assert.ok(await page.locator('.editor-assinatura').isVisible());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Documento vaza em ${largura}px/${tamanho}`);
    };

    if (!process.argv.includes('--somente-contextos')) {
    for (const tema of ['light', 'dark']) {
      await page.evaluate(t => UI.tema.definir(t), tema);
      for (const largura of [1440, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width: largura, height: 900 }); await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await estabilizar();
        await rodapeFixo(largura, 'curto');
        const medidas = await page.evaluate(() => ({ topo: document.querySelector('.editor-topo').getBoundingClientRect().height, barra: document.querySelector('.editor-barra').getBoundingClientRect().height, status: document.querySelector('.editor-status').getBoundingClientRect().toJSON() }));
        assert.ok(medidas.topo + medidas.barra <= (largura >= 1280 ? 118 : 140), `Barras ocupam ${medidas.topo + medidas.barra}px em ${largura}px`);
        assert.ok(Math.abs(medidas.status.x + medidas.status.width / 2 - largura / 2) <= 2, `Status fora do centro: ${largura}px`);

        // Nenhuma ferramenta desaparece: cada uma recebe foco e entra na faixa rolável.
        const controles = page.locator('.editor-barra .editor-grupo button, .editor-barra .editor-grupo select');
        assert.ok(await controles.count() >= 26);
        for (const controle of await controles.all()) {
          assert.ok(await controle.isVisible(), await controle.getAttribute('aria-label'));
          await controle.focus(); await controle.scrollIntoViewIfNeeded();
          const dentro = await controle.evaluate(e => { const r = e.getBoundingClientRect(), b = e.closest('.editor-formatacao').getBoundingClientRect(); return e === document.activeElement && r.left >= Math.max(0, b.left) - 1 && r.right <= Math.min(innerWidth, b.right) + 1; });
          assert.ok(dentro, `Ferramenta inacessível em ${largura}px: ${await controle.getAttribute('aria-label')}`);
        }
        if (largura <= 390) {
          await page.locator('#btn-buscar').click(); await page.getByLabel('Buscar no texto', { exact: true }).fill('revisado');
          assert.match(await page.locator('#busca-n').innerText(), /1 de 1/);
          const linhas = await page.locator('.editor-formatacao .editor-grupo').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().top)));
          assert.equal(new Set(linhas).size, 1, `Busca empilhou as ferramentas em ${largura}px`);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          await page.locator('#busca-fechar').click();
        }
      }
      console.log(`OK: ferramentas, rodapé compacto e busca no tema ${tema}, 320–1440 px.`);
    }

    await page.locator('#corpo').evaluate(e => { e.innerHTML = Array.from({ length: 90 }, (_, i) => `<p>Parágrafo ${i + 1}: texto para conferir a área de digitação e o rodapé durante a rolagem.</p>`).join(''); e.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' })); });
    await salvo();
    for (const largura of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width: largura, height: 900 });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await estabilizar(); await rodapeFixo(largura, 'longo/início');
      await page.locator('#corpo p').last().scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await estabilizar();
      await rodapeFixo(largura, 'longo/fim');
      const livre = await page.evaluate(() => { const ultimo = document.querySelector('#corpo p:last-child').getBoundingClientRect(), rodape = document.querySelector('.editor-rodape').getBoundingClientRect(); return ultimo.bottom <= rodape.top; });
      assert.ok(livre, `Última linha encoberta pelo rodapé em ${largura}px`);
    }
    await page.reload(); assert.equal(await page.locator('#corpo p').count(), 90);
    assert.equal(await page.evaluate(id => Store.achar('faculdade.disciplinas', id).resumos.length, disciplina), 1);
    assert.deepEqual(erros, []);
    if (process.env.DELFOS_QA_DIR) {
      fs.mkdirSync(process.env.DELFOS_QA_DIR, { recursive: true });
      for (const [nome, width] of [['desktop', 1440], ['celular', 390]]) {
        await page.setViewportSize({ width, height: 900 }); await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await estabilizar();
        await page.screenshot({ path: path.join(process.env.DELFOS_QA_DIR, `editor-${nome}.png`) });
      }
    }
    console.log('OK: editor compacto, rodapé fixo, formatação, busca, teclado, autosave e 320–1440 px nos dois temas.');
    }

    // O mesmo editor conserva o contexto da aba, sem misturar cadernos e disciplinas.
    await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(base + '/index.html');
    const pilar = await page.evaluate(() => Store.inserir('pilares', { nome: 'Meu concurso', modelo: 'personalizado', modeloOrigem: 'concursos', campos: [], itens: [] }).id);
    await page.goto(`${base}/pilar.html?id=${pilar}`);
    assert.ok(await page.locator('[data-secao="resumos-editor"]').isVisible());
    await page.locator('[data-secao="resumos-editor"]').click();
    await page.getByRole('link', { name: 'Escrever resumo', exact: true }).click();
    await page.waitForURL('**/resumo.html?pilar=*');
    await page.locator('#titulo').fill('Direito constitucional');
    await page.locator('#corpo').fill('Princípios fundamentais.'); await salvo();
    const enderecoPilar = page.url();
    await page.reload(); assert.equal(await page.locator('#corpo').innerText(), 'Princípios fundamentais.');
    await page.locator('#voltar').click(); await page.waitForURL('**/pilar.html?id=*#resumos-editor');
    assert.ok(await page.getByRole('link', { name: 'Direito constitucional', exact: true }).isVisible());
    await page.locator('[data-resumos-ocultar]').click();
    assert.equal(await page.locator('[data-secao="resumos-editor"]').isVisible(), false);
    await page.locator('[data-secao="ajustes"]').click();
    await page.locator('[data-resumos-ativar]').click();
    assert.ok(await page.getByRole('link', { name: 'Direito constitucional', exact: true }).isVisible());
    assert.equal(await page.evaluate(id => Store.achar('pilares', id).resumos.length, pilar), 1);
    if (process.env.DELFOS_QA_DIR) {
      for (const [nome, width] of [['desktop', 1440], ['celular', 390]]) {
        await page.setViewportSize({ width, height: 900 }); await estabilizar();
        await page.screenshot({ path: path.join(process.env.DELFOS_QA_DIR, `resumos-concurso-${nome}.png`) });
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    await page.getByRole('link', { name: 'Direito constitucional', exact: true }).click();
    await page.waitForURL(enderecoPilar, { waitUntil: 'load' }); await salvo();
    assert.equal(page.url(), enderecoPilar);
    assert.equal(await page.evaluate(id => Store.achar('faculdade.disciplinas', id).resumos.length, disciplina), 1);

    for (const modelo of ['academia', 'alimentacao']) {
      await page.goto(base + '/index.html');
      const id = await page.evaluate(modelo => Store.inserir('pilares', { nome: modelo, modelo, campos: [], itens: [], dias: [], plano: [], diario: {} }).id, modelo);
      await page.goto(`${base}/pilar.html?id=${id}`);
      assert.equal(await page.locator('[data-secao="resumos-editor"]').isVisible(), false, modelo);
      await page.locator('[data-secao="ajustes"]').click(); await page.locator('[data-resumos-ativar]').click();
      assert.ok(await page.getByRole('link', { name: 'Escrever resumo', exact: true }).isVisible(), modelo);
      await page.reload(); assert.ok(await page.locator('[data-secao="resumos-editor"]').isVisible(), modelo);
    }

    await page.goto(base + '/pessoal.html');
    assert.equal(await page.locator('[data-secao="resumos-editor"]').isVisible(), false);
    await page.locator('[data-resumos-ativar]').click();
    await page.getByRole('link', { name: 'Escrever resumo', exact: true }).click();
    await page.waitForURL('**/resumo.html?aba=pessoal');
    await page.locator('#titulo').fill('Anotações pessoais'); await page.locator('#corpo').fill('Meu texto pessoal.'); await salvo();
    await page.reload(); assert.equal(await page.locator('#corpo').innerText(), 'Meu texto pessoal.');
    await page.locator('#voltar').click(); await page.waitForURL('**/pessoal.html#resumos-editor');
    assert.ok(await page.getByRole('link', { name: 'Anotações pessoais', exact: true }).isVisible());
    assert.equal(await page.evaluate(() => Store.achar('cadernos', 'pessoal').resumos.length), 1);
    assert.equal(await page.evaluate(id => Store.achar('pilares', id).resumos.length, pilar), 1);
    assert.deepEqual(erros, []);
    console.log('OK: resumos em concursos, treino, alimentação e caderno Pessoal, sem perder ou misturar textos.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
