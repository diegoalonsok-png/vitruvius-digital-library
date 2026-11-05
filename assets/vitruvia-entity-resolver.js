/* Generic encyclopedia entity resolver. No whitelist of historical names.
 * Finds exact titles/redirects, then authoritative search results. Public APIs only.
 */
(()=>{"use strict";
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
// Bounded spelling tolerance for whole names, including adjacent transpositions.
// A page merely mentioning the words is never enough to identify the subject.
function distance(a,b){
 const rows=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
 for(let i=0;i<=a.length;i++)rows[i][0]=i;
 for(let j=0;j<=b.length;j++)rows[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
  rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+Number(a[i-1]!==b[j-1]));
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
 }
 return rows[a.length][b.length];
}
function nameSimilarity(query,name){
 const a=norm(query),b=norm(String(name||'').replace(/\s*\([^)]*\)\s*$/,''));
 if(!a||!b)return 0;
 if(a===b)return 1;
 const aa=a.split(' '),bb=b.split(' ');
 // Short tokens (Le, U2, AC) must match; longer tokens allow 1–2 edits each.
 const used=new Set();let edits=0;
 for(const word of aa){
  let best=null;
  bb.forEach((target,index)=>{if(used.has(index))return;const d=distance(word,target);if(!best||d<best.d)best={index,d}});
  const limit=word.length<=3?0:word.length<=6?1:2;
  if(!best||best.d>limit){
   const x=a.replace(/ /g,''),y=b.replace(/ /g,'');
   const d=distance(x,y);
   return Math.max(x.length,y.length)>=7&&d<=2&&1-d/Math.max(x.length,y.length)>=.78?1-d/Math.max(x.length,y.length):0;
  }
  used.add(best.index);edits+=best.d;
 }
 const score=1-edits/Math.max(1,a.length);
 return score>=.78?score:0;
}
const get=async(url)=>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
 try{const r=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);return await r.json()}
 finally{clearTimeout(timer)}
};
const mediaWiki=(lang,parameters)=>"https://"+lang+".wikipedia.org/w/api.php?"+new URLSearchParams({...parameters,format:"json",origin:"*"});
function entityMetadata(entity){
 const values=property=>(entity.claims?.[property]||[]).filter(c=>c.rank!=="deprecated").map(c=>c.mainsnak?.datavalue?.value).filter(v=>v!==undefined);
 const instanceOf=values("P31").map(v=>v.id).filter(Boolean);
 const born=values("P569")[0]?.time?.match(/^([+-]\d+)/);
 return {entityMetadata:!!entity.claims,instanceOf,kind:instanceOf.length?(instanceOf.includes("Q5")?"person":"topic"):null,
  aliases:[...new Set([...Object.values(entity.labels||{}).map(x=>x.value),...Object.values(entity.aliases||{}).flat().map(x=>x.value)])].slice(0,40),
  commonsSearchName:entity.labels?.en?.value||"",commonsCategory:values("P373")[0]||null,
  imageFiles:values("P18").filter(x=>typeof x==="string").slice(0,4),
  notableWorkIds:values("P800").map(v=>v.id).filter(Boolean).slice(0,50),
  occupationIds:values("P106").map(v=>v.id).filter(Boolean),
  catalogName:entity.labels?.["en"]?.value||entity.labels?.["es"]?.value||"",birthYear:born?Number(born[1]):null};
}
// Remove generic *intent* expressions but do not hard-code personalities.
const clean=q=>{
 const full=String(q||"").trim();
 const cleaned=full.replace(/^(?:(?:qué|que|quién|quien|who|what)\s+(?:es|fue|is|was)\s+|(?:biograf[ií]a|historia|vida|vida y obra|obras|pinturas|cuadros|retratos|fotograf[ií]as|fotos|im[aá]genes|pel[ií]culas|filmograf[ií]a|libros|tratados|[aá]lbumes|discos|discograf[ií]a|planos|plantas|cortes|fachadas)\s+(?:de|del|sobre)\s+|(?:paintings|artworks|pictures|photographs|photos|images|films|movies|works|biography|history|albums|discography|plans)\s+(?:of|by|about)\s+)/i,"").trim();
 // Search intent at the end belongs to a creator, not to the title of a
 // similarly named UNESCO collection, book or other subject.
 const suffix=/\s+(?:obras|obra|arquitectura|edificios|proyectos|construcciones|puentes|planos|fachadas|buildings|projects|works|architecture|architectural works|filmografia|discografia|discography|albumes|álbumes|albums|peliculas|películas|films|movies|libros|books|pinturas|paintings|bibliografia|bibliografía)$/i;
 let subject=cleaned;
 for(let i=0;i<2;i++){
  const next=subject.replace(suffix,"").trim();
  if(next===subject||norm(next).length<3)break;
  subject=next;
 }
 return subject.length>=3?subject:full;
};
const invalid=p=>!p||p.missing!==undefined||p.pageprops?.disambiguation!==undefined||/(?:desambiguaci[oó]n|disambiguation|homonymie)/i.test(p.title||"");
async function lookupTitle(title,lang){
 const d=await get(mediaWiki(lang,{action:"query",titles:title,redirects:"1",prop:"extracts|info|pageprops",explaintext:"1",exsectionformat:"wiki",inprop:"url"}));
 const pages=Object.values(d.query?.pages||{});
 const page=pages.find(p=>!invalid(p));
 if(!page)return null;
 return {canonical:page.title,description:page.extract?.slice(0,360)||"",extract:page.extract||"",pageid:page.pageid,wikidataId:/^Q\d+$/.test(page.pageprops?.wikibase_item||"")?page.pageprops.wikibase_item:null,language:lang,url:page.fullurl||"https://"+lang+".wikipedia.org/wiki/"+encodeURIComponent(page.title.replace(/ /g,"_")),aliases:(d.query?.redirects||[]).map(x=>x.from),type:"encyclopedia"};
}
/* Multiword names: each meaningful token must match an entire name token
   with small typo tolerance; one shared first name is never sufficient. */
