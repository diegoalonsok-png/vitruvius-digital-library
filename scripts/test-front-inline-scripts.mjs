import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const html=readFileSync("index.html","utf8");
const tags=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
assert(tags.length>10,"No se encontraron los scripts de la portada");
let checked=0;
for(const [i,tag] of tags.entries()){
  const attrs=tag[1];
  const body=tag[2];
  if(/type\s*=\s*["']application\/ld\+json["']/i.test(attrs))continue;
  if(/\bsrc\s*=/.test(attrs))continue;
  if(!body.trim())continue;
  assert(!/<script\b/i.test(body),"Etiqueta de script anidada en inline JS: "+i);
  new vm.Script(body,{filename:"index.html inline #"+i});
  checked++;
}
assert(checked>0,"No se verificó ningún inline JS");
assert.equal(html.split('src="assets/classics-audited-coverage.js?v=').length-1,1,
  "La auditoría debe cargarse exactamente una vez, fuera de la plantilla de impresión");
console.log("PASS portada: "+checked+" scripts inline y etiqueta de contadores no anidada");

const lexical=readFileSync("assets/inline-lexical-card.js","utf8");
new vm.Script(lexical,{filename:"assets/inline-lexical-card.js"});
assert(html.includes("assets/inline-lexical-card.js"),"La portada debe cargar la ficha contextual");
assert(lexical.includes('event.target.closest?.("#search-results mark.search-hit")'),
 "Las palabras resaltadas deben abrir una ficha por clic");
const match=lexical.match(/if\(!((?:\/\^\[[^\n]+?\$\/u))\.test\(term\)\)return;/);
assert(match,"Falta validación Unicode de vocablos clicables");
const accept=new Function("term","return "+match[1]+".test(term)");
for(const word of ["domus","loci","campus","λόγος","οἶκος","τέχνη"]){
 assert(accept(word),"La ficha debe aceptar el vocablo "+word);
}
assert(!accept("1234"),"La ficha no debe tratar números como lemas");
console.log("PASS fichas: clic en resaltado y vocablos latinos/griegos válidos");

/* Academic integrity gates: claim only what is actually documented. */
const editorial=readFileSync("metodologia.html","utf8");
const review=readFileSync("programa-revision-academica.html","utf8");
const staticDomus=readFileSync("domus-en-vitruvio.html","utf8");
const tei=readFileSync("data/tei/v514-I-praef-1-example.xml","utf8");
const lexSample=JSON.parse(readFileSync("data/academic-lexical-review-100.json","utf8"));
const ecdotic=JSON.parse(readFileSync("data/ecdotic-decisions.json","utf8"));
const fourDois=[
  "10.5281/zenodo.23868911",
  "10.5281/zenodo.23884757",
  "10.5281/zenodo.23885110",
  "10.5281/zenodo.23885404"
];
for(const doi of fourDois){
 assert(editorial.includes(doi),"La metodología debe citar DOI "+doi);
 assert(review.includes(doi),"El protocolo debe distinguir DOI "+doi);
}
assert(!editorial.includes("No se asignan DOI individuales a V514, V554 o V297"),
 "Política de DOI contradice las fichas editoriales");
assert(html.includes('id="copy-portal-citation"'),
 "Falta botón visible de cita de biblioteca");
assert(html.includes('domus-en-vitruvio.html'),
 "Falta acceso a lectura sin JavaScript");
assert(staticDomus.includes("10.5281/zenodo.23884757"),
 "La ficha Domus debe citar la edición V514");
assert(staticDomus.includes('lang="la"')&&staticDomus.includes('lang="es"'),
 "La lectura indexable debe mostrar latín y traducción sin JavaScript");
assert(tei.includes('xmlns="http://www.tei-c.org/ns/1.0"')&&tei.includes('xml:id="vitr-1-praef-1"'),
 "Falta identificación TEI del locus");
assert(!/<app\b|<rdg\b/.test(tei),"La muestra TEI no debe inventar variantes");
assert.equal(lexSample.items.length,100,"La muestra léxica debe contener 100 formas");
assert.equal(lexSample.reviewed,0,"No declarar revisión lingüística sin evidencia");
assert(lexSample.items.every(x=>x.status==="awaiting_independent_review" &&
 x.firstLocus && x.occurrences>0 && x.lemma===null && x.syntax===null),
 "No inventar lemas, sintaxis ni revisión de la muestra");
assert.equal(new Set(lexSample.items.map(x=>x.form)).size,100,"Formas de muestra repetidas");
assert(Array.isArray(ecdotic.decisions),"El registro ecdótico debe existir");
assert(ecdotic.decisions.every(x=>x.primarySourceUri&&x.locus&&x.justification&&x.responsibleEditor),
 "Una decisión real requiere testimonio o fuente, locus, argumento y responsable");
const app=readFileSync("assets/app.js","utf8");
assert(app.includes("Citar / DOI")&&app.includes("criticalPassageCitation"),
 "Cada pasaje debe poder copiarse con su DOI editorial");
console.log("PASS academia: cuatro DOI, citación, TEI, corpus léxico y estado de evidencia");

const wholeBook=readFileSync("data/tei/v514-book-I-bilingual.xml","utf8");
const commentary=JSON.parse(readFileSync("data/annotations/v514-I-praef-1-exegetical.json","utf8"));
const sourceV514=JSON.parse(readFileSync("data/structured/recensio-es.json","utf8"));
const bookOne=sourceV514.passages.filter(p=>p.book===1||String(p.locus||"").startsWith("1."));
assert.equal(bookOne.length,67,"La fuente debe contener 67 unidades editoriales de libro I");
const latinIds=[...wholeBook.matchAll(/xml:id="(vitr-1-[^"]+)"(?=\s+n=)/g)].filter(m=>!m[1].endsWith("-es"));
const translationLinks=[...wholeBook.matchAll(/corresp="#vitr-1-[^"]+"/g)];
assert.equal(latinIds.length,67,"TEI: faltan unidades latinas del libro I");
assert.equal(translationLinks.length,67,"TEI: faltan unidades españolas vinculadas por locus");
assert(!/<app\b|<rdg\b/.test(wholeBook),"TEI: no se deben atribuir variantes sin testimonios");
assert.equal(commentary.notes.length,6,"Comentario: verificar sus seis capas");
const pref=sourceV514.passages.find(p=>p.locus==="1.praef.1");
assert(pref&&commentary.notes.every(n=>n.locus===pref.locus&&pref.latin.includes(n.anchor)&&n.reviewStatus==="provisional_unreviewed"&&n.witnessCollation===null),
 "Comentario: cada anclaje debe existir en el pasaje y conservar el estado provisional");
const commentaryPage=readFileSync("comentario-vitruvio-prefacio.html","utf8");
assert(commentaryPage.includes(pref.latin),"La página estática debe reproducir el latín de V514");
console.log("PASS TEI: 67 loci, 67 correspondencias, seis notas comprobables y sin variantes inventadas");

const perseusAudit=JSON.parse(readFileSync("data/perseus-provenance-audit.json","utf8"));
const perseusPage=readFileSync("perseus-procedencia-textual.html","utf8");
const siteMap=readFileSync("sitemap.xml","utf8");
assert.equal(perseusAudit.records.length,222,"Cobertura de procedencia debe incluir 222 obras");
assert.equal(perseusAudit.counts.versions,246,"El inventario debe conservar 246 versiones");
assert.equal(perseusAudit.counts.verifiedEditionUrns,0,
 "Una URN candidata no equivale a una edición CTS validada");
assert(perseusAudit.records.every(x=>x.ctsStatus==="not_verified"&&x.ctsEditionUrn===null),
 "No inventar citas CTS de edición");
assert(perseusPage.includes("https://scaife.perseus.org/")&&
 perseusPage.includes("data/perseus-provenance-audit.json"),
 "Auditoría Perseus debe enlazar fuentes y datos");
assert(siteMap.includes("perseus-procedencia-textual.html")&&siteMap.trimEnd().endsWith("</urlset>"),
 "Sitemap académico debe estar íntegro y cerrar XML");
console.log("PASS procedencia Perseus: 222 obras, códigos candidatos y sin URN inventadas");

/* University readiness: the five search frontends must offer source-aware
 * citation, stable query links and an accessible non-JavaScript alternative. */
const universityPages=[
 ["index.html","query","search-form"],
 ["vitruvia.html","query","search-form"],
 ["vitruvia-lexicon.html","lx-q",null],
 ["bibliotheca-graeca-latina.html","classic-query","search-form"],
 ["index-locorum.html","query","form"]
];
const academicTools=readFileSync("assets/scholarly-query-tools.js","utf8");
new vm.Script(academicTools,{filename:"assets/scholarly-query-tools.js"});
const researchGuide=readFileSync("guia-investigacion-universitaria.html","utf8");
for(const [page,input,form] of universityPages){
 const markup=readFileSync(page,"utf8");
 assert(markup.includes('id="'+input+'"'),page+" has no query input");
 if(form)assert(markup.includes('id="'+form+'"'),page+" has no search form");
 assert(markup.includes("assets/scholarly-query-tools.js"),
   page+" must load shared academic citation controls");
 if(page!=="index.html")
  assert(markup.includes("<noscript>")&&markup.includes("guia-investigacion-universitaria.html"),
   page+" must offer an alternative for JavaScript-disabled readers");
}
for(const required of ["10.5281/zenodo.23868911","10.5281/zenodo.23884757",
 "10.5281/zenodo.23885110","10.5281/zenodo.23885404"]){
 assert(researchGuide.includes(required),"University guide DOI missing: "+required);
}
assert(academicTools.includes("URLSearchParams")===false||academicTools.includes("searchParams.set"),
 "Shared tool must retain query in a reproducible URL");
assert(academicTools.includes("DOI del portal")&&academicTools.includes("las citas de pasajes requieren"),
 "The search citation must not claim the project DOI identifies a classical edition");
const scholSitemap=readFileSync("sitemap.xml","utf8");
assert(scholSitemap.includes("guia-investigacion-universitaria.html")&&
 scholSitemap.trimEnd().endsWith("</urlset>"),"University guide missing from valid sitemap");
console.log("PASS universidad: enlaces y citas en cinco buscadores, alternativa estática y DOI");

/* SEO university access: static scholarly term cards must retain exact
 * documented counts. A lemma family must never be conflated with one form. */
const vitruviusSource=JSON.parse(readFileSync("data/structured/recensio-es.json","utf8"));
const staticTerms=["aedes","symmetria","locus","architectura"];
const institutionGuide=readFileSync("guia-investigacion-universitaria.html","utf8");
for(const term of staticTerms){
 const file=term+"-en-vitruvio.html";
 const page=readFileSync(file,"utf8");
 const exact=new RegExp("(^|[^\\p{L}\\p{M}])"+term+"(?=$|[^\\p{L}\\p{M}])","iu");
 const n=vitruviusSource.passages.filter(p=>exact.test(p.latin||"")).length;
 assert(page.includes("registra <strong>"+n+" unidades editoriales</strong>"),
   "Static "+term+" concordance count diverges from V514");
 assert(page.includes("10.5281/zenodo.23884757")&&page.includes('lang="la"')&&page.includes('lang="es"'),
   "Static "+term+" must show Latin, aligned Spanish and edition DOI");
 assert(page.includes("No constituyen el total de apariciones de todas las flexiones"),
   "Static "+term+" must disclose exact-form limitations");
 assert(institutionGuide.includes(file)&&scholSitemap.includes(file),
   "Static "+term+" needs university guide link and sitemap indexing");
}
console.log("PASS SEO académico: cuatro concordancias estáticas comparadas con V514");

/* Right-hand cultural dossier: keep a single contextual panel and verify
 * chronology sources stay usable for university researchers. */
const vitruviaRailHtml=readFileSync("vitruvia.html","utf8");
const railSrc=readFileSync("assets/vitruvia-web-dossier.js","utf8");
assert.equal((vitruviaRailHtml.match(/id="vitruvia-context"/g)||[]).length,1,
 "Vitruvia should have one contextual cultural rail, not duplicates");
assert(vitruviaRailHtml.includes("resultGrid.insertBefore(panel")&&
 vitruviaRailHtml.includes("articleGrid.appendChild(panel"),
 "Move contextual rail into search results or scholarly article according to visible view");
assert(vitruviaRailHtml.includes("has-context-rail")&&
 vitruviaRailHtml.includes("grid-template-columns:minmax(0,1fr) minmax(285px,29%)"),
 "Results view must reserve a visible desktop rail");
assert(railSrc.includes("const bookRows=rows.filter")&&
 railSrc.includes("const oldest=bookRows.map("),
 "Ancient-author manuscript witness timeline must have defined book rows");
assert(railSrc.includes("books.sort((a,b)")&&
 railSrc.includes("first_publish_year"),
 "Author book cards must use documented publication chronology");
assert(railSrc.includes("manuscripts.slice(0,12)")&&railSrc.includes("codexDate"),
 "Códice display must use documented manuscript dates");
console.log("PASS cultural rail: visible search/reading layout, books and codices sorted from documented dates");
