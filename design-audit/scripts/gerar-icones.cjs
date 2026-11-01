// Gera icons/index.html a partir de dashboard/ui.js (PROPRIOS, ICONES) e do símbolo.
// Uso: node design-audit/scripts/gerar-icones.cjs
const fs = require("fs"); const path = require("path");
const raiz = path.join(__dirname, "..", "..");
const src = fs.readFileSync(path.join(raiz, "dashboard/ui.js"), "utf8");
const objeto = (nome) => {
  const ini = src.indexOf(`const ${nome} = {`); const fim = src.indexOf("\n  };", ini);
  const corpo = src.slice(src.indexOf("{", ini), fim + 4).replace(/;\s*$/, "");
  return Function(`return (${corpo})`)();
};
const P = objeto("PROPRIOS"); const I = objeto("ICONES");
const simbolo = src.match(/const SIMBOLO = "([^"]+)"/)[1];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const prop = Object.entries(P).map(([n, d]) => `<figure><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="square" stroke-linejoin="miter"><path d="${d}"/></svg><figcaption>${n}</figcaption></figure>`).join("\n");
const ph = Object.entries(I).map(([n, m]) => `<figure><svg viewBox="0 0 256 256" fill="currentColor">${m}</svg><figcaption>${n}</figcaption></figure>`).join("\n");
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Ícones do Delfos</title>
<link rel="icon" href="../dashboard/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@300..600&family=Noto+Serif+Display:wght@300..700&display=swap" />
<link rel="stylesheet" href="../dashboard/tokens.css" />
<style>
  body { margin: 0; background: var(--fundo); color: var(--texto); font: 400 15px/1.55 var(--font); }
  main { max-width: 1120px; margin: 0 auto; padding: 64px 24px 96px; }
  h1 { font: 300 46px/1.05 var(--font-voz); letter-spacing: -0.03em; margin: 0 0 12px; }
  h2 { font: 500 11px var(--font); letter-spacing: .12em; text-transform: uppercase; color: var(--texto-3); margin: 64px 0 16px; padding-top: 16px; border-top: 1px solid var(--linha-forte); }
  p { color: var(--texto-2); max-width: 64ch; margin: 0 0 8px; }
  .marca { display: flex; gap: 32px; align-items: center; }
  .marca svg { height: 120px; }
  .grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 0; border-left: 1px solid var(--linha); }
  figure { margin: 0; padding: 24px 8px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; border-right: 1px solid var(--linha); border-bottom: 1px solid var(--linha); }
  figure svg { width: 24px; height: 24px; }
  .proprios figure svg { width: 48px; height: 48px; }
  figcaption { font-size: 12px; color: var(--texto-3); }
  .tamanhos { display: flex; gap: 24px; align-items: end; }
  .tamanhos svg { color: var(--texto); }
  button { all: unset; cursor: pointer; font-size: 13px; color: var(--texto-2); border: 1px solid var(--linha-forte); border-radius: var(--r-sm); padding: 8px 12px; }
</style>
</head>
<body>
<main>
  <h1>Ícones do Delfos</h1>
  <p>Grade de 24, traço de 1,25, pontas retas. Os ícones próprios seguem a lógica da coluna do símbolo: verticais, capitel em degrau, base. O restante é Phosphor Light (MIT), o mesmo peso de traço.</p>
  <p><button type="button" onclick="document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'light' ? '' : 'light'">Trocar tema</button></p>
  <h2>Símbolo</h2>
  <div class="marca"><svg viewBox="0 0 106 110" fill="currentColor"><path fill-rule="evenodd" d="${simbolo}"/></svg>
    <div class="tamanhos">${[64, 32, 24, 16].map((s) => `<svg viewBox="0 0 106 110" width="${s}" height="${s}" fill="currentColor"><path fill-rule="evenodd" d="${simbolo}"/></svg>`).join("")}</div></div>
  <h2>Próprios (navegação e áreas)</h2>
  <div class="grade proprios">${prop}</div>
  <h2>Phosphor Light (${Object.keys(I).length})</h2>
  <div class="grade">${ph}</div>
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(raiz, "icons/index.html"), html);
console.log("icons/index.html", Object.keys(P).length, "próprios,", Object.keys(I).length, "Phosphor");
