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

  /* --------------------------------- PDF ------------------------------------
     PDF não tem "linhas de dados": tem pedaços de texto soltos, cada um numa
     posição da página. lerPDF (no navegador, com o pdf.js da Mozilla em
     vendor/pdfjs) remonta as linhas pela altura de cada pedaço; daqui para
     baixo é só texto, e dá para testar sem navegador.

     Não existe um formato de extrato em PDF — cada banco desenha o seu. Em
     vez de um leitor por banco (que quebraria na primeira mudança de layout),
     o interpretador procura o que todo extrato tem: uma data, uma descrição
     e um valor em reais na mesma linha. O resto é dedução, nesta ordem de
     confiança, para decidir se é entrada ou saída:
       1. sinal escrito no valor ("-45,90", "45,90 D", "+ 150,00", "45,90-");
       2. coluna de saldo: se saldo anterior − valor = saldo da linha, saiu;
       3. seção do extrato ("Total de entradas" / "Saídas" / "Débitos"…);
       4. fatura de cartão: tudo é compra, menos o que vier negativo;
       5. palavras da descrição ("recebido", "estorno" × "compra", "enviado").
     Quando só a 5 decide, a linha vai marcada "confira" na revisão.
     Nada entra sem a revisão, onde data, valor, tipo e descrição são editáveis. */

  const MESES_PDF = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  const NOMES_MES = "jan(?:eiro)?|fev(?:ereiro)?|mar(?:[cç]o)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?";
  // Data no começo da linha: 15/09/2026, 15/09/26, 15/09, 15-09-2026, 15 SET 2026, 15 set, 15 de setembro de 2026.
  const RE_DATA_INICIO = new RegExp(
    `^\\s*(?:(\\d{1,2})[/.\\-](\\d{1,2})(?:[/.\\-](\\d{2,4}))?|(\\d{1,2})(?:\\s+de)?\\s+(${NOMES_MES})\\.?(?:\\s+(?:de\\s+)?(\\d{4}))?)(?![\\d,])`, "i");
  // Valor em reais no padrão brasileiro, com sinal ou D/C opcionais.
  const RE_VALOR = /(?<![\d.,/])([-−+–]\s?)?(?:R\$\s?)?([-−–]\s?)?(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})(?![\d])(\s?[-−–](?![\d])|\s?[DC](?![A-Za-zÀ-ú]))?/g;
  const RE_IGNORAR = /\bsaldo\b|\bsubtotal\b|^\s*total\b|\btotal (?:de|da|do|geral|a pagar|desta|dispon)|\blimite\b|\bsaldo anterior\b|valor m[ií]nimo|pagamento m[ií]nimo|melhor data|\bvencimento\b.*\d{2}\/\d{2}|p[aá]gina \d+|\bcet\b|taxa de juros|encargos (?:m[aá]ximos|para o pr[oó]ximo)/i;
  const RE_ENTRADA = /\brecebid|\bcr[eé]dito\b|\bdep[oó]sito|\bestorno|\brendimento|\bsal[aá]rio|\breembolso|\bdevolu[cç]|\bresgate|\bcashback|\bpix recebido|\btransfer[eê]ncia recebida|\bted recebida|\bentrada\b/i;
  const RE_SAIDA = /\benviad|\bpagamento|\bpagto|\bcompra|\bd[eé]bito\b|\bsaque|\btarifa|\bboleto|\baplica[cç][aã]o|\bpix enviado|\btransfer[eê]ncia enviada|\bted enviada|\bsa[ií]da\b|\biof\b|\banuidade|\bjuros\b/i;
  const RE_PAGAMENTO_FATURA = /pagamento (?:recebido|de fatura|da fatura|efetuado)|pagto fatura|pagamento em \d{2}\/\d{2}/i;

  function lerValoresPDF(linha) {
    const achados = [];
    RE_VALOR.lastIndex = 0;
    let m;
    while ((m = RE_VALOR.exec(linha))) {
      const numero = Number(`${m[3].replace(/\./g, "")}.${m[4]}`);
      const antes = (m[1] || "") + (m[2] || "");
      const depois = (m[5] || "").trim().toUpperCase();
      let sinal = 0;
      if (/[-−–]/.test(antes) || /[-−–]/.test(depois) || depois === "D") sinal = -1;
      else if (antes.includes("+") || depois === "C") sinal = 1;
      achados.push({ numero, sinal, inicio: m.index, fim: m.index + m[0].length });
    }
    return achados;
  }

  function anoCom4(a) {
    if (!a) return null;
    const n = Number(a);
    return a.length === 2 ? (n <= 69 ? 2000 + n : 1900 + n) : n;
  }

  /** Ano de referência: o que mais aparece em datas completas do documento (período do extrato). */
  function anoDoDocumento(linhas, hoje = new Date()) {
    const contagem = {};
    const re = new RegExp(`\\b\\d{1,2}[/.\\-]\\d{1,2}[/.\\-](\\d{4})\\b|\\b(?:${NOMES_MES})\\.?(?:\\s+de)?\\s+(\\d{4})\\b|\\b\\d{2}\\/(\\d{4})\\b`, "gi");
    linhas.forEach((l) => { let m; re.lastIndex = 0; while ((m = re.exec(l))) { const a = Number(m[1] || m[2] || m[3]); if (a > 1990 && a < 2100) contagem[a] = (contagem[a] || 0) + 1; } });
    const [melhor] = Object.entries(contagem).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    if (melhor) return Number(melhor[0]);
    // Sem data completa: um ano solto no cabeçalho ("Movimentação 2025").
    const solto = linhas.slice(0, 8).join(" ").match(/\b(19[9]\d|20\d{2})\b/);
    return solto ? Number(solto[1]) : hoje.getFullYear();
  }

  /** Data no começo da linha → { iso, resto } ou null. Sem ano, usa `ano`. */
  function dataNoInicio(linha, ano) {
    const m = RE_DATA_INICIO.exec(linha);
    if (!m) return null;
    let d, mes, a;
    if (m[1]) { d = Number(m[1]); mes = Number(m[2]); a = anoCom4(m[3]); }
    else { d = Number(m[4]); mes = MESES_PDF[semAcento(m[5]).slice(0, 3).toLowerCase()]; a = m[6] ? Number(m[6]) : null; }
    if (!mes || mes > 12 || d < 1 || d > 31) return null;
    a = a || ano;
    const iso = `${a}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (Number.isNaN(Date.parse(iso))) return null;
    return { iso, resto: linha.slice(m[0].length), semAno: !m[3] && !m[6], mes };
  }

  function limparDescricao(s) {
    return linhaUnica(String(s || "")
      .replace(/R\$/g, " ")
      .replace(/\s[DC]\s*$/, " ")
      .replace(/^[\s\-–—|:;,.]+|[\s\-–—|:;,.]+$/g, "")
      .replace(/\s{2,}/g, " "));
  }

  /**
   * Linhas de texto de um extrato em PDF → { linhas, ignoradas, fatura }.
   * Cada linha devolvida: { data, descricao, valor, tipo, incerto?, duvidosa? }.
   */
  function parseTextoExtrato(textoLinhas, { hoje = new Date() } = {}) {
    const linhas = textoLinhas.map((l) => String(l || "").replace(/ /g, " ")).filter((l) => l.trim());
    const tudo = linhas.join("\n");
    const fatura = /\bfatura\b/i.test(tudo) && /cart[aã]o|vencimento/i.test(tudo) && !/\bextrato\b.*\bconta\b/i.test(tudo);
    const ano = anoDoDocumento(linhas, hoje);
    // Extrato que atravessa o ano (dez → jan) sem ano nas datas: mês maior que o
    // último mês visto na mesma leitura volta um ano.
    const mesesComAno = new Set();

    const saida = [];
    let ignoradas = 0;
    let dataAtual = null;
    let secao = 0; // +1 entradas, −1 saídas, 0 desconhecida
    let saldoAnterior = null;
    let ultima = null; // última linha adicionada, para juntar descrição que quebra em duas

    for (const bruta of linhas) {
      const linha = bruta.trim();
      const sem = semAcento(linha).toLowerCase();

      // Seções (Nubank, Inter, C6…): "Total de entradas", "Saídas", "Créditos".
      if (/^(?:total de )?(?:entradas|cr[eé]ditos|recebimentos|dep[oó]sitos)\b/.test(sem) || /\btotal de entradas\b/.test(sem)) secao = 1;
      if (/^(?:total de )?(?:sa[ií]das|d[eé]bitos|pagamentos e compras|gastos|despesas)\b/.test(sem) || /\btotal de saidas\b/.test(sem)) secao = -1;

      const data = dataNoInicio(linha, ano);
      let resto = data ? data.resto : linha;
      if (data) {
        let iso = data.iso;
        if (data.semAno && mesesComAno.size) {
          const maior = Math.max(...mesesComAno);
          if (data.mes > maior + 6) iso = `${ano - 1}${iso.slice(4)}`;
        }
        mesesComAno.add(data.mes);
        dataAtual = iso;
      }

      const valores = lerValoresPDF(resto);

      if (RE_IGNORAR.test(linha)) {
        // Linha de saldo: não é lançamento, mas o número serve para deduzir o sinal das próximas.
        if (/\bsaldo\b/i.test(linha) && valores.length) {
          const v = valores[valores.length - 1];
          saldoAnterior = v.numero * (v.sinal || 1);
        }
        ultima = null;
        continue;
      }

      if (!valores.length) {
        // Sem valor: pode ser o resto da descrição da linha anterior (Nubank quebra
        // "Transferência enviada pelo Pix" / "FULANO - CPF…" em duas).
        if (ultima && !data && linha.length < 90 && !/^\d+$/.test(linha)) {
          const extra = limparDescricao(linha);
          if (extra && (ultima.descricao + extra).length <= 110) ultima.descricao = `${ultima.descricao} — ${extra}`;
          ultima = null; // no máximo uma linha de complemento
        }
        continue;
      }
      if (!dataAtual) { ignoradas++; continue; }

      // Com duas quantias ou mais, a primeira é o lançamento e a última, o saldo.
      const v = valores[0];
      const saldoLinha = valores.length >= 2 ? valores[valores.length - 1] : null;
      const descricao = limparDescricao(resto.slice(0, v.inicio) + " " + resto.slice(v.fim, saldoLinha ? saldoLinha.inicio : undefined)) || "Lançamento do extrato";
      if (v.numero === 0) { ignoradas++; continue; }

      // Na fatura o sinal escrito é do ponto de vista do cartão: negativo é
      // crédito (estorno, pagamento); sem sinal, é compra.
      let sinal = fatura ? (v.sinal < 0 ? 1 : -1) : v.sinal;
      let incerto = false;
      if (!sinal && saldoLinha && saldoAnterior !== null) {
        const saldo = saldoLinha.numero * (saldoLinha.sinal || 1);
        if (Math.abs(saldoAnterior - v.numero - saldo) < 0.011) sinal = -1;
        else if (Math.abs(saldoAnterior + v.numero - saldo) < 0.011) sinal = 1;
      }
      if (!sinal && secao) sinal = secao;
      if (!sinal && fatura) sinal = -1;
      if (!sinal) {
        const ent = RE_ENTRADA.test(descricao), sai = RE_SAIDA.test(descricao);
        sinal = ent && !sai ? 1 : -1;
        incerto = ent === sai; // nenhuma pista (ou pistas contraditórias)
      }
      const tipo = sinal > 0 ? "receita" : "despesa";
      const item = { data: dataAtual, descricao, valor: v.numero, tipo };
      if (incerto) item.incerto = true;
      if (fatura && RE_PAGAMENTO_FATURA.test(descricao)) item.duvidosa = true; // pagamento da fatura anterior já saiu da conta
      if (saldoLinha) saldoAnterior = saldoLinha.numero * (saldoLinha.sinal || 1);
      else if (saldoAnterior !== null) saldoAnterior += sinal * v.numero;
      saida.push(item);
      ultima = item;
    }
    return { linhas: saida, ignoradas, fatura };
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
   * Gastos fixos: o Delfos já lança cada um todo mês (Financas.gerarFixos).
   * Quando o extrato traz a cobrança de verdade, ela não pode virar um
   * segundo lançamento — vira a confirmação do que já existe (valor e data
   * reais, pago). Esta função decide qual linha do extrato é qual fixo.
   *
   * Candidatos: lançamentos de fixo ainda não conferidos com um extrato.
   * Uma linha de despesa casa com um candidato quando é do mesmo mês de
   * competência (ou até 10 dias da data prevista) e:
   *   - o valor bate (até 2% ou R$ 1 de diferença), ou
   *   - a descrição tem uma palavra em comum e o valor está a até 35% —
   *     conta de luz e de água mudam de um mês para o outro.
   * Cada candidato casa com uma linha só, a de maior pontuação.
   * Devolve um array paralelo a `linhas`: o id do candidato ou null.
   */
  function casarFixos(linhas, candidatos) {
    const palavras = (s) => new Set(semAcento(s).toLowerCase().match(/[a-z]{4,}/g) || []);
    const pares = [];
    linhas.forEach((l, i) => {
      if (l.tipo !== "despesa") return;
      const pl = palavras(l.descricao);
      candidatos.forEach((c) => {
        const cv = Number(c.valor) || 0;
        if (cv <= 0) return;
        const dias = Math.abs(Date.parse(l.data) - Date.parse(c.data)) / 86400000;
        const mesmoMes = (l.data || "").slice(0, 7) === c.competencia;
        if (!mesmoMes && dias > 10) return;
        const dif = Math.abs(l.valor - cv);
        const rel = dif / cv;
        // Nomes que o banco já usou para este fixo (aprendidos em importações anteriores) também valem.
        const nome = [c.descricao, ...(c.nomesExtrato || [])].some((n) => [...palavras(n)].some((p) => pl.has(p)));
        const valorBate = dif <= 1 || rel <= 0.02;
        if (!valorBate && !(nome && rel <= 0.35)) return;
        pares.push({ i, id: c.id, pontos: (nome ? 2 : 0) + (valorBate ? 1 : 0) + (1 - rel) - dias / 100 });
      });
    });
    pares.sort((a, b) => b.pontos - a.pontos);
    const resultado = linhas.map(() => null);
    const usados = new Set();
    pares.forEach((p) => {
      if (resultado[p.i] !== null || usados.has(p.id)) return;
      resultado[p.i] = p.id;
      usados.add(p.id);
    });
    return resultado;
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
    parseTextoExtrato, lerValoresPDF, casarFixos,
  };
})();

// Só no navegador (o módulo da UI usa DOM, Store e UI — precisa deles no escopo global).
if (typeof document !== "undefined") {
  /**
   * PDF → linhas de texto, no próprio navegador (pdf.js em vendor/pdfjs, só
   * baixado quando alguém escolhe um PDF). Erros com `motivo`:
   * "senha" (precisa de senha), "senhaErrada", "semTexto" (PDF de imagem).
   */
  Importar.lerPDF = async (file, senha) => {
    const base = new URL("vendor/pdfjs/", document.baseURI).href;
    const pdfjs = await import(base + "pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.mjs";
    const dados = new Uint8Array(await file.arrayBuffer());
    const tarefa = pdfjs.getDocument({ data: dados, password: senha || undefined, isEvalSupported: false, disableFontFace: true, useSystemFonts: false });
    let doc;
    try {
      doc = await tarefa.promise;
    } catch (e) {
      tarefa.destroy();
      if (e?.name === "PasswordException") {
        const err = new Error(senha ? "Senha incorreta." : "Este PDF tem senha.");
        err.motivo = senha ? "senhaErrada" : "senha";
        throw err;
      }
      const err = new Error("Não consegui abrir esse PDF. Ele pode estar corrompido.");
      err.motivo = "invalido";
      throw err;
    }
    const linhas = [];
    let caracteres = 0;
    for (let n = 1; n <= Math.min(doc.numPages, 60); n++) {
      const pagina = await doc.getPage(n);
      const { items } = await pagina.getTextContent();
      // Agrupa os pedaços pela altura (y); dentro da linha, ordena por x e
      // separa colunas por um vão largo (dois espaços), palavras por um.
      const pedacos = items
        .filter((it) => it.str && it.str.trim())
        .map((it) => ({ s: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: Math.abs(it.transform[3]) || it.height || 10 }));
      pedacos.sort((a, b) => b.y - a.y || a.x - b.x);
      const grupos = [];
      for (const p of pedacos) {
        const g = grupos.find((gr) => Math.abs(gr.y - p.y) <= Math.max(2, Math.min(gr.h, p.h) * 0.45));
        if (g) g.itens.push(p); else grupos.push({ y: p.y, h: p.h, itens: [p] });
      }
      grupos.sort((a, b) => b.y - a.y);
      for (const g of grupos) {
        g.itens.sort((a, b) => a.x - b.x);
        let texto = "";
        let fim = null;
        for (const it of g.itens) {
          if (fim !== null) {
            const vao = it.x - fim;
            texto += vao > g.h * 1.2 ? "  " : vao > g.h * 0.12 && !texto.endsWith(" ") && !it.s.startsWith(" ") ? " " : "";
          }
          texto += it.s;
          fim = it.x + it.w;
        }
        caracteres += texto.trim().length;
        linhas.push(texto);
      }
      pagina.cleanup();
    }
    await tarefa.destroy();
    if (caracteres < 20) {
      const err = new Error("Esse PDF é uma imagem (foto ou digitalização), sem texto para ler.");
      err.motivo = "semTexto";
      throw err;
    }
    return linhas;
  };

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
          <p class="modal-desc">Baixe o extrato ou a fatura pelo app do seu banco (PDF, .ofx, .qfx ou .csv) e importe aqui. O arquivo é lido neste navegador: não sai do aparelho e nada é enviado a nenhum banco.</p>
        </div>
        <div class="modal-body">
          ${!contasOk ? `<div class="notice info"><span class="ic">●</span><span>Sem conta ou cartão cadastrado, os lançamentos entram sem "pago com" definido. <a href="contas.html">Cadastrar agora</a>.</span></div>` : ""}
          <div class="field">
            <label>De qual conta ou cartão é este extrato?</label>
            <select class="input" data-origem>${Financas.opcoesOrigem().map((o) => `<option value="${fmt.escape(o.valor)}">${fmt.escape(o.rotulo)}</option>`).join("")}</select>
          </div>
          <div class="anexos-campo">
            <input type="file" accept=".pdf,application/pdf,.ofx,.qfx,.csv,text/csv" class="hidden" data-entrada />
            <div class="dropzone" data-zona tabindex="0" role="button">
              <strong>Escolher arquivo do extrato</strong>
              Clique aqui ou arraste: PDF, .ofx, .qfx ou .csv
            </div>
            <p class="card-note" data-nome-arquivo style="margin:8px 0 0;"></p>
          </div>
          <div class="field hidden" data-campo-senha>
            <label for="imp-senha">Senha do PDF</label>
            <input class="input" type="password" id="imp-senha" data-senha autocomplete="off" />
            <span class="hint">Muitos bancos protegem o extrato com os primeiros dígitos do CPF. A senha só abre o arquivo aqui; não é guardada.</span>
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
          const campoSenha = modal.querySelector("[data-campo-senha]");
          const inpSenha = modal.querySelector("[data-senha]");
          inpSenha.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); btnContinuar.click(); } });
          const mostrarErro = (t) => { erro.textContent = t; erro.classList.remove("hidden"); };

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
            const ehPDF = ext === "pdf" || file.type === "application/pdf";
            campoSenha.classList.add("hidden");
            if (!ehPDF && !["ofx", "qfx", "csv"].includes(ext)) {
              erro.textContent = "Formato não reconhecido. Use o PDF do extrato ou exporte como .ofx, .qfx ou .csv pelo app do banco.";
              erro.classList.remove("hidden");
              return;
            }
            s.arquivo = file;
            s.tipoArquivo = ehPDF ? "pdf" : ext === "csv" ? "csv" : "ofx";
            modal.querySelector("[data-nome-arquivo]").textContent = `${file.name}, ${Arquivos.tamanhoLegivel(file.size)}`;
            s.texto = ehPDF ? "" : await Importar.lerTexto(file);
            btnContinuar.disabled = false;
          }

          btnContinuar.addEventListener("click", async () => {
            s.origem = modal.querySelector("[data-origem]").value;
            erro.classList.add("hidden");
            if (s.tipoArquivo === "pdf") {
              const rotulo = btnContinuar.textContent;
              btnContinuar.disabled = true;
              btnContinuar.textContent = "Lendo o PDF…";
              try {
                const texto = await Importar.lerPDF(s.arquivo, inpSenha.value);
                const r = Importar.parseTextoExtrato(texto);
                if (!r.linhas.length) {
                  mostrarErro("Li o PDF, mas não achei lançamentos com data e valor. Se for um comprovante ou um resumo, baixe o extrato completo do período; se o banco oferecer, o .ofx é o formato mais seguro.");
                  return;
                }
                s.linhas = r.linhas;
                s.ignoradasNoMapeamento = r.ignoradas;
                s.fatura = r.fatura;
                fechar(null);
                abrirRevisao(s);
              } catch (e) {
                if (e.motivo === "senha" || e.motivo === "senhaErrada") {
                  campoSenha.classList.remove("hidden");
                  inpSenha.focus();
                  if (e.motivo === "senhaErrada") { inpSenha.select(); mostrarErro("Senha incorreta. Confira no app do banco qual é a senha dos extratos."); }
                  else mostrarErro("Este PDF tem senha. Digite abaixo e toque em Continuar.");
                } else if (e.motivo === "semTexto") {
                  mostrarErro("Esse PDF é uma imagem (foto ou digitalização), sem texto para ler. Baixe o extrato direto do app do banco, sem imprimir nem fotografar.");
                } else {
                  mostrarErro(e.motivo ? e.message : "Não consegui ler esse PDF agora. Tente de novo ou use o .ofx/.csv do banco.");
                  if (!e.motivo) console.error(e);
                }
              } finally {
                btnContinuar.disabled = false;
                btnContinuar.textContent = rotulo;
              }
              return;
            }
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

      // Lançamentos de gasto fixo ainda não conferidos com um extrato: se a
      // cobrança estiver aqui, ela confirma o fixo em vez de virar outro gasto.
      const fixosCadastrados = Store.lista("financeiro.fixos");
      const candidatosFixo = existentes
        .filter((t) => t.fixoId && !t.conciliadoEm && t.tipo === "despesa")
        .map((t) => ({ ...t, nomesExtrato: fixosCadastrados.find((f) => f.id === t.fixoId)?.nomesExtrato || [] }));
      const ordenadas = s.linhas.slice().sort((a, b) => b.data.localeCompare(a.data));
      const casados = Importar.casarFixos(ordenadas, candidatosFixo);
      // A checagem de repetido não pode ver o próprio fixo que está sendo confirmado.
      const semCandidatos = existentes.filter((t) => !casados.includes(t.id));
      const preparadas = ordenadas.map((l, i) => {
        const fixo = casados[i] ? candidatosFixo.find((t) => t.id === casados[i]) : null;
        return {
          ...l,
          id: `pre-${i}`,
          categoria: fixo ? fixo.categoria : Importar.sugerirCategoria(l.descricao, indice, categorias, l.tipo),
          fixo,
          duplicata: !fixo && Importar.provavelDuplicata(l, semCandidatos),
        };
      });
      const nFixos = preparadas.filter((p) => p.fixo).length;

      // No PDF o Delfos deduz o valor e a data do desenho da página: ficam editáveis.
      const editavel = s.tipoArquivo === "pdf";
      const seloFixo = (p) => `<button type="button" class="badge fixo" data-fixo title="Esta cobrança é o gasto fixo “${fmt.escape(p.fixo.descricao)}”, que já está lançado. Importar só confirma o pagamento com o valor e a data do extrato, sem lançar de novo. Toque se for outro gasto.">fixo: ${fmt.escape(p.fixo.descricao)}</button>`;
      // Sem casamento automático (a conta de luz mudou de valor e o banco usa outro
      // nome): a pessoa pode dizer qual fixo é. O Delfos guarda o nome do banco
      // e reconhece sozinho nos próximos meses.
      const livres = candidatosFixo.filter((c) => !casados.includes(c.id));
      const escolherFixo = (p) => p.tipo === "despesa" && livres.length
        ? `<select class="input sm" data-escolher-fixo title="Se esta cobrança for de um gasto fixo, escolha qual — ele é confirmado em vez de lançado de novo."><option value="">É gasto fixo?</option>${livres.map((c) => `<option value="${fmt.escape(c.id)}">${fmt.escape(c.descricao)}, ${fmt.moeda(c.valor)} (${fmt.dataCurta(c.data)})</option>`).join("")}</select>`
        : "";
      const selo = (p) => p.fixo ? seloFixo(p) : p.duplicata ? `<span class="badge urgente" title="Já existe um lançamento parecido perto dessa data">repetido?</span>` : p.duvidosa || p.incerto ? seloOutro(p) : escolherFixo(p);
      const seloOutro = (p) => p.duplicata ? `<span class="badge urgente" title="Já existe um lançamento parecido perto dessa data">repetido?</span>`
        : p.duvidosa ? `<span class="badge" title="Pagamento da fatura anterior: o dinheiro já saiu da conta, lançar de novo contaria duas vezes">pagamento?</span>`
        : p.incerto ? `<span class="badge" title="O extrato não diz se é entrada ou saída; confira o tipo">confira</span>` : "";
      const linha = (p) => `
        <tr data-linha="${p.id}" class="${p.duplicata || p.duvidosa ? "linha-duvidosa" : ""}">
          <td><input type="checkbox" class="check" data-marcar ${p.duplicata || p.duvidosa ? "" : "checked"} /></td>
          ${editavel
            ? `<td><input type="date" class="input sm" data-data value="${p.data}" /></td>`
            : `<td class="muted" style="white-space:nowrap;">${fmt.dataCurta(p.data)}</td>`}
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
          ${editavel
            ? `<td class="right"><input type="text" inputmode="decimal" class="input sm num right" data-quantia value="${fmt.decimal(p.valor, 2)}" /></td>`
            : `<td class="right num" data-valor-exibido>${fmt.moeda(p.valor)}</td>`}
          <td>${selo(p)}</td>
        </tr>`;

      const avisoIgnoradas = s.ignoradasNoMapeamento
        ? `<span class="hint">${s.ignoradasNoMapeamento} ${s.ignoradasNoMapeamento === 1 ? "linha não entrou" : "linhas não entraram"} por não ter data ou valor reconhecíveis.</span>`
        : "";

      UI.abrirModal(`
        <div class="modal-head">
          <h2 class="modal-title">Revisar antes de importar</h2>
          <p class="modal-desc">${editavel
            ? `O Delfos leu o PDF${s.fatura ? " como fatura de cartão" : ""} e separou ${preparadas.length} ${preparadas.length === 1 ? "lançamento" : "lançamentos"}. PDF não tem colunas de verdade, então confira data, valor e tipo: tudo é editável. Linhas com "confira" não diziam se eram entrada ou saída.`
            : "Confira descrição, tipo e categoria — o Delfos já tenta adivinhar a categoria pelo que você categorizou antes."} Linhas marcadas "repetido?" já têm algo parecido lançado perto dessa data e vêm desmarcadas.${nFixos ? ` <b>${nFixos} ${nFixos === 1 ? "cobrança é de um gasto fixo" : "cobranças são de gastos fixos"}</b> que o Delfos já tinha lançado: ${nFixos === 1 ? "ela confirma" : "elas confirmam"} o pagamento, sem contar duas vezes.` : ""}</p>
        </div>
        <div class="modal-body">
          <div class="table-wrap" style="max-height:46vh; overflow-y:auto;">
            <table class="sheet tabela-importar${editavel ? " editavel" : ""}">
              <colgroup>
                <col style="width:26px" /><col style="width:${editavel ? 132 : 54}px" /><col />
                <col style="width:${editavel ? 150 : 172}px" /><col style="width:${editavel ? 128 : 140}px" /><col style="width:100px" /><col style="width:${nFixos || livres.length ? 160 : preparadas.some(selo) ? 92 : 10}px" />
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
            const marcadas = [...corpo.querySelectorAll("tr[data-linha]")].filter((tr) => tr.querySelector("[data-marcar]").checked);
            const ehFixo = (tr) => { const p = preparadas.find((x) => x.id === tr.dataset.linha); return !!((p.fixo && !p.fixoIgnorado) || p.fixoEscolhido); };
            const fixos = marcadas.filter(ehFixo).length;
            const novos = marcadas.length - fixos;
            modal.querySelector("[data-resumo]").textContent =
              `${marcadas.length} de ${preparadas.length} ${preparadas.length === 1 ? "lançamento selecionado" : "lançamentos selecionados"}${fixos ? `: ${novos} ${novos === 1 ? "novo" : "novos"} e ${fixos} ${fixos === 1 ? "gasto fixo" : "gastos fixos"} a confirmar` : ""}.`;
            btnImportar.disabled = marcadas.length === 0;
            btnImportar.textContent = !marcadas.length ? "Importar selecionados"
              : !fixos ? `Importar ${novos} ${novos === 1 ? "lançamento" : "lançamentos"}`
              : !novos ? `Confirmar ${fixos} ${fixos === 1 ? "gasto fixo" : "gastos fixos"}`
              : `Importar ${novos} e confirmar ${fixos} ${fixos === 1 ? "fixo" : "fixos"}`;
          }
          corpo.addEventListener("change", (ev) => { if (ev.target.matches("[data-marcar]")) atualizarResumo(); });
          // O selo "fixo: X" alterna: tocar diz "é outro gasto" (entra como lançamento novo).
          corpo.addEventListener("change", (ev) => {
            const sel = ev.target.closest("[data-escolher-fixo]");
            if (!sel) return;
            const p = preparadas.find((x) => x.id === sel.closest("tr").dataset.linha);
            p.fixoEscolhido = sel.value ? candidatosFixo.find((c) => c.id === sel.value) : null;
            const tr = sel.closest("tr");
            tr.querySelector("[data-marcar]").checked = true;
            if (p.fixoEscolhido) tr.querySelector("[data-categoria]").value = p.fixoEscolhido.categoria;
            atualizarResumo();
          });
          corpo.addEventListener("click", (ev) => {
            const b = ev.target.closest("[data-fixo]");
            if (!b) return;
            const p = preparadas.find((x) => x.id === b.closest("tr").dataset.linha);
            p.fixoIgnorado = !p.fixoIgnorado;
            b.classList.toggle("desligado", p.fixoIgnorado);
            b.textContent = p.fixoIgnorado ? "lançar como novo" : `fixo: ${p.fixo.descricao}`;
            atualizarResumo();
          });
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
            const confirmados = []; // [{ id, antes }] — fixos que o extrato confirmou
            corpo.querySelectorAll("tr[data-linha]").forEach((tr) => {
              if (!tr.querySelector("[data-marcar]").checked) return;
              const id = tr.dataset.linha;
              const original = preparadas.find((p) => p.id === id);
              const dataEditada = tr.querySelector("[data-data]")?.value;
              const valorEditado = tr.querySelector("[data-quantia]") ? Math.abs(Importar.normalizarValor(tr.querySelector("[data-quantia]").value) || 0) : null;
              if (valorEditado === 0) return;
              const alvoFixo = original.fixo && !original.fixoIgnorado ? original.fixo : original.fixoEscolhido;
              if (alvoFixo && !confirmados.some((c) => c.id === alvoFixo.id)) {
                const t = alvoFixo;
                // Aprende o nome que o banco usa, para casar sozinho no mês que vem.
                const f = Store.lista("financeiro.fixos").find((x) => x.id === t.fixoId);
                const nomeBanco = tr.querySelector("[data-descricao]").value.trim();
                if (f && nomeBanco && !(f.nomesExtrato || []).includes(nomeBanco)) {
                  confirmados.push({ fixo: f.id, nomesAntes: f.nomesExtrato || [] });
                  Store.atualizar("financeiro.fixos", f.id, { nomesExtrato: [nomeBanco, ...(f.nomesExtrato || [])].slice(0, 5) });
                }
                confirmados.push({ id: t.id, antes: { data: t.data, valor: t.valor, status: t.status, origem: t.origem, conciliadoEm: t.conciliadoEm || "", descricaoExtrato: t.descricaoExtrato || "" } });
                Store.atualizar("financeiro.transacoes", t.id, {
                  data: dataEditada || original.data,
                  valor: valorEditado ?? original.valor,
                  status: "pago",
                  origem: s.origem || t.origem,
                  conciliadoEm: new Date().toISOString(),
                  descricaoExtrato: tr.querySelector("[data-descricao]").value.trim(),
                });
                return;
              }
              const item = Store.inserir("financeiro.transacoes", {
                data: dataEditada || original.data,
                descricao: tr.querySelector("[data-descricao]").value.trim() || "Lançamento importado",
                tipo: tr.querySelector("[data-tipo] input").value,
                categoria: tr.querySelector("[data-categoria]").value,
                valor: valorEditado ?? original.valor,
                origem: s.origem,
                forma: s.tipoArquivo === "pdf" ? "Importado do extrato (PDF)" : "Importado do extrato",
                status: "pago",
              });
              inseridos.push(item.id);
            });
            fechar(null);
            if (!inseridos.length && !confirmados.some((c) => c.id)) return;
            s.aoConcluir?.();
            const partes = [];
            if (inseridos.length) partes.push(`${inseridos.length} ${inseridos.length === 1 ? "lançamento importado" : "lançamentos importados"}`);
            const nConf = confirmados.filter((c) => c.id).length;
            if (nConf) partes.push(`${nConf} ${nConf === 1 ? "gasto fixo confirmado, sem duplicar" : "gastos fixos confirmados, sem duplicar"}`);
            UI.toast(`${partes.join("; ")}.`, {
              acaoRotulo: "Desfazer",
              aoAcionar: () => {
                inseridos.forEach((id) => Store.remover("financeiro.transacoes", id));
                confirmados.forEach((c) => c.fixo
                  ? Store.atualizar("financeiro.fixos", c.fixo, { nomesExtrato: c.nomesAntes })
                  : Store.atualizar("financeiro.transacoes", c.id, c.antes));
                s.aoConcluir?.();
                UI.toast("Importação desfeita.");
              },
              duracao: 6000,
            });
          });
        },
      });
    }

    return abrir;
  })();
}
