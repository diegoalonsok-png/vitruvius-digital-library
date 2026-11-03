/* Shared six-language navigation selector. Only UI labels for which translations exist are translated.
   Greek/Latin scholarly sources, quotations, passages, and editorial texts remain unchanged. */
(()=>{"use strict";
 const KEY="vitruvius-ui-lang",CODES=["es","en","fr","it","de","pt"];
 const names={es:"Español",en:"English",fr:"Français",it:"Italiano",de:"Deutsch",pt:"Português"};
 const lookups={
 "Ediciones históricas":["Historical editions","Éditions historiques","Edizioni storiche","Historische Ausgaben","Edições históricas"],
 "Como citar":["How to cite","Comment citer","Come citare","Zitierweise","Como citar"],
 "Cómo citar":["How to cite","Comment citer","Come citare","Zitierweise","Como citar"],
 "Bibliotheca Graeca et Latina · Autores y tratados":["Greek and Latin Library · Authors and treatises","Bibliothèque grecque et latine · Auteurs et traités","Biblioteca greca e latina · Autori e trattati","Griechisch-lateinische Bibliothek · Autoren und Werke","Biblioteca grega e latina · Autores e tratados"],
 "Biblioteca principal":["Main library","Bibliothèque principale","Biblioteca principale","Hauptbibliothek","Biblioteca principal"],
 "Buscar":["Search","Rechercher","Cerca","Suche","Pesquisar"],
 "Manuscritos":["Manuscripts","Manuscrits","Manoscritti","Handschriften","Manuscritos"],
 "Personajes y lugares":["People and places","Personnes et lieux","Persone e luoghi","Personen und Orte","Pessoas e lugares"],
 "Fuentes y método":["Sources and methodology","Sources et méthode","Fonti e metodo","Quellen und Methode","Fontes e método"],
 "Volver a la biblioteca":["Back to library","Retour à la bibliothèque","Torna alla biblioteca","Zur Bibliothek","Voltar à biblioteca"]
 };
 let current="es";try{const c=localStorage.getItem(KEY);if(CODES.includes(c))current=c}catch{}
 const bases=new WeakMap();
 function translateStatic(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode()){
   const el=node.parentElement;if(!el||el.closest("script,style,code,pre,textarea,[lang=la],[lang=grc],[lang=gr],[lang=el],.reader-transcript,.study,.passage-text,.latin-name,.greek-name,#classic-detail"))continue;
   const str=node.nodeValue,trim=str?.trim();if(!trim)continue;
   let baseline=bases.get(node);
   if(baseline===undefined){baseline=Object.keys(lookups).find(k=>k===trim||lookups[k].includes(trim))||trim;bases.set(node,baseline)}
   const values=lookups[baseline];if(!values)continue;
   const translated=current==="es"?baseline:values[CODES.indexOf(current)-1];
   const next=str.replace(trim,translated);if(node.nodeValue!==next)node.nodeValue=next;
  }
 }
 function init(){
  if(!document.body)return;
  // Existing dedicated selectors remain the single visible control; no duplicate overlay.
  const built=document.querySelector("#classic-ui-language,#atlas-language-select,.header-languages select");
  if(built){
    if([...built.options].some(o=>o.value===current)&&built.value!==current){built.value=current;built.dispatchEvent(new Event("change",{bubbles:true}))}
    built.addEventListener("change",()=>{current=built.value;try{localStorage.setItem(KEY,current)}catch{};translateStatic()});
    translateStatic();return;
  }
  const toolbar=document.createElement("label");
  toolbar.className="site-global-language";
  toolbar.setAttribute("aria-label","Idioma de navegación / Navigation language");
  const span=document.createElement("span");span.textContent="🌐";
  const sel=document.createElement("select");sel.title="Idioma general (la traducción disponible depende de la página)";
  for(const c of CODES){const opt=document.createElement("option");opt.value=c;opt.textContent=names[c];sel.append(opt)}
  sel.value=current;toolbar.append(span,sel);
  const target=document.querySelector(".research-nav-controls,.header-actions,.header-controls,.classic-menu");
  if(target){target.append(toolbar)}else{toolbar.classList.add("site-global-language-floating");document.body.append(toolbar)}
  sel.addEventListener("change",()=>{current=sel.value;document.documentElement.lang=current;try{localStorage.setItem(KEY,current);localStorage.setItem("vitruvius-atlas-lang",current)}catch{};translateStatic()});
  translateStatic();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();