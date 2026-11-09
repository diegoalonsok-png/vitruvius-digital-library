/* Locus scholarly layer for lector-bilingue.html.
 * Adds, without touching the reader's own logic or layout:
 *  (1) <span lang="grc"> around Greek runs inside the Latin text, so browsers pick a polytonic-capable
 *      font, hyphenate correctly and expose each Greek word to the Lexicon;
 *  (2) a canonical reference block: Vitr. locus, CTS URN (Perseus Latin text, numbered sections only),
 *      Scaife link, and the library's own permanent locus URL;
 *  (3) TEI P5 export of the current locus with the Latin text and the three Kurilo translations.
 * No alignment, variant or reading is invented: everything comes from data/structured/*.json.
 */
(()=>{"use strict";
const GREEK=/[Ͱ-Ͽἀ-῿᾿-῾]/;
const GREEK_RUN=/[Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿̀-ͯ··’'᾽᾿῾\s,;.·]*[Ͱ-Ͽἀ-῿]|[Ͱ-Ͽἀ-῿]/g;
const EDITIONS={
 "recensio-es":{file:"data/structured/recensio-es.json",lang:"es",version:"V514",doi:"10.5281/zenodo.23884757",
  title:"Vitruvio. De architectura. Nueva recensio académica bilingüe",resp:"Diego A. Kurilo"},
 "recensio-fr":{file:"data/structured/recensio-fr.json",lang:"fr",version:"V554",doi:"10.5281/zenodo.23885110",
  title:"Vitruve. De architectura. Nouvelle recensio académique bilingue",resp:"Diego A. Kurilo"},
 "theory-en":{file:"data/structured/theory-en.json",lang:"en",version:"V297",doi:"10.5281/zenodo.23885404",
  title:"The Architect of Theory: Vitruvius and the Intellectual World of Roman Antiquity",resp:"Diego A. Kurilo"}
};
const CTS_BASE="urn:cts:latinLit:phi1056.phi001.perseus-lat1";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ui=(es,en,fr)=>document.documentElement.lang==="en"?en:document.documentElement.lang==="fr"?fr:es;
const cache={};
const load=id=>cache[id]||(cache[id]=fetch(EDITIONS[id].file).then(r=>{if(!r.ok)throw Error(EDITIONS[id].file);return r.json()}).catch(()=>null));

/* (1) Greek markup: walks text nodes only, so <mark> highlights set by the reader survive. */
function markGreek(root){
 if(!root||root.dataset.grcMarked==="1")return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>GREEK.test(n.nodeValue)&&!n.parentElement.closest('[lang="grc"]')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
 const nodes=[];let n;while((n=walker.nextNode()))nodes.push(n);
 for(const node of nodes){
  const text=node.nodeValue,frag=document.createDocumentFragment();let at=0,m;
  GREEK_RUN.lastIndex=0;
  while((m=GREEK_RUN.exec(text))){
   if(m.index>at)frag.append(text.slice(at,m.index));
   const span=document.createElement("span");span.lang="grc";span.className="grc";span.textContent=m[0].normalize("NFC");
   span.title=ui("Griego antiguo · doble clic: estudiar en Lexicon","Ancient Greek · double-click: open in Lexicon","Grec ancien · double-clic : ouvrir dans le Lexicon");
   frag.append(span);at=m.index+m[0].length;
  }
  if(at<text.length)frag.append(text.slice(at));
  node.replaceWith(frag);
 }
 root.dataset.grcMarked="1";
}
document.addEventListener("dblclick",e=>{
 const g=e.target.closest?.('span[lang="grc"]');if(!g)return;
 const sel=String(window.getSelection?.()||"").trim()||g.textContent.trim().split(/\s+/)[0];
 if(!sel)return;
 const u=new URL("vitruvia-lexicon.html",location.href);u.searchParams.set("q",sel.replace(/[,;.·]+$/,""));u.searchParams.set("mode","palabra");
 window.open(u.href,"_blank","noopener");
});

/* (2)+(3) Canonical reference and TEI export. */
function currentLocus(){
 const p=new URLSearchParams(location.search).get("locus");
 if(p&&/^\d+\.(?:praef|\d+)\.\d+$/.test(p))return p;
 const b=$("book")?.value,c=$("chapter")?.value,s=$("section")?.value;
 return b&&c&&s?[b,c,s].join("."):null;
}
function romanOf(n){return ["","I","II","III","IV","V","VI","VII","VIII","IX","X"][Number(n)]||String(n)}
function ctsUrn(locus){
 const [b,c,s]=locus.split(".");
 if(c==="praef")return null; // Perseus numbers prefaces differently; no URN is asserted for them.
 return CTS_BASE+":"+b+"."+c+"."+s;
}
function block(){
 let box=$("locus-canonical");
 if(box)return box;
 box=document.createElement("section");box.id="locus-canonical";box.className="edition-reference locus-canonical";
 box.setAttribute("aria-labelledby","locus-canonical-heading");
 const style=document.createElement("style");style.textContent=[
  ".locus-canonical{margin-top:14px}",
  ".locus-canonical code{font:13px/1.6 ui-monospace,Menlo,Consolas,monospace;overflow-wrap:anywhere;user-select:all}",
  ".locus-canonical .lc-row{margin:6px 0;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline}",
  ".locus-canonical .lc-label{font:600 11px/1.6 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;opacity:.75;min-width:9em}",
  ".locus-canonical button{font:inherit;font-size:13px;padding:4px 10px;border-radius:6px;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer}",
  ".locus-canonical button:hover{background:rgba(127,127,127,.15)}",
  ".locus-canonical .lc-note{font-size:12px;opacity:.78;margin:8px 0 0;line-height:1.55}",
  "span[lang=grc].grc{font-family:'Gentium Book Plus','Cardo','Brill','Noto Serif','Times New Roman',serif;font-feature-settings:'liga' 1}"
 ].join("\n");document.head.append(style);
 ($("edition-reference")||document.querySelector("main")).after(box);
 return box;
}
async function render(){
 const locus=currentLocus();if(!locus)return;
 const box=block();
 if(box.dataset.locus===locus&&box.childElementCount)return;
 box.dataset.locus=locus;
 const [b,c,s]=locus.split(".");
 const human="Vitr. "+romanOf(b)+"."+(c==="praef"?"praef.":c+".")+s;
 const urn=ctsUrn(locus);
 const edition=new URLSearchParams(location.search).get("edition")||"recensio-es";
 const permalink=new URL("lector-bilingue.html",location.href);permalink.searchParams.set("edition",edition);permalink.searchParams.set("locus",locus);
 box.innerHTML='<p class="eyebrow">'+ui("REFERENCIA CANÓNICA","CANONICAL REFERENCE","RÉFÉRENCE CANONIQUE")+'</p>'+
  '<h2 id="locus-canonical-heading">'+esc(human)+'</h2>'+
  '<div class="lc-row"><span class="lc-label">'+ui("Locus","Locus","Locus")+'</span><code id="lc-locus">'+esc(human)+'</code><button type="button" data-copy="lc-locus">'+ui("Copiar","Copy","Copier")+'</button></div>'+
  (urn?'<div class="lc-row"><span class="lc-label">URN CTS</span><code id="lc-urn">'+esc(urn)+'</code><button type="button" data-copy="lc-urn">'+ui("Copiar","Copy","Copier")+'</button> <a href="https://scaife.perseus.org/reader/'+encodeURIComponent(urn)+'/" target="_blank" rel="noopener noreferrer">'+ui("Texto latino en Scaife (Perseus) ↗","Latin text on Scaife (Perseus) ↗","Texte latin sur Scaife (Perseus) ↗")+'</a></div>'
      :'<div class="lc-row"><span class="lc-label">URN CTS</span><span class="lc-note" style="margin:0">'+ui("No se asigna URN a los prólogos: la numeración de Perseus difiere de la del tratado y no se afirma una equivalencia sin cotejo.","No URN is assigned to prefaces: Perseus numbers them differently and no equivalence is asserted without checking.","Aucune URN pour les préfaces : la numérotation de Perseus diffère et aucune équivalence n’est affirmée sans vérification.")+'</span></div>')+
  '<div class="lc-row"><span class="lc-label">'+ui("Enlace permanente","Permanent link","Lien permanent")+'</span><code id="lc-link">'+esc(permalink.href)+'</code><button type="button" data-copy="lc-link">'+ui("Copiar","Copy","Copier")+'</button></div>'+
  '<div class="lc-row"><span class="lc-label">TEI P5</span><button type="button" id="lc-tei">'+ui("Descargar este locus en XML-TEI (latín + ES · FR · EN)","Download this locus as XML-TEI (Latin + ES · FR · EN)","Télécharger ce locus en XML-TEI (latin + ES · FR · EN)")+'</button><span id="lc-tei-status" role="status"></span></div>'+
  '<p class="lc-note">'+ui("La URN identifica el pasaje en el texto latino de Perseus (Krohn 1912) y sirve para citar e interoperar con Scaife y Logeion; no sustituye la cita Chicago 18 de la edición de Kurilo, que figura arriba con su DOI. El TEI exportado reproduce los párrafos indexados de las tres ediciones tal como están en el repositorio, con su DOI y versión.",
     "The URN identifies the passage in the Perseus Latin text (Krohn 1912) for citation and interoperability with Scaife and Logeion; it does not replace the Chicago 18 citation of Kurilo's edition given above with its DOI. The exported TEI reproduces the indexed paragraphs of the three editions exactly as stored in the repository, with DOI and version.",
     "L’URN identifie le passage dans le texte latin de Perseus (Krohn 1912), pour la citation et l’interopérabilité avec Scaife et Logeion ; elle ne remplace pas la citation Chicago 18 de l’édition de Kurilo donnée ci-dessus avec son DOI. Le TEI exporté reproduit les paragraphes indexés des trois éditions tels qu’ils figurent dans le dépôt, avec DOI et version.")+'</p>';
 box.querySelectorAll("button[data-copy]").forEach(btn=>btn.addEventListener("click",()=>{
  const t=$(btn.dataset.copy)?.textContent||"";navigator.clipboard?.writeText(t).then(()=>{btn.textContent=ui("Copiado","Copied","Copié");setTimeout(()=>btn.textContent=ui("Copiar","Copy","Copier"),1400)});
 }));
 $("lc-tei").addEventListener("click",()=>exportTEI(locus,human,urn));
}
function teiText(s){return esc(String(s||"").replace(/­/g,"").normalize("NFC"))}
function withGreek(s){
 // Inside TEI, Greek runs become <foreign xml:lang="grc">…</foreign>.
 const raw=String(s||"").replace(/­/g,"").normalize("NFC");let out="",at=0,m;GREEK_RUN.lastIndex=0;
 while((m=GREEK_RUN.exec(raw))){out+=esc(raw.slice(at,m.index))+'<foreign xml:lang="grc">'+esc(m[0])+"</foreign>";at=m.index+m[0].length}
 return out+esc(raw.slice(at));
}
async function exportTEI(locus,human,urn){
 const status=$("lc-tei-status");status.textContent=ui("Preparando…","Preparing…","Préparation…");
 const data=await Promise.all(Object.keys(EDITIONS).map(id=>load(id).then(d=>[id,d])));
 const [b,c,s]=locus.split(".");
 const find=d=>d?.passages?.find(p=>p.locus===locus||(p.section_end&&p.book===Number(b)&&String(p.chapter)===c&&Number(s)>=p.section&&Number(s)<=p.section_end));
 const base=data.map(([id,d])=>find(d)).find(Boolean);
 if(!base){status.textContent=ui("Locus sin texto indexado.","Locus without indexed text.","Locus sans texte indexé.");return}
 const today=new Date().toISOString().slice(0,10);
 const sources=data.map(([id,d])=>{const e=EDITIONS[id];return '      <bibl xml:id="'+id+'" xml:lang="'+e.lang+'"><author>'+esc(e.resp)+'</author>, <title>'+esc(e.title)+'</title>. Buenos Aires: Sophia Lux Ediciones Académicas, 2026. '+esc(e.version)+'. <idno type="DOI">'+esc(e.doi)+'</idno>'+(d?.source?.sha256?'. <idno type="sha256">'+esc(d.source.sha256)+'</idno>':'')+'</bibl>'}).join("\n");
 const translations=data.map(([id,d])=>{const p=find(d);const e=EDITIONS[id];if(!p?.translation)return "";
  return '      <div type="translation" xml:lang="'+e.lang+'" source="#'+id+'" n="'+esc(locus)+'">\n        <p>'+withGreek(p.translation)+'</p>'+(p.scope_note?'\n        <note type="scope">'+teiText(p.scope_note)+'</note>':'')+'\n      </div>'}).filter(Boolean).join("\n");
 const xml='<?xml version="1.0" encoding="UTF-8"?>\n<TEI xmlns="http://www.tei-c.org/ns/1.0">\n  <teiHeader>\n    <fileDesc>\n      <titleStmt>\n        <title>Vitruvius, De architectura '+esc(locus)+' — Latin text and translations (ES · FR · EN)</title>\n        <editor>Diego A. Kurilo</editor>\n      </titleStmt>\n      <publicationStmt>\n        <publisher>Vitruvius Digital Library · Sophia Lux Ediciones Académicas</publisher>\n        <date when="'+today+'"/>\n        <idno type="DOI">10.5281/zenodo.23868911</idno>\n        <idno type="URL">'+esc(new URL("lector-bilingue.html?locus="+locus,location.href).href)+'</idno>\n        <availability><p>Latin base text: public domain (Krohn 1912 as working base). Translations and apparatus © 2026 Diego A. Kurilo; academic citation permitted with attribution and DOI.</p></availability>\n      </publicationStmt>\n      <sourceDesc>\n'+sources+'\n      </sourceDesc>\n    </fileDesc>\n    <encodingDesc><p>Passage exported from the structured indexes of the three editions (data/structured/*.json). Paragraph boundaries follow the numbered paragraphs of the author\'s DOCX; this is not a new collation of the manuscripts.'+(urn?' Canonical reference: '+esc(urn)+'.':'')+'</p></encodingDesc>\n  </teiHeader>\n  <text>\n    <body>\n      <div type="edition" xml:lang="la" n="'+esc(locus)+'"'+(urn?' corresp="'+esc(urn)+'"':'')+'>\n        <head>'+esc(human)+'</head>\n        <p>'+withGreek(base.latin)+'</p>\n      </div>\n'+translations+'\n    </body>\n  </text>\n</TEI>\n';
 const blob=new Blob([xml],{type:"application/tei+xml;charset=utf-8"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="vitruvius-"+locus.replace(/\./g,"_")+"-tei.xml";document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(a.href),4000);
 status.textContent=ui("Descargado.","Downloaded.","Téléchargé.");
}
function tick(){
 const latin=$("latin-text");if(latin)markGreek(latin);
 for(const el of document.querySelectorAll("#other-translations .scholarly-text, #translation-text"))markGreek(el);
 render();
}
const start=()=>{
 const ref=$("passage-ref");if(!ref){setTimeout(start,300);return}
 new MutationObserver(()=>tick()).observe(ref,{childList:true,characterData:true,subtree:true});
 // The reader resets innerHTML on each render; the marker flag lives on the element, so clear it when content changes.
 const reset=new MutationObserver(ms=>{for(const m of ms)if(m.type==="childList"&&m.target.dataset)delete m.target.dataset.grcMarked;setTimeout(tick,0)});
 for(const id of ["latin-text","translation-text"]){const el=$(id);if(el)reset.observe(el,{childList:true})}
 const other=$("other-translations");if(other)new MutationObserver(()=>other.querySelectorAll(".scholarly-text").forEach(markGreek)).observe(other,{childList:true,subtree:true});
 tick();
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
