/* Navegação por tarefa. Os painéis continuam no DOM: mudar de seção não
   recria formulários, filtros ou dados. Sem JavaScript, o conteúdo fica legível. */
const Organizacao = (() => {
  let raiz;
  let botoes = [];
  let paineis = [];
  let atual = "";

  function selecionar(chave, { focar = false, url = false } = {}) {
    const botao = botoes.find((b) => b.dataset.secao === chave && !b.hidden);
    if (!botao) return;
    atual = chave;
    botoes.forEach((b) => {
      const ativo = b === botao;
      b.setAttribute("aria-selected", String(ativo));
      b.tabIndex = ativo ? 0 : -1;
    });
    paineis.forEach((p) => { p.hidden = p.dataset.painel !== chave; });
    // No celular, a seção selecionada deve continuar visível na faixa rolável.
    // Ajusta só essa faixa, sem deslocar o conteúdo da página.
    const faixa = botao.parentElement;
    const limite = faixa.getBoundingClientRect();
    const posicao = botao.getBoundingClientRect();
    if (posicao.left < limite.left) faixa.scrollLeft += posicao.left - limite.left;
    else if (posicao.right > limite.right) faixa.scrollLeft += posicao.right - limite.right;
    if (url && location.hash !== `#${chave}`) {
      const destino = new URL(location.href);
      destino.hash = chave;
      history.pushState(null, "", destino);
    }
    if (focar) botao.focus();
    raiz.dispatchEvent(new CustomEvent("delfos:secao", { bubbles: true, detail: { chave } }));
    // Gráficos que dependem da largura podem medir o painel agora visível.
    window.dispatchEvent(new Event("resize"));
  }

  function abrirElemento(el) {
    const painel = el?.closest?.("[data-painel]");
    if (painel && raiz?.contains(painel)) selecionar(painel.dataset.painel);
  }

  function lerEndereco() {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const botao = botoes.find((b) => b.dataset.secao === hash);
    if (botao) selecionar(hash);
    else {
      const alvo = document.getElementById(hash);
      if (alvo) abrirElemento(alvo);
      else if (!hash) selecionar(botoes[0]?.dataset.secao);
    }
  }

  function iniciar() {
    raiz = document.querySelector("[data-pagina-secoes]");
    if (!raiz || raiz.dataset.organizada) return;
    raiz.dataset.organizada = "sim";
    botoes = [...raiz.querySelectorAll("[data-secao]")];
    paineis = [...raiz.querySelectorAll("[data-painel]")];
    const nav = raiz.querySelector("[data-navegacao-secoes]");
    nav.hidden = false;
    botoes.forEach((b) => b.addEventListener("click", () => selecionar(b.dataset.secao, { url: true })));
    nav.addEventListener("keydown", (ev) => {
      const visiveis = botoes.filter((b) => !b.hidden);
      const indice = visiveis.indexOf(document.activeElement);
      if (indice < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(ev.key)) return;
      ev.preventDefault();
      const proximo = ev.key === "Home" ? 0 : ev.key === "End" ? visiveis.length - 1
        : (indice + (ev.key === "ArrowRight" ? 1 : -1) + visiveis.length) % visiveis.length;
      selecionar(visiveis[proximo].dataset.secao, { focar: true, url: true });
    });
    // Links antigos (#metas, #lista, #calendario...) continuam abrindo o conteúdo.
    raiz.addEventListener("click", (ev) => {
      const link = ev.target.closest('a[href^="#"]');
      if (!link) return;
      let id;
      try { id = decodeURIComponent(link.hash.slice(1)); } catch { return; }
      abrirElemento(document.getElementById(id));
    });
    window.addEventListener("hashchange", lerEndereco);
    window.addEventListener("popstate", lerEndereco);
    selecionar(botoes[0]?.dataset.secao);
    lerEndereco();
  }

  function rotular(chave, rotulo) {
    const b = botoes.find((x) => x.dataset.secao === chave);
    if (b) b.textContent = rotulo;
  }

  function disponivel(chave, valor) {
    const b = botoes.find((x) => x.dataset.secao === chave);
    if (!b) return;
    b.hidden = !valor;
    if (!valor && atual === chave) selecionar(botoes.find((x) => !x.hidden)?.dataset.secao);
  }

  return { iniciar, abrirElemento, selecionar, rotular, disponivel, atual: () => atual };
})();
