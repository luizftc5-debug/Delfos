/* ===========================================================================
   Abas: o criador e o editor das abas do usuário, montadas pelo Delfos.

   A pessoa escreve o nome e o propósito da aba. A cada pausa na digitação o
   Delfos (delfos.js, a IA do painel, que roda neste aparelho) lê os dois e
   devolve a aba montada: ícone, cor, o que é cada registro, campos, meta,
   agrupamento, vista e se entra na agenda ou é marcada por dia. A janela
   mostra "O que o Delfos entendeu", frase a frase, e a prévia da página.

   Se a pessoa já mexeu em algo à mão, uma leitura nova não passa por cima:
   aparece o botão "Aplicar o que o Delfos entendeu".

   Este arquivo e o delfos.js só são baixados quando alguém abre "Nova aba"
   ou "Personalizar" (UI.abrirCriadorDeAbas): ninguém paga por eles ao abrir
   as outras páginas.

   Tudo o que sai do Delfos ainda passa por `sanear`, que corta para os
   ícones, cores, tipos de campo e vistas que o painel sabe desenhar.
   =========================================================================== */

const Abas = (() => {
  const { fmt, icone } = UI;
  const esc = fmt.escape;

  /* ------------------------------- Saneamento ------------------------------- */

  const TIPOS = new Set(Store.TIPOS_CAMPO.map((t) => t.valor));
  const RESERVADOS = new Set(["descricao", "data", "concluido", "id", "extras", "feitos", "criadoEm", "concluidoEm"]);
  const VISTAS = [["lista", "Lista", "lista"], ["cartoes", "Cartões", "grade"], ["quadro", "Quadro", "quadro"], ["tabela", "Tabela", "tabela"], ["calendario", "Calendário", "calendario"]];
  const ORDENS = new Set(["auto", "recentes", "data", "az"]);
  const SEM_META = { tipo: "nenhuma", campoId: "", alvo: 0, periodo: "mes" };
  const inicialMinuscula = (s) => String(s || "").replace(/^\p{Lu}(?!\p{Lu})/u, (l) => l.toLowerCase());
  const corta = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const normalizar = (s) => Delfos.normal(s);

  function iconeValido(v) {
    if (typeof v !== "string") return false;
    if (v.startsWith("svg:")) return UI.ICONES_ABA.includes(v.slice(4));
    return Store.ICONES_PILAR.includes(v);
  }

  /** Corta o que veio do Delfos para o que o painel sabe desenhar. */
  function sanear(s, nome) {
    const base = Delfos.entender({ nome }).sugestao;
    const out = {};
    out.icone = iconeValido(s?.icone) ? s.icone : iconeValido(base.icone) ? base.icone : "svg:estrela";
    const paleta = Store.PALETA_PILAR.map((x) => x.valor);
    out.cor = paleta.includes(s?.cor) ? s.cor : base.cor;
    out.descricao = corta(s?.descricao, 160);
    out.rotuloItem = corta(s?.rotuloItem, 30).toLowerCase() || base.rotuloItem;
    out.naAgenda = typeof s?.naAgenda === "boolean" ? s.naAgenda : base.naAgenda;
    out.checkin = typeof s?.checkin === "boolean" ? s.checkin : false;
    out.especial = s?.especial === "academia" ? "academia" : "";
    const ids = new Set();
    out.campos = (Array.isArray(s?.campos) ? s.campos : []).slice(0, 8).map((x) => {
      const tipo = TIPOS.has(x?.tipo) ? x.tipo : "text";
      let id = normalizar(x?.id || x?.rotulo).replace(/\s+(\w)/g, (_, l) => l.toUpperCase()).replace(/\s/g, "").slice(0, 24) || "campo";
      if (RESERVADOS.has(id)) id = `${id}2`;
      while (ids.has(id)) id = `${id}_`;
      ids.add(id);
      const opcoes = tipo === "select" ? [...new Set((Array.isArray(x?.opcoes) ? x.opcoes : []).map((o) => corta(o, 40)).filter(Boolean))].slice(0, 8) : [];
      return { id, rotulo: corta(x?.rotulo, 40) || id, tipo: tipo === "select" && opcoes.length < 2 ? "text" : tipo, opcoes, naLista: !!x?.naLista, obrigatorio: !!x?.obrigatorio };
    });
    const selects = out.campos.filter((x) => x.tipo === "select").map((x) => x.id);
    out.agruparPor = selects.includes(s?.agruparPor) ? s.agruparPor : "";
    const m = s?.meta || {};
    const numericos = out.campos.filter((x) => x.tipo === "number" || x.tipo === "dinheiro").map((x) => x.id);
    const tipoMeta = ["concluidos", "soma", "checkins"].includes(m.tipo) ? m.tipo : "nenhuma";
    out.meta = {
      tipo: tipoMeta === "soma" && !numericos.includes(m.campoId) ? "nenhuma" : tipoMeta === "checkins" && !out.checkin ? "nenhuma" : tipoMeta,
      campoId: numericos.includes(m.campoId) ? m.campoId : "",
      alvo: Math.max(0, Math.min(100000, Number(m.alvo) || 0)),
      periodo: ["semana", "mes", "ano"].includes(m.periodo) ? m.periodo : "mes",
    };
    if (!(out.meta.alvo > 0)) out.meta.tipo = "nenhuma";
    out.exemplos = (Array.isArray(s?.exemplos) ? s.exemplos : []).map((e) => corta(e, 80)).filter(Boolean).slice(0, 6);
    // Vista e ordem: abas de marcar por dia só têm lista e cartões; calendário pede data.
    const v = s?.visual || {};
    let vista = VISTAS.some(([x]) => x === v.vista) ? v.vista : "lista";
    if (out.checkin && !["lista", "cartoes"].includes(vista)) vista = "lista";
    if (vista === "calendario" && !out.naAgenda) vista = "lista";
    const ordemCampo = typeof v.ordem === "string" && v.ordem.startsWith("campo:") && out.campos.some((x) => `campo:${x.id}` === v.ordem);
    out.visual = { vista, ordem: ORDENS.has(v.ordem) || ordemCampo ? v.ordem : "auto" };
    out.proposito = corta(s?.proposito, 400);
    out.origem = s?.origem === "delfos" ? "delfos" : "local";
    return out;
  }

  /* --------------------------- Criador e editor ---------------------------- */

  const NOME_TIPO = Object.fromEntries(Store.TIPOS_CAMPO.map((t) => [t.valor, t.rotulo]));
  const PERIODOS = [["semana", "por semana"], ["mes", "por mês"], ["ano", "por ano"]];
  const ICONE_ENTENDEU = { assunto: "alvo", registro: "lista", jeito: "calendario", campos: "tabela", meta: "bandeira", vista: "grade", fora: "fechar", dica: "info" };
  const DE_TXT = { nome: "do nome", "propósito": "do propósito", assunto: "do assunto", "padrão": "padrão" };

  /** Cores das abas que já existem, para o Delfos não repetir quando dá. */
  const coresUsadas = (exceto = "") => (Store.estado().pilares || []).filter((p) => p.id !== exceto).map((p) => p.cor);

  /**
   * Criador (sem `pilar`) ou editor (com `pilar`) de uma aba. No editor, os
   * campos que já existem não saem daqui (isso é em "Campos desta aba"); o
   * Delfos só propõe campos novos para acrescentar.
   */
  function abrir({ pilar = null } = {}) {
    const editando = !!pilar;
    const est = {
      sug: editando
        ? sanear({ ...pilar, meta: pilar.meta || SEM_META, especial: pilar.modelo === "academia" ? "academia" : "", visual: pilar.visual || {}, origem: pilar.sugeridoPor }, pilar.nome)
        : sanear(Delfos.entender({ nome: "", usadas: coresUsadas() }).sugestao, ""),
      escolhidos: new Set(),
      exemplos: new Set(),
      mexeu: false,
      pendente: null,
      leitura: null,
    };
    if (editando) {
      est.sug.icone = pilar.icone;
      est.sug.cor = pilar.cor;
      est.sug.proposito = pilar.proposito || "";
    }
    const existentes = editando ? (pilar.campos || []) : [];
    let novosCampos = []; // no editor: campos sugeridos que ainda não existem

    const html = `
      <div class="modal-head">
        <h2 class="modal-title">${editando ? "Personalizar aba" : "Nova aba"}</h2>
        <p class="modal-desc">${editando
          ? "Mude o propósito e o Delfos sugere o que falta: campos novos, meta e o jeito de ver. O que já está cadastrado não muda."
          : "Dê um nome e conte o propósito. O Delfos lê e monta a página: campos, meta, vista e agenda. Tudo dá para mudar antes de criar."}</p>
      </div>
      <div class="modal-body criador">
        <div class="criador-col">
          <div class="field">
            <label for="cr-nome">Nome da aba</label>
            <input id="cr-nome" class="criador-nome" type="text" maxlength="40" autocomplete="off" spellcheck="false" placeholder="Ex.: Plantões, Leituras, Corrida…" value="${esc(pilar?.nome || "")}" />
          </div>
          <div class="field">
            <label for="cr-prop">Propósito da aba</label>
            <textarea id="cr-prop" class="criador-proposito" rows="4" maxlength="400" placeholder="Ex.: anotar cada plantão com local, horário, quanto vou receber e se já recebi. Ver no calendário. Meta de R$ 2.000 por mês…">${esc(est.sug.proposito || "")}</textarea>
            <span class="hint">Escreva do seu jeito: o que cada registro guarda, se tem data ou é de todo dia, a meta e como quer ver.</span>
          </div>
          <section class="delfos-leu" aria-live="polite" aria-label="O que o Delfos entendeu">
            <h3 class="delfos-titulo">${icone("delfos")}O que o Delfos entendeu</h3>
            <ul class="delfos-lista" data-entendeu></ul>
            <div class="delfos-aplicar" data-aplicar hidden>
              <span>Você mexeu em alguns ajustes. A leitura nova não passa por cima deles.</span>
              <button type="button" class="btn sm" data-usar>Aplicar o que o Delfos entendeu</button>
            </div>
          </section>
          <details class="criador-ajustes" ${editando ? "open" : ""}>
            <summary>${icone("direita")}Aparência e detalhes</summary>
            <div class="criador-ajustes-corpo">
              <div class="field">
                <span class="label">Ícone</span>
                <div class="icones-grade" data-icones></div>
              </div>
              <div class="field">
                <span class="label">Cor</span>
                <div class="cores" data-cores></div>
              </div>
              <div class="field">
                <label for="cr-desc">Descrição curta <span class="muted">(aparece embaixo do nome)</span></label>
                <input id="cr-desc" type="text" maxlength="160" autocomplete="off" />
              </div>
              <div class="field">
                <label for="cr-rot">Cada registro é um(a)</label>
                <input id="cr-rot" type="text" maxlength="30" autocomplete="off" placeholder="livro, treino, plantão…" />
              </div>
              <label class="linha-switch"><span><b>Tem data e entra na agenda</b><span class="muted">Aparece nos próximos 30 dias da visão geral.</span></span><input type="checkbox" class="switch" id="cr-agenda" /></label>
              <label class="linha-switch"><span><b>Marcar por dia</b><span class="muted">Para hábitos: um toque por dia, com sequência.</span></span><input type="checkbox" class="switch" id="cr-checkin" /></label>
            </div>
          </details>
        </div>
        <div class="criador-col previa">
          <div class="previa-topo" data-previa-topo></div>
          <div class="field" data-bloco-vista>
            <span class="label">A página abre em</span>
            <div class="chips" data-vistas role="group" aria-label="Vista da página"></div>
          </div>
          <div class="field">
            <span class="label" data-titulo-campos>Campos</span>
            <ul class="abas-lista campos-sugeridos" data-campos></ul>
            <span class="hint" data-hint-campos></span>
          </div>
          <div class="field" data-bloco-meta>
            <span class="label">Meta</span>
            <div class="meta-linha">
              <input type="checkbox" class="switch" id="cr-meta-on" aria-label="Usar meta" />
              <select class="input sm" id="cr-meta-tipo" aria-label="O que conta"></select>
              <input class="input sm" id="cr-meta-alvo" type="number" min="1" step="1" style="width:90px" aria-label="Quanto" />
              <select class="input sm" id="cr-meta-periodo" aria-label="Período">${PERIODOS.map(([v, r]) => `<option value="${v}">${r}</option>`).join("")}</select>
            </div>
          </div>
          <div class="field" data-bloco-agrupar>
            <label for="cr-agrupar">Agrupar a lista por</label>
            <select id="cr-agrupar"></select>
          </div>
          <div class="field" data-bloco-exemplos hidden>
            <span class="label">Para começar <span class="muted">(opcional)</span></span>
            <div class="chips" data-exemplos></div>
          </div>
          <p class="hint" data-nota-academia hidden>Esta aba abre com a tela de treinos: dias, exercícios do catálogo, cargas e recordes.</p>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" data-acao="cancelar" type="button">Cancelar</button>
        <button class="btn primary" data-acao="criar" type="button">${editando ? "Salvar" : "Criar aba"}</button>
      </div>`;

    return new Promise((resolve) => UI.abrirModal(html, {
      classe: "xwide",
      aoFechar: resolve,
      aoMontar(modal, fechar) {
        const $ = (sel) => modal.querySelector(sel);
        const inpNome = $("#cr-nome");
        const inpProp = $("#cr-prop");
        const pluralRot = (r) => Leituras.pluralizar(r);
        let iconesDesenhados = false;

        // A grade de ícones (são dezenas) só é desenhada quando "Aparência e
        // detalhes" abre: na maior parte das vezes ninguém troca o ícone.
        function desenharIcones() {
          const s = est.sug;
          const det = $(".criador-ajustes");
          if (!det.open && !iconesDesenhados) return;
          iconesDesenhados = true;
          const oferta = [...new Set([s.icone, ...UI.ICONES_ABA.map((n) => `svg:${n}`), ...Store.ICONES_PILAR.slice(0, 12)])];
          $("[data-icones]").innerHTML = oferta.map((v) => `<button type="button" class="icone-opcao" data-icone="${esc(v)}" aria-pressed="${v === s.icone}" aria-label="Ícone ${esc(v.replace("svg:", ""))}">${UI.iconeAba(v)}</button>`).join("");
          $("[data-cores]").innerHTML = Store.PALETA_PILAR.map((cor) => `<button type="button" class="cor-opcao" data-cor="${esc(cor.valor)}" aria-pressed="${cor.valor === s.cor}" aria-label="Cor ${esc(cor.rotulo)}" style="--c:${esc(cor.valor)}"></button>`).join("");
        }

        // Desenha tudo a partir de est.sug (o que a pessoa mexe grava de volta em est.sug).
        function desenhar() {
          const s = est.sug;
          desenharIcones();
          $("#cr-desc").value = s.descricao || "";
          $("#cr-rot").value = s.rotuloItem || "";
          $("#cr-agenda").checked = !!s.naAgenda;
          $("#cr-checkin").checked = !!s.checkin;
          const academia = s.especial === "academia";
          $("[data-nota-academia]").hidden = !academia;
          ["[data-bloco-meta]", "[data-bloco-agrupar]", "[data-bloco-vista]"].forEach((q) => { $(q).hidden = academia; });
          $("#cr-agenda").closest(".linha-switch").hidden = academia;
          $("#cr-checkin").closest(".linha-switch").hidden = academia;

          // Prévia
          const nomeVisto = inpNome.value.trim() || "Sua aba";
          $("[data-previa-topo]").innerHTML = `
            <span class="previa-icone" style="--c:${esc(s.cor)}" aria-hidden="true">${UI.iconeAba(s.icone, true)}</span>
            <span><span class="previa-nome">${esc(nomeVisto)}</span><span class="previa-desc">${esc(s.descricao || (s.checkin ? "Marcado a cada dia." : s.naAgenda ? "Com data, entra na agenda." : "Fora da agenda."))}</span></span>`;

          // Vista
          const vistas = s.checkin ? VISTAS.filter(([v]) => v === "lista" || v === "cartoes") : s.naAgenda ? VISTAS : VISTAS.filter(([v]) => v !== "calendario");
          $("[data-vistas]").innerHTML = vistas.map(([v, r, ic]) => `<button type="button" class="chip" data-vista="${v}" aria-pressed="${v === s.visual.vista}">${icone(ic)}${r}</button>`).join("");

          // Campos
          const lista = $("[data-campos]");
          const rot = s.rotuloItem || "registro";
          $("[data-titulo-campos]").textContent = `O que cada ${rot} guarda`;
          if (academia) {
            lista.innerHTML = "";
            $("[data-hint-campos]").textContent = "";
          } else if (editando) {
            lista.innerHTML = existentes.map((x) => linhaCampo(x, true, true)).join("") + novosCampos.map((x) => linhaCampo(x, est.escolhidos.has(x.id), false)).join("");
            $("[data-hint-campos]").textContent = novosCampos.length ? "Marque os campos sugeridos que quer acrescentar. Os atuais se editam em Campos desta aba." : "Para renomear, reordenar ou excluir campos, use Campos desta aba.";
          } else {
            lista.innerHTML = s.campos.length ? s.campos.map((x) => linhaCampo(x, est.escolhidos.has(x.id), false)).join("") : `<li class="muted">Só nome e data. Dá para acrescentar campos depois.</li>`;
            $("[data-hint-campos]").textContent = "Nome e data já vêm em todo registro. Desmarque o que não quiser.";
          }

          // Meta
          const camposMeta = editando ? [...existentes, ...novosCampos.filter((x) => est.escolhidos.has(x.id))] : s.campos.filter((x) => est.escolhidos.has(x.id));
          const numericos = camposMeta.filter((x) => x.tipo === "number" || x.tipo === "dinheiro");
          const opcoes = [["concluidos", `${pluralRot(rot)} concluídos`], ...(s.checkin ? [["checkins", "marcações"]] : []), ...numericos.map((x) => [`soma:${x.id}`, `soma de ${inicialMinuscula(x.rotulo)}`])];
          const atual = s.meta.tipo === "soma" ? `soma:${s.meta.campoId}` : s.meta.tipo;
          $("#cr-meta-tipo").innerHTML = opcoes.map(([v, r]) => `<option value="${esc(v)}" ${v === atual ? "selected" : ""}>${esc(r)}</option>`).join("");
          $("#cr-meta-on").checked = s.meta.tipo !== "nenhuma";
          $("#cr-meta-alvo").value = s.meta.alvo || "";
          $("#cr-meta-periodo").value = s.meta.periodo || "mes";
          ["#cr-meta-tipo", "#cr-meta-alvo", "#cr-meta-periodo"].forEach((q) => { $(q).disabled = s.meta.tipo === "nenhuma"; });

          // Agrupar
          const selects = camposMeta.filter((x) => x.tipo === "select");
          $("#cr-agrupar").innerHTML = `<option value="">não agrupar</option>` + selects.map((x) => `<option value="${esc(x.id)}" ${x.id === s.agruparPor ? "selected" : ""}>${esc(x.rotulo)}</option>`).join("");
          $("[data-bloco-agrupar]").hidden = academia || !selects.length;

          // Exemplos
          const ex = editando ? [] : s.exemplos || [];
          $("[data-bloco-exemplos]").hidden = academia || !ex.length;
          $("[data-exemplos]").innerHTML = ex.map((e, i) => `<button type="button" class="chip" data-exemplo="${i}" aria-pressed="${est.exemplos.has(i)}">${esc(e)}</button>`).join("");
        }

        function linhaCampo(x, marcado, travado) {
          const detalhe = x.tipo === "select" ? `${NOME_TIPO[x.tipo]}: ${x.opcoes.join(", ")}` : NOME_TIPO[x.tipo] || x.tipo;
          return `
            <li class="${marcado ? "" : "desligada"}">
              <span class="campo-linha">
                <span class="campo-nome">${esc(x.rotulo)}${travado ? ` <span class="badge">atual</span>` : ""}</span>
                <span class="campo-tipo">${esc(detalhe)}</span>
              </span>
              ${travado ? "" : `<input type="checkbox" class="switch" data-campo="${esc(x.id)}" ${marcado ? "checked" : ""} aria-label="Incluir ${esc(x.rotulo)}" />`}
            </li>`;
        }

        /** "O que o Delfos entendeu", frase a frase. */
        function desenharLeitura(r) {
          $("[data-entendeu]").innerHTML = (r?.entendeu || []).map((e) => `
            <li class="delfos-item ${e.tipo}">
              ${icone(ICONE_ENTENDEU[e.tipo] || "info")}
              <span>${esc(e.texto)}${e.de && e.tipo !== "dica" ? ` <span class="delfos-de">${esc(DE_TXT[e.de] || e.de)}</span>` : ""}</span>
            </li>`).join("");
        }

        // Aplica uma leitura do Delfos.
        function aplicar(sug) {
          if (editando) {
            // No editor, o Delfos só acrescenta: campos que ainda não existem.
            const idsJa = new Set(existentes.map((x) => x.id));
            novosCampos = sug.campos.map((x) => ({ ...x, id: idsJa.has(x.id) ? `${x.id}2` : x.id }));
            est.escolhidos = new Set();
            if (est.sug.meta.tipo === "nenhuma" && sug.meta.tipo !== "nenhuma" && sug.meta.tipo !== "soma") est.sug.meta = sug.meta;
            const pediuVista = est.leitura?.entendeu.some((e) => e.tipo === "vista" && e.de === "propósito");
            if (pediuVista) est.sug.visual = { ...est.sug.visual, ...sug.visual };
            est.sug.proposito = sug.proposito;
            desenhar();
            return;
          }
          est.sug = sug;
          est.escolhidos = new Set(sug.campos.map((x) => x.id));
          est.exemplos = new Set();
          desenhar();
        }

        // Grava de volta o que a pessoa mexeu no formulário.
        function ler() {
          const s = est.sug;
          s.descricao = $("#cr-desc").value.trim();
          s.rotuloItem = $("#cr-rot").value.trim().toLowerCase() || s.rotuloItem;
          s.naAgenda = $("#cr-agenda").checked;
          s.checkin = $("#cr-checkin").checked;
          const tipoSel = $("#cr-meta-tipo").value || "concluidos";
          s.meta = $("#cr-meta-on").checked
            ? { tipo: tipoSel.startsWith("soma:") ? "soma" : tipoSel, campoId: tipoSel.startsWith("soma:") ? tipoSel.slice(5) : "", alvo: Number($("#cr-meta-alvo").value) || 0, periodo: $("#cr-meta-periodo").value }
            : { ...SEM_META };
          s.agruparPor = $("#cr-agrupar").value;
          s.proposito = inpProp.value.trim();
          if (s.checkin && !["lista", "cartoes"].includes(s.visual.vista)) s.visual.vista = "lista";
          if (!s.naAgenda && s.visual.vista === "calendario") s.visual.vista = "lista";
        }

        const marcarMexeu = () => { est.mexeu = true; };

        /** Lê nome e propósito com o Delfos; aplica, ou guarda para o botão se a pessoa já mexeu. */
        function lerComDelfos() {
          const nome = inpNome.value.trim();
          const proposito = inpProp.value.trim();
          const r = Delfos.entender({ nome, proposito, usadas: coresUsadas(pilar?.id), existentes });
          est.leitura = r;
          desenharLeitura(r);
          const sug = sanear(r.sugestao, nome);
          if (editando) {
            aplicar(sug);
            $("[data-aplicar]").hidden = true;
            return;
          }
          if (est.mexeu) {
            est.pendente = sug;
            $("[data-aplicar]").hidden = false;
          } else {
            aplicar(sug);
            $("[data-aplicar]").hidden = true;
          }
        }

        modal.addEventListener("click", (ev) => {
          const ic = ev.target.closest("[data-icone]");
          const cor = ev.target.closest("[data-cor]");
          const exm = ev.target.closest("[data-exemplo]");
          const vista = ev.target.closest("[data-vista]");
          if (ic) { ler(); est.sug.icone = ic.dataset.icone; marcarMexeu(); desenhar(); }
          if (cor) { ler(); est.sug.cor = cor.dataset.cor; marcarMexeu(); desenhar(); }
          if (vista) { ler(); est.sug.visual = { ...est.sug.visual, vista: vista.dataset.vista }; marcarMexeu(); desenhar(); }
          if (exm) { const i = Number(exm.dataset.exemplo); est.exemplos.has(i) ? est.exemplos.delete(i) : est.exemplos.add(i); exm.setAttribute("aria-pressed", String(est.exemplos.has(i))); }
          if (ev.target.closest("[data-usar]") && est.pendente) {
            est.mexeu = false;
            aplicar(est.pendente);
            est.pendente = null;
            $("[data-aplicar]").hidden = true;
          }
        });
        $(".criador-ajustes").addEventListener("toggle", desenharIcones);
        modal.addEventListener("change", (ev) => {
          if (ev.target.matches("[data-campo]")) {
            const id = ev.target.dataset.campo;
            ev.target.checked ? est.escolhidos.add(id) : est.escolhidos.delete(id);
            ler(); marcarMexeu(); desenhar();
            return;
          }
          if (ev.target.matches("#cr-meta-on, #cr-checkin, #cr-agenda, #cr-meta-tipo")) {
            ler();
            if (ev.target.id === "cr-meta-on" && ev.target.checked && !est.sug.meta.alvo) est.sug.meta.alvo = 10;
            marcarMexeu(); desenhar();
            return;
          }
          if (ev.target !== inpNome && ev.target !== inpProp) { ler(); marcarMexeu(); }
        });
        ["#cr-desc", "#cr-rot"].forEach((q) => $(q).addEventListener("input", () => {
          ler(); marcarMexeu();
          const t = $("[data-previa-topo] .previa-desc");
          if (q === "#cr-desc" && t) t.textContent = $("#cr-desc").value;
        }));

        // O Delfos lê a cada pausa curta na digitação (não a cada letra):
        // num computador fraco, digitar nunca espera a leitura.
        let espera;
        const agendarLeitura = () => {
          clearTimeout(espera);
          espera = setTimeout(lerComDelfos, 220);
        };
        inpNome.addEventListener("input", () => {
          const t = $("[data-previa-topo] .previa-nome");
          if (t) t.textContent = inpNome.value.trim() || "Sua aba";
          agendarLeitura();
        });
        inpProp.addEventListener("input", agendarLeitura);

        $('[data-acao="cancelar"]').addEventListener("click", () => fechar(null));
        $('[data-acao="criar"]').addEventListener("click", () => {
          const nome = inpNome.value.trim();
          if (!nome) { inpNome.focus(); inpNome.closest(".field").classList.add("tem-erro"); return; }
          clearTimeout(espera);
          ler();
          fechar(editando ? salvarEdicao(pilar, nome, est.sug, novosCampos.filter((x) => est.escolhidos.has(x.id))) : criar(nome, est.sug, est.escolhidos, est.exemplos));
        });

        if (editando) {
          novosCampos = [];
          desenhar();
          desenharLeitura(est.sug.proposito ? Delfos.entender({ nome: pilar.nome, proposito: est.sug.proposito, existentes }) : { entendeu: [{ tipo: "dica", texto: "Conte o propósito desta aba e o Delfos sugere campos, meta e o jeito de ver que ainda faltam." }] });
        } else {
          lerComDelfos();
          inpNome.focus();
        }
      },
    }));
  }

  /** Cria a aba a partir da leitura escolhida e abre a página dela. */
  function criar(nome, s, escolhidos, exemplos) {
    const academia = s.especial === "academia";
    const campos = academia ? [] : s.campos.filter((x) => escolhidos.has(x.id));
    const agora = UI.hojeISO();
    const itens = academia ? [] : [...exemplos].map((i) => ({
      id: Store.uid("it"), descricao: s.exemplos[i], data: s.naAgenda ? agora : "", concluido: false, extras: {}, criadoEm: new Date().toISOString(), ...(s.checkin ? { feitos: [] } : {}),
    }));
    const ordemValida = !s.visual.ordem.startsWith("campo:") || campos.some((x) => `campo:${x.id}` === s.visual.ordem);
    const novo = Store.inserir("pilares", {
      nome, icone: s.icone, cor: s.cor, descricao: s.descricao,
      modelo: academia ? "academia" : "personalizado",
      campos, naAgenda: academia ? false : s.naAgenda, checkin: academia ? false : s.checkin,
      rotuloItem: s.rotuloItem, agruparPor: campos.some((x) => x.id === s.agruparPor) ? s.agruparPor : "",
      meta: s.meta.tipo === "nenhuma" || (s.meta.tipo === "soma" && !campos.some((x) => x.id === s.meta.campoId)) ? null : s.meta,
      proposito: s.proposito,
      exemploItem: s.exemplos[0] || "",
      visual: academia ? undefined : { vista: s.visual.vista, ordem: ordemValida ? s.visual.ordem : "auto", leitura: true, numeros: true, lateral: true, perguntas: true },
      sugeridoPor: "delfos",
      itens,
      ...(academia ? { academia: { configuradoEm: "", objetivo: "", experiencia: "", frequenciaSemanal: 0, divisao: "" }, dias: [] } : {}),
    });
    location.href = `pilar.html?id=${encodeURIComponent(novo.id)}`;
    return novo;
  }

  function salvarEdicao(pilar, nome, s, acrescentar) {
    const campos = [...(pilar.campos || []), ...acrescentar.map((x) => ({ ...x, id: x.id }))];
    const academia = pilar.modelo === "academia";
    const dados = {
      nome, icone: s.icone, cor: s.cor, descricao: s.descricao, rotuloItem: s.rotuloItem,
      naAgenda: academia ? pilar.naAgenda : s.naAgenda,
      checkin: academia ? false : s.checkin,
      campos,
      agruparPor: campos.some((x) => x.id === s.agruparPor && x.tipo === "select") ? s.agruparPor : "",
      meta: s.meta.tipo === "nenhuma" || !(s.meta.alvo > 0) ? null : s.meta,
      proposito: s.proposito,
      ...(academia ? {} : { visual: { ...(pilar.visual || {}), vista: s.visual.vista } }),
    };
    Store.atualizar("pilares", pilar.id, dados);
    return dados;
  }

  return { sanear, abrir };
})();
