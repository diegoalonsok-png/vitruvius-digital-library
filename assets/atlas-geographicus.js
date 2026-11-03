/* Atlas Geographicus Vitruvianus. Based on editorial onomasticon and contextual Fanum Fortunae.
   Points refer to approximate historical city locations, NOT precise archaeological footprints. */
const byId=(id)=>document.getElementById(id);
const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fold=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const latinCanonical={
 alexandria:"Alexandria",asia:"Asia",athens:"Athenae",babylon:"Babylon",campania:"Campania",carthage:"Carthago",corinth:"Corinthus",croton:"Croton",ephesus:"Ephesus",egypt:"Aegyptus",sparta:"Sparta",halicarnassus:"Halicarnassus",italy:"Italia",miletus:"Miletus",pergamum:"Pergamum",puteoli:"Puteoli",euphrates:"Euphrates",ganges:"Ganges",nile:"Nilus",tiber:"Tiberis",tigris:"Tigris",rhodes:"Rhodos",rome:"Roma",samos:"Samos",sicily:"Sicilia",syracuse:"Syracusae",tarentum:"Tarentum","fanum-fortunae":"Fanum Fortunae"
};
let all=[],results=[],selected=null,map=null,pins=null;
let geometryById=new Map(),passagesByLocus=new Map(),activePassageLocus=null;
let modernLayer=null,historicalLayer=null,activeBase="moderno",ancientLoads=0,ancientErrors=0;
const markerById=new Map();
const hasPoint=x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon);
const book=l=>Number(String(l).split(".")[0])||0;
const labelType=x=>x.geotype||"Localización no determinada";
function searchText(r){return fold([r.name,r.modern,r.latinCanonical,r.greek_name,r.period,r.summary,r.geotype,...(r.aliases||[]),...(r.latin_forms||[]),...(r.loci||[])].join(" "));}
function locusUrl(s){const u=new URL("lector-bilingue.html",location.href);u.searchParams.set("locus",s);return u.href;}
function entryUrl(r){const u=new URL("onomasticon.html",location.href);u.searchParams.set("id",r.id);u.searchParams.set("type","place");return u.href;}
function makeStat(label,value){return '<div class="place-stat"><dt>'+html(label)+'</dt><dd>'+html(value||"No determinado")+'</dd></div>';}
function namesMarkup(r,tag){
 const el=tag||"div";
 return '<'+el+' class="ancient-names"><span lang="la" class="latin-name">'+html(r.latinCanonical)+'</span><span class="greek-name" lang="grc">'+html(r.greek_name||"—")+'</span><span class="modern-name">'+html(r.name)+'</span></'+el+'>';
}

