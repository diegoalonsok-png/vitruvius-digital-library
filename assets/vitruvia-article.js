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
let bibliographyContext={rows:[],query:""};

const EDITORIAL_LOCALE={"Desarrollo enciclopédico y debates":{"en":"Encyclopedic overview and debates","fr":"Synthèse encyclopédique et débats"},"Documentación disponible":{"en":"Available documentation","fr":"Documentation disponible"},"Pasaje exacto reconocido en la biblioteca":{"en":"Exact passage identified in the library","fr":"Passage exact identifié dans la bibliothèque"},"Tradición manuscrita · códices y testimonios por obra":{"en":"Manuscript tradition · codices and witnesses by work","fr":"Tradition manuscrite · codex et témoins par œuvre"},"Obras fundamentales y bibliografía de referencia":{"en":"Key reference works and bibliography","fr":"Ouvrages de référence et bibliographie"},"Universidades, museos y centros de investigación":{"en":"Universities, museums and research centers","fr":"Universités, musées et centres de recherche"},"Fuentes históricas institucionales":{"en":"Institutional historical sources","fr":"Sources historiques institutionnelles"},"II · Literatura histórica, códices y fuentes originales":{"en":"II · Historical literature, codices and primary sources","fr":"II · Littérature historique, codex et sources originales"},"III · Libros y ediciones bibliográficas":{"en":"III · Books and bibliographic editions","fr":"III · Livres et éditions bibliographiques"},"IV · Investigación académica y estudios especializados":{"en":"IV · Academic research and specialist studies","fr":"IV · Recherche académique et études spécialisées"},"V · Enciclopedias y divulgación":{"en":"V · Encyclopedias and general introductions","fr":"V · Encyclopédies et vulgarisation"},"VI · Imágenes y documentación visual":{"en":"VI · Images and visual documentation","fr":"VI · Images et documentation visuelle"},"VII · Otras fuentes para contrastar la investigación":{"en":"VII · Additional sources for verification","fr":"VII · Autres sources de vérification"},"Consultar galería de imágenes documentadas":{"en":"Open documented image gallery","fr":"Consulter la galerie d’images documentées"},"Consultar fuente original, notas e historial":{"en":"View source, notes and edit history","fr":"Consulter la source, les notes et l’historique"},"Leer el pasaje en la edición de origen":{"en":"Read the passage in its source edition","fr":"Lire le passage dans son édition source"},"Buscar manuscritos y testimonios en Europeana":{"en":"Search manuscripts and witnesses in Europeana","fr":"Rechercher des manuscrits et témoins sur Europeana"},"Buscar en el catálogo de BnF Gallica":{"en":"Search the BnF Gallica catalogue","fr":"Rechercher dans le catalogue Gallica de la BnF"},"Buscar libros y ediciones en Open Library":{"en":"Search books and editions in Open Library","fr":"Rechercher des livres et éditions sur Open Library"},"Buscar ediciones bibliográficas en WorldCat":{"en":"Search bibliographic editions in WorldCat","fr":"Rechercher des éditions bibliographiques sur WorldCat"},"Buscar investigación en Google Scholar":{"en":"Search academic research in Google Scholar","fr":"Rechercher des études sur Google Scholar"},"Buscar artículos y estudios en Crossref":{"en":"Search articles and papers in Crossref","fr":"Rechercher des articles et études sur Crossref"},"Buscar artículos y estudios académicos":{"en":"Search scholarly articles and studies","fr":"Rechercher des articles et études scientifiques"},"Buscar bibliografía sobre":{"en":"Search bibliography on","fr":"Rechercher une bibliographie sur"},"Material enciclopédico de Wikipedia: atribución CC BY-SA. La síntesis original y los textos externos se presentan diferenciados.":{"en":"Encyclopedic material from Wikipedia, attributed under CC BY-SA. The editorial overview and external texts are identified separately.","fr":"Matériel encyclopédique provenant de Wikipédia, sous licence CC BY-SA. La synthèse éditoriale et les textes externes sont distingués."},"Estudio introductorio organizado por temas. Se distinguen las fuentes históricas, los datos verificables y las interpretaciones modernas.":{"en":"A topical introduction distinguishing historical sources, verified evidence and modern interpretations.","fr":"Une introduction thématique distinguant les sources historiques, les données vérifiées et les interprétations modernes."},"Se destacan testimonios fechados e identificados en la biblioteca. Los registros externos enlazados por Wikidata requieren comprobación codicológica: ni su datación ni su importancia constituyen una atribución verificada.":{"en":"Dated, catalogued manuscript witnesses are highlighted. External Wikidata records still require codicological verification; dates and significance are not guaranteed.","fr":"Les témoins datés et catalogués sont mis en évidence. Les notices Wikidata nécessitent une vérification codicologique ; ni leur datation ni leur importance ne sont garanties."},"Búsquedas acotadas por institución. Son rutas externas para localizar estudios y colecciones; Vitruvia no afirma haber leído ni evaluado cada resultado.":{"en":"Institution-specific research links. These are external searches, not studies that Vitruvia claims to have read or evaluated.","fr":"Liens de recherche par institution. Il s’agit de recherches externes, non de travaux lus ou évalués par Vitruvia."},"Fuentes antiguas, manuscritos y ediciones documentadas. La fecha de un códice no equivale a la fecha de composición de la obra.":{"en":"Documented ancient sources, manuscripts and editions. A codex's date is not the date when the work was composed.","fr":"Sources antiques, manuscrits et éditions documentés. La date d'un codex ne correspond pas à celle de la composition de l’œuvre."},"Libros identificados en la Biblioteca Vitruviana y catálogos abiertos. Una ficha no acredita lectura del texto completo.":{"en":"Books recorded in the Vitruvian Library and open catalogues. A catalog entry does not imply full-text access.","fr":"Livres identifiés dans la Bibliothèque vitruvienne et les catalogues ouverts. Une notice ne garantit pas l’accès au texte intégral."},"Las vistas previas documentales se presentan en la galería con enlaces a su procedencia, autor y licencia.":{"en":"Documentary previews appear in the gallery, with provenance, creator and license links.","fr":"Les aperçus documentaires figurent dans la galerie, avec liens vers la provenance, l’auteur et la licence."},"No se logró recuperar una síntesis enciclopédica extensa en esta consulta. Se muestran únicamente las fuentes comprobables, sin elaborar datos no respaldados.":{"en":"An extended encyclopedia overview could not be retrieved for this search. Only traceable sources are displayed; unsupported claims are not generated.","fr":"Une synthèse encyclopédique détaillée n'a pas pu être récupérée. Seules les sources traçables sont présentées, sans affirmations non étayées."},"No hay fichas directas recuperadas en esta consulta. Podés continuar en estos catálogos; son búsquedas externas, no resultados verificados por Vitruvia.":{"en":"No matching records were retrieved directly. Continue in these external catalogues; these links are not verified Vitruvia results.","fr":"Aucune notice directe retrouvée. Poursuivre dans ces catalogues externes : ce ne sont pas des résultats vérifiés par Vitruvia."}};
const localText=s=>EDITORIAL_LOCALE[String(s)]?.[document.documentElement.lang]||s;
function phrase(es,en,fr){const l=document.documentElement.lang;return l==="en"?en:l==="fr"?fr:es}
function href(url,text){if(!url)return null;try{const u=new URL(url,location.href);if(!/^https?:$/.test(u.protocol))return null;
const a=make("a",localText(text));a.href=u.href;
if(u.origin!==location.origin){a.target="_blank";a.rel="noopener noreferrer"}return a}catch{return null}}
function reset(title,sub,kicker){root.hidden=false;
$("article-title").textContent=title;
$("article-byline").textContent=sub||"";
$("article-kicker").textContent=kicker;
for(const id of ["article-body","article-aside","article-sources"])$(id).replaceChildren()}
function paragraph(t,cls){if(t)$("article-body").append(make("p",localText(t),cls))}
function heading(t){$("article-body").append(make("h3",localText(t)))}
function sourceLink(parent,label,url){const a=href(url,label);if(a)parent.append(a)}
function references(rows,license){const box=$("article-sources");box.replaceChildren();
box.append(make("h3",phrase("Fuentes y referencias","Sources and references","Sources et références")));
const ol=make("ol",undefined,"article-source-list"),seen=new Set();
for(const r of rows){if(!r.link||seen.has(r.link))continue;seen.add(r.link);
const li=make("li");sourceLink(li,r.title||r.source||"Fuente",r.link);
if(r.author)li.append(make("span"," · "+r.author));
ol.append(li);if(ol.children.length>=10)break}
if(ol.children.length)box.append(ol);
box.append(make("p",license||phrase("Dossier documental: no se han creado datos ni citas bibliográficas nuevas.","Documentary dossier: no newly invented bibliographic claims.","Dossier documentaire : aucune citation ni donnée inventée."),"article-license"));
renderChicagoBibliography(bibliographyContext.rows,bibliographyContext.query);
}
/* Chicago Manual of Style, 18th ed., bibliography (notes-bibliography system).
   Ranking is by source type, not by publication year: ancient text, scholarship, outreach.
   Missing metadata is not fabricated, and incomplete catalog hits are disclosed. */
function bibliographicName(raw){
 const name=String(raw||"").trim();
 if(!name)return "";
 if(/^(Wikipedia|Open Library|Google Books|Wikidata|Crossref|The Met)/i.test(name))return "";
 if(name.includes(","))return name;
 const parts=name.split(/\s+/);
 return parts.length>1?parts[parts.length-1]+", "+parts.slice(0,-1).join(" "):name;
}
function bibliographicYear(row){
 const value=String(row.year||"").trim();
 if(/^\d{4}/.test(value))return value.slice(0,4);
 return "";
}
function bibliographyCategory(row,query){
 if(row.type==="wikipedia")return "popular";
 if(row.recordKind==="museum-object"||row.type==="manuscript"||row.type==="edition")return "primary";
 if(["article"].includes(row.type)&&row.journal)return "academic";
 if(row.type==="article"&&row.doi)return "academic";
 if(["openlibrary","googlebook","book"].includes(row.type)){
  const work=normalized([row.title,row.author].join(" "));
  const person=normalized(query);
  const classical=/\b(cicero|ciceron|pythagoras|pitagoras|plato|platon|aristotle|aristoteles|vitruvius|vitruvio|lucretius|lucrecio|seneca|socrates|socrates|ovid|ovidio|plutarch|plutarco|tacitus|tacito|suetonius|suetonio)\b/.test(work);
  // Primary is assigned only where a classical author's own work is identified
  // from a local record, not from a modern book's title mentioning that author.
  if(row.type==="book"&&classical&&row.author&&normalized(row.author).includes(person))return "primary";
  if(row.type==="googlebook"||row.type==="openlibrary")return "popular"; // Unverified academic status
  return "academic";
 }
 return null;
}
function chicagoEntry(row){
 const title=String(row.title||"").trim(),url=String(row.link||"").trim();
 if(!title||!/^https?:\/\//.test(url))return null;
 const writer=bibliographicName(row.author);
 const year=bibliographicYear(row);
 const publisher=String(row.publisher||"").trim();
 const journal=String(row.journal||"").trim();
 const doi=String(row.doi||"").trim();
 const citation=make("span");
 const append=t=>citation.append(document.createTextNode(t));
 const italic=t=>citation.append(make("em",t));
 if(row.type==="wikipedia"){
  append("Wikipedia contributors. “"+title+".” Wikipedia. ");
  append("Consultado el "+new Date().toLocaleDateString("es-AR",{day:"numeric",month:"long",year:"numeric"})+". ");
 }else if(journal){
  if(writer)append(writer+". ");
  append("“"+title+".” ");
  italic(journal);
  if(row.volume)append(" "+row.volume);
  if(row.issue)append(", no. "+row.issue);
  if(year)append(" ("+year+")");
  if(row.pages)append(": "+row.pages);
  append(". ");
 }else{
  if(writer)append(writer+". ");
  italic(title);
  append(". ");
  if(publisher)append(publisher+(year?", "+year:"")+". ");
  else if(year)append(year+". ");
 }
 const link=href(doi?"https://doi.org/"+encodeURIComponent(doi):url,doi?"https://doi.org/"+doi:url);
 if(link)citation.append(link);
 return {citation,complete:!!(journal?year&&writer:row.type==="wikipedia"||year&&writer&&publisher)};
}
function renderChicagoBibliography(rows,query){
 const box=$("article-sources");
 if(!box||!query)return;
 const exact=normalized(query);
 const allowed=new Set(["book","edition","manuscript","article","openlibrary","googlebook","museum","wikipedia"]);
 const relevant=rows.filter(r=>{
  if(!allowed.has(r.type)||!r.link||!r.title)return false;
  const field=normalized([r.title,r.author,r.excerpt].join(" "));
  return (relevance(r,query)>=45||field.includes(exact)&&exact.length>3);
 });
 const sorted={primary:[],academic:[],popular:[]},seen=new Set();
 for(const row of relevant){
  const cat=bibliographyCategory(row,query);
  if(!cat)continue;
  const key=normalized(row.title)+"|"+normalized(row.author);
  if(seen.has(key))continue;
  const entry=chicagoEntry(row);
  if(!entry)continue;
  seen.add(key);
  sorted[cat].push({row,entry,year:bibliographicYear(row)});
 }
 const groupDefs=[
  ["primary","I · Fuentes históricas y primarias"],
  ["academic","II · Bibliografía académica"],
  ["popular","III · Divulgación y repertorios generales"]
 ];
 if(!Object.values(sorted).some(x=>x.length))return;
 box.append(make("h3","Bibliografía temática · Chicago 18"));
 box.append(make("p","Sistema de notas y bibliografía, 18.ª edición. Orden por categoría documental y, dentro de cada categoría, cronológicamente cuando se conoce el año. La clasificación de registros de catálogos no certifica revisión por pares.","article-license"));
 for(const [key,title] of groupDefs){
  const group=sorted[key].sort((a,b)=>(Number(a.year)||9999)-(Number(b.year)||9999)||a.row.title.localeCompare(b.row.title)).slice(0,18);
  if(!group.length)continue;
  box.append(make("h4",title));
  const ol=make("ol",undefined,"article-source-list chicago-bibliography");
  for(const item of group){
   const li=make("li");li.append(item.entry.citation);
   if(!item.entry.complete)li.append(make("small"," · Registro parcial: faltan datos para una cita bibliográfica completa.","article-license"));
   ol.append(li);
  }
  box.append(ol);
 }
}
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
 const prefaces=rows.filter(x=>x.type==="preface");
 if(prefaces.length){
  const verified=prefaces.filter(x=>!x.prefacePlaceholder&&Array.isArray(x.sections));
  return (verified.length?verified:prefaces).sort((a,b)=>(b.rating||0)-(a.rating||0))[0];
 }
 const exactLocus=/\b(?:[IVX]{1,4}|\d{1,2})\s*[.,:]\s*\d{1,2}\s*[.,:]\s*\d{1,2}\b/i.test(query);
 if(exactLocus){const p=rows.find(x=>x.type==="passage"&&x.rating>200);if(p)return p}
 const manuscript=rows.filter(x=>x.type==="manuscript"&&x.rating>230&&relevance(x,query)>=100).sort((a,b)=>b.rating-a.rating)[0];
 if(manuscript)return manuscript;
 const exactWork=rows.filter(x=>x.type==="book").find(x=>{
  const queryText=normalized(query),title=normalized(x.title),author=normalized(x.author);
  if(queryText.length<4||author===queryText||author.includes(queryText)&&queryText.length<8)return false;
  return title===queryText||(x.aliases||[]).some(a=>normalized(a)===queryText&&normalized(a)!==author);
 });
 if(exactWork)return exactWork;
 const lang=document.documentElement.lang||"es";
 const wiki=rows.filter(x=>x.type==="wikipedia").sort((a,b)=>
  relevance(b,query)-relevance(a,query)||Number(b.wikiLang===lang)-Number(a.wikiLang===lang))[0];
 if(wiki&&relevance(wiki,query)>=100)return {type:"topic",title:query,excerpt:wiki.excerpt};
 const local=rows.filter(x=>["book","section","manuscript"].includes(x.type)).sort((a,b)=>relevance(b,query)-relevance(a,query))[0];
 if(local&&relevance(local,query)>=100)return local;
 if(wiki&&relevance(wiki,query)>=45)return {type:"topic",title:query,excerpt:wiki.excerpt};
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
if(top.localViewer){
 const local=make("div",undefined,"article-local-reader-feature");
 local.append(make("h3",phrase("Leer el códice original folio a folio",
  "Read the original codex folio by folio","Lire le codex original folio par folio")));
 const count=top.localFolioCount||341;
 const explanation=phrase(
  "Fotografías del manuscrito disponibles dentro de esta biblioteca: "+count+" imágenes. Elegí un folio, avanzá por el códice y ampliá la escritura. El documento original se conserva en "+top.author+".",
  "Manuscript photographs hosted in this library: "+count+" images. Select folios, turn pages and magnify the text. Original held at "+top.author+".",
  "Photographies hébergées dans cette bibliothèque : "+count+" images. Parcourez les folios et agrandissez l'écriture. Manuscrit conservé à "+top.author+".");
 local.append(make("p",explanation));
 const actions=make("div",undefined,"article-local-actions");
 if(window.VitruviaLocalManuscripts){
  const open=make("button",phrase("Abrir visor en Vitruvia","Open reader in Vitruvia","Ouvrir le lecteur dans Vitruvia"));
  open.type="button";open.className="article-local-viewer";
  open.addEventListener("click",()=>window.VitruviaLocalManuscripts.open(top.localViewer,top.title));
  actions.append(open);
 }
 const link=href(top.localViewer,phrase("Abrir lector completo · folios y lupa","Open full reader · folios and zoom","Ouvrir le lecteur complet · folios et zoom"));
 if(link)actions.append(link);
 local.append(actions);$("article-body").append(local);
}
const links=[{title:top.title,link:top.link},...(top.links||[]).map(x=>({title:x.label,link:x.url}))];
const div=make("div",undefined,"article-actions");
for(const r of links){const a=href(r.link,r.title);if(a){a.className="article-index-link";div.append(a)}}
$("article-body").append(div);
paragraph(phrase("Los folios y las páginas de ediciones modernas tienen numeraciones distintas. No se atribuye una correspondencia sin cotejo documental.","Manuscript folios and modern edition pages have different numbering. No automatic equivalence is asserted.","Les folios des manuscrits et les pages des éditions modernes sont distincts ; aucune équivalence n’est supposée."),"article-note");
aside(rows);references([top,...links],null)
}
/* Authoritative structural hit: a praefatio is a named part of De architectura,
   not an arbitrary encyclopedia snippet. Only repository-backed edition text is shown. */
