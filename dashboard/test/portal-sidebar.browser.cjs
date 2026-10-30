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
    const tipo = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[path.extname(arquivo)];
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
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'no-preference' });
  try {
    await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
    const page = await ctx.newPage(), erros = [];
    page.setDefaultTimeout(10000); page.on('pageerror', e => erros.push(e.message));
    await page.goto(base + '/bemvindo.html');
    await page.evaluate(() => {
      Personalizacao.pular();
      Store.definirPreferencias({ experiencia: { desempenho: 'completo', movimento: 'completo', lembretes: { resumoDoDia: false } } });
      Store.definirPerfil({ nome: 'Luiz QA', foto: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#b57d0a"/></svg>') });
      for (let i = 0; i < 22; i++) Store.inserir('pilares', { nome: `Aba ${i + 1}`, modelo: 'personalizado', campos: [], itens: [] });
    });
    await page.goto(base + '/index.html');
    await page.evaluate(() => {
      window.eventosSidebarQA = [];
      const barra = document.querySelector('#sidebar');
      for (const tipo of ['pointerenter', 'pointerleave']) barra.addEventListener(tipo, ev => {
        window.eventosSidebarQA.push({ tipo, ponteiro: ev.pointerType, x: ev.clientX, y: ev.clientY, estado: document.documentElement.dataset.barraRecolhida });
      });
    });
    const toggle = () => page.locator('#btn-recolher-sidebar');
    const preferencia = () => page.evaluate(() => Store.estado().preferencias.experiencia.barraLateralRecolhida === true);
    const estado = async recolhida => {
      try {
        await page.waitForFunction(recolhida => document.documentElement.dataset.barraRecolhida === (recolhida ? 'sim' : 'nao') &&
          (recolhida ? document.querySelector('#sidebar').getBoundingClientRect().width <= 80 : document.querySelector('#sidebar').getBoundingClientRect().width >= 230), recolhida);
      } catch (e) {
        console.error({ esperado: recolhida ? 'recolhida' : 'expandida', ...await page.evaluate(() => ({ estado: document.documentElement.dataset.barraRecolhida, largura: document.querySelector('#sidebar').getBoundingClientRect().width, foco: document.activeElement.id, focoVisivel: document.activeElement.matches(':focus-visible'), focusinNativo: 'onfocusin' in HTMLElement.prototype, sobPonteiro: [...document.querySelectorAll(':hover')].map(x => x.id || x.className).slice(-5), eventos: window.eventosSidebarQA })) });
        await capturar(page, 'sidebar-falha'); throw e;
      }
      await estabilizar(page);
    };
    const sairDaBarra = () => page.mouse.move(600, 400);
    const aproximarDaBarra = () => page.mouse.move(38, 160);
    const medirQuadroIntermediario = async (tipo, acao) => {
      await page.evaluate(tipo => {
        window.quadroSidebarQA = new Promise(resolve => {
          document.querySelector('#sidebar').addEventListener(tipo, ev => {
            const inicio = performance.now();
            const quadros = [];
            const medir = () => {
              const largura = document.querySelector('#sidebar').getBoundingClientRect().width;
              quadros.push({ largura, estado: document.documentElement.dataset.barraRecolhida });
              if (largura > 76.5 && largura < 235.5 || performance.now() - inicio > 1000) resolve({ largura, principal: document.querySelector('.main').getBoundingClientRect().left, alvo: ev.target.id || ev.target.className, quadros: quadros.slice(-10), eventos: window.eventosSidebarQA, foco: document.activeElement.id, preferencia: Store.estado().preferencias.experiencia.barraLateralRecolhida });
              else requestAnimationFrame(medir);
            };
            requestAnimationFrame(medir);
          }, { once: true, capture: true });
        });
      }, tipo);
      await acao();
      const quadro = await page.evaluate(() => window.quadroSidebarQA);
      if (!(quadro.largura > 76.5 && quadro.largura < 235.5)) await capturar(page, 'sidebar-falha-quadro');
      assert.ok(quadro.largura > 76.5 && quadro.largura < 235.5, `A barra mudou sem quadro intermediário: ${JSON.stringify(quadro)}`);
      assert.ok(Math.abs(quadro.principal - quadro.largura) < 1, `O conteúdo não acompanhou a transição: ${JSON.stringify(quadro)}`);
      return quadro.largura;
    };
    await sairDaBarra();
    assert.equal(await toggle().getAttribute('aria-expanded'), 'true');
    assert.ok(await toggle().isVisible());
    assert.equal(await preferencia(), false);
    await estabilizar(page);
    await capturar(page, 'sidebar-expandida-desktop');
    const antes = await page.locator('.main').boundingBox();
    const centrosAntes = await page.locator('#sidebar .nav-item').evaluateAll(itens => itens.map(e => ({ nome: e.getAttribute('aria-label'), centro: e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2 })));
    const transicao = await page.locator('#sidebar').evaluate(e => ({ propriedades: getComputedStyle(e).transitionProperty, duracoes: getComputedStyle(e).transitionDuration }));
    assert.match(transicao.propriedades, /width/); assert.ok(transicao.duracoes.split(',').some(d => parseFloat(d) > .1));
    const quadroRecolhendo = await medirQuadroIntermediario('click', () => toggle().click()); await estado(true);
    assert.equal(await toggle().getAttribute('aria-expanded'), 'false');
    assert.equal(await toggle().isVisible(), false, 'A barra recolhida deve ter só o D, ícones e foto, sem seta');
    assert.equal(await preferencia(), true);
    assert.equal(await page.locator('.marca-expandida').isVisible(), false);
    assert.ok(await page.locator('.marca-recolhida').isVisible());
    assert.ok(antes.x - (await page.locator('.main').boundingBox()).x >= 100, 'Recolher não devolveu espaço para a página');
    const centrosDepois = await page.locator('#sidebar .nav-item').evaluateAll(itens => itens.map(e => ({ nome: e.getAttribute('aria-label'), centro: e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2 })));
    assert.deepEqual(centrosDepois.map(x => x.nome), centrosAntes.map(x => x.nome));
    centrosAntes.forEach((x, i) => assert.ok(Math.abs(x.centro - centrosDepois[i].centro) <= 1, `A aba ${x.nome} mudou de posição vertical ao recolher: ${x.centro} → ${centrosDepois[i].centro}`));
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

    // Aproximar o ponteiro revela a navegação sem gravar uma nova preferência.
    const estadoGuardado = await page.evaluate(() => localStorage.getItem('organizador.estado.v2'));
    await sairDaBarra();
    const quadroExpandindo = await medirQuadroIntermediario('pointerenter', aproximarDaBarra); await estado(false);
    const realce = await page.evaluate(() => {
      const item = document.elementFromPoint(38, 160)?.closest('.nav-item'), luz = document.querySelector('#sidebar .realce-nav');
      return item && luz ? { item: item.offsetWidth, luz: luz.offsetWidth, opacidade: getComputedStyle(luz).opacity } : null;
    });
    await capturar(page, 'sidebar-revelada-hover');
    assert.ok(realce && Number(realce.opacidade) > 0 && Math.abs(realce.item - realce.luz) <= 2, `Realce fora da largura da aba após expandir: ${JSON.stringify(realce)}`);
    assert.ok(await toggle().isVisible());
    assert.equal(await toggle().getAttribute('aria-label'), 'Recolher barra lateral');
    assert.equal(await preferencia(), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('organizador.estado.v2')), estadoGuardado);
    await sairDaBarra(); await estado(false);
    assert.equal(await preferencia(), true, 'Sair com o ponteiro não muda a escolha de recolher');
    await capturar(page, 'sidebar-revelada-desktop');

    // O ponteiro continua sobre a faixa recolhida: a seta não pode abrir a barra de novo.
    await aproximarDaBarra(); await toggle().focus(); await page.keyboard.press('Space'); await estado(true);
    const depoisDeRecolher = await page.evaluate(() => localStorage.getItem('organizador.estado.v2'));
    await page.mouse.move(39, 161); await estado(true);
    assert.equal(await toggle().isVisible(), false);
    await sairDaBarra(); await aproximarDaBarra(); await estado(false);
    assert.equal(await page.evaluate(() => localStorage.getItem('organizador.estado.v2')), depoisDeRecolher);

    // Uma aba mais abaixo também continua sob o mesmo ponto do ponteiro.
    await toggle().click(); await estado(true); await sairDaBarra();
    const alvoFechado = await page.evaluate(() => document.elementFromPoint(38, 720)?.closest('.nav-item')?.getAttribute('aria-label'));
    assert.ok(alvoFechado, 'O ponto de teste deve estar sobre uma aba visível');
    await page.mouse.move(38, 720); await estado(false);
    const alvoAberto = await page.evaluate(() => document.elementFromPoint(38, 720)?.closest('.nav-item')?.getAttribute('aria-label'));
    assert.equal(alvoAberto, alvoFechado, 'Expandir não pode trocar a aba sob o ponteiro');

    await page.locator('.sidebar-scroll').evaluate(e => e.scrollTop = e.scrollHeight);
    await conferirRodape();
    const posicao = await page.locator('.sidebar-scroll').evaluate(e => e.scrollTop);
    await page.evaluate(() => { Store.definirPerfil({ nome: 'Luiz atualizado' }); UI.montarLayout('home'); });
    await estado(false);
    assert.equal(await preferencia(), true);
    assert.ok(Math.abs(await page.locator('.sidebar-scroll').evaluate(e => e.scrollTop) - posicao) < 2, 'Atualizar o perfil perdeu a rolagem da barra');
    await page.locator('.sidebar-scroll').evaluate(e => e.scrollTop = 0);
    await page.locator('#sidebar').getByRole('link', { name: 'Pessoal', exact: true }).click();
    await page.waitForURL('**/pessoal.html');
    await sairDaBarra(); await estado(true);
    assert.equal(await page.locator('#sidebar .nav-item[aria-current="page"]').getAttribute('aria-label'), 'Pessoal');
    await page.reload();
    await estado(true);
    assert.equal(await toggle().isVisible(), false);
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
    await estado(true);
    const guardadoAntesDoFoco = await page.evaluate(() => localStorage.getItem('organizador.estado.v2'));
    await page.locator('.main h1').evaluate(e => { e.tabIndex = -1; e.focus(); });
    await page.keyboard.press('Shift+Tab'); await estado(false);
    assert.ok(await page.evaluate(() => !!document.activeElement.closest('#sidebar')), 'O foco do teclado deve revelar a navegação');
    assert.equal(await toggle().getAttribute('aria-expanded'), 'true');
    assert.equal(await preferencia(), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('organizador.estado.v2')), guardadoAntesDoFoco);
    await page.locator('#btn-perfil').click();
    await page.locator('.modal.configuracoes').waitFor({ state: 'visible' });
    assert.ok(await page.locator('.modal.configuracoes').isVisible(), 'Avatar deve continuar abrindo configurações na barra recolhida');
    await page.keyboard.press('Escape');
    await larguraSemExcesso(page);

    // Uma falha na gravação da escolha explícita mantém o estado anterior.
    await sairDaBarra();
    await page.evaluate(() => {
      Store.definirPreferencias({ experiencia: { barraLateralRecolhida: false } }); UI.montarLayout('pessoal');
      window.gravarSidebarOriginal = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, v) { if (k === 'organizador.estado.v2') throw new DOMException('Cheio', 'QuotaExceededError'); return window.gravarSidebarOriginal.call(this, k, v); };
    });
    await toggle().click(); await estado(false);
    assert.equal(await preferencia(), false);
    await page.evaluate(() => { Storage.prototype.setItem = window.gravarSidebarOriginal; });
    for (const modo of ['sistema', 'reduzido', 'leve']) {
      await page.emulateMedia({ reducedMotion: modo === 'sistema' ? 'reduce' : 'no-preference' });
      await sairDaBarra();
      await page.evaluate(modo => {
        Store.definirPreferencias({ experiencia: { barraLateralRecolhida: false, movimento: modo === 'reduzido' ? 'reduzido' : 'completo', desempenho: modo === 'leve' ? 'leve' : 'completo' } });
        UI.aplicarAparencia();
      }, modo);
      await estado(false);
      const duracoes = await page.locator('#sidebar').evaluate(e => getComputedStyle(e).transitionDuration.split(',').map(parseFloat));
      assert.ok(duracoes.every(d => d <= .001), `Movimento não foi reduzido no modo ${modo}: ${duracoes}`);
      await toggle().click(); await estado(true);
      await sairDaBarra(); await aproximarDaBarra(); await estado(false);
      assert.ok(await toggle().isVisible());
    }
    assert.deepEqual(erros, []);
    console.log(`OK: abertura por ponteiro/foco, seta só expandida, transição real nos dois sentidos (${Math.round(quadroRecolhendo)}/${Math.round(quadroExpandindo)} px), movimento reduzido/leve, persistência e celular.`);
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
    // A raiz do site é a página inicial com o hero; ela leva à apresentação e à entrada.
    await page.goto(base + '/site/index.html');
    await page.locator('[data-delfos-hero] canvas').waitFor({ state: 'attached' });
    assert.equal(await page.locator('.dh__cta').getAttribute('href'), 'dashboard/inicio.html');
    assert.equal(await page.locator('.frentes .link').getAttribute('href'), 'dashboard/entrar.html');
    assert.equal(await page.locator('.frentes .botao').getAttribute('href'), 'dashboard/entrar.html?modo=criar');
    await page.locator('.dh__cta').evaluate(a => a.click());
    await page.waitForURL('**/site/dashboard/inicio.html');
    await page.goto(base + '/inicio.html');
    await page.locator('h1').waitFor({ state: 'visible' });
    assert.equal(new URL(page.url()).pathname, '/inicio.html', 'A apresentação deve abrir sem conta');
    // Sem servidor (API_PUBLICA vazia), a apresentação não promete conta: o
    // caminho que funciona, usar neste aparelho, é a ação principal (3.0).
    const comecar = () => page.getByRole('link', { name: 'Começar neste aparelho', exact: true }).first();
    assert.match(await comecar().getAttribute('href'), /index\.html\?local=1$/);
    assert.equal(await page.getByRole('link', { name: 'Entrar com o Google', exact: true }).count(), 0, 'Sem servidor, não se oferece Google');
    assert.equal(await page.getByRole('link', { name: 'Criar conta', exact: true }).count(), 0, 'Sem servidor, não se oferece criar conta');
    for (const tema of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('organizador.tema', t), tema); await page.reload();
      for (const largura of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width: largura, height: 900 }); await larguraSemExcesso(page);
        assert.ok(await comecar().isVisible(), `Acesso local oculto em ${largura}px`);
        if (largura !== 768) await capturar(page, `portal-${tema}-${largura}`);
      }
    }
    // Um link antigo para criar conta continua chegando a uma tela honesta.
    await page.goto(base + '/entrar.html?modo=criar');
    await page.locator('#acesso-local').waitFor({ state: 'visible' });
    assert.ok(await page.locator('#form').isHidden(), 'Sem servidor, o formulário de conta não aparece');
    assert.ok(await page.locator('#google-area').isHidden());
    assert.ok(await page.locator('#modo').isHidden());
    assert.match(await page.locator('#aviso-texto').textContent(), /ainda não estão ligadas/);
    await larguraSemExcesso(page); await capturar(page, 'cadastro-sem-servidor');
    await page.goto(base + '/entrar.html');
    assert.ok(await page.locator('#form').isHidden());
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
    // Com servidor, a apresentação oferece conta e Google, não o acesso local.
    await page.goto(base + '/inicio.html');
    assert.match(await page.getByRole('link', { name: 'Criar conta', exact: true }).first().getAttribute('href'), /entrar\.html\?modo=criar$/);
    assert.ok(await page.getByRole('link', { name: 'Entrar com o Google', exact: true }).isVisible());
    assert.ok(await page.locator('[data-local]').isHidden());
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
