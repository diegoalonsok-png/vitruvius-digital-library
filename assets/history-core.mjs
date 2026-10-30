// Bibliographic lookup: case matters for manuscript sigla, accents do not for names.
export const groups={
 manuscripts:{latin:'Codices manuscripti',label:'Manuscritos',intro:'Testimonios de la transmisión manuscrita. La sede de conservación se distingue del lugar de copia; los siglos y los folios se atribuyen a la unidad descrita.'},
 latin:{latin:'Editiones Latinae',label:'Ediciones latinas',intro:'Impresos del texto latino y ediciones bilingües. El año y el pie de imprenta identifican la edición; la signatura identifica el ejemplar.'},
 italian:{latin:'Versiones Italicae',label:'Versiones italianas',intro:'Traducciones y comentarios italianos, con indicación de manuscritos, versiones parciales e impresiones sucesivas.'},
 english:{latin:'Versiones Anglicae',label:'Versiones inglesas',intro:'Traducciones inglesas, adaptaciones y proyectos. Una adaptación o un proyecto no publicado no equivale a una traducción íntegra.'},
 other:{latin:'Versiones aliarum linguarum',label:'Otras lenguas',intro:'Traducciones francesas, alemanas y castellanas, junto con otros testimonios de recepción.'}
};
export function normalize(value){return String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/\bhar(?:leianus|lesianus|lesinus|leian|ley)\b/g,'harley')
 .replace(/\b(?:gudiano|gudiana|guelferbytanus)\b/g,'gudianus')
 .replace(/\b(?:scletstatensis|selestatensis|schlettstadt)\b/g,'selestat')
 .replace(/\bescorialensis\b/g,'escurialensis').replace(/\breginus\b/g,'reginensis')
 .replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
export function matches(record,query){
 const raw=String(query??'').trim();if(!raw)return true;
 if(/^[A-Za-z]$/.test(raw))return record.siglum===raw;
 const q=normalize(raw).split(' ').filter(w=>!['codex','codices','ms','manuscrito','manuscritos'].includes(w));
 const hay=normalize([record.title,record.display_title,record.work_title,record.shelfmark,record.institution,record.origin_place,record.conservation_place,record.publication_place,record.date,record.date_display,record.imprint,record.responsibility,record.history_note,record.scope,record.siglum,...(record.aliases||[]),...(record.languages||[]),groups[record.group]?.label,groups[record.group]?.latin].join(' '));
 return q.every(t=>hay.includes(t));
}
export function selectRecords(records,{query='',group='all',state='all',sort='date'}={}){
 return records.filter(r=>matches(r,query)&&(group==='all'||r.group===group)&&(state==='all'||r.metadata_status===state)).sort((a,b)=>sort==='name'?a.display_title.localeCompare(b.display_title,'es'):(a.date_start-b.date_start)||a.display_title.localeCompare(b.display_title,'es'));
}
