# Delfos — agente de organização pessoal do Luiz

O painel se chama **Delfos**. O nome e a versão (`UI.NOME` / `UI.VERSAO`, em `ui.js`) aparecem
como marca no rodapé da barra lateral, nos títulos das abas do navegador e no nome do arquivo de
backup exportado.

Duas coisas **continuam** com o nome antigo, de propósito:

- **O repositório é `organizador`.** O endereço do GitHub Pages
  (`luizftc5-debug.github.io/organizador/dashboard/`) sai daí; renomear quebraria o link que o Luiz
  usa e os favoritos dele.
- **Os endereços de armazenamento**: `organizador.estado.v2` e `organizador.tema` no localStorage,
  `organizador.arquivos` no IndexedDB. Não são texto de marca, são a chave onde os dados moram —
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

Aplicação estática multi-página em `dashboard/`, sem build e sem dependências externas.

| Arquivo | Papel |
|---|---|
| `index.html` + `home.js` | Visão geral: saldo em destaque, alertas, agenda de 30 dias, leitura automática da situação |
| `financeiro.html` + `financeiro.js` | Planilha de lançamentos, gráficos por mês e categoria, metas |
| `contas.html` + `contas.js` | Lista de contas e cartões, com o balanço geral |
| `conta.html` + `conta.js` | Página de uma conta ou cartão: saldo/fatura, gastos por categoria só dela, lançamentos |
| `investimentos.html` + `investimentos.js` | Carteira de investimentos: aplicado, valor atual, rentabilidade por tipo |
| `faculdade.html` + `faculdade.js` | Lista de disciplinas e prazos gerais |
| `disciplina.html` + `disciplina.js` | Página de uma disciplina: avaliações, prazos, materiais e resumos, com importação do Drive |
| `resumo.html` + `resumo.js` | Editor de texto de um resumo: página inteira, sem barra lateral |
| `projetos.html` + `projetos.js` | Projetos pessoais que geram renda + oportunidades |
| `projeto.html` + `projeto.js` | Página de um projeto: ficha, etapas, recebimentos, custos, documentos e anotações |
| `pessoal.html` + `pessoal.js` | Compromissos pessoais: consultas, tarefas, recados |
| `pilar.html` + `pilar.js` | Página de uma aba criada pelo usuário |
| `store.js` | Camada de dados: localStorage + CRUD + backup em JSON |
| `arquivos.js` | Anexos (PDF, slides, fotos) no IndexedDB + export/import para o backup |
| `financas.js` | Cálculos derivados: saldo por conta, ciclo e fatura de cartão, balanço, investimentos |
| `ui.js` | Componentes: layout, perfil, modais de formulário, avisos, gráficos, datas/urgência |
| `theme.css` | Design system (tema claro/escuro) |
| `config.js` + `google-integration.js` | Integração OAuth com Google Calendar e Drive (inclui busca/exportação de arquivos, usada pela importação em disciplina.js) |
| `data.js` | Conteúdo inicial (seed), lido só na primeira abertura |

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
com os outros três pilares — cor própria (`--s-pessoal`, roxo) para não colidir com as demais.

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

### Investimentos

`financeiro.investimentos` é separado dos lançamentos do dia a dia — não usa `origem`, não entra no
balanço de contas/cartões. Cada item guarda `valorAplicado` e `valorAtual`; a rentabilidade
(`Financas.rentabilidade`) é sempre `atual − aplicado`, recalculada na hora, nunca armazenada.

### Página por disciplina

Cada disciplina tem `avaliacoes`, `materiais` e `resumos` como listas dentro dela, editadas por
`Store.subInserir/subAtualizar/subRemover`. A média é ponderada pelo `peso` das avaliações com nota
lançada (`UI.mediaDisciplina`). Prazos apontam para a disciplina por `disciplinaId`.

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

Colar é sempre como texto puro: estilo de outra página seria descartado depois pelo sanitizador, e
a tela mentiria até o próximo carregamento.

`resumo.conteudo` passou a ser **HTML** na v7, com `conteudoFormato: "html"` marcando o que já foi
convertido — sem essa marca a migração rodaria de novo a cada carga e escaparia o próprio escape.
Quem exibe o resumo passa por `UI.htmlSeguro()`, que só deixa passar a marcação que o editor sabe
produzir: é o único lugar do painel que renderiza HTML em vez de texto escapado, e um backup
importado pode trazer qualquer coisa.

Os anexos do resumo ficaram **fora** do editor (botão "Documentos" na disciplina), para a tela de
escrita não ter mais nada além do texto.

### Abas criadas pelo usuário

