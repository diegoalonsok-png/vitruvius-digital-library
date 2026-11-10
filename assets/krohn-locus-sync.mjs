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

/** Find coherent OCR blocks (often larger than a printed paragraph).
 * This operates on the EXISTING whole-page OCR. A paragraph can cross a PDF
 * page boundary; adjacent pages are included only when they carry substantial,
 * disjoint parts of the same Latin locus. OCR spelling and line breaks remain
 * untouched; this is a reading guide, not an edited Latin witness.
 */
export function ocrBlocksForLocus(pages,referenceLatin,candidatePage){
 if(!Array.isArray(pages)||!Number.isInteger(candidatePage)||candidatePage<1)return [];
 const sourceWords=text=>[...String(text||"").matchAll(/[A-Za-zÀ-ÿ]+/g)]
  .map(m=>({word:fold(m[0]),start:m.index,end:m.index+m[0].length}))
  .filter(w=>w.word.length>=2);
 const ref=sourceWords(referenceLatin),size=ref.length;
 if(size<5)return [];
 const referenceMap=new Map();
 for(let i=0;i<size-2;i++){
  const term=ref[i].word+" "+ref[i+1].word+" "+ref[i+2].word;
  const at=referenceMap.get(term)||[];at.push(i);referenceMap.set(term,at);
 }
 const available=new Map(pages.filter(p=>Number.isInteger(p?.page)).map(p=>[p.page,p]));
 const candidates=[];
 for(const pg of [candidatePage-1,candidatePage,candidatePage+1]){
  const page=available.get(pg);if(!page)continue;
  const text=String(page.text||"");const words=sourceWords(text);
  const anchors=[];
  for(let j=0;j<words.length-2;j++){
   const key=words[j].word+" "+words[j+1].word+" "+words[j+2].word;
   for(const i of referenceMap.get(key)||[])anchors.push({i,j});
  }
  if(anchors.length<4)continue;
  // Printed notes may repeat a phrase from another part of the locus.
  // Use one monotonically ordered sequence so OCR starts never follow ends.
  anchors.sort((a,b)=>a.i-b.i||a.j-b.j);
  const chainScores=anchors.map(()=>1),previous=anchors.map(()=>-1);
  for(let k=0;k<anchors.length;k++){
   for(let j=0;j<k;j++){
    const left=anchors[j],right=anchors[k];
    if(left.i>=right.i||left.j>=right.j)continue;
    if(chainScores[j]+1>chainScores[k]){
     chainScores[k]=chainScores[j]+1;previous[k]=j;
    }
   }
  }
  let best=0;
  for(let k=1;k<anchors.length;k++)if(chainScores[k]>chainScores[best])best=k;
  const coherent=[];
  for(let k=best;k>=0;k=previous[k]){coherent.push(anchors[k]);if(previous[k]<0)break}
  coherent.reverse();
  if(coherent.length<4)continue;
  const first=coherent[0],last=coherent[coherent.length-1];
  candidates.push({page:pg,text,words,anchors:coherent,minRef:first.i,maxRef:last.i,
   matches:coherent.length,primary:pg===candidatePage});
 }
 const primary=candidates.find(p=>p.primary);
 if(!primary)return [];
 // Adjacent OCR pages must provide evidence of a different part of the
 // reference paragraph (not a repeated note or a stray shared phrase).
 const included=candidates.filter(p=>p.primary||
  p.page===candidatePage-1&&p.minRef<primary.minRef-4&&p.maxRef<=primary.maxRef+4||
  p.page===candidatePage+1&&p.maxRef>primary.maxRef+4&&p.minRef>=primary.minRef-4
 ).sort((a,b)=>a.page-b.page);
 return included.map(p=>{
  const first=p.anchors[0],last=p.anchors[p.anchors.length-1];
  const contextualMargin=5;
  const start=Math.max(0,first.j-Math.min(contextualMargin,first.i)-contextualMargin);
  const end=Math.min(p.words.length,last.j+3+
   Math.min(contextualMargin,Math.max(0,size-3-last.i))+contextualMargin);
  const excerpt=p.text.slice(p.words[start]?.start||0,p.words[end-1]?.end||0).trim();
  const covered=new Set();
  for(const a of p.anchors){covered.add(a.i);covered.add(a.i+1);covered.add(a.i+2)}
  return {
   page:p.page,primary:p.primary,text:excerpt,matchedTrigrams:p.matches,
   firstReferenceToken:p.minRef,lastReferenceToken:Math.min(size-1,p.maxRef+2),
   referenceTokenCount:size,
   referenceCoverage:Math.round(100*covered.size/size)
  };
 });
}
