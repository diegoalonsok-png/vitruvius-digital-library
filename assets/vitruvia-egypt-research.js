/* Egiptología: parentescos documentados y puntos de acceso a instituciones.
 * Sin genealogías inventadas, inferencias automáticas de ascendencia ni CSS nuevo.
 * Los vínculos Wikidata son fichas de autoridad, NO citas académicas revisadas.
 */
(()=>{'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const isEgyptian=(row,q)=>{
 const d=norm([row?.entityDescription,row?.entityCanonical,row?.excerpt,row?.title,row?.meta].join(' '));
 const query=norm(q);
 return /\b(ancient egypt|ancient egyptian|egipto antiguo|antiguo egipto|faraon|pharaoh|pharaon|dynasty of egypt|dinastia egipcia|egipcio antiguo|egyptian pharaoh)\b/.test(d)||
 /\b(egipto|egypt|egipci|pharaoh|faraon|akhenat|amenhotep|tutankh|nefertiti|ramess|rameses|hatshepsut|khufu|keops|cleopatra|thutmose|tutmosis)\b/.test(query);
};
const SOURCES=[
 ['Griffith Institute · TopBib','https://topbib.griffith.ox.ac.uk/','Repertorio de monumentos y textos'],
 ['Oxford · Online Egyptological Bibliography','https://oeb.griffith.ox.ac.uk/','Bibliografía especializada; puede requerir suscripción'],
 ['UCLA · Encyclopedia of Egyptology','https://www.uee.ucla.edu/','Artículos científicos revisados'],
 ['Chicago · ISAC Research Projects','https://isac.uchicago.edu/research-projects/search','Investigaciones y epigrafía egipcia']
];
/* Titulaturas verificadas contra fichas de UCL Digital Egypt.
 * Los nombres se imprimen en transliteracion editorial, NO como signos inventados.
 * El cartucho autentico se consulta mediante el objeto museistico enlazado.
 */
const TITULARIES=[
 {key:'akhenaten',aliases:['akhenaten','akhenaton','akhnaton','ajenaton','ajenaton','amenhotep iv','amenofis iv','amenophis iv'],
  names:['Meryaten (Kanakht Qaishuty)','Wernesytemakhetaten (Wernesytemipetsut)','Wetjesrenenaten (Wetjeskahuemiunushema)','Neferkheperre-waenre','Akhenaten (antes Amenhotep)'],
  source:'https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/akhnaton.html',
  artifact:'https://collections.carlos.emory.edu/objects/38621/relief-with-cartouches-of-akhenaten',
  artifactLabel:'Cartuchos originales · relieve, Emory University'},
 {key:'tutankhamun',aliases:['tutankhamun','tutankamon','tutankamon','tutankhamon','tutankhaten','tutanjamon','tutankhaton'],
  names:['Kanakht Tutmesut','Neferhepusegerehtawy','Wetjeskhausehetepnetjeru','Nebkheperure','Tutankhamun'],
  source:'https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/tutankhamun.html',
  artifact:'https://www.metmuseum.org/art/collection/search/567747',
  artifactLabel:'Cartucho original de Nebkheperure · Metropolitan Museum of Art'}
];
const titularyFor=query=>{
 const clean=norm(query).replace(/[^a-z0-9 ]/g,' ').replace(/\\s+/g,' ').trim();
 return TITULARIES.find(t=>t.aliases.includes(clean))||null;
};
function renderTitulary(body,query){
 body.querySelector('#vitruvia-royal-titulary')?.remove();
 const record=titularyFor(query);if(!record)return false;
 const section=node('section');section.id='vitruvia-royal-titulary';section.className='article-author-reading';
 section.append(node('h3','Titulatura real egipcia · orden canónico'));
 const names=node('ol');
 const labels=['Nombre de Horus','Nombre de las Dos Señoras (Nebty)','Nombre de Horus de Oro','Nombre de trono (prenomen)','Nombre personal (nomen)'];
 record.names.forEach((name,i)=>{const li=node('li');li.append(node('strong',labels[i]+': '),document.createTextNode(name));names.append(li)});
 section.append(names);
 const note=node('p','Prenomen y nomen se escribían habitualmente dentro de cartuchos. Aquí se ofrece la lectura documentada; no se dibujan jeroglíficos reconstruidos sin cotejo. La forma original puede consultarse en el objeto museístico.');
 note.className='article-note';section.append(note);
 const refs=node('p');refs.append(link(record.source,'Fuente de las cinco titulaturas · UCL Digital Egypt'),document.createTextNode(' · '),link(record.artifact,record.artifactLabel));section.append(refs);
 body.prepend(section);return true;
}
const properties=[['P22','Padre'],['P25','Madre'],['P26','Cónyuge'],['P40','Descendencia'],['P3373','Hermanos/as']];
const getClaims=(j,p)=>((j?.claims||{})[p]||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value?.id).filter(id=>/^Q\d+$/.test(id)).slice(0,12);
const node=(tag,value)=>{const n=document.createElement(tag);if(value)n.textContent=value;return n};
const link=(href,label)=>{const a=node('a',label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a};
let serial=0;
async function fetchEntity(qid){
 const url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:qid,props:'claims|labels|descriptions',languages:'es|en|fr',format:'json',origin:'*'});
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);
 try{const r=await fetch(url,{signal:ctl.signal});if(!r.ok)throw Error('HTTP '+r.status);return (await r.json())?.entities?.[qid]||null}
 finally{clearTimeout(timer)}
}
async function paint(query,rows){
 const current=++serial;
 const body=document.getElementById('article-body');if(!body)return;
 renderTitulary(body,query);
 body.querySelector('#vitruvia-egypt-research')?.remove();
 const identified=(rows||[]).find(r=>r?.wikidataId&&r?.preferredWiki&&isEgyptian(r,query));
 if(!identified)return;
 const block=node('section');block.id='vitruvia-egypt-research';block.className='article-author-reading';
 block.append(node('h3','Egiptología · filiación y fuentes de investigación'));
 const explanation=node('p','Las relaciones familiares provienen de fichas de autoridad y deben cotejarse con inscripciones y estudios especializados; no constituyen por sí solas prueba historiográfica.');
 explanation.className='article-note';block.append(explanation);
 const sourceList=node('ul');
 for(const [name,url,detail] of SOURCES){const li=node('li');li.append(link(url,name),document.createTextNode(' · '+detail));sourceList.append(li)}
 const root=node('div');root.append(node('h4','Centros y repertorios académicos'),sourceList);
 block.append(root);body.append(block);
 let entity;
 try{entity=await fetchEntity(identified.wikidataId)}catch{return}
 if(current!==serial||!block.isConnected||!entity)return;
 const groups=properties.map(([property,label])=>({label,ids:[...new Set(getClaims(entity,property))]})).filter(x=>x.ids.length);
 if(!groups.length)return;
 const ids=[...new Set(groups.flatMap(x=>x.ids))].slice(0,40);
 let labels={};
 try{
  const url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:ids.join('|'),props:'labels',languages:'es|en|fr',format:'json',origin:'*'});
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);
  try{const r=await fetch(url,{signal:ctl.signal});if(r.ok)labels=(await r.json()).entities||{}}finally{clearTimeout(timer)}
 }catch{}
 if(current!==serial||!block.isConnected)return;
 const section=node('div');section.append(node('h4','Parentescos consignados en registros de autoridad'));
 const ul=node('ul');
 for(const group of groups){
  const li=node('li');li.append(node('strong',group.label+': '));
  group.ids.forEach((id,i)=>{if(i)li.append(document.createTextNode(', '));li.append(link('https://www.wikidata.org/wiki/'+id,labels[id]?.labels?.es?.value||labels[id]?.labels?.en?.value||id))});
  ul.append(li);
 }
 section.append(ul,link('https://www.wikidata.org/wiki/'+identified.wikidataId,'Consultar fichas, referencias y declaraciones originales'));
 block.insertBefore(section,root);
}
window.addEventListener('vitruvia:search',event=>{serial++;document.getElementById('vitruvia-egypt-research')?.remove();const body=document.getElementById('article-body');if(body)renderTitulary(body,event.detail?.query||'')});
window.addEventListener('vitruvia:results',event=>{const d=event.detail||{};void paint(d.query||'',d.rows||[])});
window.VitruviaEgyptResearch={isEgyptian,SOURCES,properties,titularyFor,renderTitulary};
})();