# Delfos — agente de organização pessoal do Luiz

O painel se chama **Delfos** (versão atual: **1.8**). O nome e a versão (`UI.NOME` / `UI.VERSAO`,
em `ui.js`) aparecem no alto da barra lateral (o logotipo, com a versão ao lado), nos títulos das
abas do navegador e no nome do arquivo de backup exportado. Desde a 1.8 o nome tem **logotipo**
(desenho vetorizado do quadro da marca, `UI.logotipo()`) e assinatura, "Organização para o que
importa"; ver "Delfos 1.8: a marca".

Duas coisas **continuam** com o nome antigo, de propósito:

- **O repositório é `organizador`.** O endereço do GitHub Pages
  (`luizftc5-debug.github.io/organizador/dashboard/`) sai daí; renomear quebraria o link que o Luiz
  usa e os favoritos dele.
- **Os endereços de armazenamento**: `organizador.estado.v2`, `organizador.tema`,
  `organizador.sessao`, `organizador.nuvem` e `organizador.api` no localStorage, `organizador.arquivos`
  no IndexedDB. Não são texto de marca, são a chave onde os dados moram —
  trocá-las faria o painel abrir vazio, como se tudo tivesse sido apagado. Só renomeie junto com uma
  migração que copie os dados da chave velha para a nova, e nunca sem testar com dados reais.

Você é um assistente de IA especializado em organizar e gerenciar os quatro pilares principais da vida de Luiz:
- **Financeiro**: controle de receitas, despesas, contas, cartões, investimentos, metas de ganho
- **Faculdade**: disciplinas, cronograma de estudos, TCC/projetos acadêmicos (metanálise), provas
- **Projetos**: desenvolvimento de projetos científicos, side hustles, iniciativas paralelas
- **Pessoal**: compromissos e recados fora dos outros três — consultas médicas, tarefas do dia a dia

## Contexto sobre Luiz
- Estudante de Medicina, 6º semestre
- Mora em Salvador, Bahia (vive com os avós)
- Busca ativamente formas de ganhar dinheiro
- Trabalha com metanálise/revisão sistemática (TCC + projeto com médica referência)
- Usa: Google Drive, Gmail, Google Calendar, GitHub
- **Não é programador** — evite pedir que ele edite código ou use git para tarefas do dia a dia

## Arquitetura do dashboard

Aplicação estática multi-página em `dashboard/`, sem build. Dependências externas: a tipografia (Google Fonts), as bibliotecas do Google (só quando a pessoa vai conectar, ver "Delfos 1.8") e, só ao criar ou trocar senha, a consulta k-anônima ao Have I Been Pwned (`sessao.js`). O pdf.js (Mozilla, Apache 2.0) vem **copiado** em `dashboard/vendor/pdfjs/` — não de CDN — e só é baixado quando alguém importa um extrato em PDF. Os ícones são Phosphor (MIT), também **copiados**: o miolo de cada SVG mora em `ui.js` e `resumo.js`, a licença em `dashboard/vendor/phosphor/`.

| Arquivo | Papel |
|---|---|
| `index.html` + `home.js` | Visão geral: leitura com saudação, razão de números (saldo, mês, próximo, a pagar), agenda por semana, notas, índice das abas |
| `financeiro.html` + `financeiro.js` | Resumo do mês: leitura, para onde foi o dinheiro, ritmo diário, perguntas, notas, a pagar, fixos, metas e a planilha |
| `contas.html` + `contas.js` | Lista de contas e cartões, com o balanço geral |
| `conta.html` + `conta.js` | Página de uma conta ou cartão: saldo/fatura, gastos por categoria só dela, lançamentos |
| `investimentos.html` + `investimentos.js` | Carteira de investimentos: aplicado, valor atual, rentabilidade por tipo |
| `faculdade.html` + `faculdade.js` | Lista de disciplinas e prazos gerais |
| `disciplina.html` + `disciplina.js` | Página de uma disciplina: avaliações, prazos, materiais e resumos, com importação do Drive |
| `resumo.html` + `resumo.js` | Editor de texto de um resumo: página inteira, sem barra lateral |
| `projetos.html` + `projetos.js` | Projetos pessoais que geram renda + oportunidades |
| `projeto.html` + `projeto.js` | Página de um projeto: ficha, etapas, recebimentos, custos, documentos e anotações |
| `pessoal.html` + `pessoal.js` | Compromissos pessoais: calendário do mês (vista padrão) ou lista, o que se aproxima, lembretes |
| `calendario.js` | `Calendario`: leitura de .ics e de eventos do Google (puras, testáveis com Node), grade do mês, `itensEntre` (tudo com data, de todas as abas), importação com revisão |
| `lancamento.js` | `Lancamento.abrir`: a janela de novo/editar lançamento (histórico, categorias por uso, parcelas, repetir todo mês) |
| `pilar.html` + `pilar.js` | Página de uma aba criada pelo usuário, com modelo e campos próprios |
| `bemvindo.html` + `bemvindo.js` | Assistente de boas-vindas: identidade, ocupação, abas fixas, ajustes finais |
| `store.js` | Camada de dados: localStorage + CRUD + backup em JSON |
| `personalizacao.js` | Traduz perfil/preferências em como o painel se apresenta (abas ligadas, saudação, ocupação) |
| `arquivos.js` | Anexos (PDF, slides, fotos) no IndexedDB + export/import para o backup |
| `importar.js` | Lançamentos a partir de extrato bancário (PDF, .ofx/.qfx/.csv) — leitura, mapeamento de colunas, revisão e confirmação |
| `entrar.html` + `entrar.js` | Entrar / criar conta / esqueci a senha: página sem barra lateral, a única que abre sem sessão |
| `sessao.js` | Conta do usuário: endereço da API, login, cadastro, derivação da senha, porta de entrada das páginas |
| `nuvem.js` | Sincronização com a conta (`backend/`): envio, conferência, conflito, versões, anexos, sair |
| `leituras.js` | Leitura das outras abas, no molde do Financeiro: `Leituras.faculdade()`, `projetos()`, `pessoal()`, `pilar(p)` devolvem números, a frase da leitura e as notas; `todasNotas()` alimenta a visão geral |
| `delfos.js` | **O Delfos, a IA do painel** (`Delfos.entender`): lê nome e propósito de uma aba e devolve a aba montada e a explicação do que entendeu. Funções puras, roda no navegador e no Node |
| `abas.js` | Criador/editor de abas próprias (`Abas.abrir`) com a caixa de propósito e "O que o Delfos entendeu"; tudo passa por `sanear`. Baixado só ao abrir "Nova aba" (`UI.abrirCriadorDeAbas`) |
| `financas.js` | Cálculos derivados: saldo por conta, ciclo e fatura de cartão, balanço, investimentos, e a análise do mês (`analisarMes`, `recorrentes`, `acumuladoDiario`) |
| `ui.js` | Componentes: layout (barra lateral, barra de abas do celular), ícones Phosphor (`UI.icone`), perfil, modais de formulário, avisos, gráficos, datas/urgência |
| `theme.css` | Design system (tema claro/escuro) |
| `config.js` + `google-integration.js` | Integração OAuth com Google Calendar e Drive (inclui busca/exportação de arquivos, usada pela importação em disciplina.js); as bibliotecas do Google são baixadas sob demanda (`carregarGoogle`) |
| `data.js` | Conteúdo inicial (seed), lido só na primeira abertura |
| `exercicios.js` | Catálogo de exercícios da aba Academia (`const EXERCICIOS`), carregado só por `pilar.html` |

### Contas de usuário e back end

`backend/` é um Cloudflare Worker + banco D1 (guia em `backend/README.md`, publicado pelo workflow
`.github/workflows/backend.yml`). O painel continua estático no GitHub Pages; o servidor guarda as
contas e os dados de cada uma. O localStorage continua sendo a cópia de trabalho.

- **A porta.** `sessao.js` roda em toda página antes do script dela: sem sessão, esconde a página e
  manda para `entrar.html?volta=<página>` (`volta` só aceita páginas do próprio painel).
  `UI.iniciarPagina` consulta `Sessao.saindo()` para não disputar o redirecionamento com o
  assistente de boas-vindas. **Enquanto `API_PUBLICA` (no alto de `sessao.js`) estiver vazia, as
  contas ficam desligadas** e o painel abre sem login, como antes — é o que permite publicar o
  servidor sem trancar ninguém. Para testar local, `localStorage["organizador.api"]` sobrepõe o
  endereço só naquele navegador.
- **Senha.** Nunca é guardada nem enviada: `Sessao.derivarChave` faz PBKDF2-SHA256, 600 mil
  iterações, sal = `delfos:v1:<email>`, e só a chave de 32 bytes vai ao servidor, que guarda
  HMAC-SHA256(sal aleatório da conta, chave). As iterações ficam no navegador por causa do limite de
  CPU do plano gratuito (mesmo desenho do Bitwarden). Senha nova passa por `problemaNaSenha`: mínimo
  8 caracteres e consulta k-anônima ao Have I Been Pwned (falha aberta, sem rede não bloqueia).
- **Sessão.** Token aleatório; no banco só o SHA-256 dele. **Sem "Manter conectado"** (o padrão),
  o token vai para o sessionStorage e vale no máximo 12 h no servidor: reabrir o navegador pede a
  senha de novo. Uma aba nova pede o token às abas abertas por `BroadcastChannel("delfos-sessao")`,
  e sair numa aba leva as outras para a entrada. **Com "Manter conectado"**, o token vai para o
  localStorage e vale 30 dias. `organizador.sessao` no localStorage guarda sempre o id/e-mail da
  última conta (preenche o e-mail e diz de quem são os dados). Um 401 numa rota com token tira o
  token e mostra um aviso com "Entrar" — nunca recarrega sozinho no meio do que a pessoa digita.
