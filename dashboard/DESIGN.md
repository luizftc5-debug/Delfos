# Delfos 2.4 alpha

O essencial se revela. A interface deve ajudar a pessoa a reconhecer onde está,
encontrar o próximo passo e voltar ao trabalho sem atravessar configurações.
A identidade está no símbolo, no logotipo e no sistema visual "Dia em comum" (abaixo).

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
A retração preserva os espaçamentos verticais dos ícones para evitar saltos nos atalhos.
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

## Identidade visual — "Dia em comum" (3.0)

O dia é onde as áreas da vida se encontram: uma prova muda a semana, uma consulta ocupa um
horário, uma refeição se repete. A interface é um instrumento de uso diário, preciso e
legível, sem camada de decoração entre a pessoa e o plano. Antes de criar uma tela, confira
os tokens no topo de `theme.css`; componentes não inventam cor, raio, sombra, tamanho nem tempo.

**A única ousadia: a costura do dia.** Na agenda (`home.js`, `linhaAgenda`; CSS em
`.agenda-linha`, `.agenda-no`, `.costura`), uma linha vertical atravessa os compromissos e
cada um é um ponto na cor da área. Horário à esquerda em números tabulares; data só na
primeira linha do dia; o que tem hora vem antes do que não tem; sem hora, o ponto fica vazio.
A linha não mede duração nem desenha horário livre. Ela não se repete em outros lugares do
painel; a entrada pública a mostra porque é o produto.

| Token | Valor | Papel |
|---|---|---|
| `--fundo` | claro `#f5f7f9` (porcelana fria) · escuro `#17212b` (tinta azul) | plano contínuo, sem textura |
| `--texto` | `#17212b` · `#f5f7f9` | conteúdo e títulos (15,2:1) |
| `--texto-2` / `--texto-3` | `#526170`/`#5f6d7b` · `#a5b4c2`/`#8d9dac` | contexto; nunca abaixo de 4,5:1 |
| `--linha-controle` | `#7f8d9b` · `#7b8e9e` | borda de campo que precisa ser vista (≥ 3:1) |
| `--acento` | `#22589c` (azul mineral) · `#9cc4f5` | ação principal, seleção, foco; rótulo na cor do fundo |
| `--st-critical` | `#9c3446` (vinho) · `#e8899a` | erro e atraso, sempre com texto |

- **Tipografia:** uma família, Source Sans 3 (OFL, custo zero), pesos 400/600/700. A "voz"
  (`--font-voz`) é a mesma família em `--peso-voz` (600). Escala `--fs-1..7`: 13, 16, 20, 25,
  31, 39, 49. Texto corrido até `--medida` (68ch). Números que se comparam usam `tabular-nums`.
  `--escala-fonte` base 1,0667 compensa o olho menor da fonte (regras escritas na base 15).
- **Espaço:** grade de 4 (`--e-1..8`: 4, 8, 12, 16, 24, 32, 48, 64).
- **Raio:** 4 miúdo, 8 controle, 12 superfície, 16 janela; pílula só para escolha.
- **Elevação:** nenhuma em listas e seções. Uma sombra só (`--shadow-pop`), na janela
  sobreposta. Seção é título + fio + espaço, nunca caixa (`.pagina-bloco`).
- **Toque:** 44 × 44 px (`--toque`) em `pointer: coarse`; no mouse, os controles compactos
  mantêm o desenho. Foco visível sempre no acento (`--foco`).
- **Cor de área** (`--s-*`) é dado: ponto da costura, ícone da área. Nunca acento de UI.
  As cores das abas próprias e as fontes dos resumos são conteúdo do usuário.
- **Tema:** sem escolha gravada, segue o sistema; o claro é a apresentação principal.
- **Marca:** símbolo D com coluna e `UI.logotipo()`; usar os vetores existentes.

### Lista negra no Delfos

Proibido salvo justificativa escrita aqui:

- Fundo quase preto com um acento único; creme/bege com serifa de alto contraste.
- Vidro desfocado (`backdrop-filter`), gradiente de fundo, brilho, luz que segue o ponteiro.
- A mesma sombra embaixo de tudo; card em volta de seção; caixa dentro de caixa.
- Etiqueta em caixa alta espaçada acima do título; palavra do título em outra cor ou itálico.
- "01 / 02 / 03" quando não é sequência real; setas ↗ → no fim de botões ou links.
- Metadados colados com " · " na interface (use vírgula ou outra linha).
- Fade/slide ao rolar, hover que levanta card, animação que não responde a uma ação.
- Slogan no lugar de informação ("Seu dia, com clareza."). O título diz onde a pessoa está.
- Botão que não diz o que acontece ("Salvar" quando substitui; "Enviar").
- Oferecer um caminho que não funciona naquele estado (ex.: criar conta sem servidor).

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
