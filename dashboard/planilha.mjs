/* Planilhas do Excel (.xlsx) feitas no próprio navegador: a rotina da semana
   e o calendário do mês, organizadas e com estilo (cabeçalho nas cores da
   marca, cor por tipo de atividade, bordas, colunas na largura certa, título
   mesclado, linha de cabeçalho congelada). Nada é enviado: o arquivo é montado
   aqui (OOXML compactado com fflate) e baixado.

   criarXLSX é genérico e puro; planilhaRotina e planilhaMes só decidem o que
   vai em cada célula. Testado com Node e conferido abrindo com openpyxl. */

import { zipSync, strToU8 } from "./vendor/fflate/fflate.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const coluna = (n) => { let s = ""; for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const ref = (l, c) => `${coluna(c)}${l + 1}`;

/* --------------------------------- Estilos -------------------------------- */

// Um estilo é { fonte: { b, i, sz, cor, nome }, fundo: "RRGGBB", borda: "fina"|"base"|"", h, v, quebra, formato }.
function registroDeEstilos() {
  const fontes = ['<font><sz val="11"/><color rgb="FF1F1F1F"/><name val="Calibri"/><family val="2"/></font>'];
  const fundos = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const bordas = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
  const formatos = [];
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const cache = new Map();
  const indice = (lista, xml) => { let i = lista.indexOf(xml); if (i < 0) { lista.push(xml); i = lista.length - 1; } return i; };
  function id(e = {}) {
    const chave = JSON.stringify(e);
    if (cache.has(chave)) return cache.get(chave);
    const f = e.fonte || {};
    const fonte = indice(fontes, `<font>${f.b ? "<b/>" : ""}${f.i ? "<i/>" : ""}<sz val="${f.sz || 11}"/><color rgb="FF${f.cor || "1F1F1F"}"/><name val="${esc(f.nome || "Calibri")}"/><family val="${f.nome === "Georgia" ? 1 : 2}"/></font>`);
    const fundo = e.fundo ? indice(fundos, `<fill><patternFill patternType="solid"><fgColor rgb="FF${e.fundo}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
    const linha = (lado) => (e.borda ? `<${lado} style="thin"><color rgb="FF${e.borda === "forte" ? "8D8980" : "D6D1C7"}"/></${lado}>` : `<${lado}/>`);
    const borda = e.borda ? indice(bordas, `<border>${linha("left")}${linha("right")}${linha("top")}${linha("bottom")}<diagonal/></border>`) : 0;
    let num = 0;
    if (e.formato) {
      const i = formatos.indexOf(e.formato);
      num = 164 + (i < 0 ? formatos.push(e.formato) - 1 : i);
    }
    const alinhamento = e.h || e.v || e.quebra ? `<alignment${e.h ? ` horizontal="${e.h}"` : ""} vertical="${e.v || "center"}"${e.quebra ? ' wrapText="1"' : ""}/>` : "";
    xfs.push(`<xf numFmtId="${num}" fontId="${fonte}" fillId="${fundo}" borderId="${borda}" xfId="0"${num ? ' applyNumberFormat="1"' : ""}${fonte ? ' applyFont="1"' : ""}${fundo ? ' applyFill="1"' : ""}${borda ? ' applyBorder="1"' : ""}${alinhamento ? ' applyAlignment="1"' : ""}>${alinhamento}</xf>`);
    cache.set(chave, xfs.length - 1);
    return xfs.length - 1;
  }
  const xml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${formatos.length ? `<numFmts count="${formatos.length}">${formatos.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(f)}"/>`).join("")}</numFmts>` : ""}<fonts count="${fontes.length}">${fontes.join("")}</fonts><fills count="${fundos.length}">${fundos.join("")}</fills><borders count="${bordas.length}">${bordas.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return { id, xml };
}

/** Dias desde 30/12/1899: como o Excel guarda uma data. */
export function serialDaData(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
}

/**
 * Monta o .xlsx. Cada folha: { nome, larguras: [nº de caracteres por coluna],
 * linhas: [{ altura?, celulas: [valor | { v, e: estilo, data: "AAAA-MM-DD" }] }],
 * mesclas: ["A1:H1"], congelar: nº de linhas fixas no alto, paisagem }.
 */
export function criarXLSX(folhas, { titulo = "Delfos", autor = "Delfos" } = {}) {
  const estilos = registroDeEstilos();
  const nomes = new Set();
  const arquivos = {};
  folhas.forEach((f, n) => {
    let nome = String(f.nome || `Folha ${n + 1}`).replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || `Folha ${n + 1}`;
    while (nomes.has(nome)) nome = `${nome.slice(0, 28)} ${n + 1}`;
    nomes.add(nome);
    f.nomeFinal = nome;
    const linhasXML = f.linhas.map((l, i) => {
      const cel = (l.celulas || []).map((c, j) => {
        if (c === null || c === undefined) return "";
        const o = typeof c === "object" ? c : { v: c };
        const s = o.e ? ` s="${estilos.id(o.e)}"` : "";
        // Texto rico: trechos com negrito ou cor própria na mesma célula.
        if (o.rico) return `<c r="${ref(i, j)}" t="inlineStr"${s}><is>${o.rico.map((r) => `<r><rPr>${r.b ? "<b/>" : ""}<sz val="${r.sz || 10}"/><color rgb="FF${r.cor || "1F1F1F"}"/><rFont val="Calibri"/></rPr><t xml:space="preserve">${esc(r.t)}</t></r>`).join("")}</is></c>`;
        if (o.data) return `<c r="${ref(i, j)}"${s}><v>${serialDaData(o.data)}</v></c>`;
        if (typeof o.v === "number" && Number.isFinite(o.v)) return `<c r="${ref(i, j)}"${s}><v>${o.v}</v></c>`;
        if (o.v === "" || o.v === undefined || o.v === null) return s ? `<c r="${ref(i, j)}"${s}/>` : "";
        return `<c r="${ref(i, j)}" t="inlineStr"${s}><is><t xml:space="preserve">${esc(o.v)}</t></is></c>`;
      }).join("");
      return `<row r="${i + 1}"${l.altura ? ` ht="${l.altura}" customHeight="1"` : ""}>${cel}</row>`;
    }).join("");
    const cols = (f.larguras || []).map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join("");
    const painel = f.congelar ? `<sheetViews><sheetView workbookViewId="0"${n === 0 ? ' tabSelected="1"' : ""} showGridLines="0"><pane ySplit="${f.congelar}" topLeftCell="A${f.congelar + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${f.congelar + 1}" sqref="A${f.congelar + 1}"/></sheetView></sheetViews>`
      : `<sheetViews><sheetView workbookViewId="0"${n === 0 ? ' tabSelected="1"' : ""} showGridLines="0"/></sheetViews>`;
    const mesclas = f.mesclas?.length ? `<mergeCells count="${f.mesclas.length}">${f.mesclas.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "";
    arquivos[`xl/worksheets/sheet${n + 1}.xml`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${f.paisagem ? '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' : ""}${painel}<sheetFormatPr defaultRowHeight="15"/>${cols ? `<cols>${cols}</cols>` : ""}<sheetData>${linhasXML}</sheetData>${mesclas}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>${f.paisagem ? '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>' : ""}</worksheet>`);
  });
  arquivos["[Content_Types].xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${folhas.map((_, n) => `<Override PartName="/xl/worksheets/sheet${n + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  arquivos["_rels/.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  arquivos["docProps/core.xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(titulo)}</dc:title><dc:creator>${esc(autor)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</dcterms:created></cp:coreProperties>`);
  arquivos["xl/workbook.xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${folhas.map((f, n) => `<sheet name="${esc(f.nomeFinal)}" sheetId="${n + 1}" r:id="rId${n + 1}"/>`).join("")}</sheets></workbook>`);
  arquivos["xl/_rels/workbook.xml.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${folhas.map((_, n) => `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n + 1}.xml"/>`).join("")}<Relationship Id="rId${folhas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  arquivos["xl/styles.xml"] = strToU8(estilos.xml());
  return zipSync(arquivos, { level: 6 });
}

/* ------------------------------ Estilos comuns ---------------------------- */

const MARFIM = "EDE9E1", CARVAO = "1F1F1F", CINZA = "8D8980";
const E = {
  titulo: { fonte: { sz: 20, nome: "Georgia", cor: CARVAO }, v: "center" },
  sub: { fonte: { sz: 10, cor: "66625A" }, v: "center" },
  cab: { fonte: { b: true, cor: MARFIM }, fundo: CARVAO, borda: "forte", h: "center", v: "center" },
  cabEsq: { fonte: { b: true, cor: MARFIM }, fundo: CARVAO, borda: "forte", h: "left", v: "center" },
  hora: { fonte: { b: true, cor: "3A3A3A" }, fundo: "F6F3ED", borda: "fina", h: "center", v: "center", quebra: true },
  vazia: { borda: "fina", v: "top", quebra: true },
  texto: { borda: "fina", v: "top", quebra: true },
  centro: { borda: "fina", h: "center", v: "top" },
  data: { borda: "fina", h: "center", v: "top", formato: "dd/mm/yyyy" },
  total: { fonte: { b: true }, fundo: "F6F3ED", borda: "fina", v: "center" },
  totalNum: { fonte: { b: true }, fundo: "F6F3ED", borda: "fina", h: "right", v: "center", formato: "0.0" },
  rodape: { fonte: { i: true, sz: 9, cor: CINZA } },
};

// Cor clara por tipo de atividade, a mesma família de cor da área no painel
// (aula e estudo da Faculdade, trabalho de Projetos, o resto do Pessoal).
export const FUNDO_CATEGORIA = { aula: "DCE7F4", estudo: "E7EEF8", trabalho: "F4E6D3", treino: "F1E0EA", pessoal: "F5E9F0", outro: "ECEAE5" };
const NOMES_CAT = { aula: "Aula", estudo: "Estudo", trabalho: "Trabalho", treino: "Treino", pessoal: "Pessoal", outro: "Outro" };
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
const NOMES_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const minutos = (h) => (/^\d{2}:\d{2}$/.test(h || "") ? +h.slice(0, 2) * 60 + +h.slice(3) : null);
const duracao = (a) => { const i = minutos(a.hora), f = minutos(a.horaFim); return i === null || f === null || f === i ? 0 : f > i ? f - i : f + 1440 - i; };
const dataBR = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/**
 * A rotina como um quadro de horário: uma linha por faixa de horário, uma
 * coluna por dia (segunda a domingo), cada atividade na sua célula com a cor
 * do tipo. Mais uma folha com a lista (um dia por linha) e as horas por tipo.
 */
export function planilhaRotina(rotina, { hoje = new Date().toISOString().slice(0, 10), nome = "" } = {}) {
  const faixas = [...new Set(rotina.filter((a) => a.hora).map((a) => `${a.hora}|${a.horaFim || ""}`))]
    .sort((x, y) => x.localeCompare(y));
  const semHora = rotina.filter((a) => !a.hora);
  const linhas = [
    { altura: 34, celulas: [{ v: "Rotina da semana", e: E.titulo }] },
    { altura: 18, celulas: [{ v: `${nome ? `${nome}. ` : ""}Gerada pelo Delfos em ${dataBR(hoje)}. O que se repete toda semana, de segunda a domingo.`, e: E.sub }] },
    { altura: 8, celulas: [] },
    { altura: 24, celulas: [{ v: "Horário", e: E.cab }, ...ORDEM_DIAS.map((d) => ({ v: NOMES_DIA[d], e: E.cab }))] },
  ];
  const celula = (itens) => {
    if (!itens.length) return { v: "", e: E.vazia };
    const texto = itens.map((a) => [a.titulo, a.local, itens.length > 1 && a.hora ? `${a.hora}${a.horaFim ? `–${a.horaFim}` : ""}` : ""].filter(Boolean).join("\n")).join("\n\n");
    return { v: texto, e: { ...E.texto, fundo: FUNDO_CATEGORIA[itens[0].categoria] || FUNDO_CATEGORIA.outro, fonte: { b: false, cor: "1F1F1F" } } };
  };
  for (const f of faixas) {
    const [h, fim] = f.split("|");
    const doDia = ORDEM_DIAS.map((d) => rotina.filter((a) => a.hora === h && (a.horaFim || "") === fim && (a.dias || []).includes(d)));
    const maior = Math.max(1, ...doDia.map((l) => l.reduce((n, a) => n + 1 + (a.local ? 1 : 0), 0)));
    linhas.push({ altura: Math.min(120, 18 + maior * 15), celulas: [{ v: fim ? `${h}\n${fim}` : h, e: E.hora }, ...doDia.map(celula)] });
  }
  if (semHora.length) {
    const doDia = ORDEM_DIAS.map((d) => semHora.filter((a) => (a.dias || []).includes(d)));
    linhas.push({ altura: 40, celulas: [{ v: "Sem horário", e: E.hora }, ...doDia.map(celula)] });
  }
  if (!faixas.length && !semHora.length) linhas.push({ altura: 30, celulas: [{ v: "A rotina ainda está vazia.", e: E.sub }] });
  // Legenda das cores, com o nome escrito (a cor nunca é o único sinal).
  const usados = [...new Set(rotina.map((a) => a.categoria || "outro"))];
  linhas.push({ altura: 10, celulas: [] });
  linhas.push({ altura: 20, celulas: [{ v: "Tipos:", e: E.rodape }, ...usados.map((c) => ({ v: NOMES_CAT[c] || c, e: { borda: "fina", h: "center", fundo: FUNDO_CATEGORIA[c] || FUNDO_CATEGORIA.outro, fonte: { sz: 10 } } }))] });

  // Lista: uma linha por atividade em cada dia, na ordem da semana.
  const lista = [
    { altura: 30, celulas: [{ v: "Atividades, dia a dia", e: E.titulo }] },
    { altura: 8, celulas: [] },
    { altura: 22, celulas: ["Dia", "Início", "Fim", "Atividade", "Tipo", "Local", "Horas", "Observações"].map((t) => ({ v: t, e: E.cabEsq })) },
  ];
  const porCategoria = {};
  for (const d of ORDEM_DIAS) {
    rotina.filter((a) => (a.dias || []).includes(d)).sort((a, b) => (a.hora || "99").localeCompare(b.hora || "99")).forEach((a) => {
      const horas = duracao(a) / 60;
      porCategoria[a.categoria || "outro"] = (porCategoria[a.categoria || "outro"] || 0) + horas;
      lista.push({ celulas: [
        { v: NOMES_DIA[d], e: E.texto }, { v: a.hora || "", e: E.centro }, { v: a.horaFim || "", e: E.centro },
        { v: a.titulo, e: { ...E.texto, fonte: { b: true } } },
        { v: NOMES_CAT[a.categoria] || "Outro", e: { ...E.texto, fundo: FUNDO_CATEGORIA[a.categoria] || FUNDO_CATEGORIA.outro } },
        { v: a.local || "", e: E.texto }, { v: horas ? Math.round(horas * 10) / 10 : "", e: { ...E.centro, formato: "0.0" } },
        { v: a.observacoes || "", e: E.texto },
      ] });
    });
  }
  lista.push({ altura: 10, celulas: [] });
  lista.push({ altura: 22, celulas: [{ v: "Horas por semana", e: E.cabEsq }, { v: "", e: E.cabEsq }] });
  Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).forEach(([c, h]) => lista.push({ celulas: [{ v: NOMES_CAT[c] || c, e: { ...E.total, fundo: FUNDO_CATEGORIA[c] || FUNDO_CATEGORIA.outro } }, { v: Math.round(h * 10) / 10, e: E.totalNum }] }));
  const totalHoras = Object.values(porCategoria).reduce((t, h) => t + h, 0);
  lista.push({ celulas: [{ v: "Total", e: E.total }, { v: Math.round(totalHoras * 10) / 10, e: E.totalNum }] });

  return criarXLSX([
    { nome: "Rotina da semana", larguras: [12, 22, 22, 22, 22, 22, 22, 22], linhas, mesclas: ["A1:H1", "A2:H2"], congelar: 4, paisagem: true },
    { nome: "Lista", larguras: [12, 9, 9, 30, 12, 22, 8, 36], linhas: lista, mesclas: ["A1:H1"], congelar: 3 },
  ], { titulo: "Rotina da semana" });
}

/**
 * O mês como calendário (segunda a domingo, um quadro por dia com o que tem
 * nele) e uma folha com a lista de compromissos com data real (ordena e
 * filtra no Excel). `itens` é { "AAAA-MM-DD": [{ titulo, hora, local, areaRotulo, concluido }] }.
 */
export function planilhaMes(itensPorDia, ano, mes, { hoje = new Date().toISOString().slice(0, 10) } = {}) {
  const pad = (n) => String(n).padStart(2, "0");
  const nomeMes = `${MESES[mes]} de ${ano}`;
  const primeiro = new Date(Date.UTC(ano, mes, 1));
  const recuo = (primeiro.getUTCDay() + 6) % 7; // segunda primeiro
  const diasNoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const semanas = Math.ceil((recuo + diasNoMes) / 7);
  const linhas = [
    { altura: 36, celulas: [{ v: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1), e: E.titulo }] },
    { altura: 18, celulas: [{ v: `Compromissos de todas as abas. Gerado pelo Delfos em ${dataBR(hoje)}.`, e: E.sub }] },
    { altura: 8, celulas: [] },
    { altura: 22, celulas: ORDEM_DIAS.map((d) => ({ v: NOMES_DIA[d], e: E.cab })) },
  ];
  for (let s = 0; s < semanas; s++) {
    const cel = [];
    let maior = 1;
    for (let k = 0; k < 7; k++) {
      const n = s * 7 + k - recuo + 1;
      if (n < 1 || n > diasNoMes) { cel.push({ v: "", e: { borda: "fina", fundo: "F2F0EB" } }); continue; }
      const iso = `${ano}-${pad(mes + 1)}-${pad(n)}`;
      const lista = (itensPorDia[iso] || []).slice().sort((a, b) => (a.hora || "99").localeCompare(b.hora || "99"));
      maior = Math.max(maior, lista.length);
      const rico = [{ t: String(n), b: true, sz: 11 }, ...lista.map((i) => ({ t: `\n${i.hora ? `${i.hora} ` : ""}${i.titulo}${i.concluido ? " (feito)" : ""}`, cor: i.concluido ? "8D8980" : "1F1F1F" }))];
      const fds = k >= 5;
      cel.push({ rico, e: { borda: "fina", v: "top", quebra: true, fundo: iso === hoje ? "F4E6D3" : fds ? "F6F3ED" : undefined, fonte: { sz: 10, b: iso === hoje } } });
    }
    linhas.push({ altura: Math.max(70, 22 + maior * 14), celulas: cel });
  }
  // Lista com data de verdade (formato dd/mm/aaaa): dá para ordenar e filtrar.
  const lista = [
    { altura: 30, celulas: [{ v: `Compromissos de ${nomeMes}`, e: E.titulo }] },
    { altura: 8, celulas: [] },
    { altura: 22, celulas: ["Data", "Dia", "Hora", "Compromisso", "Aba", "Local", "Situação"].map((t) => ({ v: t, e: E.cabEsq })) },
  ];
  Object.keys(itensPorDia).filter((iso) => iso.startsWith(`${ano}-${pad(mes + 1)}`)).sort().forEach((iso) => {
    const dia = NOMES_DIA[new Date(`${iso}T12:00:00Z`).getUTCDay()];
    itensPorDia[iso].slice().sort((a, b) => (a.hora || "99").localeCompare(b.hora || "99")).forEach((i) => lista.push({ celulas: [
      { data: iso, e: E.data }, { v: dia, e: E.texto }, { v: i.hora || "", e: E.centro },
      { v: i.titulo, e: { ...E.texto, fonte: { b: true } } }, { v: i.areaRotulo || "", e: E.texto }, { v: i.local || "", e: E.texto },
      { v: i.concluido ? "Feito" : iso < hoje ? "Passou" : "A fazer", e: E.centro },
    ] }));
  });
  if (lista.length === 3) lista.push({ celulas: [{ v: "Nada marcado neste mês.", e: E.sub }] });
  return criarXLSX([
    { nome: `${MESES[mes].slice(0, 3)} ${ano}`.replace(/^./, (c) => c.toUpperCase()), larguras: [24, 24, 24, 24, 24, 24, 24], linhas, mesclas: ["A1:G1", "A2:G2"], congelar: 4, paisagem: true },
    { nome: "Lista", larguras: [12, 11, 8, 36, 16, 24, 10], linhas: lista, mesclas: ["A1:G1"], congelar: 3 },
  ], { titulo: `Calendário de ${nomeMes}` });
}

/** Baixa os bytes como arquivo .xlsx (só no navegador). */
export function baixar(bytes, nome) {
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