function renderPreface(top,rows){
 const roman=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
 const all=rows.filter(r=>r.type==="preface"&&!r.prefacePlaceholder&&Array.isArray(r.sections));
 const isAll=!top.prefaceBook;
 const book=Number(top.prefaceBook||top.book)||null;
 const title=book?"De architectura · "+phrase("Prefacio del Libro ","Preface of Book ","Préface du livre ")+roman[book]:
  phrase("Prefacios de los diez libros de De architectura","Prefaces to the ten books of De architectura","Préfaces des dix livres du De architectura");
 reset(title,"Marco Vitruvio Polión · "+phrase("V514 (castellano) / V554 (francés) / V297 (inglés)","V514 (Spanish) / V554 (French) / V297 (English)","V514 (espagnol) / V554 (français) / V297 (anglais)"),
 phrase("Texto latino y traducciones editoriales · locus comprobado","Latin text and editorial translations · indexed locus","Texte latin et traductions éditoriales · locus indexé"));
 if(!all.length){
  paragraph(phrase("Localizando los prefacios en las ediciones estructuradas V514, V554 y V297…",
   "Locating the prefaces in the indexed V514, V554 and V297 editions…",
   "Repérage des préfaces dans les éditions indexées V514, V554 et V297…"),"article-lead");
  const a=href(top.link,phrase("Abrir prefacio del tratado ↗","Open preface ↗","Ouvrir la préface ↗"));
  if(a)$("article-body").append(a);
  return;
 }
 const matching=book?all.filter(r=>r.book===book):all;
 paragraph(book?phrase(
   "Este prefacio está identificado por sus loci en las ediciones del tratado. Se muestra el texto latino junto a las traducciones castellana V514, francesa V554 e inglesa V297, conservando las diferencias editoriales.",
   "This preface is identified by locus in the editions. The Latin text is shown alongside Spanish V514, French V554 and English V297, with editorial differences kept distinct.",
   "Cette préface est identifiée par ses loci dans les éditions. Le latin est présenté avec les traductions espagnole V514, française V554 et anglaise V297, sans confondre les variantes éditoriales."):
   phrase("Índice de los prefacios de los diez libros. Elegí un libro para leer todos sus pasajes en latín y traducción.",
    "Index of the prefaces to the ten books. Choose a book to read each passage in Latin and translation.",
    "Index des préfaces des dix livres. Choisissez un livre pour lire les passages latins et leurs traductions."),"article-lead");
 const body=$("article-body"),grouped=new Map();
 for(const row of matching){
  if(!grouped.has(row.book))grouped.set(row.book,new Map());
  for(const p of row.sections){
   const byLocus=grouped.get(row.book);
   if(!byLocus.has(p.locus))byLocus.set(p.locus,{});
   byLocus.get(p.locus)[row.edition]=p;
  }
 }
 for(const [bookNumber,sections] of [...grouped].sort((a,b)=>a[0]-b[0])){
  heading(phrase("Libro ","Book ","Livre ")+roman[bookNumber]+" · Praefatio");
  const entries=[...sections].sort((a,b)=>Number(a[0].split(".").at(-1))-Number(b[0].split(".").at(-1)));
  if(!book){
   paragraph(phrase(entries.length+" pasajes indexados. El prefacio completo está disponible en el lector paralelo.",
    entries.length+" indexed passages. The complete preface is available in the parallel reader.",
    entries.length+" passages indexés. La préface complète est disponible dans le lecteur parallèle."),"article-note");
   for(const ed of ["recensio-es","recensio-fr","theory-en"]){
    const row=matching.find(x=>x.book===bookNumber&&x.edition===ed);
    if(!row)continue;
    const a=href(row.link,phrase("Leer ","Read ","Lire ")+(ed==="recensio-es"?"V514 · castellano":ed==="recensio-fr"?"V554 · français":"V297 · English")+" ↗");
    if(a)body.append(a,document.createTextNode(" "));
   }
   continue;
  }
  for(const [locus,editions] of entries){
   const latin=editions["recensio-es"]||editions["theory-en"];
   const es=editions["recensio-es"],fr=editions["recensio-fr"],en=editions["theory-en"];
   const wrap=make("section",undefined,"preface-entry");
   const ref=make("h4",locus);ref.className="preface-locus";wrap.append(ref);
   if(latin?.latin){
    const label=make("div",phrase("LATÍN · TEXTO EDITORIAL","LATIN · EDITED TEXT","LATIN · TEXTE ÉDITÉ"),"preface-language");
    const text=make("p",latin.latin,"preface-latin");text.lang="la";wrap.append(label,text);
   }
   if(es?.translation){
    const label=make("div","V514 · CASTELLANO","preface-language");
    const text=make("p",es.translation,"preface-translation");text.lang="es";wrap.append(label,text);
   }
   if(fr?.translation){
    const label=make("div","V554 · FRANÇAIS","preface-language");
    const text=make("p",fr.translation,"preface-translation");text.lang="fr";wrap.append(label,text);
   }
   if(en?.translation){
    const label=make("div","V297 · ENGLISH","preface-language");
    const text=make("p",en.translation,"preface-translation");text.lang="en";wrap.append(label,text);
   }
   const links=make("div",undefined,"preface-editions");
   for(const [ed,version] of [["recensio-es","V514"],["recensio-fr","V554"],["theory-en","V297"]]){
    if(!editions[ed])continue;
    const a=href("lector-bilingue.html?edition="+ed+"&locus="+encodeURIComponent(locus),
      phrase("Abrir locus ","Open locus ","Ouvrir locus ")+locus+" · "+version);
    if(a)links.append(a);
   }
   wrap.append(links);body.append(wrap);
  }
 }
 paragraph(phrase(
  "Nota filológica: el texto latino se presenta según V514 y las traducciones según sus ediciones identificadas. No se afirma que estas lecturas correspondan literalmente a un folio específico del Codex H sin cotejo. Las tres ediciones V514, V554 y V297 se muestran con sus procedencias independientes.",
  "Philological note: Latin follows V514, and translations retain their edition attribution. No particular reading is attributed to a Codex H folio without collation. The three V514, V554 and V297 editions retain their independent provenance.",
  "Note philologique : le latin suit V514 et les traductions sont attribuées à leurs éditions. Aucun folio de H n’est cité sans collation. Les trois éditions V514, V554 et V297 conservent leur provenance propre."),"article-note");
 const refs=matching.map(r=>({...r,title:"De architectura · "+r.version+" · praef. "+roman[r.book]}));
 aside(refs);references(refs);buildContents();
}

function renderLocus(top,rows){const locus=top.locus||top.title;const editions=rows.filter(x=>x.type==="passage"&&(x.locus===top.locus)).slice(0,5);
reset("De architectura · "+locus,phrase("Vitruvio · texto latino y traducciones","Vitruvius · Latin text and translations","Vitruve · texte latin et traductions"),phrase("Locus textual · resultados verificables","Textual locus · verified passages","Locus textuel · passages vérifiés"));
if(top.latin){heading("Latine");paragraph(cut(top.latin,1500),"article-lead vitruvian-text")}
if(editions.length)for(const r of editions){
 heading(r.author||r.source||r.edition);
 paragraph(cut(r.translation||r.excerpt,1700),"vitruvian-text");
 const linkEl=href(r.link,phrase("Leer edición y página PDF →","Open edition and PDF page →","Consulter l’édition et la page PDF →"));
 if(linkEl)$("article-body").append(linkEl);
 if(r.meta)paragraph(r.meta,"article-note")
}else paragraph(top.excerpt);
aside(rows);references(editions.length?editions:[top],phrase("Cada número de página procede del índice del archivo de origen cuando está registrado; no se equipara a un folio manuscrito.","Page numbers derive only from registered source metadata; no manuscript folio is inferred.","Les pages proviennent des métadonnées disponibles ; aucune équivalence avec un folio n’est supposée."))
}

/* Personas históricas: primero biografía documentada; después menciones
   verificables de Vitruvio. Una coincidencia editorial no equivale a folio. */
