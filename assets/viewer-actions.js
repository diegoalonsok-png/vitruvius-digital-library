/* Vitruvius Digital Library · subtle per-image tools
   No server-side upload. Sharing sends only a link and a bibliographic credit.
   Image download is attempted in the browser, with official image fallback. */
(()=>{
 const pages={
  'harleianus.html':{img:'folio',anchor:'stage',num:'page',label:'current-folio',name:'Codex H · Harley MS 2767',credit:'British Library · Harley MS 2767'},
  'sulpizio-1486.html':{img:'su-image',anchor:'su-stage',num:'su-page',label:'su-status',name:'Sulpizio da Veroli · c. 1486–1487',credit:'Bayerische Staatsbibliothek · 2 Inc.s.a. 1221 m'},
  'giocondo-1511.html':{img:'gio-image',anchor:'gio-stage',num:'gio-page',label:'gio-label',name:'Fra Giocondo · 1511',credit:'e-rara · Stiftung Bibliothek Werner Oechslin'},
  'cesariano-1521.html':{img:'ces-image',anchor:'ces-stage',num:'ces-page',label:'ces-label',name:'Cesare Cesariano · 1521',credit:'e-rara · Stiftung Bibliothek Werner Oechslin'},
  'barbaro-1567.html':{img:'bar-image',anchor:'bar-stage',num:'bar-page',label:'bar-label',name:'Daniele Barbaro · 1567',credit:'e-rara · Stiftung Bibliothek Werner Oechslin'},
  'laboratorio-h.html':{img:'img',anchor:'laboratory-workspace',num:'number',label:'photo-label',name:'Codex H · lectura en tres visores',credit:'British Library · Harley MS 2767 · lectura editorial experimental'}
 };
 const cfg=pages[location.pathname.split('/').pop()];if(!cfg)return;
 const stylesheet=document.createElement('style');
 stylesheet.textContent=`
 .vd-image-actions{display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:8px 10px;margin:9px 0;border:1px solid #c7b99d;border-radius:4px;background:#faf7ef;color:#354456}
 .vd-image-actions .vd-actions-title{font:600 11px system-ui,sans-serif;letter-spacing:.025em;margin-right:3px;color:#555f66}
 .vd-image-actions button{font:600 11px/1.3 system-ui,sans-serif!important;min-height:30px!important;padding:6px 10px!important;border-radius:3px!important;border:1px solid #bdb095!important;background:#fffdf8!important;color:#263c4d!important;cursor:pointer!important;box-shadow:none!important}
 .vd-image-actions button:hover,.vd-image-actions button:focus-visible{border-color:#876a3e!important;background:#efe3cf!important}
 .vd-image-actions button:disabled{opacity:.45;cursor:not-allowed!important}
 .vd-image-actions .vd-status{flex-basis:100%;font:11px/1.4 system-ui,sans-serif;color:#4c5962;margin:0}
 .vd-image-actions .vd-status:empty{display:none}
 .vd-image-actions .vd-credit{font-size:10px;opacity:.8}
 html[data-theme="dark"] .vd-image-actions{background:#253847;color:#ebe2d4;border-color:#8190a1}
 html[data-theme="dark"] .vd-image-actions .vd-actions-title,html[data-theme="dark"] .vd-image-actions .vd-status{color:#f0e4d0}
 html[data-theme="dark"] .vd-image-actions button{background:#334d62!important;color:#fffaf0!important;border-color:#a0a9b5!important}
 html[data-theme="dark"] .vd-image-actions button:hover{background:#466b86!important}
 #vd-print-page{display:none}
 @media print{
  body.vd-print-active>*:not(#vd-print-page){display:none!important}
  body.vd-print-active #vd-print-page{display:block!important;color:#181818!important;background:white!important}
  #vd-print-page h1{font:20pt Georgia,serif;margin:0 0 8pt}
  #vd-print-page p{font:10pt Georgia,serif;margin:8pt 0}
  #vd-print-page img{display:block;max-width:100%;max-height:80vh;width:auto;height:auto;object-fit:contain;margin:auto;filter:none!important}
  @page{size:auto;margin:13mm}
 }`;
 document.head.append(stylesheet);
 function mount(){
  const image=document.getElementById(cfg.img),anchor=document.getElementById(cfg.anchor);if(!image||!anchor||document.querySelector('[data-vd-share]'))return;
  const bar=document.createElement('div');bar.className='vd-image-actions';bar.setAttribute('role','group');bar.setAttribute('aria-label','Acciones del folio o imagen visible');bar.dataset.vdShare='1';
  const title=document.createElement('span');title.className='vd-actions-title';title.textContent='Imagen actual:';
  bar.append(title);
  const status=document.createElement('p');status.className='vd-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  function state(){
   const input=document.getElementById(cfg.num);
   const num=input?String(input.value).trim():'';const folio=String(document.getElementById(cfg.label)?.textContent||'').trim().slice(0,90);
   const url=new URL(location.href);url.searchParams.delete('check');url.searchParams.delete('verify');url.searchParams.delete('test');url.searchParams.set('image',num||'1');
   const src=image.currentSrc||image.src;
   return {num,folio,src,url:url.href,caption:cfg.name+' · imagen '+(num||'?')+(folio?' · '+folio:''),credit:cfg.credit};
  }
  const ready=()=>Boolean(image.complete&&image.naturalWidth&&image.currentSrc);
  const button=(symbol,label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=symbol+' '+label;b.addEventListener('click',fn);bar.append(b);return b};
  const feedback=message=>{status.textContent=message};
  function openExternal(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.click()}
  button('↓','Guardar imagen',async()=>{
    if(!ready()){feedback('La imagen todavía no está cargada.');return}
    const s=state();const ext=/\.png(?:[?#]|$)/i.test(s.src)?'.png':'.jpg';
    const filename='vitruvius-'+location.pathname.split('/').pop().replace(/\.html$/,'')+'-'+(s.num||'actual')+ext;
    try{
      const response=await fetch(s.src,{mode:'cors'});if(!response.ok)throw Error('HTTP '+response.status);
      const blob=await response.blob();
      if(!blob.type.startsWith('image/'))throw Error('El servidor no entregó una imagen');
      const src=URL.createObjectURL(blob),a=document.createElement('a');a.href=src;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(src),12000);feedback('Imagen guardada con referencia al ejemplar. Revisa las condiciones de reutilización.');
    }catch{
      if(s.src.startsWith('blob:')){feedback('Esta imagen local no puede recuperarse; prueba abrirla desde su origen.');return}
      openExternal(s.src);feedback('El servidor institucional restringe la descarga directa. Se abrió la imagen original: usa «Guardar imagen como…» desde esa pestaña.');
    }
  });
  button('⎙','Imprimir',()=>{
    if(!ready()){feedback('Primero abre una imagen y esperá a que cargue.');return}
    const s=state();
    let page=document.getElementById('vd-print-page');if(!page){page=document.createElement('div');page.id='vd-print-page';document.body.append(page)}
    page.replaceChildren();
    const h=document.createElement('h1');h.textContent=s.caption;
    const p=document.createElement('p');p.textContent='Fuente: '+s.credit+' · '+s.url;
    const pic=document.createElement('img');pic.alt=s.caption;pic.src=s.src;
    page.append(h,p,pic);document.body.classList.add('vd-print-active');
    const clear=()=>{document.body.classList.remove('vd-print-active');window.removeEventListener('afterprint',clear)};
    window.addEventListener('afterprint',clear,{once:true});
    window.print();
  });
  button('✉','Correo',()=>{
    if(!ready()){feedback('Primero carga la imagen actual.');return}
    const s=state();
    const subject='Vitruvio · '+s.caption;
    const body=s.caption+'\n'+s.url+'\n\nFuente: '+s.credit+'\nEl enlace abre esta imagen en el visor de la biblioteca. La fotografía no se adjunta automáticamente.';
    location.href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    feedback('Se abrió el programa de correo con el enlace al folio; la imagen no se adjunta automáticamente.');
  });
  button('◉','WhatsApp',()=>{
    if(!ready()){feedback('Primero carga la imagen actual.');return}
    const s=state(),message=s.caption+'\n'+s.url+'\nFuente: '+s.credit;
    openExternal('https://api.whatsapp.com/send?text='+encodeURIComponent(message));
    feedback('Se abrió WhatsApp con el enlace a la imagen actual.');
  });
  const credit=document.createElement('span');credit.className='vd-credit';credit.textContent='Imagen: institución conservadora · respetar licencia';
  bar.append(credit,status);
  if(cfg.anchor==='laboratory-workspace'){
    const panel=anchor.querySelector('section.panel');
    if(panel){const note=panel.querySelector('#photo-label');(note||panel.firstElementChild).insertAdjacentElement('afterend',bar)}else anchor.parentNode.insertBefore(bar,anchor);
  }else anchor.parentNode.insertBefore(bar,anchor);
  image.addEventListener('load',()=>{feedback('')});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();