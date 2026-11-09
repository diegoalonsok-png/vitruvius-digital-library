/* Concordancias documentales en hilo separado. Sin búsqueda aproximada ni loci inventados. */
'use strict';
function fold(s){return String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ').replace(/j/g,'i').replace(/v/g,'u')}
function offsets(text,term,all){
 const wanted=fold(term);if(!wanted)return[];
 let normalized='',map=[];
 for(let i=0;i<text.length;){
  const c=String.fromCodePoint(text.codePointAt(i)),f=fold(c);
  for(let j=0;j<f.length;j++){normalized+=f[j];map.push(i)}
  i+=c.length;
 }
 const isWord=c=>!!c&&/[\p{L}\p{N}]/u.test(c),hits=[];
 let at=normalized.indexOf(wanted);
 while(at>=0){
  const last=at+wanted.length-1;
  if(!isWord(normalized[at-1])&&!isWord(normalized[last+1])){
   const start=map[at],end=map[last];
   if(start!==undefined&&end!==undefined)hits.push([start,end+(text.codePointAt(end)>0xffff?2:1)]);
   if(!all&&hits.length>=80)break;
  }
  at=normalized.indexOf(wanted,at+Math.max(1,wanted.length));
 }
 return hits;
}
self.onmessage=e=>{
 const {id,passages,terms,allMatches}=e.data||{};
 try{
  if(!Array.isArray(passages)||!Array.isArray(terms)||passages.length>100000||terms.length>12)throw Error('Invalid worker batch');
  const results=passages.map(p=>{
   if(typeof p!=='string')return null;
   let first=null,term='',count=0;
   for(const q of terms){
    const hits=offsets(p,q,!!allMatches);count+=hits.length;
    if(hits.length&&(!first||hits[0][0]<first[0])){first=hits[0];term=q}
   }
   return first?{first,term,count}:null;
  });
  self.postMessage({id,results});
 }catch(err){self.postMessage({id,error:String(err?.message||err)})}
};