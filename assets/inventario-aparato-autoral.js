(()=>{"use strict";
const $=id=>document.getElementById(id),names={"recensio-es":"V514 · Castellano","recensio-fr":"V554 · Francés","theory-en":"V297 · Inglés"};
const pages={"recensio-es":"documents/edicion-v514.html","recensio-fr":"documents/edicion-v554.html","theory-en":"documents/edicion-v297.html"};
let notes=[],shown=0,filtered=[];
const make=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el;};
const addStat=(parent,count,label)=>{const box=make("div","apa-stat"),n=make("strong","",count),s=make("span","",label);box.append(n,s);parent.append(box);};
const clean=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase();
function status(n){return n.mapping_status==="explicit_in_anchor"&&n.locus?"explicit_in_anchor":n.candidate_locus?"candidate":"unmapped";}
function renderMetrics(integrity,counts){
 const box=$("apa-metrics");box.replaceChildren();
 addStat(box,notes.length,"Notas extraídas de los libros (subconjunto del índice crítico)");
 for(const [id,label] of Object.entries(names))addStat(box,notes.filter(n=>n.edition===id).length,label);
 addStat(box,notes.filter(n=>status(n)==="explicit_in_anchor").length,"Notas con locus explícito en el contexto");
 addStat(box,notes.filter(n=>status(n)==="candidate").length,"Notas con locus candidato, sin certificar");
}
function renderApparatus(integrity){
 const box=$("apa-apparatus-metrics");box.replaceChildren();
 const a=integrity.apparatus||{},states=a.relations||{};
 addStat(box,a.entries??"—","Entradas del aparato total (incluye notas y otros bloques)");
 addStat(box,states["locus candidato sin verificar"]??"—","Relaciones orientativas en índice crítico");
 addStat(box,states["locus explícito"]??"—","Relaciones con locus explícito en índice crítico");
 const p=make("p","apa-status","Esas cifras describen vínculos documentales; no certifican lecturas de códices ni la equivalencia de los tres libros.");
 box.append(p);
}
function entry(n){
 const section=make("article","apa-entry");
 const h=make("h3","",names[n.edition]+" · Nota "+n.footnote_id);
 const typ=status(n),kind=typ==="explicit_in_anchor"?"Locus explícito en contexto":typ==="candidate"?"Locus candidato, pendiente de cotejo":"Sin locus asociado";
 const loc=typ==="explicit_in_anchor"?n.locus:typ==="candidate"?n.candidate_locus:null;
 const meta=make("p","meta",kind+(loc?" · "+loc:"")+" · Párrafo fuente "+(n.source_paragraph??"no indicado")+" · "+(n.source_file||"Origen por documentar"));
 const text=make("p","",n.text||"[Nota sin transcripción]");
 const details=make("details"),summary=make("summary","","Ver contexto de la nota en el documento de origen");
 details.append(summary,make("p","",n.anchor||"Contexto no recuperado"));
 const links=make("div","apa-links");const source=make("a","","Ficha de la edición");source.href=pages[n.edition]||"aparato-critico.html";links.append(source);
 if(loc){const link=make("a","",typ==="explicit_in_anchor"?"Consultar locus indicado":"Consultar locus candidato (no verificado)");link.href="aparato-critico.html?locus="+encodeURIComponent(loc);links.append(link);}
 section.append(h,meta,text,details,links);return section;
}
function update(reset=true){
 if(reset)shown=0;
 const q=clean($("apa-query").value.trim()),ed=$("apa-edition").value,li=$("apa-link").value;
 filtered=notes.filter(n=>(!ed||n.edition===ed)&&(!li||status(n)===li)&&(!q||clean([n.text,n.anchor,n.locus,n.candidate_locus,n.footnote_id].join(" ")).includes(q)));
 const top=Math.min(filtered.length,shown+25),out=$("apa-results");if(reset)out.replaceChildren();
 for(const note of filtered.slice(shown,top))out.append(entry(note));
 shown=top;$("apa-more").hidden=shown>=filtered.length;
 $("apa-status").textContent=filtered.length+" notas coincidentes; se muestran "+shown+". Los loci candidatos no están validados.";
}
async function load(path){const r=await fetch(path,{cache:"no-cache"});if(!r.ok)throw new Error(path+" HTTP "+r.status);return r.json();}
async function init(){
 try{const [n,integrity]=await Promise.all([load("data/critical-notes.json"),load("data/academic-integrity.json")]);
 if(!Array.isArray(n.entries)||!n.entries.length||!integrity.apparatus)throw new Error("Esquema incompleto");
 notes=n.entries;renderMetrics(integrity,n.counts);renderApparatus(integrity);update(true);
 }catch(e){$("apa-status").textContent="No se pudieron cargar los datos originales ("+e.message+"). No se muestran cifras estimadas.";$("apa-metrics").replaceChildren();$("apa-apparatus-metrics").textContent="Consulta el aparato crítico por locus desde el enlace superior.";}
}
for(const id of ["apa-query","apa-edition","apa-link"])$(id).addEventListener("input",()=>update(true));
$("apa-more").addEventListener("click",()=>update(false));init();
})();
