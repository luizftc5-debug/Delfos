"""Navegação por tarefa e criação de abas: regressões reais no Chromium.

Executar: python dashboard/test/organizacao.browser.py
Usa servidor efêmero, dados fictícios e bloqueia requisições externas.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
from threading import Thread
from playwright.sync_api import sync_playwright, expect


class Silencioso(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


SEMENTE = """() => {
  Personalizacao.pular();
  Store.definirPerfil({nome:'Pessoa de teste'});
  Store.definirPreferencias({experiencia:{lembretes:{resumoDoDia:false}}});
  const d = Store.inserir('faculdade.disciplinas', {
    nome:'Clínica médica',status:'ativa',avaliacoes:[],materiais:[],resumos:[]
  });
  const pro = Store.inserir('projetos', {
    nome:'Consultório',status:'em andamento',passos:[],recebimentos:[],custos:[],anexos:[]
  });
  const conta = Store.inserir('financeiro.contas',{nome:'Conta principal',saldoInicial:2500});
  const cartao = Store.inserir('financeiro.cartoes',{nome:'Cartão principal',limite:2000,fechamento:20,vencimento:27});
  const p = Store.inserir('pilares', {
    nome:'Leituras',modelo:'personalizado',icone:'svg:livro',cor:'#508ac5',
    rotuloItem:'livro',naAgenda:true,campos:[
      {id:'situacao',rotulo:'Situação',tipo:'select',opcoes:['Quero ler','Lendo','Lido'],naLista:true},
      {id:'autor',rotulo:'Autor',tipo:'text',naLista:true}
    ],itens:[
      {id:'livro1',descricao:'O homem em busca de sentido',concluido:false,extras:{situacao:'Lendo',autor:'Viktor Frankl'}},
      {id:'livro2',descricao:'A vida intelectual',concluido:false,extras:{situacao:'Quero ler',autor:'A. D. Sertillanges'}}
    ]
  });
  const g = Store.inserir('pilares', {
    nome:'Academia',modelo:'academia',icone:'svg:haltere',cor:'#508ac5',campos:[],itens:[],
    dias:[{id:'dia-a',nome:'Treino A',exercicios:[]}],academia:{configuradoEm:new Date().toISOString()}
  });
  Store.inserir('pessoal.compromissos',{descricao:'Consulta de rotina',data:UI.hojeISO(),tipo:'consulta',concluido:false});
  return {disciplina:d.id,projeto:pro.id,conta:conta.id,cartao:cartao.id,pilar:p.id,academia:g.id};
}"""


def sem_excesso_horizontal(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), page.url


def abrir_criador(page):
    # No celular, o mesmo fluxo abre pela folha "Mais".
    if page.locator('#btn-nova-aba').is_visible():
        page.locator('#btn-nova-aba').click()
    else:
        page.locator('#btn-mais-abas').click()
        page.locator('[data-acao="nova"]').click()
    page.locator('.modal.criacao').wait_for()


def avancar(page):
    page.locator('[data-acao="avancar"]').click()


def revisar(page, nome='Minha aba de teste'):
    avancar(page)
    page.locator('#cr-nome').fill(nome)
    avancar(page)
    expect(page.locator('[data-etapa="3"]')).to_be_visible()


def rodape_visivel(page):
    assert page.locator('.criacao-rodape').evaluate('(e) => e.getBoundingClientRect().bottom <= innerHeight')
    medidas = page.locator('.modal.criacao').evaluate(
        '(e) => ({tela:innerWidth,conteudo:e.clientWidth,largura:e.scrollWidth})')
    assert medidas['largura'] <= medidas['conteudo'] + 1, medidas


def testar_perfil_fixo(page,base):
    page.set_viewport_size({'width':1440,'height':900})
    page.goto(f'{base}/index.html')
    page.evaluate('''()=>{
      Store.definirPerfil({nome:'Pessoa de teste com nome longo',curso:'Medicina'});
      Store.definirPreferencias({experiencia:{tamanho:'grande'}});
      for(let i=0;i<30;i++)Store.inserir('pilares',{nome:'Área pessoal '+i,icone:'svg:livro',cor:'#508ac5',modelo:'personalizado',campos:[],itens:[]});
    }''')
    def posicao():
        return page.locator('#btn-perfil').evaluate('(e)=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}}')
    for tema in ['light','dark']:
        page.evaluate('(t)=>UI.tema.definir(t)',tema)
        for largura,altura in [(1440,900),(1280,600),(1024,500),(901,360)]:
            page.set_viewport_size({'width':largura,'height':altura})
            page.goto(f'{base}/index.html#minhas-abas')
            page.wait_for_function('document.querySelector(".sidebar").getBoundingClientRect().height===innerHeight')
            inicial=posicao()
            assert inicial['top']>=0 and altura-36<=inicial['bottom']<=altura,(tema,largura,altura,inicial)
            assert 0<=inicial['left']<inicial['right']<=page.locator('#sidebar').bounding_box()['width']
            assert page.locator('.sidebar-scroll').evaluate('(e)=>e.scrollHeight>e.clientHeight')
            page.locator('.sidebar-scroll').hover();page.mouse.wheel(0,1800)
            page.wait_for_function('document.querySelector(".sidebar-scroll").scrollTop>0')
            assert posicao()==inicial
            rolagem=page.locator('.sidebar-scroll').evaluate('(e)=>e.scrollTop')
            page.evaluate('UI.montarLayout("home")')
            assert page.locator('.sidebar-scroll').evaluate('(e)=>e.scrollTop')==rolagem
            page.evaluate('window.scrollTo(0,600)')
            page.wait_for_function('window.scrollY>0')
            assert posicao()==inicial
            page.locator('#btn-perfil').click();expect(page.locator('.configuracoes')).to_be_visible()
            page.keyboard.press('Escape');expect(page.locator('#btn-perfil')).to_be_focused()
            page.locator('.sidebar-scroll .nav-item').last.focus()
            page.keyboard.press('Tab');expect(page.locator('#btn-nova-aba')).to_be_focused()
            page.keyboard.press('Tab');expect(page.locator('#btn-organizar')).to_be_focused()
            page.keyboard.press('Tab');expect(page.locator('#btn-perfil')).to_be_focused()
            assert posicao()==inicial
    # No celular, o perfil continua acessível pelo Mais da barra fixa.
    page.set_viewport_size({'width':390,'height':740})
    page.goto(f'{base}/index.html#minhas-abas')
    expect(page.locator('.sidebar-scroll')).to_be_hidden()
    page.evaluate('window.scrollTo(0,document.documentElement.scrollHeight)')
    page.locator('#btn-mais-abas').click();page.locator('[data-acao="perfil"]').click()
    expect(page.locator('.configuracoes')).to_be_visible();page.keyboard.press('Escape')
    sem_excesso_horizontal(page)


def testar(base):
    with sync_playwright() as p:
        caminho = shutil.which('chromium') or shutil.which('google-chrome')
        browser = p.chromium.launch(**({'executable_path': caminho} if caminho else {}), args=['--no-sandbox'])
        context = browser.new_context(viewport={'width':1440,'height':1000}, locale='pt-BR',reduced_motion='reduce')
        context.route('https://**/*', lambda r: r.abort())
        page = context.new_page()
        page.set_default_timeout(7000)
        erros = []
        page.on('pageerror', lambda e: erros.append(f'{page.url}: {e}'))
        page.goto(f'{base}/bemvindo.html')
        ids = page.evaluate(SEMENTE)
        rotas = ['index.html','pessoal.html','faculdade.html','financeiro.html','projetos.html',
                 'contas.html','investimentos.html',f'disciplina.html?id={ids["disciplina"]}',
                 f'projeto.html?id={ids["projeto"]}',f'conta.html?id={ids["conta"]}',
                 f'conta.html?tipo=cartao&id={ids["cartao"]}',f'pilar.html?id={ids["pilar"]}',
                 f'pilar.html?id={ids["academia"]}']
        # Cada seção funciona nos dois temas e nas três larguras. As seções
        # ocultas não expõem controles ao teclado nem geram IDs duplicados.
        for tema in ['dark','light']:
            page.evaluate('(t) => UI.tema.definir(t)', tema)
            for largura in [1440,768,390]:
                page.set_viewport_size({'width':largura,'height':900})
                for rota in rotas:
                    page.goto(f'{base}/{rota}')
                    assert page.locator('[data-painel]:visible').count() == 1, rota
                    assert page.evaluate("""() => {
                      const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
                      return ids.length === new Set(ids).size;
                    }"""), f'IDs duplicados em {rota}'
                    for tab in page.locator('[data-secao]').all():
                        tab.click()
                        expect(tab).to_have_attribute('aria-selected','true')
                        assert page.locator('[data-painel]:visible').count() == 1
                        sem_excesso_horizontal(page)
                        # O contexto do cartão fica abaixo do nome e do valor,
                        # sem comprimi-los numa única linha ilegível.
                        for cartao in page.locator('.list.cartoes > li:visible').all():
                            assert cartao.evaluate('''e => {
                              const nome = e.querySelector('.cartao-nome')?.getBoundingClientRect();
                              const valor = e.querySelector('.item-valor')?.getBoundingClientRect();
                              const info = e.querySelector('.item-info')?.getBoundingClientRect();
                              return !nome || !info || info.top >= Math.max(nome.bottom, valor?.bottom || 0);
                            }'''), rota
        page.set_viewport_size({'width':1440,'height':1000})
        page.goto(f'{base}/faculdade.html')
        cartao = page.locator('#disciplinas .list.cartoes > li').first
        altura = cartao.bounding_box()['height']
        cartao.click(position={'x':20,'y':altura-10})
        page.wait_for_url(f'**/disciplina.html?id={ids["disciplina"]}')
        page.goto(f'{base}/financeiro.html#metas')
        expect(page.locator('[data-secao="planejamento"]')).to_have_attribute('aria-selected','true')
        page.locator('[data-secao="analises"]').click()
        page.go_back()
        expect(page.locator('#metas')).to_be_visible()
        page.locator('[data-secao="planejamento"]').focus()
        page.keyboard.press('Home')
        expect(page.locator('[data-secao="movimentacoes"]')).to_be_focused()
        page.keyboard.press('ArrowRight')
        expect(page.locator('[data-secao="a-pagar"]')).to_be_focused()
        # Todas as visualizações dos registros continuam disponíveis.
        page.goto(f'{base}/pilar.html?id={ids["pilar"]}')
        for vista in ['cartoes','quadro','tabela','calendario','lista']:
            page.locator('#f-vista').select_option(vista)
            expect(page.locator('#lista')).to_have_attribute('data-vista',vista)
        page.locator('#f-busca').fill('Viktor')
        assert page.locator('#lista li').count() == 1
        page.locator('[data-secao="visao-geral"]').click()
        expect(page.locator('#bloco-stats')).to_be_visible()
        page.goto(f'{base}/pilar.html?id={ids["academia"]}#visao-geral')
        expect(page.locator('#bloco-stats')).to_be_visible()
        expect(page.locator('#resumos-campos')).to_be_visible()
        # As sete escolhas chegam à revisão sem criar dados ao cancelar.
        page.goto(f'{base}/index.html')
        antes = page.evaluate('Store.lista("pilares").length')
        for modelo in ['Trabalho','Saúde','Academia','Esporte','Religião','Leituras','Aba livre']:
            abrir_criador(page)
            assert not page.locator('#cr-nome').is_visible()
            assert not page.locator('[data-campos]').is_visible()
            if modelo!='Aba livre':page.locator('[data-grupo-modelos="essenciais"] > summary').click()
            page.get_by_role('radio',name=modelo,exact=True).click()
            revisar(page, f'Teste de {modelo}')
            rodape_visivel(page)
            page.locator('[data-acao="cancelar"]').click()
            assert page.evaluate('Store.lista("pilares").length') == antes
        # Nome obrigatório e passos acessíveis pelo teclado.
        abrir_criador(page)
        avancar(page)
        avancar(page)
        expect(page.locator('#cr-nome')).to_have_attribute('aria-invalid','true')
        expect(page.locator('#cr-nome')).to_be_focused()
        page.locator('#cr-nome').fill('Minhas viagens')
        page.keyboard.press('Enter')
        expect(page.locator('[data-etapa="3"]')).to_be_visible()
        page.locator('[data-estrutura]').evaluate('(e)=>e.open=true')
        page.locator('[data-adicionar-campo]').click()
        page.get_by_label('Nome do campo',exact=True).fill('Destino')
        page.get_by_role('button',name='Salvar campo',exact=True).click()
        assert page.evaluate('document.body.style.overflow') == 'hidden'
        expect(page.locator('[data-campos]')).to_contain_text('Destino')
        page.locator('[data-acao="voltar"]').click()
        page.locator('#cr-nome').fill('Viagens e descobertas')
        avancar(page)
        # Um propósito novo não pode apagar campos ajustados manualmente.
        expect(page.locator('[data-campos]')).to_contain_text('Destino')
        page.locator('[data-acao="criar"]').click()
        page.wait_for_url('**/pilar.html?id=*')
        nova_id = page.evaluate('UI.parametro("id")')
        salvo = page.evaluate('(id) => Store.achar("pilares",id)',nova_id)
        assert salvo['nome'] == 'Viagens e descobertas'
        assert any(c['rotulo'] == 'Destino' for c in salvo['campos'])
        assert salvo['itens'] == []
        # Personalizar mantém campos existentes e conteúdo dos registros.
        page.goto(f'{base}/pilar.html?id={ids["pilar"]}')
        original = page.evaluate('(id) => Store.achar("pilares",id).itens',ids['pilar'])
        page.locator('#btn-editar-aba').click()
        page.locator('#cr-nome').fill('Minha biblioteca')
        avancar(page)
        page.locator('[data-estrutura]').evaluate('(e)=>e.open=true')
        page.locator('[data-adicionar-campo]').click()
        page.get_by_label('Nome do campo',exact=True).fill('Gênero pessoal')
        page.get_by_role('button',name='Salvar campo',exact=True).click()
        page.locator('[data-acao="voltar"]').click()
        avancar(page)
        expect(page.locator('[data-campos]')).to_contain_text('Gênero pessoal')
        page.locator('[data-acao="criar"]').click()
        page.wait_for_function('!document.querySelector(".modal.criacao")')
        assert page.evaluate('(id) => Store.achar("pilares",id).itens',ids['pilar']) == original
        # Falha de armazenamento: repetir a gravação não duplica a aba.
        abrir_criador(page)
        revisar(page,'Recuperação')
        count = page.evaluate('Store.lista("pilares").length')
        page.evaluate("""() => {
          window.salvarOriginal = Storage.prototype.setItem;
          Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); };
        }""")
        for _ in range(2):
            page.locator('[data-acao="criar"]').click()
            expect(page.locator('[data-erro-salvar]')).to_be_visible()
            assert page.evaluate('Store.lista("pilares").length') == count + 1
        page.evaluate('() => { Storage.prototype.setItem = window.salvarOriginal; }')
        page.locator('[data-acao="criar"]').click()
        page.wait_for_url('**/pilar.html?id=*')
        assert page.evaluate('Store.lista("pilares").length') == count + 1
        # Celular: a ação seguinte cabe na tela enquanto só o corpo rola.
        for largura in [390,320]:
            page.set_viewport_size({'width':largura,'height':740})
            page.goto(f'{base}/index.html')
            abrir_criador(page)
            rodape_visivel(page)
            revisar(page,'Aba no celular')
            for seletor in ['[data-estrutura]','.criador-ajustes','[data-rotina]']:
                page.locator(seletor).evaluate('(e)=>e.open=true')
                rodape_visivel(page)
            page.keyboard.press('Escape')
            assert not page.locator('.modal.criacao').count()
        # Sem registros: todas as páginas gerais continuam utilizáveis.
        vazio = browser.new_context(viewport={'width':390,'height':840},locale='pt-BR')
        vazio.route('https://**/*',lambda r:r.abort())
        outra = vazio.new_page()
        outra.on('pageerror',lambda e:erros.append(str(e)))
        outra.goto(f'{base}/bemvindo.html')
        outra.evaluate('Personalizacao.pular();Store.definirPreferencias({experiencia:{lembretes:{resumoDoDia:false}}})')
        for rota in rotas[:7]:
            outra.goto(f'{base}/{rota}')
            for tab in outra.locator('[data-secao]').all():
                tab.click()
                sem_excesso_horizontal(outra)
        # Com poucas abas o perfil também ocupa o rodapé da janela.
        outra.set_viewport_size({'width':1280,'height':800})
        outra.goto(f'{base}/index.html')
        assert outra.locator('#btn-perfil').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.bottom<=innerHeight && r.bottom>=innerHeight-36}')
        assert outra.locator('.sidebar-scroll').evaluate('(e)=>e.scrollHeight<=e.clientHeight+1')
        testar_perfil_fixo(page,base)
        assert not erros, erros
        browser.close()


if __name__ == '__main__':
    raiz = Path(__file__).resolve().parents[1]
    server = ThreadingHTTPServer(('127.0.0.1',0),partial(Silencioso,directory=str(raiz)))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        testar(f'http://127.0.0.1:{server.server_port}')
        print('Organização: páginas, teclado, temas, responsividade, modelos, campos, recuperação e perfil fixo passaram.')
    finally:
        server.shutdown()
        server.server_close()
