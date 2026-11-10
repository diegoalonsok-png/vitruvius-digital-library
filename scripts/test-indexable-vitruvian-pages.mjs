import assert from "node:assert/strict";import fs from "node:fs";
const read=f=>fs.readFileSync(f,"utf8");
const html=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const a=JSON.parse(read("data/structured/recensio-es.json")),b=JSON.parse(read("data/structured/theory-en.json"));
const idx=read("indice-busquedas-academicas.html"),map=read("sitemap.xml");
const root="https://diegoalonsok-png.github.io/vitruvius-digital-library/";
for(const [loc,file] of [["1.1.1","locus-vitruvio-i-1-1.html"],["3.1.2","locus-vitruvio-iii-1-2.html"]]){
 const p=a.passages.find(x=>x.locus===loc),q=b.passages.find(x=>x.locus===loc);assert(p&&q&&p.latin===q.latin);
 const page=read(file);for(const text of [p.latin,p.translation,q.translation])assert(page.includes(html(text)),file+" missing verified text");
 assert(page.includes('href="'+root+file+'"'));assert(page.includes('href="lector-bilingue.html?edition=recensio-es&amp;locus='+loc+'"'));
 assert(!page.includes('name="citation_doi"'));assert(map.includes('<loc>'+root+file+'</loc>'));assert(idx.includes('href="'+file+'"'));
}
const red=read("red-conceptual-vitruviana.html");
for(const term of ["architectura","ordinatio","dispositio","eurythmia","symmetria","decor","distributio"])assert(red.includes('id="concepto-'+term+'"'));
assert(red.includes(html(a.passages.find(x=>x.locus==="1.2.1").latin)));
assert(idx.includes('href="red-conceptual-vitruviana.html"'));assert(map.includes('<loc>'+root+'red-conceptual-vitruviana.html</loc>'));
console.log("PASS indexable loci and conceptual network: textual provenance and routes");