/* Rotación editorial del libro tipográfico, solo en la vitrina de lectura.
   No afecta búsquedas, lectores o visores de folios. */
(()=>{"use strict";
function activate(){
 const book=document.querySelector(".editorial-reading .volume-turn");if(!book)return;
 let startX=0,rotation=-20,dragging=false,changed=false,dragId=null;
 const rotate=angle=>{rotation=angle;book.style.animation="none";book.style.transform="rotateX(-6deg) rotateY("+rotation+"deg)";changed=true};
 book.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"&&e.button!==0)return;
  dragging=true;dragId=e.pointerId;startX=e.clientX;
  book.setPointerCapture?.(e.pointerId);
  const transform=window.getComputedStyle(book).transform;
  // Start from a stable, known orientation rather than inventing a reading/folio mapping.
  if(!changed)rotate(-20);
  book.style.cursor="grabbing";
 });
 book.addEventListener("pointermove",e=>{
  if(!dragging||e.pointerId!==dragId)return;
  rotate(rotation+(e.clientX-startX)*.7);startX=e.clientX
 });
 const release=e=>{if(dragging&&(e.pointerId===dragId||e.type==="lostpointercapture")){dragging=false;dragId=null;book.style.cursor=""}};
 book.addEventListener("pointerup",release);
 book.addEventListener("pointercancel",release);
 book.addEventListener("lostpointercapture",release);
 book.addEventListener("keydown",e=>{
  if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();rotate(rotation+(e.key==="ArrowLeft"?-30:30))}
  if(e.key==="Enter"||e.key===" "){e.preventDefault();rotate(rotation+45)}
  if(e.key==="Escape"){e.preventDefault();changed=false;book.style.animation="";book.style.transform=""}
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",activate,{once:true});else activate();
})();