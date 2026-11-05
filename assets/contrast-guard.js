/* Guardia de legibilidad (WCAG 2.2).
 * Tras cada cambio de tema, de fondo o de contenido, revisa los textos visibles y, solo cuando el
 * contraste con su fondo efectivo queda por debajo de 3:1 (texto ilegible), le asigna un tono
 * oscuro o claro según el fondo. No toca los textos que ya se leen bien ni los elementos sobre imágenes.
 */
(()=>{
 'use strict';
 if(window.VitruviaContrastGuard)return;
 const MIN=3,DARK='#24221f',LIGHT='#f3efe6',MARK='data-contrast-fixed';
 const parse=c=>{const m=String(c).match(/rgba?\(([^)]+)\)/);if(!m)return null;const v=m[1].split(/[ ,/]+/).filter(Boolean).map(Number);return{r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1}};
 const lum=({r,g,b})=>{const f=x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
 const blend=(t,u)=>({r:t.r*t.a+u.r*(1-t.a),g:t.g*t.a+u.g*(1-t.a),b:t.b*t.a+u.b*(1-t.a),a:1});
 const ratio=(a,b)=>{const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
 function background(el){
  const stack=[];
  for(let x=el;x&&x.nodeType===1;x=x.parentElement){
   const s=getComputedStyle(x);
   if(s.backgroundImage&&s.backgroundImage!=='none')return null; // sobre imagen o degradado: no se decide
   const c=parse(s.backgroundColor);if(c&&c.a>0){stack.push(c);if(c.a>=1)break}
  }
  let base={r:255,g:255,b:255,a:1};for(let i=stack.length-1;i>=0;i--)base=blend(stack[i],base);return base;
 }
 let sig='',obs=null;
 const signature=()=>[document.documentElement.dataset.theme,document.documentElement.className,document.body?.className].join('|');
 function check(){
  obs?.disconnect();
  try{run()}finally{observe()}
 }
 function run(){
  const now=signature();
  if(now!==sig){sig=now;for(const el of document.querySelectorAll('['+MARK+']')){el.style.removeProperty('color');el.removeAttribute(MARK)}}
  let n=0;
  for(const el of document.querySelectorAll('body *')){
   if(++n>6000)break;
   if(/^(SCRIPT|STYLE|SVG|IMG|VIDEO|CANVAS|IFRAME|OPTION)$/i.test(el.tagName))continue;
   if(![...el.childNodes].some(t=>t.nodeType===3&&t.textContent.trim()))continue;
   if(el.hasAttribute(MARK))continue;
   const s=getComputedStyle(el);if(s.visibility==='hidden'||s.display==='none')continue;
   const fg=parse(s.color),bg=background(el);if(!fg||!bg)continue;
   if(ratio(blend(fg,bg),bg)>=MIN)continue;
   const dark=parse('rgb(36,34,31)'),light=parse('rgb(243,239,230)');
   el.style.setProperty('color',ratio(dark,bg)>=ratio(light,bg)?DARK:LIGHT,'important');el.setAttribute(MARK,'');
  }
 }
 let timer=0;const later=(ms=500)=>{clearTimeout(timer);timer=setTimeout(()=>{window.requestIdleCallback?requestIdleCallback(()=>check(),{timeout:1500}):check()},ms)};
 function observe(){
  obs??=new MutationObserver(m=>{if(m.some(r=>r.type==='attributes'||r.addedNodes.length))later()});
  obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-theme','class','style']});
 }
 const start=()=>{later(600);observe()};
 // Las mutaciones que provoca la propia guardia (style/atributo) no deben relanzarla en bucle:
 // check() solo escribe cuando hay un problema, y el siguiente pase ya no lo encuentra.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.VitruviaContrastGuard={check};
})();