function featureFor(r){return geometryById.get(r.id)||null;}
function geoLabel(r){
 const g=featureFor(r);
 return hasPoint(r)?"Punto cartográfico aproximado · certeza "+r.confidence
 :g?.geometry==="polygon"?"Área sombreada esquemática; NO representa límites históricos exactos"
 :g?.geometry==="polyline"?"Recorrido fluvial esquemático; NO representa el cauce antiguo exacto"
 :r.confidence==="no acreditado"?"Topónimo en revisión filológica · sin geometría acreditada"
 :"Región o topónimo ambiguo · sin geometría atribuida";
}
function geoCoordinates(r){
 const g=featureFor(r);
 if(hasPoint(r))return r.lat.toFixed(3)+"°, "+r.lon.toFixed(3)+"° (centro orientativo, no lugar exacto de un edificio)";
 if(g?.geometry==="polygon")return "Área esquemática de referencia ("+g.coordinates.length+" vértices). Límite histórico exacto no reconstruido.";
 if(g?.geometry==="polyline")return "Recorrido de referencia ("+g.coordinates.length+" vértices). Curso antiguo no reconstruido.";
 return "Sin coordenada o área geográfica verificada.";
}
function canonicalVariants(r){
 return [...new Set([...(r.latin_forms||[]),r.latinCanonical,...(r.aliases||[])].filter(Boolean).map(String))]
 .filter(x=>x.length>=3).sort((a,b)=>b.length-a.length);
}
function quoteForRegex(x){return [...x].map(c=>"\\^$.*+?()[]{}|".includes(c)?"\\"+c:c).join("");}
function namePattern(r){
 const v=canonicalVariants(r);
 if(!v.length)return null;
 return new RegExp("(^|[^\\p{L}])("+v.map(quoteForRegex).join("|")+")(?=$|[^\\p{L}])","giu");
}
function hasLiteralName(r,text){const reg=namePattern(r);return !!(reg&&reg.test(String(text||"")));}
function highlightedLatin(r,text){
 const textOriginal=String(text||""),reg=namePattern(r);
 if(!reg)return html(textOriginal);
 let last=0,out="";
 for(const m of textOriginal.matchAll(reg)){
  const start=m.index+(m[1]?.length||0),term=m[2];
  if(!term||start<last)continue;
  out+=html(textOriginal.slice(last,start))+"<mark class=\"toponym-match\">"+html(term)+"</mark>";
  last=start+term.length;
 }
 return out+html(textOriginal.slice(last));
}
function initialLocus(r){
 const loci=r?.loci||[];
 return loci.find(l=>hasLiteralName(r,passagesByLocus.get(l)?.latin))||loci[0]||"";
}
function renderPassage(prefix,r,locus){
 const allLoci=r.loci||[],sel=byId(prefix+"-select");
 if(!sel)return;
 const chosen=locus&&allLoci.includes(locus)?locus:initialLocus(r);
 sel.innerHTML=allLoci.map(l=>'<option value="'+html(l)+'">'+html(l)+'</option>').join("");
 sel.disabled=!allLoci.length;
 sel.value=chosen;
 const p=passagesByLocus.get(chosen);
 byId(prefix+"-heading").textContent=chosen?"De architectura · "+chosen:"Referencia textual no disponible";
 byId(prefix+"-latin").innerHTML=p?highlightedLatin(r,p.latin):"<em>Pasaje no incorporado.</em>";
 byId(prefix+"-translation").textContent=p?.translation||"No se dispone de traducción para esta referencia.";
 const literal=!!(p&&hasLiteralName(r,p.latin));
 byId(prefix+"-evidence").textContent=p?(literal?
   "Coincidencia literal de una forma latina catalogada, resaltada en amarillo en V514. No equivale a una lectura diplomática de un manuscrito.":
   "Referencia del índice onomástico: aquí no se identifica literalmente ninguna forma latina catalogada. Comprobar el locus antes de citarlo."):
   "No se recuperó el pasaje; consultar el lector.";
 const link=byId(prefix+"-reader");
 link.href=chosen?locusUrl(chosen):"lector-bilingue.html";
 link.hidden=!chosen;
 activePassageLocus=chosen;
}
function selectPassageFrom(prefix){
 if(!selected)return;
 const locus=byId(prefix+"-select").value;
 for(const p of ["place-passage","dossier-passage"])renderPassage(p,selected,locus);
}

