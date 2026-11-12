/* Authorial apparatus catalogue: 811 original DOCX footnotes with explicit evidence tiers.
 * Locus and edition references are documentary metadata; a mention of Krohn/Rose/Budé
 * is NOT proof of autoptic collation or an established manuscript variant.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const names={"recensio-es":"V514 · Castellano","recensio-fr":"V554 · Francés","theory-en":"V297 · Inglés"};
const pages={"recensio-es":"documents/edicion-v514.html","recensio-fr":"documents/edicion-v554.html","theory-en":"documents/edicion-v297.html"};
const orders={"recensio-es":0,"recensio-fr":1,"theory-en":2};
/* Autoridades realmente citadas en las notas, agrupadas por la naturaleza del
   testimonio. Antes se filtraban sólo cuatro, de modo que un revisor no podía
   aislar las menciones de los manuscritos Gudianus o Selestadiensis ni las de
   los editores modernos distintos de Krohn, Rose y Budé. */
const sources=[
 {id:"codex-h",name:"H · Harleianus 2767",kind:"manuscrito",re:/\b(?:harleianus|harley|codex\s+h|c[oó]dice\s+h|ms\s*2767|hvid|h\s+ut\s+vid)\b/i},
 {id:"codex-g",name:"G · Gudianus 69",kind:"manuscrito",re:/\b(?:gudianus|gud\.|gvid)\b/i},
 {id:"codex-s",name:"S · Selestadiensis",kind:"manuscrito",re:/\b(?:selestadiensis|scletstatensis|sel\.)\b/i},
 {id:"codex-v",name:"V · Vossianus",kind:"manuscrito",re:/\b(?:vossianus|voss\.)\b/i},
 {id:"codex-vat",name:"Vaticanus",kind:"manuscrito",re:/\b(?:vaticanus|vat\.)\b/i},
 {id:"krohn",name:"Krohn 1912",kind:"edición crítica",re:/\bkrohn\b/i},
 {id:"rose",name:"Rose 1899",kind:"edición crítica",re:/\brose\b/i},
 {id:"bude",name:"Budé (Les Belles Lettres)",kind:"edición crítica",re:/\bbud[eé](?![\p{L}\p{N}])/iu},
 {id:"fleury",name:"Fleury",kind:"edición crítica",re:/\bfleury\b/i},
 {id:"callebat",name:"Callebat",kind:"edición crítica",re:/\bcallebat\b/i},
 {id:"gros",name:"Gros",kind:"edición crítica",re:/\bgros\b/i},
 {id:"soubiran",name:"Soubiran",kind:"edición crítica",re:/\bsoubiran\b/i},
 {id:"granger",name:"Granger (Loeb)",kind:"edición crítica",re:/\bgranger\b/i},
 {id:"marini",name:"Marini",kind:"edición crítica",re:/\b(?:marini|add\.\s*mar\.)\b/i},
 {id:"corso",name:"Corso",kind:"edición crítica",re:/\bcorso\b/i},
 {id:"fensterbusch",name:"Fensterbusch",kind:"edición crítica",re:/\bfensterbusch\b/i},
 {id:"morgan",name:"Morgan",kind:"edición crítica",re:/\bmorgan\b/i},
 {id:"giocondo",name:"Giocondo 1511",kind:"impresa antigua",re:/\bgiocondo\b/i},
 {id:"cesariano",name:"Cesariano 1521",kind:"impresa antigua",re:/\bcesarian[oe](?![\p{L}\p{N}])/iu},
 {id:"barbaro",name:"Barbaro 1567",kind:"impresa antigua",re:/\bbarbaro\b/i},
 {id:"urrea",name:"Urrea 1582",kind:"impresa antigua",re:/\burrea\b/i},
 {id:"perrault",name:"Perrault 1673",kind:"impresa antigua",re:/\bperrault\b/i},
 {id:"sulpizio",name:"Sulpizio 1486",kind:"impresa antigua",re:/\bsulpizio\b/i},
 {id:"philandrier",name:"Philandrier",kind:"impresa antigua",re:/\bphilandrier\b/i}
];
const numerals={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};
let notes=[],shown=0,filtered=[],knownLoci=new Set();
const make=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);return el;};
const addStat=(parent,count,label)=>{const box=make("div","apa-stat"),n=make("strong","",count),s=make("span","",label);box.append(n,s);parent.append(box);};
const clean=s=>String(s??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();

/* Search and visual highlighting share the same exact lexical rules.
   Simetría/symmetria is a documented orthographic correspondence, not a general fuzzy search. */
const searchVariants=q=>{
 const normalized=clean(q).trim();
 const forms=new Set([normalized]);
 if(["simetria","symmetria","symmetriae","symmetriam","symmetrias"].includes(normalized))
  ["simetria","symmetria","symmetriae","symmetriam","symmetrias"].forEach(v=>forms.add(v));
 return forms;
};
function matchesQuery(text,query){
 const variants=searchVariants(query);
 if(!query)return true;
 if(clean(text).includes(clean(query)))return true;
 if(variants.size===1)return false;
 return [...String(text??"").matchAll(/[\\p{L}\\p{M}]+/gu)].some(m=>variants.has(clean(m[0])));
}
function highlightQuery(el,value){
 const text=String(value??""),query=$("apa-query")?.value.trim();
 if(!query){el.textContent=text;return el;}
 const variants=searchVariants(query),tokens=[...text.matchAll(/[\\p{L}\\p{M}]+/gu)];
 let cursor=0,matched=false;
 for(const t of tokens){
  if(!variants.has(clean(t[0])))continue;
  if(t.index>cursor)el.append(document.createTextNode(text.slice(cursor,t.index)));
  const mark=document.createElement("mark");
  mark.className="apa-search-hit";
  mark.textContent=t[0];el.append(mark);
  cursor=t.index+t[0].length;matched=true;
 }
 if(!matched){el.textContent=text;return el;}
 if(cursor<text.length)el.append(document.createTextNode(text.slice(cursor)));
 return el;
}

function status(n){
 if(n.mapping_status==="explicit_in_anchor"&&n.locus)return knownLoci.size&&!knownLoci.has(n.locus)?"noncanonical":"explicit_in_anchor";
 if(n.candidate_locus)return knownLoci.size&&!knownLoci.has(n.candidate_locus)?"noncanonical":"candidate";
 return "unmapped";
}
function canonicalLocus(v){
 const raw=String(v||"").trim().replace(/^(?:vitr(?:uvius)?\.?|de\s+arch(?:itectura)?\.?)\s*/i,"");
 const m=raw.match(/^([ivx]+|\d{1,2})[.,\s]+(praef(?:atio)?|\d{1,2})(?:[.,\s]+(\d{1,2}))?$/i);
 if(!m)return null;
 const b=/^\d+$/.test(m[1])?Number(m[1]):numerals[m[1].toUpperCase()];
 if(!b||b>10)return null;
 const chapter=/^praef/i.test(m[2])?"praef":String(Number(m[2]));
 return b+"."+chapter+(m[3]?"."+Number(m[3]):"");
}
const locusOf=n=>n.mapping_status==="explicit_in_anchor"&&n.locus?n.locus:n.candidate_locus||null;
function isAtLocus(n,loc){
 const candidate=locusOf(n);if(!candidate)return false;
 const norm=canonicalLocus(candidate)||String(candidate);
 return norm===loc||norm.startsWith(loc+".");
}
function references(n){
 const txt=String(n.text||"")+" "+String(n.anchor||"");
 return sources.filter(s=>s.re.test(txt));
}
/* Rellena el selector con las autoridades que de hecho aparecen en las notas,
   agrupadas por tipo de testimonio, y anota cuántas notas cita cada una. */
function poblarAutoridades(){
 const sel=$("apa-reference");if(!sel)return;
 const cuenta=new Map();
 for(const s of sources)cuenta.set(s.id,notes.filter(n=>s.re.test(String(n.text||"")+" "+String(n.anchor||""))).length);
 const previo=sel.value;
 sel.replaceChildren(new Option("Todas las referencias",""));
 for(const kind of ["manuscrito","edición crítica","impresa antigua"]){
  const grupo=sources.filter(s=>s.kind===kind&&cuenta.get(s.id)>0);
  if(!grupo.length)continue;
  const g=document.createElement("optgroup");
  g.label=kind==="manuscrito"?"Testimonios manuscritos":kind==="edición crítica"?"Ediciones críticas modernas":"Ediciones impresas antiguas";
  for(const s of grupo)g.append(new Option(s.name+" ("+cuenta.get(s.id)+")",s.id));
  sel.append(g);
 }
 if(previo&&sources.some(s=>s.id===previo))sel.value=previo;
}
/* List all canonical Vitruvian loci, grouped by book and in numeric order. */
function populateLoci(){
 const select=$("apa-locus");if(!select)return;
 select.replaceChildren(new Option("Todos los loci (731 referencias)",""));
 const grouped=new Map();
 const sortLoci=(a,b)=>{
  const parse=v=>String(v).split(".").map((x,i)=>i===1&&x==="praef"?-1:Number(x));
  const x=parse(a),y=parse(b);
  return (x[0]-y[0])||(x[1]-y[1])||(x[2]-y[2]);
 };
 for(const loc of [...knownLoci].sort(sortLoci)){
  const book=String(loc).split(".")[0];
  if(!grouped.has(book)){const g=document.createElement("optgroup");g.label="Libro "+(Object.keys(numerals).find(k=>numerals[k]===Number(book))||book);select.append(g);grouped.set(book,g);}
  const parts=loc.split(".");
  grouped.get(book).append(new Option("Libro "+book+" · "+(parts[1]==="praef"?"Prefacio":"Capítulo "+parts[1])+" · § "+(parts[2]||"—")+"  ("+loc+")",loc));
 }
}
function renderMetrics(integrity){
 const box=$("apa-metrics");box.replaceChildren();
 addStat(box,notes.length,"Notas originales de los tres libros");
 for(const [id,label] of Object.entries(names))addStat(box,notes.filter(n=>n.edition===id).length,label);
 addStat(box,notes.filter(n=>status(n)==="explicit_in_anchor").length,"Notas con locus explícito");
 addStat(box,notes.filter(n=>status(n)==="candidate").length,"Loci candidatos sin certificar");
 addStat(box,notes.filter(n=>status(n)==="unmapped").length,"Notas sin locus propuesto");
 addStat(box,notes.filter(n=>status(n)==="noncanonical").length,"Referencias candidatas fuera de los 731 loci canónicos");
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
 const label=typ==="explicit_in_anchor"?"Locus explícito en contexto":typ==="candidate"?"Locus candidato, sin cotejar":typ==="noncanonical"?"Locus candidato NO canónico; requiere conciliación de numeración":"Sin locus atribuido";
 section.append(make("p","meta",label+(loc?" · "+loc:"")+" · Párrafo DOCX "+(n.source_paragraph??"no indicado")+" · "+(n.source_file||"Documento sin identificar")));
 const cited=references(n);
 if(cited.length){
  const line=make("p","apa-refs");line.append(make("strong","", "Referencias mencionadas (no cotejadas): "));
  for(const ref of cited)line.append(make("span","apa-ref-tag",ref.name));
  section.append(line);
 }
 section.append(highlightQuery(make("p",""),n.text||"[Nota sin transcripción]"));
 const details=make("details"),summary=make("summary","","Ver contexto de la nota en el documento");
 details.append(summary,highlightQuery(make("p",""),n.anchor||"Contexto no recuperado"));
 const links=make("div","apa-links"),source=make("a","","Ficha bibliográfica de la edición");source.href=pages[n.edition]||"aparato-critico.html";links.append(source);
 if(loc&&typ!=="noncanonical"){
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
  box.textContent="Seleccione un locus del listado para consultar las notas y comparar los pasajes. Ejemplos: I.2.1, III.1.2 o 10.praef.1 y compare notas de V514, V554 y V297. Puede filtrar menciones de Krohn, Rose, Budé o Harley sin confundirlas con variantes certificadas.";
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
 const locusInput=$("apa-locus").value.trim(),loc=locusInput?canonicalLocus(locusInput):null;
 filtered=notes.filter(n=>(!ed||n.edition===ed)&&(!level||status(n)===level)&&
  (!loc||isAtLocus(n,loc))&&(!ref||references(n).some(s=>s.id===ref))&&
  (!query||matchesQuery([n.text,n.anchor,n.locus,n.candidate_locus,n.footnote_id].join(" "),query)));
 filtered.sort((a,b)=>({
  explicit_in_anchor:0,candidate:1,noncanonical:2,unmapped:3
 })[status(a)]-({explicit_in_anchor:0,candidate:1,noncanonical:2,unmapped:3})[status(b)]||
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
  knownLoci=new Set(integrity.canonicalReferences||[]);
  populateLoci();
  const params=new URLSearchParams(location.search);
  const q=params.get("q");if(q)$("apa-query").value=q.slice(0,220);
  const locus=params.get("locus");if(locus){const requested=canonicalLocus(locus);if(requested&&knownLoci.has(requested))$("apa-locus").value=requested;}
  const ed=params.get("edition");if(ed&&names[ed])$("apa-edition").value=ed;
  const reference=params.get("ref");if(reference&&sources.some(s=>s.id===reference))$("apa-reference").value=reference;
  poblarAutoridades();
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