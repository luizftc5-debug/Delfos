/* Editor de resumos — página inteira, sem barra lateral, só o texto.
   Abre a partir da página de uma disciplina:
     resumo.html?disciplina=<id>            → resumo novo
     resumo.html?disciplina=<id>&id=<resumo> → editar um existente          */

(() => {
  const { fmt } = UI;
  const CAMINHO = "faculdade.disciplinas";
  const disciplinaId = UI.parametro("disciplina");
  let resumoId = UI.parametro("id");

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

  const TAMANHOS = [12, 14, 16, 18, 20, 24, 30, 36];

  const selFonte = document.getElementById("fonte");
  const selTamanho = document.getElementById("tamanho");
  const corpo = document.getElementById("corpo");
  const campoTitulo = document.getElementById("titulo");
  const elEstado = document.getElementById("estado");

  selFonte.innerHTML = FONTES.map((f) => `<option value="${fmt.escape(f.valor)}">${fmt.escape(f.rotulo)}</option>`).join("");
  selTamanho.innerHTML = TAMANHOS.map((t) => `<option value="${t}"${t === 16 ? " selected" : ""}>${t}</option>`).join("");

  // Nas edições formatadas o navegador prefere CSS a <font>, que é o que o
  // sanitizador de UI.htmlSeguro sabe guardar.
  document.execCommand("styleWithCSS", false, true);

  const focar = () => corpo.focus();

  function comando(cmd) {
    focar();
    document.execCommand(cmd, false, null);
    marcarSujo();
    atualizarBotoes();
  }

  function aplicarFonte(familia) {
    focar();
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
    focar();
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

  /** Acende N / I / S conforme o trecho onde o cursor está. */
  function atualizarBotoes() {
    document.querySelectorAll("[data-cmd]").forEach((b) => {
      let ativo = false;
      try { ativo = document.queryCommandState(b.dataset.cmd); } catch { /* sem seleção */ }
      b.setAttribute("aria-pressed", String(ativo));
    });
  }

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
    focar();
    const url = URL.createObjectURL(arquivo);
    document.execCommand("insertHTML", false,
      `<img src="${url}" data-anexo-id="${fmt.escape(anexo.id)}" alt="${fmt.escape(arquivo.name)}">`);
    marcarSujo();
  }

  function posicionarCursorEm(x, y) {
    let faixa = null;
    if (document.caretRangeFromPoint) {
      faixa = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) { faixa = document.createRange(); faixa.setStart(pos.offsetNode, pos.offset); }
    }
    if (!faixa) return focar();
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(faixa);
    corpo.focus();
  }

  /* ------------------------------ Salvamento ------------------------------- */

  let sujo = false;
  let salvando = null;

  function contarPalavras() {
    const texto = corpo.innerText.trim();
    const n = texto ? texto.split(/\s+/).length : 0;
    document.getElementById("contagem").textContent = `${n} ${n === 1 ? "palavra" : "palavras"}`;
  }

  function marcarSujo() {
    sujo = true;
    elEstado.textContent = "alterações não salvas";
    elEstado.className = "editor-estado sujo";
    contarPalavras();
    clearTimeout(salvando);
    salvando = setTimeout(salvar, 2500); // salva sozinho depois da pausa
  }

  function marcarSalvo() {
    sujo = false;
    elEstado.textContent = "salvo";
    elEstado.className = "editor-estado";
  }

  function salvar({ avisar = false } = {}) {
    clearTimeout(salvando);
    const titulo = campoTitulo.value.trim();
    const conteudo = UI.htmlSeguro(corpo.innerHTML);

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
    const atual = resumoAtual();
    const anexos = atual?.anexos || [];
    const imagens = idsImagensEm(atual?.conteudo);
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

  selFonte.addEventListener("change", () => aplicarFonte(selFonte.value));
  selTamanho.addEventListener("change", () => aplicarTamanho(Number(selTamanho.value)));
  document.getElementById("btn-limpar").addEventListener("mousedown", (ev) => {
    ev.preventDefault();
    comando("removeFormat");
  });

  corpo.addEventListener("input", marcarSujo);
  campoTitulo.addEventListener("input", marcarSujo);

  // Clicar no vazio abaixo do texto continua escrevendo, como em qualquer
  // editor — senão a metade de baixo da folha não responde ao clique.
  document.querySelector(".editor-folha").addEventListener("mousedown", (ev) => {
    if (ev.target !== ev.currentTarget) return;
    ev.preventDefault();
    const faixa = document.createRange();
    faixa.selectNodeContents(corpo);
    faixa.collapse(false);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(faixa);
    corpo.focus();
  });
  corpo.addEventListener("keyup", atualizarBotoes);
  corpo.addEventListener("mouseup", atualizarBotoes);

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
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") {
      ev.preventDefault();
      salvar({ avisar: true });
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
    UI.resolverImagens(corpo);
    marcarSalvo();
  } else {
    resumoId = "";
    document.getElementById("btn-excluir").hidden = true;
    elEstado.textContent = "resumo novo";
    campoTitulo.focus();
  }

  contarPalavras();
  atualizarBotoes();
})();
