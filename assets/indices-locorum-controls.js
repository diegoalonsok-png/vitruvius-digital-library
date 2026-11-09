/* Controles superiores de Indices locorum, sin alterar la lógica de los índices. */
(()=>{
 "use strict";
 const area=document.querySelector(".indices-lexicon-nav");
 if(!area)return;
 const status=document.getElementById("indices-toolbar-status");
 const pageUrl=()=>location.href;
 const title="Indices locorum — Vitruvius Digital Library";
 const announce=msg=>{if(status)status.textContent=msg};
 area.addEventListener("click",async event=>{
  const button=event.target.closest("button[data-index-action]");
  if(!button)return;
  const action=button.dataset.indexAction;
  const url=pageUrl();
  if(action==="print"){window.print();return}
  if(action==="mail"){
   const subject=encodeURIComponent(title);
   const body=encodeURIComponent("Consulta académica: "+title+"\n"+url);
   location.href="mailto:?subject="+subject+"&body="+body;
   return;
  }
  if(action==="whatsapp"){
   window.open("https://wa.me/?text="+encodeURIComponent(title+" — "+url),"_blank","noopener,noreferrer");
   return;
  }
  if(action==="copy"){
   try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
    else{
     const field=document.createElement("textarea");field.value=url;field.setAttribute("aria-hidden","true");
     field.style.cssText="position:fixed;left:-9999px";document.body.append(field);field.select();
     const ok=document.execCommand("copy");field.remove();if(!ok)throw Error("clipboard");
    }
    announce("Enlace copiado");
   }catch{announce("Seleccione la URL de la barra del navegador para copiarla.");}
  }
 });
})();
