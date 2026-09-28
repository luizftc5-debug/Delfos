/* ===========================================================================
   Abas — o criador e o editor das abas do usuário, com sugestão por IA.

   Ao digitar o nome de uma aba, duas sugestões correm:
   1. A local (este arquivo, `sugerirLocal`): instantânea, sem rede. Um
      catálogo de assuntos comuns (leitura, treino, plantão, artigos,
      religião…) que decide ícone, cor, rótulo do registro, campos, meta e se
      a aba é de agenda ou de marcar por dia.
   2. A do Claude (`pedirIA`), pelo servidor do Delfos (`POST /api/ia/aba`),
      que personaliza para o nome exato — só quando as contas estão ligadas
      e o servidor tem a chave da API. A chave nunca vem para o navegador.

   Tudo o que volta da IA é tratado como dado não confiável: `sanear` corta
   para os ícones, cores e tipos de campo que existem, e toda tela escapa o
   texto antes de desenhar.
   =========================================================================== */

const Abas = (() => {
  const { fmt, icone } = UI;
  const esc = fmt.escape;

  /* ---------------------------- Sugestão local ----------------------------- */

  const c = (id, rotulo, tipo, opcoes = [], naLista = false, obrigatorio = false) => ({ id, rotulo, tipo, opcoes, naLista, obrigatorio });
  const semMeta = { tipo: "nenhuma", campoId: "", alvo: 0, periodo: "mes" };
  const meta = (tipo, alvo, periodo, campoId = "") => ({ tipo, campoId, alvo, periodo });

  // Cada entrada: palavras-chave (sem acento, minúsculas) e o molde da aba.
  const CATALOGO = [
    { chaves: ["academia", "musculacao", "malhar", "gym", "hipertrofia"], tpl: {
      especial: "academia", icone: "svg:haltere", cor: "#6e8f22", rotuloItem: "treino", naAgenda: false, checkin: false,
      descricao: "Dias de treino, exercícios, cargas e recordes.", campos: [], agruparPor: "", meta: semMeta, exemplos: [] } },
    { chaves: ["corrida", "correr", "running", "maratona", "pedal", "bike", "ciclismo", "natacao", "nadar", "triatlo", "caminhada"], tpl: {
      icone: "svg:tenis", cor: "#0d95b5", rotuloItem: "treino", naAgenda: true, checkin: false,
      descricao: "Cada saída com distância, tempo e como foi.",
      campos: [c("distancia", "Distância (km)", "number", [], true, true), c("duracao", "Duração (min)", "number", [], true), c("intensidade", "Intensidade", "select", ["leve", "moderada", "forte", "prova"], true), c("sensacao", "Como foi", "textarea")],
      agruparPor: "intensidade", meta: meta("soma", 40, "mes", "distancia"), exemplos: ["Rodagem leve", "Treino intervalado", "Longão de domingo"] } },
    { chaves: ["futebol", "volei", "basquete", "esporte", "crossfit", "luta", "jiu", "muay", "boxe", "tenis", "funcional", "pilates", "yoga", "danca"], tpl: {
      icone: "svg:bola", cor: "#0d95b5", rotuloItem: "treino", naAgenda: true, checkin: false,
      descricao: "Treinos e jogos, com duração e como você se sentiu.",
      campos: [c("modalidade", "Modalidade", "text", [], true), c("duracao", "Duração (min)", "number", [], true), c("intensidade", "Intensidade", "select", ["leve", "moderada", "forte"], true), c("observacoes", "Observações", "textarea")],
      agruparPor: "intensidade", meta: meta("concluidos", 12, "mes"), exemplos: ["Treino de terça", "Jogo com a turma"] } },
    { chaves: ["leitura", "leituras", "livro", "livros", "ler", "biblioteca", "literatura"], tpl: {
      icone: "svg:livro", cor: "#5a4fd4", rotuloItem: "livro", naAgenda: false, checkin: false,
      descricao: "O que você quer ler, está lendo e já leu, com nota e comentário.",
      campos: [c("autor", "Autor", "text", [], true), c("situacao", "Situação", "select", ["quero ler", "lendo", "lido", "abandonado"], true, true), c("genero", "Gênero", "select", ["ficção", "não ficção", "técnico", "biografia", "poesia", "outro"]), c("paginas", "Páginas", "number"), c("nota", "Nota (0 a 10)", "number", [], true), c("comentario", "O que ficou", "textarea")],
      agruparPor: "situacao", meta: meta("concluidos", 12, "ano"), exemplos: ["Sapiens", "O Médico e o Monstro"] } },
    { chaves: ["filme", "filmes", "serie", "series", "cinema", "netflix", "anime", "documentario"], tpl: {
      icone: "svg:estrela", cor: "#d6398a", rotuloItem: "título", naAgenda: false, checkin: false,
      descricao: "Filmes e séries para ver, vendo e vistos.",
      campos: [c("tipo", "Tipo", "select", ["filme", "série", "documentário", "anime"], true), c("situacao", "Situação", "select", ["quero ver", "assistindo", "visto", "desisti"], true, true), c("plataforma", "Onde assistir", "text", [], true), c("nota", "Nota (0 a 10)", "number", [], true), c("comentario", "Comentário", "textarea")],
      agruparPor: "situacao", meta: semMeta, exemplos: [] } },
    { chaves: ["ingles", "espanhol", "frances", "alemao", "italiano", "idioma", "idiomas", "lingua", "duolingo"], tpl: {
      icone: "svg:globo", cor: "#1f7a8c", rotuloItem: "prática", naAgenda: false, checkin: true,
      descricao: "Prática de idioma marcada dia a dia, com o que foi treinado.",
      campos: [c("habilidade", "Habilidade", "select", ["leitura", "escuta", "fala", "escrita", "vocabulário", "gramática"], true), c("minutos", "Minutos por dia", "number", [], true), c("recurso", "Recurso", "text")],
      agruparPor: "habilidade", meta: meta("checkins", 5, "semana"), exemplos: ["Escuta com podcast", "Vocabulário no app"] } },
    { chaves: ["curso", "cursos", "certificacao", "certificado", "mooc", "bootcamp", "aula extra"], tpl: {
      icone: "svg:lapis", cor: "#1f7a8c", rotuloItem: "curso", naAgenda: false, checkin: false,
      descricao: "Cursos em andamento, horas estudadas e certificados.",
      campos: [c("plataforma", "Plataforma", "text", [], true), c("situacao", "Situação", "select", ["quero fazer", "fazendo", "concluído", "pausado"], true), c("horas", "Carga horária (h)", "number", [], true), c("certificado", "Tem certificado", "simNao"), c("link", "Link", "text")],
      agruparPor: "situacao", meta: meta("concluidos", 2, "ano"), exemplos: [] } },
    { chaves: ["igreja", "religiao", "fe", "oracao", "oracoes", "biblia", "culto", "missa", "espiritual", "espiritualidade", "terco", "devocional", "evangelho"], tpl: {
      icone: "svg:cruz", cor: "#5a4fd4", rotuloItem: "prática", naAgenda: false, checkin: true,
      descricao: "Práticas de fé marcadas dia a dia: oração, leitura, culto.",
      campos: [c("tipo", "Tipo", "select", ["oração", "leitura", "culto ou missa", "estudo", "serviço"], true), c("minutos", "Minutos", "number"), c("reflexao", "Reflexão", "textarea")],
      agruparPor: "tipo", meta: meta("checkins", 7, "semana"), exemplos: ["Oração da manhã", "Leitura do dia"] } },
    { chaves: ["habito", "habitos", "rotina", "meditacao", "meditar", "mindfulness", "manha", "disciplina", "agua", "hidratacao", "alongamento"], tpl: {
      icone: "svg:sol", cor: "#b57d0a", rotuloItem: "hábito", naAgenda: false, checkin: true,
      descricao: "Hábitos marcados a cada dia, com a sequência de cada um.",
      campos: [c("momento", "Momento do dia", "select", ["manhã", "tarde", "noite", "qualquer hora"], true), c("minutos", "Minutos", "number"), c("porque", "Por que importa", "textarea")],
      agruparPor: "momento", meta: meta("checkins", 20, "semana"), exemplos: ["Beber 2 L de água", "Meditar 10 minutos", "Dormir antes da meia-noite"] } },
    { chaves: ["saude", "consulta", "consultas", "exame", "exames", "medico", "medicos", "terapia", "psicologo", "dentista", "check up", "checkup"], tpl: {
      icone: "svg:estetoscopio", cor: "#0d95b5", rotuloItem: "consulta", naAgenda: true, checkin: false,
      descricao: "Consultas, exames e retornos, com local, profissional e resultado.",
      campos: [c("tipo", "Tipo", "select", ["consulta", "exame", "retorno", "vacina", "terapia"], true), c("especialidade", "Especialidade", "text", [], true), c("local", "Local", "text", [], true), c("profissional", "Profissional", "text"), c("valor", "Valor (R$)", "dinheiro"), c("resultado", "Resultado ou orientação", "textarea")],
      agruparPor: "tipo", meta: semMeta, exemplos: [] } },
    { chaves: ["remedio", "remedios", "medicamento", "medicamentos", "suplemento", "suplementos", "vitamina"], tpl: {
      icone: "svg:pilula", cor: "#0d95b5", rotuloItem: "medicamento", naAgenda: false, checkin: true,
      descricao: "O que tomar, em que dose, marcado a cada dia.",
      campos: [c("dose", "Dose", "text", [], true), c("horario", "Horário", "select", ["manhã", "almoço", "tarde", "noite", "antes de dormir"], true), c("ate", "Até quando", "date"), c("observacoes", "Observações", "textarea")],
      agruparPor: "horario", meta: semMeta, exemplos: [] } },
    { chaves: ["dieta", "alimentacao", "nutricao", "refeicao", "refeicoes", "comida", "marmita", "cardapio", "calorias"], tpl: {
      icone: "svg:prato", cor: "#6e8f22", rotuloItem: "refeição", naAgenda: true, checkin: false,
      descricao: "O que você comeu, em que refeição, e se foi como planejado.",
      campos: [c("refeicao", "Refeição", "select", ["café da manhã", "almoço", "lanche", "jantar", "ceia"], true, true), c("planejado", "Foi como planejado", "simNao", [], true), c("calorias", "Calorias (kcal)", "number"), c("observacoes", "Observações", "textarea")],
      agruparPor: "refeicao", meta: semMeta, exemplos: [] } },
    { chaves: ["sono", "dormir", "insonia"], tpl: {
      icone: "svg:lua", cor: "#5b6b7d", rotuloItem: "noite", naAgenda: true, checkin: false,
      descricao: "Cada noite com horas dormidas e qualidade.",
      campos: [c("horas", "Horas dormidas", "number", [], true, true), c("qualidade", "Qualidade", "select", ["ruim", "ok", "boa", "ótima"], true), c("deitou", "Hora que deitou", "text"), c("observacoes", "Observações", "textarea")],
      agruparPor: "qualidade", meta: semMeta, exemplos: [] } },
    { chaves: ["viagem", "viagens", "viajar", "ferias", "trip", "turismo"], tpl: {
      icone: "svg:aviao", cor: "#0d95b5", rotuloItem: "viagem", naAgenda: true, checkin: false,
      descricao: "Viagens da ideia à volta: destino, orçamento e reservas.",
      campos: [c("destino", "Destino", "text", [], true, true), c("situacao", "Situação", "select", ["ideia", "planejando", "reservado", "feita"], true), c("orcamento", "Orçamento (R$)", "dinheiro", [], true), c("hospedagem", "Hospedagem", "text"), c("transporte", "Transporte", "select", ["avião", "ônibus", "carro", "outro"]), c("notas", "Notas", "textarea")],
      agruparPor: "situacao", meta: semMeta, exemplos: [] } },
    { chaves: ["casa", "lar", "limpeza", "faxina", "domestica", "domesticas", "apartamento", "reforma"], tpl: {
      icone: "svg:casa", cor: "#b57d0a", rotuloItem: "tarefa", naAgenda: true, checkin: false,
      descricao: "Tarefas da casa, por cômodo e frequência.",
      campos: [c("comodo", "Cômodo", "select", ["cozinha", "quarto", "banheiro", "sala", "área de serviço", "casa toda"], true), c("frequencia", "Frequência", "select", ["uma vez", "semanal", "quinzenal", "mensal"], true), c("custo", "Custo (R$)", "dinheiro"), c("observacoes", "Observações", "textarea")],
      agruparPor: "comodo", meta: semMeta, exemplos: [] } },
    { chaves: ["compras", "compra", "mercado", "desejos", "wishlist", "lista de desejos", "quero comprar"], tpl: {
      icone: "svg:carrinho", cor: "#d6398a", rotuloItem: "item", naAgenda: false, checkin: false,
      descricao: "O que comprar, por quanto e com que prioridade.",
      campos: [c("preco", "Preço (R$)", "dinheiro", [], true), c("prioridade", "Prioridade", "select", ["baixa", "média", "alta"], true), c("loja", "Loja", "text"), c("link", "Link", "text")],
      agruparPor: "prioridade", meta: semMeta, exemplos: [] } },
    { chaves: ["pet", "pets", "cachorro", "cao", "gato", "gata", "veterinario", "animal"], tpl: {
      icone: "svg:pata", cor: "#b57d0a", rotuloItem: "cuidado", naAgenda: true, checkin: false,
      descricao: "Vacinas, banhos, consultas e gastos com os bichos.",
      campos: [c("tipo", "Tipo", "select", ["vacina", "vermífugo", "banho", "consulta", "remédio", "ração"], true), c("pet", "Qual pet", "text", [], true), c("valor", "Valor (R$)", "dinheiro", [], true), c("observacoes", "Observações", "textarea")],
      agruparPor: "tipo", meta: semMeta, exemplos: [] } },
    { chaves: ["carro", "moto", "veiculo", "revisao do carro", "combustivel", "gasolina"], tpl: {
      icone: "svg:carro", cor: "#5b6b7d", rotuloItem: "manutenção", naAgenda: true, checkin: false,
      descricao: "Revisões, trocas, impostos e gastos do veículo.",
      campos: [c("tipo", "Tipo", "select", ["revisão", "troca de óleo", "pneus", "abastecimento", "IPVA", "seguro", "outro"], true), c("valor", "Valor (R$)", "dinheiro", [], true), c("km", "Quilometragem", "number"), c("oficina", "Oficina ou posto", "text")],
      agruparPor: "tipo", meta: semMeta, exemplos: [] } },
    { chaves: ["plantao", "plantoes", "estagio", "internato", "ambulatorio", "hospital", "pratica clinica", "enfermaria", "pronto socorro", "emergencia"], tpl: {
      icone: "svg:estetoscopio", cor: "#1f7a8c", rotuloItem: "plantão", naAgenda: true, checkin: false,
      descricao: "Plantões e práticas com local, setor, horas e os casos que valeram.",
      campos: [c("local", "Local", "text", [], true, true), c("setor", "Setor", "select", ["enfermaria", "emergência", "UTI", "ambulatório", "centro cirúrgico", "outro"], true), c("horas", "Horas", "number", [], true), c("preceptor", "Preceptor", "text"), c("casos", "Casos e aprendizados", "textarea")],
      agruparPor: "setor", meta: meta("soma", 40, "mes", "horas"), exemplos: [] } },
    { chaves: ["artigo", "artigos", "paper", "papers", "pesquisa", "publicacao", "publicacoes", "leitura cientifica", "periodicos", "pubmed"], tpl: {
      icone: "svg:microscopio", cor: "#5a4fd4", rotuloItem: "artigo", naAgenda: false, checkin: false,
      descricao: "Artigos para ler e fichar, com periódico, ano e relevância.",
      campos: [c("autores", "Autores", "text"), c("periodico", "Periódico", "text", [], true), c("ano", "Ano", "number", [], true), c("situacao", "Situação", "select", ["para ler", "lendo", "lido", "fichado"], true, true), c("relevancia", "Relevância", "select", ["baixa", "média", "alta"]), c("doi", "DOI ou link", "text"), c("resumo", "Achados principais", "textarea")],
      agruparPor: "situacao", meta: meta("concluidos", 8, "mes"), exemplos: [] } },
    { chaves: ["residencia", "concurso", "concursos", "revalida", "prova de titulo", "enare", "usp", "unifesp"], tpl: {
      icone: "svg:alvo", cor: "#d6398a", rotuloItem: "prova", naAgenda: true, checkin: false,
      descricao: "Provas e processos seletivos: inscrição, fases, taxas e resultado.",
      campos: [c("instituicao", "Instituição", "text", [], true, true), c("fase", "Fase", "select", ["inscrição", "1ª fase", "2ª fase", "entrevista", "resultado"], true), c("taxa", "Taxa (R$)", "dinheiro"), c("especialidade", "Especialidade", "text", [], true), c("link", "Edital ou link", "text")],
      agruparPor: "fase", meta: semMeta, exemplos: [] } },
    { chaves: ["congresso", "congressos", "simposio", "jornada", "evento cientifico", "eventos academicos", "liga", "ligas"], tpl: {
      icone: "svg:grupo", cor: "#178f6c", rotuloItem: "evento", naAgenda: true, checkin: false,
      descricao: "Congressos e eventos: inscrição, trabalhos e horas de certificado.",
      campos: [c("local", "Local", "text", [], true), c("inscricao", "Inscrição (R$)", "dinheiro", [], true), c("trabalho", "Trabalho submetido", "simNao", [], true), c("horas", "Horas de certificado", "number"), c("observacoes", "Observações", "textarea")],
      agruparPor: "", meta: meta("soma", 40, "ano", "horas"), exemplos: [] } },
    { chaves: ["aniversario", "aniversarios", "festa", "festas", "social", "encontros", "amigos", "familia"], tpl: {
      icone: "svg:presente", cor: "#d6398a", rotuloItem: "evento", naAgenda: true, checkin: false,
      descricao: "Aniversários e encontros, com presente e local.",
      campos: [c("pessoa", "Pessoa", "text", [], true), c("presente", "Presente comprado", "simNao", [], true), c("local", "Local", "text"), c("ideia", "Ideia de presente", "text")],
      agruparPor: "", meta: semMeta, exemplos: [] } },
    { chaves: ["freela", "freelas", "trabalho", "clientes", "servicos", "bico", "bicos"], tpl: {
      icone: "svg:maleta", cor: "#6e8f22", rotuloItem: "trabalho", naAgenda: true, checkin: false,
      descricao: "Cada trabalho com cliente, valor e situação do pagamento.",
      campos: [c("cliente", "Cliente", "text", [], true, true), c("valor", "Valor (R$)", "dinheiro", [], true), c("pagamento", "Pagamento", "select", ["a combinar", "a receber", "recebido"], true), c("horas", "Horas", "number"), c("observacoes", "Observações", "textarea")],
      agruparPor: "pagamento", meta: meta("soma", 1000, "mes", "valor"), exemplos: [] } },
    { chaves: ["violao", "guitarra", "piano", "teclado", "musica", "instrumento", "canto", "bateria"], tpl: {
      icone: "svg:musica", cor: "#8e5bd0", rotuloItem: "prática", naAgenda: false, checkin: true,
      descricao: "Prática marcada a cada dia, com o que foi estudado.",
      campos: [c("foco", "Foco", "select", ["técnica", "repertório", "teoria", "improviso"], true), c("minutos", "Minutos", "number", [], true), c("musica", "Música ou exercício", "text")],
      agruparPor: "foco", meta: meta("checkins", 4, "semana"), exemplos: [] } },
    { chaves: ["jogos", "games", "videogame", "jogo"], tpl: {
      icone: "svg:controle", cor: "#8e5bd0", rotuloItem: "jogo", naAgenda: false, checkin: false,
      descricao: "Jogos na fila, jogando e zerados.",
      campos: [c("plataforma", "Plataforma", "text", [], true), c("situacao", "Situação", "select", ["quero jogar", "jogando", "zerado", "larguei"], true), c("horas", "Horas jogadas", "number"), c("nota", "Nota (0 a 10)", "number", [], true)],
      agruparPor: "situacao", meta: semMeta, exemplos: [] } },
    { chaves: ["receita", "receitas", "cozinhar", "culinaria", "cozinha"], tpl: {
      icone: "svg:cafe", cor: "#b57d0a", rotuloItem: "receita", naAgenda: false, checkin: false,
      descricao: "Receitas para testar e as que já deram certo.",
      campos: [c("tipo", "Tipo", "select", ["prato principal", "lanche", "sobremesa", "bebida", "marmita"], true), c("tempo", "Tempo (min)", "number", [], true), c("feita", "Já fiz", "simNao", [], true), c("fonte", "Fonte ou link", "text"), c("ingredientes", "Ingredientes", "textarea")],
      agruparPor: "tipo", meta: semMeta, exemplos: [] } },
    { chaves: ["planta", "plantas", "jardim", "horta", "jardinagem"], tpl: {
      icone: "svg:folha", cor: "#178f6c", rotuloItem: "planta", naAgenda: false, checkin: true,
      descricao: "Cada planta com rega marcada por dia e cuidados.",
      campos: [c("luz", "Luz", "select", ["sol pleno", "meia sombra", "sombra"], true), c("rega", "Rega", "select", ["diária", "2 vezes por semana", "semanal"], true), c("cuidados", "Cuidados", "textarea")],
      agruparPor: "rega", meta: semMeta, exemplos: [] } },
    { chaves: ["meta", "metas", "objetivo", "objetivos", "sonho", "sonhos", "planos", "resolucoes"], tpl: {
      icone: "svg:bandeira", cor: "#178f6c", rotuloItem: "meta", naAgenda: true, checkin: false,
      descricao: "Objetivos com prazo, área da vida e próximo passo.",
      campos: [c("area", "Área", "select", ["saúde", "carreira", "estudos", "finanças", "relações", "pessoal"], true), c("progresso", "Progresso (%)", "number", [], true), c("proximoPasso", "Próximo passo", "text", [], true), c("porque", "Por que importa", "textarea")],
      agruparPor: "area", meta: semMeta, exemplos: [] } },
    { chaves: ["diario", "gratidao", "journal", "journaling", "humor", "emocoes"], tpl: {
      icone: "svg:lapis", cor: "#8e5bd0", rotuloItem: "entrada", naAgenda: true, checkin: false,
      descricao: "Um registro por dia: como foi, o humor e pelo que agradecer.",
      campos: [c("humor", "Humor", "select", ["difícil", "neutro", "bom", "ótimo"], true), c("gratidao", "Pelo que agradeço", "textarea"), c("texto", "Como foi o dia", "textarea")],
      agruparPor: "humor", meta: meta("concluidos", 20, "mes"), exemplos: [] } },
    { chaves: ["contatos", "networking", "mentores", "pessoas"], tpl: {
      icone: "svg:grupo", cor: "#5b6b7d", rotuloItem: "contato", naAgenda: false, checkin: false,
      descricao: "Pessoas da sua rede, onde conheceu e quando falou pela última vez.",
      campos: [c("area", "Área", "text", [], true), c("onde", "Onde conheci", "text", [], true), c("ultimoContato", "Último contato", "date"), c("contato", "Telefone ou e-mail", "text"), c("notas", "Notas", "textarea")],
      agruparPor: "", meta: semMeta, exemplos: [] } },
    { chaves: ["desenho", "arte", "pintura", "fotografia", "foto", "escrita", "poesia"], tpl: {
      icone: "svg:pincel", cor: "#d6398a", rotuloItem: "obra", naAgenda: false, checkin: false,
      descricao: "Trabalhos em andamento e prontos, com técnica e tempo.",
      campos: [c("tecnica", "Técnica", "text", [], true), c("situacao", "Situação", "select", ["ideia", "fazendo", "pronta"], true), c("horas", "Horas", "number"), c("notas", "Notas", "textarea")],
      agruparPor: "situacao", meta: meta("concluidos", 4, "mes"), exemplos: [] } },
  ];

  const normalizar = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  /** "Leituras" → "leitura", "Plantões" → "plantão" — bom o bastante para o rótulo do registro. */
  function singular(nome) {
    const p = String(nome || "").trim().split(/\s+/)[0] || "";
    const t = p.toLowerCase();
    if (/oes$/.test(t)) return t.replace(/oes$/, "ão");
    if (/aes$/.test(t)) return t.replace(/aes$/, "ão");
    if (/ais$/.test(t)) return t.replace(/ais$/, "al");
    if (/ns$/.test(t)) return t.replace(/ns$/, "m");
    if (/[^s]s$/.test(t)) return t.slice(0, -1);
    return t || "item";
  }

  function corPorNome(nome) {
    const paleta = Store.PALETA_PILAR.map((x) => x.valor);
    let h = 0;
    for (const ch of String(nome)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return paleta[h % paleta.length];
  }

  /** Sugestão local para um nome: o assunto mais parecido no catálogo, ou um molde neutro. */
  function sugerirLocal(nome) {
    const n = ` ${normalizar(nome)} `;
    let melhor = null;
    let pontos = 0;
    CATALOGO.forEach((ent) => {
      const p = ent.chaves.reduce((s, k) => {
        if (n.includes(` ${k} `)) return s + 3 + k.length / 10;
        if (k.length >= 4 && n.includes(k)) return s + 1;
        return s;
      }, 0);
      if (p > pontos) { pontos = p; melhor = ent; }
    });
    if (melhor) {
      const tpl = JSON.parse(JSON.stringify(melhor.tpl));
      return { ...tpl, origem: "local" };
    }
    return {
      icone: "svg:estrela", cor: corPorNome(nome), rotuloItem: singular(nome), naAgenda: true, checkin: false,
      descricao: "", campos: [c("prioridade", "Prioridade", "select", ["baixa", "média", "alta"], true), c("observacoes", "Observações", "textarea")],
      agruparPor: "prioridade", meta: semMeta, exemplos: [], origem: "local", generica: true,
    };
  }

  /* ------------------------------- Saneamento ------------------------------- */

  const TIPOS = new Set(Store.TIPOS_CAMPO.map((t) => t.valor));
  const RESERVADOS = new Set(["descricao", "data", "concluido", "id", "extras", "feitos", "criadoEm", "concluidoEm"]);
  const corta = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

  function iconeValido(v) {
    if (typeof v !== "string") return false;
    if (v.startsWith("svg:")) return UI.ICONES_ABA.includes(v.slice(4));
    return Store.ICONES_PILAR.includes(v);
  }

  /** Corta o que veio (da IA ou do catálogo) para o que o painel sabe desenhar. */
  function sanear(s, nome) {
    const base = sugerirLocal(nome);
    const out = {};
    out.icone = iconeValido(s?.icone) ? s.icone : base.icone;
    const paleta = Store.PALETA_PILAR.map((x) => x.valor);
    out.cor = paleta.includes(s?.cor) ? s.cor : base.cor;
    out.descricao = corta(s?.descricao, 160);
    out.rotuloItem = corta(s?.rotuloItem, 30).toLowerCase() || base.rotuloItem;
    out.naAgenda = typeof s?.naAgenda === "boolean" ? s.naAgenda : base.naAgenda;
    out.checkin = typeof s?.checkin === "boolean" ? s.checkin : false;
    out.especial = s?.especial === "academia" ? "academia" : "";
    const ids = new Set();
    out.campos = (Array.isArray(s?.campos) ? s.campos : []).slice(0, 8).map((x) => {
      const tipo = TIPOS.has(x?.tipo) ? x.tipo : "text";
      let id = normalizar(x?.id || x?.rotulo).replace(/\s+(\w)/g, (_, l) => l.toUpperCase()).replace(/\s/g, "").slice(0, 24) || "campo";
      if (RESERVADOS.has(id)) id = `${id}2`;
      while (ids.has(id)) id = `${id}_`;
      ids.add(id);
      const opcoes = tipo === "select" ? [...new Set((Array.isArray(x?.opcoes) ? x.opcoes : []).map((o) => corta(o, 40)).filter(Boolean))].slice(0, 8) : [];
      return { id, rotulo: corta(x?.rotulo, 40) || id, tipo: tipo === "select" && opcoes.length < 2 ? "text" : tipo, opcoes, naLista: !!x?.naLista, obrigatorio: !!x?.obrigatorio };
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
    out.exemplos = (Array.isArray(s?.exemplos) ? s.exemplos : []).map((e) => corta(e, 80)).filter(Boolean).slice(0, 4);
    out.origem = s?.origem === "ia" ? "ia" : "local";
    return out;
  }

  /* ---------------------------------- IA ----------------------------------- */

  let iaServidor = null; // null = ainda não perguntado; true/false = resposta de /api/saude

  async function iaDisponivel() {
    if (typeof Sessao === "undefined" || !Sessao.ativo() || !Sessao.logado()) return false;
    if (iaServidor === null) {
      try { iaServidor = !!(await Sessao.saude()).ia; } catch { iaServidor = false; }
    }
    return iaServidor;
  }

  /** Pede ao Claude (pelo servidor) a configuração da aba. Devolve a sugestão já saneada. */
  async function pedirIA(nome, { existentes = [] } = {}) {
    const p = Store.estado().perfil || {};
    const contexto = [Personalizacao.ocupacaoResumo(), p.cidade].filter(Boolean).join(", ");
    const r = await Sessao.pedir("POST", "/api/ia/aba", {
      tipo: "application/json",
      corpo: { nome: corta(nome, 60), contexto: corta(contexto, 120), existentes: existentes.map((x) => corta(x, 40)).slice(0, 12) },
    });
    return sanear({ ...r.sugestao, origem: "ia" }, nome);
  }

  /* --------------------------- Criador e editor ---------------------------- */

  const NOME_TIPO = Object.fromEntries(Store.TIPOS_CAMPO.map((t) => [t.valor, t.rotulo]));
  const PERIODOS = [["semana", "por semana"], ["mes", "por mês"], ["ano", "por ano"]];

  /**
   * Criador (sem `pilar`) ou editor (com `pilar`) de uma aba. No editor os
   * campos que já existem não saem daqui (isso é em "Campos desta aba"); a
   * IA só propõe campos novos para acrescentar.
   */
  function abrir({ pilar = null } = {}) {
    const editando = !!pilar;
    const est = {
      nome: pilar?.nome || "",
      sug: editando ? sanear({ ...pilar, meta: pilar.meta || semMeta, especial: pilar.modelo === "academia" ? "academia" : "" }, pilar.nome) : sugerirLocal(""),
      escolhidos: new Set(),
      exemplos: new Set(),
      mexeu: false,
      pendenteIA: null,
      pedido: 0,
    };
    if (editando) {
      est.sug.icone = pilar.icone;
      est.sug.cor = pilar.cor;
      est.sug.origem = "atual";
    }
    const existentes = editando ? (pilar.campos || []) : [];
    let novosCampos = []; // no editor: campos sugeridos que ainda não existem

    const html = `
      <div class="modal-head">
        <h2 class="modal-title">${editando ? "Personalizar aba" : "Nova aba"}</h2>
        <p class="modal-desc">${editando
          ? "Aparência, o que cada registro é, meta e agrupamento. A IA pode sugerir campos que faltam."
          : "Diga o nome. O Delfos monta a aba para esse assunto: ícone, cor, campos, meta e o jeito de acompanhar. Tudo dá para mudar antes de criar."}</p>
      </div>
      <div class="modal-body criador">
        <div class="criador-col">
          <div class="field">
            <label for="cr-nome">Nome da aba</label>
            <input id="cr-nome" class="criador-nome" type="text" maxlength="40" autocomplete="off" placeholder="Ex.: Leituras, Plantões, Corrida, Igreja" value="${esc(est.nome)}" />
            <div class="criador-estado" data-estado></div>
          </div>
          <div class="field">
            <label>Ícone</label>
            <div class="icones-grade" data-icones></div>
          </div>
          <div class="field">
            <label>Cor</label>
            <div class="cores" data-cores></div>
          </div>
          <div class="field">
            <label for="cr-desc">Do que se trata <span class="muted">(opcional)</span></label>
            <input id="cr-desc" type="text" maxlength="160" />
          </div>
          <div class="assistente-linha">
            <div class="field">
              <label for="cr-rot">Cada registro é um(a)</label>
              <input id="cr-rot" type="text" maxlength="30" placeholder="livro, treino, plantão" />
            </div>
          </div>
          <label class="linha-switch"><span><b>Tem data e entra na agenda</b><span class="muted">Aparece nos próximos 30 dias da visão geral.</span></span><input type="checkbox" class="switch" id="cr-agenda" /></label>
          <label class="linha-switch"><span><b>Marcar por dia</b><span class="muted">Para hábitos: um toque por dia, com sequência.</span></span><input type="checkbox" class="switch" id="cr-checkin" /></label>
        </div>
        <div class="criador-col previa">
          <div class="previa-topo" data-previa-topo></div>
          <div class="field">
            <label data-titulo-campos>Campos</label>
            <ul class="abas-lista campos-sugeridos" data-campos></ul>
            <span class="hint" data-hint-campos></span>
          </div>
          <div class="field" data-bloco-meta>
            <label>Meta</label>
            <div class="meta-linha">
              <input type="checkbox" class="switch" id="cr-meta-on" aria-label="Usar meta" />
              <select class="input sm" id="cr-meta-tipo" aria-label="O que conta"></select>
              <input class="input sm" id="cr-meta-alvo" type="number" min="1" step="1" style="width:90px" aria-label="Quanto" />
              <select class="input sm" id="cr-meta-periodo" aria-label="Período">${PERIODOS.map(([v, r]) => `<option value="${v}">${r}</option>`).join("")}</select>
            </div>
          </div>
          <div class="field" data-bloco-agrupar>
            <label for="cr-agrupar">Agrupar a lista por</label>
            <select id="cr-agrupar"></select>
          </div>
          <div class="field" data-bloco-exemplos hidden>
            <label>Para começar <span class="muted">(opcional)</span></label>
            <div class="chips" data-exemplos></div>
          </div>
          <p class="hint" data-nota-academia hidden>Esta aba abre com a tela de treinos: dias, exercícios do catálogo, cargas e recordes.</p>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" data-acao="cancelar" type="button">Cancelar</button>
        <button class="btn primary" data-acao="criar" type="button">${editando ? "Salvar" : "Criar aba"}</button>
      </div>`;

    return new Promise((resolve) => UI.abrirModal(html, {
      classe: "xwide",
      aoFechar: resolve,
      aoMontar(modal, fechar) {
        const $ = (sel) => modal.querySelector(sel);
        const inpNome = $("#cr-nome");
        const estado = $("[data-estado]");

        const mostrarEstado = (texto, tipo = "") => {
          estado.className = `criador-estado ${tipo}`;
          estado.innerHTML = texto;
        };

        // Desenha tudo a partir de est.sug (o que o usuário mexer grava de volta em est.sug).
        function desenhar() {
          const s = est.sug;
          const iconesOferta = [...new Set([s.icone, ...UI.ICONES_ABA.map((n) => `svg:${n}`), ...Store.ICONES_PILAR.slice(0, 12)])];
          $("[data-icones]").innerHTML = iconesOferta.map((v) => `<button type="button" class="icone-opcao" data-icone="${esc(v)}" aria-pressed="${v === s.icone}" title="${esc(v.replace("svg:", ""))}">${UI.iconeAba(v)}</button>`).join("");
          $("[data-cores]").innerHTML = Store.PALETA_PILAR.map((cor) => `<button type="button" class="cor-opcao" data-cor="${esc(cor.valor)}" aria-pressed="${cor.valor === s.cor}" title="${esc(cor.rotulo)}" style="--c:${esc(cor.valor)}"></button>`).join("");
          $("#cr-desc").value = s.descricao || "";
          $("#cr-rot").value = s.rotuloItem || "";
          $("#cr-agenda").checked = !!s.naAgenda;
          $("#cr-checkin").checked = !!s.checkin;
          const academia = s.especial === "academia";
          $("[data-nota-academia]").hidden = !academia;
          ["[data-bloco-meta]", "[data-bloco-agrupar]"].forEach((q) => { $(q).hidden = academia; });
          $("#cr-agenda").closest(".linha-switch").hidden = academia;
          $("#cr-checkin").closest(".linha-switch").hidden = academia;

          // Prévia
          const nomeVisto = inpNome.value.trim() || "Sua aba";
          $("[data-previa-topo]").innerHTML = `
            <span class="previa-icone" style="--c:${esc(s.cor)}">${UI.iconeAba(s.icone)}</span>
            <span><span class="previa-nome">${esc(nomeVisto)}</span><span class="previa-desc">${esc(s.descricao || (s.checkin ? "Marcado a cada dia." : s.naAgenda ? "Com data, entra na agenda." : "Fora da agenda."))}</span></span>`;

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
            $("[data-hint-campos]").textContent = "Nome e data já vêm em todo registro. Desmarque o que não quiser.";
          }

          // Meta
          const camposMeta = editando ? [...existentes, ...novosCampos.filter((x) => est.escolhidos.has(x.id))] : s.campos.filter((x) => est.escolhidos.has(x.id));
          const numericos = camposMeta.filter((x) => x.tipo === "number" || x.tipo === "dinheiro");
          const opcoes = [["concluidos", `${pluralRot(rot)} concluídos`], ...(s.checkin ? [["checkins", "marcações"]] : []), ...numericos.map((x) => [`soma:${x.id}`, `soma de ${x.rotulo.toLowerCase()}`])];
          const atual = s.meta.tipo === "soma" ? `soma:${s.meta.campoId}` : s.meta.tipo;
          $("#cr-meta-tipo").innerHTML = opcoes.map(([v, r]) => `<option value="${esc(v)}" ${v === atual ? "selected" : ""}>${esc(r)}</option>`).join("");
          $("#cr-meta-on").checked = s.meta.tipo !== "nenhuma";
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
        }

        const pluralRot = (r) => Leituras.pluralizar(r);

        function linhaCampo(x, marcado, travado) {
          const detalhe = x.tipo === "select" ? `${NOME_TIPO[x.tipo]}: ${x.opcoes.join(", ")}` : NOME_TIPO[x.tipo] || x.tipo;
          return `
            <li class="${marcado ? "" : "desligada"}">
              <span class="grow" style="flex:1; min-width:0;">
                <span style="display:block; font-weight:550;">${esc(x.rotulo)}${travado ? ` <span class="badge" style="margin-left:6px;">atual</span>` : ""}</span>
                <span style="display:block; font-size:13px; color:var(--texto-3); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(detalhe)}</span>
              </span>
              ${travado ? "" : `<input type="checkbox" class="switch" data-campo="${esc(x.id)}" ${marcado ? "checked" : ""} aria-label="Incluir ${esc(x.rotulo)}" />`}
            </li>`;
        }

        // Aplica uma sugestão nova (local ou da IA).
        function aplicar(sug) {
          if (editando) {
            // No editor, a IA só acrescenta: campos com rótulo que ainda não existe.
            const ja = new Set(existentes.map((x) => normalizar(x.rotulo)));
            const idsJa = new Set(existentes.map((x) => x.id));
            novosCampos = sug.campos.filter((x) => !ja.has(normalizar(x.rotulo))).map((x) => ({ ...x, id: idsJa.has(x.id) ? `${x.id}2` : x.id }));
            est.escolhidos = new Set();
            if (est.sug.meta.tipo === "nenhuma" && sug.meta.tipo !== "nenhuma" && (sug.meta.tipo !== "soma")) est.sug.meta = sug.meta;
            desenhar();
            return;
          }
          est.sug = sug;
          est.escolhidos = new Set(sug.campos.map((x) => x.id));
          est.exemplos = new Set();
          desenhar();
        }

        // Grava de volta o que a pessoa mexeu no formulário.
        function ler() {
          const s = est.sug;
          s.descricao = $("#cr-desc").value.trim();
          s.rotuloItem = $("#cr-rot").value.trim().toLowerCase() || s.rotuloItem;
          s.naAgenda = $("#cr-agenda").checked;
          s.checkin = $("#cr-checkin").checked;
          const tipoSel = $("#cr-meta-tipo").value || "concluidos";
          s.meta = $("#cr-meta-on").checked
            ? { tipo: tipoSel.startsWith("soma:") ? "soma" : tipoSel, campoId: tipoSel.startsWith("soma:") ? tipoSel.slice(5) : "", alvo: Number($("#cr-meta-alvo").value) || 0, periodo: $("#cr-meta-periodo").value }
            : { ...semMeta };
          s.agruparPor = $("#cr-agrupar").value;
        }

        const marcarMexeu = () => { est.mexeu = true; };

        modal.addEventListener("click", (ev) => {
          const ic = ev.target.closest("[data-icone]");
          const cor = ev.target.closest("[data-cor]");
          const exm = ev.target.closest("[data-exemplo]");
          const usarIA = ev.target.closest("[data-usar-ia]");
          const refazer = ev.target.closest("[data-refazer-ia]");
          if (ic) { ler(); est.sug.icone = ic.dataset.icone; marcarMexeu(); desenhar(); }
          if (cor) { ler(); est.sug.cor = cor.dataset.cor; marcarMexeu(); desenhar(); }
          if (exm) { const i = Number(exm.dataset.exemplo); est.exemplos.has(i) ? est.exemplos.delete(i) : est.exemplos.add(i); exm.setAttribute("aria-pressed", String(est.exemplos.has(i))); }
          if (usarIA && est.pendenteIA) { aplicar(est.pendenteIA); est.pendenteIA = null; est.mexeu = false; mostrarEstado(`${icone("ia")} Sugerido pela IA para “${esc(inpNome.value.trim())}”.`, "ia"); }
          if (refazer) pedir(true);
        });
        modal.addEventListener("change", (ev) => {
          if (ev.target.matches("[data-campo]")) {
            const id = ev.target.dataset.campo;
            ev.target.checked ? est.escolhidos.add(id) : est.escolhidos.delete(id);
            ler(); marcarMexeu(); desenhar();
            return;
          }
          if (ev.target.matches("#cr-meta-on, #cr-checkin, #cr-agenda, #cr-meta-tipo")) {
            ler();
            if (ev.target.id === "cr-meta-on" && ev.target.checked && !est.sug.meta.alvo) est.sug.meta.alvo = 10;
            marcarMexeu(); desenhar();
            return;
          }
          if (ev.target !== inpNome) { ler(); marcarMexeu(); }
        });
        ["#cr-desc", "#cr-rot"].forEach((q) => $(q).addEventListener("input", () => { ler(); marcarMexeu(); const t = $("[data-previa-topo] .previa-desc"); if (q === "#cr-desc" && t) t.textContent = $("#cr-desc").value; }));

        // Pedido à IA, com debounce e descarte de respostas atrasadas.
        let espera;
        async function pedir(forcar = false) {
          const nome = inpNome.value.trim();
          if (nome.length < 3) return;
          if (!(await iaDisponivel())) {
            mostrarEstado(Sessao?.ativo?.()
              ? `Sugestão rápida do Delfos. A IA entra quando o servidor tiver a chave configurada.`
              : `Sugestão rápida do Delfos, feita neste aparelho. A IA fica disponível quando as contas estiverem ligadas.`, "local");
            return;
          }
          const n = ++est.pedido;
          mostrarEstado(`<span class="pontinhos"></span> Personalizando com IA para “${esc(nome)}”…`, "pensando");
          try {
            const sug = await pedirIA(nome, { existentes: existentes.map((x) => x.rotulo) });
            if (n !== est.pedido || inpNome.value.trim() !== nome) return;
            if (est.mexeu && !forcar) {
              est.pendenteIA = sug;
              mostrarEstado(`${icone("ia")} A IA tem uma sugestão para “${esc(nome)}”. <button type="button" class="btn ghost sm" data-usar-ia>Usar sugestão da IA</button>`, "ia");
            } else {
              aplicar(sug);
              est.mexeu = false;
              mostrarEstado(`${icone("ia")} Sugerido pela IA para “${esc(nome)}”. <button type="button" class="btn ghost sm" data-refazer-ia>Pedir outra</button>`, "ia");
            }
          } catch (err) {
            if (n !== est.pedido) return;
            mostrarEstado(`Sugestão rápida do Delfos. A IA não respondeu agora (${esc(err.message)}).`, "local");
          }
        }

        inpNome.addEventListener("input", () => {
          const nome = inpNome.value.trim();
          est.pedido++;
          if (!editando) {
            // Sugestão local na hora, a cada letra — a menos que a pessoa já tenha ajustado algo.
            if (!est.mexeu) aplicar(sugerirLocal(nome));
            else desenhar();
          } else desenhar();
          mostrarEstado(nome.length >= 3 ? "Sugestão rápida do Delfos." : "", "local");
          clearTimeout(espera);
          if (!editando) espera = setTimeout(() => pedir(false), 900);
        });

        $('[data-acao="cancelar"]').addEventListener("click", () => fechar(null));
        $('[data-acao="criar"]').addEventListener("click", () => {
          const nome = inpNome.value.trim();
          if (!nome) { inpNome.focus(); return; }
          ler();
          fechar(editando ? salvarEdicao(pilar, nome, est.sug, novosCampos.filter((x) => est.escolhidos.has(x.id))) : criar(nome, est.sug, est.escolhidos, est.exemplos));
        });

        if (editando) {
          novosCampos = [];
          desenhar();
          mostrarEstado(`<button type="button" class="btn sm" data-refazer-ia>${icone("ia")}Sugerir campos com IA</button>`, "");
          // No editor, "Sugerir" usa a IA se houver e, senão, o catálogo local.
          modal.addEventListener("click", async (ev) => {
            if (!ev.target.closest("[data-refazer-ia]") || await iaDisponivel()) return;
            aplicar(sugerirLocal(inpNome.value.trim()));
            mostrarEstado(novosCampos.length ? "Sugestão rápida do Delfos: marque o que quer acrescentar." : "Nenhum campo novo a sugerir para este assunto.", "local");
          });
        } else {
          aplicar(sugerirLocal(""));
          inpNome.focus();
        }
      },
    }));
  }

  /** Cria a aba a partir da sugestão escolhida e abre a página dela. */
  function criar(nome, s, escolhidos, exemplos) {
    const academia = s.especial === "academia";
    const campos = academia ? [] : s.campos.filter((x) => escolhidos.has(x.id));
    const agora = UI.hojeISO();
    const itens = academia ? [] : [...exemplos].map((i) => ({
      id: Store.uid("it"), descricao: s.exemplos[i], data: s.naAgenda ? agora : "", concluido: false, extras: {}, criadoEm: new Date().toISOString(), ...(s.checkin ? { feitos: [] } : {}),
    }));
    const novo = Store.inserir("pilares", {
      nome, icone: s.icone, cor: s.cor, descricao: s.descricao,
      modelo: academia ? "academia" : "personalizado",
      campos, naAgenda: academia ? false : s.naAgenda, checkin: academia ? false : s.checkin,
      rotuloItem: s.rotuloItem, agruparPor: campos.some((x) => x.id === s.agruparPor) ? s.agruparPor : "",
      meta: s.meta.tipo === "nenhuma" ? null : s.meta,
      sugeridoPor: s.origem,
      itens,
      ...(academia ? { academia: { configuradoEm: "", objetivo: "", experiencia: "", frequenciaSemanal: 0, divisao: "" }, dias: [] } : {}),
    });
    location.href = `pilar.html?id=${encodeURIComponent(novo.id)}`;
    return novo;
  }

  function salvarEdicao(pilar, nome, s, acrescentar) {
    const campos = [...(pilar.campos || []), ...acrescentar.map((x) => ({ ...x, id: x.id }))];
    const dados = {
      nome, icone: s.icone, cor: s.cor, descricao: s.descricao, rotuloItem: s.rotuloItem,
      naAgenda: pilar.modelo === "academia" ? pilar.naAgenda : s.naAgenda,
      checkin: pilar.modelo === "academia" ? false : s.checkin,
      campos,
      agruparPor: campos.some((x) => x.id === s.agruparPor && x.tipo === "select") ? s.agruparPor : "",
      meta: s.meta.tipo === "nenhuma" || !(s.meta.alvo > 0) ? null : s.meta,
    };
    Store.atualizar("pilares", pilar.id, dados);
    return dados;
  }

  return { sugerirLocal, sanear, pedirIA, iaDisponivel, abrir, CATALOGO, singular };
})();
