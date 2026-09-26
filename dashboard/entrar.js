/* Entrada — entrar, criar conta e redefinir a senha. Página sem barra
   lateral, como o assistente de boas-vindas; é a única que sessao.js deixa
   abrir sem conta. Depois de entrar, nuvem.js decide o que fazer com os dados
   que já estão neste navegador (aposEntrar) e só então o painel abre. */

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
  const ROTULO = { entrar: "Entrar", criar: "Criar conta", recuperar: "Redefinir e entrar" };
  const FRASE = {
    entrar: "Antes de tudo, entre na sua conta.",
    criar: "Crie sua conta. Seus dados passam a te acompanhar em qualquer aparelho.",
    recuperar: "Esqueceu a senha? O código de recuperação resolve.",
  };
  let modo = "entrar";
  let pedeConvite = false;

  function avisar(texto) {
    $("aviso-texto").textContent = texto;
    $("aviso").classList.toggle("hidden", !texto);
  }

  if (params.has("saiu")) avisar("Você saiu da conta. Os dados deste navegador foram apagados — continuam na sua conta.");
  else if (params.has("excluida")) avisar("Conta excluída. Tudo o que estava nela foi apagado do servidor e deste navegador.");
  else if (params.get("volta")) avisar("Entre para abrir o painel.");

  // Quem já entrou aqui antes só precisa da senha; "manter conectado" lembra
  // a última escolha feita neste aparelho.
  const anterior = Sessao.usuario();
  if (anterior?.email) $("f-email").value = anterior.email;
  $("f-manter").checked = Sessao.mantido();

  function trocarModo(novo) {
    modo = novo;
    document.querySelectorAll("#modo button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modo === modo)));
    $("modo").classList.toggle("hidden", modo === "recuperar");
    // Um elemento pode servir a mais de um modo (so-criar so-recuperar): aparece se servir ao atual.
    document.querySelectorAll(".so-entrar, .so-criar, .so-recuperar").forEach((el) => {
      const serve = el.classList.contains(`so-${modo}`) && (!el.classList.contains("so-convite") || pedeConvite);
      el.classList.toggle("hidden", !serve);
    });
    $("f-senha").setAttribute("autocomplete", modo === "entrar" ? "current-password" : "new-password");
    $("frase").textContent = FRASE[modo];
    btn.textContent = ROTULO[modo];
    erro.textContent = "";
    const foco = modo === "criar" ? $("f-nome")
      : modo === "recuperar" ? ($("f-email").value ? $("f-codigo") : $("f-email"))
      : ($("f-email").value ? $("f-senha") : $("f-email"));
    foco.focus();
  }

  $("modo").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-modo]");
    if (b) trocarModo(b.dataset.modo);
  });
  $("btn-esqueci").addEventListener("click", () => trocarModo("recuperar"));
  $("btn-voltar-entrar").addEventListener("click", () => trocarModo("entrar"));

  // Mostrar/ocultar a senha (vale para os dois campos de senha ao mesmo tempo).
  form.querySelector("[data-mostrar]").addEventListener("click", (ev) => {
    const mostrar = $("f-senha").type === "password";
    ["f-senha", "f-confirmar"].forEach((id) => { $(id).type = mostrar ? "text" : "password"; });
    ev.currentTarget.textContent = mostrar ? "Ocultar" : "Mostrar";
    ev.currentTarget.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
  });

  // Aviso de Caps Lock: a causa mais comum de "senha incorreta" que não é.
  ["f-senha", "f-confirmar"].forEach((id) => {
    $(id).addEventListener("keyup", (ev) => {
      if (typeof ev.getModifierState === "function") {
        form.querySelector("[data-caps]").classList.toggle("hidden", !ev.getModifierState("CapsLock"));
      }
    });
  });

  Sessao.saude()
    .then((s) => {
      pedeConvite = s.cadastro === "convite";
      trocarModo(modo);
    })
    .catch(() => avisar("Não foi possível falar com o servidor. Confira a internet e recarregue a página."));

  function ocupado(sim, texto) {
    btn.disabled = sim;
    form.querySelectorAll("input, button").forEach((i) => { if (i !== btn) i.disabled = sim; });
    btn.textContent = sim ? texto : ROTULO[modo];
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    erro.textContent = "";
    const email = $("f-email").value.trim();
    const senha = $("f-senha").value;
    const nome = $("f-nome").value.trim();
    const manter = $("f-manter").checked;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return (erro.textContent = "Informe um e-mail válido.");
    if (!senha) return (erro.textContent = modo === "entrar" ? "Informe a senha." : "Escolha uma senha nova.");
    if (modo === "criar" && !nome) return (erro.textContent = "Informe seu nome.");
    if (modo === "recuperar" && !$("f-codigo").value.trim()) return (erro.textContent = "Informe o código de recuperação.");

    try {
      let usuario;
      let codigoNovo = "";
      if (modo === "entrar") {
        ocupado(true, "Entrando…");
        usuario = await Sessao.entrar({ email, senha, manter });
      } else {
        ocupado(true, "Conferindo a senha…");
        const problema = await Sessao.problemaNaSenha(senha, $("f-confirmar").value);
        if (problema) {
          ocupado(false);
          erro.textContent = problema;
          return;
        }
        ocupado(true, "Protegendo sua senha…");
        const r = modo === "criar"
          ? await Sessao.cadastrar({ email, senha, manter, convite: $("f-convite").value.trim() })
          : await Sessao.recuperar({ email, senha, manter, codigo: $("f-codigo").value });
        usuario = r.usuario;
        codigoNovo = r.codigoRecuperacao;
      }

      // O código aparece antes de o painel abrir: é a única vez que ele existe em claro.
      if (codigoNovo) {
        await Nuvem.mostrarCodigoRecuperacao(codigoNovo, {
          introducao: modo === "criar"
            ? "Sua conta foi criada. Este código é o único jeito de redefinir a senha se você esquecê-la."
            : "Senha redefinida. O código antigo deixou de valer — guarde este, que é o novo.",
        });
      }

      ocupado(true, "Preparando seus dados…");
      await Nuvem.aposEntrar(usuario, { novaConta: modo === "criar", nome });
      location.replace(destino);
    } catch (e) {
      ocupado(false);
      if (e.status === 409 && modo === "criar") trocarModo("entrar");
      erro.textContent = e.message;
    }
  });

  if (params.get("modo") === "recuperar") trocarModo("recuperar");
  else trocarModo("entrar");
})();
