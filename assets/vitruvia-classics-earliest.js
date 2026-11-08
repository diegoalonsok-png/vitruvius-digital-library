/* Vitruvia · access to the earliest CATALOGUED surviving witness, never a claim
 * about the earliest witness in existence. Original-language readers are separate
 * from facsimiles and from later translations. No manuscript or edition is inferred.
 */
(()=>{"use strict";
const catalogURL="data/bibliotheca-graeca-latina-I-bce-I-ce.json?v=20261107";
const witnessesURL="data/bibliotheca-testimonia-verified.json?v=20261107";
const registryURL="data/classics-corpus/search-registry.json?v=20261107";
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const L=(es,en,fr)=>document.documentElement.lang==="en"?en:document.documentElement.lang==="fr"?fr:es;
const mk=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el};
const seenURL=s=>{try{const u=new URL(s,location.href);return ["http:","https:"].includes(u.protocol)?u.href:null}catch{return null}};
let task=null;
function load(){
 if(task)return task;
 const get=u=>window.VitruviaData?.json?window.VitruviaData.json(u):fetch(u).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()});
 task=Promise.all([get(catalogURL),get(witnessesURL),get(registryURL)])
  .then(([catalog,manuscripts,registry])=>({works:catalog.works||[],witnesses:manuscripts.records||[],entries:registry.entries||[]}))
  .catch(e=>{task=null;throw e});
 return task;
}
function matchingWorks(works,query){
 const q=fold(query);
 if(q.length<3)return [];
 return works.filter(w=>{
  const author=fold(w.author),title=fold(w.title),aliases=(w.aliases||[]).map(fold);
  return author===q||author.startsWith(q+" ")||title===q||aliases.includes(q)||
   (q.includes(" ")&&title.includes(q)&&q.length>=8);
 });
}
function oldest(works,witnesses){
 const ids=new Set(works.map(w=>w.id));
 return witnesses.filter(w=>(w.workIds||[]).some(id=>ids.has(id))&&w.record)
  .sort((a,b)=>(a.dateStart!=null&&Number.isFinite(Number(a.dateStart))?Number(a.dateStart):999999)-(b.dateStart!=null&&Number.isFinite(Number(b.dateStart))?Number(b.dateStart):999999));
}
function original(entry,work){
 return entry.workId===work.id&&entry.language===work.language&&
  /^(?:json-passages|html-text|structured-bilingual)$/.test(entry.format||"")&&seenURL(entry.reader||"");
}
function safeLink(parent,label,href,cls){
 const url=seenURL(href);if(!url)return null;
 const a=mk("a",cls,label);a.href=url;
 if(new URL(url).origin!==location.origin){a.target="_blank";a.rel="noopener noreferrer"}
 parent.append(a);return a;
}
function readerLink(parent,label,href,title){
 const url=seenURL(href);if(!url)return null;
 const a=safeLink(parent,label,url,"article-original-reading-cta");
 if(!a)return null;
 // Only recognized same-origin text/folio viewers can open in the modal.
 if(new URL(url).origin===location.origin&&window.VitruviaClassicsViewer?.locate(href)){
  a.addEventListener("click",ev=>{
   if(window.VitruviaClassicsViewer?.open(href,title)){ev.preventDefault()}
  });
 }
 return a;
}
function render(panel,query,rows,isCurrent){
 if(!panel||!query)return;
 // Avoid downloading the entire classical catalogue for unrelated searches.
 // Search results already contain workId when a classical work is identified.
 const candidates=Array.isArray(rows)?rows:[];
 if(!candidates.some(row=>row?.workId&&["book","passage","manuscript"].includes(row.type)))return;
 const section=mk("section","article-author-reading vitruvia-earliest-reference");
 section.hidden=true;
 section.setAttribute("aria-label",L("Testimonio clásico más antiguo catalogado","Earliest catalogued classical witness","Plus ancien témoin classique catalogué"));
 const title=panel.querySelector(".context-term");
 if(title)title.after(section);else panel.prepend(section);
 const alive=()=>isCurrent()&&section.isConnected;
 void load().then(({works,witnesses,entries})=>{
  if(!alive())return;
  // Exact work/author identifiers avoid cross-linking different ancient people.
  const matching=matchingWorks(works,query);
  if(!matching.length){section.remove();return}
  section.hidden=false;
  section.append(mk("h4","context-section-title",L("Clásicos · testimonios y lectura","Classics · witnesses and reading","Classiques · témoins et lecture")));
  section.append(mk("p","context-note",L(
   "El más antiguo es el primero fechado entre los testimonios registrados en esta biblioteca; no se presume que sea el más antiguo del mundo. Los fragmentos se identifican como tales.",
   "Oldest means the earliest dated witness recorded by this library, not necessarily the oldest worldwide; fragments are identified.",
   "Le plus ancien désigne le premier témoin daté de cette bibliothèque, non nécessairement le plus ancien au monde ; les fragments sont signalés."
  )));
  const group=mk("div","web-dossier-stack");section.append(group);
  function build(work){
   const witnessesFor=oldest([work],witnesses),first=witnessesFor[0];
   const card=mk("article","article-original-reading-card");group.append(card);
   const details=mk("div","article-original-reading-details");card.append(details);
   details.append(mk("span","article-original-reading-eyebrow",first?L("TESTIMONIO MÁS ANTIGUO REGISTRADO","EARLIEST RECORDED WITNESS","PLUS ANCIEN TÉMOIN ENREGISTRÉ"):L("OBRA CLÁSICA · SIN TESTIMONIO FECHADO EN EL REGISTRO","CLASSICAL WORK · NO DATED WITNESS RECORDED","ŒUVRE CLASSIQUE · SANS TÉMOIN DATÉ")));
   details.append(mk("strong","article-original-reading-title",work.title));
   if(first){
    details.append(mk("p","article-note",[first.title,first.shelfmark,first.date,first.library].filter(Boolean).join(" · ")));
    if(first.coverage)details.append(mk("p","article-note",String(first.coverage).slice(0,320)));
   }else{
    details.append(mk("p","article-note",L("La biblioteca no dispone de una datación fiable para un códice de esta obra. Se conserva el acceso a la ficha y al texto, cuando existe.","No reliably dated codex is registered for this work. See the record and the text where available.","Aucun codex daté avec certitude n'est enregistré. La notice et le texte restent accessibles, si disponibles.")));
   }
   const actions=mk("div","article-original-reading-actions");card.append(actions);
   if(first){
    const local=first.localViewer&&seenURL(first.localViewer);
    if(local)readerLink(actions,L("Abrir visor del códice","Open codex viewer","Ouvrir le visualiseur du codex"),first.localViewer,first.title);
    if(first.viewer&&first.viewer!==first.localViewer)safeLink(actions,L("Visor de la institución","Institutional viewer","Visionneuse institutionnelle"),first.viewer,"article-original-reading-record");
    safeLink(actions,L("Ficha del manuscrito","Manuscript record","Notice du manuscrit"),first.record,"article-original-reading-record");
   }
   // Prefer a registered, locally searchable original; PDF/translation are not
   // silently substituted for a Greek/Latin source.
   const entry=entries.find(e=>original(e,work));
   const lang=work.language==="grc"?L("griego original","original Greek","grec original"):work.language==="la"?L("latín original","original Latin","latin original"):work.language;
   if(entry)readerLink(actions,L("Leer ","Read ","Lire ")+lang+" · "+L("visor de texto","text viewer","lecteur de texte"),entry.reader,work.title);
   else if(work.reading?.url&&work.language&&seenURL(work.reading.url))
    safeLink(actions,L("Consultar texto original externo","Consult original text externally","Consulter le texte original externe"),work.reading.url,"article-original-reading-record");
   safeLink(actions,L("Ver todas las ediciones","All editions","Toutes les éditions"),
    "bibliotheca-graeca-latina.html?work="+encodeURIComponent(work.id),"article-original-reading-record");
  }
  const visible=matching.slice(0,8);
  visible.forEach(build);
  if(matching.length>visible.length){
   const more=mk("button","context-biblio-more",L("Mostrar las ","Show all ","Afficher les ")+matching.length+L(" obras"," works"," œuvres"));
   more.type="button";
   more.addEventListener("click",()=>{
    if(!alive())return;
    matching.slice(8).forEach(build);more.remove();
   });
   section.append(more);
  }
 }).catch(()=>{
  if(alive()){section.replaceChildren(mk("p","context-note",L("No fue posible consultar los testimonios y lectores; la ficha clásica sigue disponible en la biblioteca.","Witness records and readers are temporarily unavailable; use the classical catalogue.","Les notices et lecteurs sont temporairement indisponibles ; consulter le catalogue classique.")));
   safeLink(section,L("Abrir Bibliotheca Graeca et Latina","Open classical catalogue","Ouvrir la bibliothèque classique"),"bibliotheca-graeca-latina.html")}
 });
}
window.VitruviaEarliest={matchingWorks,oldest,original,render,version:"20261107-1"};
})();
