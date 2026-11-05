/* Vitruvia: one general-purpose lexical and topical relevance model for all queries.
 * Broad queries and names are compared against whole subjects; this does not
 * synthesize answers, claim that a source is verified, or change the corpus.
 */
(()=>{"use strict";
const stop=new Set("a al de del desde el la las lo los un una unos unas y e o en por para con sobre entre se su sus que qué cual quien como donde es esta este ese esos esas do da dos das der die des du le les the of and for from with in an at by to is are what how who which about au aux et sur di della il gli i um uma".split(/\s+/));
const intent=new Set("origen origenes historia historico historica evolucion significado definicion definiciones etimologia etimologias explicacion explicaciones informacion introduccion research investigation investigacion antecedentes vida biografia biografias fotos imagenes obras libros quien que cual how what why where who meaning origins origin history historical definition introduction evolution explained biography".split(/\s+/));
const roles=new Set("politico politica procer militar general libertador libertadora presidente presidenta rey reina emperador emperatriz escritor escritora poeta cientifico cientifica filosofo filosofa arquitecto arquitecta cantante musico musica pintor pintora actor actriz argentino argentina argentina argentina argentinos argentinas frances francesa ingles inglesa romano romana italiano italiana brasileno brasilena espanol espanola historiador historiadora militar argentino britanico britanica".split(/\s+/));
const spelling=new Set([...roles,"argentino","argentina","politico","politica","procer","militar","cartografia","medieval","antiguo","antigua","vitruvio","vitruvius"]);
const groups=[
 ["mapa","mapamundi","cartografia","cartografico","planisferio","worldmap","mapping"],
 ["antiguo","antigua","antiguedad","ancient","historical","historico","historica"],
 ["automovil","coche","carro","auto","vehiculo"],
 ["proporcion","proportio","symmetria","simetria","symmetry"],
 ["escritura","texto","escrito","writing"]
];
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const stem=s=>{let w=norm(s);if(w.length>=7&&w.endsWith("es"))w=w.slice(0,-2);else if(w.length>=5&&w.endsWith("s"))w=w.slice(0,-1);return w};
const dist1=(a,b)=>{
 if(a===b)return true;
 if(a.length<5||b.length<5||Math.abs(a.length-b.length)>1||a.slice(0,2)!==b.slice(0,2))return false;
 if(a.length===b.length){let mismatch=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])mismatch.push(i);return mismatch.length===1||(mismatch.length===2&&mismatch[1]===mismatch[0]+1&&a[mismatch[0]]===b[mismatch[1]]&&a[mismatch[1]]===b[mismatch[0]])}
 let short=a.length<b.length?a:b,long=a.length>b.length?a:b,i=0,j=0,errors=0;
 while(i<short.length&&j<long.length){if(short[i]===long[j]){i++;j++;}else{if(++errors>1)return false;j++;}}
 return true;
};
const corrected=w=>{const raw=stem(w);if(spelling.has(raw))return raw;const hits=[...spelling].filter(v=>dist1(raw,v));return hits.length===1?hits[0]:raw};
const tokenize=s=>[...new Set(norm(s).split(" ").filter(w=>w.length>=2&&!stop.has(w)).map(corrected).filter(Boolean))];
const match=(a,b)=>{
 if(a===b)return true;
 const ca=stem(a),cb=stem(b);if(ca===cb)return true;
 if(ca.length>=5&&cb.length>=5&&dist1(ca,cb))return true;
 return groups.some(g=>g.includes(ca)&&g.includes(cb));
};
const contains=(subject,term)=>subject.some(w=>match(w,term));
function focus(query){
 const raw=norm(query),t=tokenize(raw).filter(w=>!intent.has(w));
 if(!t.length)return raw;
 const main=t.filter(w=>!roles.has(w));
 // Descriptors can be removed from a multiword person's name. Never remove
 // the only subject of a search ("politica argentina", "militar romano").
 if(main.length&&main.length<t.length)return main.join(" ");
 return t.join(" ");
}
function variants(query){
 const original=norm(query),primary=focus(query),all=[primary];
 if(primary!==original)all.push(original);
 const tokens=tokenize(primary),maps=tokens.some(w=>match(w,"mapa"));
 if(maps){const other=tokens.filter(w=>!match(w,"mapa"));
  for(const alternate of ["mapamundis","cartografia"]){
   all.push([alternate,...other].join(" "));
  }
 }
 return[...new Set(all.filter(Boolean))].slice(0,4);
}
function analyze(query,record={}){
 const subject=tokenize(focus(query)),title=tokenize(record.title||record.canonical||""),description=tokenize([record.description,record.excerpt,record.snippet,record.entityDescription].filter(Boolean).join(" "));
 const aliases=Array.isArray(record.aliases)?record.aliases:[];
 const exact=norm(record.title||record.canonical||"")===norm(query)||aliases.some(a=>norm(a)===norm(query));
 const titleHits=subject.filter(w=>contains(title,w)).length;
 const totalHits=subject.filter(w=>contains([...title,...description],w)).length;
 const needed=subject.length>1?Math.min(2,subject.length):1;
 let accepted=exact||!!(subject.length&&(titleHits>=needed||(titleHits>=1&&totalHits>=needed)));
 const roleWords=tokenize(query).filter(w=>roles.has(w));
 const personWords=roleWords.filter(w=>!new Set("argentino argentina romano romana frances francesa ingles inglesa italiano italiana espanol espanola brasileno brasilena britanico britanica".split(" ")).has(w));
 if(personWords.length&&subject.length){
  const human=record.entityKind==="person"||/person|human/.test(String(record.kind||""))||
   ["militar","politico","procer","general","nacio","libertador","presidente","escritor","cientifico","filosofo","poeta","revolucionario"].some(w=>contains(description,w));
  if(!human&&titleHits<subject.length)accepted=false;
  if(/localidad|municipio|ciudad|comuna|departamento|provincia|village|town/.test(norm([record.description,record.excerpt].join(" ")))&&!human)accepted=false;
 }
 const score=(exact?1800:0)+titleHits*240+totalHits*80+Math.round(430*titleHits/Math.max(1,subject.length))+
 (titleHits===subject.length&&subject.length?420:0)-Math.max(0,subject.length-titleHits)*150;
 return{accepted,score,titleHits,totalHits,focus:focus(query),exact};
}
window.VitruviaQueryRelevance={norm,focus,variants,analyze,tokenize,match};
})();