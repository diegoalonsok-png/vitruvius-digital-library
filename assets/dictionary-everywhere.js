/* Diccionario donde se lee, no sólo donde estaba previsto
 *
 * El sitio ya tenía el diccionario: assets/classical-lexicon.js resuelve la
 * palabra bajo el cursor, la busca en el léxico local y arma la ficha. Lo que
 * faltaba era el alcance. `attachClick` se invocaba sobre contenedores
 * concretos —el visor de pasajes, el lector clásico, la barra de búsqueda—, de
 * modo que al encontrar una palabra en una frase de Vitruvio dentro de una
 * ficha de resultados, el clic no hacía nada.
 *
 * Este módulo delega el clic en todo el documento y decide con criterio
 * estrecho, para no abrir fichas sobre prosa castellana:
 *
 *   · una coincidencia resaltada por la búsqueda (<mark>), que es justamente
 *     «la palabra encontrada en la frase»;
 *   · cualquier palabra dentro de texto declarado en latín, griego o hebreo
 *     (atributo lang), que es como el sitio marca los pasajes;
 *   · cualquier palabra dentro de un contenedor con locus u obra declarados.
 *
 * No actúa donde `attachClick` ya está puesto (esos contenedores quedan
 * marcados con data-cl-words), para no abrir dos fichas por un clic. Si el
 * léxico no estuviera cargado, el enlace al Lexicon sustituye a la ficha.
 */
