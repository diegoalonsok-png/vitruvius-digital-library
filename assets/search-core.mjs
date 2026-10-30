// Shared by the worker, reader and regression checks.
export const roman=n=>['','I','II','III','IV','V','VI','VII','VIII','IX','X'][n]||String(n);
export const normalize=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').replace(/æ/gi,'ae').replace(/œ/gi,'oe').replace(/ſ/g,'s').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
export function tokens(text){return [...String(text).matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map(m=>({value:normalize(m[0]),raw:m[0],start:m.index,end:m.index+m[0].length}));}
export function parseLocus(value){
  const raw=String(value).trim().replace(/^(?:liber|libro|book)\s+/i,'').replace(/\s+(?:caput|capítulo|capitulo|chapter)\s+/i,'.').replace(/^(?:Vitr\.?\s*[,;]?\s*)?(?:De\s+arch(?:itectura)?\.?\s*)?/i,'').replace(/\s*[,·:]\s*/g,'.');
  const m=raw.match(/^(10|[1-9]|VIII|VII|III|II|IV|VI|IX|I|V|X)(?:\s*\.\s*(praef(?:atio)?\.?|\d{1,2})(?:\s*\.\s*(\d{1,3}))?)?\.?$/i);
  if(!m)return null;
  const book=/^\d+$/.test(m[1])?Number(m[1]):['','I','II','III','IV','V','VI','VII','VIII','IX','X'].indexOf(m[1].toUpperCase());
  const chapter=m[2]?/^praef/i.test(m[2])?'praef':Number(m[2]):null,section=m[3]?Number(m[3]):null;
  if(book<1||book>10||chapter===0||section===0)return null;return{book,chapter,section};
}
export function citation(p){return 'Vitr., De arch. '+roman(p.book)+'.'+(p.chapter==='praef'?'praef.':p.chapter)+(p.section==null?'':(p.chapter==='praef'?'':'.')+p.section+(p.section_end?'–'+p.section_end:''));}
export function findMatches(text,query,{prefix=false,phrase=false}={}){
  const ts=tokens(text),qs=tokens(query).map(t=>t.value);if(!qs.length)return[];const found=[];
  for(let i=0;i<=ts.length-qs.length;i++)if(prefix?ts[i].value.startsWith(qs[0]):qs.every((q,j)=>ts[i+j].value===q))found.push({start:ts[i].start,end:ts[i+qs.length-1].end,form:text.slice(ts[i].start,ts[i+qs.length-1].end)});
  if(phrase||prefix||qs.length===1)return found;
  return qs.every(q=>ts.some(t=>t.value===q))?ts.filter(t=>qs.includes(t.value)).map(t=>({start:t.start,end:t.end,form:t.raw})):[];
}
export function searchCorpus(datasets,m){
  const reference=parseLocus(m.query);
  if(m.kind==='locus'&&!reference&&!m.book)throw Error('Escribí un locus como III.1.2, un capítulo como VIII.1 o elegí un libro.');
  const filter=reference||{book:Number(m.book)||null,chapter:m.chapter||null,section:null};
  if(m.kind==='count'&&m.countMode==='prefix'&&tokens(m.query).length!==1)throw Error('Para contar por raíz, escribí una sola raíz, por ejemplo symmetr.');
  const results=[],counts=[],forms=new Map();let total=0;
  for(const data of datasets){let editionCount=0;const loci=new Set();
    for(const p of data.passages){
      if(filter.book&&p.book!==Number(filter.book))continue;
      if(filter.chapter!=null&&filter.chapter!==''&&String(p.chapter)!==String(filter.chapter))continue;
      if(filter.section&&(filter.section<p.section||filter.section>(p.section_end||p.section)))continue;
      const fields=reference||m.kind==='locus'?[['la',p.latin]]:[['la',p.latin],[data.language,p.translation]].filter(([lang])=>!m.language||m.language==='all'||lang===m.language);
      for(const[language,text]of fields){
        let matches=reference||m.kind==='locus'?[{start:0,end:0,form:''}]:findMatches(text,m.query,{prefix:m.kind==='count'&&m.countMode==='prefix',phrase:m.mode==='phrase'||m.kind==='count'});
        if(!matches.length)continue;if(m.kind!=='count')matches=matches.slice(0,1);
        for(const match of matches){const start=Math.max(0,match.start-100),end=Math.min(text.length,Math.max(start+440,match.end+100));editionCount++;total++;loci.add(p.locus);
          if(match.form)forms.set(match.form,(forms.get(match.form)||0)+1);
          results.push({edition:data.edition,locus:p.locus,book:p.book,chapter:p.chapter,section:p.section,section_end:p.section_end,language,latin:p.latin,translation:p.translation,text,snippet:(start?'…':'')+text.slice(start,end)+(end<text.length?'…':''),context_start:match.start-start+(start?1:0),context_length:match.end-match.start,form:match.form,page:p.pdf_pages?.[language==='la'?'latin':'translation']||null,occurrence:editionCount,source_paragraphs:p.source_paragraphs,score:0});
        }
      }
    }
    counts.push({edition:data.edition,total:editionCount,passages:loci.size});
  }
  results.sort((a,b)=>a.book-b.book||(a.chapter==='praef'?-1:Number(a.chapter))-(b.chapter==='praef'?-1:Number(b.chapter))||a.section-b.section||a.edition.localeCompare(b.edition)||a.language.localeCompare(b.language));
  return{results,countSummary:m.kind==='count'?{total,passages:counts.reduce((s,x)=>s+x.passages,0),pages:counts.reduce((s,x)=>s+x.passages,0),editions:counts.map(x=>({...x,pages:x.passages})),forms:[...forms].map(([form,count])=>({form,count})),mode:m.countMode||'exact'}:null,reference:Boolean(reference||m.kind==='locus')};
}
