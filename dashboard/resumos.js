/* Um mesmo editor, guardado no contexto em que a pessoa está trabalhando. */
const Resumos = (() => {
  const ABAS = {
    home: { nome: "Visão geral", href: "index.html" },
    pessoal: { nome: "Pessoal", href: "pessoal.html" },
    financeiro: { nome: "Financeiro", href: "financeiro.html" },
    faculdade: { nome: "Faculdade", href: "faculdade.html", recomendado: true },
    projetos: { nome: "Projetos", href: "projetos.html", recomendado: true },
    contas: { nome: "Contas e cartões", href: "contas.html" },
    investimentos: { nome: "Investimentos", href: "investimentos.html" },
  };
  const MODELOS = new Set(["estudos", "tcc", "pesquisa-cientifica", "concursos", "idiomas", "cursos", "engenharia", "advocacia", "medicina", "autonomo", "marketing", "conteudo", "aulas-particulares", "trabalho"]);
  const CAMPOS_ESTUDO = new Set(["materia", "disciplina", "assunto", "orientador", "conteudo", "contexto"]);
  function recomendado(p) {
    return MODELOS.has(p?.modeloOrigem) || MODELOS.has(p?.modelo) || (p?.campos || []).some(c => CAMPOS_ESTUDO.has(c.id));
  }
  function resolver(parametros, store = Store) {
    const p = parametros instanceof URLSearchParams ? Object.fromEntries(parametros) : parametros || {};
    let caminho, id, parametro, href, nome, padrao = false;
    if (p.disciplina) { caminho = "faculdade.disciplinas"; id = p.disciplina; parametro = "disciplina"; href = `disciplina.html?id=${encodeURIComponent(id)}#resumos`; padrao = true; }
    else if (p.pilar) { caminho = "pilares"; id = p.pilar; parametro = "pilar"; href = `pilar.html?id=${encodeURIComponent(id)}#resumos-editor`; }
    else if (p.projeto) { caminho = "projetos"; id = p.projeto; parametro = "projeto"; href = `projeto.html?id=${encodeURIComponent(id)}#resumos-editor`; padrao = true; }
    else if (p.conta || p.cartao) {
      parametro = p.cartao ? "cartao" : "conta"; id = p[parametro]; caminho = parametro === "cartao" ? "financeiro.cartoes" : "financeiro.contas";
      href = `conta.html?tipo=${parametro}&id=${encodeURIComponent(id)}#resumos-editor`;
    }
    else if (Object.hasOwn(ABAS, p.aba)) { caminho = "cadernos"; id = p.aba; parametro = "aba"; ({ nome, href, recomendado: padrao = false } = ABAS[id]); href += "#resumos-editor"; }
    else return null;
    const obter = () => store.achar(caminho, id) || (caminho === "cadernos" ? { id, nome, resumos: [] } : null);
    const origem = obter();
    if (!origem) return null;
    if (caminho === "pilares") padrao = recomendado(origem);
    const garantir = () => {
      if (caminho === "cadernos" && !store.achar(caminho, id)) return store.inserir(caminho, { id, nome, resumos: [] });
      return store.achar(caminho, id);
    };
    return { caminho, id, nome: origem.nome || nome, href, obter, garantir,
      lista: () => obter()?.resumos || [],
      ativo: () => { const atual = obter(); return atual?.resumosAtivos ?? (padrao || !!atual?.resumos?.length); },
      definirAtivo: valor => { garantir(); return store.atualizar(caminho, id, { resumosAtivos: !!valor }); },
      endereco: resumo => `resumo.html?${parametro}=${encodeURIComponent(id)}${resumo ? `&id=${encodeURIComponent(resumo)}` : ""}`,
    };
  }
  function daPagina(raiz, parametros = new URLSearchParams(location.search)) {
    const tipo = raiz?.dataset.paginaSecoes;
    if (tipo === "disciplina") return null; // já tem sua coleção original
    if (tipo === "pilar") return resolver({ pilar: parametros.get("id") });
    if (tipo === "projeto") return resolver({ projeto: parametros.get("id") });
    if (tipo === "conta") return resolver({ [parametros.get("tipo") === "cartao" ? "cartao" : "conta"]: parametros.get("id") });
    return resolver({ aba: tipo === "index" ? "home" : tipo });
  }
  function iniciar() {
    const raiz = document.querySelector("[data-pagina-secoes]");
    if (!raiz || raiz.querySelector("[data-resumos-editor]")) return;
    const contexto = daPagina(raiz), nav = raiz.querySelector("[data-navegacao-secoes]");
    if (!contexto || !nav) return;
    const { escape: esc } = UI.fmt;
    const botao = document.createElement("button");
    botao.type = "button"; botao.role = "tab"; botao.id = "secao-resumos-editor";
    botao.dataset.secao = "resumos-editor"; botao.setAttribute("aria-controls", "painel-resumos-editor"); botao.textContent = "Resumos";
    nav.insertBefore(botao, nav.querySelector('[data-secao="ajustes"]'));
    const painel = document.createElement("section");
    painel.className = "pagina-painel"; painel.id = "painel-resumos-editor"; painel.dataset.painel = "resumos-editor";
    painel.dataset.resumosEditor = ""; painel.role = "tabpanel"; painel.tabIndex = 0; painel.setAttribute("aria-labelledby", botao.id);
    painel.innerHTML = `<div class="painel-conteudo"><section class="pagina-bloco"><header class="bloco-cabecalho"><div><h2 class="bloco-titulo">Seus resumos</h2><p class="bloco-resumo">Textos e anotações de ${esc(contexto.nome)}. Salvamento automático, formatação e exportação.</p></div><div class="bloco-acoes"><a class="btn primary sm" href="${esc(contexto.endereco())}">${UI.icone("mais")}Escrever resumo</a></div></header><div class="bloco-corpo"><label class="busca"><span class="sr">Buscar nos resumos</span><input class="input" type="search" data-resumos-busca placeholder="Buscar por título ou conteúdo" /></label><div data-resumos-lista></div></div></section><div><button class="btn ghost sm" type="button" data-resumos-ocultar>Ocultar a seção Resumos</button><p class="card-note">Ocultar preserva seus textos. Você pode adicionar o editor novamente nesta aba.</p></div></div>`;
    raiz.append(painel);
    const entrada = document.createElement("button");
    entrada.type = "button"; entrada.className = "btn ghost sm"; entrada.dataset.resumosAtivar = ""; entrada.textContent = "Adicionar editor de resumos";
    const ajustes = raiz.querySelector(".ajustes-lista");
    if (ajustes) {
      const linha = document.createElement("div"); linha.className = "ajuste-linha";
      linha.innerHTML = `<div><b>Editor de resumos</b><p>Escreva e organize textos nesta aba. Ocultar a seção mantém todos os resumos.</p></div>`;
      linha.append(entrada); ajustes.append(linha);
    } else raiz.querySelector(".topbar-actions")?.append(entrada);
    const lista = painel.querySelector("[data-resumos-lista]"), busca = painel.querySelector("[data-resumos-busca]");
    busca.closest("label").classList.add("resumos-editor-busca");
    const textoDe = html => { const e = document.createElement("div"); e.innerHTML = UI.htmlSeguro(html || ""); return e.textContent || ""; };
    const normal = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    function desenhar() {
      const ativo = contexto.ativo(); botao.hidden = !ativo;
      if (typeof Organizacao !== "undefined") Organizacao.disponivel("resumos-editor", ativo);
      entrada.textContent = ativo ? "Abrir resumos" : "Adicionar editor de resumos";
      if (!ajustes) entrada.hidden = ativo;
      const todos = [...contexto.lista()].sort((a,b) => (b.atualizadoEm || "").localeCompare(a.atualizadoEm || ""));
      const termo = normal(busca.value.trim());
      const encontrados = todos.filter(r => !termo || normal(`${r.titulo || ""} ${textoDe(r.conteudo)}`).includes(termo));
      if (!todos.length) { lista.innerHTML = `<div class="empty"><div class="empty-title">Um espaço para suas ideias</div><p class="empty-text">Organize resumos por assunto, registre aprendizados e prepare seus textos no editor.</p><a class="btn" href="${esc(contexto.endereco())}">Escrever o primeiro resumo</a></div>`; return; }
      lista.innerHTML = encontrados.length ? `<ul class="list">${encontrados.map(r => `<li><div class="grow"><a href="${esc(contexto.endereco(r.id))}"><b>${esc(r.titulo || "Sem título")}</b></a><p class="card-note">${esc(textoDe(r.conteudo).slice(0, 180))}</p>${r.atualizadoEm ? `<span class="meta">Atualizado em ${esc(UI.fmt.data(r.atualizadoEm))}</span>` : ""}</div><a class="btn ghost sm" href="${esc(contexto.endereco(r.id))}" aria-label="Editar ${esc(r.titulo || "resumo sem título")}">Abrir</a></li>`).join("")}</ul>` : `<p class="card-note">Nenhum resumo encontrado. Tente outro título ou termo.</p>`;
    }
    busca.addEventListener("input", desenhar);
    entrada.addEventListener("click", () => {
      try { if (!contexto.ativo()) contexto.definirAtivo(true); desenhar(); Organizacao.selecionar("resumos-editor", { url: true, focar: true }); }
      catch (e) { UI.toast(e.message); }
    });
    painel.querySelector("[data-resumos-ocultar]").addEventListener("click", () => {
      try { contexto.definirAtivo(false); desenhar(); }
      catch (e) { UI.toast(e.message); }
    });
    Store.aoMudar(desenhar); desenhar();
  }
  return { recomendado, resolver, iniciar };
})();
if (typeof module !== "undefined") module.exports = Resumos;
