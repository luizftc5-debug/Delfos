/* ===========================================================================
   Integração com Google Calendar e Google Drive (OAuth no próprio navegador).

   Requisitos:
   1. Preencher GOOGLE_CONFIG.CLIENT_ID em config.js
   2. Abrir a página por http:// ou https:// (o Google bloqueia file://)
   3. Registrar a origem exata da página no Google Cloud Console

   Quando algo falta, o botão explica o que fazer e mostra a origem exata que
   precisa ser colada no console do Google.
   =========================================================================== */

let gapiPronto = false;
let gisPronto = false;
let tokenClient = null;
let tokenAcesso = null;
const aoConectarCallbacks = [];

/** Registra algo para rodar assim que a autorização do Google for concedida. */
function aoConectar(fn) {
  aoConectarCallbacks.push(fn);
}

function origemAtual() {
  return window.location.origin && window.location.origin !== "null"
    ? window.location.origin
    : null;
}

function clientIdConfigurado() {
  return (
    typeof GOOGLE_CONFIG !== "undefined" &&
    typeof GOOGLE_CONFIG.CLIENT_ID === "string" &&
    GOOGLE_CONFIG.CLIENT_ID.trim().endsWith(".apps.googleusercontent.com") &&
    !GOOGLE_CONFIG.CLIENT_ID.includes("SEU_CLIENT_ID")
  );
}

function atualizarEstado(conectado, texto) {
  const box = document.getElementById("google-status");
  const label = document.getElementById("google-texto");
  if (!box || !label) return;
  box.classList.toggle("on", conectado);
  label.textContent = texto || (conectado ? "Conectado" : "Não conectado");
}

/* ----------------------- Carregamento das bibliotecas ---------------------
   As bibliotecas do Google (uns 160 KB comprimidos, mais as descrições das
   APIs de Agenda e Drive) não vêm mais com a página: eram baixadas e
   interpretadas em toda visita, mesmo sem ninguém conectar, e seguravam o
   script da própria página até terminarem. Agora:
   - vêm sozinhas depois que a página fica quieta (fora do modo leve), ou
     ao passar o mouse no botão de conectar, para o clique abrir a janela
     do Google na hora;
   - as descrições das APIs só vêm depois que a pessoa autoriza. */

let googleCarregando = null;
let apisCarregando = null;

function scriptExterno(src) {
  return new Promise((ok, falha) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => falha(new Error("Não foi possível falar com o Google."));
    document.head.appendChild(s);
  });
}

/** Baixa e inicia as duas bibliotecas do Google (uma vez por página). */
function carregarGoogle() {
  if (googleCarregando) return googleCarregando;
  googleCarregando = Promise.all([
    scriptExterno("https://apis.google.com/js/api.js").then(onGapiLoad),
    scriptExterno("https://accounts.google.com/gsi/client").then(onGisLoad),
  ]).catch((e) => { googleCarregando = null; throw e; });
  return googleCarregando;
}

/** O cliente do gapi, sem as APIs (essas só depois da autorização). */
function onGapiLoad() {
  if (typeof gapi === "undefined") return Promise.reject(new Error("Biblioteca do Google indisponível."));
  return new Promise((ok, falha) => gapi.load("client", () => gapi.client.init({}).then(ok, falha)));
}

/** Descrições da Agenda e do Drive: só depois que a pessoa autorizou. */
function carregarApis() {
  if (apisCarregando) return apisCarregando;
  apisCarregando = Promise.all([
    gapi.client.load("https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"),
    gapi.client.load("https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"),
  ]).then(() => { gapiPronto = true; }).catch((e) => { apisCarregando = null; throw e; });
  return apisCarregando;
}

