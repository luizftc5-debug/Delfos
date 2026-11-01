(() => {
  document.querySelectorAll("[data-local]").forEach(el => { el.hidden = Sessao.ativo(); });
  if (Sessao.logado()) {
    document.querySelectorAll("[data-entrar], [data-criar]").forEach(a => {
      a.href = "index.html";
      a.textContent = a.hasAttribute("data-criar") ? "Abrir meu painel ↗" : "Meu painel";
    });
  }
})();
