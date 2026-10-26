/* Modelos específicos, locais e editáveis. Escolher um modelo não chama IA
   nem cria registros de exemplo automaticamente. */
const ModelosAbas = (() => {
  const CATEGORIAS = [
    { id: "esportes", nome: "Esportes" },
    { id: "estudos", nome: "Estudos" },
    { id: "saude", nome: "Saúde e bem-estar" },
    { id: "vida", nome: "Vida pessoal" },
    { id: "trabalho", nome: "Trabalho e profissões" },
  ];
  const campo = (id, rotulo, tipo = "text", opcoes = [], naLista = false) => ({
    id, rotulo, tipo, opcoes, naLista, obrigatorio: false,
  });
  const texto = (id, rotulo, naLista = false) => campo(id, rotulo, "text", [], naLista);
  const numero = (id, rotulo, naLista = false) => campo(id, rotulo, "number", [], naLista);
  const dinheiro = (id, rotulo, naLista = false) => campo(id, rotulo, "dinheiro", [], naLista);
  const opcoes = (id, rotulo, valores, naLista = true) => campo(id, rotulo, "select", valores, naLista);
  const notas = (id = "observacoes", rotulo = "Observações") => campo(id, rotulo, "textarea");
  const hora = (id, rotulo, naLista = false) => campo(id, rotulo, "time", [], naLista);
  const link = (id, rotulo) => campo(id, rotulo, "link");
  const simNao = (id, rotulo, naLista = false) => campo(id, rotulo, "simNao", [], naLista);
  const modelo = (id, nome, categoria, icone, descricao, rotuloItem, campos, configuracao = {}) => ({
    id, nome, categoria, icone: `svg:${icone}`, descricao, rotuloItem, campos,
    cor: { esportes: "#0d95b5", estudos: "#5a4fd4", saude: "#178f6c", vida: "#b57d0a", trabalho: "#5b6b7d" }[categoria],
    proposito: descricao,
    naAgenda: true, checkin: false, agruparPor: "", visual: { vista: "lista", ordem: "auto" },
    meta: { tipo: "nenhuma", campoId: "", alvo: 0, periodo: "mes" }, exemplos: [], origem: "manual",
    ...configuracao,
  });
  const MODELOS = [
    modelo("corrida", "Corrida", "esportes", "tenis", "Rodagens, treinos intervalados e provas com distância e tempo.", "treino", [
      numero("distanciaKm", "Distância (km)", true), numero("duracaoMin", "Duração (min)", true),
      opcoes("tipoTreino", "Tipo de treino", ["Rodagem", "Intervalado", "Longão", "Prova", "Recuperação"]),
      texto("percurso", "Percurso"), notas("sensacao", "Como foi o treino"),
    ], { agruparPor: "tipoTreino", visual: { vista: "tabela", ordem: "data" }, busca: ["running", "maratona", "correr", "5 km", "10 km"] }),
    modelo("jiu-jitsu", "Jiu-jitsu", "esportes", "alvo", "Técnicas, posições e aprendizados de cada treino no tatame.", "treino", [
      opcoes("modalidade", "Modalidade", ["Com kimono", "Sem kimono"]),
      opcoes("foco", "Foco", ["Guarda", "Passagem", "Quedas", "Defesa", "Finalizações", "Competição"]),
      numero("duracaoMin", "Duração (min)", true), numero("rounds", "Rounds"),
      notas("tecnicas", "Técnicas praticadas"), notas("aprendizados", "O que melhorar"),
    ], { agruparPor: "foco", busca: ["jiu jitsu", "jiujitsu", "bjj", "grappling", "tatame"] }),
    modelo("lutas", "Boxe e Muay Thai", "esportes", "alvo", "Treinos de luta com fundamentos, rounds e evolução técnica.", "treino", [
      opcoes("modalidade", "Modalidade", ["Boxe", "Muay Thai", "Kickboxing", "MMA", "Outra"]),
      opcoes("tipoTreino", "Tipo de treino", ["Técnica", "Saco", "Manopla", "Sparring", "Condicionamento"]),
      numero("duracaoMin", "Duração (min)", true), numero("rounds", "Rounds"),
      texto("fundamentos", "Fundamentos trabalhados"), notas("feedback", "Feedback do treino"),
    ], { agruparPor: "modalidade", busca: ["luta", "lutas", "artes marciais", "kickboxing", "mma"] }),
    modelo("ciclismo", "Ciclismo", "esportes", "bandeira", "Pedais, percursos e provas com distância, duração e elevação.", "pedal", [
      numero("distanciaKm", "Distância (km)", true), numero("duracaoMin", "Duração (min)", true),
      numero("elevacaoMetros", "Elevação (m)"), opcoes("tipoPedal", "Tipo de pedal", ["Estrada", "MTB", "Urbano", "Rolo", "Prova"]),
      texto("percurso", "Percurso"), notas(),
    ], { agruparPor: "tipoPedal", visual: { vista: "tabela", ordem: "data" }, busca: ["pedal", "bike", "bicicleta", "mtb"] }),
    modelo("natacao", "Natação", "esportes", "gota", "Sessões de piscina com metragem, estilo e séries realizadas.", "sessão", [
      numero("distanciaMetros", "Distância (m)", true), numero("duracaoMin", "Duração (min)", true),
      opcoes("estilo", "Estilo", ["Livre", "Costas", "Peito", "Borboleta", "Medley"]),
      texto("piscina", "Piscina"), notas("series", "Séries realizadas"), notas("sensacao", "Como foi"),
    ], { agruparPor: "estilo", visual: { vista: "tabela", ordem: "data" }, busca: ["nadar", "piscina", "swimming"] }),
    modelo("futebol", "Futebol", "esportes", "bola", "Treinos, partidas e campeonatos com equipe, local e resultado.", "partida", [
      opcoes("tipo", "Tipo", ["Treino", "Amistoso", "Campeonato", "Pelada"]), texto("equipe", "Equipe", true),
      texto("adversario", "Adversário"), texto("local", "Local", true), numero("duracaoMin", "Duração (min)"),
      texto("resultado", "Resultado"), notas(),
    ], { agruparPor: "tipo", visual: { vista: "calendario", ordem: "data" }, busca: ["futsal", "pelada", "jogo", "society"] }),
    modelo("tcc", "TCC", "estudos", "livro", "Do tema à defesa: etapas, orientações e entregas do trabalho.", "etapa", [
      opcoes("etapa", "Etapa do TCC", ["Tema", "Projeto", "Coleta", "Análise", "Redação", "Revisão", "Defesa"]),
      texto("orientador", "Orientador(a)", true), opcoes("prioridade", "Prioridade", ["Baixa", "Média", "Alta"]),
      link("documento", "Documento ou capítulo"), numero("horasPrevistas", "Horas previstas"), notas("pendencias", "Próximos passos"),
    ], { agruparPor: "etapa", visual: { vista: "quadro", ordem: "data" }, busca: ["monografia", "trabalho de conclusao", "dissertacao", "defesa"] }),
    modelo("pesquisa-cientifica", "Pesquisa científica", "estudos", "microscopio", "Revisão bibliográfica, coleta, análise e submissão da pesquisa.", "atividade", [
      opcoes("etapa", "Etapa", ["Planejamento", "Revisão bibliográfica", "Coleta", "Análise", "Escrita", "Submissão"]),
      opcoes("tipo", "Atividade", ["Artigo", "Revisão", "Experimento", "Coleta", "Reunião"]),
      link("fonte", "Link do artigo ou DOI"), texto("equipe", "Equipe ou laboratório", true),
      texto("protocolo", "Protocolo ou referência"), notas("proximoPasso", "Próximo passo"),
    ], { agruparPor: "etapa", visual: { vista: "quadro", ordem: "data" }, busca: ["iniciacao cientifica", "ic", "artigo", "laboratorio", "mestrado", "doutorado"] }),
    modelo("concursos", "Concursos e vestibulares", "estudos", "alvo", "Estudos por disciplina, questões, revisões e simulados.", "estudo", [
      texto("disciplina", "Disciplina", true), opcoes("frente", "Frente de estudo", ["Teoria", "Questões", "Revisão", "Simulado", "Prova"]),
      numero("duracaoMin", "Duração (min)", true), numero("questoes", "Questões feitas"), numero("acertos", "Acertos"), link("material", "Material de estudo"),
    ], { agruparPor: "frente", visual: { vista: "tabela", ordem: "data" }, busca: ["concurso", "enem", "vestibular", "residencia", "oab"] }),
    modelo("idiomas", "Idiomas", "estudos", "globo", "Prática de conversação, escuta, leitura, escrita e vocabulário.", "sessão", [
      texto("idioma", "Idioma", true), opcoes("habilidade", "Habilidade", ["Conversação", "Escuta", "Leitura", "Escrita", "Vocabulário"]),
      numero("duracaoMin", "Duração (min)", true), link("recurso", "Recurso ou aula"), notas("aprendizado", "O que aprendi"),
    ], { agruparPor: "habilidade", busca: ["ingles", "espanhol", "frances", "alemao", "duolingo", "conversacao"] }),
    modelo("cursos", "Cursos e certificações", "estudos", "livro", "Cursos em andamento, carga horária e certificados para guardar.", "curso", [
      texto("instituicao", "Instituição", true), opcoes("andamento", "Andamento", ["Interesse", "Inscrito", "Em andamento", "Concluído"]),
      numero("cargaHoraria", "Carga horária (h)", true), link("plataforma", "Plataforma do curso"),
      link("certificado", "Certificado"), notas("aprendizados", "Aprendizados"),
    ], { agruparPor: "andamento", visual: { vista: "cartoes", ordem: "data" }, busca: ["curso", "certificado", "certificacao", "capacitacao", "extensao"] }),
    modelo("saude-cuidados", "Saúde e cuidados", "saude", "coracao", "Consultas, exames e retornos com preparo, horário e documentos.", "cuidado", [
      opcoes("tipo", "Tipo de cuidado", ["Consulta", "Exame", "Retorno", "Vacina", "Terapia"]),
      texto("profissional", "Profissional", true), texto("local", "Local", true), hora("horario", "Horário"),
      notas("preparo", "Preparo ou orientação recebida"), link("documento", "Pedido ou resultado"),
    ], { agruparPor: "tipo", visual: { vista: "calendario", ordem: "data" }, busca: ["saude", "consulta", "exames", "terapia", "vacinas", "dentista"] }),
    modelo("alimentacao", "Alimentação e refeições", "saude", "prato", "Cardápio e preparo das refeições, com ingredientes e receitas.", "refeição", [
      opcoes("refeicao", "Refeição", ["Café da manhã", "Almoço", "Lanche", "Jantar", "Ceia"]),
      opcoes("preparo", "Preparo", ["Planejar", "Comprar ingredientes", "Preparar", "Pronto"]),
      notas("ingredientes", "Ingredientes"), numero("porcoes", "Porções"), link("receita", "Receita"), notas(),
    ], { agruparPor: "preparo", visual: { vista: "quadro", ordem: "data" }, busca: ["cardapio", "marmita", "refeicoes", "receitas", "cozinhar", "nutricao"] }),
    modelo("sono", "Sono e descanso", "saude", "lua", "Registro de noites, horários e fatores que influenciam o descanso.", "noite", [
      hora("deitar", "Hora de deitar", true), hora("acordar", "Hora de acordar", true), numero("horasDormidas", "Horas dormidas", true),
      opcoes("qualidade", "Qualidade", ["Ruim", "Regular", "Boa", "Ótima"], false),
      texto("fatores", "Fatores da noite"), notas(),
    ], { naAgenda: false, agruparPor: "qualidade", visual: { vista: "tabela", ordem: "recentes" }, busca: ["dormir", "descanso", "insonia", "rotina de sono"] }),
    modelo("habitos", "Hábitos e rotina", "saude", "repetir", "Hábitos para marcar a cada dia, com momento e motivação.", "hábito", [
      opcoes("momento", "Momento do dia", ["Manhã", "Tarde", "Noite", "Qualquer horário"]),
      texto("frequencia", "Frequência desejada", true), numero("duracaoMin", "Duração (min)"), notas("motivacao", "Por que importa"),
    ], { naAgenda: false, checkin: true, agruparPor: "momento", busca: ["habito", "rotina", "checkin", "disciplina pessoal", "consistencia"] }),
    modelo("religiao", "Religião e espiritualidade", "vida", "sol", "Encontros, estudos, práticas e reflexões da sua tradição.", "prática", [
      opcoes("tipo", "Prática", ["Encontro", "Oração", "Meditação", "Estudo", "Voluntariado", "Outra"]),
      texto("tradicao", "Tradição ou comunidade"), texto("local", "Local", true), hora("horario", "Horário", true),
      texto("leitura", "Leitura ou referência"), notas("reflexao", "Reflexão pessoal"),
    ], { agruparPor: "tipo", busca: ["religiao", "espiritualidade", "fe", "igreja", "missa", "culto", "templo", "terreiro", "comunidade"] }),
    modelo("familia", "Compromissos familiares", "vida", "grupo", "Escola, encontros e cuidados da família com responsáveis definidos.", "compromisso", [
      texto("pessoa", "Pessoa da família", true), opcoes("tipo", "Tipo", ["Escola", "Saúde", "Encontro", "Viagem", "Aniversário", "Outro"]),
      hora("horario", "Horário", true), texto("local", "Local"), texto("responsavel", "Responsável"), notas("pendencias", "O que preparar"),
    ], { agruparPor: "tipo", visual: { vista: "calendario", ordem: "data" }, busca: ["familia", "familiares", "filhos", "pais", "escola", "aniversario"] }),
    modelo("casa", "Casa e manutenção", "vida", "casa", "Tarefas e reparos da casa por cômodo, situação e responsável.", "tarefa", [
      opcoes("comodo", "Cômodo", ["Casa toda", "Cozinha", "Quarto", "Banheiro", "Sala", "Área externa"]),
      opcoes("situacao", "Situação", ["Planejar", "A fazer", "Em andamento", "Concluído"]),
      texto("responsavel", "Responsável", true), dinheiro("custo", "Custo (R$)"), texto("contato", "Contato do serviço"), notas("instrucoes", "O que precisa ser feito"),
    ], { agruparPor: "situacao", visual: { vista: "quadro", ordem: "data" }, busca: ["lar", "limpeza", "faxina", "reparo", "reforma", "domestico"] }),
    modelo("pets", "Cuidados com pets", "vida", "pata", "Consultas, vacinas, passeios e outros cuidados com seus animais.", "cuidado", [
      texto("pet", "Pet", true), opcoes("tipo", "Cuidado", ["Consulta", "Vacina", "Banho", "Alimentação", "Passeio", "Outro"]),
      hora("horario", "Horário", true), texto("prestador", "Veterinário ou prestador"), dinheiro("custo", "Custo (R$)"), notas("orientacoes", "Orientações recebidas"),
    ], { agruparPor: "tipo", visual: { vista: "calendario", ordem: "data" }, busca: ["pet", "cachorro", "gato", "veterinario", "animais"] }),
    modelo("viagens", "Viagens", "vida", "aviao", "Reservas, passeios e documentos da viagem em um só roteiro.", "atividade", [
      texto("destino", "Destino", true), opcoes("tipo", "Tipo", ["Transporte", "Hospedagem", "Passeio", "Documento", "Reserva"]),
      opcoes("situacao", "Situação", ["Planejar", "Reservar", "Confirmado", "Feito"]), hora("horario", "Horário"),
      dinheiro("custo", "Custo (R$)"), link("referencia", "Reserva ou referência"), notas(),
    ], { agruparPor: "situacao", visual: { vista: "calendario", ordem: "data" }, busca: ["viagem", "ferias", "roteiro", "turismo", "reserva", "intercambio"] }),
    modelo("engenharia", "Engenharia", "trabalho", "maleta", "Projetos, obras, vistorias e entregas com responsáveis e documentos.", "entrega", [
      texto("projeto", "Projeto ou obra", true), opcoes("etapa", "Etapa", ["Levantamento", "Projeto", "Orçamento", "Execução", "Vistoria", "Entrega"]),
      texto("responsavel", "Responsável", true), texto("cliente", "Cliente"), link("documento", "Planta ou documento"),
      dinheiro("valor", "Valor (R$)"), notas("pendencias", "Pendências técnicas"),
    ], { agruparPor: "etapa", visual: { vista: "quadro", ordem: "data" }, busca: ["engenheiro", "engenheira", "obra", "civil", "eletrica", "mecanica", "vistoria"] }),
    modelo("advocacia", "Advocacia", "trabalho", "maleta", "Demandas, audiências e prazos por cliente e etapa do trabalho.", "demanda", [
      texto("cliente", "Cliente", true), texto("processo", "Número do processo"),
      opcoes("etapa", "Etapa", ["Triagem", "Em análise", "Em elaboração", "Protocolado", "Aguardando", "Encerrado"]),
      opcoes("tipo", "Tipo", ["Prazo", "Audiência", "Reunião", "Petição", "Consulta"], false),
      hora("horario", "Horário", true), dinheiro("honorarios", "Honorários (R$)"), link("linkProcesso", "Link do processo"),
    ], { agruparPor: "etapa", visual: { vista: "quadro", ordem: "data" }, busca: ["advogado", "advogada", "direito", "juridico", "audiencia", "processo"] }),
    modelo("taxi", "Táxi", "trabalho", "carro", "Turnos do táxi com corridas, faturamento e custos registrados.", "turno", [
      numero("horasTrabalhadas", "Horas trabalhadas", true), numero("corridas", "Corridas", true), dinheiro("receita", "Receita (R$)", true),
      dinheiro("combustivel", "Combustível (R$)"), dinheiro("outrosCustos", "Outros custos (R$)"), numero("kmRodados", "Quilômetros rodados"), notas(),
    ], { naAgenda: false, visual: { vista: "tabela", ordem: "recentes" }, busca: ["taxista", "taxi", "motorista de taxi", "ponto de taxi"] }),
    modelo("motorista-app", "Motorista de aplicativo", "trabalho", "carro", "Turnos em aplicativos com plataforma, ganhos e quilômetros rodados.", "turno", [
      opcoes("plataforma", "Plataforma", ["Uber", "99", "inDrive", "Outra"]), numero("horasOnline", "Horas online", true),
      numero("corridas", "Corridas"), dinheiro("ganhos", "Ganhos (R$)", true), dinheiro("combustivel", "Combustível (R$)"),
      numero("kmRodados", "Quilômetros rodados"), dinheiro("pedagios", "Pedágios (R$)"),
    ], { naAgenda: false, agruparPor: "plataforma", visual: { vista: "tabela", ordem: "recentes" }, busca: ["uber", "99", "indrive", "motorista", "aplicativo", "transporte"] }),
    modelo("medicina", "Medicina e plantões", "trabalho", "estetoscopio", "Plantões e atendimentos profissionais com escala e recebimentos.", "plantão", [
      texto("unidade", "Unidade ou instituição", true), opcoes("tipo", "Atividade", ["Plantão", "Ambulatório", "Visita", "Reunião", "Curso"]),
      hora("inicio", "Início", true), hora("fim", "Fim"), numero("cargaHoraria", "Carga horária (h)"),
      dinheiro("valor", "Valor (R$)"), simNao("recebido", "Recebido"),
    ], { agruparPor: "tipo", visual: { vista: "calendario", ordem: "data" }, busca: ["medico", "medica", "medicina", "plantao", "plantoes", "consultorio"] }),
    modelo("autonomo", "Trabalho autônomo", "trabalho", "maleta", "Serviços, orçamentos e pagamentos de clientes do seu trabalho.", "serviço", [
      texto("cliente", "Cliente", true), opcoes("situacao", "Situação", ["Orçamento", "Aprovado", "Em execução", "Entregue", "Pago"]),
      dinheiro("valor", "Valor (R$)", true), simNao("recebido", "Recebido"), texto("contato", "Contato"), notas("escopo", "Escopo do serviço"),
    ], { agruparPor: "situacao", visual: { vista: "quadro", ordem: "data" }, busca: ["autonomo", "autonoma", "freelancer", "freela", "mei", "prestador", "servicos"] }),
    modelo("marketing", "Marketing digital", "trabalho", "globo", "Campanhas por canal, da produção à análise de resultados.", "campanha", [
      opcoes("canal", "Canal", ["Instagram", "TikTok", "Google", "YouTube", "Email", "LinkedIn", "Outro"]),
      opcoes("etapa", "Etapa", ["Planejar", "Produzir", "Revisar", "Agendar", "Publicado", "Analisar"]),
      texto("objetivo", "Objetivo", true), dinheiro("orcamento", "Orçamento (R$)"), numero("alcance", "Alcance"),
      numero("conversoes", "Conversões"), link("campanha", "Link da campanha"),
    ], { agruparPor: "etapa", visual: { vista: "quadro", ordem: "data" }, busca: ["marketing digital", "trafego pago", "social media", "anuncios", "campanhas", "ads"] }),
    modelo("vendas-online", "Vendas online", "trabalho", "carrinho", "Pedidos por canal, do pagamento à entrega ao cliente.", "pedido", [
      opcoes("canal", "Canal", ["Loja própria", "Mercado Livre", "Shopee", "Amazon", "Instagram", "Outro"]),
      texto("cliente", "Cliente", true), opcoes("situacao", "Situação", ["Recebido", "Pago", "Separando", "Enviado", "Entregue", "Cancelado"]),
      dinheiro("valor", "Valor (R$)", true), dinheiro("frete", "Frete (R$)"), texto("rastreio", "Código de rastreio"), texto("produto", "Produto"),
    ], { agruparPor: "situacao", visual: { vista: "quadro", ordem: "data" }, busca: ["ecommerce", "e commerce", "loja virtual", "marketplace", "shopee", "vendas", "pedidos"] }),
    modelo("conteudo", "Criação de conteúdo", "trabalho", "camera", "Ideias, roteiros e publicações do seu calendário editorial.", "publicação", [
      opcoes("canal", "Canal", ["Instagram", "TikTok", "YouTube", "Blog", "Podcast", "Outro"]),
      opcoes("formato", "Formato", ["Vídeo", "Imagem", "Carrossel", "Texto", "Áudio"], false),
      opcoes("etapa", "Etapa", ["Ideia", "Roteiro", "Produção", "Revisão", "Agendado", "Publicado"]),
      notas("roteiro", "Roteiro ou pauta"), link("arquivo", "Arquivo ou publicação"), texto("resultado", "Resultado"),
    ], { agruparPor: "etapa", visual: { vista: "calendario", ordem: "data" }, busca: ["creator", "criador", "influenciador", "youtube", "podcast", "conteudo", "editorial"] }),
    modelo("aulas-particulares", "Aulas particulares", "trabalho", "livro", "Aulas por aluno, com conteúdo, horário e pagamento.", "aula", [
      texto("aluno", "Aluno(a)", true), texto("materia", "Matéria", true), hora("horario", "Horário", true),
      numero("duracaoMin", "Duração (min)"), notas("conteudo", "Conteúdo da aula"), dinheiro("valor", "Valor (R$)"), simNao("pago", "Pago"),
    ], { visual: { vista: "calendario", ordem: "data" }, busca: ["professor", "professora", "aula particular", "reforco", "tutoria", "alunos"] }),
  ];
  const normalizar = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const copiar = x => JSON.parse(JSON.stringify(x));
  function buscar(consulta = "", categoria = "") {
    const palavras = normalizar(consulta).split(" ").filter(Boolean);
    return MODELOS.filter(m => (!categoria || m.categoria === categoria) && palavras.every(p => normalizar([m.nome,m.descricao,CATEGORIAS.find(c=>c.id===m.categoria).nome,...(m.busca || [])].join(" ")).includes(p))).map(copiar);
  }
  return {
    categorias: () => copiar(CATEGORIAS),
    listar: () => copiar(MODELOS),
    obter: id => { const m=MODELOS.find(x=>x.id===id);return m ? copiar(m) : null; },
    buscar,
  };
})();
if (typeof module !== "undefined") module.exports = ModelosAbas;
