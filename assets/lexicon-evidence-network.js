/* Vitruvia Lexicon: evidence network presenter. Static lexical cards remain usable without JS. */
(()=>{
"use strict";
const root=document.getElementById("vitruvian-evidence-browser");
if(!root)return;
const state=document.getElementById("vitruvian-evidence-status");
const select=document.getElementById("vitruvian-evidence-term");
const output=document.getElementById("vitruvian-evidence-results");
const anchor=(href,label)=>{const a=document.createElement("a");a.href=href;a.textContent=label;return a};
const para=(label,value)=>{const p=document.createElement("p");const strong=document.createElement("strong");strong.textContent=label;p.append(strong,document.createTextNode(" "+value));return p};
async function boot(){
 try{
  const response=await fetch("data/lexicon/vitruvian-evidence-network.json",{cache:"no-store"});
  if(!response.ok)throw new Error("HTTP "+response.status);
  const data=await response.json();
  if(data.schema!=="vitruvia-lexicon-evidence-network-v1"||!Array.isArray(data.nodes)||!Array.isArray(data.edges))throw new Error("Esquema de datos desconocido");
  const byId=new Map(data.nodes.map(x=>[x.id,x]));
  select.replaceChildren();
  for(const n of data.nodes){const option=document.createElement("option");option.value=n.id;option.textContent=n.id+" · "+n.label;select.append(option)}
  function render(){
   output.replaceChildren();
   const n=byId.get(select.value);if(!n)return;
   const h=document.createElement("h3");h.textContent=n.id;output.append(h,para("Alcance:",n.label));
   if(n.greek)output.append(para("Equivalente griego en "+n.greek.locus+":",n.greek.form));
   const loc=document.createElement("p");const b=document.createElement("strong");b.textContent="Loci asociados en esta ficha: ";loc.append(b);
   n.loci.forEach((l,i)=>{if(i)loc.append(document.createTextNode(" · "));loc.append(anchor("lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(l),l));const a=(n.attestations||[]).find(x=>x.locus===l);if(a){const kind=a.relationship==="exact_form"?"forma exacta":a.relationship==="inflected_form"?"forma flexionada":"familia derivativa (otro lema)";loc.append(document.createTextNode(" ["+a.form+": "+kind+"]"))}});output.append(loc);
   const refs=document.createElement("p");refs.append(anchor(n.entryPage,"Ficha y documentación"),document.createTextNode(" · "),anchor(n.searchUrl,"Buscar en Lexicon"));output.append(refs);
   const rel=data.edges.filter(e=>e.from===n.id||e.to===n.id);
   const h4=document.createElement("h4");h4.textContent="Relaciones documentadas y editoriales ("+rel.length+")";output.append(h4);
   if(!rel.length){output.append(para("Resultado:","Sin relaciones registradas."));return}
   const list=document.createElement("ul");
   for(const e of rel){
    const target=byId.get(e.from===n.id?e.to:e.from);if(!target)continue;
    const li=document.createElement("li");
    li.append(anchor(target.entryPage,target.id),document.createTextNode(" — "+(e.evidence==="enumeration_in_editorial_text"?"Enumeración en la edición":e.evidence==="editorial_semantic_relation"?"Interpretación semántica":"Relación temática")+": "+e.note));
    if(e.locus)li.append(document.createTextNode(" (Vitr. "+e.locus+")"));
    list.append(li);
   }
   output.append(list);
  }
  select.addEventListener("change",render);
  render();root.hidden=false;state.textContent="Datos: edición V514; relaciones tipificadas. No equivale a una colación manuscrita.";
 }catch(error){state.textContent="El índice estructurado no está disponible. Las fichas y los enlaces estáticos siguen funcionando."}
}
boot();
})();