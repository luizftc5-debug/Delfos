/* Assistente de boas-vindas — roda na primeira abertura (perfil.configuradoEm
   vazio) e pode ser reaberto pelo perfil ("Refazer configuração inicial").
   Página sem barra lateral: não chama UI.iniciarPagina, para não entrar em
   loop com o redirecionamento que ela própria faz para cá. */

(() => {
  const { fmt } = UI;

  const FRASES = [
    "Antes de começar, me conta: quem é você?",
    "E o que ocupa os seus dias?",
    "Agora escolha o que vale a pena acompanhar aqui.",
    "Quase lá — só os últimos ajustes.",
  ];

  const primeiraVez = !Store.estado().perfil.configuradoEm;

  let passoAtual = 1;
  let fotoAtual = "";
  let tipoOcupacao = "";
  let abasInicializadas = false;

  const abas = {};
  Personalizacao.abasFixas().forEach((a) => { abas[a.id] = { ativo: a.ativo, rotulo: a.rotulo }; });

  // Pontos de partida opcionais, oferecidos só na primeira configuração — o
  // nome é editável na hora (é assim que "Esporte" vira "Corrida", por
  // exemplo). Reabrir pelo perfil não repete a oferta, para não arriscar
  // criar de novo uma aba que o usuário já tenha apagado por não querer.
  const SUGESTOES_PILAR = [
    { id: "academia", nome: "Academia", icone: "⚡", cor: "#6e8f22", modelo: "academia" },
    { id: "religiao", nome: "Religião", icone: "☾", cor: "#5a4fd4", modelo: "compromissos" },
    { id: "esporte", nome: "Esporte", icone: "★", cor: "#b57d0a", modelo: "habitos" },
  ];
  const sugestoes = {};
  SUGESTOES_PILAR.forEach((s) => { sugestoes[s.id] = { ativo: false, nome: s.nome }; });

  /* ------------------------------ Preencher --------------------------------
     Reabrir pelo perfil ("Refazer configuração") já traz o que existe. */

  function preencher() {
    const p = Store.estado().perfil;
    document.getElementById("f-nome").value = p.nome || "";
    document.getElementById("f-nascimento").value = p.dataNascimento || "";
    document.getElementById("f-cidade").value = p.cidade || "";
    document.getElementById("f-pronomes").value = p.pronomes || "";
    document.getElementById("f-ocupacao").value = p.ocupacao || "";
    document.getElementById("f-curso").value = p.curso || "";
    document.getElementById("f-semestre").value = p.semestre || "";
    document.getElementById("f-instituicao").value = p.instituicao || "";
    document.getElementById("f-objetivos").value = p.objetivos || "";
    fotoAtual = p.foto || "";
    tipoOcupacao = p.tipoOcupacao || "";

    document.querySelectorAll("#seg-tipo button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.valor === tipoOcupacao));
    });
    document.getElementById("bloco-academico").classList.toggle("hidden", !(tipoOcupacao === "estudo" || tipoOcupacao === "ambos"));

    const temaAtual = UI.tema.atual();
    document.querySelectorAll("#seg-tema button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.valor === temaAtual));
    });

    atualizarAvatar();
  }

  function atualizarAvatar() {
    const el = document.getElementById("avatar-preview");
    if (fotoAtual) {
      el.innerHTML = `<img src="${fmt.escape(fotoAtual)}" alt="Foto de perfil" />`;
    } else {
      el.textContent = UI.iniciais(document.getElementById("f-nome").value) || "•";
    }
  }

  /* -------------------------------- Passos ---------------------------------- */

  function render() {
    for (let i = 1; i <= 4; i++) {
      document.getElementById(`passo-${i}`).classList.toggle("hidden", i !== passoAtual);
    }
    document.getElementById("progresso").innerHTML = [1, 2, 3, 4]
      .map((i) => `<span class="${i < passoAtual ? "feito" : i === passoAtual ? "ativo" : ""}"></span>`)
      .join("");
    document.getElementById("frase").textContent = FRASES[passoAtual - 1];
    document.getElementById("btn-voltar").classList.toggle("hidden", passoAtual === 1);
    document.getElementById("btn-avancar").textContent = passoAtual === 4 ? "Entrar no Delfos" : "Continuar";

    if (passoAtual === 3) renderAbas();
    if (passoAtual === 4) renderResumo();
  }

  function ir(passo) {
    passoAtual = passo;
    render();
  }

  function renderAbas() {
    // Só ajusta a pré-marcação sozinho na primeira configuração, e só uma
    // vez — depois disso é o usuário quem decide, mesmo se voltar e trocar
    // a ocupação de novo.
    if (primeiraVez && !abasInicializadas) {
      const sugestao = Personalizacao.sugerirAbas(tipoOcupacao);
      Object.keys(abas).forEach((id) => { abas[id].ativo = sugestao[id]; });
      abasInicializadas = true;
    }

    const ul = document.getElementById("lista-abas");
    ul.innerHTML = Object.keys(abas).map((id) => `
      <li>
        <input type="checkbox" class="check" data-toggle="${id}" ${abas[id].ativo ? "checked" : ""}
               aria-label="Incluir aba ${fmt.escape(Personalizacao.ROTULOS_PADRAO[id])}" />
        <span class="grow">
          <input type="text" class="assistente-aba-nome" data-nome="${id}"
                 value="${fmt.escape(abas[id].rotulo)}" ${abas[id].ativo ? "" : "disabled"} />
        </span>
      </li>`).join("");

    ul.querySelectorAll("[data-toggle]").forEach((chk) => {
      chk.addEventListener("change", () => {
        const id = chk.dataset.toggle;
        abas[id].ativo = chk.checked;
        ul.querySelector(`[data-nome="${id}"]`).disabled = !chk.checked;
      });
    });
    ul.querySelectorAll("[data-nome]").forEach((inp) => {
      inp.addEventListener("input", () => { abas[inp.dataset.nome].rotulo = inp.value; });
    });

    renderSugestoes();
  }

  function renderSugestoes() {
    const bloco = document.getElementById("bloco-sugestoes");
    bloco.classList.toggle("hidden", !primeiraVez);
    if (!primeiraVez) return;

    const ul = document.getElementById("lista-sugestoes");
    ul.innerHTML = SUGESTOES_PILAR.map((s) => `
      <li>
        <input type="checkbox" class="check" data-toggle-sugestao="${s.id}" ${sugestoes[s.id].ativo ? "checked" : ""}
               aria-label="Criar aba ${fmt.escape(s.nome)}" />
        <span class="grow">
          <input type="text" class="assistente-aba-nome" data-nome-sugestao="${s.id}"
                 value="${fmt.escape(sugestoes[s.id].nome)}" ${sugestoes[s.id].ativo ? "" : "disabled"} />
        </span>
      </li>`).join("");

    ul.querySelectorAll("[data-toggle-sugestao]").forEach((chk) => {
      chk.addEventListener("change", () => {
        const id = chk.dataset.toggleSugestao;
        sugestoes[id].ativo = chk.checked;
        ul.querySelector(`[data-nome-sugestao="${id}"]`).disabled = !chk.checked;
      });
    });
    ul.querySelectorAll("[data-nome-sugestao]").forEach((inp) => {
      inp.addEventListener("input", () => { sugestoes[inp.dataset.nomeSugestao].nome = inp.value; });
    });
  }

  function renderResumo() {
    const nome = document.getElementById("f-nome").value.trim() || "—";
    const ocupacao = document.getElementById("f-ocupacao").value.trim();
    const ativos = Object.values(abas).filter((a) => a.ativo).map((a) => a.rotulo || "—");
    const novasAbas = SUGESTOES_PILAR.filter((s) => sugestoes[s.id].ativo).map((s) => sugestoes[s.id].nome.trim() || s.nome);

    document.getElementById("resumo").innerHTML = `
      <dl>
        <dt>Nome</dt><dd>${fmt.escape(nome)}</dd>
        ${ocupacao ? `<dt>Ocupação</dt><dd>${fmt.escape(ocupacao)}</dd>` : ""}
        <dt>Abas ligadas</dt><dd>${ativos.length ? fmt.escape(ativos.join(", ")) : "nenhuma"}</dd>
        ${novasAbas.length ? `<dt>Abas novas</dt><dd>${fmt.escape(novasAbas.join(", "))}</dd>` : ""}
      </dl>`;
  }

  /* -------------------------------- Ações ---------------------------------- */

  document.getElementById("btn-foto").addEventListener("click", () => document.getElementById("f-foto").click());
  document.getElementById("f-foto").addEventListener("change", async (ev) => {
    const arquivo = ev.target.files[0];
    if (!arquivo) return;
    try {
      fotoAtual = await UI.redimensionarFoto(arquivo);
      atualizarAvatar();
    } catch (err) {
      UI.toast(err.message);
    }
  });
  document.getElementById("f-nome").addEventListener("input", () => { if (!fotoAtual) atualizarAvatar(); });

  document.getElementById("seg-tipo").addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    tipoOcupacao = b.dataset.valor;
    document.querySelectorAll("#seg-tipo button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    document.getElementById("bloco-academico").classList.toggle("hidden", !(tipoOcupacao === "estudo" || tipoOcupacao === "ambos"));
  });

  document.getElementById("seg-tema").addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    UI.tema.definir(b.dataset.valor);
    document.querySelectorAll("#seg-tema button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });

  document.getElementById("btn-pular").addEventListener("click", () => {
    Personalizacao.pular();
    location.href = "index.html";
  });

  document.getElementById("btn-voltar").addEventListener("click", () => { if (passoAtual > 1) ir(passoAtual - 1); });

  document.getElementById("btn-avancar").addEventListener("click", () => {
    if (passoAtual === 1) {
      const nome = document.getElementById("f-nome").value.trim();
      if (!nome) { UI.toast("Diga ao menos seu nome para continuar."); return; }
    }
    if (passoAtual < 4) return ir(passoAtual + 1);
    concluir();
  });

  function concluir() {
    const dadosPerfil = {
      nome: document.getElementById("f-nome").value.trim(),
      dataNascimento: document.getElementById("f-nascimento").value,
      cidade: document.getElementById("f-cidade").value.trim(),
      pronomes: document.getElementById("f-pronomes").value.trim(),
      foto: fotoAtual,
      ocupacao: document.getElementById("f-ocupacao").value.trim(),
      tipoOcupacao,
      curso: document.getElementById("f-curso").value.trim(),
      instituicao: document.getElementById("f-instituicao").value.trim(),
      semestre: document.getElementById("f-semestre").value.trim(),
      objetivos: document.getElementById("f-objetivos").value.trim(),
    };

    // Rótulo igual ao padrão não conta como escolha do usuário — fica vazio,
    // para continuar seguindo o padrão se ele mudar no futuro.
    const abasFixas = {};
    Object.keys(abas).forEach((id) => {
      abasFixas[id] = {
        ativo: abas[id].ativo,
        rotulo: abas[id].rotulo === Personalizacao.ROTULOS_PADRAO[id] ? "" : abas[id].rotulo,
      };
    });

    Personalizacao.concluir({ perfil: dadosPerfil, abasFixas });

    // Cria de fato as abas sob medida que o usuário marcou nas sugestões.
    SUGESTOES_PILAR.forEach((s) => {
      if (!sugestoes[s.id].ativo) return;
      const modelo = Store.MODELOS_PILAR.find((m) => m.id === s.modelo);
      Store.inserir("pilares", {
        nome: sugestoes[s.id].nome.trim() || s.nome,
        icone: s.icone,
        cor: s.cor,
        descricao: "",
        modelo: modelo.id,
        campos: modelo.campos.map((c) => ({ ...c })),
        naAgenda: modelo.naAgenda,
        itens: [],
        ...(modelo.especial === "academia"
          ? { academia: { configuradoEm: "", objetivo: "", experiencia: "", frequenciaSemanal: 0, divisao: "" }, dias: [] }
          : {}),
      });
    });

    location.href = "index.html";
  }

  preencher();
  render();
})();
