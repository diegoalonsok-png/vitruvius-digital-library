/* Bibliotheca home work-title and author lookup.
 * Indexes catalogued works, not book contents. Aliases are search aids only.
 */
(()=>{"use strict";
const path="data/classics-corpus/title-search-aliases-multilingual.json";
const lang={la:"latín",grc:"griego",he:"hebreo",arc:"arameo",ar:"arameo",es:"castellano",en:"inglés",fr:"francés",it:"italiano",de:"alemán",pt:"portugués"};
const greek={α:"a",β:"b",γ:"g",δ:"d",ε:"e",ζ:"z",η:"e",θ:"th",ι:"i",κ:"k",λ:"l",μ:"m",ν:"n",ξ:"x",ο:"o",π:"p",ρ:"r",σ:"s",τ:"t",υ:"y",φ:"ph",χ:"ch",ψ:"ps",ω:"o"};
const normal=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f\u1dc0-\u1dff]/g,"").toLowerCase().replace(/[ςϲ]/g,"σ").replace(/ϐ/g,"β").replace(/ϑ/g,"θ").replace(/ϕ/g,"φ").replace(/ϖ/g,"π").replace(/ſ/g,"s").replace(/æ/g,"ae").replace(/œ/g,"oe").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const roman=s=>normal(s).replace(/[α-ω]/g,c=>greek[c]||c);
const fold=s=>normal(s);const norm=s=>normal(s);
const ancientGenres=[
 ["epic","Épica"],["lyric","Poesía lírica"],["tragedy","Tragedia"],["comedy","Comedia"],
 ["history","Historiografía"],["biography","Biografía"],["philosophy","Filosofía"],
 ["rhetoric","Retórica y oratoria"],["dialogue","Diálogo"],["satire","Sátira"],
 ["novel","Novela antigua"],["letters","Epistolografía"],["religion","Religión y exégesis"],
 ["medicine","Medicina"],["science","Ciencias y matemáticas"],["geography","Geografía"],
 ["architecture","Arquitectura y técnica"],["agriculture","Agronomía"],["law","Derecho"],
 ["grammar","Gramática y filología"],["other","Otros géneros registrados"]
];
const genrePatterns={
 epic:/epic|epop|epope|hom[eé]ric/,lyric:/liric|lyric|elegia|elegiac|oda|poesia amorosa/,
 tragedy:/traged|tragic/,comedy:/comed|comic/,
 history:/historiograf|historia|historical|cronica|annal/,
 biography:/biograf|vidas|vitae|life of/,philosophy:/filosof|philosoph|estoic|platon|aristotel|sapiencial|etica/,
 rhetoric:/retoric|rhetoric|oratoria|orat[oó]r|discurso|eloquenc/,
 dialogue:/dialog/,satire:/satir/,novel:/novela|romance|narrativa de ficcion/,
 letters:/epistolog|epistol|cartas|correspondencia/,
 religion:/cristian|religion|exeges|teolog|patrist|himno|hymn|mitolog|mitograf/,
 medicine:/medicin|farmacolog|medical/,science:/matemat|astronom|fisic|ciencia|naturalis|natural history/,
 geography:/geograf|cartograf|etnograf|periplo/,
 architecture:/arquitect|ingenier|agrimens|hidraul|mecanic|tecnic/,
 agriculture:/agricult|agronom|botanic/,law:/juridic|derecho|leyes|legal/,
 grammar:/gramat|linguist|filolog|erudic|lexic/
};
function ancientGenre(raw){
 const g=normal(raw);if(!g)return "";
 for(const [key] of ancientGenres)if(key!=="other"&&genrePatterns[key].test(g))return key;
 return "other";
}
function romanNumber(x){let n=0,last=0;for(const c of [...String(x).toUpperCase()].reverse()){const v={I:1,V:5,X:10,L:50,C:100,D:500,M:1000}[c]||0;n+=v<last?-v:v;last=v}return n}
function centuryOf(raw){
 const s=normal(raw);
 if(!s||/debatid|indeterminad|inciert|uncertain|disput|atribucion|composicion y atribuciones/.test(s))return "";
 // Las fechas editoriales y de testimonios no son fechas de composición.
 if(/\b(?:edicion|edition|recensio|impresion|imprenta|publicacion|publicado|published|manuscrito|manuscript|codex|codice|copia|copiado|transcripcion|facsimil|rose|krohn)\b/.test(s))return "";
 const before=/\b(?:a c|a e c|bce|bc|antes de cristo)\b/.test(s);
 const after=/\b(?:d c|ce|ad|despues de cristo)\b/.test(s);
 if(before===after)return "";
 const era=before?"bce":"ce";
 const c=s.match(/\b(?:siglo|siglos|century|centuries|s)\s+([ivxlcdm]+)\b/);
 if(c){
  const all=[...s.matchAll(/\b(?:siglo|siglos|century|centuries|s)\s+([ivxlcdm]+)\b/g)];
  if(all.length!==1)return "";
  const tail=s.slice(c.index+c[0].length).trim().replace(/^(?:a c|a e c|bce|bc|d c|ce|ad)\b/,"").trim();
  if(/^[ivxlcdm]+\b/.test(tail)||/\b(?:y|and|et)\s+[ivxlcdm]+\b/.test(tail))return "";
  const n=romanNumber(c[1]);return n>=1&&n<=14?era+":"+n:"";
 }
 const years=[...s.matchAll(/\b(\d{1,4})\b/g)].map(x=>Number(x[1])).filter(n=>n>0);
 if(!years.length||years.length>2)return "";
 const centuries=[...new Set(years.map(n=>Math.ceil(n/100)))];
 // Corpus antiguo: nunca clasificar como composición los años de una edición moderna.
 return centuries.length===1&&centuries[0]<=14?era+":"+centuries[0]:"";
}

/* Periodización histórica general orientativa. No representa una datación editorial
 * precisa ni reemplaza la ficha filológica. Solo se asigna si el intervalo de
 * composición queda completamente dentro del período. */
const historicalPeriods=[
 ["grc:mycenaean","Grecia · época micénica (c. 1600–1100 a. C.)",-1600,-1100,"grc"],
 ["grc:dark","Grecia · Edad Oscura (c. 1100–800 a. C.)",-1099,-801,"grc"],
 ["grc:archaic","Grecia · época arcaica (c. 800–480 a. C.)",-800,-481,"grc"],
 ["grc:classical","Grecia · época clásica (480–323 a. C.)",-480,-324,"grc"],
 ["grc:hellenistic","Grecia · época helenística (323–31 a. C.)",-323,-31,"grc"],
 ["grc:roman","Literatura griega · época romana (30 a. C.–284 d. C.)",-30,284,"grc"],
 ["grc:late","Literatura griega · Antigüedad tardía (285–700 d. C.)",285,700,"grc"],
 ["grc:byzantine","Mundo griego · época bizantina (701–1453)",701,1453,"grc"],
 ["grc:renaissance","Tradición griega · Renacimiento (1454–1600)",1454,1600,"grc"],
 ["grc:modern","Estudios griegos · época moderna y contemporánea (1601–2026)",1601,2026,"grc"],
 ["la:regal","Roma · época monárquica (753–509 a. C.)",-753,-510,"la"],
 ["la:republic","Roma · República (509–27 a. C.)",-509,-28,"la"],
 ["la:principate","Roma · Principado (27 a. C.–284 d. C.)",-27,284,"la"],
 ["la:late","Literatura latina · Antigüedad tardía (285–700 d. C.)",285,700,"la"],
 ["la:medieval-early","Latín medieval · Alta Edad Media (701–1000)",701,1000,"la"],
 ["la:medieval-high","Latín medieval · Plena Edad Media (1001–1300)",1001,1300,"la"],
 ["la:medieval-late","Latín medieval · Baja Edad Media (1301–1450)",1301,1450,"la"],
 ["la:renaissance","Humanismo latino · Renacimiento (1451–1600)",1451,1600,"la"],
 ["la:early-modern","Neolatín · Edad Moderna (1601–1800)",1601,1800,"la"],
 ["la:contemporary","Estudios latinos · siglos XIX–XXI (1801–2026)",1801,2026,"la"]
];
function compositionSpan(raw){
 const s=normal(raw);
 if(!s||/debatid|indeterminad|inciert|uncertain|disput|atribucion|edicion|edition|recensio|imprenta|publicacion|manuscrito|manuscript|codex|codice|facsimil|rose|krohn/.test(s))return null;
 const before=/\b(?:a c|a e c|bce|bc|antes de cristo)\b/.test(s);
 const after=/\b(?:d c|ce|ad|despues de cristo)\b/.test(s);
 if(before===after)return null;
 const sign=before?-1:1;
 const cs=s.match(/\b(?:siglo|siglos|century|centuries|s)\s+([ivxlcdm]+)\b/);
 if(cs){
  if(/\b(?:siglos|centuries)\b/.test(cs[0])&&/\b(?:y|and|et)\b/.test(s))return null;
  const remainder=s.slice(cs.index+cs[0].length).replace(/\b(?:a c|a e c|bce|bc|d c|ce|ad)\b/g,"").trim();
  if(/^[ivxlcdm]+\b/.test(remainder))return null;
  const n=romanNumber(cs[1]);if(n<1||n>21)return null;
  return sign<0?[-100*n,-100*(n-1)-1]:[100*(n-1)+1,100*n];
 }
 const years=[...s.matchAll(/\b(\d{1,4})\b/g)].map(x=>Number(x[1])).filter(n=>n>0);
 if(!years.length||years.length>2||years.some(n=>n>2026))return null;
 const bounds=years.map(y=>sign*y);
 return [Math.min(...bounds),Math.max(...bounds)];
}
function periodOfWork(w){
 const span=compositionSpan(w.dating);
 if(!span)return "";
 const tongues=new Set(w.versions.filter(v=>["grc","la"].includes(v.language)).map(v=>v.language));
 // Unoriginal-language entry is not enough to infer a historical tradition.
 if(tongues.size!==1)return "";
 const language=[...tongues][0];
 return historicalPeriods.find(([id,label,from,to,lang])=>lang===language&&span[0]>=from&&span[1]<=to)?.[0]||"";
}

const make=(tag,text,cls)=>{
 const el=document.createElement(tag);if(text!=null)el.textContent=String(text);if(cls)el.className=cls;return el;
};
const safeReader=s=>typeof s==="string"&&(
 /^(?:classics-text-reader|lector-bilingue|classics-parallel-reader|classics-remote-[a-z-]+-reader)\.html\?[\w.%=&+-]+$/.test(s)||
 /^corpus\/[a-z0-9/_-]+\.html$/i.test(s))?s:null;
