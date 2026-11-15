import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ids=['rose-1899','krohn-1912'];
const expected={'rose-1899':257,'krohn-1912':224};
const manifests=Object.fromEntries(ids.map(id=>[id,JSON.parse(read('data/r2/folios/'+id+'.json'))]));
const navigation=Object.fromEntries(ids.map(id=>[id,JSON.parse(read('data/r2/folios/'+id+'-loci.json'))]));
const corpus=JSON.parse(read('data/structured/recensio-es.json')).passages;
const pause=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve))};

async function boot(origin,mode='normal'){
 const dom=new JSDOM(read('colacion.html'),{url:origin+'/colacion.html?locus=9.1.16',runScripts:'outside-only'});
 const w=dom.window,requests=[];w.AbortSignal=AbortSignal;
 w.KuriloApparatus={
  forLocus:async()=>[{version:'V514',kind:'note',page:828,text:'Nota editorial del pasaje IX.1.16.'}],
  kindLabel:kind=>kind,
  relationLabel:()=>'',
  excerpt(text){assert.equal(typeof text,'string','Apparatus excerpts must receive text, not the entry object');return text}
 };
 w.fetch=async url=>{
  const path=String(url).split('?')[0];requests.push(path);
  const edition=ids.find(id=>path.includes(id));let value=null;
  if(edition&&path.endsWith(edition+'.json')){
   if(mode!=='remote'&&mode!=='missing')value=manifests[edition];
   if(mode==='wrong')value={...value,obra:'wrong-edition'};
  }else if(edition&&path.endsWith('/indice-folios.json')){
   if(mode==='remote')value=manifests[edition];
  }else if(edition&&(path.endsWith('-loci.json')||path.endsWith('/loci.json'))){
   value=mode==='no-loci'?{loci:{}}:navigation[edition];
  }else if(!path.startsWith('https:')){
   try{value=JSON.parse(read(path))}catch{}
  }
  return {ok:value!==null,status:value===null?404:200,json:async()=>value};
 };
 for(const path of ['assets/collation-page.js','assets/collation-facsimile-readers.js','assets/collation-parallel-readers.js'])w.eval(read(path));
 await pause();return {dom,w,requests,card:id=>w.document.querySelector('[data-edition="'+id+'"]')};
}

for(const origin of ['https://vitruvius-digital-library.org','https://diegoalonsok-png.github.io/vitruvius-digital-library']){
 const {dom,w,requests,card}=await boot(origin);
 assert.equal(w.document.querySelector('#coll-locus').value,'IX.1.16');
 assert.ok(!w.document.body.textContent.includes('[object Object]'));
 assert.match(w.document.querySelector('#coll-body').textContent,/Nota editorial del pasaje/);
 for(const id of ids){
  const c=card(id),n=expected[id],img=c.querySelector('.coll-facsimile-frame img'),page=c.querySelector('input[type=number]');
  assert.equal(img.getAttribute('src'),manifests[id].folios[n-1].imagen);
  assert.equal(page.value,String(n));
  assert.equal(c.querySelector('details').open,false,'Raw OCR must remain an optional finding aid');
  assert.equal(c.querySelector('iframe').hasAttribute('src'),false,'Do not load an external book embed or the entire PDF by default');
  assert.ok(c.querySelector('.coll-parallel-content').textContent.includes('Que unas estrellas'));
  assert.ok(!c.querySelector('.coll-parallel-note').textContent.includes('no está sincronizado'));
  assert.match(c.querySelector('.coll-facsimile-status').textContent,/imagen digital/i);
  const [previous,next,go,zoom]=c.querySelectorAll(':scope > .coll-facsimile-controls button');
  next.click();assert.equal(page.value,String(n+1));
  assert.match(c.querySelector('.coll-facsimile-status').textContent,/navegación manual/);
  assert.equal(w.document.querySelector('#coll-locus').value,'IX.1.16','Manual pages must not invent a new aligned translation');
  const pdf=c.querySelector('a');assert.match(pdf.href,new RegExp('/folios/'+id+'/source.pdf#page='+(n+1)));
  zoom.click();assert.equal(img.style.width,'180%');zoom.click();assert.equal(img.style.width,'100%');
  page.value='99999';go.click();assert.equal(page.value,String(manifests[id].imagenes));assert.equal(next.disabled,true);
  page.value='0';page.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(page.value,'1');assert.equal(previous.disabled,true);
  // A failed page image opens the preserved PDF at the same digital page.
  img.dispatchEvent(new w.Event('error'));
  assert.equal(c.querySelector('iframe').hidden,false);
  assert.match(c.querySelector('iframe').src,/source\.pdf#page=1&view=FitH$/);
 }
 assert.ok(!requests.some(path=>path.includes('archive.org')));
 // Real loci from multiple books, including a preface, drive both facsimiles.
 for(const locus of ['1.2.3','3.1.1','5.praef.1','10.16.12']){
  const input=w.document.querySelector('#coll-locus');input.value=locus;
  w.document.querySelector('#coll-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pause();
  for(const id of ids){
   assert.equal(card(id).querySelector('input[type=number]').value,String(navigation[id].loci[locus].page));
   assert.equal(new URL(card(id).querySelectorAll('a')[1].href).searchParams.get('locus'),locus);
  }
 }
 // Optional historical text search navigates to a genuine locus in both readers.
 const rose=card('rose-1899');rose.querySelector('input[type=search]').value='symmetria';
 rose.querySelector('details button').click();
 const result=rose.querySelector('.coll-facsimile-results button');assert.ok(result);result.click();await pause();
 const found=new URL(w.location.href).searchParams.get('locus');assert.ok(corpus.some(p=>p.locus===found));
 for(const id of ids)assert.equal(card(id).querySelector('input[type=number]').value,String(navigation[id].loci[found].page));
 dom.window.close();
}

for(const mode of ['remote','missing','wrong','no-loci']){
 const {dom,requests,card}=await boot('https://vitruvius-digital-library.org',mode);
 for(const id of ids){
  const c=card(id);
  if(mode==='remote'){
   assert.equal(c.querySelector('input[type=number]').value,String(expected[id]));
   assert.ok(requests.includes('https://libros.vitruvius-digital-library.org/folios/'+id+'/indice-folios.json'));
  }else if(mode==='no-loci'){
   assert.match(c.querySelector('.coll-facsimile-status').textContent,/sin correspondencia/);
   assert.equal(c.querySelector('input[type=number]').value,'1');
  }else{
   assert.equal(c.querySelector('img').hasAttribute('src'),false,'Reject a missing or mismatched scan index');
   assert.match(c.querySelector('iframe').src,new RegExp('/folios/'+id+'/source.pdf$'));
   assert.match(c.querySelector('.coll-facsimile-status').textContent,/Índice de imágenes no disponible/);
  }
 }
 dom.window.close();
}
console.log('PASS Colación: preserved Rose/Krohn scans, IX.1.16, multi-book loci, search, translations, manual pages, zoom, PDF/manifest fallbacks and both hosting paths.');
