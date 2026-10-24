# Design System: Delfos 2.2, "marfim" em gavetas

Delfos é o nome de um oráculo, e o painel faz o que um oráculo faz: lê a
situação e diz o que ela é. Desde a 1.7, **em toda página, a leitura é o
título**: a frase vem grande e leve. Desde a 2.0, **cada assunto mora numa
gaveta**: os números da aba num painel só e, embaixo, uma coluna de
superfícies delimitadas, cada uma com um puxador que diz o essencial (o nome,
uma linha do que tem dentro, o botão de registrar). Aberta, a gaveta mostra o
conteúdo; fechada, continua dizendo o principal. Dentro dela nada vira caixa
de novo: listas, fios e, quando há peças que se tocam, compartimentos de tom
mais escuro, sem borda.

A 1.8 ganhou **identidade de marca**: o logotipo "Delfos" numa serifa
clássica, marfim sobre preto. A 2.2 trocou a marca pela do quadro novo: o
**símbolo** (um D com uma coluna grega dentro), o logotipo numa **serifa
pesada** de alto contraste e a assinatura "O essencial se revela.". O painel
inteiro fala na voz do logotipo: a leitura, os títulos e os números grandes
estão na mesma serifa, sobre a paleta da marca (preto, carvão, grafite,
marfim, cinza quente). A 2.2 também tirou o que ainda tinha cara de tela
gerada: leitura de uma frase só, nenhum número repetido, um desenho por item
(a marca à esquerda), resumo de gaveta só com ela fechada e as análises em
gavetas finas, abaixo do que pede ação.

O formato deste documento segue a skill `stitch-design-taste` (atmosfera,
cor, tipografia, componentes, layout, movimento, proibições), adaptado a um
painel de uso diário.

## O que já foi tentado (e por que saiu)

1. **"Estúdio"**: etiqueta em caixa alta acima de todo título, monoespaçada em
   rótulo de dado, metadados colados com ponto médio, preto falso, `→` no fim
   de link. Vícios de tela gerada por IA.
2. **"Azulejo baiano"**: ornamento temático de fundo competindo com a leitura.
   Decoração temática não é personalidade.
3. **"Oráculo sóbrio" v1.2 a v1.3**: filete colorido na borda de todo cartão,
   ícones de glifo digitado, tudo em caixa com o mesmo raio.
4. **"Oráculo sóbrio, segunda leitura" v1.4 a v1.6**: o princípio era bom,
   mas a página continuava um kit de cartões iguais com borda de 1px sobre
   quase-preto, a voz em serifa (Newsreader) lembrava a interface de um
   assistente de IA, as faixas de números eram três ou quatro cartões
   idênticos, os selos eram pílulas em toda linha, havia pontinhos coloridos
   antes de tudo e os ícones eram desenhados à mão. No celular, a navegação
   era uma faixa rolável no alto: um site espremido, não um app.
5. **"Consulta" v1.7**: a voz sem serifa (Funnel Display) sobre basalto
   esverdeado. Funcionava, mas não tinha marca: quando o logotipo chegou, numa
   serifa de alto contraste, a voz sem serifa e o cinza esverdeado brigavam
   com ele. A serifa voltou, mas outra: de exibição, leve e de alto contraste,
   a mesma família do logotipo, sobre neutros quentes. O que lia como "tela de
   assistente" na 1.6 era a Newsreader de texto, pesada, sobre grafite frio.
6. **"Página aberta" v1.7 a v1.9**: nada em caixa, tudo organizado por espaço
   e fio, a razão de números solta entre dois fios e a coluna lateral com
   "O que o Delfos notou" e "Em números". Elegante em print, mas na tela de
   todo dia lia como poluída: sem limites, o olho não sabia onde um assunto
   acabava, tudo aparecia ao mesmo tempo e o botão de criar ficava longe do
   lugar onde a coisa mora. A 2.0 trouxe as gavetas.

