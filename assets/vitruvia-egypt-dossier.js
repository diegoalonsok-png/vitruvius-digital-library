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
 "ramesses-ii":[[550673,"Placa oval con nombre de Ramsés II"]]
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
function style(){
 if(document.getElementById("v-egypt-dossier-style"))return;
 const css=make("style");css.id="v-egypt-dossier-style";
 css.textContent=[
 "#vitruvia-context .v-egypt-dossier{padding:16px 0;margin:13px 0 24px;border-top:1px solid #555;min-width:0}",
 "#vitruvia-context .v-egypt-dossier h3{font:400 22px/1.3 Georgia,serif;margin:4px 0 12px}",
 "#vitruvia-context .v-egypt-dossier h4{font:400 18px/1.4 Georgia,serif;margin:19px 0 9px}",
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
 const values=[q,row?.title,row?.entityCanonical].map(N).filter(Boolean);
 return (data.rulers||[]).find(r=>[r.name,...(r.aliases||[])].some(n=>values.includes(N(n))))||null;
}
function gallery(box,ruler){
 box.append(make("h4","Fotografías de época y testimonios"));
 const recs=objects[ruler.id]||[];
 if(!recs.length){
  box.append(make("p","La ficha aún no tiene fotografías de objetos vinculadas y verificadas. Se ofrecen los catálogos y se mantiene la titulatura documentada.","v-ed-note"));
  box.append(anchor("Buscar objetos de "+ruler.name+" en The Met","https://www.metmuseum.org/art/collection/search?q="+encodeURIComponent(ruler.name)));return;
 }
 const grid=make("div",null,"v-ed-grid");
 for(const [id,title] of recs){
  const card=make("div",null,"v-ed-photo");
  card.append(anchor(title+" · abrir visor ampliado","egypt-document-viewer.html?king="+encodeURIComponent(ruler.id)+"&object="+id));
  card.append(make("small","The Metropolitan Museum of Art · ficha "+id));
  grid.append(card);
  if(!cached.has(id))cached.set(id,fetch("https://collectionapi.metmuseum.org/public/collection/v1/objects/"+id).then(r=>r.ok?r.json():null).catch(()=>null));
  cached.get(id).then(entry=>{
   if(!card.isConnected||!entry?.isPublicDomain)return;
   const src=entry.primaryImageSmall||entry.primaryImage;if(!src)return;
   try{const url=new URL(src);if(url.protocol!=="https:")return;const img=make("img");img.src=url.href;img.loading="lazy";img.alt=entry.title+" · número "+id;img.onerror=()=>img.remove();card.prepend(img)}catch{}
  });
 }
 box.append(grid);
}
function names(box,ruler){
 box.append(make("h4","Protocolo de los cinco nombres · edición disponible"));
 for(const [key,label] of keys){
  const rec=ruler.names?.[key],item=make("div",null,"v-ed-name");
  item.append(make("b",label));
  if(rec?.glyphs){const g=make("span",rec.glyphs,"v-ed-glyph"+(["nomen","prenomen"].includes(key)?" cartouche":""));g.lang="egy";item.append(g)}
  if(rec?.trans)item.append(make("p","Transliteración: "+rec.trans));
  if(rec?.gloss)item.append(make("p","Sentido: "+rec.gloss));
  if(rec?.witness)item.append(make("p","Testimonio: "+rec.witness,"v-ed-note"));
  if(!rec)item.append(make("p","Este nombre no está acreditado en el repertorio local.","v-ed-note"));
  else if(!rec.glyphs)item.append(make("p","Grafía jeroglífica pendiente de edición.","v-ed-note"));
  item.append(anchor("Examinar con lupa / inversión / contraste","egypt-document-viewer.html?king="+encodeURIComponent(ruler.id)+"&name="+key));
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
  names(box,ruler);gallery(box,ruler);books(box,ruler);
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