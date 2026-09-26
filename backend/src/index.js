/* ===========================================================================
   Delfos — back end (Cloudflare Worker + banco D1).

   O painel continua sendo um site estático no GitHub Pages e continua
   funcionando sem este servidor. O que ele acrescenta:

   - Sincronização: o mesmo estado em todos os aparelhos (celular, notebook).
   - Anexos na nuvem: PDFs e imagens dos resumos deixam de existir só num
     navegador.
   - Versões anteriores: cópias automáticas do estado para desfazer uma
     sobrescrita ou um conflito.
   - Senha: só quem tem a senha lê ou grava.

   Rotas (todas sob /api; só /api/saude e /api/entrar dispensam token):

     GET  /api/saude                  o servidor está no ar? tem senha?
     POST /api/entrar                 { senha } → { token, expiraEm }
     GET  /api/sessao                 o token ainda vale?
     GET  /api/estado[?desde=N]       estado em vigor
     PUT  /api/estado?base=N          grava (409 se outro aparelho gravou antes)
     GET  /api/versoes                cópias antigas (sem o conteúdo)
     GET  /api/versoes/:id            uma cópia antiga, completa
     POST /api/versoes                guarda uma cópia sem mexer no estado
     GET  /api/arquivos               anexos guardados
     PUT  /api/arquivos/:id           envia um anexo
     GET  /api/arquivos/:id           baixa um anexo
   =========================================================================== */

import { entrar, exigirSessao, senhaConfigurada } from "./auth.js";
import { baixarArquivo, enviarArquivo, listarArquivos } from "./arquivos.js";
import { gravarEstado, guardarCopia, listarVersoes, obterEstado, obterVersao } from "./estado.js";
import { limpar } from "./limpeza.js";
import { ErroHttp, json } from "./respostas.js";

// Só `default` pode ser exportado: o Worker trata toda exportação nomeada como handler.
const VERSAO_API = "1";

/* ---------------------------------- CORS ---------------------------------- */

// O painel roda em outro endereço (GitHub Pages, ou localhost), então o
// navegador só deixa ele falar com a API se ela disser que aquela origem
// pode. A lista vem de ORIGENS em wrangler.toml.
function origensPermitidas(env) {
  return String(env.ORIGENS || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function cabecalhosCors(request, env) {
  const origem = request.headers.get("Origin");
  if (!origem || !origensPermitidas(env).includes(origem)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origem,
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/* --------------------------------- Rotas ---------------------------------- */

async function rotear(request, env) {
  const { pathname } = new URL(request.url);
  const metodo = request.method;
  const caminho = pathname.replace(/\/+$/, "") || "/";

  if (caminho === "/" && metodo === "GET") {
    return json({ servico: "Delfos API", versao: VERSAO_API, documentacao: "backend/README.md no repositório" });
  }
  if (caminho === "/api/saude" && metodo === "GET") {
    return json({ ok: true, versao: VERSAO_API, senhaConfigurada: senhaConfigurada(env) });
  }
  if (caminho === "/api/entrar" && metodo === "POST") return entrar(request, env);

  // Daqui para baixo, só com token.
  if (!caminho.startsWith("/api/")) throw new ErroHttp(404, "Rota não encontrada.");
  await exigirSessao(request, env);

  if (caminho === "/api/sessao" && metodo === "GET") return json({ ok: true });

  if (caminho === "/api/estado") {
    if (metodo === "GET") return obterEstado(request, env);
    if (metodo === "PUT") return gravarEstado(request, env);
  }

  if (caminho === "/api/versoes") {
    if (metodo === "GET") return listarVersoes(request, env);
    if (metodo === "POST") return guardarCopia(request, env);
  }
  const versao = /^\/api\/versoes\/(\d+)$/.exec(caminho);
  if (versao && metodo === "GET") return obterVersao(env, Number(versao[1]));

  if (caminho === "/api/arquivos" && metodo === "GET") return listarArquivos(request, env);
  const arquivo = /^\/api\/arquivos\/([^/]+)$/.exec(caminho);
  if (arquivo) {
    const id = decodeURIComponent(arquivo[1]);
    if (metodo === "PUT") return enviarArquivo(request, env, id);
    if (metodo === "GET") return baixarArquivo(request, env, id);
  }

  throw new ErroHttp(404, "Rota não encontrada.");
}

export default {
  async fetch(request, env) {
    const cors = cabecalhosCors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    let resposta;
    try {
      resposta = await rotear(request, env);
    } catch (e) {
      if (e instanceof ErroHttp) {
        resposta = json({ erro: e.message, ...e.extra }, e.status);
      } else {
        console.error(e);
        resposta = json({ erro: "Erro interno no servidor." }, 500);
      }
    }
    for (const [k, v] of Object.entries(cors)) resposta.headers.set(k, v);
    return resposta;
  },

  async scheduled(_evento, env, ctx) {
    ctx.waitUntil(limpar(env).then((r) => console.log("Limpeza diária:", JSON.stringify(r))));
  },
};
