/* Vitruvia — sourced architectural profiles and architectural drawings.
   No synthetic drawings or guessed dates, affiliations or attributions. */
(()=>{
'use strict';
const KEY=/\b(arquitect(?:o|a|os|as|ura|uras|onico|onica|onicos|onicas)|architect(?:s|ure|ural)?|architecture|architettura|architetto|baukunst|bauhaus)\b/i;
const FILE_PLAN=/\b(plan|plans|plano|planos|planta|plantas|grundriss|floorplan|floor plan|floor-plan|pianta|planimetr|ground floor|groundfloor)\b/i;
const FILE_SECTION=/\b(section|sections|corte|cortes|seccion|sección|schnitt|coupe|cross.section|sezione|longitudinal section)\b/i;
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const short=s=>String(s||'').trim().replace(/\s+/g,' ');
const stop=new Set('el la los las de del en por para the a an of and with who que quien architect arquitectura arquitecto arquitectos arquitecta architecte architects architecture'.split(' '));
const tokens=s=>normalize(s).split(' ').filter(w=>w.length>2&&!stop.has(w));
const localized=(es,en,fr)=>document.documentElement.lang==='en'?en:document.documentElement.lang==='fr'?fr:es;
const cache=new Map();
function classify(query,rows=[]){
 const q=normalize(query);
 const broad=/^(?:(?:historia|evolucion|origen|tipos|estilos)\s+(?:de|la|los)\s+)?(?:arquitectura|arquitecturas|arquitectos|arquitectas|architecture|architects|architectural styles|estilos arquitectonicos|arquitectura antigua|arquitectura moderna|arquitectura gotica|arquitectura romana|arquitectura griega|arquitectura renacentista|arquitectura contemporanea)$/.test(q);
 if(broad)return{kind:'general',subject:short(query),identity:null};
 const qt=tokens(query);
 // Resolve an actual identified building before reading architect names in its description.
 const buildingWords=/\b(building|buildings|house|museum|temple|church|cathedral|bridge|tower|skyscraper|dam|stadium|palace|castle|station|library|viaduct|monument|edificio|casa|museo|templo|iglesia|catedral|puente|torre|rascacielos|represa|presa|estadio|palacio|castillo|estacion|biblioteca|viaducto|monumento|anfiteatro|acueducto|amphitheater)\b/i;
 const building=rows.filter(x=>x.type==='wikipedia'&&x.link&&(
  normalize(x.title||'')===q||
  normalize(x.entityCanonical||'')===q||
  (qt.length>=2&&qt.every(term=>tokens(x.title||'').includes(term)))
 )).find(x=>{
  if(x.entityKind==='person')return false;
  const title=normalize(x.title||'');
  const intro=normalize(String(x.entityDescription||x.fullExtract||x.excerpt||'').slice(0,280));
  return buildingWords.test(title+' '+intro);
 });
 if(building)return{kind:'building',subject:short(building.title),identity:building};
 const wiki=rows.filter(x=>x.type==='wikipedia'&&x.link&&/architect|arquitect|architet|architecte/i.test(String(x.excerpt||'')+' '+String(x.entityDescription||'')+' '+String(x.fullExtract||'').slice(0,900)))
  .filter(x=>{
    const t=tokens(x.title||x.entityCanonical||'');
    const nameTerms=qt.filter(w=>!['biografia','vida','obras','trabajo','estilo','disenos','diseños','planos','cortes','famoso','famosos','arquitectonico'].includes(w));
    return nameTerms.length?nameTerms.every(w=>t.includes(w)||t.some(z=>z.startsWith(w)||w.startsWith(z))):false;
  }).sort((a,b)=>Number(!!b.preferredWiki)-Number(!!a.preferredWiki));
 if(wiki.length)return{kind:'person',subject:short(wiki[0].title),identity:wiki[0]};
 // A UNESCO-attested architect can still be identified if external snippets omit
 // occupation or the entity API is temporarily unreachable.
 if(certifiedSites[q])return{kind:'person',subject:short(query),identity:rows.find(x=>x.type==='wikipedia'&&normalize(x.title||'')===q)||null};
 // No attribution without a matching biographical record.
 if(KEY.test(q))return{kind:'general',subject:short(query),identity:null};
 return null;
}
const el=(tag,cl,value)=>{const node=document.createElement(tag);if(cl)node.className=cl;if(value!==undefined)node.textContent=value;return node};
const link=(value,url)=>{const a=el('a',null,value);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a};
function heading(root,value){root.append(el('h4','context-section-title',value))}
async function getJSON(url){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6500);
 try{const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);const json=await r.json();if(json.error)throw Error(json.error.info||'Public API error');return json}
 finally{clearTimeout(timer)}
}
function remember(key,fn){if(!cache.has(key))cache.set(key,fn().catch(()=>null));return cache.get(key)}
const year=statement=>{
 const v=statement?.mainsnak?.datavalue?.value?.time||'';
 const m=String(v).match(/^[+-](\d{4})/);return m?Number(m[1]):null;
};
function claim(entity,prop){return(entity?.claims?.[prop]||[]).filter(x=>x.rank!=='deprecated')}
function qids(entity,prop){return[...new Set(claim(entity,prop).map(x=>x.mainsnak?.datavalue?.value?.id).filter(x=>/^Q\d+$/.test(x||'')))].slice(0,8)}
function wikidata(id){
 if(!/^Q\d+$/.test(id||''))return Promise.resolve(null);
 return remember('wd:'+id,async()=>{
  const url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:id,props:'labels|descriptions|claims',languages:'es|en|fr',format:'json',origin:'*'});
  const data=await getJSON(url),entity=data.entities?.[id];if(!entity)return null;
  const refs=[...new Set([...qids(entity,'P135'),...qids(entity,'P149'),...qids(entity,'P800')])].slice(0,18);
  let labels={};
  if(refs.length){
   const rs=await getJSON('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:refs.join('|'),props:'labels',languages:'es|en|fr',format:'json',origin:'*'})).catch(()=>null);
   labels=rs?.entities||{};
  }
  return{entity,labels};
 });
}
const label=(labels,id)=>{
 const e=labels[id]||{};
 return e.labels?.[document.documentElement.lang]?.value||e.labels?.es?.value||e.labels?.en?.value||e.labels?.fr?.value||'';
};
function commonsSearch(query){
 return remember('commons:'+query,async()=>{
  const params=new URLSearchParams({action:'query',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'22',prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'660',format:'json',origin:'*'});
  const d=await getJSON('https://commons.wikimedia.org/w/api.php?'+params);
  return Object.values(d.query?.pages||{}).map(p=>{
   const i=p.imageinfo?.[0],title=String(p.title||'').replace(/^File:/,'').replace(/\.\w{2,6}$/,'');
   const source=i?.descriptionurl;
   const acceptable=String(i?.mime||'').startsWith('image/')&&!/image\/svg\+xml/i.test(i.mime||''); // avoid inline SVG embedding
   return acceptable&&/^https:\/\//.test(i?.thumburl||'')&&/^https:\/\/commons\.wikimedia\.org\//.test(source||'')
    ?{title,preview:i.thumburl,source}:null;
  }).filter(Boolean);
 });
}
function drawingsFor(query,person,works=[]){
 const subject=person||query;
 const core=normalize(subject);
 const fullTokens=tokens(subject);
 const surname=fullTokens.at(-1)||'';
 const workTerms=works.map(w=>tokens(w)).filter(x=>x.length);
 const candidateChecks=item=>{
  const t=normalize(item.title),name=tokens(item.title);
  const hasKind=FILE_PLAN.test(t)||FILE_SECTION.test(t);
  if(!hasKind)return false;
  if(!person){
   const q=normalize(query);
   const aliases={'gotica':'gothic','gotico':'gothic','romana':'roman','romano':'roman','griega':'greek','griego':'greek',
    'renacentista':'renaissance','barroca':'baroque','barroco':'baroque','moderna':'modern','contemporanea':'contemporary'};
   const style=Object.keys(aliases).find(w=>q.split(' ').includes(w));
   return !style||t.includes(style)||t.includes(aliases[style]);
  }
  return (surname.length>3&&(name.includes(surname)||name.some(n=>n.startsWith(surname)))) ||
   (fullTokens.length>=2&&fullTokens.every(w=>name.includes(w))) ||
   workTerms.some(arr=>(arr.length>=2&&arr.every(w=>name.includes(w)))||(arr.length===1&&arr[0].length>=9&&name.includes(arr[0])));
 };
 const generic=/^(arquitectura|arquitecturas|arquitectos|arquitectas|architecture|architects)$/.test(normalize(query));
 const queries=person?
  ['"'+subject+'" plan','"'+subject+'" architectural section',...works.slice(0,2).map(w=>'"'+w+'" floor plan')]:
  generic?['architecture floor plan','architectural section']:
  [query+' architectural plan',query+' architectural section'];
 return Promise.allSettled(queries.map(commonsSearch)).then(results=>{
  const combined=results.flatMap(r=>r.status==='fulfilled'&&Array.isArray(r.value)?r.value:[]);
  const unique=new Map();
  for(const img of combined){
   if(!candidateChecks(img))continue;
   if(!unique.has(img.source))unique.set(img.source,img);
  }
  return [...unique.values()].sort((a,b)=>{
   const kind=img=>FILE_PLAN.test(normalize(img.title))?0:1;
   return kind(a)-kind(b)||a.title.localeCompare(b.title);
  }).slice(0,12);
 });
}
function addDrawing(container,item){
 const fig=el('figure','architecture-drawing');
 const a=link('',item.source);
 const img=el('img');img.src=item.preview;img.alt=item.title;img.loading='lazy';img.decoding='async';
 a.append(img);fig.append(a);
 const caption=el('figcaption');
 const kind=FILE_SECTION.test(normalize(item.title))?
  localized('Corte / sección documental','Documented section','Coupe documentée'):
  localized('Planta / plano documental','Documented plan','Plan documenté');
 caption.append(el('strong','architecture-drawing-type',kind));
 caption.append(el('span','architecture-drawing-title',item.title));
 caption.append(link(localized('Ficha de Wikimedia Commons · autor y licencia','Wikimedia Commons · creator and license','Wikimedia Commons · auteur et licence'),item.source));
 fig.append(caption);container.append(fig);
}
function displayFacts(root,data){
 if(!data)return[];
 const {entity,labels}=data;
 const movements=[...new Set([...qids(entity,'P135'),...qids(entity,'P149')].map(id=>label(labels,id)).filter(Boolean))];
 if(movements.length)root.append(el('p','architecture-fact',localized('Corriente o estilo registrado: ','Recorded movement or style: ','Courant ou style documenté : ')+movements.join(' · ')));
 const start=claim(entity,'P2031').map(year).find(Number.isFinite);
 const end=claim(entity,'P2032').map(year).find(Number.isFinite);
 if(Number.isFinite(start)||Number.isFinite(end)){
  const period=(Number.isFinite(start)?start:'…')+' – '+(Number.isFinite(end)?end:'…');
  root.append(el('p','architecture-fact',localized('Período de actividad registrado: ','Recorded working period: ','Période d’activité attestée : ')+period));
 }
 return qids(entity,'P800').map(id=>label(labels,id)).filter(Boolean).slice(0,6);
}
/* Wikidata property P84 connects a building directly with its architect.
   We list only works with a Wikidata record, not similarly named pictures. */
