/* Compromissos e rotina a partir de um arquivo qualquer: PDF, Word, PowerPoint,
   planilha (CSV ou Excel) ou a foto/print de um calendário. Tudo é lido neste
   aparelho; o conteúdo do arquivo é dado, nunca instrução.

   Duas partes, como em importar.js:
   - funções puras (analisarTabela, analisarLinhas, analisarPosicionado...),
     sem DOM nem Store, testadas com Node em test/agenda-arquivo.test.cjs;
   - a leitura no navegador (lerArquivoAgenda), que só extrai texto, tabela
     ou palavras com posição e entrega para as funções puras.

   O resultado tem dois eixos, os mesmos da aba Pessoal:
   - eventos: compromissos pontuais, com data (o calendário do mês);
   - rotina: o que se repete toda semana, com dias da semana (a rotina).
   Nada é gravado aqui: quem chama mostra a revisão antes. */

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const pad = (n) => String(n).padStart(2, "0");

export const normalizar = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const limpar = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

export function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s && +s.slice(0, 4) >= 2000 && +s.slice(0, 4) <= 2100;
}
export const horaValida = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || "");

/* ------------------------------ Dias da semana ---------------------------- */

// 0 = domingo … 6 = sábado, como Date.getDay(). Aceita nome inteiro, plural,
// "-feira", abreviação de três letras, "2ª"/"2a" e os nomes em inglês (a
// exportação de algumas agendas sai em inglês).
const PADROES_DIA = [
  /^(?:domingos?|dom|sun(?:day)?)$/,
  /^(?:(?:segundas?|seg|2[ao]?)(?:-?feiras?)?|mon(?:day)?)$/,
  /^(?:(?:tercas?|ter|3[ao]?)(?:-?feiras?)?|tue(?:s(?:day)?)?)$/,
  /^(?:(?:quartas?|qua|4[ao]?)(?:-?feiras?)?|wed(?:nesday)?)$/,
  /^(?:(?:quintas?|qui|5[ao]?)(?:-?feiras?)?|thu(?:rs(?:day)?)?)$/,
  /^(?:(?:sextas?|sex|6[ao]?)(?:-?feiras?)?|fri(?:day)?)$/,
  /^(?:sabados?|sab|sat(?:urday)?)$/,
];
export const NOMES_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const semPontuacao = (s) => normalizar(s).replace(/ª|º/g, "a").replace(/[.,;:()[\]]/g, " ").replace(/\s+/g, " ").trim();

/** O dia da semana de uma palavra ou célula inteira ("Segunda-feira", "QUA", "5ª"); senão -1. */
export function diaDaSemana(texto) {
  const t = semPontuacao(texto).replace(/\s*-\s*feira/, "-feira");
  if (!t || t.length > 14) return -1;
  return PADROES_DIA.findIndex((re) => re.test(t));
}

/** Todos os dias da semana citados num trecho, com "segunda a sexta" expandido. */
export function diasCitados(texto) {
  const t = ` ${semPontuacao(texto).replace(/\s*-\s*feira/g, "-feira")} `;
  const achados = [];
  // Abreviações de três letras só valem soltas, para "seg" não pegar "segue" nem "sexta" pegar "sex" duas vezes.
  const re = /(?<![a-z0-9])(domingos?|segundas?(?:-?feiras?)?|tercas?(?:-?feiras?)?|quartas?(?:-?feiras?)?|quintas?(?:-?feiras?)?|sextas?(?:-?feiras?)?|sabados?|dom|seg|ter|qua|qui|sex|sab|[2-6]a(?:\s*feira)?)(?![a-z0-9])/g;
  for (const m of t.matchAll(re)) {
    const d = diaDaSemana(m[1].replace(/\s+feira/, "-feira"));
    if (d >= 0) achados.push({ dia: d, indice: m.index });
  }
  const dias = [...new Set(achados.map((a) => a.dia))];
  if (dias.length === 2 && /(?:seg|ter|qua|qui|sex|sab|dom|[2-6]a)[a-z-]*\s+(?:a|ate|-)\s+(?:seg|ter|qua|qui|sex|sab|dom|[2-6]a)/.test(t)) {
    const [a, b] = achados.map((x) => x.dia);
    const fim = b === 0 ? 7 : b;
    for (let i = a + 1; i < fim; i++) dias.push(i % 7);
  }
  return [...new Set(dias)].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7));
}

/* ---------------------------------- Datas --------------------------------- */

function mesDe(palavra) {
  const p = normalizar(palavra).replace(/\.$/, "");
  let i = MESES.indexOf(p);
  if (i < 0) i = MESES_CURTOS.indexOf(p.slice(0, 3)) >= 0 && (p.length === 3 || MESES.some((m) => m.startsWith(p))) ? MESES_CURTOS.indexOf(p.slice(0, 3)) : -1;
  if (i < 0) i = MESES_EN.indexOf(p);
  return i;
}

/**
 * Ano de uma data escrita sem ano: o do contexto, mas se assim ela cairia mais
 * de dois meses no passado, é do ano seguinte (um calendário de janeiro lido
 * em novembro fala do próximo janeiro).
 */
