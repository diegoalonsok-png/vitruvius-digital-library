const $=s=>document.querySelector(s);let corpus=null;const editions={es:'recensio-es',fr:'recensio-fr',en:'theory-en'};const editionCache={};
function key(s){return String(s||'').trim().toLowerCase().replace(/^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)\./i,m=>String(['','i','ii','iii','iv','v','vi','vii','viii','ix','x'].indexOf(m.slice(0,-1).toLowerCase()))+'.');}
async function load(){const q=key($('#locus').value);$('#status').textContent='Consultando índice V514…';try{if(!corpus){const r=await fetch('data/structured/recensio-es.json');if(!r.ok)throw Error('No se puede cargar V514');corpus=await r.json();}const p=(corpus.passages||[]).find(x=>String(x.locus).toLowerCase()===q);$('#modern-latin').textContent=p?p.latin:'';const lg=$('#language').value;let chosen=p;if(lg!=='es'){if(!editionCache[lg]){const rr=await fetch('data/structured/'+editions[lg]+'.json');if(!rr.ok)throw Error('Traducción '+lg+' no disponible');editionCache[lg]=await rr.json();}chosen=(editionCache[lg].passages||[]).find(x=>String(x.locus).toLowerCase()===q);}$('#base').textContent=chosen?(chosen.translation||chosen.translated||'El pasaje figura en la edición, pero no se localizó un campo de traducción.'):'No se encontró exactamente ese locus en la traducción seleccionada. Las ediciones pueden agrupar secciones distintas.';$('#status').textContent=p?'V514 · '+p.locus+' cargado. La correspondencia con el folio de H sigue sin comprobar.':'Sin locus coincidente.';}catch(e){$('#status').textContent='Error: '+e.message;}}
$('#load-locus').addEventListener('click',load);$('#language').addEventListener('change',load);
$('#clear').addEventListener('click',()=>{if(confirm('¿Vaciar el borrador de transcripción?'))$('#transcription').value='';});
$('#export').addEventListener('click',()=>{const data=['SCRIPTORIUM HTR · FICHA DE TRABAJO','Manuscrito: British Library, Harley MS 2767','Folio declarado: '+$('#folio').value,'Locus de contraste V514: '+$('#locus').value,'Estado: transcripción de trabajo, no certificada','','TRANSCRIPCIÓN H (BORRADOR)', $('#transcription').value,'','TRADUCCIÓN KURILO (POR LOCUS)',$('#base').textContent,'','LATÍN EDICIÓN V514 (CONTRASTE)',$('#modern-latin').textContent].join('\n');const blob=new Blob([data],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Harley_H_transcripcion_borrador.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
load();

let chosenImage=null,previewUrl=null;
const ocrStatus=$('#ocr-status');
$('#folio-image').addEventListener('change',e=>{
 const file=e.target.files?.[0];if(previewUrl)URL.revokeObjectURL(previewUrl);
 chosenImage=file||null;previewUrl=file?URL.createObjectURL(file):null;
 const img=$('#image-preview');img.hidden=!previewUrl;if(previewUrl)img.src=previewUrl;
 ocrStatus.textContent=file?'Imagen preparada: '+file.name+'. Pulsá «Reconocer latín (OCR)».':'Seleccioná una imagen.';
});
async function ensureOCR(){
 if(window.Tesseract)return window.Tesseract;
 await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';s.onload=resolve;s.onerror=()=>reject(Error('No se pudo cargar el motor Tesseract.js'));document.head.append(s);});
 if(!window.Tesseract)throw Error('Motor OCR no disponible');return window.Tesseract;
}
$('#recognize').addEventListener('click',async()=>{
 const url=$('#image-url').value.trim(),src=chosenImage||url;
 if(!src){ocrStatus.textContent='Seleccioná un archivo de imagen o ingresá una URL IIIF directa (no la URL de la página del visor).';return;}
 const button=$('#recognize');button.disabled=true;let worker;
 try{
  ocrStatus.textContent='Cargando motor y modelo latino. Puede tardar en el primer uso…';
  const t=await ensureOCR();
  worker=await t.createWorker('lat',1,{logger:m=>{if(m.status)ocrStatus.textContent='OCR: '+m.status+(Number.isFinite(m.progress)?' '+Math.round(m.progress*100)+' %':'');}});
  const result=await worker.recognize(src);
  const value=String(result?.data?.text||'').trim();
  if(!value)throw Error('El motor no identificó texto en la imagen.');
  $('#transcription').value=value;
  ocrStatus.textContent='OCR experimental terminado ('+value.length+' caracteres). Revisá el latín: la minúscula carolina y sus abreviaturas pueden producir errores.';
 }catch(e){ocrStatus.textContent='No se pudo reconocer la imagen: '+e.message+'. Si es una URL IIIF, descargá el folio y cargalo como archivo local.';}
 finally{if(worker)await worker.terminate().catch(()=>{});button.disabled=false;}
});
function tokenize(s){return String(s||'').toLocaleLowerCase('la').match(/[a-záéíóúàèìòùâêîôûæœ]+/g)||[];}
$('#compare').addEventListener('click',()=>{
 const h=tokenize($('#transcription').value),v=tokenize($('#modern-latin').textContent),out=$('#comparison');out.replaceChildren();
 if(!h.length||!v.length){out.textContent='Primero reconocé o ingresá el texto de H y consultá el locus V514 correspondiente.';return;}
 const counts=new Map();for(const w of v)counts.set(w,(counts.get(w)||0)+1);
 let common=0;for(const w of h){const n=counts.get(w)||0;if(n){common++;counts.set(w,n-1);}}
 const p=document.createElement('p');p.textContent='Coincidencia léxica aproximada: '+common+' de '+h.length+' palabras OCR presentes en la selección V514 ('+Math.round(common/h.length*100)+' %). No es una puntuación de fidelidad paleográfica ni colación de variantes.';out.append(p);
 const missing=[...counts.entries()].flatMap(([w,n])=>Array(n).fill(w)).slice(0,30);
 const q=document.createElement('p');q.textContent='Formas de V514 no emparejadas (máx. 30): '+(missing.join(' · ')||'Ninguna');out.append(q);
});

$('#htr-recognize').addEventListener('click',async()=>{
 const endpoint=$('#htr-endpoint').value.trim().replace(/\/$/,'');
 if(!chosenImage){ocrStatus.textContent='Para HTR seleccioná primero una imagen local del folio (PNG/JPG).';return;}
 if(!endpoint){ocrStatus.textContent='Falta configurar un servidor Kraken HTR. GitHub Pages no ejecuta este modelo por sí solo; consultá la guía de instalación.';return;}
 if(!/^https:\/\//.test(endpoint)&&!/^http:\/\/localhost(?::\d+)?$/.test(endpoint)&&!/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(endpoint)){
 ocrStatus.textContent='Usá HTTPS o una dirección localhost explícita.';return;}
 const btn=$('#htr-recognize');btn.disabled=true;ocrStatus.textContent='Enviando folio a Kraken HTR…';
 try{
  const form=new FormData();form.append('image',chosenImage,chosenImage.name);
  const response=await fetch(endpoint+'/recognize',{method:'POST',body:form});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.detail||'HTTP '+response.status);
  if(data.engine!=='Kraken'||typeof data.text!=='string')throw Error('Respuesta no reconocida del servicio HTR');
  $('#transcription').value=data.text;
  ocrStatus.textContent=data.text.trim()?'HTR Kraken finalizado. Transcripción automática SIN REVISAR, comparala con la imagen.':'Kraken respondió sin texto reconocido; probá otra imagen o modelo.';
 }catch(e){ocrStatus.textContent='HTR no disponible: '+e.message+'. Comprobá conexión, CORS, HTTPS y que el modelo esté configurado.';}
 finally{btn.disabled=false;}
});
