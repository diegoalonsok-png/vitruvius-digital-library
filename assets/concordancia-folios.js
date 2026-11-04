/* Folio-locus correspondence: only evidence-graded mappings have an IIIF image.
   Editorial text is not attributed to a manuscript page without a mapped witness. */
(()=>{
const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
const manifestUrl='https://bl.digirati.io/iiif/ark:/81055/vdc_100056038850.0x000001';
const source={es:'data/structured/recensio-es.json',en:'data/structured/theory-en.json',fr:'data/structured/recensio-fr.json'};
let map,passages=[],passageByLocus=new Map(),alignment,corpora={},canvases=[],imageIssue='',manifestLoading=true,selection={kind:'folio',value:'1r'},query='';
const reader=(l,language='es')=>'lector-bilingue.html?edition='+({es:'recensio-es',en:'theory-en',fr:'recensio-fr'}[language]||'recensio-es')+'&locus='+encodeURIComponent(l);
function getInfo(locus){for(const entry of map.entries){const record=entry.loci.find(p=>p.locus===locus);if(record)return {entry,record};}return null}
async function loadTranslation(lang){if(corpora[lang])return corpora[lang];
 try{const response=await fetch(source[lang]);if(!response.ok)throw Error('HTTP '+response.status);
   const j=await response.json();const index=new Map((j.passages||[]).map(x=>[x.locus,x]));if(!index.size)throw Error('Edición sin pasajes');
   corpora[lang]=index;return index;
 }catch(e){console.warn('Concordancia, traducción no disponible:',e);corpora[lang]=new Map();return corpora[lang]}
}
function showImage(index,folio){
 const image=$('f-image'),box=$('f-image-box');box.querySelector('.folio-no-image')?.remove();
 image.hidden=false;image.alt='Harley MS 2767, folio '+folio+', imagen digital '+index+' (British Library)';
 if(!canvases.length){image.hidden=true;const p=document.createElement('p');p.className='folio-no-image';p.textContent=manifestLoading?'Cargando imagen '+index+' desde el manifiesto institucional IIIF…':'No se pudo consultar el manifiesto IIIF. Abre la imagen '+index+' desde el visor H; no se incorpora una fotografía de origen incierto.';box.append(p);return}
 const c=canvases[index-1];
 if(!c){image.hidden=true;const p=document.createElement('p');p.className='folio-no-image';p.textContent='No se halló la imagen '+index+' en el manifiesto institucional.';box.append(p);return}
 const resource=c.images?.[0]?.resource||c.items?.[0]?.items?.[0]?.body;
 const service=resource?.service||resource?.services;
 const srv=Array.isArray(service)?service[0]:service;
 const base=typeof srv==='string'?srv:srv?.id||srv?.['@id'];
 const src=base?String(base).replace(/\/$/,'')+'/full/1200,/0/default.jpg':resource?.id||resource?.['@id'];
 if(!src){image.hidden=true;const p=document.createElement('p');p.className='folio-no-image';p.textContent='El manifiesto no publica enlace de imagen para este folio.';box.append(p);return}
 image.onload=()=>{$('f-evidence').dataset.imageLoaded='true'};
 image.onerror=()=>{image.hidden=true;const p=document.createElement('p');p.className='folio-no-image';p.textContent='Imagen remota no disponible; usa el enlace institucional del visor H.';box.append(p)};
 image.src=src;
}
function unsetImage(){
 const image=$('f-image'),box=$('f-image-box');image.hidden=true;image.removeAttribute('src');
 box.querySelector('.folio-no-image')?.remove();
 const p=document.createElement('p');p.className='folio-no-image';
 p.textContent='No hay folio de H asignado con evidencia a este locus. No se muestra una imagen arbitraria.';
 box.append(p);
}
function addParagraph(where,locus,text,latin){
 const head=document.createElement('h3');head.textContent='De architectura · '+locus;
 const p=document.createElement('p');p.className=latin?'latin':'translation';p.textContent=text;where.append(head,p);
}
async function render(){
 const lang=$('f-lang').value;
 const latin=$('f-latin'),translation=$('f-translation');
 latin.replaceChildren();translation.replaceChildren();
 $('f-folio').value=selection.kind==='folio'?selection.value:(getInfo(selection.value)?.entry.folio||'');
 const chosen=selection.kind==='folio'?map.entries.find(x=>x.folio===selection.value):getInfo(selection.value)?.entry;
 if(chosen){
  $('f-evidence').textContent='Harley MS 2767 · f. '+chosen.folio+' · imagen '+chosen.image_number+' · '+map.status_labels[chosen.folio_status];
  $('f-open').href='harleianus.html?image='+chosen.image_number;
  $('f-open').hidden=false;
  showImage(chosen.image_number,chosen.folio);
 }else{
  $('f-evidence').textContent='Sin asignación material: el locus se conoce en las ediciones, pero no se ha localizado en un folio cotejado.';
  $('f-open').hidden=true;unsetImage();
 }
 const entries=selection.kind==='folio'?(chosen?.loci||[]):[{locus:selection.value,extent:'full',status:'editorial_only'}];
 if(selection.kind==='folio'&&!entries.length){
  latin.innerHTML='<p class="message">No hay transcripción ni pasaje atribuido a este folio. Debe cotejarse con la imagen original antes de establecer la correspondencia.</p>';
  translation.innerHTML='<p class="message">Traducción no asignada a este folio. Se evita repetir la del folio anterior.</p>';
  $('f-latin-status').textContent='Folio '+selection.value+' · sin locus verificado';
  $('f-translation-status').textContent='Sin asignación de traducción';
  $('f-reader').hidden=true;$('f-parallel').hidden=true;return;
 }
 const relevant=entries.filter(x=>selection.kind==='folio'||x.locus===selection.value);
 const otherMap=await loadTranslation(lang);
 for(const item of relevant){
  const p=passageByLocus.get(item.locus);
  if(!p)continue;
  const aligned=chosen?.folio==='1r'?alignment?.loci?.find(x=>x.locus===item.locus):null;
  const fragment=aligned?.latin||p.latin;
  addParagraph(latin,item.locus,fragment,true);
  let trans;
  if(chosen?.folio==='1r'){
   if(lang==='fr'){
    trans='La traducción francesa parcial de este folio no está cotejada. Abre la edición V554 por locus para la traducción completa (sin atribuirla a este folio).';
   }else trans=aligned?.translations?.[lang]||'Traducción parcial no disponible';
  }else{
   trans=(lang==='es'?p:otherMap.get(item.locus))?.translation||'No se dispone de traducción correspondiente para este locus en esta edición.';
  }
  addParagraph(translation,item.locus,trans,false);
 }
 $('f-latin-status').textContent=(selection.kind==='folio'?'Folio '+selection.value:'Locus '+selection.value)+' · '+(chosen?.folio_status==='provisional'?'correspondencia semidiplomática provisional':'texto latino editorial V514')+' · '+relevant.map(x=>x.locus).join(' / ');
 $('f-translation-status').textContent=chosen?.folio==='1r'?(lang==='fr'?'Français V554: no hay corte validado por folio':'Traducción editorial fragmentada por límite aproximado de 1r'):('Traducción editorial · '+$('f-lang').selectedOptions[0].textContent);
 const loc=selection.kind==='locus'?selection.value:relevant[0]?.locus;
 $('f-reader').hidden=!loc;$('f-parallel').hidden=!loc;
 if(loc){$('f-reader').href=reader(loc,'es');$('f-parallel').href=reader(loc,lang)}
}
function renderMatches(){
 const list=$('f-search-results');list.replaceChildren();
 let q=query.trim(),items=passages;
 if(q){items=passages.filter(p=>fold(p.locus).includes(fold(q))||fold(p.latin).includes(fold(q))||fold(p.translation).includes(fold(q)));}
 $('f-search-count').textContent=items.length+' loci'+(q?' coincidentes con «'+q+'»':' editoriales disponibles')+'; de ellos solo los expresamente asociados tienen folio.';
 for(const p of items.slice(0,35)){
  const div=document.createElement('div');div.className='folio-result';
  const inf=getInfo(p.locus),main=document.createElement('div'),tag=document.createElement('span');tag.className='folio-badge';
  tag.textContent=inf?'Folio '+inf.entry.folio+' · mapeo provisional':'Folio no atribuido';
  const strong=document.createElement('strong');strong.textContent=p.locus;
  const small=document.createElement('small');small.textContent=p.latin.slice(0,170)+(p.latin.length>170?'…':'');
  main.append(tag,document.createElement('br'),strong,small);
  const button=document.createElement('button');button.type='button';button.textContent='Consultar locus';button.addEventListener('click',()=>{
    selection={kind:'locus',value:p.locus};render();document.querySelector('.folio-workspace').scrollIntoView({behavior:'smooth',block:'start'});
    history.replaceState(null,'',location.pathname+'?locus='+encodeURIComponent(p.locus));
  });div.append(main,button);list.append(div);
 }
 if(items.length>35){const p=document.createElement('p');p.textContent='Se muestran los primeros 35 loci. Precisa la búsqueda para encontrar los restantes.';p.style.fontSize='12px';list.append(p)}
}
function exportTEI(){
 const locus=selection.kind==='locus'?selection.value:map.entries.find(x=>x.folio===selection.value)?.loci?.[0]?.locus;
 const p=passageByLocus.get(locus);
 if(!p)return;
 const x=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const witness=getInfo(locus);
 const provenance=witness?('Hipótesis de identificación: Harley MS 2767, f. '+witness.entry.folio+
   ', imagen IIIF '+witness.entry.image_number+'. Alineación provisional, no cotejo diplomático.'):'Sin correspondencia verificada con un folio de Harley MS 2767.';
 const xml='<?xml version="1.0" encoding="UTF-8"?>\n'
 +'<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:lang="la">\n'
 +'  <teiHeader><fileDesc><titleStmt><title>De architectura, '+x(locus)+' · extracto editorial</title><author>Vitruvius</author><editor>Diego Kurilo</editor></titleStmt>'
 +'<publicationStmt><p>Vitruvius Digital Library. Extracto TEI para investigación, no edición diplomática del manuscrito.</p></publicationStmt>'
 +'<sourceDesc><bibl>Diego Kurilo, V514 · texto latino y traducción castellana. Locus '+x(locus)+'.</bibl>'
 +'<p>Testigo de referencia: British Library, Harley MS 2767. '+x(provenance)+'</p></sourceDesc></fileDesc>'
 +'<encodingDesc><p>Transcripción latina normalizada de edición V514. Sin aparato de variantes, sin colación de códices y sin alineación palabra a palabra.</p></encodingDesc></teiHeader>\n'
 +'  <text><body><div type="passage" n="'+x(locus)+'"><ab xml:lang="la">'+x(p.latin)+'</ab>'
 +'<div type="translation" xml:lang="es"><p>'+x(p.translation)+'</p></div>'
 +'<note type="witness-status">'+x(provenance)+'</note>'
 +'</div></body></text>\n</TEI>\n';
 const blob=new Blob([xml],{type:'application/tei+xml;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.download='vitruvius-'+locus.replace(/[^a-z0-9.\-]/gi,'_')+'-V514.xml';a.href=url;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
 $('f-latin-status').textContent='Exportación TEI-XML del locus '+locus+' generada desde la edición V514; no representa una lectura diplomática de H.';
}
function copyReference(){
 const locus=selection.kind==='locus'?selection.value:(map.entries.find(x=>x.folio===selection.value)?.loci?.[0]?.locus);
 if(!locus)return;
 const info=getInfo(locus),folio=info?' · H f. '+info.entry.folio+' (atribución provisional)':' · folio no identificado';
 const link=new URL(location.href);link.search='?locus='+encodeURIComponent(locus);
 const text='Vitruvius, De architectura '+locus+' · texto latino en V514, ed. Diego Kurilo'+folio+' · '+link.href;
 if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(()=>{$('f-latin-status').textContent='Referencia copiada al portapapeles.'}).catch(()=>{prompt('Copiar referencia:',text)})}else prompt('Copiar referencia:',text);
}
async function load(){
 try{
  const [rMap,rCorpus,rAlignment]=await Promise.all([fetch('data/codex-h/folio-locus-map.json'),fetch(source.es),fetch('data/codex-h/aligned-1r.json')]);
  for(const r of [rMap,rCorpus,rAlignment])if(!r.ok)throw Error('HTTP '+r.status);
  map=await rMap.json();const j=await rCorpus.json();alignment=await rAlignment.json();
  passages=j.passages||[];passageByLocus=new Map(passages.map(p=>[p.locus,p]));
  if(passages.length<700||map.entries.length<2)throw Error('Datos incompletos');
  corpora.es=passageByLocus;
  // IIIF es externo: su latencia no debe bloquear los loci ni las traducciones.
  const controller=new AbortController();
  const guard=setTimeout(()=>controller.abort(),8500);
  fetch(manifestUrl,{headers:{Accept:'application/json'},signal:controller.signal})
    .then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})
    .then(m=>{canvases=m.sequences?.[0]?.canvases||m.items||[];manifestLoading=false;const entry=selection.kind==='folio'?map.entries.find(x=>x.folio===selection.value):getInfo(selection.value)?.entry;if(entry)showImage(entry.image_number,entry.folio)})
    .catch(e=>{imageIssue=e.message;manifestLoading=false;console.warn('IIIF:',imageIssue);const entry=selection.kind==='folio'?map.entries.find(x=>x.folio===selection.value):getInfo(selection.value)?.entry;if(entry)showImage(entry.image_number,entry.folio)})
    .finally(()=>clearTimeout(guard));
  const params=new URLSearchParams(location.search),locus=params.get('locus'),folio=params.get('folio');
  if(locus&&passageByLocus.has(locus))selection={kind:'locus',value:locus};
  else if(folio&&map.entries.some(e=>e.folio===folio))selection={kind:'folio',value:folio};
  await render();
  renderMatches();
  $('f-folio').addEventListener('change',()=>{const val=$('f-folio').value;if(!val)return;selection={kind:'folio',value:val};history.replaceState(null,'',location.pathname+'?folio='+encodeURIComponent(val));render();});
  $('f-lang').addEventListener('change',render);
  $('f-search-form').addEventListener('submit',e=>{e.preventDefault();query=$('f-search').value.trim();renderMatches();});
  $('f-search').addEventListener('input',e=>{query=e.target.value.trim();renderMatches()});
  $('f-copy').addEventListener('click',copyReference);
  $('f-tei').addEventListener('click',exportTEI);
 }catch(e){$('f-evidence').textContent='Error al cargar la concordancia: '+e.message;$('f-latin').textContent='Vuelve a consultar el lector editorial y el visor institucional; no hay correspondencia atribuible sin los datos.';}
}
load();
})();