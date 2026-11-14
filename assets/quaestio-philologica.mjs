import {EDITIONS,localURN,permanentLocusUrl,normalized,bibliographicCitation,bibtex,ris} from "./philological-core.mjs";
const $=id=>document.getElementById(id);
const escHtml=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let corpus=[],catalog={},results=[],displayed=0,loaded=false;const PAGE=25;
function node(tag,text,parent,cls){const e=document.createElement(tag);if(text!=null)e.textContent=String(text);if(cls)e.className=cls;if(parent)parent.append(e);return e}
async function get(path){const r=await fetch(path,{headers:{Accept:"application/json"}});if(!r.ok)throw Error(path+" HTTP "+r.status);return r.json()}
function status(s){$("q-status").textContent=s}
function previewText(p,query,scope){
 const base=scope==="translation"?p.translation:scope==="both"?p.latin+"\n"+p.translation:p.latin;
 const text=String(base||"");const at=normalized(text).indexOf(normalized(query));
 const from=at>170?at-125:0;
 return (from?"…":"")+text.slice(from,from+690)+(from+690<text.length?"…":"");
}
function mark(parent,body,q){
 const norm=normalized(body),query=normalized(q);if(!query)return parent.append(document.createTextNode(body));
 let at=0,pos;while((pos=norm.indexOf(query,at))>=0){
  parent.append(document.createTextNode(body.slice(at,pos)));
  const m=node("mark",body.slice(pos,pos+q.length),parent);at=pos+q.length;if(!q.length)break
 }
 parent.append(document.createTextNode(body.slice(at)));
}
function copy(text,button){if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(()=>{button.textContent="Copiado";button.setAttribute("aria-label","Copiado al portapapeles")}).catch(()=>{button.textContent="No se pudo copiar"})}else{button.textContent="Portapapeles no disponible"}}
function download(text,name,mime){const b=new Blob([text],{type:mime});const url=URL.createObjectURL(b),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function renderMore(){
 for(const p of results.slice(displayed,displayed+PAGE)){
  const box=node("article",null,$("q-hits"),"q-hit");const meta=catalog[p.edition]||{};
  node("h3","Vitr. "+p.locus+" · "+EDITIONS[p.edition].version,box);
  node("p",(p.edition==="recensio-es"?"Castellano":p.edition==="recensio-fr"?"Français":"English")+" · "+localURN(p.edition,p.locus),box,"metadata");
  mark(node("p",null,box,"excerpt"),previewText(p,$("q-term").value.trim(),$("q-scope").value),$("q-term").value.trim());
  const actions=node("div",null,box,"q-actions");
  const link=node("a","Leer locus, notas y exportar TEI",actions);link.href=permanentLocusUrl(p.locus,p.edition)||"lector-bilingue.html";
  const cite=bibliographicCitation(p.edition,meta,p.locus);
  for(const label of ["Copiar Chicago 18","RIS","BibTeX"]){
   const btn=node("button",label,actions);btn.type="button";
   btn.addEventListener("click",()=>{
    if(label==="Copiar Chicago 18")copy(cite,btn);
    else if(label==="RIS")download(ris(p.edition,meta),EDITIONS[p.edition].version+"-"+p.locus+".ris","application/x-research-info-systems");
    else download(bibtex(p.edition,meta),EDITIONS[p.edition].version+"-"+p.locus+".bib","application/x-bibtex");
   });
  }
 }
 displayed=Math.min(results.length,displayed+PAGE);$("q-more").hidden=displayed>=results.length;
 status(results.length+" resultados; "+displayed+" visibles. Coincidencias documentales de las ediciones seleccionadas.");
}
function run(shouldScroll=true){
 if(!loaded){status("Los textos aún se están cargando; se ejecutará la búsqueda al terminar.");return}
 const q=$("q-term").value.trim(),edition=$("q-edition").value,scope=$("q-scope").value,mode=$("q-mode").value;
 if(!q){status("Escribí una palabra o expresión.");return}
 const terms=normalized(q).split(/\s+/).filter(Boolean);
 results=corpus.filter(p=>{
  if(edition&&p.edition!==edition)return false;
  const t=scope==="latin"?p.latin:scope==="translation"?p.translation:p.latin+"\n"+p.translation;
  const body=normalized(t);
  return mode==="all-words"?terms.every(v=>body.includes(v)):body.includes(normalized(q));
 });
 $("q-hits").replaceChildren();displayed=0;
 if(results.length)renderMore();else{status("Sin coincidencias. Probá otras formas de la palabra; la búsqueda actual no es lematizada.")}
 if(shouldScroll){$("q-status").scrollIntoView({behavior:"smooth",block:"start"});$("q-status").focus({preventScroll:true})}
}
$("q-form").addEventListener("submit",e=>{e.preventDefault();run()});
$("q-more").addEventListener("click",renderMore);
(async()=>{
 try{
  const [cat,...volumes]=await Promise.all([get("data/catalog.json"),...Object.keys(EDITIONS).map(e=>get("data/structured/"+e+".json"))]);
  for(const x of cat.editions||[])if(EDITIONS[x.id])catalog[x.id]=x;
  volumes.forEach((vol,i)=>{const id=Object.keys(EDITIONS)[i];for(const p of vol.passages||[])if(p.locus&&(p.latin||p.translation))corpus.push({edition:id,locus:p.locus,latin:p.latin||"",translation:p.translation||""})});
  loaded=true;status(corpus.length+" loci de las ediciones cargados. Introducí un término y presioná Buscar.");
  const url=new URLSearchParams(location.search);if(url.has("q")){$("q-term").value=url.get("q").slice(0,150);run(false)}
 }catch(e){status("No se pudieron cargar los textos. "+e.message);console.error(e)}
})();