## 1. Atmosfera

Um dossiê sóbrio, lido de noite. A interface é calma e quase sem cor; quem
fala é a frase do alto. Densidade de app diário (5 de 10), variação contida
(5 de 10: alinhado à esquerda, assimetria só onde o conteúdo pede), movimento
contido (4 de 10: um único momento de entrada, a leitura, e respostas ao
gesto).

**A ousadia fica num lugar só**: a leitura, na serifa pesada da marca
(Gloock), como título de toda página que tem leitura, em uma frase só. Todo o resto é quieto. O efeito é o do
quadro da marca: uma frase em serifa marfim sobre preto, muito espaço em
volta.

## Marca

O quadro da marca (2.2) tem o símbolo em três variações (Clássica, Abertura,
Monolítica); a escolhida foi a **Clássica**, a mesma da capa, do cartão e dos
ícones de app do quadro.

- **Símbolo**: o D com a coluna (capitel, fuste em duas partes, base),
  vetorizado da capa do quadro com potrace (um caminho só, `SIMBOLO` em
  `ui.js`, viewBox `0 0 219 221`). `UI.simbolo()` devolve o SVG em
  `currentColor`; `icone("delfos")` é o mesmo desenho em tamanho de ícone
  (o título "O que o Delfos entendeu").
- **Logotipo**: "Delfos" na serifa pesada do quadro, vetorizado da mesma
  capa (`LOGOTIPO`, viewBox `0 0 460 122`). Nunca é texto digitado numa
  fonte parecida: é o desenho. `UI.logotipo()` devolve o SVG; quem o usa dá
  o nome por `aria-label`.
- **Assinatura horizontal**: símbolo à esquerda, logotipo ao lado, como no
  quadro. Na barra lateral, símbolo de 30px, logotipo de 22px e a versão
  baixinha no fim da linha; na entrada e nas boas-vindas, 64 e 40px, com a
  frase embaixo do logotipo. O rodapé do editor de resumos usa só o
  logotipo.
- **Favicon** (`favicon.svg`): o símbolo marfim num quadrado preto de raio
  7,5/32. **Ícone da tela inicial** (`apple-touch-icon.png`, 180px): o
  símbolo marfim sobre preto, como os ícones de app do quadro. A variação
  Monolítica ficaria igual nesses tamanhos e o recorte dela no quadro tem
  metade da resolução; por isso a Clássica vale em tudo.
- **Assinatura**: "O essencial se revela.", em Funnel Sans 10,5px, caixa
  alta espaçada (0,24em), em cinza, embaixo do logotipo, sem o fio curto da
  1.8 (o quadro novo não tem). Só na entrada e nas boas-vindas. É a única
  caixa alta espaçada do painel, porque é assinatura de marca, não rótulo.
- **Área livre**: a marca nunca encosta em nada; nada fica a menos da
  altura do "e" do logotipo.

## 2. Cor

A paleta da marca, e nada além dela no cromo: **preto** `#0b0b0b`,
**carvão** `#1f1f1f`, **grafite** `#3a3a3a`, **marfim** `#ede9e1` e **cinza
quente** `#d6d1c7`. Neutros quentes, nunca preto puro nem branco puro. Botão
primário é marfim sobre preto (no claro, preto sobre marfim), foco é marfim.
Cor existe para três coisas e só para elas: identificar pilar, distinguir as
duas séries de dinheiro e marcar urgência.