- **Esqueci a senha** = código de recuperação (20 caracteres, ~98 bits), gerado no cadastro e
  mostrado uma única vez (`Nuvem.mostrarCodigoRecuperacao`, que só libera "Continuar" depois de a
  pessoa marcar que guardou). No banco, só o SHA-256. Usar o código (`/api/recuperar`) troca a senha,
  gera outro código e derruba todas as sessões; erros contam no mesmo limite das senhas erradas. Dá
  para gerar um novo pelo painel, confirmando a senha. Não há e-mail de recuperação.
- **Um navegador nunca mistura contas.** `organizador.nuvem.usuarioId` diz de quem são os dados do
  navegador; `Nuvem.conectado()` só sincroniza quando bate com a sessão. **Sair apaga os dados
  locais** (continuam na conta). Entrar com outra conta apaga os dados da anterior antes de baixar.
  Dados sem dono (de antes das contas) disparam a pergunta "levar para a minha conta?" em
  `Nuvem.aposEntrar`, chamado por `entrar.js` antes de liberar o painel.
- **O servidor não interpreta o estado.** Guarda o JSON como texto (pedaços de 400 mil caracteres,
  pelo limite de linha do D1), com `revisao`, e devolve como veio. `Store.substituir()` passa o que
  chega por `normalizar` como qualquer carga.
- **Conflito nunca é silencioso.** `PUT /api/estado?base=N` recusa com 409 se outro aparelho gravou
  depois; `nuvem.js` pergunta qual versão fica. A que perde vai para `versoes` (60 por conta).
- **Isolamento.** Toda rota de dados usa o id que sai de `exigirSessao`, nunca um id da requisição;
  anexos têm chave `(usuario_id, id)`. Cota de anexos por conta em `COTA_ANEXOS_MB`
  (`wrangler.toml`) — o D1 gratuito tem 500 MB no total.
- **Cadastro** aberto, ou com convite se o segredo `CODIGO_CONVITE` existir.
- **IA** (`backend/src/ia.js`, `POST /api/ia/aba`): recebe só o nome da aba, uma linha de contexto
  (ocupação, cidade) e, na edição, o nome dos campos existentes — nada do estado. Usa o SDK oficial
  (`@anthropic-ai/sdk`) com saída em JSON por esquema e esforço baixo; exige sessão e limita 40
  pedidos por conta por hora (tabela `tentativas`, chave `ia:<id>`). **A chave `ANTHROPIC_API_KEY`
  é segredo do Worker (workflow a publica a partir do segredo do GitHub) e nunca vai ao navegador.**
  Sem chave: `/api/saude` devolve `ia: false`, a rota dá 503 e o painel usa só a sugestão local.
  **Desde a 1.8 o painel não chama mais esta rota**: quem monta as abas é o Delfos (`delfos.js`), no
  navegador. A rota e os testes dela continuam no back end, sem uso; dá para tirar quando quiser.
- Migrações só se acrescentam (`0002_contas.sql` renomeou as tabelas da versão de senha única para
  `legado_*` em vez de apagar). Módulo Worker só exporta `default`. Testes: `cd backend && npm test`.

### Divisão entre Faculdade e Projetos

- **Faculdade** cobre tudo que é acadêmico, **incluindo o TCC e a metanálise** — como prazos
  (`tipo: "TCC"`) ou avaliações dentro da disciplina correspondente.
- **Projetos** é só para iniciativas pessoais com fim financeiro (monitoria, cursinho, freelas,
  conteúdo). Cada projeto tem `rendaEstimada` (esperado por mês, informado à mão) e listas de
  `recebimentos` e `custos` — o que já entrou e o que já saiu, item a item.

Não misture os dois: trabalho acadêmico não vira projeto.

### Página por projeto

`projeto.html?id=` é onde o projeto vive de verdade; `projetos.html` virou só o panorama, com o
cartão levando à página e mostrando a próxima etapa em aberto.

Além de `nome`, `status` e `descricao`, o projeto guarda `tipo`, `cliente`, `link`, `inicio`,
`deadline`, `prioridade`, `horasSemana`, `anotacoes`, `anexos` e as sub-listas `passos`,
`recebimentos` e `custos` (editadas por `Store.subInserir/subAtualizar/subRemover`).

`UI.resumoProjeto(p)` centraliza tudo que se deduz — `faturado` (soma dos recebimentos),
`custoTotal`, `lucro`, progresso das etapas e urgência do prazo. **Nada disso é guardado no
estado**, pela mesma razão do saldo das contas: dois lugares com o mesmo número dessincronizam.
Foi por isso que o antigo campo `receitaGerada` (total digitado à mão) deixou de existir na v6 —
a migração o converte no primeiro recebimento da lista.

### Pessoal — o quarto pilar

`estado.pessoal.compromissos` guarda o que não é financeiro, faculdade nem projeto: consulta médica,
levar o carro à revisão, um recado qualquer com data. Cada item tem `tipo` (consulta/tarefa/
compromisso/recado/outro), `data`, `local` opcional e `concluido`. Entra no `UI.compromissos()`
unificado com `area: "pessoal"`, então aparece na agenda da home e nos alertas de semana cheia junto
com os outros três pilares — cor própria (`--s-pessoal`, roxo) para não colidir com as demais. Desde a 1.6, também `hora`, `repete`, `lembrete` e `importante` — ver "Delfos 1.6".

### Importar extrato (`importar.js`)

Resolve um problema específico — esquecer de lançar, não falta de conexão com o banco. **De
propósito, não conecta direto a nenhum banco**: exigiria credenciar o Delfos como instituição
receptora no Open Finance Brasil (registro no Bacen, estrutura de compliance) e guardar token de
acesso à conta bancária, uma categoria de dado sensível bem maior que qualquer outra do painel. Em
vez disso, a pessoa exporta o extrato pelo próprio app do banco (sem senha nenhuma saindo do
aparelho dela) e importa; o arquivo é lido só no navegador.

- **Duas partes deliberadamente separadas**: funções puras de leitura (`parseOFX`, `parseCSV`,
  `normalizarData/Valor`, `sugerirCategoria`, `provavelDuplicata` — sem tocar DOM/Store, dá para
  testar isoladas com Node) e o assistente de 3 passos (arquivo+conta → mapear colunas, só CSV →
  revisão e confirmação), que é quem toca `UI`/`Store`/`Financas`.
- **OFX**: regex por campo (`<TAG>valor` até a próxima tag) lê tanto SGML (OFX 1.x, sem
  fechamento de tag de valor) quanto XML (OFX 2.x) do mesmo jeito. Charset: decodifica UTF-8
  primeiro; se sobrar `\uFFFD` (byte inválido), refaz como ISO-8859-1 — banco brasileiro exporta
  nos dois.
- **PDF** (`Importar.lerPDF` no navegador + `parseTextoExtrato`, puro): o pdf.js é carregado por
  `import()` de `vendor/pdfjs/` só quando o arquivo é PDF, com `isEvalSupported: false`. As linhas
  são remontadas pela altura (y) de cada pedaço de texto, colunas separadas por vão largo. Não há
  leitor por banco: vale toda linha com data no começo (dd/mm[/aa], "15 SET", "15 de setembro") e
  valor no padrão brasileiro; linha só com data vira a data das seguintes (Nubank); linha sem valor
  logo depois de um lançamento complementa a descrição. Sinal, em ordem de confiança: escrito
  (-, D/C, +), coluna de saldo (saldo anterior ± valor = saldo da linha), seção (Entradas/Saídas),
  fatura (compra, negativo = crédito), palavras — só esse último marca `incerto` ("confira").
  Saldo, total, limite e vencimento são ignorados (o saldo alimenta a dedução). PDF com senha →
  `motivo: "senha"` e o assistente mostra o campo; PDF de imagem → `motivo: "semTexto"`. Na
  revisão de PDF, data e valor viram campos (`[data-data]`, `[data-quantia]` — não `data-valor`,
  que já é dos botões Despesa/Receita).
- **CSV**: delimitador adivinhado (`;` vs `,`) pela primeira linha; aceita uma coluna "valor" com
  sinal OU um par "entrada"/"saída"; `sugerirMapeamento` chuta o papel de cada coluna pelo nome do
  cabeçalho, sempre revisável antes de continuar. Linha sem data/valor reconhecível é contada e
  pulada, nunca trava a importação inteira.
- **Categoria aprendida do histórico** (`indiceCategoria`/`sugerirCategoria`): vocabulário de
  palavras (≥ 4 letras) por categoria já usada, sem lista fixa de estabelecimentos — evita
  favorecer o comércio de uma região só, e se ajusta ao vocabulário que a própria pessoa já usa nas
  descrições.
- **Duplicata provável** (`provavelDuplicata`): mesmo valor e tipo a até 3 dias de um lançamento
  que já existe → entra desmarcada na revisão, nunca é bloqueada nem some sozinha. Nada é gravado
  sem a revisão passar por `Store.inserir` linha a linha; "Desfazer" no toast remove tudo de uma
  vez pelos ids devolvidos.
- Passa `render` como `aoConcluir` para `Importar.abrirAssistente` (e de novo no `aoAcionar` do
  Desfazer) — `financeiro.js` não escuta `Store.aoMudar` (só `nuvem.js` escuta, para sincronizar),
  então sem isso a tabela ficaria com os dados antigos até a pessoa navegar para outra página.
- Tabela de revisão (`table.tabela-importar`) tem CSS próprio, achando por conflito de especificidade
  com as regras de `table.sheet` no mobile: ambas as classes ficam na mesma `<table>`, e sem
  `tbody` explícito no seletor as regras genéricas (pensadas para colunas só de leitura) ganhavam
  por especificidade e escondiam checkbox/descrição/tipo, que aqui são campos editáveis, não texto.

### A aba Financeiro (`financeiro.js`)

