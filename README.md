# Delfos

Painel para acompanhar quatro frentes ao mesmo tempo — **Financeiro**, **Faculdade**, **Projetos** e
**Pessoal** — com alerta automático quando prazos de áreas diferentes caem na mesma semana. Além
dessas quatro, você pode criar **abas suas**, com nome, ícone e cor próprios.

Aplicação estática: HTML, CSS e JavaScript puros, sem instalação. Com o [back end](backend/README.md)
publicado (gratuito, na Cloudflare), o painel passa a exigir **conta** — cada pessoa entra com e-mail
e senha, vê só os próprios dados e os encontra iguais no celular e no computador, com anexos e
versões anteriores guardados no servidor.

### Atualizações de leitura e faculdade

- **Tamanho das letras**: Menor, Normal e Maior ajustam as fontes, sem zoom na
  interface. A opção de densidade foi removida, inclusive seu efeito em preferências antigas.
- **Plano de ensino da matéria**: anexe PDF, Word (.docx) ou PowerPoint (.pptx),
  revise assuntos, horários, provas e entregas encontrados e inclua na agenda geral.
  O processamento acontece no aparelho; os documentos acompanham o backup e a sincronização da conta.

### Novidades da versão 2.4 alpha
- **Configurações por assunto**: perfil, abas, visão geral, aparência, leitura,
  rotina e conta. As ações ficam visíveis e as preferências são salvas automaticamente.
- **Criação manual ou com IA local**: escolha os elementos ou use “Deixar Delfos criar”.
  O modelo roda no navegador, com revisão antes de criar e sem API de inferência.
- **Páginas organizadas por tarefa**: o conteúdo principal abre primeiro. Análises e ajustes
  ficam em seções próprias, com navegação por teclado e links diretos preservados.
- **Criação em três etapas**: escolher um modelo, dar nome e revisar. Os campos, a agenda,
  as metas e a aparência são ajustes opcionais, abertos na revisão quando necessários.
- **Campos próprios antes de criar**: além das sugestões, você pode adicionar os campos que
  precisa. A revisão mostra uma prévia da estrutura; exemplos só entram se forem selecionados.
- **Abas pessoais** separam Registros, Visão geral e Ajustes. Na Academia, Treinos e Evolução.
  Busca, visualização e filtros têm posições fixas, com filtros extras recolhidos.
- **Ações junto do conteúdo**: criar resumo na seção Resumos, avaliação em Avaliações,
  cartão em Cartões e etapa em Etapas.
- O criador mantém as ações visíveis enquanto seu conteúdo rola. Repetir uma gravação que
  falhou não cria abas duplicadas.

### Recursos da versão 2.3

- **Agenda com filtros** (visão geral): uma faixa com os sete dias da semana, cada um com quantos
  compromissos tem. Toque num dia para ver só ele; use as setas para trocar de semana, **Hoje** para
  voltar, e o seletor para ver os próximos 7 dias, os próximos 30 ou a semana exibida.
- **+ Compromisso** abre o formulário ali mesmo: você escolhe em qual aba guardar (Pessoal, Faculdade
  ou uma aba sua), a data já vem do dia que você escolheu, e há horário.
- **Organizar abas**: na barra lateral, no "Mais" do celular e em "Suas abas". Permite mudar a ordem e
  **ocultar** qualquer aba, inclusive as que você criou. Ocultar não apaga nada, e os compromissos
  continuam na agenda. No celular, as quatro primeiras abas ficam sempre no mesmo lugar.
- **Nova aba** oferece pontos de partida (Trabalho, Saúde, Academia, Esporte, Religião, Leituras ou
  uma aba livre). Trabalho é uma rotina profissional, separada de Projetos.
- **O editor de resumos salva sozinho** enquanto você escreve (não há botão Salvar), mostra "Salvo"
  no centro, tem um seletor de símbolos (grau, setas, matemática, letras gregas) e, se chegar uma
  alteração de outro aparelho, oferece guardar a sua versão como cópia.
- **Se o navegador não conseguir salvar** (espaço cheio ou bloqueado), um aviso fica na tela com
  "Tentar salvar" e "Exportar backup". O backup nunca sai sem os anexos sem avisar.
- Links só abrem se forem http, https ou e-mail. O servidor recusa um estado que não seja JSON
  válido e limita o tamanho do que lê.

Testes de persistência e backup:

```bash
node --test dashboard/test/*.test.cjs
cd backend && npm test
```

Regressões do editor em navegador, incluindo recarga, recuperação de falha, símbolos e
responsividade (também executadas pelo workflow Interface):

```bash
python -m pip install -r dashboard/test/requirements.txt
python -m playwright install chromium
python dashboard/test/editor.browser.py
python dashboard/test/organizacao.browser.py
python dashboard/test/configuracoes_ia.browser.py
python dashboard/test/faculdade_documentos.browser.py
python dashboard/test/modelos_abas.browser.py
```

