/* Apparatus auctoris: V514/V554 footnotes with original provenance. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
if(!$("ab-autor"))return;
const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const terms=["symmetria","decor","eurythmia","ordinatio","dispositio","distributio","firmitas","utilitas","venustas","fabrica","ratiocinatio","proportio","commensuratio","ichnographia","orthographia","scaenographia","entasis","triglyphus","analemma"];
const editions={"recensio-es":"V514 · castellano","recensio-fr":"V554 · francés"};
let notes=[],filtered=[],shown=0;const STEP=25;
function element(tag,text,parent,cls){const n=document.createElement(tag);if(text!==null)n.textContent=String(text);if(cls)n.className=cls;parent.append(n);return n}
for(let book=1;book<=10;book++){const opt=element("option","Libro "+book+" · prefacio",$("ab-autor-preface"));opt.value=String(book)}
for(const word of terms){const opt=element("option",word,$("ab-autor-topic"));opt.value=word}
function renderNote(note){
 const box=element("article",null,$("ab-autor-results"),"ab-autor-note");
 element("h3",(editions[note.edition]||note.edition)+" · nota "+note.footnote_id,box);
 const exact=!!note.locus,loc=note.locus||note.candidate_locus;
 element("p",exact?"Locus explícito en la fuente: "+note.locus:loc?"Locus candidato sin verificar: "+loc:"Sin locus identificado",box,"ab-autor-level");
 element("p",note.text||"Nota sin texto",box,"ab-autor-body");
 const details=element("details",null,box);
 element("summary","Procedencia y contexto original",details);
 element("p","Archivo: "+(note.source_file||"no identificado")+" · párrafo: "+(note.source_paragraph??"sin registrar")+" · estado: "+(note.mapping_status||"no registrado"),details,"ab-autor-detail");
 element("p",note.anchor||"Contexto no disponible",details,"ab-autor-detail");
 const links=element("div",null,box,"ab-autor-links");
 const pdf=element("a","Consultar libro original",links);pdf.href=note.edition==="recensio-fr"?"documents/kurilo-recensio-fr.pdf":"documents/kurilo-recensio-es.pdf";
 if(loc){const l=element("a","Abrir locus en el lector",links);l.href="apparatus-bude.html?locus="+encodeURIComponent(loc)}
}
function draw(reset){
 if(reset){shown=0;$("ab-autor-results").replaceChildren()}
 const batch=filtered.slice(shown,shown+STEP);for(const note of batch)renderNote(note);
 shown+=batch.length;$("ab-autor-more").hidden=shown>=filtered.length;
 $("ab-autor-state").textContent=filtered.length+" notas encontradas · "+shown+" visibles · se conserva la procedencia textual y el grado de asociación.";
}
function apply(){
 const locus=$("ab-autor-locus").value.trim().toLowerCase(),pre=$("ab-autor-preface").value,term=fold($("ab-autor-topic").value),ed=$("ab-autor-edition").value,status=$("ab-autor-evidence").value;
 filtered=notes.filter(n=>{
 if(ed&&n.edition!==ed)return false;
 const explicit=n.locus||"",candidate=n.candidate_locus||"",loc=explicit||candidate;
 if(locus&&loc!==locus)return false;
 if(pre&&!loc.startsWith(pre+".praef."))return false;
 if(status==="explicit"&&!explicit)return false;
 if(status==="candidate"&&(!candidate||explicit))return false;
 if(status==="unmapped"&&(explicit||candidate))return false;
 if(term){const full=fold((n.text||"")+" "+(n.anchor||""));const pattern=new RegExp("(^|[^a-z])"+term+"([^a-z]|$)");if(!pattern.test(full))return false}
 return true;
 });
 draw(true);
}
for(const id of ["ab-autor-locus","ab-autor-preface","ab-autor-topic","ab-autor-edition","ab-autor-evidence"])$(id).addEventListener(id==="ab-autor-locus"?"input":"change",apply);
$("ab-autor-more").addEventListener("click",()=>draw(false));
$("ab-autor-clear").addEventListener("click",()=>{for(const id of ["ab-autor-locus","ab-autor-preface","ab-autor-topic","ab-autor-edition","ab-autor-evidence"])$(id).value="";apply()});
fetch("data/critical-notes.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(data=>{if(!Array.isArray(data.entries))throw Error("Formato inesperado");notes=data.entries.filter(n=>n.edition==="recensio-es"||n.edition==="recensio-fr");const requested=new URLSearchParams(location.search).get("locus");if(requested)$("ab-autor-locus").value=requested;apply()}).catch(e=>{$("ab-autor-state").textContent="No fue posible recuperar las notas: "+e.message});
})();