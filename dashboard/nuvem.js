/* ===========================================================================
   Nuvem — sincroniza o painel com o back end (pasta backend/ do repositório).

   Opcional: sem conectar, tudo continua como sempre foi, só no navegador.
   Conectado (Perfil → Sincronização na nuvem), cada mudança sobe sozinha
   pouco depois de feita, e cada página aberta confere se outro aparelho
   gravou algo antes.

   Como não perder nada:
   - Toda gravação diz em qual revisão da nuvem se baseou. Se outro aparelho
     gravou nesse meio-tempo, o servidor recusa (409) e aqui se pergunta ao
     usuário qual versão fica — nunca um aparelho apaga o outro em silêncio.
   - A versão que perde o conflito vai para "Versões anteriores" no servidor.
   - O servidor nunca apaga um anexo que alguma versão ainda cite.

   A configuração deste aparelho mora em `organizador.nuvem` no localStorage
   (mesmo prefixo das outras chaves — ver CLAUDE.md), separada do estado: o
   token e a revisão são do aparelho, não entram no backup nem sobem.
   =========================================================================== */

const Nuvem = (() => {
  const KEY = "organizador.nuvem";
  // Endereço do servidor já preenchido no formulário de conexão. Vazio até o
  // back end ser publicado — ver backend/README.md.
  const URL_PADRAO = "";
  const ESPERA_ENVIO_MS = 1200;
  const INTERVALO_CONFERENCIA_MS = 30 * 1000;

  let aplicandoRemoto = false;
  let temporizador = null;
  let envioEmCurso = null;
  let reenviar = false;
  let conflitoAberto = false;
  let mudancasLocais = 0;
  let ultimaConferencia = 0;

  /* ----------------------------- Configuração ----------------------------- */

  function ler() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
    catch { return {}; }
  }

  // Sempre relê antes de gravar: outra aba pode ter avançado a revisão.
  function gravar(patch) {
    const cfg = { ...ler(), ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* sem espaço: segue na memória */ }
    return cfg;
  }

  function conectado() {
    const c = ler();
    return !!(c.url && c.token);
  }

  function nomeDoAparelho() {
    const ua = navigator.userAgent;
    const navegador = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
      : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador";
    const sistema = /Android/.test(ua) ? "Android" : /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad"
      : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
    return sistema ? `${navegador} no ${sistema}` : navegador;
  }

  /* ------------------------------ Requisições ----------------------------- */

  class ErroNuvem extends Error {
    constructor(mensagem, status = 0, dados = {}) {
      super(mensagem);
      this.status = status;
      this.dados = dados;
    }
  }

  async function pedir(metodo, caminho, { corpo, tipo, bruto = false, semToken = false, url } = {}) {
    const cfg = ler();
    const base = url || cfg.url;
    if (!base) throw new ErroNuvem("Nenhum servidor configurado.");
    const headers = {};
    if (!semToken) headers.Authorization = `Bearer ${cfg.token || ""}`;
    if (tipo) headers["Content-Type"] = tipo;

    let r;
    try {
      r = await fetch(base + caminho, { method: metodo, headers, body: corpo });
    } catch {
      throw new ErroNuvem("Sem conexão com o servidor. As mudanças ficam guardadas aqui e sobem quando a conexão voltar.");
    }

    if (bruto && r.ok) return r;
    let dados = {};
    try { dados = await r.json(); } catch { /* resposta sem corpo */ }

    if (r.status === 401 && !semToken) {
      // Token vencido ou senha trocada no servidor: guarda o endereço e a
      // revisão, só pede a senha de novo.
      gravar({ token: "", ultimoErro: "Sessão expirada — entre de novo com a senha." });
    }
    if (!r.ok) throw new ErroNuvem(dados.erro || `O servidor respondeu ${r.status}.`, r.status, dados);
    return dados;
  }

  /* ----------------------------- Estado local ----------------------------- */

  function temDadosLocais() {
    const e = Store.estado();
    const n =
      e.financeiro.transacoes.length + e.financeiro.metas.length + e.financeiro.contas.length +
      e.financeiro.cartoes.length + e.financeiro.investimentos.length + e.faculdade.disciplinas.length +
      e.faculdade.prazos.length + e.projetos.length + e.oportunidades.length +
      (e.pessoal?.compromissos?.length || 0) + (e.pilares?.length || 0);
    return n > 0;
  }

  /** Troca o estado deste navegador pelo que veio da nuvem, sem reenviar. */
  function aplicarRemoto(remoto) {
    aplicandoRemoto = true;
    try { Store.substituir(remoto.estado); }
    finally { aplicandoRemoto = false; }
    gravar({ revisao: remoto.revisao, pendente: false, ultimaSync: new Date().toISOString(), ultimoErro: "" });
  }

  function recarregarPagina() {
    // Vindo do assistente de boas-vindas, o estado da nuvem já tem perfil
    // configurado: segue para a visão geral em vez de reabrir o assistente.
    if (/bemvindo\.html$/.test(location.pathname)) location.href = "index.html";
    else location.reload();
  }

  /* ------------------------------ Envio ----------------------------------- */

  function aoMudarLocal() {
    if (aplicandoRemoto || !conectado()) return;
    mudancasLocais++;
    gravar({ pendente: true });
    clearTimeout(temporizador);
    temporizador = setTimeout(() => enviar(), ESPERA_ENVIO_MS);
  }

  /**
   * Sobe o estado. Só um envio por vez; mudanças que chegam durante um
   * envio disparam outro logo depois.
   */
  function enviar({ forcar = false, motivo = "" } = {}) {
    if (!conectado()) return Promise.resolve();
    if (envioEmCurso) { reenviar = true; return envioEmCurso; }

    envioEmCurso = (async () => {
      const cfg = ler();
      const marca = mudancasLocais;
      const params = new URLSearchParams({ base: String(cfg.revisao || 0), dispositivo: nomeDoAparelho() });
      if (forcar) params.set("forcar", "1");
      if (motivo) params.set("motivo", motivo);
      try {
        const r = await pedir("PUT", `/api/estado?${params}`, { corpo: JSON.stringify(Store.estado()), tipo: "application/json" });
        gravar({
          revisao: r.revisao,
          pendente: mudancasLocais !== marca,
          ultimaSync: new Date().toISOString(),
          ultimoErro: "",
        });
        enviarAnexos();
      } catch (e) {
        // Sem await: a escolha do conflito pode chamar enviar({ forcar }) de
        // novo, e esperar aqui dentro travaria um envio no outro.
        if (e.status === 409) { resolverConflito(); return; }
        gravar({ ultimoErro: e.message });
      }
    })().finally(() => {
      envioEmCurso = null;
      if (reenviar) { reenviar = false; enviar(); }
    });
    return envioEmCurso;
  }

  /* ----------------------------- Recebimento ------------------------------ */

  /**
   * Confere se a nuvem mudou. `aoAbrir`: a página acabou de carregar, então
   * trocar o estado e recarregar não atrapalha ninguém. Fora disso (a aba
   * voltou ao foco), o estado é atualizado e um aviso oferece recarregar —
   * nunca recarrega sozinho no meio do que a pessoa está fazendo.
   */
  async function conferir({ aoAbrir = false } = {}) {
    if (!conectado()) return;
    ultimaConferencia = Date.now();
    const cfg = ler();
    let r;
    try {
      r = await pedir("GET", `/api/estado?desde=${cfg.revisao || 0}`);
    } catch (e) {
      gravar({ ultimoErro: e.message });
      return;
    }

    if (r.inalterado) {
      gravar({ ultimaSync: new Date().toISOString(), ultimoErro: "" });
      if (cfg.pendente) enviar();
      return;
    }
    // Nuvem vazia (servidor novo ou banco recriado): este aparelho repovoa.
    if (!r.estado) {
      gravar({ revisao: 0 });
      return enviar();
    }
    if (cfg.pendente) return resolverConflito(r);

    aplicarRemoto(r);
    if (aoAbrir) return recarregarPagina();
    UI.toast(`Chegaram mudanças de ${r.dispositivo || "outro aparelho"}.`, {
      acaoRotulo: "Recarregar", aoAcionar: recarregarPagina, duracao: 8000,
    });
  }

  /* ------------------------------ Conflito -------------------------------- */

  function quandoLegivel(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  /** Modal com duas saídas explícitas. Resolve com o `valor` escolhido ou null. */
  function escolher({ titulo, descricao, nota, opcoes }) {
    const esc = UI.fmt.escape;
    return new Promise((resolve) => {
      UI.abrirModal(`
        <div class="modal-head">
          <h2 class="modal-title">${esc(titulo)}</h2>
          <p class="modal-desc">${esc(descricao)}</p>
        </div>
        <div class="modal-body">
          ${opcoes.map((o) => `
            <button class="btn ${o.primario ? "primary" : ""} block" data-valor="${esc(o.valor)}" type="button">${esc(o.rotulo)}</button>
            ${o.dica ? `<span class="hint">${esc(o.dica)}</span>` : ""}`).join("")}
          ${nota ? `<span class="hint">${esc(nota)}</span>` : ""}
        </div>
        <div class="modal-foot"><button class="btn" data-valor="" type="button">Decidir depois</button></div>`, {
        aoMontar(modal, fechar) {
          modal.addEventListener("click", (ev) => {
            const b = ev.target.closest("[data-valor]");
            if (b) fechar(b.dataset.valor || null);
          });
        },
        aoFechar: (v) => resolve(v || null),
      });
    });
  }

  async function resolverConflito(remoto) {
    if (conflitoAberto) return;
    conflitoAberto = true;
    try {
      if (!remoto) remoto = await pedir("GET", "/api/estado");
      const quem = remoto.dispositivo || "Outro aparelho";
      const escolha = await escolher({
        titulo: "Mudanças nos dois lugares",
        descricao: `Este aparelho tem alterações que ainda não subiram, e ${quem} salvou na nuvem em ${quandoLegivel(remoto.atualizadoEm)}. Qual versão fica valendo?`,
        nota: "A versão que não ficar não se perde: vai para Versões anteriores, em Sincronização na nuvem.",
        opcoes: [
          { valor: "local", rotulo: "Ficar com a deste aparelho", primario: true },
          { valor: "nuvem", rotulo: `Ficar com a da nuvem (${quem})` },
        ],
      });

      if (escolha === "local") {
        await enviar({ forcar: true, motivo: `Substituída por ${nomeDoAparelho()} num conflito` });
        UI.toast("Versão deste aparelho enviada.");
      } else if (escolha === "nuvem") {
        await guardarCopiaLocal(`Deste aparelho (${nomeDoAparelho()}), antes de ficar com a da nuvem`);
        aplicarRemoto(remoto);
        recarregarPagina();
      } else {
        gravar({ ultimoErro: "Conflito aguardando decisão — ele volta a aparecer na próxima página aberta." });
      }
    } catch (e) {
      gravar({ ultimoErro: e.message });
      UI.toast(e.message);
    } finally {
      conflitoAberto = false;
    }
  }

  function guardarCopiaLocal(motivo) {
    const params = new URLSearchParams({ motivo, dispositivo: nomeDoAparelho() });
    return pedir("POST", `/api/versoes?${params}`, { corpo: JSON.stringify(Store.estado()), tipo: "application/json" });
  }

  /* ------------------------------- Anexos --------------------------------- */

  /**
   * Sobe os anexos deste navegador que o estado cita e a nuvem ainda não
   * tem. Só os citados: um arquivo solto (já tirado do painel) seria apagado
   * pela limpeza do servidor e reenviado daqui para sempre.
   */
  let enviandoAnexos = false;
  async function enviarAnexos() {
    if (enviandoAnexos || !conectado() || typeof Arquivos === "undefined" || !Arquivos.disponivel) return;
    enviandoAnexos = true;
    try {
      const citados = new Set(JSON.stringify(Store.estado()).match(/arq-[a-z0-9]+-[a-z0-9]+/g) || []);
      const locais = (await Arquivos.ids()).filter((id) => citados.has(id));
      if (!locais.length) return;
      const { arquivos } = await pedir("GET", "/api/arquivos");
      const naNuvem = new Set(arquivos.map((a) => a.id));
      for (const id of locais.filter((i) => !naNuvem.has(i))) {
        const b = await Arquivos.blob({ id, tipo: "" }, { soLocal: true });
        if (!b) continue;
        await pedir("PUT", `/api/arquivos/${encodeURIComponent(id)}`, { corpo: b, tipo: b.type || "application/octet-stream" });
      }
    } catch (e) {
      gravar({ ultimoErro: `Anexos: ${e.message}` });
    } finally {
      enviandoAnexos = false;
    }
  }

  /** Busca na nuvem um anexo que não está neste navegador (usado por Arquivos.blob). */
  async function baixarAnexo(id) {
    if (!conectado()) return null;
    try {
      const r = await pedir("GET", `/api/arquivos/${encodeURIComponent(id)}`, { bruto: true });
      return await r.blob();
    } catch {
      return null;
    }
  }

  /* ------------------------------- Conexão -------------------------------- */

  function normalizarUrl(url) {
    let u = String(url || "").trim().replace(/\/+$/, "");
    if (u && !/^https?:\/\//i.test(u)) u = `https://${u}`;
    return u;
  }

  /**
   * Primeira conexão deste aparelho (ou nova senha depois de a sessão vencer).
   * Decide para que lado os dados vão quando os dois lados já têm algo.
   */
  async function conectar(url, senha) {
    const endereco = normalizarUrl(url);
    if (!endereco) throw new ErroNuvem("Informe o endereço do servidor.");

    const { token, expiraEm } = await pedir("POST", "/api/entrar", {
      url: endereco, semToken: true, corpo: JSON.stringify({ senha }), tipo: "application/json",
    });

    const anterior = ler();
    const mesmoServidor = anterior.url === endereco && anterior.revisao > 0;
    gravar({
      url: endereco, token, expiraEm, ultimoErro: "",
      ...(mesmoServidor ? {} : { revisao: 0, pendente: false, ultimaSync: "" }),
    });

    // Só renovou a sessão: segue a vida normal, com a checagem de conflito de sempre.
    if (mesmoServidor) return conferir({ aoAbrir: true });

    const remoto = await pedir("GET", "/api/estado");
    if (!remoto.estado) {
      await enviar();
      return "enviado";
    }
    if (!temDadosLocais()) {
      aplicarRemoto(remoto);
      recarregarPagina();
      return "recebido";
    }

    const escolha = await escolher({
      titulo: "A nuvem já tem dados",
      descricao: `A nuvem tem dados salvos por ${remoto.dispositivo || "outro aparelho"} em ${quandoLegivel(remoto.atualizadoEm)}, e este aparelho também tem os seus. Qual fica valendo?`,
      nota: "O que não ficar vai para Versões anteriores, então dá para voltar atrás.",
      opcoes: [
        { valor: "nuvem", rotulo: "Usar os dados da nuvem", primario: true, dica: "O certo num aparelho novo." },
        { valor: "local", rotulo: "Enviar os deste aparelho para a nuvem", dica: "A nuvem passa a ter o que está aqui." },
      ],
    });
    if (escolha === "nuvem") {
      await guardarCopiaLocal(`De ${nomeDoAparelho()}, antes de conectar`);
      aplicarRemoto(remoto);
      recarregarPagina();
      return "recebido";
    }
    if (escolha === "local") {
      gravar({ revisao: remoto.revisao });
      await enviar({ forcar: true, motivo: `Substituída ao conectar ${nomeDoAparelho()}` });
      return "enviado";
    }
    // Não decidiu: desfaz a conexão para não sincronizar nada sem escolha.
    desconectar();
    return "cancelado";
  }

  function desconectar() {
    const { url } = ler();
    try { localStorage.setItem(KEY, JSON.stringify({ url })); } catch { /* nada a fazer */ }
  }

  /* ------------------------------ Situação -------------------------------- */

  function situacao() {
    const c = ler();
    if (!c.url || !c.token) {
      return { conectado: false, texto: c.url && c.ultimoErro ? c.ultimoErro : "Só neste navegador — não sincroniza." };
    }
    if (c.ultimoErro) return { conectado: true, texto: c.ultimoErro, erro: true };
    if (c.pendente) return { conectado: true, texto: "Há mudanças aguardando envio." };
    return { conectado: true, texto: c.ultimaSync ? `Sincronizado em ${quandoLegivel(c.ultimaSync)}.` : "Conectado." };
  }

  /* ------------------------------- Telas ---------------------------------- */

  function abrirPainel() {
    const cfg = ler();
    const esc = UI.fmt.escape;
    const ligado = !!(cfg.url && cfg.token);
    const s = situacao();

    const corpoDesconectado = () => `
      <div class="field">
        <label for="nuvem-url">Endereço do servidor</label>
        <input type="text" id="nuvem-url" value="${esc(cfg.url || URL_PADRAO)}" placeholder="https://delfos-api.seu-nome.workers.dev" autocomplete="url" />
        <span class="hint">Aparece no fim da publicação do servidor — ver backend/README.md.</span>
      </div>
      <div class="field">
        <label for="nuvem-senha">Senha</label>
        <input type="password" id="nuvem-senha" autocomplete="current-password" />
      </div>
      <span class="hint" data-erro>${cfg.ultimoErro ? esc(cfg.ultimoErro) : ""}</span>`;

    // Funções, não textos: só a que vale é montada (a outra leria cfg.url vazio).
    const corpoConectado = () => `
      <dl class="ficha">
        <div><dt>Servidor</dt><dd>${esc(cfg.url.replace(/^https?:\/\//, ""))}</dd></div>
        <div><dt>Situação</dt><dd>${esc(s.texto)}</dd></div>
        <div><dt>Este aparelho</dt><dd>${esc(nomeDoAparelho())}</dd></div>
        <div><dt>Revisão</dt><dd>${esc(String(cfg.revisao || 0))}</dd></div>
      </dl>
      <button class="btn primary block" data-acao="sincronizar" type="button">↻ Sincronizar agora</button>
      <button class="btn block" data-acao="versoes" type="button">Versões anteriores</button>
      <button class="btn ghost block" data-acao="desconectar" type="button">Desconectar este aparelho</button>
      <span class="hint">Desconectar não apaga nada: os dados ficam aqui e na nuvem, só param de se falar.</span>`;

    UI.abrirModal(`
      <div class="modal-head">
        <h2 class="modal-title">Sincronização na nuvem</h2>
        <p class="modal-desc">${ligado
          ? "Cada mudança sobe sozinha e aparece nos outros aparelhos conectados."
          : "Conecte para ter os mesmos dados no celular e no computador, com anexos e versões anteriores guardados no seu servidor."}</p>
      </div>
      <div class="modal-body">${ligado ? corpoConectado() : corpoDesconectado()}</div>
      <div class="modal-foot">
        <button class="btn" data-acao="fechar" type="button">Fechar</button>
        ${ligado ? "" : `<button class="btn primary" data-acao="conectar" type="button">Conectar</button>`}
      </div>`, {
      aoMontar(modal, fechar) {
        modal.querySelector('[data-acao="fechar"]').addEventListener("click", () => fechar(null));

        const btnConectar = modal.querySelector('[data-acao="conectar"]');
        if (btnConectar) {
          const senha = modal.querySelector("#nuvem-senha");
          (cfg.url || URL_PADRAO ? senha : modal.querySelector("#nuvem-url")).focus();
          const tentar = async () => {
            btnConectar.disabled = true;
            btnConectar.textContent = "Conectando…";
            try {
              const r = await conectar(modal.querySelector("#nuvem-url").value, senha.value);
              fechar(null);
              if (r === "enviado") UI.toast("Conectado. Os dados deste aparelho estão na nuvem.");
              else if (r === "cancelado") UI.toast("Conexão cancelada — nada foi alterado.");
            } catch (e) {
              modal.querySelector("[data-erro]").textContent = e.message;
              btnConectar.disabled = false;
              btnConectar.textContent = "Conectar";
            }
          };
          btnConectar.addEventListener("click", tentar);
          senha.addEventListener("keydown", (e) => { if (e.key === "Enter") tentar(); });
        }

        modal.querySelector('[data-acao="sincronizar"]')?.addEventListener("click", async (ev) => {
          ev.target.disabled = true;
          ev.target.textContent = "Sincronizando…";
          await conferir();
          if (ler().pendente) await enviar();
          fechar(null);
          UI.toast(situacao().texto);
        });

        modal.querySelector('[data-acao="versoes"]')?.addEventListener("click", () => {
          fechar(null);
          abrirVersoes();
        });

        modal.querySelector('[data-acao="desconectar"]')?.addEventListener("click", async () => {
          const ok = await UI.confirmar({
            titulo: "Desconectar este aparelho?",
            descricao: "Os dados continuam aqui e na nuvem. Este aparelho só para de enviar e receber mudanças.",
            rotuloConfirmar: "Desconectar",
          });
          if (!ok) return;
          desconectar();
          fechar(null);
          UI.toast("Aparelho desconectado da nuvem.");
        });
      },
    });
  }

  async function abrirVersoes() {
    let versoes;
    try { ({ versoes } = await pedir("GET", "/api/versoes")); }
    catch (e) { return UI.toast(e.message); }

    const esc = UI.fmt.escape;
    UI.abrirModal(`
      <div class="modal-head">
        <h2 class="modal-title">Versões anteriores</h2>
        <p class="modal-desc">Cópias que o servidor guarda sozinho (no máximo uma a cada 10 minutos de uso) e toda versão que perdeu um conflito. Ficam as 60 mais recentes.</p>
      </div>
      <div class="modal-body">
        ${versoes.length ? `<ul class="list">${versoes.map((v) => `
          <li>
            <span class="grow">
              <span class="title">${esc(quandoLegivel(v.salvoEm))}</span>
              <span class="meta">${esc([v.dispositivo, v.motivo || "Cópia automática", `${Math.max(1, Math.round(v.tamanho / 1024))} KB`].filter(Boolean).join(" — "))}</span>
            </span>
            <button class="btn sm" data-restaurar="${v.id}" data-quando="${esc(quandoLegivel(v.salvoEm))}" type="button">Restaurar</button>
          </li>`).join("")}</ul>`
          : `<p class="card-note" style="margin:0;">Nenhuma versão guardada ainda. Elas aparecem conforme você usa o painel.</p>`}
      </div>
      <div class="modal-foot"><button class="btn" data-acao="fechar" type="button">Fechar</button></div>`, {
      classe: "wide",
      aoMontar(modal, fechar) {
        modal.querySelector('[data-acao="fechar"]').addEventListener("click", () => fechar(null));
        modal.addEventListener("click", async (ev) => {
          const b = ev.target.closest("[data-restaurar]");
          if (!b) return;
          const ok = await UI.confirmar({
            titulo: `Restaurar a versão de ${b.dataset.quando}?`,
            descricao: "Ela passa a valer em todos os aparelhos. A versão de agora vira uma cópia na lista, então dá para desfazer.",
            rotuloConfirmar: "Restaurar",
          });
          if (!ok) return;
          try {
            const v = await pedir("GET", `/api/versoes/${b.dataset.restaurar}`);
            aplicandoRemoto = true;
            try { Store.substituir(v.estado); } finally { aplicandoRemoto = false; }
            gravar({ pendente: true });
            await enviar({ forcar: true, motivo: `Antes de restaurar a versão de ${b.dataset.quando}` });
            fechar(null);
            recarregarPagina();
          } catch (e) {
            UI.toast(e.message);
          }
        });
      },
    });
  }

  /* ------------------------------- Início --------------------------------- */

  function iniciar() {
    Store.aoMudar(aoMudarLocal);
    if (!conectado()) return;
    conferir({ aoAbrir: true }).then(() => enviarAnexos());

    // Voltou para a aba depois de um tempo: talvez o celular tenha mudado algo.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && Date.now() - ultimaConferencia > INTERVALO_CONFERENCIA_MS) conferir();
      // Saindo da aba com mudança na fila: tenta subir já, sem esperar o temporizador.
      if (document.visibilityState === "hidden" && ler().pendente) { clearTimeout(temporizador); enviar(); }
    });
    window.addEventListener("online", () => { if (ler().pendente) enviar(); });
  }

  iniciar();

  return { conectado, situacao, abrirPainel, baixarAnexo, enviar, conferir };
})();
