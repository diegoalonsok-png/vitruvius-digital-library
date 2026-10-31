const form=document.querySelector('#search'),query=document.querySelector('#q'),status=document.querySelector('#status'),out=document.querySelector('#results');
const source={id:'krohn-1912',index:'data/text/krohn-1912.json',pdf:'documents/krohn-1912.pdf',label:'Krohn (1912)'};
let cache=null;let activeQuery="",activePrefix=false;
const greekConcepts={
 'αρχιτεκτονικη':{label:'arquitectura',roots:['architect']},
 'αρχιτεκτων':{label:'arquitecto',roots:['architect']},
 'συμμετρια':{label:'proporción/simetría',roots:['symmetr']},
 'ευρυθμια':{label:'euritmia',roots:['eurythm']},
 'μηχανη':{label:'máquina',roots:['machin']}
};
const greekFold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ');
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
const word=s=>[...String(s).matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map(m=>({start:m.index,end:m.index+m[0].length,form:fold(m[0])}));
function matches(text,q,prefix){const t=word(text),wanted=word(q).map(x=>x.form);if(!wanted.length)return[];const found=[];for(let i=0;i<=t.length-wanted.length;i++){if(wanted.every((v,j)=>prefix&&wanted.length===1?t[i+j].form.startsWith(v):t[i+j].form===v))found.push({start:t[i].start,end:t[i+wanted.length-1].end});}return found;}
function result(page,text,m,number){const el=document.createElement('article'),h=document.createElement('h2'),p=document.createElement('p'),a=document.createElement('a');h.textContent=source.label+' — página PDF '+page;p.append(document.createTextNode((m.start>100?'…':'')+text.slice(Math.max(0,m.start-100),m.start)));const mark=document.createElement('mark');mark.textContent=text.slice(m.start,m.end);p.append(mark,document.createTextNode(text.slice(m.end,m.end+165)+(m.end+165<text.length?'…':'')));a.href=source.pdf+'#page='+page;a.target='_blank';a.rel='noopener';a.textContent='Ver facsímil · página '+page+' ↗';a.addEventListener('click',ev=>{const frame=document.querySelector('#historical-pdf'),open=document.querySelector('#historical-pdf-link');if(!frame)return;ev.preventDefault();frame.src=a.href;if(open)open.href=a.href;frame.scrollIntoView({behavior:'smooth',block:'nearest'});});el.append(h,p,a);return el;}
function showPage(page,text,hits){
 const field=document.querySelector('#pdf-page-number');if(field)field.value=String(page);const note=document.querySelector('#page-hit-status');if(note)note.textContent=hits.length+' coincidencia(s) en esta página';
 const pdf=source.pdf+'#page='+page,frame=document.querySelector('#historical-pdf'),link=document.querySelector('#historical-pdf-link'),ocr=document.querySelector('#ocr-page');
 if(frame)frame.src=pdf;if(link)link.href=pdf;const current=document.querySelector('#q')?.value.trim()||'';const concept=greekConcepts[greekFold(current)];document.dispatchEvent(new CustomEvent('historical-pdf-page',{detail:{page,query:current,roots:concept?.roots||[],prefix:document.querySelector('#mode')?.value==='prefix'}}));if(!ocr)return;
 ocr.replaceChildren();let offset=0;
 for(const hit of hits){if(hit.start<offset)continue;ocr.append(document.createTextNode(text.slice(offset,hit.start)));const mark=document.createElement('mark');mark.textContent=text.slice(hit.start,hit.end);ocr.append(mark);offset=hit.end;}
 ocr.append(document.createTextNode(text.slice(offset)));
}
form.addEventListener('submit',async e=>{
 e.preventDefault();const q=query.value.trim();if(!q)return;
 out.replaceChildren();document.querySelector('#page-results')?.replaceChildren();status.textContent='Cargando índice histórico…';
 try{
  if(!cache){const r=await fetch(source.index);if(!r.ok)throw Error('Índice no disponible');cache=await r.json();if(!Array.isArray(cache)||!cache.length)throw Error('Índice vacío');}
  const concept=greekConcepts[greekFold(q)],prefix=document.querySelector('#mode').value==='prefix';activeQuery=q;activePrefix=prefix;
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
  status.textContent=(concept?'Equivalencias latinas de «'+q+'» ('+concept.label+'). Apariciones griegas literales: '+literal+'. ':'')+total+' coincidencias '+(concept?'latinas relacionadas':'OCR')+' en '+pages+' páginas de '+cache.length+' indexadas.'+(total>shown?' Mostrando las primeras '+shown+'.':'')+' El OCR puede contener errores: corroborar el facsímil.';
  if(!total){const p=document.createElement('p');p.textContent='No se encontraron coincidencias en el OCR disponible; esto no demuestra ausencia en el impreso.';out.append(p);}
 }catch(err){status.textContent='No se pudo consultar esta edición: '+err.message;}
});
document.querySelector('#goto-page')?.addEventListener('submit',async e=>{
 e.preventDefault();const n=Number(document.querySelector('#pdf-page-number').value),note=document.querySelector('#page-hit-status');
 if(!Number.isInteger(n)||n<1||n>314){if(note)note.textContent='Ingresá una página entre 1 y 314.';return;}
 try{
  if(!cache){const r=await fetch(source.index);if(!r.ok)throw Error('Índice no disponible');cache=await r.json();}
  const record=cache.find(x=>x.page===n);if(!record)throw Error('Página no indexada');
  const concept=greekConcepts[greekFold(activeQuery)];
  let hits=activeQuery?matches(record.text,activeQuery,activePrefix):[];
  if(concept){for(const root of concept.roots)hits.push(...matches(record.text,root,true));const seen=new Set();hits=hits.filter(x=>{if(seen.has(x.start))return false;seen.add(x.start);return true;}).sort((a,b)=>a.start-b.start);}
  showPage(n,record.text,hits);
 }catch(err){if(note)note.textContent=err.message;}
});
