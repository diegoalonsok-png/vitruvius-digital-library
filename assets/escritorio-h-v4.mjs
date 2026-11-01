const ids={es:['recensio-es','V514 · Castellano'],en:['theory-en','V297 · Inglés'],fr:['recensio-fr','V554 · Francés']};
const el=id=>document.getElementById(id),cache={};let request=0;
const key=p=>String(p.locus||'').toLowerCase();
async function corpus(lang){if(!cache[lang])cache[lang]=fetch('data/structured/'+ids[lang][0]+'.json',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);let j=await r.json();if(!Array.isArray(j.passages))throw Error('Índice incompleto');return j.passages}).catch(e=>{delete cache[lang];throw e});return cache[lang]}
function put(parent,tag,value){const n=document.createElement(tag);n.textContent=value;parent.append(n);return n}
async function lookup(){const token=++request,book=el('book').value;let loc=el('locus').value.trim().toLowerCase();if(!loc.startsWith(book+'.')){loc=book+'.1.1';el('locus').value=loc}el('status').textContent='Buscando '+loc+'…';el('results').replaceChildren();let count=0,errs=[];for(const [lang,[id,label]] of Object.entries(ids)){try{const data=await corpus(lang);if(token!==request)return;const found=data.filter(p=>String(p.book)===book&&key(p)===loc);const sec=put(el('results'),'section','');sec.className='passage';put(sec,'h3',label);if(!found.length){put(sec,'p','Este locus no figura en el índice de esta edición.');continue}for(const p of found.slice(0,3)){put(sec,'strong','Locus '+p.locus+' · latín');put(sec,'p',p.latin||'Sin latín');put(sec,'strong','Traducción');put(sec,'p',p.translation||'Sin traducción');count++}}catch(err){errs.push(label+': '+err.message)}}if(token===request)el('status').textContent=count+' resultados en '+loc+'. Cotejo folio–pasaje pendiente.'+(errs.length?' Errores: '+errs.join('; '):'')}
function changeBook(){const b=el('book').value;el('locus').value=b+'.1.1';lookup()}
el('book').addEventListener('change',changeBook);
el('book').addEventListener('input',changeBook);
el('consult').addEventListener('click',lookup);
el('preface').addEventListener('click',()=>{el('locus').value=el('book').value+'.praef.1';lookup()});
el('locus').addEventListener('keydown',e=>{if(e.key==='Enter')lookup()});
lookup();