function personWikiHit(row,person,query){
 if(row.type!=="wikipedia")return false;
 const title=normalized(row.title);
 if(/desambiguacion|disambiguation|homonymie|categoria/.test(title))return false;
 const alternatives=[person.name,query,...(person.aliases||[])].map(normalized).filter(x=>x.length>=4);
 if(person.id==="cicero")alternatives.push("ciceron","cicero","marco tulio ciceron");
 return alternatives.some(name=>title===name);
}
/* Match the actual indexed De architectura text, not the title of an external result. */
function vitruvianMatches(rows,terms){
 const wanted=[...new Set((terms||[]).map(normalized).filter(x=>x.length>=4))];
 if(!wanted.length)return [];
 return rows.filter(row=>{
  if(row.type!=="passage"||!row.locus||!(row.latin||row.translation))return false;
  const source=" "+normalized([row.latin,row.translation].join(" "))+" ";
  return wanted.some(term=>source.includes(" "+term+" "));
 });
}
function matchingPersonPassages(rows,person){
 const names=[person.name,...(person.aliases||[]),...(person.latin_forms||[])];
 if(person.id==="cicero")names.push("Cicerón","Cicero","Ciceronis","Ciceronem","Cicerone","Ciceroni");
 return vitruvianMatches(rows,names);
}
function appendVerifiedTopicPassages(rows,query){
 const terms=[query];
 const matches=vitruvianMatches(rows,terms);
 if(!matches.length)return false;
 heading("V · Coincidencias documentadas en el tratado de Vitruvio");
 paragraph(matches.length+" pasajes indexados contienen una mención literal a la consulta. Las coincidencias se marcan en amarillo únicamente dentro del texto del tratado.","article-note");
 const container=make("div",undefined,"person-vitruvian-list");
 $("article-body").append(container);
 const seen=new Set();
 for(const entry of matches){
  const key=entry.locus+"|"+(entry.edition||"");
  if(seen.has(key))continue;seen.add(key);
  const section=make("section",undefined,"person-locus-entry");
  section.append(make("h4","De architectura · "+entry.locus+" · "+(entry.edition||"edición")));
  if(entry.latin){const p=make("p",entry.latin);p.lang="la";section.append(p)}
  if(entry.translation){const p=make("p",entry.translation);section.append(p)}
  const original=href(entry.link,"Abrir edición y locus documentado");if(original)section.append(original);
  container.append(section);
  if(seen.size>=18)break;
 }
 return true;
}
function appendAcademicLinks(query){
 heading("Enlaces académicos para ampliar la investigación");
 const links=[
  ["Google Scholar","https://scholar.google.com/scholar?q="+encodeURIComponent(query)],
  ["WorldCat","https://search.worldcat.org/search?q="+encodeURIComponent(query)],
  ["JSTOR","https://www.jstor.org/action/doBasicSearch?Query="+encodeURIComponent(query)],
  ["Perseus Digital Library","https://www.perseus.tufts.edu/hopper/searchresults?q="+encodeURIComponent(query)]
 ];
 const group=make("ul",undefined,"article-related");
 for(const [name,url] of links){const li=make("li"),a=href(url,name);if(a)li.append(a);if(li.childNodes.length)group.append(li)}
 $("article-body").append(group);
 paragraph("Estos enlaces abren búsquedas externas; no se presentan como documentos ya cotejados.","article-note");
}
function appendPersonLoci(rows,person){
 const verified=matchingPersonPassages(rows,person);
 if(!verified.length)return false;
 heading(phrase("Coincidencias documentadas en el tratado de Vitruvio","Documented mentions in Vitruvius","Mentions attestées dans Vitruve"));
 const names=[person.name,...(person.aliases||[]),...(person.latin_forms||[])];
 if(person.id==="cicero")names.push("Cicero","Ciceronis","Ciceronem","Cicerone","Ciceroni","Cicerón");
 if(person.id==="cicero")names.push("Cicerón","Cicero","Cicerone","Ciceronis","Ciceronem");
 const forms=[...new Set(names.map(normalized).filter(x=>x.length>=5))];
 const matches=verified;
 const grouped=new Map();
 for(const hit of matches){
  if(!grouped.has(hit.locus))grouped.set(hit.locus,[]);
  if(!grouped.get(hit.locus).some(x=>x.edition===hit.edition))grouped.get(hit.locus).push(hit);
 }
 const loci=[...grouped].sort((a,b)=>{
  const left=a[0].split(".").map(Number),right=b[0].split(".").map(Number);
  return (left[0]-right[0])||(left[1]-right[1])||(left[2]-right[2]);
 });
 const books=new Set(loci.map(x=>x[0].split(".")[0]));
 paragraph(loci.length?
   phrase(loci.length+" loci identificados en "+books.size+" libros de De architectura (ediciones V514, V554 y V297). Se muestra el texto latino y sus traducciones disponibles.",
   loci.length+" loci identified in "+books.size+" books of De architectura (V514, V554 and V297), with Latin and available translations.",
   loci.length+" loci identifiés dans "+books.size+" livres de De architectura (V514, V554 et V297), avec le latin et les traductions disponibles."):
   phrase("No se recuperó una mención literal en los pasajes indexados para esta búsqueda. Esto no demuestra la ausencia del personaje en toda la tradición textual.",
   "No literal mention was retrieved in indexed passages. This does not prove absence from the full textual tradition.",
   "Aucune mention littérale retrouvée dans les passages indexés. Cela ne démontre pas une absence de toute la tradition textuelle."),"article-note");
 const holder=make("div",undefined,"person-vitruvian-list");$("article-body").append(holder);
 const romans=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
 for(const [locus,versions] of loci.slice(0,24)){
  const section=make("section",undefined,"person-locus-entry");
  section.append(make("h4","De architectura · Libro "+(romans[Number(locus.split(".")[0])]||locus.split(".")[0])+" · "+locus));
  const latin=versions.find(x=>x.edition==="recensio-es"&&x.latin)||versions.find(x=>x.latin);
  if(latin){
   section.append(make("div","LATINE · TEXTO EDITORIAL","person-language-label"));
   const p=make("p",cut(latin.latin,1150));p.lang="la";section.append(p);
  }
  for(const [edition,language,label] of [["recensio-es","es","V514 · CASTELLANO"],["recensio-fr","fr","V554 · FRANÇAIS"],["theory-en","en","V297 · ENGLISH"]]){
   const item=versions.find(x=>x.edition===edition&&x.translation);
   if(!item)continue;
   const outer=make("div",undefined,"person-translation");
   outer.append(make("div",label,"person-language-label"));
   const p=make("p",cut(item.translation,1250));p.lang=language;outer.append(p);
   if(language==="es")section.append(outer);
   else{const details=make("details",undefined,"person-other-language");details.append(make("summary",language==="fr"?"Leer en francés":"Read in English"),outer);section.append(details)}
  }
  const links=make("div",undefined,"person-edition-links");
  for(const item of versions){
   const link=href(item.link,"Leer locus "+locus+" · "+(item.edition||item.source||"edición"));
   if(link)links.append(link);
  }
  section.append(links);holder.append(section);
 }
 if(loci.length>24)paragraph("Se muestran 24 loci; las demás coincidencias están disponibles en el listado de resultados.","article-note");
 paragraph(phrase("Nota filológica: el texto procede de ediciones indexadas, no de OCR del códice. Las variantes flexivas exigen cotejo; no se asigna ningún folio manuscrito sin verificación.",
  "Philological note: these are edited texts, not codex OCR. Inflected forms require collation; manuscript folios are not inferred.",
  "Note philologique : textes édités, non OCR du codex. Les formes fléchies requièrent un examen ; aucun folio n'est supposé."),"article-note");
}
/* Extensible biographical profiles: one verified JSON entry per subject.
   Missing entries fall back to normal encyclopedic discovery, never empty stubs. */
let biographyIndexPromise=null;
function normalizeBiographyQuery(query){
 return normalized(String(query||"").replace(/^(?:biograf[ií]a|vida y obra|vida|historia|biography|life and works|who was|who is|quien fue|quién fue|quien es|quién es)\s+(?:de|del|of)?\s*/i,""));
}
async function biographyProfile(query){
 if(!biographyIndexPromise){
  biographyIndexPromise=fetch("data/scholarly-biographies.json?v=20261104-profiles-v1")
   .then(r=>{if(!r.ok)throw Error("Perfil no disponible");return r.json()})
   .catch(()=>({profiles:[]}));
 }
 const d=await biographyIndexPromise;
 const q=normalizeBiographyQuery(query);
 if(!q)return null;
 return (d.profiles||[]).find(profile=>[profile.name,...(profile.aliases||[])].some(alias=>normalized(alias)===q))||null;
}
function renderVerifiedBiography(profile){
 if(!profile)return;
 $("article-title").textContent=profile.name;
 $("article-byline").textContent=profile.category||"";
 paragraph(profile.introduction,"article-lead");
 heading(phrase("Identidad, cronología y nombres antiguos","Identity, chronology and ancient names","Identité, chronologie et noms anciens"));
 const names=make("dl",undefined,"vitruvia-bio-facts");
 for(const [key,value] of [
  [phrase("Griego antiguo","Ancient Greek","Grec ancien"),profile.ancientGreek],
  [phrase("Latín","Latin","Latin"),profile.latin],
  ...(profile.facts||[]).map(x=>[x.label,x.value])
 ]){
  if(!value)continue;
  const dt=make("dt",key),dd=make("dd",value);
  if(key==="Griego antiguo"||key==="Ancient Greek"||key==="Grec ancien")dd.lang="grc";
  if(key==="Latín"||key==="Latin")dd.lang="la";
  names.append(dt,dd);
 }
 $("article-body").append(names);
 for(const section of profile.sections||[]){heading(section.heading);paragraph(section.body)}
 if(profile.survival?.statement){
  heading(phrase("Obras auténticas y conservación","Authentic writings and survival","Écrits authentiques et transmission"));
  paragraph(profile.survival.statement);
  const ref=href(profile.survival.source,phrase("Consultar análisis crítico de las fuentes","Consult source-critical study","Consulter l'étude critique des sources"));
  if(ref)$("article-body").append(ref);
 }
 if(profile.sources?.length){
  heading(phrase("Bibliografía crítica para ampliar","Scholarly sources for further reading","Bibliographie critique pour approfondir"));
  const ul=make("ul",undefined,"article-related");
  for(const source of profile.sources){
   const li=make("li");const link=href(source.url,source.title);if(link)li.append(link);
   if(source.institution)li.append(document.createTextNode(" · "+source.institution));
   if(source.note)li.append(make("p",source.note,"article-note"));
   ul.append(li);
  }
  $("article-body").append(ul);
 }
}
function optionalManuscriptAccess(rows){
 const sources=(rows||[]).filter(row=>
  row.type==="manuscript"&&row.codexShelfmark&&row.codexRepository&&
  (row.localViewer||row.codexViewer||row.viewerUrl));
 if(!sources.length)return false;
 const unique=[],seen=new Set();
 for(const row of sources.sort((a,b)=>(a.codexDate??9999)-(b.codexDate??9999))){
  const key=row.codexRepository+"|"+row.codexShelfmark;
  if(seen.has(key))continue;seen.add(key);unique.push(row);
 }
 const container=make("details",undefined,"article-optional-manuscripts");
 container.id="article-manuscript-access";
 container.append(make("summary",phrase("Consultar manuscritos y visores (opcional) · "+unique.length,
  "Manuscripts and readers (optional) · "+unique.length,
  "Manuscrits et visionneuses (facultatif) · "+unique.length)));
 const p=make("p",phrase(
  "Los manuscritos se consultan solo si querés profundizar. Las fechas se refieren a las copias conservadas, no a la composición del texto.",
  "Open manuscripts only if you wish to explore further. Dates refer to surviving copies, not the work's composition.",
  "L'accès aux manuscrits est facultatif. Les dates concernent les copies conservées, non la rédaction du texte."),"article-note");
 container.append(p);
 const list=make("ol",undefined,"article-related");
 for(const row of unique.slice(0,20)){
  const li=make("li"),link=href(row.localViewer||row.codexViewer||row.viewerUrl,row.title||row.codexShelfmark);
  if(link)li.append(link);
  li.append(make("small"," · "+[row.codexRepository,row.codexShelfmark,row.meta].filter(Boolean).join(" · "),"article-license"));
  if(row.localViewer&&window.VitruviaLocalManuscripts){
   const open=make("button",phrase("Ampliar visor aquí","Expand reader here","Agrandir la visionneuse ici"));
   open.type="button";open.className="article-local-viewer";
   open.addEventListener("click",()=>window.VitruviaLocalManuscripts.open(row.localViewer,row.title));
   li.append(document.createTextNode(" "),open);
  }
  list.append(li);
 }
 container.append(list);$("article-body").append(container);
 const side=$("article-aside");
 if(side){
  const nav=href("#article-manuscript-access",phrase("Códices y visores · opcional","Codices and readers · optional","Codex et visionneuses · facultatif"));
  if(nav){nav.className="article-index-link article-viewer-shortcut";nav.addEventListener("click",()=>{container.open=true});side.append(nav)}
 }
 return true;
}

