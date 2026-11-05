/* Consulta codicológica y académica compartida por los visores de códices y Vitruvia.
   Reconoce, sin depender de un formato único:
   · folio: «f. 45v», «fol. 45 verso», «folio 45v», «fº 45v», «45v», «45 r», «f45va» (columna a/b)
   · foliación sin cara: «f. 45» → 45r y 45v
   · intervalos: «ff. 12r–14v», «fols. 12-14», «12r-13v»
   · guardas: «fs. ii r», «guarda II v», «flyleaf iii r» y guardas finales «fse. v v»
   · imagen digital: «imagen 150», «img. 150», «image 150» (no equivale al folio)
   · signatura o sigla delante: «Harley MS 2767, f. 12r», «London, BL, Harl. 2767, fol. 12r», «H f. 45v»
   · cita académica: «Vitr. 1.1.1», «De arch. I, 1, 2», «lib. I, cap. 1, § 2», «Vitr. 1 praef. 1»
   El número de imagen digital nunca se presenta como folio. */
(()=>{
"use strict";
const ROMAN={i:1,v:5,x:10,l:50,c:100};
function roman(s){s=String(s||"").toLowerCase();if(!/^[ivxlc]+$/.test(s))return NaN;let t=0;for(let i=0;i<s.length;i++){const a=ROMAN[s[i]],b=ROMAN[s[i+1]]||0;t+=a<b?-a:a}return t}
const toRoman=n=>{const m=[[100,"c"],[90,"xc"],[50,"l"],[40,"xl"],[10,"x"],[9,"ix"],[5,"v"],[4,"iv"],[1,"i"]];let r="";for(const [v,s] of m)while(n>=v){r+=s;n-=v}return r};
const flat=s=>String(s??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[º°]/g,"o").replace(/[‐-―−]/g,"-");
const side=s=>{s=String(s||"").toLowerCase();return /^r(?:ecto|o)?$/.test(s)?"r":/^v(?:erso|o)?$/.test(s)?"v":""};
const num=s=>/^\d+$/.test(s)?Number(s):roman(s);

/* Clave canónica de una etiqueta de folio (IIIF o local):
   «f.1r», «fol. 001r», «1 recto» → «1r»; «fs.iir» → «fs:2r»; «fse.vv» → «fse:5v». */
function labelKey(label){
 const s=flat(label).replace(/\s+/g,"").replace(/^(?:folio|folium|fol|fo)\.?/,"f.");
 let m=s.match(/^(fse|fs|f)?\.?([0-9]+|[ivxlc]+)(recto|verso|ro|vo|r|v)([ab])?$/);
 if(m){const n=num(m[2]);if(Number.isFinite(n)&&n>0){const kind=m[1]==="fs"||m[1]==="fse"?m[1]:/^\d/.test(m[2])?"":"fs";return (kind?kind+":":"")+n+side(m[3])}}
 return s
}
/* Forma de presentación codicológica de una clave: «45v» → «f. 45v»; «fs:2r» → «f. iir (guarda)». */
function display(key,lang){
 const m=String(key||"").match(/^(?:(fse|fs):)?(\d+)([rv])$/);if(!m)return key||"";
 const g=lang==="en"?"flyleaf":lang==="fr"?"garde":"guarda",gf=lang==="en"?"back flyleaf":lang==="fr"?"garde finale":"guarda final";
 return m[1]?"f. "+toRoman(+m[2])+m[3]+" ("+(m[1]==="fse"?gf:g)+")":"f. "+Number(m[2])+m[3]
}

const FOL="(?:ff|fols?|folios?|folium|fo|f)\\.?";
const SIDE="(recto|verso|ro|vo|r|v)";
function parse(input){
 const raw=String(input||"").trim(),s=" "+flat(raw)+" ";
 const out={raw,image:null,folios:[],range:null,locus:null,locusLabel:"",rest:"",kind:"text",display:""};
 let rest=s;const cut=m=>{rest=rest.replace(m," ")};
 let m;
 // Imagen digital
 if((m=s.match(/[\s,;(](?:imagen|imagem|image|img|bild|immagine)\.?\s*(?:n[o.]?\s*)?(\d{1,4})(?=[\s,;).]|$)/))){out.image=Number(m[1]);cut(m[0])}
 // Intervalo de folios
 const reRange=new RegExp("[\\s,;(]"+FOL+"\\s*(\\d{1,3})\\s*"+SIDE+"?\\s*[ab]?(?:\\s*-\\s*|\\s+(?:a|al|to|bis|au)\\s+)(?:"+FOL+"\\s*)?(\\d{1,3})\\s*"+SIDE+"?\\s*[ab]?(?=[\\s,;).]|$)");
 const reBareRange=/[\s,;(](\d{1,3})\s*(recto|verso|r|v)\s*-\s*(\d{1,3})\s*(recto|verso|r|v)(?=[\s,;).]|$)/;
 if((m=s.match(reRange))||(m=s.match(reBareRange))){
  const a=+m[1],b=+m[3];if(a>0&&b>=a){out.range={from:a+(side(m[2])||"r"),to:b+(side(m[4])||"v")};cut(m[0])}
 }
 // Guardas (iniciales y finales)
 if(!out.range&&(m=s.match(/[\s,;(](fse|fs|guardas?\s+(?:finale?s?|posterior(?:es)?)|guardas?|flyleaf|fly-leaf|back\s+flyleaf|feuillets?\s+de\s+garde|gardes?)\.?\s*([ivxlc]+|\d{1,2})\s*(recto|verso|r|v)(?=[\s,;).]|$)/))){
  const back=/^fse|final|posterior|back/.test(m[1]);const n=num(m[2]);
  if(n>0){out.folios.push((back?"fse:":"fs:")+n+side(m[3]));cut(m[0])}
 }
 // Folio con prefijo
 if(!out.range&&!out.folios.length){
  const reF=new RegExp("[\\s,;(]"+FOL+"\\s*(\\d{1,3})\\s*"+SIDE+"?\\s*([ab])?(?=[\\s,;).]|$)");
  if((m=s.match(reF))){const n=+m[1],f=side(m[2]);if(n>0){out.folios=f?[n+f]:[n+"r",n+"v"];out.column=m[3]||"";cut(m[0])}}
 }
 // Folio sin prefijo, con cara obligatoria («45v», «45 verso»)
 if(!out.range&&!out.folios.length&&(m=s.match(/[\s,;(](\d{1,3})\s*(recto|verso|r|v)([ab])?(?=[\s,;).]|$)/))){out.folios=[+m[1]+side(m[2])];out.column=m[3]||"";cut(m[0])}
 // Cita académica de Vitruvio
 out.locus=locus(s);
 if(out.locus){out.locusLabel="Vitr. "+out.locus.replace(".praef.",", praef. ")}
 rest=rest.replace(/\b(?:vitr|vitruvio|vitruvius|vitruve|de\s+arch(?:itectura)?|lib(?:er|ro)?|cap(?:ut|itulo)?|praef(?:atio)?)\b\.?/g," ");
 if(out.locus)rest=rest.replace(/§/g," ").replace(/\b(?:\d{1,2}|[ivx]{1,4})\b/g," ");
 out.rest=rest.replace(/(^|\s)[.,;:()·§]+(?=\s|$)/g," ").replace(/[,;:()·]+/g," ").replace(/\s+/g," ").trim();
 out.kind=out.range?"range":out.folios.length?"folio":out.image?"image":out.locus?"locus":"text";
 out.display=out.range?"ff. "+out.range.from+"–"+out.range.to:out.folios.length===1?display(out.folios[0]):out.folios.length?"f. "+out.folios[0].replace(/r$/,"")+" (r/v)":out.image?"imagen digital "+out.image:out.locusLabel;
 if(out.column&&out.folios.length===1)out.display+=out.column;
 return out
}
/* «Vitr. 1.1.1», «I, 1, 2», «lib. I, cap. 1, § 2», «1 praef. 1», «1.praef.1» → «1.1.1» / «1.praef.1» */
function locus(q){
 const s=" "+flat(q)+" ";let m;
 if((m=s.match(/(?:^|[^\da-z])(x|ix|iv|v?i{1,3}|\d{1,2})\s*[.,:]?\s*praef(?:atio)?\.?\s*[.,:]?\s*(\d{1,2})(?!\d)/)))return num(m[1])+".praef."+Number(m[2]);
 if((m=s.match(/lib(?:er|ro|\.)?\s*(x|ix|iv|v?i{1,3}|\d{1,2})\s*[.,]?\s*cap(?:ut|itulo|\.)?\s*(\d{1,2}|[ivx]+)\s*[.,]?\s*(?:§|par(?:\.|agrafo)?|sect\.?)\s*(\d{1,2})/)))return num(m[1])+"."+num(m[2])+"."+Number(m[3]);
 if((m=s.match(/(?:^|[^\da-z])(x|ix|iv|v?i{1,3}|\d{1,2})\s*[.:,]\s*(\d{1,2}|[ivx]+)\s*[.:,]\s*(\d{1,2})(?![\d.])/)))return num(m[1])+"."+num(m[2])+"."+Number(m[3]);
 if((m=s.match(/(?:vitr|de\s+arch)\w*\.?\s+(x|ix|iv|v?i{1,3}|\d{1,2})\s+(\d{1,2})\s+(\d{1,2})(?!\d)/)))return num(m[1])+"."+Number(m[2])+"."+Number(m[3]);
 return null
}
/* Índices de etiquetas que satisfacen la consulta, conservando el orden del códice. */
function match(parsed,labels){
 const keys=labels.map(labelKey);
 if(parsed.range){const a=keys.indexOf(parsed.range.from),b=keys.lastIndexOf(parsed.range.to);
  if(a>=0&&b>=a)return keys.map((_,i)=>i).slice(a,b+1);
  const lo=parseInt(parsed.range.from),hi=parseInt(parsed.range.to);
  return keys.map((k,i)=>/^\d+[rv]$/.test(k)&&parseInt(k)>=lo&&parseInt(k)<=hi?i:-1).filter(i=>i>=0)}
 if(parsed.folios.length){const want=new Set(parsed.folios);return keys.map((k,i)=>want.has(k)?i:-1).filter(i=>i>=0)}
 return []
}
/* Puntuación de una signatura/sigla contra la parte no foliada de la consulta.
   Los números de signatura deben coincidir; las abreviaturas institucionales no exigen coincidencia. */
const CITY={londres:"london",londra:"london",paris:"paris",parigi:"paris",roma:"rome",rom:"rome",vaticano:"vatican",vaticana:"vatican",vatikan:"vatican",florencia:"florence",firenze:"florence",florenz:"florence",venecia:"venice",venezia:"venice",venedig:"venice",viena:"vienna",wien:"vienna",vienne:"vienna",munchen:"munich",munique:"munich",monaco:"munich",leiden:"leiden",leyde:"leiden",leida:"leiden",bruselas:"brussels",bruxelles:"brussels",brussel:"brussels",ginebra:"geneva",geneve:"geneva",genf:"geneva",ginevra:"geneva",oxford:"oxford",wolfenbuttel:"wolfenbuttel",escorial:"escorial",selestat:"selestat",schlettstadt:"selestat"};
const SOFT=new Set(["ms","mss","msc","cod","codex","codice","codices","manuscrito","manuscript","manuscrit","lat","gr","graec","latin","bl","bnf","bav","hab","bsb","bml","the","british","library","biblioteca","bibliotheque","bibliothek","de","del","la","le","di","of","et","y","and","plut","fonds","f","fol"]);
function shelfmarkScore(rest,hay){
 const tok=x=>flat(x).replace(/\bharl\b|\bharleian(?:us)?\b|\bharleiana?\b/g,"harley").split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(t=>CITY[t]||t);
 const q=tok(rest),h=tok(hay);if(!q.length)return 0;
 let hit=0,need=0;
 for(const t of q){const ok=h.some(x=>x===t||t.length>2&&x.startsWith(t));const soft=SOFT.has(t);
  if(/^\d+$/.test(t)&&!ok)return 0;
  if(!soft){need++;if(ok)hit++}}
 return need?hit/need:0
}
window.CodexQuery={parse,labelKey,display,locus,match,shelfmarkScore,roman,version:"1.0"};
})();
