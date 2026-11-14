/* Bibliotheca home work-title and author lookup.
 * Indexes catalogued works, not book contents. Aliases are search aids only.
 */
(()=>{"use strict";
const path="data/classics-corpus/title-search-aliases-multilingual.json";
const lang={la:"latín",grc:"griego",es:"castellano",en:"inglés",fr:"francés",it:"italiano",de:"alemán",pt:"portugués"};
const greek={α:"a",β:"b",γ:"g",δ:"d",ε:"e",ζ:"z",η:"e",θ:"th",ι:"i",κ:"k",λ:"l",μ:"m",ν:"n",ξ:"x",ο:"o",π:"p",ρ:"r",σ:"s",τ:"t",υ:"y",φ:"ph",χ:"ch",ψ:"ps",ω:"o"};
const normal=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f\u1dc0-\u1dff]/g,"").toLowerCase().replace(/ς/g,"σ").replace(/æ/g,"ae").replace(/œ/g,"oe").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const roman=s=>normal(s).replace(/[α-ω]/g,c=>greek[c]||c);
const make=(tag,text,cls)=>{
 const el=document.createElement(tag);if(text!=null)el.textContent=String(text);if(cls)el.className=cls;return el;
};
const safeReader=s=>typeof s==="string"&&(
 /^(?:classics-text-reader|lector-bilingue|classics-parallel-reader|classics-remote-[a-z-]+-reader)\.html\?[\w.%=&+-]+$/.test(s)||
 /^corpus\/[a-z0-9/_-]+\.html$/i.test(s))?s:null;
