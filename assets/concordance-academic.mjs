/* Academic workbench for the attested text, not an automated textual-critical edition.
 * Separates exact concordance, lexical hypotheses, witness reading and interpretation.
 */
const el=(tag,parent,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;parent.append(node);return node};
const link=(where,label,url)=>{const a=el('a',where,label);a.href=url;return a};
const plural=n=>n===1?'aparición':'apariciones';
const url=(path,params={})=>{const q=new URLSearchParams(params);return path+(q.size?'?'+q:'')};
function accordion(root,title,open=false){const details=el('details',root);details.className='academic-section';details.open=open;el('summary',details,title);return el('div',details)}
const paragraph=(host,text,cls)=>{const p=el('p',host,text);if(cls)p.className=cls;return p};
const links=(where,pairs)=>{const row=el('div',where);row.className='academic-links';for(const [title,href] of pairs)link(row,title,href);return row};
const latinForm=e=>[...e.forms.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||e.key;
export function appendScholarlyWorkbench(item,root){
 const entry=item.e,word=entry.equivalence||latinForm(entry);
 const total=item.sites.reduce((n,s)=>n+s.count,0);
 const block=el('section',root);block.className='academic-workbench';block.setAttribute('aria-label','Investigación filológica ampliada');
 el('h4',block,'Laboratorio filológico y documental');
 paragraph(block,'Cinco herramientas de investigación con distintos grados de evidencia. Los recuentos corresponden al corpus latino V514; no constituyen automáticamente una prueba etimológica ni una variante manuscrita.');
 const lang=entry.script==='greek'?'grc':'la';
 const lex=accordion(block,'I · Lexicología, morfología y semántica',true);
 paragraph(lex,'Forma consultada: «'+word+'». La concordancia registra '+total+' '+plural(total)+' en '+item.sites.length+' loci con los filtros activos.');
 const byBook=new Map();for(const s of item.sites)byBook.set(Number(s.p.book),(byBook.get(Number(s.p.book))||0)+s.count);
 const table=el('table',lex);table.className='academic-forms';
 const head=el('thead',table),hr=el('tr',head);el('th',hr,'Libro');el('th',hr,'Frecuencia textual');
 const tbody=el('tbody',table);for(const [book,count] of [...byBook].sort((a,b)=>a[0]-b[0])){const tr=el('tr',tbody);el('td',tr,String(book));el('td',tr,String(count))}
 paragraph(lex,'Una forma gráfica no equivale necesariamente a un lema: la homografía, la flexión y la normalización u/v, i/j requieren revisión. La relación con otras formas se muestra arriba cuando existe respaldo en el glosario.');
 links(lex,[['Lexicon · etimología',url('vitruvia-lexicon.html',{q:word,mode:'etimologia'})],['Lexicon · sintaxis',url('vitruvia-lexicon.html',{q:word,mode:'sintaxis'})],['Perseus · análisis', 'https://www.perseus.tufts.edu/hopper/morph?l='+encodeURIComponent(word)+'&la='+(lang==='grc'?'greek':'la')],['Logeion · léxicos','https://logeion.uchicago.edu/'+encodeURIComponent(word)]]);
 const cod=accordion(block,'II · Codicología y testimonios manuscritos');
 paragraph(cod,'Examinar soporte, cronología, procedencia, material, estructura de cuadernos, foliación, manos, abreviaturas, decoración, correcciones y daños. El DOCX V514 es una edición moderna, no una transcripción diplomática del Codex H.');
 paragraph(cod,'La presencia de una palabra en V514 no demuestra por sí sola que esa lectura figure de igual modo en cada manuscrito. Los folios solo deben vincularse al locus cuando exista correspondencia documentada.','academic-caution');
 links(cod,[['Codex H · facsímil','harleianus.html'],['Scriptorium · testimonios','scriptorium.html'],['Biblioteca de originales','bibliotheca-graeca-latina.html']]);
 const ecd=accordion(block,'III · Ecdótica y crítica textual');
 paragraph(ecd,'Protocolo: localizar el locus, cotejar la lectura V514 con Krohn (1912), Rose y los testimonios disponibles; registrar variantes, omisiones, adiciones, transposiciones y conjeturas con la referencia de edición o folio correspondiente.');
 paragraph(ecd,'Señalar explícitamente «sin cotejo confirmado» donde todavía no se haya verificado el testimonio. Una diferencia entre traducciones no es, por sí sola, una variante del texto latino.');
 links(ecd,[['Abrir pasaje en lector',url('lector-bilingue.html',{edition:'recensio-es',locus:item.sites[0]?.p.locus||'',q:word})],['Concordancia histórica','concordancia-historica.html'],['Índices de loci','indices-locorum.html'],['Colación en Scriptorium','scriptorium.html']]);
 const herm=accordion(block,'IV · Hermenéutica: lectura contextual');
 paragraph(herm,'Interpretar la voz en su unidad argumentativa, no de forma aislada. Considerar uso técnico frente a uso común, contexto arquitectónico, género discursivo, destinatario, tradición helenística, y relaciones con los capítulos contiguos.');
 paragraph(herm,'La glosa léxica es una orientación: el sentido concreto debe justificarse con el pasaje completo y, cuando proceda, con paralelos documentados, evitando equivalencias modernas anacrónicas.');
 links(herm,[['Leer contexto bilingüe',url('lector-bilingue.html',{edition:'recensio-es',locus:item.sites[0]?.p.locus||'',q:word})],['Ampliar en Lexicon',url('vitruvia-lexicon.html',{q:word,mode:'lema'})]]);
 const exe=accordion(block,'V · Exégesis: análisis del pasaje');
 paragraph(exe,'Ficha de trabajo recomendada: (1) cita canónica y texto original; (2) segmentación sintáctica; (3) análisis morfológico revisado; (4) traducción propia o contrastada; (5) terminología técnica; (6) paralelos antiguos; (7) testimonios y variantes; (8) interpretación razonada; (9) bibliografía y grado de certeza.');
 paragraph(exe,'Distinguir observación textual, interpretación y conjetura. No atribuir a Vitruvio lecturas, fuentes o significados que el corpus no permita documentar.','academic-caution');
 links(exe,[['Ir a la ficha de estudio',url('vitruvia-lexicon.html',{q:word,mode:'sintaxis'})],['Fuente original por locus',url('lector-bilingue.html',{edition:'recensio-es',locus:item.sites[0]?.p.locus||'',q:word})]]);
 const method=accordion(block,'Fuentes, metodología y límites');
 paragraph(method,'Texto de recuento: De architectura, latín de Diego Kurilo V514, cuya base declarada es Krohn 1912. El glosario y las equivalencias son herramientas de consulta, no un aparato crítico revisado a partir de todos los manuscritos. Los resultados solo son verificables dentro de las ediciones y pasajes efectivamente indexados.');
 paragraph(method,'Estado de una consulta: lectura literal documentada / equivalencia editorial / hipótesis morfológica / cotejo de testimonio pendiente. Una etiqueta no debe confundirse con las otras.');
}
