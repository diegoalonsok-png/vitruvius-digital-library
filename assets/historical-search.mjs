const form=document.querySelector('#search'),query=document.querySelector('#q'),status=document.querySelector('#status'),out=document.querySelector('#results');
const sources={'krohn-1912':{id:'krohn-1912',index:'data/text/krohn-1912.json',pdf:'documents/krohn-1912.pdf',label:'Krohn (1912)'},'rose-1899':{id:'rose-1899',index:'data/text/rose-1899.json',pdf:'https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf',label:'Rose (1899)'},'perrault-1673':{id:'perrault-1673',index:'data/text/perrault-1673.json',pdf:'https://www.e-rara.ch/download/pdf/16797458.pdf',label:'Perrault (1673)'}};
let source=sources['krohn-1912'];
let requestSerial=0;
let cache=null;let activeQuery="",activePrefix=false;
const greekConcepts={
 'αρχιτεκτονικη':{label:'arquitectura',roots:['architect']},
 'αρχιτεκτων':{label:'arquitecto',roots:['architect']},
 'συμμετρια':{label:'proporción/simetría',roots:['symmetr']},
 'ευρυθμια':{label:'euritmia',roots:['eurythm']},
 'μηχανη':{label:'máquina',roots:['machin']}
};
const multilingualConcepts={
 'architecture':{label:'arquitectura / architecture',roots:['architect']},
 'arquitectura':{label:'arquitectura',roots:['architect']},
 'arquitecto':{label:'arquitecto',roots:['architect']},
 'architecte':{label:'architecte',roots:['architect']},
 'architect':{label:'architect',roots:['architect']},
 'architectonic':{label:'arquitectónico',roots:['architect']}
};
let dictionaryConcepts=[];
const distance=(a,b)=>{if(Math.abs(a.length-b.length)>2)return 3;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=next;}return prev[b.length];};
const conceptFor=q=>{
 const key=fold(q);
 const known=greekConcepts[greekFold(q)]||multilingualConcepts[key];
 if(known)return known;
 if(/^(?:architectur|arquitectur|architecte|arquitecto)/.test(key))return {label:'arquitectura',roots:['architect']};
 const exact=dictionaryConcepts.find(e=>e.aliases.includes(key));
 if(exact)return {label:exact.label,roots:exact.roots};
 if(key.length>=5){const near=Object.keys(multilingualConcepts).map(k=>({k,d:distance(key,k)})).sort((a,b)=>a.d-b.d)[0];if(near&&near.d<=(key.length>=9?2:1))return {...multilingualConcepts[near.k],label:multilingualConcepts[near.k].label+' (corrección sugerida: '+near.k+')',correction:true};}
 if(key.length>=5){const candidate=dictionaryConcepts.map(e=>({e,d:Math.min(...e.aliases.map(a=>distance(key,a)))})).sort((a,b)=>a.d-b.d)[0];if(candidate&&candidate.d<=(key.length>=9?2:1))return {label:candidate.e.label+' (corrección aproximada)',roots:candidate.e.roots,correction:true};}
 return null;
};
async function loadDictionary(){
 try{const response=await fetch('data/latin-lexicon.json');if(!response.ok)return;const data=await response.json();dictionaryConcepts=(data.entries||[]).map(e=>{
 const fragments=[e.lemma,...(e.forms||[]),...(e.aliases||[]),e.es,e.en,e.fr,e.greek].filter(Boolean).flatMap(v=>String(v).split(/[;,/]/)).map(fold).filter(v=>v.length>=4&&v.length<=45);
 const lemma=fold(e.lemma||'');const root=lemma.replace(/(?:arum|orum|ibus|um|us|ae|is|a|i)$/,'');
 return {label:e.lemma,aliases:[...new Set(fragments)],roots:[root.length>=4?root:lemma].filter(Boolean),french:[e.fr,...(e.fr||'').split(/[;,/]/)].filter(Boolean).flatMap(x=>x.split(/[;,/]/)).map(fold).filter(x=>x.length>=3)};
 }).filter(e=>e.aliases.length&&e.roots.length);}catch{}
}
// Cross-language retrieval is explicitly labelled as exploratory; never counted as a literal Latin hit.
// Derive French equivalents systematically from the corpus lexicon, not individual word exceptions.
function editionVariants(term,edition){
 // Historic OCR concordance is literal by default. Semantic equivalents
 // require a distinct verified translation index; otherwise unrelated words
 // in a French preface produce misleading results.
 if(edition==='perrault-1673'){
  const tokens=word(term);if(tokens.length!==1)return [];
  const key=tokens[0].form;
  const equivalents={
   arquitectura:['architecture'],arquitecto:['architecte'],arquitectos:['architectes'],
   arquitectonico:['architectural'],edificio:['batiment','edifice'],edificios:['batiments','edifices'],
   columna:['colonne'],columnas:['colonnes'],templo:['temple'],templos:['temples'],
   muro:['mur'],muros:['murs'],puerta:['porte'],puertas:['portes'],
   ventana:['fenetre'],ventanas:['fenetres'],agua:['eau'],
   simetria:['symetrie'],proporcion:['proportion'],
   symmetria:['symetrie'],architectura:['architecture'],architectus:['architecte'],
   columnae:['colonnes'],templum:['temple'],machina:['machine'],
   μηχανη:['machine']
  };
  const mapped=equivalents[key]||[];
  // Only transparent, curated equivalents: never use every associated
  // dictionary gloss as an exact translation (e.g. locus -> sujet).
  return [...new Set(mapped)].filter(v=>v!==key);
 }
 const tokens=word(term);if(tokens.length!==1)return [];
 const key=tokens[0].form;
 return [...new Set(dictionaryConcepts.filter(e=>e.aliases.includes(key)).map(e=>fold(e.label)))]
  .filter(x=>x!==key&&x.length>=4);
}
function typoSuggestions(q,edition){
 if(edition!=='perrault-1673'||q.trim().split(/\s+/).length!==1)return [];
 const key=fold(q),max=key.length>=8?2:1;
 return dictionaryConcepts.flatMap(e=>e.aliases.map(alias=>({alias,lemma:e.label,d:distance(key,alias)})))
   .filter(x=>x.d>0&&x.d<=max&&x.alias.length>=4)
   .sort((a,b)=>a.d-b.d||a.alias.length-b.alias.length)
   .filter((v,i,arr)=>arr.findIndex(x=>x.lemma===v.lemma)===i).slice(0,4);
}
function showTypoSuggestions(q,edition){
 const suggestions=typoSuggestions(q,edition);
 if(!suggestions.length)return;
 const section=document.createElement('section'),title=document.createElement('p');
 title.textContent='¿Quisiste escribir alguno de estos términos?';section.append(title);
 for(const choice of suggestions){
   const b=document.createElement('button');b.type='button';b.textContent=choice.lemma+' (consulta sugerida)';
   b.addEventListener('click',()=>{query.value=choice.lemma;form.requestSubmit();});section.append(b);
 }
 out.prepend(section);
}
const greekFold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ');
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
const word=s=>[...String(s).matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map(m=>({start:m.index,end:m.index+m[0].length,form:fold(m[0])}));
function matches(text,q,prefix){const t=word(text),wanted=word(q).map(x=>x.form);if(!wanted.length)return[];const found=[];for(let i=0;i<=t.length-wanted.length;i++){if(wanted.every((v,j)=>prefix&&wanted.length===1?t[i+j].form.startsWith(v):t[i+j].form===v))found.push({start:t[i].start,end:t[i+wanted.length-1].end});}return found;}
// French OCR: match the query itself first, then conservative plural inflections.
// Do not silently replace a Latin/Spanish query with broad French concepts.
function historicMatches(text,q,prefix,edition){
 const exact=matches(text,q,prefix);
 if(edition!=='perrault-1673'||prefix||word(q).length!==1)return exact;
 const token=word(q)[0].form;
 if(token.length<5||!/[a-z]/.test(token))return exact;
 const forms=[token+'s',token+'es'];
 if(token.endsWith('s'))forms.push(token.slice(0,-1));
 const seen=new Set(exact.map(x=>x.start+':'+x.end));
 for(const v of forms)for(const hit of matches(text,v,false)){
  const k=hit.start+':'+hit.end;if(!seen.has(k)){seen.add(k);exact.push(hit);}
 }
 return exact.sort((a,b)=>a.start-b.start);
}
function ocrAlternatives(rows,queryText){
 const q=fold(queryText.trim());if(!/^[a-z]{5,20}$/.test(q))return [];
 const counts=new Map();
 for(const row of rows)for(const term of word(row.text||'')){
  const x=term.form;
  if(Math.abs(x.length-q.length)>2||x.length<4)continue;
  counts.set(x,(counts.get(x)||0)+1);
 }
 return [...counts].map(([term,count])=>({term,count,d:distance(q,term)}))
  .filter(x=>x.d>0&&x.d<=(q.length>=8?2:1)&&x.count>=2)
  .sort((a,b)=>a.d-b.d||b.count-a.count).slice(0,5);
}
function showOcrAlternatives(rows,q){
 const options=ocrAlternatives(rows,q);if(!options.length)return;
 const div=document.createElement('section'),p=document.createElement('p');
 p.textContent='Grafías parecidas en el OCR de esta edición (sugerencias, no traducciones):';div.append(p);
 for(const option of options){
  const b=document.createElement('button');b.type='button';b.textContent=option.term+' ('+option.count+' apariciones OCR)';
  b.addEventListener('click',()=>{query.value=option.term;form.requestSubmit();});div.append(b);
 }
 out.prepend(div);
}
function result(page,text,m,number){const el=document.createElement('article'),h=document.createElement('h2'),p=document.createElement('p'),a=document.createElement('a');h.textContent=source.label+' — página PDF '+page;p.append(document.createTextNode((m.start>100?'…':'')+text.slice(Math.max(0,m.start-100),m.start)));const mark=document.createElement('mark');mark.textContent=text.slice(m.start,m.end);p.append(mark,document.createTextNode(text.slice(m.end,m.end+165)+(m.end+165<text.length?'…':'')));a.href=source.id==='perrault-1673'?'#perrault-page-viewer':source.pdf+'#page='+page;a.target=source.id==='perrault-1673'?'_self':'_blank';a.rel='noopener';a.textContent='Ver facsímil · página '+page+' ↗';a.addEventListener('click',ev=>{ev.preventDefault();const record=cache?.find(x=>x.page===page);if(!record)return;const hits=historicMatches(record.text,activeQuery,activePrefix,source.id);{const options=editionVariants(activeQuery,source.id);const near=options.filter(v=>distance(fold(activeQuery),v)<=3);for(const alt of source.id==='perrault-1673'?options:(near.length?near:options))hits.push(...matches(record.text,alt,false));}showPage(page,record.text,hits.sort((a,b)=>a.start-b.start));document.querySelector(source.id==='perrault-1673'?'#perrault-page-viewer':source.id==='krohn-1912'?'#pdfjs-viewer':'.historical-viewer')?.scrollIntoView({behavior:'smooth',block:'nearest'});});el.append(h,p,a);return el;}
function showPage(page,text,hits){
 const field=document.querySelector('#pdf-page-number');if(field)field.value=String(page);const note=document.querySelector('#page-hit-status');if(note)note.textContent=hits.length+' coincidencia(s) en esta página';
 const pdf=source.pdf+'#page='+page,frame=document.querySelector('#historical-pdf'),link=document.querySelector('#historical-pdf-link'),ocr=document.querySelector('#ocr-page');
 if(frame){if(source.id==='perrault-1673'){frame.hidden=true;frame.removeAttribute('src');}else if(frame.src!==new URL(pdf,location.href).href){frame.hidden=false;frame.src=pdf;}}if(link)link.href=source.id==='perrault-1673'?'https://doi.org/10.3931/e-rara-61952':pdf;
 const pdfPage=document.querySelector('#pdf-page-number');if(pdfPage)pdfPage.max=source.id==='perrault-1673'?'371':source.id==='rose-1899'?'358':'314';
 const visual=document.querySelector('#perrault-page-viewer');if(visual){visual.hidden=source.id!=='perrault-1673';if(source.id==='perrault-1673')visual.setAttribute('data-page',String(page));}const current=document.querySelector('#q')?.value.trim()||'';const concept=source.id==='krohn-1912'?conceptFor(current):null;document.dispatchEvent(new CustomEvent('historical-pdf-page',{detail:{page,query:current,roots:concept?.roots||[],prefix:document.querySelector('#mode')?.value==='prefix'}}));if(!ocr)return;
 ocr.replaceChildren();let offset=0;
 for(const hit of hits){if(hit.start<offset)continue;ocr.append(document.createTextNode(text.slice(offset,hit.start)));const mark=document.createElement('mark');mark.textContent=text.slice(hit.start,hit.end);ocr.append(mark);offset=hit.end;}
 ocr.append(document.createTextNode(text.slice(offset)));
}
function selectHistoricalEdition(){
 const id=document.querySelector('#ed')?.value||'krohn-1912';
 const viewer=document.querySelector('.historical-viewer'),heading=viewer?.querySelector('h2');
 const frame=document.querySelector('#historical-pdf'),link=document.querySelector('#historical-pdf-link');
 const pageLabel=document.querySelector('#pdf-page-number'),ocr=document.querySelector('#ocr-page');
 const pdfjs=document.querySelector('#pdfjs-viewer');
 const editionInfo={
   'krohn-1912':{label:'Krohn 1912',url:'documents/krohn-1912.pdf#page=1',ocr:true},
   'rose-1899':{label:'Rose 1899',url:'https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf#page=1',ocr:true},
   'perrault-1673':{label:'Perrault 1673',url:'https://www.e-rara.ch/download/pdf/16797458.pdf#page=1',ocr:true}
 };
 const info=editionInfo[id];if(!info)return;
 if(heading)heading.textContent='Facsímil original · '+info.label;
 if(frame){frame.title='Facsímil '+info.label;if(id==='perrault-1673'){frame.hidden=true;frame.removeAttribute('src');}else{frame.hidden=!info.ocr;frame.src=info.ocr?info.url:'about:blank';}}
 if(link){link.href=id==='perrault-1673'?'https://doi.org/10.3931/e-rara-61952':info.url;link.textContent=id==='perrault-1673'?'Consultar facsímil Perrault en e-rara (sin descarga automática) ↗':'Abrir facsímil '+info.label+' en la biblioteca de origen ↗';}
 if(pdfjs)pdfjs.hidden=true;
 if(ocr)ocr.replaceChildren();
 if(pageLabel){pageLabel.value=1;pageLabel.disabled=!info.ocr;}
 const go=document.querySelector('#goto-page button');if(go)go.disabled=!info.ocr;
 const note=document.querySelector('#page-hit-status');if(note)note.textContent=info.ocr?'':'Sin índice OCR ni paginación sincronizada';
 const visual=document.querySelector('#perrault-page-viewer');if(visual)visual.hidden=id!=='perrault-1673';
 return info;
}
document.querySelector('#ed')?.addEventListener('change',()=>{
 ++requestSerial;cache=null;activeQuery='';source=sources[document.querySelector('#ed').value];
 selectHistoricalEdition();out.replaceChildren();
 document.querySelector('#page-results')?.replaceChildren();
 status.textContent='Edición cambiada. La búsqueda OCR depende del índice disponible para esta edición.';
});
function getBook(q){
 const m=q.trim().match(/^(?:(?:libro|liber|book)\s+)?(X|IX|VIII|VII|VI|IV|V|III|II|I|10|[1-9])(?:\.(?:praef|\d+)(?:\.\d+)?)?$/i);
 if(!m)return null;return ({I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10})[m[1].toUpperCase()]||Number(m[1]);
}
async function showBook(book,serial){
 const res=await fetch('data/structured/recensio-es.json');
 if(!res.ok)throw Error('Índice de libros no disponible');
 const data=await res.json();if(serial!==requestSerial)return;
 out.replaceChildren();document.querySelector('#page-results')?.replaceChildren();
 const locusQuery=query.value.trim().replace(/^(?:libro|liber|book)\s+/i,'');
 const parts=locusQuery.split('.');const chapter=parts[1]||null,section=parts[2]?Number(parts[2]):null;
 const hits=(data.passages||[]).filter(p=>p.book===book&&(!chapter||String(p.chapter).toLowerCase()===chapter.toLowerCase())&&(!section||(p.section<=section&&(p.section_end||p.section)>=section)));
 status.textContent='Libro '+book+': '+hits.length+' pasajes de la edición V514. La correspondencia con páginas de '+source.label+' aún no está certificada.';
 for(const p of hits.slice(0,80)){
  const article=document.createElement('article'),a=document.createElement('a');
  a.href='lector-bilingue.html?edition=recensio-es&locus='+encodeURIComponent(p.locus);
  a.textContent='Libro '+book+' · '+p.locus;
  const line=document.createElement('p');line.textContent=String(p.latin||'').slice(0,240);
  article.append(a,line);out.append(article);
 }
}
form.addEventListener('submit',async e=>{
 e.preventDefault();const myRequest=++requestSerial;
 const edition=document.querySelector('#ed')?.value||'krohn-1912';selectHistoricalEdition();
 source=sources[edition];cache=null;
 document.querySelector('.historical-viewer h2').textContent='Facsímil original · '+source.label;
 const q=query.value.trim();if(!q)return;
 const book=getBook(q);if(book){try{await showBook(book,myRequest);}catch(error){status.textContent=error.message;}return;}
 out.replaceChildren();document.querySelector('#page-results')?.replaceChildren();status.textContent='Cargando índice histórico…';
 try{
  if(!cache){const r=await fetch(source.index);if(!r.ok)throw Error('Índice no disponible');cache=await r.json();if(!Array.isArray(cache)||!cache.length)throw Error('Índice vacío');}
  if(myRequest!==requestSerial)return;
  await loadDictionary();
  if(myRequest!==requestSerial)return;
  const concept=edition==='krohn-1912'?conceptFor(q):null,prefix=document.querySelector('#mode').value==='prefix';activeQuery=q;activePrefix=prefix;
  const variants=editionVariants(q,edition);
  let total=0,pages=0,shown=0,literal=0;const pageHits=[];
  for(const record of cache){
   if(typeof record.text!=='string')continue;
   let hits=historicMatches(record.text,q,prefix,edition);
   literal+=hits.length;
   if(variants.length&&word(q).length===1){const primary=variants.filter(v=>distance(fold(q),v)<=3);const preferred=edition==='perrault-1673'?variants:(primary.length?primary:variants);for(const variant of preferred)hits.push(...matches(record.text,variant,false));}
   if(concept){
    for(const root of concept.roots)hits.push(...matches(record.text,root,true));
    const seen=new Set();hits=hits.filter(m=>{if(seen.has(m.start))return false;seen.add(m.start);return true;}).sort((a,b)=>a.start-b.start);
   }
   if(variants.length){const seen=new Set();hits=hits.filter(x=>{const key=x.start+':'+x.end;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>a.start-b.start);}
   if(!hits.length)continue;hits.sort((a,b)=>a.start-b.start);total+=hits.length;pages++;pageHits.push({page:record.page,text:record.text,hits});
   for(const hit of hits)if(shown<100){const card=result(record.page,record.text,hit,shown);out.append(card);shown++;}
  }
  const nav=document.querySelector('#page-results');
  if(nav){for(const item of pageHits){const b=document.createElement('button');b.type='button';b.textContent='p. '+item.page+' ('+item.hits.length+')';b.addEventListener('click',()=>showPage(item.page,item.text,item.hits));nav.append(b);}}
  if(pageHits.length){const firstLiteral=pageHits.find(p=>historicMatches(p.text,q,prefix,edition).length>0);const selected=firstLiteral||pageHits[0];showPage(selected.page,selected.text,selected.hits);}
  status.textContent=(variants.length?'Consulta multilingüe: '+literal+' coincidencias literales; equivalencias lexicográficas exploradas ('+source.label+'): '+variants.slice(0,8).join(', ')+'. ':'')+(concept?'Equivalencias léxicas latinas de «'+q+'» ('+concept.label+'). Apariciones literales de la consulta: '+literal+'. ':'')+total+' coincidencias '+(concept?'latinas relacionadas':'OCR')+' en '+pages+' páginas de '+cache.length+' indexadas.'+(total>shown?' Mostrando las primeras '+shown+'.':'')+' El OCR puede contener errores: corroborar el facsímil.';
  if(!total){showTypoSuggestions(q,edition);showOcrAlternatives(cache,q);const p=document.createElement('p');p.textContent='No se encontraron coincidencias en el OCR disponible; esto no demuestra ausencia en el impreso.';out.append(p);}
 }catch(err){if(myRequest===requestSerial)status.textContent='No se pudo consultar '+source.label+': '+err.message+'. Comprobá que su índice OCR esté publicado.';}
});
document.querySelector('#goto-page')?.addEventListener('submit',async e=>{
 e.preventDefault();const n=Number(document.querySelector('#pdf-page-number').value),note=document.querySelector('#page-hit-status');
 const max=source.id==='perrault-1673'?371:Math.max(314,...(cache||[]).map(row=>row.page));
 if(!Number.isInteger(n)||n<1||n>max){if(note)note.textContent='Ingresá una página entre 1 y '+max+'.';return;}
 try{
  if(!cache){const r=await fetch(source.index);if(!r.ok)throw Error('Índice no disponible');cache=await r.json();}
  const record=cache.find(x=>x.page===n);
  if(!record){if(note)note.textContent='Página '+n+' sin transcripción OCR: el facsímil puede consultarse igualmente.';
   showPage(n,'',[]);return;}
  if(source.id==='krohn-1912')await loadDictionary();
  const concept=source.id==='krohn-1912'?conceptFor(activeQuery):null;
  let hits=activeQuery?historicMatches(record.text,activeQuery,activePrefix,source.id):[];
  if(activeQuery){const options=editionVariants(activeQuery,source.id);const near=options.filter(v=>distance(fold(activeQuery),v)<=3);for(const alt of source.id==='perrault-1673'?options:(near.length?near:options))hits.push(...matches(record.text,alt,false));}
  hits.sort((a,b)=>a.start-b.start);
  if(concept){for(const root of concept.roots)hits.push(...matches(record.text,root,true));const seen=new Set();hits=hits.filter(x=>{if(seen.has(x.start))return false;seen.add(x.start);return true;}).sort((a,b)=>a.start-b.start);}
  showPage(n,record.text,hits);
 }catch(err){if(note)note.textContent=err.message;}
});
