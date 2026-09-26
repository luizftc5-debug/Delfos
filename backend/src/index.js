/* ===========================================================================
   Delfos — back end (Cloudflare Worker + banco D1).

   O painel é um site estático no GitHub Pages; este servidor é quem guarda
   as contas e os dados de cada uma:

   - Contas: cadastro com e-mail e senha (a senha nunca chega aqui — ver
     contas.js), sessões de 90 dias, troca de senha, exclusão da conta.
   - Sincronização: o mesmo estado em todos os aparelhos da pessoa.
   - Anexos na nuvem: PDFs e imagens dos resumos.
   - Versões anteriores: cópias automáticas para desfazer uma sobrescrita.

   Rotas (todas sob /api; só saude, cadastro e entrar dispensam sessão):

     GET  /api/saude                  no ar? o cadastro pede convite?
     POST /api/cadastro               { email, chave, convite? } → { token, usuario }
     POST /api/entrar                 { email, chave } → { token, usuario }
     POST /api/sair                   encerra a sessão deste aparelho
     GET  /api/conta                  e-mail, datas e uso de anexos
     POST /api/conta/senha            { chaveAtual, chaveNova }
     POST /api/conta/sair-dos-outros  encerra as sessões dos outros aparelhos
     POST /api/conta/excluir          { chave } — apaga a conta e tudo dela
     GET  /api/estado[?desde=N]       estado em vigor
     PUT  /api/estado?base=N          grava (409 se outro aparelho gravou antes)
     GET  /api/versoes                cópias antigas (sem o conteúdo)
     GET  /api/versoes/:id            uma cópia antiga, completa
     POST /api/versoes                guarda uma cópia sem mexer no estado
     GET  /api/arquivos               anexos guardados
     PUT  /api/arquivos/:id           envia um anexo
     GET  /api/arquivos/:id           baixa um anexo
   =========================================================================== */

import { baixarArquivo, enviarArquivo, listarArquivos } from "./arquivos.js";
import {
  cadastrar, entrar, excluirConta, exigirSessao, obterConta, sair, sairDosOutros, trocarSenha,
} from "./contas.js";
import { gravarEstado, guardarCopia, listarVersoes, obterEstado, obterVersao } from "./estado.js";
import { limpar } from "./limpeza.js";
import { ErroHttp, json } from "./respostas.js";

// Só `default` pode ser exportado: o Worker trata toda exportação nomeada como handler.
const VERSAO_API = "2";

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
    return json({ ok: true, versao: VERSAO_API, cadastro: env.CODIGO_CONVITE ? "convite" : "aberto" });
  }
  if (caminho === "/api/cadastro" && metodo === "POST") return cadastrar(request, env);
  if (caminho === "/api/entrar" && metodo === "POST") return entrar(request, env);

  // Daqui para baixo, só com sessão — e só com os dados do dono dela.
  if (!caminho.startsWith("/api/")) throw new ErroHttp(404, "Rota não encontrada.");
  const usuario = await exigirSessao(request, env);

  if (metodo === "POST") {
    if (caminho === "/api/sair") return sair(env, usuario);
    if (caminho === "/api/conta/senha") return trocarSenha(request, env, usuario);
    if (caminho === "/api/conta/sair-dos-outros") return sairDosOutros(env, usuario);
    if (caminho === "/api/conta/excluir") return excluirConta(request, env, usuario);
  }
  if (caminho === "/api/conta" && metodo === "GET") return obterConta(env, usuario);

  if (caminho === "/api/estado") {
    if (metodo === "GET") return obterEstado(request, env, usuario);
    if (metodo === "PUT") return gravarEstado(request, env, usuario);
  }

  if (caminho === "/api/versoes") {
    if (metodo === "GET") return listarVersoes(env, usuario);
    if (metodo === "POST") return guardarCopia(request, env, usuario);
  }
  const versao = /^\/api\/versoes\/(\d+)$/.exec(caminho);
  if (versao && metodo === "GET") return obterVersao(env, usuario, Number(versao[1]));

  if (caminho === "/api/arquivos" && metodo === "GET") return listarArquivos(env, usuario);
  const arquivo = /^\/api\/arquivos\/([^/]+)$/.exec(caminho);
  if (arquivo) {
    const id = decodeURIComponent(arquivo[1]);
    if (metodo === "PUT") return enviarArquivo(request, env, usuario, id);
    if (metodo === "GET") return baixarArquivo(env, usuario, id);
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
