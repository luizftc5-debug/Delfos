/* Extrai apenas texto. O arquivo não é enviado a serviços de análise. */
const LIMITE=10*1024*1024;
export function validarDocumento(file) {
  if(!/\.(pdf|docx|pptx)$/i.test(file.name))throw new Error('Escolha PDF, Word (.docx) ou PowerPoint (.pptx). Para arquivos .doc, salve uma cópia como DOCX ou PDF.');
  if(!file.size || file.size>LIMITE)throw new Error('Cada documento deve ter até 10 MB e não pode estar vazio.');
}
const cancelado=()=>new DOMException('Cancelado','AbortError');
function textoXML(xml,ext) {
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('O documento contém uma estrutura XML não suportada.');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror'))throw new Error('Não foi possível ler o texto do documento.');
  const nomes=el=>Array.from(el.children).map(n=>n.localName==='t' ? n.textContent : n.localName==='tab' ? ' ' : ['br','cr'].includes(n.localName) ? '\n' : nomes(n)).join('');
  if(ext==='pptx')return Array.from(doc.getElementsByTagNameNS('*','p')).map(nomes).join('\n');
  const corpo=doc.getElementsByTagNameNS('*','body')[0];
  if(!corpo)throw new Error('O arquivo Word não contém texto legível.');
  return Array.from(corpo.children).map(el=>{
    if(el.localName==='tbl')return Array.from(el.getElementsByTagNameNS('*','tr')).map(linha=>Array.from(linha.children).filter(x=>x.localName==='tc').map(c=>Array.from(c.getElementsByTagNameNS('*','p')).map(nomes).join(' ')).join(' | ')).join('\n');
    return nomes(el);
  }).join('\n');
}
async function lerOffice(file,ext,signal) {
  const dados=await file.arrayBuffer();
  if(signal?.aborted)throw cancelado();
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./documentos.worker.js',import.meta.url),{type:'module'});
    const limpar=()=>{clearTimeout(prazo);worker.terminate();signal?.removeEventListener('abort',abortar);};
    const abortar=()=>{limpar();reject(cancelado());};
    const prazo=setTimeout(()=>{limpar();reject(new Error('A leitura demorou demais. Tente um arquivo menor ou exporte para PDF.'));},20000);
    signal?.addEventListener('abort',abortar,{once:true});
    worker.onerror=e=>{e.preventDefault();limpar();reject(new Error('Não foi possível iniciar a leitura do documento. Tente novamente.'));};
    worker.onmessage=({data})=>{
      limpar();
      if(data.erro){reject(new Error(data.erro));return;}
      try {
        const texto=data.partes.sort((a,b)=>a.nome.localeCompare(b.nome,undefined,{numeric:true})).map(p=>textoXML(p.xml,ext)).join('\n');
        resolve(texto);
      } catch(e){reject(e);}
    };
    worker.postMessage({dados,ext},[dados]);
  });
}
async function lerPDF(file,signal) {
  const pdfjs=await import('./vendor/pdfjs/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
  if(signal?.aborted)throw cancelado();
  const tarefa=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,disableFontFace:true,useSystemFonts:false});
  const abortar=()=>{tarefa.destroy();};
  signal?.addEventListener('abort',abortar,{once:true});
  const prazo=setTimeout(abortar,45000);
  try {
    const doc=await tarefa.promise;
    if(doc.numPages>100)throw new Error('Use um PDF com até 100 páginas. Separe o edital ou plano de ensino do restante do material.');
    const linhas=[];let total=0;
    for(let i=1;i<=doc.numPages;i++) {
      if(signal?.aborted)throw cancelado();
      const pagina=await doc.getPage(i);
      const {items}=await pagina.getTextContent();
      // Agrupa pela altura para manter data, horário e assunto da mesma linha.
      const grupos=[];
      for(const it of items.filter(x=>x.str?.trim()).sort((a,b)=>b.transform[5]-a.transform[5] || a.transform[4]-b.transform[4])) {
        const y=it.transform[5],h=Math.abs(it.transform[3]) || 10;
        let grupo=grupos.find(x=>Math.abs(x.y-y)<=Math.max(2,h*.4));
        if(!grupo){grupo={y,itens:[]};grupos.push(grupo);}
        grupo.itens.push(it);
      }
      for(const grupo of grupos) {
        const linha=grupo.itens.sort((a,b)=>a.transform[4]-b.transform[4]).map(x=>x.str).join(' ');
        total+=linha.length;linhas.push(linha);
      }
      if(total>300000)throw new Error('O documento tem texto demais. Envie apenas o edital ou o plano de ensino.');
      pagina.cleanup();
    }
    return linhas.join('\n');
  } catch(e) {
    if(signal?.aborted)throw cancelado();
    if(e.name==='PasswordException')throw new Error('Este PDF tem senha. Anexe uma cópia desbloqueada.');
    if(/^(Use um PDF|O documento)/.test(e.message))throw e;
    throw new Error('Não foi possível ler o PDF. Confira se ele está íntegro e tente novamente.');
  } finally {clearTimeout(prazo);signal?.removeEventListener('abort',abortar);await tarefa.destroy();}
}
export async function lerDocumento(file,{signal}={}) {
  validarDocumento(file);
  const ext=file.name.split('.').pop().toLowerCase();
  const texto=await (ext==='pdf' ? lerPDF(file,signal) : lerOffice(file,ext,signal));
  if(signal?.aborted)throw cancelado();
  if(texto.trim().length<20)throw new Error('Não encontrei texto selecionável neste documento. PDFs digitalizados precisam ser convertidos com OCR antes da leitura.');
  if(texto.length>300000)throw new Error('O documento tem texto demais. Envie apenas o edital ou o plano de ensino.');
  return {nome:file.name,texto};
}