function constructedWorks(id){
 if(!/^Q\d+$/.test(id||''))return Promise.resolve([]);
 return remember('buildings:'+id,async()=>{
  const sparql='SELECT DISTINCT ?work ?workLabel ?workDescription ?date ?locationLabel WHERE {'+
   ' ?work wdt:P84 wd:'+id+' .'+
   ' OPTIONAL { ?work wdt:P571 ?date . }'+
   ' OPTIONAL { ?work wdt:P131 ?location . }'+
   ' SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en,fr". }'+
   ' } LIMIT 35';
  const endpoint='https://query.wikidata.org/sparql?'+new URLSearchParams({query:sparql,format:'json'});
  const result=await getJSON(endpoint);
  const found=new Map();
  for(const entry of result.results?.bindings||[]){
   const uri=entry.work?.value||'';
   if(!/^https:\/\/www\.wikidata\.org\/entity\/Q\d+$/.test(uri))continue;
   const label=entry.workLabel?.value||'';
   if(!label||/^Q\d+$/.test(label))continue;
   const place=entry.locationLabel?.value||'';
   const date=String(entry.date?.value||'').match(/^-?\d{3,4}/)?.[0]||'';
   const recordDescription=String(entry.workDescription?.value||'');
   if(!found.has(uri))found.set(uri,{title:label,date,place:place&&!/^Q\d+$/.test(place)?place:'',
    description:recordDescription&&!/^Q\d+$/.test(recordDescription)?recordDescription:'',
    url:uri.replace('/entity/','/wiki/')});
  }
  return[...found.values()].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||a.title.localeCompare(b.title)).slice(0,30);
 });
}
/* A verified first page when external Wikidata or Commons APIs fail.
   UNESCO World Heritage Centre entry 1496 gives these eight component sites.
   This is a *curated verified subset*, not a claim of complete works. */
