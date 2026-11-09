/* Vitruvia Egyptian scripts: live source-led script viewer. No invented readings.
 * Unicode signs are editorial encodings, never described as facsimiles.
 */
(()=>{"use strict";
const OLD_EGYPT=/(?:ancient egypt|egipto antiguo|antiguo egipto|egyptolog|egiptolog|fara[oó]n|pharaoh|akhenat|akenat|ajenat|akhnat|amenhotep|amenofis|amenophis|tutankh|tutankam|tutanj|rams[eé]s|ramess|rameses|nefertiti|hatshepsut|tutmosis|thutmose|cleopatra|ptolema|hieroglyph|jerogl[ií]fic|atem?ismo|at[oó]n|akh?etat[oó]n|dinast[ií]a egipcia|pir[aá]mide de egipto|saqqara|sakkara|abidos|abydo|karnak|luxor.*templo|templo.*luxor|osiris|isis.*egip|horus|ra.*dios|anubis|papiro.*egip|estela.*egip|libro de los muertos|book of the dead|reino antiguo|imperio nuevo.*egip)/i;
const EGYPT_NAME=/(?:ankh|esfinge|sphinx|maat|ma.at|thoth|toth|dyehuty|sobek|sekhmet|hathor|hator|bastet|neftis|nephthys|am[oó]n|amun|ptah|khonsu|jnum|khnum|isis|osiris|horus|anubis|serapis|imhotep|hieratic|hier[aá]tico|dem[oó]tico egipcio|amarna|memfis|menfis|tebas|giza|guiza|fil[eé]|philae|as[uú]an|aswan|elefantina|tanis|abu simbel|edfu|dendera|kom ombo|merneptah|seti [ivx]|jufu|khufu|keops|kefr[eé]n|khafre|micerino|menkaure|rosetta stone|piedra de roseta|narmer|horemheb|amenemhat|seneferu|pep[iy] [ivx]|psam[eé]tico|psamtik|necao|necho)/i;
const SOURCE_EGYPT=/(?:ancient egypt|antiguo egipto|egipto antiguo|egyptian pharaoh|fara[oó]n|egiptolog|egyptolog|egyptian god|dios egipcio|diosa egipcia|ancient egyptian|mitolog[ií]a egipcia|egyptian mythology|temple in egypt|templo egipcio|jerogl[ií]fico|hieroglyph)/i;
const MODERN_EGYPT=/(?:egipto moderno|modern egypt|egipto\b|egypt\b|el cairo|cairo|al[- ]qahira|alejandr[ií]a|alexandria|árabe egipcio|arabe egipcio|egyptian arabic|egipcio contempor|misr|miṣr|القاهرة|مصر|الإسكندرية)/i;
const GLYPH=/[\u{13000}-\u{1345F}]/u;
const RUN=/[\u{13000}-\u{1345F}](?:[\u{13000}-\u{1345F}]|[ \n](?=[\u{13000}-\u{1345F}])){0,90}/gu;
const ORIGINALS=[
 {match:/^(?:akhenaten|akhenaton|akhnaton|akenaton|ajenaton|akenat[oó]n|ajenat[oó]n)$/i,
  title:"Akenatón · nomen adoptado",glyphs:"𓇋𓏏𓐰𓈖𓐰𓇳𓅜𓐍𓐰𓈖",trans:"ꜣḫ-n-jtn",
  gloss:"Beneficioso para Atón",source:"https://es.wikipedia.org/wiki/Akenat%C3%B3n",
  evidence:"Transcripción Unicode publicada en Wikipedia; comprobar con el testimonio epigráfico"},
 {match:/^(?:akhenaten|akhenaton|akhnaton|akenaton|ajenaton|akenat[oó]n|ajenat[oó]n|amenhotep iv|amenofis iv|amenophis iv)$/i,
  title:"Amenhotep IV · nombre de nacimiento",glyphs:"𓇋𓏠𓐰𓈖𓊵𓐰𓏏𓐱𓊪",trans:"jmn-ḥtp",
  gloss:"Amón está satisfecho",source:"https://es.wikipedia.org/wiki/Akenat%C3%B3n",
  evidence:"Secuencia Unicode del artículo sobre Akenatón; no es un facsímil"}
];
const SYMBOLS=[
 {match:/^(?:ankh|anj|cruz ansada|cruz de la vida)$/i,
 title:"Anj · jeroglífico S034",glyphs:"𓋹",trans:"ꜥnḫ",gloss:"vida",kind:"sign",
 source:"https://www.unicode.org/Public/18.0.0/charts/nameslist/13000/",
 evidence:"Signo individual de Unicode S034; no es un cartucho real"},
 {match:/^(?:ojo de horus|eye of horus|wedjat|udyat|udjat)$/i,
 title:"Ojo de Horus · jeroglífico D010",glyphs:"𓂀",kind:"sign",
 source:"https://www.unicode.org/Public/18.0.0/charts/nameslist/13000/",
 evidence:"Signo individual Unicode D010; no es un cartucho ni una transcripción de manuscrito"}
];
const ARABIC=[
 {match:/^(?:egipto|egypt|miṣr|misr|مصر|egipto moderno|modern egypt)$/i,arabic:"مصر",latin:"Miṣr",title:"Egipto"},
 {match:/(?:el cairo|cairo|al[- ]qahira|القاهرة)/i,arabic:"القاهرة",latin:"al-Qāhira",title:"El Cairo"},
 {match:/(?:alejandr[ií]a|alexandria|الإسكندرية)/i,arabic:"الإسكندرية",latin:"al-Iskandariyya",title:"Alejandría"}
];
const node=(tag,cls,t)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(t!=null)el.textContent=String(t);return el};
const ref=(txt,url)=>{const a=node("a",null,txt);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a};
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().trim();
const qText=()=>new URLSearchParams(location.search).get("q")||document.getElementById("query")?.value||"";
let currentQuery=qText(),rows=[],generation=0;
function attachStyles(){
 if(!document.getElementById("v-egypt-font-import")){
  const font=document.createElement("link");font.id="v-egypt-font-import";font.rel="stylesheet";
  font.href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600&family=Noto+Sans+Egyptian+Hieroglyphs&display=swap";
  document.head.append(font);
 }
 if(document.getElementById("v-egypt-script-css"))return;
 const style=node("style");style.id="v-egypt-script-css";
 style.textContent=[
 ".v-egypt-script-panel{font:13px/1.65 Arial,Helvetica,sans-serif;border-bottom:1px solid #5558;padding:0 0 17px;margin:0 0 18px;color:inherit;max-width:100%;min-width:0}",
 ".v-egypt-script-panel h3{font:400 21px/1.4 Georgia,serif;margin:0 0 10px;color:inherit}",
 ".v-egypt-script-panel h4{font:600 13px/1.55 Arial,sans-serif;margin:15px 0 7px}",
 ".v-egypt-script-panel .v-script-note{font:11px/1.6 Arial,sans-serif;opacity:.84;margin:5px 0}",
 ".v-egypt-script-panel .v-script-form{padding:12px 0 8px;border-top:1px solid #4c4c4c;max-width:100%}",
 ".v-egypt-script-panel .v-script-cartouche{border:2px solid currentColor;border-radius:43% / 40%;max-width:100%;padding:9px 15px;margin:9px 0;min-width:0;text-align:center;overflow-wrap:anywhere}",
 ".v-egypt-script-panel .v-script-glyphs{font-family:'Egyptian Text','Noto Sans Egyptian Hieroglyphs',serif!important;font-weight:400!important;font-size:var(--egypt-script-size,35px);line-height:1.6;letter-spacing:normal!important;word-spacing:normal;direction:ltr;unicode-bidi:isolate;display:block;text-align:center}",
 ".v-egypt-script-panel .v-script-arabic{font-family:'Noto Naskh Arabic','Amiri',serif!important;font-weight:400!important;font-size:var(--egypt-script-size,32px);line-height:1.9;letter-spacing:normal;direction:rtl;unicode-bidi:isolate;display:block;text-align:right}",
 ".v-egypt-script-panel .v-script-symbol{padding:6px 0;max-width:100%;text-align:center}",
 ".v-egypt-script-panel .v-script-meta{font-size:12px;line-height:1.6;margin:5px 0}",
 ".v-egypt-script-panel .v-script-meta strong{font-weight:600}",
 ".v-egypt-script-panel .v-script-entry{padding:9px 0 13px;border-top:1px solid #4447}",
 ".v-egypt-script-panel .v-script-controls{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}",
 ".v-egypt-script-panel button{font:12px/1.45 Arial,sans-serif;min-height:38px;padding:7px 10px;border:1px solid #777;border-radius:5px;background:transparent;color:inherit;cursor:pointer}",
 ".v-egypt-script-panel button:hover{background:#8882}",
 ".v-egypt-script-panel button:focus-visible{outline:2px solid currentColor;outline-offset:2px}",
 ".v-egypt-script-panel a{color:inherit;text-decoration:underline;text-underline-offset:3px}",
 ".v-egypt-script-panel textarea{width:100%;min-height:55px;background:#202123;color:#f4f1e9;border:1px solid #65676a;border-radius:5px;padding:8px;resize:vertical;font:22px/1.4 'Egyptian Text','Noto Sans Egyptian Hieroglyphs',serif}",
 ".v-egypt-script-panel .v-script-review{margin:11px 0 0}",
 "html[data-theme=light] .v-egypt-script-panel textarea{background:#fff;color:#222}",
 "@media(max-width:600px){.v-egypt-script-panel .v-script-glyphs{font-size:29px}.v-egypt-script-panel .v-script-arabic{font-size:28px}}",
 "@media print{.v-egypt-script-panel .v-script-controls,.v-egypt-script-panel .v-script-form{display:none}}"
 ].join("\n");
 document.head.append(style);
}
function glyphText(str){
 const el=node("span","v-script-glyphs",str);el.lang="egy";el.dir="ltr";
 el.title="Jeroglíficos Unicode; no facsímil";return el;
}
function arabicText(str){
 const el=node("span","v-script-arabic",str);el.lang="ar";el.dir="rtl";return el;
}
function matchRows(q){
 const description=rows.slice(0,6).map(r=>[r?.title,r?.entityDescription,r?.entityCanonical,r?.excerpt].filter(Boolean).join(" ")).join(" ");
 const qAncient=OLD_EGYPT.test(q)||EGYPT_NAME.test(q)||SYMBOLS.some(x=>x.match.test(q)),qModern=MODERN_EGYPT.test(q);
 const authority=rows.some(r=>Boolean(r?.preferredWiki||r?.wikidataId)&&
   SOURCE_EGYPT.test([r.entityDescription,r.entityCanonical,r.meta].filter(Boolean).join(" "))&&
   (fold(r.entityCanonical||r.title||"")===fold(q)||fold(q).length>=4&&
    fold(r.entityCanonical||r.title||"").includes(fold(q))));
 const historical=qAncient||authority||SOURCE_EGYPT.test(description)&&!qModern;
 const modern=qModern||/[؀-ۿ]/u.test(q)&&/مصر|القاهرة|الإسكندرية/u.test(q);
 const isEgyptQuery=qAncient||qModern||authority||GLYPH.test(q);
 return {ancient:isEgyptQuery&&historical,modern:isEgyptQuery&&modern};
}
function createPanel(query,classification){
 const box=node("section","v-egypt-script-panel");box.id="v-egypt-script-panel";
 box.setAttribute("aria-label","Visor de escrituras egipcias");
 box.append(node("h3",null,classification.ancient?"Escritura egipcia · jeroglíficos":"Egipto actual · escritura árabe"));
 const explanation=node("p","v-script-note",classification.ancient?
  "Transcripciones Unicode, transliteración y fuentes. No son fotografías ni reconstrucciones certificadas de inscripciones.":
  "Grafía árabe contemporánea, leída de derecha a izquierda. No es escritura jeroglífica.");
 box.append(explanation);
 box.dataset.query=fold(query);
 box.dataset.size="35";
 const content=node("div","v-script-entries");box.append(content);
 const controls=node("div","v-script-controls");
 for(const [label,delta] of [["A−",-4],["A+",4]]){
  const button=node("button",null,label);button.type="button";
  button.setAttribute("aria-label",delta>0?"Ampliar escritura":"Reducir escritura");
  button.addEventListener("click",()=>{
   let size=Number(box.dataset.size||35);size=Math.max(24,Math.min(65,size+delta));
   box.dataset.size=String(size);box.style.setProperty("--egypt-script-size",size+"px");
  });controls.append(button);
 }
 box.append(controls);
 const links=node("p","v-script-note");
 links.append(ref("Repertorio de textos · Thesaurus Linguae Aegyptiae","https://thesaurus-linguae-aegyptiae.de/"));
 links.append(document.createTextNode(" · "));
 links.append(ref("UCL Digital Egypt","https://www.ucl.ac.uk/museums-static/digitalegypt/"));
 box.append(links);
 if(classification.ancient){
  const details=node("details","v-script-review"),summary=node("summary",null,"Visor libre: pegar una secuencia jeroglífica Unicode");
  const label=node("label",null,"Introducir caracteres jeroglíficos (no genera una traducción)");
  const field=node("textarea");field.placeholder="𓇋𓏏𓐰𓈖";
  field.maxLength=200;const view=node("div");
  field.addEventListener("input",()=>{
   view.replaceChildren();
   const value=field.value.trim();
   if(!value)return;
   if(value.length>200||!GLYPH.test(value)){view.textContent="Utilice caracteres jeroglíficos Unicode.";return}
   view.append(glyphText(value));
  });
  details.append(summary,label,field,view);
  box.append(details);
 }
 return {box,content};
}
function entry(parent,{title,glyphs,trans,gloss,source,evidence,arabic,latin,kind}){
 const item=node("div","v-script-entry");
 item.append(node("h4",null,title));
 if(glyphs){
  const wrap=node("div",kind==="sign"?"v-script-symbol":"v-script-cartouche");
  wrap.title="Cartucho tipográfico orientativo, no reproducción paleográfica";
  wrap.append(glyphText(glyphs));item.append(wrap);
 }else if(arabic)item.append(arabicText(arabic));
 if(trans||latin)item.append(node("p","v-script-meta","Transliteración: "+(trans||latin)));
 if(gloss)item.append(node("p","v-script-meta","Sentido: "+gloss));
 if(evidence)item.append(node("p","v-script-note",evidence));
 if(source){const p=node("p","v-script-note");p.append(ref("Consultar la fuente de esta grafía",source));item.append(p)}
 if(glyphs||arabic){
  const button=node("button",null,"Copiar escritura");button.type="button";
  button.addEventListener("click",()=>{
   const val=glyphs||arabic;
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(val).then(()=>{button.textContent="Copiado"}).catch(()=>{button.textContent="Selecciona el texto"});
   else button.textContent="Selecciona el texto";
  });
  item.append(button);
 }
 parent.append(item);
}
function extractGlyphs(text){
 if(!text)return [];
 const found=(String(text).match(RUN)||[]).map(s=>s.trim()).filter(s=>[...s].some(c=>GLYPH.test(c)));
 return [...new Set(found)].slice(0,4);
}
async function getWikiTranscription(query,results,token){
 const top=results.find(r=>r?.preferredWiki&&r?.pageid&&r?.wikiLang)||results.find(r=>r?.pageid&&r?.wikiLang);
 const lang=["es","en","fr"].includes(top?.wikiLang)?top.wikiLang:"es";
 const params=new URLSearchParams({action:"query",prop:"extracts",explaintext:"1",redirects:"1",format:"json",origin:"*"});
 if(top?.pageid)params.set("pageids",String(top.pageid));
 else params.set("titles",query);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6500);
 try{
  const response=await fetch("https://"+lang+".wikipedia.org/w/api.php?"+params.toString(),{signal:controller.signal});
  if(!response.ok)throw Error("Wikipedia HTTP "+response.status);
  const obj=await response.json();if(token!==generation)return null;
  const page=Object.values(obj?.query?.pages||{})[0];if(!page||page.missing!==undefined)return null;
  return {glyphs:extractGlyphs(page.extract||""),title:page.title,url:"https://"+lang+".wikipedia.org/wiki/"+encodeURIComponent(String(page.title||"").replaceAll(" ","_"))};
 }catch{return null}finally{clearTimeout(timeout)}
}
async function getArabicAuthority(rows,token){
 const row=rows.find(x=>/^Q\d+$/.test(x?.wikidataId||""));
 if(!row)return null;
 const id=row.wikidataId;
 const params=new URLSearchParams({action:"wbgetentities",ids:id,props:"labels",languages:"ar",format:"json",origin:"*"});
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6500);
 try{
  const res=await fetch("https://www.wikidata.org/w/api.php?"+params.toString(),{signal:controller.signal});
  if(!res.ok)throw Error("Wikidata HTTP "+res.status);
  const data=await res.json();if(token!==generation)return null;
  const name=data.entities?.[id]?.labels?.ar?.value;
  return typeof name==="string"&&/[\u0600-\u06FF]/.test(name)?{name,url:"https://www.wikidata.org/wiki/"+id}:null;
 }catch{return null}finally{clearTimeout(timeout)}
}
async function render(){
 const host=document.getElementById("vitruvia-context");if(!host)return;
 const query=String(currentQuery||qText()).trim().slice(0,180),classification=matchRows(query);
 const previous=host.querySelector("#v-egypt-script-panel");
 if(!query||(!classification.ancient&&!classification.modern)){previous?.remove();return}
 const rowSignature=rows.slice(0,5).map(r=>String(r?.wikidataId||r?.pageid||r?.title||"")).join("|");
 if(previous?.dataset.query===fold(query)&&previous.dataset.rows===rowSignature)return;
 previous?.remove();attachStyles();
 const {box,content}=createPanel(query,classification);
 box.dataset.rows=rowSignature;
 host.prepend(box);host.hidden=false;const token=++generation;
 let populated=0;
 if(classification.ancient){
  for(const rec of [...ORIGINALS,...SYMBOLS].filter(r=>r.match.test(query))){
   entry(content,rec);populated++;
  }
 }
 if(classification.modern){
  for(const rec of ARABIC.filter(r=>r.match.test(query))){
   entry(content,{title:rec.title,arabic:rec.arabic,latin:rec.latin,
    evidence:"Topónimo o denominación árabe actual; verificar variantes regionales.",
    source:"https://www.wikidata.org/wiki/Special:Search?search="+encodeURIComponent(rec.title)});populated++;
  }
 }
 const status=node("p","v-script-note",populated?
 "La agrupación y el óvalo son representaciones tipográficas, no facsímiles.":
 "Se busca una grafía directamente documentada. No se asignan jeroglíficos reconstruidos automáticamente.");
 content.append(status);
 const tasks=[];
 if(classification.ancient){
  tasks.push(getWikiTranscription(query,rows,token).then(record=>{
   if(token!==generation||!box.isConnected||!record)return;
   for(const signs of record.glyphs){
    if(ORIGINALS.some(x=>x.match.test(query)&&x.glyphs===signs))continue;
    entry(content,{title:"Secuencia publicada en «"+record.title+"»",glyphs:signs,
     evidence:"Extracción Unicode de un artículo enciclopédico; lectura y atribución epigráfica sin verificar.",
     source:record.url});populated++;
   }
   if(populated)status.textContent="Las grafías son transcripciones editoriales; los testimonios originales requieren cotejo individual.";
  }));
 }
 if(classification.modern){
  tasks.push(getArabicAuthority(rows,token).then(record=>{
   if(token!==generation||!box.isConnected||!record)return;
   if(ARABIC.some(x=>x.match.test(query)&&x.arabic===record.name))return;
   entry(content,{title:"Nombre de autoridad en árabe",arabic:record.name,
    evidence:"Etiqueta árabe del registro Wikidata identificado en la consulta; no es una transliteración inferida.",
    source:record.url});populated++;
  }));
 }
 await Promise.allSettled(tasks);
}
let queued=false;
function schedule(){
 if(queued)return;queued=true;
 requestAnimationFrame(()=>{queued=false;void render()});
}
function init(){
 const host=document.getElementById("vitruvia-context");if(!host)return;
 new MutationObserver(()=>{
  if(!host.querySelector("#v-egypt-script-panel")&&currentQuery)schedule();
 }).observe(host,{childList:true});
 for(const name of ["vitruvia:search","vitruvia:results","vitruvia:featured-result"]){
  window.addEventListener(name,event=>{
   const d=event.detail||{};
   if(typeof d.query==="string"){currentQuery=d.query;rows=Array.isArray(d.rows)?d.rows:rows}
   if(d.row&&d.row.wikidataId)rows=[d.row,...rows.filter(x=>x!==d.row)].slice(0,15);
   if(name==="vitruvia:search"){
    host.querySelector("#v-egypt-script-panel")?.remove();
    rows=[];
   }
   schedule();
  });
 }
 window.addEventListener("popstate",()=>{currentQuery=qText();rows=[];schedule()});
 schedule();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.VitruviaEgyptScriptViewer={matchQuery:q=>matchRows(q).ancient||matchRows(q).modern,extractGlyphs};
})();