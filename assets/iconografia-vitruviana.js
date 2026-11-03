/* Atlas iconográfico: referencias a testigos y a reproducciones, no identificación automatizada de láminas. */
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=x=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const bookNames={1:"I · Principios, ciudades y arquitectura",2:"II · Materiales",3:"III · Templos y proporciones",4:"IV · Órdenes arquitectónicos",5:"V · Edificios públicos y teatros",6:"VI · Arquitectura doméstica",7:"VII · Acabados",8:"VIII · Agua e hidráulica",9:"IX · Astronomía y gnomónica",10:"X · Máquinas, elevación y asedio"};
let items=[],filtered=[],visibleCount=24,activeIndex=0,zoom=1,offsetX=0,offsetY=0,pressed=false,lastX=0,lastY=0;
const catLabels={codices:"Códices medievales",retratos:"Retratos históricos de Vitruvio",ediciones:"Portadas y folios impresos",proporcion:"Homo ad quadratum / ad circulum",ordenes:"Órdenes arquitectónicos",maquinas:"Maquinaria e ingeniería",arquitectura:"Arquitectura dibujada",lugares:"Lugares y arqueología"};
function catOfBook(book){if(book===3)return "proporcion";if(book===4)return "ordenes";if(book===10||book===8)return "maquinas";if(book===5||book===6)return "arquitectura";return "ediciones";}
function category(record){return catLabels[record.category]||record.category||"Documento";}
function articleText(record){return [record.title,record.author,record.date,record.century,record.institution,record.shelfmark,record.folio,record.locus,record.production,record.notes,record.graphic,record.iconography,record.material,record.status,record.type,record.visualType,...(record.tags||[])].join(" ");}
function parseSectionBook(section){const value=String(section.id||"");return /^\d{1,2}$/.test(value)?Number(value):null;}
function createDatasetItems(source,info){
  const sections=info?.sections||[];
  const selected=new Map();
  const keep=(canvas,section,book,kind)=>{
    if(!canvas||selected.has(canvas.page))return;
    const label=String(canvas.iiif_label||"")||"Imagen "+canvas.page;
    const cat=kind==="opening"?"ediciones":catOfBook(book);
    selected.set(canvas.page,{
      id:source.id+"-p"+canvas.page,category:cat,type:source.type,title:source.title+" · "+(kind==="opening"?"preliminares":label),
      author:source.abbrev,date:source.date,century:source.era,place:source.production,institution:source.institution,
      shelfmark:source.shelfmark||"Ejemplar digital identificado en el registro original",folio:label,
      book:book||null,locus:book?"Libro "+book+" (intervalo editorial; locus preciso sin identificar)":"Preliminares; sin locus asignado",
      material:source.format||"Datos materiales del ejemplar pendientes de cotejo.",
      graphic:kind==="opening"?"Página de preliminares. Se requiere inspección individual para atribuirla como portada o cubierta.":source.notes,
      iconography:book===3?"Sección del libro III: proporción humana y templos; la imagen concreta NO ha sido identificada como representación del cuerpo.":book===4?"Sección del libro IV: órdenes arquitectónicos; el motivo gráfico concreto requiere cotejo.":book===10?"Sección del libro X: maquinaria y asedio; no se afirma que la página ilustrada represente una máquina.":book===5?"Sección del libro V: arquitectura pública y basílicas; imagen sin atribución iconográfica individual.":"Folio de una sección del tratado; no se atribuye motivo visual sin inspección.",
      status:"Número y secuencia de imagen tomados del manifiesto IIIF institucional. Tema general derivado del índice; identificación iconográfica provisional.",
      image:canvas.local_url||canvas.image_url,fallbackImage:canvas.local_url?canvas.image_url:null,record:source.record,viewer:source.iiif_manifest,manifest:source.iiif_manifest,rights:source.rights||"Consultar condiciones de la institución conservadora.",
      notes:"Impreso: corresponde una ficha de bibliografía material, no codicología de manuscritos. "+(source.notes||""),
      sort:kind==="opening"?0:(book||11),pageNumber:canvas.page,originalCanvas:canvas.canvas_id,iiifLabel:label
    });
  };
  for(const s of sections){const b=parseSectionBook(s);const subset=source.canvases.filter(c=>c.page>=s.start&&c.page<=s.end);if(!subset.length)continue;
    if(b){keep(subset[0],s,b,"section");if(subset.length>5)keep(subset[Math.floor(subset.length/2)],s,b,"section");if(subset.length>11)keep(subset[Math.max(0,subset.length-3)],s,b,"section");}
    else if(/cover|title|cubierta|portada|prelimin|front/i.test(s.label||"")){keep(subset[0],s,null,"opening");if(subset.length>2)keep(subset[subset.length-1],s,null,"opening");}
  }
  if(!sections.length){for(const p of [1,3,5,10,30,70,120,170,200]){const c=source.canvases[p-1];if(c)keep(c,null,null,"opening");}}
  if(![...selected.values()].some(x=>x.pageNumber<=3)){for(let n=1;n<=Math.min(3,source.canvases.length);n++)keep(source.canvases[n-1],null,null,"opening");}
  return [...selected.values()];
}
function imageMarkup(r){return r.image?'<img alt="'+esc("Reproducción documental: "+r.title+"; "+r.folio)+'" src="'+esc(r.image)+'" data-fallback="'+esc(r.fallbackImage||"")+'" loading="lazy" decoding="async">':'<div class="no-image"><span aria-hidden="true">▤</span><br>Imagen institucional pendiente de enlace directo<br><small>El catálogo y la ficha siguen disponibles</small></div>';}
function summaryMarkup(r){const fields=[["Autor/edición",r.author||"No consignado"],["Datación",r.date||"No documentada"],["Folio / pág.",r.folio||"No identificado"],["Depósito",r.institution||"No documentado"]];return fields.map(([a,b])=>'<div><dt>'+esc(a)+'</dt><dd>'+esc(b)+'</dd></div>').join("");}
function buildCard(r,idx){return '<article class="atlas-card"><button type="button" class="atlas-image" data-open="'+idx+'" aria-label="Ampliar '+esc(r.title)+'">'+imageMarkup(r)+'<span class="folio-stamp">'+esc(r.visualType?String(r.visualType).toUpperCase():r.pageNumber?"IMAGEN "+String(r.pageNumber).padStart(3,"0"):"DOCUMENTO")+'</span></button><div class="atlas-record"><p class="atlas-kind">'+esc(category(r))+' · '+esc(r.type||"Documento")+'</p><h3>'+esc(r.title)+'</h3><dl>'+summaryMarkup(r)+'</dl><p class="atlas-method">'+esc(r.status||"Ficha por completar")+'</p><div class="atlas-links"><button type="button" data-open="'+idx+'">Abrir expediente y ampliar</button><a href="'+esc(r.record||r.viewer||"#")+'" target="_blank" rel="noopener noreferrer">Fuente institucional ↗</a></div></div></article>';}
function isHistoricalVitruvianBodySearch(q){return ["hombre de vitruvio","hombre vitruviano","homo vitruvianus","vitruvian man","uomo vitruviano","hombre de vitrubio","hombre de virtuvio","homo ad quadratum","homo ad circulum","proporcion humana","proporciones humanas"].some(term=>q.includes(term));}
function isBodyCandidate(r){return r.id==="leonardo-vitruviano"||r.id==="duerer-proportiones-1528"||(r.book===3&&["giocondo-1511","cesariano-1521","barbaro-1567"].includes(r.source));}
function filters(){const q=norm($("atlas-search").value.trim()),bodyQuery=isHistoricalVitruvianBodySearch(q),cat=$("atlas-type").value,book=$("atlas-book").value,edition=$("atlas-edition").value;
  filtered=items.filter(r=>(!cat||r.category===cat)&&(!book||String(r.book||"")===book)&&(!edition||r.source===edition||r.id?.startsWith(edition+"-"))&&(!q||norm(articleText(r)).includes(q)||(bodyQuery&&isBodyCandidate(r))));
  visibleCount=24;render();
}
function render(){const list=$("atlas-grid");list.innerHTML=filtered.slice(0,visibleCount).map((r,i)=>buildCard(r,i)).join("");
 $("atlas-count").textContent=filtered.length+" fichas encontradas · "+Math.min(visibleCount,filtered.length)+" visibles";
 $("atlas-more").hidden=visibleCount>=filtered.length;
 $("atlas-empty").hidden=filtered.length>0;
 list.querySelectorAll("img").forEach(img=>img.addEventListener("error",()=>{const fallback=img.dataset.fallback;if(fallback&&img.src!==new URL(fallback,location.href).href){img.src=fallback;img.dataset.fallback="";return;}img.replaceWith(Object.assign(document.createElement("span"),{className:"atlas-fallback",textContent:"Reproducción no disponible aquí · abrir fuente institucional"}));}));
}
function detailRow(name,value){return '<dt>'+esc(name)+'</dt><dd>'+esc(value||"No documentado")+'</dd>';}
function resetTransform(){zoom=1;offsetX=offsetY=0;transform();}
function transform(){const img=$("atlas-view-img");if(img)img.style.transform="translate("+offsetX+"px,"+offsetY+"px) scale("+zoom+")";$("atlas-zoom-value").textContent=Math.round(zoom*100)+"%";}
function show(index){if(index<0||index>=filtered.length)return;activeIndex=index;const r=filtered[index];const dialog=$("atlas-dialog");$("atlas-view-title").textContent=r.title;
 $("atlas-view-sub").textContent=category(r)+" · "+(r.folio||"sin folio")+(r.book?" · Libro "+r.book:"");
 const img=$("atlas-view-img"),empty=$("atlas-view-empty");img.hidden=!r.image;empty.hidden=!!r.image;
 if(r.image){img.onerror=()=>{if(r.fallbackImage&&img.src!==new URL(r.fallbackImage,location.href).href){img.src=r.fallbackImage;return;}img.hidden=true;empty.hidden=false;empty.textContent="No se pudo cargar esta reproducción. Utilizá el enlace a la fuente institucional."};img.alt="Facsímil: "+r.title+" · "+(r.folio||"");img.src=r.image;}
 else empty.textContent="Reproducción no integrada: el registro de la institución está disponible en la ficha.";
 let defs=[["Objeto documental",r.type],["Autor / editor",r.author],["Datación",r.date],["Siglo / período",r.century],["Procedencia",r.place||r.production],["Biblioteca / institución",r.institution],["Signatura / registro",r.shelfmark],["Folio / imagen",r.folio],["Referencia al tratado",r.locus],["Soporte / bibliografía material",r.material],["Rasgos gráficos / paleografía",r.graphic],["Contenido iconográfico",r.iconography],["Estado de cotejo",r.status],["Derechos de reproducción",r.rights],["Inscripciones originales",r.inscriptions],["Medidas de la plancha",r.plate],["Medidas de la hoja",r.sheet],["Cita Chicago · ejemplar de referencia",r.chicago],["Cita Chicago · estampa reproducida",r.imageChicago],["Notas científicas",r.notes]];
 $("atlas-view-details").innerHTML=defs.map(d=>detailRow(...d)).join("");
 $("atlas-view-record").href=r.record||r.viewer||"#";$("atlas-view-record").hidden=!(r.record||r.viewer);
 $("atlas-view-source").href=r.viewer||r.record||"#";$("atlas-view-source").hidden=!(r.viewer||r.record);
 $("atlas-view-manifest").href=r.manifest||"#";$("atlas-view-manifest").hidden=!r.manifest;
 $("atlas-view-status").textContent=(index+1)+" / "+filtered.length+" · La atribución científica se consigna según el estado de cotejo indicado.";
 resetTransform();if(!dialog.open)dialog.showModal();
 const uri=new URL(location.href);uri.searchParams.set("folio",r.id);history.replaceState(null,"",uri);
}
function close(){const d=$("atlas-dialog");d.close();$("atlas-view-img").removeAttribute("src");const uri=new URL(location.href);uri.searchParams.delete("folio");history.replaceState(null,"",uri);}
function advance(delta){show(Math.max(0,Math.min(filtered.length-1,activeIndex+delta)));}
function changeZoom(k){zoom=Math.max(1,Math.min(5,+(zoom*k).toFixed(2)));if(zoom===1)offsetX=offsetY=0;transform();}
function tabIndexToOpen(){const id=new URL(location.href).searchParams.get("folio");if(!id)return;const idx=filtered.findIndex(x=>x.id===id);if(idx>=0)show(idx);}
function bind(){
 $("atlas-search").addEventListener("input",filters);
 for(const n of ["atlas-type","atlas-book","atlas-edition"])$(n).addEventListener("change",filters);
 $("atlas-grid").addEventListener("click",e=>{const b=e.target.closest("[data-open]");if(b)show(+b.dataset.open);});
 $("atlas-more").addEventListener("click",()=>{visibleCount+=24;render()});
 $("atlas-view-close").addEventListener("click",close);
 $("atlas-next").addEventListener("click",()=>advance(1));
 $("atlas-prev").addEventListener("click",()=>advance(-1));
 $("atlas-zoom-in").addEventListener("click",()=>changeZoom(1.4));
 $("atlas-zoom-out").addEventListener("click",()=>changeZoom(1/1.4));
 $("atlas-zoom-reset").addEventListener("click",resetTransform);
 $("atlas-cite").addEventListener("click",async()=>{
  const r=filtered[activeIndex];
  const citation=r.imageChicago||r.chicago||("Vitruvius Digital Library. "+r.title+". "+(r.institution||"")+"; "+(r.record||r.viewer||location.href));
  try{await navigator.clipboard.writeText(citation);$("atlas-view-status").textContent="Cita Chicago copiada"}catch{$("atlas-view-status").textContent=citation}
 });
 $("atlas-print").addEventListener("click",()=>window.print());
 $("atlas-copy").addEventListener("click",async()=>{const r=filtered[activeIndex];const url=new URL(location.href);url.searchParams.set("folio",r.id);try{await navigator.clipboard.writeText(url.href);$("atlas-view-status").textContent="Enlace al folio copiado"}catch{$("atlas-view-status").textContent=url.href}});
 $("atlas-dialog").addEventListener("cancel",e=>{e.preventDefault();close()});
 document.addEventListener("keydown",e=>{if(!$("atlas-dialog").open)return;if(e.key==="ArrowRight")advance(1);if(e.key==="ArrowLeft")advance(-1);if(e.key==="+")changeZoom(1.4);if(e.key==="-")changeZoom(1/1.4)});
 const stage=$("atlas-stage");
 stage.addEventListener("wheel",e=>{e.preventDefault();changeZoom(e.deltaY<0?1.13:1/1.13)},{passive:false});
 stage.addEventListener("pointerdown",e=>{pressed=true;lastX=e.clientX;lastY=e.clientY;stage.setPointerCapture(e.pointerId)});
 stage.addEventListener("pointerup",()=>pressed=false);
 stage.addEventListener("pointercancel",()=>pressed=false);
 stage.addEventListener("pointermove",e=>{if(!pressed||zoom===1)return;offsetX+=e.clientX-lastX;offsetY+=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;transform()});
}
async function start(){
 bind();
 const response=await fetch("data/iconografia-vitruviana.json?v=20261103-bernardi-01");if(!response.ok)throw Error("Inventario no accesible: "+response.status);
 const meta=await response.json();
 const jobs=meta.datasets.map(async ds=>{try{const [r,s]=await Promise.all([fetch(ds.file),ds.sections?fetch(ds.sections):Promise.resolve(null)]);if(!r.ok||s&&!s.ok)throw Error("HTTP datos");const data=await r.json();const section=s?await s.json():null;return createDatasetItems({...data,...ds},section).map(x=>({...x,source:ds.id}));}catch(err){console.warn("Fuente IIIF no incluida:",ds.id,err);return []}});
 const derived=(await Promise.all(jobs)).flat();
 items=[...meta.primaryRecords.map(x=>({...x,source:x.source||"registros"})),...derived];
for(const x of items){if(x.book===3&&["giocondo-1511","cesariano-1521","barbaro-1567"].includes(x.source)){x.tags=[...(x.tags||[]),"proporciones del cuerpo humano","uomo vitruviano","homo ad circulum","homo ad quadratum","iconografía vitruviana por cotejar"];}}
 for(const x of items){if(!x.book){const label=String(x.locus||"");const roman=label.match(/\b(X|IX|IV|V?I{1,3}|V|VIII|VII|VI)\.(?:\d+|praef)/i);const arabic=label.match(/\b(?:Libro\s+|Book\s+)(\d{1,2})\b/i);if(arabic&&+arabic[1]>=1&&+arabic[1]<=10)x.book=+arabic[1];else if(roman){const vals={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};x.book=vals[roman[1].toUpperCase()]||null;}}}
 const editions=[...new Set(derived.map(x=>x.source))];
 for(const id of editions){const data=meta.datasets.find(x=>x.id===id);const o=document.createElement("option");o.value=id;o.textContent=data.title+" ("+data.date+")";$("atlas-edition").append(o)}
 items.sort((a,b)=>{const order={retratos:0,codices:1,proporcion:2,ediciones:3,ordenes:4,maquinas:5,arquitectura:6,lugares:7};return (order[a.category]??8)-(order[b.category]??8)||String(a.date).localeCompare(String(b.date))||String(a.id).localeCompare(String(b.id));});
 $("atlas-loading").textContent="Catálogo cargado: "+items.length+" expedientes y páginas seleccionadas de fuentes IIIF. El motivo visual exacto de cada lámina requiere verificación individual.";
 filters();tabIndexToOpen();
}
start().catch(err=>{$("atlas-loading").textContent="No se pudo cargar el Atlas: "+err.message+". Consultá el inventario JSON y los registros institucionales.";console.error(err)});
