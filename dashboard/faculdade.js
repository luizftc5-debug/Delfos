/* Faculdade — disciplinas (cada uma com página própria), provas e entregas. */

(() => {
  UI.iniciarPagina("faculdade");

  const { fmt } = UI;
  let verConcluidos = false;

  const disciplinas = () => Store.lista("faculdade.disciplinas");
  const prazos = () => Store.lista("faculdade.prazos");
  const linkDisciplina = (d) => `disciplina.html?id=${encodeURIComponent(d.id)}`;

  /* --------------------------------- Render --------------------------------- */

  function render() {
    const ativas = disciplinas().filter((d) => d.status !== "concluída");
    const abertos = prazos().filter((p) => !p.concluido);
    const atrasados = abertos.filter((p) => (UI.diasAte(p.data) ?? 0) < 0);

    document.getElementById("s-disciplinas").textContent = ativas.length;

    const medias = disciplinas().map(UI.mediaDisciplina).filter(Boolean);
    document.getElementById("s-disciplinas-d").textContent = medias.length
      ? `Média geral: ${UI.fmt.decimal(medias.reduce((s, m) => s + m.media, 0) / medias.length)}`
      : "Nenhuma nota lançada ainda";

    document.getElementById("s-prazos").textContent = abertos.length;
    const dPrazos = document.getElementById("s-prazos-d");
    dPrazos.textContent = atrasados.length ? `${atrasados.length} já ${atrasados.length === 1 ? "venceu" : "venceram"}` : "Nenhum atrasado";
    dPrazos.className = `stat-sub ${atrasados.length ? "delta down" : ""}`;

    const prox = UI.compromissos().filter((i) => i.area === "faculdade" && (UI.diasAte(i.data) ?? -1) >= 0)[0];
    document.getElementById("s-proxima").textContent = prox ? prox.titulo : "Nada agendado";
    document.getElementById("s-proxima-d").innerHTML = prox
      ? `${fmt.data(prox.data)}, <span class="delta flat">${UI.urgencia(prox.data).rotulo}</span>`
      : "Cadastre provas e entregas para acompanhar";

    renderAvisos();
    renderDisciplinas();
    renderPrazos();
    UI.montarLayout("faculdade");
  }

  function renderAvisos() {
    const box = document.getElementById("avisos");
    box.innerHTML = "";
    UI.conflitos()
      .filter((c) => c.itens.some((i) => i.area === "faculdade") && c.itens.length > 1)
      .slice(0, 2)
      .forEach((c) => {
        const el = document.createElement("div");
        el.className = c.multiplasAreas ? "notice warning" : "notice info";
        el.innerHTML = `<span class="ic">▲</span><span><strong>Semana de ${fmt.data(c.semana)}:</strong>
          ${c.itens.map((i) => `${fmt.escape(i.titulo)} <span class="muted">(${fmt.dataCurta(i.data)})</span>`).join(", ")}</span>`;
        box.appendChild(el);
      });
  }

  function renderDisciplinas() {
    const box = document.getElementById("disciplinas");
    box.innerHTML = "";
    const lista = disciplinas();

    if (!lista.length) {
      box.appendChild(
        UI.vazio({
          icone: "▤",
          titulo: "Nenhuma disciplina cadastrada",
          texto: "Cada disciplina ganha uma página própria, com avaliações, prazos, materiais e resumos.",
          rotuloAcao: "Adicionar disciplina",
          aoAcionar: novaDisciplina,
        })
      );
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list";
    lista
      .slice()
      .sort((a, b) => {
        if ((a.status === "concluída") !== (b.status === "concluída")) return a.status === "concluída" ? 1 : -1;
        const pa = UI.proximaAvaliacao(a)?.data || "9999";
        const pb = UI.proximaAvaliacao(b)?.data || "9999";
        return pa.localeCompare(pb);
      })
      .forEach((d) => {
        const media = UI.mediaDisciplina(d);
        const prox = UI.proximaAvaliacao(d);
        const u = prox ? UI.urgencia(prox.data) : null;
        const nPrazos = prazos().filter((p) => p.disciplinaId === d.id && !p.concluido).length;

        const li = document.createElement("li");
        li.innerHTML = `
          <a class="grow linha-link" href="${linkDisciplina(d)}">
            <span class="title ${d.status === "concluída" ? "strike" : ""}">${fmt.escape(d.nome)}</span>
            <span class="meta">${[
              d.professor && `Prof. ${fmt.escape(d.professor)}`,
              `${(d.avaliacoes || []).length} ${(d.avaliacoes || []).length === 1 ? "avaliação" : "avaliações"}`,
              nPrazos ? `${nPrazos} ${nPrazos === 1 ? "prazo aberto" : "prazos abertos"}` : null,
              (d.materiais || []).length ? `${d.materiais.length} ${d.materiais.length === 1 ? "material" : "materiais"}` : null,
              (d.resumos || []).length ? `${d.resumos.length} ${d.resumos.length === 1 ? "resumo" : "resumos"}` : null,
            ].filter(Boolean).join(", ")}</span>
          </a>
          ${media ? `<span class="nota-chip">${UI.fmt.decimal(media.media)}</span>` : ""}
          ${u ? `<span class="badge ${u.nivel}">${u.rotulo}</span>` : ""}
          <span class="row-actions">
            <a class="btn ghost sm" href="${linkDisciplina(d)}">Abrir</a>
            <button class="btn ghost sm" data-excluir>Excluir</button>
          </span>`;
        li.querySelector("[data-excluir]").addEventListener("click", () => excluirDisciplina(d));
        ul.appendChild(li);
      });
    box.appendChild(ul);
  }

  function renderPrazos() {
    const box = document.getElementById("prazos");
    box.innerHTML = "";
    const lista = prazos()
      .filter((p) => verConcluidos || !p.concluido)
      .sort((a, b) => (a.data || "").localeCompare(b.data || ""));

    if (!lista.length) {
      box.appendChild(
        UI.vazio({
          icone: "◷",
          titulo: prazos().length ? "Nenhum prazo em aberto" : "Nenhum prazo cadastrado",
          texto: prazos().length
            ? "Tudo em dia por aqui. Marque a caixa acima para rever os concluídos."
            : "Cadastre entregas, seminários e marcos do TCC. Eles entram na agenda geral junto com os prazos dos projetos.",
          rotuloAcao: prazos().length ? null : "Adicionar prazo",
          aoAcionar: novoPrazo,
        })
      );
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list";
    lista.forEach((p) => {
      const u = UI.urgencia(p.data);
      const disc = p.disciplinaId ? Store.achar("faculdade.disciplinas", p.disciplinaId) : null;
      const li = document.createElement("li");
      li.innerHTML = `
        <input type="checkbox" class="check" ${p.concluido ? "checked" : ""} aria-label="Marcar como concluído" />
        <span class="grow">
          <span class="title ${p.concluido ? "strike" : ""}">${fmt.escape(p.descricao)}</span>
          <span class="meta">${[fmt.escape(p.tipo || "entrega"), disc && fmt.escape(disc.nome), fmt.data(p.data)]
            .filter(Boolean).join(", ")}</span>
        </span>
        <span class="badge ${p.concluido ? "feito" : u.nivel}">${p.concluido ? "concluído" : u.rotulo}</span>
        <span class="row-actions">
          <button class="btn ghost sm" data-editar>Editar</button>
          <button class="btn ghost sm" data-excluir>Excluir</button>
        </span>`;
      li.querySelector("input").addEventListener("change", (ev) => {
        Store.atualizar("faculdade.prazos", p.id, { concluido: ev.target.checked });
        UI.toast(ev.target.checked ? "Prazo concluído." : "Prazo reaberto.");
        render();
      });
      li.querySelector("[data-editar]").addEventListener("click", () => editarPrazo(p));
      li.querySelector("[data-excluir]").addEventListener("click", () => excluir("faculdade.prazos", p, "Prazo"));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  /* --------------------------------- Ações ---------------------------------- */

  const camposDisciplina = () => [
    { nome: "nome", rotulo: "Nome da disciplina", tipo: "text", obrigatorio: true, placeholder: "Ex.: Clínica Médica" },
    { nome: "professor", rotulo: "Professor(a)", tipo: "text" },
    { nome: "mediaMinima", rotulo: "Média para passar", tipo: "number", step: "0.1", placeholder: "7", dica: "Usada para calcular quanto falta tirar. Vazio = 7." },
    { nome: "status", rotulo: "Situação", tipo: "select", opcoes: ["ativa", "concluída", "trancada"] },
  ];

  function camposPrazo() {
    return [
      { nome: "descricao", rotulo: "O que é", tipo: "text", obrigatorio: true, placeholder: "Ex.: Entrega da metanálise" },
      { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valorPadrao: UI.hojeISO() },
      { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: ["entrega", "seminário", "trabalho", "TCC", "outro"] },
      {
        nome: "disciplinaId", rotulo: "Disciplina", tipo: "select",
        opcoes: [{ valor: "", rotulo: "— nenhuma —" }, ...disciplinas().map((d) => ({ valor: d.id, rotulo: d.nome }))],
      },
    ];
  }

  async function novaDisciplina() {
    const v = await UI.formulario({
      titulo: "Nova disciplina",
      descricao: "Ela ganha uma página própria para avaliações, materiais e resumos.",
      campos: camposDisciplina(),
      rotuloConfirmar: "Criar e abrir",
    });
    if (!v) return;
    const nova = Store.inserir("faculdade.disciplinas", { ...v, avaliacoes: [], materiais: [], resumos: [] });
    location.href = linkDisciplina(nova);
  }

  async function novoPrazo() {
    const v = await UI.formulario({ titulo: "Novo prazo", descricao: "Entregas, seminários e marcos do TCC.", campos: camposPrazo() });
    if (!v) return;
    Store.inserir("faculdade.prazos", { ...v, concluido: false });
    UI.toast("Prazo cadastrado.");
    render();
  }

  async function editarPrazo(p) {
    const v = await UI.formulario({ titulo: "Editar prazo", campos: camposPrazo(), valores: p });
    if (!v) return;
    Store.atualizar("faculdade.prazos", p.id, v);
    UI.toast("Prazo atualizado.");
    render();
  }

  // Excluir a disciplina leva junto avaliações, materiais e resumos dela.
  async function excluirDisciplina(d) {
    const conteudo = (d.avaliacoes || []).length + (d.materiais || []).length + (d.resumos || []).length;
    const ok = await UI.confirmar({
      titulo: `Excluir "${d.nome}"?`,
      descricao: conteudo
        ? `A página dela some junto com ${conteudo} ${conteudo === 1 ? "item cadastrado" : "itens cadastrados"} (avaliações, materiais e resumos). Dá para desfazer logo em seguida.`
        : "Dá para desfazer logo em seguida.",
      rotuloConfirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    excluir("faculdade.disciplinas", d, "Disciplina");
  }

  function excluir(caminho, item, rotulo) {
    const indice = Store.indiceDe(caminho, item.id);
    Store.remover(caminho, item.id);
    render();
    UI.toast(`${rotulo} excluíd${rotulo === "Disciplina" ? "a" : "o"}.`, {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.restaurar(caminho, item, indice); render(); },
    });
  }

  document.getElementById("btn-disciplina").addEventListener("click", novaDisciplina);
  document.getElementById("btn-disciplina-2").addEventListener("click", novaDisciplina);
  document.getElementById("btn-prazo").addEventListener("click", novoPrazo);
  document.getElementById("ver-concluidos").addEventListener("change", (e) => {
    verConcluidos = e.target.checked;
    renderPrazos();
  });

  render();
})();