function onGisLoad() {
  if (typeof google === "undefined" || !clientIdConfigurado()) return;
  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CONFIG.CLIENT_ID.trim(),
      scope: GOOGLE_CONFIG.SCOPES,
      callback: async (resp) => {
        if (resp.error) {
          atualizarEstado(false, "Falha na autorização");
          explicarErro(resp);
          return;
        }
        tokenAcesso = resp.access_token;
        gapi.client.setToken({ access_token: tokenAcesso });
        atualizarEstado(false, "Conectando…");
        try {
          await carregarApis();
        } catch (e) {
          console.warn("Falha ao carregar as APIs do Google.", e);
          atualizarEstado(false, "Não foi possível carregar a Agenda e o Drive");
          return;
        }
        atualizarEstado(true, "Conectado ao Google");
        buscarEventos();
        buscarArquivos();
        aoConectarCallbacks.splice(0).forEach((fn) => fn());
      },
      // A janela do Google foi barrada (o clique ficou longe demais da
      // abertura, enquanto a biblioteca ainda chegava): basta clicar de novo.
      error_callback: (erro) => {
        if (erro?.type === "popup_failed_to_open") {
          atualizarEstado(false, "Clique em conectar de novo");
          ajuda({
            titulo: "Clique em conectar de novo",
            passos: ["O navegador segurou a janela do Google porque ela abriu enquanto a conexão ainda carregava.", "Agora está tudo pronto: clique em conectar mais uma vez."],
          });
        }
      },
    });
    gisPronto = true;
  } catch (e) {
    console.error("Não foi possível iniciar o login do Google.", e);
  }
}

/* -------------------------------- Conexão --------------------------------- */

function conectarGoogle() {
  const origem = origemAtual();

  if (window.location.protocol === "file:") {
    return ajuda({
      titulo: "Abra o painel por um servidor",
      passos: [
        "O Google não permite login em páginas abertas direto do arquivo (file://).",
        "Use o link publicado no GitHub Pages, ou rode um servidor local: abra o terminal na pasta dashboard e execute python -m http.server 8000.",
        "Depois acesse http://localhost:8000 e tente conectar de novo.",
      ],
    });
  }

  if (!clientIdConfigurado()) {
    return ajuda({
      titulo: "Falta configurar o Client ID",
      passos: [
        "Abra o arquivo dashboard/config.js.",
        'Substitua o texto "SEU_CLIENT_ID_AQUI.apps.googleusercontent.com" pelo Client ID criado no Google Cloud Console.',
        "O valor precisa terminar em .apps.googleusercontent.com. Cole ele inteiro, sem espaços.",
        "Salve o arquivo, envie a alteração (commit e push) e recarregue esta página.",
      ],
      origem,
    });
  }

  if (!gisPronto || typeof gapi === "undefined" || !gapi.client) {
    atualizarEstado(false, "Carregando o Google…");
    return carregarGoogle()
      .then(() => {
        if (!tokenClient) throw new Error("O login do Google não iniciou.");
        tokenClient.requestAccessToken({ prompt: tokenAcesso ? "" : "consent" });
      })
      .catch(() => {
        atualizarEstado(false);
        ajuda({
          titulo: "Não foi possível falar com o Google",
          passos: [
            "As bibliotecas de conexão vêm dos servidores do Google e não chegaram.",
            "Confira a internet e clique em conectar de novo.",
          ],
        });
      });
  }

  tokenClient.requestAccessToken({ prompt: tokenAcesso ? "" : "consent" });
}

function explicarErro(resp) {
  const origem = origemAtual();
  const codigo = resp?.error || "";

  if (codigo === "popup_closed_by_user" || codigo === "access_denied") {
    return ajuda({
      titulo: "Autorização cancelada",
      passos: [
        "A janela do Google foi fechada antes de concluir.",
        "Clique em conectar de novo e aceite as permissões de leitura da agenda e do Drive.",
        "Se o Google avisar que o app não é verificado, entre em “Avançado” e siga assim mesmo: o app é seu.",
      ],
    });
  }

  ajuda({
    titulo: "O Google recusou a conexão",
    passos: [
      "O motivo mais comum é a origem desta página não estar registrada no seu projeto do Google Cloud.",
      "Abra console.cloud.google.com/apis/credentials, clique no seu ID do cliente OAuth e adicione a origem abaixo em “Origens JavaScript autorizadas”.",
      "Confirme também que as APIs Google Calendar e Google Drive estão ativadas, e que seu e-mail está como usuário de teste na tela de consentimento.",
      "As alterações no Google podem levar alguns minutos para valer.",
    ],
    origem,
    detalhe: codigo ? `Código do erro: ${codigo}` : "",
  });
}

