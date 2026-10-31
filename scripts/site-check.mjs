import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const pages=['index.html','lector-bilingue.html','comparador-loci.html','buscador-laboratorio.html','lexicon-vitruvianum.html','geographia-codicum.html','facsimiles.html','aparato-critico.html','scriptorium-htr.html','principios.html','bibliografia.html','biografia.html'];
let failures=0,checks=0;
function check(ok,msg){checks++;console.log((ok?'PASS ':'FAIL ')+msg);if(!ok)failures++;}
for(const page of pages){const full=path.join(root,page);check(fs.existsSync(full),'Exists: '+page);if(!fs.existsSync(full))continue;const body=fs.readFileSync(full,'utf8');check(/<title>[^<]+<\/title>/i.test(body),'Title: '+page);for(const m of body.matchAll(/(?:href|src)\s*=\s*["']([^"'#]+)["']/g)){const url=m[1].split(/[?#]/)[0];if(!url||/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(url))continue;const target=path.join(root,decodeURIComponent(url).replace(/^\//,''));check(fs.existsSync(target),'Asset '+page+' -> '+url);}}
const core=['data/structured/recensio-es.json','data/structured/recensio-fr.json','data/structured/theory-en.json'];
for(const file of core){try{const d=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));check(Array.isArray(d.passages)&&d.passages.length>700,'Corpus '+file);check(d.passages.every(p=>p.locus&&p.latin),'Latin loci '+file);}catch(e){check(false,'Corpus '+file+' '+e.message)}}
for(const script of ['assets/scriptorium-htr.mjs','assets/lexicon-vitruvianum.mjs','assets/buscador-laboratorio.mjs','assets/search-core.mjs']){try{const {spawnSync}=await import('node:child_process');const out=spawnSync(process.execPath,['--check',script],{encoding:'utf8'});check(out.status===0,'JS syntax: '+script+' '+(out.stderr||'').trim());}catch(e){check(false,'JS syntax '+script)}}
check(fs.readFileSync('scriptorium-htr.html','utf8').includes('id="gemini-extract"'),'Gemini UI action present');
check(fs.readFileSync('assets/scriptorium-htr.mjs','utf8').includes("$('#gemini-extract').addEventListener"),'Gemini UI handler present');
console.log('Checked '+checks+' assertions, '+failures+' failures.');if(failures)process.exitCode=1;
