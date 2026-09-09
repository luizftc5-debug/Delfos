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

Aplicação estática multi-página em `dashboard/`, sem build. A única dependência externa é a tipografia (Google Fonts).

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
| `pilar.html` + `pilar.js` | Página de uma aba criada pelo usuário, com modelo e campos próprios |
| `bemvindo.html` + `bemvindo.js` | Assistente de boas-vindas: identidade, ocupação, abas fixas, ajustes finais |
| `store.js` | Camada de dados: localStorage + CRUD + backup em JSON |
| `personalizacao.js` | Traduz perfil/preferências em como o painel se apresenta (abas ligadas, saudação, ocupação) |
| `arquivos.js` | Anexos (PDF, slides, fotos) no IndexedDB + export/import para o backup |
| `financas.js` | Cálculos derivados: saldo por conta, ciclo e fatura de cartão, balanço, investimentos |
| `ui.js` | Componentes: layout, perfil, modais de formulário, avisos, gráficos, datas/urgência |
| `theme.css` | Design system (tema claro/escuro) |
| `config.js` + `google-integration.js` | Integração OAuth com Google Calendar e Drive (inclui busca/exportação de arquivos, usada pela importação em disciplina.js) |
| `data.js` | Conteúdo inicial (seed), lido só na primeira abertura |
| `exercicios.js` | Catálogo de exercícios da aba Academia (`const EXERCICIOS`), carregado só por `pilar.html` |

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
não confunda com a tipografia do painel (`dashboard/DESIGN.md`), que continua só IBM Plex.

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
  `grupo`), carregado só por `pilar.html`. O Delfos nunca sugere qual exercício fazer: o Luiz escolhe
  do catálogo pelo seletor (`catalogoOpcoes()`, rotulado "Grupo — Nome") e anota o que já está
  fazendo. Editar um exercício com carga maior que o recorde anterior atualiza o recorde sozinho
  ("Novo recorde pessoal!"); `pilar.itens` continua vazio e sem uso neste modelo.
- Migração v8 → v9 (`normalizar` em `store.js`): uma aba com `modelo === "academia"` sem `academia`
  ganha os valores em branco — a presença de `academia` é a marca que impede a conversão de rodar de
  novo. `novaAba()` (`ui.js`) e a sugestão "Academia" do assistente de boas-vindas (`bemvindo.js`)
  inicializam `academia`/`dias` na criação.

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

O cartão de perfil (`UI.abrirPerfil`) abre pelo botão do nome na barra lateral e é **o único lugar
de configuração do painel**: ficha de dados, ocupação, abas do painel (liga/desliga e renomeia na
hora, sem "Salvar"), troca de tema, acesso ao backup e "Refazer configuração inicial" (reabre o
assistente) ficam todos ali. O rodapé da barra lateral não guarda botões, só a marca "Delfos" com a
versão. Depois de gravar, `abrirPerfil` chama `montarLayout` de novo para a barra refletir a mudança
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
  lateral (exporta/importa um `.json` com o estado completo e os anexos).
- Ao mudar o formato do estado, trate a migração em `store.js` (`normalizar`, que roda em toda carga
  e precisa ser idempotente). Nunca troque a chave do localStorage: isso apagaria os dados de quem
  já usa. A conversão é gravada assim que a versão salva difere da atual.

### Direção visual

**"Oráculo sóbrio"** — o detalhe completo está em `dashboard/DESIGN.md`, que é a
referência a consultar antes de mexer em qualquer coisa visual.

O princípio, em uma linha: **nada de padrão, textura ou enfeite**. Superfície é
superfície. O caráter vem de tipografia, espaço e hierarquia — não de uma camada
por cima. Duas direções anteriores foram descartadas por errar isso: "estúdio"
(acumulava os vícios de tela gerada por IA — versalete em caixa alta acima de todo
título, monoespaçada em rótulo, ponto médio colando metadados, preto falso, `→` no
fim de link) e "azulejo baiano" (trocou aquilo por ornamento temático, que é ruído
com sotaque).

O cromo **não tem cor**: fundo grafite fosco, botão primário em osso sobre grafite,
foco em osso. Cor existe só para identificar pilar (`--s-*`, dessaturados e
terrosos) e marcar urgência (`--st-critical`). O escuro é o padrão; o claro é
escolha explícita em `[data-theme="light"]`.

Tipografia: **IBM Plex Sans** em tudo, com peso e tamanho fazendo a hierarquia.
**IBM Plex Serif** aparece num único lugar — a frase de leitura no alto da visão
geral (`.leitura`), o momento em que o painel fala. O resto é dado, e dado é sans.

Identidade de pilar é um **filete de 2px** na borda do cartão (`.card.tinted`,
`.pillar`) — régua, não ornamento. Grupos afins se encostam num campo contíguo
(`.campo`) separado por 1px, em vez de flutuarem soltos com sombra.

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