// Caixa de ajuda com a origem exata que precisa ser registrada no Google.
function ajuda({ titulo, passos, origem, detalhe }) {
  const html = `
    <div class="modal-head">
      <h2 class="modal-title">${UI.fmt.escape(titulo)}</h2>
    </div>
    <div class="modal-body">
      <ol style="margin:0; padding-left:18px; display:flex; flex-direction:column; gap:8px; font-size:calc(13px * var(--escala-fonte, 1)); color:var(--texto-2);">
        ${passos.map((p) => `<li>${UI.fmt.escape(p)}</li>`).join("")}
      </ol>
      ${origem ? `
        <div class="field">
          <label>Origem desta página (copie para o Google Cloud)</label>
          <input class="input" readonly value="${UI.fmt.escape(origem)}" data-origem />
          <span class="hint">Cole exatamente assim, sem barra no final.</span>
        </div>` : ""}
      ${detalhe ? `<p class="card-note" style="margin:0;">${UI.fmt.escape(detalhe)}</p>` : ""}
    </div>
    <div class="modal-foot"><button class="btn primary" data-fechar type="button">Entendi</button></div>`;

  UI.abrirModal(html, {
    aoMontar(modal, fechar) {
      const campo = modal.querySelector("[data-origem]");
      if (campo) campo.addEventListener("focus", () => campo.select());
      modal.querySelector("[data-fechar]").addEventListener("click", () => fechar(null));
    },
  });
}

/* ------------------------------- Consultas -------------------------------- */

function buscarEventos() {
  const el = document.getElementById("google-calendar-list");
  if (!el) return;
  gapi.client.calendar.events
    .list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 10,
      orderBy: "startTime",
    })
    .then((resp) => {
      const eventos = resp.result.items || [];
      el.innerHTML = "";
      if (!eventos.length) {
        el.appendChild(UI.vazio({ icone: "◷", titulo: "Nenhum evento futuro", texto: "Sua agenda do Google não tem eventos nos próximos dias." }));
        return;
      }
      const ul = document.createElement("ul");
      ul.className = "list";
      eventos.forEach((ev) => {
        const inicio = ev.start.dateTime || ev.start.date;
        const dia = inicio.slice(0, 10);
        const u = UI.urgencia(dia);
        const hora = ev.start.dateTime
          ? new Date(inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : "dia inteiro";
        const li = document.createElement("li");
        li.innerHTML = `
          <span class="grow">
            <span class="title">${UI.fmt.escape(ev.summary || "(sem título)")}</span>
            <span class="meta">${UI.fmt.data(dia)}, ${hora}</span>
          </span>
          <span class="badge ${u.nivel}">${u.rotulo}</span>`;
        ul.appendChild(li);
      });
      el.appendChild(ul);
    })
    .catch((err) => {
      console.error(err);
      el.innerHTML = `<p class="card-note">Não foi possível ler a agenda. Verifique se a Google Calendar API está ativada no seu projeto.</p>`;
    });
}

