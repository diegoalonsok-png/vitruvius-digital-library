/* Lecturas H: presentar evidencia sin convertir OCR o versiones editoriales en autopsia. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=String(text);if(cls)n.className=cls;return n};
const add=(p,...children)=>{children.forEach(x=>x&&p.append(x));return p};
const link=(p,label,href)=>{if(typeof href!=="string"||!/^(https:\/\/|data\/|codex-h-folios-local\.html|cobertura-aparato-critico\.html)/i.test(href))return;
 const a=el("a",label);a.href=href;if(href.startsWith("https://")){a.target="_blank";a.rel="noopener noreferrer"}p.append(a)};
const norm=x=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const stat=(target,num,title)=>{const c=el("article");add(c,el("strong",num),el("span",title));target.append(c)};
const dd=(node,k,v)=>{if(v===null||v===undefined||v==="")return;add(node,el("dt",k),el("dd",v))};
function renderEntry(rec){
 const c=el("article",null,"record");
 add(c,el("div",rec.id+" · "+rec.locus+" · H, f. "+rec.folio,"meta"),el("h3","Vitr. "+rec.locus+" · "+rec.lemma));
 const dl=el("dl");dd(dl,"Texto de la edición",rec.adoptedReading);dd(dl,"Lectura del testigo H",rec.witnessReading);c.append(dl);
 add(c,el("p",rec.apparatus,"apparatus"),el("p",rec.evidenceNote));
 add(c,el("p","Estado de la lectura: inspección visual del facsímil local · Confianza: "+rec.visualConfidence+
 " · Ratificación de la decisión por el editor: pendiente.","meta"));
 const actions=el("div",null,"links");link(actions,"Abrir folio H "+rec.folio,rec.facsimileUrl);
 link(actions,"IIIF institucional",rec.iiifCanvas);
 link(actions,"Dossier del locus","cobertura-aparato-critico.html?locus="+encodeURIComponent(rec.locus)+"#dossier");
 c.append(actions);
 const details=el("details");details.append(el("summary","Proveniencia de la imagen y comparación con Rose / Krohn"));
 const proof=el("dl");dd(proof,"Institución y signatura",rec.institution+", "+rec.shelfmark);
 dd(proof,"Imagen digital",rec.imageNumber+" · "+rec.archivalFilename);
 dd(proof,"SHA-256 fotografía",rec.archivalSHA256);
 dd(proof,"Procedimiento",rec.inspectionMethod);
 dd(proof,"Intervención en la edición publicada",rec.editorialIntervention);
 details.append(proof);
 if(rec.rose){const p=el("p","Rose 1899 · p. impresa "+rec.rose.printedPage+", imagen PDF "+rec.rose.pdfPage+": "+rec.rose.transcribedNote);
 details.append(p);const a=el("div",null,"links");link(a,"Transcripción independiente",rec.rose.transcriptionUrl);
 link(a,"Fascímil Rose (imagen del PDF por comprobar)","https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf#page="+rec.rose.pdfPage);details.append(a);
 details.append(el("p",rec.rose.kind,"meta"))}
 if(rec.krohn){details.append(el("p","Krohn 1912 · imagen PDF "+rec.krohn.pdfPage+" · OCR no comprobado: "+rec.krohn.ocrNote));
 const a=el("div",null,"links");link(a,"Facsímil Krohn (imagen del PDF por comprobar)","https://vitruvius-digital-library.org/documents/krohn-1912.pdf#page="+rec.krohn.pdfPage);details.append(a);
 details.append(el("p",rec.krohn.kind,"meta"))}
 c.append(details);return c
}
async function init(){
 const host=$("records"),status=$("status"),filter=$("filter");
 try{const response=await fetch("data/apparatus/collatio-autoptica-h.json",{cache:"no-cache"});
 if(!response.ok)throw Error("HTTP "+response.status);const data=await response.json();
 const entries=data.entries||[],count=data.counts||{},stats=$("stats");
 stat(stats,count.variantRecords,"Lecturas H contrastadas");stat(stats,count.manuscriptFolios,"Folios H examinados");
 stat(stats,count.distinctLoci,"Loci con nueva revisión visual");
 stat(stats,count.rosePageImagesVerified+" / "+count.krohnPageImagesVerified,"Páginas de Rose / Krohn verificadas en imagen");
 const render=()=>{const q=norm(filter.value.trim());host.replaceChildren();
 const found=entries.filter(x=>!q||norm([x.locus,x.folio,x.lemma,x.witnessReading,x.apparatus,x.evidenceNote].join(" ")).includes(q));
 found.forEach(x=>host.append(renderEntry(x)));
 status.textContent=found.length+" de "+entries.length+" lecturas registradas. La verificación manuscrita no ratifica enmiendas editoriales ni altera los libros.";
 if(!found.length)host.append(el("p","Sin lecturas para ese término en el lote revisado. Consulte el mapa de los 731 loci."))};
 filter.addEventListener("input",render);
 const wanted=new URLSearchParams(location.search).get("locus");if(wanted)filter.value=wanted;
 render()
 }catch(e){status.textContent="Error al cargar el registro documental: "+e.message}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();