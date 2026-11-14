/* Scholarly facsimile reading alongside locus-aligned OCR, not a diplomatic transcription.
   Source credits and page-number uncertainty are displayed explicitly. */
(()=>{"use strict";
const mount=document.getElementById("coll-facsimile-readers");
if(!mount)return;
const E=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/v/g,"u").replace(/j/g,"i");
const editions=[
 {id:"rose-1899",label:"Rose · 1899",editor:"Valentin Rose · Teubner, Leipzig, 2.ª ed.",source:"University of Michigan · digitalización Google / Internet Archive",url:"https://archive.org/details/vitruviidearchi00pollgoog",viewer:"https://archive.org/embed/vitruviidearchi00pollgoog"},
 {id:"krohn-1912",label:"Krohn · 1912",editor:"F. Krohn · Teubner, Leipzig",source:"Ejemplar PDF referenciado por Vitruvius Digital Library; procedencia de la copia por confirmar",url:"documents/krohn-1912.pdf",viewer:"documents/krohn-1912.pdf#view=FitH"}
];
const meaningful=new Set(["symmetria","symmetriae","eurythmia","decor","dispositio","ordinatio","distributio","firmitas","utilitas","venustas","architectura","proportio","proportione","modulus","moduli","ratio","ratiocinatio","fabrica","aedificium","aedificia","templa","columna","columnae","scaena","atrium","peristylum","ichnographia","orthographia","scaenographia"]);
const blocks=new Map();let loci={},current="",selectedTerms=[];
const label=x=>{const p=String(x).split(".");const roman=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];return (roman[Number(p[0])]||p[0])+"."+p.slice(1).join(".")};
const style=E("style");style.textContent=`
#coll-facsimile-readers{margin:28px 0 34px;border-top:1px solid #505055;padding-top:18px}
.coll-facsimile-heading{font:400 24px/1.3 Georgia,serif;margin:0 0 8px}
.coll-facsimile-intro{font:12px/1.65 Arial,sans-serif;color:#bcbcc2;margin:0 0 16px;max-width:100ch}
.coll-facsimile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:14px}
.coll-facsimile-card{min-width:0;border:1px solid #45454a;border-radius:12px;background:#18181a;overflow:hidden}
.coll-facsimile-card header{padding:14px 16px;border-bottom:1px solid #343438}
.coll-facsimile-card h3{font:500 16px/1.45 Georgia,serif;margin:0 0 5px;color:#eee}
.coll-facsimile-card .citation{font:11px/1.6 Arial,sans-serif;color:#bfc0c4;margin:2px 0}
.coll-facsimile-controls{display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:10px 12px}
.coll-facsimile-controls :is(button,input,a){font:12px Arial,sans-serif;border:1px solid #68686c;background:#27272a;color:#f2f2f1;border-radius:6px;padding:8px;text-decoration:none}
.coll-facsimile-controls input[type=number]{width:72px}
.coll-facsimile-controls input[type=search]{flex:1;min-width:140px}
.coll-facsimile-controls button{cursor:pointer}
.coll-facsimile-frame{width:100%;height:clamp(410px,60vh,760px);border:0;background:#eeeeed;display:block}
.coll-facsimile-ocr{padding:12px 14px;border-top:1px solid #444449}
.coll-facsimile-ocr h4{font:500 12px Arial,sans-serif;color:#dedee1;margin:0 0 8px}
.coll-facsimile-ocr p{font:14px/1.7 Georgia,serif;color:#eee;margin:5px 0;white-space:pre-wrap;overflow-wrap:anywhere}
.coll-facsimile-ocr mark{background:#ffe55a!important;color:#242015!important;border-radius:2px;padding:1px}
.coll-facsimile-ocr .muted{font:11px/1.6 Arial,sans-serif;color:#c4c4c7}
.coll-facsimile-results{max-height:190px;overflow:auto;margin:6px 0;padding:0 4px;list-style:none}
.coll-facsimile-results button{display:block;width:100%;text-align:left;background:#252528;color:#ddd;border:1px solid #47474b;border-radius:5px;padding:6px;margin:3px 0;cursor:pointer}
.coll-facsimile-card a{color:#dcdce4}
@media(max-width:640px){.coll-facsimile-frame{height:52vh;min-height:380px}}
`;document.head.append(style);
mount.append(E("h2","coll-facsimile-heading","Facsímiles históricos · Rose y Krohn"));
mount.append(E("p","coll-facsimile-intro","Lectores complementarios a las traducciones ES · FR · EN y al texto latino de arriba. La página impresa, la imagen digital y el folio manuscrito son numeraciones distintas. El OCR sirve para localizar y resaltar voces: no constituye una variante crítica cotejada."));
const grid=E("div","coll-facsimile-grid");mount.append(grid);
function showMarked(target,text,query){
 target.replaceChildren();const tokens=[...String(text||"").matchAll(/[\p{L}\p{M}]+/gu)];
 let pos=0,count=0;const q=normalize(query).trim(),terms=q?new Set(q.split(/\s+/)):meaningful;
 for(const m of tokens){
  target.append(text.slice(pos,m.index));
  if(terms.has(normalize(m[0]))){target.append(E("mark",null,m[0]));count++}
  else target.append(document.createTextNode(m[0]));
  pos=m.index+m[0].length;
 }
 target.append(text.slice(pos));return count;
}
function update(id){
 const b=blocks.get(id),row=loci[current]?.[id];
 if(!b)return;
 b.ocr.replaceChildren();
 if(!row){b.page.textContent="Sin correspondencia OCR para este locus";return}
 b.page.textContent="Vitr. "+label(current)+" · página impresa "+row.page+(row.pageEnd?"–"+row.pageEnd:"")+" · alineación OCR "+(Number(row.score||0)*100).toFixed(1)+" %";
 const p=E("p");const marks=showMarked(p,String(row.text||""),b.query.value);b.ocr.append(p);
 b.note.textContent=marks+" coincidencias resaltadas en OCR indexado. El número de página impresa NO determina automáticamente la página digital del visor.";
}
function navigate(id,locus){current=locus;for(const ed of editions)update(ed.id);const input=document.getElementById("coll-locus");if(input)input.value=label(locus);const form=document.getElementById("coll-form");if(form)form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));}
function search(id){const b=blocks.get(id),q=normalize(b.query.value).trim();b.results.replaceChildren();update(id);if(!q)return;
 const terms=q.split(/\s+/).filter(Boolean);
 const hits=Object.entries(loci).filter(([l,w])=>terms.every(t=>normalize(w[id]?.text||"").includes(t))).slice(0,70);
 for(const [l,w] of hits){
  const btn=E("button",null,"Vitr. "+label(l)+" · p. "+w[id].page+" · "+String(w[id].text||"").slice(0,115)+"…");btn.type="button";
  btn.addEventListener("click",()=>navigate(id,l));b.results.append(btn);
 }
 if(!hits.length)b.results.append(E("li","muted","Sin coincidencias en la transcripción OCR indexada. No implica ausencia del término en el ejemplar impreso."));
}
for(const ed of editions){
 const card=E("article","coll-facsimile-card");const h=E("header");h.append(E("h3",null,ed.label),E("p","citation",ed.editor),E("p","citation",ed.source));card.append(h);
 const c=E("div","coll-facsimile-controls");const previous=E("button",null,"←");const next=E("button",null,"→");previous.type=next.type="button";
 const digital=E("input");digital.type="number";digital.min="1";digital.value="1";digital.setAttribute("aria-label","Número de página digital, no página impresa");
 const go=E("button",null,"Ir a imagen");go.type="button";
 const source=E("a",null,"Fuente original ↗");source.href=ed.url;source.target="_blank";source.rel="noopener noreferrer";
 c.append(previous,digital,next,go,source);card.append(c);
 const frame=E("iframe","coll-facsimile-frame");frame.title="Facsímil "+ed.label;frame.loading="lazy";frame.referrerPolicy="no-referrer";frame.src=ed.viewer;card.append(frame);
 function page(n){digital.value=String(Math.max(1,Math.floor(n)||1));if(ed.id==="krohn-1912")frame.src="documents/krohn-1912.pdf#page="+digital.value+"&view=FitH";else frame.src="https://archive.org/embed/vitruviidearchi00pollgoog/page/n"+digital.value+"/mode/1up";}
 previous.addEventListener("click",()=>page(Number(digital.value)-1));next.addEventListener("click",()=>page(Number(digital.value)+1));go.addEventListener("click",()=>page(Number(digital.value)));
 if(ed.id==="rose-1899"){const warn=E("p","coll-facsimile-intro","La navegación corresponde a páginas digitales del lector de Internet Archive; su disponibilidad depende del archivo externo.");warn.style.padding="0 13px";card.append(warn)}
 const o=E("div","coll-facsimile-ocr");const pageLabel=E("h4");o.append(pageLabel);
 const row=E("div","coll-facsimile-controls");const query=E("input");query.type="search";query.placeholder="Palabra o frase latina en OCR…";query.setAttribute("aria-label","Buscar en la transcripción OCR de "+ed.label);
 const find=E("button",null,"Buscar por loci");find.type="button";row.append(query,find);o.append(row);const results=E("ul","coll-facsimile-results");o.append(results);
 const ocr=E("div");o.append(ocr);const note=E("div","muted");o.append(note);card.append(o);grid.append(card);
 blocks.set(ed.id,{query,ocr,note,page:pageLabel,results});
 find.addEventListener("click",()=>search(ed.id));query.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();search(ed.id)}});
}
fetch("data/collation-loci.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(data=>{loci=data.loci||{};current=new URLSearchParams(location.search).get("locus")||"1.1.1";for(const ed of editions)update(ed.id)}).catch(e=>mount.append(E("p","coll-facsimile-intro","No se pudo cargar el índice OCR: "+e.message)));
window.addEventListener("vitruvius:collation-locus",e=>{current=e.detail?.locus||current;for(const ed of editions)update(ed.id)});
})();
