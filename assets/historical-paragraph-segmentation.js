/* Deterministic OCR segmentation: metadata navigation, NOT a critical text.
   Offset ranges always point to exact input page strings. */
(()=>{'use strict';
function words(text){return [...String(text||'').matchAll(/\S+/gu)].map(x=>({start:x.index,end:x.index+x[0].length,value:x[0]}));}
function buildPages(sourceId,pages){
 if(!Array.isArray(pages))throw Error('OCR pages must be an array');
 const out=[];
 for(const item of pages){
  const page=Number(item?.page),raw=String(item?.text||'');
  if(!Number.isInteger(page)||page<1||raw.trim().length<40)continue;
  const blocks=[];let start=0,match;const regex=/(?:\r?\n[ \t]*){2,}/g;
  while((match=regex.exec(raw))){if(match.index>start)blocks.push([start,match.index]);start=regex.lastIndex}
  if(start<raw.length)blocks.push([start,raw.length]);
  let sequence=0;
  for(const [from,to] of blocks){
   const original=raw.slice(from,to),tokens=words(original);
   if(tokens.length<6)continue;
   let cursor=0;
   while(cursor<tokens.length){
    let end=Math.min(cursor+150,tokens.length);
    if(end<tokens.length){
     // Favor actual punctuation; otherwise label it as a page window, not a paragraph.
     for(let p=end-1;p>=Math.min(cursor+95,end-1);p--){
      if(/[.;:!?][)”’»]*$/.test(tokens[p].value)){end=p+1;break}
     }
    }
    const first=tokens[cursor],last=tokens[end-1],offsetStart=from+first.start,offsetEnd=from+last.end;
    if(end-cursor>=6){
     const text=raw.slice(offsetStart,offsetEnd).replace(/\s+/g,' ').trim();
     if(text.length>=38)out.push({id:sourceId+':p'+page+':s'+(++sequence),sourceId,page,part:sequence,
      offsetStart,offsetEnd,text,segmentation:blocks.length>1&&tokens.length<=150?'ocr-block':'approximate-page-window',
      ocrStatus:'unreviewed',locusStatus:'not-aligned'});
    }
    cursor=end;
   }
  }
 }
 return out;
}
window.VitruviaOCRParagraphs={buildPages,version:'1.0'};
})();
