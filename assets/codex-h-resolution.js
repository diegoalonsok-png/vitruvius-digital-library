/* Explicit high-resolution institutional reading, preserving the local archive. */
(()=>{'use strict';
const image=document.getElementById('image'),stage=document.getElementById('stage');if(!image||!stage)return;
const bar=document.createElement('div');bar.className='toolbar';bar.id='h-resolution-tools';
const button=document.createElement('button');button.type='button';button.textContent='Cargar imagen institucional de alta resolución';button.disabled=true;
const link=document.createElement('a');link.textContent='Abrir imagen institucional';link.target='_blank';link.rel='noopener noreferrer';link.hidden=true;
const status=document.createElement('span');status.setAttribute('role','status');status.style.fontSize='12px';
bar.append(button,link,status);stage.before(bar);
let canvases=null,archive=null,current=-1,url='',request=0;
function sync(){
 const match=image.getAttribute('src')?.match(/H_(\d+)_/);if(!match)return;
 const index=Number(match[1])-1;if(index===current&&url)return;
 current=index;url='';button.disabled=true;link.hidden=true;
 if(!canvases||!archive)return;
 const expected=archive[index]?.canvasId,canvas=canvases.find(c=>(c.id||c['@id'])===expected);
 if(!canvas){status.textContent='No se pudo confirmar el canvas institucional de este folio.';return;}
 const body=canvas.items?.[0]?.items?.[0]?.body||canvas.images?.[0]?.resource;
 const services=body?.service||[],service=Array.isArray(services)?services.find(x=>String(x.id||x['@id']||'').startsWith('https://bl.digirati.io/images/')):services;
 const base=service?.id||service?.['@id'];if(!base)return;
 url=base.replace(/\/$/,'')+'/full/2500,/0/default.jpg';
 link.href=url;link.hidden=false;button.disabled=false;
 status.textContent='Fuente: British Library · imagen institucional; carga a petición.';
}
button.addEventListener('click',()=>{
 if(!url)return;const next=++request,fallback=image.src,selected=url;
 button.disabled=true;status.textContent='Abriendo alta resolución…';
 const probe=new Image();
 probe.onload=()=>{if(next!==request||selected!==url)return;image.src=selected;status.textContent='British Library · '+probe.naturalWidth+' × '+probe.naturalHeight+' px · reproducción digital, no escala del manuscrito.';button.disabled=false;};
 probe.onerror=()=>{if(next!==request||selected!==url)return;image.src=fallback;status.textContent='La fuente institucional no respondió. Se conserva la fotografía archivada.';button.disabled=false;};
 probe.src=selected;
});
new MutationObserver(sync).observe(image,{attributes:true,attributeFilter:['src']});
async function json(url){const r=await fetch(url);if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
Promise.all([json('https://bl.digirati.io/iiif/ark:/81055/vdc_100056038850.0x000001'),json('images/CODEX_H_HARLEY_2767_ARCHIVO_MAESTRO_NO_BORRAR/indice-folios.json')]).then(([d,a])=>{canvases=d.items||d.sequences?.[0]?.canvases;archive=a.imagenes;sync();}).catch(()=>{status.textContent='Acceso institucional temporalmente no disponible; archivo local conservado.';});
})();
