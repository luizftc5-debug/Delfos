/* Entrada pública e navegação recolhida: dados fictícios, sem chamadas externas. */
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.DELFOS_PLAYWRIGHT || 'playwright');
const raiz = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const pagina = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const origem = pagina.startsWith('/site/') ? path.resolve(raiz, '..') : raiz;
  const arquivo = path.resolve(origem, '.' + (pagina.startsWith('/site/') ? pagina.slice(5) : pagina));
  if (!arquivo.startsWith(origem + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.stat(arquivo, (erro, stat) => {
    if (erro || !stat.isFile()) { res.writeHead(404); res.end(); return; }
    const tipo = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }[path.extname(arquivo)];
    res.writeHead(200, { 'Content-Type': tipo || 'application/octet-stream' });
    fs.createReadStream(arquivo).pipe(res);
  });
});
const estabilizar = async page => {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || !Number.isFinite(a.effect?.getComputedTiming().endTime)), null, { timeout: 5000 });
};
const larguraSemExcesso = async page => {
  await estabilizar(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Excesso horizontal em ${page.url()}`);
};
const capturar = async (page, nome) => {
  if (!process.env.DELFOS_QA_DIR) return;
  fs.mkdirSync(process.env.DELFOS_QA_DIR, { recursive: true });
  await page.screenshot({ path: path.join(process.env.DELFOS_QA_DIR, nome + '.png') });
};

async function testarSidebar(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  try {
    await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    const page = await ctx.newPage(), erros = [];
    page.setDefaultTimeout(10000); page.on('pageerror', e => erros.push(e.message));
    await page.goto(base + '/bemvindo.html');
    await page.evaluate(() => {
      Personalizacao.pular();
      Store.definirPreferencias({ experiencia: { lembretes: { resumoDoDia: false } } });
      Store.definirPerfil({ nome: 'Luiz QA', foto: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#b57d0a"/></svg>') });
      for (let i = 0; i < 22; i++) Store.inserir('pilares', { nome: `Aba ${i + 1}`, modelo: 'personalizado', campos: [], itens: [] });
    });
    await page.goto(base + '/index.html');
    const toggle = () => page.locator('#btn-recolher-sidebar');
    assert.equal(await toggle().getAttribute('aria-expanded'), 'true');
    await capturar(page, 'sidebar-expandida-desktop');
    const antes = await page.locator('.main').boundingBox();
    await toggle().focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.documentElement.dataset.barraRecolhida === 'sim' && document.querySelector('#sidebar').getBoundingClientRect().width <= 80);
    assert.equal(await toggle().getAttribute('aria-expanded'), 'false');
    assert.equal(await toggle().getAttribute('aria-label'), 'Expandir barra lateral');
    assert.equal(await page.locator('.marca-expandida').isVisible(), false);
    assert.ok(await page.locator('.marca-recolhida').isVisible());
    assert.ok(antes.x - (await page.locator('.main').boundingBox()).x >= 100, 'Recolher não devolveu espaço para a página');
    for (const link of await page.locator('#sidebar .nav-item').all()) {
      const nome = await link.getAttribute('aria-label');
      assert.ok(nome, 'Aba sem nome acessível na barra recolhida');
      assert.equal(await link.getAttribute('title'), nome);
      assert.ok(await link.locator('.nav-icon').isVisible());
      assert.equal(await link.locator('.nav-label').isVisible(), false);
    }
    assert.ok(await page.locator('#btn-perfil img').isVisible(), 'A foto deve permanecer no rodapé recolhido');
    const conferirRodape = async () => {
      const p = await page.locator('#btn-perfil').boundingBox();
      assert.ok(p.y + p.height <= 900 && p.y >= 780, `Perfil fora do rodapé fixo: ${JSON.stringify(p)}`);
    };
    await conferirRodape();
    await capturar(page, 'sidebar-recolhida-desktop');
    await page.locator('.sidebar-scroll').evaluate(e => e.scrollTop = e.scrollHeight);
    await conferirRodape();
    assert.ok(await page.locator('.marca-recolhida').isVisible());
    const posicao = await page.locator('.sidebar-scroll').evaluate(e => e.scrollTop);
    await page.evaluate(() => { Store.definirPerfil({ nome: 'Luiz atualizado' }); UI.montarLayout('home'); });
    assert.equal(await toggle().getAttribute('aria-expanded'), 'false');
    assert.ok(Math.abs(await page.locator('.sidebar-scroll').evaluate(e => e.scrollTop) - posicao) < 2, 'Atualizar o perfil perdeu a rolagem da barra');
    await page.evaluate(() => {
      window.gravarSidebarOriginal = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, v) { if (k === 'organizador.estado.v2') throw new DOMException('Cheio', 'QuotaExceededError'); return window.gravarSidebarOriginal.call(this, k, v); };
    });
    await toggle().click();
    assert.equal(await toggle().getAttribute('aria-expanded'), 'false', 'Falha ao gravar não pode mudar a preferência');
    await page.evaluate(() => { Storage.prototype.setItem = window.gravarSidebarOriginal; });
    await page.locator('.sidebar-scroll').evaluate(e => e.scrollTop = 0);
    await page.locator('#sidebar').getByRole('link', { name: 'Pessoal', exact: true }).click();
    await page.waitForURL('**/pessoal.html');
    await page.waitForFunction(() => document.documentElement.dataset.barraRecolhida === 'sim');
    assert.equal(await page.locator('#sidebar .nav-item[aria-current="page"]').getAttribute('aria-label'), 'Pessoal');
    await page.reload();
    assert.equal(await toggle().getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => Store.estado().preferencias.experiencia.barraLateralRecolhida), true);

    for (const largura of [320, 390, 768]) {
      await page.setViewportSize({ width: largura, height: 900 }); await larguraSemExcesso(page);
      assert.equal(await toggle().isVisible(), false, 'No celular a barra inferior continua sendo a navegação');
      assert.ok(await page.locator('.tabbar').isVisible());
      assert.ok(await page.locator('.marca-expandida').isVisible());
      assert.equal(await page.locator('.marca-recolhida').isVisible(), false);
    }
    await page.setViewportSize({ width: 390, height: 900 }); await estabilizar(page);
    await capturar(page, 'sidebar-celular');
    await page.setViewportSize({ width: 1440, height: 900 }); await estabilizar(page);
    assert.equal(await toggle().getAttribute('aria-expanded'), 'false');
    await toggle().focus(); await page.keyboard.press('Space'); await estabilizar(page);
    assert.equal(await toggle().getAttribute('aria-expanded'), 'true');
    assert.equal(await page.evaluate(() => Store.estado().preferencias.experiencia.barraLateralRecolhida), false);
    await toggle().focus(); await page.keyboard.press('Enter'); await estabilizar(page);
    await page.locator('#btn-perfil').click();
    await page.locator('.modal.configuracoes').waitFor({ state: 'visible' });
    assert.ok(await page.locator('.modal.configuracoes').isVisible(), 'Avatar deve continuar abrindo configurações na barra recolhida');
    await page.keyboard.press('Escape');
    await larguraSemExcesso(page);
    assert.deepEqual(erros, []);
    console.log('OK: barra recolhida por teclado, ícones/D/foto, espaço útil, persistência, navegação e celular.');
  } finally { await ctx.close(); }
}

async function testarPortal(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  try {
    await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    const page = await ctx.newPage(), erros = [];
    page.setDefaultTimeout(10000); page.on('pageerror', e => erros.push(e.message));
    await page.goto(base + '/index.html');
    await page.waitForURL('**/inicio.html');
    await page.goto(base + '/site/index.html');
    await page.waitForURL('**/site/dashboard/inicio.html');
    await page.goto(base + '/inicio.html');
    await page.locator('h1').waitFor({ state: 'visible' });
    assert.equal(new URL(page.url()).pathname, '/inicio.html', 'A apresentação deve abrir sem conta');
    const entrar = page.getByRole('link', { name: 'Entrar', exact: true }).first();
    const criar = () => page.getByRole('link', { name: 'Criar conta', exact: true }).first();
    assert.match(await entrar.getAttribute('href'), /entrar\.html$/);
    assert.match(await criar().getAttribute('href'), /entrar\.html\?modo=criar$/);
    assert.match(await page.getByRole('link', { name: 'Entrar com o Google', exact: true }).getAttribute('href'), /entrar\.html\?provedor=google$/);
    for (const tema of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('organizador.tema', t), tema); await page.reload();
      for (const largura of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width: largura, height: 900 }); await larguraSemExcesso(page);
        assert.ok(await criar().isVisible(), `Acesso para criar conta oculto em ${largura}px`);
        if (largura !== 768) await capturar(page, `portal-${tema}-${largura}`);
      }
    }
    await criar().click(); await page.waitForURL('**/entrar.html?modo=criar');
    await page.locator('#f-nome').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#modo [data-modo="criar"]').getAttribute('aria-pressed'), 'true');
    assert.ok(await page.locator('#btn-enviar').isDisabled(), 'Sem servidor, o cadastro deve explicar a indisponibilidade');
    assert.ok(await page.locator('#google-indisponivel').isDisabled());
    assert.ok(await page.getByRole('link', { name: 'Usar neste aparelho', exact: true }).isVisible());
    await larguraSemExcesso(page); await capturar(page, 'cadastro-sem-servidor');
    for (const tema of ['light', 'dark']) {
      await page.evaluate(t => UI.tema.definir(t), tema);
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: 900 }); await larguraSemExcesso(page);
        await capturar(page, `cadastro-${tema}-${width}`);
      }
    }
    await page.goto(base + '/entrar.html');
    assert.ok(await page.locator('#f-email').isVisible());
    assert.ok(await page.locator('#btn-enviar').isDisabled());
    assert.ok(await page.getByRole('link', { name: 'Usar neste aparelho', exact: true }).isVisible());
    for (const tema of ['light', 'dark']) {
      await page.evaluate(t => UI.tema.definir(t), tema);
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: 900 }); await larguraSemExcesso(page);
        await capturar(page, `entrar-${tema}-${width}`);
      }
    }
    await page.getByRole('link', { name: 'Usar neste aparelho', exact: true }).click();
    await page.waitForURL('**/bemvindo.html');
    assert.deepEqual(erros, []);
    console.log('OK: apresentação pública, entrar/criar conta, celular e acesso local sem prometer serviço indisponível.');
  } finally { await ctx.close(); }
}

async function testarEntrada(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  try {
    await ctx.addInitScript(api => localStorage.setItem('organizador.api', api), base);
    let faseGoogle = 'erro', revisao = 0, tentativasVinculo = 0;
    const requisicoes = [], nonce = 'N'.repeat(43);
    const googleSimulado = `window.google={accounts:{id:{initialize(opcoes){window.__googleOpcoes=opcoes;},renderButton(alvo){const b=document.createElement('button');b.type='button';b.textContent='Continuar com Google';b.onclick=()=>window.__googleOpcoes.callback({credential:'credencial-google-de-teste'});alvo.replaceChildren(b);}}}};`;
    const sessao = email => ({ token: 'T'.repeat(43), expiraEm: new Date(Date.now() + 3600000).toISOString(), manter: false, usuario: { id: 'usuario-qa', email }, novaConta: false, nome: 'Pessoa de teste' });
    await ctx.route('**/*', async r => {
      const req = r.request(), url = new URL(req.url());
      if (url.hostname === 'accounts.google.com' && url.pathname === '/gsi/client') return r.fulfill({ contentType: 'text/javascript', body: googleSimulado });
      if (!req.url().startsWith(base)) return r.abort();
      if (!url.pathname.startsWith('/api/')) return r.continue();
      const responder = (dados, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(dados) });
      if (url.pathname === '/api/saude') return responder({ cadastro: 'aberto', google: { clientId: 'qa.apps.googleusercontent.com' } });
      if (url.pathname === '/api/google/desafio') return responder({ nonce, expiraEm: new Date(Date.now() + 300000).toISOString() });
      if (url.pathname === '/api/google') {
        const corpo = req.postDataJSON(); requisicoes.push(corpo);
        if (faseGoogle === 'erro') return responder({ erro: 'Não foi possível validar a conta Google de teste.' }, 401);
        if (faseGoogle === 'vincular') {
          if (!corpo.chaveVinculo) return responder({ erro: 'Confirme a senha da sua conta Delfos.', vincularGoogle: true, email: 'google@exemplo.com' }, 409);
          if (++tentativasVinculo === 1) return responder({ erro: 'Senha atual incorreta.' }, 403);
        }
        return responder(sessao('google@exemplo.com'));
      }
      if (url.pathname === '/api/entrar') { const corpo = req.postDataJSON(); requisicoes.push(corpo); return responder(sessao(corpo.email)); }
      if (url.pathname === '/api/estado') return responder(req.method() === 'GET' ? { estado: null, revisao } : { revisao: ++revisao, atualizadoEm: new Date().toISOString() });
      if (url.pathname === '/api/conta') return responder({ usuario: sessao('google@exemplo.com').usuario, sessao: {} });
      if (url.pathname === '/api/anexos') return responder({ anexos: [] });
      return responder({});
    });
    const page = await ctx.newPage(), erros = [];
    page.setDefaultTimeout(10000); page.on('pageerror', e => erros.push(e.message));
    await page.goto(base + '/entrar.html?modo=criar');
    await page.locator('#f-nome').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#modo [data-modo="criar"]').getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Entrar', exact: true }).first().click();
    await page.locator('#f-email').fill('pessoa@exemplo.com');
    await page.locator('#f-senha').fill('Senha longa para testar 923!');
    await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click();
    assert.equal(await page.locator('#f-senha').getAttribute('type'), 'text');
    await page.getByRole('button', { name: 'Ocultar senha', exact: true }).click();
    assert.equal(await page.locator('#f-senha').getAttribute('type'), 'password');
    await page.locator('#btn-esqueci').click();
    assert.ok(await page.locator('#f-codigo').isVisible());
    await page.locator('#btn-voltar-entrar').click();
    await page.locator('#f-senha').fill('Senha longa para testar 923!');
    await page.locator('#f-manter').uncheck();
    await page.evaluate(() => Personalizacao.pular());
    await page.locator('#btn-enviar').click();
    await page.waitForURL('**/index.html');
    const email = requisicoes.find(r => r.email === 'pessoa@exemplo.com');
    assert.ok(email && /^[\w-]{43}$/.test(email.chave));
    assert.equal(email.senha, undefined, 'A senha não pode sair em texto na requisição');
    assert.equal(await page.evaluate(() => Sessao.logado()), true);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('organizador.sessao')).token), undefined);
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('organizador.sessao')).token), 'T'.repeat(43));

    // Uma falha real de API deve ficar na entrada; uma credencial aceita usa o mesmo fluxo de dados.
    await page.evaluate(() => { localStorage.removeItem('organizador.sessao'); sessionStorage.removeItem('organizador.sessao'); });
    await page.goto(base + '/entrar.html?volta=pessoal.html');
    const google = () => page.locator('#google-botao').getByRole('button', { name: 'Continuar com Google', exact: true });
    await google().waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => window.__googleOpcoes.nonce), nonce);
    assert.equal(await page.evaluate(() => window.__googleOpcoes.client_id), 'qa.apps.googleusercontent.com');
    await google().click();
    await page.getByText('Não foi possível validar a conta Google de teste.', { exact: true }).waitFor({ state: 'visible' });
    assert.ok(new URL(page.url()).pathname.endsWith('/entrar.html'));
    assert.equal(await page.evaluate(() => Sessao.logado()), false);
    faseGoogle = 'sucesso';
    await google().click(); await page.waitForURL('**/pessoal.html');
    assert.equal(await page.evaluate(() => Sessao.usuario().email), 'google@exemplo.com');
    const pedidosGoogle = requisicoes.filter(r => r.credencial);
    assert.equal(pedidosGoogle.length, 2); assert.equal(pedidosGoogle[1].nonce, nonce);
    assert.equal(pedidosGoogle[1].credencial, 'credencial-google-de-teste');
    assert.equal(pedidosGoogle[1].senha, undefined);
    assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes('credencial-google-de-teste') || JSON.stringify(sessionStorage).includes('credencial-google-de-teste')), false);

    // Confirmar uma conta antiga mantém a credencial Google ao corrigir uma senha incorreta.
    await page.evaluate(() => { localStorage.removeItem('organizador.sessao'); sessionStorage.removeItem('organizador.sessao'); });
    faseGoogle = 'vincular';
    await page.goto(base + '/entrar.html');
    await google().waitFor({ state: 'visible' }); await google().click();
    await page.locator('#google-senha-vinculo').waitFor({ state: 'visible' });
    assert.ok(await page.locator('#form').isHidden());
    await page.locator('#google-senha-vinculo').fill('Senha incorreta para testar');
    await page.locator('#google-confirmar').click();
    await page.getByText('Senha atual incorreta.', { exact: true }).waitFor({ state: 'visible' });
    assert.ok(await page.locator('#google-senha-vinculo').isVisible());
    assert.equal(await page.evaluate(() => Sessao.logado()), false);
    for (const largura of [390, 320]) {
      await page.setViewportSize({ width: largura, height: 900 }); await larguraSemExcesso(page);
      if (largura === 390) await capturar(page, 'google-vincular-celular');
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#google-senha-vinculo').fill('Senha correta para testar');
    await page.locator('#google-confirmar').click();
    await page.waitForURL('**/index.html');
    const vinculos = requisicoes.filter(r => r.chaveVinculo);
    assert.equal(vinculos.length, 2);
    assert.ok(vinculos.every(r => /^[\w-]{43}$/.test(r.chaveVinculo) && r.credencial === 'credencial-google-de-teste' && r.nonce === nonce));
    assert.notEqual(vinculos[0].chaveVinculo, vinculos[1].chaveVinculo);
    assert.ok(vinculos.every(r => r.senhaVinculo === undefined && r.senha === undefined));
    assert.equal(await page.evaluate(() => Sessao.usuario().email), 'google@exemplo.com');
    assert.deepEqual(erros, []);
    console.log('OK: entrada/recuperação, senha derivada, sessão temporária e Google/vinculação com API/GIS simulados.');
  } finally { await ctx.close(); }
}

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.DELFOS_BROWSER_PATH ? { executablePath: process.env.DELFOS_BROWSER_PATH } : {}), args: ['--no-sandbox'] });
  try {
    if (!process.argv.includes('--somente-portal')) await testarSidebar(browser, base);
    if (!process.argv.includes('--somente-sidebar')) { await testarPortal(browser, base); await testarEntrada(browser, base); }
  }
  finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
