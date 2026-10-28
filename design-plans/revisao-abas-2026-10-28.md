# Revisão das abas do Delfos

Written against: `088ea573522ba6f52f8da02785c640ec6bb79044` (`main`, inclui o PR #29).

Pedido: tornar as abas úteis para a tarefa de cada pessoa, manter sua identidade e otimizar sem retirar efeitos, animações ou recursos. A implementação foi solicitada diretamente pelo usuário; esta revisão usa o método de evidências do improve-ui e distingue decisões de produto dos achados de apresentação.

## Design language

- Audited surface: família de abas do dashboard, principalmente `pilar.html?id=…`, catálogo e criador; conferência das tarefas de Pessoal, Financeiro, Faculdade e Projetos.
- Design sources: `dashboard/DESIGN.md`; `AGENTS.md`; imagem fornecida pelo usuário; rotas e scripts efetivamente carregados por `pilar.html`.
- Documented decisions: Registros, Visão geral e Ajustes separados; indicadores na visão geral; campos opcionais; modelos editáveis; dados existentes preservados; esquema determina composição; neutros, tipografia, efeitos e preferências mantidos.
- Governing owners and consumers: `modelos-abas.js` → `abas.js` → Store → `pilar.js` → `UI.camposItemPilar`/`UI.formulario`; `delfos.js` fornece os modelos essenciais; `alimentacao.js` governa o diário próprio; `paginas.css`/`theme.css` governam apresentação.
- Explicit exceptions: None documented.

## Findings

| # | Problem | Evidence | Proposed change | Scope | Confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | “Ingredientes” comunica preparo quando a tarefa solicitada é registrar o que se comeu. | A imagem do formulário e o pedido vinculam a correção ao mesmo campo. No modelo `alimentacao`, o id `ingredientes` chega ao formulário por `pilar.campos` → `UI.camposItemPilar` → `UI.formulario`. | Exibir “Alimento”, mantendo o id para conservar valores antigos. | Modelo Alimentação e refeições, inclusive cadastros anteriores reconhecidos pelo esquema. | Alta |

## Improve first

Alimentação: o pedido e a imagem determinam a correção, e os dados antigos usam esse mesmo campo. Calorias, recorrência e histórico abaixo são melhorias funcionais autorizadas pelo pedido, não achados visuais derivados de preferência estética.

## Decisão funcional e implementação

- **Modelo da imagem:** Alimento, Calorias (kcal), Data e Alimentação de rotina. O painel de rotina tem data e check independente. O cadastro continua disponível nas visualizações anteriores. O id `ingredientes` é conservado. Abrir uma aba não grava uma migração.
- **Diário próprio:** data escolhida, atalhos Hoje/Ontem, refeição com alimento e kcal no mesmo cadastro, opção de rotina, edição e mudança de data de alimentos avulsos. Importar dieta, macros, metas e estimativas continuam disponíveis.
- **Histórico:** cada check conserva uma cópia dos alimentos/calorias daquela data. Editar, excluir ou substituir o plano preserva esses valores. Dados de versões anteriores sem cópia são congelados antes da primeira alteração do plano; não é possível reconstruir retrospectivamente edições que aconteceram antes desta versão.
- **Academia:** Treinei hoje por dia de treino; sessões e checks dos últimos sete dias em Evolução. Os exercícios, cargas, séries e recordes seguem com os mesmos controles.
- **Todos os registros genéricos:** filtro por período, dados de acompanhamento quando há informação suficiente e próximas datas de campos do próprio registro em Visão geral.
- **Abas já personalizadas:** novos campos dos modelos específicos são oferecidos em Ajustes, até o limite existente de oito. A ação acrescenta campos ausentes sem reescrever opções ou campos existentes. Nutrição recebe a apresentação explicitamente solicitada sem apagar campos personalizados.

## Checklist dos 32 modelos específicos

Todos foram examinados pelo catálogo, pelo formulário que recebem e pelo caminho de exibição. Os acréscimos são opcionais; não criam exemplos ou metas automaticamente.

| Modelo | Melhoria entregue e utilidade |
| --- | --- |
| Corrida | Esforço percebido; distância e ritmo ponderado nos registros com duração. |
| Jiu-jitsu | Foco do próximo treino, ligado aos aprendizados do treino atual. |
| Boxe e Muay Thai | Próximo foco a partir do feedback; tempo registrado. |
| Ciclismo | Como foi o pedal; velocidade média ponderada. |
| Natação | Próximo foco; ritmo por 100 metros. |
| Futebol | Posição e tempo registrado, junto do resultado da partida. |
| Estudos | Data de revisão e próximo passo; soma do tempo informado. |
| TCC | Retorno da orientação, junto das pendências por etapa. |
| Pesquisa científica | Decisão/resultado da atividade, junto do próximo passo e fonte. |
| Concursos e vestibulares | Erros para revisar; aproveitamento nas questões com dados completos. |
| Idiomas | O que praticar depois; tempo registrado por sessão. |
| Cursos e certificações | Próxima aula/módulo, mantendo plataforma e certificado juntos. |
| Saúde e cuidados | Perguntas para o profissional e data de retorno. |
| Alimentação e refeições | Alimento, calorias, data e rotina com check por data. |
| Sono e descanso | Despertares; intervalo entre horários, identificado como intervalo e não como sono efetivo. |
| Hábitos e rotina | Gatilho e versão mínima do hábito; histórico existente preservado. |
| Religião e espiritualidade | Intenção/próximo passo, junto da reflexão da prática. |
| Compromissos familiares | O que levar, junto do responsável e preparação. |
| Planejamento semanal | Dependência de pessoa/tarefa, junto da prioridade e duração. |
| Casa e manutenção | Data da próxima manutenção, junto das instruções e contato. |
| Cuidados com pets | Data do próximo cuidado, junto da orientação recebida. |
| Viagens | Contato da reserva, junto dos documentos e previsão de custo. |
| Engenharia | Impedimento atual visível junto da entrega. |
| Advocacia | Próxima providência; a interface pede conferir prazo na fonte oficial. |
| Táxi | Ocorrência/manutenção; resultado após custos informados e por hora. |
| Motorista de aplicativo | Outros custos; resultado após custos informados e por hora. |
| Medicina e plantões | Previsão de recebimento; valores explicitamente não recebidos. |
| Trabalho autônomo | Previsão de recebimento, junto do cliente e escopo. |
| Marketing digital | Próximo teste, junto de objetivos e resultados da campanha. |
| Vendas online | Entrega prevista, junto do rastreio e situação. |
| Criação de conteúdo | Chamada para ação, junto do roteiro e resultado. |
| Aulas particulares | Tarefa para a próxima aula; valores marcados como não pagos. |

## Pontos de partida essenciais

| Ponto de partida | Revisão e resultado |
| --- | --- |
| Trabalho | Tempo previsto e próximo passo opcionais; prioridade, contexto e quadro preservados. |
| Saúde | Preparo recebido e retorno opcionais; mantém profissional, especialidade e resultado. |
| Academia | Novo check diário e histórico semanal, sem prescrever exercícios. |
| Alimentação | Diário com data, rotina e preservação do histórico, além da importação existente. |
| Esporte | Próximo foco opcional; soma das durações informadas. |
| Religião | Intenção opcional; conserva marcação diária e reflexão. |
| Leituras | Página atual e data para retomar opcionais; valida página atual contra total. Não inventa progresso sem páginas lidas informadas. |
| Aba livre | Mantém criação livre; recebe filtros e apenas os acompanhamentos sustentados pelos seus campos. |

## Abas fixas e contextos associados

| Aba | Caminho conferido | Avaliação funcional |
| --- | --- | --- |
| Visão geral | `index.html` → `home.js`/`UI.compromissos` | Mantém agenda e avisos. Rotinas alimentares deixam de ser contadas como prazos vencidos; checks ficam na aba de alimentação. |
| Pessoal | `pessoal.html` → `pessoal.js`/`rotina.js`/`calendario.js` | Mês, rotina semanal, conflitos, importação e exportação já cobrem a organização diária. Preservados. |
| Faculdade | `faculdade.html`/`disciplina.html` → scripts correspondentes | Disciplinas, avaliações, materiais, plano de ensino e agenda já têm tarefas distintas. Preservados; sessões de Estudos ganham revisão opcional pelo modelo específico. |
| Financeiro | `financeiro.html`, contas, cartões e investimentos → scripts correspondentes | Mantém extrato, pendências, planejamento e análises. Os novos cálculos profissionais ficam na aba de origem e não criam lançamentos duplicados no financeiro. |
| Projetos | `projetos.html`/`projeto.html` → scripts correspondentes | Etapas, documentos, recebimentos e resultados já separados. Preservados; trabalho por profissão ganha os campos de acompanhamento descritos acima. |

Não foram classificados como defeitos a ausência de funções especulativas nem diferenças sem contrato de design. Também não foram adicionadas prescrições de saúde, integrações externas ou notificações fora do aplicativo.

## Otimização sem alterações de efeitos

- Busca do catálogo usa índice de texto normalizado uma vez, mantendo cópias independentes e a mesma busca por termos/categoria.
- Consulta por id usa Map. Agrupamento e associação das linhas da tabela evitam procurar novamente todos os registros para cada item.
- Resumo numérico calcula total/máximo em uma passagem e evita espalhar coleções grandes como argumentos de `Math.max`.
- Medição local: 2.000 buscas, sete rodadas, mediana. Implementação anterior equivalente: 518 ms; índice: 96 ms (81% menos tempo nesse trecho). Microbenchmark, não promessa de ganho equivalente no carregamento inteiro ou em qualquer aparelho.
- Nenhuma biblioteca foi adicionada ao site. CSS de animações, efeitos e preferência de movimento/desempenho não foram alterados.

## Validação

- `node --test dashboard/test/*.test.cjs`: testes de cálculos, catálogo, persistência, backup, importação e contratos.
- `node dashboard/test/experiencia.browser.cjs`: modelos essenciais, 32 modelos específicos, formulário com todos os campos, data, rotina, checks, edição, recarga, histórico e larguras 320/390/768/1440; temas claro/escuro.
- Sintaxe de todos os scripts/módulos e `git diff --check`.
- Workflow existente conserva suas regressões e ganha o teste de experiência. A inferência real da IA não foi alterada nem executada por estes testes.
- Não há garantia de execução em literalmente todas as máquinas; permanecem os requisitos de navegador e os limites dos importadores existentes.

## Design documentation

Após aprovação: registrar em `dashboard/DESIGN.md` a marcação de refeições por data, o congelamento dos valores consumidos e os campos opcionais dos modelos. A documentação de design vigente não foi reescrita nesta revisão.

## Stop conditions

Não substituir registros existentes por templates novos; não converter automaticamente abas personalizadas para a tela própria de Alimentação; não remover efeitos para obter desempenho; não fazer merge ou publicar diretamente. Entrega em PR com destino explícito à main, conforme `AGENTS.md`.
