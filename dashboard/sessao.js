/* ===========================================================================
   Sessão — conta do usuário e a porta de entrada do painel.

   Com o back end publicado (API_PUBLICA preenchida), nenhuma página abre sem
   uma conta: quem não entrou vai para entrar.html. Enquanto API_PUBLICA
   estiver vazia, as contas ficam desligadas e o painel funciona como antes,
   só no navegador — é o que permite publicar o servidor sem trancar ninguém
   fora dos próprios dados no meio do caminho.

   Toda vez que o navegador é aberto de novo, o painel pede para entrar — a
   menos que a pessoa marque "Manter conectado":
   - sem marcar, o token vai para o sessionStorage (some quando o navegador
     fecha) e o servidor o aceita por 12 horas no máximo. Uma aba nova pede
     o token às abas já abertas (BroadcastChannel), para não pedir a senha a
     cada aba;
   - marcando, o token vai para o localStorage e vale 30 dias.
   Em `organizador.sessao` (localStorage) ficam sempre o id e o e-mail da
   última conta — para preencher o e-mail e saber de quem são os dados. A senha nunca é guardada, nem aqui nem
   no servidor: ela vira uma chave de 32 bytes por PBKDF2-SHA256 com 600 mil
   iterações (derivarChave) e só a chave é enviada. Detalhes em
   backend/src/contas.js.

   O que não fica no localStorage de propósito: nada da conta vai para o
   estado (Store) nem para o backup — o backup é dos dados, não do login.
   =========================================================================== */

