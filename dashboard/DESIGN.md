# Design System: Delfos 1.8, "marfim"

Delfos é o nome de um oráculo, e o painel faz o que um oráculo faz: lê a
situação e diz o que ela é. Desde a 1.7, **em toda página, a leitura é o
título**: a frase vem grande e leve, os números ficam ao pé dela, numa razão
aberta, e o resto se organiza por espaço e fio, não por caixa.

A 1.8 ganhou **identidade de marca**: o logotipo "Delfos" numa serifa
clássica, marfim sobre preto, com a assinatura "Organização para o que
importa". O painel inteiro passou a falar na voz do logotipo: a leitura, os
títulos e os números grandes estão na mesma família de serifa, sobre a paleta
da marca (preto, carvão, grafite, marfim, cinza quente).

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

## 1. Atmosfera

Um dossiê sóbrio, lido de noite. A interface é calma e quase sem cor; quem
fala é a frase do alto. Densidade de app diário (5 de 10), variação contida
(5 de 10: alinhado à esquerda, assimetria só onde o conteúdo pede), movimento
contido (4 de 10: um único momento de entrada, a leitura, e respostas ao
gesto).

**A ousadia fica num lugar só**: a leitura, em Noto Serif Display leve, como
título de toda página que tem leitura. Todo o resto é quieto. O efeito é o do
quadro da marca: uma frase em serifa marfim sobre preto, muito espaço em
volta.

## Marca

- **Logotipo**: "Delfos" na serifa do quadro da identidade, vetorizado da
  imagem original (um caminho SVG só, `LOGOTIPO` em `ui.js`, preenchido com a
  cor do texto). Nunca é texto digitado numa fonte parecida: é o desenho.
  `UI.logotipo()` devolve o SVG; quem o usa dá o nome por `aria-label`.
  Aparece no alto da barra lateral (24px de altura, com a versão baixinha na
  linha de base), no alto do celular, na entrada, nas boas-vindas e no rodapé
  do editor de resumos.
- **D**: a primeira letra do logotipo, sozinha (`icone("delfos")`), para onde
  o nome inteiro não cabe: o título "O que o Delfos entendeu" e o favicon.
- **Favicon** (`favicon.svg`): o D marfim num quadrado preto de cantos
  suaves; os fios finos do D ganham um traço do mesmo tom para não sumir em
  16px. **Ícone da tela inicial** (`apple-touch-icon.png`, 180px): o
  logotipo inteiro em marfim sobre preto, como os ícones do quadro.
- **Assinatura**: "Organização para o que importa", em Funnel Sans 10,5px,
  caixa alta espaçada (0,3em), em cinza, com um fio curto de 28px em cima.
  Só na entrada e nas boas-vindas, embaixo do logotipo. É a única caixa alta
  espaçada do painel, porque é assinatura de marca, não rótulo.
- **Área livre**: o logotipo nunca encosta em nada; nada fica a menos da
  altura do "e" dele.

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
| **Voz** | **Noto Serif Display** (300 a 600, Google Fonts, 41 KB) | a leitura, o título das páginas sem leitura, títulos de seção, janelas, números grandes, o dia na agenda |
| **Dado e interface** | **Funnel Sans** | todo o resto: texto corrido, rótulos, botões, tabelas, a assinatura |
| **Marca** | o logotipo (desenho, não fonte) | barra lateral, entrada, boas-vindas |

A voz foi escolhida contra o logotipo, não a olho: "Delfos" foi desenhado em
mais de 90 famílias de serifa do Google Fonts e comparado com o recorte do quadro da
marca (proporção, altura de x, contraste, desenho do D, do "f" e do "s"). A
Noto Serif Display ficou porque é a que mais conversa com o logotipo (leve,
alto contraste, terminais afilados) e porque serve de dado: algarismos
alinhados por padrão (a Playfair, a outra finalista, usa algarismos antigos,
que descem abaixo da linha em "R$ 316,20"), sinal de menos de verdade
(U+2212) e acentos completos. Só o eixo de peso é baixado (41 KB; com o eixo
de largura seriam 76 KB).

