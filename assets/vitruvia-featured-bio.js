/* Vitruvia · biografía breve en el panel derecho («Destacado»).
 * Para personas: nombre en griego o latín cuando corresponde, nacimiento y muerte (Wikidata),
 * retrato oficial de Wikidata (fotografía, busto o pintura), la fórmula principal encima del retrato
 * en los matemáticos y científicos, los loci donde Vitruvio los menciona y, si sus obras están en la
 * biblioteca, un acceso directo al visor de lectura. Las fuentes quedan citadas y enlazadas.
 */
(()=>{
 'use strict';
 const box=document.getElementById('featured');if(!box)return;
 const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const lang=()=>(document.documentElement.lang||'es').slice(0,2);
 const L=k=>({es:{born:'Nacimiento',died:'Muerte',read:'Leer su obra en el visor',vitr:'Mencionado por Vitruvio',bc:'a. C.',c:'c.',century:'siglo',src:'Datos: Wikidata · nombres antiguos: Onomasticon Vitruvianum'},
  en:{born:'Born',died:'Died',read:'Read the work in the viewer',vitr:'Mentioned by Vitruvius',bc:'BCE',c:'c.',century:'century',src:'Data: Wikidata · ancient names: Onomasticon Vitruvianum'},
  fr:{born:'Naissance',died:'Mort',read:'Lire l’œuvre dans la visionneuse',vitr:'Cité par Vitruve',bc:'av. J.-C.',c:'v.',century:'siècle',src:'Données : Wikidata · noms antiques : Onomasticon Vitruvianum'}}[lang()]||{})[k];
 const style=document.createElement('style');style.textContent=`
.vfb{margin:8px 0 14px}
.vfb-names{font:italic 19px/1.35 Georgia,'Times New Roman',serif;margin:0 0 6px;opacity:.92}
.vfb-names span+span::before{content:" · ";font-style:normal;opacity:.6}
.vfb,.vfb p,.vfb dl{text-align:left}
.vfb-life{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px;font:14px/1.45 Arial,Helvetica,sans-serif;margin:0 0 8px}
.vfb-life dt{opacity:.7}.vfb-life dd{margin:0}
.vfb-vitr{font:13px/1.5 Arial,Helvetica,sans-serif;margin:6px 0 0;opacity:.9}
.vfb-vitr a{color:inherit}
.vfb-read{display:inline-flex;align-items:center;gap:6px;margin:10px 0 0;padding:9px 14px;border:1px solid currentColor;border-radius:999px;font:600 13px/1.2 Arial,Helvetica,sans-serif;color:inherit;text-decoration:none;cursor:pointer;background:transparent}
.vfb-read:hover{background:#ffffff14}
.vfb-src{font:11px/1.4 Arial,Helvetica,sans-serif;opacity:.65;margin:8px 0 0}
#featured .vitruvia-math-context.vfb-math{margin:0 0 12px}`;
 document.head.append(style);

 // Fórmula principal de matemáticos y científicos (resultado clásico asociado; con fuente).
 const FORMULAS=[
  [['arquimedes','archimedes','arquimedes de siracusa'],'E = ρ · g · V','Principio de Arquímedes · empuje igual al peso del fluido desalojado','https://es.wikipedia.org/wiki/Principio_de_Arqu%C3%ADmedes'],
  [['heron','heron de alejandria','hero of alexandria','heron of alexandria'],'A = √(s(s−a)(s−b)(s−c))','Fórmula de Herón · área del triángulo','https://es.wikipedia.org/wiki/F%C3%B3rmula_de_Her%C3%B3n'],
  [['ptolomeo','claudio ptolomeo','ptolemy','claudius ptolemy'],'AC · BD = AB · CD + AD · BC','Teorema de Ptolomeo · cuadriláteros inscritos','https://es.wikipedia.org/wiki/Teorema_de_Ptolomeo'],
  [['tales','tales de mileto','thales','thales of miletus'],'∠ACB = 90°','Teorema de Tales · ángulo inscrito en la semicircunferencia','https://es.wikipedia.org/wiki/Teorema_de_Tales'],
  [['eratostenes','eratostenes de cirene','eratosthenes'],'C = 50 · 5000 estadios','Medida de la circunferencia terrestre','https://es.wikipedia.org/wiki/Erat%C3%B3stenes'],
  [['apolonio','apolonio de perge','apollonius of perga'],'x²/a² + y²/b² = 1','Secciones cónicas · elipse','https://es.wikipedia.org/wiki/Apolonio_de_Perge'],
  [['diofanto','diophantus'],'x² + y² = z²','Arithmetica · ecuaciones diofánticas','https://es.wikipedia.org/wiki/Diofanto_de_Alejandr%C3%ADa'],
  [['fibonacci','leonardo de pisa'],'Fₙ = Fₙ₋₁ + Fₙ₋₂','Sucesión de Fibonacci','https://es.wikipedia.org/wiki/Sucesi%C3%B3n_de_Fibonacci'],
  [['johannes kepler','kepler'],'T² ∝ a³','Tercera ley de Kepler','https://es.wikipedia.org/wiki/Leyes_de_Kepler'],
  [['galileo','galileo galilei'],'d = ½ g t²','Caída de los cuerpos','https://es.wikipedia.org/wiki/Galileo_Galilei'],
  [['blaise pascal','pascal'],'P = F / A','Principio de Pascal · presión','https://es.wikipedia.org/wiki/Principio_de_Pascal'],
  [['pierre de fermat','fermat'],'aⁿ + bⁿ ≠ cⁿ  (n > 2)','Último teorema de Fermat','https://es.wikipedia.org/wiki/%C3%9Altimo_teorema_de_Fermat'],
  [['rene descartes','descartes'],'(x − a)² + (y − b)² = r²','Geometría analítica · coordenadas cartesianas','https://es.wikipedia.org/wiki/Geometr%C3%ADa_anal%C3%ADtica'],
  [['carl friedrich gauss','gauss'],'1 + 2 + … + n = n(n+1)/2','Suma de los primeros n números','https://es.wikipedia.org/wiki/Carl_Friedrich_Gauss'],
  [['bernhard riemann','riemann'],'ζ(s) = Σ n⁻ˢ','Función zeta de Riemann','https://es.wikipedia.org/wiki/Funci%C3%B3n_zeta_de_Riemann'],
  [['albert einstein','einstein'],'E = mc²','Equivalencia entre masa y energía','https://es.wikipedia.org/wiki/Equivalencia_entre_masa_y_energ%C3%ADa'],
  [['max planck','planck'],'E = h · ν','Relación de Planck','https://es.wikipedia.org/wiki/Relaci%C3%B3n_de_Planck'],
  [['james clerk maxwell','maxwell'],'∇ · E = ρ / ε₀','Ecuaciones de Maxwell · ley de Gauss','https://es.wikipedia.org/wiki/Ecuaciones_de_Maxwell'],
  [['erwin schrodinger','schrodinger'],'iħ ∂ψ/∂t = Ĥψ','Ecuación de Schrödinger','https://es.wikipedia.org/wiki/Ecuaci%C3%B3n_de_Schr%C3%B6dinger'],
  [['gottfried wilhelm leibniz','leibniz'],'∫ f′(x) dx = f(x) + C','Cálculo diferencial e integral','https://es.wikipedia.org/wiki/C%C3%A1lculo_infinitesimal'],
  [['eudoxo','eudoxo de cnido','eudoxus'],'a/b > c/d  ⇔  ma > nb, nc ≤ md','Teoría de las proporciones (Elementos, V)','https://es.wikipedia.org/wiki/Eudoxo_de_Cnido'],
  [['hiparco','hiparco de nicea','hipparchus'],'crd θ = 2R sen(θ/2)','Tabla de cuerdas · trigonometría','https://es.wikipedia.org/wiki/Hiparco_de_Nicea']
 ];
 function formulaFor(names){
  const keys=names.map(fold);
  return FORMULAS.find(([ns])=>ns.some(n=>keys.some(k=>k===n||k.startsWith(n+' ')||k.startsWith(n+',')||k===n.split(' ')[0]&&n.split(' ').length===1)))||null;
 }
 function renderFormula(parent,f){
  parent.querySelector('.vfb-math')?.remove();
  const el=document.createElement('aside');el.className='vitruvia-math-context vfb-math';el.style.cssText='padding:12px 14px;border:1px solid currentColor;border-radius:8px;text-align:center';
  el.innerHTML=`<div style="font:normal clamp(22px,2.6vw,32px)/1.35 Georgia,serif">${esc(f[1])}</div><div style="font:600 12px/1.5 Arial,Helvetica,sans-serif;margin-top:4px">${esc(f[2])}</div><a href="${esc(f[3])}" target="_blank" rel="noopener noreferrer" style="font:11px Arial,Helvetica,sans-serif;color:inherit">Fuente y contexto ↗</a>`;
  parent.prepend(el);
 }

 /* ---------- Datos ---------- */
 async function wikidataFor(row){
  let u;try{u=new URL(row.link)}catch{return null}
  if(!/\.wikipedia\.org$/.test(u.hostname)||!u.pathname.startsWith('/wiki/'))return null;
  const title=decodeURIComponent(u.pathname.slice(6));
  const pp=await fetch(`https://${u.hostname}/w/api.php?`+new URLSearchParams({action:'query',prop:'pageprops',ppprop:'wikibase_item',redirects:'1',titles:title,format:'json',origin:'*'})).then(r=>r.json()).catch(()=>null);
  const id=Object.values(pp?.query?.pages||{})[0]?.pageprops?.wikibase_item;if(!id)return null;
  const ent=await fetch('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:id,props:'claims|labels',languages:'es|en|fr|la|grc|el',format:'json',origin:'*'})).then(r=>r.json()).catch(()=>null);
  return ent?.entities?.[id]||null;
 }
 const claims=(e,p)=>(e?.claims?.[p]||[]).map(c=>{const v=c.mainsnak?.datavalue?.value;if(v&&typeof v==='object'&&c.qualifiers?.P1480)v.circa=true;return v}).filter(v=>v!=null);
 function dateText(v){
  if(!v?.time)return '';const neg=v.time.startsWith('-');const y=parseInt(v.time.slice(1,v.time.indexOf('-',1)),10);
  const pr=v.precision??9;let s;
  if(pr<=7){const c=Math.ceil(y/100);s=L('century')==='siècle'?`${roman(c)}e siècle`:lang()==='en'?`${c}th century`:`${L('century')} ${roman(c)}`}
  else if(pr===8)s=`${L('c')} ${y}`;
  else if(pr===9)s=String(y);
  else{const d=new Date(Date.UTC(2000,parseInt(v.time.slice(6,8),10)-1,parseInt(v.time.slice(9,11),10)));s=d.toLocaleDateString(lang(),{day:'numeric',month:'long',timeZone:'UTC'})+' de '+y;if(lang()!=='es')s=s.replace(' de ',' ')}
  return (v.circa&&pr>=8&&!/^c\.|^v\./.test(s)?L('c')+' ':'')+s+(neg?' '+L('bc'):'');
 }
 const roman=n=>{const r=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let s='';for(const [v,t] of r)while(n>=v){s+=t;n-=v}return s};
 async function labelsOf(ids){
  if(!ids.length)return {};
  const r=await fetch('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:ids.slice(0,40).join('|'),props:'labels',languages:lang()+'|es|en',format:'json',origin:'*'})).then(r=>r.json()).catch(()=>null);
  const out={};for(const id of ids){const l=r?.entities?.[id]?.labels;out[id]=l?.[lang()]?.value||l?.es?.value||l?.en?.value||''}return out;
 }
 let onomasticon=null;
 const onomastic=async name=>{
  try{onomasticon??=await fetch('data/onomasticon-vitruvianum.json').then(r=>r.json())}catch{return null}
  const k=fold(name);const people=(onomasticon.entities||[]).filter(p=>p.kind==='person');
  return people.find(p=>[p.name,...(p.aliases||[])].some(n=>fold(n)===k||fold(n).split(' de ')[0]===k||k.startsWith(fold(n).split(' de ')[0]+' ')))||null;
 };

 /* ---------- Render ---------- */
 let token=0,query='';
 window.addEventListener('vitruvia:search',e=>{query=String(e.detail?.query||'');token++;box.querySelector('.vfb')?.remove();box.querySelector('.vfb-math')?.remove()});
 window.addEventListener('vitruvia:featured-result',async e=>{
  const d=e.detail||{};const row=d.row;if(!row||row.type!=='wikipedia')return;
  const my=++token;
  const ent=await wikidataFor(row).catch(()=>null);if(my!==token||!ent)return;
  const human=claims(ent,'P31').some(v=>v.id==='Q5');if(!human)return;
  const copy=box.querySelector('.featured-copy')||box;const title=document.getElementById('featured-title');
  const block=document.createElement('div');block.className='vfb';
  // Nombres en la lengua antigua: onomasticon del sitio y nombre nativo de Wikidata (griego antiguo o latín).
  const label=ent.labels?.[lang()]?.value||ent.labels?.es?.value||row.title;
  const ono=await onomastic(label)||await onomastic(row.title)||await onomastic(query);if(my!==token)return;
  const names=[];
  if(ono?.greek_name)names.push(['grc',ono.greek_name]);
  for(const v of claims(ent,'P1559'))if(['grc','la','el'].includes(v.language)&&!names.some(n=>n[1]===v.text))names.push([v.language,v.text]);
  // Forma latina en nominativo: etiqueta latina de Wikidata o el primer alias latino del onomasticon.
  const latin=ent.labels?.la?.value||(ono?.aliases||[]).find(x=>/^[A-Za-z\s]+$/.test(x)&&fold(x)!==fold(ono.name))||(ono?.latin_forms||[]).find(x=>/^[A-Za-z\s]+$/.test(x));
  if(latin&&!names.some(n=>n[1]===latin))names.push(['la',latin]);
  if(names.length){const p=document.createElement('p');p.className='vfb-names';p.innerHTML=names.slice(0,3).map(([l,t])=>`<span lang="${esc(l)}">${esc(t)}</span>`).join('');block.append(p)}
  // Nacimiento y muerte con lugar.
  const places=[...claims(ent,'P19'),...claims(ent,'P20')].map(v=>v.id).filter(Boolean);
  const lab=await labelsOf(places);if(my!==token)return;
  const b=claims(ent,'P569')[0],dd=claims(ent,'P570')[0],bp=claims(ent,'P19')[0]?.id,dp=claims(ent,'P20')[0]?.id;
  const dl=document.createElement('dl');dl.className='vfb-life';
  if(b||bp)dl.innerHTML+=`<dt>${esc(L('born'))}</dt><dd>${esc([lab[bp],dateText(b)].filter(Boolean).join(', '))}</dd>`;
  if(dd||dp)dl.innerHTML+=`<dt>${esc(L('died'))}</dt><dd>${esc([lab[dp],dateText(dd)].filter(Boolean).join(', '))}</dd>`;
  if(!b&&!dd&&ono?.period)dl.innerHTML+=`<dt>${esc(lang()==='en'?'Period':'Época')}</dt><dd>${esc(ono.period)}</dd>`;
  if(dl.children.length)block.append(dl);
  if(ono?.loci?.length){const p=document.createElement('p');p.className='vfb-vitr';p.innerHTML=esc(L('vitr'))+': '+ono.loci.slice(0,6).map(l=>`<a href="lector-bilingue.html?edition=recensio-es&locus=${encodeURIComponent(l)}">${esc('Vitr. '+l.replace(/^(\d+)/,m=>roman(+m)))}</a>`).join(', ');block.append(p)}
  // Biografía breve: se acorta la descripción a dos frases.
  const desc=document.getElementById('featured-description');
  if(desc&&desc.textContent.length>300){const t=desc.textContent;const cut=t.slice(0,320).replace(/([.;])\s[^.;]*$/,'$1');desc.title=t;desc.textContent=cut.length>120?cut:t.slice(0,300)+'…'}
  // Obras en la biblioteca → visor.
  let works=[];try{works=window.VitruviaTermPanel?.classicalWorks?await window.VitruviaTermPanel.classicalWorks(label):[]}catch{}
  if(my!==token)return;
  const readable=works.filter(w=>w.obras?.length||w.readable);
  if(readable.length){const a=document.createElement('a');a.className='vfb-read';a.textContent='📖 '+L('read')+' · '+readable[0].w.title;
   const reader=document.getElementById('vitruvia-term-reader');
   if(reader){a.href='#vitruvia-term-reader';a.onclick=ev=>{ev.preventDefault();reader.scrollIntoView({behavior:'smooth',block:'start'})}}
   else a.href=readable[0].w.id?'bibliotheca-graeca-latina.html?work='+encodeURIComponent(readable[0].w.id):'lector-clasico.html?obra='+encodeURIComponent(readable[0].obras[0]);
   block.append(a)}
  const src=document.createElement('p');src.className='vfb-src';src.innerHTML=`${esc(L('src'))} · <a href="https://www.wikidata.org/wiki/${esc(ent.id)}" target="_blank" rel="noopener" style="color:inherit">${esc(ent.id)}</a>`;block.append(src);
  box.querySelector('.vfb')?.remove();(title||copy.firstChild)?.after(block);
  // Retrato oficial (Wikidata P18: fotografía, busto o pintura) en el espacio superior.
  const img=claims(ent,'P18')[0];
  if(img){const file=String(img).replace(/ /g,'_');window.dispatchEvent(new CustomEvent('vitruvia:hero-visual',{detail:{query,weight:6000,item:{preview:'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(file)+'?width=640',page:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(file),caption:label+' · retrato (Wikidata)',alt:label,group:'',kind:'',score:0,credit:'Wikimedia Commons · ficha, autor y licencia'}}}))}
  // Fórmula principal encima del retrato (matemáticos y científicos).
  const f=formulaFor([label,row.title,query,...(ono?.aliases||[])]);
  const fig=document.getElementById('featured-documentary-visual');
  const known=window.VitruviaMathematics?.find?.(label)||window.VitruviaMathematics?.find?.(query);
  const target=fig&&!fig.hidden?fig:box;
  if(known&&window.VitruviaMathematics.render){window.VitruviaMathematics.render(target,known.names[0]);target.querySelector('.vitruvia-math-context')?.classList.add('vfb-math')}
  else if(f)renderFormula(target,f);
  if(fig){new MutationObserver((m,o)=>{if(!fig.hidden&&box.querySelector(':scope > .vfb-math')){fig.prepend(box.querySelector(':scope > .vfb-math'));o.disconnect()}}).observe(fig,{attributes:true,attributeFilter:['hidden']})}
 });
})();
