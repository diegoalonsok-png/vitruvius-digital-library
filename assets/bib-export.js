/* Exportación bibliográfica (BibTeX, RIS y CSL-JSON) para Zotero, Mendeley, EndNote o LaTeX.
 * Uso: <div class="bib-export" data-src="data/academic-studies.json" data-kind="studies"></div>
 * Exporta exactamente los registros del sitio; el estado de verificación de cada ficha viaja en la nota.
 */
(()=>{
 'use strict';
 const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'');
 const texEsc=s=>String(s??'').replace(/([{}%&$#_])/g,'\\$1');
 const yearOf=s=>(String(s||'').match(/\b(1[0-9]{3}|20[0-9]{2})\b/)||[])[1]||'';
 const key=(r,i)=>(fold((r.author||r.title||'ref').split(/[,\s]/)[0]).replace(/[^A-Za-z]/g,'')||'ref')+(yearOf(r.year||r.date)||'')+'_'+(i+1);
 const TYPE={studies:r=>/art[ií]culo|revista|journal/i.test(r.type||'')?['article','JOUR','article-journal']:/cap[ií]tulo|chapter/i.test(r.type||'')?['incollection','CHAP','chapter']:/tesis|thesis/i.test(r.type||'')?['phdthesis','THES','thesis']:['book','BOOK','book'],
  inventory:r=>r.group==='manuscripts'?['misc','MANSCPT','manuscript']:['book','BOOK','book']};
 function normalize(kind,r){
  if(kind==='studies')return {author:r.author||'',title:r.title||'',publisher:r.publisher||'',place:r.country||'',year:yearOf(r.year),isbn:r.isbn||'',doi:r.doi||'',url:r.url||'',note:[r.type,r.theme,r.verification].filter(Boolean).join(' · ')};
  return {author:r.author||'',title:r.title||'',publisher:r.publisher||'',place:r.place||'',year:yearOf(r.date),date:r.date||'',isbn:'',doi:'',url:r.view_url||r.document_url||'',note:[r.bibliographic_note,r.citation_status&&'Cita '+r.citation_status].filter(Boolean).join(' · ')};
 }
 function bibtex(kind,rows){return rows.map((r,i)=>{const n=normalize(kind,r),[t]=TYPE[kind](r);const f=[['author',n.author],['title',n.title],[t==='article'?'journal':'publisher',n.publisher],['address',n.place],['year',n.year],['date',n.date&&!n.year?n.date:''],['isbn',n.isbn],['doi',n.doi],['url',n.url],['note',n.note]].filter(x=>x[1]);
  return `@${t}{${key(r,i)},\n`+f.map(([k,v])=>`  ${k} = {${texEsc(v)}}`).join(',\n')+'\n}'}).join('\n\n')+'\n'}
 function ris(kind,rows){return rows.map(r=>{const n=normalize(kind,r),[,ty]=TYPE[kind](r);const L=[['TY',ty]];
  for(const a of String(n.author).split(/\s*;\s*|\s+y\s+|\s+and\s+/).filter(Boolean))L.push(['AU',a]);
  [['TI',n.title],['PB',n.publisher],['CY',n.place],['PY',n.year],['DA',n.date],['SN',n.isbn],['DO',n.doi],['UR',n.url],['N1',n.note]].forEach(x=>x[1]&&L.push(x));L.push(['ER','']);
  return L.map(([k,v])=>`${k}  - ${v}`).join('\r\n')}).join('\r\n\r\n')+'\r\n'}
 function csl(kind,rows){return JSON.stringify(rows.map((r,i)=>{const n=normalize(kind,r),[,,type]=TYPE[kind](r);const o={id:key(r,i),type,title:n.title};
  if(n.author)o.author=String(n.author).split(/\s*;\s*/).map(a=>{const [family,given]=a.split(/,\s*/);return given?{family,given}:{literal:a}});
  if(n.publisher)o.publisher=n.publisher;if(n.place)o['publisher-place']=n.place;if(n.year)o.issued={'date-parts':[[+n.year]]};if(n.isbn)o.ISBN=n.isbn;if(n.doi)o.DOI=n.doi;if(n.url)o.URL=n.url;if(n.note)o.note=n.note;return o}),null,2)}
 function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
 for(const box of document.querySelectorAll('.bib-export')){
  const src=box.dataset.src,kind=box.dataset.kind||'studies',base=box.dataset.name||'vitruvius-bibliografia';
  box.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:14px 0 22px;font:14px/1.4 Arial,Helvetica,sans-serif';
  const label=document.createElement('span');label.textContent='Exportar para Zotero, Mendeley o LaTeX:';box.append(label);
  for(const [fmt,ext,type,fn] of [['BibTeX','bib','application/x-bibtex',bibtex],['RIS','ris','application/x-research-info-systems',ris],['CSL-JSON','json','application/json',csl]]){
   const b=document.createElement('button');b.type='button';b.textContent=fmt;b.style.cssText='padding:7px 12px;border:1px solid currentColor;border-radius:999px;background:transparent;color:inherit;cursor:pointer;font:600 12px Arial,Helvetica,sans-serif';
   b.onclick=async()=>{try{const d=await fetch(src).then(r=>r.json());const rows=d.records||d;download(`${base}.${ext}`,fn(kind,rows),type);b.textContent=fmt+' ✓'}catch{b.textContent=fmt+' · error'}};
   box.append(b);
  }
  const note=document.createElement('small');note.style.opacity='.75';note.textContent='Cada registro incluye en la nota su estado de verificación.';box.append(note);
 }
 window.VitruviusBibExport={bibtex,ris,csl};
})();
