/* Visão geral: a leitura do dia e o gaveteiro (agenda, dinheiro, o que o Delfos notou, suas abas). */

(() => {
  UI.iniciarPagina("home");

  const { fmt } = UI;

  const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  /* --------------------------- Cálculos de apoio --------------------------- */

  function totaisDoMes(chave) {
    const t = Store.estado().financeiro.transacoes.filter((x) => (x.data || "").startsWith(chave));
    const receita = t.filter((x) => x.tipo === "receita").reduce((s, x) => s + (Number(x.valor) || 0), 0);
    const despesa = t.filter((x) => x.tipo === "despesa").reduce((s, x) => s + (Number(x.valor) || 0), 0);
    return { receita, despesa, resultado: receita - despesa, quantidade: t.length };
  }

  function diasNoMes(chave) {
    const [a, m] = chave.split("-").map(Number);
    return new Date(a, m, 0).getDate();
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

  // Quanto mostrar dentro das gavetas: o essencial primeiro, o resto a um toque.
  let agendaToda = false;
  let notasTodas = false;

  function render() {
    const mes = UI.mesAtual();
    const atual = totaisDoMes(mes);
    const anterior = totaisDoMes(UI.mesAnterior(mes));

    const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    document.getElementById("sub-hoje").textContent = fmt.capitalizar(hoje);

    // O que a visão geral mostra é escolha do perfil (Painel → A visão geral mostra).
    // A gaveta do dinheiro também some com o Financeiro desligado.
    const mostra = UI.experiencia().home || {};
    [["sec-topo", "topo"], ["sec-abas", "pilares"], ["sec-notas", "notas"], ["sec-agenda", "agenda"], ["sec-insights", "insights"]]
      .forEach(([id, k]) => { const el = document.getElementById(id); if (el) el.hidden = mostra[k] === false; });
    if (!Personalizacao.abaAtiva("financeiro")) document.getElementById("sec-topo").hidden = true;

    renderLeitura(atual);
    renderAgenda();
    renderDinheiro(atual, anterior, mes);
    renderNotasHome();
    renderPilares(atual);
    UI.montarLayout("home");
  }

  /**
   * A leitura — o painel diz numa frase o que está acontecendo. É o que dá
   * sentido ao nome: um oráculo lê a situação e a enuncia, em vez de só
   * empilhar números para o leitor interpretar sozinho.
   *
   * A saudação abre a frase, em tom mais baixo; depois, uma frase sobre o
   * tempo (o que está atrasado ou mais próximo) e uma sobre dinheiro.
   */
  function renderLeitura(atual) {
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

    let dinheiro = "";
    if (atual.quantidade > 0) {
      dinheiro = atual.resultado >= 0
        ? ` No mês, sobrou <b>${fmt.moeda(atual.resultado)}</b>.`
        : ` No mês, você gastou <span class="destaque">${fmt.moeda(Math.abs(atual.resultado))} a mais</span> do que recebeu.`;
    }

    const saud = Personalizacao.saudacao();
    const abertura = saud !== "Visão geral" ? `<span class="saudacao">${fmt.escape(saud)}.</span> ` : "";
    alvo.innerHTML = abertura + tempo + dinheiro;
  }

  /** Quando, em palavras: "hoje", "amanhã", "em 3 dias", "venceu há 2 dias". */
  function quando(iso) {
    const d = UI.diasAte(iso);
    if (d === null) return "";
    if (d < 0) return `venceu há ${plural(Math.abs(d), "dia", "dias")}`;
    return d === 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`;
  }

  /** Frase do puxador: partes ligadas por ponto e vírgula, a primeira com maiúscula. */
  const frase = (partes) => {
    const t = partes.filter(Boolean).join("; ");
    return t ? t.replace(/^(<[^>]+>)?([a-zà-ú])/, (_, tag, l) => (tag || "") + l.toUpperCase()) : "";
  };

  /**
   * Gaveta do dinheiro: saldo, o mês e o que falta pagar, lado a lado; embaixo,
   * a comparação com o mês anterior e a projeção (as "Em números" de antes).
   */
  function renderDinheiro(atual, anterior, mes) {
    // Saldo: soma das contas, ou o valor informado à mão enquanto não houver conta.
    const comContas = Financas.temContas();
    const nContas = Store.lista("financeiro.contas").length;
    const saldo = Financas.saldoTotal();
    document.getElementById("hero-rotulo").textContent = comContas ? "Saldo nas contas" : "Saldo atual";
    document.getElementById("hero-saldo").textContent = fmt.moeda(saldo);
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

    // A pagar: despesas pendentes de qualquer mês.
    const pend = Financas.pendentes();
    const soma = pend.reduce((s, t) => s + (Number(t.valor) || 0), 0);
    const pagarDetalhe = document.getElementById("pagar-detalhe");
    document.getElementById("pagar-valor").textContent = fmt.moeda(soma);
    if (!pend.length) {
      pagarDetalhe.textContent = "Nada pendente";
    } else {
      const prox = pend[0];
      const u = UI.urgencia(prox.data);
      pagarDetalhe.innerHTML = `${plural(pend.length, "conta", "contas")}; a próxima, ${fmt.escape(prox.descricao || "sem nome")}, <span class="badge ${u.nivel}">${u.rotulo}</span>`;
    }

    // O puxador: o saldo, o mês e o que falta pagar, numa linha.
    document.getElementById("dinheiro-resumo").innerHTML = frase([
      `saldo <b>${fmt.moeda(saldo)}</b>`,
      atual.quantidade
        ? (atual.resultado < 0
          ? `<span class="alerta">faltou ${fmt.moeda(Math.abs(atual.resultado))}</span> em ${nomeMes}`
          : `sobrou ${fmt.moeda(atual.resultado)} em ${nomeMes}`)
        : "",
      pend.length ? `a pagar ${fmt.moeda(soma)}` : "",
    ]);

    renderInsights(atual, anterior, mes);
  }

  /**
   * Agenda: o que está atrasado no alto, depois semana a semana. A gaveta
   * mostra os próximos sete dias (no mínimo os quatro próximos compromissos);
   * o resto, até 30 dias, a um toque. A semana cheia
   * de áreas diferentes ganha uma marca no próprio cabeçalho.
   */
  function renderAgenda() {
    const box = document.getElementById("agenda");
    const todos = UI.compromissos();
    const atrasados = todos.filter((i) => (UI.diasAte(i.data) ?? 0) < 0);
    const proximos = todos.filter((i) => {
      const d = UI.diasAte(i.data);
      return d !== null && d >= 0 && d <= 30;
    });
    const naSemana = proximos.filter((i) => UI.diasAte(i.data) <= 7);

    const prox = proximos[0];
    document.getElementById("agenda-resumo").innerHTML = frase([
      atrasados.length ? `<span class="alerta">${plural(atrasados.length, "atrasado", "atrasados")}</span>` : "",
      prox ? `próximo: <b>${fmt.escape(prox.titulo)}</b>, ${quando(prox.data)}` : "",
      naSemana.length > 1 ? `${naSemana.length} nos próximos 7 dias` : "",
    ]) || "Nada marcado nos próximos 30 dias";

    box.innerHTML = "";
    if (!atrasados.length && !proximos.length) {
      box.appendChild(UI.vazio({
        icone: "relogio",
        titulo: "Nada nos próximos 30 dias",
        texto: "Provas, entregas, consultas e prazos de qualquer aba aparecem aqui, semana a semana.",
        rotuloAcao: "Registrar compromisso",
        aoAcionar: () => registrar({ soComData: true }),
      }));
      return;
    }

    let limite = proximos.filter((i) => UI.diasAte(i.data) <= 7).length;
    if (limite < 4) limite = Math.min(4, proximos.length);
    const visiveis = agendaToda ? proximos : proximos.slice(0, limite);
    const escondidos = proximos.length - visiveis.length;

    const semanaAtual = UI.chaveSemana(UI.hojeISO());
    const semanaQueVem = UI.chaveSemana(UI.isoMaisDias(semanaAtual, 7));
    const conflitos = Object.fromEntries(UI.conflitos().map((c) => [c.semana, c]));

    const grupos = [];
    if (atrasados.length) grupos.push({ titulo: "Atrasado", classe: "atrasado", itens: atrasados });
    visiveis.forEach((i) => {
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

    if (escondidos > 0 || agendaToda) {
      const mais = document.createElement("button");
      mais.type = "button";
      mais.className = "link-gaveta";
      mais.textContent = agendaToda
        ? "Mostrar só os próximos dias"
        : `Ver ${plural(escondidos, "compromisso", "compromissos")} até ${fmt.dataPorExtenso(proximos[proximos.length - 1].data)}`;
      mais.addEventListener("click", () => { agendaToda = !agendaToda; renderAgenda(); });
      box.appendChild(mais);
    }
  }

  function linhaAgenda(i) {
    const d = new Date(i.data + "T00:00:00");
    const dias = UI.diasAte(i.data);
    const u = UI.urgencia(i.data);
    return `<li>
        <a class="agenda-linha" href="${destino(i)}">
          <span class="agenda-dia${dias === 0 ? " hoje" : ""}"><b>${d.getDate()}</b><small>${dias === 0 ? "hoje" : DIAS_SEMANA[d.getDay()]}</small></span>
          <span class="agenda-texto">
            <span class="t">${fmt.escape(i.titulo)}</span>
            <span class="m">${marcaArea(i)}${fmt.escape(fmt.capitalizar(i.areaRotulo || ""))}${i.tipo ? `, ${fmt.escape(i.tipo)}` : ""}</span>
          </span>
          <span class="badge ${u.nivel}">${quando(i.data)}</span>
        </a>
      </li>`;
  }

  /**
   * O que o Delfos notou: só o que pede ação, de todas as abas. A gaveta
   * mostra três; o resto a um toque. O puxador diz quantos e o primeiro.
   */
  function renderNotasHome() {
    const todas = Leituras.todasNotas(12);
    const resumo = document.getElementById("notas-resumo");
    const alertas = todas.filter((n) => n.tipo === "alerta").length;
    if (!todas.length) {
      resumo.textContent = "Nada pedindo ação agora";
    } else {
      const tmp = document.createElement("div");
      tmp.innerHTML = todas[0].html;
      const classe = alertas ? "alerta" : "atencao";
      resumo.innerHTML = `<span class="${classe}">${todas.length === 1 ? "1 aviso" : `${todas.length} avisos`}</span>; ${fmt.escape(tmp.textContent.trim())}`;
    }
    UI.renderNotas(document.getElementById("notas"), notasTodas ? todas : todas.slice(0, 3),
      "Nada pedindo ação agora. Cada aba tem a própria leitura, com o que vai bem e o que mudou.");
    const mais = document.getElementById("notas-mais");
    mais.hidden = todas.length <= 3;
    mais.textContent = notasTodas ? "Mostrar só os três primeiros" : `Ver todos os ${todas.length} avisos`;
  }

  /** Suas abas: um ladrilho por aba, com o número que importa e uma linha do que há nela. */
  function renderPilares(atual) {
    const e = Store.estado();
    const grid = document.getElementById("pilares");
    const urgentes = (area) =>
      UI.compromissos().filter((i) => i.area === area && (UI.diasAte(i.data) ?? 99) <= 7).length;

    const linhas = [
      {
        id: "financeiro", href: "financeiro.html", cor: "financeiro", icone: "financeiro",
        valor: fmt.moeda(atual.resultado), rotuloValor: atual.resultado < 0 ? "faltou no mês" : "sobrou no mês",
        sub: `${plural(atual.quantidade, "lançamento", "lançamentos")} no mês, ${plural(e.financeiro.metas.length, "meta", "metas")}`,
      },
      {
        id: "faculdade", href: "faculdade.html", cor: "faculdade", icone: "faculdade",
        valor: `${urgentes("faculdade")}`, rotuloValor: urgentes("faculdade") === 1 ? "prazo na semana" : "prazos na semana",
        sub: plural(e.faculdade.disciplinas.length, "disciplina", "disciplinas"),
      },
      (() => {
        const ativos = e.projetos.filter((p) => p.status !== "concluído" && p.status !== "arquivado");
        const renda = ativos.reduce((s, p) => s + (Number(p.rendaEstimada) || 0), 0);
        const passos = ativos.flatMap((p) => p.passos || []);
        const feitos = passos.filter((x) => x.feito).length;
        return {
          id: "projetos", href: "projetos.html", cor: "projetos", icone: "projetos",
          valor: `${ativos.length}`, rotuloValor: ativos.length === 1 ? "projeto ativo" : "projetos ativos",
          sub: passos.length
            ? `${Math.round((feitos / passos.length) * 100)}% das etapas feitas${renda ? `, ${fmt.moeda(renda)} por mês estimados` : ""}`
            : renda ? `${fmt.moeda(renda)} por mês estimados` : plural(e.oportunidades.length, "oportunidade", "oportunidades"),
        };
      })(),
      (() => {
        const abertos = (e.pessoal?.compromissos || []).filter((c) => !c.concluido);
        return {
          id: "pessoal", href: "pessoal.html", cor: "pessoal", icone: "pessoal",
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
        href: `pilar.html?id=${encodeURIComponent(p.id)}`, corHex: p.cor, icone: p.icone,
        titulo: p.nome,
        valor: `${abertos.length}`, rotuloValor: "em aberto",
        sub: p.descricao || `${urgentes(`pilar:${p.id}`)} nesta semana`,
      });
    });

    document.getElementById("abas-resumo").textContent = linhas.length
      ? `${plural(linhas.length, "aba", "abas")}: ${linhas.map((c) => c.titulo).join(", ").replace(/, ([^,]*)$/, " e $1")}`
      : "Nenhuma aba ligada";

    grid.innerHTML = linhas
      .map((c) => `
        <a class="pillar ladrilho ${c.cor || ""}" href="${c.href}">
          ${UI.seloAba(c, "ladrilho-selo")}
          <span class="ladrilho-nome">${fmt.escape(c.titulo)}</span>
          <span class="ladrilho-valor num">${fmt.escape(c.valor)} <small>${fmt.escape(c.rotuloValor)}</small></span>
          <span class="ladrilho-sub">${fmt.escape(c.sub)}</span>
        </a>`)
      .join("");
  }

  /**
   * Comparação com o mês anterior e projeção do mês, dentro da gaveta do
   * dinheiro. Ditas em palavras ("R$ 529,30 a menos"), nunca um número
   * negativo pintado de verde.
   */
  function renderInsights(atual, anterior, mes) {
    const box = document.getElementById("sec-insights");
    const linhas = [];

    if (anterior.quantidade > 0 && anterior.despesa > 0) {
      const dif = atual.despesa - anterior.despesa;
      const pct = Math.round((Math.abs(dif) / anterior.despesa) * 100);
      linhas.push({
        titulo: `Gastos em relação a ${new Date(`${UI.mesAnterior(mes)}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "long" })}`,
        valor: dif === 0 ? "iguais" : `${fmt.moeda(Math.abs(dif))} ${dif > 0 ? "a mais" : "a menos"}`,
        classe: dif > 0 ? "valor-ruim" : dif < 0 ? "valor-bom" : "",
        sub: dif === 0 ? "O mesmo total do mês anterior" : `${pct}% ${dif > 0 ? "acima" : "abaixo"} do mês anterior, até agora`,
      });
    }

    const diaDoMes = new Date().getDate();
    if (atual.despesa > 0 && diaDoMes >= 3) {
      const media = atual.despesa / diaDoMes;
      linhas.push({
        titulo: "Se o ritmo seguir, o mês fecha com",
        valor: `${fmt.moeda(media * diasNoMes(mes))} de gastos`,
        classe: "",
        sub: `${fmt.moeda(media)} por dia até agora`,
      });
    }

    box.innerHTML = linhas
      .map((c) => `<div>
          <dt>${fmt.escape(c.titulo)}<small>${fmt.escape(c.sub)}</small></dt>
          <dd class="num ${c.classe}">${fmt.escape(c.valor)}</dd>
        </div>`)
      .join("");
    if (!linhas.length) box.hidden = true;
  }

  /* --------------------------------- Ações --------------------------------- */

  /** "+ Registrar": a janela que pergunta o quê e leva ao formulário certo. */
  function registrar(opcoes = {}) {
    UI.abrirRegistrar({
      ...opcoes,
      aoEscolher: (id) => {
        if (id === "financeiro") { novoLancamento(); return true; }
        if (id === "faculdade") { novoPrazo(); return true; }
        return false;
      },
    });
  }

  function novoLancamento() {
    Lancamento.abrir({ aoSalvar: render });
  }

  async function novoPrazo() {
    const v = await UI.formulario({
      titulo: "Novo prazo",
      descricao: "Provas, entregas e outros compromissos da faculdade.",
      campos: [
        { nome: "descricao", rotulo: "O que é", tipo: "text", obrigatorio: true, placeholder: "Ex.: Entrega da metanálise" },
        { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valorPadrao: UI.hojeISO() },
        { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: ["entrega", "prova", "seminário", "TCC", "outro"] },
      ],
    });
    if (!v) return;
    Store.inserir("faculdade.prazos", { ...v, concluido: false });
    UI.toast("Prazo cadastrado.");
    render();
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
    render();
  }

  document.getElementById("btn-registrar").addEventListener("click", () => registrar());
  document.getElementById("btn-agenda-novo").addEventListener("click", () => registrar({ soComData: true }));
  document.getElementById("btn-lancamento").addEventListener("click", novoLancamento);
  document.getElementById("btn-saldo").addEventListener("click", ajustarSaldo);
  document.getElementById("notas-mais").addEventListener("click", () => { notasTodas = !notasTodas; renderNotasHome(); });
  const novaAbaHome = document.getElementById("btn-nova-aba-home");
  novaAbaHome.addEventListener("click", () => UI.novaAba());
  UI.prepararCriador(novaAbaHome);

  render();
})();
