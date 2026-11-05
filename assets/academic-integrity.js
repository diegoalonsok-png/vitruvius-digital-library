/* Displays a small, dated report; the page never downloads the full corpora. */
(()=>{'use strict';
const $=id=>document.getElementById(id),node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e};
fetch('data/academic-integrity.json').then(r=>{if(!r.ok)throw Error('Informe no disponible');return r.json()}).then(d=>{
 const table=document.createElement('table'),head=document.createElement('thead'),row=document.createElement('tr');
 for(const text of ['Edición','Bloques de lectura','Loci cubiertos','Cobertura'])row.append(node('th',text));head.append(row);table.append(head);
 const body=document.createElement('tbody');
 for(const e of d.editions){const tr=document.createElement('tr');for(const text of [e.version+' · '+e.language,e.blocks,e.loci,e.loci+' / '+d.canonicalLoci+' (100 %)'])tr.append(node('td',String(text)));body.append(tr)}
 table.append(body);$('edition-coverage').replaceChildren(table);
 $('witness-coverage').append(node('p',d.manuscripts.withRepositoryShelfmarkDateAndSource+' / '+d.manuscripts.records+' testimonios con institución, signatura, datación y fuente identificadas.'));
 const list=document.createElement('ul');for(const [label,n] of Object.entries(d.apparatus.relations))list.append(node('li',label+': '+n+' / '+d.apparatus.entries+' entradas'));$('apparatus-coverage').append(list);
 const c=d.catalogue;for(const text of [c.records+' fichas en el catálogo principal; '+c.declaredLocalReadings+' declaran lectura local.',c.withLocalTranslation+' / '+c.declaredLocalReadings+' fichas locales declaran al menos una traducción local; '+c.withExplicitEditionCitation+' / '+c.declaredLocalReadings+' incluyen una cita editorial explícita.',d.externalClassicalRepertory.records+' registros adicionales de textos enlazados; '+d.externalClassicalRepertory.withTranslationLinks+' incluyen enlaces a traducciones.'])$('classical-coverage').append(node('p',text));
 for(const text of d.priorities)$('academic-priorities').append(node('li',text));
 $('source-fingerprint').textContent='Huella SHA-256 de los tres índices JSON normalizados: '+d.sourceFingerprint;
}).catch(()=>{$('edition-coverage').textContent='El informe no pudo cargarse. Puedes consultar el texto y las fuentes desde los enlaces de esta página.'});
})();
