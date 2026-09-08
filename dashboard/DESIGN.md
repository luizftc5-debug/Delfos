# Delfos — direção visual: oráculo sóbrio

Delfos é o nome de um oráculo, e o painel faz o que um oráculo faz: **lê a
situação e diz em voz baixa o que ela é**. A estética sai daí — autoridade
tranquila, nenhum ornamento, tudo em serviço da leitura.

Duas tentativas anteriores erraram e ficam registradas para não se repetirem:

1. **"Estúdio"** — acumulava os vícios de tela gerada por IA: etiqueta em CAIXA
   ALTA acima de todo título, monoespaçada em rótulo de dado, metadados colados
   com ponto médio, preto falso, `→` no fim de link.
2. **"Azulejo baiano"** — trocou aquilo por ornamento: um padrão de fundo que
   não servia à leitura e competia com ela. Decoração temática não é
   personalidade; é ruído com sotaque.

## O princípio

**Nada de padrão, textura ou enfeite.** Superfície é superfície. O que dá
caráter à tela é a tipografia, o espaço e a hierarquia — não uma camada por
cima. Se um elemento não ajuda a ler a situação, ele sai.

## Cor

Grafite neutro e fosco. O cromo não tem cor nenhuma: botão primário é osso
sobre grafite, foco é osso. **Cor existe só para identificar pilar e marcar
urgência** — e mesmo essa é dessaturada, terrosa, nunca neon.

| Token | Escuro (padrão) | Papel |
|---|---|---|
| `--fundo` | `#15171B` | a página |
| `--superficie` | `#1C1F25` | cartão, barra lateral |
| `--superficie-2` | `#23272F` | recuo, item ativo |
| `--linha` | `#2E333C` | fio de 1px |
| `--texto` | `#E9EAEC` | texto |
| `--texto-2` | `#9BA1AB` | apoio |
| `--texto-3` | `#6B717C` | legenda |
| `--s-financeiro` | `#6E9B7C` | sálvia |
| `--s-faculdade` | `#6488B0` | ardósia |
| `--s-projetos` | `#B58C57` | bronze |
| `--s-pessoal` | `#A0709B` | malva |
| `--urgente` | `#C25A4E` | só urgência, nunca série |

O claro é a mesma lógica em papel osso — escolha explícita, o padrão é o escuro.

## Tipografia

**IBM Plex Sans** em tudo: desenhada para instrumento e documento, tem caráter
nas formas levemente quadradas sem levantar a voz. Números tabulares de série.
O contraste vem de peso e tamanho, não de largura esticada.

**IBM Plex Serif** aparece em um único lugar: a frase de leitura no alto da
visão geral. É o momento em que o painel fala, e a serifa dá voz a isso — o
resto é dado, e dado é sans.

## A leitura

A visão geral não abre mais com um número num painel colorido. Abre com uma
**frase que diz o que está acontecendo** — o compromisso mais próximo, o que
está atrasado, como o mês fechou. O saldo vem logo abaixo, em número grande e
sem moldura.

```
┌──────────┬────────────────────────────────────────────────┐
│ Delfos   │  terça-feira, 8 de setembro                     │
│          │  Bom dia, Luiz                                  │
│ LF Luiz  │                                                 │
│          │  ⟨serifa⟩ Sua semana tem 3 compromissos. O mais │
│ Visão    │  próximo é a consulta, em 2 dias.               │
│ Pessoal  │                                                 │
│ Finance  │  R$ 1.550,00        ┌─────────────────────────┐ │
│ Faculd.  │  saldo atual        │ Próximo compromisso     │ │
│ Projetos │                     └─────────────────────────┘ │
│          │                                                 │
│ Delfos   │  ┌────────┬────────┬────────┬────────┐          │
│ v1.2     │  │▏Finance│▏Faculd │▏Projet │▏Pessoal│          │
└──────────┴────────────────────────────────────────────────┘
```

## Estrutura

- **Barra lateral**: superfície lisa, um fio de 1px separando. Sem cor de
  fundo, sem padrão. O item aberto recebe um filete de 2px na cor do pilar.
- **Identidade de pilar**: um filete de 2px na borda esquerda do cartão. Era um
  arco de círculo na versão anterior — ornamento; virou régua, que é estrutura.
- **Ladrilhos contíguos** (`.campo`): grupos afins se encostam separados por
  1px, em vez de flutuarem soltos com sombra. Usa `auto-fit` para não sobrar
  trilha vazia.
- Alinhamento à esquerda; números tabulares à direita.

## Regras que continuam valendo

- Cor significa **dado** (pilar) ou **urgência** — nunca decoração.
- Toda barra de gráfico leva o valor escrito ao lado; cor nunca é o único canal.
- Vermelho é exclusivo de urgência.
