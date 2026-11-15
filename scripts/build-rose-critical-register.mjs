#!/usr/bin/env node
/* Systematic, source-line anchored import of Rose's public-domain apparatus.
 * Reproduces the editor's notes; never converts an indirect report into
 * manuscript autopsy or infers readings from OCR similarity.
 * node scripts/build-rose-critical-register.mjs --input /path/51812-h.htm
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
const args=process.argv.slice(2),arg=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const sourceUrl='https://www.gutenberg.org/files/51812/51812-h/51812-h.htm';
const input=arg('--input',null),output=arg('--out','data/apparatus/rose-1899-critical-register.json');
const raw=input?fs.readFileSync(input):Buffer.from(await(await fetch(sourceUrl)).arrayBuffer());
const sha=createHash('sha256').update(raw).digest('hex');
const dom=new JSDOM(raw.toString('utf8')),doc=dom.window.document;
const canon=JSON.parse(fs.readFileSync('data/structured/recensio-es.json','utf8')).passages.map(p=>p.locus);
const canonical=new Set(canon),locusMap=new Map(canon.map(locus=>[locus,{locus,anchors:[],entries:[]}]));
const entries=[],unassigned=[],pages=[],lineWarnings=[];
let book=0,chapter='praef',section=0,current=null;
const roman=s=>{let n=0,p=0;for(const c of s.split('').reverse()){const v={I:1,V:5,X:10}[c];n+=v<p?-v:v;p=v;}return n;};
const compact=s=>s.replace(/\s+/g,' ').trim();
function text(node){
 if(!node)return '';
 if(node.nodeType===3)return node.nodeValue;
 if(node.nodeType!==1)return '';
 const cls=node.classList;
 if(cls.contains('linenum')||cls.contains('pagenum-alt'))return '';
 if(cls.contains('split'))return '['+text(node.querySelector('.top'))+' supra '+text(node.querySelector('.bottom'))+']';
 if(node.tagName==='SUP')return '^'+[...node.childNodes].map(text).join('');
 return [...node.childNodes].map(text).join('');
}
for(const page of doc.querySelectorAll('.page')){
 const pageNumber=Number(page.querySelector('.pagenum a')?.id?.match(/^Page_(\d+)$/)?.[1]);
 if(!pageNumber)continue;
 let line=0;const lineMap=new Map(),pageLines=[];
 for(const node of page.querySelectorAll('.text h2,.text .line')){
  const heading=node.querySelector('[id^="liber"]');
  if(heading){book=Number(heading.id.replace('liber',''));chapter='praef';section=0;current=null;}
  if(!book||node.tagName==='H2')continue;
  line++;
  const label=node.querySelector('.linenum')?.textContent.replace(/\([^)]*\)/g,'').trim().match(/^\d+/)?.[0];
  const previous=current,marker=node.querySelector('.chapnum[id^="vitruvius-para"]');
  let before='';
  if(marker){
   const range=doc.createRange();range.setStart(node,0);range.setEndBefore(marker);before=range.toString();
   const n=marker.textContent.trim();
   if(/^[IVX]+$/.test(n)){chapter=roman(n);section=1;}else section=Number(n);
   const candidate=book+'.'+chapter+'.'+section;
   current=canonical.has(candidate)?candidate:null;
  }
  const loci=[...new Set([...(marker&&/[\p{L}]/u.test(before)&&previous?[previous]:[]),...(current?[current]:[])])];
  const clone=node.cloneNode(true);clone.querySelectorAll('.chapnum').forEach(n=>n.remove());
  pageLines.push({index:line,label:label?Number(label):null,loci,text:compact(text(clone)),book,paragraphAnchor:marker?.id||null});
 }
 const labels=pageLines.filter(x=>x.label!==null);
 for(const row of pageLines){
  const previous=labels.findLast(x=>x.index<=row.index),next=labels.find(x=>x.index>=row.index);
  const fromPrevious=previous?previous.label+row.index-previous.index:null;
  const fromNext=next?next.label-(next.index-row.index):null;
  const candidates=[...new Set([fromPrevious,fromNext].filter(x=>x!==null&&x>0))];
  if(!candidates.length)candidates.push(row.index);
  const low=Math.min(...candidates),high=Math.max(...candidates);
  const uncertain=low!==high;
  if(uncertain)lineWarnings.push({page:pageNumber,transcriptionLine:row.index,possiblePrintedLines:[low,high]});
  for(let n=low;n<=high;n++){
   if(!lineMap.has(n))lineMap.set(n,[]);
   lineMap.get(n).push({...row,interpolatedLine:!row.label,uncertain});
  }
  if(row.paragraphAnchor)for(const locus of row.loci)locusMap.get(locus).anchors.push({page:pageNumber,line:low,lineEnd:high,paragraphAnchor:row.paragraphAnchor});
 }
 if(!lineMap.size)continue;
 const notes=[...page.querySelectorAll('.notes p')];
 let order=0;const pageRecord={page:pageNumber,lines:lineMap.size,notes:notes.length};pages.push(pageRecord);
 for(const note of notes){
  order++;const full=compact(text(note));
  const prefix=full.match(/^(\d{1,2})(?:\s*[–—-]\s*(\d{1,2}))?[.:]?\s+([\s\S]+)/u);
  const start=prefix?Number(prefix[1]):null,end=prefix?Number(prefix[2]||prefix[1]):null;
  const contexts=[];
  if(start&&end>=start&&end-start<40)for(let n=start;n<=end;n++)for(const row of lineMap.get(n)||[])contexts.push({line:n,...row});
  const loci=[...new Set(contexts.flatMap(x=>x.loci))];
  const entry={id:'Rose1899-p'+pageNumber+'-n'+order,source:'Rose1899',printedPage:pageNumber,printedLine:start,printedLineEnd:end,sourceText:prefix?prefix[3]:full,
   sourceUrl:sourceUrl+'#Page_'+pageNumber,loci,context:contexts.map(x=>({line:x.line,text:x.text,loci:x.loci})),
   evidenceClass:'published_editorial_apparatus',witnessReadingStatus:'reported_by_Rose_not_independent_autopsy',
   locusMapping:contexts.some(x=>x.uncertain)?'printed_line_interpolation_ambiguous':loci.length===1?'printed_source_line':loci.length>1?'source_line_crosses_section_boundary':'source_page_only',
   stackedSigns:!!note.querySelector('.split')};
  entries.push(entry);
  if(loci.length)for(const locus of loci)locusMap.get(locus).entries.push(entry.id);else unassigned.push(entry.id);
 }
}
const appendix=JSON.parse(fs.readFileSync('data/apparatus/aparato-autoral.json','utf8'));
const noteIndex=JSON.parse(fs.readFileSync('data/apparatus-index.json','utf8'));
const byBook={};for(let n=1;n<=10;n++){
 const records=[...locusMap.values()].filter(x=>Number(x.locus.split('.')[0])===n);
 const ids=new Set(records.flatMap(x=>x.entries));
 byBook[n]={canonicalLoci:records.length,sourceAnchoredLoci:records.filter(x=>x.anchors.length).length,lociWithApparatus:records.filter(x=>x.entries.length).length,apparatusEntries:ids.size};
}
const conspectus=[...doc.querySelectorAll('table')].find(t=>t.textContent.includes('H = Harleianus')&&t.textContent.includes('G = Wolfenbuttelensis'));
const siglaPage=conspectus?[...doc.querySelectorAll('.pagenum a')].findLast(a=>a.compareDocumentPosition(conspectus)&4)?.id:null;
const result={schema:'vdl-systematic-critical-register-v1',recordedOn:arg('--date','2026-11-15'),
 source:{id:'Rose1899',editor:'Valentin Rose',title:'Vitruvii De architectura libri decem',edition:'Editio iterata',place:'Lipsiae',publisher:'B. G. Teubner',year:1899,
  digitalTranscription:'Project Gutenberg 51812',url:sourceUrl,sha256:sha,sourceBytes:raw.length,rights:'Texto de la edición de 1899 en dominio público. Atribuir edición y transcripción digital.',
  evidence:'Notas de la edición publicada, reproducidas desde su transcripción digital. No autopsia de los manuscritos citados ni cotejo íntegro de las imágenes del impreso.'},
 conventions:{reference:'liber.caput.paragraphus; praef. para los prefacios; página y línea de la edición fuente.',
  attribution:'H, G, E, S y las demás siglas se leen secundum Rose. La lectura de un códice citada por Rose es evidencia indirecta, no lectura propia ex imagine.',
  editions:'Rose = Rose 1899; Kr. = Krohn 1912; Kur. = edición Kurilo identificada por V514, V554 o V297; Bud. exige volumen, editor, año y página.',
  stackedSigns:'[a supra b] conserva como texto dos signos superpuestos de la transcripción. Consultar la fuente para su disposición gráfica.',
  coverage:'Aparato sistemáticamente importado por páginas y líneas; la ausencia de entrada no acredita identidad entre testimonios ni ausencia de variantes.'},
 conspectusSource:conspectus?{text:compact(text(conspectus)),url:sourceUrl+(siglaPage?'#'+siglaPage:'')}:{url:sourceUrl},
 counts:{canonicalLoci:canon.length,sourceAnchoredLoci:[...locusMap.values()].filter(x=>x.anchors.length).length,
  lociWithApparatus:[...locusMap.values()].filter(x=>x.entries.length).length,apparatusEntries:entries.length,sourcePages:pages.length,
  entriesWithoutLocus:unassigned.length,sourceLineBoundaryEntries:entries.filter(x=>x.loci.length>1).length,
  entriesWithUncertainLineInterpolation:entries.filter(x=>x.locusMapping==='printed_line_interpolation_ambiguous').length,
  authorialIndexEntries:noteIndex.entries.length,authorialGlosses:(appendix.glosas||[]).length,independentManuscriptReadingsRatified:0},
 byBook,pages,loci:[...locusMap.values()],entries,unassigned,
 quality:{lineNumberWarnings:lineWarnings,unmappedCanonicalLoci:[...locusMap.values()].filter(x=>!x.anchors.length).map(x=>x.locus),
  method:'Coordenadas explícitas de libro/capítulo/sección de Rose y líneas impresas. No búsqueda aproximada por semejanza ni generación de variantes.',
  publication:'La existencia de una nota editorial se documenta. Las siglas, conjeturas y correcciones mantienen atribución al editor; no se elevan automáticamente a decisiones del proyecto.'}};
if(result.counts.sourcePages<250||result.counts.apparatusEntries<2000||result.counts.sourceAnchoredLoci<700)throw Error('Unexpectedly incomplete Rose transcription');
fs.mkdirSync(path.dirname(output),{recursive:true});
const books={};
for(let n=1;n<=10;n++){
 const records=result.loci.filter(x=>Number(x.locus.split('.')[0])===n);
 const ids=new Set(records.flatMap(x=>x.entries));
 const selected=result.entries.filter(x=>ids.has(x.id));
 const target='data/apparatus/rose-1899/liber-'+String(n).padStart(2,'0')+'.json';
 const payload=JSON.stringify({schema:'vdl-source-apparatus-book-v1',source:result.source,book:n,loci:records,entries:selected})+'\n';
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,payload);
 books[n]={path:target,sha256:createHash('sha256').update(payload).digest('hex'),...byBook[n]};
}
result.books=books;
result.unassignedEntries=result.entries.filter(x=>!x.loci.length);
delete result.entries;
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
dom.window.close();console.log(JSON.stringify({output,counts:result.counts,byBook,unmapped:result.quality.unmappedCanonicalLoci}));
