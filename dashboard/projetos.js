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
    document.getElementById("s-renda").textContent = renda ? fmt.moeda(renda) : "—";
    document.getElementById("s-renda-d").textContent = renda
      ? "Por mês, somando os projetos ativos"
      : "Informe a renda estimada de cada projeto";

    const faturado = lista.reduce((s, p) => s + UI.resumoProjeto(p).faturado, 0);
    document.getElementById("s-faturado").textContent = faturado ? fmt.moeda(faturado) : "—";
    document.getElementById("s-faturado-d").textContent = faturado
      ? "Total já recebido nestes projetos"
      : "Registre os recebimentos dentro de cada projeto";

    const passos = lista.flatMap((p) => p.passos || []);
    const feitos = passos.filter((s) => s.feito).length;
    document.getElementById("s-etapas").textContent = passos.length ? `${feitos}/${passos.length}` : "—";
    document.getElementById("s-etapas-d").textContent = passos.length
      ? `${Math.round((feitos / passos.length) * 100)}% do planejado`
      : "Quebre os projetos em etapas";

    renderProjetos();
    renderOportunidades();
    UI.montarLayout("projetos");
  }

  function renderProjetos() {
    const box = document.getElementById("projetos");
    box.innerHTML = "";
    const lista = projetos();

    if (!lista.length) {
      const card = document.createElement("div");
      card.className = "card";
      card.appendChild(
        UI.vazio({
          icone: "◇",
          titulo: "Nenhum projeto cadastrado",
          texto: "Aqui entram iniciativas que trazem dinheiro — monitoria, cursinho, plantões, conteúdo, freelas. Trabalhos da faculdade e o TCC ficam na aba Faculdade.",
          rotuloAcao: "Criar primeiro projeto",
          aoAcionar: novoProjeto,
        })
      );
      box.appendChild(card);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "grid g2";
    lista
      .slice()
      .sort((a, b) => {
        const fim = (p) => p.status === "concluído" || p.status === "arquivado";
        if (fim(a) !== fim(b)) return fim(a) ? 1 : -1;
        return (a.deadline || "9999").localeCompare(b.deadline || "9999");
      })
      .forEach((p) => grid.appendChild(cartaoProjeto(p)));

    box.appendChild(grid);
  }

  /**
   * Cartão-resumo. O detalhe todo (recebimentos, custos, documentos, ficha)
   * mora em projeto.html — aqui fica só o que se lê de relance, com a próxima
   * etapa em aberto servindo de "e agora?".
   */
  function cartaoProjeto(p) {
    const card = document.createElement("div");
    card.className = "card";
    const r = UI.resumoProjeto(p);
    const href = `projeto.html?id=${encodeURIComponent(p.id)}`;
    const proxima = (p.passos || []).find((s) => !s.feito);

    card.innerHTML = `
      <div class="card-head" style="align-items:flex-start;">
        <div style="min-width:0;">
          <h2 class="card-title" style="font-size:15px;">
            <span class="swatch projetos"></span>
            <a class="titulo-link ${r.encerrado ? "strike" : ""}" href="${href}">${fmt.escape(p.nome)}</a>
          </h2>
          <div class="stat-sub" style="margin-top:5px; display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <span class="badge ${p.status === "concluído" ? "feito" : ""}">${fmt.escape(p.status)}</span>
            ${p.tipo ? `<span class="badge projetos">${fmt.escape(p.tipo)}</span>` : ""}
            ${r.urgencia ? `<span class="badge ${r.urgencia.nivel}">${r.urgencia.rotulo}</span>` : ""}
            ${p.deadline ? `<span class="muted">${fmt.data(p.deadline)}</span>` : ""}
          </div>
        </div>
        <span class="row-actions" style="opacity:1;">
          <button class="btn ghost sm" data-editar>Editar</button>
          <button class="btn ghost sm" data-excluir>Excluir</button>
        </span>
      </div>

      ${p.descricao ? `<p class="card-note" style="margin:0 0 12px;">${fmt.escape(p.descricao)}</p>` : ""}

      ${(r.metaMensal || r.faturado) ? `
        <div class="mini-stats">
          ${r.metaMensal ? `<div><div class="stat-label">Renda estimada</div><div class="mini-valor num">${fmt.moeda(r.metaMensal)}<span class="muted" style="font-weight:400;">/mês</span></div></div>` : ""}
          ${r.faturado ? `<div><div class="stat-label">Já faturado</div><div class="mini-valor num" style="color:var(--success-text);">${fmt.moeda(r.faturado)}</div></div>` : ""}
          ${r.custoTotal ? `<div><div class="stat-label">Custos</div><div class="mini-valor num">${fmt.moeda(r.custoTotal)}</div></div>` : ""}
        </div>` : ""}

      <div data-progresso></div>

      <p class="card-note" style="margin:10px 0 0;">
        ${proxima
          ? `<b style="font-weight:640; color:var(--texto-2);">Próxima etapa:</b> ${fmt.escape(proxima.texto)}`
          : r.passos.total
            ? "Todas as etapas concluídas."
            : "Sem etapas ainda — abra o projeto para quebrá-lo em passos."}
      </p>

      <a class="btn sm" href="${href}" style="margin-top:12px;">Abrir projeto</a>`;

    if (r.passos.total) {
      card.querySelector("[data-progresso]").appendChild(
        UI.medidor({
          rotulo: "Progresso",
          atual: r.passos.feitos,
          alvo: r.passos.total,
          formatar: (n) => `${n}`,
          sufixo: " etapas",
          cor: "var(--s-projetos)",
        })
      );
    }

    card.querySelector("[data-editar]").addEventListener("click", () => editarProjeto(p));
    card.querySelector("[data-excluir]").addEventListener("click", () => excluir("projetos", p, "Projeto"));
    return card;
  }

  function renderOportunidades() {
    const box = document.getElementById("oportunidades");
    box.innerHTML = "";
    const lista = oportunidades();

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
        <span class="grow">
          <span class="title">${fmt.escape(o.descricao)}</span>
          <span class="meta">${[o.potencial && `retorno: ${o.potencial}`, o.esforco && `esforço: ${o.esforco}`]
            .filter(Boolean).map(fmt.escape).join(" · ") || "sem detalhes"}</span>
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

  function excluir(caminho, item, rotulo) {
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
