/* BGL scholarly triple reader: manuscript / source / translation.
   Witness folios are NOT aligned with textual loci until individually verified. */
window.BibliothecaTripleReader=(function(){"use strict";
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const langName={la:"Latín",grc:"Griego",en:"Inglés",es:"Castellano",fr:"Francés"};
 const roman=["I","II","III","IV","V","VI"];
 function link(url,label){return '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>'}
 const config={
  "cicero-officiis":{manuscript:{index:"data/manuscripts/cicero-de-officiis-geneve-lat88.json",label:"Genève · Bibliothèque de Genève · Ms. lat. 88",date:"siglo XV",isOldest:false},
    original:{path:"corpus/cicero-de-officiis-la.html",label:"Texto latino · ed. Walter Miller, 1913"},
    translations:[{lang:"en",label:"English · Walter Miller (1913)",path:"corpus/cicero-de-officiis-en.html"}]},
  "lucretius":{manuscript:{manifest:"https://digitalcollections.universiteitleiden.nl/iiif_manifest/item:4151064/manifest",label:"Leiden · Voss. Lat. Q. 94 (Codex Quadratus)",date:"siglo IX",isOldest:false},
    original:{path:"corpus/lucretius-de-rerum-natura-la.html",label:"De rerum natura · latín · Wikisource"},
    translations:[{lang:"en",label:"English · William Ellery Leonard (1916)",path:"corpus/lucretius-de-rerum-natura-en.html"},{lang:"es",label:"Castellano · Rodríguez-Navas (prosa)",path:"corpus/lucretius-de-rerum-natura-es.html"}]}
 };
 const html=(cfg,w)=>'<div class="triple-panes" role="group" aria-label="Lectura tripartita">'+
 '<section class="triple-pane"><div class="triple-pane-head"><strong>I · TESTIMONIO MANUSCRITO</strong><small>'+esc(cfg.manuscript.label)+'</small></div><div id="triple-ms" class="triple-ms"><p>Cargando los folios…</p></div></section>'+
 '<section class="triple-pane"><div class="triple-pane-head"><strong>II · TEXTO ORIGINAL</strong><small>'+esc(cfg.original.label)+'</small></div><iframe title="Texto original en latín de '+esc(w.title)+'" src="'+esc(cfg.original.path)+'" loading="lazy"></iframe></section>'+
 '<section class="triple-pane"><div class="triple-pane-head"><strong>III · TRADUCCIÓN</strong><label>Edición moderna <select id="triple-translation"></select></label></div><iframe id="triple-translation-frame" title="Traducción moderna de '+esc(w.title)+'" loading="lazy"></iframe></section>'+
 '</div><p class="triple-warning"><strong>Criterio codicológico.</strong> Los tres lectores son independientes: todavía no existe una concordancia verificada entre el folio mostrado, el libro/pasaje del texto y la traducción. No atribuir la edición moderna al copista del códice.</p>';
 async function mount(target,w){
  const cfg=config[w.id];if(!cfg)return false;
  target.innerHTML=html(cfg,w);
  const sel=target.querySelector("#triple-translation"),frame=target.querySelector("#triple-translation-frame");
  for(const v of cfg.translations){const opt=document.createElement("option");opt.value=v.path;opt.textContent=v.label;sel.append(opt)}
  const update=()=>frame.src=sel.value;sel.addEventListener("change",update);update();
  const ms=target.querySelector("#triple-ms"),m=cfg.manuscript;
  const provenance='<p class="triple-ms-note">'+esc(m.label)+" · "+esc(m.date)+'. '+(m.isOldest?"Testimonio antiguo identificable.":"No se acredita como el testimonio más antiguo conservado.")+'</p>';
  ms.innerHTML=provenance;
  if(m.index){
   try{
    const resp=await fetch(m.index,{cache:"force-cache"});if(!resp.ok)throw Error("HTTP "+resp.status);
    const data=await resp.json();
    const folios=(data.folios||[]).filter(x=>x.service&&/^[A-Za-z0-9.!:_/(),-]+$/.test(x.label||""));
    if(!folios.length)throw Error("sin imágenes IIIF");
    let i=Math.min(2,folios.length-1);
    const toolbar=document.createElement("div");toolbar.className="triple-folio-nav";
    const prev=document.createElement("button");prev.type="button";prev.textContent="← Folio";
    const select=document.createElement("select");select.setAttribute("aria-label","Folio manuscrito");
    const next=document.createElement("button");next.type="button";next.textContent="Folio →";
    const img=document.createElement("img");img.alt="Folio del manuscrito "+m.label;img.loading="lazy";img.decoding="async";
    const status=document.createElement("div");status.className="triple-ms-status";status.setAttribute("role","status");
    const options=folios.map((x,index)=>{const o=document.createElement("option");o.value=String(index);o.textContent=x.label;return o});select.append(...options);
    function show(){const x=folios[i];select.value=String(i);status.textContent=x.label+" · "+(i+1)+"/"+folios.length;
     // IIIF Image API 2: constrained server-side resize.
     img.src=x.service.replace(/\/$/,"")+"/full/800,/0/default.jpg";img.alt=x.label+" · "+m.label;
     prev.disabled=i<=0;next.disabled=i>=folios.length-1;
    }
    prev.addEventListener("click",()=>{if(i>0){i--;show()}});next.addEventListener("click",()=>{if(i<folios.length-1){i++;show()}});select.addEventListener("change",()=>{i=Number(select.value);show()});
    toolbar.append(prev,select,next);ms.append(toolbar,status,img);
    img.addEventListener("error",()=>{status.textContent="No se pudo cargar esta imagen IIIF. Consultá la ficha institucional para verificar el servidor.";});
    const cite=document.createElement("p");cite.className="triple-ms-note";cite.innerHTML="Fuente: "+esc(data.credit)+" · "+link(data.source,"Ficha y condiciones de uso")+" · "+link(data.manifest,"Manifiesto IIIF")+" · "+esc(data.license);ms.append(cite);
    show();
   }catch(err){ms.insertAdjacentHTML("beforeend",'<p role="alert">No se pudieron cargar los folios del testimonio: '+esc(err.message)+'</p>');}
  }else if(m.manifest){
   const iframe=document.createElement("iframe");iframe.title="Folio del códice "+m.label;iframe.loading="lazy";iframe.src="https://uv-v4.netlify.app/#?manifest="+encodeURIComponent(m.manifest);iframe.style.minHeight="68vh";ms.append(iframe);
   const p=document.createElement("p");p.className="triple-ms-note";p.textContent="Imágenes IIIF del titular institucional: conexión sujeta a disponibilidad y permisos de incrustación. La correspondencia de folios todavía no se ha validado.";ms.append(p);
  }
  return true;
 }
 return{mount,available:id=>!!config[id]};
})();