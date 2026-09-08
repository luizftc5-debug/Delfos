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

  /* --------------------------------- Render --------------------------------- */

  function render() {
    pilar = Store.achar(CAMINHO, id);
    if (!pilar) return (location.href = "index.html");

    document.title = `${pilar.nome} · ${UI.NOME}`;

    // A cor da aba é um hex do usuário, então entra como variável na página:
    // .card.tinted e .swatch já leem --tint.
    const raiz = document.getElementById("conteudo");
    raiz.style.setProperty("--tint", pilar.cor);

    const etiqueta = document.getElementById("etiqueta");
    etiqueta.textContent = `${pilar.icone} sua aba`;
    etiqueta.style.color = pilar.cor;
    document.getElementById("swatch-lista").style.background = pilar.cor;

    document.getElementById("titulo").textContent = pilar.nome;
    document.getElementById("subtitulo").textContent =
      pilar.descricao || "Cadastre aqui o que pertence a esta aba — entra na agenda da visão geral junto com os outros pilares.";

    const todos = itens();
    const abertos = todos.filter((c) => !c.concluido);
    const atrasados = abertos.filter((c) => (UI.diasAte(c.data) ?? 0) < 0);
    const semana = abertos.filter((c) => {
      const d = UI.diasAte(c.data);
      return d !== null && d >= 0 && d <= 7;
    });

    document.getElementById("s-abertos").textContent = abertos.length;
    document.getElementById("s-abertos-d").textContent =
      `${todos.length} ${todos.length === 1 ? "registro no total" : "registros no total"}`;

    // Uma aba fora da agenda (hábitos, coleção…) não tem "esta semana" nem
    // "atrasado" — os mesmos dois cartões passam a mostrar concluídos e total.
    if (pilar.naAgenda) {
      document.getElementById("lbl-semana").textContent = "Nesta semana";
      document.getElementById("s-semana").textContent = semana.length;
      document.getElementById("s-semana-d").textContent = semana[0]
        ? `próximo: ${semana[0].descricao}`
        : "nada nos próximos 7 dias";

      document.getElementById("lbl-atrasados").textContent = "Atrasados";
      const elAtr = document.getElementById("s-atrasados");
      elAtr.textContent = atrasados.length;
      elAtr.className = `stat-value num ${atrasados.length ? "delta down" : ""}`;
      document.getElementById("s-atrasados-d").textContent =
        atrasados.length ? "vale reagendar ou concluir" : "nada atrasado";
    } else {
      const concluidos = todos.filter((c) => c.concluido).length;
      document.getElementById("lbl-semana").textContent = "Concluídos";
      document.getElementById("s-semana").textContent = concluidos;
      document.getElementById("s-semana-d").textContent =
        todos.length ? `${Math.round((concluidos / todos.length) * 100)}% do total` : "";

      document.getElementById("lbl-atrasados").textContent = "Total";
      const elAtr = document.getElementById("s-atrasados");
      elAtr.textContent = todos.length;
      elAtr.className = "stat-value num";
      document.getElementById("s-atrasados-d").textContent =
        todos.length === 1 ? "registro nesta aba" : "registros nesta aba";
    }

    renderLista(todos);
    UI.montarLayout("pilar", { idAtivo: id });
  }

  let verConcluidos = false;

  function renderLista(todos) {
    const box = document.getElementById("lista");
    box.innerHTML = "";
    const visiveis = todos
      .filter((c) => verConcluidos || !c.concluido)
      .sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999"));

    if (!visiveis.length) {
      box.appendChild(
        UI.vazio({
          icone: pilar.icone,
          titulo: todos.length ? "Nada em aberto" : `Nenhum item em ${pilar.nome} ainda`,
          texto: pilar.naAgenda
            ? "Cada item pode ter data e os campos que você configurar — e entra na agenda dos próximos 30 dias da visão geral."
            : "Cada item pode ter data e os campos que você configurar. Esta aba não entra na agenda.",
          rotuloAcao: "Adicionar item",
          aoAcionar: novoItem,
        })
      );
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list";
    visiveis.forEach((c) => {
      const u = UI.urgencia(c.data);
      const li = document.createElement("li");
      const badge = pilar.naAgenda
        ? `<span class="badge ${c.concluido ? "feito" : u.nivel}">${c.concluido ? "concluído" : u.rotulo}</span>`
        : c.concluido ? `<span class="badge feito">concluído</span>` : "";
      li.innerHTML = `
        <input type="checkbox" class="check" ${c.concluido ? "checked" : ""} aria-label="Marcar como concluído" />
        <span class="grow">
          <span class="title ${c.concluido ? "strike" : ""}">${fmt.escape(c.descricao)}</span>
          <span class="meta">${metaLista(c)}</span>
        </span>
        ${badge}
        <span class="row-actions">
          <button class="btn ghost sm" data-editar>Editar</button>
          <button class="btn ghost sm" data-excluir>Excluir</button>
        </span>`;
      li.querySelector("input").addEventListener("change", (ev) => {
        Store.subAtualizar(CAMINHO, id, "itens", c.id, { concluido: ev.target.checked });
        render();
      });
      li.querySelector("[data-editar]").addEventListener("click", () => editarItem(c));
      li.querySelector("[data-excluir]").addEventListener("click", () => excluirItem(c));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  /** Os campos próprios marcados "na lista", formatados, mais a data se houver. */
  function metaLista(c) {
    const partes = (pilar.campos || [])
      .filter((campo) => campo.naLista)
      .map((campo) => {
        const v = (c.extras || {})[campo.id];
        if (v === undefined || v === null || v === "") return "";
        if (campo.tipo === "simNao") return v ? campo.rotulo : "";
        if (campo.tipo === "dinheiro") return fmt.moeda(v);
        return String(v);
      })
      .filter(Boolean)
      .map(fmt.escape);
    if (c.data) partes.push(fmt.data(c.data));
    return partes.join(" · ") || "sem detalhes";
  }

  /* --------------------------------- Ações ---------------------------------- */

  // descricao e data são campos de sistema — o resto vem dos campos próprios
  // da aba (modelo escolhido na criação, ajustáveis em "Campos desta aba").
  const camposItem = () => [
    { nome: "descricao", rotulo: "O que é", tipo: "text", obrigatorio: true, placeholder: `Ex.: algo de ${pilar.nome}` },
    { nome: "data", rotulo: pilar.naAgenda ? "Data" : "Data (opcional)", tipo: "date", obrigatorio: !!pilar.naAgenda, valorPadrao: UI.hojeISO() },
    ...UI.camposItemPilar(pilar),
  ];

  // Separa descricao/data (sistema) do resto (extras), nos dois sentidos.
  const paraExtras = (v) => {
    const { descricao, data, ...resto } = v;
    return { descricao, data, extras: resto };
  };
  const deExtras = (c) => ({ descricao: c.descricao, data: c.data, ...(c.extras || {}) });

  async function novoItem() {
    const v = await UI.formulario({ titulo: `Novo item em ${pilar.nome}`, campos: camposItem() });
    if (!v) return;
    Store.subInserir(CAMINHO, id, "itens", { ...paraExtras(v), concluido: false });
    UI.toast("Item cadastrado.");
    render();
  }

  async function editarItem(c) {
    const v = await UI.formulario({ titulo: "Editar item", campos: camposItem(), valores: deExtras(c) });
    if (!v) return;
    Store.subAtualizar(CAMINHO, id, "itens", c.id, paraExtras(v));
    UI.toast("Item atualizado.");
    render();
  }

  function excluirItem(c) {
    const antes = [...itens()];
    Store.subRemover(CAMINHO, id, "itens", c.id);
    render();
    UI.toast("Item excluído.", {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.atualizar(CAMINHO, id, { itens: antes }); render(); },
    });
  }

  async function editarAba() {
    const v = await UI.formulario({
      titulo: "Editar aba",
      descricao: "Nome, ícone e cor mudam só a aparência — o que você já cadastrou continua onde está.",
      campos: UI.camposPilar(),
      valores: pilar,
    });
    if (!v) return;
    Store.atualizar(CAMINHO, id, v);
    UI.toast("Aba atualizada.");
    render();
  }

  async function excluirAba() {
    const quantos = itens().length;
    const ok = await UI.confirmar({
      titulo: `Excluir a aba "${pilar.nome}"?`,
      descricao: quantos
        ? `Os ${quantos} ${quantos === 1 ? "item cadastrado" : "itens cadastrados"} nela também serão apagados. Isso não pode ser desfeito depois que você sair da página.`
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
  document.getElementById("f-concluidos").addEventListener("change", (ev) => {
    verConcluidos = ev.target.checked;
    render();
  });

  render();
})();
