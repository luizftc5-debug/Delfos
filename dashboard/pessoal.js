/* Pessoal — compromissos e recados que não pertencem aos outros três pilares. */

(() => {
  UI.iniciarPagina("pessoal");

  const { fmt } = UI;
  const CAMINHO = "pessoal.compromissos";
  const TIPOS = ["consulta", "tarefa", "compromisso", "recado", "outro"];
  let verConcluidos = false;

  const lista = () => Store.lista(CAMINHO);

  function render() {
    const todos = lista();
    const abertos = todos.filter((c) => !c.concluido);
    const atrasados = abertos.filter((c) => (UI.diasAte(c.data) ?? 0) < 0);
    const semana = abertos.filter((c) => {
      const d = UI.diasAte(c.data);
      return d !== null && d >= 0 && d <= 7;
    });

    document.getElementById("s-abertos").textContent = abertos.length;
    document.getElementById("s-abertos-d").textContent = `${todos.length} ${todos.length === 1 ? "registro no total" : "registros no total"}`;

    document.getElementById("s-semana").textContent = semana.length;
    document.getElementById("s-semana-d").textContent = semana[0] ? `próximo: ${fmt.escape(semana[0].descricao)}` : "nada nos próximos 7 dias";

    const elAtr = document.getElementById("s-atrasados");
    elAtr.textContent = atrasados.length;
    elAtr.className = `stat-value num ${atrasados.length ? "delta down" : ""}`;
    document.getElementById("s-atrasados-d").textContent = atrasados.length ? "vale reagendar ou concluir" : "nada atrasado";

    const L = Leituras.pessoal();
    document.getElementById("leitura").innerHTML = L.frase;
    UI.renderNotas(document.getElementById("notas"), L.notas, abertos.length
      ? "Nada atrasado nem colidindo com prova ou prazo de outra área."
      : "Quando houver compromissos, o Delfos avisa o que ficou para trás e o que cai no mesmo dia de uma prova ou prazo.");
    renderPorTipo(abertos);
    renderChips(todos);
    UI.renderPerguntas(document.getElementById("sec-perguntas"), document.getElementById("perguntas"), "pessoal", perguntas(abertos), render);

    renderLista(todos);
    UI.montarLayout("pessoal");
  }

  let filtroTipo = "todos";

  function renderChips(todos) {
    const tipos = [...new Set(todos.map((c) => c.tipo || "compromisso"))];
    const box = document.getElementById("f-tipo");
    box.hidden = tipos.length < 2;
    box.innerHTML = ["todos", ...tipos].map((t) => `<button type="button" class="chip" data-tipo="${fmt.escape(t)}" aria-pressed="${t === filtroTipo}">${t === "todos" ? "Tudo" : fmt.escape(fmt.capitalizar(t))}</button>`).join("");
  }

  function renderPorTipo(abertos) {
    const cont = {};
    abertos.forEach((c) => { const t = c.tipo || "compromisso"; cont[t] = (cont[t] || 0) + 1; });
    const linhas = Object.entries(cont).sort((a, b) => b[1] - a[1]).map(([nome, valor]) => ({ nome: fmt.capitalizar(nome), valor }));
    const box = document.getElementById("por-tipo");
    if (!linhas.length) box.innerHTML = `<p class="card-note" style="margin:0;">Nada em aberto.</p>`;
    else UI.barrasComMeta(box, linhas, { cor: "var(--s-pessoal)", formatar: (v) => String(v) });
  }

  // Agrupa por quando: o que ficou para trás, hoje, esta semana, as próximas
  // três semanas, mais adiante e sem data.
  function grupoDe(c) {
    if (c.concluido) return "concluidos";
    const d = UI.diasAte(c.data);
    if (d === null) return "semData";
    if (d < 0) return "atrasados";
    if (d === 0) return "hoje";
    if (d <= 7) return "semana";
    if (d <= 28) return "proximas";
    return "depois";
  }
  const GRUPOS = [
    ["atrasados", "Ficaram para trás"], ["hoje", "Hoje"], ["semana", "Nos próximos 7 dias"],
    ["proximas", "Nas próximas semanas"], ["depois", "Mais adiante"], ["semData", "Sem data"], ["concluidos", "Concluídos"],
  ];

  function renderLista(todos) {
    const box = document.getElementById("lista");
    box.innerHTML = "";
    const visiveis = todos
      .filter((c) => verConcluidos || !c.concluido)
      .filter((c) => filtroTipo === "todos" || (c.tipo || "compromisso") === filtroTipo)
      .sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999"));

    if (!visiveis.length) {
      box.appendChild(
        UI.vazio({
          icone: "pessoal",
          titulo: todos.length ? "Nada em aberto aqui" : "Nenhum compromisso pessoal ainda",
          texto: "Consulta médica, levar o carro pra revisão, comprar algo específico: registre aqui o que não é financeiro, faculdade ou projeto.",
          rotuloAcao: "Adicionar compromisso",
          aoAcionar: novoCompromisso,
        })
      );
      return;
    }

    GRUPOS.forEach(([chave, titulo]) => {
      const doGrupo = visiveis.filter((c) => grupoDe(c) === chave);
      if (!doGrupo.length) return;
      const g = document.createElement("div");
      g.className = "grupo-tempo";
      g.innerHTML = `<h3 class="grupo-tempo-titulo ${chave === "atrasados" ? "alerta" : ""}">${titulo} <span>${doGrupo.length}</span></h3>`;
      const ul = document.createElement("ul");
      ul.className = "list";
      doGrupo.forEach((c) => {
        const u = UI.urgencia(c.data);
        const li = document.createElement("li");
        li.innerHTML = `
          <input type="checkbox" class="check" ${c.concluido ? "checked" : ""} aria-label="Marcar como concluído" />
          <span class="grow">
            <span class="title ${c.concluido ? "strike" : ""}">${fmt.escape(c.descricao)}</span>
            <span class="meta">${fmt.escape([fmt.capitalizar(c.tipo || "compromisso"), c.local, c.data ? fmt.dataPorExtenso(c.data) : ""].filter(Boolean).join(", "))}</span>
          </span>
          <span class="badge ${c.concluido ? "feito" : u.nivel}">${c.concluido ? "concluído" : u.rotulo}</span>
          <span class="row-actions">
            <button class="btn ghost sm icon" data-editar title="Editar" aria-label="Editar">${UI.icone("editar")}</button>
            <button class="btn ghost sm icon" data-excluir title="Excluir" aria-label="Excluir">${UI.icone("lixeira")}</button>
          </span>`;
        li.querySelector("input").addEventListener("change", (ev) => {
          Store.atualizar(CAMINHO, c.id, { concluido: ev.target.checked });
          render();
        });
        li.querySelector("[data-editar]").addEventListener("click", () => editarCompromisso(c));
        li.querySelector("[data-excluir]").addEventListener("click", () => excluirCompromisso(c));
        ul.appendChild(li);
      });
      g.appendChild(ul);
      box.appendChild(g);
    });
  }

  function perguntas(abertos) {
    const q = [];
    const feito = (msg) => { UI.toast(msg); render(); };
    const semLocal = abertos.find((c) => c.tipo === "consulta" && !c.local);
    if (semLocal) q.push({
      id: `local:${semLocal.id}`,
      texto: `Onde vai ser “${semLocal.descricao}”?`,
      apoio: "Com o local, o compromisso aparece completo na agenda e dá para planejar o deslocamento.",
      controle: () => UI.resposta.valor({ texto: true, rotulo: "Salvar", placeholder: "Clínica, hospital, endereço", aoSalvar: (v) => { Store.atualizar(CAMINHO, semLocal.id, { local: v }); feito("Local salvo."); } }),
    });
    const atrasado = abertos.find((c) => c.data && UI.diasAte(c.data) < 0);
    if (atrasado) q.push({
      id: `atrasado:${atrasado.id}`,
      texto: `“${atrasado.descricao}” aconteceu?`,
      apoio: `Estava marcado para ${fmt.dataPorExtenso(atrasado.data)}.`,
      controle: () => UI.resposta.botoes([
        ["Sim, concluir", () => { Store.atualizar(CAMINHO, atrasado.id, { concluido: true }); feito("Concluído."); }, true],
        ["Remarcar", () => editarCompromisso(atrasado)],
      ]),
    });
    return q;
  }

  /* --------------------------------- Ações ---------------------------------- */

  const campos = () => [
    { nome: "descricao", rotulo: "O que é", tipo: "text", obrigatorio: true, placeholder: "Ex.: Consulta com o cardiologista" },
    { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valorPadrao: UI.hojeISO() },
    { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: TIPOS },
    { nome: "local", rotulo: "Local", tipo: "text", placeholder: "Ex.: Clínica, oficina, endereço…" },
    { nome: "observacoes", rotulo: "Observações", tipo: "textarea" },
  ];

  async function novoCompromisso() {
    const v = await UI.formulario({ titulo: "Novo compromisso pessoal", campos: campos() });
    if (!v) return;
    Store.inserir(CAMINHO, { ...v, concluido: false });
    UI.toast("Compromisso cadastrado.");
    render();
  }

  async function editarCompromisso(c) {
    const v = await UI.formulario({ titulo: "Editar compromisso", campos: campos(), valores: c });
    if (!v) return;
    Store.atualizar(CAMINHO, c.id, v);
    UI.toast("Compromisso atualizado.");
    render();
  }

  function excluirCompromisso(c) {
    const indice = Store.indiceDe(CAMINHO, c.id);
    Store.remover(CAMINHO, c.id);
    render();
    UI.toast("Compromisso excluído.", {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.restaurar(CAMINHO, c, indice); render(); },
    });
  }

  document.getElementById("btn-compromisso").addEventListener("click", novoCompromisso);
  document.getElementById("f-concluidos").addEventListener("change", (ev) => { verConcluidos = ev.target.checked; render(); });
  document.getElementById("f-tipo").addEventListener("click", (ev) => {
    const c = ev.target.closest("[data-tipo]");
    if (!c) return;
    filtroTipo = c.dataset.tipo;
    render();
  });

  render();
})();
