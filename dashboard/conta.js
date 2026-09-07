/* Página de uma conta ou cartão — saldo/fatura, gastos por categoria e lançamentos. */

(() => {
  const { fmt } = UI;
  const tipo = UI.parametro("tipo") === "cartao" ? "cartao" : "conta";
  const id = UI.parametro("id");
  const CAMINHO = tipo === "cartao" ? "financeiro.cartoes" : "financeiro.contas";
  const ORIGEM = `${tipo}:${id}`;

  let item = Store.achar(CAMINHO, id);

  if (!item) {
    UI.iniciarPagina("contas");
    document.getElementById("conteudo").innerHTML = `<a class="voltar" href="contas.html">← Contas e cartões</a><div class="card" style="margin-top:16px;"></div>`;
    document.querySelector(".card").appendChild(
      UI.vazio({
        icone: "◌",
        titulo: tipo === "cartao" ? "Cartão não encontrado" : "Conta não encontrada",
        texto: "Pode ter sido excluída, ou este link é de outro navegador — os dados ficam salvos em cada navegador.",
        rotuloAcao: "Ver contas e cartões",
        aoAcionar: () => (location.href = "contas.html"),
      })
    );
    return;
  }

  UI.iniciarPagina("contas");

  const recarregar = () => { item = Store.achar(CAMINHO, id); };

  function render() {
    recarregar();
    document.title = `${item.nome} · ${UI.NOME}`;
    document.getElementById("etiqueta").textContent = tipo === "cartao" ? "Cartão de crédito" : "Conta";
    document.getElementById("swatch-categorias").className = `swatch ${tipo === "cartao" ? "projetos" : "financeiro"}`;
    document.getElementById("titulo").textContent = item.nome;
    document.getElementById("subtitulo").textContent =
      tipo === "cartao"
        ? `${item.bandeira || "cartão"} · fecha dia ${item.fechamento} · vence dia ${item.vencimento}`
        : `${item.instituicao || ""}${item.instituicao ? " · " : ""}${item.tipo || "conta"}`;

    if (tipo === "cartao") renderStatsCartao(); else renderStatsConta();
    renderCategorias();
    renderLancamentos();
    UI.montarLayout("contas");
  }

  function renderStatsConta() {
    const r = Financas.resumoConta(item);
    document.getElementById("card-limite").style.display = "none";
    document.getElementById("stats").innerHTML = `
      <div class="card tinted financeiro">
        <div class="stat-label">Saldo atual</div>
        <div class="stat-value num" style="color:${r.saldo < 0 ? "var(--st-critical)" : "var(--ink)"};">${fmt.moeda(r.saldo)}</div>
        <div class="stat-sub">abertura ${fmt.moeda(item.saldoInicial || 0)}</div>
      </div>
      <div class="card tinted financeiro">
        <div class="stat-label">Entradas</div>
        <div class="stat-value num delta up">${fmt.moeda(r.entradas)}</div>
        <div class="stat-sub">nesta conta</div>
      </div>
      <div class="card tinted financeiro">
        <div class="stat-label">Saídas</div>
        <div class="stat-value num delta down">${fmt.moeda(r.saidas)}</div>
        <div class="stat-sub">nesta conta</div>
      </div>
      <div class="card tinted financeiro">
        <div class="stat-label">Lançamentos</div>
        <div class="stat-value num">${r.itens.length}</div>
        <div class="stat-sub">no total</div>
      </div>`;
  }

  function renderStatsCartao() {
    const r = Financas.resumoCartao(item);
    const venc = UI.urgencia(r.ciclo.vencimento);
    document.getElementById("stats").innerHTML = `
      <div class="card tinted projetos">
        <div class="stat-label">Fatura aberta</div>
        <div class="stat-value num">${fmt.moeda(r.total)}</div>
        <div class="stat-sub">vence ${fmt.data(r.ciclo.vencimento)} · <span class="badge ${venc.nivel}">${venc.rotulo}</span></div>
      </div>
      <div class="card tinted projetos">
        <div class="stat-label">Ciclo atual</div>
        <div class="stat-value" style="font-size:15px;">${fmt.dataCurta(r.ciclo.inicio)} – ${fmt.dataCurta(r.ciclo.fim)}</div>
        <div class="stat-sub">${(() => { const n = r.itens.filter((t) => t.data >= r.ciclo.inicio && t.data <= r.ciclo.fim).length; return `${n} ${n === 1 ? "compra" : "compras"} no ciclo`; })()}</div>
      </div>
      <div class="card tinted projetos">
        <div class="stat-label">Gasto total histórico</div>
        <div class="stat-value num">${fmt.moeda(r.gastoTotal)}</div>
        <div class="stat-sub">desde o cadastro</div>
      </div>
      <div class="card tinted projetos">
        <div class="stat-label">Limite</div>
        <div class="stat-value num">${item.limite ? fmt.moeda(item.limite) : "—"}</div>
        <div class="stat-sub">${item.limite ? `${Math.round(r.usoPercentual)}% usado` : "não informado"}</div>
      </div>`;

    const cardLimite = document.getElementById("card-limite");
    if (item.limite) {
      cardLimite.style.display = "";
      document.getElementById("limite").innerHTML = "";
      document.getElementById("limite").appendChild(
        UI.medidor({
          rotulo: `Limite usado — ${Math.round(r.usoPercentual)}%`,
          atual: r.total, alvo: item.limite,
          cor: r.usoPercentual >= 80 ? "var(--st-critical)" : "var(--s-projetos)",
        })
      );
    } else {
      cardLimite.style.display = "none";
    }
  }

  function renderCategorias() {
    const box = document.getElementById("categorias");
    box.innerHTML = "";
    const linhas = Financas.gastosPorCategoria(ORIGEM);
    if (!linhas.length) {
      box.appendChild(UI.vazio({ icone: "◍", titulo: "Sem gastos ainda", texto: `Lance uma despesa "Pago com" ${item.nome} para ver a distribuição aqui.` }));
      return;
    }
    UI.barras(box, { linhas, cor: tipo === "cartao" ? "var(--s-projetos)" : "var(--s-financeiro)" });
  }

  function renderLancamentos() {
    const lista = Financas.lancamentosDe(ORIGEM).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    document.getElementById("lancamentos-resumo").textContent = `${lista.length} ${lista.length === 1 ? "lançamento" : "lançamentos"}`;
    const tbody = document.getElementById("lancamentos");
    tbody.innerHTML = "";

    if (!lista.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.appendChild(UI.vazio({ icone: "◍", titulo: "Nenhum lançamento", texto: `Registre um lançamento e escolha "${item.nome}" em Pago com.` , rotuloAcao: "+ Lançamento", aoAcionar: novoLancamento }));
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    lista.forEach((t) => {
      const receita = t.tipo === "receita";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="num muted" style="white-space:nowrap;">${fmt.dataCurta(t.data)}</td>
        <td><span class="title">${fmt.escape(t.descricao || "(sem descrição)")}</span></td>
        <td><span class="badge">${fmt.escape(t.categoria || "Outros")}</span></td>
        <td><span class="badge ${t.status === "pendente" ? "urgente" : "feito"}">${t.status === "pendente" ? "pendente" : "pago"}</span></td>
        <td class="right" style="color:${receita ? "var(--success-text)" : "var(--ink)"};">${receita ? "+" : "−"}${fmt.moeda(Math.abs(Number(t.valor) || 0))}</td>
        <td><div class="row-actions">
          <button class="btn ghost sm" data-editar>Editar</button>
          <button class="btn ghost sm" data-excluir>Excluir</button>
        </div></td>`;
      tr.querySelector("[data-editar]").addEventListener("click", () => editarLancamento(t));
      tr.querySelector("[data-excluir]").addEventListener("click", () => excluirLancamento(t));
      tbody.appendChild(tr);
    });
  }

  /* --------------------------------- Ações ---------------------------------- */

  function camposLancamento() {
    return [
      { nome: "tipo", rotulo: "Tipo", tipo: "segmento", opcoes: [{ valor: "despesa", rotulo: "Despesa" }, { valor: "receita", rotulo: "Receita" }] },
      { nome: "descricao", rotulo: "Descrição", tipo: "text", obrigatorio: true, placeholder: "Ex.: Mercado" },
      { nome: "valor", rotulo: "Valor (R$)", tipo: "dinheiro", obrigatorio: true, placeholder: "0,00" },
      { nome: "categoria", rotulo: "Categoria", tipo: "select", opcoes: Store.estado().financeiro.categorias },
      { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valorPadrao: UI.hojeISO() },
      { nome: "status", rotulo: "Situação", tipo: "segmento", opcoes: [{ valor: "pago", rotulo: "Pago" }, { valor: "pendente", rotulo: "Pendente" }] },
    ];
  }

  async function novoLancamento() {
    const v = await UI.formulario({
      titulo: "Novo lançamento",
      descricao: `Registrado com "Pago com": ${item.nome}.`,
      campos: camposLancamento(),
    });
    if (!v) return;
    Store.inserir("financeiro.transacoes", { ...v, origem: ORIGEM, forma: "" });
    UI.toast("Lançamento salvo.");
    render();
  }

  async function editarLancamento(t) {
    const v = await UI.formulario({ titulo: "Editar lançamento", campos: camposLancamento(), valores: t });
    if (!v) return;
    Store.atualizar("financeiro.transacoes", t.id, v);
    UI.toast("Lançamento atualizado.");
    render();
  }

  function excluirLancamento(t) {
    const indice = Store.indiceDe("financeiro.transacoes", t.id);
    Store.remover("financeiro.transacoes", t.id);
    render();
    UI.toast("Lançamento excluído.", {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.restaurar("financeiro.transacoes", t, indice); render(); },
    });
  }

  async function editarItem() {
    const camposConta = () => [
      { nome: "nome", rotulo: "Nome da conta", tipo: "text", obrigatorio: true },
      { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: Financas.TIPOS_CONTA },
      { nome: "instituicao", rotulo: "Instituição", tipo: "text" },
      { nome: "saldoInicial", rotulo: "Saldo de abertura (R$)", tipo: "dinheiro", obrigatorio: true },
    ];
    const camposCartao = () => [
      { nome: "nome", rotulo: "Nome do cartão", tipo: "text", obrigatorio: true },
      { nome: "bandeira", rotulo: "Bandeira", tipo: "select", opcoes: Financas.BANDEIRAS },
      { nome: "limite", rotulo: "Limite (R$)", tipo: "dinheiro" },
      { nome: "fechamento", rotulo: "Dia do fechamento", tipo: "number", obrigatorio: true },
      { nome: "vencimento", rotulo: "Dia do vencimento", tipo: "number", obrigatorio: true },
    ];
    const v = await UI.formulario({
      titulo: tipo === "cartao" ? "Editar cartão" : "Editar conta",
      campos: tipo === "cartao" ? camposCartao() : camposConta(),
      valores: item,
    });
    if (!v) return;
    Store.atualizar(CAMINHO, id, v);
    UI.toast(tipo === "cartao" ? "Cartão atualizado." : "Conta atualizada.");
    render();
  }

  document.getElementById("btn-editar").addEventListener("click", editarItem);
  document.getElementById("btn-lancamento").addEventListener("click", novoLancamento);

  render();
})();
