/* Visão geral — a leitura do dia, os números, a agenda e o índice das abas. */

(() => {
  UI.iniciarPagina("home");

  const { fmt } = UI;
  let diaSelecionado = "";
  let inicioSemana = UI.chaveSemana(UI.hojeISO());
  let periodo = 7;
  let semanaFiltrada = false;

  const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  /* --------------------------- Cálculos de apoio --------------------------- */

  function totaisDoMes(chave) {
    const t = Store.estado().financeiro.transacoes.filter((x) => (x.data || "").startsWith(chave));
    const receita = t.filter((x) => x.tipo === "receita").reduce((s, x) => s + (Number(x.valor) || 0), 0);
    const despesa = t.filter((x) => x.tipo === "despesa").reduce((s, x) => s + (Number(x.valor) || 0), 0);
    return { receita, despesa, resultado: receita - despesa, quantidade: t.length };
  }


  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  /** Para onde leva um item da agenda: a página de onde ele veio. */
  function destino(i) {
    if (i.area === "faculdade") return i.disciplinaId ? `disciplina.html?id=${encodeURIComponent(i.disciplinaId)}` : "faculdade.html";
    if (i.area === "projetos") return `projeto.html?id=${encodeURIComponent(i.id)}`;
    if (i.area === "financeiro") return i.tipo === "conta" ? "financeiro.html" : "financeiro.html#metas";
    if (i.area === "pessoal") return "pessoal.html";
    if (String(i.area).startsWith("pilar:")) return `pilar.html?id=${encodeURIComponent(i.area.slice(6))}`;
    return "index.html";
  }

  /** O ícone da área (pilares fixos) ou um ponto da cor dela (abas próprias). */
  function marcaArea(i) {
    const fixa = ["pessoal", "financeiro", "faculdade", "projetos"].includes(i.area);
    return fixa
      ? `<i class="marca-area" style="--marca:var(--s-${i.area}); --ic-marca:var(--ic-${i.area})" aria-hidden="true"></i>`
      : `<i class="ponto-area" style="background:${fmt.escape(i.cor || "var(--texto-3)")}" aria-hidden="true"></i>`;
  }

  /* -------------------------------- Render --------------------------------- */

  function render() {
    const mes = UI.mesAtual();
    const atual = totaisDoMes(mes);

    const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    document.getElementById("sub-hoje").textContent = fmt.capitalizar(hoje);

    // O que a visão geral mostra é escolha do perfil (Painel → A visão geral mostra).
    const mostra = UI.experiencia().home || {};
    [["sec-topo", "topo"], ["sec-abas", "pilares"], ["sec-notas", "notas"], ["sec-agenda", "agenda"], ["sec-insights", "insights"]]
      .forEach(([id, k]) => { const el = document.getElementById(id); if (el) el.hidden = mostra[k] === false; });

    document.getElementById("titulo-dia").textContent = Personalizacao.saudacao() === "Visão geral" ? "Seu dia" : Personalizacao.saudacao() + ".";
    renderLeitura();
    renderSemana();
    const compromissos = UI.compromissos();
    const hojeCount = compromissos.filter((i) => UI.diasAte(i.data) === 0).length;
    const semanaCount = compromissos.filter((i) => { const d = UI.diasAte(i.data); return d !== null && d >= 0 && d < 7; }).length;
    const atrasadosCount = compromissos.filter((i) => (UI.diasAte(i.data) ?? 0) < 0).length;
    document.getElementById("dia-numeros").innerHTML = [["Hoje", hojeCount], ["Em 7 dias", semanaCount], ["Atrasados", atrasadosCount]].map(([r, n]) => `<div><dt>${r}</dt><dd>${n}</dd></div>`).join("");
    document.getElementById("resumo-financeiro").hidden = mostra.topo === false || !Personalizacao.abaAtiva("financeiro");
    renderRazao(atual);
    renderAgenda();
    const notas = Leituras.todasNotas(2);
    document.getElementById("sec-notas").hidden = mostra.notas === false || !notas.length;
    UI.renderNotas(document.getElementById("notas"), notas, "");
    renderInsights();
    renderPilares(atual);
    UI.montarLayout("home");
    document.querySelector(".dia-link span").innerHTML = UI.icone("direita");
  }

  /** Uma frase de apoio sobre o compromisso que pede atenção. */
  function renderLeitura() {
    const alvo = document.getElementById("leitura");
    if (!alvo) return;

    const proximos = UI.compromissos();
    const atrasados = proximos.filter((i) => (UI.diasAte(i.data) ?? 0) < 0);
    const naSemana = proximos.filter((i) => {
      const d = UI.diasAte(i.data);
      return d !== null && d >= 0 && d <= 7;
    });

    const nome = (c) => fmt.escape(c.titulo);
    let tempo;

    if (atrasados.length) {
      const pior = atrasados[0];
      const dias = Math.abs(UI.diasAte(pior.data));
      tempo = atrasados.length === 1
        ? `<b>${nome(pior)}</b> venceu há <span class="destaque">${plural(dias, "dia", "dias")}</span>.`
        : `Você tem <span class="destaque">${atrasados.length} compromissos atrasados</span>. O mais antigo é <b>${nome(pior)}</b>, de ${dias} dias atrás.`;
    } else if (naSemana.length) {
      const prox = naSemana[0];
      const d = UI.diasAte(prox.data);
      const quando = d === 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`;
      tempo = naSemana.length === 1
        ? `Sua semana tem um compromisso: <b>${nome(prox)}</b>, ${quando}.`
        : `Sua semana tem ${naSemana.length} compromissos. O próximo é <b>${nome(prox)}</b>, ${quando}.`;
    } else if (proximos.length) {
      const prox = proximos[0];
      tempo = `Nada nos próximos sete dias. Depois disso vem <b>${nome(prox)}</b>, em ${fmt.dataPorExtenso(prox.data)}.`;
    } else {
      tempo = "Nenhum compromisso cadastrado ainda.";
    }

    alvo.innerHTML = proximos.length ? tempo : "Reúna seus compromissos e acompanhe o que importa, uma área de cada vez.";
  }

  function renderSemana() {
    const todos = UI.compromissos();
    document.getElementById("semana-rotulo").textContent = `${fmt.dataCurta(inicioSemana)} a ${fmt.dataCurta(UI.isoMaisDias(inicioSemana, 6))}`;
    document.getElementById("semana-dias").innerHTML = Array.from({ length: 7 }, (_, i) => {
      const data = UI.isoMaisDias(inicioSemana, i);
      const d = new Date(data + "T00:00:00");
      const n = todos.filter((c) => c.data === data).length;
      const hoje = data === UI.hojeISO();
      return `<button type="button" class="semana-dia${hoje ? " hoje" : ""}" data-dia="${data}" aria-pressed="${data === diaSelecionado}" aria-label="${fmt.escape(fmt.dataPorExtenso(data))}, ${n} compromissos"${hoje ? ' aria-current="date"' : ""}><span>${DIAS_SEMANA[d.getDay()]}</span><b>${d.getDate()}</b><small>${n ? n + (n === 1 ? " item" : " itens") : ""}</small></button>`;
    }).join("");
  }

  /** Os quatro números do dia: saldo, o mês, o próximo compromisso e o que falta pagar. */
  function renderRazao(atual) {
    // Saldo: soma das contas, ou o valor informado à mão enquanto não houver conta.
    const comContas = Financas.temContas();
    const nContas = Store.lista("financeiro.contas").length;
    document.getElementById("hero-rotulo").textContent = comContas ? "Saldo nas contas" : "Saldo atual";
    document.getElementById("hero-saldo").textContent = fmt.moeda(Financas.saldoTotal());
    document.getElementById("hero-detalhe").innerHTML = comContas
      ? `somando <a class="titulo-link" href="contas.html">${plural(nContas, "conta", "contas")}</a>`
      : "informado à mão";
    document.getElementById("btn-saldo").hidden = comContas;

    // O mês corrente: sobra (ou falta) e o que entrou e saiu.
    const nomeMes = new Date().toLocaleDateString("pt-BR", { month: "long" });
    const mesValor = document.getElementById("mes-valor");
    const mesDetalhe = document.getElementById("mes-detalhe");
    document.getElementById("mes-rotulo").textContent = atual.resultado < 0 ? `Faltou em ${nomeMes}` : `Sobrou em ${nomeMes}`;
    if (atual.quantidade === 0) {
      mesValor.textContent = fmt.moeda(0);
      mesValor.className = "stat-value num";
      mesDetalhe.textContent = "Nenhum lançamento neste mês ainda.";
    } else {
      mesValor.textContent = fmt.moeda(Math.abs(atual.resultado));
      mesValor.className = `stat-value num ${atual.resultado < 0 ? "valor-ruim" : ""}`;
      mesDetalhe.textContent = `${fmt.moeda(atual.receita)} entrou, ${fmt.moeda(atual.despesa)} saiu`;
    }

    // Próximo compromisso: o título é o valor, a data e a área vão embaixo.
    const box = document.getElementById("proximo");
    const proximos = UI.compromissos().filter((i) => (UI.diasAte(i.data) ?? -1) >= 0);
    if (!proximos.length) {
      box.innerHTML = `<div class="stat-label">Próximo compromisso</div>
        <div class="razao-titulo muted">Nada marcado</div>
        <div class="stat-sub"><button class="link-mini" type="button" data-novo-prazo>Cadastrar um prazo</button></div>`;
      box.querySelector("[data-novo-prazo]").addEventListener("click", novoPrazo);
    } else {
      const p = proximos[0];
      const u = UI.urgencia(p.data);
      const dia = new Date(p.data + "T00:00:00");
      box.innerHTML = `<div class="stat-label">Próximo compromisso</div>
        <a class="razao-titulo titulo-link" href="${destino(p)}">${fmt.escape(p.titulo)}</a>
        <div class="stat-sub razao-quando">${marcaArea(p)}<span>${fmt.capitalizar(DIAS_LONGOS[dia.getDay()])}, ${fmt.dataPorExtenso(p.data)}, <span class="badge ${u.nivel}">${u.rotulo}</span></span></div>`;
    }

    // A pagar: despesas pendentes de qualquer mês.
    const pend = Financas.pendentes();
    const soma = pend.reduce((s, t) => s + (Number(t.valor) || 0), 0);
    const pagarValor = document.getElementById("pagar-valor");
    const pagarDetalhe = document.getElementById("pagar-detalhe");
    pagarValor.textContent = fmt.moeda(soma);
    if (!pend.length) {
      pagarDetalhe.textContent = "Nada pendente";
    } else {
      const prox = pend[0];
      const u = UI.urgencia(prox.data);
      pagarDetalhe.innerHTML = `${plural(pend.length, "conta", "contas")}; a próxima, ${fmt.escape(prox.descricao || "sem nome")}, <span class="badge ${u.nivel}">${u.rotulo}</span>`;
    }
  }

  /** Agenda: um dia selecionado ou o período, com atrasados em destaque. */
  function renderAgenda() {
    const box = document.getElementById("agenda");
    const todos = UI.compromissos();
    const atrasados = diaSelecionado || semanaFiltrada ? [] : todos.filter((i) => (UI.diasAte(i.data) ?? 0) < 0);
    const proximos = todos.filter((i) => {
      const d = UI.diasAte(i.data);
      if (diaSelecionado) return i.data === diaSelecionado;
      if (semanaFiltrada) return i.data >= inicioSemana && i.data <= UI.isoMaisDias(inicioSemana, 6);
      return d !== null && d >= 0 && d < periodo;
    });

    document.getElementById("agenda-resumo").textContent = proximos.length
      ? `${plural(proximos.length, "compromisso", "compromissos")} ${diaSelecionado ? "em " + fmt.dataPorExtenso(diaSelecionado) : semanaFiltrada ? "na semana de " + fmt.dataPorExtenso(inicioSemana) : "nos próximos " + periodo + " dias"}`
      : "";

    box.innerHTML = "";
    if (!atrasados.length && !proximos.length) {
      box.appendChild(UI.vazio({
        icone: "relogio",
        titulo: diaSelecionado ? "Um dia sem compromissos" : semanaFiltrada ? "Uma semana sem compromissos" : "Sua agenda começa aqui",
        texto: diaSelecionado ? "Adicione algo para esta data ou escolha outro dia para consultar." : "Consultas, provas, encontros e entregas. Os compromissos das suas áreas se encontram aqui.",
        rotuloAcao: "Adicionar compromisso",
        aoAcionar: novoPrazo,
      }));
      return;
    }

    const semanaAtual = UI.chaveSemana(UI.hojeISO());
    const semanaQueVem = UI.chaveSemana(UI.isoMaisDias(semanaAtual, 7));
    const conflitos = Object.fromEntries(UI.conflitos().map((c) => [c.semana, c]));

    const grupos = [];
    if (atrasados.length) grupos.push({ titulo: "Atrasado", classe: "atrasado", itens: atrasados });
    proximos.forEach((i) => {
      const k = UI.chaveSemana(i.data);
      let g = grupos.find((x) => x.chave === k);
      if (!g) {
        const titulo = k === semanaAtual ? "Esta semana" : k === semanaQueVem ? "Semana que vem" : `Semana de ${fmt.dataCurta(k)}`;
        g = { chave: k, titulo, itens: [] };
        grupos.push(g);
      }
      g.itens.push(i);
    });

    box.innerHTML = grupos.map((g) => {
      const c = g.chave ? conflitos[g.chave] : null;
      const nota = c && c.multiplasAreas
        ? `<span class="agenda-nota">Semana cheia: ${fmt.escape(c.rotulos.join(", ").replace(/, ([^,]*)$/, " e $1"))}</span>`
        : c && c.itens.length >= 3 ? `<span class="agenda-nota">Semana cheia</span>` : "";
      return `<section class="agenda-grupo ${g.classe || ""}">
          <h3 class="agenda-cab"><span>${g.titulo}</span>${nota}</h3>
          <ol class="agenda-lista">${g.itens.map(linhaAgenda).join("")}</ol>
        </section>`;
    }).join("");
  }

  function linhaAgenda(i) {
    const d = new Date(i.data + "T00:00:00");
    const dias = UI.diasAte(i.data);
    const u = UI.urgencia(i.data);
    const quando = dias < 0
      ? `venceu há ${plural(Math.abs(dias), "dia", "dias")}`
      : dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`;
    return `<li>
        <a class="agenda-linha" href="${destino(i)}">
          <span class="agenda-dia${dias === 0 ? " hoje" : ""}"><b>${d.getDate()}</b><small>${dias === 0 ? "hoje" : DIAS_SEMANA[d.getDay()]}</small></span>
          <span class="agenda-texto">
            <span class="t">${fmt.escape(i.titulo)}</span>
            <span class="m">${marcaArea(i)}${fmt.escape(fmt.capitalizar(i.areaRotulo || ""))}${i.tipo ? `, ${fmt.escape(i.tipo)}` : ""}</span>
          </span>
          <span class="badge ${u.nivel}">${quando}</span>
        </a>
      </li>`;
  }

  /** Índice das abas: o nome, uma linha do que há nela e o número que importa. */
  function renderPilares(atual) {
    const e = Store.estado();
    const grid = document.getElementById("pilares");
    const urgentes = (area) =>
      UI.compromissos().filter((i) => i.area === area && (UI.diasAte(i.data) ?? 99) <= 7).length;

    const linhas = [
      {
        id: "financeiro", href: "financeiro.html", cor: "financeiro",
        valor: fmt.moeda(atual.resultado), rotuloValor: atual.resultado < 0 ? "faltou no mês" : "sobrou no mês",
        sub: `${plural(atual.quantidade, "lançamento", "lançamentos")} no mês, ${plural(e.financeiro.metas.length, "meta", "metas")}`,
      },
      {
        id: "faculdade", href: "faculdade.html", cor: "faculdade",
        valor: `${urgentes("faculdade")}`, rotuloValor: urgentes("faculdade") === 1 ? "prazo na semana" : "prazos na semana",
        sub: plural(e.faculdade.disciplinas.length, "disciplina", "disciplinas"),
      },
      (() => {
        const ativos = e.projetos.filter((p) => p.status !== "concluído" && p.status !== "arquivado");
        const renda = ativos.reduce((s, p) => s + (Number(p.rendaEstimada) || 0), 0);
        return {
          id: "projetos", href: "projetos.html", cor: "projetos",
          valor: `${ativos.length}`, rotuloValor: ativos.length === 1 ? "projeto ativo" : "projetos ativos",
          sub: renda ? `${fmt.moeda(renda)} por mês estimados` : plural(e.oportunidades.length, "oportunidade", "oportunidades"),
        };
      })(),
      (() => {
        const abertos = (e.pessoal?.compromissos || []).filter((c) => !c.concluido);
        return {
          id: "pessoal", href: "pessoal.html", cor: "pessoal",
          valor: `${abertos.length}`, rotuloValor: "em aberto",
          sub: `${urgentes("pessoal")} nesta semana`,
        };
      })(),
    ]
      // Aba fixa desligada: some do índice, sem apagar nada.
      .filter((c) => Personalizacao.abaAtiva(c.id))
      .map((c) => ({ ...c, titulo: Personalizacao.rotuloAba(c.id) }));

    // As abas criadas pelo usuário entram no mesmo índice, com a cor delas.
    (e.pilares || []).forEach((p) => {
      const abertos = (p.itens || []).filter((i) => !i.concluido);
      linhas.push({
        id: `pilar:${p.id}`, href: `pilar.html?id=${encodeURIComponent(p.id)}`, cor: "", corHex: p.cor, glifo: p.icone,
        titulo: p.nome,
        valor: `${abertos.length}`, rotuloValor: "em aberto",
        sub: p.descricao || `${urgentes(`pilar:${p.id}`)} nesta semana`,
      });
    });

    const paginas = UI.paginas();
    const ordem = paginas.map((p) => p.id);
    grid.innerHTML = linhas.filter((c) => ordem.includes(c.id)).sort((a, b) => ordem.indexOf(a.id) - ordem.indexOf(b.id))
      .map((c) => `
        <a class="pillar indice-linha ${c.cor}" href="${c.href}"${c.corHex ? ` style="--tint:${fmt.escape(c.corHex)}"` : ""}>
          ${UI.seloAba(paginas.find((p) => p.id === c.id), "pillar-ic")}
          <span class="indice-nome">${fmt.escape(c.titulo)}<small>${fmt.escape(c.sub)}</small></span>
          <span class="indice-valor num">${fmt.escape(c.valor)}<small>${fmt.escape(c.rotuloValor)}</small></span>
          <span class="indice-seta">${UI.icone("direita")}</span>
        </a>`)
      .join("");
  }

  /** Em números: comparações e projeções, em linhas de rótulo e valor. */
  function renderInsights() {
    const e = Store.estado();
    const box = document.getElementById("insights");
    const linhas = [];

    // 3. Semana mais carregada à frente
    const conflitos = UI.conflitos();
    if (conflitos.length) {
      const pior = conflitos.reduce((a, b) => (b.itens.length > a.itens.length ? b : a));
      linhas.push({
        titulo: "Semana mais carregada",
        valor: plural(pior.itens.length, "compromisso", "compromissos"),
        classe: pior.multiplasAreas ? "down" : "",
        sub: `Semana de ${fmt.dataPorExtenso(pior.semana)}${pior.multiplasAreas ? `, entre ${pior.rotulos.join(" e ")}` : ""}`,
      });
    }

    // 4. Progresso dos projetos ativos
    const ativos = e.projetos.filter((p) => p.status !== "concluído");
    if (ativos.length) {
      const passos = ativos.flatMap((p) => p.passos || []);
      if (passos.length) {
        const feitos = passos.filter((s) => s.feito).length;
        linhas.push({
          titulo: "Etapas dos projetos",
          valor: `${Math.round((feitos / passos.length) * 100)}%`,
          classe: "",
          sub: `${feitos} de ${passos.length} concluídas em ${plural(ativos.length, "projeto", "projetos")}`,
        });
      }
    }

    document.getElementById("sec-insights").hidden = UI.experiencia().home?.insights === false || !linhas.length;
    if (!linhas.length) { box.innerHTML = ""; return; }

    box.innerHTML = linhas
      .map((c) => `<div>
          <dt>${fmt.escape(c.titulo)}<small>${fmt.escape(c.sub)}</small></dt>
          <dd class="num ${c.classe === "down" ? "valor-ruim" : c.classe === "up" ? "valor-bom" : ""}">${fmt.escape(c.valor)}</dd>
        </div>`)
      .join("");
  }

  /* --------------------------------- Ações --------------------------------- */

  function novoLancamento() {
    Lancamento.abrir();
  }

  async function novoPrazo() {
    const areas = [
      { valor: "pessoal", rotulo: Personalizacao.rotuloAba("pessoal") },
      ...(Personalizacao.abaAtiva("faculdade") ? [{ valor: "faculdade", rotulo: Personalizacao.rotuloAba("faculdade") }] : []),
      ...Store.lista("pilares").filter((p) => p.naAgenda && p.modelo !== "academia").map((p) => ({ valor: `pilar:${p.id}`, rotulo: p.nome })),
    ];
    const v = await UI.formulario({
      titulo: "Novo compromisso",
      descricao: "Escolha onde guardar. Ele também aparece na sua agenda.",
      campos: [
        { nome: "descricao", rotulo: "O que você vai fazer?", tipo: "text", obrigatorio: true, placeholder: "Ex.: Consulta, reunião ou entrega" },
        { nome: "area", rotulo: "Área da vida", tipo: "select", opcoes: areas },
        { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valorPadrao: diaSelecionado || UI.hojeISO() },
        { nome: "hora", rotulo: "Horário (opcional)", tipo: "time" },
      ],
    });
    if (!v) return;
    const { area, ...dados } = v;
    if (area === "faculdade") Store.inserir("faculdade.prazos", { ...dados, tipo: "outro", concluido: false });
    else if (area.startsWith("pilar:")) {
      const pilar = Store.achar("pilares", area.slice(6));
      if (!pilar) return;
      const campos = UI.camposItemPilar(pilar);
      // A agenda não pula os campos obrigatórios de uma área personalizada.
      const extras = campos.length ? await UI.formulario({ titulo: `Detalhes de ${pilar.nome}`, campos }) : {};
      if (!extras) return;
      Store.subInserir("pilares", pilar.id, "itens", { ...dados, extras, concluido: false });
    } else Store.inserir("pessoal.compromissos", { ...dados, tipo: "compromisso", concluido: false });
    UI.toast("Compromisso adicionado.");
  }

  async function ajustarSaldo() {
    const v = await UI.formulario({
      titulo: "Ajustar saldo",
      descricao: "Informe quanto você tem hoje somando contas e dinheiro em espécie.",
      campos: [{ nome: "saldo", rotulo: "Saldo atual (R$)", tipo: "dinheiro", obrigatorio: true }],
      valores: { saldo: Store.estado().financeiro.saldoAtual },
    });
    if (!v) return;
    Store.definirSaldo(v.saldo);
    UI.toast("Saldo atualizado.");
  }

  document.getElementById("btn-lancamento").addEventListener("click", novoLancamento);
  document.getElementById("btn-prazo").addEventListener("click", novoPrazo);
  document.getElementById("btn-saldo").addEventListener("click", ajustarSaldo);

  document.getElementById("btn-criar-area").addEventListener("click", () => UI.abrirCriadorDeAbas());
  document.getElementById("btn-organizar-areas").addEventListener("click", () => UI.abrirPerfil("painel"));
  document.getElementById("semana-dias").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-dia]");
    if (!b) return;
    diaSelecionado = diaSelecionado === b.dataset.dia ? "" : b.dataset.dia;
    renderSemana(); renderAgenda();
    document.querySelector(`[data-dia="${b.dataset.dia}"]`)?.focus();
  });
  const moverSemana = (dias) => { inicioSemana = UI.isoMaisDias(inicioSemana, dias); diaSelecionado = ""; semanaFiltrada = true; document.getElementById("agenda-periodo").value = "semana"; renderSemana(); renderAgenda(); };
  document.getElementById("semana-anterior").addEventListener("click", () => moverSemana(-7));
  document.getElementById("semana-seguinte").addEventListener("click", () => moverSemana(7));
  document.getElementById("agenda-hoje").addEventListener("click", () => { inicioSemana = UI.chaveSemana(UI.hojeISO()); diaSelecionado = UI.hojeISO(); renderSemana(); renderAgenda(); });
  document.getElementById("agenda-periodo").addEventListener("change", (ev) => { semanaFiltrada = ev.target.value === "semana"; periodo = semanaFiltrada ? 7 : Number(ev.target.value); diaSelecionado = ""; if (!semanaFiltrada) inicioSemana = UI.chaveSemana(UI.hojeISO()); renderSemana(); renderAgenda(); });
  Store.aoMudar(render);
  render();
})();
