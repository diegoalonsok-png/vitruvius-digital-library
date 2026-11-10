/* Documentary PDF page alignment, not verified textual collation.
 * Edition: Fritz Krohn (Teubner, 1912), OCR from the site's registered source.
 * PDF digital pages are distinct from the book's printed page numbers.
 */
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"")
 .toLowerCase().replace(/v/g,"u").replace(/j/g,"i")
 .replace(/[^a-z]+/g," ").replace(/\s+/g," ").trim();
export function canonicalLocus(locus){
 const m=String(locus||"").trim().match(/^(?:([IVX]+)|(\d+))\.(praef|pr|(?:\d+))\.(\d+)$/i);
 if(!m)return null;
 const numeral=String(m[1]||"").toUpperCase();
 const romans=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
 const book=m[2]?Number(m[2]):romans.indexOf(numeral);
 const chapter=/^(praef|pr)$/i.test(m[3])?"praef":Number(m[3]),section=Number(m[4]);
 if(!Number.isInteger(book)||book<1||book>10||(!Number.isInteger(chapter)&&chapter!=="praef")||section<1)return null;
 return book+"."+chapter+"."+section;
}
export function ocrCandidate(index,locus){
 if(!index||index.schema!=="vitruvius-krohn-ocr-locus-candidates-v1")return null;
 const key=canonicalLocus(locus);
 const value=key&&index.loci?.[key];
 if(!value||!Number.isInteger(value.page)||value.page<1||value.status==="unresolved")return null;
 const strong=value.status==="strong_textual_candidate";
 const ambiguous=value.status==="ambiguous_textual_candidate";
 if(!strong&&!ambiguous)return null;
 return {locus:key,page:value.page,confidence:strong?"strong":"ambiguous",
  overlap:Number(value.overlap)||0,matched:Number(value.matched_trigrams)||0,
  runnerUpPage:Number(value.runner_up_page)||null};
}
/** Source-aware approximate OCR passage; sentence boundaries are NOT certified. */
export function ocrExcerptForLocus(pageText,referenceLatin){
 const source=String(pageText||"").split(/\s+/).filter(Boolean);
 const reference=fold(referenceLatin).split(" ").filter(x=>x.length>=4);
 if(!source.length||!reference.length)return null;
 const desired=new Set(reference);
 const normalized=source.map(w=>fold(w));
 const window=Math.min(source.length,Math.max(45,Math.ceil(reference.length*1.35)));
 let sum=0,best=-1,end=0;
 for(let i=0;i<source.length;i++){
  if(desired.has(normalized[i]))sum++;
  if(i>=window&&desired.has(normalized[i-window]))sum--;
  if(sum>best){best=sum;end=i}
 }
 if(best<3)return null;
 const start=Math.max(0,end-window+1-12),finish=Math.min(source.length,end+12);
 const found=new Set(normalized.slice(start,finish).filter(x=>desired.has(x)));
 const pct=Math.round(100*found.size/desired.size);
 return {text:source.slice(start,finish).join(" "),overlapPercent:pct,
  matchedWords:found.size,referenceWords:desired.size};
}
export function pdfPage(base,page){
 if(!Number.isInteger(page)||page<1||page>10000)return null;
 return String(base||"").split("#")[0]+"#page="+page+"&zoom=page-width";
}
