/* Vitruvia · ficha de búsqueda según la intención.
 * Al buscar, reconoce qué se pide y arma arriba de los resultados la ficha adecuada:
 *  · término latino o griego → traducción primero; después los loci de Vitruvio en las ediciones del sitio
 *    (latín + traducción castellana, francesa e inglesa), el folio del Codex H y el aparato crítico;
 *  · término castellano de la tradición vitruviana → los mismos loci, buscados en la traducción;
 *  · autor u obra clásica → lo que el sitio tiene para leer (Bibliotheca, Lector clásico, ediciones y PDF);
 *  · tema moderno (un disco, una persona actual) → ficha armada con Wikipedia y Wikidata.
 * Todo se lee del catálogo del sitio; las fuentes web se citan y enlazan.
 */
(()=>{
 'use strict';
 const results=document.getElementById('results');if(!results)return;
 const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 const latinKey=s=>fold(s).replace(/j/g,'i').replace(/v/g,'u');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const lang=()=>(document.documentElement.lang||'es').slice(0,2);
 const cache=new Map();
 const json=url=>{if(!cache.has(url))cache.set(url,fetch(url).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).catch(e=>{cache.delete(url);throw e}));return cache.get(url)};
 const EDITIONS=[
  {id:'recensio-es',v:'V514',lang:'es',label:'Castellano',file:'data/structured/recensio-es.json'},
  {id:'recensio-fr',v:'V554',lang:'fr',label:'Francés',file:'data/structured/recensio-fr.json'},
  {id:'theory-en',v:'V297',lang:'en',label:'Inglés',file:'data/structured/theory-en.json'}
 ];
 const ES_STOP=new Set('de la el los las un una y o en que por para con del al se su sus es son como mas pero sin sobre entre desde hasta este esta estos estas lo le les ya muy tambien'.split(' '));
 // Palabras que describen pero no identifican (se ignoran al reconocer un autor u obra).
 const GENERIC=new Set('poeta poetas poesia romano romana romanos griego griega griegos latino latina latin filosofo filosofa historiador historiadora orador escritor autor autora obra obras libro libros texto textos leer lectura antiguo antigua antiguedad clasico clasica clasicos siglo vida biografia poema poemas tratado tratados arquitecto arquitectura dramaturgo tragedia comedia historia historias parte segunda primera tercera libro imperador emperador rey reina papa santo santa'.split(' '));

 /* ---------- Interfaz ---------- */
 const panel=document.createElement('section');panel.id='vitruvia-term-panel';panel.hidden=true;panel.setAttribute('aria-label','Ficha de la búsqueda');
 const style=document.createElement('style');style.textContent=`
#vitruvia-term-panel{margin:0 0 28px;padding:22px 24px;border:1px solid var(--line,#313b38);border-radius:14px;background:var(--surface,#141b1a)}
#vitruvia-term-panel .vtp-kicker{font:600 11px/1.3 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--gold,#c6ad7b);margin:0 0 8px}
#vitruvia-term-panel h3{font:500 clamp(26px,3vw,38px)/1.1 Georgia,'Times New Roman',serif;margin:0 0 6px}
#vitruvia-term-panel .vtp-head{font:italic 17px/1.4 Georgia,serif;color:var(--muted,#a2a7a2);margin:0 0 10px}
#vitruvia-term-panel .vtp-tr{font-size:19px;line-height:1.5;margin:0 0 6px}
#vitruvia-term-panel .vtp-tr b{color:var(--gold,#c6ad7b);font-weight:600}
#vitruvia-term-panel .vtp-note{font-size:13px;color:var(--muted,#a2a7a2);margin:4px 0 0}
#vitruvia-term-panel h4{font:600 12px/1.3 Arial,Helvetica,sans-serif;letter-spacing:.12em;text-transform:uppercase;margin:22px 0 10px;padding-top:16px;border-top:1px solid var(--line,#313b38);color:var(--ink,#f6f4ed)}
#vitruvia-term-panel .vtp-loci{display:grid;gap:10px}
#vitruvia-term-panel .vtp-locus{display:grid;grid-template-columns:minmax(90px,120px) 1fr 1fr;gap:14px;padding:12px 0;border-bottom:1px solid var(--line,#313b38)}
#vitruvia-term-panel .vtp-locus:last-child{border-bottom:0}
#vitruvia-term-panel .vtp-ref{font:600 14px/1.3 Arial,Helvetica,sans-serif;color:var(--gold,#c6ad7b)}
#vitruvia-term-panel .vtp-ref small{display:block;font-weight:400;color:var(--muted,#a2a7a2);margin-top:4px}
#vitruvia-term-panel .vtp-la{font:italic 15.5px/1.5 Georgia,serif}
#vitruvia-term-panel .vtp-es{font-size:15px;line-height:1.5}
#vitruvia-term-panel mark{background:#f2d36b;color:#16130b;padding:0 2px;border-radius:2px}
#vitruvia-term-panel .vtp-actions{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px}
#vitruvia-term-panel .vtp-actions a,#vitruvia-term-panel .vtp-more,#vitruvia-term-panel .vtp-chip{display:inline-flex;align-items:center;gap:4px;font:500 12px/1.2 Arial,Helvetica,sans-serif;padding:6px 10px;border:1px solid var(--line,#3a4542);border-radius:999px;color:inherit;text-decoration:none;background:transparent;cursor:pointer}
#vitruvia-term-panel .vtp-actions a:hover,#vitruvia-term-panel .vtp-more:hover,#vitruvia-term-panel .vtp-chip:hover{border-color:var(--gold,#c6ad7b)}
#vitruvia-term-panel .vtp-books{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
#vitruvia-term-panel .vtp-book{border:1px solid var(--line,#313b38);border-radius:10px;padding:12px 14px;text-decoration:none;color:inherit;display:block}
#vitruvia-term-panel .vtp-book:hover{border-color:var(--gold,#c6ad7b)}
#vitruvia-term-panel .vtp-book b{display:block;font:500 16px/1.3 Georgia,serif;margin-bottom:4px}
#vitruvia-term-panel .vtp-book span{font-size:13px;color:var(--muted,#a2a7a2)}
#vitruvia-term-panel .vtp-web{display:grid;grid-template-columns:minmax(0,220px) 1fr;gap:20px;align-items:start}
#vitruvia-term-panel .vtp-web img{width:100%;max-height:300px;object-fit:contain;border-radius:8px;background:#fff1}
#vitruvia-term-panel dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;margin:12px 0 0;font-size:14px}
#vitruvia-term-panel dt{color:var(--muted,#a2a7a2)}#vitruvia-term-panel dd{margin:0}
#vitruvia-term-panel .vtp-chips{display:flex;flex-wrap:wrap;gap:6px}
@media(max-width:760px){#vitruvia-term-panel .vtp-locus{grid-template-columns:1fr}#vitruvia-term-panel .vtp-web{grid-template-columns:1fr}}
@media print{#vitruvia-term-panel .vtp-actions{display:none}}
html[data-theme=light] #vitruvia-term-panel{background:#fbf9f4;border-color:#ddd5c4}`;
 document.head.append(style);
 const welcome=document.getElementById('vitruvia-welcome');
 (results.querySelector('.section-head')||welcome)?.after(panel);

 /* ---------- Utilidades de texto ---------- */
 function markText(text,needles,max=320){
  const raw=String(text||'');const f=fold(raw).replace(/j/g,'i').replace(/v/g,'u');let at=-1,len=0;
  for(const n of needles){const k=latinKey(n);if(!k)continue;const re=new RegExp('(^|[^\\p{L}])('+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')(?![\\p{L}])','u');const m=re.exec(f);if(m){at=m.index+m[1].length;len=m[2].length;break}}
  if(at<0){const fe=fold(raw);for(const n of needles){const i=fe.indexOf(fold(n));if(i>=0){at=i;len=n.length;break}}}
  if(at<0)return esc(raw.slice(0,max))+(raw.length>max?'…':'');
  const a=Math.max(0,at-Math.round(max*.45)),b=Math.min(raw.length,a+max);
  return (a?'… ':'')+esc(raw.slice(a,at))+'<mark>'+esc(raw.slice(at,at+len))+'</mark>'+esc(raw.slice(at+len,b))+(b<raw.length?' …':'');
 }
 const roman=n=>['','I','II','III','IV','V','VI','VII','VIII','IX','X'][n]||n;
 const citeLocus=l=>{const [b,...r]=String(l).split('.');return 'Vitr. '+roman(+b)+'.'+r.join('.').replace(/^praef/,'praef')};
 async function spanish(text){
  try{if(!self.Translator)return null;const av=await self.Translator.availability({sourceLanguage:'en',targetLanguage:'es'});if(av==='unavailable')return null;
   const t=await self.Translator.create({sourceLanguage:'en',targetLanguage:'es'});return await t.translate(text)}catch{return null}
 }

 /* ---------- Reconocimiento ---------- */
 async function latinLemma(q){
  const toks=q.trim().split(/\s+/);if(toks.length>3)return null;
  const [lex,vl]=await Promise.all([json('data/latin-lexicon.json').catch(()=>({entries:[]})),json('data/classics-lexicon/vitruvius-la.json').catch(()=>null)]);
  const out=[];
  for(const tok of toks){
   const k=latinKey(tok);if(k.length<3)continue;
   const local=lex.entries.find(e=>[e.lemma,...(e.forms||[])].some(f=>latinKey(f)===k));
   let lemmas=[];if(vl){for(const [form,ls] of Object.entries(vl.forms))if(latinKey(form)===k){lemmas=ls;break}}
   if(!local&&!lemmas.length)return null;
   const lemma=local?.lemma||lemmas[0];const info=vl?.lemmas?.[lemma]||vl?.lemmas?.[lemmas[0]]||null;
   const forms=vl?Object.entries(vl.forms).filter(([,ls])=>ls.includes(lemma)).map(([f])=>f):(local?.forms||[tok]);
   out.push({token:tok,lemma,headword:local?.headword||info?.h||lemma,es:local?.es||'',senses:local?.senses||[],en:info?.g||local?.en||'',pos:local?.pos||'',forms:[...new Set([tok,...forms,...(local?.forms||[])])]});
  }
  return out.length?out:null;
 }
 function greekToLatin(g){
  let t=String(g).normalize('NFD');const rough=/^[\u0370-\u03ff\u1f00-\u1fff]\p{M}*\u0314/u.test(t)||/^\p{L}\p{M}*\u0314/u.test(t);
  t=t.replace(/\p{M}/gu,'').toLowerCase();
  const pairs=[['ου','u'],['γγ','ng'],['γκ','nc'],['αι','ae'],['οι','oe'],['ει','i'],['θ','th'],['φ','ph'],['χ','ch'],['ψ','ps'],['ξ','x'],['α','a'],['β','b'],['γ','g'],['δ','d'],['ε','e'],['ζ','z'],['η','e'],['ι','i'],['κ','c'],['λ','l'],['μ','m'],['ν','n'],['ο','o'],['π','p'],['ρ','r'],['σ','s'],['ς','s'],['τ','t'],['υ','y'],['ω','o']];
  for(const [a,b] of pairs)t=t.split(a).join(b);
  return (rough?'h':'')+t;
 }
 const loose=s=>latinKey(s).replace(/y/g,'i').replace(/ph/g,'f').replace(/th/g,'t').replace(/ch/g,'c').replace(/ae|oe/g,'e').replace(/([bcdfglmnprst])\1/g,'$1').replace(/k/g,'c');
 // Puente castellano → latín: glosas castellanas del léxico y parentesco ortográfico (simetría → symmetria).
 async function bridgeLatin(q){
  const toks=fold(q).split(/\s+/).filter(t=>t.length>=4&&!ES_STOP.has(t));if(toks.length!==1)return null;
  const t=toks[0];
  const [lex,vl]=await Promise.all([json('data/latin-lexicon.json').catch(()=>({entries:[]})),json('data/classics-lexicon/vitruvius-la.json').catch(()=>null)]);
  const byGloss=lex.entries.find(e=>fold(e.es||'').split(/[;,]\s*|\s+o\s+/).some(x=>x.trim()===t));
  if(byGloss)return byGloss.lemma;
  if(!vl)return null;const L=loose(t);if(L.length<5)return null;
  for(const lemma of Object.keys(vl.lemmas)){const k=loose(lemma);if(k===L||(k.length>=6&&(k.slice(0,-1)===L.slice(0,-1)&&Math.abs(k.length-L.length)<=1)))return lemma}
  return null;
 }
 async function greekLemma(q){
  if(!/[Ͱ-Ͽἀ-῿]/.test(q))return null;
  const g=await json('data/classics-lexicon/vitruvius-grc.json').catch(()=>null);
  const k=fold(q.trim());let lemma=null;
  if(g)for(const [form,ls] of Object.entries(g.forms))if(fold(form)===k){lemma=ls[0]?.[0]||form;break}
  const info=lemma&&g.lemmas[lemma];
  const lat=await latinLemma(greekToLatin(q.trim())).catch(()=>null);
  const l=lat?.[0];
  return [{token:q.trim(),lemma:lemma||q.trim(),headword:(lemma||q.trim())+(l?' · en latín: '+l.headword:''),en:info?.g||l?.en||'',es:l?.es||'',senses:l?.senses||[],forms:[q.trim(),greekToLatin(q.trim()),...(l?.forms||[])],greek:true}];
 }
 async function classicalWorks(q){
  const f=fold(q).replace(/[^\p{L}\p{N} ]/gu,' ').trim();if(f.length<4)return [];
  const toks=f.split(/\s+/).filter(t=>t.length>=4&&!ES_STOP.has(t)&&!GENERIC.has(t));if(!toks.length)return [];
  const [bib,perseus,cat,extra]=await Promise.all([
   json('data/bibliotheca-graeca-latina-I-bce-I-ce.json').catch(()=>({works:[]})),
   json('data/bibliotheca-perseus.json?v=20261105-v1').catch(()=>({links:{}})),
   json('data/clasicos-perseus.json').catch(()=>({works:[]})),
   json('data/clasicos-perseus-extra.json?v=20261106-ampliado-v1').catch(()=>({works:[]}))]);
  const words=s=>new Set(fold(s).split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>=4));
  const match=(set,t)=>set.has(t)||(t.length>=5&&[...set].some(x=>x.length>=5&&(x.startsWith(t)||t.startsWith(x))));
  const hits=[],seen=new Set();
  for(const w of bib.works||[]){
   const A=words(w.author),T=words([w.title,...(w.aliases||[]),w.id.replace(/-/g,' ')].join(' '));
   const a=toks.filter(t=>match(A,t)).length,ti=toks.filter(t=>match(T,t)).length;
   if(!a&&!ti)continue;if(a+ti<Math.min(toks.length,2)&&toks.length>1&&!a)continue;
   const obras=(perseus.links?.[w.id]||[]).map(x=>x.obra);
   hits.push({w,score:a*3+ti,readable:!!(w.localVersions?.length||obras.length),obras});obras.forEach(o=>seen.add(o));
  }
  // Obras del Lector clásico que la Bibliotheca no registra (mismo autor u obra).
  for(const x of [...(cat.works||[]),...(extra.works||[])]){
   if(seen.has(x.id))continue;
   const A=words(x.author+' '+(x.authorEn||'')),T=words(x.title);const a=toks.filter(t=>match(A,t)).length,ti=toks.filter(t=>match(T,t)).length;
   if(!a&&!ti)continue;
   hits.push({w:{id:null,title:x.title,author:x.author,dating:x.dates,lector:x.id},score:a*3+ti-0.5,readable:true,obras:[x.id]});seen.add(x.id);
  }
  return hits.sort((a,b)=>b.score-a.score||b.readable-a.readable).slice(0,12);
 }
 const VITRUVIUS=/\b(vitruvi[oa]s?|vitruvius|vitruve|vitruvio polion|marco vitruvio|de architectura)\b/;

 /* ---------- Ediciones y loci ---------- */
 async function lociFor(needles,{field='latin',limit=60}={}){
  const es=await json(EDITIONS[0].file);
  const keys=needles.map(n=>field==='latin'?latinKey(n):fold(n)).filter(k=>k.length>=3);
  const res=keys.map(k=>new RegExp('(^|[^\\p{L}])'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}])','u'));
  const out=[];
  for(const p of es.passages){
   const t=field==='latin'?latinKey(p.latin):fold(p.translation);
   if(res.some(r=>r.test(t)))out.push(p);
   if(out.length>=limit)break;
  }
  return out;
 }
 let folioMap=null;
 async function folioFor(locus){
  try{folioMap??=await json('data/codex-h/folio-locus-map.json');}catch{return null}
  const hit=folioMap.entries.find(e=>(e.loci||[]).some(l=>l.locus===locus))||folioMap.entries.find(e=>(e.loci||[]).some(l=>locus.startsWith(l.locus.split('.').slice(0,2).join('.')+'.')));
  return hit?.folio||null;
 }
 function lociBlock(passages,needles,{title,field='latin',term}){
  const box=document.createElement('div');
  const h=document.createElement('h4');h.textContent=title;box.append(h);
  const list=document.createElement('div');list.className='vtp-loci';box.append(list);
  const show=n=>{
   list.replaceChildren();
   for(const p of passages.slice(0,n)){
    const row=document.createElement('article');row.className='vtp-locus';
    const pages=(p.pdf_pages||[]).length?'PDF V514, p. '+p.pdf_pages[0]:'';
    row.innerHTML=`<div class="vtp-ref">${esc(citeLocus(p.locus))}<small>${esc(pages)}</small></div>
     <div class="vtp-la" lang="la">${field==='latin'?markText(p.latin,needles):esc(String(p.latin).slice(0,300))+(p.latin.length>300?' …':'')}</div>
     <div class="vtp-es" lang="es">${field==='translation'?markText(p.translation,needles):esc(String(p.translation).slice(0,300))+(p.translation.length>300?' …':'')}</div>
     <div class="vtp-actions"></div>`;
    const act=row.querySelector('.vtp-actions');
    const q=encodeURIComponent(term||needles[0]);
    for(const e of EDITIONS){const a=document.createElement('a');a.href=`lector-bilingue.html?edition=${e.id}&locus=${encodeURIComponent(p.locus)}&q=${q}`;a.textContent=`${e.v} · latín y ${e.label.toLowerCase()} ↗`;act.append(a)}
    const ap=document.createElement('a');ap.href='aparato-critico.html?locus='+encodeURIComponent(p.locus);ap.textContent='Aparato crítico ↗';act.append(ap);
    folioFor(p.locus).then(f=>{if(!f)return;const a=document.createElement('a');a.href='codex-h-folios-local.html?folio='+encodeURIComponent('f. '+f);a.textContent='Codex H · f. '+f+' ↗';act.append(a)});
    list.append(row);
   }
   if(passages.length>n){const more=document.createElement('button');more.type='button';more.className='vtp-more';more.textContent=`Ver ${Math.min(passages.length,n+10)-n} loci más (${passages.length} en total)`;more.onclick=()=>show(n+10);list.append(more)}
  };
  show(6);
  return box;
 }
 async function booksBlock(passages,needles,term){
  const box=document.createElement('div');const h=document.createElement('h4');h.textContent='En los libros del sitio';box.append(h);
  const grid=document.createElement('div');grid.className='vtp-books';box.append(grid);
  let cat=null;try{cat=await json('data/catalog.json')}catch{}
  const first=passages[0];
  for(const e of EDITIONS){
   const meta=cat?.editions?.find(x=>x.id===e.id);
   const a=document.createElement('a');a.className='vtp-book';
   a.href=first?`lector-bilingue.html?edition=${e.id}&locus=${encodeURIComponent(first.locus)}&q=${encodeURIComponent(term)}`:`lector-bilingue.html?edition=${e.id}`;
   a.innerHTML=`<b>${esc(meta?.title||'De architectura')} · ${e.v}</b><span>${esc(meta?.subtitle||'')} · latín y ${esc(e.label.toLowerCase())}${meta?.doi?' · DOI '+esc(meta.doi):''}</span><br><span>${passages.length?passages.length+' loci con el término':'Abrir la edición'}</span>`;
   grid.append(a);
  }
  const krohn=document.createElement('a');krohn.className='vtp-book';krohn.href='scriptorium.html?q='+encodeURIComponent(term);
  krohn.innerHTML='<b>Krohn 1912 · Rose 1899 · Barbaro 1567</b><span>Buscar el término en los PDF históricos indexados del Scriptorium (página del facsímil)</span>';grid.append(krohn);
  return box;
 }
 async function apparatusBlock(term){
  if(!window.KuriloApparatus)return null;
  let hits=[];try{hits=await window.KuriloApparatus.search(term,{lang:lang(),limit:4})}catch{return null}
  if(!hits.length)return null;
  const box=document.createElement('div');const h=document.createElement('h4');h.textContent='Aparato crítico de Diego Kurilo';box.append(h);
  const list=document.createElement('div');list.className='vtp-loci';box.append(list);
  for(const e of hits){const row=document.createElement('article');row.className='vtp-locus';
   const loc=e.locusMention||(e.loci||[])[0]||'';
   row.innerHTML=`<div class="vtp-ref">${esc(e.version)}${loc?'<small>'+esc(citeLocus(loc))+'</small>':''}<small>${esc(e.label||'')}</small></div><div class="vtp-es" style="grid-column:2/-1">${markText(window.KuriloApparatus.excerpt(e.text,term,420),[term])}</div><div class="vtp-actions"></div>`;
   const act=row.querySelector('.vtp-actions');
   if(loc){const a=document.createElement('a');a.href='aparato-critico.html?locus='+encodeURIComponent(loc);a.textContent='Ver en el aparato ↗';act.append(a)}
   if(e.pdf){const a=document.createElement('a');a.href=e.pdf;a.target='_blank';a.rel='noopener';a.textContent='PDF '+(e.page?'p. '+e.page:'')+' ↗';act.append(a)}
   list.append(row)}
  return box;
 }
 function corpusLink(term){
  const box=document.createElement('div');const h=document.createElement('h4');h.textContent='Más allá de Vitruvio';box.append(h);
  const c=document.createElement('div');c.className='vtp-chips';box.append(c);
  const a=document.createElement('a');a.className='vtp-chip';a.href='lector-clasico.html?cq='+encodeURIComponent(term)+'&extra=1';a.textContent='Buscar «'+term+'» en todo el corpus clásico (Perseus, First1KGreek, The Latin Library) ↗';c.append(a);
  const g=document.createElement('a');g.className='vtp-chip';g.href='termino.html?t='+encodeURIComponent(term);g.textContent='Ficha del término y glosario ↗';c.append(g);
  const l=document.createElement('a');l.className='vtp-chip';l.href='https://logeion.uchicago.edu/'+encodeURIComponent(term);l.target='_blank';l.rel='noopener';l.textContent='Diccionarios (Logeion) ↗';c.append(l);
  return box;
 }

 /* ---------- Locus: «II.8.11», «Vitr. 3.1.2», «1 praef 3» ---------- */
 const ROM={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
 function parseLocus(q){
  const m=fold(q).replace(/\b(vitr|vitruvio|vitruvius|de architectura|libro|liber|lib|cap|capitulo)\b\.?/g,' ').trim()
   .match(/^([ivx]+|\d{1,2})[\s.,:]+(praef(?:atio)?|pr|\d{1,2})(?:[\s.,:]+(\d{1,2}))?$/);
  if(!m)return null;
  const b=ROM[m[1]]||+m[1];if(!b||b>10)return null;
  const c=/^pr/.test(m[2])?'praef':String(+m[2]);
  return m[3]?`${b}.${c}.${+m[3]}`:`${b}.${c}`;
 }
 function bilingualReader(locus,term){
  const box=document.createElement('div');box.id='vitruvia-term-reader';
  const h=document.createElement('h4');h.textContent='Leer · latín y traducción enfrentados';box.append(h);
  const bar=document.createElement('div');bar.className='vtp-chips';box.append(bar);
  const sel=document.createElement('select');sel.className='vtp-chip';sel.setAttribute('aria-label','Traducción');
  for(const [id,txt] of [['recensio-es','Latín · castellano (V514)'],['theory-en','Latín · inglés (V297)'],['recensio-fr','Latín · francés (V554)']]){const o=document.createElement('option');o.value=id;o.textContent=txt;sel.append(o)}
  try{const pref=localStorage.getItem('vitruvia-reader-edition');if(pref)sel.value=pref}catch{}
  if(lang()==='en'&&!localStorage.getItem?.('vitruvia-reader-edition'))sel.value='theory-en';
  const full=document.createElement('a');full.className='vtp-chip';full.target='_blank';full.rel='noopener';
  bar.append(sel,full);
  const frame=document.createElement('iframe');frame.title='Lector bilingüe de De architectura';frame.style.cssText='width:100%;height:min(80vh,860px);border:1px solid var(--line,#313b38);border-radius:10px;margin-top:10px;background:#fff';box.append(frame);
  const load=()=>{const u=`lector-bilingue.html?edition=${sel.value}&locus=${encodeURIComponent(locus)}${term?'&q='+encodeURIComponent(term):''}`;frame.src=u+'&embed=1';full.href=u;full.textContent='Abrir en pantalla completa ↗';try{localStorage.setItem('vitruvia-reader-edition',sel.value)}catch{}};
  sel.onchange=load;load();
  return box;
 }
 /* ---------- Índice de páginas de todos los libros del sitio ---------- */
 const pnorm=s=>String(s||'').replace(/ſ/g,'s').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/j/g,'i').replace(/v/g,'u');
 async function pagesFor(groups){
  // groups: [[formas de la palabra 1], [formas de la palabra 2], …] → OR dentro del grupo, AND entre grupos.
  const meta=await json('data/pages-index/meta.json');
  const words=groups.map(g=>[...new Set(g.map(pnorm).filter(t=>/^[a-z]{4,30}$/.test(t)))]).filter(g=>g.length);
  if(!words.length)return null;
  const shard=async t=>{try{return await json('data/pages-index/'+t.slice(0,3)+'.json')}catch{return {}}};
  let acc=null;
  for(const g of words){
   const per={};
   for(const t of g){const d=(await shard(t))[t];if(!d)continue;for(const [src,pages] of Object.entries(d))(per[src]??=new Set),pages.forEach(p=>per[src].add(p))}
   if(!acc)acc=per;else{for(const src of Object.keys(acc)){if(!per[src]){delete acc[src];continue}acc[src]=new Set([...acc[src]].filter(p=>per[src].has(p)));if(!acc[src].size)delete acc[src]}}
  }
  return {meta,hits:acc||{}};
 }
 function pagesBlock(res,term){
  if(!res||!Object.keys(res.hits).length)return null;
  const box=document.createElement('div');box.id='vtp-pages';const h=document.createElement('h4');h.textContent='En las páginas de los libros del sitio';box.append(h);
  const note=document.createElement('p');note.className='vtp-note';note.textContent='Ediciones de Diego Kurilo y PDF históricos indexados. En las ediciones antiguas la coincidencia sale del OCR: es una pista de lectura, no un cotejo.';box.append(note);
  const list=document.createElement('div');list.className='vtp-loci';box.append(list);
  const order=[...res.meta.sources].sort((a,b)=>(res.hits[b.id]?.size||0)-(res.hits[a.id]?.size||0));
  for(const m of order){const pages=[...(res.hits[m.id]||[])].sort((a,b)=>a-b);if(!pages.length)continue;
   const row=document.createElement('article');row.className='vtp-locus';
   row.innerHTML=`<div class="vtp-ref">${esc(m.label.split(' · ')[0])}<small>${esc(m.label.split(' · ').slice(1).join(' · '))}</small></div><div class="vtp-es" style="grid-column:2/-1">${pages.length} página${pages.length>1?'s':''}</div><div class="vtp-actions"></div>`;
   const act=row.querySelector('.vtp-actions');
   for(const p of pages.slice(0,12)){const a=document.createElement('a');a.href=m.url.replace('{p}',p).replace('{q}',encodeURIComponent(term));a.target='_blank';a.rel='noopener';a.textContent='p. '+p+' ↗';act.append(a)}
   if(pages.length>12){const a=document.createElement('a');a.href='scriptorium.html?q='+encodeURIComponent(term);a.textContent=`+${pages.length-12} en el Scriptorium ↗`;act.append(a)}
   list.append(row)}
  return box;
 }
 async function appendPages(groups,term,token){
  const res=await pagesFor(groups).catch(()=>null);if(token!==seq)return;
  const b=pagesBlock(res,term);if(!b)return;
  panel.append(b);
 }

 /* ---------- Libros de Diego Kurilo y páginas, para cualquier búsqueda ---------- */
 async function kuriloBooks(q){
  let idx;try{idx=await json('data/kurilo-libros/index.json')}catch{return []}
  const toks=fold(q).split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>=4&&!ES_STOP.has(t));if(!toks.length)return [];
  return (idx.books||[]).filter(b=>{const hay=fold([...Object.values(b.titles||{}),...Object.values(b.subtitles||{}),...(b.subjects||[])].join(' '));return toks.some(t=>hay.split(/[^\p{L}\p{N}]+/u).some(w=>w===t||(t.length>=5&&w.startsWith(t))))});
 }
 async function appendSiteBooks(q,token){
  const books=await kuriloBooks(q).catch(()=>[]);if(token!==seq)return;
  // Capítulos de los libros del autor cuyo título trata lo buscado (en castellano, con su equivalente en inglés).
  try{
   const idx=await json('data/kurilo-libros/index.json');const toks=fold(q).split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>=4&&!ES_STOP.has(t)&&!GENERIC.has(t));
   const found=[];
   if(toks.length)for(const b of idx.books||[]){const book=await json(b.file);const es=book.editions.es,en=book.editions.en;if(!es)continue;
    const topEs=es.toc.filter(x=>x[0]===1),topEn=en?en.toc.filter(x=>x[0]===1):[];
    for(const x of es.toc){if(x[0]>3)continue;const f=fold(x[1]);if(!toks.every(t=>f.includes(t)))continue;
     let i=0;topEs.forEach((y,k)=>{if(y[2]<=x[2])i=k});
     found.push({b,title:x[1],page:x[2],lvl:x[0],enPage:topEn[i]?.[2]||null})}}
   if(token!==seq)return;
   if(found.length){const box=document.createElement('div');const h=document.createElement('h4');h.textContent='Capítulos de los libros de Diego Kurilo sobre el tema';box.append(h);
    const list=document.createElement('div');list.className='vtp-loci';box.append(list);
    for(const c of found.slice(0,8)){const row=document.createElement('article');row.className='vtp-locus';
     row.innerHTML=`<div class="vtp-ref">${esc(c.b.titles.es)}<small>p. ${c.page}</small></div><div class="vtp-es" style="grid-column:2/-1">${esc(c.title)}</div><div class="vtp-actions"></div>`;
     const act=row.querySelector('.vtp-actions');
     const a1=document.createElement('a');a1.href=`${c.b.page}?lang=es&page=${c.page}`;a1.textContent='Leer en castellano ↗';act.append(a1);
     if(c.enPage){const a2=document.createElement('a');a2.href=`${c.b.page}?lang=en&page=${c.enPage}`;a2.textContent='Read in English (chapter) ↗';act.append(a2)}
     list.append(row)}
    panel.append(box);panel.hidden=false}
  }catch{}
  if(books.length){
   const box=document.createElement('div');const h=document.createElement('h4');h.textContent='Libros de Diego Kurilo · castellano e inglés';box.append(h);
   const grid=document.createElement('div');grid.className='vtp-books';box.append(grid);
   for(const b of books){const a=document.createElement('div');a.className='vtp-book';
    a.innerHTML=`<b>${esc(b.titles.es||b.titles.en)}</b><span>${esc(b.subtitles?.es||'')}</span><div class="vtp-actions" style="margin-top:8px"></div>`;
    const act=a.querySelector('.vtp-actions');
    for(const [l,txt] of [['es','Leer en castellano'],['en','Read in English']])if(b.titles[l]){const x=document.createElement('a');x.href=`${b.page}?lang=${l}&q=${encodeURIComponent(q)}`;x.textContent=txt+' ↗';act.append(x)}
    grid.append(a)}
   panel.append(box);panel.hidden=false;
  }
  if(!panel.querySelector('#vtp-pages')){
   const res=await pagesFor(q.split(/\s+/).filter(t=>t.length>=4).map(t=>[t])).catch(()=>null);if(token!==seq||!res)return;
   const kinds=Object.fromEntries(res.meta.sources.map(m=>[m.id,m.kind]));
   if(Object.keys(res.hits).some(k=>kinds[k]==='edition')){const b=pagesBlock(res,q);if(b){panel.append(b);panel.hidden=false}}
  }
 }

 /* ---------- Fichas ---------- */
 async function renderLatin(q,lemmas,token,asked){
  const greek=lemmas[0].greek;
  panel.innerHTML=`<p class="vtp-kicker">${greek?'Término griego':'Término latino'} · traducción y loci vitruvianos</p>`+(asked?`<p class="vtp-note">«${esc(asked)}» corresponde en Vitruvio al término latino <i>${esc(q)}</i>.</p>`:'');
  for(const l of lemmas){
   const h=document.createElement('h3');h.lang=greek?'grc':'la';h.textContent=l.token;panel.append(h);
   const hw=document.createElement('p');hw.className='vtp-head';hw.textContent=[l.headword!==l.token?l.headword:'',l.pos].filter(Boolean).join(' · ')||('lema: '+l.lemma);panel.append(hw);
   const tr=document.createElement('p');tr.className='vtp-tr';
   if(l.es){tr.innerHTML='<b>Traducción:</b> '+esc(l.es)+(l.senses?.length?' — '+esc(l.senses.join(' ')):'');}
   else if(l.en){tr.innerHTML='<b>Traducción:</b> <span class="vtp-es-auto">…</span>';spanish(l.en).then(t=>{if(token!==seq)return;tr.querySelector('.vtp-es-auto').textContent=t||l.en;if(t){const n=document.createElement('p');n.className='vtp-note';n.textContent='Glosa del Lewis & Short («'+l.en+'»), traducida automáticamente en tu navegador.';tr.after(n)}else{const n=document.createElement('p');n.className='vtp-note';n.textContent='Glosa inglesa del Lewis & Short (sin traductor automático disponible en este navegador).';tr.after(n)}})}
   else tr.innerHTML='<b>Traducción:</b> sin glosa en el léxico local; consulta los diccionarios enlazados abajo.';
   panel.append(tr);
   if(l.forms.length>1){const f=document.createElement('p');f.className='vtp-note';f.textContent='Formas en Vitruvio: '+l.forms.slice(0,14).join(', ')+(l.forms.length>14?'…':'');panel.append(f)}
  }
  /* Puente al Lexicon: etimología, morfología y pasajes en todo el corpus griego y latino. */
  {const lx=document.createElement('div');lx.className='vtp-actions';const a=document.createElement('a');const w=lemmas[0].lemma||lemmas[0].token||q;a.href='vitruvia-lexicon.html?q='+encodeURIComponent(String(w).replace(/\d+$/,''))+'&mode=palabra';a.textContent='Vitruvia Lexicon · etimología, morfología y pasajes antiguos ↗';lx.append(a);panel.append(lx)}
  panel.hidden=false;
  const needles=[...new Set(lemmas.flatMap(l=>l.forms))];
  const passages=await lociFor(needles).catch(()=>[]);
  if(token!==seq)return;
  panel.append(lociBlock(passages,needles,{title:passages.length?`En Vitruvio · ${passages.length} loci de De architectura`:'En Vitruvio · sin loci con esta forma',term:q}));
  panel.append(await booksBlock(passages,needles,q));
  const ap=await apparatusBlock(q);if(token!==seq)return;if(ap)panel.append(ap);
  await appendPages(lemmas.map(l=>l.forms),q,token);if(token!==seq)return;
  panel.append(corpusLink(q));
 }
 async function renderVernacular(q,passages,token,works){
  panel.innerHTML=`<p class="vtp-kicker">Tema vitruviano · loci y libros del sitio</p><h3>${esc(q)}</h3><p class="vtp-head">El término aparece en la traducción castellana de De architectura (V514). Cada locus se abre en latín con su traducción castellana, francesa o inglesa.</p>`;
  panel.hidden=false;
  /* Puente al Lexicon: raíz semántica griega y latina, árbol etimológico y frecuencia en los clásicos. */
  if(!/\s/.test(q.trim())){const lx=document.createElement('div');lx.className='vtp-actions';const a=document.createElement('a');a.href='vitruvia-lexicon.html?q='+encodeURIComponent(q.trim());a.textContent='Vitruvia Lexicon · «'+q.trim()+'» en griego, latín, hebreo y egipcio, su etimología y su frecuencia en los clásicos ↗';lx.append(a);panel.append(lx)}
  panel.append(lociBlock(passages,[q],{title:`En Vitruvio · ${passages.length} loci`,field:'translation',term:q}));
  panel.append(await booksBlock(passages,[q],q));
  if(works?.length)panel.append(worksBlock(works));
  const ap=await apparatusBlock(q);if(token!==seq)return;if(ap)panel.append(ap);
  await appendPages(q.split(/\s+/).filter(t=>t.length>=4).map(t=>[t]),q,token);if(token!==seq)return;
  panel.append(corpusLink(q));
 }
 function worksBlock(hits){
  const box=document.createElement('div');const h=document.createElement('h4');h.textContent='Para leer en el sitio · Bibliotheca Graeca Latina';box.append(h);
  const grid=document.createElement('div');grid.className='vtp-books';box.append(grid);
  for(const {w,readable} of hits){const a=document.createElement('a');a.className='vtp-book';a.href=w.id?'bibliotheca-graeca-latina.html?work='+encodeURIComponent(w.id):'lector-clasico.html?obra='+encodeURIComponent(w.lector);
   a.innerHTML=`<b>${esc(w.title)}</b><span>${esc(w.author)}${w.dating?' · '+esc(w.dating):''}</span><br><span>${readable?'Texto original'+(w.localVersions?.length?' y ediciones del sitio':' y traducción en el visor'):'Ficha, testimonios y fuentes'}</span>`;grid.append(a)}
  return box;
 }
 async function renderClassical(q,hits,token,isVitruvius){
  panel.innerHTML=`<p class="vtp-kicker">${isVitruvius?'Vitruvio · ediciones, códices y loci del sitio':'Autor u obra clásica · lo que puedes leer en el sitio'}</p><h3>${esc(isVitruvius?'Marco Vitruvio Polión · De architectura':q)}</h3>`;
  if(isVitruvius){
   const p=document.createElement('p');p.className='vtp-head';p.textContent='Arquitecto e ingeniero romano (siglo I a. C.), autor del único tratado de arquitectura conservado de la Antigüedad, en diez libros dedicados a Augusto.';panel.append(p);
   const bio=document.createElement('div');bio.className='vtp-chips';
   for(const [href,txt] of [['#vitruvia-article','Biografía enciclopédica ↓'],['lector-bilingue.html?edition=recensio-es','Leer De architectura · latín y castellano'],['codex-h-folios-local.html','Codex Harleianus H · 341 folios'],['aparato-critico.html','Aparato crítico'],['concordancia-historica.html','Concordancia de ediciones históricas'],['scriptorium.html','Scriptorium · PDF históricos']]){const a=document.createElement('a');a.className='vtp-chip';a.href=href;a.textContent=txt;bio.append(a)}
   panel.append(bio);panel.hidden=false;
   panel.append(bilingualReader('1.praef.1',''));
   panel.append(await booksBlock([],[],'Vitruvius'));
  }else{
   const top=hits[0]?.w;
   const p=document.createElement('p');p.className='vtp-head';p.textContent=top?(top.author+(top.dating?' · '+top.dating:'')):'';panel.append(p);
   panel.hidden=false;
   const readable=hits.filter(h=>h.obras?.length);
   // Biografía desde la web (Wikipedia/Wikidata) del autor reconocido; el libro, en el visor del sitio.
   const bioSlot=document.createElement('div');panel.append(bioSlot);
   const who=top?String(top.author).replace(/\(.*?\)/g,'').split(/[,·]/)[0].trim():q;
   webSummary(who).then(d=>{if(token!==seq||!d)return;const h=document.createElement('h4');h.textContent='Biografía · información de la web';bioSlot.append(h,webBlock(d,{heading:false}))});
   if(readable.length)panel.append(readerBlock(readable));
  }
  if(hits.length)panel.append(worksBlock(hits));
  if(token!==seq)return;
 }
 // Visor de lectura dentro de la ficha: códice más antiguo cuando hay imágenes, original y traducción.
 function readerBlock(readable){
  const box=document.createElement('div');box.id='vitruvia-term-reader';const h=document.createElement('h4');h.textContent='Leer ahora · original y traducción';box.append(h);
  const bar=document.createElement('div');bar.className='vtp-chips';box.append(bar);
  const opts=readable.flatMap(x=>x.obras.slice(0,x.obras.length>12?1:x.obras.length).map(o=>({o,label:x.w.title+(x.obras.length>1&&x.obras.length<=12?' · '+o.split('.').pop():'')})));
  const sel=document.createElement('select');sel.className='vtp-chip';sel.setAttribute('aria-label','Obra');
  for(const {o,label} of opts){const op=document.createElement('option');op.value=o;op.textContent=label;sel.append(op)}
  const full=document.createElement('a');full.className='vtp-chip';full.target='_blank';full.rel='noopener';
  const edPdf=document.createElement('a'),edDoc=document.createElement('a');
  for(const [a,l] of [[edPdf,'Edición PDF'],[edDoc,'Edición DOCX']]){a.className='vtp-chip';a.textContent=l;a.setAttribute('download','');a.hidden=true}
  bar.append(sel,full,edPdf,edDoc);
  const frame=document.createElement('iframe');frame.title='Lector clásico';frame.style.cssText='width:100%;height:min(78vh,820px);border:1px solid var(--line,#313b38);border-radius:10px;margin-top:10px;background:#fff';box.append(frame);
  const load=o=>{frame.src='lector-clasico.html?obra='+encodeURIComponent(o)+'&embed=1';full.href='lector-clasico.html?obra='+encodeURIComponent(o);full.textContent='Abrir en pantalla completa ↗';
   json('data/clasicos-descargas.json?v=20261106-v1').then(d=>{const e=d?.works?.[o];edPdf.hidden=edDoc.hidden=!e;if(e){edPdf.href=e.pdf;edDoc.href=e.docx;edPdf.title=e.kb.pdf+' KB';edDoc.title=e.kb.docx+' KB'}}).catch(()=>{edPdf.hidden=edDoc.hidden=true})};
  sel.onchange=()=>load(sel.value);if(opts.length<2)sel.hidden=true;load(opts[0].o);
  return box;
 }
 async function webSummary(q){
  const L=lang()==='en'?'en':'es';let page=null;
  for(const wl of [L,L==='es'?'en':'es']){
   try{
    const s=await fetch(`https://${wl}.wikipedia.org/w/api.php?`+new URLSearchParams({action:'query',list:'search',srsearch:q,srlimit:'1',format:'json',origin:'*'})).then(r=>r.json());
    const t=s?.query?.search?.[0]?.title;if(!t)continue;
    const sum=await fetch(`https://${wl}.wikipedia.org/api/rest_v1/page/summary/`+encodeURIComponent(t.replace(/ /g,'_'))).then(r=>r.ok?r.json():null);
    if(sum&&sum.type!=='disambiguation'){page={...sum,wl};break}
   }catch{}
  }
  if(!page)return null;
  const facts=[];
  if(page.wikibase_item){try{
   const w=await fetch('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:page.wikibase_item,props:'claims',format:'json',origin:'*'})).then(r=>r.json());
   const c=w.entities?.[page.wikibase_item]?.claims||{};
   const val=p=>(c[p]||[]).map(x=>x.mainsnak?.datavalue?.value).filter(Boolean);
   const time=p=>val(p).map(v=>{const t=String(v.time||'');const bc=t.startsWith('-');const y=t.replace(/^[+-]/,'').slice(0,10).replace(/-00-00$/,'').replace(/-00$/,'').replace(/^0+/,'');return y+(bc?' a. C.':'')})[0];
   const ids=p=>val(p).map(v=>v.id).filter(Boolean);
   const want={P569:['Nacimiento','time'],P570:['Muerte','time'],P577:['Publicación','time'],P571:['Fundación o inicio','time'],P106:['Ocupación','ids'],P175:['Intérprete','ids'],P136:['Género','ids'],P264:['Sello','ids'],P50:['Autor','ids'],P57:['Dirección','ids'],P800:['Obras destacadas','ids'],P495:['País','ids'],P27:['Nacionalidad','ids'],P19:['Lugar de nacimiento','ids']};
   const pend=[];for(const [p,[label,kind]] of Object.entries(want)){if(kind==='time'){const t=time(p);if(t)facts.push([label,t])}else{const v=ids(p).slice(0,4);if(v.length)pend.push([label,v])}}
   const all=[...new Set(pend.flatMap(x=>x[1]))];
   if(all.length){const lb=await fetch('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:all.slice(0,48).join('|'),props:'labels',languages:L+'|en',format:'json',origin:'*'})).then(r=>r.json());
    for(const [label,v] of pend)facts.push([label,v.map(id=>lb.entities?.[id]?.labels?.[L]?.value||lb.entities?.[id]?.labels?.en?.value||id).join(', ')])}
  }catch{}}
  return {page,facts,q};
 }
 function webBlock({page,facts,q},{heading=true}={}){
  const wrap=document.createElement('div');wrap.className='vtp-web';
  const img=page.thumbnail?.source||page.originalimage?.source;
  wrap.innerHTML=(img?`<a href="${esc(page.content_urls?.desktop?.page||'#')}" target="_blank" rel="noopener"><img src="${esc(img)}" alt="${esc(page.title)}" loading="lazy"></a>`:'<div></div>')+
   `<div>${heading?`<h3>${esc(page.title)}</h3>`:`<p class="vtp-tr"><b>${esc(page.title)}</b></p>`}${page.description?`<p class="vtp-head">${esc(page.description)}</p>`:''}<p class="vtp-es">${esc(page.extract||'')}</p>${facts.length?'<dl>'+facts.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')+'</dl>':''}<div class="vtp-chips" style="margin-top:14px"></div><p class="vtp-note">Fuente: Wikipedia (${esc(page.wl)}) y Wikidata, CC BY-SA. La imagen enlaza a su ficha con autor y licencia.</p></div>`;
  const chips=wrap.querySelector('.vtp-chips');
  const links=[[page.content_urls?.desktop?.page,'Wikipedia ↗'],[page.wikibase_item&&'https://www.wikidata.org/wiki/'+page.wikibase_item,'Wikidata ↗'],['https://duckduckgo.com/?q='+encodeURIComponent(q),'Buscar en la web ↗']];
  if(facts.some(([k])=>k==='Intérprete'||k==='Sello'))links.push(['https://musicbrainz.org/search?type=release_group&query='+encodeURIComponent(q),'MusicBrainz ↗']);
  for(const [h,t] of links){if(!h)continue;const a=document.createElement('a');a.className='vtp-chip';a.href=h;a.target='_blank';a.rel='noopener';a.textContent=t;chips.append(a)}
  return wrap;
 }
 async function renderWeb(q,token){
  const data=await webSummary(q);if(token!==seq||!data)return;
  panel.innerHTML=`<p class="vtp-kicker">Información de la web · Wikipedia y Wikidata</p>`;
  panel.append(webBlock(data));panel.hidden=false;
 }

 async function renderLocus(locus,token){
  const roman=['','I','II','III','IV','V','VI','VII','VIII','IX','X'];const [b,...r]=locus.split('.');
  panel.innerHTML=`<p class="vtp-kicker">Locus de De architectura · latín y traducciones</p><h3>Vitr. ${esc(roman[+b]+'.'+r.join('.'))}</h3>`;
  panel.hidden=false;
  let p=null;try{const es=await json(EDITIONS[0].file);p=es.passages.find(x=>x.locus===locus)||es.passages.find(x=>x.locus.startsWith(locus+'.'))}catch{}
  if(token!==seq)return;
  if(p){const d=document.createElement('p');d.className='vtp-head';d.textContent=(p.translation||'').slice(0,320)+((p.translation||'').length>320?' …':'');panel.append(d)}
  const chips=document.createElement('div');chips.className='vtp-chips';
  const links=[['aparato-critico.html?locus='+encodeURIComponent(p?.locus||locus),'Aparato crítico ↗']];
  const f=await folioFor(p?.locus||locus);if(token!==seq)return;
  if(f)links.push(['codex-h-folios-local.html?folio='+encodeURIComponent('f. '+f),'Codex H · f. '+f+' ↗']);
  if(p?.pdf_pages?.length)links.push(['documents/kurilo-recensio-es.pdf#page='+p.pdf_pages[0],'PDF V514 · p. '+p.pdf_pages[0]+' ↗']);
  for(const [h,t] of links){const a=document.createElement('a');a.className='vtp-chip';a.href=h;a.textContent=t;chips.append(a)}
  panel.append(chips);
  panel.append(bilingualReader(p?.locus||locus,''));
 }
 /* ---------- Orquestación ---------- */
 let seq=0;
 async function run(q){
  const token=++seq;panel.hidden=true;panel.replaceChildren();
  q=String(q||'').trim();if(!q)return;
  try{
   const fq=fold(q);
   const locus=parseLocus(q);if(locus){await renderLocus(locus,token);return}
   const isV=VITRUVIUS.test(fq);
   if(!isV){
    const lat=await greekLemma(q)||await latinLemma(q);
    if(token!==seq)return;
    if(lat){await renderLatin(q,lat,token);return}
    const bridged=await bridgeLatin(q);if(token!==seq)return;
    if(bridged){const l=await latinLemma(bridged);if(token!==seq)return;if(l){await renderLatin(bridged,l,token,q);return}}
   }
   const works=await classicalWorks(q);if(token!==seq)return;
   if(isV||works.length){await renderClassical(q,works,token,isV);return}
   const toks=fq.split(/\s+/).filter(t=>t.length>3&&!ES_STOP.has(t));
   if(toks.length&&toks.length<=3){
    const passages=await lociFor([q],{field:'translation',limit:80}).catch(()=>[]);
    if(token!==seq)return;
    if(passages.length>=2){await renderVernacular(q,passages,token,works);return}
   }
   await renderWeb(q,token);
  }catch(e){if(token===seq&&!panel.childElementCount){panel.hidden=true}}
  finally{if(token===seq&&!parseLocus(q))appendSiteBooks(q,token).catch(()=>{})}
 }
 window.addEventListener('vitruvia:search',e=>run(e.detail?.query));
 // Métrica de lectura: además de las lecturas verificadas del sitio, las obras legibles en el visor clásico.
 (async()=>{try{
  const [links,bib]=await Promise.all([json('data/bibliotheca-perseus.json?v=20261105-v1'),json('data/bibliotheca-graeca-latina-I-bce-I-ce.json')]);
  const n=(bib.works||[]).filter(w=>w.localVersions?.length||links.links?.[w.id]).length;
  const holder=document.getElementById('metric-read')?.parentElement;if(!holder||!n)return;
  const span=document.createElement('span');span.id='metric-viewer';span.title='Obras de la Bibliotheca Graeca Latina con texto original (y traducción cuando existe) en el visor: textos del sitio, Perseus, First1KGreek y The Latin Library';
  span.innerHTML='<b>'+n+'</b> obras clásicas en el visor';holder.after(span);
 }catch{}})();
 window.VitruviaTermPanel={run,classicalWorks,version:'1.2'};
})();
