#!/usr/bin/env node
/* Index the existing OCR of Krohn, Rose and Cesariano at page/paragraph-window
   granularity. No OCR correction, locus inference, PDF editing or paid API.
   --audit-only: validate extraction without writing; --write: publish JSON.
*/
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const code=readFileSync(resolve(root,'assets/historical-paragraph-segmentation.js'),'utf8');
const context={window:{}};vm.runInNewContext(code,context,{filename:'historical-paragraph-segmentation.js'});
const buildPages=context.window.VitruviaOCRParagraphs.buildPages;
const sources=[
 {id:'krohn-1912',label:'F. Krohn, De architectura (1912)',url:'documents/krohn-1912.pdf'},
 {id:'rose-1899',label:'V. Rose, De architectura (1899)',url:'https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf'},
 {id:'cesariano-1521',label:'C. Cesariano, Di Lucio Vitruvio Pollione de architectura (1521)',url:'cesariano-1521.html'}
];
const summaries=[];
for(const source of sources){
 const input='data/text/'+source.id+'.json';
 const pages=JSON.parse(readFileSync(resolve(root,input),'utf8'));
 const entries=buildPages(source.id,pages),byPage=new Map(pages.map(p=>[Number(p.page),String(p.text||'')]));
 if(!entries.length)throw Error('No OCR paragraphs for '+source.id);
 const ids=new Set();
 for(const e of entries){
  const raw=byPage.get(e.page);if(!raw||e.offsetStart<0||e.offsetEnd>raw.length||
   raw.slice(e.offsetStart,e.offsetEnd).replace(/\s+/g,' ').trim()!==e.text)
   throw Error('Provenance offsets invalid: '+e.id);
  if(ids.has(e.id))throw Error('Duplicate paragraph ID: '+e.id);ids.add(e.id);
 }
 const sha256=createHash('sha256').update(readFileSync(resolve(root,input))).digest('hex');
 const result={schema:'vitruvius-historical-ocr-paragraphs-v1',sourceId:source.id,sourceLabel:source.label,
  sourceOCR:input,sourceSHA256:sha256,sourceViewer:source.url,
  warning:'OCR no cotejado; página digital, no locus de De architectura. Las divisiones largas pueden ser ventanas de página, no párrafos editoriales.',
  segmentationVersion:context.window.VitruviaOCRParagraphs.version,pages:pages.length,paragraphs:entries.length,entries};
 summaries.push({sourceId:source.id,pages:pages.length,paragraphs:entries.length,sourceSHA256:sha256});
 if(process.argv.includes('--write')){
  const out=resolve(root,'data/historical-paragraphs',source.id+'.json');mkdirSync(dirname(out),{recursive:true});
  writeFileSync(out,JSON.stringify(result)+'\n');console.log('Wrote '+out);
 }
}
console.log(JSON.stringify({mode:process.argv.includes('--write')?'write':'audit-only',sources:summaries},null,2));
