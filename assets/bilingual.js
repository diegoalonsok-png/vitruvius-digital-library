import {citation,roman,parseLocus,searchCorpus,tokens} from './search-core.mjs?v=20261030-docx-1';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const editionIds={es:'recensio-es',fr:'recensio-fr',en:'theory-en'},names={es:'Castellano',fr:'Français',en:'English'};
const datasets={},records={};
const atLocus=(p,locus)=>p.locus===locus||Boolean(p.section_end&&(()=>{const r=parseLocus(locus);return r&&p.book===r.book&&p.chapter===r.chapter&&r.section>=p.section&&r.section<=p.section_end;})());let all=[],current=null,query='',pendingLocus=null;
const params=new URLSearchParams(location.search);
if(params.has('edition'))$('lang').value=Object.keys(editionIds).find(k=>editionIds[k]===params.get('edition'))||'es';
query=params.get('q')||'';$('term').value=query;
function options(id,values,selected){$(id).replaceChildren(...values.map(([value,label])=>{const o=document.createElement('option');o.value=String(value);o.textContent=label;return o;}));if(values.some(([v])=>String(v)===String(selected)))$(id).value=String(selected);}
function refresh(book,chapter,section){
 options('book',Array.from({length:10},(_,i)=>[i+1,'Libro '+roman(i+1)]),book);
 const rows=all.filter(p=>p.book===Number($('book').value));const chapters=[...new Set(rows.map(p=>p.chapter))].sort((a,b)=>(a==='praef'?-1:Number(a))-(b==='praef'?-1:Number(b)));
 options('chapter',chapters.map(c=>[c,c==='praef'?'Prólogo':'Capítulo '+c]),chapter);
 const sections=[...new Set(rows.filter(p=>String(p.chapter)===$('chapter').value).map(p=>p.section))].sort((a,b)=>a-b);
 options('section',sections.map(n=>[n,'Sección '+n]),section);
}
function highlight(text){
 const wanted=new Set(tokens(query).map(t=>t.value));if(!wanted.size)return esc(text);
 let html='',at=0;for(const t of tokens(text)){if(!wanted.has(t.value))continue;html+=esc(text.slice(at,t.start))+'<mark>'+esc(text.slice(t.start,t.end))+'</mark>';at=t.end;}return html+esc(text.slice(at));
}
function clearReading(message){
 for(const id of ['latin-text','translation-text','latin-title','latin-source','translation-source','passage-ref','pdf-links','provenance-text'])$(id).replaceChildren();$('other-translations').replaceChildren();$('status').textContent=message;current=null;$('prev').disabled=$('next').disabled=true;
}
function render(){
 const locus=[$('book').value,$('chapter').value,$('section').value].join('.'),lang=$('lang').value,data=datasets[editionIds[lang]],p=data?.passages.find(p=>atLocus(p,locus));
 const base=all.find(p=>atLocus(p,locus));current=base||null;
 if(!base){clearReading('Referencia no encontrada: '+locus+'. Revisá el libro, capítulo y sección.');return;}
 $('locus').value=roman(base.book)+'.'+base.chapter+'.'+base.section;$('passage-ref').textContent=citation(base);
 $('translation-title').textContent=names[lang];$('translation-source').textContent='Diego Kurilo · '+(data?.version||lang);
 $('latin-title').textContent=citation(p||base);$('latin-source').textContent='Texto latino de la edición '+(p?data.version:'V514')+' · Diego Kurilo';
 $('latin-text').innerHTML=highlight(p?.latin||base.latin);$('translation-text').lang=lang;
 $('translation-text').innerHTML=p?highlight(p.translation):'<p>Este locus todavía no tiene traducción inglesa alineada en el índice. Podés consultar el castellano y el francés en el selector de traducción.</p>';
 $('status').textContent=p?citation(p)+' · latín y traducción vinculados por la estructura del DOCX.'+(p.scope_note?' '+p.scope_note:''):citation(base)+' · traducción seleccionada sin correspondencia disponible.';
 const index=all.findIndex(x=>x.locus===locus);$('prev').disabled=index<=0;$('next').disabled=index<0||index>=all.length-1;
 const others=$('other-translations');others.replaceChildren();others.hidden=!$('compare-all').checked;
 if($('compare-all').checked)for(const other of ['es','fr','en'].filter(x=>x!==lang)){
  const d=datasets[editionIds[other]],u=d?.passages.find(x=>atLocus(x,locus)),section=document.createElement('section');section.className='scholarly-panel';section.lang=other;
  section.innerHTML='<p class="eyebrow">TRADUCCIÓN</p><h2>'+names[other]+'</h2><p class="source">Diego Kurilo · '+(d?.version||other)+'</p><div class="scholarly-text">'+(u?(u.scope_note?'<p class="source">'+esc(citation(u)+' · '+u.scope_note)+'</p>':'')+highlight(u.translation):'Traducción sin correspondencia disponible para este locus.')+'</div>';others.append(section);
 }
 const ed=records[editionIds[lang]];const source=ed?.read_url||ed?.source_url;
 $('pdf-links').innerHTML=source?'<a href="'+esc(source)+'" target="_blank" rel="noopener">Abrir PDF original de '+esc(ed.version)+' ↗</a>'+(p?.pdf_pages?.latin?' · latín: p. '+p.pdf_pages.latin:'')+(p?.pdf_pages?.translation?' · traducción: p. '+p.pdf_pages.translation:''):'';
 $('provenance-text').textContent=p?'Fuente: '+data.source.filename+'; párrafos '+p.source_paragraphs.map(n=>n+1).join(' y ')+'. Referencia: '+citation(p)+'.':'La referencia latina procede de V514; no se atribuye una traducción inglesa al pasaje.';
 const url=new URL(location.href);url.searchParams.set('edition',editionIds[lang]);url.searchParams.set('locus',locus);if(query)url.searchParams.set('q',query);else url.searchParams.delete('q');history.replaceState(null,'',url);
}
function openLocus(value){
 const ref=parseLocus(value);if(!ref){clearReading('Formato de referencia no reconocido. Usá III.1.2, VIII.1 o I.praef.1.');return;}
 const choices=all.filter(p=>p.book===ref.book&&(ref.chapter==null||p.chapter===ref.chapter)&&(ref.section==null||p.section===ref.section));
 if(!choices.length){clearReading('Locus no encontrado: '+value+'. No se muestra un pasaje distinto.');return;}
 const p=choices[0];refresh(p.book,p.chapter,p.section);render();
}
$('form').addEventListener('submit',e=>{e.preventDefault();openLocus($('locus').value);});
for(const id of ['book','chapter','section'])$(id).addEventListener('change',()=>{refresh($('book').value,id==='book'?null:$('chapter').value,id==='section'?$('section').value:null);render();});
$('lang').addEventListener('change',render);$('compare-all').addEventListener('change',render);
for(const [id,delta]of [['prev',-1],['next',1]])$(id).addEventListener('click',()=>{if(!current)return;const p=all[all.findIndex(x=>x.locus===current.locus)+delta];if(p){refresh(p.book,p.chapter,p.section);render();}});
$('print-passage').addEventListener('click',()=>window.print());
$('find-form').addEventListener('submit',e=>{
 e.preventDefault();query=$('term').value.trim();const data=datasets[editionIds[$('lang').value]];if(!data){$('find-status').textContent='La edición no está disponible.';return;}
 const output=searchCorpus([data],{query,kind:'words',mode:$('find-mode').value,book:$('find-scope').value==='book'?$('book').value:'',language:'all'});$('find-results').replaceChildren();
 $('find-status').textContent=output.results.length?output.results.length+' coincidencias con referencia.':'Palabra o frase no encontrada en la selección.';
 for(const r of output.results){const b=document.createElement('button');b.type='button';b.className='reader-hit';b.textContent=citation(r)+' · '+(r.language==='la'?'Latín':names[r.language])+' — '+r.snippet;b.addEventListener('click',()=>{openLocus(r.locus);$('passage-ref').scrollIntoView({block:'start',behavior:'smooth'});});$('find-results').append(b);}
 render();
});
try{
 const responses=await Promise.allSettled([...Object.values(editionIds).map(async id=>{const response=await fetch('data/structured/'+id+'.json');if(!response.ok)throw Error(id);datasets[id]=await response.json();}),fetch('data/catalog.json').then(r=>r.json()).then(c=>{for(const e of c.editions)records[e.id]=e;})]);
 if(!datasets['recensio-es'])throw Error('No se pudo cargar el corpus castellano. Recargá para volver a intentarlo.');
 all=datasets['recensio-es'].passages;for(const id of ['book','chapter','section'])$(id).disabled=false;
 $('coverage').textContent=Object.values(datasets).map(d=>d.version+': '+d.passages.length+' bloques de lectura').join(' · ')+'. Los 731 loci están localizados en cada idioma; V297 conserva VII.7.1–3 y VII.7.4–5 como bloques conjuntos.';
 const requested=params.get('locus')||'1.1.1';openLocus(requested);
 if(responses.some(x=>x.status==='rejected'))$('status').textContent+=' Una de las ediciones no pudo cargarse.';
}catch(error){clearReading(error.message);}
