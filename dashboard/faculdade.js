/* Faculdade — disciplinas (cada uma com página própria), provas e entregas. */

(() => {
  UI.iniciarPagina("faculdade");

  const { fmt } = UI;
  let verConcluidos = false;

  const disciplinas = () => Store.lista("faculdade.disciplinas");
  const prazos = () => Store.lista("faculdade.prazos");
  const linkDisciplina = (d) => `disciplina.html?id=${encodeURIComponent(d.id)}`;

  /* --------------------------------- Render --------------------------------- */

  function render() {
    const ativas = disciplinas().filter((d) => d.status !== "concluída");
    const abertos = prazos().filter((p) => !p.concluido);
    const atrasados = abertos.filter((p) => (UI.diasAte(p.data) ?? 0) < 0);

    document.getElementById("s-disciplinas").textContent = ativas.length;

    const medias = disciplinas().map(UI.mediaDisciplina).filter(Boolean);
    document.getElementById("s-disciplinas-d").textContent = medias.length
      ? `Média geral: ${UI.fmt.decimal(medias.reduce((s, m) => s + m.media, 0) / medias.length)}`
      : "Nenhuma nota lançada ainda";

    document.getElementById("s-prazos").textContent = abertos.length;
    const dPrazos = document.getElementById("s-prazos-d");
    dPrazos.textContent = atrasados.length ? `${atrasados.length} já ${atrasados.length === 1 ? "venceu" : "venceram"}` : "Nenhum atrasado";
    dPrazos.className = `stat-sub ${atrasados.length ? "delta down" : ""}`;

    const prox = UI.compromissos().filter((i) => i.area === "faculdade" && i.tipo !== "aula" && (UI.diasAte(i.data) ?? -1) >= 0)[0];
    document.getElementById("s-proxima").textContent = prox ? prox.titulo : "Nada agendado";
    document.getElementById("s-proxima-d").innerHTML = prox
      ? `${fmt.data(prox.data)}, <span class="delta flat">${UI.urgencia(prox.data).rotulo}</span>`
      : "Cadastre provas e entregas para acompanhar";

    const L = Leituras.faculdade();
    document.getElementById("leitura").innerHTML = L.frase;
    const perfil = Store.estado().perfil || {};
    document.getElementById("sub-faculdade").textContent = perfil.curso
      ? `${perfil.curso}${perfil.instituicao ? `, ${perfil.instituicao}` : ""}: disciplinas, provas, entregas e TCC.`
      : "Disciplinas, provas, entregas e TCC.";
    renderSemanas(L);
    renderMedias(L);
    UI.renderNotas(document.getElementById("notas"), L.notas, L.ativas.length
      ? "Nada fora do comum. Com avaliações e notas cadastradas, o Delfos avisa onde a média aperta."
      : "Quando houver disciplinas e avaliações, o Delfos aponta aqui o que merece atenção.");
    UI.renderPerguntas(document.getElementById("sec-perguntas"), document.getElementById("perguntas"), "faculdade", perguntas(L), render);

    renderDisciplinas();
    renderPrazos();
    UI.montarLayout("faculdade");
  }

  function renderSemanas(L) {
    const box = document.getElementById("semanas");
    const total = L.semanas.reduce((t, s) => t + s.itens.length, 0);
    const desta = L.semanas[0]?.itens || [];
    document.getElementById("semanas-resumo").innerHTML = total
      ? `${total === 1 ? "1 prova ou entrega" : `${total} provas e entregas`} em quatro semanas${desta.length ? `; esta semana: <b>${fmt.escape(desta[0].titulo)}</b>${desta.length > 1 ? ` e mais ${desta.length - 1}` : ""}` : "; esta semana está livre"}`
      : "Nada nas próximas quatro semanas";
    const rotulos = ["Esta semana", "A seguinte", "Em 2 semanas", "Em 3 semanas"];
    box.innerHTML = L.semanas.map((s, i) => {
      const fim = new Date(s.chave + "T00:00:00");
      fim.setDate(fim.getDate() + 6);
      const fimIso = `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, "0")}-${String(fim.getDate()).padStart(2, "0")}`;
      return `
        <div class="semana ${i === 0 ? "agora" : ""}">
          <div class="semana-titulo">${rotulos[i]} <span>${fmt.dataCurta(s.chave)} a ${fmt.dataCurta(fimIso)}</span></div>
          ${s.itens.length ? s.itens.map((it) => `
            <${it.href ? `a href="${fmt.escape(it.href)}"` : "div"} class="semana-item ${it.tipo === "prova" ? "prova" : ""}">
              <span class="t">${fmt.escape(it.titulo)}</span>
              <span class="m">${fmt.escape(it.sub)}, ${fmt.escape(UI.urgencia(it.data).rotulo)}</span>
            </${it.href ? "a" : "div"}>`).join("") : `<span class="semana-vazia">Livre</span>`}
        </div>`;
    }).join("");
  }

  function renderMedias(L) {
    const box = document.getElementById("medias");
    const comDados = L.porDisciplina.filter((x) => x.media || x.nec);
    const minima = Number(Store.estado().preferencias.faculdade?.mediaMinima) || 7;
    const notas = comDados.filter((x) => x.media);
    const risco = comDados.filter((x) => x.nec?.situacao === "impossivel").length;
    document.getElementById("medias-nota").innerHTML = comDados.length
      ? `${notas.length === 1 ? "1 disciplina com nota" : `${notas.length} disciplinas com nota`}; mínima ${fmt.decimal(minima)}${risco ? `; <span class="alerta">${risco === 1 ? "1 não fecha" : `${risco} não fecham`}</span>` : ""}`
      : "Sem notas lançadas ainda";
    if (!comDados.length) {
      box.innerHTML = `<p class="card-note" style="margin:0;">Lance as notas das avaliações dentro de cada disciplina e as médias aparecem aqui, com a mínima marcada.</p>`;
      return;
    }
    UI.barrasComMeta(box, comDados.map((x) => {
      const min = x.nec?.minima || minima;
      const partes = [];
      if (x.media) partes.push(`<span>${x.media.quantidade} ${x.media.quantidade === 1 ? "nota lançada" : "notas lançadas"}</span>`);
      else partes.push("<span>sem nota ainda</span>");
      if (x.nec?.situacao === "possivel") partes.push(`<span>precisa de ${fmt.decimal(x.nec.precisa)} nas que faltam</span>`);
      if (x.nec?.situacao === "impossivel") partes.push(`<span class="down">não fecha em ${fmt.decimal(min)}</span>`);
      if (x.nec?.situacao === "garantida") partes.push(`<span class="up">garantida</span>`);
      return {
        nome: x.d.nome, href: `disciplina.html?id=${encodeURIComponent(x.d.id)}`,
        valor: x.media ? x.media.media : 0, meta: min, acima: x.media && x.media.media < min,
        sub: partes.join(""),
      };
    }), { cor: "var(--s-faculdade)", formatar: (v) => (v ? fmt.decimal(v) : "-"), rotuloMeta: "média mínima", escala: 10 });
  }

  /* ------------------------------ Perguntas ------------------------------- */

  function perguntas(L) {
    const prefs = Store.estado().preferencias.faculdade || {};
    const q = [];
    const feito = (msg) => { UI.toast(msg); render(); };
    if (!L.ativas.length) return q;

    if (prefs.mediaMinima === null || prefs.mediaMinima === undefined) {
      q.push({
        id: "mediaMinima",
        texto: "Qual é a média para passar na sua faculdade?",
        apoio: "O Delfos usa esse número para dizer quanto você precisa tirar em cada disciplina (a menos que a disciplina tenha a própria mínima).",
        controle: () => UI.resposta.botoes([5, 6, 7].map((n) => [`${n},0`, () => { Store.definirPreferencias({ faculdade: { mediaMinima: n } }); feito(`Média mínima ${n},0.`); }, n === 7])),
      });
    }
    L.semData.slice(0, 1).forEach((a) => {
      q.push({
        id: `semData:${a.id}`,
        texto: `Quando é ${a.nome || "a avaliação"} de ${a.disciplina.nome}?`,
        apoio: "Com data, ela entra na agenda, nas semanas acima e no cálculo de quanto estudar.",
        controle: () => UI.resposta.valor({ data: true, rotulo: "Marcar data", aoSalvar: (v) => {
          Store.subAtualizar("faculdade.disciplinas", a.disciplina.id, "avaliacoes", a.id, { data: v });
          feito("Data marcada.");
        } }),
      });
    });
    if (prefs.horasEstudo === null || prefs.horasEstudo === undefined) {
      q.push({
        id: "horasEstudo",
        texto: "Quantas horas por semana você quer estudar fora da aula?",
        apoio: "Com esse número, o Delfos divide o tempo entre as provas que estão chegando.",
        controle: () => UI.resposta.valor({ sugestao: 10, rotulo: "Salvar", passo: "1", min: 1, max: 80, sufixo: "h", aoSalvar: (v) => { Store.definirPreferencias({ faculdade: { horasEstudo: Math.round(v) } }); feito(`${Math.round(v)} h por semana.`); } }),
      });
    }
    const semAval = L.ativas.filter((d) => !(d.avaliacoes || []).length)[0];
    if (semAval) {
      q.push({
        id: `semAvaliacoes:${semAval.id}`,
        texto: `Como vai ser a avaliação de ${semAval.nome}?`,
        apoio: "Cadastre provas e trabalhos com peso; quando a nota sair, a média e o quanto falta se calculam sozinhos.",
        controle: () => UI.resposta.botoes([["Cadastrar avaliações", () => { location.href = `disciplina.html?id=${encodeURIComponent(semAval.id)}`; }, true]]),
      });
    }
    return q;
  }

  function renderDisciplinas() {
    const box = document.getElementById("disciplinas");
    box.innerHTML = "";
    const lista = disciplinas();
    document.getElementById("disciplinas-resumo").textContent = lista.length
      ? `${lista.length === 1 ? "1 disciplina" : `${lista.length} disciplinas`}: ${lista.map((d) => d.nome).join(", ").replace(/, ([^,]*)$/, " e $1")}`
      : "Nenhuma cadastrada";

    if (!lista.length) {
      box.appendChild(
        UI.vazio({
          icone: "▤",
          titulo: "Nenhuma disciplina cadastrada",
          texto: "Cada disciplina ganha uma página própria, com avaliações, prazos, materiais e resumos.",
          rotuloAcao: "Adicionar disciplina",
          aoAcionar: novaDisciplina,
        })
      );
      return;
    }

    // Cada disciplina é um cartão: as iniciais na cor da Faculdade, o nome, a
    // média grande, o que vem pela frente e a média contra a mínima.
    const minimaGeral = Number(Store.estado().preferencias.faculdade?.mediaMinima) || 7;
    const ul = document.createElement("ul");
    ul.className = "list cartoes";
    lista
      .slice()
      .sort((a, b) => {
        if ((a.status === "concluída") !== (b.status === "concluída")) return a.status === "concluída" ? 1 : -1;
        const pa = UI.proximaAvaliacao(a)?.data || "9999";
        const pb = UI.proximaAvaliacao(b)?.data || "9999";
        return pa.localeCompare(pb);
      })
      .forEach((d) => {
        const media = UI.mediaDisciplina(d);
        const prox = UI.proximaAvaliacao(d);
        const u = prox ? UI.urgencia(prox.data) : null;
        const nPrazos = prazos().filter((p) => p.disciplinaId === d.id && !p.concluido).length;
        const nAval = (d.avaliacoes || []).length;
        const nMat = (d.materiais || []).length;
        const nRes = (d.resumos || []).length;
        const minima = Number(d.mediaMinima) || minimaGeral;
        const concluida = d.status === "concluída";
        const tom = !media ? "" : media.media >= minima ? "bem" : media.media >= minima - 1 ? "atencao" : "alerta";
        const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

        const li = document.createElement("li");
        if (concluida) li.className = "concluido";
        li.innerHTML = `
          ${UI.marcaItem({ texto: UI.monograma(d.nome), classe: "grande", nivel: concluida ? "apagada" : "" })}
          <a class="linha-link cartao-nome" href="${linkDisciplina(d)}">
            <span class="title ${concluida ? "strike" : ""}">${fmt.escape(d.nome)}</span>
            <span class="meta">${d.professor ? `Prof. ${fmt.escape(d.professor)}` : concluida ? "concluída" : "sem professor cadastrado"}</span>
          </a>
          <span class="item-valor voz">${media ? UI.fmt.decimal(media.media) : "-"}<small>${media ? "média" : "sem nota"}</small></span>
          <span class="item-info">
            ${prox ? UI.info(`${fmt.escape(prox.nome || "Avaliação")}, ${fmt.escape(u.rotulo)}`, u.nivel === "atrasado" || u.nivel === "hoje" ? "alerta" : u.nivel === "urgente" ? "atencao" : "") : ""}
            ${UI.info(plural(nAval, "avaliação", "avaliações"))}
            ${nPrazos ? UI.info(plural(nPrazos, "prazo aberto", "prazos abertos")) : ""}
            ${nRes ? UI.info(plural(nRes, "resumo", "resumos")) : ""}
            ${nMat ? UI.info(plural(nMat, "material", "materiais")) : ""}
          </span>
          ${media ? `<span class="cartao-barra ${tom}" title="Média ${UI.fmt.decimal(media.media)}, mínima ${UI.fmt.decimal(minima)}"><i style="width:${Math.min(100, media.media * 10)}%"></i><b style="left:calc(${minima * 10}% - 1px)"></b></span>` : ""}
          <span class="row-actions">
            <button class="btn ghost sm" data-excluir type="button">Excluir</button>
          </span>`;
        li.querySelector("[data-excluir]").addEventListener("click", () => excluirDisciplina(d));
        ul.appendChild(li);
      });
    box.appendChild(ul);
  }

  function renderPrazos() {
    const box = document.getElementById("prazos");
    box.innerHTML = "";
    const abertos = prazos().filter((p) => !p.concluido).sort((a, b) => (a.data || "").localeCompare(b.data || ""));
    const atras = abertos.filter((p) => (UI.diasAte(p.data) ?? 0) < 0).length;
    const prox = abertos.find((p) => (UI.diasAte(p.data) ?? -1) >= 0);
    document.getElementById("prazos-resumo").innerHTML = abertos.length
      ? [atras ? `<span class="alerta">${atras === 1 ? "1 atrasado" : `${atras} atrasados`}</span>` : `${abertos.length} em aberto`,
        prox ? `o próximo: <b>${fmt.escape(prox.descricao || "sem nome")}</b>, ${fmt.escape(UI.urgencia(prox.data).rotulo)}` : ""].filter(Boolean).join("; ")
      : "Nada em aberto";
    const lista = prazos()
      .filter((p) => verConcluidos || !p.concluido)
      .sort((a, b) => (a.data || "").localeCompare(b.data || ""));

    if (!lista.length) {
      box.appendChild(
        UI.vazio({
          icone: "◷",
          titulo: prazos().length ? "Nenhum prazo em aberto" : "Nenhum prazo cadastrado",
          texto: prazos().length
            ? "Tudo em dia por aqui. Marque a caixa acima para rever os concluídos."
            : "Cadastre entregas, seminários e marcos do TCC. Eles entram na agenda geral junto com os prazos dos projetos.",
          rotuloAcao: prazos().length ? null : "Adicionar prazo",
          aoAcionar: novoPrazo,
        })
      );
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list";
    lista.forEach((p) => {
      const u = UI.urgencia(p.data);
      const disc = p.disciplinaId ? Store.achar("faculdade.disciplinas", p.disciplinaId) : null;
      const li = document.createElement("li");
      li.innerHTML = `
        <input type="checkbox" class="check" ${p.concluido ? "checked" : ""} aria-label="Marcar como concluído" />
        ${UI.marcaItem({ data: p.data, nivel: p.concluido ? "feito" : u.nivel === "proximo" ? "" : u.nivel })}
        <span class="grow">
          <span class="title ${p.concluido ? "strike" : ""}">${fmt.escape(p.descricao)}</span>
          <span class="item-info">${[
            UI.info(fmt.escape(p.tipo || "entrega")),
            disc ? UI.info(fmt.escape(disc.nome)) : "",
          ].join("")}</span>
        </span>
        <span class="badge ${p.concluido ? "feito" : u.nivel}">${p.concluido ? "concluído" : u.rotulo}</span>
        <span class="row-actions">
          <button class="btn ghost sm" data-editar>Editar</button>
          <button class="btn ghost sm" data-excluir>Excluir</button>
        </span>`;
      li.querySelector("input").addEventListener("change", (ev) => {
        Store.atualizar("faculdade.prazos", p.id, { concluido: ev.target.checked });
        UI.toast(ev.target.checked ? "Prazo concluído." : "Prazo reaberto.");
        render();
      });
      li.querySelector("[data-editar]").addEventListener("click", () => editarPrazo(p));
      li.querySelector("[data-excluir]").addEventListener("click", () => excluir("faculdade.prazos", p, "Prazo"));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  /* --------------------------------- Ações ---------------------------------- */

  const camposDisciplina = () => [
    { nome: "nome", rotulo: "Nome da disciplina", tipo: "text", obrigatorio: true, placeholder: "Ex.: Clínica Médica" },
    { nome: "professor", rotulo: "Professor(a)", tipo: "text" },
    { nome: "mediaMinima", rotulo: "Média para passar", tipo: "number", step: "0.1", placeholder: "7", dica: "Usada para calcular quanto falta tirar. Vazio = 7." },
    { nome: "status", rotulo: "Situação", tipo: "select", opcoes: ["ativa", "concluída", "trancada"] },
  ];

  function camposPrazo() {
    return [
      { nome: "descricao", rotulo: "O que é", tipo: "text", obrigatorio: true, placeholder: "Ex.: Entrega da metanálise" },
      { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valorPadrao: UI.hojeISO() },
      { nome: "hora", rotulo: "Horário (opcional)", tipo: "time" },
      { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: ["entrega", "seminário", "trabalho", "TCC", "outro"] },
      {
        nome: "disciplinaId", rotulo: "Disciplina", tipo: "select",
        opcoes: [{ valor: "", rotulo: "Nenhuma" }, ...disciplinas().map((d) => ({ valor: d.id, rotulo: d.nome }))],
      },
    ];
  }

  async function novaDisciplina() {
    const v = await UI.formulario({
      titulo: "Nova disciplina",
      descricao: "Sugestão do Delfos: anexe o edital ou plano de ensino para organizar assuntos, aulas e provas. É opcional e você revisa antes de adicionar à agenda.",
      campos: [...camposDisciplina(), { nome: "organizarPlano", rotulo: "Quero anexar o plano de ensino ao criar", tipo: "simNao", dica: "Aceita PDF, Word (.docx) e PowerPoint (.pptx). Também pode fazer isso depois na matéria." }],
      rotuloConfirmar: "Criar e abrir",
    });
    if (!v) return;
    const { organizarPlano, ...dados } = v;
    const nova = Store.inserir("faculdade.disciplinas", { ...dados, avaliacoes: [], materiais: [], resumos: [] });
    location.href = linkDisciplina(nova) + (organizarPlano ? "&planejar=1#plano" : "");
  }

  async function novoPrazo() {
    const v = await UI.formulario({ titulo: "Novo prazo", descricao: "Entregas, seminários e marcos do TCC.", campos: camposPrazo() });
    if (!v) return;
    Store.inserir("faculdade.prazos", { ...v, concluido: false });
    UI.toast("Prazo cadastrado.");
    render();
  }

  async function editarPrazo(p) {
    const v = await UI.formulario({ titulo: "Editar prazo", campos: camposPrazo(), valores: p });
    if (!v) return;
    Store.atualizar("faculdade.prazos", p.id, v);
    UI.toast("Prazo atualizado.");
    render();
  }

  // Excluir a disciplina leva junto avaliações, materiais e resumos dela.
  async function excluirDisciplina(d) {
    const conteudo = (d.avaliacoes || []).length + (d.materiais || []).length + (d.resumos || []).length;
    const ok = await UI.confirmar({
      titulo: `Excluir "${d.nome}"?`,
      descricao: conteudo
        ? `A página dela some junto com ${conteudo} ${conteudo === 1 ? "item cadastrado" : "itens cadastrados"} (avaliações, materiais e resumos). Dá para desfazer logo em seguida.`
        : "Dá para desfazer logo em seguida.",
      rotuloConfirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    excluir("faculdade.disciplinas", d, "Disciplina");
  }

  function excluir(caminho, item, rotulo) {
    const indice = Store.indiceDe(caminho, item.id);
    Store.remover(caminho, item.id);
    render();
    UI.toast(`${rotulo} excluíd${rotulo === "Disciplina" ? "a" : "o"}.`, {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.restaurar(caminho, item, indice); render(); },
    });
  }

  document.getElementById("btn-disciplina").addEventListener("click", novaDisciplina);
  document.getElementById("btn-prazo").addEventListener("click", novoPrazo);
  document.getElementById("ver-concluidos").addEventListener("change", (e) => {
    verConcluidos = e.target.checked;
    renderPrazos();
  });

  render();
})();
