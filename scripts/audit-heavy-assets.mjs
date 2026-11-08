import {readdirSync,statSync,mkdirSync,writeFileSync,createReadStream} from "node:fs";
import {resolve,relative,extname,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
// Informe no destructivo. Mide el checkout; no mide el historial Git ni el paquete Pages.
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const skip=new Set([".git","node_modules",".venv","__pycache__",".next",".cache"]);
const image=new Set([".jpg",".jpeg",".png",".tif",".tiff",".webp",".jp2",".avif",".gif",".bmp",".svg"]);
const docs=new Set([".pdf",".doc",".docx",".odt",".epub",".ppt",".pptx",".xls",".xlsx"]);
const textExt=new Set([".json",".jsonl",".ndjson",".xml",".tei",".csv",".txt",".html",".htm",".js",".mjs",".css"]);
const items=[];
const category=name=>{const x=extname(name).toLowerCase();return image.has(x)?"images":docs.has(x)?"documents":textExt.has(x)?"text_and_index":[".mp4",".mov",".webm",".mp3",".wav",".ogg"].includes(x)?"media":[".zip",".7z",".tar",".gz",".rar"].includes(x)?"archives":"other"};
function walk(dir){
 for(const d of readdirSync(dir,{withFileTypes:true})){
  if(d.isDirectory()){if(!skip.has(d.name))walk(resolve(dir,d.name));continue}
  if(!d.isFile())continue;
  const abs=resolve(dir,d.name),name=relative(root,abs).replaceAll("\\","/");
  if(name.startsWith("reports/heavy-assets-audit."))continue;
  items.push({path:name,bytes:statSync(abs).size,category:category(name)});
 }
}
walk(root);
const count={},sizeMap=new Map();
for(const f of items){
 const row=count[f.category]||{files:0,bytes:0,over1MiB:0};
 row.files++;row.bytes+=f.bytes;if(f.bytes>1048576)row.over1MiB++;
 count[f.category]=row;
 if(f.bytes>1048576&&["images","documents","archives","media"].includes(f.category)){
  const group=sizeMap.get(f.bytes)||[];group.push(f);sizeMap.set(f.bytes,group);
 }
}
function sha(path){return new Promise((ok,fail)=>{const h=createHash("sha256"),s=createReadStream(resolve(root,path));s.on("data",b=>h.update(b));s.on("error",fail);s.on("end",()=>ok(h.digest("hex")))})}
const duplicates=[];
for(const group of sizeMap.values()){
 if(group.length<2)continue;
 const hashGroups=new Map();
 for(const f of group){const value=await sha(f.path),rows=hashGroups.get(value)||[];rows.push(f);hashGroups.set(value,rows)}
 for(const [hash,rows] of hashGroups)if(rows.length>1)duplicates.push({sha256:hash,bytes:rows[0].bytes,paths:rows.map(x=>x.path)});
}
items.sort((a,b)=>b.bytes-a.bytes||a.path.localeCompare(b.path));
const total=items.reduce((a,f)=>a+f.bytes,0), mib=x=>(x/1048576).toFixed(2);
const report={schema:"vitruvius-heavy-assets-v1",notice:"Checkout only; excludes Git history and may differ from the Pages deployment",scannedFiles:items.length,totalBytes:total,totalMiB:+mib(total),categories:count,filesOver1MiB:items.filter(x=>x.bytes>1048576).length,filesOver25MiB:items.filter(x=>x.bytes>25*1048576).length,topFiles:items.slice(0,60),duplicates};
mkdirSync(resolve(root,"reports"),{recursive:true});
writeFileSync(resolve(root,"reports/heavy-assets-audit.json"),JSON.stringify(report,null,2)+"\n");
let md="# Auditoría de materiales pesados\n\nInventario no destructivo del árbol de archivos, sin historial Git. No equivale al tamaño exacto del sitio publicado.\n\n";
md+="**Archivos:** "+items.length+" · **Peso:** "+mib(total)+" MiB\n\n| Clase | Cantidad | MiB | Más de 1 MiB |\n|---|---:|---:|---:|\n";
for(const [k,v] of Object.entries(count).sort((a,b)=>b[1].bytes-a[1].bytes))md+="| "+k+" | "+v.files+" | "+mib(v.bytes)+" | "+v.over1MiB+" |\n";
md+="\n## Los 40 archivos más grandes\n\n| Ruta | MiB | Clase |\n|---|---:|---|\n";
for(const f of items.slice(0,40))md+="| "+f.path.replaceAll("|","\\|")+" | "+mib(f.bytes)+" | "+f.category+" |\n";
md+="\n## Binarios idénticos por SHA-256 (>1 MiB)\n\n";
md+=duplicates.length?duplicates.map(x=>"- "+mib(x.bytes)+" MiB: "+x.paths.join(" · ")).join("\n"):"Sin duplicados idénticos identificados entre binarios >1 MiB.";
md+="\n\nNo se eliminaron archivos. Los posibles duplicados exigen validación documental y de enlaces antes de cualquier movimiento.\n";
writeFileSync(resolve(root,"reports/heavy-assets-audit.md"),md);
console.log("Peso del checkout:",mib(total),"MiB en",items.length,"archivos");
console.log("Por categorías:",JSON.stringify(Object.fromEntries(Object.entries(count).map(([k,v])=>[k,mib(v.bytes)]))));
console.log("Diez mayores:",JSON.stringify(items.slice(0,10).map(f=>({path:f.path,MiB:mib(f.bytes)}))));
