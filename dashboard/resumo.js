/* Editor de resumos — página inteira, sem barra lateral, só o texto.
   Abre a partir da página de uma disciplina:
     resumo.html?disciplina=<id>            → resumo novo
     resumo.html?disciplina=<id>&id=<resumo> → editar um existente

   Tudo sai de document.execCommand (a única via sem dependência externa) e
   passa por UI.htmlSeguro antes de ser guardado: estilo de parágrafo,
   fontes, cores, marca-texto, listas (inclusive de tarefas), alinhamento,
   recuo, links, imagens, tabelas, caixas de destaque, divisor e código.
   Atalhos de digitação no começo da linha ("# ", "- ", "1. ", "[] ", "> ",
   "---"), buscar e substituir, sumário dos títulos, modo foco, folha
   ajustável (largura, papel, espaçamento, guardada no próprio resumo) e
   exportar para impressão/PDF, Word e texto. */

(() => {
  const { fmt } = UI;
  const CAMINHO = "faculdade.disciplinas";
  const disciplinaId = UI.parametro("disciplina");
  let resumoId = UI.parametro("id");
  UI.aplicarAparencia?.();

  const disciplina = Store.achar(CAMINHO, disciplinaId);

  if (!disciplina) {
    document.getElementById("editor-raiz").innerHTML =
      `<div class="editor-folha"><div class="card" style="margin-top:40px;"></div></div>`;
    document.querySelector(".card").appendChild(
      UI.vazio({
        icone: "◌",
        titulo: "Disciplina não encontrada",
        texto: "Volte para a lista de disciplinas e abra o resumo por lá.",
        rotuloAcao: "Ver disciplinas",
        aoAcionar: () => (location.href = "faculdade.html"),
      })
    );
    return;
  }

  const voltarHref = `disciplina.html?id=${encodeURIComponent(disciplinaId)}`;
  document.getElementById("voltar").href = voltarHref;
  document.getElementById("voltar-nome").textContent = disciplina.nome;

  const resumoAtual = () =>
    (Store.achar(CAMINHO, disciplinaId)?.resumos || []).find((r) => r.id === resumoId) || null;

  /* --------------------------------- Ícones --------------------------------
     Os do painel (UI.icone) e alguns próprios do editor, no mesmo traço. */

  const ICONES_ED = {
    desfazer: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    "refazer-ed": '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
    "lista-num": '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 5l1.5-1V9M3.6 12.2c.3-.7 2.4-.8 2.4.5 0 1-2.4 2-2.4 3.3h2.5M3.8 17.5h2c.6 0 .8 1.2-.1 1.4.9.1.9 1.6-.2 1.6H3.7"/>',
    checklist: '<rect x="3.5" y="4.5" width="5" height="5" rx="1.2"/><path d="m4.6 16.8 1.3 1.3 2.4-2.6"/><path d="M11.5 7h9M11.5 17h9"/>',
    "alinhar-esq": '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
    "alinhar-centro": '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
    "alinhar-dir": '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
    "alinhar-just": '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
    "recuo-mais": '<path d="M10 6h10M10 12h10M10 18h10M4 9l3 3-3 3"/>',
    "recuo-menos": '<path d="M10 6h10M10 12h10M10 18h10M7 9l-3 3 3 3"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
    imagem: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m20.5 16-5-5-8.5 8.5"/>',
    tabela: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 10h17M3.5 15h17M9.5 4.5v15M15 4.5v15"/>',
    caixa: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M7.5 5v14"/><path d="M11 10h6M11 14h4"/>',
    divisor: '<path d="M3.5 12h17"/><path d="M8 7h8M8 17h8" opacity=".45"/>',
    limpar: '<path d="M6 5h11M11.5 5 8 19"/><path d="m14 14 6 6M20 14l-6 6"/>',
    "marca-texto": '<path d="m15.5 4.5 4 4-8.5 8.5H7v-4z"/><path d="M4 20h7"/>',
    sumario: '<path d="M4 6h1M4 12h1M4 18h1M9 6h11M11 12h9M11 18h9"/>',
    folha: '<path d="M6.5 3.5h8l3.5 3.5v13.5h-11.5z"/><path d="M14.5 3.5V7h3.5M9 12h6M9 15.5h6"/>',
    foco: '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>',
  };
  function iconeEd(nome) {
    if (ICONES_ED[nome]) return `<svg class="ico" data-ico="${nome}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES_ED[nome]}</svg>`;
    return UI.icone(nome);
  }
  document.querySelectorAll("[data-ico]").forEach((el) => {
    if (el.tagName === "svg") return;
    el.insertAdjacentHTML("afterbegin", iconeEd(el.dataset.ico));
  });

  /* ------------------------------ Tipografia ------------------------------- */

  // Fontes com nome que o usuário reconhece. A primeira segue a fonte do
  // painel; as de sistema (sempre disponíveis, mesmo sem internet) vêm
  // antes das importadas do Google Fonts (resumo.html carrega o link),
  // que dão mais variedade para ler, escrever fórmula ou anotar à mão.
  const FONTES = [
    { rotulo: "Padrão do painel", valor: "" },
    { rotulo: "Georgia", valor: "Georgia, serif" },
    { rotulo: "Times New Roman", valor: "'Times New Roman', Times, serif" },
    { rotulo: "Arial", valor: "Arial, Helvetica, sans-serif" },
    { rotulo: "Verdana", valor: "Verdana, Geneva, sans-serif" },
    { rotulo: "Courier New", valor: "'Courier New', Courier, monospace" },
    { rotulo: "Merriweather", valor: "'Merriweather', Georgia, serif" },
    { rotulo: "Lora", valor: "'Lora', Georgia, serif" },
    { rotulo: "Inter", valor: "'Inter', Arial, sans-serif" },
    { rotulo: "Space Mono", valor: "'Space Mono', 'Courier New', monospace" },
    { rotulo: "Caveat (letra à mão)", valor: "'Caveat', cursive" },
  ];
  const TAMANHOS = [12, 14, 16, 18, 20, 24, 30, 36, 48];
  // Cores com luminosidade média: leem nos dois temas (a folha acompanha o tema).
  const CORES_TEXTO = [
    ["", "Padrão"], ["#d0584a", "Vermelho"], ["#d98b3a", "Laranja"], ["#c49a1c", "Amarelo"], ["#4f9a5a", "Verde"],
    ["#3d7fc7", "Azul"], ["#8a63c9", "Roxo"], ["#c75a93", "Rosa"], ["#7e817b", "Cinza"],
  ];
  const CORES_REALCE = [
    ["", "Nenhum"], ["rgba(250, 204, 21, 0.38)", "Amarelo"], ["rgba(74, 222, 128, 0.32)", "Verde"],
    ["rgba(96, 165, 250, 0.32)", "Azul"], ["rgba(244, 114, 182, 0.32)", "Rosa"], ["rgba(251, 146, 60, 0.34)", "Laranja"],
  ];
  const CAIXAS = [["nota", "Nota"], ["dica", "Dica"], ["importante", "Importante"], ["atencao", "Atenção"]];

  const selBloco = document.getElementById("bloco");
  const selFonte = document.getElementById("fonte");
  const selTamanho = document.getElementById("tamanho");
  const corpo = document.getElementById("corpo");
  const folha = document.getElementById("folha");
  const campoTitulo = document.getElementById("titulo");
  const elEstado = document.getElementById("estado");

  selFonte.innerHTML = FONTES.map((f) => `<option value="${fmt.escape(f.valor)}">${fmt.escape(f.rotulo)}</option>`).join("");
  selTamanho.innerHTML = TAMANHOS.map((t) => `<option value="${t}"${t === 16 ? " selected" : ""}>${t}</option>`).join("");

  // Nas edições formatadas o navegador prefere CSS a <font>, que é o que o
  // sanitizador de UI.htmlSeguro sabe guardar.
  document.execCommand("styleWithCSS", false, true);

  /* ------------------------ Seleção guardada ------------------------------
     Abrir um menu ou digitar num campo (link, busca) tira o cursor do texto.
     A última seleção dentro do resumo fica guardada para os comandos
     voltarem a ela. */

  let faixa = null;
  document.addEventListener("selectionchange", () => {
    const s = getSelection();
    if (s.rangeCount && corpo.contains(s.anchorNode)) {
      faixa = s.getRangeAt(0).cloneRange();
      atualizarBotoes();
    }
  });
  function restaurar() {
    corpo.focus();
    if (faixa && corpo.contains(faixa.startContainer)) {
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(faixa);
    }
  }
  const blocoAtual = () => {
    const s = getSelection();
    let n = s.rangeCount ? s.anchorNode : null;
    if (n && n.nodeType === 3) n = n.parentElement;
    return n && corpo.contains(n) ? n : null;
  };

  function comando(cmd, valor = null) {
    restaurar();
    document.execCommand(cmd, false, valor);
    marcarSujo();
    atualizarBotoes();
  }

  function aplicarFonte(familia) {
    restaurar();
    if (familia) document.execCommand("fontName", false, familia);
    else document.execCommand("removeFormat", false, null);
    marcarSujo();
  }

  /**
   * O execCommand só aceita tamanhos de 1 a 7, nunca pixels. O caminho de
   * sempre: aplicar o tamanho 7 (que vira <font size="7">) e trocar essas
   * marcas pelo tamanho real em CSS.
   */
  function aplicarTamanho(px) {
    restaurar();
    document.execCommand("styleWithCSS", false, false);
    document.execCommand("fontSize", false, "7");
    document.execCommand("styleWithCSS", false, true);
    corpo.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
    });
    marcarSujo();
  }

  /**
   * Cor "Padrão"/"Nenhum": aplica uma cor-marcador e depois tira essa
   * propriedade dos elementos que a receberam — assim o texto volta a seguir
   * o tema (claro ou escuro) em vez de ficar com uma cor fixa.
   */
  function aplicarCor(cmd, cor) {
    restaurar();
    if (cor) { document.execCommand(cmd, false, cor); marcarSujo(); return; }
    document.execCommand(cmd, false, "#010203");
    const prop = cmd === "foreColor" ? "color" : "backgroundColor";
    corpo.querySelectorAll("[style], font[color]").forEach((el) => {
      if (el.tagName === "FONT" && /^#010203$/i.test(el.getAttribute("color") || "")) el.removeAttribute("color");
      const v = el.style[prop];
      if (v && /rgb\(1, 2, 3\)|#010203/i.test(v)) el.style[prop] = "";
      if (el.getAttribute("style") === "") el.removeAttribute("style");
    });
    marcarSujo();
  }

  /** Acende os botões conforme o trecho onde o cursor está. */
  function atualizarBotoes() {
    document.querySelectorAll("[data-cmd]").forEach((b) => {
      let ativo = false;
      try { ativo = ["undo", "redo", "indent", "outdent", "insertHorizontalRule"].includes(b.dataset.cmd) ? false : document.queryCommandState(b.dataset.cmd); } catch { /* sem seleção */ }
      b.setAttribute("aria-pressed", String(ativo));
    });
    let bloco = "";
    try { bloco = String(document.queryCommandValue("formatBlock") || "").toLowerCase(); } catch { /* nada */ }
    if (["h1", "h2", "h3", "blockquote", "pre"].includes(bloco)) selBloco.value = bloco;
    else selBloco.value = "p";
    const el = blocoAtual();
    document.getElementById("btn-checklist").setAttribute("aria-pressed", String(!!el?.closest("ul.checklist")));
  }

  /* --------------------------------- Menus ---------------------------------
     Um menu por vez, abaixo do botão; clicar fora ou Esc fecha. Os botões dos
     menus agem no mousedown, para não tirar a seleção do texto. */

  let menuAberto = null;
  function fecharMenu() {
    menuAberto?.el.remove();
    menuAberto?.botao.setAttribute("aria-expanded", "false");
    menuAberto = null;
  }
  function abrirMenu(botao, html, aoEscolher, classe = "") {
    if (menuAberto?.botao === botao) return fecharMenu();
    fecharMenu();
    const el = document.createElement("div");
    el.className = `editor-menu ${classe}`;
    el.innerHTML = html;
    document.body.appendChild(el);
    const r = botao.getBoundingClientRect();
    const larg = el.offsetWidth;
    el.style.left = `${Math.max(8, Math.min(r.left + scrollX, scrollX + innerWidth - larg - 8))}px`;
    el.style.top = `${r.bottom + scrollY + 6}px`;
    botao.setAttribute("aria-expanded", "true");
    menuAberto = { el, botao };
    el.addEventListener("mousedown", (ev) => {
      const item = ev.target.closest("[data-valor]");
      if (!item || item.tagName === "INPUT") return;
      ev.preventDefault();
      aoEscolher(item.dataset.valor, item);
    });
    return el;
  }
  document.addEventListener("mousedown", (ev) => {
    if (menuAberto && !menuAberto.el.contains(ev.target) && !menuAberto.botao.contains(ev.target)) fecharMenu();
  });

  const item = (valor, rotulo, extra = "") => `<button type="button" class="editor-menu-item" data-valor="${fmt.escape(valor)}">${extra}${fmt.escape(rotulo)}</button>`;

  const MENUS = {
    cor(b) {
      abrirMenu(b, `<div class="menu-titulo">Cor do texto</div><div class="paleta">${CORES_TEXTO.map(([c, r]) =>
        `<button type="button" class="amostra ${c ? "" : "vazia"}" data-valor="${c}" title="${r}" aria-label="${r}" style="${c ? `--c:${c}` : ""}"></button>`).join("")}</div>`,
      (v) => {
        aplicarCor("foreColor", v);
        document.getElementById("faixa-cor").style.background = v || "";
        fecharMenu();
      });
    },
    realce(b) {
      abrirMenu(b, `<div class="menu-titulo">Marca-texto</div><div class="paleta">${CORES_REALCE.map(([c, r]) =>
        `<button type="button" class="amostra realce ${c ? "" : "vazia"}" data-valor="${c}" title="${r}" aria-label="${r}" style="${c ? `--c:${c}` : ""}"></button>`).join("")}</div>`,
      (v) => {
        aplicarCor("hiliteColor", v);
        document.getElementById("faixa-realce").style.background = v || "";
        fecharMenu();
      });
    },
    alinhar(b) {
      abrirMenu(b, [["justifyLeft", "À esquerda", "alinhar-esq"], ["justifyCenter", "Centralizado", "alinhar-centro"], ["justifyRight", "À direita", "alinhar-dir"], ["justifyFull", "Justificado", "alinhar-just"]]
        .map(([c, r, i]) => item(c, r, iconeEd(i))).join(""),
      (v) => { comando(v); fecharMenu(); });
    },
    destaque(b) {
      abrirMenu(b, `<div class="menu-titulo">Caixa de destaque</div>${CAIXAS.map(([v, r]) => item(v, r, `<i class="bolinha-caixa" data-tipo="${v}"></i>`)).join("")}`,
      (v) => { inserirCaixa(v); fecharMenu(); });
    },
    tabela(b) {
      const dentro = blocoAtual()?.closest("table");
      const grade = [];
      for (let l = 1; l <= 6; l++) for (let c = 1; c <= 6; c++) grade.push(`<button type="button" class="celula-grade" data-valor="${l}x${c}" data-l="${l}" data-c="${c}" aria-label="${l} por ${c}"></button>`);
      const el = abrirMenu(b, `<div class="menu-titulo">Inserir tabela <span data-medida>3 × 3</span></div><div class="grade-tabela">${grade.join("")}</div>
        ${dentro ? `<div class="menu-sep"></div>${[["linha-acima", "Linha acima"], ["linha-abaixo", "Linha abaixo"], ["coluna-esq", "Coluna à esquerda"], ["coluna-dir", "Coluna à direita"], ["tirar-linha", "Excluir linha"], ["tirar-coluna", "Excluir coluna"], ["tirar-tabela", "Excluir tabela"]].map(([v, r]) => item(v, r)).join("")}` : ""}`,
      (v) => { mexerTabela(v); fecharMenu(); }, "menu-tabela");
      el.addEventListener("mouseover", (ev) => {
        const c = ev.target.closest(".celula-grade");
        if (!c) return;
        const L = Number(c.dataset.l);
        const C = Number(c.dataset.c);
        el.querySelectorAll(".celula-grade").forEach((x) => x.classList.toggle("ativa", Number(x.dataset.l) <= L && Number(x.dataset.c) <= C));
        el.querySelector("[data-medida]").textContent = `${L} × ${C}`;
      });
    },
    folha(b) {
      const f = folhaAtual();
      const grupo = (chave, titulo, ops) => `<div class="menu-titulo">${titulo}</div><div class="menu-seg">${ops.map(([v, r]) =>
        `<button type="button" data-valor="${chave}:${v}" aria-pressed="${String(f[chave] === v)}">${r}</button>`).join("")}</div>`;
      abrirMenu(b, grupo("largura", "Largura", [["estreita", "Estreita"], ["normal", "Normal"], ["larga", "Larga"]])
        + grupo("papel", "Papel", [["tema", "Do tema"], ["sepia", "Sépia"], ["claro", "Branco"]])
        + grupo("linhas", "Entrelinhas", [["compacta", "Justas"], ["normal", "Normais"], ["arejada", "Arejadas"]]),
      (v, el) => {
        const [k, val] = v.split(":");
        definirFolha({ [k]: val });
        el.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === el)));
      }, "menu-folha");
    },
    exportar(b) {
      abrirMenu(b, [["imprimir", "Imprimir ou salvar em PDF", "arquivo"], ["word", "Baixar para o Word (.doc)", "exportar"], ["txt", "Baixar só o texto (.txt)", "exportar"], ["copiar", "Copiar o texto", "check"]]
        .map(([v, r, i]) => item(v, r, UI.icone(i))).join(""),
      (v) => { fecharMenu(); exportar(v); });
    },
  };
  document.querySelectorAll("[data-menu]").forEach((b) => {
    b.addEventListener("mousedown", (ev) => { ev.preventDefault(); MENUS[b.dataset.menu]?.(b); });
  });

  /* ------------------------------ Blocos próprios ------------------------------ */

  function inserirCaixa(tipo) {
    restaurar();
    const sel = getSelection();
    const texto = sel.rangeCount && !sel.isCollapsed ? fmt.escape(sel.toString()) : "";
    // O rótulo ("Atenção", "Dica"…) vem do CSS pelo data-tipo; o conteúdo é só o texto.
    document.execCommand("insertHTML", false,
      `<div class="callout" data-tipo="${tipo}"><p data-nova-caixa="1">${texto || "<br>"}</p></div><p><br></p>`);
    const p = corpo.querySelector("[data-nova-caixa]");
    if (p) {
      p.removeAttribute("data-nova-caixa");
      const r = document.createRange();
      r.selectNodeContents(p);
      r.collapse(false);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
    marcarSujo();
  }

  /** Lista de tarefas nova, sem se fundir com uma lista vizinha. */
  function novaChecklist() {
    document.execCommand("insertHTML", false, '<ul class="checklist"><li data-novo-item="1"><br></li></ul>');
    const li = corpo.querySelector("[data-novo-item]");
    if (!li) return;
    li.removeAttribute("data-novo-item");
    const r = document.createRange();
    r.setStart(li, 0);
    r.collapse(true);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }

  function alternarChecklist() {
    restaurar();
    let ul = blocoAtual()?.closest("ul");
    if (ul && ul.classList.contains("checklist")) {
      ul.classList.remove("checklist");
      ul.querySelectorAll("li[data-feito]").forEach((li) => li.removeAttribute("data-feito"));
    } else {
      if (!ul) { document.execCommand("insertUnorderedList"); ul = blocoAtual()?.closest("ul"); }
      ul?.classList.add("checklist");
    }
    marcarSujo();
    atualizarBotoes();
  }

  // Tocar na caixinha (a margem à esquerda do item) marca e desmarca.
  corpo.addEventListener("mousedown", (ev) => {
    const li = ev.target.closest("ul.checklist > li");
    if (!li) return;
    const r = li.getBoundingClientRect();
    if (ev.clientX > r.left + 26) return; // a caixinha fica na margem esquerda do item (::before)
    ev.preventDefault();
    if (li.dataset.feito) li.removeAttribute("data-feito"); else li.dataset.feito = "1";
    marcarSujo();
  });

  function mexerTabela(acao) {
    restaurar();
    if (/^\d+x\d+$/.test(acao)) {
      const [L, C] = acao.split("x").map(Number);
      const linha = (tag) => `<tr>${Array.from({ length: C }, () => `<${tag}><br></${tag}>`).join("")}</tr>`;
      document.execCommand("insertHTML", false,
        `<table class="tabela-resumo"><thead>${linha("th")}</thead><tbody>${Array.from({ length: Math.max(1, L - 1) }, () => linha("td")).join("")}</tbody></table><p><br></p>`);
      marcarSujo();
      return;
    }
    const cel = blocoAtual()?.closest("td, th");
    const tabela = cel?.closest("table");
    if (!tabela) return;
    const tr = cel.parentElement;
    const idx = [...tr.children].indexOf(cel);
    const novaLinha = () => { const n = document.createElement("tr"); [...tr.children].forEach(() => { const td = document.createElement("td"); td.innerHTML = "<br>"; n.appendChild(td); }); return n; };
    if (acao === "linha-acima") (tr.parentElement.tagName === "THEAD" ? tabela.tBodies[0]?.prepend(novaLinha()) : tr.before(novaLinha()));
    if (acao === "linha-abaixo") (tr.parentElement.tagName === "THEAD" ? tabela.tBodies[0]?.prepend(novaLinha()) : tr.after(novaLinha()));
    if (acao === "coluna-esq" || acao === "coluna-dir") {
      tabela.querySelectorAll("tr").forEach((linha) => {
        const ref = linha.children[idx];
        const nova = document.createElement(ref?.tagName === "TH" ? "th" : "td");
        nova.innerHTML = "<br>";
        if (!ref) linha.appendChild(nova); else if (acao === "coluna-esq") ref.before(nova); else ref.after(nova);
      });
    }
    if (acao === "tirar-linha") { tr.remove(); if (!tabela.querySelector("tr")) tabela.remove(); }
    if (acao === "tirar-coluna") { tabela.querySelectorAll("tr").forEach((linha) => linha.children[idx]?.remove()); if (!tabela.querySelector("td, th")) tabela.remove(); }
    if (acao === "tirar-tabela") tabela.remove();
    marcarSujo();
  }

  /* ---------------------------------- Link ---------------------------------- */

  function abrirLink() {
    const botao = document.getElementById("btn-link");
    const atual = blocoAtual()?.closest("a")?.getAttribute("href") || "";
    const el = abrirMenu(botao, `<div class="menu-titulo">Link</div>
      <input class="input sm" data-url placeholder="https://…" value="${fmt.escape(atual)}" />
      <div class="menu-acoes-linha">
        ${atual ? item("tirar", "Tirar o link") : ""}
        <button type="button" class="btn primary sm" data-valor="ok">Aplicar</button>
      </div>`,
    (v) => {
      if (v === "tirar") { comando("unlink"); fecharMenu(); return; }
      aplicar();
    }, "menu-link");
    const campo = el.querySelector("[data-url]");
    campo.focus();
    campo.select();
    function aplicar() {
      let url = campo.value.trim();
      if (url && !/^(https?:|mailto:)/i.test(url)) url = /@/.test(url) && !/\//.test(url) ? `mailto:${url}` : `https://${url}`;
      fecharMenu();
      if (!url) return;
      restaurar();
      const s = getSelection();
      if (s.isCollapsed) document.execCommand("insertHTML", false, `<a href="${fmt.escape(url)}">${fmt.escape(url.replace(/^mailto:|^https?:\/\//, ""))}</a>&nbsp;`);
      else document.execCommand("createLink", false, url);
      corpo.querySelectorAll("a[href]").forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
      marcarSujo();
    }
    campo.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") { ev.preventDefault(); aplicar(); }
      if (ev.key === "Escape") { fecharMenu(); restaurar(); }
    });
  }
  // Ctrl+clique (ou clique com o texto sem foco) abre o link numa aba nova.
  corpo.addEventListener("click", (ev) => {
    const a = ev.target.closest("a[href]");
    if (a && (ev.ctrlKey || ev.metaKey)) window.open(a.href, "_blank", "noopener");
  });

  /* -------------------------------- Imagens --------------------------------
     Uma imagem inserida no editor vira um anexo no IndexedDB (mesmo lugar
     dos documentos), mas fica de fora da lista de "Documentos" — não é isso
     que o usuário está pedindo ao colar uma foto do quadro no meio do texto.
     Por isso ela não entra em resumo.anexos: quem sabe quais imagens existem
     é o próprio HTML (<img data-anexo-id>), lido sob demanda. */

  const idsImagensEm = UI.idsImagensEm;

  async function inserirImagem(arquivo) {
    if (!arquivo || !arquivo.type.startsWith("image/")) {
      if (arquivo) UI.toast("Só imagens podem ser inseridas no texto.");
      return;
    }
    let anexo;
    try {
      anexo = await Arquivos.salvar(arquivo);
    } catch (err) {
      UI.toast(err.message);
      return;
    }
    restaurar();
    const url = URL.createObjectURL(arquivo);
    document.execCommand("insertHTML", false,
      `<img src="${url}" data-anexo-id="${fmt.escape(anexo.id)}" alt="${fmt.escape(arquivo.name)}" class="img-g">`);
    marcarSujo();
  }

  function posicionarCursorEm(x, y) {
    let f = null;
    if (document.caretRangeFromPoint) {
      f = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) { f = document.createRange(); f.setStart(pos.offsetNode, pos.offset); }
    }
    if (!f) return corpo.focus();
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(f);
    corpo.focus();
  }

  // Clicar numa imagem mostra a barrinha de tamanho e posição dela.
  const barraImg = document.getElementById("img-barra");
  let imgSel = null;
  function mostrarBarraImg(img) {
    imgSel = img;
    corpo.querySelectorAll("img.selecionada").forEach((x) => x.classList.remove("selecionada"));
    if (!img) { barraImg.hidden = true; return; }
    img.classList.add("selecionada");
    barraImg.hidden = false;
    const r = img.getBoundingClientRect();
    barraImg.style.left = `${Math.max(8, r.left + scrollX + r.width / 2 - barraImg.offsetWidth / 2)}px`;
    barraImg.style.top = `${Math.max(8, r.top + scrollY - barraImg.offsetHeight - 8)}px`;
    barraImg.querySelectorAll("[data-img]").forEach((b) => b.setAttribute("aria-pressed", String(img.classList.contains(b.dataset.img))));
  }
  corpo.addEventListener("click", (ev) => mostrarBarraImg(ev.target.tagName === "IMG" ? ev.target : null));
  barraImg.addEventListener("mousedown", (ev) => {
    const b = ev.target.closest("[data-img]");
    if (!b || !imgSel) return;
    ev.preventDefault();
    const v = b.dataset.img;
    if (v === "remover") { imgSel.remove(); mostrarBarraImg(null); marcarSujo(); return; }
    if (v === "img-c") imgSel.classList.toggle("img-c");
    else { imgSel.classList.remove("img-p", "img-m", "img-g"); imgSel.classList.add(v); }
    marcarSujo();
    mostrarBarraImg(imgSel);
  });

  /* ------------------------ Atalhos de digitação ------------------------------ */

  const textoAteOCursor = () => {
    const s = getSelection();
    if (!s.rangeCount || !s.isCollapsed) return null;
    const bloco = blocoAtual()?.closest("p, div, h1, h2, h3, li, blockquote") || corpo;
    const r = document.createRange();
    r.selectNodeContents(bloco);
    r.setEnd(s.anchorNode, s.anchorOffset);
    return { texto: r.toString(), faixa: r, bloco };
  };
  function apagarGatilho(r) {
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    document.execCommand("delete");
  }
  corpo.addEventListener("input", (ev) => {
    if (ev.inputType !== "insertText" || ev.data !== " ") return;
    const t = textoAteOCursor();
    if (!t || t.bloco.closest("pre, li")) return;
    const g = t.texto.replace(/ /g, " ");
    const regras = [
      [/^#{1} $/, () => document.execCommand("formatBlock", false, "<h1>")],
      [/^#{2} $/, () => document.execCommand("formatBlock", false, "<h2>")],
      [/^#{3} $/, () => document.execCommand("formatBlock", false, "<h3>")],
      [/^[-*] $/, () => document.execCommand("insertUnorderedList")],
      [/^1[.)] $/, () => document.execCommand("insertOrderedList")],
      [/^\[ ?\] $/, novaChecklist],
      [/^> $/, () => document.execCommand("formatBlock", false, "<blockquote>")],
    ];
    const regra = regras.find(([re]) => re.test(g));
    if (!regra) return;
    apagarGatilho(t.faixa);
    regra[1]();
    marcarSujo();
    atualizarBotoes();
  });

  corpo.addEventListener("keydown", (ev) => {
    // "---" + Enter vira divisor.
    if (ev.key === "Enter" && !ev.shiftKey) {
      const t = textoAteOCursor();
      if (t && /^-{3,}$/.test(t.texto.trim()) && !t.bloco.closest("li, pre")) {
        ev.preventDefault();
        apagarGatilho(t.faixa);
        document.execCommand("insertHorizontalRule");
        marcarSujo();
        return;
      }
      // Item novo de checklist nasce desmarcado.
      setTimeout(() => {
        const li = blocoAtual()?.closest("ul.checklist > li");
        if (li && !li.textContent.trim()) li.removeAttribute("data-feito");
      }, 0);
    }
    // Tab dentro de lista aumenta (Shift+Tab diminui) o nível.
    if (ev.key === "Tab" && blocoAtual()?.closest("li")) {
      ev.preventDefault();
      document.execCommand(ev.shiftKey ? "outdent" : "indent");
      marcarSujo();
    }
  });

  /* ---------------------------- Buscar e substituir ----------------------------- */

  const painelBusca = document.getElementById("painel-busca");
  const inpBusca = document.getElementById("busca-termo");
  const inpTroca = document.getElementById("busca-troca");
  const elBuscaN = document.getElementById("busca-n");
  let achados = [];
  let atual = -1;

  function procurar() {
    achados = [];
    const termo = inpBusca.value;
    if (termo) {
      const alvo = termo.toLocaleLowerCase("pt-BR");
      const w = document.createTreeWalker(corpo, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const t = n.textContent.toLocaleLowerCase("pt-BR");
        let i = t.indexOf(alvo);
        while (i !== -1) {
          const r = document.createRange();
          r.setStart(n, i);
          r.setEnd(n, i + termo.length);
          achados.push(r);
          i = t.indexOf(alvo, i + Math.max(1, termo.length));
        }
      }
    }
    if (window.CSS?.highlights && typeof Highlight === "function") {
      CSS.highlights.set("busca-resumo", new Highlight(...achados));
    }
    atual = achados.length ? Math.min(Math.max(atual, 0), achados.length - 1) : -1;
    elBuscaN.textContent = !termo ? "" : achados.length ? `${atual + 1} de ${achados.length}` : "nada encontrado";
  }
  function irPara(i) {
    if (!achados.length) return;
    atual = (i + achados.length) % achados.length;
    const r = achados[atual];
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    r.startContainer.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
    if (window.CSS?.highlights && typeof Highlight === "function") CSS.highlights.set("busca-atual", new Highlight(r));
    elBuscaN.textContent = `${atual + 1} de ${achados.length}`;
  }
  function abrirBusca() {
    painelBusca.hidden = false;
    const s = getSelection();
    if (s.rangeCount && !s.isCollapsed && corpo.contains(s.anchorNode) && s.toString().length < 60) inpBusca.value = s.toString();
    inpBusca.focus();
    inpBusca.select();
    procurar();
  }
  function fecharBusca() {
    painelBusca.hidden = true;
    window.CSS?.highlights?.delete("busca-resumo");
    window.CSS?.highlights?.delete("busca-atual");
    restaurar();
  }
  inpBusca.addEventListener("input", () => { atual = 0; procurar(); });
  inpBusca.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") { ev.preventDefault(); procurar(); irPara(ev.shiftKey ? atual - 1 : atual + (achados[atual] && getSelection().toString() ? 1 : 0)); }
    if (ev.key === "Escape") fecharBusca();
  });
  inpTroca.addEventListener("keydown", (ev) => { if (ev.key === "Escape") fecharBusca(); });
  document.getElementById("busca-prox").addEventListener("click", () => { procurar(); irPara(atual + 1); });
  document.getElementById("busca-trocar").addEventListener("click", () => {
    procurar();
    if (!achados.length) return;
    const r = achados[Math.max(atual, 0)];
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    corpo.focus();
    document.execCommand("insertText", false, inpTroca.value);
    marcarSujo();
    procurar();
    irPara(atual);
  });
  document.getElementById("busca-todos").addEventListener("click", () => {
    procurar();
    const n = achados.length;
    if (!n) return;
    // Do fim para o começo, para as posições que faltam não mudarem.
    [...achados].reverse().forEach((r) => { r.deleteContents(); r.insertNode(document.createTextNode(inpTroca.value)); });
    corpo.normalize();
    marcarSujo();
    procurar();
    UI.toast(`${n} ${n === 1 ? "trecho substituído" : "trechos substituídos"}.`);
  });
  document.getElementById("busca-fechar").addEventListener("click", fecharBusca);
  document.getElementById("btn-buscar").addEventListener("click", () => (painelBusca.hidden ? abrirBusca() : fecharBusca()));

  /* --------------------------------- Sumário --------------------------------- */

  const painelSumario = document.getElementById("sumario");
  const listaSumario = document.getElementById("sumario-lista");
  function desenharSumario() {
    if (painelSumario.hidden) return;
    const titulos = [...corpo.querySelectorAll("h1, h2, h3")].filter((h) => h.textContent.trim());
    listaSumario.innerHTML = titulos.length
      ? titulos.map((h, i) => `<li class="nivel-${h.tagName[1]}"><button type="button" data-ir="${i}">${fmt.escape(h.textContent.trim())}</button></li>`).join("")
      : `<li class="vazio">Use Título 1, 2 ou 3 (ou "# " no começo da linha) e eles aparecem aqui.</li>`;
    listaSumario.onclick = (ev) => {
      const b = ev.target.closest("[data-ir]");
      if (b) titulos[Number(b.dataset.ir)]?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }
  function alternarSumario(forcar) {
    painelSumario.hidden = forcar === undefined ? !painelSumario.hidden : !forcar;
    document.getElementById("btn-sumario").setAttribute("aria-pressed", String(!painelSumario.hidden));
    try { localStorage.setItem("delfos.editor.sumario", painelSumario.hidden ? "0" : "1"); } catch { /* nada */ }
    desenharSumario();
  }
  document.getElementById("btn-sumario").addEventListener("click", () => alternarSumario());

  /* ---------------------------------- Folha ---------------------------------- */

  const FOLHA_PADRAO = { largura: "normal", papel: "tema", linhas: "normal" };
  let folhaEscolhida = { ...FOLHA_PADRAO };
  const folhaAtual = () => folhaEscolhida;
  function aplicarFolha() {
    Object.entries(folhaEscolhida).forEach(([k, v]) => { folha.dataset[k] = v; });
  }
  function definirFolha(patch) {
    folhaEscolhida = { ...folhaEscolhida, ...patch };
    aplicarFolha();
    marcarSujo();
  }

  // Modo foco: só a folha; a barra volta ao passar o mouse no alto da tela.
  document.getElementById("btn-foco").addEventListener("click", () => {
    const ligado = document.body.classList.toggle("modo-foco");
    document.getElementById("btn-foco").setAttribute("aria-pressed", String(ligado));
    if (ligado) UI.toast("Modo foco. Leve o mouse ao alto da tela para ver a barra, ou aperte Esc para sair.");
    corpo.focus();
  });

  /* --------------------------------- Exportar --------------------------------- */

  function nomeArquivo(ext) {
    const base = (campoTitulo.value.trim() || "Resumo").replace(/[\\/:*?"<>|]+/g, "").slice(0, 80);
    return `${base}.${ext}`;
  }
  function baixar(conteudo, tipo, nome) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function htmlComImagens() {
    const copia = document.createElement("div");
    copia.innerHTML = UI.htmlSeguro(corpo.innerHTML);
    // No Word a imagem precisa vir dentro do arquivo (data URL), não do IndexedDB.
    for (const img of copia.querySelectorAll("img[data-anexo-id]")) {
      try {
        const b = await Arquivos.blob({ id: img.dataset.anexoId, tipo: "" });
        if (b) img.src = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); });
        img.style.maxWidth = "100%";
      } catch { /* sem a imagem */ }
    }
    return copia.innerHTML;
  }
  async function exportar(como) {
    const titulo = campoTitulo.value.trim() || "Resumo";
    if (como === "imprimir") { window.print(); return; }
    if (como === "txt") { baixar(`${titulo}\n\n${corpo.innerText}`, "text/plain;charset=utf-8", nomeArquivo("txt")); return; }
    if (como === "copiar") {
      try { await navigator.clipboard.writeText(`${titulo}\n\n${corpo.innerText}`); UI.toast("Texto copiado."); }
      catch { UI.toast("O navegador não deixou copiar. Selecione o texto e use Ctrl+C."); }
      return;
    }
    if (como === "word") {
      const corpoHTML = await htmlComImagens();
      const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${fmt.escape(titulo)}</title>
        <style>body{font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.5}
        .callout{border-left:4px solid #999;padding:6pt 10pt;background:#f3f3f3}
        table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:4pt 6pt}
        ul.checklist li[data-feito]{text-decoration:line-through;color:#777}</style></head>
        <body><h1>${fmt.escape(titulo)}</h1>${corpoHTML}</body></html>`;
      baixar(`﻿${doc}`, "application/msword", nomeArquivo("doc"));
      UI.toast("Arquivo do Word baixado.");
    }
  }

  /* ------------------------------ Salvamento ------------------------------- */

  let sujo = false;
  let salvando = null;
  let sumarioPendente = null;

  function contarPalavras() {
    const texto = corpo.innerText.trim();
    const n = texto ? texto.split(/\s+/).length : 0;
    const chars = texto.replace(/\s/g, "").length;
    const min = Math.max(1, Math.round(n / 200));
    document.getElementById("contagem").textContent = n
      ? `${n} ${n === 1 ? "palavra" : "palavras"}, ${chars.toLocaleString("pt-BR")} caracteres, cerca de ${min} min de leitura`
      : "0 palavras";
  }

  function marcarSujo() {
    sujo = true;
    elEstado.textContent = "alterações não salvas";
    elEstado.className = "editor-estado sujo";
    contarPalavras();
    clearTimeout(salvando);
    salvando = setTimeout(salvar, 2500); // salva sozinho depois da pausa
    clearTimeout(sumarioPendente);
    sumarioPendente = setTimeout(desenharSumario, 400);
  }

  function marcarSalvo() {
    sujo = false;
    elEstado.textContent = "salvo";
    elEstado.className = "editor-estado";
  }

  function salvar({ avisar = false } = {}) {
    clearTimeout(salvando);
    const titulo = campoTitulo.value.trim();
    corpo.querySelectorAll("img.selecionada").forEach((x) => x.classList.remove("selecionada"));
    const conteudo = UI.htmlSeguro(corpo.innerHTML);
    if (imgSel) imgSel.classList.add("selecionada");

    // Resumo em branco não vira registro: sair sem escrever nada não deixa
    // uma linha vazia na disciplina. Uma imagem sozinha, sem texto, já conta
    // como conteúdo.
    if (!titulo && !corpo.innerText.trim() && !corpo.querySelector("img")) {
      if (avisar) UI.toast("Escreva um título ou um texto antes de salvar.");
      return false;
    }

    // Imagem apagada do texto (backspace, selecionar e excluir) some daqui
    // também — senão o arquivo fica esquecido no IndexedDB para sempre.
    const anterior = resumoAtual();
    if (anterior) {
      const antes = new Set(idsImagensEm(anterior.conteudo));
      const depois = new Set(idsImagensEm(conteudo));
      antes.forEach((id) => { if (!depois.has(id)) Arquivos.remover(id); });
    }

    const dados = {
      titulo: titulo || "Sem título",
      conteudo,
      conteudoFormato: "html",
      folha: { ...folhaEscolhida },
      atualizadoEm: UI.hojeISO(),
    };

    if (resumoId && resumoAtual()) {
      Store.subAtualizar(CAMINHO, disciplinaId, "resumos", resumoId, dados);
    } else {
      const novo = Store.subInserir(CAMINHO, disciplinaId, "resumos", { ...dados, anexos: [] });
      resumoId = novo.id;
      // A URL passa a apontar para o resumo criado, então recarregar ou
      // salvar de novo mexe nele em vez de criar outro.
      history.replaceState(null, "", `resumo.html?disciplina=${encodeURIComponent(disciplinaId)}&id=${encodeURIComponent(resumoId)}`);
      document.getElementById("btn-excluir").hidden = false;
    }

    marcarSalvo();
    if (avisar) UI.toast("Resumo salvo.");
    return true;
  }

  async function excluir() {
    if (!resumoId || !resumoAtual()) return (location.href = voltarHref);
    const ok = await UI.confirmar({
      titulo: "Excluir este resumo?",
      descricao: "O texto e os documentos anexados a ele serão apagados.",
      rotuloConfirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    const atualR = resumoAtual();
    const anexos = atualR?.anexos || [];
    const imagens = idsImagensEm(atualR?.conteudo);
    Store.subRemover(CAMINHO, disciplinaId, "resumos", resumoId);
    anexos.forEach((a) => Arquivos.remover(a.id));
    imagens.forEach((id) => Arquivos.remover(id));
    sujo = false;
    location.href = voltarHref;
  }

  /* -------------------------------- Ligações -------------------------------- */

  document.querySelectorAll("[data-cmd]").forEach((b) => {
    // mousedown em vez de click: o clique tiraria o cursor do texto antes de
    // o comando rodar, e a formatação se perderia.
    b.addEventListener("mousedown", (ev) => { ev.preventDefault(); comando(b.dataset.cmd); });
  });

  selBloco.addEventListener("change", () => { restaurar(); document.execCommand("formatBlock", false, `<${selBloco.value}>`); marcarSujo(); atualizarBotoes(); });
  selFonte.addEventListener("change", () => aplicarFonte(selFonte.value));
  selTamanho.addEventListener("change", () => aplicarTamanho(Number(selTamanho.value)));
  document.getElementById("btn-limpar").addEventListener("mousedown", (ev) => {
    ev.preventDefault();
    comando("removeFormat");
  });
  document.getElementById("btn-checklist").addEventListener("mousedown", (ev) => { ev.preventDefault(); alternarChecklist(); });
  document.getElementById("btn-link").addEventListener("mousedown", (ev) => { ev.preventDefault(); abrirLink(); });

  corpo.addEventListener("input", marcarSujo);
  campoTitulo.addEventListener("input", marcarSujo);
  campoTitulo.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); corpo.focus(); } });

  // Clicar no vazio abaixo do texto continua escrevendo, como em qualquer
  // editor — senão a metade de baixo da folha não responde ao clique.
  folha.addEventListener("mousedown", (ev) => {
    if (ev.target !== ev.currentTarget) return;
    ev.preventDefault();
    const f = document.createRange();
    f.selectNodeContents(corpo);
    f.collapse(false);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(f);
    corpo.focus();
  });

  // Colar sempre como texto puro: colar de outra página traria estilos que o
  // sanitizador jogaria fora depois, e a tela mentiria até o próximo
  // carregamento. Exceção: colar uma imagem (print, foto copiada) — aí vira
  // uma imagem de verdade, não texto nenhum.
  corpo.addEventListener("paste", (ev) => {
    const dados = ev.clipboardData || window.clipboardData;
    const itemImagem = [...(dados.items || [])].find((it) => it.kind === "file" && it.type.startsWith("image/"));
    if (itemImagem) {
      ev.preventDefault();
      const arquivo = itemImagem.getAsFile();
      if (arquivo) inserirImagem(arquivo);
      return;
    }
    ev.preventDefault();
    const texto = dados.getData("text/plain");
    // Colar um endereço com texto selecionado vira link naquele texto.
    if (/^https?:\/\/\S+$/.test(texto.trim()) && !getSelection().isCollapsed) {
      document.execCommand("createLink", false, texto.trim());
      corpo.querySelectorAll("a[href]").forEach((a) => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
      marcarSujo();
      return;
    }
    document.execCommand("insertText", false, texto);
  });

  // Arrastar uma imagem de outra janela solta ela no ponto exato do texto.
  corpo.addEventListener("dragover", (ev) => {
    if (![...(ev.dataTransfer?.items || [])].some((it) => it.kind === "file")) return;
    ev.preventDefault();
    corpo.classList.add("dragover");
  });
  corpo.addEventListener("dragleave", () => corpo.classList.remove("dragover"));
  corpo.addEventListener("drop", (ev) => {
    const arquivos = [...(ev.dataTransfer?.files || [])].filter((f) => f.type.startsWith("image/"));
    if (!arquivos.length) return;
    ev.preventDefault();
    corpo.classList.remove("dragover");
    posicionarCursorEm(ev.clientX, ev.clientY);
    arquivos.forEach(inserirImagem);
  });

  document.getElementById("btn-imagem").addEventListener("mousedown", (ev) => ev.preventDefault());
  document.getElementById("btn-imagem").addEventListener("click", () => document.getElementById("f-imagem").click());
  document.getElementById("f-imagem").addEventListener("change", (ev) => {
    const arquivo = ev.target.files[0];
    ev.target.value = "";
    if (arquivo) inserirImagem(arquivo);
  });

  document.getElementById("btn-salvar").addEventListener("click", () => salvar({ avisar: true }));
  document.getElementById("btn-excluir").addEventListener("click", excluir);

  document.addEventListener("keydown", (ev) => {
    const mod = ev.ctrlKey || ev.metaKey;
    const k = ev.key.toLowerCase();
    if (mod && k === "s") { ev.preventDefault(); salvar({ avisar: true }); return; }
    if (mod && k === "f") { ev.preventDefault(); abrirBusca(); return; }
    if (mod && k === "k" && corpo.contains(getSelection().anchorNode)) { ev.preventDefault(); abrirLink(); return; }
    if (mod && ev.altKey && ["1", "2", "3", "0"].includes(ev.key)) {
      ev.preventDefault();
      restaurar();
      document.execCommand("formatBlock", false, ev.key === "0" ? "<p>" : `<h${ev.key}>`);
      marcarSujo();
      atualizarBotoes();
      return;
    }
    if (ev.key === "Escape") {
      if (menuAberto) { fecharMenu(); restaurar(); return; }
      if (!painelBusca.hidden) { fecharBusca(); return; }
      if (document.body.classList.contains("modo-foco")) document.getElementById("btn-foco").click();
    }
  });

  window.addEventListener("beforeunload", (ev) => {
    if (!sujo) return;
    salvar();
    if (sujo) { ev.preventDefault(); ev.returnValue = ""; }
  });

  /* ------------------------------ Carga inicial ----------------------------- */

  const existente = resumoAtual();
  if (existente) {
    document.title = `${existente.titulo} · ${UI.NOME}`;
    campoTitulo.value = existente.titulo || "";
    corpo.innerHTML = UI.htmlSeguro(existente.conteudo || "");
    folhaEscolhida = { ...FOLHA_PADRAO, ...(existente.folha || {}) };
    UI.resolverImagens(corpo);
    marcarSalvo();
  } else {
    resumoId = "";
    document.getElementById("btn-excluir").hidden = true;
    elEstado.textContent = "resumo novo";
    campoTitulo.focus();
  }
  aplicarFolha();
  try { if (localStorage.getItem("delfos.editor.sumario") === "1") alternarSumario(true); } catch { /* nada */ }

  contarPalavras();
  atualizarBotoes();
})();
