/* Ponte de ciclo de vida para a IA local, sem requisições de inferência. */
const IALocal = (() => {
  let worker;
  let emCurso=false;
  let sequencia=0;
  function gerar(pedido,{signal,aoProgresso}={}) {
    if (emCurso) return Promise.reject(new Error('A IA já está preparando uma estrutura.'));
    if (!globalThis.isSecureContext || !navigator.gpu || typeof Worker==='undefined') return Promise.reject(new Error('A IA local precisa de um navegador com WebGPU, em HTTPS ou localhost. A criação manual está disponível neste aparelho.'));
    if (signal?.aborted) return Promise.reject(new DOMException('Cancelado','AbortError'));
    emCurso=true;
    return new Promise((resolve,reject)=>{
      const id=++sequencia;
      let prazo;
      const limpar=()=>{clearTimeout(prazo);emCurso=false;signal?.removeEventListener('abort',cancelar);if(worker){worker.onmessage=null;worker.onerror=null;}};
      const cancelar=()=>{limpar();worker?.terminate();worker=null;reject(new DOMException('Cancelado','AbortError'));};
      const esgotar=()=>{limpar();worker?.terminate();worker=null;reject(new Error('A IA local demorou demais. Você pode tentar novamente ou montar a aba manualmente.'));};
      prazo=setTimeout(esgotar,15*60*1000);
      signal?.addEventListener('abort',cancelar,{once:true});
      try {
        worker ||= new Worker('ia-local.worker.js',{type:'module',name:'delfos-ia-local'});
        worker.onmessage=({data})=>{
          if(data.id!==id)return;
          if(data.tipo==='progresso'){if(data.fase==='gerar'){clearTimeout(prazo);prazo=setTimeout(esgotar,120000);}aoProgresso?.(data);}
          if(data.tipo==='resultado'){limpar();resolve(data.sugestao);}
          if(data.tipo==='erro'){limpar();worker?.terminate();worker=null;reject(new Error(data.erro));}
        };
        worker.onerror=(e)=>{e.preventDefault();limpar();worker?.terminate();worker=null;reject(new Error('Não foi possível carregar a IA local. Confira a conexão e tente novamente.'));};
        worker.postMessage({id,pedido});
      } catch {
        limpar();worker?.terminate();worker=null;
        reject(new Error('Este navegador não conseguiu iniciar a IA local. Você pode montar a aba manualmente.'));
      }
    });
  }
  function liberar() { if (!emCurso) { worker?.terminate(); worker=null; } }
  return {gerar,liberar};
})();
