/* Scriptorium search uses the existing documented corpus. It does not change
   the principal search engine or treat an OCR hit as verified collation. */
const $ = id => document.getElementById(id);
const sources = [
 {id:'recensio-es',label:'V514 · Latín / Español',kind:'edition',file:'data/structured/recensio-es.json',pdf:'own:recensio-es'},
 {id:'recensio-fr',label:'V554 · Latín / Francés',kind:'edition',file:'data/structured/recensio-fr.json',pdf:'own:recensio-fr'},
 {id:'theory-en',label:'V297 · Latín / Inglés',kind:'edition',file:'data/structured/theory-en.json',pdf:'own:theory-en'},
 {id:'krohn-1912',label:'Krohn 1912 · OCR latino',kind:'ocr',file:'data/text/krohn-1912.json',pdf:'pdf:krohn'},
 {id:'rose-1899',label:'Rose 1899 · OCR latino',kind:'ocr',file:'data/text/rose-1899.json',pdf:'pdf:rose-1899'}
];
const searchSourceMap = {
 'own:recensio-es':'recensio-es','own:recensio-fr':'recensio-fr','own:theory-en':'theory-en',
 'pdf:krohn':'krohn-1912','pdf:rose-1899':'rose-1899'
};
const selectedPDF = () => document.getElementById('source')?.value || '';
const selectedIndex = () => searchSourceMap[selectedPDF()] || null;
const semanticConcepts = [
 // Documented technical synonym sets: not an AI embedding model.
 ['symmetria','symmetriae','simetría','symétrie','symmetry','proporción','proportion','proportio','proportiones','conmensurabilidad','commensuratio','commensurabilité','συμμετρία'],
 ['ordinatio','ordenación','ordenacion','ordonnance','ordering','order','modulatio','modulus','módulo','module'],
 ['dispositio','disposición','disposition','arrangement','taxis','τάξις'],
 ['eurythmia','euritmia','eurythmie','eurythmy','εὐρυθμία'],
 ['firmitas','solidez','solidity','stability','solidité','estabilidad','estabilite','stabilitas','resistencia','strength'],
 ['utilitas','utilidad','utility','usefulness','fonction','función','function','fonctionnalité','functionality'],
 ['venustas','belleza','beauty','beauté','estética','aesthetics','pulchritudo'],
 ['architectura','architectus','architecti','arquitectura','architecture','arquitecto','architecte','architect','ἀρχιτεκτονική'],
 ['hydraulica','hidráulica','hydraulics','hydraulique','aqua','aquae','agua','water','eau','aquaeductus','acueducto','aqueduct'],
 ['machina','machinae','máquina','machine','machines','máquinas','mechanica','mechanics','mécanique','mecánica','μηχανή'],
 ['columna','columnae','column','columns','colonne','columnas','colonnes','intercolumnium','intercolumnio','intercolumniation'],
 ['templum','templi','aedes','aedis','templo','temple','temples','templa','santuario','sanctuaire'],
 ['gnomon','gnomónica','gnomonique','gnomonics','horologium','horologia','reloj solar','sundial','cadran solaire'],
 ['geometria','geometría','geometry','géométrie','geometrica','geometric'],
 ['proscaenium','scaena','theatrum','teatro','theatre','théâtre','escena','scène','stage','escenario'],
 ['opus caementicium','hormigón romano','roman concrete','béton romain','caementum','concrete','hormigón'],
 ['perspectiva','perspective','óptica','optics','optique','visual','visión','vision','scenographia'],
 ['balista','ballista','catapulta','catapult','catapulte','tormentum','tormenta','máquina bélica','siege engine']
];
const statusSelected = () => {
 const el=document.getElementById('script-selected-note'),source=selectedPDF(),src=sources.find(x=>x.id===selectedIndex());
 if(!el)return;
 if(document.getElementById('script-search-scope').value!=='selected'){el.textContent='Búsqueda comparada: todas las fuentes indexadas o la edición elegida en el filtro.';return;}
 el.textContent=src?'PDF elegido: '+src.label+'. Buscará únicamente en su texto indexado '+(src.kind==='ocr'?'(OCR página por página).':'(latín y traducción).'):'El documento seleccionado no dispone de índice de texto integrado: elegí Krohn, Rose, V514, V554 o V297, o buscá en todas las ediciones.';
};
document.getElementById('source')?.addEventListener('change',()=>{
 document.getElementById('script-search-scope').value='selected';
 statusSelected();
});
document.getElementById('script-search-scope')?.addEventListener('change',statusSelected);
statusSelected();

