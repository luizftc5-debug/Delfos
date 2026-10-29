/* Entrada por e-mail ou Google; a conta só abre após sincronizar seus dados. */
(() => {
  UI.tema.iniciar();
  const params = new URLSearchParams(location.search), destino = Sessao.destinoDepoisDeEntrar();
  if (Sessao.ativo() && Sessao.logado()) { location.replace(destino); return; }
  const $ = id => document.getElementById(id), form = $("form"), btn = $("btn-enviar"), erro = $("erro");
  const ROTULO = { entrar: "Entrar", criar: "Criar conta", recuperar: "Redefinir e entrar" };
  const TITULO = { entrar: "Bom ter você de volta.", criar: "Seu espaço começa aqui.", recuperar: "Vamos recuperar seu acesso." };
  const FRASE = { entrar: "Entre para continuar de onde parou.", criar: "Crie sua conta e reúna o que importa para você.", recuperar: "Use seu e-mail e o código de recuperação que você guardou." };
  let modo = "entrar", pedeConvite = false, contasDisponiveis = Sessao.ativo(), trabalhando = false;
  let googleClientId = "", googlePendente = null, googleVersao = 0, sdkGoogle = null;
  function avisar(texto) { $("aviso-texto").textContent = texto; $("aviso").classList.toggle("hidden", !texto); }
  function estado(texto) { $("acesso-estado").textContent = texto; }
  function ocupar(sim, texto = "") {
    trabalhando = sim;
    form.querySelectorAll("input, button").forEach(i => { i.disabled = sim || !contasDisponiveis; });
    $("modo").querySelectorAll("button").forEach(b => { b.disabled = sim; });
    ["google-confirmar", "google-cancelar", "google-senha-vinculo", "google-convite", "google-manter"].forEach(id => { $(id).disabled = sim; });
    $("google-botao").inert = sim;
    btn.textContent = sim && !googlePendente ? texto : ROTULO[modo];
    estado(sim ? texto : "");
  }
  function limparGoogle() {
    googlePendente = null; $("google-pendente").hidden = true;
    $("google-senha-vinculo").value = ""; $("google-erro").textContent = "";
    form.hidden = false; $("email-separador").hidden = modo === "recuperar";
  }
  function trocarModo(novo, focar = true) {
    if (!["entrar", "criar", "recuperar"].includes(novo)) return;
    modo = novo; limparGoogle();
    $("modo").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.modo === modo)));
    $("modo").classList.toggle("hidden", modo === "recuperar");
    document.querySelectorAll(".so-entrar, .so-criar, .so-recuperar").forEach(el => {
      const serve = el.classList.contains(`so-${modo}`) && (!el.classList.contains("so-convite") || pedeConvite);
      el.classList.toggle("hidden", !serve);
    });
    $("google-area").hidden = modo === "recuperar";
    $("f-senha").autocomplete = modo === "entrar" ? "current-password" : "new-password";
    $("acesso-titulo").textContent = TITULO[modo]; $("frase").textContent = FRASE[modo]; btn.textContent = ROTULO[modo];
    erro.textContent = "";
    form.querySelectorAll("[aria-invalid]").forEach(el => el.removeAttribute("aria-invalid"));
    if (focar && contasDisponiveis) (modo === "criar" ? $("f-nome") : modo === "recuperar" && $("f-email").value ? $("f-codigo") : $("f-email").value ? $("f-senha") : $("f-email")).focus();
    if (googleClientId) prepararGoogle();
  }
  $("modo").addEventListener("click", ev => { const b = ev.target.closest("[data-modo]"); if (b && !trabalhando) trocarModo(b.dataset.modo); });
  $("modo").addEventListener("keydown", ev => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(ev.key) || trabalhando) return;
    ev.preventDefault(); const botoes = [...$("modo").querySelectorAll("button")];
    const indice = ev.key === "Home" ? 0 : ev.key === "End" ? 1 : modo === "entrar" ? 1 : 0;
    trocarModo(botoes[indice].dataset.modo, false); botoes[indice].focus();
  });
  $("btn-esqueci").onclick = () => trocarModo("recuperar");
  $("btn-voltar-entrar").onclick = () => trocarModo("entrar");
  form.querySelector("[data-mostrar]").onclick = ev => {
    const mostrar = $("f-senha").type === "password";
    ["f-senha", "f-confirmar"].forEach(id => { $(id).type = mostrar ? "text" : "password"; });
    ev.currentTarget.textContent = mostrar ? "Ocultar" : "Mostrar"; ev.currentTarget.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
  };
  ["f-senha", "f-confirmar"].forEach(id => $(id).addEventListener("keyup", ev => {
    if (typeof ev.getModifierState === "function") form.querySelector("[data-caps]").classList.toggle("hidden", !ev.getModifierState("CapsLock"));
  }));
  function falhar(texto, id) { erro.textContent = texto; if (id) { $(id).setAttribute("aria-invalid", "true"); $(id).focus(); } }
  form.addEventListener("input", ev => { ev.target.removeAttribute("aria-invalid"); erro.textContent = ""; });
  async function finalizar({ usuario, codigoRecuperacao, novaConta = false, nome = "", viaGoogle = false }) {
    if (codigoRecuperacao) await Nuvem.mostrarCodigoRecuperacao(codigoRecuperacao, { introducao: novaConta ? viaGoogle ? "Sua conta foi criada com o Google. Guarde este código: ele também permite definir uma senha Delfos para gerenciar sua conta, pela opção Esqueci minha senha." : "Sua conta foi criada. Guarde este código para recuperar seu acesso se precisar." : "Senha redefinida. Guarde o novo código de recuperação." });
    ocupar(true, "Preparando seus dados…"); await Nuvem.aposEntrar(usuario, { novaConta, nome }); location.replace(destino);
  }
  form.addEventListener("submit", async ev => {
    ev.preventDefault(); if (trabalhando || !contasDisponiveis) return;
    erro.textContent = "";
    const email = $("f-email").value.trim(), senha = $("f-senha").value, nome = $("f-nome").value.trim(), manter = $("f-manter").checked;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return falhar("Informe um e-mail válido.", "f-email");
    if (!senha) return falhar(modo === "entrar" ? "Informe a senha." : "Escolha uma senha nova.", "f-senha");
    if (modo === "criar" && !nome) return falhar("Informe seu nome.", "f-nome");
    if (modo === "criar" && pedeConvite && !$("f-convite").value.trim()) return falhar("Informe o código de convite.", "f-convite");
    if (modo === "recuperar" && !$("f-codigo").value.trim()) return falhar("Informe o código de recuperação.", "f-codigo");
    try {
      let usuario, codigoRecuperacao;
      if (modo === "entrar") { ocupar(true, "Entrando…"); usuario = await Sessao.entrar({ email, senha, manter }); }
      else {
        ocupar(true, "Conferindo a senha…"); const problema = await Sessao.problemaNaSenha(senha, $("f-confirmar").value);
        if (problema) { ocupar(false); return falhar(problema, "f-senha"); }
        ocupar(true, "Protegendo seu acesso…");
        const r = modo === "criar" ? await Sessao.cadastrar({ email, senha, manter, convite: $("f-convite").value.trim() }) : await Sessao.recuperar({ email, senha, manter, codigo: $("f-codigo").value });
        ({ usuario, codigoRecuperacao } = r);
      }
      await finalizar({ usuario, codigoRecuperacao, novaConta: modo === "criar", nome });
    } catch (e) { ocupar(false); if (e.status === 409 && modo === "criar") trocarModo("entrar", false); erro.textContent = e.message; }
  });
  function carregarGoogle() {
    if (window.google?.accounts?.id) return Promise.resolve();
    return sdkGoogle ||= new Promise((resolve, reject) => {
      const script = document.createElement("script"), timer = setTimeout(() => { script.remove(); sdkGoogle = null; reject(new Error("O Google demorou para responder. Tente novamente ou entre com e-mail.")); }, 12000);
      script.src = "https://accounts.google.com/gsi/client"; script.async = true;
      script.onload = () => { clearTimeout(timer); resolve(); }; script.onerror = () => { clearTimeout(timer); sdkGoogle = null; reject(new Error("Não foi possível abrir o Google. Você pode entrar com e-mail.")); };
      document.head.append(script);
    });
  }
  async function prepararGoogle() {
    const versao = ++googleVersao;
    if (modo === "recuperar") return;
    try {
      const { nonce } = await Sessao.desafioGoogle(); await carregarGoogle();
      if (versao !== googleVersao || modo === "recuperar") return;
      const box = $("google-botao"); box.hidden = false; box.replaceChildren();
      google.accounts.id.initialize({ client_id: googleClientId, nonce, auto_select: false, callback: resposta => {
        if (!resposta.credential || trabalhando || versao !== googleVersao) return;
        $("google-senha-vinculo").value = "";
        $("google-erro").textContent = "";
        googlePendente = { credencial: resposta.credential, nonce, etapa: modo === "criar" ? "criar" : "entrar", email: "" };
        if (modo === "criar" && pedeConvite) mostrarPendente("criar"); else autenticarGoogle();
      } });
      google.accounts.id.renderButton(box, { type: "standard", theme: document.documentElement.dataset.theme === "light" ? "outline" : "filled_black", size: "large", shape: "rectangular", text: modo === "criar" ? "signup_with" : "signin_with", locale: "pt_BR", width: Math.max(200, Math.min(400, Math.floor(box.getBoundingClientRect().width))) });
      $("google-indisponivel").hidden = true; $("google-nota").textContent = "Use sua conta Google. Não pedimos acesso ao seu Gmail.";
    } catch (e) { if (versao === googleVersao) { $("google-botao").hidden = true; $("google-indisponivel").hidden = false; $("google-nota").textContent = e.message; } }
  }
  function mostrarPendente(etapa) {
    googlePendente.etapa = etapa;
    $("google-pendente").hidden = false; form.hidden = true; $("email-separador").hidden = true;
    $("google-conta").textContent = googlePendente.email || "Sua conta Google foi selecionada.";
    $("google-campo-vinculo").hidden = etapa !== "vincular"; $("google-campo-convite").hidden = etapa !== "criar" || !pedeConvite;
    $("google-confirmar").textContent = etapa === "vincular" ? "Vincular e entrar" : "Criar conta com o Google";
    $("google-instrucao").textContent = etapa === "vincular" ? "Você já tem uma conta Delfos com este e-mail. Confirme sua senha atual para manter seus dados e vincular o Google." : "Crie seu espaço usando esta conta Google.";
    (etapa === "vincular" ? $("google-senha-vinculo") : pedeConvite ? $("google-convite") : $("google-confirmar")).focus();
  }
  async function autenticarGoogle() {
    if (!googlePendente || trabalhando) return;
    const p = googlePendente;
    if (p.etapa === "vincular" && !$("google-senha-vinculo").value) { $("google-erro").textContent = "Informe sua senha atual do Delfos."; $("google-senha-vinculo").focus(); return; }
    if (p.etapa === "criar" && pedeConvite && !$("google-convite").value.trim()) { mostrarPendente("criar"); $("google-erro").textContent = "Informe o código de convite."; return; }
    $("google-erro").textContent = ""; ocupar(true, "Entrando com o Google…");
    try {
      const r = await Sessao.entrarComGoogle({ credencial: p.credencial, nonce: p.nonce, manter: $("google-pendente").hidden ? $("f-manter").checked : $("google-manter").checked, convite: $("google-convite").value.trim(), criarConta: p.etapa === "criar", ...(p.etapa === "vincular" ? { emailVinculo: p.email, senhaVinculo: $("google-senha-vinculo").value } : {}) });
      $("google-senha-vinculo").value = ""; await finalizar({ ...r, viaGoogle: true });
    } catch (e) {
      ocupar(false); p.email = e.dados?.email || p.email;
      if (e.dados?.vincularGoogle) mostrarPendente("vincular");
      else if (e.dados?.criarContaGoogle) mostrarPendente("criar");
      else { $("google-erro").textContent = e.message; if (e.status === 410 || e.status === 401) { limparGoogle(); $("google-erro").textContent = e.message; prepararGoogle(); } }
    }
  }
  $("google-confirmar").onclick = autenticarGoogle;
  $("google-cancelar").onclick = () => { limparGoogle(); prepararGoogle(); };
  $("google-senha-vinculo").addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); autenticarGoogle(); } });
  const anterior = Sessao.usuario(); if (anterior?.email) $("f-email").value = anterior.email;
  $("f-manter").checked = $("google-manter").checked = Sessao.mantido();
  if (params.has("saiu")) avisar("Você saiu da conta. Os dados deste navegador foram apagados e continuam na sua conta.");
  else if (params.has("excluida")) avisar("Sua conta e os dados dela foram excluídos.");
  trocarModo(params.get("modo") === "criar" ? "criar" : params.get("modo") === "recuperar" ? "recuperar" : "entrar", false);
  if (!contasDisponiveis) {
    ocupar(false); $("acesso-local").hidden = false;
    avisar("O acesso por conta ainda não está disponível neste endereço. Você pode usar o Delfos neste aparelho, com os dados guardados neste navegador.");
    $("google-nota").textContent = "O acesso pelo Google será liberado junto com as contas.";
  } else Sessao.saude().then(s => {
    pedeConvite = s.cadastro === "convite"; googleClientId = s.google?.clientId || ""; trocarModo(modo, false);
    if (!googleClientId) $("google-nota").textContent = "O Google está indisponível neste momento. Use seu e-mail para entrar ou criar conta.";
  }).catch(() => avisar("Não foi possível conectar ao servidor. Confira sua conexão e tente novamente."));
})();
