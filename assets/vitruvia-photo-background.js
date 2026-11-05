/* Vitruvia · optional per-visitor photo background in existing colour picker.
 * External photos are loaded from provider only after visitor chooses a URL.
 * Local files are kept as temporary object URLs in this browser tab.
 */
(()=>{
 'use strict';
 function init(){
  const panel=document.getElementById('front-background-panel');
  if(!panel||document.getElementById('vr-photo-options'))return;
  const root=document.documentElement;
  const holder=document.createElement('section');
  holder.id='vr-photo-options';holder.className='vr-photo-options';
  holder.innerHTML=[
   '<h3 id="vr-photo-heading">Imagen de fondo</h3>',
   '<a id="vr-photo-search" href="https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image" target="_blank" rel="noopener noreferrer">Buscar fotografías en Wikimedia Commons ↗</a>',
   '<label for="vr-photo-url" id="vr-photo-url-label">Pegar enlace directo a una imagen HTTPS</label>',
   '<div class="vr-photo-url-row"><input type="url" id="vr-photo-url" placeholder="https://…/foto.jpg" autocomplete="off" spellcheck="false">',
   '<button type="button" id="vr-photo-apply">Aplicar</button></div>',
   '<label for="vr-photo-file" id="vr-photo-file-label">O elegir una foto de tu dispositivo</label>',
   '<input type="file" id="vr-photo-file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif">',
   '<label for="vr-photo-opacity" id="vr-photo-opacity-label">Legibilidad · intensidad del velo</label>',
   '<div class="vr-photo-opacity-row"><input id="vr-photo-opacity" type="range" min="40" max="95" step="5" value="75">',
   '<output id="vr-photo-opacity-value">75 %</output></div>',
   '<button type="button" id="vr-photo-clear">Quitar foto y volver al color</button>',
   '<p id="vr-photo-message" role="status" aria-live="polite"></p>'
  ].join('');
  panel.append(holder);
  const get=id=>holder.querySelector('#'+id);
  const ui={heading:get('vr-photo-heading'),search:get('vr-photo-search'),urlLabel:get('vr-photo-url-label'),url:get('vr-photo-url'),
   apply:get('vr-photo-apply'),fileLabel:get('vr-photo-file-label'),file:get('vr-photo-file'),opacityLabel:get('vr-photo-opacity-label'),
   opacity:get('vr-photo-opacity'),opacityValue:get('vr-photo-opacity-value'),clear:get('vr-photo-clear'),message:get('vr-photo-message')};
  const locales={
   es:{heading:'Imagen de fondo',search:'Buscar fotografías en Wikimedia Commons ↗',url:'Pegar un enlace directo HTTPS a la imagen',apply:'Aplicar',file:'O elegir una foto del dispositivo',opacity:'Legibilidad · intensidad del velo',clear:'Quitar foto y volver al color',info:'El fondo solo cambia en tu navegador. Las fotos externas se descargan desde su proveedor.',bad:'Usa un enlace HTTPS directo a una foto, sin usuario ni contraseña.',failed:'No se pudo cargar la foto. Usa el enlace directo al archivo, no a su ficha.',large:'El archivo no puede superar 8 MB.',type:'Elige un archivo JPG, PNG, WebP, GIF o AVIF.',local:'Foto local aplicada para esta sesión. No se envía al sitio.',remote:'Imagen externa aplicada para este navegador.',clearMessage:'Fondo original restaurado.',loading:'Comprobando imagen…'},
   en:{heading:'Background photo',search:'Find photos on Wikimedia Commons ↗',url:'Paste a direct HTTPS link to an image',apply:'Apply',file:'Or choose a photo from your device',opacity:'Readability · overlay strength',clear:'Remove photo and restore colour',info:'Only changes your browser. External photos load from their providers.',bad:'Use a direct HTTPS image URL without usernames or passwords.',failed:'Image failed to load. Use the image URL rather than its information page.',large:'Maximum local file size is 8 MB.',type:'Choose JPG, PNG, WebP, GIF or AVIF.',local:'Local photo applied for this tab; not uploaded.',remote:'External image applied to your browser.',clearMessage:'Original background restored.',loading:'Checking image…'},
   fr:{heading:'Photo de fond',search:'Trouver des photos sur Wikimedia Commons ↗',url:'Coller un lien direct HTTPS vers une image',apply:'Appliquer',file:'Ou choisir une photo locale',opacity:'Lisibilité · intensité du voile',clear:'Supprimer la photo et restaurer la couleur',info:'Le fond ne change que dans votre navigateur. Les photos externes viennent du fournisseur.',bad:'Utilisez un lien HTTPS sans identifiant ni mot de passe.',failed:'Impossible de charger la photo. Utilisez le lien direct vers le fichier.',large:'La taille maximale est de 8 Mo.',type:'Choisissez JPG, PNG, WebP, GIF ou AVIF.',local:'Photo locale appliquée dans cet onglet, sans envoi.',remote:'Image externe appliquée dans votre navigateur.',clearMessage:'Fond initial restauré.',loading:'Vérification de l’image…'}
  };
  const t=()=>locales[root.lang?.slice(0,2)]||locales.es;
  const key='vitruvia-photo-background-url-v1',veilKey='vitruvia-photo-background-veil-v1';
  let value='',objectURL=null,sequence=0;
  const allowed=new Set(['image/jpeg','image/png','image/webp','image/gif','image/avif']);
  function status(message){ui.message.textContent=message}
  function secureURL(raw){
   try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password)return null;
    return u.href;
   }catch{return null}
  }
  function setVeil(){
   const opacity=Math.max(40,Math.min(95,Number(ui.opacity.value)||75));
   ui.opacityValue.textContent=opacity+' %';
   const tone=root.dataset.readingBackgroundTone||(root.dataset.theme==='light'?'light':'dark');
   const rgb=tone==='light'?'249,248,246':'9,10,12';
   root.style.setProperty('--vr-photo-veil','rgba('+rgb+','+(opacity/100)+')');
   try{localStorage.setItem(veilKey,String(opacity))}catch{}
  }
  function clear(store=true){
   sequence++;value='';
   root.removeAttribute('data-reading-photo');
   root.style.removeProperty('--vr-photo-image');
   if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null}
   if(store)try{localStorage.removeItem(key)}catch{}
  }
  function apply(src,local=false,restoring=false){
   const ticket=++sequence;
   status(t().loading);
   const image=new Image();
   image.onload=()=>{
    if(ticket!==sequence)return;
    if(objectURL&&objectURL!==src){URL.revokeObjectURL(objectURL);objectURL=null}
    objectURL=local?src:null;value=src;
    root.style.setProperty('--vr-photo-image','url('+JSON.stringify(src)+')');
    root.dataset.readingPhoto='true';setVeil();
    try{if(local)localStorage.removeItem(key);else localStorage.setItem(key,src)}catch{}
    status(local?t().local:t().remote);
   };
   image.onerror=()=>{
    if(ticket!==sequence)return;
    if(local)URL.revokeObjectURL(src);
    if(restoring)clear();
    status(t().failed);
   };
   image.src=src;
  }
  function translate(){
   const l=t();
   for(const [el,text] of [[ui.heading,l.heading],[ui.search,l.search],[ui.urlLabel,l.url],[ui.apply,l.apply],
     [ui.fileLabel,l.file],[ui.opacityLabel,l.opacity],[ui.clear,l.clear]])el.textContent=text;
   ui.url.setAttribute('aria-label',l.url);
   ui.file.setAttribute('aria-label',l.file);
   ui.opacity.setAttribute('aria-label',l.opacity);
  }
  ui.apply.addEventListener('click',()=>{
   const link=secureURL(ui.url.value.trim());
   if(!link){status(t().bad);return}
   apply(link);
  });
  ui.url.addEventListener('keydown',event=>{
   if(event.key==='Enter'){event.preventDefault();ui.apply.click()}
  });
  ui.file.addEventListener('change',()=>{
   const file=ui.file.files?.[0];if(!file)return;
   if(!allowed.has(file.type)){status(t().type);ui.file.value='';return}
   if(file.size>8*1024*1024){status(t().large);ui.file.value='';return}
   apply(URL.createObjectURL(file),true);ui.url.value='';
  });
  ui.opacity.addEventListener('input',setVeil);
  ui.clear.addEventListener('click',()=>{clear();ui.url.value='';ui.file.value='';status(t().clearMessage)});
  // Switching back to the original colour picker explicitly disables the photo.
  for(const id of ['reading-background-color','front-background-custom'])
   document.getElementById(id)?.addEventListener('input',()=>{if(value){clear();status(t().clearMessage)}});
  document.querySelectorAll('[data-background-color],#front-background-auto,#reading-background-auto,#reading-font-reset')
   .forEach(btn=>btn.addEventListener('click',()=>{if(value){clear();status(t().clearMessage)}}));
  try{
   const opacity=Number(localStorage.getItem(veilKey));
   if(opacity>=40&&opacity<=95)ui.opacity.value=String(opacity);
   const stored=secureURL(localStorage.getItem(key));
   if(stored){ui.url.value=stored;apply(stored,false,true)}
  }catch{}
  setVeil();translate();if(!value)status(t().info);
  new MutationObserver(records=>{
   if(records.some(r=>r.attributeName==='lang'))translate();
   if(records.some(r=>r.attributeName==='data-theme'||r.attributeName==='data-reading-background-tone'))setVeil();
  }).observe(root,{attributes:true,attributeFilter:['lang','data-theme','data-reading-background-tone']});
  window.addEventListener('pagehide',()=>{if(objectURL)URL.revokeObjectURL(objectURL)});
  window.VitruviaPhotoBackground={clear:()=>ui.clear.click(),version:'1.0'};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
