const form=document.querySelector('#search'),query=document.querySelector('#q'),status=document.querySelector('#status'),out=document.querySelector('#results');
const sources={'krohn-1912':{id:'krohn-1912',index:'data/text/krohn-1912.json',pdf:'documents/krohn-1912.pdf',label:'Krohn (1912)'},'rose-1899':{id:'rose-1899',index:'data/text/rose-1899.json',pdf:'https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf',label:'Rose (1899)'}};
let source=sources['krohn-1912'];
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
 const fragments=[e.lemma,...(e.forms||[]),...(e.aliases||[]),e.es,e.en,e.fr].filter(Boolean).flatMap(v=>String(v).split(/[;,/]/)).map(fold).filter(v=>v.length>=4&&v.length<=45);
 const lemma=fold(e.lemma||'');const root=lemma.replace(/(?:arum|orum|ibus|um|us|ae|is|a|i)$/,'');
 return {label:e.lemma,aliases:[...new Set(fragments)],roots:[root.length>=4?root:lemma].filter(Boolean)};
 }).filter(e=>e.aliases.length&&e.roots.length);}catch{}
}
const greekFold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ');
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
const word=s=>[...String(s).matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map(m=>({start:m.index,end:m.index+m[0].length,form:fold(m[0])}));
function matches(text,q,prefix){const t=word(text),wanted=word(q).map(x=>x.form);if(!wanted.length)return[];const found=[];for(let i=0;i<=t.length-wanted.length;i++){if(wanted.every((v,j)=>prefix&&wanted.length===1?t[i+j].form.startsWith(v):t[i+j].form===v))found.push({start:t[i].start,end:t[i+wanted.length-1].end});}return found;}
function result(page,text,m,number){const el=document.createElement('article'),h=document.createElement('h2'),p=document.createElement('p'),a=document.createElement('a');h.textContent=source.label+' — página PDF '+page;p.append(document.createTextNode((m.start>100?'…':'')+text.slice(Math.max(0,m.start-100),m.start)));const mark=document.createElement('mark');mark.textContent=text.slice(m.start,m.end);p.append(mark,document.createTextNode(text.slice(m.end,m.end+165)+(m.end+165<text.length?'…':'')));a.href=source.pdf+'#page='+page;a.target='_blank';a.rel='noopener';a.textContent='Ver facsímil · página '+page+' ↗';a.addEventListener('click',ev=>{const frame=document.querySelector('#historical-pdf'),open=document.querySelector('#historical-pdf-link');if(!frame)return;ev.preventDefault();frame.src=a.href;if(open)open.href=a.href;frame.scrollIntoView({behavior:'smooth',block:'nearest'});});el.append(h,p,a);return el;}
function showPage(page,text,hits){
 const field=document.querySelector('#pdf-page-number');if(field)field.value=String(page);const note=document.querySelector('#page-hit-status');if(note)note.textContent=hits.length+' coincidencia(s) en esta página';
 const pdf=source.pdf+'#page='+page,frame=document.querySelector('#historical-pdf'),link=document.querySelector('#historical-pdf-link'),ocr=document.querySelector('#ocr-page');
 if(frame)frame.src=pdf;if(link)link.href=pdf;const current=document.querySelector('#q')?.value.trim()||'';const concept=conceptFor(current);document.dispatchEvent(new CustomEvent('historical-pdf-page',{detail:{page,query:current,roots:concept?.roots||[],prefix:document.querySelector('#mode')?.value==='prefix'}}));if(!ocr)return;
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
   'perrault-1673':{label:'Perrault 1673',url:'https://www.e-rara.ch/zut/content/titleinfo/776185',ocr:false}
 };
 const info=editionInfo[id];if(!info)return;
 if(heading)heading.textContent='Facsímil original · '+info.label;
 if(frame){frame.title='Facsímil '+info.label;frame.src=info.ocr?info.url:'about:blank';frame.hidden=!info.ocr;}
 if(link){link.href=info.url;link.textContent='Abrir facsímil '+info.label+' en la biblioteca de origen ↗';}
 if(pdfjs)pdfjs.hidden=true;
 if(ocr)ocr.replaceChildren();
 if(pageLabel){pageLabel.value=1;pageLabel.disabled=!info.ocr;}
 const go=document.querySelector('#goto-page button');if(go)go.disabled=!info.ocr;
 const note=document.querySelector('#page-hit-status');if(note)note.textContent=info.ocr?'':'Sin índice OCR ni paginación sincronizada';
 return info;
}
document.querySelector('#ed')?.addEventListener('change',()=>{
 selectHistoricalEdition();out.replaceChildren();
 document.querySelector('#page-results')?.replaceChildren();
 status.textContent='Edición cambiada. La búsqueda OCR depende del índice disponible para esta edición.';
});
form.addEventListener('submit',async e=>{
 e.preventDefault();const edition=document.querySelector('#ed')?.value||'krohn-1912';selectHistoricalEdition();
 if(edition==='perrault-1673'){
   const info={ 'perrault-1673':['Perrault (1673)','https://doi.org/10.3931/e-rara-61952'], 'rose-1899':['Rose (1899)','https://archive.org/details/vitruviidearchit00vitr_0']}[edition];
   out.replaceChildren();document.querySelector('#page-results')?.replaceChildren();
   status.textContent='La edición '+info[0]+' todavía no dispone de OCR indexado. No se presentan coincidencias ficticias.';
   const p=document.createElement('p');p.textContent='El facsímil está disponible en la biblioteca de origen. Para búsqueda por palabra y salto automático a páginas primero hay que extraer y verificar su OCR.';out.append(p);
   const link=document.createElement('a');link.href=info[1];link.target='_blank';link.rel='noopener';link.textContent='Abrir facsímil institucional de '+info[0]+' ↗';out.append(link);
   return;
 }
 source=sources[edition];cache=null;
 document.querySelector('.historical-viewer h2').textContent='Facsímil original · '+source.label;
 const q=query.value.trim();if(!q)return;
 out.replaceChildren();document.querySelector('#page-results')?.replaceChildren();status.textContent='Cargando índice histórico…';
 try{
  if(!cache){const r=await fetch(source.index);if(!r.ok)throw Error('Índice no disponible');cache=await r.json();if(!Array.isArray(cache)||!cache.length)throw Error('Índice vacío');}
  await loadDictionary();const concept=conceptFor(q),prefix=document.querySelector('#mode').value==='prefix';activeQuery=q;activePrefix=prefix;
  let total=0,pages=0,shown=0,literal=0;const pageHits=[];
  for(const record of cache){
   if(typeof record.text!=='string')continue;
   let hits=matches(record.text,q,prefix);
   literal+=hits.length;
   if(concept){
    for(const root of concept.roots)hits.push(...matches(record.text,root,true));
    const seen=new Set();hits=hits.filter(m=>{if(seen.has(m.start))return false;seen.add(m.start);return true;}).sort((a,b)=>a.start-b.start);
   }
   if(!hits.length)continue;total+=hits.length;pages++;pageHits.push({page:record.page,text:record.text,hits});
   for(const hit of hits)if(shown<100){const card=result(record.page,record.text,hit,shown);card.querySelector('a')?.addEventListener('click',()=>showPage(record.page,record.text,hits));out.append(card);shown++;}
  }
  const nav=document.querySelector('#page-results');
  if(nav){for(const item of pageHits){const b=document.createElement('button');b.type='button';b.textContent='p. '+item.page+' ('+item.hits.length+')';b.addEventListener('click',()=>showPage(item.page,item.text,item.hits));nav.append(b);}}
  if(pageHits.length)showPage(pageHits[0].page,pageHits[0].text,pageHits[0].hits);
  status.textContent=(concept?'Equivalencias léxicas latinas de «'+q+'» ('+concept.label+'). Apariciones literales de la consulta: '+literal+'. ':'')+total+' coincidencias '+(concept?'latinas relacionadas':'OCR')+' en '+pages+' páginas de '+cache.length+' indexadas.'+(total>shown?' Mostrando las primeras '+shown+'.':'')+' El OCR puede contener errores: corroborar el facsímil.';
  if(!total){const p=document.createElement('p');p.textContent='No se encontraron coincidencias en el OCR disponible; esto no demuestra ausencia en el impreso.';out.append(p);}
 }catch(err){status.textContent='No se pudo consultar esta edición: '+err.message;}
});
document.querySelector('#goto-page')?.addEventListener('submit',async e=>{
 e.preventDefault();const n=Number(document.querySelector('#pdf-page-number').value),note=document.querySelector('#page-hit-status');
 if(!Number.isInteger(n)||n<1||n>(cache?.length||314)){if(note)note.textContent='Ingresá una página entre 1 y 314.';return;}
 try{
  if(!cache){const r=await fetch(source.index);if(!r.ok)throw Error('Índice no disponible');cache=await r.json();}
  const record=cache.find(x=>x.page===n);if(!record)throw Error('Página no indexada');
  await loadDictionary();const concept=conceptFor(activeQuery);
  let hits=activeQuery?matches(record.text,activeQuery,activePrefix):[];
  if(concept){for(const root of concept.roots)hits.push(...matches(record.text,root,true));const seen=new Set();hits=hits.filter(x=>{if(seen.has(x.start))return false;seen.add(x.start);return true;}).sort((a,b)=>a.start-b.start);}
  showPage(n,record.text,hits);
 }catch(err){if(note)note.textContent=err.message;}
});
