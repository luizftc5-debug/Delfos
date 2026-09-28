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
        texto: "Pode ter sido excluída, ou este link é de outro navegador — os dados ficam salvos em cada navegador.",
        rotuloAcao: "Voltar à visão geral",
        aoAcionar: () => (location.href = "index.html"),
      })
    );
    return;
  }

  UI.iniciarPagina("pilar", { idAtivo: id });

  const itens = () => (Store.achar(CAMINHO, id) || {}).itens || [];
  const ehAcademia = () => pilar.modelo === "academia";

  /* --------------------------------- Render --------------------------------- */

  const $ = (x) => document.getElementById(x);
  const rotulo = () => (pilar.rotuloItem || "item").toLowerCase();
  const filtros = { grupo: "todos", busca: "" };
  let verConcluidos = false;

  function render() {
    pilar = Store.achar(CAMINHO, id);
    if (!pilar) return (location.href = "index.html");

    document.title = `${pilar.nome} · ${UI.NOME}`;
    // A cor da aba é um hex do usuário, então entra como variável na página
    // (--tint): o quadradinho dos dias marcados e os destaques leem dela.
    const raiz = $("conteudo");
    raiz.style.setProperty("--tint", pilar.cor);

    const etiqueta = $("etiqueta");
    // O ponto do eyebrow leva a cor da aba; o texto fica na tinta normal.
    etiqueta.textContent = pilar.sugeridoPor === "ia" ? "Aba criada por você, montada com IA" : "Aba criada por você";
    etiqueta.style.setProperty("--marca", pilar.cor);
    $("swatch-lista").style.background = pilar.cor;

    $("titulo").textContent = pilar.nome;
    const academia = ehAcademia();
    $("subtitulo").textContent =
      pilar.descricao ||
      (academia
        ? "Seus dias de treino, com carga, repetições e recorde de cada exercício."
        : pilar.checkin ? "Marque cada dia em que fez; o Delfos conta as sequências." : pilar.naAgenda ? "Com data, cada registro entra na agenda da visão geral." : "Registros que se acompanham, fora da agenda.");

    $("btn-editar-aba").innerHTML = `${UI.icone("ajustes")}Personalizar`;
    $("btn-item").textContent = `+ ${fmt.capitalizar(rotulo())}`;

    $("bloco-stats").classList.toggle("hidden", academia);
    $("secao-itens").classList.toggle("hidden", academia);
    $("leitura").classList.toggle("hidden", academia);
    $("secao-academia").classList.toggle("hidden", !academia);
    $("btn-item").classList.toggle("hidden", academia);
    $("btn-campos").classList.toggle("hidden", academia);
    $("btn-refazer-questionario").hidden = !academia;
    $("btn-dia").classList.toggle("hidden", !(academia && pilar.academia?.configuradoEm));
    $("nota-ajustes").textContent = academia
      ? "Esta aba foi criada por você. Renomeá-la, trocar ícone e cor, ou refazer o questionário não mexe nos dias já montados; excluí-la apaga também os dias e exercícios cadastrados."
      : "Esta aba foi criada por você. Personalizar (ícone, cor, meta, agrupamento, campos sugeridos pela IA) não mexe no que já está cadastrado; excluí-la apaga também todos os registros dela.";

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
    UI.renderNotas($("notas"), L.notas, L.itens.length
      ? "Nada fora do comum por aqui."
      : `Quando houver registros, o Delfos aponta aqui ${pilar.checkin ? "as sequências e o que ficou sem marcar" : pilar.meta ? "o ritmo da meta" : "o que merece atenção"}.`);
    UI.renderPerguntas($("sec-perguntas"), $("perguntas"), `pilar:${pilar.id}`, perguntas(L), render);
    UI.montarLayout("pilar", { idAtivo: id });
  }

  const PERIODO = { semana: "da semana", mes: "do mês", ano: "do ano" };

  function renderStats(L) {
    const t = [];
    const rot = rotulo();
    if (pilar.checkin) t.push({ l: fmt.capitalizar(Leituras.pluralizar(rot)), v: L.itens.length, s: "acompanhados por dia" });
    else t.push({ l: "Em aberto", v: L.abertos.length, s: `${L.itens.length} ${L.itens.length === 1 ? "registro" : "registros"} no total` });
    if (pilar.checkin) {
      const hoje = L.checkin.filter((x) => x.hoje).length;
      t.push({ l: "Marcados hoje", v: `${hoje} de ${L.checkin.length}`, s: hoje === L.checkin.length && L.checkin.length ? "tudo em dia" : "toque em Hoje em cada um" });
      const melhor = [...L.checkin].sort((a, b) => b.seq - a.seq)[0];
      t.push({ l: "Maior sequência", v: melhor ? `${melhor.seq} ${melhor.seq === 1 ? "dia" : "dias"}` : "—", s: melhor?.seq ? fmt.escape(melhor.i.descricao) : "comece hoje" });
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
    box.className = `grid ${t.length >= 4 ? "g4" : "g3"}`;
    box.innerHTML = t.slice(0, 4).map((x) => `
      <div class="card">
        <div class="stat-label">${x.l}</div>
        <div class="stat-value ${x.classe || ""}">${typeof x.v === "number" ? x.v : fmt.escape(String(x.v))}</div>
        <div class="stat-sub">${x.s}</div>
      </div>`).join("");
  }

  const campoGrupo = () => (pilar.campos || []).find((c) => c.id === pilar.agruparPor && c.tipo === "select");

  function renderFiltros() {
    const cg = campoGrupo();
    const box = $("f-grupo");
    box.hidden = !cg;
    if (!cg) { filtros.grupo = "todos"; return; }
    box.innerHTML = [["todos", "Tudo"], ...cg.opcoes.map((o) => [o, fmt.capitalizar(o)])]
      .map(([v, r]) => `<button type="button" class="chip" data-grupo="${fmt.escape(v)}" aria-pressed="${v === filtros.grupo}">${fmt.escape(r)}</button>`).join("");
  }

  function renderLista(L) {
    const box = $("lista");
    box.innerHTML = "";
    $("titulo-lista").lastChild.textContent = fmt.capitalizar(Leituras.pluralizar(rotulo()));
    const cg = campoGrupo();
    const busca = filtros.busca.trim().toLowerCase();
    const visiveis = L.itens
      .filter((c) => verConcluidos || pilar.checkin || !c.concluido)
      .filter((c) => filtros.grupo === "todos" || (c.extras || {})[cg?.id] === filtros.grupo)
      .filter((c) => !busca || (c.descricao || "").toLowerCase().includes(busca) || Object.values(c.extras || {}).some((v) => String(v).toLowerCase().includes(busca)))
      .sort((a, b) => (pilar.naAgenda ? (a.data || "9999").localeCompare(b.data || "9999") : (b.criadoEm || "").localeCompare(a.criadoEm || "")));

    if (!visiveis.length) {
      box.appendChild(UI.vazio({
        icone: "mais",
        titulo: L.itens.length ? "Nada com esse filtro" : `Nenhum ${rotulo()} ainda`,
        texto: L.itens.length ? "Troque o filtro ou marque “ver concluídos”." : pilar.checkin
          ? `Cadastre cada ${rotulo()} que quer acompanhar; depois é só tocar em Hoje nos dias em que fizer.`
          : `Cada ${rotulo()} guarda ${(pilar.campos || []).slice(0, 3).map((c) => c.rotulo.toLowerCase()).join(", ") || "nome e data"}${pilar.naAgenda ? " e entra na agenda da visão geral" : ""}.`,
        rotuloAcao: L.itens.length ? "" : `Adicionar ${rotulo()}`,
        aoAcionar: novoItem,
      }));
      return;
    }

    // Agrupado pelo campo escolhido quando o filtro está em "Tudo".
    const grupos = cg && filtros.grupo === "todos"
      ? [...cg.opcoes, ""].map((v) => [v, visiveis.filter((c) => ((c.extras || {})[cg.id] || "") === v)]).filter(([, l]) => l.length)
      : [[null, visiveis]];
    grupos.forEach(([valor, lista]) => {
      const g = document.createElement("div");
      g.className = "grupo-tempo";
      if (valor !== null) g.innerHTML = `<h3 class="grupo-tempo-titulo">${fmt.escape(valor ? fmt.capitalizar(valor) : `Sem ${cg.rotulo.toLowerCase()}`)} <span>${lista.length}</span></h3>`;
      const ul = document.createElement("ul");
      ul.className = "list";
      lista.forEach((c) => ul.appendChild(linhaItem(c)));
      g.appendChild(ul);
      box.appendChild(g);
    });
  }

  function linhaItem(c) {
    const li = document.createElement("li");
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
      const badge = pilar.naAgenda && c.data
        ? `<span class="badge ${c.concluido ? "feito" : u.nivel}">${c.concluido ? "concluído" : u.rotulo}</span>`
        : c.concluido ? `<span class="badge feito">concluído</span>` : "";
      li.innerHTML = `
        <input type="checkbox" class="check" ${c.concluido ? "checked" : ""} aria-label="Marcar como concluído" />
        <span class="grow">
          <span class="title ${c.concluido ? "strike" : ""}">${fmt.escape(c.descricao)}</span>
          <span class="meta">${metaLista(c)}</span>
        </span>
        ${badge}
        ${acoes}`;
      li.querySelector("input").addEventListener("change", (ev) => {
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
    Store.subAtualizar(CAMINHO, id, "itens", c.id, { feitos: [...feitos].sort() });
    render();
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
        card.innerHTML = `<div class="card-head"><h2 class="card-title">${fmt.escape(r.campo.rotulo)}</h2></div><p class="card-note" style="margin:0; font-size:14.5px; color:var(--texto-2);">${r.sim} de ${r.n} ${r.n === 1 ? rotulo() : Leituras.pluralizar(rotulo())}.</p>`;
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
    await Abas.abrir({ pilar });
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
      .map((e) => ({ valor: e.id, rotulo: `${e.grupo} — ${e.nome}` }));

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
        Soma das séries de cada exercício cadastrado nos dias abaixo — não é meta nem recomendação,
        só o que já está anotado.
      </p>
      <div class="assistente-resumo"><dl>${grupos
        .map((g) => `<dt>${fmt.escape(g)}</dt><dd>${somas[g]} ${somas[g] === 1 ? "série" : "séries"}</dd>`)
        .join("")}</dl></div>`;
    box.appendChild(card);
  }

  function renderAcademia() {
    const box = document.getElementById("academia-conteudo");
    box.innerHTML = "";

    if (!pilar.academia?.configuradoEm) {
      box.appendChild(
        UI.vazio({
          icone: pilar.icone,
          titulo: "Antes de começar",
          texto: "Um questionário rápido — objetivo, experiência e frequência semanal — só para sugerir como organizar seus dias de treino. Você monta o que entra em cada um, escolhendo do catálogo de exercícios.",
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

    renderResumoGrupos(box, lista);

    lista.forEach((dia) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.marginBottom = "12px";
      card.innerHTML = `
        <div class="card-head">
          <h3 class="card-title">${fmt.escape(dia.nome)}</h3>
          <span class="row-actions" style="opacity:1;">
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
          const partes = [];
          if (ex.seriesAtual || ex.repeticoesAtual) {
            partes.push(`${ex.seriesAtual || "—"}x${ex.repeticoesAtual || "—"}`);
          }
          if (ex.cargaAtual !== null && ex.cargaAtual !== undefined) partes.push(`carga atual: ${ex.cargaAtual}${ex.unidade}`);
          if (ex.recorde !== null && ex.recorde !== undefined) partes.push(`recorde: ${ex.recorde}${ex.unidade}`);
          li.innerHTML = `
            <span class="grow">
              <span class="title">${fmt.escape(nomeExercicio(ex.exercicioId))}</span>
              <span class="meta">${fmt.escape(grupoExercicio(ex.exercicioId))}${partes.length ? ", " + fmt.escape(partes.join(", ")) : ""}</span>
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
      descricao: "Isso não prescreve treino nenhum — só ajuda a sugerir como organizar seus dias. O que entra em cada um é você quem escolhe, do catálogo de exercícios.",
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
      descricao: "Treinar cada grupo muscular umas duas vezes por semana costuma render mais do que uma vez só, com o mesmo volume total — por isso a sugestão abaixo. Mas a divisão que você já usa e gosta também é uma escolha válida.",
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
    UI.toast(primeiraVez ? "Pronto — agora monte seus dias com exercícios do catálogo." : "Questionário atualizado.");
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
    const s = typeof Abas !== "undefined" ? Abas.sugerirLocal(pilar.nome) : null;
    return s?.exemplos?.[0] || `um ${rotulo()} de ${pilar.nome}`;
  }

  // Separa descricao/data (sistema) do resto (extras), nos dois sentidos.
  const paraExtras = (v) => {
    const { descricao, data, ...resto } = v;
    return { descricao, data: data || "", extras: resto };
  };
  const deExtras = (c) => ({ descricao: c.descricao, data: c.data, ...(c.extras || {}) });

  async function novoItem() {
    const v = await UI.formulario({ titulo: `Adicionar ${rotulo()}`, descricao: pilar.nome, campos: camposItem() });
    if (!v) return;
    Store.subInserir(CAMINHO, id, "itens", { ...paraExtras(v), concluido: false, criadoEm: new Date().toISOString(), ...(pilar.checkin ? { feitos: [] } : {}) });
    UI.toast(`${fmt.capitalizar(rotulo())} cadastrado.`);
    render();
  }

  async function editarItem(c) {
    const v = await UI.formulario({ titulo: `Editar ${rotulo()}`, campos: camposItem(), valores: deExtras(c) });
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
    if (typeof Abas !== "undefined") return abrirPersonalizar();
    const v = await UI.formulario({ titulo: "Editar aba", campos: UI.camposPilar(), valores: pilar });
    if (!v) return;
    Store.atualizar(CAMINHO, id, v);
    render();
  }

  async function excluirAba() {
    const quantos = ehAcademia()
      ? dias().reduce((n, d) => n + d.exercicios.length, 0)
      : itens().length;
    const rotuloItem = ehAcademia() ? "exercício cadastrado" : "item cadastrado";
    const rotuloItens = ehAcademia() ? "exercícios cadastrados" : "itens cadastrados";
    const ok = await UI.confirmar({
      titulo: `Excluir a aba "${pilar.nome}"?`,
      descricao: quantos
        ? `Os ${quantos} ${quantos === 1 ? rotuloItem : rotuloItens} nela também serão apagados. Isso não pode ser desfeito depois que você sair da página.`
        : "A aba some da barra lateral. Você pode criar outra a qualquer momento.",
      rotuloConfirmar: "Excluir aba",
      perigo: true,
    });
    if (!ok) return;
    Store.remover(CAMINHO, id);
    location.href = "index.html";
  }

  document.getElementById("btn-item").addEventListener("click", novoItem);
  document.getElementById("btn-editar-aba").addEventListener("click", editarAba);
  document.getElementById("btn-editar-aba-2").addEventListener("click", editarAba);
  document.getElementById("btn-campos").addEventListener("click", async () => {
    await UI.editorCampos(pilar.id);
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
  });
  document.getElementById("f-busca").addEventListener("input", (ev) => {
    filtros.busca = ev.target.value;
    renderLista(Leituras.pilar(pilar));
  });
  document.querySelector(".fin-filtros .busca").insertAdjacentHTML("afterbegin", UI.icone("busca"));

  render();
})();
