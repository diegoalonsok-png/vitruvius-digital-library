#!/usr/bin/env node
/* Comprobación HTTP de producción. No confundir el shell HTML 200 con un lector operativo.
   Uso: node scripts/smoke-bibliotheca-public.mjs
   Sólo lectura, sin credenciales y sin cambiar datos. */
const SITE="https://vitruvius-digital-library.org/";
const R2="https://libros.vitruvius-digital-library.org/";
const targets=[
 ["Bibliotheca","bibliotheca-graeca-latina.html","Bibliotheca"],
 ["Lector de textos","classics-text-reader.html?work=cicero-brutus&lang=la&locus=urn%3Acts%3AlatinLit%3Aphi0474.phi039.perseus-lat2%3A1","id=\"passages\""],
 ["Lector paralelo","classics-simple-parallel.html?work=aquiles-tacio-leucipa&left=grc&right=auto-es&locus=urn%3Acts%3AgreekLit%3Atlg0532.tlg001.perseus-grc2.1.1.1","id=\"left-text\""],
 ["Aparato","apparatus-bude.html?locus=1.1.1&edition=v514&translation=es","<html"]
];
let errors=0;
async function probe(label,url,expected,json=false){
 try{
  const response=await fetch(url,{redirect:"follow",headers:{Accept:json?"application/json":"text/html"},signal:AbortSignal.timeout(18000)});
  const type=response.headers.get("content-type")||"";
  const body=await response.text();
  let valid=response.ok&&type.includes(json?"json":"html");
  if(json){try{const parsed=JSON.parse(body);valid=valid&&Boolean(parsed.schema||parsed.obras||parsed.items)}catch{valid=false}}
  else valid=valid&&body.includes(expected)&&!(/<title>404/i.test(body));
  console.log(JSON.stringify({label,status:response.status,type,bytes:body.length,ok:valid,url:response.url}));
  if(!valid)errors++;
 }catch(e){errors++;console.log(JSON.stringify({label,ok:false,error:e.message,url}))}
}
for(const [label,path,marker] of targets)await probe(label,new URL(path,SITE),marker);
await probe("Catálogo GitHub servido",new URL("data/r2/catalogo-clasicos-r2.json",SITE),null,true);
await probe("Índice R2 publicado",new URL("clasicos/indice/fragmentos.json",R2),null,true);
console.log("Observación: HTTP y marcadores NO acreditan funcionamiento de botones, sincronización ni calidad textual. Esas funciones requieren pruebas de navegador y datos.");
if(errors)process.exitCode=1;
