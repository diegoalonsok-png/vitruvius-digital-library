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
const chapters=new Map();
const cmpParts=(a,b)=>a==="praef"?-1:b==="praef"?1:Number(a)-Number(b);
const addOptions=(select,values,makeLabel)=>{select.replaceChildren();for(const value of values){const o=document.createElement("option");o.value=String(value);o.textContent=makeLabel(value);select.append(o)}};
function setupNavigator(){
 for(const locus of loci){const [book,chapter,section]=locus.split(".");if(!chapters.has(book))chapters.set(book,new Map());if(!chapters.get(book).has(chapter))chapters.get(book).set(chapter,[]);chapters.get(book).get(chapter).push(section)}
 const book=$("bude-book"),chapter=$("bude-chapter"),section=$("bude-section");
 addOptions(book,[...chapters.keys()],x=>"Libro "+x);
 const updateChapter=(prefer)=>{
  const cs=[...(chapters.get(book.value)||new Map()).keys()].sort(cmpParts);
  addOptions(chapter,cs,x=>x==="praef"?"Prefacio":"Capítulo "+x);
  chapter.value=cs.includes(prefer)?prefer:cs[0]||"";
 };
 const updateSection=(prefer)=>{
  const ss=(chapters.get(book.value)?.get(chapter.value)||[]).slice().sort((a,b)=>Number(a)-Number(b));
  addOptions(section,ss,x=>"§ "+x);
  section.value=ss.includes(prefer)?prefer:ss[0]||"";
 };
 const sync=locus=>{
  const [b,c,n]=String(locus).split(".");
  if(!chapters.has(b))return;
  book.value=b;updateChapter(c);updateSection(n);
 };
 const go=()=>{const locus=[book.value,chapter.value,section.value].join(".");if(loci.includes(locus))render(locus)};
 book.addEventListener("change",()=>{updateChapter();updateSection();go()});
 chapter.addEventListener("change",()=>{updateSection();go()});
 section.addEventListener("change",go);
 window.addEventListener("vdl:comparative-locus-select",e=>{const locus=e.detail?.locus;if(loci.includes(locus))render(locus)});
 return sync;
}
let syncNavigator=null;
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
function evidenceFacsimile(file,folio,locus){
 const det=E("details",null,"bude-manuscript");const sum=E("summary","Ampliar fotografía de H · f. "+folio);det.append(sum);
 const p=E("p","Fuente: fotografía local conservada en el archivo maestro. La ubicación por locus y su grado de comprobación se indican en la ficha crítica.","bude-note");det.append(p);
 const img=E("img");img.loading="lazy";img.decoding="async";img.alt="British Library, Harley MS 2767, f. "+folio+"; fotografía para cotejo de "+locus;
 img.src=file;img.style.cssText="display:block;width:100%;max-width:780px;height:auto;cursor:zoom-in;border:1px solid #a8a099";
 const a=A("Abrir fotografía en tamaño original",file);a.target="_blank";a.rel="noopener";a.append(img);det.append(a);
 const note=E("p",null,"bude-note");note.append(A("Herramientas de lupa y contraste",hViewerLink(folio,locus)));det.append(note);
 return det;
}
function section(title){const s=E("section");s.append(E("h3",title));root.append(s);return s}
async function render(query){
 const locus=norm(query),position=loci.indexOf(locus),token=++sequence;
 if(position<0){status.textContent="Locus no indexado: "+query+"; comprueba la numeración.";return}
 $("bude-locus").value=fmt(locus);
 syncNavigator?.(locus);
 const summarySearch=$("q");if(summarySearch&&summarySearch.value!==locus){summarySearch.value=locus;summarySearch.dispatchEvent(new Event("input",{bubbles:true}));}
 $("bude-prev").disabled=position===0;$("bude-next").disabled=position===loci.length-1;
 $("bude-open-reader").href="apparatus-bude.html?locus="+encodeURIComponent(locus);
 $("bude-open-h").href="concordancia-folios.html?locus="+encodeURIComponent(locus);
 const u=new URL(location.href);u.searchParams.set("locus",locus);history.replaceState(null,"",u);
 window.dispatchEvent(new CustomEvent("vdl:comparative-locus-render",{detail:{locus}}));
 root.replaceChildren();status.textContent="Consultando "+fmt(locus)+"…";
 const evidence=data.coverage?.loci?.find(x=>x.locus===locus);
 const indicator=$("bude-cobertura");
 if(indicator&&evidence){
  indicator.replaceChildren(E("strong","Expediente "+fmt(locus)+" · "));
  indicator.append("Fuentes y cotejos por locus · cobertura digital 731/731; los grados de revisión filológica se identifican por separado.");
  const grid=E("div",null,"bude-evidence-grid");
  const hChecked=(data.curated?.entries||[]).filter(x=>x.locus===locus&&x.verifiedAutopsy===true);
  const hAnchorCount=evidence.codex_h?.anclas?.length||0;
  const statusList=[
   ["Kurilo V514",evidence.kurilo.estado==="texto_estructurado"?"Edición latina propia basada principalmente en Krohn (1912), cotejada con Rose (1899)":"Consultar edición latina y traducción","lector-bilingue.html?locus="+encodeURIComponent(locus)],
   ["Rose 1899","Texto de la edición Rose (1899) indexado · lectura digital y comprobación del impreso por locus","rose-1899.html"],
   ["Krohn 1912","Edición de Fritz Krohn (1912), base principal del latín de Kurilo · texto del libro indexado; apoyo digital Perseus","krohn-1912.html"],
   ["Codex H",hChecked.length?"Cotejado ex imagine: "+hChecked.length+" lectura(s) puntual(es) documentada(s) para este locus":hAnchorCount?"Códice cotejado selectivamente; "+hAnchorCount+" referencia(s) de folio en este locus, sin lectura puntual certificada aquí":"Códice cotejado selectivamente; sin lectura puntual documentada para este locus","concordancia-folios.html?locus="+encodeURIComponent(locus)]
  ];
  for(const [edition,description,url] of statusList){
   const card=E("div",null,"bude-evidence-unit");card.append(E("b",edition),E("small",description),A("Consultar",url));
   if(edition==="Rose 1899"){card.append(document.createTextNode(" · "),A("Biblioteca Gutenberg (transcripción)","https://www.gutenberg.org/ebooks/51812"));}
   grid.append(card);
  }
  indicator.append(grid,E("small","Rose y Krohn son ediciones impresas originales indexadas por sus textos. Las ediciones originales, sus transcripciones digitales y las imágenes de los impresos se identifican como recursos distintos. Codex H posee cotejos puntuales ex imagine documentados; la presencia de un folio en el mapa no certifica por sí sola todos los lemas. Diferencias digitales candidatas en este locus: "+evidence.aparato.diferencias_digitales_candidatas+"."));
 }

 const p=data.es.passages.find(x=>x.locus===locus);
 const grid=E("div",null,"bude-grid");grid.append(card("Textus Latinus · Kur. V514",p?.latin,"la"));
 if(data.fr?.loadError)grid.append(E("p","El índice francés V554 no pudo cargarse en esta solicitud: "+data.fr.loadError+". La edición está catalogada en los archivos del proyecto; consultar sus fuentes documentales.","bude-note"));
 for(const [id,title,lang] of [["es","Interpretatio Hispanica · V514","es"],["fr","Interpretatio Gallica · V554","fr"],["en","Interpretatio Anglica · V297","en"]]){
  const t=data[id].passages.find(x=>x.locus===locus)?.translation||"";
  grid.append(card(title,/^\s*(apparatus criticus|critical apparatus)\s*\(/i.test(t)?"Entrada de aparato; no traducción alineada.":t,lang));
 }
 root.append(E("h3","Vitr., De architectura "+fmt(locus)));root.append(grid);
 // Comparación textual completa para cada locus, independiente del aparato de variantes.
 // El texto H no se suple con V514 ni se deduce del OCR de los editores impresos.
 const texts=section("Textus comparati · Kr. 1912 / Rose 1899 / Kur. V514");
 const tgrid=E("div",null,"bude-grid");
 const krohn=data.krohn?.passages?.find(x=>x.locus===locus);
 const rose=data.ocr?.loci?.[locus]?.["rose-1899"];
 const roseTranscription=data.roseDigital?.passages?.find(x=>x.locus===locus);
 const krohnOcr=data.ocr?.loci?.[locus]?.["krohn-1912"];
 const k=card("Kr. 1912 · "+fmt(locus),krohn?.latin||"No hay transcripción digital independiente de Krohn alineada a este locus.","la");
 k.append(E("small",krohn?"Krohn 1912 · texto digital indexado por locus (fuente Perseus); cotejo de la página impresa documentado por separado.":"Krohn 1912 · este locus no fue recuperado del índice digital en la consulta; no se sustituye por Kurilo."));
 if(krohnOcr?.page){const p=E("p",null,"bude-note");p.append(A("Ver página del impreso de Krohn · imagen "+krohnOcr.page,"krohn-1912.html"));k.append(p)}
 const ro=card("Rose 1899 · "+fmt(locus),roseTranscription?.latin||"Transcripción digital no disponible; revisar el facsímil.","la");
 ro.append(E("small",roseTranscription?(roseTranscription.status==="alignment_needs_editorial_review"?"Transcripción Project Gutenberg · división por locus pendiente de revisión; cotejar impreso.":"Transcripción independiente Project Gutenberg · aún no verificada exhaustivamente contra el impreso."):"Transcripción Rose no disponible; la extracción de página es solo auxiliar."));
 if(rose?.page){const p=E("p",null,"bude-note");p.append(A("Consultar facsímil de Rose · imagen digital "+rose.page,"https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf#page="+rose.page));ro.append(p)}
 const ku=card("Kur. V514 · "+fmt(locus),p?.latin||"Sin texto estructurado.","la");
 ku.append(E("small","Texto autoral V514; las elecciones editoriales de latín y griego se conservan."));
 tgrid.append(k,ro,ku);texts.append(tgrid);
 texts.append(E("p","H (Harley MS 2767) se documenta por su imagen y los cotejos expresamente verificados, en el apartado siguiente. No se publica una lectura diplomática reconstruida sin cotejo. La unidad por locus es una alineación editorial y no implica paginación idéntica en Rose y Krohn.","bude-note"));
 // Candidate lexical differences from the two independently attributed digital editions.
 // NEVER elevate these to manuscript variants or attest H to them without autopsy.
 const diff=section("Collatio textualis digitalis · Kr. 1912 / Kur. V514");
 const candidate=data.variants?.loci?.find(x=>x.locus===locus);
 if(!candidate||candidate.estado==="sin_transcripcion_independiente"){
  diff.append(E("p","No existe en este locus una transcripción independiente de Krohn utilizable. La falta de transcripción no equivale a laguna del texto original.","bude-note"));
 }else{
  diff.append(E("p","Comparación mecánica de palabras latinas normalizadas; minúsculas, i/j y u/v se consideran equivalentes. La edición de Krohn digital procede de Perseus, pendiente de cotejo con el impreso. Porcentaje de coincidencia léxica orientativo: "+(candidate.porcentaje??"—")+" %. No es un índice de autenticidad ni una lectura manuscrita.","bude-note"));
  const classes=candidate.unidades.reduce((m,x)=>(m[x.clasificacion]=(m[x.clasificacion]||0)+1,m),{});diff.append(E("p","Clasificación editorial preliminar: "+(classes.segmentacion_grafica||0)+" divisiones gráficas · "+(classes.fragmento_aislado||0)+" fragmentos sospechosos · "+(classes.cotejo_pendiente||0)+" diferencias por cotejar. Nomenclatura según uso Budé; no es aparato de testigos verificados.","bude-note"));
  if(!candidate.unidadesTotales)diff.append(E("p","Sin diferencias léxicas detectadas tras normalización entre las dos transcripciones para este locus; no demuestra ausencia de variantes en los manuscritos."));
  else{
   const overview=E("p",candidate.unidadesTotales+" unidades candidatas detectadas, "+candidate.unidades.length+" mostradas. Las omisiones detectadas pueden ser artefactos de transcripción, incluidos corchetes editoriales.","bude-note");diff.append(overview);
   for(const entry of candidate.unidades){
    const unit=E("div",null,"bude-unit");
    const summary=E("div",null,"bude-critical-line");
    const left=E("em",entry.kurilo);left.lang="la";
    const right=E("em",entry.krohn);right.lang="la";
    summary.append("Kur. V514: ",left," ] Kr. (transcr. digital): ",right," · ",entry.tipo);
    unit.append(summary,E("small","COLLATIO COMPUTATRALIS · "+({segmentacion_grafica:"divisio verborum / grafía",fragmento_aislado:"fragmentum suspectum",cotejo_pendiente:"lectio examinanda"}[entry.clasificacion]||"candidata")+" · "+(entry.nota_ecdótica||"Lectura por verificar")+" · ex editione impressa comprobanda · no atribuir a H, G, E ni S"));
    diff.append(unit);
   }
  }
  const links=E("p",null,"bude-note");
  links.append(A("Abrir Krohn 1912 en facsímil","krohn-1912.html")," · ",A("Abrir registro ecdótico V514","registro-ecdotico.html?locus="+encodeURIComponent(locus)));
  diff.append(links);
 }
 const pending=data.pendingH?.loci?.find(x=>x.locus===locus);
 if(pending){
  const triage=section("Status quaestionis · cotejo de H pendiente");
  triage.append(E("p","Este locus no tiene una entrada crítica registrada en el aparato comparativo. Sí dispone de las ediciones históricas de Rose y Krohn indexadas para consulta. La falta de aparato no significa ausencia de variante.","bude-note"));
  const d=pending.cotejo_digital;
  if(d){
   const u=E("div",null,"bude-unit");
   u.append(E("strong","Collatio Kr. / Kur. · cribado digital completado"));
   u.append(E("div",d.porcentaje===100&&d.unidades_candidatas===0?"Kr. 1912 (transcripción Perseus) = Kur. V514 tras normalización léxica · 100 % de coincidencia digital; sin diferencia computacional detectada.":"Coincidencia normalizada: "+d.porcentaje+" %; diferencias digitales candidatas: "+d.unidades_candidatas+"."));
   u.append(E("small","No se certifica consensus codicum. i/j y u/v normalizadas; posible divergencia editorial, ortográfica o paleográfica aún por cotejar."));
   triage.append(u);
  }
  const imp=pending.cotejo_impresos;
  if(imp){
   for(const [name,record] of [["Rose 1899",imp.rose],["Krohn 1912",imp.krohn]]){
    const u=E("div",null,"bude-unit");
    u.append(E("strong","Ex editione impressa · "+name+" · imagen digital "+(record.pagina_digital??"—")));
    u.append(E("div","OCR candidato asociado: "+(record.extracto_ocr||"sin texto")+(record.extracto_ocr?.length>=320?"…":"")));
    u.append(E("small","Alineación automática "+(typeof record.grado_alineacion_ocr==="number"?Math.round(record.grado_alineacion_ocr*100)+" %":"no cuantificada")+" · no es porcentaje de fiabilidad de la lectura · cotejo del impreso pendiente."));
    if(record.url)u.append(A("Examinar página original",record.url));
    triage.append(u);
   }
  }
  const material=pending.h.lecturas_parciales||[];
  for(const row of material){
   const u=E("div",null,"bude-unit");
   u.append(E("strong","H f. "+row.folio+" · lectura semidiplomática parcial localizada"),E("div","El índice de lectura vincula este folio con "+fmt(locus)+". Coincidencia automática orientativa: "+Math.round(row.coincidencia_algoritmica*100)+" %. No constituye una lectura de variante verificada."),A("Abrir imagen y texto en Concordancia de folios","concordancia-folios.html?locus="+encodeURIComponent(locus)));
   triage.append(u);
  }
  for(const f of pending.h.anclas||[]){
   const u=E("div",null,"bude-unit");
   u.append(E("strong","H f. "+f.folio+" · "+f.estado),E("div",f.nota||"Vínculo de folio localizado; lectura por verificar."),A("Examinar folio en Concordancia","concordancia-folios.html?locus="+encodeURIComponent(locus)));
   triage.append(u);
  }
  if(!material.length&&!pending.h.anclas?.length)triage.append(E("p","No consta una localización explícita de H para este locus. La concordancia ofrece una estimación por libro, señalada como tal; se requiere cotejo directo de la imagen.","bude-note"));
  triage.append(A("Consultar H y cotejar este locus","concordancia-folios.html?locus="+encodeURIComponent(locus)));
 }
 const books=data.kuriloBooks?.loci?.find(x=>x.locus===locus);
 if(books){
  const ed=section("Editiones Kurilo · V514 / V554 / V297");
  const similarity=books.latin.similitud_normalizada_v514_v297;
  const frenchRecord=data.fr?.passages?.find(x=>x.locus===locus);
  const frenchAvailable=Boolean(frenchRecord?.translation?.trim());
  const frenchStatus=frenchAvailable
   ?"V554: traducción francesa recuperada del índice estructurado para este locus."
   :"V554: la lectura francesa no se mostró en esta consulta. Revisar recuperación o correspondencia por locus, sin atribuir el problema al DOCX/PDF.";
  ed.append(E("p","V514: latín y castellano estructurados · V297: "+(books.latin.v297==="disponible"?"latín e inglés estructurados":"locus sin texto estructurado")+" · "+frenchStatus,"bude-note"));
  if(!frenchAvailable){const note=E("p",null,"bude-note");note.append(A("Consultar edición francesa V554","documents/edicion-v554.html")," · ",A("PDF francés","documents/kurilo-recensio-fr.pdf")," · ",A("Índice estructurado V554","data/structured/recensio-fr.json"));ed.append(note)}
  ed.append(E("p","Similitud digital V514/V297: "+(similarity==null?"no disponible":similarity+" %")+". "+(books.latin.identidad_secuencial_normalizada===true?"Secuencia normalizada coincidente.":books.latin.identidad_secuencial_normalizada===false?"Secuencia normalizada distinta; cotejo editorial pendiente.":"Comparación incompleta.")+" No atribuir a códices manuscritos.","bude-note"));
  for(const [title,entries,kind] of [["Apéndice T de las ediciones",books.apendice_t,"appendix"],["Notas y glosas de tus libros",books.notas_autorales,"notes"]]){
   if(!entries?.length)continue;
   const details=E("details");details.append(E("summary",title+" · "+entries.length+" registros"));
   for(const x of entries){const p=E("p",null,"bude-note");p.append((x.version||"Edición")+" · "+(kind==="appendix"?(x.grado+" · p. "+x.page+" · folios "+(x.folios||[]).join(", ")):(x.lemma||"sin lema")+" · "+(x.glosa||""))+" · ",A("Fuente",x.pdf));details.append(p)}
   ed.append(details);
  }
 }
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
  if(c.v514?.length)for(const v of c.v514){item(ext,"Kur. V514 · entrada selectiva",v.aparato||v.lema||"Entrada editorial",v.grado||"Procedencia editorial","registro-ecdotico.html?locus="+encodeURIComponent(locus))}
  for(const [key,title] of [["rose-1899","Rose 1899"],["krohn-1912","Kr. 1912"]]){
   const witness=c[key];if(!witness)continue;
   for(const entry of (witness.entradas||[]))item(ext,title+" · OCR candidato",entry.texto,"Página impresa "+entry.pagina+"; línea OCR "+entry.linea+"; siglas extraídas: "+(entry.sigla||[]).join(", ")+". Lectura pendiente de verificar con facsímil.",witness.pdf);
  }
 }
 if(ext.children.length===1)ext.append(E("p","Sin entrada crítica registrada en Rose/Krohn/Kurilo para este locus; la consulta y colación de testimonios queda abierta."));
 const verified=section("Aparato crítico comparativo · testimonios y ediciones");
 verified.append(E("p","Convención: ‖ locus lectio recepta + sigla : varia lectio + sigla ‖. H = codex Harleianus; Kr. = Krohn; Rose = Rose; Kur. = ediciones Kurilo. «sec. Kur.» indica atribución editorial y «ex imagine» lectura directa de la fotografía. Las demás entradas conservan su carácter documental.","bude-note"));
 const selected=data.curated.entries.filter(x=>x.locus===locus);
 for(const e of selected){
  const sourceRefs=(e.sources||[]).join(" · ");
  if(e.criticalUnit){
   const u=E("div",null,"bude-unit");
   const heading=E("div",e.criticalUnit.display,"bude-critical-line");
   heading.lang="la";u.append(heading);
   u.append(E("small",(e.criticalUnit.form==="nota_graphica"?"Nota graphica · ":"Apparatus positivus selectivus · ")+e.criticalUnit.caution));
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
  if(e.anchorEvidence){
   const anchorLine=E("p",null,"bude-note");
   anchorLine.append("LECTURA CONTEXTUAL LOCALIZADA EN H, f. "+e.anchorEvidence.folio+": ");
   const fragment=E("i",e.anchorEvidence.fragment);fragment.lang="la";anchorLine.append(fragment);
   anchorLine.append(". "+e.anchorEvidence.interpretation);
   verified.append(anchorLine);
  }
  if(e.imageInspection){
   const observed=E("p",null,"bude-note");
   observed.append("FOLIO EXAMINADO · SIN LECTURA CERTIFICADA: "+e.imageInspection.warning+" ");
   observed.append(A("Examinar fotografía en GitHub","https://github.com/diegoalonsok-png/vitruvius-digital-library/blob/main/"+e.imageInspection.file));
   if(e.imageInspection.observed)observed.append(E("span"," Contexto localizado: "+e.imageInspection.observed)); 
   verified.append(observed);
   verified.append(evidenceFacsimile(e.imageInspection.file,e.imageInspection.folio,locus));
   if(e.imageInspection.adjacent?.length){
    const links=E("p",null,"bude-note");links.append("Folios contiguos cotejados: ");
    e.imageInspection.adjacent.forEach((f,i)=>{if(i)links.append(" · ");links.append(A("H f. "+f.folio,hViewerLink(f.folio,locus)));});
    verified.append(links);
   }
  }
  if(e.visualEvidence){
   const proof=E("p",null,"bude-note");
   proof.append("LECTURA DIRECTA DE H: "+e.visualEvidence.observedReading+" · f. "+e.visualEvidence.folio+". ");
   proof.append(A("Ver fotografía original conservada en GitHub","https://github.com/diegoalonsok-png/vitruvius-digital-library/blob/main/"+e.visualEvidence.file));
   proof.append(". "+e.visualEvidence.note);
   verified.append(proof);
   verified.append(evidenceFacsimile(e.visualEvidence.file,e.visualEvidence.folio,locus));
  }
  if(e.comparison){
   const compar=E("div",null,"bude-grid");
   const texts=[["Kur. V514 · latín",e.comparison.kurilo_latin],
    ["H f. "+e.folio+(e.visualEvidence?" · cotejo visual":" · atribución editorial pendiente"),e.comparison.h_transcription],
    ["Rose 1899 · aparato histórico, localización auxiliar (p. "+e.comparison.rose_page+")",e.comparison.rose_apparatus_ocr],
    ["Kr. 1912 · aparato histórico, extracción auxiliar (p. "+e.comparison.krohn_page+")",e.comparison.krohn_apparatus_ocr]];
   for(const [title,body] of texts)compar.append(card(title,body,"la"));
   verified.append(compar);
   verified.append(E("p","Las siglas reproducidas en los aparatos históricos de Rose y Krohn se conservan con procedencia documental, sin restitución ni atribución paleográfica automática.","bude-note"));
  }
 }
 if(!selected.length)verified.append(E("p","Sin unidad cotejada publicada en este locus: el aparato se mantiene abierto y no se infiere ausencia de variantes."));
 const appendix=section("Collatio selectiva · Apéndice T (V514/V554)");
 const entries=data.appendix.entradas.filter(x=>x.locus===locus);
 for(const ent of entries){
  const fields=Object.entries(ent.campos||{}).map(([k,v])=>k+": "+v).join(" · ");
  item(appendix,ent.version+" · "+ent.grado,fields,"Apéndice T, p. "+ent.page+"; folios citados: "+(ent.folios||[]).join(", ")+". Concordancia entre publicaciones no significa autopsia manuscrita.",ent.pdf);
 }
 if(!entries.length)appendix.append(E("p","El Apéndice T no ofrece una entrada registrada en este locus."));
 const notes=section("Notae explicativae · selección de los libros de Kurilo");
 const glosas=data.author.glosas.filter(x=>x.locus===locus&&String(x.glosa||"").trim());
 for(const n of glosas)item(notes,n.version+" · "+(n.lemma||"glosa"),n.glosa,"p. "+n.page+" · anclaje "+n.grado+" · nota autoral; no variante manuscrita.",n.pdf);
 if(!glosas.length)notes.append(E("p","Sin glosas de locus explícito o lematizado único. Los comentarios sin anclaje se conservan en el inventario general."));
 notes.append(A("Inventario completo de notas, incluidas las no localizadas","inventario-aparato-autoral.html"));
 status.textContent="Vitr. "+fmt(locus)+" · cobertura por locus: 731/731 · "+selected.length+" unidades verificadas selectivas · "+(c?.v514?.length||0)+" entradas V514 · "+entries.length+" registros del Apéndice T · "+glosas.length+" glosas. La colación de manuscritos sigue siendo parcial.";
}
(async()=>{try{
 const paths=["data/structured/recensio-es.json","data/structured/recensio-fr.json","data/structured/theory-en.json","data/apparatus/aparato-comparativo.json","data/apparatus/collatio-validada.json","data/apparatus/aparato-autoral.json"];
 const [es,fr,en,comparison,appendix,author,curated,hmap,krohn,roseDigital,ocr,variants,coverage,pendingH,kuriloBooks]=await Promise.all([...paths,"data/apparatus/cotejo-selectivo-v514-v554-h.json","data/codex-h/folio-locus-map.json","data/critical-editions/krohn-1912-tei-loci.json","data/critical-editions/rose-1899-transcribed-loci.json","data/collation-loci.json","data/apparatus/krohn-kurilo-variantes-candidatas.json","data/apparatus/cobertura-testimonial-731.json","data/apparatus/cotejo-h-pendientes-24.json","data/apparatus/cotejo-ediciones-kurilo-731.json"].map((url)=>url==="data/structured/recensio-fr.json"?json(url).then(doc=>{
  if(!Array.isArray(doc?.passages))throw Error("Estructura de pasajes franceses no reconocida");
  return doc;
 }).catch(error=>({passages:[],loadError:String(error.message||error)})):json(url)));
 data={es,fr,en,comparison,appendix,author,curated,hmap,krohn,roseDigital,ocr,variants,coverage,pendingH,kuriloBooks};loci=es.passages.map(p=>p.locus);
 syncNavigator=setupNavigator();
 const q=new URLSearchParams(location.search).get("locus")||"1.1.1";render(q);
 $("bude-form").addEventListener("submit",e=>{e.preventDefault();render($("bude-locus").value)});
 // Unify the legacy tabular finder with the locus-specific apparatus.
 $("q")?.addEventListener("change",()=>{const q=norm($("q").value);if(loci.includes(q))render(q)});

 $("bude-prev").addEventListener("click",()=>{const i=loci.indexOf(norm($("bude-locus").value));if(i>0)render(loci[i-1])});
 $("bude-next").addEventListener("click",()=>{const i=loci.indexOf(norm($("bude-locus").value));if(i>=0&&i+1<loci.length)render(loci[i+1])});
}catch(e){status.textContent="No se pudo cargar el aparato comparativo: "+e.message}})();
})();