## Como abrir

**Online (recomendado):** <https://luizftc5-debug.github.io/Delfos/dashboard>

**No seu computador**, pela pasta `dashboard`:

```bash
python -m http.server 8000
```

E acesse <http://localhost:8000>.

> Para usar o login do Google, abra por HTTP ou HTTPS. A IA local exige HTTPS ou localhost,
> além de um navegador compatível com WebGPU; ela não funciona por `file://`.

## Na primeira vez que você abrir

Um assistente pergunta quem você é, o que faz e quais das quatro abas fixas (Pessoal, Financeiro,
Faculdade, Projetos) fazem sentido pra você — dá pra desligar ou renomear qualquer uma, e religar
depois pelo perfil. Ele também sugere umas abas prontas para já começar com algo — Academia,
Religião, Esporte —, com nome editável na hora (por exemplo, trocar "Esporte" por "Corrida" ou
"Jiu-jitsu"). Dá pra pular e preencher tudo depois. Nada disso mexe em dados que já existam no
navegador.

## Como usar

Não é preciso editar nenhum arquivo. Tudo se cadastra pelos botões das telas:

| Onde | O que dá para fazer |
|---|---|
| **Visão geral** | Em Meu dia, agenda e avisos; em Minhas abas, os espaços da sua vida; em Dinheiro, o resumo financeiro. **+ Registrar** abre o formulário adequado |
| **Financeiro** | O mês lido em voz alta: quanto entrou, saiu e sobrou, **para onde foi o dinheiro**, o **ritmo do mês** comparado ao anterior, gastos fixos e assinaturas detectados, o que falta pagar, metas com "Guardar", e **perguntas** que deixam a leitura do seu jeito (limite do mês, quanto guardar, dia da renda). Também lançar entradas e saídas e **importar o extrato do banco** (PDF, .ofx ou .csv) para não esquecer de lançar |
| **Contas e cartões** | Cadastrar contas com saldo, cadastrar cartões com fechamento e vencimento. Cada uma abre numa **página própria**, com saldo/fatura, gastos por categoria só dela e a lista de lançamentos |
| **Investimentos** | Renda fixa, ações, fundos, cripto — o que já aplicou e quanto vale hoje, com rentabilidade calculada e distribuição por tipo |
| **Faculdade** | Leitura do semestre, **próximas quatro semanas** lado a lado, médias por disciplina com a média mínima marcada, avisos (prova sem resumo, semana cheia) e perguntas (média para passar, horas de estudo). Disciplinas, prazos e entregas. Cada disciplina abre em **página própria**, com avaliações e notas, prazos, materiais e resumos — em materiais e resumos dá para **anexar documentos** (PDF, slides, fotos) ou **importar do Google Drive** |
| **Projetos** | Leitura do mês, **recebido × estimado** por projeto, **quanto cada um paga por hora**, últimos seis meses, meta mensal. Só iniciativas pessoais que geram renda. Cada projeto abre em **página própria**, com ficha completa, etapas, recebimentos, custos, documentos e anotações |
| **Pessoal** | Consultas, tarefas e recados que não são financeiro, faculdade nem projeto — ex.: consulta médica, levar o carro à revisão. Linha do tempo (atrasados, hoje, esta semana…), filtro por tipo e aviso quando cai no mesmo dia de uma prova |
| **Suas abas** | Abas que você mesmo cria: escreva o nome e o propósito, e o Delfos, a IA do painel (roda no seu computador, sem internet), monta a página: campos, meta, vista, agenda ou marcação por dia. Ex.: Plantões, Leituras, Corrida, Oração. Cada uma ganha leitura, números, resumo dos campos, meta do período e, para hábitos, marcação diária com sequência |

> Trabalhos da faculdade e o TCC ficam em **Faculdade**, não em Projetos.

### Como as páginas se organizam (2.4 alpha)

Cada página tem um nome, uma navegação por tarefa e o conteúdo da seção selecionada.
A barra lateral escolhe a área da vida; a navegação interna escolhe o que fazer nela.

| Página | Seções |
|---|---|
| Visão geral | Meu dia, Minhas abas, Dinheiro |
| Pessoal | Calendário, Compromissos, Visão geral |
| Faculdade | Disciplinas, Prazos e agenda, Desempenho, Conexões |
| Disciplina | Resumos, Avaliações, Prazos, Materiais, Plano e aulas |
| Projetos | Projetos, Oportunidades, Resultados |
| Projeto | Etapas, Financeiro, Anotações, Documentos, Detalhes |
| Financeiro | Movimentações, A pagar, Planejamento, Análises, Conexões e ajustes |
| Contas e cartões | Contas, Cartões, Balanço |
| Conta ou cartão | Movimentações, Saldo e análise |
| Investimentos | Carteira, Distribuição |
| Aba criada por você | Registros, Visão geral, Ajustes |
| Academia | Treinos, Evolução, Ajustes |

