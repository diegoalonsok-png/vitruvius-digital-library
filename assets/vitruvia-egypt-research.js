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
const RAMESSIDE_PRIMARY=[
 {title:'Poema y Boletín de Qadesh · año 5',kind:'Relato regio y documento histórico · no libro autógrafo',
  passage:'Dos tradiciones textuales distintas, conservadas en inscripciones monumentales y testimonios en papiro. La versión regia no equivale a una crónica neutral de la batalla.',
  provenance:'KRI II, 2–101; Gardiner, The Kadesh Inscriptions of Ramesses II (1960).',
  href:'https://news.thessea.org/images/SSEA_assets/journals/JSSEA_38.pdf',label:'Estudio epigráfico y bibliografía · JSSEA'},
 {title:'Tratado de paz con Hattusili III · año 21',kind:'Documento diplomático con tradiciones egipcia e hitita',
  passage:'Acuerdo entre las cortes de Ramsés II y Hattusili III, atestiguado en versiones egipcias e hititas. No debe catalogarse como obra literaria firmada por el faraón.',
  provenance:'UCL Digital Egypt, ficha Ramsés II; J. H. Breasted, Ancient Records of Egypt III, §§367–391.',
  href:'https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/ramsesii.html',label:'Ficha y referencias originales · UCL'},
 {title:'Relieves y cartuchos del reinado',kind:'Testimonios arqueológicos y epigráficos',
  passage:'Karnak, Luxor, Ramesseum, Abu Simbel y Abydos conservan numerosos testimonios del protocolo regio. La grafía del nomen varía a lo largo del reinado.',
  provenance:'Petrie Museum · UCL Digital Egypt; Kitchen, Ramesside Inscriptions II.',
  href:'https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/ramsesii.html',label:'Objetos, imágenes y testimonios · Petrie Museum'}
];
const TITULARIES=[
 {key:'ramesses-ii',aliases:['ramses ii','ramesses ii','rameses ii','ramses 2','ramesses 2','rameses 2','ramses the great','ramesses the great','ramses el grande','ramses ii el grande'],
  names:['Kanakht Merymaat','Mekkemetwafkhasut','Userrenput-aanehktu','Usermaatre-setepenre','Ramesses (meryamun)'],
  source:'https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/ramsesii.html',
  artifact:'https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/ramsesii.html',
  artifactLabel:'Cartuchos y testimonios auténticos · Petrie Museum / UCL',primary:RAMESSIDE_PRIMARY},
 {key:'akhenaten',aliases:['akhenaten','akhenaton','akenaton','akhnaton','ajenaton','amenhotep iv','amenofis iv','amenophis iv'],
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
 const clean=norm(query).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 return TITULARIES.find(t=>t.aliases.includes(clean))||null;
};

/* Panel documental derecho: usa el espacio actual de la ficha destacada;
 * los cartuchos esquemáticos llevan transliteración, no jeroglíficos inventados.
 * Los enlaces museísticos permiten consultar el objeto auténtico. */
/* El Himno está atestiguado en la tumba de Ay (Amarna 25); el texto
 * de estelas se compara con la inscripción de la estela S, según UCL.
 * Traducciones de trabajo breves, NO citas literales de versiones modernas. */
const AMARNA_PRIMARY=[
 {title:'Gran Himno a Atón · tumba de Ay (TA 25)',
  kind:'Síntesis de pasaje original',passage:'Al amanecer, Atón ilumina las tierras y vivifica lo creado; al ponerse, el mundo queda sumido en la oscuridad.',
  provenance:'Inscripción de la tumba de Ay en Ajetatón, muro occidental. Atribución tradicional a Akenatón discutida.',
  href:'https://en.wikisource.org/wiki/Great_Hymn_to_Aten',
  label:'Leer traducción histórica (Budge, 1923)'},
 {title:'Estelas limítrofes de Ajetatón · proclamación del año 6',
  kind:'Extracto breve de transliteración · UCL',passage:'rnpt-sp 6 Abd 4 prt sw 13',
  translation:'Año 6 del reinado, cuarto mes de la estación peret, día 13 (traducción de trabajo).',
  provenance:'Texto basado principalmente en la estela S; los monumentos delimitaban la nueva capital y fueron objeto de renovación del juramento en el año 8.',
  href:'https://www.ucl.ac.uk/museums-static/digitalegypt/amarna/boundary.html',
  label:'Transliteración y traducción académica · UCL'},
 {title:'Estelas de frontera · documentación arqueológica',
  kind:'Testimonios y localización',passage:'Las estelas grabadas en los acantilados fijaban los límites ceremoniales y territoriales de Ajetatón.',
  provenance:'Proyecto Amarna · documentación y dibujos de las estelas K, M, X y las restantes del conjunto.',
  href:'https://www.amarnaproject.com/amarna-the-place/boundary-stelae/',
  label:'Consultar estelas y dibujos · Amarna Project'}
];
function addPrimaryTexts(section,record){
 if(!record||!['akhenaten','ramesses-ii'].includes(record.key))return;
 const box=node('div');box.className='v-egypt-primary';
 box.append(node('h4',record.key==='ramesses-ii'?'Inscripciones y textos del reinado · Ramsés II':'Textos primarios · Amarna'));
 for(const entry of (record.primary||AMARNA_PRIMARY)){
  const details=node('details');details.className='v-egypt-primary-item';
  const summary=node('summary',entry.title);details.append(summary);
  const cat=node('small',entry.kind);details.append(cat);
  const p=node('p',entry.passage);details.append(p);
  if(entry.translation)details.append(node('p',entry.translation));
  const source=node('p',entry.provenance);source.className='article-note';details.append(source);
  details.append(link(entry.href,entry.label));box.append(details);
 }
 section.append(box);
}
function sideTitulary(query,identity){
 const host=document.querySelector('#featured .featured-copy')||document.getElementById('featured');
 if(!host)return null;
 host.querySelector('#v-egypt-side')?.remove();
 const record=titularyFor(query)||titularyFor(identity?.title||'');
 if(!record&&!identity)return null;
 const section=node('section');section.id='v-egypt-side';section.className='v-egypt-side';
 section.append(node('h3','Titulatura real y árbol dinástico'));
 if(record){
  const names=node('ol');names.className='v-egypt-titles';
  const labels=['Horus','Dos Señoras (Nebty)','Horus de Oro','Prenomen','Nomen'];
  for(let i=0;i<record.names.length;i++){
   const li=node('li');li.append(node('small',labels[i]));
   if(i>=3){const glyph=node('div',record.names[i]);glyph.className='v-egypt-cartouche';glyph.title='Cartucho esquemático con transliteración, no reproducción jeroglífica';li.append(glyph)}
   else li.append(node('span',record.names[i]));
   names.append(li);
  }
  section.append(names);
  const foot=node('p','Cartuchos esquemáticos · transliteraciones, no facsímiles. Ver signos originales en el museo.');
  foot.className='article-note';section.append(foot);
  section.append(link(record.artifact,record.artifactLabel),document.createTextNode(' · '),link(record.source,'Cinco nombres · UCL'));
  addPrimaryTexts(section,record);
 }else{
  section.append(node('p','Titulatura pendiente de cotejo: no se generan cartuchos sin edición comprobada.'));
 }
 host.append(section);
 if(!document.getElementById('v-egypt-side-css')){
  const css=node('style');css.id='v-egypt-side-css';
  css.textContent='#featured .v-egypt-side{margin-top:20px;padding-top:15px;border-top:1px solid #555;font-size:14px;line-height:1.55}#featured .v-egypt-side h3{font:normal 20px/1.3 Georgia,serif;margin:0 0 12px}#featured .v-egypt-titles{list-style:none;margin:0;padding:0}#featured .v-egypt-titles li{margin:0 0 9px;display:flex;flex-wrap:wrap;align-items:center;gap:8px}#featured .v-egypt-titles small{min-width:92px;opacity:.7}#featured .v-egypt-cartouche{display:inline-flex;align-items:center;justify-content:center;max-width:100%;overflow-wrap:anywhere;padding:8px 14px;border:2px solid currentColor;border-radius:45% / 36%;font:15px Georgia,serif;letter-spacing:.02em}#featured .v-egypt-side .vitruvia-dynasty-tree{max-height:320px;overflow:auto}#featured .v-egypt-side .lx-tree-head{max-width:100%;overflow-wrap:anywhere}#featured .v-egypt-primary{margin-top:16px;border-top:1px solid #454545;padding-top:12px}#featured .v-egypt-primary h4{margin:0 0 8px;font:normal 17px Georgia,serif}#featured .v-egypt-primary-item{border-bottom:1px solid #333;padding:7px 0}#featured .v-egypt-primary-item summary{cursor:pointer;font-weight:600}#featured .v-egypt-primary-item small{opacity:.65}#featured .v-egypt-primary-item p{font-size:13px;line-height:1.6;margin:7px 0}';
  document.head.append(css);
 }
 return section;
}
async function sideDynasty(query,row,serialAtStart){
 const section=sideTitulary(query,row);
 if(!section||!row?.wikidataId||!/^Q\d+$/.test(row.wikidataId))return;
 let entity;try{entity=await fetchEntity(row.wikidataId)}catch{return}
 if(serialAtStart!==sideSerial||!section.isConnected||!entity)return;
 const groups=properties.map(([property,label])=>({label,ids:[...new Set(getClaims(entity,property))]})).filter(x=>x.ids.length);
 if(!groups.length)return;
 const ids=[...new Set(groups.flatMap(g=>g.ids))].slice(0,40);
 const url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:ids.join('|'),props:'labels',languages:'es|en',format:'json',origin:'*'});
 let entities={};try{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),6500);try{const res=await fetch(url,{signal:ctl.signal});if(res.ok)entities=(await res.json()).entities||{}}finally{clearTimeout(t)}}catch{}
 if(serialAtStart!==sideSerial||!section.isConnected)return;
 section.append(node('h4','Árbol familiar · relaciones registradas'));
 dynastyTree(section,groups,entities,row.wikidataId,row.entityCanonical||row.title||query);
 section.append(link('https://www.wikidata.org/wiki/'+row.wikidataId,'Fuentes de las relaciones familiares'));
}
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

