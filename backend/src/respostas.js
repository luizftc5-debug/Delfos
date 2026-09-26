/* Respostas HTTP e erros com a mensagem que o painel mostra ao usuário. */

export class ErroHttp extends Error {
  constructor(status, mensagem, extra = {}) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
  }
}

const JSON_UTF8 = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

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
