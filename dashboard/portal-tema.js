/* A entrada segue a escolha do painel sem carregar seus dados ou ferramentas. */
(() => {
  let tema = "auto";
  try { tema = localStorage.getItem("organizador.tema") || tema; } catch { /* usa o tema padrão */ }
  document.documentElement.dataset.theme = tema === "light" || tema === "auto" && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
})();
