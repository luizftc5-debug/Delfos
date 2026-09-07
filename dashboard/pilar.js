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

  const TIPOS = ["compromisso", "tarefa", "lembrete", "meta", "outro"];
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

    document.getElementById("s-semana").textContent = semana.length;
    document.getElementById("s-semana-d").textContent = semana[0]
      ? `próximo: ${semana[0].descricao}`
      : "nada nos próximos 7 dias";

    const elAtr = document.getElementById("s-atrasados");
    elAtr.textContent = atrasados.length;
    elAtr.className = `stat-value num ${atrasados.length ? "delta down" : ""}`;
    document.getElementById("s-atrasados-d").textContent =
      atrasados.length ? "vale reagendar ou concluir" : "nada atrasado";

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
          texto: "Cada item tem data, tipo e local — e aparece na agenda dos próximos 30 dias da visão geral.",
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
      li.innerHTML = `
        <input type="checkbox" class="check" ${c.concluido ? "checked" : ""} aria-label="Marcar como concluído" />
        <span class="grow">
          <span class="title ${c.concluido ? "strike" : ""}">${fmt.escape(c.descricao)}</span>
          <span class="meta">${fmt.escape(c.tipo || "compromisso")}${c.local ? ` · ${fmt.escape(c.local)}` : ""} · ${fmt.data(c.data)}</span>
        </span>
        <span class="badge ${c.concluido ? "feito" : u.nivel}">${c.concluido ? "concluído" : u.rotulo}</span>
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

  /* --------------------------------- Ações ---------------------------------- */

  const camposItem = () => [
    { nome: "descricao", rotulo: "O que é", tipo: "text", obrigatorio: true, placeholder: `Ex.: algo de ${pilar.nome}` },
    { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valorPadrao: UI.hojeISO() },
    { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: TIPOS },
    { nome: "local", rotulo: "Local", tipo: "text", placeholder: "Opcional" },
    { nome: "observacoes", rotulo: "Observações", tipo: "textarea" },
  ];

  async function novoItem() {
    const v = await UI.formulario({ titulo: `Novo item em ${pilar.nome}`, campos: camposItem() });
    if (!v) return;
    Store.subInserir(CAMINHO, id, "itens", { ...v, concluido: false });
    UI.toast("Item cadastrado.");
    render();
  }

  async function editarItem(c) {
    const v = await UI.formulario({ titulo: "Editar item", campos: camposItem(), valores: c });
    if (!v) return;
    Store.subAtualizar(CAMINHO, id, "itens", c.id, v);
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
  document.getElementById("btn-excluir-aba").addEventListener("click", excluirAba);
  document.getElementById("f-concluidos").addEventListener("change", (ev) => {
    verConcluidos = ev.target.checked;
    render();
  });

  render();
})();
