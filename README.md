# Delfos

Painel para acompanhar quatro frentes ao mesmo tempo — **Financeiro**, **Faculdade**, **Projetos** e
**Pessoal** — com alerta automático quando prazos de áreas diferentes caem na mesma semana. Além
dessas quatro, você pode criar **abas suas**, com nome, ícone e cor próprios.

Aplicação estática: HTML, CSS e JavaScript puros, sem instalação. Com o [back end](backend/README.md)
publicado (gratuito, na Cloudflare), o painel passa a exigir **conta** — cada pessoa entra com e-mail
e senha, vê só os próprios dados e os encontra iguais no celular e no computador, com anexos e
versões anteriores guardados no servidor.

## Como abrir

**Online (recomendado):** <https://luizftc5-debug.github.io/Delfos/dashboard>

**No seu computador**, pela pasta `dashboard`:

```bash
python -m http.server 8000
```

E acesse <http://localhost:8000>.

> Abrir o arquivo direto (`file://`) funciona para tudo, **menos** o login do Google — ele exige
> `http://` ou `https://`.

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
| **Visão geral** | Saldo, alertas de atraso e de semana cheia, agenda dos próximos 30 dias, leitura automática da situação e **o que o Delfos notou** em todas as abas |
| **Financeiro** | O mês lido em voz alta: quanto entrou, saiu e sobrou, **para onde foi o dinheiro**, o **ritmo do mês** comparado ao anterior, gastos fixos e assinaturas detectados, o que falta pagar, metas com "Guardar", e **perguntas** que deixam a leitura do seu jeito (limite do mês, quanto guardar, dia da renda). Também lançar entradas e saídas e **importar o extrato do banco** (PDF, .ofx ou .csv) para não esquecer de lançar |
| **Contas e cartões** | Cadastrar contas com saldo, cadastrar cartões com fechamento e vencimento. Cada uma abre numa **página própria**, com saldo/fatura, gastos por categoria só dela e a lista de lançamentos |
| **Investimentos** | Renda fixa, ações, fundos, cripto — o que já aplicou e quanto vale hoje, com rentabilidade calculada e distribuição por tipo |
| **Faculdade** | Leitura do semestre, **próximas quatro semanas** lado a lado, médias por disciplina com a média mínima marcada, avisos (prova sem resumo, semana cheia) e perguntas (média para passar, horas de estudo). Disciplinas, prazos e entregas. Cada disciplina abre em **página própria**, com avaliações e notas, prazos, materiais e resumos — em materiais e resumos dá para **anexar documentos** (PDF, slides, fotos) ou **importar do Google Drive** |
| **Projetos** | Leitura do mês, **recebido × estimado** por projeto, **quanto cada um paga por hora**, últimos seis meses, meta mensal. Só iniciativas pessoais que geram renda. Cada projeto abre em **página própria**, com ficha completa, etapas, recebimentos, custos, documentos e anotações |
| **Pessoal** | Consultas, tarefas e recados que não são financeiro, faculdade nem projeto — ex.: consulta médica, levar o carro à revisão. Linha do tempo (atrasados, hoje, esta semana…), filtro por tipo e aviso quando cai no mesmo dia de uma prova |
| **Suas abas** | Abas que você mesmo cria: digite o nome e o Delfos (com IA, quando ligada) monta ícone, cor, campos, meta e agrupamento para aquele assunto — ex.: Plantões, Leituras, Corrida, Oração. Cada uma ganha leitura, números, resumo dos campos, meta do período e, para hábitos, marcação diária com sequência |

> Trabalhos da faculdade e o TCC ficam em **Faculdade**, não em Projetos.

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

Clique na sua foto e nome, **no pé da barra lateral**, para abrir o cartão de perfil. **É o único
lugar de configuração**, dividido em cinco abas:

- **Sobre você**: sua ficha. **Editar perfil** abre um formulário em partes (quem você é, como
  prefere ser chamado, ocupação, vida acadêmica — só para quem estuda — e dois textos livres). A
  idade é calculada sozinha. **Toque na foto** para trocá-la.
