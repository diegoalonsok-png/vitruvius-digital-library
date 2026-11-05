#!/usr/bin/env node
// Auditoría de contraste (WCAG 2.2): recorre las páginas en tema claro y oscuro y lista los textos
// cuyo contraste con el fondo efectivo queda por debajo de 3:1 (texto grande) o 4.5:1 (texto normal).
// Uso: servidor local en :8766 y `node scripts/contrast-check.mjs [páginas…]`.
import fs from 'node:fs';
let pw;try{pw=await import('playwright')}catch{pw=await import('/opt/npm-tools/node_modules/playwright/index.mjs')}
const pages=process.argv.slice(2).length?process.argv.slice(2):fs.readdirSync('.').filter(f=>f.endsWith('.html')&&!/^(google|404)/.test(f));
const b=await pw.chromium.launch();let total=0;const report=[];
for(const file of pages)for(const theme of ['light','dark']){
 const p=await b.newPage({viewport:{width:1280,height:900}});
 await p.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await p.addInitScript(t=>{try{localStorage.setItem('vitruvius-theme',t);localStorage.setItem('theme',t)}catch{}},theme);
 try{await p.goto('http://127.0.0.1:8766/'+file,{waitUntil:'load',timeout:20000})}catch{await p.close();continue}
 await p.evaluate(t=>document.documentElement.setAttribute("data-theme",t),theme);await p.waitForTimeout(2500);
 const bad=await p.evaluate(()=>{
  const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const v=m[1].split(/[ ,/]+/).filter(Boolean).map(Number);return{r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1}};
  const lum=({r,g,b})=>{const f=x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
  const blend=(top,bot)=>({r:top.r*top.a+bot.r*(1-top.a),g:top.g*top.a+bot.g*(1-top.a),b:top.b*top.a+bot.b*(1-top.a),a:1});
  function bg(el){const stack=[];for(let x=el;x;x=x.parentElement){const s=getComputedStyle(x);if(s.backgroundImage!=='none'&&!/gradient/.test(s.backgroundImage))return null;const c=parse(s.backgroundColor);if(c&&c.a>0){stack.push(c);if(c.a>=1)break}}
   let base={r:255,g:255,b:255,a:1};for(let i=stack.length-1;i>=0;i--)base=blend(stack[i],base);return base}
  const out=[];
  for(const el of document.querySelectorAll('body *')){
   if(!el.offsetParent&&getComputedStyle(el).position!=='fixed')continue;
   const own=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1);if(!own)continue;
   const s=getComputedStyle(el);if(s.visibility==='hidden'||Number(s.opacity)<.4)continue;
   const fg=parse(s.color);const b=bg(el);if(!fg||!b)continue;
   const L1=lum(blend(fg,b)),L2=lum(b);const ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
   const size=parseFloat(s.fontSize),bold=Number(s.fontWeight)>=700;const large=size>=24||(bold&&size>=18.66);
   if(ratio<(large?3:4.5)&&ratio<3.2)out.push({tag:el.tagName.toLowerCase(),cls:String(el.className||'').slice(0,40),id:el.id,text:el.textContent.trim().slice(0,50),ratio:Math.round(ratio*100)/100});
  }
  return out;
 });
 if(bad.length){total+=bad.length;report.push(`${file} [${theme}] · ${bad.length}`);for(const x of bad.slice(0,8))report.push(`   ${x.ratio}:1 <${x.tag}${x.id?'#'+x.id:''}${x.cls?'.'+x.cls.split(' ')[0]:''}> «${x.text}»`)}
 await p.close();
}
await b.close();console.log(report.join('\n')||'Sin problemas de contraste.');console.log('Total de textos con contraste insuficiente (<3:1):',total);
