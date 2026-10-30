# Delfos 2.4 alpha

O essencial se revela. A interface deve ajudar a pessoa a reconhecer onde está,
encontrar o próximo passo e voltar ao trabalho sem atravessar configurações.
A identidade continua no símbolo, no logotipo, na serifa e nos neutros quentes.

## Organização da informação

O primeiro passo do criador reúne uma aba livre, seis modelos essenciais e 32
modelos específicos. Busca e filtro de categoria precedem os grupos recolhidos;
a busca abre os grupos que contêm resultados. A seleção atual permanece indicada
mesmo quando o filtro muda. Setas e Home/End percorrem apenas as escolhas visíveis.

`modelos-abas.js` é um catálogo local com estruturas explícitas para cada tema.
O criador aplica essa estrutura diretamente, preservando-a quando o nome muda.
Cada chamada retorna uma cópia, e a aba registra seu `modeloOrigem` para referência.
Os modelos passam pelo mesmo saneamento do criador, com até oito campos e vistas
compatíveis com agenda e marcação por dia. Não há metas numéricas predefinidas
nem registros adicionados sem escolha; a geração por IA continua opcional.
Estudos e Planejamento semanal são pontos de partida gerais; Saúde e cuidados e
Casa e manutenção reaproveitam as estruturas existentes. Abas criadas anteriormente
não são migradas quando o catálogo muda.

A navegação tem dois níveis com funções distintas:

- A barra lateral escolhe uma área da vida: Pessoal, Faculdade, Trabalho ou uma aba própria.
- As seções da página escolhem uma tarefa: estudar, registrar, consultar resultados ou ajustar.

No computador, a barra lateral ocupa a altura da janela. Marca e perfil ficam fora
da região rolável: só a lista de abas e suas ações rolam quando falta espaço.
O perfil permanece no canto inferior esquerdo, inclusive com muitas abas, fonte
maior e páginas longas. Atualizar o layout preserva a posição da lista.

A entrada pública fica em `inicio.html`, também acessível pela raiz do site;
`index.html` do dashboard continua sendo o painel pessoal. A apresentação usa
os desenhos existentes da marca e as mesmas fontes e cores, com acessos claros
para entrar e criar conta. Quem já usa dados locais mantém uma alternativa de
acesso enquanto as contas remotas não estiverem configuradas.

A entrada com Google usa o botão oficial de identidade, separado das permissões
de Agenda e Drive. A disponibilidade vem do servidor; uma interface sem servidor
informa isso e não simula autenticação. Vincular um e-mail que já tem conta exige
a senha atual do Delfos, conservando o identificador e os dados dessa conta.

No computador, o controle ao lado da marca recolhe a barra para uma faixa de
ícones das abas ativas. O símbolo D substitui o logotipo completo e o perfil
mostra apenas a foto ou as iniciais. Nomes acessíveis e dicas de cada ícone
continuam disponíveis; expandir devolve nomes, contadores e ações da barra.
A faixa recolhida não mostra seta: aproximar o mouse revela a barra, que fica
aberta até a seta de recolher ser acionada. Depois disso, o mouse precisa sair
e se aproximar de novo para abri-la. O foco por teclado também revela a navegação.
A aproximação não grava preferências; a escolha de recolher acompanha o backup.
A largura, os ícones e a identificação do perfil acompanham a transição da barra;
o nome da marca e o D se alternam suavemente. O conteúdo ocupa o espaço liberado
durante o movimento. Modo leve e redução de movimento mantêm a resposta imediata.
No celular, a marca e a navegação inferior mantêm a composição existente,
independentemente dessa escolha.

Cada página abre na tarefa principal. Apenas uma seção aparece por vez. Registros,
gráficos, perguntas e configurações não devem disputar a mesma sequência vertical.
Os painéis ficam no DOM para preservar filtros e componentes enquanto a pessoa navega.

