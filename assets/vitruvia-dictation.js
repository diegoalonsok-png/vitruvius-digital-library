/* One search query per microphone session. No automatic restart or submission. */
(()=>{
 "use strict";
 const messages={
  es:{
   idle:"Dictar",starting:"Cancelar inicio",listening:"Detener dictado",stopping:"Terminando…",unavailable:"Dictado no disponible",
   idleTitle:"Dictar una búsqueda por micrófono",startingTitle:"Cancelar el inicio del micrófono",listeningTitle:"Detener el dictado",stoppingTitle:"Esperando las últimas palabras",
   startingMessage:"Esperando el micrófono. Si el navegador pide permiso, permití su uso para dictar.",
   listeningMessage:"Escuchando… Hablá tu consulta. Podés tocar Detener; después revisá el texto y pulsá Buscar.",
   stoppingMessage:"Terminando el dictado…",done:"Dictado terminado. Revisá el texto y pulsá Buscar.",
   empty:"No se detectó voz. Volvé a tocar Dictar y hablá cerca del micrófono.",cancelled:"Dictado detenido.",
   limited:"Se alcanzó el límite de la consulta. Revisá el texto antes de buscar.",
   unsupported:"Este navegador no ofrece dictado por voz. Podés usar el micrófono del teclado de tu dispositivo o escribir la consulta.",
   insecure:"Para usar el micrófono, abrí Vitruvia desde su dirección HTTPS.",
   permission:"El navegador no permitió el micrófono o el dictado. Revisá el permiso de micrófono en los controles del sitio y del dispositivo. Si usás un visor integrado, abrí Vitruvia directamente en el navegador.",
   service:"El servicio de dictado no está disponible en este navegador. Podés usar el dictado del teclado del dispositivo o escribir la consulta.",
   audio:"No se pudo acceder al micrófono. Revisá que esté conectado, habilitado y disponible para el navegador.",
   network:"No se pudo conectar con el servicio de dictado. Revisá la conexión y volvé a intentarlo, o usá el dictado del teclado.",
   language:"El servicio de dictado no admite el idioma elegido. Podés usar el dictado del teclado o escribir la consulta.",
   timeout:"El micrófono no respondió. Revisá los permisos del sitio y volvé a tocar Dictar.",
   failure:"No se pudo iniciar el dictado. Revisá los permisos del micrófono y volvé a intentarlo.",
   edited:"Dictado detenido para conservar los cambios en la consulta.",changedLanguage:"Dictado detenido. Volvé a tocar Dictar para usar el idioma elegido."
  },
  en:{
   idle:"Dictate",starting:"Cancel start",listening:"Stop dictation",stopping:"Finishing…",unavailable:"Dictation unavailable",
   idleTitle:"Dictate a search using the microphone",startingTitle:"Cancel microphone start",listeningTitle:"Stop dictation",stoppingTitle:"Waiting for the last words",
   startingMessage:"Waiting for the microphone. Allow microphone access if the browser asks for permission.",
   listeningMessage:"Listening… Speak your query. You can press Stop; then review the text and press Search.",
   stoppingMessage:"Finishing dictation…",done:"Dictation finished. Review the text and press Search.",
   empty:"No speech detected. Press Dictate again and speak near the microphone.",cancelled:"Dictation stopped.",
   limited:"The query length limit was reached. Review the text before searching.",
   unsupported:"This browser does not offer voice dictation. Use your device keyboard’s microphone or type your query.",
   insecure:"Open Vitruvia using its HTTPS address to use the microphone.",
   permission:"The browser did not allow the microphone or dictation. Check microphone access in the site and device settings. If using an embedded viewer, open Vitruvia directly in your browser.",
   service:"The dictation service is unavailable in this browser. Use your device keyboard’s dictation or type your query.",
   audio:"The microphone could not be accessed. Check that it is connected, enabled and available to the browser.",
   network:"The dictation service could not be reached. Check your connection and retry, or use keyboard dictation.",
   language:"The dictation service does not support the selected language. Use keyboard dictation or type your query.",
   timeout:"The microphone did not respond. Check site permissions and press Dictate again.",
   failure:"Dictation could not start. Check microphone permissions and try again.",
   edited:"Dictation stopped to preserve your changes to the query.",changedLanguage:"Dictation stopped. Press Dictate again to use the selected language."
  },
  fr:{
   idle:"Dicter",starting:"Annuler le démarrage",listening:"Arrêter la dictée",stopping:"Finalisation…",unavailable:"Dictée indisponible",
   idleTitle:"Dicter une recherche avec le microphone",startingTitle:"Annuler le démarrage du microphone",listeningTitle:"Arrêter la dictée",stoppingTitle:"En attente des derniers mots",
   startingMessage:"En attente du microphone. Autorisez son utilisation si le navigateur le demande.",
   listeningMessage:"Écoute… Dictez votre requête. Vous pouvez appuyer sur Arrêter, puis vérifier le texte et lancer la recherche.",
   stoppingMessage:"Finalisation de la dictée…",done:"Dictée terminée. Vérifiez le texte et lancez la recherche.",
   empty:"Aucune voix détectée. Appuyez sur Dicter et parlez près du microphone.",cancelled:"Dictée arrêtée.",
   limited:"La limite de longueur de la requête est atteinte. Vérifiez le texte avant de rechercher.",
   unsupported:"Ce navigateur ne propose pas de dictée vocale. Utilisez le microphone du clavier de votre appareil ou saisissez votre requête.",
   insecure:"Ouvrez Vitruvia à son adresse HTTPS pour utiliser le microphone.",
   permission:"Le navigateur n’a pas autorisé le microphone ou la dictée. Vérifiez les autorisations du site et de l’appareil. Dans un lecteur intégré, ouvrez Vitruvia directement dans le navigateur.",
   service:"Le service de dictée est indisponible dans ce navigateur. Utilisez la dictée du clavier ou saisissez votre requête.",
   audio:"Impossible d’accéder au microphone. Vérifiez qu’il est connecté, activé et disponible pour le navigateur.",
   network:"Impossible de joindre le service de dictée. Vérifiez la connexion et réessayez, ou utilisez la dictée du clavier.",
   language:"Le service de dictée ne prend pas en charge la langue choisie. Utilisez la dictée du clavier ou saisissez votre requête.",
   timeout:"Le microphone ne répond pas. Vérifiez les autorisations du site et appuyez sur Dicter.",
   failure:"Impossible de démarrer la dictée. Vérifiez les autorisations du microphone et réessayez.",
   edited:"Dictée arrêtée pour conserver les modifications de la requête.",changedLanguage:"Dictée arrêtée. Appuyez sur Dicter pour utiliser la langue choisie."
  }
 };
 const microphone='<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>';
 function attach({button,input,status}){
  if(button.dataset.dictationBound)return;
  button.dataset.dictationBound="true";button.id="vitruvia-dictation";
  button.classList.add("vitruvia-dictation");
  status.id=status.id||"vitruvia-session-status";
  status.setAttribute("aria-live","polite");status.setAttribute("aria-atomic","true");
  button.setAttribute("aria-describedby",status.id);button.setAttribute("aria-controls",input.id);
  const language=document.getElementById("ui-language");
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  const unavailable=window.isSecureContext===false?"insecure":!Speech?"unsupported":null;
  let session=null,state="idle",writing=false,message=null;
  const locale=()=>language?.value||document.documentElement.lang?.slice(0,2)||"es";
  const t=()=>messages[locale()]||messages.es;
  function say(key){message=key;status.textContent=t()[key]}
  function render(){
   const label=unavailable?"unavailable":state;
   button.innerHTML=microphone+'<span>'+t()[label]+'</span>';
   button.dataset.state=unavailable?"unavailable":state;
   button.disabled=!!unavailable||state==="stopping";
   button.setAttribute("aria-pressed",String(state==="listening"||state==="stopping"));
   button.setAttribute("aria-busy",String(state==="starting"||state==="stopping"));
   button.title=unavailable?t()[unavailable]:t()[state+"Title"];
   button.setAttribute("aria-label",button.title);
  }
  function finish(current,key,abort=false){
   if(session!==current)return;
   session=null;clearTimeout(current.timer);state="idle";render();
   // Invalidate callbacks before abort(), which may synchronously emit events.
   if(abort)try{current.recognition.abort()}catch{}
   if(key)say(key);
  }
  function cancel(key="cancelled"){
   if(session)finish(session,key,true);
  }
  function stop(){
   const current=session;if(!current||state==="stopping")return;
   if(state==="starting"){cancel();return}
   clearTimeout(current.timer);state="stopping";render();say("stoppingMessage");
   current.timer=setTimeout(()=>finish(current,current.hasText?"done":"empty",true),4000);
   try{current.recognition.stop()}catch{finish(current,"failure",true)}
  }
  function start(){
   const current={recognition:null,timer:null,prefix:input.value.trim(),lastValue:input.value,hasText:false};
   try{
    const recognition=new Speech();current.recognition=recognition;session=current;
    recognition.lang=({es:"es-AR",en:"en-US",fr:"fr-FR"})[locale()]||"es-AR";
    // A search is a single utterance; continuous mode can hang on mobile.
    recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;
    recognition.onstart=()=>{
     if(session!==current||state!=="starting")return;
     clearTimeout(current.timer);state="listening";render();say("listeningMessage");
     current.timer=setTimeout(()=>{if(session===current)stop()},60000);
    };
    recognition.onresult=event=>{
     if(session!==current)return;
     if(input.value!==current.lastValue){cancel("edited");return}
     // Each event contains the session's cumulative results. Rebuild instead
     // of appending, so interim revisions never duplicate the spoken words.
     const words=Array.from(event.results,result=>result[0]?.transcript?.trim()||"").filter(Boolean).join(" ");
     if(!words)return;
     const text=[current.prefix,words].filter(Boolean).join(" ");
     const limit=input.maxLength>0?input.maxLength:180;
     current.lastValue=text.slice(0,limit);current.hasText=true;
     writing=true;
     try{input.value=current.lastValue;input.dispatchEvent(new Event("input",{bubbles:true}))}finally{writing=false}
     if(text.length>=limit){finish(current,"limited",true)}
    };
    recognition.onspeechend=()=>{if(session===current)stop()};
    recognition.onerror=event=>{
     const key=({"not-allowed":"permission","service-not-allowed":"service","audio-capture":"audio","network":"network","no-speech":"empty","language-not-supported":"language","aborted":"cancelled"})[event.error]||"failure";
     finish(current,key,true);
    };
    recognition.onend=()=>finish(current,current.hasText?"done":"empty");
    state="starting";render();say("startingMessage");
    current.timer=setTimeout(()=>finish(current,"timeout",true),15000);
    recognition.start();
   }catch(error){
    const key=error?.name==="NotAllowedError"||error?.name==="SecurityError"?"permission":error?.name==="NotFoundError"?"audio":"failure";
    if(session===current)finish(current,key,true);else{state="idle";render();say(key)}
   }
  }
  button.addEventListener("click",()=>{if(unavailable)return;if(session)stop();else start()});
  input.addEventListener("input",()=>{if(!writing)cancel("edited")});
  input.addEventListener("search",()=>cancel());
  input.addEventListener("keydown",event=>{if(event.key==="Escape")cancel()});
  input.form?.addEventListener("submit",()=>cancel(),true);
  document.addEventListener("click",event=>{
   if(event.target.closest?.("#clear-search, #clear-all, #vitruvia-erase-session, [data-q], .search-suggestion, .tab, #search-images-button"))cancel();
  },true);
  window.addEventListener("vitruvia:clear",()=>cancel());
  window.addEventListener("pagehide",()=>cancel());
  document.addEventListener("visibilitychange",()=>{if(document.hidden)cancel()});
  language?.addEventListener("change",()=>{
   if(session)cancel("changedLanguage");
   render();if(message&&Object.values(messages).some(m=>status.textContent===m[message]))say(message);
  },true);
  render();if(unavailable)say(unavailable);
 }
 window.VitruviaDictation={attach};
})();
