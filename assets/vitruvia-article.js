/* VITRUVIA · lector documental interno.
   Artículos de consulta elaborados con extractos atribuidos, loci verificados y fichas.
   No genera hechos ni inventa citas. Wikipedia conserva atribución CC BY-SA.
*/
(()=>{"use strict";
const root=document.getElementById("vitruvia-article");if(!root)return;
const $=id=>document.getElementById(id);
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text||"");if(cls)e.className=cls;return e};
const normalized=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const sentences=s=>String(s||"").replace(/\s+/g," ").trim();
const cut=(s,n)=>{const x=sentences(s);return x.length>n?x.slice(0,n).replace(/\s+\S*$/,"")+"…":x};
let active=0;
const summaries=new Map();
function phrase(es,en,fr){const l=document.documentElement.lang;return l==="en"?en:l==="fr"?fr:es}
function href(url,text){if(!url)return null;try{const u=new URL(url,location.href);if(!/^https?:$/.test(u.protocol))return null;
const a=make("a",text);a.href=u.href;
if(u.origin!==location.origin){a.target="_blank";a.rel="noopener noreferrer"}return a}catch{return null}}
function reset(title,sub,kicker){root.hidden=false;
$("article-title").textContent=title;
$("article-byline").textContent=sub||"";
$("article-kicker").textContent=kicker;
for(const id of ["article-body","article-aside","article-sources"])$(id).replaceChildren()}
function paragraph(t,cls){if(t)$("article-body").append(make("p",t,cls))}
function heading(t){$("article-body").append(make("h3",t))}
function sourceLink(parent,label,url){const a=href(url,label);if(a)parent.append(a)}
function references(rows,license){const box=$("article-sources");box.replaceChildren();
box.append(make("h3",phrase("Fuentes y referencias","Sources and references","Sources et références")));
const ol=make("ol",undefined,"article-source-list"),seen=new Set();
for(const r of rows){if(!r.link||seen.has(r.link))continue;seen.add(r.link);
const li=make("li");sourceLink(li,r.title||r.source||"Fuente",r.link);
if(r.author)li.append(make("span"," · "+r.author));
ol.append(li);if(ol.children.length>=10)break}
if(ol.children.length)box.append(ol);
box.append(make("p",license||phrase("Dossier documental: no se han creado datos ni citas bibliográficas nuevas.","Documentary dossier: no newly invented bibliographic claims.","Dossier documentaire : aucune citation ni donnée inventée."),"article-license"))}
function aside(rows){const box=$("article-aside");box.replaceChildren();
box.append(make("h3",phrase("Documentos relacionados","Related documents","Documents liés")));
const seen=new Set();
for(const r of rows){if(!r.link||seen.has(r.link))continue;seen.add(r.link);
const a=href(r.link,r.title);if(a){a.className="article-index-link";box.append(a)}if(seen.size>=7)break}
}
function relevance(row,q){const a=normalized(row.title),b=normalized(q);if(a===b)return 130;
if(a.includes(b)&&b.length>3)return 55;
const words=b.split(" ").filter(x=>x.length>3),hit=words.filter(x=>a.includes(x)).length;
return words.length?hit/words.length*25:0}
function choose(rows,query){
const manuscript=rows.filter(x=>x.type==="manuscript").sort((a,b)=>b.rating-a.rating)[0];
if(manuscript&&manuscript.rating>230)return manuscript;
const exactLocus=/\b(?:[IVX]{1,4}|\d{1,2})\s*[.,:]\s*\d{1,2}\s*[.,:]\s*\d{1,2}\b/i.test(query);
if(exactLocus){const p=rows.find(x=>x.type==="passage"&&x.rating>200);if(p)return p}
const wiki=rows.filter(x=>x.type==="wikipedia").sort((a,b)=>relevance(b,query)+b.rating/20-relevance(a,query)-a.rating/20)[0];
if(wiki&&relevance(wiki,query)>=20)return wiki;
const local=rows.find(x=>["book","section","manuscript","passage"].includes(x.type));
return local||wiki||rows[0]||null
}
function wikiSummary(result){
if(!result.pageid||!result.wikiLang)return Promise.resolve(null);
const cacheKey=result.wikiLang+":"+result.pageid;
if(!summaries.has(cacheKey)){
 const p=new URLSearchParams({action:"query",prop:"extracts|info",exintro:"1",explaintext:"1",inprop:"url",pageids:String(result.pageid),format:"json",origin:"*"});
 const request=fetch("https://"+result.wikiLang+".wikipedia.org/w/api.php?"+p,{headers:{accept:"application/json"}}).then(r=>{
 if(!r.ok)throw Error("HTTP "+r.status);return r.json()
 }).then(data=>data.query?.pages?.[result.pageid]||null).catch(()=>null);
 summaries.set(cacheKey,request);
}return summaries.get(cacheKey)
}
function renderManuscript(top,rows){reset(top.title,top.author,
phrase("Manuscrito · archivo de autoridad","Manuscript · authority record","Manuscrit · notice d’autorité"));
paragraph(top.excerpt,"article-lead");
if(top.meta)paragraph(top.meta);
heading(phrase("Consulta del documento","Consult the document","Consulter le document"));
const links=[{title:top.title,link:top.link},...(top.links||[]).map(x=>({title:x.label,link:x.url}))];
const div=make("div",undefined,"article-actions");
for(const r of links){const a=href(r.link,r.title);if(a){a.className="article-index-link";div.append(a)}}
$("article-body").append(div);
paragraph(phrase("Los folios y las páginas de ediciones modernas tienen numeraciones distintas. No se atribuye una correspondencia sin cotejo documental.","Manuscript folios and modern edition pages have different numbering. No automatic equivalence is asserted.","Les folios des manuscrits et les pages des éditions modernes sont distincts ; aucune équivalence n’est supposée."),"article-note");
aside(rows);references([top,...links],null)
}
function renderLocus(top,rows){const locus=top.locus||top.title;const editions=rows.filter(x=>x.type==="passage"&&(x.locus===top.locus)).slice(0,5);
reset("De architectura · "+locus,phrase("Vitruvio · texto latino y traducciones","Vitruvius · Latin text and translations","Vitruve · texte latin et traductions"),phrase("Locus textual · resultados verificables","Textual locus · verified passages","Locus textuel · passages vérifiés"));
if(top.latin){heading("Latine");paragraph(cut(top.latin,1500),"article-lead")}
if(editions.length)for(const r of editions){
 heading(r.author||r.source||r.edition);
 paragraph(cut(r.translation||r.excerpt,1700));
 const linkEl=href(r.link,phrase("Leer edición y página PDF →","Open edition and PDF page →","Consulter l’édition et la page PDF →"));
 if(linkEl)$("article-body").append(linkEl);
 if(r.meta)paragraph(r.meta,"article-note")
}else paragraph(top.excerpt);
aside(rows);references(editions.length?editions:[top],phrase("Cada número de página procede del índice del archivo de origen cuando está registrado; no se equipara a un folio manuscrito.","Page numbers derive only from registered source metadata; no manuscript folio is inferred.","Les pages proviennent des métadonnées disponibles ; aucune équivalence avec un folio n’est supposée."))
}
async function renderWiki(top,rows,token){reset(top.title,top.author||"Wikipedia",
phrase("Extracto enciclopédico · fuente identificada","Encyclopedia extract · attributed source","Extrait encyclopédique · source attribuée"));
paragraph(top.excerpt,"article-lead");
aside(rows);references([top,...rows],phrase("Wikipedia: extracto adaptado según CC BY-SA 4.0. El artículo original conserva historial de autores, referencias y licencia. No se reproduce aquí su texto íntegro.","Wikipedia: adapted extract under CC BY-SA 4.0; full article, contributors and history at source.","Wikipédia : extrait adapté sous CC BY-SA 4.0. Texte, historique et auteurs dans l’article original."));
if(!top.pageid)return;
const d=await wikiSummary(top);if(token!==active||!d?.extract)return;
$("article-body").replaceChildren();
paragraph(cut(d.extract,2200),"article-lead");
const p=make("p",phrase("Consultar el artículo, historial y bibliografía original:","Read full article, editorial history and bibliography:","Consulter l’article, son historique et sa bibliographie :"),"article-note");
const a=href(d.fullurl||top.link,top.title+" ↗");if(a)p.append(document.createTextNode(" "),a);$("article-body").append(p)
}
function renderOther(top,rows){reset(top.title,top.author||top.source||"",phrase("Ficha documental · fuentes verificables","Documentary record · verified sources","Notice documentaire · sources vérifiables"));
paragraph(top.excerpt,"article-lead");
if(top.meta)paragraph(top.meta,"article-note");
const a=href(top.link,phrase("Consultar documento original →","Open original document →","Consulter le document original →"));
if(a)$("article-body").append(a);
aside(rows);references(rows)
}
function render(rows,q){const token=++active;
if(!q||!rows?.length){root.hidden=true;return}
const top=choose(rows,q);if(!top){root.hidden=true;return}
if(top.type==="manuscript"&&top.rating>200){renderManuscript(top,rows);return}
if(top.type==="passage"&&top.locus){renderLocus(top,rows);return}
if(top.type==="wikipedia"){void renderWiki(top,rows,token);return}
renderOther(top,rows)
}
window.VitruviaArticles={render,version:"1.0"};
})();