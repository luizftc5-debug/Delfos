"""Navegação por tarefa e criação de abas: regressões reais no Chromium.

Executar: python dashboard/test/organizacao.browser.py
Usa servidor efêmero, dados fictícios e bloqueia requisições externas.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
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
            # wheel retorna antes de a rolagem terminar. Meça a posição apenas
            # depois de ela se manter estável; a remontagem deve preservá-la exatamente.
            page.locator('.sidebar-scroll').evaluate('''async e => {
              await new Promise(resolve => {
                let anterior=e.scrollTop, estavel=0;
                const medir=()=>{
                  const atual=e.scrollTop;
                  estavel=atual===anterior ? estavel+1 : 0; anterior=atual;
                  if(estavel>=4)resolve();else requestAnimationFrame(medir);
                };
                requestAnimationFrame(medir);
              });
            }''')
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


COMPOSICOES = """() => {
  const visual = {vista:'lista',ordem:'auto',leitura:true,numeros:true,lateral:true,perguntas:true};
  const campo = (id,rotulo,tipo,opcoes=[]) => ({id,rotulo,tipo,opcoes,naLista:true});
  const item = (id,descricao,extras={},data='') => ({id,descricao,extras,data,concluido:false,feitos:[]});
  const habitos = (novo) => ({
    nome:novo?'Minha rotina':'Pequenos passos',modelo:'personalizado',icone:'svg:sol',cor:'#b57d0a',
    rotuloItem:'hábito',checkin:true,naAgenda:false,agruparPor:'momento',visual:{...visual},
    ...(novo?{modeloOrigem:'habitos'}:{}),
    campos:[campo('momento','Momento do dia','select',novo?['Manhã','Tarde','Noite','Qualquer horário']:['manhã','tarde','noite','qualquer hora']),
      campo(novo?'duracaoMin':'duracao','Duração (min)','number'),
      campo(novo?'motivacao':'porque','Por que importa','textarea'),
      ...(novo?[campo('frequencia','Frequência','text')]:[])],
    itens:[item('manha','Beber água',{momento:novo?'Manhã':'manhã',[novo?'duracaoMin':'duracao']:5},novo?'':'2025-01-15'),
      item('noite','Alongar',{momento:novo?'Noite':'noite'}),
      item('sem-periodo','Meditar',{momento:'madrugada'})]
  });
  const antigo=Store.inserir('pilares',habitos(false));
  const novo=Store.inserir('pilares',habitos(true));
  const longo=habitos(false);
  longo.nome='Rotina com muitos hábitos';
  longo.itens=Array.from({length:30},(_,i)=>item('habito-'+i,'Hábito de teste '+i,{momento:'manhã'}));
  const extenso=Store.inserir('pilares',longo);
  const customizado=habitos(false);
  customizado.nome='Rotina por contexto';customizado.agruparPor='contexto';
  customizado.campos.push(campo('contexto','Contexto','select',['Casa','Rua']));
  customizado.itens=[item('em-casa','Alongar em casa',{momento:'manhã',contexto:'Casa'}),item('na-rua','Caminhar',{momento:'tarde',contexto:'Rua'})];
  const grupos=Store.inserir('pilares',customizado);
  const livros=Store.inserir('pilares',{
    nome:'Estante pessoal',modelo:'personalizado',icone:'svg:livro',cor:'#508ac5',rotuloItem:'livro',
    checkin:false,naAgenda:false,agruparPor:'situacao',visual:{...visual,vista:'cartoes'},
    campos:[campo('autor','Autor','text'),campo('situacao','Situação','select',['quero ler','lendo','lido','abandonado']),campo('paginas','Páginas','number')],
    itens:[item('quero-ler','Livro para depois',{autor:'Autora A',situacao:'quero ler',paginas:240}),
      item('lendo','Livro atual',{autor:'Autora B',situacao:'lendo',paginas:300}),
      item('lido','Livro terminado',{autor:'Autor C',situacao:'lido',paginas:150})]
  });
  const trabalho=Store.inserir('pilares',{
    nome:'Entregas da equipe',modelo:'personalizado',icone:'svg:maleta',cor:'#5b6b7d',rotuloItem:'tarefa',
    checkin:false,naAgenda:true,agruparPor:'situacao',visual:{...visual},
    campos:[campo('situacao','Situação','select',['a fazer','em andamento','concluído']),
      campo('prioridade','Prioridade','select',['baixa','média','alta']),campo('contexto','Projeto ou equipe','text')],
    itens:[item('baixa','Organizar arquivo',{situacao:'a fazer',prioridade:'baixa',contexto:'Equipe B'},'2099-01-01'),
      item('alta-depois','Preparar entrega',{situacao:'a fazer',prioridade:'alta',contexto:'Equipe A'},'2099-02-01'),
      item('alta-antes','Revisar entrega',{situacao:'em andamento',prioridade:'alta',contexto:'Equipe A'},'2099-01-02'),
      item('sem-prioridade','Conversar com a equipe',{situacao:'a fazer',contexto:'Equipe C'})]
  });
  const geral=Store.inserir('pilares',{
    nome:'Hábitos e rotina',modelo:'personalizado',icone:'svg:livro',cor:'#508ac5',rotuloItem:'registro',
    checkin:false,naAgenda:false,visual:{...visual},campos:[campo('comentario','Comentário','textarea')],
    itens:[item('livre','Meu registro livre',{comentario:'Sem inferir o assunto pelo nome'})]
  });
  const vazio=habitos(false);vazio.nome='Rotina para começar';vazio.itens=[];
  const primeiro=Store.inserir('pilares',vazio);
  const encerrados=Store.inserir('pilares',{
    nome:'Registros encerrados',modelo:'personalizado',icone:'svg:livro',cor:'#508ac5',rotuloItem:'registro',
    checkin:false,naAgenda:false,visual:{...visual},campos:[],
    itens:[{...item('encerrado','Registro já concluído'),concluido:true}]
  });
  return {antigo:antigo.id,novo:novo.id,extenso:extenso.id,grupos:grupos.id,livros:livros.id,trabalho:trabalho.id,
    geral:geral.id,vazio:primeiro.id,encerrados:encerrados.id};
}"""


def testar_composicoes(page,base):
    page.set_viewport_size({'width':1440,'height':900})
    page.goto(f'{base}/index.html')
    ids=page.evaluate(COMPOSICOES)
    # Abrir uma aba reconhece campos/capacidades sem regravar seus dados.
    for chave,composicao in [('antigo','habitos'),('novo','habitos'),('livros','leituras'),('trabalho','trabalho'),('geral','geral')]:
        antes=page.evaluate('(id)=>Store.achar("pilares",id)',ids[chave])
        page.goto(f'{base}/pilar.html?id={ids[chave]}')
        expect(page.locator('#lista')).to_have_attribute('data-composicao',composicao)
        assert page.evaluate('(id)=>Store.achar("pilares",id)',ids[chave])==antes,chave
        sem_excesso_horizontal(page)
    for chave in ['antigo','novo']:
        page.goto(f'{base}/pilar.html?id={ids[chave]}')
        # Período desconhecido não pode esconder o registro nem reescrever seu valor.
        assert page.locator('#lista [data-item-id]').count()==3
        expect(page.locator('#lista [data-item-id="sem-periodo"]')).to_contain_text('Meditar')
        assert page.locator('#f-vista .vista-opcao[data-valor="lista"]').inner_text().strip()=='Compacta'
        assert page.locator('#f-vista .vista-opcao[data-valor="cartoes"]').inner_text().strip()=='Detalhada'
        antes=page.evaluate('(id)=>Store.achar("pilares",id)',ids[chave])
        botao=page.locator('#lista [data-item-id="manha"] [data-hoje]')
        botao.focus();page.keyboard.press('Enter')
        expect(botao).to_have_attribute('aria-pressed','true')
        expect(botao).to_be_focused()
        depois=page.evaluate('(id)=>Store.achar("pilares",id)',ids[chave])
        hoje=page.evaluate('UI.hojeISO()')
        assert next(i for i in depois['itens'] if i['id']=='manha')['feitos']==[hoje]
        next(i for i in depois['itens'] if i['id']=='manha')['feitos']=[]
        assert depois==antes,'A marcação deve alterar somente os dias do hábito acionado'
        page.keyboard.press('Enter')
        expect(botao).to_have_attribute('aria-pressed','false')
        expect(botao).to_be_focused()
        assert page.evaluate('(id)=>Store.achar("pilares",id)',ids[chave])==antes
        if chave=='antigo':
            # Um hábito convertido pode guardar data, sem disputar a coluna da ação diária.
            linha=page.locator('#lista [data-item-id="manha"]')
            assert linha.locator('.registro-prazo').count()==0
            linha.locator('[data-detalhes]').click()
            expect(linha.locator('.registro-detalhes-corpo')).to_contain_text('Data do registro')
            assert page.evaluate('(id)=>Store.achar("pilares",id)',ids[chave])==antes
            linha.locator('[data-detalhes]').click()
        # Busca e filtros sobrevivem à troca de seções, sem resultados fictícios.
        page.locator('#f-busca').fill('não existe nesta rotina')
        expect(page.locator('#lista')).to_contain_text('Nenhum resultado')
        page.locator('[data-secao="visao-geral"]').click()
        page.locator('[data-secao="registros"]').click()
        expect(page.locator('#f-busca')).to_have_value('não existe nesta rotina')
        page.get_by_role('button',name='Limpar filtros',exact=True).click()
        expect(page.locator('#f-busca')).to_have_value('')
        assert page.locator('#lista [data-item-id]').count()==3
        page.locator('#f-vista .vista-opcao[data-valor="cartoes"]').click()
        expect(page.locator('#lista')).to_have_attribute('data-vista','cartoes')
        assert page.locator('#lista [data-item-id]').count()==3
    # Um agrupamento escolhido pela pessoa tem prioridade sobre o período do dia.
    page.goto(f'{base}/pilar.html?id={ids["grupos"]}')
    grupos=page.locator('#lista h3').all_text_contents()
    assert any('Casa' in grupo for grupo in grupos),grupos
    assert any('Rua' in grupo for grupo in grupos),grupos
    # Um livro de 300 páginas não tem porcentagem de leitura inventada.
    page.goto(f'{base}/pilar.html?id={ids["livros"]}')
    assert page.locator('#lista [data-item-id]').first.get_attribute('data-item-id')=='lendo'
    expect(page.locator('#lista [data-item-id="lendo"]')).to_contain_text('Autora B')
    assert not page.locator('#lista [role="progressbar"], #lista progress').count()
    assert '%' not in page.locator('#lista').inner_text()
    # Detalhes são somente apresentação; seu conteúdo ocupa a linha disponível,
    # inclusive no celular, e o editor devolve o foco à ação que o abriu.
    antes=page.evaluate('(id)=>Store.achar("pilares",id)',ids['livros'])
    linha=page.locator('#lista [data-item-id="lendo"]')
    detalhes=linha.locator('.registro-detalhes-corpo')
    alternar=linha.locator('[data-detalhes]')
    for largura in [1440,320]:
        page.set_viewport_size({'width':largura,'height':900})
        alternar.focus();page.keyboard.press('Enter')
        expect(alternar).to_have_attribute('aria-expanded','true')
        expect(detalhes).to_be_visible()
        assert alternar.get_attribute('aria-controls')==detalhes.get_attribute('id')
        expect(detalhes.locator('dd')).to_contain_text(['Autora B','Lendo','300'])
        expect(linha.locator('[data-editar]')).to_be_visible()
        if largura==320:
            medidas=linha.evaluate('''e=>{
              const linha=e.getBoundingClientRect(),corpo=e.querySelector('.registro-detalhes-corpo').getBoundingClientRect();
              return {linha:linha.width,corpo:corpo.width,left:corpo.left,right:corpo.right,tela:innerWidth};
            }''')
            assert medidas['corpo']>=medidas['linha']*.8,medidas
            assert 0<=medidas['left']<medidas['right']<=medidas['tela'],medidas
            sem_excesso_horizontal(page)
        assert page.evaluate('(id)=>Store.achar("pilares",id)',ids['livros'])==antes
        page.keyboard.press('Enter')
        expect(alternar).to_have_attribute('aria-expanded','false')
        expect(detalhes).to_be_hidden()
        assert page.evaluate('(id)=>Store.achar("pilares",id)',ids['livros'])==antes
    alternar.click()
    linha.locator('[data-editar]').click()
    page.locator('.modal.formulario [name="descricao"]').fill('Livro atual revisado')
    page.locator('.modal.formulario [data-acao="confirmar"]').click()
    expect(page.locator('.modal.formulario')).to_have_count(0)
    expect(alternar).to_have_attribute('aria-expanded','true')
    expect(detalhes).to_be_visible()
    expect(linha.locator('[data-editar]')).to_be_focused()
    expect(linha.locator('h4')).to_have_text('Livro atual revisado')
    next(i for i in antes['itens'] if i['id']=='lendo')['descricao']='Livro atual revisado'
    assert page.evaluate('(id)=>Store.achar("pilares",id)',ids['livros'])==antes
    sem_excesso_horizontal(page)
    page.set_viewport_size({'width':1440,'height':900})
    # Prioridade vem antes da data; dentro da prioridade a data permanece útil.
    page.goto(f'{base}/pilar.html?id={ids["trabalho"]}')
    assert page.locator('#lista [data-item-id]').evaluate_all('(itens)=>itens.map(i=>i.dataset.itemId)')==[
        'alta-antes','alta-depois','baixa','sem-prioridade']
    expect(page.locator('#lista [data-item-id="alta-antes"]')).to_contain_text('Equipe A')
    page.locator('#f-vista .vista-opcao[data-valor="quadro"]').click()
    expect(page.locator('#lista')).to_have_attribute('data-vista','quadro')
    assert page.evaluate('(id)=>Store.achar("pilares",id).agruparPor',ids['trabalho'])=='situacao'
    # Primeira criação não exibe ferramentas sem utilidade; filtros vazios são outro estado.
    page.goto(f'{base}/pilar.html?id={ids["vazio"]}')
    expect(page.locator('#f-busca')).to_be_hidden()
    assert page.locator('#lista [data-item-id]').count()==0
    assert page.locator('#secao-itens button:visible').filter(has_text=re.compile(r'adicionar|comece',re.I)).count()==1
    page.goto(f'{base}/pilar.html?id={ids["encerrados"]}')
    page.get_by_role('button',name=re.compile(r'ver concluídos',re.I)).click()
    expect(page.locator('#lista')).to_contain_text('Registro já concluído')
    # Uma marcação no fim da página mantém a ação e a posição após redesenhar.
    page.goto(f'{base}/pilar.html?id={ids["extenso"]}')
    alvo=page.locator('#lista [data-item-id="habito-29"] [data-hoje]')
    alvo.scroll_into_view_if_needed();alvo.focus()
    rolagem=page.evaluate('window.scrollY')
    assert rolagem>0
    page.keyboard.press('Enter')
    expect(alvo).to_be_focused();expect(alvo).to_have_attribute('aria-pressed','true')
    assert abs(page.evaluate('window.scrollY')-rolagem)<=2
    # O mesmo conteúdo se adapta em ambas as aparências, inclusive 320px e fonte maior.
    page.evaluate('Store.definirPreferencias({experiencia:{tamanho:"grande"}})')
    for tema in ['dark','light']:
        page.evaluate('(t)=>UI.tema.definir(t)',tema)
        for largura in [320,768,1440]:
            page.set_viewport_size({'width':largura,'height':900})
            for chave in ['antigo','livros','trabalho','geral','vazio']:
                page.goto(f'{base}/pilar.html?id={ids[chave]}')
                sem_excesso_horizontal(page)
    page.set_viewport_size({'width':1440,'height':1000})
    return ids


def testar_movimento(browser,base,erros):
    context=browser.new_context(viewport={'width':1440,'height':900},locale='pt-BR',reduced_motion='no-preference')
    context.route('https://**/*',lambda r:r.abort())
    page=context.new_page();page.set_default_timeout(7000)
    page.on('pageerror',lambda e:erros.append(f'movimento: {e}'))
    try:
        page.goto(f'{base}/bemvindo.html');page.evaluate(SEMENTE)
        ids=page.evaluate(COMPOSICOES)
        page.evaluate('Store.definirPreferencias({experiencia:{movimento:"completo",desempenho:"completo"}})')
        page.goto(f'{base}/pilar.html?id={ids["novo"]}')
        # Vários destinos no mesmo instante não deixam dois painéis ou animações antigas ativas.
        page.evaluate('''()=>{
          for(let i=0;i<5;i++)for(const secao of ['visao-geral','ajustes','registros'])
            document.querySelector(`[data-secao="${secao}"]`).click();
        }''')
        expect(page.locator('[data-secao="registros"]')).to_have_attribute('aria-selected','true')
        assert page.locator('[data-painel]:visible').count()==1
        botao=page.locator('#lista [data-item-id="manha"] [data-hoje]')
        botao.focus();page.keyboard.press('Enter')
        expect(botao).to_be_focused();expect(botao).to_have_attribute('aria-pressed','true')
        page.wait_for_function('''()=>!document.getAnimations().some(a=>
          a.playState==='running' && a.effect?.target?.closest?.('.pagina-painel,.pagina-secoes'))''')
        page.locator('[data-secao="registros"]').focus();page.keyboard.press('ArrowRight')
        expect(page.locator('[data-secao="visao-geral"]')).to_be_focused()
        page.keyboard.press('End');expect(page.locator('[data-secao="ajustes"]')).to_be_focused()
        page.keyboard.press('Home');expect(page.locator('[data-secao="registros"]')).to_be_focused()
        assert page.locator('[data-painel]:visible').count()==1
    finally:
        context.close()


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
            page.locator(f'#f-vista .vista-opcao[data-valor="{vista}"]').click()
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
        testar_composicoes(page,base)
        testar_movimento(browser,base,erros)
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
