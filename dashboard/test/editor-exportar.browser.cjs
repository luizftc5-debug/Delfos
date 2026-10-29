/* Requer Playwright e Chromium; verifica o PDF real, com cabeçalhos ligados. */
const assert = require('node:assert/strict');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.DELFOS_PLAYWRIGHT || 'playwright');
const raiz = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const arquivo = path.resolve(raiz, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!arquivo.startsWith(raiz + path.sep)) { res.writeHead(403); res.end(); return; }
  const tipo = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }[path.extname(arquivo)];
  fs.readFile(arquivo, (erro, data) => { res.writeHead(erro ? 404 : 200, { 'Content-Type': tipo || 'application/octet-stream' }); res.end(erro ? '' : data); });
});
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.DELFOS_BROWSER_PATH ? { executablePath: process.env.DELFOS_BROWSER_PATH } : {}), args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR' });
    await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    const page = await ctx.newPage(), erros = [];
    page.on('pageerror', e => erros.push(e.message));
    await page.goto(base + '/bemvindo.html');
    const id = await page.evaluate(() => { Personalizacao.pular(); return Store.inserir('faculdade.disciplinas', { nome: 'Clínica médica', resumos: [] }).id; });
    await page.goto(`${base}/resumo.html?disciplina=${id}`);
    await page.locator('#titulo').fill('LITÍASE BILIAR');
    await page.locator('#corpo').fill('Quando se fala de litíase');
    await page.waitForFunction(() => document.querySelector('#estado').textContent === 'Salvo');
    const tituloJanela = await page.title();
    const lerPDF = async pdf => page.evaluate(async b64 => {
      const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = './vendor/pdfjs/pdf.worker.min.mjs';
      const doc = await pdfjs.getDocument({ data: Uint8Array.from(atob(b64), c => c.charCodeAt(0)) }).promise;
      const paginas = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const p = await doc.getPage(n), texto = await p.getTextContent();
        paginas.push({ altura: p.view[3], largura: p.view[2], itens: texto.items.filter(i => i.str.trim()).map(i => ({ texto: i.str, x: i.transform[4], y: i.transform[5], altura: i.height, largura: i.width })) });
      }
      await doc.destroy?.(); return paginas;
    }, pdf.toString('base64'));
    const gerar = () => page.pdf({ format: 'A4', preferCSSPageSize: true, displayHeaderFooter: true, printBackground: true });
    const pequeno = await gerar(), paginas = await lerPDF(pequeno);
    assert.equal(paginas.length, 1);
    assert.deepEqual(paginas[0].itens.map(i => i.texto), ['LITÍASE BILIAR', 'Quando se fala de litíase']);
    const titulo = paginas[0].itens[0];
    assert.ok(Math.abs(titulo.x + titulo.largura / 2 - paginas[0].largura / 2) < 3);
    assert.ok(titulo.altura >= 25);
    assert.equal(await page.title(), tituloJanela);
    assert.equal(await page.locator('.resumo-impressao').count(), 0);
    // O menu e Ctrl+P usam os mesmos eventos. Uma nova impressão não duplica o texto.
    await page.evaluate(() => { window.dispatchEvent(new Event('beforeprint')); window.dispatchEvent(new Event('beforeprint')); });
    assert.equal(await page.locator('.resumo-impressao').count(), 1);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await page.evaluate(() => {
      const c = document.querySelector('#corpo');
      c.innerHTML = `<h2>Resumo clínico</h2><p><b>Negrito</b>, <i>itálico</i> e <a href="https://example.com/referencia">Referência</a>.</p>
        <table><thead><tr><th>Achado</th><th>Descrição</th></tr></thead><tbody><tr><td>Teste</td><td>Conteúdo da tabela</td></tr></tbody></table>
        <ul class="checklist"><li data-feito="true">Revisão concluída</li><li>Revisar amanhã</li></ul>
        ${Array.from({ length: 75 }, (_, i) => `<p>Parágrafo ${i + 1}: texto de revisão e estudo, com informações preservadas na exportação.</p>`).join('')}`;
      const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 1600;
      const desenho = canvas.getContext('2d'); desenho.fillStyle = '#dbe7dd'; desenho.fillRect(0, 0, 200, 1600);
      desenho.fillStyle = '#245132'; desenho.fillRect(20, 20, 160, 1560);
      const img = document.createElement('img'); img.src = canvas.toDataURL(); img.className = 'img-g'; img.alt = 'Imagem alta';
      c.appendChild(img); c.insertAdjacentHTML('beforeend', '<p>Texto após a imagem alta.</p>');
    });
    const longo = await gerar(), varias = await lerPDF(longo);
    assert.ok(varias.length >= 3);
    const textos = varias.flatMap(p => p.itens.map(i => i.texto)).join(' ');
    assert.match(textos, /Conteúdo da tabela/); assert.match(textos, /Parágrafo 75/);
    assert.match(textos, /Texto após a imagem alta/);
    assert.doesNotMatch(textos, /Delfos|127\.0\.0\.1|resumo\.html|\d{2}\/\d{2}\/\d{4}/);
    for (const p of varias) for (const i of p.itens) {
      assert.ok(i.x >= 50, `Margem esquerda: ${i.texto}`);
      assert.ok(i.y > 40 && i.y < p.altura - 40, `Margem vertical: ${i.texto}`);
    }
    // A versão para Word recebe o mesmo título e preserva conteúdo e imagens.
    const word = await page.evaluate(() => EditorExportar.word('Título <principal>', '<p>Texto com <b>ênfase</b></p><img src="data:image/png;base64,AA==">'));
    assert.match(word, /text-align:center/); assert.match(word, /font-size:26pt/);
    assert.match(word, /Título &lt;principal&gt;/); assert.match(word, /data:image\/png/);
    assert.doesNotMatch(word, /Delfos|resumo\.html/);
    if (process.env.DELFOS_QA_DIR) {
      fs.mkdirSync(process.env.DELFOS_QA_DIR, { recursive: true });
      fs.writeFileSync(path.join(process.env.DELFOS_QA_DIR, 'resumo-limpo.pdf'), pequeno);
      fs.writeFileSync(path.join(process.env.DELFOS_QA_DIR, 'resumo-multiplas-paginas.pdf'), longo);
    }
    assert.deepEqual(erros, []);
    console.log('OK: PDF real com título centralizado, sem metadados, margens em todas as páginas e exportação Word preservada.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
