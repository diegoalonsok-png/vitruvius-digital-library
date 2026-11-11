/* Vitruvia · planos, secciones, elevaciones y fotos, búsqueda documental.
   Sólo enlaza material recuperado de Wikimedia Commons, con autoría, licencia y
   ficha de origen. No presenta imágenes de búsqueda como planos autenticados. */
(()=>{"use strict";
const ARCHITECTS=[
 {keys:["palladio","andrea palladio"],name:"Andrea Palladio",works:["Villa Rotonda","Basilica Palladiana","Teatro Olimpico"]},
 {keys:["le corbusier","charles edouard jeanneret"],name:"Le Corbusier",works:["Villa Savoye","Unite d Habitation","Notre Dame du Haut Ronchamp"]},
 {keys:["frank lloyd wright","wright"],name:"Frank Lloyd Wright",works:["Fallingwater","Robie House","Guggenheim Museum New York"]},
 {keys:["mies van der rohe","ludwig mies"],name:"Ludwig Mies van der Rohe",works:["Farnsworth House","Barcelona Pavilion","Seagram Building"]},
 {keys:["oscar niemeyer","niemeyer"],name:"Oscar Niemeyer",works:["Cathedral of Brasilia","Palacio da Alvorada","Niteroi Contemporary Art Museum"]},
 {keys:["eiffel","gustave eiffel"],name:"Gustave Eiffel",works:["Eiffel Tower","Garabit Viaduct","Maria Pia Bridge"]},
 {keys:["nervi","pier luigi nervi"],name:"Pier Luigi Nervi",works:["Palazzetto dello Sport Rome","Palazzo del Lavoro Turin"]},
 {keys:["torroja","eduardo torroja"],name:"Eduardo Torroja",works:["Hipodromo de la Zarzuela","Mercado de Algeciras"]},
 {keys:["candela","felix candela"],name:"Félix Candela",works:["Los Manantiales Xochimilco","Palacio de los Deportes Mexico"]},
 {keys:["calatrava","santiago calatrava"],name:"Santiago Calatrava",works:["Auditorio de Tenerife","Puente de la Mujer","Turning Torso"]}
];
const TYPES=[
 {id:"planta",name:"Plantas",terms:"floor plan architectural plan",note:"Planta arquitectónica o dibujo de distribución"},
 {id:"corte",name:"Cortes",terms:"architectural section cross section",note:"Sección o corte del edificio"},
 {id:"vista",name:"Vistas",terms:"architectural elevation facade drawing",note:"Alzado o vista arquitectónica"},
 {id:"foto",name:"Fotografías",terms:"architecture building exterior photograph",note:"Fotografía del edificio"}
];
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const structural=/(arquitect|architect|ingenier|engineer|edificio|building|museo|museum|villa|casa|house|palacio|palace|catedral|cathedral|pabellon|pavilion|puente|bridge|torre|tower|templo|temple|iglesia|church|skyscraper|rascacielos|basilica|estadio|stadium|biblioteca|library|teatro|theatre|viaducto|viaduct|construccion|construction|estacion|station|farnsworth|fallingwater|savoye|rotonda|petronas|burj khalifa)/i;
const OMIT=/^(que|quien|quién|what|who|donde|where|como|how)\s+/i;
function node(tag,cls,t){const n=document.createElement(tag);if(cls)n.className=cls;if(t!==undefined)n.textContent=t;return n}
function init(){
 const article=document.getElementById("vitruvia-article");
 if(!article||document.getElementById("vr-architecture-docs"))return;
 const panel=node("section","vr-architecture-docs");panel.id="vr-architecture-docs";panel.hidden=true;
 const heading=node("h3",null,"Planos y vistas · documentación arquitectónica");
 const description=node("p","vr-ad-note","Exploración documental: cada archivo conserva su fuente, licencia y procedencia. Los resultados no se consideran dibujos originales ni planos verificados sin cotejo.");
 const row=node("div","vr-ad-row");
 const workSelect=node("select");workSelect.setAttribute("aria-label","Elegir obra arquitectónica");
 const custom=node("input");custom.type="text";custom.placeholder="O escribir otra obra";custom.setAttribute("aria-label","Nombre de la obra a consultar");
 const go=node("button",null,"Buscar documentos");go.type="button";
 row.append(workSelect,custom,go);
 const nav=node("div","vr-ad-tabs");nav.setAttribute("role","tablist");nav.setAttribute("aria-label","Tipo de documento arquitectónico");
 const tabs=TYPES.map((t,i)=>{const b=node("button",null,t.name);b.type="button";b.setAttribute("role","tab");b.setAttribute("aria-selected",String(i===0));b.dataset.type=t.id;nav.append(b);return b});
 const tools=node("div","vr-ad-row");
 const uploadLabel=node("label","vr-ad-upload","Abrir un plano o foto local");
 const file=node("input");file.type="file";file.accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf";file.setAttribute("aria-label","Abrir plano o fotografía local");
 uploadLabel.append(file);
 const external=node("a",null,"Explorar Wikimedia Commons ↗");external.target="_blank";external.rel="noopener noreferrer";
 const clear=node("button",null,"Restablecer visor");clear.type="button";
 tools.append(uploadLabel,external,clear);
 const status=node("p","vr-ad-note");status.setAttribute("role","status");
 const viewer=node("div","vr-ad-viewer");
 const cards=node("div","vr-ad-cards");
 const foot=node("p","vr-ad-note","Los archivos de terceros se muestran únicamente con referencia a su página fuente. La escala, autoría, fecha y fidelidad del plano deben confirmarse documentalmente. La carga local no se sube al servidor.");
 panel.append(heading,description,row,nav,tools,status,viewer,cards,foot);
 article.insertAdjacentElement("afterend",panel);
 let selected=TYPES[0],artist="",currentWork="",fetchToken=0,objectURL=null;
 const paperTerms={planta:"floor plan",corte:"section drawing",vista:"elevation architectural drawing",foto:"building"};
 function selectedWork(){return custom.value.trim()||workSelect.value.trim()||artist}
 function updateExternal(){const name=selectedWork();external.href="https://commons.wikimedia.org/wiki/Special:MediaSearch?"+new URLSearchParams({type:"image",search:[name,paperTerms[selected.id]].filter(Boolean).join(" ")})}
 function activeTab(type){selected=TYPES.find(x=>x.id===type)||TYPES[0];tabs.forEach(b=>b.setAttribute("aria-selected",String(b.dataset.type===selected.id)));updateExternal();loadDocs()}
 function safeUrl(raw){try{const u=new URL(raw);return u.protocol==="https:"?u.href:null}catch{return null}}
 function clearViewer(){viewer.replaceChildren();if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null}}
 function metadata(item){
  const ext=item.imageinfo?.[0]?.extmetadata||{};
  const t=ext.ImageDescription?.value||"";
  const container=node("div","vr-ad-meta");
  const heading=node("strong",null,item.title.replace(/^File:/,""));
  const source=node("a",null,"Ficha y derechos en Wikimedia Commons ↗");source.href="https://commons.wikimedia.org/wiki/"+encodeURIComponent(item.title.replaceAll(" ","_"));source.target="_blank";source.rel="noopener noreferrer";
  const license=String(ext.LicenseShortName?.value||"Licencia no comprobada");
  const text=node("small",null,"Licencia declarada: "+license+" · Comprobar autoría, escala y procedencia en la ficha original.");
  container.append(heading,text,source);return container;
 }
 function showItem(item){
  clearViewer();const inf=item.imageinfo?.[0];const url=safeUrl(inf?.url);if(!url)return;
  const img=node("img");img.src=url;img.alt="Candidato documental: "+item.title+"; identificación por verificar";img.loading="lazy";
  const wrapper=node("div","vr-ad-mainimage");wrapper.append(img);viewer.append(wrapper,metadata(item));viewer.scrollIntoView({block:"nearest",behavior:"smooth"});
 }
 async function loadDocs(){
  const work=selectedWork();const token=++fetchToken;
  cards.replaceChildren();clearViewer();
  if(!work){status.textContent="Seleccioná una obra o escribí su nombre.";return}
  status.textContent="Consultando archivos relacionados con «"+work+"»…";
  updateExternal();
  const search=[work,selected.terms].join(" ");
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const url="https://commons.wikimedia.org/w/api.php?"+new URLSearchParams({
    action:"query",generator:"search",gsrsearch:search,gsrnamespace:"6",gsrlimit:"12",prop:"imageinfo",
    iiprop:"url|extmetadata",iiurlwidth:"420",format:"json",origin:"*"
   });
   const res=await fetch(url,{signal:controller.signal,referrerPolicy:"no-referrer"});
   if(!res.ok)throw Error("HTTP "+res.status);
   const json=await res.json();if(token!==fetchToken)return;
   const options=Object.values(json.query?.pages||{}).filter(x=>x.imageinfo?.[0]?.url&&/\.(?:jpe?g|png|webp|svg)$/i.test(x.title));
   status.textContent=options.length?options.length+" archivos candidatos de Wikimedia Commons. Verificá la tipología y autoría de cada documento antes de citarlo.":"No se localizaron archivos para esta combinación. Probá otro título o abrí la búsqueda externa.";
   options.slice(0,8).forEach(item=>{
    const card=node("button","vr-ad-card");card.type="button";
    const img=node("img");img.loading="lazy";img.alt=item.title.replace(/^File:/,"");img.src=safeUrl(item.imageinfo[0].thumburl||item.imageinfo[0].url)||"";
    card.append(img,node("span",null,item.title.replace(/^File:/,"")));card.addEventListener("click",()=>showItem(item));cards.append(card);
   });
   if(options.length)showItem(options[0]);
  }catch(error){if(token===fetchToken)status.textContent="No se pudieron cargar imágenes externas. Podés consultar la fuente mediante el enlace de Wikimedia Commons o abrir un archivo local."}
  finally{clearTimeout(timer)}
 }
 tabs.forEach(b=>b.addEventListener("click",()=>activeTab(b.dataset.type)));
 go.addEventListener("click",loadDocs);
 workSelect.addEventListener("change",()=>{custom.value="";loadDocs()});
 custom.addEventListener("change",loadDocs);
 file.addEventListener("change",()=>{
  const f=file.files?.[0];if(!f)return;
  if(!["image/png","image/jpeg","image/webp","image/svg+xml","application/pdf"].includes(f.type)||f.size>10000000){status.textContent="Formato no admitido o tamaño superior a 10 MB.";return}
  ++fetchToken;clearViewer();cards.replaceChildren();objectURL=URL.createObjectURL(f);
  if(f.type==="application/pdf"){
   const iframe=node("iframe");iframe.title="Documento PDF local: "+f.name;iframe.src=objectURL;iframe.setAttribute("sandbox","allow-same-origin");viewer.append(iframe);
  }else{const img=node("img");img.src=objectURL;img.alt="Documento local: "+f.name;viewer.append(img)}
  viewer.append(node("p","vr-ad-note","Archivo local: "+f.name+" · No publicado ni verificado por Vitruvia."));
  status.textContent="Vista previa local disponible. El archivo permanece en tu navegador.";
 });
 clear.addEventListener("click",()=>{file.value="";loadDocs()});
 const qInput=document.getElementById("query");
 let activeQuery="";
 function sync(query,force=false){
  const q=String(query||"").trim();if(!force&&activeQuery===q)return;activeQuery=q;
  const lower=normalize(q),p=ARCHITECTS.find(a=>a.keys.some(k=>lower.includes(normalize(k))));
  const relevant=!!p||structural.test(lower);
  panel.hidden=!relevant;
  if(!relevant){++fetchToken;clearViewer();cards.replaceChildren();return}
  artist=p?.name||q.replace(OMIT,"");
  workSelect.replaceChildren();
  const defaults=p?.works||[q.replace(OMIT,"")];
  defaults.forEach(w=>{const o=node("option",null,w);o.value=w;workSelect.append(o)});
  custom.value="";updateExternal();loadDocs();
 }
 function query(){return new URLSearchParams(location.search).get("q")||qInput?.value||""}
 window.addEventListener("vitruvia:search",e=>sync(e.detail?.query||query()));
 document.getElementById("search-form")?.addEventListener("submit",()=>setTimeout(()=>sync(qInput?.value||query(),true),120));
 window.addEventListener("popstate",()=>sync(query(),true));
 sync(query(),true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();