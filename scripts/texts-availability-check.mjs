#!/usr/bin/env node
// Comprueba que todos los textos que los visores leen en tiempo de ejecución sigan disponibles
// (Perseus, Open Greek and Latin, The Latin Library) y que existan los PDF locales de la Bibliotheca.
import fs from 'node:fs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const urls=new Set();
for(const f of ['data/clasicos-perseus.json','data/clasicos-perseus-extra.json'])
 for(const w of read(f).works){urls.add(w.original);for(const t of w.translations||[])urls.add(t.url);for(const p of w.parts||[])urls.add(p.url)}
const missingPdf=[];
for(const w of read('data/bibliotheca-graeca-latina-I-bce-I-ce.json').works){const u=w.pdf?.url;if(u&&!/^https?:/.test(u)&&!fs.existsSync(u.split(/[?#]/)[0]))missingPdf.push(w.id+' → '+u)}
for(const w of Object.values(fs.existsSync('data/clasicos-descargas.json')?read('data/clasicos-descargas.json').works:{}))for(const f of [w.pdf,w.docx])if(!fs.existsSync(f))missingPdf.push('edición descargable → '+f);
const list=[...urls].filter(Boolean),bad=[];let i=0;
async function worker(){while(i<list.length){const u=list[i++];
 if(!/^https?:\/\//.test(u)){
  // Fuente TEI incluida en el repositorio. No es una URL remota:
  // verificar extensión, ruta local segura y contenido no vacío.
  if(!/^data\/translations\/[\w./-]+\.xml$/.test(u)||u.includes('..')||!fs.existsSync(u)||fs.statSync(u).size<200)bad.push('ERR local '+u);
  continue;
 }
 try{const r=await fetch(u,{method:'HEAD'});if(!r.ok)bad.push(r.status+' '+u)}catch(e){bad.push('ERR '+u)}}}
await Promise.all(Array.from({length:16},worker));
console.log(`${list.length} textos comprobados · ${bad.length} no disponibles · ${missingPdf.length} PDF locales ausentes`);
for(const b of [...bad,...missingPdf])console.log('  ✗ '+b);
process.exit(bad.length||missingPdf.length?1:0);