const certifiedSites={
 'frank lloyd wright':{
  source:'UNESCO · World Heritage Centre · n.º 1496 (2019)',
  url:'https://whc.unesco.org/en/list/1496',
  items:[
   ['Unity Temple','1906–1909','Oak Park, Illinois'],
   ['Frederick C. Robie House','1910','Chicago, Illinois'],
   ['Taliesin','1911–1959','Spring Green, Wisconsin'],
   ['Hollyhock House','1918–1921','Los Ángeles, California'],
   ['Fallingwater (Casa de la Cascada)','1936–1939','Mill Run, Pennsylvania'],
   ['Herbert and Katherine Jacobs House','1936–1937','Madison, Wisconsin'],
   ['Taliesin West','desde 1938','Scottsdale, Arizona'],
   ['Solomon R. Guggenheim Museum','1956–1959','Nueva York']
  ]
 }
};
async function findArchitectQid(subject,existing){
 if(/^Q\d+$/.test(existing||''))return existing;
 const query=String(subject||'').trim();
 if(!query)return null;
 const url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({
  action:'wbsearchentities',search:query,language:'en',limit:'12',type:'item',format:'json',origin:'*'
 });
 const response=await remember('architect-id:'+normalize(query),()=>getJSON(url).catch(()=>null));
 const q=normalize(query);
 const matches=(response?.search||[]).filter(x=>{
  const full=normalize(x.label||'');
  const alias=normalize(x.match?.text||'');
  const source=q===full||q===alias;
  const profession=/architect|arquitect|architet|architecte|baumeister|bauhaus/i.test(String(x.description||''));
  return source&&profession&&/^Q\d+$/.test(x.id||'');
 });
 return matches.length===1?matches[0].id:null; // Ambiguous identity is not guessed.
}

