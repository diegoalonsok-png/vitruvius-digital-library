/* Reading comfort controls for the existing bilingual reader.
   Visual preferences only: no changes to the underlying texts or citations. */
(()=>{'use strict';
function mount(){
 const reader=document.getElementById('reading');
 const bar=document.getElementById('bilingual-appearance');
 if(!reader||!bar||document.getElementById('vdl-reading-size'))return;
 const key='vdl-reader-comfort-v1';
 const sizes=['100','115','130','150'];
 let preference={size:'100',clean:false};
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&sizes.includes(String(saved.size)))preference.size=String(saved.size);preference.clean=saved?.clean===true}catch{}
 const label=document.createElement('label');label.textContent='Tamaño ';
 const select=document.createElement('select');select.id='vdl-reading-size';select.setAttribute('aria-label','Tamaño del texto del lector');
 for(const n of sizes){const o=new Option(n+' %',n);select.add(o)}
 label.append(select);
 const button=document.createElement('button');button.type='button';button.id='vdl-clean-reading';
 button.setAttribute('aria-label','Alternar lectura limpia sin navegación');button.setAttribute('aria-pressed','false');
 bar.insertBefore(label,bar.querySelector('.bilingual-appearance-note'));
 bar.insertBefore(button,bar.querySelector('.bilingual-appearance-note'));
 const sheet=document.createElement('style');sheet.id='vdl-reader-comfort-style';
 sheet.textContent=`
 #reading[data-reading-size="100"] .scholarly-panel .scholarly-text{font-size:inherit}
 #reading[data-reading-size="115"] .scholarly-panel .scholarly-text{font-size:1.15em!important;line-height:1.8!important}
 #reading[data-reading-size="130"] .scholarly-panel .scholarly-text{font-size:1.3em!important;line-height:1.85!important}
 #reading[data-reading-size="150"] .scholarly-panel .scholarly-text{font-size:1.5em!important;line-height:1.9!important}
 #reading[data-reading-size]:not([data-reading-size="100"]) .scholarly-panel .scholarly-text :is(p,div){font-size:inherit!important;line-height:inherit!important}
 body.vdl-clean-reading :is(.institution-bar,.site-header,#site-bar,.site-bar,.editorial-footer,footer,.reader-find){display:none!important}
 body.vdl-clean-reading #reading :is(.reader-intro,.provenance){display:none!important}
 body.vdl-clean-reading #reading{max-width:1520px!important;width:calc(100% - 24px)!important;padding-top:12px!important}
 body.vdl-clean-reading #reading .scholarly-columns{max-width:none!important}
 body.vdl-clean-reading #reading .scholarly-panel{min-width:0}
 body.vdl-clean-reading nav[aria-label="Continuar investigación"]{display:none!important}
 #reading :is(#vdl-reading-size,#vdl-clean-reading):focus-visible{outline:3px solid #d3aa62;outline-offset:2px}
 #reading .scholarly-panel mark{background:#ffe08b!important;color:#152433!important}
 html[data-theme="dark"] #reading :is(.edition-reference,.provenance,.source,.bilingual-status){color:#f0eee7}
 @media print{body.vdl-clean-reading #reading{width:100%!important}}
 `;
 document.head.append(sheet);
 const apply=()=>{
  select.value=preference.size;
  reader.dataset.readingSize=preference.size;
  document.body.classList.toggle('vdl-clean-reading',preference.clean);
  button.setAttribute('aria-pressed',String(preference.clean));
  button.textContent=preference.clean?'Salir de lectura limpia':'Lectura limpia';
  try{localStorage.setItem(key,JSON.stringify(preference))}catch{}
 };
 select.addEventListener('change',()=>{if(sizes.includes(select.value)){preference.size=select.value;apply()}});
 button.addEventListener('click',()=>{preference.clean=!preference.clean;apply()});
 apply();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
