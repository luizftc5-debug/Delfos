# Auditoria visual do Delfos (Fase 1)

Data: 1º de novembro de 2026. Branch: `claude/admiring-thompson-0shugi`.
Nada de código foi alterado nesta fase.

## Como foi feito

- Painel servido localmente e preenchido com **dados fictícios** de demonstração (contas, lançamentos,
  disciplinas, prazos, projetos, compromissos), gravados pelo próprio `Store`. Vazio, o painel só mostraria
  estados vazios.
- Capturas com Playwright em 1440×900 (computador) e 390×844 (celular, 2x), página inteira, tema escuro
  em todas as telas; tema claro em Visão geral, Financeiro, Faculdade e Pessoal; janelas de Novo lançamento
  e Perfil. Total: 39 imagens em `design-audit/before/`. Script em `design-audit/scripts/capturas.cjs`
  (o mesmo vai gerar o "depois").
- `entrar.html` não foi capturada: com `API_PUBLICA` vazia, ela redireciona para o painel.
- Código lido: `theme.css` (3.340 linhas), `interface.css`, `areas.css`, `editor.css`, `ui.js`,
  `index.html` da raiz, `inicio/css/`, `DESIGN.md`.
- Comparado com o quadro de identidade que você enviou no meio da auditoria (seção 1).

## Resumo

1. **O checklist clássico de "cara de IA" quase não aparece.** As versões 1.7 e 1.8 já tiraram Inter,
   gradiente colorido, glassmorphism, emoji como ícone, grade de três cartões e texto de marketing. Dos
   10 itens pedidos, 2 aparecem de fato, 4 aparecem em parte e 4 não aparecem (tabela na seção 2).
2. **A cara genérica vem de outros lugares**, e eles são mais graves:
   - **A marca no código está desatualizada em relação ao quadro novo.** O símbolo (o D com a coluna)
     não aparece em nenhum lugar do painel; o favicon é um D sem coluna; o logotipo é uma serifa fina,
     não a do quadro; existem três assinaturas diferentes. É a principal razão de o produto não ter
     autoria: a identidade existe, mas a interface não a usa.
   - **A revisão de 25/10 trouxe de volta o "kit de cartões" de painel SaaS**: tudo em caixa com
     sombra, faixas marfim invertidas no tema escuro, títulos de seção em sans 600, pílulas de atalho e
     quatro sanfonas empilhadas.
   - **Não há sistema**, só camadas: três arquivos redefinem os mesmos tokens com valores diferentes,
     com 18 raios, 38 tamanhos de fonte e 54% dos espaçamentos fora da grade de 4px.

## 1. O quadro de identidade contra o que está no código

| Elemento | Quadro (referência) | Hoje no repositório | Onde |
|---|---|---|---|
| Símbolo | D com coluna (capitel, fuste com duas caneluras, base), em 3 variações (clássica, abertura, monolítica) | **Não existe.** Nenhuma tela usa o símbolo | — |
| Favicon e ícone de app | D com coluna, marfim sobre preto e preto sobre marfim, quadrado arredondado | D liso, sem coluna (favicon); logotipo fino inteiro (`apple-touch-icon.png`) | `dashboard/favicon.svg`, `dashboard/apple-touch-icon.png`; ver `design-audit/before/30-marca-no-repositorio.png` |
| Logotipo "Delfos" | Serifa de alto contraste, **peso médio a negrito**, bem firme | Serifa **fina** (traçado do quadro antigo) | `dashboard/ui.js` (`LOGOTIPO`), copiado em `entrar.html`, `bemvindo.html`, `index.html` |
| Assinatura | "O ESSENCIAL SE REVELA." em sans leve, caixa alta, espaçamento largo | Três versões: "O essencial se revela." em serifa minúscula (barra lateral); "O essencial se revela: seu editor sem distrações" (editor); "Organização para o que importa" (entrada, boas-vindas, página inicial) | `ui.js:726`, `resumo.html:121`, `entrar.html:21`, `bemvindo.html:21`, `index.html:6,54,83` |
| Paleta | Preto #0B0B0B, Carvão #1F1F1F, Grafite #3A3A3A, Marfim #EDE9E1, Cinza quente #D6D1C7 | Igual em `theme.css`, mas **`interface.css` sobrescreve** com #111210, #1c1d1b, #282925, #343530 e, no claro, #efede7 e #fffcf6 (branco quase puro) | `interface.css:3-29` |
| Rótulos | Caixa alta espaçada como rótulo de seção ("PALETA DE CORES", "APP ICON") | Proibida em `DESIGN.md` como vício de IA | `DESIGN.md`, seção 7 |

