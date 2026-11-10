#!/usr/bin/env node
/* Reproducible consistency checks for the small scholarly evidence network. */
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const graph=JSON.parse(read("data/lexicon/vitruvian-evidence-network.json"));
const corpus=JSON.parse(read("data/structured/recensio-es.json"));
const loci=new Set(corpus.passages.map(p=>p.locus));
const errors=[],nodes=new Map();
if(graph.schema!=="vitruvia-lexicon-evidence-network-v1")errors.push("Unexpected schema");
if(!Array.isArray(graph.nodes)||!Array.isArray(graph.edges))throw Error("Missing nodes or edges");
for(const node of graph.nodes){
 if(nodes.has(node.id))errors.push("Duplicate node "+node.id);
 nodes.set(node.id,node);
 if(!fs.existsSync(path.join(root,node.entryPage)))errors.push("Missing entry "+node.entryPage);
 if(!node.searchUrl.startsWith("vitruvia-lexicon.html?"))errors.push("Invalid lexicon URL "+node.id);
 for(const loc of node.loci||[])if(!loci.has(loc))errors.push("Unknown locus "+node.id+" "+loc);
 if(node.greek&&(!loci.has(node.greek.locus)||node.greek.basis!=="explicit_equivalence"))errors.push("Unverifiable Greek equivalence "+node.id);
}
const types=new Set(Object.keys(graph.method.evidenceTypes));
for(const edge of graph.edges){
 if(!nodes.has(edge.from)||!nodes.has(edge.to))errors.push("Unknown edge node "+edge.from+"→"+edge.to);
 if(!types.has(edge.evidence))errors.push("Unspecified evidence status "+edge.evidence);
 if(edge.locus&&!loci.has(edge.locus))errors.push("Unknown edge locus "+edge.locus);
 if(edge.evidence==="editorial_topic"&&edge.locus)errors.push("Thematic edge must not falsely claim specific attestation");
}
if(graph.method.manuscriptsVerified!==false||graph.method.variantCollationVerified!==false)errors.push("Unsupported manuscript-verification claim");
const html=read("red-conceptual-vitruviana.html");
for(const id of ["vitruvian-evidence-browser","vitruvian-evidence-term","vitruvian-evidence-results"])if(!html.includes('id="'+id+'"'))errors.push("Missing HTML hook "+id);
if(!html.includes('src="assets/lexicon-evidence-network.js?'))errors.push("Missing JS script");
if(!html.includes('href="data/lexicon/vitruvian-evidence-network.json"'))errors.push("Missing data download");
console.log("Evidence network:",graph.nodes.length,"nodes,",graph.edges.length,"links,",corpus.passages.length,"source loci;");
if(errors.length){for(const e of errors)console.error("ERROR:",e);process.exit(1)}
console.log("PASS: node references, locus source, evidence types, page hooks and non-certification");
