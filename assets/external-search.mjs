// On-demand scholarly metadata. No scraping, API key, account or hidden proxy.
const anchor=document.getElementById('more-results');
if(anchor){
 const host=document.createElement('details');host.className='provenance';const summary=document.createElement('summary');summary.textContent='Referencias académicas relacionadas · Crossref';const description=document.createElement('p');description.textContent='Consulta metadatos bibliográficos externos con la búsqueda escrita arriba. Estos registros no forman parte del corpus textual ni certifican sus interpretaciones.';const button=document.createElement('button');button.type='button';button.className='button outline';button.textContent='Consultar Crossref';const status=document.createElement('p');status.setAttribute('role','status');const list=document.createElement('ol');host.append(summary,description,button,status,list);anchor.after(host);
 const cache=new Map();let revision=0;
 button.addEventListener('click',async()=>{
  const query=document.getElementById('query').value.trim();if(!query){status.textContent='Escribí primero una palabra, frase o tema.';return;}const ticket=++revision;button.disabled=true;list.replaceChildren();status.textContent='Consultando referencias en Crossref…';const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  try{
   if(!cache.has(query)){const url=new URL('https://api.crossref.org/works');url.searchParams.set('query.bibliographic','Vitruvius '+query);url.searchParams.set('rows','8');url.searchParams.set('select','DOI,title,author,published,publisher,type,URL');const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error('Crossref no respondió ('+r.status+').');cache.set(query,(await r.json()).message.items);}
   if(ticket!==revision)return;const records=cache.get(query);status.textContent=records.length+' referencias externas · metadatos depositados en Crossref. Verificá su pertinencia y la publicación original.';
   for(const r of records){const item=document.createElement('li');const title=document.createElement('p');const strong=document.createElement('strong');strong.textContent=r.title?.[0]||'Título no consignado';title.append(strong);const meta=document.createElement('p');meta.textContent=[(r.author||[]).slice(0,4).map(a=>[a.given,a.family].filter(Boolean).join(' ')).join('; '),r.published?.['date-parts']?.[0]?.[0],r.publisher].filter(Boolean).join(' · ');item.append(title,meta);if(/^10\.\d{4,9}\/\S+$/.test(r.DOI||'')){const a=document.createElement('a');a.href='https://doi.org/'+encodeURIComponent(r.DOI).replaceAll('%2F','/');a.target='_blank';a.rel='noopener noreferrer';a.textContent='DOI: '+r.DOI;item.append(a);}list.append(item);}
  }catch(error){status.textContent=error.name==='AbortError'?'La consulta tardó demasiado. Podés volver a intentar o usar Google Académico.':'No fue posible consultar Crossref. '+error.message;}
  finally{clearTimeout(timeout);button.disabled=false;}
 });
}
