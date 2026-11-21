import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pdfReferenceAnchor} from '../assets/search-pdf-reference.mjs';

const output={schema:'vdl-search-pdf-references-1',method:'Unique exact 160-character passage prefix in the PDF text layer, ignoring layout whitespace, numeric footnote markers, punctuation, diacritics, ligatures and u/v, i/j; no fuzzy matching. Only supplements missing page references.',editions:{}};
const fold=text=>String(text??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/ſ/g,'s').replace(/v/g,'u').replace(/j/g,'i').replace(/[^\p{L}]/gu,'');
for(const id of ['recensio-es','recensio-fr','theory-en']){
 const structuredPath=`data/structured/${id}.json`,pdfTextPath=`data/text/${id}.json`;
 const structured=JSON.parse(readFileSync(structuredPath,'utf8')),raw=readFileSync(pdfTextPath);
 const pages=JSON.parse(raw).map(p=>({page:p.page,text:fold(p.text)}));
 const item={pdfTextPath,pdfTextSHA256:createHash('sha256').update(raw).digest('hex'),loci:{}};
 for(const p of structured.passages)for(const field of ['latin','translation']){
  if(p.pdf_pages?.[field])continue;
  const anchor=pdfReferenceAnchor(p[field]);if(anchor.length<80)continue;
  const found=pages.filter(page=>page.text.includes(anchor));
  if(found.length===1)(item.loci[p.locus]??={})[field]={page:found[0].page,anchor};
 }
 output.editions[id]=item;
 console.log(id+': '+Object.keys(item.loci).length+' loci with additional exact PDF references');
}
writeFileSync('data/search-pdf-references.json',JSON.stringify(output)+'\n');
