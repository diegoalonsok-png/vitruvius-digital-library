/* Harleianus viewer controls reused for the two printed editions; scanned pages are internal R2 images. */
const id=document.body.dataset.edition;
const works={
 "rose-1899":{name:"Rose · 1899",citation:"Valentin Rose, Vitruvii De architectura libri decem, Leipzig: Teubner, 1899 (2.ª edición)."},
 "krohn-1912":{name:"Krohn · 1912",citation:"Fritz Krohn, Vitruvii De architectura libri decem, Leipzig: Teubner, 1912."}
};
const work=works[id],$=n=>document.getElementById(n);
const base="https://libros.vitruvius-digital-library.org/folios/"+id+"/";
const status=$("status"),img=$("folio"),stage=$("stage"),loupe=$("loupe"),mag=$("magnified");
let folios=[],selected=1,mode="original",serial=0,visible=0,matched=[];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const filter=()=>mode==="bw"?"grayscale(1) contrast("+$("contrast").value+"%) brightness(115%)":mode==="negative"?"grayscale(1) invert(1) contrast("+$("contrast").value+"%)":"contrast("+$("contrast").value+"%)";
function apply(){
 const before=img.getBoundingClientRect(),width=before.width||stage.clientWidth-28,height=before.height||1;
 const x=(stage.scrollLeft+stage.clientWidth/2)/width,y=(stage.scrollTop+stage.clientHeight/2)/height;
 const z=clamp(Number($("zoom").value)||100,50,500);
 img.style.width=Math.round(Math.max(240,stage.clientWidth-28)*z/100)+"px";img.style.filter=filter();mag.style.filter=filter();
 $("zval").textContent=z+"%";$("cval").textContent=$("contrast").value+"%";
 if(img.complete&&img.naturalWidth){stage.scrollLeft=Math.max(0,x*img.getBoundingClientRect().width-stage.clientWidth/2);stage.scrollTop=Math.max(0,y*img.getBoundingClientRect().height-stage.clientHeight/2);}
}
function zoom(value){$("zoom").value=clamp(Math.round(value/25)*25,50,500);apply()}
$("zoom-in").onclick=()=>zoom(Number($("zoom").value)+25);
$("zoom-out").onclick=()=>zoom(Number($("zoom").value)-25);
$("zoom-fit").onclick=()=>{zoom(100);stage.scrollTo({top:0,left:0})};
$("zoom").oninput=apply;$("contrast").oninput=apply;
stage.ondblclick=()=>zoom(Number($("zoom").value)+50);
stage.addEventListener("keydown",e=>{if(e.key==="+"||e.key==="="){e.preventDefault();zoom(Number($("zoom").value)+25)}else if(e.key==="-"){e.preventDefault();zoom(Number($("zoom").value)-25)}else if(e.key==="0"){e.preventDefault();zoom(100)}});
document.querySelectorAll("[data-image-mode]").forEach(b=>b.onclick=()=>{mode=b.dataset.imageMode;document.querySelectorAll("[data-image-mode]").forEach(c=>c.setAttribute("aria-pressed",String(c===b)));apply()});
function open(n){
 if(!folios.length)return;selected=clamp(Number(n)||1,1,folios.length);const f=folios[selected-1],current=++serial;
 $("page").value=selected;$("current-image").textContent=selected+" / "+folios.length;
 $("current-folio").textContent=f.folio?"f. "+f.folio:"No identificado";
 $("current-label").textContent=f.paginaImpresa?"p. "+f.paginaImpresa:"Imagen digital "+selected;
 $("folio-info").textContent="Imagen digital "+selected+". Numeración de página impresa y concordancia por locus solo cuando estén documentadas.";
 img.onload=()=>{if(current!==serial)return;mag.src=img.src;apply();status.textContent="Imagen "+selected+" de "+folios.length+" cargada desde R2."};
 img.onerror=()=>{if(current===serial)status.textContent="Error al cargar esta imagen de R2; no se sustituye por otra edición."};
 img.src=f.imagen;img.alt=work.name+" · imagen "+selected;
 $("prev").disabled=selected<=1;$("next").disabled=selected>=folios.length;
 for(const b of document.querySelectorAll("#h-folio-grid button[data-page]"))b.setAttribute("aria-pressed",String(+b.dataset.page===selected));
 const u=new URL(location.href);u.searchParams.set("image",String(selected));history.replaceState(null,"",u);
}
$("prev").onclick=()=>open(selected-1);$("next").onclick=()=>open(selected+1);$("open").onclick=()=>open($("page").value);
$("page").onchange=()=>open($("page").value);
$("go-folio").onclick=()=>{
 const term=$("folio-ref").value.trim().toLowerCase();if(!term)return;
 const matches=folios.map((f,i)=>({i:i+1,f})).filter(x=>(x.f.folio||"").toLowerCase().replace(/^f\.?/,"")===term.replace(/^f\.?/,""));
 if(matches.length===1)open(matches[0].i);else status.textContent="No hay una identificación unívoca de ese folio en el índice de la edición impresa.";
};
$("folio-ref").onkeydown=e=>{if(e.key==="Enter"){$("go-folio").click()}};
stage.addEventListener("pointermove",e=>{
 if(!img.complete||!img.naturalWidth)return;const rect=img.getBoundingClientRect(),relativeX=(e.clientX-rect.left)/rect.width,relativeY=(e.clientY-rect.top)/rect.height;
 if(relativeX<0||relativeX>1||relativeY<0||relativeY>1){loupe.style.display="none";return}
 loupe.style.display="block";loupe.style.left=(e.clientX+16)+"px";loupe.style.top=(e.clientY-90)+"px";
 mag.style.width=Math.round(rect.width*2)+"px";mag.style.left=Math.round(90-relativeX*rect.width*2)+"px";mag.style.top=Math.round(90-relativeY*rect.height*2)+"px"
});
stage.onpointerleave=()=>loupe.style.display="none";
function label(f,i){return f.folio?"f. "+f.folio:f.paginaImpresa?"p. "+f.paginaImpresa:"Imagen "+(i+1)}
function addThumbs(){
 const grid=$("h-folio-grid"),fragment=document.createDocumentFragment();
 for(const i of matched.slice(visible,visible+48)){
 const f=folios[i],b=document.createElement("button"),im=document.createElement("img"),strong=document.createElement("strong"),span=document.createElement("span");
 b.type="button";b.className="h-folio-card";b.dataset.page=i+1;b.setAttribute("aria-label","Abrir "+label(f,i));b.setAttribute("aria-pressed",String(i+1===selected));
 im.src=f.miniatura||f.imagen;im.loading="lazy";im.alt=label(f,i);
 strong.textContent="Imagen "+(i+1);span.textContent=label(f,i);b.append(im,strong,span);
 b.onclick=()=>{open(i+1);$("folio-identification").scrollIntoView({behavior:"smooth",block:"start"})};
 fragment.append(b)
 }grid.append(fragment);visible+=Math.min(48,matched.length-visible);
 $("h-gallery-more").hidden=visible>=matched.length;
 $("h-gallery-status").textContent=matched.length+" imágenes en el índice · "+visible+" miniaturas visibles.";
}
function search(){
 const term=$("h-gallery-query").value.trim().toLowerCase();
 matched=folios.map((_,i)=>i).filter(i=>!term||String(i+1).includes(term)||label(folios[i],i).toLowerCase().includes(term));
 visible=0;$("h-folio-grid").replaceChildren();if(matched.length)addThumbs();else{$("h-gallery-more").hidden=true;$("h-gallery-status").textContent="Sin coincidencias."}
}
$("h-gallery-search").onclick=search;$("h-gallery-query").onkeydown=e=>{if(e.key==="Enter")search()};
$("h-gallery-reset").onclick=()=>{$("h-gallery-query").value="";search()};
$("h-gallery-more").onclick=addThumbs;
const valid=m=>m?.schema==="vdl-folios-obra-1"&&m.obra===id&&Array.isArray(m.folios)&&m.folios.length===m.imagenes&&m.folios.length>0&&m.folios.every((f,i)=>f.imagenDigital===i+1&&typeof f.imagen==="string"&&f.imagen.startsWith(base));
try{
 const response=await fetch(base+"indice-folios.json",{cache:"no-cache"});
 if(!response.ok)throw Error("HTTP "+response.status);
 const manifest=await response.json();if(!valid(manifest))throw Error("Índice de imágenes incompleto");
 folios=manifest.folios;$("page").max=String(folios.length);
 $("h-gallery-status").textContent=folios.length+" imágenes verificadas en el índice.";
 search();open(Number(new URLSearchParams(location.search).get("image"))||1)
}catch(err){
 status.textContent="Las imágenes individuales todavía no están publicadas o verificadas en R2: "+err.message;
 $("h-gallery-status").textContent="Sin índice de imágenes publicado. No se muestran folios inventados.";
 $("folio-info").textContent="El lector se activará al publicarse el índice de imágenes reales de esta edición.";
}