| Página | Primeira seção | Outras tarefas |
|---|---|---|
| Visão geral | Meu dia: agenda e avisos | Minhas abas; Dinheiro |
| Pessoal | Calendário | Compromissos; Visão geral |
| Faculdade | Disciplinas | Prazos e agenda; Desempenho; Conexões |
| Disciplina | Resumos | Avaliações; Prazos; Materiais; Plano e aulas |
| Projetos | Projetos | Oportunidades; Resultados |
| Projeto | Etapas | Financeiro; Anotações; Documentos; Detalhes |
| Financeiro | Movimentações | A pagar; Planejamento; Análises; Conexões e ajustes |
| Contas e cartões | Contas | Cartões; Balanço |
| Conta/cartão | Movimentações | Saldo e análise |
| Investimentos | Carteira | Distribuição |
| Aba própria | Registros | Visão geral; Ajustes |
| Academia | Treinos | Evolução; Ajustes |

A ordem segue frequência de uso, proximidade entre conteúdo e controle e revelação
progressiva de opções. Os rótulos descrevem tarefas reconhecíveis, sem exigir que a pessoa
saiba como o código ou o modelo de dados estão organizados.

## Resumos nas abas

O mesmo editor pode ser usado em qualquer aba. Resumos aparece por padrão nas
disciplinas, na Faculdade, em Projetos e em modelos de estudo e trabalho. Nas
abas próprias, a recomendação usa o modelo e os campos de assunto, matéria ou
contexto; renomear uma aba não muda seu comportamento. Escola e cursinho podem
usar a estrutura de Estudos ou Concursos e vestibulares. As demais abas oferecem
Adicionar editor de resumos no cabeçalho ou em Ajustes. Ocultar a seção preserva
todos os textos e permite reativá-la depois.

Disciplinas mantêm sua coleção original. Abas próprias, projetos, contas e cartões
guardam os resumos no próprio registro; abas fixas usam cadernos com identidade
estável. O editor volta para o contexto de origem, conserva o salvamento automático
e mantém textos, imagens e preferências da folha no backup e na sincronização.
Excluir uma aba ou registro que contém resumos informa que seus textos também
serão apagados.

## Composição

O tamanho de texto é um fator de tipografia (`--escala-fonte`), aplicado nas
declarações de fonte do dashboard. Não usar `zoom`, transformações ou medidas de
layout para essa preferência. Densidade deixou de ser um controle da interface;
valores antigos em backups não alteram o layout.

O plano de ensino é opcional no cadastro. A leitura de PDF/DOCX/PPTX roda localmente;
DOCX e PPTX extraem apenas XML de texto em worker, com limites de tamanho e tempo.
A revisão separa assuntos, aulas, avaliações e entregas e conserva o trecho de origem.
Só a confirmação grava anexos e agenda. Aulas recorrentes exigem um período explícito;
faltas de informação ficam para revisão. As importações não executam conteúdo do documento.
Uma gravação do Store reúne todos os registros, com identidade de origem para recuperar
falhas e preservar edições ao reimportar. Os anexos usam o sistema existente de backup e nuvem.

O cabeçalho identifica a página. A ação global aparece ali quando serve em todas as seções.
Ações específicas pertencem ao conteúdo: criar resumo na seção Resumos, avaliação em
Avaliações, cartão em Cartões e recebimento no financeiro de um projeto.

Cada bloco tem título à esquerda, resumo abaixo e ações à direita. Não há puxador de gaveta
na navegação principal. Listas usam linhas e espaçamento; cartões são reservados a objetos
que abrem um contexto próprio, como disciplinas e projetos. Evitar caixas dentro de caixas.

Indicadores são uma faixa de consulta, sem quatro cartões decorativos iguais. Eles ficam
nas seções de desempenho, resultados e resumo, sem empurrar o trabalho principal para baixo.
A visão financeira mantém a faixa do mês junto das movimentações, onde os valores ajudam
a interpretar o extrato. A agenda do dia pode usar uma coluna secundária de avisos no desktop.

Nas abas próprias, Registros, Visão geral e Ajustes permanecem no topo. Os registros
usam uma composição aberta: ação de criar junto do título da tarefa, busca e exibição
em uma faixa e filtros secundários recolhidos. Uma coleção vazia apresenta um único
convite de criação; uma busca sem resultados mantém os controles e oferece limpar filtros.