Abre falando: um seletor de mês (‹ setembro de 2026 ›) e a **leitura do mês** na voz, que diz
quanto entrou, quanto saiu, quanto sobrou e o que mais pesou — ou quanto resta do limite, se houver.
Tudo abaixo segue o mês escolhido. Os números vêm de `Financas.analisarMes(chave, prefs)`, que não
toca DOM; `financeiro.js` só decide o que dizer e como mostrar.

- **Faixa**: sobrou/faltou, entrou, saiu (ou % do limite) e saldo nas contas hoje. No mês corrente
  a comparação é "agosto inteiro: R$ X", não porcentagem — comparar meio mês com um mês cheio
  enganaria. Em mês fechado, variação com sinal ("+45% sobre agosto").
- **Para onde foi o dinheiro**: categorias com barra, parte do total, comparação, marca de limite
  por categoria (barra vermelha se passar). Clicar filtra a planilha.
- **Ritmo do mês**: gasto acumulado dia a dia (SVG desenhado na largura real do cartão), o mês
  anterior em cinza, projeção tracejada no mês corrente, linha do limite, mira + dica ao passar o
  ponteiro, e uma frase que repete os números para nada depender do ponteiro.
- **Perguntas do Delfos**: o que falta saber para ler o mês do jeito da pessoa — limite mensal,
  quanto guardar (%), gasto repetido é fixo?, quais categorias são essenciais, dia da renda, limite
  para a categoria que mais pesa, reserva de emergência (3 a 6 meses de gastos), gastos sem
  categoria. Duas por vez; "Agora não" esconde por 14 dias. Respostas vão para
  `preferencias.financeiro` (ver abaixo) e são editáveis em **Limites e preferências**.
- **O que o Delfos notou**: até 6 frases ordenadas por gravidade — dias sem lançar (com atalho para
  importar extrato), uso do limite e quanto dá por dia, meta de poupança, categoria que subiu/caiu,
  peso dos fixos, essenciais × escolhas, fim de semana, maior gasto, saldo até a próxima renda.
- **A pagar** (pendentes de qualquer mês + faturas abertas, com "Pago" e desfazer), **Fixos e
  assinaturas** (`Financas.recorrentes`: mesma descrição, mesmo valor ±5%, em 2 dos últimos 4
  meses — margem curta de propósito, o mercado da semana se repete mas não é fixo), **Maiores
  gastos**, **Entradas e saídas** dos últimos 6 meses.
- **Metas** em cartões: quanto falta, quanto guardar por mês até o prazo (ou em quantos meses fica
  pronta no ritmo do que sobrou), botão **Guardar** (soma ao valor atual, com desfazer).
- **Planilha**: pílulas Tudo/Saídas/Entradas/Pendentes ("Pendentes" ignora o mês), busca, categoria,
  "Todos os meses"; por linha, editar, **repetir hoje** e excluir, e "pendente" vira botão de pagar.

`preferencias.financeiro` (migração **v9 → v10** em `normalizar`; a **v11** acrescentou
`preferencias.faculdade` = `{ mediaMinima, horasEstudo }`, `preferencias.projetos` = `{ metaMensal,
horasDisponiveis }` e `preferencias.dispensadas`, com chave `"<escopo>:<pergunta>"`): `orcamentoMensal`, `orcamentos`
(limite por categoria), `metaPoupanca` (%), `diaRenda`, `essenciais` (lista), `fixos` (chave de
descrição → true/false) e `dispensadas` (pergunta → data do "agora não", ou "sempre"). `null` quer
dizer "ainda não respondido" — é o que faz a pergunta aparecer. `Store.definirPreferencias({
financeiro })` mescla campo a campo; os mapas são sempre passados inteiros.

Contas e cartões e Investimentos ganharam as mesmas abas sublinhadas do alto do Financeiro (Resumo
do mês / Contas e cartões / Investimentos), no lugar do link "← Financeiro".

### Contas, cartões e saldo

- `financeiro.contas` guarda o `saldoInicial` de cada conta; o saldo atual é **calculado**
  (`Financas.saldoConta`) somando os lançamentos com `origem: "conta:<id>"`.
- `financeiro.cartoes` tem `fechamento` e `vencimento` (dias do mês); a fatura aberta é calculada
  por ciclo (`Financas.faturaCartao`) sobre lançamentos com `origem: "cartao:<id>"`.
- Enquanto não houver nenhuma conta cadastrada, vale o `saldoAtual` informado à mão. Assim que
  existe conta, o campo manual some da interface para os dois números não se contradizerem.
- Nunca guarde saldo calculado: ele sempre sai dos lançamentos, para não dessincronizar.
- Cada conta/cartão tem página própria (`conta.html?tipo=conta|cartao&id=`), com os cálculos
  centralizados em `Financas.resumoConta`/`resumoCartao` — não duplique a lógica de saldo/fatura ali,
  só formate o que essas funções já devolvem.

### Gastos fixos (estado v12)

`financeiro.fixos` guarda o que se repete todo mês (aluguel, mensalidade, assinatura): `{ descricao,
valor, dia, categoria, origem, inicio: "AAAA-MM", fim, ativo, geradoAte, nomesExtrato }`. Cadastro
pelo "+ Gasto fixo" do cartão **Fixos e assinaturas** (`financeiro.js`: `novoFixo`, `editarFixo`,
`excluirFixo`), que também lista os repetidos que `Financas.recorrentes` descobriu, com "Cadastrar".

- **Um lançamento por mês.** `Financas.gerarFixos()` (chamado por `UI.iniciarPagina`, idempotente)
  cria, para cada fixo ativo, o lançamento do mês — `fixoId`, `competencia`, `status: "pendente"`,
  no dia do vencimento — do `inicio` até o mês de hoje. `geradoAte` impede recriar o que a pessoa
  apagou de propósito. Pausar remove o pendente do mês; religar não cobra os meses parados.
- **Pendente de fixo não é dinheiro que saiu**: entra na leitura do mês e em "A pagar", mas
  `saldoConta`/`faturaCartao`/`gastoTotalCartao` ignoram (`movimentou`) até virar pago.
- **Nunca contar duas vezes na importação** (`importar.js`, `casarFixos`, função pura): cada linha
  de despesa do extrato é comparada com os lançamentos de fixo ainda não conferidos (`conciliadoEm`
  vazio) do mesmo mês (ou até 10 dias). Casa se o valor bate (≤ 2% ou R$ 1) ou se há palavra em
  comum com a descrição do fixo ou com `nomesExtrato` e o valor está a até 35%. A linha casada
  **não cria lançamento**: atualiza o do fixo com data e valor reais, `status: "pago"`,
  `conciliadoEm`, `descricaoExtrato`. Sem casamento automático, a revisão oferece "É gasto fixo?"
  para a pessoa escolher, e o nome que o banco usou vai para `nomesExtrato` (até 5) — no mês
  seguinte casa sozinho. O selo "fixo: X" é botão: tocar vira "lançar como novo". A checagem de
  repetido ignora o fixo sendo confirmado; um fixo já conferido volta a ser "repetido?" se o mesmo
  extrato for importado de novo. Desfazer devolve os fixos ao estado anterior.
- `Financas.recorrentes` ignora lançamentos com `fixoId` e descrições já cadastradas como fixo.

### Investimentos

`financeiro.investimentos` é separado dos lançamentos do dia a dia — não usa `origem`, não entra no
balanço de contas/cartões. Cada item guarda `valorAplicado` e `valorAtual`; a rentabilidade
(`Financas.rentabilidade`) é sempre `atual − aplicado`, recalculada na hora, nunca armazenada.

### Página por disciplina

Cada disciplina tem `avaliacoes`, `materiais` e `resumos` como listas dentro dela, editadas por
`Store.subInserir/subAtualizar/subRemover`. A média é ponderada pelo `peso` das avaliações com nota
lançada (`UI.mediaDisciplina`). Prazos apontam para a disciplina por `disciplinaId`.

`UI.notaNecessaria(d)` responde "quanto preciso tirar": a nota média (ponderada, escala 0–10) que as
avaliações ainda sem nota precisam ter para a disciplina fechar em `d.mediaMinima` (campo opcional
do formulário, 7 se vazio). Aparece embaixo da média na página da disciplina, com os casos "já
garantida" e "não dá mais" ditos com todas as letras.

### Editor de resumos

O texto de um resumo não é escrito em modal: `resumo.html?disciplina=<id>[&id=<resumo>]` abre uma
página inteira, **sem barra lateral**, só barra de formatação e folha. Sem `id` na URL o resumo é
novo; ao salvar pela primeira vez a URL ganha o id por `history.replaceState`, então salvar de novo
edita em vez de criar outro.

A formatação sai de `document.execCommand` — a única via sem dependência externa. Dois detalhes que
não são gosto, são necessidade:

- **Tamanho da fonte**: o `execCommand` só aceita 1–7, nunca pixels. O caminho é aplicar o tamanho 7
  e trocar os `<font size="7">` resultantes por `<span style="font-size:Npx">`.
- **Botões em `mousedown`, não `click`**: o clique tiraria o cursor do texto antes de o comando
  rodar, e a seleção se perderia.

Colar é sempre como texto puro — **exceto uma imagem** (print, foto copiada), que vira uma imagem
de verdade, não texto: estilo de outra página seria descartado depois pelo sanitizador, e a tela
mentiria até o próximo carregamento.

`resumo.conteudo` passou a ser **HTML** na v7, com `conteudoFormato: "html"` marcando o que já foi
convertido — sem essa marca a migração rodaria de novo a cada carga e escaparia o próprio escape.
Quem exibe o resumo passa por `UI.htmlSeguro()`, que só deixa passar a marcação que o editor sabe
produzir (agora incluindo `<img>`): é o único lugar do painel que renderiza HTML em vez de texto
escapado, e um backup importado pode trazer qualquer coisa.

