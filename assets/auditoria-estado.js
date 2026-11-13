/* Auditoría académica · estado ecdótico y de colación al día.
   Se calcula en el navegador desde los archivos del repositorio (no hay cifras
   escritas a mano): registro ecdótico, lecturas de H, cotejo con Krohn y Rose,
   concordancia de loci de los visores OCR y tablas de los libros. */
(()=>{
"use strict";
const j=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
const n=v=>Number(v||0).toLocaleString("es-AR");const pc=v=>Number(v||0).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});
const el=(t,a={},...k)=>{const e=document.createElement(t);for(const [x,v] of Object.entries(a)){if(x==="class")e.className=v;else if(x==="text")e.textContent=v;else e.setAttribute(x,v)}e.append(...k.filter(Boolean));return e};
async function pintar(){
 const ancla=[...document.querySelectorAll("h2")].find(h=>/Alertas que necesitan revisión/.test(h.textContent));
 const host=el("section",{class:"audit-estado",id:"estado-ecdotico"});
 (ancla?.closest("section")||ancla)?.before(host);
 if(!host.isConnected)document.querySelector("main")?.append(host);
 host.append(el("h2",{text:"Estado ecdótico y de colación (calculado en vivo)"}),el("p",{class:"note",text:"Cifras leídas ahora de los archivos del repositorio. Complementan los indicadores de arriba, que proceden del inventario del 11 de noviembre."}));
 const [reg,lec,cot,cot297,loci,tab]=await Promise.all([j("data/index/registro-ecdotico.json"),j("data/codex-h/lecturas/index.json"),j("data/index/cotejo-krohn-rose.json"),j("data/index/cotejo-krohn-rose-v297.json"),j("data/collation-loci.json"),j("data/tablas-libros.json")]);
 const coH=await j("data/codex-h/cotejo-aparato-h.json");
 const filas=[];
 if(reg?.recuentos){const r=reg.recuentos,t=r.porTipo||{};
  filas.push(["Registro ecdótico",n(r.total)+" registros: "+n(t.decision)+" decisiones del aparato de V514, "+n(t.glosa)+" glosas, "+n(t.nota)+" notas y "+n(t["lectura-h"])+" lecturas de H; "+n(r.conLocusCanonico)+" con locus canónico en "+n(r.lociConRegistros)+" loci.",(()=>{const g={};(reg.registros||[]).forEach(x=>{if(x.tipo==="decision"){const k=x.gradoRotulo||x.grado||"sin grado";g[k]=(g[k]||0)+1;}});const d=Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([k,v])=>n(v)+" "+k).join(", ");return "Grado de las decisiones según su fuente: "+d+". El grado mide cómo está documentada cada decisión en el aparato, no si fue cotejada: "+(coH?"cotejadas sobre la imagen de H: "+n(coH.recuentos.entradas)+" entradas del aparato en "+n(coH.recuentos.loci)+" loci ("+n(coH.recuentos.confirma||0)+" confirman, "+n(coH.recuentos.precisa||0)+" con precisiones, "+n(coH.recuentos.discrepa||0)+" discrepan), con folio y transcripción. Es una lectura preliminar asistida: la verificación externa por especialistas sigue en curso.":"ninguna figura todavía como verificada contra la imagen de H.");})(),"registro-ecdotico.html"]);}
 if(lec?.folios){const fs=Object.entries(lec.folios);
  filas.push(["Codex H · folios leídos",fs.length+" folios leídos renglón por renglón ("+fs.map(([f,v])=>"f. "+f+" "+Math.round((v.coincidencia||0)*100)+" %").join(", ")+" de coincidencia con V514).","Lectura semidiplomática sobre la imagen; una discrepancia con V514 no es todavía una variante.","codex-h-folios-local.html?folio=f.7r"]);}
 for(const [c,ed] of [[cot,"V514"],[cot297,"V297"]]){if(!c?.global)continue;const g=c.global;
  filas.push(["Latín de "+ed+" frente a Krohn (1912) y Rose (1899)",n(g.palabras)+" palabras en "+n(g.lociAlineados)+" loci: "+pc(g.concordanciaExacta)+" % atestiguadas en al menos una de las dos ediciones (Krohn "+pc(g.conKrohn)+" %, Rose "+pc(g.conRose)+" %). Erratas candidatas: "+n((c.erratasCandidatas||[]).length)+(ed==="V297"?"; diferencias con V514: "+n((c.diferenciasEntreEdiciones||[]).length)+", todas clasificadas (abreviación, división de parágrafos, notación, variante editorial, errata o a revisar)":"")+".","Comparación con el OCR de las ediciones impresas: orienta el cotejo, no lo sustituye."+(ed==="V297"?" La fe de erratas y la clasificación lugar por lugar están publicadas.":""),ed==="V297"?"erratas-ediciones.html":"scriptorium.html"]);}
 if(loci?.loci){const g={};for(const w of ["krohn-1912","rose-1899"]){g[w]={firme:0,prob:0,dub:0};for(const f of Object.values(loci.loci)){const x=f[w];if(!x?.page)continue;g[w][x.score>=.9?"firme":x.score>=.8?"prob":"dub"]++}}
  filas.push(["Concordancia de loci de los visores OCR",Object.keys(loci.loci).length+" loci situados en la página impresa · Krohn: "+g["krohn-1912"].firme+" firmes, "+g["krohn-1912"].prob+" probables, "+g["krohn-1912"].dub+" dudosos · Rose: "+g["rose-1899"].firme+" firmes, "+g["rose-1899"].prob+" probables, "+g["rose-1899"].dub+" dudosos.","Grado por semejanza de trigramas sobre el OCR; sincroniza los tres visores del Scriptorium.","scriptorium.html"]);}
 if(tab?.tablas){const c={};for(const t of tab.tablas)c[t.edicion]=(c[t.edicion]||0)+1;
  filas.push(["Tablas de los libros",tab.tablas.length+" tablas ("+Object.entries(c).map(([k,v])=>k+": "+v).join(", ")+"), "+n(tab.tablas.reduce((a,t)=>a+t.filas.length,0))+" filas.","Transcripción automática desde los PDF publicados; ante duda manda la página del PDF.","tablas-explicativas.html"]);}
 const tabla=el("table",{class:"audit-estado-tabla"},el("thead",{},el("tr",{},el("th",{text:"Instrumento"}),el("th",{text:"Estado"}),el("th",{text:"Alcance y límite"}))));
 const tb=el("tbody");for(const [a,b,c,u] of filas)tb.append(el("tr",{},el("td",{},el("a",{href:u,text:a})),el("td",{text:b}),el("td",{text:c})));
 tabla.append(tb);host.append(el("div",{style:"overflow-x:auto"},tabla));
 const st=document.createElement("style");st.textContent=".audit-estado{margin:28px 0}.audit-estado-tabla{border-collapse:collapse;width:100%;font-size:14px}.audit-estado-tabla th,.audit-estado-tabla td{border-bottom:1px solid rgba(127,127,127,.35);padding:8px 10px;text-align:left;vertical-align:top}.audit-estado-tabla td:last-child{opacity:.8;font-size:13px}";document.head.append(st);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",pintar,{once:true});else pintar();
})();
