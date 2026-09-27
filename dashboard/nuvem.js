/* ===========================================================================
   Nuvem — sincroniza o painel com a conta do usuário no back end.

   Quem cuida do login é sessao.js; aqui fica o que acontece com os dados:
   cada mudança sobe sozinha pouco depois de feita, e cada página aberta
   confere se outro aparelho da mesma conta gravou algo antes.

   Como não perder nada:
   - Toda gravação diz em qual revisão da nuvem se baseou. Se outro aparelho
     gravou nesse meio-tempo, o servidor recusa (409) e aqui se pergunta ao
     usuário qual versão fica — nunca um aparelho apaga o outro em silêncio.
   - A versão que perde o conflito vai para "Versões anteriores".
   - O servidor nunca apaga um anexo que alguma versão ainda cite.

   Como um navegador nunca mistura duas contas:
   - `usuarioId` (em `organizador.nuvem`) diz de quem são os dados que estão
     neste navegador. Só sincroniza quando ele é o da sessão aberta.
   - Sair da conta apaga os dados deste navegador (eles continuam na nuvem).
   - Entrar com outra conta num navegador que ainda tem dados de alguém
     apaga esses dados antes de baixar os da conta nova.
   =========================================================================== */

const Nuvem = (() => {
  const KEY = "organizador.nuvem";
  const ESPERA_ENVIO_MS = 1200;
  const INTERVALO_CONFERENCIA_MS = 30 * 1000;

  let aplicandoRemoto = false;
  let temporizador = null;
  let envioEmCurso = null;
  let reenviar = false;
  let conflitoAberto = false;
  let mudancasLocais = 0;
  let ultimaConferencia = 0;

  const pedir = (...args) => Sessao.pedir(...args);
  const esc = (s) => UI.fmt.escape(s);

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

  /** Sincroniza só com sessão aberta e dados deste navegador sendo da mesma conta. */
  function conectado() {
    const u = Sessao.usuario();
    return Sessao.ativo() && Sessao.logado() && !!u && ler().usuarioId === u.id;
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

  /** Apaga estado e anexos deste navegador (não mexe na nuvem). */
  async function apagarDadosLocais() {
    clearTimeout(temporizador);
    aplicandoRemoto = true;
    try { await Store.limpar(); }
    finally { aplicandoRemoto = false; }
    try { localStorage.removeItem(KEY); } catch { /* nada */ }
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
      const params = new URLSearchParams({ base: String(cfg.revisao || 0), dispositivo: Sessao.nomeDoAparelho() });
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
      if (cfg.pendente) await enviar();
      return;
    }
    // Nuvem vazia (conta nova, ou banco recriado): este aparelho repovoa.
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

  /**
   * Modal com saídas explícitas. Resolve com o `valor` escolhido, ou null se
   * a pessoa adiar (só quando `adiavel`; senão, fechar escolhe a primeira).
   */
  function escolher({ titulo, descricao, nota, opcoes, adiavel = true }) {
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
        ${adiavel ? `<div class="modal-foot"><button class="btn" data-valor="" type="button">Decidir depois</button></div>` : ""}`, {
        aoMontar(modal, fechar) {
          modal.addEventListener("click", (ev) => {
            const b = ev.target.closest("[data-valor]");
            if (b) fechar(b.dataset.valor || null);
          });
        },
        aoFechar: (v) => resolve(v || (adiavel ? null : opcoes[0].valor)),
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
        nota: "A versão que não ficar não se perde: vai para Versões anteriores, em Conta e sincronização.",
        opcoes: [
          { valor: "local", rotulo: "Ficar com a deste aparelho", primario: true },
          { valor: "nuvem", rotulo: `Ficar com a da nuvem (${quem})` },
        ],
      });

      if (escolha === "local") {
        await enviar({ forcar: true, motivo: `Substituída por ${Sessao.nomeDoAparelho()} num conflito` });
        UI.toast("Versão deste aparelho enviada.");
      } else if (escolha === "nuvem") {
        await guardarCopiaLocal(`Deste aparelho (${Sessao.nomeDoAparelho()}), antes de ficar com a da nuvem`);
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
    const params = new URLSearchParams({ motivo, dispositivo: Sessao.nomeDoAparelho() });
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

  /* --------------------------- Entrar e sair ------------------------------ */

  /**
   * Chamado por entrar.js logo depois do login ou do cadastro. Decide o que
   * fazer com os dados que já estão neste navegador antes de liberar o painel.
   */
  async function aposEntrar(usuario, { novaConta = false, nome = "" } = {}) {
    const cfg = ler();

    if (cfg.usuarioId === usuario.id) {
      // A mesma pessoa de volta (a sessão tinha vencido): o que ficou
      // pendente sobe, com a checagem de conflito de sempre.
      await conferir();
    } else {
      // Dados de outra conta neste navegador: não podem ser vistos nem subir.
      if (cfg.usuarioId) await apagarDadosLocais();
      await adotarDados(usuario);
    }

    if (novaConta) {
      const p = Store.estado().perfil;
      Store.definirPerfil({ nome: p.nome || nome, email: p.email || usuario.email });
      await enviar();
    }
  }

  /** Navegador sem dono (dados de antes das contas, ou vazio) + conta recém-aberta. */
  async function adotarDados(usuario) {
    const remoto = await pedir("GET", "/api/estado");
    const locais = temDadosLocais();

    if (remoto.estado) {
      let escolha = "nuvem";
      if (locais) {
        escolha = await escolher({
          titulo: "Sua conta já tem dados",
          descricao: `Sua conta tem dados salvos por ${remoto.dispositivo || "outro aparelho"} em ${quandoLegivel(remoto.atualizadoEm)}, e este navegador também tem os seus. Qual fica valendo?`,
          nota: "O que não ficar vai para Versões anteriores, então dá para voltar atrás.",
          adiavel: false,
          opcoes: [
            { valor: "nuvem", rotulo: "Usar os dados da conta", primario: true, dica: "O certo num aparelho novo." },
            { valor: "local", rotulo: "Enviar os deste navegador para a conta", dica: "A conta passa a ter o que está aqui." },
          ],
        });
      }
      gravar({ usuarioId: usuario.id, revisao: remoto.revisao, pendente: false });
      if (escolha === "local") {
        await enviar({ forcar: true, motivo: `Substituída ao entrar em ${Sessao.nomeDoAparelho()}` });
      } else {
        if (locais) await guardarCopiaLocal(`De ${Sessao.nomeDoAparelho()}, antes de entrar na conta`);
        aplicarRemoto(remoto);
      }
      return;
    }

    // Conta vazia na nuvem.
    let levar = false;
    if (locais) {
      levar = (await escolher({
        titulo: "Este navegador já tem dados",
        descricao: "Há coisas cadastradas neste navegador de antes de você ter conta. Quer levá-las para a sua conta?",
        adiavel: false,
        opcoes: [
          { valor: "levar", rotulo: "Levar para a minha conta", primario: true, dica: "Tudo o que está aqui passa a ser seu, em todos os aparelhos." },
          { valor: "zero", rotulo: "Começar do zero", dica: "O que está neste navegador é apagado daqui." },
        ],
      })) === "levar";
      if (!levar) await apagarDadosLocais();
    }
    gravar({ usuarioId: usuario.id, revisao: 0, pendente: levar });
    if (levar) await enviar();
  }

  /** Sai da conta: sobe o que faltar, encerra a sessão e limpa este navegador. */
  async function sairDaConta() {
    if (ler().pendente) await enviar();
    if (ler().pendente) {
      const ok = await UI.confirmar({
        titulo: "Sair sem enviar as últimas mudanças?",
        descricao: "Algumas mudanças ainda não chegaram à nuvem (sem conexão?). Sair agora apaga este navegador, e elas se perdem. Tente de novo quando a conexão voltar.",
        rotuloConfirmar: "Sair mesmo assim",
        perigo: true,
      });
      if (!ok) return;
    }
    await Sessao.sair();
    await apagarDadosLocais();
    location.replace("entrar.html?saiu=1");
  }

  /* ------------------------------ Situação -------------------------------- */

  function situacao() {
    if (!Sessao.ativo()) {
      return { texto: "Contas desligadas até o servidor ser publicado — os dados ficam só neste navegador." };
    }
    const u = Sessao.usuario();
    if (!Sessao.logado()) return { texto: "Sessão encerrada — entre de novo para sincronizar.", erro: true };
    const c = ler();
    const quem = u?.email || "";
    if (c.ultimoErro) return { texto: `${quem}: ${c.ultimoErro}`, erro: true };
    if (c.pendente) return { texto: `${quem}: mudanças aguardando envio.` };
    return { texto: c.ultimaSync ? `${quem}: sincronizado em ${quandoLegivel(c.ultimaSync)}.` : quem };
  }

  /* ------------------------------- Telas ---------------------------------- */

  /**
   * Formulário com campos de senha (UI.formulario não tem esse tipo, e senha
   * não deve passar por onde o navegador guardaria o valor em outro lugar).
   * `aoConfirmar` devolve uma mensagem de erro, ou "" para fechar.
   */
  function formularioSenha({ titulo, descricao, campos, rotuloConfirmar, perigo = false, aoConfirmar }) {
    UI.abrirModal(`
      <div class="modal-head">
        <h2 class="modal-title">${esc(titulo)}</h2>
        ${descricao ? `<p class="modal-desc">${esc(descricao)}</p>` : ""}
      </div>
      <form class="modal-body" novalidate>
        ${campos.map((c) => `
          <div class="field">
            <label for="f-${c.id}">${esc(c.rotulo)}</label>
            <input type="password" id="f-${c.id}" autocomplete="${c.autocomplete}" />
          </div>`).join("")}
        <span class="hint" data-erro style="color: var(--st-critical);"></span>
      </form>
      <div class="modal-foot">
        <button class="btn" data-acao="cancelar" type="button">Cancelar</button>
        <button class="btn ${perigo ? "danger" : "primary"}" data-acao="ok" type="button">${esc(rotuloConfirmar)}</button>
      </div>`, {
      aoMontar(modal, fechar) {
        const btn = modal.querySelector('[data-acao="ok"]');
        const erro = modal.querySelector("[data-erro]");
        modal.querySelector("input").focus();
        const confirmar = async () => {
          const valores = Object.fromEntries(campos.map((c) => [c.id, modal.querySelector(`#f-${c.id}`).value]));
          btn.disabled = true;
          btn.textContent = "Conferindo…";
          erro.textContent = "";
          let msg = "";
          try { msg = await aoConfirmar(valores); } catch (e) { msg = e.message; }
          if (!msg) return fechar(true);
          erro.textContent = msg;
          btn.disabled = false;
          btn.textContent = rotuloConfirmar;
        };
        btn.addEventListener("click", confirmar);
        modal.querySelector("form").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); confirmar(); } });
        modal.querySelector('[data-acao="cancelar"]').addEventListener("click", () => fechar(null));
      },
    });
  }

  /**
   * Mostra o código de recuperação — a única vez que ele existe em claro.
   * Só libera "Continuar" depois de a pessoa confirmar que guardou.
   */
  function mostrarCodigoRecuperacao(codigo, { introducao = "" } = {}) {
    return new Promise((resolve) => {
      UI.abrirModal(`
        <div class="modal-head">
          <h2 class="modal-title">Guarde seu código de recuperação</h2>
          <p class="modal-desc">${esc(introducao || "Este código substitui o anterior. É o único jeito de redefinir a senha se você esquecê-la.")}</p>
        </div>
        <div class="modal-body">
          <div class="codigo-recuperacao" data-codigo>${esc(codigo)}</div>
          <div style="display:flex; gap:8px;">
            <button class="btn block" data-acao="copiar" type="button">Copiar</button>
            <button class="btn block" data-acao="baixar" type="button">Baixar como arquivo</button>
          </div>
          <span class="hint">Guarde fora deste aparelho: num gerenciador de senhas, anotado em papel, numa foto no celular. Ele não aparece de novo, e o servidor não tem como mostrá-lo — guarda só uma impressão dele. Quem tiver o código e o seu e-mail consegue trocar sua senha, então trate-o como uma senha.</span>
          <label class="entrada-manter"><input type="checkbox" class="check" data-guardei /> <span>Guardei o código em lugar seguro</span></label>
        </div>
        <div class="modal-foot"><button class="btn primary" data-acao="ok" type="button" disabled>Continuar</button></div>`, {
        aoMontar(modal, fechar) {
          const ok = modal.querySelector('[data-acao="ok"]');
          modal.querySelector("[data-guardei]").addEventListener("change", (ev) => { ok.disabled = !ev.target.checked; });
          ok.addEventListener("click", () => fechar(true));
          modal.querySelector('[data-acao="copiar"]').addEventListener("click", async (ev) => {
            try { await navigator.clipboard.writeText(codigo); ev.target.textContent = "Copiado"; }
            catch { UI.toast("Não deu para copiar sozinho — selecione o código e copie."); }
          });
          modal.querySelector('[data-acao="baixar"]').addEventListener("click", () => {
            const email = Sessao.usuario()?.email || "";
            const texto = `Delfos — código de recuperação\n\nConta: ${email}\nCódigo: ${codigo}\nGerado em: ${new Date().toLocaleString("pt-BR")}\n\nUse em "Esqueci minha senha" na tela de entrada. Vale uma vez: ao usar, um código novo é gerado.\n`;
            const url = URL.createObjectURL(new Blob([texto], { type: "text/plain" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = "delfos-codigo-de-recuperacao.txt";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
          });
        },
        aoFechar: () => resolve(),
      });
    });
  }

  function abrirPainel() {
    if (!Sessao.ativo() || !Sessao.logado()) {
      UI.abrirModal(`
        <div class="modal-head">
          <h2 class="modal-title">Conta e sincronização</h2>
          <p class="modal-desc">${esc(situacao().texto)}</p>
        </div>
        <div class="modal-foot" style="padding-top: 20px;">
          ${Sessao.ativo() ? `<button class="btn primary" data-acao="entrar" type="button">Entrar</button>` : ""}
          <button class="btn" data-acao="fechar" type="button">Fechar</button>
        </div>`, {
        aoMontar(modal, fechar) {
          modal.querySelector('[data-acao="fechar"]').addEventListener("click", () => fechar(null));
          modal.querySelector('[data-acao="entrar"]')?.addEventListener("click", Sessao.irParaEntrar);
        },
      });
      return;
    }

    const u = Sessao.usuario();
    const s = situacao();
    UI.abrirModal(`
      <div class="modal-head">
        <h2 class="modal-title">Conta e sincronização</h2>
        <p class="modal-desc">Cada mudança sobe sozinha e aparece nos seus outros aparelhos.</p>
      </div>
      <div class="modal-body">
        <dl class="ficha">
          <div><dt>Conta</dt><dd>${esc(u.email)}</dd></div>
          <div><dt>Situação</dt><dd>${esc(s.texto.replace(`${u.email}: `, ""))}</dd></div>
          <div><dt>Este aparelho</dt><dd>${esc(Sessao.nomeDoAparelho())}</dd></div>
          <div><dt>Conectado</dt><dd data-validade>${Sessao.mantido() ? "…" : "até fechar o navegador"}</dd></div>
          <div><dt>Código de recuperação</dt><dd data-recuperacao>…</dd></div>
          <div><dt>Anexos na nuvem</dt><dd data-cota>…</dd></div>
        </dl>
        <button class="btn primary block" data-acao="sincronizar" type="button">${UI.icone("refazer")}Sincronizar agora</button>
        <button class="btn block" data-acao="versoes" type="button">Versões anteriores</button>
        <button class="btn block" data-acao="senha" type="button">Trocar senha</button>
        <button class="btn block" data-acao="codigo" type="button">Gerar novo código de recuperação</button>
        <button class="btn block" data-acao="outros" type="button">Sair dos outros aparelhos</button>
        <button class="btn block" data-acao="sair" type="button">Sair da conta</button>
        <span class="hint">Sair apaga os dados deste navegador — eles continuam na sua conta e voltam quando você entrar.</span>
        <button class="btn ghost danger block" data-acao="excluir" type="button">Excluir minha conta</button>
      </div>
      <div class="modal-foot"><button class="btn" data-acao="fechar" type="button">Fechar</button></div>`, {
      aoMontar(modal, fechar) {
        const acao = (nome, fn) => modal.querySelector(`[data-acao="${nome}"]`).addEventListener("click", fn);
        acao("fechar", () => fechar(null));

        Sessao.conta().then((c) => {
          const usado = Arquivos.tamanhoLegivel(c.anexos.usadoBytes);
          const limite = `${Math.round(c.anexos.limiteBytes / (1024 * 1024))} MB`;
          modal.querySelector("[data-cota]").textContent = `${usado} de ${limite}`;
          const gerado = c.usuario.codigoRecuperacaoGeradoEm;
          modal.querySelector("[data-recuperacao]").textContent = gerado
            ? `gerado em ${new Date(gerado).toLocaleDateString("pt-BR")}`
            : "nenhum — gere um";
          if (Sessao.mantido() && c.sessao?.expiraEm) {
            modal.querySelector("[data-validade]").textContent = `até ${new Date(c.sessao.expiraEm).toLocaleDateString("pt-BR")}`;
          }
        }).catch(() => {
          modal.querySelectorAll("[data-cota], [data-recuperacao]").forEach((el) => { el.textContent = "—"; });
        });

        acao("codigo", () => {
          fechar(null);
          formularioSenha({
            titulo: "Gerar novo código de recuperação",
            descricao: "O código que você tem hoje deixa de valer. Use se perdeu o anterior ou acha que alguém o viu.",
            rotuloConfirmar: "Gerar código",
            campos: [{ id: "senha", rotulo: "Sua senha, para confirmar", autocomplete: "current-password" }],
            async aoConfirmar(v) {
              const codigo = await Sessao.novoCodigoRecuperacao(v.senha);
              setTimeout(() => mostrarCodigoRecuperacao(codigo), 0);
              return "";
            },
          });
        });

        acao("sincronizar", async (ev) => {
          ev.currentTarget.disabled = true;
          ev.currentTarget.textContent = "Sincronizando…";
          await conferir();
          if (ler().pendente) await enviar();
          fechar(null);
          UI.toast(situacao().texto);
        });

        acao("versoes", () => { fechar(null); abrirVersoes(); });

        acao("senha", () => {
          fechar(null);
          formularioSenha({
            titulo: "Trocar senha",
            descricao: "Os seus outros aparelhos vão pedir a senha nova. Este continua conectado.",
            rotuloConfirmar: "Trocar senha",
            campos: [
              { id: "atual", rotulo: "Senha atual", autocomplete: "current-password" },
              { id: "nova", rotulo: "Senha nova (mínimo 8 caracteres)", autocomplete: "new-password" },
              { id: "conf", rotulo: "Repita a senha nova", autocomplete: "new-password" },
            ],
            async aoConfirmar(v) {
              const problema = await Sessao.problemaNaSenha(v.nova, v.conf);
              if (problema) return problema;
              await Sessao.trocarSenha(v.atual, v.nova);
              UI.toast("Senha trocada.");
              return "";
            },
          });
        });

        acao("outros", async () => {
          const ok = await UI.confirmar({
            titulo: "Sair dos outros aparelhos?",
            descricao: "Todo aparelho conectado à sua conta, menos este, vai pedir a senha de novo. Use se perdeu um celular ou entrou num computador que não é seu.",
            rotuloConfirmar: "Sair dos outros",
          });
          if (!ok) return;
          try { await Sessao.sairDosOutros(); UI.toast("Os outros aparelhos foram desconectados."); }
          catch (e) { UI.toast(e.message); }
        });

        acao("sair", async () => { fechar(null); await sairDaConta(); });

        acao("excluir", () => {
          fechar(null);
          formularioSenha({
            titulo: "Excluir sua conta?",
            descricao: "Apaga para sempre a conta e tudo nela — dados, anexos e versões anteriores — do servidor e deste navegador. Não dá para desfazer. Se quiser guardar algo, exporte um backup antes (Perfil → Backup e dados).",
            rotuloConfirmar: "Excluir para sempre",
            perigo: true,
            campos: [{ id: "senha", rotulo: "Sua senha, para confirmar", autocomplete: "current-password" }],
            async aoConfirmar(v) {
              await Sessao.excluirConta(v.senha);
              await apagarDadosLocais();
              location.replace("entrar.html?excluida=1");
              return "";
            },
          });
        });
      },
    });
  }

  async function abrirVersoes() {
    let versoes;
    try { ({ versoes } = await pedir("GET", "/api/versoes")); }
    catch (e) { return UI.toast(e.message); }

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
    if (!conectado() || Sessao.saindo()) return;
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

  return {
    conectado, situacao, abrirPainel, baixarAnexo, enviar, conferir, aposEntrar, sairDaConta,
    mostrarCodigoRecuperacao,
  };
})();
