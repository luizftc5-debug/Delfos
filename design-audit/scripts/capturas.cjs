// Capturas do Delfos com dados de demonstração (fictícios).
// Uso: python3 -m http.server 8123 (na raiz do repositório), depois
//      node design-audit/scripts/capturas.cjs design-audit/before dark,light
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT = process.argv[2];
const BASE = "http://localhost:8123";
fs.mkdirSync(OUT, { recursive: true });

function semear() {
  const hoje = new Date();
  const d = (n) => { const x = new Date(hoje); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  localStorage.setItem("delfos.resumoDoDia", hoje.toISOString().slice(0, 10));
  Store.definirPerfil({ nome: "Luiz Fernando", tipoOcupacao: "estudo", ocupacao: "Estudante de Medicina", curso: "Medicina", semestre: "6", cidade: "Salvador", configuradoEm: new Date().toISOString() });
  const conta = Store.inserir("financeiro.contas", { nome: "Nubank", tipo: "corrente", saldoInicial: 1850 });
  const cartao = Store.inserir("financeiro.cartoes", { nome: "Inter Gold", bandeira: "Mastercard", limite: 2500, fechamento: 25, vencimento: 5 });
  const t = (tipo, descricao, valor, dia, categoria, origem, status = "pago") =>
    Store.inserir("financeiro.transacoes", { tipo, descricao, valor, data: d(dia), categoria, origem, status, forma: "" });
  const oc = "conta:" + conta.id, ok = "cartao:" + cartao.id;
  t("receita", "Bolsa de iniciação científica", 700, -28, "Renda", oc);
  t("receita", "Monitoria de Farmacologia", 450, -12, "Renda", oc);
  t("despesa", "Mercado Extra", 186.4, -20, "Alimentação", ok);
  t("despesa", "Uber para o HGE", 38.9, -15, "Transporte", ok);
  t("despesa", "Livro Guyton", 289, -10, "Educação", ok);
  t("despesa", "Spotify", 21.9, -8, "Assinaturas", ok);
  t("despesa", "Almoço no RU", 14.5, -3, "Alimentação", oc);
  t("despesa", "Farmácia", 62.3, -2, "Saúde", oc);
  t("despesa", "Internet", 99.9, 4, "Moradia", oc, "pendente");
  Store.inserir("financeiro.metas", { descricao: "Reserva de emergência", valorAlvo: 3000, valorAtual: 820, prazo: d(180) });
  Store.inserir("financeiro.investimentos", { nome: "Tesouro Selic 2029", tipo: "Tesouro Direto", valorAplicado: 1200, valorAtual: 1287.4, data: d(-200) });
  const farm = Store.inserir("faculdade.disciplinas", { nome: "Farmacologia II", status: "ativa", professor: "Dra. Ana Lima", avaliacoes: [], materiais: [], resumos: [] });
  const clin = Store.inserir("faculdade.disciplinas", { nome: "Semiologia Médica", status: "ativa", professor: "Dr. Paulo Reis", avaliacoes: [], materiais: [], resumos: [] });
  Store.subInserir("faculdade.disciplinas", farm.id, "avaliacoes", { descricao: "Prova 1", data: d(-20), peso: 1, nota: 7.8 });
  Store.subInserir("faculdade.disciplinas", farm.id, "avaliacoes", { descricao: "Prova 2", data: d(6), peso: 1, nota: null });
  Store.subInserir("faculdade.disciplinas", clin.id, "avaliacoes", { descricao: "OSCE", data: d(13), peso: 2, nota: null });
  Store.subInserir("faculdade.disciplinas", farm.id, "resumos", { titulo: "Antibióticos beta-lactâmicos", conteudo: "<h2>Mecanismo</h2><p>Inibem a síntese da parede celular ao se ligarem às PBPs.</p><ul><li>Penicilinas</li><li>Cefalosporinas</li><li>Carbapenêmicos</li></ul>", conteudoFormato: "html", anexos: [] });
  Store.inserir("faculdade.prazos", { descricao: "Protocolo PROSPERO da metanálise", data: d(3), tipo: "TCC", disciplinaId: "", concluido: false });
  Store.inserir("faculdade.prazos", { descricao: "Relatório de estágio", data: d(-2), tipo: "entrega", disciplinaId: clin.id, concluido: false });
  const pj = Store.inserir("projetos", { nome: "Monitoria particular", status: "em andamento", tipo: "Aulas", descricao: "Aulas de Farmacologia para o 4º semestre.", rendaEstimada: 600, horasSemana: 4, prioridade: "alta", deadline: d(40), recebimentos: [], custos: [], passos: [], anexos: [] });
  Store.subInserir("projetos", pj.id, "recebimentos", { descricao: "Pacote de 4 aulas", valor: 320, data: d(-6) });
  Store.subInserir("projetos", pj.id, "passos", { texto: "Montar lista de exercícios", feito: false });
  Store.inserir("projetos", { nome: "Canal de resumos", status: "ideia", descricao: "Resumos de Fisiologia em vídeo curto.", rendaEstimada: 200, recebimentos: [], custos: [], passos: [], anexos: [] });
  Store.inserir("pessoal.compromissos", { descricao: "Consulta no dentista", tipo: "consulta", data: d(1), hora: "14:30", local: "Pituba", concluido: false });
  Store.inserir("pessoal.compromissos", { descricao: "Revisão do carro", tipo: "tarefa", data: d(9), concluido: false });
  Store.inserir("pessoal.compromissos", { descricao: "Aniversário da avó", tipo: "compromisso", data: d(15), importante: true, concluido: false });
  return { farm: farm.id, pj: pj.id, conta: conta.id, resumo: Store.achar("faculdade.disciplinas", farm.id).resumos[0].id };
}

(async () => {
  const browser = await chromium.launch({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined });
  const temas = (process.argv[3] || "dark").split(",");
  for (const tema of temas) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
    const pg = await ctx.newPage();
    await pg.goto(BASE + "/dashboard/index.html");
    await pg.waitForFunction(() => typeof Store !== "undefined");
    const ids = await pg.evaluate(semear);
    if (tema === "light") await pg.evaluate(() => localStorage.setItem("organizador.tema", "light"));
    const estado = await pg.evaluate(() => localStorage.getItem("organizador.estado.v2"));
    const extras = await pg.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
    await ctx.close();

    const paginas = [
      ["00-inicio-publico", "/index.html"],
      ["01-visao-geral", "/dashboard/index.html"],
      ["02-financeiro", "/dashboard/financeiro.html"],
      ["03-contas", "/dashboard/contas.html"],
      ["04-conta", `/dashboard/conta.html?tipo=conta&id=${ids.conta}`],
      ["05-investimentos", "/dashboard/investimentos.html"],
      ["06-faculdade", "/dashboard/faculdade.html"],
      ["07-disciplina", `/dashboard/disciplina.html?id=${ids.farm}`],
      ["08-resumo-editor", `/dashboard/resumo.html?disciplina=${ids.farm}&id=${ids.resumo}`],
      ["09-projetos", "/dashboard/projetos.html"],
      ["10-projeto", `/dashboard/projeto.html?id=${ids.pj}`],
      ["11-pessoal", "/dashboard/pessoal.html"],
      ["12-entrar", "/dashboard/entrar.html"],
      ["13-bemvindo", "/dashboard/bemvindo.html"],
    ];
    const lista = tema === "dark" ? paginas : paginas.filter(([n]) => /0[1-26]|11/.test(n));
    const tarefas = [];
    for (const [w, h, rotulo] of [[1440, 900, "desktop"], [390, 844, "mobile"]]) {
      for (const [nome, url] of lista.filter(([n]) => n !== "12-entrar")) tarefas.push({ w, h, rotulo, nome, url });
      if (tema === "dark") {
        tarefas.push({ w, h, rotulo, nome: "20-modal-lancamento", url: "/dashboard/financeiro.html", acao: "Lancamento.abrir({ aoSalvar: () => {} })", tela: true });
        tarefas.push({ w, h, rotulo, nome: "21-modal-perfil", url: "/dashboard/index.html", acao: "UI.abrirPerfil()", tela: true });
      }
    }
    for (const t of tarefas) {
      const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } });
      try {
        const c = await b.newContext({ viewport: { width: t.w, height: t.h }, deviceScaleFactor: t.rotulo === "mobile" ? 2 : 1, ignoreHTTPSErrors: true });
        await c.addInitScript(([e]) => {
          if (sessionStorage.getItem("seeded")) return;
          sessionStorage.setItem("seeded", "1"); sessionStorage.setItem("delfos.visita", "1");
          for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v);
        }, [extras]);
        const p = await c.newPage();
        await p.goto(BASE + t.url, { waitUntil: "load", timeout: 20000 }).catch(() => {});
        await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(900);
        if (t.acao) { await p.evaluate(`setTimeout(() => { ${t.acao} }, 0)`); await p.waitForTimeout(800); }
        const arq = path.join(OUT, `${t.nome}-${t.rotulo}${tema === "light" ? "-claro" : ""}.png`);
        await p.screenshot({ path: arq, fullPage: !t.tela });
        console.log(arq);
      } catch (e) { console.log("falhou", t.nome, t.rotulo, e.message.split("\n")[0]); }
      await b.close().catch(() => {});
    }
  }
  await browser.close();
})();
