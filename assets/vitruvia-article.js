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
/* Search for the subject, not merely the highest scoring external mention. */
const ignored=new Set(["the","and","for","about","with","from","por","para","con","los","las","una","del","des","les","sur","dans","de","la","el","en","une","un"]);
function roots(text){return normalized(text).split(" ").filter(w=>w.length>2&&!ignored.has(w)).map(w=>
 w.length>6?w.replace(/(ciones|cion|idades|idad|adoras|adores|adoras|adora|ismos|ismo|ments|ment|mente|es|s)$/,""):w.length>4?w.replace(/s$/,""):w
)}
function relevance(row,q){
 const a=roots(row.title||""),b=roots(q);
 if(!a.length||!b.length)return 0;
 const title=a.join(" "),query=b.join(" ");
 if(title===query)return 200;
 if(title.includes(query)||query.includes(title)&&title.length>4)return 140;
 const matches=b.filter(t=>a.some(u=>u===t||u.startsWith(t)&&t.length>4||t.startsWith(u)&&u.length>4)).length;
 if(!matches)return 0;
 return matches===b.length?105:Math.round(matches/b.length*60);
}
function choose(rows,query){
 const exactLocus=/\b(?:[IVX]{1,4}|\d{1,2})\s*[.,:]\s*\d{1,2}\s*[.,:]\s*\d{1,2}\b/i.test(query);
 if(exactLocus){const p=rows.find(x=>x.type==="passage"&&x.rating>200);if(p)return p}
 const manuscript=rows.filter(x=>x.type==="manuscript"&&x.rating>230&&relevance(x,query)>=100).sort((a,b)=>b.rating-a.rating)[0];
 if(manuscript)return manuscript;
 const lang=document.documentElement.lang||"es";
 const wiki=rows.filter(x=>x.type==="wikipedia").sort((a,b)=>
  relevance(b,query)-relevance(a,query)||Number(b.wikiLang===lang)-Number(a.wikiLang===lang))[0];
 if(wiki&&relevance(wiki,query)>=100)return wiki;
 const local=rows.filter(x=>["book","section","manuscript"].includes(x.type)).sort((a,b)=>relevance(b,query)-relevance(a,query))[0];
 if(local&&relevance(local,query)>=100)return local;
 if(wiki&&relevance(wiki,query)>=45)return wiki;
 return {type:"topic",title:query,excerpt:""};
}
function wikiSummary(result){
if(!result.pageid||!result.wikiLang)return Promise.resolve(null);
const cacheKey=result.wikiLang+":"+result.pageid;
if(!summaries.has(cacheKey)){
 const p=new URLSearchParams({action:"query",prop:"extracts|info",explaintext:"1",inprop:"url",pageids:String(result.pageid),format:"json",origin:"*"});
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
const raw=String(d.extract||"").trim();
const chunks=raw.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
const sections=chunks.length>1?chunks:[raw.match(/[^.!?]+[.!?]+(?:\s|$)/g)?.join(" ")||raw];
let length=0,shown=0;
for(const chunk of sections){
 if(length>14500 || shown>=26)break;
 const clean=cut(chunk,Math.min(1600,Math.max(450,15500-length)));
 if(!clean)continue;
 paragraph(clean,shown===0?"article-lead":undefined);
 shown++;length+=clean.length;
}
if(!shown)paragraph(top.excerpt,"article-lead");
appendResearch(rows,top.title,top.title);
heading(phrase("Bibliografía y lecturas relacionadas","Bibliography and further reading","Bibliographie et lectures complémentaires"));
const related=rows.filter(x=>x.link&&x.link!==top.link&&["passage","book","section","article","wikidata"].includes(x.type)).slice(0,6);
if(related.length){
 const ul=make("ul",undefined,"article-related");
 for(const item of related){const li=make("li");const a=href(item.link,item.title);if(a)li.append(a);ul.append(li)}
 $("article-body").append(ul);
}else paragraph(phrase("No hay documentos adicionales identificados para esta consulta.","No additional documents identified for this search.","Aucun document supplémentaire identifié pour cette recherche."),"article-note");
const p=make("p",phrase("Texto enciclopédico procedente de Wikipedia. Consultar el artículo, su historial y referencias originales:","Encyclopedia text from Wikipedia. Consult the full article, edit history and original references:","Texte encyclopédique provenant de Wikipédia. Consulter l’article, son historique et les sources :"),"article-note");
const a=href(d.fullurl||top.link,phrase("Abrir fuente original ↗","Open original source ↗","Ouvrir la source ↗"));if(a)p.append(document.createTextNode(" "),a);$("article-body").append(p)
}
/* Article composed from live bibliographic records, not fabricated AI claims. */
function renderTopic(top,rows,query){
 reset(query,phrase("Consulta general · resultados documentados","General search · documented results","Recherche générale · résultats documentés"),
  phrase("Dossier de búsqueda · fuentes externas y biblioteca","Research dossier · external and library sources","Dossier de recherche · sources externes et bibliothèque"));
 const matching=rows.filter(r=>relevance(r,query)>=45&&["wikipedia","article","wikidata","openlibrary","museum"].includes(r.type)).sort((a,b)=>relevance(b,query)-relevance(a,query)).slice(0,12);
 if(!matching.length){
  paragraph(phrase(
   "No se identificó todavía una fuente suficientemente pertinente para desarrollar este tema. No se reemplaza la consulta por otro asunto ni se fabrica una respuesta.",
   "No sufficiently relevant source has yet been identified for this subject. The search will not be replaced by a different topic or invented content.",
   "Aucune source suffisamment pertinente n’a été trouvée. La recherche ne sera pas remplacée par un autre sujet ou par un texte inventé."),"article-lead");
 }else{
  paragraph(phrase("Resultados seleccionados por coincidencia con el tema. Estos resúmenes son registros documentales atribuidos, no afirmaciones generadas por un modelo de IA.",
  "Results selected by subject relevance. These are attributed source records, not AI-generated claims.",
  "Résultats sélectionnés selon leur pertinence. Ces résumés sont des notices sourcées et non des affirmations générées par une IA."),"article-lead");
  for(const r of matching){
   heading(r.title);
   if(r.excerpt)paragraph(r.excerpt);
   if(r.author)paragraph(r.author,"article-note");
   const a=href(r.link,phrase("Consultar fuente original ↗","View source ↗","Voir la source ↗"));
   if(a)$("article-body").append(a);
  }
 }
 heading(phrase("Ampliar la investigación","Expand the research","Approfondir la recherche"));
 const links=[
  ["Google", "https://www.google.com/search?"+new URLSearchParams({q:query})],
  ["Google Scholar","https://scholar.google.com/scholar?"+new URLSearchParams({q:query})],
  ["Wikipedia","https://"+(["en","fr"].includes(document.documentElement.lang)?document.documentElement.lang:"es")+".wikipedia.org/w/index.php?"+new URLSearchParams({search:query})]
 ];
 const ul=make("ul",undefined,"article-related");
 for(const [label,url] of links){const a=href(url,label);if(a){const li=make("li");li.append(a);ul.append(li)}}
 $("article-body").append(ul);
 aside(matching);references(matching);
}
/* Separate verifiable article sections from supporting catalogue records. */
function appendResearch(rows,query,sourceTitle){
 const papers=rows.filter(x=>x.type==="article"&&relevance(x,query)>=45&&x.link).slice(0,6);
 const local=rows.filter(x=>x.type==="passage"&&(relevance(x,query)>=45||normalized(x.latin+" "+x.translation+" "+x.excerpt).includes(normalized(query)))).slice(0,5);
 const box=$("article-body");
 if(papers.length){
  heading(phrase("Investigación y publicaciones relacionadas","Related scholarly publications","Publications scientifiques liées"));
  paragraph(phrase("Los siguientes registros bibliográficos permiten ampliar y contrastar la información. Su inclusión no significa que se haya leído el artículo completo.",
   "These bibliographic records support further reading and verification. Their inclusion does not mean the full papers have been reviewed.",
   "Ces notices bibliographiques servent à approfondir et vérifier le sujet. Leur présence ne signifie pas que les articles ont été intégralement lus."),"article-note");
  for(const p of papers){
   const div=make("p",undefined,"article-research-item");
   const a=href(p.link,p.title);if(a)div.append(a);
   if(p.author)div.append(make("span"," · "+p.author));
   if(p.excerpt)div.append(make("small",p.excerpt));
   box.append(div);
  }
 }
 if(local.length){
  heading(phrase("Correspondencias en la Biblioteca Vitruviana","Matches in the Vitruvian Library","Correspondances dans la Bibliothèque vitruvienne"));
  for(const r of local){
   const p=make("p",undefined,"article-library-hit");const a=href(r.link,r.title);
   if(a)p.append(a);
   p.append(make("span"," · "+cut(r.excerpt||r.translation||r.latin,260)));
   box.append(p);
  }
 }
}
function renderOther(top,rows){reset(top.title,top.author||top.source||"",phrase("Ficha documental · fuentes verificables","Documentary record · verified sources","Notice documentaire · sources vérifiables"));
paragraph(top.excerpt,"article-lead");
if(top.meta)paragraph(top.meta,"article-note");
const a=href(top.link,phrase("Consultar documento original →","Open original document →","Consulter le document original →"));
if(a)$("article-body").append(a);
aside(rows);references(rows)
}
function matchVariants(q){
 const stop=new Set(["para","como","donde","cuando","sobre","entre","desde","hasta","with","from","where","what","which","the","and","los","las","del","una","unos","unas","que","por","con","dans","pour","les","des"]);
 const terms=String(q||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>=3&&!stop.has(w));
 const expanded=new Set(terms);
 for(const w of terms){
  if(w.length>=7){const stem=w.replace(/(ciones|cion|mente|idades|idad|ismos|ismo|istas|ista|icos|icas|ico|ica|orum|arum|ibus|ium|iones|eans|ean|iens|ien|ales|ales|ales|es|os|as|us|um|is|ae|am|em|en|s)$/,"");if(stem.length>=5&&stem.length>=w.length-5)expanded.add(stem)}
  if(/^pitagor|^pythagor/.test(w)){expanded.add("pitagor");expanded.add("pythagor")}
 }
 return [...expanded].slice(0,18)
}
function highlightArticle(query){
 const words=matchVariants(query);
 if(!words.length)return;
 const walker=document.createTreeWalker($("article-body"),NodeFilter.SHOW_TEXT),nodes=[];
 while(walker.nextNode()){const n=walker.currentNode;if(n.parentElement?.closest("a,button,mark,script,style"))continue;nodes.push(n)}
 for(const n of nodes){const original=n.textContent,normalized=original.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(),hits=[];
 for(const word of words){let at=0,pos;while((pos=normalized.indexOf(word,at))!==-1){hits.push([pos,pos+word.length]);at=pos+word.length;if(hits.length>80)break}}
 if(!hits.length)continue;hits.sort((x,y)=>x[0]-y[0]);let end=0;const f=document.createDocumentFragment();
 for(const [start,stop] of hits){if(start<end)continue;if(start>end)f.append(document.createTextNode(original.slice(end,start)));const mark=make("mark",original.slice(start,stop),"query-hit");f.append(mark);end=stop}
 if(end<original.length)f.append(document.createTextNode(original.slice(end)));n.replaceWith(f)}
}
function reportEvidence(rows,q){
 const box=$("article-evidence");if(!box)return;box.replaceChildren();
 const relevant=rows.filter(x=>x.type==="passage"&&(x.latin||x.translation)).slice(0,18);
 const others=rows.filter(x=>x.link&&["article","wikipedia","wikidata","book","section","manuscript","museum"].includes(x.type)).slice(0,24);
 if(!relevant.length&&!others.length)return;
 box.append(make("h3",phrase("Anexo documental: Vitruvio y fuentes consultadas","Documentary appendix: Vitruvius and retrieved sources","Annexe documentaire : Vitruve et sources consultées")));
 box.append(make("p",phrase("Resultados recuperados de las ediciones estructuradas y de las fuentes públicas consultadas. No constituyen una revisión exhaustiva de Internet.","Results retrieved from indexed editions and queried public sources; not an exhaustive review of the web.","Résultats des éditions indexées et des sources consultées ; recherche non exhaustive."),"article-note"));
 if(relevant.length){
  box.append(make("h4",phrase("Pasajes de De architectura: latín y traducción","De architectura: Latin and translation","De architectura : latin et traduction")));
  for(const p of relevant){
   const item=make("section",undefined,"evidence-entry");
   item.append(make("h5",p.title||p.locus));
   if(p.latin){item.append(make("div","LATINE","evidence-label"),make("p",p.latin.slice(0,1600)))}
   if(p.translation){item.append(make("div",phrase("TRADUCCIÓN","TRANSLATION","TRADUCTION"),"evidence-label"),make("p",p.translation.slice(0,1600)))}
   if(p.link){const link=href(p.link,phrase("Consultar edición y página original","Consult edition and original page","Consulter l'édition originale"));if(link)item.append(link)}
   box.append(item);
  }
 }
 if(others.length){
  box.append(make("h4",phrase("Fuentes externas y bibliografía localizada","Retrieved external sources and bibliography","Sources externes et bibliographie repérée")));
  const ol=make("ol",undefined,"evidence-bibliography"),seen=new Set();
  for(const p of others){if(seen.has(p.link))continue;seen.add(p.link);
   const li=make("li"),link=href(p.link,p.title);if(link)li.append(link);
   if(p.author)li.append(document.createTextNode(" · "+p.author));
   if(p.excerpt)li.append(make("p",p.excerpt));
   ol.append(li);
  }
  box.append(ol);
 }
 const words=[...new Set(String(q||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>=3))].slice(0,10);
 if(words.length){
  const walker=document.createTreeWalker(box,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode()){const n=walker.currentNode;if(!n.parentElement.closest("a,mark"))nodes.push(n)}
  for(const n of nodes){const original=n.textContent,flat=original.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(),hits=[];
   for(const w of words){let pos=0,at;while((at=flat.indexOf(w,pos))>=0){hits.push([at,at+w.length]);pos=at+w.length;if(hits.length>80)break}}
   hits.sort((x,y)=>x[0]-y[0]);let last=0;const fragment=document.createDocumentFragment();
   for(const [start,end] of hits){if(start<last)continue;fragment.append(document.createTextNode(original.slice(last,start)),make("mark",original.slice(start,end),"query-hit"));last=end}
   if(last){fragment.append(document.createTextNode(original.slice(last)));n.replaceWith(fragment)}
  }
 }
}
function render(rows,q){const token=++active;
if(!q||!rows?.length){root.hidden=true;return}
reportEvidence(rows,q);
const top=choose(rows,q);if(!top){root.hidden=true;return}
if(top.type==="manuscript"&&top.rating>200){renderManuscript(top,rows);highlightArticle(q);return}
if(top.type==="passage"&&top.locus){renderLocus(top,rows);highlightArticle(q);return}
if(top.type==="wikipedia"){void renderWiki(top,rows,token).then(()=>{if(token===active)highlightArticle(q)});return}
if(top.type==="topic"){renderTopic(top,rows,q);highlightArticle(q);return}
renderOther(top,rows);highlightArticle(q)
}
window.VitruviaArticles={render,version:"1.0"};
})();