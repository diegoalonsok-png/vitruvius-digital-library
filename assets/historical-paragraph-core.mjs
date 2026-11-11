/* OCR-derived paragraph *candidates*, not certified historical paragraph boundaries.
   Source text and source page sequence remain untouched. */
export function fold(input) {
 return String(input ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
  .replace(/ſ/g,"s").replace(/[Ææ]/g,"ae").replace(/[Œœ]/g,"oe")
  .toLocaleLowerCase().replace(/j/g,"i").replace(/v/g,"u")
  .replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
}
export function terms(query) {
 return [...new Set(fold(query).split(" ").filter(t=>t.length>=3))];
}
function splitLong(raw,from,to,maxLength) {
 const segments=[];
 let start=from;
 while(start<to) {
  let end=Math.min(to,start+maxLength);
  if(end<to) {
   const fragment=raw.slice(start,end);
   const separators=[fragment.lastIndexOf(". "),fragment.lastIndexOf("; "),fragment.lastIndexOf("\n"),fragment.lastIndexOf(" ")];
   const viable=separators.filter(i=>i>maxLength*0.5);
   if(viable.length)end=start+Math.max(...viable)+1;
  }
  if(end<=start)break;
  let left=start,right=end;
  while(left<right && /\s/.test(raw[left]))left++;
  while(right>left && /\s/.test(raw[right-1]))right--;
  if(right>left)segments.push({startOffset:left,endOffset:right,text:raw.slice(left,right),cutByLength:end<to});
  start=end;
 }
 return segments;
}
export function segmentOcrPage(source,page,maxLength=1350) {
 if(!source||!Number.isInteger(Number(page?.page))||Number(page.page)<1)throw Error("Invalid source page");
 const raw=String(page.text??"");if(!raw.trim())return [];
 const blocks=[];const regex=/\S[\s\S]*?(?=\n[ \t]*\n|$)/g;
 for(const m of raw.matchAll(regex)) {
  const rawStart=m.index;
  const chunks=splitLong(raw,rawStart,rawStart+m[0].length,maxLength);
  blocks.push(...chunks);
 }
 return blocks.map((part,i)=>({
  id:source+":p"+page.page+":s"+(i+1),
  source,page:Number(page.page),sequence:i+1,
  startOffset:part.startOffset,endOffset:part.endOffset,
  text:part.text,
  status:"ocr_unverified",
  segmentation:part.cutByLength?"approximate_length_window":"ocr_blank_line_block",
  locus:null,
  manuscriptWitness:null
 }));
}
export function buildParagraphCandidates(source,pages) {
 if(!Array.isArray(pages))throw Error("OCR pages must be an array");
 const all=[];
 for(const page of pages)all.push(...segmentOcrPage(source,page));
 return all;
}
export function searchParagraphCandidates(rows,query,limit=45) {
 const tokens=terms(query);if(!tokens.length||!Array.isArray(rows))return [];
 const docs=rows.map(r=>{const list=fold(r.text).split(" ").filter(Boolean),freq=new Map();
  for(const word of list)freq.set(word,(freq.get(word)||0)+1);
  return {r,list,freq,normalized:list.join(" ")};
 });
 const N=docs.length||1,avg=docs.reduce((n,d)=>n+d.list.length,0)/N||1;
 const df=new Map(tokens.map(t=>[t,docs.reduce((n,d)=>n+(d.freq.has(t)?1:0),0)]));
 const phrase=fold(query);
 const output=[];
 for(const d of docs) {
  let score=0,covered=0;
  for(const t of tokens) {
   const f=d.freq.get(t)||0;if(!f)continue;covered++;
   const idf=Math.log(1+(N-(df.get(t)||0)+0.5)/((df.get(t)||0)+0.5));
   score+=idf*(f*2.2)/(f+1.2*(0.25+0.75*d.list.length/avg));
  }
  if(!covered)continue;
  if(tokens.length>1&&d.normalized.includes(phrase))score+=5;
  score*=0.55+0.45*covered/tokens.length;
  output.push({...d.r,score,matchedTerms:covered});
 }
 return output.sort((a,b)=>b.score-a.score||a.page-b.page).slice(0,Math.max(1,limit));
}
