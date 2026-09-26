/* ===========================================================================
   Estado do painel — a sincronização entre aparelhos.

   O servidor guarda o mesmo JSON que o navegador tem no localStorage e um
   número de revisão. Cada gravação diz em qual revisão se baseou (`?base=`):
   se outro aparelho gravou nesse meio-tempo, a revisão não bate e a resposta
   é 409 — o painel então pergunta ao usuário qual versão fica, em vez de
   um aparelho apagar em silêncio o que o outro fez.

   O JSON nunca é interpretado aqui, só guardado e devolvido: o formato é
   responsabilidade de store.js (normalizar), e o servidor não precisa mudar
   quando o painel ganha um campo novo.
   =========================================================================== */

import { ErroHttp, agora, json, jsonBruto, textoCurto } from "./respostas.js";
import { gravarTexto, idsDeAnexos, lerTexto } from "./textos.js";

const MAX_CARACTERES = 10 * 1024 * 1024;
// Uma cópia automática a cada 10 minutos de uso basta para voltar atrás sem
// encher o banco com uma versão por tecla.
const INTERVALO_VERSAO_MS = 10 * 60 * 1000;
export const MAX_VERSOES = 60;

async function lerCorpoEstado(request) {
  if (Number(request.headers.get("content-length") || 0) > MAX_CARACTERES) {
    throw new ErroHttp(413, "O estado passou de 10 MB — grande demais para sincronizar.");
  }
  const texto = (await request.text()).trim();
  if (texto.length > MAX_CARACTERES) {
    throw new ErroHttp(413, "O estado passou de 10 MB — grande demais para sincronizar.");
  }
  // Checagem leve (sem JSON.parse, que custaria o tempo de CPU do plano
  // gratuito): basta para recusar algo que claramente não veio do painel.
  if (!texto.startsWith("{") || !texto.endsWith("}") || !texto.includes('"versao"')) {
    throw new ErroHttp(400, "Isso não parece um estado do Delfos.");
  }
  return texto;
}

/** Monta a resposta sem reinterpretar o estado: ele entra como veio. */
function envelope(meta, estadoTexto) {
  return (
    `{"revisao":${Number(meta.revisao) || 0}` +
    `,"atualizadoEm":${JSON.stringify(meta.atualizado_em || null)}` +
    `,"dispositivo":${JSON.stringify(meta.dispositivo || "")}` +
    `,"estado":${estadoTexto || "null"}}`
  );
}

async function metaAtual(db) {
  return db.prepare("SELECT revisao, atualizado_em, dispositivo FROM estado_atual WHERE id = 1").first();
}

function conflito(meta) {
  return json({
    erro: "Outro aparelho salvou antes. Baixe a versão da nuvem para decidir qual fica.",
    conflito: true,
    revisao: meta?.revisao || 0,
    atualizadoEm: meta?.atualizado_em || null,
    dispositivo: meta?.dispositivo || "",
  }, 409);
}

/** Copia o estado em vigor para `versoes` antes de ele ser sobrescrito. */
function copiarAtualParaVersoes(db, guardadoEm, motivo) {
  return [
    db.prepare(
      `INSERT INTO versoes (revisao, salvo_em, guardado_em, dispositivo, motivo, tamanho, anexos)
       SELECT revisao, atualizado_em, ?, dispositivo, ?, tamanho, anexos FROM estado_atual WHERE id = 1`
    ).bind(guardadoEm, motivo),
    db.prepare(
      `INSERT INTO textos (chave, indice, conteudo)
       SELECT 'v:' || (SELECT MAX(id) FROM versoes), indice, conteudo FROM textos WHERE chave = 'atual'`
    ),
  ];
}

/** Mantém só as MAX_VERSOES cópias mais recentes. */
export function podarVersoes(db) {
  const mantidas = `SELECT id FROM versoes ORDER BY id DESC LIMIT ${MAX_VERSOES}`;
  return [
    db.prepare(`DELETE FROM textos WHERE chave LIKE 'v:%' AND CAST(substr(chave, 3) AS INTEGER) NOT IN (${mantidas})`),
    db.prepare(`DELETE FROM versoes WHERE id NOT IN (${mantidas})`),
  ];
}

/**
 * GET /api/estado[?desde=N]
 * Com `desde` igual à revisão atual, responde só { inalterado: true } —
 * é o que o painel pergunta a cada página aberta, e sai quase de graça.
 */
export async function obterEstado(request, env) {
  const meta = await metaAtual(env.DB);
  if (!meta) return json({ revisao: 0, atualizadoEm: null, dispositivo: "", estado: null });

  const desde = new URL(request.url).searchParams.get("desde");
  if (desde !== null && Number(desde) === meta.revisao) {
    return json({ revisao: meta.revisao, atualizadoEm: meta.atualizado_em, dispositivo: meta.dispositivo, inalterado: true });
  }
  return jsonBruto(envelope(meta, await lerTexto(env.DB, "atual")));
}

/**
 * PUT /api/estado?base=N[&forcar=1][&motivo=...][&dispositivo=...]
 * Corpo: o JSON do estado. Responde { revisao, atualizadoEm } ou 409.
 * `forcar=1` grava mesmo com revisão diferente (o usuário escolheu ficar com
 * a versão deste aparelho) — e aí a versão substituída sempre vira cópia.
 */
