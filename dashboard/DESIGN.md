# Design System: Delfos 1.7, "consulta"

Delfos é o nome de um oráculo, e o painel faz o que um oráculo faz: lê a
situação e diz o que ela é. A 1.7 leva isso ao pé da letra: **em toda página,
a leitura é o título**. A frase vem grande, leve, sem serifa; os números ficam
ao pé dela, numa razão aberta; o resto se organiza por espaço e fio, não por
caixa.

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

## 1. Atmosfera

Um dossiê sóbrio, lido de noite. A interface é calma e quase sem cor; quem
fala é a frase do alto. Densidade de app diário (5 de 10), variação contida
(5 de 10: alinhado à esquerda, assimetria só onde o conteúdo pede), movimento
contido (4 de 10: um único momento de entrada, a leitura, e respostas ao
gesto).

**A ousadia fica num lugar só**: a leitura, em Funnel Display leve, como
título de toda página que tem leitura. Todo o resto é quieto.

## 2. Cor

Uma família só de cinzas (basalto com um fio de louro), nunca preto puro.
O cromo não tem cor: botão primário é osso sobre basalto, foco é osso. Cor
existe para três coisas e só para elas: identificar pilar, distinguir as duas
séries de dinheiro e marcar urgência.

| Token | Escuro (padrão) | Claro | Papel |
|---|---|---|---|
| `--fundo` | Basalto `#121413` | Pedra clara `#f4f5f1` | a página |
| `--lateral` | `#0e100f` | `#eaece6` | a barra lateral (plano de trás) |
| `--superficie` | `#191c1a` | `#fdfdfb` | objeto que se toca (janela, meta, conta) |
| `--superficie-2` | `#212422` | `#ebece7` | controle, item ativo |
| `--linha` | osso a 8% | tinta a 9% | fio de 1px, translúcido, tingido |
| `--texto` | Osso `#ecede6` | Tinta `#151916` | texto |
| `--texto-2` | `#aaada6` | `#4c514b` | apoio |
| `--texto-3` | `#80847d` | `#666b65` | legenda (4,5:1 ou mais sobre o fundo) |
| `--s-pessoal` | malva `#b9719b` | `#944d77` | pilar |
| `--s-financeiro` | louro `#76a15e` | `#477b3b` | pilar |
| `--s-faculdade` | ardósia `#508ac5` | `#32669d` | pilar |
| `--s-projetos` | bronze `#c08849` | `#a06522` | pilar |
| `--serie-entrada` / `--serie-saida` | `#508ac5` / `#c08849` | `#32669d` / `#a06522` | entradas e saídas nos gráficos |
| `--st-critical` | `#d36757` | `#af3e30` | só urgência, nunca série |

**Validado, não escolhido a olho** (`validate_palette.js` da skill de
dataviz, rodado de novo na 1.7 contra os quatro fundos novos): os quatro
pilares, em ordem, passam faixa de luminosidade, croma mínimo, separação para
daltonismo e o piso de visão normal entre vizinhos; entradas × saídas passam
com folga. O par verde × bronze (Financeiro × Projetos, que não são vizinhos)
**não** se separa bem para deuteranopia; por isso, desde a 1.7, toda marca de
pilar que aparece junto de outra leva o **ícone da área e o nome** ao lado
(codificação secundária). Cor nunca é o único canal.

Uma luz ambiente fixa (radial, osso a 5,5%, sem cor) entra pelo alto da área
principal, como a luz na nave de um templo. É o único gradiente do painel.

## 3. Tipografia

| Papel | Fonte | Onde |
|---|---|---|
| **Voz** | **Funnel Display** (300 a 600) | a leitura, o título das páginas sem leitura, títulos de seção, janelas, números grandes, o dia na agenda, a marca |
| **Dado e interface** | **Funnel Sans** | todo o resto: texto corrido, rótulos, botões, tabelas |

