/* Página de uma aba criada pelo usuário. Mesma mecânica da aba Pessoal, mas
   com nome, ícone e cor próprios — e com a edição da própria aba aqui dentro. */

(() => {
  const { fmt } = UI;
  const CAMINHO = "pilares";
  const id = UI.parametro("id");

  let pilar = Store.achar(CAMINHO, id);

  if (!pilar) {
    UI.iniciarPagina("home");
    document.getElementById("conteudo").innerHTML = `<div class="card" style="margin-top:16px;"></div>`;
    document.querySelector(".card").appendChild(
      UI.vazio({
        icone: "◌",
        titulo: "Aba não encontrada",
        texto: "Pode ter sido excluída, ou este link é de outro navegador: os dados ficam salvos em cada navegador.",
        rotuloAcao: "Voltar à visão geral",
        aoAcionar: () => (location.href = "index.html"),
      })
    );
    return;
  }

  UI.iniciarPagina("pilar", { idAtivo: id });

  const itens = () => (Store.achar(CAMINHO, id) || {}).itens || [];
  const ehAcademia = () => pilar.modelo === "academia";
  const ehAlimentacao = () => PlanoAlimentar.ehAba(pilar);
  const ehRotinaAlimentar = c => Acompanhamento.alimentar(pilar) && c.extras?.rotina === true;

  /* --------------------------------- Render --------------------------------- */

  const $ = (x) => document.getElementById(x);
  const rotulo = () => (pilar.rotuloItem || "item").toLowerCase();
  const filtros = { grupo: "todos", busca: "" };
  filtros.periodo = "todos";
  let dataRotina = UI.hojeISO();
  let verConcluidos = false;
  const comparadorTexto = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

  const normal = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const campo = (chave, tipo) => (pilar.campos || []).find((c) => c.id === chave && (!tipo || c.tipo === tipo));
  const contemOpcoes = (c, valores) => c && valores.every((v) => (c.opcoes || []).some((o) => normal(o) === v));

  // O esquema, e não o nome escolhido pela pessoa, determina a composição.
  function composicao() {
    if (pilar.checkin && contemOpcoes(campo("momento", "select"), ["manha", "tarde", "noite"])) return "habitos";
    if (!pilar.checkin && normal(rotulo()) === "livro" && campo("autor", "text") && contemOpcoes(campo("situacao", "select"), ["lendo", "lido"])) return "leituras";
    if (!pilar.checkin && pilar.naAgenda && campo("contexto") && contemOpcoes(campo("prioridade", "select"), ["alta", "media", "baixa"]) && contemOpcoes(campo("situacao", "select"), ["a fazer", "em andamento", "concluido"])) return "trabalho";
    return "geral";
  }

  function guardarFoco() {
    const el = document.activeElement;
    if (!el || !$("conteudo").contains(el)) return () => {};
    const itemId = el.closest("[data-item-id]")?.dataset.itemId;
    const acao = ["data-hoje", "data-editar", "data-excluir", "data-concluir"].find((a) => el.hasAttribute(a));
    const grupo = el.dataset.grupo;
    return () => {
      if (el.isConnected) return;
      const item = itemId && [...$("lista").querySelectorAll("[data-item-id]")].find((n) => n.dataset.itemId === itemId);
      const destino = item && acao ? item.querySelector(`[${acao}]`)
        : grupo !== undefined ? [...$("f-grupo").querySelectorAll("[data-grupo]")].find((n) => n.dataset.grupo === grupo)
        : el.id ? document.getElementById(el.id) : null;
      const detalhes = destino?.closest(".registro-detalhes-corpo");
      if (detalhes && item) {
        detalhes.hidden = false;
        item.querySelector("[data-detalhes]")?.setAttribute("aria-expanded", "true");
      }
      (destino || (itemId ? $("f-busca") : null))?.focus({ preventScroll: true });
    };
  }

  function render() {
    const restaurarFoco = guardarFoco();
    pilar = Store.achar(CAMINHO, id);
    if (!pilar) return (location.href = "index.html");

    document.title = `${pilar.nome}, ${UI.NOME}`;
    // A cor da aba é um hex do usuário, então entra como variável na página
    // (--tint): o quadradinho dos dias marcados e os destaques leem dela.
    const raiz = $("conteudo");
    raiz.style.setProperty("--tint", pilar.cor);

    const etiqueta = $("etiqueta");
    // O ponto do eyebrow leva a cor da aba; o texto fica na tinta normal.
    etiqueta.textContent = "Minha aba";
    etiqueta.style.setProperty("--marca", pilar.cor);
    $("swatch-lista").style.background = pilar.cor;

    $("titulo").textContent = pilar.nome;
    const academia = ehAcademia();
    const alimentacao = ehAlimentacao();
    // As abas prontas com tela própria (academia, alimentação) escondem a lista genérica.
    const propria = academia || alimentacao;
    Organizacao.rotular("registros", academia ? "Treinos" : alimentacao ? "Plano diário" : "Registros");
    Organizacao.rotular("visao-geral", propria ? "Evolução" : "Visão geral");
    document.querySelector('[data-ajuste="btn-refazer-questionario"]').hidden = !academia;
    document.querySelector('[data-ajuste="btn-campos"]').hidden = propria;
    $("subtitulo").textContent =
      (alimentacao ? "Seu plano alimentar por refeição, com alimentos, quantidades, calorias e check a cada dia." : pilar.descricao) ||
      (academia
        ? "Seus dias de treino, com carga, repetições e recorde de cada exercício."
        : alimentacao ? "Sua dieta por refeição, as calorias de hoje e os seus objetivos."
        : pilar.checkin ? "Marque cada dia em que fez; o Delfos conta as sequências." : pilar.naAgenda ? "Com data, cada registro entra na agenda da visão geral." : "Registros que se acompanham, fora da agenda.");

    $("btn-editar-aba").innerHTML = `${UI.icone("ajustes")}Personalizar`;
    $("btn-item").textContent = `+ ${fmt.capitalizar(rotulo())}`;

    $("bloco-stats").classList.toggle("hidden", propria);
    $("secao-itens").classList.toggle("hidden", propria);
    $("leitura").classList.toggle("hidden", propria);
    $("secao-academia").classList.toggle("hidden", !academia);
    $("secao-alimentacao").classList.toggle("hidden", !alimentacao);
    $("alimentacao-evolucao-bloco").classList.toggle("hidden", !alimentacao);
    $("coluna-lado").classList.toggle("hidden", alimentacao);
    $("btn-item").classList.toggle("hidden", propria);
    prepararRapido();
    const modelo = ModelosAbas.obter(pilar.modeloOrigem);
    $("dica-modelo").textContent = modelo?.orientacao || Acompanhamento.orientacao(pilar);
    $("dica-modelo").hidden = !$("dica-modelo").textContent;
    const novos = novosCamposModelo();
    $("ajuste-modelo").hidden = propria || !novos.length;
    $("resumo-novos-campos").textContent = novos.map(c => c.rotulo).join(", ") + ". Seus campos atuais serão preservados.";
    $("btn-campos").classList.toggle("hidden", propria);
    $("btn-refazer-questionario").hidden = !academia;
    $("btn-dia").classList.toggle("hidden", !(academia && pilar.academia?.configuradoEm));
    $("nota-ajustes").textContent = academia
      ? "Esta aba foi criada por você. Renomeá-la, trocar ícone e cor, ou refazer o questionário não mexe nos dias já montados; excluí-la apaga também os dias e exercícios cadastrados."
      : alimentacao ? "Esta aba foi criada por você. Renomeá-la ou trocar ícone e cor não mexe na dieta; excluí-la apaga também o plano alimentar, as metas e os registros de cada dia."
      : "Esta aba foi criada por você. Personalizar (propósito, ícone, cor, meta, agrupamento, campos sugeridos pelo Delfos) não mexe no que já está cadastrado; excluí-la apaga também todos os registros dela.";
    const prop = $("proposito-aba");
    prop.hidden = !pilar.proposito;
    prop.querySelector("span").textContent = pilar.proposito || "";

    if (alimentacao) {
      $("sec-perguntas").hidden = true;
      Alimentacao.montar({ pilar, box: $("alimentacao-conteudo"), evolucao: $("alimentacao-evolucao"), aoMudar: render });
      UI.montarLayout("pilar", { idAtivo: id });
      return;
    }

    if (academia) {
      $("swatch-academia").style.background = pilar.cor;
      $("sec-perguntas").hidden = true;
      renderAcademia();
      UI.montarLayout("pilar", { idAtivo: id });
      return;
    }

    const L = Leituras.pilar(pilar);
    $("leitura").innerHTML = L.frase;
    renderStats(L);
    renderFiltros(L);
    renderLista(L);
    renderResumos(L);
    renderHistorico(L);
    renderRotinaAlimentar();
    renderAcompanhamento();
    UI.renderNotas($("notas"), L.notas, L.itens.length
      ? "Nada fora do comum por aqui."
      : `Quando houver registros, o Delfos aponta aqui ${pilar.checkin ? "as sequências e o que ficou sem marcar" : pilar.meta ? "o ritmo da meta" : "o que merece atenção"}.`);
    UI.renderPerguntas($("sec-perguntas"), $("perguntas"), `pilar:${pilar.id}`, perguntas(L), render);
    const v = visual();
    $("leitura").classList.toggle("hidden", !v.leitura);
    $("bloco-stats").classList.toggle("hidden", !v.numeros);
    if (!v.perguntas) $("sec-perguntas").hidden = true;
    UI.montarLayout("pilar", { idAtivo: id });
    restaurarFoco();
  }

  const PERIODO = { semana: "da semana", mes: "do mês", ano: "do ano" };

  function renderStats(L) {
    const t = [];
    const rot = rotulo();
    if (pilar.checkin) t.push({ l: fmt.capitalizar(Leituras.pluralizar(rot)), v: L.itens.length, s: "acompanhados por dia" });
    else if (Acompanhamento.alimentar(pilar)) t.push({ l: "Refeições cadastradas", v: L.itens.length, s: "Checks de rotina separados por data" });
    else t.push({ l: "Em aberto", v: L.abertos.length, s: `${L.itens.length} ${L.itens.length === 1 ? "registro" : "registros"} no total` });
    if (pilar.checkin) {
      const hoje = L.checkin.filter((x) => x.hoje).length;
      t.push({ l: "Marcados hoje", v: `${hoje} de ${L.checkin.length}`, s: hoje === L.checkin.length && L.checkin.length ? "tudo em dia" : "toque em Hoje em cada um" });
      const melhor = [...L.checkin].sort((a, b) => b.seq - a.seq)[0];
      t.push({ l: "Maior sequência", v: melhor ? `${melhor.seq} ${melhor.seq === 1 ? "dia" : "dias"}` : "-", s: melhor?.seq ? fmt.escape(melhor.i.descricao) : "comece hoje" });
    } else if (pilar.naAgenda) {
      t.push({ l: "Próximos 7 dias", v: L.semana.length, s: L.semana[0] ? `próximo: ${fmt.escape(L.semana[0].descricao)}` : "nada marcado" });
      t.push({ l: "Atrasados", v: L.atrasados.length, s: L.atrasados.length ? "vale concluir ou remarcar" : "nada atrasado", classe: L.atrasados.length ? "delta down" : "" });
    } else {
      t.push({ l: "Concluídos", v: L.concluidos.length, s: L.itens.length ? `${Math.round((L.concluidos.length / L.itens.length) * 100)}% do total` : "" });
    }
    if (L.prog) {
      const d = Leituras.descreverMeta(pilar, L.prog);
      t.push({
        l: `Meta ${PERIODO[L.prog.periodo]}`, v: d.f(L.prog.atual),
        s: `de ${fmt.escape(d.f(L.prog.alvo))}${L.prog.atual >= L.prog.alvo ? ", cumprida" : L.prog.noRitmo ? ", no ritmo" : ""}<div class="meter-track" style="margin-top:8px;"><div class="meter-fill" style="width:${L.prog.pct * 100}%; background:${fmt.escape(pilar.cor)}"></div></div>`,
      });
    } else {
      const dinheiro = L.resumoCampos.find((r) => r.tipo === "dinheiro");
      const numero = L.resumoCampos.find((r) => r.tipo === "numero");
      if (dinheiro) t.push({ l: `${fmt.escape(dinheiro.campo.rotulo)} no mês`, v: fmt.moeda(dinheiro.noMes), s: `${fmt.moeda(dinheiro.total)} no total` });
      else if (numero) t.push({ l: `${fmt.escape(numero.campo.rotulo)}, média`, v: fmt.decimal(numero.media), s: `em ${numero.n} ${numero.n === 1 ? rot : Leituras.pluralizar(rot)}` });
    }
    const box = $("bloco-stats");
    box.className = `grid pagina-indicadores ${t.length >= 4 ? "g4" : "g3"}`;
    box.innerHTML = t.slice(0, 4).map((x) => `
      <div class="card">
        <div class="stat-label">${x.l}</div>
        <div class="stat-value ${x.classe || ""}">${typeof x.v === "number" ? x.v : fmt.escape(String(x.v))}</div>
        <div class="stat-sub">${x.s}</div>
      </div>`).join("");
  }

  const campoGrupo = () => (pilar.campos || []).find((c) => c.id === pilar.agruparPor && c.tipo === "select");

  function novosCamposModelo() {
    const modelo = ModelosAbas.obter(pilar.modeloOrigem);
    return (modelo?.campos || []).filter(c => !(pilar.campos || []).some(atual => atual.id === c.id)).slice(0, Math.max(0, 8 - (pilar.campos || []).length));
  }

  function renderAcompanhamento() {
    const { indicadores, lembretes } = Acompanhamento.analisar(pilar, UI.hojeISO());
    const bloco = $("acompanhamento-modelo");
    bloco.hidden = !indicadores.length && !lembretes.length;
    $("acompanhamento-conteudo").innerHTML = `${indicadores.length ? `<dl class="acompanhamento-numeros">${indicadores.map(i => `<div><dt>${fmt.escape(i.rotulo)}</dt><dd>${i.unidade === "R$" ? fmt.moeda(i.valor) : `${fmt.decimal(i.valor, 1)} ${fmt.escape(i.unidade)}`}</dd>${i.dica ? `<p class="card-note">${fmt.escape(i.dica)}</p>` : ""}</div>`).join("")}</dl>` : ""}${lembretes.length ? `<h3 class="section-title">Próximas datas dos registros</h3><ul class="list">${lembretes.map(l => `<li><button class="btn ghost sm" data-retomar="${fmt.escape(l.itemId)}">${fmt.escape(l.nome)}</button><span class="meta">${fmt.escape(l.rotulo)}, ${fmt.data(l.data)}</span></li>`).join("")}</ul>` : ""}`;
    $("acompanhamento-conteudo").onclick = ev => {
      const b = ev.target.closest("[data-retomar]");
      const c = b && itens().find(i => i.id === b.dataset.retomar);
      if (c) editarItem(c);
    };
  }

  function renderRotinaAlimentar() {
    const box = $("rotina-alimentar");
    box.hidden = !Acompanhamento.alimentar(pilar);
    if (box.hidden) return;
    const rotina = itens().filter(c => (c.extras?.rotina === true || (c.feitos || []).includes(dataRotina)) && (!c.data || c.data <= dataRotina || (c.feitos || []).includes(dataRotina)));
    const marcadas = rotina.filter(c => (c.feitos || []).includes(dataRotina));
    const calorias = marcadas.reduce((s, c) => s + (Number(Acompanhamento.registroAlimentar(c, dataRotina).calorias) || 0), 0);
    const linhas = rotina.map(c => {
      const registro = Acompanhamento.registroAlimentar(c, dataRotina);
      const kcal = registro.calorias === null || registro.calorias === undefined || registro.calorias === ""
        ? "calorias não informadas" : `${fmt.decimal(registro.calorias, 0)} kcal`;
      return `<li><label class="rotina-refeicao">
        <input type="checkbox" class="check" data-rotina="${fmt.escape(c.id)}" ${(c.feitos || []).includes(dataRotina) ? "checked" : ""} />
        <span><b>${fmt.escape(registro.nome || c.descricao)}</b><span class="meta">${fmt.escape(registro.alimento)}, ${kcal}</span></span>
      </label></li>`;
    }).join("");
    box.innerHTML = `<header class="bloco-cabecalho"><div>
        <h2 class="bloco-titulo">Alimentação de rotina</h2>
        <p class="bloco-resumo">${marcadas.length} de ${rotina.length} ${rotina.length === 1 ? "refeição marcada" : "refeições marcadas"}, ${fmt.decimal(calorias, 0)} kcal informadas</p>
      </div></header><div class="bloco-corpo">
      <div class="ali-data"><label for="rotina-data">Data</label><input class="input" type="date" id="rotina-data" value="${dataRotina}" /><button class="btn ghost sm" data-rotina-hoje type="button">Hoje</button></div>
      ${rotina.length ? `<ul class="list">${linhas}</ul>` : `<p class="card-note">No cadastro da refeição, informe o alimento e ative <b>Alimentação de rotina</b>. Ela aparecerá aqui a partir da data cadastrada, pronta para dar o check a cada dia.</p>`}
      </div>`;
    box.onchange = ev => {
      if (ev.target.id === "rotina-data") { if (ev.target.value && ev.target.validity.valid) { dataRotina = ev.target.value; renderRotinaAlimentar(); $("rotina-data").focus({ preventScroll: true }); } return; }
      const c = itens().find(i => i.id === ev.target.dataset.rotina);
      if (!c) return;
      const feitos = new Set(c.feitos || []), registros = { ...(c.registrosRotina || {}) };
      if (ev.target.checked) { feitos.add(dataRotina); registros[dataRotina] = { nome: c.descricao, alimento: c.extras?.ingredientes || "", calorias: c.extras?.calorias ?? null }; }
      else { feitos.delete(dataRotina); delete registros[dataRotina]; }
      try { Store.subAtualizar(CAMINHO, id, "itens", c.id, { feitos: [...feitos].sort(), registrosRotina: registros }); }
      catch { ev.target.checked = !ev.target.checked; UI.toast("Não foi possível guardar o check. Tente novamente."); return; }
      renderRotinaAlimentar();
      [...box.querySelectorAll("[data-rotina]")].find(b => b.dataset.rotina === c.id)?.focus({ preventScroll: true });
    };
    box.onclick = ev => { if (ev.target.closest("[data-rotina-hoje]")) { dataRotina = UI.hojeISO(); renderRotinaAlimentar(); } };
  }

  function renderFiltros() {
    const cg = campoGrupo();
    const box = $("f-grupo");
    box.hidden = !cg;
    box.closest(".filtro-grupo").hidden = !cg;
    if (!cg) { filtros.grupo = "todos"; box.innerHTML = ""; return; }
    $("rotulo-grupo").textContent = cg.rotulo;
    if (filtros.grupo !== "todos" && !cg.opcoes.includes(filtros.grupo)) filtros.grupo = "todos";
    box.innerHTML = [["todos", "Tudo"], ...cg.opcoes.map((o) => [o, fmt.capitalizar(o)])]
      .map(([v, r]) => `<button type="button" class="chip" data-grupo="${fmt.escape(v)}" aria-pressed="${v === filtros.grupo}">${fmt.escape(r)}</button>`).join("");
  }

  /* ------------------------------ Vistas da lista ---------------------------
     Cada aba escolhe como mostra os registros: lista, cartões, quadro (colunas
     pelo campo de agrupar, com arrastar), tabela (todos os campos, ordenável)
     ou calendário do mês. A escolha e o resto do layout ficam em
     `pilar.visual` — opcional: aba sem `visual` segue como sempre foi. */

  const VISTAS = [["lista", "Lista", "lista"], ["cartoes", "Cartões", "grade"], ["quadro", "Quadro", "quadro"], ["tabela", "Tabela", "tabela"], ["calendario", "Calendário", "calendario"]];
  const VISUAL_PADRAO = { vista: "lista", ordem: "auto", leitura: true, numeros: true, lateral: true, perguntas: true };
  const visual = () => ({ ...VISUAL_PADRAO, ...(pilar.visual || {}) });
  const vistasDaAba = () => (pilar.checkin ? VISTAS.filter(([v]) => v === "lista" || v === "cartoes") : VISTAS);
  const vistaAtual = () => (vistasDaAba().some(([v]) => v === visual().vista) ? visual().vista : "lista");
  const salvarVisual = (patch) => Store.atualizar(CAMINHO, id, { visual: { ...visual(), ...patch } });
  const camposOrdenaveis = () => (pilar.campos || []).filter((c) => ["number", "dinheiro", "estrelas", "date"].includes(c.tipo));
  let tabelaOrdem = null; // { chave, asc } — clique no cabeçalho, só nesta visita
  let mesCal = null;

  function opcoesOrdem() {
    return [
      ["auto", "Ordem padrão"], ...(pilar.checkin ? [] : [["data", "Por data"]]), ["recentes", "Mais recentes"], ["az", "De A a Z"],
      ...camposOrdenaveis().map((c) => [`campo:${c.id}`, c.tipo === "date" ? `Por ${c.rotulo.toLowerCase()}` : `Maior ${c.rotulo.toLowerCase()}`]),
    ];
  }

  // Nas composições próprias (leituras, hábitos, trabalho) lista e cartões
  // mudam só o quanto cada registro mostra: os nomes dizem isso.
  const ROTULOS_CONTEXTUAIS = {
    lista: { nome: "Compacta", curto: "Compacta", frase: "Só o nome e o essencial de cada registro; os detalhes abrem ao tocar.", bom: "ver tudo de relance" },
    cartoes: { nome: "Detalhada", curto: "Detalhada", frase: "Cada registro com mais informações à mostra.", bom: "acompanhar cada registro de perto" },
  };
  const opcoesVista = () => UI.vistas(vistasDaAba().map(([v]) => v), composicao() !== "geral" ? ROTULOS_CONTEXTUAIS : {});

  /** A linha embaixo das ferramentas: o que a forma escolhida faz e como usar. */
  function dicaVista() {
    const v = vistaAtual();
    const def = opcoesVista().find((o) => o.id === v);
    if (!def) return "";
    const cg = campoGrupo();
    const como = v === "quadro"
      ? cg ? `Uma coluna para cada ${cg.rotulo.toLowerCase()}. Arraste entre as colunas para mudar.` : "Colunas Em aberto e Concluídos. Arraste para concluir."
      : v === "tabela" ? "Toque no título de uma coluna para ordenar."
      : v === "calendario" ? "Toque num dia para adicionar um registro nele."
      : def.frase;
    return `<b>${fmt.escape(def.nome)}.</b> ${fmt.escape(como)}`;
  }

  function renderControlesVista() {
    const box = $("f-vista");
    const ops = opcoesVista();
    box.hidden = ops.length < 2;
    // Só redesenha quando as opções mudam: assim o foco do teclado não se perde.
    const chave = ops.map((o) => `${o.id}:${o.curto || o.nome}`).join("|");
    if (box.dataset.chave !== chave) {
      box.dataset.chave = chave;
      box.innerHTML = UI.seletorVistasHTML({ nome: "vista", atual: vistaAtual(), opcoes: ops, rotulo: "Como ver os registros", compacto: true });
      UI.ligarSeletorVistas(box.querySelector("[data-seletor-vistas]"));
    } else {
      box.querySelector('input[type="hidden"]').value = vistaAtual();
      box.querySelectorAll(".vista-opcao").forEach((b) => {
        const sel = b.dataset.valor === vistaAtual();
        b.setAttribute("aria-checked", String(sel));
        b.tabIndex = sel ? 0 : -1;
      });
    }
    $("vista-dica").innerHTML = dicaVista();
    const ordem = $("f-ordem");
    const ordens = opcoesOrdem();
    const atual = ordens.some(([v]) => v === visual().ordem) ? visual().ordem : "auto";
    ordem.innerHTML = ordens.map(([v, r]) => `<option value="${fmt.escape(v)}" ${v === atual ? "selected" : ""}>${fmt.escape(r)}</option>`).join("");
    ordem.hidden = vistaAtual() === "calendario" || vistaAtual() === "tabela";
  }

  const valorOrdem = (c, chave) => (chave === "descricao" ? c.descricao : chave === "data" ? c.data : (c.extras || {})[chave]);

  function comparar(a, b, chave, asc = true) {
    const va = valorOrdem(a, chave), vb = valorOrdem(b, chave);
    const vazioA = va === undefined || va === null || va === "", vazioB = vb === undefined || vb === null || vb === "";
    if (vazioA || vazioB) return vazioA - vazioB; // vazio sempre no fim
    const r = typeof va === "number" || typeof vb === "number" ? Number(va) - Number(vb)
      : typeof va === "boolean" ? Number(va) - Number(vb)
      : comparadorTexto.compare(String(va), String(vb));
    return asc ? r : -r;
  }

  function ordenar(lista) {
    const o = visual().ordem;
    const l = [...lista];
    if (o === "data") return l.sort((a, b) => comparar(a, b, "data"));
    if (o === "recentes") return l.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
    if (o === "az") return l.sort((a, b) => comparar(a, b, "descricao"));
    if (o.startsWith("campo:")) {
      const campo = (pilar.campos || []).find((c) => c.id === o.slice(6));
      if (campo) return l.sort((a, b) => comparar(a, b, campo.id, campo.tipo === "date"));
    }
    return l.sort((a, b) => (pilar.naAgenda ? (a.data || "9999").localeCompare(b.data || "9999") : (b.criadoEm || "").localeCompare(a.criadoEm || "")));
  }

  function renderLista(L) {
    const box = $("lista");
    box.innerHTML = "";
    const tipo = composicao();
    box.dataset.composicao = tipo;
    $("titulo-lista").lastChild.textContent = tipo === "habitos" ? "Hoje" : tipo === "leituras" ? "Sua biblioteca" : tipo === "trabalho" ? "Sua pauta" : fmt.capitalizar(Leituras.pluralizar(rotulo()));
    const feitos = L.itens.filter((i) => i.concluido).length;
    const emAberto = L.itens.length - feitos;
    $("lista-resumo").textContent = Acompanhamento.alimentar(pilar) && L.itens.length ? `${L.itens.length} registros, ${L.itens.filter(ehRotinaAlimentar).length} de rotina (check por data acima)` : !L.itens.length ? ""
      : pilar.checkin ? `${L.itens.filter((c) => (c.feitos || []).includes(UI.hojeISO())).length} de ${L.itens.length} ${Leituras.pluralizar(rotulo())} marcados hoje`
      : `${emAberto} em aberto${feitos ? `, ${feitos} ${feitos === 1 ? "concluído" : "concluídos"}` : ""}`;
    $("registros-ferramentas").hidden = !L.itens.length;
    $("vista-dica").hidden = !L.itens.length;
    if (!L.itens.length) document.querySelector(".registros-grupos").hidden = true;
    $("btn-item").hidden = !L.itens.length;
    renderControlesVista();
    const vista = vistaAtual();
    box.dataset.vista = vista;
    const v = visual();
    // Quadro, tabela e calendário pedem a largura toda; a coluna lateral desce.
    $("secao-itens").classList.toggle("so-lista", !v.lateral || ["quadro", "tabela", "calendario"].includes(vista));
    $("coluna-lado").hidden = !v.lateral;

    const cg = campoGrupo();
    const busca = filtros.busca.trim().toLowerCase();
    // No quadro sem campo de agrupar, as colunas são "em aberto" e "concluídos":
    // os concluídos precisam estar lá. No calendário, também.
    const incluiConcluidos = verConcluidos || pilar.checkin || vista === "calendario" || (vista === "quadro" && !cg);
    const hoje = UI.hojeISO(), fimPeriodo = UI.isoMaisDias(6), mes = UI.mesAtual();
    const visiveis = ordenar(L.itens
      .filter(c => filtros.periodo === "todos" || filtros.periodo === "sem-data" && !c.data || filtros.periodo === "hoje" && c.data === hoje || filtros.periodo === "proximos" && c.data >= hoje && c.data <= fimPeriodo || filtros.periodo === "mes" && c.data?.startsWith(mes))
      .filter((c) => incluiConcluidos || !c.concluido || ehRotinaAlimentar(c))
      .filter((c) => filtros.grupo === "todos" || (c.extras || {})[cg?.id] === filtros.grupo)
      .filter((c) => !busca || (c.descricao || "").toLowerCase().includes(busca) || Object.values(c.extras || {}).some((x) => String(x).toLowerCase().includes(busca))));

    if (!L.itens.length) {
      box.appendChild(comecoDaAba());
      return;
    }

    if (!visiveis.length) {
      const semColecao = !L.itens.length;
      const soConcluidos = !semColecao && !busca && filtros.grupo === "todos" && !verConcluidos && feitos === L.itens.length;
      box.appendChild(UI.vazio({
        icone: semColecao ? "mais" : "busca",
        titulo: semColecao ? tipo === "habitos" ? "Comece com seu primeiro hábito" : tipo === "leituras" ? "Adicione o primeiro livro" : "Tudo começa com um registro" : soConcluidos ? "Tudo concluído por aqui" : "Nenhum resultado para esta busca",
        texto: semColecao ? pilar.checkin ? "Escolha o que quer cultivar na sua rotina. Depois, marque cada dia em que fizer." : "Adicione o que você quer acompanhar. As informações ficam organizadas aqui." : soConcluidos ? "Seus registros continuam guardados e podem ser consultados quando quiser." : "Experimente outro termo ou limpe os filtros para ver seus registros.",
        rotuloAcao: semColecao ? `Adicionar ${rotulo()}` : soConcluidos ? "Ver concluídos" : "Limpar filtros",
        aoAcionar: semColecao ? novoItem : () => {
          filtros.busca = ""; filtros.grupo = "todos"; filtros.periodo = "todos"; $("f-periodo").value = "todos"; $("f-busca").value = "";
          if (soConcluidos) { verConcluidos = true; $("f-concluidos").checked = true; }
          render(); $("f-busca").focus({ preventScroll: true });
        },
      }));
      return;
    }

    if (vista === "calendario") return renderCalendario(box, visiveis);
    if (vista === "quadro") return renderQuadro(box, visiveis);
    if (vista === "tabela") return renderTabela(box, visiveis);

    const agrupador = tipo === "trabalho" && (!cg || ["situacao", "prioridade"].includes(cg.id)) ? campo("prioridade", "select") : cg;
    const grupos = agruparRegistros(visiveis, agrupador, tipo);
    grupos.forEach(([valor, lista]) => {
      const g = document.createElement("div");
      g.className = "registros-grupo";
      if (valor !== null) {
        const sem = tipo === "habitos" && agrupador?.id === "momento" ? "Sem período" : `Sem ${agrupador.rotulo.toLowerCase()}`;
        const contagem = pilar.checkin ? `${lista.filter((c) => (c.feitos || []).includes(UI.hojeISO())).length} de ${lista.length}` : lista.length;
        g.innerHTML = `<header class="registros-grupo-cabecalho"><h3>${fmt.escape(valor ? fmt.capitalizar(valor) : sem)}</h3><span>${contagem}</span></header>`;
      }
      const contextual = tipo !== "geral";
      const cont = document.createElement(!contextual && vista === "cartoes" ? "div" : "ul");
      cont.className = contextual ? "registros-linhas" : vista === "cartoes" ? "pilar-cartoes" : "list";
      lista.forEach((c) => cont.appendChild(contextual ? linhaContextual(c, tipo, vista === "cartoes") : vista === "cartoes" ? cartaoItem(c) : linhaItem(c)));
      g.appendChild(cont);
      box.appendChild(g);
    });
  }

  /**
   * A aba sem nenhum registro: três passos curtos, e o passo do meio já é a
   * escolha de como ver, com o desenho de cada forma. É ali que se entende a
   * diferença entre lista, cartões, colunas e planilha, antes de precisar.
   */
  function comecoDaAba() {
    const r = rotulo();
    const el = document.createElement("div");
    // "empty": o mesmo papel do estado vazio de antes (e os testes o procuram assim).
    el.className = "empty comeco-aba";
    const ops = opcoesVista();
    el.innerHTML = `
      <h3 class="comeco-titulo">${pilar.checkin ? "Comece pelo primeiro hábito" : `Comece pelo primeiro ${fmt.escape(r)}`}</h3>
      <ol class="comeco-passos">
        <li><b>Escreva o nome no campo acima e aperte Enter.</b> <span>O resto das informações você completa depois, em Detalhes.</span></li>
        ${ops.length > 1 ? `<li><b>Escolha como ver.</b> <span>Dá para trocar a qualquer momento, no alto da lista.</span>
          ${UI.seletorVistasHTML({ nome: "vista-comeco", atual: vistaAtual(), opcoes: ops, rotulo: "Como ver os registros" })}</li>` : ""}
        <li><b>Ajuste o que cada ${fmt.escape(r)} guarda</b> <span>em Ajustes, quando sentir falta de alguma informação.</span></li>
      </ol>
      <button class="btn ghost" type="button" data-completo>Abrir o formulário completo</button>`;
    const grupo = el.querySelector("[data-seletor-vistas]");
    UI.ligarSeletorVistas(grupo, (v) => {
      salvarVisual({ vista: v });
      $("vista-dica").innerHTML = dicaVista();
      UI.toast(`Seus ${Leituras.pluralizar(r)} vão aparecer em ${opcoesVista().find((o) => o.id === v)?.nome.toLowerCase()}.`);
    });
    el.querySelector("[data-completo]").addEventListener("click", () => novoItem());
    return el;
  }

  function agruparRegistros(lista, cg, tipo) {
    if (!cg) return [[null, lista]];
    const preferida = tipo === "habitos" && cg.id === "momento" ? ["manha", "tarde", "noite", "qualquer horario", "qualquer hora"]
      : tipo === "leituras" && cg.id === "situacao" ? ["lendo", "quero ler", "lido", "abandonado"]
      : tipo === "trabalho" && cg.id === "prioridade" ? ["alta", "media", "baixa"] : [];
    const valores = [...new Set([...cg.opcoes, ...lista.map((c) => String(c.extras?.[cg.id] || ""))])];
    if (preferida.length) valores.sort((a, b) => {
      const rank = (v) => { const n = preferida.indexOf(normal(v)); return n < 0 ? preferida.length : n; };
      return rank(a) - rank(b);
    });
    const porGrupo = new Map(valores.map(v => [v, []]));
    for (const c of lista) porGrupo.get(String(c.extras?.[cg.id] || "")).push(c);
    return valores.map(v => [v, porGrupo.get(v)]).filter(([, l]) => l.length);
  }

  function diasDoHabito(c) {
    return `<span class="dias7" aria-label="Últimos 7 dias">${Leituras.ultimos7(c.feitos).map((d, k) => `<i class="${d.feito ? "feito" : ""} ${k === 6 ? "hoje" : ""}" title="${fmt.dataPorExtenso(d.iso)}${d.feito ? ", feito" : ""}">${d.dia}</i>`).join("")}</span>`;
  }

  function linhaContextual(c, tipo, detalhada) {
    const li = document.createElement("li");
    li.className = `registro-linha ${c.concluido ? "registro-concluido" : ""}`;
    li.dataset.itemId = c.id;
    const hoje = (c.feitos || []).includes(UI.hojeISO());
    const info = [];
    const extras = c.extras || {};
    const ordem = tipo === "habitos" ? ["frequencia", "duracaoMin", "duracao"] : tipo === "leituras" ? ["autor", "avaliacao"] : ["contexto", "prioridade"];
    for (const chave of ordem) {
      const f = campo(chave);
      if (!f || extras[chave] === undefined || extras[chave] === "") continue;
      const v = valorLegivel(f, extras[chave]);
      info.push(tipo === "habitos" && f.tipo === "number" ? `${fmt.escape(v)} min` : fmt.escape(v));
    }
    const visiveis = new Set([...ordem, campoGrupo()?.id]);
    for (const f of pilar.campos || []) {
      if (!f.naLista || visiveis.has(f.id) || f.tipo === "textarea") continue;
      const v = extras[f.id];
      if (v !== undefined && v !== "") info.push(linkDe(f, v) || fmt.escape(valorLegivel(f, v)));
    }
    const detalhes = (pilar.checkin && c.data ? `<div><dt>Data do registro</dt><dd>${fmt.escape(fmt.dataPorExtenso(c.data))}</dd></div>` : "") + (pilar.campos || []).filter((f) => extras[f.id] !== undefined && extras[f.id] !== "").map((f) => `<div><dt>${fmt.escape(f.rotulo)}</dt><dd>${linkDe(f, extras[f.id]) || fmt.escape(valorLegivel(f, extras[f.id]))}</dd></div>`).join("");
    const u = UI.urgencia(c.data);
    li.innerHTML = `
      ${pilar.checkin ? `<span class="registro-sinal ${hoje ? "marcado" : ""}" aria-hidden="true">${UI.icone(hoje ? "check" : "sol")}</span>` : `<input class="check" type="checkbox" data-concluir ${c.concluido ? "checked" : ""} aria-label="Concluir ${fmt.escape(c.descricao)}"/>`}
      <div class="registro-informacao"><h4>${fmt.escape(c.descricao)}</h4>${info.length ? `<div class="registro-apoio">${info.map((v) => `<span>${v}</span>`).join("")}</div>` : ""}
        ${detalhada && pilar.checkin ? `<div class="registro-historico">${diasDoHabito(c)}<span>${Leituras.sequencia(c.feitos) || 0} dias seguidos</span></div>` : ""}
      </div>
      ${!pilar.checkin && c.data ? `<span class="registro-prazo badge ${c.concluido ? "feito" : u.nivel}">${fmt.escape(c.concluido ? "concluído" : pilar.naAgenda ? u.rotulo : fmt.dataPorExtenso(c.data))}</span>` : ""}
      ${pilar.checkin ? `<button class="btn sm registro-marcar ${hoje ? "marcado" : ""}" data-hoje type="button" aria-pressed="${hoje}">${UI.icone(hoje ? "check" : "mais")}${hoje ? "Feito hoje" : "Marcar hoje"}</button>` : ""}
      <button class="registro-detalhes-toggle" data-detalhes type="button" aria-expanded="false" aria-controls="detalhes-item-${fmt.escape(c.id)}" aria-label="Detalhes de ${fmt.escape(c.descricao)}">Detalhes${UI.icone("abaixo")}</button>
        <div class="registro-detalhes-corpo" id="detalhes-item-${fmt.escape(c.id)}" hidden>${detalhes ? `<dl>${detalhes}</dl>` : `<p class="card-note">Você pode acrescentar informações ao editar.</p>`}
          <div class="registro-acoes"><button class="btn sm" data-editar type="button">${UI.icone("editar")}Editar</button><button class="btn ghost sm" data-excluir type="button">${UI.icone("lixeira")}Excluir</button></div>
        </div>`;
    li.querySelector("[data-detalhes]").addEventListener("click", (ev) => {
      const botao = ev.currentTarget;
      const corpo = li.querySelector(".registro-detalhes-corpo");
      corpo.hidden = !corpo.hidden;
      botao.setAttribute("aria-expanded", String(!corpo.hidden));
      if (!corpo.hidden) UI.animar(corpo, [{ opacity: .5 }, { opacity: 1 }], { tempo: "rapido" });
    });
    li.querySelector("[data-hoje]")?.addEventListener("click", () => marcarHoje(c));
    li.querySelector("[data-concluir]")?.addEventListener("change", (ev) => {
      Store.subAtualizar(CAMINHO, id, "itens", c.id, { concluido: ev.target.checked, concluidoEm: ev.target.checked ? UI.hojeISO() : "" });
      render();
    });
    li.querySelector("[data-editar]").addEventListener("click", () => editarItem(c));
    li.querySelector("[data-excluir]").addEventListener("click", () => excluirItem(c));
    return li;
  }

  function renderHistorico(L) {
    const bloco = $("historico-habitos");
    bloco.hidden = !pilar.checkin || !L.itens.length;
    $("historico-habitos-conteudo").innerHTML = pilar.checkin ? L.itens.map((c) => `<div class="historico-habito"><span>${fmt.escape(c.descricao)}</span>${diasDoHabito(c)}<span class="card-note">${Leituras.sequencia(c.feitos) || 0} dias seguidos</span></div>`).join("") : "";
  }

  /** Um campo formatado para ler (cartão, quadro, tabela); "" quando vazio. */
  function valorLegivel(campo, v) {
    if (v === undefined || v === null || v === "") return "";
    if (campo.tipo === "simNao") return v ? "sim" : "não";
    if (campo.tipo === "dinheiro") return fmt.moeda(v);
    if (campo.tipo === "number") return fmt.decimal(v, Number.isInteger(Number(v)) ? 0 : 1);
    if (campo.tipo === "date") return fmt.dataPorExtenso(v);
    if (campo.tipo === "estrelas") return `${"★".repeat(Number(v))}${"☆".repeat(5 - Number(v))}`;
    if (campo.tipo === "link") { try { return new URL(v).hostname.replace(/^www\./, ""); } catch { return ""; } }
    if (campo.tipo === "select") return fmt.capitalizar(String(v));
    return String(v);
  }

  /** Link de um campo "link", só http(s) — o resto vira texto. */
  function linkDe(campo, v) {
    if (campo.tipo !== "link" || !/^https?:\/\//i.test(String(v || ""))) return "";
    return `<a href="${fmt.escape(v)}" target="_blank" rel="noopener noreferrer">${fmt.escape(valorLegivel(campo, v))}</a>`;
  }

  function cartaoItem(c) {
    const rotina = ehRotinaAlimentar(c);
    const el = document.createElement("article");
    el.dataset.itemId = c.id;
    el.className = `pilar-cartao ${c.concluido ? "feito" : ""}`;
    const u = UI.urgencia(c.data);
    const linhas = (pilar.campos || []).map((campo) => {
      const v = (c.extras || {})[campo.id];
      const txt = linkDe(campo, v) || fmt.escape(valorLegivel(campo, v));
      if (!txt || campo.tipo === "textarea") return "";
      return `<div><dt>${fmt.escape(campo.rotulo)}</dt><dd class="${campo.tipo === "estrelas" ? "estrelas-txt" : ""}">${txt}</dd></div>`;
    }).filter(Boolean).join("");
    const nota = (pilar.campos || []).find((campo) => campo.tipo === "textarea" && (c.extras || {})[campo.id]);
    el.innerHTML = `
      <header>
        ${rotina ? `<span class="badge">Rotina</span>` : pilar.checkin ? "" : `<input type="checkbox" class="check" ${c.concluido ? "checked" : ""} aria-label="Marcar como concluído" />`}
        ${UI.marcaItem({ glifo: pilar.icone, classe: "pequena", nivel: c.concluido ? "feito" : "" })}
        <h4 class="${c.concluido ? "strike" : ""}">${fmt.escape(c.descricao)}</h4>
        <span class="row-actions">
          <button class="btn ghost sm icon" data-editar title="Editar" aria-label="Editar">${UI.icone("editar")}</button>
          <button class="btn ghost sm icon" data-excluir title="Excluir" aria-label="Excluir">${UI.icone("lixeira")}</button>
        </span>
      </header>
      ${linhas ? `<dl>${linhas}</dl>` : ""}
      ${nota ? `<p class="pilar-cartao-nota">${fmt.escape(String(nota && c.extras[nota.id]).slice(0, 220))}</p>` : ""}
      <footer>
        ${rotina ? `<span class="card-note">Check por data em Alimentação de rotina</span>` : c.data ? `<span class="badge ${c.concluido ? "feito" : pilar.naAgenda ? u.nivel : "futuro"}">${c.concluido ? "concluído" : pilar.naAgenda ? u.rotulo : fmt.dataPorExtenso(c.data)}</span>` : c.concluido ? `<span class="badge feito">concluído</span>` : ""}
        ${pilar.checkin ? `<span class="card-note">${Leituras.sequencia(c.feitos) || 0} ${Leituras.sequencia(c.feitos) === 1 ? "dia seguido" : "dias seguidos"}</span><button class="btn sm ${(c.feitos || []).includes(UI.hojeISO()) ? "marcado" : ""}" type="button" data-hoje>${(c.feitos || []).includes(UI.hojeISO()) ? "Feito hoje" : "Hoje"}</button>` : ""}
      </footer>`;
    el.querySelector("input.check")?.addEventListener("change", (ev) => {
      Store.subAtualizar(CAMINHO, id, "itens", c.id, { concluido: ev.target.checked, concluidoEm: ev.target.checked ? UI.hojeISO() : "" });
      render();
    });
    el.querySelector("[data-hoje]")?.addEventListener("click", () => marcarHoje(c));
    el.querySelector("[data-editar]").addEventListener("click", () => editarItem(c));
    el.querySelector("[data-excluir]").addEventListener("click", () => excluirItem(c));
    return el;
  }

  /**
   * Quadro: uma coluna por opção do campo de agrupar (ou "em aberto" e
   * "concluídos"). Arrastar muda o valor; no toque, o "Mover para" faz o mesmo.
   */
  function renderQuadro(box, visiveis) {
    const cg = campoGrupo();
    const colunas = cg
      ? [...cg.opcoes.map((o) => [o, fmt.capitalizar(o)]), ["", `Sem ${cg.rotulo.toLowerCase()}`]]
      : [["aberto", "Em aberto"], ["feito", "Concluídos"]];
    const colunaDe = (c) => (cg ? ((c.extras || {})[cg.id] || "") : c.concluido ? "feito" : "aberto");
    const mover = (c, destino) => {
      if (colunaDe(c) === destino) return;
      const patch = cg ? { extras: { ...(c.extras || {}), [cg.id]: destino } } : { concluido: destino === "feito", concluidoEm: destino === "feito" ? UI.hojeISO() : "" };
      Store.subAtualizar(CAMINHO, id, "itens", c.id, patch);
      render();
    };
    const quadro = document.createElement("div");
    quadro.className = "quadro";
    colunas.forEach(([valor, titulo]) => {
      const doGrupo = visiveis.filter((c) => colunaDe(c) === valor);
      if (valor === "" && !doGrupo.length) return; // "Sem …" só aparece se houver
      const col = document.createElement("section");
      col.className = "quadro-coluna";
      col.dataset.coluna = valor;
      col.innerHTML = `<h3>${fmt.escape(titulo)} <span>${doGrupo.length}</span></h3><div class="quadro-cartoes"></div>`;
      const lista = col.querySelector(".quadro-cartoes");
      doGrupo.forEach((c) => {
        const k = document.createElement("article");
        k.className = `quadro-cartao ${c.concluido ? "feito" : ""}`;
        k.draggable = true;
        k.dataset.item = c.id;
        const meta = metaLista(c);
        k.innerHTML = `
          <button type="button" class="quadro-titulo" data-editar>${fmt.escape(c.descricao)}</button>
          ${meta !== "sem detalhes" ? `<span class="meta">${meta}</span>` : ""}
          <label class="quadro-mover"><span class="hidden">Mover para</span>
            <select aria-label="Mover para">${colunas.map(([v, t]) => `<option value="${fmt.escape(v)}" ${v === valor ? "selected" : ""}>${fmt.escape(t)}</option>`).join("")}</select>
          </label>`;
        k.querySelector("[data-editar]").addEventListener("click", () => editarItem(c));
        k.querySelector("select").addEventListener("change", (ev) => mover(c, ev.target.value));
        k.addEventListener("dragstart", (ev) => { ev.dataTransfer.setData("text/plain", c.id); ev.dataTransfer.effectAllowed = "move"; k.classList.add("arrastando"); });
        k.addEventListener("dragend", () => k.classList.remove("arrastando"));
        lista.appendChild(k);
      });
      col.addEventListener("dragover", (ev) => { ev.preventDefault(); col.classList.add("alvo"); });
      col.addEventListener("dragleave", (ev) => { if (!col.contains(ev.relatedTarget)) col.classList.remove("alvo"); });
      col.addEventListener("drop", (ev) => {
        ev.preventDefault();
        col.classList.remove("alvo");
        const c = visiveis.find((x) => x.id === ev.dataTransfer.getData("text/plain"));
        if (c) mover(c, valor);
      });
      quadro.appendChild(col);
    });
    box.appendChild(quadro);
    if (!cg && (pilar.campos || []).some((c) => c.tipo === "select")) {
      const dica = document.createElement("p");
      dica.className = "card-note";
      dica.style.marginTop = "12px";
      dica.textContent = "Escolha um campo para agrupar (em Personalizar) e o quadro ganha uma coluna por opção.";
      box.appendChild(dica);
    }
  }

  /** Tabela: todos os campos lado a lado; o cabeçalho ordena. */
  function renderTabela(box, visiveis) {
    const porId = new Map(visiveis.map(c => [c.id, c]));
    const cols = [
      { chave: "descricao", rotulo: fmt.capitalizar(rotulo()) },
      ...(pilar.checkin ? [] : [{ chave: "data", rotulo: "Data", tipo: "date" }]),
      ...(pilar.campos || []).filter((c) => c.tipo !== "textarea").map((c) => ({ chave: c.id, rotulo: c.rotulo, tipo: c.tipo, campo: c })),
    ];
    const linhas = tabelaOrdem ? [...visiveis].sort((a, b) => comparar(a, b, tabelaOrdem.chave, tabelaOrdem.asc)) : visiveis;
    const numerico = (t) => ["number", "dinheiro", "estrelas"].includes(t);
    box.innerHTML = `
      <div class="tabela-rolagem">
        <table class="tabela-pilar">
          <thead><tr>
            <th class="col-check"><span class="hidden">Concluído</span></th>
            ${cols.map((c) => `<th class="${numerico(c.tipo) ? "num" : ""}"><button type="button" data-ordenar="${fmt.escape(c.chave)}" aria-sort="${tabelaOrdem?.chave === c.chave ? (tabelaOrdem.asc ? "ascending" : "descending") : "none"}">${fmt.escape(c.rotulo)}${tabelaOrdem?.chave === c.chave ? (tabelaOrdem.asc ? " ↑" : " ↓") : ""}</button></th>`).join("")}
          </tr></thead>
          <tbody>${linhas.map((c) => `<tr data-item="${fmt.escape(c.id)}" class="${c.concluido ? "feito" : ""}">
            <td class="col-check">${ehRotinaAlimentar(c) ? `<span class="badge">Rotina</span>` : `<input type="checkbox" class="check" ${c.concluido ? "checked" : ""} aria-label="Marcar como concluído" />`}</td>
            ${cols.map((col) => {
              if (col.chave === "descricao") return `<td><button type="button" class="tabela-nome" data-editar>${fmt.escape(c.descricao)}</button></td>`;
              if (col.chave === "data") return `<td class="num">${c.data ? fmt.escape(fmt.data(c.data)) : ""}</td>`;
              const v = (c.extras || {})[col.chave];
              return `<td class="${numerico(col.tipo) ? "num" : ""}">${linkDe(col.campo, v) || fmt.escape(valorLegivel(col.campo, v))}</td>`;
            }).join("")}
          </tr>`).join("")}</tbody>
        </table>
      </div>`;
    box.querySelectorAll("[data-ordenar]").forEach((b) => b.addEventListener("click", () => {
      const chave = b.dataset.ordenar;
      tabelaOrdem = tabelaOrdem?.chave === chave ? (tabelaOrdem.asc ? { chave, asc: false } : null) : { chave, asc: true };
      renderTabela(box, visiveis);
    }));
    box.querySelectorAll("tbody tr").forEach((tr) => {
      const c = porId.get(tr.dataset.item);
      tr.querySelector("[data-editar]").addEventListener("click", () => editarItem(c));
      tr.querySelector("input.check")?.addEventListener("change", (ev) => {
        Store.subAtualizar(CAMINHO, id, "itens", c.id, { concluido: ev.target.checked, concluidoEm: ev.target.checked ? UI.hojeISO() : "" });
        render();
      });
    });
  }

  /** Calendário do mês só com os registros desta aba; tocar num dia vazio cria um nele. */
  function renderCalendario(box, visiveis) {
    if (!mesCal) { const h = new Date(); mesCal = { ano: h.getFullYear(), mes: h.getMonth() }; }
    const { ano, mes } = mesCal;
    const semanaComeca = Number(UI.experiencia().semanaComeca ?? 1);
    const dias = Calendario.gradeDoMes(ano, mes, semanaComeca);
    const porDia = {};
    visiveis.forEach((c) => { if (c.data) (porDia[c.data] = porDia[c.data] || []).push(c); });
    const semData = visiveis.filter((c) => !c.data && !c.concluido).length;
    const hoje = UI.hojeISO();
    const nomes = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    const nomeMes = new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    box.innerHTML = `
      <div class="cal-topo">
        <div class="mes-nav cal-nav">
          <button type="button" class="btn ghost sm icon" data-cal="-1" aria-label="Mês anterior">‹</button>
          <strong class="cal-mes">${fmt.escape(fmt.capitalizar(nomeMes))}</strong>
          <button type="button" class="btn ghost sm icon" data-cal="1" aria-label="Próximo mês">›</button>
          <button type="button" class="btn ghost sm" data-cal="hoje">Hoje</button>
        </div>
        ${semData ? `<span class="card-note">${semData} sem data (aparecem nas outras vistas)</span>` : ""}
      </div>
      <div class="cal-grade compacta">
        ${Array.from({ length: 7 }, (_, i) => `<div class="cal-semana">${nomes[(semanaComeca + i) % 7]}</div>`).join("")}
        ${dias.map((d) => {
          const l = porDia[d.iso] || [];
          return `<div class="cal-dia ${d.doMes ? "" : "fora"} ${d.iso === hoje ? "hoje" : ""} ${d.semana === 0 || d.semana === 6 ? "fds" : ""}" data-dia="${d.iso}" role="button" tabindex="0" aria-label="${fmt.escape(fmt.dataPorExtenso(d.iso))}${l.length ? `, ${l.length}` : ""}">
            <span class="cal-num">${d.dia}</span>
            <span class="cal-itens">${l.slice(0, 3).map((c) => `<span class="cal-item ${c.concluido ? "feito" : ""}" data-item="${fmt.escape(c.id)}" style="--c:${fmt.escape(pilar.cor)}">${fmt.escape(c.descricao)}</span>`).join("")}${l.length > 3 ? `<span class="cal-mais">+${l.length - 3}</span>` : ""}</span>
            ${l.length ? `<span class="cal-pontos">${l.slice(0, 4).map(() => `<i style="--c:${fmt.escape(pilar.cor)}"></i>`).join("")}</span>` : ""}
          </div>`;
        }).join("")}
      </div>`;
    box.querySelectorAll("[data-cal]").forEach((b) => b.addEventListener("click", () => {
      const v = b.dataset.cal;
      if (v === "hoje") mesCal = null;
      else { const d = new Date(ano, mes + Number(v), 1); mesCal = { ano: d.getFullYear(), mes: d.getMonth() }; }
      renderCalendario(box, visiveis);
    }));
    box.querySelectorAll(".cal-dia").forEach((cel) => {
      const abrir = (ev) => {
        const alvo = ev.target.closest("[data-item]");
        const l = porDia[cel.dataset.dia] || [];
        if (alvo) return editarItem(l.find((c) => c.id === alvo.dataset.item));
        if (l.length === 1 && !mob()) return editarItem(l[0]);
        if (l.length) return escolherNoDia(cel.dataset.dia, l);
        novoItem(cel.dataset.dia);
      };
      cel.addEventListener("click", abrir);
      cel.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); abrir(ev); } });
    });
  }
  const mob = () => window.matchMedia("(max-width: 700px)").matches;

  function escolherNoDia(iso, lista) {
    UI.abrirModal(`
      <div class="modal-head"><h2 class="modal-title">${fmt.escape(fmt.capitalizar(UI.dataPorExtensoCurta(iso)))}</h2></div>
      <div class="modal-body"><ul class="lembretes">${lista.map((c, n) => `<li><span class="lembrete-selo" style="--c:${fmt.escape(pilar.cor)}"></span>
        <span class="grow"><span class="t ${c.concluido ? "strike" : ""}">${fmt.escape(c.descricao)}</span><span class="m">${metaLista(c)}</span></span>
        <button type="button" class="btn ghost sm" data-n="${n}">Abrir</button></li>`).join("")}</ul></div>
      <div class="modal-foot"><span class="modal-foot-espaco"></span><button class="btn" type="button" data-acao="fechar">Fechar</button><button class="btn primary" type="button" data-acao="novo">+ ${fmt.escape(fmt.capitalizar(rotulo()))} neste dia</button></div>`, {
      classe: "formulario",
      aoMontar(modal, fechar) {
        modal.querySelector('[data-acao="fechar"]').addEventListener("click", () => fechar(null));
        modal.querySelector('[data-acao="novo"]').addEventListener("click", () => { fechar(null); novoItem(iso); });
        modal.querySelectorAll("[data-n]").forEach((b) => b.addEventListener("click", () => { fechar(null); editarItem(lista[Number(b.dataset.n)]); }));
      },
    });
  }

  /** "Layout e exibição": vista ao abrir, ordem e o que a página mostra. */
  async function abrirLayout() {
    const v = visual();
    const r = await UI.formulario({
      titulo: "Layout e exibição",
      configuracao: true,
      descricao: `Como ${pilar.nome} aparece. Nada do que está cadastrado muda.`,
      icone: UI.icone("ajustes"),
      cor: pilar.cor,
      campos: [
        { nome: "vista", rotulo: "Como ver os registros", tipo: "vistas", opcoes: opcoesVista() },
        { nome: "ordem", rotulo: "Ordenar", tipo: "select", opcoes: opcoesOrdem().map(([valor, rot]) => ({ valor, rotulo: rot })) },
        { nome: "_s", rotulo: "O que a página mostra", tipo: "secao" },
        { nome: "leitura", rotulo: "Leitura", tipo: "simNao", rotuloMarcado: "A leitura do Delfos na seção Visão geral" },
        { nome: "numeros", rotulo: "Números", tipo: "simNao", rotuloMarcado: "A faixa de números" },
        { nome: "lateral", rotulo: "Análises", tipo: "simNao", rotuloMarcado: "Observações e resumos na seção Visão geral" },
        { nome: "perguntas", rotulo: "Perguntas", tipo: "simNao", rotuloMarcado: "Perguntas do Delfos" },
        ...(pilar.checkin ? [] : [
          { nome: "_s2", rotulo: "Agenda", tipo: "secao" },
          { nome: "naAgenda", rotulo: "Agenda e lembretes", tipo: "simNao", rotuloMarcado: "Os registros com data entram na agenda, no calendário da aba Pessoal e nos lembretes" },
        ]),
      ],
      valores: { ...v, naAgenda: !!pilar.naAgenda },
      rotuloConfirmar: "Aplicar",
    });
    if (!r) return;
    const { naAgenda, _s, _s2, ...resto } = r;
    Store.atualizar(CAMINHO, id, { visual: { ...v, ...resto }, ...(pilar.checkin ? {} : { naAgenda: !!naAgenda }) });
    UI.toast("Layout aplicado.");
    render();
  }

  function linhaItem(c) {
    const li = document.createElement("li");
    li.dataset.itemId = c.id;
    const u = UI.urgencia(c.data);
    const acoes = `
      <span class="row-actions ${pilar.checkin ? "fixas" : ""}">
        <button class="btn ghost sm icon" data-editar title="Editar" aria-label="Editar">${UI.icone("editar")}</button>
        <button class="btn ghost sm icon" data-excluir title="Excluir" aria-label="Excluir">${UI.icone("lixeira")}</button>
      </span>`;
    if (pilar.checkin) {
      const dias = Leituras.ultimos7(c.feitos);
      const seq = Leituras.sequencia(c.feitos);
      const hoje = (c.feitos || []).includes(UI.hojeISO());
      li.innerHTML = `
        ${UI.marcaItem({ glifo: pilar.icone, nivel: hoje ? "feito" : "" })}
        <span class="grow">
          <span class="title">${fmt.escape(c.descricao)}</span>
          <span class="meta">${metaLista(c)}</span>
        </span>
        <span class="dias7" aria-label="Últimos 7 dias">${dias.map((d, k) => `<i class="${d.feito ? "feito" : ""} ${k === 6 ? "hoje" : ""}" title="${fmt.dataPorExtenso(d.iso)}${d.feito ? ", feito" : ""}">${d.dia}</i>`).join("")}</span>
        <span class="seq">${seq ? `${seq} ${seq === 1 ? "dia" : "dias"}` : ""}</span>
        <button class="btn sm ${hoje ? "marcado" : ""}" type="button" data-hoje aria-pressed="${hoje}">${hoje ? "Feito hoje" : "Hoje"}</button>
        ${acoes}`;
      li.querySelector("[data-hoje]").addEventListener("click", () => marcarHoje(c));
    } else {
      const rotina = ehRotinaAlimentar(c);
      const badge = rotina ? `<span class="badge">Rotina</span>` : pilar.naAgenda && c.data
        ? `<span class="badge ${c.concluido ? "feito" : u.nivel}">${c.concluido ? "concluído" : u.rotulo}</span>`
        : c.concluido ? `<span class="badge feito">concluído</span>` : "";
      // A marca: a data, quando a aba é de agenda; senão, o ícone da aba.
      const marca = rotina ? UI.marcaItem({ glifo: pilar.icone }) : pilar.naAgenda && c.data
        ? UI.marcaItem({ data: c.data, nivel: c.concluido ? "feito" : ["atrasado", "hoje", "urgente"].includes(u.nivel) ? u.nivel : "" })
        : UI.marcaItem({ glifo: pilar.icone, nivel: c.concluido ? "feito" : "" });
      li.innerHTML = `
        ${rotina ? "" : `<input type="checkbox" class="check" ${c.concluido ? "checked" : ""} aria-label="Marcar como concluído" />`}
        ${marca}
        <span class="grow">
          <span class="title ${c.concluido ? "strike" : ""}">${fmt.escape(c.descricao)}</span>
          <span class="meta">${metaLista(c)}</span>
        </span>
        ${badge}
        ${acoes}`;
      li.querySelector("input")?.addEventListener("change", (ev) => {
        Store.subAtualizar(CAMINHO, id, "itens", c.id, { concluido: ev.target.checked, concluidoEm: ev.target.checked ? UI.hojeISO() : "" });
        render();
      });
    }
    li.querySelector("[data-editar]").addEventListener("click", () => editarItem(c));
    li.querySelector("[data-excluir]").addEventListener("click", () => excluirItem(c));
    return li;
  }

  function marcarHoje(c) {
    const hoje = UI.hojeISO();
    const feitos = new Set(c.feitos || []);
    const marcou = !feitos.has(hoje);
    marcou ? feitos.add(hoje) : feitos.delete(hoje);
    try {
      Store.subAtualizar(CAMINHO, id, "itens", c.id, { feitos: [...feitos].sort() });
    } catch {
      UI.toast("Não foi possível guardar a marcação. Tente novamente.");
      return;
    }
    render();
    const item = [...$("lista").querySelectorAll("[data-item-id]")].find((n) => n.dataset.itemId === c.id);
    const botao = item?.querySelector("[data-hoje]");
    if (botao) UI.animar(botao, [{ transform: "scale(.96)", opacity: .7 }, { transform: "scale(1)", opacity: 1 }], { tempo: "rapido" });
    const dia = item?.querySelector(".dias7 .hoje");
    if (dia) UI.animar(dia, [{ opacity: .5 }, { opacity: 1 }], { tempo: "rapido" });
    if (marcou) {
      const seq = Leituras.sequencia([...feitos]);
      UI.toast(seq >= 2 ? `${c.descricao}: ${seq} dias seguidos.` : `${c.descricao}: marcado hoje.`);
    }
  }

  /** Os campos próprios marcados "na lista", formatados, mais a data se houver. */
  function metaLista(c) {
    const cg = campoGrupo();
    const partes = (pilar.campos || [])
      .filter((campo) => campo.naLista && campo.id !== cg?.id)
      .map((campo) => {
        const v = (c.extras || {})[campo.id];
        if (v === undefined || v === null || v === "") return "";
        if (campo.tipo === "simNao") return v ? campo.rotulo : "";
        if (campo.tipo === "dinheiro") return fmt.moeda(v);
        if (campo.tipo === "number") return `${campo.rotulo.replace(/\s*\(.*\)$/, "")}: ${fmt.decimal(v, Number.isInteger(Number(v)) ? 0 : 1)}${/\((.*)\)$/.test(campo.rotulo) ? ` ${campo.rotulo.match(/\((.*)\)$/)[1]}` : ""}`;
        if (campo.tipo === "date") return fmt.dataPorExtenso(v);
        if (campo.tipo === "estrelas") return `${"★".repeat(Number(v))}${"☆".repeat(5 - Number(v))}`;
        if (campo.tipo === "link") { try { return new URL(v).hostname.replace(/^www\./, ""); } catch { return ""; } }
        if (campo.tipo === "time") return `às ${v}`;
        return String(v);
      })
      .filter(Boolean)
      .map(fmt.escape);
    if (c.data) partes.push(fmt.escape(fmt.dataPorExtenso(c.data)));
    return partes.join(", ") || "sem detalhes";
  }

  // Um cartão por campo que dá para resumir: distribuição das listas de
  // opções, soma e média dos números, o que entrou em dinheiro.
  function renderResumos(L) {
    const box = $("resumos-campos");
    box.innerHTML = "";
    // O puxador diz o primeiro resumo em palavras; sem campo para resumir, a gaveta some.
    const r0 = L.resumoCampos[0];
    box.closest(".pagina-bloco").hidden = !r0;
    if (r0) {
      $("campos-resumo").textContent =
        r0.tipo === "distribuicao" ? `Por ${r0.campo.rotulo.toLowerCase()}: ${r0.linhas.slice(0, 3).map((l) => `${l.valor} ${l.nome}`).join(", ")}`
        : r0.tipo === "numero" ? `${r0.campo.rotulo}: média ${fmt.decimal(r0.media)}`
        : r0.tipo === "dinheiro" ? `${r0.campo.rotulo}: ${fmt.moeda(r0.noMes)} este mês`
        : `${r0.campo.rotulo}: ${r0.sim} de ${r0.n}`;
    }
    L.resumoCampos.slice(0, 3).forEach((r) => {
      const card = document.createElement("section");
      card.className = "card";
      if (r.tipo === "distribuicao") {
        card.innerHTML = `<div class="card-head"><h2 class="card-title">Por ${fmt.escape(r.campo.rotulo.toLowerCase())}</h2></div><div></div>`;
        UI.barrasComMeta(card.lastChild, r.linhas.map((l) => ({ nome: fmt.capitalizar(l.nome), valor: l.valor })), { cor: pilar.cor, formatar: (v) => String(v) });
      } else if (r.tipo === "numero") {
        card.innerHTML = `<div class="card-head"><h2 class="card-title">${fmt.escape(r.campo.rotulo)}</h2></div>
          <div class="mini-stats" style="margin:0;"><div><div class="stat-label">Média</div><div class="mini-valor">${fmt.decimal(r.media)}</div></div><div><div class="stat-label">Total</div><div class="mini-valor">${fmt.decimal(r.total, Number.isInteger(r.total) ? 0 : 1)}</div></div><div><div class="stat-label">Maior</div><div class="mini-valor">${fmt.decimal(r.max, Number.isInteger(r.max) ? 0 : 1)}</div></div></div>`;
      } else if (r.tipo === "dinheiro") {
        card.innerHTML = `<div class="card-head"><h2 class="card-title">${fmt.escape(r.campo.rotulo)}</h2></div>
          <div class="mini-stats" style="margin:0;"><div><div class="stat-label">Este mês</div><div class="mini-valor">${fmt.moeda(r.noMes)}</div></div><div><div class="stat-label">Mês passado</div><div class="mini-valor">${fmt.moeda(r.antes)}</div></div><div><div class="stat-label">Total</div><div class="mini-valor">${fmt.moeda(r.total)}</div></div></div>`;
      } else if (r.tipo === "simNao") {
        card.innerHTML = `<div class="card-head"><h2 class="card-title">${fmt.escape(r.campo.rotulo)}</h2></div><p class="card-note" style="margin:0; font-size:calc(14.5px * var(--escala-fonte, 1)); color:var(--texto-2);">${r.sim} de ${r.n} ${r.n === 1 ? rotulo() : Leituras.pluralizar(rotulo())}.</p>`;
      }
      box.appendChild(card);
    });
  }

  function perguntas(L) {
    const q = [];
    if (!L.itens.length) return q;
    if (!pilar.meta) q.push({
      id: "meta",
      texto: `Quer uma meta para ${pilar.nome}?`,
      apoio: pilar.checkin ? "Por exemplo, quantas marcações por semana. O Delfos mostra se o ritmo está bom." : `Por exemplo, quantos ${Leituras.pluralizar(rotulo())} concluir por mês ou por ano.`,
      controle: () => UI.resposta.botoes([["Definir meta", abrirPersonalizar, true]]),
    });
    const select = (pilar.campos || []).find((c) => c.tipo === "select");
    if (!pilar.agruparPor && select) q.push({
      id: `agrupar:${select.id}`,
      texto: `Agrupar a lista por ${select.rotulo.toLowerCase()}?`,
      apoio: `Os ${Leituras.pluralizar(rotulo())} ficam separados por ${select.opcoes.slice(0, 3).join(", ")}, com filtro no alto da lista.`,
      controle: () => UI.resposta.botoes([["Agrupar", () => { Store.atualizar(CAMINHO, id, { agruparPor: select.id }); render(); }, true]]),
    });
    return q;
  }

  async function abrirPersonalizar() {
    await UI.abrirCriadorDeAbas({ pilar });
    render();
  }

  /* -------------------------------- Academia --------------------------------
     Modelo "academia": em vez de uma lista de itens com campos, a aba vira
     dias de treino, cada um com exercícios escolhidos do catálogo
     (exercicios.js). O Delfos nunca decide o que treinar — só guarda o que o
     usuário decidiu: carga atual, séries, repetições e recorde de cada
     exercício. Ver Store.ACADEMIA_* e sugerirDivisaoAcademia/diasSugeridosAcademia
     em store.js para a lógica (baseada em evidência) por trás da sugestão de
     divisão — o usuário sempre pode escolher outra coisa. */

  const dias = () => (Store.achar(CAMINHO, id) || {}).dias || [];

  const catalogoOpcoes = () =>
    [...EXERCICIOS]
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"))
      .map((e) => ({ valor: e.id, rotulo: `${e.grupo}: ${e.nome}` }));

  const nomeExercicio = (exercicioId) => EXERCICIOS.find((e) => e.id === exercicioId)?.nome || "Exercício removido do catálogo";
  const grupoExercicio = (exercicioId) => EXERCICIOS.find((e) => e.id === exercicioId)?.grupo || "";

  function salvarDias(novosDias) {
    Store.atualizar(CAMINHO, id, { dias: novosDias });
    render();
  }

  /**
   * Quantas séries por grupo muscular já estão cadastradas — soma o campo
   * "Séries" de cada exercício, agrupado pelo grupo do catálogo. Não é uma
   * meta nem uma recomendação (o Delfos não prescreve treino): é só juntar,
   * por grupo, o que o usuário já anotou exercício a exercício.
   */
  function calcularSeriesPorGrupo(lista) {
    const somas = {};
    lista.forEach((dia) => {
      dia.exercicios.forEach((ex) => {
        const grupo = grupoExercicio(ex.exercicioId);
        if (!grupo || !ex.seriesAtual) return;
        somas[grupo] = (somas[grupo] || 0) + Number(ex.seriesAtual);
      });
    });
    return somas;
  }

  function renderResumoGrupos(box, lista) {
    const somas = calcularSeriesPorGrupo(lista);
    const grupos = Object.keys(somas).sort((a, b) => a.localeCompare(b, "pt-BR"));
    if (!grupos.length) return;
    const card = document.createElement("div");
    card.className = "card";
    card.style.marginBottom = "12px";
    card.innerHTML = `
      <h3 class="card-title" style="margin-bottom:10px;">Séries por grupo muscular</h3>
      <p class="card-note" style="margin:0 0 10px;">
        Soma das séries de cada exercício cadastrado nos dias abaixo. Não é meta nem recomendação,
        só o que já está anotado.
      </p>
      <div class="assistente-resumo"><dl>${grupos
        .map((g) => `<dt>${fmt.escape(g)}</dt><dd>${somas[g]} ${somas[g] === 1 ? "série" : "séries"}</dd>`)
        .join("")}</dl></div>`;
    box.appendChild(card);
  }

  function renderEvolucaoAcademia(lista) {
    const nEx = lista.reduce((n, d) => n + (d.exercicios || []).length, 0);
    const series = Object.values(calcularSeriesPorGrupo(lista)).reduce((n, v) => n + v, 0);
    const stats = $("bloco-stats");
    stats.classList.remove("hidden");
    stats.classList.add("academia-indicadores");
    const inicio = UI.isoMaisDias(-6), hoje = UI.hojeISO();
    const sessoes = lista.reduce((s, d) => s + new Set((d.feitos || []).filter(iso => iso >= inicio && iso <= hoje)).size, 0);
    stats.innerHTML = [["Dias de treino", lista.length], ["Exercícios", nEx], ["Séries cadastradas", series], ["Sessões nos últimos 7 dias", sessoes]].map(([rotulo, valor]) =>
      `<div class="card"><div class="stat-label">${rotulo}</div><div class="stat-value num">${valor}</div></div>`).join("");
    const resumos = $("resumos-campos");
    resumos.innerHTML = "";
    resumos.closest(".pagina-bloco").hidden = false;
    resumos.closest(".pagina-bloco").querySelector(".bloco-titulo").textContent = "Seu treino em números";
    $("campos-resumo").textContent = "Exercícios cadastrados e sessões que você marcou";
    $("coluna-lado").hidden = false;
    $("coluna-lado").classList.add("academia-evolucao");
    $("notas").closest(".pagina-bloco").hidden = true;
    renderResumoGrupos(resumos, lista);
    const historico = document.createElement("div");
    historico.className = "academia-historico";
    historico.innerHTML = `<h3 class="section-title">Checks dos últimos sete dias</h3><ul class="list">${lista.map(d => `<li><span class="grow">${fmt.escape(d.nome)}</span>${diasDoHabito(d)}</li>`).join("")}</ul>`;
    resumos.append(historico);
    if (!resumos.children.length) resumos.appendChild(UI.vazio({
      icone: "haltere", titulo: "Acompanhe seu treino aqui",
      texto: "Cadastre os exercícios e as séries em Treinos para ver a distribuição por grupo muscular.",
    }));
  }

  function renderAcademia() {
    const box = document.getElementById("academia-conteudo");
    box.innerHTML = "";
    const diasCadastrados = pilar.dias || [];
    renderEvolucaoAcademia(diasCadastrados);
    const nEx = diasCadastrados.reduce((t, d) => t + (d.exercicios || []).length, 0);
    document.getElementById("academia-resumo").textContent = !pilar.academia?.configuradoEm ? "Falta o questionário inicial"
      : diasCadastrados.length ? `${diasCadastrados.length === 1 ? "1 dia" : `${diasCadastrados.length} dias`}, ${nEx === 1 ? "1 exercício" : `${nEx} exercícios`}: ${diasCadastrados.map((d) => d.nome).join(", ")}`
      : "Nenhum dia de treino ainda";

    if (!pilar.academia?.configuradoEm) {
      box.appendChild(
        UI.vazio({
          icone: pilar.icone,
          titulo: "Antes de começar",
          texto: "Um questionário rápido (objetivo, experiência e frequência semanal) só para sugerir como organizar seus dias de treino. Você monta o que entra em cada um, escolhendo do catálogo de exercícios.",
          rotuloAcao: "Começar",
          aoAcionar: () => abrirQuestionario({ primeiraVez: true }),
        })
      );
      return;
    }

    const lista = dias();
    if (!lista.length) {
      box.appendChild(
        UI.vazio({
          icone: pilar.icone,
          titulo: "Nenhum dia de treino ainda",
          texto: "Crie um dia (ex.: \"Peito e tríceps\") e adicione os exercícios que você faz nele.",
          rotuloAcao: "+ Dia de treino",
          aoAcionar: abrirNovoDia,
        })
      );
      return;
    }

    lista.forEach((dia) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.marginBottom = "12px";
      card.innerHTML = `
        <div class="card-head dia-cab">
          ${UI.marcaItem({ icone: "haltere" })}
          <h3 class="card-title">${fmt.escape(dia.nome)}<small>${dia.exercicios.length} ${dia.exercicios.length === 1 ? "exercício" : "exercícios"}</small></h3>
          <span class="row-actions" style="opacity:1;">
            <button class="btn sm ${(dia.feitos || []).includes(UI.hojeISO()) ? "marcado" : ""}" type="button" data-treinei aria-pressed="${(dia.feitos || []).includes(UI.hojeISO())}">${(dia.feitos || []).includes(UI.hojeISO()) ? "Treino feito hoje" : "Treinei hoje"}</button>
            <button class="btn ghost sm" data-renomear>Renomear</button>
            <button class="btn ghost sm" data-excluir-dia>Excluir dia</button>
          </span>
        </div>
        <div data-lista-exercicios></div>
        <button class="btn ghost sm" data-add-exercicio style="margin-top:10px;">+ Exercício</button>`;

      const listaEx = card.querySelector("[data-lista-exercicios]");
      if (!dia.exercicios.length) {
        listaEx.innerHTML = `<p class="card-note" style="margin:6px 0 0;">Nenhum exercício ainda.</p>`;
      } else {
        const ul = document.createElement("ul");
        ul.className = "list";
        dia.exercicios.forEach((ex) => {
          const li = document.createElement("li");
          li.innerHTML = `
            <span class="grow">
              <span class="title">${fmt.escape(nomeExercicio(ex.exercicioId))}</span>
              <span class="item-info">${[
                UI.info(fmt.escape(grupoExercicio(ex.exercicioId))),
                ex.seriesAtual || ex.repeticoesAtual ? UI.info(`${fmt.escape(String(ex.seriesAtual || "-"))}x${fmt.escape(String(ex.repeticoesAtual || "-"))}`) : "",
                ex.cargaAtual !== null && ex.cargaAtual !== undefined ? UI.info(`carga ${fmt.escape(String(ex.cargaAtual))}${fmt.escape(ex.unidade || "")}`) : "",
                ex.recorde !== null && ex.recorde !== undefined ? UI.info(`recorde ${fmt.escape(String(ex.recorde))}${fmt.escape(ex.unidade || "")}`, "bem") : "",
              ].join("")}</span>
            </span>
            <span class="row-actions">
              <button class="btn ghost sm" data-editar-ex>Editar</button>
              <button class="btn ghost sm" data-excluir-ex>Excluir</button>
            </span>`;
          li.querySelector("[data-editar-ex]").addEventListener("click", () => abrirExercicioForm(dia, ex));
          li.querySelector("[data-excluir-ex]").addEventListener("click", () => excluirExercicio(dia, ex));
          ul.appendChild(li);
        });
        listaEx.appendChild(ul);
      }

      card.querySelector("[data-renomear]").addEventListener("click", () => renomearDia(dia));
      card.querySelector("[data-treinei]").addEventListener("click", () => {
        const atual = (Store.achar(CAMINHO, id).dias || []).find(d => d.id === dia.id);
        if (!atual) return;
        const feitos = new Set(atual.feitos || []), hoje = UI.hojeISO();
        feitos.has(hoje) ? feitos.delete(hoje) : feitos.add(hoje);
        Store.subAtualizar(CAMINHO, id, "dias", dia.id, { feitos: [...feitos].sort() });
        render();
        const botao = [...$("academia-conteudo").querySelectorAll("[data-treinei]")][lista.findIndex(d => d.id === dia.id)];
        botao?.focus({ preventScroll: true });
      });
      card.querySelector("[data-excluir-dia]").addEventListener("click", () => excluirDia(dia));
      card.querySelector("[data-add-exercicio]").addEventListener("click", () => abrirExercicioForm(dia));
      box.appendChild(card);
    });
  }

  /**
   * Objetivo + experiência + frequência decidem uma sugestão de divisão
   * (Store.sugerirDivisaoAcademia) — o segundo passo mostra essa sugestão já
   * marcada, mas o usuário pode trocar por qualquer outra. Na primeira vez,
   * confirmar também cria os dias sugeridos para aquela divisão
   * (Store.diasSugeridosAcademia); refazer o questionário depois só atualiza
   * objetivo/experiência/divisão — os dias já criados não são tocados, o
   * usuário quem adiciona, renomeia ou apaga pela tela normal.
   */
  async function abrirQuestionario({ primeiraVez }) {
    const atual = pilar.academia || {};
    const passo1 = await UI.formulario({
      titulo: primeiraVez ? "Antes de começar" : "Refazer o questionário",
      descricao: "Isso não prescreve treino nenhum; só ajuda a sugerir como organizar seus dias. O que entra em cada um é você quem escolhe, do catálogo de exercícios.",
      campos: [
        { nome: "objetivo", rotulo: "Objetivo principal", tipo: "select", opcoes: Store.ACADEMIA_OBJETIVOS, obrigatorio: true },
        { nome: "experiencia", rotulo: "Experiência com treino", tipo: "select", opcoes: Store.ACADEMIA_EXPERIENCIAS, obrigatorio: true },
        {
          nome: "frequenciaSemanal", rotulo: "Quantos dias por semana você treina", tipo: "select", obrigatorio: true,
          opcoes: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ valor: String(n), rotulo: `${n} ${n === 1 ? "dia" : "dias"} por semana` })),
        },
      ],
      valores: atual,
      rotuloConfirmar: "Continuar",
    });
    if (!passo1) return;

    const frequenciaSemanal = Number(passo1.frequenciaSemanal);
    const sugestao = Store.sugerirDivisaoAcademia(frequenciaSemanal);

    const passo2 = await UI.formulario({
      titulo: "Como você organiza o treino",
      descricao: "Treinar cada grupo muscular umas duas vezes por semana costuma render mais do que uma vez só, com o mesmo volume total. Por isso a sugestão abaixo. Mas a divisão que você já usa e gosta também é uma escolha válida.",
      campos: [
        { nome: "divisao", rotulo: "Divisão de treino", tipo: "select", opcoes: Store.ACADEMIA_DIVISOES, valorPadrao: sugestao, obrigatorio: true },
      ],
      rotuloConfirmar: primeiraVez ? "Criar meus dias" : "Salvar",
    });
    if (!passo2) return;

    const academia = {
      configuradoEm: atual.configuradoEm || new Date().toISOString(),
      objetivo: passo1.objetivo,
      experiencia: passo1.experiencia,
      frequenciaSemanal,
      divisao: passo2.divisao,
    };

    const patch = { academia };
    if (primeiraVez) {
      patch.dias = Store.diasSugeridosAcademia(passo2.divisao, frequenciaSemanal)
        .map((nome) => ({ id: Store.uid("dia"), nome, exercicios: [] }));
    }
    Store.atualizar(CAMINHO, id, patch);
    UI.toast(primeiraVez ? "Pronto. Agora monte seus dias com exercícios do catálogo." : "Questionário atualizado.");
    render();
  }

  async function abrirNovoDia() {
    const v = await UI.formulario({
      titulo: "Novo dia de treino",
      campos: [{ nome: "nome", rotulo: "Nome do dia", tipo: "text", obrigatorio: true, placeholder: "Ex.: Peito e tríceps" }],
    });
    if (!v) return;
    salvarDias([...dias(), { id: Store.uid("dia"), nome: v.nome, exercicios: [] }]);
  }

  async function renomearDia(dia) {
    const v = await UI.formulario({
      titulo: "Renomear dia",
      campos: [{ nome: "nome", rotulo: "Nome do dia", tipo: "text", obrigatorio: true }],
      valores: dia,
    });
    if (!v) return;
    salvarDias(dias().map((d) => (d.id === dia.id ? { ...d, nome: v.nome } : d)));
  }

  async function excluirDia(dia) {
    const ok = await UI.confirmar({
      titulo: `Excluir o dia "${dia.nome}"?`,
      descricao: dia.exercicios.length
        ? `Os ${dia.exercicios.length} exercícios cadastrados nele também somem.`
        : "Este dia não tem exercícios cadastrados.",
      rotuloConfirmar: "Excluir dia",
      perigo: true,
    });
    if (!ok) return;
    salvarDias(dias().filter((d) => d.id !== dia.id));
  }

  async function abrirExercicioForm(dia, exercicioExistente) {
    const editando = !!exercicioExistente;
    const campos = [
      ...(editando ? [] : [{
        nome: "exercicioId", rotulo: "Exercício", tipo: "buscaSelect", opcoes: catalogoOpcoes(), obrigatorio: true,
        placeholder: "Digite o nome do exercício ou o grupo muscular…",
      }]),
      { nome: "cargaAtual", rotulo: "Carga atual", tipo: "number", step: "0.5", placeholder: "Ex.: 40" },
      { nome: "unidade", rotulo: "Unidade", tipo: "select", opcoes: ["kg", "lb"] },
      { nome: "seriesAtual", rotulo: "Séries", tipo: "number", placeholder: "Ex.: 4" },
      { nome: "repeticoesAtual", rotulo: "Repetições por série", tipo: "number", placeholder: "Ex.: 10" },
      { nome: "recorde", rotulo: "Recorde pessoal", tipo: "number", step: "0.5", dica: "Deixe em branco pra começar igual à carga atual." },
    ];
    const v = await UI.formulario({
      titulo: editando ? `Editar "${nomeExercicio(exercicioExistente.exercicioId)}"` : "Adicionar exercício",
      campos,
      valores: exercicioExistente || { unidade: "kg" },
    });
    if (!v) return;

    const cargaAtual = v.cargaAtual;
    const recordeAnterior = exercicioExistente?.recorde ?? null;
    let recorde = v.recorde;
    if (recorde === null && cargaAtual !== null) recorde = cargaAtual; // sem recorde informado, começa igual à carga atual
    const bateuRecorde = cargaAtual !== null && recordeAnterior !== null && cargaAtual > recordeAnterior;
    if (bateuRecorde) recorde = cargaAtual;

    const dados = {
      exercicioId: editando ? exercicioExistente.exercicioId : v.exercicioId,
      cargaAtual,
      unidade: v.unidade || "kg",
      seriesAtual: v.seriesAtual,
      repeticoesAtual: v.repeticoesAtual,
      recorde,
    };

    const novosDias = dias().map((d) => {
      if (d.id !== dia.id) return d;
      const exercicios = editando
        ? d.exercicios.map((e) => (e.id === exercicioExistente.id ? { ...dados, id: e.id } : e))
        : [...d.exercicios, { ...dados, id: Store.uid("ex") }];
      return { ...d, exercicios };
    });
    salvarDias(novosDias);
    if (bateuRecorde) UI.toast("Novo recorde pessoal!");
  }

  function excluirExercicio(dia, exercicio) {
    const antes = dias();
    salvarDias(dias().map((d) => (d.id === dia.id ? { ...d, exercicios: d.exercicios.filter((e) => e.id !== exercicio.id) } : d)));
    UI.toast("Exercício removido do dia.", {
      acaoRotulo: "Desfazer",
      aoAcionar: () => salvarDias(antes),
    });
  }

  /* --------------------------------- Ações ---------------------------------- */

  // descricao e data são campos de sistema — o resto vem dos campos próprios
  // da aba (sugeridos na criação, ajustáveis em "Campos desta aba").
  const camposItem = () => [
    { nome: "descricao", rotulo: pilar.checkin ? "O que você quer fazer" : "Nome", tipo: "text", obrigatorio: true, placeholder: `Ex.: ${exemploPara()}` },
    ...(pilar.checkin ? [] : [{ nome: "data", rotulo: pilar.naAgenda ? "Data" : "Data (opcional)", tipo: "date", obrigatorio: !!pilar.naAgenda, valorPadrao: pilar.naAgenda ? UI.hojeISO() : "" }]),
    ...UI.camposItemPilar(pilar),
  ];

  function exemploPara() {
    return pilar.exemploItem || `um ${rotulo()} de ${pilar.nome}`;
  }

  // Separa descricao/data (sistema) do resto (extras), nos dois sentidos.
  const paraExtras = (v) => {
    const { descricao, data, ...resto } = v;
    return { descricao, data: data || "", extras: resto };
  };
  const deExtras = (c) => ({ descricao: c.descricao, data: c.data, ...(c.extras || {}) });

  async function novoItem(dataInicial, iniciais = {}) {
    const v = await UI.formulario({
      titulo: `Adicionar ${rotulo()}`, descricao: pilar.nome, campos: camposItem(), icone: UI.iconeAba ? UI.iconeAba(pilar.icone) : null, cor: pilar.cor,
      valores: { ...iniciais, ...(typeof dataInicial === "string" ? { data: dataInicial } : {}) },
      validar: v => Acompanhamento.validar(pilar, v),
    });
    if (!v) return;
    Store.subInserir(CAMINHO, id, "itens", { ...paraExtras(v), concluido: false, criadoEm: new Date().toISOString(), ...(pilar.checkin ? { feitos: [] } : {}) });
    UI.toast(`${fmt.capitalizar(rotulo())} cadastrado.`);
    render();
  }

  async function editarItem(c) {
    const v = await UI.formulario({ titulo: `Editar ${rotulo()}`, campos: camposItem(), valores: deExtras(c), icone: UI.iconeAba ? UI.iconeAba(pilar.icone) : null, cor: pilar.cor, rotuloExcluir: "Excluir", aoExcluir: () => excluirItem(c), validar: v => Acompanhamento.validar(pilar, v) });
    if (!v) return;
    Store.subAtualizar(CAMINHO, id, "itens", c.id, paraExtras(v));
    UI.toast("Atualizado.");
    render();
  }

  function excluirItem(c) {
    const antes = [...itens()];
    Store.subRemover(CAMINHO, id, "itens", c.id);
    render();
    UI.toast("Excluído.", {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.atualizar(CAMINHO, id, { itens: antes }); render(); },
    });
  }

  async function editarAba() {
    // O editor com o Delfos é baixado na hora; sem rede, cai no formulário simples.
    try {
      await UI.carregarScript("delfos.js");
      await UI.carregarScript("abas.js");
      return abrirPersonalizar();
    } catch {
      // segue para o formulário simples
    }
    const v = await UI.formulario({ titulo: "Editar aba", campos: UI.camposPilar(), valores: pilar });
    if (!v) return;
    Store.atualizar(CAMINHO, id, v);
    render();
  }

  async function excluirAba() {
    const quantos = ehAcademia()
      ? dias().reduce((n, d) => n + d.exercicios.length, 0)
      : ehAlimentacao() ? Alimentacao.resumoHoje(pilar).itens
      : itens().length;
    const rotuloItem = ehAcademia() ? "exercício cadastrado" : ehAlimentacao() ? "alimento do plano" : "item cadastrado";
    const rotuloItens = ehAcademia() ? "exercícios cadastrados" : ehAlimentacao() ? "alimentos do plano" : "itens cadastrados";
    const resumos = (pilar.resumos || []).length;
    const ok = await UI.confirmar({
      titulo: `Excluir a aba "${pilar.nome}"?`,
      descricao: quantos || resumos
        ? `${quantos ? `${quantos} ${quantos === 1 ? rotuloItem : rotuloItens}` : ""}${quantos && resumos ? " e " : ""}${resumos ? `${resumos} ${resumos === 1 ? "resumo" : "resumos"}` : ""} ${quantos + resumos === 1 ? "também será apagado" : "também serão apagados"}. Isso não pode ser desfeito depois que você sair da página.`
        : "A aba some da barra lateral. Você pode criar outra a qualquer momento.",
      rotuloConfirmar: "Excluir aba",
      perigo: true,
    });
    if (!ok) return;
    Store.remover(CAMINHO, id);
    location.href = "index.html";
  }

  /* Adição rápida: o nome e Enter. Com um filtro do campo de agrupar ligado,
     o registro já entra nele; se a aba tem campo obrigatório, abre o
     formulário completo com o nome preenchido. */
  function prepararRapido() {
    const r = rotulo();
    const form = $("registro-rapido");
    form.hidden = ehAcademia() || ehAlimentacao();
    $("f-rapido").placeholder = pilar.exemploItem ? `Adicionar ${r}, por exemplo: ${pilar.exemploItem}` : `Adicionar ${r}…`;
    $("rotulo-rapido").textContent = `Adicionar ${r} rapidamente`;
    const cg = campoGrupo();
    const destino = cg ? destinoRapido()[cg.id] : "";
    $("dica-rapido").textContent = destino
      ? `Enter adiciona em ${fmt.capitalizar(destino)}; os detalhes ficam para depois.`
      : "Enter adiciona; os detalhes ficam para depois.";
    form.querySelector(".registro-rapido-ic").innerHTML = UI.iconeAba(pilar.icone, true);
  }

  // Com um filtro ligado, entra nele; nas colunas por etapa, na primeira coluna.
  function destinoRapido() {
    const cg = campoGrupo();
    if (!cg) return {};
    if (filtros.grupo !== "todos") return { [cg.id]: filtros.grupo };
    if (vistaAtual() === "quadro" && cg.opcoes?.length) return { [cg.id]: cg.opcoes[0] };
    return {};
  }

  $("registro-rapido").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const entrada = $("f-rapido");
    const nome = entrada.value.trim();
    if (!nome) { entrada.focus(); return; }
    const extras = destinoRapido();
    entrada.value = "";
    if ((pilar.campos || []).some((c) => c.obrigatorio && (extras[c.id] === undefined || extras[c.id] === ""))) {
      novoItem(null, { descricao: nome, ...extras });
      return;
    }
    const novo = Store.subInserir(CAMINHO, id, "itens", { descricao: nome, data: "", extras, concluido: false, criadoEm: new Date().toISOString(), ...(pilar.checkin ? { feitos: [] } : {}) });
    render();
    entrada.focus({ preventScroll: true });
    UI.toast(`${fmt.capitalizar(rotulo())} cadastrado.`, {
      acaoRotulo: "Completar",
      aoAcionar: () => { const c = itens().find((x) => x.id === novo?.id); if (c) editarItem(c); },
    });
  });

  document.getElementById("btn-item").addEventListener("click", () => novoItem());
  document.getElementById("btn-layout").addEventListener("click", abrirLayout);
  $("btn-atualizar-modelo").addEventListener("click", () => {
    const novos = novosCamposModelo();
    if (!novos.length) return;
    Store.atualizar(CAMINHO, id, { campos: [...pilar.campos, ...novos] });
    render(); UI.toast("Campos sugeridos adicionados. Seus dados e ajustes foram preservados.");
  });
  $("f-periodo").addEventListener("change", ev => { filtros.periodo = ev.target.value; render(); });
  document.getElementById("f-vista").addEventListener("change", (ev) => {
    salvarVisual({ vista: ev.target.value });
    render();
  });
  document.getElementById("f-ordem").addEventListener("change", (ev) => {
    salvarVisual({ ordem: ev.target.value }); render();
    UI.animar($("lista"), [{ opacity: .65 }, { opacity: 1 }], { tempo: "rapido" });
  });
  document.getElementById("btn-editar-aba").addEventListener("click", editarAba);
  UI.prepararCriador(document.getElementById("btn-editar-aba"));
  UI.prepararCriador(document.getElementById("btn-editar-aba-2"));
  document.getElementById("btn-editar-aba-2").addEventListener("click", editarAba);
  document.getElementById("btn-campos").addEventListener("click", async () => {
    await UI.editorCampos(pilar.id, Acompanhamento.alimentar(pilar) ? pilar.campos : undefined);
    render();
  });
  document.getElementById("btn-excluir-aba").addEventListener("click", excluirAba);
  document.getElementById("btn-dia").addEventListener("click", abrirNovoDia);
  document.getElementById("btn-refazer-questionario").addEventListener("click", () => abrirQuestionario({ primeiraVez: false }));
  document.getElementById("f-concluidos").addEventListener("change", (ev) => {
    verConcluidos = ev.target.checked;
    render();
  });
  document.getElementById("f-grupo").addEventListener("click", (ev) => {
    const c = ev.target.closest("[data-grupo]");
    if (!c) return;
    filtros.grupo = c.dataset.grupo;
    render();
    UI.animar($("lista"), [{ opacity: .65 }, { opacity: 1 }], { tempo: "rapido" });
  });
  document.getElementById("f-busca").addEventListener("input", (ev) => {
    filtros.busca = ev.target.value;
    renderLista(Leituras.pilar(pilar));
  });
  document.querySelector(".registros-filtros .busca").insertAdjacentHTML("afterbegin", UI.icone("busca"));

  render();
})();
