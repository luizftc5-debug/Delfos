/* ===========================================================================
   Abas: o criador e o editor das abas do usuário, montadas pelo Delfos.

   A pessoa escolhe elementos manualmente ou aciona a IA local no navegador.
   O modelo de linguagem, carregado só por escolha explícita do usuário,
   devolve a aba montada: ícone, cor, o que é cada registro, campos, meta,
   agrupamento, vista e se entra na agenda ou é marcada por dia. A janela
   divide a criação em escolher, dar nome e revisar. Ajustes são opcionais.

   Se a pessoa já mexeu em algo à mão, uma leitura nova não passa por cima:
   aparece o botão "Aplicar o que o Delfos entendeu".

   Este arquivo e o delfos.js só são baixados quando alguém abre "Nova aba"
   ou "Personalizar" (UI.abrirCriadorDeAbas): ninguém paga por eles ao abrir
   as outras páginas.

   Tudo o que sai do Delfos ainda passa por `sanear`, que corta para os
   ícones, cores, tipos de campo e vistas que o painel sabe desenhar.
   =========================================================================== */

const Abas = (() => {
  const { fmt, icone } = UI;
  const esc = fmt.escape;

  /* ------------------------------- Saneamento ------------------------------- */

  const TIPOS = new Set(Store.TIPOS_CAMPO.map((t) => t.valor));
  const RESERVADOS = new Set(["descricao", "data", "concluido", "id", "extras", "feitos", "criadoEm", "concluidoEm", "__proto__", "constructor", "prototype"]);
  const VISTAS = [["lista", "Lista", "lista"], ["cartoes", "Cartões", "grade"], ["quadro", "Quadro", "quadro"], ["tabela", "Tabela", "tabela"], ["calendario", "Calendário", "calendario"]];
  const ORDENS = new Set(["auto", "recentes", "data", "az"]);
  const SEM_META = { tipo: "nenhuma", campoId: "", alvo: 0, periodo: "mes" };
  const inicialMinuscula = (s) => String(s || "").replace(/^\p{Lu}(?!\p{Lu})/u, (l) => l.toLowerCase());
  const corta = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const normalizar = (s) => Delfos.normal(s);

  function iconeValido(v) {
    if (typeof v !== "string") return false;
    if (v.startsWith("svg:")) return UI.ICONES_ABA.includes(v.slice(4));
    return Store.ICONES_PILAR.includes(v);
  }

  // Abas prontas com tela própria: no lugar de campos e registros, a tela delas.
  const ESPECIAIS = ["academia", "alimentacao"];

  /** Corta o que veio do Delfos para o que o painel sabe desenhar. */
  function sanear(s, nome) {
    const base = Delfos.entender({ nome }).sugestao;
    const out = {};
    out.icone = iconeValido(s?.icone) ? s.icone : iconeValido(base.icone) ? base.icone : "svg:estrela";
    const paleta = Store.PALETA_PILAR.map((x) => x.valor);
    out.cor = paleta.includes(s?.cor) ? s.cor : base.cor;
    out.descricao = corta(s?.descricao, 160);
    out.rotuloItem = corta(s?.rotuloItem, 30).toLowerCase() || base.rotuloItem;
    out.naAgenda = typeof s?.naAgenda === "boolean" ? s.naAgenda : base.naAgenda;
    out.checkin = typeof s?.checkin === "boolean" ? s.checkin : false;
    out.especial = ESPECIAIS.includes(s?.especial) ? s.especial : "";
    const ids = new Set();
    out.campos = (Array.isArray(s?.campos) ? s.campos : []).slice(0, 8).map((x) => {
      const tipo = TIPOS.has(x?.tipo) ? x.tipo : "text";
      const original = x?.id;
      let id = typeof original === "string" && /^[a-zA-Z][a-zA-Z0-9_]{0,23}$/.test(original) ? original : normalizar(x?.rotulo || original).replace(/\s+(\w)/g, (_, l) => l.toUpperCase()).replace(/\s/g, "").slice(0, 24) || "campo";
      if (RESERVADOS.has(id)) id = `${id}2`;
      while (ids.has(id)) id = `${id}_`;
      ids.add(id);
      const opcoes = tipo === "select" ? [...new Set((Array.isArray(x?.opcoes) ? x.opcoes : []).map((o) => corta(o, 40)).filter(Boolean))].slice(0, 8) : [];
      return { id, rotulo: corta(x?.rotulo, 40) || id, tipo: tipo === "select" && opcoes.length < 2 ? "text" : tipo, opcoes, naLista: !!x?.naLista, obrigatorio: !!x?.obrigatorio, sugerido: !!x?.sugerido, ativo: x?.ativo !== false, dica: corta(x?.dica, 200) };
    });
    const selects = out.campos.filter((x) => x.tipo === "select").map((x) => x.id);
    out.agruparPor = selects.includes(s?.agruparPor) ? s.agruparPor : "";
    const m = s?.meta || {};
    const numericos = out.campos.filter((x) => x.tipo === "number" || x.tipo === "dinheiro").map((x) => x.id);
    const tipoMeta = ["concluidos", "soma", "checkins"].includes(m.tipo) ? m.tipo : "nenhuma";
    out.meta = {
      tipo: tipoMeta === "soma" && !numericos.includes(m.campoId) ? "nenhuma" : tipoMeta === "checkins" && !out.checkin ? "nenhuma" : tipoMeta,
      campoId: numericos.includes(m.campoId) ? m.campoId : "",
      alvo: Math.max(0, Math.min(100000, Number(m.alvo) || 0)),
      periodo: ["semana", "mes", "ano"].includes(m.periodo) ? m.periodo : "mes",
    };
    if (!(out.meta.alvo > 0)) out.meta.tipo = "nenhuma";
    out.exemplos = (Array.isArray(s?.exemplos) ? s.exemplos : []).map((e) => corta(e, 80)).filter(Boolean).slice(0, 6);
    // Vista e ordem: abas de marcar por dia só têm lista e cartões; calendário pede data.
    const v = s?.visual || {};
    let vista = VISTAS.some(([x]) => x === v.vista) ? v.vista : "lista";
    if (out.checkin && !["lista", "cartoes"].includes(vista)) vista = "lista";
    if (vista === "calendario" && !out.naAgenda) vista = "lista";
    const ordemCampo = typeof v.ordem === "string" && v.ordem.startsWith("campo:") && out.campos.some((x) => `campo:${x.id}` === v.ordem);
    out.visual = { vista, ordem: ORDENS.has(v.ordem) || ordemCampo ? v.ordem : "auto" };
    out.proposito = corta(s?.proposito, 2000);
    out.origem = ["delfos", "ia", "manual"].includes(s?.origem) ? s.origem : "manual";
    out.modeloOrigem = ModelosAbas.obter(s?.modeloOrigem)?.id || "";
    return out;
  }

  /* --------------------------- Criador e editor ---------------------------- */

  const NOME_TIPO = Object.fromEntries(Store.TIPOS_CAMPO.map((t) => [t.valor, t.rotulo]));
  const PERIODOS = [["semana", "por semana"], ["mes", "por mês"], ["ano", "por ano"]];
  const MODELOS = [
    ["Trabalho", "maleta", "Tarefas, reuniões e entregas"],
    ["Saúde", "coracao", "Consultas, exames e cuidados"],
    ["Academia", "haltere", "Dias de treino e exercícios"],
    ["Alimentação", "prato", "Dieta, calorias do dia e objetivos"],
    ["Esporte", "alvo", "Treinos, provas e resultados"],
    ["Religião", "sol", "Encontros, leituras e práticas"],
    ["Leituras", "livro", "Livros, autores e anotações"],
    ["Aba livre", "mais", "Comece com a sua própria ideia"],
  ];
  const ICONE_ENTENDEU = { assunto: "alvo", registro: "lista", jeito: "calendario", campos: "tabela", meta: "bandeira", vista: "grade", fora: "fechar", dica: "info", corrigiu: "lapis" };

  /** Cores das abas que já existem, para o Delfos não repetir quando dá. */
  const coresUsadas = (exceto = "") => (Store.estado().pilares || []).filter((p) => p.id !== exceto).map((p) => p.cor);

  /**
   * Criador (sem `pilar`) ou editor (com `pilar`) de uma aba. No editor, os
   * campos que já existem não saem daqui (isso é em "Campos desta aba"); o
   * Delfos só propõe campos novos para acrescentar.
   */
  function abrir({ pilar = null } = {}) {
    const editando = !!pilar;
    const especificos = ModelosAbas.listar();
    const categorias = [...ModelosAbas.categorias(), { id: "essenciais", nome: "Essenciais" }];
    const catalogo = [
      ...MODELOS.map(([nome, ic, descricao]) => ({ nome, ic, descricao, categoria: "essenciais", modeloId: "" })),
      ...especificos.map(m => ({ nome: m.nome, ic: m.icone.slice(4), descricao: m.descricao, categoria: m.categoria, modeloId: m.id })),
    ];
    const botaoModelo = (m) => `<button type="button" class="criacao-modelo${m.nome === "Aba livre" ? " modelo-livre" : ""}" role="radio" aria-label="${esc(m.nome)}" aria-describedby="modelo-descricao-${catalogo.indexOf(m)}" aria-checked="${m.nome === "Aba livre"}" tabindex="${m.nome === "Aba livre" ? 0 : -1}" data-modelo-area="${esc(m.nome)}" data-modelo-id="${esc(m.modeloId)}" data-categoria-modelo="${m.categoria}"><span class="modelo-icone">${icone(m.ic)}</span><span><b>${esc(m.nome)}</b><small id="modelo-descricao-${catalogo.indexOf(m)}">${esc(m.descricao)}</small></span><span class="modelo-selecao" aria-hidden="true"></span></button>`;
    const est = {
      sug: editando
        ? sanear({ ...pilar, meta: pilar.meta || SEM_META, especial: ESPECIAIS.includes(pilar.modelo) ? pilar.modelo : "", visual: pilar.visual || {}, origem: pilar.sugeridoPor }, pilar.nome)
        : sanear({ ...Delfos.entender({ nome: "", usadas: coresUsadas() }).sugestao, campos: [], meta: SEM_META, naAgenda: false, descricao: "", origem: "manual" }, ""),
      escolhidos: new Set(),
      exemplos: new Set(),
      mexeu: false,
      modo: "manual",
      geracaoChave: "",
      pendente: null,
      leitura: null,
      etapa: editando ? 2 : 1,
      modelo: "Aba livre",
      modeloId: "",
      idCriacao: Store.uid("pil"),
    };
    if (editando) {
      est.sug.icone = pilar.icone;
      est.sug.cor = pilar.cor;
      est.sug.proposito = pilar.proposito || "";
    }
    const existentes = editando ? (pilar.campos || []) : [];
    let novosCampos = []; // no editor: campos sugeridos que ainda não existem
    // O dicionário do Delfos (erros de digitação, acentos) é montado agora, num
    // momento ocioso, para a primeira palavra digitada não esperar por ele.
    (window.requestIdleCallback || ((fn) => setTimeout(fn, 60)))(() => Delfos.aquecer?.());

    const html = `
      <header class="modal-head criacao-cabecalho">
        <div><span class="criacao-assinatura">Delfos · seu espaço pessoal</span><h2 class="modal-title">${editando ? "Personalizar aba" : "Nova aba"}</h2></div>
        <button class="btn ghost icon" type="button" data-acao="fechar" aria-label="Fechar criação de aba">${icone("fechar")}</button>
      </header>
      <ol class="criacao-passos" aria-label="Etapas da criação">
        ${["Escolher", "Dar nome", "Revisar"].map((r,i) => `<li data-passo="${i + 1}" ${editando && i === 0 ? "hidden" : ""}><span>${editando ? i : i + 1}</span>${r}</li>`).join("")}
      </ol>
      <div class="modal-body criacao-corpo">
        <section data-etapa="1" aria-labelledby="cr-escolher">
          <h3 class="criacao-titulo" id="cr-escolher" tabindex="-1">O que vamos organizar?</h3>
          <p class="criacao-apoio">${especificos.length} modelos específicos, além dos essenciais. Escolha por tema ou comece com uma aba livre. Tudo pode ser adaptado.</p>
          <div class="catalogo-filtros">
            <label class="field" for="cr-busca-modelo">Buscar modelo<input class="input" id="cr-busca-modelo" type="search" placeholder="Estudos, saúde, semana, casa…" autocomplete="off" /></label>
            <label class="field" for="cr-categoria-modelo">Categoria<select class="input" id="cr-categoria-modelo"><option value="">Todos os temas</option>${categorias.map(c=>`<option value="${c.id}">${c.nome}</option>`).join("")}</select></label>
          </div>
          <div class="criacao-catalogo" role="radiogroup" aria-label="Ponto de partida">
            ${botaoModelo(catalogo.find(m=>m.nome==="Aba livre"))}
            <p class="catalogo-status" role="status" data-catalogo-status></p>
            ${categorias.map(c=>`<details class="catalogo-grupo" data-grupo-modelos="${c.id}"><summary>${c.nome}<span data-contagem-modelos></span></summary><div class="criacao-modelos">${catalogo.filter(m=>m.categoria===c.id && m.nome!=="Aba livre").map(botaoModelo).join("")}</div></details>`).join("")}
          </div>
          <p class="hint catalogo-selecionado" data-modelo-selecionado>Selecionado: Aba livre.</p>
        </section>
        <section data-etapa="2" aria-labelledby="cr-identidade" hidden>
          <h3 class="criacao-titulo" id="cr-identidade" tabindex="-1">Dê a sua cara.</h3>
          <p class="criacao-apoio">Conte o que precisa e revise a página antes de começar.</p>
          <div class="criacao-modos" role="radiogroup" aria-label="Como montar sua aba">
            <button type="button" role="radio" aria-checked="true" tabindex="0" data-modo="manual"><b>Montar do meu jeito</b><span>Escolha o que deseja acompanhar.</span></button>
            <button type="button" role="radio" aria-checked="false" tabindex="-1" data-modo="ia"><b>Criar com o Delfos</b><span>Conte o que você precisa. O Delfos prepara uma página para a sua rotina.</span></button>
          </div>
          <div class="criacao-local-info" data-info-local hidden>
            <p>O Delfos prepara sua página neste aparelho. No primeiro uso, será necessário baixar alguns arquivos; isso pode levar alguns minutos.</p>
            <details class="criacao-explicacao">
              <summary>Como funciona</summary>
              <p>Seu texto é processado neste aparelho. O primeiro download pode ocupar centenas de MB. Esta opção precisa de um navegador compatível com WebGPU e memória gráfica disponível. Os arquivos podem ficar guardados pelo navegador para os próximos usos; se forem removidos, será preciso baixá-los novamente. Você também pode montar a página do seu jeito.</p>
            </details>
          </div>
          <div class="field">
            <label for="cr-nome">Nome da aba</label>
            <input id="cr-nome" type="text" maxlength="40" autocomplete="off" placeholder="Ex.: Corrida" value="${esc(pilar?.nome || "")}" aria-describedby="cr-nome-erro" />
            <span class="criacao-erro" id="cr-nome-erro" hidden>Digite um nome para continuar.</span>
          </div>
          <div class="field">
            <label for="cr-prop">O que você quer organizar? <span class="muted" data-proposito-opcional>Opcional</span></label>
            <textarea id="cr-prop" rows="3" maxlength="2000" aria-describedby="cr-prop-erro" placeholder="Ex.: meus treinos, distâncias e próximas provas.">${esc(est.sug.proposito || "")}</textarea>
            <span class="criacao-erro" id="cr-prop-erro" hidden>Conte um pouco mais para o Delfos preparar sua página.</span>
          </div>
          <div class="criacao-ia-status" role="status" data-ia-status hidden><span data-ia-texto></span><progress data-ia-progresso aria-label="Preparo do Delfos neste aparelho"></progress></div>
          <div class="criacao-ia-erro" data-ia-erro hidden>
            <p role="alert" data-ia-erro-texto></p>
            <details class="criacao-explicacao" data-ia-erro-detalhes hidden><summary>Detalhes do preparo</summary><p data-ia-erro-detalhe></p></details>
            <button class="btn sm" type="button" data-seguir-manual>Montar do meu jeito</button>
          </div>
        </section>
        <section data-etapa="3" aria-labelledby="cr-revisar" hidden>
          <h3 class="criacao-titulo" id="cr-revisar" tabindex="-1">${editando ? "Revise seus ajustes." : "Seu espaço está pronto."}</h3>
          <p class="criacao-apoio">${editando ? "Os registros existentes continuam na aba." : "Confira a estrutura. Você pode começar assim e ajustar com o uso."}</p>
          <div class="criacao-preview" aria-label="Prévia da estrutura">
            <span class="criacao-preview-label">Sua aba</span>
            <div class="previa-topo" data-previa-topo></div>
            <div class="criacao-mini-nav"><b data-mini-registros>Registros</b><span>Visão geral</span><span>Ajustes</span></div>
            <div class="criacao-mini-lista" data-previa-campos></div>
            <p class="criacao-preview-nota" data-previa-resumo></p>
          </div>
          <div class="delfos-aplicar" data-aplicar hidden>
            <span>O Delfos preparou outra organização. Seus ajustes foram mantidos; escolha se quer aplicar a sugestão.</span>
            <button type="button" class="btn sm" data-usar>Usar estrutura da IA</button>
          </div>
          <details class="criacao-opcoes" data-estrutura>
            <summary><span>Como aparece e o que guarda</span><small data-resumo-estrutura></small></summary>
            <div class="criacao-opcoes-corpo">
              <div class="field" data-bloco-vista><span class="label" id="cr-vista-rotulo">Como os registros aparecem</span><div data-vistas-box></div><span class="hint">Dá para trocar a qualquer momento, no alto da lista da aba.</span></div>
              <div class="field" data-bloco-campos>
                <span class="label" data-titulo-campos>Campos</span>
                <ul class="abas-lista campos-sugeridos" data-campos></ul>
                <span class="hint" data-hint-campos></span>
                <button class="btn sm" type="button" data-adicionar-campo>+ Adicionar campo</button>
              </div>
              <p class="hint" data-nota-academia hidden>Seus treinos terão dias, exercícios, séries, repetições e cargas.</p>
            </div>
          </details>
          <details class="criacao-opcoes" data-rotina>
            <summary><span>Agenda e metas</span><small>Opcional</small></summary>
            <div class="criacao-opcoes-corpo">
              <label class="linha-switch"><span><b>Mostrar na agenda</b><span class="muted">Registros com data aparecem no calendário.</span></span><input type="checkbox" class="switch" id="cr-agenda" /></label>
              <label class="linha-switch"><span><b>Acompanhar por dia</b><span class="muted">Para hábitos e atividades recorrentes.</span></span><input type="checkbox" class="switch" id="cr-checkin" /></label>
              <div class="field" data-bloco-meta>
                <label class="linha-switch"><b>Definir uma meta</b><input type="checkbox" class="switch" id="cr-meta-on" /></label>
                <div class="criacao-meta" data-meta-controles>
                  <label>Contar<select class="input" id="cr-meta-tipo"></select></label>
                  <label>Alvo<input class="input" id="cr-meta-alvo" type="number" min="1" max="100000" step="1" /></label>
                  <label>Período<select class="input" id="cr-meta-periodo">${PERIODOS.map(([v, r]) => `<option value="${v}">${r}</option>`).join("")}</select></label>
                </div>
              </div>
              <div class="field" data-bloco-agrupar><label for="cr-agrupar">Agrupar registros por</label><select id="cr-agrupar"></select></div>
            </div>
          </details>
          <details class="criacao-opcoes criador-ajustes">
            <summary><span>Ícone e aparência</span><small>Personalizar</small></summary>
            <div class="criacao-opcoes-corpo">
              <div class="field"><span class="label">Ícone</span><div class="icones-grade" data-icones></div></div>
              <div class="field"><span class="label">Cor de identificação</span><div class="cores" data-cores></div></div>
              <div class="field"><label for="cr-desc">Descrição curta</label><input id="cr-desc" type="text" maxlength="160" autocomplete="off" /></div>
              <div class="field"><label for="cr-rot">Cada registro se chama</label><input id="cr-rot" type="text" maxlength="30" autocomplete="off" placeholder="livro, treino, plantão…" /></div>
            </div>
          </details>
          <details class="criacao-opcoes" data-bloco-exemplos hidden>
            <summary><span>Adicionar registros de exemplo</span><small>Opcional</small></summary>
            <div class="criacao-opcoes-corpo"><p class="hint">Selecione apenas os exemplos que quer guardar na aba.</p><div class="chips" data-exemplos></div></div>
          </details>
          <details class="criacao-opcoes criacao-explicacao" hidden>
            <summary><span>Sobre a sugestão</span></summary>
            <ul class="delfos-lista criacao-opcoes-corpo" data-entendeu></ul>
          </details>
        </section>
        <p class="criacao-erro" data-erro-salvar role="alert" hidden></p>
        <span class="sr" data-etapa-status role="status" aria-live="polite"></span>
      </div>
      <footer class="modal-foot criacao-rodape">
        <button class="btn ghost" data-acao="cancelar" type="button">Cancelar</button>
        <div><button class="btn" data-acao="voltar" type="button" hidden>Voltar</button><button class="btn primary" data-acao="avancar" type="button">Continuar ${icone("direita")}</button><button class="btn primary" data-acao="criar" type="button" hidden>${editando ? "Salvar alterações" : "Criar aba"}</button></div>
      </footer>`;
    let controleIA;
    let pedidoAtual = 0;
    return new Promise((resolve) => UI.abrirModal(html, {
      classe: "criacao",
      aoFechar: (resultado) => { pedidoAtual++; controleIA?.abort(); if (typeof IALocal !== "undefined") IALocal.liberar(); resolve(resultado); },
      aoMontar(modal, fechar) {
        const $ = (sel) => modal.querySelector(sel);
        const inpNome = $("#cr-nome");
        const inpProp = $("#cr-prop");
        const modelos = [...modal.querySelectorAll("[data-modelo-area]")];
        const visiveis = () => modelos.filter(b=>b.getClientRects().length);
        function atualizarFocoModelos() {
          const oferta = visiveis();
          const alvo = oferta.find(b=>b.getAttribute("aria-checked")==="true") || oferta[0];
          modelos.forEach(b=>{b.tabIndex=b===alvo ? 0 : -1;});
        }
        let filtrandoModelos = false;
        function filtrarModelos() {
          const consulta = $("#cr-busca-modelo").value;
          const categoria = $("#cr-categoria-modelo").value;
          const encontrados = new Set(ModelosAbas.buscar(consulta, categoria).map(m=>m.id));
          const termos = normalizar(consulta).split(" ").filter(Boolean);
          modelos.forEach(b=>{
            if(b.dataset.modeloArea==="Aba livre")return;
            const geral = !b.dataset.modeloId;
            const dados = catalogo.find(m=>m.nome===b.dataset.modeloArea);
            b.hidden = geral ? !!(categoria && categoria!=="essenciais") || !termos.every(t=>normalizar(`${dados.nome} ${dados.descricao}`).includes(t)) : !encontrados.has(b.dataset.modeloId);
          });
          const filtrando = !!(consulta.trim() || categoria);
          modal.querySelectorAll("[data-grupo-modelos]").forEach(grupo=>{
            const quantidade = grupo.querySelectorAll("[data-modelo-area]:not([hidden])").length;
            grupo.hidden = !quantidade;
            grupo.querySelector("[data-contagem-modelos]").textContent=quantidade;
            if(filtrando)grupo.open=true;
            else if(filtrandoModelos)grupo.open=[...grupo.querySelectorAll("[data-modelo-area]")].some(b=>b.getAttribute("aria-checked")==="true");
          });
          const quantidade = modelos.filter(b=>b.dataset.modeloArea!=="Aba livre" && !b.hidden).length;
          $("[data-catalogo-status]").textContent=quantidade ? `${quantidade} ${quantidade===1 ? "modelo disponível" : "modelos disponíveis"}${filtrando ? " para esta busca" : ""}.` : "Nenhum modelo encontrado. Tente outro termo ou escolha Aba livre.";
          filtrandoModelos=filtrando;
          atualizarFocoModelos();
        }
        $("#cr-busca-modelo").addEventListener("input",filtrarModelos);
        $("#cr-categoria-modelo").addEventListener("change",filtrarModelos);
        modal.querySelectorAll("[data-grupo-modelos]").forEach(g=>g.addEventListener("toggle",atualizarFocoModelos));
        const propositos = {
          Trabalho: `Organizar tarefas, reuniões e entregas. ${Personalizacao.ocupacaoResumo()}`,
          Saúde: "Consultas, exames e retornos com data, local e profissional.",
          Academia: "Organizar meus dias de treino, exercícios, cargas e repetições.",
          Alimentação: "Acompanhar minha dieta por refeição, as calorias de cada dia e meus objetivos.",
          Esporte: "Organizar treinos e competições do esporte que pratico.",
          Religião: "Organizar encontros, leituras e práticas da minha fé.",
          Leituras: "Livros que quero ler, estou lendo ou já terminei, com autor e comentários.",
          "Aba livre": "",
        };
        function escolherModelo(botao) {
          const nome = botao.dataset.modeloArea;
          if (nome !== est.modelo) {
            inpNome.value = nome === "Aba livre" ? "" : nome;
            inpProp.value = propositos[nome] || "";
            est.mexeu = false;
            est.pendente = null;
            est.modelo = nome;
            est.modeloId = botao.dataset.modeloId;
            est.modo = "manual";
            est.geracaoChave = "";
            if(est.modeloId)inpProp.value=ModelosAbas.obter(est.modeloId).proposito;
            aplicarModeloLocal();
          }
          est.modelo = nome;
          modelos.forEach((b) => { b.setAttribute("aria-checked", String(b === botao)); });
          $("[data-modelo-selecionado]").textContent=`Selecionado: ${nome}.`;
          atualizarFocoModelos();
        }
        modelos.forEach((b) => b.addEventListener("click", () => escolherModelo(b)));
        $(".criacao-catalogo").addEventListener("keydown", (ev) => {
          const oferta = visiveis();
          const i = oferta.indexOf(document.activeElement);
          if (i < 0 || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(ev.key)) return;
          ev.preventDefault();
          const proximo = ev.key === "Home" ? 0 : ev.key === "End" ? oferta.length - 1
            : (i + (["ArrowRight", "ArrowDown"].includes(ev.key) ? 1 : -1) + oferta.length) % oferta.length;
          escolherModelo(oferta[proximo]);oferta[proximo].focus();
        });
        function mostrarEtapa(etapa, focar = true) {
          est.etapa = etapa;
          modal.querySelectorAll("[data-etapa]").forEach((p) => { p.hidden = Number(p.dataset.etapa) !== etapa; });
          modal.querySelectorAll("[data-passo]").forEach((p) => {
            const n = Number(p.dataset.passo);
            p.toggleAttribute("data-concluido", n < etapa);
            if (n === etapa) p.setAttribute("aria-current", "step"); else p.removeAttribute("aria-current");
          });
          $('[data-acao="voltar"]').hidden = etapa === (editando ? 2 : 1);
          $('[data-acao="avancar"]').hidden = etapa === 3;
          $('[data-acao="criar"]').hidden = etapa !== 3;
          $("[data-etapa-status]").textContent = `Etapa ${editando ? etapa - 1 : etapa} de ${editando ? 2 : 3}`;
          $(".criacao-corpo").scrollTop = 0;
          if(etapa===1)atualizarFocoModelos();
          if (focar) {
            if (etapa === 2) inpNome.focus({ preventScroll: true });
            else $(`[data-etapa="${etapa}"] h3`).focus({ preventScroll: true });
          }
        }
        function validarNome() {
          const valido = !!inpNome.value.trim();
          $("#cr-nome-erro").hidden = valido;
          inpNome.setAttribute("aria-invalid", String(!valido));
          if (!valido) inpNome.focus();
          return valido;
        }
        let gerando = false;
        function pararGeracao() {
          pedidoAtual++;
          controleIA?.abort();
          gerando = false;
          $("[data-ia-status]").hidden = true;
          atualizarModo();
        }
        function atualizarModo() {
          modal.querySelectorAll("[data-modo]").forEach((b) => {
            const ativo = b.dataset.modo === est.modo;
            b.setAttribute("aria-checked", String(ativo));
            b.tabIndex = ativo ? 0 : -1;
          });
          $("[data-info-local]").hidden = est.modo !== "ia";
          $("[data-proposito-opcional]").textContent = est.modo === "ia" ? "Conte sua ideia para continuar" : "Opcional";
          const bt = $('[data-acao="avancar"]');
          bt.disabled = gerando;
          bt.textContent = gerando ? "Preparando sua página…" : est.etapa === 2 && est.modo === "ia" ? "Preparar minha página" : "Continuar";
        }
        modal.querySelectorAll("[data-modo]").forEach((b) => b.addEventListener("click", () => {
          pararGeracao();
          est.modo = b.dataset.modo;
          $("[data-ia-erro]").hidden = true;
          $("#cr-prop-erro").hidden = true;
          inpProp.removeAttribute("aria-invalid");
          atualizarModo();
        }));
        $(".criacao-modos").addEventListener("keydown", (ev) => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(ev.key)) return;
          ev.preventDefault();
          const proximo = modal.querySelector(`[data-modo="${est.modo === "ia" ? "manual" : "ia"}"]`);
          proximo.click(); proximo.focus();
        });
        async function avancar() {
          if (gerando) return;
          if (est.etapa === 1) { mostrarEtapa(2); atualizarModo(); return; }
          if (!validarNome()) return;
          if (est.modo === "manual") {
            ler();
            desenhar();
            $("[data-estrutura]").open = true;
            mostrarEtapa(3);
            return;
          }
          if (inpProp.value.trim().length < 10) {
            $("#cr-prop-erro").hidden = false;
            inpProp.setAttribute("aria-invalid", "true");
            inpProp.focus();
            return;
          }
          const chave = JSON.stringify([inpNome.value.trim(), inpProp.value.trim()]);
          if (est.geracaoChave === chave) { mostrarEtapa(3); return; }
          controleIA = new AbortController();
          const meuPedido = ++pedidoAtual;
          gerando = true;
          atualizarModo();
          $("[data-ia-erro]").hidden = true;
          $("[data-ia-status]").hidden = false;
          $("[data-ia-texto]").textContent = "Preparando o Delfos neste aparelho…";
          $("[data-ia-progresso]").removeAttribute("value");
          try {
            await UI.carregarScript("ia-local.js");
            if (meuPedido !== pedidoAtual || !modal.isConnected) return;
            const sugestao = await IALocal.gerar({
              nome: inpNome.value.trim(), proposito: inpProp.value.trim(),
              camposExistentes: existentes.map(({rotulo,tipo}) => ({rotulo,tipo})),
              estruturaAtual: { vista: est.sug.visual.vista, campos: (editando ? novosCampos : est.sug.campos).filter(c => est.escolhidos.has(c.id)).map(({rotulo,tipo}) => ({rotulo,tipo})) },
            }, { signal: controleIA.signal, aoProgresso: (p) => {
              if (meuPedido !== pedidoAtual || !modal.isConnected) return;
              $("[data-ia-texto]").textContent = p.fase === "gerar" ? "Organizando sua página…" : "Preparando o Delfos neste aparelho…";
              if (p.fase === "carregar" && Number.isFinite(p.progresso)) {
                $("[data-ia-progresso]").max = 1;
                $("[data-ia-progresso]").value = Math.max(0, Math.min(1, p.progresso));
              } else $("[data-ia-progresso]").removeAttribute("value");
            }});
            if (meuPedido !== pedidoAtual || !modal.isConnected) return;
            const sug = sanear({ ...sugestao, proposito: inpProp.value.trim(), origem: "ia" }, inpNome.value.trim());
            if (est.mexeu) { est.pendente = sug; $("[data-aplicar]").hidden = false; }
            else aplicar(sug);
            est.geracaoChave = chave;
            $("[data-estrutura]").open = false;
            mostrarEtapa(3);
          } catch (erro) {
            if (meuPedido !== pedidoAtual || !modal.isConnected || erro.name === "AbortError") return;
            $("[data-ia-erro-texto]").textContent = erro.mensagemDelfos ? erro.message : "Não foi possível preparar sua página agora. Tente novamente ou monte do seu jeito.";
            const detalhe = erro.mensagemDelfos ? erro.detalhe || "" : "";
            $("[data-ia-erro-detalhe]").textContent = detalhe;
            $("[data-ia-erro-detalhes]").hidden = !detalhe;
            $("[data-ia-erro-detalhes]").open = false;
            $("[data-ia-erro]").hidden = false;
          } finally {
            if (meuPedido === pedidoAtual && modal.isConnected) {
              gerando = false;
              $("[data-ia-status]").hidden = true;
              atualizarModo();
            }
          }
        }
        $('[data-acao="avancar"]').addEventListener("click", avancar);
        $('[data-seguir-manual]').addEventListener("click", () => {
          pararGeracao(); est.modo = "manual"; atualizarModo(); avancar();
        });
        $('[data-acao="voltar"]').addEventListener("click", () => { pararGeracao(); mostrarEtapa(est.etapa - 1); atualizarModo(); });
        $('[data-acao="fechar"]').addEventListener("click", () => fechar(null));
        inpNome.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") { ev.preventDefault(); avancar(); }
        });
        const pluralRot = (r) => Leituras.pluralizar(r);
        let iconesDesenhados = false;

        // A grade de ícones (são dezenas) só é desenhada quando "Aparência e
        // detalhes" abre: na maior parte das vezes ninguém troca o ícone.
        function desenharIcones() {
          const s = est.sug;
          const det = $(".criador-ajustes");
          if (!det.open && !iconesDesenhados) return;
          iconesDesenhados = true;
          const oferta = [...new Set([s.icone, ...UI.ICONES_ABA.map((n) => `svg:${n}`), ])];
          $("[data-icones]").innerHTML = oferta.map((v) => `<button type="button" class="icone-opcao" data-icone="${esc(v)}" aria-pressed="${v === s.icone}" aria-label="Ícone ${esc(v.replace("svg:", ""))}">${UI.iconeAba(v)}</button>`).join("");
          $("[data-cores]").innerHTML = Store.PALETA_PILAR.map((cor) => `<button type="button" class="cor-opcao" data-cor="${esc(cor.valor)}" aria-pressed="${cor.valor === s.cor}" aria-label="Cor ${esc(cor.rotulo)}" style="--c:${esc(cor.valor)}"></button>`).join("");
        }

        // Desenha tudo a partir de est.sug (o que a pessoa mexe grava de volta em est.sug).
        function desenhar() {
          const s = est.sug;
          desenharIcones();
          $("#cr-desc").value = s.descricao || "";
          $("#cr-rot").value = s.rotuloItem || "";
          $("#cr-agenda").checked = !!s.naAgenda;
          $("#cr-checkin").checked = !!s.checkin;
          // Academia e Alimentação têm tela própria: sem campos, vista, meta nem agenda aqui.
          const academia = !!s.especial;
          $("[data-nota-academia]").hidden = !academia;
          $("[data-nota-academia]").textContent = s.especial === "alimentacao"
            ? "Sua dieta terá refeições, alimentos, calorias e macros, com a meta do dia, e dá para importar o plano de um PDF, foto ou planilha."
            : "Seus treinos terão dias, exercícios, séries, repetições e cargas.";
          ["[data-bloco-meta]", "[data-bloco-agrupar]", "[data-bloco-vista]"].forEach((q) => { $(q).hidden = academia; });
          $("#cr-agenda").closest(".linha-switch").hidden = academia;
          $("#cr-checkin").closest(".linha-switch").hidden = academia;
          $("[data-rotina]").hidden = academia;
          $("[data-bloco-campos]").hidden = academia;

          // Prévia
          const nomeVisto = inpNome.value.trim() || "Sua aba";
          $("[data-previa-topo]").innerHTML = `
            <span class="previa-icone" style="--c:${esc(s.cor)}" aria-hidden="true">${UI.iconeAba(s.icone, true)}</span>
            <span><span class="previa-nome">${esc(nomeVisto)}</span><span class="previa-desc">${esc(s.descricao || (s.checkin ? "Marcado a cada dia." : s.naAgenda ? "Com data, entra na agenda." : "Fora da agenda."))}</span></span>`;

          // Vista
          const vistas = s.checkin ? VISTAS.filter(([v]) => v === "lista" || v === "cartoes") : s.naAgenda ? VISTAS : VISTAS.filter(([v]) => v !== "calendario");
          // O seletor com desenho e frase; o campo escondido guarda o valor
          // (data-vistas), e quem estava com o foco nele continua nele.
          const caixaVistas = $("[data-vistas-box]");
          const focoNasVistas = caixaVistas.contains(document.activeElement);
          caixaVistas.innerHTML = UI.seletorVistasHTML({ nome: "cr-vista", atual: s.visual.vista, opcoes: UI.vistas(vistas.map(([v]) => v)), rotulo: "Como os registros aparecem" });
          caixaVistas.querySelector('input[type="hidden"]').setAttribute("data-vistas", "");
          UI.ligarSeletorVistas(caixaVistas.querySelector("[data-seletor-vistas]"));
          if (focoNasVistas) caixaVistas.querySelector('[aria-checked="true"]')?.focus();

          // Campos
          const lista = $("[data-campos]");
          const rot = s.rotuloItem || "registro";
          $("[data-titulo-campos]").textContent = `O que cada ${rot} guarda`;
          if (academia) {
            lista.innerHTML = "";
            $("[data-hint-campos]").textContent = "";
          } else if (editando) {
            lista.innerHTML = existentes.map((x) => linhaCampo(x, true, true)).join("") + novosCampos.map((x) => linhaCampo(x, est.escolhidos.has(x.id), false)).join("");
            $("[data-hint-campos]").textContent = novosCampos.length ? "Marque os campos sugeridos que quer acrescentar. Os atuais se editam em Campos desta aba." : "Para renomear, reordenar ou excluir campos, use Campos desta aba.";
          } else {
            lista.innerHTML = s.campos.length ? s.campos.map((x) => linhaCampo(x, est.escolhidos.has(x.id), false)).join("") : `<li class="muted">Só nome e data. Dá para acrescentar campos depois.</li>`;
            $("[data-hint-campos]").textContent = s.campos.some((x) => x.sugerido) ? "Nome e data já vêm em todo registro. Os marcados como sugestão são ideias do Delfos: ligue ou desligue como preferir." : "Nome e data já vêm em todo registro. Desmarque o que não quiser.";
          }

          // Meta
          const camposMeta = editando ? [...existentes, ...novosCampos.filter((x) => est.escolhidos.has(x.id))] : s.campos.filter((x) => est.escolhidos.has(x.id));
          const numericos = camposMeta.filter((x) => x.tipo === "number" || x.tipo === "dinheiro");
          const opcoes = [["concluidos", `${pluralRot(rot)} concluídos`], ...(s.checkin ? [["checkins", "marcações"]] : []), ...numericos.map((x) => [`soma:${x.id}`, `soma de ${inicialMinuscula(x.rotulo)}`])];
          const atual = s.meta.tipo === "soma" ? `soma:${s.meta.campoId}` : s.meta.tipo;
          $("#cr-meta-tipo").innerHTML = opcoes.map(([v, r]) => `<option value="${esc(v)}" ${v === atual ? "selected" : ""}>${esc(r)}</option>`).join("");
          $("#cr-meta-on").checked = s.meta.tipo !== "nenhuma";
          $("[data-meta-controles]").hidden = s.meta.tipo === "nenhuma";
          $("#cr-meta-alvo").value = s.meta.alvo || "";
          $("#cr-meta-periodo").value = s.meta.periodo || "mes";
          ["#cr-meta-tipo", "#cr-meta-alvo", "#cr-meta-periodo"].forEach((q) => { $(q).disabled = s.meta.tipo === "nenhuma"; });

          // Agrupar
          const selects = camposMeta.filter((x) => x.tipo === "select");
          $("#cr-agrupar").innerHTML = `<option value="">não agrupar</option>` + selects.map((x) => `<option value="${esc(x.id)}" ${x.id === s.agruparPor ? "selected" : ""}>${esc(x.rotulo)}</option>`).join("");
          $("[data-bloco-agrupar]").hidden = academia || !selects.length;

          // Exemplos
          const ex = editando ? [] : s.exemplos || [];
          $("[data-bloco-exemplos]").hidden = academia || !ex.length;
          $("[data-exemplos]").innerHTML = ex.map((e, i) => `<button type="button" class="chip" data-exemplo="${i}" aria-pressed="${est.exemplos.has(i)}">${esc(e)}</button>`).join("");
          const ativos = editando ? [...existentes, ...novosCampos.filter((x) => est.escolhidos.has(x.id))] : s.campos.filter((x) => est.escolhidos.has(x.id));
          const vistaRotulo = UI.vistas([s.visual.vista])[0]?.nome || "Lista";
          $("[data-mini-registros]").textContent = s.especial === "alimentacao" ? "Plano diário" : academia ? "Treinos" : "Registros";
          $("[data-previa-campos]").innerHTML = s.especial === "alimentacao"
            ? `<span>Café da manhã</span><span>Almoço</span><span>Lanche da tarde</span><span>Janta</span><span>Alimentos e calorias</span>`
            : academia
            ? `<span>Dia de treino</span><span>Exercícios</span><span>Cargas</span>`
            : `<span>Nome</span>${s.naAgenda ? "<span>Data</span>" : ""}${ativos.slice(0, 3).map((x) => `<span>${esc(x.rotulo)}</span>`).join("")}${ativos.length > 3 ? `<span>+${ativos.length - 3}</span>` : ""}`;
          $("[data-previa-resumo]").innerHTML = s.especial === "alimentacao" ? "Suas refeições lado a lado, com alimentos, calorias e check por dia. Você pode acrescentar outras refeições." : academia ? "Seus exercícios serão organizados por dia de treino."
            : `${UI.desenhoVista(s.visual.vista)}<span>${esc(vistaRotulo)}, ${ativos.length ? `${ativos.length} ${ativos.length === 1 ? "campo adicional" : "campos adicionais"}` : "nome e data"}${s.naAgenda ? ", na agenda" : ""}${s.checkin ? ", marcação diária" : ""}</span>`;
          $("[data-resumo-estrutura]").textContent = s.especial === "alimentacao" ? "Refeições e calorias" : academia ? "Dias de treino" : `${vistaRotulo}, ${ativos.length} ${ativos.length === 1 ? "campo" : "campos"}`;
          $("[data-adicionar-campo]").disabled = ativos.length >= 8;

        }

        function linhaCampo(x, marcado, travado) {
          const quantidade = existentes.length + est.escolhidos.size;
          const limite = !marcado && quantidade >= 8;
          const detalhe = x.tipo === "select" ? `${NOME_TIPO[x.tipo]}: ${x.opcoes.join(", ")}` : NOME_TIPO[x.tipo] || x.tipo;
          const tag = travado ? "div" : "label";
          return `
            <li class="${marcado ? "" : "desligada"}">
              <${tag} class="campo-opcao">
              <span class="campo-linha">
                <span class="campo-nome">${esc(x.rotulo)}${travado ? ` <span class="badge">atual</span>` : x.sugerido ? ` <span class="badge sugestao">sugestão</span>` : ""}</span>
                <span class="campo-tipo">${esc(detalhe)}</span>
              </span>
              ${travado ? "" : `<input type="checkbox" class="check" data-campo="${esc(x.id)}" ${marcado ? "checked" : ""} ${limite ? "disabled" : ""} aria-label="Incluir ${esc(x.rotulo)}" />`}
              </${tag}>
              ${travado ? "" : `<span class="campo-ferramentas"><button class="btn ghost sm" type="button" data-campo-editar="${esc(x.id)}" aria-label="Editar ${esc(x.rotulo)}">Editar</button><button class="btn ghost sm icon" type="button" data-campo-mover="${esc(x.id)}" aria-label="Mover ${esc(x.rotulo)} para cima">${icone("acima")}</button><button class="btn ghost sm icon" type="button" data-campo-remover="${esc(x.id)}" aria-label="Remover ${esc(x.rotulo)}">${icone("fechar")}</button></span>`}
            </li>`;
        }

        /** "O que o Delfos entendeu", frase a frase. */
        function desenharLeitura(r) {
          $("[data-entendeu]").innerHTML = (r?.entendeu || []).map((e) => `
            <li class="delfos-item ${e.tipo}">
              ${icone(ICONE_ENTENDEU[e.tipo] || "info")}
              <span>${esc(e.texto)}${e.por ? ` <span class="delfos-de">${esc(e.por)}</span>` : ""}</span>
            </li>`).join("");
        }

        // Aplica uma leitura do Delfos.
        function aplicar(sug) {
          if (editando) {
            // No editor, o Delfos só acrescenta: campos que ainda não existem.
            const idsJa = new Set(existentes.map((x) => x.id));
            novosCampos = sug.campos.map((x) => ({ ...x, id: idsJa.has(x.id) ? `${x.id}2` : x.id }));
            est.escolhidos = new Set();
            if (est.sug.meta.tipo === "nenhuma" && sug.meta.tipo !== "nenhuma" && sug.meta.tipo !== "soma") est.sug.meta = sug.meta;
            const pediuVista = est.leitura?.entendeu.some((e) => e.tipo === "vista" && e.pedido);
            if (pediuVista) est.sug.visual = { ...est.sug.visual, ...sug.visual };
            est.sug.proposito = sug.proposito;
            desenhar();
            return;
          }
          // A aba pronta "Alimentação" tem tela própria, seja qual for o nome escrito.
          if (est.modelo === "Alimentação") Object.assign(sug, { especial: "alimentacao", icone: "svg:prato", rotuloItem: "refeição", naAgenda: false, checkin: false, campos: [], descricao: "Sua dieta por refeição, as calorias de cada dia e os seus objetivos." });
          est.sug = sug;
          est.escolhidos = new Set(sug.campos.filter((x) => x.ativo !== false).map((x) => x.id));
          est.exemplos = new Set();
          desenhar();
        }

        // Grava de volta o que a pessoa mexeu no formulário.
        function ler() {
          const s = est.sug;
          s.visual.vista = $("[data-vistas]").value || s.visual.vista;
          s.descricao = $("#cr-desc").value.trim();
          s.rotuloItem = $("#cr-rot").value.trim().toLowerCase() || s.rotuloItem;
          s.naAgenda = $("#cr-agenda").checked;
          s.checkin = $("#cr-checkin").checked;
          const tipoSel = $("#cr-meta-tipo").value || "concluidos";
          s.meta = $("#cr-meta-on").checked
            ? { tipo: tipoSel.startsWith("soma:") ? "soma" : tipoSel, campoId: tipoSel.startsWith("soma:") ? tipoSel.slice(5) : "", alvo: Math.max(0, Math.min(100000, Number($("#cr-meta-alvo").value) || 0)), periodo: $("#cr-meta-periodo").value }
            : { ...SEM_META };
          s.agruparPor = $("#cr-agrupar").value;
          s.proposito = inpProp.value.trim();
          if (s.checkin && !["lista", "cartoes"].includes(s.visual.vista)) s.visual.vista = "lista";
          if (!s.naAgenda && s.visual.vista === "calendario") s.visual.vista = "lista";
        }

        const marcarMexeu = () => { est.mexeu = true; };

        function aplicarModeloLocal() {
          const pronto = ModelosAbas.obter(est.modeloId);
          if(pronto) {
            aplicar(sanear({...pronto,modeloOrigem:pronto.id,proposito:inpProp.value.trim()},inpNome.value.trim()));
            return;
          }
          const livre = est.modelo === "Aba livre" && !inpNome.value.trim();
          const r = Delfos.entender({ nome: inpNome.value.trim(), usadas: coresUsadas(pilar?.id), existentes });
          aplicar(sanear({ ...r.sugestao, ...(livre ? { campos: [], descricao: "", naAgenda: false, meta: SEM_META } : {}), proposito: inpProp.value.trim(), origem: "manual" }, inpNome.value.trim()));
        }

        modal.addEventListener("click", (ev) => {
          const ic = ev.target.closest("[data-icone]");
          const cor = ev.target.closest("[data-cor]");
          const exm = ev.target.closest("[data-exemplo]");
          if (ic) { ler(); est.sug.icone = ic.dataset.icone; marcarMexeu(); desenhar(); }
          if (cor) { ler(); est.sug.cor = cor.dataset.cor; marcarMexeu(); desenhar(); }
          if (exm) { const i = Number(exm.dataset.exemplo); est.exemplos.has(i) ? est.exemplos.delete(i) : est.exemplos.add(i); exm.setAttribute("aria-pressed", String(est.exemplos.has(i))); }
          if (ev.target.closest("[data-usar]") && est.pendente) {
            est.mexeu = false;
            aplicar(est.pendente);
            est.pendente = null;
            $("[data-aplicar]").hidden = true;
          }
        });
        modal.addEventListener("click", async (ev) => {
          const editar = ev.target.closest("[data-campo-editar]");
          const remover = ev.target.closest("[data-campo-remover]");
          const mover = ev.target.closest("[data-campo-mover]");
          const lista = editando ? novosCampos : est.sug.campos;
          if (editar) {
            const campo = lista.find(c => c.id === editar.dataset.campoEditar);
            if (!campo) return;
            const atualizado = await UI.formularioCampo(campo);
            if (!atualizado || !modal.isConnected) return;
            ler(); Object.assign(campo, atualizado); marcarMexeu(); desenhar();
          }
          if (remover) {
            const id = remover.dataset.campoRemover;
            const i = lista.findIndex(c => c.id === id);
            if (i < 0) return;
            ler(); lista.splice(i,1); est.escolhidos.delete(id); marcarMexeu(); desenhar();
          }
          if (mover) {
            const i = lista.findIndex(c => c.id === mover.dataset.campoMover);
            if (i <= 0) return;
            ler(); [lista[i-1],lista[i]] = [lista[i],lista[i-1]]; marcarMexeu(); desenhar();
          }
        });
        $("[data-adicionar-campo]").addEventListener("click", async () => {
          const campo = await UI.formularioCampo();
          if (!campo || !modal.isConnected) return;
          ler();
          const todos = editando ? [...existentes, ...novosCampos] : est.sug.campos;
          if (todos.filter((x) => est.escolhidos.has(x.id) || existentes.includes(x)).length >= 8) return;
          const usados = new Set([...RESERVADOS, ...todos.map((x) => x.id)]);
          let id = normalizar(campo.rotulo).replace(/\s+(\w)/g, (_, l) => l.toUpperCase()).replace(/\s/g, "").slice(0, 24) || "campo";
          while (usados.has(id)) id += "_";
          const novo = { ...campo, id, ativo: true, sugerido: false };
          if (editando) novosCampos.push(novo); else est.sug.campos.push(novo);
          est.escolhidos.add(id);
          marcarMexeu();desenhar();
        });
        $(".criador-ajustes").addEventListener("toggle", desenharIcones);
        modal.addEventListener("change", (ev) => {
          if (ev.target.matches("[data-campo]")) {
            const id = ev.target.dataset.campo;
            ev.target.checked ? est.escolhidos.add(id) : est.escolhidos.delete(id);
            ler(); marcarMexeu(); desenhar();
            return;
          }
          if (ev.target.matches("#cr-meta-on, #cr-checkin, #cr-agenda, #cr-meta-tipo, [data-vistas]")) {
            ler();
            if (ev.target.id === "cr-meta-on" && ev.target.checked && !est.sug.meta.alvo) est.sug.meta.alvo = 10;
            marcarMexeu(); desenhar();
            return;
          }
          if (ev.target !== inpNome && ev.target !== inpProp) { ler(); marcarMexeu(); }
        });
        ["#cr-desc", "#cr-rot"].forEach((q) => $(q).addEventListener("input", () => {
          ler(); marcarMexeu();
          const t = $("[data-previa-topo] .previa-desc");
          if (q === "#cr-desc" && t) t.textContent = $("#cr-desc").value;
        }));

        inpNome.addEventListener("input", () => {
          if (gerando) pararGeracao();
          if (inpNome.value.trim()) { $("#cr-nome-erro").hidden = true; inpNome.setAttribute("aria-invalid", "false"); }
        });
        inpProp.addEventListener("input", () => {
          if (gerando) pararGeracao();
          $("#cr-prop-erro").hidden = true;
          inpProp.removeAttribute("aria-invalid");
        });

        $('[data-acao="cancelar"]').addEventListener("click", () => fechar(null));
        $('[data-acao="criar"]').addEventListener("click", () => {
          const nome = inpNome.value.trim();
          if (est.etapa !== 3) return;
          if (!nome) { mostrarEtapa(2); validarNome(); return; }
          ler();
          const botao = $('[data-acao="criar"]');
          botao.disabled = true;
          try {
            const resultado = editando ? salvarEdicao(pilar, nome, est.sug, novosCampos.filter((x) => est.escolhidos.has(x.id))) : criar(nome, est.sug, est.escolhidos, est.exemplos, est.idCriacao);
            fechar(resultado);
          } catch {
            $("[data-erro-salvar]").hidden = false;
            $("[data-erro-salvar]").textContent = "Não foi possível salvar no navegador. Libere espaço e tente novamente.";
            botao.disabled = false;
          }
        });

        if (editando) {
          novosCampos = [];
          desenhar();
          desenharLeitura(est.sug.proposito ? Delfos.entender({ nome: pilar.nome, proposito: est.sug.proposito, existentes }) : { entendeu: [{ tipo: "dica", texto: "Conte o propósito desta aba e o Delfos sugere campos, meta e o jeito de ver que ainda faltam." }] });
        } else {
          aplicar(est.sug);
        }
        mostrarEtapa(est.etapa);
        filtrarModelos();
        atualizarModo();
      },
    }));
  }

  /** O campo como a aba o guarda: sem os selos do criador (sugerido, ativo), que só valem enquanto a janela está aberta. */
  const paraGravar = ({ id, rotulo, tipo, opcoes, naLista, obrigatorio, dica }) => ({ id, rotulo, tipo, opcoes, naLista, obrigatorio, ...(dica ? { dica } : {}) });

  /** Cria a aba a partir da leitura escolhida e abre a página dela. */
  function criar(nome, s, escolhidos, exemplos, idCriacao) {
    const alimentacao = s.especial === "alimentacao";
    const academia = s.especial === "academia" || alimentacao; // sem campos, registros nem vista
    const campos = academia ? [] : s.campos.filter((x) => escolhidos.has(x.id)).map(paraGravar);
    const agora = UI.hojeISO();
    const itens = academia ? [] : [...exemplos].map((i) => ({
      id: Store.uid("it"), descricao: s.exemplos[i], data: s.naAgenda ? agora : "", concluido: false, extras: {}, criadoEm: new Date().toISOString(), ...(s.checkin ? { feitos: [] } : {}),
    }));
    const ordemValida = !s.visual.ordem.startsWith("campo:") || campos.some((x) => `campo:${x.id}` === s.visual.ordem);
    const dados = {
      id: idCriacao, nome, icone: s.icone, cor: s.cor, descricao: s.descricao,
      modelo: s.especial || "personalizado",
      campos, naAgenda: academia ? false : s.naAgenda, checkin: academia ? false : s.checkin,
      rotuloItem: s.rotuloItem, agruparPor: campos.some((x) => x.id === s.agruparPor) ? s.agruparPor : "",
      meta: s.meta.tipo === "nenhuma" || !(s.meta.alvo > 0) || (s.meta.tipo === "soma" && !campos.some((x) => x.id === s.meta.campoId)) ? null : s.meta,
      proposito: s.proposito,
      exemploItem: s.exemplos[0] || "",
      visual: academia ? undefined : { vista: s.visual.vista, ordem: ordemValida ? s.visual.ordem : "auto", leitura: true, numeros: true, lateral: true, perguntas: true },
      sugeridoPor: s.origem || "manual",
      ...(s.modeloOrigem ? { modeloOrigem: s.modeloOrigem } : {}),
      itens,
      ...(s.especial === "academia" ? { academia: { configuradoEm: "", objetivo: "", experiencia: "", frequenciaSemanal: 0, divisao: "" }, dias: [] } : {}),
      ...(alimentacao ? { alimentacao: { objetivo: "", objetivos: "", metaKcal: null, metaProteina: null, metaCarbo: null, metaGordura: null }, plano: [], diario: {} } : {}),
    };
    const novo = Store.achar("pilares", idCriacao) ? Store.atualizar("pilares", idCriacao, dados) : Store.inserir("pilares", dados);
    location.href = `pilar.html?id=${encodeURIComponent(novo.id)}`;
    return novo;
  }

  function salvarEdicao(pilar, nome, s, acrescentar) {
    const atuais = pilar.campos || [];
    const campos = [...atuais, ...acrescentar.filter((x) => !atuais.some((a) => a.id === x.id)).map(paraGravar)];
    const academia = ESPECIAIS.includes(pilar.modelo);
    const dados = {
      nome, icone: s.icone, cor: s.cor, descricao: s.descricao, rotuloItem: s.rotuloItem,
      naAgenda: academia ? pilar.naAgenda : s.naAgenda,
      checkin: academia ? false : s.checkin,
      campos,
      agruparPor: campos.some((x) => x.id === s.agruparPor && x.tipo === "select") ? s.agruparPor : "",
      meta: s.meta.tipo === "nenhuma" || !(s.meta.alvo > 0) ? null : s.meta,
      proposito: s.proposito,
      ...(academia ? {} : { visual: { ...(pilar.visual || {}), vista: s.visual.vista } }),
    };
    Store.atualizar("pilares", pilar.id, dados);
    return dados;
  }

  return { sanear, abrir };
})();
