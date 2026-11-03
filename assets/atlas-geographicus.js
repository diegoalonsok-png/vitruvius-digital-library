/* Atlas Geographicus Vitruvianus. Based on editorial onomasticon and contextual Fanum Fortunae.
   Points refer to approximate historical city locations, NOT precise archaeological footprints. */
const byId=(id)=>document.getElementById(id);
const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fold=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const latinCanonical={
 alexandria:"Alexandria",asia:"Asia",athens:"Athenae",babylon:"Babylon",campania:"Campania",carthage:"Carthago",corinth:"Corinthus",croton:"Croton",ephesus:"Ephesus",egypt:"Aegyptus",sparta:"Sparta",halicarnassus:"Halicarnassus",italy:"Italia",miletus:"Miletus",pergamum:"Pergamum",puteoli:"Puteoli",euphrates:"Euphrates",ganges:"Ganges",nile:"Nilus",tiber:"Tiberis",tigris:"Tigris",rhodes:"Rhodos",rome:"Roma",samos:"Samos",sicily:"Sicilia",syracuse:"Syracusae",tarentum:"Tarentum","fanum-fortunae":"Fanum Fortunae"
};
let all=[],results=[],selected=null,map=null,pins=null;
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
function renderDetails(){
 const r=selected;if(!r)return;
 byId("place-heading").innerHTML=namesMarkup(r,"div");
 byId("place-subtitle").textContent=r.modern||r.period;
 byId("place-summary").textContent=r.summary||"Descripción documental pendiente de cotejo.";
 byId("place-verification").textContent=r.confidence==="no acreditado"?"Identificación filológica pendiente":hasPoint(r)?"Punto cartográfico aproximado · certeza "+r.confidence:"Sin pin: región o río (no ubicación puntual)";
 const mt=hasPoint(r)?r.lat.toFixed(3)+"°, "+r.lon.toFixed(3)+"° (centro de referencia, no sitio arqueológico)": "No se fija coordenada puntual";
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
 circle.bindPopup('<strong>'+name+'</strong><p>Coordenadas aproximadas de ciudad o isla, no monumento.</p><button type="button" class="map-popup-select" data-popup-place="'+html(r.id)+'">Abrir ficha científica</button>');
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
 map.on("popupopen",e=>{const button=e.popup.getElement()?.querySelector("[data-popup-place]");if(button)button.addEventListener("click",()=>selectPlace(button.dataset.popupPlace,false,true));});
 renderMapMarkers();
}
async function start(){
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
 byId("place-loading").textContent=all.length+" fichas catalogadas. Nombres latinos normalizados, formas del texto, equivalentes griegos y denominaciones modernas indicados por separado.";
}
start().catch(err=>{byId("place-loading").textContent="No se pudo cargar el catálogo: "+err.message;console.error(err);});
