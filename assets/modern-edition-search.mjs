/* Search the OCR of one identified scan. Locus links are textual candidates,
   never a claim of verified collation. No words are inferred from page numbers. */
export const CONCEPTS = [
 ['symmetria',['simetría','symmetry','proporción modular'],['symmetria','symmetriae','symmetriam','symmetrias','symmetriarum','symmetriis']],
 ['decor',['decoro','propriety','convenance'],['decor','decoris','decori','decore','decorum','decoribus']],
 ['firmitas',['solidez','firmeza','stability','solidité'],['firmitas','firmitatis','firmitate','firmitatem']],
 ['utilitas',['utilidad','utility','utilité'],['utilitas','utilitatis','utilitate','utilitatem']],
 ['venustas',['belleza','beauty','beauté'],['venustas','venustatis','venustate','venustatem']],
 ['eurythmia',['euritmia','eurythmy'],['eurythmia','eurythmiae','eurythmiam']],
 ['ordinatio',['ordenación','ordering'],['ordinatio','ordinationis','ordinatione','ordinationem']],
 ['dispositio',['disposición','arrangement'],['dispositio','dispositionis','dispositione','dispositionem']],
 ['distributio',['distribución','distribution'],['distributio','distributionis','distributione','distributionem']],
 ['proportio',['proporción','proportion'],['proportio','proportionis','proportione','proportionem']],
 ['modulus',['módulo','module'],['modulus','moduli','modulo','modulum','modulos','modulorum','modulis']],
 ['architectura',['arquitectura','architecture'],['architectura','architecturae','architecturam']],
 ['aqua',['agua','water','eau','hidráulica'],['aqua','aquae','aquam','aquarum','aquis','aquaeductus']],
 ['machina',['máquina','machine','mecánica'],['machina','machinae','machinam','machinas','machinarum','machinis']],
 ['theatrum',['teatro','theatre','theater'],['theatrum','theatri','theatro','theatra','theatris']],
 ['columna',['columna','column','colonne'],['columna','columnae','columnam','columnas','columnarum','columnis']],
];
export const ROMAN = ['','I','II','III','IV','V','VI','VII','VIII','IX','X'];
const foldChar = s => s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
export const fold = s => foldChar(String(s ?? '')).replace(/-\s*\n\s*/g,'').replace(/\s+/g,' ').trim();
export function mappedText(source) {
 const text=String(source??''); let normalized='', offsets=[];
 for(let i=0;i<text.length;){
  const split=text.slice(i).match(/^-\s*\n\s*/); if(split){i+=split[0].length;continue;}
  const c=String.fromCodePoint(text.codePointAt(i));let bit=foldChar(c).replace(/\s/gu,' ');
  if(bit===' '&&normalized.endsWith(' ')){i+=c.length;continue;}
  for(const ch of bit){normalized+=ch;offsets.push(i);}i+=c.length;
 }
 offsets.push(text.length);return {normalized,offsets};
}
export function conceptFor(query) {
 const q=fold(query);return CONCEPTS.find(([lemma,aliases,forms])=>[lemma,...aliases,...forms].some(x=>fold(x)===q));
}
export function termsFor(query,mode='concept') {
 return mode==='concept'&&conceptFor(query)?conceptFor(query)[2]:[String(query).trim()];
}
export function findRanges(text,terms) {
 const {normalized,offsets}=mappedText(text),ranges=[];
 for(const term of terms){const target=fold(term);if(!target)continue;let start=0;
  while(start<normalized.length){const at=normalized.indexOf(target,start);if(at<0)break;const end=at+target.length;
   if(!/\p{L}/u.test(normalized[at-1]||' ')&&!/\p{L}/u.test(normalized[end]||' '))ranges.push([offsets[at],offsets[end]]);
   start=end;
  }
 }
 ranges.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);const unique=[];
 for(const range of ranges)if(!unique.length||range[0]>=unique[unique.length-1][1])unique.push(range);
 return unique;
}
export function parseReference(value) {
 const q=String(value||'').trim().toLowerCase().replace(/^vitr\.?\s*/,'').replace(/^libro\s*/,'')
  .replace(/[,\s:]+/g,'.').replace(/\.+/g,'.').replace(/^\.+|\.+$/g,'').split('.')
  .map(part=>['prefacio','preface','praefatio','pref','pr'].includes(part)?'praef':part).join('.');
 const m=q.match(/^([ivx]+|\d{1,2})(?:\.(praef|\d{1,2})(?:\.(\d{1,3}))?)?$/);if(!m)return null;
 const book=/^\d+$/.test(m[1])?Number(m[1]):ROMAN.indexOf(m[1].toUpperCase());if(book<1||book>10)return null;
 if(m[2]&&m[2]!=='praef'&&Number(m[2])<1||m[3]&&Number(m[3])<1)return null;
 return {book,chapter:m[2]||null,section:m[3]?Number(m[3]):null,
  key:book+(m[2]?'.'+m[2]:'')+(m[3]?'.'+Number(m[3]):'')};
}
export function lociFor(index,reference) {
 if(!reference)return [];return Object.entries(index?.loci||{}).filter(([key,row])=>
  (key===reference.key||key.startsWith(reference.key+'.'))&&Number.isInteger(row.page)&&row.page>0)
  .map(([locus,row])=>({locus,...row}));
}
export function searchPages(pages,query,mode='concept') {
 const terms=termsFor(query,mode),allWords=mode==='words'?String(query).trim().split(/\s+/):null;
 return pages.flatMap(page=>{
  let ranges;
  if(allWords){const groups=allWords.map(w=>findRanges(page.text,[w]));if(groups.some(x=>!x.length))return [];ranges=findRanges(page.text,allWords);}
  else ranges=findRanges(page.text,terms);
  return ranges.length?[{page:page.page,text:page.text,ranges}]:[];
 });
}
export function wordBoxes(words,ranges) {
 return words.filter(w=>ranges.some(([a,b])=>w.start<b&&w.end>a)&&[w.x,w.y,w.w,w.h].every(Number.isFinite));
}
export const KEY_TERMS=CONCEPTS.slice(0,12).flatMap(c=>c[2]);
