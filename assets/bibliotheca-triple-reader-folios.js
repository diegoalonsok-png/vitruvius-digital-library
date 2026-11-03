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
  "lucretius":{manuscript:{manifest:"https://digitalcollections.universiteitleiden.nl/iiif_manifest/item:4127827/manifest",label:"Leiden · Voss. Lat. F. 30 (Codex Oblongus, O)",date:"c. 825 · siglo IX",isOldest:false},
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
    const img=document.createElement("img");img.className="triple-ms-main-image";img.alt="Folio del manuscrito "+m.label;img.loading="lazy";img.decoding="async";img.title="Hacé clic para leer este folio ampliado";
    const status=document.createElement("div");status.className="triple-ms-status";status.setAttribute("role","status");
    const options=folios.map((x,index)=>{const o=document.createElement("option");o.value=String(index);o.textContent=x.label;return o});select.append(...options);
    function show(){const x=folios[i];select.value=String(i);status.textContent=x.label+" · "+(i+1)+"/"+folios.length;
     // IIIF Image API 2: constrained server-side resize.
     img.src=x.service.replace(/\/$/,"")+"/full/800,/0/default.jpg";img.alt=x.label+" · "+m.label;
     prev.disabled=i<=0;next.disabled=i>=folios.length-1;
     if(dialog.open)refreshLarge();
    }
    prev.addEventListener("click",()=>{if(i>0){i--;show()}});next.addEventListener("click",()=>{if(i<folios.length-1){i++;show()}});select.addEventListener("change",()=>{i=Number(select.value);show()});
    
    const large=document.createElement("button");large.type="button";large.className="triple-ms-open";large.textContent="⤢ Leer códice en grande";
    toolbar.append(prev,select,next,large);ms.append(toolbar,status,img);
    const gallery=document.createElement("section");gallery.className="triple-gallery";
    gallery.innerHTML='<h4>Páginas del códice · Galería de folios</h4><p>Miniaturas en orden digital. Elegí una para abrirla ampliada. El número de imagen y la foliación histórica son distintos.</p><div class="triple-gallery-filter"><input type="search" aria-label="Buscar folios" placeholder="5r · V2v · imagen 60"><button type="button">Buscar</button></div><p class="triple-gallery-count" role="status"></p><div class="triple-thumbs"></div><button class="triple-more" type="button">Mostrar más folios</button>';
    const query=gallery.querySelector("input"),search=gallery.querySelector(".triple-gallery-filter button"),count=gallery.querySelector(".triple-gallery-count"),grid=gallery.querySelector(".triple-thumbs"),more=gallery.querySelector(".triple-more");
    ms.append(gallery);
    const dialog=document.createElement("dialog");dialog.className="triple-codex-modal";dialog.setAttribute("aria-label","Lector ampliado del códice "+m.label);
    dialog.innerHTML='<div class="triple-modal-layout"><div class="triple-modal-top"><strong class="triple-modal-title">Folio del códice</strong><button type="button" data-action="prev">← Folio</button><button type="button" data-action="next">Folio →</button><button type="button" data-action="minus">−</button><output>100%</output><button type="button" data-action="plus">+ Ampliar</button><button type="button" data-action="fit">Ajustar</button><button type="button" data-action="close">Cerrar ×</button></div><div class="triple-modal-scroller" tabindex="0"><img alt="Imagen del códice ampliada"></div><p class="triple-modal-credit">Fuente: '+esc(data.credit)+' · '+link(data.source,"Ficha institucional")+' · '+link(data.license,"Derechos de imagen")+' · <span class="triple-modal-status" role="status"></span></p></div>';
    target.append(dialog);
    const zoomImage=dialog.querySelector(".triple-modal-scroller img"),scroller=dialog.querySelector(".triple-modal-scroller"),zoomText=dialog.querySelector("output"),modalTitle=dialog.querySelector(".triple-modal-title"),modalStatus=dialog.querySelector(".triple-modal-status");
    let zoom=100,modalSeq=0;
    function applyZoom(){zoomImage.style.width=Math.round(Math.max(220,scroller.clientWidth-20)*zoom/100)+"px";zoomText.textContent=zoom+"%";}
    function setZoom(z,cx,cy){
      const oldW=zoomImage.getBoundingClientRect().width||1,oldH=zoomImage.getBoundingClientRect().height||1,b=scroller.getBoundingClientRect();
      const fx=cx==null?0.5:(scroller.scrollLeft+cx-b.left)/oldW,fy=cy==null?0.5:(scroller.scrollTop+cy-b.top)/oldH;
      zoom=Math.max(50,Math.min(500,Math.round(z/25)*25));applyZoom();
      scroller.scrollLeft=Math.max(0,zoomImage.getBoundingClientRect().width*fx-(cx==null?scroller.clientWidth/2:cx-b.left));
      scroller.scrollTop=Math.max(0,zoomImage.getBoundingClientRect().height*fy-(cy==null?scroller.clientHeight/2:cy-b.top));
    }
    function refreshLarge(){
      if(!dialog.open)return;
      const k=++modalSeq,f=folios[i],sources=[2400,1800,1200,800].map(n=>f.service.replace(/\/$/,"")+"/full/"+n+",/0/default.jpg");
      let n=0;zoom=100;modalTitle.textContent="Imagen "+(i+1)+" / "+folios.length+" · "+f.label;
      zoomImage.alt="Folio "+f.label+" · "+m.label;modalStatus.textContent="Cargando imagen ampliada…";
      zoomImage.onload=()=>{if(k!==modalSeq)return;applyZoom();scroller.scrollTo({top:0,left:0});modalStatus.textContent=f.label+" · "+zoomImage.naturalWidth+" × "+zoomImage.naturalHeight+" píxeles";};
      zoomImage.onerror=()=>{if(k!==modalSeq)return;n++;if(n<sources.length)zoomImage.src=sources[n];else modalStatus.textContent="La imagen no está disponible. Consultá la ficha institucional.";};
      zoomImage.src=sources[0];
    }
    function openLarge(){if(!dialog.open)dialog.showModal();refreshLarge();}
    function choose(n,expand){i=Math.max(0,Math.min(folios.length-1,n));show();grid.querySelectorAll("button[data-idx]").forEach(b=>b.setAttribute("aria-current",String(Number(b.dataset.idx)===i)));if(expand)openLarge();}
    large.addEventListener("click",openLarge);img.addEventListener("click",openLarge);
    dialog.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>{switch(b.dataset.action){case "prev":choose(i-1,false);break;case "next":choose(i+1,false);break;case "minus":setZoom(zoom-25);break;case "plus":setZoom(zoom+25);break;case "fit":setZoom(100);scroller.scrollTo({top:0,left:0});break;case "close":dialog.close();break;}}));
    zoomImage.addEventListener("click",e=>setZoom(zoom+50,e.clientX,e.clientY));
    dialog.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"){e.preventDefault();choose(i-1,false)}else if(e.key==="ArrowRight"){e.preventDefault();choose(i+1,false)}});
    let filtered=folios.map((_,n)=>n),visible=0;
    function addThumbs(){
      const frag=document.createDocumentFragment(),end=Math.min(filtered.length,visible+24);
      for(const n of filtered.slice(visible,end)){
        const f=folios[n],btn=document.createElement("button");btn.type="button";btn.dataset.idx=String(n);btn.setAttribute("aria-current",String(n===i));btn.title="Ampliar folio "+f.label;
        const image=document.createElement("img");image.alt="Miniatura "+f.label;image.loading="lazy";image.decoding="async";image.src=f.service.replace(/\/$/,"")+"/full/180,/0/default.jpg";
        image.onerror=()=>{image.hidden=true;};
        const num=document.createElement("strong");num.textContent="Imagen "+(n+1);
        const lbl=document.createElement("small");lbl.textContent=f.label;
        btn.append(image,num,lbl);btn.addEventListener("click",()=>choose(n,true));frag.append(btn);
      }
      grid.append(frag);visible=end;count.textContent=filtered.length+" imágenes coincidentes · "+visible+" miniaturas mostradas";more.hidden=visible>=filtered.length;
    }
    function filterThumbs(){
      const q=query.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/^imagen\s*/,"").replace(/[^a-z0-9]/g,"");
      filtered=folios.map((_,n)=>n).filter(n=>!q||String(n+1)===q||folios[n].label.toLowerCase().replace(/[^a-z0-9]/g,"").includes(q));
      visible=0;grid.replaceChildren();if(filtered.length)addThumbs();else{count.textContent="No se encontraron folios con esa etiqueta";more.hidden=true;}
    }
    query.addEventListener("input",filterThumbs);search.addEventListener("click",filterThumbs);more.addEventListener("click",addThumbs);
    filterThumbs();

    img.addEventListener("error",()=>{status.textContent="No se pudo cargar esta imagen IIIF. Consultá la ficha institucional para verificar el servidor.";});
    const cite=document.createElement("p");cite.className="triple-ms-note";cite.innerHTML="Fuente: "+esc(data.credit)+" · "+link(data.source,"Ficha y condiciones de uso")+" · "+link(data.manifest,"Manifiesto IIIF")+" · "+esc(data.license);ms.append(cite);
    show();
   }catch(err){ms.insertAdjacentHTML("beforeend",'<p role="alert">No se pudieron cargar los folios del testimonio: '+esc(err.message)+'</p>');}
  }else if(m.manifest){
   // Official manuscript metadata verified; live folio images not yet verified.
   const section=document.createElement("section");
   section.className="triple-manuscript-record";
   section.innerHTML='<h4>Tradición manuscrita carolingia · testimonios identificados</h4>'+
     '<p><strong>O · Codex Oblongus.</strong> Leiden University Libraries, Voss. Lat. F. 30; c. 825, siglo IX. Testimonio carolingio temprano de <em>De rerum natura</em>.</p>'+
     '<p><strong>Q · Codex Quadratus.</strong> Leiden University Libraries, Voss. Lat. Q. 94; primera mitad del siglo IX. Es un códice distinto.</p>'+
     '<p role="status"><strong>Facsímil pendiente:</strong> no se pudo verificar el acceso a las imágenes digitales de Leiden; por rigor bibliográfico no se incorpora aquí un visor externo sin comprobar.</p>'+
     '<div class="classic-linkline">'+
       link("https://iiif.biblissima.fr/collections/manifest/cf0a18597bec8ca10248e6a82b64f94dc0288139","Ficha verificada · Codex Oblongus (O)")+
       link("https://iiif.biblissima.fr/collections/manifest/7e530b9cd2003778e7fe262054b5c9c20d8b99a4","Ficha verificada · Codex Quadratus (Q)")+
     '</div>'+
     '<p class="triple-ms-note">Las fichas identifican manuscritos, no una equivalencia de páginas con el texto latino editorial. La concordancia folio–verso sigue pendiente.</p>';
   ms.append(section);
  }
  return true;
 }
 return{mount,available:id=>!!config[id]};
})();