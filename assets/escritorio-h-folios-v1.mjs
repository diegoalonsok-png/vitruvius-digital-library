const manifest='https://bl.digirati.io/iiif/ark:/81055/vdc_100056038850.0x000001';const el=id=>document.getElementById(id);
const show=(msg)=>el('folio-index-status').textContent=msg;
function folioLabel(c){const v=c.label;if(typeof v==='string')return v;if(v&&typeof v==='object'){for(const a of Object.values(v)){if(Array.isArray(a)&&a.length)return a.join(' · ')}}return 'Sin etiqueta'}
function go(n){const frame=document.querySelector('iframe.reader');try{const doc=frame.contentDocument;const input=doc?.getElementById('page');if(!input)throw Error('el visor aún no cargó');input.value=String(n);input.dispatchEvent(new Event('change',{bubbles:true}));frame.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(e){show('No se pudo sincronizar el visor: '+e.message)}}
async function load(){const out=el('folio-index-table');out.replaceChildren();show('Consultando el manifiesto oficial de la British Library…');try{const r=await fetch(manifest);if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();const pages=data.items||data.sequences?.[0]?.canvases;if(!Array.isArray(pages)||!pages.length)throw Error('Sin imágenes');const labels=pages.map(folioLabel);window.__hFolioLabels=labels;let unlabeled=0;const freq=new Map();for(let i=0;i<labels.length;i++){const v=labels[i];if(v==='Sin etiqueta')unlabeled++;if(/^f(s)?\.?\s*\d+[rv]$/i.test(v))freq.set(v,(freq.get(v)||0)+1)}const duplicates=[...freq.entries()].filter(([,n])=>n>1);const limit=pages.length;const sel=el('folio-number');sel.max=String(limit);sel.value='1';out.innerHTML='';const frag=document.createDocumentFragment();pages.forEach((p,i)=>{const opt=document.createElement('option');opt.value=String(i+1);opt.textContent=String(i+1).padStart(3,'0')+' — '+labels[i];frag.append(opt)});out.append(frag);el('folio-choose').onclick=()=>go(Number(out.value));el('folio-number').onchange=()=>{const n=Number(el('folio-number').value);if(n>=1&&n<=limit){out.value=String(n);go(n)}};out.onchange=()=>{el('folio-number').value=out.value;go(Number(out.value))};const find=el('folio-search');if(find)find.onchange=()=>{const query=find.value.toLowerCase().replace(/[^a-z0-9]/g,'');const idx=labels.findIndex(v=>v.toLowerCase().replace(/[^a-z0-9]/g,'')===query);if(idx<0){show('Etiqueta '+find.value+' no identificada en el manifiesto IIIF.');return}out.value=String(idx+1);el('folio-number').value=String(idx+1);go(idx+1);show('Etiqueta '+labels[idx]+' · imagen '+(idx+1)+' del manifiesto oficial.')};const actual=new Set(labels.map(x=>x.toLowerCase().replace(/\s/g,'').replace(/^fs?\./,'f.')));
const missing=[];for(let n=1;n<=162;n++)for(const side of ['r','v']){const tag='f.'+n+side;if(!actual.has(tag))missing.push(tag)}
const result=document.getElementById('folio-integrity');result.replaceChildren();
const heading=document.createElement('h3');heading.textContent='Control de integridad del índice IIIF';result.append(heading);
const p=document.createElement('p');p.textContent=limit+' imágenes en secuencia oficial. Etiquetas no halladas en la serie teórica 1r–162v: '+missing.length+'. Etiquetas duplicadas: '+duplicates.length+'. Imágenes fuera de esa serie: '+labels.filter(x=>!/^f\\.?\\s*\\d+[rv]$/i.test(x)).length+'.';result.append(p);
if(missing.length){const q=document.createElement('p');q.textContent='Etiquetas ausentes: '+missing.join(', ')+'. No necesariamente son imágenes perdidas: pueden ser lagunas materiales, variantes de foliación o etiquetas distintas.';result.append(q)}
const note=document.createElement('p');note.textContent='La British Library registra dos hojas antiguamente vinculadas a H, actualmente en Bodleian Library, Rawlinson MS D. 893, ff. 135–136. No deben confundirse con imágenes omitidas del servidor.';result.append(note);
show(limit+' imágenes del manifiesto oficial cargadas, en orden de digitalización. Selecciona una imagen o folio para abrirlo.');}catch(e){show('No se pudo cargar el índice: '+e.message)}}
el('load-folio-index').onclick=load;

const confirmed={1:{position:9,folio:'f.1r'}};
const chosen=document.getElementById('codex-book');
const bookStatus=document.getElementById('codex-book-status');
document.getElementById('codex-book-go').addEventListener('click',()=>{
 const b=Number(chosen.value),entry=confirmed[b];
 if(entry){go(entry.position);document.getElementById('folio-number').value=entry.position;bookStatus.textContent='Libro I · imagen 9 · f.1r: incipit documentado.'}
 else{bookStatus.textContent='Libro '+b+': inicio pendiente de identificación paleográfica. La secuencia oficial puede recorrerse con el índice de imágenes; no se inventa una ubicación.'}
});

function openCodexPreface(book){
 const n=Number(book),entry=confirmed[n],status=document.getElementById('codex-preface-status');
 if(!entry){status.textContent='Libro '+n+': ubicación del prefacio todavía sin cotejar en H. No se muestra un folio ficticio.';return}
 const select=document.getElementById('codex-preface');if(select)select.value=String(n);
 const index=document.getElementById('folio-index-table');if(index?.options.length>1)index.value=String(entry.position);
 const number=document.getElementById('folio-number');if(number)number.value=String(entry.position);
 go(entry.position);
 status.textContent='Libro '+n+': inicio indicado en '+entry.folio+', imagen '+entry.position+'. Comprobar el incipit en el facsímil.';
}
document.getElementById('codex-preface-open')?.addEventListener('click',()=>openCodexPreface(document.getElementById('codex-preface').value));
document.getElementById('codex-preface')?.addEventListener('change',e=>openCodexPreface(e.target.value));
document.addEventListener('escritorio-h-preface',e=>openCodexPreface(e.detail.book));

const exportButton=el('folio-export');if(exportButton)exportButton.addEventListener('click',()=>{const labels=window.__hFolioLabels;if(!labels?.length){show('Primero carga el índice oficial IIIF.');return}const csv='imagen_digital,etiqueta_iiif,estado_cotejo\\n'+labels.map((label,i)=>[i+1,'"'+label.replaceAll('"','""')+'"','pendiente'].join(',')).join('\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='Harley_2767_indice_IIIF_para_cotejo.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)});