| Token | Escuro (padrão) | Claro | Papel |
|---|---|---|---|
| `--fundo` | `#111110` | Marfim `#ede9e1` | a página |
| `--lateral` | Preto `#0b0b0b` | `#e5e0d6` | a barra lateral (plano de trás) |
| `--superficie` | `#181817` | `#f6f3ed` | objeto que se toca (janela, meta, conta) |
| `--superficie-2` | Carvão `#1f1f1f` | `#e3ded4` | controle, item ativo |
| `--superficie-3` | `#2a2a29` | Cinza quente `#d6d1c7` | controle pressionado |
| `--linha` | marfim a 8% | preto a 9% | fio de 1px, translúcido, tingido |
| `--texto` | Marfim `#ede9e1` | `#111110` | texto |
| `--texto-2` | `#aba69d` | `#48453f` | apoio |
| `--texto-3` | `#8d8980` | `#66625a` | legenda (4,5:1 ou mais sobre fundo e superfície) |
| `--s-pessoal` | malva `#b9719b` | `#944d77` | pilar |
| `--s-financeiro` | louro `#76a15e` | `#477b3b` | pilar |
| `--s-faculdade` | ardósia `#508ac5` | `#32669d` | pilar |
| `--s-projetos` | bronze `#c08849` | `#a06522` | pilar |
| `--serie-entrada` / `--serie-saida` | `#508ac5` / `#c08849` | `#32669d` / `#a06522` | entradas e saídas nos gráficos |
| `--st-critical` | `#d36757` | `#af3e30` | só urgência, nunca série |

**Validado, não escolhido a olho** (`validate_palette.py` da skill de
dataviz, rodado de novo na 1.8 contra o fundo e a superfície novos dos dois
temas, `#111110`, `#181817`, `#ede9e1` e `#f6f3ed`): os quatro
pilares, em ordem, passam faixa de luminosidade, croma mínimo, separação para
daltonismo e o piso de visão normal entre vizinhos; entradas × saídas passam
com folga. O par verde × bronze (Financeiro × Projetos, que não são vizinhos)
**não** se separa bem para deuteranopia; por isso, desde a 1.7, toda marca de
pilar que aparece junto de outra leva o **ícone da área e o nome** ao lado
(codificação secundária). Cor nunca é o único canal.

Uma luz ambiente fixa (radial, marfim a 5,5%, sem cor) entra pelo alto da
área principal, como a luz na nave de um templo. É o único gradiente do
painel (e some no modo leve).

## 3. Tipografia

| Papel | Fonte | Onde |
|---|---|---|
| **Voz** | **Gloock** (um peso só, Google Fonts) | a leitura, o título das páginas sem leitura, títulos de seção e de gaveta, janelas, números grandes, o dia na agenda |
| **Dado e interface** | **Funnel Sans** | todo o resto: texto corrido, rótulos, botões, tabelas, a assinatura |
| **Marca** | o símbolo e o logotipo (desenho, não fonte) | barra lateral, entrada, boas-vindas |

A voz foi escolhida contra o logotipo novo, não a olho: "Delfos", um número
("R$ 6.239,10") e uma frase da leitura foram desenhados em 20 serifas do
Google Fonts (Noto Serif Display de 600 a 800, DM Serif Display, Playfair,
Bodoni Moda, Libre Caslon, Prata, Rozha, Yeseva, Gloock e outras) ao lado do
recorte do quadro. A **Gloock** ficou porque é a mais parecida com o
logotipo (o D largo, o "f" com gota, o contraste entre haste e fio) e serve
de dado: algarismos alinhados, sinal de menos e acentos completos. A Noto
Serif Display pesada (650 a 750) afina demais os fios horizontais; a DM
Serif Display é mais larga que o logotipo.

- **Um peso só.** A Gloock tem só o regular, e o tema desliga o negrito
  falso (`font-synthesis-weight: none` no `html`): sem isso, todo `<b>` e
  todo título pedido em 500 ou mais sairia com o traço engrossado pelo
  navegador. Os pesos escritos no CSS continuam valendo para a preferência
  "Sem serifa" (Funnel Sans, que tem os pesos de verdade).
- **Destaque pela cor**: na leitura, a frase vem em `--texto-2` e o que
  importa (o `<b>`) sobe para o marfim inteiro; atraso em vermelho, coisa
  boa em verde. É o que dá o ritmo de duas vozes da leitura.
