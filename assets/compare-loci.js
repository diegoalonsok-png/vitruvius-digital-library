(()=>{
const ids=[['recensio-es','Edición española'],['recensio-fr','Édition française'],['theory-en','English edition']];
const form=document.getElementById('compare-form'),field=document.getElementById('compare-locus'),status=document.getElementById('compare-status'),results=document.getElementById('compare-results');
const load=Promise.all(ids.map(async ([id,label])=>{const r=await fetch('data/structured/'+id+'.json');if(!r.ok)throw Error('No se pudo cargar '+label);const data=await r.json();return{id,label,passages:data.passages}}));
function norm(s){return String(s||'').trim().replace(/^([IVX]+)\./i,(m,x)=>[...x.toUpperCase()].reduce((a,c,i,arr)=>a+({I:1,V:5,X:10}[c]<({I:1,V:5,X:10}[arr[i+1]]||0)?-{I:1,V:5,X:10}[c]:{I:1,V:5,X:10}[c]),0)+'.').toLowerCase();}
let record={};
const catalogLoad=fetch('data/catalog.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Catálogo bibliográfico inaccesible');return r.json()}).then(c=>{
 record=Object.fromEntries(ids.map(([id])=>[id,(c.editions||[]).find(e=>e.id===id)]));
 if(ids.some(([id])=>!record[id]))throw Error('Metadatos editoriales incompletos');
});
const roman=n=>{let v=Number(n);return v>0&&v<=10?["","I","II","III","IV","V","VI","VII","VIII","IX","X"][v]:String(n)};
function formats(id,locus){
 const b=record[id];if(!b)return null;
 const author=b.bibliographic_author||b.author||'Kurilo, Diego',title=b.bibliographic_title||b.title;
 const place=b.publication_place||'Lugar no consignado',publisher=b.publisher||'Editorial no consignada';
 const edition=b.edition_statement||'',year=b.year||'s. f.',doi=b.doi||'',isbn=b.isbn||'';
 const cited='Vitr., De arch. '+locus.replace(/^([0-9]+)\./,(_,n)=>roman(n)+'.');
 const url=new URL(location.href);url.searchParams.set('locus',locus);
 const note=b.isbn_status==='publisher-declared-shared'?'ISBN común declarado por la editorial; asignación individual pendiente de verificación.':'';
 const chicago=author+'. '+title+'. '+edition+'. '+place+': '+publisher+', '+year+'. '+(doi?'https://doi.org/'+doi+'. ':'')+cited+'. '+url.href+(isbn?' ISBN editorial declarado: '+isbn+'.':'')+(note?' '+note:'');
 const mla=author+'. '+title+'. '+edition+', '+publisher+', '+year+'. '+cited+'. '+(doi?'doi:'+doi+'. ':'')+(isbn?'ISBN editorial declarado: '+isbn+'.':'');
 const key='Kurilo'+String(year)+String(b.version||id).replace(/[^a-z0-9]/gi,'');
 const verifiedIsbn=isbn&&b.isbn_status!=='publisher-declared-shared'?isbn:'';
 const bibtex='@book{'+key+',\n  author = {'+author+'},\n  title = {'+title+'},\n  publisher = {'+publisher+'},\n  address = {'+place+'},\n  year = {'+year+'},\n  doi = {'+doi+'},'+(verifiedIsbn?'\n  isbn = {'+verifiedIsbn+'},':'')+'\n  note = {'+cited+(isbn?'; ISBN editorial declarado: '+isbn:'')+(note?'; '+note:'')+'}\n}';
 const ris='TY  - BOOK\nAU  - '+author+'\nTI  - '+title+'\nCY  - '+place+'\nPB  - '+publisher+'\nPY  - '+year+'\nDO  - '+doi+(verifiedIsbn?'\nSN  - '+verifiedIsbn:'')+'\nN1  - '+cited+(isbn?'; ISBN editorial declarado: '+isbn:'')+(note?'; '+note:'')+'\nER  - ';
 return {chicago,mla,bibtex,ris};
}
function citationTools(section,id,locus){
 const variants=formats(id,locus);if(!variants)return;
 const wrap=document.createElement("div");wrap.className="compare-citation-actions";wrap.style.cssText="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px";
 for(const [key,name] of Object.entries({chicago:"Chicago",mla:"MLA",bibtex:"BibTeX",ris:"RIS"})){
  const b=document.createElement("button");b.type="button";b.textContent="Copiar "+name;
  b.style.cssText="font:12px system-ui;padding:5px 8px;background:transparent;color:inherit;border:1px solid #a99e88;cursor:pointer";
  b.onclick=async()=>{try{await navigator.clipboard.writeText(variants[key]);b.textContent="Copiado ✓"}catch{const t=document.createElement("textarea");t.value=variants[key];section.append(t);t.select();document.execCommand("copy");t.remove();b.textContent="Copia realizada"}};
  wrap.append(b);
 }
 section.append(wrap);
}
function panel(heading,body,href,editionId,locus){const section=document.createElement('article');section.className='compare-panel';const h=document.createElement('h2');h.textContent=heading;const p=document.createElement('p');p.textContent=body||'Pasaje no disponible en esta edición.';section.append(h,p);if(href){const a=document.createElement('a');a.href=href;a.textContent='Leer en la edición →';section.append(a)}if(editionId&&locus){
 const b=record[editionId];
 if(b){
  const meta=document.createElement('div');meta.className='compare-panel-editorial';meta.style.cssText='font:11px/1.5 system-ui;margin:10px 0;padding:8px 0;border-top:1px solid #9996;overflow-wrap:anywhere';
  const author=document.createElement('strong');author.textContent='Diego Kurilo · Arquitecto · '+(b.editorial_role||'edición editorial');meta.append(author);
  meta.append(document.createTextNode(' · '+(b.publication_place||'Buenos Aires')+': '+(b.publisher||'')+', '+(b.year||'')+' · '));
  if(b.doi){const link=document.createElement('a');link.href='https://doi.org/'+b.doi;link.textContent='DOI '+b.doi;link.rel='noopener noreferrer';meta.append(link)}
  if(b.isbn)meta.append(document.createTextNode(' · ISBN editorial '+b.isbn+(b.isbn_status==='publisher-declared-shared'?' (compartido, por verificar individualmente)':'')));
  section.append(meta);
 }
 citationTools(section,editionId,locus);
}results.append(section);}
function updateSourceLinks(locus){
 const map=[['compare-colacion','colacion.html?locus='],['compare-bude','apparatus-bude.html?locus='],['compare-registro','registro-ecdotico.html?locus=']];
 for(const [id,prefix] of map){const el=document.getElementById(id);if(el)el.href=prefix+encodeURIComponent(locus);}
}
async function show(){results.replaceChildren();status.textContent='Consultando las ediciones…';const locus=norm(field.value);updateSourceLinks(locus);try{const [editions]=await Promise.all([load,catalogLoad]);let found=false;const latin=editions[0].passages.find(p=>p.locus.toLowerCase()===locus);if(latin){panel('Texto latino · '+locus,latin.latin,'lector-bilingue.html?edition=recensio-es&locus='+encodeURIComponent(locus));found=true;}for(const edition of editions){const p=edition.passages.find(x=>x.locus.toLowerCase()===locus);if(p){panel((record[edition.id]?.bibliographic_title||edition.label)+' · '+(record[edition.id]?.version||''),p.translation,'lector-bilingue.html?edition='+edition.id+'&locus='+encodeURIComponent(locus),edition.id,locus);found=true;}}status.textContent=found?'Textos alineados por '+locus+'.':'No hay textos indexados para «'+field.value+'». Revisa el locus.';history.replaceState(null,'','?locus='+encodeURIComponent(locus));}catch(e){status.textContent='No se pudieron cargar los índices: '+e.message;}}
async function populateLoci(){
 try{
  const editions=await load;
  const canonical=new Set(editions.flatMap(e=>e.passages.map(p=>norm(p.locus)).filter(Boolean)));
  const sortKey=l=>l.split(".").map((part,i)=>part==="praef"||part==="pr"?-1:Number(part)||0);
  const compare=(a,b)=>{const x=sortKey(a),y=sortKey(b);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]??0)-(y[i]??0);if(d)return d}return a.localeCompare(b)};
  const loci=[...canonical].sort(compare);
  const requested=norm(new URLSearchParams(location.search).get("locus")||field.value||"3.1.1");
  field.replaceChildren();
  let currentBook="";
  let group;
  for(const locus of loci){
   const book=locus.split(".")[0];
   if(book!==currentBook){currentBook=book;group=document.createElement("optgroup");group.label="Libro "+roman(book);field.append(group)}
   const option=document.createElement("option");option.value=locus;option.textContent=locus.replace(/^([0-9]+)\./,(_,n)=>roman(n)+".");
   group.append(option);
  }
  field.value=canonical.has(requested)?requested:(canonical.has("3.1.1")?"3.1.1":loci[0]||"");
  field.disabled=!loci.length;
  field.setAttribute("aria-label","Elegir locus de De architectura · "+loci.length+" loci disponibles");
  if(loci.length!==731)status.textContent="Índice de loci parcialmente disponible: "+loci.length+" registros. Se muestran únicamente los loci cargados.";
  await show();
 }catch(e){status.textContent="No se pudieron cargar los loci: "+e.message}
}
form.addEventListener('submit',e=>{e.preventDefault();show()});
field.addEventListener('change',()=>{void show()});
void populateLoci();
})();