const manifest='https://bl.digirati.io/iiif/ark:/81055/vdc_100056038850.0x000001';const el=id=>document.getElementById(id);
const show=(msg)=>el('folio-index-status').textContent=msg;
function folioLabel(c){const v=c.label;if(typeof v==='string')return v;if(v&&typeof v==='object'){for(const a of Object.values(v)){if(Array.isArray(a)&&a.length)return a.join(' · ')}}return 'Sin etiqueta'}
function go(n){const frame=document.querySelector('iframe.reader');try{const doc=frame.contentDocument;const input=doc?.getElementById('page');if(!input)throw Error('el visor aún no cargó');input.value=String(n);input.dispatchEvent(new Event('change',{bubbles:true}));frame.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(e){show('No se pudo sincronizar el visor: '+e.message)}}
async function load(){const out=el('folio-index-table');out.replaceChildren();show('Consultando el manifiesto oficial de la British Library…');try{const r=await fetch(manifest);if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();const pages=data.items||data.sequences?.[0]?.canvases;if(!Array.isArray(pages)||!pages.length)throw Error('Sin imágenes');const labels=pages.map(folioLabel);let unlabeled=0;const freq=new Map();for(let i=0;i<labels.length;i++){const v=labels[i];if(v==='Sin etiqueta')unlabeled++;if(/^f(s)?\.?\s*\d+[rv]$/i.test(v))freq.set(v,(freq.get(v)||0)+1)}const duplicates=[...freq.entries()].filter(([,n])=>n>1);const limit=pages.length;const sel=el('folio-number');sel.max=String(limit);sel.value='1';out.innerHTML='';const frag=document.createDocumentFragment();pages.forEach((p,i)=>{const opt=document.createElement('option');opt.value=String(i+1);opt.textContent=String(i+1).padStart(3,'0')+' — '+labels[i];frag.append(opt)});out.append(frag);el('folio-choose').onclick=()=>go(Number(out.value));el('folio-number').onchange=()=>{const n=Number(el('folio-number').value);if(n>=1&&n<=limit){out.value=String(n);go(n)}};out.onchange=()=>{el('folio-number').value=out.value;go(Number(out.value))};const actual=new Set(labels.map(x=>x.toLowerCase().replace(/\s/g,'')));
const missing=[];for(let n=1;n<=162;n++)for(const side of ['r','v']){const tag='f.'+n+side;if(!actual.has(tag))missing.push(tag)}
const result=document.getElementById('folio-integrity');result.replaceChildren();
const heading=document.createElement('h3');heading.textContent='Control de integridad del índice IIIF';result.append(heading);
const p=document.createElement('p');p.textContent=limit+' imágenes en secuencia oficial. Etiquetas de folio ausentes de la lista 1r–162v: '+missing.length+'. Etiquetas duplicadas: '+duplicates.length+'. Otras imágenes (cubiertas, guardas, preliminares): '+(limit-(324-missing.length))+'.';result.append(p);
if(missing.length){const q=document.createElement('p');q.textContent='Etiquetas ausentes: '+missing.join(', ')+'. No necesariamente son imágenes perdidas: pueden ser lagunas materiales, variantes de foliación o etiquetas distintas.';result.append(q)}
const note=document.createElement('p');note.textContent='La British Library registra dos hojas antiguamente vinculadas a H, actualmente en Bodleian Library, Rawlinson MS D. 893, ff. 135–136. No deben confundirse con imágenes omitidas del servidor.';result.append(note);
show(limit+' imágenes del manifiesto oficial cargadas, en orden de digitalización. Seleccioná una imagen o folio para abrirlo.');}catch(e){show('No se pudo cargar el índice: '+e.message)}}
el('load-folio-index').onclick=load;

const confirmed={1:{position:9,folio:'f.1r'}};
const chosen=document.getElementById('codex-book');
const bookStatus=document.getElementById('codex-book-status');
document.getElementById('codex-book-go').addEventListener('click',()=>{
 const b=Number(chosen.value),entry=confirmed[b];
 if(entry){go(entry.position);document.getElementById('folio-number').value=entry.position;bookStatus.textContent='Libro I · imagen 9 · f.1r: incipit documentado.'}
 else{bookStatus.textContent='Libro '+b+': inicio pendiente de identificación paleográfica. La secuencia oficial puede recorrerse con el índice de imágenes; no se inventa una ubicación.'}
});
