/* Bibliotheca · universal academic dossiers for the registered classic works.
   All claims are sourced from the existing catalogue and verified testimony registry.
   "Earliest in local register" does not mean "oldest manuscript in existence".
   Publication details are never invented to force a Chicago 18 citation. */
(()=>{"use strict";
const PATHS={catalog:"data/bibliotheca-graeca-latina-I-bce-I-ce.json",witness:"data/bibliotheca-testimonia-verified.json",text:"data/classics-corpus/search-registry.json"};
const P={};const N=s=>String(s==null?"":s).trim();
const html=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=N(value);return e};
const norm=s=>N(s).normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
const greek=/[\u0370-\u03ff\u1f00-\u1fff]/u;
const langLabel={la:"latín",grc:"griego antiguo",en:"inglés",es:"castellano",fr:"francés",it:"italiano",de:"alemán"};
const AUTHOR={
 "Marco Vitruvio Polión":"Marcus Vitruvius Pollio","Cicerón":"Marcus Tullius Cicero","Julio César":"Gaius Iulius Caesar",
 "Salustio":"Gaius Sallustius Crispus","Varrón":"Marcus Terentius Varro","Lucrecio":"Titus Lucretius Carus",
 "Virgilio":"Publius Vergilius Maro","Horacio":"Quintus Horatius Flaccus","Tito Livio":"Titus Livius",
 "Ovidio":"Publius Ovidius Naso","Catulo":"Gaius Valerius Catullus","Séneca":"Lucius Annaeus Seneca",
 "Plinio el Viejo":"Gaius Plinius Secundus","Plinio el Joven":"Gaius Plinius Caecilius Secundus",
 "Tácito":"Publius Cornelius Tacitus","Suetonio":"Gaius Suetonius Tranquillus",
 "Plauto":"Titus Maccius Plautus","Terencio":"Publius Terentius Afer",
 "Quintiliano":"Marcus Fabius Quintilianus","Frontino":"Sextus Iulius Frontinus",
 "Catón el Viejo":"Marcus Porcius Cato","Agustín de Hipona":"Aurelius Augustinus",
 "Boecio":"Anicius Manlius Severinus Boethius","Hesíodo":"Ἡσίοδος","Platón":"Πλάτων",
 "Aristóteles":"Ἀριστοτέλης","Sófocles":"Σοφοκλῆς","Esquilo":"Αἰσχύλος",
 "Eurípides":"Εὐριπίδης","Aristófanes":"Ἀριστοφάνης","Heródoto":"Ἡρόδοτος",
 "Tucídides":"Θουκυδίδης","Jenofonte":"Ξενοφῶν","Plutarco":"Πλούταρχος",
 "Estrabón":"Στράβων","Teofrasto":"Θεόφραστος","Euclides":"Εὐκλείδης",
 "Arquímedes":"Ἀρχιμήδης","Demóstenes":"Δημοσθένης","Píndaro":"Πίνδαρος",
 "Diodoro Sículo":"Διόδωρος Σικελιώτης","Marco Aurelio":"Μᾶρκος Αὐρήλιος",
 "Pausanias":"Παυσανίας","Galeno":"Γαληνός"
};
const HIST={
 "vitruvius":"Tratado latino de diez libros sobre formación del arquitecto, teoría y práctica arquitectónica, edificios, materiales, hidráulica, gnomónica y máquinas.",
 "cicero-officiis":"Tratado filosófico romano en tres libros sobre honestum y utile, dirigido al hijo de Cicerón.",
 "cicero-republica":"Diálogo sobre la comunidad política y la justicia, conservado de modo fragmentario; el palimpsesto vaticano conserva partes de la obra.",
 "caesar-gallico":"Relato de las campañas de César en la Galia. La autoría del libro VIII pertenece a Aulo Hircio en la tradición editorial.",
 "lucretius":"Poema filosófico didáctico en seis libros sobre física y ética epicúreas.",
 "virgil-aeneid":"Poema épico latino sobre Eneas y los orígenes míticos de Roma; transmisión antigua fragmentaria y medieval.",
 "virgil-georgica":"Poema didáctico en cuatro libros sobre el trabajo agrícola y su representación poética.",
 "pliny":"Compendio antiguo de historia natural en treinta y siete libros, que incluye índices de fuentes.",
 "dioscorides":"Tratado griego de farmacología y materia médica de transmisión textual e iconográfica.",
 "homer-iliad":"Poema épico de transmisión oral y manuscrita, conservado en papiros antiguos y códices medievales; el Venetus A no es el papiro más antiguo.",
 "homer-odyssey":"Poema épico griego de tradición oral y compleja transmisión textual, con papiros antiguos y códices medievales.",
 "homeric-hymns":"Colección heterogénea de himnos atribuidos tradicionalmente a Homero, con composición y transmisión de épocas distintas.",
 "tacitus-annales":"Historia del principado romano; los libros I–VI y XI–XVI dependen de testimonios manuscritos de distinta conservación.",
 "euclid-elementa":"Tratado matemático en trece libros en la tradición habitual; se distinguen recensiones antiguas, manuscritos y fragmentos papiráceos.",
 "augustine-confessiones":"Obra latina autobiográfica, religiosa y filosófica organizada en trece libros.",
 "plato-republic":"Diálogo sobre justicia, educación y organización de la ciudad, transmitido mediante manuscritos y testimonios fragmentarios.",
 "aristotle-poetics":"Tratado griego sobre producción poética y tragedia, cuya transmisión y recepción poseen variantes editoriales.",
 "sulpicia-elegiae":"Seis elegías dentro del Corpus Tibullianum: la unidad bibliográfica de transmisión es diferente de la autoría de estos poemas.",
 "didache":"Texto del cristianismo antiguo con secciones doctrinales y normativas; datación y estratos de composición debatidos.",
 "pastor-hermas":"Escrito cristiano temprano en visiones, mandamientos y semejanzas, con tradición griega y traducciones antiguas.",
 "josephus-war":"Historiografía de la guerra judeo-romana, redactada y transmitida en la tradición griega.",
 "josephus-antiquities":"Narración en griego de la historia judía organizada en veinte libros.",
 "cicero-oratore":"Diálogo romano en tres libros sobre teoría, elocuencia y educación del orador.",
 "mark":"Evangelio griego con tradición manuscrita antigua, variantes textuales y división en capítulos moderna."
};
const modern=/^(?:vitruvio-v514-pdf|vitruvio-v554-pdf|theory-v297-pdf|krohn-1912-pdf)$/;
const safe=(value)=>{try{const u=new URL(N(value),location.href);return ["https:","http:"].includes(u.protocol)?u.href:null}catch{return null}};
const a=(label,url)=>{const href=safe(url);if(!href)return null;const node=html("a",null,label);node.href=href;if(new URL(href).origin!==location.origin){node.target="_blank";node.rel="noopener noreferrer"}return node};
const addA=(dest,label,url)=>{const node=a(label,url);if(node)dest.append(node);return !!node};
const row=(dest,key,val)=>{if(!N(val))return;const p=html("p","cwd-row");p.append(html("strong",null,key+": "),document.createTextNode(N(val)));dest.append(p)};
const section=(dest,name)=>{const h=html("h3",null,name);dest.append(h);return h};
const sources=(w)=>{const out=[];const push=(label,v)=>{if(typeof v==="string"&&v.trim()&&!out.some(x=>x.value===v.trim()))out.push({label,value:v.trim()})};
 push("Edición documentada",w.bibliography?.editionCitation);
 push("Edición original",w.bibliography?.originalEditionCitation);
 push("Traducción publicada",w.bibliography?.translationCitation);
 push("Edición",w.bibliography?.chicago18Bibliography);
 push("Traducción",w.translation?.chicago18Bibliography);
 push("Publicación",w.pdf?.citationChicago18);
 for(const e of w.localVersions||[])push("Versión "+(langLabel[e.language]||e.language||""),e.citationChicago18);
 return out;
};
function title(w){
 const t=N(w.title);
 if(modern.test(w.id))return {title:t,description:"Edición editorial moderna; no se cataloga como composición antigua independiente"};
 if(w.language==="grc"){
  const h=t.split(/\s+·\s+/)[0].trim();
  return greek.test(h)?{title:h,description:"Título griego de referencia; cotejar variantes de la tradición editorial"}:
   {title:null,description:"Título griego pendiente de acreditación; no se retrotraduce el título latino"};
 }
 if(w.language==="la"){
  return {title:t.split(/\s+·\s+/)[0].trim(),description:"Título latino convencional; las rúbricas manuscritas pueden diferir"};
 }
 return {title:null,description:"Lengua original no acreditada"};
}
function makeContext(w){
 return HIST[w.id]||("Obra clasificada como "+N(w.genre||"literatura antigua")+
  ". El catálogo registra "+N(w.dating||"una cronología pendiente de comprobación")+
  " para su composición o redacción. La datación y la atribución se deben valorar según la tradición textual y la edición crítica consultada.");
}
function store(){if(P.ready)return P.ready;
 P.ready=Promise.all([
 fetch(PATHS.catalog).then(x=>{if(!x.ok)throw Error("Catálogo no disponible");return x.json()}),
 fetch(PATHS.witness).then(x=>{if(!x.ok)throw Error("Testimonios no disponibles");return x.json()}).catch(()=>({records:[]})),
 fetch(PATHS.text).then(x=>x.ok?x.json():{entries:[]}).catch(()=>({entries:[]}))
 ]).then(([c,t,r])=>{
 if(!Array.isArray(c.works))throw Error("Catálogo sin registros");
 const docs=new Map(c.works.map(w=>[w.id,w]));
 const witness=new Map();for(const rec of t.records||[])for(const id of rec.workIds||[]){if(!witness.has(id))witness.set(id,[]);witness.get(id).push(rec)}
 const texts=new Map();for(const rec of r.entries||[]){if(!texts.has(rec.workId))texts.set(rec.workId,[]);texts.get(rec.workId).push(rec)}
 return {docs,witness,texts,count:c.works.length,witnessCount:(t.records||[]).length};
 });
 return P.ready;
}
function witnessesFor(d,id){
 return (d.witness.get(id)||[]).slice().sort((a,b)=>
 ((typeof a.dateStart==="number"?a.dateStart:100000)-(typeof b.dateStart==="number"?b.dateStart:100000))||N(a.id).localeCompare(N(b.id)));
}
function msBlock(dest,ms,i){
 const item=html("div","cwd-ms");
 const label=i===0?"Testimonio de datación más temprana dentro del registro verificado":"Otro testimonio manuscrito verificado";
 row(item,label,ms.title||ms.shelfmark||ms.id);
 row(item,"Institución y signatura",[ms.library,ms.shelfmark].filter(Boolean).join(" · "));
 row(item,"Datación del testimonio",ms.date);
 row(item,"Cobertura material",ms.coverage);
 if(ms.verification)row(item,"Control de procedencia",ms.verification);
 if(ms.rights)row(item,"Derechos de la digitalización",ms.rights);
 const links=html("p","cwd-links");
 addA(links,"Abrir visor del archivo ↗",ms.localViewer||ms.viewer);
 addA(links,"Ficha del códice / signatura ↗",ms.record);
 addA(links,"Manifest IIIF (JSON) ↗",ms.manifest);
 if(ms.localViewer&&ms.viewer)addA(links,"Visor institucional ↗",ms.viewer);
 if(links.childNodes.length)item.append(links);
 dest.append(item);
}
function renderWitness(dest,w,d){
 section(dest,"Testimonios, códices e imágenes");
 const list=witnessesFor(d,w.id);
 if(list.length){
  row(dest,"Cobertura verificada",list.length+" testimonio(s) vinculado(s) en el registro de Vitruvia");
  dest.append(html("p","cwd-muted","La prioridad cronológica de este listado solo compara los registros actualmente vinculados. No certifica que el primero sea el manuscrito conservado más antiguo del mundo, ni que el volumen sea íntegro."));
  list.forEach((ms,i)=>msBlock(dest,ms,i));
 }else{
  dest.append(html("p","cwd-muted","Todavía no consta un códice individual con enlace y datación acreditados en el registro de testimonios. No se identifica por conjetura un manuscrito como el más antiguo."));
 }
 const ms=w.manuscript||{};
 if(ms.record||ms.manifest){
  const known=list.some(x=>ms.record&&x.record===ms.record||ms.manifest&&x.manifest===ms.manifest);
  if(!known){
   const block=html("div","cwd-ms");row(block,"Otro manuscrito catalogado (antigüedad no comparada)",[ms.institution,ms.shelfmark,ms.dating].filter(Boolean).join(" · ")||ms.status||"Registro de origen");
   row(block,"Alcance del registro",ms.status);
   const links=html("p","cwd-links");
   addA(links,"Ficha catalográfica ↗",ms.record);
   addA(links,"Manifest IIIF ↗",ms.manifest);
   if(links.childNodes.length)block.append(links);
   dest.append(block);
  }
 }else if(ms.status&&list.length===0)row(dest,"Estado documental",ms.status);
 if(!list.length){
  const links=html("p","cwd-links");
  addA(links,"Buscar códices en Biblissima ↗","https://portail.biblissima.fr/");
  addA(links,"Consultar Gallica / BnF (búsqueda, no códice asignado) ↗",w.links?.gallica);
  addA(links,"Consultar el registro de fuentes de Perseus ↗",w.links?.perseus);
  dest.append(links);
 }
}
function renderEditions(dest,w,d){
 section(dest,"Versiones, ediciones y acceso a la lectura");
 const editions=d.texts.get(w.id)||[];
 if(editions.length){
  row(dest,"Versiones indexadas en el corpus",editions.length+" (no necesariamente ediciones críticas diferentes)");
  const actions=html("div","cwd-versions");
  for(const e of editions){
   const label=(langLabel[e.language]||e.language)+" · "+(e.edition||e.sourceDescription||"texto indexado");
   const b=html("div","cwd-edition");
   const main=a("Leer "+(langLabel[e.language]||e.language)+" ↗",e.reader);
   if(main)b.append(main);
   b.append(html("small",null,N(label).slice(0,350)));
   actions.append(b);
  }
  dest.append(actions);
 }else dest.append(html("p","cwd-muted","La obra está catalogada, pero no se encontró una versión textual correspondiente en el registro indexado cargado."));
 const links=html("p","cwd-links");
 addA(links,"Fuente textual externa ↗",w.reading?.url);
 addA(links,"PDF histórico alojado ↗",w.pdf?.url);
 if(w.id==="vitruvius")addA(links,"Cotejo de códices vitruvianos ↗","index-codicum.html");
 if(links.childNodes.length)dest.append(links);
 if(w.pdf?.status)row(dest,"Edición impresa / PDF",w.pdf.status);
 if(w.translation?.status)row(dest,"Traducciones",w.translation.status);
}
function renderBibliography(dest,w){
 section(dest,"Ediciones y referencias · Chicago 18");
 const bibliography=sources(w);
 if(bibliography.length){
  dest.append(html("p","cwd-muted","Se conservan los datos editoriales de las referencias existentes. La adecuación definitiva a Chicago 18 requiere comprobar la portada y la fuente de cada edición; no se completan automáticamente datos ausentes."));
  const ul=html("ol","cwd-citations");
  for(const b of bibliography){const li=html("li");li.append(html("small",null,b.label),html("span",null,b.value));ul.append(li)}
  dest.append(ul);
 }else{
  dest.append(html("p","cwd-muted","Cita bibliográfica completa de edición pendiente: el catálogo aún no acredita todos los elementos editoriales necesarios para Chicago 18. No se suponen editor, traductor, año, lugar ni editorial."));
 }
 const c=html("div","cwd-citation");
 const citation=[w.author,title(w).title||w.title,N(w.dating),w.id].filter(Boolean).join(" · ");
 c.append(html("strong",null,"Identificación normalizada de obra (no sustituye la cita de una edición): "),
  document.createTextNode(citation));
 dest.append(c);
}
function renderInto(target,id,opts={}){
 if(!target)return Promise.resolve(null);
 target.replaceChildren(html("p","cwd-muted","Cargando ficha crítica…"));
 return store().then(d=>{
  const w=d.docs.get(id);if(!w){target.replaceChildren(html("p","cwd-muted","La obra no figura en el catálogo verificado."));return null}
  target.replaceChildren();
  target.classList.add("classic-work-dossier");target.dataset.workId=id;
  const head=html("header","cwd-head");
  head.append(html("p","cwd-kicker","BIBLIOTHECA · FICHA CRÍTICA · CHICAGO 18 · TRADICIÓN MANUSCRITA"));
  const h=html("h2",null,w.title);h.lang=w.language==="grc"?"grc":"la";head.append(h);
  row(head,"Autor del catálogo",w.author);
  const originalAuthor=AUTHOR[w.author];
  if(originalAuthor){const r=html("p");r.append(html("strong",null,"Nombre antiguo normalizado: "));const name=html("span",null,originalAuthor);name.lang=greek.test(originalAuthor)?"grc":"la";r.append(name);head.append(r)}
  const form=title(w);
  if(form.title){const r=html("p");r.append(html("strong",null,"Título en lengua original / título uniforme: "));const span=html("i","cwd-original",form.title);span.lang=w.language==="grc"?"grc":"la";r.append(span);head.append(r)}
  else row(head,"Título original",form.description);
  head.append(html("p","cwd-muted",form.description));
  row(head,"Lengua",[langLabel[w.language]||w.language,w.genre].filter(Boolean).join(" · "));
  row(head,"Datación de composición",w.dating||"Pendiente de cotejo");
  if(w.aliases?.length)row(head,"Formas y títulos alternativos",w.aliases.join(" · "));
  row(head,"ID estable del catálogo",w.id);
  const permalink=new URL("classics-work-record.html",location.href);permalink.searchParams.set("work",w.id);
  const tools=html("p","cwd-links");
  addA(tools,"Ficha permanente de la obra ↗",permalink.href);
  addA(tools,"Buscar en Bibliotheca ↗","bibliotheca-graeca-latina.html?work="+encodeURIComponent(w.id));
  head.append(tools);
  target.append(head);
  section(target,"Contexto histórico, género y atribución");
  target.append(html("p",null,makeContext(w)));
  if(/atribuci[oó]n|debati|discuti|fragment/i.test(w.author+" "+w.dating+" "+w.title)){
   target.append(html("p","cwd-muted","Advertencia filológica: la atribución, la datación o la transmisión de esta obra puede ser discutida o fragmentaria; cotejar estudios especializados."));
  }
  renderWitness(target,w,d);
  renderEditions(target,w,d);
  renderBibliography(target,w);
  section(target,"Metodología de la ficha");
  target.append(html("p","cwd-muted","Los loci clásicos identifican lugares del texto; un número de página de edición y un folio físico son sistemas de referencia diferentes. Un manuscrito puede contener solo fragmentos. Los datos manuscritos provienen del registro de testimonios verificados; la bibliografía, del catálogo editorial. Enlaces a recursos externos no implican derechos de reproducción ni aval institucional."));
  const version=html("p","cwd-muted","Procedencia interna: catálogo Bibliotheca (222 registros en esta versión); testimonios validados ("+d.witnessCount+"); índice de versiones textuales. Estilo de descripción bibliográfica: The Chicago Manual of Style, 18.ª ed. (2024), notas y bibliografía, en la medida de los metadatos disponibles.");
  target.append(version);
  return w;
 }).catch(err=>{target.replaceChildren(html("p","cwd-muted","No se pudo cargar la ficha: "+(err?.message||"error de acceso")));return null});
}
function css(){
 if(document.getElementById("cwd-style"))return;
 const style=html("style");style.id="cwd-style";style.textContent=[
 ".classic-work-dossier{background:#151517;color:#e8e8e9;border:1px solid #505056;border-radius:6px;padding:18px 20px;min-width:0;overflow-wrap:anywhere;margin:14px 0}",
 ".classic-work-dossier h2{font:400 clamp(24px,3vw,35px)/1.2 'Gentium Book Plus',Georgia,serif;margin:5px 0 13px}",
 ".classic-work-dossier h3{font:400 20px/1.35 Georgia,serif;margin:22px 0 10px;border-top:1px solid #48484c;padding-top:16px}",
 ".classic-work-dossier p{font:13px/1.7 system-ui,Arial,sans-serif;margin:7px 0}",
 ".classic-work-dossier strong{font-weight:650}",
 ".classic-work-dossier .cwd-kicker{font:600 11px/1.5 system-ui;letter-spacing:.10em;opacity:.83}",
 ".classic-work-dossier .cwd-muted{color:#b8b8bb;font-size:12px}",
 ".classic-work-dossier .cwd-links{display:flex;gap:7px 18px;flex-wrap:wrap}",
 ".classic-work-dossier a{color:#e3c78f;text-decoration:underline;text-underline-offset:3px}",
 ".classic-work-dossier [lang=grc]{font-family:'Gentium Book Plus',Cardo,Georgia,serif}",
 ".classic-work-dossier .cwd-original{font-size:17px}",
 ".classic-work-dossier .cwd-ms{border-left:3px solid #777;padding:6px 12px;margin:13px 0;background:rgba(120,120,120,.07)}",
 ".classic-work-dossier .cwd-versions{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:9px;margin:12px 0}",
 ".classic-work-dossier .cwd-edition{border:1px solid #555;padding:10px}",
 ".classic-work-dossier .cwd-edition small{display:block;font:11px/1.5 system-ui;color:#bababa;margin-top:4px}",
 ".classic-work-dossier .cwd-citations{padding-left:24px}",
 ".classic-work-dossier .cwd-citations li{margin-bottom:11px;line-height:1.65}",
 ".classic-work-dossier .cwd-citations li small{display:block;color:#bbb;font:11px/1.6 system-ui}",
 ".classic-work-dossier .cwd-citation{border-left:2px solid #999;padding:8px 12px;font:12px/1.6 system-ui}",
 ".classic-work-dossier a:focus-visible{outline:2px solid #ddd;outline-offset:2px}",
 "html[data-theme=light] .classic-work-dossier{background:#f6f4ee;color:#232323;border-color:#aaa}",
 "html[data-theme=light] .classic-work-dossier .cwd-muted{color:#555}",
 "html[data-theme=light] .classic-work-dossier a{color:#654718}",
 "@media print{.classic-work-dossier{color:#161616;background:#fff;break-inside:auto}.classic-work-dossier a{color:#161616}}"
 ].join("\n");document.head.append(style);
}
function initBibliotheca(){
 const select=document.getElementById("classic-work");if(!select)return;
 const target=document.createElement("div");target.id="classic-scholarly-provenance";target.className="classic-scholarly-provenance";
 const position=document.querySelector(".workrow")||select.closest(".filter-field")||select;
 position.insertAdjacentElement("afterend",target);
 let serial=0;
 const render=()=>{const id=select.value||new URLSearchParams(location.search).get("work")||"";serial++;if(!id){target.replaceChildren();target.hidden=true;return}target.hidden=false;css();void renderInto(target,id)};
 select.addEventListener("change",render);
 window.addEventListener("popstate",render);
 document.addEventListener("vitruvius:language-changed",render);
 let scheduled=false;
 new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render()})}).observe(select,{childList:true});
 window.setTimeout(render,0);
}
window.ClassicsWorkDossier={data:store,render:(target,id,opts)=>{css();return renderInto(target,id,opts)},initBibliotheca,witnessesFor,title};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initBibliotheca,{once:true});else initBibliotheca();
})();