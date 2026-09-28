/* ===========================================================================
   UI — componentes compartilhados: layout, formulários em modal, avisos,
   estados vazios e gráficos. Sem dependências externas.
   =========================================================================== */

const UI = (() => {
  /** Nome e versão do painel — aparecem na marca do alto da barra lateral. */
  const NOME = "Delfos";
  const VERSAO = "1.5";

  /* -------------------------------- Ícones -------------------------------- */

  // Desenhados para o Delfos (grade de 24, traço 1,6, pontas redondas) em vez
  // de glifos digitados — um "◆" ou "☁" muda de cara em cada sistema e lia
  // como improviso. Cada entrada é só o miolo do <svg>; a cor vem do texto.
  const ICONES = {
    // O ônfalo de Delfos, a pedra do "centro do mundo" — a marca do painel.
    onfalo: '<path d="M4.5 19c0-7.6 3.4-13.5 7.5-13.5S19.5 11.4 19.5 19"/><path d="M3 19h18"/><path d="M6.4 13.6c3.6 1.5 7.6 1.5 11.2 0"/><path d="M8.6 9c2.2.9 4.6.9 6.8 0"/>',
    home: '<path d="M2.8 12s3.4-6.3 9.2-6.3 9.2 6.3 9.2 6.3-3.4 6.3-9.2 6.3S2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.7"/>',
    pessoal: '<circle cx="12" cy="8.2" r="3.5"/><path d="M4.8 19.5c1.1-3.6 3.8-5.4 7.2-5.4s6.1 1.8 7.2 5.4"/>',
    financeiro: '<rect x="3.5" y="6.5" width="17" height="12.5" rx="2.5"/><path d="M3.5 10h17"/><path d="M7 15h3"/>',
    faculdade: '<path d="M12 6.8c-2-1.5-5-2-8.5-1.5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5v-13c-3.5-.5-6.5 0-8.5 1.5z"/><path d="M12 6.8v13"/>',
    projetos: '<path d="M3.5 17 9 11.5l3.8 3.8L20.5 7.5"/><path d="M15 7.5h5.5V13"/>',
    mais: '<path d="M12 5.5v13M5.5 12h13"/>',
    importar: '<path d="M12 4v10.5"/><path d="M7.8 10.5 12 14.7l4.2-4.2"/><path d="M4.5 15.5v2.5c0 .8.7 1.5 1.5 1.5h12c.8 0 1.5-.7 1.5-1.5v-2.5"/>',
    exportar: '<path d="M12 14.5V4"/><path d="M7.8 8.2 12 4l4.2 4.2"/><path d="M4.5 15.5v2.5c0 .8.7 1.5 1.5 1.5h12c.8 0 1.5-.7 1.5-1.5v-2.5"/>',
    arquivo: '<path d="M13.5 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M13.5 3.5V9H19"/>',
    anexar: '<path d="M13.5 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M13.5 3.5V9H19"/><path d="M12 17.5v-5.5"/><path d="m9.6 14.3 2.4-2.4 2.4 2.4"/>',
    nuvem: '<path d="M7.2 18.5h9.6a4 4 0 0 0 .7-7.94 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7.2 18.5z"/>',
    sair: '<path d="M9.5 20H6.5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3"/><path d="m15.5 16 4-4-4-4"/><path d="M19.5 12H9.5"/>',
    refazer: '<path d="M4.6 12.5a7.5 7.5 0 1 0 2.3-6"/><path d="M4.5 4.5V9H9"/>',
    fechar: '<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    camera: '<path d="M4 8.5c0-.8.7-1.5 1.5-1.5h2.3l1.4-2h5.6l1.4 2h2.3c.8 0 1.5.7 1.5 1.5v9c0 .8-.7 1.5-1.5 1.5h-13c-.8 0-1.5-.7-1.5-1.5z"/><circle cx="12" cy="12.8" r="3.3"/>',
    esquerda: '<path d="m14.5 6-6 6 6 6"/>',
    direita: '<path d="m9.5 6 6 6-6 6"/>',
    abaixo: '<path d="m7 10 5 5 5-5"/>',
    acima: '<path d="m7 14 5-5 5 5"/>',
    busca: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    editar: '<path d="M4.5 19.5h4l10-10a2.8 2.8 0 0 0-4-4l-10 10z"/><path d="m13 7 4 4"/>',
    lixeira: '<path d="M4.5 7h15"/><path d="M9.5 7V4.8h5V7"/><path d="M6.5 7l.8 11.5c.1 1 .9 1.5 1.7 1.5h6c.8 0 1.6-.5 1.7-1.5L17.5 7"/>',
    alvo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.2"/>',
    calendario: '<rect x="3.8" y="5.5" width="16.4" height="14.5" rx="2.5"/><path d="M3.8 10h16.4M8 3.5v4M16 3.5v4"/>',
    relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    vazio: '<circle cx="12" cy="12" r="8" stroke-dasharray="2.4 3"/>',
    banco: '<path d="M3.5 9.5 12 4.5l8.5 5"/><path d="M5.5 10v7M10 10v7M14 10v7M18.5 10v7"/><path d="M3.5 19.5h17"/>',
    cartao: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18"/>',
    investimentos: '<path d="M4 19.5h16"/><path d="M6.5 16v-4M11 16V8.5M15.5 16v-6M20 16V5.5"/>',
    pergunta: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6"/><path d="M12 17v.1"/>',
    lampada: '<path d="M9 17.5h6M10 20.5h4"/><path d="M8.5 14.5A5.5 5.5 0 1 1 15.5 14.5c-.7.6-1 1.4-1 2.2V17.5h-5v-.8c0-.8-.3-1.6-1-2.2z"/>',
    subiu: '<path d="M4 16.5 9.5 11l3.5 3.5 7-7"/><path d="M15 7.5h5v5"/>',
    desceu: '<path d="M4 7.5 9.5 13l3.5-3.5 7 7"/><path d="M15 16.5h5v-5"/>',
    repetir: '<path d="M17 3.5 20 6.5l-3 3"/><path d="M4 11.5v-1a4 4 0 0 1 4-4h12"/><path d="M7 20.5 4 17.5l3-3"/><path d="M20 12.5v1a4 4 0 0 1-4 4H4"/>',
    cofre: '<path d="M5.5 11.5c0-3.3 2.9-5.5 6.5-5.5 1.3 0 2.5.3 3.5.8l2.5-1.3-.5 3c1 1 1.5 2.1 1.5 3v2.5l-2 1v3.5h-2.5v-2h-5v2H7v-3a5 5 0 0 1-1.5-4z"/><path d="M10 9h3.5"/>',
    alerta: '<path d="M10.3 4.6 2.9 17.4A2 2 0 0 0 4.6 20.4h14.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 16.9v.1"/>',
    sol: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
    lua: '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
    usuario: '<circle cx="12" cy="8.2" r="3.5"/><path d="M4.8 19.5c1.1-3.6 3.8-5.4 7.2-5.4s6.1 1.8 7.2 5.4"/>',
    painel: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9 4.5v15"/>',
    chave: '<circle cx="8" cy="15" r="3.8"/><path d="m10.8 12.3 8.2-8.2M16 7l2.5 2.5M13.5 9.5 15.5 11.5"/>',
    ajustes: '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2"/><circle cx="9" cy="16.5" r="2"/>',
    ia: '<path d="M12 3.5 13.6 8a3 3 0 0 0 1.9 1.9L20 11.5l-4.5 1.6a3 3 0 0 0-1.9 1.9L12 19.5l-1.6-4.5a3 3 0 0 0-1.9-1.9L4 11.5l4.5-1.6A3 3 0 0 0 10.4 8z"/><path d="M19 3.5v3M17.5 5h3"/>',
    // Ícones para as abas criadas pelo usuário (valor "svg:<nome>" em pilar.icone).
    haltere: '<path d="M3.5 12h17"/><rect x="5" y="8" width="3" height="8" rx="1"/><rect x="16" y="8" width="3" height="8" rx="1"/><path d="M3 10v4M21 10v4"/>',
    livro: '<path d="M5 4.5h11a2 2 0 0 1 2 2V19.5H7a2 2 0 0 1-2-2z"/><path d="M5 17.5a2 2 0 0 1 2-2h11"/><path d="M9 8.5h5"/>',
    musica: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
    coracao: '<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z"/>',
    cruz: '<path d="M12 3.5v17M7 8.5h10"/>',
    folha: '<path d="M5 19c0-8 5-13.5 14.5-14.5C19 14 13.5 19 5.5 19z"/><path d="M5 19 13 11"/>',
    pata: '<circle cx="7" cy="10" r="1.8"/><circle cx="10.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M12.5 11.5c-2.8 0-5 3.2-5 5.3 0 1.6 1.3 2.7 2.8 2.7 1 0 1.5-.5 2.2-.5s1.2.5 2.2.5c1.5 0 2.8-1.1 2.8-2.7 0-2.1-2.2-5.3-5-5.3z"/>',
    carro: '<path d="M4.5 16.5v-4l2-5h11l2 5v4"/><path d="M3.5 16.5h17"/><circle cx="8" cy="17.5" r="1.8"/><circle cx="16" cy="17.5" r="1.8"/><path d="M5.5 12h13"/>',
    aviao: '<path d="M10.5 20 12 14.5 5 13.5v-2l7-2.5V5a1.5 1.5 0 0 1 3 0v4l6 2.5v2l-6-1v2.5l2 2V19l-3.5-1z" transform="rotate(-45 12 12)"/>',
    prato: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="4"/>',
    gota: '<path d="M12 3.5s-6 6.5-6 10.5a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5z"/>',
    estrela: '<path d="m12 4 2.4 5 5.4.7-4 3.8 1 5.4L12 16.3 7.2 18.9l1-5.4-4-3.8 5.4-.7z"/>',
    bandeira: '<path d="M5.5 20.5V4.5"/><path d="M5.5 5h11l-2 3.5 2 3.5h-11"/>',
    casa: '<path d="M4 11 12 4.5 20 11"/><path d="M6 9.5V19.5h12V9.5"/><path d="M10 19.5v-5h4v5"/>',
    carrinho: '<path d="M3.5 4.5h2.2l2 10.5h10.5l2-7.5H7"/><circle cx="9.5" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    pincel: '<path d="M14.5 4.5l5 5L11 18a3 3 0 0 1-4.2 0l-.8-.8a3 3 0 0 1 0-4.2z"/><path d="M6 17c-1 1-1 2.5-2.5 3 2 .5 4-.5 4.5-1.5"/>',
    controle: '<path d="M7.5 7.5h9a4 4 0 0 1 3.9 4.7l-.8 4.3a2 2 0 0 1-3.5.9L14 15h-4l-2.1 2.4a2 2 0 0 1-3.5-.9l-.8-4.3a4 4 0 0 1 3.9-4.7z"/><path d="M8.5 10.5v3M7 12h3"/><circle cx="15.5" cy="11" r=".6" fill="currentColor"/><circle cx="17" cy="12.8" r=".6" fill="currentColor"/>',
    bola: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l3.5 2.5-1.3 4h-4.4l-1.3-4z"/><path d="M12 3.5v4M15.5 10l4-1M14.2 14l2.3 3.5M9.8 14l-2.3 3.5M8.5 10l-4-1"/>',
    tenis: '<path d="M3.5 16.5c0-3 1.5-9 3-9 1 0 1 2 3 2.5 1.5.3 2.5-1 3.5-.5.8.4 1 2.5 3 3.5 2 1 4.5 1 4.5 3.5H3.5z"/><path d="M3.5 18.5h17"/>',
    estetoscopio: '<path d="M6 3.5v5a4 4 0 0 0 8 0v-5"/><path d="M10 12.5v2a5 5 0 0 0 10 0V13"/><circle cx="20" cy="11" r="2"/>',
    pilula: '<rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m10 9.5 4 5"/>',
    grupo: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.7-3 2.8-4.7 5.5-4.7s4.8 1.7 5.5 4.7"/><circle cx="16.5" cy="9" r="2.5"/><path d="M16 14.3c2.2 0 3.9 1.5 4.5 4.2"/>',
    maleta: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V5.5h6v2M3.5 12.5h17"/>',
    presente: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3.5 9h17v3.5h-17zM12 9v11"/><path d="M12 9c-1.5-3-5-3.5-5-1.2C7 9 12 9 12 9zm0 0c1.5-3 5-3.5 5-1.2C17 9 12 9 12 9z"/>',
    cafe: '<path d="M5 9.5h11v5a5 5 0 0 1-5 5 5 5 0 0 1-5-5z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3.5v2.5M12 3.5v2.5"/>',
    globo: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
    microscopio: '<path d="M9 4.5l4 2-3 6-4-2z"/><path d="M11 8.5 16 11a5 5 0 0 1-3 8.5"/><path d="M5 19.5h14M9 17h6"/>',
    lapis: '<path d="M5 19l1-4L15.5 5.5a2 2 0 0 1 3 3L9 18z"/><path d="M13.5 7.5l3 3"/>',
  };

  // Glifos que as páginas ainda passam para UI.vazio(): viram o ícone certo.
  const GLIFO_PARA_ICONE = { "＋": "mais", "◎": "alvo", "◷": "relogio", "▤": "faculdade", "▣": "banco", "✎": "editar", "◫": "arquivo" };

  /** Ícones desenhados oferecidos às abas criadas pelo usuário. */
  const ICONES_ABA = ["haltere", "livro", "estetoscopio", "pilula", "coracao", "cruz", "folha", "pata", "carro", "aviao",
    "prato", "gota", "cafe", "estrela", "bandeira", "casa", "carrinho", "pincel", "musica", "controle", "bola", "tenis",
    "grupo", "maleta", "presente", "globo", "microscopio", "lapis", "calendario", "alvo", "cofre", "lampada", "relogio", "sol", "lua", "camera"];

  /** Ícone de uma aba do usuário: "svg:<nome>" é desenho; qualquer outra coisa é o glifo que ele escolheu. */
  function iconeAba(valor) {
    const v = String(valor || "");
    if (v.startsWith("svg:") && ICONES[v.slice(4)]) return icone(v.slice(4));
    return fmt.escape(v || "◆");
  }

  /** SVG de um ícone do Delfos (vazio se o nome não existir). */
  function icone(nome, classe = "") {
    const miolo = ICONES[nome];
    if (!miolo) return "";
    return `<svg class="ico ${classe}" data-ico="${nome}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${miolo}</svg>`;
  }

  /* ------------------------------ Formatos ------------------------------- */

  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  const fmt = {
    moeda(v) {
      return (Number(v) || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: Store.estado().financeiro.moeda || "BRL",
        maximumFractionDigits: 2,
      });
    },
    /** Número decimal no formato brasileiro (8,2 — não 8.2). */
    decimal(v, casas = 1) {
      return (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
    },
    /** "6" ou "6º" viram "6º" — o ordinal nunca sai dobrado. */
    ordinal(v) {
      const n = String(v ?? "").trim().replace(/[ºª°.\s]+$/u, "");
      return n ? `${n}º` : "";
    },
    moedaCurta(v) {
      const n = Number(v) || 0;
      const abs = Math.abs(n);
      if (abs >= 1000000) return `${n < 0 ? "-" : ""}R$ ${(abs / 1000000).toFixed(1).replace(".", ",")}M`;
      if (abs >= 10000) return `${n < 0 ? "-" : ""}R$ ${(abs / 1000).toFixed(1).replace(".", ",")}k`;
      return fmt.moeda(n);
    },
    data(iso) {
      if (!iso) return "—";
      const [a, m, d] = iso.split("-");
      return `${d}/${m}/${a}`;
    },
    dataCurta(iso) {
      if (!iso) return "—";
      const [a, m, d] = iso.split("-");
      return `${d} ${MESES[Number(m) - 1]}`;
    },
    mesRotulo(chave) {
      if (!chave) return "—";
      const [a, m] = chave.split("-");
      return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
    },
    /**
     * "10 de setembro" — para linhas de leitura corrida, onde uma data em
     * números coladas com ponto médio soava a etiqueta de sistema. O ano só
     * aparece quando não é o corrente.
     */
    dataPorExtenso(iso) {
      if (!iso) return "sem data";
      const [a, m, d] = iso.split("-");
      const mes = MESES_LONGOS[Number(m) - 1];
      if (!mes) return fmt.data(iso);
      const ano = Number(a) === new Date().getFullYear() ? "" : ` de ${a}`;
      return `${Number(d)} de ${mes}${ano}`;
    },
    capitalizar(s) {
      const t = String(s ?? "");
      return t ? t[0].toUpperCase() + t.slice(1) : t;
    },
    escape(s) {
      return String(s ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
      );
    },
  };

  /* ------------------------ HTML dos resumos ------------------------------ */

  // Só sobrevive a marcação que o editor de resumos sabe produzir. O texto é
  // escrito pelo próprio usuário, mas um backup importado pode trazer
  // qualquer coisa — e resumo é o único lugar do painel que exibe HTML em vez
  // de texto escapado.
  const TAGS_OK = new Set(["P", "BR", "DIV", "SPAN", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SUB", "SUP",
    "UL", "OL", "LI", "H1", "H2", "H3", "BLOCKQUOTE", "FONT", "IMG", "HR", "PRE", "CODE", "A",
    "TABLE", "THEAD", "TBODY", "TR", "TD", "TH"]);
  // Cada propriedade de estilo só passa com um valor que o editor sabe produzir
  // (cor, alinhamento, recuo, tamanho de imagem) — nada de url(), expression…
  const COR = /^([a-z]{3,20}|#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+\s*)?\)|transparent|inherit)$/i;
  const MEDIDA = /^-?\d+(\.\d+)?(px|em|%)?$/;
  const ESTILOS_OK = {
    "font-family": (v) => /^[\w\s,'"-]+$/.test(v),
    "font-size": (v) => MEDIDA.test(v) || /^(x{0,2}-?(small|large)|medium)$/.test(v),
    "font-weight": (v) => /^(normal|bold|bolder|lighter|\d{3})$/.test(v),
    "font-style": (v) => /^(normal|italic)$/.test(v),
    "text-decoration": (v) => /^[a-z\s-]+$/.test(v),
    "text-decoration-line": (v) => /^[a-z\s-]+$/.test(v),
    "vertical-align": (v) => /^(sub|super|baseline)$/.test(v),
    color: (v) => COR.test(v),
    "background-color": (v) => COR.test(v),
    "text-align": (v) => /^(left|right|center|justify|start|end)$/.test(v),
    "margin-left": (v) => MEDIDA.test(v),
    "margin": (v) => v.split(/\s+/).every((x) => MEDIDA.test(x)),
    "padding": (v) => v.split(/\s+/).every((x) => MEDIDA.test(x)),
    "border": (v) => /^(none|0(px)?)$/.test(v),
    width: (v) => /^\d{1,3}%$/.test(v) || /^\d{1,4}px$/.test(v),
  };
  // Classes e dados que o editor usa para blocos próprios (caixa de destaque,
  // checklist, tabela). Qualquer outro valor é jogado fora.
  const CLASSES_OK = new Set(["callout", "checklist", "tabela-resumo", "img-p", "img-m", "img-g", "img-c"]);
  const DADOS_OK = { "data-tipo": /^(nota|dica|importante|atencao)$/, "data-feito": /^1$/, "data-anexo-id": /^[\w-]{1,80}$/ };

  function linkSeguro(href) {
    const v = String(href || "").trim();
    return /^(https?:|mailto:)/i.test(v) ? v : "";
  }

  // "src" fica de fora de propósito: uma imagem inserida no editor vira
  // <img data-anexo-id> sem src — o navegador nunca guarda a URL do blob,
  // que morre a cada recarregamento. UI.resolverImagens() é quem repõe o
  // src na hora de exibir, buscando o arquivo de novo no IndexedDB.
  const ATRIBUTOS_OK = new Set(["face", "size", "alt", "colspan", "rowspan"]); // "face"/"size": resquícios de <font> do execCommand

  /**
   * Monta o HTML num documento inerte (DOMParser): ali nada carrega nem roda.
   * Montar num <div> da página, mesmo solto, já dispara o onerror de um
   * <img src=x onerror=…> antes de a limpeza acontecer.
   */
  function moldeInerte(html) {
    return new DOMParser().parseFromString(`<!doctype html><body>${String(html || "")}</body>`, "text/html").body;
  }

  function htmlSeguro(html) {
    const molde = moldeInerte(html);
    // querySelectorAll devolve lista estática: os filhos de uma tag removida
    // já estão nela e continuam sendo visitados depois de subirem de nível.
    // Estes somem com o conteúdo junto (o texto de um <script> não é texto do resumo).
    molde.querySelectorAll("script, style, iframe, object, embed, template, noscript, svg, math, link, meta").forEach((el) => el.remove());
    molde.querySelectorAll("*").forEach((el) => {
      if (!molde.contains(el)) return;
      if (!TAGS_OK.has(el.tagName)) return el.replaceWith(...el.childNodes);
      [...el.attributes].forEach((a) => {
        const nome = a.name.toLowerCase();
        if (ATRIBUTOS_OK.has(nome)) {
          if ((nome === "colspan" || nome === "rowspan") && !/^\d{1,2}$/.test(a.value)) el.removeAttribute(a.name);
          return;
        }
        if (DADOS_OK[nome]) { if (!DADOS_OK[nome].test(a.value)) el.removeAttribute(a.name); return; }
        if (nome === "class") {
          const cls = a.value.split(/\s+/).filter((c) => CLASSES_OK.has(c));
          if (cls.length) el.setAttribute("class", cls.join(" ")); else el.removeAttribute("class");
          return;
        }
        if (nome === "href" && el.tagName === "A") {
          const ok = linkSeguro(a.value);
          if (ok) { el.setAttribute("href", ok); el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener noreferrer"); }
          else el.removeAttribute("href");
          return;
        }
        if ((nome === "target" || nome === "rel") && el.tagName === "A") return;
        if (nome !== "style") return el.removeAttribute(a.name);
        const mantidos = a.value
          .split(";")
          .map((d) => d.trim())
          .filter((d) => {
            const i = d.indexOf(":");
            if (i < 0) return false;
            const prop = d.slice(0, i).trim().toLowerCase();
            const val = d.slice(i + 1).trim();
            return ESTILOS_OK[prop] && !/url\(|expression|javascript:/i.test(val) && ESTILOS_OK[prop](val.replace(/\s*!important$/, ""));
          });
        if (mantidos.length) el.setAttribute("style", mantidos.join("; "));
        else el.removeAttribute("style");
      });
    });
    return molde.innerHTML;
  }

  /** Ids dos anexos de imagem embutidos num HTML de resumo (<img data-anexo-id>). */
  function idsImagensEm(html) {
    const molde = moldeInerte(html);
    return [...molde.querySelectorAll("img[data-anexo-id]")].map((img) => img.dataset.anexoId).filter(Boolean);
  }

  /**
   * Repõe o src das imagens de um resumo (editor ou pré-visualização),
   * buscando cada arquivo de novo no IndexedDB — é o que faz uma imagem
   * inserida no editor aparecer de fato, e não um ícone de anexo. Roda toda
   * vez que o HTML de um resumo é exibido, porque a URL do blob não
   * sobrevive a um recarregamento.
   */
  async function resolverImagens(raiz) {
    if (!raiz || typeof Arquivos === "undefined") return;
    const imgs = [...raiz.querySelectorAll("img[data-anexo-id]")].filter((img) => !img.getAttribute("src"));
    for (const img of imgs) {
      const id = img.dataset.anexoId;
      try {
        const b = await Arquivos.blob({ id, tipo: "" });
        if (!b) { img.alt = `${img.alt || "Imagem"} (não está neste navegador)`; continue; }
        img.src = URL.createObjectURL(b);
      } catch {
        img.alt = `${img.alt || "Imagem"} (não pôde ser carregada)`;
      }
    }
  }

  /* -------------------------------- Datas -------------------------------- */

  function hojeISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function mesAtual() { return hojeISO().slice(0, 7); }

  function mesAnterior(chave) {
    const [a, m] = chave.split("-").map(Number);
    const d = new Date(a, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function diasAte(iso) {
    if (!iso) return null;
    const alvo = new Date(iso + "T00:00:00");
    const hoje = new Date(hojeISO() + "T00:00:00");
    return Math.round((alvo - hoje) / 86400000);
  }

  // Nível de urgência sempre acompanhado de rótulo textual — a cor nunca
  // carrega o significado sozinha.
  function urgencia(iso) {
    const d = diasAte(iso);
    if (d === null) return { nivel: "futuro", rotulo: "sem data", dias: null };
    if (d < 0) return { nivel: "atrasado", rotulo: `atrasado ${Math.abs(d)}d`, dias: d };
    if (d === 0) return { nivel: "hoje", rotulo: "hoje", dias: 0 };
    if (d === 1) return { nivel: "urgente", rotulo: "amanhã", dias: 1 };
    if (d <= 7) return { nivel: "urgente", rotulo: `em ${d} dias`, dias: d };
    if (d <= 30) return { nivel: "proximo", rotulo: `em ${d} dias`, dias: d };
    if (d <= 90) return { nivel: "futuro", rotulo: `em ${d} dias`, dias: d };
    return { nivel: "futuro", rotulo: `em ${Math.round(d / 30)} meses`, dias: d };
  }

  // Chave ISO da semana (segunda a domingo) — base da detecção de conflitos.
  function chaveSemana(iso) {
    const d = new Date(iso + "T00:00:00");
    const dia = (d.getDay() + 6) % 7; // segunda = 0
    d.setDate(d.getDate() - dia);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  /* ------------- Compromissos unificados (pilares fixos + criados) --------- */

  // Cor e rótulo de cada área fixa. Cada compromisso carrega os seus, para
  // quem desenha a agenda não precisar saber de onde o item veio — é isso que
  // deixa as abas criadas pelo usuário entrarem junto com os quatro pilares.
  const AREAS = {
    faculdade: { rotulo: "faculdade", cor: "var(--s-faculdade)" },
    projetos: { rotulo: "projetos", cor: "var(--s-projetos)" },
    financeiro: { rotulo: "financeiro", cor: "var(--s-financeiro)" },
    pessoal: { rotulo: "pessoal", cor: "var(--s-pessoal)" },
  };

  const daArea = (area) => ({ area, areaRotulo: AREAS[area].rotulo, cor: AREAS[area].cor });

  function compromissos({ incluirConcluidos = false } = {}) {
    const e = Store.estado();
    const itens = [];

    e.faculdade.prazos.forEach((p) => {
      if (!p.data || (!incluirConcluidos && p.concluido)) return;
      itens.push({ id: p.id, titulo: p.descricao, data: p.data, ...daArea("faculdade"), tipo: p.tipo || "entrega", concluido: !!p.concluido });
    });

    // Avaliações agendadas de cada disciplina. Uma avaliação com nota lançada
    // já aconteceu, então sai da agenda.
    e.faculdade.disciplinas.forEach((d) => {
      (d.avaliacoes || []).forEach((a) => {
        if (!a.data) return;
        const feita = a.nota !== null && a.nota !== undefined && a.nota !== "";
        if (feita && !incluirConcluidos) return;
        itens.push({
          id: a.id, titulo: `${a.nome || "Avaliação"} — ${d.nome}`, data: a.data,
          ...daArea("faculdade"), tipo: "prova", concluido: feita, disciplinaId: d.id,
        });
      });
    });

    e.projetos.forEach((p) => {
      if (!p.deadline || (!incluirConcluidos && p.status === "concluído")) return;
      itens.push({ id: p.id, titulo: p.nome, data: p.deadline, ...daArea("projetos"), tipo: "projeto", concluido: p.status === "concluído" });
    });

    e.financeiro.metas.forEach((m) => {
      if (!m.prazo) return;
      const pronta = m.valorAlvo > 0 && m.valorAtual >= m.valorAlvo;
      if (pronta && !incluirConcluidos) return;
      itens.push({ id: m.id, titulo: `Meta — ${m.descricao}`, data: m.prazo, ...daArea("financeiro"), tipo: "meta", concluido: pronta });
    });

    (e.pessoal?.compromissos || []).forEach((c) => {
      if (!c.data || (!incluirConcluidos && c.concluido)) return;
      itens.push({ id: c.id, titulo: c.descricao, data: c.data, ...daArea("pessoal"), tipo: c.tipo || "compromisso", concluido: !!c.concluido });
    });

    // Abas criadas pelo usuário: mesma forma de item, cor e rótulo próprios.
    (e.pilares || []).forEach((pil) => {
      (pil.itens || []).forEach((it) => {
        if (!it.data || (!incluirConcluidos && it.concluido)) return;
        itens.push({
          id: it.id, titulo: it.descricao, data: it.data,
          area: `pilar:${pil.id}`, areaRotulo: pil.nome, cor: pil.cor,
          tipo: it.tipo || "compromisso", concluido: !!it.concluido,
        });
      });
    });

    return itens.sort((a, b) => a.data.localeCompare(b.data));
  }

  // Semanas com mais de um compromisso — o alerta é mais forte quando os
  // compromissos vêm de pilares diferentes.
  function conflitos() {
    const porSemana = {};
    compromissos()
      .filter((i) => (diasAte(i.data) ?? -1) >= 0)
      .forEach((i) => {
        const k = chaveSemana(i.data);
        (porSemana[k] = porSemana[k] || []).push(i);
      });

    return Object.entries(porSemana)
      .filter(([, itens]) => itens.length > 1)
      .map(([semana, itens]) => ({
        semana,
        itens,
        areas: [...new Set(itens.map((i) => i.area))],
        // Rótulos legíveis: o id da área ("pilar:pl1") não serve para exibir.
        rotulos: [...new Set(itens.map((i) => i.areaRotulo))],
        multiplasAreas: new Set(itens.map((i) => i.area)).size > 1,
      }))
      .sort((a, b) => a.semana.localeCompare(b.semana));
  }

  /* -------------------------------- Layout -------------------------------- */

  // `icone` aqui é o nome de um desenho de ICONES; as abas criadas pelo
  // usuário guardam um glifo (Store.ICONES_PILAR), que é dado dele.
  const PAGINAS = [
    { id: "home", rotulo: "Visão geral", href: "index.html", cor: "", icone: "home" },
    { id: "pessoal", rotulo: "Pessoal", href: "pessoal.html", cor: "pessoal", icone: "pessoal" },
    { id: "financeiro", rotulo: "Financeiro", href: "financeiro.html", cor: "financeiro", icone: "financeiro" },
    { id: "faculdade", rotulo: "Faculdade", href: "faculdade.html", cor: "faculdade", icone: "faculdade" },
    { id: "projetos", rotulo: "Projetos", href: "projetos.html", cor: "projetos", icone: "projetos" },
  ];

  // Páginas de detalhe se acendem no item de nível de cima a que pertencem.
  const GRUPO_DE = {
    contas: "financeiro", conta: "financeiro", investimentos: "financeiro",
    disciplina: "faculdade", projeto: "projetos",
  };

  /**
   * As abas fixas ligadas (com o nome que o usuário escolheu, se escolheu
   * algum) mais as que o usuário criou, na ordem em que aparecem. "Visão
   * geral" não é uma aba fixa configurável — sempre aparece.
   */
  function paginas() {
    const home = PAGINAS[0];
    const fixas = Personalizacao.abasFixas()
      .filter((a) => a.ativo)
      .map((a) => ({ ...PAGINAS.find((p) => p.id === a.id), rotulo: a.rotulo }));
    const criadas = (Store.estado().pilares || []).map((p) => ({
      id: `pilar:${p.id}`,
      rotulo: p.nome,
      href: `pilar.html?id=${encodeURIComponent(p.id)}`,
      cor: "",
      corHex: p.cor,
      icone: p.icone,
    }));
    // A ordem escolhida no perfil (Painel → Abas); o que não está nela vem depois, na ordem de sempre.
    const ordem = experiencia().ordemAbas || [];
    const resto = [...fixas, ...criadas];
    const pos = (p, i) => { const k = ordem.indexOf(p.id); return k === -1 ? 1000 + i : k; };
    const ordenadas = resto.map((p, i) => [p, pos(p, i)]).sort((a, b) => a[1] - b[1]).map(([p]) => p);
    return [home, ...ordenadas];
  }

  function contagens() {
    const e = Store.estado();
    const urgentes = compromissos().filter((i) => {
      const d = diasAte(i.data);
      return d !== null && d <= 7;
    });
    const porArea = (area) => urgentes.filter((i) => i.area === area).length;

    const c = {
      home: urgentes.length,
      financeiro: e.financeiro.transacoes.filter((t) => t.status === "pendente").length,
      faculdade: porArea("faculdade"),
      projetos: porArea("projetos"),
      pessoal: porArea("pessoal"),
    };
    (e.pilares || []).forEach((p) => { c[`pilar:${p.id}`] = porArea(`pilar:${p.id}`); });
    return c;
  }

  function iniciais(nome) {
    const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "•";
    return (partes[0][0] + (partes[1]?.[0] || "")).toUpperCase();
  }

  /** Foto do perfil quando existe; senão, as iniciais do nome. */
  function avatarHTML(perfil, classe = "brand-mark") {
    const p = perfil || {};
    return p.foto
      ? `<div class="${classe}"><img src="${fmt.escape(p.foto)}" alt="Foto de ${fmt.escape(p.nome || "perfil")}" /></div>`
      : `<div class="${classe}">${fmt.escape(iniciais(p.nome))}</div>`;
  }

  // Sub-itens aparecem só sob a seção aberta, para a barra não crescer sem fim.
  function subItens(grupo, ativo, idAtivo) {
    if (grupo === "financeiro") {
      return [
        { rotulo: "Contas e cartões", href: "contas.html", ativo: ativo === "contas" || ativo === "conta" },
        { rotulo: "Investimentos", href: "investimentos.html", ativo: ativo === "investimentos" },
      ];
    }
    if (grupo === "faculdade") {
      return Store.lista("faculdade.disciplinas")
        .filter((d) => d.status !== "concluída")
        .slice(0, 8)
        .map((d) => ({
          rotulo: d.nome,
          href: `disciplina.html?id=${encodeURIComponent(d.id)}`,
          ativo: ativo === "disciplina" && idAtivo === d.id,
        }));
    }
    if (grupo === "projetos") {
      return Store.lista("projetos")
        .filter((p) => p.status !== "concluído" && p.status !== "arquivado")
        .slice(0, 8)
        .map((p) => ({
          rotulo: p.nome,
          href: `projeto.html?id=${encodeURIComponent(p.id)}`,
          ativo: ativo === "projeto" && idAtivo === p.id,
        }));
    }
    return [];
  }

  // Guardados para o layout poder ser remontado sozinho (ex.: depois de trocar
  // a foto do perfil) sem a página precisar repassar os mesmos argumentos.
  let paginaAtiva = "home";
  let opcoesAtivas = {};

  function montarLayout(ativo, opcoes = {}) {
    const { idAtivo = "" } = opcoes;
    paginaAtiva = ativo;
    opcoesAtivas = opcoes;
    const el = document.getElementById("sidebar");
    if (!el) return;
    const c = contagens();
    const perfil = Store.estado().perfil || {};
    // Uma aba criada pelo usuário se acende por id próprio; as fixas, pelo
    // grupo a que a página de detalhe pertence.
    const grupoAtivo = ativo === "pilar" ? `pilar:${idAtivo}` : GRUPO_DE[ativo] || ativo;

    const itens = paginas().map((p) => {
      const aberto = p.id === grupoAtivo;
      const subs = aberto ? subItens(p.id, ativo, idAtivo) : [];
      // As abas criadas guardam um hex próprio, então a cor vai inline (como
      // variável); as fixas usam a classe do pilar, que segue o tema.
      const iconeHTML = p.corHex
        ? `<span class="nav-icon propria" style="--cor-aba:${fmt.escape(p.corHex)}">${iconeAba(p.icone)}</span>`
        : `<span class="nav-icon ${p.cor}">${icone(p.icone)}</span>`;
      return `
        <a class="nav-item ${aberto ? "active" : ""}" href="${p.href}"${aberto ? ' aria-current="page"' : ""}>
          ${iconeHTML}
          <span class="nav-label">${fmt.escape(p.rotulo)}</span>
          ${c[p.id] ? `<span class="nav-count ${p.id === "home" ? "alert" : ""}">${c[p.id]}</span>` : ""}
        </a>
        ${subs.length ? `<div class="nav-sub">${subs
          .map((s) => `<a class="nav-subitem ${s.ativo ? "active" : ""}" href="${s.href}" title="${fmt.escape(s.rotulo)}">${fmt.escape(s.rotulo)}</a>`)
          .join("")}</div>` : ""}`;
    }).join("");

    const linhaCurso = perfil.curso
      ? `${perfil.curso}${perfil.semestre ? `, ${fmt.ordinal(perfil.semestre)} semestre` : ""}`
      : Personalizacao.ocupacaoResumo() || "Perfil e ajustes";

    el.innerHTML = `
      <a class="marca-topo" href="index.html" title="Visão geral">
        ${icone("onfalo")}
        <span class="marca-nome">${fmt.escape(NOME)}</span>
        <span class="marca-versao">v${fmt.escape(VERSAO)}</span>
      </a>
      <nav class="nav" aria-label="Abas do painel">${itens}</nav>
      <button class="nav-nova" id="btn-nova-aba" type="button">${icone("mais")}Nova aba</button>
      <div class="sidebar-foot">
        <button class="brand" id="btn-perfil" type="button" title="Perfil, tema, abas e conta">
          ${avatarHTML(perfil)}
          <span class="brand-text">
            <span class="brand-name">${fmt.escape(perfil.nome || "Seu nome")}</span>
            <span class="brand-sub">${fmt.escape(linhaCurso)}</span>
          </span>
          <span class="brand-caret">${icone("acima")}</span>
        </button>
      </div>`;

    document.getElementById("btn-perfil").addEventListener("click", () => abrirPerfil());
    document.getElementById("btn-nova-aba").addEventListener("click", novaAba);

    // No celular a barra vira uma faixa rolável: traz a aba atual para a vista,
    // senão quem está em "Financeiro" vê o próprio nome cortado na borda.
    const atual = el.querySelector(".nav-item.active");
    if (atual && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = Math.max(0, atual.offsetLeft - (el.clientWidth - atual.offsetWidth) / 2);
    }
  }

  /* --------------------- Abas criadas pelo usuário ------------------------- */

  // O modelo só entra no formulário de criação — trocar de modelo depois de
  // já ter itens cadastrados bagunçaria os campos deles, então a edição
  // (pilar.js → editarAba) chama camposPilar() sem argumento nenhum.
  const camposPilar = ({ comModelo = false } = {}) => [
    { nome: "nome", rotulo: "Nome da aba", tipo: "text", obrigatorio: true, placeholder: "Ex.: Academia, Leituras, Igreja" },
    { nome: "icone", rotulo: "Ícone", tipo: "select", opcoes: Store.ICONES_PILAR },
    { nome: "cor", rotulo: "Cor", tipo: "select", opcoes: Store.PALETA_PILAR },
    { nome: "descricao", rotulo: "Do que se trata", tipo: "text", placeholder: "Aparece como subtítulo da página" },
    ...(comModelo ? [{
      nome: "modelo", rotulo: "Modelo", tipo: "select",
      opcoes: Store.MODELOS_PILAR.map((m) => ({ valor: m.id, rotulo: m.rotulo })),
      dica: "Decide os campos iniciais dos itens — dá para ajustar depois em \"Ajustes da aba\".",
    }] : []),
  ];

  /**
   * Abre o criador de aba (abas.js): nome, sugestão local instantânea e, com
   * as contas ligadas, a personalização pela IA. Sem abas.js carregado (não
   * deve acontecer em página com barra), cai no formulário simples de antes.
   */
  async function novaAba() {
    if (typeof Abas !== "undefined") return Abas.abrir();
    const v = await formulario({ titulo: "Nova aba", campos: camposPilar({ comModelo: true }), rotuloConfirmar: "Criar aba" });
    if (!v) return;
    const modelo = Store.MODELOS_PILAR.find((m) => m.id === v.modelo) || Store.MODELOS_PILAR[0];
    const { modelo: _idModelo, ...dadosAba } = v;
    const novo = Store.inserir("pilares", {
      ...dadosAba, modelo: modelo.id, campos: modelo.campos.map((c) => ({ ...c })), naAgenda: modelo.naAgenda, itens: [],
      ...(modelo.especial === "academia" ? { academia: { configuradoEm: "", objetivo: "", experiencia: "", frequenciaSemanal: 0, divisao: "" }, dias: [] } : {}),
    });
    location.href = `pilar.html?id=${encodeURIComponent(novo.id)}`;
  }

  /**
   * Traduz os campos próprios de uma aba (modelo ou editor) para o formato
   * que UI.formulario entende. Quem chama junta o resultado com os campos de
   * sistema (descricao, data) e depois separa os valores em `extras`.
   */
  function camposItemPilar(pilar) {
    return (pilar.campos || []).map((c) => ({
      nome: c.id,
      rotulo: c.rotulo,
      tipo: c.tipo,
      opcoes: c.opcoes,
      obrigatorio: !!c.obrigatorio,
      dica: c.dica || "",
    }));
  }

  /** Formulário para criar/editar um campo próprio (usado por editorCampos). */
  function formularioCampo(valores = {}) {
    return formulario({
      titulo: valores.id ? "Editar campo" : "Novo campo",
      campos: [
        { nome: "rotulo", rotulo: "Nome do campo", tipo: "text", obrigatorio: true, placeholder: "Ex.: Prioridade" },
        { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: Store.TIPOS_CAMPO },
        { nome: "opcoes", rotulo: "Opções (uma por linha)", tipo: "textarea", dica: 'Só é usado quando o tipo é "Lista de opções".' },
        { nome: "naLista", rotulo: "Mostrar na listagem", tipo: "simNao" },
        { nome: "obrigatorio", rotulo: "Obrigatório ao cadastrar", tipo: "simNao" },
      ],
      valores: { ...valores, opcoes: Array.isArray(valores.opcoes) ? valores.opcoes.join("\n") : (valores.opcoes || "") },
      rotuloConfirmar: "Salvar campo",
    }).then((v) => {
      if (!v) return null;
      return {
        rotulo: v.rotulo,
        tipo: v.tipo,
        opcoes: v.opcoes ? v.opcoes.split("\n").map((s) => s.trim()).filter(Boolean) : [],
        naLista: !!v.naLista,
        obrigatorio: !!v.obrigatorio,
      };
    });
  }

  /**
   * Gerenciador dos campos próprios de uma aba — adicionar, editar, excluir e
   * reordenar. Cada ação salva e reabre o próprio modal, o mesmo padrão de
   * abrirPerfil ao trocar a foto.
   */
  function editorCampos(pilarId) {
    const pilar = Store.achar("pilares", pilarId);
    if (!pilar) return;
    const campos = pilar.campos || [];

    const linhaCampo = (c, i) => {
      const tipoRotulo = Store.TIPOS_CAMPO.find((t) => t.valor === c.tipo)?.rotulo || c.tipo;
      const meta = [tipoRotulo, c.naLista ? "na lista" : "", c.obrigatorio ? "obrigatório" : ""].filter(Boolean).join(", ");
      return `
        <li data-id="${fmt.escape(c.id)}">
          <span class="grow">
            <span class="title">${fmt.escape(c.rotulo)}</span>
            <span class="meta">${fmt.escape(meta)}</span>
          </span>
          <span class="row-actions" style="opacity:1;">
            <button class="btn ghost sm" data-subir type="button" aria-label="Mover para cima" ${i === 0 ? "disabled" : ""}>↑</button>
            <button class="btn ghost sm" data-descer type="button" aria-label="Mover para baixo" ${i === campos.length - 1 ? "disabled" : ""}>↓</button>
            <button class="btn ghost sm" data-editar type="button">Editar</button>
            <button class="btn ghost sm" data-excluir type="button">Excluir</button>
          </span>
        </li>`;
    };

    const html = `
      <div class="modal-head">
        <h2 class="modal-title">Campos de "${fmt.escape(pilar.nome)}"</h2>
        <p class="modal-desc">O que cada item desta aba guarda, além de nome e data. Marque "na lista" para o campo aparecer direto na listagem.</p>
      </div>
      <div class="modal-body">
        ${campos.length ? `<ul class="list" data-lista>${campos.map(linhaCampo).join("")}</ul>` : `<p class="card-note" style="margin:0 0 12px;">Nenhum campo próprio ainda.</p>`}
        <button class="btn block" data-novo type="button" style="margin-top:12px;">+ Campo</button>
      </div>
      <div class="modal-foot">
        <button class="btn primary" data-acao="fechar" type="button">Pronto</button>
      </div>`;

    return abrirModal(html, {
      aoMontar(modal, fechar) {
        modal.querySelector('[data-acao="fechar"]').addEventListener("click", () => fechar(null));

        modal.querySelector("[data-novo]")?.addEventListener("click", async () => {
          const novo = await formularioCampo();
          if (!novo) return;
          Store.atualizar("pilares", pilar.id, { campos: [...campos, { id: Store.uid("cp"), ...novo }] });
          fechar(null);
          editorCampos(pilar.id);
        });

        modal.querySelectorAll("[data-lista] li").forEach((li, i) => {
          const id = li.dataset.id;

          li.querySelector("[data-editar]").addEventListener("click", async () => {
            const atual = campos.find((c) => c.id === id);
            const editado = await formularioCampo(atual);
            if (!editado) return;
            Store.atualizar("pilares", pilar.id, { campos: campos.map((c) => (c.id === id ? { ...c, ...editado } : c)) });
            fechar(null);
            editorCampos(pilar.id);
          });

          li.querySelector("[data-excluir]").addEventListener("click", () => {
            Store.atualizar("pilares", pilar.id, { campos: campos.filter((c) => c.id !== id) });
            fechar(null);
            editorCampos(pilar.id);
          });

          const trocar = (a, b) => {
            const atualizados = [...campos];
            [atualizados[a], atualizados[b]] = [atualizados[b], atualizados[a]];
            Store.atualizar("pilares", pilar.id, { campos: atualizados });
            fechar(null);
            editorCampos(pilar.id);
          };
          li.querySelector("[data-subir]")?.addEventListener("click", () => { if (i > 0) trocar(i - 1, i); });
          li.querySelector("[data-descer]")?.addEventListener("click", () => { if (i < campos.length - 1) trocar(i, i + 1); });
        });
      },
    });
  }

  /* ------------------------------- Perfil ---------------------------------- */

  /**
   * Reduz a foto escolhida antes de guardar: o localStorage tem uns 5 MB para
   * tudo, e uma foto de celular sozinha passa disso. 256px de lado em JPEG
   * fica em poucas dezenas de KB e é bem mais do que o avatar precisa.
   */
  function redimensionarFoto(file, lado = 256) {
    return new Promise((ok, falha) => {
      if (!file.type.startsWith("image/")) return falha(new Error("Escolha um arquivo de imagem (JPG, PNG…)."));
      const leitor = new FileReader();
      leitor.onerror = () => falha(new Error("Não foi possível ler a imagem."));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => falha(new Error("Este arquivo não parece ser uma imagem válida."));
        img.onload = () => {
          // Recorte quadrado central: o avatar é redondo, então sobra é sobra.
          const corte = Math.min(img.width, img.height);
          const cv = document.createElement("canvas");
          cv.width = cv.height = lado;
          const ctx = cv.getContext("2d");
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, (img.width - corte) / 2, (img.height - corte) / 2, corte, corte, 0, 0, lado, lado);
          ok(cv.toDataURL("image/jpeg", 0.82));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(file);
    });
  }

  /** Idade em anos completos — só para exibir junto da data de nascimento. */
  function idade(iso) {
    if (!iso) return null;
    const nasc = new Date(iso + "T00:00:00");
    if (Number.isNaN(nasc.getTime())) return null;
    const hoje = new Date(hojeISO() + "T00:00:00");
    let anos = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos -= 1;
    return anos >= 0 && anos < 130 ? anos : null;
  }

  /** Campos do formulário de perfil, agrupados em seções. */
  const camposPerfil = () => [
    { tipo: "secao", rotulo: "Quem é você" },
    { nome: "nome", rotulo: "Nome completo", tipo: "text", obrigatorio: true },
    { nome: "apelido", rotulo: "Como quer ser chamado", tipo: "text", placeholder: "Aparece na saudação. Ex.: Lu" },
    { nome: "dataNascimento", rotulo: "Data de nascimento", tipo: "date" },
    { nome: "pronomes", rotulo: "Pronomes", tipo: "text", placeholder: "Ex.: ela/dela, ele/dele" },
    { nome: "telefone", rotulo: "Telefone", tipo: "text", placeholder: "(71) 90000-0000" },
    { nome: "email", rotulo: "E-mail", tipo: "text", placeholder: "voce@exemplo.com" },
    { nome: "cidade", rotulo: "Cidade", tipo: "text", placeholder: "Ex.: Salvador, BA" },

    { tipo: "secao", rotulo: "Ocupação" },
    { nome: "ocupacao", rotulo: "O que você faz", tipo: "text", placeholder: "Ex.: Estudante de Medicina, Advogada, Autônomo" },
    { nome: "tipoOcupacao", rotulo: "Momento", tipo: "select", opcoes: [
        { valor: "estudo", rotulo: "Estudo" },
        { valor: "trabalho", rotulo: "Trabalho" },
        { valor: "ambos", rotulo: "Os dois" },
        { valor: "outro", rotulo: "Outro" },
      ] },

    // Só aparece para quem estuda — para os demais, ocupação já basta.
    ...(Personalizacao.eEstudante() ? [
      { tipo: "secao", rotulo: "Vida acadêmica" },
      { nome: "curso", rotulo: "Curso", tipo: "text", placeholder: "Ex.: Medicina" },
      { nome: "instituicao", rotulo: "Instituição", tipo: "text", placeholder: "Ex.: UFBA" },
      { nome: "semestre", rotulo: "Semestre atual", tipo: "number", step: "1", placeholder: "Ex.: 6" },
      { nome: "matricula", rotulo: "Matrícula", tipo: "text", placeholder: "Número de matrícula" },
      { nome: "ingresso", rotulo: "Início do curso", tipo: "text", placeholder: "Ex.: 2023.1" },
    ] : []),

    { tipo: "secao", rotulo: "Em poucas linhas" },
    { nome: "bio", rotulo: "Sobre você", tipo: "textarea", placeholder: "Área de interesse, pesquisa, o que está tocando agora…" },
    { nome: "objetivos", rotulo: "Objetivos do momento", tipo: "textarea", placeholder: "O que quer alcançar nos próximos meses." },
  ];

  const DESTAQUES = [["osso", "Osso"], ["louro", "Louro"], ["anil", "Anil"], ["cobre", "Cobre"], ["ameixa", "Ameixa"]];

  function linhaAjuste(titulo, texto, controle, compacta = false, embaixo = false) {
    return `<div class="ajuste-linha ${compacta ? "compacta" : ""} ${embaixo ? "embaixo" : ""}">
        <div class="ajuste-rotulo"><span class="t">${fmt.escape(titulo)}</span>${texto ? `<span class="d">${fmt.escape(texto)}</span>` : ""}</div>
        <div class="ajuste-controle">${controle}</div>
      </div>`;
  }
  const segPref = (chave, opcoes, atual) => `<div class="seg sm" data-pref="${chave}">
      <input type="hidden" value="${fmt.escape(atual)}" />
      ${opcoes.map(([v, r]) => `<button type="button" data-valor="${v}" aria-pressed="${String(String(atual) === String(v))}">${r}</button>`).join("")}
    </div>`;
  const switchPref = (chave, ligado) => `<input type="checkbox" class="switch" data-pref-switch="${chave}" ${ligado ? "checked" : ""} aria-label="${chave}" />`;

  /** Linhas de "Abas e ordem": todas as abas da barra (menos a Visão geral), com setas. */
  function linhasAbas() {
    const fixas = Object.fromEntries(Personalizacao.abasFixas().map((a) => [a.id, a]));
    // Inclui as fixas desligadas (paginas() só traz as ligadas), na posição da ordem salva.
    const ligadas = paginas().slice(1);
    const desligadas = Object.values(fixas).filter((a) => !a.ativo).map((a) => ({ ...PAGINAS.find((x) => x.id === a.id), rotulo: a.rotulo }));
    const lista = [...ligadas, ...desligadas];
    return lista.map((pg, i) => {
      const fixa = fixas[pg.id];
      const iconeHTML = pg.corHex ? `<span class="nav-icon propria" style="--cor-aba:${fmt.escape(pg.corHex)}">${iconeAba(pg.icone)}</span>` : `<span class="nav-icon">${icone(pg.icone)}</span>`;
      return `<li class="${fixa && !fixa.ativo ? "desligada" : ""}" data-aba-id="${fmt.escape(pg.id)}" style="--marca: var(--s-${fmt.escape(pg.cor || "x")})">
          <span class="ordem-setas">
            <button type="button" class="btn ghost sm icon" data-mover="-1" aria-label="Subir ${fmt.escape(pg.rotulo)}" ${i === 0 ? "disabled" : ""}>${icone("acima")}</button>
            <button type="button" class="btn ghost sm icon" data-mover="1" aria-label="Descer ${fmt.escape(pg.rotulo)}" ${i === lista.length - 1 ? "disabled" : ""}>${icone("abaixo")}</button>
          </span>
          ${iconeHTML}
          ${fixa
            ? `<input type="text" class="aba-nome" data-nome-aba="${fixa.id}" value="${fmt.escape(fixa.rotulo)}" aria-label="Nome da aba ${fmt.escape(fixa.rotuloPadrao)}" ${fixa.ativo ? "" : "disabled"} />
               <input type="checkbox" class="switch" role="switch" data-toggle-aba="${fixa.id}" ${fixa.ativo ? "checked" : ""} aria-label="Mostrar a aba ${fmt.escape(fixa.rotuloPadrao)}" />`
            : `<span class="aba-nome fixo">${fmt.escape(pg.rotulo)}</span><a class="btn ghost sm" href="${fmt.escape(pg.href)}">Abrir</a>`}
        </li>`;
    }).join("");
  }

  /**
   * Pop-up do perfil: quem é, o que já cadastrou, ajuste de tema e acesso ao
   * backup. É o único lugar de configuração do painel — por isso concentra o
   * que antes ficava espalhado no rodapé da barra lateral.
   */
  function abrirPerfil(aba) {
    const abaInicial = ["sobre", "aparencia", "painel", "rotina", "conta"].includes(aba) ? aba : "sobre";
    const e = Store.estado();
    const p = e.perfil || {};

    const registros =
      e.financeiro.transacoes.length + e.financeiro.metas.length + e.financeiro.contas.length +
      e.financeiro.cartoes.length + e.financeiro.investimentos.length + e.faculdade.prazos.length +
      e.projetos.length + e.oportunidades.length + (e.pessoal?.compromissos?.length || 0);
    const disciplinas = e.faculdade.disciplinas.length;
    const resumos = e.faculdade.disciplinas.reduce((n, d) => n + (d.resumos?.length || 0), 0);
    const mesAgora = hojeISO().slice(0, 7);
    const lancMes = e.financeiro.transacoes.filter((t) => (t.data || "").startsWith(mesAgora)).length;
    const abasProprias = (e.pilares || []).length;
    const xp = experiencia();
    const urgentes = compromissos().filter((i) => {
      const d = diasAte(i.data);
      return d !== null && d >= 0 && d <= 7;
    }).length;

    const anos = idade(p.dataNascimento);
    const linha = [p.instituicao, p.cidade].filter(Boolean).join(", ");
    const ocupacao = Personalizacao.ocupacaoResumo();

    // Só entram na ficha as informações preenchidas — campo vazio não vira linha.
    const dados = [
      ["Nascimento", p.dataNascimento ? `${fmt.dataPorExtenso(p.dataNascimento)}${anos !== null ? `, ${anos} anos` : ""}` : ""],
      ["Como te chamar", p.apelido],
      ["Pronomes", p.pronomes],
      ["Telefone", p.telefone],
      ["E-mail", p.email],
      ["Cidade", p.cidade],
      ["Instituição", p.instituicao],
      ["Matrícula", p.matricula],
      ["Início do curso", p.ingresso],
    ].filter(([, v]) => v);

    const textos = [["Sobre", p.bio], ["Objetivos do momento", p.objetivos]].filter(([, v]) => v);
    const atual = tema.atual();
    const logado = typeof Sessao !== "undefined" && Sessao.ativo() && Sessao.logado();
    const iconeDaAba = (id) => PAGINAS.find((x) => x.id === id)?.icone || "";

    const html = `
      <div class="perfil-topo">
        <button class="avatar-botao" data-acao="foto" type="button" title="${p.foto ? "Trocar foto" : "Enviar foto"}" aria-label="${p.foto ? "Trocar foto" : "Enviar foto"}">
          ${avatarHTML(p, "avatar")}
          <span class="avatar-cam">${icone("camera")}</span>
        </button>
        <div style="min-width:0;">
          <div class="perfil-nome">${fmt.escape(p.nome || "Seu nome")}</div>
          <div class="perfil-linha">${fmt.escape(ocupacao || "Ocupação não informada")}</div>
          ${linha ? `<div class="perfil-linha muted">${fmt.escape(linha)}</div>` : ""}
          ${p.foto ? `<div class="perfil-foto-acoes"><button class="btn ghost sm" data-acao="tirar-foto" type="button" style="margin-left:-10px;">Remover foto</button></div>` : ""}
        </div>
        <input type="file" accept="image/*" class="hidden" data-arquivo-foto />
      </div>

      <div class="abas perfil-abas" role="tablist" aria-label="Seções do perfil">
        <button type="button" role="tab" data-aba-perfil="sobre">Sobre você</button>
        <button type="button" role="tab" data-aba-perfil="aparencia">Aparência</button>
        <button type="button" role="tab" data-aba-perfil="painel">Painel</button>
        <button type="button" role="tab" data-aba-perfil="rotina">Rotina e avisos</button>
        <button type="button" role="tab" data-aba-perfil="conta">Conta e dados</button>
      </div>

      <div class="perfil-painel" role="tabpanel" data-painel="sobre">
        <div class="perfil-stats seis">
          <div class="perfil-stat"><b>${urgentes}</b><span>compromissos nesta semana</span></div>
          <div class="perfil-stat"><b>${lancMes}</b><span>${lancMes === 1 ? "lançamento" : "lançamentos"} no mês</span></div>
          <div class="perfil-stat"><b>${disciplinas}</b><span>${disciplinas === 1 ? "disciplina" : "disciplinas"}</span></div>
          <div class="perfil-stat"><b>${resumos}</b><span>${resumos === 1 ? "resumo escrito" : "resumos escritos"}</span></div>
          <div class="perfil-stat"><b>${abasProprias}</b><span>${abasProprias === 1 ? "aba sua" : "abas suas"}</span></div>
          <div class="perfil-stat"><b>${registros}</b><span>registros ao todo</span></div>
        </div>

        ${dados.length ? `<dl class="ficha">${dados
          .map(([k, v]) => `<div><dt>${fmt.escape(k)}</dt><dd>${fmt.escape(v)}</dd></div>`)
          .join("")}</dl>` : `<p class="card-note" style="margin:0;">Nenhum dado pessoal preenchido ainda. Use “Editar perfil” para completar a sua ficha.</p>`}

        ${textos.map(([k, v]) => `
          <div class="perfil-texto">
            <div class="rotulo">${fmt.escape(k)}</div>
            <p>${fmt.escape(v)}</p>
          </div>`).join("")}
      </div>

      <div class="perfil-painel" role="tabpanel" data-painel="aparencia" hidden>
        <div class="ajuste">
          <div class="ajuste-titulo">Tema</div>
          <div class="temas tres" data-tema>
            ${tema.OPCOES.map((o) => `
              <button type="button" class="tema-opcao" data-valor="${o.valor}" aria-pressed="${String(o.valor === atual)}">
                <span class="tema-amostra ${o.valor === "light" ? "claro" : o.valor === "auto" ? "auto" : "escuro"}"><i></i><i></i></span>
                <span class="tema-nome">${o.rotulo}${icone("check")}</span>
              </button>`).join("")}
          </div>
          <p class="ajuste-texto" style="margin:10px 0 0;">Automático segue o claro e o escuro do sistema, do dia para a noite.</p>
        </div>

        <div class="ajuste">
          <div class="ajuste-titulo">Cor de destaque</div>
          <p class="ajuste-texto">O botão principal, o que está escolhido e os interruptores ligados.</p>
          <div class="destaques" data-pref="destaque">
            ${DESTAQUES.map(([v, r]) => `<button type="button" class="destaque-opcao" data-valor="${v}" data-destaque-amostra="${v}" aria-pressed="${String((xp.destaque || "osso") === v)}"><i></i><span>${r}</span></button>`).join("")}
          </div>
        </div>

        <div class="ajuste">
          ${linhaAjuste("Tamanho do texto", "Aumenta ou diminui tudo, textos e espaços.", segPref("tamanho", [["compacto", "Menor"], ["normal", "Normal"], ["grande", "Maior"]], xp.tamanho || "normal"))}
          ${linhaAjuste("Densidade", "Compacta mostra mais coisa por tela, com menos respiro.", segPref("densidade", [["confortavel", "Confortável"], ["compacta", "Compacta"]], xp.densidade || "confortavel"))}
          ${linhaAjuste("Fonte da leitura e dos títulos", "Serifada é a voz do Delfos; sem serifa deixa tudo na mesma letra.", segPref("voz", [["serifa", "Serifada"], ["sans", "Sem serifa"]], xp.voz || "serifa"))}
          ${linhaAjuste("Movimento", "Luz que segue o mouse, destaques que deslizam e a entrada das páginas.", switchPref("movimento", (xp.movimento || "completo") !== "reduzido"))}
        </div>
      </div>

      <div class="perfil-painel" role="tabpanel" data-painel="painel" hidden>
        <div class="ajuste">
          ${linhaAjuste("Ao abrir o Delfos", "A primeira página de cada visita.", `<select class="input sm" data-pref-select="paginaInicial">${paginas().map((pg) => `<option value="${fmt.escape(pg.id)}" ${pg.id === (xp.paginaInicial || "home") ? "selected" : ""}>${fmt.escape(pg.rotulo)}</option>`).join("")}</select>`)}
          ${linhaAjuste("Números na barra lateral", "Quantos compromissos da semana e contas a pagar cada aba tem.", switchPref("contadores", xp.contadores !== false))}
        </div>

        <div class="ajuste">
          <div class="ajuste-titulo">Abas e ordem</div>
          <p class="ajuste-texto">Use as setas para mudar a ordem da barra. Desligar só tira a aba da barra; nada do que está nela é apagado. O nome das fixas dá para trocar aqui mesmo.</p>
          <ul class="abas-lista" data-abas>${linhasAbas()}</ul>
        </div>

        <div class="ajuste">
          <div class="ajuste-titulo">A visão geral mostra</div>
          ${[["topo", "Saldo e próximo compromisso"], ["pilares", "Cartões das abas"], ["notas", "O que o Delfos notou"], ["agenda", "Próximos 30 dias"], ["insights", "Leitura da situação"]]
            .map(([k, r]) => linhaAjuste(r, "", `<input type="checkbox" class="switch" data-pref-home="${k}" ${xp.home?.[k] !== false ? "checked" : ""} aria-label="${fmt.escape(r)}" />`, true)).join("")}
        </div>

        <div class="ajuste">
          ${linhaAjuste("Atalhos de teclado", "N cria, / busca, Alt + número troca de aba.", `<button class="btn sm" type="button" data-acao="atalhos">Ver todos</button>`)}
        </div>
      </div>

      <div class="perfil-painel" role="tabpanel" data-painel="rotina" hidden>
        <div class="ajuste">
          ${linhaAjuste("A semana começa no", "Vale para o calendário.", segPref("semanaComeca", [["0", "Domingo"], ["1", "Segunda"]], String(xp.semanaComeca ?? 1)))}
        </div>
        <div class="ajuste">
          <div class="ajuste-titulo">Lembretes</div>
          <p class="ajuste-texto">O Delfos avisa quando uma data importante de qualquer aba se aproxima: prova, entrega, consulta, conta a pagar.</p>
          ${linhaAjuste("Avisar com antecedência de", "", `<div class="chips opcoes-chips" data-pref-lembrete="antecedencia">${[[0, "No dia"], [1, "1 dia"], [2, "2 dias"], [3, "3 dias"], [7, "1 semana"]].map(([v, r]) => `<button type="button" class="chip mini" data-valor="${v}" aria-pressed="${String(Number(xp.lembretes?.antecedencia ?? 2) === v)}">${r}</button>`).join("")}</div>`, false, true)}
          ${linhaAjuste("Resumo do dia ao abrir", "Na primeira visita do dia, uma janela com o que vence hoje e o que se aproxima.", `<input type="checkbox" class="switch" data-pref-lembrete-sw="resumoDoDia" ${xp.lembretes?.resumoDoDia !== false ? "checked" : ""} aria-label="Resumo do dia ao abrir" />`)}
          ${linhaAjuste("Avisos do navegador", typeof Notification === "undefined" ? "Este navegador não mostra avisos." : Notification.permission === "denied" ? "Bloqueados nas configurações do navegador para este site." : "Uma notificação do sistema quando o Delfos estiver aberto e algo vencer.", `<input type="checkbox" class="switch" data-pref-lembrete-sw="navegador" ${xp.lembretes?.navegador ? "checked" : ""} ${typeof Notification === "undefined" || Notification.permission === "denied" ? "disabled" : ""} aria-label="Avisos do navegador" />`)}
        </div>
      </div>

      <div class="perfil-painel" role="tabpanel" data-painel="conta" hidden>
        <div class="menu-acoes">
          ${typeof Nuvem !== "undefined" ? `
          <button class="menu-acao" data-acao="nuvem" type="button">
            ${icone("nuvem")}
            <span class="grow"><span class="t">Conta e sincronização</span><span class="d">${fmt.escape(Nuvem.situacao().texto)}</span></span>
            ${icone("direita", "seta")}
          </button>` : ""}
          <button class="menu-acao" data-acao="backup" type="button">
            ${icone("exportar")}
            <span class="grow"><span class="t">Backup e dados</span><span class="d" data-uso>Calculando o que está guardado…</span></span>
            ${icone("direita", "seta")}
          </button>
          <button class="menu-acao" data-acao="reconfigurar" type="button">
            ${icone("refazer")}
            <span class="grow"><span class="t">Refazer a configuração inicial</span><span class="d">Volta ao assistente de boas-vindas. Nada é apagado.</span></span>
            ${icone("direita", "seta")}
          </button>
          ${logado ? `
          <button class="menu-acao perigo" data-acao="sair" type="button">
            ${icone("sair")}
            <span class="grow"><span class="t">Sair da conta</span><span class="d">Os dados deste navegador são apagados; continuam na sua conta.</span></span>
          </button>` : ""}
        </div>
      </div>

      <div class="modal-foot" style="padding-top:18px;">
        <button class="btn" data-acao="fechar" type="button">Fechar</button>
        <button class="btn primary" data-acao="editar" type="button">${icone("editar")}Editar perfil</button>
      </div>`;

    abrirModal(html, {
      classe: "perfil",
      aoMontar(modal, fechar) {
        const entrada = modal.querySelector("[data-arquivo-foto]");
        let abaAtual = abaInicial;

        // Abas internas: mostram um painel por vez, sem fechar o cartão.
        const mostrarAba = (id) => {
          abaAtual = id;
          modal.querySelectorAll("[data-aba-perfil]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.abaPerfil === id)));
          modal.querySelectorAll("[data-painel]").forEach((pn) => { pn.hidden = pn.dataset.painel !== id; });
        };
        modal.querySelector(".perfil-abas").addEventListener("click", (ev) => {
          const b = ev.target.closest("[data-aba-perfil]");
          if (b) mostrarAba(b.dataset.abaPerfil);
        });
        mostrarAba(abaInicial);

        modal.querySelector('[data-acao="foto"]').addEventListener("click", () => entrada.click());

        entrada.addEventListener("change", async (ev) => {
          const f = ev.target.files[0];
          if (!f) return;
          try {
            const foto = await redimensionarFoto(f);
            Store.definirPerfil({ foto });
            fechar(null);
            montarLayout(paginaAtiva, opcoesAtivas);
            toast("Foto atualizada.");
            abrirPerfil(abaAtual);
          } catch (err) {
            toast(err.message);
          }
        });

        modal.querySelector('[data-acao="tirar-foto"]')?.addEventListener("click", () => {
          Store.definirPerfil({ foto: "" });
          fechar(null);
          montarLayout(paginaAtiva, opcoesAtivas);
          toast("Foto removida.");
          abrirPerfil(abaAtual);
        });

        // Tema: troca na hora, sem fechar o cartão.
        modal.querySelector("[data-tema]").addEventListener("click", (ev) => {
          const b = ev.target.closest("[data-valor]");
          if (!b) return;
          tema.definir(b.dataset.valor);
          modal.querySelectorAll("[data-tema] [data-valor]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        });

        modal.querySelector('[data-acao="backup"]').addEventListener("click", () => {
          fechar(null);
          abrirBackup();
        });

        modal.querySelector('[data-acao="nuvem"]')?.addEventListener("click", () => {
          fechar(null);
          Nuvem.abrirPainel();
        });

        modal.querySelector('[data-acao="sair"]')?.addEventListener("click", () => {
          fechar(null);
          Nuvem.sairDaConta();
        });

        modal.querySelector('[data-acao="reconfigurar"]').addEventListener("click", () => {
          fechar(null);
          location.href = "bemvindo.html";
        });

        /* ---- Aparência, painel e rotina: tudo vale na hora, sem "Salvar". ---- */
        const salvarXp = (patch) => { Store.definirPreferencias({ experiencia: patch }); aplicarAparencia(); };
        modal.querySelectorAll("[data-pref]").forEach((grupo) => {
          grupo.addEventListener("click", (ev) => {
            const b = ev.target.closest("[data-valor]");
            if (!b) return;
            grupo.querySelectorAll("[data-valor]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            const oculto = grupo.querySelector("input");
            if (oculto) oculto.value = b.dataset.valor;
            const chave = grupo.dataset.pref;
            salvarXp({ [chave]: chave === "semanaComeca" ? Number(b.dataset.valor) : b.dataset.valor });
          });
        });
        modal.querySelectorAll("[data-pref-switch]").forEach((sw) => sw.addEventListener("change", () => {
          const chave = sw.dataset.prefSwitch;
          if (chave === "movimento") salvarXp({ movimento: sw.checked ? "completo" : "reduzido" });
          else salvarXp({ [chave]: sw.checked });
        }));
        modal.querySelector('[data-pref-select="paginaInicial"]')?.addEventListener("change", (ev) => salvarXp({ paginaInicial: ev.target.value }));
        modal.querySelectorAll("[data-pref-home]").forEach((sw) => sw.addEventListener("change", () => {
          Store.definirPreferencias({ experiencia: { home: { [sw.dataset.prefHome]: sw.checked } } });
        }));
        modal.querySelector('[data-pref-lembrete="antecedencia"]')?.addEventListener("click", (ev) => {
          const b = ev.target.closest("[data-valor]");
          if (!b) return;
          b.parentElement.querySelectorAll("[data-valor]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          Store.definirPreferencias({ experiencia: { lembretes: { antecedencia: Number(b.dataset.valor) } } });
        });
        modal.querySelectorAll("[data-pref-lembrete-sw]").forEach((sw) => sw.addEventListener("change", async () => {
          const chave = sw.dataset.prefLembreteSw;
          if (chave === "navegador" && sw.checked && typeof Notification !== "undefined" && Notification.permission !== "granted") {
            const r = await Notification.requestPermission().catch(() => "denied");
            if (r !== "granted") {
              sw.checked = false;
              toast("O navegador não liberou os avisos. Dá para liberar nas configurações do site.");
              return;
            }
          }
          Store.definirPreferencias({ experiencia: { lembretes: { [chave]: sw.checked } } });
        }));
        modal.querySelector('[data-acao="atalhos"]')?.addEventListener("click", () => { fechar(null); abrirAtalhos(); });

        // Ordem das abas: as setas trocam a aba de lugar com a vizinha.
        modal.querySelector("[data-abas]").addEventListener("click", (ev) => {
          const b = ev.target.closest("[data-mover]");
          if (!b) return;
          const ul = modal.querySelector("[data-abas]");
          const ids = [...ul.querySelectorAll("li[data-aba-id]")].map((li) => li.dataset.abaId);
          const i = ids.indexOf(b.closest("li").dataset.abaId);
          const j = i + Number(b.dataset.mover);
          if (i < 0 || j < 0 || j >= ids.length) return;
          [ids[i], ids[j]] = [ids[j], ids[i]];
          salvarXp({ ordemAbas: ids });
          ul.innerHTML = linhasAbas();
          ul.querySelector(`li[data-aba-id="${CSS.escape(ids[j])}"] [data-mover="${b.dataset.mover}"]`)?.focus();
          montarLayout(paginaAtiva, opcoesAtivas);
        });

        // Abas fixas: liga/desliga e renomeia na hora, sem precisar de "Salvar".
        modal.querySelector("[data-abas]").addEventListener("change", (ev) => {
          const chk = ev.target.closest("[data-toggle-aba]");
          if (!chk) return;
          const id = chk.dataset.toggleAba;
          Store.definirPreferencias({ abasFixas: { [id]: { ativo: chk.checked } } });
          modal.querySelector(`[data-nome-aba="${id}"]`).disabled = !chk.checked;
          chk.closest("li").classList.toggle("desligada", !chk.checked);
          montarLayout(paginaAtiva, opcoesAtivas);
        });
        modal.querySelector("[data-abas]").addEventListener("input", (ev) => {
          const inp = ev.target.closest("[data-nome-aba]");
          if (!inp) return;
          const id = inp.dataset.nomeAba;
          const padrao = Personalizacao.ROTULOS_PADRAO[id];
          Store.definirPreferencias({ abasFixas: { [id]: { rotulo: inp.value.trim() === padrao ? "" : inp.value } } });
          montarLayout(paginaAtiva, opcoesAtivas);
        });

        modal.querySelector('[data-acao="editar"]').addEventListener("click", async () => {
          fechar(null);
          const v = await formulario({
            titulo: "Editar perfil",
            descricao: "Aparece na barra lateral e serve de ficha para o painel te conhecer.",
            valores: p,
            campos: camposPerfil(),
            largo: true,
          });
          if (!v) return abrirPerfil(abaAtual);
          Store.definirPerfil(v);
          montarLayout(paginaAtiva, opcoesAtivas);
          toast("Perfil atualizado.");
          abrirPerfil("sobre");
        });

        modal.querySelector('[data-acao="fechar"]').addEventListener("click", () => fechar(null));

        // O tamanho dos anexos vem do IndexedDB, então chega depois da tela.
        const alvo = modal.querySelector("[data-uso]");
        if (typeof Arquivos !== "undefined" && Arquivos.disponivel) {
          Arquivos.uso().then((u) => {
            alvo.textContent = u.quantidade
              ? `Exportar ou importar tudo. ${u.quantidade} ${u.quantidade === 1 ? "anexo guardado" : "anexos guardados"}, ${Arquivos.tamanhoLegivel(u.bytes)} neste navegador.`
              : "Exportar ou importar tudo o que está cadastrado, num arquivo só.";
          }).catch(() => { alvo.textContent = "Exportar ou importar tudo o que está cadastrado."; });
        } else {
          alvo.textContent = "Exportar ou importar tudo o que está cadastrado.";
        }
      },
    });
  }

  /* --------------------------- Notas da disciplina ------------------------- */

  /** Média ponderada das avaliações que já têm nota lançada. */
  function mediaDisciplina(d) {
    const comNota = (d.avaliacoes || []).filter(
      (a) => a.nota !== null && a.nota !== undefined && a.nota !== "" && !Number.isNaN(Number(a.nota))
    );
    if (!comNota.length) return null;
    const pesoTotal = comNota.reduce((s, a) => s + (Number(a.peso) || 1), 0);
    const soma = comNota.reduce((s, a) => s + Number(a.nota) * (Number(a.peso) || 1), 0);
    return { media: soma / pesoTotal, quantidade: comNota.length };
  }

  /**
   * Quanto falta: a nota que as avaliações ainda sem nota precisam ter, em
   * média (ponderada pelo peso), para a disciplina fechar na média mínima
   * (`d.mediaMinima`, 7 se não informada). Escala de 0 a 10.
   * Devolve null quando não há o que calcular (nenhuma avaliação cadastrada).
   */
  function notaNecessaria(d) {
    // Mínima da disciplina; senão a da faculdade (pergunta da aba); senão 7.
    const daFaculdade = Number(Store.estado().preferencias?.faculdade?.mediaMinima);
    const minima = Number(d.mediaMinima) > 0 ? Number(d.mediaMinima) : daFaculdade > 0 ? daFaculdade : 7;
    const avs = (d.avaliacoes || []).filter((a) => !(Number(a.peso) < 0));
    if (!avs.length) return null;
    const temNota = (a) => a.nota !== null && a.nota !== undefined && a.nota !== "" && !Number.isNaN(Number(a.nota));
    const peso = (a) => Number(a.peso) || 1;
    const feitas = avs.filter(temNota);
    const faltam = avs.filter((a) => !temNota(a));
    const pesoTotal = avs.reduce((s, a) => s + peso(a), 0);
    const pontos = feitas.reduce((s, a) => s + Number(a.nota) * peso(a), 0);
    const pesoFaltando = faltam.reduce((s, a) => s + peso(a), 0);

    if (!pesoFaltando) {
      const final = pontos / pesoTotal;
      return { minima, final, situacao: final >= minima ? "aprovado" : "abaixo" };
    }
    const precisa = (minima * pesoTotal - pontos) / pesoFaltando;
    return {
      minima,
      precisa: Math.max(0, precisa),
      quantasFaltam: faltam.length,
      situacao: precisa <= 0 ? "garantida" : precisa > 10 ? "impossivel" : "possivel",
    };
  }

  /** Próxima avaliação ainda sem nota. */
  function proximaAvaliacao(d) {
    return (d.avaliacoes || [])
      .filter((a) => a.data && (a.nota === null || a.nota === undefined || a.nota === ""))
      .sort((a, b) => a.data.localeCompare(b.data))[0] || null;
  }

  /* -------------------------- Números de um projeto ------------------------ */

  const somaValores = (lista) => (lista || []).reduce((s, x) => s + (Number(x.valor) || 0), 0);

  /**
   * Tudo que se deduz de um projeto. Nada disso fica guardado no estado: o
   * faturamento sai sempre da lista de recebimentos e o custo da lista de
   * custos, para os números não dessincronizarem dos lançamentos.
   */
  function resumoProjeto(p) {
    const passos = p.passos || [];
    const feitos = passos.filter((s) => s.feito).length;
    const faturado = somaValores(p.recebimentos);
    const custoTotal = somaValores(p.custos);
    const encerrado = p.status === "concluído" || p.status === "arquivado";

    return {
      faturado,
      custoTotal,
      lucro: faturado - custoTotal,
      // Quanto do previsto por mês já entrou — só faz sentido com estimativa.
      metaMensal: Number(p.rendaEstimada) || 0,
      passos: {
        feitos,
        total: passos.length,
        percentual: passos.length ? (feitos / passos.length) * 100 : 0,
      },
      encerrado,
      urgencia: p.deadline && !encerrado ? urgencia(p.deadline) : null,
    };
  }

  /* --------------------------------- Tema --------------------------------- */

  const tema = {
    KEY: "organizador.tema",
    OPCOES: [
      { valor: "dark", rotulo: "Escuro" },
      { valor: "light", rotulo: "Claro" },
      { valor: "auto", rotulo: "Automático" },
    ],
    // O padrão é a noite: sem escolha gravada, o painel abre escuro.
    atual() {
      try { return localStorage.getItem(tema.KEY) || "dark"; } catch { return "dark"; }
    },
    /** O tema de fato na tela: "auto" segue o claro/escuro do sistema. */
    aplicado() {
      const v = tema.atual();
      if (v !== "auto") return v;
      return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    },
    definir(v) {
      try { localStorage.setItem(tema.KEY, v); } catch { /* modo anônimo */ }
      document.documentElement.setAttribute("data-theme", tema.aplicado());
    },
    iniciar() {
      document.documentElement.setAttribute("data-theme", tema.aplicado());
      if (!tema.ouvindo && typeof matchMedia === "function") {
        tema.ouvindo = true;
        matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => {
          if (tema.atual() === "auto") document.documentElement.setAttribute("data-theme", tema.aplicado());
        });
      }
    },
  };

  /**
   * Preferências de aparência (perfil → Aparência) viram atributos no <html>;
   * o CSS faz o resto (seção "Preferências de aparência" do theme.css).
   */
  function experiencia() {
    try { return Store.estado().preferencias?.experiencia || {}; } catch { return {}; }
  }
  function aplicarAparencia() {
    const xp = experiencia();
    const h = document.documentElement;
    h.dataset.tamanho = xp.tamanho || "normal";
    h.dataset.densidade = xp.densidade || "confortavel";
    h.dataset.destaque = xp.destaque || "osso";
    h.dataset.movimento = xp.movimento || "completo";
    h.dataset.voz = xp.voz || "serifa";
    h.dataset.contadores = xp.contadores === false ? "nao" : "sim";
  }

  /* -------------------------------- Toast --------------------------------- */

  function toast(mensagem, { acaoRotulo, aoAcionar, duracao = 3200 } = {}) {
    let caixa = document.querySelector(".toasts");
    if (!caixa) {
      caixa = document.createElement("div");
      caixa.className = "toasts";
      document.body.appendChild(caixa);
    }
    // No máximo dois avisos ao mesmo tempo — uma pilha maior cobre a tela.
    while (caixa.children.length >= 2) caixa.firstElementChild.remove();

    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span>${fmt.escape(mensagem)}</span>`;
    if (acaoRotulo) {
      const b = document.createElement("button");
      b.textContent = acaoRotulo;
      b.addEventListener("click", () => { aoAcionar?.(); el.remove(); });
      el.appendChild(b);
    }
    caixa.appendChild(el);
    setTimeout(() => el.remove(), duracao);
  }

  /* ------------------------- Modal / formulários --------------------------- */

  function abrirModal(conteudoHTML, { aoMontar, aoFechar, classe = "" } = {}) {
    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    backdrop.innerHTML = `<div class="modal ${classe}" role="dialog" aria-modal="true">${conteudoHTML}</div>`;
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";

    const fechar = (resultado) => {
      document.body.style.overflow = "";
      backdrop.remove();
      document.removeEventListener("keydown", onKey);
      aoFechar?.(resultado);
    };
    const onKey = (e) => { if (e.key === "Escape") fechar(null); };

    backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) fechar(null); });
    document.addEventListener("keydown", onKey);
    aoMontar?.(backdrop.querySelector(".modal"), fechar);
    return fechar;
  }

  /* ------------------------------ Formulários ------------------------------ */

  /** "1.234,56", "45.9", "R$ 12", "1.200" → número (ou null). */
  function lerDinheiro(bruto) {
    let s = String(bruto ?? "").replace(/r\$|\s/gi, "");
    if (!s) return null;
    let negativo = false;
    if (s.startsWith("-")) { negativo = true; s = s.slice(1); }
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return negativo ? -n : n;
  }

  /**
   * Valor digitado num campo de dinheiro: aceita uma conta curta ("45+12,90",
   * "120-15") para quem soma a nota de cabeça. Só + e −, nada de eval.
   */
  function avaliarDinheiro(bruto) {
    const s = String(bruto ?? "").trim();
    if (!s) return null;
    if (!/[+]|\d\s*-\s*\d/.test(s)) return lerDinheiro(s);
    const partes = s.replace(/\s/g, "").match(/[+-]?[^+-]+/g) || [];
    let total = 0;
    for (const p of partes) {
      const n = lerDinheiro(p.replace(/^\+/, ""));
      if (n === null) return null;
      total += n;
    }
    return Math.round(total * 100) / 100;
  }

  const formatarDinheiroCampo = (v) => (v === null || v === "" || v === undefined || Number.isNaN(Number(v)) ? "" : fmt.decimal(Number(v), 2));

  /** Ícone e cor do cabeçalho de um formulário: os da aba em que a pessoa está. */
  function marcaDaPagina() {
    const grupo = paginaAtiva === "pilar" ? `pilar:${opcoesAtivas?.idAtivo || ""}` : GRUPO_DE[paginaAtiva] || paginaAtiva;
    const p = paginas().find((x) => x.id === grupo);
    if (!p) return null;
    return { icone: p.corHex ? iconeAba(p.icone) : icone(p.icone), cor: p.corHex || (p.cor ? `var(--s-${p.cor})` : "var(--texto-2)") };
  }

  // Tipos que cabem em meia linha; os demais ocupam a linha toda.
  const CURTOS = new Set(["date", "number", "dinheiro", "select", "time"]);

  /** Decide quais campos ficam lado a lado: só pares vizinhos curtos; um curto sozinho ocupa a linha. */
  function larguras(campos) {
    const quer = campos.map((c) => (c.inteira ? false : c.meia || (CURTOS.has(c.tipo) && !c.destaque && !chipsDoSelect(c))));
    const saida = campos.map(() => "inteira");
    for (let i = 0; i < campos.length; i++) {
      if (quer[i] && quer[i + 1]) { saida[i] = "meia"; saida[i + 1] = "meia"; i++; }
    }
    return saida;
  }

  /** Um select com poucas opções curtas vira pílulas: dá para ver tudo e escolher com um toque. */
  function chipsDoSelect(c) {
    if (c.tipo !== "select" || c.lista || !Array.isArray(c.opcoes)) return false;
    if (c.chips) return true;
    const rots = c.opcoes.map((o) => (typeof o === "string" ? o : o.rotulo));
    return rots.length >= 2 && rots.length <= 5 && rots.every((r) => String(r).length <= 18);
  }

  function dataPorExtensoCurta(iso) {
    if (!iso) return "";
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    const dias = diasAte(iso);
    const quando = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : dias === -1 ? "ontem"
      : dias > 1 && dias < 7 ? `em ${dias} dias` : dias < -1 && dias > -7 ? `há ${-dias} dias` : "";
    const txt = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    return quando ? `${txt}, ${quando}` : txt;
  }

  function isoMaisDias(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  /**
   * Formulário em modal.
   * campos: [{ nome, rotulo, tipo, opcoes, obrigatorio, dica, valorPadrao, placeholder,
   *            meia, inteira, destaque (dinheiro grande), chips/lista (select), atalhos (date) }]
   * tipos: text | textarea | number | dinheiro | date | select | segmento |
   *        buscaSelect | simNao | anexos | secao (só um título divisor, não guarda valor)
   * O cabeçalho leva o ícone da aba em que a pessoa está (ou `icone`/`cor`).
   * Campos curtos vizinhos ficam lado a lado; selects com poucas opções
   * viram pílulas; datas ganham atalhos (ontem, hoje, amanhã…) e o dia por
   * extenso; dinheiro aceita "45+12,90".
   * Resolve com um objeto de valores, ou null se cancelado.
   */
  function formulario({ titulo, descricao, campos, valores = {}, rotuloConfirmar = "Salvar", largo = false, rotuloExcluir = "", aoExcluir = null, icone: iconeHTML = null, cor = null }) {
    return new Promise((resolve) => {
      const marca = iconeHTML ? { icone: iconeHTML, cor: cor || "var(--texto-2)" } : marcaDaPagina();
      const larg = larguras(campos);
      const html = `
        <div class="modal-head com-marca">
          ${marca ? `<span class="modal-ic" style="--ic-cor:${fmt.escape(marca.cor)}">${marca.icone}</span>` : ""}
          <div class="modal-head-texto">
            <h2 class="modal-title">${fmt.escape(titulo)}</h2>
            ${descricao ? `<p class="modal-desc">${fmt.escape(descricao)}</p>` : ""}
          </div>
        </div>
        <form class="modal-body form-grade" novalidate>
          ${campos.map((c, i) => campoHTML(c, valores[c.nome] ?? c.valorPadrao ?? "", larg[i])).join("")}
        </form>
        <div class="modal-foot">
          ${aoExcluir ? `<button class="btn danger" data-acao="excluir" type="button">${fmt.escape(rotuloExcluir || "Excluir")}</button>` : `<span class="modal-atalho">Enter salva, Esc fecha</span>`}
          <span class="modal-foot-espaco"></span>
          <button class="btn" data-acao="cancelar" type="button">Cancelar</button>
          <button class="btn primary" data-acao="confirmar" type="button">${fmt.escape(rotuloConfirmar)}</button>
        </div>`;

      abrirModal(html, {
        classe: `formulario ${largo ? "wide" : ""}`,
        aoMontar(modal, fechar) {
          const form = modal.querySelector("form");

          // Botões de segmento e pílulas de opção (escolha única em linha)
          modal.querySelectorAll(".seg, .opcoes-chips").forEach((grupo) => {
            grupo.addEventListener("click", (e) => {
              const b = e.target.closest("button[data-valor]");
              if (!b) return;
              grupo.querySelectorAll("button[data-valor]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
              const oculto = grupo.querySelector("input");
              oculto.value = b.dataset.valor;
              oculto.dispatchEvent(new Event("change", { bubbles: true }));
            });
          });

          // Dinheiro: formata ao sair do campo e mostra o resultado de uma conta.
          modal.querySelectorAll("[data-dinheiro]").forEach((inp) => {
            const conta = inp.closest(".field").querySelector("[data-conta]");
            const atualizar = () => {
              const temConta = /[+]|\d\s*-\s*\d/.test(inp.value);
              const v = avaliarDinheiro(inp.value);
              if (conta) conta.textContent = temConta && v !== null ? `= ${fmt.moeda(v)}` : "";
            };
            inp.addEventListener("input", () => { inp.value = inp.value.replace(/[^\d.,+\-\s]/g, ""); atualizar(); });
            inp.addEventListener("blur", () => {
              const v = avaliarDinheiro(inp.value);
              if (v !== null) inp.value = formatarDinheiroCampo(v);
              atualizar();
            });
          });

          // Datas: atalhos e o dia por extenso ao lado do rótulo.
          modal.querySelectorAll("[data-campo-data]").forEach((campo) => {
            const inp = campo.querySelector('input[type="date"]');
            const ext = campo.closest(".field").querySelector("[data-extenso]");
            const sinc = () => {
              ext.textContent = dataPorExtensoCurta(inp.value);
              campo.querySelectorAll("[data-dias]").forEach((b) => b.setAttribute("aria-pressed", String(inp.value === isoMaisDias(Number(b.dataset.dias)))));
            };
            campo.addEventListener("click", (e) => {
              const b = e.target.closest("[data-dias]");
              if (!b) return;
              inp.value = isoMaisDias(Number(b.dataset.dias));
              inp.dispatchEvent(new Event("change", { bubbles: true }));
            });
            inp.addEventListener("change", sinc);
            inp.addEventListener("input", sinc);
            sinc();
          });

          // Texto longo cresce com o que se escreve.
          modal.querySelectorAll("textarea[data-cresce]").forEach((ta) => {
            const ajustar = () => { ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight + 2, 360)}px`; };
            ta.addEventListener("input", ajustar);
            requestAnimationFrame(ajustar);
          });

          // Campos de anexo: cada um devolve a função que grava seus arquivos.
          const gravarAnexos = {};
          campos.filter((c) => c.tipo === "anexos").forEach((c) => {
            gravarAnexos[c.nome] = ligarAnexos(modal, c, valores[c.nome] ?? c.valorPadrao ?? []);
          });

          // buscaSelect: escolher uma sugestão do <datalist> preenche o texto
          // com o rótulo inteiro ("Grupo — Nome"), então isso sempre resolve.
          // Mas digitar só o nome do exercício (sem escolher a sugestão) e
          // aquele texto achar exatamente uma opção também resolve — só fica
          // vazio se não achar nada ou achar mais de uma (ambíguo).
          campos.filter((c) => c.tipo === "buscaSelect").forEach((c) => {
            const busca = form.querySelector(`[name="${c.nome}__busca"]`);
            const escondido = form.querySelector(`[name="${c.nome}"]`);
            const opcoes = c.opcoes || [];
            busca.addEventListener("input", () => {
              const texto = busca.value.trim().toLowerCase();
              let bate = texto ? opcoes.find((o) => o.rotulo.toLowerCase() === texto) : null;
              if (!bate && texto) {
                const candidatos = opcoes.filter((o) => o.rotulo.toLowerCase().includes(texto));
                if (candidatos.length === 1) bate = candidatos[0];
              }
              escondido.value = bate ? bate.valor : "";
            });
          });

          const primeiro = form.querySelector("input:not([type=hidden]):not([type=file]):not([type=checkbox]), select, textarea");
          primeiro?.focus();
          if (primeiro?.select && !primeiro.value) setTimeout(() => primeiro.select(), 0);

          const btnOk = modal.querySelector('[data-acao="confirmar"]');
          // Excluir fecha sem salvar e deixa a exclusão (com o desfazer dela) para quem chamou.
          modal.querySelector('[data-acao="excluir"]')?.addEventListener("click", () => { fechar(null); aoExcluir(); });

          const confirmar = async () => {
            const saida = {};
            let primeiroErro = null;
            modal.querySelectorAll(".field .err").forEach((n) => n.remove());
            modal.querySelectorAll(".field.tem-erro").forEach((n) => n.classList.remove("tem-erro"));

            campos.forEach((c) => {
              if (c.tipo === "secao") return; // divisor visual, não guarda valor
              if (c.tipo === "anexos") return; // tratado depois, é assíncrono
              const input = form.querySelector(`[name="${c.nome}"]`);
              if (c.tipo === "simNao") { saida[c.nome] = input.checked; return; }
              let v = input.value;
              let invalido = false;
              if (c.tipo === "dinheiro") {
                v = avaliarDinheiro(v);
                invalido = String(input.value).trim() !== "" && v === null;
              } else if (c.tipo === "number") {
                v = v === "" ? null : Number(String(v).replace(",", "."));
                if (v !== null && Number.isNaN(v)) v = null;
              } else {
                v = String(v).trim();
              }
              const vazio = v === "" || v === null;
              if ((c.obrigatorio && vazio) || invalido) {
                const campo = input.closest(".field");
                const span = document.createElement("span");
                span.className = "err";
                span.textContent = invalido ? "Valor não reconhecido. Use, por exemplo, 45,90." : "Preencha este campo.";
                campo.appendChild(span);
                campo.classList.add("tem-erro");
                primeiroErro ||= campo.querySelector("input:not([type=hidden]), select, textarea, button");
              }
              saida[c.nome] = v;
            });

            if (primeiroErro) { primeiroErro.focus?.(); return; }

            const nomes = Object.keys(gravarAnexos);
            if (nomes.length) {
              // Gravar no IndexedDB leva um instante: trava o botão para não
              // salvar duas vezes e deixa claro que algo está acontecendo.
              btnOk.disabled = true;
              btnOk.textContent = "Salvando…";
              try {
                for (const nome of nomes) saida[nome] = await gravarAnexos[nome]();
              } catch (err) {
                btnOk.disabled = false;
                btnOk.textContent = rotuloConfirmar;
                return toast(`Não foi possível salvar os anexos: ${err.message}`);
              }
            }

            fechar(saida);
          };

          btnOk.addEventListener("click", confirmar);
          modal.querySelector('[data-acao="cancelar"]').addEventListener("click", () => fechar(null));
          form.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "BUTTON") { e.preventDefault(); confirmar(); }
          });
        },
        aoFechar: resolve,
      });
    });
  }

  function campoHTML(c, valor, largura = "inteira") {
    // Divisor com título: só organiza formulários longos, não guarda valor.
    if (c.tipo === "secao") return `<div class="form-secao">${fmt.escape(c.rotulo)}</div>`;

    const v = fmt.escape(valor);
    const id = `f-${c.nome}`;
    let controle;
    let extraRotulo = "";
    let classe = "";

    switch (c.tipo) {
      case "textarea":
        controle = `<textarea id="${id}" name="${c.nome}" data-cresce placeholder="${fmt.escape(c.placeholder || "")}">${v}</textarea>`;
        break;
      case "select": {
        const opcoes = (c.opcoes || []).map((o) => (typeof o === "string" ? { valor: o, rotulo: o } : o));
        if (chipsDoSelect(c)) {
          const atual = valor !== "" && valor !== null && valor !== undefined ? valor : opcoes[0]?.valor ?? "";
          controle = `<div class="chips opcoes-chips" role="group" aria-label="${fmt.escape(c.rotulo)}">
              <input type="hidden" name="${c.nome}" value="${fmt.escape(atual)}" />
              ${opcoes.map((o) => `<button type="button" class="chip" data-valor="${fmt.escape(o.valor)}" aria-pressed="${String(o.valor) === String(atual)}">${fmt.escape(o.rotulo || "Nenhum")}</button>`).join("")}
            </div>`;
        } else {
          controle = `<select id="${id}" name="${c.nome}">${opcoes
            .map((o) => `<option value="${fmt.escape(o.valor)}" ${String(o.valor) === String(valor) ? "selected" : ""}>${fmt.escape(o.rotulo)}</option>`)
            .join("")}</select>`;
        }
        break;
      }
      // Como "select", mas com um catálogo grande demais pra rolar numa lista
      // só — digitar filtra as opções (<datalist>, sem biblioteca nenhuma). O
      // texto visível e o valor guardado são coisas diferentes: um campo
      // escondido junto é quem carrega o valor de verdade, e o script em
      // formulario() é quem os mantém em sincronia.
      case "buscaSelect": {
        const opcoes = c.opcoes || [];
        const rotuloAtual = opcoes.find((o) => String(o.valor) === String(valor))?.rotulo || "";
        const listId = `dl-${c.nome}-${Math.random().toString(36).slice(2, 8)}`;
        controle = `
          <input type="text" id="${id}" list="${listId}" name="${c.nome}__busca" value="${fmt.escape(rotuloAtual)}"
                 placeholder="${fmt.escape(c.placeholder || "Digite para buscar…")}" autocomplete="off" />
          <datalist id="${listId}">${opcoes.map((o) => `<option value="${fmt.escape(o.rotulo)}"></option>`).join("")}</datalist>
          <input type="hidden" name="${c.nome}" value="${fmt.escape(valor)}" />`;
        break;
      }
      case "segmento": {
        const atual = valor || c.opcoes[0].valor;
        controle = `<div class="seg">
            <input type="hidden" name="${c.nome}" value="${fmt.escape(atual)}" />
            ${c.opcoes.map((o) => `<button type="button" data-valor="${fmt.escape(o.valor)}" aria-pressed="${String(o.valor) === String(atual)}">${fmt.escape(o.rotulo)}</button>`).join("")}
          </div>`;
        break;
      }
      case "anexos": {
        // O <input file> fica escondido: quem recebe o clique e o arrastar é a
        // área pontilhada, que dá um alvo bem maior.
        const lista = Array.isArray(valor) ? valor : [];
        controle = `<div class="anexos-campo" data-anexos="${c.nome}">
            <input type="hidden" name="${c.nome}" value="" />
            <input type="file" multiple class="hidden" data-entrada />
            <div class="anexos" data-lista>${lista.map(anexoLinhaHTML).join("")}</div>
            <div class="dropzone" data-zona tabindex="0" role="button" aria-label="Anexar documento">
              <span class="dz-icone">${icone("anexar")}</span>
              <strong>Anexar documento</strong>
              <span>Clique para escolher ou arraste os arquivos até aqui</span>
              ${typeof Arquivos !== "undefined" ? `<span>PDF, slides, fotos, até ${Arquivos.LIMITE_MB} MB cada</span>` : ""}
            </div>
          </div>`;
        break;
      }
      case "date": {
        const atalhos = c.atalhos === false ? [] : c.atalhos || [[-1, "Ontem"], [0, "Hoje"], [1, "Amanhã"], [7, "Em 1 semana"]];
        classe = "campo-data";
        extraRotulo = `<span class="data-extenso" data-extenso></span>`;
        controle = `<div class="data-linha" data-campo-data>
            <input type="date" id="${id}" name="${c.nome}" value="${v}" />
            ${atalhos.length ? `<div class="datas-rapidas">${atalhos.map(([n, r]) => `<button type="button" class="chip mini" data-dias="${n}">${fmt.escape(r)}</button>`).join("")}</div>` : ""}
          </div>`;
        break;
      }
      case "time":
        controle = `<input type="time" id="${id}" name="${c.nome}" value="${v}" />`;
        break;
      case "simNao":
        controle = `<label class="campo-simnao"><input type="checkbox" class="check" name="${c.nome}" ${valor ? "checked" : ""} /> ${fmt.escape(c.rotuloMarcado || "Sim")}</label>`;
        break;
      case "dinheiro":
        classe = c.destaque ? "campo-dinheiro-destaque" : "";
        controle = `<div class="campo-dinheiro ${c.destaque ? "destaque" : ""}">
            <span class="prefixo">R$</span>
            <input type="text" inputmode="decimal" autocomplete="off" id="${id}" name="${c.nome}" data-dinheiro
                   value="${fmt.escape(formatarDinheiroCampo(valor))}" placeholder="${fmt.escape(c.placeholder || "0,00")}" />
            <span class="conta-resultado" data-conta aria-live="polite"></span>
          </div>`;
        break;
      case "number":
        controle = `<input type="number" id="${id}" step="${c.step || "1"}" ${c.min !== undefined ? `min="${c.min}"` : ""} ${c.max !== undefined ? `max="${c.max}"` : ""} name="${c.nome}" value="${v}" placeholder="${fmt.escape(c.placeholder || "")}" />`;
        break;
      default:
        controle = `<input type="text" id="${id}" name="${c.nome}" value="${v}" placeholder="${fmt.escape(c.placeholder || "")}" autocomplete="off" />`;
    }

    return `<div class="field ${largura} ${classe}">
        <label for="${id}">${fmt.escape(c.rotulo)}${extraRotulo}</label>
        ${controle}
        ${c.dica ? `<span class="hint">${fmt.escape(c.dica)}</span>` : ""}
      </div>`;
  }

  /** Uma linha da lista de anexos dentro de um formulário (com botão remover). */
  function anexoLinhaHTML(a, pendente = false) {
    const cls = typeof Arquivos !== "undefined" ? Arquivos.classificar(a) : { classe: "", rotulo: "arq" };
    const tam = typeof Arquivos !== "undefined" ? Arquivos.tamanhoLegivel(a.tamanho) : "";
    return `<div class="anexo" data-anexo-id="${fmt.escape(a.id || "")}" ${pendente ? 'data-pendente="1"' : ""}>
        <span class="anexo-ic ${cls.classe}">${fmt.escape(cls.rotulo)}</span>
        <span class="anexo-nome">${fmt.escape(a.nome)}
          <span class="anexo-meta">${fmt.escape(tam)}${pendente ? ", a salvar" : ""}</span>
        </span>
        <button class="btn ghost sm icon" data-remover type="button" aria-label="Remover anexo" title="Remover">${icone("fechar")}</button>
      </div>`;
  }

  /**
   * Liga a área de anexos de um formulário. Os arquivos escolhidos ficam na
   * memória até o Salvar — assim cancelar não deixa lixo no IndexedDB.
   * Devolve uma função que grava tudo e resolve com a lista final de fichas.
   */
  function ligarAnexos(modal, campo, valorInicial) {
    const raiz = modal.querySelector(`[data-anexos="${campo.nome}"]`);
    if (!raiz) return async () => valorInicial || [];

    const entrada = raiz.querySelector("[data-entrada]");
    const zona = raiz.querySelector("[data-zona]");
    const lista = raiz.querySelector("[data-lista]");

    let mantidos = [...(valorInicial || [])];
    const removidos = [];
    const novos = []; // File ainda não gravados

    const redesenhar = () => {
      lista.innerHTML =
        mantidos.map((a) => anexoLinhaHTML(a)).join("") +
        novos.map((f) => anexoLinhaHTML({ nome: f.name, tipo: f.type, tamanho: f.size }, true)).join("");

      lista.querySelectorAll(".anexo").forEach((el, i) => {
        el.querySelector("[data-remover]").addEventListener("click", () => {
          if (i < mantidos.length) removidos.push(mantidos.splice(i, 1)[0]);
          else novos.splice(i - mantidos.length, 1);
          redesenhar();
        });
      });
    };

    const aceitar = (arquivos) => {
      const limite = typeof Arquivos !== "undefined" ? Arquivos.LIMITE_MB * 1024 * 1024 : Infinity;
      [...arquivos].forEach((f) => {
        if (f.size > limite) return toast(`"${f.name}" passa de ${Arquivos.LIMITE_MB} MB e não foi anexado.`);
        novos.push(f);
      });
      redesenhar();
    };

    zona.addEventListener("click", () => entrada.click());
    zona.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); entrada.click(); }
    });
    entrada.addEventListener("change", (ev) => { aceitar(ev.target.files); entrada.value = ""; });

    ["dragenter", "dragover"].forEach((n) =>
      zona.addEventListener(n, (ev) => { ev.preventDefault(); zona.classList.add("dragover"); })
    );
    ["dragleave", "drop"].forEach((n) =>
      zona.addEventListener(n, (ev) => { ev.preventDefault(); zona.classList.remove("dragover"); })
    );
    zona.addEventListener("drop", (ev) => aceitar(ev.dataTransfer.files));

    redesenhar();

    // Só aqui os arquivos vão para o disco — e os apagados somem de vez.
    return async () => {
      for (const a of removidos) await Arquivos.remover(a.id);
      const salvos = [];
      for (const f of novos) {
        try { salvos.push(await Arquivos.salvar(f)); }
        catch (err) { toast(err.message); }
      }
      return [...mantidos, ...salvos];
    };
  }

  function confirmar({ titulo, descricao, rotuloConfirmar = "Confirmar", perigo = false }) {
    return new Promise((resolve) => {
      const html = `
        <div class="modal-head">
          <h2 class="modal-title">${fmt.escape(titulo)}</h2>
          ${descricao ? `<p class="modal-desc">${fmt.escape(descricao)}</p>` : ""}
        </div>
        <div class="modal-body"></div>
        <div class="modal-foot">
          <button class="btn" data-acao="nao" type="button">Cancelar</button>
          <button class="btn ${perigo ? "danger" : "primary"}" data-acao="sim" type="button">${fmt.escape(rotuloConfirmar)}</button>
        </div>`;
      abrirModal(html, {
        aoMontar(modal, fechar) {
          modal.querySelector('[data-acao="sim"]').addEventListener("click", () => fechar(true));
          modal.querySelector('[data-acao="nao"]').addEventListener("click", () => fechar(false));
          modal.querySelector('[data-acao="sim"]').focus();
        },
        aoFechar: (r) => resolve(!!r),
      });
    });
  }

  /* ------------------------------- Backup ---------------------------------- */

  function abrirBackup() {
    const e = Store.estado();
    const total =
      e.financeiro.transacoes.length + e.financeiro.metas.length + e.faculdade.disciplinas.length +
      e.faculdade.prazos.length + e.projetos.length + e.oportunidades.length;

    const html = `
      <div class="modal-head">
        <h2 class="modal-title">Backup e dados</h2>
        <p class="modal-desc">${typeof Nuvem !== "undefined" && Nuvem.conectado()
          ? "Seus dados estão sincronizados com a sua conta. Um arquivo de backup continua útil como cópia sua, fora do servidor."
          : "Tudo que você cadastra fica salvo só neste navegador. Exporte um arquivo para não perder nada ao trocar de computador ou limpar o cache."}</p>
      </div>
      <div class="modal-body">
        <div class="perfil-stats">
          <div class="perfil-stat"><b>${total}</b><span>registros</span></div>
          <div class="perfil-stat"><b data-anexos-n>—</b><span>anexos</span></div>
          <div class="perfil-stat"><b data-anexos-mb>—</b><span>em arquivos</span></div>
        </div>
        <button class="btn primary block" data-acao="exportar" type="button">${icone("exportar")}Exportar backup (.json)</button>
        <button class="btn block" data-acao="importar" type="button">${icone("importar")}Importar backup</button>
        <input type="file" accept="application/json" class="hidden" data-arquivo />
        <span class="hint">O backup leva junto os documentos anexados nas disciplinas, então o arquivo pode ficar grande.</span>
        <button class="btn danger block" data-acao="limpar" type="button">Apagar todos os dados</button>
      </div>
      <div class="modal-foot"><button class="btn" data-acao="fechar" type="button">Fechar</button></div>`;

    abrirModal(html, {
      aoMontar(modal, fechar) {
        const arquivo = modal.querySelector("[data-arquivo]");
        const btnExportar = modal.querySelector('[data-acao="exportar"]');

        if (typeof Arquivos !== "undefined" && Arquivos.disponivel) {
          Arquivos.uso().then((u) => {
            modal.querySelector("[data-anexos-n]").textContent = u.quantidade;
            modal.querySelector("[data-anexos-mb]").textContent = Arquivos.tamanhoLegivel(u.bytes);
          }).catch(() => {});
        }

        btnExportar.addEventListener("click", async () => {
          btnExportar.disabled = true;
          btnExportar.textContent = "Montando o backup…";
          try {
            const blob = new Blob([await Store.exportar()], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `delfos-backup-${hojeISO()}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 30000);
            toast("Backup exportado.");
          } catch (err) {
            toast(`Não foi possível exportar: ${err.message}`);
          }
          btnExportar.disabled = false;
          btnExportar.innerHTML = `${icone("exportar")}Exportar backup (.json)`;
        });

        modal.querySelector('[data-acao="importar"]').addEventListener("click", () => arquivo.click());

        arquivo.addEventListener("change", (ev) => {
          const f = ev.target.files[0];
          if (!f) return;
          const leitor = new FileReader();
          leitor.onload = async () => {
            try {
              const r = await Store.importar(leitor.result);
              // Com a nuvem ligada, o backup importado vale para todos os
              // aparelhos — sobe já, com a versão anterior guardada como cópia.
              if (typeof Nuvem !== "undefined" && Nuvem.conectado()) await Nuvem.enviar({ motivo: "Antes de importar um backup" });
              fechar();
              toast(r.anexos ? `Backup importado com ${r.anexos} anexos. Recarregando…` : "Backup importado. Recarregando…");
              setTimeout(() => location.reload(), 800);
            } catch (err) {
              toast(`Não foi possível importar: ${err.message}`);
            }
          };
          leitor.readAsText(f);
        });

        modal.querySelector('[data-acao="limpar"]').addEventListener("click", async () => {
          const ok = await confirmar({
            titulo: "Apagar todos os dados?",
            descricao: typeof Nuvem !== "undefined" && Nuvem.conectado()
              ? "Isso remove tudo que você cadastrou, neste navegador e na sua conta — os outros aparelhos também ficam vazios. O que existe agora fica em Versões anteriores (Conta e sincronização), para poder voltar atrás. A conta continua existindo."
              : "Isso remove tudo que você cadastrou neste navegador, inclusive os documentos anexados. Exporte um backup antes se quiser poder voltar atrás.",
            rotuloConfirmar: "Apagar tudo",
            perigo: true,
          });
          if (!ok) return;
          await Store.limpar();
          if (typeof Nuvem !== "undefined" && Nuvem.conectado()) await Nuvem.enviar({ motivo: "Antes de apagar todos os dados" });
          fechar();
          location.reload();
        });

        modal.querySelector('[data-acao="fechar"]').addEventListener("click", () => fechar(null));
      },
    });
  }

  /* ---------------------------- Estado vazio ------------------------------- */

  function vazio({ icone: nomeIcone = "mais", titulo, texto, rotuloAcao, aoAcionar }) {
    const el = document.createElement("div");
    el.className = "empty";
    // Aceita o nome de um desenho ou um dos glifos antigos que as páginas passam.
    const desenho = ICONES[nomeIcone] ? nomeIcone : GLIFO_PARA_ICONE[nomeIcone] || "vazio";
    el.innerHTML = `
      <div class="empty-icon">${icone(desenho)}</div>
      <div class="empty-title">${fmt.escape(titulo)}</div>
      ${texto ? `<div class="empty-text">${fmt.escape(texto)}</div>` : ""}
      ${rotuloAcao ? `<button class="btn primary" type="button">${fmt.escape(rotuloAcao)}</button>` : ""}`;
    if (rotuloAcao) el.querySelector("button").addEventListener("click", aoAcionar);
    return el;
  }

  /* ------------------------------ Gráficos --------------------------------- */

  /**
   * Barras horizontais — magnitude de uma única série.
   * Cada barra leva o valor escrito ao lado (rótulo direto), então a cor nunca
   * é o único canal de leitura.
   */
  function barras(el, { linhas, cor = "var(--serie-saida)", formatar = fmt.moeda }) {
    el.innerHTML = "";
    if (!linhas.length) return;
    const max = Math.max(...linhas.map((l) => l.valor), 0) || 1;
    linhas.forEach((l) => {
      const pct = Math.max((l.valor / max) * 100, 1);
      const row = document.createElement("div");
      row.className = "chart-row";
      row.innerHTML = `
        <div class="chart-name" title="${fmt.escape(l.nome)}">${fmt.escape(l.nome)}</div>
        <div class="chart-track"><div class="chart-bar" style="width:${pct}%; background:${cor};"></div></div>
        <div class="chart-value">${formatar(l.valor)}</div>`;
      el.appendChild(row);
    });
  }

  /**
   * Colunas agrupadas por mês — duas séries (receitas e despesas).
   * Duas séries ⇒ legenda obrigatória; barras finas com topo arredondado e
   * 2px de respiro entre as colunas do mesmo mês.
   */
  function colunasMensais(el, { meses, alturaPlot = 132 }) {
    el.innerHTML = "";
    if (!meses.length) return;
    const max = Math.max(...meses.flatMap((m) => [m.receita, m.despesa]), 0) || 1;

    // Alturas em pixels: percentual não resolve de forma confiável dentro de
    // um contêiner flex sem altura explícita.
    const altura = (v) => (v > 0 ? Math.max(Math.round((v / max) * alturaPlot), 3) : 0);

    const cols = document.createElement("div");
    cols.className = "cols";
    cols.style.height = `${alturaPlot + 22}px`;
    meses.forEach((m) => {
      const g = document.createElement("div");
      g.className = "col-group";
      g.innerHTML = `
        <div class="col-bars" style="height:${alturaPlot}px;">
          <div class="col-bar" style="height:${altura(m.receita)}px; background:var(--serie-entrada);"
               title="Receitas em ${fmt.mesRotulo(m.chave)}: ${fmt.moeda(m.receita)}"></div>
          <div class="col-bar" style="height:${altura(m.despesa)}px; background:var(--serie-saida);"
               title="Despesas em ${fmt.mesRotulo(m.chave)}: ${fmt.moeda(m.despesa)}"></div>
        </div>
        <div class="col-label">${fmt.mesRotulo(m.chave)}</div>`;
      cols.appendChild(g);
    });
    el.appendChild(cols);

    const leg = document.createElement("div");
    leg.className = "legend";
    leg.innerHTML = `
      <span class="legend-item"><span class="legend-key" style="background:var(--serie-entrada)"></span>Entradas</span>
      <span class="legend-item"><span class="legend-key" style="background:var(--serie-saida)"></span>Saídas</span>`;
    el.appendChild(leg);
  }

  /** Medidor de progresso (metas, projetos) — valor sempre escrito. */
  function medidor({ rotulo, atual, alvo, sufixo = "", formatar = fmt.moeda, cor = "var(--s-financeiro)" }) {
    const pct = alvo > 0 ? Math.min(100, (atual / alvo) * 100) : 0;
    const el = document.createElement("div");
    el.className = "meter";
    el.innerHTML = `
      <div class="meter-head">
        <span style="font-size:14px; font-weight:550;">${fmt.escape(rotulo)}</span>
        <span class="num" style="font-size:13.5px; color:var(--texto-2);">${formatar(atual)} de ${formatar(alvo)}${sufixo}</span>
      </div>
      <div class="meter-track"><div class="meter-fill" style="width:${pct}%; background:${cor};"></div></div>`;
    return el;
  }

  /* ---------------------- Perguntas e notas do Delfos ---------------------- */
  // O mesmo gesto em toda aba: o painel pergunta o que falta saber para ler
  // melhor (perguntas) e diz o que merece atenção (notas). Cada aba monta a
  // sua lista; o desenho e o "Agora não" são daqui.

  /**
   * "Agora não" esconde a pergunta por 14 dias; "sempre", para sempre.
   * O Financeiro guarda as dele em preferencias.financeiro.dispensadas; as
   * outras abas usam preferencias.dispensadas com a chave "<escopo>:<id>".
   */
  function perguntaDispensada(escopo, id) {
    const prefs = Store.estado().preferencias;
    const d = escopo === "financeiro" ? prefs.financeiro.dispensadas[id] : (prefs.dispensadas || {})[`${escopo}:${id}`];
    if (!d) return false;
    if (d === "sempre") return true;
    return (diasAte(d) ?? -99) > -14;
  }

  function dispensarPergunta(escopo, id, sempre = false) {
    const valor = sempre ? "sempre" : hojeISO();
    const prefs = Store.estado().preferencias;
    if (escopo === "financeiro") {
      Store.definirPreferencias({ financeiro: { dispensadas: { ...prefs.financeiro.dispensadas, [id]: valor } } });
    } else {
      Store.definirPreferencias({ dispensadas: { ...(prefs.dispensadas || {}), [`${escopo}:${id}`]: valor } });
    }
  }

  // Controles de resposta, montados em DOM (nada de texto do usuário em innerHTML).
  const resposta = {
    /** Campo numérico (ou texto, com `texto: true`) + botão. */
    valor({ sugestao = "", rotulo, sufixo = "", min, max, passo = "0.01", texto = false, data = false, placeholder = "", aoSalvar }) {
      const box = document.createElement("div");
      box.className = "pergunta-resposta";
      const inp = document.createElement("input");
      inp.className = "input";
      if (data) texto = true;
      inp.type = data ? "date" : texto ? "text" : "number";
      if (data) inp.style.width = "170px";
      else if (!texto) {
        inp.step = passo;
        if (min !== undefined) inp.min = min;
        if (max !== undefined) inp.max = max;
      } else inp.style.width = "220px";
      if (data) inp.style.width = "170px";
      inp.placeholder = placeholder || (sugestao !== "" ? String(sugestao).replace(".", ",") : "");
      if (sugestao !== "" && sugestao !== null) inp.value = sugestao;
      inp.setAttribute("aria-label", rotulo);
      const btn = document.createElement("button");
      btn.className = "btn primary sm";
      btn.type = "button";
      btn.textContent = rotulo;
      const ok = () => {
        if (texto) {
          if (!inp.value.trim()) return inp.focus();
          return aoSalvar(inp.value.trim());
        }
        const v = Number(String(inp.value).replace(",", "."));
        if (!inp.value || Number.isNaN(v) || v <= 0 || (max !== undefined && v > max)) return inp.focus();
        aoSalvar(v);
      };
      btn.addEventListener("click", ok);
      inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") ok(); });
      box.append(inp);
      if (sufixo) { const s = document.createElement("span"); s.className = "muted"; s.textContent = sufixo; box.append(s); }
      box.append(btn);
      return box;
    },
    /** Uma fileira de botões: [[rótulo, ação, primário?], …]. */
    botoes(lista) {
      const box = document.createElement("div");
      box.className = "pergunta-resposta";
      lista.forEach(([rotulo, fn, primario]) => {
        const b = document.createElement("button");
        b.className = `btn sm ${primario ? "primary" : ""}`;
        b.type = "button";
        b.textContent = rotulo;
        b.addEventListener("click", fn);
        box.append(b);
      });
      return box;
    },
    /** Pílulas de escolha múltipla + salvar. */
    multipla(opcoes, marcadas, rotuloSalvar, aoSalvar) {
      const box = document.createElement("div");
      box.style.cssText = "display:flex; flex-direction:column; gap:12px;";
      const chips = document.createElement("div");
      chips.className = "chips";
      opcoes.forEach((o) => {
        const c = document.createElement("button");
        c.type = "button";
        c.className = "chip";
        c.textContent = o;
        c.setAttribute("aria-pressed", String(marcadas.includes(o)));
        c.addEventListener("click", () => c.setAttribute("aria-pressed", String(c.getAttribute("aria-pressed") !== "true")));
        chips.append(c);
      });
      box.append(chips, resposta.botoes([[rotuloSalvar, () => aoSalvar([...chips.querySelectorAll('[aria-pressed="true"]')].map((c) => c.textContent)), true]]));
      return box;
    },
  };

  /**
   * Desenha as perguntas (duas por vez) numa seção; esconde a seção quando
   * não há nenhuma. `perguntas`: [{ id, texto, apoio, controle: () => Element }].
   * `aoMudar` roda depois de um "Agora não".
   */
  function renderPerguntas(secao, box, escopo, perguntas, aoMudar) {
    const lista = perguntas.filter((q) => !perguntaDispensada(escopo, q.id));
    secao.hidden = !lista.length;
    box.innerHTML = "";
    lista.slice(0, 2).forEach((q, i) => {
      const el = document.createElement("article");
      el.className = "pergunta";
      const texto = document.createElement("div");
      texto.className = "pergunta-texto";
      texto.textContent = q.texto;
      const apoio = document.createElement("div");
      apoio.className = "pergunta-apoio";
      apoio.textContent = q.apoio;
      const rodape = document.createElement("div");
      rodape.className = "pergunta-rodape";
      rodape.innerHTML = `<span class="contador">${i + 1} de ${lista.length}</span>`;
      const depois = document.createElement("button");
      depois.className = "btn ghost sm";
      depois.type = "button";
      depois.textContent = "Agora não";
      depois.addEventListener("click", () => { dispensarPergunta(escopo, q.id); aoMudar?.(); });
      rodape.append(depois);
      el.append(texto, apoio, q.controle(), rodape);
      box.appendChild(el);
    });
  }

  /**
   * Notas: [{ tipo: alerta|atencao|bom|info, ic, html, acao?: { rotulo, fn }, area?: { rotulo, cor } }].
   * `html` é montado por quem chama, sempre com o texto do usuário escapado.
   */
  function renderNotas(ul, notas, textoVazio) {
    ul.innerHTML = "";
    if (!notas.length) {
      ul.innerHTML = `<li><span class="sinal">${icone("check")}</span><span>${fmt.escape(textoVazio)}</span></li>`;
      return;
    }
    notas.forEach((x) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="sinal ${x.tipo}">${icone(x.ic)}</span><div><div>${x.area ? `<span class="nota-area" style="--marca:${fmt.escape(x.area.cor)}">${fmt.escape(x.area.rotulo)}</span>` : ""}${x.html}</div></div>`;
      if (x.acao) {
        const b = document.createElement(x.acao.href ? "a" : "button");
        b.className = "btn sm acao";
        if (x.acao.href) b.href = x.acao.href; else { b.type = "button"; b.addEventListener("click", x.acao.fn); }
        b.textContent = x.acao.rotulo;
        li.querySelector("div").appendChild(b);
      }
      ul.appendChild(li);
    });
  }

  const ORDEM_NOTAS = { alerta: 0, atencao: 1, bom: 2, info: 3 };
  const ordenarNotas = (lista, max = 6) => [...lista].sort((a, b) => ORDEM_NOTAS[a.tipo] - ORDEM_NOTAS[b.tipo]).slice(0, max);

  /**
   * Barras com valor escrito e, se houver, uma marca de meta/limite em cada
   * linha (a mesma leitura de "Para onde foi o dinheiro"). Uma série só.
   * linhas: [{ nome, valor, meta?, meta2?, sub?, acima? , href? }]
   */
  function barrasComMeta(el, linhas, { cor = "var(--serie-saida)", formatar = fmt.moeda, rotuloMeta = "meta", escala: fixa } = {}) {
    el.innerHTML = "";
    const escala = fixa || Math.max(...linhas.map((l) => Math.max(l.valor || 0, l.meta || 0)), 0) || 1;
    const lista = document.createElement("div");
    lista.className = "cat-lista";
    lista.innerHTML = linhas.map((l) => `
      <div class="cat-linha">
        <span class="cat-nome"><span>${l.href ? `<a class="titulo-link" href="${fmt.escape(l.href)}">${fmt.escape(l.nome)}</a>` : fmt.escape(l.nome)}</span></span>
        <span class="cat-valor">${formatar(l.valor || 0)}</span>
        <span class="cat-barra"><i class="${l.acima ? "acima" : ""}" style="width:${((l.valor || 0) / escala) * 100}%; background:${l.acima ? "" : cor}"></i>${l.meta ? `<b style="left:calc(${(l.meta / escala) * 100}% - 1px)" title="${fmt.escape(rotuloMeta)}: ${fmt.escape(formatar(l.meta))}"></b>` : ""}</span>
        ${l.sub ? `<span class="cat-meta">${l.sub}</span>` : ""}
      </div>`).join("");
    el.appendChild(lista);
  }

  /* -------------------------------- Movimento ------------------------------ */

  /**
   * A parte do hover que o CSS sozinho não faz (ver "Movimento" em theme.css):
   * - a luz que acompanha o ponteiro dentro de cartões (--mx/--my);
   * - um destaque único que desliza entre os itens do menu lateral;
   * - o sublinhado das abas, que desliza até a aba sob o ponteiro e volta;
   * - o fundo da escolha única (.seg), que desliza até a opção marcada.
   * Tudo é enfeite de ponteiro: sem mouse ou com "reduzir movimento" no
   * sistema, nada disso é criado e o painel continua igual.
   */
  const semMovimento = () => document.documentElement.dataset.movimento === "reduzido"
    || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const temPonteiro = () => typeof matchMedia === "function" && matchMedia("(hover: hover) and (pointer: fine)").matches;

  let luzLigada = false;
  function ligarLuz() {
    if (luzLigada) return;
    luzLigada = true;
    let alvos = [];
    let x = 0;
    let y = 0;
    let agendado = false;
    const pintar = () => {
      agendado = false;
      alvos.forEach((el) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${Math.round(x - r.left)}px`);
        el.style.setProperty("--my", `${Math.round(y - r.top)}px`);
      });
    };
    document.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      // O cartão sob o ponteiro e os que o contêm (uma faixa dentro de outra).
      alvos = [];
      let el = e.target instanceof Element ? e.target.closest(".card, .pillar") : null;
      while (el && alvos.length < 3) {
        alvos.push(el);
        el = el.parentElement?.closest(".card, .pillar") || null;
      }
      if (alvos.length && !agendado) { agendado = true; requestAnimationFrame(pintar); }
    }, { passive: true });
  }

  /** Coloca um elemento sobre outro sem animar (primeira aparição). */
  function semTransicao(el, fn) {
    el.style.transition = "none";
    fn();
    void el.offsetWidth;
    el.style.transition = "";
  }

  function realceDeslizante(container) {
    if (!container || container.dataset.realce) return;
    container.dataset.realce = "1";
    container.classList.add("com-realce");
    const realce = document.createElement("span");
    realce.className = "realce-nav";
    realce.setAttribute("aria-hidden", "true");
    container.prepend(realce);
    let visivel = false;
    const posicionar = (el) => {
      // Offsets (e não getBoundingClientRect): continuam certos com o zoom do "tamanho do texto".
      let x = 0;
      let y = 0;
      for (let n = el; n && n !== container; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
      const aplicar = () => {
        realce.style.transform = `translate(${x}px, ${y}px)`;
        realce.style.width = `${el.offsetWidth}px`;
        realce.style.height = `${el.offsetHeight}px`;
      };
      if (visivel) aplicar(); else semTransicao(realce, aplicar);
      realce.style.opacity = "1";
      visivel = true;
    };
    container.addEventListener("pointerover", (e) => {
      const el = e.target instanceof Element ? e.target.closest(".nav-item, .nav-subitem") : null;
      if (el && container.contains(el)) posicionar(el);
    });
    container.addEventListener("pointerleave", () => { realce.style.opacity = "0"; visivel = false; });
  }

  function indicadorAbas(abas) {
    if (abas.dataset.indicador) return;
    abas.dataset.indicador = "1";
    abas.classList.add("com-indicador");
    const ind = document.createElement("span");
    ind.className = "indicador-abas";
    ind.setAttribute("aria-hidden", "true");
    abas.appendChild(ind);
    const itens = () => [...abas.children].filter((x) => x !== ind && /^(A|BUTTON)$/.test(x.tagName));
    const ativa = () => itens().find((x) => x.getAttribute("aria-current") === "page" || x.getAttribute("aria-selected") === "true");
    const ir = (el, provando = false, animar = true) => {
      if (!el || !el.offsetWidth) { ind.style.opacity = "0"; return; }
      const aplicar = () => {
        ind.style.width = `${el.offsetWidth}px`;
        ind.style.transform = `translateX(${el.offsetLeft}px)`;
      };
      if (animar) aplicar(); else semTransicao(ind, aplicar);
      ind.style.opacity = "1";
      abas.classList.toggle("provando", provando);
    };
    ir(ativa(), false, false);
    abas.addEventListener("pointerover", (e) => {
      const el = e.target instanceof Element ? e.target.closest("a, button") : null;
      if (el && el.parentElement === abas) ir(el, el !== ativa());
    });
    abas.addEventListener("pointerleave", () => ir(ativa()));
    new MutationObserver(() => ir(ativa())).observe(abas, { attributes: true, subtree: true, attributeFilter: ["aria-selected", "aria-current"] });
    if (typeof ResizeObserver === "function") new ResizeObserver(() => ir(ativa(), false, false)).observe(abas);
  }

  function trilhoSeg(seg) {
    if (seg.dataset.trilho) return;
    seg.dataset.trilho = "1";
    seg.classList.add("com-trilho");
    const trilho = document.createElement("span");
    trilho.className = "trilho-seg";
    trilho.setAttribute("aria-hidden", "true");
    seg.prepend(trilho);
    const ir = (animar = true) => {
      const b = seg.querySelector('button[aria-pressed="true"]');
      if (!b || !b.offsetWidth) { trilho.style.opacity = "0"; return; }
      const aplicar = () => {
        trilho.style.width = `${b.offsetWidth}px`;
        trilho.style.height = `${b.offsetHeight}px`;
        trilho.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`;
      };
      if (animar && trilho.style.opacity === "1") aplicar(); else semTransicao(trilho, aplicar);
      trilho.style.opacity = "1";
    };
    ir(false);
    new MutationObserver(() => ir()).observe(seg, { attributes: true, subtree: true, attributeFilter: ["aria-pressed"] });
    if (typeof ResizeObserver === "function") new ResizeObserver(() => ir(false)).observe(seg);
  }

  /** Liga o movimento em tudo que houver dentro de `raiz` (a página ou o que acabou de ser desenhado). */
  function movimento(raiz = document) {
    if (semMovimento() || !raiz.querySelectorAll) return;
    const achar = (sel) => [...(raiz.matches?.(sel) ? [raiz] : []), ...raiz.querySelectorAll(sel)];
    achar(".seg").forEach(trilhoSeg);
    achar(".abas").forEach(indicadorAbas);
    if (!temPonteiro()) return;
    ligarLuz();
    achar(".sidebar .nav").forEach(realceDeslizante);
  }

  /* ------------------------ Repetição e lembretes -------------------------- */

  const REPETICOES = [["", "Não repete"], ["semanal", "Toda semana"], ["mensal", "Todo mês"], ["anual", "Todo ano"]];

  function somarPeriodo(iso, repete, n = 1) {
    const [a, m, d] = iso.split("-").map(Number);
    let alvo;
    if (repete === "semanal") alvo = new Date(a, m - 1, d + 7 * n);
    else if (repete === "mensal") {
      const base = new Date(a, m - 1 + n, 1);
      alvo = new Date(base.getFullYear(), base.getMonth(), Math.min(d, new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()));
    } else if (repete === "anual") {
      const ultimo = new Date(a + n, m, 0).getDate();
      alvo = new Date(a + n, m - 1, Math.min(d, ultimo));
    } else return iso;
    return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, "0")}-${String(alvo.getDate()).padStart(2, "0")}`;
  }

  /** Datas em que um item que se repete acontece entre `ini` e `fim` (ISO, inclusivos). */
  function ocorrenciasEntre(item, ini, fim) {
    if (!item.data) return [];
    if (!item.repete) return item.data >= ini && item.data <= fim ? [item.data] : [];
    // `repeteDesde` guarda a primeira data da série: é dela que se conta, para
    // "todo dia 31" voltar a ser 31 depois de passar por fevereiro.
    const base = item.repeteDesde || item.data;
    const datas = [];
    let d = base;
    for (let n = 0; n < 2000 && d <= fim; n++) {
      if (d >= ini && d >= item.data && (!item.repeteAte || d <= item.repeteAte)) datas.push(d);
      d = somarPeriodo(base, item.repete, n + 1);
    }
    return datas;
  }

  /**
   * Compromisso pessoal que se repete (aniversário, academia toda terça…):
   * quando a data passa, ele anda para a próxima ocorrência — assim a
   * agenda, os alertas e os lembretes enxergam sempre a próxima vez, e não
   * um "atrasado" que já aconteceu.
   */
  function rolarRecorrentes() {
    const hoje = hojeISO();
    (Store.estado().pessoal?.compromissos || []).forEach((c) => {
      if (!c.repete || !c.data || c.data >= hoje) return;
      const base = c.repeteDesde || c.data;
      let prox = base;
      for (let n = 1; prox < hoje && n < 5000; n++) prox = somarPeriodo(base, c.repete, n);
      if (c.repeteAte && prox > c.repeteAte) return; // a série acabou: fica como o último
      Store.atualizar("pessoal.compromissos", c.id, { data: prox, repeteDesde: base, concluido: false });
    });
  }

  /**
   * O que merece lembrete agora: tudo com data das abas (UI.compromissos) e
   * as contas a pagar, dentro da antecedência escolhida no perfil (ou a do
   * próprio compromisso). O que foi marcado "importante" avisa também uma
   * semana antes.
   */
  function lembretesAgora() {
    const xp = experiencia();
    const padrao = Number(xp.lembretes?.antecedencia ?? 2);
    const pessoais = Object.fromEntries((Store.estado().pessoal?.compromissos || []).map((c) => [c.id, c]));
    const itens = compromissos().map((i) => {
      const p = i.area === "pessoal" ? pessoais[i.id] : null;
      return { ...i, hora: p?.hora || "", importante: !!p?.importante, lembrete: p?.lembrete ?? "" };
    });
    if (typeof Financas !== "undefined" && Financas.pendentes) {
      Financas.pendentes().forEach((t) => itens.push({
        id: t.id, titulo: `Pagar: ${t.descricao || "conta"}`, data: t.data, area: "financeiro", areaRotulo: "Financeiro",
        cor: "var(--s-financeiro)", tipo: "conta", valor: t.valor, hora: "", importante: false, lembrete: "",
      }));
    }
    return itens
      .map((i) => {
        const dias = diasAte(i.data);
        const ant = i.lembrete === "nenhum" ? -1 : i.lembrete !== "" && i.lembrete !== undefined ? Number(i.lembrete) : padrao;
        const avisa = dias !== null && dias >= 0 && (dias <= ant || (i.importante && dias <= 7));
        return { ...i, dias, avisa };
      })
      .filter((i) => i.avisa)
      .sort((a, b) => a.dias - b.dias || (a.hora || "99").localeCompare(b.hora || "99"));
  }

  function textoQuando(dias, hora) {
    const d = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`;
    return hora ? `${d}, às ${hora}` : d;
  }

  /** Resumo do dia (uma vez por dia, na primeira página aberta) e avisos do navegador. */
  function verificarLembretes() {
    const xp = experiencia();
    const hoje = hojeISO();
    const itens = lembretesAgora();
    if (!itens.length) return;

    // Avisos do navegador: cada item uma vez por dia; os com hora hoje, de novo 1 h antes.
    if (xp.lembretes?.navegador && typeof Notification !== "undefined" && Notification.permission === "granted") {
      let avisados = {};
      try { avisados = JSON.parse(localStorage.getItem("delfos.avisados") || "{}"); } catch { /* nada */ }
      if (avisados.dia !== hoje) avisados = { dia: hoje, ids: [] };
      itens.forEach((i) => {
        if (avisados.ids.includes(i.id)) return;
        avisados.ids.push(i.id);
        try { new Notification(i.titulo, { body: `${i.areaRotulo || ""}, ${textoQuando(i.dias, i.hora)}`, tag: `delfos-${i.id}` }); } catch { /* sem aviso */ }
      });
      try { localStorage.setItem("delfos.avisados", JSON.stringify(avisados)); } catch { /* nada */ }
      itens.filter((i) => i.dias === 0 && i.hora).forEach((i) => {
        const [h, m] = i.hora.split(":").map(Number);
        const quando = new Date();
        quando.setHours(h, m - 60, 0, 0);
        const falta = quando - Date.now();
        if (falta > 0 && falta < 12 * 3600e3) setTimeout(() => {
          try { new Notification(`Daqui a 1 hora: ${i.titulo}`, { body: `Às ${i.hora}`, tag: `delfos-hora-${i.id}` }); } catch { /* nada */ }
        }, falta);
      });
    }

    if (xp.lembretes?.resumoDoDia === false) return;
    try {
      if (localStorage.getItem("delfos.resumoDoDia") === hoje) return;
      localStorage.setItem("delfos.resumoDoDia", hoje);
    } catch { return; }
    abrirResumoDoDia(itens);
  }

  function abrirResumoDoDia(itens = lembretesAgora()) {
    const hojeItens = itens.filter((i) => i.dias === 0);
    const depois = itens.filter((i) => i.dias > 0);
    const nome = typeof Personalizacao !== "undefined" ? (Store.estado().perfil?.apelido || Personalizacao.primeiroNome?.() || "") : "";
    const hora = new Date().getHours();
    const saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
    const linha = (i) => `<li>
        <span class="lembrete-selo" style="--c:${fmt.escape(i.cor || "var(--texto-3)")}"></span>
        <span class="grow"><span class="t">${fmt.escape(i.titulo)}${i.importante ? ` <span class="badge urgente">importante</span>` : ""}</span>
        <span class="m">${fmt.escape([fmt.capitalizar(i.areaRotulo || ""), textoQuando(i.dias, i.hora)].filter(Boolean).join(", "))}${i.valor ? `, ${fmt.moeda(i.valor)}` : ""}</span></span>
      </li>`;
    abrirModal(`
      <div class="modal-head com-marca">
        <span class="modal-ic" style="--ic-cor:var(--s-pessoal)">${icone("calendario")}</span>
        <div class="modal-head-texto">
          <h2 class="modal-title">${saud}${nome ? `, ${fmt.escape(nome)}` : ""}</h2>
          <p class="modal-desc">${hojeItens.length ? `Hoje ${hojeItens.length === 1 ? "tem uma coisa" : `tem ${hojeItens.length} coisas`} marcada${hojeItens.length === 1 ? "" : "s"}` : "Nada vence hoje"}${depois.length ? `, e ${depois.length} ${depois.length === 1 ? "se aproxima" : "se aproximam"}.` : "."}</p>
        </div>
      </div>
      <div class="modal-body">
        ${hojeItens.length ? `<div class="lembrete-grupo">Hoje</div><ul class="lembretes">${hojeItens.map(linha).join("")}</ul>` : ""}
        ${depois.length ? `<div class="lembrete-grupo">Chegando</div><ul class="lembretes">${depois.map(linha).join("")}</ul>` : ""}
      </div>
      <div class="modal-foot">
        <span class="modal-atalho">Dá para mudar a antecedência em Perfil, Rotina e avisos.</span>
        <span class="modal-foot-espaco"></span>
        <a class="btn" href="pessoal.html#calendario">Ver calendário</a>
        <button class="btn primary" type="button" data-acao="ok">Entendi</button>
      </div>`, {
      classe: "formulario resumo-dia",
      aoMontar(modal, fechar) { modal.querySelector('[data-acao="ok"]').addEventListener("click", () => fechar(null)); },
    });
  }

  /* ------------------------------ Inicialização ---------------------------- */

  /**
   * "+ Prazo", "+ Material": o "+" digitado nos botões das páginas vira o
   * ícone desenhado, igual ao dos botões do Financeiro. Um observador cobre
   * também os botões que as páginas criam depois (listas, modais).
   */
  function realcarBotoes(raiz) {
    const trocar = (btn) => {
      const primeiro = btn.firstChild;
      if (!primeiro || primeiro.nodeType !== Node.TEXT_NODE || !/^\s*\+\s/.test(primeiro.textContent)) return;
      primeiro.textContent = primeiro.textContent.replace(/^\s*\+\s+/, "");
      btn.insertAdjacentHTML("afterbegin", icone("mais"));
    };
    if (raiz.matches?.(".btn")) trocar(raiz);
    raiz.querySelectorAll?.(".btn").forEach(trocar);
  }

  /** Atalhos de teclado do painel inteiro (lista em abrirAtalhos). */
  const ATALHOS = [
    [["N"], "Novo registro da página (o botão principal do alto)"],
    [["/"], "Ir para a busca da página, onde houver"],
    [["Alt", "1…9"], "Ir para a aba nessa posição da barra lateral"],
    [["?"], "Mostrar esta lista"],
    [["Esc"], "Fechar a janela aberta"],
    [["Enter"], "Salvar a janela aberta"],
  ];
  function abrirAtalhos() {
    abrirModal(`
      <div class="modal-head"><h2 class="modal-title">Atalhos de teclado</h2>
        <p class="modal-desc">Funcionam em qualquer página, fora dos campos de texto.</p></div>
      <div class="modal-body"><dl class="atalhos">${ATALHOS.map(([teclas, d]) => `<div><dt>${teclas.map((k) => `<kbd>${fmt.escape(k)}</kbd>`).join(" ")}</dt><dd>${fmt.escape(d)}</dd></div>`).join("")}</dl></div>
      <div class="modal-foot"><button class="btn primary" data-acao="ok" type="button">Entendi</button></div>`, {
      aoMontar(modal, fechar) { modal.querySelector('[data-acao="ok"]').addEventListener("click", () => fechar(null)); },
    });
  }
  let atalhosLigados = false;
  function ligarAtalhos() {
    if (atalhosLigados) return;
    atalhosLigados = true;
    document.addEventListener("keydown", (e) => {
      if (document.querySelector(".backdrop")) return;
      const digitando = e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable='true']");
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        const p = paginas()[Number(e.key) - 1];
        if (p) { e.preventDefault(); location.href = p.href; }
        return;
      }
      if (digitando || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") {
        const b = document.querySelector('.main input[type="search"], .main .busca input, .main input[placeholder^="Buscar"]');
        if (b) { e.preventDefault(); b.focus(); }
      } else if (e.key === "n" || e.key === "N") {
        const b = document.querySelector(".topbar-actions .btn.primary");
        if (b) { e.preventDefault(); b.click(); }
      } else if (e.key === "?") {
        e.preventDefault();
        abrirAtalhos();
      }
    });
  }

  function iniciarPagina(ativo, opcoes) {
    tema.iniciar();
    aplicarAparencia();
    realcarBotoes(document);
    new MutationObserver((mudancas) => mudancas.forEach((m) => {
      if (m.target.nodeType !== Node.ELEMENT_NODE) return;
      realcarBotoes(m.target);
      m.addedNodes.forEach((n) => { if (n.nodeType === Node.ELEMENT_NODE) movimento(n); });
    })).observe(document.body, { childList: true, subtree: true });
    // As seções chegam em cascata curta só na primeira pintura (theme.css, body.entrando).
    if (!semMovimento()) {
      document.body.classList.add("entrando");
      setTimeout(() => document.body.classList.remove("entrando"), 900);
    }
    // Sem conta, sessao.js já está levando para entrar.html (com a página
    // escondida): o assistente espera a pessoa entrar, para os dois
    // redirecionamentos não disputarem.
    const indoEntrar = typeof Sessao !== "undefined" && Sessao.saindo();
    // Primeira abertura (ou "Pular" ainda não tocado): o assistente de
    // boas-vindas coleta o perfil antes de qualquer outra tela aparecer.
    // bemvindo.js não passa por aqui, então não há loop de redirecionamento.
    if (!indoEntrar && typeof Personalizacao !== "undefined" && Personalizacao.precisaConfigurar()) {
      location.href = "bemvindo.html";
      return;
    }
    // Página inicial escolhida no perfil: só na primeira página de cada visita,
    // para "Visão geral" continuar abrindo quando a pessoa clica nela.
    try {
      const primeira = !sessionStorage.getItem("delfos.visita");
      sessionStorage.setItem("delfos.visita", "1");
      const ini = experiencia().paginaInicial;
      if (primeira && ativo === "home" && ini && ini !== "home") {
        const destino = paginas().find((x) => x.id === ini);
        if (destino) { location.replace(destino.href); return; }
      }
    } catch { /* sem sessionStorage: abre onde a pessoa pediu */ }
    ligarAtalhos();
    // Gastos fixos viram o lançamento do mês ao abrir qualquer página (idempotente).
    if (typeof Financas !== "undefined" && Financas.gerarFixos) {
      try { Financas.gerarFixos(); } catch (e) { console.error("gastos fixos", e); }
    }
    try { rolarRecorrentes(); } catch (e) { console.error("repetições", e); }
    montarLayout(ativo, opcoes);
    avisarSeAbaDesligada(ativo);
    movimento(document);
    setTimeout(() => { try { verificarLembretes(); } catch (e) { console.error("lembretes", e); } }, 600);
  }

  /**
   * Uma aba fixa desligada some da barra, mas os links que já apontam para
   * ela (favoritos, um material salvo) continuam abrindo — só ganham um
   * aviso no topo, com atalho para religar. Nada é escondido nem apagado.
   */
  function avisarSeAbaDesligada(ativo) {
    const grupo = GRUPO_DE[ativo] || ativo;
    if (!Personalizacao.ROTULOS_PADRAO[grupo] || Personalizacao.abaAtiva(grupo)) return;

    const alvo = document.querySelector(".wrap");
    if (!alvo) return;

    const el = document.createElement("div");
    el.className = "notice warning";
    el.innerHTML = `<span class="ic">▲</span><span>Esta aba está desligada no seu painel.
      <button class="btn ghost sm" data-religar type="button" style="margin-left:6px;">Religar</button></span>`;
    alvo.insertBefore(el, alvo.firstChild);

    el.querySelector("[data-religar]").addEventListener("click", () => {
      Store.definirPreferencias({ abasFixas: { [grupo]: { ativo: true } } });
      location.reload();
    });
  }

  /** Lê um parâmetro da URL (usado pelas páginas de detalhe). */
  function parametro(nome) {
    return new URLSearchParams(window.location.search).get(nome) || "";
  }

  return {
    NOME, VERSAO, ICONES, ICONES_ABA, icone, iconeAba, movimento, aplicarAparencia, experiencia, abrirAtalhos,
    REPETICOES, somarPeriodo, ocorrenciasEntre, lembretesAgora, abrirResumoDoDia, textoQuando,
    lerDinheiro, avaliarDinheiro, formatarDinheiroCampo, dataPorExtensoCurta, isoMaisDias, marcaDaPagina,
    fmt, htmlSeguro, idsImagensEm, resolverImagens, hojeISO, mesAtual, mesAnterior, diasAte, urgencia, chaveSemana, parametro, idade,
    compromissos, conflitos, contagens, mediaDisciplina, notaNecessaria, proximaAvaliacao, resumoProjeto,
    iniciarPagina, montarLayout, tema, toast, formulario, confirmar, abrirModal,
    abrirBackup, abrirPerfil, avatarHTML, iniciais, vazio, barras, colunasMensais, medidor,
    novaAba, camposPilar, redimensionarFoto, camposItemPilar, editorCampos,
    perguntaDispensada, dispensarPergunta, resposta, renderPerguntas, renderNotas, ordenarNotas, barrasComMeta,
  };
})();

// Aplica o tema antes da primeira pintura, evitando "flash" de tela clara.
UI.tema.iniciar();
