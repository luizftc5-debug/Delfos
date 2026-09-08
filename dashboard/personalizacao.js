/* ===========================================================================
   Personalizacao — traduz o perfil e as preferências do usuário em como o
   painel se apresenta: se o assistente de boas-vindas precisa rodar, com que
   nome e ocupação ele fala, e quais das quatro abas fixas aparecem e com que
   nome. Não guarda estado próprio — tudo vem do Store.
   =========================================================================== */

const Personalizacao = (() => {
  const ROTULOS_PADRAO = {
    pessoal: "Pessoal",
    financeiro: "Financeiro",
    faculdade: "Faculdade",
    projetos: "Projetos",
  };

  const ICONES_PADRAO = { pessoal: "●", financeiro: "$", faculdade: "▤", projetos: "◇" };

  function perfil() { return Store.estado().perfil || {}; }
  function preferencias() { return Store.estado().preferencias || { abasFixas: {} }; }

  /** Vazio = o assistente de boas-vindas nunca rodou (ou "Pular" ainda não foi tocado). */
  function precisaConfigurar() {
    return !perfil().configuradoEm;
  }

  /** Grava o que o assistente coletou e marca a configuração como feita. */
  function concluir({ perfil: dadosPerfil = {}, abasFixas = {} } = {}) {
    Store.definirPerfil({ ...dadosPerfil, configuradoEm: new Date().toISOString() });
    Store.definirPreferencias({ abasFixas });
  }

  /** "Pular por enquanto": não toca em nada além de marcar como visto. */
  function pular() {
    Store.definirPerfil({ configuradoEm: new Date().toISOString() });
  }

  function primeiroNome() {
    return String(perfil().nome || "").trim().split(/\s+/)[0] || "";
  }

  function saudacao() {
    const nome = primeiroNome();
    const hora = new Date().getHours();
    const parte = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
    return nome ? `${parte}, ${nome}` : "Visão geral";
  }

  // Sem tipoOcupacao salvo (perfil de antes desse campo existir), um curso
  // preenchido já basta para tratar a pessoa como estudante.
  function eEstudante() {
    const t = perfil().tipoOcupacao;
    if (t) return t === "estudo" || t === "ambos";
    return !!perfil().curso;
  }

  /** Uma linha curta com o que a pessoa faz, para a leitura da home e o perfil. */
  function ocupacaoResumo() {
    const p = perfil();
    const semestre = eEstudante() && p.semestre ? `${p.semestre}º semestre` : "";
    if (p.ocupacao) return [p.ocupacao, semestre].filter(Boolean).join(" · ");
    if (p.curso) return [p.curso, semestre].filter(Boolean).join(" · ");
    return "";
  }

  /** As quatro abas fixas, já com o rótulo escolhido (ou o padrão) e se estão ligadas. */
  function abasFixas() {
    const prefs = preferencias().abasFixas || {};
    return Object.keys(ROTULOS_PADRAO).map((id) => {
      const conf = prefs[id] || {};
      return {
        id,
        ativo: conf.ativo !== false,
        rotulo: conf.rotulo || ROTULOS_PADRAO[id],
        rotuloPadrao: ROTULOS_PADRAO[id],
        icone: ICONES_PADRAO[id],
      };
    });
  }

  function rotuloAba(id) {
    const conf = (preferencias().abasFixas || {})[id];
    return (conf && conf.rotulo) || ROTULOS_PADRAO[id] || id;
  }

  function abaAtiva(id) {
    const conf = (preferencias().abasFixas || {})[id];
    return !conf || conf.ativo !== false;
  }

  /**
   * Pré-marcação do passo 3 do assistente: quem só trabalha começa sem
   * Faculdade, quem só estuda começa sem Projetos — mas nada impede religar
   * qualquer uma depois, no perfil.
   */
  function sugerirAbas(tipoOcupacao) {
    const base = { pessoal: true, financeiro: true, faculdade: true, projetos: true };
    if (tipoOcupacao === "trabalho") return { ...base, faculdade: false };
    if (tipoOcupacao === "estudo") return { ...base, projetos: false };
    return base;
  }

  return {
    ROTULOS_PADRAO,
    precisaConfigurar, concluir, pular,
    primeiroNome, saudacao, eEstudante, ocupacaoResumo,
    abasFixas, rotuloAba, abaAtiva, sugerirAbas,
  };
})();
