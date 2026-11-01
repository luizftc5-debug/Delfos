/* Importação opcional. Só a confirmação escreve no Store e guarda anexos. */
const PlanoEnsino = (() => {
  async function abrir({disciplinaId}) {
    await UI.carregarEstilo('plano-ensino.css');
    const modelo=await import('./plano-ensino.modelo.mjs');
    const esc=UI.fmt.escape;
    const disciplina=Store.achar('faculdade.disciplinas',disciplinaId);
    if(!disciplina)return null;
    const controle=new AbortController();
    const guardados=new Map();
    let arquivos=[],sugestao,etapa=1,ocupado=false,fechado=false;
    return new Promise(resolve=>UI.abrirModal(`
      <header class="plano-modal-cab"><div><span class="eyebrow">Delfos · ${esc(disciplina.nome)}</span><h2 class="modal-title">Organizar pelo plano de ensino</h2></div><button class="btn ghost icon" type="button" data-fechar aria-label="Fechar importação">${UI.icone('fechar')}</button></header>
      <div class="plano-modal-corpo">
        <p class="plano-etapa" data-etapa>1 de 2 · Seus documentos</p>
        <section data-upload>
          <h3>Um ponto de partida para o semestre.</h3>
          <p>Anexe o edital, a ementa ou o plano de ensino. O Delfos procura assuntos, dias e horários de aula, avaliações e entregas. Você confere antes de incluir na agenda.</p>
          <label class="plano-arquivo">Escolher documentos<input type="file" data-arquivos multiple accept=".pdf,.docx,.pptx" aria-describedby="plano-formatos"></label>
          <p class="hint" id="plano-formatos">PDF com texto, Word (.docx) ou PowerPoint (.pptx). Até 5 arquivos, 10 MB cada e 25 MB no total. A leitura acontece neste aparelho.</p>
          <ul class="plano-arquivos" data-lista-arquivos></ul>
          <label class="field">Ano das datas sem ano<input class="input" type="number" data-ano min="2000" max="2100" value="${new Date().getFullYear()}"><span class="hint">Usado em datas como 15/09. Datas com ano no documento são preservadas.</span></label>
        </section>
        <section data-revisao hidden><h3>Confira o que entra no seu semestre.</h3><p>Revise os assuntos, datas e horários. Desmarque o que não quiser importar.</p><div data-avisos></div><details class="plano-periodo-ajuste" data-periodo hidden><summary>Período das aulas<span data-resumo-periodo></span></summary><div class="plano-periodo"><label class="field">Início das aulas<input class="input" type="date" data-inicio></label><label class="field">Fim das aulas<input class="input" type="date" data-fim></label></div><p class="hint">Os horários semanais se repetem entre essas datas. Confira feriados e recessos.</p></details><div data-resultados></div></section>
        <p class="plano-progresso" role="status" data-progresso hidden></p>
        <p class="plano-erro" role="alert" data-erro hidden></p>
      </div>
      <footer class="modal-foot"><button class="btn ghost" type="button" data-cancelar>Agora não</button><span class="modal-foot-espaco"></span><button class="btn" type="button" data-voltar hidden>Voltar</button><button class="btn primary" type="button" data-avancar>Ler documentos</button></footer>`,{
      classe:'wide plano-importador',
      aoFechar(resultado) {
        fechado=true;controle.abort();
        // Se a quota falhou, o estado em memória ainda referencia os anexos e
        // oferece recuperação. Só arquivos sem qualquer referência são apagados.
        const referencias=JSON.stringify(Store.estado());
        for(const a of guardados.values())if(!referencias.includes(a.id))Arquivos.remover(a.id);
        resolve(resultado);
      },
      aoMontar(modal,fechar) {
        const $=s=>modal.querySelector(s);
        const erro=msg=>{$('[data-erro]').textContent=msg;$('[data-erro]').hidden=!msg;};
        const travar=v=>{
          ocupado=v;
          modal.querySelectorAll('[data-avancar],[data-voltar],input:not([data-arquivos]),select').forEach(x=>x.disabled=v);
          $('[data-arquivos]').disabled=v;
          $('[data-progresso]').hidden=!v;
        };
        const listar=()=>{
          $('[data-lista-arquivos]').innerHTML=arquivos.map((f,i)=>`<li><span>${esc(f.name)} <small>${Arquivos.tamanhoLegivel(f.size)}</small></span><button type="button" class="btn ghost sm" data-remover="${i}" aria-label="Remover ${esc(f.name)}">Remover</button></li>`).join('');
        };
        $('[data-arquivos]').addEventListener('change',async ev=>{
          try {
            const {validarDocumento}=await import('./documentos.mjs');
            if(fechado)return;
            const novos=Array.from(ev.target.files);
            const juntos=[...arquivos,...novos].filter((f,i,a)=>a.findIndex(x=>x.name===f.name && x.size===f.size && x.lastModified===f.lastModified)===i);
            if(juntos.length>5 || juntos.reduce((n,f)=>n+f.size,0)>25*1024*1024)throw new Error('Selecione até 5 documentos, com até 25 MB no total.');
            juntos.forEach(validarDocumento);arquivos=juntos;listar();erro('');
          } catch(e){erro(e.message);}
          ev.target.value='';
        });
        $('[data-lista-arquivos]').addEventListener('click',e=>{
          if(ocupado)return;
          const b=e.target.closest('[data-remover]');if(b){arquivos.splice(+b.dataset.remover,1);listar();}
        });
        function mostrarEtapa(n) {
          etapa=n;$('[data-upload]').hidden=n!==1;$('[data-revisao]').hidden=n!==2;
          $('[data-etapa]').textContent=n===1 ? '1 de 2 · Seus documentos' : '2 de 2 · Revisar e organizar';
          $('[data-voltar]').hidden=n===1;$('[data-avancar]').textContent=n===1 ? 'Ler documentos' : 'Guardar e organizar';
          $('.plano-modal-corpo').scrollTop=0;
        }
        function desenhar() {
          $('[data-avisos]').innerHTML=sugestao.avisos.map(x=>`<p class="hint">${esc(x)}</p>`).join('')+(sugestao.excecoes.length ? `<p class="hint">Datas sem aula identificadas no documento: ${sugestao.excecoes.map(x=>esc(UI.fmt.dataCurta(x))).join(', ')}. Essas datas não entram nas aulas da agenda.</p>` : '');
          $('[data-periodo]').hidden=!sugestao.aulas.some(x=>x.diaSemana!==null && x.diaSemana!==undefined);
          $('[data-inicio]').value=sugestao.inicio;$('[data-fim]').value=sugestao.fim;
          $('[data-periodo]').open=!sugestao.inicio || !sugestao.fim;atualizarPeriodo();
          const titulos={assuntos:'Assuntos',aulas:'Aulas',avaliacoes:'Avaliações',prazos:'Entregas e trabalhos'};
          $('[data-resultados]').innerHTML=Object.entries(titulos).map(([tipo,titulo])=>{
            const itens=sugestao[tipo];
            return `<details class="plano-grupo" ${itens.length && tipo==='assuntos' ? 'open' : ''}><summary>${titulo}<span>${itens.length}</span></summary>${itens.length ? `<ul>${itens.map((x,i)=>{
              const prefixo=`pl-${tipo}-${i}`;
              const semanal=tipo==='aulas' && x.diaSemana!==null && x.diaSemana!==undefined;
              return `<li data-tipo="${tipo}" data-indice="${i}"><label class="plano-incluir"><input type="checkbox" data-incluir ${tipo==='assuntos' || x.data || semanal ? 'checked' : ''} aria-label="Incluir ${esc(x.texto || x.nome)}"><span>Incluir</span></label><div class="plano-item-corpo"><label class="field">${tipo==='assuntos' ? 'Assunto' : 'Nome'}<input class="input" data-nome maxlength="${tipo==='assuntos' ? 200 : 140}" value="${esc(x.texto || x.nome)}" id="${prefixo}"></label>${tipo==='assuntos' ? '' : `<div class="plano-item-datas">${semanal ? `<label class="field">Dia da semana<select class="input" data-dia>${modelo.DIAS.map((d,n)=>`<option value="${n}" ${x.diaSemana===n ? 'selected' : ''}>${d}</option>`).join('')}</select></label>` : `<label class="field">Data<input class="input" type="date" data-data value="${esc(x.data)}"></label>`}<label class="field">${tipo==='aulas' ? 'Início' : 'Horário (opcional)'}<input class="input" type="time" data-hora value="${esc(x.hora)}"></label>${tipo==='aulas' ? `<label class="field">Fim (opcional)<input class="input" type="time" data-hora-fim value="${esc(x.horaFim)}"></label>` : ''}</div>`}<details class="plano-fonte"><summary>Conferir trecho · ${esc(x.fonte)}</summary><p>${esc(x.trecho)}</p></details></div></li>`;
            }).join('')}</ul>` : '<p class="hint">Nenhum item identificado.</p>'}</details>`;
          }).join('');
        }
        function atualizarPeriodo() {
          const inicio=$('[data-inicio]').value,fim=$('[data-fim]').value;
          $('[data-resumo-periodo]').textContent=inicio && fim ? `${UI.fmt.data(inicio)} a ${UI.fmt.data(fim)}` : 'Complete as datas';
        }
        $('[data-inicio]').addEventListener('input',atualizarPeriodo);
        $('[data-fim]').addEventListener('input',atualizarPeriodo);
        function recolher() {
          const selecao={assuntos:[],aulas:[],avaliacoes:[],prazos:[]};
          for(const linha of modal.querySelectorAll('[data-tipo]')) {
            if(!linha.querySelector('[data-incluir]').checked)continue;
            const tipo=linha.dataset.tipo,original=sugestao[tipo][+linha.dataset.indice];
            const nome=linha.querySelector('[data-nome]').value.trim();
            const falhar=msg=>{linha.closest('.plano-grupo').open=true;linha.querySelector('[data-nome]').focus();throw new Error(msg);};
            if(!nome)falhar('Preencha o nome dos itens selecionados.');
            if(tipo==='assuntos'){selecao.assuntos.push({texto:nome,fonte:original.fonte});continue;}
            const data=linha.querySelector('[data-data]')?.value || '';
            const hora=linha.querySelector('[data-hora]').value;
            const horaFim=linha.querySelector('[data-hora-fim]')?.value || '';
            const dia=linha.querySelector('[data-dia]');
            if(!dia && !modelo.dataValida(data))falhar('Complete a data de cada item selecionado ou desmarque o item.');
            if((hora && !modelo.horaValida(hora)) || (horaFim && (!modelo.horaValida(horaFim) || horaFim<=hora)))falhar('Revise os horários dos itens selecionados.');
            if(tipo==='aulas' && !hora)falhar('Complete o horário de início das aulas ou desmarque o item.');
            const origemPlano=[tipo,original.nome,original.data,original.diaSemana ?? '',original.hora,original.horaFim].join('|');
            selecao[tipo].push({nome,data,hora,horaFim,diaSemana:dia ? +dia.value : null,fonte:original.fonte,origemPlano});
          }
          const inicio=$('[data-inicio]').value,fim=$('[data-fim]').value;
          if(selecao.aulas.some(x=>x.diaSemana!==null) && (!modelo.dataValida(inicio) || !modelo.dataValida(fim) || inicio>fim)) {
            $('[data-periodo]').open=true;$('[data-inicio]').focus();throw new Error('Informe um período válido para as aulas semanais.');
          }
          selecao.aulas=modelo.expandirAulas(selecao.aulas,inicio,fim,sugestao.excecoes).map(a=>({...a,origemPlano:`${a.origemPlano}|${a.data}`}));
          selecao.avaliacoes=selecao.avaliacoes.map(({diaSemana,...x})=>({...x,nota:'',peso:1}));
          selecao.prazos=selecao.prazos.map(({nome,diaSemana,...x})=>({...x,descricao:nome,tipo:'entrega',concluido:false}));
          return {...selecao,inicio,fim};
        }
        async function avancar() {
          if(ocupado)return;
          erro('');
          try {
            if(etapa===1) {
              if(!arquivos.length)throw new Error('Escolha pelo menos um documento para começar.');
              const ano=Number($('[data-ano]').value);
              if(!Number.isInteger(ano) || ano<2000 || ano>2100)throw new Error('Informe um ano entre 2000 e 2100.');
              travar(true);const {lerDocumento}=await import('./documentos.mjs');
              const documentos=[];
              for(const file of arquivos) {
                $('[data-progresso]').textContent=`Lendo ${file.name}…`;
                try{documentos.push(await lerDocumento(file,{signal:controle.signal}));}
                catch(e){if(e.name==='AbortError')throw e;throw new Error(`${file.name}: ${e.message}`);}
              }
              if(fechado)return;
              sugestao=modelo.analisarDocumentos(documentos,{ano});desenhar();mostrarEtapa(2);
            } else {
              const selecao=recolher();
              travar(true);$('[data-progresso]').textContent='Guardando documentos e organizando sua agenda…';
              const anexos=[...(Store.achar('faculdade.disciplinas',disciplinaId)?.planoEnsino?.anexos || [])];
              for(const file of arquivos) {
                if(fechado)return;
                if(guardados.has(file)){anexos.push(guardados.get(file));continue;}
                const bytes=await file.arrayBuffer();
                const hash=crypto.subtle ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('') : '';
                if(fechado)return;
                const existente=hash && anexos.find(x=>x.hash===hash);
                if(existente)continue;
                const anexo={...await Arquivos.salvar(file),hash};guardados.set(file,anexo);anexos.push(anexo);
                if(fechado){await Arquivos.remover(anexo.id);return;}
              }
              if(fechado)return;
              const incluidos=Store.importarPlanoEnsino(disciplinaId,{...selecao,anexos});
              fechar(incluidos);
            }
          } catch(e){if(!fechado && e.name!=='AbortError')erro(e.message || 'Não foi possível organizar o plano. Tente novamente.');}
          finally{if(!fechado)travar(false);}
        }
        $('[data-avancar]').addEventListener('click',avancar);
        $('[data-voltar]').addEventListener('click',()=>{if(!ocupado){mostrarEtapa(1);erro('');}});
        $('[data-fechar]').addEventListener('click',()=>fechar(null));
        $('[data-cancelar]').addEventListener('click',()=>fechar(null));
      }
    }));
  }
  return {abrir};
})();
