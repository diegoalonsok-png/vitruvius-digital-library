/* Preserve canonical locus between editorial and comparative apparatus pages. */
(()=>{"use strict";
const normalize=s=>{s=String(s||"").trim().toLowerCase();const match=s.match(/^([ivx]+)\./);if(match){let n=0,prev=0;for(const c of [...match[1]].reverse()){const v={i:1,v:5,x:10}[c];n+=v<prev?-v:v;prev=v;}s=n+s.slice(match[1].length);}return s.replace(/\.praefatio\./g,".praef.").replace(/\.preface\./g,".praef.");};
function currentLocus(){
 const fromURL=new URLSearchParams(location.search).get("locus");
 const input=document.getElementById("bude-locus")||document.getElementById("locus");
 return normalize(fromURL||input?.value||"1.1.1");
}
document.addEventListener("click",event=>{
 const link=event.target.closest?.('a[href*="aparato-comparativo"],a[href*="apparatus-bude"]');
 if(!link||event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.hasAttribute("download"))return;
 let url;try{url=new URL(link.href,location.href)}catch{return;}
 if(url.origin!==location.origin)return;
 const locus=currentLocus();
 if(!/^\d{1,2}\.(?:praef|\d+)\.\d+$/.test(locus))return;
 url.searchParams.set("locus",locus);
 link.href=url.pathname+url.search+url.hash;
},true);
})();