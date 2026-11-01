# Delfos — direção A: Dia em comum

A interface reúne o que a pessoa precisa fazer e mantém seus planos ao alcance.
O dia é uma entrada para a vida organizada, sem limitar o produto ao presente:
calendário, rotina semanal, próximos meses, projetos e metas continuam disponíveis.
Esta direção altera a apresentação; registros, anexos, preferências, formatos de
backup e a estrutura das abas existentes devem ser preservados.

## Proprietários do sistema

| Arquivo | Responsabilidade |
| --- | --- |
| `tokens.css` | Cores semânticas, tipografia, espaçamento, raios, elevação e movimento |
| `fonts.css` | Source Sans 3 local; arquivos e licença OFL em `vendor/source-sans-3/` |
| `base.css` | Reset, botões e seus estados, foco, visibilidade e redução de movimento |
| `theme.css` | Componentes internos, campos, listas, janelas e estados do painel |
| `paginas.css` | Hierarquia e composição das páginas com seções |
| `sidebar.css` | Barra lateral, estado compacto e transição |
| `home.css` | Visão geral, próxima ação e acessos a planejamento |
| `editor.css` | Área de escrita, ferramentas, foco e rodapé do editor |
| `portal.css` e `acesso.css` | Entrada pública e acesso à conta |
| `configuracoes.css` e `criador.css` | Configurações e criação de abas |

As páginas carregam fontes, tokens e `base.css` antes dos componentes. A entrada
pública usa essa base leve, sem carregar os componentes internos de `theme.css`.
O acesso à conta conserva `theme.css` para a janela do código de recuperação e
os avisos de seus fluxos. Novos componentes
consomem esses tokens; não devem criar outra paleta ou redefinir o mesmo componente
em arquivos de página. Medidas específicas de um recurso ficam no proprietário
desse recurso, com nomes que expliquem seu propósito. Remover regras antigas que
conflitem com a decisão atual, em vez de empilhar correções de especificidade.

## Cor e tipografia

O tema claro é o padrão para uma instalação sem preferência. A escolha salva e a
opção automática continuam sendo respeitadas. Cor comunica ação, seleção, erro ou
dados; conclusão também precisa de check ou texto.

| Papel | Claro | Escuro |
| --- | --- | --- |
| Fundo e superfície principal | `#F5F7F9` | `#17212B` |
| Texto principal | `#17212B` | `#F5F7F9` |
| Texto secundário | `#526170` | `#A5B4C2` |
| Limite de controle | `#7F8D9B` | `#7B8E9E` |
| Acento e foco | `#22589C` | `#9CC4F5` |
| Atenção e erro | `#9C3446` | `#F1ADB7` |

`--linha` separa conteúdo discretamente; `--linha-forte` identifica controles.
`--superficie-2` e `--superficie-3` são misturas da base com o acento, sem uma
segunda paleta. Cores de áreas e séries de gráficos mantêm função informativa.

Source Sans 3 é a família da interface, inclusive títulos. A escala central é
13, 16, 20, 25, 31, 39 e 49 px. Texto e controles partem de 16 px; contexto breve
pode usar 13 px; páginas usam 31 px. Pesos 400, 600 e 700 estabelecem hierarquia.
O controle de tamanho aplica `--escala-fonte` ao texto, sem ampliar o layout com
`zoom`. A preferência de títulos usa Destaque ou Discreto; chaves antigas de
preferência permanecem compatíveis.

Texto de leitura usa `--reading-width: 68ch`, entrelinha de 1,5–1,6 e quebra que
respeite o sentido. Valores, horários e séries comparáveis usam números tabulares.
Um título não isola uma palavra em outra cor ou família para parecer especial.

## Composição e componentes

- Conteúdo até `--content-width: 1200px`; margens de 32 px no computador e
  16 px no celular, conforme o espaço disponível.
- Espaçamento em passos de 4 px: tokens de 4 até 96 px. Assuntos diferentes
  recebem mais espaço que título, contexto e ação do mesmo assunto.
- Raios de 4 px para detalhes, 8 px para controles, 12–16 px para objetos e
  janelas maiores. Uma seção não precisa de caixa para existir.
- Listas e seções não têm elevação. A sombra `--shadow-pop` pertence a camadas
  sobrepostas; não deve ser repetida sob cada bloco de conteúdo.
- Cabeçalho identifica a página. Ação global fica nele; ação de uma tarefa fica
  junto da respectiva seção. Rótulos dizem o resultado: Criar resumo, Salvar
  alterações, Adicionar refeição.
- Listas priorizam alinhamento e espaço. Cards representam objetos que abrem
  contexto próprio, como disciplinas e projetos. Evitar caixas dentro de caixas.
- Uma seção por vez conserva o contexto. Abas usam `tablist`, `tab` e `tabpanel`,
  IDs únicos, seleção anunciada e navegação por setas, Home e End.