function appendBiographyExtract(raw){
 const pieces=String(raw||"").split(/\r?\n/);
 let buffer=[],length=0,paragraphs=0,sections=0;
 const flush=()=>{
  const text=buffer.join(" ").replace(/\s+/g," ").trim();buffer=[];
  if(!text||length>44000||paragraphs>=75)return;
  const sample=cut(text,Math.min(3200,46000-length));
  if(sample){paragraph(sample,paragraphs===0?"article-lead":undefined);length+=sample.length;paragraphs++}
 };
 for(const line of pieces){
  if(length>44000||paragraphs>=75)break;
  const trimmed=line.trim();
  const title=trimmed.match(/^={2,5}\s*([^=]+?)\s*={2,5}$/);
  if(title){flush();if(sections<35){heading(title[1]);sections++}}
  else if(!trimmed)flush();
  else buffer.push(trimmed);
 }
 flush();
 return paragraphs;
}
/* External material is attributed; editorial overview is independently authored. */
const ciceroChapters=[
["Origen y formación","Marco Tulio Cicerón (106–43 a. C.) nació en Arpino, en una familia acomodada del orden ecuestre. Su origen fuera de la aristocracia senatorial romana marcó su ascenso como homo novus. Se educó en Roma, estudió retórica, derecho y filosofía y completó su formación con maestros griegos. La tradición le atribuye una extraordinaria capacidad para unir argumentación jurídica, cultura literaria y vida política."],
["Carrera pública y ascenso","Tras sus primeras actuaciones como abogado, Cicerón desempeñó las magistraturas de cuestor, edil y pretor hasta alcanzar el consulado en 63 a. C. Su carrera coincidió con la crisis de la República tardía, cuando las antiguas instituciones estaban sometidas a la competencia entre grandes generales, facciones senatoriales y tribunos populares."],
["La conjuración de Catilina","Durante su consulado denunció la conspiración de Lucio Sergio Catilina y pronunció las célebres Catilinarias. La ejecución de conspiradores sin juicio popular se convirtió después en una controversia jurídica y política que afectaría decisivamente a su carrera. La discusión sobre la salvación de la República y los límites del poder consular atraviesa su legado."],
["Exilio y retorno","En 58 a. C. una legislación impulsada por Publio Clodio Pulcro precipitó el exilio de Cicerón, relacionado con las condenas de los conjurados. Regresó al año siguiente gracias a un movimiento político favorable. Sus discursos y cartas de ese período expresan tanto su preocupación por el orden constitucional como su propia vulnerabilidad ante las alianzas cambiantes de Roma."],
["César y la guerra civil","Cicerón miró con desconfianza la concentración de poder en torno a Julio César, aunque sus posiciones prácticas variaron con las circunstancias. Durante la guerra civil se aproximó al bando de Pompeyo y posteriormente recibió el perdón de César. Tras la victoria cesariana dedicó una parte significativa de su actividad a la escritura filosófica y retórica."],
["Los últimos años y la muerte","Después del asesinato de César en 44 a. C., Cicerón defendió la autoridad del Senado y atacó públicamente a Marco Antonio en las Filípicas. La formación del Segundo Triunvirato lo dejó expuesto a las proscripciones; fue asesinado en 43 a. C. Su muerte se convirtió en una imagen duradera de la violencia que acompañó al final de la República."],
["Obra oratoria y retórica","Discursos judiciales y políticos como Pro Archia, Pro Caelio, In Verrem, Pro Milone y las Catilinarias permiten estudiar las técnicas de persuasión y el funcionamiento de la vida forense romana. En De oratore, Brutus y Orator reflexionó sobre la educación del orador, la elocuencia, los estilos discursivos y la relación entre filosofía y palabra pública."],
["Obra filosófica y pensamiento político","En De re publica y De legibus examinó la comunidad política, la justicia y las leyes. En De officiis trató los deberes morales, lo útil y lo honesto; en De finibus, Tusculanae disputationes, De natura deorum y De divinatione dialogó con las principales escuelas helenísticas. Su aporte no consistió en reproducir mecánicamente la filosofía griega, sino en construir un vocabulario latino capaz de discutirla."],
["Epistolario y vida privada","Las colecciones de cartas a Ático, familiares y a su hermano Quinto revelan el modo en que sus decisiones públicas se entrelazaban con intereses patrimoniales, vínculos de amistad y preocupaciones domésticas. Constituyen testimonios fundamentales sobre las redes sociales y políticas de la República tardía, aunque deben leerse teniendo en cuenta su carácter personal y circunstancial."],
["Recepción e influencia","La prosa de Cicerón ejerció una influencia profunda sobre la educación retórica latina, la transmisión medieval de los clásicos y el humanismo renacentista. Su discusión de la ley natural, los deberes cívicos, el gobierno mixto y la elocuencia también marcó tradiciones posteriores de pensamiento político. Sus escritos se valoran como documentos históricos y como obras literarias, pero sus afirmaciones deben contrastarse con otras fuentes antiguas."]
];
function addExternalDiscovery(person){
 heading(phrase("Otras enciclopedias y herramientas de investigación","Other encyclopedias and research tools","Autres encyclopédies et outils de recherche"));
 paragraph(phrase("Estos enlaces complementan la investigación; sus respuestas no se importan automáticamente ni se presentan como fuentes ya leídas.","These links extend the research; their results are not automatically imported or represented as consulted.","Ces liens complètent la recherche sans prétendre que leurs résultats ont été consultés."),"article-note");
 const names=[["Google", "https://www.google.com/search?q="+encodeURIComponent(person.name+" biografía historia fuentes")],["Google AI", "https://www.google.com/search?q="+encodeURIComponent(person.name+" biografía historia")],["Grokipedia","https://grokipedia.com/search?q="+encodeURIComponent(person.name)],["Wikipedia","https://es.wikipedia.org/w/index.php?search="+encodeURIComponent(person.name)]];
 const div=make("div",undefined,"article-actions");
 for(const [name,url] of names){const link=href(url,name);if(link)div.append(link)}
 $("article-body").append(div);
}
async function fallbackWiki(person){
 const name=person.id==="cicero"?"Marco Tulio Cicerón":person.name;
 for(const lang of [document.documentElement.lang==="en"?"en":"es","en"]){
  try{
   const search=new URLSearchParams({action:"query",generator:"search",gsrsearch:name,gsrlimit:"3",prop:"extracts|info",explaintext:"1",inprop:"url",exsectionformat:"wiki",format:"json",origin:"*"});
   const response=await fetch("https://"+lang+".wikipedia.org/w/api.php?"+search);
   if(!response.ok)continue;
   const json=await response.json(),pages=Object.values(json.query?.pages||{});
   const page=pages.find(p=>normalized(p.title).includes(normalized(name))||normalized(name).includes(normalized(p.title)));
   if(page?.extract)return {extract:page.extract,fullurl:page.fullurl,title:page.title,lang};
  }catch{}
 }
 return null;
}
async function renderHistoricalPerson(top,rows,person,token){
 reset(person.name,phrase("Síntesis editorial y biografía documentada","Editorial synthesis and documented biography","Synthèse éditoriale et biographie documentée"),
  phrase("01 · BIOGRAFÍA HISTÓRICA","01 · HISTORICAL BIOGRAPHY","01 · BIOGRAPHIE HISTORIQUE"));
 aside(rows);
 const isCicero=person.id==="cicero";
 if(isCicero){
  paragraph("Marco Tulio Cicerón · Arpino, 106 a. C. — Formias, 43 a. C. · Orador, jurista, filósofo y político de la República romana.","article-lead");
  for(const [header,body] of ciceroChapters){heading(header);paragraph(body)}
 }
 const data=top?await wikiSummary(top):await fallbackWiki(person);
 if(token!==active)return;
 if(data?.extract){
  heading(phrase("Documentación enciclopédica complementaria","Supplementary encyclopedic documentation","Documentation encyclopédique complémentaire"));
  paragraph(phrase("A continuación se presenta material procedente de Wikipedia, atribuido a sus colaboradores (CC BY-SA). No constituye una redacción original de Vitruvia.","The following text is sourced from Wikipedia under CC BY-SA; it is not original Vitruvia authorship.","Le texte suivant provient de Wikipédia sous CC BY-SA et n'est pas une rédaction originale de Vitruvia."),"article-note");
  if(!appendBiographyExtract(data.extract))paragraph(top?.excerpt||"","article-lead");
  const original=href(data.fullurl||top?.link,phrase("Consultar el original, las notas y el historial","Consult source, references and history","Voir la source, les références et l'historique"));
  if(original)$("article-body").append(original);
 }else if(!isCicero){
  paragraph(top?.excerpt||phrase("No se obtuvo una biografía extensa verificable de las fuentes públicas consultadas.","A verified long biography could not be retrieved.","Biographie complète indisponible."),"article-lead");
 }
 addExternalDiscovery(person);
 heading(phrase("Bibliografía y referencias comprobables","Bibliography and verifiable references","Bibliographie et références vérifiables"));
 const related=rows.filter(x=>x.link&&["book","article","wikidata","googlebook","wikipedia"].includes(x.type));
 const seen=new Set(),ul=make("ul",undefined,"article-related");
 for(const r of related){if(seen.has(r.link))continue;seen.add(r.link);const li=make("li"),link=href(r.link,r.title||r.source);if(link)li.append(link);if(li.childNodes.length)ul.append(li);if(ul.children.length>=14)break}
 if(ul.children.length)$("article-body").append(ul);
 const refs=[...(top?[top]:[]),...related];
 if(data?.fullurl)refs.unshift({title:"Wikipedia · "+(data.title||person.name),link:data.fullurl});
 if(isCicero)refs.push({title:"Cicero · Stanford Encyclopedia of Philosophy",link:"https://plato.stanford.edu/entries/cicero/"});
 references(refs,"Síntesis editorial propia de Vitruvia; información enciclopédica externa identificada y atribuida. Las fuentes enlazadas no equivalen a una consulta automática de Google AI o Grokipedia.");
 appendPersonLoci(rows,person);
 appendAcademicLinks(person.name);
 buildContents();
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
const firstBody=$("article-body").querySelector("p");const wikiCitation=href(d.fullurl||top.link,"[1]");
if(firstBody&&wikiCitation){wikiCitation.className="inline-citation";firstBody.append(" ",wikiCitation)}
appendResearch(rows,top.title,top.title);
heading(phrase("Bibliografía y lecturas relacionadas","Bibliography and further reading","Bibliographie et lectures complémentaires"));
const related=rows.filter(x=>x.link&&x.link!==top.link&&["passage","book","section","article","wikidata"].includes(x.type)).slice(0,6);
if(related.length){
 const ul=make("ul",undefined,"article-related");
 for(const item of related){const li=make("li");const a=href(item.link,item.title);if(a)li.append(a);ul.append(li)}
 $("article-body").append(ul);
}else paragraph(phrase("No hay documentos adicionales identificados para esta consulta.","No additional documents identified for this search.","Aucun document supplémentaire identifié pour cette recherche."),"article-note");
const p=make("p",phrase("Texto enciclopédico procedente de Wikipedia. Consultar el artículo, su historial y referencias originales:","Encyclopedia text from Wikipedia. Consult the full article, edit history and original references:","Texte encyclopédique provenant de Wikipédia. Consulter l’article, son historique et les sources :"),"article-note");
const a=href(d.fullurl||top.link,phrase("Abrir fuente original ↗","Open original source ↗","Ouvrir la source ↗"));if(a)p.append(document.createTextNode(" "),a);$("article-body").append(p);buildContents()
}
/* Article composed from live bibliographic records, not fabricated AI claims. */
/* A source-backed research dossier, not a catalog hit list. */
const arkSections=[
["Denominación y significado","El Arca de la Alianza, llamada en hebreo aron ha-berit, es un objeto central de la tradición bíblica israelita. Los relatos la describen como un cofre sagrado vinculado a la alianza entre el pueblo de Israel y su Dios, a la custodia de las tablas de la Ley y a la presencia divina. Su función es religiosa y literaria, y debe distinguirse el testimonio de los textos de la comprobación arqueológica."],
["Descripción material en el Éxodo","Éxodo 25:10–22 prescribe un arca de madera de acacia recubierta de oro, con anillas y varas para transportarla. Sobre la cubierta, denominada propiciatorio, se sitúan dos querubines con las alas extendidas. Las dimensiones se ofrecen en codos: dos y medio de longitud por uno y medio de anchura y altura. Estas proporciones pertenecen al texto bíblico; no se dispone de un ejemplar arqueológico confirmado."],
["Contenido y significado de la alianza","La tradición asocia el Arca fundamentalmente con las tablas del testimonio. Hebreos 9:4 menciona además el vaso del maná y la vara de Aarón, mientras que otros pasajes diferencian lo que se conservaba dentro y junto al cofre. Las diferencias entre relatos se estudian en exégesis bíblica y crítica textual, sin armonizarlas artificialmente."],
["El santuario y el tabernáculo","Los capítulos finales de Éxodo vinculan el Arca con el espacio más sagrado del tabernáculo. Las instrucciones para velos, mobiliario y acceso ritual fijan una organización espacial jerarquizada, cuyo interés para la historia de la arquitectura religiosa reside en la relación entre objeto, recinto, procesión y separación de ámbitos."],
["Relatos históricos del Arca","En Josué, Samuel y Reyes el Arca aparece en escenas de traslado, guerra, celebración y culto. Primero se la relaciona con Silo y otros centros; después, 2 Samuel 6 relata su traslado a Jerusalén por David. Primera de Reyes 8 la sitúa en la dedicación del templo de Salomón. Estas narraciones son fuentes antiguas para comprender la tradición, no un registro arqueológico contemporáneo de todos los acontecimientos."],
["Desaparición y debates históricos","Los textos bíblicos no ofrecen un relato inequívoco sobre el destino final del Arca después de la historia monárquica. Se han propuesto diversas explicaciones, desde pérdida o destrucción hasta ocultación y traslado, pero ninguna localización moderna está demostrada científicamente. La tradición etíope, entre otras, sostiene una historia propia de custodia que debe presentarse como tradición religiosa."],
["Iconografía y recepción","El Arca ha sido representada en manuscritos, pinturas, reconstrucciones de templos y expresiones populares. Su iconografía combina el cofre, las varas de transporte, los querubines y los espacios de culto. Para una investigación histórico-artística, las imágenes deben catalogarse por fecha, procedencia, autoría y relación con el texto de referencia."],
["Método crítico y relación con Vitruvio","La descripción bíblica y el De architectura de Vitruvio pertenecen a tradiciones literarias y contextos diferentes. Puede realizarse un análisis comparado de proporciones, materiales, mobiliario sagrado y arquitectura de templos. Esa comparación no constituye una mención directa del Arca por Vitruvio. Solo los loci realmente recuperados del tratado deben presentarse como pruebas de una relación textual."]
];
async function topicWikiData(query){
 const variations=[query,normalized(query).replace(/^(el|la|los|las|the|le|les) /,"")];
 const langs=[...new Set([document.documentElement.lang||"es","es","en"])];
 for(const lang of [...new Set(langs)]){
  for(const term of variations){
   try{
    const p=new URLSearchParams({action:"query",generator:"search",gsrsearch:term,gsrlimit:"5",prop:"extracts|info",explaintext:"1",inprop:"url",format:"json",origin:"*"});
    const response=await fetch("https://"+lang+".wikipedia.org/w/api.php?"+p);
    if(!response.ok)continue;
    const json=await response.json();
    const pages=Object.values(json.query?.pages||{}).filter(x=>x.extract?.length>300);
    const clean=x=>normalized(x).replace(/^(el|la|los|las|the|le|les) /,"");
    const selected=pages.find(x=>clean(x.title)===clean(term))||pages.find(x=>clean(x.title).includes(clean(term))||clean(term).includes(clean(x.title)));
    if(selected)return selected;
   }catch{}
  }
 }
 return null;
}
/* Topic dossiers: encyclopedic narrative first; original-language literature, scholarship, outreach after. */
/* Academic research hierarchy: encyclopedia -> historical works -> books -> scholarship -> images. */

