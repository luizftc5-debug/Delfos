/* Editor de resumos — página inteira, sem barra lateral, só o texto.
   Abre a partir da página de uma disciplina ou da seção Resumos de uma aba:
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
  const contexto = Resumos.resolver(new URLSearchParams(location.search));
  const CAMINHO = contexto?.caminho;
  const disciplinaId = contexto?.id;
  let resumoId = UI.parametro("id");
  UI.aplicarAparencia?.();
  UI.realcarBotoes?.(document);
  const assinatura = document.querySelector(".editor-rodape .marca");
  if (assinatura) assinatura.innerHTML = UI.logotipo();

  const disciplina = contexto?.obter();

  if (!disciplina) {
    document.getElementById("editor-raiz").innerHTML =
      `<div class="editor-folha"><div class="card" style="margin-top:40px;"></div></div>`;
    document.querySelector(".card").appendChild(
      UI.vazio({
        icone: "◌",
        titulo: "Espaço de resumos não encontrado",
        texto: "Volte à sua aba e abra o resumo por lá. Seus textos continuam guardados na aba em que foram criados.",
        rotuloAcao: "Voltar às minhas abas",
        aoAcionar: () => (location.href = "index.html"),
      })
    );
    return;
  }

  const voltarHref = contexto.href;
  document.getElementById("voltar").href = voltarHref;
  document.getElementById("voltar-nome").textContent = disciplina.nome;

  const resumoAtual = () =>
    contexto.lista().find((r) => r.id === resumoId) || null;

  /* --------------------------------- Ícones --------------------------------
     Os do painel (UI.icone) e alguns próprios do editor, no mesmo traço. */

  // Ícones da barra do editor: Phosphor (regular, MIT), como os de ui.js.
  const ICONES_ED = {
    desfazer: '<path d="M232,144a64.07,64.07,0,0,1-64,64H80a8,8,0,0,1,0-16h88a48,48,0,0,0,0-96H51.31l34.35,34.34a8,8,0,0,1-11.32,11.32l-48-48a8,8,0,0,1,0-11.32l48-48A8,8,0,0,1,85.66,45.66L51.31,80H168A64.07,64.07,0,0,1,232,144Z"/>',
    "refazer-ed": '<path d="M170.34,130.34,204.69,96H88a48,48,0,0,0,0,96h88a8,8,0,0,1,0,16H88A64,64,0,0,1,88,80H204.69L170.34,45.66a8,8,0,0,1,11.32-11.32l48,48a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32-11.32Z"/>',
    lista: '<path d="M80,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H88A8,8,0,0,1,80,64Zm136,56H88a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm0,64H88a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM44,52A12,12,0,1,0,56,64,12,12,0,0,0,44,52Zm0,64a12,12,0,1,0,12,12A12,12,0,0,0,44,116Zm0,64a12,12,0,1,0,12,12A12,12,0,0,0,44,180Z"/>',
    "lista-num": '<path d="M224,128a8,8,0,0,1-8,8H104a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM104,72H216a8,8,0,0,0,0-16H104a8,8,0,0,0,0,16ZM216,184H104a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM43.58,55.16,48,52.94V104a8,8,0,0,0,16,0V40a8,8,0,0,0-11.58-7.16l-16,8a8,8,0,0,0,7.16,14.32ZM79.77,156.72a23.73,23.73,0,0,0-9.6-15.95,24.86,24.86,0,0,0-34.11,4.7,23.63,23.63,0,0,0-3.57,6.46,8,8,0,1,0,15,5.47,7.84,7.84,0,0,1,1.18-2.13,8.76,8.76,0,0,1,12-1.59A7.91,7.91,0,0,1,63.93,159a7.64,7.64,0,0,1-1.57,5.78,1,1,0,0,0-.08.11L33.59,203.21A8,8,0,0,0,40,216H72a8,8,0,0,0,0-16H56l19.08-25.53A23.47,23.47,0,0,0,79.77,156.72Z"/>',
    checklist: '<path d="M224,128a8,8,0,0,1-8,8H128a8,8,0,0,1,0-16h88A8,8,0,0,1,224,128ZM128,72h88a8,8,0,0,0,0-16H128a8,8,0,0,0,0,16Zm88,112H128a8,8,0,0,0,0,16h88a8,8,0,0,0,0-16ZM82.34,42.34,56,68.69,45.66,58.34A8,8,0,0,0,34.34,69.66l16,16a8,8,0,0,0,11.32,0l32-32A8,8,0,0,0,82.34,42.34Zm0,64L56,132.69,45.66,122.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Zm0,64L56,196.69,45.66,186.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Z"/>',
    "alinhar-esq": '<path d="M32,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H40A8,8,0,0,1,32,64Zm8,48H168a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Zm176,24H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm-48,40H40a8,8,0,0,0,0,16H168a8,8,0,0,0,0-16Z"/>',
    "alinhar-centro": '<path d="M32,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H40A8,8,0,0,1,32,64ZM64,96a8,8,0,0,0,0,16H192a8,8,0,0,0,0-16Zm152,40H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm-24,40H64a8,8,0,0,0,0,16H192a8,8,0,0,0,0-16Z"/>',
    "alinhar-dir": '<path d="M32,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H40A8,8,0,0,1,32,64ZM216,96H88a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm0,40H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm0,40H88a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"/>',
    "alinhar-just": '<path d="M32,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H40A8,8,0,0,1,32,64ZM216,96H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm0,40H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm0,40H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"/>',
    "recuo-mais": '<path d="M224,128a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM112,72H216a8,8,0,0,0,0-16H112a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM34.34,141.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0,0-11.32l-40-40A8,8,0,0,0,34.34,61.66L68.69,96,34.34,130.34A8,8,0,0,0,34.34,141.66Z"/>',
    "recuo-menos": '<path d="M224,128a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM112,72H216a8,8,0,0,0,0-16H112a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM72,144a8,8,0,0,0,5.66-13.66L43.31,96,77.66,61.66A8,8,0,0,0,66.34,50.34l-40,40a8,8,0,0,0,0,11.32l40,40A8,8,0,0,0,72,144Z"/>',
    link: '<path d="M165.66,90.34a8,8,0,0,1,0,11.32l-64,64a8,8,0,0,1-11.32-11.32l64-64A8,8,0,0,1,165.66,90.34ZM215.6,40.4a56,56,0,0,0-79.2,0L106.34,70.45a8,8,0,0,0,11.32,11.32l30.06-30a40,40,0,0,1,56.57,56.56l-30.07,30.06a8,8,0,0,0,11.31,11.32L215.6,119.6a56,56,0,0,0,0-79.2ZM138.34,174.22l-30.06,30.06a40,40,0,1,1-56.56-56.57l30.05-30.05a8,8,0,0,0-11.32-11.32L40.4,136.4a56,56,0,0,0,79.2,79.2l30.06-30.07a8,8,0,0,0-11.32-11.31Z"/>',
    imagem: '<path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z"/>',
    tabela: '<path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM40,112H80v32H40Zm56,0H216v32H96ZM216,64V96H40V64ZM40,160H80v32H40Zm176,32H96V160H216v32Z"/>',
    caixa: '<path d="M88,96a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,96Zm8,40h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16Zm32,16H96a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16ZM224,48V156.69A15.86,15.86,0,0,1,219.31,168L168,219.31A15.86,15.86,0,0,1,156.69,224H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM48,208H152V160a8,8,0,0,1,8-8h48V48H48Zm120-40v28.7L196.69,168Z"/>',
    divisor: '<path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z"/>',
    limpar: '<path d="M225,80.4,183.6,39a24,24,0,0,0-33.94,0L31,157.66a24,24,0,0,0,0,33.94l30.06,30.06A8,8,0,0,0,66.74,224H216a8,8,0,0,0,0-16h-84.7L225,114.34A24,24,0,0,0,225,80.4ZM108.68,208H70.05L42.33,180.28a8,8,0,0,1,0-11.31L96,115.31,148.69,168Zm105-105L160,156.69,107.31,104,161,50.34a8,8,0,0,1,11.32,0l41.38,41.38a8,8,0,0,1,0,11.31Z"/>',
    "marca-texto": '<path d="M253.66,106.34a8,8,0,0,0-11.32,0L192,156.69,107.31,72l50.35-50.34a8,8,0,1,0-11.32-11.32L96,60.69A16,16,0,0,0,93.18,79.5L72,100.69a16,16,0,0,0,0,22.62L76.69,128,18.34,186.34a8,8,0,0,0,3.13,13.25l72,24A7.88,7.88,0,0,0,96,224a8,8,0,0,0,5.66-2.34L136,187.31l4.69,4.69a16,16,0,0,0,22.62,0l21.19-21.18A16,16,0,0,0,203.31,168l50.35-50.34A8,8,0,0,0,253.66,106.34ZM93.84,206.85l-55-18.35L88,139.31,124.69,176ZM152,180.69,83.31,112,104,91.31,172.69,160Z"/>',
    sumario: '<path d="M88,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H96A8,8,0,0,1,88,64Zm128,56H96a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm0,64H96a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM56,56H40a8,8,0,0,0,0,16H56a8,8,0,0,0,0-16Zm0,64H40a8,8,0,0,0,0,16H56a8,8,0,0,0,0-16Zm0,64H40a8,8,0,0,0,0,16H56a8,8,0,0,0,0-16Z"/>',
    folha: '<path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"/>',
    foco: '<path d="M216,48V88a8,8,0,0,1-16,0V56H168a8,8,0,0,1,0-16h40A8,8,0,0,1,216,48ZM88,200H56V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H88a8,8,0,0,0,0-16Zm120-40a8,8,0,0,0-8,8v32H168a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,208,160ZM88,40H48a8,8,0,0,0-8,8V88a8,8,0,0,0,16,0V56H88a8,8,0,0,0,0-16Z"/>',
  };
  function iconeEd(nome) {
    if (ICONES_ED[nome]) return `<svg class="ico" data-ico="${nome}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${ICONES_ED[nome]}</svg>`;
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
  const exportacao = EditorExportar.instalar({ titulo: () => campoTitulo.value, corpo });

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
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", botao.getAttribute("aria-label") || botao.title || "Opções");
    document.body.appendChild(el);
    const r = botao.getBoundingClientRect();
    const larg = el.offsetWidth;
    el.style.left = `${Math.max(8, Math.min(r.left + scrollX, scrollX + innerWidth - larg - 8))}px`;
    el.style.top = `${r.bottom + scrollY + 6}px`;
    botao.setAttribute("aria-expanded", "true");
    menuAberto = { el, botao };
    const escolher = (ev) => {
      const item = ev.target.closest("[data-valor]");
      if (!item || item.tagName === "INPUT") return;
      ev.preventDefault();
      aoEscolher(item.dataset.valor, item);
    };
    el.addEventListener("mousedown", escolher);
    el.addEventListener("click", (ev) => { if (ev.detail === 0) escolher(ev); });
    return el;
  }
  document.addEventListener("mousedown", (ev) => {
    if (menuAberto && !menuAberto.el.contains(ev.target) && !menuAberto.botao.contains(ev.target)) fecharMenu();
  });

  const item = (valor, rotulo, extra = "") => `<button type="button" class="editor-menu-item" data-valor="${fmt.escape(valor)}">${extra}${fmt.escape(rotulo)}</button>`;

  const SIMBOLOS = [
    ["Mais usados", [["°", "Grau"], ["º", "Ordinal masculino"], ["ª", "Ordinal feminino"], ["±", "Mais ou menos"], ["×", "Multiplicação"], ["÷", "Divisão"], ["µ", "Micro"], ["%", "Porcentagem"], ["‰", "Por mil"], ["℃", "Grau Celsius"]]],
    ["Setas", [["←", "Seta à esquerda"], ["↑", "Seta para cima"], ["→", "Seta à direita"], ["↓", "Seta para baixo"], ["↔", "Seta nos dois sentidos"], ["↗", "Seta diagonal"], ["⇒", "Implica"], ["⇔", "Equivalência"]]],
    ["Matemática", [["≤", "Menor ou igual"], ["≥", "Maior ou igual"], ["≠", "Diferente"], ["≈", "Aproximadamente"], ["∞", "Infinito"], ["√", "Raiz quadrada"], ["∑", "Somatório"], ["∆", "Variação"]]],
    ["Letras gregas", [["α", "Alfa"], ["β", "Beta"], ["γ", "Gama"], ["δ", "Delta"], ["λ", "Lambda"], ["π", "Pi"], ["σ", "Sigma"], ["Ω", "Ômega"]]],
  ];
  const MENUS = {
    simbolos(b) {
      abrirMenu(b, `<div class="simbolos-cabeca">Inserir símbolo</div>${SIMBOLOS.map(([titulo, itens]) => `<section><h3>${fmt.escape(titulo)}</h3><div class="simbolos-grade">${itens.map(([simbolo, nome]) => `<button type="button" data-valor="${fmt.escape(simbolo)}" aria-label="${fmt.escape(nome)}" title="${fmt.escape(nome)}">${fmt.escape(simbolo)}</button>`).join("")}</div></section>`).join("")}`,
        (simbolo) => { restaurar(); document.execCommand("insertText", false, simbolo); marcarSujo(); fecharMenu(); }, "menu-simbolos");
    },
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
    b.setAttribute("aria-haspopup", "dialog");
    b.addEventListener("mousedown", (ev) => { ev.preventDefault(); MENUS[b.dataset.menu]?.(b); });
    b.addEventListener("click", (ev) => {
      if (ev.detail !== 0) return;
      MENUS[b.dataset.menu]?.(b);
      menuAberto?.el.querySelector("button, input")?.focus();
    });
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
    if (como === "imprimir") { await exportacao.imprimir(); return; }
    if (como === "txt") { baixar(`${titulo}\n\n${corpo.innerText}`, "text/plain;charset=utf-8", nomeArquivo("txt")); return; }
    if (como === "copiar") {
      try { await navigator.clipboard.writeText(`${titulo}\n\n${corpo.innerText}`); UI.toast("Texto copiado."); }
      catch { UI.toast("O navegador não deixou copiar. Selecione o texto e use Ctrl+C."); }
      return;
    }
    if (como === "word") {
      const corpoHTML = await htmlComImagens();
      const doc = EditorExportar.word(titulo, corpoHTML);
      baixar(`﻿${doc}`, "application/msword", nomeArquivo("doc"));
      UI.toast("Arquivo do Word baixado.");
    }
  }

  /* ------------------------------ Salvamento ------------------------------- */

  let sujo = false;
  let salvando = null;
  let sumarioPendente = null;
  let gravando = false;
  let compondo = false;
  let descartando = false;
  let conflito = false;
  let ultimaVersao = "";
  let ultimaTentativa = "";
  const btnRepetir = document.getElementById("btn-repetir-salvamento");
  const assinaturaResumo = (r) => r ? JSON.stringify([r.titulo || "", r.conteudo || "", r.folha || null]) : "";

  function estadoSalvamento(texto, classe = "", acao = "") {
    if (elEstado.textContent !== texto) elEstado.textContent = texto;
    elEstado.className = `editor-estado ${classe}`.trim();
    elEstado.title = classe ? texto : "Salvo neste navegador. A sincronização da conta acontece em segundo plano quando disponível.";
    btnRepetir.hidden = !acao;
    btnRepetir.textContent = acao || "Tentar novamente";
  }

  function marcarSujo() {
    sujo = true;
    estadoSalvamento(conflito ? "Há outra versão" : "Salvando…", conflito ? "erro" : "sujo", conflito ? "Revisar" : "");
    clearTimeout(salvando);
    if (!compondo && !conflito) salvando = setTimeout(() => salvar(), 700);
    clearTimeout(sumarioPendente);
    sumarioPendente = setTimeout(desenharSumario, 400);
  }

  function marcarSalvo() {
    sujo = false;
    conflito = false;
    ultimaVersao = assinaturaResumo(resumoAtual());
    ultimaTentativa = "";
    estadoSalvamento("Salvo");
  }

  function guardarEndereco() {
    if (!resumoId) return;
    history.replaceState(null, "", contexto.endereco(resumoId));
    document.getElementById("btn-excluir").hidden = false;
  }

  function salvar({ avisar = false } = {}) {
    clearTimeout(salvando);
    if (descartando || compondo || !sujo) return !sujo;
    if (conflito) return false;
    const titulo = campoTitulo.value.trim();
    corpo.querySelectorAll("img.selecionada").forEach((x) => x.classList.remove("selecionada"));
    const conteudo = UI.htmlSeguro(corpo.innerHTML);
    if (imgSel) imgSel.classList.add("selecionada");
    const anterior = resumoAtual();

    // Não cria resumos vazios; apagar todo o conteúdo de um resumo existente é salvo.
    if (!resumoId && !titulo && !corpo.innerText.trim() && !corpo.querySelector("img,table,hr")) {
      sujo = false;
      estadoSalvamento("Salvamento automático");
      return true;
    }
    const atual = assinaturaResumo(anterior);
    if (atual !== ultimaVersao && atual !== ultimaTentativa) {
      conflito = true;
      estadoSalvamento("Há outra versão", "erro", "Revisar");
      return false;
    }
    const dados = {
      titulo: titulo || "Sem título",
      conteudo,
      conteudoFormato: "html",
      folha: { ...folhaEscolhida },
      atualizadoEm: UI.hojeISO(),
    };
    const imagensAnteriores = idsImagensEm(anterior?.conteudo);
    ultimaTentativa = assinaturaResumo(dados);
    // O ID existe antes da tentativa. Se a gravação falhar depois de mudar a
    // memória do Store, tentar de novo atualiza o mesmo registro, sem duplicar.
    if (!resumoId) resumoId = Store.uid("re");
    gravando = true;
    try {
      if (!contexto.garantir()) throw new Error("Esta aba não está mais disponível.");
      if (anterior) {
        const atualizado = Store.subAtualizar(CAMINHO, disciplinaId, "resumos", resumoId, dados);
        if (!atualizado) throw new Error("Esta aba não está mais disponível.");
      }
      else {
        const novo = Store.subInserir(CAMINHO, disciplinaId, "resumos", { id: resumoId, ...dados, anexos: [] });
        if (!novo) throw new Error("Esta aba não está mais disponível.");
      }
      guardarEndereco();
      marcarSalvo();
      document.title = `${dados.titulo} · ${UI.NOME}`;
      // Só remove os anexos antigos depois de a gravação do texto ter sucesso.
      if (anterior) {
        const depois = new Set(idsImagensEm(conteudo));
        imagensAnteriores.forEach((id) => { if (!depois.has(id)) Arquivos.remover(id).catch(() => {}); });
      }
      if (avisar) UI.toast("Resumo salvo.");
      return true;
    } catch (err) {
      estadoSalvamento("Não foi possível salvar", "erro", "Tentar novamente");
      elEstado.title = err.message;
      return false;
    } finally { gravando = false; }
  }

  btnRepetir.addEventListener("click", async () => {
    if (!conflito) { salvar(); return; }
    const copiar = await UI.confirmar({
      titulo: "Seu resumo mudou em outro lugar",
      descricao: "O texto que você está escrevendo continua aqui. Guarde-o como uma cópia para preservar também a versão que chegou de outro lugar.",
      rotuloConfirmar: "Guardar minha cópia",
    });
    if (!copiar) return;
    resumoId = "";
    ultimaVersao = "";
    ultimaTentativa = "";
    conflito = false;
    sujo = true;
    salvar();
  });

  Store.aoMudar(() => {
    if (gravando || descartando) return;
    const atual = resumoAtual();
    if (assinaturaResumo(atual) === ultimaVersao) return;
    if (sujo) {
      if (assinaturaResumo(atual) === ultimaTentativa) return;
      conflito = true;
      clearTimeout(salvando);
      estadoSalvamento("Há outra versão", "erro", "Revisar");
    } else if (atual) {
      campoTitulo.value = atual.titulo || "";
      corpo.innerHTML = UI.htmlSeguro(atual.conteudo || "");
      folhaEscolhida = { ...FOLHA_PADRAO, ...(atual.folha || {}) };
      aplicarFolha();
      UI.resolverImagens(corpo);
      marcarSalvo();
      desenharSumario();
    } else if (resumoId) {
      conflito = true;
      sujo = true;
      estadoSalvamento("Resumo removido em outro lugar", "erro", "Revisar");
    }
  });
  window.addEventListener("delfos:salvo", () => {
    if (gravando || !sujo || !ultimaTentativa) return;
    const bufferAtual = assinaturaResumo({ titulo: campoTitulo.value.trim() || "Sem título", conteudo: UI.htmlSeguro(corpo.innerHTML), folha: folhaEscolhida });
    if (assinaturaResumo(resumoAtual()) === ultimaTentativa && bufferAtual === ultimaTentativa) {
      guardarEndereco();
      marcarSalvo();
    }
  });

  async function excluir() {
    if (!resumoId || !resumoAtual()) return (location.href = voltarHref);
    const ok = await UI.confirmar({
      titulo: "Excluir este resumo?",
      descricao: "O texto e os documentos anexados a ele serão apagados.",
      rotuloConfirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    descartando = true;
    clearTimeout(salvando);
    const atualR = resumoAtual();
    const anexos = atualR?.anexos || [];
    const imagens = idsImagensEm(atualR?.conteudo);
    const lista = Store.achar(CAMINHO, disciplinaId)?.resumos || [];
    const indice = lista.findIndex((r) => r.id === resumoId);
    try { Store.subRemover(CAMINHO, disciplinaId, "resumos", resumoId); }
    catch {
      // O Store já pode ter mudado a memória quando a persistência falha.
      const disciplinaAtual = Store.achar(CAMINHO, disciplinaId);
      if (disciplinaAtual && atualR && !resumoAtual()) disciplinaAtual.resumos.splice(Math.max(0, indice), 0, atualR);
      descartando = false;
      UI.toast("Não foi possível excluir. Tente novamente quando o armazenamento estiver disponível.");
      return;
    }
    anexos.forEach((a) => Arquivos.remover(a.id));
    imagens.forEach((id) => Arquivos.remover(id));
    sujo = false;
    location.href = voltarHref;
  }

  /* -------------------------------- Ligações -------------------------------- */

  const ativarComSelecao = (botao, acao) => {
    // O mouse preserva a seleção; Enter/Espaço também acionam o controle.
    botao.addEventListener("mousedown", (ev) => { ev.preventDefault(); acao(); });
    botao.addEventListener("click", (ev) => { if (ev.detail === 0) acao(); });
  };
  document.querySelectorAll("[data-cmd]").forEach((b) => ativarComSelecao(b, () => comando(b.dataset.cmd)));

  selBloco.addEventListener("change", () => { restaurar(); document.execCommand("formatBlock", false, `<${selBloco.value}>`); marcarSujo(); atualizarBotoes(); });
  selFonte.addEventListener("change", () => aplicarFonte(selFonte.value));
  selTamanho.addEventListener("change", () => aplicarTamanho(Number(selTamanho.value)));
  ativarComSelecao(document.getElementById("btn-limpar"), () => comando("removeFormat"));
  ativarComSelecao(document.getElementById("btn-checklist"), alternarChecklist);
  ativarComSelecao(document.getElementById("btn-link"), abrirLink);

  corpo.addEventListener("input", marcarSujo);
  corpo.addEventListener("compositionstart", () => { compondo = true; clearTimeout(salvando); });
  corpo.addEventListener("compositionend", () => { compondo = false; marcarSujo(); });
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

  document.getElementById("voltar").addEventListener("click", (ev) => {
    if (sujo && !salvar()) { ev.preventDefault(); btnRepetir.focus(); }
  });
  window.addEventListener("blur", () => { if (sujo) salvar(); });
  window.addEventListener("pagehide", () => { if (sujo) salvar(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && sujo) salvar(); });
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
    estadoSalvamento("Salvamento automático");
    campoTitulo.focus();
  }
  aplicarFolha();
  try { if (localStorage.getItem("delfos.editor.sumario") === "1") alternarSumario(true); } catch { /* nada */ }

  atualizarBotoes();
  const medirBarras = () => {
    document.documentElement.style.setProperty("--editor-topo-altura", `${document.querySelector(".editor-topo").offsetHeight}px`);
    document.documentElement.style.setProperty("--editor-barra-altura", `${document.querySelector(".editor-barra").offsetHeight}px`);
    document.documentElement.style.setProperty("--editor-rodape-altura", `${document.querySelector(".editor-rodape").offsetHeight}px`);
  };
  if (typeof ResizeObserver === "function") {
    const medidas = new ResizeObserver(medirBarras);
    medidas.observe(document.querySelector(".editor-topo"));
    medidas.observe(document.querySelector(".editor-barra"));
    medidas.observe(document.querySelector(".editor-rodape"));
  }
  medirBarras();
})();
