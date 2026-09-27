/* ===========================================================================
   Finanças — cálculos derivados de contas, cartões e lançamentos.

   Nada aqui guarda estado: tudo é calculado a partir dos lançamentos salvos,
   para que saldo e fatura nunca fiquem fora de sincronia com a planilha.
   =========================================================================== */

const Financas = (() => {
  const TIPOS_CONTA = ["corrente", "poupança", "investimento", "dinheiro"];
  const BANDEIRAS = ["Visa", "Mastercard", "Elo", "American Express", "Hipercard", "Outra"];

  const contas = () => Store.lista("financeiro.contas");
  const cartoes = () => Store.lista("financeiro.cartoes");
  const transacoes = () => Store.lista("financeiro.transacoes");

  /* ------------------------- Origem de um lançamento ---------------------- */
  // Guardada como "conta:<id>" ou "cartao:<id>" — um único campo no lançamento.

  function partesOrigem(origem) {
    if (!origem || typeof origem !== "string") return { tipo: "", id: "" };
    const [tipo, id] = origem.split(":");
    return { tipo: tipo || "", id: id || "" };
  }

  function nomeOrigem(origem) {
    const { tipo, id } = partesOrigem(origem);
    if (!tipo) return "";
    const item = (tipo === "conta" ? contas() : cartoes()).find((x) => x.id === id);
    return item ? item.nome : "(removido)";
  }

  // Opções para o campo "Pago com" do formulário de lançamento.
  function opcoesOrigem() {
    const opcoes = [{ valor: "", rotulo: "— não informado —" }];
    contas().forEach((c) => opcoes.push({ valor: `conta:${c.id}`, rotulo: `${c.nome} (${c.tipo})` }));
    cartoes().forEach((c) => opcoes.push({ valor: `cartao:${c.id}`, rotulo: `${c.nome} (cartão)` }));
    return opcoes;
  }

  function lancamentosDe(origem) {
    return transacoes().filter((t) => t.origem === origem);
  }

  /* -------------------------------- Contas -------------------------------- */

  /**
   * Saldo de uma conta = saldo informado na abertura + receitas − despesas
   * lançadas nela. Despesas no cartão não entram aqui: elas entram quando a
   * fatura é lançada como despesa da conta.
   */
  function saldoConta(conta) {
    const chave = `conta:${conta.id}`;
    return lancamentosDe(chave).reduce(
      (soma, t) => soma + (t.tipo === "receita" ? 1 : -1) * (Number(t.valor) || 0),
      Number(conta.saldoInicial) || 0
    );
  }

  /**
   * Soma das contas cadastradas. Enquanto não houver nenhuma conta, vale o
   * saldo informado à mão na visão geral (compatível com quem já usava assim).
   */
  function saldoTotal() {
    const lista = contas();
    if (!lista.length) return Number(Store.estado().financeiro.saldoAtual) || 0;
    return lista.reduce((soma, c) => soma + saldoConta(c), 0);
  }

  const temContas = () => contas().length > 0;

  /* -------------------------------- Cartões -------------------------------- */

  function ultimoDiaDoMes(ano, mes) {
    return new Date(ano, mes + 1, 0).getDate();
  }

  function iso(ano, mes, dia) {
    const d = Math.min(dia, ultimoDiaDoMes(ano, mes));
    return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  /**
   * Ciclo da fatura aberta de um cartão.
   * Compras feitas depois do fechamento entram na fatura seguinte, que é a
   * regra usual dos cartões brasileiros.
   */
  function cicloAtual(cartao, hoje = new Date()) {
    const fechamento = Number(cartao.fechamento) || 1;
    const vencimento = Number(cartao.vencimento) || fechamento;
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const dia = hoje.getDate();

    // Se já passou o fechamento deste mês, o ciclo aberto é o do mês seguinte.
    const mesFim = dia > fechamento ? mes + 1 : mes;
    const fim = new Date(ano, mesFim, Math.min(fechamento, ultimoDiaDoMes(ano, mesFim)));
    const inicioBase = new Date(fim);
    inicioBase.setMonth(inicioBase.getMonth() - 1);
    inicioBase.setDate(inicioBase.getDate() + 1);

    // O vencimento cai depois do fechamento — no mês seguinte quando o dia de
    // vencimento é menor ou igual ao de fechamento.
    const mesVenc = vencimento > fechamento ? fim.getMonth() : fim.getMonth() + 1;

    return {
      inicio: iso(inicioBase.getFullYear(), inicioBase.getMonth(), inicioBase.getDate()),
      fim: iso(fim.getFullYear(), fim.getMonth(), fim.getDate()),
      vencimento: iso(fim.getFullYear(), mesVenc, vencimento),
    };
  }

  /** Fatura aberta: despesas do cartão dentro do ciclo atual. */
  function faturaCartao(cartao, hoje = new Date()) {
    const ciclo = cicloAtual(cartao, hoje);
    const itens = lancamentosDe(`cartao:${cartao.id}`).filter(
      (t) => t.tipo === "despesa" && t.data >= ciclo.inicio && t.data <= ciclo.fim
    );
    const total = itens.reduce((s, t) => s + (Number(t.valor) || 0), 0);
    const limite = Number(cartao.limite) || 0;
    return {
      ciclo,
      itens,
      total,
      limite,
      disponivel: limite ? Math.max(limite - total, 0) : null,
      usoPercentual: limite ? Math.min((total / limite) * 100, 100) : null,
    };
  }

  /** Total já gasto no cartão em qualquer período (para o balanço geral). */
  function gastoTotalCartao(cartao) {
    return lancamentosDe(`cartao:${cartao.id}`)
      .filter((t) => t.tipo === "despesa")
      .reduce((s, t) => s + (Number(t.valor) || 0), 0);
  }

  /* ------------------------------ Balanço geral ---------------------------- */

  /** Uma linha por conta e por cartão, para a página de balanço. */
  function balanco(hoje = new Date()) {
    return {
      contas: contas().map((c) => ({
        ...c,
        kind: "conta",
        saldo: saldoConta(c),
        movimentos: lancamentosDe(`conta:${c.id}`).length,
      })),
      cartoes: cartoes().map((c) => {
        const f = faturaCartao(c, hoje);
        return { ...c, kind: "cartao", fatura: f.total, ciclo: f.ciclo, limite: f.limite, disponivel: f.disponivel, usoPercentual: f.usoPercentual, movimentos: f.itens.length };
      }),
    };
  }

  /** Lançamentos sem conta/cartão informado — ficam de fora do balanço. */
  function semOrigem() {
    return transacoes().filter((t) => !t.origem);
  }

  /* --------------------------- Página de uma conta ------------------------- */

  /** Achar a conta ou o cartão por id, em qualquer uma das duas listas. */
  function achar(id) {
    const c = contas().find((x) => x.id === id);
    if (c) return { item: c, tipo: "conta" };
    const k = cartoes().find((x) => x.id === id);
    if (k) return { item: k, tipo: "cartao" };
    return null;
  }

  /** Gasto por categoria dentro de uma origem — para o gráfico da página de detalhe. */
  function gastosPorCategoria(origem, lista) {
    const itens = (lista || lancamentosDe(origem)).filter((t) => t.tipo === "despesa");
    const porCategoria = {};
    itens.forEach((t) => {
      const cat = t.categoria || "Outros";
      porCategoria[cat] = (porCategoria[cat] || 0) + (Number(t.valor) || 0);
    });
    return Object.entries(porCategoria)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
  }

  /** Resumo completo de uma conta: saldo, entradas, saídas e por categoria. */
  function resumoConta(conta) {
    const itens = lancamentosDe(`conta:${conta.id}`);
    const entradas = itens.filter((t) => t.tipo === "receita").reduce((s, t) => s + (Number(t.valor) || 0), 0);
    const saidas = itens.filter((t) => t.tipo === "despesa").reduce((s, t) => s + (Number(t.valor) || 0), 0);
    return {
      saldo: saldoConta(conta), entradas, saidas, itens,
      categorias: gastosPorCategoria(null, itens),
    };
  }

  /** Resumo completo de um cartão: fatura aberta, total histórico, por categoria. */
  function resumoCartao(cartao, hoje = new Date()) {
    const f = faturaCartao(cartao, hoje);
    const itens = lancamentosDe(`cartao:${cartao.id}`);
    return {
      ...f,
      gastoTotal: gastoTotalCartao(cartao), itens,
      categorias: gastosPorCategoria(null, itens.filter((t) => t.tipo === "despesa")),
    };
  }

  /* ------------------------------ Investimentos ----------------------------- */

  const TIPOS_INVESTIMENTO = ["Renda fixa", "Tesouro Direto", "Ações", "Fundos", "Cripto", "Previdência", "Outro"];

  const investimentos = () => Store.lista("financeiro.investimentos");

  /** Rentabilidade em R$ e % de um investimento — valor atual menos aplicado. */
  function rentabilidade(inv) {
    const aplicado = Number(inv.valorAplicado) || 0;
    const atual = Number(inv.valorAtual ?? inv.valorAplicado) || 0;
    const ganho = atual - aplicado;
    return { ganho, percentual: aplicado > 0 ? (ganho / aplicado) * 100 : 0 };
  }

  /** Totais da carteira: quanto foi aplicado e quanto vale hoje. */
  function totalInvestimentos() {
    const lista = investimentos();
    const aplicado = lista.reduce((s, i) => s + (Number(i.valorAplicado) || 0), 0);
    const atual = lista.reduce((s, i) => s + (Number(i.valorAtual ?? i.valorAplicado) || 0), 0);
    return { aplicado, atual, ganho: atual - aplicado, percentual: aplicado > 0 ? ((atual - aplicado) / aplicado) * 100 : 0 };
  }

  /* ------------------------------ Leitura do mês ---------------------------- */
  // Tudo que a aba Financeiro diz sobre um mês sai daqui, calculado na hora a
  // partir dos lançamentos — nada é guardado, pela mesma razão do saldo.

  const valorDe = (t) => Number(t.valor) || 0;
  const soma = (lista) => lista.reduce((s, t) => s + valorDe(t), 0);

  function hojeISO(hoje = new Date()) {
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  }

  function deslocarMes(chave, n) {
    const [a, m] = chave.split("-").map(Number);
    const d = new Date(a, m - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function diasNoMes(chave) {
    const [a, m] = chave.split("-").map(Number);
    return new Date(a, m, 0).getDate();
  }

  const doMes = (chave, lista = transacoes()) => lista.filter((t) => (t.data || "").startsWith(chave));

  function totais(lista) {
    const receita = soma(lista.filter((t) => t.tipo === "receita"));
    const despesa = soma(lista.filter((t) => t.tipo === "despesa"));
    return { receita, despesa, resultado: receita - despesa };
  }

  function porCategoria(lista) {
    const mapa = {};
    lista.filter((t) => t.tipo === "despesa").forEach((t) => {
      const c = t.categoria || "Outros";
      mapa[c] = (mapa[c] || 0) + valorDe(t);
    });
    return mapa;
  }

  /**
   * Chave que junta lançamentos "iguais" de meses diferentes: minúsculas, sem
   * acento, sem números (parcela 3/10, data no extrato) e só as três primeiras
   * palavras — "Sanar Flix 09/26" e "SANAR FLIX" viram a mesma coisa.
   */
  function chaveDescricao(desc) {
    return String(desc || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[0-9]+/g, " ")
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((p) => p.length > 1)
      .slice(0, 3)
      .join(" ");
  }

  const mediana = (nums) => {
    const o = [...nums].sort((a, b) => a - b);
    const m = Math.floor(o.length / 2);
    return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
  };

  /**
   * Gastos que se repetem: a mesma descrição, com o mesmo valor (±5% da
   * mediana), em pelo menos dois dos últimos quatro meses. A margem é curta
   * de propósito — assinatura e mensalidade cobram o mesmo valor todo mês; o
   * mercado da semana, que também se repete, varia demais para ser "fixo".
   * `fixos` são as respostas da pessoa — true confirma (e basta um mês),
   * false tira da lista.
   */
  function recorrentes(ate, fixos = {}) {
    const meses = [0, 1, 2, 3].map((n) => deslocarMes(ate, -n));
    const grupos = {};
    transacoes()
      .filter((t) => t.tipo === "despesa" && meses.some((m) => (t.data || "").startsWith(m)))
      .forEach((t) => {
        const k = chaveDescricao(t.descricao);
        if (!k) return;
        (grupos[k] = grupos[k] || []).push(t);
      });

    return Object.entries(grupos)
      .map(([chave, itens]) => {
        const tipico = mediana(itens.map(valorDe));
        const parecidos = itens.filter((t) => Math.abs(valorDe(t) - tipico) <= tipico * 0.05);
        const mesesVistos = new Set(parecidos.map((t) => t.data.slice(0, 7)));
        const ultimo = [...itens].sort((a, b) => b.data.localeCompare(a.data))[0];
        return {
          chave,
          descricao: ultimo.descricao,
          categoria: ultimo.categoria || "Outros",
          valor: tipico,
          meses: mesesVistos.size,
          ultimaData: ultimo.data,
          confirmado: fixos[chave] === true,
        };
      })
      .filter((r) => fixos[r.chave] !== false && (r.meses >= 2 || fixos[r.chave] === true))
      .sort((a, b) => b.valor - a.valor);
  }

  /** Gasto acumulado dia a dia de um mês (posição 0 = dia 1). */
  function acumuladoDiario(chave) {
    const dias = diasNoMes(chave);
    const porDia = new Array(dias).fill(0);
    doMes(chave).filter((t) => t.tipo === "despesa").forEach((t) => {
      const d = Number(t.data.slice(8, 10));
      if (d >= 1 && d <= dias) porDia[d - 1] += valorDe(t);
    });
    let acc = 0;
    return porDia.map((v) => (acc += v));
  }

  /**
   * Tudo que a aba diz de um mês: totais, categorias comparadas ao mês
   * anterior, ritmo, projeção e a média dos três meses antes dele.
   */
  function analisarMes(chave, prefs = {}, hoje = new Date()) {
    const hojeStr = hojeISO(hoje);
    const mesHoje = hojeStr.slice(0, 7);
    const anteriorChave = deslocarMes(chave, -1);
    const lista = doMes(chave);
    const t = totais(lista);
    const tAnt = totais(doMes(anteriorChave));
    const cats = porCategoria(lista);
    const catsAnt = porCategoria(doMes(anteriorChave));
    const orc = prefs.orcamentos || {};

    const categorias = Object.entries(cats)
      .map(([nome, valor]) => {
        const anterior = catsAnt[nome] || 0;
        return {
          nome, valor, anterior,
          parte: t.despesa ? valor / t.despesa : 0,
          variacao: valor - anterior,
          variacaoPct: anterior ? (valor - anterior) / anterior : null,
          orcamento: Number(orc[nome]) > 0 ? Number(orc[nome]) : null,
        };
      })
      .sort((a, b) => b.valor - a.valor);

    // Média dos três meses anteriores que tiveram algum gasto lançado.
    const anteriores = [1, 2, 3].map((n) => totais(doMes(deslocarMes(chave, -n))).despesa).filter((v) => v > 0);
    const mediaDespesa = anteriores.length ? anteriores.reduce((s, v) => s + v, 0) / anteriores.length : 0;

    const nDias = diasNoMes(chave);
    const ehAtual = chave === mesHoje;
    const passou = chave < mesHoje;
    const diaHoje = Number(hojeStr.slice(8, 10));
    const diasPassados = ehAtual ? diaHoje : passou ? nDias : 0;

    // Projeção só no mês corrente: o gasto até hoje, no mesmo ritmo, até o fim.
    const gastoAteHoje = soma(lista.filter((x) => x.tipo === "despesa" && x.data <= hojeStr));
    const agendado = soma(lista.filter((x) => x.tipo === "despesa" && x.data > hojeStr));
    const projecao = ehAtual && diasPassados >= 5
      ? (gastoAteHoje / diasPassados) * nDias + agendado
      : null;

    const despesas = lista.filter((x) => x.tipo === "despesa");
    const fimDeSemana = soma(despesas.filter((x) => {
      const d = new Date(x.data + "T00:00:00").getDay();
      return d === 0 || d === 6;
    }));

    return {
      chave, anteriorChave, ...t,
      anterior: tAnt,
      lancamentos: lista.length,
      taxaPoupanca: t.receita > 0 ? t.resultado / t.receita : null,
      categorias,
      maiores: [...despesas].sort((a, b) => valorDe(b) - valorDe(a)).slice(0, 5),
      semCategoria: despesas.filter((x) => !x.categoria || x.categoria === "Outros"),
      mediaDespesa,
      diasNoMes: nDias, diasPassados, ehAtual, passou, diaHoje,
      gastoAteHoje, agendado, projecao,
      parteFimDeSemana: t.despesa && despesas.length >= 6 ? fimDeSemana / t.despesa : null,
    };
  }

  /** Despesas marcadas como pendentes (de qualquer mês), da mais antiga à mais nova. */
  function pendentes() {
    return transacoes()
      .filter((t) => t.tipo === "despesa" && t.status === "pendente")
      .sort((a, b) => (a.data || "").localeCompare(b.data || ""));
  }

  /** Dia do mês em que as receitas mais costumam cair (para sugerir o dia da renda). */
  function diaTipicoDeRenda() {
    const contagem = {};
    transacoes().filter((t) => t.tipo === "receita" && t.data).forEach((t) => {
      const d = Number(t.data.slice(8, 10));
      contagem[d] = (contagem[d] || 0) + valorDe(t);
    });
    const melhor = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
    return melhor ? Number(melhor[0]) : null;
  }

  /**
   * Data do lançamento mais recente até hoje — para notar quando a pessoa
   * parou de lançar. Uma conta agendada para a semana que vem não conta.
   */
  function ultimoLancamento(hoje = new Date()) {
    const limite = hojeISO(hoje);
    return transacoes().reduce((m, t) => (t.data && t.data <= limite && t.data > m ? t.data : m), "");
  }

  return {
    TIPOS_CONTA, BANDEIRAS, TIPOS_INVESTIMENTO,
    deslocarMes, diasNoMes, doMes, totais, chaveDescricao, recorrentes, acumuladoDiario,
    analisarMes, pendentes, diaTipicoDeRenda, ultimoLancamento,
    partesOrigem, nomeOrigem, opcoesOrigem, lancamentosDe,
    saldoConta, saldoTotal, temContas,
    cicloAtual, faturaCartao, gastoTotalCartao,
    balanco, semOrigem, achar, gastosPorCategoria, resumoConta, resumoCartao,
    investimentos, rentabilidade, totalInvestimentos,
  };
})();
