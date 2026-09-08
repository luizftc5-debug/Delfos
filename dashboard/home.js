/* Visão geral — resumo dos três pilares e leitura automática da situação. */

(() => {
  UI.iniciarPagina("home");

  const { fmt } = UI;

  // Cada compromisso já traz a cor e o rótulo da sua área, então o selo é o
  // mesmo para os pilares fixos e para as abas que o usuário criou.
  const seloArea = (i) =>
    `<span class="badge" style="color:${i.cor}; background:color-mix(in srgb, ${i.cor} 14%, transparent);">${fmt.escape(i.areaRotulo)}</span>`;

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

  /* -------------------------------- Render --------------------------------- */

  function render() {
    const e = Store.estado();
    const mes = UI.mesAtual();
    const atual = totaisDoMes(mes);
    const anterior = totaisDoMes(UI.mesAnterior(mes));

    document.getElementById("sub-hoje").textContent = new Date().toLocaleDateString("pt-BR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    // A página abre falando com ele pelo primeiro nome, não com "usuário".
    const primeiroNome = String(e.perfil?.nome || "").trim().split(/\s+/)[0] || "";
    const hora = new Date().getHours();
    const parte = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
    document.getElementById("saudacao").textContent = primeiroNome ? `${parte}, ${primeiroNome}` : "Visão geral";

    const naSemana = UI.compromissos().filter((i) => {
      const d = UI.diasAte(i.data);
      return d !== null && d >= 0 && d <= 7;
    }).length;
    document.getElementById("sub-resumo").textContent =
      `${naSemana ? `${naSemana} ${naSemana === 1 ? "compromisso" : "compromissos"}` : "Nenhum compromisso"} nos próximos 7 dias. ` +
      `${atual.quantidade} ${atual.quantidade === 1 ? "lançamento" : "lançamentos"} neste mês.`;

    // Herói: saldo atual (soma das contas, ou o valor informado à mão enquanto
    // não houver contas cadastradas)
    document.getElementById("hero-saldo").textContent = fmt.moeda(Financas.saldoTotal());
    document.getElementById("btn-saldo").classList.toggle("hidden", Financas.temContas());
    const detalhe = document.getElementById("hero-detalhe");
    if (atual.quantidade === 0) {
      detalhe.innerHTML = `<span class="muted">Nenhum lançamento neste mês ainda.</span>`;
    } else {
      const sinal = atual.resultado >= 0 ? "up" : "down";
      detalhe.innerHTML = `Resultado do mês:
        <span class="delta ${sinal}">${atual.resultado >= 0 ? "▲" : "▼"} ${fmt.moeda(Math.abs(atual.resultado))}</span>
        <br><span class="muted">${fmt.moeda(atual.receita)} entrou, ${fmt.moeda(atual.despesa)} saiu</span>`;
    }

    renderAvisos();
    renderProximo();
    renderPilares(atual);
    renderAgenda();
    renderInsights(atual, anterior, mes);
    UI.montarLayout("home");
  }

  function renderAvisos() {
    const box = document.getElementById("avisos");
    box.innerHTML = "";

    const atrasados = UI.compromissos().filter((i) => (UI.diasAte(i.data) ?? 0) < 0);
    if (atrasados.length) {
      const el = document.createElement("div");
      el.className = "notice critical";
      el.innerHTML = `<span class="ic">!</span><span><strong>${atrasados.length} ${atrasados.length === 1 ? "compromisso atrasado" : "compromissos atrasados"}:</strong>
        ${atrasados.slice(0, 3).map((i) => fmt.escape(i.titulo)).join(", ")}${atrasados.length > 3 ? ` e mais ${atrasados.length - 3}` : ""}</span>`;
      box.appendChild(el);
    }

    UI.conflitos()
      .filter((c) => c.multiplasAreas)
      .slice(0, 2)
      .forEach((c) => {
        const el = document.createElement("div");
        el.className = "notice warning";
        el.innerHTML = `<span class="ic">▲</span><span><strong>Semana cheia (${fmt.dataCurta(c.semana)}):</strong>
          ${c.itens.map((i) => `${fmt.escape(i.titulo)} <span class="muted">(${fmt.dataCurta(i.data)})</span>`).join(", ")}</span>`;
        box.appendChild(el);
      });
  }

  function renderProximo() {
    const box = document.getElementById("proximo");
    const proximos = UI.compromissos().filter((i) => (UI.diasAte(i.data) ?? -1) >= 0);

    if (!proximos.length) {
      box.innerHTML = "";
      box.appendChild(
        UI.vazio({
          icone: "◎",
          titulo: "Nenhum compromisso à frente",
          texto: "Cadastre provas, entregas e deadlines para o painel cruzar as datas e avisar sobre conflitos.",
          rotuloAcao: "Cadastrar prazo",
          aoAcionar: novoPrazo,
        })
      );
      return;
    }

    const p = proximos[0];
    const u = UI.urgencia(p.data);
    const outros = proximos.length - 1;
    box.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        ${seloArea(p)}
        <span class="badge ${u.nivel}">${u.rotulo}</span>
      </div>
      <div class="stat-value" style="font-size:19px;">${fmt.escape(p.titulo)}</div>
      <div class="stat-sub">${fmt.data(p.data)}${outros > 0 ? `, e mais ${outros} ${outros === 1 ? "compromisso agendado" : "compromissos agendados"}` : ""}</div>`;
  }

  function renderPilares(atual) {
    const e = Store.estado();
    const grid = document.getElementById("pilares");
    const urgentes = (area) =>
      UI.compromissos().filter((i) => i.area === area && (UI.diasAte(i.data) ?? 99) <= 7).length;

    const cartoes = [
      {
        href: "financeiro.html", cor: "financeiro", titulo: "Financeiro",
        valor: fmt.moedaCurta(atual.resultado),
        sub: `${atual.quantidade} ${atual.quantidade === 1 ? "lançamento" : "lançamentos"} no mês, ${e.financeiro.metas.length} ${e.financeiro.metas.length === 1 ? "meta" : "metas"}`,
      },
      {
        href: "faculdade.html", cor: "faculdade", titulo: "Faculdade",
        valor: `${e.faculdade.disciplinas.length}`,
        sub: `${e.faculdade.disciplinas.length === 1 ? "disciplina" : "disciplinas"}, ${urgentes("faculdade")} ${urgentes("faculdade") === 1 ? "prazo" : "prazos"} nesta semana`,
      },
      (() => {
        const ativos = e.projetos.filter((p) => p.status !== "concluído" && p.status !== "arquivado");
        const renda = ativos.reduce((s, p) => s + (Number(p.rendaEstimada) || 0), 0);
        return {
          href: "projetos.html", cor: "projetos", titulo: "Projetos",
          valor: `${ativos.length}`,
          sub: renda
            ? `${ativos.length === 1 ? "projeto ativo" : "projetos ativos"}, ${fmt.moedaCurta(renda)} por mês estimados`
            : `${ativos.length === 1 ? "projeto ativo" : "projetos ativos"}, ${e.oportunidades.length} ${e.oportunidades.length === 1 ? "oportunidade" : "oportunidades"}`,
        };
      })(),
      (() => {
        const abertos = (e.pessoal?.compromissos || []).filter((c) => !c.concluido);
        return {
          href: "pessoal.html", cor: "pessoal", titulo: "Pessoal",
          valor: `${abertos.length}`,
          sub: `${abertos.length === 1 ? "compromisso em aberto" : "compromissos em aberto"}, ${urgentes("pessoal")} nesta semana`,
        };
      })(),
    ];

    // As abas criadas pelo usuário entram na mesma grade, com a cor delas.
    (e.pilares || []).forEach((p) => {
      const abertos = (p.itens || []).filter((i) => !i.concluido);
      const naSemana = urgentes(`pilar:${p.id}`);
      cartoes.push({
        href: `pilar.html?id=${encodeURIComponent(p.id)}`, cor: "", corHex: p.cor,
        titulo: p.nome,
        valor: `${abertos.length}`,
        sub: `${abertos.length === 1 ? "item em aberto" : "itens em aberto"}, ${naSemana} nesta semana`,
      });
    });

    grid.innerHTML = cartoes
      .map((c) => `
        <a class="card pillar ${c.cor}" href="${c.href}"${c.corHex ? ` style="--tint:${c.corHex}"` : ""}>
          <div class="stat-label">${fmt.escape(c.titulo)}</div>
          <div class="stat-value num">${c.valor}</div>
          <div class="stat-sub">${c.sub}</div>
          <div class="arrow">Ver detalhes</div>
        </a>`)
      .join("");
  }

  function renderAgenda() {
    const box = document.getElementById("agenda");
    const itens = UI.compromissos().filter((i) => {
      const d = UI.diasAte(i.data);
      return d !== null && d >= 0 && d <= 30;
    });

    document.getElementById("agenda-resumo").textContent =
      itens.length ? `${itens.length} ${itens.length === 1 ? "compromisso" : "compromissos"}` : "";

    box.innerHTML = "";
    if (!itens.length) {
      box.appendChild(
        UI.vazio({
          icone: "◷",
          titulo: "Nada nos próximos 30 dias",
          texto: "Quando você cadastrar provas, entregas e deadlines, eles aparecem aqui em ordem de data.",
        })
      );
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list";
    itens.forEach((i) => {
      const u = UI.urgencia(i.data);
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="swatch" style="background:${i.cor}"></span>
        <span class="grow">
          <span class="title">${fmt.escape(i.titulo)}</span>
          <span class="meta">${fmt.escape(fmt.capitalizar(i.tipo))} em ${fmt.dataPorExtenso(i.data)}</span>
        </span>
        <span class="badge ${u.nivel}">${u.rotulo}</span>`;
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function renderInsights(atual, anterior, mes) {
    const e = Store.estado();
    const box = document.getElementById("insights");
    const cards = [];

    // 1. Comparação com o mês anterior
    if (anterior.quantidade > 0) {
      const dif = atual.despesa - anterior.despesa;
      const pct = anterior.despesa > 0 ? Math.round((dif / anterior.despesa) * 100) : 0;
      const piorou = dif > 0;
      cards.push({
        titulo: "Gastos vs. mês anterior", cor: "financeiro",
        valor: `${dif >= 0 ? "+" : "−"}${fmt.moeda(Math.abs(dif))}`,
        classe: piorou ? "down" : "up",
        sub: anterior.despesa > 0
          ? `${Math.abs(pct)}% ${piorou ? "a mais" : "a menos"} que ${fmt.mesRotulo(UI.mesAnterior(mes))}`
          : `Nada gasto em ${fmt.mesRotulo(UI.mesAnterior(mes))}`,
      });
    }

    // 2. Ritmo de gastos e projeção de fechamento do mês
    const diaDoMes = new Date().getDate();
    if (atual.despesa > 0 && diaDoMes >= 3) {
      const media = atual.despesa / diaDoMes;
      const projecao = media * diasNoMes(mes);
      cards.push({
        titulo: "Projeção de gastos do mês", cor: "financeiro",
        valor: fmt.moeda(projecao),
        classe: "flat",
        sub: `No ritmo de ${fmt.moeda(media)} por dia até agora`,
      });
    }

    // 3. Pendências financeiras
    const pendentes = e.financeiro.transacoes.filter((t) => t.status === "pendente");
    if (pendentes.length) {
      const soma = pendentes.filter((t) => t.tipo === "despesa").reduce((s, t) => s + (Number(t.valor) || 0), 0);
      cards.push({
        titulo: "Contas pendentes", cor: "financeiro",
        valor: fmt.moeda(soma),
        classe: "down",
        sub: `${pendentes.length} ${pendentes.length === 1 ? "lançamento marcado" : "lançamentos marcados"} como pendente`,
      });
    }

    // 4. Semana mais carregada à frente
    const conflitos = UI.conflitos();
    if (conflitos.length) {
      const pior = conflitos.reduce((a, b) => (b.itens.length > a.itens.length ? b : a));
      cards.push({
        titulo: "Semana mais carregada", cor: "faculdade",
        valor: `${pior.itens.length} compromissos`,
        classe: pior.multiplasAreas ? "down" : "flat",
        sub: `Semana de ${fmt.data(pior.semana)}${pior.multiplasAreas ? `, entre ${pior.rotulos.join(" e ")}` : ""}`,
      });
    }

    // 5. Progresso dos projetos ativos
    const ativos = e.projetos.filter((p) => p.status !== "concluído");
    if (ativos.length) {
      const passos = ativos.flatMap((p) => p.passos || []);
      if (passos.length) {
        const feitos = passos.filter((s) => s.feito).length;
        cards.push({
          titulo: "Progresso dos projetos", cor: "projetos",
          valor: `${Math.round((feitos / passos.length) * 100)}%`,
          classe: "flat",
          sub: `${feitos} de ${passos.length} etapas concluídas em ${ativos.length} ${ativos.length === 1 ? "projeto" : "projetos"}`,
        });
      }
    }

    if (!cards.length) {
      box.innerHTML = "";
      const card = document.createElement("div");
      card.className = "card";
      card.appendChild(
        UI.vazio({
          icone: "◔",
          titulo: "Ainda sem dados suficientes",
          texto: "Conforme você registra lançamentos, prazos e projetos, aparecem aqui comparações, projeções e alertas automáticos.",
          rotuloAcao: "Registrar lançamento",
          aoAcionar: novoLancamento,
        })
      );
      box.appendChild(card);
      return;
    }

    box.innerHTML = cards
      .map((c) => `
        <div class="card tinted ${c.cor || ""}">
          <div class="stat-label">${fmt.escape(c.titulo)}</div>
          <div class="stat-value num delta ${c.classe}" style="font-size:23px;">${c.valor}</div>
          <div class="stat-sub">${fmt.escape(c.sub)}</div>
        </div>`)
      .join("");
  }

  /* --------------------------------- Ações --------------------------------- */

  async function novoLancamento() {
    const e = Store.estado();
    const v = await UI.formulario({
      titulo: "Novo lançamento",
      descricao: "Registre uma entrada ou saída de dinheiro.",
      campos: [
        { nome: "tipo", rotulo: "Tipo", tipo: "segmento", opcoes: [{ valor: "despesa", rotulo: "Despesa" }, { valor: "receita", rotulo: "Receita" }] },
        { nome: "descricao", rotulo: "Descrição", tipo: "text", obrigatorio: true, placeholder: "Ex.: Almoço no RU" },
        { nome: "valor", rotulo: "Valor (R$)", tipo: "dinheiro", obrigatorio: true, placeholder: "0,00" },
        { nome: "categoria", rotulo: "Categoria", tipo: "select", opcoes: e.financeiro.categorias },
        { nome: "data", rotulo: "Data", tipo: "date", valorPadrao: UI.hojeISO() },
      ],
    });
    if (!v) return;
    Store.inserir("financeiro.transacoes", { ...v, forma: "", status: "pago" });
    UI.toast("Lançamento salvo.");
    render();
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

  document.getElementById("btn-lancamento").addEventListener("click", novoLancamento);
  document.getElementById("btn-prazo").addEventListener("click", novoPrazo);
  document.getElementById("btn-saldo").addEventListener("click", ajustarSaldo);

  render();
})();
