/* Academic evidence rendering: derived numbers, never a substitute for
 * philological collation, critical-edition verification or peer review.
 * Only the public audit JSON is fetched; the 222 original works are untouched. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=String(text);return e};
 const appendText=(id,tag,text)=>{const target=$(id);if(target)target.append(node(tag,text))};
 const metric=(value,label)=>{
  const wrap=document.createElement('article');wrap.className='academic-metric';
  wrap.append(node('strong',value),node('span',label));
  $('academic-evidence-metrics')?.append(wrap);
 };
 fetch('data/academic-integrity.json',{cache:'no-cache'})
 .then(r=>{if(!r.ok)throw Error('Informe no disponible');return r.json()})
 .then(d=>{
  if(!Array.isArray(d.editions)||!d.manuscripts||!d.catalogue)throw Error('Informe incompleto');
  const stamp=$('report-generated');
  if(stamp){
   const date=String(d.generated||'');
   stamp.textContent=/^\d{4}-\d{2}-\d{2}$/.test(date)?date.slice(8,10)+'/'+date.slice(5,7)+'/'+date.slice(0,4):'no acreditada';
   if(/^\d{4}-\d{2}-\d{2}$/.test(date))stamp.dateTime=date;
  }
  const table=document.createElement('table'),head=document.createElement('thead'),header=document.createElement('tr');
  for(const label of ['Edición','Bloques de lectura','Loci cubiertos','Cobertura'])header.append(node('th',label));
  head.append(header);table.append(head);
  const body=document.createElement('tbody');
  for(const e of d.editions){
   const tr=document.createElement('tr');
   for(const val of [e.version+' · '+e.language,e.blocks,e.loci,e.loci+' / '+d.canonicalLoci+' (100 %)'])
    tr.append(node('td',val));
   body.append(tr);
  }
  table.append(body);$('edition-coverage').replaceChildren(table);
  const m=d.manuscripts;
  appendText('witness-coverage','p',
   m.withRepositoryShelfmarkDateAndSource+' / '+m.records+
   ' registros de testimonios con institución, signatura, datación y fuente declaradas.');
  if(Number.isInteger(m.catalogueWorksWithLinkedWitness)){
   appendText('witness-coverage','p',
    m.catalogueWorksWithLinkedWitness+' obras con al menos un testimonio vinculado; '+
    m.catalogueWorksWithoutLinkedWitness+' aún sin testimonio individual asignado en este repertorio.');
  }
  if(Number.isInteger(m.directOriginalWitnesses))
   appendText('witness-coverage','p',m.directOriginalWitnesses+
    ' registros clasificados explícitamente como testimonios directos en lengua original.');
  appendText('witness-coverage','p',
   'Un testimonio vinculado NO equivale a demostrar que sea el más antiguo conservado ni el más importante para la recensio.');
  const relations=d.apparatus?.relations||{},list=document.createElement('ul');
  for(const [label,n] of Object.entries(relations))
   list.append(node('li',label+': '+n+' / '+d.apparatus.entries+' entradas'));
  $('apparatus-coverage').append(list);
  const c=d.catalogue,extern=d.externalClassicalRepertory||{};
  appendText('classical-coverage','p',c.records+
   ' obras en el catálogo; '+c.declaredLocalReadings+
   ' declaran una lectura local ('+(c.declaredCompleteLocalReadings??'?')+
   ' completas y '+(c.declaredPartialLocalReadings??'?')+' parciales).');
  appendText('classical-coverage','p',c.withLocalTranslation+' / '+c.declaredLocalReadings+
   ' lecturas locales con al menos una traducción declarada; '+
   c.withExplicitEditionCitation+' / '+c.declaredLocalReadings+
   ' con cita editorial explícita en el registro.');
  appendText('classical-coverage','p',
   (extern.records??0)+' entradas del repertorio externo, de las cuales '+
   (extern.withTranslationLinks??0)+' incluyen enlaces de traducción. No se suman como obras locales ni se presumen completas.');
  const cod=d.codicology;
  if(cod&&$('academic-evidence-metrics')){
   metric(c.records,'Obras en el catálogo académico');
   metric(c.declaredCompleteLocalReadings+' / '+c.records,'Lecturas locales declaradas completas; falta cotejo crítico independiente');
   metric(m.catalogueWorksWithLinkedWitness+' / '+c.records,'Obras con al menos un manuscrito o testimonio asociado');
   metric(cod.registeredWitnessRecords,'Fichas codicológicas abiertas ('+cod.uniquePhysicalObjects+' objetos físicos distintos)');
   metric(cod.filledFieldSlots+' / '+cod.fieldSlots,'Campos codicológicos con valor registrado; no todos están cotejados');
   metric((relations['locus explícito']||0)+' / '+d.apparatus.entries,'Vínculos explícitos de aparato por locus; no equivalen a variantes certificadas');
   appendText('academic-evidence-explanation','p',
    cod.pendingFieldSlots+' campos de los '+cod.fieldSlots+
    ' de la matriz codicológica no contienen un valor. Algunas propiedades son inaplicables a ciertos soportes; no se inventan datos para elevar el porcentaje.');
   appendText('academic-evidence-explanation','p',
    (relations['locus candidato sin verificar']||0)+
    ' vínculos del aparato están marcados como candidatos pendientes de corroborar. La comparación de 731 loci en tres ediciones acredita alineación estructural, no identidad de lecturas ni calidad de traducción.');
  }
  for(const priority of d.priorities||[])appendText('academic-priorities','li',priority);
  if($('source-fingerprint'))$('source-fingerprint').textContent=
   'Huella SHA-256 reproducible del texto estructurado de las tres ediciones de Vitruvio: '+d.sourceFingerprint;
 })
 .catch(error=>{
  if($('edition-coverage'))$('edition-coverage').textContent=
   'No se pudo recuperar el informe. Consulte el JSON y el procedimiento de validación enlazados en esta página.';
  if($('report-generated'))$('report-generated').textContent='informe temporalmente no disponible';
  if($('academic-evidence-explanation'))$('academic-evidence-explanation').textContent=
   'Los indicadores no están disponibles. No se muestran porcentajes inventados.';
  console.warn('[AcademicIntegrity] report unavailable',error);
 });
})();
