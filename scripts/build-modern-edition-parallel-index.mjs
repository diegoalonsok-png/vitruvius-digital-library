import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ocrBlocksForLocus} from '../assets/krohn-locus-sync.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const source='data/structured/recensio-es.json',corpus=read(source);
for(const id of ['rose-1899','krohn-1912']){
 const root='data/r2/folios/'+id,ocr=read(root+'-ocr.json'),candidates=read(root+'-loci.json');
 const pages=ocr.pages.map(p=>({image:p.page,loci:[]}));
 for(const row of corpus.passages){
  const candidate=candidates.loci[row.locus];if(!candidate)continue;
  const blocks=ocrBlocksForLocus(ocr.pages,row.latin,candidate.page);
  const images=blocks.length?blocks.map(b=>b.page):[candidate.page];
  if(!images.includes(candidate.page))images.push(candidate.page);
  for(const image of [...new Set(images)].sort((a,b)=>a-b)){
   if(!pages[image-1])continue;
   pages[image-1].loci.push({locus:row.locus,primaryPage:candidate.page,
    status:candidate.status,images:[...new Set(images)].sort((a,b)=>a-b),
    continuation:image!==candidate.page,referenceCoverage:blocks.find(b=>b.page===image)?.referenceCoverage||null});
  }
 }
 const out={schema:'vdl-edition-parallel-1',edition:id,sha256_pdf:ocr.sha256_pdf,
  latin_source:source,latin_sha256:createHash('sha256').update(readFileSync(source)).digest('hex'),
  translations:{es:'data/structured/recensio-es.json',fr:'data/structured/recensio-fr.json'},
  method:'Propuestas por trigramas OCR del mismo PDF; se incluyen continuaciones cuando hay anclas textuales coherentes en la página contigua. Se muestran los loci editoriales completos como contexto, no una transcripción diplomática del impreso.',pages};
 writeFileSync(root+'-parallel.json',JSON.stringify(out,null,1)+'\n');
 console.log(id,pages.filter(p=>p.loci.length).length+' páginas con lectura editorial',new Set(pages.flatMap(p=>p.loci.map(x=>x.locus))).size+' loci',pages.reduce((n,p)=>n+p.loci.filter(x=>x.continuation).length,0)+' continuaciones');
}
