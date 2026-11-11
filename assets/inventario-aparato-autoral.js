/* Authorial apparatus catalogue: 811 original DOCX footnotes with explicit evidence tiers.
 * Locus and edition references are documentary metadata; a mention of Krohn/Rose/Budé
 * is NOT proof of autoptic collation or an established manuscript variant.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const names={"recensio-es":"V514 · Castellano","recensio-fr":"V554 · Francés","theory-en":"V297 · Inglés"};
const pages={"recensio-es":"documents/edicion-v514.html","recensio-fr":"documents/edicion-v554.html","theory-en":"documents/edicion-v297.html"};
const orders={"recensio-es":0,"recensio-fr":1,"theory-en":2};
const sources=[
 {id:"krohn",name:"Krohn",re:/\bkrohn\b/i},
 {id:"rose",name:"Rose",re:/\brose\b/i},
 {id:"bude",name:"Budé",re:/\bbud[eé]\b/i},
 {id:"codex-h",name:"Codex H / Harley",re:/\b(?:harleianus|harley|codex\s+h|c[oó]dice\s+h|ms\s+2767)\b/i}
];
const numerals={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};
let notes=[],shown=0,filtered=[];
const make=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el;};
const addStat=(parent,count,label)=>{const box=make("div","apa-stat"),n=make("strong","",count),s=make("span","",label);box.append(n,s);parent.append(box);};
const clean=s=>String(s??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
function status(n){return n.mapping_status==="explicit_in_anchor"&&n.locus?"explicit_in_anchor":n.candidate_locus?"candidate":"unmapped";}
function canonicalLocus(v){
 const raw=String(v||"").trim().replace(/^(?:vitr(?:uvius)?\.?|de\s+arch(?:itectura)?\.?)\s*/i,"");
 const m=raw.match(/^([ivx]+|\d{1,2})[.,\s]+(praef(?:atio)?|\d{1,2})(?:[.,\s]+(\d{1,2}))?$/i);
 if(!m)return null;
 const b=/^\d+$/.test(m[1])?Number(m[1]):numerals[m[1].toUpperCase()];
 if(!b||b>10)return null;
 const chapter=/^praef/i.test(m[2])?"praef":String(Number(m[2]));
 return b+"."+chapter+(m[3]?"."+Number(m[3]):"");
}
const locusOf=n=>status(n)==="explicit_in_anchor"?n.locus:status(n)==="candidate"?n.candidate_locus:null;
function isAtLocus(n,loc){
 const candidate=locusOf(n);if(!candidate)return false;
 const norm=canonicalLocus(candidate)||String(candidate);
 return norm===loc||norm.startsWith(loc+".");
}
function references(n){
 const txt=String(n.text||"")+" "+String(n.anchor||"");
 return sources.filter(s=>s.re.test(txt));
}
function renderMetrics(integrity){
 const box=$("apa-metrics");box.replaceChildren();
 addStat(box,notes.length,"Notas originales de los tres libros");
 for(const [id,label] of Object.entries(names))addStat(box,notes.filter(n=>n.edition===id).length,label);
 addStat(box,notes.filter(n=>status(n)==="explicit_in_anchor").length,"Notas con locus explícito");
 addStat(box,notes.filter(n=>status(n)==="candidate").length,"Loci candidatos sin certificar");
 addStat(box,notes.filter(n=>status(n)==="unmapped").length,"Notas sin locus propuesto");
}
function renderApparatus(integrity){
 const box=$("apa-apparatus-metrics");box.replaceChildren();
 const a=integrity.apparatus||{},states=a.relations||{};
 addStat(box,a.entries??"—","Registros del índice crítico completo, incluidos otros bloques");
 addStat(box,states["mención explícita en el encabezado"]??"—","Bloques con locus en encabezado");
 addStat(box,states["contexto de página"]??"—","Relaciones por contexto de página");
 const p=make("p","apa-status","Las menciones y relaciones por página son evidencia documental, no certificación de lectura manuscrita.");
 box.append(p);
}
function entry(n){
 const section=make("article","apa-entry"),typ=status(n),loc=locusOf(n);
 section.append(make("h3","",(names[n.edition]||n.edition)+" · Nota "+n.footnote_id));
 const label=typ==="explicit_in_anchor"?"Locus explícito en contexto":typ==="candidate"?"Locus candidato, sin cotejar":"Sin locus atribuido";
 section.append(make("p","meta",label+(loc?" · "+loc:"")+" · Párrafo DOCX "+(n.source_paragraph??"no indicado")+" · "+(n.source_file||"Documento sin identificar")));
 const cited=references(n);
 if(cited.length){
  const line=make("p","apa-refs");line.append(make("strong","", "Referencias mencionadas (no cotejadas): "));
  for(const ref of cited)line.append(make("span","apa-ref-tag",ref.name));
  section.append(line);
 }
 section.append(make("p","",n.text||"[Nota sin transcripción]"));
 const details=make("details"),summary=make("summary","","Ver contexto de la nota en el documento");
 details.append(summary,make("p","",n.anchor||"Contexto no recuperado"));
 const links=make("div","apa-links"),source=make("a","","Ficha bibliográfica de la edición");source.href=pages[n.edition]||"aparato-critico.html";links.append(source);
 if(loc){
  const critical=make("a","",typ==="explicit_in_anchor"?"Consultar este locus":"Revisar este locus candidato");
  critical.href="aparato-critico.html?locus="+encodeURIComponent(loc);links.append(critical);
  const reader=make("a","","Leer pasaje latino y traducción");
  reader.href="lector-bilingue.html?"+new URLSearchParams({edition:n.edition,locus:loc});links.append(reader);
 }
 section.append(details,links);return section;
}
function renderLocusSummary(loc,filtered){
 const box=$("apa-locus-summary");box.replaceChildren();
 if(!loc){
  box.textContent="Buscá por locus (I.2.1, III.1.2 o 10.praef.1) y compará notas de V514, V554 y V297. Podés filtrar menciones de Krohn, Rose, Budé o Harley sin confundirlas con variantes certificadas.";
  return;
 }
 const explicit=filtered.filter(n=>status(n)==="explicit_in_anchor").length;
 const candidates=filtered.filter(n=>status(n)==="candidate").length;
 box.append(make("strong","", "Vitr. "+loc+" · "+filtered.length+" notas filtradas"));
 box.append(make("p","",explicit+" con locus explícito; "+candidates+" con locus candidato. El registro aún necesita verificación ecdótica."));
 for(const id of Object.keys(names)){
  const count=filtered.filter(n=>n.edition===id).length;
  box.append(make("span","apa-ref-tag",names[id]+": "+count));
 }
 const compare=make("a","","Comparar texto latino y traducciones →");
 compare.href="aparato-critico.html?locus="+encodeURIComponent(loc);
 box.append(compare);
 const lexical=make("a","","Abrir pasaje en Lexicón →");
 lexical.href="vitruvia-lexicon.html?"+new URLSearchParams({q:loc,mode:"frase",lang:"la"});
 box.append(lexical);
}
function update(reset=true){
 if(reset)shown=0;
 const query=clean($("apa-query").value.trim()),ed=$("apa-edition").value,level=$("apa-link").value,ref=$("apa-reference").value;
 const locusInput=$("apa-locus").value.trim(),loc=canonicalLocus(locusInput);
 filtered=notes.filter(n=>(!ed||n.edition===ed)&&(!level||status(n)===level)&&
  (!loc||isAtLocus(n,loc))&&(!ref||references(n).some(s=>s.id===ref))&&
  (!query||clean([n.text,n.anchor,n.locus,n.candidate_locus,n.footnote_id].join(" ")).includes(query)));
 filtered.sort((a,b)=>({
  explicit_in_anchor:0,candidate:1,unmapped:2
 })[status(a)]-({explicit_in_anchor:0,candidate:1,unmapped:2})[status(b)]||
  (orders[a.edition]??3)-(orders[b.edition]??3)||
  (Number(a.footnote_id)||0)-(Number(b.footnote_id)||0));
 renderLocusSummary(loc,filtered);
 const top=Math.min(filtered.length,shown+25),out=$("apa-results");if(reset)out.replaceChildren();
 for(const n of filtered.slice(shown,top))out.append(entry(n));
 shown=top;$("apa-more").hidden=shown>=filtered.length;
 $("apa-status").textContent=filtered.length+" notas coincidentes; se muestran "+shown+
  (locusInput&&!loc?". No se reconoció el formato de locus: use I.2.1 o 3.praef.2.":"")+
  ". Los loci candidatos son orientativos, no lecturas certificadas.";
}
async function load(path){
 const r=await fetch(path);
 if(!r.ok)throw Error(path+" HTTP "+r.status);
 return r.json();
}
async function init(){
 try{
  const [raw,integrity]=await Promise.all([load("data/critical-notes.json"),load("data/academic-integrity.json")]);
  if(!Array.isArray(raw.entries)||!raw.entries.length||!integrity.apparatus)throw Error("Esquema incompleto");
  notes=raw.entries;
  const params=new URLSearchParams(location.search);
  const q=params.get("q");if(q)$("apa-query").value=q.slice(0,220);
  const locus=params.get("locus");if(locus)$("apa-locus").value=locus.slice(0,40);
  const ed=params.get("edition");if(ed&&names[ed])$("apa-edition").value=ed;
  const reference=params.get("ref");if(reference&&sources.some(s=>s.id===reference))$("apa-reference").value=reference;
  renderMetrics(integrity);renderApparatus(integrity);update(true);
 }catch(e){
  $("apa-status").textContent="No se pudieron cargar las notas originales ("+e.message+"). No se muestran cifras inventadas.";
  $("apa-metrics").replaceChildren();
  $("apa-apparatus-metrics").textContent="Consultar el aparato crítico por locus desde el enlace superior.";
 }
}
for(const id of ["apa-query","apa-locus","apa-edition","apa-link","apa-reference"])
 $(id).addEventListener("input",()=>{if(notes.length)update(true)});
$("apa-more").addEventListener("click",()=>update(false));
init();
})();