export async function gravarEstado(request, env) {
  const db = env.DB;
  const url = new URL(request.url);
  const baseBruta = url.searchParams.get("base");
  const base = Number(baseBruta);
  if (!baseBruta || !Number.isInteger(base) || base < 0) throw new ErroHttp(400, "Falta a revisão de base (?base=).");
  const forcar = url.searchParams.get("forcar") === "1";
  const motivo = textoCurto(url.searchParams.get("motivo"));
  const dispositivo = textoCurto(url.searchParams.get("dispositivo"));

  const texto = await lerCorpoEstado(request);
  const quando = agora();
  const anexos = JSON.stringify(idsDeAnexos(texto));

  const meta = await metaAtual(db);
  const revisaoAtual = meta?.revisao || 0;
  if (!forcar && base !== revisaoAtual) return conflito(meta);

  const comandos = [];
  if (meta) {
    const ultima = await db.prepare("SELECT guardado_em FROM versoes ORDER BY id DESC LIMIT 1").first();
    const guardar = forcar || motivo || !ultima || Date.now() - Date.parse(ultima.guardado_em) >= INTERVALO_VERSAO_MS;
    if (guardar) comandos.push(...copiarAtualParaVersoes(db, quando, motivo || (forcar ? "Substituída por outro aparelho" : "")));

    // Trava contra duas gravações simultâneas: se a revisão mudou depois da
    // leitura acima, o CASE vira NULL, a coluna NOT NULL recusa e o batch
    // inteiro é desfeito.
    comandos.push(
      db.prepare(
        `UPDATE estado_atual
            SET revisao = CASE WHEN revisao = ?1 THEN revisao + 1 END,
                atualizado_em = ?2, dispositivo = ?3, tamanho = ?4, anexos = ?5
          WHERE id = 1`
      ).bind(revisaoAtual, quando, dispositivo, texto.length, anexos)
    );
  } else {
    comandos.push(
      db.prepare(
        "INSERT INTO estado_atual (id, revisao, atualizado_em, dispositivo, tamanho, anexos) VALUES (1, 1, ?, ?, ?, ?)"
      ).bind(quando, dispositivo, texto.length, anexos)
    );
  }
  comandos.push(...gravarTexto(db, "atual", texto), ...podarVersoes(db));

  try {
    await db.batch(comandos);
  } catch (e) {
    if (/constraint/i.test(String(e?.message || e))) return conflito(await metaAtual(db));
    throw e;
  }
  return json({ revisao: revisaoAtual + 1, atualizadoEm: quando });
}

/* ------------------------------- Versões ---------------------------------- */

/** GET /api/versoes → lista, da mais recente para a mais antiga (sem o conteúdo). */
export async function listarVersoes(request, env) {
  const { results } = await env.DB
    .prepare("SELECT id, revisao, salvo_em, guardado_em, dispositivo, motivo, tamanho FROM versoes ORDER BY id DESC")
    .all();
  return json({
    versoes: results.map((v) => ({
      id: v.id, revisao: v.revisao, salvoEm: v.salvo_em, guardadoEm: v.guardado_em,
      dispositivo: v.dispositivo, motivo: v.motivo, tamanho: v.tamanho,
    })),
  });
}

/** GET /api/versoes/:id → mesmo formato de GET /api/estado. */
export async function obterVersao(env, id) {
  const v = await env.DB
    .prepare("SELECT revisao, salvo_em, dispositivo FROM versoes WHERE id = ?")
    .bind(id)
    .first();
  if (!v) throw new ErroHttp(404, "Versão não encontrada — pode ter saído da lista das 60 mais recentes.");
  const texto = await lerTexto(env.DB, `v:${id}`);
  return jsonBruto(envelope({ revisao: v.revisao, atualizado_em: v.salvo_em, dispositivo: v.dispositivo }, texto));
}

/**
 * POST /api/versoes?motivo=...&dispositivo=...
 * Guarda uma cópia sem mexer no estado em vigor — usado quando o usuário
 * fica com a versão da nuvem num conflito: a deste aparelho vem para cá
 * antes de ser descartada, e dá para recuperar depois.
 */
export async function guardarCopia(request, env) {
  const db = env.DB;
  const url = new URL(request.url);
  const texto = await lerCorpoEstado(request);
  const quando = agora();
  const meta = await metaAtual(db);

  await db.batch([
    db.prepare(
      `INSERT INTO versoes (revisao, salvo_em, guardado_em, dispositivo, motivo, tamanho, anexos)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      meta?.revisao || 0, quando, quando,
      textoCurto(url.searchParams.get("dispositivo")),
      textoCurto(url.searchParams.get("motivo")) || "Cópia guardada",
      texto.length, JSON.stringify(idsDeAnexos(texto))
    ),
    ...gravarTexto(db, "__nova__", texto),
    db.prepare("UPDATE textos SET chave = 'v:' || (SELECT MAX(id) FROM versoes) WHERE chave = '__nova__'"),
    ...podarVersoes(db),
  ]);
  return json({ ok: true }, 201);
}
