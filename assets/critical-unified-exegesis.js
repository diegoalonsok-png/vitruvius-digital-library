/* Vista por pasaje. Solo se adjunta comentario con locus explícito verificable.
   El texto del autor no se modifica ni se inventan relaciones exegéticas. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const form=$('critical-unified-form'),out=$('critical-unified-results');
if(!form||!out)return;
const editions=[
 {id:'recensio-es',name:'V514 · Castellano',lang:'es',pdf:'documents/kurilo-recensio-es.pdf'},
 {id:'recensio-fr',name:'V554 · Francés',lang:'fr',pdf:'documents/kurilo-recensio-fr.pdf'},
 {id:'theory-en',name:'V297 · Inglés',lang:'en',pdf:'documents/kurilo-theory-en.pdf'}
];
const q=$('critical-unified-query'),filter=$('critical-unified-edition'),status=$('critical-unified-status'),more=$('critical-unified-more');
const normalize=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ');
const romanNum=s=>{const t=String(s).toUpperCase(),v={I:1,V:5,X:10};if(!/^[IVX]+$/.test(t))return s;let n=0;for(let i=0;i<t.length;i++)n+=v[t[i]]<(v[t[i+1]]||0)?-v[t[i]]:v[t[i]];return n};
const locusKey=s=>String(s||'').trim().toLowerCase().replace(/^([ivx]+)(?=\.)/i,m=>romanNum(m)).replace(/\.pr(?=\.|$)/,'.praef').replace(/\s/g,'');
const locusInput=s=>/^(?:locus\s*:?\s*)?(?:[ivx]+|10|[1-9])\.(?:pr|praef|\d+)(?:\.\d+)?$/i.test(s.trim())?locusKey(s.replace(/^locus\s*:?\s*/i,'')):null;
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=String(x);return e};
const store=new Map();
function load(path){if(!store.has(path))store.set(path,fetch(path).then(r=>{if(!r.ok)throw Error(path+' HTTP '+r.status);return r.json()}).catch(e=>{store.delete(path);throw e}));return store.get(path)}
function exactMatch(a,b){
 const x=locusKey(a),y=locusKey(b);return x===y||(!y.includes('.',y.indexOf('.')+1)&&x.startsWith(y+'.'));
}
function contains(text,search){return normalize(text).includes(normalize(search))}
function annotated(text,search){
 const p=el('p','critical-unified-text'),s=String(text||''),n=normalize(search);
 if(!n){p.textContent=s;return p}
 const folded=normalize(s),i=folded.indexOf(n);
 if(i<0){p.textContent=s;return p}
 // Preserve original strings; normal form indexing is reliable for plain Latin input.
 if(s.length!==folded.length){p.textContent=s;return p}
 p.append(document.createTextNode(s.slice(0,i)),el('mark','critical-unified-hit',s.slice(i,i+n.length)),document.createTextNode(s.slice(i+n.length)));return p;
}
let rows=[],shown=0,rev=0,term='',byLocus=null;
function details(container,heading,records,kind){
 if(!records.length)return;
 const d=el('details','critical-unified-notes');d.append(el('summary','',heading+' ('+records.length+')'));
 for(const r of records){
  const section=el('section','critical-unified-counterpart');
  section.append(el('p','critical-unified-meta',kind==='docx'?(r.editionName+' · nota '+(r.footnote_id||'')+' · DOCX'):(r.editionName+' · PDF · página '+(r.page||'no localizada'))));
  section.append(el('p','critical-unified-text',r.text||''));
  if(kind==='docx')section.append(el('p','critical-unified-meta','Procedencia: '+(r.source_file||'fuente DOCX')+' · párrafo '+(r.source_paragraph||'sin referencia')));
  if(kind==='pdf'&&Number(r.page)>0){const e=editions.find(x=>x.id===r.edition);if(e){const a=el('a','','Consultar página original');a.href=e.pdf+'#page='+Math.floor(r.page);a.target='_blank';a.rel='noopener noreferrer';section.append(a)}}
  d.append(section);
 }
 container.append(d);
}
function render(){
 for(const row of rows.slice(shown,shown+15)){
  const card=el('article','critical-unified-card');
  card.append(el('h3','','Vitr., De architectura · '+row.locus));
  const first=row.versions.find(x=>x.e.id===filter.value&&x.p.latin)||row.versions.find(x=>x.p.latin)||row.versions[0];
  card.append(el('p','critical-unified-meta','Texto latino · '+first.e.name));
  const lat=annotated(first.p.latin,byLocus?'':term);lat.lang='la';card.append(lat);
  const translations=el('div','critical-unified-counterpart');translations.append(el('h4','','Traducciones del pasaje'));
  for(const v of row.versions){
   if(!v.p.translation)continue;
   const d=el('details','critical-unified-detail');
   d.open=v.e.lang==='es';
   d.append(el('summary','',v.e.name));
   const trans=annotated(v.p.translation,byLocus?'':term);trans.lang=v.e.lang;d.append(trans);translations.append(d);
  }
  card.append(translations);
  const commentary=el('div','critical-unified-counterpart');
  commentary.append(el('h4','','Análisis y aparato crítico del pasaje'));
  details(commentary,'Notas del autor vinculadas mediante locus explícito',row.notes,'docx');
  details(commentary,'Comentarios del PDF con locus en encabezado',row.pdfNotes,'pdf');
  if(!row.notes.length&&!row.pdfNotes.length)commentary.append(el('p','critical-unified-meta','Sin comentario crítico registrado con vínculo explícito a este locus. No implica que el autor no haya tratado el tema en otra parte de sus libros.'));
  card.append(commentary);
  const links=el('div','critical-unified-actions');
  for(const v of row.versions){const a=el('a','','Abrir '+v.e.name+' en el lector');a.href='lector-bilingue.html?edition='+encodeURIComponent(v.e.id)+'&locus='+encodeURIComponent(v.p.locus);links.append(a)}
  card.append(links);out.append(card);
 }
 shown=Math.min(shown+15,rows.length);more.hidden=shown>=rows.length;more.textContent='Mostrar más pasajes ('+shown+' de '+rows.length+')';
}
async function run(){
 term=q.value.trim();if(!term)return;
 byLocus=locusInput(term);const id=++rev;rows=[];shown=0;out.replaceChildren();more.hidden=true;
 status.textContent='Localizando pasajes latinos y cotejando referencias documentales…';
 const chosen=editions; // Mostrar siempre las tres traducciones disponibles; el selector solo prioriza la edición.
 const paths=[...chosen.map(e=>'data/structured/'+e.id+'.json'),'data/critical-notes.json','data/apparatus-index.json'];
 const responses=await Promise.allSettled(paths.map(load));if(id!==rev)return;
 const data=new Map(paths.map((p,i)=>[p,responses[i].status==='fulfilled'?responses[i].value:null]));
 const missing=paths.filter((p,i)=>responses[i].status!=='fulfilled');
 const notes=data.get('data/critical-notes.json')?.entries||[];
 const apparatus=data.get('data/apparatus-index.json')?.entries||[];
 const grouped=new Map();
 for(const e of chosen){
  for(const p of data.get('data/structured/'+e.id+'.json')?.passages||[]){
   const matches=byLocus?exactMatch(p.locus,byLocus):contains(p.latin,term);
   if(!matches)continue;
   const key=locusKey(p.locus);let row=grouped.get(key);
   if(!row){row={locus:p.locus,versions:[],notes:[],pdfNotes:[]};grouped.set(key,row)}
   row.versions.push({e,p});
  }
 }
 for(const [key,row] of grouped){
  const editionsForRow=new Set(row.versions.map(v=>v.e.id));
  row.notes=notes.filter(n=>editionsForRow.has(n.edition)&&n.mapping_status==='explicit_in_anchor'&&n.locus&&locusKey(n.locus)===key).map(n=>({...n,editionName:editions.find(e=>e.id===n.edition)?.name||n.edition}));
  row.pdfNotes=apparatus.filter(n=>editionsForRow.has(n.edition)&&n.locusInHeading===true&&locusKey(n.locusMention||(n.loci||[])[0])===key).map(n=>({...n,editionName:editions.find(e=>e.id===n.edition)?.name||n.edition}));
 }
 rows=[...grouped.values()].sort((a,b)=>{const x=a.versions[0].p,y=b.versions[0].p;return x.book-y.book||String(x.chapter).localeCompare(String(y.chapter),undefined,{numeric:true})||x.section-y.section});
 const analyzed=rows.filter(r=>r.notes.length||r.pdfNotes.length).length;
 status.textContent=rows.length+' pasajes latinos encontrados · '+analyzed+' con comentarios vinculados documentalmente · '+(rows.length-analyzed)+' sin aparato registrado.'+(missing.length?' Advertencia: fuentes no disponibles: '+missing.join(', ')+'. Resultados parciales.':'');
 if(!rows.length)out.append(el('p','critical-unified-empty','No se encontró el locus o la frase latina en los textos disponibles.'));
 render();
}
form.addEventListener('submit',ev=>{ev.preventDefault();void run()});
more.addEventListener('click',render);
const params=new URLSearchParams(location.search),initial=params.get('locus')||params.get('q');if(initial){q.value=initial;void run()}
})();