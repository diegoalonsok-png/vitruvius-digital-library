import {equivalentTerms} from './parallel-highlights.mjs?v=20261114-logos-sources-v7';
const fold=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/ς/g,'σ').replace(/v/g,'u').replace(/j/g,'i');
const tokens=s=>[...String(s??'').matchAll(/[\p{L}\p{M}]+/gu)].map(m=>({word:fold(m[0]),a:m.index,b:m.index+m[0].length}));
const key=s=>tokens(s).map(t=>t.word).join(' ');
// Conventional name equivalents; the Greek inflection is resolved by the
// existing corpus lexicon before this table is consulted.
const names=[
 {grc:['Ἀπόλλων'],la:['Apollo'],es:['Apolo'],en:['Apollo'],fr:['Apollon']},
 {grc:['Ζεύς'],la:['Iuppiter','Jupiter'],es:['Zeus'],en:['Zeus'],fr:['Zeus']},
 {grc:['Ἀθηνᾶ','Ἀθήνη'],es:['Atenea'],en:['Athena','Athene'],fr:['Athéna']},
 {grc:['Ὀδυσσεύς'],es:['Odiseo','Ulises'],en:['Odysseus','Ulysses'],fr:['Ulysse']}
];
export function equivalentCandidates({word,lemmas=[],sourceLanguage,targetLanguage,entries=[],concepts=[]}){
 const inputs=[word,...lemmas].filter(Boolean),wanted=new Set(inputs.map(key)),found=new Set(inputs);
 if(sourceLanguage==='la')for(const q of inputs)for(const t of equivalentTerms(q,targetLanguage,inputs.join(' ')))found.add(t);
 for(const c of concepts){
  const source=[...(c[sourceLanguage]||[]),...(c.modern?.[sourceLanguage]||[])];
  if(source.some(x=>typeof x==='string'&&wanted.has(key(x))))for(const t of c[targetLanguage]||c.modern?.[targetLanguage]||[])if(typeof t==='string')found.add(t);
 }
 for(const c of names)if(inputs.some(q=>Object.values(c).flat().some(t=>key(t)===key(q))))for(const t of c[targetLanguage]||[])found.add(t);
 for(const e of entries){
  const gloss=targetLanguage==='en'?e.gloss:targetLanguage==='es'?e.es:'';
  for(const value of String(gloss||'').split(/[;,/]/)){
   const clean=value.replace(/\([^)]*\)/g,'').trim(),parts=tokens(clean);
   if(parts.length>=1&&parts.length<=4&&!/^(?:the|a|an|of|to|in|for|with|see|v\.)$/i.test(clean))found.add(clean);
  }
 }
 return [...found].filter(t=>tokens(t).length>0);
}
// Match words actually printed in the target. No position-based or fuzzy
// guesses: literary translations do not promise word-for-word alignment.
export function equivalentSpans(text,candidates){
 const source=String(text||''),words=tokens(source),spans=[];
 for(const value of candidates){const q=tokens(value).map(t=>t.word);if(!q.length)continue;
  for(let i=0;i<=words.length-q.length;i++)if(q.every((w,j)=>words[i+j].word===w))spans.push({a:words[i].a,b:words[i+q.length-1].b,text:source.slice(words[i].a,words[i+q.length-1].b)});
 }
 spans.sort((a,b)=>a.a-b.a||b.b-a.b);
 return spans.filter((s,i)=>!spans.slice(0,i).some(x=>x.a<=s.a&&x.b>=s.b));
}
