#!/usr/bin/env node
/* Pruebas de assets/vitruvia-philology.js
 * Casos tomados del propio corpus del sitio: Vitruvio, el catálogo
 * grecolatino y las equivalencias hebreas del Etymologicum.
 * Ejecutar: node scripts/test-vitruvia-philology.mjs
 */
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const P=require("../assets/vitruvia-philology.js");

let pass=0,fail=0;
const show=value=>typeof value==="string"?value:JSON.stringify(value);
function ok(name,got,want){
 const good=show(got)===show(want);
 if(good)pass++;else{fail++;console.log("  FALLA  "+name+"\n     obtenido: "+show(got)+"\n     esperado: "+show(want))}
}
function yes(name,value){if(value)pass++;else{fail++;console.log("  FALLA  "+name+" (esperaba verdadero)")}}
function no(name,value){if(!value)pass++;else{fail++;console.log("  FALLA  "+name+" (esperaba falso)")}}
const group=title=>console.log("\n"+title);

group("Grafía · griego");
ok("acentos y espíritus fuera","ἀρχιτέκτων"&&P.fold("ἀρχιτέκτων"),"αρχιτεκτων");
ok("sigma final unificada",P.fold("λόγος"),"λογοσ");
ok("iota suscrita fuera",P.fold("τῷ"),"τω");
ok("mayúsculas con espíritu",P.fold("Ἑλλάς"),"ελλασ");

group("Grafía · latín");
ok("i/j y u/v",P.foldLatin("Iudicium"),"iudicium");
ok("v inicial",P.foldLatin("vir"),"uir");
ok("j medieval",P.foldLatin("judicium"),P.foldLatin("iudicium"));
ok("ae ligada",P.fold("æternus"),"aeternus");
ok("macrones fuera",P.fold("archĭtectus"),"architectus");

group("Beta-code");
ok("logos",P.fold(P.fromBetaCode("lo/gos")),P.fold("λόγος"));
ok("arxitektwn",P.fromBetaCode("a)rxite/ktwn"),"αρχιτεκτων");
ok("texto latino intacto",P.fromBetaCode("symmetria"),"symmetria");

group("Clave entre alfabetos");
ok("ἀρχιτέκτων y architectus comparten raíz",
 P.scriptKey("ἀρχιτέκτων").slice(0,9),P.scriptKey("architectus").slice(0,9));
yes("architekton encuentra ἀρχιτέκτων",P.sameFamily("architekton","ἀρχιτέκτων"));
yes("θέατρον y theatrum",P.sameFamily("θέατρον","theatrum"));
yes("σύμμετρος y symmetros",P.sameFamily("σύμμετρος","symmetros"));
no("no confunde palabras ajenas",P.sameFamily("templum","tempus"));
no("no confunde logos con legatus",P.sameFamily("λόγος","legatus"));

group("Flexión latina · el caso que el buscador perdía");
for(const form of ["symmetriae","symmetriam","symmetrias","symmetriā"]){
 yes(form+" → symmetria",P.sameFamily(form,"symmetria"));
}
yes("architecti → architectus",P.sameFamily("architecti","architectus"));
yes("aedificiorum → aedificium",P.sameFamily("aedificiorum","aedificium"));
yes("columnarum → columna",P.sameFamily("columnarum","columna"));
yes("templorum → templum",P.sameFamily("templorum","templum"));
no("no une auto con autor",P.sameFamily("auto","autor"));

group("Flexión griega");
yes("λόγου → λόγος",P.sameFamily("λόγου","λόγος"));
yes("τέκτονος → τέκτων",P.sameFamily("τέκτονος","τέκτων"));
yes("οἴκων → οἶκος",P.sameFamily("οἴκων","οἶκος"));
yes("στύλοις → στῦλος",P.sameFamily("στύλοις","στῦλος"));

group("Hebreo · esqueleto consonántico");
ok("niqqud fuera",P.hebrewSkeleton("חָרָשׁ"),"חרש");
ok("prefijo ו",P.hebrewSkeleton("ותורה"),"תור");
ok("sufijo de plural",P.hebrewSkeleton("עמודים"),"עמוד");
ok("escritura detectada",P.detectScript("תבנית"),"hebrew");

group("Citas");
ok("Vitr. 3.1.2",P.citation("Vitr. 3.1.2").locus,"3.1.2");
ok("autor resuelto",P.citation("Vitr. 3.1.2").author,"Vitruvio · De architectura");
ok("romanos a arábigos",P.citation("De arch. III 1, 2").locus,"3.1.2");
ok("Il. 1.1",P.citation("Il. 1.1").author,"Homero · Ilíada");
ok("Hdt. II 35",P.citation("Hdt. II 35").locus,"2.35");
ok("numeral romano",P.fromRoman("XIV"),14);
ok("sin cita devuelve null",P.citation("la simetría en Vitruvio"),null);

group("Onomástica");
const tabla={"vitruvio":["Vitruvio","Vitruvius","Vitruve","Marco Vitruvio Polión"]};
yes("catálogo manda",P.nameVariants("Vitruvio",tabla).includes("Vitruvius"));
yes("regla io→ius sin catálogo",P.nameVariants("Ovidio",null).includes("ovidius"));
yes("regla on→o",P.nameVariants("Cicerón",null).includes("cicero"));
yes("regla qu→ch",P.nameVariants("Arquímedes",null).some(v=>v.includes("arch")));

group("Clasificación");
ok("cita",P.classify("Vitr. 3.1.2").type,"citation");
ok("persona del catálogo",P.classify("Vitruvio",tabla).type,"person");
ok("término suelto",P.classify("symmetria").type,"term");
ok("concepto",P.classify("el concepto de decor en Vitruvio").type,"concept");
ok("obra",P.classify("manuscrito Harley 2767").type,"work");
ok("hebreo es término",P.classify("תבנית").type,"term");

group("Expansión");
const e1=P.expand("symmetriae",{onomastica:tabla});
yes("conserva la literal",e1.forms.includes("symmetriae"));
yes("recorta la raíz",e1.stems.some(s=>"symmetriae".startsWith(s)&&s.length>=4));
yes("no manda raíces a fuentes externas",e1.outbound.every(o=>!e1.stems.includes(o)));
const e2=P.expand("Vitruvio",{onomastica:tabla});
yes("variantes del nombre",e2.variants.includes("Vitruvius"));
yes("salida externa con variante",e2.outbound.length>1);
const e3=P.expand('"ordinatio dispositio" eurythmia');
ok("frase entre comillas",e3.phrases[0],"ordinatio dispositio");
yes("palabras vacías fuera",!P.expand("de la architectura").tokens.includes("de"));
const e4=P.expand("a)rxite/ktwn");
yes("beta-code convertido",e4.forms.some(f=>/αρχιτεκτων/.test(P.fold(f))));

console.log("\n"+pass+" correctas · "+fail+" fallidas");
process.exit(fail?1:0);
