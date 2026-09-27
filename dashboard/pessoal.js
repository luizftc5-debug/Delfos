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

    renderLista(todos);
    UI.montarLayout("pessoal");
  }

  function renderLista(todos) {
    const box = document.getElementById("lista");
    box.innerHTML = "";
    const visiveis = todos
      .filter((c) => verConcluidos || !c.concluido)
      .sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999"));

    if (!visiveis.length) {
      box.appendChild(
        UI.vazio({
          icone: "●",
          titulo: todos.length ? "Nada em aberto" : "Nenhum compromisso pessoal ainda",
          texto: "Consulta médica, levar o carro pra revisão, comprar algo específico — registre aqui o que não é financeiro, faculdade ou projeto.",
          rotuloAcao: "Adicionar compromisso",
          aoAcionar: novoCompromisso,
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
          <span class="meta">${fmt.escape(c.tipo || "compromisso")}${c.local ? `, ${fmt.escape(c.local)}` : ""}, ${fmt.data(c.data)}</span>
        </span>
        <span class="badge ${c.concluido ? "feito" : u.nivel}">${c.concluido ? "concluído" : u.rotulo}</span>
        <span class="row-actions">
          <button class="btn ghost sm" data-editar>Editar</button>
          <button class="btn ghost sm" data-excluir>Excluir</button>
        </span>`;
      li.querySelector("input").addEventListener("change", (ev) => {
        Store.atualizar(CAMINHO, c.id, { concluido: ev.target.checked });
        render();
      });
      li.querySelector("[data-editar]").addEventListener("click", () => editarCompromisso(c));
      li.querySelector("[data-excluir]").addEventListener("click", () => excluirCompromisso(c));
      ul.appendChild(li);
    });
    box.appendChild(ul);
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

  render();
})();
