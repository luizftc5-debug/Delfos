/* Pessoal — compromissos e recados que não pertencem aos outros três pilares. */

(() => {
  UI.iniciarPagina("pessoal");

  const { fmt } = UI;
  const CAMINHO = "pessoal.compromissos";
  const TIPOS = ["consulta", "tarefa", "compromisso", "recado", "outro"];
  let verConcluidos = false;

  const lista = () => Store.lista(CAMINHO);

  function render() {
    const todos = lista();
    const abertos = todos.filter((c) => !c.concluido);
    const atrasados = abertos.filter((c) => (UI.diasAte(c.data) ?? 0) < 0);
    const semana = abertos.filter((c) => {
      const d = UI.diasAte(c.data);
      return d !== null && d >= 0 && d <= 7;
    });

    document.getElementById("s-abertos").textContent = abertos.length;
    document.getElementById("s-abertos-d").textContent = `${todos.length} ${todos.length === 1 ? "registro no total" : "registros no total"}`;

    document.getElementById("s-semana").textContent = semana.length;
    document.getElementById("s-semana-d").textContent = semana[0] ? `próximo: ${fmt.escape(semana[0].descricao)}` : "nada nos próximos 7 dias";

    const elAtr = document.getElementById("s-atrasados");
    elAtr.textContent = atrasados.length;
    elAtr.className = `stat-value num ${atrasados.length ? "delta down" : ""}`;
    document.getElementById("s-atrasados-d").textContent = atrasados.length ? "vale reagendar ou concluir" : "nada atrasado";

    const L = Leituras.pessoal();
    document.getElementById("leitura").innerHTML = L.frase;
    UI.renderNotas(document.getElementById("notas"), L.notas, abertos.length
      ? "Nada atrasado nem colidindo com prova ou prazo de outra área."
      : "Quando houver compromissos, o Delfos avisa o que ficou para trás e o que cai no mesmo dia de uma prova ou prazo.");
    renderPorTipo(abertos);
    renderChips(todos);
    UI.renderPerguntas(document.getElementById("sec-perguntas"), document.getElementById("perguntas"), "pessoal", perguntas(abertos), render);

    renderLista(todos);
    renderVista();
    UI.montarLayout("pessoal");
  }

  /* ------------------------ Calendário e o que se aproxima ------------------ */

  // A vista escolhida fica neste navegador; o link "#calendario" (do resumo do dia) sempre abre o calendário.
  let vista = "calendario";
  try { vista = localStorage.getItem("delfos.pessoal.vista") || "calendario"; } catch { /* nada */ }
  if (location.hash === "#calendario") vista = "calendario";
  if (location.hash === "#lista") vista = "lista";

  function aoMudarCalendario(opcoes) {
    if (opcoes?.editar) return editarCompromisso(opcoes.editar);
    render();
  }

  function renderVista() {
    document.querySelectorAll("[data-vista]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.vista === vista)));
    document.querySelectorAll("[data-na-vista]").forEach((el) => { el.hidden = el.dataset.naVista !== vista; });
    if (vista === "calendario") {
      Calendario.montar(document.getElementById("calendario"), { aoMudar: aoMudarCalendario, novoNoDia: (iso) => novoCompromisso(iso) });
      renderProximos();
    }
  }

  function renderProximos() {
    const hoje = UI.hojeISO();
    const fim = UI.isoMaisDias(14);
    const mapa = Calendario.itensEntre(hoje, fim);
    const avisa = new Set(UI.lembretesAgora().map((i) => `${i.id}|${i.data}`));
    const box = document.getElementById("proximos");
    const dias = Object.keys(mapa).sort().map((iso) => [iso, mapa[iso].filter((i) => !i.concluido)]).filter(([, l]) => l.length);
    box.innerHTML = dias.length ? dias.map(([iso, itens]) => `
      <div class="grupo-tempo">
        <h3 class="grupo-tempo-titulo">${fmt.escape(fmt.capitalizar(UI.dataPorExtensoCurta(iso)))}</h3>
        <ul class="lembretes">${itens.map((i) => `<li>
          <span class="lembrete-selo" style="--c:${fmt.escape(i.cor || "var(--texto-3)")}"></span>
          <span class="grow">
            <span class="t">${fmt.escape(i.titulo)}${i.importante ? ` <span class="badge urgente">importante</span>` : ""}</span>
            <span class="m">${fmt.escape([fmt.capitalizar(i.areaRotulo || ""), i.hora ? `às ${i.hora}` : "", i.local].filter(Boolean).join(", "))}${i.valor ? `, ${fmt.moeda(i.valor)}` : ""}</span>
          </span>
          ${avisa.has(`${i.id}|${i.data}`) ? `<span class="badge proximo" title="Entra no resumo do dia e nos avisos">${UI.icone("relogio")} lembrete</span>` : ""}
        </li>`).join("")}</ul>
      </div>`).join("") : `<p class="card-note" style="margin:0;">Nada marcado nas próximas duas semanas, em nenhuma aba.</p>`;

    const xp = UI.experiencia();
    const ant = Number(xp.lembretes?.antecedencia ?? 2);
    const antTxt = ant === 0 ? "no próprio dia" : ant === 7 ? "com uma semana de antecedência" : `com ${ant} ${ant === 1 ? "dia" : "dias"} de antecedência`;
    const podeNotificar = typeof Notification !== "undefined" && Notification.permission !== "denied";
    const cfg = document.getElementById("lembrete-config");
    cfg.innerHTML = `
      <span>O Delfos lembra ${antTxt}${xp.lembretes?.resumoDoDia === false ? "" : ", no resumo do dia"}${xp.lembretes?.navegador && podeNotificar ? " e com avisos do navegador" : ""}. O que é importante, uma semana antes.</span>
      <span class="lembrete-acoes">
        ${podeNotificar && !(xp.lembretes?.navegador && Notification.permission === "granted") ? `<button type="button" class="btn sm" data-notificar>Receber avisos do navegador</button>` : ""}
        <button type="button" class="btn ghost sm" data-resumo>Ver resumo do dia</button>
        <button type="button" class="btn ghost sm" data-ajustar>Ajustar</button>
      </span>`;
    cfg.querySelector("[data-notificar]")?.addEventListener("click", ativarAvisos);
    cfg.querySelector("[data-resumo]").addEventListener("click", () => {
      const itens = UI.lembretesAgora();
      if (itens.length) UI.abrirResumoDoDia(itens);
      else UI.toast("Nada vence hoje nem se aproxima dentro da antecedência escolhida.");
    });
    cfg.querySelector("[data-ajustar]").addEventListener("click", () => UI.abrirPerfil("rotina"));
  }

  async function ativarAvisos() {
    if (typeof Notification === "undefined") return UI.toast("Este navegador não mostra avisos.");
    const r = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (r !== "granted") return UI.toast("Sem permissão: os lembretes continuam no resumo do dia.");
    Store.definirPreferencias({ experiencia: { lembretes: { navegador: true } } });
    UI.toast("Avisos ligados. Aparecem enquanto o Delfos estiver aberto.");
    render();
  }

  const importar = (fonte = null) => Calendario.abrirImportacao({ fonte, aoConcluir: render });

  let filtroTipo = "todos";

  function renderChips(todos) {
    const tipos = [...new Set(todos.map((c) => c.tipo || "compromisso"))];
    const box = document.getElementById("f-tipo");
    box.hidden = tipos.length < 2;
    box.innerHTML = ["todos", ...tipos].map((t) => `<button type="button" class="chip" data-tipo="${fmt.escape(t)}" aria-pressed="${t === filtroTipo}">${t === "todos" ? "Tudo" : fmt.escape(fmt.capitalizar(t))}</button>`).join("");
  }

  function renderPorTipo(abertos) {
    const cont = {};
    abertos.forEach((c) => { const t = c.tipo || "compromisso"; cont[t] = (cont[t] || 0) + 1; });
    const linhas = Object.entries(cont).sort((a, b) => b[1] - a[1]).map(([nome, valor]) => ({ nome: fmt.capitalizar(nome), valor }));
    const box = document.getElementById("por-tipo");
    if (!linhas.length) box.innerHTML = `<p class="card-note" style="margin:0;">Nada em aberto.</p>`;
    else UI.barrasComMeta(box, linhas, { cor: "var(--s-pessoal)", formatar: (v) => String(v) });
  }

  // Agrupa por quando: o que ficou para trás, hoje, esta semana, as próximas
  // três semanas, mais adiante e sem data.
  function grupoDe(c) {
    if (c.concluido) return "concluidos";
    const d = UI.diasAte(c.data);
    if (d === null) return "semData";
    if (d < 0) return "atrasados";
    if (d === 0) return "hoje";
    if (d <= 7) return "semana";
    if (d <= 28) return "proximas";
    return "depois";
  }
  const GRUPOS = [
    ["atrasados", "Ficaram para trás"], ["hoje", "Hoje"], ["semana", "Nos próximos 7 dias"],
    ["proximas", "Nas próximas semanas"], ["depois", "Mais adiante"], ["semData", "Sem data"], ["concluidos", "Concluídos"],
  ];

  function renderLista(todos) {
    const box = document.getElementById("lista");
    box.innerHTML = "";
    const visiveis = todos
      .filter((c) => verConcluidos || !c.concluido)
      .filter((c) => filtroTipo === "todos" || (c.tipo || "compromisso") === filtroTipo)
      .sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999"));

    if (!visiveis.length) {
      box.appendChild(
        UI.vazio({
          icone: "pessoal",
          titulo: todos.length ? "Nada em aberto aqui" : "Nenhum compromisso pessoal ainda",
          texto: "Consulta médica, levar o carro pra revisão, comprar algo específico: registre aqui o que não é financeiro, faculdade ou projeto.",
          rotuloAcao: "Adicionar compromisso",
          aoAcionar: novoCompromisso,
        })
      );
      return;
    }

    GRUPOS.forEach(([chave, titulo]) => {
      const doGrupo = visiveis.filter((c) => grupoDe(c) === chave);
      if (!doGrupo.length) return;
      const g = document.createElement("div");
      g.className = "grupo-tempo";
      g.innerHTML = `<h3 class="grupo-tempo-titulo ${chave === "atrasados" ? "alerta" : ""}">${titulo} <span>${doGrupo.length}</span></h3>`;
      const ul = document.createElement("ul");
      ul.className = "list";
      doGrupo.forEach((c) => {
        const u = UI.urgencia(c.data);
        const li = document.createElement("li");
        li.innerHTML = `
          <input type="checkbox" class="check" ${c.concluido ? "checked" : ""} aria-label="Marcar como concluído" />
          <span class="grow">
            <span class="title ${c.concluido ? "strike" : ""}">${fmt.escape(c.descricao)}</span>
            <span class="meta">${fmt.escape([fmt.capitalizar(c.tipo || "compromisso"), c.local, c.data ? fmt.dataPorExtenso(c.data) : "", c.hora ? `às ${c.hora}` : "", c.repete ? (UI.REPETICOES.find(([r]) => r === c.repete) || [, ""])[1].toLowerCase() : ""].filter(Boolean).join(", "))}${c.importante ? " <span class=\"badge urgente\">importante</span>" : ""}</span>
          </span>
          <span class="badge ${c.concluido ? "feito" : u.nivel}">${c.concluido ? "concluído" : u.rotulo}</span>
          <span class="row-actions">
            <button class="btn ghost sm icon" data-editar title="Editar" aria-label="Editar">${UI.icone("editar")}</button>
            <button class="btn ghost sm icon" data-excluir title="Excluir" aria-label="Excluir">${UI.icone("lixeira")}</button>
          </span>`;
        li.querySelector("input").addEventListener("change", (ev) => {
          // Um compromisso que se repete não "acaba": concluir a vez de hoje
          // passa para a próxima data da série.
          if (ev.target.checked && c.repete && c.data) {
            const base = c.repeteDesde || c.data;
            let prox = c.data;
            for (let n = 1; prox <= c.data && n < 5000; n++) prox = UI.somarPeriodo(base, c.repete, n);
            if (!c.repeteAte || prox <= c.repeteAte) {
              Store.atualizar(CAMINHO, c.id, { data: prox, repeteDesde: base, concluido: false });
              UI.toast(`Feito. A próxima é ${UI.dataPorExtensoCurta(prox)}.`, {
                acaoRotulo: "Desfazer",
                aoAcionar: () => { Store.atualizar(CAMINHO, c.id, { data: c.data, repeteDesde: c.repeteDesde || "", concluido: false }); render(); },
              });
              return render();
            }
          }
          Store.atualizar(CAMINHO, c.id, { concluido: ev.target.checked });
          render();
        });
        li.querySelector("[data-editar]").addEventListener("click", () => editarCompromisso(c));
        li.querySelector("[data-excluir]").addEventListener("click", () => excluirCompromisso(c));
        ul.appendChild(li);
      });
      g.appendChild(ul);
      box.appendChild(g);
    });
  }

  function perguntas(abertos) {
    const q = [];
    const feito = (msg) => { UI.toast(msg); render(); };
    const semLocal = abertos.find((c) => c.tipo === "consulta" && !c.local);
    if (semLocal) q.push({
      id: `local:${semLocal.id}`,
      texto: `Onde vai ser “${semLocal.descricao}”?`,
      apoio: "Com o local, o compromisso aparece completo na agenda e dá para planejar o deslocamento.",
      controle: () => UI.resposta.valor({ texto: true, rotulo: "Salvar", placeholder: "Clínica, hospital, endereço", aoSalvar: (v) => { Store.atualizar(CAMINHO, semLocal.id, { local: v }); feito("Local salvo."); } }),
    });
    const atrasado = abertos.find((c) => c.data && UI.diasAte(c.data) < 0);
    if (atrasado) q.push({
      id: `atrasado:${atrasado.id}`,
      texto: `“${atrasado.descricao}” aconteceu?`,
      apoio: `Estava marcado para ${fmt.dataPorExtenso(atrasado.data)}.`,
      controle: () => UI.resposta.botoes([
        ["Sim, concluir", () => { Store.atualizar(CAMINHO, atrasado.id, { concluido: true }); feito("Concluído."); }, true],
        ["Remarcar", () => editarCompromisso(atrasado)],
      ]),
    });
    // O assistente pergunta uma vez (e de novo 14 dias depois de "Agora não")
    // se há outro calendário para trazer — até algo ser importado.
    if (!Store.lista(CAMINHO).some((c) => c.origemImport)) q.push({
      id: "importarCalendario",
      texto: "Quer trazer os compromissos de outro calendário?",
      apoio: "O Delfos lê um arquivo .ics (do Google Agenda, Outlook, iPhone), um .ics guardado no Drive, ou a sua Agenda do Google direto. Você revisa tudo antes de entrar.",
      controle: () => UI.resposta.botoes([
        ["Arquivo .ics", () => importar("arquivo"), true],
        ["Do Google Drive", () => importar("drive")],
        ["Da Agenda do Google", () => importar("google")],
      ]),
    });
    const xp = UI.experiencia();
    if (abertos.some((c) => c.data) && typeof Notification !== "undefined" && Notification.permission === "default" && !xp.lembretes?.navegador) q.push({
      id: "avisosNavegador",
      texto: "Posso avisar pelo navegador quando algo se aproximar?",
      apoio: "Uma notificação do sistema no dia (ou antes, conforme a antecedência do perfil), enquanto o Delfos estiver aberto numa aba.",
      controle: () => UI.resposta.botoes([["Sim, avisar", ativarAvisos, true]]),
    });
    return q;
  }

  /* --------------------------------- Ações ---------------------------------- */

  const campos = () => [
    { nome: "descricao", rotulo: "O que é", tipo: "text", obrigatorio: true, placeholder: "Ex.: Consulta com o cardiologista" },
    { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valorPadrao: UI.hojeISO() },
    { nome: "hora", rotulo: "Hora", tipo: "time" },
    { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: TIPOS.map((t) => ({ valor: t, rotulo: fmt.capitalizar(t) })) },
    { nome: "local", rotulo: "Local", tipo: "text", placeholder: "Ex.: Clínica, oficina, endereço…" },
    { nome: "repete", rotulo: "Repete", tipo: "select", opcoes: UI.REPETICOES.map(([valor, rotulo]) => ({ valor, rotulo })) },
    { nome: "lembrete", rotulo: "Lembrar", tipo: "select", opcoes: LEMBRETES },
    { nome: "importante", rotulo: "Importante", tipo: "simNao", rotuloMarcado: "Avisar também uma semana antes" },
    { nome: "observacoes", rotulo: "Observações", tipo: "textarea" },
  ];
  const LEMBRETES = [
    { valor: "", rotulo: "Como no perfil" }, { valor: "0", rotulo: "No dia" }, { valor: "1", rotulo: "1 dia antes" },
    { valor: "2", rotulo: "2 dias antes" }, { valor: "7", rotulo: "1 semana antes" }, { valor: "nenhum", rotulo: "Não lembrar" },
  ];

  const icPessoal = () => ({ icone: UI.icone("pessoal"), cor: "var(--s-pessoal)" });

  async function novoCompromisso(dataInicial) {
    const v = await UI.formulario({
      titulo: "Novo compromisso pessoal", campos: campos(), ...icPessoal(),
      valores: typeof dataInicial === "string" ? { data: dataInicial } : {},
    });
    if (!v) return;
    Store.inserir(CAMINHO, { ...v, concluido: false });
    UI.toast("Compromisso cadastrado.");
    render();
  }

  async function editarCompromisso(c) {
    const v = await UI.formulario({ titulo: "Editar compromisso", campos: campos(), valores: c, ...icPessoal() });
    if (!v) return;
    // Mudou a data ou a repetição: a série passa a contar da data nova.
    if (v.data !== c.data || v.repete !== c.repete) v.repeteDesde = "";
    Store.atualizar(CAMINHO, c.id, v);
    UI.toast("Compromisso atualizado.");
    render();
  }

  function excluirCompromisso(c) {
    const indice = Store.indiceDe(CAMINHO, c.id);
    Store.remover(CAMINHO, c.id);
    render();
    UI.toast("Compromisso excluído.", {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.restaurar(CAMINHO, c, indice); render(); },
    });
  }

  document.getElementById("btn-compromisso").addEventListener("click", () => novoCompromisso());
  document.getElementById("btn-importar-cal").addEventListener("click", () => importar());
  document.querySelectorAll("[data-vista]").forEach((b) => b.addEventListener("click", () => {
    vista = b.dataset.vista;
    try { localStorage.setItem("delfos.pessoal.vista", vista); } catch { /* nada */ }
    renderVista();
  }));
  document.getElementById("f-concluidos").addEventListener("change", (ev) => { verConcluidos = ev.target.checked; render(); });
  document.getElementById("f-tipo").addEventListener("click", (ev) => {
    const c = ev.target.closest("[data-tipo]");
    if (!c) return;
    filtroTipo = c.dataset.tipo;
    render();
  });

  render();
})();
