/* Batterie de pruebas integrada de índices; únicamente lectura.
   Ejecuta el código real de indices-locorum.mjs sobre corpus y léxicos reales. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const data=p=>JSON.parse(read(p));
const corpus=data('data/structured/recensio-es.json');
const latin=data('data/classics-lexicon/vitruvius-la.json');
const greek=data('data/classics-lexicon/vitruvius-grc.json');
const lexicon=data('data/latin-lexicon.json');
const source=read('assets/indices-locorum.mjs').replace(/^import[^\n]*\n/,'');
new vm.Script(source,{filename:'assets/indices-locorum.mjs'});
const expected=[
 ['architectura','latin'],['symmetria','latin'],['proportio','latin'],
 ['columna','latin'],['templum','latin'],['domus','latin'],['aqua','latin'],
 ['machina','latin'],['materia','latin'],['ratio','latin'],['modulus','latin'],
 ['fundamentum','latin'],['caementum','latin'],['diametros','latin'],['circino','latin'],
 ['ἠχεῖα','greek'],['λόγος','greek'],['τάξις','greek'],['οἰκονομία','greek'],['κλίματα','greek']
];
class Node{
 constructor(tag='div'){this.tag=tag;this.children=[];this.handlers={};this.attrs={};
  this.dataset={};this.value='';this.textContent='';this.hidden=false;this.className='';this.style={};this.open=false;}
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=[...items]}
 addEventListener(event,callback){this.handlers[event]=callback}
 setAttribute(k,v){this.attrs[k]=String(v)}
 getAttribute(k){return this.attrs[k]}
 closest(){return this}
 scrollIntoView(){}
 click(){this.handlers.click?.({target:this})}
 toggle(){this.open=true;this.handlers.toggle?.()}
}
const ids=['#index-query','#index-book','#index-grouping','#index-status','#index-entries',
 '#index-alphabet','#index-pages-top','#index-pages-bottom','#index-greek-policy'];
const fields=Object.fromEntries(ids.map(id=>[id,new Node()]));
const tabs=['latin','greek','math'].map(lang=>{const b=new Node('button');b.dataset.tab=lang;return b;});
const document={querySelector:q=>fields[q]||null,querySelectorAll:q=>q==='[data-tab]'?tabs:[],
 createElement:t=>new Node(t),createTextNode:s=>({tag:'#text',textContent:s})};
const url=new URL('https://vitruvius.test/indices-locorum.html');
const location={href:url.href,search:url.search};
const history={replaceState(_state,_title,relative){const u=new URL(relative,'https://vitruvius.test');
 location.href=u.href;location.search=u.search;}};
const datasets={
 'data/structured/recensio-es.json':corpus,'data/latin-lexicon.json':lexicon,
 'data/classics-lexicon/vitruvius-la.json':latin,
 'data/classics-lexicon/vitruvius-grc.json':greek
};
const fetch=async address=>({ok:Boolean(datasets[address]),status:datasets[address]?200:404,json:async()=>datasets[address]});
const normalize=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'')
 .replace(/æ/gi,'ae').replace(/œ/gi,'oe').replace(/ſ/g,'s')
 .toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
const roman=n=>['','I','II','III','IV','V','VI','VII','VIII','IX','X'][n]||String(n);
const context=vm.createContext({document,fetch,history,location,roman,normalize,
 URL,URLSearchParams,encodeURIComponent,console,Intl,Promise});
vm.runInContext(source,context,{filename:'assets/indices-locorum.mjs'});
for(let i=0;i<80;i++)await Promise.resolve();
assert.equal(corpus.passages.length,731,'El corpus V514 esperado tiene 731 pasajes');
const locusMap=new Map(corpus.passages.map(p=>[p.locus,p]));
const tokens=p=>[...String(p?.latin||'').matchAll(/[\p{L}\p{M}]+/gu)].map(m=>m[0]);
let actualMode='latin',linkCount=0,verifiedExact=0,checks=0,extensions=0;
const failures=[],rows=[];
function search(word,mode){
 if(actualMode!==mode){tabs[mode==='greek'?1:0].click();actualMode=mode}
 fields['#index-query'].value=word;fields['#index-query'].handlers.input();
 const cards=fields['#index-entries'].children,linked=[];
 for(const card of cards){
  const extra=card.children.filter(x=>x?.className==='index-loci-extra');
  for(const item of extra){item.toggle();extensions++;}
  const boxes=card.children.filter(x=>x?.className==='index-loci')
   .concat(extra.flatMap(x=>x.children.filter(y=>y.className==='index-loci')));
  for(const box of boxes)for(const a of box.children){
   const parsed=new URL(a.href,'https://vitruvius.test/');
   const locus=parsed.searchParams.get('locus'),highlight=parsed.searchParams.get('q');
   const p=locusMap.get(locus);
   const ok=p&&tokens(p).some(t=>normalize(t)===normalize(highlight));
   if(!ok)failures.push({word,locus,highlight,reason:'resaltado inexistente o locus ausente'});
   linked.push(locus);linkCount++;
  }
 }
 const exact=corpus.passages.filter(p=>tokens(p).some(t=>normalize(t)===normalize(word))).map(p=>p.locus);
 const visible=new Set(linked);
 const missing=exact.filter(l=>!visible.has(l));
 for(const locus of missing)failures.push({word,locus,reason:'atestación real omitida'});
 if(!cards.length||!exact.length)failures.push({word,reason:'palabra atestiguada sin ficha'});
 verifiedExact+=exact.length;checks++;
 rows.push({word,mode,attested:exact.length,links:linked.length,missing:missing.length});
}
for(const [word,mode] of expected)search(word,mode);
assert.equal(rows.length,20);
const greekUnaccented=['ηχεια','λογος','ταξις','οικονομια','κλιματα'];
for(const word of greekUnaccented){
 fields['#index-query'].value=word;fields['#index-query'].handlers.input();
 if(!fields['#index-entries'].children.length)
  failures.push({word,reason:'búsqueda griega sin diacríticos sin resultados'});
 checks++;
}
const termsByBook=new Map();
for(const p of corpus.passages){
 if(!termsByBook.has(p.book))termsByBook.set(p.book,new Set());
 const bag=termsByBook.get(p.book);
 for(const t of tokens(p)){
  if(/^[a-z]{6,18}$/i.test(t)&&bag.size<7)bag.add(t.toLowerCase());
 }
}
for(const [book,bag] of [...termsByBook].sort((a,b)=>a[0]-b[0])){
 if(bag.size<3)failures.push({book,reason:'muy pocos términos para muestra por libro'});
 for(const w of bag)search(w,'latin');
}
const targetPages=['index.html','vitruvia.html','vitruvia-lexicon.html','bibliotheca-graeca-latina.html','indices-locorum.html'];
for(const page of targetPages)assert(fs.existsSync(page),'Página central no disponible: '+page);
const all=fields['#index-alphabet'].children.map(x=>x.textContent);
assert(all.includes('A')&&all.includes('Z'),'Abecedario latino A-Z no aparece');
assert(linkCount>=900,'La batería debe revisar suficientes enlaces reales: '+linkCount);
const report={schema:'vitruvius-indices-locorum-multiword-v1',
 sourcePassages:corpus.passages.length,queriedTerms:checks,original20Terms:rows.slice(0,20),
 exactLocusAttestationsChecked:verifiedExact,locusLinksChecked:linkCount,
 extraLocusPanelsOpened:extensions,unaccentedGreekQueries:greekUnaccented.length,failures};
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/indices-locorum-battery.json',JSON.stringify(report,null,2)+'\n','utf8');
console.log('INDICES LOCORUM: '+checks+' consultas, '+verifiedExact+' atestaciones, '+
 linkCount+' enlaces, '+extensions+' paneles de loci adicionales, '+failures.length+' errores.');
for(const f of failures.slice(0,25))console.error('FAIL',JSON.stringify(f));
if(failures.length)process.exitCode=1;