- **Espaço entre letras**: quase nenhum. -0,005em na leitura (-0,008em na
  grande), -0,004em nos números grandes, 0 do puxador da gaveta para baixo.

- **Leitura**: `UI.ajustarLeitura` mede a frase e põe `data-tam` (g, m, p,
  pp): 46, 39, 32 ou 27px no computador; 30, 27, 24 ou 21px no celular.
  Frase curta é título grande; frase longa desce de corpo para nunca virar
  parede de seis linhas.
- **Dinheiro grande** (`.stat-value`, `.hero-value`): `UI.dinheiroGrande`
  separa "R$" e centavos em corpo menor; o inteiro lê primeiro. Negativo é
  "R$ −48,83": o sinal de menos de verdade (U+2212, não o hífen), colado no
  número e em vermelho de aviso; o hífen ficava baixo e curto ao lado do R$
  suspenso e parecia sujeira. No texto corrido vale o mesmo sinal
  (`fmt.moeda`): com o hífen, a linha podia quebrar entre "-" e "R$".
- Números em coluna usam `tabular-nums`; número grande sozinho, proporcional.
- Nada de caixa alta em rótulo, nada de monoespaçada, nada de travessão no
  texto da interface (ponto, dois-pontos, vírgula ou parênteses no lugar).
- Preferência do perfil "Fonte da leitura e dos títulos": **Serifa** (padrão,
  a voz da marca) ou **Sem serifa** (Funnel Sans em tudo). Os valores
  guardados são `serifa` e `sans`, os mesmos desde a 1.6.

## 4. Componentes

- **Cabeça corrida**: numa página com leitura, o `h1` vira uma linha pequena
  com o ícone da aba na cor dela (`UI.marcarCabeca`) e a descrição ao lado;
  quem é grande é a leitura. Página sem leitura (Contas, Investimentos, uma
  disciplina, um projeto) mantém o título grande, na voz, em peso 300.
- **Gaveta** (2.0, `.gaveta`): superfície (`--superficie`, fio `--linha`,
  raio 16) com o **puxador** no alto: o nome na voz (20px), o **resumo** em
  uma linha (14px, `--texto-3`, com `<b>` e os tons de status), as ações
  (botão pequeno) e a seta, que gira ao abrir. Desde a 2.2 sem ícone no
  puxador (o nome na voz já basta) e com o resumo **só com a gaveta
  fechada**: aberta, o conteúdo diz tudo, e o resumo repetido em cima era
  ruído. `data-sempre` mantém visível o resumo que traz um total que não
  aparece lá dentro (quanto falta pagar, quanto os fixos somam por mês). A faixa inteira é clicável; o foco
  aparece como um anel por dentro dela. Um fio separa o puxador do conteúdo,
  com 22px de respiro (16 no celular). Gavetas empilham numa coluna só, com
  12px entre elas. Fechada por padrão só a que é análise ou ajuste.
- **Gaveta fina** (2.2, `.gaveteiro.consulta`): o que se consulta de vez em
  quando (ritmo, maiores gastos, entradas e saídas, fixos, perguntas,
  Drive, médias, a ficha de um projeto, os ajustes de uma aba) desce para
  um grupo abaixo das gavetas de ação, com um rótulo pequeno em Funnel Sans
  ("Análises e ajustes", "Ficha e documentos"...). Sem superfície: cada uma
  é uma faixa entre fios, como as gavetas rasas de um arquivo, com o nome a
  17px. Mesmo puxador, mesma memória de aberta ou fechada. No Financeiro,
  ficam 5 gavetas de ação em cima e 6 finas embaixo.
- **Painel de números**: a faixa `.g3`/`.g4` de `.stat-value` é uma
  superfície delimitada, colunas separadas por fio, valor na voz a 30px. No
  celular, duas colunas. Nenhuma página precisou mudar o HTML para isso.