function buscarArquivos() {
  const el = document.getElementById("google-drive-list");
  if (!el) return;
  gapi.client.drive.files
    .list({
      pageSize: 10,
      orderBy: "modifiedTime desc",
      fields: "files(id, name, modifiedTime, webViewLink)",
    })
    .then((resp) => {
      const arquivos = resp.result.files || [];
      el.innerHTML = "";
      if (!arquivos.length) {
        el.appendChild(UI.vazio({ icone: "◫", titulo: "Nenhum arquivo encontrado", texto: "Não há arquivos recentes na conta conectada." }));
        return;
      }
      const ul = document.createElement("ul");
      ul.className = "list";
      arquivos.forEach((f) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span class="grow">
            <a class="title" href="${UI.fmt.escape(f.webViewLink)}" target="_blank" rel="noopener">${UI.fmt.escape(f.name)}</a>
            <span class="meta">modificado em ${new Date(f.modifiedTime).toLocaleDateString("pt-BR")}</span>
          </span>`;
        ul.appendChild(li);
      });
      el.appendChild(ul);
    })
    .catch((err) => {
      console.error(err);
      el.innerHTML = `<p class="card-note">Não foi possível ler o Drive. Verifique se a Google Drive API está ativada no seu projeto.</p>`;
    });
}

/* ------------------- Drive: busca usada pela importação -------------------
   Reaproveita a mesma conexão OAuth desta página para procurar arquivos do
   Drive e, quando é um Google Docs, ler o texto — usado em disciplina.js para
   puxar resumos direto para a matéria. --------------------------------- */

function driveConectado() {
  return gapiPronto && !!tokenAcesso;
}

function driveBuscarArquivos(termo, maxResultados = 10) {
  if (!driveConectado()) return Promise.reject(new Error("Conecte-se ao Google primeiro."));
  const escapado = String(termo || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return gapi.client.drive.files
    .list({
      pageSize: maxResultados,
      orderBy: "modifiedTime desc",
      fields: "files(id, name, mimeType, modifiedTime, webViewLink)",
      q: `trashed = false${escapado ? ` and name contains '${escapado}'` : ""}`,
    })
    .then((resp) => resp.result.files || []);
}

function driveEhGoogleDocs(mimeType) {
  return mimeType === "application/vnd.google-apps.document";
}

/** Exporta o texto de um Google Docs — os demais formatos não têm exportação de texto. */
function driveExportarTexto(fileId) {
  return gapi.client.drive.files
    .export({ fileId, mimeType: "text/plain" })
    .then((resp) => resp.body || "");
}

/* ------------------ Calendário: importação na aba Pessoal ------------------
   Usado por calendario.js. Nada é gravado aqui: estas funções só trazem o
   texto do arquivo ou a lista de eventos; quem decide o que entra é a
   revisão do assistente de importação. --------------------------------- */

/** Conecta (se preciso) e roda `fn` com a sessão pronta. */
function googleComConexao(fn) {
  if (driveConectado()) return fn();
  aoConectar(fn);
  conectarGoogle();
}

/** Arquivos de calendário (.ics) no Drive, os mais recentes primeiro. */
function driveListarCalendarios(termo = "") {
  if (!driveConectado()) return Promise.reject(new Error("Conecte-se ao Google primeiro."));
  const escapado = String(termo || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return gapi.client.drive.files
    .list({
      pageSize: 25,
      orderBy: "modifiedTime desc",
      fields: "files(id, name, mimeType, modifiedTime, size)",
      q: `trashed = false and (mimeType = 'text/calendar' or name contains '.ics')${escapado ? ` and name contains '${escapado}'` : ""}`,
    })
    .then((resp) => resp.result.files || []);
}

/** Conteúdo bruto (texto) de um arquivo do Drive. */
function driveBaixarTexto(fileId) {
  return gapi.client.drive.files.get({ fileId, alt: "media" }).then((resp) => resp.body || "");
}

/** Eventos da agenda principal do Google entre duas datas ISO (até 1.000). */
async function agendaListarEventos(inicioISO, fimISO) {
  if (!driveConectado()) throw new Error("Conecte-se ao Google primeiro.");
  const eventos = [];
  let pageToken;
  do {
    const resp = await gapi.client.calendar.events.list({
      calendarId: "primary",
      timeMin: new Date(`${inicioISO}T00:00:00`).toISOString(),
      timeMax: new Date(`${fimISO}T23:59:59`).toISOString(),
      showDeleted: false,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
      pageToken,
    });
    eventos.push(...(resp.result.items || []));
    pageToken = resp.result.nextPageToken;
  } while (pageToken && eventos.length < 1000);
  return eventos;
}

document.addEventListener("DOMContentLoaded", () => {
  atualizarEstado(false);
  const botao = document.getElementById("google-connect-btn");
  botao?.addEventListener("click", conectarGoogle);
  // Ao chegar perto do botão, a biblioteca já começa a vir.
  ["pointerenter", "focus", "touchstart"].forEach((ev) => botao?.addEventListener(ev, () => carregarGoogle().catch(() => {}), { once: true, passive: true }));
  // Fora do modo leve, vem sozinha quando a página fica quieta, para
  // qualquer botão do Google (importar do Drive, da Agenda) abrir na hora.
  if (!clientIdConfigurado() || location.protocol === "file:" || document.documentElement.dataset.leve === "sim") return;
  const quando = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
  window.addEventListener("load", () => setTimeout(() => quando(() => carregarGoogle().catch(() => {}), { timeout: 8000 }), 2500), { once: true });
});
