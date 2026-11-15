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
function section(title){const s=E("section");s.append(E("h3",title));root.append(s);return s}
async function render(query){
 const locus=norm(query),position=loci.indexOf(locus),token=++sequence;
 if(position<0){status.textContent="Locus no indexado: "+query;return}
 $("bude-locus").value=fmt(locus);$("bude-prev").disabled=position===0;$("bude-next").disabled=position===loci.length-1;
 $("bude-open-reader").href="apparatus-bude.html?locus="+encodeURIComponent(locus);
 $("bude-open-h").href="codex-h-folios-local.html?locus="+encodeURIComponent(locus);
 const u=new URL(location.href);u.searchParams.set("locus",locus);history.replaceState(null,"",u);
 root.replaceChildren();status.textContent="Consultando "+fmt(locus)+"…";
 const p=data.es.passages.find(x=>x.locus===locus);
 const grid=E("div",null,"bude-grid");grid.append(card("Textus Latinus · Kur. V514",p?.latin,"la"));
 for(const [id,title,lang] of [["es","Interpretatio Hispanica · V514","es"],["fr","Interpretatio Gallica · V554","fr"],["en","Interpretatio Anglica · V297","en"]]){
  const t=data[id].passages.find(x=>x.locus===locus)?.translation||"";
  grid.append(card(title,/^\s*(apparatus criticus|critical apparatus)\s*\(/i.test(t)?"Entrada de aparato; no traducción alineada.":t,lang));
 }
 root.append(E("h3","Vitr., De architectura "+fmt(locus)));root.append(grid);
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
 const h=section("Testimonium H · folio y nivel de evidencia");
 try{
  const v=await window.CodexHConcordance?.locate(locus);if(token!==sequence)return;
  if(v?.exact?.length)for(const f of v.exact){item(h,"H f. "+f.folio, f.note||"Correspondencia del folio registrada.", "Estado del enlace: "+f.status+"; cotejo diplomático no presumido.","codex-h-folios-local.html?folio="+encodeURIComponent(f.folio)+"&locus="+encodeURIComponent(locus))}
  else if(v?.estimate)item(h,"H · estimación",v.estimate.folio+" ("+v.estimate.from+"–"+v.estimate.to+")","Localización proporcional, no prueba codicológica.","codex-h-folios-local.html?folio="+encodeURIComponent(v.estimate.folio)+"&locus="+encodeURIComponent(locus));
  else h.append(E("p","Sin folio vinculado en el mapa actual."));
 }catch(e){h.append(E("p","Concordancia H no disponible: "+e.message))}
 status.textContent="Vitr. "+fmt(locus)+" · "+(c?.v514?.length||0)+" entradas del índice V514; "+entries.length+" registros del Apéndice T; "+glosas.length+" glosas ancladas. Selectivo, no exhaustivo.";
}
(async()=>{try{
 const paths=["data/structured/recensio-es.json","data/structured/recensio-fr.json","data/structured/theory-en.json","data/apparatus/aparato-comparativo.json","data/apparatus/collatio-validada.json","data/apparatus/aparato-autoral.json"];
 const [es,fr,en,comparison,appendix,author]=await Promise.all(paths.map(json));
 data={es,fr,en,comparison,appendix,author};loci=es.passages.map(p=>p.locus);
 const q=new URLSearchParams(location.search).get("locus")||"1.1.1";render(q);
 $("bude-form").addEventListener("submit",e=>{e.preventDefault();render($("bude-locus").value)});
 $("bude-prev").addEventListener("click",()=>{const i=loci.indexOf(norm($("bude-locus").value));if(i>0)render(loci[i-1])});
 $("bude-next").addEventListener("click",()=>{const i=loci.indexOf(norm($("bude-locus").value));if(i>=0&&i+1<loci.length)render(loci[i+1])});
}catch(e){status.textContent="No se pudo cargar el aparato comparativo: "+e.message}})();
})();