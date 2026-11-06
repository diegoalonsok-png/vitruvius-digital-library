(()=>{
const ids=[['recensio-es','V514 · castellano'],['recensio-fr','V554 · français'],['theory-en','V297 · English']];
const form=document.getElementById('compare-form'),field=document.getElementById('compare-locus'),status=document.getElementById('compare-status'),results=document.getElementById('compare-results');
const load=Promise.all(ids.map(async ([id,label])=>{const r=await fetch('data/structured/'+id+'.json');if(!r.ok)throw Error('No se pudo cargar '+label);const data=await r.json();return{id,label,passages:data.passages}}));
function norm(s){return String(s||'').trim().replace(/^([IVX]+)\./i,(m,x)=>[...x.toUpperCase()].reduce((a,c,i,arr)=>a+({I:1,V:5,X:10}[c]<({I:1,V:5,X:10}[arr[i+1]]||0)?-{I:1,V:5,X:10}[c]:{I:1,V:5,X:10}[c]),0)+'.').toLowerCase();}
const record={
 "recensio-es":{title:"Vitruvio. De architectura. Nueva recensio académica bilingüe",doi:"10.5281/zenodo.23884757",version:"V514"},
 "recensio-fr":{title:"Vitruve. De architectura. Nouvelle recensio académique bilingue",doi:"10.5281/zenodo.23885110",version:"V554"},
 "theory-en":{title:"The Architect of Theory: Vitruvius and the Intellectual World of Roman Antiquity",doi:"10.5281/zenodo.23885404",version:"V297"}
};
const roman=n=>{let v=Number(n);return v>0&&v<=10?["","I","II","III","IV","V","VI","VII","VIII","IX","X"][v]:String(n)};
function formats(id,locus){
 const data=record[id];if(!data)return null;
 const locusDisplay=locus.replace(/^([0-9]+)\./,(_,v)=>roman(v)+".");
 const url=new URL(location.href);url.searchParams.set("locus",locus);
 const cited="Vitr., De arch. "+locusDisplay;
 const chicago="Kurilo, Diego A. "+data.title+". Version "+data.version+" (2026). "+cited+". https://doi.org/"+data.doi+". Locus: "+url.href;
 const mla="Kurilo, Diego A. "+data.title+". Version "+data.version+", 2026. "+cited+", doi:"+data.doi+".";
 const key="Kurilo2026"+data.version.replace(/[^A-Za-z0-9]/g,"");
 const bibtex="@book{"+key+",\n  author = {Kurilo, Diego A.},\n  title = {"+data.title+"},\n  year = {2026},\n  note = {Version "+data.version+"; "+cited+"},\n  doi = {"+data.doi+"},\n  url = {https://doi.org/"+data.doi+"}\n}";
 const ris="TY  - BOOK\nAU  - Kurilo, Diego A.\nTI  - "+data.title+"\nPY  - 2026\nDO  - "+data.doi+"\nN1  - Version "+data.version+"; "+cited+"\nUR  - https://doi.org/"+data.doi+"\nER  - ";
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
function panel(heading,body,href,editionId,locus){const section=document.createElement('article');section.className='compare-panel';const h=document.createElement('h2');h.textContent=heading;const p=document.createElement('p');p.textContent=body||'Pasaje no disponible en esta edición.';section.append(h,p);if(href){const a=document.createElement('a');a.href=href;a.textContent='Leer en la edición →';section.append(a)}if(editionId&&locus)citationTools(section,editionId,locus);results.append(section);}
async function show(){results.replaceChildren();status.textContent='Consultando las ediciones…';const locus=norm(field.value);try{const editions=await load;let found=false;const latin=editions[0].passages.find(p=>p.locus.toLowerCase()===locus);if(latin){panel('Texto latino · '+locus,latin.latin,'lector-bilingue.html?edition=recensio-es&locus='+encodeURIComponent(locus));found=true;}for(const edition of editions){const p=edition.passages.find(x=>x.locus.toLowerCase()===locus);if(p){panel(edition.label,p.translation,'lector-bilingue.html?edition='+edition.id+'&locus='+encodeURIComponent(locus),edition.id,locus);found=true;}}status.textContent=found?'Textos alineados por '+locus+'.':'No hay textos indexados para «'+field.value+'». Revisa el locus.';history.replaceState(null,'','?locus='+encodeURIComponent(locus));}catch(e){status.textContent='No se pudieron cargar los índices: '+e.message;}}
form.addEventListener('submit',e=>{e.preventDefault();show()});const url=new URLSearchParams(location.search).get('locus');if(url)field.value=url;show();
})();