/* Accessible mutually-exclusive accordion for home research navigation.
   Menus remain in document flow, so they never cover adjacent links. */
(()=>{"use strict";
function init(){
 const root=document.querySelector(".research-nav .research-nav-categories");
 if(!root)return;
 const menus=[...root.querySelectorAll(":scope > details.research-nav-group")];
 const closeAll=except=>{for(const menu of menus)if(menu!==except)menu.open=false;};
 for(const menu of menus){
  menu.addEventListener("toggle",()=>{if(menu.open)closeAll(menu)});
  const summary=menu.querySelector(":scope > summary");
  if(summary)summary.setAttribute("aria-label",summary.textContent.trim()+" · abrir o cerrar");
 }
 document.addEventListener("pointerdown",event=>{
  if(!root.contains(event.target))closeAll(null);
 });
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&menus.some(x=>x.open)){
   const active=menus.find(x=>x.open);
   closeAll(null);
   active?.querySelector("summary")?.focus();
  }
 });
 root.addEventListener("click",event=>{
  if(event.target.closest(".research-nav-group-items a"))closeAll(null);
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
