/* A dieta a partir de um arquivo (PDF, foto, CSV, Excel, Word) e as contas
   dela. Funções puras, sem DOM nem Store: testadas em test/dieta.test.cjs.

   O Delfos não prescreve dieta: organiza a que a pessoa (ou o nutricionista
   dela) definiu. Quando o arquivo não traz as calorias de um alimento, ela é
   ESTIMADA pela tabela abaixo, e só quando a quantidade dá base para isso
   (gramas, mililitros ou uma unidade conhecida, como 1 ovo ou 1 fatia). Sem
   base, o alimento fica sem kcal e a revisão pede para completar.

   Tabela de referência, por 100 g (ou 100 ml) do alimento como é comido:
   TACO, Tabela Brasileira de Composição de Alimentos (NEPA/Unicamp, 4ª ed.);
   os marcados com "usda" vêm da FoodData Central (USDA), e os com "rotulo" são
   médias de rótulo (variam por marca). `un` é o peso de uma unidade/fatia. */

const T = (nomes, kcal, p, c, g, extra = {}) => ({ nomes, kcal, p, c, g, ...extra });
export const TABELA = [
  T(["arroz integral"], 124, 2.6, 25.8, 1.0),
  T(["arroz"], 128, 2.5, 28.1, 0.2),
  T(["feijao preto"], 77, 4.5, 14.0, 0.5),
  T(["feijao"], 76, 4.8, 13.6, 0.5),
  T(["lentilha"], 93, 6.3, 16.3, 0.5),
  T(["grao de bico"], 164, 8.9, 27.4, 2.6, { fonte: "usda" }),
  T(["peito de frango", "frango", "file de frango"], 159, 32.0, 0, 2.5),
  T(["carne moida", "patinho moido"], 212, 26.7, 0, 10.9),
  T(["patinho", "carne bovina", "carne vermelha", "bife", "alcatra"], 219, 35.9, 0, 7.3),
  T(["tilapia", "peixe", "file de peixe"], 128, 26.2, 0, 2.7, { fonte: "usda" }),
  T(["atum"], 116, 25.5, 0, 0.8, { fonte: "usda" }),
  T(["clara de ovo", "claras", "clara"], 59, 13.4, 0, 0.1, { un: 33 }),
  T(["ovo", "ovos"], 146, 13.3, 0.6, 9.5, { un: 50 }),
  T(["pao frances", "pao de sal", "paozinho"], 300, 8.0, 58.6, 3.1, { un: 50 }),
  T(["pao integral", "pao de forma integral"], 253, 9.4, 49.9, 3.7, { un: 25 }),
  T(["pao de forma", "pao"], 253, 9.4, 49.9, 3.7, { un: 25 }),
  T(["tapioca", "goma de tapioca"], 240, 0.3, 59.0, 0.1, { fonte: "aproximado" }),
  T(["cuscuz"], 113, 2.2, 25.3, 0.7),
  T(["aveia"], 394, 13.9, 66.6, 8.5, { colher: 15 }),
  T(["granola"], 421, 9.6, 64.0, 14.7, { fonte: "rotulo", colher: 10 }),
  T(["banana prata"], 98, 1.3, 26.0, 0.1, { un: 70 }),
  T(["banana"], 92, 1.4, 23.8, 0.1, { un: 80 }),
  T(["maca"], 56, 0.3, 15.2, 0, { un: 130 }),
  T(["mamao"], 40, 0.5, 10.4, 0.1),
  T(["laranja"], 37, 1.0, 8.9, 0.1, { un: 140 }),
  T(["melancia"], 33, 0.9, 8.1, 0),
  T(["abacate"], 96, 1.2, 6.0, 8.4),
  T(["morango", "morangos"], 30, 0.9, 6.8, 0.3),
  T(["uva", "uvas"], 53, 0.7, 13.6, 0.2),
  T(["manga"], 72, 0.4, 19.4, 0.2),
  T(["abacaxi"], 48, 0.9, 12.3, 0.1),
  T(["leite desnatado"], 35, 3.4, 4.9, 0.2),
  T(["leite"], 61, 2.9, 4.3, 3.2),
  T(["iogurte natural", "iogurte"], 51, 4.1, 1.9, 3.0),
  T(["queijo minas", "queijo branco", "minas frescal"], 264, 17.4, 3.2, 20.2, { un: 30 }),
  T(["mucarela", "mussarela", "queijo"], 330, 22.6, 3.0, 25.2, { un: 15 }),
  T(["requeijao"], 257, 9.6, 2.4, 23.4, { colher: 20 }),
  T(["presunto"], 94, 14.3, 2.1, 2.7, { un: 15 }),
  T(["manteiga"], 726, 0.4, 0.1, 82.4, { colher: 10 }),
  T(["azeite"], 884, 0, 0, 100, { colher: 13 }),
  T(["acucar"], 387, 0.3, 99.5, 0, { colher: 12 }),
  T(["mel"], 309, 0, 84.0, 0, { colher: 20 }),
  T(["batata doce"], 77, 0.6, 18.4, 0.1),
  T(["batata"], 52, 1.2, 11.9, 0),
  T(["mandioca", "aipim", "macaxeira"], 125, 0.6, 30.1, 0.3),
  T(["macarrao"], 158, 5.8, 30.9, 0.9, { fonte: "usda" }),
  T(["brocolis"], 25, 2.1, 4.4, 0.5),
  T(["cenoura"], 34, 1.3, 7.7, 0.2),
  T(["alface"], 11, 1.3, 1.7, 0.2),
  T(["tomate"], 15, 1.1, 3.1, 0.2),
  T(["pepino"], 10, 0.9, 2.0, 0),
  T(["whey", "whey protein"], 400, 80, 8, 6, { fonte: "rotulo", un: 30 }),
  T(["pasta de amendoim"], 588, 25, 20, 50, { fonte: "usda", colher: 15 }),
  T(["amendoim"], 606, 22.5, 18.7, 54.0),
  T(["castanha do para"], 643, 14.5, 15.1, 63.5, { un: 4 }),
  T(["castanha de caju", "castanha"], 570, 18.5, 29.1, 46.3),
  T(["biscoito cream cracker", "cream cracker", "bolacha agua e sal"], 432, 10.1, 68.7, 14.4, { un: 7 }),
  T(["chocolate"], 540, 7.2, 59.6, 30.3),
  T(["cafe"], 2, 0.1, 0.3, 0),
];