const cache = new Map();
let live = [], attempt = 0;
const fold = value => String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i').replace(/ς/g,'σ');
const numberFromRoman = value => {
 const s=String(value).toUpperCase(), roman=['I','II','III','IV','V','VI','VII','VIII','IX','X'];
 return roman.indexOf(s)+1||Number(s);
};
function locusQuery(query){
 const m=String(query).trim().match(/^(?:(?:libro|book|livre|liber)\s*)?(X|IX|VIII|VII|VI|IV|V|III|II|I|10|[1-9])\s*[:.\/]\s*(praef(?:atio)?|prefacio|pr[óo]logo|[0-9]+)(?:\s*[:.\/]\s*([0-9]+))?$/i);
 if(!m)return null;
 const book=numberFromRoman(m[1]),chapter=/^(praef|prefacio|pr[oó]logo)/i.test(m[2])?'praef':Number(m[2]),section=m[3]?Number(m[3]):null;
 if(!Number.isInteger(book)||book<1||book>10||!(chapter==='praef'||Number.isInteger(chapter))||section!==null&&(!Number.isInteger(section)||section<1))return null;
 return {book,chapter,section};
}
const load = async src => {
 if(!cache.has(src.id)){
  cache.set(src.id,fetch(src.file).then(response=>{if(!response.ok)throw Error('HTTP '+response.status);return response.json();}).catch(error=>{cache.delete(src.id);throw error;}));
 }
 return cache.get(src.id);
};
async function expandTerms(q,mode){
 if(mode!=='lexical'&&mode!=='concept')return [q];
 const concepts=mode==='concept'?semanticConcepts.filter(set=>set.some(t=>fold(t)===fold(q))):[];
 const expandedConcepts=[...new Set(concepts.flatMap(set=>set))];
 try{
  const data=await load({id:'lexicon',file:'data/latin-lexicon.json'});
  const k=fold(q), found=(data.entries||[]).filter(e=>[e.lemma,e.greek,e.es,e.en,e.fr,...(e.forms||[]),...(e.aliases||[])].filter(Boolean).some(v=>
   String(v).split(/[,;\/]/).some(piece=>fold(piece.trim())===k)
  ));
  const terms=new Set([q,...expandedConcepts]);
  for(const e of found.slice(0,2)){
   for(const v of [e.lemma,e.greek,e.es,e.fr,e.en,...(e.forms||[]),...(e.aliases||[])]){
    if(!v)continue;
    for(const term of String(v).split(/[,;\/]/)){
     const t=term.trim();
     if(fold(t).length>=4&&fold(t).length<=38)terms.add(t);
     if(terms.size>=32)break;
    }
   }
  }
  return [...terms].slice(0,32);
 }catch{return [q,...expandedConcepts].slice(0,32);}
}
function indexOfTerm(text,term){
 const corpus=fold(text),wanted=fold(term);
 if(!wanted||wanted.length<2)return -1;
 let at=-1;
 while((at=corpus.indexOf(wanted,at+1))>=0){
  // An exact single word is not a substring of an unrelated longer word.
  if(/^[\p{L}\p{M}\p{N}]+$/u.test(term)){
   const isLetter=c=>/[\p{L}\p{M}\p{N}]/u.test(c||'');
   if(isLetter(corpus[at-1])||isLetter(corpus[at+wanted.length]))continue;
  }
  return at;
 }
 return -1;
}
function firstHit(text,terms){
 for(const term of terms)if(indexOfTerm(text,term)!==-1)return term;
 return null;
}
// Convert folded string offsets back to original UTF-16 offsets for precise snippets.
function locate(text,term){
 const target=fold(term),normalized=[],starts=[],ends=[];
 let pos=0;
 for(const glyph of String(text)){
  const start=pos;pos+=glyph.length;
  for(const c of fold(glyph)){normalized.push(c);starts.push(start);ends.push(pos);}
 }
 const str=normalized.join('');
 let from=0,at=-1;
 while((at=str.indexOf(target,from))!==-1){
  if(/^[\p{L}\p{M}\p{N}]+$/u.test(term)&&(/[\p{L}\p{M}\p{N}]/u.test(str[at-1]||'')||/[\p{L}\p{M}\p{N}]/u.test(str[at+target.length]||''))){from=at+1;continue;}
  return [starts[at],ends[at+target.length-1]];
 }
 return null;
}
function excerpt(text,term,max=420){
 const raw=String(text||'').replace(/\s+/g,' ');
 const m=term?locate(raw,term):null;
 const start=m?Math.max(0,m[0]-145):0,end=Math.min(raw.length,start+max);
 const p=document.createElement('p');p.className='script-excerpt';
 if(start)p.append(document.createTextNode('…'));
 if(!m||m[0]>=end){p.append(document.createTextNode(raw.slice(start,end)));}
 else{
  p.append(document.createTextNode(raw.slice(start,m[0])));
  const mark=document.createElement('mark');mark.textContent=raw.slice(m[0],m[1]);p.append(mark);
  p.append(document.createTextNode(raw.slice(m[1],end)));
 }
 if(end<raw.length)p.append(document.createTextNode('…'));
 return p;
}
function chapterMatches(p,q){
 return Number(p.book)===q.book&&String(p.chapter)===String(q.chapter)&&(q.section===null||(q.section>=Number(p.section)&&q.section<=Number(p.section_end||p.section)));
}
function matchEdition(src,data,query,parsed,terms){
 let found=[];
 for(const p of data.passages||[]){
  const isLocus=Boolean(parsed);
  if(isLocus&&!chapterMatches(p,parsed))continue;
  let term=null,field=null;
  if(!isLocus){
   term=firstHit(p.latin||'',terms);
   if(term)field='latin';
   if(!term){term=firstHit(p.translation||'',terms);if(term)field='translation';}
   if(!term)continue;
  }
  const page=Number(p.pdf_pages?.[field||'latin']||(isLocus?p.pdf_pages?.translation:0)||0)||null;
  found.push({kind:'edition',id:src.id,source:src,p,field,term,page,
   snippet:field==='latin'?p.latin:p.translation||p.latin,
   label:'De architectura '+p.locus});
  if(found.length>=100)break;
 }
 return found;
}
function matchOCR(src,data,terms){
 const results=[];
 const pages=Array.isArray(data)?data:data.pages||[];
 for(const p of pages){
  const term=firstHit(p.text||'',terms);
  if(!term)continue;
  results.push({kind:'ocr',id:src.id,source:src,term,page:Number(p.page),snippet:p.text,label:'Página OCR '+p.page});
  if(results.length>=80)break;
 }
 return results;
}
function addButton(parent,label,onclick){
 const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',onclick);parent.append(button);
}
function render(){
 const out=$('script-search-results');out.replaceChildren();
 const count=Math.min(80,live.length);
 for(let i=0;i<count;i++){
  const r=live[i],card=document.createElement('article');card.className='script-result';
  const h=document.createElement('h3');h.textContent=r.source.label+' · '+r.label;card.append(h);
  if(r.field){const small=document.createElement('small');small.textContent=r.field==='latin'?'Coincidencia en el texto latino':'Coincidencia en la traducción';card.append(small);}
  card.append(excerpt(r.snippet,r.term));
  if(r.page){
   addButton(card,'Abrir PDF · pág. '+r.page,()=>{
    document.dispatchEvent(new CustomEvent('scriptorium:open-search-result',{detail:{source:r.source.pdf,page:r.page,term:r.term||'',locus:r.p?.locus||null}}));
    const step=document.getElementById('stage');if(step)setTimeout(()=>step.scrollIntoView({behavior:'smooth',block:'start'}),150);
   });
   const note=document.createElement('small');note.textContent=r.kind==='ocr'?'Referencia por página OCR: cotejá la imagen.':'Página consignada por el índice del autor: cotejá la coincidencia en el PDF.';card.append(note);
  }else{
   const p=document.createElement('small');p.textContent='No hay página PDF verificada para este resultado; no se inventa un salto de página.';card.append(p);
  }
  if(r.p){
   const a=document.createElement('a');a.href='lector-bilingue.html?locus='+encodeURIComponent(r.p.locus)+'&lang='+({recensio:'es','recensio-es':'es','recensio-fr':'fr','theory-en':'en'}[r.id]||'es');a.textContent='Consultar locus con texto y traducción →';card.append(a);
  }
  out.append(card);
 }
 if(live.length>count){const last=document.createElement('p');last.textContent='Se muestran los primeros '+count+' resultados. Precisá el término o elegí una edición para acotar la búsqueda.';out.append(last);}
}
let running=0;
$('script-search-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const serial=++running,q=$('script-query').value.trim(),scope=$('script-search-scope').value,mode=$('script-search-mode').value,status=$('script-search-status');
 if(!q){status.textContent='Ingresá un locus, palabra o frase.';return;}
 live=[];$('script-search-results').replaceChildren();
 const locus=locusQuery(q);
 status.textContent='Consultando índices del tratado y OCR histórico…';
 const target=scope==='selected'?selectedIndex():scope;
 if(scope==='selected'&&!target){status.textContent='El PDF elegido no tiene un índice textual accesible. Elegí Krohn 1912, Rose 1899 o una de tus tres ediciones; Budé solo puede consultarse bibliográficamente por ahora.';return;}
 const chosen=sources.filter(src=>target==='all'||target===src.id);
 const terms=locus?[q]:await expandTerms(q,mode);
 const reports=await Promise.all(chosen.filter(src=>!locus||src.kind==='edition').map(async src=>{
  try{
   const data=await load(src);
   const rows=src.kind==='edition'?matchEdition(src,data,q,locus,terms):matchOCR(src,data,terms);
   return {src,rows};
  }catch(error){return {src,rows:[],error:error.message};}
 }));
 if(serial!==running)return;
 live=reports.flatMap(r=>r.rows);
 // Prioritize known page links and the literal query, never fabricate a hit.
 live.sort((a,b)=>Number(Boolean(b.page))-Number(Boolean(a.page)));
 render();
 const missing=reports.filter(x=>x.error).map(x=>x.src.label).join(', ');
 const suffix=locus?' · locus normalizado: '+locus.book+'.'+locus.chapter+(locus.section===null?'':'.'+locus.section):' · '+(mode==='concept'?'búsqueda conceptual multilingüe (índice de equivalencias controladas)':mode==='lexical'?'equivalencias léxicas orientativas':'coincidencias de texto')+' · Fuente: '+(target==='all'?'todas las ediciones y OCR':chosen[0]?.label);
 status.textContent=live.length+' resultados'+suffix+(missing?' · Sin acceso al índice: '+missing:'')+(locus&&chosen.some(x=>x.kind==='ocr')?' · Krohn y Rose no disponen de anclajes por locus verificados.':'')+(mode==='concept'&&terms.length===1?' · Concepto sin equivalencias en el índice: se realizó búsqueda literal.':'');
});
