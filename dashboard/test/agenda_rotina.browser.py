"""Rotina da semana, importação de arquivo ou foto para o calendário e as formas de ver uma aba."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from zipfile import ZipFile, ZIP_DEFLATED
import re
import shutil
from playwright.sync_api import sync_playwright, expect

class Silencioso(SimpleHTTPRequestHandler):
    def log_message(self,*_args): pass

HORARIO='''<html><body style="font-family:Arial;background:#fff;padding:20px"><h2>Horário 2026.2</h2>
<table border=1 cellpadding=10 style="border-collapse:collapse;font-size:18px">
<tr><th>Horário</th><th>Segunda</th><th>Terça</th><th>Quarta</th><th>Quinta</th><th>Sexta</th></tr>
<tr><td>07:00 - 08:40</td><td>Clínica Médica</td><td>Pediatria</td><td></td><td>Clínica Médica</td><td>Farmacologia</td></tr>
<tr><td>13:30 - 15:10</td><td></td><td>Saúde Coletiva</td><td>Patologia</td><td></td><td>Tutoria</td></tr>
</table></body></html>'''

def xlsx(caminho):
    # Planilha mínima: texto em linha, data como número de série e hora como fração do dia.
    linhas=[['Data','Hora','Evento','Local'],[46331,0.5833333333,'Reunião do TCC','Biblioteca'],[46340,'','Entrega do relatório','']]
    def cel(ref,v):
        return f'<c r="{ref}"><v>{v}</v></c>' if isinstance(v,(int,float)) else f'<c r="{ref}" t="inlineStr"><is><t>{v}</t></is></c>'
    xml='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
    for i,l in enumerate(linhas,1):
        xml+=f'<row r="{i}">'+''.join(cel(f'{"ABCD"[j]}{i}',v) for j,v in enumerate(l) if v!='')+'</row>'
    xml+='</sheetData></worksheet>'
    with ZipFile(caminho,'w',ZIP_DEFLATED) as z: z.writestr('xl/worksheets/sheet1.xml',xml)

def sem_excesso(page):
    culpados=page.evaluate('''()=>document.documentElement.scrollWidth<=innerWidth+1 ? [] :
      [...document.querySelectorAll("body *")].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(-4).map(e=>e.tagName+"."+e.className)''')
    assert not culpados, (page.url, page.viewport_size, culpados)

def escolher(page, gatilho, arquivo):
    with page.expect_file_chooser() as fc:
        gatilho.click()
    fc.value.set_files(arquivo)
    page.locator('.revisar-arquivo-modal').wait_for(timeout=120000)

def testar(base, pasta):
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
        foto=browser.new_page(viewport={'width':900,'height':300})
        foto.set_content(HORARIO);foto.screenshot(path=str(pasta/'horario.png'));foto.close()
        (pasta/'agenda.csv').write_text('Data;Hora;Compromisso;Local\n03/11/2026;08:00;Prova de Anatomia;Sala 4\n18/11/2026;14:00;Consulta;Clínica\n',encoding='utf-8')
        xlsx(pasta/'agenda.xlsx')
        (pasta/'antigo.xls').write_bytes(b'\xd0\xcf\x11\xe0')
        ctx=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR',reduced_motion='reduce')
        ctx.route('https://**/*',lambda r:r.abort())
        page=ctx.new_page();page.set_default_timeout(9000);erros=[]
        page.on('pageerror',lambda e:erros.append(str(e)))
        page.goto(base+'/bemvindo.html')
        page.evaluate('Personalizacao.pular();Store.definirPreferencias({experiencia:{lembretes:{resumoDoDia:false}}})')

        # Estado salvo antes da rotina existir: normalizar acrescenta a lista sem perder nada.
        antigo=page.evaluate('''()=>{const e=JSON.parse(localStorage.getItem("organizador.estado.v2"));delete e.pessoal.rotina;
          e.pessoal.compromissos=[{id:"c1",descricao:"Consulta antiga",data:"2026-12-01",tipo:"consulta",concluido:false}];
          localStorage.setItem("organizador.estado.v2",JSON.stringify(e));return e.pessoal}''')
        page.goto(base+'/pessoal.html')
        assert page.evaluate('Store.lista("pessoal.rotina")')==[]
        assert page.evaluate('Store.lista("pessoal.compromissos").map(c=>c.id)')==['c1']

        # Os dois eixos: Mês e Rotina da semana, de segunda a domingo.
        expect(page.locator('[data-secao="calendario"]')).to_have_text('Mês')
        page.locator('[data-secao="rotina"]').click()
        expect(page.locator('#rotina')).to_contain_text('Monte a sua semana')
        assert page.locator('.rotina-dia-nome').all_text_contents()==['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']

        # Nova atividade em dois dias; o tipo segue o nome.
        page.get_by_role('button',name='Adicionar atividade na segunda').click()
        form=page.locator('.modal.formulario')
        form.locator('[name="titulo"]').fill('Anatomia')
        expect(form.locator('[name="categoria"]')).to_have_value('aula')
        form.get_by_role('button',name='quarta').click()
        form.locator('[name="hora"]').fill('07:00');form.locator('[name="horaFim"]').fill('08:40')
        form.locator('[data-acao="confirmar"]').click()
        rot=page.evaluate('Store.lista("pessoal.rotina")')
        assert len(rot)==1 and rot[0]['dias']==[1,3] and rot[0]['hora']=='07:00' and rot[0]['horaFim']=='08:40',rot
        assert page.locator('.rotina-bloco',has_text='Anatomia').count()==2

        # Tirar só a quarta mantém a segunda; desfazer volta.
        page.locator('.rotina-dia',has=page.locator('#rotina-dia-3')).locator('.rotina-bloco').click()
        page.get_by_role('button',name='Tirar da quarta').click()
        assert page.evaluate('Store.lista("pessoal.rotina")[0].dias')==[1]
        page.get_by_role('button',name='Desfazer').last.click()
        assert page.evaluate('Store.lista("pessoal.rotina")[0].dias')==[1,3]

        # Choque de horário é dito em texto, não só em cor.
        page.locator('#btn-atividade').click()
        form=page.locator('.modal.formulario')
        form.locator('[name="titulo"]').fill('Monitoria')
        form.get_by_role('button',name='segunda').click()
        form.locator('[name="hora"]').fill('08:00');form.locator('[name="horaFim"]').fill('09:00')
        form.locator('[data-acao="confirmar"]').click()
        expect(page.locator('.rotina-choque').first).to_contain_text('Mesmo horário que')

        # Foto do horário de aulas (OCR no aparelho) vai para a rotina, com revisão editável.
        escolher(page,page.locator('#btn-importar-rotina'),str(pasta/'horario.png'))
        linhas=page.locator('[data-lista="rotina"] > li')
        assert linhas.count()>=6,linhas.count()
        nomes=page.locator('[data-lista="rotina"] .revisar-titulo').evaluate_all('(xs)=>xs.map(x=>x.value)')
        assert 'Clínica Médica' in nomes and 'Saúde Coletiva' in nomes,nomes
        primeira=page.locator('[data-lista="rotina"] .revisar-titulo').first
        primeira.fill('Clínica Médica I')
        page.locator('[data-acao="ok"]').click()
        rot=page.evaluate('Store.lista("pessoal.rotina")')
        assert any(a['titulo']=='Clínica Médica I' and a['dias']==[1] and a['hora']=='07:00' and a['horaFim']=='08:40' for a in rot),rot
        expect(page.locator('[data-secao="rotina"]')).to_have_attribute('aria-selected','true')

        # Planilha CSV pela faixa do calendário do mês; desfazer remove tudo.
        page.locator('[data-secao="calendario"]').click()
        antes=page.evaluate('Store.lista("pessoal.compromissos").length')
        escolher(page,page.locator('#importar-faixa'),str(pasta/'agenda.csv'))
        expect(page.locator('[data-lista="eventos"] .revisar-titulo').first).to_have_value('Prova de Anatomia')
        page.locator('[data-acao="ok"]').click()
        assert page.evaluate('Store.lista("pessoal.compromissos").length')==antes+2
        page.get_by_role('button',name='Desfazer').last.click()
        assert page.evaluate('Store.lista("pessoal.compromissos").length')==antes

        # Excel: número de série vira data, fração vira hora.
        escolher(page,page.locator('#importar-faixa'),str(pasta/'agenda.xlsx'))
        assert page.locator('[data-lista="eventos"] [data-campo$=":data"]').first.input_value()=='2026-11-05'
        assert page.locator('[data-lista="eventos"] [data-campo$=":hora"]').first.input_value()=='14:00'
        page.locator('[data-acao="ok"]').click()

        # Formato antigo explica o que fazer, sem travar.
        with page.expect_file_chooser() as fc: page.locator('#importar-faixa').click()
        fc.value.set_files(str(pasta/'antigo.xls'))
        expect(page.locator('.toasts')).to_contain_text('salve como .xlsx ou .csv')

        # A rotina sobrevive à recarga e vai no backup.
        n=page.evaluate('Store.lista("pessoal.rotina").length')
        page.reload()
        assert page.evaluate('Store.lista("pessoal.rotina").length')==n
        assert page.evaluate('JSON.parse(localStorage.getItem("organizador.estado.v2")).pessoal.rotina.length')==n

        # Celular: a semana em linha, sem rolagem lateral; a revisão também cabe.
        for largura in [320,390,768,1440]:
            page.set_viewport_size({'width':largura,'height':900})
            # Carga nova a cada largura: só trocar o #endereço mediria a página no meio da troca de layout.
            page.goto(f'{base}/pessoal.html?largura={largura}#rotina');sem_excesso(page)
            page.goto(f'{base}/pessoal.html?largura={largura}#calendario');sem_excesso(page)
        page.set_viewport_size({'width':390,'height':844})
        escolher(page,page.locator('#importar-faixa'),str(pasta/'agenda.csv'))
        assert page.locator('.modal').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
        page.locator('[data-acao="fechar"]').click()

        # Aba própria: começo guiado com as formas de ver, adição rápida e seletor por teclado.
        page.set_viewport_size({'width':1440,'height':1000})
        pid=page.evaluate('''()=>Store.inserir("pilares",{nome:"Plantões",icone:"svg:estetoscopio",cor:"#0d95b5",naAgenda:true,modelo:"personalizado",
          campos:[{id:"situacao",rotulo:"Situação",tipo:"select",opcoes:["a fazer","feito"],naLista:true,obrigatorio:false}],
          checkin:false,rotuloItem:"plantão",agruparPor:"situacao",meta:null,visual:{vista:"lista"},itens:[]}).id''')
        page.goto(f'{base}/pilar.html?id={pid}')
        comeco=page.locator('#lista .comeco-aba')
        expect(comeco.get_by_role('radio',name=re.compile('Colunas por etapa'))).to_contain_text('Bom para acompanhar o andamento')
        comeco.get_by_role('radio',name=re.compile('Colunas por etapa')).click()
        assert page.evaluate('(id)=>Store.achar("pilares",id).visual.vista',pid)=='quadro'
        page.locator('#f-rapido').fill('Plantão UPA');page.keyboard.press('Enter')
        item=page.evaluate('(id)=>Store.achar("pilares",id).itens[0]',pid)
        assert item['descricao']=='Plantão UPA' and item['extras']=={'situacao':'a fazer'},item
        expect(page.locator('#f-rapido')).to_be_focused()
        expect(page.locator('#vista-dica')).to_contain_text('Arraste entre as colunas')
        opcao=page.locator('#f-vista .vista-opcao[aria-checked="true"]')
        opcao.focus();page.keyboard.press('ArrowRight')
        expect(page.locator('#lista')).to_have_attribute('data-vista','tabela')
        expect(page.locator('#f-vista .vista-opcao[data-valor="tabela"]')).to_be_focused()
        # "Layout e exibição" usa o mesmo seletor, com desenho e frase.
        page.locator('[data-secao="ajustes"]').click();page.locator('#btn-layout').click()
        expect(page.locator('.modal [data-seletor-vistas] .vista-opcao')).to_have_count(5)
        page.locator('.modal .vista-opcao[data-valor="cartoes"]').click()
        page.locator('.modal [data-acao="confirmar"]').click()
        assert page.evaluate('(id)=>Store.achar("pilares",id).visual.vista',pid)=='cartoes'

        assert not erros,erros
        browser.close()

if __name__ == '__main__':
    raiz=Path(__file__).resolve().parents[1]
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Silencioso,directory=str(raiz)))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with TemporaryDirectory() as tmp:
            testar(f'http://127.0.0.1:{server.server_port}',Path(tmp))
        print('Rotina, importação de arquivo e foto, revisão, desfazer, celular e formas de ver a aba passaram.')
    finally:
        server.shutdown()