As listas abrem prontas para usar. Indicadores e gráficos aparecem nas seções de consulta.
Mudar de seção preserva os filtros. Links antigos, como `financeiro.html#metas`, abrem a seção
correta, e Voltar/Avançar do navegador acompanham a navegação.

### Identidade e leitura

O símbolo, o logotipo, a serifa Gloock e a paleta preto, carvão, grafite, marfim e cinza quente
continuam sendo a identidade. Dados e controles usam Funnel Sans, com títulos de seção menores
que o nome da página. Os ícones de navegação usam um traço e uma cor.

Troque o tema em **Perfil → Aparência → Tema**. No celular, as quatro primeiras abas ficam
na barra inferior; **Mais** abre todas as áreas, a criação de abas e o perfil.

### Computador mais simples (modo leve)

Em **Perfil → Aparência → Desempenho** há três escolhas:

- **Automático** (padrão): liga o modo leve sozinho em computador com até 4 núcleos ou até 4 GB de
  memória, ou com "economia de dados" ligada.
- **Leve**: tira o desfoque atrás das janelas, as sombras grandes, as animações e a luz que segue o
  mouse, e só baixa as bibliotecas do Google quando você clica em conectar. O painel mostra
  exatamente as mesmas coisas.
- **Completo**: todos os efeitos, sempre.

Em qualquer modo, o painel ficou mais leve para abrir: as bibliotecas do Google não vêm mais com a
página (Pessoal, Financeiro, Faculdade e Disciplina abriam esperando por elas), o criador de abas e
o Delfos só são baixados quando você abre **Nova aba**, e o gráfico e os efeitos medem a tela sem
obrigar o navegador a montar a página duas vezes. Medido com o processador 6 vezes mais lento, o
texto principal dessas páginas aparece de 19% a 24% mais cedo.

### Como funcionam o saldo e a fatura

- O saldo de cada conta parte do valor informado no cadastro e se atualiza sozinho a cada lançamento.
- A fatura do cartão junta as compras do ciclo atual: compras feitas depois do dia do fechamento já
  entram na fatura seguinte.
- Para um lançamento entrar nesse balanço, escolha em **"Pago com"** de qual conta ou cartão ele saiu.

Excluiu algo sem querer? O aviso que aparece embaixo traz **Desfazer**.

### O Financeiro, mês a mês

A aba abre com uma frase que resume o mês — quanto entrou, quanto saiu, quanto sobrou e o que mais
pesou. As setas ao lado do mês (‹ setembro de 2026 ›) mudam tudo o que está abaixo para outro mês.

- **Perguntas do Delfos**: duas perguntas curtas por vez (quanto quer gastar por mês, quanto quer
  guardar, em que dia a renda cai, quais gastos são essenciais, se um gasto repetido é fixo).
  Responda com um toque; "Agora não" esconde a pergunta por duas semanas. Mudou de ideia? O botão
  **Limites e preferências**, no alto, mostra e edita todas as respostas — inclusive um limite para
  cada categoria.
- **Para onde foi o dinheiro**: toque numa categoria para ver só os lançamentos dela na planilha.
- **Ritmo do mês**: a linha do gasto somado dia a dia, contra a do mês anterior. Passe o dedo (ou o
  mouse) para ver o valor de cada dia.
- **A pagar**: o que está marcado como pendente e as faturas abertas. "Pago" resolve com um toque.
- **Metas**: **Guardar** soma o que você acabou de separar e diz quanto falta.
- **Na planilha**, cada lançamento tem **repetir hoje** (a mesma conta de novo, com a data de hoje —
  bom para gasto que se repete) e um "pendente" que vira pago ao toque.

### Gastos fixos

Em **Financeiro → Fixos e assinaturas → + Gasto fixo**, cadastre o que se repete todo mês: aluguel,
mensalidade, plano de celular, Spotify. Diga o valor, o dia do vencimento e de qual conta ou cartão
sai. A partir daí o Delfos lança sozinho, todo mês, e o gasto aparece em **A pagar** até ser pago
(botão **Pago**). Enquanto está a pagar, ele conta na leitura do mês, mas não mexe no saldo da conta.
O Delfos também lista os gastos que ele viu se repetir, com o botão **Cadastrar**.

