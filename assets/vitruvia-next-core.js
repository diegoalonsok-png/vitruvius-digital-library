/* Independent Vitruvia Next search core. No legacy UI or global event bus. */
(function(root){
"use strict";
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const aliases={"akenaton":"Akenatón","ajenaton":"Akenatón","akhenaten":"Akenatón","tutankamon":"Tutankamón","brunellesci":"Filippo Brunelleschi","cesar cesarin":"Cesare Cesariano","cesar cesariano":"Cesare Cesariano","palladio":"Andrea Palladio","vitruvio":"Vitruvio","mies":"Ludwig Mies van der Rohe","frank loys write":"Frank Lloyd Wright"};
const subject=(q,lang)=>lang==="es"?(aliases[fold(q)]||q):q;
const params=o=>Object.entries(o).map(([k,v])=>encodeURIComponent(k)+"="+encodeURIComponent(v)).join("&");
const wikiParams=(q,lang,mode="search")=>{if(!["es","en","fr","it","de","pt"].includes(lang))throw Error("Unsupported language");return "https://"+lang+".wikipedia.org/w/api.php?"+params({action:"query",format:"json",formatversion:"2",origin:"*",redirects:"1",prop:"extracts|pageprops|info|pageimages",inprop:"url",exintro:"1",explaintext:"1",exchars:"1600",exlimit:"max",pithumbsize:"240",piprop:"thumbnail",...(mode==="title"?{titles:subject(q,lang)}:{generator:"search",gsrsearch:subject(q,lang),gsrnamespace:"0",gsrlimit:"8"})})};
function pages(data,lang){
 if(data?.error)throw Error(data.error.info||"Wikipedia API");
 return (data?.query?.pages||[]).filter(p=>!p.missing&&Number.isInteger(p.pageid)&&p.ns===0).map(p=>({id:p.pageid,title:p.title,extract:p.extract||"",url:"https://"+lang+".wikipedia.org/?curid="+p.pageid,rank:p.index??999,ambiguous:Object.hasOwn(p.pageprops||{},"disambiguation"),qid:p.pageprops?.wikibase_item||"",image:p.thumbnail?.source||"",source:"Wikipedia · "+lang.toUpperCase()})).sort((a,b)=>a.rank-b.rank);
}
function combine(direct,search){const seen=new Set();return [...direct,...search].filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true})}
function catalog(items,q){
 const query=fold(q);if(!query)return [];
 const terms=query.split(" ");
 return items.map(w=>{const author=fold(w.author),title=fold(w.title),id=fold(w.id),all=author+" "+title+" "+id;let score=author===query?100:title===query?95:author.startsWith(query)?85:title.startsWith(query)?80:terms.every(t=>all.includes(t))?60:0;return {w,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(a.w.title).localeCompare(String(b.w.title))).map(x=>x.w);
}
function wikiLink(q,lang){return "https://"+lang+".wikipedia.org/w/index.php?"+params({search:q})}
root.VitruviaNextCore={fold,subject,wikiParams,pages,combine,catalog,wikiLink};
})(globalThis);
