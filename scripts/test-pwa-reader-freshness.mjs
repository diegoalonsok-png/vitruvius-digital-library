import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
for(const pathname of ['/vitruvia','/vitruvia.html','/bibliotheca-graeca-latina',
 '/classics-simple-parallel','/classics-parallel-reader.html','/classics-text-reader',
 '/lectura-comparada','/codex-h-folios-local.html','/buscador-facsimiles-clasicos',
 '/vitruvius-digital-library/classics-simple-parallel.html']){
 const old=new Response('old reader'),writes=[],handlers=new Map();let release,request;
 const context=vm.createContext({URL,Request,Response,Headers,
  self:{location:{origin:'https://example.org'},addEventListener:(n,f)=>handlers.set(n,f)},
  caches:{open:async()=>({match:async()=>old,put:async(...args)=>writes.push(args)}),match:async()=>old},
  fetch:async r=>{request=r;return new Promise(resolve=>release=resolve)},
  setTimeout:()=>{throw Error('A reader must not fall back to obsolete HTML after 1.2 seconds')},clearTimeout(){}});
 vm.runInContext(source,context);
 let complete=false;
 const event={request:new Request('https://example.org'+pathname+'?work=didache&right=auto-es&locus=1'),waitUntil(){}};
 const pending=context.pageResponse(event).then(r=>{complete=true;return r;});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(complete,false,'Wait for the current reader instead of serving an old cached document: '+pathname);
 assert.equal(request.cache,'no-store');
 release(new Response('current reader'));
 assert.equal(await (await pending).text(),'current reader');
 context.fetch=async()=>{throw Error('offline')};
 assert.equal(await (await context.pageResponse(event)).text(),'old reader','Offline reading must retain its cached fallback');
}
console.log('PASS: fresh reading/search HTML for extensionless and .html routes in both deployments, slow-network protection and offline fallback');
