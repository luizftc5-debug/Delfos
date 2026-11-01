# Design System: Delfos, "Coluna"

Revisão de 1º de novembro de 2026. Substitui a direção "marfim" (1.8) e a
revisão de 25/10. Auditoria que motivou a mudança: `DESIGN_AUDIT.md` na raiz;
capturas antes e depois em `design-audit/`.

## Em uma linha

**O caráter vem de tipografia, espaço e fio, na voz e nas cores do quadro de
identidade.** Nada vira caixa sem ser objeto; a cor só existe onde carrega
informação; a coluna do símbolo é o único ornamento, e ela aparece como fio.

## 1. Marca

O quadro de identidade (D com coluna, "Delfos" em serifa firme, "O ESSENCIAL
SE REVELA." espaçado, paleta preto/carvão/grafite/marfim/cinza quente) é a
referência. Arquivos em `marca/`.

- **Símbolo**: o D com coluna dórica (capitel em degrau, fuste com duas
  caneluras, base). Desenhado em geometria a partir do quadro, num caminho só
  (`SIMBOLO` em `ui.js`, `UI.simbolo()`, `icone("delfos")`). Em 32px ou menos
  (favicon) usa a variação monolítica, de uma canelura só, para não virar
  borrão. Se aparecer o arquivo original do quadro, refazer o traçado sobre ele.
- **Logotipo**: "Delfos" em Noto Serif Display 650 convertida em contorno
  (`LOGOTIPO`, `UI.logotipo()`), nunca texto digitado. O par "lf" tem um
  respiro a mais para a barra do "f" não tocar o "l".
- **Assinatura**: "O essencial se revela.", sempre esta, em Jost, caixa alta,
  espaçamento 0,32em, cinza. Barra lateral, entrada, boas-vindas, página
  inicial. "Organização para o que importa" saiu.
- **Ícone de app**: símbolo marfim em quadrado preto (`apple-touch-icon.png`,
  `marca/icone-app-*.svg`). Favicon com raio 7/32.
- Área livre: nada a menos de meia altura do símbolo.

## 2. Tokens

Um arquivo só: **`tokens.css`**, carregado antes de tudo. Nenhum outro arquivo
redefine cor, tipo, espaço, raio ou movimento (as preferências do perfil no fim
de `theme.css` são a única exceção, por serem escolha do usuário).

### Cor

| Token | Escuro | Claro | Papel |
|---|---|---|---|
| `--fundo` | `#0e0e0d` | marfim `#ede9e1` | a página |
| `--lateral` | preto `#0b0b0b` | `#e6e1d7` | o plano de trás |
| `--superficie` | `#151514` | `#f4f1eb` | objeto (janela, menu, meta) |
| `--superficie-2` | carvão `#1f1f1f` | `#e2ddd3` | controle |
| `--superficie-3` | `#2a2a28` | cinza quente `#d6d1c7` | controle escolhido |
| `--linha` / `--linha-forte` | marfim a 9% / 17% | preto a 10% / 19% | fio de 1px |
| `--texto` | marfim | `#121211` | primário (15:1) |
| `--texto-2` | `#b3aea5` | `#46423b` | secundário (7,4:1 ou mais) |
| `--texto-3` | `#8e897f` | `#615c54` | terciário (4,6:1 ou mais em toda superfície) |

Três níveis de texto, todos AA sobre fundo, lateral e as três superfícies
(contas no fim da auditoria da Fase 4). Nunca `#000` nem `#fff`.

**Sem acento metálico** (decisão do Luiz): o quadro é preto e marfim chapados;
o champanhe do D em 3D fica só no vídeo da página inicial.

Cor fora do cromo, e só para dado: as quatro áreas (`--s-*`, validadas para
daltonismo, sem mudança), entrada × saída (`--serie-*`) e estado
(`--st-*`, dessaturados). Vermelho só para atraso e negativo; âmbar só para
"hoje/amanhã"; o resto dos prazos fica em cinza. Número grande nunca fica
verde: subir é o normal.

### Tipografia

| Papel | Família | Por quê |
|---|---|---|
| Voz | **Noto Serif Display** (300 a 700) | É a família do logotipo: escolhida desenhando "Delfos" em 16 serifas de exibição e comparando com o quadro (peso firme, D largo, contraste alto, "f" estreito). Algarismos alinhados, pesos de 100 a 900. Newsreader (lembrava assistente de IA, já descartada na 1.6), Fraunces (a serifa padrão de landing gerada), Instrument Serif (um peso só) e Playfair (algarismos antigos) foram descartadas. |
| Todo o resto | **Jost** (300 a 600) | O desenho geométrico da assinatura do quadro (O redondo, caixa alta leve), sem cair na Montserrat. Tem algarismos tabulares, sinal de menos e todos os acentos. |

Um par, no máximo. Inter, Space Mono e as outras do editor de resumos são
conteúdo do usuário (fonte que ele escolhe para o texto), não identidade.

**Escala** (`--t-*`): miúdos fixos para interface (11, 12, 13), corpo 15, e
dali para cima razão 1,25 (19, 23, 29, 37, 46, 57), mais 17 para texto de
destaque. Nada de meio pixel.

- Serifa grande: peso 300, espaçamento -0,032em (37px para cima) a -0,022em.
- Títulos de seção: serifa 23, peso 400.
- Rótulo de grupo (`.rotulo`, `.stat-label`, cabeçalho de tabela, dia da
  semana): Jost 11, peso 500, caixa alta, +0,12em. Um por grupo, nunca acima
  de todo título; datas agrupadas continuam em frase.
- Leitura (a frase do Delfos): serifa 23 leve, cinza, com o que importa em
  marfim. Fica abaixo do título, até 34em.
- Texto corrido: até 68ch (`--medida`).
- Números: tabulares em coluna; proporcionais e na voz quando grandes e sozinhos.

### Espaço

Grade de 4 (`--e-1` a `--e-20`: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80).
Seções separadas por 48; colunas por 64. 97% dos espaçamentos do tema estão na
grade; o resto é fio de 1 ou 2px.

### Raio

Quase reto, uma linguagem só: **2** (miúdo), **4** (controle, botão, campo,
pílula de filtro), **6** (superfície, janela). Pílula total só no interruptor,
que imita um objeto físico. Círculo só no ponto de cor (calendário) e no
marcador de hoje; o retrato é quadrado de raio 4.

### Profundidade

Contraste de superfície e fio, nunca sombra em superfície. Só o que flutua
(janela, menu, aviso) leva `--shadow-pop`: um fio forte mais uma sombra longa
tingida de preto. Sem desfoque atrás das janelas: o fundo escurece a 72%.

### Movimento

Uma curva: `cubic-bezier(0.22, 1, 0.36, 1)`. Três tempos: 180, 280, 420 ms.
Sem mola, sem quique. Movimento só para confirmar (botão cede a 0,98, janela
sobe 8px) ou guiar (o fio da coluna cresce no item ativo da barra, o
sublinhado corre no botão terciário, a seta da sanfona gira). A luz que seguia
o ponteiro saiu. Com "reduzir movimento", os tempos viram 0,01 ms.

## 3. Componentes

- **Barra lateral**: plano preto; símbolo + logotipo + assinatura no alto; o
  item ativo não é um bloco cheio, é texto marfim com **um fio vertical de
  1,5px à esquerda (a coluna)**. Contagens em algarismo pequeno; vermelho só
  na Visão geral quando há atraso.
- **Barra de abas do celular**: plano preto, fio em cima; a aba aberta ganha
  um fio marfim por cima. Contagens em número sobrescrito, sem bolha vermelha.
- **Botões**: primário marfim chapado (preto no claro); secundário só fio;
  terciário (`.ghost`) texto com sublinhado que corre da esquerda no hover.
  Hover muda a superfície, não a cor. Pressionado: 0,98. Foco: fio marfim de
  1,5px a 3px de distância. Desabilitado: 38%. Carregando:
  `aria-busy="true"` troca o rótulo por um anel fino. 40px de altura (44 no
  celular). Um primário por tela: estado vazio e coluna de contexto usam o
  secundário.
- **Campos**: superfície, fio forte, raio 4; o foco troca o fio por marfim
  (sem halo). Erro: fio vermelho. Checkbox próprio, quadrado de raio 2.
- **Filtros**: retângulos de raio 4 com fio; escolhido em `--superficie-3`.
- **Seção**: título na voz e fio; nunca caixa. Na coluna de contexto, o título
  vira rótulo em caixa alta sobre um fio forte.
- **Razão de números**: fio forte em cima, fio embaixo, colunas separadas por
  fio, rótulo em caixa alta, número na voz leve. Substituiu a placa marfim.
- **Objeto** (`.card`): superfície em tom, fio de 1px, raio 6, sem sombra.
  Só para o que se toca como coisa: meta, conta, investimento, resumo.
- **Tabela**: sem moldura; cabeçalho em rótulo; linhas por fio; total com fio
  forte. No celular, lista.
- **Janela**: raio 6, sombra de flutuação, título na voz leve 29, rodapé
  separado por fio. O diálogo nunca mostra anel de foco (só os controles).
- **Aviso**: marfim chapado sobre o escuro (inverso), raio 4.
- **Estado vazio**: alinhado à esquerda, sem ícone em caixa: frase na voz,
  explicação curta, uma ação secundária.
- **Mais nesta área**: as seções menos frequentes de cada área numa lista só,
  com rótulo, cada uma abrindo no lugar (sanfona de fio, seta que gira).
- **Agenda**: a semana em sete colunas de fio, o dia na voz; o selecionado
  ganha superfície e o fio da coluna por cima; hoje tem um ponto.

## 4. Ícones

Grade de 24, traço de 1,25, pontas retas, cantos em quina. **Seis próprios**
(`PROPRIOS` em `ui.js`), na lógica da coluna: templo (Visão geral), busto
sobre plinto (Pessoal), colunas de moedas (Financeiro), livro com lombada
(Faculdade), colunas que sobem com capitel (Projetos), grade (aba criada). O
resto é **Phosphor Light** (MIT), o peso que casa com 1,25. As máscaras de área
em CSS (`--ic-*`) usam os mesmos desenhos. Prévia: `icons/index.html`
(gerada por `design-audit/scripts/gerar-icones.cjs`).

## 5. Microcopy

Português claro, frase curta, sem adjetivo vazio. O Delfos fala na primeira
pessoa do painel só na leitura. Datas por extenso, número com unidade, verbo
no lugar de substantivo ("Lançar custo", não "Lançamento de custo"). Nada de
travessão na interface; nada de "num só lugar", "simples", "poderoso".

## 6. O que já foi tentado (e por que saiu)

1. **Estúdio**: etiqueta em caixa alta acima de todo título, monoespaçada.
2. **Azulejo baiano**: ornamento temático competindo com a leitura.
3. **Oráculo sóbrio** (1.2 a 1.6): filete colorido em todo cartão, ícones
   desenhados à mão sem sistema, Newsreader pesada.
4. **Consulta** (1.7): voz sem serifa; brigava com o logotipo.
5. **Marfim** (1.8) e a revisão de 25/10: a marca antiga (serifa fina, sem o
   símbolo), três camadas de tokens que se contradiziam, 18 raios, 38 tamanhos
   de fonte, a placa marfim invertida e tudo em cartão com sombra.

## 7. Proibições

- Escrever "Delfos" numa fonte no lugar do logotipo; usar outra assinatura.
- Definir cor, tamanho, espaço ou raio fora de `tokens.css`.
- Sombra em superfície; desfoque; gradiente decorativo; luz que segue o ponteiro.
- Caixa para o que não é objeto; caixa dentro de caixa.
- Mais de um botão primário visível por área.
- Raio fora de 2/4/6; pílula fora do interruptor.
- Cor como enfeite; verde em número grande; âmbar em prazo distante.
- Caixa alta espaçada fora de rótulo de grupo e assinatura.
- Ícone digitado (‹ › ↗ +) no lugar de ícone de verdade.
- Travessão no texto da interface; hífen como sinal de menos em dinheiro.
