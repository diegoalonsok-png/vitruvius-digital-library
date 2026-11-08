/* Búsqueda adicional en los 30 DOCX clásicos ya extraídos.
 * No toca los textos madre, los folios ni el motor principal; los resultados
 * se muestran aparte porque la lengua y el alineamiento de DOCX no están cotejados. */
(()=>{"use strict";
const PATH="data/classics-documents/manifest.json";
const CORRESPONDENCE={
 "aristofanes-nubes":"aristophanes-clouds",
 "aristoteles-etica-nicomaquea":"aristotle-nicomachean-ethics",
 "aristoteles-poetica":"aristotle-poetics",
 "catulo-poemas":"catullus-carmina",
 "cesar-guerra-de-las-galias":"caesar-gallico",
 "ciceron-de-officiis":"cicero-officiis",
 "esquilo-agamenon":"aeschylus-oresteia",
 "euripides-medea":"euripides-medea",
 "hesiodo-teogonia":"hesiod-theogony",
 "hesiodo-trabajos-y-dias":"hesiod-works-days",
 "homero-iliada":"homer-iliad",
 "homero-odisea":"homer-odyssey",
 "horacio-odas":"horace-odes",
 "lucrecio-de-rerum-natura":"lucretius",
 "marco-aurelio-meditaciones":"marcus-aurelius-meditations",
 "ovidio-metamorfosis":"ovid",
 "pindaro-olimpicas":"pindar-olympian",
 "platon-apologia":"plato-apology",
 "platon-republica":"plato-republic",
 "plauto-anfitrion":"plautus-amphitruo",
 "seneca-epistulae-morales":"seneca-epistulae",
 "sofocles-antigona":"sophocles-antigone",
 "sofocles-edipo-rey":"sophocles-oedipus",
 "suetonio-divus-augustus":"suetonius-caesares",
 "tacito-anales":"tacitus-annales",
 "terencio-andria":"terentius-andria",
 "virgilio-bucolicas":null,
 "virgilio-eneida":"virgil-aeneid",
 "virgilio-georgicas":"virgil-georgica",
 "vitruvio-de-architectura-perseus":"vitruvius"
};
const root=document.getElementById("result");
const host=document.getElementById("classic-results");
if(!root||!host)return;
const panel=document.createElement("section");
panel.id="bibliotheca-docx-results";
panel.className="group";
panel.hidden=true;
host.after(panel);
const newEl=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const label=(es,en,fr)=>document.documentElement.lang==="en"?en:document.documentElement.lang==="fr"?fr:es;
const docCache=new Map();
let manifestTask=null,serial=0,last=null,renderCount=0;
const MANIFEST_PATH=/^data\/classics-documents\/[a-z0-9-]+\.json$/;
const SOURCE_PATH=/^documents\/clasicos\/[a-z0-9-]+\.docx$/;
const PDF_PATH=/^documents\/clasicos\/[a-z0-9-]+\.pdf$/;
function manifest(){
 if(!manifestTask)manifestTask=fetch(PATH).then(r=>{if(!r.ok)throw Error("Manifest HTTP "+r.status);return r.json()}).then(j=>{
  if(j.schema!=="vitruvia-classical-document-index-v1"||!Array.isArray(j.records)||j.records.length!==j.count)throw Error("Índice de documentos incongruente");
  for(const rec of j.records)if(!MANIFEST_PATH.test(rec.index||"")||!SOURCE_PATH.test(rec.source||"")||!rec.sha256||!Number.isInteger(rec.paragraphs)||rec.paragraphs<1||!Object.hasOwn(CORRESPONDENCE,rec.id))throw Error("Documento no validado: "+rec.id);
  return j.records;
 }).catch(e=>{manifestTask=null;throw e});
 return manifestTask;
}
function load(rec){
 if(!docCache.has(rec.index))docCache.set(rec.index,fetch(rec.index)
  .then(r=>{if(!r.ok)throw Error("Texto HTTP "+r.status);return r.json()})
  .then(j=>{
   if(j.schema!=="vitruvia-classical-docx-paragraphs-v1"||j.source!==rec.source||j.sha256!==rec.sha256||
     !Array.isArray(j.paragraphs)||j.paragraphs.length!==rec.paragraphs)throw Error("Extracción DOCX no corresponde a su original");
   return j;
  }).catch(err=>{docCache.delete(rec.index);throw err}));
 return docCache.get(rec.index);
}
function indexedText(value){
 const text=String(value||""),map=[];let normalized="",lastSpace=false;
 for(let i=0;i<text.length;){
  const code=text.codePointAt(i),ch=String.fromCodePoint(code);
  const chars=ch.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ");
  for(const part of chars){
   if(/[\p{L}\p{N}]/u.test(part)){normalized+=part;map.push(i);lastSpace=false}
   else if(!lastSpace&&normalized){normalized+=" ";map.push(i);lastSpace=true}
  }
  i+=ch.length;
 }
 return {normalized:normalized.trimEnd(),map};
}
function positions(text,query){
 const {normalized,map}=indexedText(text),key=indexedText(query).normalized;
 if(!key)return[];
 const matches=[];
 for(let at=normalized.indexOf(key);at>=0;at=normalized.indexOf(key,at+Math.max(1,key.length))){
  const end=at+key.length;
  if((at===0||normalized[at-1]===" ")&&(end===normalized.length||normalized[end]===" ")){
   const startOriginal=map[at],lastOriginal=map[end-1];
   if(startOriginal!==undefined&&lastOriginal!==undefined)
    matches.push([startOriginal,lastOriginal+(text.codePointAt(lastOriginal)>65535?2:1)]);
  }
 }
 return matches;
}
function highlighted(target,text,ranges){
 let pos=0;
 for(const [start,end] of ranges){
  if(start<pos)continue;
  target.append(document.createTextNode(text.slice(pos,start)));
  target.append(newEl("mark","",text.slice(start,end)));
  pos=end;
 }
 target.append(document.createTextNode(text.slice(pos)));
}
function show(){
 if(!last)return;
 const {matches,occurrences,examined,errors,query}=last;
 panel.replaceChildren();
 panel.hidden=false;
 const title=newEl("h3","",label("Documentos clásicos ya subidos (DOCX)","Additional uploaded classical DOCX documents","Documents classiques DOCX déposés"));
 panel.append(title);
 panel.append(newEl("p","meta",
  label("Búsqueda literal independiente: ","Independent literal-document search: ","Recherche documentaire littérale indépendante : ")+
  occurrences+" · "+matches.length+" "+label("párrafos","paragraphs","paragraphes")+" · "+
  examined+" "+label("documentos examinados","documents checked","documents examinés")+(errors?" · "+errors+" "+label("no disponibles","unavailable","indisponibles"):"")));
 panel.append(newEl("p","meta",label(
  "Son párrafos completos extraídos de DOCX ya alojados. No son variantes manuscritas ni loci cotejados; la versión lingüística y su alineamiento no están verificados. Los recuentos no se suman a la concordancia principal.",
  "Existing DOCX paragraphs; not collated manuscript variants or verified loci. Language and alignment are not certified. Counts remain separate from the main concordance.",
  "Paragraphes DOCX déjà déposés ; ni variantes manuscrites collationnées ni loci certifiés. Langue et alignement non vérifiés ; comptes séparés.")));
 const frag=document.createDocumentFragment();
 const groupBy=new Map();
 for(const hit of matches.slice(0,renderCount)){
  let group=groupBy.get(hit.record.id);
  if(!group){
   group={record:hit.record,entries:[]};groupBy.set(hit.record.id,group);
  }
  group.entries.push(hit);
 }
 for(const {record,entries} of groupBy.values()){
  const section=newEl("section","group");
  section.append(newEl("h3","",record.title||record.id.replace(/-/g," ")));
  const nav=newEl("p","meta");
  nav.append(document.createTextNode("DOCX · "+record.paragraphs+" "+label("párrafos en la fuente","source paragraphs","paragraphes dans la source")+" · "));
  const reader=newEl("a","",label("Leer texto completo","Read full text","Lire le texte complet"));
  reader.href="bibliotheca-documento.html?doc="+encodeURIComponent(record.id)+"&q="+encodeURIComponent(query);nav.append(reader,document.createTextNode(" · "));
  const source=newEl("a","",label("Abrir documento","Open document","Ouvrir le document"));source.href=record.source;nav.append(source);
  if(record.pdf&&PDF_PATH.test(record.pdf)){
   nav.append(document.createTextNode(" · "));
   const pdf=newEl("a","",label("Ver PDF","View PDF","Voir PDF"));pdf.href=record.pdf;nav.append(pdf);
  }
  section.append(nav);
  const ol=newEl("ol","hits");
  for(const hit of entries){
   const li=newEl("li","hit");
   li.append(newEl("span","locus",label("Párrafo DOCX ","DOCX paragraph ","Paragraphe DOCX ")+hit.ordinal+" · "+hit.ranges.length+" "+label("coincidencias","matches","occurrences")));
   const p=newEl("p");highlighted(p,hit.text,hit.ranges);li.append(p);ol.append(li);
  }
  section.append(ol);frag.append(section);
 }
 panel.append(frag);
 if(renderCount<matches.length){
  const more=newEl("button","more",label("Mostrar más párrafos","Show more paragraphs","Voir plus de paragraphes")+" ("+renderCount+" / "+matches.length+")");
  more.type="button";more.addEventListener("click",()=>{renderCount+=80;show()});panel.append(more);
 }
 if(!matches.length)panel.append(newEl("p","meta",label("Sin coincidencias literales en los documentos comprobados.","No literal matches in these documents.","Aucune occurrence littérale dans ces documents.")));
}
function clear(){serial++;last=null;panel.hidden=true;panel.replaceChildren()}
async function search(query,workId,isCurrent){
 const id=++serial;panel.hidden=false;panel.replaceChildren(newEl("p","meta",label("Comprobando los DOCX ya subidos…","Checking existing DOCX files…","Vérification des DOCX déposés…")));
 try{
  const explicitDocument=String(workId||"").startsWith("docx:")?String(workId).slice(5):"";
  const docs=(await manifest()).filter(rec=>explicitDocument?rec.id===explicitDocument:!workId||CORRESPONDENCE[rec.id]===workId);
  if(id!==serial||isCurrent&& !isCurrent())return;
  if(!docs.length){panel.hidden=true;return}
  root.hidden=false; // Mantener visibles los documentos existentes incluso si falla el índice principal.
  let errors=0,examined=0,occurrences=0;
  const matches=[];
  for(let offset=0;offset<docs.length;offset+=4){
   const batch=await Promise.all(docs.slice(offset,offset+4).map(async rec=>{
    try{
     const document=await load(rec),hits=[];
     for(const paragraph of document.paragraphs){
      const found=positions(paragraph.text,query);
      if(found.length)hits.push({record:rec,ordinal:paragraph.ordinal,text:paragraph.text,ranges:found});
     }
     return {rec,hits,error:false};
    }catch{return {rec,hits:[],error:true}}
   }));
   if(id!==serial||isCurrent&&!isCurrent())return;
   for(const row of batch){
    if(row.error)errors++;else examined++;
    for(const hit of row.hits){occurrences+=hit.ranges.length;matches.push(hit)}
   }
  }
  if(id!==serial||isCurrent&&!isCurrent())return;
  last={matches,occurrences,examined,errors,query};
  renderCount=80;show();
 }catch(error){
  if(id!==serial||isCurrent&&!isCurrent())return;
  panel.replaceChildren(newEl("p","meta",label("Los documentos DOCX adicionales no pudieron comprobarse.","Additional DOCX files could not be checked.","Impossible de vérifier les DOCX complémentaires.")));
 }
}
window.ClassicsUploadedDocuments={search,clear,refresh:()=>{if(last)show()},workIds:new Set(Object.values(CORRESPONDENCE).filter(Boolean)),documentIds:new Set(Object.keys(CORRESPONDENCE)),uncataloguedDocs:[{id:"virgilio-bucolicas",label:"Virgilio · Bucólicas · DOCX adicional"}]};
})();