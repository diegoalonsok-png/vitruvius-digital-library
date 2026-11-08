/* Búsqueda filológica conjunta: pasajes del autor, notas DOCX y aparato PDF.
   La coincidencia de una palabra en una nota NO demuestra que comente el locus.
   La búsqueda no modifica ni resume los originales. */
(()=>{
'use strict';
const by=id=>document.getElementById(id);
const form=by('critical-unified-form'),target=by('critical-unified-results');
if(!form||!target)return;
const EDITIONS=[
 {id:'recensio-es',version:'V514',lang:'es',label:'Castellano',pdf:'documents/kurilo-recensio-es.pdf'},
 {id:'recensio-fr',version:'V554',lang:'fr',label:'Francés',pdf:'documents/kurilo-recensio-fr.pdf'},
 {id:'theory-en',version:'V297',lang:'en',label:'Inglés',pdf:'documents/kurilo-theory-en.pdf'}
];
const edById=new Map(EDITIONS.map(e=>[e.id,e]));
const normalize=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ').replace(/[\u2019’]/g,"'");
const word=c=>!!c&&/[\p{L}\p{M}\p{N}]/u.test(c);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
function positions(raw,query,phrase){
 const text=String(raw||''),q=normalize(String(query||'').trim());
 if(!q)return [];
 const map=[],chars=[];let index=0;
 for(const c of text){const folded=normalize(c);for(const p of folded){chars.push(p);map.push(index)}index+=c.length}
 const folded=chars.join(''),found=[];let at=0;
 while((at=folded.indexOf(q,at))>=0){
  const finish=at+q.length;
  if((phrase||!word(folded[at-1])&&!word(folded[finish]))&&map[at]!==undefined&&map[finish-1]!==undefined){
   const begin=map[at],end=map[finish-1]+String.fromCodePoint(text.codePointAt(map[finish-1])).length;
   found.push([begin,end]);
  }
  at+=Math.max(1,q.length);
 }
 return found;
}
function highlight(parent,raw,spans){
 const text=String(raw||'');let at=0;
 for(const [start,end] of spans){
  if(start<at||start>=text.length)continue;
  parent.append(document.createTextNode(text.slice(at,start)));
  const mark=el('mark','critical-unified-hit',text.slice(start,end));parent.append(mark);at=end;
 }
 parent.append(document.createTextNode(text.slice(at)));
}
const pool=new Map();
async function getJson(path){
 if(!pool.has(path))pool.set(path,fetch(path).then(r=>{if(!r.ok)throw Error('HTTP '+r.status+' · '+path);return r.json()}).catch(e=>{pool.delete(path);throw e}));
 return pool.get(path);
}
const q=by('critical-unified-query'),edition=by('critical-unified-edition'),field=by('critical-unified-field'),
 phrase=by('critical-unified-phrase'),status=by('critical-unified-status'),more=by('critical-unified-more');
let visible=[],shown=0,revision=0,currentQuery='';
const locusKey=v=>String(v||'').toLowerCase().replace(/^0+/,'').replace(/\s+/g,'');
function pdfLink(e,page){
 const n=Number(page);return e.pdf+(Number.isFinite(n)&&n>0?'#page='+Math.floor(n):'');
}
function sourceTitle(e){return e.version+' · '+e.label+' · Diego A. Kurilo'}
function record(source,e,content,opts){
 const matches=positions(content,currentQuery,phrase.checked);if(!matches.length)return null;
 return {source,edition:e,content,matches,...opts};
}
function countAndList(){
 const counts=new Map(),freq=visible.reduce((n,x)=>n+x.matches.length,0);
 for(const x of visible){const key=x.edition.id+'|'+x.source;const c=counts.get(key)||{passages:0,count:0};c.passages++;c.count+=x.matches.length;counts.set(key,c)}
 status.textContent=visible.length+' unidades textuales y '+freq+' apariciones documentadas de «'+currentQuery+'». '+
 EDITIONS.map(e=>{const es=[...counts].filter(([key])=>key.startsWith(e.id+'|'));return e.version+': '+es.reduce((n,[,v])=>n+v.count,0)+' coincidencias'}).join(' · ')+
 '. Cifras de las fuentes digitalizadas, no de manuscritos ni de variantes cotejadas.';
}
function renderNext(){
 const batch=visible.slice(shown,shown+20);
 for(const r of batch){
  const card=el('article','critical-unified-card'),head=el('div','critical-unified-meta',sourceTitle(r.edition));
  const h=el('h3','',r.source==='passage'?'Vitr., De architectura · '+r.locus:r.source==='note'?'Nota editorial DOCX · '+(r.noteId||'sin número'):'Aparato / comentario en PDF · '+(r.page?'p. '+r.page:'referencia de página no disponible'));
  const counts=el('p','critical-unified-meta',r.matches.length+' coincidencia(s) en esta unidad · '+(r.source==='passage'?'Texto latino/traducción':r.source==='note'?'Nota escrita del autor':'Bloque del aparato, transcrito del PDF'));
  const details=el('details','critical-unified-detail');
  const summary=el('summary','',r.source==='passage'?'Desplegar párrafo y traducción':r.source==='note'?'Desplegar nota completa':'Desplegar explicación completa');
  details.append(summary);
  const full=el('div','critical-unified-full');
  const p=el('p','critical-unified-text');p.lang=r.source==='passage'&&r.field==='latin'?'la':r.edition.lang;
  highlight(p,r.content,r.matches);full.append(p);
  if(r.source==='passage'&&r.other){
   const other=el('div','critical-unified-counterpart');
   other.append(el('strong','',r.field==='latin'?'Traducción de esta edición':'Texto latino de esta edición'));
   const t=el('p','critical-unified-text');t.lang=r.field==='latin'?r.edition.lang:'la';t.textContent=r.other;
   other.append(t);full.append(other);
  }
  if(r.source==='note'){
   full.append(el('p','critical-unified-meta',r.locus?
    (r.verified?'Locus explícito en la nota: '+r.locus:'Locus candidato sin verificación: '+r.locus):
    'La nota no tiene un locus verificado; no se adjudica a un párrafo por mera coincidencia léxica.'));
  }
  if(r.source==='apparatus'){
   full.append(el('p','critical-unified-meta',r.locus?
    (r.verified?'El locus figura en el encabezado del bloque: '+r.locus:'Locus mencionado en el bloque, no cotejado: '+r.locus):
    'Sin locus verificado. Referencia por página del PDF.'));
  }
  const actions=el('div','critical-unified-actions'),a=el('a','','Consultar fuente original ↗');a.href=r.source==='passage'?
   'lector-bilingue.html?edition='+encodeURIComponent(r.edition.id)+'&locus='+encodeURIComponent(r.locus)+'&q='+encodeURIComponent(currentQuery):
   pdfLink(r.edition,r.page);
  if(r.source!=='passage'){a.target='_blank';a.rel='noopener noreferrer'}
  actions.append(a);
  if(r.locus&&r.verified){
   const link=el('a','','Abrir locus en el lector');
   link.href='lector-bilingue.html?edition='+encodeURIComponent(r.edition.id)+'&locus='+encodeURIComponent(r.locus);
   actions.append(link);
  }
  if(r.source==='passage'&&r.notes?.length){
   const section=el('details','critical-unified-notes'),sum=el('summary','','Notas con locus explícito en esta edición ('+r.notes.length+')');section.append(sum);
   for(const n of r.notes){
    const para=el('p','critical-unified-text','Nota '+(n.footnote_id||'')+': '+n.text);section.append(para);
   }
   full.append(section);
  }
  details.append(full);card.append(head,h,counts,details,actions);target.append(card);
 }
 shown+=batch.length;more.hidden=shown>=visible.length;
 more.textContent='Mostrar más ('+shown+' de '+visible.length+' unidades)';
}
async function run(){
 const query=q.value.trim();if(!query)return;
 const id=++revision;visible=[];shown=0;target.replaceChildren();more.hidden=true;currentQuery=query;
 status.textContent='Leyendo textos, notas y comentarios de las ediciones seleccionadas…';
 const chosen=EDITIONS.filter(e=>!edition.value||e.id===edition.value);
 const paths=chosen.map(e=>'data/structured/'+e.id+'.json');
 const tasks=[...paths,'data/critical-notes.json','data/apparatus-index.json'];
 const settled=await Promise.allSettled(tasks.map(getJson));
 if(id!==revision)return;
 const data=new Map(tasks.map((p,i)=>[p,settled[i].status==='fulfilled'?settled[i].value:null]));
 const failures=tasks.filter((p,i)=>settled[i].status!=='fulfilled');
 const notes=data.get('data/critical-notes.json')?.entries||[];
 const notesByLocus=new Map();
 for(const n of notes){
  if(!n.locus||n.mapping_status!=='explicit_in_anchor')continue;
  const k=n.edition+'|'+locusKey(n.locus);const list=notesByLocus.get(k)||[];list.push(n);notesByLocus.set(k,list);
 }
 for(const e of chosen){
  const corpus=data.get('data/structured/'+e.id+'.json');
  if(!corpus)continue;
  for(const p of corpus.passages||[]){
   for(const [fieldName,text,other] of [['latin',p.latin,p.translation],['translation',p.translation,p.latin]]){
    if(field.value!=='all'&&field.value!=='passages'&&field.value!==fieldName)continue;
    if(field.value==='passages'||field.value==='all'||field.value===fieldName){
     const rec=record('passage',e,text,{field:fieldName,other,locus:p.locus,
      notes:notesByLocus.get(e.id+'|'+locusKey(p.locus))||[]});
     if(rec)visible.push(rec);
    }
   }
  }
 }
 if(field.value==='all'||field.value==='apparatus'){
  const idx=data.get('data/apparatus-index.json');
  for(const n of idx?.entries||[]){
   const e=edById.get(n.edition);if(!e||!chosen.some(x=>x.id===e.id)||n.source==='nota')continue;
   const rec=record('apparatus',e,n.text,{page:n.page,locus:n.locusMention||(n.loci||[])[0]||null,
    verified:!!n.locusInHeading,title:n.label});
   if(rec)visible.push(rec);
  }
  for(const n of notes){
   const e=edById.get(n.edition);if(!e||!chosen.some(x=>x.id===e.id))continue;
   const rec=record('note',e,n.text,{noteId:n.footnote_id,sourceParagraph:n.source_paragraph,
    locus:n.locus||n.candidate_locus,verified:n.mapping_status==='explicit_in_anchor'});
   if(rec)visible.push(rec);
  }
 }
 // Documentary order: edition > text passages > PDF blocks > stand-alone notes.
 const sourceOrder={passage:0,apparatus:1,note:2};
 visible.sort((a,b)=>EDITIONS.indexOf(a.edition)-EDITIONS.indexOf(b.edition)||
  sourceOrder[a.source]-sourceOrder[b.source]||
  String(a.locus||'').localeCompare(String(b.locus||''),undefined,{numeric:true})||
  (a.page||0)-(b.page||0));
 countAndList();
 if(failures.length)status.textContent+=' Atención: '+failures.length+' fuente(s) no cargaron ('+failures.join(', ')+'); el recuento es parcial.';
 if(!visible.length)target.append(el('p','critical-unified-empty','No se registran coincidencias en los textos accesibles para la consulta y filtros actuales.'));
 renderNext();
}
form.addEventListener('submit',event=>{event.preventDefault();void run()});
more.addEventListener('click',renderNext);
const initial=new URLSearchParams(location.search).get('q');
if(initial&&initial.trim()){q.value=initial;void run()}
})();