- **Aparência**: tema (claro, escuro ou automático, que segue o do aparelho), cor de destaque dos
  botões e do que está escolhido, tamanho do texto, densidade (confortável ou compacta), a fonte das
  leituras e títulos (serifa ou sem serifa) e se o painel usa animações.
- **Painel**: quais abas aparecem, com que nome e **em que ordem** (setas para subir e descer), qual
  página abre primeiro, se a barra mostra os contadores e quais blocos a visão geral mostra.
- **Rotina e avisos**: em que dia a semana começa (vale para o calendário), com quanta antecedência
  o Delfos lembra das coisas, se mostra o **resumo do dia** ao abrir e se usa **avisos do
  navegador**. Também lista os **atalhos de teclado** (aperte `?` em qualquer página para vê-los).
- **Conta e dados**: sincronização, backup, refazer a configuração inicial, sair.

O cartão também mostra quantas disciplinas e registros você tem, quantos compromissos há nesta
semana e quanto os documentos anexados ocupam.

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
`---` e Enter vira divisor. O rodapé mostra palavras, caracteres e o tempo de leitura.

O texto é salvo sozinho alguns segundos depois que você para de digitar — o indicador no alto diz se
há algo não salvo. `Ctrl + S` (ou `Cmd + S`) salva na hora.

> Os documentos anexados a um resumo (PDF, slides — o que não é imagem para o meio do texto) ficam
> no botão **Documentos**, na página da disciplina, para a tela de escrita não ter mais nada além do
> texto e das imagens que você inseriu nele.

### Criar suas próprias abas

O botão **＋ Nova aba**, embaixo da lista da barra lateral, abre o criador. **Só digite o nome** —
"Plantões", "Leituras", "Corrida", "Remédios", "Viagem a Lisboa" — e o Delfos monta a aba para
esse assunto enquanto você digita: ícone, cor, o que cada registro é ("plantão", "livro"), os campos
que valem a pena (setor e preceptor num plantão; autor e situação num livro), uma meta, como agrupar
a lista e alguns exemplos para começar. À direita aparece a prévia de como a aba vai ficar. Tudo dá
para mudar antes de criar: desligue um campo, troque a cor, marque só os exemplos que quiser.

- **Com IA**: se as contas estiverem ligadas e o servidor tiver a chave da IA (ver
  [backend/README.md](backend/README.md), "Como ligo a IA"), um segundo depois de você parar de
  digitar o Claude refaz a sugestão sob medida para aquele nome, levando em conta seu curso e sua
  cidade. Se você já tinha mexido em algo, ele não passa por cima: aparece o botão **Usar sugestão
  da IA**. Só o nome da aba, sua ocupação e sua cidade vão para a IA — nada do que está cadastrado.
- **Sem IA**: a sugestão rápida funciona no próprio aparelho, sem internet, para uns 30 assuntos
  comuns; para um nome desconhecido, monta uma lista de tarefas com prioridade.

Abas **com data** entram na agenda dos próximos 30 dias e nos alertas de semana cheia da visão
geral. Abas de **hábito** (oração, idioma, remédio diário) ganham um botão **Hoje** por item, os
últimos sete dias e a sequência. Abas de coleção (livros, filmes) ficam fora da agenda.

Na página da aba:

- A **leitura** no alto diz como está a aba; os números, a **meta do período** e o resumo de cada
  campo (quantos em cada situação, soma de km, média de nota) vêm logo abaixo.
- **Perguntas do Delfos** oferecem o que falta: definir uma meta, agrupar a lista por um campo.
- **Personalizar**: muda nome, ícone, cor, descrição, meta e agrupamento, e sugere campos novos (com
  IA, se ligada) — só acrescenta, nunca apaga o que já existe.
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
  abas.js                                criador/editor de abas (sugestão local e IA)
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
