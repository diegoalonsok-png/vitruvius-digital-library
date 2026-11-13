// Verificación del sitio PUBLICADO (no del repositorio): recorre con un navegador real
// todas las páginas HTML en cada dominio, registra errores de JavaScript y toda
// respuesta >=400 del propio dominio, comprueba cada enlace interno, robots/sitemap,
// y verifica una muestra de la colección en R2 (SHA-256 y CORS).
// Solo lee: no modifica nada en ningún sitio.
import {chromium} from "playwright";
import fs from "node:fs";
import crypto from "node:crypto";

const HOSTS=(process.env.HOSTS||"https://vitruvius-digital-library.org/,https://diegoalonsok-png.github.io/vitruvius-digital-library/").split(",");
const R2="https://libros.vitruvius-digital-library.org/";
const pages=fs.readdirSync(".").filter(f=>f.endsWith(".html")&&!f.startsWith("google")).sort();
const browser=await chromium.launch({headless:true});
const informe={fecha:new Date().toISOString(),paginas:pages.length,hosts:{},r2:{},problemas:0};

async function recorrer(base){
  const out={visitadas:0,erroresJS:[],recursosFallidos:[],enlacesRotos:[],externosFallidos:new Set(),cargaLenta:[]};
  const enlaces=new Set();
  const abortados=[];
  let cursor=0;
  const origin=new URL(base).origin;
  async function worker(){
    const ctx=await browser.newContext();
    while(cursor<pages.length){
      const f=pages[cursor++];
      const page=await ctx.newPage();
      page.on("pageerror",e=>out.erroresJS.push(f+": "+String(e.message).slice(0,200)));
      page.on("response",r=>{
        const u=r.url();
        if(r.status()>=400){
          if(u.startsWith(origin)||u.startsWith(R2)) out.recursosFallidos.push(f+" → "+r.status()+" "+u);
          else out.externosFallidos.add(r.status()+" "+u.split("?")[0]);
        }
      });
      // ERR_ABORTED: descargas de PDF que Chromium sin visor corta, o pedidos cancelados por una
      // redirección de la página. Se confirman después con una petición directa.
      page.on("requestfailed",r=>{const u=r.url();if(u.startsWith(origin)||u.startsWith(R2))abortados.push([f,r.failure()?.errorText||"",u])});
      const t0=Date.now();
      try{
        const resp=await page.goto(base+f,{waitUntil:"load",timeout:60000});
        if(!resp||resp.status()>=400) out.recursosFallidos.push(f+" → página "+(resp?resp.status():"sin respuesta"));
        await page.waitForTimeout(1500);
        const ms=Date.now()-t0; if(ms>15000) out.cargaLenta.push(f+" "+ms+"ms");
        const hrefs=await page.$$eval("a[href]",as=>as.map(a=>a.href));
        for(const h of hrefs){const u=h.split("#")[0];if(u.startsWith(origin)&&u.startsWith(base))enlaces.add(u)}
        out.visitadas++;
      }catch(e){out.recursosFallidos.push(f+" → "+e.message.slice(0,140))}
      await page.close();
    }
    await ctx.close();
  }
  await Promise.all(Array.from({length:6},worker));
  for(const [f,err,u] of abortados){
    try{const r=await fetch(u,{method:"GET"});await r.arrayBuffer();if(r.status>=400)out.recursosFallidos.push(f+" → "+err+" y "+r.status+" "+u)}
    catch(e){out.recursosFallidos.push(f+" → "+err+" "+u)}
  }
  out.abortadosConfirmadosOK=abortados.length;
  // Enlaces internos únicos
  const lista=[...enlaces];
  let i=0;
  async function chequear(){
    while(i<lista.length){
      const u=lista[i++];
      try{const r=await fetch(u,{method:"GET",redirect:"follow"});if(r.status>=400)out.enlacesRotos.push(r.status+" "+u);await r.arrayBuffer()}
      catch(e){out.enlacesRotos.push("FALLA "+u)}
    }
  }
  await Promise.all(Array.from({length:12},chequear));
  out.enlacesInternosComprobados=lista.length;
  for(const extra of ["robots.txt","sitemap.xml"]){
    const r=await fetch(base+extra);if(r.status>=400)out.recursosFallidos.push(extra+" → "+r.status);
  }
  out.externosFallidos=[...out.externosFallidos].slice(0,40);
  return out;
}

for(const h of HOSTS){
  console.log("Recorriendo",h);
  const r=await recorrer(h);
  informe.hosts[h]=r;
  informe.problemas+=r.erroresJS.length+r.recursosFallidos.length+r.enlacesRotos.length;
  console.log(` ${r.visitadas}/${pages.length} páginas · ${r.enlacesInternosComprobados} enlaces internos · errores JS ${r.erroresJS.length} · recursos fallidos ${r.recursosFallidos.length} · enlaces rotos ${r.enlacesRotos.length} · externos con error ${r.externosFallidos.length}`);
  for(const x of [...r.erroresJS,...r.recursosFallidos,...r.enlacesRotos].slice(0,40))console.log("   ",x);
}

// R2: muestra estratificada del manifiesto, SHA-256 + CORS
const man=JSON.parse(fs.readFileSync("data/r2/manifiesto-r2.json","utf8")).items;
const muestra=man.filter((_,k)=>k%20===0);
let ok=0;const malos=[];
for(const m of muestra){
  try{
    const r=await fetch(R2+m.ruta.split("/").map(encodeURIComponent).join("/"),{headers:{Origin:"https://vitruvius-digital-library.org"}});
    const b=Buffer.from(await r.arrayBuffer());
    const sha=crypto.createHash("sha256").update(b).digest("hex");
    const cors=r.headers.get("access-control-allow-origin");
    if(r.status===200&&sha===m.sha256&&cors)ok++;else malos.push(`${m.ruta} status=${r.status} sha=${sha===m.sha256} cors=${cors}`);
  }catch(e){malos.push(m.ruta+" "+e.message)}
}
informe.r2={muestra:muestra.length,correctos:ok,malos};
informe.problemas+=malos.length;
console.log(`R2: ${ok}/${muestra.length} archivos de muestra con SHA-256 idéntico y CORS correcto`);
for(const x of malos.slice(0,20))console.log("   ",x);

await browser.close();
fs.mkdirSync("reports",{recursive:true});
fs.writeFileSync("reports/verificacion-sitio-vivo.json",JSON.stringify(informe,null,1)+"\n");
console.log("TOTAL problemas:",informe.problemas);
if(informe.problemas)process.exitCode=1;
