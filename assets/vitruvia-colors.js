/* Color nomenclature: exact sRGB and approximate device-independent CMYK. */
(()=>{"use strict";
const palette=[
 ["Rojo","Red","Rouge","#FF0000","rojo red rouge"],
 ["Azul","Blue","Bleu","#0000FF","azul blue bleu"],
 ["Verde","Green","Vert","#008000","verde green vert"],
 ["Amarillo","Yellow","Jaune","#FFFF00","amarillo yellow jaune"],
 ["Naranja","Orange","Orange","#FFA500","naranja orange"],
 ["Violeta","Purple","Violet","#800080","violeta morado purple violet"],
 ["Rosa","Pink","Rose","#FFC0CB","rosa rosado pink rose"],
 ["Celeste","Sky blue","Bleu ciel","#87CEEB","celeste skyblue"],
 ["Negro","Black","Noir","#000000","negro black noir"],
 ["Blanco","White","Blanc","#FFFFFF","blanco white blanc"],
 ["Gris","Gray","Gris","#808080","gris gray grey"],
 ["Marrón","Brown","Brun","#A52A2A","marron brown brun"]
];
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().trim();
function codes(hex){
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 const [rf,gf,bf]=[r,g,b].map(x=>x/255),max=Math.max(rf,gf,bf),min=Math.min(rf,gf,bf),delta=max-min;
 let h=0,s=0,l=(max+min)/2;
 if(delta){s=delta/(1-Math.abs(2*l-1));if(max===rf)h=((gf-bf)/delta)%6;else if(max===gf)h=(bf-rf)/delta+2;else h=(rf-gf)/delta+4;h=(h*60+360)%360}
 const k=1-max,c=k===1?0:(1-rf-k)/(1-k),m=k===1?0:(1-gf-k)/(1-k),y=k===1?0:(1-bf-k)/(1-k);
 return{HEX:hex,RGB:[r,g,b].join(", "),HSL:Math.round(h)+"°, "+Math.round(s*100)+"%, "+Math.round(l*100)+"%",CMYK:[c,m,y,k].map(x=>Math.round(x*100)+"%").join(", ")};
}
function find(query){
 const q=fold(query);
 if(/^(?:colores|colours|colors|couleurs|paleta de colores|color palette)$/.test(q))return palette;
 const simple=q.replace(/^(?:color|colour|couleur)\s+/,"");
 const row=palette.find(c=>c[4].split(" ").some(alias=>fold(alias)===simple));
 if(row)return[row];
 const hex=q.match(/^#([a-f0-9]{6})$/i);
 return hex?[["Color personalizado","Custom color","Couleur personnalisée","#"+hex[1].toUpperCase(),""]]:[];
}
function render(parent,query){
 parent.querySelector(".vitruvia-colors-nomenclature")?.remove();
 const rows=find(query);if(!rows.length)return false;
 const lang=document.documentElement.lang||"es",i=lang==="en"?1:lang==="fr"?2:0;
 const section=document.createElement("section");section.className="vitruvia-colors-nomenclature";section.style.cssText="margin:0 0 16px";
 const h=document.createElement("h3");h.textContent=["Nomenclatura de colores · sRGB","Color nomenclature · sRGB","Nomenclature des couleurs · sRGB"][i];h.style.cssText="font:600 14px system-ui,sans-serif;margin:0 0 10px";section.append(h);
 const grid=document.createElement("div");grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px";
 for(const row of rows){
  const card=document.createElement("article");card.style.cssText="border:1px solid #8886;border-radius:8px;overflow:hidden";
  const sw=document.createElement("div");sw.style.cssText="height:64px;background:"+row[3]+";border-bottom:1px solid #8886";
  sw.setAttribute("role","img");sw.setAttribute("aria-label",row[i]+" "+row[3]);
  const body=document.createElement("div");body.style.cssText="padding:9px 10px;font:12px/1.5 system-ui,sans-serif";
  const strong=document.createElement("strong");strong.style.cssText="font-size:14px;display:block";strong.textContent=row[i];body.append(strong);
  for(const [key,val] of Object.entries(codes(row[3]))){const el=document.createElement("div");el.textContent=key+": "+val;body.append(el)}
  card.append(sw,body);grid.append(card);
 }
 section.append(grid);
 const note=document.createElement("p");note.textContent=["CMYK aproximado, sin perfil de imprenta. No hay equivalencias Pantone/RAL verificadas.","Approximate CMYK without printer profile. No verified Pantone/RAL matches.","CMJN approximatif sans profil d’impression. Aucune équivalence Pantone/RAL vérifiée."][i];
 note.style.cssText="font:11px/1.5 system-ui,sans-serif;opacity:.8;margin:8px 0 0";section.append(note);
 parent.prepend(section);return true;
}
window.VitruviaColors={find,codes,render};
})();