import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const stores=new Map(),listeners=new Map();
const key=r=>typeof r==='string'?new URL(r,'https://library.test/').href:r.url;
const cache=name=>{if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return {
 match:async r=>m.get(key(r))?.clone(),put:async(r,v)=>{m.set(key(r),v.clone())},
 keys:async()=>[...m.keys()].map(x=>new Request(x)),delete:async r=>m.delete(key(r)),add:async()=>{}
}};
const caches={open:async name=>cache(name),keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),match:async r=>{for(const name of stores.keys()){const hit=await cache(name).match(r);if(hit)return hit}}};
const response=text=>{const r=new Response(text,{headers:{'Content-Type':'text/html'}});Object.defineProperty(r,'type',{value:'basic'});return r};
let fetches=0,network=async()=>response('first document');
const self={location:{origin:'https://library.test'},clients:{claim:async()=>{}},addEventListener:(type,fn)=>listeners.set(type,fn)};
vm.runInNewContext(read('sw.js'),{self,caches,fetch:async req=>{fetches++;return network(req)},Request,Response,Headers,URL,Date,setTimeout,clearTimeout});
function request(url){const waits=[];let result;listeners.get('fetch')({request:new Request(url),respondWith:p=>{result=p},waitUntil:p=>waits.push(p)});return {result,waits}}
const first=request('https://library.test/lector-bilingue.html?locus=1.1.1');
assert.equal(await (await first.result).text(),'first document');await Promise.all(first.waits);
assert.equal(fetches,1);
let finish;
network=()=>new Promise(resolve=>{finish=resolve});
const next=request('https://library.test/lector-bilingue.html?locus=2.praef.1');
assert.equal(await (await next.result).text(),'first document','A prepared static page must open without waiting for the network');
assert.equal(typeof finish,'function','The page must refresh in the background');
finish(response('updated document'));await Promise.all(next.waits);
network=async()=>response('updated document');
const third=request('https://library.test/lector-bilingue.html');
assert.equal(await (await third.result).text(),'updated document','A background update must become available on the next navigation');await Promise.all(third.waits);
assert.equal(request('https://external.test/page.html').result,undefined,'External documents must not be intercepted');
stores.set('unrelated-app-cache',new Map());stores.set('pages-vdl-old',new Map());
let activated;listeners.get('activate')({waitUntil:p=>{activated=p}});await activated;
assert.ok(stores.has('unrelated-app-cache'),'Updating the library must preserve other application caches');
assert.ok(!stores.has('pages-vdl-old'));
console.log('PASS: immediate cached navigation, background freshness, canonical static-page cache and isolated cleanup.');

const handlers=new Map(),prepared=[];
const window={};window.top=window;window.self=window;
const document={currentScript:{src:'https://library.test/library/assets/fast-navigation.js'},readyState:'complete',documentElement:{dataset:{}},addEventListener:(type,fn)=>handlers.set(type,fn)};
vm.runInNewContext(read('assets/fast-navigation.js'),{window,document,location:{href:'https://library.test/library/index.html',origin:'https://library.test',pathname:'/library/index.html'},navigator:{},URL,AbortController,setTimeout,clearTimeout,performance:{now:()=>0},fetch:async url=>{prepared.push(url);return {ok:true,text:async()=>'<link rel="stylesheet" href="assets/theme.css"><script src="assets/bilingual.js"></script>',arrayBuffer:async()=>new ArrayBuffer(0)}}});
const anchor=href=>({href,target:'',hasAttribute:()=>false});
function hover(href){handlers.get('pointerover')({type:'pointerover',target:{closest:()=>anchor(href)}})}
hover('https://external.test/page.html');hover('https://library.test/library/book.pdf');
await new Promise(resolve=>setTimeout(resolve,80));assert.equal(prepared.length,0,'Hovering external links and PDFs must not start downloads');
hover('https://library.test/library/lector-bilingue.html');await new Promise(resolve=>setTimeout(resolve,100));
assert.ok(prepared.includes('https://library.test/library/lector-bilingue.html'));
assert.ok(prepared.includes('https://library.test/library/assets/theme.css'));
assert.ok(prepared.includes('https://library.test/library/assets/bilingual.js'));
const count=prepared.length;hover('https://library.test/library/lector-bilingue.html');await new Promise(resolve=>setTimeout(resolve,80));assert.equal(prepared.length,count);
assert.ok(!handlers.has('click'),'Normal links, browser history and page initialization must be preserved');
console.log('PASS: intent preparation, small UI assets, no PDF downloads, no duplicate work and normal browser navigation.');
