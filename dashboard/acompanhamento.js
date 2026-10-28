/* Leituras locais dos dados informados. Não grava dados nem define metas. */
const Acompanhamento = (() => {
  const numero = v => v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v);
  const normal = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const alimentar = p => p.modeloOrigem === "alimentacao" || (p.campos || []).some(c => c.id === "refeicao") && (p.campos || []).some(c => c.id === "ingredientes");
  function orientacao(p) {
    const campos = new Set((p.campos || []).map(c => c.id));
    if (alimentar(p)) return "Registre os alimentos e as calorias; use o check por data nas refeições de rotina.";
    if (campos.has("paginasLidas")) return "Anote a página em que parou e uma data para retomar a leitura, se quiser.";
    if (campos.has("contexto")) return "Defina o próximo passo e o tempo previsto para escolher o que cabe no seu dia.";
    if (campos.has("especialidade")) return "Guarde o preparo recebido e a data do retorno, junto do cuidado realizado.";
    if (p.checkin) return "Marque os dias em que fez. A Visão geral reúne o histórico para você acompanhar sua constância.";
    if (campos.has("modalidade")) return "Registre como foi o treino e um foco para a próxima sessão.";
    return "";
  }
  function camposAlimentacao(p) {
    const campos = (p.campos || []).map(c => c.id === "ingredientes" && normal(c.rotulo) === "ingredientes"
      ? { ...c, rotulo: "Alimento", naLista: true, dica: "O que você comeu: pão com ovo, mamão, uva…" } : c);
    for (const c of [
      { id: "calorias", rotulo: "Calorias (kcal)", tipo: "number", naLista: true, dica: "Calorias desta refeição, incluindo todas as porções. Opcional." },
      { id: "rotina", rotulo: "Alimentação de rotina", tipo: "simNao", naLista: true, dica: "Repete esta refeição? Ative para dar o check em cada data." },
    ]) if (!campos.some(x => x.id === c.id)) campos.push(c);
    return campos;
  }
  function registroAlimentar(item, iso) {
    return item.registrosRotina?.[iso] || { nome: item.descricao, alimento: item.extras?.ingredientes || "", calorias: item.extras?.calorias ?? null };
  }
  function intervaloHoras(inicio, fim) {
    if (!/^\d{2}:\d{2}$/.test(inicio || "") || !/^\d{2}:\d{2}$/.test(fim || "")) return null;
    const minutos = s => { const [h, m] = s.split(":").map(Number); return h < 24 && m < 60 ? h * 60 + m : NaN; };
    const d = (minutos(fim) - minutos(inicio) + 1440) % 1440;
    return Number.isFinite(d) && d > 0 ? d / 60 : null;
  }
  function validar(p, v) {
    // Campos livres podem representar medidas negativas; valida só os conceitos conhecidos.
    const positivos = new Set(["calorias", "porcoes", "distanciaKm", "distanciaMetros", "duracaoMin", "questoes", "acertos", "horasDormidas", "despertares", "rounds", "elevacaoMetros", "paginas", "paginasLidas", "tempoPrevistoMin"]);
    for (const c of p.campos || []) {
      if (positivos.has(c.id) && numero(v[c.id]) < 0) return { campo: c.id, mensagem: "Use zero ou um valor positivo." };
    }
    if (numero(v.acertos) !== null && numero(v.questoes) !== null && Number(v.acertos) > Number(v.questoes)) return { campo: "acertos", mensagem: "Os acertos não podem superar as questões feitas." };
    if (numero(v.paginasLidas) !== null && numero(v.paginas) !== null && Number(v.paginasLidas) > Number(v.paginas)) return { campo: "paginasLidas", mensagem: "A página atual não pode superar o total de páginas." };
    return null;
  }
  function analisar(p, hoje) {
    const campos = new Set((p.campos || []).map(c => c.id));
    const itens = (p.itens || []).filter(i => !i.data || i.data <= hoje);
    const indicadores = [];
    const adicionar = (rotulo, valor, unidade = "", dica = "") => indicadores.push({ rotulo, valor, unidade, dica });
    const pares = (...chaves) => itens.filter(i => chaves.every(k => numero(i.extras?.[k]) !== null));
    const soma = (lista, chave) => lista.reduce((s, i) => s + (numero(i.extras?.[chave]) || 0), 0);
    const distancia = campos.has("distanciaKm") ? "distanciaKm" : campos.has("distanciaMetros") ? "distanciaMetros" : "";
    if (distancia) {
      const l = pares(distancia, "duracaoMin").filter(i => i.extras[distancia] > 0 && i.extras.duracaoMin > 0);
      const d = soma(l, distancia), t = soma(l, "duracaoMin");
      if (d > 0) {
        adicionar("Distância com tempo registrado", d, distancia === "distanciaKm" ? "km" : "m");
        if (p.modeloOrigem === "ciclismo") adicionar("Velocidade média registrada", d / (t / 60), "km/h");
        else adicionar("Ritmo médio registrado", distancia === "distanciaMetros" ? t / d * 100 : t / d, distancia === "distanciaMetros" ? "min/100 m" : "min/km", "Média ponderada pela distância; apenas registros com distância e duração.");
      }
    }
    if (campos.has("questoes") && campos.has("acertos")) {
      const l = pares("questoes", "acertos").filter(i => i.extras.questoes > 0 && i.extras.acertos >= 0 && i.extras.acertos <= i.extras.questoes);
      const q = soma(l, "questoes");
      if (q) adicionar("Aproveitamento nas questões", soma(l, "acertos") / q * 100, "%", "Somente registros com questões e acertos preenchidos.");
    }
    if (campos.has("deitar") && campos.has("acordar")) {
      const l = itens.map(i => intervaloHoras(i.extras?.deitar, i.extras?.acordar)).filter(n => n !== null);
      if (l.length) adicionar("Intervalo médio entre deitar e acordar", l.reduce((s, n) => s + n, 0) / l.length, "h", "O intervalo não desconta o tempo acordado na cama.");
    }
    const duracao = campos.has("duracaoMin") ? "duracaoMin" : campos.has("duracao") ? "duracao" : "";
    if (duracao && !distancia && !p.checkin) {
      const l = pares(duracao);
      if (l.length) adicionar("Tempo registrado", soma(l, duracao) / 60, "h", "Soma das durações informadas até hoje.");
    }
    if (campos.has("paginasLidas")) {
      const l = pares("paginasLidas");
      if (l.length) adicionar("Páginas registradas como lidas", soma(l, "paginasLidas"), "páginas", "Posição atual informada em cada livro. Não é uma contagem de páginas lidas por dia.");
    }
    const receita = campos.has("receita") ? "receita" : campos.has("ganhos") ? "ganhos" : "";
    if (receita) {
      const custos = ["combustivel", "outrosCustos", "pedagios"].filter(c => campos.has(c));
      const l = pares(receita, ...custos);
      if (l.length) {
        adicionar("Resultado após custos informados", soma(l, receita) - custos.reduce((s, k) => s + soma(l, k), 0), "R$", `${l.length} turno(s) com receita e todos os custos preenchidos. Use zero quando não houve custo. Não inclui despesas não registradas.`);
        const chaveHora = campos.has("horasOnline") ? "horasOnline" : "horasTrabalhadas";
        const h = l.filter(i => numero(i.extras?.[chaveHora]) > 0);
        if (h.length) adicionar("Resultado por hora registrada", (soma(h, receita) - custos.reduce((s, k) => s + soma(h, k), 0)) / soma(h, chaveHora), "R$/h");
      }
    }
    const pago = campos.has("recebido") ? "recebido" : campos.has("pago") ? "pago" : "";
    if (pago && campos.has("valor")) {
      const l = itens.filter(i => i.extras?.[pago] === false && numero(i.extras?.valor) !== null);
      if (l.length) adicionar("Valores marcados como não recebidos", soma(l, "valor"), "R$", "Apenas registros explicitamente marcados como não recebidos/pagos.");
    }
    const datas = (p.campos || []).filter(c => c.tipo === "date");
    const lembretes = (p.itens || []).flatMap(i => datas.flatMap(c => {
      const data = i.extras?.[c.id];
      return /^\d{4}-\d{2}-\d{2}$/.test(data || "") && data >= hoje ? [{ itemId: i.id, nome: i.descricao, rotulo: c.rotulo, data }] : [];
    })).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 5);
    return { indicadores, lembretes };
  }
  return { alimentar, orientacao, camposAlimentacao, registroAlimentar, intervaloHoras, validar, analisar };
})();
if (typeof module !== "undefined") module.exports = Acompanhamento;