/* El árbol replica las ramas tipográficas de Lexicon solo dentro del dossier.
 * Relaciones sin declaración no se dibujan. La sucesión política NO equivale
 * automáticamente a filiación, por lo que no se infiere de una lista de reyes. */
function dynastyTree(section,groups,labels,subjectId,subjectName){
 const byProp=Object.fromEntries(groups.map(g=>[g.label,g.ids]));
 const display=id=>labels[id]?.labels?.es?.value||labels[id]?.labels?.en?.value||id;
 const tree=node('div');tree.className='vitruvia-dynasty-tree';
 const roots=node('ul');roots.className='lx-tree-list';
 function leaf(ul,label,id,name,children){
  const li=node('li');li.className='lx-tree-node';
  const head=node('span');head.className='lx-tree-head';
  head.append(node('small',label));head.append(link('https://www.wikidata.org/wiki/'+id,name));
  li.append(head);if(children?.length){const nested=node('ul');nested.className='lx-tree-list';children.forEach(c=>nested.append(c));li.append(nested)}
  ul.append(li);return li;
 }
 const parents=[...(byProp['Padre']||[]),...(byProp['Madre']||[])];
 const siblings=byProp['Hermanos/as']||[];
 const spouses=byProp['Cónyuge']||[];
 const children=byProp['Descendencia']||[];
 const center=node('li');center.className='lx-tree-node';
 const centerHead=node('span');centerHead.className='lx-tree-head';
 centerHead.append(node('strong',subjectName||subjectId));center.append(centerHead);
 const branch=node('ul');branch.className='lx-tree-list';
 for(const id of spouses)leaf(branch,'Cónyuge · ',id,display(id));
 for(const id of siblings)leaf(branch,'Hermano/a · ',id,display(id));
 for(const id of children)leaf(branch,'Hijo/a · ',id,display(id));
 if(branch.childNodes.length)center.append(branch);
 if(parents.length){
  const group=node('li');group.className='lx-tree-node';
  group.append(node('strong','Progenitores documentados'));
  const parentList=node('ul');parentList.className='lx-tree-list';
  for(const id of parents)leaf(parentList,'Padre / madre · ',id,display(id));
  group.append(parentList);
  roots.append(group);
 }
 roots.append(center);
 tree.append(roots);
 const styleId='vitruvia-dynasty-tree-style';
 if(!document.getElementById(styleId)){
  const style=node('style');style.id=styleId;
  style.textContent='.vitruvia-dynasty-tree .lx-tree-list{list-style:none;margin:10px 0 14px;padding:0 0 0 18px;border-left:2px solid #4a4a4a}.vitruvia-dynasty-tree .lx-tree-node{position:relative;margin:0 0 4px;padding:8px 0 4px 14px}.vitruvia-dynasty-tree .lx-tree-node:before{content:"";position:absolute;left:-19px;top:20px;width:24px;border-top:2px solid #4a4a4a}.vitruvia-dynasty-tree .lx-tree-head{display:inline-flex;flex-wrap:wrap;gap:8px;align-items:baseline;padding:7px 12px;border:1px solid #383838;border-radius:8px}.vitruvia-dynasty-tree .lx-tree-head small{font:11px Arial,sans-serif;opacity:.75}.vitruvia-dynasty-tree a{color:inherit;text-decoration:underline;text-underline-offset:3px}';
  document.head.append(style);
 }
 section.append(tree);return tree;
}
let serial=0,sideSerial=0;
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
 const section=node('div');section.append(node('h4','Árbol de parentescos documentados'));
 dynastyTree(section,groups,labels,identified.wikidataId,identified.entityCanonical||identified.title||query);
 section.append(link('https://www.wikidata.org/wiki/'+identified.wikidataId,'Consultar las declaraciones y referencias del registro de autoridad'));
 block.insertBefore(section,root);
}
window.addEventListener('vitruvia:search',event=>{serial++;sideSerial++;document.getElementById('vitruvia-egypt-research')?.remove();const body=document.getElementById('article-body');if(body)renderTitulary(body,event.detail?.query||'');document.getElementById('v-egypt-side')?.remove();if(titularyFor(event.detail?.query||''))sideTitulary(event.detail.query)});
window.addEventListener('vitruvia:featured-result',event=>{
 const d=event.detail||{},q=d.query||'',row=d.row||{};
 if(!isEgyptian(row,q)&&!titularyFor(q))return;
 const n=++sideSerial;void sideDynasty(q,row,n);
});
window.addEventListener('vitruvia:results',event=>{const d=event.detail||{};void paint(d.query||'',d.rows||[])});

/* El dossier no depende del disparo asincrónico de la ficha principal: se mantiene
 * en el resultado de la búsqueda y se vuelve a anclar si la ficha se re-renderiza. */
function ensureRoyalPanel(){
 const q=new URLSearchParams(location.search).get('q')||'';
 const record=titularyFor(q);if(!record)return;
 if(!document.getElementById('v-egypt-side'))sideTitulary(q);
 const body=document.getElementById('article-body');if(body&&!body.querySelector('#vitruvia-royal-titulary'))renderTitulary(body,q);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureRoyalPanel,{once:true});else ensureRoyalPanel();
window.VitruviaEgyptResearch={isEgyptian,SOURCES,properties,titularyFor,renderTitulary,sideTitulary};
})();