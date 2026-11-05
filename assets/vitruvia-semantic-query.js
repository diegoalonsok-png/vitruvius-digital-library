/* Vitruvia: source-ranking support for broad searches. No generated facts. */
(()=>{
'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
const functionWords=new Set('a al ante bajo con contra de del desde durante el ella ellos en entre hacia hasta la las lo los o para por que quien se sin sobre su sus un una unos unas y e the an and at by for from in of on or to with les le des de la du et sur avec der die das und di da del il nella nel come che per degli'.split(' '));
const intentWords=new Set('origen origenes origenes evolucion explicacion explicaciones historia historico historica historicos historicas significado significados definicion definiciones etimologia etimologias concepto conceptos antecedentes introduccion datos informacion resumen biografia biografias quien quienes creador creadores inventor inventores invento inventada inventado quien hizo autores autor escritor nacido nacimiento vida obras obra trabajos famoso famosa principales principales'.split(' '));
const attributes=new Set('politico politica politicos politicas procer proceres argentino argentina argentinos argentinas arquitecto arquitecta arquitectos arquitectas cantante cantantes musico musica musicos escritor escritora escritores director directores cientifico cientifica cientificos creador ingeniero ingeniera actor actriz actores actrices invento famoso famosa famosos famosas'.split(' '));
const synonymGroups=[
 ['mapa','mapas','cartografia','cartografico','cartografica','mapamundi','mapamundis','cartography','maps'],
 ['domo','domos','cupula','cupulas','dome','domes'],
 ['geodesico','geodesica','geodesicos','geodesicas','geodesic'],
 ['arquitectura','arquitecturas','architectura','architecture'],
 ['antiguo','antigua','antiguos','antiguas','ancient','antique'],
 ['medioevo','medieval','edad media','middle ages'],
 ['proporciones','proporcion','proportio','proportion']
];
const synMap=new Map();for(const group of synonymGroups){for(const w of group)synMap.set(norm(w),group.map(norm))}
const tokens=s=>[...new Set(norm(s).split(' ').filter(w=>w.length>1&&!functionWords.has(w)))];
const stem=w=>w.length>=7&&/es$/.test(w)?w.slice(0,-2):w.length>=5&&/s$/.test(w)?w.slice(0,-1):w;
function dist(a,b){
 if(a===b)return 0;
 if(Math.abs(a.length-b.length)>2)return 3;
 const dp=Array.from({length:b.length+1},(_,j)=>j);
 for(let i=1;i<=a.length;i++){
  let prev=dp[0];dp[0]=i;
  for(let j=1;j<=b.length;j++){const saved=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+Number(a[i-1]!==b[j-1]));prev=saved;}
 }
 return dp[b.length];
}
const equivalent=(a,b)=>{
 if(a===b||stem(a)===stem(b))return true;
 if(a.length>=5&&b.length>=5&&(a.startsWith(b)||b.startsWith(a)))return true;
 if(synMap.get(a)?.includes(b))return true;
 if(a.length>=7&&b.length>=7&&dist(a,b)<=Math.min(2,Math.floor(Math.min(a.length,b.length)/4)))return true;
 return false;
};
function plan(query){
 const raw=norm(query),all=tokens(query);
 // A generic intent can precede the subject ("creator of", "history of").
 const stripped=raw.replace(/^(?:quien|quienes)\s+(?:fue|era|es|fueron|inventaron|creo|crearon)\s+/,'')
  .replace(/^(?:creador|inventor|inventora|autor|origenes|origen|historia|biografia|vida y obra|explicacion|informacion)\s+(?:de|del|de la|de los|sobre)\s+/,'').trim();
 let remainder=tokens(stripped);
 // Descriptive occupation and nationality adjectives are clues, not independent entities.
 const descriptor=w=>attributes.has(w)||([...attributes].some(a=>a.length>=7&&w.length>=7&&dist(a,w)<=2));
 const content=remainder.filter(w=>!descriptor(w)&&!intentWords.has(w));
 if(content.length>=2&&content.length<remainder.length)remainder=content;
 else if(content.length===1&&remainder.length>=3)remainder=content;
 const changed=stripped!==raw||remainder.length!==tokens(stripped).length;
 const subject=changed?(remainder.length?remainder.join(' '):stripped||raw):stripped||raw;
 const hints=tokens(raw).filter(w=>descriptor(w));
 const alternatives=[subject];
 if(remainder.some(w=>synMap.get(w)?.includes('cartografia'))){
  const historic=remainder.some(w=>synMap.get(w)?.includes('antiguo')||w==='origenes');
  alternatives.push(historic?'historia de la cartografia':'cartografia');
 }
 if(remainder.some(w=>synMap.get(w)?.includes('domo'))&&remainder.some(w=>synMap.get(w)?.includes('geodesico'))){
  alternatives.push('cupula geodesica');
 }
 const termList=remainder.filter(w=>!intentWords.has(w));
 return{subject,alternatives:[...new Set(alternatives)].filter(Boolean),terms:termList.length?termList:remainder,hints,raw};
}
function assess(query,record){
 const v=plan(query),name=norm(record?.title||record?.canonical||''),text=norm(record?.description||record?.excerpt||record?.snippet||'');
 const names=tokens(name),desc=tokens(name+' '+text);
 const terms=v.terms.filter(w=>!intentWords.has(w));
 if(!terms.length)return{accepted:false,score:0,titleHits:0,totalHits:0};
 const titleHits=terms.filter(t=>names.some(w=>equivalent(t,w))).length;
 const totalHits=terms.filter(t=>desc.some(w=>equivalent(t,w))).length;
 const exact=norm(name)===v.raw||norm(name)===v.subject||(record.aliases||[]).some(a=>norm(a)===v.raw);
 const roleGroups=[
  ['procer','heroe','libertador','militar','general','independencia','patriota'],
  ['politico','politica','gobernante','presidente','militar','libertador','revolucionario'],
  ['arquitecto','arquitecta','architect','architecture','arquitectura'],
  ['cantante','musico','musica','singer','vocalist','musician'],
  ['escritor','escritora','autor','author','writer','novelist'],
  ['cientifico','cientifica','scientist','researcher','investigador'],
  ['actor','actriz','actores','actrices','actor','actress']
 ];
 const descriptorHints=v.hints.filter(w=>roleGroups.some(g=>g.some(x=>equivalent(w,x))));
 const roleSatisfied=descriptorHints.length===0||descriptorHints.some(w=>{
  const group=roleGroups.find(g=>g.some(x=>equivalent(w,x)))||[w];
  return group.some(x=>desc.some(d=>equivalent(x,d)));
 });
 // At least two distinct thematic anchors for compound queries; single terms need one.
 const minimum=terms.length>1?Math.min(2,terms.length):1;
 const rareMatched=terms.some(t=>t.length>=9&&names.some(w=>equivalent(t,w)));
 const personDesc=/\b(architect|arquitect|scientist|cientific|artist|artista|inventor|musician|musico|singer|cantante|writer|escritor|engineer|ingenier|politic|politic|militar)\b/i.test(text);
 const partialPerson=terms.length===2&&titleHits>=1&&rareMatched&&personDesc;
 const accepted=roleSatisfied&&(exact||titleHits>=minimum||(titleHits>=1&&totalHits>=minimum)||partialPerson);
 const score=(exact?1500:0)+(roleSatisfied?0:-1800)+(descriptorHints.length&&roleSatisfied?250:0)+(titleHits*230)+(totalHits*60)-
  (terms.length-titleHits)*110;
 return{accepted,score,titleHits,totalHits,exact,subject:v.subject};
}
window.VitruviaSemanticQuery={norm,plan,assess,equivalent};
})();