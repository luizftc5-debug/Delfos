# Delfos — direção visual: oráculo sóbrio, segunda leitura (v1.4, estendida na 1.5)

Delfos é o nome de um oráculo, e o painel faz o que um oráculo faz: **lê a
situação e diz o que ela é**. A estética sai daí — cada página abre falando, em
frase, e só depois mostra os números.

Três tentativas anteriores erraram e ficam registradas para não se repetirem:

1. **"Estúdio"** — acumulava os vícios de tela gerada por IA: etiqueta em CAIXA
   ALTA acima de todo título, monoespaçada em rótulo de dado, metadados colados
   com ponto médio, preto falso, `→` no fim de link.
2. **"Azulejo baiano"** — trocou aquilo por ornamento: um padrão de fundo que
   não servia à leitura e competia com ela. Decoração temática não é
   personalidade; é ruído com sotaque.
3. **"Oráculo sóbrio" v1.2–1.3** — o princípio estava certo, a execução ainda
   lia como kit de painel: filete colorido na borda esquerda de todo cartão (o
   tique mais comum de tela gerada), ícones feitos de glifo digitado (`◆ $ ▤ ☁
   ⤓ ✕`, que mudam de cara em cada sistema), tudo em caixa com a mesma borda e o
   mesmo raio, quatro cartões de número idênticos no alto de cada página, e o
   "·" colando metadados que a própria direção proibia.

## O princípio

**Nada de padrão, textura ou enfeite.** Superfície é superfície. O que dá
caráter à tela é a tipografia, o espaço e a hierarquia. Se um elemento não
ajuda a ler a situação, ele sai.

A ousadia fica **num lugar só**: o alto de cada página, onde o título e a
leitura falam na voz serifada. Todo o resto é quieto.

## Tipografia

| Papel | Fonte | Onde |
|---|---|---|
| **Voz** | **Newsreader** (tamanho ótico 6–72) | título da página, título de janela, a leitura (`.leitura`), as perguntas do Financeiro, nome no perfil, a marca |
| **Dado e interface** | **Funnel Sans** | todo o resto: números, tabelas, botões, rótulos |

Newsreader foi desenhada para ler em tela e tem tamanho ótico — em 40px fica
fina e elegante, em 19px continua firme. Funnel Sans é compacta e precisa, com
algarismos tabulares limpos (o IBM Plex servido pelo Google Fonts não trazia o
recurso `tnum`; Schibsted espaçava demais os tabulares; Atkinson e Mona Sans
cortam o zero, o que lê como terminal).

- **Números grandes** (faixa, herói) ficam em Funnel Sans com algarismos
  **proporcionais** — tabular deixa "121" frouxo. Tabular só onde números se
  alinham em coluna (`.num`, tabelas, eixos).
- **Dinheiro nunca em serifa**, nem no herói: número é dado, e dado é sans.
- Nada de caixa alta em rótulo, nada de monoespaçada, nada de uma palavra
  pintada de outra cor no meio de um título.

## Cor

Grafite com um fio de verde-louro (o louro de Apolo, em Delfos) — fosco, nunca
preto de mentira. **O cromo não tem cor**: botão primário é osso sobre grafite,
foco é osso. Cor existe só para identificar pilar, distinguir as duas séries de
dinheiro e marcar urgência.

| Token | Escuro (padrão) | Claro | Papel |
|---|---|---|---|
| `--fundo` | `#141714` | `#f2f3ef` | a página |
| `--superficie` | `#1a1e1a` | `#fcfdfa` | cartão |
| `--superficie-2` | `#222622` | `#e8eae6` | recuo, item ativo, botão comum |
| `--linha` | `#282d29` | `#dee0db` | fio de 1px |
| `--texto` | `#eeede6` | `#141a15` | texto (osso / tinta) |
| `--texto-2` | `#b0b2ab` | `#4f544e` | apoio |
| `--texto-3` | `#7e817b` | `#6c716b` | legenda |
| `--s-pessoal` | `#b9719b` | `#944d77` | malva |
| `--s-financeiro` | `#76a15e` | `#477b3b` | louro |
| `--s-faculdade` | `#508ac5` | `#32669d` | ardósia |
| `--s-projetos` | `#c08849` | `#a06522` | bronze |
| `--serie-entrada` | `#508ac5` | `#32669d` | entradas nos gráficos |
| `--serie-saida` | `#c08849` | `#a06522` | saídas nos gráficos |
| `--st-critical` | `#d36757` | `#af3e30` | só urgência, nunca série |

**Validado, não escolhido a olho** (validador da skill de dataviz, OKLab, simulação
Machado 2009): os quatro pilares, na ordem pessoal–financeiro–faculdade–projetos,
passam faixa de luminosidade, croma mínimo (≥ 0,10), separação para daltonismo
e o piso de visão normal (ΔE ≥ 15) nos dois temas. A paleta anterior reprovava
em croma e tinha financeiro × faculdade com ΔE 11 — quase iguais.

**Entradas × saídas não usam as cores dos pilares.** Verde × bronze reprova para
daltonismo (ΔE 3,5 em deuteranopia); azul × bronze passa com folga (ΔE 18,8).

Texto nunca veste a cor da série: o nome do pilar num selo fica em tinta
normal, com um ponto colorido do lado.

## Estrutura

