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
  UI.realcarBotoes?.(document);
  const assinatura = document.querySelector(".editor-rodape .marca");
  if (assinatura) assinatura.innerHTML = UI.logotipo();

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

  // Ícones da barra do editor: Phosphor (regular, MIT), como os de ui.js.
  const ICONES_ED = {
    desfazer: '<path d="M230,144a62.07,62.07,0,0,1-62,62H80a6,6,0,0,1,0-12h88a50,50,0,0,0,0-100H46.49l37.75,37.76a6,6,0,1,1-8.48,8.48l-48-48a6,6,0,0,1,0-8.48l48-48a6,6,0,0,1,8.48,8.48L46.49,82H168A62.07,62.07,0,0,1,230,144Z"/>',
    "refazer-ed": '<path d="M171.76,131.76,209.51,94H88a50,50,0,0,0,0,100h88a6,6,0,0,1,0,12H88A62,62,0,0,1,88,82H209.51L171.76,44.24a6,6,0,0,1,8.48-8.48l48,48a6,6,0,0,1,0,8.48l-48,48a6,6,0,0,1-8.48-8.48Z"/>',
    lista: '<path d="M82,64a6,6,0,0,1,6-6H216a6,6,0,0,1,0,12H88A6,6,0,0,1,82,64Zm134,58H88a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm0,64H88a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12ZM44,54A10,10,0,1,0,54,64,10,10,0,0,0,44,54Zm0,128a10,10,0,1,0,10,10A10,10,0,0,0,44,182Zm0-64a10,10,0,1,0,10,10A10,10,0,0,0,44,118Z"/>',
    "lista-num": '<path d="M222,128a6,6,0,0,1-6,6H104a6,6,0,0,1,0-12H216A6,6,0,0,1,222,128ZM104,70H216a6,6,0,0,0,0-12H104a6,6,0,0,0,0,12ZM216,186H104a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12ZM42.68,53.37,50,49.71V104a6,6,0,0,0,12,0V40a6,6,0,0,0-8.68-5.37l-16,8a6,6,0,0,0,5.36,10.74ZM72,202H52l21.48-28.74A21.5,21.5,0,0,0,77.79,157,21.75,21.75,0,0,0,69,142.38a22.86,22.86,0,0,0-31.35,4.31,22.18,22.18,0,0,0-3.28,5.92,6,6,0,0,0,11.28,4.11,9.87,9.87,0,0,1,1.48-2.67,10.78,10.78,0,0,1,14.78-2,9.89,9.89,0,0,1,4,6.61,9.64,9.64,0,0,1-2,7.28l-.06.09L35.2,204.41A6,6,0,0,0,40,214H72a6,6,0,0,0,0-12Z"/>',
    checklist: '<path d="M222,128a6,6,0,0,1-6,6H128a6,6,0,0,1,0-12h88A6,6,0,0,1,222,128ZM128,70h88a6,6,0,0,0,0-12H128a6,6,0,0,0,0,12Zm88,116H128a6,6,0,0,0,0,12h88a6,6,0,0,0,0-12ZM83.76,43.76,56,71.51,44.24,59.76a6,6,0,0,0-8.48,8.48l16,16a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0-8.48-8.48Zm0,64L56,135.51,44.24,123.76a6,6,0,1,0-8.48,8.48l16,16a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0-8.48-8.48Zm0,64L56,199.51,44.24,187.76a6,6,0,0,0-8.48,8.48l16,16a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0-8.48-8.48Z"/>',
    "alinhar-esq": '<path d="M34,64a6,6,0,0,1,6-6H216a6,6,0,0,1,0,12H40A6,6,0,0,1,34,64Zm6,46H168a6,6,0,0,0,0-12H40a6,6,0,0,0,0,12Zm176,28H40a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm-48,40H40a6,6,0,0,0,0,12H168a6,6,0,0,0,0-12Z"/>',
    "alinhar-centro": '<path d="M34,64a6,6,0,0,1,6-6H216a6,6,0,0,1,0,12H40A6,6,0,0,1,34,64ZM64,98a6,6,0,0,0,0,12H192a6,6,0,0,0,0-12Zm152,40H40a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm-24,40H64a6,6,0,0,0,0,12H192a6,6,0,0,0,0-12Z"/>',
    "alinhar-dir": '<path d="M34,64a6,6,0,0,1,6-6H216a6,6,0,0,1,0,12H40A6,6,0,0,1,34,64ZM216,98H88a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm0,40H40a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm0,40H88a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Z"/>',
    "alinhar-just": '<path d="M34,64a6,6,0,0,1,6-6H216a6,6,0,0,1,0,12H40A6,6,0,0,1,34,64ZM216,98H40a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm0,40H40a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm0,40H40a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Z"/>',
    "recuo-mais": '<path d="M222,128a6,6,0,0,1-6,6H112a6,6,0,0,1,0-12H216A6,6,0,0,1,222,128ZM112,70H216a6,6,0,0,0,0-12H112a6,6,0,0,0,0,12ZM216,186H40a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12ZM35.76,140.24a6,6,0,0,0,8.48,0l40-40a6,6,0,0,0,0-8.48l-40-40a6,6,0,0,0-8.48,8.48L71.51,96,35.76,131.76A6,6,0,0,0,35.76,140.24Z"/>',
    "recuo-menos": '<path d="M222,128a6,6,0,0,1-6,6H112a6,6,0,0,1,0-12H216A6,6,0,0,1,222,128ZM112,70H216a6,6,0,0,0,0-12H112a6,6,0,0,0,0,12ZM216,186H40a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12ZM72,142a6,6,0,0,0,4.24-10.24L40.49,96,76.24,60.24a6,6,0,0,0-8.48-8.48l-40,40a6,6,0,0,0,0,8.48l40,40A6,6,0,0,0,72,142Z"/>',
    link: '<path d="M164.25,91.75a6,6,0,0,1,0,8.49l-64,64a6,6,0,0,1-8.49-8.48l64-64A6,6,0,0,1,164.25,91.75ZM214.2,41.8a54.07,54.07,0,0,0-76.38,0L107.75,71.85a6,6,0,0,0,8.49,8.49l30.07-30.06a42,42,0,0,1,59.41,59.41l-30.08,30.07a6,6,0,1,0,8.49,8.49l30.07-30.07A54,54,0,0,0,214.2,41.8ZM139.76,175.64l-30.07,30.08a42,42,0,0,1-59.41-59.41l30.06-30.07a6,6,0,0,0-8.49-8.49l-30,30.07a54,54,0,0,0,76.38,76.39l30.07-30.08a6,6,0,0,0-8.49-8.49Z"/>',
    imagem: '<path d="M216,42H40A14,14,0,0,0,26,56V200a14,14,0,0,0,14,14H216a14,14,0,0,0,14-14V56A14,14,0,0,0,216,42ZM40,54H216a2,2,0,0,1,2,2V163.57L188.53,134.1a14,14,0,0,0-19.8,0l-21.42,21.42L101.9,110.1a14,14,0,0,0-19.8,0L38,154.2V56A2,2,0,0,1,40,54ZM38,200V171.17l52.58-52.58a2,2,0,0,1,2.84,0L176.83,202H40A2,2,0,0,1,38,200Zm178,2H193.8l-38-38,21.41-21.42a2,2,0,0,1,2.83,0l38,38V200A2,2,0,0,1,216,202ZM146,100a10,10,0,1,1,10,10A10,10,0,0,1,146,100Z"/>',
    tabela: '<path d="M224,50H32a6,6,0,0,0-6,6V192a14,14,0,0,0,14,14H216a14,14,0,0,0,14-14V56A6,6,0,0,0,224,50ZM38,110H82v36H38Zm56,0H218v36H94ZM218,62V98H38V62ZM38,192V158H82v36H40A2,2,0,0,1,38,192Zm178,2H94V158H218v34A2,2,0,0,1,216,194Z"/>',
    caixa: '<path d="M90,96a6,6,0,0,1,6-6h64a6,6,0,0,1,0,12H96A6,6,0,0,1,90,96Zm6,38h64a6,6,0,0,0,0-12H96a6,6,0,0,0,0,12Zm32,20H96a6,6,0,0,0,0,12h32a6,6,0,0,0,0-12ZM222,48V156.69a13.94,13.94,0,0,1-4.1,9.9L166.59,217.9a13.94,13.94,0,0,1-9.9,4.1H48a14,14,0,0,1-14-14V48A14,14,0,0,1,48,34H208A14,14,0,0,1,222,48ZM48,210H154V160a6,6,0,0,1,6-6h50V48a2,2,0,0,0-2-2H48a2,2,0,0,0-2,2V208A2,2,0,0,0,48,210Zm153.52-44H166v35.52Z"/>',
    divisor: '<path d="M222,128a6,6,0,0,1-6,6H40a6,6,0,0,1,0-12H216A6,6,0,0,1,222,128Z"/>',
    limpar: '<path d="M223.57,81.81,182.19,40.43a22,22,0,0,0-31.12,0L32.43,159.07a22,22,0,0,0,0,31.11L62.5,220.24A6,6,0,0,0,66.74,222H216a6,6,0,0,0,0-12H126.49l97.08-97.08A22,22,0,0,0,223.57,81.81ZM109.51,210H69.22l-28.3-28.3a10,10,0,0,1,0-14.15L96,112.48,151.52,168ZM215.08,104.44,160,159.51,104.48,104l55.08-55.07a10,10,0,0,1,14.14,0l41.38,41.37A10,10,0,0,1,215.08,104.44Z"/>',
    "marca-texto": '<path d="M252.24,107.76a6,6,0,0,0-8.48,0L193.41,158.1a2,2,0,0,1-2.82,0L105.9,73.41a2,2,0,0,1,0-2.82l50.34-50.35a6,6,0,0,0-8.48-8.48L97.41,62.1A14,14,0,0,0,95.7,79.81L73.41,102.1a14,14,0,0,0,0,19.8l6.1,6.1L19.76,187.76a6,6,0,0,0,2.34,9.93l72,24a6,6,0,0,0,6.14-1.45L136,184.49l6.1,6.1a14,14,0,0,0,19.8,0l22.28-22.29a14,14,0,0,0,17.72-1.71l50.34-50.35A6,6,0,0,0,252.24,107.76ZM94.38,209.14,35.11,189.38,88,136.49,127.51,176Zm59-27a2,2,0,0,1-2.82,0l-10.35-10.34h0l-48-48h0L81.9,113.41a2,2,0,0,1,0-2.82L104,88.49,175.51,160Z"/>',
    sumario: '<path d="M90,64a6,6,0,0,1,6-6H216a6,6,0,0,1,0,12H96A6,6,0,0,1,90,64Zm126,58H96a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm0,64H96a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12ZM56,58H40a6,6,0,0,0,0,12H56a6,6,0,0,0,0-12Zm0,64H40a6,6,0,0,0,0,12H56a6,6,0,0,0,0-12Zm0,64H40a6,6,0,0,0,0,12H56a6,6,0,0,0,0-12Z"/>',
    folha: '<path d="M212.24,83.76l-56-56A6,6,0,0,0,152,26H56A14,14,0,0,0,42,40V216a14,14,0,0,0,14,14H200a14,14,0,0,0,14-14V88A6,6,0,0,0,212.24,83.76ZM158,46.48,193.52,82H158ZM200,218H56a2,2,0,0,1-2-2V40a2,2,0,0,1,2-2h90V88a6,6,0,0,0,6,6h50V216A2,2,0,0,1,200,218Z"/>',
    foco: '<path d="M214,48V88a6,6,0,0,1-12,0V54H168a6,6,0,0,1,0-12h40A6,6,0,0,1,214,48ZM88,202H54V168a6,6,0,0,0-12,0v40a6,6,0,0,0,6,6H88a6,6,0,0,0,0-12Zm120-40a6,6,0,0,0-6,6v34H168a6,6,0,0,0,0,12h40a6,6,0,0,0,6-6V168A6,6,0,0,0,208,162ZM88,42H48a6,6,0,0,0-6,6V88a6,6,0,0,0,12,0V54H88a6,6,0,0,0,0-12Z"/>',
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
    history.replaceState(null, "", `resumo.html?disciplina=${encodeURIComponent(disciplinaId)}&id=${encodeURIComponent(resumoId)}`);
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
      if (anterior) {
        const atualizado = Store.subAtualizar(CAMINHO, disciplinaId, "resumos", resumoId, dados);
        if (!atualizado) throw new Error("A disciplina não está mais disponível.");
      }
      else {
        const novo = Store.subInserir(CAMINHO, disciplinaId, "resumos", { id: resumoId, ...dados, anexos: [] });
        if (!novo) throw new Error("A disciplina não está mais disponível.");
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
  };
  if (typeof ResizeObserver === "function") {
    const medidas = new ResizeObserver(medirBarras);
    medidas.observe(document.querySelector(".editor-topo"));
    medidas.observe(document.querySelector(".editor-barra"));
  }
  medirBarras();
})();