function fullNameMatch(input,candidate){
 const a=norm(input).split(" ").filter(Boolean),b=norm(candidate).replace(/\s*\([^)]*\)\s*$/,"").split(" ").filter(Boolean);
 if(a.length<2)return nameSimilarity(input,candidate)>0;
 const used=new Set();
 let matched=0,errors=0;
 for(const word of a){
  let best=null;
  b.forEach((target,i)=>{
   if(used.has(i))return;
   const d=distance(word,target);
   const limit=word.length<4?0:word.length<=6?1:2;
   if(d<=limit&&(!best||d<best.d))best={i,d};
  });
  if(!best)return false;
  used.add(best.i);matched++;errors+=best.d;
 }
 // No partial match to another person; typo allowance scales with length.
 return matched===a.length&&errors<=Math.max(2,Math.floor(norm(input).length/8));
}
async function searchTitle(q,lang,suggest=true){
 const d=await get(mediaWiki(lang,{action:"query",list:"search",srsearch:q,srlimit:"8",srprop:"snippet",srinfo:"suggestion|rewrittenquery",utf8:"1"}));
 const hits=d.query?.search||[];
 const matches=hits.filter(x=>!/(?:desambiguaci[oó]n|disambiguation)/i.test(x.title)).map((x,index)=>({x,index,score:nameSimilarity(q,x.title)})).filter(x=>x.score>0&&fullNameMatch(q,x.x.title)).sort((a,b)=>b.score-a.score||a.index-b.index);
 if(matches[0]){
  const page=await lookupTitle(matches[0].x.title,lang);
  return page?{...page,spellingMatch:norm(q)!==norm(page.canonical)?q:null}:null;
 }
 // Broad semantic fallback: Wikipedia fuzzy titles, but validate the full
 // multiword identity before using the result as a person's name.
 if(norm(q).split(" ").length>=2){
  try{
   const d2=await get(mediaWiki(lang,{action:"opensearch",search:q,limit:"12",namespace:"0",profile:"fuzzy"}));
   const titles=Array.isArray(d2)?d2[1]||[]:[];
   const candidate=titles.find(name=>fullNameMatch(q,name));
   if(candidate){
    const page=await lookupTitle(candidate,lang);
    if(page)return {...page,spellingMatch:norm(q)===norm(page.canonical)?null:q};
   }
  }catch{}
 }
 // If one component of a multiword name is misspelled, search the
 // remaining components, but accept only an ENTIRE name that fits the input.
 const parts=norm(q).split(" ").filter(Boolean);
 if(parts.length>=2&&parts.length<=5){
  const probes=parts.map((_,i)=>parts.filter((__,j)=>i!==j).join(" "))
   .filter(x=>x.length>=4).slice(0,4);
  const candidates=await Promise.allSettled(probes.map(term=>get(mediaWiki(lang,{
   action:"query",list:"search",srsearch:term,srlimit:"7",srprop:"",utf8:"1"
  }))));
  const names=candidates.flatMap(result=>result.status==="fulfilled"?
   (result.value.query?.search||[]).map(x=>x.title):[]);
  const matched=[...new Set(names)].find(name=>fullNameMatch(q,name));
  if(matched){
   const page=await lookupTitle(matched,lang);
   if(page)return {...page,spellingMatch:norm(q)===norm(page.canonical)?null:q};
  }
 }
 const correction=d.query?.searchinfo?.suggestion||d.query?.searchinfo?.rewrittenquery;
 if(suggest&&typeof correction==='string'&&norm(correction)!==norm(q)&&nameSimilarity(q,correction)>0){
  const page=await searchTitle(correction,lang,false);
  return page?{...page,spellingMatch:q}:null;
 }
 return null;
}
async function localize(identity,lang){
 if(!identity||identity.language===lang||!["es","en","fr"].includes(lang))return identity;
 try{
  const json=await get(mediaWiki(identity.language,{
   action:"query",pageids:String(identity.pageid),prop:"langlinks",lllang:lang,lllimit:"1"
  }));
  const page=Object.values(json.query?.pages||{})[0];
  const alternate=page?.langlinks?.find(x=>x.lang===lang)?.["*"];
  if(!alternate)return identity;
  const translated=await lookupTitle(alternate,lang);
  return translated?{...identity,...translated,aliases:[...new Set([...(identity.aliases||[]),...(translated.aliases||[])])],wikidataId:translated.wikidataId||identity.wikidataId,originalCanonical:identity.canonical,localized:true}:identity;
 }catch{return identity}
}
// Disambiguate via Wikidata authority aliases and cross-language coverage.
// Matching an unaccented stage name must not outrank a widely attested
// historical figure merely because the article title is an exact string match.
async function authorityCandidates(q,lang){
 const languages=[...new Set([lang,"es","en"])];
 const hits=(await Promise.allSettled(languages.map(language=>
  get("https://www.wikidata.org/w/api.php?"+new URLSearchParams({
   action:"wbsearchentities",search:q,language,type:"item",limit:"9",format:"json",origin:"*"
  }))
 ))).flatMap((v,i)=>v.status==="fulfilled"?(v.value.search||[]).map((x,j)=>({...x,rank:j,searchLang:languages[i]})):[]);
 const ids=[...new Set(hits.map(x=>x.id).filter(x=>/^Q\d+$/.test(x)))].slice(0,14);
 if(!ids.length)return null;
 const d=await get("https://www.wikidata.org/w/api.php?"+new URLSearchParams({
  action:"wbgetentities",ids:ids.join("|"),props:"labels|aliases|descriptions|sitelinks",
  languages:"es|en|fr",format:"json",origin:"*"
 }));
 const ranked=ids.map(id=>{
  const entity=d.entities?.[id];if(!entity||entity.missing!==undefined)return null;
  const labels=Object.values(entity.labels||{}).map(x=>x.value);
  const aliases=Object.values(entity.aliases||{}).flat().map(x=>x.value);
  const site=entity.sitelinks?.[lang+"wiki"]||entity.sitelinks?.eswiki||entity.sitelinks?.enwiki;
  if(!site?.title)return null;
  const exactLabel=labels.some(x=>norm(x)===norm(q)),exactAlias=aliases.some(x=>norm(x)===norm(q));
  const searches=hits.filter(x=>x.id===id);
  const searchMatch=searches.some(x=>norm(x.label)===norm(q)||norm(x.match?.text)===norm(q));
  const queryTerms=norm(q).split(" ").filter(Boolean);
  const completeName=[...labels,...aliases].some(name=>queryTerms.every(term=>norm(name).split(" ").includes(term)));
  const similarity=Math.max(0,...labels.map(name=>nameSimilarity(q,name)));
  if(!exactLabel&&!exactAlias&&!searchMatch&&!completeName&&!similarity)return null;
   if(norm(q).split(" ").length>=2&&!exactLabel&&!exactAlias&&!completeName&&
     ![...labels,...aliases].some(name=>fullNameMatch(q,name)))return null;
  const coverage=Object.keys(entity.sitelinks||{}).filter(x=>/wiki$/.test(x)).length;
  // Prefer an exact primary name over an alias of a different, equally prominent entity.
  // Coverage can still disambiguate a little-known namesake from a major historical figure.
  const score=(exactLabel?500:exactAlias?130:similarity?360*similarity:0)+(searchMatch?45:0)+
   Math.min(coverage,180)*3+
   (site.site===lang+"wiki"?35:0)+
   Math.max(0,25-Math.min(...searches.map(x=>x.rank),20)*4);
  return {id,entity,title:site.title,lang:site.site?.replace(/wiki$/,"")||lang,
   score,coverage,spellingMatch:!exactLabel&&!exactAlias&&similarity?q:null,description:entity.descriptions?.[lang]?.value||entity.descriptions?.es?.value||entity.descriptions?.en?.value||""};
 }).filter(Boolean).sort((a,b)=>b.score-a.score);
 const best=ranked[0];
 if(!best||(best.score<130&&best.coverage<12))return null;
 const [page,details]=await Promise.allSettled([
  lookupTitle(best.title,best.lang),
  get("https://www.wikidata.org/w/api.php?"+new URLSearchParams({action:"wbgetentities",ids:best.id,props:"claims",format:"json",origin:"*"}))
 ]);
 const resolved=page.status==="fulfilled"?page.value:null;
 const entity={...best.entity,claims:details.status==="fulfilled"?details.value.entities?.[best.id]?.claims:undefined};
 return resolved?{...resolved,...entityMetadata(entity),wikidataId:best.id,authorityDescription:best.description,
  authorityCoverage:best.coverage,spellingMatch:best.spellingMatch,disambiguated:true}:null;
}
/* A surname + cultural discipline denotes a creator, not a dictionary topic.
   Inspect occupation in Wikidata search descriptions before selecting a namesake. */
