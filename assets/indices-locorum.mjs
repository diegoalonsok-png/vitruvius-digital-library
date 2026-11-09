import {roman,normalize} from './search-core.mjs';
/* Indices locorum de Vitruvio (texto latino V514).
   Index Latinus: por lema (CLTK + Lewis & Short) o por forma gráfica.
   Index Graecus: voces griegas citadas por Vitruvio (glosas LSJ) y equivalencias latinas documentadas.
   Index mathematicus: localizador temático.
   Cada entrada: glosa breve, formas, loci, concordancia en contexto con resaltado y exportación CSV. */
const $=q=>document.querySelector(q);
let corpus=[],mode='latin',grouping='lemma',page=1,perPage=48,selectedLetter='',lexicon=[],latGloss=null,grcGloss=null;
const groups=new Map(),formsOf=new Map(),greekWitnesses=new Map();
const norm=v=>String(v||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i').replace(/ς/g,'σ');
const headword=h=>String(h||'').split(/[\s,]/)[0].replace(/-/g,'');
const GREEK_TOKEN=/[\p{Script=Greek}][\p{Script=Greek}\p{M}]*(?:[’ʼ'](?=[\s,.;:]|$))?/gu;
const LATIN_TOKEN=/[\p{L}]{2,}/gu;
const LATIN_ALPHABET=Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
const GREEK_ALPHABET=Array.from('ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ');
const firstLetter=key=>String(key||'').normalize('NFD').replace(/\p{M}/gu,'').trim().charAt(0).toLocaleUpperCase();

const subjects={
 'Proporción y simetría':['symmetri','proporti','analogi','commensur','rata parte','modul','pro rata'],
 'Geometría y figuras':['geometr','quadr','triangul','circul','diametr','centrum','angul','rotund','figura'],
 'Número y aritmética':['numer','arithmet','calcul','duplic','triplic','multiplic','divid','parti'],
 'Medidas y magnitudes':['mensur','metiend','pedum','pedes','cubitor','longitud','latitud','altitud','crassitud','spatium'],
 'Órdenes y modulación':['column','intercolumn','pycnostyl','systyl','eustyl','diastyl','entasi'],
 'Gnomónica y astronomía':['gnomon','horolog','solstiti','aequinoct','umbra','analemma','astronomi'],
 'Máquinas y mecánica':['machin','rota','vect','trochle','pondus','librament','organ'],
 'Hidráulica y pendientes':['aqua','inclination','libram','chorobat','duct','canal']
};
const tokens=(source,re)=>[...String(source||'').matchAll(re)].map(m=>m[0]);
function push(key,p,form,origin=''){
 if(!groups.has(key))groups.set(key,new Map());groups.get(key).set(p.locus,p);
 if(form){if(!formsOf.has(key))formsOf.set(key,new Map());const f=formsOf.get(key);f.set(form,(f.get(form)||0)+1)}
 if(mode==='greek'&&origin){
  if(!greekWitnesses.has(key))greekWitnesses.set(key,{direct:new Set(),latinLinked:new Set()});
  greekWitnesses.get(key)[origin].add(p.locus);
 }
}
function latinKey(form){
 if(grouping!=='lemma'||!latGloss)return normalize(form);
 const lem=latGloss.forms[norm(form)];
 if(!lem?.length)return normalize(form);
 const L=latGloss.lemmas[lem[0]];return norm(headword(L?.h||lem[0]).replace(/\d+$/,''))||normalize(form);
}
function build(){
 groups.clear();formsOf.clear();greekWitnesses.clear();
 for(const p of corpus){
  if(mode==='latin'){
   for(const form of tokens(p.latin,LATIN_TOKEN)){if(/[\p{Script=Greek}]/u.test(form)||form.length<3&&grouping!=='lemma')continue;push(latinKey(form),p,form.toLowerCase())}
  }else if(mode==='greek'){
   for(const t of tokens(p.latin,GREEK_TOKEN)){if(norm(t).replace(/[^\p{L}]/gu,'').length<2)continue;push(t.normalize('NFC'),p,t.normalize('NFC'),'direct')}
   const latinTokens=new Set(tokens(p.latin,/[\p{L}\p{M}]{2,}/gu).map(norm));
   for(const entry of lexicon){if(!entry.greek||!entry.lemma)continue;if([entry.lemma,...(entry.forms||[])].map(norm).some(l=>latinTokens.has(l)))push(entry.greek,p,null,'latinLinked')}
   const related={'ἀρχιτεκτονική':['architectura','architectus','architecti'],'ἀρχιτέκτων':['architectus','architecti'],'συμμετρία':['symmetria','symmetriae'],'εὐρυθμία':['eurythmia','eurythmiae']};
   for(const [greek,latin] of Object.entries(related))if(latin.some(w=>latinTokens.has(norm(w))))push(greek,p,null,'latinLinked');
  }else{
   const lat=normalize(p.latin||'');for(const [category,stems] of Object.entries(subjects))if(stems.some(t=>lat.includes(normalize(t))))push(category,p,null);
  }
 }
}
/* Glosa breve para el encabezado de la entrada. */
function glossFor(key){
 if(mode==='latin'&&latGloss){
  const lemmaId=Object.keys(latGloss.lemmas).find(l=>norm(headword(latGloss.lemmas[l].h||l).replace(/\d+$/,''))===norm(key))
   ||(latGloss.forms[norm(key)]||[])[0];
  const L=lemmaId&&latGloss.lemmas[lemmaId];if(L)return{head:L.h,gloss:L.g,src:'Lewis & Short'};
 }
 if(mode==='greek'&&grcGloss){
  // El lema politónico procede del léxico, nunca se restaura por conjetura.
  const formKey=Object.keys(grcGloss.forms||{}).find(k=>norm(k)===norm(key));
  const analysis=formKey&&grcGloss.forms[formKey];
  const lemma=analysis?.[0]?.[0]||key;
  const lexeme=grcGloss.lemmas[lemma];
  if(lexeme&&lexeme.g)return{head:lexeme.probable||lemma,gloss:lexeme.g,src:'LSJ'+(lexeme.probable?' · lema probable':'')};
 }
 return null;
}
const es=key=>lexicon.find(e=>[e.lemma,...(e.forms||[]),...(e.aliases||[]),e.greek].filter(Boolean).some(w=>norm(w)===norm(key)));
function line(box,label,value){if(!value)return;const p=document.createElement('p'),s=document.createElement('strong');s.textContent=label+' ';p.append(s,document.createTextNode(value));box.append(p)}
/* Concordancia en contexto (KWIC) de la entrada, con resaltado amarillo. */
function occurrences(entry){
 const forms=formsOf.get(entry.key);const out=[];
 const keys=forms?[...forms.keys()]:[entry.key];
 for(const p of entry.loci){
  const text=String(p.latin||'');
  for(const m of text.matchAll(mode==='greek'?GREEK_TOKEN:/[\p{L}\p{M}]+/gu)){
   const w=m[0].normalize('NFC');
   if(keys.some(k=>norm(k)===norm(w)))out.push({p,at:m.index,len:m[0].length,text});
  }
 }
 return out;
}
function kwic(details,entry){
 const occ=occurrences(entry);if(!occ.length)return;
 const wrap=document.createElement('div');wrap.className='index-kwic';
 const h=document.createElement('p');h.className='index-meta';h.textContent='Concordancia en contexto · '+occ.length+(occ.length===1?' aparición':' apariciones');wrap.append(h);
 const list=document.createElement('ol');let shown=0;
 const add=n=>{for(const o of occ.slice(shown,shown+n)){const li=document.createElement('li');const a=document.createElement('a');a.href='lector-bilingue.html?edition=recensio-es&locus='+encodeURIComponent(o.p.locus)+'&q='+encodeURIComponent(o.text.slice(o.at,o.at+o.len));a.textContent=roman(o.p.book)+'.'+o.p.chapter+'.'+o.p.section;
   const left=o.text.slice(Math.max(0,o.at-70),o.at),right=o.text.slice(o.at+o.len,o.at+o.len+70);
   const l=document.createElement('span');l.className='kwic-l';l.textContent=(o.at>70?'…':'')+left;const m=document.createElement('mark');m.textContent=o.text.slice(o.at,o.at+o.len);const r=document.createElement('span');r.textContent=right+(o.at+o.len+70<o.text.length?'…':'');
   li.append(a,' ',l,m,r);list.append(li)}shown+=n;more.hidden=shown>=occ.length};
 const more=document.createElement('button');more.type='button';more.textContent='Ver más contextos';more.addEventListener('click',()=>add(40));
 wrap.append(list,more);add(12);
 const csv=document.createElement('button');csv.type='button';csv.textContent='Descargar concordancia (CSV)';
 csv.addEventListener('click',()=>{const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const rows=[['entrada','locus','forma','contexto izquierdo','contexto derecho','fuente'],...occ.map(o=>[entry.key,o.p.locus,o.text.slice(o.at,o.at+o.len),o.text.slice(Math.max(0,o.at-90),o.at),o.text.slice(o.at+o.len,o.at+o.len+90),'Vitruvio, De architectura, texto latino V514 (D. Kurilo)'])];
  const blob=new Blob(['﻿'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='concordancia-'+norm(entry.key).replace(/[^\p{L}\p{N}]+/gu,'-')+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)});
 wrap.append(csv);details.append(wrap);
}
function dictionary(card,entry){
 const details=document.createElement('details');details.className='index-dictionary';
 const summary=document.createElement('summary');summary.textContent='Significado y concordancia en el tratado';details.append(summary);
 const e=es(entry.key),g=glossFor(entry.key);
 if(e){line(details,'Lema latino:',e.lemma);line(details,'Griego:',e.greek);line(details,'Gramática:',e.pos);line(details,'Castellano:',e.es);line(details,'English:',e.en);line(details,'Français:',e.fr);for(const s of e.senses||[])line(details,'Sentido:',s);if(e.vitruvian)line(details,'Uso vitruviano:',e.vitruvian);line(details,'Estado:',e.verified?'Definición cotejada con la fuente indicada.':'Equivalencias orientativas: verificar en la fuente lexicográfica.')}
 if(g){line(details,(g.src.startsWith('LSJ')?'Liddell–Scott–Jones':'Lewis & Short')+':',g.head+' — '+g.gloss)}
 if(!e&&!g)line(details,'Nota lexicográfica:','La forma está documentada en el texto, pero no tiene todavía una definición en los léxicos locales. No se infiere un significado a partir de su grafía.');
 details.addEventListener('toggle',()=>{if(details.open&&!details.dataset.kwic){details.dataset.kwic='1';kwic(details,entry)}},{once:false});
 const links=document.createElement('p');links.className='index-links';
 const add=(t,u)=>{const a=document.createElement('a');a.href=u;a.textContent=t;if(/^https?:/.test(u)){a.target='_blank';a.rel='noopener noreferrer'}links.append(a)};
 const lemma=g?headword(g.head).normalize('NFD').replace(/[̄̆]/g,'').normalize('NFC'):entry.key;
 if(e&&mode==='latin')add('Ficha del término →','termino.html?t='+encodeURIComponent(e.lemma));
 add('Logeion ↗','https://logeion.uchicago.edu/'+encodeURIComponent(lemma));
 add('Perseus ↗','https://www.perseus.tufts.edu/hopper/morph?l='+encodeURIComponent(entry.key)+'&la='+(mode==='greek'?'greek':'la'));
 details.append(links);card.append(details);
}
function renderAlphabet(items){
 const root=$('#index-alphabet');if(!root)return;
 const alphabet=mode==='greek'?GREEK_ALPHABET:mode==='latin'?LATIN_ALPHABET:[];
 root.replaceChildren();
 if(mode==='math'){root.hidden=true;selectedLetter='';return}
 root.hidden=false;
 const counts=new Map();
 for(const x of items){const first=firstLetter(x.key);counts.set(first,(counts.get(first)||0)+1)}
 const all=document.createElement('button');
 all.type='button';all.textContent='Todas';all.setAttribute('aria-pressed',String(!selectedLetter));
 all.title='Mostrar todas las letras sin limitar el diccionario';all.addEventListener('click',()=>{selectedLetter='';page=1;render()});root.append(all);
 for(const l of alphabet){
  const b=document.createElement('button');b.type='button';b.textContent=l;
  const n=counts.get(l)||0;b.disabled=!n;b.title=l+': '+n+' entradas';
  b.setAttribute('aria-label',l+': '+n+' entradas');b.setAttribute('aria-pressed',String(selectedLetter===l));
  b.addEventListener('click',()=>{selectedLetter=l;page=1;render()});root.append(b);
 }
}
function renderPager(where,total){
 const root=$(where);if(!root)return;
 root.replaceChildren();
 const pages=Math.ceil(total/perPage);
 if(pages<=1)return;
 page=Math.min(Math.max(page,1),pages);
 const make=(label,p,disabled=false,current=false)=>{
  const b=document.createElement('button');b.type='button';b.textContent=String(label);
  b.disabled=disabled;b.setAttribute('aria-label',typeof label==='number'?'Página '+label:label);
  if(current)b.setAttribute('aria-current','page');
  b.addEventListener('click',()=>{page=p;render();$('#index-alphabet')?.scrollIntoView({block:'start',behavior:'auto'})});
  root.append(b);
 };
 make('← Anterior',page-1,page===1);
 const sequence=new Set([1,pages]);
 for(let p=Math.max(1,page-2);p<=Math.min(pages,page+2);p++)sequence.add(p);
 let last=0;for(const p of [...sequence].sort((a,b)=>a-b)){
  if(last&&p>last+1){const space=document.createElement('span');space.textContent='…';space.setAttribute('aria-hidden','true');root.append(space)}
  make(p,p,false,p===page);last=p;
 }
 make('Siguiente →',page+1,page===pages);
 const totalLabel=document.createElement('span');totalLabel.className='index-pages-total';
 totalLabel.textContent='Página '+page+' de '+pages;root.append(totalLabel);
}
function persistNavigation(){
 try{
  const url=new URL(location.href);
  const params=url.searchParams;
  const query=$('#index-query')?.value.trim()||'';
  if(query)params.set('q',query);else params.delete('q');
  if(mode!=='latin')params.set('index',mode);else params.delete('index');
  if(selectedLetter)params.set('letra',selectedLetter);else params.delete('letra');
  if(page>1)params.set('pagina',String(page));else params.delete('pagina');
  const book=$('#index-book')?.value||'';
  if(book)params.set('libro',book);else params.delete('libro');
  if(mode==='latin'&&grouping==='form')params.set('agrupar','forma');
  else params.delete('agrupar');
  history.replaceState(null,'',url.pathname+url.search+url.hash);
 }catch{/* La navegación permanece operativa incluso en visores sin History API. */}
}
function render(){
 const raw=$('#index-query').value.trim(),q=normalize(raw),qn=norm(raw),book=Number($('#index-book').value)||null;
 const keys=[...groups.keys()].sort((a,b)=>a.localeCompare(b,mode==='greek'?'el':'la'));
 const all=keys.map(k=>({key:k,loci:[...groups.get(k).values()].filter(p=>!book||p.book===book)}))
  .filter(x=>x.loci.length&&(!q||normalize(x.key).includes(q)||norm(x.key).includes(qn)||
   [...(formsOf.get(x.key)?.keys()||[])].some(f=>norm(f).includes(qn))||
   (mode==='math'&&x.loci.some(p=>normalize(p.latin).includes(q)))));
 if(q)all.sort((a,b)=>Number(norm(b.key).startsWith(qn))-Number(norm(a.key).startsWith(qn))||b.loci.length-a.loci.length);
 renderAlphabet(all);
 const valid=selectedLetter&&mode!=='math'?all.filter(x=>firstLetter(x.key)===selectedLetter):all;
 const totalPages=Math.max(1,Math.ceil(valid.length/perPage));page=Math.min(Math.max(page,1),totalPages);
 const root=$('#index-entries');root.replaceChildren();
 for(const entry of valid.slice((page-1)*perPage,page*perPage)){
  const card=document.createElement('article');card.className='index-row';
  const h=document.createElement('h3');h.textContent=entry.key;if(mode==='greek')h.lang='grc';else if(mode==='latin')h.lang='la';card.append(h);
  const g=mode!=='math'&&glossFor(entry.key);
  if(g){const p=document.createElement('p');p.className='index-gloss';p.textContent=g.head+' — '+g.gloss.slice(0,180)+(g.gloss.length>180?'…':'');p.title=g.src;card.append(p)}
  const forms=formsOf.get(entry.key);
  const count=document.createElement('p');count.className='index-meta';
  count.textContent=entry.loci.length+' loci documentados'+(mode==='latin'&&grouping==='lemma'&&forms&&forms.size>1?' · formas: '+[...forms.entries()].sort((a,b)=>b[1]-a[1]).map(([f,n])=>f+' ('+n+')').join(', '):'');
  card.append(count);
  if(mode==='greek'){
   const witnesses=greekWitnesses.get(entry.key);
   const note=document.createElement('p');note.className='index-meta';
   const direct=witnesses?.direct.size||0,related=witnesses?.latinLinked.size||0;
   note.textContent=direct+' loci con grafía griega en la transcripción · '+related+' loci vinculados a términos latinos mediante correspondencia editorial. Los diacríticos del lema solo son lexicográficos; verificar la forma transmitida en el pasaje.';
   card.append(note);
  }
  const locs=document.createElement('div');locs.className='index-loci';
  for(const p of entry.loci.slice(0,45)){const a=document.createElement('a');const firstForm=forms?[...forms.keys()][0]:entry.key;
   a.href='lector-bilingue.html?edition=recensio-es&locus='+encodeURIComponent(p.locus)+'&q='+encodeURIComponent(mode==='math'?raw:firstForm);
   a.textContent=roman(p.book)+'.'+p.chapter+'.'+p.section;a.title='Abrir pasaje '+p.locus;locs.append(a)}
  card.append(locs);
  if(mode!=='math')dictionary(card,entry);
  if(entry.loci.length>45){const d=document.createElement('p');d.className='index-meta';d.textContent='Se muestran 45 loci; filtra por libro para acotar. La concordancia en contexto los incluye todos.';card.append(d)}
  root.append(card);
 }
 const from=valid.length?(page-1)*perPage+1:0,to=Math.min(page*perPage,valid.length);
 $('#index-status').textContent=all.length+' entradas disponibles'+(selectedLetter?' · letra '+selectedLetter+': '+valid.length:'')+' · mostrando '+from+'–'+to+' de '+valid.length+' · '+valid.reduce((n,x)=>n+x.loci.length,0)+' referencias de locus'+(mode==='latin'?(grouping==='lemma'?' · agrupado por lema':' · agrupado por forma gráfica'):'');
 renderPager('#index-pages-top',valid.length);renderPager('#index-pages-bottom',valid.length);
 persistNavigation();
}
function syncGrouping(){const g=$('#index-grouping');if(g)g.closest('label').hidden=mode!=='latin'}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.tab;page=1;selectedLetter='';document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));syncGrouping();build();render()}));
$('#index-query').addEventListener('input',()=>{page=1;selectedLetter='';render()});
$('#index-book').addEventListener('change',()=>{page=1;render()});
$('#index-grouping')?.addEventListener('change',e=>{grouping=e.target.value;page=1;selectedLetter='';build();render()});

