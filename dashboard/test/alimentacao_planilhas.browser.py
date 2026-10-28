"""Aba Alimentação, planilhas do Excel, reordenar abas arrastando e a caixa sozinha em largura total."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from zipfile import ZipFile
import shutil
from playwright.sync_api import sync_playwright, expect

class Silencioso(SimpleHTTPRequestHandler):
    def log_message(self,*_args): pass

def sem_excesso(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (page.url, page.viewport_size)

def xml_da_planilha(caminho):
    with ZipFile(caminho) as z:
        return {n: z.read(n).decode('utf-8') for n in z.namelist()}

def testar(base, pasta):
    (pasta/'dieta.csv').write_text('Refeição;Alimento;Quantidade;Kcal\nCafé da manhã;Pão francês;1 unidade;150\nCafé da manhã;Ovos mexidos;2 ovos;\nAlmoço;Arroz;150 g;\nAlmoço;Patinho grelhado;120 g;\nAlmoço;Salada;à vontade;\n',encoding='utf-8')
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
        ctx=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR',reduced_motion='reduce',accept_downloads=True)
        ctx.route('https://**/*',lambda r:r.abort())
        page=ctx.new_page();page.set_default_timeout(9000);erros=[]
        page.on('pageerror',lambda e:erros.append(str(e)))
        page.goto(base+'/bemvindo.html')
        page.evaluate('Personalizacao.pular();Store.definirPreferencias({experiencia:{lembretes:{resumoDoDia:false}}})')

        # Criar a aba pronta "Alimentação" pelo criador: tela própria, fora da agenda.
        page.goto(base+'/index.html')
        page.locator('#btn-nova-aba').click();page.locator('.modal.criacao').wait_for()
        page.locator('#cr-busca-modelo').fill('Alimentação')
        page.get_by_role('radio',name='Alimentação',exact=True).click()
        page.locator('[data-acao="avancar"]').click();page.locator('[data-acao="avancar"]').click()
        expect(page.locator('[data-previa-campos]')).to_contain_text('Alimentos e calorias')
        page.get_by_role('button',name='Criar aba').click()
        page.wait_for_url('**/pilar.html?id=*')
        pid=page.evaluate('Store.lista("pilares")[0].id')
        aba=page.evaluate('(id)=>Store.achar("pilares",id)',pid)
        assert aba['modelo']=='alimentacao' and aba['naAgenda'] is False and aba['plano']==[] and aba['campos']==[],aba
        expect(page.locator('#alimentacao-conteudo')).to_contain_text('Monte sua dieta')
        expect(page.locator('#secao-itens')).to_be_hidden()
        expect(page.locator('[data-secao="registros"]')).to_have_text('Plano diário')

        # Importar a dieta de uma planilha: kcal do arquivo respeitada, as que faltam estimadas.
        with page.expect_file_chooser() as fc: page.locator('#alimentacao-conteudo [data-ali="importar"]').first.click()
        fc.value.set_files(str(pasta/'dieta.csv'))
        page.locator('.revisar-arquivo-modal').wait_for()
        expect(page.locator('.revisar-arquivo-modal')).to_contain_text('estimado pela TACO')
        expect(page.locator('.revisar-arquivo-modal')).to_contain_text('sem calorias')
        page.locator('[data-acao="ok"]').click()
        plano=page.evaluate('(id)=>Store.achar("pilares",id).plano',pid)
        assert len(plano)==4,plano
        plano=[r for r in plano if r['itens']]
        assert [r['nome'] for r in plano]==['Café da manhã','Almoço'],plano
        assert [i['kcal'] for i in plano[0]['itens']]==[150,146],plano[0]
        assert [i['kcal'] for i in plano[1]['itens']]==[192,263,None],plano[1]
        # Desfazer devolve as refeições vazias; importar de novo para seguir.
        page.get_by_role('button',name='Desfazer').last.click()
        assert not page.evaluate('(id)=>Store.achar("pilares",id).plano.some(r=>r.itens.length)',pid)
        with page.expect_file_chooser() as fc: page.locator('#alimentacao-conteudo [data-ali="importar"]').first.click()
        fc.value.set_files(str(pasta/'dieta.csv'))
        page.locator('[data-acao="ok"]').click()

        # Metas e objetivos; marcar "Comi" soma as calorias de hoje.
        page.locator('[data-ali="objetivos"]').click()
        form=page.locator('.modal.formulario')
        form.locator('[name="metaKcal"]').fill('1800')
        form.locator('[name="objetivos"]').fill('Chegar a 75 kg até março.')
        form.locator('[data-acao="confirmar"]').click()
        expect(page.locator('.ali-kcal')).to_contain_text('de 1.800 kcal')
        page.get_by_label('Comi Café da manhã hoje').check()
        expect(page.locator('.ali-kcal .voz')).to_have_text('296')
        expect(page.locator('.ali-objetivos')).to_contain_text('Chegar a 75 kg')

        # Fora do plano: escrito com quantidade, o Delfos estima.
        page.locator('#ali-extra-nome').fill('1 pão francês');page.keyboard.press('Enter')
        expect(page.locator('.ali-kcal .voz')).to_have_text('446')
        extra=page.evaluate('(id)=>{const d=Store.achar("pilares",id).diario;return Object.values(d)[0].extras[0]}',pid)
        assert extra['alimento']=='Pão francês' and extra['quantidade']=='1 pão' and extra['kcal']==150 and extra['estimado'],extra

        # Evolução: a semana contra a meta.
        page.locator('[data-secao="visao-geral"]').click()
        expect(page.locator('#alimentacao-evolucao')).to_contain_text('no único dia registrado')
        for largura in [320,390,768,1440]:
            page.set_viewport_size({'width':largura,'height':900})
            page.goto(f'{base}/pilar.html?id={pid}&largura={largura}');sem_excesso(page)
        page.set_viewport_size({'width':1440,'height':1000})

        # Excel: rotina da semana e o mês do calendário, abertos como planilha de verdade.
        page.goto(base+'/pessoal.html')
        page.evaluate('''()=>{Store.inserir("pessoal.rotina",{titulo:"Anatomia",dias:[1,3],hora:"07:00",horaFim:"08:40",categoria:"aula",local:"Sala 12"});
          Store.inserir("pessoal.compromissos",{descricao:"Dentista",data:UI.hojeISO(),hora:"14:00",tipo:"consulta",concluido:false})}''')
        page.goto(base+'/pessoal.html?x=1#rotina')
        with page.expect_download() as d: page.locator('#btn-excel-rotina').click()
        assert d.value.suggested_filename=='Delfos - Rotina da semana.xlsx'
        d.value.save_as(str(pasta/'rotina.xlsx'))
        x=xml_da_planilha(pasta/'rotina.xlsx')
        assert 'Anatomia' in x['xl/worksheets/sheet1.xml'] and 'Sala 12' in x['xl/worksheets/sheet1.xml']
        assert 'name="Lista"' in x['xl/workbook.xml']
        page.locator('[data-secao="calendario"]').click()
        with page.expect_download() as d: page.locator('[data-cal-excel]').click()
        assert d.value.suggested_filename.startswith('Delfos - ') and d.value.suggested_filename.endswith('.xlsx')
        d.value.save_as(str(pasta/'mes.xlsx'))
        assert 'Dentista' in xml_da_planilha(pasta/'mes.xlsx')['xl/worksheets/sheet2.xml']

        # A caixa que sobra sozinha na última linha ocupa a largura toda.
        page.goto(base+'/pessoal.html#visao-geral')
        grade=page.locator('#painel-visao-geral .painel-analises')
        largura=grade.evaluate('(e)=>e.getBoundingClientRect().width')
        ultima=page.locator('#sec-perguntas')
        expect(ultima).to_be_visible()
        assert abs(ultima.evaluate('(e)=>e.getBoundingClientRect().width')-largura)<2

        # Minhas abas: segurar e arrastar muda a ordem e a barra lateral.
        page.goto(base+'/index.html')
        page.locator('#btn-organizar').click()
        lista=page.locator('[data-abas]')
        ids=lambda: lista.locator('li').evaluate_all('(ls)=>ls.map((l)=>l.dataset.abaId)')
        antes=ids()
        origem=lista.locator('li').last.bounding_box();destino=lista.locator('li').nth(1).bounding_box()
        x0=origem['x']+origem['width']*0.55;y0=origem['y']+origem['height']/2
        page.mouse.move(x0,y0);page.mouse.down()
        for k in range(1,16): page.mouse.move(x0,y0+(destino['y']+4-y0)*k/15)
        expect(lista.locator('li.arrastando')).to_have_count(1)
        page.mouse.up()
        depois=ids()
        assert depois[1]==antes[-1] and sorted(depois)==sorted(antes),(antes,depois)
        assert page.evaluate('UI.experiencia().ordemAbas')==depois
        expect(page.locator('#sidebar .nav-item').nth(2)).to_contain_text('Alimentação')
        # Teclado: as setas continuam funcionando.
        lista.locator('li').nth(1).locator('[data-mover="1"]').click()
        assert ids()[2]==antes[-1]

        # No celular: arrastar pela alça reordena; rolar tocando na linha, não.
        celular=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,locale='pt-BR',reduced_motion='reduce')
        celular.route('https://**/*',lambda r:r.abort())
        tela=celular.new_page();tela.set_default_timeout(9000)
        tela.goto(base+'/bemvindo.html');tela.evaluate('Personalizacao.pular();Store.definirPreferencias({experiencia:{lembretes:{resumoDoDia:false}}})')
        tela.goto(base+'/index.html');tela.locator('#btn-mais-abas').click();tela.locator('[data-acao="organizar"]').click()
        ul=tela.locator('[data-abas]');ul.locator('li').first.scroll_into_view_if_needed()
        ordem=lambda: ul.locator('li').evaluate_all('(ls)=>ls.map((l)=>l.dataset.abaId)')
        cdp=celular.new_cdp_session(tela)
        def arrastar(caixa,ate_y):
            x=caixa['x']+caixa['width']/2;y=caixa['y']+caixa['height']/2
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            for k in range(1,13): cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y+(ate_y-y)*k/12}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            tela.wait_for_timeout(300)
        antes=ordem()
        arrastar(ul.locator('li').nth(1).locator('.aba-nome').bounding_box(),ul.locator('li').nth(0).bounding_box()['y'])
        assert ordem()==antes,'rolar pela linha não reordena'
        arrastar(ul.locator('li').nth(2).locator('.ordem-alca').bounding_box(),ul.locator('li').nth(0).bounding_box()['y']+4)
        assert ordem()[0]==antes[2],(antes,ordem())
        celular.close()

        assert not erros,erros
        browser.close()

if __name__ == '__main__':
    raiz=Path(__file__).resolve().parents[1]
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Silencioso,directory=str(raiz)))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with TemporaryDirectory() as tmp:
            testar(f'http://127.0.0.1:{server.server_port}',Path(tmp))
        print('Alimentação, planilhas do Excel, reordenar arrastando e caixa em largura total passaram.')
    finally:
        server.shutdown()
