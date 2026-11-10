/* Offline, deterministic, wide regression of the real Vitruvia entity resolver.
 * These are provider-shaped fixtures, not claims of live browser verification.
 * No external HTTP, login, budget or network dependency.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const normalize=value=>String(value||"").normalize("NFD")
 .replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const records=[
 ["Q1","Salvador Dalí",["Dalí","Dali"],1904,"pintor y artista español",120],
 ["Q2","Joan Miró",["Miró","Miro"],1893,"pintor y escultor español",115],
 ["Q3","Tutankamón",["Tutancamon","Tutankhamun","King Tut","Rey Tut","Tut"],-1341,"faraón de Egipto",160],
 ["Q4","Tut",["King Tut"],2020,"pizzería y restaurante",2],
 ["Q5","Dalí",["Dali"],2020,"pizzería en El Cairo",3],
 ["Q6","Herodes el Grande",["Herodes","Rey Herodes","King Herod"],-73,"rey de Judea",145],
 ["Q7","Madonna",["Madonna Louise Ciccone"],1958,"cantante y música",145],
 ["Q8","Virgen María",["Madonna"],-25,"figura religiosa antigua",140],
 ["Q9","Ramsés II",["Ramses II","Ramesses II"],-1303,"faraón de Egipto",145],
 ["Q10","Akenatón",["Akenaton","Akhenaten","Ajenatón"],-1350,"faraón de Egipto",140],
 ["Q11","Pablo Picasso",["Picasso"],1881,"pintor español",140],
 ["Q12","Virgilio",["Virgil","Publius Vergilius Maro"],-70,"poeta romano",130],
 ["Q13","Cicerón",["Cicero","Marco Tulio Cicerón"],-106,"orador y escritor romano",130],
 ["Q14","Andrea Palladio",["Palladio"],1508,"arquitecto italiano",135],
 ["Q15","Albert Einstein",["Einstein"],1879,"científico y físico",140],
 ["Q16","Marie Curie",["Maria Curie"],1867,"científica y física",140],
 ["Q17","Le Corbusier",["Charles-Édouard Jeanneret"],1887,"arquitecto",130],
 ["Q18","Julio César",["Julius Caesar"],-100,"general romano",140],
 ["Q19","Cleopatra",["Cleopatra VII"],-69,"reina egipcia",140],
 ["Q20","Miró",[],2020,"marca comercial de muebles",3],
 ["Q21","Sócrates",["Socrates"],-470,"filósofo griego",135],
 ["Q22","Aristóteles",["Aristoteles","Aristotle"],-384,"filósofo griego",145],
 ["Q23","Isaac Newton",["Newton"],1643,"físico y científico británico",155],
 ["Q24","Lionel Messi",["Messi"],1987,"futbolista argentino",155],
 ["Q25","Taylor Swift",[],1989,"cantante y compositora",155]
];
const db={};
for(const [id,name,aliases,born,description,coverage] of records){
 const sitelinks={eswiki:{site:"eswiki",title:name},enwiki:{site:"enwiki",title:name}};
 for(let i=2;i<coverage;i++)sitelinks["l"+i+"wiki"]={site:"l"+i+"wiki",title:name};
 db[id]={labels:{es:{value:name},en:{value:name}},
  aliases:{es:aliases.map(value=>({value}))},
  descriptions:{es:{value:description},en:{value:description}},
  sitelinks,claims:{
   P31:[{mainsnak:{datavalue:{value:{id:born===2020?"Q4830453":"Q5"}}}}],
   P569:[{mainsnak:{datavalue:{value:{time:(born<0?"-":"+")+
    String(Math.abs(born)).padStart(4,"0")+"-01-01T00:00:00Z"}}}}]
  }};
}
let requests=[],failWikipedia=false;
async function fakeFetch(url){
 const params=new URL(url).searchParams,p=Object.fromEntries(params.entries());
 requests.push([p.action,p.search||p.titles||p.ids||""]);
 let result={};
 if(p.action==="wbsearchentities"){
  const q=normalize(p.search);
  const matches=Object.entries(db).filter(([,entity])=>
   [...Object.values(entity.labels).map(x=>x.value),...Object.values(entity.aliases).flat().map(x=>x.value)]
    .some(name=>normalize(name).includes(q)))
   .map(([id,entity])=>({id,label:entity.labels.es.value,description:entity.descriptions.es.value,match:{text:p.search}}));
  result={search:matches.slice(0,Number(p.limit||10))};
 }else if(p.action==="wbgetentities"){
  result={entities:Object.fromEntries((p.ids||"").split("|")
   .filter(id=>db[id]).map(id=>[id,db[id]]))};
 }else if(p.action==="query"&&p.titles){
  const entry=Object.entries(db).find(([,entity])=>normalize(entity.labels.es.value)===normalize(p.titles));
  if(entry){
   const [id,entity]=entry;
   result={query:{pages:{p:{title:entity.labels.es.value,pageid:123,
    pageprops:{wikibase_item:id},extract:entity.descriptions.es.value,
    fullurl:"https://es.wikipedia.org/wiki/"+encodeURIComponent(entity.labels.es.value)}}}};
  }else result={query:{pages:{p:{missing:true}}}};
 }else if(p.action==="query"&&p.pageids)result={query:{pages:{p:{langlinks:[]}}}};
 else if(p.action==="query"&&p.list==="search")result={query:{search:[]}};
 return {ok:!(failWikipedia&&url.includes("wikipedia.org")),json:async()=>result};
}
const windowStub={};
const resolverSource=readFileSync("assets/vitruvia-entity-resolver.js","utf8");
new Function("window","fetch","URLSearchParams","AbortController","setTimeout","clearTimeout",resolverSource)(
 windowStub,fakeFetch,URLSearchParams,AbortController,setTimeout,clearTimeout
);
const cases=[
 ["Dalí","Salvador Dalí"],["Dali","Salvador Dalí"],
 ["Miró","Joan Miró"],["Miro","Joan Miró"],
 ["Ramses II","Ramsés II"],["Ramesses II","Ramsés II"],
 ["Rey Herodes","Herodes el Grande"],["King Herod","Herodes el Grande"],
 ["Tutancamon","Tutankamón"],["Tutankhamun","Tutankamón"],
 ["Rey Tut","Tutankamón"],["King Tut","Tutankamón"],
 ["Akenaton","Akenatón"],["Akhenaten","Akenatón"],
 ["Virgilio","Virgilio"],["Cicero","Cicerón"],
 ["Palladio","Andrea Palladio"],["Picasso","Pablo Picasso"],
 ["Einstein","Albert Einstein"],["Marie Curie","Marie Curie"],
 ["Madonna","Madonna"],["Le Corbusier","Le Corbusier"],
 ["Julio César","Julio César"],["Cleopatra","Cleopatra"],
 ["Obras de Dalí","Salvador Dalí"],["Miró pinturas","Joan Miró"],
 ["Dalí pintor","Salvador Dalí"],["el pintor Dalí","Salvador Dalí"],
 ["Picasso artista","Pablo Picasso"],["el rey Tut","Tutankamón"],
 ["Ramsés II faraón","Ramsés II"],["Sócrates filósofo","Sócrates"],
 ["Aristóteles filósofo","Aristóteles"],["Isaac Newton","Isaac Newton"],
 ["Newton","Isaac Newton"],["Messi","Lionel Messi"],
 ["Taylor Swift","Taylor Swift"],["Palladio arquitectura","Andrea Palladio"],
 ["quién fue Ramses II","Ramsés II"]
];
let checks=0;
for(const [query,expected] of cases){
 requests=[];
 const resolved=await windowStub.VitruviaEntityResolver.resolve(query,"es");
 assert.equal(resolved?.canonical,expected,"Authority mismatch for "+query);
 assert.equal(resolved?.kind,"person","Must resolve a person, not a business: "+query);
 assert(/^Q\d+$/.test(resolved.wikidataId),"Verified entity ID required: "+query);
 assert(requests.filter(([action])=>action==="wbsearchentities").length<=4,
  "Excessive Wikidata request fan-out for "+query);
 checks++;
}
// A network failure in the secondary encyclopedia must not silently throw
// away an already-verified identity from Wikidata.
failWikipedia=true;
const fallback=await windowStub.VitruviaEntityResolver.resolve("Salvador Dalí","es");
assert.equal(fallback?.canonical,"Salvador Dalí");
assert.equal(fallback?.authorityOnly,true);
assert.equal(fallback?.wikidataId,"Q1");
failWikipedia=false;
checks++;

const searchSource=readFileSync("assets/vitruvia-search.js","utf8");
const start=searchSource.indexOf("function authorityResult(");
const end=searchSource.indexOf("async function search()",start);
assert(start>0&&end>start,"Missing fast authority rendering function");
const authorityResult=new Function(searchSource.slice(start,end)+"\nreturn authorityResult;")();
const wikidataCard=authorityResult(fallback);
assert.equal(wikidataCard.type,"wikidata");
assert.equal(wikidataCard.preferredAuthority,true);
assert(!wikidataCard.preferredWiki,"Do not attribute a missing extract to Wikipedia");
assert(wikidataCard.link.includes("wikidata.org/wiki/Q1"));
checks++;

const personStart=searchSource.indexOf("function verifiedPersonEvidence(");
const personEnd=searchSource.indexOf("function authorityWeight(",personStart);
assert(personStart>0&&personEnd>personStart);
const normalizer=value=>String(value||"").normalize("NFD")
 .replace(/[\u0300-\u036f]/g,"").toLowerCase()
 .replace(/[^\p{L}\p{N}.]+/gu," ").replace(/\s+/g," ").trim();
const accepted=new Function("norm",searchSource.slice(personStart,personEnd)+
 "\nreturn verifiedPersonEvidence;")(normalizer);
const tut={kind:"person",wikidataId:"Q3",canonical:"Tutankamón",aliases:["Rey Tut","King Tut"]};
assert.equal(accepted({type:"wikipedia",title:"King Tut Pizzeria",excerpt:"A restaurant"},"Rey Tut",tut),false);
assert.equal(accepted({type:"wikipedia",title:"Tutankamón",preferredWiki:true,wikidataId:"Q3"},"Rey Tut",tut),true);
assert.equal(accepted({type:"wikidata",title:"Tutankamón",preferredAuthority:true,wikidataId:"Q3"},"Rey Tut",tut),true);
assert.equal(accepted({type:"wikipedia",title:"Tutankamón",preferredWiki:true,wikidataId:"Q999"},"Rey Tut",tut),false);
checks+=4;

assert(searchSource.includes("let previewIdentity=null;")&&
 searchSource.includes("display([authorityResult(identity)],q,"),
 "A verified identity must be displayed before the local catalogue finishes");
assert(searchSource.includes("!codexIntent&&!locusIntent&&!textualIntent")&&
 searchSource.includes("const textualIntent="),
 "Manuscripts, explicit editions and passage lookups must retain priority over biographies");
const articleSource=readFileSync("assets/vitruvia-article.js","utf8");
assert(articleSource.includes("if(!wiki&&verifiedAuthority)")&&
 articleSource.includes("verifiedAuthority?null:await topicWikiData"),
 "Research article must show an authority card rather than an unverified namesake");
checks+=3;
console.log("PASS Vitruvia: "+checks+" broad offline authority, ranking, fallback and speed-path assertions");
