/* Read the preserved R2 scan, using that same scan's page-to-locus index.
   OCR remains an optional finding aid, never the displayed historical reading. */
(()=>{"use strict";
const mount=document.getElementById("coll-facsimile-readers");
if(!mount)return;
const E=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/v/g,"u").replace(/j/g,"i");
const editions=[
 {id:"rose-1899",label:"Rose · 1899",editor:"Valentin Rose · Teubner, Leipzig, 2.ª ed."},
 {id:"krohn-1912",label:"Krohn · 1912",editor:"F. Krohn · Teubner, Leipzig"}
];
const meaningful=new Set(["symmetria","symmetriae","eurythmia","decor","dispositio","ordinatio","distributio","firmitas","utilitas","venustas","architectura","proportio","proportione","modulus","moduli","ratio","ratiocinatio","fabrica","aedificium","aedificia","templa","columna","columnae","scaena","atrium","peristylum","ichnographia","orthographia","scaenographia"]);
const blocks=new Map();let loci={},current=new URLSearchParams(location.search).get("locus")||"1.1.1";
const base=id=>"https://libros.vitruvius-digital-library.org/folios/"+id+"/";
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error("HTTP "+r.status);return r.json()}
async function either(local,remote){try{return await json(local)}catch{return json(remote)}}
const label=x=>{const p=String(x).split(".");const roman=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];return (roman[Number(p[0])]||p[0])+"."+p.slice(1).join(".")};
const style=E("style");style.textContent=`
#coll-facsimile-readers{margin:28px 0 34px;border-top:1px solid #505055;padding-top:18px}
.coll-facsimile-heading{font:400 24px/1.3 Georgia,serif;margin:0 0 8px}
.coll-facsimile-intro{font:12px/1.65 Arial,sans-serif;color:#bcbcc2;margin:0 0 16px;max-width:100ch}
.coll-facsimile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:14px}
.coll-facsimile-card{min-width:0;border:1px solid #45454a;border-radius:12px;background:#18181a;overflow:hidden}
.coll-facsimile-card header{padding:14px 16px;border-bottom:1px solid #343438}
.coll-facsimile-card h3{font:500 16px/1.45 Georgia,serif;margin:0 0 5px;color:#eee}
.coll-facsimile-card .citation{font:11px/1.6 Arial,sans-serif;color:#bfc0c4;margin:2px 0}
.coll-facsimile-controls{display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:10px 12px}
.coll-facsimile-controls :is(button,input,a){font:12px Arial,sans-serif;border:1px solid #68686c;background:#27272a;color:#f2f2f1;border-radius:6px;padding:8px;text-decoration:none}
.coll-facsimile-controls input[type=number]{width:72px}
.coll-facsimile-controls input[type=search]{flex:1;min-width:140px}
.coll-facsimile-controls button{cursor:pointer}
.coll-facsimile-frame{width:100%;height:clamp(410px,60vh,760px);border:0;background:#eeeeed;display:block}
.coll-facsimile-frame{overflow:auto;min-width:0;position:relative}
.coll-facsimile-frame img{display:block;width:100%;max-width:none;height:auto}
.coll-facsimile-frame iframe{width:100%;height:100%;border:0}
.coll-facsimile-frame [hidden]{display:none}
.coll-facsimile-status{grid-column:1;padding:8px 13px;margin:0;font:12px/1.5 Arial,sans-serif;color:#c4c4c7}
.coll-facsimile-ocr summary{cursor:pointer;font:12px/1.6 Arial,sans-serif;color:#dedee1}
.coll-facsimile-ocr{padding:12px 14px;border-top:1px solid #444449}
.coll-facsimile-ocr h4{font:500 12px Arial,sans-serif;color:#dedee1;margin:0 0 8px}
.coll-facsimile-ocr p{font:14px/1.7 Georgia,serif;color:#eee;margin:5px 0;white-space:pre-wrap;overflow-wrap:anywhere}
.coll-facsimile-ocr mark{background:#ffe55a!important;color:#242015!important;border-radius:2px;padding:1px}
.coll-facsimile-ocr .muted{font:11px/1.6 Arial,sans-serif;color:#c4c4c7}
.coll-facsimile-results{max-height:190px;overflow:auto;margin:6px 0;padding:0 4px;list-style:none}
.coll-facsimile-results button{display:block;width:100%;text-align:left;background:#252528;color:#ddd;border:1px solid #47474b;border-radius:5px;padding:6px;margin:3px 0;cursor:pointer}
.coll-facsimile-card a{color:#dcdce4}
@media(max-width:640px){.coll-facsimile-frame{height:52vh;min-height:380px}}
`;document.head.append(style);
mount.append(E("h2","coll-facsimile-heading","Facsímiles históricos · Rose y Krohn"));
mount.append(E("p","coll-facsimile-intro","Páginas de los ejemplares conservados en la biblioteca, junto a las traducciones ES · FR · EN y el latín editorial. El índice del mismo PDF propone la imagen de cada locus. La imagen digital y la página impresa tienen numeraciones distintas. El OCR auxiliar se consulta por separado."));
const grid=E("div","coll-facsimile-grid");mount.append(grid);
function showMarked(target,text,query){
 target.replaceChildren();const tokens=[...String(text||"").matchAll(/[\p{L}\p{M}]+/gu)];
 let pos=0,count=0;const q=normalize(query).trim(),terms=q?new Set(q.split(/\s+/)):meaningful;
 for(const m of tokens){
  target.append(text.slice(pos,m.index));
  if(terms.has(normalize(m[0]))){target.append(E("mark",null,m[0]));count++}
  else target.append(document.createTextNode(m[0]));
  pos=m.index+m[0].length;
 }
 target.append(text.slice(pos));return count;
}
function update(id){
 const b=blocks.get(id),row=loci[current]?.[id];
 if(!b)return;
 const anchor=b.navigation?.loci?.[current];
 if(b.manifest){
  if(anchor&&Number.isInteger(anchor.page)&&b.manifest.folios[anchor.page-1]){
   showPage(id,anchor.page);
   b.location.textContent+=" Localización propuesta por el índice del mismo PDF; comprobar el facsímil.";
  }else{
   if(!b.selected)showPage(id,1);
   b.location.textContent="Vitr. "+label(current)+" · sin correspondencia de imagen registrada. Navegación manual disponible.";
  }
 }
 b.ocr.replaceChildren();
 if(!row){b.page.textContent="Sin correspondencia OCR para este locus";b.note.textContent="Consultar la imagen del impreso.";return}
 b.page.textContent="Vitr. "+label(current)+" · imagen digital "+row.page+(row.pageEnd?"–"+row.pageEnd:"")+" · semejanza OCR "+(Number(row.score||0)*100).toFixed(1)+" %";
 const p=E("p");const marks=showMarked(p,String(row.text||""),b.query.value);b.ocr.append(p);
 b.note.textContent=marks+" coincidencias resaltadas en el índice OCR auxiliar. No es una transcripción revisada ni una variante crítica.";
}
function showPage(id,n){
 const b=blocks.get(id);if(!b?.manifest)return;
 const total=b.manifest.folios.length,page=Math.max(1,Math.min(total,Math.floor(Number(n))||1)),f=b.manifest.folios[page-1];
 b.digital.value=String(page);b.previous.disabled=page===1;b.next.disabled=page===total;
 b.pdf.href=(b.manifest.pdf||base(id)+"source.pdf")+"#page="+page+"&view=FitH";
 b.reader.href=id+".html?image="+page+"&locus="+encodeURIComponent(current);
 const matched=b.navigation?.loci?.[current]?.page===page;
 b.location.textContent="Imagen digital "+page+" de "+total+(f.paginaImpresa?" · página impresa "+f.paginaImpresa:"")+(matched?" · Vitr. "+label(current):" · navegación manual; el texto paralelo conserva el locus "+label(current))+".";
 if(b.selected===page)return;b.selected=page;b.frame.scrollTop=0;b.frame.scrollLeft=0;
 const token=++b.revision;b.image.hidden=false;delete b.image.dataset.loaded;b.fallback.hidden=true;b.fallback.removeAttribute("src");
 b.image.alt=b.ed.label+" · imagen digital "+page;
 b.image.onload=()=>{if(token===b.revision)b.image.dataset.loaded="true"};
 b.image.onerror=()=>{if(token!==b.revision)return;b.image.hidden=true;b.fallback.src=b.pdf.href;b.fallback.hidden=false;b.location.textContent="No se pudo cargar la imagen "+page+". Se muestra la misma página en el PDF conservado."};
 b.image.src=f.imagen;
}
async function loadEdition(ed){
 const b=blocks.get(ed.id);
 try{
  const [m,nav]=await Promise.all([
   either("data/r2/folios/"+ed.id+".json",base(ed.id)+"indice-folios.json"),
   either("data/r2/folios/"+ed.id+"-loci.json",base(ed.id)+"loci.json").catch(()=>({loci:{}}))
  ]);
  if(m.schema!=="vdl-folios-obra-1"||m.obra!==ed.id||!Array.isArray(m.folios)||!m.folios.length||m.folios.length!==m.imagenes||!m.folios.every((f,i)=>f.imagenDigital===i+1&&String(f.imagen).startsWith(base(ed.id))))throw Error("Índice de imágenes incoherente");
  b.manifest=m;b.navigation=nav;b.digital.max=String(m.imagenes);
  b.card.querySelector(".coll-facsimile-source").textContent=(m.custodia||"Ejemplar conservado en la biblioteca")+" · copia preservada: "+m.imagenes+" imágenes";
  b.digital.disabled=b.go.disabled=b.zoom.disabled=false;update(ed.id);
 }catch{
  b.fallback.src=b.pdf.href;b.fallback.hidden=false;
  b.location.textContent="Índice de imágenes no disponible. Puede consultar el PDF completo conservado o abrir el visor de la edición.";
 }
}
function navigate(id,locus){current=locus;for(const ed of editions)update(ed.id);const input=document.getElementById("coll-locus");if(input)input.value=label(locus);const form=document.getElementById("coll-form");if(form)form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));}
function search(id){const b=blocks.get(id),q=normalize(b.query.value).trim();b.results.replaceChildren();update(id);if(!q)return;
 const terms=q.split(/\s+/).filter(Boolean);
 const hits=Object.entries(loci).filter(([l,w])=>terms.every(t=>normalize(w[id]?.text||"").includes(t))).slice(0,70);
 for(const [l,w] of hits){
  const btn=E("button",null,"Vitr. "+label(l)+" · p. "+w[id].page+" · "+String(w[id].text||"").slice(0,115)+"…");btn.type="button";
  btn.addEventListener("click",()=>navigate(id,l));b.results.append(btn);
 }
 if(!hits.length)b.results.append(E("li","muted","Sin coincidencias en la transcripción OCR indexada. No implica ausencia del término en el ejemplar impreso."));
}
for(const ed of editions){
 const card=E("article","coll-facsimile-card");card.dataset.edition=ed.id;const h=E("header");h.append(E("h3",null,ed.label),E("p","citation",ed.editor),E("p","citation coll-facsimile-source","Ejemplar conservado en la biblioteca"));card.append(h);
 const c=E("div","coll-facsimile-controls");const previous=E("button",null,"←");const next=E("button",null,"→");previous.type=next.type="button";
 const digital=E("input");digital.type="number";digital.min="1";digital.value="1";digital.setAttribute("aria-label","Número de página digital, no página impresa");
 const go=E("button",null,"Ir a imagen");go.type="button";
 const pdf=E("a",null,"PDF conservado ↗");pdf.href=base(ed.id)+"source.pdf";pdf.target="_blank";pdf.rel="noopener noreferrer";
 const reader=E("a",null,"Visor completo ↗");reader.href=ed.id+".html?locus="+encodeURIComponent(current);reader.target="_blank";reader.rel="noopener noreferrer";
 const zoom=E("button",null,"Ampliar");zoom.type="button";zoom.setAttribute("aria-pressed","false");
 c.append(previous,digital,next,go,zoom,pdf,reader);card.append(c);
 const frame=E("div","coll-facsimile-frame");frame.setAttribute("aria-label","Facsímil "+ed.label);frame.tabIndex=0;
 const image=E("img");image.decoding="async";image.loading="lazy";image.hidden=true;
 const fallback=E("iframe");fallback.title="PDF conservado · "+ed.label;fallback.hidden=true;frame.append(image,fallback);card.append(frame);
 const locationNote=E("p","coll-facsimile-status","Cargando el índice del ejemplar conservado…");locationNote.setAttribute("role","status");card.append(locationNote);
 function page(n){showPage(ed.id,n)}
 previous.addEventListener("click",()=>page(Number(digital.value)-1));next.addEventListener("click",()=>page(Number(digital.value)+1));go.addEventListener("click",()=>page(Number(digital.value)));
 digital.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();page(digital.value)}});
 zoom.addEventListener("click",()=>{const expanded=zoom.getAttribute("aria-pressed")!=="true";zoom.setAttribute("aria-pressed",String(expanded));image.style.width=expanded?"180%":"100%";zoom.textContent=expanded?"Ajustar al ancho":"Ampliar"});
 previous.disabled=next.disabled=digital.disabled=go.disabled=zoom.disabled=true;
 const o=E("details","coll-facsimile-ocr");o.append(E("summary",null,"Índice auxiliar de búsqueda · OCR sin revisión crítica"));const pageLabel=E("h4");o.append(pageLabel);
 const row=E("div","coll-facsimile-controls");const query=E("input");query.type="search";query.placeholder="Palabra o frase latina en OCR…";query.setAttribute("aria-label","Buscar en la transcripción OCR de "+ed.label);
 const find=E("button",null,"Buscar por loci");find.type="button";row.append(query,find);o.append(row);const results=E("ul","coll-facsimile-results");o.append(results);
 const ocr=E("div");o.append(ocr);const note=E("div","muted");o.append(note);card.append(o);grid.append(card);
 blocks.set(ed.id,{ed,card,query,ocr,note,page:pageLabel,results,frame,image,fallback,pdf,reader,digital,previous,next,go,zoom,location:locationNote,selected:0,revision:0});
 loadEdition(ed);
 find.addEventListener("click",()=>search(ed.id));query.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();search(ed.id)}});
}
fetch("data/collation-loci.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(data=>{loci=data.loci||{};for(const ed of editions)update(ed.id)}).catch(e=>mount.append(E("p","coll-facsimile-intro","No se pudo cargar el índice OCR auxiliar: "+e.message)));
window.addEventListener("vitruvius:collation-locus",e=>{current=e.detail?.locus||current;for(const ed of editions)update(ed.id)});
})();
