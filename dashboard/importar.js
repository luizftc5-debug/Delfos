/* ===========================================================================
   Importar — lançamentos a partir de um extrato bancário (.ofx/.qfx ou .csv).

   Por que isto existe: o problema não é falta de dado, é esquecer de lançar.
   O extrato já tem tudo. Em vez de conectar o Delfos direto ao banco (que
   exigiria credenciar como instituição do Open Finance, guardar token de
   acesso à conta e criar mais uma superfície de ataque), a pessoa exporta o
   extrato pelo próprio app do banco — sem senha nenhuma saindo do aparelho
   dela — e importa aqui. O arquivo nunca sai do navegador: é lido, mostrado
   para revisão, e só o que for confirmado vira lançamento (que aí sim sobe
   para a nuvem, se a sincronização estiver ligada — como qualquer outro dado).

   Duas partes, deliberadamente separadas:
   - Funções puras de leitura (parseOFX, parseCSV, normalizarData/Valor,
     sugerirCategoria, provavelDuplicata) — sem tocar em DOM ou Store, para
     dar para testar isoladas.
   - O assistente (abrirAssistente) — a interface de 3 passos: escolher
     arquivo e conta, mapear colunas (só CSV), revisar e confirmar.
   =========================================================================== */

const Importar = (() => {
  /* ------------------------------- Leitura --------------------------------- */

  function extensao(nome) {
    return String(nome || "").split(".").pop().toLowerCase();
  }

  /**
   * Lê o arquivo como texto, cuidando da acentuação. Banco brasileiro exporta
   * OFX/CSV tanto em UTF-8 quanto em Latin-1 (ISO-8859-1/Windows-1252), sem
   * avisar de forma confiável no cabeçalho. UTF-8 nunca lança erro sozinho —
   * troca byte inválido por "�" — então a forma prática de saber que a
   * decodificação errou é contar quantos "�" sobraram e tentar de novo.
   */
  async function lerTexto(file) {
    const buffer = await file.arrayBuffer();
    const utf8 = new TextDecoder("utf-8").decode(buffer);
    const trocados = (utf8.match(/�/g) || []).length;
    if (trocados === 0) return utf8;
    try {
      return new TextDecoder("iso-8859-1").decode(buffer);
    } catch {
      return utf8;
    }
  }

  /* --------------------------------- OFX ------------------------------------
     OFX 1.x é SGML: tags de valor não se fecham (<TRNAMT>-38.50, sem
     </TRNAMT>), só os blocos se fecham (<STMTTRN>…</STMTTRN>). OFX 2.x é XML
     de verdade, com tudo fechado — mas o regex de campo abaixo lê os dois
     formatos igual, porque só olha "abriu a tag, pegou até a próxima tag". */

  function campoOFX(bloco, tag) {
    const m = new RegExp(`<${tag}>\\s*([^<\\r\\n]*)`, "i").exec(bloco);
    return m ? m[1].trim() : "";
  }

  /** "20260915120000[-03:EST]" ou "20260915" → "2026-09-15". */
  function dataOFX(bruta) {
    const m = /^(\d{4})(\d{2})(\d{2})/.exec(bruta);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }

  function parseOFX(texto) {
    const blocos = texto.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
    const linhas = [];
    for (const bloco of blocos) {
      const data = dataOFX(campoOFX(bloco, "DTPOSTED") || campoOFX(bloco, "DTUSER"));
      const valor = Number(campoOFX(bloco, "TRNAMT").replace(",", "."));
      if (!data || !Number.isFinite(valor) || valor === 0) continue;
      const nome = decodificarEntidades(campoOFX(bloco, "NAME"));
      const memo = decodificarEntidades(campoOFX(bloco, "MEMO"));
      // NAME é o estabelecimento; MEMO costuma repetir ou detalhar. Junta os
      // dois só quando dizem coisas diferentes, senão fica "Uber — Uber".
      const descricao = linhaUnica(memo && memo !== nome ? [nome, memo].filter(Boolean).join(" — ") : nome || memo) || "Lançamento importado";
      linhas.push({ data, descricao, valor: Math.abs(valor), tipo: valor >= 0 ? "receita" : "despesa" });
    }
    return linhas;
  }

  function decodificarEntidades(s) {
    return String(s || "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  }

  function linhaUnica(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  /* --------------------------------- CSV ------------------------------------
     Parser mínimo de CSV (RFC 4180: campo entre aspas pode conter separador,
     vírgula ou ponto e vírgula dentro dele, aspas duplicadas viram uma só).
     Banco brasileiro costuma exportar com ";" — vírgula é o separador
     decimal — então o delimitador é adivinhado pela primeira linha. */

  function detectarDelimitador(primeiraLinha) {
    const ponteVirgula = (primeiraLinha.match(/;/g) || []).length;
    const virgula = (primeiraLinha.match(/,/g) || []).length;
    return ponteVirgula >= virgula ? ";" : ",";
  }

  function parseLinhaCSV(linha, delimitador) {
    const campos = [];
    let atual = "";
    let entreAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (entreAspas) {
        if (c === '"' && linha[i + 1] === '"') { atual += '"'; i++; }
        else if (c === '"') entreAspas = false;
        else atual += c;
      } else if (c === '"') {
        entreAspas = true;
      } else if (c === delimitador) {
        campos.push(atual);
        atual = "";
      } else {
        atual += c;
      }
    }
    campos.push(atual);
    return campos.map((c) => c.trim());
  }

  /** { delimitador, cabecalho, linhas } — linhas em branco são descartadas. */
  function parseCSV(texto) {
    const brutas = texto.replace(/^﻿/, "").split(/\r\n|\r|\n/).filter((l) => l.trim() !== "");
    if (!brutas.length) return { delimitador: ",", cabecalho: [], linhas: [] };
    const delimitador = detectarDelimitador(brutas[0]);
    const todas = brutas.map((l) => parseLinhaCSV(l, delimitador));
    // Extrato de banco às vezes tem cabeçalho de verdade (nomes de coluna),
    // às vezes começa direto nos dados. Se a primeira linha tem alguma
    // célula que também parece data, ela é dado, não cabeçalho.
    const primeiraEhDado = todas[0].some((c) => normalizarData(c));
    return {
      delimitador,
      cabecalho: primeiraEhDado ? todas[0].map((_, i) => `Coluna ${i + 1}`) : todas[0],
      linhas: primeiraEhDado ? todas : todas.slice(1),
    };
  }

  /** Chuta o papel de cada coluna pelo nome do cabeçalho. */
  function sugerirMapeamento(cabecalho) {
    const acha = (padroes) => {
      const i = cabecalho.findIndex((c) => padroes.test(semAcento(c)));
      return i >= 0 ? i : null;
    };
    return {
      data: acha(/data|date|dt\b/i),
      descricao: acha(/descri|histor|lancamento|launch|memo|title|estabelecimento/i),
      valor: acha(/^valor$|amount|value|montante/i),
      entrada: acha(/entrada|credito|deposit/i),
      saida: acha(/saida|debito|withdrawal/i),
    };
  }

  /**
   * Aplica o mapeamento escolhido (índices de coluna) às linhas do CSV.
   * Aceita ou uma coluna "valor" com sinal, ou um par "entrada"/"saída".
   */
  function aplicarMapeamento(linhas, mapa) {
    const linhasOk = [];
    let ignoradas = 0;
    for (const l of linhas) {
      const data = normalizarData(l[mapa.data]);
      const descricao = linhaUnica(l[mapa.descricao]) || "Lançamento importado";
      let valor = null;
      let tipo = null;
      if (mapa.valor !== null && mapa.valor !== undefined) {
        const v = normalizarValor(l[mapa.valor]);
        if (v !== null && v !== 0) { valor = Math.abs(v); tipo = v >= 0 ? "receita" : "despesa"; }
      } else {
        const entrada = mapa.entrada !== null && mapa.entrada !== undefined ? normalizarValor(l[mapa.entrada]) : null;
        const saida = mapa.saida !== null && mapa.saida !== undefined ? normalizarValor(l[mapa.saida]) : null;
        if (entrada) { valor = Math.abs(entrada); tipo = "receita"; }
        else if (saida) { valor = Math.abs(saida); tipo = "despesa"; }
      }
      if (!data || valor === null) { ignoradas++; continue; }
      linhasOk.push({ data, descricao, valor, tipo });
    }
    return { linhas: linhasOk, ignoradas };
  }

  function semAcento(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  /**
   * "15/09/2026", "15/09/26", "2026-09-15", "15-09-2026" → "2026-09-15".
   * Dia primeiro é o padrão brasileiro; com dois dígitos ambíguos (ex.:
   * 03/04) não tem como saber o mês certo sem calendário — assume-se dia
   * primeiro de qualquer forma, e a revisão antes de importar existe
   * exatamente para pegar esse tipo de caso raro.
   */
  function normalizarData(bruta) {
    const s = String(bruta || "").trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/.exec(s);
    if (m) {
      let [, d, mes, ano] = m;
      if (ano.length === 2) ano = Number(ano) <= 69 ? `20${ano}` : `19${ano}`;
      d = d.padStart(2, "0");
      mes = mes.padStart(2, "0");
      if (Number(d) > 31 || Number(mes) > 12) return null;
      return `${ano}-${mes}-${d}`;
    }
    return null;
  }

  /**
   * "R$ 1.234,56", "-38,50", "1234.56", "(38,50)" → número.
   * Parêntese é a notação contábil de negativo que algumas planilhas usam.
   */
  function normalizarValor(bruta) {
    let s = String(bruta ?? "").trim();
    if (!s) return null;
    let negativo = false;
    if (/^\(.*\)$/.test(s)) { negativo = true; s = s.slice(1, -1); }
    s = s.replace(/r\$|\s/gi, "");
    if (s.startsWith("-")) { negativo = true; s = s.slice(1); }
    else if (s.startsWith("+")) s = s.slice(1);

    const temVirgula = s.includes(",");
    const temPonto = s.includes(".");
    if (temVirgula && temPonto) {
      // O último separador é o decimal; o outro é milhar.
      s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    } else if (temVirgula) {
      s = s.replace(",", ".");
    } else if (temPonto && s.split(".").length > 2) {
      s = s.replace(/\./g, ""); // "1.234.567" — todos são milhar
    }
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return negativo ? -n : n;
  }

  /* --------------------------- Categoria e duplicata ------------------------ */

  /**
   * Aprende com o próprio histórico: para cada categoria, guarda um punhado
   * de palavras (≥ 4 letras, sem acento) que apareceram nas descrições já
   * lançadas nela. Uma descrição nova ganha a categoria com mais palavras em
   * comum — é o bastante para "UBER *TRIP" cair sozinho em Transporte depois
   * da primeira vez que a pessoa categorizou um Uber, sem precisar de uma
   * lista fixa de estabelecimentos (que ficaria desatualizada e não serve a
   * ninguém fora do Brasil urbano).
   */
  function indiceCategoria(transacoesExistentes) {
    const porCategoria = {};
    transacoesExistentes.forEach((t) => {
      if (!t.categoria) return;
      const palavras = semAcento(t.descricao).toLowerCase().match(/[a-z]{4,}/g) || [];
      if (!palavras.length) return;
      (porCategoria[t.categoria] ||= new Set());
      palavras.forEach((p) => porCategoria[t.categoria].add(p));
    });
    return porCategoria;
  }

  function sugerirCategoria(descricao, indice, categoriasDisponiveis, tipo) {
    const palavras = semAcento(descricao).toLowerCase().match(/[a-z]{4,}/g) || [];
    let melhor = null;
    let melhorPontos = 0;
    for (const [categoria, vocabulario] of Object.entries(indice)) {
      if (!categoriasDisponiveis.includes(categoria)) continue;
      const pontos = palavras.filter((p) => vocabulario.has(p)).length;
      if (pontos > melhorPontos) { melhorPontos = pontos; melhor = categoria; }
    }
    if (melhor) return melhor;
    const padrao = tipo === "receita" ? "Renda" : "Outros";
    return categoriasDisponiveis.includes(padrao) ? padrao : categoriasDisponiveis[0] || "";
  }

  /**
   * Mesmo valor (na mesma direção) a até 3 dias de distância de um
   * lançamento que já existe → provavelmente já foi lançado à mão antes de a
   * pessoa lembrar de importar o extrato. Só um alerta: a pessoa decide,
   * a linha só entra desmarcada por padrão.
   */
  function provavelDuplicata(linha, transacoesExistentes) {
    const alvo = Date.parse(linha.data);
    return transacoesExistentes.some((t) => {
      if (t.tipo !== linha.tipo || Math.abs((Number(t.valor) || 0) - linha.valor) > 0.005) return false;
      const dias = Math.abs(Date.parse(t.data) - alvo) / 86400000;
      return dias <= 3;
    });
  }

  return {
    extensao, lerTexto, parseOFX, parseCSV, sugerirMapeamento, aplicarMapeamento,
    normalizarData, normalizarValor, indiceCategoria, sugerirCategoria, provavelDuplicata,
  };
})();

// Só no navegador (o módulo da UI usa DOM, Store e UI — precisa deles no escopo global).
if (typeof document !== "undefined") {
  Importar.abrirAssistente = (() => {
    const { fmt } = UI;

    /** Estado do assistente enquanto ele está aberto — não é Store, é descartável. */
    function estadoInicial() {
      return { arquivo: null, texto: "", tipoArquivo: "", csv: null, mapeamento: null, origem: "", linhas: [] };
    }

    async function abrir(aoConcluir) {
      const contasOk = Financas.opcoesOrigem().length > 1;
      const s = estadoInicial();
      s.aoConcluir = aoConcluir;

      UI.abrirModal(`
        <div class="modal-head">
          <h2 class="modal-title">Importar extrato</h2>
          <p class="modal-desc">Exporte o extrato pelo app do seu banco (.ofx, .qfx ou .csv) e importe aqui. O arquivo é lido neste navegador — nada é enviado a nenhum banco.</p>
        </div>
        <div class="modal-body">
          ${!contasOk ? `<div class="notice info"><span class="ic">●</span><span>Sem conta ou cartão cadastrado, os lançamentos entram sem "pago com" definido. <a href="contas.html">Cadastrar agora</a>.</span></div>` : ""}
          <div class="field">
            <label>De qual conta ou cartão é este extrato?</label>
            <select class="input" data-origem>${Financas.opcoesOrigem().map((o) => `<option value="${fmt.escape(o.valor)}">${fmt.escape(o.rotulo)}</option>`).join("")}</select>
          </div>
          <div class="anexos-campo">
            <input type="file" accept=".ofx,.qfx,.csv,text/csv" class="hidden" data-entrada />
            <div class="dropzone" data-zona tabindex="0" role="button">
              <strong>Escolher arquivo do extrato</strong>
              Clique aqui ou arraste — .ofx, .qfx ou .csv
            </div>
            <p class="card-note" data-nome-arquivo style="margin:8px 0 0;"></p>
          </div>
          <span class="err hidden" data-erro></span>
        </div>
        <div class="modal-foot">
          <button class="btn" data-acao="cancelar" type="button">Cancelar</button>
          <button class="btn primary" data-acao="continuar" type="button" disabled>Continuar</button>
        </div>`, {
        aoMontar(modal, fechar) {
          const zona = modal.querySelector("[data-zona]");
          const entrada = modal.querySelector("[data-entrada]");
          const btnContinuar = modal.querySelector('[data-acao="continuar"]');
          const erro = modal.querySelector("[data-erro]");

          const escolher = () => entrada.click();
          zona.addEventListener("click", escolher);
          zona.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); escolher(); } });
          ["dragenter", "dragover"].forEach((n) => zona.addEventListener(n, (e) => { e.preventDefault(); zona.classList.add("dragover"); }));
          ["dragleave", "drop"].forEach((n) => zona.addEventListener(n, (e) => { e.preventDefault(); zona.classList.remove("dragover"); }));
          zona.addEventListener("drop", (e) => { if (e.dataTransfer.files[0]) receberArquivo(e.dataTransfer.files[0]); });
          entrada.addEventListener("change", () => { if (entrada.files[0]) receberArquivo(entrada.files[0]); });

          async function receberArquivo(file) {
            erro.classList.add("hidden");
            const ext = Importar.extensao(file.name);
            if (!["ofx", "qfx", "csv"].includes(ext)) {
              erro.textContent = "Formato não reconhecido. Exporte como .ofx, .qfx ou .csv pelo app do banco.";
              erro.classList.remove("hidden");
              return;
            }
            s.arquivo = file;
            s.tipoArquivo = ext === "csv" ? "csv" : "ofx";
            modal.querySelector("[data-nome-arquivo]").textContent = `${file.name}, ${Arquivos.tamanhoLegivel(file.size)}`;
            s.texto = await Importar.lerTexto(file);
            btnContinuar.disabled = false;
          }

          btnContinuar.addEventListener("click", async () => {
            s.origem = modal.querySelector("[data-origem]").value;
            if (s.tipoArquivo === "ofx") {
              const linhas = Importar.parseOFX(s.texto);
              if (!linhas.length) {
                erro.textContent = "Não encontrei nenhum lançamento nesse arquivo. Confira se é mesmo o extrato (algumas contas exportam um OFX \"resumo\", sem os lançamentos).";
                erro.classList.remove("hidden");
                return;
              }
              s.linhas = linhas;
              fechar(null);
              abrirRevisao(s);
            } else {
              s.csv = Importar.parseCSV(s.texto);
              if (!s.csv.linhas.length) {
                erro.textContent = "Não encontrei linhas nesse arquivo.";
                erro.classList.remove("hidden");
                return;
              }
              fechar(null);
              abrirMapeamento(s);
            }
          });

          modal.querySelector('[data-acao="cancelar"]').addEventListener("click", () => fechar(null));
        },
      });
    }

    /* --------------------------- Passo 2 (só CSV): mapear colunas ------------- */

    function abrirMapeamento(s) {
      const { cabecalho, linhas } = s.csv;
      const sugestao = Importar.sugerirMapeamento(cabecalho);
      const papelDe = (col) => (sugestao.valor === col ? "valor" : sugestao.entrada === col ? "entrada" : sugestao.saida === col ? "saida" : sugestao.data === col ? "data" : sugestao.descricao === col ? "descricao" : "ignorar");
      const OPCOES = [
        ["ignorar", "Ignorar"], ["data", "Data"], ["descricao", "Descrição"],
        ["valor", "Valor (com sinal)"], ["entrada", "Entrada / crédito"], ["saida", "Saída / débito"],
      ];

      const linhasExemplo = linhas.slice(0, 4);

      UI.abrirModal(`
        <div class="modal-head">
          <h2 class="modal-title">O que é cada coluna?</h2>
          <p class="modal-desc">Confira o que o Delfos adivinhou. Se o extrato tem uma coluna só de valor (positivo/negativo), use "Valor"; se tem colunas separadas de entrada e saída, mapeie as duas.</p>
        </div>
        <div class="modal-body">
          <div class="table-wrap">
            <table class="sheet">
              <thead><tr>${cabecalho.map((_, i) => `<th><select class="input sm" data-papel="${i}">${OPCOES.map(([v, r]) => `<option value="${v}" ${papelDe(i) === v ? "selected" : ""}>${r}</option>`).join("")}</select></th>`).join("")}</tr></thead>
              <tbody>
                ${linhasExemplo.map((l) => `<tr>${cabecalho.map((_, i) => `<td class="muted" style="white-space:nowrap;">${fmt.escape((l[i] ?? "").slice(0, 24))}</td>`).join("")}</tr>`).join("")}
              </tbody>
            </table>
          </div>
          <span class="hint">Mostrando as 4 primeiras linhas de ${linhas.length}.</span>
          <span class="err hidden" data-erro></span>
        </div>
        <div class="modal-foot">
          <button class="btn" data-acao="voltar" type="button">Voltar</button>
          <button class="btn primary" data-acao="continuar" type="button">Continuar</button>
        </div>`, {
        classe: "xwide",
        aoMontar(modal, fechar) {
          modal.querySelector('[data-acao="voltar"]').addEventListener("click", () => { fechar(null); abrir(s.aoConcluir); });
          modal.querySelector('[data-acao="continuar"]').addEventListener("click", () => {
            const mapa = { data: null, descricao: null, valor: null, entrada: null, saida: null };
            modal.querySelectorAll("[data-papel]").forEach((sel) => {
              if (sel.value !== "ignorar") mapa[sel.value] = Number(sel.dataset.papel);
            });
            const erro = modal.querySelector("[data-erro]");
            if (mapa.data === null || mapa.descricao === null || (mapa.valor === null && mapa.entrada === null && mapa.saida === null)) {
              erro.textContent = "Marque pelo menos a coluna de data, a de descrição e a de valor (ou entrada/saída).";
              erro.classList.remove("hidden");
              return;
            }
            const { linhas: prontas, ignoradas } = Importar.aplicarMapeamento(linhas, mapa);
            if (!prontas.length) {
              erro.textContent = "Nenhuma linha ficou reconhecível com esse mapeamento — confira o formato da data e do valor.";
              erro.classList.remove("hidden");
              return;
            }
            s.linhas = prontas;
            s.ignoradasNoMapeamento = ignoradas;
            fechar(null);
            abrirRevisao(s);
          });
        },
      });
    }

    /* -------------------------------- Passo 3: revisão ------------------------ */

    function abrirRevisao(s) {
      const existentes = Store.lista("financeiro.transacoes");
      const categorias = Store.estado().financeiro.categorias;
      const indice = Importar.indiceCategoria(existentes);

      const preparadas = s.linhas
        .slice()
        .sort((a, b) => b.data.localeCompare(a.data))
        .map((l, i) => ({
          ...l,
          id: `pre-${i}`,
          categoria: Importar.sugerirCategoria(l.descricao, indice, categorias, l.tipo),
          duplicata: Importar.provavelDuplicata(l, existentes),
        }));

      const linha = (p) => `
        <tr data-linha="${p.id}" class="${p.duplicata ? "linha-duvidosa" : ""}">
          <td><input type="checkbox" class="check" data-marcar ${p.duplicata ? "" : "checked"} /></td>
          <td class="muted" style="white-space:nowrap;">${fmt.dataCurta(p.data)}</td>
          <td><input type="text" class="input sm" data-descricao value="${fmt.escape(p.descricao)}" /></td>
          <td>
            <div class="seg sm" data-tipo>
              <input type="hidden" value="${p.tipo}" />
              <button type="button" data-valor="despesa" aria-pressed="${String(p.tipo === "despesa")}">Despesa</button>
              <button type="button" data-valor="receita" aria-pressed="${String(p.tipo === "receita")}">Receita</button>
            </div>
          </td>
          <td>
            <select class="input sm" data-categoria>${categorias.map((c) => `<option value="${fmt.escape(c)}" ${c === p.categoria ? "selected" : ""}>${fmt.escape(c)}</option>`).join("")}</select>
          </td>
          <td class="right num" data-valor-exibido>${fmt.moeda(p.valor)}</td>
          <td>${p.duplicata ? `<span class="badge urgente" title="Já existe um lançamento parecido perto dessa data">repetido?</span>` : ""}</td>
        </tr>`;

      const avisoIgnoradas = s.ignoradasNoMapeamento
        ? `<span class="hint">${s.ignoradasNoMapeamento} ${s.ignoradasNoMapeamento === 1 ? "linha não entrou" : "linhas não entraram"} por não ter data ou valor reconhecíveis.</span>`
        : "";

      UI.abrirModal(`
        <div class="modal-head">
          <h2 class="modal-title">Revisar antes de importar</h2>
          <p class="modal-desc">Confira descrição, tipo e categoria — o Delfos já tenta adivinhar a categoria pelo que você categorizou antes. Linhas marcadas "possível repetido" já têm algo parecido lançado perto dessa data e vêm desmarcadas.</p>
        </div>
        <div class="modal-body">
          <div class="table-wrap" style="max-height:46vh; overflow-y:auto;">
            <table class="sheet tabela-importar">
              <colgroup>
                <col style="width:26px" /><col style="width:54px" /><col />
                <col style="width:172px" /><col style="width:140px" /><col style="width:100px" /><col style="width:92px" />
              </colgroup>
              <thead><tr><th></th><th>Data</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th class="right">Valor</th><th></th></tr></thead>
              <tbody data-corpo>${preparadas.map(linha).join("")}</tbody>
            </table>
          </div>
          ${avisoIgnoradas}
          <div class="card-note" data-resumo style="margin:0;"></div>
        </div>
        <div class="modal-foot">
          <button class="btn" data-acao="cancelar" type="button">Cancelar</button>
          <button class="btn primary" data-acao="importar" type="button">Importar selecionados</button>
        </div>`, {
        classe: "xwide",
        aoMontar(modal, fechar) {
          const corpo = modal.querySelector("[data-corpo]");
          const btnImportar = modal.querySelector('[data-acao="importar"]');

          function atualizarResumo() {
            const marcadas = [...corpo.querySelectorAll("[data-marcar]:checked")].length;
            modal.querySelector("[data-resumo]").textContent =
              `${marcadas} de ${preparadas.length} ${preparadas.length === 1 ? "lançamento selecionado" : "lançamentos selecionados"}.`;
            btnImportar.disabled = marcadas === 0;
            btnImportar.textContent = marcadas ? `Importar ${marcadas} ${marcadas === 1 ? "lançamento" : "lançamentos"}` : "Importar selecionados";
          }
          corpo.addEventListener("change", (ev) => { if (ev.target.matches("[data-marcar]")) atualizarResumo(); });
          atualizarResumo();

          corpo.querySelectorAll("[data-tipo]").forEach((seg) => {
            seg.addEventListener("click", (ev) => {
              const b = ev.target.closest("button");
              if (!b) return;
              seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
              seg.querySelector("input").value = b.dataset.valor;
            });
          });

          modal.querySelector('[data-acao="cancelar"]').addEventListener("click", () => fechar(null));

          btnImportar.addEventListener("click", () => {
            const inseridos = [];
            corpo.querySelectorAll("tr[data-linha]").forEach((tr) => {
              if (!tr.querySelector("[data-marcar]").checked) return;
              const id = tr.dataset.linha;
              const original = preparadas.find((p) => p.id === id);
              const item = Store.inserir("financeiro.transacoes", {
                data: original.data,
                descricao: tr.querySelector("[data-descricao]").value.trim() || "Lançamento importado",
                tipo: tr.querySelector("[data-tipo] input").value,
                categoria: tr.querySelector("[data-categoria]").value,
                valor: original.valor,
                origem: s.origem,
                forma: "Importado do extrato",
                status: "pago",
              });
              inseridos.push(item.id);
            });
            fechar(null);
            if (!inseridos.length) return;
            s.aoConcluir?.();
            UI.toast(`${inseridos.length} ${inseridos.length === 1 ? "lançamento importado" : "lançamentos importados"}.`, {
              acaoRotulo: "Desfazer",
              aoAcionar: () => { inseridos.forEach((id) => Store.remover("financeiro.transacoes", id)); s.aoConcluir?.(); UI.toast("Importação desfeita."); },
              duracao: 6000,
            });
          });
        },
      });
    }

    return abrir;
  })();
}
