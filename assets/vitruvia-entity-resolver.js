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
const clean=q=>String(q||"").trim().replace(/^(?:quien fue|quien es|biografia de|vida de|biography of|who was|what is|que es)\s+/i,"").trim();
const invalid=p=>!p||p.missing!==undefined||p.pageprops?.disambiguation!==undefined||/(?:desambiguaci[oó]n|disambiguation|homonymie)/i.test(p.title||"");
async function lookupTitle(title,lang){
 const d=await get(mediaWiki(lang,{action:"query",titles:title,redirects:"1",prop:"extracts|info|pageprops",explaintext:"1",exsectionformat:"wiki",inprop:"url"}));
 const pages=Object.values(d.query?.pages||{});
 const page=pages.find(p=>!invalid(p));
 if(!page)return null;
 return {canonical:page.title,description:page.extract?.slice(0,360)||"",extract:page.extract||"",pageid:page.pageid,wikidataId:/^Q\\d+$/.test(page.pageprops?.wikibase_item||"")?page.pageprops.wikibase_item:null,language:lang,url:page.fullurl||"https://"+lang+".wikipedia.org/wiki/"+encodeURIComponent(page.title.replace(/ /g,"_")),aliases:(d.query?.redirects||[]).map(x=>x.from),type:"encyclopedia"};
}
async function searchTitle(q,lang){
 const d=await get(mediaWiki(lang,{action:"query",list:"search",srsearch:q,srlimit:"6",srprop:"snippet",utf8:"1"}));
 const hits=d.query?.search||[];
 const exact=hits.find(x=>norm(x.title)===norm(q));
 const first=exact||hits.find(x=>!/(?:desambiguaci[oó]n|disambiguation)/i.test(x.title));
 return first?lookupTitle(first.title,lang):null;
}
async function resolve(query){
 const q=clean(query);
 if(!q||q.length>130)return null;
 for(const language of ["es","en"]){
  try{
   const exact=await lookupTitle(q,language);
   if(exact&&(norm(exact.canonical)===norm(q)||exact.aliases.some(x=>norm(x)===norm(q))))return exact;
  }catch{}
 }
 for(const language of ["es","en"]){
  try{const hit=await searchTitle(q,language);if(hit)return hit}catch{}
 }
 return null;
}
const cache=new Map();
window.VitruviaEntityResolver={resolve(q){
 const key=norm(clean(q));
 if(!cache.has(key))cache.set(key,resolve(q));
 return cache.get(key);
}};
})();