// Shared by the worker, reader and regression checks.
export const roman=n=>['','I','II','III','IV','V','VI','VII','VIII','IX','X'][n]||String(n);
export const normalize=value=>String(value??'').normalize('NFD').replace(/\p{M}/gu,'').replace(/æ/gi,'ae').replace(/œ/gi,'oe').replace(/ſ/g,'s').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
export function tokens(text){return [...String(text).matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map(m=>({value:normalize(m[0]),raw:m[0],start:m.index,end:m.index+m[0].length}));}
export function parseLocus(value){
 let input=String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[–—−]/g,'-').replace(/\s+/g,' ').trim()
  .replace(/^(?:vitruvio|vitruvius|vitruve|vitr\.?)\s*[,;:]?\s*(?:de\s+arch(?:itectura)?\.?\s*)?/,'')
  .replace(/^de\s+arch(?:itectura)?\.?\s*/,'').trim();

 // Treat an appended author credit as context, not part of the locus.
 input=input.replace(/\s+(?:(?:de|del|por|by|of|di|da|do)\s+)?(?:marco\s+)?(?:marcus\s+)?vitruvi(?:o|us|i|e)(?:\s+pol(?:l)?io?n?)?\s*\.?$/i,'').trim();
 // Shorthand pref 1.2 refers to book I, preface, section 2.
 const shortPref=input.match(/^(?:pr|pref|praef|prefacio|preface|praefatio|prefazione|prologo|prologue|proemio|proemium|prooemium)\.?\s+(10|[1-9]|x|ix|viii|vii|vi|iv|iii|ii|i)\s*[.:/\s-]\s*(\d{1,3})\.?$/i);
 if(shortPref){
  const romanNumbers={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
  const book=romanNumbers[shortPref[1]]||Number(shortPref[1]),section=Number(shortPref[2]);
  if(book>=1&&book<=10&&section>=1&&section<=999)return{book,chapter:'praef',section};
 }

 if(!input)return null;
 const roman={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
 const ordinals={primer:1,primero:1,primera:1,first:1,primus:1,primo:1,premier:1,premiere:1,
 segundo:2,segunda:2,second:2,secondo:2,secundus:2,deuxieme:2,
 tercero:3,tercera:3,third:3,terzo:3,troisieme:3,
 cuarto:4,cuarta:4,fourth:4,quarto:4,quatrieme:4,
 quinto:5,quinta:5,fifth:5,quinto:5,cinquieme:5,
 sexto:6,sexta:6,sixth:6,sesto:6,sixieme:6,
 septimo:7,septima:7,seventh:7,settimo:7,septieme:7,
 octavo:8,octava:8,eighth:8,ottavo:8,huitieme:8,
 noveno:9,novena:9,ninth:9,nono:9,neuvieme:9,
 decimo:10,decima:10,tenth:10,dixieme:10};
 const bookValue=word=>{
  const w=String(word||'').toLowerCase(),n=/^\d{1,2}$/.test(w)?Number(w):roman[w]||ordinals[w]||null;
  return n>=1&&n<=10?n:null;
 };
 const sectionValue=word=>{
  const w=String(word||'').toLowerCase(),n=/^\d{1,3}$/.test(w)?Number(w):roman[w]||ordinals[w]||null;
  return n>=1&&n<=999?n:null;
 };
 const number='(?:10|[1-9]|viii|vii|vi|iv|iii|ii|ix|i|v|x|primero|primera|primer|segundo|segunda|tercero|tercera|cuarto|cuarta|quinto|quinta|sexto|sexta|septimo|septima|octavo|octava|noveno|novena|decimo|decima|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|premier|premiere|deuxieme|troisieme|quatrieme|cinquieme|sixieme|septieme|huitieme|neuvieme|dixieme|primo|secondo|terzo|quarto|quinto|sesto|settimo|ottavo|nono)';
 const bookWord='(?:libro|libros|liber|libri|lib\\.?|livre|livro|book|tomo|volumen|volume)';
 const preface='(?:pr|praef|praefatio|praefationes|pref|prefacio|prefacios|preface|prefaces|prefazione|prologo|prologue|prologus|proemio|proemium|prooemium)';
 const sep='(?:\\s*[.:/,-]\\s*|\\s+)';
 const full=new RegExp('^('+number+')'+sep+'('+preface+'|\\d{1,2})(?:'+sep+'(\\d{1,3}))?\\.?$','i');
 const stripped=input.replace(new RegExp('^'+bookWord+'\\s+','i'),'').trim();
 const compact=stripped.match(full);
 if(compact){
  const book=bookValue(compact[1]);
  if(!book)return null;
  const chapter=new RegExp('^'+preface+'$','i').test(compact[2])?'praef':Number(compact[2]);
  const section=compact[3]?Number(compact[3]):null;
  if(chapter===0||section===0)return null;
  return{book,chapter,section};
 }
 const prefPattern=new RegExp('\\b'+preface+'\\b','i'),prefMatch=input.match(prefPattern);
 const bookForward=input.match(new RegExp('\\b'+bookWord+'\\s*(?:n(?:umero|umber|[°º])?\\.?\\s*)?('+number+')\\b','i'));
 const bookReverse=input.match(new RegExp('\\b('+number+')\\s+'+bookWord+'\\b','i'));
 let book=bookValue(bookForward?.[1]||bookReverse?.[1]);
 if(prefMatch){
  const after=input.slice(prefMatch.index+prefMatch[0].length);
  const beforeBook=after.match(new RegExp('^\\s*('+number+')\\s+(?:de(?:l)?\\s+)?'+bookWord+'\\b','i'));
  const sectionWord=input.match(/\b(?:seccion|apartado|parrafo|paragraph|section|paragraphe|caput)\s*(?:n(?:[°º])?\.?\s*)?([ivx]+|\d{1,3}|primero|primera|first|premier)\b/i);
  let section=sectionValue(sectionWord?.[1]);
  if(book&&beforeBook&&!section)section=sectionValue(beforeBook[1]);
  if(book&&!section){
   const afterBook=after.match(new RegExp('(?:\\b'+bookWord+'\\b\\s*'+number+'\\b)\\s*[,;:.\\-]?\\s*([ivx]+|\\d{1,3})\\s*$','i'));
   if(afterBook)section=sectionValue(afterBook[1]);
  }
  if(!book){
   const direct=after.match(new RegExp('^\\s*('+number+')\\s*$','i'));
   if(direct)book=bookValue(direct[1]);
  }
  return book?{book,chapter:'praef',section}:null;
 }
 if(book){
  const chapterWord=input.match(/\b(?:capitulo|caput|chapitre|chapter|cap)\s*(?:n(?:[°º])?\.?\s*)?([ivx]+|\d{1,2})\b/i);
  const chapter=chapterWord?sectionValue(chapterWord[1]):null;
  const sectionWord=input.match(/\b(?:seccion|parrafo|section|paragraph)\s*(?:n(?:[°º])?\.?\s*)?(\d{1,3})\b/i);
  return{book,chapter,section:chapter?sectionValue(sectionWord?.[1]):null};
 }
 const bareBook=bookValue(stripped.replace(/[.]$/,''));
 return bareBook?{book:bareBook,chapter:null,section:null}:null;
}
export function citation(p){return 'Vitr., De arch. '+roman(p.book)+'.'+(p.chapter==='praef'?'praef.':p.chapter)+(p.section==null?'':(p.chapter==='praef'?'':'.')+p.section+(p.section_end?'–'+p.section_end:''));}
export function findMatches(text,query,{prefix=false,phrase=false}={}){
  const ts=tokens(text),qs=tokens(query).map(t=>t.value);if(!qs.length)return[];const found=[];
  for(let i=0;i<=ts.length-qs.length;i++)if(qs.every((q,j)=>prefix&&qs.length===1?ts[i+j].value.startsWith(q):ts[i+j].value===q))found.push({start:ts[i].start,end:ts[i+qs.length-1].end,form:text.slice(ts[i].start,ts[i+qs.length-1].end)});
  // A pasted quotation may come from a different historical recension.
  // If no exact quotation exists, identify a substantial contiguous span,
  // without presenting the result as a verbatim match.
  if(!found.length && !prefix && !phrase && qs.length>=6){
    const threshold=Math.max(5,Math.min(12,Math.ceil(qs.length*0.35)));
    let best=null;
    for(let i=0;i<ts.length;i++){
      for(let j=0;j<qs.length;j++){
        if(ts[i].value!==qs[j])continue;
        let n=0;while(i+n<ts.length && j+n<qs.length && ts[i+n].value===qs[j+n])n++;
        if(n>=threshold && (!best||n>best.n))best={start:ts[i].start,end:ts[i+n-1].end,form:text.slice(ts[i].start,ts[i+n-1].end),partial:true,n};
      }
    }
    if(best)return [best];
  }
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
        let matches=reference||m.kind==='locus'?[{start:0,end:0,form:''}]:findMatches(text,m.query,{prefix:Boolean(m.prefixFallback)||(m.kind==='count'&&m.countMode==='prefix'),phrase:m.mode==='phrase'||m.kind==='count'});
        if(!matches.length)continue;if(m.kind!=='count')matches=matches.slice(0,1);
        for(const match of matches){const start=Math.max(0,match.start-100),end=Math.min(text.length,Math.max(start+440,match.end+100));editionCount++;total++;loci.add(p.locus);
          if(match.form)forms.set(match.form,(forms.get(match.form)||0)+1);
          results.push({edition:data.edition,locus:p.locus,book:p.book,chapter:p.chapter,section:p.section,section_end:p.section_end,language,latin:p.latin,translation:p.translation,text,snippet:(start?'…':'')+text.slice(start,end)+(end<text.length?'…':''),context_start:match.start-start+(start?1:0),context_length:match.end-match.start,partial_match:Boolean(match.partial),form:match.form,page:p.pdf_pages?.[language==='la'?'latin':'translation']||null,occurrence:editionCount,source_paragraphs:p.source_paragraphs,score:0});
        }
      }
    }
    counts.push({edition:data.edition,total:editionCount,passages:loci.size});
  }
  results.sort((a,b)=>a.book-b.book||(a.chapter==='praef'?-1:Number(a.chapter))-(b.chapter==='praef'?-1:Number(b.chapter))||a.section-b.section||a.edition.localeCompare(b.edition)||a.language.localeCompare(b.language));
  return{results,countSummary:m.kind==='count'?{total,passages:counts.reduce((s,x)=>s+x.passages,0),pages:counts.reduce((s,x)=>s+x.passages,0),editions:counts.map(x=>({...x,pages:x.passages})),forms:[...forms].map(([form,count])=>({form,count})),mode:m.countMode||'exact'}:null,reference:Boolean(reference||m.kind==='locus')};
}
