/* Un control por función en cada página.
 *
 * Los botones dobles no están en el marcado: los inyectan los scripts
 * compartidos cuando no reconocen el control que la página ya trae. Esta
 * auditoría carga cada página en jsdom, ejecuta los scripts que inyectan
 * controles y cuenta cuántos quedan de cada función.
 */
import {JSDOM} from "jsdom";
import fs from "node:fs";
import path from "node:path";

const INYECTORES=["assets/site-bar.js","assets/theme.js","assets/front-palette.js"]
 .filter(f=>fs.existsSync(f)).map(f=>({nombre:path.basename(f),codigo:fs.readFileSync(f,"utf8")}));
const FAMILIAS=[
 ["apariencia",".theme-switch,#theme"],
 ["idioma de interfaz",'#lx-ui,[aria-label^="Idioma de la interfaz"]'],
 ["fondo o paleta","#lx-palette,#home-palette-toggle,#front-background-toggle"],
 ["tipografía",".site-typeface-tool"],
];
const paginas=fs.readdirSync(".").filter(f=>f.endsWith(".html")).sort();
const problemas=[];
for(const pagina of paginas){
 const html=fs.readFileSync(pagina,"utf8");
 const dom=new JSDOM(html,{runScripts:"outside-only",
  url:"https://vitruvius-digital-library.org/"+pagina.replace(/\.html$/,""),pretendToBeVisual:true});
 const w=dom.window;
 w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 for(const {codigo} of INYECTORES){try{w.eval(codigo)}catch{/* el script puede pedir cosas que jsdom no tiene */}}
 try{w.document.dispatchEvent(new w.Event("DOMContentLoaded"))}catch{}
 await new Promise(r=>setTimeout(r,0));
 for(const [nombre,selector] of FAMILIAS){
  const n=w.document.querySelectorAll(selector).length;
  if(n>1)problemas.push({pagina,nombre,n});
 }
 w.close();
}
console.log(`${paginas.length} páginas revisadas con los inyectores en marcha.`);
if(!problemas.length){console.log("Un control por función en todas.");process.exit(0)}
console.log(`\n${problemas.length} controles duplicados:`);
for(const p of problemas)console.log(`  ${p.pagina.padEnd(42)} ${p.nombre.padEnd(20)} ${p.n}`);
process.exit(1);
