#!/usr/bin/env node
/**
 * Contract for academic identifiers and discoverability.
 * Verifies local metadata, not external DOI resolution, Google Search indexing,
 * Google Scholar inclusion, peer review or manuscript collation.
 * Does not change the books, PDFs, witnesses or editorial text.
 */
import assert from "node:assert/strict";
import {existsSync, readFileSync, statSync} from "node:fs";
import {resolve, dirname} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>readFileSync(resolve(root,file),"utf8");
const origin="https://vitruvius-digital-library.org";
const records=[
  {label:"Biblioteca", file:"index.html", url:origin+"/", doi:"10.5281/zenodo.23868911", type:"CollectionPage"},
  {label:"Vitruvia", file:"vitruvia.html", url:origin+"/vitruvia", doi:"10.5281/zenodo.24201044", type:"WebApplication"},
  {label:"Vitruvia Lexicon", file:"vitruvia-lexicon.html", url:origin+"/vitruvia-lexicon", doi:"10.5281/zenodo.24201083", type:"WebApplication"},
  {label:"Bibliotheca Graeca et Latina", file:"bibliotheca-graeca-latina.html", url:origin+"/bibliotheca-graeca-latina", doi:"10.5281/zenodo.24199923", type:"Collection"},
  {label:"V514", file:"documents/edicion-v514.html", url:origin+"/documents/edicion-v514", doi:"10.5281/zenodo.23884757", type:"Book", pdf:"documents/kurilo-recensio-es.pdf"},
  {label:"V554", file:"documents/edicion-v554.html", url:origin+"/documents/edicion-v554", doi:"10.5281/zenodo.23885110", type:"Book", pdf:"documents/kurilo-recensio-fr.pdf"},
  {label:"V297", file:"documents/edicion-v297.html", url:origin+"/documents/edicion-v297", doi:"10.5281/zenodo.23885404", type:"Book", pdf:"documents/kurilo-theory-en.pdf"}
];

const sitemap=read("sitemap.xml");
const listed=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
assert.equal(listed.length,new Set(listed).size,"Sitemap has duplicate URLs");
const robots=read("robots.txt");
assert(robots.includes("Sitemap: "+origin+"/sitemap.xml"),"robots.txt must advertise canonical sitemap");
assert(!/Disallow:\s*\//i.test(robots),"robots.txt must not block the research corpus");

function ldNodes(node,result=[]){
  if(Array.isArray(node)){for(const item of node)ldNodes(item,result);return result;}
  if(node&&typeof node==="object"){
    if(node["@type"])result.push(node);
    for(const item of Object.values(node))ldNodes(item,result);
  }
  return result;
}
function schemaFor(html,file){
  const blocks=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert(blocks.length>0,file+": missing JSON-LD");
  return blocks.flatMap((match,index)=>{
    let parsed;
    try{parsed=JSON.parse(match[1]);}
    catch(error){throw Error(file+": malformed JSON-LD block "+(index+1)+": "+error.message);}
    return ldNodes(parsed);
  });
}

const problems=[];
for(const item of records){
 try{
  const full=read(item.file),head=full.split(/<\/head>/i)[0];
  assert(full.includes("</head>"),item.file+": missing head");
  const canonical=head.match(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/i)?.[1];
  assert.equal(canonical,item.url,"Wrong canonical");
  assert(listed.includes(item.url),"Missing URL in sitemap.xml");
  const metaDoi=head.match(/<meta\s+name="citation_doi"\s+content="([^"]+)"/i)?.[1];
  assert.equal(metaDoi,item.doi,"Wrong citation_doi");
  const citeAs=head.match(/<link\s+rel="cite-as"\s+href="([^"]+)"\s*\/?>/i)?.[1];
  assert.equal(citeAs,"https://doi.org/"+item.doi,"Wrong cite-as link");
  assert(/<meta\s+name="citation_title"\s+content="[^"]{10,}"/i.test(head),"Missing scholarly citation title");
  assert(/<meta\s+name="citation_author"\s+content="[^"]{4,}"/i.test(head),"Missing citation author");
  assert(!/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(head),"Accidental noindex");
  const nodes=schemaFor(head,item.file);
  const entry=nodes.find(node=>
    [node["@type"]].flat().includes(item.type) && node.url===item.url);
  assert(entry,"No matching structured resource of type "+item.type);
  assert.equal(entry.identifier,"https://doi.org/"+item.doi,"Wrong Schema.org resource identifier");
  if(item.pdf){
    const pdfUrl=origin+"/"+item.pdf;
    const metaPDF=head.match(/<meta\s+name="citation_pdf_url"\s+content="([^"]+)"/i)?.[1];
    assert.equal(metaPDF,pdfUrl,"Wrong citation_pdf_url");
    assert.equal(new URL(pdfUrl).pathname.split("/").slice(0,-1).join("/"),
      new URL(item.url).pathname.split("/").slice(0,-1).join("/"),
      "Scholar PDF must be in the same directory as its HTML landing page");
    assert(existsSync(resolve(root,item.pdf)),"Missing local PDF");
    assert(statSync(resolve(root,item.pdf)).size>0,"Empty PDF file");
    assert(/<h2>(?:Resumen \/ Abstract|Résumé|Abstract)<\/h2>/i.test(full),
      "Landing page should show a research abstract");
  }
  console.log("OK "+item.label+" — "+item.doi);
 }catch(error){
  problems.push(item.label+": "+error.message);
 }
}
// Google Dataset structured data: isPartOf must identify a parent Dataset,
// not the CollectionPage representing the project website.
try {
 const nodes=schemaFor(read("index.html").split(/<\/head>/i)[0],"index.html");
 const datasets=nodes.filter(node=>[node["@type"]].flat().includes("Dataset"));
 assert(datasets.length>0,"Homepage must describe its historical-editions dataset");
 for(const dataset of datasets){
  if(typeof dataset.isPartOf==="string"){
   assert.notEqual(dataset.isPartOf,origin+"/",
    "Dataset isPartOf cannot identify the project CollectionPage as a parent dataset");
  }else if(dataset.isPartOf){
   assert([dataset.isPartOf["@type"]].flat().includes("Dataset"),
    "Dataset isPartOf must contain a parent Dataset object");
  }
 }
 console.log("OK Dataset: no invalid CollectionPage parent");
}catch(error){problems.push("Dataset relationship: "+error.message);}

if(problems.length){
 for(const error of problems)console.error("FAIL "+error);
 process.exitCode=1;
}else{
 console.log("PASS: "+records.length+" publication objects; DOI, canonical, JSON-LD, citation and sitemap metadata consistent.");
}