`estado.pilares` guarda abas que o próprio Luiz cria pelo botão "＋ Nova aba" da barra lateral. Cada
uma tem `nome`, `icone`, `cor`, `descricao` e a lista `itens` — mesma forma dos compromissos da aba
Pessoal. A página é `pilar.html?id=`, genérica.

A cor é um hex de `Store.PALETA_PILAR`, não um token do tema: aba é dado do usuário, não design
system. Por isso a paleta fica numa faixa de luminosidade média (lê bem nos dois temas), nenhuma
cor é vermelha (reservado para urgência) e nenhuma repete os quatro pilares fixos.

Como a cor vem em hex, ela entra **inline**: `--tint` na página (que `.card.tinted` e `.pillar` já
leem), `style` no ícone da barra e no selo da agenda. Para isso funcionar sem cada renderizador
saber de onde o item veio, todo item de `UI.compromissos()` carrega `areaRotulo` e `cor` — inclusive
os dos quatro pilares fixos, que usam `var(--s-*)`.

### Perfil do usuário — e os ajustes do painel

`estado.perfil` guarda identidade (nome, `dataNascimento`, telefone, e-mail, cidade, `foto`), vida
acadêmica (curso, instituição, semestre, matrícula, `ingresso`) e dois textos livres (`bio`,
`objetivos`). A foto é uma data URL: `UI.redimensionarFoto` recorta o centro em quadrado e reduz
para 256px em JPEG antes de salvar, para caber com folga no localStorage. Sem foto, o avatar
mostra as iniciais do nome. A idade sai de `UI.idade(dataNascimento)`, nunca é guardada.

O cartão de perfil (`UI.abrirPerfil`) abre pelo botão do nome na barra lateral e é **o único lugar
de configuração do painel**: ficha de dados, troca de tema e acesso ao backup ficam todos ali. O
rodapé da barra lateral não guarda botões, só a marca "Delfos" com a versão. Depois de gravar,
`abrirPerfil` chama `montarLayout` de novo para a barra refletir a mudança na hora — por isso
`ui.js` guarda a página ativa em `paginaAtiva`/`opcoesAtivas`.

Formulários longos (o de perfil, o do projeto) usam o tipo de campo `secao`, que só desenha um
título divisor e não guarda valor, e a opção `largo: true` para abrir o modal mais largo.

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
  lateral (exporta/importa um `.json` com o estado completo e os anexos).
- Ao mudar o formato do estado, trate a migração em `store.js` (`normalizar`, que roda em toda carga
  e precisa ser idempotente). Nunca troque a chave do localStorage: isso apagaria os dados de quem
  já usa. A conversão é gravada assim que a versão salva difere da atual.

### Direção visual

"Estúdio": porcelana fria (`--page`) com cartões brancos de traço fino, cantos pequenos e retos
(9px no cartão, 6px no controle), tipografia grotesca pesada com entrelinha bem apertada nos
títulos, e micro-rótulos em **monoespaçada** maiúscula (`--font-mono`) — é essa a assinatura
tipográfica, aplicada de uma vez só a `.eyebrow`, `.stat-label`, `.badge`, `th` e afins.

A regra que organiza tudo: **o cromo é monocromático**. Preto, branco e cinza na interface — botão
primário, foco, item ativo, todos em `--ink`. Cor só para dado (os quatro pilares) e para urgência.
Assim nada compete com a informação e a cor sempre significa alguma coisa.

O bloco escuro é peça pontual, não mais a coluna inteira: a marca do perfil na barra lateral e o
painel do saldo na home (`.hero`) usam os tokens `--slab-*`, e é esse contraste que ancora a
página. A barra lateral ficou clara, um tom abaixo da página, com o item aberto virando um cartão
branco elevado — leitura por elevação, não por cor.

Outros sinais: barra do pilar na borda esquerda do cartão (`.card.tinted`, `.pillar`), régua sob o
cabeçalho de seção (`.section-head`) e sob o topo da página (`.topbar`), e `.swatch` quadrado em vez
de redondo. A etiqueta acima do título (`.eyebrow`) dá hierarquia sem inventar mais um tamanho de
fonte — em página de detalhe ela não deve repetir o que o link "voltar" já diz.

### Cores de dados

A paleta categórica é validada para daltonismo (Financeiro = verde-água, Faculdade = azul,
Projetos = laranja). Cores de status (vermelho/amarelo/verde) são reservadas para urgência e nunca
usadas como série. Toda barra leva o valor escrito ao lado — a cor nunca é o único canal de leitura.
Ao mexer em gráficos, mantenha essas regras.

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
