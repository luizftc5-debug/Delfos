/* O worker limita tempo/memória da leitura dos pacotes Office. */
import { unzipSync, strFromU8 } from './vendor/fflate/fflate.mjs';
self.onmessage = ({data}) => {
  try {
    let total=0,quantidade=0;
    const arquivos=unzipSync(new Uint8Array(data.dados),{filter(entrada){
      const ler=data.ext==='docx' ? entrada.name==='word/document.xml' : /^ppt\/slides\/slide\d+\.xml$/.test(entrada.name);
      if(!ler)return false;
      total+=entrada.originalSize;quantidade++;
      if(entrada.originalSize>1024*1024 || total>8*1024*1024 || quantidade>150)throw new Error('limite');
      return true;
    }});
    const partes=Object.entries(arquivos).map(([nome,bytes])=>({nome,xml:strFromU8(bytes)}));
    if(!partes.length)throw new Error('formato');
    self.postMessage({partes});
  } catch {
    self.postMessage({erro:'Não foi possível ler este documento Office. Use um DOCX ou PPTX válido, com até 150 páginas ou slides e texto selecionável.'});
  }
};
