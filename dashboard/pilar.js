/* Página de uma aba criada pelo usuário. Mesma mecânica da aba Pessoal, mas
   com nome, ícone e cor próprios — e com a edição da própria aba aqui dentro. */

(() => {
  const { fmt } = UI;
  const CAMINHO = "pilares";
  const id = UI.parametro("id");

  let pilar = Store.achar(CAMINHO, id);

  if (!pilar) {
    UI.iniciarPagina("home");
    document.getElementById("conteudo").innerHTML = `<div class="card" style="margin-top:16px;"></div>`;
    document.querySelector(".card").appendChild(
      UI.vazio({
        icone: "◌",
        titulo: "Aba não encontrada",
        texto: "Pode ter sido excluída, ou este link é de outro navegador — os dados ficam salvos em cada navegador.",
        rotuloAcao: "Voltar à visão geral",
        aoAcionar: () => (location.href = "index.html"),
      })
    );
    return;
  }

  UI.iniciarPagina("pilar", { idAtivo: id });

  const itens = () => (Store.achar(CAMINHO, id) || {}).itens || [];
  const ehAcademia = () => pilar.modelo === "academia";

  /* --------------------------------- Render --------------------------------- */

  function render() {
    pilar = Store.achar(CAMINHO, id);
    if (!pilar) return (location.href = "index.html");

    document.title = `${pilar.nome} · ${UI.NOME}`;

    // A cor da aba é um hex do usuário, então entra como variável na página:
    // .card.tinted e .swatch já leem --tint.
    const raiz = document.getElementById("conteudo");
    raiz.style.setProperty("--tint", pilar.cor);

    const etiqueta = document.getElementById("etiqueta");
    etiqueta.textContent = `${pilar.icone} sua aba`;
    etiqueta.style.color = pilar.cor;
    document.getElementById("swatch-lista").style.background = pilar.cor;

    document.getElementById("titulo").textContent = pilar.nome;
    document.getElementById("subtitulo").textContent =
      pilar.descricao ||
      (ehAcademia()
        ? "Seus dias de treino, com carga, repetições e recorde de cada exercício."
        : "Cadastre aqui o que pertence a esta aba — entra na agenda da visão geral junto com os outros pilares.");

    const academia = ehAcademia();
    document.getElementById("bloco-stats").classList.toggle("hidden", academia);
    document.getElementById("secao-itens").classList.toggle("hidden", academia);
    document.getElementById("secao-academia").classList.toggle("hidden", !academia);
    document.getElementById("btn-item").classList.toggle("hidden", academia);
    document.getElementById("btn-campos").classList.toggle("hidden", academia);
    document.getElementById("btn-refazer-questionario").hidden = !academia;
    document.getElementById("btn-dia").classList.toggle("hidden", !(academia && pilar.academia?.configuradoEm));
    document.getElementById("nota-ajustes").textContent = academia
      ? "Esta aba foi criada por você. Renomeá-la, trocar ícone e cor, ou refazer o questionário não mexe nos dias já montados; excluí-la apaga também os dias e exercícios cadastrados."
      : "Esta aba foi criada por você. Renomeá-la, trocar ícone e cor, ou ajustar os campos não mexe no que já está cadastrado; excluí-la apaga também todos os itens dela.";

    if (academia) {
      document.getElementById("swatch-academia").style.background = pilar.cor;
      renderAcademia();
      UI.montarLayout("pilar", { idAtivo: id });
      return;
    }

    const todos = itens();
    const abertos = todos.filter((c) => !c.concluido);
    const atrasados = abertos.filter((c) => (UI.diasAte(c.data) ?? 0) < 0);
    const semana = abertos.filter((c) => {
      const d = UI.diasAte(c.data);
      return d !== null && d >= 0 && d <= 7;
    });

    document.getElementById("s-abertos").textContent = abertos.length;
    document.getElementById("s-abertos-d").textContent =
      `${todos.length} ${todos.length === 1 ? "registro no total" : "registros no total"}`;

    // Uma aba fora da agenda (hábitos, coleção…) não tem "esta semana" nem
    // "atrasado" — os mesmos dois cartões passam a mostrar concluídos e total.
    if (pilar.naAgenda) {
      document.getElementById("lbl-semana").textContent = "Nesta semana";
      document.getElementById("s-semana").textContent = semana.length;
      document.getElementById("s-semana-d").textContent = semana[0]
        ? `próximo: ${semana[0].descricao}`
        : "nada nos próximos 7 dias";

      document.getElementById("lbl-atrasados").textContent = "Atrasados";
      const elAtr = document.getElementById("s-atrasados");
      elAtr.textContent = atrasados.length;
      elAtr.className = `stat-value num ${atrasados.length ? "delta down" : ""}`;
      document.getElementById("s-atrasados-d").textContent =
        atrasados.length ? "vale reagendar ou concluir" : "nada atrasado";
    } else {
      const concluidos = todos.filter((c) => c.concluido).length;
      document.getElementById("lbl-semana").textContent = "Concluídos";
      document.getElementById("s-semana").textContent = concluidos;
      document.getElementById("s-semana-d").textContent =
        todos.length ? `${Math.round((concluidos / todos.length) * 100)}% do total` : "";

      document.getElementById("lbl-atrasados").textContent = "Total";
      const elAtr = document.getElementById("s-atrasados");
      elAtr.textContent = todos.length;
      elAtr.className = "stat-value num";
      document.getElementById("s-atrasados-d").textContent =
        todos.length === 1 ? "registro nesta aba" : "registros nesta aba";
    }

    renderLista(todos);
    UI.montarLayout("pilar", { idAtivo: id });
  }

  let verConcluidos = false;

  function renderLista(todos) {
    const box = document.getElementById("lista");
    box.innerHTML = "";
    const visiveis = todos
      .filter((c) => verConcluidos || !c.concluido)
      .sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999"));

    if (!visiveis.length) {
      box.appendChild(
        UI.vazio({
          icone: pilar.icone,
          titulo: todos.length ? "Nada em aberto" : `Nenhum item em ${pilar.nome} ainda`,
          texto: pilar.naAgenda
            ? "Cada item pode ter data e os campos que você configurar — e entra na agenda dos próximos 30 dias da visão geral."
            : "Cada item pode ter data e os campos que você configurar. Esta aba não entra na agenda.",
          rotuloAcao: "Adicionar item",
          aoAcionar: novoItem,
        })
      );
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list";
    visiveis.forEach((c) => {
      const u = UI.urgencia(c.data);
      const li = document.createElement("li");
      const badge = pilar.naAgenda
        ? `<span class="badge ${c.concluido ? "feito" : u.nivel}">${c.concluido ? "concluído" : u.rotulo}</span>`
        : c.concluido ? `<span class="badge feito">concluído</span>` : "";
      li.innerHTML = `
        <input type="checkbox" class="check" ${c.concluido ? "checked" : ""} aria-label="Marcar como concluído" />
        <span class="grow">
          <span class="title ${c.concluido ? "strike" : ""}">${fmt.escape(c.descricao)}</span>
          <span class="meta">${metaLista(c)}</span>
        </span>
        ${badge}
        <span class="row-actions">
          <button class="btn ghost sm" data-editar>Editar</button>
          <button class="btn ghost sm" data-excluir>Excluir</button>
        </span>`;
      li.querySelector("input").addEventListener("change", (ev) => {
        Store.subAtualizar(CAMINHO, id, "itens", c.id, { concluido: ev.target.checked });
        render();
      });
      li.querySelector("[data-editar]").addEventListener("click", () => editarItem(c));
      li.querySelector("[data-excluir]").addEventListener("click", () => excluirItem(c));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  /** Os campos próprios marcados "na lista", formatados, mais a data se houver. */
  function metaLista(c) {
    const partes = (pilar.campos || [])
      .filter((campo) => campo.naLista)
      .map((campo) => {
        const v = (c.extras || {})[campo.id];
        if (v === undefined || v === null || v === "") return "";
        if (campo.tipo === "simNao") return v ? campo.rotulo : "";
        if (campo.tipo === "dinheiro") return fmt.moeda(v);
        return String(v);
      })
      .filter(Boolean)
      .map(fmt.escape);
    if (c.data) partes.push(fmt.data(c.data));
    return partes.join(" · ") || "sem detalhes";
  }

  /* -------------------------------- Academia --------------------------------
     Modelo "academia": em vez de uma lista de itens com campos, a aba vira
     dias de treino, cada um com exercícios escolhidos do catálogo
     (exercicios.js). O Delfos nunca decide o que treinar — só guarda o que o
     usuário decidiu: carga atual, séries, repetições e recorde de cada
     exercício. Ver Store.ACADEMIA_* e sugerirDivisaoAcademia/diasSugeridosAcademia
     em store.js para a lógica (baseada em evidência) por trás da sugestão de
     divisão — o usuário sempre pode escolher outra coisa. */

  const dias = () => (Store.achar(CAMINHO, id) || {}).dias || [];

  const catalogoOpcoes = () =>
    [...EXERCICIOS]
      .sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"))
      .map((e) => ({ valor: e.id, rotulo: `${e.grupo} — ${e.nome}` }));

  const nomeExercicio = (exercicioId) => EXERCICIOS.find((e) => e.id === exercicioId)?.nome || "Exercício removido do catálogo";
  const grupoExercicio = (exercicioId) => EXERCICIOS.find((e) => e.id === exercicioId)?.grupo || "";

  function salvarDias(novosDias) {
    Store.atualizar(CAMINHO, id, { dias: novosDias });
    render();
  }

  function renderAcademia() {
    const box = document.getElementById("academia-conteudo");
    box.innerHTML = "";

    if (!pilar.academia?.configuradoEm) {
      box.appendChild(
        UI.vazio({
          icone: pilar.icone,
          titulo: "Antes de começar",
          texto: "Um questionário rápido — objetivo, experiência e frequência semanal — só para sugerir como organizar seus dias de treino. Você monta o que entra em cada um, escolhendo do catálogo de exercícios.",
          rotuloAcao: "Começar",
          aoAcionar: () => abrirQuestionario({ primeiraVez: true }),
        })
      );
      return;
    }

    const lista = dias();
    if (!lista.length) {
      box.appendChild(
        UI.vazio({
          icone: pilar.icone,
          titulo: "Nenhum dia de treino ainda",
          texto: "Crie um dia (ex.: \"Peito e tríceps\") e adicione os exercícios que você faz nele.",
          rotuloAcao: "+ Dia de treino",
          aoAcionar: abrirNovoDia,
        })
      );
      return;
    }

    lista.forEach((dia) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.marginBottom = "12px";
      card.innerHTML = `
        <div class="card-head">
          <h3 class="card-title">${fmt.escape(dia.nome)}</h3>
          <span class="row-actions" style="opacity:1;">
            <button class="btn ghost sm" data-renomear>Renomear</button>
            <button class="btn ghost sm" data-excluir-dia>Excluir dia</button>
          </span>
        </div>
        <div data-lista-exercicios></div>
        <button class="btn ghost sm" data-add-exercicio style="margin-top:10px;">+ Exercício</button>`;

      const listaEx = card.querySelector("[data-lista-exercicios]");
      if (!dia.exercicios.length) {
        listaEx.innerHTML = `<p class="card-note" style="margin:6px 0 0;">Nenhum exercício ainda.</p>`;
      } else {
        const ul = document.createElement("ul");
        ul.className = "list";
        dia.exercicios.forEach((ex) => {
          const li = document.createElement("li");
          const partes = [];
          if (ex.seriesAtual || ex.repeticoesAtual) {
            partes.push(`${ex.seriesAtual || "—"}x${ex.repeticoesAtual || "—"}`);
          }
          if (ex.cargaAtual !== null && ex.cargaAtual !== undefined) partes.push(`carga atual: ${ex.cargaAtual}${ex.unidade}`);
          if (ex.recorde !== null && ex.recorde !== undefined) partes.push(`recorde: ${ex.recorde}${ex.unidade}`);
          li.innerHTML = `
            <span class="grow">
              <span class="title">${fmt.escape(nomeExercicio(ex.exercicioId))}</span>
              <span class="meta">${fmt.escape(grupoExercicio(ex.exercicioId))}${partes.length ? " · " + fmt.escape(partes.join(" · ")) : ""}</span>
            </span>
            <span class="row-actions">
              <button class="btn ghost sm" data-editar-ex>Editar</button>
              <button class="btn ghost sm" data-excluir-ex>Excluir</button>
            </span>`;
          li.querySelector("[data-editar-ex]").addEventListener("click", () => abrirExercicioForm(dia, ex));
          li.querySelector("[data-excluir-ex]").addEventListener("click", () => excluirExercicio(dia, ex));
          ul.appendChild(li);
        });
        listaEx.appendChild(ul);
      }

      card.querySelector("[data-renomear]").addEventListener("click", () => renomearDia(dia));
      card.querySelector("[data-excluir-dia]").addEventListener("click", () => excluirDia(dia));
      card.querySelector("[data-add-exercicio]").addEventListener("click", () => abrirExercicioForm(dia));
      box.appendChild(card);
    });
  }

  /**
   * Objetivo + experiência + frequência decidem uma sugestão de divisão
   * (Store.sugerirDivisaoAcademia) — o segundo passo mostra essa sugestão já
   * marcada, mas o usuário pode trocar por qualquer outra. Na primeira vez,
   * confirmar também cria os dias sugeridos para aquela divisão
   * (Store.diasSugeridosAcademia); refazer o questionário depois só atualiza
   * objetivo/experiência/divisão — os dias já criados não são tocados, o
   * usuário quem adiciona, renomeia ou apaga pela tela normal.
   */
  async function abrirQuestionario({ primeiraVez }) {
    const atual = pilar.academia || {};
    const passo1 = await UI.formulario({
      titulo: primeiraVez ? "Antes de começar" : "Refazer o questionário",
      descricao: "Isso não prescreve treino nenhum — só ajuda a sugerir como organizar seus dias. O que entra em cada um é você quem escolhe, do catálogo de exercícios.",
      campos: [
        { nome: "objetivo", rotulo: "Objetivo principal", tipo: "select", opcoes: Store.ACADEMIA_OBJETIVOS, obrigatorio: true },
        { nome: "experiencia", rotulo: "Experiência com treino", tipo: "select", opcoes: Store.ACADEMIA_EXPERIENCIAS, obrigatorio: true },
        {
          nome: "frequenciaSemanal", rotulo: "Quantos dias por semana você treina", tipo: "select", obrigatorio: true,
          opcoes: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ valor: String(n), rotulo: `${n} ${n === 1 ? "dia" : "dias"} por semana` })),
        },
      ],
      valores: atual,
      rotuloConfirmar: "Continuar",
    });
    if (!passo1) return;

    const frequenciaSemanal = Number(passo1.frequenciaSemanal);
    const sugestao = Store.sugerirDivisaoAcademia(frequenciaSemanal);

    const passo2 = await UI.formulario({
      titulo: "Como você organiza o treino",
      descricao: "Treinar cada grupo muscular umas duas vezes por semana costuma render mais do que uma vez só, com o mesmo volume total — por isso a sugestão abaixo. Mas a divisão que você já usa e gosta também é uma escolha válida.",
      campos: [
        { nome: "divisao", rotulo: "Divisão de treino", tipo: "select", opcoes: Store.ACADEMIA_DIVISOES, valorPadrao: sugestao, obrigatorio: true },
      ],
      rotuloConfirmar: primeiraVez ? "Criar meus dias" : "Salvar",
    });
    if (!passo2) return;

    const academia = {
      configuradoEm: atual.configuradoEm || new Date().toISOString(),
      objetivo: passo1.objetivo,
      experiencia: passo1.experiencia,
      frequenciaSemanal,
      divisao: passo2.divisao,
    };

    const patch = { academia };
    if (primeiraVez) {
      patch.dias = Store.diasSugeridosAcademia(passo2.divisao, frequenciaSemanal)
        .map((nome) => ({ id: Store.uid("dia"), nome, exercicios: [] }));
    }
    Store.atualizar(CAMINHO, id, patch);
    UI.toast(primeiraVez ? "Pronto — agora monte seus dias com exercícios do catálogo." : "Questionário atualizado.");
    render();
  }

  async function abrirNovoDia() {
    const v = await UI.formulario({
      titulo: "Novo dia de treino",
      campos: [{ nome: "nome", rotulo: "Nome do dia", tipo: "text", obrigatorio: true, placeholder: "Ex.: Peito e tríceps" }],
    });
    if (!v) return;
    salvarDias([...dias(), { id: Store.uid("dia"), nome: v.nome, exercicios: [] }]);
  }

  async function renomearDia(dia) {
    const v = await UI.formulario({
      titulo: "Renomear dia",
      campos: [{ nome: "nome", rotulo: "Nome do dia", tipo: "text", obrigatorio: true }],
      valores: dia,
    });
    if (!v) return;
    salvarDias(dias().map((d) => (d.id === dia.id ? { ...d, nome: v.nome } : d)));
  }

  async function excluirDia(dia) {
    const ok = await UI.confirmar({
      titulo: `Excluir o dia "${dia.nome}"?`,
      descricao: dia.exercicios.length
        ? `Os ${dia.exercicios.length} exercícios cadastrados nele também somem.`
        : "Este dia não tem exercícios cadastrados.",
      rotuloConfirmar: "Excluir dia",
      perigo: true,
    });
    if (!ok) return;
    salvarDias(dias().filter((d) => d.id !== dia.id));
  }

  async function abrirExercicioForm(dia, exercicioExistente) {
    const editando = !!exercicioExistente;
    const campos = [
      ...(editando ? [] : [{ nome: "exercicioId", rotulo: "Exercício", tipo: "select", opcoes: catalogoOpcoes(), obrigatorio: true }]),
      { nome: "cargaAtual", rotulo: "Carga atual", tipo: "number", step: "0.5", placeholder: "Ex.: 40" },
      { nome: "unidade", rotulo: "Unidade", tipo: "select", opcoes: ["kg", "lb"] },
      { nome: "seriesAtual", rotulo: "Séries", tipo: "number", placeholder: "Ex.: 4" },
      { nome: "repeticoesAtual", rotulo: "Repetições por série", tipo: "number", placeholder: "Ex.: 10" },
      { nome: "recorde", rotulo: "Recorde pessoal", tipo: "number", step: "0.5", dica: "Deixe em branco pra começar igual à carga atual." },
    ];
    const v = await UI.formulario({
      titulo: editando ? `Editar "${nomeExercicio(exercicioExistente.exercicioId)}"` : "Adicionar exercício",
      campos,
      valores: exercicioExistente || { unidade: "kg" },
    });
    if (!v) return;

    const cargaAtual = v.cargaAtual;
    const recordeAnterior = exercicioExistente?.recorde ?? null;
    let recorde = v.recorde;
    if (recorde === null && cargaAtual !== null) recorde = cargaAtual; // sem recorde informado, começa igual à carga atual
    const bateuRecorde = cargaAtual !== null && recordeAnterior !== null && cargaAtual > recordeAnterior;
    if (bateuRecorde) recorde = cargaAtual;

    const dados = {
      exercicioId: editando ? exercicioExistente.exercicioId : v.exercicioId,
      cargaAtual,
      unidade: v.unidade || "kg",
      seriesAtual: v.seriesAtual,
      repeticoesAtual: v.repeticoesAtual,
      recorde,
    };

    const novosDias = dias().map((d) => {
      if (d.id !== dia.id) return d;
      const exercicios = editando
        ? d.exercicios.map((e) => (e.id === exercicioExistente.id ? { ...dados, id: e.id } : e))
        : [...d.exercicios, { ...dados, id: Store.uid("ex") }];
      return { ...d, exercicios };
    });
    salvarDias(novosDias);
    if (bateuRecorde) UI.toast("Novo recorde pessoal!");
  }

  function excluirExercicio(dia, exercicio) {
    const antes = dias();
    salvarDias(dias().map((d) => (d.id === dia.id ? { ...d, exercicios: d.exercicios.filter((e) => e.id !== exercicio.id) } : d)));
    UI.toast("Exercício removido do dia.", {
      acaoRotulo: "Desfazer",
      aoAcionar: () => salvarDias(antes),
    });
  }

  /* --------------------------------- Ações ---------------------------------- */

  // descricao e data são campos de sistema — o resto vem dos campos próprios
  // da aba (modelo escolhido na criação, ajustáveis em "Campos desta aba").
  const camposItem = () => [
    { nome: "descricao", rotulo: "O que é", tipo: "text", obrigatorio: true, placeholder: `Ex.: algo de ${pilar.nome}` },
    { nome: "data", rotulo: pilar.naAgenda ? "Data" : "Data (opcional)", tipo: "date", obrigatorio: !!pilar.naAgenda, valorPadrao: UI.hojeISO() },
    ...UI.camposItemPilar(pilar),
  ];

  // Separa descricao/data (sistema) do resto (extras), nos dois sentidos.
  const paraExtras = (v) => {
    const { descricao, data, ...resto } = v;
    return { descricao, data, extras: resto };
  };
  const deExtras = (c) => ({ descricao: c.descricao, data: c.data, ...(c.extras || {}) });

  async function novoItem() {
    const v = await UI.formulario({ titulo: `Novo item em ${pilar.nome}`, campos: camposItem() });
    if (!v) return;
    Store.subInserir(CAMINHO, id, "itens", { ...paraExtras(v), concluido: false });
    UI.toast("Item cadastrado.");
    render();
  }

  async function editarItem(c) {
    const v = await UI.formulario({ titulo: "Editar item", campos: camposItem(), valores: deExtras(c) });
    if (!v) return;
    Store.subAtualizar(CAMINHO, id, "itens", c.id, paraExtras(v));
    UI.toast("Item atualizado.");
    render();
  }

  function excluirItem(c) {
    const antes = [...itens()];
    Store.subRemover(CAMINHO, id, "itens", c.id);
    render();
    UI.toast("Item excluído.", {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.atualizar(CAMINHO, id, { itens: antes }); render(); },
    });
  }

  async function editarAba() {
    const v = await UI.formulario({
      titulo: "Editar aba",
      descricao: "Nome, ícone e cor mudam só a aparência — o que você já cadastrou continua onde está.",
      campos: UI.camposPilar(),
      valores: pilar,
    });
    if (!v) return;
    Store.atualizar(CAMINHO, id, v);
    UI.toast("Aba atualizada.");
    render();
  }

  async function excluirAba() {
    const quantos = ehAcademia()
      ? dias().reduce((n, d) => n + d.exercicios.length, 0)
      : itens().length;
    const rotuloItem = ehAcademia() ? "exercício cadastrado" : "item cadastrado";
    const rotuloItens = ehAcademia() ? "exercícios cadastrados" : "itens cadastrados";
    const ok = await UI.confirmar({
      titulo: `Excluir a aba "${pilar.nome}"?`,
      descricao: quantos
        ? `Os ${quantos} ${quantos === 1 ? rotuloItem : rotuloItens} nela também serão apagados. Isso não pode ser desfeito depois que você sair da página.`
        : "A aba some da barra lateral. Você pode criar outra a qualquer momento.",
      rotuloConfirmar: "Excluir aba",
      perigo: true,
    });
    if (!ok) return;
    Store.remover(CAMINHO, id);
    location.href = "index.html";
  }

  document.getElementById("btn-item").addEventListener("click", novoItem);
  document.getElementById("btn-editar-aba").addEventListener("click", editarAba);
  document.getElementById("btn-editar-aba-2").addEventListener("click", editarAba);
  document.getElementById("btn-campos").addEventListener("click", async () => {
    await UI.editorCampos(pilar.id);
    render();
  });
  document.getElementById("btn-excluir-aba").addEventListener("click", excluirAba);
  document.getElementById("btn-dia").addEventListener("click", abrirNovoDia);
  document.getElementById("btn-refazer-questionario").addEventListener("click", () => abrirQuestionario({ primeiraVez: false }));
  document.getElementById("f-concluidos").addEventListener("change", (ev) => {
    verConcluidos = ev.target.checked;
    render();
  });

  render();
})();
