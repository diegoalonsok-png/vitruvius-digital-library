const form=document.querySelector('#search'),query=document.querySelector('#q'),status=document.querySelector('#status'),out=document.querySelector('#results');
const source={id:'krohn-1912',index:'data/text/krohn-1912.json',pdf:'documents/krohn-1912.pdf',label:'Krohn (1912)'};
let cache=null;
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
form.addEventListener('submit',async e=>{
 e.preventDefault();const q=query.value.trim();if(!q)return;
 out.replaceChildren();status.textContent='Cargando índice histórico…';
 try{
  if(!cache){const r=await fetch(source.index);if(!r.ok)throw Error('Índice no disponible');cache=await r.json();if(!Array.isArray(cache)||!cache.length)throw Error('Índice vacío');}
  const concept=greekConcepts[greekFold(q)],prefix=document.querySelector('#mode').value==='prefix';
  let total=0,pages=0,shown=0,literal=0;
  for(const record of cache){
   if(typeof record.text!=='string')continue;
   let hits=matches(record.text,q,prefix);
   literal+=hits.length;
   if(concept){
    for(const root of concept.roots)hits.push(...matches(record.text,root,true));
    const seen=new Set();hits=hits.filter(m=>{if(seen.has(m.start))return false;seen.add(m.start);return true;}).sort((a,b)=>a.start-b.start);
   }
   if(!hits.length)continue;total+=hits.length;pages++;
   for(const hit of hits)if(shown<100){out.append(result(record.page,record.text,hit,shown));shown++;}
  }
  status.textContent=(concept?'Equivalencias latinas de «'+q+'» ('+concept.label+'). Apariciones griegas literales: '+literal+'. ':'')+total+' coincidencias '+(concept?'latinas relacionadas':'OCR')+' en '+pages+' páginas de '+cache.length+' indexadas.'+(total>shown?' Mostrando las primeras '+shown+'.':'')+' El OCR puede contener errores: corroborar el facsímil.';
  if(!total){const p=document.createElement('p');p.textContent='No se encontraron coincidencias en el OCR disponible; esto no demuestra ausencia en el impreso.';out.append(p);}
 }catch(err){status.textContent='No se pudo consultar esta edición: '+err.message;}
});