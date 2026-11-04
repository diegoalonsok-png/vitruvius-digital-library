/* Vitruvia · Detect, translate and trace short classical passages.
   This component never invents an author, original text, locus or translation.
   External translation is explicitly marked as approximate. */
(()=>{
 'use strict';
 function detect(value){
  const s=String(value||'').trim().replace(/\s+/g,' ');
  if(s.length<12||s.length>480||s.split(/\s+/).length>55)return null;
  if(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(s))return 'grc';
  if(!/^[\p{Script=Latin}\p{M}\s.,;:!?‘’'“”"()—–-]+$/u.test(s))return null;
  const words=s.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').match(/[a-z]+/g)||[];
  if(words.length<3)return null;
  const clues=new Set(['et','est','sunt','erat','erant','sum','esse','non','in','ad','ab','ex','cum','per','quod','quia','qui','quae','quibus','aut','sed','enim','ut','nec','atque','autem','omnis','omnia','omnium','deus','dei','deum','dominus','verbum','terra','caelum','caeli','vita','mortem','res','publica','liber','libri','locus','erat','fuit','fuerunt','habet','homo','homines','romanus','romani','tempus','temporis','arma','virumque','cano','veni','vidi','vici','principio','creavit','gallia','divisa','partes','tres','mihi','tibi','nobis','vobis','ille','illa','ipsum','lorem','dolor','amet','quidem','igitur','nihil','sine','suis','erat','filius','filio','pater','matris','rex','regis','amore','amor','belli','bellum','esse','se','sibi','suo','sua','suum']);
  const score=words.filter(w=>clues.has(w)||/(?:orum|arum|ibus|tionem|tatis|erunt|istis|isset|aeque|umque)$/.test(w)).length;
  return score>=2||score>=1&&words.some(w=>/(?:orum|arum|ibus|tatis|erunt|isset|umque)$/.test(w))?'la':null;
 }
 function norm(text){
  return String(text||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()
   .replace(/ς/g,'σ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 }
 function sourceMatches(rows,text){
  const phrase=norm(text);
  if(phrase.length<12||phrase.split(' ').length<3)return [];
  const matched=[];
  for(const row of (rows||[])){
   if(!row||!row.link||!row.title)continue;
   const originals=[row.latin,row.greek,row.grc,row.original,row.originalText,row.excerpt,row.snippet,row.text];
   const exact=originals.some(chunk=>chunk&&norm(chunk).includes(phrase));
   if(!exact)continue;
   const kind=row.type==='text-external'||row.recordKind==='external-search-index'?'index':'local';
   matched.push({title:row.title,author:row.author||'',link:row.link,
    locus:row.locus||row.reference||'',kind,
    translation:kind==='local'?row.translation||row.spanish||'':''});
  }
  const seen=new Set();
  return matched.filter(v=>{if(seen.has(v.link))return false;seen.add(v.link);return true}).slice(0,5);
 }
 window.VitruviaAncientQuotes={detect,norm,sourceMatches,version:'1.0'};
 const results=document.getElementById('results');
 if(!results)return;
 const card=document.createElement('section');
 card.id='vitruvia-ancient-quote';card.className='vitruvia-ancient-quote';card.hidden=true;
 card.setAttribute('aria-label','Pasaje clásico: traducción y fuente');
 card.innerHTML=[
  '<div class="vaq-kicker" id="vaq-kicker">ANÁLISIS DE PASAJE CLÁSICO</div>',
  '<h3 id="vaq-title">Traducción y búsqueda de fuente</h3>',
  '<p id="vaq-original" class="vaq-original"></p>',
  '<div class="vaq-translation"><strong id="vaq-translation-label">Traducción automática orientativa · castellano</strong>',
  '<p id="vaq-translation-text" aria-live="polite"></p></div>',
  '<div class="vaq-source"><strong id="vaq-source-label">Obra y autor</strong>',
  '<div id="vaq-source-results" aria-live="polite"></div></div>',
  '<p class="vaq-disclosure" id="vaq-disclosure">Servicio externo: MyMemory. El texto se envía para traducirlo. La traducción puede contener errores; no constituye edición crítica. Las coincidencias de catálogos requieren cotejo con la obra.</p>'
 ].join('');
 const target=document.getElementById('vitruvia-welcome');
 if(target)target.before(card);else results.prepend(card);
 const id=x=>card.querySelector('#'+x);
 const ui={kicker:id('vaq-kicker'),title:id('vaq-title'),original:id('vaq-original'),translationLabel:id('vaq-translation-label'),translation:id('vaq-translation-text'),sourceLabel:id('vaq-source-label'),source:id('vaq-source-results'),disclosure:id('vaq-disclosure')};
 const locale={
  es:{title:'Traducción del pasaje y localización de la fuente',origin:'Texto consultado',la:'Latín',grc:'Griego antiguo',translation:'Traducción automática orientativa · castellano',loading:'Consultando traducción automática…',unavailable:'La traducción automática no está disponible para este pasaje. No se ofrece una traducción inventada.',same:'No se obtuvo una traducción fiable del servicio.',source:'Obra y autor · identificación documental',seeking:'Buscando coincidencias textuales en los corpus…',unresolved:'Fuente todavía no identificada con coincidencia literal verificable.',verified:'Coincidencia textual en el corpus',indexed:'Coincidencia en índice externo · comprobar la obra',locus:'Pasaje',caution:'Traducción orientativa mediante MyMemory: se envía el fragmento a un servicio externo. Puede contener errores de sintaxis o sentido. Las fuentes se verifican en las obras enlazadas, no se infieren de semejanzas generales.',lookup:'Buscar pasaje en Wikisource',local:'Traducción editorial asociada al registro (comprobar correspondencia textual)'},
  en:{title:'Passage translation and source identification',origin:'Submitted text',la:'Latin',grc:'Ancient Greek',translation:'Approximate machine translation · Spanish',loading:'Requesting machine translation…',unavailable:'Machine translation is unavailable for this passage. No invented translation is shown.',same:'The service returned no usable translation.',source:'Work and author · documentary identification',seeking:'Searching indexed textual matches…',unresolved:'No work verified by a literal text match yet.',verified:'Literal match in indexed corpus',indexed:'External index match · verify source',locus:'Passage',caution:'Approximate translation through MyMemory; the passage is sent to an external provider. Errors are possible. Source titles must be checked at linked works.',lookup:'Find passage on Wikisource',local:'Editorial translation tied to matching record (check text alignment)'},
  fr:{title:'Traduction et identification du passage',origin:'Texte consulté',la:'Latin',grc:'Grec ancien',translation:'Traduction automatique indicative · espagnol',loading:'Traduction automatique en cours…',unavailable:'La traduction automatique est indisponible. Aucune traduction fictive n’est présentée.',same:'Le service n’a pas fourni de traduction exploitable.',source:'Œuvre et auteur · identification documentaire',seeking:'Recherche de correspondances dans les corpus…',unresolved:'Aucune source confirmée par concordance littérale.',verified:'Concordance textuelle dans le corpus',indexed:'Correspondance dans un index externe · à vérifier',locus:'Passage',caution:'Traduction indicative via MyMemory ; le texte est transmis à un prestataire externe. Vérifier les références dans les œuvres citées.',lookup:'Rechercher dans Wikisource',local:'Traduction éditoriale associée au passage (vérifier l’alignement)'}
 };
 const language=()=>locale[document.documentElement.lang?.slice(0,2)]||locale.es;
 let generation=0,currentText='',currentLang='',candidates=[];
 const line=(parent,text,cls='')=>{
  const p=document.createElement('p');p.textContent=text;if(cls)p.className=cls;parent.append(p);return p;
 };
 const link=(parent,label,url)=>{
  try{
   const u=new URL(url,location.href);
   if(!['https:','http:'].includes(u.protocol))return;
   const a=document.createElement('a');a.textContent=label;a.href=u.href;
   if(u.origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer'}
   parent.append(a);return a;
  }catch{return null}
 };
 function renderSources(){
  const L=language();
  ui.source.replaceChildren();
  if(candidates.length){
   for(const candidate of candidates){
    const box=document.createElement('div');box.className='vaq-candidate';
    line(box,candidate.kind==='index'?L.indexed:L.verified,'vaq-status');
    const a=link(box,candidate.title,candidate.link);if(a)a.className='vaq-source-link';
    line(box,[candidate.author,candidate.locus?L.locus+': '+candidate.locus:''].filter(Boolean).join(' · '),'vaq-meta');
    ui.source.append(box);
   }
  }else{
   line(ui.source,L.unresolved,'vaq-meta');
  }
  const code=currentLang==='grc'?'el':'la';
  const q=currentText.split(/\s+/).slice(0,7).join(' ');
  link(ui.source,L.lookup,'https://'+code+'.wikisource.org/w/index.php?'+new URLSearchParams({search:'"'+q+'"'}));
 }
 function init(text,lang){
  const L=language();
  card.hidden=false;
  ui.kicker.textContent=L.origin+' · '+L[lang];ui.title.textContent=L.title;
  ui.original.textContent=text;ui.original.lang=lang;
  ui.translationLabel.textContent=L.translation;ui.translation.textContent=L.loading;
  ui.sourceLabel.textContent=L.source;ui.disclosure.textContent=L.caution;
  candidates=[];renderSources();
 }
 async function machineTranslate(text,lang,token){
  const L=language();
  // MyMemory accepts <=500 UTF-8 bytes per query; classical Greek is multi-byte.
  if(new TextEncoder().encode(text).length>450){ui.translation.textContent=L.unavailable;return}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
   const params=new URLSearchParams({q:text,langpair:lang+'|es'});
   const response=await fetch('https://api.mymemory.translated.net/get?'+params,{signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(Number(data?.responseStatus)!==200)throw Error('Translation service rejected pair');
   const translated=String(data?.responseData?.translatedText||'').trim();
   if(!translated||norm(translated)===norm(text)||/MYMEMORY WARNING|INVALID LANGUAGE PAIR|NO QUERY SPECIFIED|QUERY LENGTH LIMIT/i.test(translated))throw Error('No usable result');
   if(token!==generation)return;
   ui.translation.textContent=translated;
  }catch{
   if(token===generation)ui.translation.textContent=language().unavailable;
  }finally{clearTimeout(timer)}
 }
 function start(text){
  const lang=detect(text),token=++generation;
  currentText=String(text||'').trim().replace(/\s+/g,' ');currentLang=lang||'';
  if(!lang){card.hidden=true;return}
  init(currentText,lang);
  void machineTranslate(currentText,lang,token);
 }
 window.addEventListener('vitruvia:search',event=>start(event.detail?.query||''));
 window.addEventListener('vitruvia:clear',()=>{generation++;card.hidden=true;currentText='';candidates=[]});
 window.addEventListener('vitruvia:results',event=>{
  if(card.hidden||String(event.detail?.query||'').trim()!==currentText)return;
  const found=sourceMatches(event.detail?.rows,currentText);
  if(found.length){const seen=new Set([...found.map(r=>r.link),...candidates.map(r=>r.link)]);
   candidates=[...candidates,...found.filter(r=>!candidates.some(c=>c.link===r.link))].slice(0,5);
   renderSources();
  }
 });
 new MutationObserver(records=>{
  if(!card.hidden&&records.some(x=>x.attributeName==='lang')){
   ui.kicker.textContent=language().origin+' · '+language()[currentLang];
   ui.title.textContent=language().title;
   ui.translationLabel.textContent=language().translation;
   ui.sourceLabel.textContent=language().source;
   ui.disclosure.textContent=language().caution;renderSources();
  }
 }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 const params=new URLSearchParams(location.search);
 const initial=params.get('q');if(initial)start(initial);
})();
