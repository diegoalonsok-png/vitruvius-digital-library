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
  return translated?{...translated,wikidataId:translated.wikidataId||identity.wikidataId,originalCanonical:identity.canonical,localized:true}:identity;
 }catch{return identity}
}
async function resolve(query,preferredLang="es"){
 const q=clean(query);
 if(!q||q.length>130)return null;
 const lang=["es","en","fr"].includes(preferredLang)?preferredLang:"es";
 const langs=[...new Set([lang,"es","en"])];
 for(const language of langs){
  try{
   const exact=await lookupTitle(q,language);
   if(exact&&(norm(exact.canonical)===norm(q)||exact.aliases.some(x=>norm(x)===norm(q))))
    return await localize(exact,lang);
  }catch{}
 }
 for(const language of langs){
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