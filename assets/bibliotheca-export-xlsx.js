/* Vitruvius Bibliotheca — client-side XLSX export of the scholarly dossiers.
   No server upload. Source-of-truth JSON remains unchanged. */
(()=>{"use strict";
const FILES={
 catalog:"data/bibliotheca-graeca-latina-I-bce-I-ce.json",
 standard:"data/classics-corpus/vitruvius-standard-222.json",
 ecdotics:"data/classics-corpus/ecdotics-222.json",
 witnesses:"data/bibliotheca-testimonia-verified.json",
 authority:"data/perseus-provenance-audit.json",
 trees:"data/classics-corpus/codicological-trees-222.json"
};
const compact=v=>v==null?"":Array.isArray(v)?v.join(" | "):typeof v==="object"?JSON.stringify(v):String(v);
const clean=s=>typeof s==="string"&&/^[=+@\-\t\r]/.test(s)?"'"+s:s;
const field=(obj,path)=>path.reduce((v,k)=>v?.[k],obj);
const raw=(obj,path)=>clean(compact(field(obj,path)));
async function getJSON(path){
 const r=await fetch(path,{cache:"no-store"});
 if(!r.ok)throw Error("No se pudo abrir "+path+" (HTTP "+r.status+")");
 return r.json();
}
async function ensureXLSX(){
 if(window.XLSX?.utils?.json_to_sheet)return window.XLSX;
 const src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
 await new Promise((resolve,reject)=>{
  const s=document.createElement("script");s.src=src;s.async=true;s.crossOrigin="anonymous";
  s.onload=resolve;s.onerror=()=>reject(Error("No se cargó el motor Excel. Comprobar conexión con CDN."));
  document.head.append(s);
 });
 if(!window.XLSX?.utils)throw Error("El motor Excel no está disponible");
 return window.XLSX;
}
const addSheet=(X,wb,name,rows)=>{
 const ws=X.utils.json_to_sheet(rows.length?rows:[{"Sin registros":""}],{skipHeader:false});
 const headers=Object.keys(rows[0]||{"Sin registros":""});
 ws["!cols"]=headers.map(h=>({wch:/URL|IIIF|referencia|fuente|cita|JSON/i.test(h)?45:/Título|Observaciones|Cobertura|Tradición|Edición|Normalización|Estado/i.test(h)?34:22}));
 ws["!autofilter"]={ref:ws["!ref"]};
 X.utils.book_append_sheet(wb,ws,name);
};
async function exportAll(button,statusNode){
 const original=button.textContent;
 button.disabled=true;button.textContent="Generando Excel académico…";
 if(statusNode)statusNode.textContent="Recopilando obras, ecdótica, códices y fuentes…";
 try{
  const [catalog,standard,ecd,registry,authority,trees,X]=await Promise.all([
   getJSON(FILES.catalog),getJSON(FILES.standard),getJSON(FILES.ecdotics),
   getJSON(FILES.witnesses),getJSON(FILES.authority),getJSON(FILES.trees),ensureXLSX()
  ]);
  const works=catalog.works||[],stand=new Map((standard.records||[]).map(x=>[x.workId,x])),ed=new Map((ecd.records||[]).map(x=>[x.workId,x])),auth=new Map((authority.records||[]).map(x=>[x.workId,x])),graph=new Map((trees.records||[]).map(x=>[x.workId,x]));
  const total=works.length;
  /* El repertorio crece cuando entra una obra nueva: en vez de una cifra fija se
     exige que los cinco registros estén sincronizados con el catálogo. */
  if(!total||stand.size!==total||ed.size!==total||auth.size!==total||graph.size!==total)throw Error("Catálogo incompleto: los registros no están sincronizados con las "+total+" obras del repertorio.");
  const wMap=new Map((registry.records||[]).map(x=>[x.id,x]));
  const obras=[],ecdRows=[],ediciones=[],testigos=[],fuentes=[],arboles=[];
  for(const w of works){
   const s=stand.get(w.id),e=ed.get(w.id),a=auth.get(w.id);
   const ms=e.witnesses||[];
   obras.push({
    "ID obra":w.id,"Autor":w.author,"Título":w.title,"Lengua original":w.language,
    "Fecha de composición":w.dating||"","Género":w.genre||"",
    "Títulos alternativos":compact(w.aliases||[]),"Estado de lectura":w.publicStatus||"",
    "Códigos PHI/TLG candidatos":compact(e.canonicalIdentifiers?.candidateTLGPHI||[]),
    "Estado código":e.canonicalIdentifiers?.candidateStatus||"",
    "CTS URN edición":e.canonicalIdentifiers?.ctsEditionUrn||"",
    "Estado CTS":e.canonicalIdentifiers?.ctsEditionStatus||"",
    "Testimonios vinculados":ms.length,
    "Madurez ecdótica":e.maturity?.level??0,
    "Estado de madurez":e.maturity?.levelName||"",
    "Ficha permanente":"https://vitruvius-digital-library.org/classics-work-record?work="+encodeURIComponent(w.id),
    "Información editorial (JSON)":clean(JSON.stringify(w.bibliography||{})),
    "Metadatos adicionales (JSON)":clean(JSON.stringify({pdf:w.pdf,reading:w.reading,translation:w.translation,localReader:w.localReader,localEdition:w.localEdition,links:w.links})),
   });
   ecdRows.push({
    "ID obra":w.id,"Autor":w.author,"Título":w.title,
    "Tipo de tradición":raw(e,["textualTradition","traditionType"]),
    "Tradición abierta":raw(e,["textualTradition","isOpenTradition"]),
    "Arquetipo":raw(e,["textualTradition","archetype"]),
    "Familias":raw(e,["textualTradition","families"]),
    "Recensiones":raw(e,["textualTradition","recensions"]),
    "Tradición indirecta":raw(e,["textualTradition","indirectWitnesses"]),
    "Stemma, estado":raw(e,["textualTradition","stemmaCodicum","status"]),
    "Stemma, aristas":raw(e,["textualTradition","stemmaCodicum","edges"]),
    "Edición base":raw(e,["digitalEdition","baseEdition"]),
    "Tipología edición":raw(e,["digitalEdition","editionType"]),
    "Aparato crítico":raw(e,["digitalEdition","criticalApparatus"]),
    "Normalización ortográfica / puntuación":raw(e,["digitalEdition","normalization"]),
    "Alineación de loci":raw(e,["digitalEdition","lociAlignment"]),
    "Referencias Chicago 18":raw(e,["digitalEdition","chicago18References"]),
    "Nivel de madurez":e.maturity?.level??0,
    "Madurez, requisitos":raw(e,["maturity","requirements"]),
    "Dato ecdótico completo (JSON)":clean(JSON.stringify({textualTradition:e.textualTradition,digitalEdition:e.digitalEdition,maturity:e.maturity}))
   });
   ediciones.push({
    "ID obra":w.id,"Título":w.title,
    "Texto local disponible":raw(w,["reading","status"]),
    "Edición base":raw(e,["digitalEdition","baseEdition"]),
    "Tipología edición":raw(e,["digitalEdition","editionType"]),
    "CTS edición":raw(e,["canonicalIdentifiers","ctsEditionUrn"]),
    "Estado de colación":raw(e,["digitalEdition","criticalApparatus"]),
    "Referencias Chicago 18":raw(s,["editorialControl","chicago18References"]),
    "Edición original (cita)":raw(w,["bibliography","originalEditionCitation"]),
    "Edición crítica (cita)":raw(w,["bibliography","editionCitation"]),
    "Traducción (cita)":raw(w,["bibliography","translationCitation"]),
    "Disponibilidad PDF":raw(w,["pdf","status"]),
    "Ruta/URL PDF":raw(w,["pdf","url"]),
    "Fuente de lectura":raw(w,["reading","url"]),
    "Versiones locales (JSON)":clean(JSON.stringify(w.localVersions||[]))
   });
   for(const t of ms){
    const source=wMap.get(t.witnessId)||{};
    testigos.push({
     "ID obra":w.id,"Título":w.title,"ID manuscrito":t.witnessId,"ID códice físico":t.canonicalPhysicalId||source.canonicalPhysicalId||"",
     "Testimonio":source.title||"",
     "Tradición":raw(t,["transmission","type"]),
     "Familia":raw(t,["transmission","family"]),
     "Recensión":raw(t,["transmission","recension"]),
     "Siglum":raw(t,["transmission","editorialSiglum"]),
     "Edición que acredita siglum":raw(t,["transmission","siglumSourceEdition"]),
     "Posición stemma":raw(t,["transmission","stemmaPosition"]),
     "Repositorio":raw(t,["codicology","repository"]),
     "Signatura":raw(t,["codicology","shelfmark"]),
     "Datación paleográfica":raw(t,["codicology","paleographicDate"]),
     "Soporte":raw(t,["codicology","support"]),
     "Escritura":raw(t,["codicology","script"]),
     "Manos / correctores":clean(JSON.stringify({hands:t.codicology?.hands,correctors:t.codicology?.correctors})),
     "Escolios, glosas, subscriptiones":clean(JSON.stringify({scholia:t.codicology?.scholia,glosses:t.codicology?.interlinearGlosses,subscriptiones:t.codicology?.subscriptiones})),
     "Procedencia":raw(t,["codicology","provenance"]),
     "Origen":raw(t,["codicology","origin"]),
     "Folios":raw(t,["codicology","foliation"]),
     "Cobertura":raw(t,["textualIntegrity","coverage"]),
     "Lagunas y accidentes":clean(JSON.stringify(t.textualIntegrity||{})),
     "Estado de revisión":raw(t,["textualIntegrity","criticalReviewStatus"]),
     "Catálogo URL":raw(t,["sources","catalogue"]),
     "Visor URL":raw(t,["sources","viewer"]),
     "IIIF URL":raw(t,["sources","iiifManifest"]),
     "Fuente de verificación":raw(t,["sources","verification"]),
     "Estado documental":raw(t,["sources","evidenceStatus"]),
     "Bibliografía / crítica (JSON)":clean(JSON.stringify({verification:source.verification,bibliography:source.bibliography,cataloguingStatus:source.cataloguingStatus,criticalEditionChicago18:t.sources?.criticalEditionChicago18})),
     "Registro manuscrito completo (JSON)":clean(JSON.stringify(source))
    });
   }
   const tree=graph.get(w.id);
   arboles.push({
     "ID obra":w.id,"Título":w.title,"Tipo de árbol":tree.kind,
     "Número de testimonios":tree.witnesses.length,
     "Códices físicos únicos en obra":new Set(tree.witnesses.map(x=>x.canonicalPhysicalId||x.id)).size,
     "Relaciones de atestación":tree.links.length,
     "Filiaciones documentadas":tree.documentedFiliation.length,
     "Estado del stemma":tree.stemmaStatus,
     "Familias establecidas":compact(tree.families||[]),
     "Arquetipo establecido":tree.archetype||"",
     "Testigos (JSON)":clean(JSON.stringify(tree.witnesses)),
     "Conexiones obra-testigo (JSON)":clean(JSON.stringify(tree.links)),
     "Filiaciones con evidencia (JSON)":clean(JSON.stringify(tree.documentedFiliation)),
     "Árbol completo (JSON)":clean(JSON.stringify(tree)),
   });
   fuentes.push({
    "ID obra":w.id,"Autor":w.author,"Título":w.title,
    "Perseus / procedencia":raw(a,["sourceReadiness"]),
    "Códigos de obra":raw(a,["candidateWorkCodes"]),
    "CTS URN":raw(a,["ctsEditionUrn"]),
    "Afiliación Perseus declarada":raw(a,["perseusAffiliation"]),
    "Referencias Chicago 18":raw(s,["editorialControl","chicago18References"]),
    "Links de catálogos (JSON)":clean(JSON.stringify(w.links||{})),
    "Versiones indexadas (JSON)":clean(JSON.stringify(a.versions||[])),
    "Fuentes completas (JSON)":clean(JSON.stringify(s.editorialControl||{}))
   });
  }
  const wb=X.utils.book_new();
  addSheet(X,wb,"Obras",obras);
  addSheet(X,wb,"Ecdotica",ecdRows);
  addSheet(X,wb,"Testigos",testigos);
  addSheet(X,wb,"Ediciones",ediciones);
  addSheet(X,wb,"Arboles codices",arboles);
  addSheet(X,wb,"Fuentes",fuentes);
  addSheet(X,wb,"Metodologia",[
   {"Campo":"Alcance","Descripción":works.length+" obras del repertorio; testigos separados por vínculo obra-manuscrito. No todos los datos están acreditados."},
   {"Campo":"Nulo / vacío","Descripción":"Información no disponible o no verificada; nunca equivale a dato negativo."},
   {"Campo":"PHI/TLG","Descripción":"Los códigos candidatos exigen revisión de autoridad. No implican CTS de edición validada."},
   {"Campo":"Stemma","Descripción":"Familias, arquetipos y posiciones solo se completan cuando hay bibliografía crítica suficiente."},
   {"Campo":"Edición digital","Descripción":"Se diferencia el texto indexado de la edición crítica y del facsímil manuscrito."},
   {"Campo":"Fuentes","Descripción":"Enlaces de catálogo, visor e IIIF se mantienen separados y no acreditan por sí mismos contenido o prioridad mundial."},
   {"Campo":"Árboles codicológicos","Descripción":"Las relaciones de atestación NO son filiaciones; solo se dibujan aristas genealógicas respaldadas por estudios."},
   {"Campo":"Fuente JSON","Descripción":Object.values(FILES).join(" | ")}
  ]);
  X.writeFile(wb,"Vitruvius_Bibliotheca_"+works.length+"_ecdótica_filología.xlsx",{compression:true});
  if(statusNode)statusNode.textContent="Excel generado: "+works.length+" obras y "+testigos.length+" vínculos con testimonios.";
 }catch(err){if(statusNode)statusNode.textContent="No se pudo generar el Excel: "+err.message;console.error("Vitruvius XLSX",err)}
 finally{button.disabled=false;button.textContent=original}
}
function start(){
 const button=document.getElementById("bibliotheca-download-xlsx");
 if(!button)return;
 const status=document.getElementById("bibliotheca-xlsx-status")||document.getElementById("work-record-status");
 button.addEventListener("click",()=>exportAll(button,status));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();