- **Compartimento**: dentro da gaveta, peça que se toca (pergunta, meta,
  conta, projeto, resumo de campo, ladrilho de aba) tem o tom
  `--superficie-2` a 62% sobre a superfície, raio 12, sem borda. Moldura de
  tabela, de grade de semanas e de cartão que só embrulhava o vazio somem.
- **Item da gaveta** (2.1): todo registro de lista dentro de gaveta é um
  compartimento (`--fundo-item`, raio 12, 6px entre eles), com a **marca** à
  esquerda (`UI.marcaItem`, 40px, raio 11, fundo a 15% da cor da aba ou da
  urgência: a data com o dia na voz e o mês embaixo, um ícone em duas
  camadas ou as iniciais na voz), o nome em Funnel Sans 600, uma linha de
  **informações** (`UI.info`) e o número à direita. Desde a 2.2 as
  informações não têm ícone: são uma frase só, separada por vírgula (posta
  pelo CSS), e a marca à esquerda é o único desenho do item. A cor
  da marca diz de onde é o item ou quão urgente ele está; nunca enfeite.
- **Cartão destacado** (2.1, `.list.cartoes`): o item que é um objeto
  inteiro (disciplina, conta, cartão, investimento, projeto) vira cartão em
  grade: marca grande (46px), nome na voz, o número grande na voz, as
  informações embaixo de um fio e uma barra fina com a referência marcada
  (a média contra a mínima, o limite, as etapas). O cartão inteiro é o link.
- **Superfície solta** (`.card`) fica para o que não está em gaveta: janela,
  o cartão de uma conta numa página sem gaveteiro.
- **Estado vazio dentro da gaveta**: uma linha (ícone de 40px, título em
  Funnel Sans, texto, ação à direita), nunca um cartaz centralizado. Se o
  puxador já tem o botão de registrar, o vazio não repete o botão.
- **Ladrilho de aba** (`.ladrilho`, visão geral): compartimento com o selo
  da aba (34px), o nome na voz, o número que importa e uma linha do que há
  nela. Leva à página da aba.
- **Registrar** (`.modal.registrar`): "O que você quer registrar?", uma
  linha por aba ligada (selo, o que se registra, uma frase, o nome da aba).
- **Selo** (`.badge`): texto, não pílula. "em 2 dias" em âmbar, "atrasado há
  3 dias" em vermelho; o de pilar leva o ícone da área.
- **Ícone de área**: os quatro pilares têm ícone em máscara CSS
  (`--ic-pessoal`, `--ic-financeiro`, `--ic-faculdade`, `--ic-projetos`, e
  `--ic-cartao` para cartão de crédito); `.swatch`, `.eyebrow`, `.nota-area`
  e os selos usam o ícone no lugar do pontinho. Ponto colorido só sobra onde
  a cor é o único dado (aba criada pelo usuário, item do calendário).
- **Ícones**: Phosphor regular (MIT), copiados para `ui.js` (`ICONES`) e
  `resumo.js` (`ICONES_ED`), sem CDN. Só a marca (o logotipo e o D) é
  desenho próprio. Glifo digitado no começo de botão ou link ("+ ", "← ", "⇩ ") vira
  ícone sozinho (`UI.realcarBotoes`).
- **Selo da aba** (`UI.seloAba`): na barra lateral, na folha "Mais" e na
  lista de abas do perfil, toda aba tem o mesmo selo, fixa ou criada:
  quadrado de 26px, raio 8, fundo a 14% da cor da aba e fio a 12%, ícone na
  cor dela em duas camadas (contorno + corpo do Phosphor duotone a 20%). A
  aba aberta fica com o selo cheio. A Visão geral, que não é pilar, fica em
  grafite e enche em marfim. Na barra do celular o ícone vai solto, como nos
  apps do telefone.
