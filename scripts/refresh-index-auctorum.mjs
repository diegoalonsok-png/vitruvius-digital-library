#!/usr/bin/env node
/**
 * Sincroniza la ampliación estática del Index auctorum con los inventarios
 * editoriales. No lee ni modifica libros, PDF o índices grandes; no elimina
 * las fichas originales del HTML. No confunde registros con obras únicas.
 */
import fs from 'node:fs';

const read = filename => fs.readFileSync(filename, 'utf8');
const json = filename => JSON.parse(read(filename));
const file = 'index-auctorum-operum.html';
const inventory = json('data/r2/bibliotheca-inventario-unificado.json');
const supplement = json('data/bibliotheca-expansion-publicada-2026-11-16.json');
const catalogue = json('data/bibliotheca-graeca-latina-I-bce-I-ce.json');
const primary = inventory.works || [];
const supplementary = inventory.supplementaryWorks || [];
const other = inventory.additionalWorks || [];
const all = [...primary, ...supplementary, ...other];
const ids = all.map(x => x.id);
if (new Set(ids).size !== ids.length) throw new Error('Identificadores de obra duplicados en el inventario federado');
if (primary.length !== (catalogue.works || []).length) throw new Error('La cuenta del catálogo maestro no coincide con el inventario federado');
if (supplementary.length !== (supplement.works || []).length) throw new Error('Suplemento e inventario federado no concuerdan');
if (ids.some(x => !x)) throw new Error('Hay identificadores de obra vacíos');

const escapeHTML = value => String(value ?? '').replace(/[&<>"]/g, ch => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'
})[ch]);
const collate = (a,b) => a.localeCompare(b, 'es', {sensitivity:'base'});
const begin = '<!-- VDL-BIBLIOTHECA-EXTENSIONS-START -->';
const end = '<!-- VDL-BIBLIOTHECA-EXTENSIONS-END -->';
let page = read(file);
const start = page.indexOf(begin);
const stop = page.indexOf(end, start);
if (start < 0 || stop < 0) throw new Error('No se encuentran los marcadores editoriales del suplemento');
const fixedPart = page.slice(0, start);
const existingPrimary = new Set([...fixedPart.matchAll(/href="classics-work-record\.html\?work=([^"]+)"/g)]
  .map(m => decodeURIComponent(m[1].split('&')[0])));
const master = new Map((catalogue.works || []).map(w => [w.id,w]));
const missingPrimary = primary.filter(x => !existingPrimary.has(x.id));
const sourceMap = new Map(supplement.works.map(x => [x.id,x]));

function byAuthor(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row.author || !row.title) throw new Error('Autor o título faltante: ' + row.id);
    if (!map.has(row.author)) map.set(row.author, []);
    map.get(row.author).push(row);
  }
  return [...map].sort((a,b) => collate(a[0],b[0]))
    .map(([author,works]) => [author,works.sort((a,b)=>collate(a.title,b.title))]);
}

const addedMain = missingPrimary.length
  ? '<section id="nuevas-fichas-principales"><h2>Fichas principales agregadas · ' + missingPrimary.length + '</h2>' +
    '<p>Fichas incorporadas al repertorio principal después de la edición estática original, sin reemplazar los registros antiguos.</p>' +
    byAuthor(missingPrimary.map(x => master.get(x.id) || x)).map(([author,rows]) =>
      '<section class="author"><h3>' + escapeHTML(author) + '</h3><ul>' +
      rows.map(x=>'<li data-work-id="'+escapeHTML(x.id)+'"><a href="classics-work-record.html?work='+encodeURIComponent(x.id)+'">'+
          escapeHTML(x.title)+'</a><span class="meta">'+escapeHTML(x.dating||'Datación por verificar')+
          ' · '+escapeHTML(x.genre||'Género por verificar')+'</span></li>').join('') +
      '</ul></section>').join('\n') + '</section>'
  : '';