**Observações sobre o quadro:**

- **Metálico.** O quadro é plano (preto e marfim). O "D metálico" só existe no render 3D do vídeo da página
  inicial. Extraí a rampa dele de `inicio/assets/delfos-d.webp`: brilho #F1E8DE, luz #E6DACF, meio-tom
  #BCAC9F, sombra #807368, fundo #50463E. É um champanhe quente, levemente rosado, diferente do marfim
  neutro. Proposta para a Fase 2: usar #BCAC9F/#807368 como o acento raro (no máximo 5% da tela) que você
  pediu, por ser o único tom "metálico" que a marca de fato tem. Isso precisa da sua aprovação (pergunta 2).
- **Tipografia do quadro.** O logotipo é desenho. As letras de amostra e a assinatura parecem uma sans
  geométrica leve com espaçamento largo, de família parecida com Montserrat Light ou Jost Light (não dá
  para confirmar só pela imagem). Montserrat está na sua própria lista de fontes proibidas; se o quadro usa
  Montserrat, proponho uma alternativa de mesmo desenho e menos batida.
- **Preciso do arquivo original do quadro** (SVG, PDF ou PNG grande) dentro do repositório, por exemplo em
  `marca/`. A imagem enviada no chat chega para mim só como visualização: não consigo ler os pixels dela
  para vetorizar o símbolo com fidelidade. Foi assim (potrace sobre a imagem) que o logotipo atual foi feito.

## 2. Checklist pedido

| # | Item | Situação | Onde | Peso |
|---|---|---|---|---|
| 1 | Inter, Roboto, Poppins, Montserrat, Space Grotesk ou system-ui como identidade | **Não.** Identidade: Noto Serif Display + Funnel Sans. Inter e Space Mono só aparecem como opção de fonte do usuário no editor de resumos. `system-ui`/`Roboto` só como reserva em `--font` | `theme.css:83-85`; `resumo.html`/`disciplina.html` (link de fontes do editor) | baixo |
| 2 | Gradiente roxo/azul, glassmorphism, glow, blur decorativo | **Em parte.** Nenhum gradiente colorido. Restam: desfoque atrás das janelas e na barra do celular; desfoque na entrada da leitura; luz radial que segue o ponteiro; brilho atrás do D na página inicial | `theme.css:1006-1007`, `2882-2883`, `2589`, `2567-2581`; `inicio/css/delfos-hero.css:43-60` | médio |
| 3 | Raio grande em tudo, sem critério | **Sim.** 18 valores de raio distintos (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 22, 24, 999px). `DESIGN.md` prevê 4 níveis; `interface.css` e `areas.css` acrescentam 9, 14 e 18 | `interface.css:39,108,119,154`; `areas.css:13,34,49` | **alto** |
| 4 | Sombra difusa genérica | **Sim, reintroduzida.** `theme.css:78` define `--shadow: none` (decisão da 1.7); `interface.css:16,28` volta a pôr sombra em todo `.card`; botão primário com sombra própria; folha do editor com sombra | `interface.css:16,28,67,69`; `editor.css` (`.editor-folha`, `.editor-barra`) | **alto** |
| 5 | Hero centralizado com etiqueta pílula, título e dois botões | **Em parte**, só na página pública: etiqueta "DELFOS" em caixa alta espaçada acima do título centralizado, um botão. Não há pílula nem segundo botão | `index.html:46-55`; `inicio/css/delfos-hero.css:108-115` | médio |
| 6 | Lucide/Heroicons sem ajuste, ou emoji como ícone | **Em parte.** O set é Phosphor Regular (78 ícones em `ui.js`, 12 em `resumo.js`) sem nenhum ajuste de traço ou tamanho para a marca, o que o torna tão reconhecível quanto Lucide. Ícone de aba criada usa glifos Unicode (◆ ★ ♥ ⚡ ✈…). Setas digitadas ‹ › como ícone na agenda e no calendário | `ui.js:24`; `store.js:299-304`; `dashboard/index.html:50-51`; `calendario.js:222,224`; `pilar.js:448,450` | médio |
| 7 | Cartões idênticos em grade de 3 colunas (ícone, título, texto) | **Não** no formato clássico. Mas há uma variante: toda seção é um cartão igual (mesmo fundo, fio, raio 16 a 18, sombra), lado a lado em duas colunas, em todas as páginas | `areas.css:34` (`.area-painel`), `interface.css:119,136,154` | **alto** |
| 8 | Botão de cor sólida saturada, sem estados refinados | **Não** quanto à cor (primário é marfim). Mas os estados conflitam: `theme.css:2432` encolhe a 0,97 e `interface.css:68` desce 1px; não há estado de carregamento; o item ativo da barra lateral é um bloco marfim cheio, o elemento mais pesado da tela | `theme.css:2432`; `interface.css:40,67-68` | médio |
| 9 | Texto de marketing vazio | **Quase não.** Restam "Num só lugar." (página inicial) e "seu editor sem distrações" (editor). O resto da interface é específico e bem escrito | `index.html:47`; `resumo.html:121` | baixo |
| 10 | Espaçamento inconsistente, sem escala | **Sim.** 43 valores de padding/margin/gap; 520 de 962 usos (54%) fora da grade de 4px (13, 15, 18, 22, 26, 38…). 38 tamanhos de fonte distintos, de 9,5px a 56px, inclusive meios-pixels (12,5; 13,5; 14,5; 15,5; 16,5) | todos os `.css` de `dashboard/` | **alto** |

