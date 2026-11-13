/* Scholarly apparatus helpers: locus precision, documentary provenance,
 * DOI/ISBN only from a documented edition, editorial supplement marks.
 * Historical witness variants are NEVER inferred from the commentary text.
 */
const value=x=>String(x??'').trim();
const roman=n=>['','I','II','III','IV','V','VI','VII','VIII','IX','X'][Number(n)]||String(n);
const DOI=/^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;
export const sourceDOI=s=>{const x=value(s).replace(/^https?:\/\/doi\.org\//i,'');return DOI.test(x)?x:''};
export function isbnDocumented(s){
 const n=value(s).replace(/[\s-]/g,'');
 if(!/^\d{13}$/.test(n))return false;
 let sum=0;for(let i=0;i<12;i++)sum+=Number(n[i])*(i%2?3:1);
 return (10-sum%10)%10===Number(n[12]);
}
export function locusDetail(raw){
 const s=value(raw).replace(/^\s*Vitr\.\s*/i,'');
 const section=s.match(/^([1-9]|10)\.(\d+)\.(\d+)$/);
 if(section)return {kind:'section',raw:s,display:'Vitr. '+roman(section[1])+'.'+section[2]+'.'+section[3],
   reliable:true,section:Number(section[3])};
 const preface=s.match(/^([1-9]|10)\.praef\.(\d+)$/i);
 if(preface)return {kind:'preface-section',raw:s,display:'Vitr. '+roman(preface[1])+'.praef.'+preface[2],reliable:true};
 const chapter=s.match(/^([1-9]|10)\.(\d+)$/);
 if(chapter)return {kind:'chapter',raw:s,display:'Vitr. '+roman(chapter[1])+'.'+chapter[2],
   reliable:false,note:'Referencia de capítulo; no se identifica una sección individual del texto.'};
 return {kind:'unresolved',raw:s,display:s||'Sin locus determinado',reliable:false,
   note:'Localizador no resuelto por la gramática de capítulos y secciones.'};
}
export function sourceEvidence(e){
 const src=value(e?.source);
 const heading=e?.locusCertified===true,loc=value(e?.locusMention);
 const graded=src==='nota'
  ?(heading?'Nota del DOCX con locus explícito en su fuente':loc?'Nota del DOCX con asociación candidata':'Nota del DOCX sin locus comprobado')
  :(heading?'Encabezado del PDF con referencia editorial explícita':'Referencia obtenida por contexto editorial o de página');
 return {
  grade:heading?'localizador-explicito':loc?'localizador-candidato':'sin-locus',
  heading,display:graded,
  text:src==='nota'?
   'Nota procedente del índice DOCX. Un locus explícito no demuestra colación manuscrita.':
   'Bloque extraído del texto del PDF; cotejar la página original antes de emplearlo como lección crítica.',
  witness:'No se documenta en esta ficha una lectura autóptica de códices ni un conspectus de variantes.'
 };
}
export function interventions(e){
 const t=value(e?.text);
 // Do not invent the conjecturer, siglum, manuscript reading, or lacuna.
 const matches=[...t.matchAll(/<([^<>\n]{2,90})>/g)].map(x=>x[1].trim()).filter(Boolean);
 const unique=[...new Set(matches)].slice(0,10);
 return unique.map(x=>({
  marked:'〈'+x+'〉',
  text:'Secuencia marcada como suplemento editorial en la fuente; autoría, transmisión y justificación pendientes de cotejo en el aparato de la edición.'
 }));
}
export function reference(e,book,link=''){
 const ed=book&&value(book.id)===value(e?.edition)?book:null;
 const locus=locusDetail(e?.locusMention||((e?.pageLoci||[])[0]||''));
 const grade=sourceEvidence(e);
 const page=Number(e?.page);
 const pageLabel=Number.isSafeInteger(page)&&page>0?'página '+page+' del archivo PDF':
  (e?.source==='nota'?'nota DOCX, sin paginación PDF acreditada':'página del PDF no identificada');
 const scope=e?.source==='nota'?'nota editorial extraída de DOCX':'aparato editorial extraído de PDF';
 let bib='';
 if(ed){
  const who=value(ed.bibliographic_author)||value(ed.author)||'Autoría editorial no identificada';
  const title=value(ed.bibliographic_title)||[ed.title,ed.subtitle].filter(Boolean).join(': ');
  const place=[value(ed.publication_place),value(ed.publisher)].filter(Boolean).join(': ');
  bib=[who+'.',title+'.',value(ed.edition_statement)?value(ed.edition_statement)+'.':'',
   (place||'Sin editorial registrada')+(value(ed.year)?', '+value(ed.year):'')+'.',
   sourceDOI(ed.doi)?'https://doi.org/'+sourceDOI(ed.doi)+'.':'',
   isbnDocumented(ed.isbn)?'ISBN '+value(ed.isbn)+'.':''].filter(Boolean).join(' ');
 }else{
  bib='Edición '+value(e?.editionName||e?.edition||'no identificada')+
   ': datos bibliográficos completos no recuperados.';
 }
 const isbn=ed&&isbnDocumented(ed.isbn)?value(ed.isbn):'';
 const doi=ed?sourceDOI(ed.doi):'';
 const editionName=ed?value(ed.bibliographic_title||ed.title):'Edición no identificada';
 const text=[
  'Vitruvio, De architectura, '+(locus.display||'locus no identificado')+'.',
  'Registro: '+scope+'. '+grade.display+'.',
  'Edición consultada: '+bib,
  'Localización documental: '+pageLabel+'.',
  link?'Archivo consultable: '+link+'.':'',
  locus.note||'',
  ed?.isbn_note?'Observación ISBN: '+ed.isbn_note:'',
  'Alcance: registro de aparato/comentario; no prueba una variante de un códice sin testimonios, signaturas y cotejo documental.'
 ].filter(Boolean).join('\n');
 return {bib,editionName,isbn,doi,grade,locus,pageLabel,scope,citation:text,sourceLink:link,
  isbnNote:ed?.isbn_note||''};
}
