/* ===========================================================================
   Lancamento — a janela de registrar uma entrada ou saída.

   Usada pelo Financeiro, pela Visão geral e pela página de cada conta, no
   lugar do formulário genérico: registrar gasto é a coisa que a pessoa mais
   faz no painel, então merece ser rápido e agradável.

   - Valor grande no alto, que aceita conta ("45+12,90").
   - Descrição com as que você já usou; escolher uma repete a categoria e a
     conta da última vez (sem sobrescrever o que já foi mexido).
   - Categorias e contas em pílulas, as mais usadas primeiro.
   - Datas rápidas, situação (pago / a pagar) e uma frase que resume o que
     vai ser salvo.
   - Mais opções: parcelar (cria uma parcela por mês) e repetir todo mês
     (vira um gasto fixo, ver Financas.gerarFixos).
   - "Salvar e lançar outro" mantém tipo, data, conta e categoria.
   =========================================================================== */

const Lancamento = (() => {
  const { fmt, icone } = UI;
  const esc = fmt.escape;

  const transacoes = () => Store.lista("financeiro.transacoes");

  /** Categorias em ordem de uso (as mais usadas no tipo escolhido primeiro). */
  function categoriasPorUso(tipo) {
    const todas = Store.estado().financeiro.categorias;
    const uso = {};
    transacoes().filter((t) => t.tipo === tipo).forEach((t) => { uso[t.categoria] = (uso[t.categoria] || 0) + 1; });
    return [...todas].sort((a, b) => (uso[b] || 0) - (uso[a] || 0));
  }

  /** Descrições já usadas, a mais recente primeiro, sem repetir. */
  function historico() {
    const vistos = new Map();
    [...transacoes()].sort((a, b) => (b.data || "").localeCompare(a.data || "")).forEach((t) => {
      const k = (t.descricao || "").trim().toLowerCase();
      if (k && !vistos.has(k)) vistos.set(k, t);
    });
    return [...vistos.values()].slice(0, 80);
  }

  function nomeCurtoOrigem(valor) {
    if (!valor) return "Não informado";
    return Financas.nomeOrigem ? Financas.nomeOrigem(valor) : valor;
  }

  function mesMais(iso, n) {
    const [a, m, d] = iso.split("-").map(Number);
    const alvo = new Date(a, m - 1 + n, 1);
    const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
    return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, "0")}-${String(Math.min(d, ultimo)).padStart(2, "0")}`;
  }

  /**
   * Abre a janela. `item` = lançamento a editar (ou null); `padrao` = valores
   * iniciais de um novo (origem da conta aberta, por exemplo). Chama
   * `aoSalvar()` depois de gravar. Devolve uma promessa com os ids criados.
   */
  function abrir({ item = null, padrao = {}, aoSalvar = null, origemFixa = "" } = {}) {
    const editando = !!item;
    const hoje = UI.hojeISO();
    const inicial = {
      tipo: "despesa", descricao: "", valor: null, categoria: "", data: hoje,
      origem: origemFixa || "", status: "pago", forma: "",
      ...padrao, ...(item || {}),
    };
    const est = { ...inicial, mexeu: new Set(), parcelas: 1, parcelaEhTotal: true, repetir: false, maisCategorias: false };
    const origens = Financas.opcoesOrigem();

    return new Promise((resolve) => {
      const criados = [];
      const html = `
        <div class="modal-head com-marca">
          <span class="modal-ic" style="--ic-cor:var(--s-financeiro)">${icone("financeiro")}</span>
          <div class="modal-head-texto">
            <h2 class="modal-title">${editando ? "Editar lançamento" : "Novo lançamento"}</h2>
            <p class="modal-desc" data-resumo></p>
          </div>
        </div>
        <form class="modal-body lanc" novalidate>
          <div class="seg lanc-tipo" data-tipo>
            <input type="hidden" name="tipo" value="${esc(est.tipo)}" />
            <button type="button" data-valor="despesa" aria-pressed="${est.tipo === "despesa"}">${icone("desceu")}Saída</button>
            <button type="button" data-valor="receita" aria-pressed="${est.tipo === "receita"}">${icone("subiu")}Entrada</button>
          </div>

          <div class="field lanc-valor">
            <label for="l-valor">Valor</label>
            <div class="campo-dinheiro destaque">
              <span class="prefixo">R$</span>
              <input type="text" inputmode="decimal" autocomplete="off" id="l-valor" name="valor" data-dinheiro
                     value="${esc(UI.formatarDinheiroCampo(est.valor))}" placeholder="0,00" />
              <span class="conta-resultado" data-conta aria-live="polite"></span>
            </div>
            <span class="hint">Dá para somar: 45+12,90.</span>
          </div>

          <div class="field">
            <label for="l-desc">Descrição</label>
            <input type="text" id="l-desc" name="descricao" list="l-hist" autocomplete="off" value="${esc(est.descricao)}" placeholder="Ex.: Almoço no RU, Uber, Mensalidade" />
            <datalist id="l-hist">${historico().map((t) => `<option value="${esc(t.descricao)}"></option>`).join("")}</datalist>
            <span class="hint" data-aprendido hidden></span>
          </div>

          <div class="field">
            <label>Categoria <button type="button" class="link-mini" data-nova-cat>Nova categoria</button></label>
            <div class="chips lanc-cats" data-cats role="group" aria-label="Categoria"></div>
          </div>

          <div class="lanc-duas">
            <div class="field campo-data">
              <label for="l-data">Data <span class="data-extenso" data-extenso></span></label>
              <div class="data-linha">
                <input type="date" id="l-data" name="data" value="${esc(est.data)}" />
                <div class="datas-rapidas">
                  <button type="button" class="chip mini" data-dias="-2">Anteontem</button>
                  <button type="button" class="chip mini" data-dias="-1">Ontem</button>
                  <button type="button" class="chip mini" data-dias="0">Hoje</button>
                  <button type="button" class="chip mini" data-dias="1">Amanhã</button>
                </div>
              </div>
            </div>
            <div class="field">
              <label>Situação</label>
              <div class="seg" data-status>
                <input type="hidden" name="status" value="${esc(est.status)}" />
                <button type="button" data-valor="pago" aria-pressed="${est.status !== "pendente"}">Pago</button>
                <button type="button" data-valor="pendente" aria-pressed="${est.status === "pendente"}">A pagar</button>
              </div>
            </div>
          </div>

          ${origemFixa ? "" : `
          <div class="field">
            <label>Pago com</label>
            ${origens.length > 1
              ? `<div class="chips" data-origens role="group" aria-label="Pago com">${origens.map((o) => `<button type="button" class="chip" data-origem="${esc(o.valor)}" aria-pressed="${o.valor === est.origem}">${o.valor.startsWith("cartao:") ? icone("cartao") : o.valor ? icone("banco") : ""}${esc(o.valor ? o.rotulo.replace(/ \((cartão|corrente|poupança|poupanca|investimento|dinheiro)\)$/, "") : "Não informado")}</button>`).join("")}</div>`
              : `<span class="hint">Cadastre suas contas e cartões em <a href="contas.html">Contas e cartões</a> para o saldo de cada um se calcular sozinho.</span>`}
          </div>`}

          <details class="lanc-mais" ${item?.forma ? "open" : ""}>
            <summary>${icone("direita")}Mais opções</summary>
            <div class="lanc-mais-corpo">
              <div class="field">
                <label for="l-obs">Observação</label>
                <input type="text" id="l-obs" name="forma" autocomplete="off" value="${esc(est.forma)}" placeholder="Pix, débito, dividido com alguém…" />
              </div>
              ${editando ? "" : `
              <div class="lanc-opcao" data-bloco-parcelas>
                <div>
                  <b>Parcelar</b>
                  <span>Cria uma parcela por mês, a partir da data escolhida.</span>
                </div>
                <div class="lanc-parcelas">
                  <input type="number" class="input sm" min="1" max="48" value="1" data-parcelas aria-label="Número de parcelas" />
                  <span>vezes</span>
                </div>
              </div>
              <div class="seg sm" data-parcela-total hidden>
                <input type="hidden" value="total" />
                <button type="button" data-valor="total" aria-pressed="true">O valor é o total</button>
                <button type="button" data-valor="parcela" aria-pressed="false">O valor é de cada parcela</button>
              </div>
              <label class="lanc-opcao" data-bloco-repetir>
                <div>
                  <b>Repetir todo mês</b>
                  <span>Vira um gasto fixo: o Delfos lança sozinho nos próximos meses e reconhece no extrato.</span>
                </div>
                <input type="checkbox" class="switch" data-mensal />
              </label>`}
            </div>
          </details>
        </form>
        <div class="modal-foot">
          ${editando ? `<button class="btn danger" data-acao="excluir" type="button">Excluir</button>` : `<span class="modal-atalho">Enter salva, Esc fecha</span>`}
          <span class="modal-foot-espaco"></span>
          <button class="btn" data-acao="cancelar" type="button">Cancelar</button>
          ${editando ? "" : `<button class="btn" data-acao="outro" type="button">Salvar e lançar outro</button>`}
          <button class="btn primary" data-acao="confirmar" type="button">${editando ? "Salvar" : "Lançar"}</button>
        </div>`;

      UI.abrirModal(html, {
        classe: "formulario lancamento wide",
        aoFechar: () => resolve(criados),
        aoMontar(modal, fechar) {
          const $ = (s) => modal.querySelector(s);
          const inpValor = $("#l-valor");
          const inpDesc = $("#l-desc");
          const inpData = $("#l-data");
          const boxCats = $("[data-cats]");

          modal.dataset.tipo = est.tipo;

          /* ---------- tipo, situação (segmentos) ---------- */
          modal.querySelectorAll(".seg").forEach((seg) => {
            seg.addEventListener("click", (e) => {
              const b = e.target.closest("button[data-valor]");
              if (!b) return;
              seg.querySelectorAll("button[data-valor]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
              seg.querySelector("input").value = b.dataset.valor;
              if (seg.matches("[data-tipo]")) {
                est.tipo = b.dataset.valor;
                modal.dataset.tipo = est.tipo;
                if (!est.mexeu.has("categoria")) est.categoria = "";
                desenharCats();
                const rep = $("[data-bloco-repetir]");
                if (rep) rep.hidden = est.tipo !== "despesa";
              }
              if (seg.matches("[data-status]")) { est.status = b.dataset.valor; est.mexeu.add("status"); }
              if (seg.matches("[data-parcela-total]")) est.parcelaEhTotal = b.dataset.valor === "total";
              resumir();
            });
          });

          /* ---------- valor ---------- */
          const conta = modal.querySelector("[data-conta]");
          inpValor.addEventListener("input", () => {
            inpValor.value = inpValor.value.replace(/[^\d.,+\-\s]/g, "");
            const v = UI.avaliarDinheiro(inpValor.value);
            conta.textContent = /[+]|\d\s*-\s*\d/.test(inpValor.value) && v !== null ? `= ${fmt.moeda(v)}` : "";
            modal.querySelector(".lanc-valor").classList.remove("tem-erro");
            resumir();
          });
          inpValor.addEventListener("blur", () => {
            const v = UI.avaliarDinheiro(inpValor.value);
            if (v !== null) { inpValor.value = UI.formatarDinheiroCampo(v); conta.textContent = ""; }
          });

          /* ---------- descrição: lembra da última vez ---------- */
          const aprendido = $("[data-aprendido]");
          inpDesc.addEventListener("input", () => {
            modal.querySelectorAll(".tem-erro").forEach((n) => n.classList.remove("tem-erro"));
            const k = inpDesc.value.trim().toLowerCase();
            const antes = k.length >= 2 ? historico().find((t) => t.descricao.trim().toLowerCase() === k) : null;
            if (antes && !editando) {
              const feito = [];
              if (!est.mexeu.has("categoria") && antes.categoria) { est.categoria = antes.categoria; feito.push(antes.categoria); }
              if (!origemFixa && !est.mexeu.has("origem") && antes.origem !== undefined) { est.origem = antes.origem; if (antes.origem) feito.push(nomeCurtoOrigem(antes.origem)); marcarOrigem(); }
              if (!est.mexeu.has("tipo") && antes.tipo && antes.tipo !== est.tipo) {
                modal.querySelector(`[data-tipo] button[data-valor="${antes.tipo}"]`)?.click();
              }
              if (!inpValor.value && antes.valor) { inpValor.value = UI.formatarDinheiroCampo(antes.valor); feito.push(`valor de ${fmt.moeda(antes.valor)}`); }
              desenharCats();
              if (feito.length) { aprendido.hidden = false; aprendido.textContent = `Como da última vez: ${feito.join(", ")}.`; }
            } else aprendido.hidden = true;
            resumir();
          });

          /* ---------- categorias em pílulas ---------- */
          function desenharCats() {
            const lista = categoriasPorUso(est.tipo);
            if (!est.categoria) est.categoria = est.tipo === "receita" && lista.includes("Renda") ? "Renda" : lista[0] || "Outros";
            const limite = 8;
            const visiveis = est.maisCategorias ? lista : lista.slice(0, limite);
            if (!visiveis.includes(est.categoria) && lista.includes(est.categoria)) visiveis.push(est.categoria);
            boxCats.innerHTML = visiveis.map((c) => `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${c === est.categoria}">${esc(c)}</button>`).join("")
              + (lista.length > visiveis.length ? `<button type="button" class="chip fantasma" data-mais-cats>+${lista.length - visiveis.length}</button>` : "");
          }
          boxCats.addEventListener("click", (e) => {
            if (e.target.closest("[data-mais-cats]")) { est.maisCategorias = true; desenharCats(); return; }
            const b = e.target.closest("[data-cat]");
            if (!b) return;
            est.categoria = b.dataset.cat;
            est.mexeu.add("categoria");
            boxCats.querySelectorAll("[data-cat]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
            resumir();
          });
          // Nova categoria: um campo aparece no fim das pílulas; Enter cria e já escolhe.
          $("[data-nova-cat]").addEventListener("click", () => {
            if (boxCats.querySelector("[data-cat-nova]")) { boxCats.querySelector("[data-cat-nova]").focus(); return; }
            boxCats.insertAdjacentHTML("beforeend", `<input class="input sm cat-nova" data-cat-nova placeholder="Nome, e Enter" maxlength="40" />`);
            const campo = boxCats.querySelector("[data-cat-nova]");
            campo.focus();
            campo.addEventListener("keydown", (e) => {
              if (e.key === "Escape") { e.stopPropagation(); campo.remove(); return; }
              if (e.key !== "Enter") return;
              e.preventDefault();
              e.stopPropagation();
              const criada = Store.adicionarCategoria(campo.value);
              if (!criada) { campo.remove(); return; }
              est.categoria = criada;
              est.mexeu.add("categoria");
              est.maisCategorias = true;
              desenharCats();
              resumir();
            });
          });

          /* ---------- data ---------- */
          const ext = $("[data-extenso]");
          const sincData = () => {
            ext.textContent = UI.dataPorExtensoCurta(inpData.value);
            modal.querySelectorAll("[data-dias]").forEach((b) => b.setAttribute("aria-pressed", String(inpData.value === UI.isoMaisDias(Number(b.dataset.dias)))));
            // Data no futuro costuma ser conta a pagar.
            if (!est.mexeu.has("status") && !editando) {
              const futuro = inpData.value > hoje;
              const alvo = futuro ? "pendente" : "pago";
              if (est.status !== alvo) {
                modal.querySelector(`[data-status] button[data-valor="${alvo}"]`)?.click();
                est.mexeu.delete("status");
              }
            }
            resumir();
          };
          modal.querySelector(".datas-rapidas").addEventListener("click", (e) => {
            const b = e.target.closest("[data-dias]");
            if (!b) return;
            inpData.value = UI.isoMaisDias(Number(b.dataset.dias));
            sincData();
          });
          inpData.addEventListener("change", sincData);
          inpData.addEventListener("input", sincData);

          /* ---------- origem ---------- */
          function marcarOrigem() {
            modal.querySelectorAll("[data-origem]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.origem === est.origem)));
          }
          modal.querySelector("[data-origens]")?.addEventListener("click", (e) => {
            const b = e.target.closest("[data-origem]");
            if (!b) return;
            est.origem = b.dataset.origem;
            est.mexeu.add("origem");
            marcarOrigem();
            resumir();
          });

          /* ---------- mais opções ---------- */
          const inpParc = $("[data-parcelas]");
          inpParc?.addEventListener("input", () => {
            est.parcelas = Math.max(1, Math.min(48, Math.round(Number(inpParc.value) || 1)));
            $("[data-parcela-total]").hidden = est.parcelas < 2;
            if (est.parcelas > 1 && $("[data-mensal]")?.checked) { $("[data-mensal]").checked = false; est.repetir = false; }
            resumir();
          });
          $("[data-mensal]")?.addEventListener("change", (e) => {
            est.repetir = e.target.checked;
            if (est.repetir && inpParc) { inpParc.value = 1; est.parcelas = 1; $("[data-parcela-total]").hidden = true; }
            resumir();
          });
          const rep = $("[data-bloco-repetir]");
          if (rep) rep.hidden = est.tipo !== "despesa";

          /* ---------- a frase que resume ---------- */
          function resumir() {
            const v = UI.avaliarDinheiro(inpValor.value);
            const partes = [];
            const quanto = v ? fmt.moeda(v) : "um valor";
            let frase = `${est.tipo === "receita" ? "Entrada" : "Saída"} de ${quanto}`;
            if (est.categoria) frase += ` em ${est.categoria}`;
            const dataTxt = inpData.value === hoje ? "hoje" : inpData.value ? fmt.dataCurta(inpData.value) : "";
            if (dataTxt) frase += `, ${dataTxt}`;
            const orig = origemFixa || est.origem;
            if (orig) frase += `, ${est.tipo === "receita" ? "em" : "pelo"} ${nomeCurtoOrigem(orig)}`;
            partes.push(frase);
            if (est.parcelas > 1 && v) {
              const cada = est.parcelaEhTotal ? v / est.parcelas : v;
              partes.push(`${est.parcelas} parcelas de ${fmt.moeda(cada)}`);
            }
            if (est.repetir) partes.push("repete todo mês");
            partes.push(est.status === "pendente" ? "a pagar" : est.tipo === "receita" ? "já recebido" : "já pago");
            $("[data-resumo]").textContent = `${partes.join("; ")}.`;
          }

          /* ---------- gravar ---------- */
          function validar() {
            let ok = true;
            modal.querySelectorAll(".field .err").forEach((n) => n.remove());
            const v = UI.avaliarDinheiro(inpValor.value);
            const erro = (campo, texto) => {
              ok = false;
              campo.classList.add("tem-erro");
              const s = document.createElement("span");
              s.className = "err";
              s.textContent = texto;
              campo.appendChild(s);
            };
            if (!v || v <= 0) erro(modal.querySelector(".lanc-valor"), "Informe um valor maior que zero.");
            if (!inpDesc.value.trim()) erro(inpDesc.closest(".field"), "Diga o que foi.");
            if (!inpData.value) erro(inpData.closest(".field"), "Escolha a data.");
            if (!ok) modal.querySelector(".tem-erro input")?.focus();
            return ok ? v : null;
          }

          function gravar() {
            const v = validar();
            if (v === null) return false;
            const base = {
              tipo: est.tipo,
              descricao: inpDesc.value.trim(),
              categoria: est.categoria,
              data: inpData.value,
              origem: origemFixa || est.origem || "",
              status: est.status,
              forma: $("#l-obs").value.trim(),
            };
            if (editando) {
              Store.atualizar("financeiro.transacoes", item.id, { ...base, valor: v });
              criados.push(item.id);
              return true;
            }
            if (est.repetir && est.tipo === "despesa") {
              // Gasto fixo: o lançamento deste mês nasce pelo gerador, já com o vínculo.
              const mes = base.data.slice(0, 7);
              const fixo = Store.inserir("financeiro.fixos", {
                descricao: base.descricao, valor: v, dia: Number(base.data.slice(8, 10)), categoria: base.categoria,
                origem: base.origem, inicio: mes, fim: "", ativo: true, geradoAte: "",
              });
              Financas.gerarFixos();
              const t = transacoes().find((x) => x.fixoId === fixo.id && x.competencia === mes);
              if (t) {
                Store.atualizar("financeiro.transacoes", t.id, { data: base.data, status: base.status, forma: base.forma });
                criados.push(t.id);
              }
              criados.push(`fixo:${fixo.id}`);
              return true;
            }
            if (est.parcelas > 1) {
              const cada = Math.round((est.parcelaEhTotal ? v / est.parcelas : v) * 100) / 100;
              // Centavos que sobram da divisão vão na primeira parcela.
              const resto = est.parcelaEhTotal ? Math.round((v - cada * est.parcelas) * 100) / 100 : 0;
              for (let i = 0; i < est.parcelas; i++) {
                const data = mesMais(base.data, i);
                const n = Store.inserir("financeiro.transacoes", {
                  ...base,
                  descricao: `${base.descricao} (${i + 1}/${est.parcelas})`,
                  valor: Math.round((cada + (i === 0 ? resto : 0)) * 100) / 100,
                  data,
                  status: i === 0 ? base.status : data <= hoje ? base.status : "pendente",
                });
                criados.push(n.id);
              }
              return true;
            }
            criados.push(Store.inserir("financeiro.transacoes", { ...base, valor: v }).id);
            return true;
          }

          function desfazerTexto() {
            return criados.length > 1 ? `${criados.filter((x) => !String(x).startsWith("fixo:")).length} lançamentos salvos.` : "Lançamento salvo.";
          }

          const desfazer = (ids) => () => {
            ids.forEach((id) => {
              if (String(id).startsWith("fixo:")) Store.remover("financeiro.fixos", id.slice(5));
              else Store.remover("financeiro.transacoes", id);
            });
            aoSalvar?.();
            UI.toast("Desfeito.");
          };

          $('[data-acao="confirmar"]').addEventListener("click", () => {
            if (!gravar()) return;
            const ids = [...criados];
            fechar(null);
            aoSalvar?.();
            if (editando) UI.toast("Lançamento atualizado.");
            else UI.toast(desfazerTexto(), { acaoRotulo: "Desfazer", aoAcionar: desfazer(ids), duracao: 6000 });
          });
          $('[data-acao="outro"]')?.addEventListener("click", () => {
            const antes = criados.length;
            if (!gravar()) return;
            const ids = criados.slice(antes);
            aoSalvar?.();
            UI.toast(`${desfazerTexto()} Pode lançar o próximo.`, { acaoRotulo: "Desfazer", aoAcionar: desfazer(ids), duracao: 5000 });
            inpValor.value = "";
            inpDesc.value = "";
            aprendido.hidden = true;
            $("#l-obs").value = "";
            if (inpParc) { inpParc.value = 1; est.parcelas = 1; $("[data-parcela-total]").hidden = true; }
            if ($("[data-mensal]")) { $("[data-mensal]").checked = false; est.repetir = false; }
            est.mexeu.delete("categoria");
            resumir();
            inpValor.focus();
          });
          $('[data-acao="cancelar"]').addEventListener("click", () => fechar(null));
          $('[data-acao="excluir"]')?.addEventListener("click", () => {
            const indice = Store.indiceDe("financeiro.transacoes", item.id);
            Store.remover("financeiro.transacoes", item.id);
            fechar(null);
            aoSalvar?.();
            UI.toast("Lançamento excluído.", { acaoRotulo: "Desfazer", aoAcionar: () => { Store.restaurar("financeiro.transacoes", item, indice); aoSalvar?.(); } });
          });
          modal.querySelector("form").addEventListener("keydown", (e) => {
            if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox") {
              e.preventDefault();
              $('[data-acao="confirmar"]').click();
            }
          });

          desenharCats();
          sincData();
          if (!inpValor.value) inpValor.focus(); else inpDesc.focus();
        },
      });
    });
  }

  return { abrir, categoriasPorUso, historico };
})();
