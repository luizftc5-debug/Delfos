/* ===========================================================================
   Delfos, a IA do painel.

   Lê o nome e o propósito que a pessoa escreve para uma aba nova e monta a
   página dela: o assunto, o ícone, a cor, o que cada registro é, os campos
   (com tipo e opções), se a aba entra na agenda ou é marcada por dia, a meta,
   o agrupamento, a vista e a ordem. E diz, em frases curtas, o que entendeu.

   Roda inteira no navegador, sem rede e sem modelo grande: é processamento
   de linguagem clássico, feito para o português.
   1. Normaliza o texto (minúsculas, sem acento) e reduz as palavras ao
      radical ("plantões" e "plantão" viram a mesma coisa).
   2. Classifica o assunto num dicionário de ~40 domínios, pesando mais o nome
      que o propósito.
   3. Acha no propósito os conceitos de campo ("quanto recebi" vira valor em
      R$, "onde" vira local, "se já paguei" vira sim/não), as listas que a
      pessoa escreveu (de campos ou de opções), as negações ("sem horário"),
      a frequência ("todo dia" vira marcação por dia), a meta ("40 km por
      mês") e o jeito de ver ("no calendário", "em quadro").
   4. Junta tudo num molde de aba e explica cada decisão.

   Por ser assim, responde em milissegundos mesmo em computador fraco,
   funciona sem internet e nada do que se escreve sai do aparelho.

   Funções puras: não tocam no DOM nem gravam nada. `Store`/`UI` só são lidos
   se existirem (paleta, ícones); no Node os testes rodam sem eles.
   =========================================================================== */

