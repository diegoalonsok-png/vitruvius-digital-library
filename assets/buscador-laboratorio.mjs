import {normalize,parseLocus,roman,tokens} from './search-core.mjs';
const $=q=>document.querySelector(q);
const ids=['recensio-es','recensio-fr','theory-en'];
const names={'recensio-es':'V514 · Latín / Castellano','recensio-fr':'V554 · Latín / Francés','theory-en':'V297 · Latín / Inglés'};
const cache=new Map();let results=[],shown=0,revision=0;
const norm=x=>normalize(x).replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const plain=x=>String(x||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function corpus(id){if(!cache.has(id))cache.set(id,fetch('data/structured/'+id+'.json').then(r=>{if(!r.ok)throw Error('No se pudo cargar '+id);return r.json()}).catch(e=>{cache.delete(id);throw e}));return cache.get(id);}
function distance(a,b,limit=2){if(Math.abs(a.length-b.length)>limit)return limit+1;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=next;if(Math.min(...prev)>limit)return limit+1;}return prev[b.length];}
function find(p,q,mode,lang,locus){if(locus){const candidate=p.locus.toLowerCase(),ref=[locus.book,locus.chapter,locus.section].filter(x=>x!==undefined);return candidate===ref.join('.')||candidate.startsWith(ref.join('.')+'.')?{score:100,kind:'Locus'}:null;}
const fields=lang==='la'?[p.latin||'']:lang==='translation'?[p.translation||'']:[p.latin||'',p.translation||''];
const query=norm(q);if(!query)return null;let best=null;
for(const content of fields){const text=norm(content);if(text===query||(' '+text+' ').includes(' '+query+' ')){best={score:95,kind:'Coincidencia literal normalizada'};break;}
if(mode==='exact')continue;
const qwords=query.split(' ').filter(Boolean),words=new Set(text.split(' ').filter(Boolean));
if(qwords.every(w=>words.has(w))){best={score:82,kind:'Todas las palabras presentes'};break;}
if(mode!=='flex')continue;
if(qwords.length===1 && query.length>=5){const wordList=[...words];const near=wordList.find(w=>w.startsWith(query)||query.startsWith(w)&&w.length>=5);if(near){best={score:66,kind:'Variante o raíz gráfica',matched:near};break;}
const maxDist=query.length>9?2:1;const similar=wordList.find(w=>Math.abs(w.length-query.length)<=maxDist&&distance(w,query,maxDist)<=maxDist);
if(similar){best={score:48,kind:'Grafía aproximada',matched:similar};break;}}
if(qwords.length>1&&qwords.filter(w=>words.has(w)).length>=Math.max(2,Math.ceil(qwords.length*.8)))best={score:42,kind:'Coincidencia parcial de términos'};}
return best;}
function excerpt(value,q){const text=String(value||'');if(!text)return '';const normalized=plain(text),target=plain(q);let index=normalized.indexOf(target);if(index<0)index=0;const start=Math.max(0,index-110);return (start?'…':'')+text.slice(start,start+520)+(start+520<text.length?'…':'');}
function render(){
 const root=$('#lab-results'),reading=$('#lab-scope').value;
 for(const r of results.slice(shown,shown+20)){
  const p=r.p,article=document.createElement('article');
  const title=document.createElement('h2');title.textContent='Vitr., De arch. '+roman(p.book)+'.'+p.chapter+'.'+p.section;article.append(title);
  const meta=document.createElement('p');meta.className='meta';meta.textContent='Coincidencia en '+r.sources.join(', ')+' · '+r.kind+(r.matched?' ('+r.matched+')':'');article.append(meta);
  const grid=document.createElement('div');grid.className='lab-parallel';
  const edition=r.editions[reading],latin=r.editions['recensio-es']?.latin||edition?.latin||p.latin;
  for(const [heading,value,lang] of [['Texto latino',latin,'la'],[names[reading],edition?.translation,reading==='recensio-es'?'es':reading==='recensio-fr'?'fr':'en']]){
   const panel=document.createElement('section'),h=document.createElement('h3'),para=document.createElement('p');h.textContent=heading;para.lang=lang;
   para.textContent=value||'No hay traducción alineada para este locus en esta edición.';if(!value)para.className='missing';
   panel.append(h,para);grid.append(panel);
  }
  article.append(grid);
  const actions=document.createElement('div');actions.className='actions';
  const a=document.createElement('a');a.href='lector-bilingue.html?edition='+encodeURIComponent(reading)+'&locus='+encodeURIComponent(p.locus)+'&q='+encodeURIComponent($('#lab-query').value);a.textContent='Leer en visor →';actions.append(a);
  const cmp=document.createElement('a');cmp.href='comparador-loci.html?locus='+encodeURIComponent(p.locus);cmp.textContent='Comparar traducciones →';actions.append(cmp);article.append(actions);root.append(article);
 }
 shown=Math.min(results.length,shown+20);$('#lab-more').hidden=shown>=results.length;$('#lab-more').textContent='Mostrar más ('+shown+' de '+results.length+')';
}
async function run(){
 const id=++revision,q=$('#lab-query').value.trim(),mode=$('#lab-mode').value,book=$('#lab-book').value,reading=$('#lab-scope').value;
 if(!q)return;$('#lab-results').replaceChildren();$('#lab-more').hidden=true;$('#lab-status').textContent='Buscando en latín, castellano, francés e inglés…';
 try{
  const data=await Promise.all(ids.map(async eid=>({eid,data:await corpus(eid)})));if(id!==revision)return;
  const byLocus=new Map(),locus=parseLocus(q);
  for(const {eid,data:d} of data)for(const p of d.passages||[]){
   if(book&&Number(p.book)!==Number(book))continue;
   const match=find(p,q,mode,'both',locus),key=p.locus;
   if(!byLocus.has(key))byLocus.set(key,{p,editions:{},sources:[],score:0,kind:'',matched:''});
   const record=byLocus.get(key);record.editions[eid]=p;
   if(match){record.sources.push(names[eid]);if(match.score>record.score){record.score=match.score;record.kind=match.kind;record.matched=match.matched||'';}}
  }
  results=[...byLocus.values()].filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.p.book-b.p.book||String(a.p.chapter).localeCompare(String(b.p.chapter),undefined,{numeric:true})||a.p.section-b.p.section);
  shown=0;$('#lab-load').textContent='Consulta cruzada entre V514, V554 y V297. Idioma de lectura: '+names[reading];
  $('#lab-status').textContent=results.length+' loci encontrados en el corpus multilingüe. Las coincidencias aproximadas requieren comprobación.';render();
 }catch(e){if(id!==revision)return;$('#lab-status').textContent='Error de carga: '+e.message;}
}
$('#lab-form').addEventListener('submit',e=>{e.preventDefault();run();});$('#lab-more').addEventListener('click',render);$('#lab-scope').addEventListener('change',()=>{if(results.length){shown=0;$('#lab-results').replaceChildren();render();}});document.querySelectorAll('[data-test]').forEach(b=>b.addEventListener('click',()=>{$('#lab-query').value=b.dataset.test;run();}));