const workLink=id=>"classics-work-record.html?work="+encodeURIComponent(id);
const facLink=id=>"buscador-facsimiles-clasicos.html?obra="+encodeURIComponent(id);
let model=null,loadedAliases={};
function rank(w,query){
 const qs=[normal(query),roman(query)],fields=w.forms||[];
 let best=0;
 for(const field of fields){
  for(const txt of [normal(field),roman(field)]){
   if(!txt)continue;
   for(const q of qs){
    if(!q)continue;
    if(txt===q)best=Math.max(best,130);
    else if(txt.startsWith(q+" "))best=Math.max(best,112);
    else if(txt.includes(q))best=Math.max(best,89);
    else if(q.includes(" ")&&q.split(" ").every(token=>txt.includes(token)))best=Math.max(best,73);
   }
  }
 }
 const a=normal(w.author);
 for(const q of qs){
  if(a===q)best=Math.max(best,94);
  else if(a.startsWith(q))best=Math.max(best,72);
  else if(a.includes(q))best=Math.max(best,62);
 }
 return best;
}
function addLink(parent,text,href){
 if(!href)return;
 const a=make("a",text);a.href=href;parent.append(a);
}
function render(){
 if(!model)return;
 const {input,list,count,more,items,limit}=model,q=input.value.trim();
 list.replaceChildren();more.hidden=true;
 if(!q){model.region.hidden=true;return}
 model.region.hidden=false;
 if(normal(q).length<2){count.textContent="Escriba al menos dos caracteres.";return}
 const found=items.map(w=>({w,rank:rank(w,q)})).filter(r=>r.rank>0)
  .sort((a,b)=>b.rank-a.rank||a.w.title.localeCompare(b.w.title,"es",{sensitivity:"base"}));
 count.textContent=found.length+" "+(found.length===1?"obra encontrada":"obras encontradas")+
  " por título o autor. Las equivalencias lingüísticas son claves de búsqueda, no traducciones alojadas.";
 if(!found.length){list.append(make("li","No se encontraron obras con ese título o autor. Pruebe otra grafía o denominación.","bws-empty"));return}
 for(const {w} of found.slice(0,limit)){
  const item=make("li",null,"bws-item");
  const heading=make("div",null,"bws-heading");
  heading.append(make("strong",w.title),make("span"," · "+w.author));item.append(heading);
  const meta=make("p",null,"bws-meta");
  const langs=w.versions.filter(v=>safeReader(v.reader)).map(v=>lang[v.language]||v.language);
  const avail=[...new Set(langs)];
  meta.textContent=(w.dating?w.dating+" · ":"")+
   (avail.length?"Textos con acceso: "+avail.join(", "):w.facsimile?"Facsímil localizado; OCR no cotejado":"Ficha catalográfica; texto no disponible en este índice");
  item.append(meta);
  const actions=make("nav",null,"bws-actions");actions.setAttribute("aria-label","Acciones de "+w.title);
  const original=w.versions.find(v=>["la","grc"].includes(v.language)&&safeReader(v.reader));
  const translation=w.versions.find(v=>!["la","grc"].includes(v.language)&&safeReader(v.reader));
  if(original)addLink(actions,"Leer original",safeReader(original.reader));
  if(translation)addLink(actions,"Leer traducción · "+(lang[translation.language]||translation.language),safeReader(translation.reader));
  if(w.facsimile)addLink(actions,"Ver facsímil",facLink(w.facsimile));
  if(!w.newWork)addLink(actions,"Ficha académica",workLink(w.id));
  item.append(actions);list.append(item);
 }
 if(found.length>limit){more.hidden=false;more.textContent="Mostrar más ("+(found.length-limit)+" restantes)"}
}
function mount(parent,data){
 if(model||!parent||!Array.isArray(data?.road?.items)||!Array.isArray(data?.registry?.entries))return;
 const index=new Map();
 for(const w of data.road.items)index.set(w.id,{
  id:w.id,title:w.title,author:w.author,dating:w.dating||"",forms:[w.title,w.id.replaceAll("-"," ")],
  versions:[],facsimile:null,newWork:false
 });
 for(const e of data.registry.entries){
  const w=index.get(e.workId);if(!w)continue;
  w.forms.push(e.title||"");if(safeReader(e.reader))w.versions.push(e);
 }
 const section=make("section",null,"bws");section.id="bibliotheca-work-search";
 section.setAttribute("aria-labelledby","bws-title");
 const title=make("h3","Buscar obras clásicas");title.id="bws-title";
 const subtitle=make("p","Encuentre obras por autor o título, en griego, latín, castellano, inglés o francés. Búsqueda en el catálogo, no dentro de los pasajes.","bws-intro");
 const form=make("form");form.setAttribute("role","search");form.setAttribute("aria-label","Búsqueda de obras clásicas");
 const label=make("label","Obra o autor");label.htmlFor="bws-query";
 const row=make("div",null,"bws-row");
 const input=make("input");input.id="bws-query";input.type="search";input.autocomplete="off";input.spellcheck=false;
 input.placeholder="De architectura · Ἰλιάς · Iliad · La República · Énéide";
 input.setAttribute("aria-controls","bws-results");
 const submit=make("button","Buscar obra");submit.type="submit";
 row.append(input,submit);form.append(label,row);
 const region=make("div");region.hidden=true;
 const count=make("p",null,"bws-count");count.id="bws-count";count.setAttribute("role","status");count.setAttribute("aria-live","polite");
 const list=make("ol",null,"bws-results");list.id="bws-results";
 const more=make("button","Mostrar más obras","bws-more");more.type="button";more.hidden=true;
 region.append(count,list,more);
 const help=make("p",null,"bws-help");
 help.append("Para buscar palabras y pasajes dentro de las ediciones, consulte ");
 addLink(help,"Vitruvia","vitruvia.html");help.append(" o ");addLink(help,"Lexicon","vitruvia-lexicon.html");help.append(".");
 section.append(title,subtitle,form,region,help);
 const metric=parent.querySelector(":scope > dl");
 if(metric)metric.insertAdjacentElement("afterend",section);else parent.append(section);
 model={items:[...index.values()],index,input,list,count,more,region,limit:10};
 form.addEventListener("submit",e=>{e.preventDefault();model.limit=10;render()});
 input.addEventListener("input",()=>{model.limit=10;render()});
 more.addEventListener("click",()=>{model.limit+=10;render()});
 fetch(path,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("aliases unavailable");return r.json()}).then(j=>{
  loadedAliases=j.aliases||{};
  for(const [id,forms] of Object.entries(loadedAliases)){
   const w=index.get(id);if(w&&Array.isArray(forms))w.forms.push(...forms);
  }
  if(input.value.trim())render();
 }).catch(()=>{/* Original-language catalogue remains searchable. */});
}
function addFacsimiles(v,cat){
 if(!model||!Array.isArray(cat?.items))return;
 const byEdition=new Map(cat.items.map(e=>[e.id,e]));
 // R2 edition IDs need not match the ancient-work catalogue ID.
 // Use the existing audited work-to-edition concordance.
 for(const [workId,editions] of Object.entries(v?.porObra||{})){
  const w=model.index.get(workId);if(!w)continue;
  for(const ed of editions){
   const fac=byEdition.get(ed.r2);
   w.facsimile ||= ed.r2;
   w.forms.push(ed.edicion||"",fac?.obra||"",fac?.tituloEdicion||"");
  }
 }
 for(const e of cat.items){
  const w=model.index.get(e.id);
  if(w){w.facsimile ||= e.id;w.forms.push(e.obra||"",e.tituloEdicion||"");}
 }
 for(const entry of v?.obrasNuevas||[]){
  if(model.index.has(entry.r2))continue;
  const w={id:entry.r2,title:entry.obra,author:entry.autor,dating:"",forms:[entry.obra,entry.r2.replaceAll("-"," "),...(loadedAliases[entry.r2]||[])],
   versions:[],facsimile:entry.r2,newWork:true};
  model.index.set(w.id,w);model.items.push(w);
 }
 if(model.input.value.trim())render();
}
window.BibliothecaWorkSearch={mount,addFacsimiles};
})();