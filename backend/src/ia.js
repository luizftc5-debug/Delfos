/* ===========================================================================
   IA — o Claude sugerindo como montar uma aba nova do painel.

   POST /api/ia/aba  { nome, contexto?, existentes? }  →  { sugestao }

   O painel manda só o nome que a pessoa digitou, uma linha de contexto
   (ocupação e cidade, do perfil) e, ao editar uma aba, o nome dos campos que
   ela já tem. Nada do que está cadastrado sai daqui.

   - A chave (ANTHROPIC_API_KEY) é um segredo do Worker: nunca vai para o
     navegador. Sem ela, a rota responde 503 e o painel segue com a sugestão
     local (abas.js), que não depende de rede.
   - Só com sessão, e no máximo LIMITE_HORA pedidos por conta por hora — o
     custo da API é de quem publicou o servidor.
   - A resposta vem em JSON validado por esquema (structured outputs). O
     painel ainda corta tudo para os ícones, cores e tipos que existem: o que
     vem de um modelo é dado, não instrução.
   =========================================================================== */

import Anthropic from "@anthropic-ai/sdk";
import { ErroHttp, json, textoCurto } from "./respostas.js";

const MODELO = "claude-opus-5";
const LIMITE_HORA = 40;
const HORA = 60 * 60 * 1000;

// Os mesmos de dashboard/ui.js (ICONES_ABA, com "svg:") e store.js (ICONES_PILAR, PALETA_PILAR).
const ICONES = [
  ...["haltere", "livro", "estetoscopio", "pilula", "coracao", "cruz", "folha", "pata", "carro", "aviao",
    "prato", "gota", "cafe", "estrela", "bandeira", "casa", "carrinho", "pincel", "musica", "controle", "bola", "tenis",
    "grupo", "maleta", "presente", "globo", "microscopio", "lapis", "calendario", "alvo", "cofre", "lampada", "relogio", "sol", "lua", "camera"].map((n) => `svg:${n}`),
];
const CORES = {
  "#d6398a": "rosa", "#0d95b5": "ciano", "#b57d0a": "âmbar", "#5a4fd4": "índigo", "#6e8f22": "oliva",
  "#5b6b7d": "ardósia", "#8e5bd0": "violeta", "#178f6c": "esmeralda", "#1f7a8c": "petróleo",
};

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  required: ["icone", "cor", "descricao", "rotuloItem", "naAgenda", "checkin", "especial", "campos", "agruparPor", "meta", "exemplos"],
  properties: {
    icone: { type: "string", enum: ICONES },
    cor: { type: "string", enum: Object.keys(CORES) },
    descricao: { type: "string" },
    rotuloItem: { type: "string" },
    naAgenda: { type: "boolean" },
    checkin: { type: "boolean" },
    especial: { type: "string", enum: ["", "academia"] },
    campos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "rotulo", "tipo", "opcoes", "naLista", "obrigatorio"],
        properties: {
          id: { type: "string" },
          rotulo: { type: "string" },
          tipo: { type: "string", enum: ["text", "textarea", "date", "number", "dinheiro", "select", "simNao"] },
          opcoes: { type: "array", items: { type: "string" } },
          naLista: { type: "boolean" },
          obrigatorio: { type: "boolean" },
        },
      },
    },
    agruparPor: { type: "string" },
    meta: {
      type: "object",
      additionalProperties: false,
      required: ["tipo", "campoId", "alvo", "periodo"],
      properties: {
        tipo: { type: "string", enum: ["nenhuma", "concluidos", "soma", "checkins"] },
        campoId: { type: "string" },
        alvo: { type: "number" },
        periodo: { type: "string", enum: ["semana", "mes", "ano"] },
      },
    },
    exemplos: { type: "array", items: { type: "string" } },
  },
};

