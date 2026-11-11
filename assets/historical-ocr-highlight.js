/* OCR evidence emphasis for historical paragraph results.
 * Highlights the recovered text, not image pixels or unverified IIIF coordinates.
 * All text is inserted as text nodes: OCR content is never interpreted as HTML.
 */
(function(global){"use strict";
function normalize(text){
 return String(text||"").normalize("NFKD").replace(/\p{M}/gu,"")
  .replace(/[Ææ]/g,"ae").replace(/[Œœ]/g,"oe").replace(/ſ/g,"s")
  .toLowerCase().replace(/j/g,"i").replace(/v/g,"u")
  .replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
function decorate(element,text,query){
 if(!element)return 0;
 const raw=String(text||""),terms=new Set(
  normalize(query).split(/\s+/).filter(word=>word.length>=3));
 element.replaceChildren();element.classList.add("vdl-ocr-highlight");
 element.setAttribute("data-ocr-evidence","highlighted-transcription");
 let cursor=0,marked=0;
 for(const match of raw.matchAll(/[\p{L}\p{N}ſÆæŒœ]+/gu)){
  const word=match[0],start=match.index,end=start+word.length;
  if(start>cursor)element.append(document.createTextNode(raw.slice(cursor,start)));
  const folded=normalize(word);
  const matches=folded.length>2&&[...terms].some(term=>
   folded===term||(term.length>=4&&folded.startsWith(term)));
  if(matches){
   const mark=document.createElement("mark");mark.className="vdl-ocr-term";
   mark.textContent=word;element.append(mark);marked++;
  }else element.append(document.createTextNode(word));
  cursor=end;
 }
 if(cursor<raw.length)element.append(document.createTextNode(raw.slice(cursor)));
 return marked;
}
global.VitruviaOCRHighlight={decorate,normalize,version:"20261111-rose-cesariano-yellow-v1"};
})(window);
