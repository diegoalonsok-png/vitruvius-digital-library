import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('assets/historical-search.mjs'),html=read('concordancia-historica.html');
for(const edition of ['krohn-1912','rose-1899','perrault-1673']){
  assert(ui.includes("'"+edition+"'"),'Edition absent: '+edition);
  assert(html.includes('value="'+edition+'"'),'Selector absent: '+edition);
}
assert(ui.includes('requestSerial'),'Asynchronous edition search has no stale result guard');
assert(ui.includes('selectHistoricalEdition'),'Edition-specific facsimile selection missing');
assert(!ui.includes("card.querySelector('a')?.addEventListener"),'Duplicate result click handlers can produce stale or inconsistent pages');
assert(ui.includes('sin transcripción OCR'),'PDF pages without OCR must remain navigable');
const records=[
  ['krohn-1912',200,314],
  ['perrault-1673',300,371],
  ['rose-1899',200,null]
];
for(const [edition,min,pages] of records){
 const path='data/text/'+edition+'.json';
 if(!existsSync(new URL('../'+path,import.meta.url))){
   console.warn('PENDING OCR publication:',edition);
   continue;
 }
 const data=JSON.parse(read(path));
 assert(Array.isArray(data)&&data.length>=min,edition+': too few OCR pages');
 let prev=0;const set=new Set();let chars=0;
 for(const row of data){
   assert(Number.isInteger(row.page)&&row.page>prev,edition+': invalid page sequence');
   assert(!set.has(row.page),edition+': repeated page number');
   assert(typeof row.text==='string',edition+': missing OCR');
   if(pages)assert(row.page<=pages,edition+': page beyond PDF');
   chars+=row.text.length;set.add(row.page);prev=row.page;
 }
 assert(chars>100000,edition+': OCR unexpectedly sparse');
 console.log(edition+': '+data.length+' indexed pages, '+chars+' characters');
}
console.log('Historical editions audit passed; missing optional OCR sources listed above.');
