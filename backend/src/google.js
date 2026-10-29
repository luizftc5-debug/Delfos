/* Google Identity Services: somente a assinatura e as chaves públicas oficiais
   podem autorizar uma identidade. Nenhum dado decodificado no navegador vale
   como prova de login; o token também fica vinculado ao nonce deste fluxo. */
import { createRemoteJWKSet, customFetch, jwtVerify, errors } from "jose";
import { ErroHttp, textoCurto } from "./respostas.js";

let chavesExpiram = 0;
const CHAVES = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"), {
  timeoutDuration: 5000, cacheMaxAge: 60 * 60 * 1000, cooldownDuration: 30000,
  [customFetch]: async (url, opcoes) => {
    const r = await fetch(url, opcoes);
    const cache = r.headers.get("cache-control") || "";
    const max = Number(/(?:^|,)\s*max-age=(\d+)/i.exec(cache)?.[1] ?? 300);
    const idade = Number(r.headers.get("age")) || 0;
    chavesExpiram = Date.now() + (/no-cache|no-store/i.test(cache) ? 0 : Math.max(0, Math.min(3600, max - idade))) * 1000;
    return r;
  },
});

async function chavesGoogle(cabecalho, token) {
  // jose cuida da seleção/rotação das chaves; a resposta do Google também
  // pode pedir atualização antes do limite local de uma hora.
  if (chavesExpiram && Date.now() >= chavesExpiram) await CHAVES.reload();
  return CHAVES(cabecalho, token);
}

export function googleClientId(env) {
  const id = String(env.GOOGLE_CLIENT_ID || "").trim();
  return /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id) ? id : "";
}

export async function verificarGoogle(credencial, clientId, nonce) {
  if (typeof credencial !== "string" || credencial.length > 12000 || credencial.split(".").length !== 3) {
    throw new ErroHttp(400, "Resposta do Google inválida. Tente entrar novamente.");
  }
  let payload;
  try {
    ({ payload } = await jwtVerify(credencial, chavesGoogle, {
      algorithms: ["RS256"], audience: clientId,
      issuer: ["accounts.google.com", "https://accounts.google.com"],
      requiredClaims: ["exp", "iat", "sub", "email", "email_verified", "nonce"],
      maxTokenAge: "1 hour", clockTolerance: 30,
    }));
  } catch (e) {
    if (e instanceof errors.JWKSTimeout || e instanceof TypeError || e?.code === "ERR_JOSE_GENERIC") {
      throw new ErroHttp(503, "Não foi possível conferir o login com o Google. Tente novamente em instantes.");
    }
    throw new ErroHttp(401, "O login com o Google não pôde ser confirmado. Entre novamente.");
  }
  const agora = Math.floor(Date.now() / 1000);
  if (payload.aud !== clientId || payload.azp && payload.azp !== clientId ||
      payload.exp <= agora || payload.iat > agora + 30 || payload.nonce !== nonce ||
      typeof payload.sub !== "string" || !/^[A-Za-z0-9_-]{1,255}$/.test(payload.sub) ||
      payload.email_verified !== true || typeof payload.email !== "string") {
    throw new ErroHttp(401, "O login com o Google não pôde ser confirmado. Entre novamente.");
  }
  return { sub: payload.sub, email: payload.email.trim().toLowerCase(), nome: textoCurto(payload.given_name || payload.name) };
}
