/* Vitruvia scholarly evidence taxonomy.
 * Describes what the result actually documents, not whether its contents
 * have been independently collated or peer-reviewed by this website.
 */
(()=>{
 "use strict";
 const text=x=>String(x||"");
 function classify(r){
  const d=r||{},meta=text(d.meta).toLowerCase();
  switch(d.type){
   case "manuscript":return {key:"witness",es:"testimonio manuscrito catalogado",en:"catalogued manuscript witness",fr:"témoin manuscrit catalogué"};
   case "fragment":return {key:"fragment",es:"fragmento documentado",en:"documented fragment",fr:"fragment documenté"};
   case "passage":
   case "preface":return {key:"edition-text",es:"texto de edición identificada",en:"text from identified edition",fr:"texte d’une édition identifiée"};
   case "text-external":return {key:"external-text",es:"texto externo · verificar edición",en:"external text · check edition",fr:"texte externe · vérifier l’édition"};
   case "apparatus":
   case "collation":return {key:"apparatus",es:"aparato editorial documentado",en:"documented editorial apparatus",fr:"apparat éditorial documenté"};
   case "edition":{
    const translation=/traducci|traduc|traduit|tradutt|translation|traduction/.test(meta+" "+text(d.recordKind).toLowerCase());
    return translation?
     {key:"translation",es:"traducción documentada",en:"documented translation",fr:"traduction documentée"}:
     {key:"edition",es:"edición identificada",en:"identified edition",fr:"édition identifiée"};
   }
   case "book":return d.readable?{key:"reader",es:"lectura disponible en catálogo",en:"catalogue reading available",fr:"lecture disponible au catalogue"}:
     {key:"bibliography",es:"ficha bibliográfica · lectura no acreditada",en:"bibliographic record · reading unconfirmed",fr:"notice bibliographique · lecture non attestée"};
   case "article":return d.doi?
     {key:"article-index",es:"registro bibliográfico con DOI",en:"bibliographic record with DOI",fr:"notice bibliographique avec DOI"}:
     {key:"article-index",es:"registro de investigación",en:"research record",fr:"notice de recherche"};
   case "googlebook":
   case "openlibrary":return {key:"bibliography",es:"catálogo bibliográfico",en:"bibliographic catalogue",fr:"catalogue bibliographique"};
   case "wikipedia":
   case "wikidata":
   case "encyclopedia":
   case "topic":return {key:"reference",es:"fuente de referencia",en:"reference source",fr:"source de référence"};
   case "authority":return {key:"authority",es:"ficha de autoridad",en:"authority record",fr:"notice d’autorité"};
   case "museum":return {key:"museum",es:"registro de colección",en:"collection record",fr:"notice de collection"};
   case "university":
   case "scholar":return {key:"research",es:"fuente de investigación",en:"research source",fr:"source de recherche"};
   case "section":return {key:"site",es:"documento del sitio",en:"site document",fr:"document du site"};
   default:return {key:"source",es:"fuente enlazada",en:"linked source",fr:"source liée"};
  }
 }
 function label(row,lang="es"){const c=classify(row);return c[["es","en","fr"].includes(lang)?lang:"es"]}
 window.VitruviaEvidence={classify,label};
})();
