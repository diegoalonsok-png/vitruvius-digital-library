// Carga cada página del sitio sin red externa y falla si hay errores de JavaScript.
// Los 404 locales se informan (algunos tienen respaldo institucional) pero no hacen fallar la prueba.
import {chromium} from 'playwright';
const base=process.env.BASE||'http://127.0.0.1:8766/';let failed=0;
import fs from 'node:fs';
const pages=fs.readdirSync('.').filter(f=>f.endsWith('.html')&&!f.startsWith('google'));
const b=await chromium.launch();
for(const f of pages){const p=await b.newPage();const errs=[],miss=[];
 p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
 p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)miss.push(r.status()+' '+r.url().replace(base,''))});
 await p.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 try{await p.goto(base+f,{waitUntil:'load',timeout:25000});await p.waitForTimeout(1200)}catch(e){errs.push('LOAD '+e.message.slice(0,80))}
 if(errs.length)failed++;
 if(errs.length||miss.length)console.log(f,'\n  ',[...new Set(errs)].join('\n   '),'\n  ',[...new Set(miss)].slice(0,6).join('\n   '));
 await p.close()}
await b.close();console.log('checked',pages.length,'pages ·',failed,'with JavaScript errors');if(failed)process.exit(1);
