/* Faceted catalogue preview: uses existing catalogue and edition readers, never copies corpus texts. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const panel=$("genre-work-list"),list=$("genre-work-items"),heading=$("genre-work-heading"),note=$("genre-work-note");
if(!panel||!list||!heading||!note)return;
const CATALOG="data/bibliotheca-graeca-latina-I-bce-I-ce.json",REGISTRY="data/classics-corpus/search-registry.json";
const tr={es:{heading:"Obras del género seleccionado",count:n=>n+" obras catalogadas",read:"Leer en visor",external:"Consultar fuente externa",unavailable:"Sin texto legible acreditado",note:"Los visores locales muestran ediciones indexadas. Los enlaces externos no equivalen a texto alojado ni a cotejo de manuscritos.",empty:"No hay obras catalogadas para estos filtros.",error:"No fue posible cargar el catálogo."},en:{heading:"Works in the selected subject",count:n=>n+" catalogued works",read:"Read in viewer",external:"Open external source",unavailable:"No verified reading text",note:"Local viewers display indexed editions. External links are not hosted texts or manuscript collation.",empty:"No catalogued works match these filters.",error:"Could not load catalogue."},fr:{heading:"Œuvres de la catégorie choisie",count:n=>n+" œuvres cataloguées",read:"Lire dans le lecteur",external:"Consulter la source externe",unavailable:"Aucun texte vérifié",note:"Les lecteurs locaux affichent des éditions indexées. Les liens externes ne sont ni hébergés ni collationnés.",empty:"Aucune œuvre pour ces filtres.",error:"Catalogue indisponible."}};
const normal=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
function genreOf(w){
 const s=normal(w.genre);
 if(/arquitectura|ingenieria|agrimensura|mecanica|hidraulica/.test(s))return "architecture";
 if(/cristian|religion|exegesis|mitologia|mitografia/.test(s))return "religion";
 if(/filosofia|estoic|sapiencial|moral/.test(s))return "wisdom";
 if(/medicina|farmacologia/.test(s))return "medicine";
 if(/agricultur|agronomia|botanica/.test(s))return "agriculture";
 if(/geografia|cartografia|etnografia/.test(s))return "geography";
 if(/retorica|oratoria|educacion/.test(s))return "rhetoric";
 if(/astronomia|matematica|historia natural|filosofia natural/.test(s))return "science";
 if(/musica|armonica|teoria musical/.test(s))return "music";
 if(/historia|historiografia|biografia|militar|calendario/.test(s))return "history";
 if(/epica|poesia|tragedia|comedia|satira|elegia|fabula|novela|narrativa|poetica|epistolografia|ficcion/.test(s))return "literature";
 if(/linguistica|erudita|erudicion/.test(s))return "linguistics";
 return "other";
}
const roman=x=>{let total=0,last=0;for(const c of [...String(x).toUpperCase()].reverse()){const v={I:1,V:5,X:10,L:50,C:100,D:500,M:1000}[c]||0;total+=v<last?-v:v;last=v}return total};
function dating(w){
 const s=normal(w.dating).replace(/[–—−]/g,"-");
 if(/tradicion arcaica|epoca arcaica/.test(s))return -750;
 const numeric=s.match(/(\d{1,4})(?:\s*-\s*\d{1,4})?\s*(a\.\s*c\.|d\.\s*c\.)/);
 if(numeric)return Number(numeric[1])*(numeric[2].startsWith("a")?-1:1);
 const century=s.match(/(?:siglos?|s\.)\s+([ivxlcdm]+)/);
 if(century){const c=roman(century[1]);return /a\.\s*c\./.test(s)?-100*c:100*(c-1)}
 return Infinity;
}
function eraOf(w){const y=dating(w);if(!Number.isFinite(y))return "uncertain";if(y< -500)return "archaic";if(y< -322)return "classical";if(y< -30)return "hellenistic";if(y<=284)return "imperial";if(y<=700)return "late";return "later"}
let works=[],registry=[];
const languageTitles={la:"Latín",grc:"Griego",es:"Castellano",en:"Inglés",fr:"Francés",it:"Italiano",de:"Alemán",pt:"Portugués"};
function hostedVersions(w){
 const hosted=registry.filter(r=>r.workId===w.id&&
  ["json-passages","structured-bilingual"].includes(r.format)&&
  ["la","grc","es","en","fr","it","de","pt"].includes(r.language)&&
  typeof r.reader==="string"&&r.reader.startsWith("classics-text-reader.html?"));
 const versions=[...new Map(hosted.map(r=>[r.language,r])).values()];
 const original=versions.find(r=>["la","grc"].includes(r.language));
 const translated=versions.filter(r=>!["la","grc"].includes(r.language));
 return {original,translated,versions};
}
function safeLocal(path){
 if(typeof path!=="string"||!path||path.startsWith("//")||/^[a-z][\w+.-]*:/i.test(path))return null;
 try{const url=new URL(path,location.href);return url.origin===location.origin&&url.pathname.startsWith(new URL(".",location.href).pathname)?url.href:null}catch{return null}
}
function reader(w){
 const e=registry.find(x=>x.workId===w.id&&typeof x.reader==="string"&&x.reader.includes("classics-text-reader.html")&&["json-passages","html-text","structured-bilingual"].includes(x.format));
 if(e){const url=safeLocal(e.reader);if(url)return {url,external:false}}
 if(typeof w.localHtml==="string"){const url=safeLocal(w.localHtml);if(url)return {url,external:false}}
 if(typeof w.localReader==="string"){const url=safeLocal(w.localReader);if(url)return {url,external:false}}
 if(w.id==="vitruvius"||w.id==="vitruvio-v514-pdf")return {url:new URL("lector-bilingue.html?edition=recensio-es",location.href).href,external:false};
 if(w.id==="vitruvio-v554-pdf")return {url:new URL("lector-bilingue.html?edition=recensio-fr",location.href).href,external:false};
 if(w.id==="theory-v297-pdf")return {url:new URL("lector-bilingue.html?edition=theory-en",location.href).href,external:false};
 const e2=registry.find(x=>x.workId===w.id&&typeof x.reader==="string"&&x.reader.includes("classics-text-reader.html"));
 if(e2){const url=safeLocal(e2.reader);if(url)return {url,external:false}}
 for(const candidate of [w.reading?.url,w.pdf?.url]){
  if(typeof candidate!=="string"||!candidate)continue;
  if(/^https:\/\//i.test(candidate))return {url:candidate,external:true};
  const url=safeLocal(candidate);if(url)return {url,external:false};
 }
 return null;
}
function render(){
 const genre=$("classic-genre")?.value||"",era=$("classic-era")?.value||"";
 const language=document.documentElement.lang, t=tr[language]||tr.es;
 panel.hidden=!genre&&!era;
 if(panel.hidden)return;
 const matching=works.filter(w=>(!genre||genreOf(w)===genre)&&(!era||eraOf(w)===era))
  .sort((a,b)=>dating(a)-dating(b)||String(a.author).localeCompare(String(b.author),"es")||String(a.title).localeCompare(String(b.title),"es"));
 heading.textContent=t.heading+" · "+t.count(matching.length);note.textContent=t.note;
 list.replaceChildren();
 if(!matching.length){const p=document.createElement("p");p.className="genre-work-empty";p.textContent=t.empty;list.append(p);return}
 const frag=document.createDocumentFragment();
 for(const w of matching){
  const li=document.createElement("li");li.className="genre-work-item";
  const meta=document.createElement("span");meta.className="genre-work-meta";
  meta.textContent=[w.author,w.dating].filter(Boolean).join(" · ");
  const title=document.createElement("span");title.className="genre-work-title";title.textContent=w.title;
  const info=document.createElement("div");info.className="genre-work-info";info.append(title,meta);
  const target=reader(w);
  const versions=hostedVersions(w);
  const labels=({es:{original:"Original",translation:"Traducción",parallel:"Dos visores"},en:{original:"Original",translation:"Translation",parallel:"Two viewers"},fr:{original:"Original",translation:"Traduction",parallel:"Deux lecteurs"}})[language]||({original:"Original",translation:"Traducción",parallel:"Dos visores"});
  if(versions.versions.length){
   const editions=document.createElement("div");editions.className="genre-work-editions";
   for(const rec of [versions.original,...versions.translated].filter(Boolean)){
    const a=document.createElement("a");a.className="genre-work-version";a.href=safeLocal(rec.reader);
    a.textContent=(rec===versions.original?labels.original:labels.translation)+" · "+(languageTitles[rec.language]||rec.language);editions.append(a);
   }
   if(versions.original&&versions.translated.length){
    const original=versions.original,first=versions.translated[0];
    const href="classics-parallel-reader.html?work="+encodeURIComponent(w.id)+
     "&left="+encodeURIComponent(original.language)+"&right="+encodeURIComponent(first.language);
    const pair=document.createElement("a");pair.className="genre-work-version genre-work-parallel";
    pair.href=safeLocal(href);pair.textContent=labels.parallel;editions.append(pair);
   }
   info.append(editions);
  }
  if(target){
   const titleLink=document.createElement("a");titleLink.className="genre-work-title genre-work-title-link";titleLink.textContent=w.title;titleLink.href=target.url;
   if(target.external){titleLink.target="_blank";titleLink.rel="noopener noreferrer"}
   title.replaceWith(titleLink);
   const a=document.createElement("a");a.className="genre-work-open";a.href=target.url;
   a.textContent=target.external?t.external:t.read;
   if(target.external){a.target="_blank";a.rel="noopener noreferrer"}
   li.append(info,a);
  }else{
   const status=document.createElement("span");status.className="genre-work-unavailable";status.textContent=t.unavailable;
   li.append(info,status);
  }
  frag.append(li);
 }
 list.append(frag);
}
window.addEventListener("bibliotheca:filters-ready",render);
for(const id of ["classic-genre","classic-era"])$(id)?.addEventListener("change",render);
$("language-toggle")?.addEventListener("click",()=>queueMicrotask(render));
Promise.all([fetch(CATALOG).then(r=>{if(!r.ok)throw Error("catalog");return r.json()}),fetch(REGISTRY).then(r=>{if(!r.ok)throw Error("registry");return r.json()})])
.then(([catalog,index])=>{if(!Array.isArray(catalog.works)||!Array.isArray(index.entries))throw Error("invalid");works=catalog.works;registry=index.entries;render()})
.catch(()=>{panel.hidden=false;heading.textContent=(tr[document.documentElement.lang]||tr.es).error;note.textContent="";});
})();