A composição depende do esquema da aba, nunca de seu nome. Hábitos com período do dia
ficam em grupos verticais, com marcação de hoje sempre visível; histórico fica em Visão
geral e na apresentação detalhada. Leituras mostram primeiro os livros em andamento,
sem inventar porcentagens a partir da quantidade total de páginas. Trabalho reúne
prioridade, contexto e prazo; um quadro escolhido continua sendo quadro. Agrupamentos
personalizados e valores desconhecidos continuam visíveis. Abas de outros esquemas
usam o renderizador geral. Compacta e Detalhada conservam os valores salvos lista/cartoes;
quadro, tabela e calendário permanecem disponíveis onde compatíveis.

Visão geral concentra indicadores e histórico; Ajustes separa Conteúdo e Apresentação,
com exclusão no final. Abrir uma aba não altera seus campos, registros ou preferências.

## Criação de abas

O criador tem três etapas e apenas um assunto visível por vez:

1. Escolher: modelos com ícone, nome e uma linha explicando o uso; Aba livre é uma opção clara.
2. Dar nome: nome e escolha explícita entre composição manual e IA local. O propósito é obrigatório para gerar.
3. Revisar: prévia da estrutura antes de gravar. Campos, vista, agenda, metas e aparência são
   ajustes opcionais, em grupos fechados. Campos próprios podem ser acrescentados nesta etapa.

A prévia mostra a estrutura, sem fingir que há registros reais. Exemplos só viram dados após
seleção explícita. Ações de voltar, continuar e criar permanecem no rodapé da janela; apenas
seu corpo rola. A etapa atual fica visível. Personalizar uma aba usa as etapas de identidade
e revisão, preservando registros e campos existentes.

Uma interpretação nova do propósito não apaga escolhas manuais: a pessoa decide se aplica
a sugestão. Falha de armazenamento mantém o formulário disponível e permite tentar novamente
com o mesmo identificador, sem criar cópias da aba.

O criador explica primeiro a intenção: “Conte o que você precisa. O Delfos prepara uma
página para a sua rotina.” Conte se refere à escrita, sem captação de voz. O primeiro
preparo e download são informados antes de gerar; Como funciona contém os requisitos e
detalhes técnicos. Falhas mostram a próxima ação e conservam a alternativa manual.

## Identidade visual

- Símbolo: D com coluna; usar os vetores existentes, sem redesenhar a marca.
- Marca completa: `UI.logotipo()` compõe o símbolo D como inicial e os vetores de elfos,
  sem outro D ao lado. Entrada e boas-vindas usam a mesma composição estática.
- Versão: linha discreta no alto à direita da região principal, fora do link da marca,
  no fluxo da página para não cobrir ações, inclusive no celular.
- Tipografia de marca: Gloock/Georgia nos nomes de página e momentos de orientação.
- Dados, campos, botões e títulos internos: Funnel Sans/system-ui.
- Paleta: preto `#0b0b0b`, carvão `#1f1f1f`, grafite `#3a3a3a`, marfim `#ede9e1`, cinza quente
  `#d6d1c7`. O tema claro usa superfícies quentes com texto escuro.
- A prévia no criador usa marfim para separar o exemplo da área de configuração.
- Cor identifica uma área ou comunica dados e estados. Não usar decoração colorida em cada caixa.
- Ícones de navegação são monocromáticos, sem fundos ou medalhões. Sempre acompanhados de texto.
- Rolagem: controles nativos com os neutros do contêiner, trilho discreto e polegar
  arredondado. O sistema pode ocultar as barras; não substituir a rolagem por JavaScript.

## Movimento

As respostas à ação usam os tempos e curvas existentes: entrada do painel selecionado,
indicador único de seção, confirmação da marcação diária e atualização de filtros.
Novos efeitos usam opacidade e transformação; busca responde sem animação a cada tecla.
Efeitos anteriores são cancelados em trocas rápidas. Gravação e foco não dependem da
animação. `UI.animar` aplica a mesma política de redução do sistema, perfil e modo leve;
nessas condições o resultado aparece imediatamente. Não há efeitos contínuos novos.

