import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base='https://diegoalonsok-png.github.io/vitruvius-digital-library/';
const manifests=['manifest.webmanifest','vitruvia.webmanifest'].map(path=>({path,value:JSON.parse(read(path))}));
const ids=[];
for(const {path,value:m} of manifests){
 const url=new URL(path,base),start=new URL(m.start_url,url),scope=new URL(m.scope,url);
 ids.push(new URL(m.id,start.origin+'/').href);
 assert.equal(m.display,'standalone');assert.ok(start.href.startsWith(scope.href));
 for(const icon of m.icons){
  const file=new URL('../'+icon.src,import.meta.url);assert.ok(existsSync(file),'Missing icon '+icon.src);
  if(icon.type==='image/png'){
   const bytes=readFileSync(file),[width,height]=icon.sizes.split('x').map(Number);
   assert.equal(bytes.readUInt32BE(16),width);assert.equal(bytes.readUInt32BE(20),height);
  }
 }
 for(const shortcut of m.shortcuts||[])assert.ok(new URL(shortcut.url,url).href.startsWith(scope.href));
}
assert.equal(new Set(ids).size,2,'Library and search need distinct installation identities');
assert.match(manifests[0].value.start_url,/index\.html/);assert.match(manifests[1].value.start_url,/vitruvia\.html/);
const html=read('vitruvia.html'),head=html.slice(0,html.indexOf('</head>'));
assert.equal((html.match(/<head>/g)||[]).length,1);assert.equal((html.match(/<body>/g)||[]).length,1);
assert.match(head,/rel="manifest" href="vitruvia\.webmanifest"/);
assert.match(head,/apple-mobile-web-app-title" content="Vitruvia"/);
assert.match(head,/vitruvia-apple-touch-icon\.png/);

const events=new Map(),buttons=[],registered=[];
function element(tag){return {tag,textContent:'',className:'',setAttribute(){},addEventListener(type,fn){this[type]=fn},remove(){this.removed=true}}}
const window={addEventListener:(type,fn)=>events.set(type,fn),matchMedia:()=>({matches:false})};window.top=window;window.self=window;
const document={currentScript:{src:base+'assets/pwa.js'},readyState:'complete',documentElement:{lang:'es'},head:{append(){}},body:{append:b=>buttons.push(b)},createElement:element,querySelectorAll:()=>[],addEventListener(){}};
const navigator={userAgent:'Android',serviceWorker:{register:async(url,options)=>{registered.push({url,options})}}};
vm.runInNewContext(read('assets/pwa.js'),{window,document,navigator,location:{protocol:'https:',hostname:'diegoalonsok-png.github.io',pathname:'/vitruvius-digital-library/vitruvia.html'}});
assert.equal(registered[0].url,base+'sw.js');assert.equal(buttons.length,1);assert.equal(buttons[0].textContent,'Instalar Vitruvia');
let prompts=0,prevented=false;
events.get('beforeinstallprompt')({preventDefault(){prevented=true},prompt:async()=>{prompts++},userChoice:Promise.resolve({outcome:'accepted'})});
assert.equal(prevented,true);assert.equal(prompts,0,'Installing must require a user action');
await buttons[0].click();assert.equal(prompts,1);assert.equal(buttons[0].removed,true);
for(const page of ['index.html','vitruvia.html'])assert.match(read(page),/data-pwa-install/,'A visible installation control is required on '+page);
console.log('PASS: two install identities, correct launch pages, standalone display, valid icons, head metadata and installation by user action.');
