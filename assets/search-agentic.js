/* Vitruvia academic-library retriever. All requests are same-origin on GitHub Pages.
 * It does not pretend to provide embeddings, AI synthesis, verified folio labels,
 * or OCR of image-only PDFs. It searches real published source texts.
 */
(()=>{"use strict";
const BASE="./";
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}.]+/gu," ").trim();
const stop=new Set("de del la el los las un una y o en con para por sobre the of and for in le les des du".split(" "));
const dictionary={
 dios:["dios","dioses","deus","numen","divinus","divina","divinidad","god","divine","deorum"],
 simetria:["simetria","symmetria","proportio","proportion","modulus"],
 pitagoras:["pitagoras","pythagoras","pythagorei","pythagorean"],
 ciceron:["ciceron","cicero","ciceronis","ciceronem","cicerone"],
 arquitectura:["arquitectura","architectura","architecture","aedificatio"],
 templo:["templo","templum","templi","aedes","temple"]
};
const terms=q=>{const raw=normalize(q).split(" ").filter(x=>x.length>2&&!stop.has(x));return raw.length===1&&dictionary[raw[0]]?dictionary[raw[0]]:raw};
const containsWord=(text,word)=>{const hay=" "+normalize(text)+" ";return hay.includes(" "+normalize(word)+" ")};
const relevant=(text,tt)=>tt.reduce((n,t)=>n+(containsWord(text,t)?1:0),0);
const get=async(url)=>{const response=await fetch(url,{headers:{Accept:"application/json"}});if(!response.ok)throw Error(url+" HTTP "+response.status);return response.json()};
let chunkPromise=null,bibPromise=null;
async function chunks(){
 if(!chunkPromise)chunkPromise=get(BASE+"data/vitruvius-chunks.json").then(v=>v.chunks||v).catch(async()=>{
  const files=["recensio-es","recensio-fr","theory-en"];
  const outcomes=await Promise.allSettled(files.map(f=>get(BASE+"data/structured/"+f+".json")));
  return outcomes.filter(x=>x.status==="fulfilled").flatMap(x=>{
   const d=x.value;return(d.passages||[]).map(p=>({id:d.edition+"-"+p.locus,locus:p.locus,edicion:d.version,language:d.language,texto:p.latin,traduccion:p.translation,pagina_pdf:p.pdf_pages?.translation,lector:"lector-bilingue.html?edition="+encodeURIComponent(d.edition)+"&locus="+encodeURIComponent(p.locus)}));
  });
 });
 return chunkPromise;
}
async function bibliography(){
 if(!bibPromise)bibPromise=get(BASE+"bibliografia.json").then(v=>v.entries||v).catch(()=>[]);
 return bibPromise;
}
function canonical(q){return normalize(q).replace(/^biografia de |^vida de |^quien fue /,"")}
async function search(q){
 const query=canonical(q),tt=terms(query);
 const [cs,bs]=await Promise.all([chunks(),bibliography()]);
 const locus=/^(?:[ivx]+|\d{1,2})\.\d{1,2}\.\d{1,2}$/i.test(query);
 const detected=cs.map(c=>{
  const corpus=(c.texto||"")+" "+(c.traduccion||"");
  const exact=containsWord(corpus,query);
  const score=locus?Number(normalize(c.locus)===query)*100:(exact?85:relevant(corpus,tt)*8);
  return {c,score,exact};
 }).filter(h=>h.score>0).sort((a,b)=>b.score-a.score).slice(0,30);
 const passages=detected.map(({c,score,exact})=>({
  type:"passage",title:"De architectura · "+c.locus,author:(c.edicion||"Edición")+" · "+(c.language||""),
  latin:c.texto||"",translation:c.traduccion||"",locus:c.locus,
  excerpt:(c.traduccion||c.texto||"").slice(0,350),
  meta:"Fuente textual verificada · "+(c.pagina_pdf?"p. PDF "+c.pagina_pdf+" · ":"")+"locus "+c.locus,
  link:c.lector||"lector-bilingue.html",edition:c.edicion,
  rating:score,source:"Corpus textual",
  exactTextMatch:exact
 }));
 const bibliographyRows=bs.map(entry=>{
  const text=[entry.titulo,entry.autor,entry.signatura,entry.descripcion,entry.contenido,entry.biblioteca,entry.sigla].filter(Boolean).join(" ");
  const score=relevant(text,tt);
  if(score<1)return null;
  const manuscript=entry.tipo==="manuscrito",scholar=/estudio|critica|catalogo/.test(entry.tipo||"");
  const link=entry.local_url||entry.digital||entry.iiif_manifest||entry.iiif||"";
  if(!/^(https:\/\/|[a-z0-9/_-]+\.html)/i.test(link))return null;
  return {
   type:manuscript?"manuscript":scholar?"article":"edition",
   title:entry.titulo||entry.signatura||entry.id,
   author:entry.autor||entry.biblioteca||"",
   excerpt:entry.descripcion||entry.contenido||"",
   meta:[entry.fecha,entry.lugar,entry.biblioteca,entry.sigla].filter(Boolean).join(" · "),
   link,rating:score*15+(entry.prioridad===1?8:0),
   source:"Bibliografía Vitruviana",
   year:entry.fecha||"",recordKind:entry.tipo
  };
 }).filter(Boolean).sort((a,b)=>b.rating-a.rating).slice(0,25);
 return {rows:[...passages,...bibliographyRows],stats:{chunks:cs.length,bibliography:bs.length,passages:passages.length,exact:detected.filter(h=>h.exact).length}};
}
window.VitruviaAgentic={search,version:"1.0-indexed-text"};
})();