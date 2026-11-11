/* Historical editions: on-demand OCR paragraph/window search, optional E5 semantic
   reranking. The source PDF, OCR, page offsets and editorial apparatus are untouched. */
(()=>{'use strict';
const page=document.querySelector('#search'),query=document.querySelector('#q'),edition=document.querySelector('#ed');
if(!page||!query||!edition||!window.VitruviaOCRParagraphs)return;
const supported=new Set(['krohn-1912','rose-1899','perrault-1673','cesariano-1521']),cache=new Map();
const choose=(text,parent,tag='p')=>{const e=document.createElement(tag);e.textContent=text;parent.append(e);return e};
const panel=document.createElement('section');panel.className='historical-semantic-panel';
panel.setAttribute('aria-label','Búsqueda por párrafos OCR');
panel.style.cssText='padding:1rem;margin:1rem 0;border:1px solid #928671;border-radius:8px';
choose('Búsqueda de los PDF históricos por párrafos',panel,'h2');
choose('Krohn 1912 · Rose 1899 · Perrault 1673 · Cesariano 1521. Recupera fragmentos del OCR sin corregirlos ni confundir páginas con loci filológicos. Perrault transmite una traducción francesa, no un cuarto texto latino.',panel);
const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:.65rem';
const lexical=document.createElement('button');lexical.type='button';lexical.textContent='Buscar por párrafos (BM25)';
const neural=document.createElement('button');neural.type='button';neural.textContent='Reordenar por sentido (IA E5)';
actions.append(lexical,neural);panel.append(actions);
const status=choose('El modo BM25 funciona sin modelo ni pago. La opción E5 descarga el modelo multilingüe solo al solicitarla.',panel);
status.setAttribute('role','status');
const results=document.createElement('div');results.setAttribute('aria-live','polite');panel.append(results);
page.after(panel);
const tokens=s=>String(s||'').replace(/ſ/g,'s').replace(/[Ææ]/g,'ae').replace(/[Œœ]/g,'oe').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').split(/\s+/).filter(x=>x.length>2);
function lexicalRank(q,docs,limit=25){
 const words=[...new Set(tokens(q))],N=docs.length;
 if(!words.length)return [];
 const prepared=docs.map(doc=>{const v=tokens(doc.text),tf=new Map();
  for(const term of v)tf.set(term,(tf.get(term)||0)+1);
  return {doc,tf,length:Math.max(1,v.length)};
 });
 const df=new Map();for(const x of prepared)for(const word of x.tf.keys())df.set(word,(df.get(word)||0)+1);
 const avg=prepared.reduce((a,x)=>a+x.length,0)/Math.max(1,N),phrase=tokens(q).join(' ');
 return prepared.map(x=>{
  let score=0;for(const w of words){const f=x.tf.get(w)||0;if(!f)continue;
   const d=df.get(w)||0;score+=Math.log(1+(N-d+0.5)/(d+0.5))*(2.4*f)/(f+1.4*(0.28+0.72*x.length/avg))}
  if(phrase.length>3&&tokens(x.doc.text).join(' ').includes(phrase))score+=8;
  return {doc:x.doc,score,exact:score>8};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);
}
const label=id=>({'krohn-1912':'Krohn (1912)','rose-1899':'Rose (1899)','perrault-1673':'Perrault (1673 · francés)','cesariano-1521':'Cesariano (1521)'})[id]||id;
async function paragraphs(id){
 if(cache.has(id))return cache.get(id);
 const promise=(async()=>{const res=await fetch('data/text/'+id+'.json');if(!res.ok)throw Error('HTTP '+res.status);
  const pages=await res.json();if(!Array.isArray(pages))throw Error('Índice OCR inesperado');
  return window.VitruviaOCRParagraphs.buildPages(id,pages)
 })().catch(e=>{cache.delete(id);throw e});
 cache.set(id,promise);return promise;
}
let runId=0;
async function rank(method){
 const id=edition.value,q=query.value.trim(),serial=++runId;
 if(!supported.has(id)){status.textContent='Seleccione Krohn, Rose, Perrault o Cesariano para consultar sus fragmentos OCR.';return}
 if(!q){status.textContent='Ingrese una palabra, tema o frase antes de buscar.';query.focus();return}
 lexical.disabled=neural.disabled=true;results.replaceChildren();
 status.textContent='Preparando los segmentos OCR de '+label(id)+'…';
 try{
  const docs=await paragraphs(id);if(serial!==runId)return;
  if(!docs.length)throw Error('No hay segmentos OCR aptos para búsqueda');
  let ranked,mode;
  if(method==='neural'){
   if(!window.VitruviaAI?.rank)throw Error('Motor E5 no disponible');
   const outcome=await window.VitruviaAI.rank(q,docs,{limit:25,candidates:55});
   ranked=outcome.rows||[];mode=outcome.mode;
  }else{ranked=lexicalRank(q,docs);mode='bm25'}
  if(serial!==runId)return;
  status.textContent=docs.length+' segmentos de '+label(id)+' · '+ranked.length+' resultados ('+
   (mode==='neural'?'E5 + BM25':mode==='bm25-fallback'?'BM25 de reserva':'BM25')+
   '). OCR no revisado. La semejanza semántica no verifica lectura, traducción ni locus.';
  for(const hit of ranked){
   const r=hit.doc,card=document.createElement('article');card.style.cssText='padding:.8rem 0;border-bottom:1px solid #a49c90';
   choose(label(id)+' · página PDF '+r.page+' · segmento '+r.part,card,'h3');
   const txt=r.text.slice(0,620)+(r.text.length>620?'…':'');
   const paragraph=choose('',card);
   if((id==='rose-1899'||id==='perrault-1673'||id==='cesariano-1521')&&window.VitruviaOCRHighlight?.decorate)
    window.VitruviaOCRHighlight.decorate(paragraph,txt,q);
   else {paragraph.textContent=txt;if(id==='rose-1899'||id==='perrault-1673'||id==='cesariano-1521')paragraph.classList.add('vdl-ocr-highlight');}
   choose((r.segmentation==='ocr-block'?'Bloque OCR':'Ventana aproximada')+
    ' · OCR no cotejado · sin asignación canónica de locus',card,'small');
   const open=document.createElement('a');open.textContent='Abrir la página del facsímil';
   open.href=id==='cesariano-1521'?'cesariano-1521.html?'+new URLSearchParams({ocr_q:q,ocr_page:String(r.page)}):
    'concordancia-historica.html?'+new URLSearchParams({ed:id,page:String(r.page),q});
   open.style.cssText='display:block;margin-top:.4rem;text-decoration:underline';card.append(open);results.append(card);
  }
  if(!ranked.length)choose('No se hallaron segmentos con coincidencia. Esto no acredita que la expresión falte en la edición.',results);
 }catch(e){if(serial===runId)status.textContent='Búsqueda no disponible: '+String(e.message||e)+'. El buscador OCR literal sigue funcionando.'}
 finally{if(serial===runId){lexical.disabled=neural.disabled=false}}
}
lexical.addEventListener('click',()=>rank('bm25'));
neural.addEventListener('click',()=>rank('neural'));
edition.addEventListener('change',()=>{++runId;results.replaceChildren();status.textContent='Edición cambiada. Se mantiene disponible la búsqueda literal del facsímil.';lexical.disabled=neural.disabled=false});
})();
