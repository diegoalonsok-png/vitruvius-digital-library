/* Generic encyclopedia entity resolver. No whitelist of historical names.
 * Finds exact titles/redirects, then authoritative search results. Public APIs only.
 */
(()=>{"use strict";
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
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
  imageFiles:values("P18").filter(x=>typeof x==="string").slice(0,4),birthYear:born?Number(born[1]):null};
}
// Remove generic *intent* expressions but do not hard-code personalities.
const clean=q=>{
 const full=String(q||"").trim();
 const cleaned=full.replace(/^(?:(?:qué|que|quién|quien|who|what)\s+(?:es|fue|is|was)\s+|(?:biograf[ií]a|historia|vida|vida y obra|obras|pinturas|cuadros|retratos|fotograf[ií]as|fotos|im[aá]genes|pel[ií]culas|filmograf[ií]a|libros|tratados)\s+(?:de|del|sobre)\s+|(?:paintings|artworks|pictures|photographs|photos|images|films|movies|works|biography|history)\s+(?:of|by|about)\s+)/i,"").trim();
 return cleaned.length>=3?cleaned:full;
};
const invalid=p=>!p||p.missing!==undefined||p.pageprops?.disambiguation!==undefined||/(?:desambiguaci[oó]n|disambiguation|homonymie)/i.test(p.title||"");
async function lookupTitle(title,lang){
 const d=await get(mediaWiki(lang,{action:"query",titles:title,redirects:"1",prop:"extracts|info|pageprops",explaintext:"1",exsectionformat:"wiki",inprop:"url"}));
 const pages=Object.values(d.query?.pages||{});
 const page=pages.find(p=>!invalid(p));
 if(!page)return null;
 return {canonical:page.title,description:page.extract?.slice(0,360)||"",extract:page.extract||"",pageid:page.pageid,wikidataId:/^Q\d+$/.test(page.pageprops?.wikibase_item||"")?page.pageprops.wikibase_item:null,language:lang,url:page.fullurl||"https://"+lang+".wikipedia.org/wiki/"+encodeURIComponent(page.title.replace(/ /g,"_")),aliases:(d.query?.redirects||[]).map(x=>x.from),type:"encyclopedia"};
}
async function searchTitle(q,lang){
 const d=await get(mediaWiki(lang,{action:"query",list:"search",srsearch:q,srlimit:"6",srprop:"snippet",utf8:"1"}));
 const hits=d.query?.search||[];
 const exact=hits.find(x=>norm(x.title)===norm(q));
 const first=exact||hits.find(x=>!/(?:desambiguaci[oó]n|disambiguation)/i.test(x.title));
 return first?lookupTitle(first.title,lang):null;
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
  const coverage=Object.keys(entity.sitelinks||{}).filter(x=>/wiki$/.test(x)).length;
  const score=(exactLabel?140:0)+(exactAlias?130:0)+(searchMatch?45:0)+
   Math.min(coverage,180)*3+
   (site.site===lang+"wiki"?35:0)+
   Math.max(0,25-Math.min(...searches.map(x=>x.rank),20)*4);
  return {id,entity,title:site.title,lang:site.site?.replace(/wiki$/,"")||lang,
   score,coverage,description:entity.descriptions?.[lang]?.value||entity.descriptions?.es?.value||entity.descriptions?.en?.value||""};
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
  authorityCoverage:best.coverage,disambiguated:true}:null;
}
async function resolve(query,preferredLang="es"){
 const q=clean(query);
 if(!q||q.length>130)return null;
 const lang=["es","en","fr"].includes(preferredLang)?preferredLang:"es";
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
const cache=new Map();
window.VitruviaEntityResolver={subject:clean,resolve(q,lang="es"){
 const key=norm(clean(q))+":"+lang;
 if(!cache.has(key))cache.set(key,resolve(q,lang));
 return cache.get(key);
}};
})();
