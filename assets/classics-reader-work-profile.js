/* Cabecera académica universal del lector. Solo presenta metadatos documentados. */
(()=>{'use strict';
const root=document.getElementById('reader-work-profile');
if(!root||new URLSearchParams(location.search).get('parallel')==='1')return;
const params=new URLSearchParams(location.search),work=params.get('work')||'apuleius-metamorphoses';
if(!/^[a-z0-9-]{3,60}$/.test(work))return;
const h=(tag,txt,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=String(txt);return e};
const show=(parent,key,value)=>{if(value==null||String(value).trim()==='')return;const row=h('p',null,'rwp-row');row.append(h('strong',key+': '),document.createTextNode(String(value)));parent.append(row)};
const names={la:'Latín',grc:'Griego antiguo',en:'Inglés',es:'Castellano',fr:'Francés',it:'Italiano',de:'Alemán',pt:'Portugués'};
root.append(h('p','Consultando los registros bibliográficos…','rwp-loading'));
Promise.allSettled([
 fetch('data/classics-corpus/search-registry.json').then(r=>{if(!r.ok)throw Error('registro');return r.json()}),
 fetch('data/bibliotheca-graeca-latina-I-bce-I-ce.json').then(r=>{if(!r.ok)throw Error('catálogo');return r.json()}),
 fetch('data/bibliotheca-expansion-publicada-2026-11-16.json').then(r=>r.ok?r.json():{}),
 fetch('data/bibliotheca-testimonia-verified.json').then(r=>r.ok?r.json():{})
]).then(results=>{
 const val=i=>results[i].status==='fulfilled'?results[i].value:{};
 const entries=(val(0).entries||[]).filter(e=>e.workId===work);
 const record=[...(val(1).works||[]),...(val(2).works||[])].find(e=>e.id===work)||{};
 const manuscripts=(val(3).records||[]).filter(e=>Array.isArray(e.workIds)&&e.workIds.includes(work))
   .sort((a,b)=>(Number.isFinite(a.dateStart)?a.dateStart:99999)-(Number.isFinite(b.dateStart)?b.dateStart:99999));
 const heading=h('h2','Autor y obra · ficha académica','rwp-title');
 const grid=h('div',null,'rwp-grid');
 show(grid,'Autor',record.author||entries[0]?.author||'No identificado en el registro');
 show(grid,'Obra',record.title||entries[0]?.title);
 show(grid,'Datación',record.dating||'Pendiente de documentación en el catálogo');
 show(grid,'Género',record.genre);
 show(grid,'Lengua original',names[record.language]||names[record.originalLanguage]||'Consultar la edición');
 const version=h('div',null,'rwp-versions');
 version.append(h('h3','Versiones textuales registradas'));
 if(entries.length)for(const e of entries){
  const block=h('p',null,'rwp-row');
  const label=names[e.language]||e.language||'Sin idioma documentado';
  block.append(h('strong',label+': '),document.createTextNode(e.sourceDescription||e.edition||'Edición sin identificar en el registro'));
  version.append(block);
 } else version.append(h('p','No se encontró una edición textual indexada para esta obra.'));
 const b=record.bibliography||{};
 const refs=[b.originalEditionCitation,b.editionCitation,b.translationCitation,b.chicago18Bibliography,...(record.localVersions||[]).map(e=>e.citationChicago18)].filter(Boolean);
 const source=h('div',null,'rwp-sources');
 source.append(h('h3','Ediciones históricas y traducciones acreditadas'));
 if(refs.length)refs.forEach(x=>show(source,'Referencia',x));
 else source.append(h('p','Traductor o edición histórica: no individualizados en la ficha consultada. No se atribuye una traducción sin fuente.'));
 const witnesses=h('div',null,'rwp-witnesses');witnesses.append(h('h3','Códices y transmisión manuscrita'));
 if(manuscripts.length){
  for(const m of manuscripts.slice(0,8))show(witnesses,'Testimonio', [m.title||m.shelfmark||m.id,m.library,m.date||m.dating,m.shelfmark].filter(Boolean).join(' · '));
  show(witnesses,'Alcance cronológico','El primer testimonio listado es el más temprano de los registrados aquí; no se declara el manuscrito más antiguo del mundo.');
 }else witnesses.append(h('p','Sin testimonio manuscrito individual vinculado en el registro verificado. Esto no significa que no existan códices.'));
 const links=h('p',null,'rwp-links');const l=h('a','Abrir ficha académica completa');l.href='classics-work-record.html?work='+encodeURIComponent(work);links.append(l);
 const more=h('details',null,'rwp-more');more.append(h('summary','Ediciones, traductores, códices y referencias documentales'),version,source,witnesses);
 root.replaceChildren(heading,grid,more,links);
}).catch(()=>{root.replaceChildren(h('p','No se pudo recuperar la ficha académica. Los textos originales permanecen disponibles.'));});
})();