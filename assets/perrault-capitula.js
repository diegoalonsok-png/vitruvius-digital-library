/* Perrault: índice temático de Vitruvio, separado de la foliación del ejemplar de 1673.
 * La referencia editorial es Morgan 1914, no el índice original de Perrault.
 * No atribuir páginas sin cotejo de los ejemplares.
 */
(()=>{
 "use strict";
 const host=document.getElementById("pr-capitula-list"),search=document.getElementById("pr-capitula-search"),status=document.getElementById("pr-capitula-status");
 if(!host||!search||!status)return;
 const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 fetch("data/perrault-vitruvius-capitula.json",{cache:"no-cache"})
  .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(d=>{
   if(d.schema!=="vdl-perrault-vitruvius-capitula-1"||d.books?.length!==10)throw Error("Índice no validado");
   const render=()=>{
    host.replaceChildren();
    const needle=normalize(search.value.trim());
    let count=0;
    for(const b of d.books){
     const rows=b.chapters.filter(c=>!needle||normalize(b.title+" "+c.locus+" "+c.title).includes(needle));
     if(!rows.length)continue;
     const section=document.createElement("details");
     section.className="pr-book";section.open=!!needle||b.book===1;
     const title=document.createElement("summary");
     title.textContent="Liber "+b.book+" · "+b.title+" ("+rows.length+" capítulos)";
     section.append(title);
     const list=document.createElement("ol");list.className="pr-chapter-list";
     for(const c of rows){
      const li=document.createElement("li");const strong=document.createElement("strong");
      strong.textContent=c.locus;
      li.append(strong," · ",c.title);list.append(li);count++;
     }
     section.append(list);host.append(section);
    }
    status.textContent=count+" capítulos del índice editorial de Vitruvio. No hay anclaje de página Perrault verificado.";
   };
   search.addEventListener("input",render);render();
  }).catch(e=>{status.textContent="No se pudo abrir el índice de capítulos: "+e.message});
})();
