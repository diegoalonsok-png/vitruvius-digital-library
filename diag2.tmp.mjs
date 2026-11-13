import {JSDOM} from "jsdom";
import fs from "node:fs";
const html=fs.readFileSync("vitruvia-lexicon.html","utf8");
const scripts=["assets/vitruvia-philology.js","assets/classics-lexical-index.js","assets/classics-corpus-search.js","assets/vitruvia-lexicon.js","assets/lexicon-classics-bridge.js"];
async function probar(busqueda){
 const dom=new JSDOM(html,{runScripts:"outside-only",url:"https://vitruvius-digital-library.org/vitruvia-lexicon"+busqueda,pretendToBeVisual:true});
 const w=dom.window;
 w.Element.prototype.scrollIntoView=function(){};
 w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 w.fetch=async u=>{const r=String(u).replace(/^https?:\/\/[^/]+\//,"").split("?")[0];
  return fs.existsSync(r)?{ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(r,"utf8")),text:async()=>fs.readFileSync(r,"utf8")}
   :{ok:false,status:404,json:async()=>({}),text:async()=>""}};
 for(const f of scripts){try{w.eval(fs.readFileSync(f,"utf8"))}catch(e){console.log(" eval",f,e.message)}}
 w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
 await new Promise(r=>setTimeout(r,2500));
 const res=w.document.getElementById("lx-results");
 const txt=(res?res.textContent:"").replace(/\s+/g," ").trim();
 console.log(`${busqueda}\n  #lx-q = "${w.document.getElementById("lx-q").value}"\n  #lx-results: ${txt? txt.slice(0,140) : "(VACÍO)"}\n`);
 w.close();
}
await probar("?q=symmetria&mode=palabra");
await probar("?q=syemmetria&mode=palabra");
