(() => {
  const contasAtivas = Sessao.ativo();
  document.querySelectorAll("[data-iniciar]").forEach(a => {
    a.href = contasAtivas ? "entrar.html?modo=criar" : "index.html?local=1";
    a.textContent = contasAtivas ? "Criar conta" : "Usar neste aparelho";
  });
  document.querySelectorAll("[data-local]").forEach(el => { el.hidden = Sessao.ativo(); });
  document.querySelectorAll("[data-conta-nota]").forEach(el => { el.hidden = contasAtivas; });
  if (Sessao.logado()) {
    document.querySelectorAll("[data-entrar], [data-criar], [data-iniciar]").forEach(a => {
      a.href = "index.html";
      a.textContent = a.hasAttribute("data-iniciar") ? "Abrir meu painel" : "Meu painel";
    });
  }
})();
