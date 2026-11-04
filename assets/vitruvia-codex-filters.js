/* Vitruvia · non-destructive manuscript image contrast and inversion.
   The original scan remains unchanged; all filters are CSS-only. */
(()=>{
 'use strict';
 const possible=[
  {image:'folio',viewport:'viewport',after:'codex-local-loupe'},
  {image:'image',viewport:'stage',after:'codex-local-loupe'}
 ];
 const found=possible.find(item=>document.getElementById(item.image)&&document.getElementById(item.viewport));
 if(!found)return;
 const image=document.getElementById(found.image);
 const after=document.getElementById(found.after);
 const toolbar=after?.parentElement||document.getElementById(found.viewport)?.previousElementSibling;
 if(!toolbar||document.getElementById('codex-image-filters'))return;
 const group=document.createElement('fieldset');
 group.id='codex-image-filters';group.className='codex-image-filters';
 group.innerHTML=[
  '<legend id="codex-image-filter-heading">Visualización del folio</legend>',
  '<div class="codex-image-filter-modes" role="group" aria-labelledby="codex-image-filter-heading">',
  '<button type="button" data-folio-view="original" aria-pressed="true">Original</button>',
  '<button type="button" data-folio-view="bw" aria-pressed="false">B/N</button>',
  '<button type="button" data-folio-view="invert" aria-pressed="false">Invertir</button></div>',
  '<label for="codex-contrast" id="codex-contrast-label">Contraste</label>',
  '<input type="range" id="codex-contrast" min="65" max="220" step="5" value="100" aria-describedby="codex-contrast-value">',
  '<output for="codex-contrast" id="codex-contrast-value">100 %</output>',
  '<button type="button" id="codex-filters-reset">Restablecer imagen</button>'
 ].join('');
 if(after)after.after(group);else toolbar.append(group);
 const contrast=group.querySelector('#codex-contrast');
 const contrastValue=group.querySelector('#codex-contrast-value');
 const heading=group.querySelector('#codex-image-filter-heading');
 const contrastLabel=group.querySelector('#codex-contrast-label');
 const reset=group.querySelector('#codex-filters-reset');
 const buttons=[...group.querySelectorAll('[data-folio-view]')];
 let mode='original';
 const options={
  es:{heading:'Visualización del folio',original:'Original',bw:'Blanco y negro',invert:'Invertir colores',contrast:'Contraste',reset:'Restablecer imagen'},
  en:{heading:'Manuscript appearance',original:'Original',bw:'Black and white',invert:'Invert colours',contrast:'Contrast',reset:'Reset image'},
  fr:{heading:'Affichage du folio',original:'Original',bw:'Noir et blanc',invert:'Inverser les couleurs',contrast:'Contraste',reset:'Réinitialiser l’image'},
  it:{heading:'Visualizzazione del foglio',original:'Originale',bw:'Bianco e nero',invert:'Inverti colori',contrast:'Contrasto',reset:'Ripristina immagine'},
  de:{heading:'Handschriftenansicht',original:'Original',bw:'Schwarzweiß',invert:'Farben umkehren',contrast:'Kontrast',reset:'Bild zurücksetzen'},
  pt:{heading:'Visualização do fólio',original:'Original',bw:'Preto e branco',invert:'Inverter cores',contrast:'Contraste',reset:'Restaurar imagem'}
 };
 const locale=()=>options[document.documentElement.lang?.slice(0,2)]||options.es;
 function translate(){
  const t=locale();
  heading.textContent=t.heading;contrastLabel.textContent=t.contrast;
  contrast.title=t.contrast;reset.textContent=t.reset;
  for(const button of buttons){
   const kind=button.dataset.folioView;
   button.textContent=t[kind];
   button.title=t[kind];
  }
 }
 function calculate(){
  const value=Math.max(65,Math.min(220,Number(contrast.value)||100));
  const adjustments=[];
  if(mode==='bw')adjustments.push('grayscale(1)');
  if(mode==='invert')adjustments.push('invert(1)');
  if(value!==100)adjustments.push('contrast('+value+'%)');
  return adjustments.length?adjustments.join(' '):'none';
 }
 function apply(){
  const filter=calculate();
  image.style.filter=filter;
  const lensImage=document.getElementById('codex-local-loupe-image');
  if(lensImage)lensImage.style.filter=filter;
  contrastValue.textContent=contrast.value+' %';
  for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.folioView===mode));
 }
 for(const button of buttons){
  button.addEventListener('click',()=>{mode=button.dataset.folioView;apply()});
 }
 contrast.addEventListener('input',apply);
 reset.addEventListener('click',()=>{mode='original';contrast.value='100';apply()});
 // Keep display parameters across folio changes, without persisting changes
 // to local storage or altering downloaded source files.
 image.addEventListener('load',apply);
 new MutationObserver(records=>{
  if(records.some(x=>x.attributeName==='lang'))translate();
 }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 translate();apply();
 window.VitruviaCodexFilters={getState:()=>({mode,contrast:Number(contrast.value)}),reset:()=>reset.click(),version:'1.0'};
})();
