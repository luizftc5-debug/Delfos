/* ===========================================================================
   Anexos — o conteúdo dos arquivos (PDF, slides, imagens dos resumos).

   No navegador eles moram no IndexedDB (arquivos.js do painel); aqui, no D1,
   cortados em partes de 1 MB, que é o que cabe numa linha. O id é o mesmo
   dos dois lados, então a ficha do anexo dentro do estado aponta para o
   arquivo certo em qualquer aparelho.

   Não existe rota para apagar: um anexo tirado do painel pode continuar
   citado numa versão anterior, e restaurar essa versão tem de trazer o
   arquivo junto. Quem apaga é a limpeza agendada (limpeza.js), só o que
   nenhuma versão cita mais.
   =========================================================================== */

import { ErroHttp, agora, json } from "./respostas.js";

export const LIMITE_BYTES = 25 * 1024 * 1024; // igual a Arquivos.LIMITE_MB no painel
const TAMANHO_PARTE = 1_000_000;
const ID_VALIDO = /^arq-[a-z0-9]+-[a-z0-9]+$/;

function validarId(id) {
  if (!ID_VALIDO.test(id)) throw new ErroHttp(400, "Id de anexo inválido.");
}

/** GET /api/arquivos → [{ id, tipo, tamanho, criadoEm }] */
export async function listarArquivos(request, env) {
  const { results } = await env.DB
    .prepare("SELECT id, tipo, tamanho, criado_em FROM arquivos ORDER BY criado_em")
    .all();
  return json({
    arquivos: results.map((a) => ({ id: a.id, tipo: a.tipo, tamanho: a.tamanho, criadoEm: a.criado_em })),
  });
}

/** PUT /api/arquivos/:id — corpo é o arquivo cru; Content-Type é o tipo dele. */
export async function enviarArquivo(request, env, id) {
  validarId(id);
  if (Number(request.headers.get("content-length") || 0) > LIMITE_BYTES) {
    throw new ErroHttp(413, "Arquivo acima de 25 MB.");
  }
  const dados = await request.arrayBuffer();
  if (dados.byteLength > LIMITE_BYTES) throw new ErroHttp(413, "Arquivo acima de 25 MB.");

  const tipo = String(request.headers.get("content-type") || "").slice(0, 120);
  const db = env.DB;
  const partes = Math.max(1, Math.ceil(dados.byteLength / TAMANHO_PARTE));
  const comandos = [
    db.prepare("DELETE FROM arquivo_partes WHERE arquivo_id = ?").bind(id),
    db.prepare("DELETE FROM arquivos WHERE id = ?").bind(id),
  ];
  for (let i = 0; i < partes; i++) {
    comandos.push(
      db.prepare("INSERT INTO arquivo_partes (arquivo_id, indice, dados) VALUES (?, ?, ?)")
        .bind(id, i, dados.slice(i * TAMANHO_PARTE, (i + 1) * TAMANHO_PARTE))
    );
  }
  comandos.push(
    db.prepare("INSERT INTO arquivos (id, tipo, tamanho, partes, criado_em) VALUES (?, ?, ?, ?, ?)")
      .bind(id, tipo, dados.byteLength, partes, agora())
  );
  await db.batch(comandos);
  return json({ id, tamanho: dados.byteLength }, 201);
}

/** GET /api/arquivos/:id — devolve o arquivo, parte por parte (sem juntar tudo na memória). */
export async function baixarArquivo(request, env, id) {
  validarId(id);
  const db = env.DB;
  const meta = await db.prepare("SELECT tipo, tamanho, partes FROM arquivos WHERE id = ?").bind(id).first();
  if (!meta) throw new ErroHttp(404, "Este anexo não está na nuvem.");

  let proxima = 0;
  const corpo = new ReadableStream({
    async pull(controle) {
      if (proxima >= meta.partes) return controle.close();
      const r = await db
        .prepare("SELECT dados FROM arquivo_partes WHERE arquivo_id = ? AND indice = ?")
        .bind(id, proxima++)
        .first();
      if (!r) return controle.error(new Error(`Parte ${proxima - 1} do anexo ${id} sumiu.`));
      // O D1 pode devolver BLOB como ArrayBuffer ou como lista de números.
      controle.enqueue(new Uint8Array(r.dados));
    },
  });

  return new Response(corpo, {
    headers: {
      "content-type": meta.tipo || "application/octet-stream",
      "content-length": String(meta.tamanho),
      "cache-control": "no-store",
    },
  });
}