/* Wikimedia-style editorial organization; content is original, sources remain attributed. */
const deityDossier=[
["Definición y alcance","Dios es una denominación que puede referirse a una divinidad suprema, a una entidad sobrenatural venerada o, en plural, a los seres divinos de tradiciones politeístas. El significado depende del sistema religioso, de la lengua y de la época. El estudio académico distingue la concepción de los creyentes, el análisis filosófico de la divinidad y la descripción histórica de los cultos; ninguna de estas aproximaciones, por sí sola, demuestra o refuta una afirmación metafísica."],
["Historia de las ideas religiosas","Las comunidades antiguas formularon explicaciones sobre el origen del mundo, la legitimidad política, el orden cósmico y la existencia humana mediante narraciones de dioses y poderes sagrados. Mesopotamia, Egipto, la cuenca mediterránea, Asia meridional y otras regiones desarrollaron panteones, prácticas rituales y teologías diferentes. Estas tradiciones no forman una secuencia evolutiva única: convivieron, se transformaron y se influyeron de maneras históricamente específicas."],
["Monoteísmo, politeísmo y otras concepciones","En el monoteísmo se afirma la existencia de un solo Dios; el politeísmo reconoce múltiples divinidades, con competencias y genealogías variables. En el henoteísmo se privilegia el culto a una divinidad sin excluir necesariamente otras. El panteísmo identifica de algún modo lo divino con la totalidad de lo real; el panenteísmo sostiene una relación distinta entre Dios y el universo. Estas categorías modernas son herramientas de comparación y requieren cautela al aplicarlas a textos antiguos."],
["Judaísmo y textos hebreos","La Biblia hebrea reúne obras de épocas y géneros diversos. En ellas se desarrolla la relación entre el Dios de Israel, la alianza, la ley, la historia y la sabiduría. Génesis, Éxodo, Deuteronomio, Salmos y los libros proféticos constituyen fuentes primarias importantes. El nombre divino, las traducciones de los términos hebreos y la historia textual de las versiones griegas y arameas son objeto de investigación filológica."],
["Cristianismo y teologías históricas","La tradición cristiana interpreta a Dios a la luz de las Escrituras judías y de los escritos del Nuevo Testamento. Las doctrinas de la Trinidad, la creación, la encarnación y la gracia fueron objeto de debates históricos, concilios y desarrollos teológicos. Para estudiar estas ideas se consultan tanto los textos bíblicos como autores patrísticos, manuscritos y documentos doctrinales, diferenciando las formulaciones confesionales de su contexto histórico."],
["Islam y el Corán","El islam afirma la unicidad de Dios, expresada en la noción de tawḥīd. El Corán constituye su escritura central; entre sus pasajes teológicos fundamentales se encuentra la sura 112, al-Ijlāṣ. Los estudios históricos y filológicos examinan el árabe coránico, las tradiciones exegéticas, el desarrollo intelectual islámico y las distintas escuelas de teología. El Corán y sus comentarios no deben confundirse con obras de otras tradiciones."],
["Dioses griegos y romanos","Zeus, Hera, Atenea, Apolo, Artemisa, Afrodita, Poseidón y otras figuras integran tradiciones griegas transmitidas por épica, poesía, himnos, teatro y testimonios materiales. Los romanos reinterpretaron numerosos cultos y nombres, como Júpiter, Juno, Minerva y Venus, sin que las equivalencias sean siempre exactas. Homero, Hesíodo, los himnos y los testimonios epigráficos son fuentes indispensables para comprender la diversidad de sus representaciones."],
["Egipto, Mesopotamia y otras tradiciones","En Egipto, figuras como Ra, Amón, Osiris, Isis y Horus formaron parte de prácticas locales y regias que cambiaron durante milenios. Mesopotamia conoció divinidades como Anu, Enlil, Enki, Inanna e Ishtar. En India, las tradiciones hindúes incluyen concepciones muy diversas de Brahman, Vishnu, Shiva y Devi. Las religiones nórdicas, africanas, americanas y de Asia oriental ofrecen otras cosmologías que deben estudiarse en su propia documentación."],
["Filosofía y argumentos sobre la existencia divina","La filosofía antigua y medieval elaboró argumentos cosmológicos, ontológicos y teleológicos, así como objeciones relativas al mal, el conocimiento y la relación entre libertad y providencia. Platón, Aristóteles, Plotino, Agustín, Avicena, Maimónides y Tomás de Aquino pertenecen a tradiciones intelectuales diferentes. La filosofía moderna y contemporánea debate también sobre la inteligibilidad de los atributos divinos y el estatuto de la experiencia religiosa."],
["Arte, imágenes y representaciones","La representación visual de lo divino varía considerablemente: esculturas de culto, frescos, mosaicos, iconos, miniaturas y pintura religiosa. Algunas tradiciones desarrollaron imágenes antropomórficas, mientras otras restringieron o rechazaron determinadas representaciones de Dios. Es necesario distinguir una imagen de un dios mitológico, una alegoría, un objeto ritual y una representación posterior inspirada en la literatura antigua."],
["Métodos históricos y límites del conocimiento","La investigación combina crítica textual, historia de las religiones, arqueología, iconografía, antropología y filosofía. Los manuscritos conservados no siempre reproducen sin variaciones las primeras versiones; las dataciones pueden ser discutidas y la ausencia de pruebas no equivale a una refutación. Una enciclopedia académica debe identificar los testimonios y separar creencias, hipótesis e información documental."],
["Relaciones con la arquitectura religiosa","Templos, altares, santuarios, iglesias y mezquitas constituyen espacios arquitectónicos que responden a tradiciones muy distintas. La disposición ritual, la orientación, las proporciones y los programas iconográficos conectan creencias y formas construidas. El tratado de Vitruvio sirve para estudiar determinados edificios sagrados del mundo grecorromano, pero sus referencias a divinidades no constituyen una exposición universal de la idea de Dios."]
];
function isDeityQuery(query){
 return /^(?:dios|dioses|deidad|deidades|divinidad|god|gods|deity|deities|dieu|dieux)$/.test(normalized(query).trim());
}
function deityPrimaryBibliography(){
 return [
 {title:"Biblia hebrea · Génesis (texto hebreo)",author:"Tradición bíblica hebrea",link:"https://www.sefaria.org/Genesis.1",type:"book"},
 {title:"Biblia hebrea · Éxodo (texto hebreo)",author:"Tradición bíblica hebrea",link:"https://www.sefaria.org/Exodus.1",type:"book"},
 {title:"Nuevo Testamento · Evangelio según Juan (griego y traducciones)",author:"Tradición cristiana",link:"https://www.biblegateway.com/passage/?search=John%201",type:"book"},
 {title:"Corán · al-Fātiḥa, sura 1 (árabe)",author:"Tradición islámica",link:"https://quran.com/1",type:"book"},
 {title:"Corán · al-Ijlāṣ, sura 112 (árabe)",author:"Tradición islámica",link:"https://quran.com/112",type:"book"},
 {title:"Hesíodo · Teogonía (griego antiguo)",author:"Hesíodo",link:"https://www.perseus.tufts.edu/hopper/searchresults?q=Hesiod+Theogony",type:"book"},
 {title:"Homero · Ilíada (griego antiguo)",author:"Homero",link:"https://www.perseus.tufts.edu/hopper/searchresults?q=Homer+Iliad",type:"book"},
 {title:"Himnos homéricos (griego antiguo)",author:"Tradición griega",link:"https://www.perseus.tufts.edu/hopper/searchresults?q=Homeric+Hymns",type:"book"},
 {title:"Ovidio · Metamorfosis (latín)",author:"Publio Ovidio Nasón",link:"https://www.perseus.tufts.edu/hopper/searchresults?q=Ovid+Metamorphoses",type:"book"}
 ];
}

/* Reference works follow the biography. Editorial priorities are explicit
   where an identified bibliography exists; otherwise results remain provisional. */
const curatedReferenceWorks={
 "adolf hitler":[
  {title:"Hitler, 1889–1936: Hubris",author:"Ian Kershaw",year:1998,
   link:"https://www.penguin.co.uk/books/13312/hitler-1889-1936-by-ian-kershaw/9780140133639",
   note:"Biografía histórica de referencia · volumen I · editorial Penguin"},
  {title:"Hitler, 1936–1945: Nemesis",author:"Ian Kershaw",year:2000,
   link:"https://www.penguin.co.uk/books/24213/hitler-1936-1945-by-kershaw-ian/9780141925813",
   note:"Biografía histórica de referencia · volumen II · editorial Penguin"}
 ]
};
/* Universal bibliography: title coverage, source metadata and edition history.
   A high catalogue count is evidence of dissemination, not proof of scholarly quality. */
function referenceBooks(rows,query){
 const q=normalized(query),words=q.split(" ").filter(w=>w.length>=3);
 const curated=curatedReferenceWorks[q]||(q==="hitler"?curatedReferenceWorks["adolf hitler"]:[]);
 const matched=(rows||[]).filter(r=>{
  if(!["openlibrary","googlebook","book"].includes(r.type)||!r.link||!r.title)return false;
  const title=normalized(r.title),subject=normalized([r.title,r.excerpt||""].join(" "));
  const full=words.length&&words.every(w=>subject.includes(w));
  const authorIsSubject=normalized(r.author||"")===q;
  return full&&!authorIsSubject&&title.length>3;
 }).map(r=>{
  const name=normalized(r.title),titleCoverage=words.filter(w=>name.includes(w)).length/Math.max(1,words.length);
  const editionEvidence=Math.min(30,Math.log2(1+(Number(r.editionCount)||0))*5);
  const scholarly=/university press|academic|critical edition|edicion critica|cambridge|oxford/i.test([r.publisher,r.meta].join(" "))?13:0;
  return {title:r.title,author:r.author||r.publisher||"",year:r.year||"",link:r.link,
   note:r.meta||"Ficha bibliográfica externa · comprobar contenido",
   priority:Math.round(80*titleCoverage+editionEvidence+scholarly+Math.min(25,(r.rating||0)/6))};
 }).sort((a,b)=>b.priority-a.priority).slice(0,25);
 const out=[],seen=new Set();
 for(const item of [...curated.map((x,i)=>({...x,priority:900-i})),...matched]){
  const key=normalized(item.title);
  if(!key||seen.has(key))continue;
  seen.add(key);out.push(item);
 }
 return out;
}

/* Academic dossiers: verified institutional facts, no unverified claims of completeness. */
function appendCuratedUniversities(rows){
 const found=(rows||[]).filter(r=>r.curatedAcademic&&r.type==="university"&&r.link);
 if(!found.length)return;
 heading(phrase("Instituciones universitarias que estudian la obra","University research and collections","Universités et collections de recherche"));
 paragraph(phrase("Selección documentada de bibliotecas y proyectos universitarios asociados con esta obra. No representa un listado exhaustivo.",
 "Verified university libraries and research projects associated with this work; this is not an exhaustive directory.",
 "Sélection documentée de bibliothèques et de projets de recherche liés à cette œuvre ; non exhaustive."),"article-note");
 const ul=make("ul",undefined,"article-related");
 for(const r of found){const li=make("li"),a=href(r.link,r.title);if(a)li.append(a);
  li.append(make("small"," · "+[r.library,r.excerpt].filter(Boolean).join(" · "),"article-license"));ul.append(li)}
 $("article-body").append(ul);
}
function appendCuratedEvidence(rows){
 const fragment=(rows||[]).filter(r=>r.curatedAcademic&&r.type==="fragment"&&r.link)
  .sort((a,b)=>(a.codexDate??9999)-(b.codexDate??9999));
 if(fragment.length){
  heading(phrase("Papiros y fragmentos antiguos","Ancient papyri and fragments","Papyrus et fragments antiques"));
  paragraph(phrase("Los fragmentos anteriores al códice no son copias completas de la obra ni tienen formato de libro. Su datación y conservación se atribuyen a la institución custodiante.",
   "Older fragments are neither complete copies nor bound codices. Dates and locations follow the holding institution.",
   "Les fragments antérieurs ne sont ni des copies complètes ni des codex reliés. Dates et lieux suivent les notices de conservation."),"article-note");
  const list=make("ol",undefined,"article-related");
  for(const r of fragment){const li=make("li"),a=href(r.link,r.title);
   if(a)li.append(a);li.append(make("small"," · "+[r.codexRepository,r.codexShelfmark,r.meta,r.excerpt].filter(Boolean).join(" · "),"article-license"));list.append(li)}
  $("article-body").append(list);
 }
 const editions=(rows||[]).filter(r=>r.curatedAcademic&&r.type==="edition"&&r.link).sort((a,b)=>(a.editionYear??9999)-(b.editionYear??9999));
 if(editions.length){
  heading(phrase("Ediciones del texto original y traducciones identificadas","Identified original editions and translations","Éditions originales et traductions identifiées"));
  paragraph(phrase("Cada traducción se atribuye a su responsable editorial y a un catálogo de lectura verificado; no se presenta como transcripción propia del códice.",
   "Each translation is attributed to its editor and catalog; it is not presented as a transcription of the original manuscript.",
   "Chaque traduction est attribuée à son éditeur et à son catalogue ; elle ne représente pas une transcription du codex."),"article-note");
  const ul=make("ul",undefined,"article-related");
  for(const r of editions){const li=make("li"),a=href(r.link,r.title);
   if(a)li.append(a);li.append(make("small"," · "+[r.author,r.editionYear<9999?r.editionYear:"",r.meta,r.excerpt].filter(Boolean).join(" · "),"article-license"));ul.append(li)}
  $("article-body").append(ul);
 }
 const scholars=(rows||[]).filter(r=>r.curatedAcademic&&r.type==="scholar"&&r.link);
 if(scholars.length){
  heading(phrase("Investigadores y estudios especializados","Scholars and specialist studies","Chercheurs et études spécialisées"));
  paragraph(phrase("Investigadores identificados mediante páginas universitarias y publicaciones académicas. La selección no equivale a una clasificación de prestigio.",
   "Scholars identified by university pages and academic publications; this is not a ranking.",
   "Chercheurs identifiés grâce aux universités et publications ; il ne s'agit pas d'un classement."),"article-note");
  const ul=make("ul",undefined,"article-related");
  for(const r of scholars){const li=make("li"),a=href(r.link,r.title);if(a)li.append(a);
   li.append(make("small"," · "+[r.author,r.excerpt].filter(Boolean).join(" · "),"article-license"));ul.append(li)}
  $("article-body").append(ul);
 }
}


/* Internal corpus is authoritative for what is actually hosted here; external
   manuscript ownership and edition identity remain attributed separately. */
