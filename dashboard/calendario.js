/* ===========================================================================
   Calendário da aba Pessoal: o mês inteiro com o que cai em cada dia, de
   todas as abas, e a importação de outro calendário (.ics por arquivo, .ics
   guardado no Drive, ou a própria Agenda do Google).

   Duas partes separadas de propósito, como em importar.js:
   - funções puras (parseICS, deEventoGoogle, gradeDoMes) — sem DOM nem Store,
     testáveis com Node;
   - a tela (montar, abrirImportacao), que toca UI/Store.
   =========================================================================== */

const Calendario = (() => {
  const CAMINHO = "pessoal.compromissos";
  const pad = (n) => String(n).padStart(2, "0");
  const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  /* ----------------------------- Leitura do .ics ---------------------------- */

  /** Linhas "dobradas" do iCalendar (continuação começa com espaço ou tab) voltam a ser uma. */
  function desdobrar(texto) {
    return String(texto || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  }

  function textoICS(v) {
    return String(v || "")
      .replace(/\\n/gi, "\n")
      .replace(/\\([,;\\])/g, "$1")
      .trim();
  }

  /** Diferença (ms) entre o relógio de um fuso e o UTC num instante. */
  function deslocamentoFuso(instante, fuso) {
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: fuso, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(instante));
    const v = Object.fromEntries(partes.map((p) => [p.type, Number(p.value)]));
    return Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second) - instante;
  }

  /**
   * "20260915" (dia inteiro), "20260915T140000" (hora do relógio), com TZID
   * (converte do fuso do evento para o do aparelho) ou "…Z" (UTC).
   * Devolve { data, hora } no horário local de quem importa.
   */
  function lerDataICS(valor, params = {}) {
    const m = String(valor || "").match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
    if (!m) return null;
    const [, a, me, d, h, mi, s, z] = m;
    if (!h || params.VALUE === "DATE") return { data: `${a}-${me}-${d}`, hora: "" };
    let instante;
    const relogio = Date.UTC(+a, +me - 1, +d, +h, +mi, +(s || 0));
    if (z) instante = relogio;
    else if (params.TZID) {
      try {
        const fuso = params.TZID.replace(/^"|"$/g, "");
        instante = relogio - deslocamentoFuso(relogio, fuso);
        instante = relogio - deslocamentoFuso(instante, fuso); // acerta perto da troca de horário
      } catch { instante = null; }
    }
    if (instante === undefined || instante === null) return { data: `${a}-${me}-${d}`, hora: `${h}:${mi}` };
    const local = new Date(instante);
    return { data: isoDe(local), hora: `${pad(local.getHours())}:${pad(local.getMinutes())}` };
  }

  function lerRegra(rrule) {
    if (!rrule) return { repete: "", ate: "" };
    const r = Object.fromEntries(rrule.split(";").map((p) => p.split("=")).map(([k, v]) => [String(k).toUpperCase(), v]));
    const freq = { WEEKLY: "semanal", MONTHLY: "mensal", YEARLY: "anual" }[r.FREQ] || "";
    // Intervalos (a cada 2 semanas), dias da semana múltiplos e diário não têm
    // como ser representados sem inventar: o evento entra só na primeira data.
    const simples = freq && (!r.INTERVAL || r.INTERVAL === "1") && (!r.BYDAY || !r.BYDAY.includes(","));
    return { repete: simples ? freq : "", ate: r.UNTIL ? lerDataICS(r.UNTIL)?.data || "" : "", complexa: !!r.FREQ && !simples };
  }

  /**
   * Lê um arquivo iCalendar (exportado do Google Agenda, Outlook, Apple…) e
   * devolve eventos no formato do Delfos. Eventos cancelados e as exceções de
   * uma série (RECURRENCE-ID) ficam de fora.
   */
  function parseICS(texto) {
    const eventos = [];
    let atual = null;
    for (const linha of desdobrar(texto)) {
      if (/^BEGIN:VEVENT/i.test(linha)) { atual = {}; continue; }
      if (/^END:VEVENT/i.test(linha)) {
        if (atual) eventos.push(atual);
        atual = null;
        continue;
      }
      if (!atual) continue;
      const i = linha.indexOf(":");
      if (i < 0) continue;
      const [nome, ...params] = linha.slice(0, i).split(";");
      const valor = linha.slice(i + 1);
      const p = Object.fromEntries(params.map((x) => x.split("=")).map(([k, v]) => [String(k).toUpperCase(), v]));
      const chave = nome.toUpperCase();
      if (!(chave in atual)) atual[chave] = { valor, p };
    }
    return eventos
      .filter((e) => e.DTSTART && !e["RECURRENCE-ID"] && String(e.STATUS?.valor || "").toUpperCase() !== "CANCELLED")
      .map((e) => {
        const ini = lerDataICS(e.DTSTART.valor, e.DTSTART.p);
        if (!ini) return null;
        const regra = lerRegra(e.RRULE?.valor);
        const descricao = textoICS(e.DESCRIPTION?.valor);
        return {
          uid: textoICS(e.UID?.valor) || `${ini.data}|${textoICS(e.SUMMARY?.valor)}`,
          titulo: textoICS(e.SUMMARY?.valor) || "(sem título)",
          data: ini.data,
          hora: ini.hora,
          local: textoICS(e.LOCATION?.valor),
          observacoes: descricao.slice(0, 2000),
          repete: regra.repete,
          repeteAte: regra.ate,
          regraComplexa: !!regra.complexa,
        };
      })
      .filter(Boolean);
  }

  /** Evento da API do Google Agenda → mesmo formato do parseICS. */
  function deEventoGoogle(ev) {
    const inicio = ev.start?.dateTime || ev.start?.date;
    if (!inicio) return null;
    let data = inicio.slice(0, 10);
    let hora = "";
    if (ev.start.dateTime) {
      const d = new Date(inicio);
      data = isoDe(d);
      hora = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return {
      uid: `google:${ev.recurringEventId ? `${ev.recurringEventId}:${data}` : ev.id}`,
      titulo: ev.summary || "(sem título)",
      data, hora,
      local: ev.location || "",
      observacoes: String(ev.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000),
      repete: "", repeteAte: "", regraComplexa: false,
    };
  }

  /** Quais dias a grade do mês mostra: semanas inteiras, do começo ao fim do mês. */
  function gradeDoMes(ano, mes, semanaComeca = 1) {
    const primeiro = new Date(ano, mes, 1);
    const recuo = (primeiro.getDay() - semanaComeca + 7) % 7;
    const inicio = new Date(ano, mes, 1 - recuo);
    const ultimo = new Date(ano, mes + 1, 0);
    const avanco = (semanaComeca + 6 - ultimo.getDay() + 7) % 7;
    const total = recuo + ultimo.getDate() + avanco;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      return { iso: isoDe(d), dia: d.getDate(), doMes: d.getMonth() === mes, semana: d.getDay() };
    });
  }

  /* ------------------------------- A tela ----------------------------------- */

  // Sem DOM (Node, testes), só as funções puras.
  if (typeof document === "undefined") return { parseICS, deEventoGoogle, gradeDoMes, lerDataICS, desdobrar };

  const { fmt } = UI;
  const NOMES_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  /**
   * Tudo o que acontece entre duas datas, de todas as abas: prazos, provas,
   * projetos, metas, abas próprias, compromissos pessoais (com as repetições
   * projetadas) e as contas a pagar. Devolve um mapa data → itens.
   */
  function itensEntre(ini, fim) {
    const mapa = {};
    const por = (iso, item) => { (mapa[iso] = mapa[iso] || []).push(item); };
    const pessoais = Store.lista(CAMINHO);
    const idsPessoais = new Set(pessoais.map((c) => c.id));

    UI.compromissos({ incluirConcluidos: true }).forEach((i) => {
      if (idsPessoais.has(i.id)) return;
      if (i.data >= ini && i.data <= fim) por(i.data, { ...i, hora: "" });
    });
    pessoais.forEach((c) => {
      UI.ocorrenciasEntre(c, ini, fim).forEach((iso, n) => {
        if (c.repeteAte && iso > c.repeteAte) return;
        por(iso, {
          id: c.id, titulo: c.descricao, data: iso, area: "pessoal", areaRotulo: "Pessoal", cor: "var(--s-pessoal)",
          tipo: c.tipo || "compromisso", hora: c.hora || "", importante: !!c.importante, local: c.local || "",
          concluido: n === 0 && !!c.concluido, repete: c.repete || "", pessoal: c,
        });
      });
    });
    if (typeof Financas !== "undefined" && Financas.pendentes) {
      Financas.pendentes().forEach((t) => {
        if (t.data >= ini && t.data <= fim) por(t.data, {
          id: t.id, titulo: `Pagar: ${t.descricao || "conta"}`, data: t.data, area: "financeiro", areaRotulo: "Financeiro",
          cor: "var(--s-financeiro)", tipo: "conta", hora: "", valor: t.valor, concluido: false,
        });
      });
    }
    Object.values(mapa).forEach((l) => l.sort((a, b) => (a.concluido - b.concluido) || (a.hora || "99").localeCompare(b.hora || "99")));
    return mapa;
  }

  let mesVisto = null; // { ano, mes }

  /**
   * Desenha o calendário em `box`. `aoMudar` é chamado depois de qualquer
   * gravação (novo compromisso, concluir, importar), para a página se refazer.
   */
  function montar(box, { aoMudar = () => {}, novoNoDia = null } = {}) {
    if (!mesVisto) { const h = new Date(); mesVisto = { ano: h.getFullYear(), mes: h.getMonth() }; }
    const { ano, mes } = mesVisto;
    const semanaComeca = Number(UI.experiencia().semanaComeca ?? 1);
    const dias = gradeDoMes(ano, mes, semanaComeca);
    const mapa = itensEntre(dias[0].iso, dias[dias.length - 1].iso);
    const hoje = UI.hojeISO();
    const nomeMes = new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const doMes = dias.filter((d) => d.doMes).reduce((s, d) => s + (mapa[d.iso] || []).filter((i) => !i.concluido).length, 0);
    const cabecalho = Array.from({ length: 7 }, (_, i) => NOMES_SEMANA[(semanaComeca + i) % 7]);

    box.innerHTML = `
      <div class="cal-topo">
        <div class="mes-nav cal-nav">
          <button type="button" class="btn ghost sm icon" data-cal="-1" aria-label="Mês anterior">‹</button>
          <strong class="cal-mes">${fmt.escape(fmt.capitalizar(nomeMes))}</strong>
          <button type="button" class="btn ghost sm icon" data-cal="1" aria-label="Próximo mês">›</button>
          <button type="button" class="btn ghost sm" data-cal="hoje">Hoje</button>
        </div>
        <span class="card-note">${doMes ? `${doMes} ${doMes === 1 ? "coisa marcada" : "coisas marcadas"} neste mês` : "nada marcado neste mês"}</span>
      </div>
      <div class="cal-grade" role="grid" aria-label="${fmt.escape(nomeMes)}">
        ${cabecalho.map((n) => `<div class="cal-semana" role="columnheader">${n}</div>`).join("")}
        ${dias.map((d) => {
          const itens = mapa[d.iso] || [];
          const mostrar = itens.slice(0, 3);
          const resto = itens.length - mostrar.length;
          const classes = ["cal-dia", d.doMes ? "" : "fora", d.iso === hoje ? "hoje" : "", d.iso < hoje ? "passado" : "", d.semana === 0 || d.semana === 6 ? "fds" : ""].filter(Boolean).join(" ");
          const rotulo = `${new Date(`${d.iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}${itens.length ? `, ${itens.length} ${itens.length === 1 ? "item" : "itens"}` : ""}`;
          return `<button type="button" class="${classes}" data-dia="${d.iso}" role="gridcell" aria-label="${fmt.escape(rotulo)}">
            <span class="cal-num">${d.dia}</span>
            <span class="cal-itens">
              ${mostrar.map((i) => `<span class="cal-item ${i.concluido ? "feito" : ""} ${i.importante ? "importante" : ""}" style="--c:${fmt.escape(i.cor || "var(--texto-3)")}">${i.hora ? `<b>${fmt.escape(i.hora)}</b> ` : ""}${fmt.escape(i.titulo)}</span>`).join("")}
              ${resto > 0 ? `<span class="cal-mais">+${resto}</span>` : ""}
            </span>
            ${itens.length ? `<span class="cal-pontos" aria-hidden="true">${itens.slice(0, 4).map((i) => `<i style="--c:${fmt.escape(i.cor || "var(--texto-3)")}"></i>`).join("")}</span>` : ""}
          </button>`;
        }).join("")}
      </div>`;

    box.querySelectorAll("[data-cal]").forEach((b) => b.addEventListener("click", () => {
      const v = b.dataset.cal;
      if (v === "hoje") { const h = new Date(); mesVisto = { ano: h.getFullYear(), mes: h.getMonth() }; }
      else { const d = new Date(ano, mes + Number(v), 1); mesVisto = { ano: d.getFullYear(), mes: d.getMonth() }; }
      montar(box, { aoMudar, novoNoDia });
    }));
    box.querySelectorAll("[data-dia]").forEach((b) => b.addEventListener("click", () => {
      abrirDia(b.dataset.dia, mapa[b.dataset.dia] || [], { aoMudar, novoNoDia });
    }));
  }

  const LINK_AREA = { faculdade: "faculdade.html", projetos: "projetos.html", financeiro: "financeiro.html" };

  function abrirDia(iso, itens, { aoMudar, novoNoDia }) {
    const titulo = fmt.capitalizar(new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }));
    const dias = UI.diasAte(iso);
    const quando = dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : dias === -1 ? "Ontem" : dias > 0 ? `Daqui a ${dias} dias` : `Há ${-dias} dias`;
    UI.abrirModal(`
      <div class="modal-head com-marca">
        <span class="modal-ic" style="--ic-cor:var(--s-pessoal)">${UI.icone("calendario")}</span>
        <div class="modal-head-texto">
          <h2 class="modal-title">${fmt.escape(titulo)}</h2>
          <p class="modal-desc">${quando}, ${itens.length ? `${itens.length} ${itens.length === 1 ? "item" : "itens"}` : "nada marcado"}.</p>
        </div>
      </div>
      <div class="modal-body">
        ${itens.length ? `<ul class="lembretes cal-lista">${itens.map((i, n) => `
          <li>
            ${i.pessoal ? `<input type="checkbox" class="check" data-concluir="${n}" ${i.concluido ? "checked" : ""} aria-label="Concluído" ${i.repete ? "disabled title=\"Repete: marque na lista\"" : ""} />` : `<span class="lembrete-selo" style="--c:${fmt.escape(i.cor || "var(--texto-3)")}"></span>`}
            <span class="grow">
              <span class="t ${i.concluido ? "strike" : ""}">${fmt.escape(i.titulo)}${i.importante ? ` <span class="badge urgente">importante</span>` : ""}</span>
              <span class="m">${fmt.escape([fmt.capitalizar(i.areaRotulo || ""), i.hora ? `às ${i.hora}` : "", i.local, i.repete ? (UI.REPETICOES.find(([v]) => v === i.repete) || [, ""])[1].toLowerCase() : "", i.tipo && i.area !== "pessoal" ? i.tipo : ""].filter(Boolean).join(", "))}${i.valor ? `, ${fmt.moeda(i.valor)}` : ""}</span>
            </span>
            ${i.pessoal ? `<button type="button" class="btn ghost sm icon" data-editar="${n}" aria-label="Editar">${UI.icone("editar")}</button>` : LINK_AREA[i.area] ? `<a class="btn ghost sm" href="${LINK_AREA[i.area]}">Abrir</a>` : ""}
          </li>`).join("")}</ul>` : `<p class="card-note" style="margin:0;">Dia livre. Marque uma consulta, uma tarefa ou um lembrete.</p>`}
      </div>
      <div class="modal-foot">
        <span class="modal-foot-espaco"></span>
        <button class="btn" type="button" data-acao="fechar">Fechar</button>
        <button class="btn primary" type="button" data-acao="novo">+ Compromisso neste dia</button>
      </div>`, {
      classe: "formulario cal-dia-modal",
      aoMontar(modal, fechar) {
        modal.querySelector('[data-acao="fechar"]').addEventListener("click", () => fechar(null));
        modal.querySelector('[data-acao="novo"]').addEventListener("click", () => { fechar(null); novoNoDia?.(iso); });
        modal.querySelectorAll("[data-concluir]").forEach((c) => c.addEventListener("change", () => {
          const i = itens[Number(c.dataset.concluir)];
          Store.atualizar(CAMINHO, i.pessoal.id, { concluido: c.checked });
          aoMudar();
        }));
        modal.querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () => {
          fechar(null);
          aoMudar({ editar: itens[Number(b.dataset.editar)].pessoal });
        }));
      },
    });
  }

  /* ------------------------------ Importação -------------------------------- */

  const FONTES = [
    ["arquivo", "Arquivo .ics", "Exportado do Google Agenda, Outlook, iPhone ou de outro app. É lido só neste navegador."],
    ["drive", "Arquivo .ics no Google Drive", "Escolha um calendário que você guardou no Drive."],
    ["google", "Google Agenda", "Traz os eventos da sua agenda do Google, do mês passado até um ano à frente."],
  ];

  /**
   * Pergunta de onde vem o calendário, lê, mostra a revisão e só grava o que
   * ficar marcado. `fonte` pula a primeira pergunta.
   */
  function abrirImportacao({ aoConcluir = () => {}, fonte = null } = {}) {
    if (fonte) return lerDe(fonte, aoConcluir);
    const temGoogle = typeof conectarGoogle === "function";
    UI.abrirModal(`
      <div class="modal-head com-marca">
        <span class="modal-ic" style="--ic-cor:var(--s-pessoal)">${UI.icone("calendario")}</span>
        <div class="modal-head-texto">
          <h2 class="modal-title">Trazer outro calendário</h2>
          <p class="modal-desc">De onde vêm os compromissos? Nada entra sem você revisar antes.</p>
        </div>
      </div>
      <div class="modal-body">
        <div class="fonte-lista">
          ${FONTES.map(([id, nome, txt]) => `<button type="button" class="fonte-opcao" data-fonte="${id}" ${id !== "arquivo" && !temGoogle ? "disabled" : ""}>
            <span class="fonte-ic">${UI.icone(id === "arquivo" ? "arquivo" : id === "drive" ? "nuvem" : "calendario")}</span>
            <span class="grow"><strong>${nome}</strong><span>${txt}</span></span>
          </button>`).join("")}
        </div>
        <details class="fonte-ajuda">
          <summary>Como exportar o calendário (.ics)</summary>
          <ul>
            <li><strong>Google Agenda</strong>, no computador: Configurações, Importar e exportar, Exportar. Vem um .zip; dentro dele, um .ics por agenda.</li>
            <li><strong>Outlook</strong>: Calendário, Compartilhar ou Salvar calendário, formato iCalendar (.ics).</li>
            <li><strong>iPhone/Mac</strong>: no app Calendário do Mac, Arquivo, Exportar.</li>
          </ul>
        </details>
      </div>
      <div class="modal-foot">
        <span class="modal-foot-espaco"></span>
        <button class="btn" type="button" data-acao="fechar">Cancelar</button>
      </div>`, {
      classe: "formulario",
      aoMontar(modal, fechar) {
        modal.querySelector('[data-acao="fechar"]').addEventListener("click", () => fechar(null));
        modal.querySelectorAll("[data-fonte]").forEach((b) => b.addEventListener("click", () => {
          fechar(null);
          lerDe(b.dataset.fonte, aoConcluir);
        }));
      },
    });
  }

  function lerDe(fonte, aoConcluir) {
    if (fonte === "arquivo") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".ics,text/calendar";
      input.addEventListener("change", async () => {
        const f = input.files?.[0];
        if (!f) return;
        const texto = await f.text();
        revisar(parseICS(texto), { origem: "arquivo", nome: f.name, aoConcluir });
      });
      input.click();
      return;
    }
    if (typeof googleComConexao !== "function") {
      UI.toast("A conexão com o Google não está disponível nesta página.");
      return;
    }
    if (fonte === "drive") googleComConexao(() => escolherNoDrive(aoConcluir));
    if (fonte === "google") googleComConexao(async () => {
      UI.toast("Lendo a sua agenda do Google…");
      try {
        const ini = UI.isoMaisDias(-31);
        const fim = UI.isoMaisDias(365);
        const eventos = (await agendaListarEventos(ini, fim)).map(deEventoGoogle).filter(Boolean);
        revisar(eventos, { origem: "google", nome: "Google Agenda", aoConcluir });
      } catch (e) {
        console.error(e);
        UI.toast("Não deu para ler a agenda. Confira se a Google Calendar API está ativada.");
      }
    });
  }

  async function escolherNoDrive(aoConcluir) {
    let arquivos = [];
    try { arquivos = await driveListarCalendarios(); } catch (e) {
      console.error(e);
      UI.toast("Não deu para ler o Drive agora.");
      return;
    }
    UI.abrirModal(`
      <div class="modal-head com-marca">
        <span class="modal-ic" style="--ic-cor:var(--s-pessoal)">${UI.icone("nuvem")}</span>
        <div class="modal-head-texto">
          <h2 class="modal-title">Calendários no seu Drive</h2>
          <p class="modal-desc">${arquivos.length ? "Escolha o arquivo .ics." : "Nenhum arquivo .ics encontrado."}</p>
        </div>
      </div>
      <div class="modal-body">
        ${arquivos.length ? `<ul class="lembretes">${arquivos.map((f, n) => `<li>
          <span class="grow"><span class="t">${fmt.escape(f.name)}</span><span class="m">modificado em ${new Date(f.modifiedTime).toLocaleDateString("pt-BR")}</span></span>
          <button type="button" class="btn sm" data-arq="${n}">Usar este</button></li>`).join("")}</ul>`
        : `<p class="card-note" style="margin:0;">Exporte o calendário (Google Agenda: Configurações, Importar e exportar), descompacte o .zip e envie o .ics para o Drive. Ou use a opção "Google Agenda", que lê direto da agenda.</p>`}
      </div>
      <div class="modal-foot"><span class="modal-foot-espaco"></span><button class="btn" type="button" data-acao="fechar">Fechar</button></div>`, {
      classe: "formulario",
      aoMontar(modal, fechar) {
        modal.querySelector('[data-acao="fechar"]').addEventListener("click", () => fechar(null));
        modal.querySelectorAll("[data-arq]").forEach((b) => b.addEventListener("click", async () => {
          const f = arquivos[Number(b.dataset.arq)];
          b.disabled = true;
          b.textContent = "Lendo…";
          try {
            const texto = await driveBaixarTexto(f.id);
            fechar(null);
            revisar(parseICS(texto), { origem: "drive", nome: f.name, aoConcluir });
          } catch (e) {
            console.error(e);
            b.disabled = false;
            b.textContent = "Usar este";
            UI.toast("Não deu para baixar esse arquivo.");
          }
        }));
      },
    });
  }

  /** Revisão: cada evento com caixa de marcar; passados e já importados entram desmarcados. */
  function revisar(eventos, { origem, nome, aoConcluir }) {
    if (!eventos.length) {
      UI.toast("Nenhum evento encontrado nesse calendário.");
      return;
    }
    const hoje = UI.hojeISO();
    const existentes = Store.lista(CAMINHO);
    const porUid = new Set(existentes.map((c) => c.origemImport).filter(Boolean));
    const porChave = new Set(existentes.map((c) => `${c.data}|${String(c.descricao || "").trim().toLowerCase()}`));
    const linhas = eventos
      .sort((a, b) => a.data.localeCompare(b.data) || (a.hora || "").localeCompare(b.hora || ""))
      .map((e) => {
        const repetido = porUid.has(e.uid) || porChave.has(`${e.data}|${e.titulo.trim().toLowerCase()}`);
        const passado = e.data < hoje && !e.repete;
        return { ...e, repetido, passado, marcado: !repetido && !passado };
      });
    const LIMITE = 400;
    let verPassados = false;

    UI.abrirModal(`
      <div class="modal-head com-marca">
        <span class="modal-ic" style="--ic-cor:var(--s-pessoal)">${UI.icone("calendario")}</span>
        <div class="modal-head-texto">
          <h2 class="modal-title">Revisar a importação</h2>
          <p class="modal-desc">${fmt.escape(nome)}: ${linhas.length} ${linhas.length === 1 ? "evento" : "eventos"}. Os que já passaram e os que já estão no Delfos entram desmarcados.</p>
        </div>
      </div>
      <div class="modal-body">
        <div class="importar-cal-barra">
          <label class="card-note"><input type="checkbox" class="check" data-passados /> mostrar os que já passaram (${linhas.filter((l) => l.passado).length})</label>
          <span class="modal-foot-espaco"></span>
          <button type="button" class="btn ghost sm" data-todos>Marcar todos</button>
          <button type="button" class="btn ghost sm" data-nenhum>Desmarcar todos</button>
        </div>
        <ul class="lembretes importar-cal" data-lista></ul>
      </div>
      <div class="modal-foot">
        <span class="modal-atalho" data-resumo></span>
        <span class="modal-foot-espaco"></span>
        <button class="btn" type="button" data-acao="fechar">Cancelar</button>
        <button class="btn primary" type="button" data-acao="ok">Importar</button>
      </div>`, {
      classe: "formulario wide",
      aoMontar(modal, fechar) {
        const ul = modal.querySelector("[data-lista]");
        const visiveis = () => linhas.filter((l) => verPassados || !l.passado).slice(0, LIMITE);
        const resumo = () => {
          const n = linhas.filter((l) => l.marcado).length;
          modal.querySelector("[data-resumo]").textContent = `${n} ${n === 1 ? "marcado" : "marcados"}`;
          modal.querySelector('[data-acao="ok"]').disabled = !n;
          modal.querySelector('[data-acao="ok"]').textContent = n ? `Importar ${n}` : "Importar";
        };
        const desenhar = () => {
          const vis = visiveis();
          ul.innerHTML = vis.length ? vis.map((l) => `<li>
            <input type="checkbox" class="check" data-i="${linhas.indexOf(l)}" ${l.marcado ? "checked" : ""} aria-label="Importar ${fmt.escape(l.titulo)}" />
            <span class="grow">
              <span class="t">${fmt.escape(l.titulo)}${l.repetido ? ` <span class="badge">já está no Delfos</span>` : ""}${l.repete ? ` <span class="badge feito">${(UI.REPETICOES.find(([v]) => v === l.repete) || [, ""])[1].toLowerCase()}</span>` : ""}${l.regraComplexa ? ` <span class="badge">repetição não copiada</span>` : ""}</span>
              <span class="m">${fmt.escape([UI.dataPorExtensoCurta(l.data), l.hora ? `às ${l.hora}` : "", l.local].filter(Boolean).join(", "))}</span>
            </span>
          </li>`).join("") : `<li><span class="card-note">Todos os eventos desse calendário já passaram. Marque "mostrar os que já passaram" para vê-los.</span></li>`;
          resumo();
        };
        ul.addEventListener("change", (ev) => {
          const c = ev.target.closest("[data-i]");
          if (c) { linhas[Number(c.dataset.i)].marcado = c.checked; resumo(); }
        });
        modal.querySelector("[data-passados]").addEventListener("change", (ev) => { verPassados = ev.target.checked; desenhar(); });
        modal.querySelector("[data-todos]").addEventListener("click", () => { visiveis().forEach((l) => { l.marcado = true; }); desenhar(); });
        modal.querySelector("[data-nenhum]").addEventListener("click", () => { linhas.forEach((l) => { l.marcado = false; }); desenhar(); });
        modal.querySelector('[data-acao="fechar"]').addEventListener("click", () => fechar(null));
        modal.querySelector('[data-acao="ok"]').addEventListener("click", () => {
          const ids = linhas.filter((l) => l.marcado).map((l) => Store.inserir(CAMINHO, {
            descricao: l.titulo, data: l.data, hora: l.hora || "", tipo: "compromisso", local: l.local || "",
            observacoes: l.observacoes || "", repete: l.repete || "", repeteAte: l.repeteAte || "",
            importante: false, lembrete: "", concluido: l.data < hoje && !l.repete,
            origemImport: l.uid, importadoDe: origem,
          })?.id).filter(Boolean);
          fechar(null);
          aoConcluir();
          UI.toast(`${ids.length} ${ids.length === 1 ? "compromisso importado" : "compromissos importados"}.`, {
            acaoRotulo: "Desfazer",
            aoAcionar: () => { ids.forEach((id) => Store.remover(CAMINHO, id)); aoConcluir(); },
          });
        });
        desenhar();
      },
    });
  }

  return { parseICS, deEventoGoogle, gradeDoMes, lerDataICS, desdobrar, itensEntre, montar, abrirImportacao };
})();

if (typeof module !== "undefined") module.exports = Calendario;
