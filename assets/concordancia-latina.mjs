import{EDITIONS,parseLocus,labelLocus,validateEdition,createConcordance,appendHighlighted,excerpt,scrollFraction,synchronizedOffset}from'./concordancia-latina-core.mjs?v=20261121-1';

export async function loadLatinSource(source,{fetcher=fetch,cryptoAPI=globalThis.crypto}={}){
 const url=new URL(source.url);
 if(url.origin!=='https://libros.vitruvius-digital-library.org'||!url.pathname.startsWith('/corpus/critical-editions/')||!url.pathname.endsWith('.json')||!EDITIONS.includes(source.edition)||!/^[a-f0-9]{64}$/.test(source.sha256))throw Error('Fuente latina no autorizada.');
 const response=await fetcher(source.url);if(!response.ok)throw Error(source.editor+': HTTP '+response.status);
 const bytes=await response.arrayBuffer();const hash=Array.from(new Uint8Array(await cryptoAPI.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==source.sha256)throw Error('La copia de R2 de '+source.editor+' no coincide con su índice verificado.');
 return validateEdition(JSON.parse(new TextDecoder().decode(bytes)),source.edition);
}

export async function mountConcordance(doc=document,{fetcher=fetch,cryptoAPI=globalThis.crypto,win=doc.defaultView}={}){
 const $=id=>doc.getElementById(id),make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const readers=[$('hc-krohn-reader'),$('hc-rose-reader')],workspace=$('hc-workspace');if(!workspace)return;
 let engine,current=0,searchState={results:[],groups:[]},shown=0,sync=true,expectedScroll=new WeakMap(),font=21,width=50;
 const getJSON=async path=>{const r=await fetcher(path);if(!r.ok)throw Error('No se pudo leer '+path+' (HTTP '+r.status+').');return r.json();};
 const saveURL=()=>{const u=new URL(win.location.href);u.searchParams.set('locus',engine.loci[current]);for(const [k,v]of[['q',$('hc-query').value.trim()],['mode',$('hc-mode').value],['book',$('hc-book').value]]){if(v&&(k!=='mode'||v!=='semantic'))u.searchParams.set(k,v);else u.searchParams.delete(k);}win.history.replaceState(null,'',u);};
 const hitsFor=locus=>searchState.results.find(r=>r.locus===locus)?.hits||[[],[]];
 function showLocus(locus,{focus=false,url=true}={}){
  const parsed=parseLocus(locus);const i=engine.loci.findIndex(l=>l===parsed?.key||!parsed?.section&&l.startsWith(parsed?.key+'.'));
  if(i<0){$('hc-locus-message').textContent='No se encontró ese locus. Usa, por ejemplo, I.2.4 o 9.praef.10.';return false;}
  current=i;const pair=engine.pairs[i],hits=hitsFor(pair.locus);
  $('hc-locus').value=pair.locus;$('hc-loci').value=pair.locus;$('hc-position').textContent=(i+1)+' / 731';$('hc-prev').disabled=i===0;$('hc-next').disabled=i===730;$('hc-locus-message').textContent='';
  $('hc-apparatus').href='apparatus-bude.html?locus='+encodeURIComponent(pair.locus);
  for(let side=0;side<2;side++){const name=side===0?'krohn':'rose',p=pair.passages[side],para=make('p');appendHighlighted(para,p.latin,hits[side]);readers[side].replaceChildren(para);readers[side].dataset.locus=pair.locus;expectedScroll.delete(readers[side]);readers[side].scrollTop=0;
   $('hc-'+name+'-reference').textContent=labelLocus(pair.locus);
   const note=$('hc-'+name+'-source');const review=p.status==='alignment_needs_editorial_review';note.dataset.review=String(review);
   note.textContent=(side===0?'Krohn 1912 · Perseus TEI':'Rose 1899 · Project Gutenberg')+' · '+pair.locus+(review?' · Alineación pendiente de revisión editorial.':' · Texto latino indexado.');
  }
  if(url)saveURL();if(focus){$('hc-workspace').scrollIntoView?.({behavior:'smooth',block:'start'});readers[0].focus({preventScroll:true});}return true;
 }
 function renderMore(){
  const end=Math.min(shown+12,searchState.results.length);
  for(const hit of searchState.results.slice(shown,end)){
   const article=make('article','', 'hc-results-item');article.dataset.locus=hit.locus;
   const head=make('div','', 'hc-result-head');head.append(make('h3',labelLocus(hit.locus)));const go=make('button','Leer enfrentados');go.type='button';go.addEventListener('click',()=>showLocus(hit.locus,{focus:true}));head.append(go);article.append(head);
   const pair=make('div','', 'hc-result-pair');
   for(let side=0;side<2;side++){const block=make('div','', 'hc-result-text');block.append(make('small',side===0?'KROHN · 1912':'ROSE · 1899'));const p=make('p');p.lang='la';p.translate=false;p.setAttribute('data-hc-latin','');
    const part=excerpt(hit.passages[side].latin,hit.hits[side]);appendHighlighted(p,part.text,part.hits);if(part.before)p.prepend('…');if(part.after)p.append('…');block.append(p);
    if(!searchState.locus&&!hit.hits[side].length)block.append(make('p','Sin coincidencia de esta consulta en esta edición.','hc-no-hit'));pair.append(block);
   }article.append(pair);$('hc-results').append(article);
  }
  shown=end;$('hc-more').hidden=shown>=searchState.results.length;$('hc-more').textContent='Mostrar más pasajes ('+shown+' de '+searchState.results.length+')';
 }
 function runSearch({navigate=true,url=true}={}){
  if(!engine)return;const query=$('hc-query').value.trim();$('hc-results').replaceChildren();shown=0;$('hc-more').hidden=true;
  searchState=engine.search(query,{mode:$('hc-mode').value,book:$('hc-book').value});
  if(!query){$('hc-search-status').textContent='731 loci disponibles en cada edición · dos índices latinos de R2 comprobados.';$('hc-expansion').textContent='';showLocus(engine.loci[current],{url});return;}
  const n=searchState.results.length,counts=[0,0];for(const r of searchState.results)for(let i=0;i<2;i++)if(searchState.locus||r.hits[i].length)counts[i]++;
  $('hc-search-status').textContent=n?(n+' loci encontrados · Krohn: '+counts[0]+' · Rose: '+counts[1]+'.'):'No se encontraron pasajes para esta consulta. Prueba otra palabra, un concepto del Lexicon o un locus.';
  const terms=[...new Set(searchState.groups.flat())];$('hc-expansion').textContent=terms.length?'Términos consultados: '+terms.join(' · ')+'.':'';renderMore();
  if(n&&navigate)showLocus(searchState.results[0].locus,{url});else showLocus(engine.loci[current],{url});
 }
 $('hc-search-form').addEventListener('submit',e=>{e.preventDefault();runSearch();});for(const id of['hc-mode','hc-book'])$(id).addEventListener('change',()=>runSearch());
 $('hc-clear').addEventListener('click',()=>{$('hc-query').value='';$('hc-book').value='';runSearch({navigate:false});});$('hc-more').addEventListener('click',renderMore);
 $('hc-locus-form').addEventListener('submit',e=>{e.preventDefault();if(engine)showLocus($('hc-locus').value);});$('hc-loci').addEventListener('change',e=>showLocus(e.target.value));
 $('hc-prev').addEventListener('click',()=>showLocus(engine.loci[Math.max(0,current-1)]));$('hc-next').addEventListener('click',()=>showLocus(engine.loci[Math.min(730,current+1)]));
 $('hc-sync').addEventListener('click',()=>{sync=!sync;$('hc-sync').setAttribute('aria-pressed',String(sync));expectedScroll=new WeakMap();});
 readers.forEach((reader,i)=>reader.addEventListener('scroll',()=>{const expected=expectedScroll.get(reader);if(expected!==undefined&&Math.abs(reader.scrollTop-expected)<2){expectedScroll.delete(reader);return;}if(!sync)return;const other=readers[1-i],offset=synchronizedOffset(other,scrollFraction(reader));if(Math.abs(other.scrollTop-offset)>1){expectedScroll.set(other,offset);other.scrollTop=offset;}},{passive:true}));
 const setHeight=value=>{workspace.style.setProperty('--hc-height',value+'px');$('hc-height').value=value;$('hc-height-value').textContent=value+' px';};
 $('hc-height').addEventListener('input',e=>setHeight(e.target.value));const setFont=value=>{font=Math.max(16,Math.min(36,value));workspace.style.setProperty('--hc-font',font+'px');};
 $('hc-smaller').addEventListener('click',()=>setFont(font-1));$('hc-larger').addEventListener('click',()=>setFont(font+1));
 const divider=$('hc-divider'),setWidth=value=>{width=Math.max(30,Math.min(70,value));workspace.style.gridTemplateColumns='minmax(0,'+width+'fr) 16px minmax(0,'+(100-width)+'fr)';divider.setAttribute('aria-valuenow',Math.round(width));};
 divider.addEventListener('pointerdown',e=>{divider.setPointerCapture?.(e.pointerId);});divider.addEventListener('pointermove',e=>{if(!divider.hasPointerCapture?.(e.pointerId))return;const box=workspace.getBoundingClientRect();setWidth((e.clientX-box.left)/box.width*100);});divider.addEventListener('pointerup',e=>divider.releasePointerCapture?.(e.pointerId));divider.addEventListener('dblclick',()=>setWidth(50));divider.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setWidth(width+(e.key==='ArrowLeft'?-2:2));}if(e.key==='Home'){e.preventDefault();setWidth(50);}});
 $('hc-reset').addEventListener('click',()=>{setWidth(50);setFont(21);setHeight(620);sync=true;$('hc-sync').setAttribute('aria-pressed','true');});
 $('hc-copy').addEventListener('click',async()=>{const pair=engine.pairs[current];try{await win.navigator.clipboard.writeText(labelLocus(pair.locus)+'\n\nKrohn 1912\n'+pair.passages[0].latin+'\n\nRose 1899\n'+pair.passages[1].latin);$('hc-locus-message').textContent='Los dos pasajes y su referencia se copiaron.';}catch{$('hc-locus-message').textContent='Selecciona el texto de cada panel para copiarlo.';}});
 $('hc-dictionary-close').addEventListener('click',()=>{$('hc-dictionary').hidden=true;});doc.addEventListener('keydown',e=>{if(e.key==='Escape')$('hc-dictionary').hidden=true;});
 const dictOptions={lang:'la',work:'vitruvius',online:false,onWord:()=>{$('hc-dictionary').hidden=false;}};
 if(win.ClassicalLexicon){for(const root of[...readers,$('hc-results')])win.ClassicalLexicon.attachClick(root,$('hc-dictionary-content'),()=>dictOptions);
  // Make highlighted words available to keyboard users, too.
  const activate=e=>{if(e.target.matches?.('mark.cl-hit')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();$('hc-dictionary').hidden=false;win.ClassicalLexicon.renderPanel($('hc-dictionary-content'),e.target.textContent,dictOptions);}};doc.addEventListener('keydown',activate);
  const observer=new win.MutationObserver(()=>{doc.querySelectorAll('.hc-main mark.cl-hit:not([tabindex])').forEach(m=>{m.tabIndex=0;m.setAttribute('role','button');m.setAttribute('aria-label','Consultar '+m.textContent+' en el diccionario latino');});});observer.observe($('contenido'),{childList:true,subtree:true});
 }
 try{
  const [manifest,concepts,lexicon]=await Promise.all([getJSON('data/critical-editions/concordance-r2-sources.json'),getJSON('data/lexicon/conceptus.json'),getJSON('data/latin-lexicon.json')]);
  if(manifest.schema!=='vdl-latin-concordance-r2-v1'||manifest.editions?.length!==2)throw Error('No se encontró el registro de las dos fuentes latinas.');
  const sources=EDITIONS.map(id=>{const src=manifest.editions.find(s=>s.edition===id);if(!src)throw Error('Falta el índice '+id+'.');return src;});
  const editions=await Promise.all(sources.map(source=>loadLatinSource(source,{fetcher,cryptoAPI})));engine=createConcordance(...editions,{concepts:concepts.concepts,entries:lexicon.entries});
  for(let b=1;b<=10;b++){const option=make('option','Libro '+b);option.value=b;$('hc-book').append(option);}
  $('hc-loci').replaceChildren();for(const locus of engine.loci){const option=make('option',labelLocus(locus));option.value=locus;$('hc-loci').append(option);}
  for(const id of['hc-go','hc-loci','hc-search-button','hc-copy'])$(id).disabled=false;
  sources.forEach((source,i)=>{const p=make('p'),a=make('a',source.editor+' · '+source.year+' · índice latino en R2');a.href=source.url;a.target='_blank';a.rel='noopener';p.append(a,doc.createTextNode(' · 731 loci · '+(i===0?'Perseus TEI, CC BY-SA 4.0.':'Project Gutenberg 51812, transcripción digital.')));$('hc-sources').append(p);});
  const params=new URL(win.location.href).searchParams;$('hc-query').value=params.get('q')||'';if(['semantic','words','phrase'].includes(params.get('mode')))$('hc-mode').value=params.get('mode');$('hc-book').value=params.get('book')||'';
  const initial=params.get('locus')||'1.2.4';showLocus(initial,{url:false});runSearch({navigate:!params.has('locus'),url:true});
  workspace.dataset.ready='true';return{engine,showLocus,runSearch};
 }catch(error){$('hc-search-status').textContent='No se pudieron cargar ambos índices latinos. '+error.message+' Recarga la página para reintentar.';for(const reader of readers){const p=make('p','Lectura pendiente: no se ha podido comprobar el índice latino de R2.','hc-message');p.lang='es';reader.replaceChildren(p);}workspace.dataset.ready='error';return{error};}
}
if(typeof document!=='undefined')mountConcordance();
