"""Configurações e IA local. O fluxo de inferência usa runtime simulado;
nenhum peso de modelo é baixado pela suíte de CI. O worker e o contrato são reais.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil,json
from threading import Thread
from playwright.sync_api import sync_playwright, expect

class Silencioso(SimpleHTTPRequestHandler):
    def log_message(self,*_args): pass

SUGESTAO={
 'icone':'svg:alvo','cor':'#1f7a8c','especial':'','descricao':'Treinos por distância e duração.',
 'rotuloItem':'treino','naAgenda':True,'checkin':False,
 'campos':[{'id':'distanciaKm','rotulo':'Distância (km)','tipo':'number','opcoes':[],'naLista':True,'obrigatorio':False}],
 'agruparPor':'','vista':'calendario','meta':{'tipo':'soma','campoId':'distanciaKm','alvo':20,'periodo':'semana'}
}

def iniciar(page,base):
    page.goto(base+'/bemvindo.html')
    page.evaluate('Personalizacao.pular();Store.definirPreferencias({experiencia:{lembretes:{resumoDoDia:false}}})')
    page.goto(base+'/index.html')

def novo(page):
    page.locator('#btn-nova-aba').click()
    page.locator('.modal.criacao').wait_for()
    page.locator('[data-acao="avancar"]').click()

def campo(page,nome):
    page.locator('[data-adicionar-campo]').click()
    page.get_by_label('Nome do campo',exact=True).fill(nome)
    page.get_by_role('button',name='Salvar campo',exact=True).click()

def cabe(page,sel):
    assert page.locator(sel).evaluate('(e)=> e.scrollWidth<=e.clientWidth+1'),sel
    assert page.locator(sel).evaluate('(e)=>e.getBoundingClientRect().bottom<=innerHeight+1'),sel

def testar(base):
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
        ctx=browser.new_context(viewport={'width':1440,'height':1000},locale='pt-BR',reduced_motion='reduce')
        ctx.route('https://**/*',lambda r:r.abort())
        page=ctx.new_page();page.set_default_timeout(7000);erros=[];posts=[];pesos=[]
        page.on('pageerror',lambda e:erros.append(str(e)))
        page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
        page.on('request',lambda r:pesos.append(r.url) if '/vendor/webllm/' in r.url else None)
        iniciar(page,base)
        for tema in ['dark','light']:
            page.evaluate('(t)=>UI.tema.definir(t)',tema)
            for largura in [1440,768,390,320]:
                page.set_viewport_size({'width':largura,'height':850})
                # Abertura pelo botão real no desktop; no celular usa o mesmo comando do perfil em Mais.
                page.evaluate('UI.abrirPerfil()')
                page.locator('.configuracoes').wait_for()
                for secao in ['sobre','abas','painel','aparencia','leitura','rotina','conta']:
                    if largura>680:page.locator(f'[data-aba-perfil="{secao}"]').click()
                    else:page.locator('[data-config-select]').select_option(secao)
                    assert page.locator('.configuracoes [role=tabpanel]:visible').count()==1
                    cabe(page,'.configuracoes')
                    assert page.locator('[data-config-corpo]').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'), (tema,largura,secao,page.locator('[data-config-corpo]').evaluate('(e)=>({client:e.clientWidth,scroll:e.scrollWidth,fora:[...e.querySelectorAll("*")].filter(x=>x.getClientRects().length && x.getBoundingClientRect().right>e.getBoundingClientRect().right).map(x=>({tag:x.tagName,cl:x.className,text:x.textContent.slice(0,40),w:x.getBoundingClientRect().width}))})'))
                page.locator('[data-acao="fechar"]').click()
        page.set_viewport_size({'width':1440,'height':1000})
        page.locator('#btn-perfil').click();page.locator('.configuracoes').wait_for()
        page.locator('[data-aba-perfil="sobre"]').focus();page.keyboard.press('ArrowDown')
        expect(page.locator('[data-aba-perfil="abas"]')).to_be_focused()
        page.locator('[data-aba-perfil="leitura"]').click()
        page.locator('[data-pref="tamanho"] [data-valor="grande"]').click()
        assert page.evaluate('Store.estado().preferencias.experiencia.tamanho')=='grande'
        expect(page.locator('[data-config-status]')).to_contain_text('salvas')
        page.keyboard.press('Escape');expect(page.locator('#btn-perfil')).to_be_focused()
        page.locator('#btn-perfil').click();page.locator('.configuracoes').wait_for()
        page.locator('[data-aba-perfil="leitura"]').click()
        expect(page.locator('[data-pref="tamanho"] [data-valor="grande"]')).to_have_attribute('aria-pressed','true')
        page.locator('[data-pref="tamanho"] [data-valor="normal"]').click()
        page.keyboard.press('Escape')
        page.goto(base+'/financeiro.html');page.locator('#btn-preferencias').click()
        page.locator('#p-orcamento').fill('1500')
        assert not page.locator('[data-limites]').is_visible()
        page.locator('[data-acao="salvar"]').click()
        assert page.evaluate('Store.estado().preferencias.financeiro.orcamentoMensal')==1500
        page.goto(base+'/index.html');novo(page)
        page.locator('#cr-nome').fill('Plantões')
        page.locator('#cr-prop').fill('Não gerar campos automaticamente no modo manual.')
        page.locator('[data-acao="avancar"]').click()
        assert page.locator('[data-campo]').count()==0
        campo(page,'Local');campo(page,'Turno')
        page.get_by_role('button',name='Editar Local',exact=True).click()
        page.get_by_label('Nome do campo',exact=True).fill('Hospital')
        page.get_by_role('button',name='Salvar campo',exact=True).click()
        page.get_by_role('button',name='Mover Turno para cima',exact=True).click()
        assert page.locator('.campo-nome').first.inner_text()=='Turno'
        page.get_by_role('button',name='Remover Hospital',exact=True).click()
        assert page.locator('[data-campo]').count()==1
        # Validação contextual das opções de um campo.
        page.get_by_role('button',name='Editar Turno',exact=True).click()
        page.locator('[name="tipo"]').select_option('select')
        page.locator('[name="opcoes"]').fill('Só uma opção')
        page.get_by_role('button',name='Salvar campo',exact=True).click()
        expect(page.locator('.err')).to_contain_text('2 a 8')
        page.locator('[name="opcoes"]').fill('Manhã\nNoite')
        page.get_by_role('button',name='Salvar campo',exact=True).click()
        page.locator('[data-acao="criar"]').click();page.wait_for_url('**/pilar.html?id=*')
        registro=page.evaluate('Store.achar("pilares",UI.parametro("id"))')
        assert registro['campos'][0]['rotulo']=='Turno' and registro['campos'][0]['opcoes']==['Manhã','Noite']
        assert not pesos and not posts
        # Sem WebGPU, informa a limitação e oferece continuidade manual.
        page.goto(base+'/index.html');page.evaluate('Object.defineProperty(navigator,"gpu",{value:undefined,configurable:true})')
        novo(page);page.locator('#cr-nome').fill('Corrida');page.locator('[data-modo="ia"]').click()
        page.locator('[data-acao="avancar"]').click()
        expect(page.locator('#cr-prop-erro')).to_be_visible()
        page.locator('#cr-prop').fill('Treinos com distância e duração, calendário e meta semanal de 20 km.')
        page.locator('[data-acao="avancar"]').click()
        expect(page.locator('[data-ia-erro-texto]')).to_contain_text('WebGPU')
        page.locator('[data-seguir-manual]').click()
        expect(page.locator('[data-etapa="3"]')).to_be_visible()
        page.locator('[data-acao="cancelar"]').click()
        assert not pesos and not posts
        # Runtime simulado, worker real: valida a ponte e o contrato sem baixar os pesos.
        page.evaluate('Object.defineProperty(navigator,"gpu",{value:{},configurable:true})')
        worker=(Path(__file__).resolve().parents[1]/'ia-local.worker.js').read_text()
        worker=worker.replace('let engine;', 'Object.defineProperty(navigator,"gpu",{value:{requestAdapter:async()=>({features:new Set()})}});let engine;')
        page.route('**/ia-local.worker.js',lambda r:r.fulfill(status=200,content_type='text/javascript',body=worker))
        runtime='''export const prebuiltAppConfig={model_list:[{model_id:'Qwen2.5-0.5B-Instruct-q4f32_1-MLC'}]};
export async function CreateMLCEngine(modelo,opts){opts.initProgressCallback({progress:0.5});return {chat:{completions:{create:async(p)=>{await new Promise(r=>setTimeout(r,350));const pedido=JSON.parse(p.messages[1].content);if(pedido.proposito.includes('FORCAR_ERRO'))throw Error('simulado');return {choices:[{finish_reason:'stop',message:{content:JSON.stringify(SUG)}}]};}}}};}
'''.replace('SUG',json.dumps(SUGESTAO,ensure_ascii=False))
        page.route('**/vendor/webllm/webllm.js',lambda r:r.fulfill(status=200,content_type='text/javascript',body=runtime))
        novo(page);page.locator('#cr-nome').fill('Corrida');page.locator('[data-modo="ia"]').click()
        page.locator('#cr-prop').fill('Treinos com distância e duração, calendário e meta semanal de 20 km.')
        page.locator('[data-acao="avancar"]').click()
        expect(page.locator('[data-etapa="3"]')).to_be_visible()
        expect(page.locator('[data-previa-topo]')).to_contain_text('Corrida')
        page.locator('[data-estrutura]').evaluate('(e)=>e.open=true')
        expect(page.locator('[data-campos]')).to_contain_text('Distância (km)')
        expect(page.locator('[data-vistas]')).to_have_value('calendario')
        page.locator('[data-acao="criar"]').click();page.wait_for_url('**/pilar.html?id=*')
        r=page.evaluate('Store.achar("pilares",UI.parametro("id"))')
        assert r['meta']['campoId']=='distanciaKm' and r['meta']['alvo']==20 and r['sugeridoPor']=='ia'
        # Falha e cancelamento não criam registros nem aplicam respostas antigas.
        page.goto(base+'/index.html');page.evaluate('Object.defineProperty(navigator,"gpu",{value:{},configurable:true})')
        antes=page.evaluate('Store.lista("pilares").length')
        novo(page);page.locator('#cr-nome').fill('Rotina');page.locator('[data-modo="ia"]').click()
        page.locator('#cr-prop').fill('FORCAR_ERRO: testar falha de inferência no aparelho.')
        page.locator('[data-acao="avancar"]').click()
        expect(page.locator('[data-ia-erro]')).to_be_visible()
        page.locator('#cr-prop').fill('Organizar treinos com distância por dia e meta.')
        page.locator('[data-acao="avancar"]').click()
        page.locator('#cr-prop').fill('Pedido atualizado enquanto a IA estava trabalhando.')
        page.wait_for_timeout(500)
        expect(page.locator('[data-etapa="2"]')).to_be_visible()
        assert page.evaluate('Store.lista("pilares").length')==antes
        page.locator('[data-acao="avancar"]').click()
        expect(page.locator('[data-etapa="3"]')).to_be_visible()
        page.locator('[data-estrutura]').evaluate('(e)=>e.open=true')
        campo(page,'Terreno')
        page.locator('[data-acao="voltar"]').click()
        page.locator('#cr-prop').fill('Nova estrutura apenas para treinos, preservando a revisão para comparar.')
        page.locator('[data-acao="avancar"]').click()
        expect(page.locator('[data-etapa="3"]')).to_be_visible()
        expect(page.locator('[data-aplicar]')).to_be_visible()
        page.locator('[data-estrutura]').evaluate('(e)=>e.open=true')
        expect(page.locator('[data-campos]')).to_contain_text('Terreno')
        page.locator('[data-usar]').click()
        assert 'Terreno' not in page.locator('[data-campos]').inner_text()
        page.locator('[data-acao="cancelar"]').click()
        # Carrega o runtime real no worker, sem GPU nem download dos pesos.
        page.unroute('**/vendor/webllm/webllm.js')
        page.unroute('**/ia-local.worker.js')
        sem_gpu=worker.replace("requestAdapter:async()=>({features:new Set()})", "requestAdapter:async()=>null")
        page.route('**/ia-local.worker.js',lambda r:r.fulfill(status=200,content_type='text/javascript',body=sem_gpu))
        novo(page);page.locator('#cr-nome').fill('Rotina local');page.locator('[data-modo="ia"]').click()
        page.locator('#cr-prop').fill('Organizar treinos e a prática diária em uma agenda.')
        page.locator('[data-acao="avancar"]').click()
        expect(page.locator('[data-ia-erro-texto]')).to_contain_text('WebGPU',timeout=15000)
        page.locator('[data-acao="cancelar"]').click()
        assert not posts
        assert not erros,erros
        browser.close()

if __name__=='__main__':
    root=Path(__file__).resolve().parents[1]
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Silencioso,directory=str(root)))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        testar(f'http://127.0.0.1:{server.server_port}')
        print('Configurações e criação: preferências, teclado, campos manuais, indisponibilidade e integração do worker local passaram (runtime simulado).')
    finally:server.shutdown();server.server_close()
