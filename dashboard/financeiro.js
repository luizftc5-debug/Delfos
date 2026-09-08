/* Financeiro — planilha de lançamentos, gráficos e metas. */

(() => {
  UI.iniciarPagina("financeiro");

  const { fmt } = UI;
  const filtros = { busca: "", mes: UI.mesAtual(), tipo: "todos", categoria: "todas" };

  /* ------------------------------- Consultas -------------------------------- */

  const transacoes = () => Store.lista("financeiro.transacoes");

  function doMes(chave) {
    return transacoes().filter((t) => (t.data || "").startsWith(chave));
  }

  function totais(lista) {
    const receita = lista.filter((t) => t.tipo === "receita").reduce((s, t) => s + (Number(t.valor) || 0), 0);
    const despesa = lista.filter((t) => t.tipo === "despesa").reduce((s, t) => s + (Number(t.valor) || 0), 0);
    return { receita, despesa, resultado: receita - despesa };
  }

  function mesesDisponiveis() {
    const set = new Set(transacoes().map((t) => (t.data || "").slice(0, 7)).filter(Boolean));
    set.add(UI.mesAtual());
    return [...set].sort();
  }

  function ultimosSeisMeses() {
    const meses = [];
    let chave = UI.mesAtual();
    for (let i = 0; i < 6; i++) {
      meses.unshift(chave);
      chave = UI.mesAnterior(chave);
    }
    return meses.map((c) => {
      const t = totais(doMes(c));
      return { chave: c, receita: t.receita, despesa: t.despesa };
    });
  }

  function filtradas() {
    const busca = filtros.busca.toLowerCase();
    return transacoes()
      .filter((t) => (filtros.mes === "todos" ? true : (t.data || "").startsWith(filtros.mes)))
      .filter((t) => (filtros.tipo === "todos" ? true : t.tipo === filtros.tipo))
      .filter((t) => (filtros.categoria === "todas" ? true : t.categoria === filtros.categoria))
      .filter((t) => (busca ? (t.descricao || "").toLowerCase().includes(busca) : true))
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }

  /* --------------------------------- Render --------------------------------- */

  function render() {
    const e = Store.estado();
    const mes = UI.mesAtual();
    const atual = totais(doMes(mes));
    const anterior = totais(doMes(UI.mesAnterior(mes)));

    // Com contas cadastradas, o saldo é a soma delas — informar à mão deixaria
    // os dois números brigando entre si.
    const temContas = Financas.temContas();
    document.getElementById("s-saldo").textContent = fmt.moeda(Financas.saldoTotal());
    document.getElementById("s-saldo-d").innerHTML = temContas
      ? `Soma de ${Store.lista("financeiro.contas").length} ${Store.lista("financeiro.contas").length === 1 ? "conta" : "contas"} · <a href="contas.html">ver detalhes</a>`
      : "";
    document.getElementById("btn-saldo").classList.toggle("hidden", temContas);

    document.getElementById("s-receitas").textContent = fmt.moeda(atual.receita);
    document.getElementById("s-despesas").textContent = fmt.moeda(atual.despesa);

    const res = document.getElementById("s-resultado");
    res.textContent = fmt.moeda(atual.resultado);
    res.className = `stat-value num delta ${atual.resultado >= 0 ? "up" : "down"}`;
    document.getElementById("s-resultado-d").textContent =
      atual.resultado >= 0 ? "Você fechou o mês no positivo" : "Saiu mais do que entrou";

    delta("s-receitas-d", atual.receita, anterior.receita, true);
    delta("s-despesas-d", atual.despesa, anterior.despesa, false);

    UI.colunasMensais(document.getElementById("grafico-meses"), { meses: ultimosSeisMeses() });
    renderCategorias();
    renderMetas();
    renderFiltros();
    renderTabela();
    UI.montarLayout("financeiro");
  }

  // Comparação com o mês anterior. Em despesas, subir é ruim; em receitas, bom.
  function delta(id, atual, anterior, subirEhBom) {
    const el = document.getElementById(id);
    if (!anterior) { el.textContent = "Sem base de comparação"; el.className = "stat-sub"; return; }
    const dif = atual - anterior;
    const pct = Math.round((dif / anterior) * 100);
    if (dif === 0) { el.textContent = "Igual ao mês anterior"; el.className = "stat-sub"; return; }
    const bom = subirEhBom ? dif > 0 : dif < 0;
    el.className = `stat-sub delta ${bom ? "up" : "down"}`;
    el.textContent = `${dif > 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs. mês anterior`;
  }

  function renderCategorias() {
    const box = document.getElementById("grafico-categorias");
    const mes = filtros.mes === "todos" ? UI.mesAtual() : filtros.mes;
    document.getElementById("cat-periodo").textContent = fmt.mesRotulo(mes);

    const despesas = doMes(mes).filter((t) => t.tipo === "despesa");
    if (!despesas.length) {
      box.innerHTML = "";
      box.appendChild(UI.vazio({ icone: "◍", titulo: "Sem despesas no período", texto: "Os gastos aparecem aqui agrupados por categoria." }));
      return;
    }

    const porCategoria = {};
    despesas.forEach((t) => {
      porCategoria[t.categoria || "Outros"] = (porCategoria[t.categoria || "Outros"] || 0) + (Number(t.valor) || 0);
    });

    const linhas = Object.entries(porCategoria)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);

    UI.barras(box, { linhas, cor: "var(--s-projetos)" });
  }

  function renderMetas() {
    const box = document.getElementById("metas");
    const metas = Store.lista("financeiro.metas");
    box.innerHTML = "";

    if (!metas.length) {
      box.appendChild(
        UI.vazio({
          icone: "◎",
          titulo: "Nenhuma meta ainda",
          texto: "Defina um objetivo (reserva de emergência, notebook, viagem) e acompanhe o quanto já juntou.",
          rotuloAcao: "Criar primeira meta",
          aoAcionar: novaMeta,
        })
      );
      return;
    }

    metas.forEach((m) => {
      const linha = document.createElement("div");
      linha.style.cssText = "display:flex; align-items:flex-end; gap:12px; flex-wrap:wrap;";

      const medidor = UI.medidor({
        rotulo: m.descricao + (m.prazo ? ` · até ${fmt.dataCurta(m.prazo)}` : ""),
        atual: Number(m.valorAtual) || 0,
        alvo: Number(m.valorAlvo) || 0,
      });
      medidor.style.flex = "1";

      const acoes = document.createElement("div");
      acoes.className = "row-actions";
      acoes.style.opacity = "1";
      acoes.innerHTML = `<button class="btn ghost sm" data-editar>Editar</button><button class="btn ghost sm" data-excluir>Excluir</button>`;
      acoes.querySelector("[data-editar]").addEventListener("click", () => editarMeta(m));
      acoes.querySelector("[data-excluir]").addEventListener("click", () => excluir("financeiro.metas", m, "Meta"));

      linha.appendChild(medidor);
      linha.appendChild(acoes);
      box.appendChild(linha);
    });
  }

  function renderFiltros() {
    const mesSel = document.getElementById("f-mes");
    const catSel = document.getElementById("f-categoria");

    mesSel.innerHTML =
      `<option value="todos">Todos os meses</option>` +
      mesesDisponiveis().map((m) => `<option value="${m}" ${m === filtros.mes ? "selected" : ""}>${fmt.mesRotulo(m)}</option>`).join("");

    catSel.innerHTML =
      `<option value="todas">Todas as categorias</option>` +
      Store.estado().financeiro.categorias
        .map((c) => `<option value="${fmt.escape(c)}" ${c === filtros.categoria ? "selected" : ""}>${fmt.escape(c)}</option>`)
        .join("");
  }

  function renderTabela() {
    const box = document.getElementById("tabela");
    const lista = filtradas();
    const t = totais(lista);

    document.getElementById("resumo-filtro").textContent = lista.length
      ? `${lista.length} ${lista.length === 1 ? "lançamento" : "lançamentos"} · saldo ${fmt.moeda(t.resultado)}`
      : "";

    box.innerHTML = "";

    if (!lista.length) {
      const card = document.createElement("div");
      card.className = "card";
      const temAlgum = transacoes().length > 0;
      card.appendChild(
        UI.vazio({
          icone: temAlgum ? "◌" : "＋",
          titulo: temAlgum ? "Nenhum lançamento com esses filtros" : "Sua planilha está vazia",
          texto: temAlgum
            ? "Ajuste ou limpe os filtros para ver os outros lançamentos."
            : "Registre entradas e saídas para acompanhar o mês, ver os gastos por categoria e comparar com o mês anterior.",
          rotuloAcao: temAlgum ? "Limpar filtros" : "Registrar primeiro lançamento",
          aoAcionar: temAlgum ? limparFiltros : novoLancamento,
        })
      );
      box.appendChild(card);
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    wrap.innerHTML = `
      <table class="sheet">
        <thead>
          <tr>
            <th>Data</th><th>Descrição</th><th>Categoria</th><th>Pago com</th>
            <th>Status</th><th style="text-align:right;">Valor</th><th></th>
          </tr>
        </thead>
        <tbody></tbody>
        <tfoot>
          <tr class="tfoot-row">
            <td colspan="5">Total filtrado — ${fmt.moeda(t.receita)} entrou, ${fmt.moeda(t.despesa)} saiu</td>
            <td class="right">${fmt.moeda(t.resultado)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>`;

    const tbody = wrap.querySelector("tbody");
    lista.forEach((item) => {
      const receita = item.tipo === "receita";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="num muted" style="white-space:nowrap;">${fmt.dataCurta(item.data)}</td>
        <td><span class="title">${fmt.escape(item.descricao || "(sem descrição)")}</span></td>
        <td><span class="badge">${fmt.escape(item.categoria || "Outros")}</span></td>
        <td class="muted">${fmt.escape(Financas.nomeOrigem(item.origem) || item.forma || "—")}</td>
        <td><span class="badge ${item.status === "pendente" ? "urgente" : "feito"}">${item.status === "pendente" ? "pendente" : "pago"}</span></td>
        <td class="right" style="color:${receita ? "var(--success-text)" : "var(--tinta)"};">
          ${receita ? "+" : "−"}${fmt.moeda(Math.abs(Number(item.valor) || 0))}
        </td>
        <td>
          <div class="row-actions">
            <button class="btn ghost sm" data-editar>Editar</button>
            <button class="btn ghost sm" data-excluir>Excluir</button>
          </div>
        </td>`;
      tr.querySelector("[data-editar]").addEventListener("click", () => editarLancamento(item));
      tr.querySelector("[data-excluir]").addEventListener("click", () => excluir("financeiro.transacoes", item, "Lançamento"));
      tbody.appendChild(tr);
    });

    box.appendChild(wrap);
  }

  /* --------------------------------- Ações ---------------------------------- */

  function camposLancamento() {
    return [
      { nome: "tipo", rotulo: "Tipo", tipo: "segmento", opcoes: [{ valor: "despesa", rotulo: "Despesa" }, { valor: "receita", rotulo: "Receita" }] },
      { nome: "descricao", rotulo: "Descrição", tipo: "text", obrigatorio: true, placeholder: "Ex.: Livro de farmacologia" },
      { nome: "valor", rotulo: "Valor (R$)", tipo: "dinheiro", obrigatorio: true, placeholder: "0,00" },
      { nome: "categoria", rotulo: "Categoria", tipo: "select", opcoes: Store.estado().financeiro.categorias },
      { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valorPadrao: UI.hojeISO() },
      {
        nome: "origem", rotulo: "Pago com", tipo: "select", opcoes: Financas.opcoesOrigem(),
        dica: Financas.opcoesOrigem().length > 1
          ? "Define de qual conta ou cartão este valor sai."
          : "Cadastre contas e cartões para acompanhar o balanço de cada um.",
      },
      { nome: "forma", rotulo: "Observação", tipo: "text", placeholder: "Pix, débito, parcelado…" },
      { nome: "status", rotulo: "Situação", tipo: "segmento", opcoes: [{ valor: "pago", rotulo: "Pago" }, { valor: "pendente", rotulo: "Pendente" }] },
    ];
  }

  async function novoLancamento() {
    const v = await UI.formulario({
      titulo: "Novo lançamento",
      descricao: "Registre uma entrada ou saída de dinheiro.",
      campos: camposLancamento(),
    });
    if (!v) return;
    Store.inserir("financeiro.transacoes", v);
    if (filtros.mes !== "todos" && !v.data.startsWith(filtros.mes)) filtros.mes = v.data.slice(0, 7);
    UI.toast("Lançamento salvo.");
    render();
  }

  async function editarLancamento(item) {
    const v = await UI.formulario({
      titulo: "Editar lançamento",
      campos: camposLancamento(),
      valores: item,
    });
    if (!v) return;
    Store.atualizar("financeiro.transacoes", item.id, v);
    UI.toast("Lançamento atualizado.");
    render();
  }

  const camposMeta = () => [
    { nome: "descricao", rotulo: "Objetivo", tipo: "text", obrigatorio: true, placeholder: "Ex.: Reserva de emergência" },
    { nome: "valorAlvo", rotulo: "Quanto quer juntar (R$)", tipo: "dinheiro", obrigatorio: true },
    { nome: "valorAtual", rotulo: "Quanto já tem (R$)", tipo: "dinheiro", valorPadrao: 0 },
    { nome: "prazo", rotulo: "Prazo", tipo: "date" },
  ];

  async function novaMeta() {
    const v = await UI.formulario({ titulo: "Nova meta", descricao: "Um objetivo financeiro para acompanhar.", campos: camposMeta() });
    if (!v) return;
    Store.inserir("financeiro.metas", v);
    UI.toast("Meta criada.");
    render();
  }

  async function editarMeta(m) {
    const v = await UI.formulario({ titulo: "Editar meta", campos: camposMeta(), valores: m });
    if (!v) return;
    Store.atualizar("financeiro.metas", m.id, v);
    UI.toast("Meta atualizada.");
    render();
  }

  // Exclusão com desfazer — nada é perdido por um clique errado.
  function excluir(caminho, item, rotulo) {
    const indice = Store.indiceDe(caminho, item.id);
    Store.remover(caminho, item.id);
    render();
    UI.toast(`${rotulo} excluído.`, {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.restaurar(caminho, item, indice); render(); },
    });
  }

  async function ajustarSaldo() {
    const v = await UI.formulario({
      titulo: "Ajustar saldo",
      descricao: "Informe quanto você tem hoje somando contas e dinheiro em espécie.",
      campos: [{ nome: "saldo", rotulo: "Saldo atual (R$)", tipo: "dinheiro", obrigatorio: true }],
      valores: { saldo: Store.estado().financeiro.saldoAtual },
    });
    if (!v) return;
    Store.definirSaldo(v.saldo);
    UI.toast("Saldo atualizado.");
    render();
  }

  function limparFiltros() {
    filtros.busca = "";
    filtros.mes = "todos";
    filtros.tipo = "todos";
    filtros.categoria = "todas";
    document.getElementById("f-busca").value = "";
    document.getElementById("f-tipo").value = "todos";
    render();
  }

  /* --------------------------------- Eventos -------------------------------- */

  document.getElementById("btn-lancamento").addEventListener("click", novoLancamento);
  document.getElementById("btn-meta").addEventListener("click", novaMeta);
  document.getElementById("btn-saldo").addEventListener("click", ajustarSaldo);
  document.getElementById("f-limpar").addEventListener("click", limparFiltros);

  document.getElementById("f-busca").addEventListener("input", (e) => { filtros.busca = e.target.value; renderTabela(); });
  document.getElementById("f-mes").addEventListener("change", (e) => { filtros.mes = e.target.value; renderCategorias(); renderTabela(); });
  document.getElementById("f-tipo").addEventListener("change", (e) => { filtros.tipo = e.target.value; renderTabela(); });
  document.getElementById("f-categoria").addEventListener("change", (e) => { filtros.categoria = e.target.value; renderTabela(); });

  render();
})();
