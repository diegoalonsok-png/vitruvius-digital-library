#!/usr/bin/env node
/* Pruebas de assets/vitruvia-rank.js
 * Los casos son los que planteó el autor: «Alejandro Magno» no es una
 * pizzería, «Dalí» es el pintor y sus cuadros van por orden de aparición.
 * Ejecutar: node scripts/test-vitruvia-rank.mjs
 */
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const P=require("../assets/vitruvia-philology.js");
const R=require("../assets/vitruvia-rank.js");

let pass=0,fail=0;
function yes(name,value,detail){if(value)pass++;else{fail++;console.log("  FALLA  "+name+(detail?"\n     "+detail:""))}}
function ok(name,got,want){const g=JSON.stringify(got),w=JSON.stringify(want);if(g===w)pass++;else{fail++;console.log("  FALLA  "+name+"\n     obtenido: "+g+"\n     esperado: "+w)}}
const group=t=>console.log("\n"+t);

group("«Alejandro Magno» no es una pizzería");
const alejandro=[
 {title:"Pizzería Alejandro Magno",excerpt:"Pizzería y trattoria en el centro. Menú del día, reservar mesa. Opiniones de clientes en Tripadvisor.",source:"Google Books",type:"book"},
 {title:"Restaurante Alejandro Magno S.L.",excerpt:"Alejandro Magno S.L. Teléfono: +34 915 000 000. Horario de atención.",source:"Open Library",type:"book"},
 {title:"Alejandro Magno",excerpt:"Rey de Macedonia (356–323 a. C.), discípulo de Aristóteles, conquistador del Imperio aqueménida.",source:"Wikipedia",type:"encyclopedia"},
 {title:"Alejandro Magno y el mundo helenístico",excerpt:"Estudio sobre la expansión helenística tras la muerte del rey macedonio en 323 a. C.",source:"OpenAlex",type:"paper",year:1998},
 {title:"Camiseta Alejandro Magno",excerpt:"Comprar online, envío gratis, oferta y descuento en tienda oficial.",source:"Google Books",type:"book"}
];
const expAlejandro=P.expand("Alejandro Magno");
const rankedAlejandro=R.rank(alejandro,expAlejandro);
yes("la entidad histórica es la primera",/^Alejandro Magno$/.test(rankedAlejandro[0].title),
 "primera: "+rankedAlejandro[0].title+" · "+R.explain(rankedAlejandro[0]));
const pizzaIndex=rankedAlejandro.findIndex(r=>/pizzer/i.test(r.title));
yes("la pizzería queda por detrás del estudio",pizzaIndex>1,"posición de la pizzería: "+pizzaIndex);
yes("la camiseta también cae",rankedAlejandro.findIndex(r=>/camiseta/i.test(r.title))>1);
yes("el ruido se declara en el desglose",/ruido comercial/.test(R.explain(rankedAlejandro[pizzaIndex])));

group("«Dalí»: el pintor primero y los cuadros por orden de aparición");
const dali=[
 {title:"La persistencia de la memoria",entityLinked:true,type:"painting",inception:1931,source:"Wikidata",image:"commons:persistence.jpg"},
 {title:"El gran masturbador",entityLinked:true,type:"painting",inception:1929,source:"Wikidata",image:"commons:masturbador.jpg"},
 {title:"Cristo de San Juan de la Cruz",entityLinked:true,type:"painting",inception:1951,source:"Wikidata",image:"commons:cristo.jpg"},
 {title:"Salvador Dalí",type:"person",excerpt:"Pintor surrealista español (1904–1989).",source:"Wikidata",qid:"Q5577",image:"commons:dali.jpg"},
 {title:"Vida secreta de Salvador Dalí",type:"book",year:1942,source:"Internet Archive",excerpt:"Autobiografía del pintor."},
 {title:"Dalí y el surrealismo: estudio",type:"paper",year:2011,source:"Crossref",excerpt:"Estudio sobre la obra del pintor."}
];
const expDali=Object.assign(P.expand("Salvador Dalí"),{type:"person",qid:"Q5577"});
const rankedDali=R.rank(dali,expDali);
const sections=R.group(rankedDali,expDali);
ok("la identificación abre el expediente",sections[0].id,"identidad");
const obras=sections.find(s=>s.id==="obras");
yes("hay un grupo de obras",!!obras);
ok("las obras van por fecha",obras.rows.map(r=>r.year),[1929,1931,1951]);
ok("el grupo declara su orden",obras.order,"cronológico");
yes("los escritos van en su propio grupo",sections.some(s=>s.id==="escritos"));
yes("los estudios, en el suyo",sections.some(s=>s.id==="estudios"));
yes("la entidad resuelta se bonifica",/entidad resuelta/.test(R.explain(rankedDali.find(r=>r.qid==="Q5577"))));