const Delfos = (() => {
  /* ------------------------------- Texto ---------------------------------- */

  const ACENTOS = {
    á: "a", à: "a", â: "a", ã: "a", ä: "a", é: "e", è: "e", ê: "e", ë: "e", í: "i", ì: "i", î: "i", ï: "i",
    ó: "o", ò: "o", ô: "o", õ: "o", ö: "o", ú: "u", ù: "u", û: "u", ü: "u", ç: "c", ñ: "n",
  };

  /** Minúsculas e sem acento, com o mesmo tamanho: o índice i aqui é o índice i do texto em minúsculas. */
  function plano(minusculo) {
    let o = "";
    for (const ch of minusculo) o += ACENTOS[ch] ?? ch;
    return o;
  }

  /** Para comparar palavras: sem acento, sem pontuação, espaços simples. */
  const normal = (s) => plano(String(s || "").toLowerCase()).replace(/r\$/g, " reais ").replace(/[^a-z0-9%]+/g, " ").trim();

  const PARADAS = new Set(("a o as os um uma uns umas de da do das dos e ou em na no nas nos para pra pro pros por pelo pela " +
    "com que se meu minha meus minhas seu sua seus suas eu me mim voce aba pagina ter ser estar isso esse essa este esta " +
    "cada todo toda todos todas mais menos ja tambem ao aos la lo lhe vai vou quero queria preciso gostaria quer " +
    "coisa coisas algo tipo bem muito pouco so apenas tudo nada aqui ali lista registro registros controle").split(" "));

  /** Radical leve do português: tira plural e as terminações mais comuns, sem deixar menos de 4 letras. */
  function radical(p) {
    let w = p;
    if (w.length <= 3) return w;
    if (w.endsWith("oes") || w.endsWith("aes")) w = `${w.slice(0, -3)}ao`;
    else if (w.endsWith("ais")) w = `${w.slice(0, -3)}al`;
    else if (w.endsWith("eis") && w.length > 4) w = `${w.slice(0, -3)}el`;
    else if (w.endsWith("ns")) w = `${w.slice(0, -2)}m`;
    else if (/(r|z|s)es$/.test(w) && w.length > 4) w = w.slice(0, -2);
    else if (w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
    for (const suf of ["amento", "imento", "acao", "icao", "mente", "ando", "endo", "indo", "aram", "eram", "iram", "avam",
      "ado", "ada", "ido", "ida", "ava", "ar", "er", "ir", "ei", "ou", "eu", "iu", "ao", "o", "a", "e"]) {
      if (w.endsWith(suf) && w.length - suf.length >= 4) { w = w.slice(0, -suf.length); break; }
    }
    return w;
  }

  /** O que se compara de um texto: as palavras, os radicais e o texto inteiro com espaços nas pontas (para frases). */
  function analisar(texto) {
    const n = normal(texto);
    const palavras = n ? n.split(" ") : [];
    return { n: ` ${n} `, palavras: new Set(palavras), radicais: new Set(palavras.filter((p) => p.length >= 4).map(radical)) };
  }

  /** Pontos de uma palavra-chave num texto analisado: frase ou palavra inteira valem 3; o mesmo radical, 2. */
  function pontos(chave, a) {
    if (chave.includes(" ")) return a.n.includes(` ${chave} `) ? 3 + chave.split(" ").length * 0.5 : 0;
    if (a.palavras.has(chave)) return 3;
    const r = radical(chave);
    return r.length >= 4 && a.radicais.has(r) ? 2 : 0;
  }

  const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const limpar = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

  /** "plantões" → "plantão", "leituras" → "leitura" (bom o bastante para o rótulo do registro). */
  function singular(palavra) {
    const t = String(palavra || "").trim().toLowerCase();
    if (/ões$/.test(t)) return t.replace(/ões$/, "ão");
    if (/ães$/.test(t)) return t.replace(/ães$/, "ão");
    if (/ais$/.test(t)) return t.replace(/ais$/, "al");
    if (/éis$/.test(t)) return t.replace(/éis$/, "el");
    if (/ns$/.test(t)) return t.replace(/ns$/, "m");
    if (/(r|z)es$/.test(t)) return t.slice(0, -2);
    if (/[^s]s$/.test(t)) return t.slice(0, -1);
    return t;
  }

  function plural(s) {
    const t = String(s || "").trim();
    if (!t) return "itens";
    if (/ão$/i.test(t)) return t.replace(/ão$/i, "ões");
    if (/[aeiouáéíóúâêô]$/i.test(t)) return `${t}s`;
    if (/(r|z)$/i.test(t)) return `${t}es`;
    if (/s$/i.test(t)) return t;
    if (/m$/i.test(t)) return t.replace(/m$/i, "ns");
    if (/l$/i.test(t)) return t.replace(/l$/i, "is");
    return `${t}s`;
  }

  /* ------------------------- Conhecimento: assuntos ------------------------ */

  const c = (id, rotulo, tipo, opcoes = [], naLista = false) => ({ id, rotulo, tipo, opcoes, naLista, obrigatorio: false });
  const SEM_META = { tipo: "nenhuma", campoId: "", alvo: 0, periodo: "mes" };
  const meta = (tipo, alvo, periodo, campoId = "") => ({ tipo, campoId, alvo, periodo });

  // Cada assunto: nome (para a explicação), palavras-chave (sem acento) e o molde.
  const ASSUNTOS = [
    { nome: "treino de academia", chaves: ["academia", "musculacao", "malhar", "malhacao", "gym", "hipertrofia", "treino de forca", "series e repeticoes"], tpl: {
      especial: "academia", icone: "svg:haltere", cor: "#6e8f22", rotuloItem: "treino", naAgenda: false, checkin: false,
      descricao: "Dias de treino, exercícios, cargas e recordes.", campos: [], agruparPor: "", meta: SEM_META, exemplos: [] } },
    { nome: "corrida e esportes de resistência", chaves: ["corrida", "corridas", "correr", "running", "maratona", "pedal", "bike", "ciclismo", "natacao", "nadar", "triatlo", "caminhada", "caminhar"], tpl: {
      icone: "svg:tenis", cor: "#0d95b5", rotuloItem: "treino", naAgenda: true, checkin: false,
      descricao: "Cada saída com distância, tempo e como foi.",
      campos: [c("distancia", "Distância (km)", "number", [], true), c("duracao", "Duração (min)", "number", [], true), c("intensidade", "Intensidade", "select", ["leve", "moderada", "forte", "prova"], true), c("sensacao", "Como foi", "textarea")],
      agruparPor: "intensidade", meta: meta("soma", 40, "mes", "distancia"), exemplos: ["Rodagem leve", "Treino intervalado", "Longão de domingo"] } },
    { nome: "esporte", chaves: ["futebol", "volei", "basquete", "esporte", "esportes", "crossfit", "luta", "jiu jitsu", "jiu", "muay thai", "boxe", "tenis", "funcional", "pilates", "yoga", "danca", "handebol"], tpl: {
      icone: "svg:bola", cor: "#0d95b5", rotuloItem: "treino", naAgenda: true, checkin: false,
      descricao: "Treinos e jogos, com duração e como você se sentiu.",
      campos: [c("modalidade", "Modalidade", "text", [], true), c("duracao", "Duração (min)", "number", [], true), c("intensidade", "Intensidade", "select", ["leve", "moderada", "forte"], true), c("observacoes", "Observações", "textarea")],
      agruparPor: "intensidade", meta: meta("concluidos", 12, "mes"), exemplos: ["Treino de terça", "Jogo com a turma"] } },
    { nome: "leitura", chaves: ["leitura", "leituras", "livro", "livros", "ler", "biblioteca", "literatura", "romance", "romances", "kindle"], tpl: {
      icone: "svg:livro", cor: "#5a4fd4", rotuloItem: "livro", naAgenda: false, checkin: false, vista: "cartoes",
      descricao: "O que você quer ler, está lendo e já leu, com nota e comentário.",
      campos: [c("autor", "Autor", "text", [], true), c("situacao", "Situação", "select", ["quero ler", "lendo", "lido", "abandonado"], true), c("genero", "Gênero", "select", ["ficção", "não ficção", "técnico", "biografia", "poesia", "outro"]), c("paginas", "Páginas", "number"), c("avaliacao", "Avaliação", "estrelas", [], true), c("comentario", "O que ficou", "textarea")],
      agruparPor: "situacao", meta: meta("concluidos", 12, "ano"), exemplos: ["Sapiens", "O Médico e o Monstro"] } },
    { nome: "filmes e séries", chaves: ["filme", "filmes", "serie", "series", "cinema", "netflix", "anime", "animes", "documentario", "documentarios", "streaming de filmes"], tpl: {
      icone: "svg:estrela", cor: "#d6398a", rotuloItem: "título", naAgenda: false, checkin: false, vista: "cartoes",
      descricao: "Filmes e séries para ver, vendo e vistos.",
      campos: [c("tipo", "Tipo", "select", ["filme", "série", "documentário", "anime"], true), c("situacao", "Situação", "select", ["quero ver", "assistindo", "visto", "desisti"], true), c("plataforma", "Onde assistir", "text", [], true), c("avaliacao", "Avaliação", "estrelas", [], true), c("comentario", "Comentário", "textarea")],
      agruparPor: "situacao", meta: SEM_META, exemplos: [] } },
    { nome: "idiomas", chaves: ["ingles", "espanhol", "frances", "alemao", "italiano", "japones", "mandarim", "idioma", "idiomas", "lingua", "linguas", "duolingo"], tpl: {
      icone: "svg:globo", cor: "#1f7a8c", rotuloItem: "prática", naAgenda: false, checkin: true,
      descricao: "Prática de idioma marcada dia a dia, com o que foi treinado.",
      campos: [c("habilidade", "Habilidade", "select", ["leitura", "escuta", "fala", "escrita", "vocabulário", "gramática"], true), c("duracao", "Duração (min)", "number", [], true), c("recurso", "Recurso", "text")],
      agruparPor: "habilidade", meta: meta("checkins", 5, "semana"), exemplos: ["Escuta com podcast", "Vocabulário no app"] } },
    { nome: "estudo e questões", chaves: ["questoes", "questao", "banco de questoes", "simulado", "simulados", "flashcard", "flashcards", "anki", "revisao espacada", "revisoes", "estudo", "estudos", "estudar", "residencia medica"], tpl: {
      icone: "svg:lapis", cor: "#5a4fd4", rotuloItem: "sessão", naAgenda: true, checkin: false, vista: "tabela",
      descricao: "Sessões de estudo com matéria, questões, acertos e tempo.",
      campos: [c("materia", "Matéria", "text", [], true), c("questoes", "Questões", "number", [], true), c("acertos", "Acertos", "number", [], true), c("duracao", "Duração (min)", "number"), c("observacoes", "O que revisar", "textarea")],
      agruparPor: "", meta: meta("soma", 200, "semana", "questoes"), exemplos: ["Questões de cardiologia", "Revisão de farmacologia"] } },
    { nome: "cursos", chaves: ["curso", "cursos", "certificacao", "certificado", "certificados", "mooc", "bootcamp", "aula extra", "especializacao"], tpl: {
      icone: "svg:lapis", cor: "#1f7a8c", rotuloItem: "curso", naAgenda: false, checkin: false,
      descricao: "Cursos em andamento, horas estudadas e certificados.",
      campos: [c("plataforma", "Plataforma", "text", [], true), c("situacao", "Situação", "select", ["quero fazer", "fazendo", "concluído", "pausado"], true), c("horas", "Carga horária (h)", "number", [], true), c("certificado", "Tem certificado", "simNao"), c("link", "Link", "link")],
      agruparPor: "situacao", meta: meta("concluidos", 2, "ano"), exemplos: [] } },
    { nome: "fé e espiritualidade", chaves: ["igreja", "religiao", "fe", "oracao", "oracoes", "biblia", "culto", "missa", "espiritual", "espiritualidade", "terco", "devocional", "evangelho", "rezar", "orar"], tpl: {
      icone: "svg:cruz", cor: "#5a4fd4", rotuloItem: "prática", naAgenda: false, checkin: true,
      descricao: "Práticas de fé marcadas dia a dia: oração, leitura, culto.",
      campos: [c("tipo", "Tipo", "select", ["oração", "leitura", "culto ou missa", "estudo", "serviço"], true), c("duracao", "Duração (min)", "number"), c("reflexao", "Reflexão", "textarea")],
      agruparPor: "tipo", meta: meta("checkins", 7, "semana"), exemplos: ["Oração da manhã", "Leitura do dia"] } },
    { nome: "hábitos e rotina", chaves: ["habito", "habitos", "rotina", "rotinas", "meditacao", "meditar", "mindfulness", "agua", "hidratacao", "alongamento", "skincare", "autocuidado"], tpl: {
      icone: "svg:sol", cor: "#b57d0a", rotuloItem: "hábito", naAgenda: false, checkin: true,
      descricao: "Hábitos marcados a cada dia, com a sequência de cada um.",
      campos: [c("momento", "Momento do dia", "select", ["manhã", "tarde", "noite", "qualquer hora"], true), c("duracao", "Duração (min)", "number"), c("porque", "Por que importa", "textarea")],
      agruparPor: "momento", meta: meta("checkins", 20, "semana"), exemplos: ["Beber 2 L de água", "Meditar 10 minutos", "Dormir antes da meia-noite"] } },
    { nome: "saúde e consultas", chaves: ["saude", "consulta", "consultas", "exame", "exames", "medico", "medicos", "terapia", "psicologo", "dentista", "check up", "checkup", "vacina", "vacinas"], tpl: {
      icone: "svg:estetoscopio", cor: "#0d95b5", rotuloItem: "consulta", naAgenda: true, checkin: false,
      descricao: "Consultas, exames e retornos, com local, profissional e resultado.",
      campos: [c("tipo", "Tipo", "select", ["consulta", "exame", "retorno", "vacina", "terapia"], true), c("especialidade", "Especialidade", "text", [], true), c("local", "Local", "text", [], true), c("profissional", "Profissional", "text"), c("valor", "Valor (R$)", "dinheiro"), c("resultado", "Resultado ou orientação", "textarea")],
      agruparPor: "tipo", meta: SEM_META, exemplos: [] } },
    { nome: "remédios e suplementos", chaves: ["remedio", "remedios", "medicamento", "medicamentos", "suplemento", "suplementos", "vitamina", "vitaminas", "creatina", "whey"], tpl: {
      icone: "svg:pilula", cor: "#0d95b5", rotuloItem: "medicamento", naAgenda: false, checkin: true,
      descricao: "O que tomar, em que dose, marcado a cada dia.",
      campos: [c("dose", "Dose", "text", [], true), c("momento", "Horário", "select", ["manhã", "almoço", "tarde", "noite", "antes de dormir"], true), c("ate", "Até quando", "date"), c("observacoes", "Observações", "textarea")],
      agruparPor: "momento", meta: SEM_META, exemplos: [] } },
    { nome: "alimentação", chaves: ["dieta", "alimentacao", "nutricao", "refeicao", "refeicoes", "comida", "marmita", "marmitas", "cardapio", "calorias", "macros"], tpl: {
      icone: "svg:prato", cor: "#6e8f22", rotuloItem: "refeição", naAgenda: true, checkin: false,
      descricao: "O que você comeu, em que refeição, e se foi como planejado.",
      campos: [c("refeicao", "Refeição", "select", ["café da manhã", "almoço", "lanche", "jantar", "ceia"], true), c("planejado", "Foi como planejado", "simNao", [], true), c("calorias", "Calorias (kcal)", "number"), c("observacoes", "Observações", "textarea")],
      agruparPor: "refeicao", meta: SEM_META, exemplos: [] } },
    { nome: "sono", chaves: ["sono", "dormir", "insonia", "noites", "cochilo"], tpl: {
      icone: "svg:lua", cor: "#5b6b7d", rotuloItem: "noite", naAgenda: true, checkin: false,
      descricao: "Cada noite com horas dormidas e qualidade.",
      campos: [c("horas", "Horas dormidas", "number", [], true), c("qualidade", "Qualidade", "select", ["ruim", "ok", "boa", "ótima"], true), c("deitou", "Hora que deitou", "time"), c("observacoes", "Observações", "textarea")],
      agruparPor: "qualidade", meta: SEM_META, exemplos: [] } },
    { nome: "viagens", chaves: ["viagem", "viagens", "viajar", "ferias", "trip", "turismo", "intercambio", "mochilao"], tpl: {
      icone: "svg:aviao", cor: "#0d95b5", rotuloItem: "viagem", naAgenda: true, checkin: false,
      descricao: "Viagens da ideia à volta: destino, orçamento e reservas.",
      campos: [c("destino", "Destino", "text", [], true), c("situacao", "Situação", "select", ["ideia", "planejando", "reservado", "feita"], true), c("orcamento", "Orçamento (R$)", "dinheiro", [], true), c("hospedagem", "Hospedagem", "text"), c("transporte", "Transporte", "select", ["avião", "ônibus", "carro", "outro"]), c("observacoes", "Notas", "textarea")],
      agruparPor: "situacao", meta: SEM_META, exemplos: [] } },
    { nome: "contas a pagar", chaves: ["contas a pagar", "contas para pagar", "contas da casa", "conta de luz", "conta de agua", "boleto", "boletos", "fatura", "faturas", "vencimento", "vencimentos"], tpl: {
      icone: "svg:cofre", cor: "#5b6b7d", rotuloItem: "conta", naAgenda: true, checkin: false, vista: "calendario",
      descricao: "Contas com vencimento, valor e se já foram pagas.",
      campos: [c("valor", "Valor (R$)", "dinheiro", [], true), c("pago", "Pago", "simNao", [], true), c("forma", "Forma de pagamento", "select", ["pix", "boleto", "cartão", "débito automático"]), c("observacoes", "Observações", "textarea")],
      agruparPor: "", meta: SEM_META, exemplos: ["Conta de luz", "Internet", "Mensalidade"] } },
    { nome: "casa", chaves: ["casa", "lar", "limpeza", "faxina", "domestica", "domesticas", "apartamento", "reforma", "manutencao da casa"], tpl: {
      icone: "svg:casa", cor: "#b57d0a", rotuloItem: "tarefa", naAgenda: true, checkin: false,
      descricao: "Tarefas da casa, por cômodo e frequência.",
      campos: [c("comodo", "Cômodo", "select", ["cozinha", "quarto", "banheiro", "sala", "área de serviço", "casa toda"], true), c("frequencia", "Frequência", "select", ["uma vez", "semanal", "quinzenal", "mensal"], true), c("custo", "Custo (R$)", "dinheiro"), c("observacoes", "Observações", "textarea")],
      agruparPor: "comodo", meta: SEM_META, exemplos: [] } },
    { nome: "compras e desejos", chaves: ["compras", "compra", "comprar", "mercado", "desejos", "wishlist", "lista de desejos", "quero comprar", "presentes para mim"], tpl: {
      icone: "svg:carrinho", cor: "#d6398a", rotuloItem: "item", naAgenda: false, checkin: false,
      descricao: "O que comprar, por quanto e com que prioridade.",
      campos: [c("preco", "Preço (R$)", "dinheiro", [], true), c("prioridade", "Prioridade", "select", ["baixa", "média", "alta"], true), c("loja", "Loja", "text"), c("link", "Link", "link")],
      agruparPor: "prioridade", meta: SEM_META, exemplos: [] } },
    { nome: "gastos", chaves: ["gastos", "gasto", "gastei", "quanto gasto", "despesas", "gasto pessoal", "uber", "ifood", "economia", "economizar", "orcamento pessoal", "contas a pagar", "financas pessoais"], tpl: {
      icone: "svg:cofre", cor: "#6e8f22", rotuloItem: "gasto", naAgenda: true, checkin: false, vista: "tabela",
      descricao: "Cada gasto com valor, categoria e como foi pago.",
      campos: [c("valor", "Valor (R$)", "dinheiro", [], true), c("categoria", "Categoria", "select", ["comida", "transporte", "lazer", "estudo", "saúde", "outro"], true), c("forma", "Forma de pagamento", "select", ["pix", "cartão", "dinheiro", "boleto"], true), c("observacoes", "Observações", "textarea")],
      agruparPor: "categoria", meta: SEM_META, exemplos: [] } },
    { nome: "assinaturas", chaves: ["assinatura", "assinaturas", "streaming", "spotify", "mensalidades"], tpl: {
      icone: "svg:repetir", cor: "#5b6b7d", rotuloItem: "assinatura", naAgenda: true, checkin: false, vista: "tabela",
      descricao: "Assinaturas com valor, dia de cobrança e se ainda vale a pena.",
      campos: [c("valor", "Valor (R$)", "dinheiro", [], true), c("cobranca", "Dia da cobrança", "number", [], true), c("vale", "Ainda vale a pena", "simNao", [], true), c("link", "Link para cancelar", "link")],
      agruparPor: "", meta: SEM_META, exemplos: [] } },
    { nome: "dívidas e empréstimos", chaves: ["divida", "dividas", "emprestimo", "emprestimos", "emprestei", "me deve", "devo", "fiado", "parcelas"], tpl: {
      icone: "svg:maleta", cor: "#5b6b7d", rotuloItem: "valor", naAgenda: true, checkin: false,
      descricao: "Quem deve a quem, quanto e até quando.",
      campos: [c("pessoa", "Pessoa", "text", [], true), c("valor", "Valor (R$)", "dinheiro", [], true), c("sentido", "Sentido", "select", ["me devem", "eu devo"], true), c("pago", "Pago", "simNao", [], true)],
      agruparPor: "sentido", meta: SEM_META, exemplos: [] } },
    { nome: "pets", chaves: ["pet", "pets", "cachorro", "cachorros", "cao", "gato", "gatos", "gata", "veterinario", "animal", "animais"], tpl: {
      icone: "svg:pata", cor: "#b57d0a", rotuloItem: "cuidado", naAgenda: true, checkin: false,
      descricao: "Vacinas, banhos, consultas e gastos com os bichos.",
      campos: [c("tipo", "Tipo", "select", ["vacina", "vermífugo", "banho", "consulta", "remédio", "ração"], true), c("pet", "Qual pet", "text", [], true), c("valor", "Valor (R$)", "dinheiro", [], true), c("observacoes", "Observações", "textarea")],
      agruparPor: "tipo", meta: SEM_META, exemplos: [] } },
    { nome: "veículo", chaves: ["carro", "moto", "veiculo", "revisao do carro", "combustivel", "gasolina", "abastecimento", "ipva"], tpl: {
      icone: "svg:carro", cor: "#5b6b7d", rotuloItem: "manutenção", naAgenda: true, checkin: false,
      descricao: "Revisões, trocas, impostos e gastos do veículo.",
      campos: [c("tipo", "Tipo", "select", ["revisão", "troca de óleo", "pneus", "abastecimento", "IPVA", "seguro", "outro"], true), c("valor", "Valor (R$)", "dinheiro", [], true), c("km", "Quilometragem", "number"), c("oficina", "Oficina ou posto", "text")],
      agruparPor: "tipo", meta: SEM_META, exemplos: [] } },
    { nome: "plantões e prática clínica", chaves: ["plantao", "plantoes", "estagio", "estagios", "internato", "ambulatorio", "hospital", "pratica clinica", "enfermaria", "pronto socorro", "emergencia", "upa"], tpl: {
      icone: "svg:estetoscopio", cor: "#1f7a8c", rotuloItem: "plantão", naAgenda: true, checkin: false, vista: "calendario",
      descricao: "Plantões e práticas com local, setor, horas e os casos que valeram.",
      campos: [c("local", "Local", "text", [], true), c("setor", "Setor", "select", ["enfermaria", "emergência", "UTI", "ambulatório", "centro cirúrgico", "outro"], true), c("horas", "Horas", "number", [], true), c("preceptor", "Preceptor", "text"), c("casos", "Casos e aprendizados", "textarea")],
      agruparPor: "setor", meta: meta("soma", 40, "mes", "horas"), exemplos: [] } },
    { nome: "artigos e pesquisa", chaves: ["artigo", "artigos", "paper", "papers", "pesquisa", "publicacao", "publicacoes", "leitura cientifica", "periodicos", "pubmed", "metanalise", "revisao sistematica"], tpl: {
      icone: "svg:microscopio", cor: "#5a4fd4", rotuloItem: "artigo", naAgenda: false, checkin: false, vista: "tabela",
      descricao: "Artigos para ler e fichar, com periódico, ano e relevância.",
      campos: [c("autores", "Autores", "text"), c("periodico", "Periódico", "text", [], true), c("ano", "Ano", "number", [], true), c("situacao", "Situação", "select", ["para ler", "lendo", "lido", "fichado"], true), c("relevancia", "Relevância", "select", ["baixa", "média", "alta"]), c("link", "DOI ou link", "link"), c("resumo", "Achados principais", "textarea")],
      agruparPor: "situacao", meta: meta("concluidos", 8, "mes"), exemplos: [] } },
    { nome: "provas e processos seletivos", chaves: ["residencia", "concurso", "concursos", "revalida", "prova de titulo", "enare", "processo seletivo", "vestibular", "edital", "editais"], tpl: {
      icone: "svg:alvo", cor: "#d6398a", rotuloItem: "prova", naAgenda: true, checkin: false,
      descricao: "Provas e processos seletivos: inscrição, fases, taxas e resultado.",
      campos: [c("instituicao", "Instituição", "text", [], true), c("fase", "Fase", "select", ["inscrição", "1ª fase", "2ª fase", "entrevista", "resultado"], true), c("taxa", "Taxa (R$)", "dinheiro"), c("especialidade", "Especialidade", "text", [], true), c("link", "Edital ou link", "link")],
      agruparPor: "fase", meta: SEM_META, exemplos: [] } },
    { nome: "congressos e eventos acadêmicos", chaves: ["congresso", "congressos", "simposio", "jornada", "evento cientifico", "eventos academicos", "liga", "ligas", "workshop"], tpl: {
      icone: "svg:grupo", cor: "#178f6c", rotuloItem: "evento", naAgenda: true, checkin: false,
      descricao: "Congressos e eventos: inscrição, trabalhos e horas de certificado.",
      campos: [c("local", "Local", "text", [], true), c("inscricao", "Inscrição (R$)", "dinheiro", [], true), c("trabalho", "Trabalho submetido", "simNao", [], true), c("horas", "Horas de certificado", "number"), c("observacoes", "Observações", "textarea")],
      agruparPor: "", meta: meta("soma", 40, "ano", "horas"), exemplos: [] } },
    { nome: "aniversários e encontros", chaves: ["aniversario", "aniversarios", "festa", "festas", "social", "encontros", "amigos", "familia", "datas comemorativas"], tpl: {
      icone: "svg:presente", cor: "#d6398a", rotuloItem: "evento", naAgenda: true, checkin: false, vista: "calendario",
      descricao: "Aniversários e encontros, com presente e local.",
      campos: [c("pessoa", "Pessoa", "text", [], true), c("presente", "Presente comprado", "simNao", [], true), c("local", "Local", "text"), c("ideia", "Ideia de presente", "text")],
      agruparPor: "", meta: SEM_META, exemplos: [] } },
    { nome: "trabalhos e freelas", chaves: ["freela", "freelas", "freelancer", "trabalho", "trabalhos", "clientes", "servicos", "bico", "bicos", "job", "jobs"], tpl: {
      icone: "svg:maleta", cor: "#6e8f22", rotuloItem: "trabalho", naAgenda: true, checkin: false, vista: "quadro",
      descricao: "Cada trabalho com cliente, valor e situação do pagamento.",
      campos: [c("cliente", "Cliente", "text", [], true), c("valor", "Valor (R$)", "dinheiro", [], true), c("pagamento", "Pagamento", "select", ["a combinar", "a receber", "recebido"], true), c("horas", "Horas", "number"), c("observacoes", "Observações", "textarea")],
      agruparPor: "pagamento", meta: meta("soma", 1000, "mes", "valor"), exemplos: [] } },
    { nome: "aulas e monitoria", chaves: ["monitoria", "aula particular", "aulas particulares", "alunos", "aluno", "aulas dadas", "cursinho", "tutoria", "reforco"], tpl: {
      icone: "svg:lapis", cor: "#178f6c", rotuloItem: "aula", naAgenda: true, checkin: false, vista: "calendario",
      descricao: "Aulas dadas, com aluno, duração, valor e se já foi pago.",
      campos: [c("aluno", "Aluno", "text", [], true), c("assunto", "Assunto", "text", [], true), c("duracao", "Duração (min)", "number"), c("valor", "Valor (R$)", "dinheiro", [], true), c("pago", "Pago", "simNao", [], true)],
      agruparPor: "", meta: meta("soma", 800, "mes", "valor"), exemplos: [] } },
    { nome: "conteúdo para redes", chaves: ["conteudo", "conteudos", "post", "posts", "instagram", "youtube", "tiktok", "videos", "roteiro", "roteiros", "reels", "podcast"], tpl: {
      icone: "svg:camera", cor: "#d6398a", rotuloItem: "post", naAgenda: true, checkin: false, vista: "quadro",
      descricao: "Ideias de post até publicar, por rede e etapa.",
      campos: [c("rede", "Rede", "select", ["Instagram", "YouTube", "TikTok", "outra"], true), c("etapa", "Etapa", "select", ["ideia", "roteiro", "gravado", "editado", "publicado"], true), c("link", "Link", "link"), c("observacoes", "Roteiro ou notas", "textarea")],
      agruparPor: "etapa", meta: meta("concluidos", 8, "mes"), exemplos: [] } },
    { nome: "música", chaves: ["violao", "guitarra", "piano", "teclado", "musica", "instrumento", "canto", "bateria", "ukulele"], tpl: {
      icone: "svg:musica", cor: "#8e5bd0", rotuloItem: "prática", naAgenda: false, checkin: true,
      descricao: "Prática marcada a cada dia, com o que foi estudado.",
      campos: [c("foco", "Foco", "select", ["técnica", "repertório", "teoria", "improviso"], true), c("duracao", "Duração (min)", "number", [], true), c("musica", "Música ou exercício", "text")],
      agruparPor: "foco", meta: meta("checkins", 4, "semana"), exemplos: [] } },
    { nome: "jogos", chaves: ["jogos", "games", "videogame", "jogo", "zerar", "steam", "playstation", "xbox", "nintendo"], tpl: {
      icone: "svg:controle", cor: "#8e5bd0", rotuloItem: "jogo", naAgenda: false, checkin: false, vista: "cartoes",
      descricao: "Jogos na fila, jogando e zerados.",
      campos: [c("plataforma", "Plataforma", "text", [], true), c("situacao", "Situação", "select", ["quero jogar", "jogando", "zerado", "larguei"], true), c("horas", "Horas jogadas", "number"), c("avaliacao", "Avaliação", "estrelas", [], true)],
      agruparPor: "situacao", meta: SEM_META, exemplos: [] } },
    { nome: "receitas", chaves: ["receita", "receitas", "cozinhar", "culinaria", "cozinha", "pratos"], tpl: {
      icone: "svg:cafe", cor: "#b57d0a", rotuloItem: "receita", naAgenda: false, checkin: false, vista: "cartoes",
      descricao: "Receitas para testar e as que já deram certo.",
      campos: [c("tipo", "Tipo", "select", ["prato principal", "lanche", "sobremesa", "bebida", "marmita"], true), c("duracao", "Tempo (min)", "number", [], true), c("feita", "Já fiz", "simNao", [], true), c("link", "Fonte ou link", "link"), c("ingredientes", "Ingredientes", "textarea")],
      agruparPor: "tipo", meta: SEM_META, exemplos: [] } },
    { nome: "plantas", chaves: ["planta", "plantas", "jardim", "horta", "jardinagem", "suculentas", "regar"], tpl: {
      icone: "svg:folha", cor: "#178f6c", rotuloItem: "planta", naAgenda: false, checkin: true,
      descricao: "Cada planta com rega marcada por dia e cuidados.",
      campos: [c("luz", "Luz", "select", ["sol pleno", "meia sombra", "sombra"], true), c("rega", "Rega", "select", ["diária", "2 vezes por semana", "semanal"], true), c("cuidados", "Cuidados", "textarea")],
      agruparPor: "rega", meta: SEM_META, exemplos: [] } },
    { nome: "metas e objetivos", chaves: ["meta", "metas", "objetivo", "objetivos", "sonho", "sonhos", "planos", "resolucoes", "plano de vida"], soNome: ["meta", "metas", "objetivo", "objetivos"], tpl: {
      icone: "svg:bandeira", cor: "#178f6c", rotuloItem: "meta", naAgenda: true, checkin: false,
      descricao: "Objetivos com prazo, área da vida e próximo passo.",
      campos: [c("area", "Área", "select", ["saúde", "carreira", "estudos", "finanças", "relações", "pessoal"], true), c("progresso", "Progresso (%)", "number", [], true), c("proximoPasso", "Próximo passo", "text", [], true), c("porque", "Por que importa", "textarea")],
      agruparPor: "area", meta: SEM_META, exemplos: [] } },
    { nome: "diário", chaves: ["diario", "gratidao", "journal", "journaling", "humor", "emocoes", "sentimentos"], tpl: {
      icone: "svg:lapis", cor: "#8e5bd0", rotuloItem: "entrada", naAgenda: true, checkin: false,
      descricao: "Um registro por dia: como foi, o humor e pelo que agradecer.",
      campos: [c("humor", "Humor", "select", ["difícil", "neutro", "bom", "ótimo"], true), c("gratidao", "Pelo que agradeço", "textarea"), c("texto", "Como foi o dia", "textarea")],
      agruparPor: "humor", meta: meta("concluidos", 20, "mes"), exemplos: [] } },
    { nome: "pessoas e contatos", chaves: ["contatos", "networking", "mentores", "pessoas", "rede de contatos"], tpl: {
      icone: "svg:grupo", cor: "#5b6b7d", rotuloItem: "contato", naAgenda: false, checkin: false, vista: "tabela",
      descricao: "Pessoas da sua rede, onde conheceu e quando falou pela última vez.",
      campos: [c("area", "Área", "text", [], true), c("onde", "Onde conheci", "text", [], true), c("ultimoContato", "Último contato", "date"), c("contato", "Telefone ou e-mail", "text"), c("observacoes", "Notas", "textarea")],
      agruparPor: "", meta: SEM_META, exemplos: [] } },
    { nome: "arte e criação", chaves: ["desenho", "desenhos", "arte", "pintura", "fotografia", "fotos", "escrita", "poesia", "poemas", "artesanato", "croche"], tpl: {
      icone: "svg:pincel", cor: "#d6398a", rotuloItem: "obra", naAgenda: false, checkin: false, vista: "cartoes",
      descricao: "Trabalhos em andamento e prontos, com técnica e tempo.",
      campos: [c("tecnica", "Técnica", "text", [], true), c("situacao", "Situação", "select", ["ideia", "fazendo", "pronta"], true), c("horas", "Horas", "number"), c("observacoes", "Notas", "textarea")],
      agruparPor: "situacao", meta: meta("concluidos", 4, "mes"), exemplos: [] } },
    { nome: "tarefas", chaves: ["tarefa", "tarefas", "afazeres", "pendencias", "pendencia", "to do", "todo list", "checklist", "lembretes"], tpl: {
      icone: "svg:check", cor: "#5b6b7d", rotuloItem: "tarefa", naAgenda: true, checkin: false,
      descricao: "Tarefas com prazo e prioridade.",
      campos: [c("prioridade", "Prioridade", "select", ["baixa", "média", "alta"], true), c("contexto", "Onde ou com quem", "text", [], true), c("observacoes", "Observações", "textarea")],
      agruparPor: "prioridade", meta: SEM_META, exemplos: [] } },
    { nome: "ideias", chaves: ["ideia", "ideias", "brainstorm", "insights", "anotacoes soltas", "inspiracoes", "inspiracao"], tpl: {
      icone: "svg:lampada", cor: "#b57d0a", rotuloItem: "ideia", naAgenda: false, checkin: false, vista: "cartoes",
      descricao: "Ideias guardadas antes que fujam, com área e próximo passo.",
      campos: [c("area", "Área", "text", [], true), c("situacao", "Situação", "select", ["guardada", "testando", "descartada", "virou projeto"], true), c("link", "Referência", "link"), c("observacoes", "Detalhes", "textarea")],
      agruparPor: "situacao", meta: SEM_META, exemplos: [] } },
  ];

  /* ------------------------- Conhecimento: campos -------------------------- */

  // Cada conceito: os gatilhos (frases sem acento) que o fazem aparecer e o
  // campo que ele vira. `rotulos` troca o nome do campo conforme o gatilho
  // ("quanto recebi" vira "Valor recebido"). Gatilhos mais longos ganham dos
  // mais curtos no mesmo trecho ("se já paguei" é sim/não, não valor).
  const K = (id, tipo, rotulo, gatilhos, extra = {}) => ({ id, tipo, rotulo, gatilhos, ...extra });
  const CONCEITOS = [
    K("pago", "simNao", "Pago", ["se ja paguei", "se paguei", "ja paguei", "ja foi pago", "esta pago", "pago ou nao", "foi pago", "quitado", "quitada", "se ja pagou", "se pagou", "se ja foi pago"]),
    K("recebido", "simNao", "Recebido", ["se ja recebi", "se recebi", "ja recebi", "recebido ou nao", "se ja recebeu", "se ja caiu", "se caiu", "foi recebido", "se ja me pagaram", "se me pagaram"]),
    K("confirmado", "simNao", "Confirmado", ["confirmado", "confirmada", "se confirmou", "confirmacao", "se esta confirmado"]),
    K("valor", "dinheiro", "Valor (R$)", ["quanto vou receber", "quanto recebi", "quanto ganhei", "quanto vou ganhar", "quanto custou", "quanto custa", "quanto gastei", "quanto paguei", "quanto pago", "quanto cobrei",
      "valor", "valores", "preco", "precos", "custo", "custos", "custou", "gasto", "gastos", "gastei", "pagar", "paguei", "reais", "dinheiro", "cache", "receber", "recebi", "ganho", "ganhos", "ganhei", "faturamento", "mensalidade", "taxa", "orcamento", "cobrei", "cobrar"],
      { rotulos: [[/receb|ganh|cache|fatur|cobr/, "Valor recebido (R$)"], [/cust|gast|pagu|pago|pagar/, "Custo (R$)"], [/preco/, "Preço (R$)"], [/orcamento/, "Orçamento (R$)"], [/mensalidade/, "Mensalidade (R$)"], [/taxa/, "Taxa (R$)"]] }),
    K("pagamento", "select", "Pagamento", ["status do pagamento", "situacao do pagamento", "pagamento"], { opcoes: ["a receber", "recebido"] }),
    K("revisar", "textarea", "O que revisar", ["o que revisar", "pontos a revisar", "revisar"]),
    K("forma", "select", "Forma de pagamento", ["forma de pagamento", "como paguei", "meio de pagamento"], { opcoes: ["pix", "cartão", "dinheiro", "boleto"] }),
    K("horario", "time", "Horário", ["que horas", "hora de inicio", "horario de inicio", "horario", "horarios", "hora marcada", "hora"], { naoDepois: ["meia", "uma"] }),
    K("horas", "number", "Horas", ["quantas horas", "carga horaria", "horas trabalhadas", "horas de estudo", "horas de sono", "horas"]),
    K("duracao", "number", "Duração (min)", ["quanto tempo", "tempo gasto", "duracao", "minutos", "demorou", "durou", "tempo"]),
    K("distancia", "number", "Distância (km)", ["distancia", "km", "quilometros", "kms"]),
    K("km", "number", "Quilometragem", ["quilometragem", "hodometro"]),
    K("local", "text", "Local", ["onde foi", "onde vai ser", "onde", "local", "locais", "lugar", "endereco", "cidade", "bairro", "sala"]),
    K("cliente", "text", "Cliente", ["cliente", "clientes"]),
    K("paciente", "text", "Paciente", ["paciente", "pacientes"]),
    K("aluno", "text", "Aluno", ["aluno", "alunos", "aluna", "alunas"]),
    K("professor", "text", "Professor", ["professor", "professora", "professores"]),
    K("preceptor", "text", "Preceptor", ["preceptor", "preceptora", "preceptores"]),
    K("profissional", "text", "Profissional", ["medico", "medica", "dentista", "psicologo", "psicologa", "profissional", "nutricionista"]),
    K("autor", "text", "Autor", ["autor", "autores", "autora", "escritor"]),
    K("pessoa", "text", "Com quem", ["com quem", "pessoa", "pessoas", "quem", "responsavel", "amigo", "amiga"]),
    K("contato", "text", "Contato", ["telefone", "whatsapp", "celular", "email", "e mail", "contato"]),
    K("quantidade", "number", "Quantidade", ["quantidade", "qtd", "numero de", "quantas unidades"]),
    K("ano", "number", "Ano", ["ano de publicacao", "ano"], { naoDepois: ["por", "ao", "no", "cada", "todo", "este", "esse", "um", "uma", "de", "meio", "proximo", "ultimo"] }),
    K("periodico", "text", "Periódico", ["periodico", "revista", "journal"]),
    K("paginas", "number", "Páginas", ["quantas paginas", "paginas lidas", "numero de paginas", "paginas"]),
    K("questoes", "number", "Questões", ["quantas questoes", "questoes feitas", "questoes", "exercicios feitos", "quantos exercicios"]),
    K("acertos", "number", "Acertos", ["quantos acertos", "quantas acertei", "quantas eu acertei", "acertos", "acertei", "acerto", "porcentagem de acerto"]),
    K("peso", "number", "Peso (kg)", ["peso", "kg", "quilos"]),
    K("pesoNota", "number", "Peso", ["peso da nota", "peso da prova", "peso na media"]),
    K("calorias", "number", "Calorias (kcal)", ["calorias", "kcal"]),
    K("nota", "number", "Nota (0 a 10)", ["nota de 0 a 10", "nota de 1 a 10", "de 0 a 10", "de 1 a 10", "nota 0 a 10"]),
    K("avaliacao", "estrelas", "Avaliação", ["quanto gostei", "de 1 a 5", "nota de 1 a 5", "avaliacao", "avaliar", "estrelas", "classificacao", "nota", "notas"]),
    K("link", "link", "Link", ["link", "links", "site", "url", "youtube", "doi"]),
    K("progresso", "number", "Progresso (%)", ["porcentagem", "percentual", "progresso"]),
    K("frequencia", "select", "Frequência", ["frequencia", "periodicidade", "de quanto em quanto tempo"], { opcoes: ["diária", "semanal", "quinzenal", "mensal"] }),
    K("dose", "text", "Dose", ["dose", "dosagem", "mg"]),
    K("humor", "select", "Humor", ["como me senti", "como eu me senti", "humor", "sentimento", "energia", "disposicao"], { opcoes: ["difícil", "neutro", "bom", "ótimo"] }),
    K("situacao", "select", "Situação", ["status", "situacao", "andamento", "etapa", "etapas", "fase", "fases", "estagio do processo"], { opcoes: ["a fazer", "fazendo", "feito"], rotulos: [[/etapa/, "Etapa"], [/fase/, "Fase"], [/status/, "Status"]] }),
    K("prioridade", "select", "Prioridade", ["prioridade", "prioridades", "urgente", "urgencia", "importancia"], { opcoes: ["baixa", "média", "alta"] }),
    K("categoria", "select", "Categoria", ["categoria", "categorias", "tipo", "tipos", "genero", "generos", "area", "areas", "materia", "materias", "disciplina", "disciplinas", "modalidade", "especialidade", "setor", "setores", "assunto", "tema", "temas", "plataforma"],
      { rotulos: [[/^tipo/, "Tipo"], [/^gener/, "Gênero"], [/^area/, "Área"], [/^materia/, "Matéria"], [/^disciplina/, "Disciplina"], [/^modalidade/, "Modalidade"], [/^especialidade/, "Especialidade"], [/^setor/, "Setor"], [/^assunto/, "Assunto"], [/^tema/, "Tema"], [/^plataforma/, "Plataforma"]] }),
    K("observacoes", "textarea", "Observações", ["o que aprendi", "aprendizados", "aprendizado", "observacoes", "observacao", "anotacoes", "anotacao", "comentarios", "comentario", "detalhes", "reflexao", "reflexoes", "como foi", "resumo", "casos", "motivo", "por que"],
      { rotulos: [[/aprend/, "Aprendizados"], [/anota/, "Anotações"], [/coment/, "Comentário"], [/detalhe/, "Detalhes"], [/reflex/, "Reflexão"], [/como foi/, "Como foi"], [/resumo/, "Resumo"], [/casos/, "Casos"], [/motivo|por que/, "Por que"]] }),
  ];

  // Gatilhos indexados pela primeira palavra: achar um conceito é olhar só os
  // gatilhos que começam com a palavra da vez (bem mais leve que uma expressão
  // regular por gatilho, o que importa em computador fraco).
  const POR_PRIMEIRA = new Map();
  CONCEITOS.forEach((k) => k.gatilhos.forEach((g) => {
    const ws = g.split(" ");
    if (!POR_PRIMEIRA.has(ws[0])) POR_PRIMEIRA.set(ws[0], []);
    POR_PRIMEIRA.get(ws[0]).push({ k, g, ws });
  }));
  POR_PRIMEIRA.forEach((l) => l.sort((x, y) => y.ws.length - x.ws.length));

  /** Palavras do texto (sem acento) com a posição de cada uma. */
  function palavrasCom(pl) {
    const out = [];
    for (const m of pl.matchAll(/[a-z0-9]+/g)) out.push({ w: m[0], ini: m.index, fim: m.index + m[0].length });
    return out;
  }

  /* ---------------------- Conhecimento: jeito de usar ---------------------- */

  const SINAIS = {
    checkin: ["todo dia", "todos os dias", "diariamente", "cada dia", "dia a dia", "habito", "habitos", "sequencia", "streak", "marcar se fiz", "marcar os dias", "dias que fui", "dias em que", "check in", "checkin", "marcar quando fiz", "rotina diaria"],
    agenda: ["prazo", "prazos", "vencimento", "vencimentos", "data", "datas", "quando", "agenda", "agendar", "agendado", "calendario", "lembrar", "lembrete", "lembretes", "dia marcado", "entrega", "compromisso", "compromissos", "marcado para"],
    semAgenda: ["sem data", "nao tem data", "nao precisa de data", "sem prazo", "colecao", "catalogo", "acervo"],
    calendario: ["calendario", "no calendario", "em calendario", "por mes no calendario", "visao mensal"],
    quadro: ["quadro", "kanban", "colunas", "trello", "pipeline", "funil", "por etapa", "por etapas"],
    tabela: ["tabela", "planilha", "excel", "em colunas", "comparar"],
    cartoes: ["cartoes", "cards", "galeria", "mural", "capas"],
    lista: ["em lista", "lista simples"],
    recentes: ["mais recentes", "recentes primeiro", "ultimos primeiro", "os ultimos"],
    porData: ["por data", "ordem de data", "cronologica", "cronologico", "proximos primeiro", "o mais proximo"],
    az: ["alfabetica", "alfabetico", "de a a z", "por nome"],
    maiorValor: ["maior valor", "mais caro", "maiores valores", "mais caros"],
    maiorNota: ["melhor nota", "maior nota", "melhores notas", "mais bem avaliados"],
  };

  const INTRO_CAMPOS = /(?:^|\s)(com|registrar|registro de|anotar|guardar|salvar|controlar|acompanhar|campos?|informacoes|dados|colunas|contendo|incluindo|tendo|saber|marcar|ver)\s*:?\s*$/;

  // Ícone pelo radical de alguma palavra do nome ou do propósito, quando o assunto não decidiu.
  const ICONE_POR_RADICAL = [
    [["dinheir", "financ", "gast", "econom", "reais", "invest", "poup"], "svg:cofre"],
    [["estud", "aula", "prova", "livr", "leitur", "materi", "facul"], "svg:livro"],
    [["saud", "medic", "consult", "clinic", "hospit", "plant"], "svg:estetoscopio"],
    [["remed", "pilul", "suplement"], "svg:pilula"],
    [["trein", "academ", "muscul"], "svg:haltere"],
    [["corr", "caminh", "pedal"], "svg:tenis"],
    [["music", "cant", "violao"], "svg:musica"],
    [["viag", "voo", "passag"], "svg:aviao"],
    [["comid", "receit", "refeic", "almoc", "jant"], "svg:prato"],
    [["cafe"], "svg:cafe"],
    [["casa", "apart", "limp"], "svg:casa"],
    [["compr", "mercad", "loja"], "svg:carrinho"],
    [["pet", "cachorr", "gato"], "svg:pata"],
    [["carr", "moto", "veicul"], "svg:carro"],
    [["trabalh", "client", "freel", "emprego", "servic"], "svg:maleta"],
    [["objetiv", "meta", "sonh"], "svg:bandeira"],
    [["ideia", "insight", "invent"], "svg:lampada"],
    [["event", "agend", "compromiss", "calendar"], "svg:calendario"],
    [["hora", "tempo", "turn"], "svg:relogio"],
    [["igrej", "orac", "biblia", "fe"], "svg:cruz"],
    [["plant", "jardim", "hort"], "svg:folha"],
    [["arte", "desenh", "pint", "artesan"], "svg:pincel"],
    [["jog", "game"], "svg:controle"],
    [["pesso", "amig", "famil", "contat", "grup", "turm"], "svg:grupo"],
    [["present", "aniversar", "fest"], "svg:presente"],
    [["pesquis", "artig", "cienc", "laborat"], "svg:microscopio"],
    [["escrev", "diari", "text", "anot"], "svg:lapis"],
    [["foto", "vide", "camer", "post", "conteud"], "svg:camera"],
    [["sono", "dorm", "noit"], "svg:lua"],
    [["sol", "manh", "rotin"], "svg:sol"],
    [["agua", "hidrat", "beb"], "svg:gota"],
    [["amor", "namor", "relacion", "coraca"], "svg:coracao"],
    [["idiom", "ingl", "espanh", "mund", "pais"], "svg:globo"],
  ];

  const PALETA_RESERVA = ["#d6398a", "#0d95b5", "#b57d0a", "#5a4fd4", "#6e8f22", "#5b6b7d", "#8e5bd0", "#178f6c", "#1f7a8c"];
  const paleta = () => (typeof Store !== "undefined" && Store.PALETA_PILAR ? Store.PALETA_PILAR.map((x) => x.valor) : PALETA_RESERVA);

  const NUMEROS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, cem: 100 };

  /* ------------------------------- Peças ---------------------------------- */

  function classificar(nome, proposito) {
    const aN = analisar(nome);
    const aP = analisar(proposito);
    let melhor = null;
    let segundo = 0;
    for (const a of ASSUNTOS) {
      // Cada radical conta uma vez por assunto: "estudo", "estudos" e
      // "estudar" são a mesma pista, não três.
      const porChave = new Map();
      let doNome = false;
      for (const k of a.chaves) {
        const pn = pontos(k, aN);
        const pp = a.soNome?.includes(k) ? 0 : pontos(k, aP);
        if (!pn && !pp) continue;
        if (pn) doNome = true;
        const chave = k.includes(" ") ? k : radical(k);
        porChave.set(chave, Math.max(porChave.get(chave) || 0, pn * 2 + pp));
      }
      let s = 0;
      porChave.forEach((v) => { s += v; });
      if (doNome) s += 2;
      if (!melhor || s > melhor.pontos) { segundo = melhor?.pontos || 0; melhor = { assunto: a, pontos: s, doNome }; } else if (s > segundo) segundo = s;
    }
    if (!melhor || melhor.pontos < 2.5) return null;
    return { ...melhor, folga: melhor.pontos - segundo };
  }

  /** Trechos do propósito onde aparece cada conceito; o gatilho mais longo ganha o trecho. */
  function acharConceitos(pl) {
    const ws = palavrasCom(pl);
    const candidatos = [];
    ws.forEach((p, i) => {
      for (const t of POR_PRIMEIRA.get(p.w) || []) {
        if (i + t.ws.length > ws.length) continue;
        let ok = true;
        for (let j = 1; j < t.ws.length && ok; j++) ok = ws[i + j].w === t.ws[j];
        if (!ok) continue;
        const ant = ws[i - 1]?.w || "";
        if (t.k.naoDepois && t.k.naoDepois.includes(ant)) continue;
        candidatos.push({ k: t.k, g: t.g, ini: p.ini, fim: ws[i + t.ws.length - 1].fim, n: t.ws.length });
      }
    });
    candidatos.sort((x, y) => y.n - x.n || x.ini - y.ini);
    const aceitos = [];
    for (const c of candidatos) if (!aceitos.some((a) => c.ini < a.fim && c.fim > a.ini)) aceitos.push(c);
    return aceitos.sort((x, y) => x.ini - y.ini);
  }

  /** "sem horário", "não preciso de valor": conceitos que a pessoa disse que não quer. */
  function negados(pl, achados) {
    const fora = new Set();
    achados.forEach(({ k, ini }) => {
      const antes = pl.slice(Math.max(0, ini - 32), ini);
      if (/(?:^|[^a-z])(sem|tirar|exceto|menos|nao (?:quero|preciso|precisa|tem|vai ter|coloque|coloca|ponha)(?: de| o| a| os| as)?)\s+(?:o |a |os |as |de |do |da )?$/.test(antes)) fora.add(k.id);
    });
    return fora;
  }

  const temSinal = (n, lista) => lista.some((s) => n.includes(` ${s} `));

  const INTRO = new Set(["so", "apenas", "somente", "com", "registrar", "anotar", "guardar", "salvar", "controlar", "acompanhar", "campos", "campo",
    "informacoes", "dados", "colunas", "contendo", "incluindo", "tendo", "saber", "marcar", "ver", "mostrar", "cadastrar"]);

  // Palavras que, sozinhas numa lista, não são campo: o nome e a data já existem em todo registro.
  const DE_SISTEMA = new Set(["nome", "titulo", "data", "dia", "descricao", "o que", "qual", "prazo", "vencimento", "data de entrega", "entrega", "quando", "data de vencimento"]);
  const SINAL_ITEM = /^(?:sem|nao|em (?:tabela|lista|quadro|cartoes|calendario)|no (?:calendario|quadro)|mais (?:caros?|recentes|baratos?)|por (?:data|nome|mes|semana|dia)|todo dia|todos os dias|marcar|meta|ver |mostrar)/;

  /**
   * Listas que a pessoa escreveu, de campos ou de opções:
   * "(lendo, lido, quero ler)", "matérias: anatomia, fisiologia" ou
   * "com local, horário, valor e se já recebi". Tudo no texto sem acento;
   * quem chama devolve os acentos pelo dicionário das palavras originais.
   */
  function acharListas(pl) {
    const listas = [];
    // Artigo no começo sai só de nome de campo ("o local"); em opção ele faz parte ("a receber").
    const limparItem = (x, enumeracao) => x.replace(/\s+/g, " ").trim().replace(/^(?:so|apenas|somente|tambem)\s+/, "").replace(/^(?:e|ou)\s+/, "")
      .replace(enumeracao ? /^(?:os|as|um|uma|de|do|da|o(?!\s+que\b)|a(?!\s+que\b))\s+/ : /^$/, "")
      .replace(/\s+(?:todos os dias|todo dia|por dia|diariamente|toda semana|por semana|todo mes|por mes)$/, "").trim();
    const bom = (x, enumeracao) => x && x.length <= 40 && x.split(" ").length <= 5 && !SINAL_ITEM.test(x)
      && (!enumeracao || conceitoDe(x) || !(/^(?:que|quero|eu|para|pra|quando|porque|pois|e|ou|o que)\b/.test(x) || /\d/.test(x)));
    const itensDe = (txt, enumeracao = false) => txt.split(/\s*(?:,|;|\/|\s+ou\s+|\s+e\s+)\s*/).map((x) => limparItem(x, enumeracao)).filter((x) => bom(x, enumeracao));
    const jaTem = (itens) => listas.some((l) => l.itens.join("|") === itens.join("|"));
    for (const m of pl.matchAll(/([a-z0-9 ]{0,40}?)\s*\(([^()]{3,200})\)/g)) {
      const itens = itensDe(m[2]);
      if (itens.length >= 2) listas.push({ antes: m[1].trim(), itens, tipo: "paren" });
    }
    for (const m of pl.matchAll(/([a-z0-9 ]{1,40}?)\s*:\s*([^:.;!?\n()]{3,200})/g)) {
      const itens = itensDe(m[2]);
      if (itens.length >= 2 && !jaTem(itens)) listas.push({ antes: m[1].trim(), itens, tipo: "dois" });
    }
    for (const m of pl.matchAll(/\b(?:so|apenas|somente)\s+(?:quero\s+|preciso\s+de\s+|o\s+|a\s+)?([^.;!?\n,:()]{2,80})/g)) {
      const itens = itensDe(m[1], true);
      if (itens.length && itens.some((it) => conceitoDe(it)) && !jaTem(itens)) listas.push({ antes: "so", itens, tipo: "enum", intro: true });
    }
    // Enumeração solta, oração por oração (o que está entre parênteses ou depois de dois-pontos já foi lido).
    const semParen = pl.replace(/\([^()]*\)/g, (x) => " ".repeat(x.length));
    for (const m of semParen.matchAll(/[^.;!?\n:]+/g)) {
      const partes = m[0].split(",").map((x) => x.trim());
      if (partes.length < 2) continue;
      // A lista começa na parte que abre com "com", "registrar"… ou, sem isso,
      // nas últimas palavras da primeira parte.
      let inicio = partes.findIndex((x, i) => i > 0 && INTRO.has(x.split(" ")[0]));
      let antes;
      let corpo;
      if (inicio > 0) {
        antes = partes.slice(0, inicio).join(", ");
        const [intro, ...resto] = partes[inicio].split(" ");
        antes += ` ${intro}`;
        corpo = [resto.join(" "), ...partes.slice(inicio + 1)];
      } else {
        const p0 = partes[0].split(" ");
        let corte = -1;
        p0.forEach((w, i) => { if (INTRO.has(w)) corte = i; });
        antes = (corte >= 0 ? p0.slice(0, corte + 1) : p0.slice(0, -2)).join(" ");
        corpo = [(corte >= 0 ? p0.slice(corte + 1) : p0.slice(-2)).join(" "), ...partes.slice(1)];
        inicio = corte >= 0 ? 0 : -1;
      }
      // O último pedaço para numa preposição que começa outra ideia.
      corpo[corpo.length - 1] = corpo[corpo.length - 1].split(/\s(?:para|pra|por|no|na|em|que|sem|quando|porque|pois)\s/)[0];
      const itens = itensDe(corpo.join(", "), true);
      const fecha = /\s(?:e|ou)\s/.test(m[0].split(",").slice(-1)[0]) || partes.length >= 3;
      if (itens.length >= 2 && fecha && !jaTem(itens)) listas.push({ antes, itens, tipo: "enum", intro: inicio >= 0 });
    }
    return listas;
  }

  /** O conceito de um pedaço de texto ("se já recebi" → recebido), ou nada. */
  function conceitoDe(item) {
    const ach = acharConceitos(plano(String(item || "").toLowerCase()));
    if (!ach.length) return null;
    const maior = ach.reduce((x, y) => (y.n > x.n ? y : x));
    return { k: maior.k, g: maior.g };
  }

  /** O último conceito de um texto: o dono de uma lista é a palavra logo antes dela ("link e status: ..." é de status). */
  function conceitoFinal(texto) {
    const ach = acharConceitos(plano(String(texto || "").toLowerCase()));
    return ach.length ? { k: ach[ach.length - 1].k, g: ach[ach.length - 1].g } : null;
  }

  function rotuloDoConceito(k, g) {
    if (k.rotulos) for (const [re, r] of k.rotulos) if (re.test(g)) return r;
    return k.rotulo;
  }

  function campoDoConceito(k, g, opcoes) {
    const rotulo = rotuloDoConceito(k, g);
    let tipo = k.tipo;
    let ops = opcoes && opcoes.length >= 2 ? opcoes : k.opcoes || [];
    if (k.id === "categoria" && ops.length < 2) tipo = "text";
    if (tipo !== "select") ops = [];
    return { id: k.id === "categoria" ? idDe(rotulo) : k.id, rotulo, tipo, opcoes: ops.slice(0, 8), naLista: false, obrigatorio: false, conceito: k.id, forte: g.includes(" ") || tipo === "simNao" };
  }

  /** "Valor recebido (R$)" → "valorRecebido". */
  function idDe(rotulo) {
    const n = normal(rotulo.replace(/\(.*?\)/g, "")).split(" ").filter(Boolean);
    return (n.map((p, i) => (i ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join("") || "campo").slice(0, 24);
  }

  /** Meta escrita no propósito: "meta de 12 livros por ano", "40 km por mês", "R$ 2.000 por mês", "3 vezes por semana". */
  function acharMeta(pl) {
    const t = pl.replace(/r\$\s*/g, "reais ");
    const num = "(\\d+(?:[.,]\\d+)*|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta|quarenta|cinquenta|cem)";
    const re = new RegExp(`(reais\\s+)?\\b${num}\\s*(mil\\s+)?(reais|km|quilometros|horas|hora|h|minutos|min|paginas|questoes|vezes|vez|x|[a-z]+)?\\s+(?:por|ao|na|no|numa|num|a cada|cada|toda|todo|em cada)\\s+(dia|semana|mes|ano)\\b`);
    const m = t.match(re);
    if (!m) return null;
    let n = NUMEROS[m[2]] ?? Number(m[2].replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return null;
    if (m[3]) n *= 1000;
    return { alvo: n, unidade: m[1] ? "reais" : m[4] || "", periodo: m[5], texto: m[0].trim() };
  }

  /** "cada plantão", "registrar meus treinos": o que é cada registro (sem acento; o acento volta pelo dicionário). */
  function acharRotulo(pl) {
    const pats = [
      /\bcada\s+(?:um|uma)?\s*([a-z]{3,20})/,
      /\b(?:um|uma)\s+([a-z]{3,20})\s+por\s+(?:linha|registro|vez)/,
      /\b(?:registrar|anotar|guardar|acompanhar|controlar|listar|cadastrar|organizar)\s+(?:meus|minhas|os|as|todos os|todas as|cada)?\s*([a-z]{3,20})/,
      /\b(?:registro|controle|lista|acompanhamento|historico|diario)\s+(?:de|dos|das)\s+(?:meus|minhas)?\s*([a-z]{3,20})/,
    ];
    const ruins = new Set(["dia", "dias", "vez", "vezes", "quanto", "quando", "onde", "tudo", "isso", "quem", "como", "qual", "quais", "data", "datas"]);
    for (const re of pats) {
      const m = pl.match(re);
      if (m && !PARADAS.has(m[1]) && !ruins.has(m[1]) && !CONCEITOS.some((k) => k.gatilhos.includes(m[1]))) return m[1];
    }
    return "";
  }

  /** Palavra sem acento → como a pessoa escreveu ("horario" → "horário"), para nomes de campo e opções. */
  function dicionario(texto) {
    const d = new Map();
    for (const w of String(texto || "").toLowerCase().match(/[\p{L}\p{N}]+/gu) || []) d.set(plano(w), w);
    return d;
  }

  function iconePorTexto(...textos) {
    const rads = new Set();
    textos.forEach((t) => normal(t).split(" ").filter((p) => p.length >= 3 && !PARADAS.has(p)).forEach((p) => { rads.add(p); rads.add(radical(p)); }));
    for (const [prefixos, ic] of ICONE_POR_RADICAL) if ([...rads].some((r) => prefixos.some((pr) => r.startsWith(pr)))) return ic;
    return "svg:estrela";
  }

  function corPara(nome, preferida, usadas = []) {
    const p = paleta();
    const livres = p.filter((x) => !usadas.includes(x));
    if (preferida && p.includes(preferida) && (!usadas.includes(preferida) || !livres.length)) return preferida;
    const base = livres.length ? livres : p;
    let h = 0;
    for (const ch of String(nome)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return base[h % base.length];
  }

  /** O propósito vira a descrição curta da página: a primeira frase, sem o "eu quero uma aba para". */
  function descricaoDe(proposito) {
    let s = String(proposito || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    s = s.split(/(?<=[.!?;])\s/)[0];
    s = s.replace(/^(?:eu\s+)?(?:quero|queria|preciso|gostaria\s+de|vou|desejo|pretendo)\s+(?:de\s+)?(?:uma\s+|um\s+)?(?:aba|p[aá]gina|lugar|espa[cç]o)?\s*(?:para|pra|de|onde)?\s*/i, "");
    s = s.replace(/^(?:uma\s+|um\s+)?(?:aba|p[aá]gina)\s+(?:para|pra|de|onde)\s+/i, "");
    s = s.replace(/[;,:\s]+$/, "");
    if (!s) return "";
    s = capitalizar(s);
    if (s.length > 160) s = `${s.slice(0, 157).replace(/\s+\S*$/, "")}…`;
    else if (!/[.!?…]$/.test(s)) s += ".";
    return s;
  }

  const PERIODO_TXT = { semana: "por semana", mes: "por mês", ano: "por ano" };
  const VISTA_TXT = { lista: "lista", cartoes: "cartões", quadro: "quadro", tabela: "tabela", calendario: "calendário" };

  /* ------------------------------ Entender --------------------------------- */

  /**
   * Lê nome e propósito e devolve a aba montada.
   * `usadas`: cores das abas que já existem (para não repetir, quando dá).
   * `existentes`: campos que a aba já tem (no editor, para propor só os novos).
   */
  function entender({ nome = "", proposito = "", usadas = [], existentes = [] } = {}) {
    const nomeL = String(nome || "").trim();
    const propL = String(proposito || "").trim();
    const minusculo = propL.toLowerCase();
    const pl = plano(minusculo);
    const nP = analisar(propL).n;
    const dic = dicionario(`${nomeL} ${propL}`);
    const acentuar = (txt) => String(txt || "").split(" ").map((w) => dic.get(w) || w).join(" ");
    const entendeu = [];

    // 1. Assunto
    const cls = classificar(nomeL, propL);
    const tpl = cls ? JSON.parse(JSON.stringify(cls.assunto.tpl)) : null;

    // 2. Conceitos de campo, negações e listas
    const achados = propL ? acharConceitos(pl) : [];
    const fora = negados(pl, achados);
    const listas = propL ? acharListas(pl) : [];

    // Listas de opções presas a um conceito: "situação (lendo, lido)", "matérias: anatomia, fisiologia".
    const opcoesPorConceito = new Map();
    const camposDeLista = [];
    let listaDeCampos = false;
    let listaDeOpcoesSolta = false;
    const exemplosDoTexto = [];
    for (const l of listas) {
      const mapeados = l.itens.filter((it) => !DE_SISTEMA.has(it)).map((it) => ({ it, ck: conceitoDe(it) }));
      const queMapeiam = mapeados.filter((x) => x.ck).length;
      const metade = Math.ceil(mapeados.length / 2);
      const cue = conceitoFinal(l.antes.split(/\s+/).slice(-3).join(" "));
      const cueEhLista = cue && (cue.k.tipo === "select" || cue.k.id === "categoria");
      // Lista de campos: aberta por "com", "registrar"… ou com metade dos itens
      // reconhecidos como campo ("dose", "horário"). Lista de opções: presa a
      // "situação", "tipo", "matérias"… ou a qualquer nome antes de ":" e "(".
      // Entre parênteses, são as opções da palavra de antes ("pagamento (a receber, recebido)").
      const parenDeConceito = l.tipo === "paren" && cue && !INTRO_CAMPOS.test(` ${l.antes}`);
      const ehCampos = !cueEhLista && !parenDeConceito && (INTRO_CAMPOS.test(` ${l.antes}`) || l.intro || queMapeiam >= metade);
      if (ehCampos && mapeados.length) {
        listaDeCampos = true;
        mapeados.forEach(({ it, ck }) => {
          if (ck) {
            const campo = campoDoConceito(ck.k, ck.g);
            // "onde conheci" diz mais que "Local": nos campos de texto, vale o que a pessoa escreveu.
            if ((campo.tipo === "text" || campo.tipo === "textarea") && it !== ck.g && it.split(" ").length <= 4 && !/^(?:se|quanto|quantos|quantas)\b/.test(it)) campo.rotulo = capitalizar(acentuar(it));
            camposDeLista.push(campo);
          } else if (it.split(" ").length <= 4 && !PARADAS.has(it)) {
            const rot = capitalizar(acentuar(it));
            camposDeLista.push({ id: idDe(rot), rotulo: rot, tipo: "text", opcoes: [], naLista: false, obrigatorio: false, conceito: "" });
          }
        });
        continue;
      }
      const opcoes = [...new Set(l.itens.filter((x) => x.split(" ").length <= 4).map(acentuar))].slice(0, 8);
      if (opcoes.length < 2) continue;
      if (cueEhLista || parenDeConceito) { opcoesPorConceito.set(cue.k.id, { opcoes, g: cue.g, conceito: cue.k.id }); continue; }
      if (l.tipo !== "enum") {
        // Lista sem conceito conhecido antes dela: vira uma lista de opções com o nome que veio antes.
        const nomeLista = l.antes.split(/\s+/).filter((w) => w && !PARADAS.has(w)).slice(-1).join(" ");
        if (nomeLista) {
          const rot = capitalizar(acentuar(nomeLista));
          camposDeLista.push({ id: idDe(rot), rotulo: rot, tipo: "select", opcoes, naLista: true, obrigatorio: false, conceito: "" });
        }
        continue;
      }
      // Enumeração que não é de campos nem de opções ("beber água, meditar e
      // dormir cedo"): são os primeiros registros. Viram sugestões para começar.
      exemplosDoTexto.push(...opcoes.map(capitalizar));
    }

    // Campos vindos do propósito (cada conceito uma vez, na ordem em que aparece).
    const vistosConceito = new Set();
    const camposDoTexto = [];
    for (const a of achados) {
      if (fora.has(a.k.id) || vistosConceito.has(a.k.id)) continue;
      // "nota" ou "notas" perto de "anotar"/"sobre" é anotação, não avaliação.
      if (a.k.id === "avaliacao" && /notas? sobre|fazer notas|tomar notas/.test(pl.slice(Math.max(0, a.ini - 10), a.fim + 8))) continue;
      vistosConceito.add(a.k.id);
      const op = opcoesPorConceito.get(a.k.id);
      camposDoTexto.push(campoDoConceito(a.k, op?.g && a.k.id === "categoria" ? op.g : a.g, op?.opcoes));
    }
    // Um conceito que só apareceu como dono de uma lista ("tipos: x, y") também vira campo.
    for (const [id, op] of opcoesPorConceito) {
      if (vistosConceito.has(id) || fora.has(id)) continue;
      const k = CONCEITOS.find((x) => x.id === id);
      camposDoTexto.push(campoDoConceito(k, op.g, op.opcoes));
      vistosConceito.add(id);
    }

    // 3. Jeito de usar
    const pediuCheckin = temSinal(nP, SINAIS.checkin) || /\b\d+\s*(?:x|vezes)\s+(?:por|na)\s+semana\b/.test(pl);
    const pediuAgenda = temSinal(nP, SINAIS.agenda);
    const semAgenda = temSinal(nP, SINAIS.semAgenda);
    const vistaPedida = ["calendario", "quadro", "tabela", "cartoes", "lista"].find((v) => temSinal(nP, SINAIS[v])) || "";

    // Academia é uma tela especial (dias de treino). Só fica nela se a pessoa
    // não descreveu outra coisa: campos próprios ou marcar por dia.
    const usarEspecial = tpl?.especial === "academia" && !listaDeCampos && !camposDoTexto.length && !pediuCheckin;
    if (tpl?.especial && !usarEspecial) delete tpl.especial;

    // 4. Campos finais
    let campos;
    let origemCampos;
    if (usarEspecial) {
      campos = [];
      origemCampos = "especial";
    } else if (listaDeCampos) {
      // A pessoa disse quais campos quer: são esses, mais os que ela citou em outro trecho.
      // Fora da lista, só entra o que foi dito com todas as letras ("se já
      // paguei", "quanto custou"): uma palavra solta como "pessoas" não basta.
      const fortes = camposDoTexto.filter((x) => x.forte && !camposDeLista.some((y) => mesmoCampo(y, x)));
      campos = [...camposDeLista, ...fortes];
      origemCampos = "lista";
    } else {
      const doAssunto = (tpl?.campos || []).map((x) => ({ ...x, conceito: conceitoPorRotulo(x.rotulo) }));
      const extras = camposDoTexto.filter((x) => !doAssunto.some((y) => mesmoCampo(y, x)));
      campos = [...doAssunto, ...camposDeLista, ...extras];
      origemCampos = tpl ? (extras.length || camposDeLista.length ? "assunto+texto" : "assunto") : camposDoTexto.length || camposDeLista.length ? "texto" : "padrao";
      if (!tpl && !campos.length) campos = [c("observacoes", "Observações", "textarea")];
    }
    // "Peso" ao lado de nota ou prova é o peso na média, não quilos.
    if (/\b(?:nota|notas|prova|provas|media|avaliacao|avaliacoes)\b/.test(pl)) campos = campos.map((x) => (x.id === "peso" ? { ...x, id: "pesoNota", rotulo: "Peso", conceito: "pesoNota" } : x));
    // Opções escritas pela pessoa substituem as do molde ("situação (lendo, lido)").
    campos = campos.map((x) => {
      const op = opcoesPorConceito.get(x.conceito || x.id) || (x.tipo === "select" ? [...opcoesPorConceito.values()].find((o) => normal(rotuloDoConceito(CONCEITOS.find((k) => k.id === "categoria"), o.g)) === normal(x.rotulo)) : null);
      return op && (x.tipo === "select" || (x.conceito || x.id) === "categoria" || x.conceito === op.conceito) ? { ...x, tipo: "select", opcoes: op.opcoes } : x;
    });
    // Negados saem também do molde ("sem valor").
    campos = campos.filter((x) => !fora.has(x.conceito || x.id) && !fora.has(conceitoPorRotulo(x.rotulo)));
    // Sem repetir, sem nomes reservados, até 8.
    const ids = new Set();
    campos = campos.filter((x) => {
      const chave = normal(x.rotulo);
      if (ids.has(chave)) return false;
      ids.add(chave);
      return true;
    }).slice(0, 8);
    const RESERVADOS = new Set(["descricao", "data", "concluido", "id", "extras", "feitos", "criadoEm", "concluidoEm"]);
    const idsUsados = new Set();
    campos = campos.map(({ conceito, forte, ...x }) => {
      let id = x.id || idDe(x.rotulo);
      if (RESERVADOS.has(id)) id = `${id}2`;
      while (idsUsados.has(id)) id = `${id}_`;
      idsUsados.add(id);
      return { ...x, id };
    });
    // Os três primeiros campos curtos aparecem na linha da lista.
    if (!campos.some((x) => x.naLista)) campos.filter((x) => x.tipo !== "textarea").slice(0, 3).forEach((x) => { x.naLista = true; });

    // 5. Agenda e marcação por dia
    let checkin = tpl ? !!tpl.checkin : false;
    let naAgenda = tpl ? !!tpl.naAgenda : true;
    if (pediuCheckin) { checkin = true; naAgenda = false; }
    if (pediuAgenda && !pediuCheckin) naAgenda = true;
    if (semAgenda) naAgenda = false;
    if (usarEspecial) { checkin = false; naAgenda = false; }
    if (vistaPedida === "calendario" && !checkin) naAgenda = true;

    // 6. Meta
    let metaFinal = tpl?.meta ? { ...tpl.meta } : { ...SEM_META };
    const mt = propL ? acharMeta(pl) : null;
    let metaEscrita = false;
    if (mt && !usarEspecial) {
      const porDia = mt.periodo === "dia";
      const periodo = porDia ? "semana" : mt.periodo;
      const alvoBase = porDia ? mt.alvo * 7 : mt.alvo;
      const u = mt.unidade;
      const garantir = (conceito, rotulo, tipo = "number") => {
        let campo = campos.find((x) => x.id === conceito || (tipo === "dinheiro" && x.tipo === "dinheiro") || normal(x.rotulo).startsWith(normal(rotulo).split(" ")[0]));
        if (!campo) { campo = { id: conceito, rotulo, tipo, opcoes: [], naLista: true, obrigatorio: false }; campos.push(campo); }
        return campo;
      };
      if (u === "reais") metaFinal = meta("soma", alvoBase, periodo, garantir("valor", "Valor (R$)", "dinheiro").id);
      else if (/^(km|quilometros)$/.test(u)) metaFinal = meta("soma", alvoBase, periodo, garantir("distancia", "Distância (km)").id);
      else if (/^(horas?|h)$/.test(u)) metaFinal = meta("soma", alvoBase, periodo, garantir("horas", "Horas").id);
      else if (/^(minutos|min)$/.test(u)) metaFinal = meta("soma", alvoBase, periodo, garantir("duracao", "Duração (min)").id);
      else if (u === "paginas") metaFinal = meta("soma", alvoBase, periodo, garantir("paginas", "Páginas").id);
      else if (u === "questoes") metaFinal = meta("soma", alvoBase, periodo, garantir("questoes", "Questões").id);
      else if (checkin) metaFinal = meta("checkins", porDia ? Math.min(7, alvoBase) : Math.min(periodo === "semana" ? 7 : periodo === "mes" ? 31 : 366, alvoBase), periodo);
      else metaFinal = meta("concluidos", alvoBase, periodo);
      metaEscrita = true;
    } else if (pediuCheckin && !tpl?.checkin && temSinal(nP, ["todo dia", "todos os dias", "diariamente"])) {
      metaFinal = meta("checkins", 7, "semana");
    }
    if (/\b(?:sem meta|nao (?:quero|preciso)(?: de)? meta|sem objetivo)\b/.test(pl)) { metaFinal = { ...SEM_META }; metaEscrita = true; }
    if (metaFinal.tipo === "checkins" && !checkin) metaFinal = { ...SEM_META };
    if (metaFinal.tipo === "soma" && !campos.some((x) => x.id === metaFinal.campoId)) metaFinal = { ...SEM_META };
    campos = campos.slice(0, 8);

    // 7. Vista, ordem e agrupamento
    let vista = usarEspecial ? "lista" : vistaPedida || tpl?.vista || "lista";
    if (checkin && !["lista", "cartoes"].includes(vista)) vista = "lista";
    if (vista === "calendario" && !naAgenda) vista = "lista";
    const selects = campos.filter((x) => x.tipo === "select");
    if (vista === "quadro" && !selects.length && !vistaPedida) vista = "lista";
    let ordem = "auto";
    if (temSinal(nP, SINAIS.recentes)) ordem = "recentes";
    else if (temSinal(nP, SINAIS.porData) && !checkin) ordem = "data";
    else if (temSinal(nP, SINAIS.az)) ordem = "az";
    else if (temSinal(nP, SINAIS.maiorValor)) { const v = campos.find((x) => x.tipo === "dinheiro"); if (v) ordem = `campo:${v.id}`; } else if (temSinal(nP, SINAIS.maiorNota)) { const v = campos.find((x) => x.tipo === "estrelas" || x.id === "nota"); if (v) ordem = `campo:${v.id}`; }
    const situacao = selects.find((x) => /^(situacao|status|etapa|fase)/.test(normal(x.rotulo)));
    const agruparPor = selects.some((x) => x.id === tpl?.agruparPor) ? tpl.agruparPor : (situacao || selects[0])?.id || "";

    // 8. Rótulo do registro, ícone, cor, descrição
    const rotuloTexto = propL ? singular(acentuar(acharRotulo(pl))) : "";
    const palavraNome = nomeL.split(/\s+/).find((w) => !PARADAS.has(normal(w)) && normal(w).length >= 3) || "";
    const rotuloNome = singular(palavraNome);
    const rotuloItem = limpar(rotuloTexto || tpl?.rotuloItem || rotuloNome || "registro", 30);
    const icone = tpl?.icone || iconePorTexto(nomeL, propL);
    const cor = corPara(nomeL || propL, tpl?.cor, usadas);
    const descricao = descricaoDe(propL) || tpl?.descricao || "";

    // 9. O que entendeu, em frases curtas
    if (cls) entendeu.push({ tipo: "assunto", texto: `Assunto: ${cls.assunto.nome}`, de: cls.doNome ? "nome" : "propósito" });
    else if (propL) entendeu.push({ tipo: "assunto", texto: "Assunto livre: montei a aba a partir do que você escreveu", de: "propósito" });
    else entendeu.push({ tipo: "dica", texto: nomeL ? "Ainda não sei do que se trata. Conte no propósito o que cada registro guarda, se tem data e se tem meta." : "Escreva o nome e o propósito: o Delfos monta a página a partir deles.", de: "padrão" });
    if (usarEspecial) entendeu.push({ tipo: "jeito", texto: "Tela de treinos: dias, exercícios, cargas e recordes", de: "assunto" });
    else {
      entendeu.push({ tipo: "registro", texto: `Cada registro é um(a) ${rotuloItem}`, de: rotuloTexto ? "propósito" : tpl ? "assunto" : "nome" });
      entendeu.push({ tipo: "jeito", texto: checkin ? "Marcada por dia, com a sequência de dias seguidos" : naAgenda ? "Com data: entra na agenda e nos lembretes" : "Sem data: fica fora da agenda", de: pediuCheckin || pediuAgenda || semAgenda ? "propósito" : "assunto" });
      if (campos.length) entendeu.push({ tipo: "campos", texto: `Campos: ${campos.map((x) => x.rotulo).join(", ")}`, de: origemCampos === "lista" ? "propósito" : origemCampos === "assunto" ? "assunto" : "propósito" });
      if (fora.size) entendeu.push({ tipo: "fora", texto: `Deixei de fora: ${[...fora].map((id) => CONCEITOS.find((k) => k.id === id)?.rotulo.replace(/\s*\(.*\)/, "").toLowerCase()).filter(Boolean).join(", ")}`, de: "propósito" });
      if (metaFinal.tipo !== "nenhuma") {
        const cm = campos.find((x) => x.id === metaFinal.campoId);
        const n = metaFinal.alvo.toLocaleString("pt-BR");
        const unidade = (cm?.rotulo || "").match(/\(([^)]+)\)/)?.[1];
        const quanto = metaFinal.tipo === "soma"
          ? cm?.tipo === "dinheiro" ? `R$ ${n}` : unidade ? `${n} ${unidade}` : `${n} ${(cm?.rotulo || "").toLowerCase()}`
          : metaFinal.tipo === "checkins" ? `${n} ${metaFinal.alvo === 1 ? "marcação" : "marcações"}` : `${n} ${metaFinal.alvo === 1 ? rotuloItem : plural(rotuloItem)}`;
        const soma = metaFinal.tipo === "soma" && cm?.tipo === "dinheiro" ? ` (soma de ${(cm.rotulo || "").replace(/\s*\(.*\)/, "").toLowerCase()})` : "";
        entendeu.push({ tipo: "meta", texto: `Meta: ${quanto} ${PERIODO_TXT[metaFinal.periodo]}${soma}`, de: metaEscrita ? "propósito" : "assunto" });
      }
      entendeu.push({ tipo: "vista", texto: `Abre em ${VISTA_TXT[vista]}${agruparPor ? `, agrupada por ${(campos.find((x) => x.id === agruparPor)?.rotulo || "").toLowerCase()}` : ""}${ordem !== "auto" ? `, ${ordem === "recentes" ? "mais recentes primeiro" : ordem === "data" ? "por data" : ordem === "az" ? "de A a Z" : "do maior para o menor"}` : ""}`, de: vistaPedida || ordem !== "auto" ? "propósito" : tpl?.vista ? "assunto" : "padrão" });
    }

    // No editor: só o que ainda não existe.
    const novos = existentes.length ? campos.filter((x) => !existentes.some((y) => mesmoCampo(y, x))) : campos;

    const confianca = cls && (cls.folga >= 2 || cls.doNome) ? "alta" : cls || camposDoTexto.length || listaDeCampos ? "media" : "baixa";

    return {
      sugestao: {
        icone, cor, descricao, rotuloItem, naAgenda, checkin,
        especial: usarEspecial ? "academia" : "",
        campos: existentes.length ? novos : campos,
        agruparPor, meta: metaFinal,
        exemplos: [...new Set([...exemplosDoTexto, ...(tpl?.exemplos || [])])].slice(0, 6),
        visual: { vista, ordem },
        proposito: limpar(propL, 400),
        origem: "delfos",
      },
      entendeu,
      assunto: cls?.assunto.nome || "",
      confianca,
    };
  }

  function mesmoCampo(a, b) {
    if (a.conceito && b.conceito && a.conceito === b.conceito) return true;
    if (a.id && b.id && a.id === b.id) return true;
    const na = normal(String(a.rotulo || "").replace(/\(.*?\)/g, ""));
    const nb = normal(String(b.rotulo || "").replace(/\(.*?\)/g, ""));
    if (na && na === nb) return true;
    const ca = conceitoPorRotulo(a.rotulo);
    return !!ca && ca === conceitoPorRotulo(b.rotulo);
  }

  /** O conceito de um campo pelo nome dele ("Valor (R$)" → valor), para comparar campos de origens diferentes. */
  function conceitoPorRotulo(rotulo) {
    const ck = conceitoDe(String(rotulo || "").replace(/\(.*?\)/g, ""));
    return ck?.k.id || "";
  }

  return { entender, normal, radical, singular, plural, descricaoDe, ASSUNTOS, CONCEITOS };
})();

if (typeof module !== "undefined") module.exports = Delfos;
