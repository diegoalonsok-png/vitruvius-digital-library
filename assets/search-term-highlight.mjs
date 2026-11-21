import {equivalentTerms} from './parallel-highlights.mjs?v=20261114-logos-sources-v7';

const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/ſ/g,'s').replace(/v/g,'u').replace(/j/g,'i');
const tokens=s=>[...String(s).matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map(m=>({word:fold(m[0]),start:m.index,end:m.index+m[0].length}));

// Render only source text, escaping it before adding marks. Root expansions
// may be supplied by the search that actually found the excerpt.
export function highlightSearchTerms(text,query,{roots=[],mode='words'}={}){
 const source=String(text??''),words=tokens(source),wanted=tokens(query).map(t=>t.word),ranges=[];
 if(!wanted.length)return escape(source);
 if(mode==='phrase'){
  for(let i=0;i<=words.length-wanted.length;i++)if(wanted.every((w,j)=>words[i+j].word===w))ranges.push([words[i].start,words[i+wanted.length-1].end]);
 }else{
  const forms=new Set([...wanted,...equivalentTerms(query,'la',source).flatMap(t=>tokens(t).map(x=>x.word))]);
  const prefixes=roots.map(fold).filter(Boolean);
  for(const t of words)if(forms.has(t.word)||prefixes.some(p=>t.word.startsWith(p)))ranges.push([t.start,t.end]);
 }
 let html='',cursor=0;
 for(const [start,end] of ranges){if(start<cursor)continue;html+=escape(source.slice(cursor,start))+'<mark class="search-hit search-query-underline">'+escape(source.slice(start,end))+'</mark>';cursor=end;}
 return html+escape(source.slice(cursor));
}
