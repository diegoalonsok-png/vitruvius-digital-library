/* Classical works browser: read source-linked texts and verified manuscript facsimiles.
No fabricated digitization, translation, ISBN or PDF links. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fold=s=>String(s??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
const L={es:{search:"fichas en el catálogo",select:"Seleccionar",work:"Obra",language:"Lengua",source:"Leer texto",manuscript:"Manuscrito",edition:"Edición y traducción",pdf:"PDF histórico",external:"Fuentes externas",notKnown:"No hay un facsímil ni edición concreta acreditados en esta ficha.",visit:"Consultar fuente original",open:"Abrir el lector original",notHosted:"Esta fuente no permite confirmar un lector embebido; abrila en su plataforma oficial.",witness:"El testimonio es posterior a la composición de la obra.",noPdf:"No hay PDF identificado con edición y licencia verificadas.",noTrans:"No se ha asignado todavía una traducción con autor y edición comprobados.",archive:"Buscar ediciones escaneadas",gallica:"Buscar en Gallica",scaife:"Consultar Scaife / Perseus"},en:{search:"catalogue records",select:"Select",work:"Work",language:"Original language",source:"Read text",manuscript:"Manuscript",edition:"Edition and translation",pdf:"Historical PDF",external:"External sources",notKnown:"No individual facsimile or edition has yet been verified for this record.",visit:"View original source",open:"Open original reader",notHosted:"Embedding has not been verified for this source; open it at its official platform.",witness:"The extant witness is later than the composition of the work.",noPdf:"No specific PDF with verified edition and rights has been identified.",noTrans:"No translation with verified translator and edition has yet been linked.",archive:"Search scanned editions",gallica:"Search Gallica",scaife:"Browse Scaife / Perseus"}};

const extraTerms={
fr:{search:"notices disponibles",source:"Lire le texte",manuscript:"Manuscrit",edition:"Édition et traduction",pdf:"PDF historique",notKnown:"Aucun texte ni fac-similé attesté pour cette entrée.",visit:"Consulter la source",open:"Ouvrir le lecteur",notHosted:"Consulter la plateforme d’origine.",witness:"Ce témoin est postérieur à la composition de l’œuvre.",noPdf:"Aucun PDF identifié.",noTrans:"Traduction non encore documentée.",archive:"Chercher des éditions numérisées",gallica:"Chercher dans Gallica",scaife:"Consulter Scaife / Perseus"},
it:{search:"schede disponibili",source:"Leggi il testo",manuscript:"Manoscritto",edition:"Edizione e traduzione",pdf:"PDF storico",notKnown:"Nessun testo o facsimile verificato.",visit:"Consulta la fonte",open:"Apri il lettore",notHosted:"Consulta la piattaforma originale.",witness:"Il testimone è posteriore alla composizione dell’opera.",noPdf:"Nessun PDF identificato.",noTrans:"Traduzione non ancora documentata.",archive:"Cerca edizioni digitalizzate",gallica:"Cerca su Gallica",scaife:"Consulta Scaife / Perseus"},
de:{search:"verfügbare Einträge",source:"Text lesen",manuscript:"Handschrift",edition:"Edition und Übersetzung",pdf:"Historisches PDF",notKnown:"Keine verifizierte Ausgabe oder Handschrift vorhanden.",visit:"Quelle öffnen",open:"Lesefenster öffnen",notHosted:"Originalplattform öffnen.",witness:"Diese Handschrift entstand nach der Abfassung des Werks.",noPdf:"Kein identifiziertes PDF.",noTrans:"Keine verifizierte Übersetzung.",archive:"Digitalisierte Ausgaben suchen",gallica:"In Gallica suchen",scaife:"Scaife / Perseus öffnen"},
pt:{search:"registos disponíveis",source:"Ler o texto",manuscript:"Manuscrito",edition:"Edição e tradução",pdf:"PDF histórico",notKnown:"Nenhuma edição ou fac-símile validado.",visit:"Consultar a fonte",open:"Abrir o leitor",notHosted:"Consulte a plataforma de origem.",witness:"O testemunho é posterior à composição da obra.",noPdf:"Nenhum PDF identificado.",noTrans:"Tradução ainda não documentada.",archive:"Pesquisar edições digitalizadas",gallica:"Pesquisar em Gallica",scaife:"Consultar Scaife / Perseus"}};
for(const [k,trans] of Object.entries(extraTerms))L[k]={...L.en,...trans};
const interfaceWords={
es:{"lang-label":"Idiomas","nav-home":"← Vitruvius Digital Library","nav-editions":"Ediciones históricas","nav-cite":"Cómo citar","page-title":"Biblioteca bibliográfica griega y latina","search-label":"Buscar autor, obra o disciplina","original-label":"Idioma del original","genre-label":"Área de estudio","all-language":"Griego y latín","latin":"Latín","greek":"Griego antiguo","all-genres":"Todas las áreas","note-title":"Nota filológica.","available-title":"Colección de lectura directa."},
en:{"lang-label":"Languages","nav-home":"← Vitruvius Digital Library","nav-editions":"Historical editions","nav-cite":"How to cite","page-title":"Greek and Latin Bibliographic Library","search-label":"Search by author, work or field","original-label":"Original language","genre-label":"Research field","all-language":"Greek and Latin","latin":"Latin","greek":"Ancient Greek","all-genres":"All fields","note-title":"Philological note.","available-title":"Direct-access collection."},
fr:{"lang-label":"Langues","nav-home":"← Bibliothèque de Vitruve","nav-editions":"Éditions historiques","nav-cite":"Comment citer","page-title":"Bibliothèque bibliographique grecque et latine","search-label":"Chercher un auteur, une œuvre ou un domaine","original-label":"Langue originale","genre-label":"Domaine d’étude","all-language":"Grec et latin","latin":"Latin","greek":"Grec ancien","all-genres":"Tous les domaines","note-title":"Note philologique.","available-title":"Collection en lecture directe."},
it:{"lang-label":"Lingue","nav-home":"← Biblioteca di Vitruvio","nav-editions":"Edizioni storiche","nav-cite":"Come citare","page-title":"Biblioteca bibliografica greca e latina","search-label":"Cerca autore, opera o disciplina","original-label":"Lingua originale","genre-label":"Area di studio","all-language":"Greco e latino","latin":"Latino","greek":"Greco antico","all-genres":"Tutte le aree","note-title":"Nota filologica.","available-title":"Collezione in lettura diretta."},
de:{"lang-label":"Sprachen","nav-home":"← Vitruv-Bibliothek","nav-editions":"Historische Ausgaben","nav-cite":"Zitierhinweise","page-title":"Griechische und lateinische Bibliothek","search-label":"Autor, Werk oder Fachgebiet suchen","original-label":"Originalsprache","genre-label":"Fachgebiet","all-language":"Griechisch und Latein","latin":"Latein","greek":"Altgriechisch","all-genres":"Alle Bereiche","note-title":"Philologische Anmerkung.","available-title":"Direkt lesbare Sammlung."},
pt:{"lang-label":"Idiomas","nav-home":"← Biblioteca de Vitrúvio","nav-editions":"Edições históricas","nav-cite":"Como citar","page-title":"Biblioteca bibliográfica grega e latina","search-label":"Buscar autor, obra ou área","original-label":"Idioma original","genre-label":"Área de estudo","all-language":"Grego e latim","latin":"Latim","greek":"Grego antigo","all-genres":"Todas as áreas","note-title":"Nota filológica.","available-title":"Coleção para leitura direta."}
};
function translateInterface(){
const lang=language(),dict=interfaceWords[lang]||interfaceWords.es;
document.documentElement.lang=lang;
document.querySelectorAll("[data-bi]").forEach(el=>{const v=dict[el.dataset.bi];if(v)el.textContent=v});
try{localStorage.setItem("vitruvius-ui-lang",lang)}catch{}
}

let works=[],selected="",tab="text",witnessData={records:[],editions:[]},showSelectedDetail=false;
const bcFocusIds=new Set(("vitruvius cicero-officiis cicero-oratore cicero-republica cicero-catilinariae cicero-de-finibus cicero-tusculanae cicero-de-natura-deorum cicero-de-amicitia cicero-de-senectute cicero-de-divinatione cicero-brutus cicero-philippicae caesar-gallico caesar-civili sallust-catiline sallust-iugurtha varro-rustica varro-de-lingua-latina lucretius virgil-aeneid virgil-georgica horace-odes horace-sermones horace-ars-poetica horace-epodi horace-epistulae catullus-carmina plautus-amphitruo plautus-aulularia terentius-andria terentius-heautontimorumenos cato-agri-cultura polybius-historiae").split(" "));
const adFocusIds=new Set(("diodorus dionysius strabo philo philo-legum-allegoriae philo-de-vita-mosis seneca-epistulae seneca-naturales seneca-de-brevitate seneca-de-ira seneca-de-clementia seneca-de-tranquillitate lucan pliny dioscorides josephus-war josephus-antiquities quintilian martial tacitus-agricola tacitus-germania tacitus-annales tacitus-historiae tacitus-dialogus frontinus frontinus-strategemata celsus columella juvenal suetonius-caesares petronius-satyrica pliny-younger-epistulae apuleius-metamorphoses apuleius-apologia apuleius-de-deo-socratis plutarch-lives plutarch-moralia galen-ars-medica galen-de-usu-partium ptolemy-almagest ptolemy-geographia marcus-aurelius-meditations epictetus-discourses arrian-anabasis-alexandri pausanias-periegesis").split(" "));
function periodFocus(w){return bcFocusIds.has(w.id)||adFocusIds.has(w.id)||!!w.witnessRecords?.length}
/* Only verified, relative, same-origin manuscript readers may be embedded. */
function localManuscriptUrl(record){
 const raw=String(record?.localViewer||"").trim();
 if(!/^[a-z0-9/_-]+\.html(?:\?[a-z0-9._%=&+-]+)?$/i.test(raw)||raw.includes(".."))return null;
 try{const url=new URL(raw,location.href);return url.origin===location.origin?url.href:null}catch{return null}
}
function showLocalManuscript(container,record){
 const url=localManuscriptUrl(record);if(!url)return false;
 container.replaceChildren();
 const intro=document.createElement("p");intro.className="classical-local-manuscript-note";
 intro.textContent="Facsímil alojado en Vitruvius Digital Library · "+[record.shelfmark,record.library,record.localFolioCount?record.localFolioCount+" fotografías":"",record.localFolioStart?"f. 1r = imagen digital "+record.localFolioStart.digitalImage:""].filter(Boolean).join(" · ")+". Folio e imagen digital tienen numeraciones diferentes. Verificar derechos de la digitalización en la ficha institucional.";
 const toolbar=document.createElement("div");toolbar.className="classical-local-manuscript-toolbar";
 const open=document.createElement("a");open.href=url;open.target="_blank";open.rel="noopener noreferrer";
 open.textContent="Abrir lector completo · folios y lupa";toolbar.append(open);
 if(record.record&&/^https:\/\//.test(record.record)){
  const source=document.createElement("a");source.href=record.record;source.target="_blank";source.rel="noopener noreferrer";
  source.textContent="Ficha y signatura institucional";toolbar.append(source);
 }
 const frame=document.createElement("iframe");frame.src=url;frame.loading="lazy";
 frame.className="classical-local-manuscript-iframe";frame.title=record.title+" · lector de folios locales";
 container.append(intro,toolbar,frame);return true;
}