export const normalizar = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const limpar = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const numero = (s) => {
  const t = normalizar(s).replace(/½/g, "0.5").replace(/¼/g, "0.25").replace(/¾/g, "0.75");
  const fr = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fr) return +fr[1] / +fr[2];
  const pal = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, meio: 0.5, meia: 0.5 }[t];
  if (pal) return pal;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const arred = (n, casas = 0) => (n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n * 10 ** casas) / 10 ** casas);

/** O alimento da tabela que mais combina com o nome (o nome mais longo que aparece no texto). */
export function acharAlimento(nome) {
  const t = ` ${normalizar(nome).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ")} `;
  let melhor = null, tam = 0;
  for (const a of TABELA) for (const n of a.nomes) {
    if (t.includes(` ${n} `) && n.length > tam) { melhor = a; tam = n.length; }
  }
  return melhor;
}

// Medidas caseiras: o número que vem antes e a unidade. Só as que dão peso
// com segurança: colher de chá (5 g), de sopa (pelo alimento, ou 15 g),
// copo (200 ml) e xícara (240 ml) só para líquidos, medida/scoop (30 g).
const UNIDADES = /^(unidades?|un|und|fatias?|colher(?:es)?\s+de\s+sopa|colher(?:es)?\s+de\s+cha|colher(?:es)?\s+de\s+sobremesa|colher(?:es)?|copos?|xicaras?|xic|scoops?|medidas?|potes?|conchas?|escumadeiras?|pegadores?|porcao|porcoes|pedacos?|file|files|bifes?|latas?|ramos?|folhas?)\b/;
const LIQUIDOS = /\b(leite|suco|agua|cafe|cha|iogurte|bebida|vitamina)\b/;

/**
 * A quantidade escrita: "100 g", "200ml", "2 fatias", "1 colher de sopa",
 * "1/2 xícara", "duas unidades", "3 ovos". Devolve { texto, gramas, unidades, medida }.
 */
