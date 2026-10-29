/* Adapta planos e registros antigos sem gravar nem apagar os originais. */
const PlanoAlimentar = (() => {
  const PADROES = [
    { id: "refeicao-cafe", nome: "Café da manhã" },
    { id: "refeicao-almoco", nome: "Almoço" },
    { id: "refeicao-lanche", nome: "Lanche da tarde" },
    { id: "refeicao-janta", nome: "Janta" },
  ];
  const copiar = x => JSON.parse(JSON.stringify(x));
  const normal = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const aliases = new Map(Object.entries({ "cafe da manha": "cafe", cafe: "cafe", almoco: "almoco", lanche: "lanche", "lanche da tarde": "lanche", jantar: "janta", janta: "janta" }));
  const chave = nome => aliases.get(normal(nome)) || normal(nome);
  const numero = v => v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
  const ehAba = p => p.modelo === "alimentacao" || p.modeloOrigem === "alimentacao" ||
    (p.campos || []).some(c => c.id === "refeicao") && (p.campos || []).some(c => c.id === "ingredientes");
  function comPadroes(refeicoes = []) {
    const plano = copiar(refeicoes);
    const presentes = new Set(plano.map(r => chave(r.nome)));
    const ids = new Set(plano.map(r => r.id));
    for (const padrao of PADROES) if (!presentes.has(chave(padrao.nome))) {
      let id = padrao.id;
      while (ids.has(id)) id += "-padrao";
      ids.add(id); plano.push({ ...padrao, id, hora: "", itens: [], padrao: true });
    }
    return plano;
  }
  function itemAntigo(c, registro) {
    const e = c.extras || {}, r = registro || {};
    const alimento = String(r.alimento ?? e.ingredientes ?? "").trim() || (chave(c.descricao) !== chave(e.refeicao || c.descricao) ? c.descricao : "");
    return { id: `alimento-legado-${c.id}`, alimento,
      quantidade: e.quantidade || (e.porcoes ? `${e.porcoes} porções` : ""),
      kcal: numero(registro ? r.calorias : e.calorias), proteina: null, carbo: null, gordura: null,
      estimado: false, origemLegado: c.id };
  }
  function preparar(p) {
    const original = p.diario && typeof p.diario === "object" && !Array.isArray(p.diario) ? p.diario : {};
    if (p.planoDiario === 1) return { plano: p.plano || [], diario: original };
    const diario = copiar(original);
    const plano = comPadroes(Array.isArray(p.plano) ? p.plano : []);
    const porNome = new Map(plano.map(r => [chave(r.nome), r]));
    for (const c of p.itens || []) {
      if (c.extras?.rotina !== true) continue;
      const nome = c.extras.refeicao || c.descricao || "Outra refeição";
      let refeicao = porNome.get(chave(nome));
      if (!refeicao) {
        refeicao = { id: `refeicao-legado-${c.id}`, nome, hora: "", itens: [] };
        plano.push(refeicao); porNome.set(chave(nome), refeicao);
      }
      const alimento = itemAntigo(c);
      if ((alimento.alimento || alimento.kcal !== null) && !refeicao.itens.some(i => i.id === alimento.id)) refeicao.itens.push({ ...alimento, alimento: alimento.alimento || "Alimento não informado" });
      for (const iso of new Set(c.feitos || [])) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
        const dia = diario[iso] || { feitas: [], extras: [] };
        dia.feitas = [...new Set([...(dia.feitas || []), refeicao.id])];
        dia.registros = { ...(dia.registros || {}) };
        const anterior = dia.registros[refeicao.id];
        const lido = itemAntigo(c, c.registrosRotina?.[iso]);
        const registrado = { ...lido, alimento: lido.alimento || "Alimento não informado" };
        dia.registros[refeicao.id] = anterior
          ? { ...anterior, itens: [...(anterior.itens || []).filter(i => i.id !== registrado.id), registrado] }
          : { id: refeicao.id, nome: c.registrosRotina?.[iso]?.nome || refeicao.nome, hora: refeicao.hora, itens: [registrado] };
        diario[iso] = dia;
      }
    }
    return { plano, diario };
  }
  return { ehAba, comPadroes, preparar, chave };
})();
if (typeof module !== "undefined") module.exports = PlanoAlimentar;
