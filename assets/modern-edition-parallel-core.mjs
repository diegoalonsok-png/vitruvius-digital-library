/* The author's Latin and translations remain distinct from each historical OCR.
   Page correspondences are machine candidates; paragraphs are never truncated. */
import {CONCEPTS,findRanges,parseReference,fold,ROMAN} from './modern-edition-search.mjs';
const TRANSLATED = {
 symmetria:{es:['simetría','simetrías','proporción modular','conmensurabilidad','conmensurable'],fr:['symétrie','symétries','proportion modulaire','commensurabilité','commensurable']},
 decor:{es:['decoro','conveniencia','adecuación'],fr:['convenance','bienséance','décor']},
 firmitas:{es:['solidez','firmeza','estabilidad'],fr:['solidité','stabilité']},
 utilitas:{es:['utilidad','utilidades'],fr:['utilité','utilités']},
 venustas:{es:['belleza','bellezas'],fr:['beauté','beautés']},
 eurythmia:{es:['euritmia'],fr:['eurythmie']},
 ordinatio:{es:['ordenación'],fr:['ordonnance','ordonnancement']},
 dispositio:{es:['disposición','disposiciones'],fr:['disposition','dispositions']},
 distributio:{es:['distribución'],fr:['distribution']},
 proportio:{es:['proporción','proporciones'],fr:['proportion','proportions']},
 modulus:{es:['módulo','módulos'],fr:['module','modules']},
 architectura:{es:['arquitectura'],fr:['architecture']},
 aqua:{es:['agua','aguas','hidráulica'],fr:['eau','eaux','hydraulique']},
 machina:{es:['máquina','máquinas','mecánica'],fr:['machine','machines','mécanique']},
 theatrum:{es:['teatro','teatros'],fr:['théâtre','théâtres']},
 columna:{es:['columna','columnas'],fr:['colonne','colonnes']},
};
export function parallelTerms(query,mode='concept') {
 const key=fold(query),entry=mode==='concept'&&CONCEPTS.find(([lemma,aliases,forms])=>
  [lemma,...aliases,...forms,...Object.values(TRANSLATED[lemma]||{}).flat()].some(s=>fold(s)===key));
 return entry?{la:entry[2],es:[...(TRANSLATED[entry[0]]?.es||[query]),...entry[2]],fr:[...(TRANSLATED[entry[0]]?.fr||[query]),...entry[2]],lemma:entry[0]}:
  {la:[query],es:[query],fr:[query],lemma:null};
}
export function combineEditions(es,fr) {
 const french=new Map((fr?.passages||[]).map(p=>[p.locus,p]));
 return (es?.passages||[]).map(p=>({locus:p.locus,book:p.book,chapter:p.chapter,section:p.section,
  la:p.latin||'',es:p.translation||'',fr:french.get(p.locus)?.translation||''}));
}
export function pageReadings(map,rows,image) {
 const lookup=new Map(rows.map(p=>[p.locus,p]));
 return (map?.pages?.find(p=>p.image===image)?.loci||[]).flatMap(link=>{
  const row=lookup.get(link.locus);return row?[{...row,...link}]:[];
 });
}
export function locusLabel(value){
 const p=parseReference(value);if(!p)return value;
 if(p.chapter==='praef')return ROMAN[p.book]+', praef.'+(p.section?' '+p.section:'');
 return ROMAN[p.book]+(p.chapter?'.'+p.chapter:'')+(p.section?'.'+p.section:'');
}
export function createParallelSearch(rows,map){
 const links=new Map();
 for(const page of map?.pages||[])for(const link of page.loci||[]){
  if(!links.has(link.locus)||page.image===link.primaryPage)links.set(link.locus,{...link,page:link.primaryPage||page.image});
 }
 const inverted={la:new Map(),es:new Map(),fr:new Map()};
 rows.forEach((row,i)=>{for(const lang of Object.keys(inverted)){
  for(const token of new Set(fold(row[lang]).match(/\p{L}+/gu)||[])){
   if(!inverted[lang].has(token))inverted[lang].set(token,new Set());inverted[lang].get(token).add(i);
  }
 }});
 return function search(query,mode='concept',language='all'){
  const reference=parseReference(query),terms=parallelTerms(query,mode),languages=language==='all'?['la','es','fr']:[language];
  let candidates=new Set();
  if(reference)rows.forEach((row,i)=>{if(row.locus===reference.key||row.locus.startsWith(reference.key+'.'))candidates.add(i);});
  else for(const lang of languages)for(const term of mode==='words'?query.trim().split(/\s+/):terms[lang]||[]){
   const token=fold(term).match(/\p{L}+/u)?.[0];for(const i of inverted[lang]?.get(token)||[])candidates.add(i);
  }
  return [...candidates].sort((a,b)=>a-b).flatMap(i=>{
   const row=rows[i],link=links.get(row.locus);if(!link)return [];
   let matchedLang=languages[0],ranges=[];
   if(!reference){for(const lang of languages){
    const parts=mode==='words'?query.trim().split(/\s+/):terms[lang]||[query];
    if(mode==='words'&&parts.some(p=>!findRanges(row[lang],[p]).length))continue;
    const found=findRanges(row[lang],parts);if(found.length){matchedLang=lang;ranges=found;break;}
   }if(!ranges.length)return [];}
   return [{...row,...link,text:row[matchedLang],language:matchedLang,ranges,terms,reference:!!reference}];
  });
 };
}
/* Whole input is retained. The existing optional translator handles bounded
   pieces; the UI can report exact progress and retain completed pieces on error. */
export function translationPieces(text,limit=3200){
 const input=String(text||'').trim(),out=[];let at=0;
 while(at<input.length){let end=Math.min(input.length,at+limit);
  if(end<input.length){const stop=input.lastIndexOf(' ',end);if(stop>at+limit/2)end=stop;}
  out.push(input.slice(at,end));at=end;while(/\s/.test(input[at]||'')&&at<input.length)at++;
 }
 return out;
}
