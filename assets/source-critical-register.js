/* Source-derived critical apparatus. Published editorial reports, printed-page
 * checks and manuscript autopsy are deliberately different evidence classes. */
(()=>{'use strict';
const host=document.getElementById('source-critical-register');if(!host)return;
const $=id=>document.getElementById(id),E=(tag,value,cls)=>{const e=document.createElement(tag);if(value!=null)e.textContent=value;if(cls)e.className=cls;return e;};
const ROM=['','I','II','III','IV','V','VI','VII','VIII','IX','X'];
const fmt=l=>String(l).replace(/^(\d+)\./,(_,n)=>(ROM[+n]||n)+'.');
let manifest=null,checks={entries:[]},current=new URLSearchParams(location.search).get('locus')||'1.1.1',bookData=null,loadedBook=0,serial=0,shown=30;
const cache=new Map();
async function get(url){const r=await fetch(url);if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
function addSource(parent,label,url){const a=E('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);}
function draw(){
 if(!manifest||!bookData)return;
 host.hidden=document.getElementById('mode')?.value==='v514';
 const comparison=$('source-critical-comparison');comparison.replaceChildren();
 for(const item of checks.comparisons||[])if(item.locus===current){
  comparison.append(E('h3','Comparación cotejada · '+fmt(current)),E('p',item.criticalLine,'ab-critical-reading'),E('p',item.evidence,'ab-meta'));
  if(item.errataUrl)addSource(comparison,'Corrección del comentario de V297',item.errataUrl);
 }
 const range=$('source-critical-range').value,query=$('source-critical-query').value.trim().toLocaleLowerCase();
 const level=$('source-critical-evidence').value,verified=new Map(checks.entries.filter(x=>x.source==='Rose1899'&&x.status==='checked_against_print').flatMap(x=>(x.entryIds||[]).map(id=>[id,x])));
 let rows=bookData.entries.filter(x=>(range==='book'||x.loci.includes(current))&&(!query||x.sourceText.toLocaleLowerCase().includes(query)));
 if(level==='print')rows=rows.filter(x=>verified.has(x.id)&&x.locusMapping==='printed_source_line');
 const root=$('source-critical-entries');root.replaceChildren();
 const actual=rows.slice(0,shown);
 for(const row of actual){
  const article=E('article',null,'ab-source-entry');
  const heading=E('h4',row.loci.map(fmt).join(' / ')+' · Rose '+row.printedPage+','+(row.printedLine||'—'));
  const reading=E('p',row.sourceText,'ab-critical-reading');reading.lang='la';
  const checked=verified.get(row.id),certain=row.locusMapping==='printed_source_line';
  const status=E('p',checked&&certain?'Lect. sec. Rose · transcripción cotejada con la página impresa':'Lect. sec. Rose · transcripción editorial; cotejo del impreso pendiente','ab-meta');
  article.append(heading,reading,status);
  const links=E('p',null,'ab-source-links');addSource(links,'Transcripción de la edición',row.sourceUrl);
  if(checked){links.append(' · ');addSource(links,'Facsímil cotejado',checked.facsimileUrl);}
  else{links.append(' · ');addSource(links,'Localizar el impreso','rose-1899.html');}
  if(row.locusMapping==='printed_line_interpolation_ambiguous')article.append(E('p','La numeración marginal presenta una discontinuidad; la asociación al locus sigue en revisión.','ab-meta'));
  if(row.locusMapping==='source_line_crosses_section_boundary')article.append(E('p','La línea impresa cruza un límite de sección; se conservan ambos loci como referencias posibles.','ab-meta'));
  if(row.stackedSigns)article.append(E('p','Signos superpuestos conservados como [a supra b]; examinar su disposición en la fuente.','ab-meta'));
  const detail=E('details'),summary=E('summary','Contexto y atribución');detail.append(summary);
  for(const context of row.context)detail.append(E('p',context.line+' · '+context.text));
  detail.append(E('p','Los testimonios H, G, E, S y las demás siglas se citan secundum Rose. El cotejo de este impreso no equivale a autopsia del manuscrito.','ab-meta'));
  article.append(links,detail);root.append(article);
 }
 if(!rows.length)root.append(E('p',level==='print'?'No hay una entrada con cotejo visual del impreso registrada para esta selección. Consulte el registro documental para localizar las fuentes.':'No hay notas de Rose vinculadas a esta selección; ello no acredita ausencia de variantes.','ab-none'));
 $('source-critical-more').hidden=rows.length<=shown;
 $('source-critical-status').textContent=fmt(current)+' · '+rows.length+' entradas en esta selección · '+actual.length+' visibles. Las notas autorales de V514, V554 y V297 y los cotejos de H se conservan en sus apartados.';
}
async function select(locus){
 current=locus;const n=Number(locus.split('.')[0]),token=++serial;shown=30;
 if(!manifest)return;
 if(n!==loadedBook){
  bookData=null;$('source-critical-entries').replaceChildren();$('source-critical-comparison').replaceChildren();$('source-critical-more').hidden=true;
  $('source-critical-status').textContent='Cargando el aparato de Rose del libro '+(ROM[n]||n)+'…';
  const record=manifest.books?.[n];if(!record)return;
  try{if(!cache.has(n))cache.set(n,get(record.path));const value=await cache.get(n);if(token!==serial)return;bookData=value;loadedBook=n;}
  catch(e){cache.delete(n);$('source-critical-entries').replaceChildren();$('source-critical-comparison').replaceChildren();$('source-critical-more').hidden=true;$('source-critical-status').textContent='No se pudo cargar esta fuente: '+e.message;return;}
 }
 draw();
}
window.addEventListener('vitruvius:bude-locus',e=>{if(e.detail?.locus)void select(e.detail.locus);});
for(const id of ['source-critical-range','source-critical-evidence'])$(id).addEventListener('change',()=>{shown=30;draw();});
$('source-critical-query').addEventListener('input',()=>{shown=30;draw();});
$('source-critical-more').addEventListener('click',()=>{shown+=30;draw();});
Promise.all([get('data/apparatus/rose-1899-critical-register.json'),get('data/apparatus/source-print-checks.json')]).then(([m,c])=>{
 if(m.schema!=='vdl-systematic-critical-register-v1')throw Error('Registro no reconocido');
 manifest=m;checks=c;
 const checkedCount=new Set(c.entries.filter(x=>x.source==='Rose1899'&&x.status==='checked_against_print').flatMap(x=>x.entryIds||[])).size;
 $('source-critical-coverage').textContent=m.counts.apparatusEntries+' entradas históricas de Rose registradas en '+m.counts.lociWithApparatus+' loci de los diez libros; '+checkedCount+' entradas cotejadas con el impreso. '+m.counts.sourceAnchoredLoci+' referencias tienen ancla de sección en esa edición. La vinculación automática de las demás entradas sigue pendiente de cotejo. Estas cifras miden documentación, no colación independiente de los códices.';
 $('source-critical-conspectus').textContent=m.conspectusSource.text||'';
 const a=$('source-critical-conspectus-link');a.href=m.conspectusSource.url;
 void select(current);
}).catch(e=>{$('source-critical-status').textContent='No se pudo consultar el registro crítico: '+e.message;});
})();
