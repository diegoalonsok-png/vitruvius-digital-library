/* Locus-aware scholarly references; bibliographic identifiers from data/catalog.json. */
(()=>{"use strict";const root=document.getElementById("vdl-apparatus-cite");if(!root)return;
const ids=["recensio-es","recensio-fr","theory-en"];
const make=(tag,text,parent)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(parent)parent.append(e);return e};
async function init(){try{
const r=await fetch("data/catalog.json");if(!r.ok)throw Error("Catálogo no disponible");
const data=await r.json(),books=ids.map(id=>data.editions.find(b=>b.id===id));if(books.some(b=>!b))throw Error("Metadatos incompletos");
root.replaceChildren();root.className="vdl-editions";make("h2","Identificación bibliográfica y citas",root);
make("p","Fundamento textual declarado: las ediciones Kurilo V514 (castellano), V554 (francés) y V297 (inglés) toman como referencia latina principal a Fritz Krohn (1912) y, parcialmente, a Valentin Rose (1899). Las traducciones, comentarios, notas y decisiones editoriales son de Diego Kurilo. Esta filiación editorial no prueba identidad textual absoluta ni cotejo paleográfico directo.",root);
const ul=make("ol",undefined,root);
for(const b of books){const li=make("li",undefined,ul);make("strong",b.version+" · ",li);make("span",(b.bibliographic_author||"Diego Kurilo")+". "+(b.bibliographic_title||b.title)+". "+(b.edition_statement||"")+". "+(b.publication_place||"")+": "+(b.publisher||"")+", "+(b.year||"")+". ",li);if(b.doi){const a=make("a","DOI "+b.doi,li);a.href="https://doi.org/"+b.doi;a.rel="noopener noreferrer";a.target="_blank"}make("span"," · ISBN "+(b.isbn||"no registrado")+(b.isbn_status==="publisher-declared-shared"?" (editorial compartido; verificar asignación)":"") ,li)}
const bar=make("div",undefined,root);bar.style.cssText="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:15px 0";
const selector=make("select",undefined,bar),fmt=make("select",undefined,bar);
selector.setAttribute("aria-label","Edición para citar");fmt.setAttribute("aria-label","Estilo de cita");
for(const b of books){const o=make("option",b.version+" · "+b.bibliographic_title,selector);o.value=b.id}
for(const [id,label] of [["chicago","Chicago"],["apa","APA"],["bibtex","BibTeX"]]){const o=make("option",label,fmt);o.value=id}
const btn=make("button","Citar este locus",bar);btn.type="button";btn.style.cssText="cursor:pointer;padding:10px 14px;border:1px solid #a38c63;border-radius:5px;background:transparent;color:inherit";
const output=make("textarea",undefined,root);output.readOnly=true;output.rows=4;output.style.cssText="width:100%;box-sizing:border-box;font:13px/1.5 system-ui;padding:10px;background:transparent;color:inherit;border:1px solid #aaa";
const status=make("p","",root);status.setAttribute("role","status");
const getLocus=()=>{const fromURL=new URLSearchParams(location.search).get("locus");return fromURL||document.getElementById("bude-locus")?.value||document.getElementById("locus")?.value||"1.1.1"};
function refresh(){const b=books.find(b=>b.id===selector.value)||books[0],l=getLocus(),u=new URL(location.href);u.search="";u.hash="";u.searchParams.set("locus",l);
const title=b.bibliographic_title||b.title,author=b.bibliographic_author||"Kurilo, Diego",doi=b.doi?"https://doi.org/"+b.doi:"",publisher=b.publisher||"",year=b.year||"s. f.";
if(fmt.value==="bibtex")output.value="@book{Kurilo"+b.version+",\n author={"+author+"},\n title={"+title+"},\n year={"+year+"},\n publisher={"+publisher+"},\n doi={"+(b.doi||"")+"},\n isbn={"+(b.isbn_status==="publisher-declared-shared"?"":(b.isbn||""))+"},\n url={"+u.href+"},\n note={De architectura, locus "+l+"; ISBN compartido no verificado individualmente}\n}";
else if(fmt.value==="apa")output.value=author+" ("+year+"). "+title+" ("+b.version+"). "+publisher+". "+doi+" [Locus "+l+"; aparato: "+u.href+"]";
else output.value=author+". "+title+". "+(b.edition_statement||"")+". "+(b.publication_place||"")+": "+publisher+", "+year+". "+doi+". Vitruvio, De architectura "+l+". Aparato crítico: "+u.href+" (consulta: "+new Date().toISOString().slice(0,10)+").";
}
selector.addEventListener("change",refresh);fmt.addEventListener("change",refresh);window.addEventListener("popstate",refresh);document.addEventListener("click",e=>{if(e.target.closest?.("#bude-go,#bude-prev,#bude-next,#pick-go,#ab-consult-button,#prev,#next"))setTimeout(refresh,150)});
btn.addEventListener("click",async()=>{refresh();try{await navigator.clipboard.writeText(output.value);status.textContent="Cita copiada."}catch{output.select();status.textContent="Referencia seleccionada para copiar manualmente."}});refresh();
}catch(e){root.textContent="No se pudo cargar la identificación bibliográfica: "+e.message;}}init();
})();