function appendLocalRepositoryResources(rows){
 const local=(rows||[]).filter(r=>
  r.type==="manuscript"&&r.localViewer||
  r.type==="book"&&r.localHosted||
  r.type==="edition"&&/^(?:lector-bilingue|bibliotheca-graeca-latina)\.html(?:\?|$)/.test(r.link||""));
 if(!local.length)return;
 const unique=[],seen=new Set();
 for(const r of local){
  const key=r.type+":"+normalized(r.title)+"|"+normalized(r.author);
  if(seen.has(key))continue;seen.add(key);unique.push(r);
 }
 heading(phrase("Leer en esta biblioteca · códices, textos y ediciones",
  "Read in this library · codices, texts and editions",
  "Lire dans cette bibliothèque · codex, textes et éditions"));
 paragraph(phrase("Recursos efectivamente incorporados o enlazados al lector de Vitruvius Digital Library. Un facsímil manuscrito, una transcripción, una edición moderna y su traducción son documentos diferentes.",
  "Materials hosted or opened in the Vitruvius Digital Library reader. A manuscript facsimile, transcription, modern edition and translation are different objects.",
  "Documents hébergés ou ouverts dans le lecteur de Vitruvius Digital Library. Fac-similé, transcription, édition et traduction sont des objets distincts."),"article-note");
 const list=make("div",undefined,"article-local-library");
 for(const r of unique.slice(0,20)){
  const card=make("article",undefined,"article-local-resource");
  const h=make("h4",r.title);card.append(h);
  card.append(make("p",[r.author,r.meta].filter(Boolean).join(" · "),"article-license"));
  if(r.excerpt)card.append(make("p",cut(r.excerpt,260),"article-note"));
  const nav=make("div",undefined,"article-local-actions");
  const internal=[r.localViewer?{label:phrase("Leer folios locales","Read local folios","Lire les folios locaux"),url:r.localViewer}:null,
   ...((r.links||[]).filter(x=>/^(?:codex-h-folios-local|lector-bilingue|bibliotheca-graeca-latina|corpus\/[a-z0-9/_-]+|documents\/[a-z0-9/_-]+)\.html|^documents\/(?:classics\/)?[a-z0-9-]+\.pdf/i.test(x.url||"")).slice(0,5)),
   r.pdf?{label:phrase("Abrir PDF","Open PDF","Ouvrir PDF"),url:r.pdf}:null,
   {label:phrase("Ficha de la obra","Work record","Notice de l’œuvre"),url:r.link}
  ].filter(x=>x?.url);
  const links=new Set();
  for(const data of internal){
   if(links.has(data.url))continue;links.add(data.url);
   const a=href(data.url,data.label);if(a)nav.append(a);
  }
  if(r.localViewer&&window.VitruviaLocalManuscripts){
   const btn=make("button",phrase("Leer el códice aquí","Read codex here","Lire le codex ici"));
   btn.type="button";btn.className="article-local-viewer";
   btn.addEventListener("click",()=>window.VitruviaLocalManuscripts.open(r.localViewer,r.title));
   nav.prepend(btn);
  }
  if(r.citationText&&navigator.clipboard?.writeText){
   const btn=make("button",phrase("Copiar cita","Copy citation","Copier la référence"));
   btn.type="button";btn.className="article-copy-source";
   btn.addEventListener("click",()=>{
    navigator.clipboard.writeText(r.citationText).then(()=>{
     btn.textContent=phrase("Cita copiada","Citation copied","Référence copiée");
    }).catch(()=>{btn.textContent=phrase("Error al copiar","Copy failed","Erreur de copie")});
   });nav.append(btn);
  }
  card.append(nav);list.append(card);
 }
 $("article-body").append(list);
}

