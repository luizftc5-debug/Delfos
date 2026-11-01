(() => {
  document.querySelectorAll("[data-local]").forEach(el => { el.hidden = Sessao.ativo(); });
  if (Sessao.logado()) {
    document.querySelectorAll("[data-entrar], [data-criar]").forEach(a => {
      a.href = "index.html";
      a.textContent = a.hasAttribute("data-criar") ? "Abrir meu painel" : "Meu painel";
    });
    return;
  }
  // Sem contas ligadas (API_PUBLICA vazia), criar conta e entrar levariam a um
  // formulário indisponível: o caminho que funciona, usar neste aparelho, vira
  // a ação principal, e a página não promete o que não pode entregar.
  if (!Sessao.ativo()) {
    document.querySelectorAll("[data-criar]").forEach(a => { a.href = "index.html?local=1"; a.textContent = "Começar neste aparelho"; });
    document.querySelectorAll("[data-entrar]").forEach(a => { a.hidden = true; });
    document.querySelectorAll("[data-local] a").forEach(a => { a.hidden = true; });
  }
})();
