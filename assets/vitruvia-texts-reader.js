/* Vitruvia — textual reading workspace for music, poetry, historical sources.
   All catalogue titles are navigation hints; texts are reader-supplied and never automatically published. */
(()=>{'use strict';
const DATA=[
 {keys:['radiohead'],name:'Radiohead',type:'Música · letras',items:['Creep','High and Dry','Fake Plastic Trees','Street Spirit (Fade Out)','Paranoid Android','Karma Police','No Surprises','Exit Music (For a Film)','Everything in Its Right Place','Pyramid Song','There There','Weird Fishes/Arpeggi','Reckoner','Nude','Jigsaw Falling into Place','Lotus Flower','Burn the Witch','Daydreaming']},
 {keys:['coldplay'],name:'Coldplay',type:'Música · letras',items:['Yellow','Clocks','The Scientist','Fix You','Viva la Vida','Paradise']},
 {keys:['beatles'],name:'The Beatles',type:'Música · letras',items:['Yesterday','Hey Jude','Let It Be','Eleanor Rigby','A Day in the Life','Blackbird']},
 {keys:['nirvana'],name:'Nirvana',type:'Música · letras',items:['Smells Like Teen Spirit','Come as You Are','Lithium','Heart-Shaped Box','All Apologies']},
 {keys:['akenaton','akhenaten','akhenaton','ajenaton','akhenatón','ajenatón','amenhotep iv','amenofis iv'],name:'Akenatón · fuentes primarias',type:'Historia · Egipto',items:['Gran Himno a Atón (tumba de Ay, TA 25)','Pequeño Himno a Atón (versiones de tumbas de Amarna)','Estelas fronterizas de Ajetatón · proclamación inicial','Estelas fronterizas de Ajetatón · proclamación posterior','Inscripciones reales de Ajenatón']},
 {keys:['lutero','luther','martin luther','martín lutero'],name:'Martín Lutero · documentos',type:'Historia · Reforma',items:['Cartas de Martín Lutero · correspondencia','Carta a Jorge Spalatino · correspondencia','Carta a Felipe Melanchthon · correspondencia','Carta a su padre Hans Lutero (1521)','Carta a los cristianos de Amberes (1525)','Carta a su esposa Katharina von Bora · correspondencia','Las 95 tesis (1517) · documento, no carta','A la nobleza cristiana de la nación alemana (1520) · tratado']}
];
const generic=/\b(poema|poemas|poesia|poesía|poetisa|poeta|poetry|poem|lyrics|lyric|letra de|letras de|cancion|canción|cantante|música|musica|cantautor|banda|compositor|himno|epistola|epístola|correspondencia|cartas de|manuscrito|estela|decreto|inscripcion|inscripción)\b/i;
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function elm(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function setup(){
 const article=document.getElementById('vitruvia-article'),title=document.getElementById('article-title');
 if(!article||!title||document.getElementById('vr-textual-reader'))return;
 const panel=elm('section','vr-textual-reader');panel.id='vr-textual-reader';panel.hidden=true;
 const heading=elm('h3','','Biblioteca textual · lectura y traducción');
 const intro=elm('p','vr-text-note','Selecciona un texto de la lista. Los títulos son orientativos: no implican que el sitio posea una transcripción. Se pueden incorporar textos propios, de dominio público o con autorización.');
 const top=elm('div','vr-text-row'),select=elm('select'),manual=elm('input'),source=elm('a','','Consultar fuentes externas ↗');
 select.setAttribute('aria-label','Seleccionar texto o documento');
 manual.placeholder='O escribir otro título';manual.setAttribute('aria-label','Título de otro texto');manual.type='text';
 source.target='_blank';source.rel='noopener noreferrer';
 top.append(select,manual,source);
 const controls=elm('div','vr-text-row'),upload=elm('input'),minus=elm('button','','A−'),plus=elm('button','','A+'),clear=elm('button','','Limpiar texto');
 upload.type='file';upload.accept='.txt,text/plain';upload.setAttribute('aria-label','Cargar archivo de texto');
 [minus,plus,clear].forEach(b=>b.type='button');
 const palette=elm('div','vr-text-palette'),label=elm('span','','Resaltado:');
 controls.append(upload,minus,plus,label,palette,clear);
 const textarea=elm('textarea','vr-text-content');textarea.rows=10;textarea.placeholder='Pega aquí un documento, poema o letra autorizado, o importa un archivo .txt para leerlo. El texto permanece en esta sesión del navegador.';textarea.setAttribute('aria-label','Texto para lectura y traducción');
 const trans=elm('div','vr-text-row'),lang=elm('select'),target=elm('select'),translate=elm('button','','Traducir automáticamente');
 lang.setAttribute('aria-label','Idioma de origen');target.setAttribute('aria-label','Idioma de destino');translate.type='button';
 [['en','Inglés'],['es','Español'],['fr','Francés'],['de','Alemán'],['it','Italiano'],['pt','Portugués']].forEach(([k,v])=>{const o=elm('option','',v);o.value=k;lang.append(o)});
 [['es','Al español'],['en','Al inglés'],['fr','Al francés'],['pt','Al portugués']].forEach(([k,v])=>{const o=elm('option','',v);o.value=k;target.append(o)});
 const notice=elm('p','vr-text-note','La traducción es automática y orientativa, no una edición crítica. Al pulsar Traducir, se intenta el traductor local del navegador y, si no está disponible, se solicita el fragmento a MyMemory. No se envía texto antes del clic.');
 const status=elm('p','vr-text-note');status.setAttribute('role','status');
 const output=elm('pre','vr-text-output');output.setAttribute('aria-label','Resultado de traducción');
 trans.append(lang,target,translate);panel.append(heading,intro,top,controls,textarea,trans,notice,status,output);
 article.insertAdjacentElement('afterend',panel);
 const paletteColors=['#4e4e4e','#9c7516','#8e3434','#1f5b7a','#2b6944','#6b3c7b'];
 paletteColors.forEach((color,i)=>{let b=elm('button','vr-text-swatch');b.type='button';b.style.background=color;b.title='Color '+(i+1);b.setAttribute('aria-label','Color de selección '+(i+1));b.addEventListener('click',()=>{palette.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));textarea.style.setProperty('--vr-selected-color',color)});b.setAttribute('aria-pressed',String(i===1));palette.append(b)});
 textarea.style.setProperty('--vr-selected-color',paletteColors[1]);
 let size=17,recordKey='',current='',saved=new Map();
 function link(){let work=manual.value.trim()||select.value;let query=[recordKey,work,'fuente primaria texto edición digital'].filter(Boolean).join(' ');source.href='https://www.google.com/search?'+new URLSearchParams({q:query})}
 function choose(){current=manual.value.trim()||select.value;textarea.value=saved.get(current)||'';output.textContent='';status.textContent=current?'Documento seleccionado; agrega una transcripción verificable para leerlo.':'';link()}
 select.addEventListener('change',()=>{manual.value='';choose()});manual.addEventListener('change',choose);
 textarea.addEventListener('input',()=>{if(current)saved.set(current,textarea.value)});
 minus.addEventListener('click',()=>{size=Math.max(13,size-2);textarea.style.fontSize=size+'px';output.style.fontSize=size+'px'});
 plus.addEventListener('click',()=>{size=Math.min(29,size+2);textarea.style.fontSize=size+'px';output.style.fontSize=size+'px'});
 clear.addEventListener('click',()=>{textarea.value='';if(current)saved.delete(current);output.textContent='';status.textContent='Texto limpiado.'});
 upload.addEventListener('change',async()=>{const f=upload.files?.[0];if(!f)return;if(f.size>200000){status.textContent='Archivo demasiado grande (máximo 200 KB).';return}textarea.value=await f.text();if(current)saved.set(current,textarea.value);status.textContent='Documento cargado localmente.';output.textContent=''});
 function sync(){
   const q=new URLSearchParams(location.search).get('q')||document.getElementById('query')?.value||'';
   const context=normalize(q+' '+title.textContent);
   const matched=DATA.find(row=>row.keys.some(k=>context.includes(normalize(k))));
   const genericMatch=generic.test(q)||generic.test(title.textContent);
   panel.hidden=!(matched||genericMatch);
   if(panel.hidden)return;
   const key=matched?.name||q||title.textContent;
   if(recordKey!==key){
     recordKey=key;
     select.replaceChildren();
     const empty=elm('option','','Seleccionar canción, poema o documento');empty.value='';select.append(empty);
     (matched?.items||[]).forEach(v=>{const o=elm('option','',v);o.value=v;select.append(o)});
     heading.textContent=matched?matched.type+' · visor de lectura':'Textos y documentos · visor de lectura';
     manual.value='';choose();
   }
 }
 let delay;
 new MutationObserver(()=>{clearTimeout(delay);delay=setTimeout(sync,180)}).observe(title,{childList:true,characterData:true,subtree:true});
 document.getElementById('search-form')?.addEventListener('submit',()=>setTimeout(sync,500));
 window.addEventListener('popstate',sync);sync();
 async function localTranslate(value,src,dst){
   if(!window.Translator?.create)return null;
   if(window.Translator.availability&&await window.Translator.availability({sourceLanguage:src,targetLanguage:dst})==='unavailable')return null;
   const translator=await window.Translator.create({sourceLanguage:src,targetLanguage:dst});
   try{return await translator.translate(value)}finally{translator.destroy?.()}
 }
 async function externalTranslate(value,src,dst){
   // Avoid unbounded requests and avoid sending complete long copyrighted documents.
   const pieces=value.match(/[\s\S]{1,350}/g)?.slice(0,3)||[];
   let results=[];
   for(const part of pieces){
     const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
     try{
       const u='https://api.mymemory.translated.net/get?'+new URLSearchParams({q:part,langpair:src+'|'+dst});
       const r=await fetch(u,{signal:controller.signal,referrerPolicy:'no-referrer'});
       if(!r.ok)throw Error('Servicio externo no disponible');
       const data=await r.json(),text=data?.responseData?.translatedText;
       if(!text||Number(data.responseStatus)!==200)throw Error('Respuesta de traducción no válida');
       results.push(text);
     }finally{clearTimeout(timeout)}
   }
   return results.join('\n');
 }
 translate.addEventListener('click',async()=>{
   const raw=textarea.value.trim();
   if(!raw){status.textContent='Primero carga o pega un texto autorizado.';return}
   if(lang.value===target.value){status.textContent='Elige un idioma de destino diferente.';return}
   translate.disabled=true;status.textContent='Traduciendo…';output.textContent='';
   const truncated=raw.length>1050;const input=raw.slice(0,1050);
   try{
     let result;
     try{result=await localTranslate(input,lang.value,target.value)}catch(e){result=null}
     const isLocal=!!result;
     if(!result)result=await externalTranslate(input,lang.value,target.value);
     output.textContent=result||'No se recibió una traducción.';
     status.textContent=(isLocal?'Traducción local del navegador.':'Traducción mediante MyMemory.')+(truncated?' Solo se tradujeron los primeros 1050 caracteres; el documento completo permanece intacto.':'');
   }catch(e){status.textContent='No fue posible traducir automáticamente. Puedes seguir leyendo el original.'}
   finally{translate.disabled=false}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