Os documentos anexados a um resumo ficaram **fora** do editor (botão "Documentos" na disciplina),
para a tela de escrita não ter mais nada além do texto — **imagens são a exceção**: inserir uma
pelo botão "Imagem" da barra, colar ou arrastar solta a imagem de verdade no meio do texto, não um
ícone de arquivo. Por baixo ela é um anexo como outro qualquer (`Arquivos.salvar`, no IndexedDB),
mas fica de fora de `resumo.anexos` — quem sabe quais imagens existem é o próprio HTML
(`<img data-anexo-id="…">`, sem `src`: a URL do blob não sobrevive a um recarregamento).
`UI.resolverImagens(container)` é quem repõe o `src` toda vez que um resumo é exibido — no editor e
na pré-visualização da disciplina (por isso `disciplina.html` carrega as mesmas fontes do editor:
uma imagem sozinha explica por que precisa de `Arquivos`, uma fonte escolhida no texto só aparece
certo se a página também carregou aquela fonte). `salvar()` compara os ids de imagem do conteúdo
antes/depois a cada gravação e apaga do IndexedDB os que sumiram do texto; excluir o resumo inteiro
(`excluir()` no editor, `excluirComAnexos()` na lista da disciplina) limpa o resto.

O seletor de fonte tem, além das de sistema (Georgia, Arial…), um punhado de fontes do Google Fonts
importadas só por `resumo.html`/`disciplina.html` (Merriweather, Lora, Inter, Space Mono, Caveat) —
mais variedade para ler, escrever fórmula ou anotar à mão. É conteúdo do usuário, não design system:
não confunda com a tipografia do painel (`dashboard/DESIGN.md`), que é Funnel Sans + Noto Serif
Display.

### As outras abas no molde do Financeiro (v1.5)

Faculdade, Projetos, Pessoal e cada aba própria abrem do mesmo jeito que o Financeiro: **leitura**
na voz (Funnel Display na 1.5 a 1.7; Noto Serif Display desde a 1.8), faixa de números, **O que o Delfos notou** e **Perguntas do Delfos**. O
cálculo mora em `leituras.js` (sem DOM); os componentes são comuns em `ui.js`:
`UI.renderPerguntas(secao, box, escopo, perguntas, aoMudar)`, `UI.resposta.valor/botoes/multipla`,
`UI.renderNotas(ul, notas, textoVazio)` (nota com `area` e `acao` opcionais), `UI.ordenarNotas` e
`UI.barrasComMeta`. "Agora não" esconde a pergunta por 14 dias (`UI.dispensarPergunta`).

- **Faculdade**: próximas quatro semanas lado a lado, médias por disciplina com a marca da média
  mínima (`preferencias.faculdade.mediaMinima`, que `UI.notaNecessaria` usa quando a disciplina não
  tem a dela), avaliação sem data, horas de estudo por semana.
- **Projetos**: recebido no mês × estimado por projeto, valor por hora (recebido ÷ horas do mês),
  últimos seis meses, meta mensal e horas disponíveis.
- **Pessoal**: linha do tempo agrupada (atrasados, hoje, semana, próximas…), filtro por tipo e aviso
  quando um compromisso cai no mesmo dia de prova ou prazo de outra área.
- **Visão geral**: "O que o Delfos notou" junta só alertas e atenções de todas as abas
  (`Leituras.todasNotas`), com a área de cada uma.

### Abas criadas pelo usuário

`estado.pilares` guarda abas que o próprio Luiz cria pelo botão "＋ Nova aba" da barra lateral. Cada
uma tem `nome`, `icone`, `cor`, `descricao`, `modelo`, `naAgenda`, a lista `campos` (os campos
próprios dela) e a lista `itens`. A página é `pilar.html?id=`, genérica.

A cor é um hex de `Store.PALETA_PILAR`, não um token do tema: aba é dado do usuário, não design
system. Por isso a paleta fica numa faixa de luminosidade média (lê bem nos dois temas), nenhuma
cor é vermelha (reservado para urgência) e nenhuma repete os quatro pilares fixos. O ícone vem de
`Store.ICONES_PILAR` — glifos monocromáticos (geométricos, símbolos, nunca emoji colorido, para não
fugir do cromo sem cor do "oráculo sóbrio") — com bastante variedade, para não repetir sempre os
mesmos doze.

Como a cor vem em hex, ela entra **inline**: `--tint` na página (que `.card.tinted` e `.pillar` já
leem), `style` no ícone da barra e no selo da agenda. Para isso funcionar sem cada renderizador
saber de onde o item veio, todo item de `UI.compromissos()` carrega `areaRotulo` e `cor` — inclusive
os dos quatro pilares fixos, que usam `var(--s-*)`.

**Modelo e campos próprios.** Ao criar uma aba, o Luiz escolhe um modelo em `Store.MODELOS_PILAR`
(Compromissos, Tarefas, Hábitos/rotina, Coleção, Registros com valor, Do zero) — só decide os campos
iniciais e se a aba entra na agenda (`naAgenda`); dá para ajustar depois, sem limite, em "Campos
desta aba" (`UI.editorCampos`), que abre, edita, exclui e reordena os campos um a um. Cada campo é
`{ id, rotulo, tipo, opcoes, obrigatorio, naLista }`, com `tipo` vindo de `Store.TIPOS_CAMPO` (os
mesmos tipos que `UI.campoHTML` já sabe desenhar, mais `simNao`). O modelo só entra no formulário de
**criação** da aba — trocar de modelo depois de já ter itens bagunçaria os campos deles, então a
edição da aba (nome/ícone/cor) nunca mexe em `campos`.

Cada item guarda `descricao`, `data` e `concluido` como campos de sistema — são o que
`UI.compromissos()` precisa para a aba entrar na agenda — e o resto em `extras`, com uma chave por
`campo.id`. `UI.camposItemPilar(pilar)` traduz `pilar.campos` para o formato que `UI.formulario`
entende; `pilar.js` junta esses campos com `descricao`/`data` e depois separa o resultado em
`extras` (`paraExtras`/`deExtras`). Só os campos marcados `naLista` aparecem na linha da listagem.

**Criador com o Delfos (v1.8; na v1.5 era catálogo local + Claude pelo servidor).** "Nova aba" abre
`Abas.abrir()`: nome e **propósito**; a cada pausa de 220 ms o Delfos (`delfos.js`) lê os dois e a
janela mostra "O que o Delfos entendeu" e a prévia. Se a pessoa já mexeu em algo, a leitura nova vira
o botão "Aplicar o que o Delfos entendeu" em vez de sobrescrever. Tudo passa por `Abas.sanear` (só
ícones, cores, tipos, vistas e ids válidos; texto escapado na tela). Os exemplos só viram registros se
marcados. "Personalizar" na página da aba reabre o mesmo modal em modo edição: o propósito volta
editável, e o Delfos só **acrescenta** campos (os que ainda não existem), nunca remove os existentes.
Ver "Delfos 1.8".

Campos novos da aba (todos opcionais, abas antigas continuam funcionando): `rotuloItem` (o nome de
cada registro: "livro", "plantão" — vira o botão "+ Livro"), `checkin` (hábito marcado por dia),
`agruparPor` (id de um campo select: separa a lista e vira pílulas de filtro), `meta = { tipo:
concluidos|soma|checkins, campoId, alvo, periodo: semana|mes|ano }` e `sugeridoPor` (`"ia"` ou
`"local"`). Itens ganharam `criadoEm`, `concluidoEm` e, com `checkin`, `feitos` (lista de datas
ISO; a sequência e os últimos 7 dias saem daí, nunca são guardados). `Leituras.pilar(p)` resume os
campos (distribuição dos selects, soma/média dos números e valores, sim/não) e a meta do período.

Uma aba com `naAgenda: false` (Hábitos, Coleção) não entra na agenda dos 30 dias nem nos alertas de
semana cheia, e os dois cartões de estatística que seriam "Nesta semana"/"Atrasados" viram
"Concluídos"/"Total" — não faz sentido cobrar prazo de um livro que se está lendo.

**O modelo "academia" é especial.** Um modelo de `MODELOS_PILAR` pode carregar `especial: "academia"`
— quando `pilar.modelo === "academia"`, `pilar.js` troca a tela inteira (stats genéricas, lista de
itens, "Campos desta aba") pela de dias de treino, em vez de usar `campos`/`itens` como as outras
abas. Nada disso prescreve treino: o Delfos não é personal trainer, só ajuda a organizar o que o
próprio Luiz decide fazer.

- `pilar.academia = { configuradoEm, objetivo, experiencia, frequenciaSemanal, divisao }` — um
  questionário rápido (`abrirQuestionario` em `pilar.js`) roda na primeira vez que a aba é aberta
  (`configuradoEm` vazio) e pode ser refeito depois pelo botão "Refazer o questionário inicial" em
  "Ajustes da aba". Refazer só atualiza esses campos — nunca mexe em `pilar.dias`, que o usuário edita
  direto na tela.
- A sugestão de divisão (`Store.sugerirDivisaoAcademia`, a partir da frequência semanal) e os nomes de
  dia sugeridos (`Store.diasSugeridosAcademia`) vêm de achados com razoável consenso na literatura de
  treinamento de força — cada grupo muscular treinado ~2x/semana tende a render tanto ou mais que 1x,
  no mesmo volume total — mas são só o ponto de partida do passo 2 do questionário: o Luiz escolhe
  livremente a divisão final (`Store.ACADEMIA_DIVISOES`), e os dias criados a partir dela podem ser
  renomeados, apagados ou criados do zero a qualquer momento.
- `pilar.dias = [{ id, nome, exercicios: [{ id, exercicioId, cargaAtual, unidade, seriesAtual,
  repeticoesAtual, recorde }] }]` — cada dia é um molde de treino (não uma data), e `exercicioId`
  aponta pro catálogo em `exercicios.js` (`const EXERCICIOS`, ~90 exercícios comuns com `id`, `nome`,
  `grupo`), carregado só por `pilar.html`. O Delfos nunca sugere qual exercício fazer: o Luiz busca
  por texto no catálogo (`catalogoOpcoes()`, campo `tipo: "buscaSelect"` — ver abaixo) e anota o que
  já está fazendo. Editar um exercício com carga maior que o recorde anterior atualiza o recorde
  sozinho ("Novo recorde pessoal!"); `pilar.itens` continua vazio e sem uso neste modelo.