- Estado vazio explica a próxima ação e oferece um convite claro. Busca sem
  resultados conserva seus controles e permite limpar filtros. Erro informa o
  que falhou e como tentar de novo, sem simular sucesso.

A Visão geral conserva Meu dia, Minhas abas e Dinheiro. A próxima ação reduz a
repetição de informações; Planejar adiante leva a calendário, rotinas, projetos e
metas das áreas ativas. Semana e próximos 30 dias são consultas, sem substituir o
calendário completo ou os planos de longo prazo.

Cada aba própria mantém Registros, Visão geral e Ajustes e as vistas compatíveis
com seus campos. A apresentação depende do esquema, não apenas do nome da aba.
Abrir uma tela ou mudar sua aparência não migra dados nem inventa registros.
O plano alimentar conserva refeições, alimentos, calorias e checks separados por
data. A rotina semanal de outras áreas continua independente desse histórico.

## Navegação e movimento

No computador, a barra tem 236 px aberta e 76 px recolhida. Marca e perfil ficam
fixos; apenas a lista de abas rola. Recolhida, mostra D, ícones e foto ou iniciais
do perfil, com nomes acessíveis. Não há seta ocupando o estado compacto.

A aproximação do mouse ou o foco por teclado expande a barra. A seta a recolhe;
depois disso o mouse precisa sair antes de uma nova aproximação. A expansão por
aproximação não altera a preferência salva. A transição acompanha largura,
identificação e conteúdo sem saltar a posição vertical dos ícones. No celular,
a navegação inferior e os caminhos por toque continuam disponíveis.

Tokens de movimento: 160 ms para resposta breve, 280 ms para troca e 460 ms para
movimentos maiores, com `--ease-saida`. Movimento responde à ação e esclarece o
que mudou. Teclado, gravação e foco não dependem de uma animação. Respeitar
`prefers-reduced-motion`, preferência de movimento e modo leve.

## Editor e exceções explícitas

O editor prioriza o documento: cabeçalho compacto, uma faixa de ferramentas com
rolagem própria e título centralizado. O modo foco mantém Ferramentas e Sair do
foco acessíveis por toque e teclado. O rodapé fica fixo, reserva seu espaço e
respeita a área segura: mínimo de 44 px no computador e 46 px no celular, com a
marca e a frase exata **Seu editor sem distrações**.

Impressão e exportação usam papel branco, título principal maior e centralizado,
apenas o resumo, sem data de exportação, URL, título extra ou rodapé da interface.
Formatação, tabelas, imagens e fontes escolhidas para o documento permanecem
disponíveis. As fontes do conteúdo e dos símbolos são exceções à família única
da interface; o tema não deve sobrescrever uma escolha do autor.

O editor pode ser adicionado a qualquer aba. É recomendado por padrão em estudo
e trabalho; ocultar a seção preserva os textos. O retorno do editor conserva o
contexto de origem e o salvamento automático continua visível.

A abertura cinematográfica da raiz, com notebook e D metálico, foi integrada
separadamente e é uma exceção deliberada à contenção de efeitos no aplicativo.
Seu movimento guiado pela rolagem, assets e geometria devem ser preservados.
Isso não autoriza novos brilhos, gradientes ou animações decorativas no painel.
Também são preservados o desenho vetorial da marca e as cores de dados escolhidas
pelo usuário.

## Acessibilidade e qualidade

- Controles acionáveis com área mínima de 44 × 44 px; campos legíveis em telefone.
- Foco visível, nomes acessíveis e alternativas a ações reveladas por hover.
- Contraste AA para texto e estados, sem informação transmitida somente por cor.
- Janelas contêm o foco, fecham com Escape e devolvem o foco à origem.
- Painéis ocultos usam `hidden`; controles invisíveis não recebem foco.
- Verificar 360 a 1440 px e além, teclado, toque, áreas seguras e texto ampliado.
  Faixas de ferramentas e tabelas podem rolar localmente; o documento não vaza.
- Fonte local com `font-display: swap`; carregamento sob demanda para recursos
  pesados. Não remover efeitos ou funcionalidades preservados para obter uma nota.

Antes de entregar, testar persistência e backup, criação de abas, formulários,
checks diários, planejamento futuro e exportação. Capturar desktop e celular nos
dois temas; revisar a hierarquia, alinhamentos e interferências de CSS antigo.
Medir desempenho e acessibilidade, informando os resultados reais.

## O que evitar

Não reintroduzir bege com serifa de alto contraste, preto com acento ácido,
gradientes decorativos, vidro, blobs, luz que segue o mouse ou sombras em tudo.
Evitar famílias adicionais na interface, etiquetas em caixa alta espaçada,
índices 01/02 sem sequência real, metadados decorativos com bolinhas, palavras
isoladas em cor especial e setas sem função no fim de botões.

Não transformar todos os assuntos em cards iguais, acrescentar ícones só para
preencher espaço ou animar cada seção ao rolar. A identidade vem do D, da
tipografia, do ritmo e da relação entre os planos da pessoa.
