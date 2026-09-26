/* Texto grande (o JSON do estado) guardado em pedaços na tabela `textos`. */

// 400 mil caracteres ≤ 1,6 MB mesmo com acento (2 bytes) em tudo — abaixo
// do limite de ~2 MB por linha do D1.
export const TAMANHO_PEDACO = 400_000;

export function dividir(texto) {
  const partes = [];
  let i = 0;
  while (i < texto.length) {
    let fim = Math.min(i + TAMANHO_PEDACO, texto.length);
    // Não corta um emoji (par substituto) ao meio: cada metade viraria "�".
    if (fim < texto.length) {
      const c = texto.charCodeAt(fim - 1);
      if (c >= 0xd800 && c <= 0xdbff) fim--;
    }
    partes.push(texto.slice(i, fim));
    i = fim;
  }
  return partes.length ? partes : [""];
}

export async function lerTexto(db, chave) {
  const { results } = await db
    .prepare("SELECT conteudo FROM textos WHERE chave = ? ORDER BY indice")
    .bind(chave)
    .all();
  return results.map((r) => r.conteudo).join("");
}

/** Comandos (para um batch) que trocam o texto guardado sob `chave`. */
export function gravarTexto(db, chave, texto) {
  return [
    db.prepare("DELETE FROM textos WHERE chave = ?").bind(chave),
    ...dividir(texto).map((parte, indice) =>
      db.prepare("INSERT INTO textos (chave, indice, conteudo) VALUES (?, ?, ?)").bind(chave, indice, parte)
    ),
  ];
}

/**
 * Ids de anexo citados no estado. O formato vem de Arquivos.salvar no
 * navegador (`arq-<tempo>-<aleatório>`), e aparece tanto nas fichas de anexo
 * quanto nas imagens dentro dos resumos (`data-anexo-id`). É com esta lista
 * que a limpeza decide quais arquivos ainda estão em uso.
 */
export function idsDeAnexos(texto) {
  return [...new Set(texto.match(/arq-[a-z0-9]+-[a-z0-9]+/g) || [])];
}
