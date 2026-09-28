/* Financeiro — o mês lido em voz alta: para onde foi o dinheiro, em que
   ritmo, o que o Delfos ainda precisa saber (perguntas), o que merece
   atenção, o que falta pagar, metas e, por fim, a planilha. Os números saem
   de Financas.analisarMes; aqui só se decide o que dizer e como mostrar. */

(() => {
  UI.iniciarPagina("financeiro");

  const { fmt, icone } = UI;
  const $ = (id) => document.getElementById(id);
  const esc = fmt.escape;
  const moeda = fmt.moeda;
  const pct = (x) => `${Math.round((Number(x) || 0) * 100)}%`;

  const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const ESSENCIAIS_TIPICOS = ["Moradia", "Alimentação", "Saúde", "Transporte", "Educação", "Contas"];

  const hoje = UI.hojeISO();
  const mesHoje = UI.mesAtual();
  const anoHoje = Number(hoje.slice(0, 4));

  const estado = { mes: mesHoje };
  const filtros = { busca: "", tipo: "todos", categoria: "todas", todosMeses: false };

  const prefs = () => Store.estado().preferencias.financeiro;
  const salvarPrefs = (patch) => Store.definirPreferencias({ financeiro: patch });
  const transacoes = () => Store.lista("financeiro.transacoes");

  /* --------------------------------- Meses ---------------------------------- */

  function nomeMes(chave) {
    const [a, m] = chave.split("-").map(Number);
    return `${MESES_LONGOS[m - 1]}${a !== anoHoje ? ` de ${a}` : ""}`;
  }
  const rotuloMes = (chave) => {
    const [a, m] = chave.split("-").map(Number);
    return `${fmt.capitalizar(MESES_LONGOS[m - 1])} de ${a}`;
  };

  function limitesDeMes() {
    const datas = transacoes().map((t) => (t.data || "").slice(0, 7)).filter(Boolean).sort();
    return {
      min: datas[0] && datas[0] < mesHoje ? datas[0] : mesHoje,
      max: datas.at(-1) && datas.at(-1) > mesHoje ? datas.at(-1) : mesHoje,
    };
  }

  /** Meses entre hoje e uma data (arredondado para cima, mínimo 1). */
  function mesesAte(iso) {
    const [a, m] = iso.split("-").map(Number);
    const [ah, mh] = hoje.split("-").map(Number);
    return Math.max(1, (a - ah) * 12 + (m - mh));
  }

  /* --------------------------------- Render --------------------------------- */

  function render() {
    const a = Financas.analisarMes(estado.mes, prefs());
    renderMes();
    renderLeitura(a);
    renderFaixa(a);
    renderCategorias(a);
    renderRitmo(a);
    renderPerguntas(a);
    renderNotas(a);
    renderAPagar();
    renderFixos();
    renderMeses();
    renderMaiores(a);
    renderMetas(a);
    renderFiltros();
    renderTabela();
    UI.montarLayout("financeiro");
  }

  function renderMes() {
    const { min, max } = limitesDeMes();
    $("mes-rotulo").textContent = rotuloMes(estado.mes);
    $("mes-anterior").disabled = estado.mes <= min;
    $("mes-seguinte").disabled = estado.mes >= max;
    $("mes-hoje").hidden = estado.mes === mesHoje;
  }

  /* ------------------------------ A leitura ------------------------------- */

  function renderLeitura(a) {
    const el = $("leitura");
    const m = nomeMes(a.chave);
    if (!a.lancamentos) {
      el.innerHTML = a.ehAtual
        ? `Nada lançado em ${m} ainda. Registre um gasto ou importe o extrato do banco, e o Delfos lê o mês com você.`
        : `Nenhum lançamento em ${m}.`;
      return;
    }

    const quando = a.ehAtual ? `Em ${m}, até agora,` : `Em ${m},`;
    let frase;
    if (a.receita > 0 && a.resultado >= 0) {
      frase = `${quando} entraram <b>${moeda(a.receita)}</b> e saíram <b>${moeda(a.despesa)}</b>. Sobraram <span class="bem">${moeda(a.resultado)}</span>, ${pct(a.taxaPoupanca)} do que entrou.`;
    } else if (a.receita > 0) {
      frase = `${quando} entraram <b>${moeda(a.receita)}</b> e saíram <b>${moeda(a.despesa)}</b>: <span class="destaque">${moeda(-a.resultado)} a mais</span> do que entrou.`;
    } else {
      frase = `${quando} saíram <b>${moeda(a.despesa)}</b>, e nenhuma entrada foi lançada.`;
    }

    const o = prefs().orcamentoMensal;
    const top = a.categorias[0];
    let segunda = "";
    if (o && a.ehAtual) {
      const resta = o - a.despesa;
      const dias = a.diasNoMes - a.diaHoje + 1;
      segunda = resta >= 0
        ? ` Do limite de ${moeda(o)}, restam <b>${moeda(resta)}</b> para ${dias === 1 ? "hoje" : `os ${dias} dias que faltam`}.`
        : ` O limite de ${moeda(o)} já foi passado em <span class="destaque">${moeda(-resta)}</span>.`;
    } else if (o && a.passou) {
      segunda = ` O mês fechou em ${pct(a.despesa / o)} do limite de ${moeda(o)}.`;
    } else if (top && a.categorias.length > 1) {
      segunda = ` O que mais pesou foi <b>${esc(top.nome)}</b>, com ${pct(top.parte)} dos gastos.`;
    }
    el.innerHTML = frase + segunda;
  }

  /* ---------------------------- Faixa de números ---------------------------- */

  // Em despesa, subir é ruim; em receita, bom. Sempre com sinal e o mês nomeado.
  function comparacao(atual, anterior, subirEhBom, a) {
    if (!anterior) return `<div class="stat-sub">sem ${esc(nomeMes(a.anteriorChave))} para comparar</div>`;
    if (a.ehAtual) return `<div class="stat-sub">${esc(fmt.capitalizar(nomeMes(a.anteriorChave)))} inteiro: ${moeda(anterior)}</div>`;
    const dif = (atual - anterior) / anterior;
    if (Math.abs(dif) < 0.005) return `<div class="stat-sub">igual a ${esc(nomeMes(a.anteriorChave))}</div>`;
    const bom = subirEhBom ? dif > 0 : dif < 0;
    return `<div class="stat-sub delta ${bom ? "up" : "down"}">${icone(dif > 0 ? "subiu" : "desceu")}${dif > 0 ? "+" : "−"}${Math.abs(Math.round(dif * 100))}% sobre ${esc(nomeMes(a.anteriorChave))}</div>`;
  }

  function renderFaixa(a) {
    const o = prefs().orcamentoMensal;
    const temContas = Financas.temContas();
    const nContas = Store.lista("financeiro.contas").length;
    const sobrou = a.resultado >= 0;

    $("faixa").innerHTML = `
      <div class="card">
        <div class="stat-label">${sobrou ? "Sobrou no mês" : "Faltou no mês"}</div>
        <div class="stat-value delta ${a.lancamentos ? (sobrou ? "up" : "down") : "flat"}">${moeda(Math.abs(a.resultado))}</div>
        <div class="stat-sub">${a.taxaPoupanca !== null ? `${pct(Math.max(a.taxaPoupanca, 0))} do que entrou${prefs().metaPoupanca ? `, meta de ${prefs().metaPoupanca}%` : ""}` : "sem entradas lançadas"}</div>
      </div>
      <div class="card">
        <div class="stat-label">Entrou</div>
        <div class="stat-value">${moeda(a.receita)}</div>
        ${comparacao(a.receita, a.anterior.receita, true, a)}
      </div>
      <div class="card">
        <div class="stat-label">Saiu</div>
        <div class="stat-value">${moeda(a.despesa)}</div>
        ${o ? `<div class="stat-sub ${a.despesa > o ? "down" : ""}">${pct(a.despesa / o)} do limite de ${moeda(o)}</div>` : comparacao(a.despesa, a.anterior.despesa, false, a)}
      </div>
      <div class="card">
        <div class="stat-label">${temContas ? "Saldo nas contas hoje" : "Saldo informado"}</div>
        <div class="stat-value">${moeda(Financas.saldoTotal())}</div>
        <div class="stat-sub">${temContas
          ? `somando <a href="contas.html">${nContas} ${nContas === 1 ? "conta" : "contas"}</a>`
          : `<button class="btn ghost sm" id="btn-saldo" type="button" style="margin-left:-10px;">Ajustar saldo</button>`}</div>
      </div>`;
    $("btn-saldo")?.addEventListener("click", ajustarSaldo);
  }

  /* ------------------------ Para onde foi o dinheiro ------------------------ */

  function renderCategorias(a) {
    const box = $("categorias");
    box.innerHTML = "";
    $("cat-nota").textContent = a.categorias.length > 1 ? "toque numa categoria para ver os lançamentos" : "";

    if (!a.categorias.length) {
      box.appendChild(UI.vazio({
        icone: "vazio",
        titulo: `Nenhum gasto em ${nomeMes(a.chave)}`,
        texto: "Os gastos aparecem aqui agrupados por categoria, com a parte de cada um no total.",
      }));
      return;
    }

    const essenciais = prefs().essenciais || [];
    const visiveis = a.categorias.slice(0, 7);
    const resto = a.categorias.slice(7);
    const escala = Math.max(...visiveis.map((c) => Math.max(c.valor, c.orcamento || 0))) || 1;
    const mesAnt = nomeMes(a.anteriorChave);

    const lista = document.createElement("div");
    lista.className = "cat-lista";
    lista.innerHTML = visiveis.map((c) => {
      const acima = c.orcamento && c.valor > c.orcamento;
      const partes = [`<span>${pct(c.parte)} dos gastos</span>`];
      if (a.ehAtual && c.anterior) partes.push(`<span>em ${esc(mesAnt)}: ${moeda(c.anterior)}</span>`);
      else if (c.variacaoPct !== null && Math.abs(c.variacaoPct) >= 0.01) {
        partes.push(`<span class="${c.variacao > 0 ? "down" : "up"}">${c.variacao > 0 ? "+" : "−"}${Math.abs(Math.round(c.variacaoPct * 100))}% sobre ${esc(mesAnt)}</span>`);
      } else if (!c.anterior && a.anterior.despesa > 0) partes.push("<span>sem gasto nisso em " + esc(mesAnt) + "</span>");
      if (c.orcamento) partes.push(acima
        ? `<span class="down">${moeda(c.valor - c.orcamento)} acima do limite</span>`
        : `<span>limite ${moeda(c.orcamento)}</span>`);
      return `
        <div class="cat-linha" data-cat="${esc(c.nome)}" role="button" tabindex="0" aria-label="Ver lançamentos de ${esc(c.nome)}">
          <span class="cat-nome"><span>${esc(c.nome)}</span>${essenciais.includes(c.nome) ? '<span class="badge">essencial</span>' : ""}</span>
          <span class="cat-valor">${moeda(c.valor)}</span>
          <span class="cat-barra"><i class="${acima ? "acima" : ""}" style="width:${(c.valor / escala) * 100}%"></i>${c.orcamento ? `<b style="left:calc(${(c.orcamento / escala) * 100}% - 1px)" title="Limite de ${esc(moeda(c.orcamento))}"></b>` : ""}</span>
          <span class="cat-meta">${partes.join("")}</span>
        </div>`;
    }).join("");
    box.appendChild(lista);

    if (resto.length) {
      const p = document.createElement("p");
      p.className = "card-note";
      p.style.margin = "16px 0 0";
      p.textContent = `Mais ${resto.length} ${resto.length === 1 ? "categoria soma" : "categorias somam"} ${moeda(resto.reduce((s, c) => s + c.valor, 0))}.`;
      box.appendChild(p);
    }

    lista.querySelectorAll("[data-cat]").forEach((linha) => {
      const abrir = () => filtrarCategoria(linha.dataset.cat);
      linha.addEventListener("click", abrir);
      linha.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); abrir(); } });
    });
  }

  function filtrarCategoria(nome) {
    filtros.categoria = nome;
    filtros.todosMeses = false;
    renderFiltros();
    renderTabela();
    $("sec-lancamentos").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ------------------------------ Ritmo do mês ------------------------------ */

  // Topo "redondo" do eixo: 1, 2, 2,5 ou 5 vezes uma potência de 10.
  function tetoRedondo(v) {
    if (v <= 0) return 0;
    const p = 10 ** Math.floor(Math.log10(v));
    return [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= v);
  }
  const moedaEixo = (v) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

  let dica;
  function mostrarDica(x, y, titulo, linhas) {
    if (!dica) {
      dica = document.createElement("div");
      dica.className = "dica-grafico";
      dica.setAttribute("role", "status");
      document.body.appendChild(dica);
    }
    dica.innerHTML = "";
    const t = document.createElement("div");
    t.className = "t";
    t.textContent = titulo;
    dica.appendChild(t);
    linhas.forEach(([cor, valor, nome]) => {
      const l = document.createElement("div");
      l.className = "l";
      const i = document.createElement("i");
      i.style.background = cor;
      const b = document.createElement("b");
      b.textContent = valor;
      const s = document.createElement("span");
      s.textContent = nome;
      l.append(i, b, s);
      dica.appendChild(l);
    });
    dica.hidden = false;
    const r = dica.getBoundingClientRect();
    dica.style.left = `${Math.min(x + 14, innerWidth - r.width - 8)}px`;
    dica.style.top = `${Math.max(8, y - r.height - 12)}px`;
  }
  const esconderDica = () => { if (dica) dica.hidden = true; };

  function renderRitmo(a) {
    const box = $("ritmo");
    box.innerHTML = "";
    const atual = Financas.acumuladoDiario(a.chave);
    const anterior = Financas.acumuladoDiario(a.anteriorChave);
    const ate = a.ehAtual ? a.diaHoje : a.passou ? atual.length : 0;
    const serie = atual.slice(0, ate);
    const o = prefs().orcamentoMensal;
    const temAnterior = anterior.at(-1) > 0;

    if (!(serie.at(-1) > 0) && !temAnterior) {
      box.appendChild(UI.vazio({ icone: "relogio", titulo: "Sem gastos para acompanhar", texto: "Assim que houver gastos, esta linha mostra se o mês está correndo mais rápido ou mais devagar que o anterior." }));
      return;
    }

    const nDias = Math.max(atual.length, anterior.length);
    const topo = tetoRedondo(Math.max(serie.at(-1) || 0, anterior.at(-1) || 0, a.projecao || 0, o || 0));
    const W = Math.max(280, box.clientWidth || 480);
    const H = W < 420 ? 200 : 258;
    const m = { l: 58, r: 16, t: 12, b: 26 };
    const x = (d) => m.l + ((d - 1) / (nDias - 1)) * (W - m.l - m.r);
    const y = (v) => m.t + (1 - v / topo) * (H - m.t - m.b);
    const caminho = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join("");

    const marcasY = [0, topo / 2, topo];
    const marcasX = [1, 10, 20, nDias];
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Gasto acumulado por dia em ${esc(nomeMes(a.chave))} comparado a ${esc(nomeMes(a.anteriorChave))}">`;
    marcasY.forEach((v) => {
      svg += `<line class="${v ? "grade" : "eixo"}" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`;
      svg += `<text class="rot" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${moedaEixo(v)}</text>`;
    });
    marcasX.forEach((d) => { svg += `<text class="rot" x="${x(d)}" y="${H - 6}" text-anchor="middle">${d}</text>`; });
    if (o && o <= topo) {
      svg += `<line class="limite" x1="${m.l}" x2="${W - m.r}" y1="${y(o)}" y2="${y(o)}"/>`;
      svg += `<text class="rot" x="${W - m.r}" y="${y(o) - 6}" text-anchor="end">limite ${moedaEixo(o)}</text>`;
    }
    if (temAnterior) svg += `<path class="serie-anterior" d="${caminho(anterior)}"/>`;
    if (serie.length) {
      svg += `<path class="area-atual" d="${caminho(serie)}L${x(serie.length)},${y(0)}L${x(1)},${y(0)}Z"/>`;
      svg += `<path class="serie-atual" d="${caminho(serie)}"/>`;
      if (a.projecao && serie.length < atual.length) {
        svg += `<path class="serie-atual" style="stroke-dasharray:2 5; opacity:.8" d="M${x(serie.length)},${y(serie.at(-1))}L${x(atual.length)},${y(a.projecao)}"/>`;
      }
      svg += `<circle class="ponto" cx="${x(serie.length)}" cy="${y(serie.at(-1))}" r="4.5"/>`;
    }
    svg += `<line class="mira" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>`;
    svg += `<rect x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}" fill="transparent" data-alvo/></svg>`;

    const legenda = `
      <div class="legend">
        <span class="legend-item"><span class="legend-key linha" style="background:var(--serie-saida)"></span>${esc(fmt.capitalizar(nomeMes(a.chave)))}</span>
        ${temAnterior ? `<span class="legend-item"><span class="legend-key linha" style="background:var(--serie-contexto)"></span>${esc(fmt.capitalizar(nomeMes(a.anteriorChave)))}</span>` : ""}
        ${a.projecao && serie.length < atual.length ? `<span class="legend-item"><span class="legend-key linha" style="background:repeating-linear-gradient(90deg, var(--serie-saida) 0 3px, transparent 3px 6px)"></span>projeção</span>` : ""}
      </div>`;

    let nota;
    if (a.ehAtual) {
      const antMesmoDia = anterior[Math.min(a.diaHoje, anterior.length) - 1] || 0;
      nota = `Até o dia ${a.diaHoje}, você gastou <b>${moeda(serie.at(-1) || 0)}</b>${temAnterior ? `; em ${esc(nomeMes(a.anteriorChave))}, até o mesmo dia, tinham sido <b>${moeda(antMesmoDia)}</b>` : ""}.`;
      if (a.projecao) nota += ` No ritmo atual, o mês fecha perto de <b>${moeda(a.projecao)}</b>${o ? (a.projecao > o ? `, <span style="color:var(--critical-text)">acima do limite</span>` : ", dentro do limite") : ""}.`;
    } else {
      nota = `O gasto somou <b>${moeda(atual.at(-1) || 0)}</b> em ${esc(nomeMes(a.chave))}${temAnterior ? ` e <b>${moeda(anterior.at(-1))}</b> em ${esc(nomeMes(a.anteriorChave))}` : ""}.`;
    }

    box.innerHTML = svg + legenda + `<p class="ritmo-nota">${nota}</p>`;

    // Mira: segue o ponteiro até o dia mais próximo e mostra os dois meses.
    const el = box.querySelector("svg");
    const mira = el.querySelector(".mira");
    const alvo = el.querySelector("[data-alvo]");
    const mover = (ev) => {
      const r = el.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      const d = Math.min(nDias, Math.max(1, Math.round(((px - m.l) / (W - m.l - m.r)) * (nDias - 1) + 1)));
      mira.setAttribute("x1", x(d));
      mira.setAttribute("x2", x(d));
      mira.setAttribute("visibility", "visible");
      const linhas = [];
      if (d <= serie.length) linhas.push(["var(--serie-saida)", moeda(serie[d - 1]), fmt.capitalizar(nomeMes(a.chave))]);
      if (temAnterior && d <= anterior.length) linhas.push(["var(--serie-contexto)", moeda(anterior[d - 1]), fmt.capitalizar(nomeMes(a.anteriorChave))]);
      mostrarDica(ev.clientX, ev.clientY, `Até o dia ${d}`, linhas);
    };
    alvo.addEventListener("pointermove", mover);
    alvo.addEventListener("pointerdown", mover);
    alvo.addEventListener("pointerleave", () => { mira.setAttribute("visibility", "hidden"); esconderDica(); });
  }

  /* -------------------------- Perguntas do Delfos -------------------------- */

  const dispensar = (id, sempre = false) => { UI.dispensarPergunta("financeiro", id, sempre); render(); };
  const campoValor = (o) => UI.resposta.valor(o);
  const botoes = (l) => UI.resposta.botoes(l);
  const escolhaMultipla = (...a) => UI.resposta.multipla(...a);

  const feito = (msg) => { UI.toast(msg); render(); };

  function perguntas(a) {
    const p = prefs();
    const q = [];
    const aHoje = estado.mes === mesHoje ? a : Financas.analisarMes(mesHoje, p);
    const base = aHoje.mediaDespesa || aHoje.despesa;
    const redondo = (v, passo = 50) => Math.max(passo, Math.round(v / passo) * passo);
    const recentes = [0, 1, 2].flatMap((n) => Financas.doMes(Financas.deslocarMes(mesHoje, -n)));
    const temReceita = recentes.some((t) => t.tipo === "receita");
    if (!transacoes().length) return q;

    if (p.orcamentoMensal === null) {
      q.push({
        id: "orcamento",
        texto: "Quanto você quer gastar por mês, no máximo?",
        apoio: base
          ? `${aHoje.mediaDespesa ? "Nos últimos meses, a média foi de" : "Este mês, até agora, foram"} ${moeda(base)}. Com um limite, o Delfos avisa quando o mês apertar e diz quanto dá por dia.`
          : "Com um limite, o Delfos avisa quando o mês apertar e diz quanto dá para gastar por dia.",
        controle: () => campoValor({ sugestao: base ? redondo(base) : "", rotulo: "Definir limite", aoSalvar: (v) => { salvarPrefs({ orcamentoMensal: v }); feito(`Limite de ${moeda(v)} por mês definido.`); } }),
      });
    }

    if (p.metaPoupanca === null && temReceita) {
      q.push({
        id: "poupanca",
        texto: "Quanto do que entra você quer guardar?",
        apoio: `${aHoje.taxaPoupanca !== null ? `Em ${nomeMes(mesHoje)}, sobrou ${pct(Math.max(aHoje.taxaPoupanca, 0))} do que entrou. ` : ""}Separar uma parte assim que o dinheiro entra costuma funcionar melhor do que esperar sobrar.`,
        controle: () => botoes([10, 15, 20, 30].map((n) => [`${n}%`, () => { salvarPrefs({ metaPoupanca: n }); feito(`Meta de guardar ${n}% do que entra.`); }])),
      });
    }

    const novos = Financas.recorrentes(mesHoje, p.fixos).filter((r) => !r.confirmado && p.fixos[r.chave] === undefined);
    if (novos.length) {
      const r = novos[0];
      q.push({
        id: `fixo:${r.chave}`,
        texto: `“${r.descricao}” apareceu em ${r.meses} meses, sempre perto de ${moeda(r.valor)}. É um gasto fixo?`,
        apoio: "Gasto fixo é o que já está comprometido todo mês — assinatura, aluguel, mensalidade.",
        controle: () => botoes([
          ["Sim, é fixo", () => { salvarPrefs({ fixos: { ...prefs().fixos, [r.chave]: true } }); feito("Anotado como gasto fixo."); }, true],
          ["Não é", () => { salvarPrefs({ fixos: { ...prefs().fixos, [r.chave]: false } }); feito("Anotado."); }],
        ]),
      });
    }

    const usadas = [...new Set(recentes.filter((t) => t.tipo === "despesa").map((t) => t.categoria || "Outros"))];
    if (p.essenciais === null && usadas.length >= 3) {
      q.push({
        id: "essenciais",
        texto: "Quais destes gastos são essenciais para você?",
        apoio: "Separar o essencial do que é escolha mostra onde dá para apertar sem sofrer.",
        controle: () => escolhaMultipla(usadas, usadas.filter((c) => ESSENCIAIS_TIPICOS.includes(c)), "Salvar", (sel) => { salvarPrefs({ essenciais: sel }); feito("Anotado."); }),
      });
    }

    if (p.diaRenda === null && temReceita) {
      const tipico = Financas.diaTipicoDeRenda();
      q.push({
        id: "diaRenda",
        texto: "Em que dia do mês a sua renda costuma cair?",
        apoio: `${tipico ? `Pelos lançamentos, as entradas costumam cair perto do dia ${tipico}. ` : ""}Sabendo disso, o Delfos mostra quanto do saldo dá por dia até a próxima.`,
        controle: () => campoValor({ sugestao: tipico || "", rotulo: "Salvar", min: 1, max: 31, passo: "1", aoSalvar: (v) => { salvarPrefs({ diaRenda: Math.round(v) }); feito(`Renda no dia ${Math.round(v)}.`); } }),
      });
    }

    const top = aHoje.categorias[0];
    if (top && !top.orcamento && top.parte >= 0.3 && top.valor >= 100 && aHoje.categorias.length > 1) {
      q.push({
        id: `limite:${top.nome}`,
        texto: `${top.nome} levou ${pct(top.parte)} dos gastos de ${nomeMes(mesHoje)}. Quer um limite só para essa categoria?`,
        apoio: "A barra da categoria ganha uma marca no limite e fica vermelha se passar.",
        controle: () => campoValor({ sugestao: redondo(top.valor, 10), rotulo: "Definir limite", aoSalvar: (v) => { salvarPrefs({ orcamentos: { ...prefs().orcamentos, [top.nome]: v } }); feito(`Limite de ${moeda(v)} para ${top.nome}.`); } }),
      });
    }

    const temReserva = Store.lista("financeiro.metas").some((m) => /reserva|emerg/i.test(m.descricao || ""));
    if (!temReserva && base > 0) {
      q.push({
        id: "reserva",
        texto: "Você já tem uma reserva de emergência?",
        apoio: `O costume é guardar de 3 a 6 meses de gastos. Para você, algo entre ${moeda(redondo(base * 3, 100))} e ${moeda(redondo(base * 6, 100))}.`,
        controle: () => botoes([
          ["Criar meta de reserva", () => novaMeta({ descricao: "Reserva de emergência", valorAlvo: redondo(base * 3, 100), valorAtual: 0 }), true],
          ["Já tenho", () => dispensar("reserva", true)],
        ]),
      });
    }

    if (a.semCategoria.length >= 2) {
      q.push({
        id: `outros:${a.chave}`,
        texto: `${a.semCategoria.length} gastos de ${nomeMes(a.chave)} estão sem categoria. Quer organizar?`,
        apoio: "Com categoria, eles entram na leitura de para onde foi o dinheiro.",
        controle: () => botoes([["Ver esses lançamentos", () => filtrarCategoria("Outros"), true]]),
      });
    }

    return q;
  }

  function renderPerguntas(a) {
    UI.renderPerguntas($("sec-perguntas"), $("perguntas"), "financeiro", perguntas(a), render);
  }

  /* -------------------------- O que o Delfos notou -------------------------- */

  function notas(a) {
    const p = prefs();
    const n = [];
    const add = (tipo, ic, html, acao) => n.push({ tipo, ic, html, acao });
    const mesAnt = nomeMes(a.anteriorChave);
    const o = p.orcamentoMensal;

    if (a.ehAtual) {
      const ult = Financas.ultimoLancamento();
      const dias = ult ? -UI.diasAte(ult) : null;
      if (dias !== null && dias >= 5) {
        add("atencao", "relogio", `Nada foi lançado nos últimos <b>${dias} dias</b>. Se teve gasto nesse tempo, importar o extrato do banco resolve em um minuto.`,
          { rotulo: "Importar extrato", fn: () => Importar.abrirAssistente(render) });
      }
    }

    if (o && a.lancamentos) {
      const usado = a.despesa / o;
      if (a.ehAtual) {
        const diasRest = a.diasNoMes - a.diaHoje + 1;
        if (usado > 1) add("alerta", "alerta", `O limite de ${moeda(o)} foi passado em <b>${moeda(a.despesa - o)}</b>.`);
        else if (a.projecao && a.projecao > o) add("atencao", "subiu", `No ritmo atual, o mês fecha perto de <b>${moeda(a.projecao)}</b>, acima do limite. Para caber, o resto do mês precisa ficar em <b>${moeda((o - a.despesa) / diasRest)} por dia</b>.`);
        else add("bom", "check", `Você usou ${pct(usado)} do limite com ${pct(a.diaHoje / a.diasNoMes)} do mês passado. Dá para gastar <b>${moeda((o - a.despesa) / diasRest)} por dia</b> até o fim do mês.`);
      } else if (a.passou) {
        if (usado > 1) add("atencao", "alerta", `${fmt.capitalizar(nomeMes(a.chave))} passou do limite em <b>${moeda(a.despesa - o)}</b>.`);
        else add("bom", "check", `${fmt.capitalizar(nomeMes(a.chave))} fechou em ${pct(usado)} do limite.`);
      }
    }

    if (p.metaPoupanca && a.receita > 0 && (a.passou || a.diasPassados >= 20)) {
      const meta = p.metaPoupanca / 100;
      if (a.taxaPoupanca >= meta) add("bom", "cofre", `Sobrou ${pct(a.taxaPoupanca)} do que entrou, acima da sua meta de guardar ${p.metaPoupanca}%.`);
      else add("atencao", "cofre", `Sobrou ${pct(Math.max(a.taxaPoupanca, 0))} do que entrou; a meta é guardar ${p.metaPoupanca}%. Faltaram <b>${moeda(meta * a.receita - a.resultado)}</b>.`);
    }

    // Categoria que mais subiu. No mês corrente, só conta se já passou do mês
    // anterior inteiro — comparar meio mês com um mês cheio enganaria.
    const subiu = a.categorias
      .filter((c) => c.anterior > 0 && c.variacao >= 40 && c.variacaoPct >= 0.3)
      .sort((x, y) => y.variacao - x.variacao)[0];
    if (subiu) {
      add("atencao", "subiu", a.ehAtual
        ? `<b>${esc(subiu.nome)}</b> já passou o total de ${esc(mesAnt)}: ${moeda(subiu.valor)} contra ${moeda(subiu.anterior)}.`
        : `<b>${esc(subiu.nome)}</b> subiu ${pct(subiu.variacaoPct)} em relação a ${esc(mesAnt)}: ${moeda(subiu.valor)} contra ${moeda(subiu.anterior)}.`);
    }
    if (!a.ehAtual) {
      const caiu = a.categorias
        .filter((c) => c.anterior >= 50 && c.variacaoPct !== null && c.variacaoPct <= -0.3)
        .sort((x, y) => x.variacao - y.variacao)[0];
      if (caiu) add("bom", "desceu", `<b>${esc(caiu.nome)}</b> caiu ${pct(-caiu.variacaoPct)}: ${moeda(caiu.anterior)} em ${esc(mesAnt)}, ${moeda(caiu.valor)} agora.`);
    }

    const fixos = Financas.recorrentes(a.chave, p.fixos);
    const totalFixo = fixos.reduce((s, r) => s + r.valor, 0);
    const referencia = a.mediaDespesa || a.despesa;
    if (totalFixo > 0 && referencia > 0) {
      add("info", "repetir", `Gastos que se repetem todo mês somam cerca de <b>${moeda(totalFixo)}</b>, ${pct(totalFixo / referencia)} do que você costuma gastar.`);
    }

    if (p.essenciais?.length && a.despesa > 0) {
      const ess = a.categorias.filter((c) => p.essenciais.includes(c.nome)).reduce((s, c) => s + c.valor, 0);
      add("info", "alvo", `Essenciais somaram ${moeda(ess)} (${pct(ess / a.despesa)}); o que foi escolha, ${moeda(a.despesa - ess)} (${pct(1 - ess / a.despesa)}).`);
    }

    if (a.parteFimDeSemana !== null && a.parteFimDeSemana >= 0.45) {
      add("info", "calendario", `${pct(a.parteFimDeSemana)} dos gastos caíram em sábados e domingos, que são menos de um terço dos dias.`);
    }

    const maior = a.maiores[0];
    if (maior && a.maiores.length >= 3 && Number(maior.valor) / a.despesa >= 0.3) {
      add("info", "arquivo", `O maior gasto foi <b>${esc(maior.descricao || "sem descrição")}</b>, ${moeda(maior.valor)}: sozinho, ${pct(Number(maior.valor) / a.despesa)} do mês.`);
    }

    if (p.diaRenda && a.ehAtual) {
      const d = new Date(hoje + "T00:00:00");
      const alvo = new Date(d.getFullYear(), d.getMonth() + (d.getDate() >= p.diaRenda ? 1 : 0), 1);
      alvo.setDate(Math.min(p.diaRenda, new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()));
      const dias = Math.round((alvo - d) / 86400000);
      const saldo = Financas.saldoTotal();
      if (saldo > 0 && dias > 0) {
        add("info", "calendario", `A próxima renda cai em <b>${dias} ${dias === 1 ? "dia" : "dias"}</b>. O saldo de hoje, ${moeda(saldo)}, dá ${moeda(saldo / dias)} por dia até lá.`);
      }
    }

    return UI.ordenarNotas(n);
  }

  function renderNotas(a) {
    UI.renderNotas($("notas"), notas(a), a.lancamentos
      ? "Nada fora do comum neste mês. Com mais meses lançados, as comparações ficam mais ricas."
      : "Quando houver lançamentos, o Delfos aponta aqui o que mudou, o que se repete e o que merece atenção.");
  }

  /* -------------------------- A pagar e fixos ------------------------------- */

  function renderAPagar() {
    const box = $("apagar");
    const itens = Financas.pendentes().map((t) => ({ tipo: "lanc", t, data: t.data, valor: Number(t.valor) || 0 }));
    Store.lista("financeiro.cartoes").forEach((c) => {
      const f = Financas.faturaCartao(c);
      if (f.total > 0) itens.push({ tipo: "fatura", c, data: f.ciclo.vencimento, valor: f.total });
    });
    itens.sort((x, y) => (x.data || "").localeCompare(y.data || ""));
    const total = itens.reduce((s, i) => s + i.valor, 0);
    $("apagar-total").textContent = itens.length ? moeda(total) : "";

    if (!itens.length) {
      box.innerHTML = `<p class="card-note" style="margin:0;">Nada pendente. Um lançamento marcado como pendente, ou a fatura aberta de um cartão, aparece aqui até ser pago.</p>`;
      return;
    }

    const quando = (iso) => {
      const u = UI.urgencia(iso);
      if (u.dias === null) return "sem data";
      if (u.dias < 0) return `venceu há ${-u.dias} ${u.dias === -1 ? "dia" : "dias"}`;
      if (u.dias === 0) return "vence hoje";
      if (u.dias === 1) return "vence amanhã";
      return `vence em ${u.dias} dias, ${fmt.dataPorExtenso(iso)}`;
    };

    const ul = document.createElement("ul");
    ul.className = "linhas-valor";
    itens.forEach((i) => {
      const li = document.createElement("li");
      const u = UI.urgencia(i.data);
      const tarde = u.dias !== null && u.dias < 0;
      if (i.tipo === "fatura") {
        li.innerHTML = `
          <span class="grow"><a class="t titulo-link" href="conta.html?tipo=cartao&id=${encodeURIComponent(i.c.id)}">Fatura ${esc(i.c.nome)}</a>
          <span class="m" ${tarde ? 'style="color:var(--critical-text)"' : ""}>${esc(quando(i.data))}</span></span>
          <span class="v">${moeda(i.valor)}</span>`;
      } else {
        li.innerHTML = `
          <span class="grow"><span class="t">${esc(i.t.descricao || "Sem descrição")}</span>
          <span class="m" ${tarde ? 'style="color:var(--critical-text)"' : ""}>${esc(quando(i.data))}</span></span>
          <span class="v">${moeda(i.valor)}</span>
          <button class="btn sm" type="button" data-pagar>Pago</button>`;
        li.querySelector("[data-pagar]").addEventListener("click", () => marcarPago(i.t));
      }
      ul.appendChild(li);
    });
    box.innerHTML = "";
    box.appendChild(ul);
  }

  function marcarPago(t) {
    Store.atualizar("financeiro.transacoes", t.id, { status: "pago" });
    render();
    UI.toast(`“${t.descricao || "Lançamento"}” marcado como pago.`, {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.atualizar("financeiro.transacoes", t.id, { status: "pendente" }); render(); },
    });
  }

  function renderFixos() {
    const box = $("fixos");
    const lista = Financas.recorrentes(mesHoje, prefs().fixos);
    const total = lista.reduce((s, r) => s + r.valor, 0);
    $("fixos-total").textContent = lista.length ? `${moeda(total)} por mês` : "";
    if (!lista.length) {
      box.innerHTML = `<p class="card-note" style="margin:0;">Nenhum gasto repetido ainda. Quando a mesma despesa aparecer em dois meses, ela entra aqui sozinha.</p>`;
      return;
    }
    const ul = document.createElement("ul");
    ul.className = "linhas-valor";
    lista.forEach((r) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="grow"><span class="t">${esc(r.descricao)}</span>
        <span class="m">${esc(r.confirmado ? `${r.categoria}, confirmado por você` : `${r.categoria}, em ${r.meses} dos últimos 4 meses`)}</span></span>
        <span class="v">${moeda(r.valor)}</span>
        <button class="btn ghost sm icon" type="button" data-nao title="Não é gasto fixo" aria-label="${esc(r.descricao)} não é gasto fixo">${icone("fechar")}</button>`;
      li.querySelector("[data-nao]").addEventListener("click", () => {
        const antes = prefs().fixos[r.chave];
        salvarPrefs({ fixos: { ...prefs().fixos, [r.chave]: false } });
        render();
        UI.toast(`“${r.descricao}” saiu dos fixos.`, {
          acaoRotulo: "Desfazer",
          aoAcionar: () => {
            const f = { ...prefs().fixos };
            if (antes === undefined) delete f[r.chave]; else f[r.chave] = antes;
            salvarPrefs({ fixos: f });
            render();
          },
        });
      });
      ul.appendChild(li);
    });
    box.innerHTML = "";
    box.appendChild(ul);
  }

  /* ---------------------- Seis meses e maiores gastos ----------------------- */

  function renderMeses() {
    const meses = [];
    let chave = estado.mes;
    for (let i = 0; i < 6; i++) {
      const t = Financas.totais(Financas.doMes(chave));
      meses.unshift({ chave, receita: t.receita, despesa: t.despesa });
      chave = Financas.deslocarMes(chave, -1);
    }
    UI.colunasMensais($("grafico-meses"), { meses });
  }

  function renderMaiores(a) {
    const box = $("maiores");
    if (!a.maiores.length) {
      box.innerHTML = `<p class="card-note" style="margin:0;">Nenhum gasto em ${esc(nomeMes(a.chave))}.</p>`;
      return;
    }
    box.innerHTML = `<ul class="linhas-valor">${a.maiores.map((t) => `
      <li>
        <span class="grow"><span class="t">${esc(t.descricao || "Sem descrição")}</span>
        <span class="m">${esc(`${fmt.dataPorExtenso(t.data)}, ${t.categoria || "Outros"}`)}</span></span>
        <span class="v">${moeda(t.valor)}</span>
      </li>`).join("")}</ul>`;
  }

  /* --------------------------------- Metas ---------------------------------- */

  function renderMetas(a) {
    const box = $("metas");
    const metas = Store.lista("financeiro.metas");
    box.innerHTML = "";

    if (!metas.length) {
      const card = document.createElement("div");
      card.className = "card";
      card.appendChild(UI.vazio({
        icone: "alvo",
        titulo: "Nenhuma meta ainda",
        texto: "Um objetivo com valor e prazo (reserva de emergência, notebook, viagem). O Delfos diz quanto guardar por mês para chegar lá.",
        rotuloAcao: "Criar primeira meta",
        aoAcionar: () => novaMeta(),
      }));
      box.appendChild(card);
      return;
    }

    const grade = document.createElement("div");
    grade.className = "metas-grade";
    metas.forEach((m) => {
      const atual = Number(m.valorAtual) || 0;
      const alvo = Number(m.valorAlvo) || 0;
      const falta = Math.max(0, alvo - atual);
      const prog = alvo > 0 ? Math.min(1, atual / alvo) : 0;

      let projecao;
      if (alvo > 0 && falta === 0) projecao = "Meta alcançada.";
      else if (m.prazo && UI.diasAte(m.prazo) < 0) projecao = `O prazo passou, e faltam ${moeda(falta)}.`;
      else if (m.prazo) {
        const meses = mesesAte(m.prazo);
        projecao = `Faltam ${moeda(falta)}: cerca de <b>${moeda(falta / meses)} por mês</b> até ${esc(nomeMes(m.prazo.slice(0, 7)))}.`;
      } else {
        projecao = `Faltam ${moeda(falta)}.`;
        if (a.resultado > 0 && a.lancamentos) {
          const meses = Math.ceil(falta / a.resultado);
          if (meses <= 60) projecao += ` Guardando o que sobrou em ${esc(nomeMes(a.chave))}, fica pronta em cerca de ${meses} ${meses === 1 ? "mês" : "meses"}.`;
        }
      }

      const card = document.createElement("article");
      card.className = "card meta-card";
      card.innerHTML = `
        <div class="meta-topo">
          <div style="min-width:0;">
            <div class="meta-nome">${esc(m.descricao)}</div>
            <div class="meta-prazo">${m.prazo ? `até ${esc(fmt.dataPorExtenso(m.prazo))}` : "sem prazo"}</div>
          </div>
          <div class="row-actions">
            <button class="btn ghost sm icon" type="button" data-editar title="Editar" aria-label="Editar meta">${icone("editar")}</button>
            <button class="btn ghost sm icon" type="button" data-excluir title="Excluir" aria-label="Excluir meta">${icone("lixeira")}</button>
          </div>
        </div>
        <div class="meta-valores"><span class="atual">${moeda(atual)}</span><span class="alvo">de ${moeda(alvo)}, ${pct(prog)}</span></div>
        <div class="meter-track"><div class="meter-fill" style="width:${prog * 100}%; background:${prog >= 1 ? "var(--st-good)" : "var(--s-financeiro)"};"></div></div>
        <p class="meta-projecao">${projecao}</p>
        <div class="meta-acoes">${falta > 0 ? `<button class="btn sm" type="button" data-guardar>${icone("cofre")}Guardar</button>` : ""}</div>`;
      card.querySelector("[data-editar]").addEventListener("click", () => editarMeta(m));
      card.querySelector("[data-excluir]").addEventListener("click", () => excluir("financeiro.metas", m, "Meta excluída."));
      card.querySelector("[data-guardar]")?.addEventListener("click", () => guardarNaMeta(m));
      grade.appendChild(card);
    });
    box.appendChild(grade);
  }

  async function guardarNaMeta(m) {
    const v = await UI.formulario({
      titulo: `Guardar para ${m.descricao}`,
      descricao: `Hoje: ${moeda(m.valorAtual)} de ${moeda(m.valorAlvo)}.`,
      campos: [{ nome: "valor", rotulo: "Quanto você guardou agora (R$)", tipo: "dinheiro", obrigatorio: true, placeholder: "0,00" }],
      rotuloConfirmar: "Guardar",
    });
    if (!v || !(v.valor > 0)) return;
    const antes = Number(m.valorAtual) || 0;
    const depois = antes + v.valor;
    Store.atualizar("financeiro.metas", m.id, { valorAtual: depois });
    render();
    const falta = (Number(m.valorAlvo) || 0) - depois;
    UI.toast(falta > 0 ? `Guardado. Faltam ${moeda(falta)}.` : "Guardado. Meta alcançada!", {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.atualizar("financeiro.metas", m.id, { valorAtual: antes }); render(); },
    });
  }

  /* ------------------------------ Lançamentos ------------------------------- */

  // "Pendentes" mostra tudo que falta pagar, de qualquer mês — uma conta que
  // vence no mês que vem é justamente a que a pessoa quer ver.
  const todosOsMeses = () => filtros.todosMeses || filtros.tipo === "pendente";

  function filtradas() {
    const busca = filtros.busca.trim().toLowerCase();
    return transacoes()
      .filter((t) => (todosOsMeses() ? true : (t.data || "").startsWith(estado.mes)))
      .filter((t) => {
        if (filtros.tipo === "todos") return true;
        if (filtros.tipo === "pendente") return t.status === "pendente";
        return t.tipo === filtros.tipo;
      })
      .filter((t) => (filtros.categoria === "todas" ? true : (t.categoria || "Outros") === filtros.categoria))
      .filter((t) => (busca ? (t.descricao || "").toLowerCase().includes(busca) : true))
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }

  function renderFiltros() {
    document.querySelectorAll("#f-tipo [data-tipo]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.tipo === filtros.tipo)));
    $("f-todos-meses").setAttribute("aria-pressed", String(filtros.todosMeses));
    const cats = [...new Set([...Store.estado().financeiro.categorias, ...transacoes().map((t) => t.categoria || "Outros")])];
    $("f-categoria").innerHTML =
      `<option value="todas">Todas as categorias</option>` +
      cats.map((c) => `<option value="${esc(c)}" ${c === filtros.categoria ? "selected" : ""}>${esc(c)}</option>`).join("");
  }

  function renderTabela() {
    const box = $("tabela");
    const lista = filtradas();
    const t = Financas.totais(lista);

    $("resumo-filtro").textContent = lista.length
      ? `${lista.length} ${lista.length === 1 ? "lançamento" : "lançamentos"}${todosOsMeses() ? " em todos os meses" : ` em ${nomeMes(estado.mes)}`}, resultado de ${moeda(t.resultado)}`
      : "";

    box.innerHTML = "";

    if (!lista.length) {
      const card = document.createElement("div");
      card.className = "card";
      const temAlgum = transacoes().length > 0;
      const comFiltro = filtros.tipo !== "todos" || filtros.categoria !== "todas" || filtros.busca;
      card.appendChild(UI.vazio({
        icone: temAlgum ? "busca" : "mais",
        titulo: !temAlgum ? "Sua planilha está vazia" : comFiltro ? "Nenhum lançamento com esses filtros" : `Nada lançado em ${nomeMes(estado.mes)}`,
        texto: !temAlgum
          ? "Registre entradas e saídas, ou importe o extrato do banco, para o Delfos ler o mês, comparar com o anterior e mostrar para onde foi o dinheiro."
          : comFiltro ? "Ajuste ou limpe os filtros para ver os outros lançamentos." : "Os lançamentos deste mês aparecem aqui, do mais recente ao mais antigo.",
        rotuloAcao: !temAlgum ? "Registrar primeiro lançamento" : comFiltro ? "Limpar filtros" : "Novo lançamento",
        aoAcionar: !temAlgum ? novoLancamento : comFiltro ? limparFiltros : novoLancamento,
      }));
      box.appendChild(card);
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    wrap.innerHTML = `
      <table class="sheet">
        <thead>
          <tr>
            <th>Data</th><th>Descrição</th><th>Categoria</th><th>Pago com</th>
            <th>Situação</th><th style="text-align:right;">Valor</th><th><span class="hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody></tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="5">Entrou ${moeda(t.receita)}, saiu ${moeda(t.despesa)}</td>
            <td class="right">${moeda(t.resultado)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>`;

    const tbody = wrap.querySelector("tbody");
    lista.forEach((item) => {
      const receita = item.tipo === "receita";
      const pendente = item.status === "pendente";
      const origem = Financas.nomeOrigem(item.origem) || item.forma || "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="num muted" style="white-space:nowrap;">${fmt.dataCurta(item.data)}</td>
        <td>
          <span class="title">${esc(item.descricao || "(sem descrição)")}</span>
          <span class="meta so-celular">${esc([fmt.dataCurta(item.data), item.categoria || "Outros", origem].filter(Boolean).join(", "))}</span>
        </td>
        <td><span class="badge">${esc(item.categoria || "Outros")}</span></td>
        <td class="muted">${esc(origem || "—")}</td>
        <td>${pendente
          ? `<button class="badge urgente" type="button" data-pagar title="Marcar como pago" style="border:none; cursor:pointer; font:inherit; font-size:12.5px;">pendente</button>`
          : `<span class="muted" style="font-size:13.5px;">${receita ? "recebido" : "pago"}</span>`}</td>
        <td class="right" style="color:${receita ? "var(--success-text)" : "var(--texto)"};">
          ${receita ? "+" : "−"}${moeda(Math.abs(Number(item.valor) || 0))}
        </td>
        <td>
          <div class="row-actions">
            <button class="btn ghost sm icon" type="button" data-editar title="Editar" aria-label="Editar lançamento">${icone("editar")}</button>
            <button class="btn ghost sm icon" type="button" data-repetir title="Lançar de novo com a data de hoje" aria-label="Repetir hoje">${icone("repetir")}</button>
            <button class="btn ghost sm icon" type="button" data-excluir title="Excluir" aria-label="Excluir lançamento">${icone("lixeira")}</button>
          </div>
        </td>`;
      tr.querySelector("[data-editar]").addEventListener("click", () => editarLancamento(item));
      tr.querySelector("[data-repetir]").addEventListener("click", () => repetirHoje(item));
      tr.querySelector("[data-excluir]").addEventListener("click", () => excluir("financeiro.transacoes", item, "Lançamento excluído."));
      tr.querySelector("[data-pagar]")?.addEventListener("click", () => marcarPago(item));
      tbody.appendChild(tr);
    });

    box.appendChild(wrap);
  }

  /* --------------------------------- Ações ---------------------------------- */

  function camposLancamento() {
    return [
      { nome: "tipo", rotulo: "Tipo", tipo: "segmento", opcoes: [{ valor: "despesa", rotulo: "Saída" }, { valor: "receita", rotulo: "Entrada" }] },
      { nome: "descricao", rotulo: "Descrição", tipo: "text", obrigatorio: true, placeholder: "Ex.: Livro de farmacologia" },
      { nome: "valor", rotulo: "Valor (R$)", tipo: "dinheiro", obrigatorio: true, placeholder: "0,00" },
      { nome: "categoria", rotulo: "Categoria", tipo: "select", opcoes: Store.estado().financeiro.categorias },
      { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valorPadrao: hoje },
      {
        nome: "origem", rotulo: "Pago com", tipo: "select", opcoes: Financas.opcoesOrigem(),
        dica: Financas.opcoesOrigem().length > 1
          ? "De qual conta ou cartão o valor sai (ou em qual entra)."
          : "Cadastre contas e cartões para acompanhar o saldo de cada um.",
      },
      { nome: "forma", rotulo: "Observação", tipo: "text", placeholder: "Pix, débito, parcelado…" },
      { nome: "status", rotulo: "Situação", tipo: "segmento", opcoes: [{ valor: "pago", rotulo: "Pago" }, { valor: "pendente", rotulo: "A pagar" }] },
    ];
  }

  async function novoLancamento() {
    const v = await UI.formulario({
      titulo: "Novo lançamento",
      descricao: "Uma entrada ou saída de dinheiro.",
      campos: camposLancamento(),
    });
    if (!v) return;
    Store.inserir("financeiro.transacoes", v);
    if (!filtros.todosMeses && !v.data.startsWith(estado.mes)) estado.mes = v.data.slice(0, 7);
    UI.toast("Lançamento salvo.");
    render();
  }

  async function editarLancamento(item) {
    const v = await UI.formulario({ titulo: "Editar lançamento", campos: camposLancamento(), valores: item });
    if (!v) return;
    Store.atualizar("financeiro.transacoes", item.id, v);
    UI.toast("Lançamento atualizado.");
    render();
  }

  function repetirHoje(item) {
    const { id: _id, ...resto } = item;
    const novo = Store.inserir("financeiro.transacoes", { ...resto, data: hoje });
    if (!filtros.todosMeses) estado.mes = mesHoje;
    render();
    UI.toast(`“${item.descricao || "Lançamento"}” lançado de novo, com a data de hoje.`, {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.remover("financeiro.transacoes", novo.id); render(); },
    });
  }

  const camposMeta = () => [
    { nome: "descricao", rotulo: "Objetivo", tipo: "text", obrigatorio: true, placeholder: "Ex.: Reserva de emergência" },
    { nome: "valorAlvo", rotulo: "Quanto quer juntar (R$)", tipo: "dinheiro", obrigatorio: true },
    { nome: "valorAtual", rotulo: "Quanto já tem (R$)", tipo: "dinheiro", valorPadrao: 0 },
    { nome: "prazo", rotulo: "Prazo", tipo: "date", dica: "Com prazo, o Delfos diz quanto guardar por mês para chegar." },
  ];

  async function novaMeta(valores = {}) {
    const v = await UI.formulario({ titulo: "Nova meta", descricao: "Um objetivo financeiro para acompanhar.", campos: camposMeta(), valores, rotuloConfirmar: "Criar meta" });
    if (!v) return;
    Store.inserir("financeiro.metas", v);
    UI.toast("Meta criada.");
    render();
  }

  async function editarMeta(m) {
    const v = await UI.formulario({ titulo: "Editar meta", campos: camposMeta(), valores: m });
    if (!v) return;
    Store.atualizar("financeiro.metas", m.id, v);
    UI.toast("Meta atualizada.");
    render();
  }

  // Exclusão com desfazer — nada é perdido por um clique errado.
  function excluir(caminho, item, mensagem) {
    const indice = Store.indiceDe(caminho, item.id);
    Store.remover(caminho, item.id);
    render();
    UI.toast(mensagem, {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.restaurar(caminho, item, indice); render(); },
    });
  }

  async function ajustarSaldo() {
    const v = await UI.formulario({
      titulo: "Ajustar saldo",
      descricao: "Quanto você tem hoje, somando contas e dinheiro em espécie.",
      campos: [{ nome: "saldo", rotulo: "Saldo atual (R$)", tipo: "dinheiro", obrigatorio: true }],
      valores: { saldo: Store.estado().financeiro.saldoAtual },
    });
    if (!v) return;
    Store.definirSaldo(v.saldo);
    UI.toast("Saldo atualizado.");
    render();
  }

  function limparFiltros() {
    filtros.busca = "";
    filtros.tipo = "todos";
    filtros.categoria = "todas";
    filtros.todosMeses = false;
    $("f-busca").value = "";
    renderFiltros();
    renderTabela();
  }

  /* ------------------------- Limites e preferências ------------------------- */

  function abrirPreferencias() {
    const p = prefs();
    const cats = [...new Set([...Store.estado().financeiro.categorias, ...transacoes().filter((t) => t.tipo === "despesa").map((t) => t.categoria || "Outros")])];
    const essenciais = p.essenciais || [];
    const numero = (v) => (v === null || v === undefined || v === "" ? "" : esc(v));

    const html = `
      <div class="modal-head">
        <h2 class="modal-title">Limites e preferências</h2>
        <p class="modal-desc">O que o Delfos usa para ler o seu mês. Deixe em branco o que não quiser usar.</p>
      </div>
      <div class="modal-body">
        <div class="field">
          <label for="p-orcamento">Limite de gastos por mês (R$)</label>
          <input id="p-orcamento" type="number" step="0.01" min="0" value="${numero(p.orcamentoMensal)}" placeholder="sem limite" />
        </div>
        <div class="assistente-linha">
          <div class="field">
            <label for="p-poupanca">Quanto do que entra quer guardar (%)</label>
            <input id="p-poupanca" type="number" step="1" min="0" max="100" value="${numero(p.metaPoupanca)}" placeholder="sem meta" />
          </div>
          <div class="field">
            <label for="p-renda">Dia em que a renda costuma cair</label>
            <input id="p-renda" type="number" step="1" min="1" max="31" value="${numero(p.diaRenda)}" placeholder="não sei" />
          </div>
        </div>
        <div class="field">
          <label>Gastos essenciais</label>
          <div class="chips" data-essenciais>${cats.map((c) => `<button type="button" class="chip" aria-pressed="${essenciais.includes(c)}">${esc(c)}</button>`).join("")}</div>
          <span class="hint">O resto conta como escolha, na leitura do mês.</span>
        </div>
        <div class="form-secao">Limite por categoria</div>
        <ul class="abas-lista" data-limites>
          ${cats.map((c) => `
            <li>
              <span class="grow" style="flex:1; min-width:0; font-weight:500;">${esc(c)}</span>
              <input class="input sm" type="number" step="0.01" min="0" style="width:130px;" data-cat="${esc(c)}"
                     value="${numero(p.orcamentos[c])}" placeholder="sem limite" aria-label="Limite para ${esc(c)} em reais" />
            </li>`).join("")}
        </ul>
        <div class="form-secao">Respostas anteriores</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn sm" type="button" data-reset="fixos">Esquecer o que é gasto fixo</button>
          <button class="btn sm" type="button" data-reset="dispensadas">Mostrar de novo as perguntas dispensadas</button>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" data-acao="cancelar" type="button">Cancelar</button>
        <button class="btn primary" data-acao="salvar" type="button">Salvar</button>
      </div>`;

    UI.abrirModal(html, {
      classe: "wide",
      aoMontar(modal, fechar) {
        const resets = {};
        modal.querySelector("[data-essenciais]").addEventListener("click", (ev) => {
          const c = ev.target.closest(".chip");
          if (c) c.setAttribute("aria-pressed", String(c.getAttribute("aria-pressed") !== "true"));
        });
        modal.querySelectorAll("[data-reset]").forEach((b) => b.addEventListener("click", () => {
          resets[b.dataset.reset] = {};
          b.disabled = true;
          b.textContent = "Feito, ao salvar";
        }));
        modal.querySelector('[data-acao="cancelar"]').addEventListener("click", () => fechar(null));
        modal.querySelector('[data-acao="salvar"]').addEventListener("click", () => {
          const num = (id, { inteiro = false, max } = {}) => {
            const bruto = modal.querySelector(id).value;
            if (bruto === "") return null;
            let v = Number(String(bruto).replace(",", "."));
            if (Number.isNaN(v) || v <= 0) return null;
            if (inteiro) v = Math.round(v);
            if (max !== undefined) v = Math.min(v, max);
            return v;
          };
          const orcamentos = {};
          modal.querySelectorAll("[data-limites] [data-cat]").forEach((i) => {
            const v = Number(i.value);
            if (i.value !== "" && v > 0) orcamentos[i.dataset.cat] = v;
          });
          const sel = [...modal.querySelectorAll("[data-essenciais] .chip")].filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.textContent);
          salvarPrefs({
            orcamentoMensal: num("#p-orcamento"),
            metaPoupanca: num("#p-poupanca", { max: 100 }),
            diaRenda: num("#p-renda", { inteiro: true, max: 31 }),
            essenciais: sel.length ? sel : p.essenciais === null ? null : [],
            orcamentos,
            ...resets,
          });
          fechar(null);
          UI.toast("Preferências salvas.");
          render();
        });
      },
    });
  }

  /* --------------------------------- Eventos -------------------------------- */

  $("btn-preferencias").innerHTML = `${icone("ajustes")}Limites e preferências`;
  $("btn-importar").innerHTML = `${icone("importar")}Importar extrato`;
  $("btn-lancamento").innerHTML = `${icone("mais")}Novo lançamento`;
  $("btn-meta").innerHTML = `${icone("mais")}Nova meta`;
  $("mes-anterior").innerHTML = icone("esquerda");
  $("mes-seguinte").innerHTML = icone("direita");
  document.querySelector(".fin-filtros .busca").insertAdjacentHTML("afterbegin", icone("busca"));

  $("btn-lancamento").addEventListener("click", novoLancamento);
  $("btn-importar").addEventListener("click", () => Importar.abrirAssistente(render));
  $("btn-meta").addEventListener("click", () => novaMeta());
  $("btn-preferencias").addEventListener("click", abrirPreferencias);

  const irPara = (mes) => { estado.mes = mes; esconderDica(); render(); };
  $("mes-anterior").addEventListener("click", () => irPara(Financas.deslocarMes(estado.mes, -1)));
  $("mes-seguinte").addEventListener("click", () => irPara(Financas.deslocarMes(estado.mes, 1)));
  $("mes-hoje").addEventListener("click", () => irPara(mesHoje));

  $("f-tipo").addEventListener("click", (ev) => {
    const c = ev.target.closest("[data-tipo]");
    if (!c) return;
    filtros.tipo = c.dataset.tipo;
    renderFiltros();
    renderTabela();
  });
  $("f-todos-meses").addEventListener("click", () => { filtros.todosMeses = !filtros.todosMeses; renderFiltros(); renderTabela(); });
  $("f-busca").addEventListener("input", (e) => { filtros.busca = e.target.value; renderTabela(); });
  $("f-categoria").addEventListener("change", (e) => { filtros.categoria = e.target.value; renderTabela(); });

  // O gráfico de ritmo é desenhado na largura real do cartão (texto do eixo
  // em tamanho legível), então redesenha quando a janela muda de tamanho.
  let largura = innerWidth;
  let espera;
  addEventListener("resize", () => {
    if (innerWidth === largura) return;
    largura = innerWidth;
    clearTimeout(espera);
    espera = setTimeout(() => renderRitmo(Financas.analisarMes(estado.mes, prefs())), 150);
  });

  render();
})();
