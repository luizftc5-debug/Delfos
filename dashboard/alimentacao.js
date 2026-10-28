/* A aba pronta "Alimentação" (modelo "alimentacao"): o plano alimentar por
   refeição, as calorias e os macros de hoje contra a meta, o que se comeu
   fora do plano, os objetivos, e a importação da dieta de um arquivo ou foto.
   As contas e a leitura do arquivo moram em dieta.mjs (puro, testado).

   Guardado na própria aba (pilar):
   - alimentacao = { objetivo, objetivos, metaKcal, metaProteina, metaCarbo, metaGordura }
   - plano = [{ id, nome, hora, itens: [{ id, alimento, quantidade, gramas, kcal, proteina, carbo, gordura, estimado, substituicoes }] }]
   - diario = { "AAAA-MM-DD": { feitas: [id da refeição], extras: [{ id, alimento, quantidade, kcal, proteina, carbo, gordura, estimado }] } }

   O Delfos não prescreve dieta: organiza a que a pessoa, ou o nutricionista
   dela, definiu. Estimativas vêm da Tabela TACO e são marcadas como tal. */

const Alimentacao = (() => {
  const { fmt } = UI;
  const CAMINHO = "pilares";
  const OBJETIVOS = ["", "Perder peso", "Manter o peso", "Ganhar massa muscular", "Comer melhor", "Outro"];
  const uid = (p) => Store.uid(p);
  let dieta = null; // dieta.mjs, carregado na primeira vez
  const carregarDieta = async () => (dieta ||= await import("./dieta.mjs"));

  const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  const kcalTxt = (n) => `${fmt.decimal(Math.round(n || 0), 0)} kcal`;
  const g = (n) => `${fmt.decimal(n || 0, (n || 0) % 1 ? 1 : 0)} g`;

  // Soma igual à de dieta.mjs, aqui para o desenho não esperar o módulo.
  function somar(itens) {
    const t = { kcal: 0, proteina: 0, carbo: 0, gordura: 0, incompletos: 0 };
    (itens || []).forEach((i) => {
      if (num(i.kcal) === null) t.incompletos++;
      t.kcal += num(i.kcal) || 0; t.proteina += num(i.proteina) || 0; t.carbo += num(i.carbo) || 0; t.gordura += num(i.gordura) || 0;
    });
    return t;
  }

  function dados(pilar) {
    const a = { objetivo: "", objetivos: "", metaKcal: null, metaProteina: null, metaCarbo: null, metaGordura: null, ...(pilar.alimentacao || {}) };
    return { a, plano: Array.isArray(pilar.plano) ? pilar.plano : [], diario: pilar.diario && typeof pilar.diario === "object" ? pilar.diario : {} };
  }
  const salvar = (pilar, patch) => Store.atualizar(CAMINHO, pilar.id, patch);
  const doDia = (diario, iso) => ({ feitas: [], extras: [], ...(diario[iso] || {}) });

  /** O que se comeu num dia: refeições marcadas mais o que entrou fora do plano. */
  function consumoDe(plano, dia) {
    const comidos = plano.filter((r) => dia.feitas.includes(r.id)).flatMap((r) => r.itens);
    return somar([...comidos, ...dia.extras]);
  }

  /* --------------------------------- Tela ---------------------------------- */

  function montar({ pilar, box, evolucao, aoMudar }) {
    const { a, plano, diario } = dados(pilar);
    const hoje = UI.hojeISO();
    const dia = doDia(diario, hoje);
    const consumo = consumoDe(plano, dia);
    const totalPlano = somar(plano.flatMap((r) => r.itens));
    const meta = num(a.metaKcal);
    const pct = meta ? Math.min(100, Math.round((consumo.kcal / meta) * 100)) : 0;
    const resta = meta ? meta - consumo.kcal : null;
    const macro = (rotulo, atual, alvo) => `<div class="ali-macro"><span>${rotulo}</span><b>${g(atual)}</b>${num(alvo) ? `<small>de ${g(alvo)}</small><i class="ali-macro-barra"><i style="width:${Math.min(100, (atual / alvo) * 100)}%"></i></i>` : ""}</div>`;
    const vazio = !plano.length;

    box.innerHTML = `
      <div class="ali-hoje">
        <div class="ali-hoje-cab">
          <div>
            <h2 class="ali-titulo">Hoje, ${fmt.escape(new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }))}</h2>
            <p class="ali-apoio">${meta ? (resta >= 0 ? `Faltam <b>${kcalTxt(resta)}</b> para a meta do dia.` : `<span class="atencao">${kcalTxt(-resta)} acima da meta do dia.</span>`) : `Defina uma meta de calorias em <b>Objetivos e metas</b> para acompanhar o dia.`}</p>
          </div>
          <div class="ali-acoes">
            <button class="btn" type="button" data-ali="importar">${UI.icone("importar")}Importar dieta</button>
            <button class="btn ghost" type="button" data-ali="objetivos">${UI.icone("alvo")}Objetivos e metas</button>
          </div>
        </div>
        <div class="ali-placar">
          <div class="ali-kcal"><span class="voz num">${fmt.decimal(Math.round(consumo.kcal), 0)}</span><span>${meta ? `de ${fmt.decimal(meta, 0)} kcal` : "kcal hoje"}</span></div>
          ${meta ? `<div class="meter-track ali-barra" role="progressbar" aria-label="Calorias de hoje" aria-valuemin="0" aria-valuemax="${meta}" aria-valuenow="${Math.round(consumo.kcal)}"><div class="meter-fill" style="width:${pct}%; background:${resta < 0 ? "var(--st-warning)" : fmt.escape(pilar.cor)}"></div></div>` : ""}
          <div class="ali-macros">${macro("Proteína", consumo.proteina, a.metaProteina)}${macro("Carboidrato", consumo.carbo, a.metaCarbo)}${macro("Gordura", consumo.gordura, a.metaGordura)}</div>
        </div>
      </div>

      ${vazio ? `<div class="empty ali-comeco">
        <h3 class="comeco-titulo">Monte sua dieta</h3>
        <p>Traga o plano alimentar que você já tem (PDF, foto ou print, planilha do Excel ou CSV): o Delfos lê as refeições e os alimentos, soma as calorias e monta tudo aqui, para você conferir antes. Ou monte refeição por refeição.</p>
        <div class="ali-acoes"><button class="btn primary" type="button" data-ali="importar">${UI.icone("importar")}Importar dieta de um arquivo</button><button class="btn" type="button" data-ali="refeicao">Montar à mão</button></div>
      </div>` : `
      <section class="ali-plano" aria-labelledby="ali-plano-t">
        <header class="ali-sec-cab">
          <div><h2 class="ali-titulo" id="ali-plano-t">Plano alimentar</h2>
          <p class="ali-apoio">${kcalTxt(totalPlano.kcal)} no plano${(() => { const d = totalPlano.kcal ? distribuicao(totalPlano) : null; return d ? `; proteína ${d.proteina}%, carboidrato ${d.carbo}%, gordura ${d.gordura}% das calorias` : ""; })()}${totalPlano.incompletos ? `. <span class="atencao">${totalPlano.incompletos} sem calorias</span>` : ""}. Marque <b>Comi</b> em cada refeição de hoje.</p></div>
          <button class="btn sm" type="button" data-ali="refeicao">+ Refeição</button>
        </header>
        <div class="ali-refeicoes">${plano.map((r) => refeicaoHTML(r, dia)).join("")}</div>
      </section>`}

      <section class="ali-extras" aria-labelledby="ali-extras-t">
        <header class="ali-sec-cab"><div><h2 class="ali-titulo" id="ali-extras-t">Fora do plano, hoje</h2>
        <p class="ali-apoio">O que você comeu além do plano. Com a quantidade (por exemplo, 150 g ou 2 unidades), o Delfos estima as calorias pela Tabela TACO.</p></div></header>
        <form class="ali-extra-form" data-extra autocomplete="off">
          <label class="sr" for="ali-extra-nome">O que você comeu</label>
          <input class="input" id="ali-extra-nome" name="alimento" placeholder="Ex.: 2 pães franceses, ou 150 g de arroz" maxlength="120" />
          <label class="sr" for="ali-extra-kcal">Calorias, se souber</label>
          <input class="input" id="ali-extra-kcal" name="kcal" type="number" min="0" max="5000" inputmode="numeric" placeholder="kcal (opcional)" />
          <button class="btn sm" type="submit">Adicionar</button>
        </form>
        ${dia.extras.length ? `<ul class="ali-itens">${dia.extras.map((i) => itemHTML(i, "extra")).join("")}</ul>` : ""}
      </section>

      ${a.objetivo || a.objetivos ? `<section class="ali-objetivos"><h2 class="ali-titulo">Seus objetivos</h2>${a.objetivo ? `<p><b>${fmt.escape(a.objetivo)}</b></p>` : ""}${a.objetivos ? `<p class="ali-objetivos-texto">${fmt.escape(a.objetivos)}</p>` : ""}</section>` : ""}

      <p class="ali-nota">O Delfos organiza a dieta que você ou seu nutricionista definiu; não prescreve dieta. Calorias marcadas como <i>estimado</i> vêm da Tabela TACO (Unicamp) e de rótulos médios, pela quantidade escrita.</p>`;

    box.onclick = (ev) => {
      const b = ev.target.closest("[data-ali]");
      if (!b) return;
      const acao = b.dataset.ali;
      const r = plano.find((x) => x.id === b.dataset.refeicao);
      if (acao === "importar") return importar(pilar, aoMudar);
      if (acao === "objetivos") return editarObjetivos(pilar, aoMudar);
      if (acao === "refeicao") return editarRefeicao(pilar, null, aoMudar);
      if (acao === "editar-refeicao") return editarRefeicao(pilar, r, aoMudar);
      if (acao === "novo-item") return editarItem(pilar, r, null, aoMudar);
      if (acao === "editar-item") return editarItem(pilar, r, r.itens.find((i) => i.id === b.dataset.item), aoMudar);
      if (acao === "excluir-item") return excluirItem(pilar, r, b.dataset.item, aoMudar);
      if (acao === "excluir-extra") return excluirExtra(pilar, b.dataset.item, aoMudar);
    };
    box.onchange = (ev) => {
      const c = ev.target.closest("[data-comi]");
      if (c) marcarComi(pilar, c.dataset.comi, c.checked, aoMudar);
    };
    box.querySelector("[data-extra]").onsubmit = (ev) => { ev.preventDefault(); adicionarExtra(pilar, ev.target, aoMudar); };
    carregarDieta().catch(() => {}); // aquece o módulo das contas
    if (evolucao) montarEvolucao(pilar, evolucao);
  }

  // A mesma conta de dieta.mjs (4/4/9 kcal por grama), para o desenho síncrono.
  function distribuicao({ proteina, carbo, gordura }) {
    const kP = proteina * 4, kC = carbo * 4, kG = gordura * 9, t = kP + kC + kG;
    return t ? { proteina: Math.round((kP / t) * 100), carbo: Math.round((kC / t) * 100), gordura: Math.round((kG / t) * 100) } : null;
  }

  function refeicaoHTML(r, dia) {
    const t = somar(r.itens);
    const comi = dia.feitas.includes(r.id);
    return `<article class="ali-refeicao ${comi ? "comi" : ""}">
      <header>
        <label class="ali-comi"><input type="checkbox" class="check" data-comi="${fmt.escape(r.id)}" ${comi ? "checked" : ""} aria-label="Comi ${fmt.escape(r.nome)} hoje" /><span>Comi</span></label>
        <button type="button" class="ali-refeicao-nome" data-ali="editar-refeicao" data-refeicao="${fmt.escape(r.id)}">
          <b>${fmt.escape(r.nome)}</b>${r.hora ? `<span>${fmt.escape(r.hora)}</span>` : ""}
        </button>
        <span class="ali-refeicao-kcal">${kcalTxt(t.kcal)}${t.incompletos ? `<small class="atencao">${t.incompletos} sem kcal</small>` : ""}</span>
      </header>
      <ul class="ali-itens">${r.itens.map((i) => itemHTML(i, "plano", r.id)).join("")}</ul>
      <button type="button" class="btn ghost sm ali-mais" data-ali="novo-item" data-refeicao="${fmt.escape(r.id)}">+ Alimento</button>
    </article>`;
  }

  function itemHTML(i, onde, refeicaoId = "") {
    const macros = [num(i.proteina) !== null ? `P ${g(i.proteina)}` : "", num(i.carbo) !== null ? `C ${g(i.carbo)}` : "", num(i.gordura) !== null ? `G ${g(i.gordura)}` : ""].filter(Boolean).join(", ");
    return `<li class="ali-item">
      <span class="ali-item-texto">
        <span class="ali-item-nome">${fmt.escape(i.alimento)}${i.quantidade ? ` <span class="ali-qtd">${fmt.escape(i.quantidade)}</span>` : ""}</span>
        ${macros || i.substituicoes ? `<span class="ali-item-info">${[macros, i.substituicoes ? `ou ${fmt.escape(i.substituicoes)}` : ""].filter(Boolean).join("; ")}</span>` : ""}
      </span>
      <span class="ali-item-kcal">${num(i.kcal) !== null ? kcalTxt(i.kcal) : `<span class="atencao">sem kcal</span>`}${i.estimado ? `<small title="Estimado pela Tabela TACO pela quantidade">estimado</small>` : ""}</span>
      <span class="row-actions">
        ${onde === "plano" ? `<button class="btn ghost sm icon" type="button" data-ali="editar-item" data-refeicao="${fmt.escape(refeicaoId)}" data-item="${fmt.escape(i.id)}" aria-label="Editar ${fmt.escape(i.alimento)}">${UI.icone("editar")}</button>
        <button class="btn ghost sm icon" type="button" data-ali="excluir-item" data-refeicao="${fmt.escape(refeicaoId)}" data-item="${fmt.escape(i.id)}" aria-label="Excluir ${fmt.escape(i.alimento)}">${UI.icone("lixeira")}</button>`
        : `<button class="btn ghost sm icon" type="button" data-ali="excluir-extra" data-item="${fmt.escape(i.id)}" aria-label="Excluir ${fmt.escape(i.alimento)}">${UI.icone("lixeira")}</button>`}
      </span>
    </li>`;
  }

  /** Os últimos 7 dias contra a meta, a média e quantos ficaram na faixa. */
  function montarEvolucao(pilar, box) {
    const { a, plano, diario } = dados(pilar);
    const meta = num(a.metaKcal);
    const dias = Array.from({ length: 7 }, (_, k) => UI.isoMaisDias(k - 6));
    const linhas = dias.map((iso) => {
      const c = consumoDe(plano, doDia(diario, iso));
      return { iso, nome: fmt.capitalizar(new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" })), valor: Math.round(c.kcal), meta: meta || 0, acima: meta ? c.kcal > meta * 1.1 : false };
    });
    const comRegistro = linhas.filter((l) => l.valor > 0);
    const media = comRegistro.length ? Math.round(comRegistro.reduce((t, l) => t + l.valor, 0) / comRegistro.length) : 0;
    const naFaixa = meta ? comRegistro.filter((l) => l.valor >= meta * 0.9 && l.valor <= meta * 1.1).length : 0;
    box.innerHTML = `
      <p class="ali-apoio">${comRegistro.length
        ? `Média de <b>${kcalTxt(media)}</b> ${comRegistro.length === 1 ? "no único dia registrado" : `nos ${comRegistro.length} dias registrados`} da semana${meta ? `; ${naFaixa} de ${comRegistro.length} perto da meta (10% para mais ou para menos).` : "."}`
        : "Marque as refeições de cada dia em Hoje e dieta: aqui aparece a semana, dia a dia, contra a meta."}</p>
      <div class="ali-evolucao-barras" data-barras></div>`;
    UI.barrasComMeta(box.querySelector("[data-barras]"), linhas, { cor: pilar.cor, formatar: (v) => kcalTxt(v), rotuloMeta: "meta do dia" });
  }

  /* -------------------------------- Ações ---------------------------------- */

  function marcarComi(pilar, refeicaoId, comi, aoMudar) {
    const { diario } = dados(Store.achar(CAMINHO, pilar.id));
    const hoje = UI.hojeISO();
    const d = doDia(diario, hoje);
    d.feitas = comi ? [...new Set([...d.feitas, refeicaoId])] : d.feitas.filter((x) => x !== refeicaoId);
    salvar(pilar, { diario: { ...diario, [hoje]: d } });
    aoMudar();
  }

  async function adicionarExtra(pilar, form, aoMudar) {
    const texto = form.alimento.value.trim();
    if (!texto) { form.alimento.focus(); return; }
    const D = await carregarDieta();
    const lido = D.itemDeTexto(texto) || { alimento: texto, quantidade: "", kcal: null };
    const kcalDigitado = num(form.kcal.value);
    const item = { ...lido, id: uid("ex"), ...(kcalDigitado !== null ? { kcal: kcalDigitado, estimado: false } : {}) };
    delete item.fonte;
    const atual = Store.achar(CAMINHO, pilar.id);
    const { diario } = dados(atual);
    const hoje = UI.hojeISO();
    const d = doDia(diario, hoje);
    d.extras = [...d.extras, item];
    salvar(pilar, { diario: { ...diario, [hoje]: d } });
    UI.toast(item.kcal === null ? "Adicionado sem calorias: diga a quantidade (150 g, 2 unidades) ou as kcal para entrar na conta." : `Adicionado: ${kcalTxt(item.kcal)}${item.estimado ? ", estimado pela TACO" : ""}.`);
    aoMudar();
    document.getElementById("ali-extra-nome")?.focus();
  }

  function excluirExtra(pilar, itemId, aoMudar) {
    const { diario } = dados(Store.achar(CAMINHO, pilar.id));
    const hoje = UI.hojeISO();
    const antes = doDia(diario, hoje);
    salvar(pilar, { diario: { ...diario, [hoje]: { ...antes, extras: antes.extras.filter((x) => x.id !== itemId) } } });
    aoMudar();
    UI.toast("Excluído.", { acaoRotulo: "Desfazer", aoAcionar: () => { const atual = dados(Store.achar(CAMINHO, pilar.id)).diario; salvar(pilar, { diario: { ...atual, [hoje]: antes } }); aoMudar(); } });
  }

  async function editarObjetivos(pilar, aoMudar) {
    const { a } = dados(pilar);
    const v = await UI.formulario({
      titulo: "Objetivos e metas", descricao: "As metas são as que você ou seu nutricionista definiram. Dá para deixar em branco.",
      icone: UI.icone("alvo"), cor: pilar.cor, largo: true,
      campos: [
        { nome: "objetivo", rotulo: "Objetivo principal", tipo: "select", opcoes: OBJETIVOS.map((o) => ({ valor: o, rotulo: o || "Não definido" })) },
        { nome: "metaKcal", rotulo: "Meta de calorias por dia (kcal)", tipo: "number", min: 0, max: 8000, placeholder: "Ex.: 2000" },
        { nome: "metaProteina", rotulo: "Proteína por dia (g)", tipo: "number", min: 0, max: 600 },
        { nome: "metaCarbo", rotulo: "Carboidrato por dia (g)", tipo: "number", min: 0, max: 1200 },
        { nome: "metaGordura", rotulo: "Gordura por dia (g)", tipo: "number", min: 0, max: 400 },
        { nome: "objetivos", rotulo: "Seus objetivos e anotações", tipo: "textarea", placeholder: "Ex.: chegar a 75 kg até março; beber 3 L de água; não pular o café da manhã." },
      ],
      valores: { ...a, metaKcal: a.metaKcal ?? "", metaProteina: a.metaProteina ?? "", metaCarbo: a.metaCarbo ?? "", metaGordura: a.metaGordura ?? "" },
      rotuloConfirmar: "Salvar",
    });
    if (!v) return;
    const n = (x) => (x === "" || x === null || x === undefined ? null : Math.max(0, Number(x)) || null);
    salvar(pilar, { alimentacao: { ...a, objetivo: v.objetivo || "", objetivos: v.objetivos || "", metaKcal: n(v.metaKcal), metaProteina: n(v.metaProteina), metaCarbo: n(v.metaCarbo), metaGordura: n(v.metaGordura) } });
    UI.toast("Objetivos e metas salvos.");
    aoMudar();
  }

  async function editarRefeicao(pilar, r, aoMudar) {
    const { plano } = dados(pilar);
    const v = await UI.formulario({
      titulo: r ? "Editar refeição" : "Nova refeição", icone: UI.icone("prato"), cor: pilar.cor,
      campos: [
        { nome: "nome", rotulo: "Refeição", tipo: "text", obrigatorio: true, placeholder: "Ex.: Café da manhã, Almoço, Pré-treino" },
        { nome: "hora", rotulo: "Horário", tipo: "time" },
      ],
      valores: r || {},
      ...(r ? { rotuloExcluir: "Excluir refeição", aoExcluir: () => {
        const antes = plano;
        salvar(pilar, { plano: plano.filter((x) => x.id !== r.id) });
        aoMudar();
        UI.toast("Refeição excluída.", { acaoRotulo: "Desfazer", aoAcionar: () => { salvar(pilar, { plano: antes }); aoMudar(); } });
      } } : {}),
    });
    if (!v) return;
    const novo = r ? plano.map((x) => (x.id === r.id ? { ...x, nome: v.nome, hora: v.hora || "" } : x)) : [...plano, { id: uid("rf"), nome: v.nome, hora: v.hora || "", itens: [] }];
    salvar(pilar, { plano: ordenarPorHora(novo) });
    aoMudar();
  }

  const ordenarPorHora = (plano) => [...plano].sort((x, y) => (x.hora ? 0 : 1) - (y.hora ? 0 : 1) || (x.hora || "").localeCompare(y.hora || ""));

  async function editarItem(pilar, r, item, aoMudar) {
    const D = await carregarDieta();
    const v = await UI.formulario({
      titulo: item ? "Editar alimento" : `Alimento em ${r.nome}`, icone: UI.icone("prato"), cor: pilar.cor,
      descricao: "Deixe as calorias em branco para o Delfos estimar pela Tabela TACO, a partir da quantidade.",
      campos: [
        { nome: "alimento", rotulo: "Alimento", tipo: "text", obrigatorio: true, placeholder: "Ex.: Peito de frango grelhado" },
        { nome: "quantidade", rotulo: "Quantidade", tipo: "text", placeholder: "Ex.: 150 g, 2 fatias, 1 unidade" },
        { nome: "kcal", rotulo: "Calorias (kcal)", tipo: "number", min: 0, max: 5000 },
        { nome: "proteina", rotulo: "Proteína (g)", tipo: "number", min: 0, step: "0.1" },
        { nome: "carbo", rotulo: "Carboidrato (g)", tipo: "number", min: 0, step: "0.1" },
        { nome: "gordura", rotulo: "Gordura (g)", tipo: "number", min: 0, step: "0.1" },
        { nome: "substituicoes", rotulo: "Pode trocar por", tipo: "text", placeholder: "Ex.: 1 maçã" },
      ],
      valores: item ? { ...item, kcal: item.estimado ? "" : item.kcal ?? "" } : {},
    });
    if (!v) return;
    const kcal = num(v.kcal);
    const est = kcal === null ? D.estimar(v.alimento, D.lerQuantidade(`${v.quantidade} ${v.alimento}`)) : null;
    const novo = {
      id: item?.id || uid("al"), alimento: v.alimento, quantidade: v.quantidade || "", substituicoes: v.substituicoes || "",
      kcal: kcal ?? est?.kcal ?? null, proteina: num(v.proteina) ?? est?.proteina ?? null, carbo: num(v.carbo) ?? est?.carbo ?? null, gordura: num(v.gordura) ?? est?.gordura ?? null,
      gramas: est?.gramas ?? item?.gramas ?? null, estimado: kcal === null && !!est,
    };
    const { plano } = dados(Store.achar(CAMINHO, pilar.id));
    salvar(pilar, { plano: plano.map((x) => (x.id !== r.id ? x : { ...x, itens: item ? x.itens.map((i) => (i.id === item.id ? novo : i)) : [...x.itens, novo] })) });
    if (kcal === null) UI.toast(est ? `Calorias estimadas pela TACO: ${kcalTxt(est.kcal)}.` : "Sem calorias: o Delfos não achou o alimento ou a quantidade na tabela. Dá para escrever as kcal.");
    aoMudar();
  }

  function excluirItem(pilar, r, itemId, aoMudar) {
    const { plano } = dados(pilar);
    salvar(pilar, { plano: plano.map((x) => (x.id !== r.id ? x : { ...x, itens: x.itens.filter((i) => i.id !== itemId) })) });
    aoMudar();
    UI.toast("Alimento excluído.", { acaoRotulo: "Desfazer", aoAcionar: () => { salvar(pilar, { plano }); aoMudar(); } });
  }

  /* ------------------------------ Importação ------------------------------- */

  const ACEITOS = ".pdf,.docx,.pptx,.csv,.tsv,.txt,.xlsx,.xls,.doc,.ppt,.png,.jpg,.jpeg,.webp,.bmp,.gif,.heic,image/*";

  function importar(pilar, aoMudar) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACEITOS;
    input.addEventListener("change", () => { const f = input.files?.[0]; if (f) ler(pilar, f, aoMudar); });
    input.click();
  }

  async function ler(pilar, file, aoMudar) {
    const controle = new AbortController();
    let status = () => {}, fecharProgresso = () => {};
    UI.abrirModal(`
      <div class="modal-head com-marca">
        <span class="modal-ic" style="--ic-cor:${fmt.escape(pilar.cor)}">${UI.icone("prato")}</span>
        <div class="modal-head-texto"><h2 class="modal-title">Lendo ${fmt.escape(file.name)}</h2>
        <p class="modal-desc">O arquivo é lido neste aparelho; nada é enviado.</p></div>
      </div>
      <div class="modal-body"><p class="leitura-arquivo-status" role="status" data-status>Abrindo o arquivo…</p><progress class="leitura-arquivo-barra" data-barra aria-label="Andamento da leitura"></progress></div>
      <div class="modal-foot"><span class="modal-foot-espaco"></span><button class="btn" type="button" data-acao="cancelar">Cancelar</button></div>`, {
      classe: "formulario",
      aoFechar: () => controle.abort(),
      aoMontar(modal, fechar) {
        fecharProgresso = () => fechar(null);
        modal.querySelector('[data-acao="cancelar"]').addEventListener("click", () => fechar(null));
        status = (frase, fracao) => {
          if (frase) modal.querySelector("[data-status]").textContent = frase;
          const b = modal.querySelector("[data-barra]");
          if (typeof fracao === "number" && fracao > 0) b.value = fracao; else b.removeAttribute("value");
        };
      },
    });
    try {
      const [A, D] = await Promise.all([import("./agenda-arquivo.mjs"), carregarDieta()]);
      const r = await A.lerArquivo(file, {
        signal: controle.signal, aoProgresso: status,
        posicionado: (palavras) => D.analisarDietaLinhasComColunas(A.palavrasEmLinhas(palavras)),
        linhas: (l) => D.analisarDietaLinhas(l),
        tabela: (l) => D.analisarDietaTabela(l),
        achou: (x) => x.refeicoes.reduce((n, rf) => n + rf.itens.length, 0),
      });
      if (controle.signal.aborted) return;
      fecharProgresso();
      revisar(pilar, r, file.name, aoMudar);
    } catch (e) {
      if (controle.signal.aborted || e?.name === "AbortError") return;
      fecharProgresso();
      console.error(e);
      UI.toast(e?.message || "Não deu para ler esse arquivo.", { duracao: 8000 });
    }
  }

  /** Revisão: cada refeição com os alimentos editáveis; meta encontrada; substituir ou acrescentar. */
  function revisar(pilar, r, nomeArquivo, aoMudar) {
    const { a, plano } = dados(Store.achar(CAMINHO, pilar.id));
    const refeicoes = r.refeicoes.map((rf) => ({ ...rf, itens: rf.itens.map((i) => ({ ...i, marcado: true })) }));
    const nada = !refeicoes.length;
    let modo = "substituir";
    UI.abrirModal(`
      <div class="modal-head com-marca">
        <span class="modal-ic" style="--ic-cor:${fmt.escape(pilar.cor)}">${UI.icone("prato")}</span>
        <div class="modal-head-texto"><h2 class="modal-title">${nada ? "Nada reconhecido na dieta" : "Confira a dieta antes de salvar"}</h2>
        <p class="modal-desc">${fmt.escape(nomeArquivo)}. ${nada ? "O texto lido está abaixo." : "Corrija nomes, quantidades e calorias; desmarque o que não for da dieta."}</p></div>
      </div>
      <div class="modal-body revisar-arquivo">
        ${(r.avisos || []).map((x) => `<p class="notice info">${fmt.escape(x)}</p>`).join("")}
        ${r.metaKcal ? `<label class="card-note ali-usar-meta"><input type="checkbox" class="check" data-usar-meta checked /> Usar <b>${fmt.decimal(r.metaKcal, 0)} kcal</b> como meta do dia${a.metaKcal ? ` (hoje está em ${fmt.decimal(a.metaKcal, 0)})` : ""}</label>` : ""}
        ${!nada && plano.length ? `<div class="seg ali-modo" role="group" aria-label="O que fazer com o plano atual">
          <button type="button" data-modo="substituir" aria-pressed="true">Substituir o plano atual</button>
          <button type="button" data-modo="acrescentar" aria-pressed="false">Acrescentar ao plano</button></div>` : ""}
        <div data-refeicoes></div>
        ${r.texto ? `<details class="revisar-texto" ${nada ? "open" : ""}><summary>Texto lido do arquivo</summary><pre>${fmt.escape(String(r.texto).slice(0, 6000))}</pre></details>` : ""}
      </div>
      <div class="modal-foot">
        <span class="modal-atalho" data-resumo></span><span class="modal-foot-espaco"></span>
        <button class="btn" type="button" data-acao="fechar">${nada ? "Fechar" : "Cancelar"}</button>
        ${nada ? "" : `<button class="btn primary" type="button" data-acao="ok">Salvar dieta</button>`}
      </div>`, {
      classe: "formulario wide revisar-arquivo-modal",
      aoMontar(modal, fechar) {
        const $ = (q) => modal.querySelector(q);
        const resumo = () => {
          const itens = refeicoes.flatMap((rf) => rf.itens.filter((i) => i.marcado));
          const t = somar(itens);
          $("[data-resumo]").textContent = itens.length ? `${itens.length} ${itens.length === 1 ? "alimento" : "alimentos"}, ${kcalTxt(t.kcal)}` : "Nada marcado";
          const ok = $('[data-acao="ok"]'); if (ok) ok.disabled = !itens.length;
        };
        const desenhar = () => {
          $("[data-refeicoes]").innerHTML = refeicoes.map((rf, k) => `
            <section class="revisar-grupo">
              <header class="revisar-cab"><div><h3>${UI.icone("prato")}<input class="input ali-rev-refeicao" data-ref="${k}:nome" value="${fmt.escape(rf.nome)}" aria-label="Nome da refeição" /> <input class="input ali-rev-hora" type="time" data-ref="${k}:hora" value="${fmt.escape(rf.hora || "")}" aria-label="Horário" /></h3>
              <p>${kcalTxt(somar(rf.itens.filter((i) => i.marcado)).kcal)}</p></div></header>
              <ul class="revisar-linhas">${rf.itens.map((i, n) => `<li class="${i.marcado ? "" : "desmarcada"}">
                <input type="checkbox" class="check" data-marca="${k}:${n}" ${i.marcado ? "checked" : ""} aria-label="Salvar ${fmt.escape(i.alimento)}" />
                <div class="revisar-campos">
                  <input class="input revisar-titulo" data-item="${k}:${n}:alimento" value="${fmt.escape(i.alimento)}" aria-label="Alimento" maxlength="120" />
                  <div class="revisar-quando">
                    <input class="input ali-rev-qtd" data-item="${k}:${n}:quantidade" value="${fmt.escape(i.quantidade || "")}" placeholder="quantidade" aria-label="Quantidade" />
                    <input class="input ali-rev-kcal" type="number" min="0" data-item="${k}:${n}:kcal" value="${num(i.kcal) ?? ""}" placeholder="kcal" aria-label="Calorias" />
                    ${i.estimado ? `<span class="revisar-nota">estimado pela TACO</span>` : num(i.kcal) === null ? `<span class="revisar-nota atencao">sem calorias</span>` : ""}
                  </div>
                  ${i.substituicoes ? `<span class="revisar-nota">ou ${fmt.escape(i.substituicoes)}</span>` : ""}
                </div>
              </li>`).join("")}</ul>
            </section>`).join("");
          resumo();
        };
        modal.addEventListener("change", (ev) => {
          const m = ev.target.dataset.marca;
          if (m) { const [k, n] = m.split(":").map(Number); refeicoes[k].itens[n].marcado = ev.target.checked; ev.target.closest("li").classList.toggle("desmarcada", !ev.target.checked); resumo(); }
        });
        modal.addEventListener("input", (ev) => {
          const it = ev.target.dataset.item, rf = ev.target.dataset.ref;
          if (it) {
            const [k, n, campo] = it.split(":");
            const alvo = refeicoes[+k].itens[+n];
            alvo[campo] = campo === "kcal" ? num(ev.target.value) : ev.target.value;
            if (campo === "kcal") alvo.estimado = false;
            resumo();
          }
          if (rf) { const [k, campo] = rf.split(":"); refeicoes[+k][campo] = ev.target.value; }
        });
        modal.addEventListener("click", (ev) => {
          const b = ev.target.closest("[data-modo]");
          if (!b) return;
          modo = b.dataset.modo;
          modal.querySelectorAll("[data-modo]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        });
        $('[data-acao="fechar"]').addEventListener("click", () => fechar(null));
        $('[data-acao="ok"]')?.addEventListener("click", () => {
          const novas = refeicoes.map((rf) => ({
            id: uid("rf"), nome: (rf.nome || "Refeição").trim(), hora: /^\d{2}:\d{2}$/.test(rf.hora || "") ? rf.hora : "",
            itens: rf.itens.filter((i) => i.marcado && i.alimento.trim()).map(({ marcado, fonte, ...i }) => ({ ...i, id: uid("al"), alimento: i.alimento.trim() })),
          })).filter((rf) => rf.itens.length);
          const antes = { plano, alimentacao: a };
          const usarMeta = !!$("[data-usar-meta]")?.checked;
          salvar(pilar, {
            plano: ordenarPorHora(modo === "acrescentar" ? [...plano, ...novas] : novas),
            alimentacao: usarMeta ? { ...a, metaKcal: r.metaKcal } : a,
          });
          fechar(null);
          aoMudar();
          const n = novas.reduce((t, rf) => t + rf.itens.length, 0);
          UI.toast(`Dieta salva: ${novas.length} ${novas.length === 1 ? "refeição" : "refeições"}, ${n} ${n === 1 ? "alimento" : "alimentos"}.`, {
            acaoRotulo: "Desfazer", aoAcionar: () => { salvar(pilar, antes); aoMudar(); },
          });
        });
        desenhar();
      },
    });
  }

  /** Para a página da aba: total do plano e de hoje (o ladrilho e a contagem usam). */
  function resumoHoje(pilar) {
    const { a, plano, diario } = dados(pilar);
    const c = consumoDe(plano, doDia(diario, UI.hojeISO()));
    return { kcal: Math.round(c.kcal), meta: num(a.metaKcal), refeicoes: plano.length, itens: plano.reduce((n, r) => n + r.itens.length, 0) };
  }

  return { montar, resumoHoje, importar };
})();
