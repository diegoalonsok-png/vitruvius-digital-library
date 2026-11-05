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
 el.textContent=src?'PDF elegido: '+src.label+'. Buscará únicamente en su texto indexado '+(src.kind==='ocr'?'(OCR página por página).':'(latín y traducción).'):'El documento seleccionado no dispone de índice de texto integrado: elige Krohn, Rose, V514, V554 o V297, o busca en todas las ediciones.';
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
/* Página del PDF de Krohn o Rose para un pasaje de las ediciones: se compara el texto latino del locus con el
   OCR página por página (palabras de seis letras o más, u/v e i/j unificadas). Se ofrece solo si coincide
   una parte suficiente del pasaje; si no, no se inventa la página. */
const ocrWords=new Map();
async function ocrIndex(src){
 if(ocrWords.has(src.id))return ocrWords.get(src.id);
 const job=load(src).then(data=>(Array.isArray(data)?data:data.pages||[]).map(p=>({page:Number(p.page),words:new Set(fold(p.text||'').match(/[a-z]{6,}/g)||[])})));
 ocrWords.set(src.id,job);return job;
}
async function ocrPageFor(src,latin,term){
 const words=[...new Set(fold(latin||'').match(/[a-z]{6,}/g)||[])];if(words.length<3)return null;
 const pages=await ocrIndex(src);let best=null;
 for(const pg of pages){let n=0;for(const w of words)if(pg.words.has(w))n++;
  const t=term&&pg.words.has(fold(term))?0.5:0;if(!best||n+t>best.n+best.t)best={page:pg.page,n,t}}
 // Un pasaje suele partirse entre dos páginas: basta con el 35 % de sus palabras largas en una de ellas.
 return best&&best.n>=Math.max(3,Math.ceil(words.length*0.35))?{page:best.page,share:Math.round(100*best.n/words.length)}:null;
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
   addButton(card,(r.kind==='ocr'?'Abrir PDF':r.source.label.split(' · ')[0]+' · PDF')+' pág. '+r.page,()=>{
    document.dispatchEvent(new CustomEvent('scriptorium:open-search-result',{detail:{source:r.source.pdf,page:r.page,term:r.term||'',locus:r.p?.locus||null}}));
    const step=document.getElementById('stage');if(step)setTimeout(()=>step.scrollIntoView({behavior:'smooth',block:'start'}),150);
   });
   const note=document.createElement('small');note.textContent=r.kind==='ocr'?'Referencia por página OCR: coteja la imagen.':'Página consignada por el índice del autor: coteja la coincidencia en el PDF.';card.append(note);
  }else{
   const p=document.createElement('small');p.textContent='No hay página PDF verificada para este resultado; no se inventa un salto de página.';card.append(p);
  }
  if(r.p&&r.kind!=='ocr'&&r.p.latin){
   const box=document.createElement('p');box.className='script-ocr-pages';box.textContent='Buscando la página en Krohn 1912 y Rose 1899…';card.append(box);
   const ocrs=sources.filter(x=>x.kind==='ocr'&&(!ocrFocus||ocrFocus===x.id));
   Promise.all(ocrs.map(async src=>[src,await ocrPageFor(src,r.p.latin,r.term).catch(()=>null)])).then(found=>{
    box.replaceChildren();const ok=found.filter(([,f])=>f);
    if(!ok.length){box.textContent='No se localizó este pasaje en el OCR de Krohn ni de Rose con suficiente certeza.';return}
    for(const [src,f] of ok)addButton(box,src.label.split(' · ')[0]+' · PDF pág. '+f.page,()=>{
     document.dispatchEvent(new CustomEvent('scriptorium:open-search-result',{detail:{source:src.pdf,page:f.page,term:r.term||'',locus:r.p.locus}}));
     const step=document.getElementById('stage');if(step)setTimeout(()=>step.scrollIntoView({behavior:'smooth',block:'start'}),150)});
    const n=document.createElement('small');n.textContent=' Página localizada comparando el latín del locus con el OCR ('+ok.map(([s,f])=>s.label.split(' · ')[0]+': '+f.share+' % de coincidencia').join('; ')+'). Coteja la imagen.';box.append(n);
   });
  }
  if(r.p?.locus){const ap=document.createElement('a');ap.href='aparato-critico.html?locus='+encodeURIComponent(r.p.locus);ap.textContent='Aparato crítico de este locus →';ap.style.marginRight='14px';card.append(ap)}
  if(r.p){
   const a=document.createElement('a');a.href='lector-bilingue.html?locus='+encodeURIComponent(r.p.locus)+'&lang='+({recensio:'es','recensio-es':'es','recensio-fr':'fr','theory-en':'en'}[r.id]||'es');a.textContent='Consultar locus con texto y traducción →';card.append(a);
   if(/^\d+\.(?:praef\.)?\d+(?:\.\d+)?$/.test(r.p.locus)){const h=document.createElement('a');h.href='codex-h-folios-local.html?locus='+encodeURIComponent(r.p.locus);h.textContent=' · Ver en el Codex H (folio verificado o estimado) →';h.title='Abre el folio de Harley MS 2767: comienzo de libro verificado o posición estimada, según el caso';card.append(h);}
  }
  out.append(card);
 }
 if(live.length>count){const last=document.createElement('p');last.textContent='Se muestran los primeros '+count+' resultados. Precisa el término o elige una edición para acotar la búsqueda.';out.append(last);}
}
let running=0,ocrFocus=null;
const EDITION_NAMES=[['krohn-1912',['krohn']],['rose-1899',['rose']],['recensio-es',['v514']],['recensio-fr',['v554']],['theory-en',['v297']]];
function osa(a,b){const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1)}return d[a.length][b.length]}
function editionInQuery(q){
 const words=q.split(/\s+/);
 for(const [id,names] of EDITION_NAMES)for(let i=0;i<words.length;i++){
  const w=fold(words[i]).replace(/[^a-z0-9]/g,'').replace(/(.)\1+/g,'$1');
  if(names.some(n=>w===n||(n.length>=5&&w.length>=4&&osa(w,n)<=1))){
   const rest=words.filter((_,k)=>k!==i&&!(k===i+1&&/^1[89]\d\d$/.test(words[k]))).join(' ').trim();
   return {id,rest};
  }}
 return null;
}
$('script-search-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const named=editionInQuery($('script-query').value.trim());ocrFocus=named&&/krohn|rose/.test(named.id)?named.id:null;
 const serial=++running,q=named?.rest||$('script-query').value.trim(),scope=named?named.id:$('script-search-scope').value,mode=$('script-search-mode').value,status=$('script-search-status');
 if(!q){status.textContent='Ingresa un locus, palabra o frase.';return;}
 live=[];$('script-search-results').replaceChildren();
 const locus=locusQuery(q);
 status.textContent='Consultando índices del tratado y OCR histórico…';
 // Si la fuente elegida arriba no tiene índice de texto (p. ej., un manuscrito), se busca en todas las ediciones y OCR.
 const target=scope==='selected'?(selectedIndex()||'all'):scope;
 if(named)status.textContent='Edición indicada en la consulta: '+(sources.find(x=>x.id===named.id)?.label||named.id)+' · término: «'+q+'»';
 if(scope==='selected'&&!target){status.textContent='El PDF elegido no tiene un índice textual accesible. Elige Krohn 1912, Rose 1899 o una de tus tres ediciones; Budé solo puede consultarse bibliográficamente por ahora.';return;}
 // Si se nombró Krohn o Rose: pasajes de V514 (con su página en ese PDF) y páginas OCR de ese PDF.
 const chosen=ocrFocus&&named?sources.filter(src=>src.id==='recensio-es'||src.id===ocrFocus):sources.filter(src=>target==='all'||target===src.id);
 if(mode==='semantic'&&!locus){
  // Búsqueda por sentido con el motor compartido de Vitruvia sobre los mismos índices.
  status.textContent='Buscando por sentido en los índices del tratado y el OCR… la primera vez el navegador descarga el modelo multilingüe (~120 MB); si no puede, se usa BM25.';
  if(!window.VitruviaAI?.rank)await new Promise(r=>{const sc=document.createElement('script');sc.src='assets/vitruvia-ai.js?v=20261104-rank-v1';sc.onload=r;sc.onerror=r;document.head.append(sc);});
  if(!window.VitruviaAI?.rank){status.textContent='El motor de búsqueda por sentido no está disponible; usa otra modalidad.';return;}
  const docs=[],missingSrc=[];
  await Promise.all(chosen.map(async src=>{try{const data=await load(src);
   if(src.kind==='edition'){for(const p of data.passages||[]){const page=Number(p.pdf_pages?.translation||p.pdf_pages?.latin||0)||null;
     docs.push({id:src.id+':'+p.locus,text:(p.latin||'')+' '+(p.translation||''),row:{kind:'edition',id:src.id,source:src,p,field:'translation',term:'',page,snippet:p.translation||p.latin,label:'De architectura '+p.locus}})}}
   else{for(const p of (Array.isArray(data)?data:data.pages||[]))docs.push({id:src.id+':'+p.page,text:p.text||'',row:{kind:'ocr',id:src.id,source:src,term:'',page:Number(p.page),snippet:p.text,label:'Página OCR '+p.page}})}
  }catch(e){missingSrc.push(src.label)}}));
  const res=await window.VitruviaAI.rank(q,docs.filter(d=>d.text.length>40),{limit:40});
  if(serial!==running)return;
  const words=q.split(/\s+/).filter(w=>w.length>3);
  live=res.rows.map(x=>{const r={...x.doc.row};const fs=fold(r.snippet||'');r.term=words.find(w=>fs.includes(fold(w)))||'';return r});
  render();
  status.textContent=live.length+' resultados · '+(res.mode==='neural'?'por sentido (IA E5 multilingüe) + texto':'búsqueda textual BM25 (el modelo de IA no se cargó)')+' · Fuente: '+(target==='all'?'todas las ediciones y OCR':chosen[0]?.label)+(missingSrc.length?' · Sin acceso al índice: '+missingSrc.join(', '):'');
  return;
 }
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