function pubLinks(entries,title,container){
 if(!entries?.length)return;
 const section=document.createElement("section");section.className="classical-evidence";
 const h=document.createElement("h3");h.textContent=title;section.append(h);
 for(const x of entries){
  const article=document.createElement("article");article.className="classical-evidence-record";
  const strong=document.createElement("strong");strong.textContent=x.title;article.append(strong);
  const meta=document.createElement("p");meta.className="classical-evidence-meta";
  meta.textContent=[x.library,x.shelfmark,x.date,x.editor,x.year,x.provider].filter(Boolean).join(" · ");article.append(meta);
  if(x.coverage){const p=document.createElement("p");p.textContent=x.coverage;article.append(p)}
  if(x.note){const p=document.createElement("p");p.textContent=x.note;article.append(p)}
  if(x.rights){const p=document.createElement("small");p.textContent=x.rights;article.append(p)}
  const links=document.createElement("div");links.className="classic-linkline";
  if(x.manifest){
   const p=new URLSearchParams({manifest:x.manifest,title:x.title,official:x.viewer||x.record||""});if(x.startFolio)p.set("folio",x.startFolio);
   const a=document.createElement("a");a.href="visor-codex.html?"+p;a.textContent="Leer códice dentro de Vitruvia";links.append(a);
  }
  for(const [label,url] of [["Leer códice folio a folio · biblioteca local",x.localViewer],["Ver códice en la institución",x.viewer],["Registro y signatura",x.record],["Edición / PDF en la fuente",x.url]]){
   if(!url||!/^https:\/\//.test(url)&&!/^documents\/classics\/[a-z0-9-]+\.pdf$/.test(url)&&!(x.localViewer===url&&localManuscriptUrl(x)))continue;
   if([...links.querySelectorAll("a")].some(a=>a.href===url))continue;
   const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label+" ↗";links.append(a);
  }
  if(x.url&&window.ClassicsFacsimileViewer?.isLocalPDF(x.url)){
   const action=document.createElement("button");action.type="button";action.className="classical-pdf-open";action.textContent="Leer PDF dentro de Vitruvia ↗";
   action.addEventListener("click",()=>{tab="pdf";const u=new URL(location.href);u.searchParams.set("work",selected);u.searchParams.set("view","pdf");u.searchParams.set("pdf",x.url);history.replaceState(null,"",u);detail();document.getElementById("classic-panel")?.scrollIntoView({block:"start",behavior:"smooth"})});
   links.prepend(action);
  }
  article.append(links);section.append(article);
 }
 container.append(section);
}
function language(){return $("classic-ui-language").value||"es";}
function terms(){return L[language()];}
function navLink(url,txt){return '<a target="_blank" rel="noopener noreferrer" href="'+safe(url)+'">'+safe(txt)+' ↗</a>';}
function isLocal(w){return ["lectura-local-completa","lectura-local-parcial"].includes(w.publicStatus)&&!!(w.localReader?.verified||w.pdf?.url||w.localHtml||w.localVersions?.length)}
function hasSource(w){return !!(w.reading?.url||w.pdf?.url||w.localHtml||w.manuscript?.manifest||w.witnessRecords?.length||w.historicEditions?.length)}
function statusLabel(w){return isLocal(w)?(w.publicStatus==="lectura-local-parcial"?"PDF PARCIAL · OBRA INCOMPLETA":"LECTURA EN VITRUVIA"):hasSource(w)?"FUENTE IDENTIFICADA":"REPERTORIO · LOCALIZACIÓN"}
function workSearchText(w){return [w.author,w.title,w.genre,w.dating,w.language,...(w.aliases||[]),
 ...(w.witnessRecords||[]).flatMap(ms=>[ms.title,ms.shelfmark,ms.library,ms.date]),
 ...(w.historicEditions||[]).flatMap(ed=>[ed.title,ed.editor,ed.year,ed.provider])].join(" ")}
// Academic categories work on the existing catalogue data, not a fixed list of famous works.
const technicalSubjects=/arquitect|ingenier|mecanic|hidraul|agricultur|agronom|medicin|farmacolog|botanic|astronom|geograf|cartograf|filosofi|retoric|oratori|poetic|exeges|linguist|historia natural|educacion/i;
const genericTerms=new Set(["tratado","tratados","classical","classic","classics","clasico","clasicos","clasica","clasicas","obra","obras","literatura","texto","textos","biblioteca","catalogo","catalog","book","books","work","works","antiguo","antiguos","antigua","antiguas","ancient","antiquity","latina","latino","latin","griega","griego","greek","de","del","la","el","las","los","the","of","and","et","y","sobre","in","en"]);
function isClassicalTreatise(w){
 const field=fold(w.genre||"");
 return technicalSubjects.test(field);
}
function searchIntent(q){
 const clean=fold(q).replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const terms=clean.split(/\s+/).filter(Boolean);
 const treatise=/\b(tratado|tratados|treatise|treatises|tractatus|tratado[s]?)\b/.test(clean);
 const meaningful=terms.filter(t=>!genericTerms.has(t)&&!["treatise","treatises","tractatus"].includes(t));
 return {terms:meaningful,treatise};
}
function relevanceForWork(w,q){
 const {terms,treatise}=searchIntent(q);
 if(!terms.length)return treatise?(isClassicalTreatise(w)?25:-1):0;
 const hay=fold(workSearchText(w));
 if(!terms.every(term=>hay.includes(term)))return -1;
 let value=terms.reduce((sum,term)=>sum+(fold(w.title).includes(term)?12:0)+(fold(w.author).includes(term)?7:0),0);
 if(treatise&&isClassicalTreatise(w))value+=16;
 return value;
}
function filters(){
 const q=$("classic-query").value.trim(),lang=$("classic-language").value,genre=$("classic-genre").value,
       availability=$("classic-availability")?.value||"",period=$("classic-period")?.value||"";
 const criteria=searchIntent(q);
 return works.filter(w=>(period!=="focus"||periodFocus(w))&&(!lang||w.language===lang)&&(!genre||w.genre===genre)
  &&(!availability||(availability==="local"?isLocal(w):availability==="source"?hasSource(w)&&!isLocal(w):!hasSource(w)))
  &&(!q||relevanceForWork(w,q)>=0))
  .sort((a,b)=>{
   const rank=w=>isLocal(w)?0:hasSource(w)?1:2;
   return (q?relevanceForWork(b,q)-relevanceForWork(a,q):0)||rank(a)-rank(b)
    ||fold(a.author).localeCompare(fold(b.author))||fold(a.title).localeCompare(fold(b.title));
  });
}
let suggestionIndex=-1;
function suggestedWorks(){
 const matched=filters();
 // Return EVERY matched work, not the previous arbitrary 10-result cap.
 // Prefer readable editions, then verified external text and catalog records.
 const priority=w=>isLocal(w)?0:hasSource(w)?1:2;
 return matched.sort((a,b)=>priority(a)-priority(b)||
  fold(a.author).localeCompare(fold(b.author))||
  fold(a.title).localeCompare(fold(b.title)));
}
function suggestionLabel(key){
 const dict={
  es:{count:"obras coincidentes",local:"para leer aquí",external:"con fuente externa",all:"Elegí cualquier título para abrir su ficha y su lector disponible.",edition:"Edición identificada",none:"No hay obras que coincidan con la consulta o los filtros."},
  en:{count:"matching works",local:"readable here",external:"with external sources",all:"Choose any title to open its record and available reader.",edition:"Identified edition",none:"No matching works under the current filters."},
  fr:{count:"œuvres trouvées",local:"à lire ici",external:"avec source externe",all:"Choisissez un titre pour consulter sa notice et son lecteur disponible.",edition:"Édition identifiée",none:"Aucune œuvre correspondante avec ces filtres."}
 };
 return (dict[language()]||dict.es)[key];
}
function showBookSuggestions(){
 const field=$("classic-query"),list=$("classic-search-suggestions");if(!field||!list)return;
 const query=field.value.trim();
 if(query.length<2){hideBookSuggestions();return}
 const matches=suggestedWorks(),exact=fold(query);
 list.replaceChildren();suggestionIndex=-1;
 if(!matches.length){
  const empty=document.createElement("div");empty.className="classic-suggestion-empty";
  empty.textContent=suggestionLabel("none");list.append(empty);
 }else{
  const heading=document.createElement("div");heading.className="classic-suggestions-heading";
  heading.textContent=matches.length+" "+suggestionLabel("count")+" · "+
   matches.filter(isLocal).length+" "+suggestionLabel("local")+" · "+
   matches.filter(w=>hasSource(w)&&!isLocal(w)).length+" "+suggestionLabel("external");
  list.append(heading);
  const hint=document.createElement("p");hint.className="classic-suggestions-help";
  hint.textContent=suggestionLabel("all");list.append(hint);
  // Every work appears as a selectable row. Large lists scroll without being truncated.
  for(const w of matches){
   const item=document.createElement("button");item.type="button";
   item.className="classic-suggestion";item.setAttribute("role","option");
   item.dataset.work=w.id;item.setAttribute("aria-selected","false");
   const title=document.createElement("strong");title.textContent=w.title;
   const meta=document.createElement("small");
   meta.textContent=w.author+" · "+(w.language==="grc"?"Griego / Greek":"Latín / Latin")+" · "+statusLabel(w);
   item.append(title,meta);
   item.addEventListener("mousedown",event=>event.preventDefault());
   item.addEventListener("click",()=>selectSuggestion(w.id));
   list.append(item);
   // Edition queries should expose the matching edition without pretending it is a
   // second literary work. Selecting it opens the containing work's editions.
   const editions=(w.historicEditions||[]).filter(ed=>
    [ed.title,ed.editor,ed.year,ed.provider].some(value=>fold(value).includes(exact)));
   for(const ed of editions){
    const entry=document.createElement("button");entry.type="button";
    entry.className="classic-suggestion classic-edition-suggestion";
    entry.setAttribute("role","option");entry.dataset.work=w.id;entry.dataset.edition="true";
    entry.setAttribute("aria-selected","false");
    const label=document.createElement("strong");label.textContent=suggestionLabel("edition")+": "+ed.title;
    const desc=document.createElement("small");desc.textContent=[w.title,ed.editor,ed.year,ed.provider].filter(Boolean).join(" · ");
    entry.append(label,desc);
    entry.addEventListener("mousedown",event=>event.preventDefault());
    entry.addEventListener("click",()=>selectSuggestion(w.id,"edition"));
    list.append(entry);
   }
  }
 }
 list.hidden=false;field.setAttribute("aria-expanded","true");
}
function hideBookSuggestions(){
 const list=$("classic-search-suggestions");
 if(list)list.hidden=true;
 const field=$("classic-query");
 if(field){field.setAttribute("aria-expanded","false");field.removeAttribute("aria-activedescendant")}
}
function selectSuggestion(id,selectedView){
 const w=works.find(x=>x.id===id);if(!w)return;
 // Do not replace an author or edition query with the selected title:
 // keeping the query preserves the full matching book list.
 hideBookSuggestions();
 choose(w.id);
 if(selectedView==="edition"){
  // Do not claim an embedded edition exists when the catalogue links outside.
  const evidence=$("classic-detail").querySelector(".classical-evidence");
  if(evidence){
   evidence.setAttribute("tabindex","-1");
   evidence.scrollIntoView({block:"start",behavior:"smooth"});
   return;
  }
 }
 $("classic-detail").scrollIntoView({block:"start",behavior:"smooth"});
}
function initBookSuggestions(){
 const field=$("classic-query"),list=$("classic-search-suggestions");if(!field||!list)return;
 field.addEventListener("focus",showBookSuggestions);
 field.addEventListener("click",showBookSuggestions);
 field.addEventListener("input",()=>{showBookSuggestions()});
 field.addEventListener("keydown",event=>{
  if(event.key==="Escape"){hideBookSuggestions();return}
  if(event.key==="ArrowDown"||event.key==="ArrowUp"){
   event.preventDefault();if(list.hidden)showBookSuggestions();
   const options=[...list.querySelectorAll("button[role=option]")];if(!options.length)return;
   suggestionIndex=(suggestionIndex+(event.key==="ArrowDown"?1:-1)+options.length)%options.length;
   options.forEach((o,i)=>o.setAttribute("aria-selected",String(i===suggestionIndex)));
   options[suggestionIndex].scrollIntoView({block:"nearest"});return;
  }
  if(event.key==="Enter"&&!list.hidden){
   const options=[...list.querySelectorAll("button[role=option]")];
   const option=options[suggestionIndex]||options[0];if(option){event.preventDefault();selectSuggestion(option.dataset.work)}
  }
 });
 document.addEventListener("pointerdown",event=>{if(!event.target.closest(".classic-search-wrap"))hideBookSuggestions()});
 field.addEventListener("blur",()=>{if(!list.matches(":hover"))hideBookSuggestions()});
}


function bibliographicSummary(data,query){
 const box=$("classic-detail");box.replaceChildren();
 const lang=language(),en=lang==="en",fr=lang==="fr";
 const subject=fold(query);
 const exact=data.filter(w=>fold(w.author)===subject||(w.aliases||[]).some(a=>fold(a)===subject));
 const named=exact.length>=2?exact[0].author:null;
 const kicker=document.createElement("p");kicker.className="classic-bibliographic-kicker";
 kicker.textContent=en?"BIBLIOGRAPHIC OVERVIEW":fr?"SYNTHÈSE BIBLIOGRAPHIQUE":"PANORAMA BIBLIOGRÁFICO";box.append(kicker);
 const title=document.createElement("h2");title.textContent=named||query;box.append(title);
 const summary=document.createElement("p");summary.className="classic-bibliographic-count";
 summary.textContent=data.length+" "+(en?"catalogued works":fr?"œuvres répertoriées":"obras catalogadas")+" · "+
 data.filter(isLocal).length+" "+(en?"available for local reading":fr?"à lire ici":"con lectura local")+" · "+
 data.filter(w=>hasSource(w)&&!isLocal(w)).length+" "+(en?"with identified sources":fr?"avec des sources identifiées":"con fuentes identificadas");
 box.append(summary);
 const note=document.createElement("p");note.className="classic-bibliographic-note";
 note.textContent=en?"Select a title to view the bibliographic entry and any verified original, translation or manuscript. Catalogue entries alone do not guarantee a readable text.":
 fr?"Choisissez un titre pour ouvrir sa notice et les textes, traductions ou manuscrits vérifiés. Une notice seule ne garantit pas un texte consultable.":
 "Elegí un título para consultar su ficha bibliográfica, texto original, traducción o manuscrito disponible. Una obra catalogada no implica que ya exista un texto íntegro para leer.";
 box.append(note);
 const list=document.createElement("ol");list.className="classic-bibliographic-list";
 for(const w of data){
  const li=document.createElement("li");li.className="classic-bibliographic-entry";
  const h=document.createElement("h3");h.textContent=w.title;h.lang=w.language;li.append(h);
  const meta=document.createElement("p");
  meta.textContent=[w.author,w.dating,w.genre,w.language==="grc"?"Griego antiguo":"Latín"].filter(Boolean).join(" · ");
  li.append(meta);
  const badge=document.createElement("span");badge.className="classic-item-status "+(isLocal(w)?"is-local":hasSource(w)?"is-external":"is-catalog");
  badge.textContent=statusLabel(w);li.append(badge);
  const button=document.createElement("button");button.type="button";button.className="classic-bibliographic-open";
  button.textContent=isLocal(w)?(en?"Read this work":fr?"Lire cette œuvre":"Leer esta obra"):
   (en?"View bibliographic record":fr?"Voir la notice":"Consultar ficha y fuentes");
  button.addEventListener("click",()=>{choose(w.id);box.scrollIntoView({block:"start",behavior:"smooth"})});
  li.append(button);list.append(li);
 }
 box.append(list);
}

function render(){const data=filters(),t=terms();const total=works.length,local=works.filter(isLocal).length,withSource=works.filter(w=>hasSource(w)&&!isLocal(w)).length;
 $("classic-count").textContent=data.length+" / "+total+" "+t.search+" · "+local+" "+(language()==="en"?"local reading":"lecturas locales")+" · "+withSource+" "+(language()==="en"?"external source records":"fuentes externas identificadas");const target=$("classic-list");target.replaceChildren();for(const w of data){const b=document.createElement("button");b.className="classic-item";b.type="button";b.dataset.id=w.id;b.setAttribute("aria-current",String(w.id===selected));b.innerHTML="<span>"+safe(w.author)+" · "+safe(w.dating)+"</span><strong lang='"+safe(w.language)+"'>"+safe(w.title)+"</strong><span>"+safe(w.genre)+"</span>";const availabilityMarker=document.createElement("small");availabilityMarker.className="classic-item-status "+(isLocal(w)?"is-local":hasSource(w)?"is-external":"is-catalog");availabilityMarker.textContent=statusLabel(w);b.append(availabilityMarker);b.addEventListener("click",()=>choose(w.id));target.append(b)}if(!data.some(x=>x.id===selected)){if(data.length){selected=data[0].id;tab=data[0].pdf?.url?"pdf":"text"}else selected=""}target.querySelectorAll("button").forEach(b=>b.setAttribute("aria-current",String(b.dataset.id===selected)));const q=$("classic-query").value.trim();if(q&&data.length>1&&!showSelectedDetail)bibliographicSummary(data,q);else detail();}
function choose(id){selected=id;showSelectedDetail=true;tab=works.find(x=>x.id===id)?.pdf?.url?"pdf":"text";render();
 const u=new URL(location.href);u.searchParams.set("work",id);u.searchParams.delete("view");u.searchParams.delete("ms");u.searchParams.delete("pdf");history.replaceState(null,"",u);}
function detail(){const w=works.find(x=>x.id===selected),box=$("classic-detail"),t=terms();if(!w){box.textContent=language()==="en"?"No results.":"Sin resultados.";return}
const isTriple=w.id==="cicero-officiis",hasWitness=!!(w.witnessRecords?.length||w.manuscript?.manifest);
 const hasPdf=!!w.pdf?.url;
 const pdfEditions=Array.isArray(w.pdfEditions)&&w.pdfEditions.length?
  w.pdfEditions.filter(x=>window.ClassicsFacsimileViewer?.isLocalPDF(x.url)):hasPdf?[w.pdf]:[];
 const multiplePdf=pdfEditions.length>=2;
 const hasThreePanels=hasPdf&&w.localVersions?.length>=2;
 const manuscriptTab=hasWitness?[["manuscript",t.manuscript+(w.witnessRecords?.some(ms=>localManuscriptUrl(ms))?" · folios locales / IIIF":" · IIIF")]]:[];
 const pdfTab=hasPdf?[["pdf",multiplePdf?"PDF · original / traducción":t.pdf+" · Zoom / páginas"]]:[];
 const compareTab=multiplePdf?[["comparepdf","Comparar dos PDF · original / traducción"]]:[];
 const tripleTab=hasThreePanels?[["parallel","Tres visores · facsímil / latín / traducción"]]:[];
 const transcriptionTab=(w.localVersions?.length||w.localHtml||w.localReader?.verified)?[["text",t.source+" · transcripción"]]:[];
 const labels=isTriple?[["text","Tres visores · Códice / latín / traducción"],...pdfTab,...compareTab,...manuscriptTab]:
  !isLocal(w)?[["external",w.reading?.url?"Fuente externa y ficha":"Localizar ediciones"],...pdfTab,...manuscriptTab]:
  hasPdf?[...pdfTab,...tripleTab,...compareTab,...transcriptionTab,...manuscriptTab]:
  w.localHtml?[["text",t.source],...manuscriptTab]:
  [["text",t.source],...manuscriptTab,["edition",t.edition]];
 if(w.historicEditions?.length&&!labels.some(x=>x[0]==="edition"))labels.push(["edition",t.edition]);
 if(!labels.some(x=>x[0]===tab))tab=labels[0][0];
const tabs=labels.map(([id,label])=>'<button type="button" data-tab="'+id+'" aria-pressed="'+(id===tab)+'">'+safe(label)+'</button>').join("");
box.innerHTML='<div class="classic-tag">'+safe(w.language==="la"?"LATINE · LATÍN":"ΕΛΛΗΝΙΚΑ · GRIEGO")+'</div><div class="classic-tag">'+safe(w.genre)+'</div><h2 lang="'+w.language+'">'+safe(w.title)+'</h2><p><strong>'+safe(w.author)+'</strong> · '+safe(w.dating)+'</p><p class="classic-detail-status '+(isLocal(w)?"is-local":hasSource(w)?"is-external":"is-catalog")+'">'+statusLabel(w)+'</p><div class="classic-tabstrip" role="group" aria-label="Modos de lectura">'+tabs+'</div><div id="classic-panel" class="classic-viewer" role="region" aria-live="polite"></div><div class="classic-linkline">'+navLink(w.links.scaife,t.scaife)+navLink(w.links.gallica,t.gallica)+navLink(w.links.archive,t.archive)+'</div><p class="classic-ref"><strong>Nota editorial:</strong> '+safe(w.translation?.status||"Traducción sin cotejar.")+' '+safe(w.manuscript?.status||"Sin facsímil identificado.")+'</p>';
if(w.encyclopedia?.url&&/^https:\/\/[a-z-]+\.wikipedia\.org\/wiki\//i.test(w.encyclopedia.url)){
  const study=document.createElement('section');study.className='classic-encyclopedia-study';
  const heading=document.createElement('h3');heading.textContent='Estudio enciclopédico · contextualización de la obra';
  const intro=document.createElement('p');
  intro.textContent=w.encyclopedia.note||'Artículo secundario de contexto histórico; no es la edición del texto antiguo.';
  const links=document.createElement('div');links.className='classic-linkline';
  const internal=document.createElement('a');internal.href=w.encyclopedia.internalSearch||'vitruvia.html?q='+encodeURIComponent(w.title);
  internal.textContent='Leer estudio enciclopédico dentro de Vitruvia ↗';links.append(internal);
  const original=document.createElement('a');original.href=w.encyclopedia.url;
  original.target='_blank';original.rel='noopener noreferrer';
  original.textContent='Fuente original, notas e historial en Wikipedia ↗';links.append(original);
  const attribution=document.createElement('small');
  attribution.textContent=w.encyclopedia.attribution||'Wikipedia · licencia CC BY-SA; consultar fuente original.';
  study.append(heading,intro,links,attribution);
  const tabs=box.querySelector('.classic-tabstrip');
  if(tabs)tabs.before(study);else box.append(study);
 }
const back=document.createElement("a");back.href="vitruvia.html?q="+encodeURIComponent((w.aliases||[])[0]||w.title)+"&mode=site";
 back.className="classic-search-via-vitruvia";back.textContent="⌕ Buscar esta obra, sus códices y ediciones en Vitruvia";box.append(back);
 pubLinks(w.witnessRecords,"Testimonios manuscritos verificados · códices",box);
 pubLinks(w.historicEditions,"Ediciones históricas, textos y PDF identificados",box);
 if(w.language==="grc"&&!w.historicEditions?.some(x=>x.langs?.includes("la"))){
  const p=document.createElement("p");p.className="classic-ref";
  p.textContent="Traducción neolatina: pendiente de cotejo. La presencia del griego original no garantiza una versión latina, española ni inglesa disponible.";box.append(p);
 }
 if(w.bibliography){const bib=document.createElement("section");bib.className="classic-bibliography";bib.setAttribute("aria-label","Registro bibliográfico y codicológico");const title=document.createElement("h3");title.textContent="Registro bibliográfico · Chicago 18";bib.append(title);const p=document.createElement("p");p.textContent=w.bibliography.editionCitation||w.bibliography.preferredCitation||"";bib.append(p);if(w.bibliography.manuscriptCitation){const h=document.createElement("h4");h.textContent="Codicología · Testimonio digital";bib.append(h);const witness=document.createElement("p");witness.textContent=w.bibliography.manuscriptCitation;bib.append(witness)}const note=document.createElement("p");note.textContent=w.bibliography.method||"";bib.append(note);box.append(bib)}
const localWitness=(w.witnessRecords||[]).find(ms=>localManuscriptUrl(ms));
if(localWitness){
 const feature=document.createElement("section");feature.className="classical-local-manuscript-feature";
 const title=document.createElement("h3");title.textContent="Manuscrito digitalizado disponible en esta biblioteca";
 const subtitle=document.createElement("p");
 subtitle.textContent=[localWitness.title,localWitness.shelfmark,localWitness.library,localWitness.localFolioCount?localWitness.localFolioCount+" imágenes digitales":""].filter(Boolean).join(" · ");
 const open=document.createElement("button");open.type="button";open.className="classical-local-manuscript-cta";
 open.textContent="Leer "+localWitness.shelfmark+" · folio a folio en esta página";
 open.addEventListener("click",()=>{
  tab="manuscript";const u=new URL(location.href);
  u.searchParams.set("work",w.id);u.searchParams.set("view","manuscript");u.searchParams.set("ms",localWitness.id);
  history.replaceState(null,"",u);detail();
  $("classic-panel")?.scrollIntoView({block:"start",behavior:"smooth"});
 });
 const external=document.createElement("a");external.href=localManuscriptUrl(localWitness);
 external.target="_blank";external.rel="noopener noreferrer";
 external.textContent="Abrir lector completo en otra pestaña";
 feature.append(title,subtitle,open,external);
 const target=box.querySelector(".classic-tabstrip");
 if(target)target.before(feature);else box.append(feature);
}
box.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{
  tab=b.dataset.tab;const u=new URL(location.href);u.searchParams.set("work",w.id);u.searchParams.set("view",tab);
  if(tab!=="manuscript")u.searchParams.delete("ms");if(tab!=="pdf")u.searchParams.delete("pdf");history.replaceState(null,"",u);detail();
 }));
