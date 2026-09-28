/* ===========================================================================
   Leituras — o que o Delfos diz de cada aba: a frase do alto da página e as
   notas de "O que o Delfos notou". Só lê o estado e devolve texto; quem
   desenha são as páginas (e a visão geral, que junta as notas de todas).

   Todo texto do usuário que entra no HTML passa por UI.fmt.escape.
   =========================================================================== */

const Leituras = (() => {
  const { fmt } = UI;
  const esc = fmt.escape;
  const moeda = fmt.moeda;
  const pct = (x) => `${Math.round((Number(x) || 0) * 100)}%`;
  const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const nomeMes = (chave) => MESES_LONGOS[Number(chave.slice(5, 7)) - 1];
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const quando = (dias) => (dias === 0 ? "hoje" : dias === 1 ? "amanhã" : dias < 0 ? `há ${-dias} ${dias === -1 ? "dia" : "dias"}` : `em ${dias} dias`);
  const nota = (tipo, ic, html, extra = {}) => ({ tipo, ic, html, ...extra });

  /** Início (ISO) do período: semana começa na segunda. */
  function inicioPeriodo(periodo, hoje = UI.hojeISO()) {
    if (periodo === "ano") return `${hoje.slice(0, 4)}-01-01`;
    if (periodo === "mes") return `${hoje.slice(0, 7)}-01`;
    return UI.chaveSemana(hoje);
  }
  const ROTULO_PERIODO = { semana: "desta semana", mes: "do mês", ano: "do ano" };
  const RESTO_PERIODO = { semana: "na semana", mes: "no mês", ano: "no ano" };

  /** Fração do período já passada (0–1), para medir o ritmo de uma meta. */
  function fracaoPeriodo(periodo) {
    const hoje = new Date(UI.hojeISO() + "T00:00:00");
    const ini = new Date(inicioPeriodo(periodo) + "T00:00:00");
    const fim = new Date(ini);
    if (periodo === "ano") fim.setFullYear(fim.getFullYear() + 1);
    else if (periodo === "mes") fim.setMonth(fim.getMonth() + 1);
    else fim.setDate(fim.getDate() + 7);
    return Math.min(1, Math.max(0.02, (hoje - ini + 86400000) / (fim - ini)));
  }

  /* ------------------------------- Faculdade -------------------------------- */

  function faculdade() {
    const e = Store.estado();
    const ativas = e.faculdade.disciplinas.filter((d) => d.status !== "concluída");
    const nomeDisc = (id) => e.faculdade.disciplinas.find((d) => d.id === id)?.nome || "";
    const temNota = (a) => a.nota !== null && a.nota !== undefined && a.nota !== "";

    const avaliacoes = ativas.flatMap((d) => (d.avaliacoes || []).map((a) => ({ ...a, disciplina: d })));
    const futuras = avaliacoes
      .filter((a) => a.data && !temNota(a) && UI.diasAte(a.data) >= 0)
      .sort((a, b) => a.data.localeCompare(b.data));
    const semData = avaliacoes.filter((a) => !a.data && !temNota(a));
    const prazos = e.faculdade.prazos.filter((p) => !p.concluido);
    const prazosFuturos = prazos.filter((p) => p.data && UI.diasAte(p.data) >= 0).sort((a, b) => a.data.localeCompare(b.data));
    const atrasados = prazos.filter((p) => p.data && UI.diasAte(p.data) < 0);

    const porDisciplina = ativas.map((d) => ({
      d,
      media: UI.mediaDisciplina(d),
      nec: UI.notaNecessaria(d),
      prox: UI.proximaAvaliacao(d),
      resumos: (d.resumos || []).length,
    }));
    const comMedia = porDisciplina.filter((x) => x.media);
    const mediaGeral = comMedia.length ? comMedia.reduce((s, x) => s + x.media.media, 0) / comMedia.length : null;

    // Próximas 4 semanas, de segunda a domingo, com provas e entregas.
    const semanas = [0, 1, 2, 3].map((n) => {
      const ini = new Date(UI.chaveSemana(UI.hojeISO()) + "T00:00:00");
      ini.setDate(ini.getDate() + n * 7);
      const chave = `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, "0")}-${String(ini.getDate()).padStart(2, "0")}`;
      const itens = [
        ...futuras.filter((a) => UI.chaveSemana(a.data) === chave).map((a) => ({ tipo: "prova", titulo: `${a.nome || "Avaliação"}`, sub: a.disciplina.nome, data: a.data, href: `disciplina.html?id=${encodeURIComponent(a.disciplina.id)}` })),
        ...prazosFuturos.filter((p) => UI.chaveSemana(p.data) === chave).map((p) => ({ tipo: p.tipo || "entrega", titulo: p.descricao, sub: nomeDisc(p.disciplinaId) || p.tipo || "entrega", data: p.data })),
      ].sort((a, b) => a.data.localeCompare(b.data));
      return { chave, itens };
    });

    // --- A frase
    const em14 = [...futuras.filter((a) => UI.diasAte(a.data) <= 14), ...prazosFuturos.filter((p) => UI.diasAte(p.data) <= 14)];
    const nProvas = futuras.filter((a) => UI.diasAte(a.data) <= 14).length;
    const nEntregas = prazosFuturos.filter((p) => UI.diasAte(p.data) <= 14).length;
    const primeira = [...futuras.map((a) => ({ t: `${a.nome || "Avaliação"} de ${a.disciplina.nome}`, data: a.data })), ...prazosFuturos.map((p) => ({ t: p.descricao, data: p.data }))]
      .sort((a, b) => a.data.localeCompare(b.data))[0];
    let frase;
    if (!ativas.length && !prazos.length) {
      frase = "Nenhuma disciplina cadastrada ainda. Com as disciplinas e as avaliações de cada uma, o Delfos diz quanto você precisa tirar e onde a semana aperta.";
    } else {
      const partes = [];
      if (em14.length) partes.push(nProvas && nEntregas ? `${plural(nProvas, "avaliação", "avaliações")} e ${plural(nEntregas, "entrega", "entregas")}` : nProvas ? plural(nProvas, "avaliação", "avaliações") : plural(nEntregas, "entrega", "entregas"));
      frase = em14.length
        ? `Nas próximas duas semanas há ${partes[0]}; a primeira é <b>${esc(primeira.t)}</b>, ${quando(UI.diasAte(primeira.data))}.`
        : primeira ? `Nada nas próximas duas semanas. A próxima é <b>${esc(primeira.t)}</b>, ${quando(UI.diasAte(primeira.data))}.` : "Nenhuma prova ou entrega marcada à frente.";
      if (atrasados.length) frase += ` <span class="destaque">${plural(atrasados.length, "entrega atrasada", "entregas atrasadas")}</span>.`;
      if (mediaGeral !== null) frase += ` Sua média geral está em <b>${fmt.decimal(mediaGeral)}</b>`;
      const aperto = porDisciplina.filter((x) => x.media && x.nec?.situacao === "possivel").sort((a, b) => b.nec.precisa - a.nec.precisa)[0];
      if (mediaGeral !== null) frase += aperto ? `; em <b>${esc(aperto.d.nome)}</b>, precisa de <b>${fmt.decimal(aperto.nec.precisa)}</b> nas próximas avaliações.` : ".";
    }

    // --- As notas
    const notas = [];
    atrasados.forEach((p) => notas.push(nota("alerta", "alerta", `<b>${esc(p.descricao)}</b> venceu ${quando(UI.diasAte(p.data))}. Conclua ou mude a data para a agenda não mentir.`)));
    porDisciplina.forEach((x) => {
      const link = { rotulo: "Abrir disciplina", href: `disciplina.html?id=${encodeURIComponent(x.d.id)}` };
      if (x.nec?.situacao === "impossivel") notas.push(nota("alerta", "alerta", `Em <b>${esc(x.d.nome)}</b>, nem 10 nas avaliações que faltam leva à média ${fmt.decimal(x.nec.minima)}. Vale ver com o professor como funciona a recuperação.`, { acao: link }));
      else if (x.nec?.situacao === "possivel" && x.nec.precisa >= 8) notas.push(nota("atencao", "alvo", `Em <b>${esc(x.d.nome)}</b>, você precisa de <b>${fmt.decimal(x.nec.precisa)}</b> em média nas ${plural(x.nec.quantasFaltam, "avaliação que falta", "avaliações que faltam")}.`, { acao: link }));
      else if (x.nec?.situacao === "garantida") notas.push(nota("bom", "check", `Em <b>${esc(x.d.nome)}</b>, a média ${fmt.decimal(x.nec.minima)} já está garantida.`));
      if (x.prox && UI.diasAte(x.prox.data) >= 0 && UI.diasAte(x.prox.data) <= 7 && !x.resumos) {
        notas.push(nota("atencao", "editar", `<b>${esc(x.d.nome)}</b> tem ${esc(x.prox.nome || "avaliação")} ${quando(UI.diasAte(x.prox.data))} e nenhum resumo cadastrado.`, { acao: { rotulo: "Escrever resumo", href: `resumo.html?disciplina=${encodeURIComponent(x.d.id)}` } }));
      }
    });
    const cheia = semanas.find((s) => s.itens.filter((i) => i.tipo === "prova").length >= 2);
    if (cheia) {
      const provas = cheia.itens.filter((i) => i.tipo === "prova");
      notas.push(nota("atencao", "calendario", `A semana de ${fmt.dataCurta(cheia.chave)} tem ${plural(provas.length, "avaliação", "avaliações")}: ${provas.map((i) => `${esc(i.titulo)} (${esc(i.sub)})`).join(", ")}. Comece a revisar antes.`));
    }
    const tcc = prazosFuturos.filter((p) => p.tipo === "TCC" && UI.diasAte(p.data) <= 21);
    tcc.forEach((p) => notas.push(nota("atencao", "relogio", `Prazo do TCC: <b>${esc(p.descricao)}</b>, ${quando(UI.diasAte(p.data))}.`)));
    const horas = Number(e.preferencias.faculdade?.horasEstudo) || 0;
    if (horas && nProvas) notas.push(nota("info", "relogio", `Com ${plural(nProvas, "avaliação", "avaliações")} nas próximas duas semanas e ${fmt.decimal(horas, 0)} h de estudo por semana, dá cerca de <b>${fmt.decimal((horas * 2) / nProvas, 1)} h para cada uma</b>.`));
    const semAval = ativas.filter((d) => !(d.avaliacoes || []).length);
    if (semAval.length) notas.push(nota("info", "faculdade", `${semAval.length === 1 ? `<b>${esc(semAval[0].nome)}</b> não tem` : `${semAval.length} disciplinas não têm`} avaliações cadastradas; sem elas não dá para calcular quanto você precisa tirar.`));
    if (semData.length) notas.push(nota("info", "calendario", `${plural(semData.length, "avaliação está", "avaliações estão")} sem data (${semData.slice(0, 3).map((a) => `${esc(a.nome || "avaliação")} de ${esc(a.disciplina.nome)}`).join(", ")}); com data, entram na agenda.`));

    return { ativas, futuras, semData, prazos, atrasados, porDisciplina, mediaGeral, semanas, frase, notas: UI.ordenarNotas(notas) };
  }

  /* -------------------------------- Projetos -------------------------------- */

  function projetos() {
    const e = Store.estado();
    const prefs = e.preferencias.projetos || {};
    const mes = UI.mesAtual();
    const doMes = (lista, chave = mes) => (lista || []).filter((x) => (x.data || "").startsWith(chave)).reduce((s, x) => s + (Number(x.valor) || 0), 0);
    const ativos = e.projetos.filter((p) => p.status !== "concluído" && p.status !== "arquivado");

    const porProjeto = ativos.map((p) => {
      const r = UI.resumoProjeto(p);
      const recMes = doMes(p.recebimentos);
      const custoMes = doMes(p.custos);
      const horasMes = (Number(p.horasSemana) || 0) * 4.33;
      const proxima = (p.passos || []).filter((s) => !s.feito).sort((a, b) => (a.prazo || "9999").localeCompare(b.prazo || "9999"))[0] || null;
      return { p, r, recMes, custoMes, estim: Number(p.rendaEstimada) || 0, valorHora: horasMes && recMes ? recMes / horasMes : null, proxima };
    });

    const recebido = porProjeto.reduce((s, x) => s + x.recMes, 0);
    const custos = porProjeto.reduce((s, x) => s + x.custoMes, 0);
    const estimado = porProjeto.reduce((s, x) => s + x.estim, 0);
    const horas = ativos.reduce((s, p) => s + (Number(p.horasSemana) || 0), 0);
    const meta = Number(prefs.metaMensal) || 0;

    const meses = [];
    let chave = mes;
    for (let i = 0; i < 6; i++) {
      meses.unshift({ chave, valor: e.projetos.reduce((s, p) => s + doMes(p.recebimentos, chave), 0) });
      chave = Financas.deslocarMes(chave, -1);
    }

    let frase;
    if (!e.projetos.length) {
      frase = "Nenhum projeto ainda. Monitoria, plantão, conteúdo, freela: cada iniciativa que traz dinheiro vira um projeto, com etapas, recebimentos e custos.";
    } else {
      frase = `Em ${nomeMes(mes)}, seus projetos renderam <b>${moeda(recebido)}</b>`;
      if (estimado) frase += `, ${pct(recebido / estimado)} dos ${moeda(estimado)} estimados por mês`;
      frase += custos ? `, com ${moeda(custos)} de custos.` : ".";
      if (meta) frase += recebido >= meta ? ` A meta de <span class="bem">${moeda(meta)}</span> foi alcançada.` : ` Para a meta de ${moeda(meta)}, faltam <b>${moeda(meta - recebido)}</b>.`;
      const melhor = porProjeto.filter((x) => x.valorHora).sort((a, b) => b.valorHora - a.valorHora)[0];
      if (melhor) frase += ` <b>${esc(melhor.p.nome)}</b> paga cerca de <b>${moeda(melhor.valorHora)} por hora</b>.`;
    }

    const notas = [];
    const disponiveis = Number(prefs.horasDisponiveis) || 0;
    if (disponiveis && horas > disponiveis) notas.push(nota("alerta", "relogio", `Os projetos ativos pedem <b>${fmt.decimal(horas, 0)} h por semana</b>, e você disse ter ${fmt.decimal(disponiveis, 0)} h. Algo precisa pausar ou encolher.`));
    porProjeto.forEach((x) => {
      const link = { rotulo: "Abrir projeto", href: `projeto.html?id=${encodeURIComponent(x.p.id)}` };
      if (x.r.urgencia && x.r.urgencia.dias !== null && x.r.urgencia.dias <= 7) notas.push(nota(x.r.urgencia.dias < 0 ? "alerta" : "atencao", "relogio", `O prazo de <b>${esc(x.p.nome)}</b> ${x.r.urgencia.dias < 0 ? "passou" : "chega"} ${quando(x.r.urgencia.dias)}.`, { acao: link }));
      if (x.r.lucro < 0) notas.push(nota("alerta", "desceu", `<b>${esc(x.p.nome)}</b> já custou ${moeda(x.r.custoTotal)} e rendeu ${moeda(x.r.faturado)}: resultado de <b>${moeda(x.r.lucro)}</b>.`, { acao: link }));
      if (!x.proxima && x.p.status !== "pausado") notas.push(nota("atencao", "lampada", `<b>${esc(x.p.nome)}</b> não tem etapa em aberto. Qual é o próximo passo?`, { acao: link }));
      if (x.estim && !x.recMes && UI.hojeISO().slice(8, 10) >= "20") notas.push(nota("info", "cofre", `<b>${esc(x.p.nome)}</b> ainda não teve recebimento em ${nomeMes(mes)}; a estimativa é ${moeda(x.estim)}.`, { acao: link }));
    });
    const melhor = porProjeto.filter((x) => x.valorHora).sort((a, b) => b.valorHora - a.valorHora);
    if (melhor.length >= 2) notas.push(nota("bom", "subiu", `Por hora, <b>${esc(melhor[0].p.nome)}</b> rende mais (${moeda(melhor[0].valorHora)}) que <b>${esc(melhor.at(-1).p.nome)}</b> (${moeda(melhor.at(-1).valorHora)}).`));
    const ops = e.oportunidades || [];
    if (ops.length) notas.push(nota("info", "lampada", `${plural(ops.length, "oportunidade anotada", "oportunidades anotadas")}${ops[0].potencial ? `; a primeira, <b>${esc(ops[0].descricao)}</b>, com potencial de ${esc(ops[0].potencial)}` : ""}.`));
    if (meta && recebido >= meta) notas.push(nota("bom", "check", `Meta do mês alcançada: ${moeda(recebido)} de ${moeda(meta)}.`));

    return { ativos, porProjeto, recebido, custos, estimado, horas, meta, meses, frase, notas: UI.ordenarNotas(notas) };
  }

  /* --------------------------------- Pessoal -------------------------------- */

  function pessoal() {
    const e = Store.estado();
    const todos = e.pessoal?.compromissos || [];
    const abertos = todos.filter((c) => !c.concluido);
    const atrasados = abertos.filter((c) => c.data && UI.diasAte(c.data) < 0);
    const semana = abertos.filter((c) => c.data && UI.diasAte(c.data) >= 0 && UI.diasAte(c.data) <= 7).sort((a, b) => a.data.localeCompare(b.data));
    const outros = UI.compromissos().filter((i) => i.area !== "pessoal");

    let frase;
    if (!todos.length) frase = "Nada pessoal cadastrado. Consulta, revisão do carro, um recado com data: o que não é financeiro, faculdade nem projeto mora aqui.";
    else if (semana.length) frase = `Esta semana há ${plural(semana.length, "compromisso pessoal", "compromissos pessoais")}; o próximo é <b>${esc(semana[0].descricao)}</b>, ${quando(UI.diasAte(semana[0].data))}.`;
    else {
      const prox = abertos.filter((c) => c.data && UI.diasAte(c.data) >= 0).sort((a, b) => a.data.localeCompare(b.data))[0];
      frase = prox ? `Semana livre por aqui. O próximo é <b>${esc(prox.descricao)}</b>, ${quando(UI.diasAte(prox.data))}.` : "Nada pessoal marcado à frente.";
    }
    if (atrasados.length) frase += ` <span class="destaque">${plural(atrasados.length, "ficou para trás", "ficaram para trás")}</span>.`;

    const notas = [];
    atrasados.forEach((c) => notas.push(nota("alerta", "alerta", `<b>${esc(c.descricao)}</b> era para ${quando(UI.diasAte(c.data))}. Concluído ou remarcado?`)));
    abertos.filter((c) => c.data && UI.diasAte(c.data) >= 0).forEach((c) => {
      const mesmoDia = outros.filter((o) => o.data === c.data);
      if (mesmoDia.length) notas.push(nota("atencao", "calendario", `<b>${esc(c.descricao)}</b> cai no mesmo dia (${fmt.dataCurta(c.data)}) de ${mesmoDia.map((o) => `${esc(o.titulo)} <span class="muted">(${esc(o.areaRotulo)})</span>`).join(", ")}.`));
    });
    const semLocal = abertos.filter((c) => c.tipo === "consulta" && !c.local);
    if (semLocal.length) notas.push(nota("info", "pessoal", `${semLocal.length === 1 ? `A consulta <b>${esc(semLocal[0].descricao)}</b> está` : `${semLocal.length} consultas estão`} sem local cadastrado.`));
    // Dia cheio: 3+ coisas de qualquer aba no mesmo dia, nos próximos 14 dias.
    const porDia = {};
    UI.compromissos().filter((i) => { const d = UI.diasAte(i.data); return d !== null && d >= 0 && d <= 14; }).forEach((i) => { (porDia[i.data] = porDia[i.data] || []).push(i); });
    Object.entries(porDia).filter(([, l]) => l.length >= 3).slice(0, 1).forEach(([dia, l]) => notas.push(nota("atencao", "calendario", `${fmt.capitalizar(fmt.dataPorExtenso(dia))} junta ${l.length} compromissos de abas diferentes: ${l.map((i) => esc(i.titulo)).join(", ")}.`)));
    if (todos.length && !semana.length && !atrasados.length) notas.push(nota("bom", "check", "Nada pessoal pendente nesta semana."));

    return { todos, abertos, atrasados, semana, frase, notas: UI.ordenarNotas(notas) };
  }

  /* ---------------------------- Aba do usuário ------------------------------ */

  /** Dias consecutivos com marcação, terminando hoje ou ontem. */
  function sequencia(feitos) {
    const set = new Set(feitos || []);
    const d = new Date(UI.hojeISO() + "T00:00:00");
    const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    if (!set.has(iso(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (set.has(iso(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /** Os últimos 7 dias (do mais antigo a hoje), cada um com marcado ou não. */
  function ultimos7(feitos) {
    const set = new Set(feitos || []);
    return [6, 5, 4, 3, 2, 1, 0].map((n) => {
      const d = new Date(UI.hojeISO() + "T00:00:00");
      d.setDate(d.getDate() - n);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { iso, feito: set.has(iso), dia: ["D", "S", "T", "Q", "Q", "S", "S"][d.getDay()] };
    });
  }

  const valorCampo = (item, campo) => (item.extras || {})[campo.id];
  const dataDoItem = (i) => i.data || (i.criadoEm || "").slice(0, 10);

  /** Quanto da meta da aba já foi cumprido no período. */
  function progressoMeta(p) {
    const m = p.meta;
    if (!m || !(Number(m.alvo) > 0)) return null;
    const ini = inicioPeriodo(m.periodo || "mes");
    const itens = p.itens || [];
    let atual = 0;
    if (m.tipo === "checkins") atual = itens.reduce((s, i) => s + (i.feitos || []).filter((d) => d >= ini).length, 0);
    else if (m.tipo === "soma") {
      const campo = (p.campos || []).find((c) => c.id === m.campoId);
      atual = campo ? itens.filter((i) => dataDoItem(i) >= ini).reduce((s, i) => s + (Number(valorCampo(i, campo)) || 0), 0) : 0;
    } else atual = itens.filter((i) => i.concluido && (i.concluidoEm || dataDoItem(i) || "") >= ini).length;
    const alvo = Number(m.alvo);
    const fr = fracaoPeriodo(m.periodo || "mes");
    return { atual, alvo, pct: Math.min(1, atual / alvo), projecao: atual / fr, noRitmo: atual >= alvo * fr * 0.9, periodo: m.periodo || "mes" };
  }

  function descreverMeta(p, prog) {
    const m = p.meta;
    const campo = (p.campos || []).find((c) => c.id === m.campoId);
    const rot = (p.rotuloItem || "item").toLowerCase();
    // Unidade: o que está entre parênteses no rótulo do campo ("Distância (km)" → km).
    const unidadeCampo = campo ? (campo.rotulo.match(/\(([^)]+)\)\s*$/)?.[1] || campo.rotulo.toLowerCase()) : "";
    const dinheiro = m.tipo === "soma" && campo?.tipo === "dinheiro";
    const f = (v) => {
      const n = Number(v) || 0;
      if (dinheiro) return moeda(n);
      const num = fmt.decimal(n, Number.isInteger(n) ? 0 : 1);
      if (m.tipo === "soma") return `${num} ${unidadeCampo}`;
      if (m.tipo === "checkins") return `${num} ${n === 1 ? "marcação" : "marcações"}`;
      return `${num} ${n === 1 ? rot : pluralizar(rot)}`;
    };
    const soNumero = (v) => (dinheiro ? moeda(v) : fmt.decimal(Number(v) || 0, Number.isInteger(Number(v)) ? 0 : 1));
    return { f, texto: `${soNumero(prog.atual)} de ${f(prog.alvo)}` };
  }

  function pilar(p) {
    const itens = p.itens || [];
    const abertos = itens.filter((i) => !i.concluido);
    const concluidos = itens.filter((i) => i.concluido);
    const atrasados = p.naAgenda ? abertos.filter((i) => i.data && UI.diasAte(i.data) < 0) : [];
    const semana = p.naAgenda ? abertos.filter((i) => i.data && UI.diasAte(i.data) >= 0 && UI.diasAte(i.data) <= 7).sort((a, b) => a.data.localeCompare(b.data)) : [];
    const rot = (p.rotuloItem || "item").toLowerCase();
    const rots = pluralizar(rot);
    const mes = UI.mesAtual();

    // Resumo por campo: o que dá para dizer de cada um sem configurar nada.
    const resumoCampos = (p.campos || []).map((c) => {
      const vals = itens.map((i) => valorCampo(i, c)).filter((v) => v !== undefined && v !== null && v !== "");
      if (!vals.length) return null;
      if (c.tipo === "select") {
        const cont = {};
        vals.forEach((v) => { cont[v] = (cont[v] || 0) + 1; });
        const ordem = [...(c.opcoes || []), ...Object.keys(cont)].filter((v, k, a) => a.indexOf(v) === k && cont[v]);
        return { campo: c, tipo: "distribuicao", linhas: ordem.map((v) => ({ nome: v, valor: cont[v] })) };
      }
      if (c.tipo === "dinheiro") {
        const noMes = itens.filter((i) => dataDoItem(i).startsWith(mes)).reduce((s, i) => s + (Number(valorCampo(i, c)) || 0), 0);
        const antes = itens.filter((i) => dataDoItem(i).startsWith(Financas.deslocarMes(mes, -1))).reduce((s, i) => s + (Number(valorCampo(i, c)) || 0), 0);
        return { campo: c, tipo: "dinheiro", noMes, antes, total: vals.reduce((s, v) => s + (Number(v) || 0), 0) };
      }
      if (c.tipo === "number") {
        const nums = vals.map(Number).filter((v) => !Number.isNaN(v));
        if (!nums.length) return null;
        return { campo: c, tipo: "numero", media: nums.reduce((s, v) => s + v, 0) / nums.length, total: nums.reduce((s, v) => s + v, 0), n: nums.length, max: Math.max(...nums) };
      }
      if (c.tipo === "simNao") return { campo: c, tipo: "simNao", sim: vals.filter(Boolean).length, n: itens.length };
      return null;
    }).filter(Boolean);

    const prog = progressoMeta(p);
    const checkin = p.checkin ? itens.map((i) => ({ i, seq: sequencia(i.feitos), semana: (i.feitos || []).filter((d) => d >= inicioPeriodo("semana")).length, hoje: (i.feitos || []).includes(UI.hojeISO()) })) : [];

    // --- A frase
    const partes = [];
    const nome = esc(p.nome);
    if (!itens.length) {
      partes.push(p.checkin
        ? `Nada em ${nome} ainda. Cadastre o que você quer fazer com frequência e marque cada dia em que fez; o Delfos conta as sequências.`
        : `Nada em ${nome} ainda. O primeiro ${esc(rot)} já faz esta página começar a ler.`);
    } else if (p.checkin) {
      const feitosSemana = checkin.reduce((s, x) => s + x.semana, 0);
      const possiveis = checkin.length * Math.min(7, ((new Date(UI.hojeISO() + "T00:00:00").getDay() + 6) % 7) + 1);
      const melhor = [...checkin].sort((a, b) => b.seq - a.seq)[0];
      partes.push(`Esta semana, <b>${feitosSemana} de ${possiveis}</b> marcações possíveis em ${nome}.`);
      if (melhor?.seq >= 2) partes.push(`A maior sequência agora é <b>${esc(melhor.i.descricao)}</b>, com ${melhor.seq} dias seguidos.`);
      const hojeFalta = checkin.filter((x) => !x.hoje).length;
      partes.push(hojeFalta ? `Faltam ${hojeFalta} para marcar hoje.` : `<span class="bem">Tudo marcado hoje</span>.`);
    } else if (p.naAgenda) {
      partes.push(semana.length ? `${fmt.capitalizar(plural(semana.length, esc(rot), esc(rots)))} para os próximos 7 dias; o próximo é <b>${esc(semana[0].descricao)}</b>, ${quando(UI.diasAte(semana[0].data))}.` : `Nada de ${nome} nos próximos 7 dias; ${plural(abertos.length, `${esc(rot)} em aberto`, `${esc(rots)} em aberto`)}.`);
      if (atrasados.length) partes.push(`<span class="destaque">${plural(atrasados.length, "atrasado", "atrasados")}</span>.`);
    } else {
      partes.push(`${fmt.capitalizar(plural(abertos.length, `${esc(rot)} em aberto`, `${esc(rots)} em aberto`))} e ${plural(concluidos.length, "concluído", "concluídos")} em ${nome}.`);
    }
    if (prog) {
      const d = descreverMeta(p, prog);
      partes.push(`Na meta ${ROTULO_PERIODO[prog.periodo]}, <b>${d.texto}</b>${prog.atual >= prog.alvo ? ", <span class=\"bem\">cumprida</span>" : prog.noRitmo ? ", no ritmo" : `; no ritmo de agora, fecha com ${d.f(Math.floor(prog.projecao))}`}.`);
    }
    const dinheiro = resumoCampos.find((r) => r.tipo === "dinheiro");
    const numero = resumoCampos.find((r) => r.tipo === "numero");
    if (dinheiro && dinheiro.noMes) partes.push(`${esc(dinheiro.campo.rotulo)} em ${nomeMes(mes)}: <b>${moeda(dinheiro.noMes)}</b>.`);
    else if (numero && itens.length >= 2) partes.push(`${esc(numero.campo.rotulo)} em média: <b>${fmt.decimal(numero.media)}</b>.`);

    // --- As notas
    const notas = [];
    atrasados.slice(0, 3).forEach((i) => notas.push(nota("alerta", "alerta", `<b>${esc(i.descricao)}</b> era para ${quando(UI.diasAte(i.data))}.`)));
    if (prog && prog.atual < prog.alvo) {
      const d = descreverMeta(p, prog);
      const falta = prog.alvo - prog.atual;
      notas.push(nota(prog.noRitmo ? "bom" : "atencao", "alvo", prog.noRitmo
        ? `Meta ${ROTULO_PERIODO[prog.periodo]} no ritmo: ${d.texto}.`
        : `Para cumprir a meta ${ROTULO_PERIODO[prog.periodo]}, faltam ${d.f(falta)} ${RESTO_PERIODO[prog.periodo]}.`));
    } else if (prog) notas.push(nota("bom", "check", `Meta ${ROTULO_PERIODO[prog.periodo]} cumprida.`));
    checkin.filter((x) => !x.seq && (x.i.feitos || []).length).slice(0, 2).forEach((x) => {
      const ult = [...x.i.feitos].sort().at(-1);
      notas.push(nota("atencao", "relogio", `<b>${esc(x.i.descricao)}</b> não é marcado desde ${fmt.dataPorExtenso(ult)}.`));
    });
    const longa = checkin.filter((x) => x.seq >= 7).sort((a, b) => b.seq - a.seq)[0];
    if (longa) notas.push(nota("bom", "subiu", `<b>${esc(longa.i.descricao)}</b>: ${longa.seq} dias seguidos.`));
    if (dinheiro && dinheiro.antes && dinheiro.noMes) {
      const v = (dinheiro.noMes - dinheiro.antes) / dinheiro.antes;
      if (Math.abs(v) >= 0.25) notas.push(nota("info", v > 0 ? "subiu" : "desceu", `${esc(dinheiro.campo.rotulo)} ${v > 0 ? "subiu" : "caiu"} ${pct(Math.abs(v))} em relação a ${MESES_LONGOS[Number(Financas.deslocarMes(mes, -1).slice(5)) - 1]}: ${moeda(dinheiro.noMes)} contra ${moeda(dinheiro.antes)}.`));
    }
    const obrig = (p.campos || []).filter((c) => c.obrigatorio);
    const incompletos = obrig.length ? abertos.filter((i) => obrig.some((c) => { const v = valorCampo(i, c); return v === undefined || v === null || v === ""; })) : [];
    if (incompletos.length) notas.push(nota("info", "editar", `${plural(incompletos.length, `${esc(rot)} está`, `${esc(rots)} estão`)} sem ${obrig.map((c) => esc(c.rotulo.toLowerCase())).join(" ou ")}.`));
    const dist = p.agruparPor ? resumoCampos.find((r) => r.campo.id === p.agruparPor && r.tipo === "distribuicao") : null;
    if (dist && dist.linhas.length) {
      const top = [...dist.linhas].sort((a, b) => b.valor - a.valor)[0];
      notas.push(nota("info", "painel", `Por ${esc(dist.campo.rotulo.toLowerCase())}, o mais comum é <b>${esc(top.nome)}</b> (${plural(top.valor, esc(rot), esc(rots))}).`));
    }

    return { itens, abertos, concluidos, atrasados, semana, resumoCampos, prog, checkin, frase: partes.join(" "), notas: UI.ordenarNotas(notas), rot, rots };
  }

  /** "livro" → "livros", "compromisso" → "compromissos", "ação" → "ações". Bom o bastante para rótulos. */
  function pluralizar(s) {
    const t = String(s || "").trim();
    if (!t) return "itens";
    if (/[aeiouáéíóúâêô]$/i.test(t) && !/ão$/i.test(t)) return `${t}s`;
    if (/ão$/i.test(t)) return t.replace(/ão$/i, "ões");
    if (/(r|z|s)$/i.test(t)) return /s$/i.test(t) ? t : `${t}es`;
    if (/m$/i.test(t)) return t.replace(/m$/i, "ns");
    if (/l$/i.test(t)) return t.replace(/l$/i, "is");
    return `${t}s`;
  }

  /* ---------------------- Todas as notas (visão geral) ---------------------- */

  function todasNotas(max = 6) {
    const e = Store.estado();
    const ativa = (id) => Personalizacao.abaAtiva(id);
    const areas = [];
    const comArea = (lista, rotulo, cor) => lista.map((n) => ({ ...n, area: { rotulo, cor } }));
    if (ativa("faculdade")) areas.push(...comArea(faculdade().notas, Personalizacao.rotuloAba("faculdade"), "var(--s-faculdade)"));
    if (ativa("projetos")) areas.push(...comArea(projetos().notas, Personalizacao.rotuloAba("projetos"), "var(--s-projetos)"));
    if (ativa("pessoal")) areas.push(...comArea(pessoal().notas, Personalizacao.rotuloAba("pessoal"), "var(--s-pessoal)"));
    (e.pilares || []).filter((p) => p.modelo !== "academia").forEach((p) => areas.push(...comArea(pilar(p).notas, p.nome, p.cor)));
    // Só o que pede ação sobe para a visão geral; o "bom" e o "info" ficam nas abas.
    return UI.ordenarNotas(areas.filter((n) => n.tipo === "alerta" || n.tipo === "atencao"), max);
  }

  return { faculdade, projetos, pessoal, pilar, todasNotas, sequencia, ultimos7, progressoMeta, descreverMeta, pluralizar, inicioPeriodo };
})();
