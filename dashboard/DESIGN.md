# Delfos 2.4 alpha

O essencial se revela. A interface deve ajudar a pessoa a reconhecer onde está,
encontrar o próximo passo e voltar ao trabalho sem atravessar configurações.
A identidade continua no símbolo, no logotipo, na serifa e nos neutros quentes.

## Organização da informação

O primeiro passo do criador reúne uma aba livre, seis modelos essenciais e 30
modelos específicos. Busca e filtro de categoria precedem os grupos recolhidos;
a busca abre os grupos que contêm resultados. A seleção atual permanece indicada
mesmo quando o filtro muda. Setas e Home/End percorrem apenas as escolhas visíveis.

`modelos-abas.js` é um catálogo local com estruturas explícitas para cada tema.
O criador aplica essa estrutura diretamente, preservando-a quando o nome muda.
Cada chamada retorna uma cópia, e a aba registra seu `modeloOrigem` para referência.
Os modelos passam pelo mesmo saneamento do criador, com até oito campos e vistas
compatíveis com agenda e marcação por dia. Não há metas numéricas predefinidas
nem registros adicionados sem escolha; a geração por IA continua opcional.

A navegação tem dois níveis com funções distintas:

- A barra lateral escolhe uma área da vida: Pessoal, Faculdade, Trabalho ou uma aba própria.
- As seções da página escolhem uma tarefa: estudar, registrar, consultar resultados ou ajustar.

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

Nas abas próprias, busca e visualização permanecem à mão. Ordenação e exibição de concluídos
ficam em Filtros e ordem. A escolha entre lista, cartões, quadro, tabela e calendário usa um
seletor, sem cinco botões competindo com o título.

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

## Identidade visual

- Símbolo: D com coluna; usar os vetores existentes, sem redesenhar a marca.
- Tipografia de marca: Gloock/Georgia nos nomes de página e momentos de orientação.
- Dados, campos, botões e títulos internos: Funnel Sans/system-ui.
- Paleta: preto `#0b0b0b`, carvão `#1f1f1f`, grafite `#3a3a3a`, marfim `#ede9e1`, cinza quente
  `#d6d1c7`. O tema claro usa superfícies quentes com texto escuro.
- A prévia no criador usa marfim para separar o exemplo da área de configuração.
- Cor identifica uma área ou comunica dados e estados. Não usar decoração colorida em cada caixa.
- Ícones de navegação são monocromáticos, sem fundos ou medalhões. Sempre acompanhados de texto.

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
