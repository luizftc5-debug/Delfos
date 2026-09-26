/* ===========================================================================
   Limpeza agendada — roda uma vez por dia (ver `crons` em wrangler.toml).

   - Apaga anexos que nem o estado em vigor nem nenhuma versão guardada citam
     mais. Só os com mais de 2 dias: o painel envia o estado antes dos
     arquivos, e um anexo recém-chegado ainda pode estar a caminho de ser
     citado.
   - Mantém só as versões mais recentes.
   - Esquece senhas erradas com mais de um dia.
   =========================================================================== */

import { podarVersoes } from "./estado.js";

const CARENCIA_MS = 2 * 24 * 60 * 60 * 1000;

export async function limpar(env) {
  const db = env.DB;

  // Poda primeiro: uma versão que sai da lista deixa de proteger os anexos dela.
  await db.batch(podarVersoes(db));

  const citados = new Set();
  const { results: listas } = await db
    .prepare("SELECT anexos FROM estado_atual UNION ALL SELECT anexos FROM versoes")
    .all();
  for (const { anexos } of listas) {
    try { JSON.parse(anexos).forEach((id) => citados.add(id)); } catch { /* lista corrompida: ignora */ }
  }

  const limite = new Date(Date.now() - CARENCIA_MS).toISOString();
  const { results: antigos } = await db.prepare("SELECT id FROM arquivos WHERE criado_em < ?").bind(limite).all();
  const orfaos = antigos.map((a) => a.id).filter((id) => !citados.has(id));

  const comandos = [
    db.prepare("DELETE FROM tentativas_login WHERE em < ?").bind(Date.now() - 24 * 60 * 60 * 1000),
  ];
  for (const id of orfaos) {
    comandos.push(
      db.prepare("DELETE FROM arquivo_partes WHERE arquivo_id = ?").bind(id),
      db.prepare("DELETE FROM arquivos WHERE id = ?").bind(id)
    );
  }
  await db.batch(comandos);

  return { anexosRemovidos: orfaos.length };
}
