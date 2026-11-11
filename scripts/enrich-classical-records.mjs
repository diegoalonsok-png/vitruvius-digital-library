#!/usr/bin/env node
/* Fichas de las obras clásicas: completar lo que ya es dato y listar lo que falta.
 *
 * Diagnóstico. Las doce columnas básicas de las 222 fichas están completas,
 * pero los campos de enriquecimiento no: 187 fichas sin siglo ni período, 48
 * sin sus archivos de corpus, y —lo más visible— ninguna ficha mostraba sus
 * testimonios manuscritos, aunque el sitio tiene 100 testimonios catalogados
 * con nomenclatura codicológica completa (siglum, signatura, repositorio,
 * datación con base, material, escritura, pautado, fórmula de colación, manos,
 * encuadernación, procedencia y manifiesto IIIF) repartidos entre 122 obras.
 *
 * Qué hace este guion, y qué NO hace.
 *
 * Completa sólo lo que se deriva de datos que ya están en el repositorio:
 *   · `century` y `period`, interpretando el campo `dating` de la propia ficha;
 *   · `corpusFiles`, comprobando qué archivos de corpus existen de verdad;
 *   · `lexicalIndex`, con los recuentos del índice léxico;
 *   · `witnesses` y `earliestWitness`, con los testimonios ya catalogados,
 *     ordenados por su fecha de inicio.
 *
 * No inventa un códice. Para las obras sin testimonio catalogado escribe un
 * `witnessLookup` con enlaces de BÚSQUEDA en los repertorios de referencia
 * —Pinakes para el griego, Biblissima y Mirabile para el latín— rotulados como
 * búsqueda y no como determinación, y las enumera en el informe para que se
 * investiguen una por una con su fuente. «El testimonio catalogado más
 * antiguo» no es «el códice más antiguo que existe»: la ficha lo dice así.
 *
 * Ningún valor existente se sobrescribe, y cada campo añadido deja escrita su
 * procedencia en `derivedFields`.
 *
 * Uso: node scripts/enrich-classical-records.mjs [--check]
 */
import {readFileSync,writeFileSync,existsSync,readdirSync,mkdirSync} from "node:fs";

const CHECK=process.argv.includes("--check");
const CATALOGUE="data/bibliotheca-graeca-latina-I-bce-I-ce.json";
const TESTIMONIA="data/bibliotheca-testimonia-verified.json";
const INDEX="data/index/classics/manifest.json";
const CORPUS="data/classics-corpus";
const REPORT="reports/fichas-clasicas-pendientes.md";

const read=path=>JSON.parse(readFileSync(path,"utf8"));
const catalogue=read(CATALOGUE);
const testimonia=read(TESTIMONIA);
const lexical=existsSync(INDEX)?read(INDEX):null;
const corpusFiles=existsSync(CORPUS)?readdirSync(CORPUS).filter(name=>name.endsWith(".json")):[];

/* ─────────── siglo y período a partir de la datación de la ficha ─────────── */

const ROMAN=["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI"];
const fromRoman=value=>{const map={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};const t=String(value).toUpperCase();let n=0;
 for(let i=0;i<t.length;i++){const a=map[t[i]],b=map[t[i+1]];n+=b&&a<b?-a:a}return n};
const centuryOf=year=>Math.ceil(Math.abs(year)/100);

/* Devuelve {century, period} con la notación que ya usa el catálogo: número
   romano para la era cristiana, con «a. C.» cuando corresponde, y un guion
   largo entre dos siglos. Si la datación no permite decidir, devuelve null y
   la ficha se queda sin el campo: es mejor vacío que inventado.

   La era se reconoce exigiendo la C MAYÚSCULA y un límite de palabra. Sin esa
   exigencia, y con búsqueda insensible a mayúsculas, la palabra «datación»
   contiene «ac» y toda datación debatida terminaba fechada antes de Cristo. */
const BCE=/(?:^|[^\p{L}])a\.?\s?C\.?(?:[^\p{L}]|$)/u;
const CE=/(?:^|[^\p{L}])d\.?\s?C\.?(?:[^\p{L}]|$)/u;
/* Con delimitadores consumidos, «II–III» sólo daba «II»: al avanzar el índice
   se perdía el límite que el siguiente numeral necesitaba. Se usan contextos
   de anchura cero. */