**Ao importar o extrato, o gasto fixo não é contado duas vezes.** Se o extrato traz a cobrança do
aluguel, ela aparece na revisão com o selo **fixo: Aluguel** e, ao importar, só confirma o pagamento
(com o valor e a data que o banco mostrou) em vez de criar outro gasto. Conta que muda de valor e
vem com outro nome no banco (a luz como "COELBA ENERGIA") pode não ser reconhecida da primeira
vez: escolha **É gasto fixo? → Conta de luz** naquela linha, e o Delfos aprende o nome para os
próximos meses. Se o selo errar, toque nele para **lançar como novo**.

### Importar o extrato do banco

Esquece de lançar? Em **Financeiro → Importar extrato**, baixe o extrato ou a fatura pelo app do
seu banco e importe aqui: **o PDF de sempre** serve, e .ofx/.qfx ou .csv também. **Nenhuma senha de
banco entra no Delfos** — o arquivo é só lido neste navegador, você confere cada linha antes de
qualquer coisa ser salva, e pode cancelar a qualquer momento.

1. No app do banco, baixe o extrato do período ou a fatura do cartão em PDF (ou "Exportar extrato",
   "Extrato para Excel/OFX").
2. No Delfos, escolha de qual conta ou cartão é aquele extrato e selecione o arquivo.
3. Se o PDF tiver senha (muitos bancos usam os primeiros dígitos do CPF), o Delfos pede; a senha só
   abre o arquivo ali e não é guardada. Se for .csv, confirme qual coluna é data, descrição e valor.
4. No PDF, o Delfos acha cada linha com data, descrição e valor, e deduz se é entrada ou saída pelo
   sinal, pela coluna de saldo, pela seção ("Entradas"/"Saídas") ou, na fatura, tratando tudo como
   compra e o negativo como estorno. Data e valor ficam editáveis na revisão, porque PDF não tem
   colunas de verdade; o que ele não conseguiu decidir vem marcado **confira**, e o pagamento da
   fatura anterior vem desmarcado (**pagamento?**), para não contar duas vezes. PDF que é foto ou
   digitalização não tem texto para ler: nesse caso use o .ofx/.csv.
5. Revise a lista: o Delfos já tenta acertar a categoria pelo que você categorizou antes, e avisa
   quando um lançamento parece repetido (algo parecido já lançado perto da mesma data) — essas
   linhas vêm desmarcadas, mas dá para marcar se for engano. Ajuste o que quiser e confirme.

Importou errado? O aviso no rodapé traz **Desfazer**, que apaga todos de uma vez.

### Página de cada conta e cartão

Clique em qualquer conta ou cartão, em **Contas e cartões**, para abrir a página só dela: saldo (ou
fatura) em destaque, entradas e saídas, gastos por categoria e a lista de lançamentos filtrada. Dá
para lançar direto por ali — já sai marcado "Pago com" aquela conta.

### Investimentos

Página separada dos lançamentos do dia a dia, em **Financeiro → Investimentos**. Cadastre o que já
aplicou (valor e data) e, de vez em quando, atualize o valor de hoje — a rentabilidade em R$ e % é
calculada sozinha, e a carteira é resumida por tipo (renda fixa, ações, fundos, cripto…).

### Página de cada projeto

Clique no nome de um projeto, em **Projetos**, para abrir a página só dele. É lá que fica tudo:

- **Números no alto**: já faturado, custos, resultado (faturado menos custos) e renda estimada.
- **Etapas**: quebre o projeto em passos, cada um com prazo próprio, e acompanhe a barra de progresso.
- **Ficha**: situação, tipo, cliente ou parceiro, prioridade, início, prazo, horas por semana e link.
- **Recebimentos**: registre cada pagamento à medida que entra. O total do projeto sai desta lista,
  então nunca fica desatualizado.
- **Custos**: material, anúncio, transporte, ferramenta paga — o que o projeto consome.
- **Documentos**: contrato, proposta, arte de divulgação. Mesmo sistema de anexos das disciplinas.
- **Anotações**: espaço livre para combinados, contatos e ideias.

Na lista de projetos, o cartão continua mostrando o resumo e a **próxima etapa em aberto**.

### Seu perfil e os ajustes do painel

O botão do perfil abre **Configurações**, com uma categoria visível por vez:

- **Seu perfil**: identidade, foto e informações pessoais; estatísticas ficam em consulta recolhida.
- **Minhas abas**: nomes, visibilidade e ordem das áreas.
- **Visão geral**: página inicial e conteúdo do dia.
- **Aparência**: tema e cor de destaque.
- **Leitura e desempenho**: tamanho das letras, fonte, movimento e modo leve.
- **Rotina e avisos**: início da semana e lembretes.
- **Conta e dados**: sincronização, backups e acesso.

As preferências são salvas automaticamente. No celular, um seletor substitui o menu lateral;
apenas o conteúdo rola, mantendo a ação de fechar visível. O financeiro reúne os ajustes
menos frequentes em grupos recolhidos: essenciais, limites por categoria e respostas anteriores.

### Organizar a matéria pelo edital ou plano de ensino

