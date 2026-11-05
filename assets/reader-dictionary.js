/* Diccionario al hacer clic en una palabra latina o griega del texto de Vitruvio (lector bilingüe, Codex H).
   Uso: <script defer src="assets/reader-dictionary.js" data-target="#latin-text" data-after="#latin-text"></script> */
(()=>{
"use strict";
const me=document.currentScript;const target=me?.dataset.target||"#latin-text",after=me?.dataset.after||target;
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn):fn()}
ready(()=>{
 const LEX=window.ClassicalLexicon,root=document.querySelector(target);if(!LEX||!root)return;
 const panel=document.createElement("div");panel.className="reader-dictionary";panel.setAttribute("role","status");panel.setAttribute("aria-live","polite");
 const hint=document.createElement("p");hint.className="reader-dictionary-hint";hint.textContent="Haga clic en una palabra latina o griega para consultar el diccionario.";
 const anchor=document.querySelector(after)||root;anchor.after(hint,panel);
 const st=document.createElement("style");st.textContent=".reader-dictionary-hint{font:12px/1.5 system-ui,-apple-system,sans-serif;opacity:.7;margin:8px 0 0}.reader-dictionary:empty{display:none}.reader-dictionary{max-width:760px}";document.head.append(st);
 LEX.attachClick(root,panel,w=>({lang:LEX.detectLang(w),work:"vitruvius"}));
});
})();
