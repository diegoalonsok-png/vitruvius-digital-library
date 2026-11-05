/* Chicago Manual of Style, 18.ª ed. (2024), sistema de notas y bibliografía, adaptado al castellano.
   - Primer autor invertido; los demás en orden normal, unidos con «y».
   - Libros: Autor. Título en cursiva. Responsabilidad (Editado por…, Traducido por…). Editorial, año. DOI.
   - Artículos: Autor. «Título». Revista volumen (año): páginas. DOI.
   - DOI siempre como https://doi.org/…; el ISBN no forma parte de la cita (CMOS) y se muestra aparte.
   - La 18.ª edición permite omitir el lugar de edición; se conserva cuando ya consta (impresos antiguos). */
(()=>{
"use strict";
const trim=s=>String(s??"").trim().replace(/[.\s]+$/,"");
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const ANCIENT=[[/^vitru(vius|ve|v|vio)$/i,"Vitruvio"],[/^cetius faventinus$/i,"Cetio Faventino"]];
const ROLE=[
 [/^(?:edici[oó]n,? traducci[oó]n y comentario|ed\., trad\. y com\.?)$/i,"Editado, traducido y comentado por"],
 [/^(?:ed\.? y trad\.?|edici[oó]n y traducci[oó]n)$/i,"Editado y traducido por"],
 [/^(?:eds?\.|edici[oó]n|editor(?:es)?)$/i,"Editado por"],
 [/^(?:trads?\.|traducci[oó]n|traductor(?:es)?)$/i,"Traducido por"],
 [/^dir\.$/i,"Dirigido por"],[/^introd\.$/i,"Introducción de"],
 [/^(?:com\.|comentarios?(?: e ilustraciones)?)$/i,"Comentario de"]];
const normalName=n=>{const t=String(n).trim().replace(/,\s*$/,"");const m=t.match(/^([^,]+),\s*(.+)$/);return m&&!/\b(y|and|et al)\b/.test(m[2])?m[2]+" "+m[1]:t};
function split(raw){
 let name=raw.trim(),role="",m=name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
 if(m){name=m[1];role=m[2]}
 else if((m=name.match(/^(.+?,\s*[^,]+),\s*(.+)$/))&&ROLE.some(([re])=>re.test(m[2].trim()))){name=m[1];role=m[2]}
 return {name,role};
}
function responsibilities(parts){
 const groups=new Map(),items=parts.map(split);
 // «Vitruve; Callebat; Gros; Jacquemard (edición…)»: la función declarada al final vale para los nombres previos.
 for(let i=items.length-2;i>=0;i--)if(!items[i].role)items[i].role=items[i+1].role;
 for(const {name:n,role} of items){
  const name=n;
  const phrase=(ROLE.find(([re])=>re.test(role.trim()))||[null,role?role+":":"Con"])[1];
  const names=name.split(/\s+y\s+|\s*&\s*/).map(normalName);
  if(!groups.has(phrase))groups.set(phrase,[]);groups.get(phrase).push(...names);
 }
 const join=a=>a.length<2?a[0]:a.slice(0,-1).join(", ")+" y "+a.at(-1);
 return [...groups].map(([p,n])=>p+" "+join(n)).join(". ");
}
function authorPart(author){
 let a=trim(author);
 if(a.includes(";")){
  const [first,...rest]=a.split(";");let orig=trim(first);
  // Varios autores modernos separados por «;» y sin función declarada: autores conjuntos.
  if(!rest.some(x=>/\(|,\s*(?:eds?\.|trads?\.|com\.|dir\.|introd\.)/.test(x))){
   const names=[first.trim(),...rest.map(normalName)];return {author:names.length<3?names.join(", y "):names.slice(0,-1).join(", ")+" y "+names.at(-1),resp:""};
  }
  for(const [re,es] of ANCIENT)if(re.test(orig))orig=es;
  return {author:orig,resp:responsibilities(rest)};
 }
 a=a.replace(/\s*\((eds?)\.\)$/,", $1.");
 return {author:a,resp:""};
}
function article(r){return /art[ií]culo/i.test(r.type||"")||/journal|revista|latomus|arethusa|sustainability|frontiers/i.test(r.publisher||"")}
function parts(r){
 const {author,resp}=authorPart(r.author||"");
 const doi=r.doi?"https://doi.org/"+String(r.doi).replace(/^https?:\/\/doi\.org\//,""):"";
 if(article(r)){
  const m=String(r.publisher||"").match(/^(.*?)(?:\s+(\d+))?(?:\s*\((\d{4})\))?(?::\s*([\d–-]+))?$/);
  const journal=trim(m?.[1]||r.publisher||""),vol=m?.[2]||"",year=m?.[3]||r.year||"",pages=m?.[4]||r.pages_range||"";
  return {author,title:trim(r.title),quoted:true,container:journal,tail:(vol?" "+vol:"")+" ("+year+")"+(pages?": "+pages:""),doi};
 }
 return {author,title:trim(r.title),resp,publisher:[r.place,r.publisher].filter(Boolean).map(trim).join(": "),year:r.year,doi};
}
function bibliography(r,{html=false}={}){
 const p=parts(r),i=t=>html?"<em>"+esc(t)+"</em>":t,e=t=>html?esc(t):t;
 let s=e(trim(p.author))+". ";
 if(p.quoted)s+="«"+e(p.title)+"». "+i(p.container)+e(p.tail)+".";
 else s+=i(p.title)+". "+(p.resp?e(p.resp)+". ":"")+(p.publisher?e(p.publisher)+", ":"")+e(p.year||"s. f.")+".";
 if(p.doi)s+=" "+(html?'<a href="'+esc(p.doi)+'">'+esc(p.doi)+"</a>":p.doi)+".";
 return s;
}
window.Chicago18={bibliography,responsibilities,authorPart};
})();
