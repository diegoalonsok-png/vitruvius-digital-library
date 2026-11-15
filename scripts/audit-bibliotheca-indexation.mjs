#!/usr/bin/env node
/* Bibliotheca: catálogo, títulos, lectura e índice R2, sin inventar registros.
 * Solo datos del repositorio: nunca declara disponibilidad física ni cotejo
 * filológico sin prueba remota/autóptica. No altera textos originales.
 */
import {readFileSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
const read=p=>JSON.parse(readFileSync(p,"utf8"));
const catalog=read("data/bibliotheca-graeca-latina-I-bce-I-ce.json").works;
const registry=read("data/classics-corpus/search-registry.json").entries;
const r2=read("data/r2/catalogo-clasicos-r2.json").items;
const linked=read("data/r2/vinculos-repertorio.json");
const manifest=read("data/r2/indice-semantico-manifest.json");
const remote=read("data/r2/corpus-manifest.json").obras;
const canon=new Map(catalog.map(w=>[w.id,w]));
const editions=new Map(r2.map(w=>[w.id,w]));
const originalLanguages=new Set(["la","grc"]);
const greek=/[\u0370-\u03ff\u1f00-\u1fff]/u;
const issues=[];
const add=(severity,code,id,description)=>issues.push({severity,code,id,description});
const distinct=(items)=>new Set(items).size;
if(distinct(catalog.map(w=>w.id))!==catalog.length)add("error","duplicate_work_ids","catalog","ID de obra duplicado");
if(distinct(r2.map(w=>w.id))!==r2.length)add("error","duplicate_r2_ids","R2","ID de edición duplicado");
if(registry.length!==distinct(registry.map(e=>[e.workId,e.language,e.path,e.edition||""].join("|"))))add("error","duplicate_index_entry","registry","Edición/idioma/ruta repetida");
const indexed=new Map(), local=new Set(), remoteDeclared=new Set();
for(const e of registry){
 if(!canon.has(e.workId))add("error","indexed_work_without_catalogue",e.workId,e.path);
 const isRemote=/^https?:\/\//.test(e.path||"");
 if(!isRemote){
   if(!existsSync(e.path||""))add("error","missing_index_source",e.workId,e.path);
   else local.add(e.workId);
 }else remoteDeclared.add(e.workId);
 const versions=indexed.get(e.workId)||[];versions.push(e);indexed.set(e.workId,versions);
}
const missingOriginal=[],unindexed=[],greekTitleReview=[],editionTitleReview=[];
for(const w of catalog){
 if(!w.title||!w.author)add("error","missing_author_or_title",w.id,"Sin título o autor");
 const entries=indexed.get(w.id)||[];
 if(!entries.length){unindexed.push({id:w.id,author:w.author,title:w.title,language:w.language});add("review","work_not_text_indexed",w.id,"Ficha presente sin versión textual en registry");}
 else if(originalLanguages.has(w.language)&&!entries.some(e=>e.language===w.language))missingOriginal.push(w.id);
 if(w.language==="grc"&&!greek.test(w.title||"")){
  greekTitleReview.push({id:w.id,title:w.title});
  add("review","greek_title_not_documented",w.id,"La ficha no contiene denominación griega acreditada; podría ser una colección o edición");
 }
 for(const e of entries){
   if(e.language===w.language&&e.title!==w.title)editionTitleReview.push({id:w.id,catalogue:w.title,registeredEdition:e.title});
 }
}
const byHash=new Map(),byArchive=new Map();
for(const e of r2){
 if(e.sha256){let a=byHash.get(e.sha256)||[];a.push(e.id);byHash.set(e.sha256,a);}
 if(e.identificadorIA){let a=byArchive.get(e.identificadorIA)||[];a.push(e.id);byArchive.set(e.identificadorIA,a);}
 if(!e.tituloEdicion||!e.anio||!e.fuente)add("review","edition_bibliography_incomplete",e.id,"Falta identificación completa de edición");
 if(!e.texto||!e.pdf)add("error","r2_record_without_object_urls",e.id,"Falta ruta PDF/texto");
}
const hashes=[...byHash].filter(([k,v])=>v.length>1).map(([sha,ids])=>({sha256:sha,ids}));
for(const x of hashes)add("review","same_pdf_multiple_editions",x.ids.join(","),"Misma huella: comprobar si es edición ómnibus o duplicación");
const map=linked.mapa||{};
const additional=linked.obrasNuevas||[];
const additionalIds=new Set(additional.map(e=>e.r2));
if(additional.length!==additionalIds.size)add("error","duplicate_additional_work","catalog","Obras adicionales repetidas");
for(const e of additional){
 if(!editions.has(e.r2))add("error","additional_work_missing_r2_edition",e.r2,"Obra nueva sin edición R2 registrada");
 if(canon.has(e.r2))add("error","additional_work_repeats_main_catalogue",e.r2,"Ya pertenece a las 271 fichas principales");
}
const r2Unlinked=[];
const mainR2Linked=new Set();
for(const e of r2){
 const relations=map[e.id]?.length?map[e.id]:(canon.has(e.id)?[e.id]:(canon.has(e.traduccionDe)?[e.traduccionDe]:[]));
 if(!relations.length&&!additionalIds.has(e.id))r2Unlinked.push(e.id);
 if(relations.length)mainR2Linked.add(e.id);
 for(const id of relations)if(!canon.has(id))add("error","r2_link_to_unknown_work",e.id,id);
}
for(const id of Object.keys(map))if(!editions.has(id))add("error","orphan_r2_mapping",id,"Relación sin edición en catálogo R2");
if(mainR2Linked.size+additionalIds.size+r2Unlinked.length!==r2.length)
 add("error","nonpartitioned_r2_edition_categories","R2","Una edición aparece en varias categorías o sin contar; no se puede publicar el total como conciliado");
const cataloguedIndexedIds=new Set(registry.map(e=>e.workId));
const remoteManifestIds=new Set(remote.map(e=>e.workId+"|"+e.language));
for(const e of registry.filter(e=>(e.path||"").startsWith("https://libros.vitruvius-digital-library.org/corpus/"))){
 if(!remoteManifestIds.has(e.workId+"|"+e.language))add("error","remote_registry_without_manifest",e.workId,e.path);
}
if(manifest.obras!==r2.length)add("review","index_catalogue_count_divergence","R2","Índice declara "+manifest.obras+" ediciones, catálogo R2 registra "+r2.length+". No modificar el índice por suposición.");
const report={
 schema:"vdl-bibliotheca-indexation-control-v1",
 generated:new Date().toISOString(),
 methodology:"Auditoría documental reproducible de GitHub. Los índices del catálogo y los registros remotos son declaraciones; no sustituyen GET/HEAD de R2, cotejo del interior del PDF ni recensio manuscrita. Una obra sin índice NO se marca indexada automáticamente.",
 counts:{
   catalogueWorks:catalog.length,additionalR2Works:additional.length,combinedCataloguedWorks:catalog.length+additional.length,r2EditionRecords:r2.length,
   registeredTextVersions:registry.length,registeredDistinctWorks:cataloguedIndexedIds.size,
   verifiedLocalSourceWorkIds:local.size,declaredRemoteSourceWorkIds:remoteDeclared.size,
   r2TextManifestVersions:remote.length,r2InvertedIndexDeclaredEditions:manifest.obras,
   unindexedCatalogueWorks:unindexed.length,worksMissingRegisteredOriginal:missingOriginal.length,
   greekTitleNeedsIndividualReview:greekTitleReview.length,r2UnlinkedEditions:r2Unlinked.length,
   duplicateR2BinaryGroups:hashes.length,
   structuralErrors:issues.filter(x=>x.severity==="error").length,
   editorialReviewItems:issues.filter(x=>x.severity==="review").length
 },
 scope:{
  greekTitleReview,missingOriginal,unindexed,r2Unlinked,duplicateR2Hashes:hashes,
  catalogueVsEditionTitles:editionTitleReview
 },
 issues,
 workflow:"Una ficha sin fuente comprobada queda repertoriada; texto recuperado con licencia y fuente se importa a staging; solo después de control de identidad, OCR/TEI, loci e índice se promueve a lectura pública."
};
mkdirSync("reports/bibliotheca",{recursive:true});
writeFileSync("reports/bibliotheca/indexation-control.json",JSON.stringify(report,null,2)+"\n");
const summary={
 schema:report.schema,generated:report.generated,
 basis:"Control del repositorio; los objetos y fragmentos de R2 no fueron verificados en línea por este programa.",
 counts:report.counts,
 integrity:report.counts.structuralErrors?"error estructural":"estructura sin errores detectados",
 semanticIndex:"Índice invertido por raíces y Conceptus; NO desambiguación semántica filológica acreditada",
 remaining:"Consultar reports/bibliotheca/indexation-control.json para las incidencias por obra."
};
writeFileSync("data/r2/bibliotheca-indexation-status.json",JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(report.counts,null,2));
if(process.argv.includes("--strict")&&report.counts.structuralErrors)process.exitCode=1;
