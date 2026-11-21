/* Search only the two independent indexed editions. No facsimile text is used. */
export const EDITIONS=['krohn-1912','rose-1899'];
export const fold=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
export const tokens=s=>[...String(s??'').matchAll(/[\p{L}\p{M}]+/gu)].map(m=>({word:fold(m[0]),start:m.index,end:m.index+m[0].length}));
const romans=['I','II','III','IV','V','VI','VII','VIII','IX','X'];
export function parseLocus(value){
 const s=String(value??'').trim().replace(/^Vitr\.?\s*,?\s*(?:De\s*arch\.?\s*)?/i,'').replace(/^(?:liber|libro|book|livre)\s+/i,'');
 const m=s.match(/^(10|[1-9]|VIII|VII|III|II|IV|IX|VI|V|X|I)\s*[.:/,\s]\s*(praef(?:atio)?\.?|prefacio|pr[oó]logo|[0-9]+)(?:\s*[.:/,\s]\s*([0-9]+))?\.?$/i);
 if(!m)return null;const book=Number(m[1])||romans.indexOf(m[1].toUpperCase())+1;
 const chapter=/^\d+$/.test(m[2])?String(Number(m[2])):'praef';const section=m[3]?Number(m[3]):null;
 if(!book||chapter==='0'||section===0)return null;
 return{book,chapter,section,key:book+'.'+chapter+(section?'.'+section:'')};
}
export function labelLocus(locus){const p=parseLocus(locus);return p?('Vitr., De arch. '+romans[p.book-1]+'.'+p.chapter+'.'+(p.section??'')).replace(/\.$/,''):String(locus);}
export function validateEdition(doc,edition){
 if(!EDITIONS.includes(edition)||doc?.edition!==edition||doc?.schema!=='vdl-critical-edition-text-v1')throw Error('El índice no corresponde a '+edition+'.');
 const rows=doc.passages;
 if(!Array.isArray(rows)||rows.length!==731||new Set(rows.map(p=>p.locus)).size!==731||rows.some(p=>!parseLocus(p.locus)?.section||typeof p.latin!=='string'||!p.latin.trim()))throw Error('El índice '+edition+' no contiene los 731 loci latinos completos.');
 return doc;
}
function phraseSpans(ts,term){
 const wanted=tokens(term).map(t=>t.word),out=[];if(!wanted.length)return out;
 for(let i=0;i<=ts.length-wanted.length;i++)if(wanted.every((w,j)=>ts[i+j].word===w))out.push([ts[i].start,ts[i+wanted.length-1].end]);
 return out;
}
export function mergeSpans(spans){const out=[];for(const s of [...spans].sort((a,b)=>a[0]-b[0]||b[1]-a[1])){const last=out.at(-1);if(last&&s[0]<last[1])last[1]=Math.max(last[1],s[1]);else out.push([...s]);}return out;}
const stop=new Set(('de del los las el la un una unos unas en por para con y o sobre que como do da the of in on a an and or with for le les des du et dans sur un une l d').split(' '));
export function createConcordance(krohn,rose,{concepts=[],entries=[]}={}){
 validateEdition(krohn,EDITIONS[0]);validateEdition(rose,EDITIONS[1]);
 const loci=krohn.passages.map(p=>p.locus),roseMap=new Map(rose.passages.map(p=>[p.locus,p]));
 if(loci.some(l=>!roseMap.has(l)))throw Error('Los índices no comparten los mismos 731 loci.');
 const pairs=loci.map((locus,i)=>({locus,book:parseLocus(locus).book,passages:[krohn.passages[i],roseMap.get(locus)]}));
 const indexed=pairs.map(pair=>({...pair,texts:pair.passages.map(p=>({raw:p.latin,tokens:tokens(p.latin)}))}));
 const families=new Map(),aliases=new Map();
 const addAlias=(key,terms)=>{const k=fold(key).trim();if(!k)return;const old=aliases.get(k)||new Set();for(const t of terms)old.add(t);aliases.set(k,old);};
 for(const e of entries){const forms=[e.lemma,...(e.forms||[])].filter(Boolean);for(const f of forms){const k=fold(f);const old=families.get(k)||new Set();for(const a of forms)old.add(a);families.set(k,old);}
  for(const alias of [e.lemma,...(e.forms||[]),...(e.aliases||[]),...['es','en','fr'].flatMap(lang=>String(e[lang]||'').split(/[;,]/))])addAlias(alias,forms);
 }
 for(const c of concepts){const terms=(c.la||[]).filter(t=>typeof t==='string');for(const alias of [...terms,...Object.values(c.modern||{}).flat()])addAlias(alias,terms);}
 const formsFor=term=>[...new Set([term,...(families.get(fold(term))||[])])];
 function aliasFor(term){const key=fold(term);return aliases.get(key)||aliases.get(key.replace(/es$/,''))||aliases.get(key.replace(/s$/,''));}
 function expand(query,mode){
  const raw=String(query).trim().replace(/^['"“”]|['"“”]$/g,'');if(!raw)return[];
  if(mode==='phrase')return[[raw]];
  if(mode==='semantic'){const full=aliasFor(raw);if(full)return[[...new Set([raw,...[...full].flatMap(formsFor)])]];}
  const ts=tokens(raw);const groups=[];
  for(let i=0;i<ts.length;){let found=false;
   if(mode==='semantic')for(let n=Math.min(5,ts.length-i);n>=1;n--){const phrase=raw.slice(ts[i].start,ts[i+n-1].end);const aliases=aliasFor(phrase);if(aliases){groups.push([...new Set([phrase,...[...aliases].flatMap(formsFor)])]);i+=n;found=true;break;}}
   if(found)continue;const word=raw.slice(ts[i].start,ts[i].end);if(mode!=='semantic'||!stop.has(fold(word)))groups.push(formsFor(word));i++;
  }
  return groups;
 }
 // Word postings are built once, so repeated searches inspect only candidate loci.
 const postings=new Map();indexed.forEach((p,i)=>{for(const t of p.texts.flatMap(t=>t.tokens)){if(!postings.has(t.word))postings.set(t.word,new Set());postings.get(t.word).add(i);}});
 function search(query,{mode='semantic',book=''}={}){
  const locus=parseLocus(query);if(locus){const results=indexed.filter(p=>(!book||p.book===Number(book))&&(p.locus===locus.key||!locus.section&&p.locus.startsWith(locus.key+'.'))).map(p=>({...p,hits:[[],[]],score:0}));return{results,groups:[],locus:true};}
  const groups=expand(query,mode);if(!groups.length)return{results:[],groups,locus:false};
  let candidates=null;
  for(const group of groups){const set=new Set();for(const term of group){const first=tokens(term)[0]?.word;for(const i of postings.get(first)||[])set.add(i);}candidates=candidates===null?set:new Set([...candidates].filter(i=>set.has(i)));}
  const results=[];
  for(const i of candidates||[]){const p=indexed[i];if(book&&p.book!==Number(book))continue;
   const editions=p.texts.map(text=>{const grouped=groups.map(group=>mergeSpans(group.flatMap(term=>phraseSpans(text.tokens,term))));return grouped.every(h=>h.length)?mergeSpans(grouped.flat()):[];});
   if(!editions.some(h=>h.length))continue;
   const exact=p.texts.reduce((n,t)=>n+phraseSpans(t.tokens,query).length,0);results.push({...p,hits:editions,score:exact*100+editions.filter(h=>h.length).length*10+Math.min(9,editions.flat().length)});
  }
  results.sort((a,b)=>b.score-a.score||loci.indexOf(a.locus)-loci.indexOf(b.locus));return{results,groups,locus:false};
 }
 return{pairs,loci,search,expand};
}
export function excerpt(text,hits,max=370){
 const at=hits[0]?.[0]||0;let start=Math.max(0,at-Math.min(100,Math.floor(max*.3))),end=Math.min(text.length,Math.max(start+max,hits[0]?.[1]||0));
 if(start){while(start>0&&!/\s/.test(text[start-1]))start--;}
 // Never truncate a highlighted phrase or a word at the excerpt boundary.
 for(const [a,b] of hits)if(a<end&&b>end)end=b;while(end<text.length&&!/\s/.test(text[end]))end++;
 return{text:text.slice(start,end),hits:hits.filter(([a,b])=>a>=start&&b<=end).map(([a,b])=>[a-start,b-start]),before:start>0,after:end<text.length};
}
export function appendHighlighted(target,text,hits){
 const doc=target.ownerDocument;let pos=0;target.replaceChildren();for(const [a,b] of mergeSpans(hits)){if(a>pos)target.append(doc.createTextNode(text.slice(pos,a)));const mark=doc.createElement('mark');mark.className='cl-hit';mark.textContent=text.slice(a,b);target.append(mark);pos=b;}if(pos<text.length)target.append(doc.createTextNode(text.slice(pos)));
}
export function scrollFraction(reader){const max=reader.scrollHeight-reader.clientHeight;return max>0?reader.scrollTop/max:0;}
export function synchronizedOffset(reader,fraction){return Math.max(0,reader.scrollHeight-reader.clientHeight)*Math.max(0,Math.min(1,fraction));}