export function lerQuantidade(texto) {
  const t = normalizar(texto);
  // O texto devolvido sai do original (com acento): normalizar não muda o tamanho.
  const orig = String(texto ?? "").replace(/\s+/g, " ").trim();
  const trecho = (ini, tam, alt) => (orig.length === t.length ? orig.slice(ini, ini + tam) : alt);
  const g = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramas?|ml|l|litros?)\b/);
  if (g) {
    const n = Number(g[1].replace(",", "."));
    const fator = { kg: 1000, l: 1000, litro: 1000, litros: 1000 }[g[2]] || 1;
    return { texto: trecho(g.index, g[0].length, g[0]), gramas: n * fator, medida: /ml|l/.test(g[2]) ? "ml" : "g" };
  }
  const u = t.match(/(?:^|\s|\()(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|½|¼|¾|uma?|duas|dois|tres|quatro|cinco|seis|meia|meio)\s+([a-z ]+)/);
  if (u) {
    const n = numero(u[1]);
    const unidade = u[2].match(UNIDADES)?.[1] || "";
    const curto = limpar(`${u[1]} ${unidade || u[2].split(" ")[0]}`);
    return { texto: trecho(u.index + u[0].indexOf(u[1]), curto.length, curto), unidades: n, medida: unidade.replace(/\s+/g, " ") || "unidade" };
  }
  return { texto: "", gramas: null, unidades: null, medida: "" };
}

/**
 * Calorias e macros de um alimento pela tabela. Só com base: gramas/ml, ou
 * unidade com peso conhecido. Devolve null quando não dá para estimar.
 */
export function estimar(alimento, quantidade) {
  const a = acharAlimento(alimento);
  if (!a) return null;
  const q = typeof quantidade === "object" && quantidade ? quantidade : lerQuantidade(`${quantidade || ""} ${alimento}`);
  let gramas = q.gramas || null;
  const m = q.medida || "";
  const n = q.unidades ?? null;
  if (!gramas && n) {
    if (/sopa/.test(m) || (m === "colher" && a.colher)) gramas = n * (a.colher || 15);
    else if (/cha/.test(m)) gramas = n * 5;
    else if (/sobremesa/.test(m)) gramas = n * 10;
    else if (/scoop|medida/.test(m)) gramas = n * 30;
    else if (/copo/.test(m) && LIQUIDOS.test(normalizar(alimento))) gramas = n * 200;
    else if (/xicara|xic/.test(m) && LIQUIDOS.test(normalizar(alimento))) gramas = n * 240;
    else if (/^(unidade|unidades|un|und|fatia|fatias)$/.test(m) && a.un) gramas = n * a.un;
    else if (m === "unidade" && a.un) gramas = n * a.un; // "2 ovos", "1 banana"
  }
  if (!gramas) return null;
  const f = gramas / 100;
  return { gramas: arred(gramas), kcal: arred(a.kcal * f), proteina: arred(a.p * f, 1), carbo: arred(a.c * f, 1), gordura: arred(a.g * f, 1), estimado: true, fonte: a.fonte || "taco" };
}

/* ------------------------------ Lendo a dieta ----------------------------- */

const REFEICOES = [
  [/\b(cafe da manha|desjejum|cafe matinal|breakfast)\b/, "Café da manhã"],
  [/\b(colacao|lanche da manha)\b/, "Lanche da manhã"],
  [/\balmoco\b/, "Almoço"],
  [/\b(lanche da tarde|merenda)\b/, "Lanche da tarde"],
  [/\bpre[- ]?treino\b/, "Pré-treino"],
  [/\bpos[- ]?treino\b/, "Pós-treino"],
  [/\b(jantar|janta)\b/, "Jantar"],
  [/\bceia\b/, "Ceia"],
  [/\blanche\b/, "Lanche"],
  [/\brefeicao\s*(\d+)\b/, null],
];

/** Uma linha que é o título de uma refeição ("ALMOÇO - 12h30", "Refeição 3 (16:00)"). */
export function refeicaoDe(linha) {
  const original = normalizar(linha);
  const horaEscrita = original.match(/\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/);
  const t = original.replace(/\b([01]?\d|2[0-3])\s*:\s*([0-5]\d)\b/g, "$1h$2").replace(/[|:–—-]+/g, " ").replace(/\s+/g, " ").trim();
  const semHora = t.replace(/\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/g, "").replace(/\b(as|horario)\b/g, "").replace(/[()]/g, "").trim();
  if (semHora.length > 32) return null;
  for (const [re, nome] of REFEICOES) {
    const m = semHora.match(re);
    if (m && semHora.replace(re, "").replace(/\b(opcao|cardapio|refeicao|\d+|kcal|total)\b/g, "").trim().length <= 12) {
      const hora = horaEscrita;
      return { nome: nome || `Refeição ${m[1]}`, hora: hora ? `${String(hora[1]).padStart(2, "0")}:${hora[2] || "00"}` : "" };
    }
  }
  return null;
}