function anoProvavel(mes, dia, ctx) {
  if (ctx.anoFixo) return ctx.ano;
  const hoje = ctx.hoje || new Date().toISOString().slice(0, 10);
  const iso = `${ctx.ano}-${pad(mes)}-${pad(dia)}`;
  const limite = new Date(`${hoje}T12:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() - 62);
  return iso < limite.toISOString().slice(0, 10) ? ctx.ano + 1 : ctx.ano;
}

/** Datas num trecho: 15/11, 15/11/2026, 15.11.26, 2026-11-15, 15 de novembro, 15 nov. */
export function datasEm(texto, ctx) {
  const t = normalizar(texto);
  const achadas = [];
  const re = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b|\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}|\d{2}))?\b(?![.,]?\d)|\b(\d{1,2})(?:\s+de|\s*-)?\s+([a-z]{3,9})\.?(?:\s+(?:de\s+)?(20\d{2}))?\b/g;
  for (const m of t.matchAll(re)) {
    let ano, mes, dia;
    if (m[1]) [ano, mes, dia] = [+m[1], +m[2], +m[3]];
    else if (m[4]) {
      // Exportação em inglês: mês/dia (11/20/2026).
      [dia, mes] = ctx.mesPrimeiro ? [+m[5], +m[4]] : [+m[4], +m[5]];
      ano = m[6] ? (+m[6] < 100 ? 2000 + +m[6] : +m[6]) : anoProvavel(mes, dia, ctx);
    } else {
      const i = mesDe(m[8]);
      if (i < 0) continue;
      [dia, mes] = [+m[7], i + 1];
      ano = m[9] ? +m[9] : anoProvavel(mes, dia, ctx);
    }
    const iso = `${ano}-${pad(mes)}-${pad(dia)}`;
    if (dataValida(iso)) achadas.push({ data: iso, indice: m.index, texto: m[0] });
  }
  return achadas;
}

/** Horários: 8h, 8h30, 08:30, 8:30 às 10:00, das 8 às 10, 2:00 PM. */
export function horasEm(texto) {
  const t = normalizar(texto)
    .replace(/\b20\d{2}-\d{1,2}-\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b/g, " ");
  const achadas = [];
  for (const m of t.matchAll(/(?<![\d:])([01]?\d|2[0-3])\s*(?::\s*([0-5]\d)|h\s*([0-5]\d)?(?:min)?)(?:\s*(am|pm|a\.m\.|p\.m\.))?(?![a-z\d])/g)) {
    let h = +m[1];
    const ampm = m[4]?.[0];
    if (ampm === "p" && h < 12) h += 12;
    if (ampm === "a" && h === 12) h = 0;
    achadas.push(`${pad(h)}:${pad(m[2] || m[3] || 0)}`);
  }
  if (!achadas.length) {
    const m = t.match(/\bdas?\s+(\d{1,2})\s+(?:as?|ate)\s+(\d{1,2})\b/);
    if (m && +m[1] < 24 && +m[2] < 24) achadas.push(`${pad(m[1])}:00`, `${pad(m[2])}:00`);
  }
  const hora = achadas[0] || "";
  const horaFim = achadas[1] && achadas[1] > hora ? achadas[1] : "";
  return { hora, horaFim };
}

/** Uma célula de planilha com data: texto, ou o número de série do Excel (dias desde 30/12/1899). */
function dataDaCelula(v, ctx) {
  const s = String(v ?? "").trim();
  if (/^\d{5}(?:\.\d+)?$/.test(s)) {
    const n = Math.floor(Number(s));
    if (n > 30000 && n < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
      return d.toISOString().slice(0, 10);
    }
  }
  return datasEm(s, ctx)[0]?.data || "";
}

/** Uma célula de planilha com horário: texto, ou a fração do dia do Excel (0,5 = 12:00). */
function horasDaCelula(v) {
  const s = String(v ?? "").trim();
  if (/^0?\.\d+$/.test(s) || /^0,\d+$/.test(s)) {
    const min = Math.round(Number(s.replace(",", ".")) * 1440);
    if (min >= 0 && min < 1440) return { hora: `${pad(Math.floor(min / 60))}:${pad(min % 60)}`, horaFim: "" };
  }
  // "8 - 10" ou "8–10" numa coluna de horário.
  const so = normalizar(s).match(/^(\d{1,2})\s*[-–a]\s*(\d{1,2})$/);
  if (so && +so[1] < 24 && +so[2] < 24 && +so[2] > +so[1]) return { hora: `${pad(so[1])}:00`, horaFim: `${pad(so[2])}:00` };
  return horasEm(s.replace(/[–—]/g, "-"));
}

/* --------------------------------- Títulos -------------------------------- */

const PALAVRAS_VAZIAS = /^(?:as|às|a|ate|até|das|da|de|do|e|h|hs|hrs|horas?|-|–|—|\||:|;|,|\.|\/)$/i;

/** O que sobra de uma linha sem data, hora e dia da semana: o nome do compromisso. */
export function tituloDe(texto) {
  let t = String(texto ?? "")
    .replace(/\b20\d{2}-\d{1,2}-\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b/g, " ")
    .replace(/(?<![\p{L}\d])\d{1,2}(?:\s+de|\s*-)?\s+(?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?(?:\s+(?:de\s+)?20\d{2})?(?![\p{L}\d])/giu, " ")
    .replace(/(?<![\d:])(?:[01]?\d|2[0-3])\s*(?::\s*[0-5]\d|h\s*(?:[0-5]\d)?(?:min)?)(?:\s*(?:am|pm))?(?![\p{L}\d])/giu, " ")
    .replace(/\bdas?\s+\d{1,2}\s+(?:às|as|até|ate)\s+\d{1,2}\b/gi, " ")
    .replace(/(?<![\p{L}\d])(?:domingos?|segundas?(?:-?feiras?)?|terças?(?:-?feiras?)?|tercas?(?:-?feiras?)?|quartas?(?:-?feiras?)?|quintas?(?:-?feiras?)?|sextas?(?:-?feiras?)?|sábados?|sabados?|dom|seg|ter|qua|qui|sex|sáb|sab|[2-6][ªa](?:\s*feira)?)\.?(?![\p{L}\d])/giu, " ")
    .replace(/[|•●▪◦·]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Conectores e pontuação soltos nas pontas ("às", "-", "das").
  let partes = t.split(" ");
  while (partes.length && PALAVRAS_VAZIAS.test(partes[0])) partes.shift();
  while (partes.length && PALAVRAS_VAZIAS.test(partes[partes.length - 1])) partes.pop();
  t = partes.join(" ").replace(/^[\s\-–—:;,.|/]+|[\s\-–—:;,|/]+$/g, "").trim();
  if (!/\p{L}/u.test(t)) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** "novembro de 2026", "NOVEMBRO 2026", "Calendário de novembro/2026", "Nov 2026". */
export function mesDoCabecalho(texto, ctx) {
  const t = normalizar(texto).replace(/[/|]/g, " ");
  if (t.length > 48) return null;
  const m = t.match(/^(?:(?:calendario|agenda|cronograma|programacao|escala|mes)\s+(?:de\s+|do\s+mes\s+de\s+)?)?([a-z]{3,9})\.?(?:\s+(?:de\s+)?(20\d{2}))?$/);
  if (!m) return null;
  const i = mesDe(m[1]);
  if (i < 0 || (m[1].length < 4 && !m[2])) return null;
  return { mes: i + 1, ano: m[2] ? +m[2] : anoProvavel(i + 1, 28, ctx), explicito: !!m[2] };
}

/* ------------------------------ Texto corrido ----------------------------- */

function contexto(opcoes = {}) {
  const hoje = opcoes.hoje || new Date().toISOString().slice(0, 10);
  return { ano: opcoes.ano || +hoje.slice(0, 4), anoFixo: !!opcoes.anoFixo, hoje, mesPrimeiro: !!opcoes.mesPrimeiro };
}

function novoResultado() {
  return { eventos: [], rotina: [], avisos: [], mesGrade: null };
}

/**
 * Linhas de texto (PDF, Word, PowerPoint, o texto lido de uma foto). Uma linha
 * com data e nome vira compromisso; uma linha só com a data vira o dia das
 * linhas seguintes (agendas listadas por dia); dia da semana com horário vira
 * rotina, e um dia da semana sozinho vale para as linhas de baixo (horário
 * listado por dia). Com o mês num cabeçalho, "15 Consulta" é o dia 15 dele.
 */
export function analisarLinhas(linhas, opcoes = {}) {
  const ctx = contexto(opcoes);
  const r = novoResultado();
  let mesCtx = opcoes.mes ? { mes: opcoes.mes, ano: opcoes.anoMes || ctx.ano } : null;
  let dataCtx = "";
  let diasCtx = [];
  for (const bruta of linhas) {
    const linha = limpar(bruta);
    if (!linha || linha.length > 300) continue;
    const cab = mesDoCabecalho(linha, ctx);
    if (cab) { mesCtx = cab; dataCtx = ""; diasCtx = []; continue; }
    const ds = datasEm(linha, ctx);
    const hs = horasEm(linha);
    const ws = diasCitados(linha);
    const titulo = tituloDe(linha);
    if (ds.length) {
      if (titulo.length >= 2) {
        // "10/11 e 12/11: plantão" vale para as duas; um intervalo longo, não.
        ds.slice(0, 4).forEach((d) => r.eventos.push({ titulo, data: d.data, ...hs, trecho: linha }));
      } else { dataCtx = ds[0].data; diasCtx = []; }
      continue;
    }
    // "15 Consulta" com o mês no cabeçalho; nunca "08:00 Aula" nem "1 hora de leitura".
    const diaSolto = mesCtx && linha.match(/^(\d{1,2})(?![:h]\s*\d)(?:\s*[-–.)]\s*|\s*:(?!\s*\d)\s*|\s+)(.*)$/i);
    const unidade = diaSolto && /^(?:h|hs|hrs?|horas?|min|minutos?|x|vez(?:es)?|dias?|semanas?|meses|anos?|pag|paginas?|km|kg)\b/i.test(normalizar(diaSolto[2]));
    if (diaSolto && !unidade && +diaSolto[1] >= 1 && +diaSolto[1] <= 31 && !ws.length) {
      const iso = `${mesCtx.ano}-${pad(mesCtx.mes)}-${pad(diaSolto[1])}`;
      const resto = tituloDe(diaSolto[2]);
      if (dataValida(iso)) {
        if (resto.length >= 2) r.eventos.push({ titulo: resto, data: iso, ...horasEm(diaSolto[2]), trecho: linha });
        else { dataCtx = iso; diasCtx = []; }
        continue;
      }
    }
    if (ws.length && !titulo) { diasCtx = ws; dataCtx = ""; continue; }
    if (ws.length && (hs.hora || titulo)) {
      r.rotina.push({ titulo: titulo || "Atividade", dias: ws, ...hs, trecho: linha });
      continue;
    }
    if (!titulo) continue;
    if (dataCtx) r.eventos.push({ titulo, data: dataCtx, ...hs, trecho: linha });
    else if (diasCtx.length) r.rotina.push({ titulo, dias: diasCtx, ...hs, trecho: linha });
  }
  return finalizar(r);
}

/* --------------------------------- Tabelas -------------------------------- */

const CABECALHOS = {
  data: /^(?:data|dia|date|data (?:de )?inicio|start date|data do evento|quando)$/,
  dataFim: /^(?:data (?:de )?(?:fim|termino)|end date)$/,
  hora: /^(?:hora|horario|inicio|hora (?:de )?inicio|horario (?:de )?inicio|start time|start|comeca)$/,
  horaFim: /^(?:fim|termino|hora (?:de )?(?:fim|termino)|horario (?:de )?(?:fim|termino)|end time|end|ate|acaba)$/,
  titulo: /^(?:titulo|assunto|evento|compromisso|atividade|descricao|subject|summary|nome|disciplina|materia|aula|o que|tarefa)$/,
  local: /^(?:local|lugar|sala|onde|location|endereco)$/,
  diaSemana: /^(?:dia da semana|dia semana|weekday|dias?)$/,
  diaInteiro: /^(?:all day event|dia inteiro|o dia todo)$/,
  obs: /^(?:observacoes|observacao|obs|description|notas|detalhes)$/,
};

/** Qual coluna é o quê, pelos nomes do cabeçalho. */
function mapearCabecalho(celulas) {
  const mapa = {};
  celulas.forEach((c, i) => {
    const t = normalizar(c).replace(/[:*]/g, "").trim();
    for (const [papel, re] of Object.entries(CABECALHOS)) {
      if (mapa[papel] === undefined && re.test(t)) { mapa[papel] = i; break; }
    }
  });
  return mapa;
}

/** Junta horários seguidos da mesma atividade: 07:00–07:50 e 07:50–08:40 de Anatomia viram 07:00–08:40. */
function juntarSeguidos(rotina) {
  const saida = [];
  const ordenada = [...rotina].sort((a, b) => a.dias[0] - b.dias[0] || (a.hora || "").localeCompare(b.hora || ""));
  for (const item of ordenada) {
    const ant = saida[saida.length - 1];
    // A sala costuma vir só numa das linhas: local vazio não separa.
    const mesmo = ant && ant.dias.join() === item.dias.join() && normalizar(ant.titulo) === normalizar(item.titulo) && (!ant.local || !item.local || ant.local === item.local);
    const encosta = ant && ant.horaFim && item.hora && (item.hora <= ant.horaFim || minutos(item.hora) - minutos(ant.horaFim) <= 20);
    if (mesmo && encosta) { ant.horaFim = item.horaFim || ant.horaFim; ant.local = ant.local || item.local; continue; }
    if (mesmo && !ant.horaFim && ant.hora && item.hora && minutos(item.hora) - minutos(ant.hora) <= 120) { ant.horaFim = item.horaFim || item.hora; continue; }
    saida.push({ ...item });
  }
  return saida;
}
const minutos = (h) => (horaValida(h) ? +h.slice(0, 2) * 60 + +h.slice(3) : NaN);

/** Sala, laboratório, prédio ou algo com número: é o local, não o nome que quebrou de linha. */
const pareceLocal = (t) => /\d/.test(t) || /^(?:sala|lab|laborat|bloco|audit|anfiteatro|predio|hospital|ambulat|ubs|online|remoto|campus|hu\b)/.test(normalizar(t));

/** Texto de uma célula da grade: o nome (mesmo quebrado em linhas) e o local, em cima ou embaixo dele. */
function nomeELocal(celula) {
  const partes = String(celula).split(/\n|\s{2,}|\s\/\s/).map(limpar).filter(Boolean);
  const nomes = partes.filter((p) => !pareceLocal(p));
  if (!nomes.length || partes.length < 2) return { titulo: tituloDe(partes.join(" ")), local: "" };
  return { titulo: tituloDe(nomes.join(" ")), local: partes.filter(pareceLocal).join(", ") };
}

/**
 * Uma tabela (planilha, tabela do Word, ou palavras de PDF/foto alinhadas em
 * colunas). Três formatos:
 * - grade de horário: dias da semana no cabeçalho e o horário na primeira
 *   coluna (o quadro de aulas) → rotina;
 * - grade de mês: dias da semana no cabeçalho e os números dos dias nas
 *   células → compromissos do mês;
 * - lista com cabeçalho (data, hora, título, local; também a exportação do
 *   Google Agenda e do Outlook) → compromissos, ou rotina se houver "dia da
 *   semana" em vez de data.
 * Sem nenhum desses, as linhas viram texto corrido.
 */
export function analisarTabela(linhas, opcoes = {}) {
  const ctx = contexto(opcoes);
  const tab = linhas.map((l) => (Array.isArray(l) ? l : [l]).map((c) => String(c ?? "")));
  const textoAntes = [];
  for (let i = 0; i < Math.min(tab.length, 12); i++) {
    const cel = tab[i];
    const dias = cel.map(diaDaSemana);
    const nDias = new Set(dias.filter((d) => d >= 0)).size;
    if (nDias >= 3) return grade(tab, i, dias, textoAntes, ctx, opcoes);
    const mapa = mapearCabecalho(cel);
    if (mapa.titulo !== undefined && (mapa.data !== undefined || mapa.diaSemana !== undefined)) return lista(tab.slice(i + 1), mapa, cel, ctx);
    textoAntes.push(cel.filter(Boolean).join(" "));
  }
  return analisarLinhas(tab.map((l) => l.filter((c) => c.trim()).join(" | ")), opcoes);
}

function lista(linhas, mapa, cabecalho, ctx) {
  const r = novoResultado();
  // Datas como 03/04: dia/mês, a não ser que a coluna tenha 13+ no segundo
  // número, ou o cabeçalho seja da exportação em inglês (mês/dia).
  const brutas = linhas.map((l) => String(l[mapa.data] ?? ""));
  const pares = brutas.map((s) => s.match(/^\s*(\d{1,2})[/.-](\d{1,2})/)).filter(Boolean);
  const mesPrimeiro = pares.some((m) => +m[2] > 12) ? true : pares.some((m) => +m[1] > 12) ? false : /start date|end date/.test(normalizar(cabecalho.join(" ")));
  const c = { ...ctx, mesPrimeiro };
  for (const l of linhas) {
    const titulo = tituloDe(l[mapa.titulo] ?? "") || limpar(l[mapa.titulo] ?? "");
    if (!titulo) continue;
    const hs = mapa.hora !== undefined ? horasDaCelula(l[mapa.hora]) : { hora: "", horaFim: "" };
    if (mapa.horaFim !== undefined) { const f = horasDaCelula(l[mapa.horaFim]).hora; if (f && (!hs.hora || f > hs.hora)) hs.horaFim = f; }
    if (mapa.diaInteiro !== undefined && /^(?:true|sim|verdadeiro|1|x)$/i.test(String(l[mapa.diaInteiro]).trim())) { hs.hora = ""; hs.horaFim = ""; }
    const local = mapa.local !== undefined ? limpar(l[mapa.local]) : "";
    const obs = mapa.obs !== undefined ? limpar(l[mapa.obs]).slice(0, 500) : "";
    const data = mapa.data !== undefined ? dataDaCelula(l[mapa.data], c) : "";
    const trecho = l.filter(Boolean).join(" | ").slice(0, 300);
    if (data) { r.eventos.push({ titulo: titulo.slice(0, 140), data, ...hs, local, observacoes: obs, trecho }); continue; }
    const dias = mapa.diaSemana !== undefined ? diasCitados(l[mapa.diaSemana]) : [];
    if (dias.length) r.rotina.push({ titulo: titulo.slice(0, 140), dias, ...hs, local, observacoes: obs, trecho });
  }
  return finalizar(r);
}

function grade(tab, iCab, diasCol, textoAntes, ctx, opcoes) {
  const r = novoResultado();
  const corpo = tab.slice(iCab + 1).filter((l) => l.some((c) => c.trim()));
  const colunas = diasCol.map((d, i) => [d, i]).filter(([d]) => d >= 0);
  const primeiraColDia = colunas[0][1];
  // Grade de mês: nas linhas de baixo, as células dos dias começam com um número de 1 a 31.
  const numerosNasCelulas = corpo.slice(0, 6).reduce((n, l) => n + colunas.filter(([, i]) => /^\s*\d{1,2}(?:\s|$)/.test(l[i] || "") && +l[i].trim().split(/\s/)[0] <= 31).length, 0);
  const comHorario = corpo.filter((l) => l.slice(0, primeiraColDia).some((c) => horasDaCelula(c).hora)).length;
  if (numerosNasCelulas >= 4 && numerosNasCelulas > comHorario) return gradeDoMes(corpo, colunas, textoAntes, ctx, opcoes, r);
  let horario = { hora: "", horaFim: "" };
  let ultimoPorColuna = {};
  let fimPendente = false;
  for (const l of corpo) {
    const rotulo = l.slice(0, primeiraColDia).join(" ");
    let hs = horasDaCelula(rotulo);
    // Célula de horário quebrada em duas linhas ("07:00 –" e "08:40"): a
    // segunda é o fim da primeira, e o resto da linha continua as aulas de cima.
    const continuaHorario = hs.hora && !hs.horaFim && (fimPendente || /^\s*(?:[-–—]|as\b|às|ate\b|até)/i.test(rotulo));
    if (continuaHorario) {
      horario = { ...horario, horaFim: hs.hora > horario.hora ? hs.hora : horario.horaFim };
      Object.values(ultimoPorColuna).forEach((it) => { if (!it.horaFim && hs.hora > it.hora) it.horaFim = hs.hora; });
      hs = { hora: "", horaFim: "" };
    }
    fimPendente = !!hs.hora && !hs.horaFim && /(?:[-–—]|\bas|às|\bate|até)\s*$/i.test(rotulo.trim());
    if (hs.hora) { horario = hs; ultimoPorColuna = {}; }
    for (const [dia, i] of colunas) {
      const bruta = String(l[i] ?? "").split("\n").map(limpar).filter(Boolean).join("\n");
      const cel = limpar(bruta);
      if (!cel || /^[-–—x.|]+$/i.test(cel)) continue;
      // Linha sem horário logo depois de uma com horário: continua a célula de
      // cima. Sala, laboratório ou algo com número é o local; o resto é o nome
      // que não coube numa linha só ("Clínica" e "Médica").
      if (!hs.hora && ultimoPorColuna[i]) {
        const ant = ultimoPorColuna[i];
        if (pareceLocal(cel) && !ant.local && cel.length <= 40) ant.local = cel;
        else ant.titulo = `${ant.titulo} ${cel}`.slice(0, 140);
        continue;
      }
      const proprio = horasEm(cel);
      const { titulo, local } = nomeELocal(bruta);
      if (!titulo) continue;
      const item = { titulo: titulo.slice(0, 140), dias: [dia], hora: proprio.hora || horario.hora, horaFim: proprio.hora ? proprio.horaFim : horario.horaFim, local, trecho: `${NOMES_DIA[dia]} ${rotulo} ${cel}`.trim().slice(0, 300) };
      r.rotina.push(item);
      ultimoPorColuna[i] = item;
    }
  }
  r.rotina = juntarSeguidos(r.rotina);
  if (!r.rotina.length) return analisarLinhas([...textoAntes, ...corpo.map((l) => l.filter(Boolean).join(" | "))], opcoes);
  return finalizar(r);
}

function gradeDoMes(corpo, colunas, textoAntes, ctx, opcoes, r) {
  let mes = null;
  for (const t of [...textoAntes].reverse()) { mes = mesDoCabecalho(t, ctx) || mes; if (mes) break; }
  if (!mes) for (const t of textoAntes) { const m = normalizar(t).match(/\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b(?:\s+(?:de\s+)?(20\d{2}))?/); if (m) { mes = { mes: MESES.indexOf(m[1]) + 1, ano: m[2] ? +m[2] : anoProvavel(MESES.indexOf(m[1]) + 1, 28, ctx), explicito: !!m[2] }; break; } }
  const inferido = !mes;
  if (!mes) {
    const h = ctx.hoje;
    mes = { mes: opcoes.mes || +h.slice(5, 7), ano: opcoes.anoMes || +h.slice(0, 4) };
  }
  r.mesGrade = { mes: mes.mes, ano: mes.ano, inferido };
  const diaAtual = {};
  const ultimo = {}; // o compromisso da linha de cima, na mesma célula
  // O primeiro número de uma coluna maior que 20 na primeira linha é do mês anterior (a grade começa antes do dia 1).
  let primeiraLinha = true;
  corpo.forEach((l, k) => {
    let teveNumero = false;
    for (const [, i] of colunas) {
      const cel = limpar(l[i]);
      if (!cel) continue;
      const m = cel.match(/^(\d{1,2})(?:\s+|$)(.*)$/);
      if (m && +m[1] >= 1 && +m[1] <= 31) {
        teveNumero = true;
        const n = +m[1];
        diaAtual[i] = primeiraLinha && n > 20 ? null : n;
        ultimo[i] = null;
        if (m[2]) adicionar(i, m[2], k);
        continue;
      }
      adicionar(i, cel, k);
    }
    if (teveNumero) primeiraLinha = false;
  });
  function adicionar(i, texto, k) {
    const dia = diaAtual[i];
    if (!dia) return;
    const titulo = tituloDe(texto);
    if (!titulo) return;
    // Texto que não coube numa linha da célula ("Prova" e "Anatomia"): sem
    // horário próprio, logo embaixo do anterior, continua o mesmo compromisso.
    const ant = ultimo[i];
    if (ant && ant.linha === k - 1 && !horasEm(texto).hora) {
      ant.evento.titulo = `${ant.evento.titulo} ${titulo.charAt(0).toLowerCase()}${titulo.slice(1)}`.slice(0, 140);
      ant.linha = k;
      return;
    }
    const iso = `${mes.ano}-${pad(mes.mes)}-${pad(dia)}`;
    if (!dataValida(iso)) return;
    const evento = { titulo: titulo.slice(0, 140), data: iso, diaDoMes: dia, ...horasEm(texto), trecho: texto.slice(0, 300) };
    r.eventos.push(evento);
    ultimo[i] = { evento, linha: k };
  }
  if (inferido && r.eventos.length) r.avisos.push("Não achei o mês no arquivo. Escolha o mês do calendário na revisão para as datas ficarem certas.");
  return finalizar(r);
}

/* ------------------------- Palavras com posição --------------------------- */

/**
 * Palavras de PDF ou foto ({ texto, x0, x1, y0, y1 }) agrupadas em linhas pela
 * altura. Se uma linha tem três ou mais dias da semana, ela é o cabeçalho de
 * uma grade: cada palavra das linhas de baixo vai para a coluna do dia mais
 * próximo, e o que fica à esquerda da primeira coluna é o horário. Sem
 * cabeçalho, as linhas viram texto corrido.
 */
export function analisarPosicionado(palavras, opcoes = {}) {
  const linhas = agruparEmLinhas(palavras);
  const iCab = linhas.findIndex((l) => new Set(l.itens.map((p) => diaDaSemana(p.texto)).filter((d) => d >= 0)).size >= 3);
  if (iCab < 0) return analisarLinhas(linhas.map(textoDaLinha), opcoes);
  const cab = linhas[iCab].itens.filter((p) => diaDaSemana(p.texto) >= 0);
  const centros = cab.map((p) => ({ dia: diaDaSemana(p.texto), x: (p.x0 + p.x1) / 2 })).sort((a, b) => a.x - b.x);
  const passo = centros.length > 1 ? (centros[centros.length - 1].x - centros[0].x) / (centros.length - 1) : 100;
  const limiteEsq = centros[0].x - passo / 2;
  const tabela = [["", ...centros.map((c) => NOMES_DIA[c.dia])]];
  const corpo = linhas.slice(iCab + 1);
  const faixas = faixasPorHorario(corpo, limiteEsq);
  if (faixas) {
    // Quadro de horário: cada faixa vai de um horário de início ao próximo, e
    // tudo dentro dela é da mesma linha da tabela (célula centralizada na
    // altura, nome quebrado em duas linhas...).
    for (const faixa of faixas) {
      // Por coluna, uma entrada por linha do texto: palavras da mesma linha
      // juntam com espaço, linhas diferentes com quebra (nome e sala).
      const porColuna = Array.from({ length: centros.length + 1 }, () => []);
      for (const l of faixa) {
        const nestaLinha = Array.from({ length: centros.length + 1 }, () => []);
        for (const p of l.itens) {
          const cx = (p.x0 + p.x1) / 2;
          if (cx < limiteEsq) { nestaLinha[0].push(p.texto); continue; }
          let melhor = 0;
          centros.forEach((c, k) => { if (Math.abs(c.x - cx) < Math.abs(centros[melhor].x - cx)) melhor = k; });
          if (Math.abs(centros[melhor].x - cx) <= passo * 0.75) nestaLinha[melhor + 1].push(p.texto);
        }
        nestaLinha.forEach((ps, k) => { if (ps.length) porColuna[k].push(ps.join(" ")); });
      }
      tabela.push(porColuna.map((ls, k) => ls.join(k ? "\n" : " ")));
    }
    return analisarTabela([...linhas.slice(0, iCab).map((l) => [textoDaLinha(l)]), ...tabela], opcoes);
  }
  for (const l of corpo) {
    const celulas = Array(centros.length + 1).fill("");
    // Uma célula pode ter mais de um grupo de palavras: junta na ordem.
    for (const p of l.itens) {
      const cx = (p.x0 + p.x1) / 2;
      if (cx < limiteEsq) { celulas[0] = limpar(`${celulas[0]} ${p.texto}`); continue; }
      let melhor = 0;
      centros.forEach((c, k) => { if (Math.abs(c.x - cx) < Math.abs(centros[melhor].x - cx)) melhor = k; });
      if (Math.abs(centros[melhor].x - cx) > passo * 0.75) continue;
      celulas[melhor + 1] = limpar(`${celulas[melhor + 1]} ${p.texto}`);
    }
    tabela.push(celulas);
  }
  const antes = linhas.slice(0, iCab).map(textoDaLinha);
  return analisarTabela([...antes.map((t) => [t]), ...tabela], opcoes);
}

/**
 * As faixas de um quadro de horário: começa uma nova a cada horário de início
 * na coluna da esquerda ("07:00 – 08:40" ou "07:00 –" com "08:40" embaixo).
 * O limite entre duas faixas fica no meio do caminho entre o fim de uma e o
 * começo da outra. Com menos de dois horários, não é um quadro de horário.
 */
function faixasPorHorario(corpo, limiteEsq) {
  const rotulo = (l) => l.itens.filter((p) => (p.x0 + p.x1) / 2 < limiteEsq).map((p) => p.texto).join(" ");
  const inicios = [];
  let pendente = false;
  corpo.forEach((l, k) => {
    const r = rotulo(l);
    const hs = r ? horasDaCelula(r) : { hora: "" };
    if (!hs.hora) return;
    const continua = !hs.horaFim && (pendente || /^\s*(?:[-–—]|as\b|às|ate\b|até)/i.test(r));
    if (!continua) inicios.push(k);
    pendente = !continua && !hs.horaFim && /(?:[-–—]|\bas|às|\bate|até)\s*$/i.test(r.trim());
  });
  if (inicios.length < 2) return null;
  const temRotulo = corpo.map((l) => !!rotulo(l));
  const limites = inicios.slice(1).map((k) => {
    let fimAnterior = k - 1;
    while (fimAnterior > 0 && !temRotulo[fimAnterior]) fimAnterior--;
    return (corpo[fimAnterior].cy + corpo[k].cy) / 2;
  });
  const faixas = inicios.map(() => []);
  for (const l of corpo) {
    let n = limites.findIndex((y) => l.cy < y);
    if (n < 0) n = faixas.length - 1;
    faixas[n].push(l);
  }
  return faixas;
}

function agruparEmLinhas(palavras) {
  const ps = palavras.filter((p) => limpar(p.texto)).map((p) => ({ ...p, texto: limpar(p.texto), cy: (p.y0 + p.y1) / 2, h: Math.max(1, p.y1 - p.y0) }));
  const alturas = ps.map((p) => p.h).sort((a, b) => a - b);
  const mediana = alturas[Math.floor(alturas.length / 2)] || 10;
  ps.sort((a, b) => a.cy - b.cy);
  const linhas = [];
  for (const p of ps) {
    const l = linhas[linhas.length - 1];
    if (l && Math.abs(l.cy - p.cy) <= mediana * 0.55) { l.itens.push(p); l.cy = (l.cy * (l.itens.length - 1) + p.cy) / l.itens.length; }
    else linhas.push({ cy: p.cy, itens: [p] });
  }
  linhas.forEach((l) => l.itens.sort((a, b) => a.x0 - b.x0));
  return linhas;
}

/** O texto de uma linha, com " | " onde há um vão largo (colunas). */
function textoDaLinha(l) {
  const larg = l.itens.reduce((t, p) => t + (p.x1 - p.x0) / Math.max(1, p.texto.length), 0) / Math.max(1, l.itens.length);
  let s = "";
  l.itens.forEach((p, i) => {
    if (i) s += p.x0 - l.itens[i - 1].x1 > larg * 3 ? " | " : " ";
    s += p.texto;
  });
  return s;
}

/* --------------------------------- Final ---------------------------------- */

const chave = (x) => normalizar([x.titulo, x.data || (x.dias || []).join(","), x.hora].join("|"));

function finalizar(r) {
  const vistos = new Set();
  r.eventos = r.eventos.filter((e) => e.titulo && dataValida(e.data) && !vistos.has(chave(e)) && vistos.add(chave(e))).slice(0, 400);
  r.rotina = r.rotina.filter((e) => e.titulo && e.dias?.length && !vistos.has(chave(e)) && vistos.add(chave(e))).slice(0, 200);
  for (const x of [...r.eventos, ...r.rotina]) {
    if (!horaValida(x.hora)) x.hora = "";
    if (!horaValida(x.horaFim) || !x.hora || x.horaFim <= x.hora) x.horaFim = "";
    x.local = limpar(x.local || "").slice(0, 120);
  }
  r.eventos.sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
  if (!r.eventos.length && !r.rotina.length) r.avisos.push("Não encontrei datas, dias da semana nem horários reconhecíveis. Confira o texto lido abaixo ou cadastre à mão.");
  return r;
}

/** Datas da grade de mês recalculadas para outro mês (quando o arquivo não dizia qual). */
export function trocarMesDaGrade(eventos, ano, mes) {
  return eventos.map((e) => {
    if (!e.diaDoMes) return e;
    const iso = `${ano}-${pad(mes)}-${pad(e.diaDoMes)}`;
    return dataValida(iso) ? { ...e, data: iso } : e;
  });
}

/* ------------------------- CSV (texto delimitado) ------------------------- */

/** Linhas e células de um CSV, com aspas; o delimitador (; , ou tab) é o mais comum na primeira linha. */
export function lerCSV(texto) {
  const t = String(texto).replace(/^﻿/, "");
  const primeira = t.split(/\r?\n/, 1)[0] || "";
  const delim = [";", ",", "\t"].map((d) => [d, primeira.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const linhas = [];
  let linha = [], cel = "", aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { cel += '"'; i++; }
      else if (ch === '"') aspas = false;
      else cel += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === delim) { linha.push(cel); cel = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      linha.push(cel); linhas.push(linha); linha = []; cel = "";
    } else cel += ch;
    if (linhas.length > 5000) break;
  }
  if (cel || linha.length) { linha.push(cel); linhas.push(linha); }
  return linhas.filter((l) => l.some((c) => c.trim()));
}

/* ------------------------------ No navegador ------------------------------ */

export const FORMATOS = {
  ics: /\.(ics|ical|ifb)$/i,
  documento: /\.(pdf|docx|pptx)$/i,
  planilha: /\.(csv|tsv|txt|xlsx)$/i,
  imagem: /\.(png|jpe?g|webp|bmp|gif)$/i,
  antigo: /\.(xls|doc|ppt|heic|heif|odt|ods|odp)$/i,
};
export const ACEITOS = ".ics,.pdf,.docx,.pptx,.csv,.tsv,.txt,.xlsx,.xls,.doc,.ppt,.png,.jpg,.jpeg,.webp,.bmp,.gif,.heic,image/*,text/calendar";
const LIMITE_MB = 15;

const cancelado = () => new DOMException("Cancelado", "AbortError");

/**
 * Lê o arquivo e devolve { tipo, eventos, rotina, avisos, mesGrade, texto }.
 * `aoProgresso(frase, fracao)` conta o que está acontecendo (o OCR leva alguns
 * segundos). Um .ics não passa por aqui: o calendário já tem leitor próprio.
 */
export async function lerArquivoAgenda(file, { aoProgresso = () => {}, signal, ano } = {}) {
  const opcoes = ano ? { ano } : {};
  return lerArquivo(file, {
    aoProgresso, signal,
    posicionado: (palavras) => analisarPosicionado(palavras, opcoes),
    linhas: (linhas) => analisarLinhas(linhas, opcoes),
    tabela: (linhas) => analisarTabela(linhas, opcoes),
    achou: (r) => r.eventos.length + r.rotina.length,
  });
}

/** Linhas de texto de palavras com posição, com " | " onde há um vão largo (colunas). */
export const palavrasEmLinhas = (palavras) => agruparEmLinhas(palavras).map(textoDaLinha);

/**
 * Lê qualquer formato aceito e entrega o conteúdo à análise de quem chamou:
 * `posicionado(palavras)` para PDF e imagem, `tabela(linhas de células)` para
 * planilha e Word com tabela, `linhas(texto por linha)` para o resto. `achou(r)`
 * conta o que a análise reconheceu (na imagem, decide se vale a segunda
 * leitura do OCR). Devolve { tipo, ...resultado da análise, texto }.
 */
export async function lerArquivo(file, { aoProgresso = () => {}, signal, posicionado, linhas: porLinhas, tabela: porTabela, achou }) {
  if (!file?.size) throw new Error("O arquivo está vazio.");
  if (file.size > LIMITE_MB * 1024 * 1024) throw new Error(`Use um arquivo de até ${LIMITE_MB} MB.`);
  const nome = file.name || "arquivo";
  if (FORMATOS.antigo.test(nome)) {
    const ext = nome.split(".").pop().toLowerCase();
    const dica = { xls: "Abra no Excel e salve como .xlsx ou .csv", doc: "Salve como .docx ou PDF", ppt: "Salve como .pptx ou PDF", heic: "Tire um print da foto ou exporte como JPEG", heif: "Exporte como JPEG", odt: "Salve como .docx ou PDF", ods: "Salve como .xlsx ou .csv", odp: "Salve como .pptx ou PDF" }[ext];
    throw new Error(`Esse formato (.${ext}) não é lido aqui. ${dica} e tente de novo.`);
  }
  if (FORMATOS.imagem.test(nome) || /^image\//.test(file.type)) {
    let melhor = null, nMelhor = -1;
    await lerImagem(file, { aoProgresso, signal }, (palavras) => {
      const r = { tipo: "imagem", ...posicionado(palavras), texto: palavrasEmLinhas(palavras).join("\n") };
      const n = achou(r);
      if (n > nMelhor) { melhor = r; nMelhor = n; }
      return n > 0;
    });
    return melhor;
  }
  if (/\.pdf$/i.test(nome)) {
    aoProgresso("Lendo o PDF…");
    const palavras = await lerPDF(file, signal);
    if (!palavras.length) throw new Error("Este PDF não tem texto selecionável (é uma imagem). Tire um print da página e importe a imagem.");
    return { tipo: "documento", ...posicionado(palavras), texto: palavrasEmLinhas(palavras).join("\n") };
  }
  if (/\.(docx|pptx)$/i.test(nome)) {
    aoProgresso("Lendo o documento…");
    const { lerDocumento } = await import("./documentos.mjs");
    const { texto } = await lerDocumento(file, { signal });
    // Tabelas do Word chegam com " | " entre as células, na posição certa.
    const linhas = texto.split(/\n+/).filter((l) => l.trim());
    const r = linhas.some((l) => l.split("|").length >= 4) ? porTabela(linhas.map((l) => (l.includes("|") ? l.split("|") : [l]))) : porLinhas(linhas);
    return { tipo: "documento", ...r, texto };
  }
  if (/\.xlsx$/i.test(nome)) {
    aoProgresso("Lendo a planilha…");
    const linhas = await lerXLSX(file);
    return { tipo: "planilha", ...porTabela(linhas), texto: linhas.slice(0, 200).map((l) => l.join(" | ")).join("\n") };
  }
  if (FORMATOS.planilha.test(nome) || /^text\//.test(file.type)) {
    const texto = await textoComCharset(file);
    return { tipo: "planilha", ...porTabela(lerCSV(texto)), texto: texto.slice(0, 20000) };
  }
  throw new Error("Formato não reconhecido. Use PDF, Word (.docx), PowerPoint (.pptx), planilha (.csv ou .xlsx), um .ics ou uma imagem (PNG, JPEG).");
}

async function textoComCharset(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  return utf8.includes("�") ? new TextDecoder("iso-8859-1").decode(bytes) : utf8;
}

/** Palavras do PDF com posição (a altura sobe na página, então y é invertido). */
async function lerPDF(file, signal) {
  const pdfjs = await import("./vendor/pdfjs/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;
  const tarefa = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableFontFace: true, useSystemFonts: false });
  const abortar = () => tarefa.destroy();
  signal?.addEventListener("abort", abortar, { once: true });
  try {
    const doc = await tarefa.promise;
    if (doc.numPages > 30) throw new Error("Use um PDF com até 30 páginas: só as do calendário ou do horário.");
    const palavras = [];
    let deslocamento = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      if (signal?.aborted) throw cancelado();
      const pagina = await doc.getPage(n);
      const altura = pagina.getViewport({ scale: 1 }).height;
      const { items } = await pagina.getTextContent();
      for (const it of items) {
        if (!it.str?.trim()) continue;
        const h = Math.abs(it.transform[3]) || 10;
        const x0 = it.transform[4], y1 = deslocamento + altura - it.transform[5];
        palavras.push({ texto: it.str, x0, x1: x0 + (it.width || it.str.length * h * 0.5), y0: y1 - h, y1 });
      }
      deslocamento += altura + 40;
      pagina.cleanup();
    }
    return palavras;
  } catch (e) {
    if (signal?.aborted) throw cancelado();
    if (e.name === "PasswordException") throw new Error("Este PDF tem senha. Salve uma cópia sem senha e tente de novo.");
    if (/^Use um PDF/.test(e.message)) throw e;
    throw new Error("Não foi possível ler este PDF. Confira se ele abre normalmente.");
  } finally {
    signal?.removeEventListener("abort", abortar);
    await tarefa.destroy();
  }
}

/** A primeira planilha com dados de um .xlsx (zip de XML), como linhas de células. */
async function lerXLSX(file) {
  const { unzipSync, strFromU8 } = await import("./vendor/fflate/fflate.mjs");
  let arquivos;
  try {
    let total = 0;
    arquivos = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter(e) {
        const quer = e.name === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name);
        if (quer) { total += e.originalSize; if (e.originalSize > 20 * 1024 * 1024 || total > 40 * 1024 * 1024) throw new Error("limite"); }
        return quer;
      },
    });
  } catch {
    throw new Error("Não foi possível abrir esta planilha. Salve como .xlsx ou .csv e tente de novo.");
  }
  const xml = (nome) => {
    const s = arquivos[nome] ? strFromU8(arquivos[nome]) : "";
    if (/<!DOCTYPE|<!ENTITY/i.test(s)) throw new Error("A planilha tem uma estrutura não suportada.");
    return s ? new DOMParser().parseFromString(s, "application/xml") : null;
  };
  const compartilhadas = [];
  const ss = xml("xl/sharedStrings.xml");
  if (ss) for (const si of ss.getElementsByTagNameNS("*", "si")) compartilhadas.push([...si.getElementsByTagNameNS("*", "t")].map((t) => t.textContent).join(""));
  const folhas = Object.keys(arquivos).filter((n) => n.startsWith("xl/worksheets/")).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const nome of folhas) {
    const doc = xml(nome);
    const linhas = [];
    for (const row of doc.getElementsByTagNameNS("*", "row")) {
      const linha = [];
      for (const c of row.getElementsByTagNameNS("*", "c")) {
        const ref = c.getAttribute("r") || "";
        const col = ref.replace(/\d+/g, "").split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
        const t = c.getAttribute("t");
        const v = c.getElementsByTagNameNS("*", "v")[0]?.textContent ?? "";
        const valor = t === "s" ? compartilhadas[+v] ?? "" : t === "inlineStr" ? [...c.getElementsByTagNameNS("*", "t")].map((x) => x.textContent).join("") : v;
        linha[col >= 0 ? col : linha.length] = valor;
      }
      linhas.push(Array.from(linha, (x) => x ?? ""));
      if (linhas.length > 3000) break;
    }
    if (linhas.some((l) => l.some((c) => String(c).trim()))) return linhas;
  }
  throw new Error("A planilha está vazia.");
}

/**
 * Texto de uma foto ou print, com Tesseract (vendor/tesseract, português),
 * tudo neste aparelho. A imagem é ampliada quando pequena e vai em tons de
 * cinza: o reconhecimento erra menos.
 */
async function lerImagem(file, { aoProgresso, signal }, bastou) {
  aoProgresso("Preparando a imagem…", 0);
  const imagem = await prepararImagem(file);
  if (signal?.aborted) throw cancelado();
  if (!globalThis.Tesseract) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = new URL("./vendor/tesseract/tesseract.min.js", import.meta.url).href;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Não deu para carregar o leitor de imagens. Confira a conexão e tente de novo."));
      document.head.append(s);
    });
  }
  const base = new URL("./vendor/tesseract/", import.meta.url).href;
  let worker;
  const abortar = () => worker?.terminate();
  signal?.addEventListener("abort", abortar, { once: true });
  try {
    worker = await globalThis.Tesseract.createWorker("por", 1, {
      workerPath: `${base}worker.min.js`, corePath: base, langPath: base.replace(/\/$/, ""), gzip: true,
      workerBlobURL: false, cacheMethod: "none",
      logger: (m) => {
        if (m.status === "recognizing text") aoProgresso(null, m.progress);
        else if (/loading|initializ/.test(m.status)) aoProgresso("Preparando o leitor de imagens (só na primeira vez demora mais)…", m.progress);
      },
    });
    if (signal?.aborted) throw cancelado();
    // Primeiro a página inteira (PSM 3), que acerta grade de mês e quadro de
    // horário; se nada for reconhecido, texto esparso (PSM 11), que acha
    // palavras soltas que a primeira leitura juntou errado.
    let algumaPalavra = false;
    for (const [psm, frase] of [["3", "Lendo o texto da imagem…"], ["11", "Tentando outra leitura da imagem…"]]) {
      if (signal?.aborted) throw cancelado();
      aoProgresso(frase, 0);
      await worker.setParameters({ tessedit_pageseg_mode: psm, preserve_interword_spaces: "1" });
      const { data } = await worker.recognize(imagem, {}, { blocks: true, text: true });
      const palavras = [];
      for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) for (const w of l.words || []) {
        if (w.confidence < 30 || !w.text?.trim()) continue;
        palavras.push({ texto: w.text, x0: w.bbox.x0, x1: w.bbox.x1, y0: w.bbox.y0, y1: w.bbox.y1 });
      }
      algumaPalavra ||= palavras.length > 0;
      if (palavras.length && bastou(palavras)) return;
    }
    if (!algumaPalavra) throw new Error("Não consegui ler texto nessa imagem. Tente um print mais nítido, sem cortar as bordas.");
  } catch (e) {
    if (signal?.aborted) throw cancelado();
    throw e?.message?.startsWith("Não") ? e : new Error("Não deu para ler essa imagem neste aparelho. Tente um print mais nítido ou um arquivo PDF.");
  } finally {
    signal?.removeEventListener("abort", abortar);
    await worker?.terminate();
  }
}

async function prepararImagem(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error("Não consegui abrir essa imagem. Use PNG ou JPEG."); }
  // Em 2x as letras pequenas de uma grade ficam legíveis; mais que isso, o
  // traço engrossa e o reconhecimento piora (medido com prints de calendário).
  const escala = Math.min(2, Math.max(1, 2000 / Math.max(bitmap.width, 1)));
  const maior = Math.max(bitmap.width, bitmap.height) * escala;
  const ajuste = maior > 5000 ? 5000 / maior : 1;
  const w = Math.round(bitmap.width * escala * ajuste), h = Math.round(bitmap.height * escala * ajuste);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingQuality = "high";
  g.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const px = g.getImageData(0, 0, w, h);
  const d = px.data;
  let soma = 0;
  for (let i = 0; i < d.length; i += 4) { const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = y; soma += y; }
  // Print de tela escura (tema escuro): inverte para texto escuro no claro.
  if (soma / (d.length / 4) < 110) for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 255 - d[i]; }
  g.putImageData(px, 0, 0);
  return canvas;
}