const workLink=id=>"classics-work-record.html?work="+encodeURIComponent(id);
// Acceso transversal sin atribuir lemas ni correspondencias de loci no verificadas.
const lexiconWorkLink=id=>"vitruvia-lexicon.html?"+new URLSearchParams({work:id,mode:"palabra",lang:"auto"});
const facLink=id=>"buscador-facsimiles-clasicos.html?obra="+encodeURIComponent(id);
const safeR2Pdf=url=>typeof url==="string"&&/^https:\/\/libros\.vitruvius-digital-library\.org\/clasicos\/pdf\/[a-z0-9-]+\.pdf$/.test(url)?url:"";
// Manuscript witnesses are records linked to a work, never additional works.
let vitruvianCodices=[];
function renderVitruvianCodices(item,w){
 if(w.id!=="vitruvius"||!vitruvianCodices.length)return;
 const details=make("details",null,"bws-codices");
 const heading=make("summary","Códices de Vitruvio · "+vitruvianCodices.length+" registros documentados");
 details.append(heading);
 const ul=make("ul");ul.style.cssText="padding-left:20px;margin:8px 0";
 for(const c of vitruvianCodices){
  const li=make("li");li.style.marginBottom="9px";
  li.append(make("strong",c.title));
  const facts=[c.date,c.library].filter(Boolean).join(" · ");if(facts)li.append(make("div",facts,"bws-meta"));
  if(c.description)li.append(make("div",c.description,"bws-meta"));
  const actions=make("nav",null,"bws-actions");
  const local=typeof c.reader==="string"&&/^[a-z0-9-]+\.html(?:\?[a-z0-9&=._-]*)?$/i.test(c.reader)?c.reader:"";
  const external=typeof c.source==="string"&&/^https:\/\//.test(c.source)?c.source:"";
  if(local)addLink(actions,"Abrir visor o ficha",local);
  if(external)addLink(actions,"Fuente institucional",external);
  if(!local&&!external)addLink(actions,"Índice codicológico","index-codicum.html");
  li.append(actions);ul.append(li);
 }
 details.append(ul);item.append(details);
}
function loadVitruvianCodices(){
 fetch("data/vitruvia-codices.json",{cache:"no-cache"})
  .then(r=>{if(!r.ok)throw Error("Códices: HTTP "+r.status);return r.json()})
  .then(data=>{if(!Array.isArray(data.records))throw Error("Índice codicológico inválido");
   vitruvianCodices=[...new Map(data.records.filter(c=>c.group==="vitruvian"&&c.id&&c.title).map(c=>[c.id,c])).values()];
   render();
  }).catch(error=>console.warn("No se pudieron cargar los códices de Vitruvio:",error));
}
function addRecordedEditions(actions,w){
 for(const ed of (w.pdfEditions||[])){
  addLink(actions,
   "Leer PDF R2 · "+(ed.title||ed.id||"edición histórica").slice(0,84),ed.url);
  // The source's actual scope warning stays visible at the point of access.
  if(ed.scopeNote){
   const note=make("span"," · Alcance de la edición: "+ed.scopeNote,"bws-meta");
   actions.append(note);
  }
 }
}
// Align only registered, distinct textual languages. An OCR/PDF alone is not a collated edition.
const compareLink=w=>{
 const originals=w.versions.filter(v=>["la","grc"].includes(v.language)&&safeReader(v.reader));
 const translations=w.versions.filter(v=>!["la","grc"].includes(v.language)&&safeReader(v.reader));
 const left=originals[0]?.language;
 const right=translations.find(v=>v.language!==left)?.language||
   originals.find(v=>v.language!==left)?.language;
 const source=left||w.versions.find(v=>safeReader(v.reader))?.language;
 if(!source)return "";
 const u=new URL("classics-text-reader.html",location.href);
 u.searchParams.set("work",w.id);u.searchParams.set("lang",source);
 const target=right&&/^(?:es|en|fr)$/.test(right)?right:"es";
 u.searchParams.set("to",target);
 return u.pathname+u.search;
};
const heritageLink=raw=>{
 try{
  const u=new URL(String(raw||""),location.href);
  return u.origin===location.origin&&/\/[-a-z0-9]+\.html$/i.test(u.pathname)?u.pathname+u.search+u.hash:"";
 }catch{return ""}
};
const periodLabel=w=>historicalPeriods.find(([id])=>id===periodOfWork(w))?.[1]||"";
let model=null,loadedAliases={};
let integrityByWork=new Map();
function integrityLabel(id){
 const r=integrityByWork.get(id);if(!r)return "";
 if(r.status==="verified_structural_gap"||(r.latestTextChecks||[]).some(v=>v.sourceDeclaredMissing?.length||v.missingReferenceLoci?.length||v.emptyLoci?.length))return "Faltantes textuales documentados o loci no detectados · consultar ficha";
 if(r.status==="no_text_linked")return "Sin fuente textual vinculada";
 if(r.status==="scope_warning")return "Alcance de edición limitado o pendiente de cotejo";
 if((r.latestTextChecks||[]).some(v=>v.status==="needs_review"||v.status==="could_not_inspect")||(r.latestFacsimileChecks||[]).some(f=>f.pdfStatus==="manual_review_needed"||f.pdfStatus==="binary_discrepancy"||f.pdfReason||f.ocrReason))return "Observaciones de integridad · consultar ficha";
 if(r.status==="some_version_structure_confirmed")return "Estructura comprobada en alguna versión; no cotejo íntegro";
 return "";
}
function appendIntegrity(parent,w){const details=window.BibliothecaCompleteness?.describe(integrityByWork.get(w.id))||[];for(const d of details){const p=make("p",[(d.language||d.edition),d.text].filter(Boolean).join(" · "),"bws-meta");parent.append(p)}const value=integrityLabel(w.id);if(!value)return;const a=make("a",value,"bws-meta");a.href=workLink(w.id)+"#vdl-integrity-record";a.style.display="block";parent.append(a)}
const ROADMAP="data/classics-corpus/indexation-roadmap-222.json";
const R2_BASE="https://libros.vitruvius-digital-library.org/corpus/";
const optionalArticles=/^(?:el|la|los|las|le|les|l|the|a|an|der|die|das|il|lo|gli|i|un|una|uno)\s+/;
const titleKey=value=>normal(value).replace(optionalArticles,"");
const dedupQuery=query=>[...new Set([normal(query),titleKey(query),roman(query),titleKey(roman(query))].filter(Boolean))];
// Recuperación de nombres y títulos: normalización, orden libre y tolerancia a erratas.
// Es búsqueda aproximada de autoridades, NO lematización filológica del corpus.
const aliasAuthority={
 "vitruvius":["vitruvio","vitruvius","marcus vitruvius pollio","marco vitruvio polion","vitruvios","βιτρουβιος"],
 "caesar-gallico":["julio cesar","cesar julio","gaius iulius caesar","iulius caesar","julius caesar","caius julius caesar","γαϊος ιουλιος καισαρ","γαῖος ἰούλιος καῖσαρ"],
 "caesar-civili":["julio cesar","cesar julio","gaius iulius caesar","iulius caesar","julius caesar","γαῖος ἰούλιος καῖσαρ"]
};
// Autoridades compartidas por todas las obras: las variantes son claves de búsqueda,
// nunca nuevos registros, traducciones ni sustituciones del nombre catalogado.
const authorNameVariants={
 strabo:["Estrabón","Estrabon","Strabo","Strabon","Στράβων","Strabōn"],
 homer:["Homero","Homer","Homère","Homeros","Ὅμηρος"],
 hesiod:["Hesíodo","Hesiodo","Hesiod","Hésiode","Ἡσίοδος"],
 plato:["Platón","Platon","Plato","Πλάτων"],
 aristotle:["Aristóteles","Aristoteles","Aristotle","Aristote","Ἀριστοτέλης"],
 socrates:["Sócrates","Socrates","Socrate","Σωκράτης"],
 xenophon:["Jenofonte","Xenophon","Xénophon","Ξενοφῶν"],
 thucydides:["Tucídides","Tucidides","Thucydides","Thucydide","Θουκυδίδης"],
 herodotus:["Heródoto","Herodoto","Herodotus","Hérodote","Ἡρόδοτος"],
 plutarch:["Plutarco","Plutarch","Plutarque","Πλούταρχος"],
 ptolemy:["Ptolomeo","Tolomeo","Ptolemy","Ptolémée","Claudius Ptolemaeus"],
 sophocles:["Sófocles","Sofocles","Sophocles","Σοφοκλῆς"],
 euripides:["Eurípides","Euripides","Εὐριπίδης"],
 aeschylus:["Esquilo","Aeschylus","Eschyle","Αἰσχύλος"],
 aristophanes:["Aristófanes","Aristofanes","Aristophanes","Aristophane"],
 demosthenes:["Demóstenes","Demostenes","Demosthenes","Démosthène"],
 polybius:["Polibio","Polybius","Polybe"],
 diodorus:["Diodoro","Diodorus","Diodore","Diodoro Sículo","Diodorus Siculus"],
 cicero:["Cicerón","Ciceron","Cicero","Cicéron","Marco Tulio Cicerón"],
 vergil:["Virgilio","Virgil","Vergil","Virgile","Publius Vergilius Maro"],
 virgil:["Virgilio","Virgil","Vergil","Virgile","Publius Vergilius Maro"],
 ovid:["Ovidio","Ovid","Ovide","Publius Ovidius Naso"],
 horace:["Horacio","Horace","Horatius","Quintus Horatius Flaccus"],
 livy:["Tito Livio","Livio","Livy","Titus Livius","Tite-Live"],
 tacitus:["Tácito","Tacito","Tacitus","Tacite"],
 sallust:["Salustio","Sallust","Sallustius","Salluste"],
 seneca:["Séneca","Seneca","Sénèque","Lucius Annaeus Seneca"],
 lucan:["Lucano","Lucan","Lucain","Lucanus"],
 suetonius:["Suetonio","Suetonius","Suétone"],
 quintilian:["Quintiliano","Quintilian","Quintilianus","Quintilien"],
 apuleius:["Apuleyo","Apuleius","Apulée"],
 petronius:["Petronio","Petronius","Pétrone"],
 vitruvius:["Vitruvio","Vitruvius","Vitruve","Marco Vitruvio Polión"],
 caesar:["Julio César","Julio Cesar","Julius Caesar","Iulius Caesar","Jules César"],
 nepos:["Cornelio Nepote","Cornelius Nepos","Nepote","Nepos"],
 aesop:["Esopo","Aesop","Ésope","Αἴσωπος"],
 aelian:["Eliano","Aelian","Élien"],
 anacreon:["Anacreonte","Anacreon","Anacréon"],
 apollodorus:["Apolodoro","Apollodorus","Apollodore","Ἀπολλόδωρος"],
 apollonius:["Apolonio","Apollonius","Apollonios","Ἀπολλώνιος"],
 aratus:["Arato","Aratus","Aratos","Ἄρατος"],
 archimedes:["Arquímedes","Arquimedes","Archimedes","Archimède","Ἀρχιμήδης"],
 arrian:["Arriano","Arrian","Arrien","Flavius Arrianus","Ἀρριανός"],
 athenaeus:["Ateneo","Athenaeus","Athénée","Ἀθήναιος"],
 bacchylides:["Baquílides","Baquilides","Bacchylides"],
 callimachus:["Calímaco","Calimaco","Callimachus","Callimaque","Καλλίμαχος"],
 catullus:["Catulo","Catullus","Catulle"],
 celsus:["Celso","Celsus","Celse"],
 columella:["Columela","Columella","Columelle"],
 curtius:["Curcio Rufo","Quinto Curcio","Quintus Curtius Rufus"],
 dio:["Dión Casio","Dio Cassius","Dion Cassius"],
 diogenes:["Diógenes","Diogenes","Diogène","Διογένης"],
 dionysius:["Dionisio","Dionysius","Denys","Διονύσιος"],
 empedocles:["Empédocles","Empedocles","Empédocle","Ἐμπεδοκλῆς"],
 epictetus:["Epicteto","Epictetus","Épictète","Ἐπίκτητος"],
 epicurus:["Epicuro","Epicurus","Épicure","Ἐπίκουρος"],
 eratosthenes:["Eratóstenes","Eratostenes","Eratosthenes","Ératosthène"],
 eusebius:["Eusebio","Eusebius","Eusèbe","Εὐσέβιος"],
 frontinus:["Frontino","Frontinus","Frontin"],
 galen:["Galeno","Galen","Galien","Γαληνός"],
 gellius:["Aulo Gelio","Aulus Gellius","Aulu-Gelle"],
 heliodorus:["Heliodoro","Heliodorus","Héliodore","Ἡλιόδωρος"],
 hippocrates:["Hipócrates","Hipocrates","Hippocrates","Hippocrate","Ἱπποκράτης"],
 isocrates:["Isócrates","Isocrates","Isocrate","Ἰσοκράτης"],
 juvenal:["Juvenal","Juvénal","Iuvenalis"],
 laertius:["Diógenes Laercio","Diogenes Laertius","Diogène Laërce"],
 libanius:["Libanio","Libanius","Libanios","Λιβάνιος"],
 longinus:["Longino","Longinus","Longin"],
 longus:["Longo","Longus","Longos","Λόγγος"],
 lucian:["Luciano","Lucian","Lucien","Λουκιανός"],
 lucretius:["Lucrecio","Lucretius","Lucrèce"],
 lysias:["Lisias","Lysias","Λυσίας"],
 manilius:["Manilio","Manilius","Manile"],
 marcus:["Marco Aurelio","Marcus Aurelius","Marc Aurèle"],
 martial:["Marcial","Martial","Martialis"],
 menander:["Menandro","Menander","Ménandre","Μένανδρος"],
 musonius:["Musonio Rufo","Musonius Rufus"],
 nonnus:["Nono de Panópolis","Nonnus","Nonnos","Νόννος"],
 oppian:["Opiano","Oppian","Oppien"],
 origen:["Orígenes","Origen","Origène","Ὠριγένης"],
 pausanias:["Pausanias","Παυσανίας"],
 persius:["Persio","Persius","Perse"],
 pindar:["Píndaro","Pindaro","Pindar","Pindare","Πίνδαρος"],
 pliny:["Plinio","Pliny","Pline","Plinius"],
 plotinus:["Plotino","Plotinus","Plotin","Πλωτῖνος"],
 porphyry:["Porfirio","Porphyry","Porphyre","Πορφύριος"],
 proclus:["Proclo","Proclus","Proclos","Πρόκλος"],
 propertius:["Propercio","Propertius","Properce"],
 sappho:["Safo","Sappho","Sapho","Σαπφώ"],
 silius:["Silio Itálico","Silius Italicus"],
 statius:["Estacio","Statius","Stace"],
 theocritus:["Teócrito","Teocrito","Theocritus","Théocrite","Θεόκριτος"],
 theophrastus:["Teofrasto","Theophrastus","Théophraste","Θεόφραστος"],
 tibullus:["Tibulo","Tibullus","Tibulle"],
 varro:["Varrón","Varron","Varro"],
 vegetius:["Vegecio","Vegetius","Végèce"],
 velleius:["Veleyo Patérculo","Velleius Paterculus"]
};
const greekRoman={"αι":"ai","ει":"ei","οι":"oi","ου":"ou","α":"a","β":"b","γ":"g","δ":"d","ε":"e","ζ":"z","η":"e","θ":"th","ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"x","ο":"o","π":"p","ρ":"r","σ":"s","τ":"t","υ":"y","φ":"ph","χ":"ch","ψ":"ps","ω":"o"};
const foldAuthority=value=>normal(value).replace(/ς/g,"σ").replace(/αι|ει|οι|ου|[α-ω]/g,x=>greekRoman[x]||x)
 .replace(/\b(iulius|julius|iulio|iulios|julius|jules)\b/g,"julio")
 .replace(/\b(caesar|kaisar|kaisaros|καισαρ)\b/g,"cesar")
 .replace(/\b(gaius|caius|gayo|gaio|γαιος)\b/g,"")
 .replace(/\b(marcus|marco)\b/g,"marco").replace(/\s+/g," ").trim();
const tokens=s=>[...new Set(foldAuthority(s).split(" ").filter(x=>x.length>1))];
function editDistance(a,b,cap=3){
 if(Math.abs(a.length-b.length)>cap)return cap+1;
 const d=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
 for(let i=0;i<=a.length;i++)d[i][0]=i;
 for(let j=0;j<=b.length;j++)d[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
  const cost=a[i-1]===b[j-1]?0:1;
  d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+cost);
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
 }
 return Math.min(cap+1,d[a.length][b.length]);
}
// Vocabulario temático controlado (no equivale a lematización del corpus).
const subjects=[
 ["architecture","Arquitectura y construcción",["arquitectura","architecture","architectura","edificios","construccion"],/architect|arquitect|aedific|edific|construction|construccion|de architectura|vitruvi/],
 ["hydraulics","Agua y acueductos",["agua","acueducto","acueductos","aqueduct","aquaeductus","hidraulica"],/aqueduct|acueduct|aquaeduct|aquis|aquarum|hydraul|hidraul|frontinus/],
 ["war","Guerra y estrategia",["guerra","batalla","militar","estrategia","war","bellum","πολεμος"],/bell[oi]|war|guerra|militar|strateg|στρατ|πολεμ|tactic|poliorc/],
 ["politics","Política y Estado",["politica","republica","estado","gobierno","politics","res publica","πολιτεια"],/politic|πολιτ|republic|res publica|civitat|gobiern|government|estado/],
 ["ethics","Ética y virtud",["etica","moral","virtud","felicidad","ethics","virtus","ἀρετή"],/etic|ethic|moral|virtud|virtus|sapien|εθικ|ἀρετ|officiis/],
 ["rhetoric","Retórica y oratoria",["retorica","discurso","oratoria","rhetoric","orator","ρητορικη"],/retoric|rhetor|ρητορ|orator|eloquen|discurso|brutus/],
 ["poetry","Poesía, épica y teatro",["poesia","epica","teatro","tragedia","comedia","poetry","epos","ποιησις"],/poet|ποιη|poes|epic|epop|traged|comed|oda|carmina|aeneid|iliad|odysse/],
 ["religion","Religión y mitología",["religion","dioses","mitologia","culto","religio","mythos","θεος"],/religio|theolog|θεο|deorum|divin|myth|mitolog|culto|sacr/],
 ["mathematics","Matemáticas y geometría",["matematica","geometria","mathematics","geometry","geometria","γεωμετρια"],/matem|mathem|geometr|γεωμετρ|arithm|αριθμ|elementa|στοιχεια/],
 ["astronomy","Astronomía y cosmología",["astronomia","astros","cosmos","astronomy","astronomia","αστρονομια"],/astronom|astrolog|αστρο|cosmolog|κοσμ|phaenomen|φαινομεν/],
 ["physics","Física y filosofía natural",["fisica","naturaleza","ciencias naturales","physics","physica","φυσικη"],/fisic|physic|φυσικ|natural|naturae/],
 ["philosophy","Filosofía y pensamiento",["filosofia","filosofia antigua","philosophy","philosophia","φιλοσοφια"],/filosof|philosoph|φιλοσοφ|metaphys|μεταφυσ|plat[oó]n|arist[oó]t|stoic|estoic|dialect|λογικ/],
 ["medicine","Medicina y salud",["medicina","salud","anatomia","medicine","ιατρικη"],/medic|(?:^|\\s)ιατρ|salud|anatom|hippocrat|galen/],
 ["geography","Geografía y viajes",["geografia","mapas","viajes","geography","geographia","γεωγραφια"],/geogr|γεωγραφ|peripl|viaj|travel|mapa|cartograf/],
 ["history","Historia y biografías",["historia","cronica","biografia","history","historiae","ἱστορία"],/histor|ἱστορ|annal|cron|biograf|vitae|lives/],
 ["law","Derecho y leyes",["derecho","leyes","justicia","law","ius","lex","νομος"],/jurid|derecho|leges|justic|legal|legibus|νομ/],
 ["language","Gramática y filología",["gramatica","filologia","lengua","lexico","grammar","linguistics","γραμματικη"],/gramm|gramat|filol|philol|lexic|linguist|etymolog|etimolog/],
 ["agriculture","Agricultura y botánica",["agricultura","cultivos","botanica","agriculture","agri cultura","φυτα"],/agric|agron|botan|naturalis|georgic|rustic|plant|φυτ/]
];
const subjectText=w=>[w.genre,w.title,...(w.subjects||[]),...(w.topics||[])].filter(Boolean).join(" ");
const matchedSubjects=w=>subjects.filter(([id,label,aliases,pattern])=>
 pattern.test(normal(subjectText(w)))||
 (id==="philosophy"&&/^(?:plato|aristotle|epictetus|epicurus|plotinus|proclus|porphyry)(?:-|$)/.test(w.id||""))
).map(([id])=>id);
const requestedSubject=query=>{const q=foldAuthority(query);return subjects.find(([id,label,aliases])=>aliases.some(x=>foldAuthority(x)===q))?.[0]||""};
function rank(w,query){
 const queryTokens=tokens(query);if(!queryTokens.length)return 0;
 const q=foldAuthority(query),greekQuery=/\p{Script=Greek}/u.test(query);
 const authorKey=String(w.id||"").split("-")[0];
 const authority=[w.author,w.title,w.id.replaceAll("-"," "),...(w.forms||[]),...(w.originalAliases||[]),...(authorNameVariants[authorKey]||[]),...(aliasAuthority[w.id]||[])];
 let best=0;
 for(const field of new Set(authority)){
  if(greekQuery&&!/\p{Script=Greek}/u.test(field))continue;
  const val=foldAuthority(field);if(!val)continue;
  if(val===q)return 140;
  const fieldTokens=tokens(val);
  if(val===q)best=Math.max(best,140);
  if(val.startsWith(q))best=Math.max(best,115);
  if(val.includes(q))best=Math.max(best,90);
  const used=new Set();let total=0,matched=0;
  for(const token of queryTokens){
   let bestMatch=null;
   for(let i=0;i<fieldTokens.length;i++){
    if(used.has(i))continue;
    // Short names need caution; longer names can tolerate extra omissions/transpositions.
    const word=fieldTokens[i],allowed=token.length>=11?3:token.length>=7?2:token.length>=4?1:0;
    const distance=token===word?0:word.startsWith(token)&&token.length>=3?0.5:editDistance(token,word,allowed);
    if(distance<=allowed||(distance===0.5)){if(!bestMatch||distance<bestMatch.distance)bestMatch={i,distance}}
   }
   if(bestMatch){used.add(bestMatch.i);matched++;total+=bestMatch.distance}
  }
  if(matched===queryTokens.length)best=Math.max(best,Math.round(105-Math.min(30,total*9)-Math.max(0,fieldTokens.length-queryTokens.length)*2));
 }
 const subject=requestedSubject(query);
 if(subject&&matchedSubjects(w).includes(subject))best=Math.max(best,78);
 return best;
}
function originalTitle(w){
 const language=w.originalLanguage||w.language||w.versions?.find(v=>["grc","la"].includes(v.language))?.language||"";
 const choices=[...(w.originalTitle?[w.originalTitle]:[]),...(w.titleOriginal?[w.titleOriginal]:[]),...(w.tituloOriginal?[w.tituloOriginal]:[]),...(w.greekTitle?[w.greekTitle]:[]),...(w.latinTitle?[w.latinTitle]:[]),...(w.originalAliases||[]),...(loadedAliases[w.id]||[])];
 const greekScript=x=>/[\u0370-\u03ff\u1f00-\u1fff]/u.test(x);
 const latinScript=x=>/^[\p{Script=Latin}\p{M}\p{Zs}\p{P}0-9]+$/u.test(x);
 let name="";
 if(language==="grc")name=choices.find(x=>typeof x==="string"&&greekScript(x))||(greekScript(w.title)?w.title:"");
 if(language==="la")name=[w.originalTitle,w.titleOriginal,w.latinTitle,w.title].find(x=>typeof x==="string"&&latinScript(x))||"";
 if(!name&&greekScript(w.title))name=w.title;
 if(!name||normal(name)===normal(w.title))return "";
 return {name,language:language==="grc"||greekScript(name)?"grc":"la"};
}
/* Display attested catalogue title aliases beside original forms; never suggest
   that a translated title means a translated full-text edition is hosted. */
