/* Independent page personalization, with permanently dark textual viewers. */
(()=>{'use strict';
const KEY='vitruvius-concordance-page-v2';
const defaults={bg:'#111820',fg:'#f0ece2',font:'Georgia, serif',size:17};
const fonts={'Georgia':'Georgia, serif','Garamond':'Garamond, "Times New Roman", serif','Palatino':'Palatino, "Palatino Linotype", serif','Times New Roman':'"Times New Roman", serif','Cardo':'Cardo, Georgia, serif','Gentium Book Plus':'"Gentium Book Plus", Georgia, serif','Arial':'Arial, sans-serif','Verdana':'Verdana, sans-serif'};
const presets=[['Negro','#111820','#f0ece2'],['Azul noche','#172c44','#f7f2ea'],['Sepia','#efe0c6','#302519'],['Blanco','#ffffff','#1b2835'],['Verde tinta','#16332c','#f3f0df'],['Granate','#3d1e31','#fff2df']];
const valid=c=>/^#[0-9a-f]{6}$/i.test(c);
const root=document.documentElement;root.classList.add('lexicon-concordance-page');
let state={...defaults};try{let d=JSON.parse(localStorage.getItem(KEY)||'{}');if(valid(d.bg))state.bg=d.bg;if(valid(d.fg))state.fg=d.fg;if(Object.values(fonts).includes(d.font))state.font=d.font;if(Number.isFinite(d.size)&&d.size>=13&&d.size<=28)state.size=d.size;}catch{}
const apply=()=>{root.style.setProperty('--lc-page-bg',state.bg);root.style.setProperty('--lc-page-ink',state.fg);root.style.setProperty('--lc-font',state.font);root.style.setProperty('--lc-font-size',state.size+'px');try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
apply();
function mount(){
const main=document.querySelector('main'),filters=main?.querySelector('.filters');if(!filters||document.querySelector('#concordance-personalize'))return;
const panel=document.createElement('section');panel.id='concordance-personalize';panel.setAttribute('aria-label','Personalización de página y tipografía');
const title=document.createElement('div');title.className='concordance-personalize-heading';panel.append(title);
const strong=document.createElement('strong');strong.textContent='◈ APARIENCIA · VITRVVIVS';title.append(strong);
const toggle=document.createElement('button');toggle.type='button';toggle.textContent='🎨 Color y tipografía';toggle.setAttribute('aria-expanded','true');title.append(toggle);
const controls=document.createElement('div');controls.className='concordance-personalize-controls';panel.append(controls);
function selectColor(name,k){const label=document.createElement('label');label.textContent=name;const x=document.createElement('input');x.type='color';x.value=state[k];x.setAttribute('aria-label',name);x.addEventListener('input',()=>{state[k]=x.value;apply()});label.append(x);controls.append(label);return x}
const bg=selectColor('Fondo de toda la página','bg'),fg=selectColor('Color de los títulos y textos','fg');
const fontLabel=document.createElement('label');fontLabel.textContent='Tipografía';
const select=document.createElement('select');for(const [name,value] of Object.entries(fonts)){let o=document.createElement('option');o.value=value;o.textContent=name;select.append(o)}select.value=state.font;select.addEventListener('change',()=>{state.font=select.value;apply()});fontLabel.append(select);controls.append(fontLabel);
const sizeLabel=document.createElement('label');sizeLabel.textContent='Tamaño de los textos';
const size=document.createElement('input');size.type='range';size.min=13;size.max=28;size.value=state.size;
const output=document.createElement('output');output.textContent=state.size+' px';size.addEventListener('input',()=>{state.size=Number(size.value);output.textContent=size.value+' px';apply()});sizeLabel.append(size,output);controls.append(sizeLabel);
const buttons=document.createElement('div');buttons.className='concordance-presets';controls.append(buttons);
function redraw(){bg.value=state.bg;fg.value=state.fg;select.value=state.font;size.value=state.size;output.textContent=state.size+' px';apply()}
for(const [label,bgc,fgc] of presets){const b=document.createElement('button');b.type='button';b.textContent=label;b.title='Aplicar '+label;b.style.borderBottom='3px solid '+bgc;b.addEventListener('click',()=>{state.bg=bgc;state.fg=fgc;redraw()});buttons.append(b)}
const reset=document.createElement('button');reset.type='button';reset.textContent='Restablecer';reset.addEventListener('click',()=>{state={...defaults};redraw()});controls.append(reset);
toggle.addEventListener('click',()=>{controls.hidden=!controls.hidden;toggle.setAttribute('aria-expanded',String(!controls.hidden))});
main.insertBefore(panel,main.querySelector('.eyebrow')||main.firstChild);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();