const ROMAN_TOKEN=/(?<!\p{L})([IVXLCDM]{1,5})(?!\p{L})/gu;

function datingToCentury(dating){
 const text=String(dating||"");
 if(!text.trim())return null;
 const bce=BCE.test(text)&&!CE.test(text);
 const mixed=BCE.test(text)&&CE.test(text);

 /* Datación por siglos, incluso con palabras intercaladas:
    «Finales del siglo I – comienzos del II» da I–II. */
 /* «siglo» se reconoce con mayúscula o sin ella; la era, sólo con C mayúscula. */
 const SPELLED=/[Ss]iglos?\s|(?:^|[^\p{L}])s\.\s*[IVXLCDM]/u;
 if(SPELLED.test(text)){
  const from=text.search(SPELLED);
  const tail=text.slice(from);
  const numerals=[];
  ROMAN_TOKEN.lastIndex=0;
  let hit;
  while((hit=ROMAN_TOKEN.exec(tail)))numerals.push(fromRoman(hit[1]));
  const valid=numerals.filter(value=>value>0&&value<ROMAN.length);
  if(valid.length){
   const first=valid[0],last=valid[valid.length-1];
   const suffix=bce?" a. C.":"";
   const value=first===last?ROMAN[first]+suffix:ROMAN[first]+"–"+ROMAN[last]+suffix;
   return {century:value,period:value};
  }
 }

 /* Años: «c. 30–20 a. C.», «44 a. C.», «c. 62–65 d. C.», «c. 20 a. C.–23 d. C.» */
 const years=[...text.matchAll(/(\d{1,4})/g)].map(hit=>({value:Number(hit[1]),at:hit.index}))
  .filter(hit=>hit.value>0&&hit.value<=2100);
 if(!years.length)return null;
 /* A cada año se le aplica la era que aparezca más cerca a su derecha; si no
    hay ninguna a la derecha, la del texto. */
 for(const year of years){
  const after=text.slice(year.at);
  const bceAt=after.search(BCE),ceAt=after.search(CE);
  if(bceAt>=0&&(ceAt<0||bceAt<ceAt))year.bce=true;
  else if(ceAt>=0)year.bce=false;
  else year.bce=bce;
 }
 if(!mixed)for(const year of years)year.bce=bce;
 const parts=years.map(year=>({century:centuryOf(year.value),bce:!!year.bce}));
 const first=parts[0],last=parts[parts.length-1];
 if(!ROMAN[first.century]||!ROMAN[last.century])return null;
 const label=entry=>ROMAN[entry.century]+(entry.bce?" a. C.":"");
 const value=first.century===last.century&&first.bce===last.bce?label(first):label(first)+"–"+label(last);
 return {century:value,period:value};
}

/* ─────────── testimonios por obra ─────────── */

const witnessesByWork=new Map();
for(const record of testimonia.records||[]){
 for(const workId of record.workIds||[]){
  if(!witnessesByWork.has(workId))witnessesByWork.set(workId,[]);
  witnessesByWork.get(workId).push(record);
 }
}

/* Nomenclatura codicológica: se copian los campos que el testimonio tenga,
   con sus nombres de uso filológico, y no se rellena ninguno que falte. */
const WITNESS_FIELDS=["siglum","shelfmark","library","date","dateStart","datingBasis","datingNotation",
 "language","material","script","hands","ruling","quireSignatures","collationFormula","dimensions",
 "binding","folioRange","startFolio","origin","provenance","coverage","scholia","witnessKind",
 "copyOf","copyOfStatus","textualTransmissionNote","criticalEditionReference","bibliography",
 "verification","verificationLevel","verificationUrl","cataloguingStatus","accessStatus","rights",
 "record","viewer","manifest","localViewer","localFolioIndex","localFolioCount","citation","academicId"];

function witnessView(record){
 const view={id:record.id};
 for(const field of WITNESS_FIELDS)if(record[field]!=null&&record[field]!=="")view[field]=record[field];
 return view;
}

const LOOKUP={
 grc:id=>[{catalogue:"Pinakes · IRHT-CNRS",url:"https://pinakes.irht.cnrs.fr/notices/oeuvre/?search="+encodeURIComponent(id)}],
 la:id=>[{catalogue:"Biblissima",url:"https://portail.biblissima.fr/recherche?q="+encodeURIComponent(id)},
         {catalogue:"Mirabile · SISMEL",url:"https://www.mirabileweb.it/search?search="+encodeURIComponent(id)}],
 other:id=>[{catalogue:"Biblissima",url:"https://portail.biblissima.fr/recherche?q="+encodeURIComponent(id)}]
};

