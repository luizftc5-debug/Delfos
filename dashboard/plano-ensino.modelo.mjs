/* Leitura de cronogramas em português. Documentos são dados, nunca instruções.
   Datas incompletas e horários ausentes ficam para a revisão do estudante. */
export const DIAS = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const normalizar = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const limpar = s => String(s || '').replace(/\s+/g,' ').trim();
const pad = n => String(n).padStart(2,'0');
export function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const d = new Date(s+'T12:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === s && +s.slice(0,4)>=2000 && +s.slice(0,4)<=2100;
}
export const horaValida = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || '');
const meses = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function datas(texto,ano) {
  const encontrados=[];
  const t=normalizar(texto);
  for (const m of t.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b|\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}|\d{2}))?\b|\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(20\d{2}))?\b/g)) {
    let y,mes,dia;
    if(m[1]) [y,mes,dia]=[+m[1],+m[2],+m[3]];
    else if(m[4]) [y,mes,dia]=[m[6] ? (+m[6]<100 ? 2000+ +m[6] : +m[6]) : ano,+m[5],+m[4]];
    else [y,mes,dia]=[+(m[9] || ano),meses.indexOf(m[8])+1,+m[7]];
    const iso=`${y}-${pad(mes)}-${pad(dia)}`;
    if(dataValida(iso)) encontrados.push({data:iso,indice:m.index,texto:m[0],anoExplicito:!!(m[1]||m[6]||m[9])});
  }
  return encontrados;
}
function horas(texto) {
  // Um rótulo como "Prova 1: 15/04" não é o horário 01:15.
  const t=normalizar(texto).replace(/\b20\d{2}-\d{2}-\d{2}\b/g,' ').replace(/\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b/g,' ');
  const achadas=[];
  for(const m of t.matchAll(/\b([01]?\d|2[0-3])\s*(?::\s*([0-5]\d)|h\s*([0-5]\d)?)(?!\d)/g)) {
    achadas.push(`${pad(m[1])}:${pad(m[2] || m[3] || 0)}`);
  }
  // "das 8 às 10" também é um intervalo de horário.
  if(!achadas.length) {
    const m=t.match(/\bdas?\s+(\d{1,2})\s+(?:as?|ate)\s+(\d{1,2})\b/);
    if(m && +m[1]<24 && +m[2]<24) achadas.push(`${pad(m[1])}:00`,`${pad(m[2])}:00`);
  }
  return {hora:achadas[0] || '',horaFim:achadas[1] || ''};
}
function diasDaSemana(texto) {
  const dias=[];
  const t=normalizar(texto).replace(/([2-6])ª/g,'$1a');
  const nomes=[/\bdomingos?\b/,/\b(?:segundas?(?:-feiras?)?|seg|2[ªa])\b/,/\b(?:tercas?(?:-feiras?)?|ter|3[ªa])\b/,/\b(?:quartas?(?:-feiras?)?|qua|4[ªa])\b/,/\b(?:quintas?(?:-feiras?)?|qui|5[ªa])\b/,/\b(?:sextas?(?:-feiras?)?|sex|6[ªa])\b/,/\bsabados?\b/];
  nomes.forEach((re,i)=>{if(re.test(t))dias.push(i);});
  // Dias em sequência: "segunda a sexta", sem expandir "segunda e sexta".
  if(dias.length===2 && /(?:segunda|terca|quarta|quinta|sexta)\s*(?:-feira)?\s+(?:a|ate)\s+/.test(t)) {
    const [a,b]=dias; for(let i=a+1;i<b;i++)dias.push(i);
  }
  return dias.sort((a,b)=>a-b);
}
const chave = x => normalizar(x);
function unicos(lista,identidade) {
  const vistos=new Set();
  return lista.filter(x=>{const k=identidade(x);if(vistos.has(k))return false;vistos.add(k);return true;});
}
export function analisarDocumentos(documentos,{ano=new Date().getFullYear()}={}) {
  const resultado={assuntos:[],aulas:[],avaliacoes:[],prazos:[],excecoes:[],inicio:'',fim:'',avisos:[],ano};
  for(const doc of documentos) {
    const linhas=String(doc.texto).split(/\n+/).map(limpar).filter(Boolean);
    let secaoAssuntos=false,secaoCronograma=false,secaoBibliografia=false;
    for(let i=0;i<linhas.length;i++) {
      const linha=linhas[i], t=normalizar(linha), trecho=linha.slice(0,400), fonte=doc.nome;
      if(/^(?:bibliografia|referencias)\b/.test(t))secaoBibliografia=true;
      if(/^(?:cronograma|avaliac(?:ao|oes)|horarios?|ementa|conteudo programatico)\b/.test(t))secaoBibliografia=false;
      if(secaoBibliografia)continue;
      const ds=datas(linha,ano);
      if(/\bcronograma\b/.test(t) || /^data\s*[|;\t].*(?:conteudo|assunto|tema|atividade)/.test(t))secaoCronograma=true;
      if(/^(?:bibliografia|referencias|metodologia|objetivos)\b/.test(t))secaoCronograma=false;
      if(/\b(?:periodo letivo|periodo das aulas|vigencia|inicio e fim|duracao do semestre|semestre letivo)\b/.test(t)) {
        const periodo=datas([linha,linhas[i+1] || ''].join(' '),ano);
        if(periodo.length>=2 && periodo[0].data<=periodo[1].data) [resultado.inicio,resultado.fim]=[periodo[0].data,periodo[1].data];
        continue;
      }
      if(/\binicio (?:das aulas|do semestre)\b/.test(t) && ds[0]){resultado.inicio=ds[0].data;continue;}
      if(/\b(?:fim|termino|encerramento) (?:das aulas|do semestre)\b/.test(t) && ds[0]){resultado.fim=ds[0].data;continue;}
      if(/\b(?:feriado|recesso|sem aula|aulas suspensas)\b/.test(t) && ds.length) {
        if(/\brecesso\b/.test(t) && ds.length>=2 && ds[0].data<=ds[1].data && (Date.parse(ds[1].data)-Date.parse(ds[0].data))/86400000<=366) {
          for(const d=new Date(ds[0].data+'T12:00:00Z');d.toISOString().slice(0,10)<=ds[1].data;d.setUTCDate(d.getUTCDate()+1))resultado.excecoes.push(d.toISOString().slice(0,10));
        } else resultado.excecoes.push(...ds.map(x=>x.data));
        if(!/\b(?:prova|avaliacao|exame|[pn][1-4])\b/.test(t))continue;
      }
      if(/^(?:\d+[.)\s-]*)?(?:ementa|conteudo(?:s)? programatico(?:s)?|assuntos|temas|unidades tematicas)\b/.test(t)) {
        secaoAssuntos=true;
        const resto=linha.replace(/^[^:]+:\s*/, '');
        if(resto!==linha && resto.length>2)resultado.assuntos.push({texto:resto.slice(0,200),trecho,fonte});
        continue;
      }
      if(/^(?:\d+[.)\s-]*)?(?:bibliografia|metodologia|avaliac(?:ao|oes)|criterios de|cronograma|horario|objetivos|referencias|carga horaria)\b/.test(t))secaoAssuntos=false;
      if(secaoAssuntos && linha.length>2)resultado.assuntos.push({texto:linha.replace(/^[•*\-–]\s*/, '').slice(0,200),trecho,fonte});
      const horario=horas(linha);
      const dias=diasDaSemana(linha);
      const prova=/\b(?:provas?|avaliac(?:ao|oes)|exames?|testes?|[pn][1-4]|av[1-4])\b/.test(t) && !/\b(?:sem|nao (?:ha|havera|tera))\s+(?:uma?\s+)?(?:prova|avaliacao)/.test(t);
      const entrega=/\b(?:entrega|seminario|trabalho|relatorio|atividade avaliativa)\b/.test(t);
      if(dias.length && !prova && !entrega && (horario.hora || /\b(?:aulas?|horario)\b/.test(t)) && !ds.length) {
        const marcadores=Array.from(t.matchAll(/\b(?:domingos?|segundas?|tercas?|quartas?|quintas?|sextas?|sabados?)(?:-feiras?)?\b/g));
        const blocos=marcadores.map((m,n)=>({diaSemana:diasDaSemana(m[0])[0],...horas(t.slice(m.index,marcadores[n+1]?.index))}));
        const distintos=blocos.length>1 && blocos.every(x=>x.hora);
        for(const item of distintos ? blocos : dias.map(diaSemana=>({diaSemana,...horario})))resultado.aulas.push({nome:'Aula',data:'',...item,trecho,fonte});
        continue;
      }
      const contexto = ds.length && !prova && !entrega && /\b(?:prova|avaliacao)\b/.test(normalizar(linhas[i-1] || '')) && (linhas[i-1] || '').length<65 ? linhas[i-1] : '';
      const tipo=(prova || contexto) ? 'avaliacoes' : entrega ? 'prazos' : ds.length && (secaoCronograma || /\b(?:aula|unidade|tema|conteudo|encontro)\b/.test(t)) ? 'aulas' : '';
      if(!tipo)continue;
      if(!ds.length && (!horario.hora || tipo!=='aulas') && linha.length>180)continue;
      let nome=limpar([contexto,linha].filter(Boolean).join(' ').replace(/\b20\d{2}-\d{2}-\d{2}\b/g,'').replace(/\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b/g,'').replace(/\b\d{1,2}\s+de\s+[a-zç]+(?:\s+de\s+20\d{2})?\b/gi,'').replace(/\b\d{1,2}\s*(?::\s*\d{2}|h\s*\d{0,2})\b/g,'').replace(/(?:^|\s)(?:as|às|das|ate|até)\s*$/i,'').replace(/^[|:;\s-]+|[|:;\s-]+$/g,''));
      nome=nome.slice(0,140) || (tipo==='avaliacoes' ? 'Avaliação' : tipo==='prazos' ? 'Entrega' : 'Aula');
      if(tipo==='aulas' && nome!=='Aula')resultado.assuntos.push({texto:nome.replace(/^Aula\s*:?\s*/i,'').slice(0,200),trecho,fonte});
      // Não transforma a seção inteira sobre critérios de avaliação em uma prova.
      if(!ds.length && /^(?:avaliacao|avaliacoes|criterios de avaliacao)\s*:?$/.test(t))continue;
      if(!ds.length && /^(?:avaliacao|avaliacoes|criterios de avaliacao)\s*:/.test(t))continue;
      for(const d of ds.length ? ds : [{data:''}]) {
        const item={nome,data:d.data,...horario,trecho,fonte};
        if(tipo==='aulas')item.diaSemana=null;
        resultado[tipo].push(item);
      }
    }
  }
  const semanais=resultado.aulas.filter(a=>a.diaSemana!==null && a.diaSemana!==undefined);
  for(const aula of resultado.aulas) {
    if(!aula.data || aula.hora)continue;
    const dia=new Date(aula.data+'T12:00:00Z').getUTCDay();
    const horarios=semanais.filter(a=>a.diaSemana===dia);
    if(horarios.length===1) {aula.hora=horarios[0].hora;aula.horaFim=horarios[0].horaFim;}
  }
  resultado.assuntos=unicos(resultado.assuntos,x=>chave(x.texto)).slice(0,80);
  resultado.excecoes=[...new Set(resultado.excecoes)].sort();
  for(const tipo of ['aulas','avaliacoes','prazos'])resultado[tipo]=unicos(resultado[tipo],x=>chave([x.nome,x.data,x.diaSemana,x.hora,x.horaFim].join('|'))).slice(0,100);
  if([...resultado.avaliacoes,...resultado.prazos].some(x=>!x.data))resultado.avisos.push('Há avaliações ou entregas sem data. Complete ou desmarque esses itens na revisão.');
  if(resultado.aulas.some(x=>x.diaSemana!==null && x.diaSemana!==undefined) && (!resultado.inicio || !resultado.fim))resultado.avisos.push('Informe o início e o fim das aulas para colocar os horários semanais na agenda.');
  if(!resultado.assuntos.length && !resultado.aulas.length && !resultado.avaliacoes.length && !resultado.prazos.length)resultado.avisos.push('Não encontrei um cronograma reconhecível. Os documentos podem ser guardados e os itens cadastrados manualmente.');
  return resultado;
}
export function expandirAulas(aulas,inicio,fim,excecoes=[]) {
  const saida=[];
  const semanais=aulas.filter(x=>x.diaSemana!==null && x.diaSemana!==undefined);
  if(semanais.length) {
    if(!dataValida(inicio) || !dataValida(fim) || inicio>fim)throw new Error('Informe um período válido para as aulas semanais.');
    if((Date.parse(fim)-Date.parse(inicio))/86400000>366)throw new Error('O período das aulas deve ter até um ano.');
  }
  for(const a of aulas) {
    if(!horaValida(a.hora) || (a.horaFim && (!horaValida(a.horaFim) || a.horaFim<=a.hora)))throw new Error('Revise o horário de início e fim das aulas selecionadas.');
    if(a.diaSemana===null || a.diaSemana===undefined) {
      if(!dataValida(a.data))throw new Error('Complete a data das aulas selecionadas.');
      saida.push({...a});continue;
    }
    if(!Number.isInteger(a.diaSemana) || a.diaSemana<0 || a.diaSemana>6)throw new Error('Revise o dia da semana.');
    for(const d=new Date(inicio+'T12:00:00Z');d.toISOString().slice(0,10)<=fim;d.setUTCDate(d.getUTCDate()+1)) {
      if(d.getUTCDay()===a.diaSemana)saida.push({...a,data:d.toISOString().slice(0,10)});
    }
  }
  if(saida.length>600)throw new Error('Selecione um período menor: o limite é 600 aulas por importação.');
  // A aula datada pode trazer o assunto daquele encontro. Ela prevalece sobre
  // a ocorrência genérica do mesmo horário semanal.
  saida.sort((a,b)=>Number(a.nome==='Aula')-Number(b.nome==='Aula'));
  const semAula=new Set(excecoes);
  return unicos(saida.filter(a=>!semAula.has(a.data)),a=>[a.data,a.hora,a.horaFim].join('|'));
}
