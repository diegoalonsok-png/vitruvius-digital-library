/* Codex H in the existing Budé-style apparatus. No new critical sigla. */
(()=>{
"use strict";
const mount=document.getElementById("ab-h-reading");
if(!mount)return;
let generation=0;
const make=(tag,value)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=String(value);return node;};
const link=(label,href)=>{const a=make("a",label);a.href=href;return a;};
const readJSON=async url=>{const response=await fetch(url,{headers:{Accept:"application/json"}});if(!response.ok)throw Error("HTTP "+response.status+" · "+url);return response.json();};
// The historical witness records are independent from the folio/locus navigation.
const sourcesPromise=Promise.allSettled([
  readJSON("data/apparatus/collatio-autoptica-h.json"),
  readJSON("data/codex-h/lecturas/index.json"),
  readJSON("data/codex-h/cotejo-aparato-h.json")
]);
const folioCache=new Map();
function readingFor(folio){
  if(!folioCache.has(folio)){
    folioCache.set(folio,readJSON("data/codex-h/lecturas/"+encodeURIComponent(folio)+".json").catch(error=>({unavailable:error.message})));
  }
  return folioCache.get(folio);
}
function appendReferences(locus){
  const nav=make("p");
  nav.append(link("Registro ecdótico: observaciones H","registro-ecdotico.html?tipo=lectura-h&q="+encodeURIComponent(locus)));
  nav.append(" · ");
  nav.append(link("Catálogo institucional de Harley MS 2767","https://searcharchives.bl.uk/catalog/040-002048598"));
  mount.append(nav);
}
async function render(locus){
  const ticket=++generation;
  mount.replaceChildren(make("p","Consultando H (Harley MS 2767) para "+locus+"…"));
  try{
    if(!window.CodexHConcordance)throw Error("Concordancia no cargada");
    const [record,settled]=await Promise.all([window.CodexHConcordance.locate(locus),sourcesPromise]);
    if(ticket!==generation)return;
    mount.replaceChildren();
    const autoptic=settled[0].status==="fulfilled"?settled[0].value:null;
    const readingIndex=settled[1].status==="fulfilled"?settled[1].value:null;
    const priorRegister=settled[2].status==="fulfilled"?settled[2].value:null;
    const entries=Array.isArray(autoptic?.entries)?autoptic.entries.filter(e=>e.locus===locus):[];
    // Only the apparatus units already documented in the source register are printed.
    // The source register uses the very same H, om., suppl., lemma ] lectio conventions.
    if(entries.length){
      const section=make("section");
      section.append(make("h3","H · collatio codicis"));
      section.append(make("p","Lecturas registradas por confrontación con fotografías de H. Pendientes de ratificación editorial; no implican colación integral del folio."));
      const ul=make("ul");
      for(const entry of entries){
        const li=make("li");
        li.append(make("code",entry.apparatus));
        li.append(" · f. "+entry.folio+" · ");
        li.append(link("Ver facsímil",entry.facsimileUrl||"codex-h-folios-local.html?folio="+encodeURIComponent(entry.folio)));
        ul.append(li);
      }
      section.append(ul);
      mount.append(section);
    }
    // Prior visual notes are a separate working record, never ratified manuscript readings.
    // Preserve their existing wording and do not fabricate critical lemmata or sigla.
    const prior=Array.isArray(priorRegister?.cotejos)?priorRegister.cotejos.filter(e=>e.locus===locus):[];
    if(prior.length){
      const section=make("section");
      section.append(make("h3","H · cotejos anotados anteriormente"));
      section.append(make("p","Observaciones del registro de trabajo de "+(priorRegister.fecha||"fecha no indicada")+
        ". Su calificación «confirma» o «precisa» es la del registro original y no supone ratificación editorial ni nueva autopsia en esta consulta."));
      const ul=make("ul");
      for(const note of prior){
        const li=make("li");
        li.append(make("span","f. "+(note.folio||"sin folio")+" · "+(note.resultado||"pendiente")+" · H: "+(note.H||"sin lectura consignada")));
        if(note.lecturaEnImagen){
          const detail=make("details");
          detail.append(make("summary","Nota de lectura registrada"));
          detail.append(make("p",note.lecturaEnImagen));
          li.append(detail);
        }
        if(note.folio){
          li.append(" · ");
          li.append(link("Comprobar folio","codex-h-folios-local.html?folio="+
            encodeURIComponent(note.folio.split("–")[0])+"&locus="+encodeURIComponent(locus)));
        }
        ul.append(li);
      }
      section.append(ul);mount.append(section);
    }
    // Existing folio-to-locus concordance is kept, including honest estimates.
    const list=record.exact||[];
    if(list.length){
      mount.append(make("p","Correspondencias folio–locus registradas: "+list.length+". El anclaje no equivale a lectura paleográfica completa."));
      const ul=make("ul");
      for(const e of list){
        const li=make("li");
        const status=window.CodexHConcordance.label(e.status)||e.status||"estado no indicado";
        li.append("H, f. "+e.folio+" — "+status+". ");
        if(e.note)li.append(make("span",e.note+" "));
        li.append(link("Examinar fotografía ampliable","codex-h-folios-local.html?folio="+encodeURIComponent(e.folio)+"&locus="+encodeURIComponent(locus)));
        ul.append(li);
      }
      mount.append(ul);
    }else if(record.estimate){
      const e=record.estimate;
      mount.append(make("p","Sin correspondencia material comprobada para el locus. Folio orientativo: "+e.folio+" (intervalo "+e.from+"–"+e.to+"); esta estimación no es una lectura del manuscrito."));
      mount.append(link("Abrir folio orientativo","codex-h-folios-local.html?folio="+encodeURIComponent(e.folio)+"&locus="+encodeURIComponent(locus)));
    }else{
      mount.append(make("p","Sin folio asignado por concordancia; no implica ausencia del pasaje en H."));
    }
    // Provisional semidiplomatic transcriptions are deliberately not copied into
    // the verified apparatus: they preserve the whole folio and its original line breaks.
    const folios=Object.entries(readingIndex?.folios||{}).filter(([,info])=>(info.loci||[]).includes(locus));
    for(const [folio,info] of folios){
      const details=make("details");
      details.append(make("summary","H, f. "+folio+" · lectura semidiplomática provisional"));
      details.append(make("p","Transcripción de trabajo del folio completo (loci "+(info.loci||[]).join(", ")+"). No es una transcripción diplomática certificada ni una variante ratificada. Los cortes de línea y las abreviaturas requieren cotejo con la fotografía."));
      details.append(link("Ver fotografía del folio","codex-h-folios-local.html?folio="+encodeURIComponent(folio)+"&locus="+encodeURIComponent(locus)));
      const reading=await readingFor(folio);
      if(ticket!==generation)return;
      if(Array.isArray(reading?.lines)){
        const pre=make("pre",reading.lines.join("\n"));
        pre.style.whiteSpace="pre-wrap";
        pre.style.overflowWrap="anywhere";
        details.append(pre);
        const discrepancies=(reading.lecturasARevisar||[]).filter(item=>item.locus===locus);
        if(discrepancies.length){
          details.append(make("p","Diferencias detectadas en la lectura provisional: sólo orientan el examen de la imagen; no constituyen variantes incorporadas al aparato."));
          const list=make("ul");
          for(const candidate of discrepancies){
            const li=make("li",candidate.op+": H (lectura provisional) «"+(candidate.H||"∅")+
              "»; V514 «"+(candidate.V514||"∅")+"».");
            list.append(li);
          }
          details.append(list);
        }
        if(reading.method)details.append(make("p","Método consignado: "+reading.method));
      }else details.append(make("p","No se pudo recuperar la lectura semidiplomática de este folio; consultar la fotografía."));
      mount.append(details);
    }
    if(!autoptic||!readingIndex||!priorRegister){
      mount.append(make("p","Uno de los registros de H no pudo consultarse. Se conservan los enlaces materiales, sin suplir lecturas ausentes."));
    }
    appendReferences(locus);
  }catch(error){
    if(ticket===generation)mount.replaceChildren(make("p","No se pudo consultar H: "+error.message));
  }
}
window.addEventListener("vitruvius:bude-locus",event=>{if(event.detail?.locus)render(event.detail.locus);});
render(new URLSearchParams(location.search).get("locus")||"1.1.1");
})();
