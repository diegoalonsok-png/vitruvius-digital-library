/* Generic archive discovery for canonical historical entities, not a hand-coded
 * person whitelist. Wikidata SPARQL is a source of indexed metadata ONLY.
 * External institutional links remain available if SPARQL fails or is incomplete.
 */
(()=>{"use strict";
const cache=new Map();
const norm=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const allowed=url=>{try{const u=new URL(url);return u.protocol==="https:"?u.href:null}catch{return null}};
const val=(row,key)=>row?.[key]?.value||"";
const manuscriptTerms=/\b(codex|codice|codices|manuscript|manuscrit|manuscrito|notebook|sketchbook|papyrus|papyri|scroll|carnet|album|quaderno|taccuino)\b/i;
function externalCatalogues(query){
 const q=encodeURIComponent(query);
 return [
  {type:"portal",title:"Europeana · manuscritos y objetos originales",url:"https://www.europeana.eu/es/search?query="+q},
  {type:"portal",title:"Gallica · Bibliothèque nationale de France",url:"https://gallica.bnf.fr/Search?q="+q},
  {type:"portal",title:"Biblissima · manuscritos históricos",url:"https://portail.biblissima.fr/"},
  {type:"portal",title:"Biblioteca Apostolica Vaticana · catálogo digital",url:"https://digi.vatlib.it/"},
  {type:"portal",title:"WorldCat · manuscritos y ediciones",url:"https://search.worldcat.org/search?q="+q}
 ];
}
function dateYear(text){
 const date=String(text||"");const match=date.match(/^[+]?(0[5-9]\d\d|1\d{3}|20\d{2})-/);
 return match?Number(match[1]):9999;
}
function buildQuery(id){
 return [
  "SELECT DISTINCT ?item ?itemLabel ?date ?collectionLabel ?official ?reference ?fullText ?image ?shelfmark WHERE {",
  " VALUES ?creator { wd:"+id+" }",
  " { ?item wdt:P170 ?creator } UNION { ?item wdt:P50 ?creator }",
  " OPTIONAL { ?item wdt:P571 ?yearCreated }",
  " OPTIONAL { ?item wdt:P577 ?yearPublished }",
  " BIND(COALESCE(?yearCreated,?yearPublished) AS ?date)",
  " OPTIONAL { ?item wdt:P195 ?collection }",
  " OPTIONAL { ?item wdt:P856 ?official }",
  " OPTIONAL { ?item wdt:P973 ?reference }",
  " OPTIONAL { ?item wdt:P953 ?fullText }",
  " OPTIONAL { ?item wdt:P996 ?image }",
  " OPTIONAL { ?item wdt:P217 ?shelfmark }",
  ' SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en,it,fr". }',
  "}",
  "LIMIT 160"
 ].join("\n");
}
function mapRecord(record){
 const id=val(record,"item").match(/\/(Q\d+)$/)?.[1],title=val(record,"itemLabel");
 if(!id||!title||!manuscriptTerms.test(norm(title)))return null;
 const collection=val(record,"collectionLabel"),date=val(record,"date");
 const official=allowed(val(record,"official"))||allowed(val(record,"reference"));
 const digital=allowed(val(record,"fullText")),wikidata="https://www.wikidata.org/wiki/"+id;
 const viewer=digital||official||null;
 return {
  type:"manuscript",archiveDiscovery:true,
  title,author:collection||"Custodia pendiente de verificar",
  excerpt:"Manuscrito vinculado al creador en Wikidata. Verificar autoría, datación, procedencia y conservación en la institución.",
  meta:"METADATOS DE AUTORIDAD · "+(date?date.slice(0,10):"sin fecha de copia")+" · "+(collection||"biblioteca no indicada"),
  rating:110,source:"Wikidata · registro abierto",
  codexDate:dateYear(date),codexRepository:collection,
  codexShelfmark:val(record,"shelfmark"),
  link:official||wikidata,viewerUrl:viewer,codexViewer:viewer,
  links:[{label:"Ficha Wikidata · confirmar atribución",url:wikidata},
         ...(official?[{label:"Ficha institucional enlazada",url:official}]:[]),
         ...(digital?[{label:"Texto digital indicado en catálogo",url:digital}]:[])],
  archiveId:id
 };
}
async function search(query){
 const q=String(query||"").trim();
 const portals=externalCatalogues(q);
 if(q.length<3||q.length>130)return {rows:[],portals,reason:"invalid-query"};
 const identity=await window.VitruviaEntityResolver?.resolve(q).catch(()=>null);
 const id=identity?.wikidataId;
 if(!/^Q[1-9]\d{0,12}$/.test(id||""))return {rows:[],portals,reason:"authority-not-found"};
 const canonical=norm(identity.canonical),requested=norm(q);
 if(canonical!==requested&&!identity.aliases?.some(a=>norm(a)===requested))
  return {rows:[],portals,reason:"entity-not-exactly-resolved"};
 const params=new URLSearchParams({format:"json",query:buildQuery(id)});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),11000);
 try{
  const response=await fetch("https://query.wikidata.org/sparql?"+params.toString(),
   {headers:{Accept:"application/sparql-results+json"},signal:controller.signal});
  if(!response.ok)throw Error("Wikidata HTTP "+response.status);
  const data=await response.json(),records=(data.results?.bindings||[]).map(mapRecord).filter(Boolean);
  const seen=new Set(),rows=[];
  for(const record of records){if(seen.has(record.archiveId))continue;seen.add(record.archiveId);rows.push(record)}
  rows.sort((a,b)=>a.codexDate-b.codexDate||a.title.localeCompare(b.title));
  return {rows:rows.slice(0,35),portals,reason:rows.length?"catalogued":"no-codices-in-authority",identity};
 }catch(error){return {rows:[],portals,reason:"service-unavailable",warning:String(error.message||error)}}
 finally{clearTimeout(timer)}
}
window.VitruviaArchives={search(query){const key=norm(query);if(!cache.has(key))cache.set(key,search(query));return cache.get(key)},externalCatalogues};
})();