## Acessibilidade e adaptação

- Abas com `tablist`, `tab` e `tabpanel`, relações por IDs únicos, seleção anunciada e foco visível.
- Setas esquerda/direita, Home e End mudam as seções; Voltar/Avançar do navegador funcionam.
- Links anteriores, como `#metas` e `#lista`, abrem a seção que contém o destino.
- Painéis ocultos usam `hidden`: seus controles saem da navegação por teclado e da árvore acessível.
- Modelos usam grupo de escolha única, com nome e descrição acessíveis, navegável com setas.
- Nome vazio recebe erro próximo ao campo, com `aria-invalid`, mensagem e retorno do foco.
- Janelas mantêm o foco dentro delas, Escape fecha e o foco volta ao controle de origem.
- No celular, seções podem rolar horizontalmente dentro da navegação; o documento não deve vazar.
  Os blocos passam para uma coluna. O criador mantém o rodapé visível em 320 px de largura.
- Respeitar redução de movimento e modo leve. Movimento não transmite informação essencial.

## Implementação e verificação

`theme.css` mantém os componentes base. `paginas.css` define a composição das páginas e
`paginas.js` controla as seções. `criador.css` e `abas.js` chegam sob demanda ao abrir o criador.
Não há framework novo nem API de inferência. O modelo aberto roda em um worker WebGPU, carregado sob demanda.

O teste `test/organizacao.browser.py` percorre páginas e seções nos temas claro e escuro,
em desktop, tablet e celular. Verifica links antigos, teclado, visualizações dos registros,
sete modelos, campos próprios, edição sem perda de registros e repetição após falha de gravação.
O teste separado do editor cobre salvamento automático, símbolos, conflitos e recuperação.

O editor mantém o cabeçalho e a formatação compactos. No celular, as ferramentas
rolam em sua própria faixa; abrir a busca não empilha os grupos. O rodapé com a
marca e a assinatura fica fixo em uma faixa discreta, com espaço reservado abaixo
do documento e respeito à área segura do aparelho. O título é centralizado.
O rodapé reserva 44 px no computador e 46 px no celular, com a frase
“Seu editor sem distrações” ao lado da marca.

A impressão e o PDF usam apenas o resumo em papel branco, com título principal
maior e centralizado, sem cabeçalhos, rodapés ou metadados do navegador. Margens
internas se repetem em cada página. A exportação para Word segue a mesma hierarquia;
texto, tabelas, imagens e formatação do conteúdo permanecem disponíveis.

## Configurações e IA local

Configurações usa sete categorias por assunto, navegação lateral no desktop e seletor no celular.
O cabeçalho e o rodapé permanecem visíveis, só o conteúdo rola. Indicadores de uso ficam recolhidos.
Aparência separa tema e cor dos controles de leitura e desempenho. As preferências mantêm o
salvamento automático, com retorno de estado verdadeiro em caso de falha de armazenamento.

A criação manual não interpreta a digitação nem aciona o modelo. A pessoa edita, ordena e remove
elementos na revisão; controles dependentes aparecem apenas quando necessários. No modo IA, o
download e os requisitos aparecem antes da ação de gerar. Nunca chamar regras prontas de geração
neural. A proposta é validada como dados antes de entrar na prévia; criação exige confirmação.

`ia-local.js` gerencia cancelamento e ciclo de vida; `ia-local.worker.js` executa o modelo fora da
thread da interface; `ia-local.modelo.mjs` define e valida o contrato. O bundle está versionado em
`vendor/webllm` e é reproduzível pelo lockfile em `tools/ia-local`. Os testes de CI usam runtime
simulado para inferência, exercitando o worker real e o contrato, sem baixar os pesos. Executar o
modelo real requer validação adicional em aparelho com WebGPU e pesos disponíveis.