function spanishAuthorName(w){
 const key=String(w.id||"").split("-")[0];
 const candidate=authorNameVariants[key]?.[0]||"";
 return candidate&&normal(candidate)!==normal(w.author)?candidate:"";
}
function spanishWorkTitle(w){
 const names=loadedAliases[w.id];
 // The multilingual alias inventory records Spanish first, except the
 // Vitruvius authority entry, whose first entries are author names.
 const candidate=w.id==="vitruvius"?"Los diez libros de arquitectura":Array.isArray(names)?names[0]:"";
 // Some Greek work titles already include a Spanish equivalent after a separator.
 const normTitle=normal(w.title),normCandidate=normal(candidate);
 return candidate&&normCandidate&&!normTitle.includes(normCandidate)?candidate:"";
}
function bilingualWorkLabel(w,author=true){
 const title=w.title+(spanishWorkTitle(w)?" — "+spanishWorkTitle(w):"")+(window.BibliothecaCompleteness?.titleSuffix(integrityByWork.get(w.id))||"");
 const authorText=w.author+(spanishAuthorName(w)?" — "+spanishAuthorName(w):"");
 return author?title+" · "+authorText:title;
}
function appendWorkHeading(item,w){
 const heading=make("div",null,"bws-heading");
 const primary=make("a",bilingualWorkLabel(w,false));primary.className="bws-work-title";
  primary.href=compareLink(w)||workLink(w.id);
  primary.title="Abrir los dos visores académicos";
 heading.append(primary,make("span"," · "+w.author+(spanishAuthorName(w)?" — "+spanishAuthorName(w):"")));
 item.append(heading);
 const orig=originalTitle(w);
 if(orig){const line=make("p",null,"bws-original-title");
  const term=make("span",orig.language==="grc"?"Título original griego: ":"Título original latino: ");term.className="bws-original-label";
  const title=make("i",orig.name);title.lang=orig.language;line.append(term,title);item.append(line)}
}
function addLink(parent,text,href){
 if(!href)return;
 const a=make("a",text);a.href=href;parent.append(a);
}

