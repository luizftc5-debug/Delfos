# Delfos — direção visual: azulejo baiano

Ancorado em Salvador, onde o Luiz mora: modernismo brasileiro e o azulejo de
Athos Bulcão — módulo geométrico, arco de um quarto de círculo, cobalto sobre
cal. Não é tema decorativo: a estrutura do painel *é* a lógica do azulejo.

## Cor

**O escuro é o padrão** — o claro existe, mas é escolha explícita. A primeira
tentativa foi cobalto vivo sobre parede branca e ficou berrante; o chão passou
a ser azul de tinta, e o cobalto se dividiu em dois papéis.

| Token | Escuro (padrão) | Papel |
|---|---|---|
| `--cal` | `#0E141D` | fundo da página — azul de tinta, não cinza morto |
| `--tile` | `#16202E` | superfície do azulejo (cartão) |
| `--rejunte` | `#243246` | a linha de 1px entre ladrilhos |
| `--tinta` | `#E7EEF6` | texto |
| `--cobalto-painel` | `#10203A` | **fundo**: barra lateral, saldo, topo do perfil |
| `--cobalto` | `#4183E0` | **ação**: botão primário, foco, link |
| `--s-financeiro` | `#24A981` | mata |
| `--s-faculdade` | `#4183E0` | cobalto |
| `--s-projetos` | `#CF8425` | sol |
| `--s-pessoal` | `#CC5287` | buganvília |
| `--st-critical` | `#E2593F` | só urgência, nunca série |

Separar `--cobalto-painel` de `--cobalto` foi a correção que resolveu o
berrante: painel é fundo profundo, ação é vivo. Misturar os dois pintava
metade da tela com a cor de botão.

## Tipografia

**Archivo** (Omnibus-Type, Argentina) — uma só família, com o eixo de largura
fazendo o contraste: títulos em `wdth 115` peso 700, corpo em `wdth 100` peso
400. Grotesca de tradição latino-americana, com a largura expandida lembrando
letreiro modernista brasileiro.

Nada de monoespaçada para rótulo pequeno, nada de versalete tracked-out.

## Layout

O azulejo é modular e os ladrilhos se **encostam**, separados pelo rejunte —
não flutuam com sombra e vão. Daí:

```
┌────────────┬─────────────────────────────────────────────┐
│ ▚▞▚▞ AZUL  │  Boa noite, Luiz                            │
│ ▞▚▞▚ EJO   │  ───────────────────────────────────────    │
│            │                                             │
│  LF Luiz   │  ┌───────────────────┐┌──────────────────┐  │
│            │  │ ▟ cobalto: saldo  ││ ▟ próximo        │  │
│  ● Visão   │  └───────────────────┘└──────────────────┘  │
│  ● Pessoal │                                             │
│  ● Finance │  ┌──────┬──────┬──────┬──────┐  ← campo de  │
│  ● Faculd. │  │▟     │▟     │▟     │▟     │    ladrilhos │
│  ● Projeto │  │R$550 │  1   │  1   │  1   │    encostados│
│            │  └──────┴──────┴──────┴──────┘               │
│  Delfos    │                                             │
└────────────┴─────────────────────────────────────────────┘
```

- **A barra lateral é o único lugar ousado**: painel de cobalto profundo com o
  padrão de azulejo em tom sobre tom, a 5% de alfa em módulo de 38px — é
  textura que se nota de perto, não estampa que grita de longe. A primeira
  versão, com módulo de 64px, virava camuflagem.
- **`▟` = a marca de arco**: um quarto de círculo sólido no canto superior
  esquerdo do cartão, na cor do pilar. É o que identifica a área — substitui a
  etiqueta em maiúsculas.
- **Campo de ladrilhos** (`.campo`): grupos afins viram uma grade contígua com
  1px de rejunte, não cartões soltos. A faixa dos pilares usa `auto-fit`, para
  não sobrar buraco de rejunte quando o número de abas não fecha a linha.
- Alinhamento à esquerda em tudo; números tabulares alinhados à direita.

## O que foi deliberadamente removido

O visual anterior tinha, todos ao mesmo tempo, os vícios que fazem uma tela
parecer gerada por IA. Saíram:

- etiqueta em CAIXA ALTA tracked-out acima de cada título
- monoespaçada para rótulo de dado
- metadados grudados com ponto médio (`consulta · 10/09/2026`)
- preto falso (`#101420`) no lugar de uma cor de verdade
- `→` colado no fim de link e botão
- cartões todos com o mesmo canto e a mesma sombra cinza

## Regras que continuam valendo

- Cor só significa **dado** (pilar) ou **urgência** — nunca decoração.
- Toda barra de gráfico leva o valor escrito ao lado; cor nunca é o único canal.
- Vermelho é exclusivo de urgência.
