/* Respostas HTTP e erros com a mensagem que o painel mostra ao usuário. */

export class ErroHttp extends Error {
  constructor(status, mensagem, extra = {}) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
  }
}

const JSON_UTF8 = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" };

/** Limita a leitura mesmo quando o cliente não informa Content-Length. */
export async function lerCorpoLimitado(request, limite, mensagem) {
  if (Number(request.headers.get("content-length") || 0) > limite) throw new ErroHttp(413, mensagem);
  if (!request.body) return new Uint8Array();
  const leitor = request.body.getReader();
  const partes = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;
      if (total > limite) {
        await leitor.cancel();
        throw new ErroHttp(413, mensagem);
      }
      partes.push(value);
    }
  } finally { leitor.releaseLock(); }
  const dados = new Uint8Array(total);
  let posicao = 0;
  for (const parte of partes) { dados.set(parte, posicao); posicao += parte.byteLength; }
  return dados;
}

export function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: JSON_UTF8 });
}

/** Resposta cujo corpo já é JSON pronto — o estado vai sem ser interpretado. */
export function jsonBruto(texto, status = 200) {
  return new Response(texto, { status, headers: JSON_UTF8 });
}

export function agora() {
  return new Date().toISOString();
}

/** Texto curto vindo da URL (nome do aparelho, motivo), sem quebra de linha. */
export function textoCurto(valor, max = 80) {
  return String(valor || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}
