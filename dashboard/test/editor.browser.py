"""Regressões reais do editor. Requer Playwright Python e Chromium local.

Executar da raiz: python dashboard/test/editor.browser.py
Usa servidor efêmero, dados fictícios e bloqueia requisições externas.
"""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
from threading import Thread

from playwright.sync_api import sync_playwright


class Silencioso(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def salvo(page):
    page.wait_for_function("document.querySelector('#estado').textContent === 'Salvo'")


def editar(page, titulo, texto):
    page.locator("#titulo").fill(titulo)
    page.locator("#corpo").fill(texto)
    salvo(page)


def quantidade(page, disciplina):
    return page.evaluate("id => Store.achar('faculdade.disciplinas', id).resumos.length", disciplina)


def testar(base):
    with sync_playwright() as p:
        caminho = shutil.which("chromium") or shutil.which("google-chrome")
        navegador = p.chromium.launch(**({"executable_path": caminho} if caminho else {}), args=["--no-sandbox"])
        pagina = navegador.new_page(viewport={"width": 1440, "height": 1000}, locale="pt-BR")
        pagina.set_default_timeout(7000)
        pagina.route("https://**/*", lambda rota: rota.abort())
        erros = []
        pagina.on("pageerror", lambda erro: erros.append(str(erro)))
        pagina.goto(f"{base}/bemvindo.html")
        disciplina = pagina.evaluate("""() => {
          Personalizacao.pular();
          Store.definirPreferencias({experiencia:{lembretes:{resumoDoDia:false}}});
          return Store.inserir('faculdade.disciplinas', {
            nome:'Disciplina de teste',status:'ativa',avaliacoes:[],materiais:[],prazos:[],resumos:[]
          }).id;
        }""")
        novo = f"{base}/resumo.html?disciplina={disciplina}"
        pagina.goto(novo)
        assert pagina.locator("#contagem,.editor-dica,#btn-salvar").count() == 0
        assert pagina.locator(".editor-assinatura").inner_text() == "O essencial se revela: seu editor sem distrações"

        editar(pagina, "Novo resumo", "Texto guardado automaticamente.")
        endereco = pagina.url
        assert "&id=" in endereco
        assert quantidade(pagina, disciplina) == 1
        pagina.reload()
        assert pagina.locator("#corpo").inner_text() == "Texto guardado automaticamente."
        editar(pagina, "Resumo revisado", "Texto atualizado.")
        assert quantidade(pagina, disciplina) == 1
        assert pagina.url == endereco
        pagina.reload()
        assert pagina.locator("#titulo").input_value() == "Resumo revisado"
        assert pagina.locator("#corpo").inner_text() == "Texto atualizado."

        # Recarregar antes do debounce também salva, no beforeunload/pagehide.
        pagina.locator("#corpo").fill("Edição imediatamente antes da recarga.")
        pagina.reload()
        assert pagina.locator("#corpo").inner_text() == "Edição imediatamente antes da recarga."
        assert quantidade(pagina, disciplina) == 1

        # Apagar o último caractere também precisa atualizar o documento salvo.
        editar(pagina, "", "")
        pagina.reload()
        assert pagina.locator("#corpo").inner_text().strip() == ""
        assert quantidade(pagina, disciplina) == 1

        # Símbolo entra no cursor, sem trocar a seleção por outra posição.
        editar(pagina, "Símbolos", "AB")
        pagina.evaluate("""() => {
          const corpo = document.querySelector('#corpo'); corpo.focus();
          const faixa = document.createRange(); faixa.setStart(corpo.firstChild,1); faixa.collapse(true);
          const selecao = getSelection(); selecao.removeAllRanges(); selecao.addRange(faixa);
          document.dispatchEvent(new Event('selectionchange'));
        }""")
        pagina.get_by_role("button", name="Inserir símbolo", exact=True).click()
        pagina.get_by_role("button", name="Grau", exact=True).click()
        assert pagina.locator("#corpo").inner_text() == "A°B"
        pagina.keyboard.press("Control+z")
        assert pagina.locator("#corpo").inner_text() == "AB"
        salvo(pagina)

        # Um rascunho com falha na primeira gravação não duplica ao tentar de novo.
        pagina.goto(novo)
        pagina.evaluate("""() => {
          window.gravarOriginal = Storage.prototype.setItem;
          Storage.prototype.setItem = function(chave, valor) {
            if(chave === 'organizador.estado.v2') throw new DOMException('Cheio','QuotaExceededError');
            return window.gravarOriginal.call(this,chave,valor);
          };
        }""")
        pagina.locator("#titulo").fill("Falha recuperável")
        pagina.locator("#corpo").fill("Texto preservado depois da falha.")
        pagina.wait_for_function("document.querySelector('#estado').textContent === 'Não foi possível salvar'")
        assert quantidade(pagina, disciplina) == 2
        pagina.locator("#corpo").fill("Texto preservado, com outra edição.")
        pagina.wait_for_function("document.querySelector('#estado').textContent === 'Não foi possível salvar'")
        assert quantidade(pagina, disciplina) == 2
        pagina.evaluate("() => { Storage.prototype.setItem = window.gravarOriginal; }")
        pagina.locator("#btn-repetir-salvamento").click()
        salvo(pagina)
        assert quantidade(pagina, disciplina) == 2
        pagina.reload()
        assert pagina.locator("#corpo").inner_text() == "Texto preservado, com outra edição."

        # A versão externa não é sobrescrita por texto local ainda em edição.
        pagina.locator("#corpo").fill("Minha edição local")
        pagina.evaluate("""() => {
          const id = new URLSearchParams(location.search).get('id');
          const d = new URLSearchParams(location.search).get('disciplina');
          Store.subAtualizar('faculdade.disciplinas',d,'resumos',id,{conteudo:'<p>Versão externa</p>'});
        }""")
        assert pagina.locator("#estado").inner_text() == "Há outra versão"
        assert pagina.locator("#corpo").inner_text() == "Minha edição local"
        pagina.locator("#btn-repetir-salvamento").click()
        pagina.get_by_role("button", name="Guardar minha cópia", exact=True).click()
        salvo(pagina)
        assert quantidade(pagina, disciplina) == 3
        assert pagina.evaluate("id => Store.achar('faculdade.disciplinas',id).resumos.some(r => r.conteudo === '<p>Versão externa</p>')", disciplina)

        # Status ocupa o centro da janela, com ou sem ferramentas de um lado.
        for largura in (1440, 1024, 768, 390, 320):
            pagina.set_viewport_size({"width": largura, "height": 900})
            pagina.wait_for_timeout(70)
            caixa = pagina.locator(".editor-status").bounding_box()
            assert abs(caixa["x"] + caixa["width"] / 2 - largura / 2) <= 2, caixa
            assert pagina.locator("#estado").is_visible()
            assert pagina.evaluate("document.documentElement.scrollWidth <= innerWidth")
        assert not erros, erros
        navegador.close()


if __name__ == "__main__":
    raiz = Path(__file__).resolve().parents[1]
    servidor = ThreadingHTTPServer(("127.0.0.1", 0), partial(Silencioso, directory=str(raiz)))
    Thread(target=servidor.serve_forever, daemon=True).start()
    try:
        testar(f"http://127.0.0.1:{servidor.server_port}")
        print("Editor: autosave, recarga, recuperação sem duplicação, símbolos, conflitos e responsividade passaram.")
    finally:
        servidor.shutdown()
        servidor.server_close()
