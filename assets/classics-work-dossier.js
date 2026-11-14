/* Bibliotheca · universal academic dossiers for the registered classic works.
   All claims are sourced from the existing catalogue and verified testimony registry.
   "Earliest in local register" does not mean "oldest manuscript in existence".
   Publication details are never invented to force a Chicago 18 citation. */
(()=>{"use strict";
const PATHS={catalog:"data/bibliotheca-graeca-latina-I-bce-I-ce.json?v=20261114-codicology-v2",witness:"data/bibliotheca-testimonia-verified.json?v=20261114-three-records-v2",text:"data/classics-corpus/search-registry.json",authority:"data/perseus-provenance-audit.json",critical:"data/classics-corpus/critical-authorities-222.json?v=20261110-100witnesses-v24",standard:"data/classics-corpus/vitruvius-standard-222.json?v=20261110-100witnesses-v24",trees:"data/classics-corpus/codicological-trees-222.json?v=20261110-100witnesses-v24"};
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
 push("Cita del manuscrito",w.bibliography?.manuscriptCitation);
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
 fetch(PATHS.text).then(x=>x.ok?x.json():{entries:[]}).catch(()=>({entries:[]})),
 fetch(PATHS.authority).then(x=>x.ok?x.json():{records:[]}).catch(()=>({records:[]})),
  fetch(PATHS.critical).then(x=>x.ok?x.json():{records:[]}).catch(()=>({records:[]})),
  fetch(PATHS.standard).then(x=>x.ok?x.json():{records:[]}).catch(()=>({records:[]})),
  fetch(PATHS.trees).then(x=>x.ok?x.json():{records:[]}).catch(()=>({records:[]}))
 ]).then(([c,t,r,audit,critical,standard,trees])=>{
 if(!Array.isArray(c.works))throw Error("Catálogo sin registros");
 const docs=new Map(c.works.map(w=>[w.id,w]));
 const witness=new Map();for(const rec of t.records||[])for(const id of rec.workIds||[]){if(!witness.has(id))witness.set(id,[]);witness.get(id).push(rec)}
 const texts=new Map();for(const rec of r.entries||[]){if(!texts.has(rec.workId))texts.set(rec.workId,[]);texts.get(rec.workId).push(rec)}
 return {docs,witness,texts,audit:new Map((audit.records||[]).map(e=>[e.workId,e])),critical:new Map((critical.schema==="vitruvius-critical-authority-222-v1"&&Array.isArray(critical.records)&&critical.records.length>0?critical.records:[]).map(e=>[e.workId,e])),standard:new Map((standard.records||[]).map(e=>[e.workId,e])),trees:new Map((trees.records||[]).map(e=>[e.workId,e])),count:c.works.length,witnessCount:(t.records||[]).length};
 });
 return P.ready;
}
function witnessesFor(d,id){
 // Direct original-language witnesses precede translations; sort chronologically within each class.
 const rank=w=>String(w.witnessKind||"").startsWith("ancient_translation")?1:0;
 return (d.witness.get(id)||[]).slice().sort((a,b)=>
 (rank(a)-rank(b))||
 ((typeof a.dateStart==="number"?a.dateStart:100000)-(typeof b.dateStart==="number"?b.dateStart:100000))||N(a.id).localeCompare(N(b.id)));
}
function msBlock(dest,ms,i){
 const item=html("div","cwd-ms");
 const label=i===0?"Primer testimonio de lengua original en el registro (si consta; no prioridad mundial)":"Otro testimonio vinculado";
 if(ms.witnessKind==="ancient_translation_coptic")row(item,"Clasificación ecdótica","Traducción antigua indirecta en copto; NO es lectura original griega");
 else if(ms.witnessKind==="direct_original_greek")row(item,"Clasificación ecdótica","Testimonio original griego");
 else if(ms.witnessKind)row(item,"Clasificación ecdótica",ms.witnessKind);
 if(ms.language)row(item,"Lengua documental",langLabel[ms.language]||ms.language);
 row(item,label,ms.title||ms.shelfmark||ms.id);
 row(item,"Custodia / signatura actual",[ms.library,ms.shelfmark].filter(Boolean).join(" · "));
 if(ms.siglum)row(item,"Siglum / abreviatura documentada",ms.siglum);
 if(ms.academicId)row(item,"Identificadores de autoridad",ms.academicId);
 row(item,"Datación del testigo",ms.date);
 if(ms.datingBasis)row(item,"Fundamento de datación",ms.datingBasis);
 if(ms.datingNotation)row(item,"Notación cronológica",ms.datingNotation);
 item.append(html("h5","cwd-subheading","I. Codicología · descripción material (TEI msDesc)"));
 if(ms.material)row(item,"Soporte material",ms.material);
 if(ms.extent)row(item,"Extensión material",ms.extent);
 if(ms.dimensions)row(item,"Dimensiones",ms.dimensions);
 if(ms.script)row(item,"Escritura paleográfica",ms.script);
 if(ms.hands)row(item,"Manos de copia",ms.hands);
 if(ms.correctors)row(item,"Correctores",ms.correctors);
 if(ms.layout)row(item,"Disposición de página",ms.layout);
 if(ms.ruling)row(item,"Pautado",ms.ruling);
 if(ms.quireSignatures)row(item,"Signaturas de cuadernos",ms.quireSignatures);
 if(ms.folioRange)row(item,"Foliación y loci",ms.folioRange);
 item.append(html("h5","cwd-subheading","II. Filología · contenido y transmisión textual"));
 row(item,"Contenido efectivamente conservado",ms.coverage);
 if(ms.scholia)row(item,"Escolios y notas marginales",ms.scholia);
 if(ms.interlinearGlosses)row(item,"Glosas interlineales",ms.interlinearGlosses);
 if(ms.origin)row(item,"Origen y lugar de hallazgo",ms.origin);
 if(ms.provenance)row(item,"Procedencia (historia del códice)",ms.provenance);
 if(ms.bibliography)row(item,"Bibliografía codicológica",ms.bibliography);
 if(ms.cataloguingStatus)row(item,"Control del dato / reservas",ms.cataloguingStatus);
 if(ms.citation)row(item,"Cita recomendada del testimonio",ms.citation);
 if(ms.accessStatus)row(item,"Acceso fotográfico declarado (sujeto a comprobación)",ms.accessStatus);
 if(ms.viewerRole)row(item,"Tipo de enlace visual",ms.viewerRole);
 if(ms.verification)row(item,"Fuente declarada para comprobar procedencia",ms.verification);
 if(ms.rights)row(item,"Derechos de la digitalización",ms.rights);
 if(ms.verificationUrl){const c=html("p","cwd-links");addA(c,"Control de procedencia institucional ↗",ms.verificationUrl);item.append(c)}
 const links=html("p","cwd-links");
 const viewLabel=ms.viewerKind==="institutional_microfilm"?"Ver microfilme del manuscrito ↗":ms.viewerKind==="external_images"?"Ver fotografías externas (no visor institucional) ↗":ms.viewerRole?"Consultar imágenes y facsímil ↗":"Consultar imágenes ↗";
 addA(links,viewLabel,ms.localViewer||ms.viewer);
 addA(links,"Ficha del códice / signatura ↗",ms.record);
 addA(links,"Manifest IIIF (JSON) ↗",ms.manifest);
 if(ms.localViewer&&ms.viewer)addA(links,"Acceso externo al archivo ↗",ms.viewer);
 if(ms.imageViews?.length)for(const view of ms.imageViews)addA(links,"Fotografía original · "+(view.id||view.title)+" ↗",view.sourceUrl);
 if(ms.alternativeLinks?.length)for(const link of ms.alternativeLinks){
  if(!link.url||[ms.localViewer,ms.viewer,ms.record,ms.manifest,...(ms.imageViews||[]).map(v=>v.sourceUrl)].includes(link.url))continue;
  addA(links,(link.title||"Acceso alternativo")+(link.status==="official_general_collection"?" (colección general)":link.status==="external_collected_images"?" (imágenes externas)":"")+" ↗",link.url);
 }
 if(links.childNodes.length)item.append(links);
 dest.append(item);
}
function renderWitness(dest,w,d){
 section(dest,"Testimonios, códices e imágenes");
 if(w.manuscript?.isIndependentAncientWork===false){
  dest.append(html("p","cwd-muted",w.manuscript.researchNote||"Edición moderna o estudio; no es un códice antiguo independiente."));
  const back=html("p","cwd-links");
  if(w.manuscript.referencedAncientWorkId)addA(back,"Consultar códices de la obra clásica de referencia ↗","classics-work-record.html?work="+encodeURIComponent(w.manuscript.referencedAncientWorkId));
  dest.append(back);
  return;
 }
 const list=witnessesFor(d,w.id);
 if(list.length){
  row(dest,"Cobertura documental",list.length+" testimonio(s) identificados en el registro; la verificación de cada enlace, signatura y folio puede continuar pendiente");
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
 const supplemental=html("p","cwd-links");
 addA(supplemental,"Biblissima · exploración general de otros testigos ↗","https://portail.biblissima.fr/");
 if(w.language==="grc")addA(supplemental,"Pinakes · catálogo de manuscritos griegos ↗","https://pinakes.irht.cnrs.fr/");
 if(w.links?.gallica)addA(supplemental,"Gallica · búsqueda bibliográfica, no codex asignado ↗",w.links.gallica);
 if(list.length&&supplemental.childNodes.length){
  section(dest,"Fuentes alternativas para buscar otros testigos");
  dest.append(html("p","cwd-muted","Estos enlaces sirven para ampliar la investigación, pero no acreditan un códice individual hasta comprobar su signatura y contenido."));
  dest.append(supplemental);
 }
 if(!list.length){
  dest.append(html("p","cwd-muted","Sin manuscrito individual acreditado en esta ficha. Los enlaces de búsqueda siguientes NO equivalen a visores ni a testigos asignados."));
  const links=html("p","cwd-links");
  addA(links,"Buscar códices en Biblissima ↗","https://portail.biblissima.fr/");
  addA(links,"Consultar Gallica / BnF (búsqueda, no códice asignado) ↗",w.links?.gallica);
  addA(links,"Consultar el registro de fuentes de Perseus ↗",w.links?.perseus);
  dest.append(links);
 }
}
function renderCodicology(dest,w){
 const detail=w.codicology;
 if(!detail?.witnesses?.length)return;
 section(dest,"Ficha codicológica especializada");
 if(detail.earlierWitnessNote)dest.append(html("p","cwd-muted",detail.earlierWitnessNote));
 for(const ms of detail.witnesses){
  const item=html("div","cwd-ms");
  row(item,"Manuscrito",ms.name||ms.shelfmark||"Testimonio identificado");
  if(ms.siglum)row(item,"Sigla o signatura (no se presupone siglum crítico)",ms.siglum);
  row(item,"Custodia",[ms.institution,ms.city,ms.shelfmark].filter(Boolean).join(" · "));
  for(const [label,val] of [
   ["Datación paleográfica",ms.dating],["Fundamento de la datación",ms.dateKind],
   ["Origen",ms.origin],["Material",ms.material],["Extensión",ms.extent],
   ["Foliación",ms.folioRange],["Formato",ms.format],["Composición de página",ms.layout],
   ["Escritura",ms.script],["Procedencia histórica",ms.provenance],
   ["Relación imagen-folio",ms.digitization],["Derechos",ms.rights],
   ["Verificación",ms.verification],["Alcance del testimonio",ms.role],["DOI del facsímil",ms.doi]
  ])if(val)row(item,label,val);
  const refs=html("p","cwd-links");
  addA(refs,"Catálogo institucional ↗",ms.catalogue);
  addA(refs,"Ficha codicológica complementaria ↗",ms.catalogueOther);
  addA(refs,"Manifest IIIF ↗",ms.manifest);
  if(refs.childNodes.length)item.append(refs);
  dest.append(item);
 }
}
let teiMatrixTask=null;
function renderExpandedCodicology(dest,w,d){
 const witnesses=d.witness.get(w.id)||[];
 if(!witnesses.length)return;
 const details=html("details","cwd-tei-details"),summary=html("summary",null,"Datos codicológicos y filológicos ampliados · fuentes y campos pendientes");
 const output=html("div");details.append(summary,output);dest.append(details);
 details.addEventListener("toggle",async()=>{
  if(!details.open||details.dataset.loaded)return;
  details.dataset.loaded="loading";output.replaceChildren(html("p",null,"Consultando descripción especializada…"));
  try{
   if(!teiMatrixTask)teiMatrixTask=fetch("data/classics-corpus/tei-codicology-research-matrix-89.json?v=20261111-source-fields-v1").then(r=>{if(!r.ok)throw Error("Matriz no disponible");return r.json()}).catch(e=>{teiMatrixTask=null;throw e});
   const matrix=await teiMatrixTask,ids=new Set(witnesses.map(x=>x.id));
   const records=(matrix.records||[]).filter(r=>ids.has(r.witnessId));
   output.replaceChildren();
   output.append(html("p","cwd-muted","Se distingue el dato de catálogo del cotejo visual y filológico. Un campo sin documentar no equivale a ausencia del rasgo en el manuscrito."));
   const labels={material:"Soporte",dimensions:"Dimensiones y caja escrita",collationFormula:"Fórmula de cuadernos",ruling:"Pautado",binding:"Encuadernación",watermarks:"Filigranas",script:"Escritura",hands:"Manos",corrections:"Correctores",scholia:"Escolios",glosses:"Glosas",subscriptiones:"Subscriptiones",origin:"Origen",provenance:"Procedencia",folioRange:"Folios o páginas",coverage:"Contenido conservado",lacunae:"Lagunas",transpositions:"Transposiciones",palimpsest:"Palimpsesto",record:"Catálogo custodio",viewer:"Visor documentado",manifest:"Manifest IIIF"};
   const states={institutional_catalogue_verified:"Contrastado con catálogo institucional",recorded_not_individually_collated:"Dato registrado; sin cotejo individual",missing_requires_source:"Fuente documental aún no consignada"};
   for(const record of records){
    const block=html("section","cwd-ms");block.append(html("h4",null,[record.repository,record.shelfmark].filter(Boolean).join(" · ")));
    for(const fields of Object.values(record.fields||{}))for(const [key,field] of Object.entries(fields)){
     const value=field.value;
     row(block,labels[key]||key,value==null||value===""?"Sin dato acreditado en el registro":typeof value==="object"?JSON.stringify(value):value);
     const status=html("p","cwd-muted",states[field.status]||field.status||"Estado de cotejo no consignado");
     if(field.note)status.append(document.createTextNode(" · "+field.note));
     const source=field.sourceUrl||record.repositoryUrl;if(source){status.append(document.createTextNode(" · "));addA(status,"Consultar fuente",source)}
     block.append(status);
    }
    output.append(block);
   }
   if(!records.length)output.append(html("p",null,"Sin matriz ampliada para este testimonio; se conserva la ficha documentada anterior."));
   details.dataset.loaded="true";
  }catch(error){delete details.dataset.loaded;output.replaceChildren(html("p",null,"No se pudo cargar el detalle: "+error.message))}
 });
}
function renderCriticalAuthority(dest,w,d){
 const record=d.critical.get(w.id);
 if(!record){
  section(dest,"Estado filológico y ecdótico");
  dest.append(html("p","cwd-muted","La ficha básica permanece disponible; el inventario de integridad no pudo cargarse. No se infiere una edición completa ni un manuscrito más antiguo."));
  return;
 }
 const A=record.authority||{},I=record.integrity||{},M=record.manuscript||{},E=record.earlyEditions||{},X=record.ecdotics||{};
 section(dest,"Autoridad textual y nomenclatura crítica");
 row(dest,"Autor normalizado, con reserva de atribución",A.normalizedAuthor||A.author);
 row(dest,"Título uniforme de referencia",A.uniformTitle);
 row(dest,"Estatus del título y rúbricas",A.nomenclatureNote);
 row(dest,"Identificadores TLG/PHI (candidatos; no constituyen una URN de edición)",(A.candidateWorkCodes||[]).join(" · ")||"No acreditados");
 row(dest,"CTS de edición acreditada",A.ctsEditionUrn||"Sin URN CTS de edición verificada; no se construye por conjetura");
 section(dest,"Integridad de la obra y cobertura del original");
 const statusLabel={not_indexed:"Original pendiente de indexación",modern_manifestation:"Edición o estudio moderno, distinto de la obra clásica",partial_index:"Original indexado parcialmente",ancient_fragmentary:"Obra antigua transmitida fragmentariamente",original_greek_fragmentary:"Original griego perdido en parte; transmisión latina diferenciada",witness_partial:"Testigo más antiguo aquí documentado incompleto",collection_selected:"Colección seleccionada, sin cotejo global",books_present_not_collated:"Libros registrados; sin cotejo ecdótico integral documentado",scope_unverified:"Alcance de indexación aún no delimitado documentalmente"};
 row(dest,"Estado documentado",statusLabel[I.status]||I.status);
 row(dest,"Alcance textual",I.description);
 row(dest,"Lugar de indexación",I.indexed?(I.storage==="auxiliary_branch"?"Índice auxiliar fuera de GitHub Pages":"Corpus local del repositorio"):"No consta original indexado");
 if(Number.isInteger(I.offsitePassages))row(dest,"Pasajes del índice auxiliar",I.offsitePassages);
 row(dest,"Trabajo ecdótico pendiente",I.action);
 section(dest,"Códices y testimonio más temprano acreditado");
 const first=M.earliestInVerifiedRegister;
 if(first){
  row(dest,"Testimonio más temprano de nuestro registro",first.title);
  row(dest,"Biblioteca, ciudad y signatura",[first.repository,first.shelfmark].filter(Boolean).join(" · "));
  row(dest,"Datación",first.date);
  row(dest,"Contenido y límites",first.coverage);
  row(dest,"Alcance de la afirmación de antigüedad",M.earliestScope);
  const links=html("p","cwd-links");
  addA(links,"Catálogo y signatura institucional ↗",first.recordUrl);
  addA(links,"Consultar reproducción o imágenes ↗",first.viewerUrl);
  addA(links,"Manifiesto IIIF ↗",first.iiifManifestUrl);
  if(links.childNodes.length)dest.append(links);
 }else dest.append(html("p","cwd-muted","No consta aún un códice individual con signatura, datación y enlace verificables para esta obra. No se inventa un testigo antiguo ni se declara su inexistencia."));
 section(dest,"Versiones y ediciones antiguas / ediciones impresas");
 const dated=E.earliestDatedInCatalogue;
 if(dated){
  row(dest,"Edición fechada más temprana de los enlaces verificados",dated.title+" ("+dated.year+")");
  const links=html("p","cwd-links");addA(links,"Consultar edición documentada ↗",dated.url);if(links.childNodes.length)dest.append(links);
 }else row(dest,"Edición histórica más temprana documentada","No determinada en los registros fechados; no implica ausencia de ediciones anteriores");
 dest.append(html("p","cwd-muted",E.disclaimer||"La edición impresa más antigua registrada no es necesariamente la editio princeps. La versión más antigua conservada y la primera traducción requieren fuentes específicas."));
 section(dest,"Estado del aparato crítico y de la collatio codicum");
 if(X.apparatusPage){
  const refs=html("p","cwd-links");addA(refs,"Abrir Taller Ecdótico · loci griegos y variantes ↗",X.apparatusPage);dest.append(refs);
  row(dest,"Variantes descritas en el aparato",String(X.apparatusEntries||"Pendiente de recuento"));
  row(dest,"Tipo de cotejo",X.apparatusStatus);
 }
 if(X.verseIndexFile)row(dest,"Índice de loci del original",String(I.verseIndexed||0)+" versículos en "+String(I.chapterIndexed||0)+" capítulos; edición de lectura, no autopsia manuscrita");
 row(dest,"Base textual",X.textualSource);
 row(dest,"Variantes y lecturas",X.variantReadings);
 row(dest,"Stemma codicum",X.stemmaCodicum);
 row(dest,"Norma de referencia",X.bibliographyStandard);
 dest.append(html("p","cwd-muted","Fuente, testigo material, versión, recensión y lectura conjetural se documentan por separado. Un enlace externo no acredita aval institucional ni derechos de reproducción."));
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
 if(w.localOriginalCoverage)row(dest,"Cobertura del original local",w.localOriginalCoverage);
 if(w.localEdition?.completeness)row(dest,"Integridad de la versión",w.localEdition.completeness);
 if(w.localEdition?.source)row(dest,"Procedencia de la edición local",w.localEdition.source);
 for(const pdf of w.pdfEditions||[]){const rowPdf=html("p","cwd-links");addA(rowPdf,(pdf.label||"Edición histórica en PDF")+" ↗",pdf.url);if(rowPdf.childNodes.length)dest.append(rowPdf);if(pdf.status)row(dest,"Descripción del PDF",pdf.status)}
 if(w.translation?.status)row(dest,"Traducciones",w.translation.status);
}
function renderBibliography(dest,w){
 section(dest,"Ediciones y referencias · Chicago 18");
 const bibliography=sources(w);
 if(w.bibliography?.method)row(dest,"Método editorial declarado",w.bibliography.method);
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
function renderCodicologicalTree(dest,w,d){
 section(dest,"Árbol codicológico · tradición y filiación verificable");
 const tree=d.trees.get(w.id);
 if(!tree){dest.append(html("p","cwd-muted","El árbol de testimonios no está disponible; no se infieren familias o arquetipos."));return}
 const box=html("div","cwd-tree");
 const work=html("div","cwd-tree-work",w.author+" · "+w.title);
 box.append(work);
 if(!tree.witnesses.length){box.append(html("p","cwd-muted","Sin manuscrito individual identificado todavía: investigar Pinakes, Biblissima y catálogos institucionales."))}
 else {
  const list=html("ul","cwd-tree-list");
  for(const x of tree.witnesses){
   const li=html("li","cwd-tree-item"),strong=html("strong",null,x.label||x.id);
   li.append(strong);
   const meta=html("p","cwd-muted",[x.repository,x.dating,x.folioRange].filter(Boolean).join(" · "));
   li.append(meta);
   const linked=html("p","cwd-links");addA(linked,"Consultar fuente de la signatura ↗",x.sourceUrl);if(linked.childNodes.length)li.append(linked);
   list.append(li);
  }
  box.append(list);
 }
 dest.append(box);
 dest.append(html("p","cwd-muted","Las conexiones de la obra a los códices significan 'transmite esta obra', NO copia directa ni familia genealógica. El orden de los testigos no representa su fiabilidad ecdótica."));
 if(tree.families?.length){
  section(dest,"Recensiones o familias documentadas (sin parentesco de copia inferido)");
  for(const group of tree.families){
   row(dest,"Recensión acreditada",group.label+" · testigos: "+group.memberWitnessIds.join(", "));
   if(group.warning)dest.append(html("p","cwd-muted",group.warning));
   const refs=html("p","cwd-links");addA(refs,"Investigación que sustenta la clasificación ↗",group.source);if(group.secondarySource)addA(refs,"Otra fuente crítica ↗",group.secondarySource);if(refs.childNodes.length)dest.append(refs);
  }
 }
 if(tree.documentedFiliation?.length){
  section(dest,"Filiaciones publicadas en investigaciones");
  for(const edge of tree.documentedFiliation){
   row(dest,"Relación documentada",edge.source+" → "+edge.target+" · "+edge.certainty);
   if(edge.scholarlyBasis)row(dest,"Fundamento",edge.scholarlyBasis);
   const link=html("p","cwd-links");addA(link,"Estudio que documenta esta filiación ↗",edge.sourceUrl);dest.append(link);
  }
 }
 row(dest,"Estado del stemma codicum",tree.stemmaStatus==="not_established"?"No establecido: no inventar árbol de familias ni arquetipos":"Relación o clasificación recensional parcial; NO constituye stemma completo");
 const links=html("p","cwd-links");addA(links,"Datos y relaciones de las obras del repertorio ↗","data/classics-corpus/codicological-trees-222.json");dest.append(links);
}
function renderVitruviusStandard(dest,w,d){
 const rec=d.standard.get(w.id);
 section(dest,"Estándar Vitruvius · autoridad, cronología y control codicológico");
 if(!rec){dest.append(html("p","cwd-muted","Matriz normalizada pendiente de cargar. La ficha tradicional sigue disponible."));return}
 const id=rec.authority||{},meta=rec.work||{},ws=rec.witnesses||[];
 row(dest,"Canon de autoridad",id.system);
 row(dest,"Códigos de obra PHI / TLG propuestos",(id.candidateWorkCodes||[]).join(" · ")||"Pendiente de identificación canónica");
 row(dest,"Estado de autoridad","Los códigos propuestos no son una identidad bibliográfica confirmada hasta cotejar autor y título.");
 row(dest,"CTS URN de edición",id.ctsEditionUrn||"Pendiente de verificar una edición individual publicada; no se fabrica a partir del código de obra");
 row(dest,"Composición de la obra",meta.compositionDating||"Sin fecha acreditada");
 row(dest,"Género / materia",meta.genre||"Pendiente");
 row(dest,"Datación de los códices","Independiente de la fecha de composición (véanse testimonios individualizados)");
 if(!ws.length)row(dest,"Testimonios individualizados","Pendiente");
 for(const m of ws){
  const item=html("div","cwd-ms");
  row(item,"Repositorio y signatura",[m.repository,m.shelfmark].filter(Boolean).join(" · "));
  row(item,"Siglum para aparato crítico",m.siglum||"Sin siglum crítico acreditado");
  if(m.siglum)row(item,"Reserva sobre siglum","Comprobar su uso en la edición crítica de control de esta obra");
  row(item,"Datación paleográfica",m.paleographicDating||"Pendiente");
  row(item,"Soporte",m.material||"No documentado");
  row(item,"Extensión / folios",m.folios||"Sin folios acreditados");
  row(item,"Texto conservado, daños y lagunas",m.coverage||"Pendiente");
  row(item,"Observaciones codicológicas",m.physicalCondition);
  row(item,"Edición crítica de control para este testigo",m.criticalEditionReference||"No individualizada todavía");
  row(item,"Grado de verificación",m.sourceStatus);
  const l=html("p","cwd-links");
  addA(l,"Catálogo de manuscrito ↗",m.registryRecord);
  addA(l,"Digitalización institucional ↗",m.officialDigitization);
  addA(l,"Manifest IIIF registrado ↗",m.iiifManifest);
  addA(l,"Referencia de verificación ↗",m.verificationUrl);
  if(l.childNodes.length)item.append(l);
  dest.append(item);
 }
 const refs=rec.editorialControl?.chicago18References||[];
 if(refs.length){row(dest,"Referencias editoriales registradas (revisar formato Chicago 18)",refs.join(" | "))}
 else row(dest,"Edición crítica y cita Chicago 18","Referencia editorial incompleta en este registro");
 const a=html("p","cwd-links");
 addA(a,"Consultar la matriz de fichas ↗","https://github.com/diegoalonsok-png/vitruvius-digital-library/blob/main/data/classics-corpus/vitruvius-standard-222.json");
 dest.append(a);
}
function renderAcademicSummary(dest,w,d){
 const critical=d.critical.get(w.id)||{};
 const integrity=critical.integrity||{};
 const authority=critical.authority||{};
 const original=w.language;
 const witnesses=witnessesFor(d,w.id);
 const direct=witnesses.filter(ms=>!String(ms.witnessKind||"").startsWith("ancient_translation"));
 const indirect=witnesses.length-direct.length;
 const facsimiles=witnesses.filter(ms=>Boolean(ms.viewer||ms.localViewer));
 const isModern=w.manuscript?.isIndependentAncientWork===false;
 const sec=html("section","cwd-overview");
 sec.append(html("h3",null,"Estado de investigación y fuentes primarias"));
 row(sec,"Unidad bibliográfica",isModern?"Edición / estudio moderno vinculado a una obra antigua":"Obra antigua; distintas versiones y testimonios no se confunden");
 row(sec,"Identificador de obra",w.id+(authority.candidateWorkCodes?.length?" · códigos propuestos: "+authority.candidateWorkCodes.join(", "):""));
 row(sec,"Cobertura del texto original",integrity.indexed?"Existe una transcripción o índice textual asociado; la integridad se documenta por separado":"Texto original no acreditado en el índice principal");
 if(integrity.description)row(sec,"Reservas de integridad",integrity.description);
 row(sec,"Testigos materiales individualizados",String(witnesses.length)+"; "+direct.length+" directos o sin clasificar, "+indirect+" traducción(es) antigua(s) indirecta(s)");
 row(sec,"Estado de comprobación para esta obra",witnesses.some(ms=>ms.priorityClaim==="oldest_known_extant_copy_explicitly_claimed_by_holding_institution")?"La institución identifica expresamente el testimonio como copia conservada más antigua conocida":witnesses.some(ms=>/^institutional_catalogue_checked/.test(ms.verificationLevel||""))?"Existe al menos un registro revisado contra catálogo institucional; NO se ha determinado prioridad mundial":witnesses.some(ms=>/^secondary_scholarly_source_checked/.test(ms.verificationLevel||""))?"Testigos identificados mediante publicaciones académicas; pendiente corroboración institucional y comparación global":witnesses.length?"Testimonios registrados; prioridad mundial no demostrada":"Sin testigo individual documentado en este inventario; investigación pendiente");

 row(sec,"Acceso a imágenes o folios",facsimiles.length+" testimonio(s) con dirección de visor o imagen registrada; la carga y la identificación precisa se auditan por separado");
 row(sec,"Alcance de verificación","Metadatos de catálogos; ninguna concordancia por título equivale a una collatio codicum.");
 row(sec,"Control automático","Auditoría Python de las fichas del repertorio; candidatos nuevos quedan en cuarentena hasta verificar signatura, contenido y fuentes.");
 const refs=html("p","cwd-links");
 addA(refs,"Matriz codicológica del repertorio ↗","classics-manuscript-coverage.html");
 addA(refs,"Informe de auditorías Python en GitHub ↗","https://github.com/diegoalonsok-png/vitruvius-digital-library/actions/workflows/codicology-self-audit.yml");
 addA(refs,"Norma descriptiva TEI / DCRM(MSS) / Chicago 18 ↗","https://github.com/diegoalonsok-png/vitruvius-digital-library/blob/main/docs/protocolo-filologico-codicologico-tei-chicago18.md");
 sec.append(refs);
 dest.append(sec);
}
/* Consulta complementaria: Google IA puede orientar el descubrimiento, no certifica manuscritos. */
function renderResearchAssist(dest,w){
 const sec=html("section","cwd-research-assist");
 section(sec,"Investigación asistida · manuscrito más antiguo");
 sec.append(html("p","cwd-muted","Consulta externa orientativa. Las respuestas de Google Modo IA NO se importan como datos verificados: compruebe catálogo de la institución, signatura, datación, contenido, folios y permiso de reproducción antes de incorporarlas a la ficha."));
 const q="¿Cuál es el códice más antiguo conservado de "+w.title+" de "+w.author+"? Distingue el testimonio material más antiguo (papiro o fragmento) del códice más antiguo, identifica biblioteca, signatura, siglo, folios, fuente institucional y URL del visor digital. Si hay incertidumbre, indícala.";
 const links=html("p","cwd-links");
 addA(links,"Consultar en Google Modo IA ↗","https://www.google.com/search?udm=50&q="+encodeURIComponent(q));
 addA(links,"Búsqueda web de catálogos ↗","https://www.google.com/search?q="+encodeURIComponent(w.author+" "+w.title+" oldest manuscript codex shelfmark library"));
 sec.append(links);
 row(sec,"Alcance de la búsqueda externa","Los resultados de IA o de buscadores son pistas y requieren comprobación en el catálogo custodio.");
 dest.append(sec);
}
function renderInto(target,id,opts={}){
 if(!target)return Promise.resolve(null);
 if(window.EditorialWorkRecords?.has(id))return window.EditorialWorkRecords.render(target,id);
 target.replaceChildren(html("p","cwd-muted","Cargando ficha crítica…"));
 return store().then(d=>{
  const w=d.docs.get(id);if(!w){target.replaceChildren(html("p","cwd-muted","La obra no figura en el catálogo verificado."));return null}
  target.replaceChildren();
  target.classList.add("classic-work-dossier");target.dataset.workId=id;
  const head=html("header","cwd-head");
  head.append(html("p","cwd-kicker","BIBLIOTHECA · FICHA CRÍTICA · CHICAGO 18 · TRADICIÓN MANUSCRITA"));
  const h=html("h2",null,w.title);h.lang=w.language==="grc"?"grc":"la";head.append(h);
  row(head,"Autor del catálogo",w.author);
  const originalAuthor=w.bibliography?.originalAuthor||AUTHOR[w.author];
  if(originalAuthor){const r=html("p","cwd-row cwd-authority-name");r.append(html("strong",null,"Nombre antiguo normalizado: "));const name=html("span",null,originalAuthor);name.lang=greek.test(originalAuthor)?"grc":"la";r.append(name);head.append(r)}
  const form=title(w);
  if(form.title){const r=html("p","cwd-row");r.append(html("strong",null,"Título en lengua original / título uniforme: "));const span=html("i","cwd-original",form.title);span.lang=w.language==="grc"?"grc":"la";r.append(span);head.append(r)}
  else row(head,"Título original",form.description);
  head.append(html("p","cwd-muted",form.description));
  row(head,"Lengua",[langLabel[w.language]||w.language,w.genre].filter(Boolean).join(" · "));
  row(head,"Datación de composición",w.dating||"Sin datación consignada");
  if(w.century)row(head,"Siglo editorial del registro",w.century);
  if(w.period&&w.period!==w.century)row(head,"Período catalográfico",w.period);
  if(w.aliases?.length)row(head,"Formas y títulos alternativos",w.aliases.join(" · "));
  row(head,"ID estable del catálogo",w.id);
  const authority=d.audit.get(w.id);
  if(authority?.candidateWorkCodes?.length)row(head,"Nomenclatura PHI/TLG candidata (código de obra, no URN CTS de edición)",authority.candidateWorkCodes.join(" · "));
  if(authority)row(head,"Identificador CTS de edición",authority.ctsEditionUrn||"URN CTS de edición no documentada; los códigos PHI/TLG identifican obras, no ediciones");
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
  renderVitruviusStandard(target,w,d);
  renderAcademicSummary(target,w,d);
  renderCriticalAuthority(target,w,d);
  renderWitness(target,w,d);
  renderExpandedCodicology(target,w,d);
  renderCodicologicalTree(target,w,d);
  renderResearchAssist(target,w);
  renderCodicology(target,w);
  renderEditions(target,w,d);
  renderBibliography(target,w);
  section(target,"Metodología de la ficha");
  target.append(html("p","cwd-muted","Los loci clásicos identifican lugares del texto; un número de página de edición y un folio físico son sistemas de referencia diferentes. Un manuscrito puede contener solo fragmentos. Los datos manuscritos provienen del registro de testimonios verificados; la bibliografía, del catálogo editorial. Enlaces a recursos externos no implican derechos de reproducción ni aval institucional."));
  const coverage=html("p","cwd-links");addA(coverage,"Consultar la matriz completa del repertorio ↗","classics-manuscript-coverage.html");target.append(coverage);
  const version=html("p","cwd-muted","Procedencia interna: catálogo Bibliotheca (repertorio completo en esta versión); testimonios validados ("+d.witnessCount+"); índice de versiones textuales. Estilo de descripción bibliográfica: The Chicago Manual of Style, 18.ª ed. (2024), notas y bibliografía, en la medida de los metadatos disponibles.");
  target.append(version);
  return w;
 }).catch(err=>{target.replaceChildren(html("p","cwd-muted","No se pudo cargar la ficha: "+(err?.message||"error de acceso")));return null});
}
function css(){
 if(document.getElementById("cwd-style"))return;
 const style=html("style");style.id="cwd-style";style.textContent=[
 ".classic-work-dossier{background:#151517;color:#e8e8e9;border:1px solid #505056;border-radius:6px;padding:16px 18px;min-width:0;overflow-wrap:anywhere;margin:14px 0}",
 ".classic-work-dossier h2{font:400 clamp(21px,2.2vw,26px)/1.25 'Gentium Book Plus',Georgia,serif;margin:4px 0 10px}",
 ".classic-work-dossier h3{font:400 16px/1.4 Georgia,serif;margin:18px 0 8px;border-top:1px solid #48484c;padding-top:12px}",
 ".classic-work-dossier p{font:13px/1.7 system-ui,Arial,sans-serif;margin:7px 0}",
 ".classic-work-dossier strong{font-weight:650}",
 ".classic-work-dossier .cwd-kicker{font:600 11px/1.5 system-ui;letter-spacing:.10em;opacity:.83}",
 ".classic-work-dossier .cwd-muted{color:#b8b8bb;font-size:12px}",
 ".classic-work-dossier .cwd-links{display:flex;gap:7px 18px;flex-wrap:wrap}",
 ".classic-work-dossier a{color:#e3c78f;text-decoration:underline;text-underline-offset:3px}",
 ".cwd-tree{margin:12px 0;padding:15px;border:1px solid #67676a;border-radius:9px}",
 ".cwd-tree-work{font-weight:700;padding:11px 13px;border:1px solid #747476;border-radius:6px;text-align:center;max-width:490px;margin:0 auto}",
 ".cwd-tree-list{margin:0 auto;padding:24px 0 0;list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:14px;border-top:0}",
 ".cwd-tree-item{position:relative;flex:1 1 210px;max-width:420px;min-width:180px;padding:12px;border:1px solid #666;border-radius:7px;overflow-wrap:anywhere}",
 ".cwd-tree-item:before{content:'';position:absolute;top:-11px;left:50%;height:10px;border-left:1px dashed #888}",
 "html[data-theme=light] .cwd-tree,html[data-theme=light] .cwd-tree-item,html[data-theme=light] .cwd-tree-work{border-color:#949494}",
 ".classic-work-dossier [lang=grc]{font-family:'Gentium Book Plus',Cardo,Georgia,serif}",
 ".classic-work-dossier .cwd-original{font-size:15px}",
 ".classic-work-dossier .cwd-ms{border-left:3px solid #777;padding:6px 12px;margin:13px 0;background:rgba(120,120,120,.07)}",
 ".classic-work-dossier .cwd-overview{padding:10px 14px 14px;border:1px solid #585858;border-radius:4px;background:rgba(130,130,130,.06);margin:16px 0}",
 ".classic-work-dossier .cwd-overview h3{margin-top:0;padding-top:0;border-top:0}",
 ".classic-work-dossier .cwd-versions{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:9px;margin:12px 0}",
 ".classic-work-dossier .cwd-edition{border:1px solid #555;padding:10px}",
 ".classic-work-dossier .cwd-edition small{display:block;font:11px/1.5 system-ui;color:#bababa;margin-top:4px}",
 ".classic-work-dossier .cwd-citations{padding-left:24px}",
 ".classic-work-dossier .cwd-citations li{margin-bottom:11px;line-height:1.65}",
 ".classic-work-dossier .cwd-citations li small{display:block;color:#bbb;font:11px/1.6 system-ui}",
 ".classic-work-dossier .cwd-citation{border-left:2px solid #999;padding:8px 12px;font:12px/1.6 system-ui}",
 ".classic-work-dossier .cwd-head{display:block!important;max-width:none!important;padding:2px 0 16px!important;margin:0 0 18px!important;border-bottom:1px solid var(--cwd-line,#505056)!important;background:transparent!important;color:inherit!important;letter-spacing:normal!important}",
 ".classic-work-dossier .cwd-head .cwd-kicker{margin:0 0 10px!important;font:600 10px/1.5 system-ui,Arial,sans-serif!important;letter-spacing:.085em!important;text-transform:uppercase;color:inherit;opacity:.68}",
 ".classic-work-dossier .cwd-head h2{font:400 clamp(20px,2vw,25px)/1.26 Georgia,serif!important;letter-spacing:-.012em!important;margin:0 0 15px!important;padding:0!important;color:inherit!important;text-transform:none!important}",
 ".classic-work-dossier .cwd-head .cwd-row{display:grid!important;grid-template-columns:minmax(165px,240px) minmax(0,1fr);column-gap:16px;align-items:baseline;max-width:100%;font:400 13px/1.6 system-ui,Arial,sans-serif!important;letter-spacing:normal!important;margin:0!important;padding:5px 0!important;border-bottom:1px solid rgba(128,128,128,.15);overflow-wrap:anywhere}",
 ".classic-work-dossier .cwd-head .cwd-row>strong{display:block!important;min-width:0!important;font:600 10px/1.45 system-ui,Arial,sans-serif!important;letter-spacing:.055em!important;text-transform:uppercase!important;font-style:normal!important;color:inherit!important;opacity:.67!important;margin:0!important;white-space:normal!important}",
 ".classic-work-dossier .cwd-head .cwd-authority-name span,.classic-work-dossier .cwd-head .cwd-original{font:400 13px/1.55 Georgia,serif!important;letter-spacing:normal!important;color:inherit!important}",
 ".classic-work-dossier .cwd-head>.cwd-muted{font:400 11px/1.5 system-ui,Arial,sans-serif!important;opacity:.72!important;margin:8px 0 12px!important}",
 ".classic-work-dossier .cwd-head .cwd-links{margin:14px 0 0!important;display:flex!important;gap:8px 20px!important;flex-wrap:wrap!important;font:400 12px/1.5 system-ui,Arial,sans-serif!important}",
 ".classic-work-dossier .cwd-head .cwd-links a{color:inherit!important;text-decoration-color:currentColor;text-decoration-thickness:1px;text-underline-offset:4px;opacity:.88}",
 "@media(max-width:650px){.classic-work-dossier .cwd-head .cwd-row{grid-template-columns:1fr!important;gap:2px!important;padding:7px 0!important}.classic-work-dossier .cwd-head h2{font-size:21px!important}}",
 "@media print{.classic-work-dossier .cwd-head .cwd-row{grid-template-columns:185px minmax(0,1fr)}.classic-work-dossier .cwd-head h2{font-size:22px!important}}",
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