- **Botões**: primário em marfim (no claro, em preto); comum em superfície; fantasma para ação
  secundária. Raio 10. Cedem a 97% ao clique.
- **Janelas**: raio 22, fundo desfocado atrás, título na voz. Ganham nome
  (`aria-labelledby`), foco dentro, Tab circulando nelas e foco de volta a
  quem abriu. No celular, a folha "Mais" sobe de baixo.
- **Barras**: fora de gaveta, comparação sem trilho (o valor escrito ao
  lado dá a escala); dentro da gaveta, cada linha é um compartimento e a
  barra ganha trilho (no compartimento, é o trilho que dá a medida).
  Progresso de meta sempre com trilho (o trilho é o que falta).
- **Retrato**: quadrado de cantos suaves, nunca círculo.
- **Criador de abas** (1.8, refeito na 1.9): nome, uma caixa de **Propósito** e, logo
  abaixo, "O que o Delfos entendeu": uma lista curta (assunto, o que foi
  corrigido, cada registro, campos, jeito de anotar, meta, vista), cada linha
  com o porquê em tom mais baixo e em frase completa ("Você falou em metas;
  deixei um valor inicial para você ajustar."). É texto, não cartão. Na prévia,
  o campo que o Delfos acrescentou leva o selo "sugestão" (texto cinza, não
  pílula) e as ideias a mais vêm desligadas. Aparência (ícone e
  cor) fica num `details` fechado: a grade de ícones só é desenhada ao abrir.
  A prévia mostra os campos em linhas (nome à esquerda, tipo à direita) e a
  vista em pílulas.

**Raio por hierarquia** (vale em todo lugar): janela 22, superfície 16,
controle 10, miúdo 6, pílula só para escolha (chips, segmentos, interruptor).

## 5. Layout

```
┌──────────────┬──────────────────────────────────────────────────────┐
│ Delfos   2.0 │ ◉ Visão geral  Segunda-feira, 19 de outubro  [+ Reg.]│
│              │                                                      │
│ ◉ Visão  5   │ Boa tarde, Luiz. Relatório de estágio venceu há      │
│ ◯ Pessoal 1  │ 2 dias. No mês, sobrou R$ 304,20.   (leitura, 40px)  │
│ ▭ Financ. 1  │ ╭──────────────────────────────────────────────────╮ │
│ ▯ Faculd. 4  │ │ ▣ Agenda  1 atrasado; próximo: Consulta…  [+] ˄  │ │
│ ↗ Projetos   │ │──────────────────────────────────────────────────│ │
│ + Nova aba   │ │ 17 sáb  Relatório de estágio     venceu há 2 dias│ │
│              │ │ 21 qua  Consulta oftalmologista        em 2 dias │ │
│              │ ╰──────────────────────────────────────────────────╯ │
│              │ ╭ ▭ Dinheiro  saldo R$ 6.239,10; sobrou…  [+]  ˄ ──╮ │
│              │ ╭ ◌ O que o Delfos notou  6 avisos; …          ˄ ──╮ │
│ (LF) Luiz    │ ╭ ▦ Suas abas  5 abas: …           [+ Nova aba] ˄ ─╮ │
└──────────────┴──────────────────────────────────────────────────────┘
```

- **Barra lateral** num plano atrás (`--lateral`), sem borda; cada aba com
  o seu selo colorido (a cor ali identifica a aba, que é o uso que a cor tem
  no Delfos); contagem em algarismo simples (vermelho só na visão geral,
  quando há algo vencendo).
- **Visão geral**: a saudação abre a leitura em tom mais baixo; "+ Registrar"
  é o único botão da cabeça; quatro gavetas: a agenda (próximos sete dias,
  semana a semana, com o dia do mês grande à esquerda, o único "momento de
  segunda leitura" da página, e a semana cheia marcada no próprio
  cabeçalho), o dinheiro (saldo, o mês e o que falta pagar lado a lado, com
  a comparação e a projeção em palavras), o que o Delfos notou (três por vez)
  e suas abas, em ladrilhos.
- **Página de aba**: cabeça (título e o registro principal), leitura, painel
  de números, gaveteiro. O botão de registrar mora na gaveta onde o registro
  vai; a cabeça guarda só o principal.
- **Celular** (até 900px): o alto é só a marca e o retrato; a navegação é
  uma barra de abas fixa embaixo, ao alcance do polegar, com as quatro
  primeiras abas e "Mais" (a aba aberta sempre aparece nela). Área segura do
  iPhone respeitada (`viewport-fit=cover`, `env(safe-area-inset-*)`).
- Conteúdo até 1160px, alinhado à esquerda; números tabulares à direita.

## 6. Movimento

- Três curvas (`--ease-saida`, `--ease-mola`, `--ease-troca`) e três tempos
  (160/280/460 ms). Nada linear.
- **Um momento de entrada só**: a leitura chega (opacidade, 10px e um leve
  desfoque, 620 ms). As seções já estão no lugar; cascata em toda seção era
  tique de tela gerada.
- A luz que segue o ponteiro ficou só no que leva a algum lugar (ladrilho
  de "Suas abas", `a.card`); cartão parado não acende.
- A gaveta desliza (`grid-template-rows` de 1fr a 0fr, 460 ms para abrir,
  280 para fechar) e a seta gira junto; nada de medir altura em JS.
- Destaque deslizante no menu, sublinhado que corre nas abas, trilho na
  escolha única, mola no interruptor: respostas ao gesto, não enfeite.
- Barras aparecem sem animar largura (só propriedades de compositor).
- Tudo de ponteiro fica em `(hover: hover) and (pointer: fine)`; com
  "reduzir movimento" (sistema ou perfil) nada disso acontece.
- **Modo leve** (1.8, `data-leve="sim"`): o mesmo desenho sem o que pesa na
  placa de vídeo. Sem sombras, sem a luz radial do fundo, sem desfoque atrás
  das janelas (fundo mais opaco no lugar), sem destaque deslizante e com
  transições a quase zero. Liga sozinho em aparelho fraco (até 4 núcleos ou
  4 GB, ou economia de dados) e pode ser escolhido no perfil.

## 7. Proibições

- Serifa fora da voz (em rótulo, botão, tabela, campo); Inter; Geist;
  monoespaçada em rótulo.
- Escrever "Delfos" numa fonte parecida no lugar do logotipo.
- Cor no cromo (botão, foco, fundo): a marca é preto e marfim.
- Travessão (— ou –) no texto da interface.
- Caixa alta com espaçamento em rótulo (a assinatura da marca é a exceção);
  etiqueta acima de todo título.
- Fileira de cartões iguais para números; caixa com borda dentro de gaveta
  (dentro, só compartimento de tom, sem fio em volta).
- Seção solta numa página de aba: todo assunto mora numa gaveta, com nome,
  resumo e, se recebe registro, o botão de registrar no puxador.
- Gaveta sem resumo útil: fechada, ela precisa dizer o essencial.
- Pílula em todo selo; pontinho colorido antes de tudo.
- Ícone desenhado à mão (fora a marca); glifo digitado como ícone.
- Preto puro; sombra cinza genérica; brilho ou gradiente colorido.
- Cascata de entrada em toda seção; animação de largura e altura.
- Cor como único canal de informação; vermelho fora de urgência.
- Metadados colados com " · " (só sobrevive no título da aba do navegador).
- Ícone em cada informação do item; ícone no puxador da gaveta (2.2: um
  desenho por item, a marca à esquerda).
- Número sem dizer o quê: o da barra lateral só conta o que está atrasado.
- Leitura que repete a faixa de números logo abaixo, ou de mais de uma
  frase; resumo de gaveta aberta repetindo o conteúdo dela.
- Negrito falso na voz: o destaque da Gloock é pela cor.
