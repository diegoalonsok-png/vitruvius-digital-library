/* Additive Palladio edition cards. Existing viewers remain untouched. */
(() => {
  "use strict";
  const p = new URLSearchParams(location.search);
  const section = document.getElementById("palladio-ediciones-idiomas");
  if (!section || p.get("obra") !== "palladio-quattro-libri") return;
  section.hidden = false;
  const base = "https://libros.vitruvius-digital-library.org/classics/palladio/translations/";
  const make = (tag, content, attributes = {}) => {
    const element = document.createElement(tag);
    element.textContent = content || "";
    Object.entries(attributes).forEach(([k,v]) => element.setAttribute(k,v));
    return element;
  };
  async function init(edition) {
    const preview = section.querySelector('[data-edition-preview="'+edition+'"]');
    const slot = section.querySelector('[data-edition-pages="'+edition+'"]');
    if (!preview || !slot) return;
    try {
      const url = base + edition + "/manifest.json";
      const response = await fetch(url,{cache:"no-cache"});
      if (!response.ok) return;
      const manifest = await response.json();
      if (!manifest || manifest.id !== "palladio-"+edition || !Array.isArray(manifest.pages) || !manifest.pages.length) return;
      const pageList = manifest.pages.filter(x=>Number.isSafeInteger(x.pdf_page) && x.pdf_page>0 && /^pages\/page-\d+\.jpg$/.test(x.image));
      if (!pageList.length) return;
      const selected = Math.max(1, Math.min(pageList.length,Number(new URLSearchParams(location.search).get("pagina-"+edition)) || 1));
      let current = selected - 1;
      const image = make("img","",{alt:"Página digital de la edición "+edition,loading:"lazy",style:"display:block;width:100%;height:auto;max-height:290px;object-fit:contain"});
      const counter=make("span","");
      const firstImage=pageList[0];
      const imageURL= page=>base+edition+"/"+page.image;
      preview.replaceChildren(image);
      const view=make("div","",{style:"display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px"});
      const back=make("button","Anterior",{type:"button"});
      const next=make("button","Siguiente",{type:"button"});
      const open=make("a","Abrir folio",{target:"_blank",rel:"noopener noreferrer"});
      const render=()=>{
        const page=pageList[current];
        image.src=imageURL(page);
        image.alt="Imagen digital "+page.pdf_page+" de "+pageList.length+" · "+edition;
        counter.textContent="Página digital "+page.pdf_page+" / "+manifest.pdf_page_count;
        open.href=imageURL(page);
        back.disabled=current===0;
        next.disabled=current===pageList.length-1;
      };
      back.addEventListener("click",()=>{if(current>0){current--;render();}});
      next.addEventListener("click",()=>{if(current<pageList.length-1){current++;render();}});
      view.append(back,counter,next,open);
      slot.append(view);
      if (manifest.complete !== true) slot.append(make("p","Digitalización parcial; no se afirma cobertura completa."));
      slot.append(make("p","Numeración digital; cotejo con paginación impresa pendiente.",{class:"visor-aviso"}));
      render();
    } catch (_) { /* Preserve source access while manifest is unavailable. */ }
  }
  ["es1797","en1738","fr1650"].forEach(init);
})();
