(()=>{'use strict';
const dictionary={
symmetria:['symmetria, -ae','sustantivo femenino','Correspondencia proporcional de las partes entre sí y con el conjunto; no simplemente simetría especular moderna.'],
architectura:['architectura, -ae','sustantivo femenino','Arquitectura; disciplina y práctica de proyectar y construir.'],
proportio:['proportio, -onis','sustantivo femenino','Proporción; relación entre magnitudes.'],
ordinatio:['ordinatio, -onis','sustantivo femenino','Ordenación proporcionada de las partes.'],
dispositio:['dispositio, -onis','sustantivo femenino','Disposición u organización de los elementos.'],
eurythmia:['eurythmia, -ae','sustantivo femenino','Euritmia; armonía visible de las proporciones.'],
decor:['decor, decoris','sustantivo masculino','Decoro; adecuación de una obra a su carácter.'],
firmitas:['firmitas, -atis','sustantivo femenino','Firmeza o estabilidad.'],
utilitas:['utilitas, -atis','sustantivo femenino','Utilidad o adecuación al uso.'],
venustas:['venustas, -atis','sustantivo femenino','Belleza o gracia.'],
domus:['domus, -us','sustantivo femenino','Casa o vivienda.'],
templum:['templum, -i','sustantivo neutro','Templo.'],
columna:['columna, -ae','sustantivo femenino','Columna.'],
opus:['opus, operis','sustantivo neutro','Obra o trabajo.'],
modulus:['modulus, -i','sustantivo masculino','Módulo; medida de referencia.'],
corpus:['corpus, corporis','sustantivo neutro','Cuerpo o conjunto organizado.']
};
const forms={symmetriae:'symmetria',symmetriam:'symmetria',architecturae:'architectura',proportionis:'proportio',ordinationis:'ordinatio',dispositionis:'dispositio',firmitatis:'firmitas',utilitatis:'utilitas',venustatis:'venustas',domum:'domus',domo:'domus',columnae:'columna',operis:'opus',moduli:'modulus',corporis:'corpus'};
const panel=document.createElement('dialog');panel.id='critical-latin-gloss';
panel.innerHTML='<form method="dialog"><button class="critical-gloss-close" aria-label="Cerrar">×</button></form><p class="gloss-eyebrow">DICCIONARIO LATINO · DE ARCHITECTURA</p><h3 id="gloss-term"></h3><p id="gloss-class"></p><p id="gloss-definition"></p><p id="gloss-status"></p><div id="gloss-image"></div><a id="gloss-lexicon">Estudiar en Lexicon</a>';
const style=document.createElement('style');
style.textContent='#critical-unified-results .critical-latin-word{border:0;padding:0 1px;background:transparent;color:inherit;font:inherit;cursor:pointer;text-decoration:underline dotted #80838b;text-underline-offset:3px}#critical-unified-results .critical-latin-word:hover,#critical-unified-results .critical-latin-word:focus-visible{background:#36383e}#critical-latin-gloss{position:fixed;max-width:min(460px,calc(100vw - 28px));width:440px;max-height:75vh;overflow:auto;padding:22px;margin:auto;background:#131417;color:#eee;border:1px solid #61636a;border-radius:6px;box-shadow:0 15px 60px #000b}#critical-latin-gloss::backdrop{background:#0009}#critical-latin-gloss h3{font:normal 27px Georgia,serif;color:#fff;margin:10px 0}#critical-latin-gloss p{color:#ddd;line-height:1.6;margin:9px 0}#critical-latin-gloss .gloss-eyebrow{font:600 11px Arial,sans-serif;letter-spacing:.1em;color:#b2b2b5}#critical-latin-gloss a{display:inline-block;color:#eee;text-decoration:underline;margin-top:15px}#critical-latin-gloss .critical-gloss-close{float:right;color:#eee;background:#2c2d31;border:1px solid #777;padding:3px 10px;font-size:22px;cursor:pointer}';
document.head.append(style);document.body.append(panel);
function display(form){
 const text=String(form||'').trim(),key=text.toLowerCase().normalize('NFD').replace(/\p{M}/gu,''),lemma=forms[key]||key,entry=dictionary[lemma];
 document.getElementById('gloss-term').textContent=entry?entry[0]:text;
 document.getElementById('gloss-class').textContent=entry?entry[1]:'Forma latina · lema no verificado';
 document.getElementById('gloss-definition').textContent=entry?entry[2]:'No existe una definición verificada en el glosario local para esta forma.';
 document.getElementById('gloss-status').textContent=entry?'Glosa orientativa; consultar la entrada lexicográfica y sus fuentes.':'No se infiere una traducción ni una forma gramatical sin comprobación documental.';
 document.getElementById('gloss-image').replaceChildren();
 document.getElementById('gloss-lexicon').href='vitruvia-lexicon.html?q='+encodeURIComponent(lemma);
 if(!panel.open)panel.showModal();
}
function enhance(node){
 if(node.dataset.latinGlossReady)return;
 node.dataset.latinGlossReady='1';
 const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),texts=[];
 while(walker.nextNode())texts.push(walker.currentNode);
 for(const text of texts){
  if(text.parentElement?.closest('button,a,script,style'))continue;
  const raw=text.textContent||'',regex=/[\p{L}\p{M}]+/gu;
  const matches=[...raw.matchAll(regex)];if(!matches.length)continue;
  const fragment=document.createDocumentFragment();let pos=0;
  for(const match of matches){
   fragment.append(document.createTextNode(raw.slice(pos,match.index)));
   const button=document.createElement('button');button.type='button';button.className='critical-latin-word';button.textContent=match[0];button.setAttribute('aria-label','Consultar palabra latina '+match[0]);fragment.append(button);pos=match.index+match[0].length;
  }
  fragment.append(document.createTextNode(raw.slice(pos)));text.replaceWith(fragment);
 }
}
const results=document.getElementById('critical-unified-results');if(!results)return;
const scan=()=>results.querySelectorAll('.critical-unified-text[lang="la"]').forEach(enhance);
results.addEventListener('click',e=>{const button=e.target.closest('.critical-latin-word');if(button)display(button.textContent)});
new MutationObserver(scan).observe(results,{childList:true,subtree:true});scan();
})();