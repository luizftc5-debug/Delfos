/* Contas e cartões — saldo por conta, fatura por cartão e balanço geral. */

(() => {
  UI.iniciarPagina("contas");

  const { fmt } = UI;

  const contas = () => Store.lista("financeiro.contas");
  const cartoes = () => Store.lista("financeiro.cartoes");

  /* --------------------------------- Render --------------------------------- */

  function render() {
    const b = Financas.balanco();
    const totalContas = b.contas.reduce((s, c) => s + c.saldo, 0);
    const totalFaturas = b.cartoes.reduce((s, c) => s + c.fatura, 0);

    document.getElementById("s-total").textContent = fmt.moeda(totalContas);
    document.getElementById("s-total-d").textContent = b.contas.length
      ? `${b.contas.length} ${b.contas.length === 1 ? "conta cadastrada" : "contas cadastradas"}`
      : "Nenhuma conta cadastrada";

    document.getElementById("s-faturas").textContent = fmt.moeda(totalFaturas);
    document.getElementById("s-faturas-d").textContent = b.cartoes.length
      ? `${b.cartoes.length} ${b.cartoes.length === 1 ? "cartão" : "cartões"} · ciclo atual`
      : "Nenhum cartão cadastrado";

    const sobra = totalContas - totalFaturas;
    const elSobra = document.getElementById("s-sobra");
    elSobra.textContent = fmt.moeda(sobra);
    elSobra.className = `stat-value num delta ${sobra >= 0 ? "up" : "down"}`;

    renderAvisos();
    renderContas(b.contas);
    renderCartoes(b.cartoes);
    renderBalanco(b);
    UI.montarLayout("contas");
  }

  // Lançamentos sem conta/cartão informado não entram no balanço — vale avisar,
  // senão os números parecem errados sem motivo aparente.
  function renderAvisos() {
    const box = document.getElementById("avisos");
    box.innerHTML = "";
    const orfaos = Financas.semOrigem();
    if (!orfaos.length || (!contas().length && !cartoes().length)) return;

    const el = document.createElement("div");
    el.className = "notice info";
    el.innerHTML = `<span class="ic">i</span><span><strong>${orfaos.length} ${orfaos.length === 1 ? "lançamento não tem" : "lançamentos não têm"} conta ou cartão informado</strong>
      e por isso ${orfaos.length === 1 ? "fica" : "ficam"} de fora do balanço. Edite ${orfaos.length === 1 ? "ele" : "eles"} no Financeiro e escolha em "Pago com".</span>`;
    box.appendChild(el);
  }

  function renderContas(lista) {
    const box = document.getElementById("contas");
    box.innerHTML = "";
    document.getElementById("contas-resumo").textContent = lista.length
      ? `total ${fmt.moeda(lista.reduce((s, c) => s + c.saldo, 0))}`
      : "";

    if (!lista.length) {
      const card = document.createElement("div");
      card.className = "card";
      card.appendChild(
        UI.vazio({
          icone: "▣",
          titulo: "Nenhuma conta cadastrada",
          texto: "Cadastre suas contas com o saldo de hoje. A partir daí, cada lançamento atualiza o saldo sozinho.",
          rotuloAcao: "Cadastrar conta",
          aoAcionar: novaConta,
        })
      );
      box.appendChild(card);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "grid g3";
    lista.forEach((c) => {
      const card = document.createElement("div");
      card.className = "card conta-card";
      card.innerHTML = `
        <div class="card-head" style="align-items:flex-start; margin-bottom:8px;">
          <a class="linha-link" style="min-width:0;" href="conta.html?tipo=conta&id=${fmt.escape(c.id)}">
            <h3 class="card-title" style="font-size:14px;"><span class="swatch financeiro"></span><span class="title">${fmt.escape(c.nome)}</span></h3>
            <div class="card-note" style="margin-top:3px;">${fmt.escape(c.instituicao || c.tipo)}</div>
          </a>
          <span class="row-actions">
            <button class="btn ghost sm" data-editar>Editar</button>
            <button class="btn ghost sm" data-excluir>Excluir</button>
          </span>
        </div>
        <a href="conta.html?tipo=conta&id=${fmt.escape(c.id)}" style="text-decoration:none; color:inherit; display:block;">
          <div class="stat-value num" style="font-size:22px; color:${c.saldo < 0 ? "var(--st-critical)" : "var(--texto)"};">${fmt.moeda(c.saldo)}</div>
          <div class="stat-sub">
            abertura ${fmt.moeda(c.saldoInicial || 0)} · ${c.movimentos} ${c.movimentos === 1 ? "lançamento" : "lançamentos"}
          </div>
        </a>`;
      card.querySelector("[data-editar]").addEventListener("click", () => editarConta(c));
      card.querySelector("[data-excluir]").addEventListener("click", () => excluir("financeiro.contas", c, "Conta"));
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  function renderCartoes(lista) {
    const box = document.getElementById("cartoes");
    box.innerHTML = "";
    document.getElementById("cartoes-resumo").textContent = lista.length
      ? `faturas ${fmt.moeda(lista.reduce((s, c) => s + c.fatura, 0))}`
      : "";

    if (!lista.length) {
      const card = document.createElement("div");
      card.className = "card";
      card.appendChild(
        UI.vazio({
          icone: "▤",
          titulo: "Nenhum cartão cadastrado",
          texto: "Cadastre seus cartões com o dia de fechamento e de vencimento para acompanhar a fatura em aberto e o limite disponível.",
          rotuloAcao: "Cadastrar cartão",
          aoAcionar: novoCartao,
        })
      );
      box.appendChild(card);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "grid g2";
    lista.forEach((c) => {
      const venc = UI.urgencia(c.ciclo.vencimento);
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-head" style="align-items:flex-start; margin-bottom:10px;">
          <a class="linha-link" style="min-width:0;" href="conta.html?tipo=cartao&id=${fmt.escape(c.id)}">
            <h3 class="card-title" style="font-size:14px;"><span class="swatch projetos"></span><span class="title">${fmt.escape(c.nome)}</span></h3>
            <div class="card-note" style="margin-top:3px;">${fmt.escape(c.bandeira || "cartão")} · fecha dia ${c.fechamento} · vence dia ${c.vencimento}</div>
          </a>
          <span class="row-actions">
            <button class="btn ghost sm" data-editar>Editar</button>
            <button class="btn ghost sm" data-excluir>Excluir</button>
          </span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:12px; margin-bottom:10px;">
          <div>
            <div class="stat-label">Fatura aberta</div>
            <div class="stat-value num" style="font-size:22px;">${fmt.moeda(c.fatura)}</div>
          </div>
          <div style="text-align:right;">
            <div class="stat-sub" style="margin:0;">vence ${fmt.data(c.ciclo.vencimento)}</div>
            <span class="badge ${venc.nivel}">${venc.rotulo}</span>
          </div>
        </div>

        <div data-limite></div>

        <div class="stat-sub">
          Ciclo de ${fmt.dataCurta(c.ciclo.inicio)} a ${fmt.dataCurta(c.ciclo.fim)} · ${c.movimentos} ${c.movimentos === 1 ? "compra" : "compras"}
        </div>`;

      if (c.limite) {
        card.querySelector("[data-limite]").appendChild(
          UI.medidor({
            rotulo: `Limite usado — ${Math.round(c.usoPercentual)}%`,
            atual: c.fatura,
            alvo: c.limite,
            cor: c.usoPercentual >= 80 ? "var(--st-critical)" : "var(--s-projetos)",
          })
        );
      }

      card.querySelector("[data-editar]").addEventListener("click", () => editarCartao(c));
      card.querySelector("[data-excluir]").addEventListener("click", () => excluir("financeiro.cartoes", c, "Cartão"));
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  // Quanto já saiu por cada conta e cartão — uma série só, com o valor escrito
  // ao lado de cada barra.
  function renderBalanco(b) {
    const box = document.getElementById("balanco");
    box.innerHTML = "";

    const linhas = [
      ...b.contas.map((c) => ({
        nome: c.nome,
        valor: Financas.lancamentosDe(`conta:${c.id}`)
          .filter((t) => t.tipo === "despesa")
          .reduce((s, t) => s + (Number(t.valor) || 0), 0),
      })),
      ...b.cartoes.map((c) => ({ nome: c.nome, valor: Financas.gastoTotalCartao(c) })),
    ]
      .filter((l) => l.valor > 0)
      .sort((a, b2) => b2.valor - a.valor);

    if (!linhas.length) {
      box.appendChild(
        UI.vazio({
          icone: "◍",
          titulo: "Sem gastos atribuídos ainda",
          texto: "Ao lançar uma despesa no Financeiro, escolha em 'Pago com' de qual conta ou cartão ela saiu — o balanço se monta a partir daí.",
        })
      );
      return;
    }

    UI.barras(box, { linhas, cor: "var(--s-financeiro)" });
  }

  /* --------------------------------- Ações ---------------------------------- */

  const camposConta = () => [
    { nome: "nome", rotulo: "Nome da conta", tipo: "text", obrigatorio: true, placeholder: "Ex.: Nubank" },
    { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: Financas.TIPOS_CONTA },
    { nome: "instituicao", rotulo: "Instituição", tipo: "text", placeholder: "Banco, corretora…" },
    {
      nome: "saldoInicial", rotulo: "Saldo de hoje (R$)", tipo: "dinheiro", obrigatorio: true,
      dica: "Ponto de partida. Depois, cada lançamento atualiza o saldo automaticamente.",
    },
  ];

  const camposCartao = () => [
    { nome: "nome", rotulo: "Nome do cartão", tipo: "text", obrigatorio: true, placeholder: "Ex.: Nubank Roxinho" },
    { nome: "bandeira", rotulo: "Bandeira", tipo: "select", opcoes: Financas.BANDEIRAS },
    { nome: "limite", rotulo: "Limite (R$)", tipo: "dinheiro", dica: "Opcional — usado para mostrar o quanto já foi consumido." },
    { nome: "fechamento", rotulo: "Dia do fechamento", tipo: "number", obrigatorio: true, valorPadrao: 1, dica: "Compras após esse dia entram na fatura seguinte." },
    { nome: "vencimento", rotulo: "Dia do vencimento", tipo: "number", obrigatorio: true, valorPadrao: 10 },
  ];

  function validarDia(v, campo) {
    const n = Number(v[campo]);
    return Number.isFinite(n) && n >= 1 && n <= 31;
  }

  async function novaConta() {
    const v = await UI.formulario({
      titulo: "Nova conta",
      descricao: "Conta bancária, poupança, investimento ou dinheiro em espécie.",
      campos: camposConta(),
    });
    if (!v) return;
    Store.inserir("financeiro.contas", v);
    UI.toast("Conta cadastrada.");
    render();
  }

  async function editarConta(c) {
    const v = await UI.formulario({ titulo: "Editar conta", campos: camposConta(), valores: c });
    if (!v) return;
    Store.atualizar("financeiro.contas", c.id, v);
    UI.toast("Conta atualizada.");
    render();
  }

  async function novoCartao() {
    const v = await UI.formulario({ titulo: "Novo cartão", descricao: "Cartão de crédito.", campos: camposCartao() });
    if (!v) return;
    if (!validarDia(v, "fechamento") || !validarDia(v, "vencimento")) {
      return UI.toast("Os dias de fechamento e vencimento precisam estar entre 1 e 31.");
    }
    Store.inserir("financeiro.cartoes", v);
    UI.toast("Cartão cadastrado.");
    render();
  }

  async function editarCartao(c) {
    const v = await UI.formulario({ titulo: "Editar cartão", campos: camposCartao(), valores: c });
    if (!v) return;
    if (!validarDia(v, "fechamento") || !validarDia(v, "vencimento")) {
      return UI.toast("Os dias de fechamento e vencimento precisam estar entre 1 e 31.");
    }
    Store.atualizar("financeiro.cartoes", c.id, v);
    UI.toast("Cartão atualizado.");
    render();
  }

  // Excluir uma conta/cartão deixaria lançamentos apontando para o nada, então
  // o usuário precisa saber disso antes de confirmar.
  async function excluir(caminho, item, rotulo) {
    const chave = `${caminho.endsWith("contas") ? "conta" : "cartao"}:${item.id}`;
    const vinculados = Financas.lancamentosDe(chave).length;

    if (vinculados) {
      const ok = await UI.confirmar({
        titulo: `Excluir ${rotulo.toLowerCase()} "${item.nome}"?`,
        descricao: `${vinculados} ${vinculados === 1 ? "lançamento ficará" : "lançamentos ficarão"} sem conta/cartão informado. Os lançamentos em si não são apagados.`,
        rotuloConfirmar: "Excluir",
        perigo: true,
      });
      if (!ok) return;
    }

    const indice = Store.indiceDe(caminho, item.id);
    Store.remover(caminho, item.id);
    render();
    UI.toast(`${rotulo} excluído.`, {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.restaurar(caminho, item, indice); render(); },
    });
  }

  document.getElementById("btn-conta").addEventListener("click", novaConta);
  document.getElementById("btn-cartao").addEventListener("click", novoCartao);

  render();
})();
