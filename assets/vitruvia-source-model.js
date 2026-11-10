/* VITRUVIA · universal source acquisition and evidence normalization.
 * A URL, DOI, institutional domain or Wikimedia identifier is a reference,
 * NOT by itself proof of peer review, accuracy, endorsement or authorship.
 * The same rules apply to architects, writers, scientists, artefacts and topics.
 */
(()=>{"use strict";
const norm=value=>String(value??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase()
 .replace(/[^a-z0-9\p{L}]+/gu," ").trim();
const stop=new Set("a al el la las los de del en por para y e o un una unos unas the an of and for in on with to des du et le les la der die das und von da di do dos das da obra obras vida biografia historia quien quien fue who what works by".split(" "));
const terms=value=>[...new Set(norm(value).split(/\s+/).filter(t=>t.length>=3&&!stop.has(t)))];
function url(value){
 try{const u=new URL(String(value||""));if(u.protocol!=="https:"||!u.hostname)return "";
  u.hash="";for(const key of [...u.searchParams.keys()])if(/^utm_|^(?:fbclid|gclid|mc_cid|mc_eid)$/i.test(key))u.searchParams.delete(key);
  return u.toString();
 }catch{return ""}
}
function sourceType(row){
 const t=norm(row?.type||""),source=norm([row?.source,row?.recordKind,row?.journal].join(" "));
 const href=url(row?.link||row?.url),host=href?new URL(href).hostname:"";
 if(["passage","manuscript","folio","codex","primary","source"].includes(t))return "primary";
 if(row?.doi&&/^10\.\d{4,9}\/\S+$/i.test(row.doi)||t==="article"&&/journal|revista|doi/.test(source))return "scholarly-record";
 if(["wikipedia","wikidata","encyclopedia"].includes(t)||/(^|\.)wikipedia\.org$|(^|\.)wikidata\.org$|(^|\.)britannica\.com$/.test(host))return "encyclopedia";
 if(["museum","university","archive","authority","institutional"].includes(t)||/\.(?:edu|ac\.uk|edu\.ar)$/.test(host))return "institution";
 if(["edition","book","googlebook","openlibrary","library","catalogue"].includes(t)||/openlibrary\.org$|books\.google\./.test(host))return "catalogue";
 return "external";
}
function related(row,query,identity){
 if(!row||!query)return false;
 const q=norm(query),title=norm([row.title,row.entityCanonical].join(" ")),
  all=norm([row.title,row.entityCanonical,row.author,row.excerpt,row.entityDescription,row.fullExtract?.slice(0,500),...(Array.isArray(row.aliases)?row.aliases:[])].join(" "));
 const id=String(row.wikidataId||row.qid||"");
 if(/^Q\d+$/.test(identity?.qid||"")&&id===identity.qid)return true;
 if(title===q||(Array.isArray(row.aliases)&&row.aliases.some(x=>norm(x)===q)))return true;
 const tokens=terms(query);
 if(!tokens.length)return false;
 if(tokens.every(t=>all.split(" ").includes(t)))return true;
 // An explicit full-text match is still only a document result, not identity evidence.
 if(row.externalFulltext&&tokens.length===1&&all.includes(tokens[0]))return true;
 return false;
}
const priorities={"primary":0,"scholarly-record":1,"institution":2,"catalogue":3,"encyclopedia":4,"external":5};
function organize(query,rows,identity,limit=12){
 const relevant=[],seen=new Set(),provided=Array.isArray(rows)?rows:[];
 for(const row of provided){
  const href=url(row?.link||row?.url),title=String(row?.title||"").trim();
  if(!href||!title||!related(row,query,identity))continue;
  const doi=String(row.doi||"").trim().toLowerCase();
  const key=/^10\.\d{4,9}\/\S+$/i.test(doi)?"doi:"+doi:"url:"+href.toLowerCase();
  if(seen.has(key))continue;
  seen.add(key);
  const category=sourceType(row);
  const exact=norm(title)===norm(query)||norm(row.entityCanonical)===norm(query);
  relevant.push({title,href,category,doi:/^10\.\d{4,9}\/\S+$/i.test(doi)?doi:"",
   year:Number.isFinite(Number(row.year))?Number(row.year):null,
   excerpt:String(row.excerpt||row.entityDescription||"").trim().slice(0,180),
   exact,source:String(row.source||row.publisher||"").trim().slice(0,90),
   id:String(row.wikidataId||row.qid||"")});
 }
 relevant.sort((a,b)=>priorities[a.category]-priorities[b.category]||
  Number(b.exact)-Number(a.exact)||(a.year??99999)-(b.year??99999)||a.title.localeCompare(b.title));
 const counts={};for(const record of relevant)counts[record.category]=(counts[record.category]||0)+1;
 return {records:relevant.slice(0,Math.max(1,Math.min(limit,30))),total:relevant.length,counts,
  excluded:provided.length-relevant.length,
  note:"Clasificación y pertinencia automática; exige revisión de fuentes, autoría y contenido."};
}
window.VitruviaSourceModel={norm,terms,related,sourceType,organize};
})();