import {normalize,tokens,findMatches,parseLocus,parseLocusRange,inLocusRange} from './search-core.mjs';
const indexes=new WeakMap();
function index(data){
 if(indexes.has(data))return indexes.get(data);
 const inverted=new Map();data.units.forEach((unit,i)=>{for(const term of new Set(tokens(unit.text).map(t=>t.value))){if(!inverted.has(term))inverted.set(term,[]);inverted.get(term).push(i);}});
 indexes.set(data,inverted);return inverted;
}
function candidates(data,query,prefix){
 const terms=tokens(query).map(t=>t.value),inv=index(data);if(!terms.length)return [];
 if(prefix)return [...new Set([...inv].filter(([word])=>word.startsWith(terms[0])).flatMap(([,ids])=>ids))];
 const lists=[...new Set(terms)].map(t=>inv.get(t)||[]).sort((a,b)=>a.length-b.length);
 if(!lists[0]?.length)return [];const sets=lists.slice(1).map(a=>new Set(a));return lists[0].filter(i=>sets.every(s=>s.has(i)));
}
export function searchFullText(datasets,m){
 const range=parseLocusRange(m.range);
 const results=[],counts=[],forms=new Map();let total=0;
 const ref=parseLocus(m.query),prefix=m.prefixFallback||(m.kind==='count'&&m.countMode==='prefix');
 if(prefix&&tokens(m.query).length!==1)throw Error('La búsqueda por raíz requiere una sola palabra.');
 for(const data of datasets){let editionCount=0;const unitsFound=new Set();
  for(const i of candidates(data,m.query,prefix)){
   const unit=data.units[i];
   if(!inLocusRange(unit,range))continue;
   if(m.content==='notes'&&unit.kind!=='note')continue;
   if(m.content==='commentary'&&!['commentary','paratext','table'].includes(unit.kind))continue;
   if(m.language&&m.language!=='all'&&m.language!==unit.language)continue;
   if(m.book&&unit.book!==Number(m.book))continue;
   if(m.chapter&&String(unit.chapter)!==String(m.chapter))continue;
   if(ref&&unit.locus!==[ref.book,ref.chapter,ref.section].join('.'))continue;
   const matches=findMatches(unit.text,m.query,{prefix,phrase:m.mode==='phrase'||m.kind==='count'});
   if(!matches.length)continue;
   for(const hit of m.kind==='count'?matches:matches.slice(0,1)){
    const start=Math.max(0,hit.start-120),end=Math.min(unit.text.length,Math.max(start+480,hit.end+100));
    editionCount++;total++;unitsFound.add(unit.id);forms.set(hit.form,(forms.get(hit.form)||0)+1);
    results.push({...unit,edition:data.edition,unit_id:unit.id,text:unit.text,snippet:(start?'…':'')+unit.text.slice(start,end)+(end<unit.text.length?'…':''),context_start:hit.start-start+(start?1:0),context_length:hit.end-hit.start,form:hit.form,occurrence:editionCount,source_kind:data.source?.method||'docx',fulltext:true});
   }
  }
  counts.push({edition:data.edition,total:editionCount,passages:unitsFound.size});
 }
 return {results,countSummary:m.kind==='count'?{total,passages:counts.reduce((a,x)=>a+x.passages,0),editions:counts,forms:[...forms].map(([form,count])=>({form,count})),mode:m.countMode||'exact',content:m.content||'full'}:null};
}
