/* Página de uma disciplina — avaliações, prazos, materiais e resumos. */

(() => {
  const { fmt } = UI;
  const CAMINHO = "faculdade.disciplinas";
  const id = UI.parametro("id");

  let disciplina = Store.achar(CAMINHO, id);

  // Disciplina inexistente (link antigo ou dados apagados): explica em vez de
  // deixar a página quebrada.
  if (!disciplina) {
    UI.iniciarPagina("faculdade");
    document.getElementById("conteudo").innerHTML = `
      <a class="voltar" href="faculdade.html">← Faculdade</a>
      <div class="card" style="margin-top:16px;"></div>`;
    document.querySelector(".card").appendChild(
      UI.vazio({
        icone: "◌",
        titulo: "Disciplina não encontrada",
        texto: "Ela pode ter sido excluída, ou este link é de outro navegador: os dados ficam salvos em cada navegador.",
        rotuloAcao: "Ver disciplinas",
        aoAcionar: () => (location.href = "faculdade.html"),
      })
    );
    return;
  }

  UI.iniciarPagina("disciplina", { idAtivo: id });

  const recarregar = () => { disciplina = Store.achar(CAMINHO, id); };
  const prazosDaDisciplina = () => Store.lista("faculdade.prazos").filter((p) => p.disciplinaId === id);

  /* --------------------------------- Render --------------------------------- */

  function render() {
    recarregar();
    document.title = `${disciplina.nome}, ${UI.NOME}`;
    document.getElementById("titulo").textContent = disciplina.nome;
    document.getElementById("etiqueta").textContent = `Disciplina ${disciplina.status || "ativa"}`;
    document.getElementById("subtitulo").innerHTML = disciplina.professor
      ? `Prof. ${fmt.escape(disciplina.professor)}`
      : `<span class="muted">Professor(a) não informado</span>`;

    const media = UI.mediaDisciplina(disciplina);
    document.getElementById("s-media").textContent = media ? UI.fmt.decimal(media.media) : "-";
    // Abaixo da média, o que importa para o estudante: quanto falta tirar.
    const meta = UI.notaNecessaria(disciplina);
    const minima = meta ? UI.fmt.decimal(meta.minima) : "";
    const alvo = document.getElementById("s-media-d");
    alvo.classList.remove("up", "down");
    if (!meta) {
      alvo.textContent = "Nenhuma avaliação cadastrada ainda";
    } else if (meta.situacao === "aprovado") {
      alvo.textContent = `Fechou acima da média ${minima}`;
      alvo.classList.add("up");
    } else if (meta.situacao === "abaixo") {
      alvo.textContent = `Fechou abaixo da média ${minima}`;
      alvo.classList.add("down");
    } else if (meta.situacao === "garantida") {
      alvo.textContent = `Média ${minima} já garantida, mesmo com zero no resto`;
      alvo.classList.add("up");
    } else if (meta.situacao === "impossivel") {
      alvo.textContent = `Não dá mais para chegar a ${minima} só com as notas que faltam`;
      alvo.classList.add("down");
    } else {
      const quais = meta.quantasFaltam === 1 ? "na avaliação que falta" : `em média nas ${meta.quantasFaltam} que faltam`;
      alvo.innerHTML = `Para fechar com ${minima}: precisa de <b>${UI.fmt.decimal(meta.precisa)}</b> ${quais}`;
    }

    const prox = UI.proximaAvaliacao(disciplina);
    document.getElementById("s-proxima").textContent = prox ? prox.nome || "Avaliação" : "Nada agendado";
    document.getElementById("s-proxima-d").innerHTML = prox
      ? `${fmt.data(prox.data)}, <span class="badge ${UI.urgencia(prox.data).nivel}">${UI.urgencia(prox.data).rotulo}</span>`
      : "Cadastre a próxima prova ou trabalho";

    const abertos = prazosDaDisciplina().filter((p) => !p.concluido);
    document.getElementById("s-prazos").textContent = abertos.length;
    const atrasados = abertos.filter((p) => (UI.diasAte(p.data) ?? 0) < 0).length;
    const dPrazos = document.getElementById("s-prazos-d");
    dPrazos.textContent = atrasados ? `${atrasados} já ${atrasados === 1 ? "venceu" : "venceram"}` : "Nenhum atrasado";
    dPrazos.className = `stat-sub ${atrasados ? "delta down" : ""}`;

    const nMat = (disciplina.materiais || []).length;
    const nRes = (disciplina.resumos || []).length;
    document.getElementById("s-conteudo").textContent = nMat + nRes;
    document.getElementById("s-conteudo-d").textContent = `${nMat} ${nMat === 1 ? "material" : "materiais"}, ${nRes} ${nRes === 1 ? "resumo" : "resumos"}`;

    renderAvaliacoes();
    renderPrazos();
    renderMateriais();
    renderResumos();
    renderPlano();
    UI.montarLayout("disciplina", { idAtivo: id });
  }

  function renderAvaliacoes() {
    const box = document.getElementById("avaliacoes");
    box.innerHTML = "";
    const avs = disciplina.avaliacoes || [];
    const media = UI.mediaDisciplina(disciplina);
    const semNota = avs.filter((a) => a.nota === "" || a.nota === null || a.nota === undefined).length;
    document.getElementById("avaliacoes-resumo").innerHTML = avs.length
      ? `${avs.length === 1 ? "1 avaliação" : `${avs.length} avaliações`}${media ? `; média <b>${UI.fmt.decimal(media.media ?? media)}</b>` : ""}${semNota ? `; ${semNota === 1 ? "1 sem nota" : `${semNota} sem nota`}` : ""}`
      : "Nenhuma avaliação ainda";
    const lista = (disciplina.avaliacoes || [])
      .slice()
      .sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999"));

    if (!lista.length) {
      box.appendChild(
        UI.vazio({
          icone: "◎",
          titulo: "Nenhuma avaliação cadastrada",
          texto: "Cadastre provas e trabalhos com data e peso. Quando a nota sair, é só lançar aqui; a média é calculada sozinha.",
          rotuloAcao: "Adicionar avaliação",
          aoAcionar: novaAvaliacao,
        })
      );
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list";
    lista.forEach((a) => {
      const temNota = a.nota !== null && a.nota !== undefined && a.nota !== "";
      const u = a.data && !temNota ? UI.urgencia(a.data) : null;
      const li = document.createElement("li");
      li.innerHTML = `
        ${a.data ? UI.marcaItem({ data: a.data, nivel: temNota ? "feito" : u && u.nivel !== "proximo" ? u.nivel : "" }) : UI.marcaItem({ icone: "alvo", nivel: "futuro" })}
        <span class="grow">
          <span class="title">${fmt.escape(a.nome || "Avaliação")}</span>
          <span class="item-info">${[
            a.data ? "" : UI.info("sem data"),
            UI.info(`peso ${fmt.escape(String(a.peso || 1))}`),
            temNota ? UI.info("nota lançada", "bem") : "",
          ].join("")}</span>
        </span>
        ${temNota
          ? `<span class="nota-chip">${fmt.escape(Number(a.nota).toLocaleString("pt-BR", { maximumFractionDigits: 2 }))}</span>`
          : u ? `<span class="badge ${u.nivel}">${u.rotulo}</span>` : `<span class="badge">a lançar</span>`}
        <span class="row-actions">
          <button class="btn ghost sm" data-editar>Editar</button>
          <button class="btn ghost sm" data-excluir>Excluir</button>
        </span>`;
      li.querySelector("[data-editar]").addEventListener("click", () => editarAvaliacao(a));
      li.querySelector("[data-excluir]").addEventListener("click", () => excluirSub("avaliacoes", a, "Avaliação"));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function renderPrazos() {
    const box = document.getElementById("prazos");
    box.innerHTML = "";
    const lista = prazosDaDisciplina().sort((a, b) => (a.data || "").localeCompare(b.data || ""));
    const abertosP = lista.filter((p) => !p.concluido);
    const proxP = abertosP.find((p) => (UI.diasAte(p.data) ?? -1) >= 0);
    document.getElementById("prazos-resumo").innerHTML = abertosP.length
      ? `${abertosP.length} em aberto${proxP ? `; o próximo: <b>${UI.fmt.escape(proxP.descricao || "sem nome")}</b>, ${UI.fmt.escape(UI.urgencia(proxP.data).rotulo)}` : ""}`
      : "Nada em aberto";

    if (!lista.length) {
      box.appendChild(
        UI.vazio({
          icone: "◷",
          titulo: "Nenhum prazo desta disciplina",
          texto: "Entregas, seminários e trabalhos cadastrados aqui já aparecem vinculados a esta matéria na agenda geral.",
          rotuloAcao: "Adicionar prazo",
          aoAcionar: novoPrazo,
        })
      );
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list";
    lista.forEach((p) => {
      const u = UI.urgencia(p.data);
      const li = document.createElement("li");
      li.innerHTML = `
        <input type="checkbox" class="check" ${p.concluido ? "checked" : ""} aria-label="Marcar como concluído" />
        ${UI.marcaItem({ data: p.data, nivel: p.concluido ? "feito" : u.nivel === "proximo" ? "" : u.nivel })}
        <span class="grow">
          <span class="title ${p.concluido ? "strike" : ""}">${fmt.escape(p.descricao)}</span>
          <span class="item-info">${UI.info(fmt.escape(p.tipo || "entrega"))}</span>
        </span>
        <span class="badge ${p.concluido ? "feito" : u.nivel}">${p.concluido ? "concluído" : u.rotulo}</span>
        <span class="row-actions"><button class="btn ghost sm" data-excluir>Excluir</button></span>`;
      li.querySelector("input").addEventListener("change", (ev) => {
        Store.atualizar("faculdade.prazos", p.id, { concluido: ev.target.checked });
        render();
      });
      li.querySelector("[data-excluir]").addEventListener("click", () => {
        const indice = Store.indiceDe("faculdade.prazos", p.id);
        Store.remover("faculdade.prazos", p.id);
        render();
        UI.toast("Prazo excluído.", {
          acaoRotulo: "Desfazer",
          aoAcionar: () => { Store.restaurar("faculdade.prazos", p, indice); render(); },
        });
      });
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function renderMateriais() {
    const box = document.getElementById("materiais");
    box.innerHTML = "";
    const lista = disciplina.materiais || [];
    document.getElementById("materiais-resumo").textContent = lista.length
      ? `${lista.length === 1 ? "1 material" : `${lista.length} materiais`}: ${lista.slice(0, 3).map((m) => m.titulo || m.nome).filter(Boolean).join(", ")}`
      : "Slides, PDFs, artigos e links da disciplina";

    if (!lista.length) {
      box.appendChild(
        UI.vazio({
          icone: "◫",
          titulo: "Nenhum material salvo",
          texto: "Guarde aqui o que você usa nesta matéria: anexe o PDF dos slides e das listas, ou só cole o link do Drive.",
          rotuloAcao: "Adicionar material",
          aoAcionar: novoMaterial,
        })
      );
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list";
    lista.forEach((m) => {
      const li = document.createElement("li");
      const anexos = m.anexos || [];
      const titulo = UI.linkSeguro(m.url)
        ? `<a class="title" href="${fmt.escape(UI.linkSeguro(m.url))}" target="_blank" rel="noopener noreferrer">${fmt.escape(m.titulo)}</a>`
        : `<span class="title">${fmt.escape(m.titulo)}</span>`;

      const tipo = String(m.tipo || "link").toLowerCase();
      const iconeTipo = /pdf|artigo|apostila|diretriz/.test(tipo) ? "arquivo" : /livro/.test(tipo) ? "livro" : /v[ií]deo|aula/.test(tipo) ? "camera" : /slide/.test(tipo) ? "quadro" : m.url ? "globo" : "arquivo";
      li.innerHTML = `
        ${UI.marcaItem({ icone: iconeTipo })}
        <span class="grow">
          ${titulo}
          <span class="item-info">${[
            UI.info(fmt.escape(m.tipo || "link")),
            m.url ? UI.info(fmt.escape(dominio(m.url))) : "",
            anexos.length ? UI.info(`${anexos.length} ${anexos.length === 1 ? "documento" : "documentos"}`) : "",
          ].join("")}</span>
          ${anexos.length ? `<span class="anexos" style="margin-top:8px;">${anexos.map(anexoHTML).join("")}</span>` : ""}
        </span>
        <span class="row-actions">
          <button class="btn ghost sm" data-editar>Editar</button>
          <button class="btn ghost sm" data-excluir>Excluir</button>
        </span>`;
      ligarAnexos(li, anexos);
      li.querySelector("[data-editar]").addEventListener("click", () => editarMaterial(m));
      li.querySelector("[data-excluir]").addEventListener("click", () => excluirMaterial(m));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function dominio(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
  }

  /* ------------------------------- Anexos ----------------------------------- */

  /** Um documento anexado, como botão que abre/baixa o arquivo. */
  function anexoHTML(a) {
    const cls = Arquivos.classificar(a);
    return `<button class="anexo" type="button" data-abrir="${fmt.escape(a.id)}">
        <span class="anexo-ic ${cls.classe}">${fmt.escape(cls.rotulo)}</span>
        <span class="anexo-nome">${fmt.escape(a.nome)}
          <span class="anexo-meta">${fmt.escape(Arquivos.tamanhoLegivel(a.tamanho))}</span>
        </span>
        <span class="muted" style="font-size:calc(12px * var(--escala-fonte, 1));">abrir</span>
      </button>`;
  }

  function ligarAnexos(raiz, anexos) {
    raiz.querySelectorAll("[data-abrir]").forEach((el) => {
      const a = anexos.find((x) => x.id === el.dataset.abrir);
      el.addEventListener("click", async () => {
        try { await Arquivos.abrirAnexo(a); }
        catch (err) { UI.toast(err.message); }
      });
    });
  }

  function renderResumos() {
    const box = document.getElementById("resumos");
    box.innerHTML = "";
    const lista = (disciplina.resumos || [])
      .slice()
      .sort((a, b) => (b.atualizadoEm || "").localeCompare(a.atualizadoEm || ""));
    document.getElementById("resumos-resumo").innerHTML = lista.length
      ? `${lista.length === 1 ? "1 resumo" : `${lista.length} resumos`}; o último: <b>${UI.fmt.escape(lista[0].titulo || "sem título")}</b>`
      : "Nenhum resumo ainda";

    if (!lista.length) {
      const card = document.createElement("div");
      card.className = "card";
      card.appendChild(
        UI.vazio({
          icone: "✎",
          titulo: "Nenhum resumo escrito",
          texto: "Escreva resumos por assunto e anexe a foto do quadro ou o artigo. Tudo fica salvo aqui e entra no backup.",
          rotuloAcao: "Escrever resumo",
          aoAcionar: novoResumo,
        })
      );
      box.appendChild(card);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "grid g2";
    lista.forEach((r) => {
      const card = document.createElement("div");
      card.className = "card resumo-cartao";
      const nAnexos = (r.anexos || []).length;
      card.innerHTML = `
        <div class="resumo-cab">
          ${UI.marcaItem({ icone: "lapis" })}
          <div class="resumo-cab-texto">
            <h3 class="resumo-titulo">${fmt.escape(r.titulo)}</h3>
            <span class="item-info">${[
              r.atualizadoEm ? UI.info(`atualizado em ${fmt.escape(fmt.data(r.atualizadoEm))}`) : "",
              nAnexos ? UI.info(`${nAnexos} ${nAnexos === 1 ? "documento" : "documentos"}`) : "",
            ].join("")}</span>
          </div>
        </div>
        <div class="resumo-texto rico resumo-previa">${UI.htmlSeguro(r.conteudo || "")}</div>
        ${nAnexos ? `<div class="anexos">${r.anexos.map(anexoHTML).join("")}</div>` : ""}
        <div class="resumo-acoes">
          <button class="btn sm" data-editar type="button">Abrir</button>
          <button class="btn ghost sm" data-anexos type="button">Documentos</button>
          <button class="btn ghost sm" data-excluir type="button">Excluir</button>
        </div>`;
      ligarAnexos(card, r.anexos || []);
      UI.resolverImagens(card.querySelector(".resumo-texto"));
      card.querySelector("[data-editar]").addEventListener("click", () => abrirResumo(r));
      card.querySelector("[data-anexos]").addEventListener("click", () => editarAnexosResumo(r));
      card.querySelector("[data-excluir]").addEventListener("click", () => excluirResumo(r));
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  /* --------------------------------- Ações ---------------------------------- */

  function renderPlano() {
    const plano = disciplina.planoEnsino || {};
    const anexos = plano.anexos || [];
    const assuntos = plano.assuntos || [];
    document.getElementById("plano-convite").hidden = !!(anexos.length || assuntos.length);
    document.getElementById("plano-resumo").textContent = anexos.length ? `${anexos.length} ${anexos.length === 1 ? "documento" : "documentos"}, ${assuntos.length} assuntos` : "Opcional: comece pelos documentos da matéria";
    const docs = document.getElementById("plano-documentos");
    docs.innerHTML = anexos.length ? `<div class="plano-anexos">${anexos.map(anexoHTML).join("")}</div>` : '<p class="card-note">Guarde o edital ou o plano de ensino e confira os itens encontrados antes de organizar sua agenda.</p>';
    ligarAnexos(docs, anexos);
    document.getElementById("plano-assuntos").innerHTML = assuntos.length ? `<ul class="plano-assuntos">${assuntos.map(x => `<li>${fmt.escape(x.texto)}</li>`).join("")}</ul>` : '<p class="card-note">Os assuntos da matéria aparecerão aqui.</p>';
    const aulas = [...(disciplina.aulas || [])].sort((a,b) => a.data.localeCompare(b.data) || (a.hora || "").localeCompare(b.hora || ""));
    document.getElementById("aulas-resumo").textContent = `${aulas.length} ${aulas.length === 1 ? "aula na agenda" : "aulas na agenda"}`;
    const box = document.getElementById("aulas");
    box.innerHTML = aulas.length ? `<ul class="list">${aulas.map(a => `<li>${UI.marcaItem({data:a.data,nivel:"futuro"})}<span class="grow"><span class="title">${fmt.escape(a.nome || "Aula")}</span><span class="plano-aula-hora">${fmt.escape(fmt.data(a.data))}${a.hora ? `, ${fmt.escape(a.hora)}${a.horaFim ? `–${fmt.escape(a.horaFim)}` : ""}` : ""}</span></span><span class="row-actions"><button class="btn ghost sm" type="button" data-aula-editar="${fmt.escape(a.id)}" aria-label="Editar aula ${fmt.escape(a.nome)}">Editar</button><button class="btn ghost sm" type="button" data-aula-excluir="${fmt.escape(a.id)}" aria-label="Excluir aula ${fmt.escape(a.nome)}">Excluir</button></span></li>`).join("")}</ul>` : '<p class="card-note">Importe os horários do plano ou adicione uma aula. Eles aparecem no calendário de todas as áreas.</p>';
    box.querySelectorAll("[data-aula-editar]").forEach(b => b.addEventListener("click", () => editarAula(aulas.find(x => x.id === b.dataset.aulaEditar))));
    box.querySelectorAll("[data-aula-excluir]").forEach(b => b.addEventListener("click", () => excluirSub("aulas", aulas.find(x => x.id === b.dataset.aulaExcluir), "Aula")));
  }

  async function organizarPlano() {
    try {
      await UI.carregarScript("plano-ensino.js");
      const resultado = await PlanoEnsino.abrir({disciplinaId:id});
      if (resultado) {
        render(); Organizacao.selecionar("plano", {url:true});
        const total = resultado.aulas + resultado.avaliacoes + resultado.prazos;
        UI.toast(total ? `Plano guardado. ${total} ${total === 1 ? "item adicionado" : "itens adicionados"} à agenda.` : "Plano guardado. Os itens já existentes foram preservados.");
      }
    } catch (erro) { UI.toast(erro.message || "Não foi possível abrir a leitura do plano. Tente novamente."); }
  }

  async function editarAssuntos() {
    const v = await UI.formulario({titulo:"Assuntos da matéria",campos:[{nome:"assuntos",rotulo:"Um assunto por linha",tipo:"textarea"}],valores:{assuntos:(disciplina.planoEnsino?.assuntos || []).map(x=>x.texto).join("\n")}});
    if (!v) return;
    const assuntos = [...new Set(v.assuntos.split("\n").map(x=>x.trim()).filter(Boolean))].slice(0,80).map(texto=>({texto:texto.slice(0,200)}));
    Store.atualizar(CAMINHO,id,{planoEnsino:{...disciplina.planoEnsino,assuntos}});render();
  }

  async function editarAula(aula = {}) {
    const v = await UI.formulario({titulo:aula.id ? "Editar aula" : "Nova aula",descricao:"A data e o horário aparecem também na agenda geral.",campos:[
      {nome:"nome",rotulo:"Nome",tipo:"text",obrigatorio:true,valorPadrao:"Aula"},
      {nome:"data",rotulo:"Data",tipo:"date",obrigatorio:true},
      {nome:"hora",rotulo:"Início",tipo:"time",obrigatorio:true},
      {nome:"horaFim",rotulo:"Fim (opcional)",tipo:"time"}
    ],valores:aula,validar(v){return v.horaFim && v.horaFim<=v.hora ? {campo:"horaFim",mensagem:"O fim deve ser depois do início."} : null;}});
    if (!v) return;
    if (aula.id) Store.subAtualizar(CAMINHO,id,"aulas",aula.id,v);
    else Store.subInserir(CAMINHO,id,"aulas",v);
    render();
  }

  const camposDisciplina = () => [
    { nome: "nome", rotulo: "Nome da disciplina", tipo: "text", obrigatorio: true },
    { nome: "professor", rotulo: "Professor(a)", tipo: "text" },
    { nome: "mediaMinima", rotulo: "Média para passar", tipo: "number", step: "0.1", placeholder: "7", dica: "Usada para calcular quanto falta tirar. Vazio = 7." },
    { nome: "status", rotulo: "Situação", tipo: "select", opcoes: ["ativa", "concluída", "trancada"] },
  ];

  const camposAvaliacao = () => [
    { nome: "nome", rotulo: "Nome", tipo: "text", obrigatorio: true, placeholder: "Ex.: Prova 1" },
    { nome: "data", rotulo: "Data", tipo: "date" },
    { nome: "hora", rotulo: "Horário (opcional)", tipo: "time" },
    { nome: "peso", rotulo: "Peso", tipo: "number", step: "0.5", valorPadrao: 1, dica: "Use 1 se todas as avaliações valem o mesmo." },
    { nome: "nota", rotulo: "Nota", tipo: "number", step: "0.1", dica: "Deixe em branco enquanto não sair." },
  ];

  const camposMaterial = () => [
    { nome: "titulo", rotulo: "Título", tipo: "text", obrigatorio: true, placeholder: "Ex.: Slides da aula 4" },
    { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: ["slides", "artigo", "vídeo", "livro", "exercícios", "link"] },
    { nome: "url", rotulo: "Link", tipo: "text", placeholder: "https://drive.google.com/…" },
    { nome: "anexos", rotulo: "Documentos", tipo: "anexos", dica: "PDF, slides, fotos. Ficam guardados neste navegador e entram no backup." },
  ];

  /* O texto do resumo é escrito em resumo.html, uma página só dele. Aqui
     ficam apenas os documentos anexados, que ficariam de fora da tela limpa
     do editor. */

  const abrirResumo = (r) =>
    (location.href = `resumo.html?disciplina=${encodeURIComponent(id)}&id=${encodeURIComponent(r.id)}`);

  const novoResumo = () =>
    (location.href = `resumo.html?disciplina=${encodeURIComponent(id)}`);

  async function editarAnexosResumo(r) {
    const v = await UI.formulario({
      titulo: `Documentos de "${r.titulo}"`,
      descricao: "A foto do quadro, o PDF do artigo, o mapa mental.",
      campos: [{
        nome: "anexos", rotulo: "Documentos", tipo: "anexos",
        dica: "Ficam guardados neste navegador e entram no backup.",
      }],
      valores: r,
    });
    if (!v) return;
    Store.subAtualizar(CAMINHO, id, "resumos", r.id, v);
    UI.toast("Documentos atualizados.");
    render();
  }

  async function editarDisciplina() {
    const v = await UI.formulario({ titulo: "Editar disciplina", campos: camposDisciplina(), valores: disciplina });
    if (!v) return;
    Store.atualizar(CAMINHO, id, v);
    UI.toast("Disciplina atualizada.");
    render();
  }

  async function novaAvaliacao() {
    const v = await UI.formulario({ titulo: "Nova avaliação", descricao: `Prova ou trabalho de ${disciplina.nome}.`, campos: camposAvaliacao() });
    if (!v) return;
    Store.subInserir(CAMINHO, id, "avaliacoes", v);
    UI.toast("Avaliação cadastrada.");
    render();
  }

  async function editarAvaliacao(a) {
    const v = await UI.formulario({ titulo: "Editar avaliação", campos: camposAvaliacao(), valores: a });
    if (!v) return;
    Store.subAtualizar(CAMINHO, id, "avaliacoes", a.id, v);
    UI.toast("Avaliação atualizada.");
    render();
  }

  async function novoPrazo() {
    const v = await UI.formulario({
      titulo: "Novo prazo",
      descricao: `Entrega ou trabalho de ${disciplina.nome}.`,
      campos: [
        { nome: "descricao", rotulo: "O que é", tipo: "text", obrigatorio: true },
        { nome: "data", rotulo: "Data", tipo: "date", obrigatorio: true, valorPadrao: UI.hojeISO() },
        { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: ["entrega", "seminário", "trabalho", "TCC", "outro"] },
      ],
    });
    if (!v) return;
    Store.inserir("faculdade.prazos", { ...v, disciplinaId: id, concluido: false });
    UI.toast("Prazo cadastrado.");
    render();
  }

  async function novoMaterial() {
    const v = await UI.formulario({ titulo: "Novo material", descricao: "Um link ou referência desta matéria.", campos: camposMaterial() });
    if (!v) return;
    Store.subInserir(CAMINHO, id, "materiais", v);
    UI.toast("Material salvo.");
    render();
  }

  async function editarMaterial(m) {
    const v = await UI.formulario({ titulo: "Editar material", campos: camposMaterial(), valores: m });
    if (!v) return;
    Store.subAtualizar(CAMINHO, id, "materiais", m.id, v);
    UI.toast("Material atualizado.");
    render();
  }

  function excluirSub(campo, item, rotulo) {
    Store.subRemover(CAMINHO, id, campo, item.id);
    render();
    UI.toast(`${rotulo} excluído.`, {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.subInserir(CAMINHO, id, campo, item); render(); },
    });
  }

  /**
   * Itens com anexo têm exclusão própria: os arquivos só somem do IndexedDB
   * quando o "Desfazer" expira, senão desfazer devolveria a ficha sem o PDF.
   * Um resumo carrega ainda as imagens embutidas no texto (item.conteudo),
   * que não aparecem em item.anexos.
   */
  function excluirComAnexos(campo, item, rotulo) {
    Store.subRemover(CAMINHO, id, campo, item.id);
    render();
    let desfeito = false;
    UI.toast(`${rotulo} excluído.`, {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { desfeito = true; Store.subInserir(CAMINHO, id, campo, item); render(); },
    });
    setTimeout(() => {
      if (desfeito) return;
      (item.anexos || []).forEach((a) => Arquivos.remover(a.id));
      UI.idsImagensEm(item.conteudo).forEach((idImg) => Arquivos.remover(idImg));
    }, 6000);
  }

  const excluirMaterial = (m) => excluirComAnexos("materiais", m, "Material");
  const excluirResumo = (r) => excluirComAnexos("resumos", r, "Resumo");

  /* ------------------------- Importar do Google Drive ----------------------- */

  async function importarDoDrive() {
    if (typeof driveConectado !== "function" || !driveConectado()) {
      // A conexão acontece de forma assíncrona (janela do Google); quando
      // terminar, aoConectar chama esta mesma função de novo.
      if (typeof aoConectar === "function") aoConectar(importarDoDrive);
      if (typeof conectarGoogle === "function") conectarGoogle();
      return;
    }
    abrirPickerDrive();
  }

  function abrirPickerDrive() {
    const html = `
      <div class="modal-head">
        <h2 class="modal-title">Importar do Drive</h2>
        <p class="modal-desc">Busque um arquivo do seu Google Drive. Documentos do Google Docs podem virar resumo automaticamente; os demais entram como material com link.</p>
      </div>
      <div class="modal-body">
        <input class="input" type="text" placeholder="Buscar por nome…" data-busca value="${fmt.escape(disciplina.nome)}" />
        <div data-resultados style="display:flex; flex-direction:column; gap:6px; max-height:320px; overflow-y:auto;"></div>
      </div>
      <div class="modal-foot"><button class="btn" data-acao="fechar" type="button">Fechar</button></div>`;

    UI.abrirModal(html, {
      aoMontar(modal, fechar) {
        const campo = modal.querySelector("[data-busca]");
        const box = modal.querySelector("[data-resultados]");
        let temporizador;

        const buscar = () => {
          box.innerHTML = `<p class="card-note">Buscando…</p>`;
          driveBuscarArquivos(campo.value.trim())
            .then((arquivos) => renderResultadosDrive(arquivos, box, fechar))
            .catch((err) => { box.innerHTML = `<p class="card-note">${fmt.escape(err.message)}</p>`; });
        };

        campo.addEventListener("input", () => {
          clearTimeout(temporizador);
          temporizador = setTimeout(buscar, 350);
        });
        campo.focus();
        buscar();

        modal.querySelector('[data-acao="fechar"]').addEventListener("click", () => fechar(null));
      },
    });
  }

  function renderResultadosDrive(arquivos, box, fechar) {
    box.innerHTML = "";
    if (!arquivos.length) {
      box.innerHTML = `<p class="card-note">Nenhum arquivo encontrado com esse nome.</p>`;
      return;
    }
    arquivos.forEach((f) => {
      const ehDoc = driveEhGoogleDocs(f.mimeType);
      const linha = document.createElement("div");
      linha.className = "anexo";
      linha.innerHTML = `
        <span class="anexo-ic ${ehDoc ? "doc" : ""}">${ehDoc ? "doc" : "arq"}</span>
        <span class="anexo-nome">${fmt.escape(f.name)}
          <span class="anexo-meta">modificado em ${fmt.data((f.modifiedTime || "").slice(0, 10))}</span>
        </span>
        <button class="btn ghost sm" type="button" data-material>+ Material</button>
        ${ehDoc ? `<button class="btn sm" type="button" data-resumo>+ Resumo</button>` : ""}`;

      linha.querySelector("[data-material]").addEventListener("click", () => {
        Store.subInserir(CAMINHO, id, "materiais", { titulo: f.name, tipo: "link", url: f.webViewLink, anexos: [] });
        UI.toast("Material importado do Drive.");
        fechar(null);
        render();
      });

      const btnResumo = linha.querySelector("[data-resumo]");
      if (btnResumo) {
        btnResumo.addEventListener("click", async () => {
          btnResumo.disabled = true;
          btnResumo.textContent = "Importando…";
          try {
            const texto = await driveExportarTexto(f.id);
            // O Docs vem como texto puro; o resumo guarda HTML, então as
            // quebras de linha viram parágrafos antes de entrar.
            Store.subInserir(CAMINHO, id, "resumos", {
              titulo: f.name,
              conteudo: Store.textoParaHTML(texto),
              conteudoFormato: "html",
              atualizadoEm: UI.hojeISO(),
              anexos: [],
            });
            UI.toast("Resumo importado do Drive.");
            fechar(null);
            render();
          } catch (err) {
            UI.toast(`Não foi possível importar: ${err.message}`);
            btnResumo.disabled = false;
            btnResumo.textContent = "+ Resumo";
          }
        });
      }
      box.appendChild(linha);
    });
  }

  document.getElementById("btn-editar").addEventListener("click", editarDisciplina);
  document.getElementById("btn-drive").addEventListener("click", importarDoDrive);
  document.getElementById("btn-avaliacao").addEventListener("click", novaAvaliacao);
  document.getElementById("btn-prazo").addEventListener("click", novoPrazo);
  document.getElementById("btn-material").addEventListener("click", novoMaterial);
  document.getElementById("btn-resumo").addEventListener("click", novoResumo);
  document.getElementById("btn-plano").addEventListener("click", organizarPlano);
  document.getElementById("btn-plano-convite").addEventListener("click", organizarPlano);
  document.getElementById("btn-aula").addEventListener("click", () => editarAula());
  document.getElementById("btn-assuntos").addEventListener("click", editarAssuntos);

  render();
  if (UI.parametro("planejar") === "1") {
    const endereco = new URL(location.href);
    endereco.searchParams.delete("planejar");history.replaceState(null,"",endereco);
    organizarPlano();
  }
})();