## 3. O que denuncia "feito por IA" fora do checklist

Em ordem de impacto.

### A. Faixa marfim invertida no tema escuro
Os números do topo de quase toda página ficam numa placa marfim clara, raio 18, sobre fundo preto
("Sua semana, num olhar"; "Faltou no mês / Entrou / Saiu"). É o recurso mais característico de template:
um bloco de destaque que grita mais alto que a página. No tema claro ela some (bege sobre bege), o que
mostra que o claro foi derivado do escuro, não desenhado.
`interface.css:86-104` (`.dia-resumo`, `.area-resumo`, tokens próprios), `areas.css:7-26`.
Capturas: `01-visao-geral-desktop.png`, `02-financeiro-desktop.png`, `10-projeto-desktop.png`.

### B. Tudo é cartão
Agenda, "Suas áreas", "Seu dinheiro", "Na sua rotina", "Para acompanhar", "Disciplinas", "Médias",
"Etapas", "Recebimentos", "Custos", "Ficha", "Anotações", "Documentos": cada um numa caixa idêntica.
Cartão dentro de cartão em Metas (`02-financeiro`) e na tabela de lançamentos (caixa da tabela dentro da
caixa da seção, filtros numa terceira caixa). A hierarquia vem só de caixa, não de tipografia e espaço.
`areas.css:34-36`, `interface.css:119,136,154`, `areas.css:65`.

### C. A voz da marca sumiu das páginas
A 1.8 usava a serifa como voz (leitura, títulos de seção). A revisão de 25/10 trocou títulos de seção e
de cartão por Funnel Sans 600 com -0,02em, e a leitura por texto corrido de 15px cinza. Resultado: a
serifa só aparece no título da página; o resto é idêntico a qualquer painel SaaS em sans semibold.
`interface.css:60,62,70`; `areas.css:36`.

### D. Pílulas de atalho e sanfonas empilhadas
- Fileira de botões "Lançamentos / A pagar / Metas / Análise" (e "Disciplinas / Prazos / Planejamento")
  que repete as seções logo abaixo. `areas.css:28-30`.
