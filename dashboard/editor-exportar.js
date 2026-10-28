/* A exportação usa o conteúdo do resumo, independente do tema e das barras.
   A margem da página fica zerada para impedir os cabeçalhos do navegador;
   espaços em thead/tfoot conservam o respiro em cada página do documento. */
const EditorExportar = (() => {
  const escapar = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ESTILO_CONTEUDO = `
    .resumo-exportado{font-family:Arial,Helvetica,sans-serif;font-size:11.5pt;line-height:1.65;color:#202020;overflow-wrap:anywhere;
      --texto:#202020;--texto-2:#424242;--texto-3:#555;--linha-forte:#bcbcbc;--superficie-2:#f3f3f3;--font-voz:Georgia,serif;--serie-entrada:#245b96;--st-good:#397347;--st-warning:#966519}
    .resumo-exportado .resumo-exportado-titulo{font-family:Georgia,'Times New Roman',serif;font-size:26pt;font-weight:700;line-height:1.22;text-align:center;letter-spacing:-.02em;margin:0 0 22pt;break-after:avoid;page-break-after:avoid;overflow-wrap:anywhere}
    .resumo-exportado-conteudo>:first-child{margin-top:0}
    .resumo-exportado p,.resumo-exportado li{orphans:3;widows:3}
    .resumo-exportado p{margin:0 0 10pt}
    .resumo-exportado h1{font-family:Georgia,serif;font-size:20pt;line-height:1.3;margin:20pt 0 9pt}
    .resumo-exportado h2{font-size:16pt;line-height:1.35;margin:18pt 0 8pt}
    .resumo-exportado h3{font-size:13pt;line-height:1.4;margin:15pt 0 7pt}
    .resumo-exportado h1,.resumo-exportado h2,.resumo-exportado h3{break-after:avoid;page-break-after:avoid}
    .resumo-exportado ul,.resumo-exportado ol{margin:0 0 10pt;padding-left:22pt}
    .resumo-exportado a{color:#245b96;text-decoration:underline}
    .resumo-exportado a::after{content:none!important}
    .resumo-exportado img{display:block;max-width:100%;max-height:250mm;height:auto;object-fit:contain;break-inside:avoid;page-break-inside:avoid}
    .resumo-exportado img.img-p{width:33%}.resumo-exportado img.img-m{width:60%}.resumo-exportado img.img-g{width:100%}
    .resumo-exportado img.img-c{margin-left:auto;margin-right:auto}
    .resumo-exportado table{width:100%;border-collapse:collapse;margin:12pt 0;font-size:.94em;table-layout:fixed}
    .resumo-exportado td,.resumo-exportado th{border:1px solid #bcbcbc;padding:6pt 8pt;vertical-align:top;overflow-wrap:anywhere}
    .resumo-exportado th{background:#f3f3f3;font-weight:700;text-align:left}
    .resumo-exportado tr{break-inside:avoid;page-break-inside:avoid}
    .resumo-exportado blockquote{margin:12pt 0;padding:2pt 0 2pt 12pt;border-left:3pt solid #bcbcbc;color:#424242;font-style:italic}
    .resumo-exportado blockquote[style*="margin"]{border-left:none;font-style:normal;color:inherit}
    .resumo-exportado pre{padding:10pt 12pt;background:#f3f3f3;font-family:'Courier New',monospace;font-size:10pt;white-space:pre-wrap;overflow-wrap:anywhere}
    .resumo-exportado .callout{border-left:3pt solid #999;padding:8pt 12pt;background:#f3f3f3;margin:12pt 0;break-inside:avoid;page-break-inside:avoid}
    .resumo-exportado hr{border:0;border-top:1px solid #bcbcbc;margin:18pt 0}
    .resumo-exportado ul.checklist{list-style:none;padding-left:0}
    .resumo-exportado ul.checklist li::before{content:'☐';margin-right:7pt}
    .resumo-exportado ul.checklist li[data-feito]::before{content:'☑'}
    .resumo-exportado ul.checklist li[data-feito]{text-decoration:line-through;color:#666}
  `;

  function word(titulo, conteudo) {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapar(titulo)}</title>
      <style>@page{size:A4;margin:18mm 20mm}body{margin:0;background:#fff}${ESTILO_CONTEUDO}</style></head>
      <body><article class="resumo-exportado"><h1 class="resumo-exportado-titulo">${escapar(titulo)}</h1><div class="resumo-exportado-conteudo">${conteudo}</div></article></body></html>`;
  }

  function instalar({ titulo, corpo }) {
    const estilo = document.createElement("style");
    estilo.textContent = ESTILO_CONTEUDO;
    document.head.appendChild(estilo);
    let impressao = null, tituloAnterior = null;
    const limpar = () => {
      impressao?.remove(); impressao = null;
      if (tituloAnterior !== null) { document.title = tituloAnterior; tituloAnterior = null; }
    };
    const preparar = () => {
      limpar();
      const nome = titulo().trim() || "Resumo";
      tituloAnterior = document.title; document.title = nome;
      impressao = document.createElement("table");
      impressao.className = "resumo-impressao";
      impressao.setAttribute("role", "presentation");
      impressao.innerHTML = `<thead><tr><td class="resumo-impressao-espaco"></td></tr></thead>
        <tbody><tr><td class="resumo-impressao-pagina"><article class="resumo-exportado"><h1 class="resumo-exportado-titulo"></h1><div class="resumo-exportado-conteudo"></div></article></td></tr></tbody>
        <tfoot><tr><td class="resumo-impressao-espaco"></td></tr></tfoot>`;
      impressao.querySelector("h1").textContent = nome;
      const conteudo = impressao.querySelector(".resumo-exportado-conteudo");
      for (const filho of corpo.childNodes) conteudo.appendChild(filho.cloneNode(true));
      conteudo.querySelectorAll("[contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
      conteudo.querySelectorAll(".selecionada").forEach(el => el.classList.remove("selecionada"));
      document.body.appendChild(impressao);
    };
    window.addEventListener("beforeprint", preparar);
    window.addEventListener("afterprint", limpar);
    return {
      async imprimir() {
        if (document.fonts?.ready) await document.fonts.ready;
        await Promise.all([...corpo.querySelectorAll("img")].map(img => img.decode?.().catch(() => {})));
        window.print();
      },
    };
  }
  return { instalar, word };
})();
if (typeof module !== "undefined") module.exports = EditorExportar;
