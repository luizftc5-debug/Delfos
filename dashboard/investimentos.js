/* Investimentos — carteira separada dos lançamentos do dia a dia. */

(() => {
  UI.iniciarPagina("investimentos");

  const { fmt } = UI;
  const CAMINHO = "financeiro.investimentos";

  function render() {
    const lista = Store.lista(CAMINHO);
    const t = Financas.totalInvestimentos();

    document.getElementById("s-aplicado").textContent = fmt.moeda(t.aplicado);
    document.getElementById("s-aplicado-d").textContent = `${lista.length} ${lista.length === 1 ? "investimento" : "investimentos"}`;

    document.getElementById("s-atual").textContent = fmt.moeda(t.atual);
    document.getElementById("s-atual-d").textContent = "valor de hoje, informado por você";

    const elGanho = document.getElementById("s-ganho");
    elGanho.textContent = `${t.ganho >= 0 ? "+" : "−"}${fmt.moeda(Math.abs(t.ganho))}`;
    elGanho.className = `stat-value num delta ${t.ganho >= 0 ? "up" : "down"}`;
    document.getElementById("s-ganho-d").textContent = t.aplicado > 0 ? `${t.percentual >= 0 ? "+" : ""}${UI.fmt.decimal(t.percentual)}% sobre o aplicado` : "Cadastre o valor aplicado para calcular";

    const tipos = new Set(lista.map((i) => i.tipo).filter(Boolean));
    document.getElementById("s-tipos").textContent = tipos.size;
    document.getElementById("s-tipos-d").textContent = tipos.size ? [...tipos].join(", ") : "Nenhum tipo ainda";

    renderPorTipo(lista);
    renderLista(lista);
    UI.montarLayout("investimentos");
  }

  function renderPorTipo(lista) {
    const box = document.getElementById("por-tipo");
    box.innerHTML = "";
    if (!lista.length) {
      box.appendChild(UI.vazio({ icone: "◍", titulo: "Nenhum investimento cadastrado", texto: "Cadastre onde seu dinheiro está aplicado para ver a distribuição por tipo." }));
      return;
    }
    const porTipo = {};
    lista.forEach((i) => {
      const chave = i.tipo || "Outro";
      porTipo[chave] = (porTipo[chave] || 0) + (Number(i.valorAtual ?? i.valorAplicado) || 0);
    });
    const linhas = Object.entries(porTipo).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
    UI.barras(box, { linhas, cor: "var(--s-financeiro)" });
  }

  function renderLista(lista) {
    const box = document.getElementById("lista");
    box.innerHTML = "";
    document.getElementById("resumo").textContent = lista.length ? `${lista.length} ${lista.length === 1 ? "investimento" : "investimentos"}` : "";

    if (!lista.length) {
      const card = document.createElement("div");
      card.className = "card";
      card.appendChild(
        UI.vazio({
          icone: "◈",
          titulo: "Sua carteira está vazia",
          texto: "Cadastre renda fixa, ações, fundos, cripto ou previdência — o que já aplicou e quanto vale hoje.",
          rotuloAcao: "Cadastrar investimento",
          aoAcionar: novoInvestimento,
        })
      );
      box.appendChild(card);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "grid g3";
    lista
      .slice()
      .sort((a, b) => (Number(b.valorAtual ?? b.valorAplicado) || 0) - (Number(a.valorAtual ?? a.valorAplicado) || 0))
      .forEach((inv) => {
        const r = Financas.rentabilidade(inv);
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <div class="card-head" style="align-items:flex-start; margin-bottom:8px;">
            <div style="min-width:0;">
              <h3 class="card-title" style="font-size:14px;"><span class="swatch financeiro"></span>${fmt.escape(inv.nome)}</h3>
              <div class="card-note" style="margin-top:3px;">${fmt.escape(inv.tipo || "Outro")}${inv.instituicao ? ` · ${fmt.escape(inv.instituicao)}` : ""}</div>
            </div>
            <span class="row-actions">
              <button class="btn ghost sm" data-editar>Editar</button>
              <button class="btn ghost sm" data-excluir>Excluir</button>
            </span>
          </div>
          <div class="stat-value num" style="font-size:22px;">${fmt.moeda(Number(inv.valorAtual ?? inv.valorAplicado) || 0)}</div>
          <div class="stat-sub delta ${r.ganho >= 0 ? "up" : "down"}">
            ${r.ganho >= 0 ? "▲" : "▼"} ${fmt.moeda(Math.abs(r.ganho))} (${r.percentual >= 0 ? "+" : ""}${UI.fmt.decimal(r.percentual)}%)
          </div>
          <div class="stat-sub">aplicado ${fmt.moeda(Number(inv.valorAplicado) || 0)}${inv.dataAplicacao ? ` em ${fmt.data(inv.dataAplicacao)}` : ""}</div>
          ${inv.observacoes ? `<div class="stat-sub" style="margin-top:8px;">${fmt.escape(inv.observacoes)}</div>` : ""}`;
        card.querySelector("[data-editar]").addEventListener("click", () => editarInvestimento(inv));
        card.querySelector("[data-excluir]").addEventListener("click", () => excluir(inv));
        grid.appendChild(card);
      });
    box.appendChild(grid);
  }

  /* --------------------------------- Ações ---------------------------------- */

  const campos = () => [
    { nome: "nome", rotulo: "Nome", tipo: "text", obrigatorio: true, placeholder: "Ex.: Tesouro Selic 2029" },
    { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: Financas.TIPOS_INVESTIMENTO },
    { nome: "instituicao", rotulo: "Instituição", tipo: "text", placeholder: "Banco, corretora…" },
    { nome: "valorAplicado", rotulo: "Valor aplicado (R$)", tipo: "dinheiro", obrigatorio: true },
    { nome: "valorAtual", rotulo: "Valor atual (R$)", tipo: "dinheiro", dica: "Deixe igual ao aplicado se ainda não tiver o valor de hoje." },
    { nome: "dataAplicacao", rotulo: "Data da aplicação", tipo: "date" },
    { nome: "observacoes", rotulo: "Observações", tipo: "textarea", placeholder: "Vencimento, taxa, liquidez…" },
  ];

  async function novoInvestimento() {
    const v = await UI.formulario({ titulo: "Novo investimento", descricao: "O que você já aplicou e onde.", campos: campos() });
    if (!v) return;
    if (v.valorAtual === null || v.valorAtual === "") v.valorAtual = v.valorAplicado;
    Store.inserir(CAMINHO, v);
    UI.toast("Investimento cadastrado.");
    render();
  }

  async function editarInvestimento(inv) {
    const v = await UI.formulario({ titulo: "Editar investimento", campos: campos(), valores: inv });
    if (!v) return;
    if (v.valorAtual === null || v.valorAtual === "") v.valorAtual = v.valorAplicado;
    Store.atualizar(CAMINHO, inv.id, v);
    UI.toast("Investimento atualizado.");
    render();
  }

  function excluir(inv) {
    const indice = Store.indiceDe(CAMINHO, inv.id);
    Store.remover(CAMINHO, inv.id);
    render();
    UI.toast("Investimento excluído.", {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.restaurar(CAMINHO, inv, indice); render(); },
    });
  }

  document.getElementById("btn-investimento").addEventListener("click", novoInvestimento);

  render();
})();
