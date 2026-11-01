// Antes (main servida na porta 8124) e depois (esta branch na 8123), com dados fictícios em estado-demo.json.
// Uso: node design-audit/scripts/antes-depois.cjs design-audit/main
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
const OUT = process.argv[2]; fs.mkdirSync(path.join(OUT, "antes"), { recursive: true }); fs.mkdirSync(path.join(OUT, "depois"), { recursive: true });
const estado = JSON.parse(fs.readFileSync("estado-demo.json", "utf8"));
const paginas = [["01-visao-geral", "index.html?local"], ["02-financeiro", "financeiro.html"], ["03-faculdade", "faculdade.html"], ["04-pessoal", "pessoal.html"], ["05-projetos", "projetos.html"], ["06-entrada", "inicio.html"]];
const modos = [["escuro", 1440, "dark"], ["claro", 1440, "light"], ["celular", 390, "dark"]];
(async () => {
  for (const [lado, porta] of [["antes", 8124], ["depois", 8123]].filter(([l]) => !process.env.LADO || process.env.LADO === l)) for (const [modo, w, tema] of modos) for (const [nome, url] of paginas) {
    const b = await chromium.launch();
    try {
      const c = await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: w < 600 ? 2 : 1 });
      const e = { ...estado, "organizador.tema": tema };
      await c.addInitScript((e) => { if (sessionStorage.getItem("s")) return; sessionStorage.setItem("s", 1); sessionStorage.setItem("delfos.visita", "1"); for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v); }, e);
      const p = await c.newPage();
      await p.goto(`http://localhost:${porta}/dashboard/${url}`, { waitUntil: "load", timeout: 20000 }).catch(() => {});
      await p.evaluate(() => document.fonts.ready).catch(() => {}); await p.waitForTimeout(900);
      await p.screenshot({ path: path.join(OUT, lado, `${nome}-${modo}.png`), fullPage: true });
    } catch (err) { console.log("falhou", lado, nome, modo, err.message.split("\n")[0]); }
    await b.close();
  }
  console.log("ok");
})();
