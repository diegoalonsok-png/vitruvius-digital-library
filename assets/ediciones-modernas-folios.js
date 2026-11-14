(()=>{"use strict";
const $=id=>document.getElementById(id),R2="https://libros.vitruvius-digital-library.org";
const editions={
 rose:{slug:"rose-1899",citation:"Valentin Rose, Vitruvii De architectura libri decem, Leipzig: Teubner, 1899 (2.ª edición).",holding:"Facsímil digital consultable en Internet Archive; verificar la institución y signatura del ejemplar antes de atribuirlas.",rights:"La edición impresa histórica y la digitalización tienen atribuciones distintas; consultar la ficha de origen.",url:"https://archive.org/details/vitruviidearchi00pollgoog",embed:"https://archive.org/embed/vitruviidearchi00pollgoog"},
 krohn:{slug:"krohn-1912",citation:"Fritz Krohn, Vitruvii De architectura libri decem, Leipzig: Teubner, 1912.",holding:"PDF local de Vitruvius Digital Library; institución conservadora de la copia por verificar.",rights:"La digitalización no se atribuye a una institución no identificada.",url:"documents/krohn-1912.pdf",embed:"documents/krohn-1912.pdf#view=FitH"}
};
const q=new URLSearchParams(location.search);
const state={id:q.get("obra")==="krohn-1912"?"krohn":"rose",folios:null,page:Math.max(1,parseInt(q.get("imagen"),10)||1),inverted:false,contrast:100,brightness:100,shown:0,zoom:1};
const element=(tag,txt,cls)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x};
const manifestOK=(m,key)=>m?.schema==="vdl-folios-obra-1"&&m.obra===key&&Array.isArray(m.folios)&&m.folios.length>0&&m.imagenes===m.folios.length&&m.folios.every((f,i)=>f.imagenDigital===i+1&&typeof f.imagen==="string"&&f.imagen.startsWith(R2+"/folios/"+key+"/"));
function synchronize(){const u=new URL(location.href);u.searchParams.set("obra",editions[state.id].slug);if(state.folios)u.searchParams.set("imagen",String(state.page));else u.searchParams.delete("imagen");history.replaceState(null,"",u)}
function filter(){document.documentElement.style.setProperty("--folio-filter",`invert(${state.inverted?1:0}) contrast(${state.contrast}%) brightness(${state.brightness}%)`);$("invert").setAttribute("aria-pressed",String(state.inverted))}
function openZoom(f){state.zoom=1;$("zoom-img").src=f.imagen;$("zoom-img").alt="Imagen digital "+f.imagenDigital;$("zoom-title").textContent="Imagen digital "+f.imagenDigital;$("zoom-stage").style.setProperty("--zoom","1");$("zoom-dialog").showModal()}
function one(n){const f=state.folios[n-1];const article=element("article",undefined,"page");
 if(!f){article.append(element("h2","Fin de la secuencia"));return article}
 const label=f.folio?"Folio "+f.folio:f.paginaImpresa?"Página impresa "+f.paginaImpresa:"Imagen digital "+f.imagenDigital;
 article.append(element("h2",label));
 const button=element("button");button.type="button";button.setAttribute("aria-label","Ampliar "+label);
 const img=element("img");img.src=f.imagen;img.alt="Facsímil "+editions[state.id].citation+" · "+label;img.loading="lazy";img.onerror=()=>{button.replaceChildren(element("span","Imagen no disponible. Consultar la fuente."))};
 button.append(img);button.addEventListener("click",()=>openZoom(f));article.append(button);
 article.append(element("p","La imagen digital no equivale automáticamente a la página impresa ni a un folio manuscrito."));return article}
function gallery(){const box=$("gallery");box.replaceChildren();if(!state.folios)return;
 const term=$("find").value.trim();const indices=state.folios.map((f,i)=>i+1).filter(i=>!term||String(i).includes(term)||String(state.folios[i-1].folio||"").includes(term));
 const portion=indices.slice(0,state.shown+48);
 for(const i of portion){const f=state.folios[i-1],b=element("button",undefined,"thumb");b.type="button";b.setAttribute("aria-current",String(i===state.page));const img=element("img");img.src=f.miniatura||f.imagen;img.loading="lazy";img.alt="Miniatura de imagen digital "+i;b.append(img,element("small",String(f.folio?"f. "+f.folio:"Imagen "+i)));b.onclick=()=>navigate(i);box.append(b)}
 state.shown=portion.length;$("more").hidden=state.shown>=indices.length}
function render(){if(!state.folios)return;const total=state.folios.length;state.page=Math.max(1,Math.min(state.page,total));
 $("number").max=total;$("number").value=state.page;$("previous").disabled=state.page<=1;$("next").disabled=state.page>=total;
 $("spread").replaceChildren(one(state.page),one(state.page+1));
 $("status").textContent="Imágenes individuales publicadas en R2: "+total+". Viendo "+state.page+(state.page<total?" y "+(state.page+1):"")+".";
 gallery();synchronize()}
function navigate(n){state.page=Math.max(1,Math.min(state.folios?.length||1,Number(n)||1));render()}
async function load(id){state.id=id;state.folios=null;state.shown=0;state.page=1;
 const ed=editions[id];$("rose").setAttribute("aria-pressed",String(id==="rose"));$("krohn").setAttribute("aria-pressed",String(id==="krohn"));
 $("citation").textContent=ed.citation;$("holding").textContent=ed.holding;$("licence").textContent=ed.rights;
 $("original").href=ed.url;$("pdf").src=ed.embed;
 $("spread").hidden=true;$("fallback").hidden=false;$("gallery").replaceChildren();$("gallery-heading").hidden=true;$("more").hidden=true;
 $("status").textContent="Comprobando índice de imágenes digitales de "+ed.slug+"…";synchronize();
 try{const res=await fetch(R2+"/folios/"+ed.slug+"/indice-folios.json",{cache:"no-cache"});
 if(!res.ok)throw Error("HTTP "+res.status);const m=await res.json();
 if(!manifestOK(m,ed.slug))throw Error("índice incompleto o incompatible");
 state.folios=m.folios;$("fallback").hidden=true;$("spread").hidden=false;$("gallery-heading").hidden=false;
 state.page=Math.max(1,Math.min(state.folios.length,parseInt(q.get("imagen"),10)||1));render()
 }catch(e){$("status").textContent="Aún no se verificó la colección de imágenes en R2 ("+e.message+"). Disponible el facsímil de origen; no se inventa la foliación."}}
$("rose").onclick=()=>load("rose");$("krohn").onclick=()=>load("krohn");
$("previous").onclick=()=>navigate(state.page-2);$("next").onclick=()=>navigate(state.page+2);$("go").onclick=()=>navigate($("number").value);
$("find").oninput=()=>{state.shown=0;gallery()};$("more").onclick=()=>gallery();
$("invert").onclick=()=>{state.inverted=!state.inverted;filter()};
$("contrast").oninput=e=>{state.contrast=Number(e.target.value);filter()};
$("brightness").oninput=e=>{state.brightness=Number(e.target.value);filter()};
$("zoom-close").onclick=()=>$("zoom-dialog").close();
$("zoom-in").onclick=()=>{$("zoom-stage").style.setProperty("--zoom",String(state.zoom=Math.min(4,state.zoom+.25)))};
$("zoom-out").onclick=()=>{$("zoom-stage").style.setProperty("--zoom",String(state.zoom=Math.max(.5,state.zoom-.25)))};
$("zoom-fit").onclick=()=>{$("zoom-stage").style.setProperty("--zoom",String(state.zoom=1))};
$("zoom-dialog").addEventListener("click",e=>{if(e.target===$("zoom-dialog"))$("zoom-dialog").close()});
filter();load(state.id);
})();