/* Independent modern critical-edition transcriptions by canonical locus.
   Historical page facsimiles and legacy OCR remain untouched. */
(()=>{"use strict";
const edition=document.body?.dataset.edition;
const sources={
 "rose-1899":{path:"data/critical-editions/rose-1899-transcribed-loci.json",label:"Rose · 1899",origin:"Project Gutenberg n.º 51812 (edición Teubner de 1899)"},
 "krohn-1912":{path:"data/critical-editions/krohn-1912-tei-loci.json",label:"Krohn · 1912",origin:"PerseusDL TEI (edición Teubner de 1912)"}
};
if(!sources[edition])return;
const config=sources[edition],searchSection=document.querySelector(".edition-search"),main=document.querySelector("main");
if(!main)return;
const e=(tag,cls,value)=>{const item=document.createElement(tag);if(cls)item.className=cls;if(value!==undefined)item.textContent=value;return item};
const style=e("style");style.textContent=`
.vdl-latin-digital{margin:27px 0;padding:20px;border:1px solid #b5a994;background:var(--paper,#faf8f2);color:inherit}
.vdl-latin-digital h2{margin:0 0 10px;font:400 25px/1.35 Georgia,serif}
.vdl-latin-digital .vdl-latin-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin:14px 0}
.vdl-latin-tools input,.vdl-latin-tools button{font:14px system-ui;padding:9px;min-height:38px;border-radius:4px;border:1px solid #a89e91}
.vdl-latin-tools input{width:min(230px,60vw);background:var(--paper,#fff);color:inherit}
.vdl-latin-digital p.vdl-latin-source{font:12px/1.6 system-ui;opacity:.85}
.vdl-latin-digital .vdl-latin-text{font:17px/1.9 Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere;padding:14px 0}
.vdl-latin-digital .vdl-latin-results{max-height:270px;overflow:auto;border-top:1px solid #a99d89;margin-top:15px}
.vdl-latin-digital .vdl-latin-results a{display:block;padding:7px 3px;border-bottom:1px solid #d8d0c4;font:13px/1.45 system-ui}
`;
document.head.append(style);
const section=e("section","vdl-latin-digital");
section.id="vdl-latin-digital";
const heading=e("h2",undefined,"Texto latino digital independiente · "+config.label);
const intro=e("p","vdl-latin-source",config.origin+" · Transcripción digital indexada por locus; cotejo visual completo con el impreso pendiente. No es OCR ni lectura diplomática del manuscrito.");
const bar=e("form","vdl-latin-tools");
bar.setAttribute("role","search");
const locus=e("input");locus.type="text";locus.placeholder="Locus: 1.1.1";locus.setAttribute("aria-label","Locus canónico");
const go=e("button",undefined,"Ir al locus");go.type="submit";
const prev=e("button",undefined,"← Anterior");prev.type="button";
const next=e("button",undefined,"Siguiente →");next.type="button";
const query=e("input");query.type="search";query.placeholder="Buscar latín: symmetria";query.setAttribute("aria-label","Buscar palabra o frase en la transcripción latina");
const find=e("button",undefined,"Buscar en la edición");find.type="button";
bar.append(locus,go,prev,next,query,find);
const status=e("p","vdl-latin-source","Cargando transcripción...");
status.setAttribute("role","status");
const textBox=e("div","vdl-latin-text");textBox.lang="la";
const links=e("p","vdl-latin-source");
const apparatus=e("a",undefined,"Abrir tres visores sincronizados");
apparatus.href="apparatus-bude.html?locus=1.1.1&edition=v514&translation=es";
links.append(apparatus);
const results=e("div","vdl-latin-results");
section.append(heading,intro,bar,status,textBox,links,results);
if(searchSection)searchSection.before(section);else main.append(section);
let passages=[],position=-1;
const fold=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/j/g,"i").replace(/v/g,"u");
const targetHref=(l,term)=>{
 const u=new URL(location.href);u.searchParams.set("locus",l);u.searchParams.delete("q");if(term)u.searchParams.set("latin_query",term);else u.searchParams.delete("latin_query");return u.pathname+u.search+u.hash;
};
function show(i){
 if(i<0||i>=passages.length)return;
 position=i;
 const p=passages[i];locus.value=p.locus;status.textContent="Vitr. "+p.locus+" · "+(i+1)+"/"+passages.length+" · "+(p.status==="alignment_needs_editorial_review"?"Alineación automática del locus por comprobar con el impreso":"Texto digital · cotejo completo con facsímil pendiente");
 textBox.textContent=p.latin;
 apparatus.href="apparatus-bude.html?locus="+encodeURIComponent(p.locus)+"&edition=v514&translation=es";
 prev.disabled=i===0;next.disabled=i===passages.length-1;
}
function move(i){if(i<0||i>=passages.length)return;location.assign(targetHref(passages[i].locus,query.value.trim()))}
function findLatin(){
 const term=query.value.trim();results.replaceChildren();if(!term){status.textContent="Ingresá un término o frase en latín.";return}
 let hits=0;for(const p of passages){
  if(!fold(p.latin).includes(fold(term)))continue;
  hits++;
  if(hits<=70){
   const a=e("a",undefined,"Vitr. "+p.locus+" · "+p.latin.slice(0,165)+(p.latin.length>165?"…":""));
   a.href=targetHref(p.locus,term);results.append(a);
  }
 }
 status.textContent=hits+" loci contienen «"+term+"»"+(hits>70?" · mostrando los primeros 70":"")+". Búsqueda en la transcripción digital de "+config.label+".";
}
bar.addEventListener("submit",ev=>{ev.preventDefault();let v=locus.value.trim().replace(/^[IVX]+\./i,m=>{let t=m.slice(0,-1).toUpperCase(),n=0;for(const x of t)n+=x==="I"?1:x==="V"?5:10;return n+"."});const i=passages.findIndex(p=>p.locus===v);if(i<0){status.textContent="Locus no registrado: "+v;return;}move(i)});
prev.addEventListener("click",()=>move(position-1));next.addEventListener("click",()=>move(position+1));
find.addEventListener("click",findLatin);query.addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();findLatin()}});
(async()=>{try{
 const r=await fetch(config.path,{headers:{Accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);
 const data=await r.json();if(data.edition!==edition||!Array.isArray(data.passages)||data.passages.length!==731||new Set(data.passages.map(p=>p.locus)).size!==731)throw Error("Índice de 731 loci incompleto");
 passages=data.passages;
 const requested=new URLSearchParams(location.search).get("locus")||"1.1.1";
 const i=passages.findIndex(p=>p.locus===requested);show(i>=0?i:0);
 query.value=new URLSearchParams(location.search).get("latin_query")||"";
 if(query.value)findLatin();
}catch(error){status.textContent="Transcripción digital no disponible: "+error.message+". El facsímil y el OCR original siguen disponibles.";}})();
})();
