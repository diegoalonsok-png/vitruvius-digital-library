/* HieroRender: groups Unicode Egyptian hieroglyphs into quadrats in the browser.
 * Supports the Unicode 12 format controls that browsers do not compose themselves:
 *   U+13430 vertical joiner (stack), U+13431 horizontal joiner (side by side within a quadrat),
 *   U+13437 / U+13438 begin / end segment (grouping), U+1343C / U+1343D begin / end enclosure (cartouche),
 *   U+13432–U+13436 and U+13439–U+1343B insertion controls are shown as side-by-side placement (approximation).
 * Everything else in U+13000–U+1345F is rendered as a sign. No reading or sign is invented: the input is shown
 * exactly as encoded, only laid out. Output is plain DOM; styles are injected once.
 * API: window.HieroRender.render(text, {size}) → HTMLElement; window.HieroRender.strip(text) → plain signs.
 */
(()=>{"use strict";
const V=0x13430,H=0x13431,SEG_BEGIN=0x13437,SEG_END=0x13438,ENC_BEGIN=0x1343C,ENC_END=0x1343D;
const INSERT=new Set([0x13432,0x13433,0x13434,0x13435,0x13436,0x13439,0x1343A,0x1343B]);
const isSign=cp=>cp>=0x13000&&cp<=0x1342F||cp>=0x13460&&cp<=0x143FF;
const isControl=cp=>cp>=0x13430&&cp<=0x1345F;
function style(){
 if(document.getElementById("hiero-render-css"))return;
 const s=document.createElement("style");s.id="hiero-render-css";
 s.textContent=[
 "@font-face{font-family:'Noto Sans Egyptian Hieroglyphs';font-style:normal;font-weight:400;font-display:swap;src:local('Noto Sans Egyptian Hieroglyphs'),url('assets/fonts/noto-sans-egyptian-hieroglyphs-400.woff2') format('woff2');unicode-range:U+13000-1345F}",
 ".hg{display:inline-flex;flex-wrap:nowrap;align-items:center;gap:.08em;font-family:'Noto Sans Egyptian Hieroglyphs','Egyptian Text','Segoe UI Historic',sans-serif;font-size:var(--hg-size,36px);line-height:1;direction:ltr;unicode-bidi:isolate;vertical-align:middle}",
 ".hg .hg-q{display:inline-flex;align-items:center;justify-content:center;height:1.15em;min-width:.6em}",
 ".hg .hg-v{display:inline-flex;flex-direction:column;align-items:center;justify-content:space-evenly;height:1.15em}",
 ".hg .hg-v>*{display:block;line-height:1}",
 ".hg .hg-v.n2>*{font-size:.55em}.hg .hg-v.n3>*{font-size:.38em}.hg .hg-v.n4>*{font-size:.3em}",
 ".hg .hg-h{display:inline-flex;align-items:center;gap:.04em}",
 ".hg .hg-h.n2>*{font-size:.72em}.hg .hg-h.n3>*{font-size:.55em}",
 ".hg .hg-c{display:inline-flex;flex-wrap:nowrap;align-items:center;gap:.08em;border:.07em solid currentColor;border-radius:1em/50%;padding:.12em .35em;position:relative;margin-right:.3em;max-width:100%;overflow-x:auto}",
 ".hg .hg-c::after{content:'';position:absolute;right:-.28em;top:15%;bottom:15%;width:.09em;background:currentColor;border-radius:.05em}",
 ".hg .hg-sign{white-space:nowrap}",
 ".hg-fallback{font-family:'Noto Sans Egyptian Hieroglyphs','Egyptian Text',sans-serif}"
 ].join("\n");document.head.append(s);
}
/* Tokenise into a tree: items are signs, stacks (vertical), rows (horizontal) and enclosures. */
function parse(text){
 const cps=[...String(text||"")].map(c=>c.codePointAt(0));
 let i=0;
 function readGroup(stopAt){
  const items=[];
  while(i<cps.length){
   const cp=cps[i];
   if(stopAt.includes(cp)){i++;return items}
   if(cp===SEG_BEGIN){i++;items.push({type:"q",items:readGroup([SEG_END])});continue}
   if(cp===ENC_BEGIN){i++;items.push({type:"c",items:readGroup([ENC_END])});continue}
   if(cp===V||cp===H||INSERT.has(cp)){
    // Binary operator between the previous item and the next atom.
    const left=items.pop();i++;const right=readAtom();
    if(!left){if(right)items.push(right);continue}
    if(!right){items.push(left);continue}
    if(cp===V){
     if(left.type==="v")left.items.push(right),items.push(left);else items.push({type:"v",items:[left,right]});
    }else{
     if(left.type==="h")left.items.push(right),items.push(left);else items.push({type:"h",items:[left,right]});
    }
    continue;
   }
   if(isSign(cp)){items.push({type:"s",cp});i++;continue}
   if(isControl(cp)){i++;continue} // unsupported control: ignore silently
   if(cp===0x20||cp===0x0A){items.push({type:"sp"});i++;continue}
   items.push({type:"txt",ch:String.fromCodePoint(cp)});i++;
  }
  return items;
 }
 function readAtom(){
  if(i>=cps.length)return null;
  const cp=cps[i];
  if(cp===SEG_BEGIN){i++;return {type:"q",items:readGroup([SEG_END])}}
  if(cp===ENC_BEGIN){i++;return {type:"c",items:readGroup([ENC_END])}}
  if(isSign(cp)){i++;return {type:"s",cp}}
  i++;return readAtom();
 }
 return readGroup([]);
}
function build(items){
 const frag=document.createDocumentFragment();
 for(const it of items){
  if(it.type==="s"){const s=document.createElement("span");s.className="hg-sign";s.textContent=String.fromCodePoint(it.cp);frag.append(s);continue}
  if(it.type==="sp"){const s=document.createElement("span");s.style.width=".25em";frag.append(s);continue}
  if(it.type==="txt"){frag.append(document.createTextNode(it.ch));continue}
  const el=document.createElement("span");
  if(it.type==="v"){el.className="hg-v n"+Math.min(it.items.length,4)}
  else if(it.type==="h"){el.className="hg-h n"+Math.min(it.items.length,3)}
  else if(it.type==="c"){el.className="hg-c";el.title="Cartucho (šnw)"}
  else el.className="hg-q";
  el.append(build(it.items));frag.append(el);
 }
 return frag;
}
function render(text,opts={}){
 style();
 const root=document.createElement("span");root.className="hg";root.lang="egy";root.dir="ltr";
 if(opts.size)root.style.setProperty("--hg-size",typeof opts.size==="number"?opts.size+"px":String(opts.size));
 root.setAttribute("role","img");
 root.setAttribute("aria-label",opts.label||"Jeroglíficos egipcios: "+strip(text));
 root.append(build(parse(text)));
 return root;
}
function strip(text){return [...String(text||"")].filter(c=>!isControl(c.codePointAt(0))).join("")}
function hasControls(text){return [...String(text||"")].some(c=>isControl(c.codePointAt(0)))}
window.HieroRender={render,parse,strip,hasControls};
})();