const Sessao = (() => {
  // Endereço do back end publicado — ver backend/README.md, passo 4. Vazio
  // deixa as contas desligadas. Quem desenvolve pode apontar para um servidor
  // local gravando `organizador.api` no localStorage (ex.: http://localhost:8787).
  const API_PUBLICA = "";
  const KEY = "organizador.sessao";
  const KEY_API = "organizador.api";
  const ITERACOES = 600000; // OWASP, PBKDF2-HMAC-SHA256 (2023)
  const SENHA_MINIMA = 8;

  const enc = new TextEncoder();

  /* ---------------------------- Configuração ------------------------------ */

  function api() {
    let local = "";
    try { local = localStorage.getItem(KEY_API) || ""; } catch { /* sem armazenamento */ }
    return (local || API_PUBLICA).trim().replace(/\/+$/, "");
  }

  function lerDe(armazem) {
    try { return JSON.parse(armazem.getItem(KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function ler() {
    return { ...lerDe(localStorage), ...lerDe(sessionStorage) };
  }

  function gravarEm(armazem, dados) {
    try { armazem.setItem(KEY, JSON.stringify(dados)); } catch { /* sem espaço */ }
  }

  /** Guarda o token no lugar certo (ver o cabeçalho) e o resto no localStorage. */
  function gravar(patch) {
    const atual = ler();
    const s = { ...atual, ...patch };
    const { token, expiraEm, ...fixo } = s;
    if (s.manter) {
      gravarEm(localStorage, s);
      try { sessionStorage.removeItem(KEY); } catch { /* nada */ }
    } else {
      gravarEm(localStorage, fixo);
      gravarEm(sessionStorage, { token, expiraEm });
    }
    return s;
  }

  function esquecerToken() {
    gravar({ token: "", expiraEm: "" });
  }

  const ativo = () => !!api();
  const logado = () => {
    const s = ler();
    return !!s.token && !(s.expiraEm && Date.parse(s.expiraEm) <= Date.now());
  };
  const usuario = () => ler().usuario || null;

  function nomeDoAparelho() {
    const ua = navigator.userAgent;
    const navegador = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
      : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador";
    const sistema = /Android/.test(ua) ? "Android" : /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad"
      : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
    return sistema ? `${navegador} no ${sistema}` : navegador;
  }

  /* ------------------------------ Senha ----------------------------------- */

  function b64url(buffer) {
    let s = "";
    for (const b of new Uint8Array(buffer)) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  const normalizarEmail = (email) => String(email || "").trim().toLowerCase();

  /**
   * Senha → chave enviada ao servidor. O e-mail é o sal: cada conta tem o
   * seu, e o navegador consegue refazer a conta antes de falar com o servidor.
   * NFKC para "é" digitado de jeitos diferentes (teclado, celular) dar a
   * mesma senha.
   */
  async function derivarChave(email, senha) {
    if (!globalThis.crypto?.subtle) {
      throw new Error("Este navegador não oferece criptografia aqui. Abra o painel pelo endereço https:// (não pelo arquivo).");
    }
    const base = await crypto.subtle.importKey("raw", enc.encode(String(senha).normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(`delfos:v1:${normalizarEmail(email)}`), iterations: ITERACOES },
      base,
      256
    );
    return b64url(bits);
  }

  /**
   * Quantas vezes a senha já apareceu em vazamentos públicos (Have I Been
   * Pwned), como a norma do NIST (SP 800-63B) pede para senhas novas. Só os
   * 5 primeiros caracteres do SHA-1 saem do aparelho; a comparação é feita
   * aqui. Sem rede ou com o serviço fora do ar, devolve null e não bloqueia.
   */
  async function vezesVazada(senha) {
    try {
      const h = await crypto.subtle.digest("SHA-1", enc.encode(senha));
      const hex = [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      const r = await fetch(`https://api.pwnedpasswords.com/range/${hex.slice(0, 5)}`, { headers: { "Add-Padding": "true" } });
      if (!r.ok) return null;
      const linha = (await r.text()).split("\n").find((l) => l.startsWith(hex.slice(5)));
      return linha ? Number(linha.split(":")[1]) || 0 : 0;
    } catch {
      return null;
    }
  }

  /** Mensagem de erro para uma senha nova, ou "" se ela serve. */
  async function problemaNaSenha(senha, confirmacao) {
    if (String(senha).length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
    if (String(senha).length > 256) return "Senha longa demais (máximo 256 caracteres).";
    if (confirmacao !== undefined && senha !== confirmacao) return "As duas senhas não são iguais.";
    const vezes = await vezesVazada(senha);
    if (vezes) {
      return `Essa senha já apareceu ${vezes.toLocaleString("pt-BR")} vezes em vazamentos de outros sites — é das primeiras que um invasor tenta. Escolha outra.`;
    }
    return "";
  }

  /* ---------------------------- Requisições ------------------------------- */

  class ErroApi extends Error {
    constructor(mensagem, status = 0, dados = {}) {
      super(mensagem);
      this.status = status;
      this.dados = dados;
    }
  }

  /**
   * Chama a API. Rotas de conta passam `publica: true` (sem token). Numa
   * rota com token, 401 quer dizer sessão vencida ou encerrada em outro
   * aparelho: o token sai daqui e um aviso oferece entrar de novo — sem
   * recarregar sozinho, para não perder o que estiver sendo digitado. O que
   * ficou por enviar sobe quando a mesma conta entrar de novo.
   */
  async function pedir(metodo, caminho, { corpo, tipo, bruto = false, publica = false } = {}) {
    if (!ativo()) throw new ErroApi("As contas ainda não estão ligadas neste painel.");
    const headers = {};
    const { token } = ler();
    if (!publica) {
      if (!token) throw new ErroApi("Entre na sua conta para continuar.", 401);
      headers.Authorization = `Bearer ${token}`;
    }
    if (tipo) headers["Content-Type"] = tipo;
    if (corpo && tipo === "application/json" && typeof corpo !== "string") corpo = JSON.stringify(corpo);

    let r;
    try {
      r = await fetch(api() + caminho, { method: metodo, headers, body: corpo });
    } catch {
      throw new ErroApi("Sem conexão com o servidor. O que você fizer fica guardado aqui e sobe quando a conexão voltar.");
    }
    if (bruto && r.ok) return r;

    let dados = {};
    try { dados = await r.json(); } catch { /* resposta sem corpo */ }
    if (r.status === 401 && !publica) sessaoEncerrada();
    if (!r.ok) throw new ErroApi(dados.erro || `O servidor respondeu ${r.status}.`, r.status, dados);
    return dados;
  }

  function sessaoEncerrada() {
    if (!ler().token) return;
    esquecerToken();
    if (typeof UI !== "undefined") {
      UI.toast("Sua sessão terminou. Entre de novo para continuar sincronizando.", {
        acaoRotulo: "Entrar", aoAcionar: irParaEntrar, duracao: 12000,
      });
    }
  }

  /* ------------------------------- Conta ---------------------------------- */

  function guardarSessao(r) {
    gravar({ token: r.token, expiraEm: r.expiraEm, usuario: r.usuario, manter: !!r.manter });
    return r.usuario;
  }

  async function saude() {
    return pedir("GET", "/api/saude", { publica: true });
  }

  /** Devolve { usuario, codigoRecuperacao } — o código aparece só desta vez. */
  async function cadastrar({ email, senha, convite, manter = false }) {
    const chave = await derivarChave(email, senha);
    const r = await pedir("POST", "/api/cadastro", {
      publica: true, tipo: "application/json",
      corpo: { email: normalizarEmail(email), chave, convite: convite || undefined, manter, dispositivo: nomeDoAparelho() },
    });
    return { usuario: guardarSessao(r), codigoRecuperacao: r.codigoRecuperacao };
  }

  async function entrar({ email, senha, manter = false }) {
    const chave = await derivarChave(email, senha);
    const r = await pedir("POST", "/api/entrar", {
      publica: true, tipo: "application/json",
      corpo: { email: normalizarEmail(email), chave, manter, dispositivo: nomeDoAparelho() },
    });
    return guardarSessao(r);
  }

  /** Esqueceu a senha: código de recuperação + senha nova. Devolve { usuario, codigoRecuperacao } (o novo). */
  async function recuperar({ email, codigo, senha, manter = false }) {
    const chaveNova = await derivarChave(email, senha);
    const r = await pedir("POST", "/api/recuperar", {
      publica: true, tipo: "application/json",
      corpo: { email: normalizarEmail(email), codigo, chaveNova, manter, dispositivo: nomeDoAparelho() },
    });
    return { usuario: guardarSessao(r), codigoRecuperacao: r.codigoRecuperacao };
  }

  async function novoCodigoRecuperacao(senha) {
    const chave = await derivarChave(usuario()?.email, senha);
    const r = await pedir("POST", "/api/conta/codigo-recuperacao", { tipo: "application/json", corpo: { chave } });
    return r.codigoRecuperacao;
  }

  /** Encerra a sessão no servidor (se der) e esquece o token aqui. */
  async function sair() {
    try { await pedir("POST", "/api/sair"); } catch { /* sem rede: o token vence sozinho */ }
    esquecerToken();
    canal?.postMessage({ tipo: "saiu" });
  }

  function conta() {
    return pedir("GET", "/api/conta");
  }

  async function trocarSenha(atual, nova) {
    const email = usuario()?.email;
    const [chaveAtual, chaveNova] = await Promise.all([derivarChave(email, atual), derivarChave(email, nova)]);
    return pedir("POST", "/api/conta/senha", { tipo: "application/json", corpo: { chaveAtual, chaveNova } });
  }

  function sairDosOutros() {
    return pedir("POST", "/api/conta/sair-dos-outros");
  }

  async function excluirConta(senha) {
    const chave = await derivarChave(usuario()?.email, senha);
    await pedir("POST", "/api/conta/excluir", { tipo: "application/json", corpo: { chave } });
    try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch { /* nada */ }
    canal?.postMessage({ tipo: "saiu" });
  }

  /* ------------------------------ Porta ----------------------------------- */

  function paginaAtual() {
    return (location.pathname.split("/").pop() || "index.html") + location.search;
  }

  function irParaEntrar() {
    location.href = `entrar.html?volta=${encodeURIComponent(paginaAtual())}`;
  }

  /** Para onde voltar depois de entrar — só páginas do próprio painel. */
  function destinoDepoisDeEntrar() {
    const volta = new URLSearchParams(location.search).get("volta") || "";
    return /^[a-z]+\.html(\?[\w=&%.-]*)?$/.test(volta) && !volta.startsWith("entrar.html") ? volta : "index.html";
  }

  /* ---------------------- Sessão entre abas abertas ----------------------
     Sem "manter conectado", o token mora no sessionStorage, que é de cada aba.
     Uma aba nova pergunta às outras; se alguma está aberta e conectada, ela
     responde com o token. Com o navegador fechado não há quem responda — e o
     painel pede para entrar, que é o combinado. */

  const canal = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("delfos-sessao") : null;
  canal?.addEventListener("message", (ev) => {
    const m = ev.data || {};
    if (m.tipo === "pedir" && logado() && ativo()) {
      const s = ler();
      canal.postMessage({ tipo: "token", token: s.token, expiraEm: s.expiraEm, usuario: s.usuario, manter: !!s.manter });
    }
    // Saiu da conta em outra aba: esta também deixa de estar dentro.
    if (m.tipo === "saiu") {
      try { sessionStorage.removeItem(KEY); } catch { /* nada */ }
      if (!/(^|\/)entrar\.html$/.test(location.pathname)) location.replace("entrar.html?saiu=1");
    }
  });

  function pedirTokenAsOutrasAbas(esperaMs = 400) {
    if (!canal) return Promise.resolve(false);
    return new Promise((resolve) => {
      const aoReceber = (ev) => {
        if (ev.data?.tipo !== "token" || !ev.data.token) return;
        canal.removeEventListener("message", aoReceber);
        gravar({ token: ev.data.token, expiraEm: ev.data.expiraEm, usuario: ev.data.usuario, manter: ev.data.manter });
        resolve(true);
      };
      canal.addEventListener("message", aoReceber);
      canal.postMessage({ tipo: "pedir" });
      setTimeout(() => { canal.removeEventListener("message", aoReceber); resolve(false); }, esperaMs);
    });
  }

  // Roda assim que o script carrega, antes do script da página: sem conta,
  // esconde tudo e vai para a entrada. `saindo` avisa UI.iniciarPagina para
  // não disputar o redirecionamento (com o assistente de boas-vindas, p.ex.).
  let saindo = false;
  const naEntrada = /(^|\/)entrar\.html$/.test(location.pathname);
  if (ativo() && !logado() && !naEntrada) {
    saindo = true;
    document.documentElement.style.visibility = "hidden";
    pedirTokenAsOutrasAbas().then((achou) => {
      if (achou) location.reload();
      else location.replace(`entrar.html?volta=${encodeURIComponent(paginaAtual())}`);
    });
  }

  return {
    ativo, logado, usuario, api, nomeDoAparelho, normalizarEmail,
    saindo: () => saindo,
    pedir, ErroApi, problemaNaSenha,
    saude, cadastrar, entrar, recuperar, novoCodigoRecuperacao, sair, conta, trocarSenha, sairDosOutros, excluirConta,
    mantido: () => !!ler().manter,
    irParaEntrar, destinoDepoisDeEntrar,
  };
})();