- Três ou quatro `details` largos, iguais, com "+" digitado à direita, no pé de cada página ("Entender
  seus gastos…", "Alertas e acompanhamento", "Ajustar limites…", "Documentos do Google Drive").
  `areas.css:49-56`. Juntas, parecem uma FAQ de site, não uma ferramenta.
- **Mexer nisso é estrutural** (HTML e ordem de seções): ver pergunta 4.

### E. Cor de status como decoração
Âmbar em todo "em 3 dias", "amanhã", "em 6 dias"; vermelho no número grande "R$ 99,90" e no dia "30";
verde em "R$ 320,00" de projeto e na barra de meta; bronze no foco do campo de valor; ícone verde em
quadradinho no cabeçalho da janela de lançamento; bolinhas vermelhas com contador na barra do celular.
A tela inteira pisca em âmbar. Urgência deixa de significar algo.
`theme.css:51-57` (tokens), `theme.css:1160-1161` (foco colorido), `theme.css:2923-2939` (`.tab-conta`).
Capturas: `01-visao-geral-*`, `10-projeto-desktop.png`, `20-modal-lancamento-desktop.png`.

### F. Três camadas de tokens que se contradizem
`theme.css` define a paleta da marca; `interface.css` redefine `--fundo`, `--superficie`, `--texto-2`,
`--texto-3`, `--linha`, `--shadow`, `--r-lg`, `--r-xl` com outros valores; `.dia-resumo`/`.area-resumo`
redefinem tudo de novo localmente; `editor.css` sobrescreve por cima. 58 cores em hexadecimal soltas em
`theme.css`, 51 em `delfos.js`. Nenhum lugar diz qual é a verdade. Também há documentação divergente:
`ui.js:9` diz versão 1.8, os commits falam em 2.2, e `DESIGN.md` tem duas partes que se contradizem
(a revisão de 25/10 desfaz princípios da 1.8 descritos logo abaixo).

### G. Janela com moldura marfim de 2px
Ao abrir uma janela sem mouse, o próprio diálogo (`tabindex="-1"`) recebe o anel de foco global:
aparece uma moldura branca grossa em volta de toda a janela.
`theme.css:180-184` (`:where(..., [tabindex]):focus-visible`), `ui.js:1696`.
Capturas: `20-modal-lancamento-desktop.png`, `21-modal-perfil-desktop.png`.

### H. Estado vazio de template
Ícone num quadradinho, título em serifa centralizado, texto cinza e botão marfim centralizado
("Nenhum custo lançado"). É o estado vazio padrão de todo kit de UI.
`theme.css:977-997`. Captura: `10-projeto-desktop.png`.

### I. Detalhes de acabamento
- Item ativo da barra lateral em bloco marfim cheio (`interface.css:40`): pesa mais que o título da página.
- Setas ‹ › digitadas a 22px na navegação da semana (`interface.css:123`, `dashboard/index.html:50-51`).
- Ponto verde antes de "Salvo" no editor (`editor.css:14`).
- Rodapé permanente com logotipo e slogan no editor de resumos, uma faixa de marca dentro da ferramenta de
  escrita (`resumo.html:121`, `editor.css`, `.editor-rodape`).
- Metadados do projeto soltos e coloridos ("em andamento · Aulas · em 40 dias · prioridade alta") sem
  hierarquia (`10-projeto-desktop.png`).
- Página inicial pública: na captura de página inteira, cerca de 4.000px de preto entre o vídeo e o
  conteúdo. É a rolagem do vídeo (esperado), mas vale conferir se a rolagem é longa demais no celular.

## 4. O que já funciona e eu manteria

- Paleta da marca em `theme.css` (é exatamente a do quadro). O erro é a sobrescrita, não a escolha.
- Contraste: os pares de texto passam AA nos dois temas (texto terciário escuro 6,3:1 sobre a
  superfície; claro 4,6:1 sobre `--superficie-2`; texto da faixa marfim 5,0:1). O risco está nos tons de
  status sobre as superfícies novas, que vou revalidar na Fase 4.
- Dinheiro com R$ e centavos menores, sinal de menos de verdade (U+2212), números tabulares em colunas.
- Microcopy da interface: específica, em português claro, sem adjetivo vazio ("Conclua ou mude a data
  para a agenda não mentir" é voz de marca de verdade).
- Acessibilidade das janelas (foco preso, Esc, nome por `aria-labelledby`), "pular para o conteúdo",
  modo leve, respeito a "reduzir movimento".
- Cores dos pilares validadas para daltonismo, com ícone e nome como segundo canal.

## 5. Pontos em que o briefing conflita com o histórico do projeto

Discordo de três sugestões do briefing, com a razão de cada uma. A decisão é sua.

1. **Fontes sugeridas.** Newsreader já foi usada (1.4 a 1.6) e saiu justamente por "lembrar interface de
   assistente de IA" (`DESIGN.md`, "O que já foi tentado", item 4). Fraunces virou a serifa padrão de
   landing page gerada por ferramenta; trocaria um vício por outro. Instrument Serif só tem peso 400:
   não serve para hierarquia nem para números. PP Editorial e Neue Montreal exigem licença paga. Minha
   recomendação: escolher a voz **contra o logotipo do quadro novo**, como foi feito na 1.8 (desenhar
   "Delfos" em candidatas e comparar), sem reaproveitar a Noto Serif Display por inércia: o logotipo novo
   é mais pesado e ela pode não conversar mais com ele.
2. **Rótulos em caixa alta com espaçamento.** `DESIGN.md` proíbe, como vício de IA da versão "Estúdio".
   Mas o próprio quadro novo usa ("PALETA DE CORES", "APP ICON", a assinatura). Aqui o quadro pesa mais:
   proponho permitir, com regra estrita (assinatura e rótulo de grupo, nunca acima de todo título).
3. **Set de ícones desenhado do zero.** Ícone desenhado à mão já foi tentado e saiu (1.4 a 1.6). Redesenhar
   ~90 ícones com qualidade de produto é um trabalho de semanas para um designer de ícones; feito às
   pressas, fica pior que o Phosphor. Minha recomendação: (a) o símbolo D com coluna vetorizado do quadro;
   (b) os 4 ícones de pilar e os da navegação (~10) desenhados sob medida, com a lógica da coluna (traços
   verticais, capitel, cortes retos); (c) o resto em Phosphor **Light** (traço mais fino, mais perto do
   1,25px pedido), ajustado a uma grade de 24px. Com página de prévia em `/icons`.

Também: não existe Tailwind no projeto (CSS puro, sem build), então os tokens vão em variáveis CSS num
arquivo único.

## 6. Perguntas antes da Fase 2

1. **Arquivo do quadro:** pode subir o arquivo original (SVG, PDF ou PNG grande) do quadro, ou só do
   símbolo e do logotipo, para eu vetorizar? Sem ele, refaço o símbolo a partir da imagem do chat, com
   perda de fidelidade.
2. **Acento metálico:** usar o champanhe do D 3D (#BCAC9F/#807368) como acento raro, ou ficar só no
   preto e marfim chapados do quadro?
3. **Ícones:** a abordagem híbrida da seção 5.3, ou set 100% próprio mesmo assim?
4. **Mudanças estruturais leves** (HTML, nenhuma lógica nem dado): posso (a) tirar a fileira de pílulas
   de atalho, (b) juntar as sanfonas do pé numa única seção "Mais" e (c) tirar o rodapé com logotipo do
   editor? Sem sua autorização, mexo só no visual delas.
5. **Assinatura única:** fica "O essencial se revela." (a do quadro) em todo lugar, substituindo
   "Organização para o que importa"?

---

# Fases 2 a 4: o que foi feito e o resultado

Respostas do Luiz às perguntas da seção 6: (1) sem arquivo do quadro, redesenhar o símbolo a partir da
imagem; (2) só preto e marfim, sem metálico; (3) ícones pela opção híbrida; (4) pode tirar pílulas,
sanfonas e rodapé do editor; (5) assinatura "O essencial se revela.".

Sistema completo em `dashboard/DESIGN.md`. Comparativo visual em `design-audit/comparativo.html`
(antes e depois lado a lado, mesmas telas e dados).

## Commits

1. **Marca do quadro e tokens únicos**: símbolo D com coluna, logotipo em contorno, favicon, ícone de
   app, `marca/`; `tokens.css` como fonte única; Jost no lugar de Funnel Sans; raio, fonte e espaço
   levados à escala.
2. **Componentes, ícones e composição sem caixas**: `interface.css` e `areas.css` reescritos;
   pílulas e rodapé do editor fora; sanfonas juntas; Phosphor Light + 6 próprios; `icons/`.
3. **Revisão final**: assinatura das telas de entrada, celular, foco, microcopy, documentação,
   capturas depois e comparativo.

## Os "tells" da auditoria, um a um

| Achado | Antes | Depois |
|---|---|---|
| Marca desatualizada | D liso, logotipo fino, 3 assinaturas | Símbolo com coluna, logotipo firme, uma assinatura, em todas as telas e na página inicial |
| Tokens em 3 camadas | `theme.css`, `interface.css`, locais | `tokens.css` único; `theme.css` sem tokens; nada redefine cor fora dele |
| Raios | 18 valores | 2, 4, 6 (e o interruptor) |
| Tamanhos de fonte | 38, com meios-pixels | escala de 11 passos (`--t-*`) |
| Espaçamento | 54% fora da grade de 4 | 97% na grade (o resto é fio de 1–2px) |
| Sombra em cartão | todo `.card` e botão primário | nenhuma; só o que flutua |
| Desfoque | janelas, barra do celular, entrada da leitura | nenhum |
| Luz que segue o ponteiro | sim | removida |
| Placa marfim dos números | em quase toda página | razão aberta entre fios |
| Tudo em cartão | todas as seções | seção = título + fio; cartão só para objeto |
| Títulos em sans 600 | sim | voz em serifa; rótulo em caixa alta só no contexto |
| Pílulas de atalho + 4 sanfonas | sim | removidas / "Mais nesta área" |
| Cor de status como enfeite | âmbar em todo prazo, verde em número grande, foco bronze | âmbar só hoje/amanhã (decisão já do JS), número grande neutro, foco marfim |
| Moldura de foco na janela | 2px marfim em volta do diálogo | só nos controles |
| Estado vazio de template | ícone em caixa, tudo centralizado, botão primário | à esquerda, sem ícone, ação secundária |
| Setas digitadas ‹ › | agenda e calendários | ícones |
| Ícones | Phosphor Regular sem ajuste | Phosphor Light + 6 próprios na lógica da coluna |
| "Num só lugar", "seu editor sem distrações" | página inicial, editor | reescritos / removidos |

## Verificação

- **Contraste (AA)**: texto primário 12 a 16:1; secundário 6,5 a 8,9:1; terciário 4,6 a 5,9:1 sobre
  fundo, lateral e as superfícies de objeto e controle, nos dois temas. Botão primário 16:1. Os únicos
  pares abaixo de 4,5 são texto terciário ou de estado sobre `--superficie-3`, combinação que o painel
  não usa (essa superfície só leva texto primário: filtro e segmento escolhidos).
- **Teclado**: "Pular para o conteúdo" primeiro; a ordem segue a leitura (marca, áreas, ações, conteúdo);
  todo controle mostra o anel de 2px marfim a 3px de distância; o diálogo recebe foco sem anel e o Tab
  circula dentro dele (comportamento de `abrirModal`, sem mudança).
- **Responsivo**: 1440 e 390 em todas as telas; celular com alvos de 44px, barra de abas sem bolhas,
  planilha em lista sem fios de célula, filtros em largura total.
- **Claro e escuro**: o claro é o lado marfim do quadro (fundo marfim, primário preto), não uma
  inversão: superfícies, linhas e estados têm valores próprios, validados à parte.
- **Testes**: `node dashboard/test/store.test.cjs` passa (3/3). Nenhum arquivo de lógica mudou além de
  três trocas de marcação (ícone no lugar de seta digitada em `home.js`, `calendario.js`, `pilar.js`) e
  duas frases das boas-vindas.

## Autocrítica: o que ainda não está no nível

Pergunta feita em cada tela: "um designer da Apple aprovaria isso numa review?"

1. **O símbolo foi redesenhado a olho a partir de uma imagem.** Está fiel na estrutura (D, capitel em
   degrau, duas caneluras, base), mas as proporções exatas do quadro só virão do arquivo original.
   Este é o ponto mais importante a resolver.
2. **Cartões de conta, meta e investimento** ainda seguem o padrão "título + Editar/Excluir + valor".
   Estão sóbrios (sem sombra, raio 6), mas não têm desenho próprio. Próximo passo: ações num menu de
   três pontos e o valor como protagonista.
3. **Grade do calendário do Pessoal** continua com a moldura e as células tingidas de antes; funciona,
   mas é o elemento mais "de biblioteca" da tela.
4. **Abas criadas pelo usuário** (`pilar.html`), **a tela de entrar** e o **editor de abas** não entraram
   nas capturas (os dados de demonstração não têm aba própria, e a entrada só abre com o servidor
   ligado). Herdam os mesmos componentes, mas não foram revisadas tela a tela.
5. **Página inicial pública**: só fonte, assinatura e raio mudaram. O hero de vídeo continua centralizado
   com a etiqueta "DELFOS" acima do título; num vídeo de rolagem isso se justifica (o D em 3D do vídeo
   já é o D com coluna), mas a composição merece uma revisão própria.
6. **Gráficos** (ritmo do mês, entradas × saídas) não foram redesenhados; ficam dentro de "Mais nesta
   área" e seguem as regras antigas de cor validadas.