group("Flexión: la coincidencia literal gana a la aproximada");
const symmetria=[
 {title:"De symmetriis aedium sacrarum",excerpt:"Las symmetriae de los templos según Vitruvio.",source:"Bibliotheca Vitruviana",type:"edition"},
 {title:"Symmetria",excerpt:"Término vitruviano de proporción conmensurable.",source:"Wikipedia",type:"encyclopedia"}
];
const rankedSym=R.rank(symmetria,P.expand("symmetria"));
yes("la forma exacta del título gana",/^Symmetria$/.test(rankedSym[0].title),"primera: "+rankedSym[0].title);
yes("la forma flexionada también puntúa",rankedSym.length===2&&rankedSym[1].score>0);

group("Una entidad, un resultado");
const duplicados=[
 {title:"Vitruvio",excerpt:"Arquitecto romano del siglo I a. C.",source:"Wikipedia",qid:"Q47163"},
 {title:"Marcus Vitruvius Pollio",excerpt:"Arquitecto romano.",source:"VIAF",qid:"Q47163",link:"https://viaf.org/viaf/100190422"},
 {title:"Vitruvio",excerpt:"Arquitecto romano.",source:"Open Library",qid:"Q47163",link:"https://openlibrary.org/a/OL1A"}
];
const rankedDup=R.rank(duplicados,P.expand("Vitruvio"));
ok("tres fuentes, una ficha",rankedDup.length,1);
yes("las fuentes desplazadas quedan anexadas",(rankedDup[0].alsoIn||[]).length>=2,
 "anexos: "+JSON.stringify(rankedDup[0].alsoIn||[]));

group("Ninguna fuente inunda la primera pantalla");
const inundacion=[];
for(let i=0;i<9;i++)inundacion.push({title:"Vitruvio ficha "+i,excerpt:"Arquitecto romano.",source:"Google Books",type:"book"});
inundacion.push({title:"Vitruvio",excerpt:"Arquitecto romano del siglo I a. C.",source:"Wikipedia",type:"encyclopedia"});
const rankedFlood=R.rank(inundacion,P.expand("Vitruvio"),{perSource:3});
const primeras=rankedFlood.slice(0,4).filter(r=>r.source==="Google Books").length;
yes("tope por fuente respetado",primeras<=3,"de Google Books en las cuatro primeras: "+primeras);

group("Sin coincidencia no hay resultado");
const ajenos=R.rank([{title:"Historia de la pizza napolitana",excerpt:"Receta y hornos de leña.",source:"Wikipedia"}],P.expand("symmetria"));
ok("una ficha sin relación se descarta",ajenos.length,0);

group("Años");
ok("siglo antes de la era, por el comienzo del siglo",R.yearOf({dating:"siglo I a. C."}),-100);
const aprox={dating:"siglo IX"};R.yearOf(aprox);
yes("el siglo queda marcado como aproximado",aprox.yearApprox===true);
ok("siglo de la era",R.yearOf({dating:"siglo IX"}),801);
ok("año exacto antes de la era",R.yearOf({dating:"23 a. C."}),-23);
ok("año de edición",R.yearOf({published:"1567"}),1567);
ok("sin año",R.yearOf({title:"sin fecha"}),null);

console.log("\n"+pass+" correctas · "+fail+" fallidas");
process.exit(fail?1:0);