- `renderResumoGrupos` soma, por grupo muscular, as séries de todo exercício cadastrado nos dias —
  não é meta nem recomendação (o Delfos não prescreve treino), só agrega o que já foi anotado
  exercício a exercício, pra responder "quantas séries eu faço de perna" sem precisar somar na mão.
- Migração v8 → v9 (`normalizar` em `store.js`): uma aba com `modelo === "academia"` sem `academia`
  ganha os valores em branco — a presença de `academia` é a marca que impede a conversão de rodar de
  novo. `novaAba()` (`ui.js`) e a sugestão "Academia" do assistente de boas-vindas (`bemvindo.js`)
  inicializam `academia`/`dias` na criação; os dias já saem prontos assim que o questionário é
  confirmado, sem precisar de um passo extra.

**Campo `buscaSelect`.** Como `select`, mas para catálogos grandes demais pra rolar numa lista só —
`UI.campoHTML` desenha um `<input list>` + `<datalist>` nativos (sem biblioteca) mais um campo
escondido (`nome`, sem `__busca`) que é quem carrega o valor de verdade; `UI.formulario` mantém os
dois em sincronia. Escolher uma sugestão do `<datalist>` sempre resolve; digitar um texto que ache
exatamente **uma** opção também resolve (por exemplo, só o nome do exercício, sem o grupo na
frente); ambíguo ou sem bater com nada, o campo fica vazio até a pessoa completar a busca. Único uso
hoje é `exercicioId` em `pilar.js`.

### Perfil, ocupação e as abas fixas ligáveis

`estado.perfil` guarda identidade (nome, `dataNascimento`, `pronomes`, telefone, e-mail, cidade,
`foto`), ocupação (`ocupacao` em texto livre, `tipoOcupacao`: `estudo`/`trabalho`/`ambos`/`outro`),
vida acadêmica (curso, instituição, semestre, matrícula, `ingresso` — só relevante para quem estuda)
e dois textos livres (`bio`, `objetivos`). A foto é uma data URL: `UI.redimensionarFoto` recorta o
centro em quadrado e reduz para 256px em JPEG antes de salvar, para caber com folga no localStorage.
Sem foto, o avatar mostra as iniciais do nome. A idade sai de `UI.idade(dataNascimento)`, nunca é
guardada. `perfil.configuradoEm` fica vazio até o assistente de boas-vindas rodar (ou "Pular" ser
tocado) — é o que decide se ele aparece.

`estado.preferencias.abasFixas` guarda, para cada um dos quatro pilares fixos (`pessoal`,
`financeiro`, `faculdade`, `projetos`), `{ ativo, rotulo }`. `rotulo` vazio segue o nome padrão —
só grava algo quando o Luiz escolhe um nome diferente, para continuar seguindo o padrão se ele
mudar depois. Desligar uma aba fixa só a tira da barra e dos cartões da visão geral: nada é
apagado, e quem abre um link direto para uma página desligada (`faculdade.html` etc.) vê um aviso
no topo com atalho para religar (`UI.avisarSeAbaDesligada`, chamado por `UI.iniciarPagina`).

`personalizacao.js` centraliza a leitura desses dois ramos do estado: `Personalizacao.abasFixas()`,
`rotuloAba(id)`, `abaAtiva(id)`, `ocupacaoResumo()`, `eEstudante()`, `saudacao()`. `UI.paginas()` (a
barra lateral) e `home.js` (os cartões da visão geral) leem daqui, nunca direto do estado — para as
duas telas nunca ficarem dessincronizadas sobre quais abas estão ligadas ou como se chamam.

O cartão de perfil (`UI.abrirPerfil(aba)`) abre pelo botão com foto e nome **no pé da barra
lateral** e é **o único lugar de configuração do painel**. Tem três abas internas: **Sobre você**
(números, ficha, textos), **Painel** (tema escolhido por amostra; abas fixas com ícone, nome
editável e interruptor `.switch`, tudo na hora, sem "Salvar") e **Conta e dados** (sincronização,
backup, "Refazer configuração inicial", sair). A própria foto é o botão de trocar a foto.
`abrirPerfil` aceita a aba a abrir (reabre na mesma depois de trocar a foto) e ignora qualquer outro
argumento — o botão da barra o chama por `() => abrirPerfil()`, senão o evento de clique viraria o
nome da aba. O alto da barra guarda só a marca (logotipo + versão), que leva à visão geral.
Depois de gravar, `abrirPerfil` chama `montarLayout` de novo para a barra refletir a mudança
na hora — por isso `ui.js` guarda a página ativa em `paginaAtiva`/`opcoesAtivas`. `camposPerfil()`
omite a seção "Vida acadêmica" quando `Personalizacao.eEstudante()` é falso — ela decide na hora de
abrir o formulário, não reage a trocar `tipoOcupacao` dentro do mesmo formulário.

Formulários longos (o de perfil, o do projeto) usam o tipo de campo `secao`, que só desenha um
título divisor e não guarda valor, e a opção `largo: true` para abrir o modal mais largo.

### O assistente de boas-vindas

`bemvindo.html` + `bemvindo.js` é a primeira tela — sem barra lateral, mesmo gesto do editor de
resumo. `UI.iniciarPagina()` redireciona para lá sempre que `Personalizacao.precisaConfigurar()`
(ou seja, `perfil.configuradoEm` vazio); `bemvindo.js` nunca chama `iniciarPagina`, então não há
loop. Quatro passos — identidade, ocupação, abas (com pré-marcação de `Personalizacao.sugerirAbas`
conforme `tipoOcupacao`, só na primeira configuração), ajustes finais — e "Pular por enquanto" a
qualquer momento, que só carimba `configuradoEm` sem tocar em mais nada. A mesma tela serve para
reconfigurar (botão no perfil): reabrindo, ela pré-preenche com o que já está salvo, e pula a
pré-marcação automática das abas para não sobrescrever uma escolha que o Luiz já fez.

No passo das abas, além das quatro fixas, `bemvindo.js` oferece uma lista de **sugestões de abas
sob medida** (`SUGESTOES_PILAR`: Academia, Religião, Esporte) — mesma UI de marcar/renomear das
abas fixas, mas cada marcada vira de fato uma aba nova (`Store.inserir("pilares", …)`) ao concluir,
com o modelo já definido por sugestão. O nome é editável na hora, o que serve tanto para ajustar o
rótulo (ex.: "Esporte" → "Corrida") quanto para o caso geral de qualquer sugestão. Só aparece na
**primeira configuração** — reabrir pelo perfil não oferece de novo, para não arriscar recriar uma
aba que o usuário já tenha apagado por não querer.

### Anexos

Materiais e resumos de uma disciplina têm `anexos: []`. Cada item é só a **ficha** do arquivo
(`{ id, nome, tipo, tamanho, salvoEm }`) — o conteúdo mora no IndexedDB, via `arquivos.js`.

Foi o localStorage que obrigou essa divisão: ele guarda ~5 MB no total e só texto, e um PDF de aula
estoura isso sozinho. O IndexedDB aceita centenas de MB e guarda o arquivo como está.

- No formulário, o tipo de campo `anexos` (`UI.campoHTML` + `UI.ligarAnexos`) mostra a área de
  arrastar. Os arquivos escolhidos ficam **na memória até o Salvar**, então cancelar não deixa lixo.
- `Store.exportar()`/`importar()` são **assíncronos** porque juntam os anexos em base64 no `.json`:
  um backup sozinho tem de bastar para reconstruir tudo em outro navegador.
- Ao excluir um material ou resumo, os arquivos só somem depois que a janela do "Desfazer" passa
  (`excluirComAnexos`), senão desfazer devolveria a ficha sem o PDF.

### Importar do Google Drive na disciplina

`disciplina.html` carrega os mesmos scripts do Google que `faculdade.html`/`financeiro.html`
(`config.js`, `api.js`, `gsi/client`, `google-integration.js`), então reaproveita a mesma sessão
OAuth — não pede para conectar de novo se o usuário já autorizou em outra página da mesma aba.

`google-integration.js` expõe `driveConectado()`, `driveBuscarArquivos(termo)` e
`driveExportarTexto(fileId)` como funções soltas no escopo global do documento (script clássico, não
módulo) — `disciplina.js` as chama direto pelo nome. `aoConectar(fn)` registra um callback de
"rodar assim que a autorização terminar", usado para reabrir o seletor de arquivos depois do login.
Um Google Docs vira **resumo** (texto exportado via `files.export`); qualquer outro arquivo vira
**material** com o `webViewLink` como URL.

### Onde os dados vivem — importante

Tudo que Luiz cadastra fica no **localStorage do navegador**, não no repositório. Ele cadastra pelas
telas (botões "+ Lançamento", "+ Prazo", "+ Disciplina", "+ Projeto"), sem tocar em código.

- `dashboard/data.js` é só o seed inicial: é lido **uma única vez**, quando o navegador ainda não tem
  dados salvos. Alterar esse arquivo **não** muda o que Luiz já vê.
- Para levar dados entre computadores ou fazer backup, use o botão **Backup e dados** na barra
  lateral (exporta/importa um `.json` com o estado completo e os anexos). Com as contas ligadas, os
  dados já acompanham a conta em qualquer aparelho; o backup continua como cópia fora do servidor.
- Ao mudar o formato do estado, trate a migração em `store.js` (`normalizar`, que roda em toda carga
  e precisa ser idempotente). Nunca troque a chave do localStorage: isso apagaria os dados de quem
  já usa. A conversão é gravada assim que a versão salva difere da atual (versão atual do estado: **13**).

### Delfos 1.6

