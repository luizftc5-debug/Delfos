/* Página de um projeto — ficha completa, etapas, recebimentos, custos,
   documentos e anotações. Trabalho acadêmico continua na aba Faculdade. */

(() => {
  const { fmt } = UI;
  const CAMINHO = "projetos";
  const id = UI.parametro("id");

  let projeto = Store.achar(CAMINHO, id);

  if (!projeto) {
    UI.iniciarPagina("projetos");
    document.getElementById("conteudo").innerHTML =
      `<a class="voltar" href="projetos.html">← Projetos</a><div class="card" style="margin-top:16px;"></div>`;
    document.querySelector(".card").appendChild(
      UI.vazio({
        icone: "◌",
        titulo: "Projeto não encontrado",
        texto: "Pode ter sido excluído, ou este link é de outro navegador — os dados ficam salvos em cada navegador.",
        rotuloAcao: "Ver projetos",
        aoAcionar: () => (location.href = "projetos.html"),
      })
    );
    return;
  }

  UI.iniciarPagina("projeto", { idAtivo: id });

  const TIPOS = ["monitoria", "cursinho", "freelance", "conteúdo", "consultoria", "plantão", "produto", "outro"];
  const STATUS = ["planejamento", "em andamento", "pausado", "concluído", "arquivado"];
  const PRIORIDADES = ["alta", "média", "baixa"];

  const recarregar = () => { projeto = Store.achar(CAMINHO, id); };

  /* --------------------------------- Render --------------------------------- */

  function render() {
    recarregar();
    if (!projeto) return (location.href = "projetos.html");

    const r = UI.resumoProjeto(projeto);
    document.title = `${projeto.nome} · ${UI.NOME}`;
    document.getElementById("titulo").textContent = projeto.nome;
    document.getElementById("titulo").className = r.encerrado ? "strike" : "";
    document.getElementById("subtitulo").textContent =
      projeto.descricao || "Sem descrição — use “Editar projeto” para dizer o que é e para quem.";

    renderSelos(r);
    renderStats(r);
    renderProgresso(r);
    renderEtapas();
    renderFicha(r);
    renderRecebimentos(r);
    renderCustos(r);
    renderAnexos();
    renderAnotacoes();
    UI.montarLayout("projeto", { idAtivo: id });
  }

  function renderSelos(r) {
    const selos = [
      `<span class="badge ${projeto.status === "concluído" ? "feito" : ""}">${fmt.escape(projeto.status)}</span>`,
      projeto.tipo ? `<span class="badge projetos">${fmt.escape(projeto.tipo)}</span>` : "",
      r.urgencia ? `<span class="badge ${r.urgencia.nivel}">${r.urgencia.rotulo}</span>` : "",
      projeto.prioridade && projeto.prioridade !== "média"
        ? `<span class="badge">prioridade ${fmt.escape(projeto.prioridade)}</span>` : "",
    ].filter(Boolean);
    document.getElementById("selos").innerHTML = selos.join("");
  }

  function renderStats(r) {
    const semMeta = !r.metaMensal;
    document.getElementById("stats").innerHTML = `
      <div class="card tinted projetos">
        <div class="stat-label">Já faturado</div>
        <div class="stat-value num delta ${r.faturado > 0 ? "up" : "flat"}">${fmt.moeda(r.faturado)}</div>
        <div class="stat-sub">${(projeto.recebimentos || []).length} ${(projeto.recebimentos || []).length === 1 ? "recebimento" : "recebimentos"}</div>
      </div>
      <div class="card tinted projetos">
        <div class="stat-label">Custos</div>
        <div class="stat-value num">${fmt.moeda(r.custoTotal)}</div>
        <div class="stat-sub">${(projeto.custos || []).length} ${(projeto.custos || []).length === 1 ? "lançamento" : "lançamentos"}</div>
      </div>
      <div class="card tinted projetos">
        <div class="stat-label">Resultado</div>
        <div class="stat-value num delta ${r.lucro >= 0 ? "up" : "down"}">${r.lucro < 0 ? "−" : ""}${fmt.moeda(Math.abs(r.lucro))}</div>
        <div class="stat-sub">faturado menos custos</div>
      </div>
      <div class="card tinted projetos">
        <div class="stat-label">Renda estimada</div>
        <div class="stat-value num">${semMeta ? "—" : fmt.moeda(r.metaMensal)}</div>
        <div class="stat-sub">${semMeta ? "informe quanto espera por mês" : "esperado por mês"}</div>
      </div>`;
  }

  function renderProgresso(r) {
    const box = document.getElementById("progresso");
    box.innerHTML = "";
    if (!r.passos.total) return;
    box.appendChild(
      UI.medidor({
        rotulo: "Progresso",
        atual: r.passos.feitos,
        alvo: r.passos.total,
        formatar: (n) => `${n}`,
        sufixo: " etapas",
        cor: "var(--s-projetos)",
      })
    );
  }

  function renderEtapas() {
    const box = document.getElementById("etapas");
    box.innerHTML = "";
    const passos = projeto.passos || [];

    if (!passos.length) {
      box.appendChild(
        UI.vazio({
          icone: "◇",
          titulo: "Sem etapas ainda",
          texto: "Quebre o projeto em passos concretos para enxergar o avanço e saber qual é o próximo movimento.",
          rotuloAcao: "Adicionar etapa",
          aoAcionar: novaEtapa,
        })
      );
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list";
    passos.forEach((s) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <input type="checkbox" class="check" ${s.feito ? "checked" : ""} aria-label="Concluir etapa" />
        <span class="grow">
          <span class="title ${s.feito ? "strike" : ""}">${fmt.escape(s.texto)}</span>
          ${s.prazo ? `<span class="meta">${fmt.data(s.prazo)}</span>` : ""}
        </span>
        <span class="row-actions">
          <button class="btn ghost sm" data-editar>Editar</button>
          <button class="btn ghost sm" data-remover>Remover</button>
        </span>`;
      li.querySelector("input").addEventListener("change", (ev) => {
        Store.subAtualizar(CAMINHO, id, "passos", s.id, { feito: ev.target.checked });
        render();
      });
      li.querySelector("[data-editar]").addEventListener("click", () => editarEtapa(s));
      li.querySelector("[data-remover]").addEventListener("click", () => removerSub("passos", s, "Etapa"));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function renderFicha(r) {
    const dias = projeto.deadline ? UI.diasAte(projeto.deadline) : null;
    const linhas = [
      ["Situação", projeto.status],
      ["Tipo", projeto.tipo],
      ["Cliente ou parceiro", projeto.cliente],
      ["Prioridade", projeto.prioridade],
      ["Início", projeto.inicio ? fmt.data(projeto.inicio) : ""],
      ["Prazo", projeto.deadline
        ? `${fmt.data(projeto.deadline)}${dias !== null && !r.encerrado ? ` · ${dias < 0 ? `${Math.abs(dias)} dias atrás` : `faltam ${dias} dias`}` : ""}`
        : ""],
      ["Dedicação", projeto.horasSemana ? `${projeto.horasSemana} h por semana` : ""],
      ["Renda estimada", r.metaMensal ? `${fmt.moeda(r.metaMensal)} por mês` : ""],
    ].filter(([, v]) => v);

    const box = document.getElementById("ficha");
    box.innerHTML = `
      <dl class="ficha">
        ${linhas.map(([k, v]) => `<div><dt>${fmt.escape(k)}</dt><dd>${fmt.escape(v)}</dd></div>`).join("")}
      </dl>
      ${projeto.link ? `<a class="btn sm" href="${fmt.escape(projeto.link)}" target="_blank" rel="noopener" style="margin-top:12px;">Abrir link do projeto ↗</a>` : ""}`;
  }

  /* ---------------------- Recebimentos e custos (dinheiro) ------------------- */

  // As duas listas têm a mesma forma, então compartilham o desenho: muda só o
  // rótulo, a cor do valor e a coleção onde os itens moram.
  function renderMovimentos({ campo, alvo, vazio, cor, sinal }) {
    const box = document.getElementById(alvo);
    box.innerHTML = "";
    const lista = (projeto[campo] || [])
      .slice()
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));

    if (!lista.length) {
      box.appendChild(UI.vazio(vazio));
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "list";
    lista.forEach((m) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="grow">
          <span class="title">${fmt.escape(m.descricao || "(sem descrição)")}</span>
          <span class="meta">${m.data ? fmt.data(m.data) : "sem data"}</span>
        </span>
        <span class="num" style="font-weight:660; color:${cor};">${sinal}${fmt.moeda(Math.abs(Number(m.valor) || 0))}</span>
        <span class="row-actions">
          <button class="btn ghost sm" data-editar>Editar</button>
          <button class="btn ghost sm" data-remover>Remover</button>
        </span>`;
      li.querySelector("[data-editar]").addEventListener("click", () => editarMovimento(campo, m));
      li.querySelector("[data-remover]").addEventListener("click", () =>
        removerSub(campo, m, campo === "recebimentos" ? "Recebimento" : "Custo")
      );
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function renderRecebimentos(r) {
    const n = (projeto.recebimentos || []).length;
    document.getElementById("recebimentos-resumo").textContent = n ? `${fmt.moeda(r.faturado)} no total` : "";
    renderMovimentos({
      campo: "recebimentos",
      alvo: "recebimentos",
      cor: "var(--success-text)",
      sinal: "+",
      vazio: {
        icone: "◍",
        titulo: "Nada recebido ainda",
        texto: "Registre cada pagamento à medida que entra. O total do projeto sai sempre desta lista.",
        rotuloAcao: "Registrar recebimento",
        aoAcionar: novoRecebimento,
      },
    });
  }

  function renderCustos() {
    renderMovimentos({
      campo: "custos",
      alvo: "custos",
      cor: "var(--ink)",
      sinal: "−",
      vazio: {
        icone: "◍",
        titulo: "Nenhum custo lançado",
        texto: "Material, anúncio, transporte, ferramenta paga — o que o projeto consome antes de dar retorno.",
        rotuloAcao: "Lançar custo",
        aoAcionar: novoCusto,
      },
    });
  }

  /* ------------------------------- Documentos -------------------------------- */

  function renderAnexos() {
    const box = document.getElementById("anexos");
    box.innerHTML = "";
    const anexos = projeto.anexos || [];

    if (!anexos.length) {
      box.appendChild(
        UI.vazio({
          icone: "◫",
          titulo: "Nenhum documento anexado",
          texto: "Contrato, proposta, material de divulgação, planilha — os arquivos ficam neste navegador e entram no backup.",
          rotuloAcao: "Anexar documentos",
          aoAcionar: editarAnexos,
        })
      );
      return;
    }

    const lista = document.createElement("div");
    lista.className = "anexos";
    lista.innerHTML = anexos
      .map((a) => {
        const cls = Arquivos.classificar(a);
        return `<button class="anexo" type="button" data-abrir="${fmt.escape(a.id)}">
            <span class="anexo-ic ${cls.classe}">${fmt.escape(cls.rotulo)}</span>
            <span class="anexo-nome">${fmt.escape(a.nome)}
              <span class="anexo-meta">${fmt.escape(Arquivos.tamanhoLegivel(a.tamanho))}</span>
            </span>
            <span class="muted" style="font-size:11px;">abrir ↗</span>
          </button>`;
      })
      .join("");

    lista.querySelectorAll("[data-abrir]").forEach((el) => {
      const a = anexos.find((x) => x.id === el.dataset.abrir);
      el.addEventListener("click", async () => {
        try { await Arquivos.abrirAnexo(a); }
        catch (err) { UI.toast(err.message); }
      });
    });
    box.appendChild(lista);
  }

  function renderAnotacoes() {
    const box = document.getElementById("anotacoes");
    box.innerHTML = "";
    if (!projeto.anotacoes) {
      box.appendChild(
        UI.vazio({
          icone: "✎",
          titulo: "Sem anotações",
          texto: "Contatos, combinados, valores acertados, ideias para a próxima rodada — o caderno solto do projeto.",
          rotuloAcao: "Escrever anotações",
          aoAcionar: editarAnotacoes,
        })
      );
      return;
    }
    const p = document.createElement("div");
    p.className = "resumo-texto";
    p.textContent = projeto.anotacoes;
    box.appendChild(p);
  }

  /* --------------------------------- Ações ---------------------------------- */

  const camposProjeto = () => [
    { tipo: "secao", rotulo: "O projeto" },
    { nome: "nome", rotulo: "Nome do projeto", tipo: "text", obrigatorio: true, placeholder: "Ex.: Monitoria de fisiologia" },
    { nome: "status", rotulo: "Situação", tipo: "select", opcoes: STATUS },
    { nome: "tipo", rotulo: "Tipo", tipo: "select", opcoes: TIPOS },
    { nome: "descricao", rotulo: "Descrição", tipo: "textarea", placeholder: "O que é, para quem, como cobra…" },
    { nome: "cliente", rotulo: "Cliente ou parceiro", tipo: "text", placeholder: "Para quem você entrega" },
    { nome: "link", rotulo: "Link", tipo: "text", placeholder: "https://… (site, Drive, perfil)" },

    { tipo: "secao", rotulo: "Ritmo e prazo" },
    { nome: "inicio", rotulo: "Início", tipo: "date" },
    { nome: "deadline", rotulo: "Prazo", tipo: "date" },
    { nome: "prioridade", rotulo: "Prioridade", tipo: "select", opcoes: PRIORIDADES },
    { nome: "horasSemana", rotulo: "Horas por semana", tipo: "number", step: "1", placeholder: "Ex.: 6" },

    { tipo: "secao", rotulo: "Dinheiro" },
    { nome: "rendaEstimada", rotulo: "Renda estimada por mês (R$)", tipo: "dinheiro", dica: "Quanto você espera que renda quando estiver rodando. O que já entrou vem da lista de recebimentos." },
  ];

  const camposMovimento = (rotuloValor) => [
    { nome: "descricao", rotulo: "Descrição", tipo: "text", obrigatorio: true, placeholder: "Ex.: Turma de outubro" },
    { nome: "valor", rotulo: rotuloValor, tipo: "dinheiro", obrigatorio: true, placeholder: "0,00" },
    { nome: "data", rotulo: "Data", tipo: "date", valorPadrao: UI.hojeISO() },
  ];

  async function editarProjeto() {
    const v = await UI.formulario({
      titulo: "Editar projeto",
      campos: camposProjeto(),
      valores: projeto,
      largo: true,
    });
    if (!v) return;
    Store.atualizar(CAMINHO, id, v);
    UI.toast("Projeto atualizado.");
    render();
  }

  async function novaEtapa() {
    const v = await UI.formulario({
      titulo: "Nova etapa",
      descricao: `Adicionar um passo a "${projeto.nome}".`,
      campos: [
        { nome: "texto", rotulo: "O que precisa ser feito", tipo: "text", obrigatorio: true, placeholder: "Ex.: Divulgar nas turmas do 3º semestre" },
        { nome: "prazo", rotulo: "Prazo da etapa", tipo: "date" },
      ],
      rotuloConfirmar: "Adicionar",
    });
    if (!v) return;
    Store.subInserir(CAMINHO, id, "passos", { ...v, feito: false });
    UI.toast("Etapa adicionada.");
    render();
  }

  async function editarEtapa(s) {
    const v = await UI.formulario({
      titulo: "Editar etapa",
      campos: [
        { nome: "texto", rotulo: "O que precisa ser feito", tipo: "text", obrigatorio: true },
        { nome: "prazo", rotulo: "Prazo da etapa", tipo: "date" },
      ],
      valores: s,
    });
    if (!v) return;
    Store.subAtualizar(CAMINHO, id, "passos", s.id, v);
    UI.toast("Etapa atualizada.");
    render();
  }

  async function novoRecebimento() {
    const v = await UI.formulario({
      titulo: "Novo recebimento",
      descricao: "O total já faturado do projeto é a soma destes lançamentos.",
      campos: camposMovimento("Valor recebido (R$)"),
    });
    if (!v) return;
    Store.subInserir(CAMINHO, id, "recebimentos", v);
    UI.toast("Recebimento registrado.");
    render();
  }

  async function novoCusto() {
    const v = await UI.formulario({
      titulo: "Novo custo",
      descricao: "O que o projeto consumiu — material, anúncio, transporte, ferramenta.",
      campos: camposMovimento("Valor gasto (R$)"),
    });
    if (!v) return;
    Store.subInserir(CAMINHO, id, "custos", v);
    UI.toast("Custo lançado.");
    render();
  }

  async function editarMovimento(campo, m) {
    const recebimento = campo === "recebimentos";
    const v = await UI.formulario({
      titulo: recebimento ? "Editar recebimento" : "Editar custo",
      campos: camposMovimento(recebimento ? "Valor recebido (R$)" : "Valor gasto (R$)"),
      valores: m,
    });
    if (!v) return;
    Store.subAtualizar(CAMINHO, id, campo, m.id, v);
    UI.toast(recebimento ? "Recebimento atualizado." : "Custo atualizado.");
    render();
  }

  async function editarAnotacoes() {
    const v = await UI.formulario({
      titulo: "Anotações do projeto",
      descricao: "Espaço livre: combinados, contatos, valores acertados, próximas ideias.",
      campos: [{ nome: "anotacoes", rotulo: "Anotações", tipo: "textarea" }],
      valores: projeto,
    });
    if (!v) return;
    Store.atualizar(CAMINHO, id, v);
    UI.toast("Anotações salvas.");
    render();
  }

  async function editarAnexos() {
    const v = await UI.formulario({
      titulo: "Documentos do projeto",
      descricao: "Contrato, proposta, arte de divulgação, planilha de controle.",
      campos: [{
        nome: "anexos", rotulo: "Documentos", tipo: "anexos",
        dica: "Ficam guardados neste navegador e entram no backup.",
      }],
      valores: projeto,
    });
    if (!v) return;
    Store.atualizar(CAMINHO, id, v);
    UI.toast("Documentos atualizados.");
    render();
  }

  /** Remoção de um item de sub-lista, sempre com janela de desfazer. */
  function removerSub(campo, item, rotulo) {
    const antes = [...(projeto[campo] || [])];
    Store.subRemover(CAMINHO, id, campo, item.id);
    render();
    UI.toast(`${rotulo} remov${rotulo === "Etapa" ? "ida" : "ido"}.`, {
      acaoRotulo: "Desfazer",
      aoAcionar: () => { Store.atualizar(CAMINHO, id, { [campo]: antes }); render(); },
    });
  }

  document.getElementById("btn-editar").addEventListener("click", editarProjeto);
  document.getElementById("btn-recebimento").addEventListener("click", novoRecebimento);
  document.getElementById("btn-etapa").addEventListener("click", novaEtapa);
  document.getElementById("btn-custo").addEventListener("click", novoCusto);
  document.getElementById("btn-anexos").addEventListener("click", editarAnexos);
  document.getElementById("btn-anotacoes").addEventListener("click", editarAnotacoes);

  render();
})();