const j=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
Promise.all([fetch('data/structured/recensio-es.json').then(r=>{if(!r.ok)throw Error('Índice no disponible');return r.json()}),j('data/latin-lexicon.json'),j('data/classics-lexicon/vitruvius-la.json'),j('data/classics-lexicon/vitruvius-grc.json')])
 .then(([d,lex,lat,grc])=>{
  lexicon=lex?.entries||[];latGloss=lat;grcGloss=grc;
  const u=new URLSearchParams(location.search);
  const requestedMode=u.get('index');
  if(['latin','greek','math'].includes(requestedMode))mode=requestedMode;
  document.querySelectorAll('[data-tab]').forEach(b=>
   b.setAttribute('aria-pressed',String(b.dataset.tab===mode)));
  const group=u.get('agrupar');
  if(!latGloss||group==='forma'){grouping='form';const select=$('#index-grouping');if(select)select.value='form'}
  if(u.get('q'))$('#index-query').value=u.get('q');
  if(/^(?:10|[1-9])$/.test(u.get('libro')||''))$('#index-book').value=u.get('libro');
  const candidate=u.get('letra')?.toLocaleUpperCase()||'';
  if((mode==='greek'?GREEK_ALPHABET:LATIN_ALPHABET).includes(candidate))selectedLetter=candidate;
  const number=Number(u.get('pagina'));page=Number.isSafeInteger(number)&&number>0?number:1;
  corpus=d.passages||[];
  syncGrouping();build();render();
 })
 .catch(err=>{$('#index-status').textContent=err.message});
