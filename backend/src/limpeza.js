/* ===========================================================================
   Limpeza agendada — roda uma vez por dia (ver `crons` em wrangler.toml).

   - Mantém só as 60 versões mais recentes de cada conta.
   - Apaga anexos que nem o estado em vigor nem nenhuma versão guardada da
     mesma conta citam mais. Só os com mais de 2 dias: o painel envia o
     estado antes dos arquivos, e um anexo recém-chegado ainda pode estar a
     caminho de ser citado.
   - Apaga sessões vencidas e tentativas de senha com mais de um dia.
   =========================================================================== */

import { MAX_VERSOES } from "./estado.js";

const CARENCIA_MS = 2 * 24 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

export async function limpar(env) {
  const db = env.DB;

  // Poda primeiro: uma versão que sai da lista deixa de proteger os anexos dela.
  await db.batch([
    db.prepare(
      `DELETE FROM versoes WHERE id IN (
         SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY usuario_id ORDER BY id DESC) AS n FROM versoes)
          WHERE n > ${MAX_VERSOES})`
    ),
    db.prepare("DELETE FROM textos WHERE chave LIKE 'v:%' AND CAST(substr(chave, 3) AS INTEGER) NOT IN (SELECT id FROM versoes)"),
    db.prepare("DELETE FROM sessoes WHERE expira_em < ?").bind(Date.now()),
    db.prepare("DELETE FROM tentativas WHERE em < ?").bind(Date.now() - DIA_MS),
  ]);

  // Anexos citados, por conta.
  const citados = new Map();
  const { results: listas } = await db
    .prepare("SELECT usuario_id, anexos FROM estado_atual UNION ALL SELECT usuario_id, anexos FROM versoes")
    .all();
  for (const { usuario_id: uid, anexos } of listas) {
    if (!citados.has(uid)) citados.set(uid, new Set());
    try { JSON.parse(anexos).forEach((id) => citados.get(uid).add(id)); } catch { /* lista corrompida: ignora */ }
  }

  const limite = new Date(Date.now() - CARENCIA_MS).toISOString();
  const { results: antigos } = await db
    .prepare("SELECT usuario_id, id FROM arquivos WHERE criado_em < ?")
    .bind(limite)
    .all();
  const orfaos = antigos.filter((a) => !citados.get(a.usuario_id)?.has(a.id));

  const comandos = [];
  for (const { usuario_id: uid, id } of orfaos) {
    comandos.push(
      db.prepare("DELETE FROM arquivo_partes WHERE usuario_id = ? AND arquivo_id = ?").bind(uid, id),
      db.prepare("DELETE FROM arquivos WHERE usuario_id = ? AND id = ?").bind(uid, id)
    );
  }
  if (comandos.length) await db.batch(comandos);

  return { anexosRemovidos: orfaos.length };
}
