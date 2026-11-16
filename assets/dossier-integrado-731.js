/* Indexed collation dossier (731 loci), evidence-aware. Do not replace manually verified apparatus. */
(()=>{"use strict";
const DATA="data/apparatus/dossier-integrado-731-loci-latin-traducciones.json";
const $=id=>document.getElementById(id);
const norm=s=>{s=String(s||"").trim().toLowerCase();const m=s.match(/^([ivx]+)\./);if(m){let n=0,p=0;for(const ch of [...m[1]].reverse()){const v={i:1,v:5,x:10}[ch];n+=v<p?-v:v;p=v}s=n+s.slice(m[1].length);}return s};
let data=null,byId=null,root=null,selected="";
function element(tag,content){const v=document.createElement(tag);if(content!==undefined)v.textContent=content;return v}
function item(label,content){const p=element("p");p.append(element("strong",label+": "),document.createTextNode(content||"Sin registro"));return p}
function render(locus){
 if(!data)return;
 const id=norm(locus||new URLSearchParams(location.search).get("locus")||$("vdl-dossier-locus")?.value||"1.1.1");
 const record=byId.get(id);const place=$("vdl-dossier-output");if(!record){place.textContent="Locus no encontrado en los 731 registros.";return}
 selected=id;place.replaceChildren();
 const title=element("h4","Locus "+id+" · "+record.verification);place.append(title);
 if(record.editorial_note){
  place.append(item("Lemma ] lectio",record.editorial_note.criticalLine));
  place.append(item("Quid mutatur",record.editorial_note.change));
  place.append(item("Fuente y cautela",record.editorial_note.decision));
 }else{
  place.append(item("Estado","Índice automático; no hay nota editorial individual comprobada para este locus. Las diferencias indicadas no son variantes manuscritas certificadas."));
 }
 for(const [name,entry] of [["Krohn",record.latin_comparison.krohn],["Rose",record.latin_comparison.rose],["Kurilo V554",record.latin_comparison.kurilo_v554],["Kurilo V297",record.latin_comparison.kurilo_v297]]){
  place.append(item(name,entry.available?(entry.normalized_identical?"Misma secuencia de palabras normalizada que V514":entry.edit_distance+" operaciones de edición léxica frente a V514"):"Locus fusionado/no alineado individualmente"));
 }
 if(record.candidate_differences.rose.length||record.candidate_differences.krohn.length){
 const details=element("details");const summary=element("summary","Diferencias candidatas de tokens (sin verificación del impreso)");details.append(summary);
 for(const [name,chunks] of [["Rose",record.candidate_differences.rose],["Krohn",record.candidate_differences.krohn]]){
 const p=element("p",name+": "+(chunks.length?chunks.map(x=>x.lemma+" ] "+x.lectio).join("; "):"ninguna"));details.append(p);
 }place.append(details);
 }
 const translations=element("div");translations.append(element("h4","Versiones castellana, francesa e inglesa (Kurilo)"));
 for(const [k,label] of [["es","Castellano V514"],["fr","Francés V554"],["en","Inglés V297"]]){
 const q=record.translations[k];
 translations.append(item(label,q.available?q.excerpt:q.merged_segment?"Integrado en el locus indexado "+q.aligned_locus+": "+q.excerpt:"No hay fragmento de traducción indexado en el locus"));
 }
 place.append(translations);
 if(record.translation_note){place.append(item("Comparación interpretativa",record.translation_note.analysis));if(record.translation_note.quality_flag&&record.translation_note.quality_flag!=="interpreted_from_index")place.append(item("Control de calidad",record.translation_note.quality_flag))}
 const nav=element("nav");nav.style.cssText="display:flex;flex-wrap:wrap;gap:12px;margin:12px 0";
 for(const [file,label] of [["apparatus-bude.html","Lector Budé"],["colacion.html","Colación"],["aparato-comparativo.html","Aparato comparativo"],["registro-ecdotico.html","Registro"]]){
 const a=element("a",label);a.href=file+"?locus="+encodeURIComponent(id)+(file.startsWith("apparatus-bude")?"&edition=v514&translation=es":"");nav.append(a)
 }place.append(nav);
}
function init(){
 const main=document.querySelector("main");
 if(!main||$("vdl-dossier-731"))return;
 const section=element("section");section.id="vdl-dossier-731";section.style.cssText="border:1px solid #8f8c8177;border-radius:8px;padding:14px 18px;margin:20px 0;font:13px/1.65 system-ui,sans-serif";
 section.append(element("h3","Collatio quinque editionum · 731 loci"));
 section.append(element("p","Dossier de localización y cotejo digital por locus; muestra el estado de lectura, divergencias candidatas y fragmentos de las tres traducciones. No declara cotejo autóptico de Rose, Krohn ni H."));
 const form=element("form");form.style.cssText="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0";
 const label=element("label","Locus ");label.htmlFor="vdl-dossier-locus";const field=element("input");field.id="vdl-dossier-locus";field.placeholder="1.2.2, 7.7.3, 10.11.7";field.value=norm(new URLSearchParams(location.search).get("locus")||"1.1.1");field.setAttribute("list","vdl-dossier-loci");field.style.cssText="font:inherit;min-width:160px;padding:7px";label.append(field);form.append(label);
 const go=element("button","Examinar locus");go.type="submit";go.style.cssText="font:inherit;padding:7px 12px";form.append(go);section.append(form);
 const datalist=element("datalist");datalist.id="vdl-dossier-loci";section.append(datalist);
 const status=element("p","Cargando dossier…");status.id="vdl-dossier-status";status.setAttribute("role","status");section.append(status);
 const output=element("div");output.id="vdl-dossier-output";output.setAttribute("aria-live","polite");section.append(output);
 const target=document.getElementById("bude-unit")||document.getElementById("bude-content");
 if(target)target.insertAdjacentElement("beforebegin",section);else main.append(section);
 form.addEventListener("submit",e=>{e.preventDefault();render(field.value)});
 window.addEventListener("vdl:comparative-locus-render",e=>{if(e.detail?.locus){field.value=e.detail.locus;render(e.detail.locus)}});
 window.addEventListener("popstate",()=>{field.value=new URLSearchParams(location.search).get("locus")||"1.1.1";render(field.value)});
 fetch(DATA).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(x=>{
 if(x.rows?.length!==731)throw Error("Loci incompletos");
 data=x;byId=new Map(x.rows.map(y=>[y.locus,y]));
 for(const row of x.rows){const opt=element("option");opt.value=row.locus;datalist.append(opt)}
 status.textContent="731 loci accesibles · 31 expedientes filológicos · 31 comentarios de traducción · 4 expedientes con comprobación impresa registrada. La colación digital es exhaustiva; la verificación filológica no.";
 render(field.value);
 }).catch(e=>{status.textContent="Error al leer el dossier: "+e.message});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();