const notableEditions=[
 {id:"rose-1899",type:"Edición crítica histórica",author:"Marcus Vitruvius Pollio · Valentinus Rose (editor)",title:"Vitruvii De architectura libri decem",date:"1899",url:"rose-1899.html",source:"https://archive.org/details/vitruviidearchit00vitr_0",forms:["Rose","Valentin Rose","Vitruvio Rose 1899","De architectura Rose","edición Rose"]},
 {id:"krohn-1912",type:"Edición crítica histórica",author:"Marcus Vitruvius Pollio · Fritz Krohn (editor)",title:"Vitruvii De architectura libri decem",date:"1912",url:"krohn-1912.html",source:"documents/krohn-1912.pdf",forms:["Krohn","Fritz Krohn","Vitruvio Krohn 1912","De architectura Krohn","edición Krohn"]},
 {id:"kurilo-v514",type:"Edición bilingüe contemporánea · latín y castellano",author:"Diego Kurilo",title:"Vitruvio. De architectura. Nueva recensio académica bilingüe: El arquitecto de la teoría",date:"2026",url:"lector-bilingue.html?edition=recensio-es&locus=1.1.1",doi:"10.5281/zenodo.23884757",isbn:"978-631-01-6651-3",forms:["V514","Kurilo español","Vitruvio castellano"]},
 {id:"kurilo-v554",type:"Edición bilingüe contemporánea · latín y francés",author:"Diego Kurilo",title:"Vitruve. De architectura. Nouvelle recensio académique bilingue: L’architecte de la théorie",date:"2026",url:"lector-bilingue.html?edition=recensio-fr&locus=1.1.1",doi:"10.5281/zenodo.23885110",isbn:"978-631-01-6651-3",forms:["V554","Kurilo francés","Vitruvio francés"]},
 {id:"kurilo-v297",type:"Edición bilingüe contemporánea · latín e inglés",author:"Diego Kurilo",title:"The Architect of Theory: Vitruvius and the Intellectual World of Roman Antiquity",date:"2026",url:"lector-bilingue.html?edition=theory-en&locus=1.1.1",doi:"10.5281/zenodo.23885404",isbn:"978-631-01-6651-3",forms:["V297","Kurilo inglés","Vitruvius English"]}
];
function isVitruviusQuery(q){return /vitruv|vitruvii|de architectura/i.test(foldAuthority(q))}
function isKuriloEditionQuery(q){
 const text=foldAuthority(q);
 return /\bkurilo\b|\bdiego kurilo\b|\bv514\b|\bv554\b|\bv297\b|architect of theory|arquitecto de la teoria|architecte de la theorie|nueva recensio academica|nouvelle recensio academique/i.test(text);
}
function isVitruvianEditionQuery(q){return isVitruviusQuery(q)||isKuriloEditionQuery(q)||/\b(?:krohn|fritz krohn|valentin rose|rose 1899)\b/i.test(foldAuthority(q))}
function renderNotable(q,append=false){
 const {list,count,more}=model;model.region.hidden=false;
 if(!append){list.replaceChildren();more.hidden=true}
 const result=[...notableEditions,...vitruvianCodices.map(c=>({
  id:c.id,type:"Testimonio manuscrito · "+(c.date||"fecha no consignada"),title:c.title,
  author:c.library||"Tradición manuscrita de Vitruvio",date:c.date||"",url:c.reader||"index-codicum.html",
  source:c.source||"",forms:[...(c.aliases||[]),"vitruvio","vitruvius","codex"]
 }))];
 const term=q.trim(),author=model.authorFilter.value.trim(),vitruvius=isVitruviusQuery(term);
 const authorKurilo=isKuriloEditionQuery(author);
 const matches=result.filter(e=>{
  const record={id:e.id,title:e.title,author:e.author,forms:e.forms||[]};
  const byQuery=!term||((vitruvius&&!isKuriloEditionQuery(term))?true:rank(record,term)>0);
  const byAuthor=!author||(authorKurilo&&e.id.startsWith("kurilo-"))||rank({...record,title:"",forms:[e.author,...(e.forms||[])]},author)>60;
  return byQuery&&byAuthor&&(!authorKurilo||e.id.startsWith("kurilo-"));
 });
 if(append){
  if(!matches.length)return;
  const section=make("li",null,"bws-item bws-editions-heading");
  section.append(make("h4",(isKuriloEditionQuery(term)||isKuriloEditionQuery(author)?"Ediciones de Diego Kurilo":"Códices y ediciones de Vitruvio")+" · "+matches.length+" registros"));
  section.append(make("p","Los testimonios manuscritos, las ediciones históricas y las traducciones modernas se muestran por separado; no se cuentan como obras antiguas distintas.","bws-meta"));
  list.append(section);
 }else count.textContent=matches.length+" ediciones y testimonios documentados · no se suman como obras antiguas independientes.";
 if(!matches.length){list.append(make("li","Sin coincidencias en ediciones modernas y códices documentados.","bws-empty"));return}
 for(const e of matches){
  const li=make("li",null,"bws-item"),heading=make("div",null,"bws-heading");heading.append(make("strong",e.title),make("span"," · "+e.author));li.append(heading);
  li.append(make("p",(e.id.startsWith("kurilo-")?e.id.split("-")[1].toUpperCase()+" · ":"")+e.type+(e.date?" · "+e.date:""),"bws-meta"));
  if(e.isbn||e.doi){const p=make("p",(e.isbn?"ISBN editorial declarado (atribución individual sin verificar): "+e.isbn:"")+(e.doi?" · DOI: "+e.doi:""),"bws-meta");li.append(p)}
  const links=make("nav",null,"bws-actions");addLink(links,e.id.startsWith("kurilo-")?"Leer edición":e.id==="rose-1899"||e.id==="krohn-1912"?"Consultar edición":"Consultar visor o ficha",e.url);
  if(e.source)addLink(links,e.id==="krohn-1912"?"Leer PDF histórico de Krohn":e.id==="rose-1899"?"Leer facsímil de Rose":"Fuente documental",e.source);
  if(e.doi)addLink(links,"DOI de la edición","https://doi.org/"+e.doi);
   if(e.id==="krohn-1912"||e.id==="rose-1899")addLink(links,"Cotejar edición por loci","colacion.html?locus=1.1.1");
   if(e.id.startsWith("kurilo-"))addLink(links,"Ficha bibliográfica","classics-work-record.html?work="+(e.id==="kurilo-v514"?"vitruvio-v514-pdf":e.id==="kurilo-v554"?"vitruvio-v554-pdf":"theory-v297-pdf"));
  li.append(links);list.append(li);
 }
}