**Formulários (`UI.formulario`).** Um desenho só para toda janela de cadastro: cabeçalho com ícone
(`icone`, `cor`), campos curtos lado a lado (`CURTOS`/`larguras`: pares vizinhos de data, número,
dinheiro, select, hora, estrelas), `select` com até 5 opções curtas vira pílulas (`chipsDoSelect`,
ou `chips: true`), data com atalhos e por extenso, `dinheiro` aceita conta (`avaliarDinheiro`:
"45+12,90"), erro no próprio campo (`.tem-erro`), `rotuloExcluir`/`aoExcluir` no rodapé, `Enter`
salva e `Esc` fecha. Tipos: text, textarea, select, buscaSelect, segmento, anexos, date, **time**,
simNao, dinheiro, number, **estrelas** (1–5; o HTML vem de 5 para 1 e a linha é invertida no CSS,
para `~` acender as da esquerda) e **link** (completa `https://`; só aceita o que `linkSeguro`
aceita — http, https, mailto).

**Novo lançamento (`lancamento.js`).** Substitui o antigo `camposLancamento`. Sugere pela descrição a
partir do histórico (`Lancamento.historico`), ordena categorias por uso (`categoriasPorUso`),
`Store.adicionarCategoria` cria uma ali mesmo, data futura vira pendente, parcelas criam N
lançamentos, "repetir todo mês" cria um `financeiro.fixos` e chama `Financas.gerarFixos`.

**Perfil e `preferencias.experiencia` (estado v13).** Cinco abas no perfil (sobre, aparência,
painel, rotina, conta). `experiencia` = `{ tamanho, densidade, destaque, movimento, desempenho (1.8), voz, contadores,
paginaInicial, semanaComeca, ordemAbas, home: {topo, pilares, notas, agenda, insights}, lembretes:
{antecedencia, navegador, resumoDoDia} }`; `Store.definirPreferencias({ experiencia })` mescla, e
`home`/`lembretes` campo a campo. `UI.aplicarAparencia` põe cada escolha como `data-*` no `<html>`
(o CSS lê dali); o tema "auto" segue `prefers-color-scheme`. `paginaInicial` só redireciona na
primeira página da visita (`sessionStorage["delfos.visita"]`). `?` abre os atalhos de teclado.

**Editor de resumos.** Barra em grupos (texto, parágrafo, inserir, ferramentas): estilos de
parágrafo, cor, marca-texto, tachado, sub/sobrescrito, listas de tarefa, tabela, divisor, caixas de
destaque (`data-tipo` nota/dica/importante/atenção — o rótulo vem do CSS `::before`, nunca do
texto), buscar e substituir (CSS Custom Highlight API), sumário, folha (largura, papel, entrelinha —
tokens próprios em `.editor-folha[data-papel]`, independentes do tema do painel), modo foco e
exportar. **`UI.htmlSeguro` roda num documento inerte (`DOMParser`)**: num `div` solto, o
navegador já disparava `onerror` de `<img>` antes da limpeza. Script, style, iframe, svg e afins
somem inteiros (não só a tag); `style` só com propriedades e valores da lista (`ESTILOS_OK`).

**Calendário e lembretes (Pessoal).** Compromisso ganhou `hora`, `repete` (`semanal`/`mensal`/
`anual`, `UI.REPETICOES`), `repeteDesde` (primeira data da série — é dela que se conta, para "todo
dia 31" não virar 28 depois de fevereiro), `repeteAte` (vindo de um .ics), `lembrete` ("" = o do
perfil, "0".."7" dias, "nenhum") e `importante` (avisa também 7 dias antes).

- `UI.rolarRecorrentes()` (em `iniciarPagina`) leva a data de um repetido que passou para a próxima
  ocorrência; concluir um repetido na lista faz o mesmo. `UI.ocorrenciasEntre` projeta a série no
  calendário. Nada disso cria itens novos: é um registro só, que anda.
- `UI.lembretesAgora()` junta `UI.compromissos()` e `Financas.pendentes()` na janela de antecedência.
  `verificarLembretes` (600 ms depois de `iniciarPagina`) abre o **resumo do dia** uma vez por dia
  (`localStorage["delfos.resumoDoDia"]`) e, com permissão, notificações do navegador (uma por item
  por dia, `delfos.avisados`, e de novo 1 h antes do que tem hora). Sem servidor de push: só avisa
  com o Delfos aberto numa aba — dito com todas as letras na tela.
- **Importação** (`Calendario.abrirImportacao`): pergunta a fonte (arquivo .ics, .ics no Drive,
  Agenda do Google) e sempre passa por revisão. `parseICS` desdobra linhas, lê `TZID` (converte do
  fuso do evento pelo `Intl`), UTC e dia inteiro, ignora cancelados e exceções (`RECURRENCE-ID`) e
  só copia repetição simples (semanal/mensal/anual sem intervalo); o resto entra só na primeira data
  com o selo "repetição não copiada". Passados e já importados (`origemImport` = UID, ou mesma data
  + título) entram desmarcados. A pergunta "Quer trazer os compromissos de outro calendário?" some
  depois que algo foi importado.
- `google-integration.js` ganhou `googleComConexao(fn)`, `driveListarCalendarios`,
  `driveBaixarTexto` e `agendaListarEventos` (escopos que já existiam: `calendar.readonly` e
  `drive.readonly`). Desde a 1.8, `api.js` e `gsi/client` não estão mais no HTML: quem os baixa é
  `carregarGoogle()` (ver "Delfos 1.8").
- Preferências só deste navegador: `delfos.pessoal.vista` (calendário ou lista). Não são dados.

**Abas próprias: vistas e layout.** `pilar.visual = { vista, ordem, leitura, numeros, lateral,
perguntas }` (opcional; sem ele, a aba é como antes). Vistas: lista, cartões, quadro (colunas pelo
`agruparPor`, ou aberto × concluído; arrastar ou "mover para" mudam o valor), tabela (todos os
campos menos textarea, cabeçalho ordena só na visita) e calendário (`Calendario.gradeDoMes`, por
isso `pilar.html` carrega `calendario.js`). Abas de check-in só têm lista e cartões. Ordem: padrão,
data, recentes, A–Z ou `campo:<id>` de número/dinheiro/estrelas/data. "Layout e exibição" também
liga/desliga `naAgenda`. Quadro, tabela e calendário usam a largura toda (`.so-lista`) e a coluna
lateral desce.

### Delfos 1.7: a repaginação

Pedido do Luiz: "menos cara de IA", mais estilizado e moderno, mantendo a ideia do oráculo. Feita com
as skills de design instaladas na sessão (design-taste-frontend, redesign-existing-projects,
high-end-visual-design, minimalist-ui, stitch-design-taste, gpt-taste, as de imagem e
full-output-enforcement), auditada pela web-design-guidelines e testada com playwright-cli. A
direção completa, com tokens e proibições, está em `dashboard/DESIGN.md`.

- **A leitura é o título.** Em página com `.leitura` visível, o `h1` vira cabeça corrida (fonte
  pequena, ícone da aba na cor dela, posto por `UI.marcarCabeca` a cada `montarLayout`) e a leitura
  vem grande em Funnel Display. O tamanho segue o comprimento da frase: `UI.ajustarLeitura` põe
  `data-tam` (g, m, p, pp). Quem detecta é o `MutationObserver` de `iniciarPagina` (`passarTextos`,
  uma vez por quadro), então nenhuma página precisa chamar nada. A mesma passada roda
  `UI.dinheiroGrande` em `.stat-value`/`.hero-value`: "R$ 6.239,10" vira R$ e centavos menores. O
  sinal sai de antes do R$ e cola no número: "-R$ 48,83" vira "R$ −48,83", com o sinal de menos de
  verdade (U+2212, desenhado pela Funnel Display na altura dos algarismos) em `.sinal.menos`,
  vermelho de aviso. Nada lê o texto desses números de volta, então a troca é só de exibição.
  O mesmo vale em todo o painel: `fmt.moeda` (e `fmt.moedaCurta`) escrevem o negativo com U+2212 em
  vez do hífen do Intl; o hífen deixava o navegador quebrar a linha entre o sinal e o "R$". Sinal
  escrito à mão antes de um valor também é "−". `lerDinheiro`/`avaliarDinheiro` aceitam os dois.
- **Sem serifa.** `--font-voz` é Funnel Display (link do Google Fonts em todas as páginas; Newsreader
  saiu). A preferência "Fonte da leitura e dos títulos" mostra Display/Texto, mas os valores
  guardados continuam `serifa`/`sans` (nomes da 1.6, sem migração).
- **Ícones Phosphor** (regular, MIT, `vendor/phosphor/LICENSE`), copiados para `ICONES` em `ui.js` e
  `ICONES_ED` em `resumo.js` (miolo de `<svg viewBox="0 0 256 256" fill="currentColor">`). Só o
  ônfalo continua desenho próprio (`MARCA`, em traço). Estrela de nota tem as duas versões (vazia e
  cheia, classe `cheia`). Os ícones de área em CSS (`--ic-pessoal` etc., `--ic-cartao`) são data
  URIs do Phosphor usadas como máscara: `.swatch.<pilar>`, `.eyebrow.<pilar>`, `.badge.<pilar>`,
  `.nota-area` (quando a cor é `var(--s-*)`) desenham o ícone no lugar do pontinho. `.swatch` com
  `style` inline (cor de aba própria) continua ponto. `realcarBotoes` troca o glifo inicial de
  `.btn`, `.voltar` e `.editor-voltar` ("+ ", "← ", "⇩ ") e botões só com "↑"/"↓" por ícone.