Ao criar uma disciplina, a opção **Quero anexar o plano de ensino ao criar** abre
a leitura de documentos. Ela é opcional. A matéria também oferece **Plano e aulas**
para anexar documentos depois, consultar os assuntos e ajustar cada aula.

São aceitos até 5 documentos PDF com texto selecionável, Word **.docx** ou PowerPoint
**.pptx**, com até 10 MB por arquivo e 25 MB por seleção. PDF tem limite de 100 páginas;
Office, 150 partes de slides ou texto, com limites para o XML descompactado. Arquivos
Word antigos **.doc** precisam ser salvos como DOCX ou PDF. PDFs de imagem exigem OCR
prévio; documentos protegidos por senha precisam de uma cópia desbloqueada.

A leitura local procura rótulos, ementas, tabelas e cronogramas em português.
Ela não chama API de IA nem depende de WebGPU. A identificação depende da organização
do documento: cada sugestão mostra seu trecho de origem para conferência. Datas sem ano
usam o ano visível no formulário. Não são inventados datas, horários ou fim de semestre.
Complete dados ausentes ou desmarque os itens que não quer importar.

Na revisão, aulas semanais precisam de início e fim do período; confira feriados e recessos.
Datas explicitamente indicadas no documento como feriado, recesso ou sem aula são
mostradas na revisão e excluídas das aulas geradas.
As avaliações entram na matéria, as entregas em seus prazos e as aulas em **Plano e aulas**.
Todos aparecem na agenda da Visão geral e no calendário de Pessoal, com os horários.
Essa agenda é a compartilhada entre áreas do Delfos; a importação não publica eventos
em calendários externos. Aulas passadas continuam no histórico sem virar pendências vencidas.
Reimportar preserva ajustes anteriores e evita duplicar os mesmos eventos e arquivos.

### Escrever um resumo

Em **Resumos e anotações**, dentro da página de uma disciplina, o botão **+ Resumo** abre uma página
inteira só para escrever — sem barra lateral, sem cartões, só o texto.

A barra de cima tem, em grupos:

- **Texto**: estilo do parágrafo (título 1 a 3, citação, código), fonte (de sistema e algumas
  importadas — serifadas para ler, monoespaçada para fórmula, uma de letra à mão), tamanho,
  negrito, itálico, sublinhado, tachado, subscrito (H₂O), sobrescrito (x²), **cor do texto**,
  **marca-texto** e limpar a formatação.
- **Parágrafo**: alinhamento, listas com marcadores, numeradas e **de tarefas** (com caixinha de
  marcar), recuo.
- **Inserir**: link, imagem (também dá para colar ou arrastar), **tabela**, divisor e **caixas de
  destaque** (nota, dica, importante, atenção) — boas para "cai na prova" ou uma pérola clínica.
- **Ferramentas**: **buscar e substituir** (`Ctrl + F`), **sumário** (os títulos do texto, para
  pular direto), **folha** (largura, papel branco, sépia ou escuro, espaçamento entre linhas),
  **modo foco** (só o texto) e **exportar** (imprimir/PDF, Word ou texto).

Atalhos de digitação: `- ` vira lista, `1. ` vira lista numerada, `[] ` vira lista de tarefas,
`---` e Enter vira divisor. O rodapé traz a marca e a assinatura do editor.

O texto é salvo sozinho alguns segundos depois que você para de digitar — o indicador no alto diz se
há algo não salvo. `Ctrl + S` (ou `Cmd + S`) salva na hora.

> Os documentos anexados a um resumo (PDF, slides — o que não é imagem para o meio do texto) ficam
> no botão **Documentos**, na página da disciplina, para a tela de escrita não ter mais nada além do
> texto e das imagens que você inseriu nele.

### Criar suas próprias abas

**Nova aba** abre Escolher, Dar nome e Revisar. Um modelo pronto é opcional.
O catálogo oferece busca por tema ou profissão, filtro por categoria e grupos
recolhidos. **Aba livre** continua disponível junto dos seis modelos essenciais.
Os modelos são adicionados ao painel quando você escolhe e cria cada aba.

Os **32 modelos específicos** têm campos, agrupamento e visualização próprios:

| Categoria | Modelos |
|---|---|
| Esportes (6) | Corrida; Jiu-jitsu; Boxe e Muay Thai; Ciclismo; Natação; Futebol |
| Estudos (6) | Estudos; TCC; Pesquisa científica; Concursos e vestibulares; Idiomas; Cursos e certificações |
| Saúde e bem-estar (4) | Saúde e cuidados; Alimentação e refeições; Sono e descanso; Hábitos e rotina |
| Vida pessoal (6) | Religião e espiritualidade; Compromissos familiares; Planejamento semanal; Casa e manutenção; Cuidados com pets; Viagens |
| Trabalho e profissões (10) | Engenharia; Advocacia; Táxi; Motorista de aplicativo; Medicina e plantões; Trabalho autônomo; Marketing digital; Vendas online; Criação de conteúdo; Aulas particulares |

