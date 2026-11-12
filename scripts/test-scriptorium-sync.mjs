/* El scriptorium: que los tres visores se sincronicen por la concordancia
   documentada y que las clases de divergencia usen nomenclatura ecdótica. */
import {readFileSync,existsSync} from "node:fs";
import {JSDOM} from "jsdom";
let fallos=0;
const check=(c,m)=>{if(!c){console.error("  ✗ "+m);fallos++}else console.log("  ✓ "+m)};

const col=JSON.parse(readFileSync("data/collation-loci.json","utf8"));
const html=readFileSync("scriptorium.html","utf8");
const js=readFileSync("assets/scriptorium-triple.js","utf8");

console.log("concordancia de loci");
const loci=Object.keys(col.loci);
check(loci.length>=731,`${loci.length} loci con concordancia registrada`);
for(const w of ["rose-1899","krohn-1912"]){
 const con=loci.filter(l=>col.loci[l]?.[w]?.page).length;
 const alta=loci.filter(l=>(col.loci[l]?.[w]?.score||0)>=0.8).length;
 check(con===loci.length,`${w}: página registrada en los ${con} loci`);
 check(alta>loci.length*0.7,`${w}: semejanza ≥0,80 en ${alta} loci (${Math.round(100*alta/loci.length)} %)`);
}

console.log("\nnomenclatura ecdótica");
for(const t of ["Lectiones diversae","Lectiones dubiae","Variae lectiones minores","Segmentatio diversa","Lectio incerta ex OCR"])
 check(html.includes(t),`la clase «${t}» está en los filtros`);
for(const t of ["Alertas importantes","Diferencias moderadas","Variaciones menores","Alertas OCR"])
 check(!html.includes(t),`la etiqueta de ingeniería «${t}» fue retirada`);
check(/script-audit-glossary/.test(html),"hay glosario que define cada clase");
check(html.includes("Collatio editionum"),"la sección se titula como registro de colación");

console.log("\nsincronización en el visor");
check(/collation-loci\.json/.test(js),"el visor lee la concordancia documentada");
check(/TESTIGO=\{krohn:"krohn-1912",rose:"rose-1899"\}/.test(js),"mapea cada visor con su testigo");
check(/gradoConcordancia/.test(js),"declara el grado de la concordancia");
check(!/machine-candidate-not-verified/.test(js),"ya no depende del conjunto de candidatos sin verificar");
check(/no sustituye la colación/.test(js),"el aviso dice que no sustituye la colación");

// el grado se calcula como corresponde
const dom=new JSDOM("<!doctype html><div id='script-triple'><div class='script-triple-grid'></div></div>",
 {url:"https://e.org/scriptorium.html",runScripts:"outside-only"});
const {window}=dom;
window.fetch=async u=>{const p=String(u).split("?")[0].replace(/^https?:\/\/[^/]+\//,"");
 return existsSync(p)?{ok:true,status:200,json:async()=>JSON.parse(readFileSync(p,"utf8"))}:{ok:false,status:404,json:async()=>({})}};
let err=null;
try{window.eval(js)}catch(e){err=e.message}
check(!err,"el visor se evalúa sin excepción"+(err?": "+err:""));
await new Promise(r=>setTimeout(r,250));
check(window.document.querySelectorAll(".script-triple-pane").length===3,"se arman los tres visores");
const barra=window.document.querySelector(".script-triple-sync");
check(barra&&/concordancia/i.test(barra.textContent),"la barra explica la concordancia");

/* La sincronización no basta con estar cableada: la página de destino tiene que
   contener de verdad el pasaje. Se comprueba sobre una muestra fija, buscando los
   trigramas del latín editado en la página indicada y sus dos vecinas. */
console.log("\nla página de destino contiene el pasaje");
const fold=t=>t.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase()
 .replace(/j/g,"i").replace(/v/g,"u").replace(/[^a-z]+/g," ").replace(/\s+/g," ").trim();
const edicion=JSON.parse(readFileSync("data/structured/recensio-es.json","utf8"));
const latinDe=new Map(edicion.passages.map(p=>[p.locus,p.latin||""]));
const muestra=[...latinDe.keys()].filter((_,i)=>i%9===0).slice(0,70);
for(const [testigo,archivo,etiqueta] of [["krohn-1912","data/text/krohn-1912.json","Krohn 1912"],
                                         ["rose-1899","data/text/rose-1899.json","Rose 1899"]]){
 const paginas=new Map(JSON.parse(readFileSync(archivo,"utf8")).map(p=>[p.page,fold(p.text||"")]));
 let aciertos=0,evaluados=0,fallosFirmes=0;
 for(const locus of muestra){
  const d=col.loci[locus]?.[testigo];
  if(!d?.page)continue;
  const w=fold(latinDe.get(locus)||"").split(" ");
  if(w.length<6)continue;
  const tri=[];for(let i=0;i<w.length-2;i++)tri.push(w.slice(i,i+3).join(" "));
  const ventana=[-1,0,1].map(k=>paginas.get(d.page+k)||"").join(" ");
  const cobertura=tri.filter(t=>ventana.includes(t)).length/tri.length;
  evaluados++;
  if(cobertura>=0.5)aciertos++;
  else if((d.score||0)>=0.9)fallosFirmes++;
 }
 check(evaluados>40,`${etiqueta}: ${evaluados} loci evaluados`);
 check(aciertos/evaluados>=0.9,
   `${etiqueta}: la página de destino trae el pasaje en ${aciertos} de ${evaluados} (${Math.round(100*aciertos/evaluados)} %)`);
 check(fallosFirmes===0,`${etiqueta}: ninguna concordancia declarada firme falla`);
}

console.log(fallos?`\n${fallos} comprobaciones fallidas`:"\nTodas las comprobaciones pasaron");
process.exit(fallos?1:0);