const pane=$("classic-panel");
if(tab==="external"){
  const searchText=[w.author,(w.aliases||[])[0]||w.title].join(" ");
  const googleBooks="https://books.google.com/books?q="+encodeURIComponent(searchText);
  const scaifeDiscovery=w.discovery?.scaife||"https://www.google.com/search?q="+encodeURIComponent("site:scaife.perseus.org "+searchText);
  const wikiSearch=w.discovery?.wikisource||"https://"+(w.language==="la"?"la":"el")+".wikisource.org/w/index.php?search="+encodeURIComponent(searchText);
  const header=document.createElement("h3");header.textContent=w.reading?.url?"Fuente externa consignada":"Localización académica de ediciones";pane.replaceChildren(header);
  const status=document.createElement("p");status.textContent=w.reading?.status||"No hay una edición local acreditada.";pane.append(status);
  const box=document.createElement("div");box.className="classic-linkline";
  for(const [url,label] of [[w.reading?.url,"Consultar texto en la institución de origen"],[scaifeDiscovery,"Buscar edición griega o latina en Scaife / Perseus"],[wikiSearch,"Buscar texto original en Wikisource"],[w.links?.archive,"Buscar digitalizaciones en Internet Archive"],[googleBooks,"Buscar edición histórica en Google Books"]]){
   if(!url||!/^https:\/\//i.test(url))continue;
   const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label+" ↗";box.append(a);
  }
  pane.append(box);
  const warning=document.createElement("p");warning.className="classic-ref";warning.textContent="Estos vínculos localizan materiales. No afirman que exista una transcripción íntegra o un códice concreto en el destino; cada documento deberá verificarse antes de presentarlo como edición incorporada.";pane.append(warning);
 }else if(tab==="text"&&isTriple){window.BibliothecaTripleReader.mount(pane,w);}else if(tab==="text"&&w.localVersions?.length){pane.innerHTML="<h3>Ediciones incorporadas al sitio</h3><p>"+safe(w.reading.status)+"</p><div class=\"classic-compare-toolbar\"><label>Primera versión<select id=\"classic-version-a\"></select></label><label>Segunda versión<select id=\"classic-version-b\"></select></label></div><div class=\"classic-compare-panes\"><iframe id=\"classic-frame-a\" title=\"Edición primera\"></iframe><iframe id=\"classic-frame-b\" title=\"Edición segunda\"></iframe></div>";const a=pane.querySelector("#classic-version-a"),b=pane.querySelector("#classic-version-b");for(const [i,ver] of w.localVersions.entries()){for(const sel of [a,b]){const opt=document.createElement("option");opt.value=String(i);opt.textContent=ver.label;sel.append(opt)}}b.value=String(Math.min(1,w.localVersions.length-1));function updateFrames(){pane.querySelector("#classic-frame-a").src=w.localVersions[Number(a.value)].path;pane.querySelector("#classic-frame-b").src=w.localVersions[Number(b.value)].path}a.addEventListener("change",updateFrames);b.addEventListener("change",updateFrames);updateFrames();}else if(tab==="text"&&w.localHtml){pane.innerHTML="<h3>"+safe(t.source)+" · "+safe(w.localEdition?.original||"")+(w.localEdition?.translation?" / "+safe(w.localEdition.translation):"")+"</h3><p>"+safe(w.localEdition?.source||"")+"</p>";const frame=document.createElement("iframe");frame.src=w.localHtml;frame.title="Lectura íntegra · "+w.author+" · "+w.title;frame.loading="lazy";frame.style.minHeight="72vh";frame.style.background="#fbf8f0";pane.append(frame);const p=document.createElement("p");p.className="classic-linkline";p.innerHTML=navLink(w.localHtml,"Abrir texto completo alojado en GitHub");pane.append(p);}else if(tab==="text"&&w.localReader?.verified){window.BibliothecaTextReader.mount(pane,w.defaultLanguage||"es");}else if(tab==="text"){pane.innerHTML="<h3>"+safe(t.source)+"</h3>"+(w.reading.url?'<p>'+safe(w.reading.status)+'</p><div class="classic-linkline">'+navLink(w.reading.url,t.visit)+'</div><p>'+safe(t.notHosted)+'</p>':'<p>'+safe(t.notKnown)+'</p><p>'+safe(t.notHosted)+'</p><div class="classic-linkline">'+navLink(w.links.scaife,t.scaife)+'</div>');}
if(tab==="manuscript"){
  const witnesses=w.witnessRecords||[];
  pane.replaceChildren();
  if(witnesses.length){
   const bar=document.createElement("div");bar.className="classical-ms-switch";
   const label=document.createElement("label");label.textContent="Seleccionar testimonio manuscrito";
   const selector=document.createElement("select");selector.setAttribute("aria-label","Seleccionar códice");
    const requestedMs=new URLSearchParams(location.search).get("ms");
   witnesses.forEach((record,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=record.shelfmark+" · "+record.library;selector.append(o)});
   if(requestedMs){const index=witnesses.findIndex(ms=>ms.id===requestedMs);if(index>=0)selector.value=String(index)}
    label.append(selector);bar.append(label);pane.append(bar);
   const viewer=document.createElement("div");viewer.className="classical-manuscript-panel";pane.append(viewer);
   const show=()=>{const chosen=witnesses[Number(selector.value)]||witnesses[0];if(!showLocalManuscript(viewer,chosen))window.ClassicsFacsimileViewer?.mountManuscript(viewer,chosen)};
   selector.addEventListener("change",()=>{const url=new URL(location.href);url.searchParams.set("work",w.id);url.searchParams.set("view","manuscript");url.searchParams.set("ms",witnesses[Number(selector.value)]?.id||"");history.replaceState(null,"",url);show()});show();
  }else if(w.manuscript?.manifest){
   const fallback={title:w.title,shelfmark:w.title,library:w.author,manifest:w.manuscript.manifest,viewer:w.manuscript.record||w.manuscript.manifest,record:w.manuscript.record||w.manuscript.manifest,coverage:w.manuscript.status||"",rights:"Consultar condiciones institucionales de reproducción."};
   window.ClassicsFacsimileViewer?.mountManuscript(pane,fallback);
  }else pane.append(document.createTextNode("Sin códice identificado para esta obra."));
 }
if(tab==="edition"&&w.historicEditions?.length){pane.replaceChildren();pubLinks(w.historicEditions,t.edition,pane);}else if(tab==="edition"&&w.localReader?.verified){window.BibliothecaTextReader.mount(pane,"en");}else if(tab==="edition"){pane.innerHTML="<h3>"+safe(t.edition)+"</h3><p>"+safe(w.reading.status)+"</p><p>"+safe(t.noTrans)+"</p><p>"+safe(t.notHosted)+"</p><div class='classic-linkline'>"+navLink(w.links.scaife,t.scaife)+"</div>";}
if(tab==="pdf"){
  if(w.pdf?.url){
   const variants=pdfEditions.length?pdfEditions:[w.pdf];
   const requested=new URLSearchParams(location.search).get("pdf");
   const selectedEdition=variants.find(v=>v.url===requested)||variants.find(v=>v.role==="original")||variants[0];
   pane.replaceChildren();
   const view=document.createElement("div");view.className="classic-selected-pdf";
   function showEdition(v){
    const langLabel=v.language==="grc"?"GRIEGO ORIGINAL":v.language==="la"?"LATÍN ORIGINAL":v.language==="en"?"TRADUCCIÓN INGLESA":v.language==="es"?"TRADUCCIÓN CASTELLANA":"EDICIÓN HISTÓRICA";
    window.ClassicsFacsimileViewer?.mountPdf(view,{
     url:v.url,title:w.title+" · "+langLabel,
     note:langLabel+" · "+(v.status||"")+" · "+(v.rights||"")+" · "+(v.coverage||""),
     sizeLabel:v.sizeBytes?(v.sizeBytes/1048576).toFixed(1)+" MiB":"PDF histórico"
    });
   }
   if(variants.length>1){
    const bar=document.createElement("div");bar.className="classic-pdf-version-toolbar";
    const label=document.createElement("label");label.textContent="Edición para consultar";
    const selector=document.createElement("select");selector.setAttribute("aria-label","Elegir PDF original o traducción");
    for(const [i,v] of variants.entries()){
     const option=document.createElement("option");option.value=String(i);
     option.textContent=(v.label||(v.language==="grc"?"Griego":v.language==="la"?"Latín":"Traducción"))+" · "+(v.pages||"—")+" páginas";
     selector.append(option);
    }
    selector.value=String(variants.indexOf(selectedEdition));label.append(selector);bar.append(label);
    const note=document.createElement("p");note.className="classic-ref";
    note.textContent="Ediciones independientes: el original y la traducción no están alineados por número de página.";bar.append(note);
    pane.append(bar);
    selector.addEventListener("change",()=>{
     const chosen=variants[Number(selector.value)]||variants[0],u=new URL(location.href);
     u.searchParams.set("work",w.id);u.searchParams.set("view","pdf");u.searchParams.set("pdf",chosen.url);
     history.replaceState(null,"",u);showEdition(chosen);
    });
   }
   pane.append(view);showEdition(selectedEdition);
  }else pane.innerHTML="<h3>"+safe(t.pdf)+"</h3><p>"+safe(t.noPdf)+"</p>";
 }
 if(tab==="comparepdf"&&pdfEditions.length>=2){
  pane.replaceChildren();
  const note=document.createElement("p");note.className="classic-ref";
  note.textContent="Dos ediciones históricas independientes. No se afirma correspondencia exacta entre las páginas.";pane.append(note);
  const holder=document.createElement("div");holder.className="classic-double-pdf";pane.append(holder);
  const first=pdfEditions.find(v=>v.role==="original")||pdfEditions[0];
  const second=pdfEditions.find(v=>v.role==="translation")||pdfEditions.find(v=>v.url!==first.url)||pdfEditions[0];
  for(const v of [first,second]){
   const box=document.createElement("section");box.className="classic-compare-item";
   const title=document.createElement("h3");title.textContent=v.label||"Edición";box.append(title);
   const frame=document.createElement("iframe");frame.loading="lazy";frame.title=title.textContent+" · "+w.title;frame.src=v.url+"#toolbar=1&navpanes=0";box.append(frame);
   const open=document.createElement("a");open.href=v.url;open.target="_blank";open.rel="noopener noreferrer";open.textContent="Abrir PDF completo ↗";box.append(open);
   holder.append(box);
  }
 }
 if(tab==="parallel"&&hasThreePanels){
  pane.replaceChildren();
  const note=document.createElement("p");note.className="classic-ref";
  note.textContent="Fascímil histórico, transcripción original y traducción en tres visores independientes. No existe alineación automática de folios, páginas y versos.";pane.append(note);
  const original=w.localVersions.find(v=>v.language===w.language)||w.localVersions[0];
  const translations=w.localVersions.filter(v=>v.path!==original.path);
  const holder=document.createElement("div");holder.className="classic-triple-reading";pane.append(holder);
  const def=[
   {name:"01 · PDF histórico",path:w.pdf.url,pdf:true},
   {name:"02 · "+(w.language==="grc"?"Griego original":"Latín original"),path:original.path},
   {name:"03 · Traducción",path:(translations[0]||original).path,options:translations}
  ];
  for(const info of def){
   const column=document.createElement("section");column.className="classic-triple-column";
   const title=document.createElement("h3");title.textContent=info.name;column.append(title);
   const frame=document.createElement("iframe");frame.loading="lazy";frame.title=info.name;frame.src=info.path+(info.pdf?"#toolbar=1&navpanes=0":"");
   if(info.options?.length>1){
    const select=document.createElement("select");select.setAttribute("aria-label","Seleccionar idioma de traducción");
    info.options.forEach((v,i)=>{const opt=document.createElement("option");opt.value=String(i);opt.textContent=v.label||v.language;select.append(opt)});
    select.addEventListener("change",()=>{frame.src=info.options[Number(select.value)].path});
    column.append(select);
   }
   column.append(frame);holder.append(column);
  }
 }
}
async function boot(){
 const [res,reference]=await Promise.all([
  fetch("data/bibliotheca-graeca-latina-I-bce-I-ce.json?v=20261104-reading-cta-v4"),
  fetch("data/bibliotheca-testimonia-verified.json?v=20261104-authors-witnesses-v3").then(r=>r.ok?r.json():{records:[],editions:[]}).catch(()=>({records:[],editions:[]}))
 ]);
 if(!res.ok)throw Error("HTTP "+res.status);
 witnessData=reference;
 works=((await res.json()).works||[]).filter(w=>w&&w.id&&w.title&&(w.language==="la"||w.language==="grc"));
 const map=new Map(works.map(w=>[w.id,w]));
 for(const record of (witnessData.records||[]))for(const id of record.workIds||[]){
  const w=map.get(id);if(w)(w.witnessRecords??=[]).push(record);
 }
 for(const edition of witnessData.editions||[]){const w=map.get(edition.workId);if(w)(w.historicEditions??=[]).push(edition)}
 for(const w of works)w.witnessRecords?.sort((a,b)=>(a.dateStart??9999)-(b.dateStart??9999));
 const n=$("classic-witness-count");if(n)n.textContent=(witnessData.records||[]).length+" testimonios codicológicos individualizados";const genres=[...new Set(works.map(x=>x.genre))].sort((a,b)=>a.localeCompare(b,"es"));for(const s of genres){const o=document.createElement("option");o.textContent=o.value=s;$("classic-genre").append(o)}const availability=$("classic-availability");if(availability)availability.addEventListener("change",()=>{hideBookSuggestions();render()});
 const period=$("classic-period");if(period)period.addEventListener("change",()=>{hideBookSuggestions();render()});
 const clear=$("classic-clear");if(clear){const inp=$("classic-query");const sync=()=>{clear.hidden=!inp.value};inp.addEventListener("input",sync);clear.addEventListener("click",()=>{inp.value="";sync();hideBookSuggestions();render();inp.focus()});inp.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&inp.value){ev.preventDefault();inp.value="";sync();hideBookSuggestions();render()}});sync()}
 const startParams=new URLSearchParams(location.search),wanted=startParams.get("work");
 selected=works.find(w=>w.id===wanted)?.id||works[0]?.id||"";
 const requestedView=startParams.get("view");
 tab=["pdf","manuscript","external","text","edition","comparepdf","parallel"].includes(requestedView)?requestedView:(works.find(w=>w.id===selected)?.pdf?.url?"pdf":"text");try{const saved=localStorage.getItem("vitruvius-ui-lang");if(["es","en","fr"].includes(saved))$("classic-ui-language").value=saved;}catch{}for(const name of ["classic-query","classic-language","classic-genre","classic-ui-language"])$(name).addEventListener(name==="classic-query"?"input":"change",()=>{if(name==="classic-ui-language")translateInterface();showSelectedDetail=false;render();});translateInterface();render();initBookSuggestions();}
boot().catch(err=>{$("classic-count").textContent="No se pudo abrir el catálogo: "+err.message;});
})();