Por exemplo, Corrida usa distância, tempo e tipo de treino; TCC abre um quadro
por etapa; Motorista de aplicativo distingue plataforma, ganhos e quilômetros;
Vendas online organiza os pedidos por situação. Buscar **Uber**, **médico** ou
**engenheiro** encontra o modelo correspondente. As práticas de religião podem
ser adaptadas à tradição da pessoa.

Escolher um modelo usa uma estrutura pronta local. Mudar o nome ou o propósito
mantém os campos escolhidos. Você pode editar, incluir, remover e ordenar os campos
na revisão; cada aba começa sem registros. Metas ficam disponíveis para configurar.

Na segunda etapa, escolha um dos caminhos:

- **Montar manualmente**: escolha os elementos sem geração automática. Uma aba livre começa
  com nome e data, e você acrescenta, edita, remove e ordena os campos que precisar.
- **Deixar Delfos criar**: descreva o que deseja acompanhar, os campos, a visualização e as metas.
  O modelo de linguagem prepara uma proposta no próprio aparelho. Revise e ajuste antes de criar.

A revisão reúne **Elementos e visualização**, **Agenda e metas** e **Ícone e aparência**.
Campos podem ser texto, número, dinheiro, opções, sim/não, data, hora, link e estrelas.
São até oito campos adicionais por aba. Numa lista de opções, use de duas a oito opções diferentes.

**IA local, sem API de inferência.** A opção usa Qwen2.5-0.5B-Instruct pelo WebLLM, dentro
de um worker do navegador. Nome, descrição e estrutura não são enviados a um servidor.
O primeiro uso baixa arquivos públicos do modelo (centenas de MB), que podem ser reutilizados
pelo cache do navegador. Esse download só ocorre quando a pessoa pede a geração.

A IA precisa de HTTPS ou localhost, um navegador com **WebGPU** e memória gráfica disponível
(aproximadamente 1 GB para o modelo, além do restante da aplicação). O modo manual continua
disponível sem esses requisitos. Se faltar suporte, conexão para o primeiro download ou memória,
a interface informa o problema; não apresenta uma sugestão de regras como se tivesse sido gerada
pelo modelo. O cache pode ser removido pelo navegador, exigindo novo download.

A IA não é um modelo treinado do zero para o Delfos: o site executa um modelo aberto localmente,
com instruções e validação específicas para suas abas. Resultados podem precisar de ajustes.
A resposta aceita apenas a estrutura conhecida pelo painel, sem HTML, scripts ou ações.
Nenhum registro de exemplo é criado automaticamente. Um pedido novo não substitui ajustes manuais
sem a escolha explícita **Usar estrutura da IA**. Cancelar ou mudar o pedido interrompe a geração.

Para reconstruir o runtime empacotado, consulte
[dashboard/vendor/webllm/README.md](dashboard/vendor/webllm/README.md).
A rota de IA legada do backend não é chamada por este fluxo e não é necessária para a IA local.

Abas **com data** entram na agenda dos próximos 30 dias e nos alertas de semana cheia da visão
geral. Abas de **hábito** (oração, idioma, remédio diário) ganham um botão **Hoje** por item, os
últimos sete dias e a sequência. Abas de coleção (livros, filmes) ficam fora da agenda.

Na página da aba:

- **Registros** abre o conteúdo principal. **Visão geral** reúne leitura, indicadores, metas e
  resumos por campo. **Ajustes** reúne as configurações da aba.
- **Perguntas do Delfos** oferecem o que falta: definir uma meta, agrupar a lista por um campo.
- **Personalizar**: muda o propósito, nome, ícone, cor, descrição, meta e agrupamento; a geração local é uma escolha explícita. Campos existentes continuam preservados.
  O propósito fica guardado e aparece em **Ajustes da aba**.
- **Campos desta aba**: adicionar, editar, excluir e reordenar os campos um a um. Além de texto,
  data, número, valor em R$, lista de opções e sim/não, há **nota em estrelas** (1 a 5), **link** e
  **hora**.
- **Como ver**: no alto da lista, escolha entre **Lista**, **Cartões** (cada registro com todos os
  campos), **Quadro** (uma coluna por opção do campo de agrupar — arraste um cartão de "quero ler"
  para "lendo"; no celular, use o "mover para" do cartão), **Tabela** (todos os campos lado a lado;
  toque no cabeçalho para ordenar) ou **Calendário** (o mês com os registros; toque num dia vazio
  para criar um nele). Ao lado, a **ordem**: data, mais recentes, A a Z ou por um campo numérico.