async function qualifiedCreator(query,lang){
 const raw=String(query||"").trim();
 const roleMatch=raw.match(/^(?:obras?\s+(?:de|del)\s+)?(.+?)\s+(arquitectura|arquitecto|arquitecta|arquitecto\s+ingeniero|architecture|architect|arquitecte|filmografia|discografia|discography|peliculas|films|movies|libros|books|pinturas|paintings)$/i);
 if(!roleMatch)return null;
 const name=roleMatch[1].trim(),discipline=norm(roleMatch[2]);
 if(name.length<3||name.length>90)return null;
 const fields=/arquitect|architect/.test(discipline)?/\b(architect\w*|arquitect\w*|ingenier\w*|engineer\w*|architet\w*|architecte\w*)\b/i:
  /film|pelicul|movie/.test(discipline)?/\b(director|filmmaker|cineasta|actor|actress|actriz|film)\b/i:
  /disco/.test(discipline)?/\b(musician|music|singer|band|cantante|musico|grupo|composer)\b/i:
  /libro|book/.test(discipline)?/\b(writer|author|escritor|novelist|poet|poeta)\b/i:
  /\b(painter|artist|pintor|artista)\b/i;
 const languages=[...new Set([lang,"es","en"])];
 const entries=(await Promise.allSettled(languages.map(language=>get("https://www.wikidata.org/w/api.php?"+new URLSearchParams({
  action:"wbsearchentities",search:name,language,type:"item",limit:"25",format:"json",origin:"*"
 })) ))).flatMap((r,i)=>r.status==="fulfilled"?(r.value.search||[]).map((x,j)=>({...x,searchLang:languages[i],rank:j})):[]);
 const tokens=norm(name).split(" ").filter(Boolean);
 const candidates=[...new Map(entries.filter(x=>/^Q\d+$/.test(x.id||"")&&fields.test(x.description||"")&&
  tokens.every(t=>norm(x.label||"").split(" ").some(w=>w===t||w.startsWith(t)&&t.length>=5)))
  .map(x=>[x.id,x])).values()].sort((a,b)=>a.rank-b.rank);
 for(const candidate of candidates.slice(0,5)){
  const title=candidate.label;
  for(const language of [...new Set([lang,candidate.searchLang,"en","es"])]){
   try{
    const page=await lookupTitle(title,language);
    if(page?.wikidataId===candidate.id){
     return {...page,authorityDescription:candidate.description,spellingMatch:raw,
      qualifierResolved:true};
    }
   }catch{}
  }
 }
 return null;
}
async function resolve(query,preferredLang="es"){
 const q=clean(query);
 if(!q||q.length>130)return null;
 const lang=["es","en","fr"].includes(preferredLang)?preferredLang:"es";
 try{const creator=await qualifiedCreator(query,lang);if(creator)return await localize(creator,lang)}catch{}
 // Common, strongly identifiable shorthand for the 1968 film, not a generic year search.
 // Keep date-only queries ambiguous; 2001 film specifically refers to the title in this catalogue.
 const shorthand=norm(q);
 if(/^(?:2001(?: a)? (?:film|movie|pelicula)|2001 (?:odisea|odyssey)(?: (?:en|del|de|in|the|el|espacio|space|a))*|2001 a (?:pace|space) odyssey)$/.test(shorthand)){
  try{
   const film=await lookupTitle("2001: A Space Odyssey","en");
   if(film)return await localize({...film,spellingMatch:norm(q)===norm("2001: A Space Odyssey")?null:q},"es");
  }catch{}
 }
 // Wikidata has aliases such as "Virgen María" for the historical figure.
 // Direct page-title matching on another language can instead return a DJ.
 try{
  const authority=await authorityCandidates(q,lang);
  if(authority)return await localize(authority,lang);
 }catch{}
 const langs=[...new Set([lang,"es","en"])];
 for(const language of langs){
  try{
   const exact=await lookupTitle(q,language);
   if(exact&&(norm(exact.canonical)===norm(q)||exact.aliases.some(x=>norm(x)===norm(q))))
    return await localize(exact,lang);
  }catch{}
  // Search the preferred language BEFORE accepting an exact English homonym.
  try{const hit=await searchTitle(q,language);if(hit)return await localize(hit,lang)}catch{}
 }
 return null;
}
async function completeIdentity(identity){
 if(!identity||identity.entityMetadata||!/^Q\d+$/.test(identity.wikidataId||''))return identity;
 try{
  const data=await get('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:identity.wikidataId,props:'labels|aliases|descriptions|claims',languages:'es|en|fr',format:'json',origin:'*'}));
  const entity=data.entities?.[identity.wikidataId];
  if(entity)return {...identity,...entityMetadata(entity),authorityDescription:entity.descriptions?.[identity.language]?.value||entity.descriptions?.en?.value||identity.description};
 }catch{}
 return identity;
}
const cache=new Map();
window.VitruviaEntityResolver={subject:clean,resolve(q,lang="es"){
 const key=norm(clean(q))+":"+lang;
 if(!cache.has(key)){
  const pending=resolve(q,lang).then(completeIdentity).then(value=>{if(value&&!value.spellingMatch&&norm(clean(q))!==norm(value.canonical)&&nameSimilarity(clean(q),value.canonical)>0)value={...value,spellingMatch:clean(q)};if(!value&&cache.get(key)===pending)cache.delete(key);return value},error=>{if(cache.get(key)===pending)cache.delete(key);throw error});
  cache.set(key,pending);
 }
 return cache.get(key);
}};
})();
