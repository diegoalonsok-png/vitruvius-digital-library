/* The site-wide promotional/editorial edition identity strip is retired.
   Bibliographic data stays in data/catalog.json and scholarly dossiers.
   This no-op preserves compatibility with any old pages still loading the asset. */
(()=>{"use strict";
 window.__vdlEditionIdentityLoaded=true;
 const clear=()=>document.querySelectorAll("#vdl-identity-strip,.vdl-identity-strip").forEach(el=>el.remove());
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",clear,{once:true});
 else clear();
})();
