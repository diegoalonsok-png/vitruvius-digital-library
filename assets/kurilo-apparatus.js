/* Aparato crítico y notas de las ediciones de Diego Kurilo (V514 · V554 · V297).
   Índice estático: data/apparatus-index.json (scripts/build-apparatus-index.py).
   Uso compartido por el buscador del front, Vitruvia, el lector y aparato-critico.html.
   Un vínculo con el locus se declara siempre con su grado: locus explícito en el rótulo,
   contexto de la página impresa o locus candidato sin verificar. */
(()=>{
"use strict";
const URL_INDEX="data/apparatus-index.json?v=20261105-loci-v2";
const EDITION_LABEL={"recensio-es":"V514 · castellano","recensio-fr":"V554 · français","theory-en":"V297 · English"};
const KIND={es:{comparativa:"Aparato crítico comparativo",filologica:"Nota ecdótica / crítica",tecnica:"Nota técnica y terminológica",comentario:"Comentario",nota:"Nota al pie"},
 en:{comparativa:"Comparative critical apparatus",filologica:"Critical / textual note",tecnica:"Technical note",comentario:"Commentary",nota:"Footnote"},
 fr:{comparativa:"Apparat critique comparatif",filologica:"Note critique / ecdotique",tecnica:"Note technique",comentario:"Commentaire",nota:"Note"}};
const STOP=new Set("aparato critico critica apparatus apparat critique critical nota notas note notes ecdotica de la el los las del en y a que se un una por con para su sus al lo como es o the of and to in a is for on by with as an le les des du et un une dans pour par sur au aux est qui que ne pas".split(" "));
const fold=s=>String(s??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
let promise=null;
function load(){if(!promise)promise=(window.VitruviaData?window.VitruviaData.json(URL_INDEX):fetch(URL_INDEX).then(r=>{if(!r.ok)throw Error("Aparato: HTTP "+r.status);return r.json()})).then(d=>{
 for(const e of d.entries){e._hay=fold([e.label,e.text,e.anchor,(e.references||[]).join(" ")].join(" "));e._loci=new Set([e.locusMention,...(e.loci||[])].filter(Boolean))}
 return d}).catch(e=>{promise=null;throw e});return promise}
const roman=n=>["","I","II","III","IV","V","VI","VII","VIII","IX","X"][n]||String(n);
const cite=l=>{if(!l)return"";const [b,...r]=String(l).split(".");return "Vitr. "+roman(+b)+"."+r.join(".").replace(/^praef\./,"praef. ")};
/* Grado del vínculo de una entrada con un locus pedido. */
function relation(e,locus){
 if(!locus)return null;
 const m=e.locusMention;
 if(m&&(m===locus||locus.startsWith(m+".")))return e.source==="nota"?(e.locusLink==="locus explícito"?"explicit":"candidate"):e.locusInHeading?"explicit":"page";
 if((e.loci||[]).includes(locus))return e.source==="nota"?(e.locusLink==="locus explícito"?"explicit":"candidate"):"page";
 return null
}
const RANK={explicit:3,page:2,candidate:1};
/* Entradas de un locus, mejor vínculo primero; edición del idioma pedido antes. */
async function forLocus(locus,{lang="es",limit=12}={}){
 const d=await load(),pref={es:"recensio-es",fr:"recensio-fr",en:"theory-en"}[lang]||"recensio-es";
 return d.entries.map(e=>({e,rel:relation(e,locus)})).filter(x=>x.rel)
  .sort((a,b)=>RANK[b.rel]-RANK[a.rel]||(b.e.edition===pref)-(a.e.edition===pref)||(a.e.source==="nota")-(b.e.source==="nota"))
  .slice(0,limit).map(x=>Object.assign({},x.e,{relation:x.rel}))
}
function terms(q){return fold(q).split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>2&&!STOP.has(t))}
/* Búsqueda léxica (o por locus si la consulta lo contiene). */
async function search(q,{lang="es",limit=8,locus=null}={}){
 const d=await load();
 locus=locus||(window.CodexQuery&&window.CodexQuery.locus(q))||null;
 if(locus){const hits=await forLocus(locus,{lang,limit});if(hits.length)return hits}
 const ts=terms(q);if(!ts.length)return [];
 const phrase=fold(q).trim(),pref={es:"recensio-es",fr:"recensio-fr",en:"theory-en"}[lang]||"recensio-es";
 const scored=[];
 for(const e of d.entries){
  let hit=0;const words=new Set(e._hay.match(/[\p{L}\p{N}]+/gu)||[]);for(const t of ts)if(words.has(t))hit++;
  if(hit<ts.length&&!(ts.length>2&&hit>=ts.length-1))continue;
  let s=hit*10+(ts.length&&ts.every(t=>words.has(t))?25:0)+(e.edition===pref?6:0)+(e.source==="bloque"?5:0)+(e.locusMention?3:0);
  scored.push({e,s})
 }
 return scored.sort((a,b)=>b.s-a.s).slice(0,limit).map(x=>Object.assign({},x.e,{relation:locus?null:"lexical"}))
}
function excerpt(text,q,len=420){
 const raw=String(text||"");const f=fold(raw);let at=-1;
 for(const t of [fold(q).trim(),...terms(q)]){if(!t)continue;at=f.indexOf(t);if(at>=0)break}
 if(at<0)return raw.slice(0,len)+(raw.length>len?"…":"");
 const a=Math.max(0,at-140),b=Math.min(raw.length,a+len);return (a?"… ":"")+raw.slice(a,b)+(b<raw.length?"…":"")
}
function relationLabel(rel,lang="es"){
 const L={es:{explicit:"Locus explícito en el rótulo",page:"Misma página impresa del locus",candidate:"Locus candidato, sin verificar",lexical:"Coincidencia en el texto del aparato"},
  en:{explicit:"Locus stated in the heading",page:"Same printed page as the locus",candidate:"Candidate locus, unverified",lexical:"Match in the apparatus text"},
  fr:{explicit:"Locus explicite dans la rubrique",page:"Même page imprimée que le locus",candidate:"Locus candidat, non vérifié",lexical:"Correspondance dans l’apparat"}};
 return (L[lang]||L.es)[rel]||""
}
const reader=e=>{const m=e.locusMention,full=/^\d+\.(?:praef\.)?\d+\.\d+$|^\d+\.praef\.\d+$/;
 const l=m&&full.test(m)?m:m?((e.loci||[]).find(x=>x.startsWith(m+"."))||m+".1"):(e.loci||[])[0];
 return l?"lector-bilingue.html?edition="+encodeURIComponent(e.edition)+"&locus="+encodeURIComponent(l):null};
/* Filas con el formato de resultados de Vitruvia. */
function toRow(e,q,lang="es"){
 const kind=(KIND[lang]||KIND.es)[e.kind]||e.label;
 const block=e.page?String(e.id).split("-").pop():"";const where=e.page?"PDF p. "+e.page+(block&&block!=="1"?" ("+block+")":""):"nota "+String(e.id).split("-n").pop();
 const loc=e.locusMention?cite(e.locusMention):(e.loci||[]).length?cite(e.loci[0])+((e.loci.length>1)?"–"+String(e.loci.at(-1)).split(".").pop():""):"";
 const links=[{label:lang==="en"?"Printed page (PDF)":lang==="fr"?"Page imprimée (PDF)":"Página impresa (PDF)",url:e.pdf},
  {label:lang==="en"?"Full apparatus catalogue":lang==="fr"?"Catalogue de l’apparat":"Catálogo del aparato",url:"aparato-critico.html?q="+encodeURIComponent(e.locusMention||q)}];
 const sec=!loc&&e.section?" · "+(lang==="en"?(e.section==="introducción"?"introduction":"appendices"):lang==="fr"?(e.section==="introducción"?"introduction":"annexes"):e.section):"";
 return {type:"apparatus",title:kind+(loc?" · "+loc:"")+sec+" · "+e.version+" · "+where,
  author:"Diego Kurilo · "+(EDITION_LABEL[e.edition]||e.version)+" · "+e.label,
  excerpt:excerpt(e.text,q),meta:relationLabel(e.relation,lang)+(e.references?.length?" · cita: "+e.references.join(", "):""),
  rating:e.relation==="explicit"?2300:e.relation==="page"?1500:e.relation==="candidate"?600:300,
  link:reader(e)||e.pdf,links,source:"Aparato crítico · ediciones Kurilo",edition:e.edition,locus:e.locusMention||null,apparatusId:e.id}
}
window.KuriloApparatus={load,forLocus,search,excerpt,toRow,cite,relationLabel,kindLabel:(k,l)=>(KIND[l]||KIND.es)[k]||k,version:"1.0"};
})();

