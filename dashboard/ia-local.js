/* Ponte de ciclo de vida para a IA local, sem requisições de inferência. */
const IALocal = (() => {
  let worker;
  let emCurso=false;
  let sequencia=0;
  const falha = (mensagem, detalhe = '') => Object.assign(new Error(mensagem), { mensagemDelfos: true, detalhe });
  function gerar(pedido,{signal,aoProgresso}={}) {
    if (emCurso) return Promise.reject(falha('O Delfos já está preparando sua página. Aguarde o preparo atual.'));
    if (!globalThis.isSecureContext || !navigator.gpu || typeof Worker==='undefined') return Promise.reject(falha('Este navegador não consegue preparar a página com o Delfos. Tente um navegador atualizado com aceleração gráfica ou monte do seu jeito.', 'O preparo neste aparelho precisa de WebGPU, suporte a Worker e uma conexão segura (HTTPS ou localhost).'));
    if (signal?.aborted) return Promise.reject(new DOMException('Cancelado','AbortError'));
    emCurso=true;
    return new Promise((resolve,reject)=>{
      const id=++sequencia;
      let prazo;
      const limpar=()=>{clearTimeout(prazo);emCurso=false;signal?.removeEventListener('abort',cancelar);if(worker){worker.onmessage=null;worker.onerror=null;}};
      const cancelar=()=>{limpar();worker?.terminate();worker=null;reject(new DOMException('Cancelado','AbortError'));};
      const esgotar=()=>{limpar();worker?.terminate();worker=null;reject(falha('O preparo está demorando mais que o esperado. Tente novamente ou monte do seu jeito.'));};
      prazo=setTimeout(esgotar,15*60*1000);
      signal?.addEventListener('abort',cancelar,{once:true});
      try {
        worker ||= new Worker('ia-local.worker.js',{type:'module',name:'delfos-ia-local'});
        worker.onmessage=({data})=>{
          if(data.id!==id)return;
          if(data.tipo==='progresso'){if(data.fase==='gerar'){clearTimeout(prazo);prazo=setTimeout(esgotar,120000);}aoProgresso?.(data);}
          if(data.tipo==='resultado'){limpar();resolve(data.sugestao);}
          if(data.tipo==='erro'){limpar();worker?.terminate();worker=null;reject(falha(data.erro, data.detalhe));}
        };
        worker.onerror=(e)=>{e.preventDefault();limpar();worker?.terminate();worker=null;reject(falha('Não foi possível preparar o Delfos neste aparelho. Confira a conexão e tente novamente, ou monte do seu jeito.'));};
        worker.postMessage({id,pedido});
      } catch {
        limpar();worker?.terminate();worker=null;
        reject(falha('Este navegador não conseguiu iniciar o preparo. Tente novamente ou monte a página do seu jeito.'));
      }
    });
  }
  function liberar() { if (!emCurso) { worker?.terminate(); worker=null; } }
  return {gerar,liberar};
})();
