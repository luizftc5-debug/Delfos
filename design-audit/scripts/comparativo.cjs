// Gera design-audit/comparativo.html: antes e depois lado a lado.
// Uso: node design-audit/scripts/comparativo.cjs
const fs = require("fs"); const path = require("path");
const base = path.join(__dirname, "..");
const antes = new Set(fs.readdirSync(path.join(base, "before")));
const depois = fs.readdirSync(path.join(base, "after")).filter((f) => antes.has(f)).sort();
const nome = (f) => f.replace(".png", "").replace(/^\d+-/, "").replace(/-/g, " ");
const linhas = depois.map((f) => `
  <section>
    <h2>${nome(f)}</h2>
    <div class="par"><figure><figcaption>Antes</figcaption><a href="before/${f}"><img loading="lazy" src="before/${f}" alt="Antes: ${nome(f)}"></a></figure>
    <figure><figcaption>Depois</figcaption><a href="after/${f}"><img loading="lazy" src="after/${f}" alt="Depois: ${nome(f)}"></a></figure></div>
  </section>`).join("");
fs.writeFileSync(path.join(base, "comparativo.html"), `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Delfos: antes e depois</title>
<link rel="icon" href="../dashboard/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@300..600&family=Noto+Serif+Display:wght@300..700&display=swap">
<link rel="stylesheet" href="../dashboard/tokens.css">
<style>
  body { margin: 0; background: var(--fundo); color: var(--texto); font: 400 15px/1.55 var(--font); }
  main { max-width: 1400px; margin: 0 auto; padding: 64px 24px 96px; }
  h1 { font: 300 46px/1.05 var(--font-voz); letter-spacing: -0.03em; margin: 0 0 12px; }
  p { color: var(--texto-2); max-width: 64ch; }
  section { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--linha-forte); }
  h2 { font: 500 11px var(--font); letter-spacing: .12em; text-transform: uppercase; color: var(--texto-3); margin: 0 0 16px; }
  .par { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
  figure { margin: 0; }
  figcaption { font-size: 13px; color: var(--texto-2); margin-bottom: 8px; }
  img { width: 100%; height: auto; display: block; border: 1px solid var(--linha); }
  @media (max-width: 700px) { .par { grid-template-columns: 1fr; } }
</style></head>
<body><main>
<h1>Delfos: antes e depois</h1>
<p>Mesmas telas, mesmos dados fictícios, mesmas medidas (1440px e 390px). Toque numa imagem para ver no tamanho real. Relatório em DESIGN_AUDIT.md; sistema em dashboard/DESIGN.md.</p>
${linhas}
</main></body></html>
`);
console.log("comparativo.html com", depois.length, "pares");