/** Calorias e macros escritos numa linha: "350 kcal", "P: 20g", "carboidrato 30 g", "G 5". */
function valoresEscritos(texto) {
  const t = normalizar(texto);
  const pega = (re) => { const m = t.match(re); return m ? Number(m[1].replace(",", ".")) : null; };
  return {
    kcal: pega(/(\d+(?:[.,]\d+)?)\s*(?:kcal|calorias|cal)\b/) ?? pega(/\b(?:kcal|calorias|vet)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/),
    proteina: pega(/\b(?:proteinas?|prot|ptn|p)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/),
    carbo: pega(/\b(?:carboidratos?|carbos?|cho|c)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/),
    gordura: pega(/\b(?:gorduras?|lipideos?|lip|g)\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*g?\b/) ?? pega(/\b(?:gorduras?|lipideos?)\s+(\d+(?:[.,]\d+)?)\s*g\b/),
  };
}

/** O nome do alimento: a linha sem marcador, quantidade, calorias e macros. */
function nomeDoAlimento(linha, qtd) {
  let t = String(linha)
    .replace(/^[^\p{L}\p{N}(]+|^\d+[.)]\s+/u, "")
    .replace(/\(?\s*\d+(?:[.,]\d+)?\s*(?:kcal|calorias|cal)\b\)?/gi, " ")
    .replace(/\b(?:prote[ií]nas?|prot|ptn|carboidratos?|carbos?|cho|gorduras?|lip[ií]deos?|lip)\s*[:=]?\s*\d+(?:[.,]\d+)?\s*g?\b/gi, " ")
    .replace(/\b[PCG]\s*[:=]\s*\d+(?:[.,]\d+)?\s*g?\b/g, " ")
    .replace(/\(?\s*\d+(?:[.,]\d+)?\s*(?:kg|g|gr|gramas?|ml|l|litros?)\b\)?/gi, " ")
    .replace(/[|]/g, " ");
  if (qtd?.texto && qtd.unidades) {
    // Tira a quantidade lida ("2 fatias", "meia xícara"); quando a "unidade" é
    // o próprio alimento ("3 ovos", "1 banana"), tira só o número.
    const escapar = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const numeroLido = qtd.texto.split(/\s+/)[0];
    const alvo = qtd.medida === "unidade" ? numeroLido : qtd.texto;
    t = t.replace(new RegExp(`(^|\\s)${escapar(alvo)}(?=\\s|$|[-–,;])`, "i"), " ");
  }
  t = limpar(t).replace(/^(de|do|da)\s+/i, "").replace(/[\s,;:–—-]+$/, "");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

/** Um alimento escrito numa linha só ("2 pães franceses", "150 g de arroz"), com as calorias estimadas quando dá. */
export const itemDeTexto = (texto) => itemDaLinha(String(texto || ""));

function separarCom(trecho) {
  const m = trecho.match(/^(.*?\S)\s+com\s+((?:\d|uma?\s|duas\s|dois\s|meia\s).*)$/i);
  return m && acharAlimento(m[2]) && acharAlimento(m[1]) ? [m[1], m[2]] : [trecho];
}

function itemDaLinha(linha) {
  const qtd = lerQuantidade(linha);
  const v = valoresEscritos(linha);
  const alimento = nomeDoAlimento(linha, qtd);
  if (!alimento || !/\p{L}{2}/u.test(alimento)) return null;
  const item = { alimento: alimento.slice(0, 120), quantidade: qtd.texto, gramas: qtd.gramas ?? null, kcal: v.kcal, proteina: v.proteina, carbo: v.carbo, gordura: v.gordura, estimado: false };
  if (item.kcal === null) {
    const e = estimar(alimento, qtd);
    if (e) Object.assign(item, { gramas: item.gramas ?? e.gramas, kcal: e.kcal, proteina: item.proteina ?? e.proteina, carbo: item.carbo ?? e.carbo, gordura: item.gordura ?? e.gordura, estimado: true, fonte: e.fonte });
  }
  return item;
}

const IGNORAR = /^(paciente|nome|nutricionista|crn|data|idade|peso|altura|imc|observa|orienta|assinatura|telefone|contato|plano alimentar|dieta|cardapio|substitui|hidrata|beba|evitar|evite|total de|totais|resumo|legenda|obs\b)/;

/**
 * A dieta em texto (PDF, foto, Word): títulos de refeição separam os
 * alimentos; "ou ..." logo abaixo é substituição do anterior; "Total: 1800
 * kcal", "Meta 2000 kcal" ou "VET 2000" viram a meta do dia.
 */
export function analisarDietaLinhas(linhas) {
  const r = { refeicoes: [], metaKcal: null, avisos: [] };
  let atual = null;
  for (const bruta of linhas) {
    const linha = limpar(bruta);
    if (!linha || linha.length > 220) continue;
    const t = normalizar(linha);
    const meta = t.match(/\b(?:meta|total(?: do dia| diario)?|vet|valor energetico(?: total)?|calorias(?: totais| do dia)?)\s*[:=]?\s*(?:de\s*)?(\d{3,4}(?:[.,]\d+)?)\s*(?:kcal|calorias)?/);
    if (meta && !refeicaoDe(linha)) { const n = Number(meta[1].replace(",", ".")); if (n >= 800 && n <= 6000) r.metaKcal = Math.round(n); continue; }
    const ref = refeicaoDe(linha);
    if (ref) { atual = { ...ref, itens: [] }; r.refeicoes.push(atual); continue; }
    if (IGNORAR.test(t)) continue;
    if (/^(ou|opcao|substituir por|trocar por)\b/.test(t) && atual?.itens.length) {
      const ant = atual.itens[atual.itens.length - 1];
      ant.substituicoes = [ant.substituicoes, linha.replace(/^\s*ou\s*/i, "")].filter(Boolean).join("; ").slice(0, 200);
      continue;
    }
    // Vários alimentos numa linha: colunas (" | "), "+" ou "com" seguido de outra
    // quantidade de um alimento conhecido ("Tapioca 60g com 2 ovos"): um item por pedaço.
    const partes = linha.split(/\s+\|\s+|\s+\+\s+/).flatMap(separarCom).filter((p) => /\p{L}{3}/u.test(p));
    for (const p of partes.length > 1 ? partes : [linha]) {
      const item = itemDaLinha(p);
      if (!item) continue;
      if (!atual) { atual = { nome: "Refeição", hora: "", itens: [] }; r.refeicoes.push(atual); }
      atual.itens.push(item);
    }
  }
  return finalizarDieta(r);
}

const CABECALHOS = {
  refeicao: /^(refeicao|refeicoes|horario da refeicao|momento|periodo|meal)$/,
  hora: /^(hora|horario)$/,
  alimento: /^(alimento|alimentos|item|itens|comida|food|preparacao|descricao|opcao)$/,
  quantidade: /^(quantidade|qtd|qtde|porcao|medida|medida caseira|quant)$/,
  gramas: /^(gramas|peso|peso \(g\)|g|gramagem|quantidade \(g\))$/,
  kcal: /^(kcal|calorias|energia|energia \(kcal\)|valor energetico|cal)$/,
  proteina: /^(proteina|proteinas|prot|ptn|proteina \(g\)|p)$/,
  carbo: /^(carboidrato|carboidratos|carbo|cho|carboidrato \(g\)|c)$/,
  gordura: /^(gordura|gorduras|lipideos|lipidios|lip|gordura \(g\)|g\b|l)$/,
};

/**
 * Uma tabela (CSV, Excel, Word): com cabeçalho reconhecido (refeição,
 * alimento, quantidade, kcal, proteína...), cada linha é um alimento; sem
 * cabeçalho, as linhas viram texto corrido.
 */
export function analisarDietaTabela(linhas) {
  const tab = linhas.map((l) => (Array.isArray(l) ? l : [l]).map((c) => limpar(c)));
  for (let i = 0; i < Math.min(tab.length, 12); i++) {
    const mapa = {};
    tab[i].forEach((c, k) => {
      const t = normalizar(c).replace(/[:*]/g, "").trim();
      for (const [papel, re] of Object.entries(CABECALHOS)) if (mapa[papel] === undefined && re.test(t)) { mapa[papel] = k; break; }
    });
    if (mapa.alimento === undefined) continue;
    const r = { refeicoes: [], metaKcal: null, avisos: [] };
    let atual = null;
    for (const l of tab.slice(i + 1)) {
      if (!l.some(Boolean)) continue;
      const nomeRef = mapa.refeicao !== undefined ? l[mapa.refeicao] : "";
      const ref = nomeRef ? refeicaoDe(nomeRef) || { nome: nomeRef.slice(0, 40), hora: "" } : null;
      if (ref && (!atual || normalizar(atual.nome) !== normalizar(ref.nome))) {
        atual = r.refeicoes.find((x) => normalizar(x.nome) === normalizar(ref.nome)) || null;
        if (!atual) { atual = { ...ref, hora: ref.hora || (mapa.hora !== undefined ? l[mapa.hora] : "") || "", itens: [] }; r.refeicoes.push(atual); }
      }
      const alimento = l[mapa.alimento];
      if (!alimento) { const so = refeicaoDe(l.filter(Boolean).join(" ")); if (so) { atual = { ...so, itens: [] }; r.refeicoes.push(atual); } continue; }
      if (/^total/i.test(normalizar(alimento))) { const n = numero(l[mapa.kcal] ?? ""); if (n >= 800 && n <= 6000 && !atual) r.metaKcal = Math.round(n); continue; }
      const so = refeicaoDe(alimento);
      if (so && l.filter(Boolean).length === 1) { atual = { ...so, itens: [] }; r.refeicoes.push(atual); continue; }
      const qtdTexto = [mapa.quantidade !== undefined ? l[mapa.quantidade] : "", mapa.gramas !== undefined && l[mapa.gramas] ? `${l[mapa.gramas]}${/^\d+([.,]\d+)?$/.test(l[mapa.gramas]) ? " g" : ""}` : ""].filter(Boolean).join(" ");
      const qtd = lerQuantidade(`${qtdTexto} ${alimento}`);
      const valor = (papel) => (mapa[papel] !== undefined && l[mapa[papel]] !== "" ? numero(String(l[mapa[papel]]).replace(/[^\d.,/]/g, "")) : null);
      const item = { alimento: alimento.slice(0, 120), quantidade: limpar(mapa.quantidade !== undefined ? l[mapa.quantidade] : qtd.texto), gramas: qtd.gramas ?? null, kcal: valor("kcal"), proteina: valor("proteina"), carbo: valor("carbo"), gordura: valor("gordura"), estimado: false };
      if (item.kcal === null) {
        const e = estimar(alimento, qtd);
        if (e) Object.assign(item, { gramas: item.gramas ?? e.gramas, kcal: e.kcal, proteina: item.proteina ?? e.proteina, carbo: item.carbo ?? e.carbo, gordura: item.gordura ?? e.gordura, estimado: true, fonte: e.fonte });
      }
      if (!atual) { atual = { nome: "Refeição", hora: "", itens: [] }; r.refeicoes.push(atual); }
      atual.itens.push(item);
    }
    return finalizarDieta(r);
  }
  return analisarDietaLinhas(tab.map((l) => l.filter(Boolean).join(" | ")));
}

// Palavras que a correção do OCR reconhece: as da tabela e as de medida.
const VOCAB = new Set([...TABELA.flatMap((a) => a.nomes.join(" ").split(" ")), "ovos", "mexidos", "cozidos", "grelhado", "grelhada", "integral", "natural", "desnatado", "fatias", "fatia", "unidade", "unidades", "colher", "colheres", "sopa", "xicara", "copo", "salada", "folhas", "legumes", "verduras", "frutas", "fruta", "cozido", "assado", "assada", "refogado", "light", "zero"].filter((w) => w.length >= 3));
const TROCAS = [[/0/g, "o"], [/1/g, "i"], [/1/g, "l"], [/5/g, "s"], [/^l/, "i"], [/rn/g, "m"], [/vv/g, "w"]];

/**
 * Erros típicos do OCR numa dieta: "120g" lido como "1209", "ovos" como
 * "0vos", "iogurte" como "Logurte", o marcador da lista lido como letra. Só
 * troca uma palavra desconhecida por uma conhecida (da tabela ou de medida).
 */
export function corrigirOCR(linha) {
  let t = String(linha).replace(/^[^\p{L}\p{N}(]+/u, "").replace(/^[A-Za-z]\s+(?=\d)/, "");
  t = t.split(/(\s+)/).map((p) => {
    const n = normalizar(p);
    if (!/[a-z]/.test(n) || n.length < 3 || VOCAB.has(n)) return p;
    for (const [de, para] of TROCAS) {
      const c = n.replace(de, para);
      if (c !== n && VOCAB.has(c)) return /^[A-Z]/.test(p) ? c.charAt(0).toUpperCase() + c.slice(1) : c;
    }
    return p;
  }).join("");
  // "120g" lido como "1209": só numa linha com alimento conhecido, sem outra
  // unidade, e nunca num ano (19xx, 20xx).
  const temUnidade = /\d\s*(g|gr|ml|kcal|kg|l)\b/i.test(t);
  if (!temUnidade && acharAlimento(t)) t = t.replace(/(\p{L}[\p{L}\s]*?\s)(?!(?:19|20)\d9\b)(\d{1,3})9\b(?!\s*(?:g|ml|kcal))/u, "$1$2g");
  return t;
}

/** Palavras com posição (PDF, foto): vira linhas, com " | " entre colunas, e segue como tabela ou texto. */
export function analisarDietaLinhasComColunas(linhasBrutas) {
  const linhas = linhasBrutas.map(corrigirOCR);
  const comColunas = linhas.filter((l) => l.includes(" | ")).length;
  const cab = linhas.findIndex((l) => l.split(" | ").some((c) => CABECALHOS.alimento.test(normalizar(c))));
  if (cab >= 0 && comColunas >= 3) return analisarDietaTabela(linhas.map((l) => l.split(" | ")));
  return analisarDietaLinhas(linhas);
}

function finalizarDieta(r) {
  r.refeicoes = r.refeicoes.filter((x) => x.itens.length).slice(0, 12).map((x) => ({ ...x, itens: x.itens.slice(0, 40) }));
  const semKcal = r.refeicoes.reduce((n, x) => n + x.itens.filter((i) => i.kcal === null).length, 0);
  const estimados = r.refeicoes.reduce((n, x) => n + x.itens.filter((i) => i.estimado).length, 0);
  if (!r.refeicoes.length) r.avisos.push("Não encontrei refeições nem alimentos reconhecíveis. Confira o texto lido abaixo, ou monte a dieta à mão.");
  if (estimados) r.avisos.push(`${estimados} ${estimados === 1 ? "alimento teve as calorias estimadas" : "alimentos tiveram as calorias estimadas"} pela Tabela TACO (Unicamp), pela quantidade escrita. Confira com o que seu nutricionista passou.`);
  if (semKcal) r.avisos.push(`${semKcal} ${semKcal === 1 ? "alimento ficou" : "alimentos ficaram"} sem calorias: o arquivo não dizia e a quantidade não dá base para estimar. Complete na revisão, se souber.`);
  return r;
}

/* ---------------------------------- Contas -------------------------------- */

/** Soma de kcal e macros de uma lista de alimentos (o que falta conta como 0, e `incompletos` diz quantos). */
export function somar(itens) {
  const t = { kcal: 0, proteina: 0, carbo: 0, gordura: 0, incompletos: 0 };
  for (const i of itens || []) {
    if (i.kcal === null || i.kcal === undefined || i.kcal === "") t.incompletos++;
    t.kcal += Number(i.kcal) || 0;
    t.proteina += Number(i.proteina) || 0;
    t.carbo += Number(i.carbo) || 0;
    t.gordura += Number(i.gordura) || 0;
  }
  return { kcal: Math.round(t.kcal), proteina: arred(t.proteina, 1), carbo: arred(t.carbo, 1), gordura: arred(t.gordura, 1), incompletos: t.incompletos };
}

/** Quanto de cada macro na energia total: 4 kcal/g de proteína e carboidrato, 9 de gordura. */
export function distribuicao({ proteina, carbo, gordura }) {
  const kP = proteina * 4, kC = carbo * 4, kG = gordura * 9;
  const total = kP + kC + kG;
  if (!total) return null;
  return { proteina: Math.round((kP / total) * 100), carbo: Math.round((kC / total) * 100), gordura: Math.round((kG / total) * 100) };
}
