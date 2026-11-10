/* Universal, source-linked cultural catalogue. Identity comes from an authority
   record; works require P800 or a direct authorship/creation relationship.
   Prominence is documentary (notable works + catalogue coverage), not a verdict. */
(()=>{'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const lang=()=>['es','en','fr'].includes(document.documentElement.lang)?document.documentElement.lang:'es';
const L=(es,en,fr)=>lang()==='en'?en:lang()==='fr'?fr:es;
const el=(tag,cl,value)=>{const e=document.createElement(tag);if(cl)e.className=cl;if(value!==undefined)e.textContent=String(value);return e};
const link=(value,url)=>{const a=el('a',null,value);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a};
const qid=id=>/^Q\d+$/.test(id||'');
const values=(entity,property)=>(entity?.claims?.[property]||[]).filter(c=>c.rank!=='deprecated').sort((a,b)=>Number(b.rank==='preferred')-Number(a.rank==='preferred')).map(c=>c.mainsnak?.datavalue?.value).filter(v=>v!==undefined);
const ids=(entity,property)=>values(entity,property).map(v=>v.id).filter(qid);
const label=entity=>entity?.labels?.[lang()]?.value||entity?.labels?.en?.value||entity?.labels?.es?.value||entity?.labels?.fr?.value||'';
const description=entity=>entity?.descriptions?.[lang()]?.value||entity?.descriptions?.en?.value||entity?.descriptions?.es?.value||'';
const cache=new Map();
async function get(url){
 if(!cache.has(url)){
  const pending=(async()=>{
   const control=new AbortController(),timer=setTimeout(()=>control.abort(),8500);
   try{const response=await fetch(url,{signal:control.signal,headers:{Accept:'application/json'}});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(data.error)throw Error('Catalogue unavailable');return data}
   finally{clearTimeout(timer)}
  })().catch(()=>{cache.delete(url);return null});
  cache.set(url,pending);
 }
 return cache.get(url);
}
async function entities(list){
 const unique=[...new Set(list.filter(qid))].slice(0,50);
 if(!unique.length)return {};
 const data=await get('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:unique.join('|'),props:'labels|aliases|descriptions|claims|sitelinks',languages:'es|en|fr',format:'json',origin:'*'}));
 return data?.entities||{};
}
const relationships={architect:['P84','P287'],author:['P50'],music:['P175'],composer:['P86'],visual:['P170','P110','P14574'],cinema:['P57','P58','P162','P161'],general:['P50','P84','P86','P170','P175','P57','P287','P61','P178']};
async function related(id,kind){
 const properties=relationships[kind]||relationships.general;
 const query='SELECT DISTINCT ?work ?coverage WHERE { VALUES ?relation { '+properties.map(p=>'wdt:'+p).join(' ')+' } '+
  '?work ?relation wd:'+id+' . OPTIONAL { ?work wikibase:sitelinks ?coverage . } } ORDER BY DESC(?coverage) LIMIT 40';
 const data=await get('https://query.wikidata.org/sparql?'+new URLSearchParams({query,format:'json'}));
 const records=(data?.results?.bindings||[]).map(row=>({id:String(row.work?.value||'').match(/^https?:\/\/www\.wikidata\.org\/entity\/(Q\d+)$/)?.[1],coverage:Number(row.coverage?.value)||0})).filter(row=>qid(row.id));
 return {records,available:!!data};
}
function workRecord(entity,notable,coverage=0){
 const title=label(entity),instances=ids(entity,'P31');
 if(!qid(entity?.id)||!title||/^Q\d+$/.test(title)||instances.some(id=>['Q5','Q4167410','Q4167836','Q13406463'].includes(id)))return null;
 const desc=description(entity),claims=entity.claims||{};
 const building=!!claims.P84||/\b(building|house|museum|bridge|cathedral|edificio|casa|museo|puente|catedral|palacio|stadium|temple|villa|tower|skyscraper)\b/.test(norm(desc));
 // A date is meaningful only with its Wikidata property. An inauguration
 // (P1619) must not be silently treated as the year of design or construction.
 const dateProps=building?['P571','P1619','P577']:['P577','P571','P575'];
 const candidate=dateProps.map(property=>{
  const statement=(entity.claims?.[property]||[]).find(c=>c.rank!=='deprecated'&&
   typeof c.mainsnak?.datavalue?.value?.time==='string');
  return statement?{property,statement,time:statement.mainsnak.datavalue.value.time}:null;
 }).find(Boolean);
 const year=candidate?.time.match(/^([+-])(\d+)/);
 const numericYear=year?Number(year[2])*(year[1]==='-'?-1:1):null;
 const dateProperty=candidate?.property||'';
 const dateKind=dateProperty==='P1619'?'opening':dateProperty==='P571'?'inception':dateProperty==='P577'?'publication':dateProperty==='P575'?'discovery':'undated';
 const dateReferenced=!!candidate?.statement?.references?.length;
 const site=entity.sitelinks?.[lang()+'wiki']||entity.sitelinks?.enwiki||entity.sitelinks?.eswiki;
 const wikiLang=site?.site?.replace(/wiki$/,'');
 const href=site?.url||(wikiLang&&site?.title?'https://'+wikiLang+'.wikipedia.org/wiki/'+encodeURIComponent(site.title.replace(/ /g,'_')):'https://www.wikidata.org/wiki/'+entity.id);
 const picture=values(entity,'P18').find(x=>typeof x==='string')||'';
 const planFile=values(entity,'P3311').find(x=>typeof x==='string')||'';
 const commonsFile=file=>file?'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(file.replace(/ /g,'_')):'';
 return {id:entity.id,title,description:desc,year:numericYear,date:numericYear===null?'':numericYear<0?Math.abs(numericYear)+' '+L('a. C.','BCE','av. J.-C.'):String(numericYear),
  dateKind,dateProperty,dateReferenced,
  href,picture,image:commonsFile(picture),plan:commonsFile(planFile),notable,coverage:Math.max(coverage,Object.keys(entity.sitelinks||{}).filter(x=>/wiki$/.test(x)).length),building,
  photoTitle:entity.sitelinks?.enwiki?.title||site?.title||title,wikiLang,wikiTitle:site?.title||'',aliases:Object.values(entity.labels||{}).map(x=>x.value)};
}
function compare(a,b,order='year'){
 if(order==='year')return (a.year??99999)-(b.year??99999)||a.title.localeCompare(b.title);
 return Number(b.notable)-Number(a.notable)||b.coverage-a.coverage||(a.year??99999)-(b.year??99999)||a.title.localeCompare(b.title);
}
async function catalogue(identity,kind){
 if(!qid(identity?.wikidataId))return {works:[],available:false};
 const id=identity.wikidataId;
 const [subject,reverse]=await Promise.all([entities([id]),related(id,kind)]);
 const creator=subject[id];
 const notable=[...new Set([...ids(creator,'P800'),...(identity.notableWorkIds||[]).filter(qid)])].slice(0,40);
 const all=[...new Set([...notable,...reverse.records.map(x=>x.id)])].slice(0,50);
 const records=await entities(all);
 const works=all.map(work=>workRecord(records[work],notable.includes(work),reverse.records.find(x=>x.id===work)?.coverage)).filter(Boolean).sort((a,b)=>compare(a,b,'year'));
 return {works,available:!!creator||reverse.available,partial:!creator||!reverse.available};
}
async function preview(item,work,valid){
 let source='',href=work.href;
 if(work.picture){
  const d=await get('https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',titles:'File:'+work.picture,prop:'imageinfo',iiprop:'url',iiurlwidth:'420',format:'json',origin:'*'}));
  const info=Object.values(d?.query?.pages||{}).find(x=>x.imageinfo?.[0])?.imageinfo?.[0];
  source=info?.thumburl||info?.url||'';href=info?.descriptionurl||href;
 }
 if(!source&&work.wikiLang&&work.wikiTitle){
  const d=await get('https://'+work.wikiLang+'.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',titles:work.wikiTitle,redirects:'1',prop:'pageimages',piprop:'thumbnail',pithumbsize:'420',pilicense:'any',format:'json',origin:'*'}));
  const page=Object.values(d?.query?.pages||{}).find(x=>x.thumbnail?.source);
  source=page?.thumbnail?.source||'';
 }
 if(!valid()||!item.isConnected||!/^https:\/\//.test(source))return;
 const a=link('',href);a.className='web-dossier-cover-link';
 const img=el('img','web-dossier-cover');img.src=source;img.alt=work.title;img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>a.remove());a.append(img);item.prepend(a);
}
function showWorks(root,works,valid){
 const controls=el('label','cultural-order',L('Orden cronológico','Chronological order','Ordre chronologique'));
 const select=el('select');select.setAttribute('aria-label',L('Orden de las obras culturales','Cultural works order','Ordre des œuvres culturelles'));
 for(const [value,text] of [['year',L('Más antiguas primero','Oldest first','Plus anciennes d’abord')],['importance',L('Importancia documental','Documentary prominence','Importance documentaire')]]){const option=el('option',null,text);option.value=value;select.append(option)}
 controls.append(select);root.append(controls);
 root.append(el('p','web-dossier-count',L(
  'Registros recuperados: '+works.length+'. Orden por la primera fecha tipificada disponible (inicio, apertura o publicación); las obras sin fecha van al final. No es un catálogo exhaustivo.',
  'Retrieved records: '+works.length+'. Ordered by earliest available typed date (inception, opening or publication); undated works follow. Not an exhaustive catalogue.',
  'Notices récupérées : '+works.length+'. Classées par date qualifiée (conception, ouverture ou publication) ; notices non datées en dernier. Catalogue non exhaustif.')));
 const stack=el('div','web-dossier-stack cultural-work-stack');root.append(stack);
 const cards=new Map();let expanded=true;
 const limit=works.length;
 for(const work of works){
  let item;
  if(work.building){
   item=el('article','architecture-work-item cultural-building');item.append(link(work.title+' ↗',work.href));
   if(work.date)item.append(el('p','architecture-work-meta',
    (work.dateKind==='opening'?L('Apertura','Opening','Ouverture'):
     work.dateKind==='inception'?L('Inicio / concepción','Inception','Conception'):
     work.dateKind==='publication'?L('Publicación','Publication','Publication'):
     work.dateKind==='discovery'?L('Hallazgo','Discovery','Découverte'):
     L('Fecha registrada','Recorded date','Date enregistrée'))+': '+work.date+
    ' · Wikidata '+work.dateProperty+(work.dateReferenced?' · '+L('con referencia','with citation','avec référence'):
     ' · '+L('sin referencia de origen en el dato','no cited source in this claim','sans source citée dans la déclaration'))));
   if(work.notable)item.append(el('span','cultural-notable',L('Obra destacada','Notable work','Œuvre notable')));
   item.append(link('Wikidata ↗','https://www.wikidata.org/wiki/'+work.id));stack.append(item);
   window.VitruviaArchitectVisuals?.enhance(item,{...work,previewDrawings:cards.size===0});
  }else{
   item=el('article','web-dossier-card cultural-work');const body=el('div','web-dossier-card-body');
   body.append(link(work.title+' ↗',work.href));
   const dateValue=work.date?
    (work.dateKind==='publication'?L('Publicación','Publication','Publication'):
     work.dateKind==='inception'?L('Inicio','Inception','Conception'):
     work.dateKind==='opening'?L('Apertura','Opening','Ouverture'):L('Fecha','Date','Date'))+
    ': '+work.date+' · '+work.dateProperty:'';
   body.append(el('p','web-dossier-meta',[dateValue,work.notable?L('Obra destacada','Notable work','Œuvre notable'):'','Wikidata · '+work.id].filter(Boolean).join(' · ')));
   if(work.description)body.append(el('p','web-dossier-description',work.description));
   body.append(link(L('Ficha y fuentes ↗','Record and sources ↗','Fiche et sources ↗'),'https://www.wikidata.org/wiki/'+work.id));item.append(body);stack.append(item);
   // A bounded number of image requests, including the first visible cards.
   if(typeof IntersectionObserver!=='undefined'){
    const observer=new IntersectionObserver(entries=>{if(!item.isConnected){observer.disconnect();return}if(entries.some(e=>e.isIntersecting)){observer.disconnect();void preview(item,work,valid)}},{rootMargin:'200px'});observer.observe(item);
   }else void preview(item,work,valid);
  }
  item.hidden=cards.size>=limit;cards.set(work.id,item);
 }
 function arrange(){[...works].sort((a,b)=>compare(a,b,select.value)).forEach((work,index)=>{const item=cards.get(work.id);item.hidden=!expanded&&index>=limit;stack.append(item)})}
 select.addEventListener('change',arrange);
 if(works.length>limit){const more=el('button','context-biblio-more');more.type='button';
  const update=()=>{more.textContent=expanded?L('Mostrar menos obras','Show fewer works','Afficher moins d’œuvres'):L('Ver las '+works.length+' obras','Show all '+works.length+' works','Afficher les '+works.length+' œuvres');more.setAttribute('aria-expanded',String(expanded))};
  more.addEventListener('click',()=>{expanded=!expanded;arrange();update()});update();root.append(more);
 }
}
async function render(root,identity,kind,valid){
 const section=el('section','cultural-notable-works');
 section.append(el('h4','context-section-title',kind==='architect'?L('Obras de arquitectura e ingeniería','Architecture and engineering works','Architecture et ingénierie'):L('Obras destacadas','Notable works','Œuvres notables')));
 const status=el('p','context-note',L('Buscando obras e imágenes documentadas…','Finding documented works and images…','Recherche des œuvres et images documentées…'));section.append(status);root.append(section);
 const result=await catalogue(identity,kind);
 if(!valid()||!section.isConnected)return [];
 status.remove();
 if(result.works.length)showWorks(section,result.works,valid);
 else{
  section.append(el('p','context-note',result.available?L('No se recuperaron obras con atribución directa en este catálogo.','No directly attributed works were retrieved from this catalogue.','Aucune œuvre directement attribuée retrouvée dans ce catalogue.'):L('El catálogo de obras no está disponible ahora.','Works catalogue temporarily unavailable.','Catalogue des œuvres temporairement indisponible.')));
 }
 section.append(link(L('Consultar el catálogo de origen ↗','Open source catalogue ↗','Consulter le catalogue source ↗'),'https://www.wikidata.org/wiki/'+identity.wikidataId));
 return result.works;
}
window.VitruviaCulturalWorks={render,catalogue,compare};
})();