- **Pesos**: 300 na leitura, nos títulos de página e nos números grandes (em
  40px ou mais, o fio fino é a elegância da letra); 350 a 450 entre 20 e 34px;
  500 nos títulos de seção e de janela; o negrito da leitura é 500. Abaixo de
  20px, só em frase curta e com peso 450 ou mais (a linha de apoio do novo
  lançamento, o título "O que o Delfos entendeu"): fio de 300 some em tela
  comum.
- **Espaço entre letras**: quase nenhum. A serifa de exibição já vem justa;
  -0,012em na leitura, -0,01em nos títulos, 0 no que é pequeno.

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
- **Razão de números**: toda faixa `.g3`/`.g4` de `.stat-value` vira colunas
  abertas entre dois fios, separadas por fio vertical, sem fundo nem caixa.
  No celular, duas colunas. Nenhuma página precisou mudar o HTML para isso.
- **Superfície** (`.card`): tom levemente acima do fundo, fio translúcido e
  um brilho de 1px no alto (no escuro). Só para o que é objeto: janela,
  meta, conta, projeto, gráfico. Cartão que só tem estado vazio perde o fundo
  e ganha contorno tracejado: é um espaço a preencher.
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
- **Barras**: comparação sem trilho (o valor escrito ao lado dá a escala);
  progresso de meta com trilho (o trilho é o que falta).
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
│ Delfos   1.8 │ ◉ Visão geral  Segunda-feira, 12 de outubro  [+] [+] │
│              │                                                      │
│ ◉ Visão  5   │ Boa tarde, Luiz. Relatório de estágio venceu há      │
│ ◯ Pessoal 1  │ 2 dias. No mês, sobrou R$ 316,20.   (leitura, 46px)  │
│ ▭ Financ. 1  │──────────────────────────────────────────────────────│
│ ▯ Faculd. 4  │ Saldo         │ Sobrou     │ Próximo      │ A pagar  │
│ ↗ Projetos   │ R$ 6.239,10   │ R$ 316,20  │ Consulta…    │ R$ 300   │
│ + Nova aba   │──────────────────────────────────────────────────────│
│              │ Agenda                       │ O que o Delfos notou   │
│              │ Atrasado                     │ ...                    │
│              │ 10 sáb  Relatório de estágio │ Em números             │
│              │ Esta semana   Semana cheia   │ ...                    │
│              │ 14 qua  Consulta ...         │                        │
│ (LF) Luiz    │ Suas abas (índice em duas colunas)                    │
└──────────────┴──────────────────────────────────────────────────────┘
```

- **Barra lateral** num plano atrás (`--lateral`), sem borda; cada aba com
  o seu selo colorido (a cor ali identifica a aba, que é o uso que a cor tem
  no Delfos); contagem em algarismo simples (vermelho só na visão geral,
  quando há algo vencendo).
- **Visão geral**: a saudação abre a leitura em tom mais baixo; a razão traz
  saldo, o mês, o próximo compromisso e o que falta pagar; a agenda vai
  semana a semana com o dia do mês grande à esquerda (o único "momento de
  segunda leitura" da página) e a semana cheia marcada no próprio cabeçalho
  (saiu a pilha de avisos do topo); "O que o Delfos notou" e "Em números"
  ficam soltos na coluna lateral; as abas viram um índice.
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
- A luz que segue o ponteiro ficou só no que leva a algum lugar (linha do
  índice de abas, `a.card`); cartão parado não acende.
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
- Fileira de cartões iguais para números; caixa dentro de caixa.
- Pílula em todo selo; pontinho colorido antes de tudo.
- Ícone desenhado à mão (fora a marca); glifo digitado como ícone.
- Preto puro; sombra cinza genérica; brilho ou gradiente colorido.
- Cascata de entrada em toda seção; animação de largura e altura.
- Cor como único canal de informação; vermelho fora de urgência.
- Metadados colados com " · " (só sobrevive no título da aba do navegador).
