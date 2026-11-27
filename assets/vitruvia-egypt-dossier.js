/* Dossier egiptológico: solo nombres acreditados y vínculos externos verificados. */
(()=>{"use strict";
const rail=document.getElementById("vitruvia-context");if(!rail)return;
const N=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N} ]/gu," ").replace(/\s+/g," ").trim();
const make=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined&&text!==null)x.textContent=text;if(cls)x.className=cls;return x};
const anchor=(label,url)=>{const x=make("a",label);x.href=url;x.target="_blank";x.rel="noopener noreferrer";return x};
const keys=[["horus","Nombre de Horus · serej"],["nebty","Dos Señoras (Nebty)"],["golden","Horus de Oro"],["prenomen","Nombre de trono · cartucho"],["nomen","Nombre personal · cartucho"]];
const objects={
 akhenaten:[[550057,"Cartucho de Ajenatón"],[550052,"Cartuchos de Atón, Ajenatón y Nefertiti"],[550050,"Relieve con cartucho de Ajenatón"]],
 tutankhamun:[[567851,"Molde del cartucho de Tutankamón"],[558596,"Objetos de papiro de su cámara de embalsamamiento (no son un texto)"]],
 "ramesses-ii":[[550673,"Placa oval con nombre de Ramsés II"]],
 "senusret-i":[[546634,"Concha con cartucho de Senusret I · Reino Medio o posterior"]],
 "amenhotep-iii":[[551411,"Escarabeo con nombre de Amenhotep III"]],
 "thutmose-iii":[[553431,"Placa con nombre de trono Menkheperra"]],
 alexander:[[551617,"Cartucho de Alejandro III o Alejandro IV · atribución incierta"]]
};
const general=[
 ["Ancient Egypt: A Social History · B. G. Trigger et al. · Cambridge University Press","https://www.cambridge.org/core/books/abs/ancient-egypt/preface/244674ECA906397317FBFCCF217FBA0C"],
 ["The Cambridge Ancient History · historia general y contexto","https://www.cambridge.org/core/books/cambridge-ancient-history/376E0FA4571D5D43CD3F3EC79586304D"],
 ["Online Egyptological Bibliography · Griffith Institute, Oxford","https://oeb.griffith.ox.ac.uk/"],
 ["UCLA Encyclopedia of Egyptology · artículos científicos","https://www.uee.ucla.edu/"]
];
const amarna=[
 ["Emily Teeter · The Amarna Period · Cambridge University Press, 2011, DOI: 10.1017/CBO9780511780462.015","https://doi.org/10.1017/CBO9780511780462.015"],
 ["The Amarna Letters and the Scribes Who Wrote Them · Cambridge University Press","https://www.cambridge.org/core/books/amarna-letters-and-the-scribes-who-wrote-them/78F95E78B9D3D3EA359169BBAA44F760"]
];
const ramses=[
 ["R. O. Faulkner · Egypt: From the Inception of the Nineteenth Dynasty to the Death of Ramesses III · Cambridge","https://www.cambridge.org/core/books/abs/cambridge-ancient-history/egypt-from-the-inception-of-the-nineteenth-dynasty-to-the-death-of-ramesses-iii/FD2F444A0AD10F6D81418F79F2FC9695"],
 ["Papiro del Libro de los Muertos de Neferrenpet · época de Ramsés II (no autógrafo del rey) · Global Egyptian Museum","https://www.globalegyptianmuseum.org/detail.aspx?id=743"]
];
const tut=[
 ["W. M. Flinders Petrie · Tut.ankh.amen · Cambridge, reedición de estudio histórico","https://www.cambridge.org/core/books/abs/history-of-egypt/tutankhamen/C5AC4DB1F5B4823852CF7D7126FBE1C3"],
 ["H. W. Fairman · Tutankhamun and the end of the 18th Dynasty · Antiquity 46 (1972) · DOI 10.1017/S0003598X00053096","https://doi.org/10.1017/S0003598X00053096"]
];
const links=[
 ["Thesaurus Linguae Aegyptiae · textos y léxico","https://thesaurus-linguae-aegyptiae.de/"],
 ["UCL Digital Egypt · museos y arqueología","https://www.ucl.ac.uk/museums-static/digitalegypt/"],
 ["Griffith Institute / Oxford · TopBib","https://topbib.griffith.ox.ac.uk/"],
 ["ISAC University of Chicago · repertorios y epigrafía","https://isac.uchicago.edu/"]
];
let q=new URLSearchParams(location.search).get("q")||"",row=null,registry=null,pending=false,generation=0;
const cached=new Map();
const ROYAL_ARCHITECTURE={
 akhenaten:[
  {name:"Gran Templo de Atón (Ajetatón)",query:"Great Aten Temple Amarna",attribution:"Arquitectura religiosa del período de Akenatón; los dibujos modernos deben identificarse como reconstrucciones."},
  {name:"Ajetatón · trazado de la ciudad",query:"Amarna Akhetaten city archaeological plan",attribution:"Capital fundada durante el reinado; planos arqueológicos y fotografías de yacimientos."}
 ],
 tutankhamun:[
  {name:"Tumba KV62 · Valle de los Reyes",query:"Tutankhamun tomb KV62",attribution:"Sepultura del rey, no prueba de que ordenara su construcción; distinguir planta levantada y reconstrucción."},
  {name:"Relieves de la columnata de Luxor",query:"Luxor Temple Tutankhamun colonnade relief",attribution:"Decoración vinculada al reinado; el templo no es una construcción íntegra de Tutankamón."}
 ],
 "ramesses-ii":[
  {name:"Gran Templo de Abu Simbel",query:"Abu Simbel Great Temple Ramses II",attribution:"Templo rupestre del reinado de Ramsés II."},
  {name:"Ramesseum · templo funerario",query:"Ramesseum Ramesses II",attribution:"Complejo funerario asociado a Ramsés II."},
  {name:"Templo de Luxor · ampliaciones",query:"Luxor Temple Ramesses II pylon courtyard",attribution:"Patio y pilono del reinado; no se atribuye a Ramsés II el templo completo."}
 ]
};
// Institutional documentation is shown before any general image discovery.
const ROYAL_PRIMARY={
 "narmer":[{"title":"Paleta de Narmer","kind":"Testimonio epigráfico e iconográfico","note":"Nombre en serej; no constituye un relato escrito continuo.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/narmer.html","reading":"Ficha y testimonios · UCL"}],
 "djoser":[{"title":"Impresiones de sello de Hesyra","kind":"Testimonio del nombre real","note":"Consultar la referencia arqueológica de Quibell, 1913; no se ofrece una traducción inexistente.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/kingdjoser.html","reading":"Repertorio de testimonios · UCL"}],
 "khufu":[{"title":"Sellos e improntas de Guiza","kind":"Testimonios de identificación regia","note":"Incluye sello UC 11099; distinguir nombre real y texto narrativo.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/kingkheops.html","reading":"Ficha y referencias · UCL"}],
 "khafre":[{"title":"Improntas de sellos de Guiza","kind":"Testimonio epigráfico","note":"Referencia de Kromer, 1978, recogida por UCL.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/kingkhephren.html","reading":"Repertorio · UCL"}],
 "menkaure":[{"title":"Testimonios del reinado","kind":"Catálogo epigráfico y arqueológico","note":"No se atribuyen textos funerarios posteriores al rey.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/kingmykerinos.html","reading":"Ficha de autoridad · UCL"}],
 "amenemhat-i":[{"title":"Enseñanza de Amenemhat I","kind":"Composición literaria transmitida en manuscritos posteriores","note":"Discurso literario en voz del rey; no autógrafo.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/literature/teachingamenemhati.html","reading":"Texto y traducciones · UCL"},
{"title":"Inscripción rupestre de Elefantina","kind":"Epigrafía real","note":"Fotografías y registro de inscripciones en la región de Asuán.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/assuan/rockinscriptions.html","reading":"Testimonios epigráficos · UCL"}],
 "senusret-i":[{"title":"Enseñanza de Amenemhat I · sección I","kind":"Texto literario dirigido a Senusret I","note":"No es composición de Senusret I. Edición con transliteración y traducción inglesa.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/literature/teachinga1sec1.html","reading":"Lectura de la sección · UCL"},
{"title":"Inscripciones rupestres de Asuán","kind":"Testimonio del reinado","note":"Consultar las inscripciones identificadas por el repertorio.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/assuan/rockinscriptions.html","reading":"Fotografías y ficha · UCL"}],
 "hatshepsut":[{"title":"Inscripciones del obelisco de Karnak","kind":"Epigrafía monumental","note":"Referencia al discurso dirigido a la posteridad; traducción íntegra aún no incorporada.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/hatshepsut.html","reading":"Catálogo de inscripciones · UCL"},
{"title":"Speos Artemidos","kind":"Inscripción real en el santuario de Pakhet","note":"Referencia Sethe 1906, pp. 383–391.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/hatshepsut.html","reading":"Referencia epigráfica · UCL"}],
 "thutmose-iii":[{"title":"Depósito fundacional de Coptos","kind":"Inscripción breve en objeto arqueológico","note":"Traducción castellana editorial de la lectura publicada en UCL.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/koptos/foundation.html","reading":"Fotografía y traducción inglesa · UCL","excerpt":"Menkheperra, amado del de Coptos."},
{"title":"Anales e inscripciones de Karnak","kind":"Epigrafía histórica","note":"Documentación de campañas, donaciones y construcciones; consultar referencias a Sethe.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/thutmosisiii.html","reading":"Repertorio de inscripciones · UCL"}],
 "amenhotep-iii":[{"title":"Escarabeos conmemorativos","kind":"Inscripciones regias","note":"Incluyen textos sobre la caza y el lago de Tiy, con traducciones inglesas.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/seals/comm.html","reading":"Fotografías y traducciones · UCL"},
{"title":"Monumentos e inscripciones del reinado","kind":"Epigrafía monumental","note":"Consultar bibliografía y testimonios de la ficha.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/amenhotepiii.html","reading":"Repertorio · UCL"}],
 "seti-i":[{"title":"Inscripciones del templo de Abidos","kind":"Epigrafía religiosa y real","note":"Referencia Kitchen 1975, pp. 129–199; no se ofrece texto completo local.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/setyi.html","reading":"Referencias epigráficas · UCL"},
{"title":"Lista real de Abidos","kind":"Inscripción de culto a los antepasados","note":"Selección antigua de predecesores, no lista exhaustiva de todos los faraones.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/ideology/king/cultspecial.html","reading":"Contexto documental · UCL"}],
 "alexander":[{"title":"Bloque con cartucho de Alejandro","kind":"Testimonio epigráfico de atribución incierta","note":"The Met contempla Alejandro III o Alejandro IV; no identificarlo definitivamente con Alejandro Magno.","url":"https://www.metmuseum.org/art/collection/search/551617","reading":"Ficha institucional · The Met"}],
 "cleopatra":[{"title":"Testimonios de Cleopatra VII","kind":"Repertorio histórico y arqueológico","note":"Consultar testimonios y bibliografía del reinado; no atribuirle textos de otras Cleopatras.","url":"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/cleopatravii.html","reading":"Ficha · UCL"}],

 akhenaten:[
  {title:"Gran Himno a Atón",kind:"Himno religioso · tumba de Ay (TA25)",note:"Composición vinculada al culto de Atón. No se afirma autoría personal del rey.",url:"https://www.ucl.ac.uk/museums-static/digitalegypt/amarna/belief.html",reading:"Transliteración y traducción inglesa · UCL Digital Egypt"},
  {title:"Estelas fronterizas de Ajetatón",kind:"Inscripción real · proclamaciones",note:"Edición basada principalmente en la estela S; distingue inscripción de traducción.",url:"https://www.ucl.ac.uk/museums-static/digitalegypt/amarna/boundary.html",reading:"Transliteración y traducción inglesa · UCL Digital Egypt",witness:"https://www.amarnaproject.com/amarna-the-place/boundary-stelae/"}
 ],
 tutankhamun:[
  {title:"Estela de la Restauración",kind:"Inscripción real · restauración de cultos",note:"Referencia epigráfica Sethe 1957: 2025–2032. La traducción completa todavía no está incorporada.",url:"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/tutankhamun.html",reading:"Ficha y referencia epigráfica · UCL"}
 ],
 "ramesses-ii":[
  {title:"Qadesh · Papiro Sallier III",kind:"Relato regio · testimonio manuscrito",note:"British Museum ESA 10181. Texto vinculado al reinado, no autógrafo real. Traducción completa pendiente de incorporación.",url:"https://www.ucl.ac.uk/museums-static/digitalegypt/writing/library/ram.html",reading:"Registro del manuscrito · UCL"},
  {title:"Libro de los Muertos",kind:"Corpus funerario · contexto religioso",note:"No se atribuye su composición a Ramsés II. Consultar cada testimonio y su datación.",url:"https://www.ucl.ac.uk/museums-static/digitalegypt/literature/religious/bdbynumber.html",reading:"Índice por fórmulas y traducciones disponibles · UCL"}
 ]
};
const ROYAL_PLANS={
 akhenaten:[
  ["Gran Templo de Atón","Plantas y levantamientos arqueológicos","Amarna Project","https://www.amarnaproject.com/our-work/excavation-and-survey/great-aten-temple-background/"],
  ["Ajetatón","Cartografía arqueológica e histórica","Amarna Project","https://www.amarnaproject.com/mapping-amarna/"]
 ],
 tutankhamun:[
  ["KV62","Planta de Carter · MSS i.G.4","Griffith Institute, Oxford","https://tutankhamun.griffith.ox.ac.uk/maps-plans-sketches-drawings/carter-mss-ig4"],
  ["KV62","Plantas, cortes y dibujos del archivo Carter","Griffith Institute, Oxford","https://tutankhamun.griffith.ox.ac.uk/maps-plans-sketches-drawings"],
  ["KV62","Planta y cortes acotados · lámina PDF","Theban Mapping Project","https://thebanmappingproject.com/sites/default/files/plans/KV62_1.pdf"]
 ],
 "ramesses-ii":[
  ["KV7 · sepultura real","Planta, cortes y alzados · lámina PDF","Theban Mapping Project","https://thebanmappingproject.com/sites/default/files/plans/KV07_0.pdf"]
 ]
};
function dossierContents(box){
 const sections=[...box.querySelectorAll(":scope > h4")];
 if(!sections.length)return;
 const nav=make("nav",null,"v-ed-contents");nav.setAttribute("aria-label","Índice del dossier egiptológico");
 nav.append(make("b","Contenido"));
 const ul=make("ol");
 sections.forEach((h,i)=>{h.id="v-egypt-dossier-section-"+(i+1);const a=make("a",h.textContent);a.href="#"+h.id;const li=make("li");li.append(a);ul.append(li)});
 nav.append(ul);box.children[1].after(nav);
}
function primaryTexts(box,ruler){
 box.append(make("h4","Textos religiosos, inscripciones y traducciones"));
 const records=ROYAL_PRIMARY[ruler.id]||[];
 if(!records.length){box.append(make("p","No se ha incorporado un texto con atribución y traducción verificadas para este rey. Consultar el repertorio epigráfico, sin asignar textos por coincidencia de nombre.","v-ed-note"));return}
 for(const r of records){const item=make("section",null,"v-ed-name");item.append(make("b",r.title),make("p",r.kind),make("p",r.note,"v-ed-note"),anchor(r.reading,r.url));if(r.excerpt){const text=make("blockquote",r.excerpt);item.append(make("p","Traducción castellana · fragmento editorial","v-ed-note"),text)}if(r.title==="Gran Himno a Atón")item.append(anchor("Leer aquí · jeroglíficos y traducciones","vitruvia.html?q="+encodeURIComponent(r.title)+"&mode=all"));if(r.witness)item.append(anchor("Fotografías y documentación del testimonio",r.witness));box.append(item)}
}
const ROYAL_DRAWING_TYPES=[
 {label:"Plantas",suffix:"architectural plan"},
 {label:"Cortes",suffix:"section drawing"},
 {label:"Vistas",suffix:"elevation reconstruction"},
 {label:"Fotografías",suffix:"photograph"}
];
function style(){
 if(document.getElementById("v-egypt-dossier-style"))return;
 const css=make("style");css.id="v-egypt-dossier-style";
 css.textContent=[
 "#vitruvia-context .v-egypt-dossier{padding:16px 0;margin:13px 0 24px;border-top:1px solid #555;min-width:0}",
 "#vitruvia-context .v-egypt-dossier h3{font:400 22px/1.3 Georgia,serif;margin:4px 0 12px}",
 "#vitruvia-context .v-egypt-dossier h4{font:400 18px/1.4 Georgia,serif;margin:19px 0 9px;scroll-margin-top:90px}",
 "#vitruvia-context .v-ed-contents{font:12px/1.65 system-ui,sans-serif;border:1px solid #777;padding:10px 12px;margin:10px 0}#vitruvia-context .v-ed-contents ol{margin:6px 0;padding-left:19px}#vitruvia-context .v-ed-contents a{color:inherit;text-decoration:underline}",
 "#vitruvia-context .v-egypt-dossier .v-ed-note{font-size:12px;line-height:1.55;opacity:.8}",
 "#vitruvia-context .v-ed-name{border-left:3px solid #888;border-bottom:1px solid #484848;margin:6px 0;padding:9px 11px;min-width:0}",
 "#vitruvia-context .v-ed-name b{display:block;font-size:12px}",
 "#vitruvia-context .v-ed-name p{margin:4px 0;font-size:12px}",
 "#vitruvia-context .v-ed-glyph{font:normal 35px/1.6 'Noto Sans Egyptian Hieroglyphs','Egyptian Text',serif;overflow-wrap:anywhere}",
 "#vitruvia-context .v-ed-glyph.cartouche{display:inline-block;border:2px solid currentColor;border-radius:45% / 35%;padding:4px 10px}",
 "#vitruvia-context .v-ed-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}",
 "#vitruvia-context .v-ed-photo{border:1px solid #474747;padding:8px;min-width:0}",
 "#vitruvia-context .v-ed-photo img{display:block;width:100%;height:170px;object-fit:contain;background:#161616}",
 "#vitruvia-context .v-ed-photo a,#vitruvia-context .v-ed-name a{display:block;color:inherit;font-size:12px;line-height:1.55;text-decoration:underline}",
 "#vitruvia-context .v-ed-library a{display:block;color:inherit;border-bottom:1px solid #383838;padding:8px 0;font-size:12px;line-height:1.6;text-decoration:underline}",
 "#vitruvia-context .v-egypt-side .vitruvia-dynasty-tree{max-height:none!important;overflow:visible!important}",
 "#vitruvia-context .v-egypt-side .vitruvia-dynasty-tree .lx-tree-head{border-color:#777;background:rgba(140,140,140,.09);padding:10px 12px}",
 "@media(max-width:540px){#vitruvia-context .v-ed-grid{grid-template-columns:1fr}}"
 ].join("\n");document.head.append(css);
}
function findRuler(data){
 const values=[q,row?.title,row?.entityCanonical].map(N).map(v=>v.replace(/^(?:(?:biografia|vida|historia|rey|faraon|king|pharaoh|roi)\s+(?:de\s+)?)+/,"")).filter(Boolean);
 return (data.rulers||[]).find(r=>[r.name,...(r.aliases||[])].some(n=>values.includes(N(n))))||null;
}
function gallery(box,ruler){
 box.append(make("h4","Fotografías actuales de testimonios antiguos y cartuchos"));
 const recs=objects[ruler.id]||[];
 if(!recs.length){
  box.append(make("p","La ficha aún no tiene fotografías de objetos vinculadas y verificadas. Se ofrecen los catálogos y se mantiene la titulatura documentada.","v-ed-note"));
  box.append(anchor("Buscar objetos de "+ruler.name+" en The Met","https://www.metmuseum.org/art/collection/search?q="+encodeURIComponent(ruler.name)));return;
 }
 const grid=make("div",null,"v-ed-grid");
 for(const [id,title] of recs){
  const card=make("div",null,"v-ed-photo");
  card.append(anchor(title+" · abrir visor ampliado","egypt-document-viewer.html?king="+encodeURIComponent(ruler.id)+"&object="+id));
  card.append(make("small","The Metropolitan Museum of Art · ficha "+id),anchor("Ficha institucional y procedencia","https://www.metmuseum.org/art/collection/search/"+id));
  grid.append(card);
  if(!cached.has(id))cached.set(id,fetch("https://collectionapi.metmuseum.org/public/collection/v1/objects/"+id).then(r=>r.ok?r.json():null).catch(()=>null));
  cached.get(id).then(entry=>{
   if(!card.isConnected||!entry?.isPublicDomain)return;
   if(entry.accessionNumber||entry.objectNumber)card.append(make("small","Inventario: "+(entry.accessionNumber||entry.objectNumber)));
   if(entry.creditLine)card.append(make("small",entry.creditLine+" · dominio público"));
   const src=entry.primaryImageSmall||entry.primaryImage;if(!src)return;
   try{const url=new URL(src);if(url.protocol!=="https:")return;const img=make("img");img.src=url.href;img.loading="lazy";img.alt=entry.title+" · número "+id;img.onerror=()=>img.remove();card.prepend(img)}catch{}
  });
 }
 box.append(grid);
 if(ruler.id==="ramesses-ii"){
  box.append(anchor("Papiro de Hunefer · dinastía XIX · abrir visor, ampliar e invertir (contexto de época; no autógrafo regio)","egypt-document-viewer.html?king=ramesses-ii&document=papyrus-hunefer"));
 }
}
function royalBuildingCatalogue(box,ruler){
 box.append(make("h4","Construcciones del reinado · plantas, cortes y fotografías"));
 const plans=ROYAL_PLANS[ruler.id]||[];
 if(plans.length){const sources=make("div",null,"v-ed-library");for(const [name,kind,credit,url] of plans){const a=anchor(name+" · "+kind+" · "+credit,url);sources.append(a)}box.append(sources)}
 const items=ROYAL_ARCHITECTURE[ruler.id]||[];
 if(!items.length){
  box.append(make("p","No hay edificios atribuidos y cotejados en el repertorio local para esta identidad. No se atribuyen monumentos por semejanza del nombre.","v-ed-note"));
  return;
 }
 const wrap=make("div",null,"v-ed-buildings");
 for(const item of items){
  const block=make("section",null,"v-ed-building"),title=make("h5",item.name);
  block.append(title,make("p",item.attribution,"v-ed-note"));
  const buttons=make("div",null,"v-ed-building-tools");
  const gallery=make("div",null,"v-ed-building-gallery");
  const status=make("p","Elige un tipo de documento. Cada imagen deberá verificarse en su ficha de origen.","v-ed-note");
  block.append(buttons,status,gallery);wrap.append(block);
  let version=0;
  for(const kind of ROYAL_DRAWING_TYPES){
   const btn=make("button",kind.label);btn.type="button";
   btn.addEventListener("click",async()=>{
    const my=++version;
    gallery.replaceChildren();
    status.textContent="Consultando el archivo de imágenes…";
    for(const b of buttons.children)b.setAttribute("aria-pressed",String(b===btn));
    const term=item.query+" "+kind.suffix;
    const searchLink="https://commons.wikimedia.org/wiki/Special:MediaSearch?"+new URLSearchParams({type:"image",search:term});
    const api="https://commons.wikimedia.org/w/api.php?"+new URLSearchParams({
     action:"query",generator:"search",gsrsearch:term,gsrnamespace:"6",gsrlimit:"12",
     prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"320",format:"json",origin:"*"
    });
    try{
     const resp=await fetch(api);if(!resp.ok)throw Error("HTTP "+resp.status);
     const data=await resp.json();if(my!==version||!block.isConnected)return;
     const words=item.query.toLowerCase().split(/\s+/).filter(w=>w.length>4);
     const found=Object.values(data.query?.pages||{}).filter(p=>{
      const title=String(p.title||"").toLowerCase(),img=p.imageinfo?.[0];
      return img?.url&&/\.(jpe?g|png|webp|svg)$/i.test(title)&&words.some(w=>title.includes(w));
     }).slice(0,4);
     status.replaceChildren();
     status.append(document.createTextNode(found.length?
      "Archivos candidatos · comprobar monumento, autoría, fecha, escala y licencia. ":
      "No se hallaron documentos atribuibles con suficiente precisión. "));
     status.append(anchor("Consultar catálogo completo",searchLink));
     for(const entry of found){
      const figure=make("figure",null,"v-ed-building-figure"),img=make("img");
      img.src=entry.imageinfo[0].thumburl||entry.imageinfo[0].url;
      img.loading="lazy";img.alt="Documento candidato: "+entry.title;
      const link=anchor("Ficha original y licencia","https://commons.wikimedia.org/wiki/"+encodeURIComponent(entry.title.replace(/ /g,"_")));
      figure.append(img,make("figcaption",entry.title.replace(/^File:/,"")+" · sin autenticación editorial del plano"),link);
      gallery.append(figure);
     }
    }catch{
     if(my===version){status.replaceChildren();status.append(document.createTextNode("Archivo temporalmente no disponible. "),anchor("Explorar documentos",searchLink))}
    }
   });
   buttons.append(btn);
  }
  const styles=make("style");
  styles.textContent="#vitruvia-context .v-ed-building{padding:12px 0;border-top:1px solid #444}#vitruvia-context .v-ed-building h5{font:500 16px/1.4 Georgia,serif;margin:0 0 7px}#vitruvia-context .v-ed-building-tools{display:flex;gap:5px;flex-wrap:wrap;margin:12px 0}#vitruvia-context .v-ed-building-tools button{background:transparent;color:inherit;border:1px solid #6a6a6a;border-radius:5px;padding:7px 9px;cursor:pointer}#vitruvia-context .v-ed-building-tools button[aria-pressed=true]{background:#454545;color:#fff}#vitruvia-context .v-ed-building-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}#vitruvia-context .v-ed-building-figure{margin:0;min-width:0}#vitruvia-context .v-ed-building-figure img{display:block;width:100%;height:130px;object-fit:contain}#vitruvia-context .v-ed-building-figure figcaption{font-size:11px;line-height:1.5}";
  block.append(styles);
 }
 box.append(wrap);
}
function names(box,ruler){
 box.append(make("h4","Protocolo de los cinco nombres · edición disponible"));
 for(const [key,label] of keys){
  const rec=ruler.names?.[key],item=make("div",null,"v-ed-name");
  item.append(make("b",label));
  if(rec?.glyphs){const g=make("span",rec.glyphs,"v-ed-glyph"+(["nomen","prenomen"].includes(key)?" cartouche":""));g.lang="egy";if(window.HieroRender?.render)g.replaceChildren(window.HieroRender.render(rec.glyphs,{size:"35px"}));item.append(g)}
  if(rec?.trans)item.append(make("p","Transliteración: "+rec.trans));
  if(rec?.gloss)item.append(make("p","Traducción / interpretación al castellano: "+rec.gloss));
  if(rec?.witness)item.append(make("p","Testimonio: "+rec.witness,"v-ed-note"));
  if(!rec)item.append(make("p","Este nombre no está acreditado en el repertorio local.","v-ed-note"));
  else if(!rec.glyphs){item.append(make("p","Grafía jeroglífica pendiente de edición; no reconstruida.","v-ed-note"));if(objects[ruler.id]?.length)item.append(anchor("Consultar fotografías de testimonios (comprobar qué nombre contienen)","egypt-document-viewer.html?king="+encodeURIComponent(ruler.id)));}
  if(rec?.glyphs||rec?.trans)item.append(anchor("Examinar la lectura con lupa / inversión / contraste","egypt-document-viewer.html?king="+encodeURIComponent(ruler.id)+"&name="+key));
  box.append(item);
 }
 box.append(make("p","Solo prenomen y nomen se representan dentro de cartuchos. Las glosas de nombres no equivalen a traducción de un papiro o inscripción completa.","v-ed-note"));
}
function books(box,ruler){
 box.append(make("h4","Libros y bibliografía académica"));
 const extra=["akhenaten","amenhotep-iii","tutankhamun"].includes(ruler.id)?amarna:[];
 const out=[...extra,...(ruler.id==="tutankhamun"?tut:[]),...(["seti-i","ramesses-ii"].includes(ruler.id)?ramses:[]),...general];
 const body=make("div",null,"v-ed-library"),done=new Set();
 for(const [title,url] of [...out,...links])if(!done.has(url)){done.add(url);body.append(anchor(title,url))}
 box.append(body);
 box.append(make("p","Bibliografía curada y bibliotecas de investigación, no inventario exhaustivo. Cambridge puede requerir acceso universitario.","v-ed-note"));
}
async function render(){
 const token=++generation;if(!q)return;
 try{
  registry??=await fetch("data/vitruvia/titulaturae.json").then(r=>r.ok?r.json():null);
  if(token!==generation||!registry)return;
  const ruler=findRuler(registry);
  rail.querySelector("#v-egypt-scholar-dossier")?.remove();
  if(!ruler)return;
  style();
  const box=make("section",null,"v-egypt-dossier");box.id="v-egypt-scholar-dossier";
  box.append(make("h3",ruler.name+" · dossier real"));
  box.append(make("p",[ruler.dynasty,ruler.dates].filter(Boolean).join(" · "),"v-ed-note"));
  names(box,ruler);primaryTexts(box,ruler);gallery(box,ruler);royalBuildingCatalogue(box,ruler);books(box,ruler);dossierContents(box);
  const before=rail.querySelector("#v-egypt-side");
  if(before)before.insertAdjacentElement("afterend",box);else rail.prepend(box);
  rail.hidden=false;
 }catch{}
}
function refresh(){
 if(pending)return;pending=true;
 requestAnimationFrame(()=>{pending=false;if(!q)return;if(!rail.querySelector("#v-egypt-scholar-dossier"))void render()});
}
window.addEventListener("vitruvia:search",e=>{q=e.detail?.query||"";row=null;rail.querySelector("#v-egypt-scholar-dossier")?.remove();refresh()});
window.addEventListener("vitruvia:featured-result",e=>{q=e.detail?.query||q;row=e.detail?.row||null;void render()});
window.addEventListener("vitruvia:results",e=>{q=e.detail?.query||q;row=(e.detail?.rows||[])[0]||row;void render()});
new MutationObserver(m=>{if(m.some(e=>e.type==="childList")&&!rail.querySelector("#v-egypt-scholar-dossier"))refresh()}).observe(rail,{childList:true});
if(q)refresh();
})();