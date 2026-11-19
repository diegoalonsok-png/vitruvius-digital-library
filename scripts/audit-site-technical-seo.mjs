#!/usr/bin/env node
/* SEO technical audit: metadata and indexability only. Does not modify site files.
   Search Console notices are not enough to identify affected URLs; use concrete evidence. */
import fs from "node:fs";
import path from "node:path";

const origin="https://vitruvius-digital-library.org";
const sitemap=fs.readFileSync("sitemap.xml","utf8");
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,"&"));
const issues=[], datasetIssues=[], noindexPages=[];
const add=(kind,file,detail)=>issues.push({kind,file,detail});
const seen=new Set();
for(const url of urls){
 if(seen.has(url))add("duplicate_sitemap_url",url,"Repeated loc");
 seen.add(url);
}
const files=new Set();
function walk(root,depth=0){
 if(depth>2||!fs.existsSync(root))return;
 for(const item of fs.readdirSync(root,{withFileTypes:true})){
  if(item.name.startsWith(".")||["node_modules","assets","data","images","covers","reports","fonts","corpus","docs"].includes(item.name))continue;
  const p=path.posix.join(root,item.name);
  if(item.isDirectory())walk(p,depth+1);
  else if(item.name.endsWith(".html"))files.add(p);
 }
}
walk(".");
const pages=[...files].map(x=>x.replace(/^\.\//,""));
const inSitemap=new Set();
for(const url of urls){
 if(!url.startsWith(origin+"/")){add("off_domain_sitemap",url,"Not the canonical host");continue}
 const route=new URL(url).pathname.replace(/^\//,"");
 const candidates=route? [route,route+".html",route+"/index.html"] : ["index.html"];
 const source=candidates.find(x=>fs.existsSync(x)&&fs.statSync(x).isFile());
 if(!source){add("missing_local_source",url,"No matching HTML or file in repository");continue}
 inSitemap.add(source);
 if(!source.endsWith(".html"))continue;
 const html=fs.readFileSync(source,"utf8"),head=html.split(/<\/head>/i)[0];
 const robots=(head.match(/<meta[^>]*name=["']robots["'][^>]*>/i)||[""])[0];
 const canonical=(head.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)||[])[1];
 if(/noindex/i.test(robots))add("noindex_in_sitemap",source,url);
 if(canonical && canonical!==url)add("canonical_mismatch",source,canonical+" != "+url);
}
const rootSet=new Set(pages);
for(const file of pages){
 const html=fs.readFileSync(file,"utf8");
 const head=html.split(/<\/head>/i)[0];
 const robots=(head.match(/<meta[^>]*name=["']robots["'][^>]*>/i)||[""])[0];
 if(/noindex/i.test(robots))noindexPages.push({file,listed_in_sitemap:inSitemap.has(file)});
 const scripts=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
 for(let i=0;i<scripts.length;i++){
  let root;
  try{root=JSON.parse(scripts[i][1]);}catch(e){add("invalid_jsonld",file,"Script "+(i+1)+": "+e.message);continue}
  const stack=[root];
  while(stack.length){
   const obj=stack.pop();
   if(Array.isArray(obj)){stack.push(...obj);continue}
   if(!obj||typeof obj!=="object")continue;
   if(obj["@graph"])stack.push(obj["@graph"]);
   const types=[].concat(obj["@type"]||[]);
   if(!types.includes("Dataset"))continue;
   const missing=["name","description","creator","license"].filter(k=>!obj[k]||(typeof obj[k]==="string"&&!obj[k].trim()));
   if(missing.length)datasetIssues.push({file,missing,name:obj.name||"",url:obj.url||""});
  }
 }
}
const report={
 schema:"vdl-technical-seo-audit-v1",
 generated_utc:new Date().toISOString(),
 scope:"static HTML and sitemap; not a Google indexing report",
 counts:{sitemap_urls:urls.length,html_files_scanned:pages.length,
   sitemap_issues:issues.length,invalid_dataset_records:datasetIssues.length,
   html_noindex_pages:noindexPages.length},
 issues, datasetIssues, noindexPages
};
fs.mkdirSync("reports/seo",{recursive:true});
fs.writeFileSync("reports/seo/technical-indexability.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report.counts));
for(const i of issues.slice(0,40))console.log("SEO_ISSUE",JSON.stringify(i));
for(const i of datasetIssues.slice(0,50))console.log("DATASET_ISSUE",JSON.stringify(i));
for(const i of noindexPages.slice(0,25))console.log("NOINDEX_PAGE",JSON.stringify(i));
console.log("SEO audit completed; no changes made to source HTML.");
if(issues.length||datasetIssues.length)process.exitCode=1;