function appendManuscriptHierarchy(rows,query){
 const items=(rows||[]).filter(r=>r.type==="manuscript"&&r.link&&(r.codexShelfmark||r.archiveDiscovery)&&
  (r.primaryWitness||r.curatedAcademic||r.archiveDiscovery||relevance({...r,title:[r.title,r.author,r.excerpt].join(" ")},query)>=35))
  .sort((a,b)=>Number(!!b.primaryWitness)-Number(!!a.primaryWitness)||(a.codexDate??9999)-(b.codexDate??9999)).slice(0,25);
 if(!items.length)return;
 heading("Tradición manuscrita · códices y testimonios por obra");
 paragraph("Se destacan testimonios fechados e identificados en la biblioteca. Los registros externos enlazados por Wikidata requieren comprobación codicológica: ni su datación ni su importancia constituyen una atribución verificada.","article-note");
 const list=make("ol",undefined,"article-related article-manuscripts");
 for(const [i,r] of items.entries()){
  const li=make("li",undefined,r.primaryWitness||r.archiveDiscovery&&i===0?"principal-reference-work":undefined);
  if(r.primaryWitness)li.append(make("strong","TESTIMONIO DESTACADO EN EL CATÁLOGO · "));
  else if(r.archiveDiscovery&&i===0)li.append(make("strong","PRIMER REGISTRO DE MANUSCRITO VINCULADO · "));
  const a=href(r.codexViewer||r.viewerUrl||r.link,r.title);
  if(a)li.append(a);
  li.append(make("small"," · "+[r.codexRepository,r.meta].filter(Boolean).join(" · "),"article-license"));
  const record=href(r.links?.find(x=>/ficha/i.test(x.label))?.url||r.link," · Ficha institucional");
  if(record)li.append(record);
  list.append(li);
 }
 $("article-body").append(list);
}
function appendInstitutionalResearch(query){
 heading("Universidades, museos y centros de investigación");
 paragraph("Búsquedas acotadas por institución. Son rutas externas para localizar estudios y colecciones; Vitruvia no afirma haber leído ni evaluado cada resultado.","article-note");
 const domains=[
  ["Universidad de Oxford","ox.ac.uk"],["Universidad de Cambridge","cam.ac.uk"],
  ["Harvard University","harvard.edu"],["Universidad de Heidelberg","uni-heidelberg.de"],
  ["Museos y colecciones europeas","europeana.eu"],["Bibliotecas y manuscritos · Biblissima","biblissima.fr"],
  ["Gallica · Bibliothèque nationale de France","gallica.bnf.fr"],["British Library","bl.uk"],
  ["JSTOR · investigación académica","jstor.org"]
 ];
 const list=make("ul",undefined,"article-related");
 for(const [label,domain] of domains){
  const u="https://www.google.com/search?"+new URLSearchParams({q:"site:"+domain+" "+query});
  const li=make("li"),a=href(u,label);if(a){li.append(a);list.append(li)}
 }
 $("article-body").append(list);
}
function appendOfficialHistoricalSources(query){
 const q=normalized(query);
 if(q!=="adolf hitler"&&q!=="hitler")return;
 heading("Fuentes históricas institucionales");
 const a=href("https://encyclopedia.ushmm.org/content/en/article/adolf-hitler","United States Holocaust Memorial Museum · Adolf Hitler");
 if(a)$("article-body").append(a);
 paragraph("Fuente institucional de contexto histórico. El estudio de la dictadura nazi y el Holocausto se apoya en documentación crítica y contrastable.","article-note");
}
function appendReferenceBooks(rows,query){
 const selected=referenceBooks(rows,query);
 heading("Obras fundamentales y bibliografía de referencia");
 paragraph("Selección priorizada por pertinencia del tema y respaldo bibliográfico. Las obras identificadas como referencia editorial se distinguen de las coincidencias recuperadas automáticamente; ninguna ficha implica acceso al texto íntegro.","article-note");
 if(!selected.length){
  const a=href("https://search.worldcat.org/search?q="+encodeURIComponent(query),"Buscar bibliografía sobre «"+query+"» en WorldCat");
  if(a)$("article-body").append(a);
  return;
 }
 const list=make("ol",undefined,"article-related article-reference-books");
 for(const [i,item] of selected.entries()){
  const li=make("li",undefined,i===0?"principal-reference-work":undefined);
  if(i===0)li.append(make("strong","PRIMERA REFERENCIA DEL CATÁLOGO · "));
  const a=href(item.link,item.title);if(a)li.append(a);
  li.append(make("small"," · "+[item.author,item.year,item.note].filter(Boolean).join(" · "),"article-license"));
  list.append(li);
 }
 $("article-body").append(list);
}
function addTopicBibliography(rows,query,ark){
 const deity=isDeityQuery(query);
 // No descartar fichas por el título únicamente: autores, alias, signaturas,
 // descripción y texto documentado también son evidencia recuperada.
 const queryTerms=roots(query);
 const relevant=rows.filter(r=>{
  if(!r.link||!r.title)return false;
  const corpus=normalized([r.title,r.author,r.excerpt,r.meta,...(r.aliases||[])].filter(Boolean).join(" "));
  const exact=normalized(query);
  const overlap=queryTerms.length?queryTerms.filter(t=>corpus.includes(t)).length/queryTerms.length:0;
  return !!r.archiveDiscovery||!!r.exactTextMatch||!!r.externalFulltext||
   !!r.primaryWitness||relevance({...r,title:[r.title,r.author,...(r.aliases||[])].join(" ")},query)>=35||
   (exact.length>=3&&corpus.includes(exact))||overlap>=0.5;
 });
 const groups={primary:[],books:[],academic:[],popular:[]},seen=new Set();
 function insert(group,row){
  const key=normalized(row.title)+"|"+normalized(row.author||"");
  if(seen.has(key))return;seen.add(key);groups[group].push(row);
 }
 if(deity){for(const row of deityPrimaryBibliography())insert("primary",row)}
 if(ark){
  [
   ["Éxodo 25:10–22 · hebreo bíblico","https://www.sefaria.org/Exodus.25.10","Texto hebreo"],
   ["1 Samuel 4–6 · hebreo bíblico","https://www.sefaria.org/I_Samuel.4","Texto hebreo"],
   ["2 Samuel 6 · hebreo bíblico","https://www.sefaria.org/II_Samuel.6","Texto hebreo"],
   ["1 Reyes 8 · hebreo bíblico","https://www.sefaria.org/I_Kings.8","Texto hebreo"]
  ].forEach(([title,link,author])=>insert("primary",{title,link,author}));
 }
 for(const r of relevant){
  if(r.type==="passage")continue;
  const category=bibliographyCategory(r,query);
  if(r.type==="manuscript"||r.type==="edition"){insert("primary",r);continue}
  if(["book","openlibrary","googlebook"].includes(r.type)){insert("books",r);continue}
  if(category==="primary"){insert("primary",r);continue}
  if(r.type==="article"||category==="academic"){insert("academic",r);continue}
  if(category==="popular"||r.type==="wikipedia"){
   // A search snippet mentioning the subject is not proof that an unrelated article
   // (e.g. an Alpine valley or a canal incident) is about that person.
   const q=normalized(query).replace(/\\s+/g,""),title=normalized(r.title).replace(/\\s+/g,"");
   if(r.type==="wikipedia"&&q.length>=4&&!(title===q||title.includes(q)||q.includes(title)))continue;
   insert("popular",r);
  }
 }
 const sections=[
  ["II · Literatura histórica, códices y fuentes originales","primary"],
  ["III · Libros y ediciones bibliográficas","books"],
  ["IV · Investigación académica y estudios especializados","academic"],
  ["V · Enciclopedias y divulgación","popular"]
 ];
 for(const [label,category] of sections){
  heading(label);
  if(category==="primary")paragraph("Fuentes antiguas, manuscritos y ediciones documentadas. La fecha de un códice no equivale a la fecha de composición de la obra.","article-note");
  if(category==="books")paragraph("Libros identificados en la Biblioteca Vitruviana y catálogos abiertos. Una ficha no acredita lectura del texto completo.","article-note");
  const selected=groups[category].sort((a,b)=>(Number(a.year)||9999)-(Number(b.year)||9999)||String(a.title).localeCompare(String(b.title))).slice(0,25);
  if(category==="popular"){
   paragraph("Consultas complementarias a enciclopedias, universidades y sitios oficiales. Los enlaces siguientes abren búsquedas externas; sus resultados no están verificados ni indexados por Vitruvia.","article-note");
   const q=String(query||"").trim();
   const destinations=[
    ["Grokipedia · buscar artículos","https://www.google.com/search?"+new URLSearchParams({q:"site:grokipedia.com "+q})],
    ["Encyclopaedia Britannica","https://www.google.com/search?"+new URLSearchParams({q:"site:britannica.com "+q})],
    ["Stanford Encyclopedia of Philosophy","https://plato.stanford.edu/search?"+new URLSearchParams({query:q})],
    ["Oxford · recursos universitarios","https://www.google.com/search?"+new URLSearchParams({q:"site:ox.ac.uk "+q})],
    ["Cambridge · recursos universitarios","https://www.google.com/search?"+new URLSearchParams({q:"site:cam.ac.uk "+q})],
    ["Harvard · recursos universitarios","https://www.google.com/search?"+new URLSearchParams({q:"site:harvard.edu "+q})],
    ["World History Encyclopedia","https://www.google.com/search?"+new URLSearchParams({q:"site:worldhistory.org "+q})],
    ["Perseus Digital Library","https://www.perseus.tufts.edu/hopper/searchresults?"+new URLSearchParams({q})],
    ["Europeana · patrimonio europeo","https://www.europeana.eu/es/search?"+new URLSearchParams({query:q})],
    ["Google · sitios institucionales","https://www.google.com/search?"+new URLSearchParams({q:q+" site:edu OR site:ac.uk OR site:gov"})]
   ];
   const ul=make("ul",undefined,"article-related");
   for(const [name,url] of destinations){const li=make("li"),a=href(url,name);if(a){li.append(a);ul.append(li)}}
   $("article-body").append(ul);
  }
  if(!selected.length){
   // Los catálogos externos no son registros encontrados: se identifican como
   // búsquedas adicionales y jamás se simulan citas o manuscritos confirmados.
   const q=encodeURIComponent(query);
   const routes=category==="primary"?[
    ["Buscar manuscritos y testimonios en Europeana","https://www.europeana.eu/es/search?query="+q],
    ["Buscar en el catálogo de BnF Gallica","https://gallica.bnf.fr/Search?q="+q]
   ]:category==="books"?[
    ["Buscar libros y ediciones en Open Library","https://openlibrary.org/search?q="+q],
    ["Buscar ediciones bibliográficas en WorldCat","https://search.worldcat.org/search?q="+q]
   ]:category==="academic"?[
    ["Buscar investigación en Google Scholar","https://scholar.google.com/scholar?q="+q],
    ["Buscar artículos y estudios en Crossref","https://search.crossref.org/?q="+q]
   ]:[];
   if(routes.length){
    paragraph("No hay fichas directas recuperadas en esta consulta. Podés continuar en estos catálogos; son búsquedas externas, no resultados verificados por Vitruvia.","article-note");
    const ul=make("ul",undefined,"article-related");
    for(const [name,url] of routes){const li=make("li"),a=href(url,name);if(a){li.append(a);ul.append(li)}}
    $("article-body").append(ul);
   }
   continue;
  }
  const list=make("ol",undefined,"article-related");
  for(const item of selected){
   const li=make("li"),a=href(item.link,item.title);if(!a)continue;
   li.append(a);
   const desc=[item.author,item.year,item.publisher||item.journal,item.meta].filter(Boolean).join(" · ");
   if(desc)li.append(make("small"," — "+cut(desc,240),"article-license"));
   list.append(li);
  }
  $("article-body").append(list);
 }
}
async function renderTopic(top,rows,query,token,person=null){
 const identified=(rows||[]).filter(r=>r.type==="passage"&&r.exactTextMatch&&r.workId).sort((a,b)=>(b.rating||0)-(a.rating||0))[0];
 const documentaryQuery=identified?.title?.split(" · ")[0]||person?.name||query;
 reset(identified?.title||person?.name||query,phrase("Artículo enciclopédico · investigación documental","Thematic article · documentary research","Article thématique · recherche documentaire"),
  phrase("Dossier de investigación · síntesis y fuentes","Research dossier · synthesis and sources","Dossier de recherche · synthèse et sources"));
 const topic=normalized(query);
 const deity=isDeityQuery(query);
 const ark=topic.includes("arca de la alianza")||topic.includes("ark of the covenant")||topic.includes("arca del pacto");
 const sources=rows.filter(x=>x.link&&relevance({...x,title:[x.title,x.author||""].join(" ")},query)>=35&&["wikipedia","article","wikidata","openlibrary","googlebook","museum","book","edition","manuscript"].includes(x.type));
 const wanted=document.documentElement.lang||"es";
 const candidates=rows.filter(x=>x.type==="wikipedia"&&x.pageid&&(
  x.preferredWiki||relevance(x,person?.name||query)>=40
 ));
 const wiki=candidates.sort((x,y)=>
  Number(!!y.preferredWiki)-Number(!!x.preferredWiki)||
  Number(y.wikiLang===wanted)-Number(x.wikiLang===wanted)||
  relevance(y,person?.name||query)-relevance(x,person?.name||query))[0];
 if(wiki?.preferredWiki&&wiki.title)$("article-title").textContent=wiki.title;
 const profile=await biographyProfile(person?.name||query);
 if(token!==active)return;
 if(profile)renderVerifiedBiography(profile);
 else paragraph(phrase("Estudio introductorio organizado por temas. Se distinguen las fuentes históricas, los datos verificables y las interpretaciones modernas.","A topic-based introduction distinguishing historical sources, verified evidence and modern interpretations.","Étude introductive distinguant sources historiques, preuves vérifiées et interprétations modernes."),"article-lead");
 if(deity){for(const [sectionTitle,body] of deityDossier){heading(sectionTitle);paragraph(body)}}
 if(ark){for(const [sectionTitle,body] of arkSections){heading(sectionTitle);paragraph(body)}}
 if(person?.id==="cicero"){for(const [sectionTitle,body] of ciceroChapters){heading(sectionTitle);paragraph(body)}}
 if(identified){
  heading("Pasaje exacto reconocido en la biblioteca");
  paragraph("La búsqueda coincide literalmente con un fragmento de «"+documentaryQuery+"». El locus procede de una edición textual identificada; no se le atribuye un folio manuscrito sin cotejo.","article-note");
  const original=identified.latin||identified.excerpt||"";
  if(original){const p=make("p",cut(original,1250),"article-lead");if(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(original))p.lang="grc";else p.lang="la";$("article-body").append(p)}
  const source=href(identified.link,"Leer el pasaje en la edición de origen");
  if(source)$("article-body").append(source);
 }
 const data=identified?null:wiki?.fullExtract?{extract:wiki.fullExtract,fullurl:wiki.link,title:wiki.title,lang:wiki.wikiLang}:wiki?await wikiSummary(wiki):await topicWikiData(person?.name||query);
 if(token!==active)return;
 if(data?.extract&&profile){
  const ref=href(data.fullurl||wiki?.link,phrase("Enciclopedia externa · comprobar referencias y ampliaciones",
   "External encyclopedia · verify citations and additional context",
   "Encyclopédie externe · vérifier les références et compléments"));
  if(ref){heading(phrase("Comparar con una enciclopedia general","Compare with a general encyclopedia","Comparer avec une encyclopédie générale"));$("article-body").append(ref)}
 }else if(data?.extract){
  heading(phrase("Desarrollo enciclopédico y debates","Encyclopedic research and debates","Étude encyclopédique et débats"));
  paragraph("Material enciclopédico de Wikipedia: atribución CC BY-SA. La síntesis original y los textos externos se presentan diferenciados.","article-note");
  if(wiki&&wiki.wikiLang!==wanted)paragraph(
   phrase("La fuente enciclopédica está disponible aquí en "+wiki.wikiLang.toUpperCase()+"; no se simula una traducción.",
    "The source text is available here in "+wiki.wikiLang.toUpperCase()+"; it has not been automatically translated.",
    "La source est disponible ici en "+wiki.wikiLang.toUpperCase()+" ; aucune traduction automatique n’est simulée."),"article-note");
  appendBiographyExtract(data.extract);
  const link=href(data.fullurl||wiki?.link,"Consultar fuente original, notas e historial");
  if(link)$("article-body").append(link);
 }else if(!identified&&!ark&&!deity&&person?.id!=="cicero"){
  heading("Documentación disponible");
  paragraph("No se logró recuperar una síntesis enciclopédica extensa en esta consulta. Se muestran únicamente las fuentes comprobables, sin elaborar datos no respaldados.","article-note");
 }
 // Advanced sources are present, but do not interrupt a general or school-level biography.
 const body=$("article-body"),previousNodes=new Set([...body.childNodes]);
 appendLocalRepositoryResources(rows);
 appendCuratedUniversities(rows);
 appendManuscriptHierarchy(rows,documentaryQuery);
 appendCuratedEvidence(rows);
 appendReferenceBooks(rows,documentaryQuery);
 appendOfficialHistoricalSources(documentaryQuery);
 appendInstitutionalResearch(documentaryQuery);
 addTopicBibliography(rows,documentaryQuery,ark);
 const advanced=[...body.childNodes].filter(node=>!previousNodes.has(node));
 if(advanced.length){
  const details=make("details",undefined,"article-academic-expansion");
  details.id="article-academic-expansion";
  details.append(make("summary",phrase("Fuentes antiguas, universidades, códices y bibliografía especializada",
   "Ancient sources, universities, manuscripts and scholarly bibliography",
   "Sources anciennes, universités, manuscrits et bibliographie scientifique")));
  const contents=make("div",undefined,"article-academic-expansion-inner");
  for(const node of advanced)contents.append(node);
  details.append(contents);body.append(details);
 }
 heading("VI · Imágenes y documentación visual");
 paragraph("Las vistas previas documentales se presentan en la galería con enlaces a su procedencia, autor y licencia.","article-note");
 const galleryLink=href("#vitruvia-images","Consultar galería de imágenes documentadas");
 if(galleryLink)$("article-body").append(galleryLink);
 heading("VII · Otras fuentes para contrastar la investigación");
 const list=make("ul",undefined,"article-related");
 for(const row of sources.slice(0,14)){const li=make("li"),link=href(row.link,row.title);if(link)li.append(link);if(li.childNodes.length)list.append(li)}
 if(list.childNodes.length)$("article-body").append(list);
 if(person)appendPersonLoci(rows,person);else appendVerifiedTopicPassages(rows,query);
 appendAcademicLinks(person?.name||query);
 aside(sources);optionalManuscriptAccess(rows);references(rows);buildContents();
}
/* Separate verifiable article sections from supporting catalogue records. */
function appendResearch(rows,query,sourceTitle){
 const papers=rows.filter(x=>x.type==="article"&&relevance(x,query)>=45&&x.link).slice(0,6);
 const books=rows.filter(x=>x.type==="googlebook"&&x.link&&relevance(x,query)>=45).slice(0,4);
 const classical=rows.filter(x=>x.type==="book"&&x.link&&
  relevance({...x,title:[x.title,x.author,...(x.aliases||[])].join(" ")},query)>=45)
  .slice(0,8);
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
 if(books.length){
  heading(phrase("Libros localizados en Google Books","Books located in Google Books","Ouvrages repérés sur Google Books"));
  for(const b of books){const p=make("p",undefined,"article-research-item");const a=href(b.link,b.title);
   if(a)p.append(a);
   if(b.author)p.append(make("span"," · "+b.author));
   if(b.meta)p.append(make("small",b.meta));
   box.append(p);
  }
 }
 const codices=rows.filter(x=>x.type==="manuscript"&&x.link&&relevance(x,query)>=45).slice(0,6);
 const editions=rows.filter(x=>x.type==="edition"&&x.link&&relevance(x,query)>=45).slice(0,5);
 if(codices.length){
  heading(phrase("Códices y testimonios conservados","Surviving codices and manuscripts","Codex et manuscrits conservés"));
  paragraph(phrase("La fecha indicada corresponde al manuscrito conservado, no a la composición de la obra.",
   "Dates refer to surviving manuscript witnesses, not to the original composition.",
   "Les dates se rapportent aux témoins manuscrits, et non à la composition de l'œuvre."),"article-note");
  for(const m of codices){const p=make("p",undefined,"article-research-item");const a=href(m.link,m.title);if(a)p.append(a);if(m.author)p.append(make("small",m.author+" · "+m.meta));box.append(p)}
 }
 if(editions.length){
  heading(phrase("Ediciones históricas y PDF","Historical editions and PDFs","Éditions historiques et PDF"));
  for(const ed of editions){const p=make("p",undefined,"article-research-item");const a=href(ed.link,ed.title);if(a)p.append(a);if(ed.meta)p.append(make("small",ed.meta));box.append(p)}
 }
 if(classical.length){
  heading(phrase("Obras griegas y latinas del repertorio","Greek and Latin works in the repertory","Œuvres grecques et latines du répertoire"));
  for(const b of classical){
   const p=make("p",undefined,"article-research-item");
   const a=href(b.link,b.title);if(a)p.append(a);
   if(b.author)p.append(make("span"," · "+b.author));
   if(b.meta)p.append(make("small",b.meta));
   box.append(p);
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
function renderOther(top,rows){
 const isClassical=["book","edition"].includes(top.type);
 reset(top.title,top.author||top.source||"",isClassical?
 phrase("Bibliotheca Graeca et Latina · registro documentado","Bibliotheca Graeca et Latina · documented record","Bibliotheca Graeca et Latina · notice documentée"):
 phrase("Ficha documental · fuentes verificables","Documentary record · verified sources","Notice documentaire · sources vérifiables"));
 paragraph(top.excerpt,"article-lead");if(top.meta)paragraph(top.meta,"article-note");
 const label=isClassical?phrase("Abrir obra, códices y ediciones en la biblioteca →","Open work, codices and editions →","Consulter œuvre, codex et éditions →"):
 phrase("Consultar documento original →","Open original document →","Consulter le document original →");
 const a=href(top.link,label);if(a)$("article-body").append(a);
 if(isClassical){
  paragraph(phrase("Obra, manuscrito, edición impresa, PDF y traducción son testimonios diferentes. La existencia de una ficha no significa que el texto íntegro esté digitalizado.",
    "A work, manuscript, printed edition, PDF, and translation are distinct resources. A catalogue entry does not guarantee full-text access.",
    "L'œuvre, le manuscrit, l'édition imprimée, le PDF et la traduction sont des ressources distinctes. Une notice ne garantit pas le texte intégral."),"article-note");
  appendResearch(rows,top.title,top.title);
 }
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
/* Yellow marks are restricted to authenticated De architectura excerpts.
   Biographies, encyclopedias, external articles and bibliography remain unmarked. */
function highlightArticle(query){
 const words=matchVariants(query);
 if(!words.length)return;
 const scopes=[...root.querySelectorAll(".person-vitruvian-list, .vitruvian-text, #article-evidence .evidence-entry")];
 const nodes=[];
 for(const scope of scopes){
  const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const n=walker.currentNode;
   if(n.parentElement?.closest("a,button,mark,script,style,h3,h4,h5,.person-language-label,.evidence-label"))continue;
   if(n.parentElement?.closest("p"))nodes.push(n);
  }
 }
 for(const n of nodes){
  const original=n.textContent,plain=original.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(),hits=[];
  for(const word of words){
   let at=0,pos;
   while((pos=plain.indexOf(word,at))!==-1){
    hits.push([pos,pos+word.length]);at=pos+word.length;
    if(hits.length>80)break;
   }
  }
  if(!hits.length)continue;
  hits.sort((x,y)=>x[0]-y[0]);let end=0;const f=document.createDocumentFragment();
  for(const [from,to] of hits){
   if(from<end)continue;
   if(from>end)f.append(document.createTextNode(original.slice(end,from)));
   f.append(make("mark",original.slice(from,to),"query-hit"));end=to;
  }
  if(end<original.length)f.append(document.createTextNode(original.slice(end)));
  n.replaceWith(f);
 }
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
function buildContents(){
 const box=$("article-aside");if(!box)return;
 const sections=[...$("article-body").querySelectorAll("h3")].slice(0,24);
 if(!sections.length)return;
 const nav=document.createElement("nav");nav.className="article-contents";nav.setAttribute("aria-label",phrase("Índice de contenidos","Table of contents","Sommaire"));
 nav.append(make("h3",phrase("Contenido","Contents","Sommaire")));
 for(const [i,h] of sections.entries()){
  h.id="dossier-heading-"+i;
  const a=make("a",h.textContent);a.href="#"+h.id;a.className="article-contents-link";nav.append(a);
 }
 box.prepend(nav);
}
/* Authoritative first result for the library's own author: biography + editions. */
const vitruviusBiography=[
["Vida y documentación biográfica","Marco Vitruvio Polión, conocido por el nombre latino Marcus Vitruvius Pollio, fue un escritor romano especializado en arquitectura e ingeniería, activo durante el último siglo de la República y los comienzos de la época de Augusto. Su nombre completo se transmite tradicionalmente de esa forma, aunque la identificación de Pollio no carece de discusión filológica. Las fechas exactas de nacimiento y muerte son desconocidas; las biografías que proponen años precisos suelen expresar conjeturas y no datos documentados."],
["La Roma tardorrepublicana y el principado de Augusto","La actividad de Vitruvio se sitúa entre las guerras civiles del siglo I a. C. y la reorganización política y monumental del principado de Augusto. Este contexto explica la centralidad de las obras públicas, los sistemas hidráulicos, la construcción militar y la monumentalización urbana. La dedicatoria del tratado a César Augusto constituye una referencia interna esencial para situar la obra."],
["La carrera técnica y militar","Vitruvio alude en el prefacio del libro I a su experiencia en el ámbito de la maquinaria de guerra y a tareas relacionadas con el mantenimiento de dispositivos militares. La documentación sobre su carrera es limitada y procede principalmente de sus propias afirmaciones. No hay base para reconstruir sin reservas un itinerario militar completo ni para atribuirle todos los proyectos mencionados en la tradición posterior."],
["La basílica de Fano","En De architectura V, 1, Vitruvio describe una basílica de la colonia de Fano, cuya disposición permite estudiar la arquitectura pública romana, los órdenes y las proporciones. Se trata de uno de los pocos edificios para los que el autor ofrece una referencia a su propia intervención profesional. El edificio no se conserva como estructura identificada de manera incontrovertida, y las reconstrucciones publicadas deben entenderse como hipótesis arquitectónicas."],
["De architectura y su organización","El tratado De architectura está compuesto por diez libros. Los primeros desarrollan la formación del arquitecto, los fundamentos de la disciplina, los materiales y la arquitectura religiosa. Los libros centrales se ocupan de edificios públicos, viviendas, acabados y sistemas constructivos. Los últimos examinan el agua, la gnomónica, los instrumentos y las máquinas. La obra reúne saberes griegos y romanos, observaciones técnicas y una reflexión sobre las artes liberales."],
["Principios de arquitectura y terminología","Vitruvio analiza conceptos como ordinatio, dispositio, eurythmia, symmetria, decor y distributio. La conocida tríada firmitas, utilitas y venustas sintetiza en la recepción moderna problemas de solidez, función y belleza tratados por el autor; conviene cotejar sus formulaciones latinas y su contexto, en vez de tratar la tríada como una definición aislada. El vocabulario técnico es esencial para comprender cómo se transmitieron las teorías de proporción arquitectónica."],
["Geometría, proporción y cuerpo humano","El libro III vincula la organización de los templos con relaciones proporcionales y la composición del cuerpo humano, pasaje de especial repercusión en el Renacimiento. La interpretación gráfica de estas relaciones dio lugar a dibujos célebres, incluido el Hombre de Vitruvio de Leonardo da Vinci. Estas imágenes son obras posteriores inspiradas en el texto, y no ilustraciones autógrafas conservadas del propio Vitruvio."],
["Fuentes griegas y transmisión del saber","El tratado cita o incorpora tradiciones asociadas con arquitectos y pensadores griegos, entre ellos Hermógenes y Piteo, y ofrece información sobre obras técnicas perdidas. El estudio de estas referencias exige distinguir citas explícitas, reelaboraciones, traducción de términos técnicos y préstamos intelectuales cuya fuente precisa no puede determinarse."],
["Tradición manuscrita medieval","De architectura sobrevivió gracias a su transmisión manuscrita durante la Antigüedad tardía y la Edad Media. Entre los testimonios relevantes destaca el códice Harleianus, British Library, Harley MS 2767, asociado a la tradición carolingia. Las ediciones modernas reconstruyen el texto cotejando manuscritos, lecturas divergentes y testimonios indirectos; no deben confundirse los folios de los códices con páginas de traducciones contemporáneas."],
["Ediciones renacentistas y recepción humanista","La impresión del tratado a finales del siglo XV y las ediciones ilustradas de la Edad Moderna favorecieron su circulación entre arquitectos, artistas y estudiosos. Fra Giocondo (1511), Cesare Cesariano (1521), Daniele Barbaro y Claude Perrault figuran entre los hitos de su recepción editorial. Estos comentaristas interpretaron el texto desde sus propios horizontes técnicos y artísticos; sus reconstrucciones no sustituyen el testimonio latino."],
["Vitruvio en la historia de la arquitectura","La recepción de Vitruvio influyó en la teoría arquitectónica del Renacimiento, en la discusión de los órdenes, en el urbanismo, en las proporciones y en la formación humanista de los arquitectos. Su importancia no significa que fuera el único teórico de la Antigüedad, sino que su tratado se convirtió en un testimonio excepcional por la conservación íntegra de sus diez libros."],
["Problemas de investigación y método","Una biografía académica debe separar las noticias expresas del propio Vitruvio, las menciones posteriores y la interpretación contemporánea. Persisten dudas sobre su identidad completa, la datación exacta del tratado, las fuentes perdidas, las variantes textuales y las reconstrucciones arquitectónicas. Vitruvia presenta estos límites de evidencia junto con el acceso a manuscritos, ediciones y traducciones comparadas."]
];
function isVitruviusAuthority(q){
 const normalizedQuery=normalized(q).replace(/^(biografia|biography|biographie|vida y obra de|vida de|quien fue|who was)\s+(de\s+)?/,"").trim();
 return /^(vitruvio|vitruvius|vitruve|marco vitruvio polion|marcus vitruvius pollio|marco vitruvio|marcus vitruvius)$/.test(normalizedQuery);
}
function renderVitruviusAuthority(rows){
 reset("Marco Vitruvio Polión",phrase("Arquitecto y tratadista romano · siglo I a. C. · perfil enciclopédico académico","Roman architect and author · first century BCE · scholarly encyclopedic profile","Architecte et théoricien romain · Ier siècle av. J.-C."),"01 · BIOGRAFÍA ENCICLOPÉDICA");
 paragraph("Marcus Vitruvius Pollio · autor de De architectura libri decem. Biografía, texto latino, manuscritos, traducciones y recepción histórica.","article-lead");
 // Manuscript evidence is the first documentary action, ahead of secondary references.
 const featuredManuscript=(rows||[]).filter(r=>r.type==="manuscript"&&r.localViewer&&r.codexShelfmark)
  .sort((a,b)=>(a.codexDate??9999)-(b.codexDate??9999))[0];
 const manuscripta=make("section",undefined,"article-source-first");
 manuscripta.append(make("h3",phrase("Documento primario · Codex Harleianus (Harley MS 2767)",
  "Primary source · Codex Harleianus (Harley MS 2767)",
  "Source primaire · Codex Harleianus (Harley MS 2767)")));
 manuscripta.append(make("p",phrase(
  "Testimonio carolingio temprano de De architectura, fechado aproximadamente entre 800 y 824 d. C. Conservado en la British Library (Londres), signatura Harley MS 2767. El manuscrito puede leerse en esta biblioteca, folio por folio, en una colección local de 341 imágenes. La datación de esta copia no es la fecha de composición del tratado.",
  "An early Carolingian copy of De architectura, dated approximately 800–824 CE. Held by the British Library, London, shelfmark Harley MS 2767. Browse its 341 digitized images folio by folio in this library. The manuscript's date is not the composition date.",
  "Copie carolingienne de De architectura datée d'environ 800–824, conservée à la British Library (Londres), cote Harley MS 2767. Parcourez les 341 images numérisées, folio par folio. La datation de la copie ne correspond pas à celle de la composition.")));
 const links=make("div",undefined,"article-source-first-links");
 const local=featuredManuscript?.localViewer||"codex-h-folios-local.html?folio=f.1r";
 const read=href(local,phrase("Leer Codex H · 341 folios digitalizados","Read Codex H · 341 digital images","Lire Codex H · 341 images numérisées"));
 if(read)links.append(read);
 if(window.VitruviaLocalManuscripts){
  const embedded=make("button",phrase("Abrir visor aquí","Open reader here","Ouvrir la visionneuse ici"));
  embedded.type="button";embedded.className="article-local-viewer";
  embedded.addEventListener("click",()=>window.VitruviaLocalManuscripts.open(local,"Harley MS 2767 · Codex H"));
  links.append(embedded);
 }
 const record=href("https://searcharchives.bl.uk/catalog/040-002048598",
  phrase("British Library · ficha y signatura","British Library · record and shelfmark","British Library · notice et cote"));
 if(record)links.append(record);
 const edition=href("lector-bilingue.html",phrase("Comparar latín y traducciones","Compare Latin and translations","Comparer latin et traductions"));
 if(edition)links.append(edition);
 manuscripta.append(links);
 // Keep the document access available but out of the way of the biography.
 appendLocalRepositoryResources(rows);
 for(const [title,body] of vitruviusBiography){heading(title);paragraph(body)}
 heading("02 · Los diez libros de De architectura");
 const subjects=[
 "I · Formación del arquitecto, fundamentos y urbanismo",
 "II · Materiales y técnicas de construcción",
 "III · Templos y proporciones",
 "IV · Órdenes y arquitectura sagrada",
 "V · Edificios públicos y teatros",
 "VI · Viviendas y arquitectura doméstica",
 "VII · Acabados y ornamentación",
 "VIII · Agua, fuentes y conducciones",
 "IX · Astronomía, relojes e instrumentos",
 "X · Máquinas y mecánica"
 ];
 const ol=make("ol",undefined,"article-related");
 for(let n=1;n<=10;n++){
  const item=make("li");
  const link=href("lector-bilingue.html?edition=recensio-es&locus="+n+".1.1",subjects[n-1]);
  if(link)item.append(link);ol.append(item);
 }
 $("article-body").append(ol);
 heading("03 · Leer las ediciones en distintos idiomas");
 paragraph("Estas versiones están alojadas en la Biblioteca Vitruviana. Se indican por separado las ediciones de consulta y sus PDF; no se presenta una traducción como si fuera un códice.","article-note");
 const editions=[
  {title:"Latín y castellano · V514",description:"Texto latino y edición castellana comparada",reader:"lector-bilingue.html?edition=recensio-es",page:"documents/edicion-v514.html",pdf:"documents/kurilo-recensio-es.pdf"},
  {title:"Latín y francés · V554",description:"Texto latino y edición francesa",reader:"lector-bilingue.html?edition=recensio-fr",page:"documents/edicion-v554.html",pdf:"documents/kurilo-recensio-fr.pdf"},
  {title:"Inglés · V297",description:"Edición y estudio en inglés",reader:"lector-bilingue.html?edition=theory-en",page:"documents/edicion-v297.html",pdf:"documents/kurilo-theory-en.pdf"}
 ];
 const gallery=make("div",undefined,"vitruvius-editions");
 for(const ed of editions){
  const card=make("section",undefined,"vitruvius-edition");
  card.append(make("h4",ed.title),make("p",ed.description));
  const links=make("div",undefined,"vitruvius-edition-links");
  for(const [label,url] of [["Leer en línea",ed.reader],["Ficha de la edición",ed.page],["Abrir PDF",ed.pdf]]){
   const link=href(url,label);if(link)links.append(link);
  }
  card.append(links);gallery.append(card);
 }
 $("article-body").append(gallery);
 heading("04 · Manuscritos y ediciones históricas");
 const manuscripts=[
  ["Codex Harleianus · Harley MS 2767","codex-h-folios-local.html"],
  ["Ficha codicológica del Codex H","harleianus.html"],
  ["Fra Giocondo · edición de 1511","giocondo-1511.html"],
  ["Daniele Barbaro · edición de 1567","barbaro-1567.html"],
  ["Índice general de códices","index-codicum.html"],
  ["Bibliografía especializada","bibliografia.html"]
 ];
 const ul=make("ul",undefined,"article-related");
 for(const [name,url] of manuscripts){const li=make("li"),link=href(url,name);if(link)li.append(link);ul.append(li)}
 $("article-body").append(ul);
 heading("05 · Investigación y fuentes");
 paragraph("La exposición distingue hechos biográficos sustentados, inferencias históricas y tradición editorial. Para cotejar citas y variantes debe consultarse el lugar preciso del texto latino y la edición utilizada.","article-note");
 appendAcademicLinks("Marcus Vitruvius Pollio De architectura");
 manuscripta.id="article-manuscript-access";
 const archive=make("details",undefined,"article-optional-manuscripts");
 archive.append(make("summary",phrase("Leer el Codex H · acceso opcional al visor y sus 341 imágenes",
  "Read Codex H · optional reader and 341 images",
  "Lire le Codex H · visionneuse facultative et 341 images")));
 archive.append(manuscripta);
 $("article-body").append(archive);
 references([...rows.filter(x=>["book","edition","manuscript","article","wikipedia"].includes(x.type)),{title:"Vitruvio · De architectura, lector latino y traducciones",link:"lector-bilingue.html"},{title:"Harley MS 2767 · archivo de folios",link:"codex-h-folios-local.html"}],"Perfil editorial de Vitruvia. Consultar De architectura y bibliografía crítica para las noticias autobiográficas y la transmisión manuscrita.");
 aside([{title:"Ediciones multilingües de De architectura",link:"lector-bilingue.html"},...rows.filter(x=>["book","edition","manuscript"].includes(x.type)).slice(0,8)]);
 const shortcut=href("#article-manuscript-access",phrase("Codex H · visor opcional","Codex H · optional reader","Codex H · visionneuse facultative"));
 if(shortcut){shortcut.className="article-index-link article-viewer-shortcut";shortcut.addEventListener("click",()=>{archive.open=true});$("article-aside").append(shortcut)}
 buildContents();
}

function render(rows,q,person=null){
 const token=++active;
 bibliographyContext={rows:rows||[],query:person?.name||q||""};
 if(!q){root.hidden=true;return}
 $("article-evidence")?.replaceChildren();
 if(isVitruviusAuthority(q)){renderVitruviusAuthority(rows||[]);return}
 const found=rows||[];
 const top=found.length?choose(found,q):{type:"topic",title:q};
 const isCodex=/(?:codex|harley|harleianus|ms\s*2767)/i.test(q);
 const isLocus=/(?:[IVX]{1,4}|\d{1,2})\s*[.,:]\s*\d{1,2}\s*[.,:]\s*\d{1,2}/i.test(q);
 if(isCodex&&top.type==="manuscript"){renderManuscript(top,found);return}
 if(isLocus&&top.type==="passage"){renderLocus(top,found);highlightArticle(q);return}
 void renderTopic({type:"topic",title:q},found,q,token,person).then(()=>{
  if(token===active)highlightArticle(person?.id==="cicero"?"ciceron cicero ciceronis ciceronem cicerone":q);
 });
}
window.VitruviaArticles={render,version:"1.1-person-biography"};
})();