/* ─────────── enriquecimiento ─────────── */

const works=catalogue.works||[];
const pending=[];
let added={century:0,period:0,corpusFiles:0,lexicalIndex:0,witnesses:0,lookup:0};

for(const work of works){
 if(!work.id||!work.title)continue;
 const derived=work.derivedFields?{...work.derivedFields}:{};

 if(!work.century||!work.period){
  const guess=datingToCentury(work.dating);
  if(guess){
   if(!work.century){work.century=guess.century;derived.century="interpretado del campo dating de esta ficha";added.century++}
   if(!work.period){work.period=guess.period;derived.period="interpretado del campo dating de esta ficha";added.period++}
  }
 }

 if(!work.corpusFiles){
  const found={};
  for(const name of corpusFiles){
   const match=name.match(new RegExp("^"+work.id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"-([a-z]{2,3})\\.json$"));
   if(match)found[match[1]]=CORPUS+"/"+name;
  }
  if(Object.keys(found).length){work.corpusFiles=found;derived.corpusFiles="archivos de corpus comprobados en el repositorio";added.corpusFiles++}
 }

 if(lexical&&!work.lexicalIndex){
  const rows=(lexical.index||[]).filter(entry=>entry.id===work.id);
  if(rows.length){
   work.lexicalIndex={
    generated:lexical.generated,
    source:"data/index/classics/manifest.json",
    note:"Recuentos del índice léxico de candidatos; el texto vive en la edición.",
    languages:Object.fromEntries(rows.map(row=>[row.lang,{passages:row.passages,tokens:row.tokens}]))
   };
   derived.lexicalIndex="recuentos del índice léxico";
   added.lexicalIndex++;
  }
 }

 const list=(witnessesByWork.get(work.id)||[]).slice()
  .sort((a,b)=>(a.dateStart??9999)-(b.dateStart??9999));
 if(list.length){
  /* El nombre del campo es el que ya lee la interfaz:
     assets/bibliotheca-graeca-latina.js arma toda la ficha codicológica
     —«Historia del texto · Codicología · Transmisión», el testimonio más
     temprano y su visor— a partir de work.witnessRecords, y ese campo no se
     rellenaba en ninguna parte: 0 de 222 fichas lo tenían. Por eso incluso
     Vitruvio, con el Códex H catalogado y su visor de folios propio, mostraba
     «testimonio más antiguo todavía sin identificar». */
  if(!work.witnessRecords){
   work.witnessRecords=list.map(witnessView);
   derived.witnessRecords="testimonios catalogados en data/bibliotheca-testimonia-verified.json, ordenados por fecha de inicio";
   added.witnesses++;
  }
  if(!work.earliestWitness){
   const first=list[0];
   work.earliestWitness={
    id:first.id,
    siglum:first.siglum||null,
    shelfmark:first.shelfmark||null,
    library:first.library||null,
    date:first.date||null,
    dateStart:first.dateStart??null,
    viewer:first.localViewer||first.viewer||first.manifest||first.record||null,
    viewerKind:first.localViewer?"visor de folios alojado en el sitio":first.viewer?"visor institucional":first.manifest?"manifiesto IIIF":first.record?"ficha de catálogo":null,
    claim:"Testimonio catalogado más antiguo de esta obra en el sitio. No equivale a una afirmación sobre el códice más antiguo conservado ni sobre la totalidad de la tradición manuscrita."
   };
   derived.earliestWitness="elegido por la fecha de inicio más temprana entre los testimonios catalogados";
  }
 }else if(!work.witnessLookup){
  const picker=LOOKUP[work.language]||LOOKUP.other;
  work.witnessLookup={
   status:"sin testimonio catalogado en el sitio",
   note:"Enlaces de búsqueda en repertorios de referencia. Son una búsqueda, no una determinación del testimonio más antiguo.",
   searches:picker(work.title)
  };
  derived.witnessLookup="enlaces de búsqueda generados a partir del título";
  added.lookup++;
  pending.push(work);
 }

 if(Object.keys(derived).length)work.derivedFields=derived;
}

