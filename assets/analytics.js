/* Medición mínima y respetuosa de privacidad.
 * No registra términos buscados, contenido de PDFs, IDs personales ni cadenas URL.
 * Google Analytics 4 cuenta visitas; Umami sigue disponible como alternativa.
 * Solo se activa en páginas principales del sitio de producción.
 */
(()=>{
 "use strict";
 const config=window.VitruviusAnalyticsConfig||{};
 const pathRoot="/vitruvius-digital-library/";
 const preferences=window.navigator||{};
 if(window.VitruviusAnalytics?.enabled||window.top!==window.self||
    preferences.doNotTrack==="1"||preferences.globalPrivacyControl===true||
    !location.pathname.startsWith(pathRoot))return;
 const ga4Id=String(config.ga4MeasurementId||"").trim();
 if(location.hostname==="diegoalonsok-png.github.io"&&/^G-[A-Z0-9]{6,}$/.test(ga4Id)){
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  let referrer="";
  try{if(document.referrer)referrer=new URL(document.referrer).origin+"/"}catch{}
  window.gtag("js",new Date());
  window.gtag("config",ga4Id,{
   page_location:location.origin+location.pathname,
   page_title:"Vitruvius Digital Library — "+(location.pathname.split("/").pop()||"Inicio").replace(/\.html$/,""),
   page_referrer:referrer,
   allow_google_signals:false,
   allow_ad_personalization_signals:false,
   cookie_path:pathRoot,
   cookie_prefix:"vitruvius",
   cookie_flags:"SameSite=Lax;Secure"
  });
  const googleTag=document.createElement("script");
  googleTag.async=true;
  googleTag.src="https://www.googletagmanager.com/gtag/js?id="+ga4Id;
  document.head.append(googleTag);
  window.VitruviusAnalytics={enabled:true,provider:"ga4"};
  return;
 }
 const id=String(config.websiteId||"").trim();
 const host=location.hostname;
 const production=host==="diegoalonsok-png.github.io";
 if(!production||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return;
 const src=String(config.scriptSrc||"");
 if(!/^https:\/\/(?:cloud\.umami\.is|[a-z0-9.-]+)\/script\.js$/i.test(src))return;
 const queue=[];
 let ready=false,latestSearch=0,completed=0;
 const track=(name,data)=>{
  if(!/^[a-z][a-z_]{0,49}$/.test(name))return;
  // Only fixed keys, numeric buckets and categorical values are ever sent.
  if(ready&&typeof window.umami?.track==="function"){try{window.umami.track(name,data)}catch{}}
  else if(queue.length<40)queue.push([name,data]);
 };
 const bucket=ms=>ms<500?"under_500ms":ms<1000?"500_999ms":ms<2000?"1_2s":ms<5000?"2_5s":"over_5s";
 const provider=document.createElement("script");
 provider.src=src;provider.defer=true;
 provider.setAttribute("data-website-id",id);
 provider.setAttribute("data-domains","diegoalonsok-png.github.io");
 provider.setAttribute("data-exclude-search","true");
 provider.setAttribute("data-exclude-hash","true");
 provider.setAttribute("data-do-not-track","true");
 provider.onload=()=>{ready=true;for(const [name,data] of queue.splice(0))track(name,data)};
 provider.onerror=()=>{queue.length=0};
 document.head.append(provider);
 const area=location.pathname.endsWith("/vitruvia.html")?"vitruvia":
  location.pathname.endsWith("/bibliotheca-graeca-latina.html")?"bibliotheca":"vitruvius";
 if(area==="vitruvia"){
  window.addEventListener("vitruvia:search",()=>{latestSearch++;const state=document.getElementById("result-state");if(state)delete state.dataset.completeMs;track("site_search",{area:"vitruvia"})});
  window.addEventListener("vitruvia:results",()=>{
   const state=document.getElementById("result-state");
   const ms=Number(state?.dataset.completeMs);
   if(latestSearch>completed&&state?.dataset.completeMs&&Number.isFinite(ms)){
    completed=latestSearch;track("search_completed",{area:"vitruvia",duration:bucket(ms)});
   }
  });
  document.getElementById("search-images-button")?.addEventListener("click",()=>track("image_gallery",{area:"vitruvia"}));
 }else if(area==="bibliotheca"){
  document.addEventListener("click",event=>{
   const link=event.target.closest("a[href]");if(!link)return;
   if(/lector-clasico|visor-codex|corpus\//.test(link.getAttribute("href")||""))track("academic_reader",{area:"bibliotheca"});
  });
 }
 window.VitruviusAnalytics={enabled:true};
})();