- **Selo das abas** (`UI.seloAba`): na barra lateral, na folha "Mais" e na lista de abas do perfil,
  toda aba (fixa ou criada) tem o mesmo selo: quadrado de 26px, raio 8, fundo a 14% da cor da aba
  com fio a 12%, ícone na cor dela; a aba aberta fica com o selo cheio (ícone em `--sobre-claro`
  nas fixas, branco nas criadas, cujo hex é de tom médio). A cor vem de `--cor-aba` (classe do
  pilar nas fixas, hex inline nas criadas); a Visão geral, sem pilar, é `.geral` (grafite, cheia em
  osso). O ícone é **em duas camadas** (`UI.iconeDuo`): o contorno de `ICONES` mais o corpo do
  Phosphor duotone, guardado em `CORPOS` (a forma cheia, `class="corpo"`, opacidade pelo CSS: 20%
  em repouso, 30% no selo cheio). Onde o contorno do duotone difere do regular, a entrada de
  `CORPOS` começa com "=" e traz o desenho inteiro. `iconeAba(valor, true)` faz o mesmo para as
  abas criadas; glifo digitado continua glifo. Na barra do celular o ícone vai solto (cinza, e na
  cor da aba quando aberta, com o corpo a 35%), e a cabeça corrida e o índice "Suas abas" usam o
  mesmo ícone de duas camadas. O selo é `aria-hidden`: o nome da aba já está ao lado.
- **Menos caixa.** Toda faixa `.g3`/`.g4` de `.stat-value` virou razão aberta (fios, sem fundo).
  `.badge` é texto colorido, não pílula. Cartão só com estado vazio fica com contorno tracejado. O
  calendário do Pessoal não tem caixa em volta. Barras de comparação (`.chart-track`, `.cat-barra`)
  não têm trilho; metas e limites (`.meter-track`) têm.
- **Visão geral** (`index.html` + `home.js` reescritos): saudação dentro da leitura
  (`.saudacao`), razão `#sec-topo` (saldo, sobrou/faltou no mês, próximo compromisso, a pagar),
  agenda `#sec-agenda` agrupada (atrasado, esta semana, semana que vem, "Semana de…") com o dia do
  mês grande e a marca "Semana cheia" vinda de `UI.conflitos()`, cada linha levando à página de
  origem (`destino()`); `#sec-notas` e `#sec-insights` ("Em números", `<dl class="figuras">`) na
  coluna lateral; `#sec-abas` com o índice `#pilares` (as linhas continuam `.pillar`, que os
  testes contam). A pilha de avisos `#avisos` saiu. O perfil (Painel → A visão geral mostra)
  continua escondendo topo, pilares, notas, agenda e insights pelas mesmas chaves.
- **Celular (até 900px)**: `.sidebar` vira só o topo (marca e retrato); a navegação é `.tabbar`,
  fixa embaixo, com as quatro primeiras abas de `paginas()` e "Mais" (`abrirMaisAbas`, folha que
  sobe de baixo com todas as abas, Nova aba e Perfil). A aba aberta sempre aparece na barra. Área
  segura com `viewport-fit=cover` e `env(safe-area-inset-*)`; `scroll-padding-bottom` para a
  barra não cobrir o campo focado.
- **Acessibilidade** (auditoria web-design-guidelines): `abrirModal` dá nome à janela
  (`aria-labelledby` no `.modal-title`), põe o foco dentro, faz o Tab circular só nela (só a
  janela de cima responde a Esc/Tab) e devolve o foco a quem abriu; `UI.formulario` só foca o
  primeiro campo com mouse (no celular abriria o teclado); avisos (`.toasts`) com
  `role="status" aria-live="polite"`; "Pular para o conteúdo" (`ligarPular`); `theme-color`
  acompanha o tema (`UI.tema.pintar`); buscas com `aria-label`; `fmt.data` por
  `Intl.DateTimeFormat`; `translate="no"` na marca; `touch-action: manipulation`;
  `overscroll-behavior: contain` nas janelas.
- **Texto**: sem travessão no texto visível (ponto, dois-pontos, ponto e vírgula ou parênteses);
  valor vazio é "-". Títulos de avaliação na agenda são "Prova 1, Farmacologia"; metas,
  "Meta: …". `UI.urgencia` diz "atrasado há 3 dias".

### Delfos 1.8: a IA própria e o modo leve

Pedido do Luiz: uma IA própria, chamada Delfos, sem chat, que ao criar uma aba lê o que ele escreveu,
entende o propósito e monta a página; e o painel o mais leve possível para computador fraco.

**O Delfos (`delfos.js`).** Não é modelo de linguagem: é processamento de linguagem clássico para o
português, feito para rodar em milissegundos no navegador, sem rede e sem mandar nada para fora.
`Delfos.entender({ nome, proposito, usadas, existentes })` devolve `{ sugestao, entendeu, assunto,
confianca }`; `sugestao` tem o formato do criador (icone, cor, descricao, rotuloItem, naAgenda,
checkin, especial, campos, agruparPor, meta, exemplos, visual `{ vista, ordem }`, proposito).

- **Texto**: `plano` (minúsculas sem acento, mesmo tamanho), `normal` e `radical` (plural e
  terminações comuns, nunca menos de 4 letras). O acento dos rótulos volta pelo `dicionario` das
  palavras que a pessoa escreveu.
- **Assunto** (`ASSUNTOS`, ~40 domínios com molde de aba): cada radical conta uma vez por assunto, o
  nome pesa o dobro do propósito e dá bônus; `soNome` marca palavras que só valem no nome ("meta" no
  propósito é a meta da aba, não o assunto "metas").
- **Conceitos de campo** (`CONCEITOS`): gatilhos indexados pela primeira palavra (`POR_PRIMEIRA`); o
  gatilho mais longo ganha o trecho ("se já paguei" é sim/não, não valor); `naoDepois` evita "por
  ano" virar campo Ano; `rotulos` trocam o nome pelo gatilho ("quanto recebi" vira "Valor recebido").
- **Listas** (`acharListas`): entre parênteses e depois de dois-pontos (opções da palavra de antes,
  ou campos se metade dos itens é campo), enumeração solta (campos se aberta por "com", "registrar",
  "só"… ou se metade é campo; senão viram exemplos para começar). Data, prazo, vencimento numa lista
  são a data do registro (`DE_SISTEMA`), não campo. Pedaços de sinal ("em tabela", "sem…") saem.
- **Negação** ("sem horário", "não preciso de valor", "sem meta"), **jeito** (`SINAIS`: marcar por dia,
  agenda, vistas, ordens), **meta** (`acharMeta`: número, unidade e período; "por dia" vira ×7 por
  semana), **rótulo do registro** ("cada plantão"), ícone por radical quando não há assunto, cor que
  evita as das outras abas.
- Com lista de campos escrita, valem esses campos (mais os ditos com todas as letras em outro trecho,
  `forte`); sem lista, os do molde do assunto mais os citados. Academia só abre a tela de treinos se a
  pessoa não descreveu outra coisa.
- Testes: `node` com o arquivo direto (`module.exports` no fim). Os de regressão ficaram fora do
  repositório (não há pasta de testes do painel); ao mudar o motor, rode frases reais de antes e de
  depois e compare.

**Criador** (`abas.js`): ver "Criador com o Delfos". `criar` grava `proposito`, `visual`
(`vista`, `ordem`), `exemploItem` (o placeholder do "+ Item" na página da aba, que não carrega mais
o criador) e `sugeridoPor: "delfos"`. A página da aba mostra o propósito em "Ajustes da aba"
(`#proposito-aba`) e diz "montada pelo Delfos".

**Desempenho.** Medido com a CPU 6x mais lenta (Playwright + CDP), contra a `main`:
- **Google sob demanda** (`google-integration.js`): `api.js` e `gsi/client` saíram do HTML. Vêm por
  `carregarGoogle()`: ao passar o mouse/focar o botão de conectar, ou sozinhos 2,5 s depois do `load`
  com a página quieta (`requestIdleCallback`), nunca no modo leve. As descrições das APIs (Agenda,
  Drive) só depois da autorização (`carregarApis`). Clique antes de a biblioteca chegar: carrega e
  pede o token; se o navegador barrar a janela (`popup_failed_to_open`), avisa para clicar de novo.
  Resultado: texto da página pronto 19% a 24% mais cedo em Pessoal, Financeiro e Faculdade.
- **Scripts sob demanda** (`UI.carregarScript`, `UI.abrirCriadorDeAbas`, `UI.prepararCriador`):
  `delfos.js` e `abas.js` saíram das 11 páginas; vêm no primeiro "Nova aba"/"Personalizar" (ou ao
  passar o mouse no botão). Sem rede, "Nova aba" cai no formulário simples de modelos.
- **Formatadores** (`FORMATOS` em `ui.js`): `fmt.moeda`/`fmt.decimal` criam o `Intl.NumberFormat` uma
  vez (era um por valor; no Financeiro, 52 ms → 14 ms na CPU lenta).
- **Medidas fora do desenho**: o indicador das abas e o trilho da escolha única medem no próximo
  quadro e juntam mudanças num quadro só; o gráfico de ritmo do Financeiro desenha num
  `requestAnimationFrame` depois do resto (91 ms → 47 ms). `html:has(.tabbar)` virou
  `:root[data-barra="sim"]` (posto por `montarLayout`).
- **Modo leve** (`preferencias.experiencia.desempenho`: `auto` | `leve` | `completo`, no perfil em
  Aparência → Desempenho; sem migração, o padrão `auto` entra pela mescla de `normalizar`).
  `UI.aplicarAparencia` põe `data-leve` no `<html>`; `auto` liga com até 4 núcleos, até 4 GB
  (`navigator.deviceMemory`) ou economia de dados (`UI.aparelhoFraco`). No CSS (seção "Modo leve"):
  sem `backdrop-filter`, sem sombras grandes, sem a luz fixa do alto, animações e transições a
  0,01 ms (não zero, para os eventos de fim seguirem chegando). No JS, `semMovimento()` inclui o
  modo leve (sem luz do mouse, sem destaques deslizantes) e o Google não vem sozinho.

### Delfos 1.8: a marca

