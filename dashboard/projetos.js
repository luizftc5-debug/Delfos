/* Projetos — iniciativas pessoais que geram renda, acompanhadas por etapas.
   Trabalhos acadêmicos e o TCC ficam na aba Faculdade. */

(() => {
  UI.iniciarPagina("projetos");

  const { fmt } = UI;

  const projetos = () => Store.lista("projetos");
  const oportunidades = () => Store.lista("oportunidades");
  const ativos = () => projetos().filter((p) => p.status !== "concluído" && p.status !== "arquivado");

  /* --------------------------------- Render --------------------------------- */

  function render() {
    const lista = projetos();
    const emAndamento = ativos();

    document.getElementById("s-ativos").textContent = emAndamento.length;
    document.getElementById("s-ativos-d").textContent = `${lista.length} ${lista.length === 1 ? "projeto no total" : "projetos no total"}`;

    const renda = emAndamento.reduce((s, p) => s + (Number(p.rendaEstimada) || 0), 0);
    document.getElementById("s-renda").textContent = renda ? fmt.moeda(renda) : "-";
    document.getElementById("s-renda-d").textContent = renda
      ? "Por mês, somando os projetos ativos"
      : "Informe a renda estimada de cada projeto";

    const faturado = lista.reduce((s, p) => s + UI.resumoProjeto(p).faturado, 0);
    document.getElementById("s-faturado").textContent = faturado ? fmt.moeda(faturado) : "-";
    document.getElementById("s-faturado-d").textContent = faturado
      ? "Total já recebido nestes projetos"
      : "Registre os recebimentos dentro de cada projeto";

    const passos = lista.flatMap((p) => p.passos || []);
    const feitos = passos.filter((s) => s.feito).length;
    document.getElementById("s-etapas").textContent = passos.length ? `${feitos}/${passos.length}` : "-";
    document.getElementById("s-etapas-d").textContent = passos.length
      ? `${Math.round((feitos / passos.length) * 100)}% do planejado`
      : "Quebre os projetos em etapas";

    const L = Leituras.projetos();
    document.getElementById("leitura").innerHTML = L.frase;
    renderRenda(L);
    UI.renderNotas(document.getElementById("notas"), L.notas, lista.length
      ? "Nada fora do comum. Com recebimentos, custos e horas por semana, o Delfos compara o que cada projeto paga."
      : "Quando houver projetos, o Delfos aponta aqui prazos, próximos passos e quanto cada um rende por hora.");
    UI.renderPerguntas(document.getElementById("sec-perguntas"), document.getElementById("perguntas"), "projetos", perguntas(L), render);

    renderProjetos();
    renderOportunidades();
    UI.montarLayout("projetos");
  }

  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  function renderRenda(L) {
    const mesNome = MESES[Number(UI.mesAtual().slice(5)) - 1];
    document.getElementById("titulo-renda").textContent = `Recebido por projeto em ${mesNome}`;
    const box = document.getElementById("renda-projetos");
    const recebido = L.porProjeto.reduce((t, x) => t + (Number(x.recMes) || 0), 0);
    const estimado = L.porProjeto.reduce((t, x) => t + (Number(x.estim) || 0), 0);
    document.getElementById("renda-resumo").innerHTML = L.porProjeto.length
      ? `<b>${fmt.moeda(recebido)}</b> recebidos${estimado ? ` de ${fmt.moeda(estimado)} estimados` : ""}`
      : "Nenhum projeto ativo";
    if (!L.porProjeto.length) box.innerHTML = `<p class="card-note" style="margin:0;">Nenhum projeto ativo.</p>`;
    else UI.barrasComMeta(box, L.porProjeto.map((x) => ({
      nome: x.p.nome, href: `projeto.html?id=${encodeURIComponent(x.p.id)}`,
      valor: x.recMes, meta: x.estim || null,
      sub: [
        x.estim ? `<span>estimado ${fmt.moeda(x.estim)}</span>` : "<span>sem renda estimada</span>",
        x.valorHora ? `<span>${fmt.moeda(x.valorHora)} por hora</span>` : "",
        x.custoMes ? `<span>custos ${fmt.moeda(x.custoMes)}</span>` : "",
      ].join(""),
    })), { cor: "var(--s-projetos)", rotuloMeta: "renda estimada" });

    const meses = document.getElementById("renda-meses");
    const somaMeses = L.meses.reduce((t, m) => t + (Number(m.valor) || 0), 0);
    document.getElementById("meses-nota").innerHTML = `${fmt.moeda(somaMeses)} em seis meses${L.meta ? `; meta de ${fmt.moeda(L.meta)} por mês` : ""}`;
    UI.barrasComMeta(meses, L.meses.map((m) => ({
      nome: `${MESES[Number(m.chave.slice(5)) - 1]}${m.chave.slice(0, 4) !== UI.mesAtual().slice(0, 4) ? ` de ${m.chave.slice(0, 4)}` : ""}`,
      valor: m.valor, meta: L.meta || null,
    })), { cor: "var(--s-projetos)", rotuloMeta: "meta mensal" });
  }

  function perguntas(L) {
    const prefs = Store.estado().preferencias.projetos || {};
    const q = [];
    const feito = (msg) => { UI.toast(msg); render(); };
    if (!projetos().length) return q;
    if (prefs.metaMensal === null || prefs.metaMensal === undefined) {
      q.push({
        id: "metaMensal",
        texto: "Quanto você quer ganhar por mês com projetos?",
        apoio: `${L.estimado ? `Somando as estimativas, os projetos ativos dariam ${fmt.moeda(L.estimado)} por mês. ` : ""}Com uma meta, o Delfos mostra quanto falta a cada mês.`,
        controle: () => UI.resposta.valor({ sugestao: L.estimado ? Math.round(L.estimado / 50) * 50 : "", rotulo: "Definir meta", aoSalvar: (v) => { Store.definirPreferencias({ projetos: { metaMensal: v } }); feito(`Meta de ${fmt.moeda(v)} por mês.`); } }),
      });
    }
    if (prefs.horasDisponiveis === null || prefs.horasDisponiveis === undefined) {
      q.push({
        id: "horasDisponiveis",
        texto: "Quantas horas por semana sobram para projetos, fora a faculdade?",
        apoio: `${L.horas ? `Hoje os projetos ativos pedem ${fmt.decimal(L.horas, 0)} h por semana. ` : ""}O Delfos avisa quando os projetos passarem do tempo que você tem.`,
        controle: () => UI.resposta.valor({ sugestao: 10, rotulo: "Salvar", passo: "1", min: 1, max: 80, sufixo: "h", aoSalvar: (v) => { Store.definirPreferencias({ projetos: { horasDisponiveis: Math.round(v) } }); feito(`${Math.round(v)} h por semana para projetos.`); } }),
      });
    }
    const semEstim = L.porProjeto.find((x) => !x.estim);
    if (semEstim) {
      q.push({
        id: `estimativa:${semEstim.p.id}`,
        texto: `Quanto ${semEstim.p.nome} deve render por mês?`,
        apoio: "Um valor aproximado basta; serve para comparar com o que de fato entra.",
        controle: () => UI.resposta.valor({ rotulo: "Salvar", aoSalvar: (v) => { Store.atualizar("projetos", semEstim.p.id, { rendaEstimada: v }); feito("Estimativa salva."); } }),
      });
    }
    const semHoras = L.porProjeto.find((x) => !(Number(x.p.horasSemana) > 0));
    if (semHoras) {
      q.push({
        id: `horas:${semHoras.p.id}`,
        texto: `Quantas horas por semana ${semHoras.p.nome} toma?`,
        apoio: "Com as horas, o Delfos calcula quanto o projeto paga por hora e compara com os outros.",
        controle: () => UI.resposta.valor({ rotulo: "Salvar", passo: "0.5", min: 0.5, max: 80, sufixo: "h", aoSalvar: (v) => { Store.atualizar("projetos", semHoras.p.id, { horasSemana: v }); feito("Horas salvas."); } }),
      });
    }
    return q;
  }

  function renderProjetos() {
    const box = document.getElementById("projetos");
    box.innerHTML = "";
    const lista = projetos();
    const ativos = lista.filter((p) => p.status !== "concluído" && p.status !== "arquivado");
    document.getElementById("projetos-resumo").textContent = lista.length
      ? `${ativos.length === 1 ? "1 ativo" : `${ativos.length} ativos`}${lista.length > ativos.length ? ` de ${lista.length}` : ""}: ${ativos.map((p) => p.nome).join(", ").replace(/, ([^,]*)$/, " e $1") || "nenhum em andamento"}`
      : "Nenhum projeto cadastrado";

    if (!lista.length) {
      const card = document.createElement("div");
      card.className = "card";
      card.appendChild(
        UI.vazio({
          icone: "◇",
          titulo: "Nenhum projeto cadastrado",
          texto: "Aqui entram iniciativas que trazem dinheiro: monitoria, cursinho, plantões, conteúdo, freelas. Trabalhos da faculdade e o TCC ficam na aba Faculdade.",
          rotuloAcao: "Criar primeiro projeto",
          aoAcionar: novoProjeto,
        })
      );
      box.appendChild(card);
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list cartoes";
    lista
      .slice()
      .sort((a, b) => {
        const fim = (p) => p.status === "concluído" || p.status === "arquivado";
        if (fim(a) !== fim(b)) return fim(a) ? 1 : -1;
        return (a.deadline || "9999").localeCompare(b.deadline || "9999");
      })
      .forEach((p) => ul.appendChild(cartaoProjeto(p)));

    box.appendChild(ul);
  }

  /**
   * Cartão-resumo. O detalhe todo (recebimentos, custos, documentos, ficha)
   * mora em projeto.html — aqui fica só o que se lê de relance, com a próxima
   * etapa em aberto servindo de "e agora?".
   */
  /** Um projeto em cartão: as iniciais na cor de Projetos, o que já rendeu, o prazo e as etapas. */
  function cartaoProjeto(p) {
    const li = document.createElement("li");
    const r = UI.resumoProjeto(p);
    const href = `projeto.html?id=${encodeURIComponent(p.id)}`;
    const proxima = (p.passos || []).find((s) => !s.feito);
    if (r.encerrado) li.className = "concluido";
    const tomPrazo = r.urgencia ? (r.urgencia.nivel === "atrasado" || r.urgencia.nivel === "hoje" ? "alerta" : r.urgencia.nivel === "urgente" ? "atencao" : "") : "";

    li.innerHTML = `
      ${UI.marcaItem({ texto: UI.monograma(p.nome), classe: "grande", nivel: r.encerrado ? "apagada" : "" })}
      <a class="linha-link cartao-nome" href="${href}">
        <span class="title ${r.encerrado ? "strike" : ""}">${fmt.escape(p.nome)}</span>
        <span class="meta">${fmt.escape(p.descricao || [p.status, p.tipo].filter(Boolean).join(", "))}</span>
      </a>
      ${r.faturado
        ? `<span class="item-valor voz valor-bom">${fmt.moeda(r.faturado)}<small>já faturado</small></span>`
        : r.metaMensal ? `<span class="item-valor voz">${fmt.moeda(r.metaMensal)}<small>estimado por mês</small></span>`
        : `<span class="item-valor"><small>${fmt.escape(p.status || "")}</small></span>`}
      <span class="item-info">
        ${UI.info(fmt.escape(p.status || "sem status"), p.status === "concluído" ? "bem" : "")}
        ${p.tipo ? UI.info(fmt.escape(p.tipo)) : ""}
        ${p.deadline ? UI.info(`${fmt.escape(fmt.data(p.deadline))}${r.urgencia ? `, ${fmt.escape(r.urgencia.rotulo)}` : ""}`, tomPrazo) : ""}
        ${r.faturado && r.metaMensal ? UI.info(`${fmt.moeda(r.metaMensal)} por mês estimados`) : ""}
        ${r.custoTotal ? UI.info(`custos ${fmt.moeda(r.custoTotal)}`) : ""}
        ${proxima
          ? UI.info(`<b>próxima etapa:</b> ${fmt.escape(proxima.texto)}`)
          : UI.info(r.passos.total ? "todas as etapas concluídas" : "sem etapas ainda", r.passos.total ? "bem" : "")}
      </span>
      ${r.passos.total ? `<span class="cartao-barra" style="--cor-barra:var(--s-projetos)" title="${r.passos.feitos} de ${r.passos.total} etapas"><i style="width:${(r.passos.feitos / r.passos.total) * 100}%"></i></span>` : ""}
      <span class="row-actions">
        <button class="btn ghost sm" data-editar type="button">Editar</button>
        <button class="btn ghost sm" data-excluir type="button">Excluir</button>
      </span>`;

    li.querySelector("[data-editar]").addEventListener("click", () => editarProjeto(p));
    li.querySelector("[data-excluir]").addEventListener("click", () => excluir("projetos", p, "Projeto"));
    return li;
  }

  function renderOportunidades() {
    const box = document.getElementById("oportunidades");
    box.innerHTML = "";
    const lista = oportunidades();
    document.getElementById("oportunidades-resumo").textContent = lista.length
      ? `${lista.length === 1 ? "1 ideia anotada" : `${lista.length} ideias anotadas`}: ${lista.map((o) => o.nome || o.titulo || o.descricao).filter(Boolean).slice(0, 3).join(", ")}`
      : "Ideias que ainda não viraram projeto";

    if (!lista.length) {
      box.appendChild(
        UI.vazio({
          icone: "◈",
          titulo: "Nenhuma oportunidade anotada",
          texto: "Anote ideias de renda antes de decidir tocá-las: monitoria, cursinho, revisão de artigos, plantões. Quando decidir seguir, vire projeto com um clique.",
          rotuloAcao: "Anotar oportunidade",
          aoAcionar: novaOportunidade,
        })
      );
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list";
    lista.forEach((o) => {
      const li = document.createElement("li");
      li.innerHTML = `
        ${UI.marcaItem({ icone: "lampada" })}
        <span class="grow">
          <span class="title">${fmt.escape(o.descricao)}</span>
          <span class="item-info">${[
            o.potencial ? UI.info(`retorno: ${fmt.escape(o.potencial)}`) : "",
            o.esforco ? UI.info(`esforço: ${fmt.escape(o.esforco)}`) : "",
            o.area ? UI.info(fmt.escape(o.area)) : "",
          ].join("") || UI.info("sem detalhes")}</span>
        </span>
        <span class="row-actions">
          <button class="btn ghost sm" data-virar>Virar projeto</button>
          <button class="btn ghost sm" data-editar>Editar</button>
          <button class="btn ghost sm" data-excluir>Excluir</button>
        </span>`;
      li.querySelector("[data-virar]").addEventListener("click", () => virarProjeto(o));
      li.querySelector("[data-editar]").addEventListener("click", () => editarOportunidade(o));
      li.querySelector("[data-excluir]").addEventListener("click", () => excluir("oportunidades", o, "Oportunidade"));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  /* --------------------------------- Ações ---------------------------------- */

  // Formulário curto, para criar rápido. A ficha completa (cliente, custos,
  // documentos, anotações) fica na página do projeto.
  const camposProjeto = () => [
    { nome: "nome", rotulo: "Nome do projeto", tipo: "text", obrigatorio: true, placeholder: "Ex.: Monitoria de fisiologia" },
    { nome: "status", rotulo: "Situação", tipo: "select", opcoes: ["planejamento", "em andamento", "pausado", "concluído", "arquivado"] },
    { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: ["monitoria", "cursinho", "freelance", "conteúdo", "consultoria", "plantão", "produto", "outro"] },
    { nome: "descricao", rotulo: "Descrição", tipo: "textarea", placeholder: "O que é, para quem, como cobra…" },
    { nome: "rendaEstimada", rotulo: "Renda estimada por mês (R$)", tipo: "dinheiro", dica: "Quanto você espera que renda quando estiver rodando." },
    { nome: "deadline", rotulo: "Prazo", tipo: "date" },
  ];

  const camposOportunidade = () => [
    { nome: "descricao", rotulo: "Oportunidade", tipo: "text", obrigatorio: true, placeholder: "Ex.: Revisar artigos para colegas" },
    { nome: "potencial", rotulo: "Retorno estimado", tipo: "text", placeholder: "Ex.: R$ 600/mês" },
    { nome: "esforco", rotulo: "Esforço", tipo: "select", opcoes: ["baixo", "médio", "alto"] },
    { nome: "anotacoes", rotulo: "Anotações", tipo: "textarea" },
  ];

  const projetoNovo = (v) => ({ ...v, passos: [], recebimentos: [], custos: [], anexos: [] });

  async function novoProjeto() {
    const v = await UI.formulario({
      titulo: "Novo projeto",
      descricao: "Uma iniciativa pessoal que gera (ou vai gerar) renda.",
      campos: camposProjeto(),
    });
    if (!v) return;
    // Vai direto para a página do projeto: é lá que se preenche o resto
    // (cliente, etapas, recebimentos, documentos).
    const novo = Store.inserir("projetos", projetoNovo(v));
    location.href = `projeto.html?id=${encodeURIComponent(novo.id)}`;
  }

  async function editarProjeto(p) {
    const v = await UI.formulario({ titulo: "Editar projeto", campos: camposProjeto(), valores: p });
    if (!v) return;
    Store.atualizar("projetos", p.id, v);
    UI.toast("Projeto atualizado.");
    render();
  }

  async function novaOportunidade() {
    const v = await UI.formulario({
      titulo: "Nova oportunidade",
      descricao: "Uma ideia de renda para avaliar depois.",
      campos: camposOportunidade(),
    });
    if (!v) return;
    Store.inserir("oportunidades", v);
    UI.toast("Oportunidade anotada.");
    render();
  }

  async function editarOportunidade(o) {
    const v = await UI.formulario({ titulo: "Editar oportunidade", campos: camposOportunidade(), valores: o });
    if (!v) return;
    Store.atualizar("oportunidades", o.id, v);
    UI.toast("Oportunidade atualizada.");
    render();
  }

  // Promove uma ideia a projeto, aproveitando o que já foi anotado.
  async function virarProjeto(o) {
    const v = await UI.formulario({
      titulo: "Virar projeto",
      descricao: "A oportunidade sai da lista de ideias e passa a ser acompanhada por etapas.",
      campos: camposProjeto(),
      valores: { nome: o.descricao, status: "planejamento", descricao: o.anotacoes || "" },
      rotuloConfirmar: "Criar projeto",
    });
    if (!v) return;
    Store.inserir("projetos", projetoNovo(v));
    const indice = Store.indiceDe("oportunidades", o.id);
    Store.remover("oportunidades", o.id);
    render();
    UI.toast("Virou projeto.", {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.restaurar("oportunidades", o, indice); render(); },
    });
  }

  async function excluir(caminho, item, rotulo) {
    const resumos = (item.resumos || []).length;
    if (resumos && !await UI.confirmar({ titulo: `Excluir ${rotulo.toLowerCase()} "${item.nome}"?`, descricao: `${resumos} ${resumos === 1 ? "resumo também será apagado" : "resumos também serão apagados"} com o projeto.`, rotuloConfirmar: "Excluir", perigo: true })) return;
    const indice = Store.indiceDe(caminho, item.id);
    Store.remover(caminho, item.id);
    render();
    UI.toast(`${rotulo} excluíd${rotulo === "Oportunidade" ? "a" : "o"}.`, {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.restaurar(caminho, item, indice); render(); },
    });
  }

  document.getElementById("btn-projeto").addEventListener("click", novoProjeto);
  document.getElementById("btn-oportunidade").addEventListener("click", novaOportunidade);

  render();
})();