- **Barra lateral**: no alto, a marca — o **ônfalo** (a pedra do "centro do
  mundo" em Delfos) e o nome na voz. Abas com ícones desenhados; o ícone só
  ganha a cor do pilar na aba aberta, em repouso a barra é cinza. No pé, quem
  está usando (foto, nome, curso), que abre o perfil. No celular vira faixa
  rolável com a foto primeiro.
- **Ícones**: `UI.icone(nome)`, desenhados numa grade de 24 com traço 1,6 e
  pontas redondas. Uma aba criada pelo usuário usa, de preferência, um desses
  ícones desenhados (`"svg:<nome>"`, lista em `UI.ICONES_ABA`, lido por
  `UI.iconeAba`); glifo digitado (`◆`) só sobrevive nas abas antigas.
- **Sem filete colorido na borda**. A página já diz de que pilar é; onde
  pilares se misturam (visão geral), quem identifica é o ícone do pilar.
- **Faixa de números contígua**: toda `.g3`/`.g4` de `.stat-value` vira uma
  faixa só, com as peças separadas por 1px, em vez de quatro cartões soltos.
- **Raio segue a hierarquia**: janela 18, superfície 14, controle 8, selo em
  pílula. Um raio só em tudo é outro tique de kit.
- **Abas de página** (`.abas`): sublinhadas, para seções irmãs (Financeiro:
  resumo do mês, contas e cartões, investimentos; perfil: sobre você, painel,
  conta e dados).
- **Interruptor** (`.switch`) para o que é de fato ligar e desligar; caixa de
  marcar para concluir item.
- Alinhamento à esquerda; números tabulares à direita.
- **Toda aba abre do mesmo jeito (1.5)**: leitura na voz, faixa de números,
  "O que o Delfos notou" e "Perguntas do Delfos". Leitura e notas vêm de
  `leituras.js`; nenhuma página inventa componente próprio para isso.
- **Criador de aba**: janela larga em duas colunas — à esquerda o que a pessoa
  decide (nome grande na voz, ícones, cores, interruptores), à direita a
  prévia viva de como a aba vai ficar (campos com interruptor, meta,
  agrupamento, exemplos em pílula). O estado da IA é uma linha discreta
  embaixo do nome, com o ícone `ia` — nunca um cartão chamativo, nunca brilho
  ou gradiente "mágico".
- **Hábitos** (aba com `checkin`): sete quadradinhos dos últimos dias e a
  sequência escrita; o botão "Hoje" fica sempre visível, fora do menu que
  aparece ao passar o ponteiro.

```
┌────────────┬─────────────────────────────────────────────────────┐
│ ⌂ Delfos   │  Financeiro ⟨voz⟩           [ajustes] [importar] [+] │
│            │  Resumo do mês   Contas e cartões   Investimentos    │
│ ◉ Visão    │  ‹ Setembro de 2026 ›                                │
│ ◯ Pessoal  │                                                      │
│ ▭ Financ.  │  ⟨voz⟩ Em setembro, até agora, entraram R$ 1.150 e   │
│ ▯ Faculd.  │  saíram R$ 545. Sobraram R$ 604, 53% do que entrou.  │
│ ↗ Projetos │                                                      │
│ + Nova aba │  ┌ Sobrou ┬ Entrou ┬ Saiu ┬ Saldo ┐  (faixa contígua) │
│            │  Para onde foi ▬▬▬▬      │ Ritmo do mês  ╱╱          │
│ (LF) Luiz  │  Perguntas do Delfos ⟨voz⟩                           │
└────────────┴─────────────────────────────────────────────────────┘
```

## Movimento

O hover responde ao gesto em vez de "ligar" um estado. Três curvas em `theme.css`
(`--ease-saida`, que chega rápido e assenta devagar; `--ease-mola`, que passa um
fio do ponto e volta; `--ease-troca`) e três tempos (160/280/460 ms) para tudo.

- **Luz que segue o ponteiro** nos cartões: um halo de osso a 6% (3,5% no claro)
  e um fio de luz na borda perto do ponteiro — nenhuma cor nova, nenhum brilho.
- **Destaque que desliza**: um único fundo percorre os itens do menu lateral; o
  sublinhado das abas corre até a aba sob o ponteiro e volta à ativa; o fundo da
  escolha única (Despesa/Receita) desliza até a opção marcada.
- O que leva a algum lugar (cartão de pilar, anexo) sobe 2px com sombra; o resto
  só acende. Botão cede ao clique e volta com mola; o "+" gira 90°; o sublinhado
  dos links se desenha da esquerda para a direita; linhas de lista ganham um véu
  e as ações chegam deslizando.
- As seções da página chegam em cascata curta (40 ms entre elas), só na primeira
  pintura — re-render não anima de novo.
- Tudo de ponteiro fica em `(hover: hover) and (pointer: fine)`; com "reduzir
  movimento" no sistema, `UI.movimento` não cria nada e o CSS zera as durações.

## Gráficos

- Barra com 4px de ponta arredondada, até 20–24px de espessura, 2px de vão
  entre barras vizinhas. Linha de 2px. Grade e eixo em fio de 1px, sólido.
- **Toda barra leva o valor escrito ao lado**; cor nunca é o único canal.
- Duas séries ou mais ⇒ legenda. Uma série ⇒ o título já diz o que é.
- O **ritmo do mês** (gasto acumulado dia a dia) é ênfase: o mês aberto em
  bronze, o anterior em cinza de contexto, a projeção tracejada (tracejado aqui
  significa projeção — nunca em grade). Mira + dica ao passar o ponteiro, e a
  frase embaixo repete os números, para nada depender do ponteiro.

## Regras que continuam valendo

- Cor significa **dado** (pilar, série) ou **urgência** — nunca decoração.
- Vermelho é exclusivo de urgência.
- Metadados em frase ou com vírgula, nunca colados com "·" (o "·" só sobrevive
  no título da aba do navegador).
