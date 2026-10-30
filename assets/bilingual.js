import {lexicalSuggestions,lexicalForms} from './lexical-suggestions.mjs?v=20261030-history';
import {bookTitle,bibliographyHTML,bibliographyText} from './edition-citation.mjs?v=20261030-history';
import {citation,roman,parseLocus,searchCorpus,tokens} from './search-core.mjs?v=20261030-docx-1';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const editionIds={es:'recensio-es',fr:'recensio-fr',en:'theory-en'},names={es:'Castellano',fr:'Français',en:'English'};
const datasets={},records={};let lexicon=[];
const atLocus=(p,locus)=>p.locus===locus||Boolean(p.section_end&&(()=>{const r=parseLocus(locus);return r&&p.book===r.book&&p.chapter===r.chapter&&r.section>=p.section&&r.section<=p.section_end;})());let all=[],current=null,query='',pendingLocus=null,passageCitation='';
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
 text=String(text).replace(/\u00ad/g,'');
 const wanted=new Set(($('find-mode').value==='forms'?lexicalForms(query,lexicon):[query]).flatMap(x=>tokens(x).map(t=>t.value)));if(!wanted.size)return esc(text);
 let html='',at=0;for(const t of tokens(text)){if(!wanted.has(t.value))continue;html+=esc(text.slice(at,t.start))+'<mark>'+esc(text.slice(t.start,t.end))+'</mark>';at=t.end;}return html+esc(text.slice(at));
}
function clearReading(message){
 for(const id of ['latin-text','translation-text','latin-title','latin-source','translation-source','passage-ref','pdf-links','provenance-text','edition-citation','edition-metadata','citation-status'])$(id).replaceChildren();$('other-translations').replaceChildren();$('status').textContent=message;current=null;passageCitation='';$('prev').disabled=$('next').disabled=true;
}
let apparatus=null;
function render(){
 const locus=[$('book').value,$('chapter').value,$('section').value].join('.'),lang=$('lang').value,data=datasets[editionIds[lang]],p=data?.passages.find(p=>atLocus(p,locus));
 const base=all.find(p=>atLocus(p,locus));current=base||null;
 if(!base){clearReading('Referencia no encontrada: '+locus+'. Revisá el libro, capítulo y sección.');return;}
 $('locus').value=roman(base.book)+'.'+base.chapter+'.'+base.section;$('passage-ref').textContent=citation(base);
 $('translation-title').textContent=names[lang];$('translation-source').textContent='Traducción de Diego Kurilo · '+(data?.version||lang);
 $('latin-title').textContent=citation(p||base);$('latin-source').textContent='Texto latino de la edición '+(p?data.version:'V514')+' · Diego Kurilo';
 $('latin-text').innerHTML=highlight(p?.latin||base.latin);$('translation-text').lang=lang;
 $('translation-text').innerHTML=p?highlight(p.translation):'<p>Este locus todavía no tiene traducción inglesa alineada en el índice. Podés consultar el castellano y el francés en el selector de traducción.</p>';
 if(lang==='es'&&p?.locus==='1.1.1'){
  $('translation-text').innerHTML=$('translation-text').innerHTML.replace(/\b(fabrica|ratiocinatio)\b/g,'<em>$1</em>');
 }
 let critical=document.getElementById('critical-note');
 if(!critical){critical=document.createElement('details');critical.id='critical-note';critical.className='provenance';document.getElementById('edition-reference').before(critical);}
 critical.replaceChildren();critical.hidden=true;
 if(base?.locus==='1.1.1'&&/perficit\[ur\]|opus \[est\]/.test(p?.latin||base.latin)){
  critical.hidden=false;
  const summary=document.createElement('summary');summary.textContent='Nota textual · I.1.1';critical.append(summary);
  const note=document.createElement('p');note.textContent='Esta transcripción presenta perficit[ur] y opus [est]. Los corchetes se conservan como signos del texto fuente: no se les atribuye aquí una operación crítica determinada sin cotejar las convenciones editoriales de la edición. Las lecturas perficitur y opus est se encuentran en ediciones impresas de referencia. Falta incorporar una justificación de la intervención y un aparato con testimonios verificados; esta nota no sustituye una colación manuscrita.';critical.append(note);
 }
 const appNotes=(apparatus?.notes||[]).filter(n=>n.loci.includes(base.locus));
 if(appNotes.length){
  critical.replaceChildren();critical.hidden=false;critical.open=true;
  const summary=document.createElement('summary');summary.textContent='Aparato crítico · '+citation(base)+' · '+appNotes.length+(appNotes.length===1?' nota':' notas');critical.append(summary);
  for(const n of appNotes){const note=document.createElement('p');note.textContent=n.text;const src=document.createElement('p');src.className='source';src.textContent='Diego Kurilo, V514, nota de nivel [F] · p. '+n.pdf_page+' del PDF';critical.append(note,src);}
  const k=document.createElement('p');k.className='source';k.textContent='Selección de las notas rotuladas «Aparato crítico comparativo», «Nota ecdótica» y «Nota crítica» de la edición V514. Las notas que abarcan varios loci se muestran en cada uno de ellos.';critical.append(k);
 }
 $('status').textContent=p?citation(p)+' · texto latino y traducción.'+(p.scope_note?' '+p.scope_note:''):citation(base)+' · traducción seleccionada sin correspondencia disponible.';
 const index=all.findIndex(x=>x.locus===locus);$('prev').disabled=index<=0;$('next').disabled=index<0||index>=all.length-1;
 const others=$('other-translations');others.replaceChildren();others.hidden=!$('compare-all').checked;
 if($('compare-all').checked)for(const other of ['es','fr','en'].filter(x=>x!==lang)){
  const d=datasets[editionIds[other]],u=d?.passages.find(x=>atLocus(x,locus)),section=document.createElement('section');section.className='scholarly-panel';section.lang=other;
  section.innerHTML='<p class="eyebrow">TRADUCCIÓN</p><h2>'+names[other]+'</h2><p class="source">'+bibliographyHTML(records[editionIds[other]])+'</p><div class="scholarly-text">'+(u?(u.scope_note?'<p class="source">'+esc(citation(u)+' · '+u.scope_note)+'</p>':'')+highlight(u.translation):'Traducción sin correspondencia disponible para este locus.')+'</div>';others.append(section);
 }
 const ed=records[editionIds[lang]];const source=ed?.read_url||ed?.source_url;
 $('edition-citation').innerHTML=bibliographyHTML(ed);
 $('edition-metadata').textContent=ed?[ed.editorial_role,ed.publication_place,ed.version,ed.isbn_note].filter(Boolean).join(' · '):'';
 $('pdf-links').innerHTML=source?'<a href="'+esc(source)+'" target="_blank" rel="noopener">Consultar PDF: <em>'+esc(bookTitle(ed))+'</em> ↗</a>'+(p?.pdf_pages?.latin?' · latín: p. '+p.pdf_pages.latin:'')+(p?.pdf_pages?.translation?' · traducción: p. '+p.pdf_pages.translation:''):'';
 passageCitation=ed?bibliographyText(ed)+' '+citation(p||base)+'. '+(p?.pdf_pages?.translation?'Página PDF de la traducción: '+p.pdf_pages.translation+'. ':'')+new URL('lector-bilingue.html?edition='+ed.id+'&locus='+locus,location.href).href:'';
 $('citation-status').textContent='';
 $('provenance-text').textContent=p?'Fuente: edición '+(data?.version||lang)+', '+citation(p)+'. La correspondencia digital se estableció a partir del texto autorizado de la edición; los identificadores internos de preparación editorial se mantienen fuera de la cita pública.':'La referencia latina procede de V514; no se atribuye una traducción inglesa al pasaje.';
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
$('copy-passage-citation').addEventListener('click',async()=>{if(!passageCitation){$('citation-status').textContent='Abrí un locus válido para generar su cita.';return;}try{await navigator.clipboard.writeText(passageCitation);$('citation-status').textContent='Cita del pasaje copiada con edición y versión.';}catch{$('citation-status').textContent=passageCitation;}});
$('print-passage').addEventListener('click',()=>window.print());
$('find-form').addEventListener('submit',e=>{
 e.preventDefault();query=$('term').value.trim();const data=datasets[editionIds[$('lang').value]];if(!data){$('find-status').textContent='La edición no está disponible.';return;}
 const mode=$('find-mode').value,forms=mode==='forms'?lexicalForms(query,lexicon):[query];
 $('find-results').replaceChildren();
 if(!forms.length){$('find-status').textContent='No hay una familia flexiva documentada para «'+query+'» en el léxico selectivo. Elegí Todas las palabras o Frase exacta para buscar literalmente.';render();return;}
 const found=forms.flatMap(form=>searchCorpus([data],{query:form,kind:'words',mode:mode==='forms'?'words':mode,book:$('find-scope').value==='book'?$('book').value:'',language:'all'}).results);
 const output={results:[...new Map(found.map(r=>[r.locus+':'+r.language,r])).values()].sort((a,b)=>a.book-b.book||(a.chapter==='praef'?-1:Number(a.chapter))-(b.chapter==='praef'?-1:Number(b.chapter))||a.section-b.section)};
 $('find-status').textContent=output.results.length?output.results.length+' resultados con locus en la edición '+data.version+' (latín y '+names[$('lang').value]+'), con referencia.'+(mode==='forms'?' Formas consultadas: '+forms.join(', ')+'.':''):'No hay coincidencias literales para «'+query+'» en la selección.';
 if(!output.results.length){for(const word of lexicalSuggestions(query,lexicon)){const b=document.createElement('button');b.type='button';b.className='reader-spelling-suggestion';b.textContent='Buscar la forma cercana «'+word+'»';b.addEventListener('click',()=>{$('term').value=word;$('find-form').requestSubmit();});$('find-results').append(b);}}
 for(const r of output.results){const b=document.createElement('button');b.type='button';b.className='reader-hit';b.textContent=citation(r)+' · '+(r.language==='la'?'Latín':names[r.language])+' — '+r.snippet;b.addEventListener('click',()=>{openLocus(r.locus);$('passage-ref').scrollIntoView({block:'start',behavior:'smooth'});});$('find-results').append(b);}
 render();
});
try{
 try{const r=await fetch('data/apparatus-es.json');if(r.ok)apparatus=await r.json();}catch{}
 const responses=await Promise.allSettled([...Object.values(editionIds).map(async id=>{const response=await fetch('data/structured/'+id+'.json');if(!response.ok)throw Error(id);datasets[id]=await response.json();}),fetch('data/latin-lexicon.json').then(r=>r.json()).then(d=>{lexicon=d.entries;}),fetch('data/catalog.json?v=20261030-citations').then(r=>r.json()).then(c=>{for(const e of c.editions)records[e.id]=e;})]);
 if(!datasets['recensio-es'])throw Error('No se pudo cargar el corpus castellano. Recargá para volver a intentarlo.');
 all=datasets['recensio-es'].passages;for(const id of ['book','chapter','section'])$(id).disabled=false;
 $('coverage').textContent=Object.values(datasets).map(d=>d.version+': '+d.passages.length+' bloques de lectura').join(' · ')+'. Los 731 loci están localizados en cada idioma; V297 conserva VII.7.1–3 y VII.7.4–5 como bloques conjuntos.';
 const requested=params.get('locus')||'1.1.1';openLocus(requested);
 if(responses.some(x=>x.status==='rejected'))$('status').textContent+=' Una de las ediciones no pudo cargarse.';
}catch(error){clearReading(error.message);}
