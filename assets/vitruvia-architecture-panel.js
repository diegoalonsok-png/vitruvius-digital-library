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
 const wiki=rows.filter(x=>x.type==='wikipedia'&&x.link&&/architect|arquitect|architet|architecte/i.test(String(x.excerpt||'')+' '+String(x.entityDescription||'')))
  .filter(x=>{
    const t=tokens(x.title||x.entityCanonical||'');
    const nameTerms=qt.filter(w=>!['biografia','vida','obras','trabajo','estilo','disenos','diseños','planos','cortes','famoso','famosos','arquitectonico'].includes(w));
    return nameTerms.length?nameTerms.every(w=>t.includes(w)||t.some(z=>z.startsWith(w)||w.startsWith(z))):false;
  }).sort((a,b)=>Number(!!b.preferredWiki)-Number(!!a.preferredWiki));
 if(wiki.length)return{kind:'person',subject:short(wiki[0].title),identity:wiki[0]};
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
  const sparql='SELECT DISTINCT ?work ?workLabel ?date ?locationLabel WHERE {'+
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
   if(!found.has(uri))found.set(uri,{title:label,date,place:place&&!/^Q\d+$/.test(place)?place:'',url:uri.replace('/entity/','/wiki/')});
  }
  return[...found.values()].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||a.title.localeCompare(b.title)).slice(0,30);
 });
}
function listConstructedWorks(root,id,valid){
 const section=el('section','architecture-built-list');
 heading(section,localized('Obras de arquitectura documentadas','Documented architectural works','Œuvres architecturales documentées'));
 root.append(section);
 const status=el('p','context-note',localized('Consultando obras atribuidas en Wikidata…','Checking attributed architectural works in Wikidata…','Consultation des œuvres attribuées dans Wikidata…'));
 section.append(status);
 void constructedWorks(id).then(items=>{
  if(!valid()||!section.isConnected)return;
  section.replaceChildren();
  if(!items?.length){
   section.append(el('p','context-note',localized('El catálogo no devolvió obras arquitectónicas atribuidas con una ficha identificable.','The catalogue returned no independently identifiable architectural works.','Aucune œuvre architecturale identifiable n’a été renvoyée.')));
  }else{
   section.append(el('p','context-note',localized('Obras vinculadas al arquitecto en Wikidata (P84). La atribución puede contrastarse en cada ficha.','Works linked to the architect in Wikidata (P84). Consult each record to verify attribution.','Œuvres associées à l’architecte dans Wikidata (P84). Vérifiez chaque attribution dans sa notice.')));
   const stack=el('ol','architecture-work-stack');
   for(const work of items){
    const li=el('li','architecture-work-item');
    li.append(link(work.title+' ↗',work.url));
    if(work.date||work.place)li.append(el('p','architecture-work-meta',[work.date,work.place].filter(Boolean).join(' · ')));
    stack.append(li);
   }
   section.append(stack);
  }
  section.append(link(localized('Explorar las obras registradas en Wikidata ↗','Explore recorded works in Wikidata ↗','Explorer les œuvres répertoriées dans Wikidata ↗'),
   'https://www.wikidata.org/wiki/'+id));
 }).catch(()=>{if(valid()&&section.isConnected){
  section.replaceChildren(el('p','context-note',localized('No se pudo consultar el catálogo de obras.','Could not retrieve the works catalogue.','Impossible de consulter le catalogue des œuvres.')));
 }});
}
function render(panel,query,rows,stillCurrent){
 const subject=classify(query,rows);
 if(!subject)return;
 const area=el('section','architecture-sources');
 heading(area,subject.kind==='person'?
  localized('Arquitectura · trayectoria y obras','Architecture · career and works','Architecture · carrière et œuvres'):
  localized('Arquitectura · planos y cortes','Architecture · drawings and sections','Architecture · plans et coupes'));
 panel.append(area);
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
 const apiId=subject.identity?.wikidataId;
 if(subject.kind==='person'&&apiId){
  listConstructedWorks(area,apiId,stillCurrent);
 }
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