Serifa saiu da interface: três das skills de design proíbem serifa em painel
e software, e a Newsreader sobre grafite lia como a tela de um assistente de
IA. Funnel Display é o par de exibição da Funnel Sans (mesmo desenho, NORD
ID): leve e aberta em 40px, com personalidade nos detalhes (o "g", o "ç", os
algarismos), e casa sem esforço com o dado. Geist ficou de fora de propósito:
é a fonte padrão das telas geradas pelo v0.

- **Leitura**: `UI.ajustarLeitura` mede a frase e põe `data-tam` (g, m, p,
  pp): 46, 39, 32 ou 27px no computador; 30, 27, 24 ou 21px no celular.
  Frase curta é título grande; frase longa desce de corpo para nunca virar
  parede de seis linhas.
- **Dinheiro grande** (`.stat-value`, `.hero-value`): `UI.dinheiroGrande`
  separa "R$" e centavos em corpo menor; o inteiro lê primeiro.
- Números em coluna usam `tabular-nums`; número grande sozinho, proporcional.
- Nada de caixa alta em rótulo, nada de monoespaçada, nada de travessão no
  texto da interface (ponto, dois-pontos, vírgula ou parênteses no lugar).
- Preferência do perfil "Fonte da leitura e dos títulos": **Display** (padrão)
  ou **Texto** (Funnel Sans em tudo). Os valores guardados continuam
  `serifa` e `sans`, nomes da 1.6, para não precisar de migração.

## 4. Componentes

- **Cabeça corrida**: numa página com leitura, o `h1` vira uma linha pequena
  com o ícone da aba na cor dela (`UI.marcarCabeca`) e a descrição ao lado;
  quem é grande é a leitura. Página sem leitura (Contas, Investimentos, uma
  disciplina, um projeto) mantém o título grande, em Funnel Display leve.
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
  `resumo.js` (`ICONES_ED`), sem CDN. Só a marca, o ônfalo, é desenho
  próprio. Glifo digitado no começo de botão ou link ("+ ", "← ", "⇩ ") vira
  ícone sozinho (`UI.realcarBotoes`).
- **Botões**: primário em osso; comum em superfície; fantasma para ação
  secundária. Raio 10. Cedem a 97% ao clique.
- **Janelas**: raio 22, fundo desfocado atrás, título na voz. Ganham nome
  (`aria-labelledby`), foco dentro, Tab circulando nelas e foco de volta a
  quem abriu. No celular, a folha "Mais" sobe de baixo.
- **Barras**: comparação sem trilho (o valor escrito ao lado dá a escala);
  progresso de meta com trilho (o trilho é o que falta).
- **Retrato**: quadrado de cantos suaves, nunca círculo.

**Raio por hierarquia** (vale em todo lugar): janela 22, superfície 16,
controle 10, miúdo 6, pílula só para escolha (chips, segmentos, interruptor).

## 5. Layout

```
┌──────────────┬──────────────────────────────────────────────────────┐
│ ⌂ Delfos 1.7 │ ◉ Visão geral  Segunda-feira, 12 de outubro  [+] [+] │
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

- **Barra lateral** num plano atrás (`--lateral`), sem borda; contagem em
  algarismo simples (vermelho só na visão geral, quando há algo vencendo).
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

## 7. Proibições

- Serifa na interface; Inter; Geist; monoespaçada em rótulo.
- Travessão (— ou –) no texto da interface.
- Caixa alta com espaçamento em rótulo; etiqueta acima de todo título.
- Fileira de cartões iguais para números; caixa dentro de caixa.
- Pílula em todo selo; pontinho colorido antes de tudo.
- Ícone desenhado à mão (fora a marca); glifo digitado como ícone.
- Preto puro; sombra cinza genérica; brilho ou gradiente colorido.
- Cascata de entrada em toda seção; animação de largura e altura.
- Cor como único canal de informação; vermelho fora de urgência.
- Metadados colados com " · " (só sobrevive no título da aba do navegador).
