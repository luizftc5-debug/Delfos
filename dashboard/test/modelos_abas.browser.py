"""Cria os 32 modelos pela interface e registra um item real em cada um."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import shutil
from playwright.sync_api import sync_playwright, expect

class Silencioso(SimpleHTTPRequestHandler):
    def log_message(self,*_args):pass

def abrir(page):
    if page.locator('#btn-nova-aba').is_visible():page.locator('#btn-nova-aba').click()
    else:
        page.locator('#btn-mais-abas').click();page.locator('[data-acao="nova"]').click()
    page.locator('.modal.criacao').wait_for()

def cabe(page):
    for seletor in ['.modal.criacao','.criacao-corpo']:
        assert page.locator(seletor).evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),seletor
    assert page.locator('.criacao-rodape').evaluate('(e)=>e.getBoundingClientRect().bottom<=innerHeight+1')

def testar(base):
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
        ctx=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR',reduced_motion='reduce')
        ctx.route('https://**/*',lambda r:r.abort())
        page=ctx.new_page();page.set_default_timeout(9000);erros=[];posts=[];ia=[]
        page.on('pageerror',lambda e:erros.append(str(e)))
        page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
        page.on('request',lambda r:ia.append(r.url) if '/vendor/webllm/' in r.url or '/ia-local' in r.url else None)
        page.goto(base+'/bemvindo.html')
        page.evaluate('Personalizacao.pular();Store.definirPreferencias({experiencia:{lembretes:{resumoDoDia:false}}})')
        page.goto(base+'/index.html');abrir(page)
        modelos=page.evaluate('ModelosAbas.listar()')
        assert len(modelos)==32
        assert page.locator('[data-modelo-id]:not([data-modelo-id=""])').count()==32
        assert page.locator('[data-modelo-area]').count()==40  # 32 modelos específicos e 8 essenciais (com Alimentação)
        # O catálogo não cria as 32 abas automaticamente e preserva a aba livre.
        assert page.evaluate('Store.lista("pilares").length')==0
        expect(page.get_by_role('radio',name='Aba livre',exact=True)).to_have_attribute('aria-checked','true')
        page.locator('#cr-busca-modelo').fill('Uber')
        expect(page.get_by_role('radio',name='Motorista de aplicativo',exact=True)).to_be_visible()
        assert page.locator('[data-modelo-area]:visible').count()==2
        page.locator('#cr-categoria-modelo').select_option('estudos')
        expect(page.locator('[data-catalogo-status]')).to_contain_text('Nenhum modelo')
        page.locator('#cr-busca-modelo').fill('')
        assert page.locator('[data-modelo-area]:visible').count()==7
        page.get_by_role('radio',name='TCC',exact=True).focus();page.keyboard.press('Home')
        expect(page.get_by_role('radio',name='Aba livre',exact=True)).to_be_focused()
        page.keyboard.press('End');expect(page.get_by_role('radio',name='Cursos e certificações',exact=True)).to_be_focused()
        # Busca, filtros, nome acessível e rodapé em celular/desktop e ambos os temas.
        for tema in ['light','dark']:
            page.evaluate('(v)=>UI.tema.definir(v)',tema)
            for largura in [320,390,768,1440]:
                page.set_viewport_size({'width':largura,'height':850})
                for categoria in ['','esportes','estudos','saude','vida','trabalho']:
                    page.locator('#cr-categoria-modelo').select_option(categoria)
                    cabe(page)
                page.locator('#cr-categoria-modelo').select_option('')
                page.locator('#cr-busca-modelo').fill('religiao')
                expect(page.get_by_role('radio',name='Religião e espiritualidade',exact=True)).to_be_visible()
                cabe(page);page.locator('#cr-busca-modelo').fill('')
        page.locator('[data-acao="cancelar"]').click()
        assert page.evaluate('Store.lista("pilares").length')==0
        page.set_viewport_size({'width':1440,'height':1000})
        for modelo in modelos:
            page.goto(base+'/index.html');abrir(page)
            page.locator('#cr-busca-modelo').fill(modelo['nome'])
            page.get_by_role('radio',name=modelo['nome'],exact=True).click()
            expect(page.locator('[data-modelo-selecionado]')).to_contain_text(modelo['nome'])
            page.locator('[data-acao="avancar"]').click()
            expect(page.locator('#cr-nome')).to_have_value(modelo['nome'])
            page.locator('#cr-nome').fill(modelo['nome']+' pessoal')
            page.locator('#cr-prop').fill('Minhas preferências: manter os campos do modelo e personalizar depois.')
            page.locator('[data-acao="avancar"]').click()
            expect(page.locator('[data-campo]')).to_have_count(len(modelo['campos']))
            assert page.locator('[data-vistas]').input_value()==modelo['visual']['vista'],modelo['nome']
            assert page.locator('#cr-agenda').is_checked()==modelo['naAgenda']
            assert page.locator('#cr-checkin').is_checked()==modelo['checkin']
            page.locator('[data-acao="criar"]').click();page.wait_for_url('**/pilar.html?id=*')
            dados=page.evaluate('Store.achar("pilares",UI.parametro("id"))')
            assert dados['modeloOrigem']==modelo['id']
            assert dados['nome']==modelo['nome']+' pessoal'
            assert dados['itens']==[]
            assert dados['agruparPor']==modelo['agruparPor']
            assert dados['visual']['vista']==modelo['visual']['vista']
            assert [(c['id'],c['tipo'],c['opcoes']) for c in dados['campos']]==[(c['id'],c['tipo'],c['opcoes']) for c in modelo['campos']],modelo['nome']
            # Todos os campos precisam funcionar no formulário do registro.
            page.locator('#lista .empty').get_by_role('button',name='Abrir o formulário completo',exact=True).click()
            form=page.locator('.modal.formulario')
            form.locator('[name="descricao"]').fill('Registro de teste')
            if form.locator('[name="data"]').count():form.locator('[name="data"]').fill(page.evaluate('UI.hojeISO()'))
            for campo in modelo['campos']:
                entrada=form.locator(f'[name="{campo["id"]}"]')
                tipo=campo['tipo']
                if tipo=='select':
                    if entrada.evaluate('(e)=>e.tagName')=='SELECT':entrada.select_option(campo['opcoes'][-1])
                    else:entrada.locator('..').locator('button[data-valor]').last.click()
                elif tipo=='simNao':entrada.check()
                elif tipo=='number':entrada.fill('12.5' if campo['id']=='distanciaKm' else '12')
                elif tipo=='dinheiro':entrada.fill('12,50')
                elif tipo=='time':entrada.fill('08:30')
                elif tipo=='date':entrada.fill(page.evaluate('UI.hojeISO()'))
                elif tipo=='link':entrada.fill('https://example.com/referencia')
                else:entrada.fill('Informação de teste')
            form.locator('[data-acao="confirmar"]').click();form.wait_for(state='detached')
            item=page.evaluate('Store.achar("pilares",UI.parametro("id")).itens[0]')
            assert item['descricao']=='Registro de teste'
            assert all(c['id'] in item['extras'] for c in modelo['campos'])
            if modelo['id']=='corrida':assert item['extras']['distanciaKm']==12.5
            for campo in modelo['campos']:
                if campo['tipo']=='dinheiro':assert item['extras'][campo['id']]==12.5
            page.reload();expect(page.locator('#titulo')).to_contain_text(modelo['nome'])
            assert page.evaluate('Store.achar("pilares",UI.parametro("id")).itens.length')==1
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),modelo['nome']
        assert page.evaluate('Store.lista("pilares").length')==32
        assert not ia,ia
        assert not posts,posts
        assert not erros,erros
        browser.close()
        print('OK: 32 modelos criados, campos preenchidos, busca, categorias, teclado, temas e celular; sem inferência de IA.')

if __name__=='__main__':
    root=Path(__file__).resolve().parents[1]
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Silencioso,directory=str(root)))
    Thread(target=server.serve_forever,daemon=True).start()
    try:testar(f'http://127.0.0.1:{server.server_port}')
    finally:server.shutdown()
