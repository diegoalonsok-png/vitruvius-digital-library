/* Classical works browser: read source-linked texts and verified manuscript facsimiles.
No fabricated digitization, translation, ISBN or PDF links. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fold=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
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

let works=[],selected="",tab="text",witnessData={records:[],editions:[]};
const bcFocusIds=new Set(("vitruvius cicero-officiis cicero-oratore cicero-republica cicero-catilinariae cicero-de-finibus cicero-tusculanae cicero-de-natura-deorum cicero-de-amicitia cicero-de-senectute cicero-de-divinatione cicero-brutus cicero-philippicae caesar-gallico caesar-civili sallust-catiline sallust-iugurtha varro-rustica varro-de-lingua-latina lucretius virgil-aeneid virgil-georgica horace-odes horace-sermones horace-ars-poetica horace-epodi horace-epistulae catullus-carmina plautus-amphitruo plautus-aulularia terentius-andria terentius-heautontimorumenos cato-agri-cultura polybius-historiae").split(" "));
const adFocusIds=new Set(("diodorus dionysius strabo philo philo-legum-allegoriae philo-de-vita-mosis seneca-epistulae seneca-naturales seneca-de-brevitate seneca-de-ira seneca-de-clementia seneca-de-tranquillitate lucan pliny dioscorides josephus-war josephus-antiquities quintilian martial tacitus-agricola tacitus-germania tacitus-annales tacitus-historiae tacitus-dialogus frontinus frontinus-strategemata celsus columella juvenal suetonius-caesares petronius-satyrica pliny-younger-epistulae apuleius-metamorphoses apuleius-apologia apuleius-de-deo-socratis plutarch-lives plutarch-moralia galen-ars-medica galen-de-usu-partium ptolemy-almagest ptolemy-geographia marcus-aurelius-meditations epictetus-discourses arrian-anabasis-alexandri pausanias-periegesis").split(" "));
function periodFocus(w){return bcFocusIds.has(w.id)||adFocusIds.has(w.id)||!!w.witnessRecords?.length}
function pubLinks(entries,title,container){
 if(!entries?.length)return;
 const section=document.createElement("section");section.className="classical-evidence";
 const h=document.createElement("h3");h.textContent=title;section.append(h);
 for(const x of entries){
  const article=document.createElement("article");article.className="classical-evidence-record";
  const strong=document.createElement("strong");strong.textContent=x.title;article.append(strong);
  const meta=document.createElement("p");meta.className="classical-evidence-meta";
  meta.textContent=[x.library,x.shelfmark,x.date].filter(Boolean).join(" · ");article.append(meta);
  if(x.coverage){const p=document.createElement("p");p.textContent=x.coverage;article.append(p)}
  if(x.note){const p=document.createElement("p");p.textContent=x.note;article.append(p)}
  if(x.rights){const p=document.createElement("small");p.textContent=x.rights;article.append(p)}
  const links=document.createElement("div");links.className="classic-linkline";
  for(const [label,url] of [["Ver códice en la institución",x.viewer],["Registro y signatura",x.record],["Edición / PDF en la fuente",x.url]]){
   if(!url||!/^https:\/\//.test(url))continue;
   if([...links.querySelectorAll("a")].some(a=>a.href===url))continue;
   const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label+" ↗";links.append(a);
  }
  article.append(links);section.append(article);
 }
 container.append(section);
}
function language(){return $("classic-ui-language").value||"es";}
function terms(){return L[language()];}
function navLink(url,txt){return '<a target="_blank" rel="noopener noreferrer" href="'+safe(url)+'">'+safe(txt)+' ↗</a>';}
function isLocal(w){return w.publicStatus==="lectura-local-completa"&&!!(w.localReader?.verified||w.pdf?.url||w.localHtml||w.localVersions?.length)}
function hasSource(w){return !!(w.reading?.url||w.pdf?.url||w.localHtml||w.manuscript?.manifest)}
function statusLabel(w){return isLocal(w)?"LECTURA EN VITRUVIA":hasSource(w)?"FUENTE IDENTIFICADA":"REPERTORIO · LOCALIZACIÓN"}
function filters(){const q=fold($("classic-query").value.trim()),lang=$("classic-language").value,genre=$("classic-genre").value,availability=$("classic-availability")?.value||"",period=$("classic-period")?.value||"";return works.filter(w=>(period!=="focus"||periodFocus(w))&&(!lang||w.language===lang)&&(!genre||w.genre===genre)&&(!availability||(availability==="local"?isLocal(w):availability==="source"?hasSource(w)&&!isLocal(w):!hasSource(w)))&&(!q||q.split(/\s+/).every(t=>fold([w.author,w.title,w.genre,w.dating,w.language,...(w.aliases||[])].join(" ")).includes(t))))}
let suggestionIndex=-1;
function showBookSuggestions(){
 const field=$("classic-query"),list=$("classic-search-suggestions");if(!field||!list)return;
 const query=field.value.trim();if(query.length<2){hideBookSuggestions();return}
  const matches=filters().slice(0,10);list.replaceChildren();suggestionIndex=-1;
 if(!matches.length){const empty=document.createElement("div");empty.className="classic-suggestion";empty.textContent=language()==="en"?"No matching books.":"No hay libros coincidentes.";list.append(empty)}
 else for(const w of matches){const item=document.createElement("button");item.type="button";item.className="classic-suggestion";item.setAttribute("role","option");item.dataset.work=w.id;item.setAttribute("aria-selected","false");
 const title=document.createElement("strong");title.textContent=w.title;const meta=document.createElement("small");meta.textContent=w.author+" · "+statusLabel(w);
 item.append(title,meta);item.addEventListener("mousedown",event=>event.preventDefault());item.addEventListener("click",()=>selectSuggestion(w.id));list.append(item)}
 list.hidden=false;field.setAttribute("aria-expanded","true");
}
function hideBookSuggestions(){const list=$("classic-search-suggestions");if(list)list.hidden=true;const field=$("classic-query");if(field){field.setAttribute("aria-expanded","false");field.removeAttribute("aria-activedescendant")}}
function selectSuggestion(id){const w=works.find(x=>x.id===id);if(!w)return;$("classic-query").value=w.title;hideBookSuggestions();choose(w.id);$("classic-detail").scrollIntoView({block:"nearest",behavior:"smooth"});}
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

function render(){const data=filters(),t=terms();const total=works.length,local=works.filter(isLocal).length,withSource=works.filter(w=>hasSource(w)&&!isLocal(w)).length;
 $("classic-count").textContent=data.length+" / "+total+" "+t.search+" · "+local+" "+(language()==="en"?"local reading":"lecturas locales")+" · "+withSource+" "+(language()==="en"?"external source records":"fuentes externas identificadas");const target=$("classic-list");target.replaceChildren();for(const w of data){const b=document.createElement("button");b.className="classic-item";b.type="button";b.dataset.id=w.id;b.setAttribute("aria-current",String(w.id===selected));b.innerHTML="<span>"+safe(w.author)+" · "+safe(w.dating)+"</span><strong lang='"+safe(w.language)+"'>"+safe(w.title)+"</strong><span>"+safe(w.genre)+"</span>";const availabilityMarker=document.createElement("small");availabilityMarker.className="classic-item-status "+(isLocal(w)?"is-local":hasSource(w)?"is-external":"is-catalog");availabilityMarker.textContent=statusLabel(w);b.append(availabilityMarker);b.addEventListener("click",()=>choose(w.id));target.append(b)}if(!data.some(x=>x.id===selected)){if(data.length){selected=data[0].id;tab=data[0].pdf?.url?"pdf":"text"}else selected=""}target.querySelectorAll("button").forEach(b=>b.setAttribute("aria-current",String(b.dataset.id===selected)));detail();}
function choose(id){selected=id;tab=works.find(x=>x.id===id)?.pdf?.url?"pdf":"text";render();const u=new URL(location.href);u.searchParams.set("work",id);history.replaceState(null,"",u);}
function detail(){const w=works.find(x=>x.id===selected),box=$("classic-detail"),t=terms();if(!w){box.textContent=language()==="en"?"No results.":"Sin resultados.";return}
const isTriple=w.id==="cicero-officiis";const labels=!isLocal(w)?[["external",w.reading?.url?"Fuente externa y ficha":"Localizar ediciones"],...(w.manuscript?.manifest?[["manuscript",t.manuscript]]:[])]:isTriple?[["text","Tres visores · Códice / latín / traducción"]]:w.pdf?.url?[["pdf",t.pdf],...(w.localReader?.verified?[["text",t.source]]:[])]:w.localHtml?[["text",t.source],...(w.manuscript?.manifest?[["manuscript",t.manuscript]]:[])]:[["text",t.source],["manuscript",t.manuscript],["edition",t.edition]];if(!labels.some(x=>x[0]===tab))tab=labels[0][0];
const tabs=labels.map(([id,label])=>'<button type="button" data-tab="'+id+'" aria-pressed="'+(id===tab)+'">'+safe(label)+'</button>').join("");
box.innerHTML='<div class="classic-tag">'+safe(w.language==="la"?"LATINE · LATÍN":"ΕΛΛΗΝΙΚΑ · GRIEGO")+'</div><div class="classic-tag">'+safe(w.genre)+'</div><h2 lang="'+w.language+'">'+safe(w.title)+'</h2><p><strong>'+safe(w.author)+'</strong> · '+safe(w.dating)+'</p><p class="classic-detail-status '+(isLocal(w)?"is-local":hasSource(w)?"is-external":"is-catalog")+'">'+statusLabel(w)+'</p><div class="classic-tabstrip" role="group" aria-label="Modos de lectura">'+tabs+'</div><div id="classic-panel" class="classic-viewer" role="region" aria-live="polite"></div><div class="classic-linkline">'+navLink(w.links.scaife,t.scaife)+navLink(w.links.gallica,t.gallica)+navLink(w.links.archive,t.archive)+'</div><p class="classic-ref"><strong>Nota editorial:</strong> '+safe(w.translation?.status||"Traducción sin cotejar.")+' '+safe(w.manuscript?.status||"Sin facsímil identificado.")+'</p>';
pubLinks(w.witnessRecords,"Testimonios manuscritos verificados · códices",box);
 pubLinks(w.historicEditions,"Ediciones históricas, textos y PDF identificados",box);
 if(w.language==="grc"&&!w.historicEditions?.some(x=>x.langs?.includes("la"))){
  const p=document.createElement("p");p.className="classic-ref";
  p.textContent="Traducción neolatina: pendiente de cotejo. La presencia del griego original no garantiza una versión latina, española ni inglesa disponible.";box.append(p);
 }
 if(w.bibliography){const bib=document.createElement("section");bib.className="classic-bibliography";bib.setAttribute("aria-label","Registro bibliográfico y codicológico");const title=document.createElement("h3");title.textContent="Registro bibliográfico · Chicago 18";bib.append(title);const p=document.createElement("p");p.textContent=w.bibliography.editionCitation||w.bibliography.preferredCitation||"";bib.append(p);if(w.bibliography.manuscriptCitation){const h=document.createElement("h4");h.textContent="Codicología · Testimonio digital";bib.append(h);const witness=document.createElement("p");witness.textContent=w.bibliography.manuscriptCitation;bib.append(witness)}const note=document.createElement("p");note.textContent=w.bibliography.method||"";bib.append(note);box.append(bib)}
box.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.tab;detail();}));
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
if(tab==="manuscript"){pane.innerHTML="<h3>"+safe(t.manuscript)+"</h3><p>"+safe(w.manuscript.status)+"</p><p>"+safe(t.witness)+"</p>";if(w.manuscript.manifest){const iframe=document.createElement("iframe");const v=w.id==="vitruvius"?"https://gallica.bnf.fr/ark:/12148/btv1b9066098j/f1.item.mini":"https://uv-v4.netlify.app/#?manifest="+encodeURIComponent(w.manuscript.manifest);iframe.title="IIIF · "+w.title;iframe.loading="lazy";iframe.referrerPolicy="strict-origin-when-cross-origin";iframe.src=v;pane.append(iframe);const p=document.createElement("p");p.className="classic-linkline";p.innerHTML=navLink(w.manuscript.manifest,"IIIF manifest")+(w.manuscript.record?" "+navLink(w.manuscript.record,"Ficha institucional del manuscrito"):"");pane.append(p);}}
if(tab==="edition"&&w.localReader?.verified){window.BibliothecaTextReader.mount(pane,"en");}else if(tab==="edition"){pane.innerHTML="<h3>"+safe(t.edition)+"</h3><p>"+safe(w.reading.status)+"</p><p>"+safe(t.noTrans)+"</p><p>"+safe(t.notHosted)+"</p><div class='classic-linkline'>"+navLink(w.links.scaife,t.scaife)+"</div>";}
if(tab==="pdf"){if(w.pdf?.url){pane.innerHTML="<h3>"+safe(t.pdf)+"</h3><p>"+safe(w.pdf.status)+"</p><div class='classic-linkline'>"+navLink(w.pdf.url,t.open)+"</div>";const frame=document.createElement("iframe");frame.src=w.pdf.url+"#toolbar=1&navpanes=0";frame.title="PDF · "+w.author+" · "+w.title;frame.loading="lazy";pane.append(frame);}else{pane.innerHTML="<h3>"+safe(t.pdf)+"</h3><p>"+safe(t.noPdf)+"</p><div class='classic-linkline'>"+navLink(w.links.archive,t.archive)+" "+navLink(w.links.gallica,t.gallica)+"</div>";}}
}
async function boot(){
 const [res,reference]=await Promise.all([
  fetch("data/bibliotheca-graeca-latina-I-bce-I-ce.json"),
  fetch("data/bibliotheca-testimonia-verified.json?v=20261103-codices1").then(r=>r.ok?r.json():{records:[],editions:[]}).catch(()=>({records:[],editions:[]}))
 ]);
 if(!res.ok)throw Error("HTTP "+res.status);
 witnessData=reference;
 works=((await res.json()).works||[]).filter(w=>w&&w.id&&w.title&&(w.language==="la"||w.language==="grc"));
 const map=new Map(works.map(w=>[w.id,w]));
 for(const record of (witnessData.records||[]))for(const id of record.workIds||[]){
  const w=map.get(id);if(w)(w.witnessRecords??=[]).push(record);
 }
 for(const edition of witnessData.editions||[]){const w=map.get(edition.workId);if(w)(w.historicEditions??=[]).push(edition)}
 const n=$("classic-witness-count");if(n)n.textContent=(witnessData.records||[]).length+" testimonios codicológicos individualizados";const genres=[...new Set(works.map(x=>x.genre))].sort((a,b)=>a.localeCompare(b,"es"));for(const s of genres){const o=document.createElement("option");o.textContent=o.value=s;$("classic-genre").append(o)}const availability=$("classic-availability");if(availability)availability.addEventListener("change",()=>{hideBookSuggestions();render()});
 const period=$("classic-period");if(period)period.addEventListener("change",()=>{hideBookSuggestions();render()});
 const clear=$("classic-clear");if(clear){const inp=$("classic-query");const sync=()=>{clear.hidden=!inp.value};inp.addEventListener("input",sync);clear.addEventListener("click",()=>{inp.value="";sync();hideBookSuggestions();render();inp.focus()});inp.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&inp.value){ev.preventDefault();inp.value="";sync();hideBookSuggestions();render()}});sync()}
 const wanted=new URLSearchParams(location.search).get("work");selected=works.find(w=>w.id===wanted)?.id||works[0]?.id||"";tab=works.find(w=>w.id===selected)?.pdf?.url?"pdf":"text";try{const saved=localStorage.getItem("vitruvius-ui-lang");if(["es","en","fr"].includes(saved))$("classic-ui-language").value=saved;}catch{}for(const name of ["classic-query","classic-language","classic-genre","classic-ui-language"])$(name).addEventListener(name==="classic-query"?"input":"change",()=>{if(name==="classic-ui-language")translateInterface();render();});translateInterface();render();initBookSuggestions();}
boot().catch(err=>{$("classic-count").textContent="No se pudo abrir el catálogo: "+err.message;});
})();