- **Layout e exibição**: a vista em que a aba abre, a ordem, e o que a página mostra — a leitura,
  os números, a coluna com notas e resumos, as perguntas — e se os registros entram na agenda e nos
  lembretes.
- **Excluir esta aba**: some da barra e apaga os itens junto.

### Academia

O modelo **Academia (treino)** é diferente dos outros: em vez de itens com campos, a aba vira **dias
de treino** (ex.: "Peito e tríceps", "Superior A") com **exercícios escolhidos de um catálogo** —
mais de 80, organizados por grupo muscular. O Delfos não é personal trainer e não prescreve treino
nenhum — só ajuda a organizar o que você já decidiu fazer.

Na primeira vez que você abre essa aba, um questionário rápido pergunta objetivo, experiência e
quantos dias por semana você treina e, assim que você confirma, **já cria os dias de treino**
sugeridos para aquela divisão — sem precisar de mais nenhum passo. A sugestão vem de achados
conhecidos sobre frequência de treino (mas é só uma sugestão, dá para escolher qualquer outra). Dá
para refazer esse questionário depois em **Ajustes da aba**, sem mexer nos dias que você já montou.

Em cada dia, o botão **+ Exercício** abre o catálogo — **digite pra buscar** (pelo nome do exercício
ou pelo grupo muscular, ex.: "supino" ou "peito"). Ao adicionar um, você anota:

- **Carga atual**: o peso que você está usando agora.
- **Séries e repetições**: quantas séries e quantas repetições por série.
- **Recorde pessoal**: fica em branco por padrão, começa igual à carga atual, e se atualiza
  sozinho sempre que você editar o exercício com uma carga maior que o recorde anterior.

Acima dos dias, um cartão **Séries por grupo muscular** soma sozinho, a partir do que você já
cadastrou exercício a exercício, quantas séries de peito, costas, perna etc. você tem na semana —
não é meta nem recomendação, só a conta pronta.

### Anexar documentos nas disciplinas

Em **Materiais** (no formulário) e em **Resumos** (botão **Documentos**), dentro da página de uma
disciplina, aparece uma área pontilhada: clique nela ou arraste os arquivos para cima. Vale PDF,
slides, fotos do quadro, planilhas — até 25 MB por arquivo.

Depois de salvo, o documento aparece como um botão na lista. Clicar abre o PDF ou a imagem em outra
aba; os demais formatos são baixados.

> Os arquivos ficam guardados no navegador (IndexedDB, que aguenta bem mais que os ~5 MB do resto) e
> **vão junto no backup** — por isso o `.json` exportado pode ficar grande.

### Importar do Google Drive

Na página de uma disciplina, em **Materiais**, o botão **Importar do Drive** busca arquivos do seu
Google Drive (exige estar conectado — veja a seção do Google mais abaixo):

- Qualquer arquivo pode virar **material**, com o link do Drive.
- Um **Google Docs** também pode virar **resumo**: o texto do documento é copiado direto para a
  disciplina, pronto para editar por aqui.

### Lançamentos e formulários

Toda janela de cadastro do painel segue o mesmo desenho: campos curtos lado a lado, **pílulas** em
vez de listas quando há poucas opções, atalhos de data (**Ontem**, **Hoje**, **Amanhã**, **Em 1
semana**), a data escrita por extenso embaixo do campo, aviso claro no campo que falta, e `Enter`
salva, `Esc` fecha.

O **+ Lançamento** foi refeito: Despesa ou Receita no alto, o **valor em destaque** (aceita conta:
`45+12,90`), e ao digitar a descrição o Delfos sugere a partir do histórico e já preenche a
categoria e a conta que você costuma usar. Categorias aparecem como pílulas, das mais usadas para
as menos, com **+ Nova** para criar uma ali mesmo. "Pago com" também vira pílulas. Data no futuro
entra como pendente sozinha. Em **Mais opções**: observação, **parcelar** (em N vezes, pelo total ou
pelo valor da parcela) e **repetir todo mês** (vira um gasto fixo). Uma frase no rodapé resume o
que vai ser salvo, e **Salvar e lançar outro** mantém a janela aberta.

### Pessoal: calendário e lembretes

Compromissos que não são de nenhum dos outros três pilares: consulta médica, levar o carro para a
revisão, um aniversário. Cada um tem tipo, data, **hora**, local, se **repete** (toda semana, todo
mês, todo ano), **quando lembrar** (no dia, 1, 2 ou 7 dias antes, ou como está no perfil) e se é
**importante** (aí o Delfos avisa também uma semana antes).

- **Calendário**: a aba abre no mês inteiro, com tudo o que tem data **em todas as abas** — provas,
  prazos, projetos, contas a pagar, suas abas próprias e os compromissos pessoais, cada um na cor da
  sua área. Toque num dia para ver o que há nele e criar um compromisso já naquela data. A vista
  **Lista** continua lá, agrupada por quando.
