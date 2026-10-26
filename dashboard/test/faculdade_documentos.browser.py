"""Leitura real de PDF/DOCX/PPTX, revisão, agenda, backup e tamanho de fonte."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape
import shutil
from playwright.sync_api import sync_playwright, expect

class Silencioso(SimpleHTTPRequestHandler):
    def log_message(self,*_args): pass

def pdf_texto(linhas):
    comandos='BT /F1 11 Tf 50 780 Td 16 TL '+' '.join(f'({s}) Tj T*' for s in linhas)+' ET'
    objetos=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',f'<< /Length {len(comandos)} >>\nstream\n{comandos}\nendstream'.encode('ascii')]
    saida=b'%PDF-1.4\n';posicoes=[0]
    for i,o in enumerate(objetos,1):
        posicoes.append(len(saida));saida+=f'{i} 0 obj\n'.encode()+o+b'\nendobj\n'
    xref=len(saida)
    saida+=f'xref\n0 {len(objetos)+1}\n0000000000 65535 f \n'.encode()
    saida+=b''.join(f'{p:010} 00000 n \n'.encode() for p in posicoes[1:])
    saida+=f'trailer << /Root 1 0 R /Size {len(objetos)+1} >>\nstartxref\n{xref}\n%%EOF'.encode()
    return saida

def fixtures(pasta):
    plano=pasta/'Plano.docx'
    linhas=['Periodo letivo: 26/10/2026 a 31/10/2026','Aulas: segunda e quarta, das 08h as 10h','Ementa:','Introducao a clinica','Semiologia','Avaliacoes']
    xml='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
    xml+=''.join(f'<w:p><w:r><w:t>{escape(s)}</w:t></w:r></w:p>' for s in linhas)
    # A prova vem em uma tabela do Word: data e nome precisam continuar juntos.
    xml+='<w:tbl><w:tr>'+''.join(f'<w:tc><w:p><w:r><w:t>{s}</w:t></w:r></w:p></w:tc>' for s in ['Prova 1','29/10/2026','08:30'])+'</w:tr></w:tbl></w:body></w:document>'
    with ZipFile(plano,'w',ZIP_DEFLATED) as z:z.writestr('word/document.xml',xml)
    slides=pasta/'Cronograma.pptx'
    with ZipFile(slides,'w',ZIP_DEFLATED) as z:
        for numero,texto in [(10,'Entrega de trabalho: 30/10/2026'),(2,'Prova 1 | 29/10/2026 | 08:30')]:
            z.writestr(f'ppt/slides/slide{numero}.xml',f'<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:p><a:r><a:t>{escape(texto)}</a:t></a:r></a:p></p:sld>')
    edital=pasta/'Edital.pdf';edital.write_bytes(pdf_texto(['Edital de Clinica','Prova 2: 30/10/2026 as 09:30']))
    digitalizado=pasta/'Sem-texto.pdf';digitalizado.write_bytes(pdf_texto([]))
    invalido=pasta/'Invalido.docx';invalido.write_bytes(b'nao e um zip')
    return [str(plano),str(slides),str(edital)],digitalizado,invalido

def testar(base,pasta):
    arquivos,digitalizado,invalido=fixtures(pasta)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
        ctx=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR',reduced_motion='reduce')
        ctx.route('https://**/*',lambda r:r.abort())
        page=ctx.new_page();page.set_default_timeout(9000);erros=[];posts=[]
        page.on('pageerror',lambda e:erros.append(str(e)))
        page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
        page.goto(base+'/bemvindo.html');page.evaluate('Personalizacao.pular()')
        page.goto(base+'/index.html')
        page.evaluate('Store.definirPreferencias({experiencia:{densidade:"compacta",lembretes:{resumoDoDia:false}}})')
        page.locator('#btn-perfil').click();page.locator('[data-aba-perfil="leitura"]').click()
        assert page.locator('[data-pref="densidade"]').count()==0
        def medidas():
            return page.evaluate('''()=>{const el=document.querySelector('.config-intro p'),modal=document.querySelector('.configuracoes'),main=document.querySelector('.main'),ico=document.querySelector('.config-menu .ico');return {fonte:parseFloat(getComputedStyle(el).fontSize),largura:modal.getBoundingClientRect().width,padding:getComputedStyle(main).paddingLeft,icone:ico.getBoundingClientRect().width,zoom:getComputedStyle(modal).zoom}}''')
        page.locator('[data-pref="tamanho"] [data-valor="normal"]').click();normal=medidas()
        page.locator('[data-pref="tamanho"] [data-valor="grande"]').click();grande=medidas()
        page.locator('[data-pref="tamanho"] [data-valor="compacto"]').click();menor=medidas()
        assert menor['fonte']<normal['fonte']<grande['fonte']
        for metrica in ['largura','padding','icone','zoom']:assert menor[metrica]==normal[metrica]==grande[metrica],metrica
        assert page.evaluate('document.documentElement.dataset.densidade') is None
        # Todos os tamanhos mantêm a janela utilizável no celular, nos dois temas.
        for tema in ['light','dark']:
            page.evaluate('(t)=>UI.tema.definir(t)',tema)
            for largura in [320,390,768]:
                page.set_viewport_size({'width':largura,'height':850})
                for valor in ['compacto','normal','grande']:
                    page.locator(f'[data-pref="tamanho"] [data-valor="{valor}"]').click()
                    assert page.locator('.configuracoes').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
                    assert page.locator('[data-config-corpo]').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),(tema,largura,valor)
        page.keyboard.press('Escape');page.reload()
        assert page.evaluate('Store.estado().preferencias.experiencia.tamanho')=='grande'
        page.evaluate('Store.definirPreferencias({experiencia:{tamanho:"normal"}})')
        page.set_viewport_size({'width':1440,'height':1000})
        page.goto(base+'/faculdade.html');page.locator('#btn-disciplina').click()
        page.get_by_label('Nome da disciplina',exact=True).fill('Clinica importada')
        page.get_by_label('Quero anexar o plano de ensino ao criar',exact=True).check()
        page.get_by_role('button',name='Criar e abrir',exact=True).click()
        page.locator('.plano-importador').wait_for()
        assert 'planejar' not in page.url
        disciplina_id=page.evaluate('UI.parametro("id")')
        page.locator('[data-arquivos]').set_input_files(arquivos)
        expect(page.locator('[data-lista-arquivos] li')).to_have_count(3)
        page.locator('[data-avancar]').click();page.locator('[data-revisao]:visible').wait_for()
        assert page.locator('[data-tipo="assuntos"]').count()==2
        assert page.locator('[data-tipo="aulas"]').count()==2
        assert page.locator('[data-tipo="avaliacoes"]').count()==2
        assert page.locator('[data-tipo="prazos"]').count()==1
        assert page.evaluate('Store.achar("faculdade.disciplinas",UI.parametro("id")).avaliacoes.length')==0
        assert page.evaluate('Arquivos.ids()')==[]
        # Cancela na revisão: nada é criado nem anexado.
        page.locator('[data-cancelar]').click()
        assert page.evaluate('Arquivos.ids()')==[]
        page.locator('#btn-plano-convite').click();page.locator('[data-arquivos]').set_input_files(arquivos)
        expect(page.locator('[data-lista-arquivos] li')).to_have_count(3)
        page.locator('[data-avancar]').click();page.locator('[data-revisao]:visible').wait_for()
        page.locator('[data-tipo="avaliacoes"]').first.evaluate('(e)=>e.closest("details").open=true')
        page.locator('[data-tipo="avaliacoes"]').first.locator('[data-nome]').fill('Primeira prova')
        # Falha de armazenamento não vira sucesso; repetir não duplica itens.
        page.evaluate('''()=>{window.salvarOriginal=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='organizador.estado.v2')throw new Error('QuotaExceededError');return salvarOriginal.call(this,k,v)}}''')
        page.locator('[data-avancar]').click();expect(page.locator('[data-erro]')).to_contain_text('não foi salva')
        page.evaluate('()=>{Storage.prototype.setItem=window.salvarOriginal;}')
        page.locator('[data-avancar]').click();page.locator('.plano-importador').wait_for(state='detached')
        dados=page.evaluate('Store.achar("faculdade.disciplinas",UI.parametro("id"))')
        assert len(dados['aulas'])==2 and len(dados['avaliacoes'])==2
        assert len(dados['planoEnsino']['anexos'])==3
        assert len(page.evaluate('Arquivos.ids()'))==3
        assert dados['aulas'][0]['hora']=='08:00'
        assert len(page.evaluate('UI.compromissos({incluirConcluidos:true}).filter(x=>x.disciplinaId===UI.parametro("id"))'))==5
        aula_passada=page.evaluate('Store.subInserir("faculdade.disciplinas",UI.parametro("id"),"aulas",{nome:"Aula passada",data:"2000-01-01",hora:"08:00"}).id')
        assert not page.evaluate('(id)=>UI.compromissos().some(x=>x.id===id)',aula_passada)
        assert page.evaluate('(id)=>UI.compromissos({incluirConcluidos:true}).some(x=>x.id===id)',aula_passada)
        page.evaluate('(id)=>Store.subRemover("faculdade.disciplinas",UI.parametro("id"),"aulas",id)',aula_passada)
        page.reload();expect(page.locator('#aulas-resumo')).to_contain_text('2 aulas')
        # Backup mantém os arquivos originais junto da estrutura importada.
        backup=page.evaluate('Store.exportar()')
        assert 'Plano.docx' in str(backup)
        # Os horários também precisam aparecer no calendário compartilhado.
        page.goto(base+'/pessoal.html')
        agenda=page.evaluate('Calendario.itensEntre("2026-10-26","2026-10-31")')
        assert any(x['hora']=='08:00' and x['tipo']=='aula' for lista in agenda.values() for x in lista)
        page.goto(base+f'/disciplina.html?id={disciplina_id}#plano')
        for arquivo,mensagem in [(digitalizado,'texto selecionável'),(invalido,'Office')]:
            page.locator('#btn-plano').click();page.locator('[data-arquivos]').set_input_files(str(arquivo))
            expect(page.locator('[data-lista-arquivos] li')).to_have_count(1)
            page.locator('[data-avancar]').click();expect(page.locator('[data-erro]')).to_contain_text(mensagem)
            page.locator('[data-cancelar]').click()
        # O mesmo arquivo e os mesmos eventos não voltam a ser anexados.
        page.locator('#btn-plano').click();page.locator('[data-arquivos]').set_input_files(arquivos)
        expect(page.locator('[data-lista-arquivos] li')).to_have_count(3)
        page.locator('[data-avancar]').click();page.locator('[data-revisao]:visible').wait_for()
        page.locator('[data-tipo="avaliacoes"]').first.evaluate('(e)=>e.closest("details").open=true')
        for tema in ['light','dark']:
            page.evaluate('(t)=>UI.tema.definir(t)',tema)
            for largura in [320,390,768,1440]:
                page.set_viewport_size({'width':largura,'height':850})
                assert page.locator('.plano-importador').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
                assert page.locator('.plano-modal-corpo').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),(tema,largura)
        page.locator('[data-avancar]').click();page.locator('.plano-importador').wait_for(state='detached')
        assert len(page.evaluate('Store.achar("faculdade.disciplinas",UI.parametro("id")).avaliacoes'))==2
        assert len(page.evaluate('Arquivos.ids()'))==3
        page.set_viewport_size({'width':320,'height':850})
        page.locator('#secao-estudar').click();page.evaluate('Organizacao.selecionar("plano")')
        assert page.locator('#secao-plano').evaluate('(e)=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.left>=b.left-1 && a.right<=b.right+1}')
        assert not posts,posts
        assert not erros,erros
        browser.close()
        print('OK: fontes sem zoom, documentos reais, revisão, agenda, backup, recuperação e celular.')

if __name__=='__main__':
    root=Path(__file__).resolve().parents[1]
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Silencioso,directory=str(root)))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with TemporaryDirectory() as pasta:testar(f'http://127.0.0.1:{server.server_port}',Path(pasta))
    finally:server.shutdown()
