/* Vitruvia · evidence gate for featured articles and subject images.
 * Prevents loose search-provider hits from becoming the identity of the
 * original query (e.g. an aircraft for an industrial chemical).
 */
(()=>{
 'use strict';
 const normalize=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 const stop=new Set('de del el la los las un una unos unas en por para con y e o a al the of and for about from by to in le les des du sur der die das van von el'.split(' '));
 const category=new Set('foto fotos photo photos fotografia fotografias image images imagen imagenes pictures picture mapa mapas map maps libro libros books book historia history biografia biography wikipedia wikipedia commons'.split(' '));
 const tokens=s=>normalize(s).split(' ').filter(x=>x.length>=2&&!stop.has(x));
 const meaningful=s=>tokens(s).filter(x=>!category.has(x));
 function distance(a,b){
  if(a===b)return 0;
  if(Math.abs(a.length-b.length)>2)return 10;
  let previous=Array.from({length:b.length+1},(_,j)=>j),prev2=null;
  for(let i=1;i<=a.length;i++){
   const current=[i];
   for(let j=1;j<=b.length;j++){
    let v=Math.min(previous[j]+1,current[j-1]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
    if(prev2&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])
     v=Math.min(v,prev2[j-2]+1);
    current.push(v);
   }
   prev2=previous;previous=current;
  }
  return previous[b.length];
 }
 function match(query,title,{allowTypo=false}={}){
  const q=tokens(query), t=tokens(title);
  if(!q.length||!t.length)return {accepted:false,exact:0,matched:0,score:-100};
  if(normalize(query)===normalize(title))return {accepted:true,exact:q.length,matched:q.length,score:1000};
  const used=new Set();let matched=0,exact=0,typos=0;
  const distinct=[...new Set(q)];
  for(const word of distinct){
   let i=t.findIndex((v,n)=>v===word&&!used.has(n));
   if(i>=0){matched++;exact++;used.add(i);continue}
   if(!allowTypo||word.length<5)continue;
   let best=-1,bestDist=10;
   for(let j=0;j<t.length;j++){
    if(used.has(j)||t[j].length<4)continue;
    const d=distance(word,t[j]);
    if(d<bestDist){bestDist=d;best=j}
   }
   if(best>=0&&bestDist<=Math.min(2,Math.floor(word.length/4))){
    matched++;typos+=bestDist;used.add(best);
   }
  }
  const significant=meaningful(query);
  const relevant=significant.length?significant.every(w=>q.includes(w)&&
   t.some(v=>v===w||allowTypo&&w.length>=5&&distance(w,v)<=Math.min(2,Math.floor(w.length/4)))):exact===q.length;
  // Generic subject words alone ("map", "image", "history") are insufficient
  // to make a narrowly focused, unrelated title the main article.
  const accepted=relevant&&matched===distinct.length&&
   (significant.length>0||exact===distinct.length)&&
   (exact>0||allowTypo&&typos<=2);
  return {accepted,exact,matched,typos,score:exact*120+matched*70-typos*30-Math.max(0,t.length-q.length)*6};
 }
 function aligned(query,canonical,aliases=[]){
  if(match(query,canonical).accepted)return true;
  for(const alias of aliases||[])if(match(query,alias).accepted)return true;
  // Typographical tolerance is suitable for a resolved entity, never for a
  // loosely retrieved photo title.
  if(match(query,canonical,{allowTypo:true}).accepted)return true;
  return (aliases||[]).some(alias=>match(query,alias,{allowTypo:true}).accepted);
 }
 function verifiedResult(query,row){
  if(!row?.title)return false;
  return aligned(query,row.title,[...(row.aliases||[]),row.entityCanonical||'']);
 }
 window.VitruviaRelevance={normalize,tokens,meaningful,distance,match,aligned,verifiedResult,version:'1.0'};
})();
