/* ===========================================================================
   Catálogo de exercícios — usado pela aba Academia.

   Só o cadastro (nome + grupo muscular). O Delfos não prescreve treino:
   carga, séries e repetições são o que o usuário anota sobre o que ele
   mesmo decidiu fazer. Cada exercício é comum o bastante para existir na
   maioria das academias — nada de variação exótica.
   =========================================================================== */

const EXERCICIOS = [
  // Peito
  { id: "supino-reto-barra", nome: "Supino reto (barra)", grupo: "Peito" },
  { id: "supino-reto-halteres", nome: "Supino reto (halteres)", grupo: "Peito" },
  { id: "supino-inclinado-barra", nome: "Supino inclinado (barra)", grupo: "Peito" },
  { id: "supino-inclinado-halteres", nome: "Supino inclinado (halteres)", grupo: "Peito" },
  { id: "supino-declinado", nome: "Supino declinado", grupo: "Peito" },
  { id: "crucifixo-halteres", nome: "Crucifixo (halteres)", grupo: "Peito" },
  { id: "crucifixo-cross", nome: "Crucifixo (cross-over)", grupo: "Peito" },
  { id: "peck-deck", nome: "Peck deck (voador)", grupo: "Peito" },
  { id: "flexao-braco", nome: "Flexão de braço", grupo: "Peito" },
  { id: "pullover", nome: "Pullover", grupo: "Peito" },

  // Costas
  { id: "puxada-frente", nome: "Puxada pela frente (pulley)", grupo: "Costas" },
  { id: "puxada-atras", nome: "Puxada por trás", grupo: "Costas" },
  { id: "remada-curvada-barra", nome: "Remada curvada (barra)", grupo: "Costas" },
  { id: "remada-curvada-halteres", nome: "Remada curvada (halteres)", grupo: "Costas" },
  { id: "remada-cavalinho", nome: "Remada cavalinho (T-bar)", grupo: "Costas" },
  { id: "remada-baixa", nome: "Remada baixa (cabo)", grupo: "Costas" },
  { id: "remada-serrote", nome: "Remada unilateral (serrote)", grupo: "Costas" },
  { id: "barra-fixa", nome: "Barra fixa (pull-up)", grupo: "Costas" },
  { id: "barra-fixa-pronada", nome: "Barra fixa pronada (chin-up invertida)", grupo: "Costas" },
  { id: "levantamento-terra", nome: "Levantamento terra (deadlift)", grupo: "Costas" },
  { id: "hiperextensao-lombar", nome: "Hiperextensão lombar", grupo: "Costas" },

  // Ombro
  { id: "desenvolvimento-barra", nome: "Desenvolvimento militar (barra)", grupo: "Ombro" },
  { id: "desenvolvimento-halteres", nome: "Desenvolvimento com halteres", grupo: "Ombro" },
  { id: "desenvolvimento-arnold", nome: "Desenvolvimento Arnold", grupo: "Ombro" },
  { id: "elevacao-lateral", nome: "Elevação lateral", grupo: "Ombro" },
  { id: "elevacao-frontal", nome: "Elevação frontal", grupo: "Ombro" },
  { id: "elevacao-posterior", nome: "Elevação posterior (crucifixo invertido)", grupo: "Ombro" },
  { id: "remada-alta", nome: "Remada alta", grupo: "Ombro" },
  { id: "encolhimento-ombros", nome: "Encolhimento de ombros (trapézio)", grupo: "Ombro" },

  // Bíceps
  { id: "rosca-direta-barra", nome: "Rosca direta (barra)", grupo: "Bíceps" },
  { id: "rosca-direta-halteres", nome: "Rosca direta (halteres)", grupo: "Bíceps" },
  { id: "rosca-alternada", nome: "Rosca alternada", grupo: "Bíceps" },
  { id: "rosca-martelo", nome: "Rosca martelo", grupo: "Bíceps" },
  { id: "rosca-scott", nome: "Rosca scott", grupo: "Bíceps" },
  { id: "rosca-concentrada", nome: "Rosca concentrada", grupo: "Bíceps" },
  { id: "rosca-cabo", nome: "Rosca no cabo", grupo: "Bíceps" },

  // Tríceps
  { id: "triceps-corda", nome: "Tríceps pulley (corda)", grupo: "Tríceps" },
  { id: "triceps-barra", nome: "Tríceps pulley (barra)", grupo: "Tríceps" },
  { id: "triceps-testa", nome: "Tríceps testa", grupo: "Tríceps" },
  { id: "triceps-frances", nome: "Tríceps francês", grupo: "Tríceps" },
  { id: "mergulho-banco", nome: "Mergulho no banco (bench dip)", grupo: "Tríceps" },
  { id: "paralelas", nome: "Paralelas (dips)", grupo: "Tríceps" },
  { id: "triceps-coice", nome: "Coice de tríceps (kickback)", grupo: "Tríceps" },

  // Quadríceps
  { id: "agachamento-livre", nome: "Agachamento livre", grupo: "Quadríceps" },
  { id: "agachamento-smith", nome: "Agachamento no smith", grupo: "Quadríceps" },
  { id: "leg-press", nome: "Leg press", grupo: "Quadríceps" },
  { id: "cadeira-extensora", nome: "Cadeira extensora", grupo: "Quadríceps" },
  { id: "agachamento-bulgaro", nome: "Agachamento búlgaro", grupo: "Quadríceps" },
  { id: "avanco", nome: "Avanço (afundo / lunge)", grupo: "Quadríceps" },
  { id: "hack-squat", nome: "Hack squat", grupo: "Quadríceps" },

  // Posterior de coxa
  { id: "mesa-flexora", nome: "Mesa flexora", grupo: "Posterior de coxa" },
  { id: "stiff", nome: "Stiff (levantamento terra romeno)", grupo: "Posterior de coxa" },
  { id: "cadeira-flexora", nome: "Cadeira flexora", grupo: "Posterior de coxa" },
  { id: "bom-dia", nome: "Bom dia (good morning)", grupo: "Posterior de coxa" },

  // Glúteo
  { id: "elevacao-pelvica", nome: "Elevação pélvica (hip thrust)", grupo: "Glúteo" },
  { id: "cadeira-abdutora", nome: "Cadeira abdutora", grupo: "Glúteo" },
  { id: "gluteo-cabo", nome: "Glúteo no cabo (coice)", grupo: "Glúteo" },
  { id: "agachamento-sumo", nome: "Agachamento sumô", grupo: "Glúteo" },

  // Panturrilha
  { id: "panturrilha-em-pe", nome: "Panturrilha em pé", grupo: "Panturrilha" },
  { id: "panturrilha-sentado", nome: "Panturrilha sentado", grupo: "Panturrilha" },
  { id: "panturrilha-leg-press", nome: "Panturrilha no leg press", grupo: "Panturrilha" },

  // Abdômen
  { id: "abdominal-reto", nome: "Abdominal reto (crunch)", grupo: "Abdômen" },
  { id: "abdominal-infra", nome: "Abdominal infra (elevação de pernas)", grupo: "Abdômen" },
  { id: "prancha", nome: "Prancha (plank)", grupo: "Abdômen" },
  { id: "abdominal-obliquo", nome: "Abdominal oblíquo", grupo: "Abdômen" },
  { id: "rotacao-tronco", nome: "Rotação de tronco (cabo)", grupo: "Abdômen" },

  // Corpo inteiro / cardio / funcional
  { id: "burpee", nome: "Burpee", grupo: "Corpo inteiro" },
  { id: "corrida-esteira", nome: "Corrida (esteira)", grupo: "Corpo inteiro" },
  { id: "bicicleta-ergometrica", nome: "Bicicleta ergométrica", grupo: "Corpo inteiro" },
  { id: "remo-ergometro", nome: "Remo (ergômetro)", grupo: "Corpo inteiro" },
  { id: "corda-naval", nome: "Corda naval (battle rope)", grupo: "Corpo inteiro" },
  { id: "kettlebell-swing", nome: "Kettlebell swing", grupo: "Corpo inteiro" },
  { id: "mountain-climber", nome: "Mountain climber", grupo: "Corpo inteiro" },
  { id: "pular-corda", nome: "Pular corda", grupo: "Corpo inteiro" },
];