/* ─────────── informe de lo que falta ─────────── */

const EDITORIAL=[["bibliography","Bibliografía"],["vitruvianLoci","Loci vitruvianos"],
 ["codicology","Nota codicológica"],["encyclopedia","Ficha enciclopédica"],["discovery","Transmisión y descubrimiento"]];
const missingByField=new Map();
for(const [field,label] of EDITORIAL){
 const list=works.filter(work=>work.id&&!work[field]);
 missingByField.set(label,list.length);
}

const lines=[];
lines.push("# Fichas de las obras clásicas · lo que falta");
lines.push("");
lines.push("Generado por `scripts/enrich-classical-records.mjs` el "+new Date().toISOString().slice(0,10)+".");
lines.push("");
lines.push("Las doce columnas básicas de las "+works.length+" fichas están completas. Este informe");
lines.push("recoge lo que no se puede derivar de los datos del repositorio y necesita trabajo");
lines.push("editorial o investigación en catálogos.");
lines.push("");
lines.push("## Completado automáticamente en esta pasada");
lines.push("");
lines.push("| Campo | Fichas completadas |");
lines.push("| --- | --- |");
lines.push("| Siglo (`century`) | "+added.century+" |");
lines.push("| Período (`period`) | "+added.period+" |");
lines.push("| Archivos de corpus (`corpusFiles`) | "+added.corpusFiles+" |");
lines.push("| Recuentos del índice léxico (`lexicalIndex`) | "+added.lexicalIndex+" |");
lines.push("| Testimonios manuscritos (`witnessRecords`) | "+added.witnesses+" |");
lines.push("| Enlaces de búsqueda de testimonio (`witnessLookup`) | "+added.lookup+" |");
lines.push("");
lines.push("## Obras sin testimonio manuscrito catalogado");
lines.push("");
lines.push("Son **"+pending.length+"** de "+works.length+". Cada una necesita que se identifique su");
lines.push("testimonio con signatura, repositorio, datación y fuente de la datación, como ya se");
lines.push("hace en `data/bibliotheca-testimonia-verified.json`. Mientras no se haga, su ficha");
lines.push("lleva enlaces de búsqueda y no afirma nada.");
lines.push("");
lines.push("| Obra | Autor | Lengua | Buscar el testimonio en |");
lines.push("| --- | --- | --- | --- |");
for(const work of pending.sort((a,b)=>String(a.author||"").localeCompare(String(b.author||""))))
 lines.push("| "+work.title.replace(/\|/g,"/")+" | "+(work.author||"—")+" | "+(work.language||"—")+" | "+
  (work.witnessLookup.searches||[]).map(s=>"["+s.catalogue+"]("+s.url+")").join(" · ")+" |");
lines.push("");
lines.push("## Campos que requieren trabajo editorial");
lines.push("");
lines.push("| Campo | Fichas sin dato |");
lines.push("| --- | --- |");
for(const [label,count] of missingByField)lines.push("| "+label+" | "+count+" |");
lines.push("");
lines.push("Estos no se completan por guion: una bibliografía o un locus vitruviano afirmado sin");
lines.push("lectura es un dato falso con apariencia de dato.");

const report=lines.join("\n")+"\n";

if(CHECK){
 console.log(report.split("\n").slice(0,40).join("\n"));
 console.log("\n— comprobación, sin escribir —");
}else{
 catalogue.enrichment={
  script:"scripts/enrich-classical-records.mjs",
  date:new Date().toISOString().slice(0,10),
  note:"Campos derivados de datos ya presentes en el repositorio. Cada ficha declara en derivedFields la procedencia de lo añadido. Ningún testimonio manuscrito se ha inferido: los que aparecen están catalogados en data/bibliotheca-testimonia-verified.json."
 };
 writeFileSync(CATALOGUE,JSON.stringify(catalogue));
 mkdirSync("reports",{recursive:true});
 writeFileSync(REPORT,report);
 console.log("Fichas: "+works.length);
 console.log("Completado · siglo "+added.century+" · período "+added.period+" · corpus "+added.corpusFiles+
  " · índice "+added.lexicalIndex+" · testimonios "+added.witnesses+" · búsquedas "+added.lookup);
 console.log("Obras sin testimonio catalogado: "+pending.length);
 console.log("Informe: "+REPORT);
}
