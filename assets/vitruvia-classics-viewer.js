/* Classical text viewer in Vitruvia: only catalogued same-origin HTML.
 * Keeps the source reader's own search, poem navigation, typography and print tools.
 */
(()=>{
 "use strict";
 // Only local, known readers may appear in the embedded dialog. Institutional
 // IIIF/CSP viewers remain external links; no cross-origin iframe is promised.
 const allowedCorpus=/^corpus\/[a-z0-9/_-]+\.html$/i;
 const allowedLanguage=/^(?:grc|la|en|es|fr|it|de|pt)$/;
 function locate(path){
  if(typeof path!=="string"||path.startsWith("/")||path.includes(".."))return null;
  try{
   const url=new URL(path,location.href);
   if(url.origin!==location.origin)return null;
   const clean=path.split(/[?#]/)[0];
   if(allowedCorpus.test(clean))return url.href;
   const keys=[...url.searchParams.keys()];
   if(clean==="classics-text-reader.html"){
    if(!keys.every(k=>["work","lang","locus"].includes(k)))return null;
    if(!/^[a-z0-9-]+$/.test(url.searchParams.get("work")||""))return null;
    if(!allowedLanguage.test(url.searchParams.get("lang")||""))return null;
    return url.href;
   }
   if(clean==="codex-h-folios-local.html"){
    if(!keys.every(k=>["folio","image"].includes(k)))return null;
    if(!/^[a-z0-9. -]{0,40}$/i.test(url.searchParams.get("folio")||""))return null;
    if(!/^\d{0,4}$/.test(url.searchParams.get("image")||""))return null;
    return url.href;
   }
   if(clean==="lector-bilingue.html"){
    if(!keys.every(k=>["edition","locus"].includes(k)))return null;
    if(!/^(?:recensio-es|recensio-fr|theory-en)$/.test(url.searchParams.get("edition")||""))return null;
    return url.href;
   }
   return null;
  }catch{return null}
 }
 function dialog(){
  let root=document.getElementById("vitruvia-classics-dialog");
  if(root)return root;
  root=document.createElement("dialog");root.id="vitruvia-classics-dialog";
  root.style.cssText="width:min(1300px,98vw);height:min(92dvh,96vh);max-width:none;max-height:none;padding:0;border:1px solid #8e8e8e;border-radius:12px;background:#202020;color:#f5f5f5;box-shadow:0 20px 70px #0009";
  const box=document.createElement("div");box.style.cssText="height:100%;display:flex;flex-direction:column";
  const header=document.createElement("div");header.style.cssText="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid #666;font:14px system-ui,sans-serif";
  const title=document.createElement("strong");title.id="vitruvia-classics-title";title.style.cssText="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
  const source=document.createElement("a");source.className="vitruvia-classics-source";source.target="_blank";source.rel="noopener noreferrer";source.style.color="inherit";source.textContent="Abrir lector ↗";
  const close=document.createElement("button");close.type="button";close.textContent="×";close.setAttribute("aria-label","Cerrar lector");close.style.cssText="background:transparent;color:inherit;border:1px solid #888;border-radius:6px;cursor:pointer;padding:4px 12px;font-size:22px";
  close.addEventListener("click",()=>root.close());
  header.append(title,source,close);
  const iframe=document.createElement("iframe");iframe.title="Lector de obra clásica";iframe.className="vitruvia-classics-iframe";iframe.style.cssText="border:0;flex:1;width:100%;min-height:0;background:#fff";iframe.referrerPolicy="no-referrer";
  box.append(header,iframe);root.append(box);document.body.append(root);
  root.addEventListener("click",event=>{if(event.target===root)root.close()});
  root.addEventListener("close",()=>iframe.removeAttribute("src"));
  return root;
 }
 function open(path,title){
  const url=locate(path);if(!url)return false;
  const el=dialog();
  el.querySelector("#vitruvia-classics-title").textContent=String(title||"Obra clásica");
  el.querySelector(".vitruvia-classics-source").href=url;
  el.querySelector(".vitruvia-classics-iframe").src=url;
  if(!el.open)el.showModal();
  return true;
 }
 window.VitruviaClassicsViewer={open,locate,version:"1.0"};
})();