const SISTEMA = `Você configura abas do Delfos, um painel pessoal de organização em português do Brasil. A pessoa digitou o nome de uma aba nova; sua tarefa é decidir como essa aba funciona para aquele assunto específico, do jeito mais útil para ela.

Uma aba guarda uma lista de registros. Todo registro já tem, de fábrica, um nome (descricao) e uma data opcional; você define o resto:
- rotuloItem: o que é cada registro, no singular e em minúsculas ("livro", "plantão", "treino", "consulta").
- campos: de 2 a 7 campos próprios que valem a pena para ESSE assunto. Não repita nome nem data. Tipos: text, textarea, date, number, dinheiro (valor em R$), select (com 2 a 7 opcoes curtas, em minúsculas), simNao. Em number, ponha a unidade entre parênteses no rótulo ("Distância (km)", "Duração (min)"). id em camelCase sem acento. naLista=true nos 2 ou 3 campos que ajudam a reconhecer o registro na lista; obrigatorio=true só no que for essencial. opcoes vazio quando o tipo não for select.
- naAgenda: true se cada registro acontece numa data (consulta, plantão, prova, viagem); false para coisas que se acompanham sem data (livros, hábitos, coleção).
- checkin: true só para hábitos e práticas repetidas que se marcam por dia (oração, meditação, idioma, remédio diário). Com checkin, naAgenda é false.
- agruparPor: o id de um campo select que faz sentido para separar a lista (situação, tipo, prioridade), ou "" se nenhum.
- meta: uma meta que motive sem ser absurda. tipo "concluidos" (quantos registros concluir no período), "soma" (somar um campo number ou dinheiro — campoId é o id desse campo), "checkins" (quantas marcações no período, só se checkin) ou "nenhuma" (com alvo 0). periodo: semana, mes ou ano.
- icone: o que melhor representa o assunto, da lista permitida. cor: da paleta permitida (${Object.entries(CORES).map(([h, n]) => `${h} ${n}`).join(", ")}); não use cor que sugira alerta.
- descricao: uma frase curta, no tom de quem explica para a própria pessoa o que a aba acompanha. Sem ponto de exclamação.
- exemplos: 2 ou 3 nomes de registros concretos para começar, bem específicos do assunto (ou lista vazia se não fizer sentido).
- especial: "academia" apenas quando a aba for de treino de musculação/academia (o painel tem uma tela própria para isso); nos outros casos "".

Use o contexto da pessoa (ocupação, cidade) para acertar o vocabulário: um estudante de medicina que cria "Plantões" quer setor, preceptor e horas; alguém que cria "Artigos" quer periódico, ano e situação de leitura. Não dê conselho médico nem financeiro; só estruture o acompanhamento. Se o nome for vago, monte uma aba de tarefas simples com prioridade.`;

/** Cliente da API. Nos testes, env.CLIENTE_IA substitui o SDK por um falso. */
function clienteDe(env) {
  if (env.CLIENTE_IA) return env.CLIENTE_IA;
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

export function iaLigada(env) {
  return !!(env.ANTHROPIC_API_KEY || env.CLIENTE_IA);
}

async function conferirLimite(db, usuarioId) {
  const r = await db
    .prepare("SELECT COUNT(*) AS n FROM tentativas WHERE chave = ? AND em > ?")
    .bind(`ia:${usuarioId}`, Date.now() - HORA)
    .first();
  if ((r?.n || 0) >= LIMITE_HORA) throw new ErroHttp(429, "Muitos pedidos à IA nesta hora. A sugestão rápida do painel continua funcionando.");
  await db.prepare("INSERT INTO tentativas (chave, em) VALUES (?, ?)").bind(`ia:${usuarioId}`, Date.now()).run();
}

/** POST /api/ia/aba */
export async function sugerirAba(request, env, usuario) {
  if (!iaLigada(env)) throw new ErroHttp(503, "A IA não está configurada neste servidor.");

  let corpo;
  try { corpo = (await request.json()) || {}; } catch { throw new ErroHttp(400, "Corpo da requisição não é JSON."); }
  const nome = textoCurto(corpo.nome, 60);
  if (nome.length < 2) throw new ErroHttp(400, "Informe o nome da aba.");
  const contexto = textoCurto(corpo.contexto, 120);
  const existentes = (Array.isArray(corpo.existentes) ? corpo.existentes : []).map((x) => textoCurto(x, 40)).filter(Boolean).slice(0, 12);

  await conferirLimite(env.DB, usuario.id);

  // O pedido vai como dados (JSON), separado das instruções do sistema.
  const pedido = {
    nomeDaAba: nome,
    contextoDaPessoa: contexto || "não informado",
    camposQueJaExistem: existentes,
  };

  let resposta;
  try {
    resposta = await clienteDe(env).beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
      system: SISTEMA,
      messages: [{
        role: "user",
        content: `Configure a aba descrita neste JSON. ${existentes.length ? "A aba já existe: proponha campos que complementem os que já existem, sem repeti-los." : ""}\n\n${JSON.stringify(pedido)}`,
      }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new ErroHttp(503, "A IA está ocupada agora. Tente de novo em instantes.");
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      console.error("IA: chave recusada", e.status);
      throw new ErroHttp(503, "A chave da IA deste servidor foi recusada.");
    }
    if (e instanceof Anthropic.APIConnectionError) throw new ErroHttp(503, "Sem conexão com a IA agora.");
    if (e instanceof Anthropic.APIError) {
      console.error("IA: erro da API", e.status, e.message);
      throw new ErroHttp(502, "A IA não conseguiu responder agora.");
    }
    throw e;
  }

  if (resposta.stop_reason === "refusal") throw new ErroHttp(422, "A IA não quis sugerir nada para esse nome.");
  if (resposta.stop_reason === "max_tokens") throw new ErroHttp(502, "A resposta da IA veio incompleta.");

  const texto = (resposta.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  let sugestao;
  try { sugestao = JSON.parse(texto); } catch { throw new ErroHttp(502, "A IA respondeu num formato inesperado."); }
  if (!sugestao || typeof sugestao !== "object" || !Array.isArray(sugestao.campos)) throw new ErroHttp(502, "A IA respondeu num formato inesperado.");

  return json({ sugestao, modelo: resposta.model });
}
