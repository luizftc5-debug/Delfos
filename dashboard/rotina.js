/* A rotina da semana (aba Pessoal): o que se repete de segunda a domingo,
   como aulas, trabalho, treino e estudo. É o segundo eixo do calendário: o
   mês guarda os compromissos pontuais (com data); a rotina guarda o que tem
   dia da semana e horário, sem data. As duas coisas não se misturam: uma aula
   de toda segunda não enche o calendário do mês. */

const Rotina = (() => {
  const CAMINHO = "pessoal.rotina";
  const { fmt } = UI;
  const ORDEM = [1, 2, 3, 4, 5, 6, 0];
  const NOMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  // A cor segue a regra do painel: cor identifica a área. Aula e estudo são
  // da Faculdade; trabalho, de Projetos; o resto, do Pessoal. O nome da
  // categoria vai sempre escrito ao lado (cor nunca é o único sinal).
  const CATEGORIAS = [
    { id: "aula", nome: "Aula", cor: "var(--s-faculdade)", icone: "faculdade" },
    { id: "estudo", nome: "Estudo", cor: "var(--s-faculdade)", icone: "livro" },
    { id: "trabalho", nome: "Trabalho", cor: "var(--s-projetos)", icone: "maleta" },
    { id: "treino", nome: "Treino", cor: "var(--s-pessoal)", icone: "haltere" },
    { id: "pessoal", nome: "Pessoal", cor: "var(--s-pessoal)", icone: "pessoal" },
    { id: "outro", nome: "Outro", cor: "var(--texto-3)", icone: "relogio" },
  ];
  const categoria = (id) => CATEGORIAS.find((c) => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1];

  const sem = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  /** Um palpite de categoria pelo nome, para o formulário e a importação já virem certos. */
  function categoriaProvavel(titulo) {
    const t = sem(titulo);
    if (/\b(academia|treino|musculacao|corrida|correr|futebol|natacao|pilates|crossfit|luta|jiu|yoga|ioga|bike|ciclismo|caminhada|funcional|volei|basquete)/.test(t)) return "treino";
    if (/\b(estudo|estudar|revisao|revisar|leitura|ler|questoes|simulado|resumo|flashcard|anki)/.test(t)) return "estudo";
    if (/\b(trabalho|plantao|estagio|monitoria|reuniao|expediente|freela|atendimento|consultorio|turno|escala)/.test(t)) return "trabalho";
    if (/\b(aula|disciplina|seminario|laboratorio|lab|pratica|teorica|tutoria|pbl|ambulatorio|internato|enfermaria|anatomia|fisiologia|bioquimica|histologia|patologia|farmacologia|semiologia|microbiologia|imunologia|genetica|embriologia|clinica|cirurgia|pediatria|ginecologia|obstetricia|psiquiatria|saude coletiva|epidemiologia|ingles|espanhol|calculo|fisica|quimica)/.test(t)) return "aula";
    if (/\b(igreja|missa|culto|terapia|psicologo|familia|mercado|faxina)/.test(t)) return "pessoal";
    return typeof Personalizacao !== "undefined" && Personalizacao.eEstudante?.() ? "aula" : "outro";
  }

  const lista = () => Store.lista(CAMINHO);
  const minutos = (h) => (/^\d{2}:\d{2}$/.test(h || "") ? +h.slice(0, 2) * 60 + +h.slice(3) : null);
  // Término antes do início é virada de dia (plantão das 19:00 às 07:00).
  const viraDia = (a) => minutos(a.hora) !== null && minutos(a.horaFim) !== null && minutos(a.horaFim) < minutos(a.hora);
  const duracao = (a) => {
    const i = minutos(a.hora), f = minutos(a.horaFim);
    if (i === null || f === null || f === i) return 0;
    return f > i ? f - i : f + 1440 - i;
  };
  const horasTexto = (min) => { const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`; };
  const faixa = (a) => (a.hora ? `${a.hora}${a.horaFim ? `–${a.horaFim}` : ""}` : "Sem horário");

  /** As atividades de um dia, por horário (sem horário no fim), com os choques marcados. */
  function doDia(dia) {
    const itens = lista().filter((a) => (a.dias || []).includes(dia))
      .sort((a, b) => (a.hora || "99").localeCompare(b.hora || "99") || String(a.titulo).localeCompare(String(b.titulo)));
    const choques = new Map();
    itens.forEach((a, i) => {
      const ini = minutos(a.hora), fim = ini === null ? null : ini + (duracao(a) || 1);
      if (ini === null) return;
      for (const b of itens.slice(i + 1)) {
        const bi = minutos(b.hora);
        if (bi === null || bi >= fim) continue;
        choques.set(a.id, b.titulo);
        choques.set(b.id, a.titulo);
      }
    });
    return itens.map((a) => ({ ...a, choque: choques.get(a.id) || "" }));
  }

  /** O que está acontecendo agora e o próximo de hoje. */
  function agoraEProxima() {
    const d = new Date();
    const hoje = d.getDay();
    const agora = d.getHours() * 60 + d.getMinutes();
    const itens = doDia(hoje).filter((a) => a.hora);
    const atual = itens.find((a) => minutos(a.hora) <= agora && agora < minutos(a.hora) + (duracao(a) || 1));
    const proxima = itens.find((a) => minutos(a.hora) > agora);
    return { hoje, atual, proxima, itens };
  }

  /** Uma frase com o dia de hoje e o peso da semana por categoria. */
  function resumo() {
    const todas = lista();
    if (!todas.length) return "";
    const { hoje, atual, proxima } = agoraEProxima();
    const partes = [];
    const nHoje = doDia(hoje).length;
    if (atual) partes.push(`Agora: <b>${fmt.escape(atual.titulo)}</b>${atual.horaFim ? `, até ${fmt.escape(atual.horaFim)}` : ""}.`);
    if (proxima) partes.push(`A próxima de hoje é <b>${fmt.escape(proxima.titulo)}</b>, às ${fmt.escape(proxima.hora)}.`);
    else if (nHoje && !atual) partes.push(`${NOMES[hoje]}: ${nHoje === 1 ? "1 atividade" : `${nHoje} atividades`}, nenhuma mais hoje.`);
    else if (!nHoje) partes.push(`Hoje, ${NOMES[hoje].toLowerCase()}, está livre na rotina.`);
    const porCat = {};
    todas.forEach((a) => { const m = duracao(a) * (a.dias || []).length; if (m) porCat[a.categoria || "outro"] = (porCat[a.categoria || "outro"] || 0) + m; });
    const pesos = Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([c, m]) => `${horasTexto(m)} de ${categoria(c).nome.toLowerCase()}`);
    if (pesos.length) partes.push(`Na semana: ${pesos.slice(0, 3).join(", ")}.`);
    return partes.join(" ");
  }

  function blocoHTML(a, ehHoje, agoraId) {
    const cat = categoria(a.categoria);
    const info = [cat.nome, viraDia(a) ? "até o dia seguinte" : "", a.local].filter(Boolean).map((x) => `<span>${fmt.escape(x)}</span>`).join("");
    const agora = ehHoje && agoraId === a.id;
    return `<li><button type="button" class="rotina-bloco ${agora ? "agora" : ""} ${a.choque ? "choque" : ""}" style="--cor:${cat.cor}" data-id="${fmt.escape(a.id)}"
        aria-label="${fmt.escape(`${a.titulo}, ${faixa(a)}, ${cat.nome}${a.local ? `, ${a.local}` : ""}${a.choque ? `, no mesmo horário que ${a.choque}` : ""}${agora ? ", acontecendo agora" : ""}. Editar`)}">
      <span class="rotina-hora">${fmt.escape(faixa(a))}${agora ? `<span class="rotina-agora">agora</span>` : ""}</span>
      <span class="rotina-titulo">${fmt.escape(a.titulo)}</span>
      <span class="rotina-info">${info}</span>
      ${a.choque ? `<span class="rotina-choque">Mesmo horário que ${fmt.escape(a.choque)}</span>` : ""}
    </button></li>`;
  }

  /**
   * A semana em linha, de segunda a domingo: uma coluna por dia (no celular,
   * um dia embaixo do outro), as atividades por horário e um "Adicionar" em
   * cada dia. Hoje vem marcado, com o que está acontecendo agora.
   */
  function montar(box, { aoMudar = () => {} } = {}) {
    const { hoje, atual } = agoraEProxima();
    const vazia = !lista().length;
    box.innerHTML = `
      ${vazia ? `<div class="rotina-vazia">
        <p class="rotina-vazia-titulo">Monte a sua semana</p>
        <p>Coloque aqui o que se repete toda semana: horário de aulas, trabalho, plantões, treino, estudo. Toque em <b>Adicionar</b> no dia, ou importe o horário de um arquivo ou de uma foto.</p>
      </div>` : ""}
      <div class="rotina-semana">
        ${ORDEM.map((d) => {
          const itens = doDia(d);
          const total = itens.reduce((t, a) => t + duracao(a), 0);
          return `<section class="rotina-dia ${d === hoje ? "hoje" : ""} ${d === 0 || d === 6 ? "fds" : ""}" aria-labelledby="rotina-dia-${d}">
            <header class="rotina-dia-cab">
              <h3 id="rotina-dia-${d}"><span class="rotina-dia-nome">${NOMES[d]}</span>${d === hoje ? `<span class="rotina-hoje">hoje</span>` : ""}</h3>
              <span class="rotina-dia-total">${itens.length ? total ? horasTexto(total) : `${itens.length}` : "livre"}</span>
            </header>
            ${itens.length ? `<ol class="rotina-blocos">${itens.map((a) => blocoHTML(a, d === hoje, atual?.id)).join("")}</ol>` : ""}
            <button type="button" class="rotina-add" data-dia="${d}" aria-label="Adicionar atividade na ${NOMES[d].toLowerCase()}">${UI.icone("mais")}<span>Adicionar</span></button>
          </section>`;
        }).join("")}
      </div>`;
    box.onclick = (ev) => {
      const add = ev.target.closest(".rotina-add");
      if (add) return abrirFormulario({ dias: [Number(add.dataset.dia)] }, aoMudar);
      const bloco = ev.target.closest(".rotina-bloco");
      if (bloco) {
        const a = lista().find((x) => x.id === bloco.dataset.id);
        if (a) abrirFormulario(a, aoMudar, Number(bloco.closest(".rotina-dia").querySelector(".rotina-add").dataset.dia));
      }
    };
  }

  const campos = () => [
    { nome: "titulo", rotulo: "O que é", tipo: "text", obrigatorio: true, placeholder: "Ex.: Anatomia, plantão, academia" },
    { nome: "dias", rotulo: "Em quais dias", tipo: "diasSemana", obrigatorio: true },
    { nome: "hora", rotulo: "Começa", tipo: "time" },
    { nome: "horaFim", rotulo: "Termina", tipo: "time", dica: "Plantão que vira a noite: ponha o horário de saída do dia seguinte." },
    { nome: "categoria", rotulo: "Tipo", tipo: "select", chips: true, opcoes: CATEGORIAS.map((c) => ({ valor: c.id, rotulo: c.nome })) },
    { nome: "local", rotulo: "Onde", tipo: "text", placeholder: "Ex.: Sala 12, hospital, online" },
    { nome: "observacoes", rotulo: "Observações", tipo: "textarea" },
  ];

  /**
   * Novo ou editar. Uma atividade de vários dias é um registro só: editar
   * muda todos os dias dela. Quem abre pelo dia (tocando no bloco) também pode
   * tirar só aquele dia, sem apagar os outros.
   */
  async function abrirFormulario(a = {}, aoMudar = () => {}, diaTocado = null) {
    const existe = !!a.id;
    const varios = existe && (a.dias || []).length > 1 && diaTocado !== null;
    const v = await UI.formulario({
      titulo: existe ? "Editar atividade da rotina" : "Nova atividade da rotina",
      descricao: existe ? "Muda em todos os dias marcados." : "Repete toda semana, nos dias marcados.",
      icone: UI.icone("relogio"), cor: "var(--s-pessoal)",
      campos: campos(),
      valores: { categoria: a.categoria || "", ...a, dias: (a.dias || []).join(",") },
      rotuloConfirmar: existe ? "Salvar" : "Adicionar",
      ...(existe ? {
        rotuloExcluir: varios ? `Tirar da ${NOMES[diaTocado].toLowerCase()}` : "Excluir",
        aoExcluir: () => (varios ? tirarDia(a, diaTocado, aoMudar) : excluir(a, aoMudar)),
      } : {}),
      preparar(form) {
        // O tipo acompanha o nome enquanto a pessoa não escolheu um.
        const titulo = form.querySelector('[name="titulo"]');
        const cat = form.querySelector('[name="categoria"]');
        let escolhido = !!a.categoria;
        cat.addEventListener("change", () => { escolhido = true; });
        const sugerir = () => {
          if (escolhido) return;
          const c = categoriaProvavel(titulo.value);
          cat.value = c;
          cat.closest(".field").querySelectorAll("button[data-valor]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.valor === c)));
        };
        titulo.addEventListener("input", sugerir);
        sugerir();
      },
    });
    if (!v) return;
    const dados = {
      titulo: v.titulo, dias: String(v.dias).split(",").filter((x) => x !== "").map(Number),
      hora: v.hora || "", horaFim: v.hora && v.horaFim && v.horaFim !== v.hora ? v.horaFim : "",
      categoria: v.categoria || categoriaProvavel(v.titulo), local: v.local || "", observacoes: v.observacoes || "",
    };
    if (existe) Store.atualizar(CAMINHO, a.id, dados);
    else Store.inserir(CAMINHO, { ...dados, criadoEm: new Date().toISOString() });
    UI.toast(viraDia(dados) ? `Salvo. Termina às ${dados.horaFim} do dia seguinte.` : existe ? "Rotina atualizada." : "Atividade adicionada à rotina.");
    aoMudar();
  }

  function excluir(a, aoMudar) {
    const indice = Store.indiceDe(CAMINHO, a.id);
    Store.remover(CAMINHO, a.id);
    aoMudar();
    UI.toast("Atividade excluída da rotina.", { acaoRotulo: "Desfazer", aoAcionar: () => { Store.restaurar(CAMINHO, a, indice); aoMudar(); } });
  }

  function tirarDia(a, dia, aoMudar) {
    // `a` é o próprio registro guardado: a lista de antes precisa ser copiada.
    const antes = [...a.dias];
    Store.atualizar(CAMINHO, a.id, { dias: antes.filter((d) => d !== dia) });
    aoMudar();
    UI.toast(`Tirada da ${NOMES[dia].toLowerCase()}. Continua nos outros dias.`, { acaoRotulo: "Desfazer", aoAcionar: () => { Store.atualizar(CAMINHO, a.id, { dias: antes }); aoMudar(); } });
  }

  /** A rotina numa planilha do Excel: quadro de horário de segunda a domingo e a lista, com horas por tipo. */
  async function exportar() {
    if (!lista().length) return UI.toast("A rotina ainda está vazia: adicione ou importe as atividades antes.");
    try {
      const { planilhaRotina, baixar } = await import("./planilha.mjs");
      const nome = (Store.estado().perfil?.nome || "").trim().split(/\s+/)[0] || "";
      baixar(planilhaRotina(lista(), { hoje: UI.hojeISO(), nome }), "Delfos - Rotina da semana.xlsx");
      UI.toast("Planilha da rotina baixada. Abra no Excel, Google Planilhas ou Numbers.");
    } catch (e) {
      console.error(e);
      UI.toast("Não deu para montar a planilha agora. Tente de novo.");
    }
  }

  return { exportar, CAMINHO, CATEGORIAS, NOMES, categoria, categoriaProvavel, doDia, resumo, montar, abrirFormulario };
})();