function singleLetter(value){
 const input=String(value||"").trim();
 if(!/^[\p{Script=Latin}\p{Script=Greek}\p{M}]+$/u.test(input))return "";
 const key=normal(input).replace(/[ϲϹ]/g,"σ").replace(/ϐ/g,"β").replace(/ϑ/g,"θ").replace(/ϕ/g,"φ").replace(/ſ/g,"s");
 return [...key].length===1?key:"";
}
function letterMatch(w,letter,byTitle){
 const greek=/[\u0370-\u03ff\u1f00-\u1fff]/u.test(letter);
 // Una sola letra busca por autor O por título, cualquiera sea el orden visible.
 const fields=[w.author,w.title,w.originalTitle,w.titleOriginal,w.tituloOriginal,w.latinTitle,w.greekTitle,...(w.originalAliases||[]),...(loadedAliases[w.id]||[]),...(aliasAuthority[w.id]||[])];
 const candidates=greek?[...fields,w.title,w.originalTitle,w.greekTitle,w.titleOriginal,w.tituloOriginal,...(w.forms||[])]:fields;
 return candidates.some(value=>typeof value==="string"&&Boolean(value)&&
  (!greek||/[\u0370-\u03ff\u1f00-\u1fff]/u.test(value))&&
  (greek||!/[\u0370-\u03ff\u1f00-\u1fff]/u.test(value))&&normal(value).startsWith(letter));
}
function readingEditions(w){
 const recorded=model?.editionLabels?.[w.id]||[];
 return w.versions.map(v=>{
  const label=recorded.find(x=>x.language===v.language&&x.path===v.path)||{};
  const remote=model?.translationManifest?.get(v.path);
  const m=remote&&remote.workId===w.id&&remote.language===v.language&&remote.sha256&&remote.sha256===v.sha256?remote:{};
  const translator=(Array.isArray(m.translators)?m.translators.join(" · "):"")||label.translator||v.translator||"";
  const publicationYear=m.publicationYear||label.publicationYear||v.publicationYear||v.translationYear||v.editionYear||"";
  return {...v,...label,reader:v.reader,path:v.path,language:v.language,translator,publicationYear};
 });
}
function editionSummary(w){
 const base=readingEditions(w);
 const rows=[...new Map(base.filter(v=>v.language).map(v=>[[v.language,v.path||v.reader||v.translator||"",v.publicationYear||""].join("|"),v])).values()];
 const originals=rows.filter(v=>["la","grc"].includes(v.language));
 const translations=rows.filter(v=>!["la","grc"].includes(v.language));
 const source=originals.length?"Original: "+[...new Set(originals.map(v=>lang[v.language]||v.language))].join(", "):
  w.originalLanguage?"Original: "+(lang[w.originalLanguage]||w.originalLanguage):"";
 const labels=translations.map(v=>{
  const details=[v.translator||"Traductor no documentado",v.publicationYear||"Año no documentado",v.edition].filter(Boolean);
  const distinct=details.filter((value,i)=>!(i===1&&v.edition?.includes(String(value))));
  return (lang[v.language]||v.language)+(distinct.length?" ("+distinct.join(" · ")+")":"");
 });
 return [source,labels.length?"Traducciones: "+labels.join("; "):"Sin traducción alojada registrada"].filter(Boolean).join(" · ");
}
function appendEditionSummary(row,w){
 const value=editionSummary(w);if(!value)return;
 const note=make("span",value,"bws-edition-note");
 note.style.cssText="display:block;margin:4px 0 0;font:12px/1.5 system-ui,sans-serif;color:var(--muted,#b6b6b6);overflow-wrap:anywhere";
 note.setAttribute("aria-label","Idiomas y ediciones documentadas: "+value);
 row.append(note);
 const editions=readingEditions(w);
 if(!editions.some(v=>["en","fr","es"].includes(v.language)&&safeReader(v.reader))){
  const fallback=make("span","Sin versión registrada en castellano, inglés o francés · traducción automática orientativa, si está disponible en el lector.","bws-edition-note");
  fallback.style.cssText="display:block;font:12px/1.5 system-ui;opacity:.8";row.append(fallback);
 }
 for(const v of editions){
  if(!["en","fr","es","it","de","pt"].includes(v.language)||!v.reader||!safeReader(v.reader))continue;
  const link=make("a","Leer · "+(lang[v.language]||v.language)+" · "+(v.translator||"Traductor no documentado")+" · "+(v.publicationYear||"Año no documentado"),"bws-plain-record");
  link.href=safeReader(v.reader);row.append(link);
 }
}
function render(){
 if(!model)return;
 const {input,list,count,more,limit}=model,rawQuery=input.value.trim(),typedLetter=singleLetter(rawQuery),q=typedLetter?"":rawQuery;
 // Bibliotheca front: permanent, simple alphabetical list. Titles remain
 // linked to the actual scholarly record/reader; no covers or editorial cards.
 if(document.body.classList.contains("bibliotheca-plain-list")){
  const searched=rawQuery.trim();
  list.replaceChildren();more.hidden=true;count.textContent="";
  // Do not render the entire catalogue on initial load or after clearing.
  if(!searched){model.region.hidden=true;return;}
  const initial=singleLetter(searched);
  const browsing=!searched||Boolean(initial);
  const alphabetical=(a,b)=>a.w.title.localeCompare(b.w.title,"es",{sensitivity:"base",numeric:true})||a.w.author.localeCompare(b.w.author,"es",{sensitivity:"base"})||a.w.id.localeCompare(b.w.id);
  // The catalogue and reading registry are different: a work remains discoverable
  // even when no individual text has been hosted or verified.
  const authorityKey=w=>/^cts-tlg(\d+)-/.test(w.id)?w.id.match(/^cts-tlg(\d+)-/)[1]:"";
  const authorScore=w=>{
   const prefix=String(w.id||"").split("-")[0];
   const authorForms=[w.author,spanishAuthorName(w),...(authorNameVariants[prefix]||[])].filter(Boolean);
   return Math.max(0,...authorForms.map(value=>rank({id:"author",author:value,title:"",forms:[value],originalAliases:[]},searched)));
  };
  const scores=new Map();
  const exactAuthors=browsing?[]:model.items.filter(w=>{
   const score=authorScore(w);scores.set(w,score);return score>=115;
  });
  const authorNames=new Set(exactAuthors.map(w=>foldAuthority(w.author)));
  const authorCodes=new Set(exactAuthors.map(authorityKey).filter(Boolean));
  const isAuthor=exactAuthors.length>0;
  const scored=model.items.map(w=>({w,score:browsing?0:rank(w,searched)})).filter(x=>browsing?(!initial||letterMatch(x.w,initial,true)):isAuthor?(authorNames.has(foldAuthority(x.w.author))||authorCodes.has(authorityKey(x.w))||(scores.get(x.w)||0)>=115||x.score>=115):x.score>=55)
   .sort(alphabetical);
  model.region.hidden=false;
  count.textContent=(browsing?(initial?"Inicial «"+searched+"» · ":"Catálogo alfabético · "):"")+scored.length+" fichas"+(scored.length>limit?" · mostrando "+limit:"");
  if(!scored.length){list.append(make("li","No se encontraron obras en el catálogo. Pruebe otra grafía.","bws-empty"));return;}
  for(const {w} of scored.slice(0,limit)){
   const row=make("li",null,"bws-item");
   const link=make("a",bilingualWorkLabel(w),"bws-plain-title");
   const original=w.versions.find(v=>v.language===w.originalLanguage&&safeReader(v.reader));
   const version=original||w.versions.find(v=>safeReader(v.reader));
   link.href=version?safeReader(version.reader):w.heritageReader?heritageLink(w.heritageReader):workLink(w.id);
   link.title=version?"Leer edición registrada":"Consultar ficha académica";
   row.append(link);appendEditionSummary(row,w);
   const status=make("span",version?"Texto registrado":w.facsimile?"Facsímil/OCR declarado":"Ficha bibliográfica · texto no asociado","bws-plain-status");row.append(status);appendIntegrity(row,w);
   if(link.href!==new URL(workLink(w.id),location.href).href){const ficha=make("a","Ficha académica","bws-plain-record");ficha.href=workLink(w.id);row.append(ficha)}
   if(w.facsimile){const fac=make("a","Consultar facsímil/OCR","bws-plain-record");fac.href=facLink(w.facsimile);row.append(fac)}
   list.append(row);
  }
  if(scored.length>limit){more.hidden=false;more.textContent="Mostrar más obras ("+(scored.length-limit)+" restantes)";}
  return;
 }

 const hasFacets=Boolean(model.authorFilter.value.trim()||model.genreFilter.value||model.subjectFilter.value||model.centuryFilter.value||model.periodFilter.value||model.languageFilter.value||model.letter||typedLetter);
 const hasQuery=normal(q).length>=2;
 if(model.periodFilter.value==="modern-notable"){renderNotable(q);return;}
 if(!hasQuery&&!hasFacets&&!model.showAll&&!model.r2Only){
  model.region.hidden=true;list.replaceChildren();more.hidden=true;
  return;
 }
 const items=model.items.filter(w=>{
  const author=foldAuthority(model.authorFilter.value.trim());
  const genre=model.genreFilter.value,subject=model.subjectFilter.value,century=model.centuryFilter.value,period=model.periodFilter.value,language=model.languageFilter.value,letter=typedLetter||model.letter;
  const group=ancientGenre(w.genre);
   return (!model.r2Only||w.r2Original)&&(!author||rank({...w,title:"",forms:[w.author,...(aliasAuthority[w.id]||[])]},author)>=65)&&(!genre||group===genre)&&(!subject||matchedSubjects(w).includes(subject))&&(!century||centuryOf(w.dating)===century)&&(!period||periodOfWork(w)===period)&&(!language||w.versions.some(v=>v.language===language||(language==="arc"&&v.language==="ar")))&&(!letter||letterMatch(w,normal(letter),model.sortFilter.value==="title"));
 });
 list.replaceChildren();more.hidden=true;
 if(!q){
  if(model.compactFront&&!hasFacets&&!model.r2Only&&!model.showAll){model.region.hidden=true;return}
  model.region.hidden=false;
  count.textContent=(typedLetter?"Inicial «"+rawQuery+"» · ":model.letter?"Inicial «"+model.letter+"» · ":model.r2Only?"Originales registrados en Cloudflare R2 · ":"Catálogo completo · ")+items.length+" obras. El registro documental no acredita por sí solo disponibilidad HTTP.";
  const all=[...items].sort((a,b)=>model.sortFilter.value==="title"?a.title.localeCompare(b.title,"es",{sensitivity:"base"}):a.author.localeCompare(b.author,"es",{sensitivity:"base"})||a.title.localeCompare(b.title,"es",{sensitivity:"base"}));
  // El filtro por inicial debe mostrar TODAS las obras, no solo las primeras 40.
  for(const w of all.slice(0,typedLetter||model.letter?all.length:limit)){
   const li=make("li",null,"bws-item");
   appendWorkHeading(li,w);if(window.BibliothecaCoverMiniatures)li.prepend(window.BibliothecaCoverMiniatures.create(w));
   const meta=make("p",null,"bws-meta"),languages=[...new Set(w.versions.filter(v=>safeReader(v.reader)).map(v=>lang[v.language]||v.language))];
   meta.textContent=[w.genre||"",w.dating||"",periodLabel(w),matchedSubjects(w).slice(0,3).map(id=>subjects.find(x=>x[0]===id)?.[1]).filter(Boolean).join(" · "),languages.length?(w.r2Original?"Original R2 registrado · ":"Ediciones registradas · ")+languages.join(", "):w.heritageReader?"Edición histórica · visor de facsímiles":w.facsimile?"Facsímil disponible · OCR por comprobar":"Ficha catalográfica; texto no alojado"].filter(Boolean).join(" · ");li.append(meta);
   const actions=make("nav",null,"bws-actions");
   const o=w.versions.find(v=>["la","grc"].includes(v.language)&&safeReader(v.reader)),t=w.versions.find(v=>!["la","grc"].includes(v.language)&&safeReader(v.reader));
   if(o)addLink(actions,"Leer original",safeReader(o.reader));
   if(o){const u=new URL("classics-simple-parallel.html",location.href);u.searchParams.set("work",w.id);u.searchParams.set("left",o.language);u.searchParams.set("right","auto-es");addLink(actions,"Lectura simplificada",u.pathname+u.search);}
   if(t)addLink(actions,"Leer traducción · "+(lang[t.language]||t.language),safeReader(t.reader));
   if(w.heritageReader)addLink(actions,"Abrir edición histórica · "+w.heritageYear,heritageLink(w.heritageReader));
   const parallel=compareLink(w);if(parallel)addLink(actions,"Cotejar versiones registradas",parallel);
   if(w.facsimile)addLink(actions,"Ver facsímil",facLink(w.facsimile));
    if(w.versions.some(v=>safeReader(v.reader)))addLink(actions,"Lexicon · vocabulario de esta obra",lexiconWorkLink(w.id));
    addRecordedEditions(actions,w);
   if(w.id==="vitruvius")addLink(actions,"Ediciones, traducciones y códices","classics-work-record.html?work=vitruvius");
   else if(!w.heritageReader)addLink(actions,"Ficha académica",workLink(w.id));
   li.append(actions);appendIntegrity(li,w);renderVitruvianCodices(li,w);list.append(li);
  }
  if(!typedLetter&&!model.letter&&all.length>limit){more.hidden=false;more.textContent="Mostrar más obras ("+(all.length-limit)+" restantes)"}
  return;
 }
 model.region.hidden=false;
 if(normal(q).length<2){count.textContent="Escriba al menos dos caracteres.";return}
 const found=items.map(w=>({w,rank:rank(w,q)})).filter(r=>r.rank>=55)
  .sort((a,b)=>b.rank-a.rank||a.w.title.localeCompare(b.w.title,"es",{sensitivity:"base"}));
 count.textContent=found.length+" "+(found.length===1?"obra encontrada":"obras encontradas")+
  " por autor, título o materia documentada. Las equivalencias temáticas son orientativas, no lemas verificados.";
 if(!found.length){
  if(isVitruvianEditionQuery(q)||isKuriloEditionQuery(model.authorFilter.value)){renderNotable(q,true);return}
  list.append(make("li","No se encontraron obras con ese título o autor. Pruebe otra grafía o denominación.","bws-empty"));return
 }
 for(const {w} of found.slice(0,limit)){
  const item=make("li",null,"bws-item");
  appendWorkHeading(item,w);if(window.BibliothecaCoverMiniatures)item.prepend(window.BibliothecaCoverMiniatures.create(w));
  const meta=make("p",null,"bws-meta");
  const langs=w.versions.filter(v=>safeReader(v.reader)).map(v=>lang[v.language]||v.language);
  const avail=[...new Set(langs)];
  meta.textContent=[w.genre||"",w.dating||"",periodLabel(w),matchedSubjects(w).slice(0,3).map(id=>subjects.find(x=>x[0]===id)?.[1]).filter(Boolean).join(" · ")].filter(Boolean).join(" · ")+(w.genre||w.dating?" · ":"")+
   (avail.length?(w.r2Original?"Original R2 registrado · ":"Ediciones registradas · ")+avail.join(", "):w.heritageReader?"Edición histórica · visor disponible":w.facsimile?"Facsímil localizado; OCR no cotejado":"Ficha catalográfica; texto no disponible en este índice");
  item.append(meta);
  const actions=make("nav",null,"bws-actions");actions.setAttribute("aria-label","Acciones de "+w.title);
  const original=w.versions.find(v=>["la","grc"].includes(v.language)&&safeReader(v.reader));
  const translation=w.versions.find(v=>!["la","grc"].includes(v.language)&&safeReader(v.reader));
  if(original)addLink(actions,"Leer original",safeReader(original.reader));
  if(original){const u=new URL("classics-simple-parallel.html",location.href);u.searchParams.set("work",w.id);u.searchParams.set("left",original.language);u.searchParams.set("right","auto-es");addLink(actions,"Lectura simplificada",u.pathname+u.search);}
  if(translation)addLink(actions,"Leer traducción · "+(lang[translation.language]||translation.language),safeReader(translation.reader));
  if(w.heritageReader)addLink(actions,"Abrir edición histórica · "+w.heritageYear,heritageLink(w.heritageReader));
  const parallel=compareLink(w);if(parallel)addLink(actions,"Cotejar versiones registradas",parallel);
   if(w.facsimile)addLink(actions,"Ver facsímil",facLink(w.facsimile));
    if(w.versions.some(v=>safeReader(v.reader)))addLink(actions,"Lexicon · vocabulario de esta obra",lexiconWorkLink(w.id));
    addRecordedEditions(actions,w);
  if(!w.heritageReader)addLink(actions,"Ficha académica",workLink(w.id));
  item.append(actions);appendIntegrity(item,w);if(!(w.id==="vitruvius"&&isVitruviusQuery(q)))renderVitruvianCodices(item,w);list.append(item);
 }
 if(isVitruvianEditionQuery(q)||isKuriloEditionQuery(model.authorFilter.value)){
  renderNotable(q,true);
  count.textContent=found.length+" obra(s) del catálogo · códices, ediciones históricas y versiones modernas consultables en los resultados.";
 }
 if(found.length>limit){more.hidden=false;more.textContent="Mostrar más ("+(found.length-limit)+" restantes)"}
}
function mount(parent,data){
 if(model||!parent||!Array.isArray(data?.catalog?.works)||!Array.isArray(data?.registry?.entries))return;
 const index=new Map();
 for(const w of data.catalog.works)index.set(w.id,{
  id:w.id,title:w.title,author:w.author,genre:w.genre||"",subjects:Array.isArray(w.subjects)?w.subjects:[],topics:Array.isArray(w.topics)?w.topics:[],dating:w.dating||"",originalLanguage:w.language||w.originalLanguage||"",originalTitle:w.originalTitle||w.titleOriginal||w.tituloOriginal||"",latinTitle:w.latinTitle||"",greekTitle:w.greekTitle||"",originalAliases:Array.isArray(w.originalAliases)?w.originalAliases:[],forms:[w.title,w.author,w.id.replaceAll("-"," ")],
  versions:[],facsimile:w.inventoryFacsimiles?.[0]?.editionId||null,newWork:false
 });
 for(const e of data.registry.entries){
  let w=index.get(e.workId);
  if(!w){
   // Cataloguing may lag behind a readable transcription: never hide it.
   if(!/^[a-z0-9-]+$/.test(e.workId||"")||!e.title||!e.author)continue;
   w={id:e.workId,title:e.title,author:e.author,genre:"",dating:"",
     forms:[e.title,e.author,e.workId.replaceAll("-"," ")],
     versions:[],facsimile:null,newWork:false,registryOnly:true};
   index.set(e.workId,w);
  }
  w.forms.push(e.title||"",e.author||"");if(!w.originalLanguage&&["grc","la"].includes(e.language))w.originalLanguage=e.language;
  // Essential multilingual aliases must work even when the optional alias fetch is delayed.
  const essentials={"homer-iliad":["Ilíada","Iliada","La Ilíada","Iliad","The Iliad","L'Iliade","Ilias"],
   "homer-odyssey":["Odisea","La Odisea","Odyssey","The Odyssey","L'Odyssée"],
   "caesar-gallico":["Guerra de las Galias","La guerra de las Galias"],
   "caesar-civili":["Guerra civil","La guerra civil"]};
  if(essentials[e.workId])w.forms.push(...essentials[e.workId]);
  if(e.path?.startsWith(R2_BASE)&&["la","grc"].includes(e.language))w.r2Original=true;
   if(safeReader(e.reader)&&!w.versions.some(v=>v.language===e.language&&v.reader===e.reader))w.versions.push(e);
 }
 const section=make("section",null,"bws");section.id="bibliotheca-work-search";
 section.setAttribute("aria-labelledby","bws-title");
 const title=make("h3","Catálogo de obras");title.id="bws-title";
 const subtitle=make("p","Buscá autores, títulos, materias y equivalencias terminológicas; las aproximaciones temáticas no sustituyen un análisis filológico de los textos. Los filtros históricos son opcionales.","bws-intro");
 const form=make("form");form.setAttribute("role","search");form.setAttribute("aria-label","Búsqueda de obras clásicas");
 const label=make("label","Obra o autor");label.htmlFor="bws-query";
 const row=make("div",null,"bws-row");
 const input=make("input");input.id="bws-query";input.type="search";input.autocomplete="off";input.spellcheck=false;
 input.placeholder="De architectura · Περὶ ποιητικῆς · Ἰλιάς · Iliad · La République";
 input.setAttribute("aria-controls","bws-results");
 const submit=make("button","Buscar obra");submit.type="submit";
  const browse=make("button","Ver catálogo completo");browse.type="button";browse.className="bws-browse";
 const r2Browse=make("button","Ver originales R2");r2Browse.type="button";r2Browse.className="bws-browse";
 row.append(input,submit,browse,r2Browse);form.append(label,row);
 const region=make("div");region.hidden=true;
 const count=make("p",null,"bws-count");count.id="bws-count";count.setAttribute("role","status");count.setAttribute("aria-live","polite");
 const list=make("ol",null,"bws-results");list.id="bws-results";
 const more=make("button","Mostrar más obras","bws-more");more.type="button";more.hidden=true;
 region.append(count,list,more);
 const help=make("p",null,"bws-help");
 help.append("Para buscar palabras y pasajes dentro de las ediciones, consulte ");
 addLink(help,"Vitruvia","vitruvia.html");help.append(" o ");addLink(help,"Lexicon","vitruvia-lexicon.html");help.append(".");
 const filters=make("div",null,"bws-library-filters");
 const authorLabel=make("label",null,"bws-author-primary");authorLabel.htmlFor="bws-author-filter";
 const authorHeading=make("strong","AUTOR",authorLabel,"bws-author-heading");
 make("span","Buscá por nombre original, castellano o transliteración",authorLabel,"bws-author-caption");
 const authorFilter=make("input");authorFilter.id="bws-author-filter";authorFilter.type="search";authorFilter.placeholder="Homero · Ὅμηρος · Homer · Vitruvio · Platón";authorFilter.setAttribute("aria-label","AUTOR · filtrar obras por autor en cualquier idioma");
 const genreFilter=make("select");genreFilter.setAttribute("aria-label","Tipo de obra");genreFilter.append(new Option("Todos los tipos de obras",""));
 const presentGenres=new Set([...index.values()].map(w=>ancientGenre(w.genre)).filter(Boolean));
 ancientGenres.filter(([key])=>presentGenres.has(key)).forEach(([key,label])=>genreFilter.append(new Option(label,key)));
 const subjectFilter=make("select");subjectFilter.setAttribute("aria-label","Materia y tema de las obras");
 subjectFilter.append(new Option("Todas las materias",""));
 for(const [id,title] of subjects)subjectFilter.append(new Option(title,id));
 const centuryFilter=make("select");centuryFilter.setAttribute("aria-label","Siglo de composición");
 centuryFilter.append(new Option("Todos los siglos de composición",""));
 const centuries=new Set([...index.values()].map(w=>centuryOf(w.dating)).filter(Boolean));
 for(const era of ["bce","ce"])for(let n=30;n>=1;n--){
  if(era==="ce"&&n>21)continue;
  const key=era+":"+n;if(!centuries.has(key))continue;
  const roman=(num)=>{let out="";for(const [v,t] of [[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]])while(num>=v){out+=t;num-=v}return out};
  centuryFilter.append(new Option("Siglo "+roman(n)+(era==="bce"?" a. C.":" d. C."),key));
 }
 const periodFilter=make("select");periodFilter.setAttribute("aria-label","Época histórica de composición de las obras o categoría de ediciones y manuscritos");
 periodFilter.append(new Option("Todas las épocas históricas",""));
 for(const [id,label] of historicalPeriods)periodFilter.append(new Option(label,id));
 periodFilter.append(new Option("Ediciones modernas y testimonios históricos notables","modern-notable"));
 const languageFilter=make("select");languageFilter.setAttribute("aria-label","Lengua de texto disponible");
 [["","Todas las lenguas"],["grc","Griego"],["la","Latín"],["he","Hebreo"],["arc","Arameo"],["es","Castellano"],["en","Inglés"],["fr","Francés"]].forEach(([v,t])=>languageFilter.append(new Option(t,v)));
 const sortFilter=make("select");sortFilter.setAttribute("aria-label","Orden alfabético");
 [["author","Orden por autor A–Z"],["title","Orden por título A–Z"]].forEach(([v,t])=>sortFilter.append(new Option(t,v)));
 authorLabel.append(authorFilter);
 filters.append(authorLabel,genreFilter,subjectFilter,centuryFilter,periodFilter,languageFilter,sortFilter);
 const alphabet=make("nav",null,"bws-alphabet");alphabet.setAttribute("aria-label","Índice latino, griego y grafías históricas");
 const alphabetHint=make("p","Escribí una letra en el buscador (a, Α, ἀ…) para listar obras por inicial. El ático, el koiné y la escritura politónica comparten el alfabeto básico; las variantes gráficas y los signos arcaicos se muestran aparte.","bws-help");
 alphabet.append(alphabetHint);
 const rows=[
  ["Latín · mayúsculas y minúsculas",[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(x=>[x+" "+x.toLowerCase(),x])],
  ["Griego · mayúsculas y minúsculas",[..."ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"].map(x=>[x+" "+x.toLowerCase(),x])],
  ["Griego histórico, ático y politónico",[["Ϝ ϝ · digamma","Ϝ"],["Ϙ ϙ · qoppa","Ϙ"],["Ϻ ϻ · san","Ϻ"],["Ͱ ͱ · heta","Ͱ"],["Ϲ ϲ · sigma lunar","Ϲ"],["Ἀ ἀ","Ἀ"],["Ἁ ἁ","Ἁ"],["Ἐ ἐ","Ἐ"],["Ἠ ἠ","Ἠ"],["Ἰ ἰ","Ἰ"],["Ὀ ὀ","Ὀ"],["Ὑ ὑ","Ὑ"],["Ὠ ὠ","Ὠ"],["ᾼ ᾳ","ᾼ"]]],
  ["Latín · grafías editoriales y epigráficas",[["I i","I"],["V v","V"],["U u","U"],["J j","J"],["Æ æ · ligadura","Æ"],["Œ œ · ligadura","Œ"],["ſ · s larga","ſ"]]]
 ];
 const clearAlphabet=()=>alphabet.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed","false"));
 const allLetters=make("button","Todas las letras");allLetters.type="button";allLetters.setAttribute("aria-pressed","true");
 allLetters.addEventListener("click",()=>{input.value="";model.letter="";model.limit=40;clearAlphabet();allLetters.setAttribute("aria-pressed","true");render()});
 alphabet.append(allLetters);
 for(const [rowIndex,[label,letters]] of rows.entries()){
  const isGreekOrHistorical=rowIndex>0;
  const container=isGreekOrHistorical?make("details",null,"bws-alphabet-expander"):alphabet;
  if(isGreekOrHistorical){
   const toggle=make("summary","▼ Desplegar "+label,"bws-alphabet-toggle");
   container.append(toggle);
  }
  const group=make("div",null,"bws-alphabet-group");
  if(!isGreekOrHistorical)group.append(make("p",label,"bws-alphabet-heading"));
  for(const [name,value] of letters){
   const b=make("button",name);b.type="button";b.setAttribute("aria-pressed","false");
   b.addEventListener("click",()=>{input.value="";model.letter=value;model.limit=40;clearAlphabet();b.setAttribute("aria-pressed","true");render()});group.append(b);
  }
  container.append(group);
  if(isGreekOrHistorical)alphabet.append(container);else alphabet.append(group);
 }
 const advanced=make("details");advanced.className="bws-advanced";
 const summary=make("summary","Filtros avanzados · AUTOR, género, siglo, período, idioma y alfabeto");
 advanced.append(summary,filters,alphabet);
 const filterStyles=make("style",`.bws-alphabet-group{margin:10px 0 12px}.bws-alphabet-heading{font:600 12px/1.5 system-ui;margin:8px 0 5px;opacity:.8}.bws-alphabet-group button{margin:2px;padding:7px 9px;min-width:36px;font:12px/1.5 "Gentium Book Plus","Cardo",system-ui,sans-serif}.bws-alphabet-group button[aria-pressed=true]{outline:2px solid #ba9461;outline-offset:1px}.bws-library-filters .bws-author-primary{display:flex;flex-direction:column;gap:7px;min-width:min(100%,280px);grid-column:1/-1;padding:12px 14px;border:1px solid rgba(153,124,79,.55);border-radius:9px;background:rgba(160,132,85,.08)}.bws-author-primary .bws-author-heading{display:block;font:700 clamp(20px,2.5vw,28px)/1.15 system-ui,sans-serif;letter-spacing:.07em}.bws-author-primary .bws-author-caption{font:12px/1.4 system-ui,sans-serif;opacity:.82}.bws-library-filters .bws-author-primary input{width:100%;min-height:44px;font-size:16px;box-sizing:border-box}`);
 section.append(title,subtitle,form,filterStyles,advanced,region,help);
 const metric=parent.querySelector(":scope > dl");
 if(metric)metric.insertAdjacentElement("beforebegin",section);else parent.prepend(section);
 model={items:[...index.values()],index,input,list,count,more,region,authorFilter,genreFilter,subjectFilter,centuryFilter,periodFilter,languageFilter,sortFilter,letter:"",limit:40,showAll:false,r2Only:false,compactFront:parent.id==="front-classical-works"};

 // Bibliotheca has one visible search field shared with Lexicon's reading tools.
 // Filter the plain author/title list as the reader types, while leaving Enter
 // and the search button to their documented Lexicon destination.
 if(document.body.classList.contains("bibliotheca-plain-list")){
  const visible=document.getElementById("bibliotheca-lexicon-q");
  if(visible){
   // A compact dropdown belongs directly under the search form, not
   // at the bottom of the page or inside the hidden legacy search area.
   const visibleForm=visible.closest("#bibliotheca-lexicon-form");
   if(visibleForm){
    visibleForm.insertAdjacentElement("afterend",section);
    visible.setAttribute("aria-controls","bws-results");
    visible.setAttribute("aria-autocomplete","list");
   }
   let searchTimer;
   const sync=()=>{clearTimeout(searchTimer);input.value=visible.value;model.letter="";model.limit=40;render()};
   const schedule=event=>{
    if(event.isComposing)return;
    clearTimeout(searchTimer);
    searchTimer=setTimeout(sync,150);
   };
   visible.addEventListener("input",schedule);
   visible.addEventListener("compositionend",schedule);
   visible.addEventListener("search",sync);
   visible.addEventListener("change",schedule);
   const searchForm=document.getElementById("bibliotheca-lexicon-form");
   searchForm?.addEventListener("submit",event=>{
    event.preventDefault();event.stopImmediatePropagation();sync();
    const matches=list.querySelectorAll(".bws-plain-title");
    // Keep editorial choices visible before opening any reader, even for one match.
   },true);
   sync();
  }
 }

 for(const el of [authorFilter,genreFilter,subjectFilter,centuryFilter,periodFilter,languageFilter,sortFilter])el.addEventListener("input",()=>{model.limit=40;render()});
 list.tabIndex=0;list.setAttribute("aria-label","Obras: use las flechas arriba y abajo, Intro para abrir el enlace");
 list.addEventListener("keydown",e=>{
  if(!["ArrowDown","ArrowUp","Home","End"].includes(e.key))return;
  const anchors=[...list.querySelectorAll("a")];if(!anchors.length)return;
  e.preventDefault();const ix=anchors.indexOf(document.activeElement);
  const next=e.key==="Home"?0:e.key==="End"?anchors.length-1:e.key==="ArrowUp"?Math.max(0,ix-1):Math.min(anchors.length-1,ix+1);
  anchors[next].focus();
 });
 document.addEventListener("keydown",e=>{
  if(!list.contains(document.activeElement)||!["ArrowDown","ArrowUp"].includes(e.key))return;
  const anchors=[...list.querySelectorAll("a")],ix=anchors.indexOf(document.activeElement);
  if(ix<0)return;e.preventDefault();anchors[Math.max(0,Math.min(anchors.length-1,ix+(e.key==="ArrowDown"?1:-1)))].focus();
 });
 form.addEventListener("submit",e=>{e.preventDefault();model.limit=40;render();const q=input.value.trim();if(q.length<2)return;const found=model.items.map(w=>({w,score:rank(w,q)})).filter(x=>x.score>=55&&compareLink(x.w)).sort((a,b)=>b.score-a.score);if(found.length)location.assign(compareLink(found[0].w));});
  browse.addEventListener("click",()=>{model.r2Only=false;model.showAll=!model.showAll;model.limit=40;input.value="";r2Browse.textContent="Ver originales R2";browse.textContent=model.showAll?"Ocultar catálogo completo":"Ver catálogo completo";render()});
 r2Browse.addEventListener("click",()=>{model.r2Only=!model.r2Only;model.showAll=model.r2Only;model.limit=50;input.value="";for(const filter of [model.authorFilter,model.genreFilter,model.subjectFilter,model.centuryFilter,model.periodFilter,model.languageFilter])filter.value="";model.letter="";r2Browse.textContent=model.r2Only?"Ocultar originales R2":"Ver originales R2";browse.textContent="Ver catálogo completo";render()});
 input.addEventListener("input",()=>{if(input.value.trim()){model.r2Only=false;r2Browse.textContent="Ver originales R2";model.letter="";clearAlphabet();allLetters.setAttribute("aria-pressed","true")}model.limit=40;render()});
 // El buscador principal tiene también el modo Texto/Lexicon.
 // Una sola letra siempre abre el índice alfabético de obras, sin enviar al Lexicon.
 const mainForm=document.getElementById("search-form");
 const mainQuery=document.getElementById("classic-query");
 const mainText=document.getElementById("biblio-mode-text");
 const mainWorks=document.getElementById("biblio-mode-works");
 const markMainMode=works=>{
  if(mainWorks)mainWorks.setAttribute("aria-pressed",String(works));
  if(mainText)mainText.setAttribute("aria-pressed",String(!works));
 };
 if(mainWorks&&mainText){
  mainWorks.addEventListener("click",()=>markMainMode(true));
  mainText.addEventListener("click",()=>markMainMode(false));
 }
 if(mainForm&&mainQuery){
  mainForm.addEventListener("submit",event=>{
   const value=mainQuery.value.trim();
   const bookMode=mainWorks?.getAttribute("aria-pressed")==="true";
   if(!singleLetter(value)&&!bookMode)return;
   event.preventDefault();event.stopImmediatePropagation();
   input.value=value;model.letter="";model.r2Only=false;model.showAll=false;model.limit=40;
   clearAlphabet();allLetters.setAttribute("aria-pressed","true");
   render();
   if(bookMode&&!singleLetter(value)&&value.length>=2){
    const candidates=model.items.map(w=>({w,score:rank(w,value)})).filter(x=>x.score>=55&&compareLink(x.w)).sort((a,b)=>b.score-a.score);
    if(candidates.length){location.assign(compareLink(candidates[0].w));return;}
   }
   section.scrollIntoView({behavior:"smooth",block:"start"});
  },true);
 }
 more.addEventListener("click",()=>{model.limit+=40;render()});
 render();
 fetch("data/r2/classics-translation-manifest.json",{cache:"no-cache"})
  .then(r=>r.ok?r.json():null)
  .then(j=>{if(Array.isArray(j?.editions)){model.translationManifest=new Map(j.editions.filter(e=>e.url).map(e=>[e.url,e]));render()}})
  .catch(()=>{/* Keep registered editions visible without inferred attribution. */});
 fetch("data/classics-corpus/edition-list-labels.json",{cache:"no-cache"})
  .then(r=>r.ok?r.json():null)
  .then(j=>{if(j?.schema==="bibliotheca-edition-list-labels-v1"&&j.works){
     model.editionLabels=j.works;render();
   }})
  .catch(()=>{/* La búsqueda funciona sin metadatos editoriales auxiliares. */});
 fetch(path,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("aliases unavailable");return r.json()}).then(j=>{
  loadedAliases=j.aliases||{};
  for(const [id,authority] of Object.entries(j.titleAuthorities||{})){
   const w=model?.index.get(id);if(!w)continue;
   if(authority.displayTitle){w.forms=[...new Set([...(w.forms||[]),w.title,authority.displayTitle])];w.title=authority.displayTitle;}
   if(authority.greekTitle){w.greekTitle=authority.greekTitle;w.originalAliases=[...new Set([...(w.originalAliases||[]),authority.greekTitle])];}
  }
  for(const [id,forms] of Object.entries(loadedAliases)){
   const w=index.get(id);if(w&&Array.isArray(forms))w.forms.push(...forms);
  }
  render();
 }).catch(()=>{/* Original-language catalogue remains searchable. */});
}
function addRoadmap(roadmap){
 if(!model||!Array.isArray(roadmap?.items)||roadmap.items.length!==roadmap.targetWorks)return;
 for(const entry of roadmap.items){
  if(!/^[a-z0-9-]+$/.test(entry.id||"")||!entry.title||!entry.author)continue;
  let work=model.index.get(entry.id);
  if(!work){
   work={id:entry.id,title:entry.title,author:entry.author,genre:"",dating:entry.dating||"",
    forms:[entry.title,entry.author,entry.id.replaceAll("-"," ")],versions:[],facsimile:null,newWork:false};
   model.index.set(entry.id,work);model.items.push(work);
  }else{
   work.forms.push(entry.title,entry.author);
   if(!work.dating&&entry.dating)work.dating=entry.dating;
  }
 }
 render();
}
function addHistoricalViewers(records){
 if(!model||!Array.isArray(records))return;
 for(const e of records){
  const href=heritageLink(e.reader),id="historic-"+String(e.id||"");
  if(!href||!/^historic-[a-z0-9-]+$/.test(id)||!e.author||!e.title)continue;
  if(model.index.has(id))continue;
  const w={id,title:e.title,author:e.author,genre:"Edición histórica de arquitectura",
   dating:"",forms:[e.title,e.author,...(Array.isArray(e.aliases)?e.aliases:[])],
   versions:[],facsimile:null,heritageReader:href,heritageYear:e.year||"",
   newWork:true};
  model.index.set(id,w);model.items.push(w);
 }
 render();
}
function addFacsimiles(v,cat){
 if(!model||!Array.isArray(cat?.items))return;
 const byEdition=new Map(cat.items.map(e=>[e.id,e]));
 const attachEdition=(work,edition)=>{
  if(!work||!edition)return;
  const url=safeR2Pdf(edition.pdf);
  if(!url)return;
  work.pdfEditions ||= [];
  if(!work.pdfEditions.some(x=>x.url===url))work.pdfEditions.push({
   id:edition.id,url,title:edition.tituloEdicion||edition.obra||edition.id,
   scopeNote:edition.notaFilologica||""
  });
 };
 // R2 edition IDs need not match the ancient-work catalogue ID.
 // Use the existing audited work-to-edition concordance.
 for(const [workId,editions] of Object.entries(v?.porObra||{})){
  const w=model.index.get(workId);if(!w)continue;
  for(const ed of editions){
   const fac=byEdition.get(ed.r2);
   if(!fac)continue;
   w.facsimile ||= fac.id;
   attachEdition(w,fac);
   w.forms.push(ed.edicion||"",fac.obra||"",fac.tituloEdicion||"");
  }
 }
 for(const e of cat.items){
  const w=model.index.get(e.id);
  if(w){w.facsimile ||= e.id;attachEdition(w,e);w.forms.push(e.obra||"",e.tituloEdicion||"");}
 }
 for(const entry of v?.obrasNuevas||[]){
  if(model.index.has(entry.r2))continue;
  const w={id:entry.r2,title:entry.obra,author:entry.autor,genre:"",dating:"",forms:[entry.obra,entry.r2.replaceAll("-"," "),...(loadedAliases[entry.r2]||[])],
   versions:[],facsimile:entry.r2,newWork:true,pdfEditions:[]};
  attachEdition(w,byEdition.get(entry.r2));
  model.index.set(w.id,w);model.items.push(w);
 }
 render();
}
window.BibliothecaWorkSearch={mount,addFacsimiles,addHistoricalViewers};
async function bootstrap(){
 // No montar el catálogo avanzado en la portada: se ofrece desde Bibliotheca.
 if(location.pathname==="/"||/\/(?:index\.html)?$/i.test(location.pathname))return;
 let parent=document.querySelector(".searcharea");
 if(!parent){
  const original=document.getElementById("search-form");
  if(original&&document.getElementById("query")){
   parent=document.getElementById("front-classical-works");
   if(!parent){parent=make("div");parent.id="front-classical-works";original.insertAdjacentElement("afterend",parent)}
  }
 }
 if(!parent||document.getElementById("bibliotheca-work-search"))return;
 try{
  const [catalogResult,registryResult,roadmapResult,supplementResult,inventoryResult]=await Promise.allSettled([
   fetch("data/bibliotheca-graeca-latina-I-bce-I-ce.json").then(r=>{if(!r.ok)throw Error("catalog HTTP "+r.status);return r.json()}),
   fetch("data/classics-corpus/search-registry.json").then(r=>{if(!r.ok)throw Error("registry HTTP "+r.status);return r.json()}),
   fetch(ROADMAP).then(r=>{if(!r.ok)throw Error("roadmap HTTP "+r.status);return r.json()}),
   fetch("data/bibliotheca-expansion-publicada-2026-11-16.json").then(r=>{if(!r.ok)throw Error("supplement HTTP "+r.status);return r.json()}),
   fetch("data/r2/bibliotheca-inventario-unificado.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("inventory HTTP "+r.status);return r.json()})
  ]);
  const roadmap=roadmapResult.status==="fulfilled"?roadmapResult.value:null;
  const catalog=catalogResult.status==="fulfilled"?catalogResult.value:null;
  const registry=registryResult.status==="fulfilled"?registryResult.value:null;
  if(!Array.isArray(registry?.entries)||(!Array.isArray(catalog?.works)&&!Array.isArray(roadmap?.items)))throw Error("Catalog and registry unavailable");
  const base=Array.isArray(catalog?.works)?catalog.works:roadmap.items.map(w=>({id:w.id,title:w.title,author:w.author,dating:w.dating||""}));
  const merged=new Map(base.filter(w=>w?.id).map(w=>[w.id,w]));
  if(supplementResult.status==="fulfilled")for(const w of supplementResult.value.works||[])if(w?.id&&!merged.has(w.id))merged.set(w.id,w);
  if(inventoryResult.status==="fulfilled"){
   const inv=inventoryResult.value;
   for(const w of [...(inv.works||[]),...(inv.supplementaryWorks||[]),...(inv.additionalWorks||[])]){
    if(!w?.id||!w.author||!w.title)continue;
    const old=merged.get(w.id)||{};
    merged.set(w.id,{...old,id:w.id,author:old.author||w.author,title:old.title||w.title,language:old.language||old.originalLanguage||w.language||"",inventoryFacsimiles:w.r2FacsimileEditions||[]});
   }
  }
  const baseCatalog={works:[...merged.values()]};
  if(parent.id==="front-classical-works")parent.replaceChildren();
  mount(parent,{catalog:baseCatalog,registry});
  addRoadmap(roadmap);
  loadVitruvianCodices();
  // Optional integrity evidence: never block search or imply complete texts.
  fetch("data/bibliotheca-audit/integrity.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(j=>{integrityByWork=new Map((j.records||[]).map(r=>[r.id,r]));render()}).catch(e=>console.warn("Integridad de obras no disponible:",e));
  // Join verified bibliographic R2 facsimile associations into work cards.
  // PDF presence is not the same as a collated or indexed transcription.
  Promise.all([
   fetch("data/r2/vinculos-repertorio.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("R2 links HTTP "+r.status);return r.json()}),
   fetch("data/r2/catalogo-clasicos-r2.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("R2 catalogue HTTP "+r.status);return r.json()})
  ]).then(([links,editions])=>{
   if(links?.schema==="vdl-r2-vinculos-repertorio-1"&&Array.isArray(editions?.items))addFacsimiles(links,editions);
  }).catch(error=>console.warn("Enlaces de los facsímiles R2 no disponibles:",error));
  fetch("data/architecture-heritage-search.json",{cache:"no-cache"})
   .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
   .then(j=>addHistoricalViewers(j.records))
   .catch(error=>console.warn("Ediciones históricas no indexadas:",error));
 }catch(error){
  console.warn("Catálogo alfabético no disponible:",error);
  // Never leave a blank, apparently successful catalogue when its data failed.
  const area=parent||document.querySelector(".searcharea");
  if(area&&!document.getElementById("bws-load-error")){
   const warning=make("p","No se pudo cargar el listado interactivo. Podés consultar el índice alfabético permanente.","bws-load-error");
   warning.id="bws-load-error";warning.setAttribute("role","alert");
   const link=make("a"," Abrir índice de autores y obras","bws-fallback-index");
   link.href="index-auctorum-operum.html";warning.append(link);
   area.append(warning);
  }
 } 
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootstrap,{once:true});
else bootstrap();
})();