(()=>{
"use strict";
if(new URLSearchParams(location.search).get("embed")==="1")return;

const ROOT=(document.currentScript&&document.currentScript.src||"").replace(/assets\/dictionary-everywhere\.js.*$/,"");
const ANCIENT='[lang="la"],[lang="grc"],[lang="he"],[lang^="la-"],[lang^="grc-"],[lang="grc-x-polytonic"],[data-locus],[data-work]';
const MARKS='mark,.cl-hit,.query-hit';
const SKIP='a,button,input,select,textarea,summary,label,[contenteditable="true"],.cl-ui,.cl-dict,[data-cl-words],[data-no-dictionary]';
const MIN=3;

let panel=null,closer=null;

function style(){
 if(document.getElementById("dict-everywhere-style"))return;
 const css=document.createElement("style");css.id="dict-everywhere-style";
 css.textContent=`
 .dict-anywhere{position:absolute;z-index:9998;max-width:min(380px,92vw);max-height:min(60vh,420px);overflow:auto;
  background:Canvas;color:CanvasText;border:1px solid color-mix(in srgb,CanvasText 26%,transparent);
  border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.28);padding:12px 14px;font:400 13px/1.6 system-ui,sans-serif}
 .dict-anywhere h4{margin:0 0 6px;font:600 12px/1.4 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;opacity:.72}
 .dict-anywhere .dict-close{position:absolute;top:6px;right:8px;background:none;border:0;color:inherit;opacity:.6;font-size:17px;line-height:1;cursor:pointer;padding:4px}
 .dict-anywhere .dict-close:hover{opacity:1}
 .dict-anywhere .dict-fallback a{color:inherit;text-underline-offset:3px}
 [lang="la"] mark,[lang="grc"] mark,[data-locus] mark{cursor:help}
 @media(prefers-reduced-motion:no-preference){.dict-anywhere{animation:dict-in .12s ease-out}}
 @keyframes dict-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
 `;
 document.head.append(css);
}

function close(){
 if(!panel)return;
 panel.remove();panel=null;
 if(closer){document.removeEventListener("click",closer,true);closer=null}
}

function open(x,y){
 style();close();
 panel=document.createElement("div");
 panel.className="dict-anywhere";
 panel.setAttribute("role","dialog");
 panel.setAttribute("aria-label","Ficha de diccionario");
 const button=document.createElement("button");
 button.type="button";button.className="dict-close";button.setAttribute("aria-label","Cerrar la ficha");
 button.textContent="×";button.addEventListener("click",close);
 panel.append(button);
 const body=document.createElement("div");
 panel.append(body);
 document.body.append(panel);
 /* Colocación: debajo del clic, dentro de la ventana. */
 const width=panel.offsetWidth||320;
 const left=Math.max(8,Math.min(x-width/2,window.scrollX+document.documentElement.clientWidth-width-8));
 panel.style.left=left+"px";
 panel.style.top=(y+14)+"px";
 closer=event=>{if(panel&&!panel.contains(event.target))close()};
 setTimeout(()=>document.addEventListener("click",closer,true),0);
 return body;
}

document.addEventListener("keydown",event=>{if(event.key==="Escape")close()});

/* Obra declarada en el contexto, si la hay: permite al léxico preferir las
   acepciones atestiguadas en ese autor. */
const workOf=target=>{
 const host=target.closest&&target.closest("[data-work]");
 return host&&host.dataset?host.dataset.work||"":"";
};

function fallback(body,word){
 body.classList.add("dict-fallback");
 const title=document.createElement("h4");title.textContent="Diccionario";body.append(title);
 const form=document.createElement("p");form.textContent=word;body.append(form);
 const link=document.createElement("a");
 link.href=ROOT+"vitruvia-lexicon.html?"+new URLSearchParams({q:word,mode:"palabra"});
 link.textContent="Abrir la ficha en el Lexicon →";
 body.append(link);
}

function eligible(target){
 if(!target||!target.closest)return null;
 if(target.closest(SKIP))return null;
 const mark=target.closest(MARKS);
 if(mark)return {host:mark,fromMark:mark};
 const host=target.closest(ANCIENT);
 if(host)return {host,fromMark:null};
 return null;
}

function lookupAt(event){
 // La selección libre de fragmentos no debe abrir una ficha que la sustituya.
 const selection=window.getSelection?.();
 if(selection&&!selection.isCollapsed&&selection.toString().trim())return;
 const context=eligible(event.target);
 if(!context)return;
 const lexicon=window.ClassicalLexicon;
 /* La palabra completa: una coincidencia resaltada puede ser sólo el prefijo
    («symmetri» dentro de «symmetriae»), y la ficha debe ser de la palabra. */
 let word="";
 if(context.fromMark&&lexicon&&lexicon.wordOfMark)word=lexicon.wordOfMark(context.fromMark);
 if(!word&&lexicon&&lexicon.wordAt)word=lexicon.wordAt(event);
 if(!word&&context.fromMark)word=context.fromMark.textContent||"";
 word=String(word||"").trim();
 if(word.length<MIN||/\s/.test(word))return;

 const body=open(event.pageX,event.pageY);
 if(!body)return;
 if(lexicon&&lexicon.renderPanel){
  const options={work:workOf(event.target)};
  if(lexicon.detectLang)options.lang=lexicon.detectLang(word);
  Promise.resolve(lexicon.renderPanel(body,word,options)).catch(()=>fallback(body,word));
 }else fallback(body,word);
}

document.addEventListener("click",lookupAt);
/* Doble clic: el navegador ya selecciona la palabra, y es la vía habitual de
   quien lee con teclado. Alt+D consulta la selección actual. */
document.addEventListener("dblclick",lookupAt);
document.addEventListener("keydown",event=>{
 if(!event.altKey||event.key.toLowerCase()!=="d")return;
 const selection=String(window.getSelection&&window.getSelection()||"").trim();
 if(selection.length<MIN||/\s/.test(selection))return;
 const anchor=window.getSelection().anchorNode;
 const element=anchor&&(anchor.nodeType===3?anchor.parentElement:anchor);
 if(!eligible(element))return;
 event.preventDefault();
 const box=element.getBoundingClientRect();
 const body=open(window.scrollX+box.left+box.width/2,window.scrollY+box.bottom);
 const lexicon=window.ClassicalLexicon;
 if(body){
  if(lexicon&&lexicon.renderPanel)Promise.resolve(lexicon.renderPanel(body,selection,{lang:lexicon.detectLang?lexicon.detectLang(selection):""})).catch(()=>fallback(body,selection));
  else fallback(body,selection);
 }
});

window.VitruviaDictionaryEverywhere={open:lookupAt,close};
})();
