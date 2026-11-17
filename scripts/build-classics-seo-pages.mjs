#!/usr/bin/env node
/** Build discoverable, source-grounded classical work summaries.
 * Only whitelisted works with indexed primary Greek/Latin passages qualify.
 * No source texts, R2 objects or historical edition records are modified.
 */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const base='https://vitruvius-digital-library.org';
// Include every source-grounded indexed original, not a fixed shortlist.
const featured=null;
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const catalog=json('data/bibliotheca-graeca-latina-I-bce-I-ce.json');
const supplement=json('data/bibliotheca-expansion-publicada-2026-11-16.json');
const registry=json('data/classics-corpus/search-registry.json');
if(!Array.isArray(catalog.works)||!Array.isArray(registry.entries))throw Error('Invalid catalog / registry');
const docs=new Map([...catalog.works,...(supplement.works||[])].filter(w=>w?.id).map(w=>[w.id,w]));
const docsHTML=[];
const workEntries=new Map();
for(const entry of registry.entries){
 if(!['grc','la'].includes(entry.language)||!['json-passages','structured-bilingual','html-text'].includes(entry.format))continue;
 if(!workEntries.has(entry.workId))workEntries.set(entry.workId,[]);
 workEntries.get(entry.workId).push(entry);
}
const emitted=[];
const output=path.join(root,'obras');
fs.mkdirSync(output,{recursive:true});
for(const id of [...workEntries.keys()].sort((a,b)=>a.localeCompare(b))){
 const w=docs.get(id);
 const originals=(workEntries.get(id)||[]).filter(e=>{
  const src=String(e.reader||'');
  return /^(?:classics-text-reader\.html\?|corpus\/[a-z0-9_-]+\.html)/.test(src)
    && e.path && (String(e.path).startsWith('data/') ? fs.existsSync(path.join(root,e.path)) : /^https:\/\/libros\.vitruvius-digital-library\.org\//.test(e.path) && /^[0-9a-f]{64}$/i.test(e.sha256||''))
    && typeof e.sourceDescription==='string' && e.sourceDescription.trim();
 });
 if(!w||!w.author||!w.title||!w.dating||!w.genre||!originals.length)continue;
 const original=originals.find(e=>e.language===w.language)||originals[0];
 const reader=original.reader;
 const lang=original.language==='grc'?'griego antiguo':'latín';
 const url=base+'/obras/'+id+'.html';
 const heading=w.author+' · '+w.title;
 const abstract='Ficha de '+w.title+' de '+w.author+', obra en '+lang+'. Consultar datación, género literario, edición digital de procedencia y lectura del texto original indexado.';
 const extra=String(w.description||w.summary||'').trim();
 const extraHTML=extra&&extra!==abstract?'<p>'+esc(extra)+'</p>':'';
 const structured={
  '@context':'https://schema.org','@type':'WebPage',
  name:heading,url,description:abstract,inLanguage:'es',
  isAccessibleForFree:true,
  mainEntity:{'@type':'CreativeWork',name:w.title,author:{'@type':'Person',name:w.author},
    inLanguage:original.language,genre:w.genre,
    isAccessibleForFree:true},
  isPartOf:{'@type':'CollectionPage',name:'Bibliotheca Graeca et Latina',
    url:base+'/bibliotheca-graeca-latina'}
 };
 const doc=`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(heading)} | Bibliotheca Graeca et Latina</title>
<meta name="description" content="${esc(abstract)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(heading)}">
<meta property="og:description" content="${esc(abstract)}"><meta property="og:url" content="${esc(url)}">
<script type="application/ld+json">${JSON.stringify(structured).replace(/</g,'\\u003c')}</script>
<link rel="stylesheet" href="../assets/style.css"><link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<style>main{max-width:880px;margin:auto;padding:30px 20px 90px;line-height:1.75}h1{font:400 clamp(28px,4vw,42px)/1.2 Georgia,serif}dt{font-weight:700;margin-top:12px}dd{margin-left:0}a{overflow-wrap:anywhere}nav{display:flex;gap:18px;flex-wrap:wrap}.note{padding:12px;border-left:3px solid #888}</style></head><body>
<main><nav aria-label="Navegación"><a href="../index-auctorum-operum.html">Índice de autores</a><a href="../bibliotheca-graeca-latina.html">Bibliotheca</a><a href="../vitruvia-lexicon.html">Lexicon</a></nav>
<p>FICHA DOCUMENTAL · LITERATURA CLÁSICA</p><h1>${esc(heading)}</h1>
<p>${esc(abstract)}</p>${extraHTML}
<dl><dt>Autor identificado en el catálogo</dt><dd>${esc(w.author)}</dd>
<dt>Título de la obra</dt><dd>${esc(w.title)}</dd>
<dt>Datación de la composición</dt><dd>${esc(w.dating)}</dd>
<dt>Género</dt><dd>${esc(w.genre)}</dd>
<dt>Lengua del texto indexado</dt><dd>${esc(lang)}</dd>
<dt>Procedencia declarada de la transcripción</dt><dd>${esc(original.sourceDescription)}</dd></dl>
<p><a href="../${esc(reader)}">Leer el texto original indexado</a> · <a href="../classics-work-record.html?work=${encodeURIComponent(id)}">Ficha crítica completa, manuscritos y ediciones</a></p>
<p class="note">La presencia de un texto digital indexado no implica cotejo paleográfico del códice, edición diplomática ni traducción alineada. Consultar la ficha crítica para comprobar el estado documental de los testimonios.</p>
<p>Referencia estable de esta ficha: <a href="${esc(url)}">${esc(url)}</a>.</p></main></body></html>`;
 const dest=path.join(output,id+'.html');
 fs.writeFileSync(dest,doc,'utf8');
 emitted.push({id,title:w.title,author:w.author,url});
 docsHTML.push('<li><a href="obras/'+esc(id)+'.html">'+esc(heading)+'</a> · '+esc(lang)+'</li>');
}
if(!emitted.length)throw Error('No verified indexed original found; refusing to publish empty SEO pages');
const hub='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Obras clásicas con texto indexado · Bibliotheca</title><meta name="description" content="Selección documentada de obras griegas y latinas con texto original indexado, lector, ficha crítica y referencias."><link rel="canonical" href="'+base+'/obras-clasicas-indexadas.html"><meta name="robots" content="index,follow"><link rel="stylesheet" href="assets/style.css"></head><body><main style="max-width:950px;margin:auto;padding:30px 20px 80px"><p><a href="bibliotheca-graeca-latina.html">Bibliotheca</a> · <a href="index-auctorum-operum.html">Todos los autores</a></p><h1>Obras clásicas con texto original indexado</h1><p>Selección editorial de fichas accesibles sin JavaScript. No es el catálogo completo: cada ficha enlaza a su texto original y sus testimonios documentales.</p><ul>'+docsHTML.join('\n')+'</ul></main></body></html>';
fs.writeFileSync(path.join(root,'obras-clasicas-indexadas.html'),hub);
const sitemapPath=path.join(root,'sitemap.xml');
let sitemap=read('sitemap.xml');
const fresh=[base+'/obras-clasicas-indexadas.html',...emitted.map(e=>e.url)];
for(const url of fresh)if(!sitemap.includes('<loc>'+url+'</loc>'))sitemap=sitemap.replace('</urlset>','  <url><loc>'+url+'</loc></url>\n</urlset>');
fs.writeFileSync(sitemapPath,sitemap);
console.log(JSON.stringify({generated:emitted.length,ids:emitted.map(e=>e.id),sitemapUrls:fresh.length},null,2));
