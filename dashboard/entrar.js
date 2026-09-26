/* Entrada — login e criação de conta. Página sem barra lateral, como o
   assistente de boas-vindas; é a única que sessao.js deixa abrir sem conta.
   Depois de entrar, nuvem.js decide o que fazer com os dados que já estão
   neste navegador (aposEntrar) e só então o painel abre. */

(() => {
  UI.tema.iniciar();

  const params = new URLSearchParams(location.search);
  const destino = Sessao.destinoDepoisDeEntrar();

  // Contas desligadas (servidor ainda não publicado) ou sessão já aberta:
  // não há o que fazer aqui.
  if (!Sessao.ativo() || Sessao.logado()) {
    location.replace(destino);
    return;
  }

  const $ = (id) => document.getElementById(id);
  const form = $("form");
  const btn = $("btn-enviar");
  const erro = $("erro");
  let modo = "entrar";
  let pedeConvite = false;

  function avisar(texto) {
    $("aviso-texto").textContent = texto;
    $("aviso").classList.toggle("hidden", !texto);
  }

  if (params.has("saiu")) avisar("Você saiu da conta. Os dados deste navegador foram apagados — continuam na sua conta.");
  else if (params.has("excluida")) avisar("Conta excluída. Tudo o que estava nela foi apagado do servidor e deste navegador.");
  else if (params.get("volta")) avisar("Entre para abrir o painel.");

  // Quem já entrou aqui antes (sessão vencida) só precisa da senha.
  const anterior = Sessao.usuario();
  if (anterior?.email) $("f-email").value = anterior.email;

  function trocarModo(novo) {
    modo = novo;
    document.querySelectorAll("#modo button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modo === modo)));
    document.querySelectorAll(".so-criar").forEach((el) => el.classList.toggle("hidden", modo !== "criar"));
    document.querySelectorAll(".so-entrar").forEach((el) => el.classList.toggle("hidden", modo !== "entrar"));
    document.querySelectorAll(".so-convite").forEach((el) => el.classList.toggle("hidden", modo !== "criar" || !pedeConvite));
    $("f-senha").setAttribute("autocomplete", modo === "criar" ? "new-password" : "current-password");
    $("frase").textContent = modo === "criar"
      ? "Crie sua conta. Seus dados passam a te acompanhar em qualquer aparelho."
      : "Antes de tudo, entre na sua conta.";
    btn.textContent = modo === "criar" ? "Criar conta" : "Entrar";
    erro.textContent = "";
    (modo === "criar" ? $("f-nome") : ($("f-email").value ? $("f-senha") : $("f-email"))).focus();
  }

  $("modo").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-modo]");
    if (b) trocarModo(b.dataset.modo);
  });

  Sessao.saude()
    .then((s) => {
      pedeConvite = s.cadastro === "convite";
      trocarModo(modo);
    })
    .catch(() => avisar("Não foi possível falar com o servidor. Confira a internet e recarregue a página."));

  function ocupado(sim, texto) {
    btn.disabled = sim;
    form.querySelectorAll("input").forEach((i) => { i.disabled = sim; });
    btn.textContent = sim ? texto : (modo === "criar" ? "Criar conta" : "Entrar");
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    erro.textContent = "";
    const email = $("f-email").value.trim();
    const senha = $("f-senha").value;
    const nome = $("f-nome").value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return (erro.textContent = "Informe um e-mail válido.");
    if (!senha) return (erro.textContent = "Informe a senha.");

    try {
      let usuario;
      if (modo === "criar") {
        if (!nome) return (erro.textContent = "Informe seu nome.");
        ocupado(true, "Conferindo a senha…");
        const problema = await Sessao.problemaNaSenha(senha, $("f-confirmar").value);
        if (problema) {
          ocupado(false);
          erro.textContent = problema;
          return;
        }
        ocupado(true, "Protegendo sua senha…");
        usuario = await Sessao.cadastrar({ email, senha, convite: $("f-convite").value.trim() });
      } else {
        ocupado(true, "Entrando…");
        usuario = await Sessao.entrar({ email, senha });
      }

      ocupado(true, "Preparando seus dados…");
      await Nuvem.aposEntrar(usuario, { novaConta: modo === "criar", nome });
      location.replace(destino);
    } catch (e) {
      ocupado(false);
      erro.textContent = e.message;
      if (e.status === 409 && modo === "criar") trocarModo("entrar");
      if (e.status === 409) erro.textContent = e.message;
    }
  });

  trocarModo("entrar");
})();
