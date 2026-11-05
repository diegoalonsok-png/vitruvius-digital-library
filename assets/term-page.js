/* Ficha de término latino de De architectura, compartida por la Biblioteca y Vitruvia.
   termino.html?t=symmetria — reúne: léxico, locus definitorio con traducciones (V514 · V554 · V297),
   apariciones por libro y por prefacio / capítulos con su folio en el Codex H, aparato crítico,
   láminas relacionadas y estudios. Sin parámetro: índice de términos. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const cite=l=>{const [b,...r]=String(l).split(".");return "Vitr. "+(R[+b]||b)+"."+r.join(".").replace(/^praef\./,"praef. ")};
// Normalización que conserva la longitud (para resaltar sobre el texto original).
const fold=s=>Array.from(String(s||"")).map(c=>{const b=(c.normalize("NFD")[0]||c).toLowerCase();return b==="j"?"i":b==="v"?"u":b}).join("");
const J=u=>fetch(u).then(r=>{if(!r.ok)throw Error(u+" HTTP "+r.status);return r.json()});
async function main(){
 const root=$("term"),q=new URLSearchParams(location.search).get("t")||"";
 const [lex,defs,es,fr,en]=await Promise.all([J("data/latin-lexicon.json"),J("data/term-definitions.json"),J("data/structured/recensio-es.json"),J("data/structured/recensio-fr.json"),J("data/structured/theory-en.json")]);
 const E=lex.entries||[];
 if(!q.trim()){renderIndex(root,E,defs);return}
 const fq=fold(q.trim());
 const entry=E.find(e=>fold(e.lemma)===fq||(e.forms||[]).some(f=>fold(f)===fq)||(e.aliases||[]).some(a=>fold(a)===fq))||null;
 const lemma=entry?entry.lemma:q.trim().toLowerCase();
 const forms=[...new Set([lemma,...(entry?.forms||[])].map(fold))];
 const stem=lemma.length>6?fold(lemma).slice(0,lemma.length-1):null;
 const re=new RegExp("(^|[^a-z])("+[...forms,...(stem?[stem+"[a-z]*"]:[])].sort((a,b)=>b.length-a.length).join("|")+")(?![a-z])","g");
 const P=es.passages||[],tr={es:new Map(P.map(p=>[p.locus,p])),fr:new Map((fr.passages||[]).map(p=>[p.locus,p])),en:new Map((en.passages||[]).map(p=>[p.locus,p]))};
 const hits=[];for(const p of P){const t=fold(p.latin);re.lastIndex=0;let m,n=0,first=-1;while((m=re.exec(t))){n++;if(first<0)first=m.index+m[1].length}if(n)hits.push({p,n,first})}
 const total=hits.reduce((s,h)=>s+h.n,0);
 document.title=lemma+" · Ficha de término · Vitruvius Digital Library";
 const def=defs.terms[lemma];
 root.innerHTML='<p class="term-eyebrow">Ficha de término · De architectura</p><div class="term-head"><h1 lang="la">'+esc(entry?.headword||lemma)+'</h1>'+
  (entry?'<p>'+esc(entry.pos||"")+(entry.greek?' · <span lang="grc">'+esc(entry.greek)+'</span>':'')+'</p><p class="forms" lang="la">Formas: '+esc((entry.forms||[]).join(", "))+'</p>':'<p>Término sin entrada en el léxico del sitio; se buscan sus formas en el latín de V514.</p>')+
  '<p><strong>'+total+'</strong> apariciones en <strong>'+hits.length+'</strong> pasajes del latín de V514.</p><p id="term-save"></p></div><div class="term-grid" id="term-grid"></div>'+
  '<section class="term-section" id="term-dist"><h2>Distribución por libro</h2></section><section class="term-section" id="term-occ"><h2>Apariciones · por prefacio y capítulos, con folio en el Codex H</h2></section>'+
  '<section class="term-section" id="term-app"><h2>Aparato crítico y notas · ediciones de Diego Kurilo</h2><p>Consultando…</p></section><section class="term-section" id="term-lam" hidden><h2>Láminas históricas relacionadas</h2></section>'+
  '<section class="term-section" id="term-bib" hidden><h2>Estudios del repertorio</h2></section>'+
  '<p style="margin-top:30px"><a href="vitruvia.html?q='+encodeURIComponent(lemma)+'&mode=all">Ampliar en Vitruvia (enciclopedia y web académica) ↗</a> · <a href="termino.html">Índice de términos</a></p>';
 if(window.ResearchFolder)$("term-save").append(ResearchFolder.button({id:"term:"+lemma,kind:"term",title:"Término «"+lemma+"» en Vitruvio",ref:total+" apariciones; "+(def?"definición "+cite(def.locus):""),url:"termino.html?t="+encodeURIComponent(lemma)}));
 // Cuadro de léxico y definición
 const grid=$("term-grid");
 if(entry){const b=document.createElement("div");b.className="term-box";b.innerHTML='<h2>Léxico</h2><p><b>ES</b> '+esc(entry.es||"—")+'<br><b>FR</b> '+esc(entry.fr||"—")+'<br><b>EN</b> '+esc(entry.en||"—")+'</p>'+(entry.senses?.length?'<p>'+esc(entry.senses.join(" · "))+'</p>':'')+(entry.vitruvian?'<p><i>'+esc(entry.vitruvian)+'</i></p>':'')+(entry.verified===false?'<p style="font-size:.85em;opacity:.75">Entrada léxica orientativa, no verificada.</p>':'');grid.append(b)}
 if(def){const p=tr.es.get(def.locus);if(p){const b=document.createElement("div");b.className="term-box term-def";b.style.gridColumn="span 2";
  b.innerHTML='<h2>'+esc(def.label)+' · '+esc(cite(def.locus))+'</h2><blockquote lang="la">'+mark(p.latin,re)+'</blockquote>'+
   ['es','fr','en'].map(k=>{const x=tr[k].get(def.locus);return x?'<p><b>'+({es:"V514",fr:"V554",en:"V297"}[k])+'</b> '+esc(x.translation||"")+'</p>':""}).join("")+
   '<p><a href="lector-bilingue.html?edition=recensio-es&locus='+encodeURIComponent(def.locus)+'&q='+encodeURIComponent(lemma)+'">Leer en el lector bilingüe →</a> · <a href="laboratorio-h.html?locus='+encodeURIComponent(def.locus)+'">Lectura paralela con el Codex H →</a></p>';grid.append(b)}}
 // Distribución
 const dist=$("term-dist"),bars=document.createElement("div");bars.className="term-bars";const per=Array(11).fill(0);hits.forEach(h=>per[h.p.book]+=h.n);const mx=Math.max(1,...per);
 for(let b=1;b<=10;b++){const a=document.createElement("a");a.href="#libro-"+b;a.title="Libro "+R[b]+": "+per[b];a.innerHTML='<span>'+per[b]+'</span><span class="b" style="height:'+Math.round(70*per[b]/mx)+'px"></span><span>'+R[b]+'</span>';bars.append(a)}
 dist.append(bars);
 // Apariciones agrupadas
 const occ=$("term-occ"),C=window.CodexHConcordance;let data=null;try{data=C&&await C.load()}catch{}
 if(!hits.length)occ.append(Object.assign(document.createElement("p"),{textContent:"No aparece en el latín de V514."}));
 const groups=new Map();for(const h of hits){const k=h.p.book+"|"+(h.p.locus.includes(".praef.")?"praef":"cap");if(!groups.has(k))groups.set(k,[]);groups.get(k).push(h)}
 let gi=0;for(const [k,list] of groups){const [b,part]=k.split("|"),br=data?.bookRanges?.get(+b);
  const d=document.createElement("details");d.id=part==="praef"?"libro-"+b+"-praef":"libro-"+b;d.open=gi++<2;const s=document.createElement("summary");
  s.textContent="Libro "+R[b]+" · "+(part==="praef"?"Prefacio":"Capítulos")+(br?" · H, ff. "+(part==="praef"?br.start+"–"+(br.chapter1||br.end):(br.chapter1||br.start)+"–"+br.end):"")+" · "+list.reduce((x,h)=>x+h.n,0);d.append(s);
  for(const h of list){const row=document.createElement("div");row.className="occ";
   const kw=document.createElement("span");kw.className="kw";kw.lang="la";kw.innerHTML='<a href="lector-bilingue.html?edition=recensio-es&locus='+encodeURIComponent(h.p.locus)+'&q='+encodeURIComponent(lemma)+'">'+esc(cite(h.p.locus))+'</a> · '+kwic(h.p.latin,h.first,re);
   const f=document.createElement("button");f.type="button";f.textContent="Folio en H";f.style.cssText="font:inherit;font-size:.85em";
   f.addEventListener("click",async()=>{const c=await C.locate(h.p.locus);const ex=c.exact.find(x=>x.status!=="catalogue"),fo=ex?ex.folio:c.estimate&&c.estimate.folio;
    if(fo)location.href="codex-h-folios-local.html?folio="+encodeURIComponent("f. "+fo);else f.textContent="sin folio"});
   C&&C.locate(h.p.locus).then(c=>{const ex=c.exact.find(x=>x.status!=="catalogue"),fo=ex?ex.folio:c.estimate&&c.estimate.folio;if(fo)f.textContent="H f. "+fo+(ex?" · verificado":" · estimado")}).catch(()=>{});
   row.append(kw,f);if(window.ResearchFolder)row.append(ResearchFolder.button({id:"passage:"+h.p.locus,kind:"passage",title:"Vitruvio, De architectura · "+cite(h.p.locus),ref:"«"+lemma+"» · V514",url:"lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(h.p.locus),locus:h.p.locus}));
   d.append(row)}
  occ.append(d)}
 // Aparato
 const app=$("term-app");try{const A=window.KuriloApparatus,rows=await A.search(lemma,{lang:"es",limit:8});app.querySelector("p").remove();
  if(!rows.length)app.append(Object.assign(document.createElement("p"),{textContent:"Sin entradas del aparato con este término."}));
  for(const e of rows){const r=A.toRow(e,lemma,"es"),div=document.createElement("div");div.className="occ";div.innerHTML='<span class="kw"><a href="'+esc(r.link)+'">'+esc(r.title)+'</a><br><small>'+esc(r.excerpt)+'</small></span><a href="'+esc(e.pdf)+'" target="_blank" rel="noopener">PDF ↗</a>';app.append(div)}}
 catch(err){app.querySelector("p").textContent="Aparato no disponible: "+err.message}
 // Láminas y estudios
 try{const L=await J("data/laminas-historicas.json?v=20261105-v1"),chs=new Set(hits.map(h=>h.p.locus.split(".").slice(0,2).join(".")));
  const rel=L.entries.filter(e=>fold([e.title,e.relation].join(" ")).includes(fold(lemma).slice(0,6))||(def&&e.locus&&e.locus.split(".").slice(0,2).join(".")===def.locus.split(".").slice(0,2).join(".")));
  if(rel.length){const sec=$("term-lam");sec.hidden=false;for(const e of rel.slice(0,8)){const a=document.createElement("a");a.href="iconografia-vitruviana.html#lamina-"+e.id;a.textContent=e.title+" · "+[e.folio,e.plate].filter(Boolean).join(" · ");a.style.cssText="display:block;margin:4px 0";sec.append(a)}}}catch{}
 try{const S=await J("data/academic-studies.json"),list=(Array.isArray(S)?S:Object.values(S).find(Array.isArray)||[]).filter(s=>fold([s.title,s.theme].join(" ")).includes(fold(lemma).slice(0,6)));
  if(list.length){const sec=$("term-bib");sec.hidden=false;for(const s of list.slice(0,10)){const p=document.createElement("p");p.innerHTML=esc(s.author)+', <i>'+esc(s.title)+'</i> ('+esc([s.publisher,s.year].filter(Boolean).join(", "))+')'+(s.url?' · <a href="'+esc(s.url)+'" target="_blank" rel="noopener">ficha ↗</a>':'');sec.append(p)}}}catch{}
}
function mark(latin,re){const t=fold(latin);let out="",last=0;re.lastIndex=0;let m;while((m=re.exec(t))){const s=m.index+m[1].length,e=s+m[2].length;out+=esc(latin.slice(last,s))+"<mark>"+esc(latin.slice(s,e))+"</mark>";last=e}return out+esc(latin.slice(last))}
function kwic(latin,at,re){const a=Math.max(0,at-90),b=Math.min(latin.length,at+130);return (a?"… ":"")+mark(latin.slice(a,b),re)+(b<latin.length?" …":"")}
function renderIndex(root,E,defs){
 root.innerHTML='<p class="term-eyebrow">Fichas de término · De architectura</p><h1 style="font-family:Georgia,serif;font-weight:500">Términos latinos de Vitruvio</h1><p>Cada ficha reúne la definición de Vitruvio con las traducciones de las tres ediciones, todas las apariciones ordenadas por prefacio y capítulo con su folio en el Codex H, el aparato crítico, las láminas y los estudios.</p>'+
  '<section class="term-section"><h2>Conceptos definidos por Vitruvio</h2><p class="term-index" lang="la">'+Object.keys(defs.terms).map(t=>'<a href="termino.html?t='+encodeURIComponent(t)+'">'+esc(t)+'</a>').join("")+'</p></section>'+
  '<section class="term-section"><h2>Léxico del sitio</h2><p class="term-index" lang="la">'+E.map(e=>'<a href="termino.html?t='+encodeURIComponent(e.lemma)+'">'+esc(e.lemma)+'</a>').join("")+'</p></section>'+
  '<form class="term-section" onsubmit="event.preventDefault();location.href=\'termino.html?t=\'+encodeURIComponent(this.t.value)"><label>Otra palabra latina <input name="t" lang="la" placeholder="columna, modulus, aqua…" style="font:inherit;padding:6px 8px"></label> <button style="font:inherit">Abrir ficha</button></form>'}
main().catch(e=>{$("term").textContent="No se pudo cargar la ficha: "+e.message});
})();