- **O que se aproxima**: as próximas duas semanas, com um selo nos itens que já estão na janela de
  lembrete.
- **Lembretes**: na primeira vez que você abre o Delfos no dia, uma janela mostra o que vence hoje e
  o que está chegando. Com os **avisos do navegador** ligados, cada item vira uma notificação do
  sistema (enquanto o Delfos estiver aberto numa aba), e o que tem hora avisa de novo 1 hora antes.
- **Repetição**: um compromisso que se repete não fica "atrasado": marcar como feito passa para a
  próxima data, e se a data passar ele anda sozinho para a próxima vez.
- **Trazer outro calendário**: o botão **Importar calendário** (e uma pergunta do Delfos, enquanto
  você não importou nada) oferece três caminhos — um **arquivo .ics** (exportado do Google Agenda,
  Outlook ou iPhone), um **.ics guardado no Google Drive**, ou a **Agenda do Google** direto. Você
  revisa tudo antes: o que já passou e o que já está no Delfos entra desmarcado, e importar o mesmo
  arquivo duas vezes não duplica nada. "Desfazer" no aviso tira tudo de uma vez.

### Onde ficam seus dados

No próprio navegador (localStorage) — nada é enviado para lugar nenhum. Consequência prática: os
dados ficam **naquele navegador, naquele computador**.

Para backup ou para usar em outro aparelho, clique no **seu nome** (pé da barra lateral), abra
**Conta e dados** e depois **Backup e dados**:

- **Exportar** gera um arquivo `.json` com tudo, inclusive os documentos anexados
- **Importar** restaura esse arquivo em qualquer navegador, anexos e todos

Vale exportar de tempos em tempos — limpar os dados de navegação do navegador apaga o que está salvo.

## Conectar ao Google Calendar e Drive

Opcional. Habilita ver os próximos eventos da agenda (Faculdade) e os arquivos recentes do Drive
(Financeiro).

1. Em <https://console.cloud.google.com/apis/credentials>, crie um projeto.
2. Em **APIs e serviços → Biblioteca**, ative **Google Calendar API** e **Google Drive API**.
3. Configure a **tela de consentimento OAuth** (tipo Externo) e adicione seu e-mail como usuário de teste.
4. Em **Credenciais → Criar credenciais → ID do cliente OAuth**, escolha **Aplicativo da Web** e, em
   *Origens JavaScript autorizadas*, informe a origem de onde você abre o painel — por exemplo
   `https://luizftc5-debug.github.io` ou `http://localhost:8000`.
5. Copie o Client ID e cole em `dashboard/config.js`, no lugar de `SEU_CLIENT_ID_AQUI`.

Se algo estiver faltando, o botão "Conectar ao Google" abre uma caixa dizendo exatamente o que
corrigir — inclusive mostrando a origem que precisa ser registrada.

## Estrutura

```
dashboard/
  index.html          home.js            visão geral
  financeiro.html      financeiro.js     lançamentos, gráficos e metas
  contas.html          contas.js         contas, cartões e balanço
  conta.html           conta.js          página de uma conta/cartão
  investimentos.html   investimentos.js  carteira de investimentos
  faculdade.html       faculdade.js      lista de disciplinas e prazos
  disciplina.html      disciplina.js     página de uma disciplina
  projetos.html        projetos.js       projetos de renda e oportunidades
  projeto.html         projeto.js        página de um projeto
  pessoal.html         pessoal.js        compromissos pessoais, calendário e lembretes
  calendario.js                          grade do mês e importação de calendário (.ics, Drive, Google Agenda)
  lancamento.js                          janela de novo lançamento (usada no Financeiro, visão geral e contas)
  pilar.html           pilar.js          página de uma aba criada por você (lista, cartões, quadro, tabela, calendário)
  delfos.js                              o Delfos, a IA do painel: lê nome e propósito e monta a aba (roda no aparelho)
  abas.js                                criador/editor de abas (baixados só ao abrir "Nova aba")
  leituras.js                            leitura e notas de Faculdade, Projetos, Pessoal e abas próprias
  resumo.html          resumo.js         editor de texto dos resumos
  store.js                               dados: localStorage, CRUD e backup
  arquivos.js                            anexos: IndexedDB (PDF, slides, fotos)
  financas.js                            saldo por conta, fatura por cartão, investimentos
  ui.js                                  modais, avisos, gráficos, datas
  theme.css                              design system (claro/escuro)
  config.js         google-integration.js   integração com o Google (Calendar, Drive)
  data.js                                conteúdo inicial (lido só na 1ª abertura)
```

O arquivo `CLAUDE.md` traz as instruções do agente que acompanha este repositório.
