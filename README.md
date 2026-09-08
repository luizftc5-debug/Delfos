# Delfos

Painel para acompanhar quatro frentes ao mesmo tempo — **Financeiro**, **Faculdade**, **Projetos** e
**Pessoal** — com alerta automático quando prazos de áreas diferentes caem na mesma semana. Além
dessas quatro, você pode criar **abas suas**, com nome, ícone e cor próprios.

Aplicação estática: HTML, CSS e JavaScript puros, sem instalação e sem servidor de dados.

## Como abrir

**Online (recomendado):** <https://luizftc5-debug.github.io/Delfos>

**No seu computador**, pela pasta `dashboard`:

```bash
python -m http.server 8000
```

E acesse <http://localhost:8000>.

> Abrir o arquivo direto (`file://`) funciona para tudo, **menos** o login do Google — ele exige
> `http://` ou `https://`.

## Como usar

Não é preciso editar nenhum arquivo. Tudo se cadastra pelos botões das telas:

| Onde | O que dá para fazer |
|---|---|
| **Visão geral** | Saldo, alertas de atraso e de semana cheia, agenda dos próximos 30 dias, leitura automática da situação |
| **Financeiro** | Lançar receitas e despesas (dizendo de qual conta ou cartão saíram), ver gastos por categoria e por mês, acompanhar metas |
| **Contas e cartões** | Cadastrar contas com saldo, cadastrar cartões com fechamento e vencimento. Cada uma abre numa **página própria**, com saldo/fatura, gastos por categoria só dela e a lista de lançamentos |
| **Investimentos** | Renda fixa, ações, fundos, cripto — o que já aplicou e quanto vale hoje, com rentabilidade calculada e distribuição por tipo |
| **Faculdade** | Disciplinas, prazos e entregas. Cada disciplina abre em **página própria**, com avaliações e notas, prazos, materiais e resumos — em materiais e resumos dá para **anexar documentos** (PDF, slides, fotos) ou **importar do Google Drive** |
| **Projetos** | Só iniciativas pessoais que geram renda. Cada projeto abre em **página própria**, com ficha completa, etapas, recebimentos, custos, documentos e anotações |
| **Pessoal** | Consultas, tarefas e recados que não são financeiro, faculdade nem projeto — ex.: consulta médica, levar o carro à revisão |
| **Suas abas** | Abas que você mesmo cria, com nome, ícone e cor — ex.: Academia, Leituras, Igreja |

> Trabalhos da faculdade e o TCC ficam em **Faculdade**, não em Projetos.

### Como funcionam o saldo e a fatura

- O saldo de cada conta parte do valor informado no cadastro e se atualiza sozinho a cada lançamento.
- A fatura do cartão junta as compras do ciclo atual: compras feitas depois do dia do fechamento já
  entram na fatura seguinte.
- Para um lançamento entrar nesse balanço, escolha em **"Pago com"** de qual conta ou cartão ele saiu.

Excluiu algo sem querer? O aviso que aparece embaixo traz **Desfazer**.

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

Clique no seu nome, no alto da barra lateral, para abrir o cartão de perfil. **É o único lugar de
configuração** — tema e backup ficam ali dentro, junto com sua ficha.

- **Editar perfil** abre um formulário em três partes: quem você é (nome, data de nascimento,
  telefone, e-mail, cidade), faculdade (curso, instituição, semestre, matrícula, início do curso) e
  dois textos livres — sobre você e seus objetivos do momento. Só o que estiver preenchido aparece
  na ficha; a idade é calculada sozinha a partir da data de nascimento.
- **Enviar foto** troca as iniciais por uma foto sua. A imagem é recortada e reduzida antes de
  salvar, então ocupa poucos KB.
- **Tema do painel**: automático (segue o sistema), claro ou escuro. Muda na hora.
- **Backup e dados**: exportar, importar ou apagar tudo.

O cartão também mostra quantas disciplinas e registros você tem, quantos compromissos há nesta
semana e quanto os documentos anexados ocupam.

### Escrever um resumo

Em **Resumos e anotações**, dentro da página de uma disciplina, o botão **+ Resumo** abre uma página
inteira só para escrever — sem barra lateral, sem cartões, só o texto.

Na barra de cima dá para trocar a **fonte** e o **tamanho**, e usar **negrito**, **itálico** e
**sublinhado**. Aplicam-se ao trecho que você selecionou; sem seleção, valem para o que você digitar
em seguida. **Limpar estilo** desfaz a formatação do trecho selecionado.

O texto é salvo sozinho alguns segundos depois que você para de digitar — o indicador no alto diz se
há algo não salvo. `Ctrl + S` (ou `Cmd + S`) salva na hora.

> Os documentos anexados a um resumo ficam no botão **Documentos**, na página da disciplina — assim
> a tela de escrita não tem mais nada além do texto.

### Criar suas próprias abas

O botão **＋ Nova aba**, embaixo da lista da barra lateral, cria uma aba sua: escolha nome, ícone e
cor. Ela ganha página própria, onde você cadastra itens com data, tipo e local.

O que você cadastrar nela **entra na agenda dos próximos 30 dias e nos alertas de semana cheia** da
visão geral, junto com os prazos da faculdade, os deadlines dos projetos e os compromissos pessoais.

Na página da aba, em **Ajustes da aba**, dá para renomear, trocar ícone e cor, ou excluir. Renomear
não mexe no que já está cadastrado; excluir apaga os itens junto.

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

### Pessoal

Compromissos que não são de nenhum dos outros três pilares: consulta médica, levar o carro para a
revisão, comprar algo específico. Cada um tem tipo (consulta, tarefa, compromisso, recado, outro),
data e local opcional, e entra na agenda dos próximos 30 dias e nos alertas de semana cheia junto
com os prazos da faculdade e os deadlines dos projetos.

### Onde ficam seus dados

No próprio navegador (localStorage) — nada é enviado para lugar nenhum. Consequência prática: os
dados ficam **naquele navegador, naquele computador**.

Para backup ou para usar em outro aparelho, clique no **seu nome** na barra lateral e depois em
**Backup e dados**:

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
  pessoal.html         pessoal.js        compromissos pessoais
  pilar.html           pilar.js          página de uma aba criada por você
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
