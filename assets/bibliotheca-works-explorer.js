/* Shared compact bibliography explorer for the home page and Bibliotheca.
   Uses the per-work indexed-source inventory; never treats an R2 facsimile
   registration as proof of a reviewed, searchable Latin/Greek transcription. */
(()=>{"use strict";
const URL="data/classics-corpus/indexation-roadmap-222.json";
const TOTALS_URL="data/cifras-corpus.json";
const labels={local:"Original griego o latino indexado"};
let dataPromise=null;
function catalog(){
 if(!dataPromise)dataPromise=Promise.all([
  fetch(URL).then(r=>{if(!r.ok)throw Error("Inventario: HTTP "+r.status);return r.json()}),
  fetch("data/classics-corpus/search-registry.json").then(r=>{if(!r.ok)throw Error("Registro editorial: HTTP "+r.status);return r.json()}),
  fetch("data/bibliotheca-expansion-publicada-2026-11-16.json").then(r=>{if(!r.ok)throw Error("Catálogo complementario: HTTP "+r.status);return r.json()}),
  fetch("data/index/classics/manifest.json").then(r=>{if(!r.ok)throw Error("Índice léxico: HTTP "+r.status);return r.json()}),
  fetch("data/classics-corpus/title-search-aliases-multilingual.json").then(r=>r.ok?r.json():{aliases:{}}).catch(()=>({aliases:{}})),
  fetch("data/index/classics-additions-2026-11-17/manifest.json").then(r=>r.ok?r.json():{index:[]}).catch(()=>({index:[]})),
  fetch("data/classics-corpus/edition-list-labels.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).catch(()=>null),
  fetch("data/r2/catalogo-clasicos-r2.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).catch(()=>null),
  fetch("data/r2/vinculos-repertorio.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).catch(()=>null),
  fetch("data/r2/bibliotheca-inventario-unificado.json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).catch(()=>null)
 ]).then(([j,registry,supplement,lexical,names,additions,editionLabels,pdfCatalogue,r2Links,inventory])=>{
  if(!Array.isArray(j.items)||j.items.length!==j.targetWorks)throw Error("Inventario de obras inconsistente");
  const sources=new Map();
  for(const entry of registry.entries||[]){
   if(!entry.workId||!["json-passages","structured-bilingual","html-text"].includes(entry.format))continue;
   const valid=entry.format==="html-text"
    ? /^corpus\/[a-z0-9/_-]+\.html$/.test(entry.reader||entry.path||"")
    : /^data\/(?:classics-corpus|structured|lexicon\/fontes)\/[a-z0-9/_-]+\.json$/.test(entry.path||"")||
      /^https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/[a-z0-9_-]+\.json$/.test(entry.path||"");
   if(valid){if(!sources.has(entry.workId))sources.set(entry.workId,[]);sources.get(entry.workId).push(entry)}
  }
  const lexicalIds=new Set([...(lexical.index||[]),...(additions.index||[])]
   .filter(e=>e.lang==="grc"||e.lang==="la").map(e=>e.id+"|"+e.lang));
  const hasIndexedOriginal=(id,lang)=>["la","grc"].includes(lang)&&lexicalIds.has(id+"|"+lang)&&(sources.get(id)||[]).some(e=>e.language===lang);
  const merged=new Map(j.items.map(x=>[x.id,{id:x.id,author:x.author||"Autor no indicado",title:x.title||x.id,kind:"local",language:x.originalLanguage||"",originalIndexed:hasIndexedOriginal(x.id,x.originalLanguage),indexedLanguages:hasIndexedOriginal(x.id,x.originalLanguage)?[x.originalLanguage]:[],readers:sources.get(x.id)||[]}]));
  // Supplementary works are fully catalogued, not anonymous "registry-only" rows.
  // Search results are labelled indexed only when the actual lexical manifest agrees.
  for(const w of supplement.works||[]){
   if(!w?.id||merged.has(w.id))continue;
   const lang=w.language;
   const originalIndexed=hasIndexedOriginal(w.id,lang);
   merged.set(w.id,{id:w.id,author:w.author||"Autor no indicado",title:w.title||w.id,
    kind:"local",language:lang,originalIndexed,
    indexedLanguages:originalIndexed?[lang]:[],readers:sources.get(w.id)||[]});
  }
  // Additional R2 work records belong to the catalogue, not to the searchable-text index.
  // Preserve existing IDs and entries: the union is additive and does not move files.
  for(const w of r2Links?.obrasNuevas||[]){
   if(!w?.r2||merged.has(w.r2))continue;
   merged.set(w.r2,{id:w.r2,author:w.autor||"Autor no indicado",title:w.obra||w.r2,
    kind:"r2-facsimile",language:w.lengua||"",originalIndexed:false,indexedLanguages:[],readers:[]});
  }
  // An uncatalogued text must remain discoverable, but is never passed off as
  // having an authenticated scholarly fiche or a verified lexical index.
  for(const [id,versions] of sources){
   if(merged.has(id))continue;
   const ancient=versions.find(e=>["la","grc"].includes(e.language));
   const first=ancient||versions[0];
   merged.set(id,{id,author:first.author||"Autor no indicado",title:first.title||id,
    kind:"pending",language:ancient?.language||"",originalIndexed:false,indexedLanguages:[],readers:versions});
  }
  // Show only original Greek/Latin indexed in BOTH lexical manifest and source registry.
  // Catalog-only, external searches, OCR facsimiles and translations are never shown as originals.
  // Preserve rigorous indexed counts, but make every catalogued author and work discoverable.
  // Missing an exact original-index certificate must not mean "author not found".
  for(const w of [...(inventory?.works||[]),...(inventory?.supplementaryWorks||[]),...(inventory?.additionalWorks||[])]){
   if(!w?.id||!w.author||!w.title)continue;
   const old=merged.get(w.id);
   if(old){old.facsimileIds=(w.r2FacsimileEditions||[]).map(e=>e.editionId);continue;}
   const language=w.language||"";
   const originalIndexed=hasIndexedOriginal(w.id,language);
   merged.set(w.id,{id:w.id,author:w.author,title:w.title,kind:"local",language,originalIndexed,indexedLanguages:originalIndexed?[language]:[],readers:sources.get(w.id)||[],facsimileIds:(w.r2FacsimileEditions||[]).map(e=>e.editionId)});
  }
  const all=[...merged.values()];
  return {indexed:all.filter(w=>w.originalIndexed),all,aliases:names.aliases||{},editionLabels:editionLabels?.schema==='bibliotheca-edition-list-labels-v1'?editionLabels.works:{},pdfEditions:pdfCatalogue?.items||[],r2Links:r2Links?.porObra||{}};
 }).catch(e=>{dataPromise=null;throw e});
 return dataPromise;
}
function add(tag,cls,text,parent){const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;parent.append(el);return el}
const translationLanguages={en:'inglés',fr:'francés',es:'castellano',it:'italiano',de:'alemán',pt:'portugués'};
function translationSummary(row,item,editionLabels,pdfEditions=[]){
 const panel=add('aside','vdl-works-translations',null,row);
 panel.setAttribute('aria-label','Traducciones documentadas de esta obra');
 const metadata=editionLabels?.[item.id]||[];
 const byLanguage=new Map((item.readers||[]).filter(e=>translationLanguages[e.language]).map(e=>[e.language,e]));
 for(const pdf of pdfEditions){
  if((pdf.workId||pdf.id)!==item.id)continue;
  const language=String(pdf.idiomaEdicion||'').match(/^(?:bilingue-)?(en|fr|es|it|de|pt)$/)?.[1];
  if(!language||byLanguage.has(language))continue;
  byLanguage.set(language,{language,translator:pdf.traductor||'',publicationYear:pdf.anio,edition:[pdf.bilingueLoeb?'Loeb Classical Library':'',pdf.editor].filter(Boolean).join(' · '),sourceDescription:pdf.tituloEdicion,format:'facsimile-pdf',pdf:pdf.pdf});
 }
 const versions=[...byLanguage.values()];
 if(!versions.length){add('span','vdl-works-translation-status','Sin traducción humana registrada en el índice de lectura',panel);return;}
 for(const source of versions){
  const info=metadata.find(e=>e.language===source.language)||source;
  const automatic=source.machineTranslation===true||/machine|automatic/i.test(source.sourceType||'');
  const line=add('div','vdl-works-translation-entry',null,panel);
  add('strong',null,(automatic?'Automática':source.format==='facsimile-pdf'?'Traducción publicada (PDF)':'Traducción humana')+' · '+translationLanguages[source.language],line);
  const translator=info.translator||source.translator||'';
  add('span',null,automatic?'Versión generada automáticamente':translator&&!/anonymous|an[oó]nim|unknown|no (?:identificad|acreditad)/i.test(translator)?translator:'Traductor no identificado en el registro',line);
  const edition=[info.edition,info.publicationYear||source.publicationYear].filter(Boolean).join(' · ');
  if(edition)add('small',null,edition,line);
  if(source.format==='facsimile-pdf'&&/^https:\/\/libros\.vitruvius-digital-library\.org\/clasicos\/pdf\/[a-z0-9-]+\.pdf$/.test(source.pdf||'')){
   const link=add('a',null,'Ver traducción en PDF',line);link.href=source.pdf;link.target='_blank';link.rel='noopener noreferrer';
  }
  if(source.sourceDescription)line.title=source.sourceDescription;
 }
}
function mount(host){
 if(host.dataset.indexExplorerMounted)return;
 host.dataset.indexExplorerMounted="1";
 host.classList.add("vdl-works-explorer");
 const panel=add("div","vdl-works-explorer-panel",null,host);
 const heading=add("label","vdl-works-explorer-heading","Buscar un libro para leer",panel);
 
 const search=add("input","vdl-works-search",null,heading);
 search.type="search";search.placeholder="Autor, obra o título traducido: Homero, Platón, Eneida…";
 search.autocomplete="off";search.setAttribute("aria-label","Buscar una obra por autor o título");

 const count=add("p","vdl-works-result-count","Buscá por autor, título latino, griego o traducido.",panel);count.setAttribute("role","status");
 const listing=add("div","vdl-works-list",null,panel);listing.setAttribute("role","list");listing.hidden=true;
 let items=null,limit=40;
 const more=add("button","vdl-works-more","Mostrar más obras",panel);more.type="button";more.hidden=true;more.addEventListener("click",()=>{limit+=40;render()});
 const normalize=x=>String(x||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().trim();
 const aliases={vitruvius:"vitruvio vitruve",caesar:"julio cesar julius caesar",cicero:"ciceron cicerone",plinius:"plinio",vergilius:"virgilio virgil",horatius:"horacio",ovidius:"ovidio",homer:"homero homere",plato:"platon",aristoteles:"aristotle aristote",strabo:"estrabon"};
 function score(w,q){
  const author=normalize(w.author),title=normalize(w.title),id=normalize(w.id.replaceAll("-"," "));
  const alias=[...Object.entries(aliases).filter(([key])=>author.includes(key)||id.includes(key)).map(([,v])=>v),...(items?.aliases?.[w.id]||[])].map(normalize).join(" ");
  if(author===q||title===q)return 150;
  if(author.startsWith(q)||title.startsWith(q))return 110;
  if(alias.split(" ").some(x=>x.startsWith(q))||alias.startsWith(q))return 95;
  if(author.split(/\s+/).some(x=>x.startsWith(q)))return 85;
  if(title.split(/\s+/).some(x=>x.startsWith(q)))return 75;
  if(q.length>1&&(author.includes(q)||alias.includes(q)))return 55;
  if(q.length>1&&(title.includes(q)||id.includes(q)))return 40;
  return -1;
 }
 const spanishAuthors={vitruvius:"Vitruvio",cicero:"Cicerón",caesar:"Julio César",homer:"Homero",hesiod:"Hesíodo",plato:"Platón",aristotle:"Aristóteles",aeschylus:"Esquilo",sophocles:"Sófocles",euripides:"Eurípides",aristophanes:"Aristófanes",herodotus:"Heródoto",thucydides:"Tucídides",xenophon:"Jenofonte",strabo:"Estrabón",plutarch:"Plutarco",virgil:"Virgilio",vergil:"Virgilio",ovid:"Ovidio",horace:"Horacio",livy:"Tito Livio",tacitus:"Tácito",seneca:"Séneca",pliny:"Plinio",apuleius:"Apuleyo",petronius:"Petronio"};
 function bilingualName(item){
  const alternatives=items?.aliases?.[item.id]||[];
  const title= item.id==="vitruvius"?"Los diez libros de arquitectura":alternatives[0]||"";
  const author=spanishAuthors[item.id.split("-")[0]]||"";
  const different=(x,y)=>normalize(x)!==normalize(y);
  return item.author+(author&&different(author,item.author)?" — "+author:"")+" · "+item.title+(title&&different(title,item.title)&&!normalize(item.title).includes(normalize(title))?" — "+title:"");
 }
 function render(){
  if(!items)return;
  const q=normalize(search.value);
  listing.replaceChildren();more.hidden=true;
  if(q.length<2){listing.hidden=true;count.textContent=q?"Escribí al menos dos letras para buscar.":"Buscá por autor, título latino, griego o traducido.";return}
  const found=items.all.map((item,i)=>({item,i,rank:score(item,q)})).filter(x=>x.rank>=0)
   .sort((a,b)=>b.rank-a.rank||Number(b.item.originalIndexed)-Number(a.item.originalIndexed)||a.i-b.i);
  listing.hidden=!found.length;
  for(const {item} of found.slice(0,limit)){
   const readers=item.readers||[];
   const source=readers.find(x=>x.language===item.language)||readers.find(x=>["la","grc"].includes(x.language))||readers[0];
   const path=source?.reader||source?.path;
   const html=source?.format==="html-text"&&/^corpus\/[a-z0-9/_-]+\.html$/.test(path||"");
   const structured=source&&["json-passages","structured-bilingual"].includes(source.format);
   const canRead=item.originalIndexed&&(html||structured);
   const row=add("div","vdl-works-row",null,listing);row.setAttribute("role","listitem");
   const info=add('div','vdl-works-info',null,row);
   const link=add("a","vdl-works-name",bilingualName(item),info);
   link.href=canRead?(path||"classics-text-reader.html?"+new URLSearchParams({work:item.id,lang:source.language}))
    :"classics-work-record.html?"+new URLSearchParams({work:item.id});
   link.title=canRead?"Abrir lector de la obra":"Ver ficha académica y fuentes disponibles";
   const state=add("small","vdl-works-availability",canRead?" · Texto original indexado":" · Ficha y fuentes",info);
   state.setAttribute("aria-label",canRead?"Disponible para lectura":"Ficha bibliográfica, texto no confirmado");
   // A facsimile can exist even where no searchable original is indexed.
   // Never represent an OCR PDF as a scholarly transcription.
   const editionIds=new Set([item.id,...(item.facsimileIds||[]),...(items.r2Links?.[item.id]||[]).map(e=>e.r2)]);
   const facsimiles=items.pdfEditions.filter(e=>editionIds.has(e.id));
   const seenPdf=new Set();
   for(const pdf of facsimiles){
    if(!/^https:\/\/libros\.vitruvius-digital-library\.org\/clasicos\/pdf\/[a-z0-9-]+\.pdf$/.test(pdf.pdf||"")||seenPdf.has(pdf.pdf))continue;
    seenPdf.add(pdf.pdf);
    const a=add("a","vdl-works-facsimile-link","Ver facsímil PDF",info);
    a.href=pdf.pdf;a.target="_blank";a.rel="noopener noreferrer";
    a.title="Facsímil registrado en R2; no implica texto indexado ni traducción cotejada";
   }
   translationSummary(row,item,items.editionLabels,items.pdfEditions);
  }
  count.textContent=found.length?found.length+" obra"+(found.length===1?"":"s")+" encontrada"+(found.length===1?"":"s")+(found.length>limit?" · primeras "+limit:"")+". Las obras sin original indexado abren su ficha bibliográfica.":"No se encontraron obras con ese autor o título.";
  more.hidden=found.length<=limit;more.textContent="Mostrar más obras ("+Math.max(0,found.length-limit)+" restantes)";
 }
 async function load(){
  if(items)return;
  count.textContent="Cargando catálogo…";
  try{items=await catalog();render()}
  catch(e){count.textContent="El catálogo no se pudo cargar. Abrí Bibliotheca Graeca et Latina."}
 }
 // One permanent input, like Bibliotheca: no search dialog or expansion on focus.
 search.addEventListener("input",()=>{limit=40;if(search.value.trim().length<2){if(items)render();return;}if(items)render();else void load()});
}
function init(){
 document.querySelectorAll("[data-vdl-works-explorer]").forEach(mount);
 // This number is computed from BOTH the source registry and the published
 // inverted lexical index; never infer it from the number of catalogue cards.
 const display=document.querySelector('[data-cifra="obrasTotalesDeclaradas"], [data-cifra="obrasConTextoIndexado"]');
 if(display){
  const refresh=()=>fetch(TOTALS_URL,{cache:"no-cache"}).then(response=>{
   if(!response.ok)throw Error("Cifras: HTTP "+response.status);
   return response.json();
  }).then(totals=>{
   if(totals.schema!=="vdl-cifras-corpus-1"||!Number.isInteger(totals.obrasTotalesDeclaradas)||totals.obrasTotalesDeclaradas<1)throw Error("Inventario total inválido");
   const all=totals.obrasTotalesDeclaradas,indexed=totals.obrasConTextoIndexado;
   if(!Number.isInteger(indexed)||indexed<0||indexed>all)throw Error("Recuento indexado incoherente");
   display.textContent=new Intl.NumberFormat("es-AR").format(all);
   display.title="Obras únicas catalogadas: repertorio principal, suplementarias y adicionales. Fecha del inventario: "+(totals.actualizado||"no informada");
   const label=display.nextElementSibling;
   if(label)label.textContent="obras clásicas catalogadas";
   const badge=display.closest(".vdl-indexed-feature");
   if(badge){
    let extra=badge.querySelector(".vdl-works-indexed-subcount");
    if(!extra){extra=document.createElement("small");extra.className="vdl-works-indexed-subcount";extra.style.cssText="display:block;font:12px/1.4 system-ui,sans-serif;color:inherit";badge.append(extra)}
    extra.textContent=new Intl.NumberFormat("es-AR").format(indexed)+" con original indexado";
   }
  }).catch(()=>{
   display.textContent="—";
   display.title="No se pudo verificar el inventario actualizado";
   const label=display.nextElementSibling;if(label)label.textContent="obras catalogadas · cifra no disponible";
  });
  if("requestIdleCallback" in window)window.requestIdleCallback(refresh,{timeout:2800});
  else setTimeout(refresh,300);
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
