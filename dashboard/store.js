/* ===========================================================================
   Store — fonte única de dados do dashboard.

   Tudo que você cadastra pelas telas fica salvo no localStorage do navegador,
   sem precisar editar código nem usar git. O arquivo data.js serve apenas como
   conteúdo inicial (seed) na primeira vez que o dashboard é aberto.

   Backup: use "Exportar backup" (gera um .json com TUDO) e "Importar backup"
   para restaurar ou levar os dados para outro computador/navegador.
   =========================================================================== */

const Store = (() => {
  const KEY = "organizador.estado.v2";
  const KEY_LEGADO_TRANSACOES = "organizador.financeiro.transacoes.v1";

  const PERFIL_PADRAO = {
    // Identidade
    nome: "",
    dataNascimento: "",
    cidade: "",
    email: "",
    telefone: "",
    pronomes: "",
    foto: "", // data URL reduzida — ver UI.redimensionarFoto
    // Ocupação — o que a pessoa faz, em texto livre, e o tipo que decide
    // quais abas fixas fazem sentido para ela (ver sugerirAbas em personalizacao.js)
    ocupacao: "",
    tipoOcupacao: "", // "estudo" | "trabalho" | "ambos" | "outro"
    // Vida acadêmica — só aparece no formulário quando tipoOcupacao inclui estudo
    curso: "",
    instituicao: "",
    semestre: "",
    matricula: "",
    ingresso: "", // ano/mês de início do curso
    // Texto livre
    bio: "",
    objetivos: "",
    // Vazio = o assistente de boas-vindas ainda não rodou neste navegador
    configuradoEm: "",
  };

  /**
   * As quatro abas fixas podem ser desligadas (some da barra, nada é
   * apagado) e renomeadas — rotulo vazio segue o nome padrão da aba.
   */
  const PREFERENCIAS_PADRAO = {
    abasFixas: {
      pessoal: { ativo: true, rotulo: "" },
      financeiro: { ativo: true, rotulo: "" },
      faculdade: { ativo: true, rotulo: "" },
      projetos: { ativo: true, rotulo: "" },
    },
  };

  function preferenciasPadrao() {
    return JSON.parse(JSON.stringify(PREFERENCIAS_PADRAO));
  }

  /**
   * Tipos de campo que uma aba do usuário pode ter — os mesmos que
   * UI.campoHTML já sabe desenhar, mais "simNao" (caixa de marcar).
   */
  const TIPOS_CAMPO = [
    { valor: "text", rotulo: "Texto curto" },
    { valor: "textarea", rotulo: "Texto longo" },
    { valor: "date", rotulo: "Data" },
    { valor: "number", rotulo: "Número" },
    { valor: "dinheiro", rotulo: "Valor em R$" },
    { valor: "select", rotulo: "Lista de opções" },
    { valor: "simNao", rotulo: "Sim/Não" },
  ];

  /**
   * Pontos de partida para uma aba nova. Cada um já vem com os campos que
   * fazem sentido para aquele uso — o usuário pode ajustar depois em
   * "Ajustes da aba". naAgenda decide se os itens entram na agenda dos
   * próximos 30 dias e nos alertas de semana cheia da visão geral.
   */
  const MODELOS_PILAR = [
    {
      id: "compromissos",
      rotulo: "Compromissos",
      descricao: "Data, tipo e local — o formato da aba Pessoal.",
      naAgenda: true,
      campos: [
        { id: "tipo", rotulo: "Tipo", tipo: "select", opcoes: ["compromisso", "tarefa", "lembrete", "meta", "outro"], naLista: true },
        { id: "local", rotulo: "Local", tipo: "text", naLista: true },
        { id: "observacoes", rotulo: "Observações", tipo: "textarea", naLista: false },
      ],
    },
    {
      id: "tarefas",
      rotulo: "Tarefas",
      descricao: "Lista de afazeres com prioridade.",
      naAgenda: true,
      campos: [
        { id: "prioridade", rotulo: "Prioridade", tipo: "select", opcoes: ["baixa", "média", "alta"], naLista: true },
        { id: "observacoes", rotulo: "Observações", tipo: "textarea", naLista: false },
      ],
    },
    {
      id: "habitos",
      rotulo: "Hábitos / rotina",
      descricao: "Checklist que não entra na agenda de prazos.",
      naAgenda: false,
      campos: [
        { id: "frequencia", rotulo: "Frequência", tipo: "select", opcoes: ["diário", "semanal", "mensal"], naLista: true },
        { id: "observacoes", rotulo: "Observações", tipo: "textarea", naLista: false },
      ],
    },
    {
      id: "colecao",
      rotulo: "Coleção",
      descricao: "Livros, filmes, cursos — algo que se acompanha, não agenda.",
      naAgenda: false,
      campos: [
        { id: "situacao", rotulo: "Situação", tipo: "select", opcoes: ["quero", "em andamento", "concluído", "abandonado"], naLista: true },
        { id: "autor", rotulo: "Autor / fonte", tipo: "text", naLista: true },
        { id: "nota", rotulo: "Nota", tipo: "number", naLista: true },
        { id: "link", rotulo: "Link", tipo: "text", naLista: false },
        { id: "comentario", rotulo: "Comentário", tipo: "textarea", naLista: false },
      ],
    },
    {
      id: "registros",
      rotulo: "Registros com valor",
      descricao: "Algo com valor — treinos pagos, freelas, gastos de um hobby.",
      naAgenda: true,
      campos: [
        { id: "valor", rotulo: "Valor (R$)", tipo: "dinheiro", naLista: true },
        { id: "categoria", rotulo: "Categoria", tipo: "text", naLista: true },
        { id: "observacoes", rotulo: "Observações", tipo: "textarea", naLista: false },
      ],
    },
    {
      id: "livre",
      rotulo: "Do zero",
      descricao: "Sem campos prontos — monte em Ajustes da aba.",
      naAgenda: true,
      campos: [],
    },
    {
      id: "academia",
      rotulo: "Academia (treino)",
      descricao: "Dias de treino com exercícios do catálogo — carga, repetições e recorde de cada um.",
      naAgenda: false,
      campos: [],
      // Marca que troca a interface genérica (itens com campos) pela tela
      // própria de dias/exercícios em pilar.js — ver ACADEMIA_OBJETIVOS,
      // ACADEMIA_DIVISOES e sugerirDivisaoAcademia() logo abaixo.
      especial: "academia",
    },
  ];

  /**
   * O que se sabe, com razoável consenso na literatura de treinamento de
   * força, sobre como o objetivo e a frequência semanal decidem o tipo de
   * divisão — não o que treinar, só como organizar os dias. O Delfos nunca
   * prescreve exercício, carga ou repetição: quem decide o que vai em cada
   * dia é o próprio usuário, escolhendo do catálogo.
   */
  const ACADEMIA_OBJETIVOS = [
    { valor: "hipertrofia", rotulo: "Ganhar massa muscular (hipertrofia)" },
    { valor: "forca", rotulo: "Ganhar força" },
    { valor: "resistencia", rotulo: "Resistência e condicionamento" },
    { valor: "emagrecimento", rotulo: "Emagrecimento" },
    { valor: "saude", rotulo: "Saúde geral e disposição" },
  ];

  const ACADEMIA_EXPERIENCIAS = [
    { valor: "iniciante", rotulo: "Iniciante (menos de 1 ano de treino)" },
    { valor: "intermediario", rotulo: "Intermediário (1 a 3 anos)" },
    { valor: "avancado", rotulo: "Avançado (mais de 3 anos)" },
  ];

  const ACADEMIA_DIVISOES = [
    { valor: "fullbody", rotulo: "Corpo inteiro (full body) a cada sessão" },
    { valor: "upperlower", rotulo: "Superior / Inferior (upper/lower)" },
    { valor: "ppl", rotulo: "Empurrar / Puxar / Pernas (push/pull/legs)" },
    { valor: "grupomuscular", rotulo: "Um ou dois grupos musculares por dia" },
    { valor: "livre", rotulo: "Prefiro montar meus próprios dias" },
  ];

  /**
   * Sugestão de divisão a partir da frequência semanal — ponto de partida
   * editável, não regra fixa. Vem de duas ideias com bom suporte na
   * literatura: treinar cada grupo muscular com mais frequência (~2x por
   * semana) tende a ser tão ou mais eficaz que uma vez só, contanto que o
   * volume da semana seja parecido — por isso full body/upper-lower ganham
   * espaço nas frequências baixas e médias, e só em 5 dias (onde dividir por
   * grupo muscular sem repetir nenhum é mais prático) a sugestão vira "um
   * grupo por dia", já avisando essa troca no texto que acompanha.
   */
  function sugerirDivisaoAcademia(frequenciaSemanal) {
    const f = Number(frequenciaSemanal) || 0;
    if (f <= 3) return "fullbody";
    if (f === 4) return "upperlower";
    if (f === 5) return "grupomuscular";
    return "ppl"; // 6-7x: dá pra repetir push/pull/legs na semana
  }

  /** Nomes de dia sugeridos para a divisão escolhida — só o ponto de partida; dá pra renomear, apagar e criar outros. */
  function diasSugeridosAcademia(divisao, frequenciaSemanal) {
    const f = Math.max(1, Math.min(7, Number(frequenciaSemanal) || 3));
    if (divisao === "upperlower") return ["Superior A", "Inferior A", "Superior B", "Inferior B"].slice(0, Math.max(2, f));
    if (divisao === "ppl") return ["Empurrar (peito, ombro, tríceps)", "Puxar (costas, bíceps)", "Pernas"];
    if (divisao === "grupomuscular") {
      return ["Peito e tríceps", "Costas e bíceps", "Pernas", "Ombro", "Braços e abdômen"].slice(0, Math.max(3, Math.min(5, f)));
    }
    if (divisao === "livre") return [];
    // fullbody
    return ["Treino A", "Treino B", "Treino C"].slice(0, Math.max(1, Math.min(3, f)));
  }

  const CATEGORIAS_PADRAO = [
    "Moradia",
    "Alimentação",
    "Transporte",
    "Saúde",
    "Educação",
    "Lazer",
    "Assinaturas",
    "Renda",
    "Outros",
  ];

  /**
   * Cores oferecidas para as abas que o usuário cria. São hex fixos (não
   * tokens do tema) porque a aba é dado do usuário, não do design system —
   * por isso foram escolhidas numa faixa de luminosidade média, que enxerga
   * bem tanto no tema claro quanto no escuro. Nenhuma é vermelha: vermelho
   * fica reservado para urgência, e nenhuma repete a cor dos quatro pilares
   * fixos, para as abas continuarem distinguíveis entre si.
   */
  const PALETA_PILAR = [
    { valor: "#d6398a", rotulo: "Rosa" },
    { valor: "#0d95b5", rotulo: "Ciano" },
    { valor: "#b57d0a", rotulo: "Âmbar" },
    { valor: "#5a4fd4", rotulo: "Índigo" },
    { valor: "#6e8f22", rotulo: "Oliva" },
    { valor: "#5b6b7d", rotulo: "Ardósia" },
  ];

  const ICONES_PILAR = [
    "◆", "●", "■", "▲", "★", "✦", "♥", "⚑", "⌂", "♪", "☾", "✎",
    "▪", "▼", "◀", "▶", "○", "□", "△", "◇", "✚", "✕", "✳", "❖",
    "➤", "⚙", "⚡", "⚓", "⛊", "⚔", "♛", "♞", "⚖", "⚗", "✂", "⌘",
    "∞", "Ω", "Σ", "§", "❦", "⚘", "⛰", "☂", "✈", "⛵",
  ];

  let estado = null;
  const ouvintes = [];

  function uid(prefixo = "i") {
    return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Texto puro (com quebras de linha) → HTML de parágrafos. Usado na migração
   * dos resumos que foram escritos antes do editor formatado existir: o que
   * era markup vira texto visível, não marcação.
   */
  function textoParaHTML(texto) {
    const bruto = String(texto || "");
    if (!bruto.trim()) return "";
    const escapar = (s) =>
      s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    return bruto
      .split(/\n{2,}/)
      .map((par) => `<p>${escapar(par).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function estadoVazio() {
    return {
      versao: 9,
      atualizadoEm: new Date().toISOString(),
      perfil: { ...PERFIL_PADRAO },
      preferencias: preferenciasPadrao(),
      financeiro: {
        saldoAtual: 0,
        moeda: "BRL",
        categorias: [...CATEGORIAS_PADRAO],
        transacoes: [],
        metas: [],
        contas: [],
        cartoes: [],
        investimentos: [],
      },
      faculdade: { disciplinas: [], prazos: [] },
      projetos: [],
      oportunidades: [],
      pessoal: { compromissos: [] },
      pilares: [], // abas criadas pelo próprio usuário — ver PALETA_PILAR
    };
  }

  /* --------- Conversão do data.js (seed) para o formato do store ---------- */

  function apartirDoSeed() {
    const base = estadoVazio();
    if (typeof DATA === "undefined") return base;

    const fin = DATA.financeiro || {};
    base.financeiro.saldoAtual = Number(fin.saldoAtual) || 0;
    base.financeiro.moeda = fin.moeda || "BRL";
    if (Array.isArray(fin.categorias) && fin.categorias.length) {
      base.financeiro.categorias = [...fin.categorias];
    }

    (fin.receitasMes || []).forEach((r) =>
      base.financeiro.transacoes.push({
        id: uid("t"), data: r.data, tipo: "receita", categoria: r.categoria || "Renda",
        descricao: r.descricao || "", forma: "", origem: "", status: "pago", valor: Number(r.valor) || 0,
      })
    );
    (fin.despesasMes || []).forEach((d) =>
      base.financeiro.transacoes.push({
        id: uid("t"), data: d.data, tipo: "despesa", categoria: d.categoria || "Outros",
        descricao: d.descricao || "", forma: "", origem: "", status: "pago", valor: Number(d.valor) || 0,
      })
    );
    (fin.metas || []).forEach((m) =>
      base.financeiro.metas.push({
        id: uid("m"), descricao: m.descricao || "", valorAlvo: Number(m.valorAlvo) || 0,
        valorAtual: Number(m.valorAtual) || 0, prazo: m.prazo || "",
      })
    );

    const fac = DATA.faculdade || {};
    (fac.disciplinas || []).forEach((d) =>
      base.faculdade.disciplinas.push({
        id: uid("d"), nome: d.nome || "", status: d.status || "ativa", professor: d.professor || "",
        proximaAvaliacao: d.proximaAvaliacao || "", nota: d.nota ?? null,
        avaliacoes: [], materiais: [], resumos: [],
      })
    );
    (fac.prazos || []).forEach((p) =>
      base.faculdade.prazos.push({
        id: uid("p"), descricao: p.descricao || "", data: p.data || "",
        tipo: p.tipo || "entrega", disciplinaId: "", concluido: !!p.concluido,
      })
    );

    (DATA.projetos || []).forEach((p) =>
      base.projetos.push({
        id: uid("pj"), nome: p.nome || "", status: p.status || "em andamento",
        tipo: "", descricao: p.descricao || "", cliente: "", link: "",
        inicio: "", deadline: p.deadline || "", prioridade: "média",
        horasSemana: null, rendaEstimada: null, anotacoes: "",
        recebimentos: [], custos: [], anexos: [],
        passos: (p.passos || (p.proximoPasso ? [{ texto: p.proximoPasso }] : [])).map((s) => ({
          id: uid("s"), texto: typeof s === "string" ? s : s.texto || "", feito: typeof s === "object" && !!s.feito,
        })),
      })
    );

    (DATA.oportunidades || []).forEach((o) =>
      base.oportunidades.push({
        id: uid("o"), descricao: o.descricao || "", area: o.area || "",
        potencial: o.potencial || "", esforco: o.esforco || "", anotacoes: o.anotacoes || "",
      })
    );

    return base;
  }

  /* ----- Migração dos lançamentos salvos pela versão anterior do app ------ */

  function migrarLegado(base) {
    try {
      const bruto = localStorage.getItem(KEY_LEGADO_TRANSACOES);
      if (!bruto) return base;
      const antigos = JSON.parse(bruto);
      if (!Array.isArray(antigos) || antigos.length === 0) return base;

      // Substitui o seed: dados digitados pelo usuário valem mais que o exemplo.
      base.financeiro.transacoes = antigos.map((t) => ({
        id: t.id || uid("t"), data: t.data || "", tipo: t.tipo === "receita" ? "receita" : "despesa",
        categoria: t.categoria || "Outros", descricao: t.descricao || "", forma: t.forma || "",
        origem: "", status: t.status === "pendente" ? "pendente" : "pago", valor: Number(t.valor) || 0,
      }));
      localStorage.removeItem(KEY_LEGADO_TRANSACOES);
    } catch (e) {
      console.warn("Não foi possível migrar os lançamentos antigos.", e);
    }
    return base;
  }

  /* ------------------------------ Carga ---------------------------------- */

  function carregar() {
    if (estado) return estado;
    try {
      const bruto = localStorage.getItem(KEY);
      if (bruto) {
        const salvo = JSON.parse(bruto);
        estado = normalizar(salvo);
        // Grava já o formato convertido, para o que está no navegador não
        // ficar preso a uma versão antiga esperando a próxima edição.
        if (salvo.versao !== estado.versao) persistir();
        return estado;
      }
    } catch (e) {
      console.warn("Estado salvo ilegível; recomeçando a partir do seed.", e);
    }
    estado = migrarLegado(apartirDoSeed());
    persistir();
    return estado;
  }

  /**
   * Garante que estados salvos por versões anteriores tenham todos os campos
   * e converte os formatos antigos. Roda em toda carga, então precisa ser
   * idempotente.
   */
  function normalizar(e) {
    const base = estadoVazio();
    const out = { ...base, ...e };

    out.perfil = { ...PERFIL_PADRAO, ...(e.perfil || {}) };

    // v7 → v8: preferências de abas fixas (ligar/desligar, renomear). Mescla
    // campo a campo para uma preferência salva não perder o que uma versão
    // nova de PREFERENCIAS_PADRAO venha a acrescentar.
    out.preferencias = preferenciasPadrao();
    Object.keys(out.preferencias.abasFixas).forEach((k) => {
      out.preferencias.abasFixas[k] = { ...out.preferencias.abasFixas[k], ...(e.preferencias?.abasFixas?.[k] || {}) };
    });

    out.financeiro = { ...base.financeiro, ...(e.financeiro || {}) };
    out.faculdade = { ...base.faculdade, ...(e.faculdade || {}) };

    out.financeiro.metas = e.financeiro?.metas || [];
    out.financeiro.contas = e.financeiro?.contas || [];
    out.financeiro.cartoes = e.financeiro?.cartoes || [];
    // v4 → v5: investimentos passam a ter aba própria (renda fixa, ações, etc.).
    out.financeiro.investimentos = e.financeiro?.investimentos || [];
    out.financeiro.categorias = e.financeiro?.categorias?.length ? e.financeiro.categorias : [...CATEGORIAS_PADRAO];

    // v2 → v3: lançamento passa a saber de qual conta ou cartão saiu.
    out.financeiro.transacoes = (e.financeiro?.transacoes || []).map((t) => ({ origem: "", ...t }));

    // v2 → v3: nota e próxima avaliação viram itens da lista de avaliações,
    // que passa a ser a única fonte de notas e datas de prova da disciplina.
    out.faculdade.disciplinas = (e.faculdade?.disciplinas || []).map((d) => {
      const disc = { materiais: [], resumos: [], avaliacoes: [], ...d };
      disc.avaliacoes = [...(disc.avaliacoes || [])];

      // v3 → v4: material e resumo passam a poder carregar arquivos anexados.
      disc.materiais = (disc.materiais || []).map((m) => ({ anexos: [], ...m }));

      // v6 → v7: o resumo passa a ser escrito no editor formatado, então o
      // conteúdo vira HTML. `conteudoFormato` marca o que já foi convertido —
      // sem ele a conversão rodaria de novo a cada carga e escaparia o
      // próprio escape.
      disc.resumos = (disc.resumos || []).map((r) => {
        const res = { anexos: [], ...r };
        if (res.conteudoFormato !== "html") {
          res.conteudo = textoParaHTML(res.conteudo);
          res.conteudoFormato = "html";
        }
        return res;
      });

      if (disc.proximaAvaliacao) {
        disc.avaliacoes.push({ id: uid("av"), nome: "Avaliação", data: disc.proximaAvaliacao, nota: null, peso: 1 });
        delete disc.proximaAvaliacao;
      }
      if (disc.nota !== null && disc.nota !== undefined && disc.nota !== "") {
        disc.avaliacoes.push({ id: uid("av"), nome: "Nota lançada", data: "", nota: Number(disc.nota), peso: 1 });
      }
      delete disc.nota;
      return disc;
    });

    out.faculdade.prazos = (e.faculdade?.prazos || []).map((p) => ({ disciplinaId: "", ...p }));

    // v5 → v6: cada projeto ganha página própria e passa a registrar recebimentos
    // e custos item a item. O total que antes era digitado à mão vira o primeiro
    // recebimento — assim o valor não se perde nem vira uma segunda fonte de
    // verdade concorrendo com a lista.
    out.projetos = (Array.isArray(e.projetos) ? e.projetos : []).map((p) => {
      const proj = {
        tipo: "", cliente: "", link: "", inicio: "", prioridade: "média",
        horasSemana: null, rendaEstimada: null, anotacoes: "",
        passos: [], recebimentos: [], custos: [], anexos: [],
        ...p,
      };
      proj.passos = proj.passos || [];
      proj.recebimentos = proj.recebimentos || [];
      proj.custos = proj.custos || [];
      proj.anexos = proj.anexos || [];

      const totalAntigo = Number(proj.receitaGerada) || 0;
      if (totalAntigo > 0 && !proj.recebimentos.length) {
        proj.recebimentos = [{
          id: uid("re"), data: "", valor: totalAntigo,
          descricao: "Recebido antes do registro detalhado",
        }];
      }
      delete proj.receitaGerada;
      return proj;
    });

    out.oportunidades = Array.isArray(e.oportunidades) ? e.oportunidades : [];
    // v4 → v5: aba nova para compromissos pessoais (consultas, tarefas, recados).
    out.pessoal = { compromissos: e.pessoal?.compromissos || [] };

    // v6 → v7: o usuário pode criar as próprias abas da barra lateral.
    out.pilares = (Array.isArray(e.pilares) ? e.pilares : []).map((p) => {
      const pil = {
        icone: ICONES_PILAR[0],
        cor: PALETA_PILAR[0].valor,
        naAgenda: true,
        ...p,
        itens: p.itens || [],
      };

      // v7 → v8: toda aba passa a ter um modelo e uma lista de campos
      // próprios (editáveis em "Ajustes da aba"). Uma aba sem `campos` é de
      // antes disso existir e vira o modelo "compromissos", que reproduz
      // exatamente o formulário fixo que ela já tinha — a presença de
      // `campos` é a marca que impede essa conversão de rodar de novo.
      if (!Array.isArray(pil.campos)) {
        const modeloPadrao = MODELOS_PILAR.find((m) => m.id === "compromissos");
        pil.modelo = "compromissos";
        pil.campos = modeloPadrao.campos.map((c) => ({ ...c }));
        pil.naAgenda = true;
      }

      // v7 → v8: os valores dos campos próprios, que ficavam soltos no item,
      // vão para `extras` — id/descricao/data/concluido continuam campos de
      // sistema. A presença de `extras` é a marca que impede a conversão de
      // rodar de novo e perder valores já convertidos.
      pil.itens = pil.itens.map((it) => {
        if (it.extras) return it;
        const { id, descricao, data, concluido, ...resto } = it;
        return { id, descricao, data, concluido: !!concluido, extras: resto };
      });

      // v8 → v9: o modelo "academia" ganhou tela própria (dias de treino com
      // exercícios do catálogo). Uma aba desse modelo sem `academia` ainda
      // não passou pelo questionário inicial — a presença de `academia` é a
      // marca que impede essa conversão de rodar de novo.
      if (pil.modelo === "academia" && !pil.academia) {
        pil.academia = { configuradoEm: "", objetivo: "", experiencia: "", frequenciaSemanal: 0, divisao: "" };
        pil.dias = Array.isArray(pil.dias) ? pil.dias : [];
      }

      return pil;
    });

    out.versao = 9;
    return out;
  }

  function persistir() {
    estado.atualizadoEm = new Date().toISOString();
    try {
      localStorage.setItem(KEY, JSON.stringify(estado));
    } catch (e) {
      console.error("Falha ao salvar no navegador.", e);
      alert("Não foi possível salvar. O armazenamento do navegador pode estar cheio ou bloqueado (modo anônimo).");
      return;
    }
    ouvintes.forEach((fn) => fn(estado));
  }

  /* ------------------------- Acesso às coleções --------------------------- */

  // Caminhos aceitos: "financeiro.transacoes", "financeiro.metas",
  // "financeiro.contas", "financeiro.cartoes", "faculdade.disciplinas",
  // "faculdade.prazos", "projetos", "oportunidades".
  function colecao(caminho) {
    const e = carregar();
    let alvo = e;
    for (const p of caminho.split(".")) alvo = alvo[p];
    if (!Array.isArray(alvo)) throw new Error(`Coleção inválida: ${caminho}`);
    return alvo;
  }

  return {
    uid,
    CATEGORIAS_PADRAO,
    PALETA_PILAR,
    ICONES_PILAR,
    MODELOS_PILAR,
    TIPOS_CAMPO,
    ACADEMIA_OBJETIVOS,
    ACADEMIA_EXPERIENCIAS,
    ACADEMIA_DIVISOES,
    sugerirDivisaoAcademia,
    diasSugeridosAcademia,
    textoParaHTML,

    estado: () => carregar(),
    aoMudar(fn) { ouvintes.push(fn); },

    lista(caminho) { return colecao(caminho); },
    achar(caminho, id) { return colecao(caminho).find((x) => x.id === id) || null; },

    inserir(caminho, item) {
      const novo = { id: uid(), ...item };
      colecao(caminho).push(novo);
      persistir();
      return novo;
    },

    atualizar(caminho, id, patch) {
      const item = colecao(caminho).find((x) => x.id === id);
      if (!item) return null;
      Object.assign(item, patch);
      persistir();
      return item;
    },

    remover(caminho, id) {
      const arr = colecao(caminho);
      const i = arr.findIndex((x) => x.id === id);
      if (i < 0) return null;
      const [removido] = arr.splice(i, 1);
      persistir();
      return removido;
    },

    // Reinsere um item removido na posição original (usado pelo "desfazer").
    restaurar(caminho, item, indice) {
      const arr = colecao(caminho);
      arr.splice(Math.min(indice ?? arr.length, arr.length), 0, item);
      persistir();
    },

    indiceDe(caminho, id) { return colecao(caminho).findIndex((x) => x.id === id); },

    /* --- Sub-listas de um item (avaliações, materiais e resumos de uma
           disciplina; etapas de um projeto) --------------------------------- */

    subInserir(caminho, itemId, campo, sub) {
      const item = colecao(caminho).find((x) => x.id === itemId);
      if (!item) return null;
      const novo = { id: uid(campo.slice(0, 2)), ...sub };
      item[campo] = [...(item[campo] || []), novo];
      persistir();
      return novo;
    },

    subAtualizar(caminho, itemId, campo, subId, patch) {
      const item = colecao(caminho).find((x) => x.id === itemId);
      if (!item) return null;
      item[campo] = (item[campo] || []).map((s) => (s.id === subId ? { ...s, ...patch } : s));
      persistir();
      return item;
    },

    subRemover(caminho, itemId, campo, subId) {
      const item = colecao(caminho).find((x) => x.id === itemId);
      if (!item) return null;
      item[campo] = (item[campo] || []).filter((s) => s.id !== subId);
      persistir();
      return item;
    },

    definirSaldo(valor) {
      carregar().financeiro.saldoAtual = Number(valor) || 0;
      persistir();
    },

    definirPerfil(patch) {
      const e = carregar();
      e.perfil = { ...e.perfil, ...patch };
      persistir();
      return e.perfil;
    },

    // patch.abasFixas mescla campo a campo (ativo/rotulo) em vez de
    // substituir o objeto inteiro, para desligar uma aba não apagar o
    // rótulo que já tinha sido escolhido para ela.
    definirPreferencias(patch) {
      const e = carregar();
      const { abasFixas, ...resto } = patch;
      e.preferencias = { ...e.preferencias, ...resto };
      if (abasFixas) {
        Object.entries(abasFixas).forEach(([k, v]) => {
          e.preferencias.abasFixas[k] = { ...e.preferencias.abasFixas[k], ...v };
        });
      }
      persistir();
      return e.preferencias;
    },

    /* ------------------------- Backup completo --------------------------

       O .json leva o estado E os anexos (que moram no IndexedDB, não aqui),
       para um backup sozinho bastar para reconstruir tudo em outro navegador.
       Por isso exportar/importar são assíncronos. ------------------------- */

    async exportar() {
      const pacote = { ...carregar() };
      if (typeof Arquivos !== "undefined" && Arquivos.disponivel) {
        try { pacote.arquivos = await Arquivos.exportarTodos(); }
        catch (e) { console.warn("Backup sem os anexos: não foi possível lê-los.", e); }
      }
      return JSON.stringify(pacote, null, 2);
    },

    async importar(texto) {
      const dados = JSON.parse(texto);
      if (!dados || typeof dados !== "object") throw new Error("Arquivo inválido.");
      if (!dados.financeiro && !dados.faculdade && !dados.projetos) {
        throw new Error("Este arquivo não parece ser um backup do Delfos.");
      }

      let anexos = 0;
      if (Array.isArray(dados.arquivos) && typeof Arquivos !== "undefined" && Arquivos.disponivel) {
        anexos = await Arquivos.importarTodos(dados.arquivos);
      }
      delete dados.arquivos;

      estado = normalizar(dados);
      persistir();
      return { estado, anexos };
    },

    async limpar() {
      if (typeof Arquivos !== "undefined" && Arquivos.disponivel) await Arquivos.limpar();
      estado = estadoVazio();
      persistir();
      return estado;
    },
  };
})();