/* Editorial identifications tied to UNESCO's Frank Lloyd Wright component sites.
   Photos themselves are retrieved from the matching building's Wikimedia record. */
const architecturalNotes={
 'unity temple':['Templo de hormigón armado; combina el espacio de culto con una organización innovadora de la luz.','Unity Temple'],
 'frederick c robie house':['Casa de la Escuela de la Pradera, conocida por sus amplias líneas horizontales.','Robie House'],
 'taliesin':['Residencia y estudio de Wright integrados en el paisaje de Wisconsin.','Taliesin (studio)'],
 'hollyhock house':['Residencia proyectada para Aline Barnsdall en Los Ángeles.','Hollyhock House'],
 'fallingwater casa de la cascada':['Casa construida sobre una cascada, con terrazas en voladizo y arquitectura integrada al paisaje.','Fallingwater'],
 'herbert and katherine jacobs house':['Uno de los primeros ejemplos de vivienda usoniana de Wright.','Herbert Jacobs House'],
 'taliesin west':['Estudio, residencia y centro de enseñanza en el desierto de Arizona.','Taliesin West'],
 'solomon r guggenheim museum':['Museo de Nueva York organizado alrededor de una rampa helicoidal.','Solomon R. Guggenheim Museum']
};
function listConstructedWorks(root,name,id,valid){
 const section=el('section','architecture-built-list');
 heading(section,localized('Obras de arquitectura','Architectural works','Œuvres architecturales'));
 root.append(section);
 const list=el('ol','architecture-work-stack');section.append(list);
 const certified=certifiedSites[normalize(name)];
 const seen=new Set();
 function addWork(work,provenance){
  const title=normalize(work.title||'');
  if(!title||seen.has(title))return;
  seen.add(title);
  const item=el('li','architecture-work-item');
  item.append(link(work.title+' ↗',work.url));
  if(work.date||work.place)item.append(el('p','architecture-work-meta',[work.date,work.place].filter(Boolean).join(' · ')));
  if(provenance)item.append(el('p','architecture-work-meta',provenance));
  list.append(item);
  window.VitruviaArchitectVisuals?.enhance(item,work);
 }
 if(certified){
  section.append(el('p','context-note',localized(
   'Selección documental: ocho edificios incluidos en la Lista del Patrimonio Mundial de la UNESCO (2019). No es el catálogo completo del arquitecto.',
   'Documented selection: eight buildings inscribed on the UNESCO World Heritage List (2019). This is not a complete catalogue.',
   'Sélection documentaire : huit édifices inscrits au patrimoine mondial de l’UNESCO en 2019. Il ne s’agit pas d’un catalogue complet.'
  )));
  for(const [title,date,place] of certified.items){
   const [description,photoTitle]=architecturalNotes[normalize(title)]||[];
   addWork({title,date,place,description,photoTitle,url:certified.url},null);
  }
  section.append(link(localized('Fuente: ficha oficial de UNESCO ↗','Source: UNESCO official record ↗','Source : fiche officielle UNESCO ↗'),certified.url));
 }
 const status=el('p','context-note',localized('Consultando otras obras documentadas…','Checking additional documented works…','Recherche d’autres œuvres documentées…'));
 section.append(status);
 void (async()=>{
  const resolved=await findArchitectQid(name,id);
  if(!valid()||!section.isConnected)return;
  if(!resolved){
   status.textContent=localized('No se pudieron verificar más obras en el catálogo externo.','No additional works could be verified in the external catalogue.','Aucune œuvre supplémentaire vérifiable dans le catalogue externe.');
   return;
  }
  const items=await constructedWorks(resolved);
  if(!valid()||!section.isConnected)return;
  if(items?.length){
   for(const work of items)addWork(work,'Wikidata · P84');
   status.remove();
  }else{
   status.textContent=localized('No se recuperaron otras obras atribuidas con certeza de Wikidata.','No further confidently attributed works were retrieved from Wikidata.','Aucune autre œuvre attribuée avec certitude récupérée de Wikidata.');
  }
  const follow=link(localized('Más obras en Wikidata ↗','More works in Wikidata ↗','Autres œuvres sur Wikidata ↗'),'https://www.wikidata.org/wiki/'+resolved);
  section.append(follow);
 })().catch(()=>{
  if(!valid()||!section.isConnected)return;
  status.textContent=localized('El catálogo externo no respondió. Se conservan las obras verificadas arriba.','The external catalogue did not respond; verified works above remain visible.','Le catalogue externe ne répond pas ; les œuvres vérifiées ci-dessus restent visibles.');
 });
}
function render(panel,query,rows,stillCurrent){
 const subject=classify(query,rows);
 if(!subject)return;
 const area=el('section','architecture-sources');
 heading(area,subject.kind==='person'?
  localized('Arquitectura · trayectoria y obras','Architecture · career and works','Architecture · carrière et œuvres'):
  subject.kind==='building'?
  localized('Obra arquitectónica e ingeniería','Building and engineering work','Architecture et ingénierie'):
  localized('Arquitectura · planos y cortes','Architecture · drawings and sections','Architecture · plans et coupes'));
 panel.append(area);
 const apiId=subject.identity?.wikidataId;
 if(subject.kind==='person')listConstructedWorks(area,subject.subject,apiId,stillCurrent);
 if(subject.kind==='building'&&subject.identity){
  const identified=subject.identity,name=subject.subject;
  const section=el('section','architecture-built-list');
  heading(section,localized('Edificio · fotografía y documentación','Building · photographs and documentation','Édifice · photographies et documentation'));
  area.append(section);
  const list=el('ol','architecture-work-stack');section.append(list);
  const card=el('li','architecture-work-item');
  card.append(link(name+' ↗',identified.link));
  const desc=short(identified.entityDescription||identified.fullExtract||identified.excerpt||'');
  window.VitruviaArchitectVisuals?.enhance(card,{
   title:name,photoTitle:identified.entityCanonical||name,url:identified.link,
   description:desc.slice(0,230)+(desc.length>230?'…':'')
  });
  list.append(card);
 }

 const summary=subject.kind==='person'?
  localized('Estilo y años de actividad según registros documentales, cuando constan. Los planos se atribuyen solo si la fuente permite relacionarlos con este arquitecto o sus obras.',
   'Style and working years are shown only when documented. Drawings are attributed only when their source links them to the architect or a known work.',
   'Le style et les années d’activité ne sont indiqués que lorsqu’ils sont documentés. Les plans ne sont attribués que si la source les associe à l’architecte ou à une œuvre.') :
  localized('Ejemplos documentales de planos y cortes. La arquitectura incluye distintos estilos y épocas; estas imágenes no corresponden necesariamente a un mismo autor.',
   'Documentary examples of plans and sections across different styles and periods. They are not necessarily by the same architect.',
   'Exemples documentaires de plans et de coupes de différentes époques et styles, sans attribution à un auteur unique.');
 area.append(el('p','context-note',summary));
 if(subject.kind==='person'&&subject.identity){
  const extract=short(subject.identity.fullExtract||subject.identity.excerpt||subject.identity.entityDescription||'');
  if(extract)area.append(el('p','context-note',extract.slice(0,500)+(extract.length>500?'…':'')));
  if(/^https:\/\//.test(subject.identity.link||''))area.append(link(
    localized('Biografía y fuentes de la ficha ↗','Biography and sources ↗','Biographie et sources ↗'),subject.identity.link));
 }
 const facts=el('div','architecture-facts');area.append(facts);
 const gallery=el('div','architecture-gallery');area.append(gallery);
 const status=el('p','context-note',localized('Buscando planos y cortes documentados…','Searching documented plans and sections…','Recherche de plans et coupes documentés…'));gallery.append(status);
 const present=async()=>{
  let works=[];
  if(subject.kind==='person'&&apiId){
   const d=await wikidata(apiId);
   if(!stillCurrent()||!area.isConnected)return;
   works=displayFacts(facts,d);
   facts.append(link(localized('Consultar metadatos en Wikidata ↗','View metadata in Wikidata ↗','Consulter les métadonnées Wikidata ↗'),'https://www.wikidata.org/wiki/'+apiId));
  }
  const results=await drawingsFor(subject.subject,subject.kind==='person'?subject.subject:null,works);
  if(!stillCurrent()||!area.isConnected)return;
  gallery.replaceChildren();
  if(results.length)for(const item of results)addDrawing(gallery,item);
  else gallery.append(el('p','context-note',localized(
   'No se encontraron imágenes cuya identidad y tipo de dibujo puedan verificarse con suficiente seguridad. Consulta la búsqueda documental de Commons.',
   'No drawings could be matched to the subject with sufficient confidence. Try the Commons documentary search.',
   'Aucun dessin ne peut être associé avec suffisamment de certitude. Consultez la recherche documentaire de Commons.')));
  const url='https://commons.wikimedia.org/w/index.php?'+new URLSearchParams({search:subject.subject+' (plan OR section OR floor plan)',title:'Special:MediaSearch',type:'image'});
  gallery.append(link(localized('Buscar más planos en Wikimedia Commons ↗','Find more drawings on Wikimedia Commons ↗','Chercher plus de plans sur Wikimedia Commons ↗'),url));
 };
 void present().catch(()=>{
  if(!stillCurrent()||!area.isConnected)return;
  gallery.replaceChildren(el('p','context-note',localized('La fuente de imágenes no está disponible ahora.','Image source temporarily unavailable.','Source d’images temporairement indisponible.')));
 });
}
window.VitruviaArchitecture={classify,render};
})();