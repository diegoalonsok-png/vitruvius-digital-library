import {normalize,tokens} from './search-core.mjs';
function distance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}return row[b.length];}
/* Variantes ortográficas habituales en manuscritos e impresos (e/ae/oe, ci/ti, michi/mihi, y/i, ph/f…). */
export function spellingVariants(word){
 const q=normalize(String(word).trim());if(!q)return[];
 const rules=[[/ae/g,'e'],[/oe/g,'e'],[/e/g,'ae'],[/ci(?=[aeiou])/g,'ti'],[/ti(?=[aeiou])/g,'ci'],[/michi/g,'mihi'],[/nichil/g,'nihil'],[/y/g,'i'],[/ph/g,'f'],[/f/g,'ph'],[/th/g,'t'],[/ch/g,'c'],[/c(?=[aou])/g,'ch'],[/(.)\1/g,'$1'],[/^h/,''],[/^(?=[aeiou])/,'h'],[/mpn/g,'mn'],[/mn/g,'mpn'],[/quu/g,'cu'],[/cu(?=[aeiou])/g,'quu']];
 const out=new Set();
 for(const [re,to] of rules){const v=q.replace(re,to);if(v!==q)out.add(v)}
 return [...out];
}
// Suggestions are shown to the reader; exact search and frequency counts are never rewritten.
export function lexicalSuggestions(query,entries){
 const q=normalize(String(query).trim());if(tokens(query).length!==1||q.length<4)return[];
 const forms=[...new Set(entries.flatMap(e=>[e.lemma,...(e.forms||[])]))];if(forms.some(f=>normalize(f)===q))return[];
 const byNorm=new Map(forms.map(f=>[normalize(f),f]));
 const ortho=spellingVariants(q).map(v=>byNorm.get(v)).filter(Boolean);
 if(ortho.length)return [...new Set(ortho)].slice(0,3);
 if(q.length<5)return[];
 const threshold=q.length>=8?2:1;
 return forms.map(form=>({form,d:distance(q,normalize(form))})).filter(x=>x.d>0&&x.d<=threshold).sort((a,b)=>a.d-b.d||a.form.length-b.form.length).slice(0,3).map(x=>x.form);
}
export function lexicalForms(query,entries){
 const q=normalize(String(query).trim());if(tokens(query).length!==1)return[];
 const entry=entries.find(e=>[e.lemma,...(e.forms||[])].some(f=>normalize(f)===q));return entry?[...new Set([entry.lemma,...(entry.forms||[])])]:[];
}
