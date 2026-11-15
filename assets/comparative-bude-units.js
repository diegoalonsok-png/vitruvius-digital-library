/* Apparatus criticus selectivus: editorial notes from V514/V554/V297,
   historical OCR candidates and separately graded Appendix T collation. */
(()=>{"use strict";
const $=id=>document.getElementById(id),root=$("bude-content"),status=$("bude-state");if(!root)return;
const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n};
const A=(label,url)=>{const a=E("a",label);a.href=url;return a};
const romans=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const norm=s=>{s=String(s||"").trim().toLowerCase().replace(/\s+/g,"");const m=s.match(/^([ivx]+)\./);if(m){let n=0,p=0;for(const ch of m[1].split("").reverse()){const v={i:1,v:5,x:10}[ch];n+=v<p?-v:v;p=v}s=n+s.slice(m[1].length)}return s.replace(/\.praefatio\./g,".praef.").replace(/\.preface\./g,".praef.")};
const fmt=s=>{const p=String(s).split(".");return (romans[+p[0]]||p[0])+"."+p.slice(1).join(".")};
let data=null,loci=[],sequence=0;
function card(title,body,lang){const c=E("article",null,"bude-card");c.append(E("h3",title));const p=E("p",body||"Sin texto indexado para este locus.");if(lang)p.lang=lang;c.append(p);return c}
function item(container,title,text,meta,url){const d=E("div",null,"bude-unit");d.append(E("strong",title),E("div","‖ "+String(text||"Sin texto recuperado")+" ‖"));if(meta)d.append(E("small",meta));if(url){const p=E("div");p.append(A("Comprobar fuente",url));d.append(p)}container.append(d)}
const json=async url=>{const r=await fetch(url);if(!r.ok)throw Error(url+" HTTP "+r.status);return r.json()};
function hViewerLink(folio,locus){
 const row=data?.hmap?.entries?.find(x=>x.folio===folio);
 const q=new URLSearchParams({locus});
 if(Number.isInteger(row?.image_number)&&row.image_number>0)q.set("image",String(row.image_number));
 else if(folio)q.set("folio",folio);
 return "harleianus.html?"+q.toString();
}
function section(title){const s=E("section");s.append(E("h3",title));root.append(s);return s}
async function render(query){
 const locus=norm(query),position=loci.indexOf(locus),token=++sequence;
 if(position<0){status.textContent="Locus no indexado: "+query;return}
 $("bude-locus").value=fmt(locus);
 const summarySearch=$("q");if(summarySearch&&summarySearch.value!==locus){summarySearch.value=locus;summarySearch.dispatchEvent(new Event("input",{bubbles:true}));}
 $("bude-prev").disabled=position===0;$("bude-next").disabled=position===loci.length-1;
 $("bude-open-reader").href="apparatus-bude.html?locus="+encodeURIComponent(locus);
 $("bude-open-h").href="harleianus.html?locus="+encodeURIComponent(locus);
 const u=new URL(location.href);u.searchParams.set("locus",locus);history.replaceState(null,"",u);
 root.replaceChildren();status.textContent="Consultando "+fmt(locus)+"…";
 const p=data.es.passages.find(x=>x.locus===locus);
 const grid=E("div",null,"bude-grid");grid.append(card("Textus Latinus · Kur. V514",p?.latin,"la"));
 for(const [id,title,lang] of [["es","Interpretatio Hispanica · V514","es"],["fr","Interpretatio Gallica · V554","fr"],["en","Interpretatio Anglica · V297","en"]]){
  const t=data[id].passages.find(x=>x.locus===locus)?.translation||"";
  grid.append(card(title,/^\s*(apparatus criticus|critical apparatus)\s*\(/i.test(t)?"Entrada de aparato; no traducción alineada.":t,lang));
 }
 root.append(E("h3","Vitr., De architectura "+fmt(locus)));root.append(grid);
 const h=section("Testimonium H · primer testimonio: inspección de folios");
 h.append(E("p","Harley MS 2767 (British Library, ca. 800–824): la fuente manuscrita más antigua conservada de De architectura. El cotejo debe comenzar con la imagen del folio, no con una transcripción derivada. Los enlaces de locus estimado no demuestran la lectura.","bude-note"));
 try{
  const v=await window.CodexHConcordance?.locate(locus);if(token!==sequence)return;
  if(v?.exact?.length)for(const f of v.exact){item(h,"H f. "+f.folio, f.note||"Correspondencia del folio registrada.", "Estado del enlace: "+f.status+"; cotejo diplomático no presumido.",hViewerLink(f.folio,locus))}
  else if(v?.estimate)item(h,"H · estimación",v.estimate.folio+" ("+v.estimate.from+"–"+v.estimate.to+")","Localización proporcional, no prueba codicológica.",hViewerLink(v.estimate.folio,locus));
  else h.append(E("p","Sin folio vinculado en el mapa actual."));
 }catch(e){h.append(E("p","Concordancia H no disponible: "+e.message))}
 const c=data.comparison.loci.find(x=>x.locus===locus);
 const ext=section("Apparatus comparativus · Rose, Kr., Kur.");
 if(c){
  if(c.v514?.length)for(const v of c.v514.slice(0,20)){item(ext,"Kur. V514 · entrada selectiva",v.aparato||v.lema||"Entrada editorial",v.grado||"Procedencia editorial","registro-ecdotico.html?locus="+encodeURIComponent(locus))}
  for(const [key,title] of [["rose-1899","Rose 1899"],["krohn-1912","Kr. 1912"]]){
   const witness=c[key];if(!witness)continue;
   for(const entry of (witness.entradas||[]).slice(0,35))item(ext,title+" · OCR candidato",entry.texto,"Página impresa "+entry.pagina+"; línea OCR "+entry.linea+"; siglas extraídas: "+(entry.sigla||[]).join(", ")+". Lectura pendiente de verificar con facsímil.",witness.pdf);
  }
 }
 if(ext.children.length===1)ext.append(E("p","Sin entradas selectivas para este locus."));
 const verified=section("Apparatus criticus selectivus · forma Budé, testimonios y ediciones");
 verified.append(E("p","Convención: ‖ locus lectio recepta + sigla : varia lectio + sigla ‖. H = codex Harleianus; Kr. = Krohn; Rose = Rose; Kur. = ediciones Kurilo. «sec. Kur.» indica atribución editorial y «ex imagine» lectura directa de la fotografía. Las demás entradas conservan su carácter documental.","bude-note"));
 const selected=data.curated.entries.filter(x=>x.locus===locus);
 for(const e of selected){
  const sourceRefs=(e.sources||[]).join(" · ");
  if(e.criticalUnit){
   const u=E("div",null,"bude-unit");
   const heading=E("div",e.criticalUnit.display,"bude-critical-line");
   heading.lang="la";u.append(heading);
   u.append(E("small","Apparatus positivus selectivus · "+e.criticalUnit.caution));
   u.append(E("div",e.note,"bude-note"));
   u.append(A("Examinar H f. "+e.folio+" en el visor",hViewerLink(e.folio,locus)));
   verified.append(u);
  }else{
   item(verified,"Kur. · cotejo documental: "+e.lemma+" ] "+e.reading+" "+e.siglum,
        e.note,"H, f. "+e.folio+" · "+e.status+" · registros: "+sourceRefs,
        hViewerLink(e.folio,locus));
  }
  const provenance=E("p",null,"bude-note");provenance.append("Fuentes editoriales: ");
  const sourceRows=(e.sources||[]).map(id=>data.appendix.entradas.find(row=>row.id===id)).filter(Boolean);
  if(sourceRows.length){
   sourceRows.forEach((row,i)=>{if(i)provenance.append(" · ");provenance.append(A(row.version+" · Apéndice T, p. "+row.page,row.pdf));});
  }else provenance.append("Referencias textuales indicadas arriba; revisar identificadores en el Apéndice T.");
  verified.append(provenance);
  if(e.imageInspection){
   const observed=E("p",null,"bude-note");
   observed.append("FOLIO EXAMINADO · SIN LECTURA CERTIFICADA: "+e.imageInspection.warning+" ");
   observed.append(A("Examinar fotografía en GitHub","https://github.com/diegoalonsok-png/vitruvius-digital-library/blob/main/"+e.imageInspection.file));
   verified.append(observed);
  }
  if(e.visualEvidence){
   const proof=E("p",null,"bude-note");
   proof.append("LECTURA DIRECTA DE H: "+e.visualEvidence.observedReading+" · f. "+e.visualEvidence.folio+". ");
   proof.append(A("Ver fotografía original conservada en GitHub","https://github.com/diegoalonsok-png/vitruvius-digital-library/blob/main/"+e.visualEvidence.file));
   proof.append(". "+e.visualEvidence.note);
   verified.append(proof);
  }
  if(e.comparison){
   const compar=E("div",null,"bude-grid");
   const texts=[["Kur. V514 · latín",e.comparison.kurilo_latin],
    ["H f. "+e.folio+(e.visualEvidence?" · cotejo visual":" · atribución editorial pendiente"),e.comparison.h_transcription],
    ["Rose 1899 · OCR de aparato (p. "+e.comparison.rose_page+")",e.comparison.rose_apparatus_ocr],
    ["Kr. 1912 · OCR de aparato (p. "+e.comparison.krohn_page+")",e.comparison.krohn_apparatus_ocr]];
   for(const [title,body] of texts)compar.append(card(title,body,"la"));
   verified.append(compar);
   verified.append(E("p","Las siglas de Rose y Krohn se conservan como OCR documental, sin restitución ni atribución paleográfica automática.","bude-note"));
  }
 }
 if(!selected.length)verified.append(E("p","Sin unidad selectiva cotejada entre ambas publicaciones en este locus; no implica inexistencia de otras variantes."));
 const appendix=section("Collatio selectiva · Apéndice T (V514/V554)");
 const entries=data.appendix.entradas.filter(x=>x.locus===locus);
 for(const ent of entries.slice(0,30)){
  const fields=Object.entries(ent.campos||{}).map(([k,v])=>k+": "+v).join(" · ");
  item(appendix,ent.version+" · "+ent.grado,fields,"Apéndice T, p. "+ent.page+"; folios citados: "+(ent.folios||[]).join(", ")+". Concordancia entre publicaciones no significa autopsia manuscrita.",ent.pdf);
 }
 if(!entries.length)appendix.append(E("p","El Apéndice T no ofrece una entrada registrada en este locus."));
 const notes=section("Notae explicativae · selección de los libros de Kurilo");
 const glosas=data.author.glosas.filter(x=>x.locus===locus&&String(x.glosa||"").trim());
 for(const n of glosas.slice(0,20))item(notes,n.version+" · "+(n.lemma||"glosa"),n.glosa,"p. "+n.page+" · anclaje "+n.grado+" · nota autoral; no variante manuscrita.",n.pdf);
 if(!glosas.length)notes.append(E("p","Sin glosas de locus explícito o lematizado único. Los comentarios sin anclaje se conservan en el inventario general."));
 notes.append(A("Inventario completo de notas, incluidas las no localizadas","inventario-aparato-autoral.html"));
 status.textContent="Vitr. "+fmt(locus)+" · "+selected.length+" unidades selectivas cotejadas entre V514 y V554; "+(c?.v514?.length||0)+" entradas del índice V514; "+entries.length+" registros del Apéndice T; "+glosas.length+" glosas ancladas. Selectivo, no exhaustivo.";
}
(async()=>{try{
 const paths=["data/structured/recensio-es.json","data/structured/recensio-fr.json","data/structured/theory-en.json","data/apparatus/aparato-comparativo.json","data/apparatus/collatio-validada.json","data/apparatus/aparato-autoral.json"];
 const [es,fr,en,comparison,appendix,author,curated,hmap]=await Promise.all([...paths,"data/apparatus/cotejo-selectivo-v514-v554-h.json","data/codex-h/folio-locus-map.json"].map(json));
 data={es,fr,en,comparison,appendix,author,curated,hmap};loci=es.passages.map(p=>p.locus);
 const q=new URLSearchParams(location.search).get("locus")||"1.1.1";render(q);
 $("bude-form").addEventListener("submit",e=>{e.preventDefault();render($("bude-locus").value)});
 // Unify the legacy tabular finder with the locus-specific apparatus.
 $("q")?.addEventListener("change",()=>{const q=norm($("q").value);if(loci.includes(q))render(q)});

 $("bude-prev").addEventListener("click",()=>{const i=loci.indexOf(norm($("bude-locus").value));if(i>0)render(loci[i-1])});
 $("bude-next").addEventListener("click",()=>{const i=loci.indexOf(norm($("bude-locus").value));if(i>=0&&i+1<loci.length)render(loci[i+1])});
}catch(e){status.textContent="No se pudo cargar el aparato comparativo: "+e.message}})();
})();