const groups = byAuthor(supplementary.map(x => {
  const item = sourceMap.get(x.id);
  if (!item || item.author !== x.author || item.title !== x.title) throw new Error('Ficha suplementaria discordante: '+x.id);
  if (!/^(classics-(text|parallel)-reader\.html\?|https:\/\/catalog\.perseus\.org\/)/.test(item.reading?.url||'')) {
    throw new Error('Lector suplementario ausente o inesperado: '+x.id);
  }
  return item;
}));
const nav = groups.map(([author],i)=>'<a href="#sup-'+i+'">'+escapeHTML(author)+'</a>').join(' · ');
const listing = groups.map(([author,rows],i) =>
  '<section class="author" aria-labelledby="sup-'+i+'"><h3 id="sup-'+i+'">'+escapeHTML(author)+
  ' <small>('+rows.length+')</small></h3><ul>'+
  rows.map(x=>'<li data-work-id="'+escapeHTML(x.id)+'"><a href="'+escapeHTML(x.reading.url)+'" lang="'+escapeHTML(x.language)+'">'+
    escapeHTML(x.title)+'</a><span class="meta">'+escapeHTML(x.dating||'Datación por verificar')+
    ' · '+escapeHTML(x.genre||'Género por verificar')+
    ((x.localEditionLanguages||[]).length?' · versiones registradas: '+escapeHTML(x.localEditionLanguages.join(', ')):'')+
    '</span></li>').join('')+'</ul></section>').join('\n');
const otherRows = other.map(x => {
 const edition = (x.r2FacsimileEditions||[])[0];
 if(!edition?.pdf?.startsWith('https://libros.vitruvius-digital-library.org/')) throw new Error('Falta URL R2 para '+x.id);
 return '<li data-work-id="'+escapeHTML(x.id)+'"><strong>'+escapeHTML(x.author)+'</strong> · <a href="'+
   escapeHTML(edition.pdf)+'">'+escapeHTML(x.title)+'</a><span class="meta">'+escapeHTML(edition.year||'s. f.')+
   ' · objeto R2 declarado, no verificado en vivo</span></li>';
}).join('\n');

const extension = begin+'\n'+addedMain+'\n'+
  '<section id="suplemento-literario"><h2>Autores y obras suplementarias · '+supplementary.length+
  ' registros</h2><p>Identificadores documentales y lectores declarados en el catálogo suplementario. Algunos tratados individuales pertenecen a volúmenes colectivos ya catalogados; no se contabilizan automáticamente como libros nuevos. Las versiones de idiomas consignadas no acreditan alineación humana de los pasajes.</p>'+
  '<nav aria-label="Autores suplementarios" style="display:flex;flex-wrap:wrap;gap:8px 12px"><strong>Autores:</strong>'+nav+'</nav>'+
  listing+'</section>\n'+
  '<section id="otras-colecciones"><h2>Otras colecciones históricas · '+other.length+
  ' registros</h2><p>Arquitectura, recepción de la Antigüedad y materias posteriores; categoría independiente del repertorio grecolatino. Las direcciones de R2 requieren verificación pública.</p><ul>'+otherRows+'</ul></section>\n'+end;
page = page.slice(0,start)+extension+page.slice(stop+end.length);
const lead = 'Índice estático consultable sin JavaScript:';
const trail = 'Para disponibilidad textual actual, consultar';
const leadPos = page.indexOf(lead);
const trailPos = page.indexOf(trail,leadPos);
if(leadPos<0||trailPos<0)throw new Error('Encabezado editorial inesperado');
const countText = lead+' <strong>'+primary.length+' fichas del repertorio principal</strong>, <strong>'+
 supplementary.length+' suplementarias</strong> y <strong>'+other.length+
 ' de colecciones relacionadas</strong> ('+all.length+
 ' registros declarados en total). Una obra incluida en un volumen colectivo puede tener ficha individual sin constituir una adquisición adicional. ';
page = page.slice(0,leadPos)+countText+page.slice(trailPos);
page = page.replace(/(<meta name="description" content=")[^"]+(")/,
 '$1Índice alfabético de '+primary.length+' fichas principales, '+supplementary.length+
 ' suplementarias y '+other.length+' de otras colecciones, con enlaces a fichas y lectores.$2');
page = page.replace(/(<meta property="og:description" content=")[^"]+(")/,
 '$1Índice alfabético de '+primary.length+' fichas principales, '+supplementary.length+
 ' suplementarias y '+other.length+' de otras colecciones, con enlaces a fichas y lectores.$2');
for(const id of supplementary)if(!page.includes('data-work-id="'+escapeHTML(id.id)+'"'))throw new Error('Falta en HTML: '+id.id);
for(const id of other)if(!page.includes('data-work-id="'+escapeHTML(id.id)+'"'))throw new Error('Falta en HTML: '+id.id);
if(read(file)!==page)fs.writeFileSync(file,page,'utf8');
console.log(JSON.stringify({primary:primary.length,supplementary:supplementary.length,
  related:other.length,total:all.length,addedMain:missingPrimary.length,authorsSupplement:groups.length}));