Pedido do Luiz: o quadro da identidade (logotipo "Delfos" numa serifa clássica, marfim sobre preto,
ícones de app com o logotipo, assinatura "Organização para o que importa" com um fio curto em cima,
paleta preto `#0B0B0B`, carvão `#1F1F1F`, grafite `#3A3A3A`, marfim `#EDE9E1`, cinza quente
`#D6D1C7`) aplicado ao site inteiro, "compatível com a logo e o mais harmônico possível".

- **Logotipo** (`LOGOTIPO` em `ui.js`): o maior "Delfos" do quadro, recortado, ampliado 6x e
  vetorizado com potrace (um caminho só, viewBox `0 -1 530 166`, coordenadas com uma casa decimal).
  `UI.logotipo(classe)` devolve o SVG em `currentColor`, `aria-hidden`; quem o põe dá o nome
  (`aria-label` no link da barra, `role="img"` no `h1` da entrada e das boas-vindas, que têm o
  caminho copiado no HTML porque desenham antes do script). O rodapé do editor de resumos recebe o
  logotipo de `resumo.js`. Se a marca mudar, refaça o traçado a partir da imagem nova; não troque
  por texto numa fonte parecida.
- **D** (`MARCA.delfos`, `icone("delfos")`): os dois contornos do D do mesmo traçado. Substituiu o
  ônfalo desenhado à mão (no título "O que o Delfos entendeu" e no favicon).
- **Favicon** (`favicon.svg`, D marfim em quadrado preto de raio 7,5/32, com traço do mesmo tom para
  os fios finos não sumirem em 16px) e **ícone da tela inicial** (`apple-touch-icon.png`, 180px, o
  logotipo inteiro em marfim sobre preto; `<link rel="apple-touch-icon">` em todas as páginas).
- **Voz**: Noto Serif Display no lugar da Funnel Display, escolhida desenhando "Delfos" em mais de
  90 famílias de serifa do Google Fonts e comparando com o recorte do quadro (proporção, altura de
  x, contraste, D, "f", "s"), depois em frase, dinheiro e título reais. A finalista Playfair saiu
  pelos algarismos antigos. Pesos e espaçamento foram recalibrados regra a regra (a serifa vai
  leve e quase sem espaço negativo). A preferência "Fonte da leitura e dos títulos" agora diz
  Serifa / Sem serifa (valores `serifa`/`sans` de sempre).
- **Paleta** nos tokens dos dois temas (ver Direção visual), nas amostras de tema do perfil, na seta
  do select, nas sombras e no fundo das janelas. O destaque padrão (`osso`) agora se chama Marfim
  na tela; o valor guardado não mudou. As cores dos pilares não mudaram: passaram de novo no
  validador sobre os fundos e superfícies novos.
- **Assinatura** (`.assinatura` dentro de `.marca-bloco`): só em `entrar.html` e `bemvindo.html`.
- Auditoria web-design-guidelines nos arquivos tocados: `theme-color` passou a ser o fundo da
  página (`#111110`/`#ede9e1`), a entrada e as boas-vindas ganharam `h1` (o logotipo), aspas e
  reticências tipográficas no texto da divisão "livre" da academia.

### Direção visual

**"Marfim" (v1.8)**: o detalhe completo, com a marca, tokens, paleta validada e proibições, está em
`dashboard/DESIGN.md`, a referência a consultar antes de mexer em qualquer coisa visual.

O princípio, em uma linha: **a leitura é o título e nada vira caixa sem motivo**; o caráter vem de
tipografia, espaço e hierarquia, na voz e nas cores do logotipo. Cinco execuções anteriores foram
descartadas e estão descritas no DESIGN.md (estúdio, azulejo baiano, oráculo sóbrio 1.2–1.3, a
segunda leitura 1.4–1.6 e a consulta 1.7, sem serifa).

- **Marca**: o logotipo é desenho (`LOGOTIPO` em `ui.js`, `UI.logotipo()`), nunca "Delfos" digitado
  numa fonte parecida. O D sozinho é `icone("delfos")` e o favicon; `apple-touch-icon.png` é o
  logotipo em marfim sobre preto. A assinatura (caixa alta espaçada, fio curto em cima) só aparece
  na entrada e nas boas-vindas.
- **Tipografia**: **Noto Serif Display** (só o eixo de peso, 300 a 600) é a voz (leitura, título de
  página sem leitura, títulos de seção e de janela, números grandes, o dia na agenda). **Funnel
  Sans** é todo o resto. Algarismos alinhados (a voz já os tem por padrão); tabular (`.num`) só onde
  números se alinham. Espaço entre letras quase nenhum: a serifa de exibição já vem justa.
- **Cromo sem cor**: a paleta da marca, preto `#0b0b0b` (`--lateral`), carvão `#1f1f1f`, grafite
  `#3a3a3a`, marfim `#ede9e1` (o texto no escuro, o fundo no claro) e cinza quente `#d6d1c7`;
  `--fundo` escuro `#111110`. Primário e foco em marfim. Cor só identifica pilar (`--s-*`),
  distingue entradas × saídas (`--serie-entrada` azul, `--serie-saida` bronze) e marca urgência
  (`--st-critical`). O escuro é o padrão; o claro (marfim) é escolha explícita em
  `[data-theme="light"]`. `theme-color` acompanha o fundo (`#111110` / `#ede9e1`).
- **Raio por hierarquia**: janela 22, superfície 16, controle 10, miúdo 6, pílula só para escolha.
  **Abas sublinhadas** (`.abas`) para seções irmãs, **pílulas** (`.chip`) para filtro,
  **interruptor** (`.switch`) para ligar/desligar. Retrato em quadrado de cantos suaves.
- **Movimento** (seção "Movimento" do `theme.css` + `UI.movimento`): uma entrada só (a leitura);
  luz do ponteiro só no que leva a algum lugar (`a.card`, linha do índice); destaque deslizante
  no menu, nas abas e na escolha única. Só com mouse; nada com "reduzir movimento".
- Metadados em frase ou com vírgula, nunca colados com " · " (só o título da aba do navegador).

Dinheiro negativo sai com o sinal de menos (−, U+2212), nunca o hífen.
Números decimais saem por `UI.fmt.decimal` (8,2, nunca `toFixed`, que escreve 8.2) e ordinais
por `UI.fmt.ordinal` (nunca "6ºº"). `[hidden]` tem `display: none !important` no tema: sem isso,
`el.hidden = true` não esconde nada que tenha `display` próprio (`.btn`, `.card`). `.field input`
exclui checkbox, radio e arquivo; sem o `:not`, o checkbox ganhava 100% de largura.

No celular (≤ 900px), a razão de números fica em 2 colunas, a navegação é a barra de abas de
baixo, e a planilha de lançamentos (`table.sheet`) vira lista de cartões (data, categoria e "pago
com" viram a linha `.so-celular` debaixo da descrição).

### Cores de dados

As cores dos pilares e o par entradas × saídas foram **validados com o script da skill de dataviz**
(faixa de luminosidade, croma ≥ 0,10, separação para daltonismo e piso de visão normal ΔE ≥ 15,
nos dois temas, entre vizinhos; refeito na 1.8 contra os fundos e superfícies da marca). Com `--pairs all`, verde ×
bronze (Financeiro × Projetos) reprova para deuteranopia: por isso toda marca de pilar que aparece
junto de outra leva ícone e nome. Cores de status (vermelho/amarelo/verde) são reservadas para
urgência e nunca usadas como série. Toda barra leva o valor escrito ao lado. Ao mexer em cores, rode
o validador de novo; não escolha a olho.

## Funcionalidades

### 1. Análise de prioridades
- O dashboard cruza automaticamente prazos dos quatro pilares e destaca semanas com mais de um
  compromisso, marcando em vermelho quando vêm de áreas diferentes
- Compromissos atrasados aparecem em destaque na visão geral
- A "Leitura da situação" gera comparações com o mês anterior, projeção de gastos, contas pendentes
  e progresso dos projetos

### 2. Integração com o Google
Direto no navegador, via OAuth:
- **Google Calendar** (em `faculdade.html`): próximos eventos da agenda
- **Google Drive** (em `financeiro.html`): arquivos recentes
- **Google Drive** (em `disciplina.html`): busca e importa materiais/resumos de uma disciplina

Exige `CLIENT_ID` preenchido em `dashboard/config.js` e a página aberta por http/https (o Google
bloqueia `file://`). Quando algo falta, o botão "Conectar ao Google" abre uma caixa explicando o que
fazer e mostrando a origem exata a registrar no Google Cloud Console.

Pelos conectores/MCP desta sessão de chat, o agente também pode ler Gmail, Drive e GitHub para
sugerir dados — mas quem cadastra no painel é Luiz, pelas telas.

### 3. Recomendações
- Sugira formas de ganho compatíveis com a carga acadêmica
- Identifique disciplinas com conteúdo que pode virar palestra/curso online
- Proponha otimizações no fluxo de trabalho

## Modo de Funcionamento

Quando o usuário disser:
- **"Status"** → Resuma a situação dos três pilares (equivalente a `dashboard/index.html`)
- **"Próximos passos"** → Liste tarefas prioritárias dos 3 pilares, ordenadas por prazo
- **"Oportunidades"** → Sugira formas de ganho baseadas no contexto atual
- **"Análise financeira"** → Detalhe entrada/saída e projeções
- **"Sincronizar"** → Busque dados nas ferramentas conectadas e diga a ele o que cadastrar (ou
  gere um `.json` no formato do backup para ele importar pelo botão Backup)

## Formato de Resposta
- Use tabelas, cards e mini-gráficos quando ajudar
- Seja conciso mas detalhado
- Sempre cite prazos e datas específicas
- Destaque conflitos entre áreas (ex.: prova na mesma semana de deadline de projeto)
- Ao explicar algo operacional, lembre que ele não é programador: dê o passo a passo pela interface