function renderDetails(){
 const r=selected;if(!r)return;
 byId("place-heading").innerHTML=namesMarkup(r,"div");
 byId("place-subtitle").textContent=r.modern||r.period;
 byId("place-summary").textContent=r.summary||"Descripción documental pendiente de cotejo.";
 byId("place-verification").textContent=geoLabel(r);
 const mt=geoCoordinates(r);
 byId("place-facts").innerHTML=[
   makeStat("Nombre latino histórico (normalizado)",r.latinCanonical),
   makeStat("Variantes literales del texto editorial V514",(r.latin_forms||[]).join(" · ")||"Sin forma acreditada"),
   makeStat("Nombre griego convencional",r.greek_name||"No incorporado"),
   makeStat("Traducción o nombre moderno",r.name),
   makeStat("Identificación actual",r.modern),
   makeStat("Región histórica",r.period),
   makeStat("Tipo",r.geotype),
   makeStat("Georreferenciación",mt),
   makeStat("Estado filológico",r.sourceStatus||"Pendiente de revisión"),
   makeStat("Pasajes catalogados",String(r.loci?.length||0))
 ].join("");
 byId("place-loci").innerHTML=(r.loci||[]).map(l=>'<a href="'+html(locusUrl(l))+'" target="_blank" rel="noopener noreferrer">'+html(l)+'</a>').join("")||"Aún sin locus documentado";
 const link=byId("place-onomasticon");
 link.href=r.internal||entryUrl(r);
 link.textContent=r.internal?"Ver monografía sobre Fano":"Ver entrada del Onomasticon";
 byId("place-note").textContent=r.note||"Identificación del núcleo histórico de una ciudad, no de un monumento preciso. Las formas griegas son equivalentes históricos de referencia, no variantes leídas en el Codex H.";
 const source=byId("place-source");
 source.hidden=!r.source||r.id!=="fanum-fortunae";
 if(!source.hidden)source.href=r.source;
 renderPassage("place-passage",r,activePassageLocus&&r.loci?.includes(activePassageLocus)?activePassageLocus:null);
}
function selectPlace(id,zoom=true,scroll=false){
 const r=all.find(x=>x.id===id);if(!r)return;
 selected=r;
 renderDetails();
 document.querySelectorAll("[data-place-id]").forEach(x=>x.setAttribute("aria-current",String(x.dataset.placeId===id)));
 if(map&&hasPoint(r)&&zoom){map.setView([r.lat,r.lon],Math.max(map.getZoom(),6),{animate:false});markerById.get(r.id)?.openPopup();}
 if(scroll)byId("place-detail").scrollIntoView({behavior:"smooth",block:"start"});
 const url=new URL(location.href);url.searchParams.set("lugar",r.id);history.replaceState(null,"",url);
}
function dossierLine(label,value){
 return '<div class="dossier-field"><dt>'+html(label)+'</dt><dd>'+html(value||"No documentado")+'</dd></div>';
}
function openScientificDossier(id){
 const r=all.find(x=>x.id===id);
 if(!r)return;
 selectPlace(id,false,false);
 const d=byId("place-dossier");
 if(!d||typeof d.showModal!=="function"){
  byId("place-detail").scrollIntoView({behavior:"smooth",block:"center"});
  byId("place-detail").focus({preventScroll:true});
  return;
 }
 byId("dossier-title").textContent=r.latinCanonical+" — "+r.name;
 byId("dossier-greek").textContent=r.greek_name||"Nombre griego no acreditado";
 byId("dossier-modern").textContent=r.modern||r.period||"Identificación moderna pendiente";
 byId("dossier-summary").textContent=r.summary||"Descripción histórica pendiente de cotejo";
 const coords=geoCoordinates(r);
 byId("dossier-fields").innerHTML=[
  dossierLine("Tipo de lugar",r.geotype),
  dossierLine("Nombre latino normalizado",r.latinCanonical),
  dossierLine("Formas latinas de V514",(r.latin_forms||[]).join(" · ")||"No identificadas"),
  dossierLine("Nombre griego de referencia",r.greek_name||"No documentado"),
  dossierLine("Nombre moderno",r.name),
  dossierLine("Identificación actual",r.modern),
  dossierLine("Marco histórico",r.period),
  dossierLine("Referencias editoriales",String(r.loci?.length||0)+" loci"),
  dossierLine("Estado de las lecturas",r.sourceStatus||"Revisión pendiente"),
  dossierLine("Situación cartográfica",coords),
  dossierLine("Nivel de certeza",r.confidence||"No documentado"),
  dossierLine("Nota de investigación",r.note||"Las equivalencias griegas son referencias eruditas y no lecturas de un testimonio griego del Codex H.")
 ].join("");
 const loci=byId("dossier-loci");
 loci.innerHTML=(r.loci||[]).map(l=>'<a href="'+html(locusUrl(l))+'" target="_blank" rel="noopener noreferrer" title="Leer locus '+html(l)+' en la biblioteca">'+html(l)+'</a>').join("")||"<span>Sin locus verificado</span>";
 const on=byId("dossier-onomasticon");
 on.href=r.internal||entryUrl(r);
 on.textContent=r.internal?"Estudio específico de la basílica de Fano ↗":"Abrir en Onomasticon ↗";
 const source=byId("dossier-source");
 source.hidden=!(r.id==="fanum-fortunae"&&r.source);
 if(!source.hidden)source.href=r.source;
 const u=new URL(location.href);u.searchParams.set("lugar",r.id);u.searchParams.set("ficha","1");
 byId("dossier-deeplink").href=u.href;
 renderPassage("dossier-passage",r,activePassageLocus);
 if(!d.open)d.showModal();
}
function typeGroup(r){
 if(/ciudad/i.test(r.geotype))return "ciudad";
 if(/río/i.test(r.geotype))return "rio";
 if(/revisión/i.test(r.geotype))return "dudoso";
 return "region";
}
function filter(){
 const q=fold(byId("place-query").value.trim());
 const b=Number(byId("place-book").value)||0;
 const ty=byId("place-type").value;
 results=all.filter(r=>!ty||typeGroup(r)===ty)
 .filter(r=>!b||(r.loci||[]).some(l=>book(l)===b))
 .filter(r=>!q||searchText(r).includes(q));
 renderList();
 renderMapMarkers();
 byId("place-count").textContent=results.length+" lugares · "+results.filter(hasPoint).length+" con ubicación orientativa";
 if(!results.includes(selected))selected=results.find(x=>x.id==="fanum-fortunae")||results[0]||null;
 if(selected)renderDetails();
 if(!results.length)byId("place-list").innerHTML='<li class="no-results">Ningún lugar coincide con los filtros.</li>';
}
function renderList(){
 byId("place-list").innerHTML=results.map(r=>'<li><button type="button" data-place-id="'+html(r.id)+'" aria-current="'+(selected?.id===r.id)+'">'+namesMarkup(r,"span")+'<small>'+html(labelType(r))+' · '+html(String((r.loci||[]).length))+' loci '+(hasPoint(r)?"· ⌖":"· sin pin")+'</small></button></li>').join("");
}
function renderMapMarkers(){
 if(!map)return;
 pins.clearLayers();markerById.clear();
 for(const r of results){
 if(!hasPoint(r))continue;
 const color=r.id==="fanum-fortunae"?"#a06a29":"#244f65";
 const circle=L.circleMarker([r.lat,r.lon],{radius:r.id==="fanum-fortunae"?9:6,weight:2,color:"#fff9ed",fillColor:color,fillOpacity:.88});
 const name=html(r.latinCanonical)+" · "+html(r.name);
 const directLink=new URL(location.href);directLink.searchParams.set("lugar",r.id);directLink.searchParams.set("ficha","1");
 circle.bindPopup('<strong>'+name+'</strong><p>Coordenadas aproximadas de ciudad o isla, no monumento.</p><a class="map-popup-select" href="'+html(directLink.href)+'" data-popup-place="'+html(r.id)+'">Abrir ficha científica ↗</a>');
 circle.on("click",()=>selectPlace(r.id,false,false));
 circle.addTo(pins);
 markerById.set(r.id,circle);
 }
}
function initializeMap(){
 if(typeof L==="undefined"){byId("map-alert").hidden=false;byId("map-alert").textContent="El mapa gráfico no se pudo cargar. El catálogo de lugares, nombres y loci funciona sin conexión cartográfica.";return;}
 map=L.map("vitruvian-map",{minZoom:2,maxZoom:17,scrollWheelZoom:false}).setView([39.4,20.7],4);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
 pins=L.layerGroup().addTo(map);
 // The popup is a real deep link; a capturing click handler below offers instant modal opening.
 renderMapMarkers();
}
async function start(){
 const dialog=byId("place-dossier");
 byId("dossier-close").addEventListener("click",()=>dialog.close());
 dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
 byId("place-expand").addEventListener("click",()=>{if(selected)openScientificDossier(selected.id);});
 document.addEventListener("click",event=>{const link=event.target?.closest?.("a[data-popup-place]");if(!link)return;event.preventDefault();event.stopPropagation();openScientificDossier(link.dataset.popupPlace);},true);
 byId("place-query").addEventListener("input",filter);
 for(const id of ["place-book","place-type"])byId(id).addEventListener("change",filter);
 byId("place-list").addEventListener("click",e=>{const b=e.target.closest("[data-place-id]");if(b)selectPlace(b.dataset.placeId,true,true);});
 const [rx,rg]=await Promise.all([fetch("data/onomasticon-vitruvianum.json"),fetch("data/atlas-geographicus-vitruvianus.json")]);
 if(!rx.ok||!rg.ok)throw Error("No fue posible leer los registros geográficos y filológicos.");
 const [source,geo]=await Promise.all([rx.json(),rg.json()]);
 const byGeo=new Map(geo.geo.map(x=>[x.id,x]));
 all=source.entities.filter(e=>e.kind==="place").map(r=>({...r,...(byGeo.get(r.id)||{}),latinCanonical:latinCanonical[r.id]||r.aliases?.[0]||r.name}))
 .concat(geo.extra.map(e=>({...e,lat:e.coordinates.lat,lon:e.coordinates.lon,latinCanonical:latinCanonical[e.id]||e.name})));
 all.sort((a,b)=>fold(a.latinCanonical).localeCompare(fold(b.latinCanonical),"es"));
 const requested=new URLSearchParams(location.search).get("lugar");
 selected=all.find(x=>x.id===requested)||all.find(x=>x.id==="fanum-fortunae");
 initializeMap();
 filter();
 selectPlace(selected?.id||all[0].id,false,false);
 if(new URLSearchParams(location.search).get("ficha")==="1")openScientificDossier(selected.id);
 byId("place-loading").textContent=all.length+" fichas catalogadas. Nombres latinos normalizados, formas del texto, equivalentes griegos y denominaciones modernas indicados por separado.";
}
start().catch(err=>{byId("place-loading").textContent="No se pudo cargar el catálogo: "+err.message;console.error(err);});
